// 无头冒烟：dist-web 能起来，隐身模式存档被拦也不抛错，点一下能进选人。最多一张截图。
// node tools/web-smoke.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist-web');
const shotDir = path.join(root, 'shots');

execFileSync(process.execPath, [path.join(__dirname, 'build-web.js')], { stdio: 'inherit' });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain'
};
function serve(dir) {
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/') u = '/index.html';
    const f = path.join(dir, u);
    if (!f.startsWith(dir + path.sep) && f !== dir) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  const { chromium } = require('playwright');
  const { CHROMIUM_ARGS } = require('./lib/serve');
  const server = await serve(out);
  const port = server.address().port;
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', req => {
    const u = req.url();
    if (/^https?:\/\//.test(u) && !u.startsWith('http://127.0.0.1:' + port) && !u.startsWith('http://localhost:' + port)) errors.push('external: ' + u);
  });
  await page.addInitScript(() => {
    const fail = () => { throw new Error('localStorage blocked'); };
    Object.defineProperty(window, 'localStorage', { configurable: true, get: fail });
  });
  await page.goto('http://127.0.0.1:' + port + '/index.html?2d', { waitUntil: 'load' });
  await page.waitForFunction(() => window.RW && RW.game && RW.game.mode === 'title' && RW.I18n && RW.I18n.lang === 'en' && RW.UI.btns.some(b => b.id === 'start'), null, { timeout: 30000 });
  const title = await page.title();
  if (title !== 'Ringwatch') errors.push('title ' + title);
  const provider = await page.evaluate(() => RW.Plat.adProvider);
  if (provider !== 'none') errors.push('ads ' + provider);
  const brand = await page.evaluate(() => ({
    icon: !!document.querySelector('link[rel="icon"][href="assets/branding/icon_128.png"]'),
    manifest: !!document.querySelector('link[rel="manifest"]'),
    splash: !!document.getElementById('rw-splash')
  }));
  if (!brand.icon || !brand.manifest) errors.push('favicon 或 manifest 没挂上');
  if (brand.splash) errors.push('加载画面在第一帧之后还在');
  fs.mkdirSync(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, 'web-boot.png') });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(200);
  const boxed = await page.evaluate(() => {
    const v = RW.Plat.view;
    var wide = Math.abs(v.cssW / v.cssH - 960 / 540) > 0.08;
    return v.cssW > 0 && v.cssH > 0 && (!wide || v.ox > 1 || v.oy > 1);
  });
  if (!boxed) errors.push('resize did not letterbox');
  const start = await page.evaluate(() => {
    const b = RW.UI.btns.find(x => x.id === 'start');
    const v = RW.Plat.view;
    return [v.ox + (b.x + b.w / 2) * v.s, v.oy + (b.y + b.h / 2) * v.s];
  });
  await page.touchscreen.tap(start[0], start[1]);
  await page.waitForFunction(() => RW.game.mode === 'pick', null, { timeout: 10000 });
  await browser.close();
  server.close();
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log('网页包冒烟通过：英文标题、无外链、隐身存档、缩放留边、触摸进入选人');
})().catch(err => { console.error(err); process.exit(1); });
