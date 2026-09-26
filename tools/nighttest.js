// M0 夜战无头模拟：node tools/nighttest.js --runs 20 --policy mid --seed 1
// god：英雄与圣火不受伤，用来确认 180 秒能走完。mid：桥头站位的中等玩家。
require('../js/data.js');
require('../js/map.js');
require('../js/sim.js');
require('../js/night.js');
require('../js/nightpick.js');
var RW = globalThis.RW;

function arg(name, fallback) {
  var i = process.argv.indexOf('--' + name);
  if (i < 0 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}
var runs = Math.max(1, parseInt(arg('runs', '1'), 10) || 1);
var policy = arg('policy', 'mid');
var seed0 = parseInt(arg('seed', '1'), 10) || 1;
var quiet = process.argv.indexOf('--quiet') >= 0;

function wilson(k, n) {
  if (!n) return [0, 0];
  var z = 1.96, ph = k / n, den = 1 + z * z / n;
  var centre = ph + z * z / (2 * n);
  var marg = z * Math.sqrt(ph * (1 - ph) / n + z * z / (4 * n * n));
  return [Math.max(0, (centre - marg) / den), Math.min(1, (centre + marg) / den)];
}

// 中等玩家：反应 0.25 秒，冲锋横闪 60%，喷刺侧移 50%，守在桥南 ±200，漏到圣火 260 内就回头，追击超过 150 才冲刺。
function Mid(seed) {
  this.delay = 15;
  this.buf = [];
  this.dodgeT = 0;
  this.dodgeX = 0; this.dodgeY = 0;
  this.rand = RW.mulberry((seed * 97 + 13) >>> 0);
}
Mid.prototype.step = function (g) {
  var p = g.player, post = g.nightPost || { x: p.x, y: p.y };
  var want = { mx: 0, my: 0, dash: false };
  if (p.dead) { this.buf.push(want); if (this.buf.length > this.delay) this.buf.shift(); return this.buf[0]; }
  var co = g.core, i, threat = null, leak = null, leakD = 1e15, chase = null, chaseD = 1e15, north = null;
  for (i = 0; i < g.enemies.length; i++) {
    var e = g.enemies[i];
    if (!e.on || e.spawnT > 0) continue;
    var dx = e.x - p.x, dy = e.y - p.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d < chaseD) { chaseD = d; chase = e; }
    if (!north || e.y < north.y) north = e;
    var cx = e.x - co.x, cy = e.y - co.y, cd = Math.sqrt(cx * cx + cy * cy);
    if (cd < 260 && cd < leakD && cd + 40 < Math.sqrt((p.x - co.x) * (p.x - co.x) + (p.y - co.y) * (p.y - co.y))) { leakD = cd; leak = e; }
    if (!threat && e.type === 'dasher' && e.state === 1 && d < 220) threat = e;
    else if (!threat && e.type === 'spitter' && e.state === 1 && d < 180) threat = e;
  }
  if (this.dodgeT > 0) {
    this.dodgeT--;
    want.mx = this.dodgeX; want.my = this.dodgeY;
  } else if (threat) {
    var roll = this.rand(), ok = threat.type === 'dasher' ? roll < 0.6 : roll < 0.5;
    if (ok) {
      var tx = threat.x - p.x, ty = threat.y - p.y, tl = Math.sqrt(tx * tx + ty * ty) || 1;
      // 横闪，但把纵向分量收短，避免让开桥口让箭直接打进圣火
      this.dodgeX = -ty / tl; this.dodgeY = tx / tl * 0.35;
      if (this.rand() < 0.5) this.dodgeX = -this.dodgeX;
      var dl = Math.sqrt(this.dodgeX * this.dodgeX + this.dodgeY * this.dodgeY) || 1;
      this.dodgeX /= dl; this.dodgeY /= dl;
      this.dodgeT = threat.type === 'dasher' ? 30 : 12;
      want.mx = this.dodgeX; want.my = this.dodgeY;
    }
  }
  if (this.dodgeT <= 0) {
    var gx = post.x, gy = post.y;
    if (leak) { gx = leak.x; gy = Math.min(leak.y, co.y - co.r - 36); }
    else if (north) {
      // 守在桥南桩 ±200 里，人站到桥口，挡在圣火和最前面的敌人之间
      gy = Math.max(post.y - 180, Math.min(post.y, north.y + 36));
      gx = post.x;
    }
    var hx = p.x - post.x, hy = p.y - post.y;
    if (hx * hx + hy * hy > 200 * 200 && !leak) { gx = post.x; gy = post.y; }
    var mx = gx - p.x, my = gy - p.y, ml = Math.sqrt(mx * mx + my * my);
    if (ml > 10) { want.mx = mx / ml; want.my = my / ml; }
    if (chase && chaseD > 150 && p.dashCd <= 0) want.dash = true;
  }
  this.buf.push(want);
  if (this.buf.length > this.delay) return this.buf.shift();
  return { mx: 0, my: 0, dash: false };
};

