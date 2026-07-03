import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const paths = {
  mcpSnapshot: path.join(root, "mcp", "agentbridge_patent_mcp_snapshot.json"),
  bigqueryEvidencePacks: path.join(root, "exports", "agentbridge", "agentbridge_program_evidence_packs.json"),
  patents: path.join(root, "normalized", "patents.jsonl"),
  chunks: path.join(root, "normalized", "evidence_chunks.jsonl"),
  claims: path.join(root, "normalized", "claims.jsonl"),
  nodes: path.join(root, "graph", "nodes.jsonl"),
  edges: path.join(root, "graph", "edges.jsonl"),
  crosswalk: path.join(root, "config", "agentbridge_patent_taxonomy_crosswalk.json"),
  nasaTaxonomy: path.join(root, "config", "nasa_technology_taxonomy_2024_core.json"),
  landscapeReport: path.join(root, "reports", "aeropatent_landscape_report_ko.md"),
  bigqueryLandscapeReport: path.join(root, "reports", "bq_landscape_report_ko.md"),
  evidencePackIndex: path.join(root, "reports", "agentbridge_program_evidence_packs", "index.json"),
};

const tools = [
  {
    name: "get_global_patent_landscape",
    description:
      "Return site-ready aerospace patent landscape metrics by field, country, region, domain, and period.",
    inputSchema: {
      type: "object",
      properties: {
        fieldId: { type: "string", description: "Aeropatent field ID, e.g. space_launch_propulsion_recovery" },
        domain: { type: "string", enum: ["space", "aviation"], description: "Optional top-level domain" },
        country: { type: "string", description: "Publication authority, e.g. US, EP, CN, JP, KR, WO" },
        region: { type: "string", description: "Region key, e.g. EAST_ASIA, EUROPE, NORTH_AMERICA" },
        period: { type: "string", enum: ["10y", "5y", "3y"], description: "Metric emphasis. Defaults to 10y." },
        sortBy: {
          type: "string",
          enum: ["familyCount", "publicationCount", "recent5FamilyCount", "recent3FamilyCount", "recentMomentum", "countryFamilyCount"],
        },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "search_patents_by_nasa_taxonomy",
    description:
      "Search normalized aerospace patents by NASA TX code, keyword, country, and date window.",
    inputSchema: {
      type: "object",
      properties: {
        txCode: { type: "string", description: "NASA taxonomy code, e.g. TX01" },
        keyword: { type: "string", description: "Optional keyword or phrase" },
        country: { type: "string", description: "Publication authority, e.g. US, EP, CN, JP, KR" },
        dateWindow: {
          type: "string",
          description: "Optional window such as 10y, 5y, 3y, 12m, or 2020-2026",
        },
        dateField: {
          type: "string",
          enum: ["publication", "priority", "filing"],
          description: "Date field for dateWindow filtering. Defaults to publication.",
        },
        limit: { type: "integer", minimum: 1, maximum: 50 },
        scope: {
          type: "string",
          enum: ["representative_patents", "field_landscape", "both"],
          description: "Return local representative patents, BigQuery field landscape, or both. Defaults to both.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_patent_landscape_for_program",
    description: "Return the AgentBridge patent landscape summary for a program ID or topic.",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string" },
        topic: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_taxonomy_crosswalk",
    description: "Return mapping between aeropatent fields and NASA 2024 taxonomy.",
    inputSchema: {
      type: "object",
      properties: {
        aeropatentFieldId: { type: "string" },
        txCode: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_proposal_evidence_pack",
    description: "Return the proposal-ready patent evidence pack for an AgentBridge program.",
    inputSchema: {
      type: "object",
      properties: {
        programId: { type: "string" },
        topic: { type: "string" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_graph_neighbors",
    description: "Return nearby graph nodes and edges for the LLM Wiki graph view.",
    inputSchema: {
      type: "object",
      properties: {
        nodeId: { type: "string" },
        depth: { type: "integer", minimum: 1, maximum: 3 },
        nodeTypes: { type: "array", items: { type: "string" } },
      },
      required: ["nodeId"],
      additionalProperties: false,
    },
  },
];

const resources = [
  {
    uri: "aeropatent://snapshot/mcp",
    name: "AgentBridge patent MCP snapshot",
    mimeType: "application/json",
  },
  {
    uri: "aeropatent://landscape/global",
    name: "BigQuery aerospace patent landscape",
    mimeType: "application/json",
  },
  {
    uri: "aeropatent://reports/bigquery-landscape",
    name: "BigQuery landscape report",
    mimeType: "text/markdown",
  },
  {
    uri: "aeropatent://reports/landscape",
    name: "Aerospace patent landscape report",
    mimeType: "text/markdown",
  },
  {
    uri: "aeropatent://taxonomy/nasa-2024",
    name: "NASA 2024 Technology Taxonomy core",
    mimeType: "application/json",
  },
  {
    uri: "aeropatent://taxonomy/crosswalk",
    name: "Aeropatent to NASA TX crosswalk",
    mimeType: "application/json",
  },
  {
    uri: "aeropatent://agentbridge/evidence-packs",
    name: "AgentBridge seed evidence pack index",
    mimeType: "application/json",
  },
  {
    uri: "aeropatent://agentbridge/bigquery-evidence-packs",
    name: "AgentBridge BigQuery metadata evidence packs",
    mimeType: "application/json",
  },
  {
    uri: "aeropatent://graph/nodes",
    name: "LLM Wiki graph nodes",
    mimeType: "application/x-jsonlines",
  },
  {
    uri: "aeropatent://graph/edges",
    name: "LLM Wiki graph edges",
    mimeType: "application/x-jsonlines",
  },
];

let dataCache = null;
let inputBuffer = Buffer.alloc(0);

process.stdin.on("data", (chunk) => {
  inputBuffer = Buffer.concat([inputBuffer, chunk]);
  readFrames();
});

process.stdin.resume();

function readFrames() {
  while (true) {
    const headerEnd = inputBuffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;

    const header = inputBuffer.slice(0, headerEnd).toString("utf8");
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      inputBuffer = inputBuffer.slice(headerEnd + 4);
      continue;
    }

    const length = Number(match[1]);
    const frameStart = headerEnd + 4;
    const frameEnd = frameStart + length;
    if (inputBuffer.length < frameEnd) return;

    const jsonText = inputBuffer.slice(frameStart, frameEnd).toString("utf8");
    inputBuffer = inputBuffer.slice(frameEnd);
    let message;
    try {
      message = JSON.parse(jsonText);
    } catch {
      sendError(null, -32700, "Parse error");
      continue;
    }
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      sendError(null, -32600, "Invalid Request");
      continue;
    }
    handleMessage(message).catch((error) => {
      sendError(message.id ?? null, -32603, error.message);
    });
  }
}

async function handleMessage(message) {
  if (!Object.prototype.hasOwnProperty.call(message, "id")) return;

  try {
    switch (message.method) {
      case "initialize":
        sendResult(message.id, {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {},
          },
          serverInfo: {
            name: "aeropatent-mcp-server",
            version: "0.1.0",
          },
        });
        return;
      case "ping":
        sendResult(message.id, {});
        return;
      case "tools/list":
        sendResult(message.id, { tools });
        return;
      case "tools/call":
        validatePlainObject(message.params, "params");
        sendResult(message.id, await callTool(message.params));
        return;
      case "resources/list":
        sendResult(message.id, { resources });
        return;
      case "resources/read":
        validatePlainObject(message.params, "params");
        requiredString(message.params, "uri");
        sendResult(message.id, readResource(message.params.uri));
        return;
      default:
        sendError(message.id, -32601, `Unknown method: ${message.method}`);
    }
  } catch (error) {
    sendError(message.id, error.code ?? -32603, error.message);
  }
}

async function callTool(params) {
  validatePlainObject(params, "params");
  requiredString(params, "name");
  if (params.arguments !== undefined) validatePlainObject(params.arguments, "arguments");
  const name = params.name;
  const args = params.arguments ?? {};
  switch (name) {
    case "get_global_patent_landscape":
      validateGlobalLandscapeArgs(args);
      return toToolResult(getGlobalPatentLandscape(args));
    case "search_patents_by_nasa_taxonomy":
      validateSearchArgs(args);
      return toToolResult(searchPatents(args));
    case "get_patent_landscape_for_program":
      validateProgramLookupArgs(args);
      return toToolResult(getProgramLandscape(args));
    case "get_taxonomy_crosswalk":
      validateCrosswalkArgs(args);
      return toToolResult(getTaxonomyCrosswalk(args));
    case "get_proposal_evidence_pack":
      validateProgramLookupArgs(args);
      return toToolResult(getProposalEvidencePack(args));
    case "get_graph_neighbors":
      validateGraphArgs(args);
      return toToolResult(getGraphNeighbors(args));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function validateGlobalLandscapeArgs(args) {
  validatePlainObject(args, "arguments");
  optionalString(args, "fieldId");
  optionalString(args, "country");
  optionalString(args, "region");
  if (args.domain !== undefined && !["space", "aviation"].includes(args.domain)) {
    invalidParams("domain must be one of space, aviation");
  }
  if (args.period !== undefined && !["10y", "5y", "3y"].includes(args.period)) {
    invalidParams("period must be one of 10y, 5y, 3y");
  }
  if (args.sortBy !== undefined && !["familyCount", "publicationCount", "recent5FamilyCount", "recent3FamilyCount", "recentMomentum", "countryFamilyCount"].includes(args.sortBy)) {
    invalidParams("sortBy is not supported");
  }
  optionalInteger(args, "limit", 1, 50);
}

function validateSearchArgs(args) {
  validatePlainObject(args, "arguments");
  optionalString(args, "txCode");
  optionalString(args, "keyword");
  optionalString(args, "country");
  optionalString(args, "dateWindow");
  if (args.dateWindow !== undefined) validateDateWindowFormat(args.dateWindow);
  if (args.dateField !== undefined && !["publication", "priority", "filing"].includes(args.dateField)) {
    invalidParams("dateField must be one of publication, priority, filing");
  }
  optionalInteger(args, "limit", 1, 50);
  if (args.scope !== undefined && !["representative_patents", "field_landscape", "both"].includes(args.scope)) {
    invalidParams("scope must be representative_patents, field_landscape, or both");
  }
}

function validateProgramLookupArgs(args) {
  validatePlainObject(args, "arguments");
  optionalString(args, "programId");
  optionalString(args, "topic");
}

function validateCrosswalkArgs(args) {
  validatePlainObject(args, "arguments");
  optionalString(args, "aeropatentFieldId");
  optionalString(args, "txCode");
}

function validateGraphArgs(args) {
  validatePlainObject(args, "arguments");
  requiredString(args, "nodeId");
  optionalInteger(args, "depth", 1, 3);
  if (args.nodeTypes !== undefined) {
    if (!Array.isArray(args.nodeTypes) || args.nodeTypes.some((item) => typeof item !== "string")) {
      invalidParams("nodeTypes must be an array of strings");
    }
  }
}

function validatePlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalidParams(`${label} must be an object`);
  }
}

function requiredString(args, key) {
  if (typeof args[key] !== "string" || !args[key].trim()) {
    invalidParams(`${key} must be a non-empty string`);
  }
}

function optionalString(args, key) {
  if (args[key] !== undefined && typeof args[key] !== "string") {
    invalidParams(`${key} must be a string`);
  }
}

function optionalInteger(args, key, min, max) {
  if (args[key] === undefined) return;
  if (!Number.isInteger(args[key]) || args[key] < min || args[key] > max) {
    invalidParams(`${key} must be an integer from ${min} to ${max}`);
  }
}

function invalidParams(message) {
  const error = new Error(message);
  error.code = -32602;
  throw error;
}

function validateDateWindowFormat(raw) {
  const value = String(raw).trim().toLowerCase();
  if (/^(10|5|3)y$/.test(value)) return;
  if (/^12m$/.test(value)) return;
  const rangeMatch = value.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (rangeMatch) {
    const from = Number(rangeMatch[1]);
    const to = Number(rangeMatch[2]);
    if (from <= to) return;
  }
  invalidParams("dateWindow must be like 10y, 5y, 3y, 12m, or YYYY-YYYY");
}

function getGlobalPatentLandscape(args) {
  const data = loadData();
  const period = args.period ?? "10y";
  const country = normalizeCode(args.country);
  const region = normalizeCode(args.region);
  const limit = clamp(Number(args.limit) || 12, 1, 50);
  const fields = getLandscapeFields({
    fieldId: args.fieldId,
    domain: args.domain,
    country,
    region,
    period,
    sortBy: args.sortBy,
    limit,
    data,
  });

  return {
    generatedAt: data.mcpSnapshot.generatedAt,
    dataSnapshotId: data.mcpSnapshot.dataSnapshotId,
    dataStatus: "bigquery_metadata_landscape_context",
    source: data.landscape.source,
    summary: data.landscape.summary,
    filters: {
      fieldId: args.fieldId ?? null,
      domain: args.domain ?? null,
      country: country || null,
      region: region || null,
      period,
      sortBy: args.sortBy ?? null,
      limit,
    },
    dashboard: {
      majorCountries: data.landscape.dashboard?.majorCountries ?? [],
      topCountries: data.landscape.dashboard?.topCountries ?? [],
      topRegions: data.landscape.dashboard?.topRegions ?? [],
      topFields: (data.landscape.dashboard?.topFields ?? []).slice(0, limit).map((field) => summarizeLandscapeField(field, { country, region, period })),
      opportunityFields: (data.landscape.dashboard?.opportunityFields ?? []).slice(0, limit).map((field) => summarizeLandscapeField(field, { country, region, period })),
    },
    fieldCount: fields.length,
    fields,
    reportCards: (data.landscape.reportCards ?? [])
      .filter((card) => !args.fieldId || card.graphFocusNode === "field:" + args.fieldId || card.id === "bq-field:" + args.fieldId)
      .slice(0, limit),
    useGuidance: [
      "UI ?????됰Ŧ六??????summary, dashboard.majorCountries, fields ????쇨덫嶺?6??醫딆┻?믩베?????⑤슢?????????롪퍓媛?????ш끽諭욥??????딅젩.",
      "???곗뒩泳????⑤㈇?????節륁춻???????????graphFocusNode=field:<fieldId>??get_graph_neighbors???癲ル슢?????????嶺뚮슣?쒒뜮?????녾컯嶺???? ??濚밸Ŧ遊얕맱??",
      "??????? broad CPC metadata-first landscape????????醫딆┫?뺢껸?????嶺???????戮?뜪???????????????/?潁?熬곥볥춣???????嚥▲굧???꿔꺂?ｉ뜮?뚮쑏?????거????",
    ],
    limitations: [
      "Google Patents BigQuery public dataset ???뚯???維◈?metadata-first ?꿔꺂???겸꼻???",
      "family count?? publication count????⑤슢??????꿔꺂?????嶺뚮???袁р뵾? ?筌???묐┛??????븐뻤??FTO/??⑤㈇?뚧납?????????? ?????? ?????놃닓??",
    ],
  };
}

function getLandscapeFields(options) {
  const data = options.data ?? loadData();
  const fieldIds = options.txCode ? fieldIdsForTx(options.txCode, data.crosswalk.fields) : null;
  const keyword = normalize(options.keyword);
  const country = normalizeCode(options.country);
  const region = normalizeCode(options.region);
  const sortBy = options.sortBy ?? (country ? "countryFamilyCount" : metricKeyForPeriod(options.period));
  return (data.landscape.fields ?? [])
    .filter((field) => {
      if (options.fieldId && field.id !== options.fieldId) return false;
      if (options.domain && field.domain !== options.domain) return false;
      if (fieldIds && !fieldIds.has(field.id)) return false;
      if (country && !Number(field.countryFamilyCounts?.[country])) return false;
      if (region && !Number(field.regionFamilyCounts?.[region])) return false;
      if (keyword && !matchesLandscapeKeyword(field, data.crosswalkByFieldId.get(field.id), keyword)) return false;
      return true;
    })
    .map((field) => summarizeLandscapeField(field, { country, region, period: options.period }))
    .sort((a, b) => Number(b[sortBy] ?? 0) - Number(a[sortBy] ?? 0))
    .slice(0, clamp(Number(options.limit) || 10, 1, 50));
}

function summarizeLandscapeField(field, options = {}) {
  const country = normalizeCode(options.country);
  const region = normalizeCode(options.region);
  const data = loadData();
  const crosswalk = data.crosswalkByFieldId.get(field.id);
  const countryFamilyCount = country ? Number(field.countryFamilyCounts?.[country] ?? 0) : null;
  const regionFamilyCount = region ? Number(field.regionFamilyCounts?.[region] ?? 0) : null;
  return {
    id: field.id,
    graphNodeId: "field:" + field.id,
    domain: field.domain,
    labelKo: field.labelKo,
    shortLabelKo: field.shortLabelKo,
    labelEn: field.labelEn,
    color: field.color,
    familyCount: field.familyCount,
    publicationCount: field.publicationCount,
    recent5FamilyCount: field.recent5FamilyCount,
    recent3FamilyCount: field.recent3FamilyCount,
    recentMomentum: field.recentMomentum,
    countryFamilyCount,
    regionFamilyCount,
    topCountries: topEntries(field.countryFamilyCounts, 8),
    topRegions: topEntries(field.regionFamilyCounts, 8),
    topApplicants: field.topApplicants ?? [],
    topCpcCodes: field.topCpcCodes ?? [],
    koreaPublicationGapOpportunityScore: field.koreaPublicationGapOpportunityScore,
    koreaAssigneeGapOpportunityScore: field.koreaAssigneeGapOpportunityScore,
    nasaTaxonomy: crosswalk
      ? [{ txCode: crosswalk.primary_tx, role: "primary" }, ...(crosswalk.secondary_tx ?? []).map((txCode) => ({ txCode, role: "secondary" }))]
      : [],
    queryTerms: crosswalk
      ? [...(crosswalk.agentbridge_query_terms_ko ?? []), ...(crosswalk.agentbridge_query_terms_en ?? [])]
      : [],
    proposalUse: crosswalk?.proposal_use ?? null,
    evidenceIds: evidenceIdsForField(field.id),
    periodMetric: pickPeriodMetric(field, options.period),
  };
}

function metricKeyForPeriod(period) {
  if (period === "5y") return "recent5FamilyCount";
  if (period === "3y") return "recent3FamilyCount";
  return "familyCount";
}

function pickPeriodMetric(field, period) {
  const key = metricKeyForPeriod(period);
  return { period: period ?? "10y", key, value: field[key] ?? field.familyCount };
}

function matchesLandscapeKeyword(field, crosswalk, keyword) {
  const text = normalize([
    field.id,
    field.domain,
    field.labelKo,
    field.shortLabelKo,
    field.labelEn,
    ...(field.topApplicants ?? []).map((item) => item.key),
    ...(field.topCpcCodes ?? []).map((item) => item.key),
    crosswalk?.label_ko,
    crosswalk?.primary_tx,
    ...(crosswalk?.secondary_tx ?? []),
    ...(crosswalk?.agentbridge_query_terms_ko ?? []),
    ...(crosswalk?.agentbridge_query_terms_en ?? []),
  ].join(" "));
  if (text.includes(keyword)) return true;
  const tokens = keyword.split(" ").filter((token) => token.length >= 2);
  return tokens.length > 1 && tokens.every((token) => text.includes(token));
}

function topEntries(values, limit = 8) {
  return Object.entries(values ?? {})
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => Number(b.count) - Number(a.count))
    .slice(0, limit);
}

function evidenceIdsForField(fieldId) {
  return [
    "evidence:patent-field:" + fieldId + ":landscape",
    "evidence:patent-field:" + fieldId + ":country-trend",
    "evidence:patent-field:" + fieldId + ":top-applicants",
    "evidence:patent-field:" + fieldId + ":top-cpc",
  ];
}

function searchPatents(args) {
  const data = loadData();
  const txCode = normalizeCode(args.txCode);
  const country = normalizeCode(args.country);
  const keyword = normalize(args.keyword);
  const limit = clamp(Number(args.limit) || 10, 1, 50);
  const dateField = ["priority", "filing"].includes(args.dateField) ? args.dateField : "publication";
  const yearRange = parseDateWindow(args.dateWindow);
  const fieldIds = txCode ? fieldIdsForTx(txCode, data.crosswalk.fields) : null;
  const scope = args.scope ?? "both";
  const fieldLandscapeResults = scope === "representative_patents"
    ? []
    : getLandscapeFields({ txCode, keyword: args.keyword, country, period: args.dateWindow, limit, data });

  const results = scope === "field_landscape"
    ? []
    : data.patents
    .map((patent) => {
      if (fieldIds && !fieldIds.has(patent.field)) return null;
      if (country && patent.authority !== country) return null;
      if (yearRange && !isPatentInYearRange(patent, yearRange, dateField)) return null;

      const text = normalize(
        [
          patent.title,
          patent.abstract,
          patent.seed_note,
          patent.first_claim_excerpt,
          data.claimTextByPublication.get(patent.publication_number),
          ...(patent.matched_terms ?? []),
        ].join(" "),
      );
      let score = 1;
      const matchedKeywords = [];
      if (keyword) {
        if (text.includes(keyword)) {
          score += 3;
          matchedKeywords.push(args.keyword);
        } else {
          const tokens = keyword.split(" ").filter((item) => item.length >= 3);
          const allTokensMatch = tokens.length > 1 && tokens.every((token) => text.includes(token));
          if (allTokensMatch) {
            score += 1.4;
            matchedKeywords.push(...tokens);
          } else {
            return null;
          }
        }
      }
      if (patent.publication_year) score += Math.max(0, (Number(patent.publication_year) - 2014) * 0.02);

      return {
        id: patent.id,
        publicationNumber: patent.publication_number,
        title: patent.title,
        authority: patent.authority,
        assignee: patent.assignee,
        field: patent.field,
        fieldLabelKo: patent.field_label_ko,
        publicationYear: patent.publication_year,
        publicationDate: patent.publication_date,
        priorityDate: patent.priority_date,
        sourceUrl: patent.source_url,
        matchedKeywords: unique([...(patent.matched_terms ?? []), ...matchedKeywords]),
        evidenceIds: evidenceIdsForPublication(patent.publication_number, data.chunksByPublication),
        score: round(score),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    query: {
      txCode,
      country,
      keyword: args.keyword ?? null,
      dateWindow: args.dateWindow ?? null,
      dateField,
      limit,
    },
    count: results.length,
    results,
    fieldLandscapeCount: fieldLandscapeResults.length,
    fieldLandscapeResults,
    limitations: [
      "Runtime search uses normalized local snapshots only.",
      "Legal status, FTO, validity, and infringement are out of scope.",
    ],
  };
}

function getProgramLandscape(args) {
  const pack = findEvidencePack(args);
  if (!pack) {
    return { found: false, message: "No matching AgentBridge evidence pack found." };
  }
  return {
    found: true,
    programId: pack.programId,
    programTitle: pack.programTitle,
    dataStatus: pack.dataStatus,
    selectedPatentField: pack.selectedPatentField,
    nasaTaxonomy: pack.nasaTaxonomy,
    patentTrendSummary: pack.patentTrendSummary,
    metrics: pack.metrics,
    countryTrend: pack.countryTrend,
    topApplicants: pack.topApplicants,
    evidenceStrength: pack.evidenceStrength ?? null,
    match: pack.match ?? null,
    sourceCorpus: pack.sourceCorpus ?? null,
    patentFamilyCount: pack.patentFamilyCount ?? pack.metrics?.familyCount ?? null,
    publicationCount: pack.publicationCount ?? pack.metrics?.publicationCount ?? null,
    periodTrend: pack.periodTrend ?? null,
    topCpcOrIpc: pack.topCpcOrIpc ?? [],
    representativePatents: pack.representativePatents ?? [],
    proposalReadyBullets: pack.proposalReadyBullets ?? [],
    opportunityNotes: pack.opportunityNotes,
    riskNotes: pack.riskNotes,
    evidenceIds: pack.evidenceIds,
    limitations: pack.limitations,
  };
}

function getProposalEvidencePack(args) {
  const data = loadData();
  const pack = findEvidencePack(args);
  if (!pack) return { found: false, message: "No matching AgentBridge evidence pack found." };
  const seedRepresentativePack = findSeedEvidencePack(args);
  const evidenceIds = unique([...(pack.evidenceIds ?? []), ...(seedRepresentativePack?.evidenceIds ?? [])]);
  return {
    found: true,
    pack,
    seedRepresentativePack:
      seedRepresentativePack && seedRepresentativePack.programId === pack.programId ? seedRepresentativePack : null,
    evidenceChunks: evidenceIds
      .map((id) => data.evidenceChunksById.get(id))
      .filter(Boolean),
    usageWarning:
      "context_only ???裕?seed evidence????戮?닱???貫?녽뇡??嶺뚣볝늾???잙??딀뤃?? ?띠룆踰ㅹ뇡??낅슣?????裕??????獄?낮? ?????롪틵?嶺뚯빘鍮???釉먮듌???",
  };
}

function getTaxonomyCrosswalk(args) {
  const data = loadData();
  const txCode = normalizeCode(args.txCode);
  const aeropatentFieldId = args.aeropatentFieldId;
  const fields = data.crosswalk.fields.filter((field) => {
    if (aeropatentFieldId) {
      return (
        field.aeropatent_field_id === aeropatentFieldId ||
        (field.legacy_field_ids ?? []).includes(aeropatentFieldId)
      );
    }
    if (txCode) {
      return field.primary_tx === txCode || (field.secondary_tx ?? []).includes(txCode);
    }
    return true;
  });
  return {
    taxonomyVersion: data.crosswalk.taxonomy_version,
    count: fields.length,
    fields,
  };
}

function getGraphNeighbors(args) {
  const data = loadData();
  const nodeId = normalizeGraphNodeId(args.nodeId, data);
  const maxDepth = clamp(Number(args.depth) || 1, 1, 3);
  const allowedTypes = new Set(args.nodeTypes ?? []);
  if (!data.nodesById.has(nodeId)) {
    return {
      focusNodeId: nodeId,
      found: false,
      depth: maxDepth,
      nodeCount: 0,
      edgeCount: 0,
      nodes: [],
      edges: [],
    };
  }
  const seen = new Set([nodeId]);
  const frontier = [{ id: nodeId, depth: 0 }];
  const selectedEdgesById = new Map();

  while (frontier.length) {
    const current = frontier.shift();
    if (current.depth >= maxDepth) continue;
    for (const edge of data.edges) {
      if (edge.source !== current.id && edge.target !== current.id) continue;
      const nextId = edge.source === current.id ? edge.target : edge.source;
      if (!seen.has(nextId)) {
        seen.add(nextId);
        frontier.push({ id: nextId, depth: current.depth + 1 });
      }
      selectedEdgesById.set(edge.id ?? `${edge.source}->${edge.target}:${edge.type ?? ""}`, edge);
    }
  }

  const nodes = [...seen]
    .map((id) => data.nodesById.get(id))
    .filter(Boolean)
    .filter((node) => !allowedTypes.size || allowedTypes.has(node.type));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = [...selectedEdgesById.values()].filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
  );

  return {
    focusNodeId: nodeId,
    found: true,
    depth: maxDepth,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
  };
}

function readResource(uri) {
  const table = {
    "aeropatent://snapshot/mcp": [paths.mcpSnapshot, "application/json"],
    "aeropatent://landscape/global": [paths.mcpSnapshot, "application/json"],
    "aeropatent://reports/bigquery-landscape": [paths.bigqueryLandscapeReport, "text/markdown"],
    "aeropatent://reports/landscape": [paths.landscapeReport, "text/markdown"],
    "aeropatent://taxonomy/nasa-2024": [paths.nasaTaxonomy, "application/json"],
    "aeropatent://taxonomy/crosswalk": [paths.crosswalk, "application/json"],
    "aeropatent://agentbridge/evidence-packs": [paths.evidencePackIndex, "application/json"],
    "aeropatent://agentbridge/bigquery-evidence-packs": [paths.bigqueryEvidencePacks, "application/json"],
    "aeropatent://graph/nodes": [paths.nodes, "application/x-jsonlines"],
    "aeropatent://graph/edges": [paths.edges, "application/x-jsonlines"],
  };
  const entry = table[uri];
  if (!entry) throw new Error(`Unknown resource URI: ${uri}`);
  const [filePath, mimeType] = entry;
  return {
    contents: [
      {
        uri,
        mimeType,
        text: fs.readFileSync(filePath, "utf8"),
      },
    ],
  };
}

function findEvidencePack(args) {
  const data = loadData();
  if (args.programId) {
    return data.evidencePacksByProgramId.get(args.programId) ?? data.seedEvidencePacksByProgramId.get(args.programId) ?? null;
  }
  const topic = normalize(args.topic);
  if (!topic) return null;
  return findPackByTopic(data.evidencePacks, topic) ?? findPackByTopic(data.seedEvidencePacks, topic);
}

function findSeedEvidencePack(args) {
  const data = loadData();
  if (args.programId) return data.seedEvidencePacksByProgramId.get(args.programId) ?? null;
  const topic = normalize(args.topic);
  return topic ? findPackByTopic(data.seedEvidencePacks, topic) : null;
}

function findPackByTopic(packs, topic) {
  return (
    packs.find((pack) =>
      normalize([pack.programTitle, pack.queryTopic, ...(pack.generatedQueries ?? [])].join(" ")).includes(topic),
    ) ?? null
  );
}

function normalizeGraphNodeId(rawNodeId, data) {
  const nodeId = String(rawNodeId ?? "").trim();
  if (data.nodesById.has(nodeId)) return nodeId;
  const value = nodeId.includes(":") ? nodeId.split(":").slice(1).join(":") : nodeId;
  const txCode = normalizeCode(value);
  if (/^TX\d{2}$/.test(txCode) && data.nodesById.has("taxonomy:" + txCode)) return "taxonomy:" + txCode;
  const country = normalizeCode(value);
  if (/^[A-Z]{2}$/.test(country) && data.nodesById.has("country:" + country)) return "country:" + country;
  for (const field of data.crosswalk.fields ?? []) {
    if (field.aeropatent_field_id === value || (field.legacy_field_ids ?? []).includes(value)) {
      const mapped = "field:" + field.aeropatent_field_id;
      if (data.nodesById.has(mapped)) return mapped;
    }
  }
  return nodeId;
}

function fieldIdsForTx(txCode, fields) {
  const ids = new Set();
  for (const field of fields) {
    if (field.primary_tx === txCode || (field.secondary_tx ?? []).includes(txCode)) {
      ids.add(field.aeropatent_field_id);
      for (const legacyId of field.legacy_field_ids ?? []) ids.add(legacyId);
    }
  }
  return ids;
}

function evidenceIdsForPublication(publicationNumber, chunksByPublication) {
  return (chunksByPublication.get(publicationNumber) ?? [])
    .filter((chunk) => ["abstract", "site_summary", "claim_excerpt"].includes(chunk.chunk_type))
    .slice(0, 3)
    .map((chunk) => chunk.id);
}

function parseDateWindow(raw) {
  if (!raw) return null;
  const value = String(raw).trim().toLowerCase();
  const currentYear = new Date().getUTCFullYear();
  const yearMatch = value.match(/^(\d+)\s*y$/);
  if (yearMatch) return { from: currentYear - Number(yearMatch[1]) + 1, to: currentYear };
  const monthMatch = value.match(/^(\d+)\s*m$/);
  if (monthMatch) {
    const years = Math.ceil(Number(monthMatch[1]) / 12);
    return { from: currentYear - years + 1, to: currentYear };
  }
  const rangeMatch = value.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (rangeMatch) return { from: Number(rangeMatch[1]), to: Number(rangeMatch[2]) };
  return null;
}

function isPatentInYearRange(patent, range, dateField) {
  const dateValue =
    dateField === "priority"
      ? patent.priority_date
      : dateField === "filing"
        ? patent.filing_date
        : patent.publication_date;
  const year = Number(dateValue?.slice(0, 4) || patent.publication_year);
  return Number.isFinite(year) && year >= range.from && year <= range.to;
}

function loadData() {
  if (dataCache) return dataCache;
  const patents = readJsonl(paths.patents);
  const chunks = readJsonl(paths.chunks);
  const claims = readJsonl(paths.claims);
  const nodes = readJsonl(paths.nodes);
  const edges = readJsonl(paths.edges);
  const mcpSnapshot = readJson(paths.mcpSnapshot);
  const bigqueryEvidencePackIndex = readJson(paths.bigqueryEvidencePacks);
  const seedEvidencePackIndex = readJson(paths.evidencePackIndex);
  const evidencePacks = bigqueryEvidencePackIndex.packs ?? [];
  const seedEvidencePacks = seedEvidencePackIndex.packs ?? [];
  const landscapeEvidenceChunks = mcpSnapshot.evidenceChunks ?? [];
  const chunksByPublication = new Map();
  for (const chunk of chunks) {
    if (!chunksByPublication.has(chunk.publication_number)) chunksByPublication.set(chunk.publication_number, []);
    chunksByPublication.get(chunk.publication_number).push(chunk);
  }
  const claimTextByPublication = new Map();
  for (const claim of claims) {
    claimTextByPublication.set(
      claim.publication_number,
      [claimTextByPublication.get(claim.publication_number), claim.text].filter(Boolean).join(" "),
    );
  }

  dataCache = {
    patents,
    chunks,
    landscapeEvidenceChunks,
    claims,
    claimTextByPublication,
    chunksByPublication,
    nodes,
    nodesById: new Map(nodes.map((node) => [node.id, node])),
    edges,
    crosswalk: mcpSnapshot.crosswalk ?? readJson(paths.crosswalk),
    crosswalkByFieldId: new Map((mcpSnapshot.crosswalk?.fields ?? readJson(paths.crosswalk).fields ?? []).map((field) => [field.aeropatent_field_id, field])),
    nasaTaxonomy: readJson(paths.nasaTaxonomy),
    mcpSnapshot,
    landscape: mcpSnapshot.landscape,
    bigqueryEvidencePackIndex,
    seedEvidencePackIndex,
    evidencePacks,
    seedEvidencePacks,
    evidenceChunksById: new Map([...chunks, ...landscapeEvidenceChunks].map((chunk) => [chunk.id, chunk])),
    evidencePacksByProgramId: new Map(evidencePacks.map((pack) => [pack.programId, pack])),
    seedEvidencePacksByProgramId: new Map(seedEvidencePacks.map((pack) => [pack.programId, pack])),
  };
  return dataCache;
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

function toToolResult(data) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function send(payload) {
  const json = JSON.stringify(payload);
  const length = Buffer.byteLength(json, "utf8");
  process.stdout.write(`Content-Length: ${length}\r\n\r\n${json}`);
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCode(value) {
  return value ? String(value).trim().toUpperCase() : "";
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value * 100) / 100;
}
