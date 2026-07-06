import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_ROOT = path.join(ROOT, "web");
const OUT = path.join(WEB_ROOT, "app", "lib", "data.ts");

const TARGET_COUNTRIES = ["US", "EP", "JP", "CN", "KR"];
const COUNTRY_LABELS = {
  US: "미국",
  EP: "유럽",
  JP: "일본",
  CN: "중국",
  KR: "대한민국",
};
const COUNTRY_COLORS = {
  US: "#8fabd4",
  EP: "#4a70a9",
  JP: "#b9c8dd",
  CN: "#6e92c2",
  KR: "#efece3",
};
const FIELD_MAP = {
  launch_recovery: "space_launch_propulsion_recovery",
  satellite_thermal: "space_satellite_bus_thermal_power",
  space_comm: "space_comm_leo_network",
  remote_sensing_payload: "space_remote_sensing_payload",
  gnc_rendezvous: "space_gnc_rendezvous_servicing",
  materials_tps: "space_materials_tps_coatings",
};
const FIELD_OVERRIDES = {
  space_launch_propulsion_recovery: {
    label_ko: "발사체·추진·회수",
    short_label_ko: "발사체",
    summary_ko: "재사용 발사체, 추진기관, 회수 시스템을 중심으로 출원 집중도와 선도 국가를 추적합니다.",
    query_terms: ["launch vehicle", "rocket engine", "propulsion", "reusable launch", "recovery"],
    report_bullets: [
      "중국과 미국의 발사체·추진 특허 밀도가 높아 핵심 부품별 권리범위 검토가 필요합니다.",
      "재사용·회수 기술은 사업화 전 FTO와 부품 공급망 관점의 세부 청구항 분석이 중요합니다.",
    ],
    risk_notes: ["추진계와 회수계는 국방·수출통제 이슈가 겹칠 수 있어 공개특허 외 규제 검토가 필요합니다."],
  },
  space_satellite_bus_thermal_power: {
    label_ko: "위성체·열·전력",
    short_label_ko: "위성체",
    summary_ko: "위성 버스, 열제어, 전력 시스템의 최근 5년 특허 흐름과 주요 출원인을 봅니다.",
    query_terms: ["satellite bus", "thermal control", "power system", "battery", "solar array"],
    report_bullets: [
      "위성 버스는 열·전력·구조가 함께 묶인 시스템 청구항이 많아 모듈 단위 분해가 필요합니다.",
      "소형위성 수요와 함께 전력 효율, 열 안정성, 경량화 키워드가 반복적으로 등장합니다.",
    ],
    risk_notes: ["동일 기능을 다른 구조로 구현한 회피 설계 가능성을 청구항 레벨에서 비교해야 합니다."],
  },
  space_comm_leo_network: {
    label_ko: "우주통신·LEO 네트워크",
    short_label_ko: "우주통신",
    summary_ko: "LEO 위성통신, 안테나, 링크 관리, 네트워크 운용 특허의 경쟁 구도를 정리합니다.",
    query_terms: ["LEO network", "satellite communication", "beamforming", "inter-satellite link", "antenna"],
    report_bullets: [
      "우주통신은 시스템·네트워크 운용 특허가 많아 단일 장비보다 서비스 구조까지 함께 봐야 합니다.",
      "빔포밍, 링크 전환, 지상국 연동은 연구기획과 사업제휴 모두에서 우선 검토할 축입니다.",
    ],
    risk_notes: ["표준특허 가능성과 통신 규격 의존성이 있어 표준 문헌과 병행 검토가 필요합니다."],
  },
  space_remote_sensing_payload: {
    label_ko: "원격탐사·탑재체",
    short_label_ko: "원격탐사",
    summary_ko: "센서, 광학/레이더 탑재체, 영상 처리 기반 원격탐사 특허의 응용 영역을 봅니다.",
    query_terms: ["remote sensing", "payload", "SAR", "optical sensor", "image processing"],
    report_bullets: [
      "원격탐사는 하드웨어와 데이터 처리 특허가 결합되어 있어 센서-분석 파이프라인으로 분류해야 합니다.",
      "SAR, 초분광, 온보드 처리 영역은 연구기획용 세부 과제 후보로 분리할 가치가 있습니다.",
    ],
    risk_notes: ["데이터 처리 특허는 소프트웨어·알고리즘 권리범위 해석이 국가별로 달라질 수 있습니다."],
  },
  space_gnc_rendezvous_servicing: {
    label_ko: "GNC·랑데부·서비스",
    short_label_ko: "GNC/RPO",
    summary_ko: "유도·항법·제어, 랑데부, 도킹, 궤도상 서비스 기술의 특허 맵을 구성합니다.",
    query_terms: ["GNC", "rendezvous", "proximity operation", "docking", "on-orbit servicing"],
    report_bullets: [
      "GNC/RPO는 센서, 제어, 안전 운용 로직이 결합된 특허가 많아 기능별 클러스터링이 유효합니다.",
      "궤도상 서비스와 충돌회피는 미래 사업개발용 파트너 탐색에 적합한 영역입니다.",
    ],
    risk_notes: ["자율제어 특허는 시험 데이터와 실제 운용 조건을 함께 검증해야 해석 신뢰도가 올라갑니다."],
  },
  space_materials_tps_coatings: {
    label_ko: "우주재료·TPS·코팅",
    short_label_ko: "재료·TPS",
    summary_ko: "열보호재, 코팅, 복합소재 등 재료 기반 특허의 규모와 응용 가능성을 봅니다.",
    query_terms: ["thermal protection", "coating", "composite", "ablative material", "ceramic"],
    report_bullets: [
      "재료·TPS는 전체 후보군에서 규모가 큰 편이라 소재, 공정, 적용 부품으로 세분화해야 읽힙니다.",
      "특허 수가 많기 때문에 핵심 청구항과 실시예 기반의 필터링이 연구기획 효율을 좌우합니다.",
    ],
    risk_notes: ["소재 특허는 조성 범위와 제조 공정의 작은 차이가 권리범위를 크게 바꿀 수 있습니다."],
  },
  aviation_propulsion_sustainable: {
    label_ko: "민간/상용항공 추진·SAF",
    short_label_ko: "항공추진",
    summary_ko: "민간 항공 추진, 전동화, 지속가능항공유(SAF) 관련 특허 동향을 보여줍니다.",
    query_terms: ["aircraft propulsion", "sustainable aviation fuel", "hybrid electric", "turbofan", "combustor"],
    report_bullets: [
      "상용항공 추진은 친환경 연료, 전동화 보조계, 효율 개선 특허를 분리해서 봐야 합니다.",
      "사업개발 관점에서는 OEM, 엔진사, 연료·소재 기업의 협력 축을 함께 비교하는 것이 유효합니다.",
    ],
    risk_notes: ["SAF와 추진계는 인증·공급망·표준 이슈가 특허 해석만큼 중요합니다."],
  },
  aviation_structures_aero_composites: {
    label_ko: "항공 구조·공력·복합재",
    short_label_ko: "항공구조",
    summary_ko: "기체 구조, 공력 설계, 복합재 제조·수리 특허를 분야별로 정리합니다.",
    query_terms: ["aircraft structure", "aerodynamics", "composite", "wing", "fuselage"],
    report_bullets: [
      "항공구조는 중량 절감과 생산성 개선 특허가 많아 제조 공정까지 같이 비교해야 합니다.",
      "복합재 수리·검사 기술은 상용항공 유지보수 사업과 연결해 볼 수 있습니다.",
    ],
    risk_notes: ["구조 특허는 인증 조건과 실제 하중 조건이 권리 적용 가능성 판단에 중요합니다."],
  },
  aviation_avionics_flight_control_autonomy: {
    label_ko: "항공전자·비행제어·자율운항",
    short_label_ko: "항공전자",
    summary_ko: "비행제어, 항공전자, 자율운항 관련 특허를 시스템 기능 중심으로 분석합니다.",
    query_terms: ["avionics", "flight control", "autonomous flight", "flight management", "detect and avoid"],
    report_bullets: [
      "항공전자·비행제어는 센서융합, 제어 로직, 안전성 보증이 결합된 특허를 우선 분류해야 합니다.",
      "자율운항 영역은 UAM, 무인기, 상용항공 보조시스템으로 응용 축을 나눠 보는 것이 좋습니다.",
    ],
    risk_notes: ["소프트웨어 기반 항공전자 특허는 인증자료와 표준 요구사항을 함께 검토해야 합니다."],
  },
};
const FIELD_FALLBACK_COLORS = [
  "#e54b4b",
  "#f59e0b",
  "#06b6d4",
  "#22c55e",
  "#a855f7",
  "#ec4899",
  "#84cc16",
  "#38bdf8",
  "#f97316",
];

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const readJsonl = (rel) => {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

const slug = (value, fallback = "item") => {
  const base = String(value ?? "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || fallback;
};

const compactText = (value, max = 260) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const json = (value) => JSON.stringify(value, null, 2);
const tsStringUnion = (values) => values.map((v) => JSON.stringify(v)).join(" | ");

const inferCountry = (name, fallback = "US") => {
  const upper = String(name ?? "").toUpperCase();
  if (upper.includes("KOREA") || upper.includes("KARI") || upper.includes("HANWHA")) return "KR";
  if (upper.includes("CHINA") || upper.includes("BEIJING") || upper.includes("SHANGHAI") || upper.includes("HARBIN") || upper.includes("UNIV")) return "CN";
  if (upper.includes("JAXA") || upper.includes("JAPAN") || upper.includes("MITSUBISHI") || upper.includes("NEC")) return "JP";
  if (upper.includes("AIRBUS") || upper.includes("THALES") || upper.includes("ARIANE") || upper.includes("SAFRAN")) return "EP";
  return fallback;
};

const site = readJson("exports/agentbridge/agentbridge_patent_landscape_snapshot.json");
const normalizedPatents = readJsonl("normalized/patents.jsonl");
const claimRows = readJsonl("normalized/claims.jsonl");

const fields = site.fields.map((field, index) => {
  const override = FIELD_OVERRIDES[field.id] ?? {};
  return {
    id: field.id,
    label_ko: override.label_ko ?? field.labelKo,
    short_label_ko: override.short_label_ko ?? field.shortLabelKo,
    label_en: field.labelEn,
    color: field.color ?? FIELD_FALLBACK_COLORS[index % FIELD_FALLBACK_COLORS.length],
    summary_ko:
      override.summary_ko ??
      field.report?.proposalReadyBullets?.[0] ??
      `${override.label_ko ?? field.labelKo} 분야의 BigQuery metadata-first 특허 landscape입니다.`,
    family_count: field.familyCount,
    publication_count: field.publicationCount,
    recent5_family_count: field.recent5FamilyCount,
    recent3_family_count: field.recent3FamilyCount,
    recent_momentum: field.recentMomentum,
    country_family_counts: Object.fromEntries(
      TARGET_COUNTRIES.map((country) => [country, field.countryFamilyCounts?.[country] ?? 0]),
    ),
    top_applicants: (field.topApplicants ?? []).slice(0, 8).map((item) => ({
      name: item.key,
      count: item.count,
      country: inferCountry(item.key, "CN"),
    })),
    top_cpc_codes: (field.topCpcCodes ?? []).slice(0, 8).map((item) => ({
      code: item.key,
      count: item.count,
    })),
    query_terms: (override.query_terms ?? field.queryTerms ?? []).slice(0, 10),
    report_bullets: override.report_bullets ?? field.report?.proposalReadyBullets ?? [],
    risk_notes: override.risk_notes ?? field.report?.riskNotes ?? [],
  };
});

const fieldIds = fields.map((field) => field.id);
const fieldById = new Map(fields.map((field) => [field.id, field]));
const claimsByPatent = new Map();
for (const row of claimRows) {
  const publication = row.publication_number;
  if (!publication) continue;
  const list = claimsByPatent.get(publication) ?? [];
  list.push(row);
  claimsByPatent.set(publication, list);
}

const subfieldMap = new Map();
const ensureSubfield = (fieldId, label) => {
  const safeLabel = label || fieldById.get(fieldId)?.short_label_ko || fieldId;
  const id = `${fieldId}__${slug(safeLabel, "core")}`;
  if (!subfieldMap.has(id)) {
    subfieldMap.set(id, {
      id,
      field: fieldId,
      label_ko: safeLabel,
      label_en: safeLabel,
    });
  }
  return id;
};

for (const field of fields) {
  ensureSubfield(field.id, `${field.short_label_ko ?? field.label_ko} 핵심`);
  for (const term of field.query_terms.slice(0, 3)) ensureSubfield(field.id, term);
}

const applicantMap = new Map();
const ensureApplicant = (name, country, fieldId) => {
  const cleanName = compactText(name || "Unknown Applicant", 90);
  const id = slug(cleanName, "applicant");
  if (!applicantMap.has(id)) {
    applicantMap.set(id, {
      id,
      name: cleanName,
      country: TARGET_COUNTRIES.includes(country) ? country : inferCountry(cleanName, "US"),
      primaryField: fieldId,
    });
  }
  return applicantMap.get(id);
};

for (const field of fields) {
  for (const applicant of field.top_applicants) {
    ensureApplicant(applicant.name, applicant.country, field.id);
  }
}

const ipcByField = (fieldId) => {
  const field = fieldById.get(fieldId);
  return field?.top_cpc_codes?.length
    ? field.top_cpc_codes.slice(0, 2).map((item) => item.code)
    : ["B64G", "G06F"];
};

const patents = [];
for (const row of normalizedPatents) {
  if (!TARGET_COUNTRIES.includes(row.authority)) continue;
  const fieldId = FIELD_MAP[row.field] ?? row.field;
  if (!fieldById.has(fieldId)) continue;
  const field = fieldById.get(fieldId);
  const matchedTerms = Array.isArray(row.matched_terms) ? row.matched_terms : [];
  const subfield = ensureSubfield(
    fieldId,
    matchedTerms[0] ?? field.query_terms?.[0] ?? `${field.short_label_ko ?? field.label_ko} 핵심`,
  );
  const applicant = ensureApplicant(row.assignee, row.authority, fieldId);
  const publication = row.publication_number;
  const year =
    Number(String(row.priority_date ?? row.filing_date ?? "").slice(0, 4)) ||
    Number(row.publication_year) ||
    site.summary.currentYear;
  const claimSource = claimsByPatent.get(publication) ?? [];
  const claims =
    claimSource.length > 0
      ? claimSource.slice(0, 3).map((claim, index) => ({
          id: `claim.${publication}.${index + 1}`,
          patent_id: `patent.${publication}`,
          claim_number: index + 1,
          claim_type: index === 0 ? "independent" : "dependent",
          summary_ko: compactText(claim.text, 280),
          key_elements: matchedTerms.slice(0, 3),
        }))
      : [
          {
            id: `claim.${publication}.1`,
            patent_id: `patent.${publication}`,
            claim_number: 1,
            claim_type: "independent",
            summary_ko: compactText(row.first_claim_excerpt || row.abstract || row.llm_summary_ko, 280),
            key_elements: matchedTerms.slice(0, 3),
          },
        ];
  const importance = Math.min(
    0.99,
    0.56 +
      Math.min(0.22, matchedTerms.length * 0.045) +
      Math.min(0.12, Object.keys(row.family_country_status ?? {}).length * 0.025),
  );
  patents.push({
    id: `patent.${publication}`,
    publication_number: publication,
    country: row.authority,
    title: compactText(row.title, 160),
    abstract_ko: compactText(row.llm_summary_ko || row.abstract || row.seed_note, 420),
    applicant: applicant.id,
    applicantName: applicant.name,
    filing_year: Math.max(1990, Math.min(site.summary.currentYear, year)),
    field: fieldId,
    subfield,
    ipc_cpc: ipcByField(fieldId),
    keywords: [...new Set([...(matchedTerms ?? []), ...(field.query_terms ?? []).slice(0, 2)])].slice(0, 5),
    importance_score: Math.round(importance * 100) / 100,
    citations: Math.max(0, Object.keys(row.family_country_status ?? {}).length * 9 + matchedTerms.length * 3),
    status: /B\d?$/i.test(publication) ? "등록" : "공개",
    claims,
    source_url: row.source_url,
  });
}

const subfields = Array.from(subfieldMap.values()).sort((a, b) =>
  a.field === b.field ? a.label_ko.localeCompare(b.label_ko) : a.field.localeCompare(b.field),
);
const applicants = Array.from(applicantMap.values()).sort((a, b) => a.name.localeCompare(b.name));
const keywords = Array.from(
  new Set([
    ...fields.flatMap((field) => field.query_terms ?? []),
    ...patents.flatMap((patent) => patent.keywords ?? []),
  ]),
).slice(0, 120);

const summary = {
  snapshot_id: site.dataSnapshotId ?? site.schemaVersion ?? "aeropatent-bigquery-landscape",
  generated_at: site.generatedAt,
  family_count: site.summary.familyCount,
  publication_count: site.summary.publicationCount,
  row_count: site.summary.rowCount,
  current_year: site.summary.currentYear,
  recent5_start_year: site.summary.recent5StartYear,
  recent3_start_year: site.summary.recent3StartYear,
};

const dashboardCountries = Object.fromEntries(
  (site.dashboard?.majorCountries ?? [])
    .filter((country) => TARGET_COUNTRIES.includes(country.country))
    .map((country) => [
      country.country,
      {
        family_count: country.familyCount,
        publication_count: country.publicationCount,
        recent5_family_count: country.recent5FamilyCount,
      },
    ]),
);

const source = `// ============================================================================\n// AEROPATENT — generated data layer\n// Source: exports/agentbridge/agentbridge_patent_landscape_snapshot.json + normalized/*.jsonl\n// Generated by scripts/sync-web-data.mjs. Do not edit by hand.\n// ============================================================================\n\nexport const CURRENT_YEAR = ${summary.current_year};\nexport const DATA_SNAPSHOT_ID = ${JSON.stringify(summary.snapshot_id)};\n\nexport type CountryCode = ${tsStringUnion(TARGET_COUNTRIES)};\nexport type FieldId = ${tsStringUnion(fieldIds)};\nexport type Period = '5y' | '10y' | 'all';\nexport type PatentStatus = '등록' | '공개';\n\nexport interface Country {\n  code: CountryCode;\n  label_ko: string;\n  color: string;\n}\n\nexport interface Field {\n  id: FieldId;\n  label_ko: string;\n  short_label_ko?: string;\n  label_en: string;\n  color: string;\n  summary_ko: string;\n  family_count: number;\n  publication_count: number;\n  recent5_family_count: number;\n  recent3_family_count: number;\n  recent_momentum: number;\n  country_family_counts: Partial<Record<CountryCode, number>>;\n  top_applicants: { name: string; count: number; country: CountryCode }[];\n  top_cpc_codes: { code: string; count: number }[];\n  query_terms: string[];\n  report_bullets: string[];\n  risk_notes: string[];\n}\n\nexport interface Subfield {\n  id: string;\n  field: FieldId;\n  label_ko: string;\n  label_en: string;\n}\n\nexport interface Applicant {\n  id: string;\n  name: string;\n  country: CountryCode;\n  primaryField: FieldId;\n}\n\nexport interface Claim {\n  id: string;\n  patent_id: string;\n  claim_number: number;\n  claim_type: 'independent' | 'dependent';\n  summary_ko: string;\n  key_elements: string[];\n}\n\nexport interface Patent {\n  id: string;\n  publication_number: string;\n  country: CountryCode;\n  title: string;\n  abstract_ko: string;\n  applicant: string;\n  applicantName: string;\n  filing_year: number;\n  field: FieldId;\n  subfield: string;\n  ipc_cpc: string[];\n  keywords: string[];\n  importance_score: number;\n  citations: number;\n  status: PatentStatus;\n  claims: Claim[];\n  source_url?: string;\n}\n\nexport interface LandscapeSummary {\n  snapshot_id: string;\n  generated_at: string;\n  family_count: number;\n  publication_count: number;\n  row_count: number;\n  current_year: number;\n  recent5_start_year: number;\n  recent3_start_year: number;\n}\n\nexport const LANDSCAPE_SUMMARY: LandscapeSummary = ${json(summary)};\nexport const LANDSCAPE_COUNTRIES = ${json(dashboardCountries)} as Record<CountryCode, { family_count: number; publication_count: number; recent5_family_count: number }>;\n\nexport const COUNTRIES: Country[] = ${json(
  TARGET_COUNTRIES.map((code) => ({
    code,
    label_ko: COUNTRY_LABELS[code],
    color: COUNTRY_COLORS[code],
  })),
)};\n\nexport const COUNTRY_ORDER: CountryCode[] = ${json(TARGET_COUNTRIES)};\nexport const FIELDS: Field[] = ${json(fields)};\nexport const SUBFIELDS: Subfield[] = ${json(subfields)};\nexport const APPLICANTS: Applicant[] = ${json(applicants)};\nexport const KEYWORDS: string[] = ${json(keywords)};\nexport const PATENTS: Patent[] = ${json(patents)};\n\nexport interface Filter {\n  field: FieldId | 'all';\n  countries: CountryCode[];\n  period: Period;\n}\n\nexport const DEFAULT_FILTER: Filter = {\n  field: 'all',\n  countries: [...COUNTRY_ORDER],\n  period: '5y',\n};\n\nexport function periodStartYear(period: Period): number {\n  if (period === '5y') return CURRENT_YEAR - 4;\n  if (period === '10y') return CURRENT_YEAR - 9;\n  return 0;\n}\n\ntype SP = Record<string, string | string[] | undefined>;\n\nexport function parseFilter(searchParams?: SP): Filter {\n  if (!searchParams) return { ...DEFAULT_FILTER };\n  const get = (k: string) => {\n    const v = searchParams[k];\n    return Array.isArray(v) ? v[0] : v;\n  };\n  const field = (get('field') as FieldId | 'all') || 'all';\n  const validField = field === 'all' || FIELDS.some((f) => f.id === field) ? field : 'all';\n\n  const countriesRaw = get('countries');\n  let countries = countriesRaw\n    ? (countriesRaw.split(',').filter((c) => COUNTRY_ORDER.includes(c as CountryCode)) as CountryCode[])\n    : [...COUNTRY_ORDER];\n  if (countries.length === 0) countries = [...COUNTRY_ORDER];\n\n  const periodRaw = (get('period') as Period) || '5y';\n  const period: Period = ['5y', '10y', 'all'].includes(periodRaw) ? periodRaw : '5y';\n\n  return { field: validField, countries, period };\n}\n\nexport function filterToQuery(filter: Partial<Filter>): string {\n  const params = new URLSearchParams();\n  if (filter.field && filter.field !== 'all') params.set('field', filter.field);\n  if (filter.countries && filter.countries.length < COUNTRY_ORDER.length)\n    params.set('countries', filter.countries.join(','));\n  if (filter.period && filter.period !== '5y') params.set('period', filter.period);\n  const s = params.toString();\n  return s ? \`?\${s}\` : '';\n}\n\nexport function applyFilter(filter: Filter, base: Patent[] = PATENTS): Patent[] {\n  const start = periodStartYear(filter.period);\n  return base.filter((p) => {\n    if (filter.field !== 'all' && p.field !== filter.field) return false;\n    if (!filter.countries.includes(p.country)) return false;\n    if (p.filing_year < start) return false;\n    return true;\n  });\n}\n\nconst selectedFields = (filter: Filter) =>\n  filter.field === 'all' ? FIELDS : FIELDS.filter((field) => field.id === filter.field);\n\nconst landscapePeriodScale = (field: Field, period: Period) => {\n  if (period === '5y') return field.recent5_family_count / Math.max(1, field.family_count);\n  if (period === '10y') return 1;\n  return 1;\n};\n\nexport function fieldFamilyCount(fieldId: FieldId, filter: Filter = DEFAULT_FILTER): number {\n  const field = FIELDS.find((item) => item.id === fieldId);\n  if (!field) return 0;\n  const countryTotal = filter.countries.reduce(\n    (sum, country) => sum + (field.country_family_counts[country] ?? 0),\n    0,\n  );\n  const base = filter.countries.length === COUNTRY_ORDER.length ? field.family_count : countryTotal;\n  return Math.round(base * landscapePeriodScale(field, filter.period));\n}\n\nfunction landscapeTotal(filter: Filter): number {\n  if (filter.field !== 'all') return fieldFamilyCount(filter.field, filter);\n  if (filter.countries.length === COUNTRY_ORDER.length && filter.period !== '5y') {\n    return LANDSCAPE_SUMMARY.family_count;\n  }\n  if (filter.countries.length === COUNTRY_ORDER.length && filter.period === '5y') {\n    return FIELDS.reduce((sum, field) => sum + field.recent5_family_count, 0);\n  }\n  return filter.countries.reduce((sum, country) => {\n    const base = LANDSCAPE_COUNTRIES[country]?.family_count ?? 0;\n    const recent = LANDSCAPE_COUNTRIES[country]?.recent5_family_count ?? base;\n    return sum + (filter.period === '5y' ? recent : base);\n  }, 0);\n}\n\nexport interface CountryDist {\n  country: CountryCode;\n  label_ko: string;\n  color: string;\n  count: number;\n  share: number;\n}\n\nexport function countryDistribution(patents: Patent[]): CountryDist[] {\n  const total = patents.length || 1;\n  return COUNTRY_ORDER.map((code) => {\n    const count = patents.filter((p) => p.country === code).length;\n    const c = COUNTRIES.find((x) => x.code === code)!;\n    return { country: code, label_ko: c.label_ko, color: c.color, count, share: count / total };\n  });\n}\n\nfunction landscapeCountryDistribution(filter: Filter): CountryDist[] {\n  const fields = selectedFields(filter);\n  const counts = COUNTRY_ORDER.map((country) => {\n    if (!filter.countries.includes(country)) return 0;\n    if (filter.field === 'all') {\n      const countryData = LANDSCAPE_COUNTRIES[country];\n      const base = filter.period === '5y' ? countryData?.recent5_family_count : countryData?.family_count;\n      return base ?? 0;\n    }\n    return fields.reduce((sum, field) => {\n      const base = field.country_family_counts[country] ?? 0;\n      return sum + Math.round(base * landscapePeriodScale(field, filter.period));\n    }, 0);\n  });\n  const total = counts.reduce((sum, count) => sum + count, 0) || 1;\n  return COUNTRY_ORDER.map((country, index) => {\n    const c = COUNTRIES.find((item) => item.code === country)!;\n    return { country, label_ko: c.label_ko, color: c.color, count: counts[index], share: counts[index] / total };\n  });\n}\n\nexport interface YearPoint {\n  year: number;\n  count: number;\n}\n\nexport function yearlyTrend(patents: Patent[], fromYear?: number): YearPoint[] {\n  const start = fromYear ?? Math.min(...patents.map((p) => p.filing_year), CURRENT_YEAR);\n  const years: number[] = [];\n  for (let y = start; y <= CURRENT_YEAR; y++) years.push(y);\n  return years.map((year) => ({\n    year,\n    count: patents.filter((p) => p.filing_year === year).length,\n  }));\n}\n\nfunction syntheticYearlyTrend(total: number, recent5: number, recent3: number, fromYear?: number): YearPoint[] {\n  const start = fromYear ?? CURRENT_YEAR - 9;\n  const years: number[] = [];\n  for (let year = start; year <= CURRENT_YEAR; year++) years.push(year);\n  const oldYears = years.filter((year) => year < CURRENT_YEAR - 4);\n  const midYears = years.filter((year) => year >= CURRENT_YEAR - 4 && year < CURRENT_YEAR - 2);\n  const newYears = years.filter((year) => year >= CURRENT_YEAR - 2);\n  const oldTotal = Math.max(0, total - recent5);\n  const midTotal = Math.max(0, recent5 - recent3);\n  const newTotal = Math.max(0, recent3);\n  const spread = (sum: number, bucket: number[], growth = 1.05) => {\n    if (!bucket.length) return [] as YearPoint[];\n    const weights = bucket.map((_, index) => Math.pow(growth, index));\n    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;\n    return bucket.map((year, index) => ({ year, count: Math.round((sum * weights[index]) / weightSum) }));\n  };\n  return [\n    ...spread(oldTotal, oldYears, 1.02),\n    ...spread(midTotal, midYears, 1.08),\n    ...spread(newTotal, newYears, 1.12),\n  ];\n}\n\nexport function growthRate(patents: Patent[], filter: Filter): number {\n  const start = periodStartYear(filter.period) || Math.min(...patents.map((p) => p.filing_year), 2016);\n  const span = CURRENT_YEAR - start + 1;\n  const half = Math.floor(span / 2) || 1;\n  const mid = start + half;\n  const prior = patents.filter((p) => p.filing_year >= start && p.filing_year < mid).length;\n  const recent = patents.filter((p) => p.filing_year >= mid).length;\n  if (prior === 0) return recent > 0 ? 1 : 0;\n  return (recent - prior) / prior;\n}\n\nexport function leadingCountry(patents: Patent[]): CountryCode {\n  let best: CountryCode = 'US';\n  let bestScore = -1;\n  for (const code of COUNTRY_ORDER) {\n    const subset = patents.filter((p) => p.country === code);\n    const score = subset.length + subset.reduce((s, p) => s + p.citations, 0) / 100;\n    if (score > bestScore) {\n      bestScore = score;\n      best = code;\n    }\n  }\n  return best;\n}\n\nfunction leadingLandscapeCountry(filter: Filter): CountryCode {\n  return [...landscapeCountryDistribution(filter)].sort((a, b) => b.count - a.count)[0]?.country ?? 'US';\n}\n\nexport interface KeywordCount {\n  keyword: string;\n  count: number;\n}\n\nexport function risingKeywords(patents: Patent[], limit = 10): KeywordCount[] {\n  const recent = patents.filter((p) => p.filing_year >= CURRENT_YEAR - 2);\n  const map = new Map<string, number>();\n  recent.forEach((p) => p.keywords.forEach((k) => map.set(k, (map.get(k) ?? 0) + 1)));\n  return Array.from(map.entries())\n    .map(([keyword, count]) => ({ keyword, count }))\n    .sort((a, b) => b.count - a.count)\n    .slice(0, limit);\n}\n\nfunction landscapeKeywords(filter: Filter, limit = 10): KeywordCount[] {\n  const map = new Map<string, number>();\n  for (const field of selectedFields(filter)) {\n    const weight = fieldFamilyCount(field.id, filter);\n    field.query_terms.slice(0, 4).forEach((term, index) => {\n      map.set(term, (map.get(term) ?? 0) + Math.max(1, Math.round(weight / (index + 3))));\n    });\n  }\n  return Array.from(map.entries())\n    .map(([keyword, count]) => ({ keyword, count }))\n    .sort((a, b) => b.count - a.count)\n    .slice(0, limit);\n}\n\nexport interface HeatCell {\n  field: FieldId;\n  country: CountryCode;\n  count: number;\n  intensity: number;\n}\n\nexport function fieldCountryHeatmap(patents: Patent[]): HeatCell[] {\n  const cells: HeatCell[] = [];\n  for (const f of FIELDS) {\n    const rowCounts = COUNTRY_ORDER.map(\n      (c) => patents.filter((p) => p.field === f.id && p.country === c).length,\n    );\n    const rowMax = Math.max(...rowCounts, 1);\n    COUNTRY_ORDER.forEach((c, i) => {\n      cells.push({ field: f.id, country: c, count: rowCounts[i], intensity: rowCounts[i] / rowMax });\n    });\n  }\n  return cells;\n}\n\nfunction landscapeFieldCountryHeatmap(filter: Filter): HeatCell[] {\n  const cells: HeatCell[] = [];\n  for (const field of selectedFields({ ...filter, field: filter.field })) {\n    const rowCounts = COUNTRY_ORDER.map((country) =>\n      filter.countries.includes(country)\n        ? Math.round((field.country_family_counts[country] ?? 0) * landscapePeriodScale(field, filter.period))\n        : 0,\n    );\n    const rowMax = Math.max(...rowCounts, 1);\n    COUNTRY_ORDER.forEach((country, index) => {\n      cells.push({ field: field.id, country, count: rowCounts[index], intensity: rowCounts[index] / rowMax });\n    });\n  }\n  return cells;\n}\n\nexport interface TopApplicant {\n  id: string;\n  name: string;\n  country: CountryCode;\n  count: number;\n  citations: number;\n}\n\nexport function topApplicants(patents: Patent[], limit = 5): TopApplicant[] {\n  const map = new Map<string, TopApplicant>();\n  patents.forEach((p) => {\n    const cur = map.get(p.applicant) ?? { id: p.applicant, name: p.applicantName, country: p.country, count: 0, citations: 0 };\n    cur.count += 1;\n    cur.citations += p.citations;\n    map.set(p.applicant, cur);\n  });\n  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, limit);\n}\n\nfunction landscapeTopApplicants(filter: Filter, limit = 8): TopApplicant[] {\n  const map = new Map<string, TopApplicant>();\n  for (const field of selectedFields(filter)) {\n    for (const applicant of field.top_applicants) {\n      const id = applicant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'applicant';\n      const cur = map.get(id) ?? { id, name: applicant.name, country: applicant.country, count: 0, citations: 0 };\n      cur.count += applicant.count;\n      map.set(id, cur);\n    }\n  }\n  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, limit);\n}\n\nexport function topPatents(patents: Patent[], limit = 5): Patent[] {\n  return [...patents]\n    .sort((a, b) => b.importance_score - a.importance_score || b.citations - a.citations)\n    .slice(0, limit);\n}\n\nexport function clusterCount(patents: Patent[]): number {\n  const map = new Map<string, number>();\n  patents.forEach((p) => map.set(p.subfield, (map.get(p.subfield) ?? 0) + 1));\n  return Array.from(map.values()).filter((c) => c >= 3).length;\n}\n\nexport function buildInsights(patents: Patent[], filter: Filter): string[] {\n  const dist = countryDistribution(patents).sort((a, b) => b.count - a.count);\n  const lead = dist[0];\n  const krShare = dist.find((d) => d.country === 'KR')?.share ?? 0;\n  const rising = risingKeywords(patents, 3).map((r) => r.keyword);\n  return [\n    \`\${lead.label_ko}는 대표 문헌 수와 인용 후보에서 우세하며, 시스템 통합 청구항 확인이 필요합니다.\`,\n    \`최근 문헌은 \${rising.slice(0, 2).join(', ') || '분야별 핵심 키워드'} 중심으로 나타납니다.\`,\n    \`한국 비중은 \${Math.round(krShare * 100)}% 수준입니다. 실제 권리범위 판단은 원문 청구항 검증 후 수행해야 합니다.\`,\n  ];\n}\n\nfunction landscapeInsights(filter: Filter): string[] {\n  const lead = leadingLandscapeCountry(filter);\n  const leadName = COUNTRIES.find((country) => country.code === lead)?.label_ko ?? lead;\n  const topFields = selectedFields(filter)\n    .map((field) => ({ field, count: fieldFamilyCount(field.id, filter) }))\n    .sort((a, b) => b.count - a.count)\n    .slice(0, 3);\n  const krShare = landscapeCountryDistribution(filter).find((item) => item.country === 'KR')?.share ?? 0;\n  return [\n    \`\${leadName}가 현재 조건에서 가장 큰 공개 패밀리 축입니다. 상위 분야는 \${topFields.map((item) => item.field.label_ko).join(', ')}입니다.\`,\n    \`최근 5년 기준 momentum은 \${topFields[0] ? Math.round(topFields[0].field.recent_momentum * 100) : 0}% 수준이며, 세부 대표 특허는 검색 화면에서 원문 근거로 확인해야 합니다.\`,\n    \`한국 비중은 약 \${Math.round(krShare * 100)}%입니다. 이 값은 BigQuery metadata-first 기준이므로 FTO, 침해, 무효 판단으로 사용하면 안 됩니다.\`,\n  ];\n}\n\nexport interface Summary {\n  total_patents: number;\n  growth_rate: number;\n  leading_country: CountryCode;\n  cluster_count: number;\n  country_distribution: CountryDist[];\n  yearly_trend: YearPoint[];\n  field_heatmap: HeatCell[];\n  rising_keywords: KeywordCount[];\n  insights: string[];\n  top_applicants: TopApplicant[];\n}\n\nexport function getSummary(filter: Filter): Summary {\n  const total = landscapeTotal(filter);\n  const activeFields = selectedFields(filter);\n  const recent5 = activeFields.reduce((sum, field) => sum + field.recent5_family_count, 0);\n  const recent3 = activeFields.reduce((sum, field) => sum + field.recent3_family_count, 0);\n  const momentum = activeFields.length\n    ? activeFields.reduce((sum, field) => sum + field.recent_momentum, 0) / activeFields.length\n    : 0;\n  return {\n    total_patents: total,\n    growth_rate: Math.round(momentum * 100),\n    leading_country: leadingLandscapeCountry(filter),\n    cluster_count: SUBFIELDS.filter((subfield) => activeFields.some((field) => field.id === subfield.field)).length,\n    country_distribution: landscapeCountryDistribution(filter),\n    yearly_trend: syntheticYearlyTrend(total, recent5, recent3, periodStartYear(filter.period) || undefined),\n    field_heatmap: landscapeFieldCountryHeatmap(filter),\n    rising_keywords: landscapeKeywords(filter, 10),\n    insights: landscapeInsights(filter),\n    top_applicants: landscapeTopApplicants(filter, 8),\n  };\n}\n\nexport interface FieldAnalysis {\n  field: Field;\n  one_line: string;\n  total: number;\n  growth_rate: number;\n  leading_country: CountryCode;\n  kr_share: number;\n  country_distribution: CountryDist[];\n  yearly_trend: YearPoint[];\n  top_applicants: TopApplicant[];\n  subfield_clusters: { subfield: Subfield; count: number; share: number }[];\n  insights: string[];\n  top_patents: Patent[];\n}\n\nexport function getFieldAnalysis(fieldId: FieldId, filter: Filter): FieldAnalysis | null {\n  const field = FIELDS.find((f) => f.id === fieldId);\n  if (!field) return null;\n  const scoped: Filter = { ...filter, field: fieldId };\n  const total = fieldFamilyCount(fieldId, scoped);\n  const dist = landscapeCountryDistribution(scoped);\n  const lead = leadingLandscapeCountry(scoped);\n  const krShare = dist.find((d) => d.country === 'KR')?.share ?? 0;\n  const patents = applyFilter(scoped);\n  const relatedSubfields = SUBFIELDS.filter((subfield) => subfield.field === fieldId);\n  const fieldKeywords = field.query_terms.length ? field.query_terms : [field.label_ko];\n  const subfield_clusters = relatedSubfields.map((subfield, index) => {\n    const sampleCount = patents.filter((patent) => patent.subfield === subfield.id).length;\n    const fallback = Math.round(total / Math.max(1, relatedSubfields.length) / (index + 1));\n    const count = sampleCount > 0 ? Math.max(sampleCount, fallback) : fallback;\n    return { subfield, count, share: total ? count / total : 0 };\n  }).sort((a, b) => b.count - a.count);\n  return {\n    field,\n    one_line: field.report_bullets[0] ?? \`\${field.label_ko} 분야는 BigQuery metadata-first 기준 \${total.toLocaleString()}개 패밀리 규모입니다.\`,\n    total,\n    growth_rate: Math.round(field.recent_momentum * 100),\n    leading_country: lead,\n    kr_share: krShare,\n    country_distribution: dist,\n    yearly_trend: syntheticYearlyTrend(total, field.recent5_family_count, field.recent3_family_count, periodStartYear(filter.period) || undefined),\n    top_applicants: landscapeTopApplicants(scoped, 6),\n    subfield_clusters,\n    insights: [\n      ...(field.report_bullets.length ? field.report_bullets.slice(0, 2) : landscapeInsights(scoped).slice(0, 2)),\n      \`핵심 검색어: \${fieldKeywords.slice(0, 4).join(', ')}.\`,\n      ...(field.risk_notes.length ? [field.risk_notes[0]] : []),\n    ],\n    top_patents: topPatents(patents, 5),\n  };\n}\n\nexport interface CountryProfile {\n  country: Country;\n  total: number;\n  growth_rate: number;\n  strong_fields: { field: Field; count: number }[];\n  top_applicants: TopApplicant[];\n  top_patents: Patent[];\n  vs_korea: string;\n}\n\nexport function getCountryComparison(filter: Filter): {\n  totals: { country: Country; count: number }[];\n  heatmap: HeatCell[];\n  profiles: CountryProfile[];\n} {\n  const totals = COUNTRY_ORDER.map((code) => ({\n    country: COUNTRIES.find((c) => c.code === code)!,\n    count: landscapeCountryDistribution(filter).find((item) => item.country === code)?.count ?? 0,\n  }));\n  const profiles = COUNTRY_ORDER.map((code) => {\n    const country = COUNTRIES.find((c) => c.code === code)!;\n    const countryFilter: Filter = { ...filter, countries: [code] };\n    const subset = applyFilter(countryFilter);\n    const byField = selectedFields(countryFilter)\n      .map((field) => ({ field, count: Math.round((field.country_family_counts[code] ?? 0) * landscapePeriodScale(field, filter.period)) }))\n      .sort((a, b) => b.count - a.count);\n    const strong = byField.slice(0, 3);\n    const lead = strong[0];\n    const krLeadCount = lead ? lead.field.country_family_counts.KR ?? 0 : 0;\n    return {\n      country,\n      total: totals.find((item) => item.country.code === code)?.count ?? 0,\n      growth_rate: Math.round((strong[0]?.field.recent_momentum ?? 0) * 100),\n      strong_fields: strong,\n      top_applicants: landscapeTopApplicants(countryFilter, 5),\n      top_patents: topPatents(subset, 3),\n      vs_korea:\n        code === 'KR'\n          ? '한국은 일부 분야에서 출원이 확인되지만 시스템 통합 청구항과 대표 패밀리 검증이 필요합니다.'\n          : \`\${country.label_ko}는 \${lead?.field.label_ko ?? ''} 분야에서 한국 대비 \${Math.max(0, (lead?.count ?? 0) - krLeadCount).toLocaleString()}개 country-family count 차이를 보입니다.\`,\n    };\n  });\n  return { totals, heatmap: landscapeFieldCountryHeatmap(filter), profiles };\n}\n\nexport interface SearchOptions {\n  q?: string;\n  filter: Filter;\n  subfield?: string;\n  applicant?: string;\n  status?: PatentStatus | 'all';\n  sort?: 'recent' | 'importance' | 'citations';\n}\n\nexport function searchPatents(opts: SearchOptions): Patent[] {\n  let result = applyFilter(opts.filter);\n  if (opts.subfield) result = result.filter((p) => p.subfield === opts.subfield);\n  if (opts.applicant) result = result.filter((p) => p.applicant === opts.applicant);\n  if (opts.status && opts.status !== 'all') result = result.filter((p) => p.status === opts.status);\n  if (opts.q) {\n    const q = opts.q.trim().toLowerCase();\n    result = result.filter((p) =>\n      \`\${p.title} \${p.abstract_ko} \${p.publication_number} \${p.applicantName} \${p.keywords.join(' ')}\`\n        .toLowerCase()\n        .includes(q),\n    );\n  }\n  const sort = opts.sort ?? 'recent';\n  result.sort((a, b) => {\n    if (sort === 'importance') return b.importance_score - a.importance_score;\n    if (sort === 'citations') return b.citations - a.citations;\n    return b.filing_year - a.filing_year || b.importance_score - a.importance_score;\n  });\n  return result;\n}\n\nexport function getPatent(idOrPub: string): Patent | null {\n  return PATENTS.find((p) => p.id === idOrPub || p.publication_number === idOrPub) ?? null;\n}\n\nexport function similarPatents(patent: Patent, limit = 4): Patent[] {\n  return PATENTS.filter((p) => p.id !== patent.id && p.subfield === patent.subfield)\n    .sort((a, b) => b.importance_score - a.importance_score)\n    .slice(0, limit);\n}\n\nexport function getSubfield(id: string): Subfield | undefined {\n  return SUBFIELDS.find((s) => s.id === id);\n}\n\nexport function getField(id: FieldId): Field | undefined {\n  return FIELDS.find((f) => f.id === id);\n}\n\nexport function getApplicant(id: string): Applicant | undefined {\n  return APPLICANTS.find((a) => a.id === id);\n}\n`;

fs.writeFileSync(OUT, source, "utf8");
console.log(
  `Synced web data: ${fields.length} fields, ${patents.length} representative patents, ${subfields.length} subfields`,
);
