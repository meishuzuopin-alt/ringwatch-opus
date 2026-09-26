// 提交前快速自检（不需要浏览器，几秒跑完）：node tools/check.js
// 1. 所有 js 语法检查  2. json 可解析  3. game.js 与 preview.html 加载的脚本清单与顺序一致
// 4. 无头模拟冒烟：两种职业各跑 3 波，确认逻辑不抛异常；玩法闭环测试（tools/simtest.js）  5. 统计桌面版游戏文件体积
// 6. 字体子集没有缺字；安装包只收白名单里的目录，除字体外没有图片 / 模型 / 音频文件（硬规则 1）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
let failed = 0;
const ok = msg => console.log('  ✓ ' + msg);
const bad = msg => { failed++; console.log('  ✗ ' + msg); };

function walk(dir, ext, acc = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name.startsWith('.') || f.name === 'node_modules' || f.name === 'shots' || f.name === 'dist' || f.name === 'dist-web') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, ext, acc); else if (p.endsWith(ext)) acc.push(p);
  }
  return acc;
}

console.log('语法');
const before = failed;
for (const f of walk(root, '.js')) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { bad(path.relative(root, f) + '\n' + e.stderr); }
}
if (failed === before) ok('js 语法通过');
for (const f of walk(root, '.json')) {
  try { JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { bad(path.relative(root, f) + ' ' + e.message); }
}
if (failed === before) ok('json 可解析');

console.log('入口一致性');
const wx = [...fs.readFileSync(path.join(root, 'game.js'), 'utf8').matchAll(/require\('\.\/(js\/[^']+)'\)/g)].map(m => m[1]);
// 允许浏览器缓存参数（如 js/audio.js?v=2），比较时去掉 ? 之后的部分
const web = [...fs.readFileSync(path.join(root, 'preview.html'), 'utf8').matchAll(/<script src="(js\/[^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]);
const isAds = f => f === 'js/ads.js' || /^js\/ads-/.test(f);
const wxGame = wx.filter(f => !isAds(f));
const webGame = web.filter(f => !isAds(f));
if (web.some(isAds)) bad('preview.html 不能加载广告脚本（桌面版入口）');
if (!wx.includes('js/ads.js')) bad('game.js 要加载 js/ads.js');
if (wxGame.join() === webGame.join()) ok(`game.js 与 preview.html 除广告脚本外按同一顺序加载 ${wxGame.length} 个脚本`);
else bad(`加载清单不一致\n    game.js:      ${wxGame.join(' ')}\n    preview.html: ${webGame.join(' ')}`);
const onDisk = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f);
const orphan = onDisk.filter(f => !wx.includes(f) && !web.includes(f) && !isAds(f));
if (orphan.length) bad('js/ 下有文件没被入口加载：' + orphan.join(' '));

console.log('模拟冒烟');
try {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'balance.js'), '1', '3', 'smart'], { encoding: 'utf8' });
  if (/NaN|undefined/.test(out)) bad('数值输出异常\n' + out); else ok('两种职业各跑 3 波无异常');
} catch (e) { bad('模拟抛异常\n' + (e.stderr || e.message)); }
console.log('玩法闭环');
try {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'simtest.js')], { encoding: 'utf8' });
  const lines = out.trim().split('\n').map(l => l.trim());
  ok('通关 / 无尽 / 危险 / 变异器 / 祝福 / 套装 / 进化 / 每日挑战 / 成就 / 局中存档 / 技能槽 / 性能预算：' + lines[lines.length - 1].replace(/^✓\s*/, ''));
  lines.slice(0, -1).forEach(l => console.log('    ' + l.replace(/^·\s*/, '')));
} catch (e) { bad('玩法闭环测试失败\n' + (e.stdout || '') + (e.stderr || e.message)); }

// 桌面（Steam）版会打进安装包的游戏文件：preview.html + js/ + vendor/ + desktop/（不含 Electron 运行时本身）
console.log('包体');
let bytes = 0;
function sizeOf(p) {
  const st = fs.statSync(p);
  if (!st.isDirectory()) return st.size;
  return fs.readdirSync(p).reduce((n, f) => n + sizeOf(path.join(p, f)), 0);
}
for (const f of ['preview.html', 'js', 'vendor', 'desktop', 'fonts', 'assets']) if (fs.existsSync(path.join(root, f))) bytes += sizeOf(path.join(root, f));
ok(`游戏文件约 ${(bytes / 1024).toFixed(0)} KB（不含 Electron 运行时）`);

