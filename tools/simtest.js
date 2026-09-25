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
ok(RW.ACHIEVEMENTS.length === 42, '成就共 42 个');
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

// 7. 商店买的技能要进 Q/E/R 槽（以前买了放不出来）
(function () {
  var g = newGame('mage', {});
  var ids = g.skills.map(function (k) { return k.id; });
  var fresh = RW.SKILL_ORDER.filter(function (id) { return ids.indexOf(id) < 0; })[0];
  g.skill = g.skills[1];
  g.setSkill(fresh);
  ok(g.skills[1].id === fresh && g.skill === g.skills[1], '买新技能替换当前技能所在的槽位（E）');
  ok(g.skills.length === 3, '仍然是三个技能');
  g.setSkill(fresh);
  ok(g.skills[1].tier === 2, '再买同名技能：升到 II 阶');
  var o = g.offerFor('skill', ids[0]);
  ok(o.upgrade && o.tier === 2, '商店对已有的 Q 技能显示为升阶');
  g.player.mp = 999; g.skills[1].cd = 0; g.mode = 'battle';
  ok(g.castSkill(1) !== false, '买来的技能按 E 能放出来');
})();

// 8. 局中存档：整备时存，读回来状态一致，刷新出的货也一样
(function () {
  var g = newGame('knight', { danger: 1, mutators: ['iron'] }, 11);
  g.prog.heroDanger = { knight: 0 };
  run(g, 300, { mx: 0.3, my: 0.2 });
  ok(g.saveRun() === null, '战斗中不存档');
  g.shardCount = 400;
  ok(g.buildTower(RW.TOWER_ORDER[0]) === 'ok', '建一座塔');
  g.addWeapon('cleaver'); g.weapons[1].tier = 3; g.mods[RW.EVOLVE.cleaver.mod] = 1; g.recalc(); g.evolveWeapon(1);
  g.mods.whet = 2; g.bless = { dmg: 0.1 }; g.core.lv = 2; g.applyCoreLevel(); g.recalc();
  g.summonMate(g.player.x + 20, g.player.y);
  g.setSkill(RW.SKILL_ORDER[0]);
  g.blessPending = 1;
  g.clearWave();
  for (var f = 0; f < 600 && g.mode !== 'bless' && g.mode !== 'shop'; f++) run(g, 1);
  ok(g.mode === 'bless', '清场后先进祝福');
  var sv = JSON.parse(JSON.stringify(g.saveRun()));
  ok(sv && sv.v === RW.RUN_SAVE_V, '整备 / 祝福时可以存档');
  var h = new RW.Game({ seed: 999 });
  h.prog = { unlocked: {}, heroBest: {}, kills: 0, coins: 0, built: 0, runs: 0 };
  ok(h.loadRun(sv) === true, '读档成功');
  ok(h.mode === 'bless' && h.blessOffers.join() === g.blessOffers.join(), '读档回到同一次祝福三选一');
  ok(h.wave === g.wave && h.shardCount === g.shardCount && h.kills === g.kills, '波数、金币、击杀一致');
  ok(h.danger === 1 && h.mut.iron && h.clsId === 'knight', '危险等级、变异器、英雄一致');
  ok(h.weapons.map(function (w) { return w.id + w.tier + (w.ev ? 'E' : ''); }).join() === g.weapons.map(function (w) { return w.id + w.tier + (w.ev ? 'E' : ''); }).join(), '武器、阶数、进化一致');
  ok(h.skills.map(function (k) { return k.id + k.tier; }).join() === g.skills.map(function (k) { return k.id + k.tier; }).join(), '技能一致');
  ok(h.towerCount() === g.towerCount() && h.mateCount() === g.mateCount(), '建筑、同伴数量一致');
  ok(h.core.lv === 2 && Math.abs(h.core.hp - g.core.hp) < 1e-6, '圣火等级、血量一致');
  ok(Math.abs(h.st.dmg - g.st.dmg) < 1e-9 && Math.abs(h.st.maxHp - g.st.maxHp) < 1e-9 && h.st.armor === g.st.armor, '属性重算后一致');
  g.chooseBless(0); h.chooseBless(0);
  ok(JSON.stringify(h.shop.slots) === JSON.stringify(g.shop.slots), '商店货架一致');
  g.shardCount = h.shardCount = 500;
  g.reroll(false); h.reroll(false);
  ok(JSON.stringify(h.shop.slots) === JSON.stringify(g.shop.slots), '读档后刷新出的货与不退出时相同（不能靠读档刷货）');
  h.nextWave(); run(h, 600, { mx: -0.4, my: 0.1 });
  ok(finite(h).length === 0 && h.mode === 'battle', '读档后继续打下一波，数值有限');
  h.finishRun();
  ok(h.prog.runs === 1, '读档后结算只记一局');
})();

