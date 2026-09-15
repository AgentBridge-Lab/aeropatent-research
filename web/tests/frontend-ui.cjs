// Local browser regression; uses an installed Playwright runtime, no remote requests.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/Users/ldh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.FRONTEND_TEST_URL || 'http://127.0.0.1:3041';
const output = path.resolve(__dirname, '../../logs/frontend_audit_20260916');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors = [], results = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
  const check = (name, condition) => { assert.ok(condition, name); results.push({ name, status: 'PASS' }); console.log('PASS: ' + name); };
  const settle = () => page.waitForTimeout(350);
  try {
    await page.goto(base + '/patents/');
    const top = page.getByRole('textbox', { name: '특허 검색', exact: true });
    const search = page.getByRole('searchbox');
    await search.waitFor();
    await top.fill('ZZZQA_NO_MATCH_7842'); await top.press('Enter');
    await page.waitForURL(/q=ZZZQA_NO_MATCH_7842/); await settle();
    check('same-page top search synchronizes input and empty result', (await search.inputValue()) === 'ZZZQA_NO_MATCH_7842' && await page.locator('article').count() === 0);
    await page.getByRole('button', { name: '검색어 지우기' }).click(); await settle();
    check('main search clear removes URL query and restores results', !new URL(page.url()).searchParams.has('q') && await page.locator('article').count() > 0);
    await search.fill('satellite'); await settle();
    check('typed search updates URL', new URL(page.url()).searchParams.get('q') === 'satellite');
    await top.fill('ZZZQA_NO_MATCH_2'); await top.press('Enter'); await page.waitForURL(/ZZZQA_NO_MATCH_2/);
    await page.goBack(); await settle();
    check('back navigation restores search', await search.inputValue() === 'satellite');
    await page.goto(base + '/patents/?sort=importance&status=' + encodeURIComponent('등록'));
    await search.waitFor(); await settle();
    check('URL sort and status controls synchronize', await page.getByRole('button', { name: '표본 정렬점수순', exact: true }).getAttribute('aria-pressed') === 'true' && await page.getByRole('button', { name: '등록', exact: true }).getAttribute('aria-pressed') === 'true');
    await page.getByRole('button', { name: '필터 초기화' }).click(); await settle();
    check('reset removes local filters atomically', !new URL(page.url()).searchParams.has('status') && !new URL(page.url()).searchParams.has('sort'));
    const sub = await page.locator('#sf-select option').nth(1).getAttribute('value');
    await page.locator('#sf-select').selectOption(sub); await settle();
    await page.getByRole('button', { name: '위성체·열·전력', exact: true }).click(); await settle();
    check('field change clears incompatible subfield', !new URL(page.url()).searchParams.has('subfield') && await page.locator('#sf-select').inputValue() === '');
    await page.goto(base + '/analysis/');
    await page.locator('svg[aria-label="연도별 추세"]').first().waitFor();
    const clips = await page.locator('svg[aria-label="연도별 추세"] text').evaluateAll(elements => elements.filter(e => e.getBBox().x < 0).map(e => e.textContent));
    check('trend y-axis labels remain in SVG viewport', clips.length === 0);
    const ids = await page.locator('linearGradient[id]').evaluateAll(elements => elements.map(e => e.id));
    check('SVG gradient identifiers unique', new Set(ids).size === ids.length);
    await page.screenshot({ path: path.join(output, 'analysis_after.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await settle();
    check('mobile closed navigation hidden from focus', await page.locator('#app-navigation').evaluate(e => getComputedStyle(e).visibility === 'hidden'));
    const menu = page.getByRole('button', { name: '메뉴 열기', exact: true }); await menu.click(); await settle();
    check('mobile menu moves focus inside dialog', await page.locator('#app-navigation').evaluate(e => e.contains(document.activeElement)));
    check('mobile menu makes content inert', await page.locator('main').evaluate(e => e.inert));
    await page.keyboard.press('Escape'); await settle();
    check('Escape closes menu and restores trigger focus', await menu.evaluate(e => document.activeElement === e) && !await page.locator('main').evaluate(e => e.inert));
    await menu.click(); await page.setViewportSize({ width: 1440, height: 960 }); await settle();
    check('desktop resize releases mobile modal state', !await page.locator('main').evaluate(e => e.inert) && await page.locator('#app-navigation').getAttribute('aria-modal') === null);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 }); await settle();
      check('analysis no document overflow at ' + width, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'analysis_mobile_after.png'), fullPage: true });
    for (const route of ['/countries/', '/patents/', '/reports/']) {
      await page.setViewportSize({ width: 320, height: 844 });
      await page.goto(base + route); await settle();
      check(route + ' no document overflow at 320', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto(base + '/graph/');
    const select = page.getByRole('combobox', { name: '보고서 노드 선택' }); await select.waitFor();
    const node = await select.locator('option').nth(1).getAttribute('value');
    await select.focus(); await select.selectOption(node); await settle();
    const dialog = page.getByRole('dialog', { name: '노드 보고서' }); await dialog.waitFor();
    check('keyboard node selection opens report and updates URL', new URL(page.url()).searchParams.get('node') === node);
    check('report dialog traps initial focus', await dialog.evaluate(e => e.contains(document.activeElement)));
    await page.keyboard.press('Shift+Tab');
    check('reverse Tab remains in report', await dialog.evaluate(e => e.contains(document.activeElement)));
    check('report displays denominator basis', await dialog.getByText(/최근 10년 우선권 기준 ·/).count() > 0);
    const related = await dialog.getByRole('link', { name: '관련 특허 검색', exact: true }).getAttribute('href');
    check('related search uses selected field', new URL(related, base).searchParams.get('field') === node.split('.')[1]);
    await page.screenshot({ path: path.join(output, 'graph_report_after.png'), fullPage: true });
    await page.keyboard.press('Escape'); await settle();
    check('report Escape clears selected node and restores focus', await dialog.count() === 0 && !new URL(page.url()).searchParams.has('node') && await select.inputValue() === '' && await select.evaluate(e => document.activeElement === e));
    await page.goto(base + '/graph/?node=unknown.invalid'); await select.waitFor(); await settle();
    check('unknown graph node does not open empty overlay', await page.getByRole('dialog').count() === 0);
    await page.goto(base + '/');
    const deep = page.getByRole('link', { name: '분야별 심층분석 →' }); await deep.waitFor();
    check('deepdive is a real source-level anchor', await deep.getAttribute('href') === new URL(base + '/deepdive/').pathname);
    await deep.focus(); await page.keyboard.press('Enter'); await page.waitForURL('**/deepdive/');
    check('deepdive activation not intercepted by hero navigation', new URL(page.url()).pathname === new URL(base + '/deepdive/').pathname);
    check('no uncaught browser errors', errors.length === 0);
    fs.writeFileSync(path.join(output, 'ui_regression.json'), JSON.stringify({ status: 'PASS', checks: results.length, results, errors }, null, 2));
    console.log(JSON.stringify({ status: 'PASS', checks: results.length, errors }));
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
    fs.writeFileSync(path.join(output, 'ui_regression.json'), JSON.stringify({ status: 'FAIL', results, errors, error: error.message }, null, 2));
    throw error;
  } finally { await browser.close(); }
})();