// 选牌暂停时自动选一张。第一张先用掉免费重抽，并确认没有广告时广告重抽不会发奖。
function resolvePick(g, seed, flags) {
  if (!flags.ad) {
    flags.ad = true;
    var before = (g.nightOffers || []).join(',');
    var started = g.nightAdReroll(function () {});
    if (started || (g.nightOffers || []).join(',') !== before) flags.adGrant = true;
  }
  if (!flags.free && g.nightFreeLeft > 0) {
    g.nightFreeReroll();
    flags.free = true;
  }
  var n = (g.nightOffers || []).length;
  if (!n || !g.nightChoose((seed + (g.pkTaken || 0)) % n)) return false;
  return true;
}
function one(seed, policy) {
  var g = new RW.Game({ seed: seed });
  g.startNight({ seed: seed, god: policy === 'god' });
  var bot = policy === 'mid' ? new Mid(seed) : null;
  var guard = 0, cap = 60 * (RW.NIGHT.duration + RW.NIGHT.introSec + 45);
  var flags = { ad: false, free: false, adGrant: false };
  while (g.mode !== 'result' && guard++ < cap) {
    if (g.mode === 'npick') {
      if (!resolvePick(g, seed, flags)) { flags.stuck = true; break; }
      continue;
    }
    var inp = bot ? bot.step(g) : { mx: 0, my: 0 };
    g.update(inp);
    if (g.events.length > 200) g.events.length = 0;
  }
  g.events.length = 0;
  var won = !!(g.result && g.result.won);
  return {
    won: won, time: g.nightT || 0, overloads: g.overloads || 0, kills: g.kills || 0,
    downs: g._downs || 0, coreDmg: g._coreDmg || {},
    flame: g.core ? g.core.hp : 0, first: g.firstKillT, stars: g.result ? g.result.stars : 0,
    done: g.mode === 'result', picks: g.pkTaken || 0, xp: g.pkXp || 0,
    adGrant: !!flags.adGrant, stuck: !!flags.stuck
  };
}

var wins = 0, ovSum = 0, ovNights = 0, tSum = 0, firsts = [], bad = 0, pickSum = 0, pickBad = 0, adBad = 0;
var t0 = Date.now();
var BUDGET_MS = 8000;
for (var n = 0; n < runs; n++) {
  var r = one((seed0 + n) >>> 0, policy);
  if (r.won) wins++;
  ovSum += r.overloads;
  if (r.overloads > 0) ovNights++;
  tSum += r.time;
  pickSum += r.picks;
  if (r.first >= 0) firsts.push(r.first);
  if (!r.done || r.stuck) bad++;
  if (r.adGrant) adBad++;
  if (policy === 'god' && r.done && (r.picks < 5 || r.picks > 7)) pickBad++;
  if (!quiet) console.log('  #' + (n + 1) + ' ' + (r.won ? 'win' : 'lose') + ' t=' + r.time.toFixed(1) + ' ov=' + r.overloads + ' kills=' + r.kills + ' picks=' + r.picks + ' xp=' + r.xp + ' flame=' + Math.round(r.flame) + ' first=' + (r.first < 0 ? '-' : r.first.toFixed(2)) + ' downs=' + r.downs + ' core=' + JSON.stringify(r.coreDmg));
}
var elapsed = Date.now() - t0;
var hold = wins / runs;
var w = wilson(wins, runs);
// 无头画一帧夜战 HUD。真机上 D.tutorialScroll 在 g.wt 为空时会抛，rAF 就此停掉。
function assertNightHud() {
  require('../js/render.js');
  require('../js/ui.js');
  var ctx = new Proxy({}, {
    get: function (_t, p) {
      if (p === 'measureText') return function () { return { width: 8 }; };
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return function () { return { addColorStop: function () {} }; };
      if (p === 'canvas') return { width: 960, height: 540 };
      if (typeof p === 'symbol') return undefined;
      return function () { return ctx; };
    },
    set: function () { return true; }
  });
  RW.Draw.ctx = ctx;
  var g = new RW.Game({ seed: 1 });
  g.startNight({ seed: 1 });
  g.update({ mx: 0, my: 0 });
  if (g.wt != null) throw new Error('night set g.wt');
  RW.UI.btns = [];
  RW.Draw.hud(g, RW.UI, false);
  RW.Draw.tutorialScroll(g);
}
try { assertNightHud(); }
catch (err) { console.error('night hud frame threw: ' + (err && err.stack || err)); process.exit(1); }
var line = 'policy=' + policy + ' runs=' + runs + ' hold=' + (hold * 100).toFixed(1) + '% wilson=[' + (w[0] * 100).toFixed(1) + ',' + (w[1] * 100).toFixed(1) + '] overloads/night=' + (ovSum / runs).toFixed(2) + ' withOverload=' + (ovNights / runs * 100).toFixed(0) + '% meanT=' + (tSum / runs).toFixed(1) + ' picks=' + (pickSum / runs).toFixed(1) + ' won=' + wins + ' ms=' + elapsed + (bad ? ' unfinished=' + bad : '');
console.log(line);
if (adBad) {
  console.error('ad reroll granted with no ads');
  process.exit(1);
}
if (elapsed > BUDGET_MS * runs) {
  console.error('night sim over budget ' + (BUDGET_MS * runs) + 'ms');
  process.exit(1);
}
if (policy === 'god' && (wins !== runs || bad || pickBad || tSum / runs < RW.NIGHT.duration - 1)) {
  console.error('god night did not hold' + (pickBad ? ' picks outside 5-7' : ''));
  process.exit(1);
}
