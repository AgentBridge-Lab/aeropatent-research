// Local-only regression checks. Uses installed project TypeScript; no network or API calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('../node_modules/typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, filename);
const { FIELDS, SUBFIELDS, APPLICANTS, PATENTS, DEFAULT_FILTER, CURRENT_YEAR } = require('../app/lib/data.ts');
const { getGraphData, getNodeReport, getReportSearchQuery, graphLayoutPosition, NODE_TYPE_COLOR, nodeColor } = require('../app/lib/graph.ts');
let checks = 0;
for (const field of ['all', ...FIELDS.map((field) => field.id)]) {
  const graph = getGraphData({ ...DEFAULT_FILTER, field });
  const ids = new Set(graph.nodes.map((node) => node.id));
  for (const edge of graph.edges) assert(ids.has(edge.source) && ids.has(edge.target));
  checks++;
}
const graph = getGraphData(DEFAULT_FILTER);
for (const node of graph.nodes) {
  assert.equal(nodeColor(node, 'nodeType'), NODE_TYPE_COLOR[node.type]);
  assert.equal(graphLayoutPosition(node, 'galaxy', CURRENT_YEAR).fy, undefined);
  assert.equal(typeof graphLayoutPosition(node, 'hierarchy', CURRENT_YEAR).fy, 'number');
}
checks += 3;
for (const nodeId of [`field.${FIELDS[0].id}`, `subfield.${SUBFIELDS[0].id}`, 'country.KR', `applicant.${APPLICANTS[0].id}`, PATENTS[0].id]) {
  const report = getNodeReport(nodeId, DEFAULT_FILTER);
  const query = new URLSearchParams(getReportSearchQuery(report, 'q=unrelated&subfield=stale&applicant=stale&node=old'));
  const [type, ...parts] = nodeId.split('.');
  const raw = parts.join('.');
  if (type === 'field') assert.equal(query.get('field'), raw);
  if (type === 'subfield') assert.equal(query.get('subfield'), raw);
  if (type === 'country') assert.equal(query.get('countries'), raw);
  if (type === 'applicant') assert.equal(query.get('applicant'), raw);
  if (type === 'patent') assert.equal(query.get('q'), PATENTS[0].publication_number);
  assert.equal(query.get('node'), null);
  checks++;
}
const applicantReport = getNodeReport(`applicant.${APPLICANTS[0].id}`, DEFAULT_FILTER);
assert(applicantReport.kpis.some((item) => item.label === '표본 공개 관할'));
assert(!applicantReport.kpis.some((item) => item.label === '국가'));
checks++;
for (const patent of PATENTS) {
  const report = getNodeReport(patent.id, DEFAULT_FILTER);
  assert(report.kpis.some((item) => item.label === patent.date_basis_label));
  assert(report.kpis.some((item) => item.label === '표본 정렬점수'));
}
checks++;
console.log(JSON.stringify({ status: 'PASS', checks, graph_nodes: graph.nodes.length, patents: PATENTS.length }));
