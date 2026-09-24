// 无头数值测试：node tools/balance.js [每把起手武器跑几局] [最多打到第几波]
// 用一个「普通玩家水平」的走位机器人 + 三种购物策略跑整局，看能打到第几波。
// 机器人会：躲不能吞的怪、躲冲锋线/喷刺线/爆囊圈/弹幕、安全时吃绿球捡晶屑、怪贴脸时冲刺、怪多时放技能。
require('../js/data.js');
require('../js/map.js');
require('../js/sim.js');
var RW = globalThis.RW;

function botInput(g, out) {
  var p = g.player, fx = 0, fy = 0, A = RW.TUNE.ARENA, danger = 0, close = 0, near150 = 0, eliteNear = false;
  var melee = g.weapons.length && (g.weapons[0].id === 'blades' || g.weapons[0].id === 'scatter' || g.weapons[0].id === 'mines');
  var BASE = melee ? 62 : 110;
  for (var i = 0; i < g.enemies.length; i++) {
    var e = g.enemies[i];
    if (!e.on) continue;
    var dx = p.x - e.x, dy = p.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    if (d < 150) near150++;
    if (e.elite && d < 220) eliteNear = true;
    if (g.canEat(e)) { if (d < 120) { fx -= dx / d * 0.5; fy -= dy / d * 0.5; } continue; }
    if (e.d.boss && d > 250 && danger < 1) { fx -= dx / d * 0.9; fy -= dy / d * 0.9; }
    var R = e.elite ? 150 : BASE;
    if (e.type === 'dasher' && (e.state === 1 || e.state === 2)) {
      var along = dx * e.dx + dy * e.dy, side = -dx * e.dy + dy * e.dx, sg = side >= 0 ? 1 : -1;
      if (along > -10 && along < 200 && Math.abs(side) < 40) { fx += -e.dy * sg * 2.5; fy += e.dx * sg * 2.5; }
    }
    if (e.type === 'spitter' && e.state === 1) {
      var ux = e.dx - e.x, uy = e.dy - e.y, ul = Math.sqrt(ux * ux + uy * uy) || 1; ux /= ul; uy /= ul;
      var sd = -dx * uy + dy * ux, s2 = sd >= 0 ? 1 : -1;
      if (Math.abs(sd) < 30) { fx += -uy * s2 * 2; fy += ux * s2 * 2; }
    }
    if (e.type === 'bomber' && e.state === 1 && d < e.d.blast + 20) { fx += dx / d * 3; fy += dy / d * 3; danger += 2; }
    if (d < R) { var w = (R - d) / R * (e.elite ? 2 : 1); fx += dx / d * w; fy += dy / d * w; danger += w; }
    if (d < e.r + p.r + 14) close++;
  }
  for (var j = 0; j < g.ebullets.length; j++) {
    var b = g.ebullets[j];
    if (!b.on) continue;
    var bx = p.x - b.x, by = p.y - b.y, bd = Math.sqrt(bx * bx + by * by) || 1;
    if (bd < 60) { fx += bx / bd * (60 - bd) / 30; fy += by / bd * (60 - bd) / 30; }
  }
  var m = 60;
  if (p.x - A.x < m) fx += (m - (p.x - A.x)) / m * 1.5;
  if (A.x + A.w - p.x < m) fx -= (m - (A.x + A.w - p.x)) / m * 1.5;
  if (p.y - A.y < m) fy += (m - (p.y - A.y)) / m * 1.5;
  if (A.y + A.h - p.y < m) fy -= (m - (A.y + A.h - p.y)) / m * 1.5;
  if (melee && danger < 0.4) { var ne = g.nearest(p.x, p.y, 400); if (ne) { var nl = Math.hypot(ne.x - p.x, ne.y - p.y) || 1; fx += (ne.x - p.x) / nl * 0.7; fy += (ne.y - p.y) / nl * 0.7; } }
  // 回防核心舱：有怪在啃或逼近舱体时往回跑
  var co = g.core, threat = 0;
  for (var q = 0; q < g.enemies.length; q++) { var ee = g.enemies[q]; if (ee.on && ee.goalCore) { var qx = ee.x - co.x, qy = ee.y - co.y; if (qx * qx + qy * qy < 260 * 260) threat++; } }
  var cdx = co.x - p.x, cdy = co.y - p.y, cdl = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
  if (threat > 0 && cdl > 120 && danger < 2) { fx += cdx / cdl * 1.4; fy += cdy / cdl * 1.4; danger += 1; }
  else if (cdl > 420) { fx += cdx / cdl * 0.5; fy += cdy / cdl * 0.5; }
  if (danger < 0.6) {
    var best = null, bd2 = 1e9, k;
    for (k = 0; k < g.shards.length; k++) {
      var s = g.shards[k];
      if (!s.on || s.mag || s.tower) continue;
      var sx = s.x - p.x, sy = s.y - p.y, ss = sx * sx + sy * sy;
      if (ss < bd2) { bd2 = ss; best = s; }
    }
    for (k = 0; k < g.orbs.length; k++) {
      var o = g.orbs[k];
      if (!o.on || o.dead > 0) continue;
      var ox = o.x - p.x, oy = o.y - p.y, oo = (ox * ox + oy * oy) * 1.3;
      if (oo < bd2 && oo < 260 * 260) { bd2 = oo; best = o; }
    }
    if (best) { var sl = Math.sqrt(bd2) || 1; fx += (best.x - p.x) / sl * 0.8; fy += (best.y - p.y) / sl * 0.8; }
  }
  var l = Math.sqrt(fx * fx + fy * fy);
  out.mx = l < 0.05 ? 0 : fx / l; out.my = l < 0.05 ? 0 : fy / l;
  out.dash = close > 0 && danger > 1.2;
  out.skill = !!g.skill && g.skill.cd <= 0 && (near150 >= 6 || eliteNear);
  return out;
}

