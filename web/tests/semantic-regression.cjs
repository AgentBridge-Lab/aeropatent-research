const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('../node_modules/typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
const { PATENTS, DEFAULT_FILTER, similarPatents, searchPatents } = require('../app/lib/data.ts');
const { SEMANTIC, semanticClusterId, semanticNeighbors } = require('../app/lib/semantic.ts');
const { getGraphData, getNodeReport, getReportSearchQuery, graphLayoutPosition } = require('../app/lib/graph.ts');
const byId = new Map(PATENTS.map(p => [p.id, p]));
const graph = getGraphData(DEFAULT_FILTER);
for (const patent of PATENTS) {
  const neighbors = semanticNeighbors(patent.id, new Set(byId.keys()));
  const families = new Set();
  for (const item of neighbors) {
    const candidate = byId.get(item.id);
    assert(candidate && candidate.id !== patent.id);
    assert(!patent.family_id || candidate.family_id !== patent.family_id);
    assert(item.similarity >= SEMANTIC.method.similarity_threshold);
    assert(!families.has(candidate.family_id ?? candidate.id));
    families.add(candidate.family_id ?? candidate.id);
  }
  assert.deepEqual(similarPatents(patent).map(p => p.id), neighbors.map(n => n.id));
}
for (const cluster of SEMANTIC.clusters) {
  const expected = PATENTS.filter(p => semanticClusterId(p.id) === cluster.id);
  if (!expected.length) continue;
  const report = getNodeReport(cluster.id, DEFAULT_FILTER);
  assert.deepEqual(report.top_patents.map(p => p.id), expected.map(p => p.id));
  assert.equal(new URLSearchParams(getReportSearchQuery(report)).get('cluster'), cluster.id);
  assert.deepEqual(searchPatents({ filter: DEFAULT_FILTER, cluster: cluster.id }).map(p => p.id).sort(), expected.map(p => p.id).sort());
  assert.equal(searchPatents({ filter: DEFAULT_FILTER, cluster: 'cluster.missing' }).length, 0);
  const node = graph.nodes.find(n => n.id === cluster.id);
  assert(node && node.type === 'cluster');
  const positions = expected.map(p => graphLayoutPosition(graph.nodes.find(n => n.id === p.id), 'cluster', 2026));
  assert(positions.every(p => Number.isFinite(p.fx) && Number.isFinite(p.fy) && Number.isFinite(p.fz)));
}
for (const country of ['US', 'KR', 'CN']) {
  const filtered = getGraphData({ ...DEFAULT_FILTER, countries: [country] });
  const ids = new Set(filtered.nodes.map(n => n.id));
  assert(filtered.edges.every(e => ids.has(e.source) && ids.has(e.target)));
}
assert(!graph.edges.some(e => ['same_subfield', 'cites', 'similar_to'].includes(e.type)));
console.log(JSON.stringify({ status: 'PASS', clusters: SEMANTIC.summary.cluster_count, edges: graph.edges.filter(e => e.type === 'semantic_similar').length }));
