import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_INPUT = path.join(ROOT, "raw", "bigquery", "bq_candidates_latest.jsonl");
const DEFAULT_SITE_OUTPUT = path.resolve(ROOT, "..", "aerospace-patent-intel-demo", "data", "production_landscape.json");
const DEFAULT_ANALYSIS_DIR = path.join(ROOT, "analysis");
const DEFAULT_REPORTS_DIR = path.join(ROOT, "reports");
const ANALYSIS_TIME_ZONE = process.env.AEROPATENT_TIME_ZONE || "Asia/Seoul";

const DISPLAY_COUNTRIES = ["US", "EP", "CN", "JP", "KR"];
const FIELD_LABELS_KO = {
  space_launch_propulsion_recovery: "발사체 추진·회수",
  space_satellite_bus_thermal_power: "위성 플랫폼·열제어·전력",
  space_comm_leo_network: "위성통신·LEO 네트워크",
  space_remote_sensing_payload: "SAR·원격탐사 페이로드",
  space_gnc_rendezvous_servicing: "GNC·랑데부·온오빗 서비스",
  space_materials_tps_coatings: "우주재료·TPS·코팅",
  aviation_propulsion_sustainable: "민간항공 추진·전기·수소·SAF",
  aviation_structures_aero_composites: "항공 구조·복합재·공력",
  aviation_avionics_flight_control_autonomy: "항전·비행제어·자율비행",
};
const FIELD_SHORT_LABELS_KO = {
  space_launch_propulsion_recovery: "발사체",
  space_satellite_bus_thermal_power: "위성 플랫폼",
  space_comm_leo_network: "위성통신",
  space_remote_sensing_payload: "SAR 페이로드",
  space_gnc_rendezvous_servicing: "GNC",
  space_materials_tps_coatings: "재료·TPS",
  aviation_propulsion_sustainable: "항공 추진",
  aviation_structures_aero_composites: "항공 구조",
  aviation_avionics_flight_control_autonomy: "항전·자율",
};
const COUNTRY_LABELS_KO = {
  US: "미국",
  EP: "유럽특허청",
  CN: "중국",
  JP: "일본",
  KR: "한국",
  WO: "PCT",
};
const REGION_LABELS_KO = {
  NORTH_AMERICA: "북미",
  EUROPE: "유럽",
  EAST_ASIA: "동아시아",
  SOUTH_ASIA: "남아시아",
  MIDDLE_EAST: "중동",
  OCEANIA: "오세아니아",
  LATIN_AMERICA: "중남미",
  AFRICA: "아프리카",
  INTERNATIONAL: "국제공개",
  OTHER_WORLD: "기타",
};

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function* readJsonl(filePath) {
  const input = fs.createReadStream(filePath, { encoding: "utf8" });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      yield JSON.parse(trimmed);
    } catch (error) {
      throw new Error(`Invalid JSONL at ${sourcePath(filePath)}:${lineNumber}: ${error.message}`);
    }
  }
}

function yearFromDate(value) {
  const numeric = Number(value);
  if (!numeric || numeric <= 0) return null;
  return Math.floor(numeric / 10000);
}

function dateIntInTimeZone(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return parts.year * 10000 + parts.month * 100 + parts.day;
}

function addYearsToDateInt(dateInt, years) {
  const year = Math.floor(dateInt / 10000) + years;
  const month = Math.floor((dateInt % 10000) / 100);
  const day = dateInt % 100;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return year * 10000 + month * 100 + Math.min(day, lastDay);
}

function dateOnOrAfter(value, threshold) {
  const numeric = Number(value);
  return Boolean(numeric && numeric >= threshold);
}

function familyKey(row) {
  return row.family_id || `publication:${row.publication_number}`;
}

function inc(map, key, amount = 1) {
  map[key] = (map[key] || 0) + amount;
}

function addSetMember(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

function topEntries(counter, limit = 10) {
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function topSetEntries(counter, limit = 10) {
  return [...counter.entries()]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, set]) => ({ key, count: set.size }));
}

function sourcePath(filePath) {
  const absolute = path.resolve(filePath);
  const relative = path.relative(ROOT, absolute);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.replace(/\\/g, "/");
  }
  return path.basename(absolute);
}

