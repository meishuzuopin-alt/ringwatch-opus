// 美术评审截图：固定几个场景各拍一张，方便对比改动前后的画面。node tools/shots.js [输出目录]
// 场景：标题、英雄、战斗造塔、四种光照、整备、暂停、复活、结算、2D 退路。
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
  await page.evaluate(() => RW.Main.action('courtyard'));
  await page.waitForTimeout(250);
  await shot(page, '02_courtyard');
  await page.evaluate(() => RW.Main.action('yardClose'));
  await page.evaluate(() => RW.Main.action('start'));
  await page.waitForTimeout(400);
  await shot(page, '03_pick');

  // 战斗：玩家无敌，固定光照预设后等颜色过渡完再拍
  await page.evaluate(() => { RW.Main.action('pick:' + RW.game.offers[0]); });
  await page.evaluate(() => RW.Main.battle('build'));
  await page.waitForTimeout(200);
  await shot(page, '04_buildmenu');
  await page.evaluate(() => RW.Main.battle('build'));
  await page.waitForTimeout(200);
  const scenes = [['05_day', 'day', 1], ['06_dusk', 'dusk', 4], ['07_night', 'night', 7], ['08_boss', 'boss', 5]];
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
  await shot(page, '09_shop');
  await page.evaluate(() => { RW.game.mode = 'battle'; RW.Main.battle('pause'); });
  await page.waitForTimeout(150);
  await shot(page, '10_pause');
  await page.evaluate(() => RW.Main.action('resume'));
  await page.evaluate(() => { var g = RW.game; g.mode = 'revive'; g.wave = 4; g.dur = 50; g.wt = 17; g.lastHits = [{ src: '熔火巨像', dmg: 22, wave: 4 }]; });
  await page.waitForTimeout(150);
  await shot(page, '11_revive');
  await page.evaluate(() => { RW.game.finishRun(); });
  await page.waitForTimeout(150);
  await shot(page, '12_result');
  await page.evaluate(() => { RW.game.prog.marks = 20; });
  await page.evaluate(() => RW.Main.action('courtyard'));
  await page.waitForTimeout(200);
  await shot(page, '13_courtyard_upgrades');
  await page.close();

  const p2 = await open('?2d');
  await p2.evaluate(() => { RW.Main.action('start'); RW.Main.action('pick:' + RW.game.offers[0]); });
  await p2.waitForTimeout(3000);
  await shot(p2, '14_fallback2d');

  await browser.close();
  server.close();
  console.log('截图已写入 ' + out);
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
