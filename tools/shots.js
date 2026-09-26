// 美术评审截图：固定几个场景各拍一张，方便对比改动前后的画面。node tools/shots.js [输出目录]
// 场景：标题、选职业、白天/黄昏/夜晚/Boss 光照下的战斗、整备页、每张地图、圣火三种形态、2D 退路画面。
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { serve, CHROMIUM_ARGS } = require('./lib/serve');

const out = path.resolve(process.argv[2] || 'shots/art');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const server = await serve();
  const base = `http://localhost:${server.address().port}/preview.html?skipopening`;
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

  const page = await open('&hifx' + (process.env.SHOTS_ART ? '&art=' + process.env.SHOTS_ART : ''));   // SHOTS_ART=all 拍风格化光照全开的对照   // 锁定画质：无头浏览器是软件渲染，很慢，不锁会自动降级
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
      if (g.player.dead) g.respawn();   // 上一个场景里倒下的英雄先复活，免得截图里只剩复活进度圈
      g.player.hp = g.player.maxHp = 9999;
      if (RW.W3 && RW.W3.snapEnv) RW.W3.snapEnv(g);   // 直接切到该光照，软件渲染太慢，等渐变会拍到过渡色
    }, [env, wave]);
    await page.waitForTimeout(4500);
    await shot(page, name);
  }
  await page.evaluate(() => { RW.game.clearWave(); });
  await page.waitForFunction(() => RW.game.mode === 'shop', null, { timeout: 60000 });
  await page.waitForTimeout(500);
  await shot(page, '07_shop');
  // 每张地图各拍一张白天战斗（先把地图解锁条件满足）
  const maps = await page.evaluate(() => RW.MAP_ORDER.filter(m => m !== 'village'));
  for (let i = 0; i < maps.length; i++) {
    await page.evaluate(id => {
      const g = RW.game;
      g.prog.heroBest = Object.assign({}, g.prog.heroBest, { mage: 20 });
      RW.UI.runMap = id; RW.Main.action('pick:mage');
      if (RW.W3) RW.W3.envFor = () => 'day';
      g.startWave(3); g.player.hp = g.player.maxHp = 9999; g.core.hp = g.core.maxHp = 99999;
    }, maps[i]);
    await page.waitForTimeout(5000);
    await shot(page, String(9 + i).padStart(2, '0') + '_map_' + maps[i]);
  }
  // 圣火三种形态（满级），英雄站在圣火旁边
  const forms = await page.evaluate(() => RW.CORE_FORM_ORDER);
  await page.evaluate(() => { RW.UI.runMap = 'village'; RW.Main.action('pick:mage'); if (RW.W3) RW.W3.envFor = () => 'dusk'; });
  for (let i = 0; i < forms.length; i++) {
    await page.evaluate(f => {
      const g = RW.game;
      g.core.lv = 5; g.core.form = f; g.applyCoreLevel(); g.core.hp = g.core.maxHp;
      g.player.x = g.core.x + 90; g.player.y = g.core.y + 60; g.player.hp = g.player.maxHp = 9999; g.banner = 0;
      RW.W3.snap = true;
    }, forms[i]);
    await page.waitForTimeout(3500);
    await shot(page, (12 + i) + '_core_' + forms[i]);
  }
  // 圣域：1 / 5 / 8 / 10 级，圣域越大视野越广，满级天火照遍全图
  const lvs = [1, 5, 8, 10];
  for (let i = 0; i < lvs.length; i++) {
    await page.evaluate(lv => {
      const g = RW.game;
      g.core.lv = lv; g.core.form = lv >= 3 ? 'blaze' : ''; g.applyCoreLevel(); g.core.hp = g.core.maxHp;
      g.player.x = g.core.x + 120; g.player.y = g.core.y - 80; g.banner = 0;
      RW.W3.snap = true;
    }, lvs[i]);
    await page.waitForTimeout(3500);
    await shot(page, (15 + i) + '_sanct_lv' + lvs[i]);
  }
  // 实战：第 12 波打了一会儿，满屏敌人 + 建筑 + 士兵（审计：之前的截图几乎看不到敌人，没法评审战斗可读性）
  await page.evaluate(() => {
    const g = RW.game;
    g.core.lv = 5; g.core.form = 'blaze'; g.applyCoreLevel(); g.core.hp = g.core.maxHp = 99999;
    g.player.hp = g.player.maxHp = 99999; g.shardCount = 999; g.banner = 0;
    g.startWave(12); if (g.player.dead) g.respawn(); g.player.x = g.core.x + 160; g.player.y = g.core.y + 40;
    g.buildTower('barracks'); g.player.x += 60; g.buildTower('sentry'); g.player.x = g.core.x - 150; g.buildTower('pylon');
    for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2, r = 220 + (k % 5) * 30; g.spawnEnemy(k % 7 === 0 ? 'shell' : (k % 5 === 0 ? 'dasher' : 'mite'), g.player.x + Math.cos(a) * r, g.player.y + Math.sin(a) * r, false); }
    RW.W3.snap = true; if (RW.W3.snapEnv) RW.W3.snapEnv(g);
  });
  await page.waitForTimeout(4500);
  await shot(page, '19_combat');
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