// 精灵图集（负责人批准的 AI 生成素材，docs/ART.md「AI 素材」一节）：assets/sprites/<名>/<名>.png + <名>.json，
// json 里的元数据必须和 js/sprites.js 内嵌的 SPR.META 一致（运行时不读 json，Electron 的 file:// 下 fetch 不可靠）
console.log('精灵图集');
const spriteOK = new Set();
const brandOK = new Set();
{
  const dir = path.join(root, 'assets', 'sprites');
  const artDoc = fs.existsSync(path.join(root, 'docs', 'ART.md')) ? fs.readFileSync(path.join(root, 'docs', 'ART.md'), 'utf8') : '';
  let META = null;
  try {
    global.RW = {};
    require(path.join(root, 'js', 'sprites.js'));
    META = global.RW.SPR.META;
  } catch (e) { bad('js/sprites.js 在 Node 里加载失败：' + e.message); }
  const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => fs.statSync(path.join(dir, n)).isDirectory()) : [];
  for (const n of names) {
    const png = path.join(dir, n, n + '.png'), json = path.join(dir, n, n + '.json');
    if (!fs.existsSync(png) || !fs.existsSync(json)) { bad(`assets/sprites/${n}/ 缺 ${n}.png 或 ${n}.json`); continue; }
    if (!artDoc.includes(`assets/sprites/${n}/${n}.png`)) { bad(`docs/ART.md 没有记录 assets/sprites/${n}/${n}.png 的来源与提示词`); continue; }
    const j = JSON.parse(fs.readFileSync(json, 'utf8'));
    if (META && JSON.stringify(sortKeys(j)) !== JSON.stringify(sortKeys(META[n] || null))) { bad(`js/sprites.js 里 SPR.META.${n} 与 assets/sprites/${n}/${n}.json 不一致`); continue; }
    if (j.image !== n + '.png' || j.cols !== 4 || !j.rows || j.rows.attack !== 5) { bad(`assets/sprites/${n}/${n}.json 格式不对（4 列 6 行、attack 行 = 5）`); continue; }
    spriteOK.add(path.relative(root, png).replace(/\\/g, '/'));
  }
  const extra = META ? Object.keys(META).filter(n => !names.includes(n)) : [];
  if (extra.length) bad('js/sprites.js 的 SPR.META 里有图集没有对应文件：' + extra.join(', '));
  const others = fs.existsSync(dir) ? walk(dir, '').filter(f => !/\.(png|json)$/.test(f)) : [];
  if (others.length) bad('assets/sprites/ 下只能放图集 png 和 json：' + others.map(f => path.relative(root, f).replace(/\\/g, '/')).join(', '));
  if (spriteOK.size) ok(`${spriteOK.size} 套图集（${[...spriteOK].map(f => path.basename(f, '.png')).join('、')}）都有元数据、有 ART.md 记录、与 SPR.META 一致`);
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v).sort()) o[k] = sortKeys(v[k]); return o; }
  return v;
}

