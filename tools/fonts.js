// 字体子集化：node tools/fonts.js（npm run fonts）
// 项目唯一的外部素材例外（AGENTS.md 硬规则 1）：思源 / Noto 中文字体，SIL OFL 1.1 授权。
// 从 npm 上的固定版本下载原字体（校验 sha512），只保留游戏里真正用到的字，输出 woff2 到 fonts/。
// 改了文案以后重跑一遍；npm run check 会拦下字体里缺的字。
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'fonts');
const cache = path.join(root, 'node_modules', '.cache', 'fg-fonts');

// 原字体来源：Google Fonts 的 Noto Serif SC / Noto Sans SC（经 @expo-google-fonts 打包在 npm 上）
const PKGS = {
  serif: { tgz: 'https://registry.npmjs.org/@expo-google-fonts/noto-serif-sc/-/noto-serif-sc-0.4.3.tgz', sha512: 'fSmUpiSFtSeyHV45/2xUOy5SdfExklQwwMKN3cQjAZAujITHDmSbpMHCVdCMhRqMjQtu0ZRgc29u8A+CU3akfw==' },
  sans: { tgz: 'https://registry.npmjs.org/@expo-google-fonts/noto-sans-sc/-/noto-sans-sc-0.4.3.tgz', sha512: '9rAwdFTFHbO/u6Cs0gj2jZbW74TGIiaFNQnXYH2s5wA1bzVkwbaviL4t8YUV642eGYjg86eH6DkAEQmfNHDncQ==' }
};
// 游戏里用到的三个字重：标题用宋体特粗，正文用黑体中等 / 粗
const FACES = [
  { pkg: 'serif', file: 'package/900Black/NotoSerifSC_900Black.ttf', out: 'fg-serif-900.woff2' },
  { pkg: 'sans', file: 'package/500Medium/NotoSansSC_500Medium.ttf', out: 'fg-sans-500.woff2' },
  { pkg: 'sans', file: 'package/700Bold/NotoSansSC_700Bold.ttf', out: 'fg-sans-700.woff2' }
];

function get(url) {
  return new Promise((res, rej) => https.get(url, r => {
    if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) return get(r.headers.location).then(res, rej);
    if (r.statusCode !== 200) return rej(new Error(url + ' → ' + r.statusCode));
    const bufs = []; r.on('data', b => bufs.push(b)); r.on('end', () => res(Buffer.concat(bufs)));
  }).on('error', rej));
}
// 读 tar 包里的一个文件（npm 包是 gzip 的 ustar）
function untar(buf, name) {
  for (let o = 0; o + 512 <= buf.length;) {
    const h = buf.subarray(o, o + 512);
    if (!h[0]) break;
    const str = (a, b) => h.subarray(a, b).toString('utf8').replace(/\0.*$/s, '');
    const full = (str(345, 500) ? str(345, 500) + '/' : '') + str(0, 100);
    const size = parseInt(str(124, 136).trim() || '0', 8);
    if (full === name) return buf.subarray(o + 512, o + 512 + size);
    o += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error('包里没有 ' + name);
}
async function source(pkg) {
  const p = PKGS[pkg], f = path.join(cache, pkg + '.tgz');
  let tgz = fs.existsSync(f) ? fs.readFileSync(f) : null;
  if (!tgz) { console.log('下载 ' + p.tgz); tgz = await get(p.tgz); fs.mkdirSync(cache, { recursive: true }); fs.writeFileSync(f, tgz); }
  const sum = crypto.createHash('sha512').update(tgz).digest('base64');
  if (sum !== p.sha512) { fs.rmSync(f, { force: true }); throw new Error(pkg + ' 校验不符，已删除缓存，请重跑'); }
  return zlib.gunzipSync(tgz);
}

(async () => {
  const subset = require('subset-font');
  const chars = require('./lib/chars').usedChars(root);
  fs.mkdirSync(out, { recursive: true });
  const tars = {};
  for (const face of FACES) {
    const tar = tars[face.pkg] || (tars[face.pkg] = await source(face.pkg));
    const woff2 = await subset(untar(tar, face.file), chars, { targetFormat: 'woff2' });
    fs.writeFileSync(path.join(out, face.out), woff2);
    console.log(`  ${face.out}  ${(woff2.length / 1024).toFixed(0)} KB`);
  }
  fs.writeFileSync(path.join(out, 'OFL.txt'), untar(tars.serif, 'package/LICENSE_FONT'));
  fs.writeFileSync(path.join(out, 'chars.txt'), chars);
  console.log(`字体子集：${[...chars].length} 个字 → fonts/`);
})().catch(e => { console.error(e.message || e); process.exit(1); });