function ensureMapValue(map, key, factory) {
  if (!map.has(key)) map.set(key, factory());
  return map.get(key);
}

function baseAggregate() {
  return {
    families: new Set(),
    publications: new Set(),
    recent5Families: new Set(),
  };
}

function fieldAggregate() {
  return {
    ...baseAggregate(),
    recent3Families: new Set(),
    krPublicationRecent5Families: new Set(),
    krAssigneeRecent5Families: new Set(),
  };
}

function regionAggregate() {
  return {
    ...baseAggregate(),
    publicationCountries: new Set(),
  };
}

function addPublication(set, publicationNumber) {
  if (publicationNumber) set.add(publicationNumber);
}

function buildRegionLookup(strategy) {
  const lookup = new Map();
  for (const region of strategy.region_groups || []) {
    for (const code of region.country_codes || []) lookup.set(code, region.id);
  }
  return lookup;
}

function periodBucket(priorityYear) {
  if (!priorityYear) return "unknown";
  if (priorityYear < 2020) return "pre_2020";
  if (priorityYear < 2023) return "2020_2022";
  if (priorityYear < 2026) return "2023_2025";
  return "2026_plus";
}

function fieldColor(index) {
  return ["#70e4ff", "#8df0b0", "#ffd36f", "#ffae72", "#ff7b99", "#a891ff", "#00c2a8", "#6aa6ff", "#c084fc"][
    index % 9
  ];
}

