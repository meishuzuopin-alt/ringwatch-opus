// M0 夜战参数：起步值（DESIGN_BIBLE_v1 §5.1）与调平值。
// 基础数值直接从 js/data.js 读取（默认用 data_snapshot 里 main@84a41bd 的快照；
// PR #21 head 分支 grok/design-bible 的 js/data.js 与 main 是同一个 blob 84a41bde）。
// 凡 data.js 没有的字段，都放在 NIGHT 块里（= 建议新增的 RW.NIGHT，见 docs/specs/M0_NUMBERS.csv 的 NEW_FIELD）。
'use strict';
const path = require('path');
const fs = require('fs');

function loadRW(dataPath) {
  const candidates = [dataPath, path.join(__dirname, '..', 'js', 'data.js'), path.join(__dirname, 'data_snapshot', 'data.main.84a41bd.js')].filter(Boolean);
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      delete globalThis.RW;
      require(path.resolve(p));
      const RW = globalThis.RW; delete globalThis.RW;
      return { RW, from: p };
    }
  }
  throw new Error('BLOCKED_SOURCE: data.js not found');
}

// 刷怪段：沿用 RW.WAVES 的段格式 {dur, r0, r1, mix, elites}（§0.2 第 1 条：旧「波」降级为一夜里的刷怪段）
// r0→r1 是每秒刷怪只数（小鬼按 RW.ENEMIES.mite.cluster 成群，占用只数），elites = [[段内秒数, 类型]]
function segsStart() {
  // 起步：按 §5.1 文字直译。0–60 s 小鬼 1.2/s；60–120 加狼骑、暗弓手；120–160 精英 2 只 + 潮涌；160–180 终潮；目标约 220 只
  return [
    { dur: 60, r0: 1.2, r1: 1.2, mix: { mite: 1 }, elites: [] },
    { dur: 60, r0: 1.2, r1: 1.2, mix: { mite: 0.6, dasher: 0.2, spitter: 0.2 }, elites: [] },
    { dur: 40, r0: 0.9, r1: 0.9, mix: { mite: 0.6, dasher: 0.2, spitter: 0.2 }, elites: [[5, 'warden'], [25, 'warden']], surge: [[28, 12]] },
    { dur: 20, r0: 1.6, r1: 1.6, mix: { mite: 0.6, dasher: 0.2, spitter: 0.2 }, elites: [] }
  ];
}
function segsTuned(k) {
  // 调平：10 秒一格，3 个压力峰（40–50 / 90–100 / 140–150）、1 个喘息段（110–120）、最后 20 秒终潮
  const s = (r0, r1, mix, elites, surge) => ({ dur: 10, r0: r0 * k, r1: r1 * k, mix, elites: elites || [], surge: surge || [] });
  const M = { mite: 1 };
  const A = { mite: 0.7, dasher: 0.3 };
  const B = { mite: 0.6, dasher: 0.2, spitter: 0.2 };
  const C = { mite: 0.55, dasher: 0.25, spitter: 0.2 };
  return [
    s(0.9, 1.0, M), s(1.0, 1.1, M), s(1.1, 1.2, M), s(1.2, 1.3, M), s(1.4, 1.6, M), s(1.0, 0.9, M),            // 0–60
    s(0.9, 1.0, A), s(1.0, 1.1, B), s(1.1, 1.2, B), s(1.3, 1.5, B), s(1.2, 1.1, B), s(0.4, 0.4, B),            // 60–120（110–120 喘息）
    s(1.0, 1.0, C, [[2, 'warden']]), s(1.0, 1.1, C), s(1.1, 1.2, C, [[2, 'warden']], [[7, 12]]), s(0.9, 0.9, C), // 120–160（潮涌 148 s）
    s(1.5, 1.7, C), s(1.8, 2.0, C)                                                                            // 160–180 终潮
  ];
}