// 字体：游戏里用到的每个字都要在子集里，否则会退回系统字体（改了文案后跑 npm run fonts）
console.log('字体与素材');
{
  const have = new Set(fs.existsSync(path.join(root, 'fonts', 'chars.txt')) ? [...fs.readFileSync(path.join(root, 'fonts', 'chars.txt'), 'utf8')] : []);
  const miss = new Set([...require('./lib/chars').usedChars(root)].filter(ch => ch.codePointAt(0) > 0x7f && !have.has(ch)));
  if (miss.size) bad(`字体子集缺 ${miss.size} 个字：${[...miss].slice(0, 30).join('')}${miss.size > 30 ? '…' : ''}　→ 跑 npm run fonts 重新生成`);
  else ok(`字体子集覆盖全部 ${have.size} 个字（fonts/，OFL 授权）`);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const files = pkg.build.files;
  const brandRel = ['assets/branding/icon_1024.png', 'assets/branding/icon_512.png', 'assets/branding/icon_256.png', 'assets/branding/icon_128.png'];
  const artDoc = fs.existsSync(path.join(root, 'docs', 'ART.md')) ? fs.readFileSync(path.join(root, 'docs', 'ART.md'), 'utf8') : '';
  for (const rel of brandRel) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) { bad('缺正式图标 ' + rel); continue; }
    const buf = Buffer.alloc(24);
    const fd = fs.openSync(p, 'r');
    fs.readSync(fd, buf, 0, 24, 0);
    fs.closeSync(fd);
    const want = +rel.match(/icon_(\d+)/)[1];
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    if (buf.toString('ascii', 1, 4) !== 'PNG' || w !== want || h !== want) bad(rel + ' 应为 ' + want + '×' + want + ' PNG');
    else brandOK.add(rel);
  }
  const brandDir = path.join(root, 'assets', 'branding');
  if (fs.existsSync(brandDir)) {
    const stray = walk(brandDir, '').map(f => path.relative(root, f).replace(/\\/g, '/')).filter(f => !brandOK.has(f));
    if (stray.length) bad('assets/branding/ 只放正式图标：' + stray.join(', '));
  }
  if (!artDoc.includes('assets/branding/icon_1024.png') || !artDoc.includes('ChatGPT') || !artDoc.includes('2026-09-26') || !artDoc.includes('石台')) bad('docs/ART.md 没有登记正式图标的来源、日期和候选 2（石台 / 火盆）');
  else if (brandOK.size === brandRel.length) ok('正式图标 1024 / 512 / 256 / 128 已登记');
  if (files.some(f => /^docs|^shots|^tools/.test(f))) bad('安装包白名单里不能有 docs/、shots/、tools/：' + files.join(', '));
  const media = [];
  for (const d of files.map(f => f.replace(/\/\*\*$/, '')).filter(d => fs.existsSync(path.join(root, d)) && fs.statSync(path.join(root, d)).isDirectory()))
    for (const f of walk(path.join(root, d), '')) {
      const rel = path.relative(root, f).replace(/\\/g, '/');
      if (/\.(png|jpe?g|gif|webp|bmp|glb|gltf|fbx|obj|mp3|ogg|wav|flac|m4a)$/i.test(f) && !spriteOK.has(rel) && !brandOK.has(rel)) media.push(rel);
    }
  if (media.length) bad('安装包里有图片 / 模型 / 音频文件（硬规则 1；批准过的精灵图集和正式图标除外）：' + media.join(', '));
  else ok('安装包白名单：' + files.join('、') + '；除字体、批准过的精灵图集和正式图标外没有外部素材');
}

console.log('夜战');
try {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'nighttest.js'), '--runs', '1', '--policy', 'god', '--seed', '1'], { encoding: 'utf8' });
  if (!/won=1/.test(out) || !/hold=100/.test(out)) bad('无敌夜没有守满 180 秒\n' + out);
  else ok(out.trim().split('\n').pop());
} catch (e) { bad('夜战无头模拟失败\n' + (e.stdout || '') + (e.stderr || e.message)); }

