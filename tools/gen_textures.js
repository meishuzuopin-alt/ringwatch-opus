#!/usr/bin/env node
'use strict';

// FG-TEX-001：确定性生成手绘场景贴图。只依赖 Node 内置模块。
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'textures');
const entries = [];
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();

function crc32(b) { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const l = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); l.writeUInt32BE(data.length); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function png(img) {
  const raw = Buffer.alloc((img.w * 4 + 1) * img.h);
  for (let y = 0; y < img.h; y++) img.px.copy(raw, y * (img.w * 4 + 1) + 1, y * img.w * 4, (y + 1) * img.w * 4);
  const h = Buffer.alloc(13); h.writeUInt32BE(img.w, 0); h.writeUInt32BE(img.h, 4); h[8] = 8; h[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', h), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255, 255]; }
function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
function image(w, h, col) { const p = Buffer.alloc(w * h * 4); for (let i = 0; i < w * h; i++) for (let k = 0; k < 4; k++) p[i * 4 + k] = col[k]; return { w, h, px: p }; }
function set(im, x, y, c, alpha) { x = (x % im.w + im.w) % im.w; y = (y % im.h + im.h) % im.h; const o = (y * im.w + x) * 4, a = alpha == null ? (c[3] / 255) : alpha; for (let k = 0; k < 3; k++) im.px[o + k] = Math.round(im.px[o + k] * (1 - a) + c[k] * a); im.px[o + 3] = Math.round(255 * (a + im.px[o + 3] / 255 * (1 - a))); }
function hash(x, y, seed) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed, 1442695041); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967295; }
function noise(x, y, period, seed) { const X = Math.floor(x), Y = Math.floor(y), fx = x - X, fy = y - Y, s = t => t * t * (3 - 2 * t), ix = (X % period + period) % period, iy = (Y % period + period) % period; const a = hash(ix, iy, seed), b = hash((ix + 1) % period, iy, seed), c = hash(ix, (iy + 1) % period, seed), d = hash((ix + 1) % period, (iy + 1) % period, seed); return (a + (b - a) * s(fx)) + ((c + (d - c) * s(fx)) - (a + (b - a) * s(fx))) * s(fy); }
function paper(im, base, seed, amount) { for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) { const n = (noise(x / 32, y / 32, Math.max(1, im.w / 32), seed) - .5) * amount + (noise(x / 8, y / 8, Math.max(1, im.w / 8), seed + 9) - .5) * amount * .32; set(im, x, y, n > 0 ? [255, 235, 205, 255] : [30, 42, 50, 255], Math.abs(n)); } return im; }
function line(im, x0, y0, x1, y1, width, c, alpha) { const minX = Math.floor(Math.min(x0, x1) - width), maxX = Math.ceil(Math.max(x0, x1) + width), minY = Math.floor(Math.min(y0, y1) - width), maxY = Math.ceil(Math.max(y0, y1) + width), dx = x1 - x0, dy = y1 - y0, dd = dx * dx + dy * dy; for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) { const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / dd)), d = Math.hypot(x - x0 - t * dx, y - y0 - t * dy); if (d < width) set(im, x, y, c, alpha * Math.min(1, width - d)); } }
function ellipse(im, cx, cy, rx, ry, c, alpha) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const d = Math.hypot((x - cx) / rx, (y - cy) / ry); if (d < 1) set(im, x, y, c, alpha * Math.min(1, (1 - d) * 4)); } }
function rect(im, x0, y0, x1, y1, c, alpha) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(im, x, y, c, alpha); }
function downsample(src, size) { const out = image(size, size, [0, 0, 0, 0]), sx = src.w / size, sy = src.h / size; for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const sum = [0, 0, 0, 0]; let n = 0; for (let yy = Math.floor(y * sy); yy < Math.floor((y + 1) * sy); yy++) for (let xx = Math.floor(x * sx); xx < Math.floor((x + 1) * sx); xx++) { const o = (yy * src.w + xx) * 4; for (let k = 0; k < 4; k++) sum[k] += src.px[o + k]; n++; } const d = (y * size + x) * 4; for (let k = 0; k < 4; k++) out.px[d + k] = sum[k] / n; } return out; }
function save(id, file, im, tile, use, sampling) { const data = png(im); fs.writeFileSync(path.join(OUT, file), data); entries.push({ id, file, sha256: crypto.createHash('sha256').update(data).digest('hex'), width: im.w, height: im.h, tileable: tile, purpose: use, three: sampling || { wrapS: tile ? 'RepeatWrapping' : 'ClampToEdgeWrapping', wrapT: tile ? 'RepeatWrapping' : 'ClampToEdgeWrapping', minFilter: 'LinearMipmapLinearFilter', magFilter: 'LinearFilter', colorSpace: 'SRGBColorSpace', anisotropy: 4, generateMipmaps: true }, estimatedVramBytes: Math.ceil(im.w * im.h * 4 * 4 / 3) }); }

