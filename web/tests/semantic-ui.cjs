const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require(path.resolve(path.dirname(require.resolve(process.env.PLAYWRIGHT_MODULE || 'playwright')), '../pngjs'));
const snapshot = require('../../analysis/semantic_clusters.json');
const base = process.env.FRONTEND_TEST_URL || 'http://127.0.0.1:3042';
const output = path.resolve(__dirname, '../../.cache/semantic-ui');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errors = [], checks = [];
  const check = (name, condition) => { assert(condition, name); checks.push(name); console.log('PASS: ' + name); };
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 960 } });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
      await page.goto(base + '/graph/');
      const select = page.getByRole('combobox', { name: '의미 군집 선택', exact: true });
      await select.waitFor();
      check('semantic cluster choices at ' + width, await select.locator('option').count() > 1);
      await page.getByRole('button', { name: '의미 유사도', exact: true }).click();
      const layout = page.getByRole('button', { name: '의미 군집', exact: true }).nth(1);
      await layout.click();
      await page.waitForTimeout(2000);
      const canvas = page.locator('canvas').first();
      const first = await canvas.screenshot();
      const pixels = PNG.sync.read(first);
      let lit = 0;
      for (let y = 85; y < pixels.height - 10; y += 3) for (let x = 10; x < pixels.width - 10; x += 3) {
        const offset = (y * pixels.width + x) * 4;
        if (Math.max(...pixels.data.subarray(offset, offset + 3)) > 85) lit++;
      }
      check('graph canvas contains visible nodes and links at ' + width, lit > 20);
      await canvas.screenshot({ path: path.join(output, `graph-${width}.png`) });
      const option = await select.locator('option').nth(1).getAttribute('value');
      await select.selectOption(option);
      const dialog = page.getByRole('dialog', { name: '노드 보고서' });
      await dialog.waitFor();
      check('selected cluster opens measured report at ' + width,
        await dialog.getByText('평균 코사인 유사도', { exact: true }).count() > 0);
      const search = await dialog.getByRole('link', { name: '관련 특허 검색', exact: true }).getAttribute('href');
      check('related search preserves cluster at ' + width, new URL(search, base).searchParams.get('cluster') === option);
      await page.screenshot({ path: path.join(output, `report-${width}.png`), fullPage: true });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'detached' });
      check('no page overflow at ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.goto(new URL(search, base).href);
      await page.getByRole('button', { name: '군집 필터 해제' }).waitFor();
      const cluster = snapshot.clusters.find(c => c.id === option);
      const count = cluster.patent_ids.filter(id => !id.startsWith('patent.WO')).length;
      check('cluster search result count at ' + width, await page.locator('article').count() === count);
      await page.getByRole('button', { name: '필터 초기화', exact: true }).click();
      check('reset clears cluster at ' + width, !new URL(page.url()).searchParams.has('cluster'));
      await page.goto(base + `/reports/${option}/`);
      await page.getByRole('heading', { name: cluster.label, exact: true }).waitFor();
      check('static cluster report at ' + width, await page.getByText('평균 코사인 유사도', { exact: true }).count() > 0);
      await page.close();
    }
    check('no browser runtime errors', errors.length === 0);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ status: 'PASS', checks, errors }, null, 2));
  } finally { await browser.close(); }
})();