function build(which, opts) {
  opts = opts || {};
  const { RW, from } = loadRW(opts.data);
  const T = RW.TUNE, E = RW.ENEMIES, mage = RW.CLASSES.mage;
  const tuned = which === 'tuned';
  const P = {
    source: from, which,
    DT: T.DT,                                   // RW.TUNE.DT
    nightLen: 180,                              // NEW RW.NIGHT.len
    // ---------- 场地（ASSUMPTION：把北面山道→北桥→圣火拉直成一条走廊，数据取自 js/map.js 的格子坐标） ----------
    geo: { spawnY: 60, bridgeY0: 440, bridgeY1: 560, coreX: T.core.x, coreY: T.core.y, coreR: T.core.r,
           cx: 580, bankHalfW: 120, bridgeHalfW: 60, postY: 560 },
    // ---------- 英雄 ----------
    hero: {
      hp: mage.hp,                              // RW.CLASSES.mage.hp = 26
      speed: T.player.speed,                    // RW.TUNE.player.speed = 165
      r: T.player.radius,                       // 10
      iframes: T.player.iframes,                // 0.55
      crit: T.player.crit, critMul: T.player.critMul,
      dash: { speed: T.dash.speed, time: T.dash.time, cd: T.dash.cd },
      respawn: tuned ? { base: 4, coreCost: 0.08, hp: 1 } : { base: 5, coreCost: 0.2, hp: 0.6 }  // PR#3 RW.RESPAWN（main 没有 → NEW）
    },
    slash: tuned
      ? { dmg: 24, cd: 0.45, arc: 120, radius: 72, heavyEvery: 3, heavyMul: 1.8, heavyKnockMul: 2, heavyReset: 1.0, knock: 368,
          near: { r0: 25, r1: 72, bonus: 0.4 } }
      : { dmg: 24, cd: 0.45, arc: 120, radius: 70, heavyEvery: 3, heavyMul: 1.8, heavyKnockMul: 2, heavyReset: 1.0, knock: 368,
          near: { r0: mage.near.r0, r1: mage.near.r1, bonus: mage.near.bonus } },   // 起步直接沿用 RW.CLASSES.mage.near
    momentum: T.momentum,                       // RW.TUNE.momentum 原样
    healOrb: T.healOrb,                         // RW.TUNE.healOrb 原样
    knockDecayRate: 10,                         // sim.js KNOCK_DECAY = exp(-10·DT)（硬编码常量）
    // ---------- 敌人（四类剪影；速度/行为参数读 data.js，HP 与圣火伤害为 M0 覆盖） ----------
    enemies: {
      mite:    { hp: tuned ? 40 : 30, speed: E.mite.speed, dmg: E.mite.dmg, r: E.mite.r, knockRes: E.mite.knockRes, cluster: E.mite.cluster,
                 coreBias: tuned ? 0.55 : 0.6, gold: E.mite.shards * E.mite.shardVal },
      dasher:  { hp: tuned ? 70 : 60, speed: E.dasher.speed, dmg: E.dasher.dmg, r: E.dasher.r, knockRes: E.dasher.knockRes,
                 aim: E.dasher.aim, dash: E.dasher.dash, dashSpeed: E.dasher.dashSpeed, dashRange: E.dasher.dashRange, recover: E.dasher.recover,
                 cdMin: E.dasher.cdMin, cdMax: E.dasher.cdMax, coreBias: tuned ? 0.5 : 0.6, gold: E.dasher.shards * E.dasher.shardVal },
      spitter: { hp: tuned ? 50 : 45, speed: E.spitter.speed, dmg: E.spitter.dmg, r: E.spitter.r, knockRes: E.spitter.knockRes,
                 keep: E.spitter.keep, aim: E.spitter.aim, fireCdMin: E.spitter.fireCdMin, fireCdMax: E.spitter.fireCdMax, boltSpeed: E.spitter.boltSpeed,
                 coreBias: tuned ? 0.5 : 0.6, gold: E.spitter.shards * E.spitter.shardVal },
      warden:  { hp: tuned ? 320 : 300, speed: E.warden.speed, dmg: E.warden.dmg, r: E.warden.r, armor: E.warden.armor, knockRes: tuned ? 0.3 : E.warden.knockRes,
                 fireCd: E.warden.fireCd, charge: E.warden.charge, bullets: E.warden.bullets, bulletDmg: E.warden.bulletDmg,
                 coreBias: 1, gold: E.warden.shards * E.warden.shardVal, elite: true }
    },
    interceptDist: T.core.interceptDist,        // RW.TUNE.core.interceptDist = 110
    telegraph: T.spawn.telegraph,               // 0.8
    maxEnemies: T.MAX_ENEMIES,                  // 120
    // ---------- 圣火 ----------
    core: { hp: 1000, hit: tuned ? 20 : 20, chewCd: 0.9, gunDmg: tuned ? 10 : T.core.gunDmg, gunCd: T.core.gunCd, gunRange: T.core.gunRange, gunKnock: 40 },
    // ---------- 连击 / 超载 / 翻盘 ----------
    combo: { window: tuned ? 2.5 : 2.0 },
    overload: tuned
      ? { threshold: 40, dur: 8, gunRateMul: 2, slashRadiusMul: 1.4, cd: 40, shock: 60, firstCd: 0 }
      : { threshold: 50, dur: 8, gunRateMul: 2, slashRadiusMul: 1.4, cd: 45, shock: 60, firstCd: 0 },
    comeback: { coreBelow: 0.3, thresholdMul: 0.5, dmgMul: 1.5, perNight: 1 },
    opener: tuned ? { n: 3, y: 380 } : null,     // NEW：开场第一组（保证首杀 ≤ 5 秒）
    segs: tuned ? segsTuned(1.0) : segsStart()
  };
  if (opts.override) opts.override(P);
  return P;
}

module.exports = { build, loadRW, segsTuned, segsStart };
