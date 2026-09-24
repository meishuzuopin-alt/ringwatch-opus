// 玩法闭环测试（无头，几秒）：node tools/simtest.js
// 覆盖：数值无 NaN、终局 Boss 与通关、无尽、局外进度只记增量、成就、危险等级、变异器、祝福、套装、进化、每日挑战
require('../js/data.js');
require('../js/map.js');
require('../js/sim.js');
var RW = globalThis.RW;

var failed = 0, passed = 0;
function ok(cond, msg) {
  if (cond) passed++;
  else { failed++; console.log('  ✗ ' + msg); }
}
function run(g, frames, input) {
  input = input || { mx: 0, my: 0 };
  for (var i = 0; i < frames; i++) { g.update(input); g.events.length = 0; }
}
function finite(g) {
  var bad = [];
  if (!isFinite(g.shardCount)) bad.push('shardCount');
  if (!isFinite(g.player.hp) || !isFinite(g.player.x)) bad.push('player');
  if (!isFinite(g.core.hp)) bad.push('core');
  for (var k in g.st) if (typeof g.st[k] === 'number' && !isFinite(g.st[k])) bad.push('st.' + k);
  for (var i = 0; i < g.enemies.length; i++) {
    var e = g.enemies[i];
    if (e.on && !(isFinite(e.hp) && isFinite(e.x) && isFinite(e.speed) && isFinite(e.dmg))) { bad.push('enemy ' + e.type); break; }
  }
  return bad;
}
function newGame(hero, opts, seed) {
  var g = new RW.Game({ seed: seed || 42 });
  g.prog = { unlocked: {}, heroBest: {}, kills: 0, coins: 0, built: 0, runs: 0 };
  g.startRun(hero, opts);
  return g;
}

// 1. 每个英雄跑 20 秒：数值全部有限
RW.CLASS_ORDER.forEach(function (id, i) {
  var g = newGame(id, {}, 100 + i);
  for (var t = 0; t < 20; t++) {
    run(g, 60, { mx: Math.cos(t), my: Math.sin(t * 0.7) });
    var b = finite(g);
    if (b.length) { ok(false, id + ' 第 ' + t + ' 秒出现非数：' + b.join(' ')); break; }
  }
  ok(finite(g).length === 0, id + ' 数值有限');
});

// 2. 数据表自洽
RW.WEAPON_ORDER.forEach(function (id) { ok(!!RW.WEAPONS[id], '武器 ' + id + ' 存在'); });
for (var wid in RW.EVOLVE) { ok(!!RW.WEAPONS[wid], '进化配方的武器 ' + wid + ' 存在'); ok(!!RW.MODS[RW.EVOLVE[wid].mod], '进化配方的道具 ' + RW.EVOLVE[wid].mod + ' 存在'); }
RW.BLESS_ORDER.forEach(function (id) { for (var k in RW.BLESSINGS[id].fx) ok(!!RW.STATS[k], '祝福 ' + id + ' 的属性 ' + k + ' 存在'); });
RW.SET_ORDER.forEach(function (tag) { RW.SETS[tag].tiers.forEach(function (t) { for (var k in t[1]) ok(!!RW.STATS[k], '套装 ' + tag + ' 的属性 ' + k + ' 存在'); }); });
var achIds = {};
RW.ACHIEVEMENTS.forEach(function (a) { ok(!achIds[a.id], '成就 id 不重复：' + a.id); achIds[a.id] = 1; });
ok(RW.ACHIEVEMENTS.length === 40, '成就共 40 个');
ok(RW.SHEET.hp(20) > RW.SHEET.hp(10) && RW.SHEET.hp(10) > RW.SHEET.hp(5), '怪物血量随波数单调增长');

