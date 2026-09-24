// 界面流程测试（v2）：整备（维修/加固/买卡）→ 战斗中造塔 → 复活页 → 结算页。node tools/flowtest.js <输出目录>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { serve, CHROMIUM_ARGS } = require('./lib/serve');
const root = path.resolve(__dirname, '..'), out = path.resolve(process.argv[2] || 'flow');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${server.address().port}/preview.html`);
  await page.waitForTimeout(400);
  const toS = (x, y) => page.evaluate(([x, y]) => { const v = RW.Plat.view; return [v.ox + x * v.s, v.oy + y * v.s]; }, [x, y]);
  const tap = async (x, y) => { const [a, b] = await toS(x, y); await page.mouse.click(a, b); await page.waitForTimeout(150); };
  const shot = n => page.screenshot({ path: path.join(out, n + '.png') });
  await tap(210, 511); await page.waitForTimeout(200); await tap(50, 124); await shot('f_pick'); await tap(276, 692);   // 选第一个英雄 -> 出发
  await page.waitForTimeout(500);
  // 战斗中：点造塔 → 点哨炮
  await tap(46, 712); await shot('f0_buildmenu'); await tap(58, 637);
  await page.waitForTimeout(600); await shot('f1_built');
  const towers1 = await page.evaluate(() => RW.game.towerCount());
  // 快进到第 4 波整备，核心舱受损
  await page.evaluate(() => { const g = RW.game; g.wave = 4; g.shardCount = 200; g.core.hp = 90; g.clearWave(); });
  await page.waitForTimeout(1900);
  await shot('f2_shop');
  await tap(118 + 62, 190 + 45);   // 维修
  await tap(250 + 73, 190 + 45);   // 加固
  await tap(349, 262 + 32);        // 买第一张卡
  await shot('f3_shop_after');
  const coreAfter = await page.evaluate(() => [Math.round(RW.game.core.hp), RW.game.core.maxHp]);
  await tap(336, 715);             // 下一波（Boss 波）
  await page.waitForTimeout(8000);
  await shot('f4_boss');
  await page.evaluate(() => { const g = RW.game; g.core.hp = 1; });
  for (let i = 0; i < 60; i++) { const m = await page.evaluate(() => RW.game.mode); if (m === 'revive') break; await page.evaluate(() => { const g = RW.game; const e = g.enemies.find(e => e.on && e.spawnT <= 0 && !e.elite); if (e) { e.goalCore = true; e.x = g.core.x + 40; e.y = g.core.y; e.chewT = 0; } }); await page.waitForTimeout(100); }
  await page.waitForTimeout(300);
  await shot('f5_revive');
  await tap(210, 365);
  await page.waitForTimeout(400);
  await page.evaluate(() => RW.game.finishRun());
  await page.waitForTimeout(300);
  await shot('f6_result');
  console.log('towers after build', towers1, 'core after repair/armor', coreAfter, 'errors', errors.length ? errors : 'none');
  await browser.close(); server.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
