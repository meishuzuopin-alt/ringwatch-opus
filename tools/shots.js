// 美术评审截图：固定几个场景各拍一张，方便对比改动前后的画面。node tools/shots.js [输出目录]
// 场景：标题、选职业、白天/黄昏/夜晚/Boss 光照下的战斗、整备页、2D 退路画面。
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { serve, CHROMIUM_ARGS } = require('./lib/serve');

const out = path.resolve(process.argv[2] || 'shots/art');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const server = await serve();
  const base = `http://localhost:${server.address().port}/preview.html`;
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const errors = [];
  const open = async (query) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base + (query || ''));
    await page.waitForTimeout(500);
    return page;
  };
  const shot = (page, name) => page.screenshot({ path: path.join(out, name + '.png') });

  const page = await open('?hifx');   // 锁定画质：无头浏览器是软件渲染，很慢，不锁会自动降级
  await shot(page, '01_title');
  await page.evaluate(() => RW.Main.action('start'));
  await page.waitForTimeout(400);
  await shot(page, '02_pick');

  // 战斗：玩家无敌，固定光照预设后等颜色过渡完再拍
  await page.evaluate(() => { RW.Main.action('pick:' + RW.game.offers[0]); });
  const scenes = [['03_day', 'day', 1], ['04_dusk', 'dusk', 4], ['05_night', 'night', 7], ['06_boss', 'boss', 5]];
  for (const [name, env, wave] of scenes) {
    await page.evaluate(([env, wave]) => {
      const g = RW.game;
      if (RW.W3) RW.W3.envFor = () => env;
      g.startWave(wave);
      g.player.hp = g.player.maxHp = 9999;
    }, [env, wave]);
    await page.waitForTimeout(4500);
    await shot(page, name);
  }
  await page.evaluate(() => { RW.game.clearWave(); });
  await page.waitForFunction(() => RW.game.mode === 'shop', null, { timeout: 60000 });
  await page.waitForTimeout(500);
  await shot(page, '07_shop');
  await page.close();

  const p2 = await open('?2d');
  await p2.evaluate(() => { RW.Main.action('start'); RW.Main.action('pick:' + RW.game.offers[0]); });
  await p2.waitForTimeout(3000);
  await shot(p2, '08_fallback2d');

  await browser.close();
  server.close();
  console.log('截图已写入 ' + out);
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
