import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(root, "..");
const defaultAgentBridgeRoot = path.join(workspaceRoot, "spline-interaction-hero");

const paths = {
  programs: path.join(defaultAgentBridgeRoot, "app", "data", "space-programs.public.json"),
  crosswalk: path.join(root, "config", "agentbridge_patent_taxonomy_crosswalk.json"),
  taxonomy: path.join(root, "config", "nasa_technology_taxonomy_2024_core.json"),
  patents: path.join(root, "normalized", "patents.jsonl"),
  chunks: path.join(root, "normalized", "evidence_chunks.jsonl"),
  outputDir: path.join(root, "reports", "agentbridge_program_evidence_packs"),
  outputSummary: path.join(root, "analysis", "agentbridge_evidence_pack_summary.json"),
  webappOutput: path.join(
    defaultAgentBridgeRoot,
    "app",
    "data",
    "agentbridge_program_evidence_packs.json",
  ),
};

const categoryFieldHints = {
  launch_vehicle: ["space_launch_propulsion_recovery", "launch_recovery"],
  satellite: [
    "space_satellite_bus_thermal_power",
    "space_comm_leo_network",
    "space_remote_sensing_payload",
  ],
  space_science: ["space_remote_sensing_payload", "space_materials_tps_coatings"],
  astronomy_space_science: ["space_remote_sensing_payload"],
  core_space: ["space_satellite_bus_thermal_power", "space_gnc_rendezvous_servicing"],
  space_commercialization: ["space_comm_leo_network", "space_gnc_rendezvous_servicing"],
  aerospace: ["aviation_structures_aero_composites", "aviation_avionics_flight_control_autonomy"],
  defense_dual_use: ["aviation_avionics_flight_control_autonomy", "space_gnc_rendezvous_servicing"],
  defense_aerospace_adjacent: [
    "aviation_avionics_flight_control_autonomy",
    "space_gnc_rendezvous_servicing",
  ],
  drone: ["aviation_avionics_flight_control_autonomy"],
  drone_uam_adjacent: [
    "aviation_avionics_flight_control_autonomy",
    "aviation_structures_aero_composites",
  ],
  aviation_industry: ["aviation_structures_aero_composites", "aviation_propulsion_sustainable"],
};

