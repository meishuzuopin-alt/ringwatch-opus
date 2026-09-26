// 画面对照拼图：node tools/artcompare.js 输出.png 标题1=目录1 标题2=目录2 … [--names 03_day,05_night]
// 每一行是同一张截图（同机位），每一列是一个版本；缩到一半宽拼在一起，方便评审「原版 / 当前默认 / 全开」。
const fs = require('fs');
const path = require('path');
const PNG = require('./lib/png');

const args = process.argv.slice(2);
const out = args.shift();
let names = ['01_title', '03_day', '04_dusk', '05_night', '06_boss', '19_combat'];
const cols = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--names') { names = args[++i].split(','); continue; }
  const k = args[i].indexOf('=');
  cols.push({ title: args[i].slice(0, k), dir: args[i].slice(k + 1) });
}
const W = 640, H = 360, GAP = 6;
const sheet = { w: cols.length * (W + GAP) - GAP, h: names.length * (H + GAP) - GAP, px: null };
sheet.px = Buffer.alloc(sheet.w * sheet.h * 4, 255);
names.forEach((n, r) => cols.forEach((col, c) => {
  const f = path.join(col.dir, n + '.png');
  if (!fs.existsSync(f)) return;
  const img = PNG.resize(PNG.decode(fs.readFileSync(f)), W, H);
  for (let y = 0; y < H; y++) img.px.copy(sheet.px, ((r * (H + GAP) + y) * sheet.w + c * (W + GAP)) * 4, y * W * 4, (y + 1) * W * 4);
}));
fs.writeFileSync(out, PNG.encode(sheet));
console.log(`对照图 ${sheet.w}×${sheet.h}：列 = ${cols.map(c => c.title).join(' / ')}；行 = ${names.join(' / ')} → ${out}`);
