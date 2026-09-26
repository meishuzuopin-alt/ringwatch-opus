// 全局品质审计（无头部分）：node tools/audit.js [每个英雄每张图跑几局，默认 1] [地图，逗号分隔，默认全部] [危险等级，默认 0]
// 量四样东西，结果打印成表，并写到 shots/audit/report.json，供 docs/AUDIT.md 引用：
//   1. 地图几何：尺寸、可走比例、入口到圣火的路程、祭坛和王旗离圣火多远
//   2. 节奏与爽感：一局打多久、每波多长、每分钟击杀、同屏敌人数、没怪可打的空档、击杀断档、顿帧占比
//   3. 音效覆盖：模拟里发出的事件，哪些在 js/audio.js 里没有声音
//   4. 英雄离散：每个英雄的通关率和平均波数
// 用的是 tools/bot.js 里「普通玩家水平」的机器人（smart 策略，会用重燃）。
const fs = require('fs');
const path = require('path');
const BOT = require('./bot.js');
const RW = BOT.RW;

const per = +process.argv[2] || 1;
const maps = process.argv[3] && process.argv[3] !== 'all' ? process.argv[3].split(',') : RW.MAP_ORDER;
const danger = +process.argv[4] || 0;
const out = { at: new Date().toISOString(), per, danger, maps: {}, heroes: {}, sound: {} };
const t0 = Date.now();

// ---------- 1. 地图几何 ----------
console.log('【地图几何】');
for (const mid of RW.MAP_ORDER) {
  RW.loadMap(mid);
  const G = RW.GRID, D = RW.NAV.distCore, cell = G.cell;
  const idx = (x, y) => ((y / cell) | 0) * G.cols + ((x / cell) | 0);
  let walk = 0;
  for (let i = 0; i < G.grid.length; i++) if (!G.grid[i]) walk++;
  const gates = G.gates.north.concat(G.gates.side, G.gates.south);
  const gd = gates.map(q => D[idx(q.x, q.y)] * cell);
  const core = RW.TUNE.core;
  const alt = G.altars.map(a => Math.round(Math.hypot(a.x - core.x, a.y - core.y)));
  const fr = RW.FRONTS.slice(1).map(f => Math.round(Math.hypot(f.x - core.x, f.y - core.y)));
  const m = {
    size: G.cols + '×' + G.rows, px: G.cols * cell, walkable: +(walk / G.grid.length).toFixed(2),
    gates: gates.length, gatePath: { min: Math.min(...gd), avg: Math.round(gd.reduce((a, b) => a + b, 0) / gd.length), max: Math.max(...gd) },
    altars: alt, fronts: fr, houses: RW.MAP.rows.join('').split('H').length - 1
  };
  out.maps[mid] = { geo: m };
  console.log(`  ${RW.MAP.name}　${m.size}（${m.px}px）可走 ${Math.round(m.walkable * 100)}%　入口 ${m.gates} 个，走到圣火 ${m.gatePath.min}–${m.gatePath.max}px（均 ${m.gatePath.avg}）` +
    `　祭坛离圣火 ${alt.join('/')}px　房屋格 ${m.houses}`);
}

