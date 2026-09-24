// 验证每种建筑可建造，并分别触发其战斗 / 支援职能。
require('../js/data.js');
require('../js/map.js');
require('../js/sim.js');
var RW = globalThis.RW;

function assert(ok, message) {
  if (!ok) throw new Error(message);
}
function fresh(id) {
  var g = new RW.Game({ seed: 4124 });
  g.startRun('mage');
  g.shardCount = 9999;
  if (id === 'ward') g.core.hp -= 20;
  assert(g.buildTower(id) === 'ok', id + ' cannot be built');
  var tw = null;
  for (var i = 0; i < g.towers.length; i++) if (g.towers[i].on && g.towers[i].id === id) tw = g.towers[i];
  assert(!!tw, id + ' tower record missing');
  tw.build = 0; tw.cd = 0;
  return { g: g, tw: tw };
}
function enemy(g, tw, type) {
  var e = g.spawnEnemy(type || 'mite', tw.x + 44, tw.y, true);
  assert(!!e, 'enemy spawn failed');
  e.spawnT = 0; e.hp = e.maxHp = 1000; e.armor = 0;
  return e;
}
function tick(g, n) {
  for (var i = 0; i < n; i++) g.update({ mx: 0, my: 0 });
}

// 八种塔各自的触发条件，避免「菜单里有、实战没效果」。
var a = fresh('sentry'), e = enemy(a.g, a.tw); tick(a.g, 90);
assert(a.g.towerStats.sentry.dmg > 0 && e.hp < e.maxHp, 'sentry did not fire');

a = fresh('pylon'); e = enemy(a.g, a.tw); tick(a.g, 1);
assert(a.g.towerStats.pylon.dmg > 0 && e.slowT > 0, 'pylon did not slow');

a = fresh('siphon');
a.g.spawnShard(a.tw.x + 45, a.tw.y, 1); tick(a.g, 50);
assert(a.g.totalShards > 0, 'siphon did not collect nearby shards');

a = fresh('barracks'); a.tw.spawnT = 0; tick(a.g, 1);
assert(a.g.soldiers.some(function (s) { return s.on; }), 'barracks did not spawn a soldier');

a = fresh('mortar'); e = enemy(a.g, a.tw); tick(a.g, 100);
assert(a.g.towerStats.mortar.dmg > 0 && e.hp < e.maxHp, 'mortar did not land an area shot');

a = fresh('ward'); var coreBefore = a.g.core.hp; tick(a.g, 1);
assert(a.g.core.hp > coreBefore, 'ward did not repair the core');

a = fresh('snare'); e = enemy(a.g, a.tw); tick(a.g, 1);
assert(a.g.towerStats.snare.dmg > 0 && e.slowT > 0, 'snare did not damage and slow');

a = fresh('beacon');
a.g.player.x += 75;
assert(a.g.buildTower('sentry') === 'ok', 'could not place a test tower beside the beacon');
var powered = null;
for (var t = 0; t < a.g.towers.length; t++) if (a.g.towers[t].on && a.g.towers[t].id === 'sentry') powered = a.g.towers[t];
assert(!!powered, 'test tower missing'); powered.build = 0; powered.cd = 0;
tick(a.g, 1);
assert(powered.buffT > 0, 'beacon did not empower nearby towers');

console.log('八种建筑均可建造，攻击、减速、收金、出兵、修复和增益触发正常');
