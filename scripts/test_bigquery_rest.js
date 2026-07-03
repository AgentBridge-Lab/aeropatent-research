const fs = require("fs");
const crypto = require("crypto");
const https = require("https");

const projectId = process.env.GOOGLE_CLOUD_PROJECT || "aeropatent-research";
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

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
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/bigquery",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64url(header)}.${base64url(claim)}`;
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(signingInput), key.private_key)
    .toString("base64url");
  const assertion = `${signingInput}.${signature}`;

  const tokenResponse = await post(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
    { "Content-Type": "application/x-www-form-urlencoded" },
  );

  if (tokenResponse.status !== 200) {
    throw new Error(`Token request failed ${tokenResponse.status}: ${tokenResponse.body}`);
  }

  return JSON.parse(tokenResponse.body).access_token;
}

async function queryBigQuery(accessToken, query) {
  return post(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`,
    JSON.stringify({
      query,
      useLegacySql: false,
      timeoutMs: 10000,
      dryRun: process.env.BQ_DRY_RUN === "1",
      maxResults: Number(process.env.BQ_MAX_RESULTS || 100),
    }),
    {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  );
}

async function main() {
  const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  const accessToken = await getAccessToken(key);
  const query = process.argv.slice(2).join(" ") || "SELECT 1 AS ok";
  const response = await queryBigQuery(accessToken, query);
  console.log(`PROJECT=${projectId}`);
  console.log(`KEY_FILE=${keyPath}`);
  console.log(`BQ_STATUS=${response.status}`);
  console.log(response.body.slice(0, Number(process.env.BQ_PRINT_LIMIT || 1200)));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
