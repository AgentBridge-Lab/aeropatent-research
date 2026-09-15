// Lifecycle regression harness: actual GraphView with hook/ref/ResizeObserver doubles.
// Run from the repository root: node scripts/verify-graph-mobile.cjs
const fs = require('node:fs');
const Module = require('node:module');
const assert = require('node:assert/strict');
const ts = require('../web/node_modules/typescript');
const hooks = [];
let cursor = 0, effects = [], dirty = true;
const differs = (a, b) => !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
const react = {
  useState(initial) {
    const i = cursor++;
    if (!hooks[i]) hooks[i] = { value: initial };
    return [hooks[i].value, value => {
      const next = typeof value === 'function' ? value(hooks[i].value) : value;
      if (!Object.is(next, hooks[i].value)) { hooks[i].value = next; dirty = true; }
    }];
  },
  useRef(value) { const i = cursor++; return hooks[i] ||= { current: value }; },
  useMemo(fn, deps) {
    const i = cursor++;
    if (!hooks[i] || differs(hooks[i].deps, deps)) hooks[i] = { value: fn(), deps };
    return hooks[i].value;
  },
  useCallback(fn, deps) { return react.useMemo(() => fn, deps); },
  useEffect(fn, deps) {
    const i = cursor++;
    if (!hooks[i] || differs(hooks[i].deps, deps)) {
      effects.push(() => { hooks[i]?.cleanup?.(); hooks[i] = { deps, cleanup: fn() }; });
    }
  },
};
let width = 390, height = 590, resize, graphProps, fits = 0;
const container = { get clientWidth() { return width; }, get clientHeight() { return height; } };
global.ResizeObserver = class { constructor(fn) { resize = fn; } observe() {} disconnect() {} };
const graph = { d3Force: () => null, zoomToFit: () => fits++, d3ReheatSimulation() {} };
const searchParams = new URLSearchParams();
const open = () => {};
const close = () => {};
const router = { replace() {} };
const originalLoad = Module._load;
Module._load = function (name, parent, main) {
  if (name === 'react') return react;
  if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  if (name === 'next/dynamic') return () => 'ForceGraph';
  if (name === 'next/navigation') return { useSearchParams: () => searchParams, usePathname: () => '/graph', useRouter: () => router };
  if (name === 'three-spritetext') return class {};
  if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key });
  if (name === '../../lib/store') return { useDrawer: fn => fn({ open, close, nodeId: null }) };
  return originalLoad(name, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (m, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  m._compile(code, filename);
};
const GraphView = require('../web/app/components/graph/GraphView.tsx').default;
function commit(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach(commit);
  if (node.type === 'ForceGraph') { graphProps = node.props; node.props.ref.current = graph; }
  else if (node.props?.ref) node.props.ref.current = container;
  commit(node.props?.children);
}
function render() {
  for (let i = 0; dirty && i < 10; i++) {
    dirty = false; cursor = 0; effects = [];
    commit(GraphView());
    effects.forEach(run => run());
  }
}
render();
console.log(JSON.stringify({ viewport: width, canvasWidth: graphProps.width, nodes: graphProps.graphData.nodes.length, links: graphProps.graphData.links.length }));
assert.equal(graphProps.width, 390, '390px container must not keep the 800px fallback canvas');
assert.ok(graphProps.graphData.nodes.length > 2 && graphProps.graphData.links.length > 0);
graphProps.onEngineStop?.();
assert.ok(fits > 0, 'settled graph must fit the mobile camera');
width = 320; height = 500; resize(); render();
assert.equal(graphProps.width, 320, 'canvas must follow viewport resize');
assert.equal(graphProps.height, 500);
console.log('PASS: mounted 390px graph, camera fit and 320px resize');
