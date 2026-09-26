// 镜头回归测试：每张地图、圣火 1 级与满级，英雄站在四个角和最南端，英雄都必须在画面安全区里。
// 玩家报过的 bug：圣火升级后镜头拉远、往王旗偏，英雄会被甩出画面。node tools/camtest.js
const { chromium } = require('playwright');
const { serve, CHROMIUM_ARGS } = require('./lib/serve');

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/preview.html?lowfx&skipopening`);
  await page.waitForTimeout(500);
  const maps = await page.evaluate(() => RW.MAP_ORDER);
  let bad = 0, n = 0;
  for (const id of maps) {
    await page.evaluate(id => {
      const g = RW.game;
      g.prog.heroBest = Object.assign({}, g.prog.heroBest, { mage: 20 });
      RW.UI.runMap = id; RW.Main.action('pick:mage');
    }, id);
    // 取四个角和南边中间附近能站的格子
    const spots = await page.evaluate(() => {
      const G = RW.GRID, C = G.cell, out = [], want = [[0.05, 0.05], [0.95, 0.05], [0.05, 0.95], [0.95, 0.95], [0.5, 0.97]];
      for (const [fx, fy] of want) {
        let best = null, bd = 1e9;
        for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
          if (G.grid[r * G.cols + c]) continue;
          const d = Math.hypot(c - fx * G.cols, r - fy * G.rows);
          if (d < bd) { bd = d; best = [c * C + C / 2, r * C + C / 2]; }
        }
        out.push(best);
      }
      return out;
    });
    for (const lv of [1, 5, 10]) for (const [x, y] of spots) {
      await page.evaluate(([lv, x, y]) => {
        const g = RW.game; g.core.lv = lv; g.applyCoreLevel(); g.player.x = x; g.player.y = y; g.player.vx = g.player.vy = 0;
        g.player.hp = g.player.maxHp = 1e6; g.core.hp = g.core.maxHp = 1e7; RW.W3.snap = true;
      }, [lv, x, y]);
      await page.waitForFunction(() => !RW.W3.snap, null, { timeout: 30000 });
      await page.waitForTimeout(400);
      const sp = await page.evaluate(() => { const p = RW.game.player, s = RW.W3.toScreen(p.x, 10, p.y); return [Math.round(s.x), Math.round(s.y), s.ok]; });
      const ok = sp[2] && sp[0] > 60 && sp[0] < 900 && sp[1] > 60 && sp[1] < 480;
      n++;
      if (!ok) { bad++; console.log(`  ✗ ${id} 圣火 ${lv} 级，英雄在 (${x},${y})，画面位置 ${sp[0]},${sp[1]}`); }
    }
  }
  console.log(`镜头：${n - bad} / ${n} 个位置英雄在画面内`);
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close(); server.close();
  if (bad || errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
