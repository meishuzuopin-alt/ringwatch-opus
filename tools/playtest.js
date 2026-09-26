// 浏览器实机试玩脚本：node tools/playtest.js <输出目录> [波数]
// 用鼠标拖动（走真实的浮动摇杆输入链路）来操作，按阶段截图，收集控制台报错与帧时间。
const { chromium } = require('playwright');
const path = require('path');
const { serve, CHROMIUM_ARGS } = require('./lib/serve');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const out = path.resolve(process.argv[2] || 'shots');
const waves = +process.argv[3] || 2;
fs.mkdirSync(out, { recursive: true });


(async () => {
  const server = await serve();
  const port = server.address().port;
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(`http://localhost:${port}/preview.html?skipopening`);
  const balSrc = fs.readFileSync(path.join(root, 'tools/balance.js'), 'utf8');
  const botSrc = balSrc.slice(balSrc.indexOf('function botInput'), balSrc.indexOf('var PREF'));
  await page.addScriptTag({ content: botSrc });
  await page.waitForTimeout(600);
  const shot = async (name) => { await page.screenshot({ path: path.join(out, name + '.png') }); };
  // 逻辑坐标 -> 屏幕坐标
  const toScreen = async (x, y) => page.evaluate(([x, y]) => { const v = RW.Plat.view; return [v.ox + x * v.s, v.oy + y * v.s]; }, [x, y]);
  const tap = async (x, y) => { const [sx, sy] = await toScreen(x, y); await page.mouse.click(sx, sy); await page.waitForTimeout(120); };
  // 按按钮 id 点击（等按钮画出来再点它的中心）
  const press = async id => {
    await page.waitForFunction(id => RW.UI.btns.some(b => b.id === id), id, { timeout: 30000, polling: 50 });
    const r = await page.evaluate(id => { const b = RW.UI.btns.find(b => b.id === id); return [b.x + b.w / 2, b.y + b.h / 2]; }, id);
    await tap(r[0], r[1]);
  };
  const state = async () => page.evaluate(() => { const g = RW.game; return { mode: g.mode, wave: g.wave, hp: g.player.hp, shards: g.shardCount, t: g.wt, kills: g.kills, enemies: g.enemyCount }; });

  await shot('01_title');
  await press('start');           // 开始值守
  await shot('02_pick');
  // 默认英雄：PICKID 环境变量可指定（测试时绕过解锁）
  if (process.env.PICKID) await page.evaluate(id => { RW.game.prog.unlocked[id] = 1; RW.Main.action('pick:' + id); }, process.env.PICKID);
  else await press('pick:mage');
  await page.waitForTimeout(200);

  const log = [];
  let frameTimes = [];
  for (let wv = 1; wv <= waves; wv++) {
    // 拖动摇杆走位：按住，围绕中心画圈，并躲开最近的敌人
    let [cx, cy] = await toScreen(210, 560);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    let tick = 0, shotTaken = {};
    let built = false;
    while (true) {
      const s = await page.evaluate(() => {
        const g = RW.game, o = botInput(g, {});
        return { mode: g.mode, wave: g.wave, dx: o.mx, dy: o.my, dash: o.dash, skill: o.skill, t: g.wt, hp: g.player.hp, enemies: g.enemyCount, shards: g.shardCount, core: g.core.hp, stage: g.player.stage };
      });
      if (s.mode !== 'battle' && s.mode !== 'clear') break;
      await page.mouse.move(cx + s.dx * 40, cy + s.dy * 40, { steps: 2 });
      if (s.dash) await page.evaluate(() => RW.Main.battle('dash'));
      if (s.skill) await page.evaluate(() => RW.Main.battle('skill'));
      if (!built && s.t > 2 && s.shards >= 14) {
        built = true;
        await page.evaluate(() => RW.Main.battle('build'));
        await shot(`w${wv}_buildmenu`);
        await page.evaluate(w => RW.Main.battle('bt:' + (w % 2 ? 'sentry' : 'barracks')), wv);
      }
      tick++;
      const tInt = Math.floor(s.t);
      if (!shotTaken[tInt] && (tInt === 3 || tInt === 12 || (wv > 1 && tInt === 18))) { shotTaken[tInt] = 1; await shot(`w${wv}_t${tInt}`); }
      if (tick % 30 === 0) log.push(`w${s.wave} t=${s.t.toFixed(1)} hp=${s.hp.toFixed(1)} core=${Math.round(s.core)} stage=${s.stage} enemies=${s.enemies} shards=${s.shards}`);
      await page.waitForTimeout(40);
    }
    await page.mouse.up();
    const ft = await page.evaluate(() => new Promise(r => { const a = []; let l = performance.now(); let n = 0; function f(t) { a.push(t - l); l = t; if (++n < 60) requestAnimationFrame(f); else r(a); } requestAnimationFrame(f); }));
    frameTimes = frameTimes.concat(ft);
    const st = await state();
    log.push('WAVE END -> ' + JSON.stringify(st));
    if (st.mode !== 'shop') { await shot(`w${wv}_end_${st.mode}`); break; }
    await shot(`w${wv}_shop`);
    // 买一件最贵但买得起的
    const pick = await page.evaluate(() => { const g = RW.game; let bi = -1, bp = -1; g.shop.slots.forEach((s, i) => { if (s && !s.sold && s.kind !== 'none' && s.price <= g.shardCount && s.price > bp) { bp = s.price; bi = i; } }); return bi; });
    if (pick >= 0) {
      await press('buy:' + pick);
      await shot(`w${wv}_bought`);
      log.push('bought slot ' + pick + ' -> ' + JSON.stringify(await page.evaluate(() => ({ w: RW.game.weapons.map(w => w.id + w.tier), mods: RW.game.mods, towers: RW.game.towers.map(t => t.id), shards: RW.game.shardCount }))));
    }
    await press('next');         // 开始下一波
    await page.waitForTimeout(200);
  }
  const avg = frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, frameTimes.length);
  log.push('avg frame ms ' + avg.toFixed(2) + ' max ' + Math.max(...frameTimes).toFixed(1));
  fs.writeFileSync(path.join(out, 'log.txt'), log.join('\n') + '\n\nERRORS:\n' + errors.join('\n'));
  console.log(log.slice(-12).join('\n'));
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
  server.close();
  // 只有页面报错才算失败；swiftshader 的性能 warning 只记录不拦截
  if (errors.some(e => !e.startsWith('warning:'))) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