async function main() {
  const input = argValue("--input", DEFAULT_INPUT);
  const siteOutput = argValue("--site-output", DEFAULT_SITE_OUTPUT);
  const analysisDir = argValue("--analysis-dir", DEFAULT_ANALYSIS_DIR);
  const reportsDir = argValue("--reports-dir", DEFAULT_REPORTS_DIR);
  const taxonomy = loadJson(path.join(ROOT, "config", "bigquery_aerospace_aviation_taxonomy.json"));
  const regionStrategy = loadJson(path.join(ROOT, "config", "country_region_strategy.json"));
  const regionLookup = buildRegionLookup(regionStrategy);
  const fields = taxonomy.fields || [];
  const now = new Date();
  const analysisDate = dateIntInTimeZone(now, ANALYSIS_TIME_ZONE);
  const currentYear = Math.floor(analysisDate / 10000);
  const recent5StartDate = addYearsToDateInt(analysisDate, -5);
  const recent3StartDate = addYearsToDateInt(analysisDate, -3);

  let rowCount = 0;
  const globalFamilySet = new Set();
  const publicationSet = new Set();
  const fieldAggregates = new Map();
  const countryAggregates = new Map();
  const regionAggregates = new Map();
  const yearFamilySets = new Map();
  const periodFamilySets = new Map();
  const fieldCountryFamilySets = new Map();
  const fieldRegionFamilySets = new Map();
  const fieldYearFamilySets = new Map();
  const fieldApplicantFamilySets = new Map();
  const cpcFieldCounters = new Map();

  for await (const row of readJsonl(input)) {
    rowCount += 1;
    const fieldId = row.field_id || "unknown";
    const country = row.publication_country_code || "UNKNOWN";
    const family = familyKey(row);
    const priorityYear = yearFromDate(row.priority_date);
    const region = regionLookup.get(country) || "OTHER_WORLD";
    const isRecent5 = dateOnOrAfter(row.priority_date, recent5StartDate);
    const isRecent3 = dateOnOrAfter(row.priority_date, recent3StartDate);

    globalFamilySet.add(family);
    addPublication(publicationSet, row.publication_number);

    const fieldAgg = ensureMapValue(fieldAggregates, fieldId, fieldAggregate);
    fieldAgg.families.add(family);
    addPublication(fieldAgg.publications, row.publication_number);
    if (isRecent5) fieldAgg.recent5Families.add(family);
    if (isRecent3) fieldAgg.recent3Families.add(family);
    if (country === "KR" && isRecent5) fieldAgg.krPublicationRecent5Families.add(family);
    if ((row.assignee_country_codes || []).includes("KR") && isRecent5) fieldAgg.krAssigneeRecent5Families.add(family);

    const countryAgg = ensureMapValue(countryAggregates, country, baseAggregate);
    countryAgg.families.add(family);
    addPublication(countryAgg.publications, row.publication_number);
    if (isRecent5) countryAgg.recent5Families.add(family);

    const regionAgg = ensureMapValue(regionAggregates, region, regionAggregate);
    regionAgg.families.add(family);
    addPublication(regionAgg.publications, row.publication_number);
    regionAgg.publicationCountries.add(country);
    if (isRecent5) regionAgg.recent5Families.add(family);

    if (priorityYear) addSetMember(yearFamilySets, String(priorityYear), family);
    addSetMember(periodFamilySets, periodBucket(priorityYear), family);

    const fcKey = `${fieldId}::${country}`;
    if (!fieldCountryFamilySets.has(fcKey)) fieldCountryFamilySets.set(fcKey, new Set());
    fieldCountryFamilySets.get(fcKey).add(family);

    const frKey = `${fieldId}::${region}`;
    if (!fieldRegionFamilySets.has(frKey)) fieldRegionFamilySets.set(frKey, new Set());
    fieldRegionFamilySets.get(frKey).add(family);

    if (priorityYear) {
      const fyKey = `${fieldId}::${priorityYear}`;
      if (!fieldYearFamilySets.has(fyKey)) fieldYearFamilySets.set(fyKey, new Set());
      fieldYearFamilySets.get(fyKey).add(family);
    }

    if (!fieldApplicantFamilySets.has(fieldId)) fieldApplicantFamilySets.set(fieldId, new Map());
    const applicantFamilySets = fieldApplicantFamilySets.get(fieldId);
    const uniqueApplicants = new Set((row.assignees || []).map((assignee) => assignee?.name).filter(Boolean));
    for (const applicant of uniqueApplicants) addSetMember(applicantFamilySets, applicant, family);

    if (!cpcFieldCounters.has(fieldId)) cpcFieldCounters.set(fieldId, {});
    const cpcCounter = cpcFieldCounters.get(fieldId);
    for (const code of row.cpc_codes || []) {
      if (code) inc(cpcCounter, code.split("/")[0] || code);
    }
  }

  if (!rowCount) throw new Error(`No rows found in ${sourcePath(input)}`);

  const fieldSummaries = fields.map((field, index) => {
    const fieldId = field.id;
    const aggregate = fieldAggregates.get(fieldId) || fieldAggregate();
    const families = aggregate.families.size;
    const publications = aggregate.publications.size;
    const recent5Families = aggregate.recent5Families.size;
    const recent3Families = aggregate.recent3Families.size;
    const countryCounts = {};
    const regionCounts = {};
    for (const [key, set] of fieldCountryFamilySets) {
      const [candidateField, country] = key.split("::");
      if (candidateField === fieldId) countryCounts[country] = set.size;
    }
    for (const [key, set] of fieldRegionFamilySets) {
      const [candidateField, region] = key.split("::");
      if (candidateField === fieldId) regionCounts[region] = set.size;
    }
    const krPublicationRecent5Families = aggregate.krPublicationRecent5Families.size;
    const krAssigneeRecent5Families = aggregate.krAssigneeRecent5Families.size;
    const momentum = families ? recent3Families / families : 0;
    const krPublicationRecentShare = recent5Families ? krPublicationRecent5Families / recent5Families : 0;
    const krAssigneeRecentShare = recent5Families ? krAssigneeRecent5Families / recent5Families : 0;

    return {
      id: fieldId,
      domain: field.domain,
      labelKo: FIELD_LABELS_KO[fieldId] || field.label_en || fieldId,
      shortLabelKo: FIELD_SHORT_LABELS_KO[fieldId] || FIELD_LABELS_KO[fieldId] || fieldId,
      labelEn: field.label_en || fieldId,
      color: field.visual_color || fieldColor(index),
      familyCount: families,
      publicationCount: publications,
      recent5FamilyCount: recent5Families,
      recent3FamilyCount: recent3Families,
      recentMomentum: Number(momentum.toFixed(4)),
      countryFamilyCounts: countryCounts,
      regionFamilyCounts: regionCounts,
      topApplicants: topSetEntries(fieldApplicantFamilySets.get(fieldId) || new Map(), 8),
      topCpcCodes: topEntries(cpcFieldCounters.get(fieldId) || {}, 10),
      koreaPublicationGapOpportunityScore: Number((momentum * (1 - krPublicationRecentShare)).toFixed(4)),
      koreaAssigneeGapOpportunityScore: Number((momentum * (1 - krAssigneeRecentShare)).toFixed(4)),
    };
  });

  const countrySummaries = [...countryAggregates.entries()]
    .map(([country, aggregate]) => ({
      country,
      labelKo: COUNTRY_LABELS_KO[country] || country,
      familyCount: aggregate.families.size,
      publicationCount: aggregate.publications.size,
      recent5FamilyCount: aggregate.recent5Families.size,
    }))
    .sort((a, b) => b.familyCount - a.familyCount || a.country.localeCompare(b.country));

  const regionSummaries = [...regionAggregates.entries()]
    .map(([region, aggregate]) => ({
      region,
      labelKo: REGION_LABELS_KO[region] || region,
      familyCount: aggregate.families.size,
      publicationCount: aggregate.publications.size,
      publicationCountryCount: aggregate.publicationCountries.size,
      recent5FamilyCount: aggregate.recent5Families.size,
    }))
    .sort((a, b) => b.familyCount - a.familyCount || a.region.localeCompare(b.region));

  const topFields = [...fieldSummaries].sort((a, b) => b.familyCount - a.familyCount);
  const fastestFields = [...fieldSummaries].sort((a, b) => b.recentMomentum - a.recentMomentum);
  const opportunityFields = [...fieldSummaries].sort(
    (a, b) => b.koreaPublicationGapOpportunityScore - a.koreaPublicationGapOpportunityScore,
  );

  const reportCards = fieldSummaries.map((field) => ({
    id: `bq-field:${field.id}`,
    type: "field_summary",
    title: field.labelKo,
    metric: field.familyCount,
    metricLabel: "family",
    description: `${field.labelKo} 분야는 최근 10년 우선권 기준 ${field.familyCount.toLocaleString()}개 패밀리, ${field.publicationCount.toLocaleString()}개 공개문헌이 수집되었습니다. 최근 5년 패밀리는 ${field.recent5FamilyCount.toLocaleString()}개입니다.`,
    countryFamilyCounts: field.countryFamilyCounts,
    regionFamilyCounts: field.regionFamilyCounts,
    topApplicants: field.topApplicants,
    topCpcCodes: field.topCpcCodes,
    graphFocusNode: `field:${field.id}`,
  }));

  const landscape = {
    schemaVersion: "aeropatent.bigquery.landscape.v1",
    generatedAt: new Date().toISOString(),
    source: {
      input: sourcePath(input),
      basis: "Google Patents BigQuery public dataset, CPC-first 10-year priority-date candidate collection",
      collectionType: "metadata_first_pass",
      dateBasis: "priority_date",
      note: "Counts are deduplicated by family_id where family metrics are shown. Publication metrics are separate.",
    },
    summary: {
      rowCount,
      publicationCount: publicationSet.size,
      familyCount: globalFamilySet.size,
      fieldCount: fields.length,
      publicationCountryCount: countrySummaries.length,
      displayCountries: DISPLAY_COUNTRIES,
      analysisTimeZone: ANALYSIS_TIME_ZONE,
      analysisDate,
      currentYear,
      recent5StartYear: Math.floor(recent5StartDate / 10000),
      recent3StartYear: Math.floor(recent3StartDate / 10000),
      recent5StartDate,
      recent3StartDate,
      topField: topFields[0],
      fastestRecentMomentumField: fastestFields[0],
      topKoreaOpportunityField: opportunityFields[0],
    },
    fields: fieldSummaries,
    countries: countrySummaries,
    regions: regionSummaries,
    yearlyFamilyTrend: Object.fromEntries(
      [...yearFamilySets.keys()]
        .sort()
        .map((year) => [year, yearFamilySets.get(year).size]),
    ),
    periodBuckets: Object.fromEntries(
      ["pre_2020", "2020_2022", "2023_2025", "2026_plus", "unknown"]
        .filter((bucket) => periodFamilySets.has(bucket))
        .map((bucket) => [bucket, periodFamilySets.get(bucket).size]),
    ),
    reportCards,
    dashboard: {
      majorCountries: DISPLAY_COUNTRIES.map((country) => countrySummaries.find((item) => item.country === country)).filter(Boolean),
      topCountries: countrySummaries.slice(0, 12),
      topRegions: regionSummaries.slice(0, 8),
      topFields: topFields.slice(0, 9),
      opportunityFields: opportunityFields.slice(0, 6),
    },
  };

  fs.mkdirSync(analysisDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(path.dirname(siteOutput), { recursive: true });

  writeJson(path.join(analysisDir, "bq_collection_summary.json"), landscape.summary);
  writeJson(path.join(analysisDir, "bq_summary_by_field.json"), Object.fromEntries(fieldSummaries.map((field) => [field.id, field])));
  writeJson(path.join(analysisDir, "bq_summary_by_country.json"), Object.fromEntries(countrySummaries.map((country) => [country.country, country])));
  writeJson(path.join(analysisDir, "bq_summary_by_region.json"), Object.fromEntries(regionSummaries.map((region) => [region.region, region])));
  writeJson(path.join(analysisDir, "bq_yearly_family_trends.json"), landscape.yearlyFamilyTrend);
  writeJson(path.join(analysisDir, "bq_period_buckets.json"), landscape.periodBuckets);
  writeJson(path.join(analysisDir, "bq_opportunity_scores.json"), opportunityFields);
  writeJson(path.join(reportsDir, "bq_site_report_cards.json"), reportCards);
  writeJson(siteOutput, landscape);
  writeReport(path.join(reportsDir, "bq_landscape_report_ko.md"), landscape);

  console.log(
    JSON.stringify(
      {
        input: sourcePath(input),
        rowCount,
        familyCount: globalFamilySet.size,
        publicationCount: publicationSet.size,
        fieldCount: fields.length,
        publicationCountryCount: countrySummaries.length,
        siteOutput: sourcePath(siteOutput),
      },
      null,
      2,
    ),
  );
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeReport(filePath, landscape) {
  const summary = landscape.summary;
  const topFields = landscape.dashboard.topFields
    .slice(0, 6)
    .map(
      (field, index) =>
        `${index + 1}. ${field.labelKo}: ${field.familyCount.toLocaleString()} families, recent5 ${field.recent5FamilyCount.toLocaleString()}, momentum ${field.recentMomentum}`,
    )
    .join("\n");
  const topCountries = landscape.dashboard.topCountries
    .slice(0, 10)
    .map(
      (country, index) =>
        `${index + 1}. ${country.labelKo}(${country.country}): ${country.familyCount.toLocaleString()} families / ${country.publicationCount.toLocaleString()} publications`,
    )
    .join("\n");
  const opportunities = landscape.dashboard.opportunityFields
    .map(
      (field, index) =>
        `${index + 1}. ${field.labelKo}: publication gap score ${field.koreaPublicationGapOpportunityScore}, assignee gap score ${field.koreaAssigneeGapOpportunityScore}`,
    )
    .join("\n");

  const report = `# BigQuery 항공우주·항공 특허 본수집 리포트

생성시각: ${landscape.generatedAt}

## 수집 범위

- 원천: Google Patents BigQuery public dataset
- 수집 방식: CPC-first 후보 수집
- 기간 기준: 최근 10년 priority_date
- 수집 row: ${summary.rowCount.toLocaleString()} rows
- 공개문헌: ${summary.publicationCount.toLocaleString()} publications
- 패밀리: ${summary.familyCount.toLocaleString()} families
- 분야: ${summary.fieldCount} fields
- 공개국가/관할: ${summary.publicationCountryCount} codes

## 핵심 분야

${topFields}

## 주요 공개국가

${topCountries}

## 한국 연구기획/사업개발 기회 후보

${opportunities}

## 사용상 주의

이 리포트는 metadata-first landscape입니다. 법적 권리상태, FTO, 침해/무효 판단은 포함하지 않습니다.
제안서나 사업개발 문서에 넣을 때는 대표 패밀리의 원문, 청구항, 법적 상태를 별도 검토해야 합니다.
`;
  fs.writeFileSync(filePath, report, "utf8");
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
