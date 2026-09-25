// 光照验收（FG-ART-002 阶段 1）：node tools/lighttest.js [输出目录，默认 shots/light] [风格化光照开关，如 all]
// 1. 白天 / 黄昏 / 夜晚 / Boss 四种光照下各拍一张不带 HUD 的纯 3D 画面
// 2. 量亮度：圣火光圈里、光圈外分开算。圣经要求夜晚环境亮度约为白天的 35%（光圈另算）
// 3. 缩成 231×87（Steam 小图尺寸）拼一张缩略图，供人工看剪影能不能分清英雄、圣火、塔、敌人
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { serve, CHROMIUM_ARGS } = require('./lib/serve');
const PNG = require('./lib/png');

const out = path.resolve(process.argv[2] || 'shots/light');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/preview.html?hifx` + (process.argv[3] ? '&art=' + process.argv[3] : ''));   // 第 2 个参数：风格化光照开关，如 all
  await page.waitForFunction(() => window.RW && RW.game && RW.W3 && RW.W3.ready, null, { timeout: 60000 });
  await page.evaluate(() => {
    RW.Main.action('start'); RW.Main.action('pick:' + RW.game.offers[0]);
    const g = RW.game;
    g.player.hp = g.player.maxHp = 9999; g.core.hp = g.core.maxHp = 99999; g.shardCount = 999;
    // 摆一个有代表性的场面：三种塔、兵营，英雄站在光圈边缘
    g.player.x = g.core.x - 150; g.player.y = g.core.y + 40; g.buildTower('sentry');
    g.player.x = g.core.x + 170; g.player.y = g.core.y - 20; g.buildTower('pylon');
    g.player.x = g.core.x + 20; g.player.y = g.core.y + 170; g.buildTower('barracks');
    g.player.x = g.core.x + 90; g.player.y = g.core.y + 60;
    RW.Plat.hud.style.display = 'none';
  });
  const res = {}, thumbs = [];
  for (const [env, wave] of [['day', 1], ['dusk', 4], ['night', 7], ['boss', 5]]) {
    await page.evaluate(([env, wave]) => { RW.W3.envFor = () => env; RW.game.startWave(wave); if (RW.game.player.dead) RW.game.respawn(); RW.game.player.hp = 9999; RW.W3.snapEnv(RW.game); }, [env, wave]);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(out, env + '.png') });
    // 量亮度时关掉叠加发光层（灯笼光池、萤火、法术、范围圈）和泛光，只看地面和模型本身的环境亮度
    const file = path.join(out, env + '_measure.png');
    await page.evaluate(() => { RW.GL.addK0 = RW.GL.addK; RW.GL.addK = 0; RW.GL.fx.bloom = false; });
    await page.waitForTimeout(600);
    await page.screenshot({ path: file });
    await page.evaluate(() => { RW.GL.addK = RW.GL.addK0; RW.GL.fx.bloom = true; });
    // 圣火光圈在屏幕上的椭圆：圆心和四个方向的投影点
    const ell = await page.evaluate(() => {
      const co = RW.game.core, r = Math.max(co.aura || 0, 160), P = RW.Plat.view, W3 = RW.W3;
      const pt = (x, z) => { const s = W3.toScreen(x, 0, z); return [s.x * P.s + P.ox, s.y * P.s + P.oy]; };
      return { c: pt(co.x, co.y), e: [pt(co.x + r, co.y), pt(co.x - r, co.y), pt(co.x, co.y + r), pt(co.x, co.y - r)] };
    });
    const img = PNG.decode(fs.readFileSync(file));
    const rx = Math.abs(ell.e[0][0] - ell.e[1][0]) / 2, ry = Math.abs(ell.e[2][1] - ell.e[3][1]) / 2;
    // 用中位数：灯笼、萤火、法术这些发光点不该算进「环境亮度」
    const In = [], Out = [];
    for (let y = 0; y < img.h; y += 2) for (let x = 0; x < img.w; x += 2) {
      const o = (y * img.w + x) * 4, l = (0.2126 * img.px[o] + 0.7152 * img.px[o + 1] + 0.0722 * img.px[o + 2]) / 255;
      const dx = (x - ell.c[0]) / rx, dy = (y - ell.c[1]) / ry;
      if (dx * dx + dy * dy < 0.8) In.push(l); else if (dx * dx + dy * dy > 1.3) Out.push(l);
    }
    // 绘制开销（锁定高画质，一整帧所有渲染通道加起来）
    res[env] = await page.evaluate(() => new Promise(r => {
      const R = RW.GL.renderer; R.info.autoReset = false; R.info.reset();
      requestAnimationFrame(() => requestAnimationFrame(() => { const i = R.info.render; const o = { calls: i.calls, tris: i.triangles }; R.info.autoReset = true; r(o); }));
    }));
    const med = a => { a.sort((p, q) => p - q); return a.length ? a[a.length >> 1] : 0; };
    res[env] = { calls: res[env].calls, tris: res[env].tris, all: +PNG.lum(img, 0, 0, img.w, img.h).toFixed(3), inside: +med(In).toFixed(3), outside: +med(Out).toFixed(3) };
    thumbs.push(PNG.resize(PNG.decode(fs.readFileSync(path.join(out, env + '.png'))), 231, 87));
  }
  // 缩略图拼图（2×2），放大 2 倍方便看
  const sheet = { w: 231 * 2 * 2 + 6, h: 87 * 2 * 2 + 6, px: Buffer.alloc((231 * 4 + 6) * (87 * 4 + 6) * 4, 255) };
  thumbs.forEach((t, k) => {
    const ox = (k % 2) * (231 * 2 + 6), oy = Math.floor(k / 2) * (87 * 2 + 6);
    for (let y = 0; y < 87 * 2; y++) for (let x = 0; x < 231 * 2; x++) {
      const s = ((y >> 1) * 231 + (x >> 1)) * 4, d = ((oy + y) * sheet.w + ox + x) * 4;
      t.px.copy(sheet.px, d, s, s + 4);
    }
  });
  fs.writeFileSync(path.join(out, 'thumbs_231x87_x2.png'), PNG.encode(sheet));
  const D = res.day.outside || 1;
  console.log('亮度（0–1）：全画面均值 / 光圈内中位数 / 光圈外中位数　（光圈外相对白天）');
  for (const k in res) console.log(`  ${k.padEnd(5)} ${res[k].all.toFixed(3)} / ${res[k].inside.toFixed(3)} / ${res[k].outside.toFixed(3)}　${Math.round(res[k].outside / D * 100)}%　绘制调用 ${res[k].calls}，三角形 ${res[k].tris}`);
  const nightK = res.night.outside / D;
  console.log(`夜晚光圈外亮度 = 白天的 ${Math.round(nightK * 100)}%（目标约 35%）；夜晚光圈内比光圈外亮 ${(res.night.inside / Math.max(0.001, res.night.outside)).toFixed(1)} 倍`);
  fs.writeFileSync(path.join(out, 'light.json'), JSON.stringify({ res, nightK, errors }, null, 2));
  console.log('截图：' + out + '　页面报错：' + (errors.join(' | ') || '无'));
  await browser.close(); server.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
