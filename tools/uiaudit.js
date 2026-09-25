// 界面品质审计（需要 Playwright + Chromium）：node tools/uiaudit.js [截图目录，默认 shots/audit]
// 挨个打开每个界面，拦截 D.text / UI.button，检查：
//   · 文字超出 960×540 的逻辑画面
//   · 按钮文字比按钮宽（被挤出按钮外）
//   · 两段不同的文字互相压住（包围盒重叠超过小的那段的 35%）
// 同时记录战斗画面的绘制调用数和三角形数，每个界面截一张图。有问题时退出码为 1。
const path = require('path');
const fs = require('fs');
const http = require('http');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright'))); }

const root = path.resolve(__dirname, '..');
const out = path.resolve(root, process.argv[2] || 'shots/audit');
fs.mkdirSync(out, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
}).listen(0);

// 注入页面：记录一帧里画了哪些文字、在哪个按钮里
function hook() {
  const D = RW.Draw, UI = RW.UI, rec = { texts: [], btns: [] };
  let inBtn = null;
  const text0 = D.text;
  D.text = function (s, x, y, size, color, align, bold, stroke) {
    if (s != null && String(s).length && window.__auditOn) {
      const c = D.ctx; c.font = D.font(size, bold);
      const w = c.measureText(String(s)).width, a = align || 'left';
      const x0 = a === 'center' ? x - w / 2 : (a === 'right' ? x - w : x);
      rec.texts.push({ s: String(s), x0, x1: x0 + w, y0: y - size / 2, y1: y + size / 2, size, btn: inBtn });
    }
    return text0.apply(this, arguments);
  };
  const btn0 = UI.button;
  UI.button = function (id, x, y, w, h, label, opts) {
    if (window.__auditOn) rec.btns.push({ id, x, y, w, h });
    inBtn = { id, x, y, w, h };
    try { return btn0.apply(this, arguments); } finally { inBtn = null; }
  };
  // 盖在上面的遮罩 / 面板会挡住之前画的文字：这些文字不算重叠
  const cover = (x, y, w, h) => { rec.texts = rec.texts.filter(t => t.x1 <= x || t.x0 >= x + w || t.y1 <= y || t.y0 >= y + h); };
  const dim0 = UI.dim;
  UI.dim = function (a) { if (window.__auditOn && a >= 0.6) rec.texts = []; return dim0.apply(this, arguments); };
  const panel0 = UI.panel;
  UI.panel = function (x, y, w, h) { if (window.__auditOn) cover(x, y, w, h); return panel0.apply(this, arguments); };
  // 每帧开头清空：只看最后完整画出的一帧
  const frame0 = UI.frame;
  UI.frame = function () { if (window.__auditOn) { rec.texts = []; rec.btns = []; } return frame0.apply(this, arguments); };
  window.__audit = rec;
}
function collect() {
  const rec = window.__audit, W = 960, H = 540, issues = [];
  if (!rec.texts.length) issues.push('这一帧没录到文字');
  const T = rec.texts;
  for (const t of T) {
    if (t.x0 < -1 || t.x1 > W + 1 || t.y0 < -1 || t.y1 > H + 1) issues.push('出屏：「' + t.s.slice(0, 24) + '」 x ' + Math.round(t.x0) + '–' + Math.round(t.x1));
    if (t.btn && t.btn.w > 0 && (t.x1 - t.x0) > t.btn.w - 4) issues.push('按钮装不下：' + t.btn.id + ' 宽 ' + t.btn.w + '，「' + t.s.slice(0, 24) + '」宽 ' + Math.round(t.x1 - t.x0));
  }
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
    const a = T[i], b = T[j];
    if (a.s === b.s) continue;
    const ix = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), iy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    if (ix <= 0 || iy <= 0) continue;
    const small = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
    if (ix * iy > small * 0.35) issues.push('文字重叠：「' + a.s.slice(0, 16) + '」×「' + b.s.slice(0, 16) + '」');
  }
  return [...new Set(issues)];
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/preview.html`);
  await page.waitForFunction(() => window.RW && RW.Draw && RW.UI && RW.game, null, { timeout: 60000 });
  await page.evaluate(hook);
  const report = { screens: {}, perf: {}, errors };
  // 一个界面：先做准备，等画面稳定，再录一帧的文字
  // cond：进入这个界面该有的状态（比如 mode === 'shop'）。CI 上软件渲染很慢，靠固定延时会在界面切过去之前就操作
  async function screen(name, prep, settle, cond) {
    if (prep) await page.evaluate(prep);
    if (cond) await page.waitForFunction(cond, null, { timeout: 120000, polling: 100 });
    await page.waitForTimeout(settle || 1500);
    await page.evaluate(() => { window.__audit.texts.length = 0; window.__audit.btns.length = 0; window.__auditOn = true; });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => { window.__auditOn = false; });
    const issues = await page.evaluate(collect);
    report.screens[name] = issues;
    await page.screenshot({ path: path.join(out, name + '.png') });
    console.log((issues.length ? '✗ ' : '✓ ') + name + (issues.length ? '\n    ' + issues.slice(0, 12).join('\n    ') + (issues.length > 12 ? '\n    …共 ' + issues.length + ' 处' : '') : ''));
  }
  const M = a => 'RW.Main.action(' + JSON.stringify(a) + ')';
  await screen('01_title', null, 2500);
  await screen('02_howto', () => RW.Main.action('howto'));
  await screen('03_settings', () => { RW.Main.action('howtoClose'); RW.Main.action('settings'); });
  await screen('03b_keys', () => { RW.Main.action('keys'); RW.Main.action('keyset:cmd:post'); });
  await screen('04_records', () => { RW.Main.action('keysClose'); RW.Main.action('settingsClose'); RW.Main.action('records'); });
  await screen('05_pick', () => { RW.Main.action('home'); RW.Main.action('start'); });
  await screen('06_battle_w1', () => { RW.Main.action('pick:' + RW.UI.heroSel); }, 3000, () => RW.game.mode === 'battle');
  await screen('07_battle_mid', () => {
    const g = RW.game; g.player.hp = g.player.maxHp = 9999; g.core.hp = g.core.maxHp = 99999; g.shardCount = 999;
    g.startWave(8); g.buildTower('barracks'); g.player.x += 90; g.buildTower('sentry'); g.player.x -= 90;
    RW.UI.toast('审计：战斗中的提示条不许压住波次面板', 20);
  }, 6000);
  // 绘制开销（战斗中，一整帧所有渲染通道加起来）
  report.perf = await page.evaluate(() => new Promise(res => {
    const r = RW.GL && RW.GL.renderer; if (!r) { res(null); return; }
    r.info.autoReset = false; r.info.reset();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const i = r.info; const o = { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, enemies: RW.game.enemyCount };
      r.info.autoReset = true; res(o);
    }));
  }));
  console.log('  战斗画面：' + JSON.stringify(report.perf));
  await screen('08_respawn', () => { const g = RW.game; g.player.hp = 1; g.player.inv = 0; g.player.maxHp = 30; g.hurtPlayer(999, '审计', g.player.x + 5, g.player.y); }, 1500);
  await screen('09_pause', () => { RW.game.respawn(); RW.Main.battle('pause'); }, 800);
  await screen('10_revive', () => { RW.Main.action('resume'); RW.game.hurtCore(1e9, '审计'); }, 1500, () => RW.game.mode === 'revive');
  await screen('11_bless', () => { const g = RW.game; RW.Main.action('revive'); g.blessPending = 1; g.clearWave(); }, 1500, () => RW.game.mode === 'bless' && (RW.UI.toast('审计：提示条不许压住标题', 20), true));
  await screen('12_shop', () => { RW.Main.action('bless:0'); }, 1500, () => RW.game.mode === 'shop');
  await screen('13_stats', () => RW.Main.action('statsHelp'));
  await screen('14_form', () => { RW.Main.action('statsClose'); const g = RW.game; g.shardCount = 9999; g.core.lv = 2; g.applyCoreLevel(); RW.Main.action('upgrade'); });
  await screen('15_result_lose', () => { RW.Main.action('formClose'); RW.game.finishRun(); }, 1500, () => RW.game.mode === 'result');
  await screen('16_result_win', () => { RW.Main.action('again'); RW.Main.action('pick:' + RW.UI.heroSel); const g = RW.game; g.won = true; g.wave = RW.RUN.waves; g.finishRun(); }, 2000, () => RW.game.mode === 'result' && RW.game.result && RW.game.result.won);
  await browser.close();
  server.close();
  const n = Object.values(report.screens).reduce((a, b) => a + b.length, 0);
  fs.writeFileSync(path.join(out, 'ui.json'), JSON.stringify(report, null, 2));
  console.log('\n共 ' + Object.keys(report.screens).length + ' 个界面，' + n + ' 处问题；页面报错：' + (errors.length ? errors.join(' | ') : '无'));
  if (n || errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