// 3. 终局：第 20 波换成灭火者，击败即通关，结算记分和成就
(function () {
  var g = newGame('mage', {});
  g.startWave(RW.RUN.waves);
  ok(g.final === true, '第 20 波是终局');
  g.player.hp = g.player.maxHp = 9999; g.core.hp = g.core.maxHp = 99999;
  for (var f = 0; f < 60 * 30 && !g.boss; f++) run(g, 1);   // Boss 先出预警标记，再落地
  ok(g.boss && g.boss.d === RW.ENEMIES.tyrant, '第 20 波的 Boss 是灭火者');
  if (!g.boss) return;
  g.player.hp = g.player.maxHp = 9999; g.core.hp = g.core.maxHp = 99999;
  // 倒计时走完而 Boss 未死：波次不能结束
  g.wt = g.dur + 1; run(g, 30);
  ok(g.mode === 'battle', '终局倒计时走完但灭火者没倒：继续战斗');
  var bp = g.blessPending;
  g.killEnemy(g.boss, null, 'kill');
  ok(g.won === true, '击败灭火者 → 通关');
  ok(g.blessPending === bp + 1, '击败 Boss 给一次祝福');
  run(g, 60 * 8);
  ok(g.mode === 'result', '通关后进入结算（实际 ' + g.mode + '）');
  var r = g.result || {};
  ok(r.won && r.canEndless, '结算标记通关、可继续无尽');
  ok(r.score > RW.SCORE.win, '得分包含通关奖励（' + r.score + '）');
  ok(g.prog.heroDanger.mage === 0, '记下法师通关危险 0');
  ok(RW.dangerOpen('mage', 1, g.prog) && !RW.dangerOpen('mage', 2, g.prog), '通关危险 0 解锁危险 1，不解锁危险 2');
  ok(r.achievements.indexOf('win') >= 0 && r.achievements.indexOf('boss1') >= 0, '解锁成就：通关、击败 Boss');
  ok(g.prog.runs === 1 && g.prog.wins === 1, '局数、通关次数各 +1');
  var kills0 = g.prog.kills;
  // 无尽
  ok(g.continueEndless() === true, '可以继续无尽');
  ok(g.mode === 'bless' && g.blessOffers.length === 3, '无尽前先领祝福（三选一）');
  ok(g.chooseBless(1) === 'ok' && g.mode === 'shop', '选完祝福进整备');
  g.nextWave();
  ok(g.wave === RW.RUN.waves + 1 && !g.final && g.endless, '进入第 21 波无尽');
  var e = g.spawnEnemy('mite', g.core.x + 300, g.core.y, false);
  ok(e && Math.abs(e.maxHp / (RW.ENEMIES.mite.hp * g.hpMul(21)) - (1 + RW.RUN.endlessHp)) < 1e-6, '无尽第 21 波血量再 ×' + (1 + RW.RUN.endlessHp));
  g.kills += 5;
  g.finishRun();
  ok(g.prog.runs === 1, '通关后接无尽再结算：局数不重复加');
  ok(g.prog.kills === g.kills && g.prog.kills >= kills0 + 5, '累计击杀只记增量（' + g.prog.kills + ' / ' + g.kills + '）');
  ok(g.prog.endlessBest === 21, '记下无尽最高波数');
  ok(!g.result.canEndless, '无尽结算不能再继续');
})();

// 4. 危险等级与变异器
(function () {
  var g0 = newGame('knight', {}), g5 = newGame('knight', { danger: 5, mutators: ['fragile', 'iron', 'nobuild', 'lonely'] });
  ok(g5.core.maxHp < g0.core.maxHp * 0.6, '危险 5 + 脆火：圣火最大生命明显变低（' + g5.core.maxHp + ' / ' + g0.core.maxHp + '）');
  var a = g0.spawnEnemy('mite', g0.core.x + 300, g0.core.y, false), b = g5.spawnEnemy('mite', g5.core.x + 300, g5.core.y, false);
  ok(Math.abs(b.maxHp / a.maxHp - RW.DANGER[5].hp) < 1e-6, '危险 5 敌人血量 ×' + RW.DANGER[5].hp);
  ok(b.armor === a.armor + RW.MUTATORS.iron.armor, '铁壁：敌人护甲 +' + RW.MUTATORS.iron.armor);
  g5.shardCount = 999;
  ok(g5.buildTower(RW.TOWER_ORDER[0]) !== 'ok', '孤身：不能建造');
  var chests = 0;
  for (var i = 0; i < (g5.chests || []).length; i++) if (g5.chests[i].on) chests++;
  ok(chests === 0, '无伴：不刷金箱');
  ok(g5.priceMul() > g0.priceMul(), '危险 2 起物价更高');
  g5.won = true; g5.rs.bossKills = 1;
  ok(g5.runScore() > g0.runScore(), '危险与变异器提高分数倍率');
})();

