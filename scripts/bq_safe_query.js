const fs = require("fs");
const crypto = require("crypto");
const https = require("https");

const projectId = process.env.GOOGLE_CLOUD_PROJECT || "aeropatent-research";
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function base64url(value) {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  return Buffer.from(raw).toString("base64url");
}

function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        method: "POST",
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers: {
          "Content-Length": Buffer.byteLength(body),
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
    req.write(body);
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

  const tokenResponse = await post(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${signature}`,
    }).toString(),
    { "Content-Type": "application/x-www-form-urlencoded" },
  );

  if (tokenResponse.status !== 200) {
    throw new Error(`Token request failed ${tokenResponse.status}: ${tokenResponse.body}`);
  }
  return JSON.parse(tokenResponse.body).access_token;
}

function readQuery() {
  const file = argValue("--file", null);
  if (file) return fs.readFileSync(file, "utf8");
  const queryArg = argValue("--query", null);
  if (queryArg) return queryArg;
  const rest = process.argv.slice(2).filter((value, idx, arr) => {
    const prev = arr[idx - 1];
    return !value.startsWith("--") && !["--file", "--query", "--max-bytes", "--out"].includes(prev);
  });
  if (rest.length) return rest.join(" ");
  throw new Error("Provide --file path.sql or --query \"SELECT ...\"");
}

async function queryBigQuery(accessToken, query, options) {
  const body = {
    query,
    useLegacySql: false,
    timeoutMs: 30000,
    location: "US",
    dryRun: options.dryRun,
    useQueryCache: true,
    maxResults: options.maxResults,
    maximumBytesBilled: String(options.maxBytes),
  };

  return post(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    JSON.stringify(body),
    {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  );
}

function summarize(response, dryRun) {
  const parsed = JSON.parse(response.body);
  const bytesProcessed = Number(parsed.totalBytesProcessed || parsed.totalBytesBilled || 0);
  const bytesBilled = Number(parsed.totalBytesBilled || 0);
  return {
    status: response.status,
    dryRun,
    jobComplete: parsed.jobComplete,
    totalRows: parsed.totalRows || "0",
    totalBytesProcessed: bytesProcessed,
    totalBytesBilled: bytesBilled,
    totalGiBProcessed: Number((bytesProcessed / 1024 ** 3).toFixed(4)),
    totalGiBBilled: Number((bytesBilled / 1024 ** 3).toFixed(4)),
    cacheHit: parsed.cacheHit,
    jobReference: parsed.jobReference,
    errors: parsed.errors,
    error: parsed.error,
    rawError: response.status >= 400 ? response.body.slice(0, 2000) : undefined,
    rows: parsed.rows,
    schema: parsed.schema,
  };
}

async function main() {
  const query = readQuery();
  const dryRun = !hasArg("--run");
  const defaultMax = dryRun ? 10 * 1024 ** 3 : 2 * 1024 ** 3;
  const maxBytes = Number(argValue("--max-bytes", process.env.BQ_MAX_BYTES || defaultMax));
  const maxResults = Number(argValue("--max-results", process.env.BQ_MAX_RESULTS || 100));
  const outPath = argValue("--out", null);

  const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  const accessToken = await getAccessToken(key);
  const response = await queryBigQuery(accessToken, query, { dryRun, maxBytes, maxResults });

  let result;
  try {
    result = summarize(response, dryRun);
  } catch {
    result = { status: response.status, raw: response.body.slice(0, 2000) };
  }

  const text = JSON.stringify(
    {
      projectId,
      keyFile: keyPath,
      mode: dryRun ? "dry-run" : "run",
      maxBytes,
      result,
    },
    null,
    2,
  );

  if (outPath) fs.writeFileSync(outPath, text + "\n", "utf8");
  console.log(text);

  if (response.status >= 400) process.exit(1);
  if (
    dryRun &&
    result.totalBytesProcessed &&
    result.totalBytesProcessed > maxBytes
  ) {
    console.error(
      `Dry-run estimate ${result.totalBytesProcessed} bytes exceeds maxBytes ${maxBytes}. Refine the query or pass a higher explicit --max-bytes after review.`,
    );
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
