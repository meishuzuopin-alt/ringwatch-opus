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
    if (f.name.startsWith('.') || f.name === 'node_modules' || f.name === 'shots' || f.name === 'dist') continue;
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
if (wx.join() === web.join()) ok(`game.js 与 preview.html 都按同一顺序加载 ${wx.length} 个脚本`);
else bad(`加载清单不一致\n    game.js:      ${wx.join(' ')}\n    preview.html: ${web.join(' ')}`);
const onDisk = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f);
const orphan = onDisk.filter(f => !wx.includes(f));
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
for (const f of ['preview.html', 'js', 'vendor', 'desktop', 'fonts']) if (fs.existsSync(path.join(root, f))) bytes += sizeOf(path.join(root, f));
ok(`游戏文件约 ${(bytes / 1024).toFixed(0)} KB（不含 Electron 运行时）`);

// 字体：游戏里用到的每个字都要在子集里，否则会退回系统字体（改了文案后跑 npm run fonts）
console.log('字体与素材');
{
  const have = new Set(fs.existsSync(path.join(root, 'fonts', 'chars.txt')) ? [...fs.readFileSync(path.join(root, 'fonts', 'chars.txt'), 'utf8')] : []);
  const miss = new Set();
  const src = walk(path.join(root, 'js'), '.js').concat([path.join(root, 'preview.html')]);
  for (const f of src) for (const ch of fs.readFileSync(f, 'utf8')) if (ch.codePointAt(0) > 0x7f && !/\s/.test(ch) && !have.has(ch)) miss.add(ch);
  if (miss.size) bad(`字体子集缺 ${miss.size} 个字：${[...miss].slice(0, 30).join('')}${miss.size > 30 ? '…' : ''}　→ 跑 npm run fonts 重新生成`);
  else ok(`字体子集覆盖全部 ${have.size} 个字（fonts/，OFL 授权）`);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const files = pkg.build.files;
  if (files.some(f => /^docs|^shots|^tools/.test(f))) bad('安装包白名单里不能有 docs/、shots/、tools/：' + files.join(', '));
  const media = [];
  for (const d of files.map(f => f.replace(/\/\*\*$/, '')).filter(d => fs.existsSync(path.join(root, d)) && fs.statSync(path.join(root, d)).isDirectory()))
    for (const f of walk(path.join(root, d), '')) if (/\.(png|jpe?g|gif|webp|bmp|glb|gltf|fbx|obj|mp3|ogg|wav|flac|m4a)$/i.test(f)) media.push(path.relative(root, f));
  if (media.length) bad('安装包里有图片 / 模型 / 音频文件（硬规则 1）：' + media.join(', '));
  else ok('安装包白名单：' + files.join('、') + '；除字体外没有外部素材');
}

if (failed) { console.log(`\n${failed} 项失败`); process.exit(1); }
console.log('\n全部通过');
