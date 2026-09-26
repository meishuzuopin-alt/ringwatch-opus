// 游戏图标：纯代码画（夜蓝底 + 圣火 + 火盆），输出 PNG / ICO 字节，不引入任何图片文件（硬规则 1）。
// 打包时 tools/icon.js 用它生成 build/icon.ico、build/icon.png；桌面版运行时用它设窗口图标。
const zlib = require('zlib');

const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const NIGHT = hex('#1E2A4A'), DEEP = hex('#0B1022'), EMBER = hex('#E8702A'), GOLD = hex('#FFB547'), CORE = hex('#FFF3CF'),
  BRONZE = hex('#5A3A22'), RIM = hex('#C98A3A'), STONE = hex('#3A3F52');

// 火焰轮廓：上尖下圆的水滴，带一点摆动；s 为缩放（内焰用更小的 s）
function flame(u, v, s, top, bottom) {
  const t = (v - top) / (bottom - top);
  if (t < 0 || t > 1) return false;
  const half = s * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.9) * (0.55 + 0.45 * t);
  const sway = 0.035 * Math.sin(t * 6.5 + 0.6) * (1 - t);
  return Math.abs(u - sway) < half;
}

// 一个采样点的颜色（x、y 取 0–1），返回 [r, g, b, a]
function sample(x, y) {
  // 圆角方形底板
  const r = 0.18, dx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0), dy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0);
  if (dx * dx + dy * dy > r * r) return [0, 0, 0, 0];
  const d = Math.hypot(x - 0.5, y - 0.52);
  let c = mix(NIGHT, DEEP, Math.min(1, d * 1.6));
  c = mix(c, EMBER, Math.max(0, 0.42 - d) * 1.1);          // 火光照亮的一圈
  const u = x - 0.5;
  // 火盆：梯形盆身 + 金色盆沿 + 石台
  if (y > 0.83 && y < 0.9 && Math.abs(u) < 0.26) return [...STONE, 1];
  if (y > 0.68 && y < 0.83) {
    const w = 0.24 - (y - 0.68) * 0.6;
    if (Math.abs(u) < w) return [...(y < 0.705 ? RIM : BRONZE), 1];
  }
  if (flame(u, y, 0.2, 0.1, 0.72)) {
    let f = mix(EMBER, GOLD, Math.min(1, (y - 0.1) / 0.5));
    if (flame(u, y, 0.1, 0.34, 0.71)) f = mix(GOLD, CORE, 0.8);
    return [...f, 1];
  }
  return [...c, 1];
}

// 渲染 size×size 的 RGBA，4×4 超采样抗锯齿
function pixels(size) {
  const px = Buffer.alloc(size * size * 4), N = 4;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let R = 0, G = 0, B = 0, A = 0;
    for (let sj = 0; sj < N; sj++) for (let si = 0; si < N; si++) {
      const s = sample((i + (si + 0.5) / N) / size, (j + (sj + 0.5) / N) / size);
      R += s[0] * s[3]; G += s[1] * s[3]; B += s[2] * s[3]; A += s[3];
    }
    const o = (j * size + i) * 4;
    px[o] = A ? R / A : 0; px[o + 1] = A ? G / A : 0; px[o + 2] = A ? B / A : 0; px[o + 3] = 255 * A / (N * N);
  }
  return px;
}

const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const px = pixels(size), raw = Buffer.alloc((size * 4 + 1) * size);
  for (let j = 0; j < size; j++) { raw[j * (size * 4 + 1)] = 0; px.copy(raw, j * (size * 4 + 1) + 1, j * size * 4, (j + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
// Windows 图标：多个尺寸的 PNG 装进一个 ICO
function ico(sizes) {
  const imgs = sizes.map(png), head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let off = head.length;
  sizes.forEach((s, k) => {
    const e = 6 + 16 * k;
    head[e] = s >= 256 ? 0 : s; head[e + 1] = s >= 256 ? 0 : s; head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(imgs[k].length, e + 8); head.writeUInt32LE(off, e + 12); off += imgs[k].length;
  });
  return Buffer.concat([head, ...imgs]);
}

module.exports = { png, ico };
