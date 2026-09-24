// 验证永久庭院成长会保存进度，并作用到下一局。
require('../js/data.js');
require('../js/map.js');
require('../js/sim.js');
var RW = globalThis.RW;
function assert(ok, message) { if (!ok) throw new Error(message); }

var g = new RW.Game({ seed: 771 });
g.prog = { marks: 20, yard: { ward: 2, supplies: 3, mason: 1, banner: 2 }, unlocked: {}, heroBest: {} };
g.startRun('mage');
assert(g.core.maxHp === RW.TUNE.core.hp + 24, 'ward upgrade did not increase core health');
assert(g.shardCount === 25, 'supply upgrade did not grant starting shards');
assert(Math.abs(g.st.buildCost - 0.96) < 0.0001, 'mason upgrade did not lower build cost');
assert(Math.abs(g.st.towerDmg - 1.1) < 0.0001, 'banner upgrade did not increase tower damage');

g.wave = 4; g.kills = 120; g.finishRun();
assert(g.result.marksEarned === 3 && g.prog.marks === 23, 'run rewards did not add courtyard marks');
console.log('永久加成、首局补给与远征印记结算正常');