console.log('广告');
{
  const sdk = /createRewardedVideoAd|adUnitId|RewardedVideoAd/;
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const skip = new Set(['js/ads.js']);
  const packaged = [];
  for (const f of walk(path.join(root, 'js'), '.js')) {
    const rel = path.relative(root, f).replace(/\\/g, '/');
    if (skip.has(rel) || /^js\/ads-/.test(rel)) continue;
    packaged.push(rel);
  }
  packaged.push('preview.html');
  for (const f of walk(path.join(root, 'desktop'), '.js')) packaged.push(path.relative(root, f).replace(/\\/g, '/'));
  const hits = [];
  for (const rel of packaged) {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    if (sdk.test(text)) hits.push(rel);
  }
  if (hits.length) bad('桌面版会打进包的文件里出现广告 SDK 字符串：' + hits.join(' '));
  else ok('广告 SDK 字符串只在 js/ads.js（package.json 已排除 ' + (pkg.build.files.filter(f => f.startsWith('!js/ads')).join(' ') || '未排除') + '）');
  const probe = `
    const root = ${JSON.stringify(root)};
    require(root + '/js/data.js');
    require(root + '/js/ads.js');
    const RW = globalThis.RW;
    const closed = [];
    globalThis.wx = { createRewardedVideoAd() {
      const ad = { onClose(fn){ ad._c = fn; }, onError(){}, show(){ return Promise.resolve(); }, load(){ return Promise.resolve(); } };
      closed.push(ad); return ad;
    } };
    function trial(res) {
      let g = 0, f = 0;
      RW.Ads.show('revive', 'unit-test', () => { g++; }, () => { f++; });
      closed[closed.length - 1]._c(res);
      return g + ':' + f;
    }
    const a = trial(undefined), b = trial({ isEnded: false }), c = trial({ isEnded: true });
    if (a !== '0:1' || b !== '0:1' || c !== '1:0') { console.error('grant ' + [a, b, c].join(' ')); process.exit(1); }
    console.log('ok');
  `;
  try {
    const out = execFileSync(process.execPath, ['-e', probe], { encoding: 'utf8' });
    if (!/ok/.test(out)) bad('广告完成判定异常\n' + out);
    else ok('未结束 / 看完一半不发奖，isEnded 为真才发');
  } catch (e) { bad('广告完成判定失败\n' + (e.stdout || '') + (e.stderr || e.message)); }
  const cg2 = `
    const root = ${JSON.stringify(root)};
    require(root + '/js/data.js');
    require(root + '/js/ads-crazygames.js');
    const RW = globalThis.RW;
    let last = null;
    globalThis.CrazyGames = { SDK: { game: {
      gameplayStart() {}, gameplayStop() {}, loadingStart() {}, loadingStop() {}
    }, ad: { requestAd(kind, cbs) { last = { kind, cbs }; } } } };
    function once(fire) {
      let g = 0, f = 0;
      RW.AdsCrazy.show('revive', () => { g++; }, () => { f++; });
      fire(last.cbs);
      return g + ':' + f + ':' + (RW.AdsCrazy.holding ? 1 : 0);
    }
    const err = once(cbs => cbs.adError(new Error('blocked')));
    const half = once(cbs => { cbs.adStarted(); cbs.adFinished({ isEnded: false }); });
    const done = once(cbs => { cbs.adStarted(); cbs.adFinished(); });
    const mid = (function () {
      let g = 0, f = 0;
      RW.AdsCrazy.show('midgame', () => { g++; }, () => { f++; });
      last.cbs.adFinished();
      return g + ':' + f;
    })();
    if (last.kind !== 'midgame') { console.error('kind ' + last.kind); process.exit(1); }
    if (err !== '0:1:0' || half !== '0:1:0' || done !== '1:0:0' || mid !== '1:0') {
      console.error([err, half, done, mid].join(' | ')); process.exit(1);
    }
    let extra = 0;
    globalThis.CrazyGames.SDK.ad.requestAd = function (kind, cbs) { extra++; last = { kind: kind, cbs: cbs }; };
    function grant(kind) {
      let g = 0, f = 0, n0 = extra;
      RW.AdsCrazy.show(kind, function () { g++; }, function () { f++; });
      const requested = extra > n0;
      if (requested && last && last.cbs) last.cbs.adFinished();
      return g + ':' + f + ':' + (requested ? 'ad' : 'noad');
    }
    const capRevive = grant('revive');
    const reroll1 = grant('reroll');
    const reroll2 = grant('reroll');
    const double1 = grant('double');
    const double2 = grant('double');
    RW.AdsCrazy.beginRun();
    const skipN = (RW.AD && RW.AD.MIDGAME_SKIP_RUNS != null) ? RW.AD.MIDGAME_SKIP_RUNS : 2;
    const nEarly = extra;
    for (let i = 0; i < skipN; i++) RW.AdsCrazy.noteRun();
    RW.AdsCrazy.midgame(function () {});
    const early = extra - nEarly;
    RW.AdsCrazy.noteRun();
    const nLate = extra;
    RW.AdsCrazy.midgame(function () {});
    if (extra > nLate && last && last.cbs) last.cbs.adFinished();
    const late = extra - nLate;
    const nAgain = extra;
    RW.AdsCrazy.midgame(function () {});
    const again = extra - nAgain;
    if (capRevive !== '0:1:noad' || reroll1 !== '1:0:ad' || reroll2 !== '0:1:noad' || double1 !== '1:0:ad' || double2 !== '0:1:noad' || early !== 0 || late !== 1 || again !== 0) {
      console.error(['caps', capRevive, reroll1, reroll2, double1, double2, 'mid', early, late, again].join(' '));
      process.exit(1);
    }
    console.log('ok');
  `;
  try {
    const out = execFileSync(process.execPath, ['-e', cg2], { encoding: 'utf8' });
    if (!/ok/.test(out)) bad('CrazyGames 适配器异常\n' + out);
    else ok('CrazyGames：看完才发；复活每会话 1 次，刷新和翻倍每局 1 次；前两局不中插，中插至少隔 3 分钟');
  } catch (e) { bad('CrazyGames 适配器失败\n' + (e.stdout || '') + (e.stderr || e.message)); }
}

console.log('网页包');
try {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'build-web.js')], { encoding: 'utf8' });
  if (!/网页包通过体积与外链检查/.test(out)) bad('网页包检查没通过\n' + out);
  else ok(out.trim().split('\n').slice(-6).join('；'));
} catch (e) { bad('网页包构建失败\n' + (e.stdout || '') + (e.stderr || e.message)); }

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('\n全部通过');