// 9. 性能预算：场上敌人打满时，一帧模拟的耗时
(function () {
  var g = newGame('mage', {}, 5);
  g.startWave(18);
  g.player.hp = g.player.maxHp = 1e6; g.core.hp = g.core.maxHp = 1e7;
  for (var i = 0; i < RW.TUNE.MAX_ENEMIES; i++) g.spawnEnemy(i % 3 ? 'mite' : 'shell', g.core.x + Math.cos(i) * (200 + i % 300), g.core.y + Math.sin(i) * (200 + i % 300), false);
  run(g, 60);
  var t0 = process.hrtime.bigint();
  run(g, 300, { mx: 0.5, my: 0.3 });
  var ms = Number(process.hrtime.bigint() - t0) / 1e6 / 300;
  ok(ms < 4, '满屏敌人时每帧模拟 ' + ms.toFixed(2) + ' ms（预算 4 ms，一帧总共 16.7 ms）');
  console.log('  · 满屏 ' + g.enemyCount + ' 只敌人，每帧模拟 ' + ms.toFixed(2) + ' ms');
})();

// 10. 每张地图：入口、王旗、祭坛都能走到圣火；跑一分钟数值有限
RW.MAP_ORDER.forEach(function (mid, mi) {
  var g = newGame(RW.CLASS_ORDER[mi % RW.CLASS_ORDER.length], { map: mid }, 50 + mi);
  ok(RW.MAP.id === mid && g.mapId === mid, mid + '：切到这张图');
  var G = RW.GRID, D = RW.NAV.distCore, cell = function (x, y) { return ((y / G.cell) | 0) * G.cols + ((x / G.cell) | 0); };
  var gates = G.gates.north.concat(G.gates.side, G.gates.south);
  ok(gates.length >= 3, mid + '：至少 3 个入口（实际 ' + gates.length + '）');
  ok(gates.every(function (q) { return D[cell(q.x, q.y)] < 32767; }), mid + '：每个入口都能走到圣火');
  ok(RW.FRONTS.length === 6 && RW.FRONTS.slice(1).every(function (f) { return RW.NAV.walkable(f.x, f.y) && D[cell(f.x, f.y)] < 32767; }), mid + '：五站王旗都在能走的地方');
  ok(g.shrines.length >= 3 && g.shrines.every(function (q) { return D[cell(q.x, q.y)] < 32767; }), mid + '：至少 3 座祭坛，都走得到');
  ok(Math.abs(g.core.x - RW.TUNE.core.x) < 1e-6 && RW.NAV.walkable(g.player.x, g.player.y), mid + '：圣火和英雄位置正确');
  g.player.hp = g.player.maxHp = 1e5; g.core.hp = g.core.maxHp = 1e6;
  for (var t = 0; t < 30; t++) run(g, 60, { mx: Math.cos(t * 0.7), my: Math.sin(t * 1.3) });
  ok(finite(g).length === 0 && g.kills + g.enemyCount > 0, mid + '：跑 30 秒数值有限、刷得出怪（击杀 ' + g.kills + '）');
  g.core.lv = 5; g.applyCoreLevel();
  ok(g.front && RW.NAV.walkable(g.front.x, g.front.y), mid + '：满级王旗 ' + g.front.name);
});
// 敌人配比：雪岭的铁甲兽明显更多
(function () {
  var cnt = function (mid) { var g = newGame('mage', { map: mid }, 9), n = 0; for (var i = 0; i < 4000; i++) if (g.pickMix(RW.waveDef(8).mix) === 'shell') n++; return n; };
  var a = cnt('village'), b = cnt('snow');
  ok(b > a * 1.3, '雪岭关隘的铁甲兽比圣火村多（' + b + ' / ' + a + '）');
})();

