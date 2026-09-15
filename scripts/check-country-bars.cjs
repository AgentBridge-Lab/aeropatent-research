// Verify the production data/markup/CSS seam without a browser dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'web/node_modules/typescript'));
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => mod._compile(ts.transpileModule(
    fs.readFileSync(filename, 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
  ).outputText, filename);
}
require.extensions['.css'] = (mod) => {
  mod.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : key });
};
const React = require(path.join(root, 'web/node_modules/react'));
const { renderToStaticMarkup } = require(path.join(root, 'web/node_modules/react-dom/server'));
const { getSummary, TREND_BASIS_NOTE } = require(path.join(root, 'web/app/lib/data.ts'));
const CountryBars = require(path.join(root, 'web/app/components/viz/CountryBars.tsx')).default;
const measured = JSON.parse(fs.readFileSync(path.join(root, 'analysis/bq_summary_by_country.json'), 'utf8'));
const rows = getSummary().country_distribution;
assert.equal(rows.length, 5);
for (const row of rows) assert.equal(row.count, measured[row.country].familyCount, `${row.country}: measured aggregate`);
const markup = renderToStaticMarkup(React.createElement(CountryBars, { data: rows }));
assert.equal([...markup.matchAll(/class="barFill"/g)].length, 5);
assert.equal([...markup.matchAll(/width:([\d.]+)%/g)].filter((match) => Number(match[1]) > 0).length, 5);
const css = fs.readFileSync(path.join(root, 'web/app/components/viz/viz.module.css'), 'utf8');
const fill = css.match(/\.barFill\s*\{([^}]+)\}/)[1];
assert.match(fill, /display:\s*(?:block|inline-block|flex|grid)/, 'Empty inline span cannot render its width/height');
assert.doesNotMatch(fill, /min-width:\s*[1-9]/, 'Zero values must not gain a fabricated minimum bar');
assert.equal(TREND_BASIS_NOTE, '전체 CPC 후보군 기준. 패밀리 대표 연도를 확정하지 않아 공보 단위 우선연도로 집계되며(한 패밀리가 여러 해에 걸릴 수 있음), 진행 중인 올해는 제외. 직전 연도에도 공개·수록 지연이 남아 있어 감소를 활동 감소로 단정할 수 없습니다.');
console.log('PASS: 5 measured jurisdiction counts, 5 positive bar widths, paintable bar CSS, exact trend note');