function ground(kind) {
  const colors = { grass: ['#657D4B', '#798B58'], dirt: ['#A77D58', '#C9A27A'], plaza: ['#887E70', '#B7A38A'], field: ['#A67D43', '#C9A27A'] }[kind], im = paper(image(512, 512, rgb(colors[0])), rgb(colors[0]), 20 + kind.length, .16);
  if (kind === 'grass') for (let i = 0; i < 180; i++) { const x = hash(i, 2, 3) * 512, y = hash(i, 5, 7) * 512; line(im, x, y + 5, x + (hash(i, 8, 2) - .5) * 5, y - 5, 1.2, rgb(colors[1]), .26); }
  if (kind === 'dirt') for (let i = 0; i < 70; i++) ellipse(im, hash(i, 2, 4) * 512, hash(i, 4, 8) * 512, 2 + hash(i, 6, 5) * 6, 1 + hash(i, 7, 9) * 3, rgb('#7A5234'), .18);
  if (kind === 'plaza') { for (let y = 0; y < 512; y += 64) { line(im, 0, y, 512, y, 2, rgb('#514B48'), .35); for (let x = (y / 64 % 2) * 48; x < 512; x += 96) line(im, x, y, x, y + 64, 2, rgb('#514B48'), .32); } }
  if (kind === 'field') for (let x = 8; x < 512; x += 24) { line(im, x, 0, x, 512, 5, rgb('#7A5234'), .30); line(im, x + 7, 0, x + 7, 512, 2, rgb('#D3AE68'), .24); }
  return im;
}
function building(kind) {
  const base = { roof: '#A8483A', thatch: '#B58C52', wood: '#7A5234', stone: '#8B8173', window: '#1E2A4A' }[kind], im = paper(image(256, 256, rgb(base)), rgb(base), 40 + kind.length, .14), dark = rgb(kind === 'roof' ? '#71372F' : kind === 'window' ? '#10182D' : '#4F463D');
  if (kind === 'roof') for (let y = 0; y < 256; y += 34) for (let x = (y / 34 % 2) * -18; x < 256; x += 36) { line(im, x, y, x + 18, y + 8, 1.5, dark, .55); line(im, x + 18, y + 8, x + 36, y, 1.5, dark, .55); line(im, x, y, x, y + 34, 1.2, dark, .32); }
  if (kind === 'thatch') for (let y = 5; y < 256; y += 14) for (let x = 0; x < 256; x += 19) line(im, x + hash(x, y, 1) * 8, y - 7, x + 6, y + 7, 1, dark, .32);
  if (kind === 'wood') for (let x = 0; x < 256; x += 43) { line(im, x, 0, x, 256, 2, dark, .58); for (let y = 20; y < 256; y += 60) ellipse(im, x + 20, y, 8, 3, dark, .22); }
  if (kind === 'stone') for (let y = 0; y < 256; y += 45) { line(im, 0, y, 256, y, 2, dark, .48); for (let x = (y / 45 % 2) * 38; x < 256; x += 76) line(im, x, y, x + (hash(x, y, 6) - .5) * 8, y + 45, 2, dark, .42); }
  if (kind === 'window') { rect(im, 8, 8, 248, 248, [0, 0, 0, 0], 1); for (let y = 16; y < 240; y++) for (let x = 16; x < 240; x++) { const edge = Math.min(x - 16, 239 - x, y - 16, 239 - y), glow = Math.min(1, edge / 45); set(im, x, y, mix(rgb('#E8702A'), rgb('#FFB547'), glow), .96); } rect(im, 120, 8, 136, 248, dark, 1); rect(im, 8, 120, 248, 136, dark, 1); }
  return im;
}
function sky(kind) { const top = rgb({ day: '#5FA8C8', dusk: '#1E2A4A', night: '#10182D' }[kind]), bottom = rgb({ day: '#D8C3A0', dusk: '#A8483A', night: '#1E2A4A' }[kind]), im = image(1024, 512, top); for (let y = 0; y < 512; y++) for (let x = 0; x < 1024; x++) { const t = Math.pow(y / 511, 1.15), c = mix(top, bottom, t), cloud = noise(x / 64, y / 64, 16, 70 + kind.length) * noise(x / 128, y / 128, 8, 91); const band = Math.max(0, cloud - .47) * (kind === 'night' ? .12 : .26) * Math.sin(Math.PI * y / 512); set(im, x, y, c, 1); set(im, x, y, kind === 'night' ? rgb('#5FA8C8') : rgb('#F2DEC0'), band); } return im; }
function ramp(cols) { const im = image(256, 8, rgb(cols[0])); for (let x = 0; x < 256; x++) { const i = Math.min(cols.length - 1, Math.floor(x / 256 * cols.length)); for (let y = 0; y < 8; y++) set(im, x, y, rgb(cols[i]), 1); } return im; }
function effect(kind, size) { const im = image(size, size, [0, 0, 0, 0]), c = rgb(kind === 'danger_ring' ? '#FF3B3B' : kind === 'ash_smoke' ? '#6B6D70' : kind === 'spark' ? '#E8702A' : '#FFB547'), m = size / 2; if (kind === 'soft_glow') for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const d = Math.hypot(x - m, y - m) / m; if (d < 1) set(im, x, y, c, Math.pow(1 - d, 2) * .8); } else if (kind === 'spark') { ellipse(im, m, m, size * .055, size * .31, c, .95); line(im, m, m * .4, m, m * 1.65, size * .025, rgb('#FFB547'), .7); } else if (kind === 'danger_ring') { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const d = Math.hypot(x - m, (y - m) * 1.8) / (m * .78), a = Math.max(0, 1 - Math.abs(d - .82) * 16); if (a) set(im, x, y, c, a * .82); } } else { for (let i = 0; i < 14; i++) ellipse(im, hash(i, 2, 4) * size, hash(i, 3, 8) * size, size * (.08 + hash(i, 5, 2) * .18), size * (.06 + hash(i, 8, 3) * .13), c, .12 + hash(i, 2, 9) * .2); } return im; }