// 11. 圣火形态
(function () {
  RW.CORE_FORM_ORDER.forEach(function (fid) {
    var g = newGame('knight', {}, 21);
    g.shardCount = 999; g.upgradeCore();
    ok(g.core.lv === 2, fid + '：先升到 2 级');
    ok(g.coreNeedsForm() && g.upgradeCore() !== 'ok' && g.core.lv === 2, fid + '：3 级前必须选形态');
    ok(g.upgradeCore(fid) === 'ok' && g.core.form === fid && g.core.lv === 3, fid + '：选定形态并升到 3 级');
    g.player.x = g.core.x + 400; g.player.hp = g.player.maxHp = 1e5; g.core.hp = g.core.maxHp = 1e6;
    for (var i = 0; i < 6; i++) g.spawnEnemy('mite', g.core.x + 60 + i * 12, g.core.y + (i % 2 ? 40 : -40), false);
    var hp0 = g.core.hp;
    run(g, 120);
    ok(g.coreSrc.dmg > 0, fid + '：圣火打出了伤害（' + Math.round(g.coreSrc.dmg) + '）');
    if (fid === 'ward') ok(g.enemies.some(function (e) { return e.on && e.slowT > 0; }), '守护：守护波让敌人减速');
    ok(finite(g).length === 0, fid + '：数值有限');
  });
})();

// 12. 野外祭坛：站进圈里占领，每波每座一次
(function () {
  var g = newGame('mage', { map: 'forest' }, 33), sh = g.shrines[0];
  g.player.hp = g.player.maxHp = 1e5; g.core.hp = g.core.maxHp = 1e6;
  var gold0 = g.shardCount;
  for (var f = 0; f < 60 * (RW.SHRINE.hold + 1); f++) { g.player.x = sh.x; g.player.y = sh.y; run(g, 1); }
  ok(sh.done && g.rs.shrines === 1, '站满 ' + RW.SHRINE.hold + ' 秒占领祭坛（奖励：' + sh.reward + '）');
  for (f = 0; f < 120; f++) { g.player.x = sh.x; g.player.y = sh.y; run(g, 1); }
  ok(g.rs.shrines === 1, '同一波同一座祭坛只给一次');
  g.startWave(g.wave + 1);
  ok(!sh.done && sh.prog === 0, '下一波祭坛重新可以占领');
  g.furyT = 5; var d1 = g.momDmg(); g.furyT = 0; var d0 = g.momDmg();
  ok(d1 > d0, '战意爆发期间伤害更高');
})();

