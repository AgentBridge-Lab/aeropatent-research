#!/usr/bin/env node
// analysis/deepdive_enrichment.json 재생성 (월간 워크플로용).
// 쿼리 정의 원본: sql/07_deepdive_enrichment_queries.sql (Q1 연도추세 / Q2 KR출원인 / Q3 피인용 / Q4 영문제목)
// Tier A 지표(momentum·gap·cr5·region)는 analysis/bq_summary_by_field.json에서 파생 — 이 스크립트보다 먼저 갱신되어야 함.
// 인증: --key <service-account.json> 또는 --token <access-token> (로컬: gcloud auth print-access-token)
import crypto from "node:crypto";
import fs from "node:fs";
import https from "node:https";

function argValue(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function base64url(value) {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return Buffer.from(raw).toString("base64url");
}

function request(method, url, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = body ? (typeof body === "string" ? body : JSON.stringify(body)) : "";
    const req = https.request(
      {
        method,
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function getAccessToken(key) {
  const now = Math.floor(Date.now() / 1000);
  const signingInput = `${base64url({ alg: "RS256", typ: "JWT" })}.${base64url({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/bigquery",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(signingInput), key.private_key)
    .toString("base64url");

  const response = await request("POST", "https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${signature}`,
    }).toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (response.status !== 200) {
    throw new Error(`Token request failed ${response.status}: ${response.body.slice(0, 1200)}`);
  }
  return JSON.parse(response.body).access_token;
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function assertBigQueryOk(parsed, context) {
  if (parsed?.errorResult || (Array.isArray(parsed?.errors) && parsed.errors.length)) {
    const detail = JSON.stringify(parsed.errorResult || parsed.errors, null, 2);
    throw new Error(`${context} returned BigQuery errors: ${detail.slice(0, 2000)}`);
  }
}

function rowsToObjects(parsed) {
  const fields = parsed.schema?.fields || [];
  return (parsed.rows || []).map((row) => {
    const output = {};
    fields.forEach((field, index) => {
      const value = row.f?.[index]?.v;
      output[field.name] = value === null || value === undefined ? null : value;
    });
    return output;
  });
}

async function runQuery({ accessToken, projectId, query, maxBytes, label }) {
  const response = await request(
    "POST",
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      body: {
        query,
        useLegacySql: false,
        location: "US",
        useQueryCache: true,
        timeoutMs: 200000,
        maxResults: 2000,
        maximumBytesBilled: String(maxBytes),
      },
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const parsed = safeJson(response.body);
  if (response.status >= 400) {
    throw new Error(`${label} failed ${response.status}: ${response.body.slice(0, 2000)}`);
  }
  assertBigQueryOk(parsed, label);

  let current = parsed;
  const jobId = parsed.jobReference?.jobId;
  while (!current.jobComplete) {
    const poll = await request(
      "GET",
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries/${jobId}?location=US&maxResults=2000&timeoutMs=200000`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    current = safeJson(poll.body);
    if (poll.status >= 400) throw new Error(`${label} poll failed ${poll.status}: ${poll.body.slice(0, 2000)}`);
    assertBigQueryOk(current, label);
  }

  const rows = rowsToObjects(current);
  let pageToken = current.pageToken;
  while (pageToken) {
    const page = await request(
      "GET",
      `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries/${jobId}?location=US&maxResults=2000&timeoutMs=200000&pageToken=${encodeURIComponent(pageToken)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const parsedPage = safeJson(page.body);
    if (page.status >= 400) throw new Error(`${label} page failed ${page.status}: ${page.body.slice(0, 2000)}`);
    assertBigQueryOk(parsedPage, label);
    rows.push(...rowsToObjects(parsedPage));
    pageToken = parsedPage.pageToken;
  }

  const gib = Number(current.totalBytesProcessed || parsed.totalBytesProcessed || 0) / 1024 ** 3;
  console.log(`${label}: ${rows.length} rows, ${gib.toFixed(1)} GiB processed${current.cacheHit ? " (cache)" : ""}`);
  return rows;
}

const TAX = `WITH field_taxonomy AS (
  SELECT 'space_launch_propulsion_recovery' AS field_id, ['B64G1','F02K9','F02K99'] AS cpc_prefixes
  UNION ALL SELECT 'space_satellite_bus_thermal_power', ['B64G1','H01L31','F28D15']
  UNION ALL SELECT 'space_comm_leo_network', ['H04B7','H04W84','H04L45']
  UNION ALL SELECT 'space_remote_sensing_payload', ['G01S13','G01S7','G01J3']
  UNION ALL SELECT 'space_gnc_rendezvous_servicing', ['B64G1','G05D1','G01C21']
  UNION ALL SELECT 'space_materials_tps_coatings', ['C04B35','C09D5','B32B']
  UNION ALL SELECT 'aviation_propulsion_sustainable', ['B64D27','B64D33','F02C7','F02K3']
  UNION ALL SELECT 'aviation_structures_aero_composites', ['B64C3','B64C21','B64C23','B29C70']
  UNION ALL SELECT 'aviation_avionics_flight_control_autonomy', ['G05D1','B64C13','G08G5','G01C21']
), base AS (
  SELECT publication_number, country_code, family_id, priority_date, assignee_harmonized, cpc
  FROM \`patents-public-data.patents.publications\`
  WHERE priority_date BETWEEN 20160101 AND 20251231
), cand AS (
  SELECT b.*, f.field_id FROM base b CROSS JOIN field_taxonomy f
  WHERE EXISTS (SELECT 1 FROM UNNEST(b.cpc) c JOIN UNNEST(f.cpc_prefixes) p ON STARTS_WITH(c.code, p))
)`;

const Q1 = `${TAX}
SELECT field_id, CAST(FLOOR(priority_date / 10000) AS INT64) AS yr, COUNT(DISTINCT family_id) AS families
FROM cand GROUP BY field_id, yr ORDER BY field_id, yr`;

const Q2 = `${TAX}
SELECT field_id, a.name AS applicant, COUNT(DISTINCT family_id) AS families
FROM cand, UNNEST(assignee_harmonized) a
WHERE cand.country_code = 'KR'
GROUP BY field_id, applicant
QUALIFY ROW_NUMBER() OVER (PARTITION BY field_id ORDER BY families DESC, applicant) <= 8
ORDER BY field_id, families DESC, applicant`;

const Q3 = `${TAX}
SELECT cand.field_id, cand.family_id AS cited_family, MIN(cand.publication_number) AS rep_pub,
       COUNT(DISTINCT citing.family_id) AS citing_families
FROM \`patents-public-data.patents.publications\` citing, UNNEST(citing.citation) ct
JOIN cand ON ct.publication_number = cand.publication_number
WHERE citing.family_id != cand.family_id
GROUP BY field_id, cited_family
QUALIFY ROW_NUMBER() OVER (PARTITION BY field_id ORDER BY citing_families DESC, cited_family) <= 5
ORDER BY field_id, citing_families DESC, cited_family`;

async function main() {
  const projectId = argValue("project", process.env.GOOGLE_CLOUD_PROJECT || "aeropatent-research");
  const keyPath = argValue("key", process.env.GOOGLE_APPLICATION_CREDENTIALS || "");
  const token = argValue("token", "");
  const maxBytes = Number(argValue("max-bytes", "64424509440")); // 60 GiB per query
  const summaryPath = argValue("summary", "analysis/bq_summary_by_field.json");
  const outPath = argValue("out", "analysis/deepdive_enrichment.json");

  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const fieldIds = Object.keys(summary);
  if (fieldIds.length !== 9) throw new Error(`Expected 9 fields in ${summaryPath}, got ${fieldIds.length}`);

  const accessToken = token || (await getAccessToken(JSON.parse(fs.readFileSync(keyPath, "utf8"))));
  const run = (query, label) => runQuery({ accessToken, projectId, query, maxBytes, label });

  const yearly = await run(Q1, "Q1 yearly");
  const krapp = await run(Q2, "Q2 kr-applicants");
  const cited = await run(Q3, "Q3 top-cited");

  if (yearly.length < 80) throw new Error(`Q1 returned only ${yearly.length} rows — refusing to publish.`);
  if (krapp.length < 9) throw new Error(`Q2 returned only ${krapp.length} rows — refusing to publish.`);
  if (cited.length < 27) throw new Error(`Q3 returned only ${cited.length} rows — refusing to publish.`);

  const repPubs = [...new Set(cited.map((r) => r.rep_pub))];
  const Q4 = `SELECT publication_number,
       (SELECT text FROM UNNEST(title_localized) WHERE language = 'en' LIMIT 1) AS title_en
FROM \`patents-public-data.patents.publications\`
WHERE publication_number IN (${repPubs.map((p) => `'${p.replace(/'/g, "")}'`).join(",")})`;
  const titles = new Map((await run(Q4, "Q4 titles")).map((r) => [r.publication_number, r.title_en]));

  const enrich = {
    as_of_query: new Date().toISOString().slice(0, 10),
    priority_window: [2016, 2025],
    fields: {},
  };
  for (const fid of fieldIds) {
    const e = summary[fid];
    const top5 = e.topApplicants.slice(0, 5).reduce((sum, a) => sum + a.count, 0);
    enrich.fields[fid] = {
      label_ko: e.labelKo,
      momentum_recent3_share: e.recentMomentum,
      korea_publication_gap_score: e.koreaPublicationGapOpportunityScore,
      korea_assignee_gap_score: e.koreaAssigneeGapOpportunityScore,
      cr5: Number((top5 / e.familyCount).toFixed(4)),
      region_family_counts: e.regionFamilyCounts || {},
      yearly_families: Object.fromEntries(
        yearly.filter((r) => r.field_id === fid).map((r) => [r.yr, Number(r.families)]),
      ),
      kr_top_applicants: krapp
        .filter((r) => r.field_id === fid)
        .map((r) => ({ name: r.applicant, families: Number(r.families) })),
      top_cited: cited
        .filter((r) => r.field_id === fid)
        .map((r) => ({
          family_id: r.cited_family,
          rep_pub: r.rep_pub,
          citing_families: Number(r.citing_families),
          title_en: titles.get(r.rep_pub) ?? null,
          gp_url: `https://patents.google.com/patent/${r.rep_pub.replace(/-/g, "")}`,
        })),
    };
  }

  for (const [fid, f] of Object.entries(enrich.fields)) {
    if (Object.keys(f.yearly_families).length < 8) throw new Error(`${fid}: yearly_families too sparse`);
    if (!f.top_cited.length) throw new Error(`${fid}: top_cited empty`);
  }

  fs.writeFileSync(outPath, JSON.stringify(enrich, null, 1) + "\n");
  console.log(`Wrote ${outPath} (as_of ${enrich.as_of_query}, ${fieldIds.length} fields)`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
