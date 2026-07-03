import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "server.mjs");
const child = spawn(process.execPath, [serverPath], {
  cwd: __dirname,
  stdio: ["pipe", "pipe", "pipe"],
});

let nextId = 1;
let buffer = Buffer.alloc(0);
const pending = new Map();
const notifications = [];

child.stdout.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  readFrames();
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});

function request(method, params = {}) {
  const id = nextId++;
  const payload = { jsonrpc: "2.0", id, method, params };
  const json = JSON.stringify(payload);
  child.stdin.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    setTimeout(() => reject(new Error(`Timeout waiting for ${method}`)), 5000);
  });
}

function requestExpectError(method, params = {}) {
  const id = nextId++;
  const payload = { jsonrpc: "2.0", id, method, params };
  const json = JSON.stringify(payload);
  child.stdin.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
  return new Promise((resolve, reject) => {
    pending.set(id, {
      resolve: (result) => reject(new Error(`Expected error for ${method}, got ${JSON.stringify(result)}`)),
      reject: resolve,
    });
    setTimeout(() => reject(new Error(`Timeout waiting for ${method} error`)), 5000);
  });
}

function readFrames() {
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) return;
    const header = buffer.slice(0, headerEnd).toString("utf8");
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) throw new Error(`Invalid header: ${header}`);
    const length = Number(match[1]);
    const frameStart = headerEnd + 4;
    const frameEnd = frameStart + length;
    if (buffer.length < frameEnd) return;
    const message = JSON.parse(buffer.slice(frameStart, frameEnd).toString("utf8"));
    buffer = buffer.slice(frameEnd);
    const entry = pending.get(message.id);
    if (entry) {
      pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    } else {
      notifications.push(message);
    }
  }
}

try {
  await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "aeropatent-smoke-test", version: "0.1.0" },
  });
  const tools = await request("tools/list");
  const globalLandscape = await request("tools/call", {
    name: "get_global_patent_landscape",
    arguments: { country: "KR", period: "5y", limit: 4 },
  });
  const search = await request("tools/call", {
    name: "search_patents_by_nasa_taxonomy",
    arguments: { txCode: "TX01", keyword: "reusable launch vehicle", limit: 3 },
  });
  const claimSearch = await request("tools/call", {
    name: "search_patents_by_nasa_taxonomy",
    arguments: { keyword: "interface ring", limit: 3 },
  });
  const falsePositiveSearch = await request("tools/call", {
    name: "search_patents_by_nasa_taxonomy",
    arguments: { keyword: "interface ring impossible", limit: 3 },
  });
  const landscape = await request("tools/call", {
    name: "get_patent_landscape_for_program",
    arguments: { programId: "space-kari-discovered-18659" },
  });
  const graph = await request("tools/call", {
    name: "get_graph_neighbors",
    arguments: { nodeId: "field:launch_recovery", depth: 1 },
  });
  const resources = await request("resources/list");
  const crosswalk = await request("resources/read", {
    uri: "aeropatent://taxonomy/crosswalk",
  });
  const missingGraph = await request("tools/call", {
    name: "get_graph_neighbors",
    arguments: { nodeId: "missing:node", depth: 2 },
  });
  const invalidParamsError = await requestExpectError("tools/call", {
    name: "get_graph_neighbors",
    arguments: { nodeId: "field:launch_recovery", nodeTypes: "field" },
  });
  const invalidDateWindowError = await requestExpectError("tools/call", {
    name: "search_patents_by_nasa_taxonomy",
    arguments: { txCode: "TX01", dateWindow: "5yr" },
  });
  const invalidWideDateWindowError = await requestExpectError("tools/call", {
    name: "search_patents_by_nasa_taxonomy",
    arguments: { txCode: "TX01", dateWindow: "999y" },
  });
  const nullArgumentsError = await requestExpectError("tools/call", {
    name: "search_patents_by_nasa_taxonomy",
    arguments: null,
  });
  const nullParamsToolError = await requestExpectError("tools/call", null);
  const nullParamsResourceError = await requestExpectError("resources/read", null);
  child.stdin.write("Content-Length: 9\r\n\r\nnot-json!");
  child.stdin.write("Content-Length: 4\r\n\r\nnull");
  await new Promise((resolve) => setTimeout(resolve, 100));
  const parseErrorHandled = notifications.some((message) => message.error?.code === -32700);
  const invalidRequestHandled = notifications.some((message) => message.error?.code === -32600);
  console.log(
    JSON.stringify(
      {
        tools: tools.tools.map((tool) => tool.name),
        globalLandscapeFieldCount: JSON.parse(globalLandscape.content[0].text).fieldCount,
        searchLength: JSON.parse(search.content[0].text).count,
        claimSearchLength: JSON.parse(claimSearch.content[0].text).count,
        falsePositiveSearchLength: JSON.parse(falsePositiveSearch.content[0].text).count,
        landscapeFound: JSON.parse(landscape.content[0].text).found,
        graphNodeCount: JSON.parse(graph.content[0].text).nodeCount,
        missingGraphFound: JSON.parse(missingGraph.content[0].text).found,
        resources: resources.resources.map((resource) => resource.uri),
        crosswalkBytes: crosswalk.contents[0].text.length,
        parseErrorHandled,
        invalidRequestHandled,
        invalidParamsCode: invalidParamsError.message.includes("nodeTypes must be an array")
          ? -32602
          : null,
        invalidDateWindowCode: invalidDateWindowError.message.includes("dateWindow must be")
          ? -32602
          : null,
        invalidWideDateWindowCode: invalidWideDateWindowError.message.includes("dateWindow must be")
          ? -32602
          : null,
        nullArgumentsCode: nullArgumentsError.message.includes("arguments must be an object")
          ? -32602
          : null,
        nullToolParamsCode: nullParamsToolError.message.includes("params must be an object")
          ? -32602
          : null,
        nullResourceParamsCode: nullParamsResourceError.message.includes("params must be an object")
          ? -32602
          : null,
      },
      null,
      2,
    ),
  );
} finally {
  child.kill();
}