// 5. 祝福、套装、进化
(function () {
  var g = newGame('berserker', {});
  g.blessPending = 2; g.rollBless(); g.mode = 'bless';
  var o = g.blessOffers.slice();
  ok(o.length === 3 && o[0] !== o[1] && o[1] !== o[2] && o[0] !== o[2], '祝福三个选项互不相同');
  var dmg0 = g.st.dmg, rate0 = g.st.rate;
  ok(g.chooseBless(0) === 'ok' && g.mode === 'bless', '还有祝福时继续三选一');
  ok(g.chooseBless(0) === 'ok' && g.mode === 'shop', '祝福领完进整备');
  ok(g.rs.bless === 2, '记下本局祝福次数');
  // 近战套装：凑满 6 层
  g.weapons.length = 0;
  g.addWeapon('cleaver'); g.addWeapon('pike');
  g.weapons[0].tier = 3; g.weapons[1].tier = 3; g.recalc();
  ok(g.sets.melee === 6, '近战层数 = 阶数之和 6（实际 ' + g.sets.melee + '）');
  ok(g.rs.setMax.melee === 6, '记下本局最高层数');
  var arm = g.st.armor;
  g.weapons[1].tier = 1; g.recalc();
  ok(g.st.armor === arm && g.sets.melee === 4, '降到 4 层：2 层加成仍在');
  g.weapons[1].tier = 3; g.recalc();
  // 进化
  var w = g.weapons[0], before = g.weaponDmg(w);
  ok(!g.canEvolve(w), '没有对应道具不能进化');
  g.mods[RW.EVOLVE.cleaver.mod] = 1; g.recalc();
  before = g.weaponDmg(w);
  ok(g.canEvolve(w), 'III 阶 + 道具可以进化');
  ok(g.evolveWeapon(0) === 'ok' && w.name === RW.EVOLVE.cleaver.name, '进化后改名为 ' + RW.EVOLVE.cleaver.name);
  ok(Math.abs(g.weaponDmg(w) / before - RW.EVOLVE_MUL) < 1e-6, '进化后伤害 ×' + RW.EVOLVE_MUL);
  ok(!g.canEvolve(w), '不能重复进化');
  // 新武器都能开火不出错
  RW.WEAPON_ORDER.forEach(function (id) {
    var h = newGame('mage', {}, 7);
    h.weapons.length = 0; h.addWeapon(id); h.weapons[0].tier = 3;
    if (RW.EVOLVE[id]) { h.mods[RW.EVOLVE[id].mod] = 1; h.recalc(); h.evolveWeapon(0); }
    for (var k = 0; k < 6; k++) h.spawnEnemy('mite', h.player.x + 40 + k * 20, h.player.y + (k % 2 ? 30 : -30), false);
    run(h, 240);
    ok(finite(h).length === 0, '进化武器 ' + id + ' 开火后数值有限');
    ok(h.weapons[0].dmg > 0, '进化武器 ' + id + ' 打出了伤害');
  });
})();

// 6. 每日挑战：同一天结果固定
(function () {
  var a = RW.dailySetup('2026-09-24'), b = RW.dailySetup('2026-09-24'), c = RW.dailySetup('2026-09-25');
  ok(JSON.stringify(a) === JSON.stringify(b), '每日挑战同一天设置相同');
  ok(a.mutators.length === 2 && a.mutators[0] !== a.mutators[1], '每日挑战两个不同的变异器');
  ok(JSON.stringify(a) !== JSON.stringify(c), '不同日子设置不同');
  var g1 = newGame(a.hero, { danger: a.danger, mutators: a.mutators, seed: a.seed, daily: a.key }, 1);
  var g2 = newGame(a.hero, { danger: a.danger, mutators: a.mutators, seed: a.seed, daily: a.key }, 2);
  run(g1, 600); run(g2, 600);
  ok(g1.kills === g2.kills && g1.shardCount === g2.shardCount, '每日挑战同种子、同操作结果一致');
  g1.finishRun();
  ok(g1.prog.daily[a.key] === g1.result.score, '记下当日最高分');
  ok(g1.result.achievements.indexOf('daily') >= 0, '解锁成就：今日值守');
})();

console.log((failed ? '  ' : '  ✓ ') + passed + ' 项通过' + (failed ? '，' + failed + ' 项失败' : ''));
if (failed) process.exit(1);