// 13. 局中存档记住地图和圣火形态
(function () {
  var g = newGame('ranger', { map: 'marsh' }, 44);
  g.shardCount = 999; g.upgradeCore(); g.upgradeCore('blaze');
  g.clearWave();
  for (var f = 0; f < 600 && g.mode !== 'shop' && g.mode !== 'bless'; f++) run(g, 1);
  var sv = JSON.parse(JSON.stringify(g.saveRun()));
  newGame('mage', { map: 'village' }, 1);   // 先切到别的图
  var h = new RW.Game({ seed: 5 }); h.prog = { unlocked: {}, heroBest: {}, kills: 0, coins: 0, built: 0, runs: 0 };
  ok(h.loadRun(sv) && h.mapId === 'marsh' && RW.MAP.id === 'marsh', '读档回到沼泽渡口');
  ok(h.core.form === 'blaze' && h.core.lv === 3, '读档保留圣火形态和等级');
})();
// 14. 禁用：这件货本局不再出现，次数有限；最近几局有记录
(function () {
  var g = newGame('mage', {}, 71);
  g.clearWave();
  for (var f = 0; f < 600 && g.mode !== 'shop' && g.mode !== 'bless'; f++) run(g, 1);
  if (g.mode === 'bless') g.chooseBless(0);
  var sl = g.shop.slots[1], key = sl.kind + ':' + sl.id;
  ok(g.banSlot(1) === 'ok' && g.banned[key] && g.bansLeft === RW.SHOP_BIAS.bans - 1, '禁用一件货，次数 -1');
  ok(g.shop.slots[1].kind + ':' + g.shop.slots[1].id !== key, '禁用后当场补一件别的');
  var seen = false;
  g.shardCount = 99999;
  for (var r = 0; r < 60; r++) { g.reroll(false); g.shop.slots.forEach(function (o) { if (o && o.kind + ':' + o.id === key) seen = true; }); }
  ok(!seen, '刷新 60 次都不再出现被禁用的货');
  g.banSlot(0); g.banSlot(2);
  ok(g.bansLeft === 0 && g.banSlot(3) !== 'ok', '次数用完不能再禁用');
  g.finishRun();
  ok(g.prog.history.length === 1 && g.prog.history[0].hero === 'mage' && g.prog.history[0].map === 'village', '最近几局记下英雄和地图');
})();
// 15. 英雄倒下：圣火还亮着就倒计时复活，不结束；圣火熄灭才结束
(function () {
  var g = newGame('mage', {}, 81);
  g.startWave(6); run(g, 60);
  var ch0 = g.core.hp;
  g.player.hp = 1; g.hurtPlayer(999, '测试', g.player.x + 5, g.player.y);
  ok(g.player.dead && g.mode === 'battle', '英雄倒下，战斗继续');
  ok(ch0 - g.core.hp >= g.core.maxHp * RW.RESPAWN.coreCost - 1, '倒下的代价：圣火分出火焰续命');
  var c1 = newGame('mage', {}, 84); c1.startWave(6); run(c1, 60); c1.core.hp = 3;
  c1.player.hp = 1; c1.hurtPlayer(999, '测试', c1.player.x + 5, c1.player.y);
  ok(c1.core.hp >= 1 && c1.player.dead && c1.mode === 'battle', '圣火快灭时倒下也不会被代价扣灭');
  var t = g.player.respawnT;
  ok(Math.abs(t - Math.min(RW.RESPAWN.max, RW.RESPAWN.base + RW.RESPAWN.perWave * 5)) < 1e-6, '复活倒计时 ' + t.toFixed(1) + ' 秒（随波数变长）');
  var hp0 = g.player.hp; g.hurtPlayer(50, '测试', 0, 0);
  ok(g.player.hp === hp0, '倒下期间不再受伤');
  run(g, Math.ceil(t * 60) + 60);
  ok(!g.player.dead && g.player.hp > 0 && g.player.inv > 0 && g.mode === 'battle', '倒计时结束在圣火旁复活，短暂无敌');
  ok(Math.hypot(g.player.x - g.core.x, g.player.y - g.core.y) < 80, '复活在圣火旁边');
  ok(g.rs.deaths === 1, '记下倒下次数');
  g.player.hp = 1; g.hurtPlayer(999, '测试', g.player.x + 5, g.player.y);
  g.clearWave();
  ok(!g.player.dead, '清场时倒下的英雄直接站起来');
  var h = newGame('mage', {}, 82);
  h.startWave(2); h.hurtCore(1e9, '测试');
  run(h, 120);
  ok(h.mode === 'result' && h.result && h.result.coreDown, '圣火熄灭（前 3 波）直接结算');
  var k = newGame('mage', {}, 83);
  k.startWave(6); k.hurtCore(1e9, '测试'); run(k, 120);
  ok(k.mode === 'revive', '第 4 波起圣火熄灭时给一次重燃机会');
  k.revive();
  ok(k.mode === 'battle' && k.core.hp >= k.core.maxHp * 0.5 && !k.player.dead, '重燃：圣火回到一半，英雄站着');
})();
// 16. 圣域：圣火 10 级，范围越来越大，每级有新能力，满级火舌覆盖全图
(function () {
  var g = newGame('mage', {}, 91);
  ok(RW.CORE_MAX_LV === 10, '圣火共 10 级');
  var last = 0, grew = true, costUp = true, pc = 0;
  for (var i = 1; i <= RW.CORE_MAX_LV; i++) {
    var L = RW.CORE_LV[i];
    if (!(L.aura > last)) grew = false; last = L.aura;
    if (i >= 2) { if (!(L.cost > pc)) costUp = false; pc = L.cost; if (!L.perk || !L.desc) grew = false; }
  }
  ok(grew, '每一级圣域都更大，并且都有新能力和说明');
  ok(costUp, '每一级都比上一级贵（不会轻易满级）');
  var total = 0; for (i = 2; i <= RW.CORE_MAX_LV; i++) total += RW.CORE_LV[i].cost;
  ok(total >= 1200, '升满圣火总共要 ' + total + ' 金币（基础价）');
  g.startWave(1); run(g, 30);
  ok(g.sanctuaryYield() === 0, '1 级还没有圣域收成');
  g.shardCount = 99999; g.upgradeCore();
  var y2 = g.sanctuaryYield();
  ok(y2 > 0, '2 级起圣域收成：每波 ' + y2 + ' 金币');
  g.upgradeCore('ward'); g.upgradeCore(); g.upgradeCore();
  var y5 = g.sanctuaryYield();
  ok(y5 > y2, '圣域越大收成越多：5 级每波 ' + y5);
  // 圣域减速：放一只敌人到圣域里
  var e = g.spawnEnemy ? null : null;
  for (var k = 0; k < g.enemies.length; k++) if (g.enemies[k].on) { e = g.enemies[k]; break; }
  if (!e) { run(g, 240); for (k = 0; k < g.enemies.length; k++) if (g.enemies[k].on) { e = g.enemies[k]; break; } }
  if (e) { e.spawnT = 0; e.x = g.core.x + 60; e.y = g.core.y; g.updateSanctuary(); ok(e.inAura && e.slowT > 0 && e.slowAmt >= RW.SANCTUARY.hallow.slow, '敌人进了圣域被拖慢'); }
  else ok(false, '没刷出敌人，测不了圣域减速');
  var f1 = g.coreForm().slow;
  g.upgradeCore();
  ok(g.core.formTier === 2 && g.coreForm().slow > f1 && g.coreForm().tier === 2, '6 级：形态进阶到二阶');
  g.upgradeCore(); g.upgradeCore(); g.upgradeCore();
  ok(g.core.formTier === 3 && g.corePerk('twin') && g.corePerk('rain') && g.corePerk('form3'), '9 级：形态三阶、双生火舌、流星火雨');
  ok(g.upgradeCore() === 'ok' && g.core.lv === 10, '升到 10 级');
  ok(g.core.gunRange >= 99999 && g.core.aura > 3000, '天火：火舌射程与圣域覆盖全图');
  ok(g.sanctuaryYield() > y5 * 2, '天火：全图收成 ' + g.sanctuaryYield());
  ok(g.upgradeCore() !== 'ok', '满级后不能再升');
  // 满级圣火能打到地图角落的敌人
  if (e && e.on) {
    e.x = 60; e.y = 60; e.hp = e.maxHp = 1e6; var hp0 = e.hp; run(g, 600);
    ok(!e.on || e.hp < hp0, '天火打得到地图最远的角落');
  }
  var sv = g.saveRun ? g.saveRun() : null;
  if (sv && g.loadRun) { var h = newGame('mage', {}, 92); h.loadRun(sv); ok(h.core.lv === 10 && h.core.aura === g.core.aura && h.core.formTier === 3, '局中存档：圣火等级、圣域、形态阶都还原'); }
})();
RW.loadMap('village');

console.log((failed ? '  ' : '  ✓ ') + passed + ' 项通过' + (failed ? '，' + failed + ' 项失败' : ''));
if (failed) process.exit(1);
