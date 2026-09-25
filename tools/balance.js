// 无头数值测试：node tools/balance.js [每个英雄跑几局] [最多打到第几波] [策略] [英雄] [危险等级] [地图] [norekindle]
// 用一个「普通玩家水平」的走位机器人 + 三种购物策略跑整局，看能打到第几波、通关率多少（一局 20 波）。
// 机器人在 tools/bot.js：躲技能、吃球捡金、怪贴脸冲刺、怪多放技能；圣火熄灭时会用重燃（第 8 个参数写 norekindle 关掉）。
var BOT = require('./bot.js'), RW = BOT.RW, runOne = BOT.runOne;
var runs = +process.argv[2] || 12;
var maxWave = +process.argv[3] || RW.RUN.waves;
var danger = +process.argv[6] || 0;
var mapId = process.argv[7] || 'village';   // 第 7 个参数：地图
var policies = process.argv[4] ? process.argv[4].split(',') : ['none', 'random', 'smart'];
var t0 = Date.now();
// 可选第 5 个参数：只跑指定英雄，逗号分隔
var heroes = process.argv[5] ? process.argv[5].split(',') : RW.CLASS_ORDER;
for (var pi = 0; pi < policies.length; pi++) {
  var pol = policies[pi], stages = {}, causes = {}, dieAt = {}, winAll = 0, evAll = 0, cores = {}, rekAll = 0;
  console.log('[' + pol + '] ' + RW.MAPS[mapId].name + ' · 危险 ' + danger + '：平均通过波数（≥10 波占比 / 通关率）');
  for (var wi = 0; wi < heroes.length; wi++) {
    var wid = heroes[wi], sum = 0, c10 = 0, wins = 0, all = [];
    for (var s = 0; s < runs; s++) {
      var r = runOne(1000 + s * 7919 + wi, wid, pol, maxWave, danger, mapId, { rekindle: process.argv[8] !== 'norekindle' });
      rekAll += r.rek || 0;
      sum += r.cleared; all.push(r.cleared); stages[r.stage] = (stages[r.stage] || 0) + 1; evAll += r.ev || 0; if (r.core) cores[r.core] = (cores[r.core] || 0) + 1;
      if (r.cause) { causes[r.cause] = (causes[r.cause] || 0) + 1; dieAt[r.wave] = (dieAt[r.wave] || 0) + 1; }
      if (r.cleared >= 10) c10++;
      if (r.won) wins++;
    }
    winAll += wins;
    all.sort(function (a, b) { return a - b; });
    console.log('    ' + (RW.CLASSES[wid].name + '　　　').slice(0, 4) + ' ' + (sum / runs).toFixed(1) + '  (≥10:' + Math.round(100 * c10 / runs) + '% 通关:' + Math.round(100 * wins / runs) + '%)  各局 ' + all.join(' '));
  }
  var tot = runs * heroes.length;
  console.log('    总通关率 ' + Math.round(100 * winAll / tot) + '%　平均进化 ' + (evAll / tot).toFixed(2) + ' 把　最终形态分布 ' + JSON.stringify(stages));
  console.log('    结束时圣火等级分布 ' + JSON.stringify(cores) + '　平均用掉重燃 ' + (rekAll / tot).toFixed(2) + ' 次');
  console.log('    死在第几波 ' + JSON.stringify(dieAt) + '\n    死因 ' + JSON.stringify(causes));
}
console.log('耗时 ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
