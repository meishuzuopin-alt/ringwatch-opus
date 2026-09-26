// 海外网页门户静态包：node tools/build-web.js [--out dist-web] [--ads none|crazygames] [--lang en|zh]
// 全部文件在本地。默认不加载 CrazyGames SDK，也不访问任何外网。
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
function flag(name, def) {
  const i = args.indexOf('--' + name);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  const eq = args.find(a => a.startsWith('--' + name + '='));
  if (eq) return eq.split('=').slice(1).join('=');
  return def;
}
const outDir = path.resolve(root, flag('out', 'dist-web'));
const ads = flag('ads', 'none');
const lang = flag('lang', 'en');
if (ads !== 'none' && ads !== 'crazygames') {
  console.error('ads 只能是 none 或 crazygames');
  process.exit(1);
}
if (lang !== 'en' && lang !== 'zh') {
  console.error('lang 只能是 en 或 zh');
  process.exit(1);
}

const preview = fs.readFileSync(path.join(root, 'preview.html'), 'utf8');
const scripts = [...preview.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]);
if (!scripts.includes('vendor/three.min.js')) {
  console.error('preview.html 没有本地 three.js');
  process.exit(1);
}
if (scripts.some(s => s === 'js/ads.js' || s.startsWith('js/ads-'))) {
  console.error('preview.html 不应加载广告脚本');
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

function copyFile(rel) {
  const from = path.join(root, rel);
  const to = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
for (const rel of scripts) copyFile(rel);
copyFile('vendor/three.LICENSE');
for (const name of fs.readdirSync(path.join(root, 'fonts'))) {
  const p = path.join(root, 'fonts', name);
  if (fs.statSync(p).isFile()) copyFile(path.join('fonts', name));
}
function walkCopy(rel) {
  const abs = path.join(root, rel);
  for (const name of fs.readdirSync(abs)) {
    const child = path.join(rel, name);
    const st = fs.statSync(path.join(root, child));
    if (st.isDirectory()) walkCopy(child);
    else copyFile(child);
  }
}
walkCopy('assets/sprites');
if (fs.existsSync(path.join(root, 'assets', 'branding'))) walkCopy('assets/branding');

const adapter = ads === 'crazygames' ? 'js/ads-crazygames.js' : 'js/ads-none.js';
copyFile(adapter);

const tags = scripts.map(s => `<script src="${s}"></script>`).join('\n');
const html = `<!DOCTYPE html>
<html lang="${lang === 'en' ? 'en' : 'zh-CN'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>${lang === 'en' ? 'Ringwatch' : '圣火守护者'}</title>
<link rel="icon" type="image/png" sizes="128x128" href="assets/branding/icon_128.png">
<link rel="apple-touch-icon" href="assets/branding/icon_256.png">
<link rel="manifest" href="manifest.webmanifest">
<style>
  html, body { margin: 0; height: 100%; background: #04060d; overflow: hidden;
    touch-action: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none;
    -webkit-touch-callout: none; }
  canvas { display: block; touch-action: none; position: absolute; left: 0; top: 0; }
  #rw-splash { position: fixed; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center;
    background: #04060d; pointer-events: none; }
  #rw-splash img { width: 128px; height: 128px; }
</style>
</head>
<body>
<div id="rw-splash"><img src="assets/branding/icon_256.png" width="128" height="128" alt="${lang === 'en' ? 'Ringwatch' : '圣火守护者'}"></div>
<canvas id="game"></canvas>
<script>window.RW_WEB = { web: true, lang: ${JSON.stringify(lang)}, ads: ${JSON.stringify(ads)} };</script>
${tags}
<script src="${adapter}"></script>
<script>RW.Main.start();</script>
</body>
</html>
`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
const manifest = {
  name: lang === 'en' ? 'Ringwatch' : '圣火守护者',
  short_name: lang === 'en' ? 'Ringwatch' : '圣火守护者',
  start_url: './index.html',
  display: 'fullscreen',
  background_color: '#04060d',
  theme_color: '#04060d',
  icons: [128, 256, 512, 1024].map(function (n) {
    return { src: 'assets/branding/icon_' + n + '.png', sizes: n + 'x' + n, type: 'image/png', purpose: 'any' };
  })
};
fs.writeFileSync(path.join(outDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');

// 英文包要能翻开菜单、教程、HUD、结算里的关键句
if (lang === 'en') {
  const saved = global.RW;
  global.RW = {};
  require(path.join(root, 'js', 'i18n.js'));
  const I = global.RW.I18n;
  I.setLang('en');
  const samples = ['圣火守护者', '开始守护', '玩法说明', '选择守火人', '火光', '生命垂危 ', '第 3 波', '守到第 12 波', '圣火长明', '自动迎敌', '再守一夜', '返回标题', '设置', '暂停', '波间整备', '看广告', '法师', '飞弩', '箭塔', '灭火者', '每日挑战', '火光纪录', '重燃圣火', '查看结算', 'Hold the last flame'];
  const bad = [];
  for (const s of samples) {
    const t = s === 'Hold the last flame' ? s : I.tr(s);
    if (/[\u3400-\u9fff]/.test(t)) bad.push(s + ' → ' + t);
    if (s === '圣火守护者' && t !== 'Ringwatch') bad.push('title ' + t);
  }
  global.RW = saved;
  if (bad.length) {
    console.error('英文关键句没译完：\n  ' + bad.join('\n  '));
    process.exit(1);
  }
}

let files = 0, bytes = 0;
const external = [];
function scan(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) scan(p);
    else {
      files++; bytes += st.size;
      if (/\.(html|js)$/i.test(name) && name !== 'three.min.js') {
        const text = fs.readFileSync(p, 'utf8');
        if (/src\s*=\s*["']https?:/i.test(text) || /href\s*=\s*["']https?:/i.test(text)) external.push(path.relative(outDir, p));
        if (/^\s*(fetch|XMLHttpRequest)\s*\(/m.test(text)) external.push(path.relative(outDir, p) + ' (runtime request)');
      }
    }
  }
}
scan(outDir);
const mb = bytes / (1024 * 1024);
const initial = mb;
const limits = [
  ['initial download', initial, 20, 'MB'],
  ['total size', mb, 250, 'MB'],
  ['file count', files, 1500, 'files']
];
console.log('网页包 ' + path.relative(root, outDir) + '/');
console.log('  广告提供方: ' + ads + (ads === 'none' ? '（Basic Launch，不加载 SDK，激励按钮不发奖）' : '（本地适配器，宿主注入 window.CrazyGames.SDK 才有广告）'));
console.log('  语言: ' + lang + (lang === 'en' ? '（标题 Ringwatch）' : ''));
console.log('  文件数: ' + files);
console.log('  总体积: ' + mb.toFixed(2) + ' MB（' + bytes + ' 字节）');
console.log('  初始下载: ' + initial.toFixed(2) + ' MB（没有分包；无 SDK 时初始下载＝总体积）');
console.log('  外链脚本/样式: ' + (external.length ? external.join(', ') : '0'));
let over = false;
for (const row of limits) {
  const pass = row[1] <= row[2];
  if (!pass) over = true;
  console.log('  限额 ' + row[0] + ' ≤ ' + row[2] + ' ' + row[3] + '：' + (pass ? '通过' : '超出') + '（' + (row[3] === 'files' ? row[1] : Number(row[1]).toFixed(2)) + '）');
}
const report = { ads, lang, files, bytes, mb: Math.round(mb * 100) / 100, initialMb: Math.round(initial * 100) / 100, external: external.length };
fs.writeFileSync(path.join(outDir, 'size-report.json'), JSON.stringify(report, null, 2) + '\n');
if (external.length || over) process.exit(1);
console.log('网页包通过体积与外链检查');