fs.mkdirSync(OUT, { recursive: true });
for (const n of ['grass', 'dirt', 'plaza', 'field']) { const im = ground(n); save('ground_' + n, 'ground_' + n + '_512.png', im, true, '地面主贴图（昼夜共用，由场景光照变色）'); save('ground_' + n + '_low', 'ground_' + n + '_256.png', downsample(im, 256), true, '低配地面贴图'); }
for (const n of ['roof', 'thatch', 'wood', 'stone', 'window']) save('building_' + n, 'building_' + n + '_256.png', building(n), true, n === 'window' ? '窗格自发光遮罩（RGB 颜色兼强度）' : '建筑表面');
for (const n of ['day', 'dusk', 'night']) save('sky_' + n, 'sky_' + n + '_1024x512.png', sky(n), false, '竖向天空渐变与低频云层；球穹/背景使用，水平方向内容连续');
const nearest = { wrapS: 'ClampToEdgeWrapping', wrapT: 'ClampToEdgeWrapping', minFilter: 'NearestFilter', magFilter: 'NearestFilter', colorSpace: 'SRGBColorSpace', anisotropy: 1, generateMipmaps: false };
save('ramp_day', 'ramp_day_256x8.png', ramp(['#4B5260', '#C9A27A', '#F2DEC0']), false, '白天卡通三段色带', nearest); save('ramp_night', 'ramp_night_256x8.png', ramp(['#10182D', '#1E2A4A', '#5FA8C8']), false, '夜晚卡通三段色带', nearest); save('ramp_boss', 'ramp_boss_256x8.png', ramp(['#1E2A4A', '#71372F', '#E8702A']), false, 'Boss 卡通三段色带', nearest);
save('fx_soft_glow', 'fx_soft_glow_256.png', effect('soft_glow', 256), false, '圣火/法术柔光斑'); save('fx_spark', 'fx_spark_128.png', effect('spark', 128), false, '火星粒子'); save('fx_danger_ring', 'fx_danger_ring_256.png', effect('danger_ring', 256), false, '敌眼红危险圈'); save('fx_ash_smoke', 'fx_ash_smoke_256.png', effect('ash_smoke', 256), false, '灰烬烟雾粒子');
const total = entries.reduce((n, e) => n + e.estimatedVramBytes, 0), manifest = { schema: 1, generator: 'tools/gen_textures.js', source: '本项目原创代码生成（AI 辅助制作），无第三方图像或素材', palette: { warmEarth: '#C9A27A', roofOchre: '#A8483A', wood: '#7A5234', nightBlue: '#1E2A4A', moonCyan: '#5FA8C8', sacredGold: '#FFB547', emberOrange: '#E8702A', enemyEyeRed: '#FF3B3B' }, skyFormat: '1024×512 竖向渐变与云层合成；相较 2048×1024 等距柱状图，每张节省约 75% 显存，低频天空在当前 960×540 目标下仍足够清晰。', vramAccounting: 'RGBA8；启用 mipmap 的贴图按基础层 × 4/3 估算，色带按无 mipmap 估算。', totalEstimatedVramBytes: total, totalEstimatedVramMiB: +(total / 1048576).toFixed(2), budgetMiB: 24, textures: entries };
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('已生成 ' + entries.length + ' 张贴图；预计显存 ' + manifest.totalEstimatedVramMiB + ' MiB / 24 MiB');