function main() {
  ensureFile(paths.programs);
  ensureFile(paths.crosswalk);
  ensureFile(paths.taxonomy);
  ensureFile(paths.patents);
  ensureFile(paths.chunks);

  const programs = readJson(paths.programs);
  const crosswalk = readJson(paths.crosswalk);
  const taxonomy = readJson(paths.taxonomy);
  const patents = readJsonl(paths.patents);
  const chunks = readJsonl(paths.chunks);
  const chunksByPublication = indexChunks(chunks);
  const taxonomyByCode = new Map(taxonomy.areas.map((area) => [area.txCode, area]));

  fs.mkdirSync(paths.outputDir, { recursive: true });

  const packs = programs.map((program) =>
    buildEvidencePack({
      program,
      crosswalk,
      taxonomyByCode,
      patents,
      chunksByPublication,
    }),
  );

  for (const pack of packs) {
    fs.writeFileSync(
      path.join(paths.outputDir, `${safeFileName(pack.programId)}.json`),
      `${JSON.stringify(pack, null, 2)}\n`,
      "utf8",
    );
  }

  const index = {
    generatedAt: new Date().toISOString(),
    taxonomyVersion: "NASA_2024",
    sourceCorpus: "aeropatent seed corpus",
    packCount: packs.length,
    packs,
  };

  fs.writeFileSync(path.join(paths.outputDir, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  fs.writeFileSync(paths.outputSummary, `${JSON.stringify(buildSummary(packs), null, 2)}\n`);

  if (fs.existsSync(defaultAgentBridgeRoot)) {
    fs.writeFileSync(paths.webappOutput, `${JSON.stringify(toPublicIndex(index), null, 2)}\n`);
  }

  console.log(`Generated ${packs.length} AgentBridge patent evidence packs`);
  console.log(`- ${paths.outputDir}`);
  if (fs.existsSync(defaultAgentBridgeRoot)) {
    console.log(`- ${paths.webappOutput}`);
  }
}

function buildEvidencePack({ program, crosswalk, taxonomyByCode, patents, chunksByPublication }) {
  const fieldScores = scoreFields(program, crosswalk.fields ?? []);
  const selectedField = fieldScores[0]?.field ?? crosswalk.fields[0];
  const selectedFieldScore = fieldScores[0]?.score ?? 0.2;
  const selectedFieldSupported = isFieldSupportedByCorpus(selectedField, patents);
  const relevantPatents = rankPatentsForField(program, selectedField, patents, chunksByPublication).slice(
    0,
    8,
  );
  const representativePatents = relevantPatents
    .slice(0, 5)
    .map(({ patent, score, matchedKeywords, programMatchedKeywords, fieldMatchedKeywords }) =>
      toPatentReference({
        patent,
        score,
        matchedKeywords,
        programMatchedKeywords,
        fieldMatchedKeywords,
        selectedField,
        taxonomyByCode,
        chunksByPublication,
      }),
    );
  const countryTrend = countBy(relevantPatents, ({ patent }) => patent.authority ?? "UNKNOWN");
  const topApplicants = topValues(relevantPatents.map(({ patent }) => patent.assignee).filter(Boolean), 6);
  const years = relevantPatents
    .map(({ patent }) => Number(patent.publication_year))
    .filter((year) => Number.isFinite(year));
  const latestYear = years.length ? Math.max(...years) : null;
  const evidenceIds = unique(representativePatents.flatMap((patent) => patent.evidenceIds)).slice(0, 20);
  const nasaTaxonomy = buildNasaMatches(selectedField, selectedFieldScore, taxonomyByCode);
  const generatedQueries = buildGeneratedQueries(program, selectedField);
  const fieldLabel = selectedField?.label_ko ?? "항공우주";
  const dataStatus = representativePatents.length
    ? "seed_corpus_generated_evidence_pack"
    : selectedFieldSupported
      ? "no_seed_corpus_evidence"
      : "unsupported_by_seed_corpus";
  const patentTrendSummary = buildTrendSummary(
    program,
    fieldLabel,
    relevantPatents,
    countryTrend,
    latestYear,
    dataStatus,
  );

  return {
    programId: program.id,
    programTitle: program.title,
    queryTopic: inferQueryTopic(program, selectedField),
    taxonomyVersion: "NASA_2024",
    generatedAt: new Date().toISOString(),
    dataStatus,
    sourceCorpus: {
      name: "aeropatent-research",
      path: root,
      limitation: "현재 결과는 seed corpus 기반이며 BigQuery 전체 수집 후 재생성해야 한다.",
    },
    selectedPatentField: {
      aeropatentFieldId: selectedField?.aeropatent_field_id,
      legacyFieldIds: selectedField?.legacy_field_ids ?? [],
      labelKo: fieldLabel,
      score: round(selectedFieldScore),
    },
    nasaTaxonomy,
    generatedQueries,
    patentTrendSummary,
    countryTrend,
    periodTrend: {
      tenYear: "최근 10년 backbone 수집 기준으로 장기 판세를 계산하도록 설계됨",
      fiveYear: "최근 5년 기본 대시보드 지표는 BigQuery 후보 테이블 생성 후 갱신",
      threeYearEmerging: "최근 3년 급상승 분야는 family count 성장률로 계산 예정",
      twelveMonthWatch: "최근 12개월 공개문헌 watchlist는 monthly CPC-first 수집으로 갱신",
    },
    topApplicants: topApplicants.length ? topApplicants : ["seed corpus에서 출원인 집계 부족"],
    topCpcOrIpc: [],
    metrics: {
      representativePatentCount: representativePatents.length,
      candidatePatentCount: relevantPatents.length,
      latestPublicationYear: latestYear,
      countryCount: Object.keys(countryTrend).length,
    },
    representativePatents,
    opportunityNotes: buildOpportunityNotes(countryTrend, fieldLabel, dataStatus),
    riskNotes: [
      "자동 분류 결과이므로 대표 특허와 강한 제안서 문장은 수동 검토 후 사용해야 한다.",
      "공개국가 기준과 출원인 국적 기준은 다를 수 있다.",
      "FTO, 유효성, 침해 판단은 제공하지 않는다.",
    ],
    proposalReadyBullets: buildProposalBullets(
      program,
      fieldLabel,
      representativePatents,
      countryTrend,
      dataStatus,
    ),
    evidenceIds,
    limitations: [
      "seed corpus 기반 1차 결과이다.",
      "BigQuery 전체 후보 수집과 KIPRIS 보강 후 수량 지표가 바뀔 수 있다.",
      "청구항 전문 분석 전까지 권리범위 해석은 하지 않는다.",
    ],
  };
}

function scoreFields(program, fields) {
  const text = normalize(
    [
      program.title,
      program.sanitizedSummary,
      program.sanitizedDeadlineEvidenceText,
      program.spaceCategory,
      ...(program.technologyAreas ?? []),
      ...(program.industries ?? []),
      ...(program.demoSearchTerms ?? []),
    ].join(" "),
  );
  const hintedIds = new Set(categoryFieldHints[program.spaceCategory] ?? []);

  return fields
    .map((field) => {
      let score = 0;
      const terms = [
        field.label_ko,
        ...(field.agentbridge_query_terms_ko ?? []),
        ...(field.agentbridge_query_terms_en ?? []),
      ];
      const matchedTerms = terms.filter((term) => term && text.includes(normalize(term)));
      score += matchedTerms.length * 0.22;

      if (hintedIds.has(field.aeropatent_field_id)) score += 0.5;
      for (const legacyId of field.legacy_field_ids ?? []) {
        if (hintedIds.has(legacyId)) score += 0.35;
      }
      if (program.defenseOrDualUse && (field.secondary_tx ?? []).includes("TX10")) score += 0.15;
      return { field, score: score || 0.05, matchedTerms };
    })
    .sort((a, b) => b.score - a.score);
}

function rankPatentsForField(program, field, patents, chunksByPublication) {
  const fieldIds = getFieldIds(field);
  const programText = normalize(
    [
      program.title,
      program.sanitizedSummary,
      ...(program.technologyAreas ?? []),
      ...(program.demoSearchTerms ?? []),
    ].join(" "),
  );
  const queryTerms = [
    ...(field?.agentbridge_query_terms_ko ?? []),
    ...(field?.agentbridge_query_terms_en ?? []),
    field?.label_ko,
  ].filter(Boolean);
  const programEvidenceTerms = buildProgramEvidenceTerms(program);

  return patents
    .map((patent) => {
      const sameField = fieldIds.has(patent.field);
      const patentText = normalize(
        [patent.title, patent.abstract, patent.seed_note, ...(patent.matched_terms ?? [])].join(" "),
      );
      const evidenceText = normalize(
        (chunksByPublication.get(patent.publication_number) ?? [])
          .map((chunk) => chunk.text)
          .join(" "),
      );
      let score = sameField ? 1.0 : 0.0;
      const fieldMatchedKeywords = [];
      const programMatchedKeywords = [];
      let hasPatentEvidenceMatch = false;
      for (const term of queryTerms) {
        const normalizedTerm = normalize(term);
        if (!normalizedTerm) continue;
        if (patentText.includes(normalizedTerm) || evidenceText.includes(normalizedTerm)) {
          score += 0.3;
          fieldMatchedKeywords.push(term);
          hasPatentEvidenceMatch = true;
        } else if (programText.includes(normalizedTerm)) {
          score += 0.05;
        }
      }
      for (const term of programEvidenceTerms) {
        const normalizedTerm = normalize(term);
        if (!normalizedTerm) continue;
        if (patentText.includes(normalizedTerm) || evidenceText.includes(normalizedTerm)) {
          score += 0.7;
          programMatchedKeywords.push(term);
        }
      }
      if (patent.publication_year) score += Math.max(0, (Number(patent.publication_year) - 2014) * 0.03);
      const chunkCount = chunksByPublication.get(patent.publication_number)?.length ?? 0;
      score += Math.min(0.3, chunkCount * 0.05);
      return {
        patent,
        score,
        matchedKeywords: unique([...programMatchedKeywords, ...fieldMatchedKeywords]),
        programMatchedKeywords: unique(programMatchedKeywords),
        fieldMatchedKeywords: unique(fieldMatchedKeywords),
        sameField,
        hasPatentEvidenceMatch,
      };
    })
    .filter(
      (item) =>
        item.sameField &&
        item.hasPatentEvidenceMatch &&
        item.programMatchedKeywords.length > 0 &&
        item.score >= 1.2,
    )
    .sort((a, b) => b.score - a.score);
}

function toPatentReference({
  patent,
  score,
  matchedKeywords,
  programMatchedKeywords,
  fieldMatchedKeywords,
  selectedField,
  taxonomyByCode,
  chunksByPublication,
}) {
  const evidenceIds = (chunksByPublication.get(patent.publication_number) ?? [])
    .filter((chunk) => ["abstract", "site_summary", "claim_excerpt"].includes(chunk.chunk_type))
    .slice(0, 3)
    .map((chunk) => chunk.id);

  return {
    id: patent.id,
    publicationNumber: patent.publication_number,
    publication_number: patent.publication_number,
    title: patent.title,
    authority: patent.authority,
    publicationDate: patent.publication_date,
    publicationYear: patent.publication_year,
    priorityDate: patent.priority_date,
    assignee: patent.assignee,
    sourceUrl: patent.source_url,
    source_url: patent.source_url,
    relevanceScore: round(score),
    matchedKeywords: matchedKeywords.length ? matchedKeywords : patent.matched_terms ?? [],
    matchBasis: {
      programMatchedKeywords: programMatchedKeywords ?? [],
      fieldMatchedKeywords: fieldMatchedKeywords ?? [],
    },
    nasaTaxonomy: buildNasaMatches(selectedField, Math.min(0.95, score / 3), taxonomyByCode),
    evidenceIds,
  };
}

function buildNasaMatches(field, rawConfidence, taxonomyByCode) {
  const codes = [field?.primary_tx, ...(field?.secondary_tx ?? [])].filter(Boolean).slice(0, 3);
  return codes.map((txCode, index) => {
    const area = taxonomyByCode.get(txCode);
    return {
      taxonomyVersion: "NASA_2024",
      txCode,
      txName: area?.txName ?? txCode,
      labelKo: area?.label_ko ?? txCode,
      confidence: round(Math.max(0.58, Math.min(0.96, rawConfidence - index * 0.1))),
      matchedKeywords: [field?.label_ko, ...(field?.agentbridge_query_terms_ko ?? []).slice(0, 3)].filter(
        Boolean,
      ),
      reason:
        index === 0
          ? `${field?.label_ko ?? "항공우주"} 분야의 대표 NASA TX`
          : `${field?.label_ko ?? "항공우주"} 분야의 보조 NASA TX`,
    };
  });
}

function buildGeneratedQueries(program, field) {
  return unique([
    ...(program.demoSearchTerms ?? []),
    ...(program.technologyAreas ?? []),
    ...(field?.agentbridge_query_terms_ko ?? []),
    ...(field?.agentbridge_query_terms_en ?? []),
  ]).slice(0, 14);
}

function buildProgramEvidenceTerms(program) {
  const explicitTerms = [
    ...(program.demoSearchTerms ?? []),
    ...(program.technologyAreas ?? []),
  ];
  const titleTokens = String(program.title ?? "")
    .split(/[\s,·/()[\]{}:;|]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const stopTerms = new Set([
    "2026년도",
    "2025년도",
    "2024년도",
    "연구개발",
    "위탁연구",
    "신규",
    "재공모",
    "공모",
    "공고",
    "사업",
    "과제",
    "항공우주",
    "우주기술",
    "r&d",
  ]);

  return unique([...explicitTerms, ...titleTokens])
    .map((term) => String(term).trim())
    .filter((term) => {
      const normalized = normalize(term);
      if (!normalized || stopTerms.has(normalized)) return false;
      if (/^\d{4}/.test(normalized)) return false;
      return normalized.length >= 3;
    })
    .slice(0, 24);
}

function inferQueryTopic(program, field) {
  const launchTerm = (program.demoSearchTerms ?? []).find((term) => term.includes("재사용"));
  return launchTerm ?? program.technologyAreas?.[0] ?? field?.label_ko ?? program.title;
}

function buildTrendSummary(program, fieldLabel, relevantPatents, countryTrend, latestYear, dataStatus) {
  if (dataStatus === "unsupported_by_seed_corpus") {
    return `${program.title}은 ${fieldLabel} 특허군과 연결될 가능성이 있으나, 현재 seed corpus에는 이 분야를 대표할 충분한 문헌이 없다. BigQuery 전체 후보 수집 후 특허 동향과 대표 특허를 확정해야 한다.`;
  }
  if (dataStatus === "no_seed_corpus_evidence") {
    return `${program.title}은 ${fieldLabel} 특허군과 연결되지만, 현재 seed corpus에서 공고 키워드와 직접 맞는 대표 특허를 찾지 못했다. 제안서에는 특허 동향 확정값 대신 추가 수집 필요 상태로 표시한다.`;
  }
  const countryText = Object.entries(countryTrend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([country, count]) => `${country} ${count}건`)
    .join(", ");
  return `${program.title}은 ${fieldLabel} 특허군과 연결된다. 현재 seed corpus 기준 대표 후보 ${relevantPatents.length}건이 매칭되며, 국가 분포는 ${countryText || "추가 수집 필요"}이다. 최신 공개연도는 ${latestYear ?? "확인 필요"}로 표시되며, 실제 제안서 문장에는 BigQuery 전체 수집과 수동 검증 후 확정값을 사용한다.`;
}

function buildOpportunityNotes(countryTrend, fieldLabel, dataStatus) {
  if (dataStatus === "unsupported_by_seed_corpus") {
    return [`${fieldLabel} 분야는 현재 seed corpus 지원 범위 밖이므로 BigQuery 전체 수집 후 기회 판단을 수행한다.`];
  }
  if (dataStatus === "no_seed_corpus_evidence") {
    return [`${fieldLabel} 분야는 공고와 직접 연결되는 대표 특허를 추가 수집한 뒤 기회/공백을 판단한다.`];
  }
  const krCount = countryTrend.KR ?? 0;
  const total = Object.values(countryTrend).reduce((sum, count) => sum + count, 0);
  if (!total) return [`${fieldLabel} 분야는 특허 수집 확대 후 기회 판단이 필요하다.`];
  if (krCount <= 1) {
    return [
      `${fieldLabel} 분야는 seed corpus에서 한국 공개문헌 비중이 낮아 국내 연구기획/사업화 공백 후보로 검토할 수 있다.`,
      "단, 공개국가 기준이므로 국내 기업/기관의 해외 출원 여부는 별도 확인이 필요하다.",
    ];
  }
  return [
    `${fieldLabel} 분야는 seed corpus에서 한국 문헌도 확인되어 국내 연구기반과 해외 경쟁동향을 함께 비교할 수 있다.`,
    "대표 특허의 출원인과 패밀리 범위를 확인해 협력/회피/차별화 포인트를 나누어 검토한다.",
  ];
}

function buildProposalBullets(program, fieldLabel, patents, countryTrend, dataStatus) {
  if (dataStatus === "unsupported_by_seed_corpus") {
    return [
      `${program.title}의 기술범위는 ${fieldLabel} 특허군과 연결될 수 있으나, 현재 seed corpus에는 이 분야 대표 특허가 부족해 BigQuery 전체 수집 후 선행기술 동향을 확정한다.`,
      "제안서에는 현 단계에서 특허 수량이나 경쟁구도에 대한 강한 주장을 넣지 않는다.",
      "추가 수집 후 대표 특허, 주요 출원인, 국가별 공개현황을 evidence ID와 함께 보강한다.",
    ];
  }
  if (dataStatus === "no_seed_corpus_evidence") {
    return [
      `${program.title}의 기술범위는 ${fieldLabel} 특허군과 연결되지만, 현재 seed corpus에서 공고 키워드와 직접 맞는 대표 특허가 확인되지 않았다.`,
      "제안서에는 특허 동향을 확정값으로 쓰지 않고 추가 조사 필요 항목으로 표시한다.",
      "BigQuery 전체 후보 수집과 수동 검증 후 대표 특허와 차별화 문장을 확정한다.",
    ];
  }
  const topPatent = patents[0];
  const countries = Object.keys(countryTrend).slice(0, 5).join(", ") || "주요국";
  return [
    `${program.title}의 기술범위는 NASA_2024 기준 ${fieldLabel} 특허군과 연결되며, ${countries} 공개문헌을 중심으로 선행기술 동향을 확인할 수 있다.`,
    topPatent
      ? `대표 근거 특허로 ${topPatent.publicationNumber}(${topPatent.title})를 우선 검토하고, 초록/청구항 근거 chunk를 통해 차별화 포인트를 정리한다.`
      : "대표 근거 특허는 BigQuery 전체 수집 후 확정한다.",
    "제안서에는 특허 수량 자체보다 기술문제, 해결수단, 국내 적용 차별성을 중심으로 반영한다.",
  ];
}

function isFieldSupportedByCorpus(field, patents) {
  const fieldIds = getFieldIds(field);
  return patents.some((patent) => fieldIds.has(patent.field));
}

function getFieldIds(field) {
  return new Set([field?.aeropatent_field_id, ...(field?.legacy_field_ids ?? [])].filter(Boolean));
}

function indexChunks(chunks) {
  const map = new Map();
  for (const chunk of chunks) {
    const key = chunk.publication_number;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(chunk);
  }
  return map;
}

function buildSummary(packs) {
  return {
    generatedAt: new Date().toISOString(),
    taxonomyVersion: "NASA_2024",
    packCount: packs.length,
    dataStatusCounts: countBy(packs, (pack) => pack.dataStatus),
    topSelectedFields: countBy(packs, (pack) => pack.selectedPatentField?.labelKo ?? "UNKNOWN"),
    programsWithEvidence: packs.filter((pack) => pack.representativePatents.length > 0).length,
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function countBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function topValues(items, limit) {
  const counts = countBy(items, (item) => item);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function safeFileName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function toPublicIndex(index) {
  return {
    ...index,
    packs: index.packs.map((pack) => ({
      ...pack,
      sourceCorpus: {
        name: pack.sourceCorpus?.name,
        limitation: pack.sourceCorpus?.limitation,
      },
    })),
  };
}

main();