// ---------- 2 + 4. 节奏、爽感、英雄离散 ----------
console.log('\n【节奏与爽感】（smart 机器人，危险 ' + danger + '，打满 20 波，会用重燃）');
const allEv = {};
for (const mid of maps) {
  const st = {}; let wins = 0, n = 0, wavesSum = 0;
  RW.CLASS_ORDER.forEach((hid, hi) => {
    for (let s = 0; s < per; s++) {
      const hs = {};
      const r = BOT.runOne(5000 + s * 7919 + hi * 131, hid, 'smart', RW.RUN.waves, danger, mid, { stats: hs });
      n++; if (r.won) wins++; wavesSum += r.cleared;
      const H = out.heroes[hid] || (out.heroes[hid] = { runs: 0, wins: 0, waves: 0 });
      H.runs++; if (r.won) H.wins++; H.waves += r.cleared;
      for (const k in hs) {
        if (k === 'ev') { for (const e in hs.ev) { st.ev = st.ev || {}; st.ev[e] = (st.ev[e] || 0) + hs.ev[e]; allEv[e] = (allEv[e] || 0) + hs.ev[e]; } }
        else if (k === 'waves') st.waves = (st.waves || []).concat(hs.waves);
        else if (k === 'maxGap' || k === 'enemyMax' || k === 'finalSec') st[k] = Math.max(st[k] || 0, hs[k]);
        else st[k] = (st[k] || 0) + hs[k];
      }
    }
  });
  const bmin = st.battle / 60 / 60, kills = (st.ev.kill || 0) + (st.ev.eat || 0);
  const w = st.waves || [];
  const res = {
    runs: n, win: +(wins / n).toFixed(2), avgWaves: +(wavesSum / n).toFixed(1),
    battleMinPerRun: +(bmin / n).toFixed(1), waveSec: { avg: +(w.reduce((a, b) => a + b, 0) / Math.max(1, w.length)).toFixed(1), max: +Math.max(0, ...w).toFixed(1) },
    killsPerMin: Math.round(kills / Math.max(0.01, bmin)), enemyAvg: Math.round(st.enemySum / Math.max(1, st.battle)), enemyMax: st.enemyMax,
    onScreenAvg: +(st.nearSum / Math.max(1, st.battle)).toFixed(1), idlePct: +(100 * (st.idle || 0) / Math.max(1, st.battle)).toFixed(1),
    maxKillGap: +(st.maxGap || 0).toFixed(1), gaps4PerRun: +((st.gaps4 || 0) / n).toFixed(1), hitstopPct: +(100 * (st.hitstop || 0) / Math.max(1, st.battle)).toFixed(2),
    finalWaveMaxSec: +(st.finalSec || 0).toFixed(1),
    rekindlesPerRun: +((st.rekindles || 0) / n).toFixed(2), heroDeathsPerRun: +((st.deaths || 0) / n).toFixed(2)
  };
  out.maps[mid].pace = res;
  console.log(`  ${RW.MAPS[mid].name}：${n} 局 通关 ${Math.round(res.win * 100)}%　平均 ${res.avgWaves} 波　每局战斗 ${res.battleMinPerRun} 分钟　每波 ${res.waveSec.avg}s（最长 ${res.waveSec.max}s）`);
  console.log(`      每分钟击杀 ${res.killsPerMin}　同屏敌人 均 ${res.onScreenAvg}（全图均 ${res.enemyAvg}，峰 ${res.enemyMax}）　屏内没怪 ${res.idlePct}% 时间　最长击杀断档 ${res.maxKillGap}s　4 秒以上断档 ${res.gaps4PerRun} 次/局`);
  console.log(`      终局波最长 ${res.finalWaveMaxSec}s　顿帧占 ${res.hitstopPct}%　英雄倒下 ${res.heroDeathsPerRun} 次/局　用掉重燃 ${res.rekindlesPerRun} 次/局`);
}

console.log('\n【英雄离散】（各图合计）');
const rates = [];
for (const hid of RW.CLASS_ORDER) {
  const H = out.heroes[hid]; if (!H) continue;
  H.win = +(H.wins / H.runs).toFixed(2); H.avgWaves = +(H.waves / H.runs).toFixed(1); rates.push(H.win);
  console.log(`  ${(RW.CLASSES[hid].name + '　　　').slice(0, 4)} 通关 ${Math.round(H.win * 100)}%　平均 ${H.avgWaves} 波`);
}
out.heroSpread = +(Math.max(...rates) - Math.min(...rates)).toFixed(2);
console.log('  最强与最弱英雄通关率差 ' + Math.round(out.heroSpread * 100) + ' 个百分点');

// ---------- 3. 音效覆盖 ----------
const audio = fs.readFileSync(path.join(__dirname, '..', 'js', 'audio.js'), 'utf8');
const sim = fs.readFileSync(path.join(__dirname, '..', 'js', 'sim.js'), 'utf8');
const emitted = new Set((sim.match(/this\.emit\('([a-zA-Z]+)'/g) || []).map(s => s.slice(11, -1)).concat(['kill', 'eat', 'victory', 'result']));
const handled = new Set((audio.match(/case '([a-zA-Z]+)'/g) || []).map(s => s.slice(6, -1)));
const silent = [...emitted].filter(e => !handled.has(e)).sort();
out.sound = { emitted: emitted.size, silent, counts: allEv };
console.log('\n【音效覆盖】模拟会发出 ' + emitted.size + ' 种事件，没有声音的：' + (silent.join('、') || '无'));

fs.mkdirSync(path.join(__dirname, '..', 'shots', 'audit'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'shots', 'audit', 'report' + (danger ? '-d' + danger : '') + '.json'), JSON.stringify(out, null, 2));
console.log('\n明细：shots/audit/report.json　耗时 ' + ((Date.now() - t0) / 1000).toFixed(0) + 's');
