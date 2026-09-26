// 离线渲染背景音乐试听：node tools/music-preview.js [输出目录] [每段秒数]
// 在无头 Chromium 里用 OfflineAudioContext 渲染每个音乐状态，输出 WAV，并打印响度 / 峰值，防止爆音或静音。
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { serve, CHROMIUM_ARGS } = require('./lib/serve');

const out = path.resolve(process.argv[2] || 'shots/music');
const secs = +process.argv[3] || 24;
fs.mkdirSync(out, { recursive: true });

function wav(chans, sr) {
  const n = chans[0].length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < 2; c++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(chans[c][i] * 32767))), 44 + i * 4 + c * 2);
  return buf;
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: CHROMIUM_ARGS.concat(['--autoplay-policy=no-user-gesture-required']) });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/preview.html?lowfx`);
  await page.waitForTimeout(300);
  // 每个音乐状态用圣火村主题渲染一遍；另外每张地图用自己的主题渲染一段战斗音乐（名字写成 battle1@地图）
  const songs = (await page.evaluate(() => RW.SONGS)).concat(await page.evaluate(() => RW.MAP_ORDER.filter(m => m !== 'village').map(m => 'battle1@' + m)));
  let bad = 0;
  for (const song of songs) {
    const res = await page.evaluate(async ([name, secs]) => {
      const [song, map] = name.split('@');
      const b = await RW.renderMusic(song, secs, 44100, map ? RW.MAPS[map].music : null);
      const L = b.getChannelData(0), R = b.getChannelData(1);
      let peak = 0, sum = 0;
      for (let i = 0; i < L.length; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); peak = Math.max(peak, v); sum += L[i] * L[i]; }
      return { L: Array.from(L), R: Array.from(R), peak, rms: Math.sqrt(sum / L.length) };
    }, [song, secs]);
    fs.writeFileSync(path.join(out, song.replace('@', '_') + '.wav'), wav([res.L, res.R], 44100));
    const db = x => (20 * Math.log10(Math.max(1e-9, x))).toFixed(1);
    const warn = res.peak > 0.99 ? '  ⚠ 可能削波' : (res.rms < 0.01 ? '  ⚠ 太安静' : '');
    if (warn) bad++;
    console.log(`${song.padEnd(15)} 峰值 ${db(res.peak)} dBFS  响度 ${db(res.rms)} dBFS${warn}`);
  }
  console.log('errors:', errors.length ? errors : 'none');
  await browser.close(); server.close();
  if (errors.length || bad) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
