import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AGENTBRIDGE_ROOT = path.resolve(ROOT, "..", "spline-interaction-hero");
const LANDSCAPE_PATH = path.resolve(ROOT, "..", "aerospace-patent-intel-demo", "data", "production_landscape.json");
const PROGRAMS_PATH = path.join(AGENTBRIDGE_ROOT, "app", "data", "space-programs.public.json");
const OLD_PACKS_PATH = path.join(AGENTBRIDGE_ROOT, "app", "data", "agentbridge_program_evidence_packs.json");
const CROSSWALK_PATH = path.join(ROOT, "config", "agentbridge_patent_taxonomy_crosswalk.json");
const NASA_PATH = path.join(ROOT, "config", "nasa_technology_taxonomy_2024_core.json");

const COUNTRY_LABELS = {
  US: "미국",
  EP: "유럽",
  JP: "일본",
  CN: "중국",
  KR: "한국",
  WO: "PCT",
};

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function sanitizePortable(value) {
  if (typeof value === "string") {
    return value
      .replace(/^[A-Za-z]:\\(?:.*\\)?Workspace\\/g, "")
      .replace(/^[A-Za-z]:\\\\(?:.*\\\\)?Workspace\\\\/g, "");
  }
  if (Array.isArray(value)) return value.map(sanitizePortable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizePortable(item)]));
  }
  return value;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function compactNumber(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function programText(program) {
  return normalize(
    [
      program.title,
      program.sanitizedSummary,
      program.spaceCategory,
      ...(program.industries ?? []),
      ...(program.technologyAreas ?? []),
      ...(program.demoSearchTerms ?? []),
    ].join(" "),
  );
}

function scoreField(program, field) {
  const text = programText(program);
  const terms = [
    field.label_ko,
    ...(field.agentbridge_query_terms_ko ?? []),
    ...(field.agentbridge_query_terms_en ?? []),
    ...(field.legacy_field_ids ?? []),
  ].map(normalize);
  return terms.reduce((score, term) => (term && text.includes(term) ? score + 1 : score), 0);
}

function pickField(program, oldPack, crosswalkFields, landscapeById) {
  const oldFieldId = oldPack?.selectedPatentField?.aeropatentFieldId;
  if (oldFieldId && landscapeById.has(oldFieldId)) {
    return {
      crosswalk: crosswalkFields.find((field) => field.aeropatent_field_id === oldFieldId),
      score: oldPack?.selectedPatentField?.score ?? 1,
      source: "previous_evidence_pack",
    };
  }

  const ranked = crosswalkFields
    .filter((field) => landscapeById.has(field.aeropatent_field_id))
    .map((field) => ({ crosswalk: field, score: scoreField(program, field), source: "keyword_crosswalk" }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score ? ranked[0] : { crosswalk: ranked[0]?.crosswalk, score: 0, source: "fallback_top_field" };
}

function txLookup(nasa) {
  return new Map((nasa.areas ?? []).map((area) => [area.txCode, area]));
}

function nasaMatches(crosswalkField, nasaByCode) {
  const codes = [crosswalkField?.primary_tx, ...(crosswalkField?.secondary_tx ?? [])].filter(Boolean);
  return codes.slice(0, 4).map((code, index) => {
    const area = nasaByCode.get(code);
    return {
      taxonomyVersion: "NASA_2024",
      txCode: code,
      txName: area?.txName ?? code,
      labelKo: area?.label_ko ?? code,
      confidence: index === 0 ? 0.92 : 0.78,
      matchedKeywords: [
        crosswalkField?.label_ko,
        ...(crosswalkField?.agentbridge_query_terms_ko ?? []).slice(0, 3),
      ].filter(Boolean),
      reason: index === 0 ? "특허 landscape 대표 분야의 primary NASA TX" : "특허 landscape 대표 분야의 secondary NASA TX",
    };
  });
}

function countryTrend(field) {
  return Object.fromEntries(
    ["CN", "US", "WO", "EP", "KR", "JP"]
      .map((country) => [country, field.countryFamilyCounts?.[country] ?? 0])
      .filter(([, count]) => count > 0),
  );
}

function generatedQueries(crosswalkField) {
  return [
    crosswalkField?.label_ko,
    ...(crosswalkField?.agentbridge_query_terms_ko ?? []),
    ...(crosswalkField?.agentbridge_query_terms_en ?? []),
  ].filter(Boolean);
}

function fieldEvidenceIds(fieldId) {
  return [
    `evidence:patent-field:${fieldId}:landscape`,
    `evidence:patent-field:${fieldId}:country-trend`,
    `evidence:patent-field:${fieldId}:top-applicants`,
    `evidence:patent-field:${fieldId}:top-cpc`,
  ];
}

function proposalBullets(field, crosswalkField) {
  const topCountry = Object.entries(field.countryFamilyCounts ?? {}).sort((a, b) => b[1] - a[1])[0];
  const topApplicant = field.topApplicants?.[0]?.key;
  const topCpc = field.topCpcCodes?.[0]?.key;
  return [
    `${field.labelKo} 분야는 최근 10년 priority date 기준 ${compactNumber(field.familyCount)}개 patent families와 ${compactNumber(field.publicationCount)}개 공개문헌이 있는 큰 기술 축으로 참고할 수 있다.`,
    topCountry
      ? `공개 관할 기준 최다 국가는 ${COUNTRY_LABELS[topCountry[0]] ?? topCountry[0]}이며 ${compactNumber(topCountry[1])}개 families가 확인된다.`
      : "국가별 공개 분포는 추가 확인이 필요하다.",
    `최근 5년 family는 ${compactNumber(field.recent5FamilyCount)}개이고 최근 3년 momentum은 ${field.recentMomentum}이다.`,
    topApplicant ? `주요 출원인 예시는 ${topApplicant}이며, 대표 CPC 축은 ${topCpc ?? "추가 확인 필요"}이다.` : `대표 CPC 축은 ${topCpc ?? "추가 확인 필요"}이다.`,
    `AgentBridge 제안서에서는 ${crosswalkField?.proposal_use ?? "해당 분야의 기술동향 참고자료"}로만 활용하고, 강한 주장에는 초록/청구항/대표 특허 검증 후 사용한다.`,
  ];
}

function matchAudit(picked) {
  const score = Number(picked?.score ?? 0);
  return {
    matchSource: picked?.source ?? "unknown",
    matchScore: score,
    matchConfidence: picked?.source === "previous_evidence_pack" && score >= 1 ? "medium" : score >= 2 ? "medium" : "low",
    proposalUseAllowed: false,
    reason: "BigQuery 본수집은 broad CPC metadata landscape이므로 공고별 강한 evidence가 아니라 참고 context로만 사용한다.",
  };
}

function buildPack(program, oldPack, field, crosswalkField, nasaByCode, snapshotId, picked) {
  const evidenceIds = fieldEvidenceIds(field.id);
  const topApplicants = (field.topApplicants ?? []).slice(0, 8).map((item) => item.key);
  const fieldCountryTrend = countryTrend(field);
  const match = matchAudit(picked);
  return {
    programId: program.id,
    programTitle: program.title,
    queryTopic: crosswalkField?.label_ko ?? field.labelKo,
    taxonomyVersion: "NASA_2024",
    generatedAt: new Date().toISOString(),
    dataStatus: "bigquery_metadata_landscape_context",
    evidenceStrength: "context_only",
    match,
    sourceCorpus: {
      name: "Google Patents BigQuery public dataset",
      snapshotId,
      limitation: "초록/청구항 원문이 아닌 메타데이터·CPC-first landscape evidence다. 개별 대표 특허와 법적 판단은 후속 원문 검증이 필요하다.",
    },
    selectedPatentField: {
      aeropatentFieldId: field.id,
      legacyFieldIds: crosswalkField?.legacy_field_ids ?? [],
      labelKo: field.labelKo,
      score: match.matchScore,
      matchSource: match.matchSource,
      matchConfidence: match.matchConfidence,
    },
    nasaTaxonomy: nasaMatches(crosswalkField, nasaByCode),
    generatedQueries: generatedQueries(crosswalkField),
    patentTrendSummary: `${program.title}은 ${field.labelKo} 특허 landscape와 참고 연결된다. BigQuery 본수집 기준 ${compactNumber(field.familyCount)}개 families, ${compactNumber(field.publicationCount)}개 공개문헌이 확인됐고 최근 5년 families는 ${compactNumber(field.recent5FamilyCount)}개다. 이 값은 broad CPC 기반 분야 단위 context이며 공고별 강한 근거, 개별 특허 권리범위, FTO 판단은 포함하지 않는다.`,
    patentFamilyCount: field.familyCount,
    publicationCount: field.publicationCount,
    countryTrend: fieldCountryTrend,
    periodTrend: {
      recent5FamilyCount: field.recent5FamilyCount,
      recent3FamilyCount: field.recent3FamilyCount,
      recentMomentum: field.recentMomentum,
    },
    topApplicants,
    topCpcOrIpc: (field.topCpcCodes ?? []).slice(0, 10).map((item) => item.key),
    metrics: {
      familyCount: field.familyCount,
      publicationCount: field.publicationCount,
      recent5FamilyCount: field.recent5FamilyCount,
      recent3FamilyCount: field.recent3FamilyCount,
      latestPublicationYear: 2026,
      countryCount: Object.keys(field.countryFamilyCounts ?? {}).length,
      koreaPublicationGapOpportunityScore: field.koreaPublicationGapOpportunityScore,
      koreaAssigneeGapOpportunityScore: field.koreaAssigneeGapOpportunityScore,
    },
    representativePatents: [],
    proposalReadyBullets: proposalBullets(field, crosswalkField),
    opportunityNotes: [
      `한국 공개 gap score ${field.koreaPublicationGapOpportunityScore}, 한국 출원인 gap score ${field.koreaAssigneeGapOpportunityScore}.`,
      `상위 공개 관할: ${Object.entries(fieldCountryTrend)
        .slice(0, 4)
        .map(([country, count]) => `${COUNTRY_LABELS[country] ?? country} ${compactNumber(count)}`)
        .join(", ")}.`,
    ],
    riskNotes: [
      "metadata-first 수집이므로 개별 특허의 청구항 범위, 법적 상태, 패밀리 대표성은 별도 검증이 필요하다.",
      "CPC-first 분류는 넓은 후보를 포착하기 위한 방식이라 분야 간 중복과 주변기술이 포함될 수 있다.",
    ],
    limitations: [
      "공고별 match는 기존 seed pack 또는 키워드 crosswalk 기반이며, 초록/청구항 의미검색으로 검증되지 않았다.",
      "법적 권리판단, FTO, 침해/무효 판단을 제공하지 않는다.",
      "초록/청구항 원문 기반 의미검색과 대표 특허 선별은 후속 수집 단계에서 보강한다.",
    ],
    evidenceIds,
  };
}

function buildEvidenceChunks(landscape) {
  return landscape.fields.flatMap((field) => [
    {
      id: `evidence:patent-field:${field.id}:landscape`,
      type: "patent_landscape_summary",
      fieldId: field.id,
      text: `${field.labelKo}: ${compactNumber(field.familyCount)} families, ${compactNumber(field.publicationCount)} publications, recent5 ${compactNumber(field.recent5FamilyCount)} families.`,
      metrics: {
        familyCount: field.familyCount,
        publicationCount: field.publicationCount,
        recent5FamilyCount: field.recent5FamilyCount,
        recentMomentum: field.recentMomentum,
      },
    },
    {
      id: `evidence:patent-field:${field.id}:country-trend`,
      type: "patent_country_trend",
      fieldId: field.id,
      text: Object.entries(countryTrend(field))
        .map(([country, count]) => `${COUNTRY_LABELS[country] ?? country}: ${compactNumber(count)} families`)
        .join(", "),
      countryFamilyCounts: countryTrend(field),
    },
    {
      id: `evidence:patent-field:${field.id}:top-applicants`,
      type: "patent_top_applicants",
      fieldId: field.id,
      text: (field.topApplicants ?? [])
        .slice(0, 8)
        .map((item) => `${item.key}: ${compactNumber(item.count)} families`)
        .join(", "),
      topApplicants: field.topApplicants ?? [],
    },
    {
      id: `evidence:patent-field:${field.id}:top-cpc`,
      type: "patent_top_cpc",
      fieldId: field.id,
      text: (field.topCpcCodes ?? [])
        .slice(0, 10)
        .map((item) => `${item.key}: ${compactNumber(item.count)} hits`)
        .join(", "),
      topCpcCodes: field.topCpcCodes ?? [],
    },
  ]);
}

function buildPatentSummaryByField(landscape, crosswalkFields) {
  const output = {};
  for (const field of landscape.fields) {
    const crosswalk = crosswalkFields.find((item) => item.aeropatent_field_id === field.id);
    const summary = {
      field_label_ko: field.labelKo,
      count: field.familyCount,
      family_count: field.familyCount,
      publication_count: field.publicationCount,
      recent5_family_count: field.recent5FamilyCount,
      recent3_family_count: field.recent3FamilyCount,
      latest_year: landscape.summary.currentYear,
      country_counts: field.countryFamilyCounts,
      top_applicants: field.topApplicants,
      top_cpc_codes: field.topCpcCodes,
    };
    output[field.id] = summary;
    for (const legacyId of crosswalk?.legacy_field_ids ?? []) output[legacyId] = summary;
  }
  return output;
}

function buildGraph({ programs, packs, landscape, crosswalkFields, evidenceChunks }) {
  const nodes = [
    { id: "corpus:aeropatent-bigquery", type: "corpus", label: "AeroPatent BigQuery Landscape" },
    ...landscape.fields.map((field) => ({
      id: `field:${field.id}`,
      type: "patent_field",
      label: field.labelKo,
      metadata: { familyCount: field.familyCount, recentMomentum: field.recentMomentum },
    })),
    ...["US", "EP", "CN", "JP", "KR", "WO"].map((country) => ({
      id: `country:${country}`,
      type: "country",
      label: COUNTRY_LABELS[country] ?? country,
    })),
    ...programs.map((program) => ({ id: `program:${program.id}`, type: "program", label: program.title })),
    ...evidenceChunks.map((chunk) => ({
      id: chunk.id,
      type: "evidence",
      label: chunk.type,
      metadata: { fieldId: chunk.fieldId },
    })),
  ];

  const txIds = new Set();
  for (const field of crosswalkFields) {
    [field.primary_tx, ...(field.secondary_tx ?? [])].filter(Boolean).forEach((tx) => txIds.add(tx));
  }
  for (const tx of txIds) nodes.push({ id: `taxonomy:${tx}`, type: "taxonomy", label: tx });

  const edges = [];
  for (const field of landscape.fields) {
    edges.push({ source: "corpus:aeropatent-bigquery", target: `field:${field.id}`, type: "contains" });
    for (const [country, count] of Object.entries(countryTrend(field))) {
      edges.push({ source: `field:${field.id}`, target: `country:${country}`, type: "published_in", weight: count });
    }
    const crosswalk = crosswalkFields.find((item) => item.aeropatent_field_id === field.id);
    for (const tx of [crosswalk?.primary_tx, ...(crosswalk?.secondary_tx ?? [])].filter(Boolean)) {
      edges.push({ source: `field:${field.id}`, target: `taxonomy:${tx}`, type: tx === crosswalk.primary_tx ? "primary_tx" : "secondary_tx" });
    }
  }
  for (const pack of packs) {
    edges.push({ source: `program:${pack.programId}`, target: `field:${pack.selectedPatentField.aeropatentFieldId}`, type: "uses_patent_landscape" });
    for (const evidenceId of pack.evidenceIds ?? []) {
      edges.push({ source: `program:${pack.programId}`, target: evidenceId, type: "has_evidence" });
    }
  }
  return { nodes, edges };
}

function main() {
  const landscape = loadJson(LANDSCAPE_PATH);
  const programs = loadJson(PROGRAMS_PATH);
  const oldPacks = fs.existsSync(OLD_PACKS_PATH) ? loadJson(OLD_PACKS_PATH) : { packs: [] };
  const oldPackByProgram = new Map((oldPacks.packs ?? []).map((pack) => [pack.programId, pack]));
  const crosswalk = loadJson(CROSSWALK_PATH);
  const nasa = loadJson(NASA_PATH);
  const nasaByCode = txLookup(nasa);
  const landscapeById = new Map((landscape.fields ?? []).map((field) => [field.id, field]));
  const snapshotId = `aeropatent-bq-${landscape.summary.analysisDate}`;

  const packs = programs.map((program) => {
    const oldPack = oldPackByProgram.get(program.id);
    const picked = pickField(program, oldPack, crosswalk.fields ?? [], landscapeById);
    const field = landscapeById.get(picked.crosswalk?.aeropatent_field_id) ?? landscape.summary.topField;
    return buildPack(program, oldPack, field, picked.crosswalk, nasaByCode, snapshotId, picked);
  });

  const index = {
    generatedAt: new Date().toISOString(),
    taxonomyVersion: "NASA_2024",
    sourceCorpus: "Google Patents BigQuery public dataset",
    dataSnapshotId: snapshotId,
    dataStatus: "bigquery_metadata_landscape_context",
    packCount: packs.length,
    collectionSummary: landscape.summary,
    packs,
  };

  const evidenceChunks = buildEvidenceChunks(landscape);
  const patentSummaryByField = buildPatentSummaryByField(landscape, crosswalk.fields ?? []);
  const graph = buildGraph({ programs, packs, landscape, crosswalkFields: crosswalk.fields ?? [], evidenceChunks });
  const mcpSnapshot = {
    schemaVersion: "aeropatent.agentbridge.mcp.snapshot.v1",
    generatedAt: new Date().toISOString(),
    dataSnapshotId: snapshotId,
    tools: {
      search_patents_by_nasa_taxonomy: {
        description: "Return metadata-first patent fields and evidence chunks by NASA TX code, country, period, and keyword.",
        sourceFiles: ["normalized/evidence_chunks.jsonl", "config/agentbridge_patent_taxonomy_crosswalk.json"],
      },
      get_patent_landscape_for_program: {
        description: "Return AgentBridge program-level patent landscape evidence pack.",
        sourceFiles: ["exports/agentbridge/agentbridge_program_evidence_packs.json"],
      },
      get_taxonomy_crosswalk: {
        description: "Return NASA TX to AeroPatent field crosswalk.",
        sourceFiles: ["config/agentbridge_patent_taxonomy_crosswalk.json"],
      },
      get_proposal_evidence_pack: {
        description: "Return proposal-safe patent trend bullets with limitations and evidence IDs.",
        sourceFiles: ["exports/agentbridge/agentbridge_program_evidence_packs.json", "normalized/evidence_chunks.jsonl"],
      },
      get_graph_neighbors: {
        description: "Return graph neighbors for program, field, taxonomy, country, and evidence nodes.",
        sourceFiles: ["graph/nodes.jsonl", "graph/edges.jsonl"],
      },
    },
    landscape,
    crosswalk: sanitizePortable(crosswalk),
    evidenceChunks,
    programEvidencePacks: index,
  };

  writeJson(path.join(ROOT, "exports", "agentbridge", "agentbridge_program_evidence_packs.json"), index);
  writeJson(path.join(ROOT, "exports", "agentbridge", "agentbridge_patent_landscape_snapshot.json"), landscape);
  writeJson(path.join(ROOT, "mcp", "agentbridge_patent_mcp_snapshot.json"), mcpSnapshot);
  writeJson(path.join(ROOT, "analysis", "agentbridge_patent_summary_by_field.json"), patentSummaryByField);
  writeJsonl(path.join(ROOT, "normalized", "evidence_chunks.jsonl"), evidenceChunks);
  writeJsonl(path.join(ROOT, "graph", "nodes.jsonl"), graph.nodes);
  writeJsonl(path.join(ROOT, "graph", "edges.jsonl"), graph.edges);

  writeJson(path.join(AGENTBRIDGE_ROOT, "app", "data", "agentbridge_program_evidence_packs.json"), index);
  writeJson(path.join(AGENTBRIDGE_ROOT, "app", "data", "patent_summary_by_field.json"), patentSummaryByField);

  console.log(
    JSON.stringify(
      {
        snapshotId,
        packCount: packs.length,
        evidenceChunkCount: evidenceChunks.length,
        graphNodeCount: graph.nodes.length,
        graphEdgeCount: graph.edges.length,
      },
      null,
      2,
    ),
  );
}

main();
