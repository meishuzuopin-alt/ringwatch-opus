// 数值 / 审计共用的试玩机器人：node tools/balance.js 与 node tools/audit.js 都用它。
// 用一个「普通玩家水平」的走位机器人 + 三种购物策略跑整局，看能打到第几波、通关率多少（一局 20 波）。
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
    // Boss：砸地红圈往圈外跑；冲撞瞄准时横向让开（普通玩家都会躲这两招）
    if (e.d.boss && e.state === 1) {
      var sx = p.x - e.ax, sy = p.y - e.ay, sl = Math.sqrt(sx * sx + sy * sy) || 1;
      if (sl < e.d.slam.r + p.r + 24) { fx += sx / sl * 4; fy += sy / sl * 4; danger += 3; }
    }
    if (e.d.boss && e.state === 3) {
      var ca = dx * e.dx + dy * e.dy, cs = -dx * e.dy + dy * e.dx, cg = cs >= 0 ? 1 : -1;
      if (ca > -20 && Math.abs(cs) < e.r + 40) { fx += -e.dy * cg * 3; fy += e.dx * cg * 3; danger += 2; }
    }
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
  // 先顾圣火：残血就修；聪明策略手头宽裕时升级圣火
  var co = g.core;
  if (co.hp < co.maxHp * 0.7 && g.shardCount >= g.coreRepairCost()) g.repairCore();
  if (policy === 'smart' && RW.CORE_LV[(co.lv || 1) + 1] && g.shardCount >= g.coreUpgradeCost() + 10) g.upgradeCore(RW.CORE_FORM_ORDER[Math.floor(g.R() * 3)]);   // 3 级时随机选一种形态
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
var TOWER_PICK = ['sentry', 'barracks', 'sentry', 'pylon', 'siphon'];
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

// 祝福：稀有度高的优先，同稀有度取第一个
function blessPolicy(g, policy) {
  var o = g.blessOffers || [], pick = 0;
  if (policy === 'random') pick = Math.floor(g.R() * o.length);
  else for (var i = 1; i < o.length; i++) if (RW.BLESSINGS[o[i]].r > RW.BLESSINGS[o[pick]].r) pick = i;
  g.chooseBless(pick);
}
function evolvePolicy(g, policy) {
  if (policy === 'none') return;
  for (var i = 0; i < g.weapons.length; i++) if (g.canEvolve(g.weapons[i])) g.evolveWeapon(i);
}

// opts.rekindle：圣火熄灭时用重燃（桌面版免费，真人都会按；默认开）
// opts.stats：传一个对象进来，顺便记录节奏 / 爽感数据（击杀、顿帧、事件、波长、断档）
function runOne(seed, weapon, policy, maxWave, danger, map, opts) {
  opts = opts || {};
  var g = new RW.Game({ seed: seed }), inp = { mx: 0, my: 0 }, bs = { n: 0, lastWave: 0 };
  g.startRun(weapon, { danger: danger, map: map });
  var frames = 0, st = opts.stats, lastKill = 0, battleF = 0, waveF = 0;
  var rekindle = opts.rekindle !== false && policy !== 'none';
  function end(r) {
    if (st) {
      if (waveF) { st.waves = st.waves || []; st.waves.push(waveF / 60); st.finalSec = Math.max(st.finalSec || 0, waveF / 60); }
      st.frames = (st.frames || 0) + frames; st.battle = (st.battle || 0) + battleF;
      st.runs = (st.runs || 0) + 1; st.rekindles = (st.rekindles || 0) + (g.rs.rekindles || 0); st.deaths = (st.deaths || 0) + (g.rs.deaths || 0);
    }
    return r;
  }
  while (frames < 60 * 60 * 40) {
    frames++;
    g.update(botInput(g, inp));
    if (st) {
      var ev = g.events;
      for (var ei = 0; ei < ev.length; ei++) {
        var t = ev[ei].type;
        st.ev = st.ev || {}; st.ev[t] = (st.ev[t] || 0) + 1;
        if (t === 'kill' || t === 'eat') { if (g.mode === 'battle') { var gap = (battleF - lastKill) / 60; if (gap > (st.maxGap || 0)) st.maxGap = gap; if (gap > 4) st.gaps4 = (st.gaps4 || 0) + 1; } lastKill = battleF; }
      }
      if (g.mode === 'battle') {
        battleF++; waveF++;
        var on = g.enemyCount; st.enemySum = (st.enemySum || 0) + on; if (on > (st.enemyMax || 0)) st.enemyMax = on;
        var p = g.player, near = 0;
        for (var ni = 0; ni < g.enemies.length; ni++) { var ne = g.enemies[ni]; if (ne.on && Math.abs(ne.x - p.x) < 480 && Math.abs(ne.y - p.y) < 300) near++; }
        st.nearSum = (st.nearSum || 0) + near; if (near === 0) st.idle = (st.idle || 0) + 1;
        if (g.freeze > 0) st.hitstop = (st.hitstop || 0) + 1;
      }
    }
    g.events.length = 0;
    buildPolicy(g, policy, bs);
    if (g.mode === 'bless') blessPolicy(g, policy);
    if (g.mode === 'shop') {
      if (st && waveF) { st.waves = st.waves || []; st.waves.push(waveF / 60); waveF = 0; lastKill = battleF; }
      if (g.wave >= maxWave) return end({ wave: g.wave + 1, cleared: g.wave, stage: g.player.stage });
      evolvePolicy(g, policy);
      shopPolicy(g, policy);
      evolvePolicy(g, policy);
      g.nextWave();
    }
    if (g.mode === 'revive') { if (rekindle && g.canRevive()) g.revive(); else g.finishRun(); }
    if (g.mode === 'result') {
      if (g.won) return end({ wave: g.wave, cleared: g.wave, stage: g.player.stage, won: true, ev: g.rs.evolved, core: g.core.lv, rek: g.rs.rekindles || 0 });
      return end({ wave: g.wave, cleared: g.wave - 1, stage: g.player.stage, ev: g.rs.evolved, core: g.core.lv, rek: g.rs.rekindles || 0, cause: g.deathCause === 'core' ? 'core' : (g.lastHits.length ? g.lastHits[g.lastHits.length - 1].src : '?') });
    }
  }
  return end({ wave: g.wave, cleared: g.wave - 1, stage: g.player.stage });
}

module.exports = { RW: RW, botInput: botInput, shopPolicy: shopPolicy, buildPolicy: buildPolicy, blessPolicy: blessPolicy, evolvePolicy: evolvePolicy, runOne: runOne };