var PREF = { weapon: 3, mod: 2, skill: 1.6, tech: 1.2 };
var MOD_PREF = { coil: 3, fins: 3, plate: 2.5, nano: 2, prism: 2.5, sight: 1.5, lens: 1.5, hull: 1, magnet: 1, overclock: 1.2, greed: 0.5, bounty: 0.3,
  whet: 2.5, bracer: 2, apple: 2, heart: 4, belt: 4, trident: 3.5, crown: 2.5, drum: 3, fang: 2, cloak: 2, piggy: 0.6, clover: 0.8 };
function modPref(id) { return MOD_PREF[id] || 1.5; }
function shopPolicy(g, policy) {
  if (policy === 'none') return;
  for (var round = 0; round < 6; round++) {
    var bought = false;
    var order = g.shop.slots.map(function (s, i) { return i; }).filter(function (i) { var s = g.shop.slots[i]; return s && !s.sold && s.kind !== 'none'; });
    order.sort(function (a, b) {
      var sa = g.shop.slots[a], sb = g.shop.slots[b];
      var va = PREF[sa.kind] * (sa.kind === 'mod' ? modPref(sa.id) : 1) / sa.price;
      var vb = PREF[sb.kind] * (sb.kind === 'mod' ? modPref(sb.id) : 1) / sb.price;
      return vb - va;
    });
    for (var k = 0; k < order.length; k++) {
      var i = order[k], sl = g.shop.slots[i];
      if (policy === 'random' && g.R() < 0.4) continue;
      if (sl.price > g.shardCount) continue;
      if (g.buy(i) === 'ok') { bought = true; break; }
    }
    if (!bought) {
      if (policy === 'smart' && g.shardCount > g.rerollCost() + 25 && g.shop.rerolls < 2) g.reroll(false);
      else break;
    }
  }
}
var TOWER_PICK = ['sentry', 'mortar', 'pylon', 'snare', 'barracks', 'ward', 'siphon', 'beacon'];
function buildPolicy(g, policy, state) {
  if (policy === 'none' || g.mode !== 'battle') return;
  var co = g.core, near = Math.hypot(g.player.x - co.x, g.player.y - co.y) < 170;
  if (policy === 'smart' && near && g.wt > 1 && state.lastWave !== g.wave) {
    var sid = TOWER_PICK[state.n % TOWER_PICK.length];
    if (g.shardCount >= g.buildPrice(sid) && g.buildTower(sid) === 'ok') { state.n++; state.lastWave = g.wave; }
    return;
  }
  if (policy !== 'smart' && g.wt > 2 && g.wt < 4 && state.lastWave !== g.wave) {
    var id = TOWER_PICK[state.n % TOWER_PICK.length];
    if (g.shardCount >= g.buildPrice(id) + (policy === 'smart' ? 0 : 8) && g.buildTower(id) === 'ok') { state.n++; }
    state.lastWave = g.wave;
  }
}

function runOne(seed, weapon, policy, maxWave) {
  var g = new RW.Game({ seed: seed }), inp = { mx: 0, my: 0 }, bs = { n: 0, lastWave: 0 };
  g.startRun(weapon);
  var frames = 0;
  while (frames < 60 * 60 * 40) {
    frames++;
    g.update(botInput(g, inp));
    g.events.length = 0;
    buildPolicy(g, policy, bs);
    if (g.mode === 'shop') {
      if (g.wave >= maxWave) return { wave: g.wave + 1, cleared: g.wave, stage: g.player.stage };
      shopPolicy(g, policy);
      g.nextWave();
    }
    if (g.mode === 'revive') g.finishRun();
    if (g.mode === 'result') return { wave: g.wave, cleared: g.wave - 1, stage: g.player.stage, cause: g.deathCause === 'core' ? 'core' : (g.lastHits.length ? g.lastHits[g.lastHits.length - 1].src : '?') };
  }
  return { wave: g.wave, cleared: g.wave - 1, stage: g.player.stage };
}

var runs = +process.argv[2] || 12;
var maxWave = +process.argv[3] || 14;
var policies = process.argv[4] ? process.argv[4].split(',') : ['none', 'random', 'smart'];
var t0 = Date.now();
// 可选第 5 个参数：只跑指定英雄，逗号分隔
var heroes = process.argv[5] ? process.argv[5].split(',') : RW.CLASS_ORDER;
for (var pi = 0; pi < policies.length; pi++) {
  var pol = policies[pi], stages = [0, 0, 0, 0], causes = {};
  console.log('[' + pol + '] 平均通过波数（≥8 波占比）');
  for (var wi = 0; wi < heroes.length; wi++) {
    var wid = heroes[wi], sum = 0, c8 = 0, all = [];
    for (var s = 0; s < runs; s++) {
      var r = runOne(1000 + s * 7919 + wi, wid, pol, maxWave);
      sum += r.cleared; all.push(r.cleared); stages[r.stage]++; if (r.cause) causes[r.cause] = (causes[r.cause] || 0) + 1;
      if (r.cleared >= 8) c8++;
    }
    all.sort(function (a, b) { return a - b; });
    console.log('    ' + (RW.CLASSES[wid].name + '　　　').slice(0, 4) + ' ' + (sum / runs).toFixed(1) + '  (≥8:' + Math.round(100 * c8 / runs) + '%)  各局 ' + all.join(' '));
  }
  console.log('    最终形态分布 ' + JSON.stringify(stages) + '\n    死因 ' + JSON.stringify(causes));
}
console.log('耗时 ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
