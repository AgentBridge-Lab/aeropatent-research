import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB_ROOT = path.join(ROOT, "web");
const OUT = path.join(WEB_ROOT, "app", "lib", "data.ts");

const TARGET_COUNTRIES = ["US", "EP", "JP", "CN", "KR"];
const COUNTRY_LABELS = {
  US: "미국",
  EP: "유럽(EPO)",
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

// 세부기술 ID는 영문 검색어에서 안정적으로 생성하되, 사용자에게는 검토된
// 한국어 명칭을 표시한다. 같은 검색어라도 적용 분야가 다르면 뜻이 달라질 수
// 있으므로 전체 세부기술 ID를 키로 사용한다.
const SUBFIELD_LABELS_KO = {
  "space_launch_propulsion_recovery__launch-vehicle": "발사체",
  "space_launch_propulsion_recovery__propulsion": "추진기관",
  "space_launch_propulsion_recovery__reusable-launch-vehicle": "재사용 발사체",
  "space_launch_propulsion_recovery__rocket-engine": "로켓 엔진",
  "space_launch_propulsion_recovery__rocket-recovery": "회수 시스템",
  "space_launch_propulsion_recovery__sea-landing": "해상 착륙",
  "space_launch_propulsion_recovery__vertical-landing": "수직 착륙",
  "space_satellite_bus_thermal_power__power-system": "전력 시스템",
  "space_satellite_bus_thermal_power__satellite-bus": "위성 버스",
  "space_satellite_bus_thermal_power__satellite-radiator": "위성 라디에이터",
  "space_satellite_bus_thermal_power__spacecraft-thermal-control": "우주비행체 열제어",
  "space_satellite_bus_thermal_power__thermal-control": "열제어",
  "space_satellite_bus_thermal_power__thermal-louver": "열제어 루버",
  "space_comm_leo_network__beamforming": "빔포밍",
  "space_comm_leo_network__inter-satellite-link": "위성 간 링크",
  "space_comm_leo_network__leo-network": "저궤도 네트워크",
  "space_comm_leo_network__leo-satellite-constellation": "저궤도 위성군",
  "space_comm_leo_network__satellite-communication": "위성통신",
  "space_gnc_rendezvous_servicing__attitude-control": "자세제어",
  "space_gnc_rendezvous_servicing__docking": "도킹",
  "space_gnc_rendezvous_servicing__gnc": "유도·항법·제어",
  "space_gnc_rendezvous_servicing__proximity-operation": "근접운용",
  "space_gnc_rendezvous_servicing__rendezvous": "랑데부",
  "space_materials_tps_coatings__coating": "기능성 코팅",
  "space_materials_tps_coatings__composite": "우주용 복합재",
  "space_materials_tps_coatings__rocket-motor-insulation": "로켓 모터 단열재",
  "space_materials_tps_coatings__thermal-protection": "열보호시스템",
  "space_remote_sensing_payload__payload": "탑재체",
  "space_remote_sensing_payload__remote-sensing": "원격탐사",
  "space_remote_sensing_payload__sar": "합성개구레이더(SAR)",
  "space_remote_sensing_payload__sar-imaging": "SAR 영상화",
  "space_remote_sensing_payload__synthetic-aperture-radar": "합성개구레이더",
  "aviation_propulsion_sustainable__aircraft-propulsion": "항공기 추진",
  "aviation_propulsion_sustainable__hybrid-electric": "하이브리드 전기추진",
  "aviation_propulsion_sustainable__sustainable-aviation-fuel": "지속가능항공유(SAF)",
  "aviation_structures_aero_composites__aerodynamics": "공력설계",
  "aviation_structures_aero_composites__aircraft-structure": "기체구조",
  "aviation_structures_aero_composites__composite": "항공 복합재",
  "aviation_avionics_flight_control_autonomy__autonomous-flight": "자율비행",
  "aviation_avionics_flight_control_autonomy__avionics": "항공전자",
  "aviation_avionics_flight_control_autonomy__flight-control": "비행제어",
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
const deepdiveEnrichment = readJson("analysis/deepdive_enrichment.json");
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
      label_ko: SUBFIELD_LABELS_KO[id] ?? safeLabel,
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

// P0-1: 인용 수 공식, 분야 상위 CPC 이식, 초록→청구항 위장 로직을 모두 제거했다.
// 청구항은 원문 청구항 발췌(claims.jsonl 또는 first_claim_excerpt)가 있는 경우에만 생성한다.
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
  const claims = [];
  if (claimSource.length > 0) {
    claimSource.slice(0, 3).forEach((claim, index) => {
      claims.push({
        id: `claim.${publication}.${index + 1}`,
        patent_id: `patent.${publication}`,
        claim_number: index + 1,
        summary_ko: compactText(claim.text, 280),
        key_elements: matchedTerms.slice(0, 3),
      });
    });
  } else if (row.first_claim_excerpt) {
    claims.push({
      id: `claim.${publication}.1`,
      patent_id: `patent.${publication}`,
      claim_number: 1,
      summary_ko: compactText(row.first_claim_excerpt, 280),
      key_elements: matchedTerms.slice(0, 3),
    });
  }
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
    keywords: [...new Set([...(matchedTerms ?? []), ...(field.query_terms ?? []).slice(0, 2)])].slice(0, 5),
    importance_score: Math.round(importance * 100) / 100,
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

const fieldEnrichment = Object.fromEntries(
  fields.map((field) => [field.id, deepdiveEnrichment.fields?.[field.id] ?? null]),
);

// Real per-year family counts from BigQuery; the current (incomplete) year is
// excluded because publication lag makes it look like a collapse.
const yearlyFamilyTrend = Object.entries(site.yearlyFamilyTrend ?? {})
  .map(([year, count]) => ({ year: Number(year), count: Number(count) || 0 }))
  .filter((point) => Number.isFinite(point.year) && point.year < summary.current_year)
  .sort((a, b) => a.year - b.year);

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

const source = `// ============================================================================
// AEROPATENT — generated data layer
// Source: exports/agentbridge/agentbridge_patent_landscape_snapshot.json
//       + analysis/deepdive_enrichment.json + normalized/*.jsonl
// Generated by scripts/sync-web-data.mjs. Do not edit by hand.
//
// 데이터 정직성 원칙:
// - 원천 레코드로 추적할 수 없는 값(인용 수, 이식 분류, 비례 배분 추세 등)은 표시하지 않는다.
// - 본체 집계 수치는 BigQuery 실측 집계만 사용하고, 표본(대표 문헌) 기반 수치는 표본임을 명시한다.
// ============================================================================

export const CURRENT_YEAR = ${summary.current_year};
export const DATA_SNAPSHOT_ID = ${JSON.stringify(summary.snapshot_id)};

// P0-4: 총량·분야 수치에 일관 적용할 라벨/출처 문구
export const CANDIDATE_SCOPE_NOTE = 'CPC 후보군 기준 (접두어 일치, 텍스트 검증 전)';
export const DATA_SOURCE_NOTE =
  'Google Patents Public Datasets (BigQuery) — IFI CLAIMS 등 제공, CC BY 4.0, 가공: AEROPATENT';
export const TREND_BASIS_NOTE = '전체 CPC 후보군 기준. 패밀리 대표 연도를 확정하지 않아 공보 단위 우선연도로 집계되며(한 패밀리가 여러 해에 걸릴 수 있음), 진행 중인 올해는 제외.';
export const SAMPLE_SIZE = ${patents.length};
export const SAMPLE_BASIS_NOTE = \`대표 문헌 표본 \${SAMPLE_SIZE}건 기준 (전체 후보군 아님)\`;

export type CountryCode = ${tsStringUnion(TARGET_COUNTRIES)};
export type FieldId = ${tsStringUnion(fieldIds)};
export type Period = '5y' | '10y' | 'all';
export type PatentStatus = '등록' | '공개';

export interface Country {
  code: CountryCode;
  label_ko: string;
  color: string;
}

export interface Field {
  id: FieldId;
  label_ko: string;
  short_label_ko?: string;
  label_en: string;
  color: string;
  summary_ko: string;
  family_count: number;
  publication_count: number;
  recent5_family_count: number;
  recent3_family_count: number;
  recent_momentum: number;
  country_family_counts: Partial<Record<CountryCode, number>>;
  top_applicants: { name: string; count: number }[];
  top_cpc_codes: { code: string; count: number }[];
  query_terms: string[];
  report_bullets: string[];
  risk_notes: string[];
}

export interface FieldEnrichment {
  label_ko: string;
  momentum_recent3_share: number;
  korea_publication_gap_score: number;
  korea_assignee_gap_score: number;
  cr5: number;
  region_family_counts: Record<string, number>;
  yearly_families: Record<string, number>;
  kr_top_applicants: { name: string; families: number }[];
  top_cited: {
    family_id: string;
    rep_pub: string;
    citing_families: number;
    title_en: string | null;
    gp_url: string;
  }[];
}

export interface Subfield {
  id: string;
  field: FieldId;
  label_ko: string;
  label_en: string;
}

export interface Applicant {
  id: string;
  name: string;
  country: CountryCode;
  primaryField: FieldId;
}

// 원문 청구항 발췌만 담는다 (초록·요약을 청구항으로 표시하지 않는다).
export interface Claim {
  id: string;
  patent_id: string;
  claim_number: number;
  summary_ko: string;
  key_elements: string[];
}

export interface Patent {
  id: string;
  publication_number: string;
  country: CountryCode;
  title: string;
  abstract_ko: string;
  applicant: string;
  applicantName: string;
  filing_year: number;
  field: FieldId;
  subfield: string;
  keywords: string[];
  importance_score: number;
  status: PatentStatus;
  claims: Claim[];
  source_url?: string;
}

export interface LandscapeSummary {
  snapshot_id: string;
  generated_at: string;
  family_count: number;
  publication_count: number;
  row_count: number;
  current_year: number;
  recent5_start_year: number;
  recent3_start_year: number;
}

export const LANDSCAPE_SUMMARY: LandscapeSummary = ${json(summary)};
export const LANDSCAPE_COUNTRIES = ${json(dashboardCountries)} as Record<CountryCode, { family_count: number; publication_count: number; recent5_family_count: number }>;

// Real BigQuery family counts per year (current incomplete year excluded).
export const YEARLY_FAMILY_TREND: YearPoint[] = ${json(yearlyFamilyTrend)};

export const COUNTRIES: Country[] = ${json(
  TARGET_COUNTRIES.map((code) => ({
    code,
    label_ko: COUNTRY_LABELS[code],
    color: COUNTRY_COLORS[code],
  })),
)};

export const COUNTRY_ORDER: CountryCode[] = ${json(TARGET_COUNTRIES)};
export const FIELDS: Field[] = ${json(fields)};
export const FIELD_ENRICHMENT: Partial<Record<FieldId, FieldEnrichment>> = ${json(fieldEnrichment)};
export const SUBFIELDS: Subfield[] = ${json(subfields)};
export const APPLICANTS: Applicant[] = ${json(applicants)};
export const KEYWORDS: string[] = ${json(keywords)};
export const PATENTS: Patent[] = ${json(patents)};

export interface Filter {
  field: FieldId | 'all';
  countries: CountryCode[];
  period: Period;
}

export const DEFAULT_FILTER: Filter = {
  field: 'all',
  countries: [...COUNTRY_ORDER],
  period: '5y',
};

export function periodStartYear(period: Period): number {
  if (period === '5y') return CURRENT_YEAR - 4;
  if (period === '10y') return CURRENT_YEAR - 9;
  return 0;
}

type SP = Record<string, string | string[] | undefined>;

// URL 필터는 표본 문헌 기반 화면(특허 검색, Graph View)에만 적용된다.
// 본체 집계 화면(분석·국가 비교·보고서)은 최근 10년 우선권 고정 기준을 사용한다.
export function parseFilter(searchParams?: SP): Filter {
  if (!searchParams) return { ...DEFAULT_FILTER };
  const get = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const field = (get('field') as FieldId | 'all') || 'all';
  const validField = field === 'all' || FIELDS.some((f) => f.id === field) ? field : 'all';

  const countriesRaw = get('countries');
  let countries = countriesRaw
    ? (countriesRaw.split(',').filter((c) => COUNTRY_ORDER.includes(c as CountryCode)) as CountryCode[])
    : [...COUNTRY_ORDER];
  if (countries.length === 0) countries = [...COUNTRY_ORDER];

  const periodRaw = (get('period') as Period) || '5y';
  const period: Period = ['5y', '10y', 'all'].includes(periodRaw) ? periodRaw : '5y';

  return { field: validField, countries, period };
}

export function filterToQuery(filter: Partial<Filter>): string {
  const params = new URLSearchParams();
  if (filter.field && filter.field !== 'all') params.set('field', filter.field);
  if (filter.countries && filter.countries.length < COUNTRY_ORDER.length)
    params.set('countries', filter.countries.join(','));
  if (filter.period && filter.period !== '5y') params.set('period', filter.period);
  const s = params.toString();
  return s ? \`?\${s}\` : '';
}

export function applyFilter(filter: Filter, base: Patent[] = PATENTS): Patent[] {
  const start = periodStartYear(filter.period);
  return base.filter((p) => {
    if (filter.field !== 'all' && p.field !== filter.field) return false;
    if (!filter.countries.includes(p.country)) return false;
    if (p.filing_year < start) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// 표본(대표 문헌) 기반 헬퍼 — 실제 표본 문헌을 세는 값만 반환한다.
// ---------------------------------------------------------------------------

export interface CountryDist {
  country: CountryCode;
  label_ko: string;
  color: string;
  count: number;
  share: number;
}

export function countryDistribution(patents: Patent[]): CountryDist[] {
  const total = patents.length || 1;
  return COUNTRY_ORDER.map((code) => {
    const count = patents.filter((p) => p.country === code).length;
    const c = COUNTRIES.find((x) => x.code === code)!;
    return { country: code, label_ko: c.label_ko, color: c.color, count, share: count / total };
  });
}

export interface YearPoint {
  year: number;
  count: number;
}

export function yearlyTrend(patents: Patent[], fromYear?: number): YearPoint[] {
  const start = fromYear ?? Math.min(...patents.map((p) => p.filing_year), CURRENT_YEAR);
  const years: number[] = [];
  for (let y = start; y <= CURRENT_YEAR; y++) years.push(y);
  return years.map((year) => ({
    year,
    count: patents.filter((p) => p.filing_year === year).length,
  }));
}

export function growthRate(patents: Patent[], filter: Filter): number {
  const start = periodStartYear(filter.period) || Math.min(...patents.map((p) => p.filing_year), 2016);
  const span = CURRENT_YEAR - start + 1;
  const half = Math.floor(span / 2) || 1;
  const mid = start + half;
  const prior = patents.filter((p) => p.filing_year >= start && p.filing_year < mid).length;
  const recent = patents.filter((p) => p.filing_year >= mid).length;
  if (prior === 0) return recent > 0 ? 1 : 0;
  return (recent - prior) / prior;
}

export function leadingCountry(patents: Patent[]): CountryCode {
  let best: CountryCode = 'US';
  let bestScore = -1;
  for (const code of COUNTRY_ORDER) {
    const score = patents.filter((p) => p.country === code).length;
    if (score > bestScore) {
      bestScore = score;
      best = code;
    }
  }
  return best;
}

export interface KeywordCount {
  keyword: string;
  count: number;
}

export function risingKeywords(patents: Patent[], limit = 10): KeywordCount[] {
  const recent = patents.filter((p) => p.filing_year >= CURRENT_YEAR - 2);
  const map = new Map<string, number>();
  recent.forEach((p) => p.keywords.forEach((k) => map.set(k, (map.get(k) ?? 0) + 1)));
  return Array.from(map.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export interface TopApplicant {
  id: string;
  name: string;
  country: CountryCode;
  count: number;
}

export function topApplicants(patents: Patent[], limit = 5): TopApplicant[] {
  const map = new Map<string, TopApplicant>();
  patents.forEach((p) => {
    const cur = map.get(p.applicant) ?? { id: p.applicant, name: p.applicantName, country: p.country, count: 0 };
    cur.count += 1;
    map.set(p.applicant, cur);
  });
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, limit);
}

export function topPatents(patents: Patent[], limit = 5): Patent[] {
  return [...patents]
    .sort((a, b) => b.importance_score - a.importance_score || b.filing_year - a.filing_year)
    .slice(0, limit);
}

export function buildInsights(patents: Patent[], _filter: Filter): string[] {
  const dist = countryDistribution(patents).sort((a, b) => b.count - a.count);
  const lead = dist[0];
  const krCount = dist.find((d) => d.country === 'KR')?.count ?? 0;
  const rising = risingKeywords(patents, 3).map((r) => r.keyword);
  return [
    \`표본 내 최다 공개 관할은 \${lead.label_ko}(\${lead.count}건)입니다.\`,
    \`표본 문헌의 매칭 키워드는 \${rising.slice(0, 2).join(', ') || '분야별 핵심 키워드'} 중심입니다.\`,
    \`표본 내 KR 공개 문헌은 \${krCount}건입니다. 실제 권리범위 판단은 원문 청구항 검증 후 수행해야 합니다.\`,
  ];
}

export interface HeatCell {
  field: FieldId;
  country: CountryCode;
  count: number;
  intensity: number;
}

// ---------------------------------------------------------------------------
// 본체(BigQuery 실측 집계) — 최근 10년 우선권 고정 기준. 비례 배분·분할 없음.
// ---------------------------------------------------------------------------

function landscapeCountryDistribution(): CountryDist[] {
  const counts = COUNTRY_ORDER.map((country) => LANDSCAPE_COUNTRIES[country]?.family_count ?? 0);
  const total = counts.reduce((sum, count) => sum + count, 0) || 1;
  return COUNTRY_ORDER.map((country, index) => {
    const c = COUNTRIES.find((item) => item.code === country)!;
    return { country, label_ko: c.label_ko, color: c.color, count: counts[index], share: counts[index] / total };
  });
}

function landscapeLeadingCountry(): CountryCode {
  return [...landscapeCountryDistribution()].sort((a, b) => b.count - a.count)[0]?.country ?? 'US';
}

function landscapeFieldCountryHeatmap(fieldIds?: FieldId[]): HeatCell[] {
  const cells: HeatCell[] = [];
  const targets = fieldIds ? FIELDS.filter((f) => fieldIds.includes(f.id)) : FIELDS;
  for (const field of targets) {
    const rowCounts = COUNTRY_ORDER.map((country) => field.country_family_counts[country] ?? 0);
    const rowMax = Math.max(...rowCounts, 1);
    COUNTRY_ORDER.forEach((country, index) => {
      cells.push({ field: field.id, country, count: rowCounts[index], intensity: rowCounts[index] / rowMax });
    });
  }
  return cells;
}

export interface Summary {
  total_patents: number; // 고유 패밀리, 최근 10년 우선권 기준
  publication_count: number;
  leading_country: CountryCode; // 표시 5개 공개 관할 중 최대
  field_count: number;
  country_distribution: CountryDist[]; // 최근 10년 우선권 · 공개 관할 기준
  yearly_trend: YearPoint[]; // 전체 후보군 연도별 실측 (문헌 행 우선연도 기준)
  field_heatmap: HeatCell[]; // 최근 10년 우선권 실측 country-family counts
  insights: string[];
}

export function getSummary(): Summary {
  const lead = landscapeLeadingCountry();
  const leadName = COUNTRIES.find((country) => country.code === lead)?.label_ko ?? lead;
  const topFields = [...FIELDS].sort((a, b) => b.family_count - a.family_count).slice(0, 3);
  return {
    total_patents: LANDSCAPE_SUMMARY.family_count,
    publication_count: LANDSCAPE_SUMMARY.publication_count,
    leading_country: lead,
    field_count: FIELDS.length,
    country_distribution: landscapeCountryDistribution(),
    yearly_trend: YEARLY_FAMILY_TREND,
    field_heatmap: landscapeFieldCountryHeatmap(),
    insights: [
      \`최근 10년 우선권 기준 고유 패밀리는 \${LANDSCAPE_SUMMARY.family_count.toLocaleString()}개, 공개 문헌은 \${LANDSCAPE_SUMMARY.publication_count.toLocaleString()}건입니다 (\${CANDIDATE_SCOPE_NOTE}).\`,
      \`표시 5개 공개 관할 중 최대 축은 \${leadName}입니다. 공개 관할 기준이므로 출원인 소재국·기술력 순위로 해석하면 안 됩니다.\`,
      \`분야 규모 상위는 \${topFields.map((field) => field.label_ko).join(', ')}입니다. 한 패밀리가 여러 분야에 속할 수 있어 분야 합계는 고유 패밀리 총계보다 큽니다.\`,
    ],
  };
}

export interface FieldAnalysis {
  field: Field;
  one_line: string;
  total: number; // 최근 10년 우선권 기준 패밀리 (실측)
  recent5_family_count: number; // 최근 5년 패밀리 (실측)
  recent3_share: number; // 전체 대비 최근 3년 패밀리 비중 (실측)
  leading_country: CountryCode;
  kr_share: number; // 표시 5개 공개 관할 내 KR 비중 (실측)
  country_distribution: CountryDist[]; // 최근 10년 우선권 기준 실측
  top_applicants: { name: string; count: number }[]; // BigQuery 실측
  subfield_clusters: { subfield: Subfield; count: number }[]; // 표본 문헌 기준
  insights: string[];
  top_patents: Patent[]; // 표본 문헌
}

export function getFieldAnalysis(fieldId: FieldId): FieldAnalysis | null {
  const field = FIELDS.find((f) => f.id === fieldId);
  if (!field) return null;
  const counts = COUNTRY_ORDER.map((country) => field.country_family_counts[country] ?? 0);
  const displayTotal = counts.reduce((sum, count) => sum + count, 0) || 1;
  const dist = COUNTRY_ORDER.map((country, index) => {
    const c = COUNTRIES.find((item) => item.code === country)!;
    return { country, label_ko: c.label_ko, color: c.color, count: counts[index], share: counts[index] / displayTotal };
  });
  const lead = [...dist].sort((a, b) => b.count - a.count)[0]?.country ?? 'US';
  const krShare = dist.find((d) => d.country === 'KR')?.share ?? 0;
  const samplePatents = PATENTS.filter((patent) => patent.field === fieldId);
  const relatedSubfields = SUBFIELDS.filter((subfield) => subfield.field === fieldId);
  const fieldKeywords = field.query_terms.length ? field.query_terms : [field.label_ko];
  const subfield_clusters = relatedSubfields
    .map((subfield) => ({
      subfield,
      count: samplePatents.filter((patent) => patent.subfield === subfield.id).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
  return {
    field,
    one_line: field.report_bullets[0] ?? \`\${field.label_ko} 분야는 최근 10년 우선권 기준 \${field.family_count.toLocaleString()}개 패밀리 규모입니다 (\${CANDIDATE_SCOPE_NOTE}).\`,
    total: field.family_count,
    recent5_family_count: field.recent5_family_count,
    recent3_share: field.recent_momentum,
    leading_country: lead,
    kr_share: krShare,
    country_distribution: dist,
    top_applicants: field.top_applicants.slice(0, 6),
    subfield_clusters,
    insights: [
      ...field.report_bullets.slice(0, 2),
      \`핵심 검색어: \${fieldKeywords.slice(0, 4).join(', ')}.\`,
      ...(field.risk_notes.length ? [field.risk_notes[0]] : []),
    ],
    top_patents: topPatents(samplePatents, 5),
  };
}

export interface CountryProfile {
  country: Country;
  total: number; // 최근 10년 우선권·공개 관할 기준 패밀리 (실측)
  strong_fields: { field: Field; count: number }[]; // 최근 10년 우선권 기준 실측
  top_patents: Patent[]; // 표본 문헌
  vs_korea: string;
}

export function getCountryComparison(): {
  totals: { country: Country; count: number }[];
  heatmap: HeatCell[];
  profiles: CountryProfile[];
} {
  const dist = landscapeCountryDistribution();
  const totals = COUNTRY_ORDER.map((code) => ({
    country: COUNTRIES.find((c) => c.code === code)!,
    count: dist.find((item) => item.country === code)?.count ?? 0,
  }));
  const profiles = COUNTRY_ORDER.map((code) => {
    const country = COUNTRIES.find((c) => c.code === code)!;
    const byField = FIELDS.map((field) => ({ field, count: field.country_family_counts[code] ?? 0 }))
      .sort((a, b) => b.count - a.count);
    const strong = byField.slice(0, 3);
    const lead = strong[0];
    const krLeadCount = lead ? lead.field.country_family_counts.KR ?? 0 : 0;
    const samplePatents = PATENTS.filter((patent) => patent.country === code);
    return {
      country,
      total: totals.find((item) => item.country.code === code)?.count ?? 0,
      strong_fields: strong,
      top_patents: topPatents(samplePatents, 3),
      vs_korea:
        code === 'KR'
          ? '한국(KR) 공개 관할 기준 고유 패밀리 집계입니다. 출원인 소재국 기준이 아니며, 권리범위 판단에는 원문 검증이 필요합니다.'
          : \`\${country.label_ko} 공개 관할의 \${lead?.field.label_ko ?? ''} 패밀리는 \${(lead?.count ?? 0).toLocaleString()}개, 같은 분야 KR 공개 관할은 \${krLeadCount.toLocaleString()}개입니다 (최근 10년 우선권 · 공개 관할 기준).\`,
    };
  });
  return { totals, heatmap: landscapeFieldCountryHeatmap(), profiles };
}

export interface SearchOptions {
  q?: string;
  filter: Filter;
  subfield?: string;
  applicant?: string;
  status?: PatentStatus | 'all';
  sort?: 'recent' | 'importance';
}

export function searchPatents(opts: SearchOptions): Patent[] {
  let result = applyFilter(opts.filter);
  if (opts.subfield) result = result.filter((p) => p.subfield === opts.subfield);
  if (opts.applicant) result = result.filter((p) => p.applicant === opts.applicant);
  if (opts.status && opts.status !== 'all') result = result.filter((p) => p.status === opts.status);
  if (opts.q) {
    const q = opts.q.trim().toLowerCase();
    result = result.filter((p) =>
      \`\${p.title} \${p.abstract_ko} \${p.publication_number} \${p.applicantName} \${p.keywords.join(' ')}\`
        .toLowerCase()
        .includes(q),
    );
  }
  const sort = opts.sort ?? 'recent';
  result.sort((a, b) => {
    if (sort === 'importance') return b.importance_score - a.importance_score;
    return b.filing_year - a.filing_year || b.importance_score - a.importance_score;
  });
  return result;
}

export function getPatent(idOrPub: string): Patent | null {
  return PATENTS.find((p) => p.id === idOrPub || p.publication_number === idOrPub) ?? null;
}

export function similarPatents(patent: Patent, limit = 4): Patent[] {
  return PATENTS.filter((p) => p.id !== patent.id && p.subfield === patent.subfield)
    .sort((a, b) => b.importance_score - a.importance_score)
    .slice(0, limit);
}

export function getSubfield(id: string): Subfield | undefined {
  return SUBFIELDS.find((s) => s.id === id);
}

export function getField(id: FieldId): Field | undefined {
  return FIELDS.find((f) => f.id === id);
}

export function getApplicant(id: string): Applicant | undefined {
  return APPLICANTS.find((a) => a.id === id);
}
`;

fs.writeFileSync(OUT, source, "utf8");
console.log(
  `Synced web data: ${fields.length} fields, ${patents.length} representative patents, ${subfields.length} subfields`,
);
