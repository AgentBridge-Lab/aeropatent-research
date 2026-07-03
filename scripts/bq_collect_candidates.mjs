import crypto from "node:crypto";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || "aeropatent-research";
const DEFAULT_KEY_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const DEFAULT_SQL = path.join(ROOT, "sql", "01a_candidate_10y_cpc_first_production.sql");
const DEFAULT_OUT_DIR = path.join(ROOT, "raw", "bigquery");
const SAFE_INTEGER_FIELDS = new Set(["publication_date", "priority_date", "grant_date", "cpc_hit"]);

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function sourcePath(filePath) {
  const absolute = path.resolve(filePath);
  const relative = path.relative(ROOT, absolute);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.replace(/\\/g, "/");
  }
  return path.basename(absolute);
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

async function postQuery({ accessToken, projectId, query, dryRun, maxBytes, maxResults, timeoutMs }) {
  const response = await request(
    "POST",
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    {
      body: {
        query,
        useLegacySql: false,
        location: "US",
        dryRun,
        useQueryCache: true,
        timeoutMs,
        maxResults,
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
    throw new Error(`BigQuery query failed ${response.status}: ${response.body.slice(0, 2000)}`);
  }
  assertBigQueryOk(parsed, "BigQuery query");
  return parsed;
}

async function getQueryResults({ accessToken, projectId, jobId, pageToken, maxResults, timeoutMs }) {
  const url = new URL(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries/${jobId}`,
  );
  url.searchParams.set("location", "US");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("timeoutMs", String(timeoutMs));
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const response = await request("GET", url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const parsed = safeJson(response.body);
  if (response.status >= 400) {
    throw new Error(`BigQuery getQueryResults failed ${response.status}: ${response.body.slice(0, 2000)}`);
  }
  assertBigQueryOk(parsed, "BigQuery getQueryResults");
  return parsed;
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

function summarizeJob(parsed, dryRun) {
  const bytesProcessed = Number(parsed.totalBytesProcessed || parsed.totalBytesBilled || 0);
  const bytesBilled = Number(parsed.totalBytesBilled || 0);
  return {
    dryRun,
    jobComplete: parsed.jobComplete,
    totalRows: parsed.totalRows ? Number(parsed.totalRows) : 0,
    totalBytesProcessed: bytesProcessed,
    totalBytesBilled: bytesBilled,
    totalGiBProcessed: Number((bytesProcessed / 1024 ** 3).toFixed(4)),
    totalGiBBilled: Number((bytesBilled / 1024 ** 3).toFixed(4)),
    cacheHit: parsed.cacheHit,
    jobReference: parsed.jobReference,
    errors: parsed.errors,
    schema: parsed.schema,
  };
}

function scalar(value, field) {
  if (value === null || value === undefined) return null;
  const type = field?.type;
  const name = field?.name;
  if (["INTEGER", "INT64"].includes(type)) {
    return SAFE_INTEGER_FIELDS.has(name) ? Number(value) : String(value);
  }
  if (["FLOAT", "FLOAT64"].includes(type)) return Number(value);
  if (["NUMERIC", "BIGNUMERIC"].includes(type)) return String(value);
  if (["BOOLEAN", "BOOL"].includes(type)) return value === true || value === "true";
  return value;
}

function cellToValue(cell, field) {
  const value = cell?.v;
  if (field.mode === "REPEATED") {
    if (!Array.isArray(value)) return [];
    return value.map((item) => {
      if (field.type === "RECORD" || field.type === "STRUCT") {
        return rowToObject(item.v, field.fields || []);
      }
      return scalar(item.v, field);
    });
  }
  if (field.type === "RECORD" || field.type === "STRUCT") {
    return rowToObject(value, field.fields || []);
  }
  return scalar(value, field);
}

function rowToObject(rowLike, fields) {
  const cells = Array.isArray(rowLike?.f) ? rowLike.f : Array.isArray(rowLike) ? rowLike : [];
  const output = {};
  fields.forEach((field, index) => {
    output[field.name] = cellToValue(cells[index], field);
  });
  return output;
}

function waitForDrain(stream) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      stream.off("drain", onDrain);
      stream.off("error", onError);
    };
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    stream.once("drain", onDrain);
    stream.once("error", onError);
  });
}

async function writeRows({ accessToken, projectId, initial, outPath, pageSize, rowLimit, timeoutMs }) {
  const schema = initial.schema?.fields || [];
  const jobId = initial.jobReference?.jobId;
  if (!jobId) throw new Error("BigQuery response did not include jobReference.jobId");

  const tempPath = `${outPath}.tmp`;
  const stream = fs.createWriteStream(tempPath, { encoding: "utf8" });
  let streamError = null;
  stream.on("error", (error) => {
    streamError = error;
  });
  let pageToken = initial.pageToken;
  let rowsWritten = 0;
  let pages = 0;

  const writeLine = async (line) => {
    if (streamError) throw streamError;
    if (!stream.write(line)) {
      await waitForDrain(stream);
    }
    if (streamError) throw streamError;
  };

  const writePage = async (rows = []) => {
    pages += 1;
    for (const row of rows) {
      if (rowLimit && rowsWritten >= rowLimit) break;
      await writeLine(`${JSON.stringify(rowToObject(row, schema))}\n`);
      rowsWritten += 1;
    }
  };

  try {
    await writePage(initial.rows || []);

    while ((!rowLimit || rowsWritten < rowLimit) && pageToken) {
      const page = await getQueryResults({
        accessToken,
        projectId,
        jobId,
        pageToken,
        maxResults: pageSize,
        timeoutMs,
      });
      await writePage(page.rows || []);
      pageToken = page.pageToken;
      if (pages % 10 === 0) {
        console.error(`Fetched ${rowsWritten} rows across ${pages} pages...`);
      }
    }

    await new Promise((resolve, reject) => {
      stream.once("error", reject);
      stream.end(resolve);
    });
    fs.renameSync(tempPath, outPath);
    return { rowsWritten, pages };
  } catch (error) {
    stream.destroy();
    try {
      fs.unlinkSync(tempPath);
    } catch {}
    throw error;
  }
}

async function main() {
  const projectId = argValue("--project", DEFAULT_PROJECT_ID);
  const keyPath = argValue("--key", DEFAULT_KEY_PATH);
  const sqlPath = argValue("--file", DEFAULT_SQL);
  const outDir = argValue("--out-dir", DEFAULT_OUT_DIR);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const outPath = argValue("--out", path.join(outDir, `bq_candidates_${stamp}.jsonl`));
  const manifestPath = argValue("--manifest", outPath.replace(/\.jsonl$/, ".manifest.json"));
  const maxBytes = Number(argValue("--max-bytes", process.env.BQ_MAX_BYTES || 32212254720));
  const pageSize = Number(argValue("--page-size", process.env.BQ_PAGE_SIZE || 10000));
  const rowLimit = Number(argValue("--row-limit", process.env.BQ_ROW_LIMIT || 0));
  const timeoutMs = Number(argValue("--timeout-ms", process.env.BQ_TIMEOUT_MS || 200000));
  const run = hasArg("--run");
  const writeLatest = !hasArg("--no-latest");

  if (rowLimit && writeLatest) {
    throw new Error("Refusing to update bq_candidates_latest.jsonl while --row-limit is set. Remove --row-limit or pass --no-latest.");
  }

  const query = fs.readFileSync(sqlPath, "utf8");
  const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  const accessToken = await getAccessToken(key);

  fs.mkdirSync(outDir, { recursive: true });

  const dryRunResult = await postQuery({
    accessToken,
    projectId,
    query,
    dryRun: true,
    maxBytes,
    maxResults: 0,
    timeoutMs,
  });
  const dryRunSummary = summarizeJob(dryRunResult, true);

  if (dryRunSummary.totalBytesProcessed > maxBytes) {
    throw new Error(
      `Dry-run estimate ${dryRunSummary.totalBytesProcessed} exceeds maxBytes ${maxBytes}.`,
    );
  }

  if (!run) {
    const manifest = {
      generatedAt: new Date().toISOString(),
      mode: "dry-run-only",
      projectId,
      sqlPath: sourcePath(sqlPath),
      maxBytes,
      dryRun: dryRunSummary,
    };
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(manifest, null, 2));
    return;
  }

  const startedAt = new Date().toISOString();
  const initial = await postQuery({
    accessToken,
    projectId,
    query,
    dryRun: false,
    maxBytes,
    maxResults: pageSize,
    timeoutMs,
  });

  let complete = initial;
  while (!complete.jobComplete) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    complete = await getQueryResults({
      accessToken,
      projectId,
      jobId: initial.jobReference.jobId,
      maxResults: pageSize,
      timeoutMs,
    });
  }

  const runSummary = summarizeJob(complete, false);
  const written = await writeRows({
    accessToken,
    projectId,
    initial: complete,
    outPath,
    pageSize,
    rowLimit,
    timeoutMs,
  });

  const expectedRows = Number(runSummary.totalRows || 0);
  const expectedWritten = rowLimit && expectedRows ? Math.min(rowLimit, expectedRows) : expectedRows;
  if (expectedWritten && written.rowsWritten !== expectedWritten) {
    throw new Error(
      `Row completeness check failed: wrote ${written.rowsWritten} rows, expected ${expectedWritten} from BigQuery totalRows ${expectedRows}.`,
    );
  }

  const latestPath = path.join(outDir, "bq_candidates_latest.jsonl");
  if (writeLatest) fs.copyFileSync(outPath, latestPath);

  const manifest = {
    generatedAt: new Date().toISOString(),
    startedAt,
    completedAt: new Date().toISOString(),
    mode: "run",
    projectId,
    sqlPath: sourcePath(sqlPath),
    outPath: sourcePath(outPath),
    latestPath: writeLatest ? sourcePath(latestPath) : null,
    manifestPath: sourcePath(manifestPath),
    maxBytes,
    pageSize,
    rowLimit: rowLimit || null,
    dryRun: dryRunSummary,
    run: runSummary,
    ...written,
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  if (writeLatest) {
    fs.writeFileSync(path.join(outDir, "bq_candidates_latest.manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  }
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
