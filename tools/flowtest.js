// 界面流程测试（v3）：本局设置 → 战斗中造塔 → 祝福 → 整备（维修/升级/买卡/进化）→ 复活 → 终局通关 → 无尽 → 结算 → 成就页 → 每日挑战。
// node tools/flowtest.js <输出目录>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const { serve, CHROMIUM_ARGS } = require('./lib/serve');
const root = path.resolve(__dirname, '..'), out = path.resolve(process.argv[2] || 'flow');
fs.mkdirSync(out, { recursive: true });

(async () => {
  const server = await serve();
  const browser = await chromium.launch({ args: CHROMIUM_ARGS });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${server.address().port}/preview.html`);
  await page.waitForTimeout(400);
  const toS = (x, y) => page.evaluate(([x, y]) => { const v = RW.Plat.view; return [v.ox + x * v.s, v.oy + y * v.s]; }, [x, y]);
  const tap = async (x, y) => { const [a, b] = await toS(x, y); await page.mouse.click(a, b); await page.waitForTimeout(150); };
  const shot = n => page.screenshot({ path: path.join(out, n + '.png') });
  // 软件渲染很慢：等界面真正画出某个按钮 / 进入某个状态再操作，不靠固定延时
  const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 60000, polling: 50 });
  const btn = id => until(id => RW.UI.btns.some(b => b.id === id), id);
  // 按按钮 id 点击：等它画出来，再点它的中心（界面改版不用改测试坐标）
  const press = async id => {
    await btn(id);
    const r = await page.evaluate(id => { const b = RW.UI.btns.find(b => b.id === id); return [b.x + b.w / 2, b.y + b.h / 2]; }, id);
    await tap(r[0], r[1]);
  };
  await press('start'); await press('hero:mage');
  await press('mut:swarm'); await press('mut:swarm');   // 变异器开关：开了再关
  const setupOk = await page.evaluate(() => RW.UI.runMuts.length === 0 && RW.UI.runDanger === 0);
  await shot('f_pick'); await press('pick:mage');   // 选第一个英雄 -> 出发
  await until(() => RW.game.mode === 'battle' && RW.UI.btns.some(b => b.id === 'build'));
  // 战斗中：点造塔 → 点哨炮
  await press('build'); await btn('bt:sentry'); await shot('f0_buildmenu'); await press('bt:sentry');
  await until(() => RW.game.towerCount() > 0).catch(() => {}); await page.waitForTimeout(300); await shot('f1_built');
  const towers1 = await page.evaluate(() => RW.game.towerCount());
  // 快进到第 4 波整备，核心舱受损；起手武器升到 III 阶并给进化道具；再给两次祝福
  await page.evaluate(() => {
    const g = RW.game, w = g.weapons[0];
    g.wave = 4; g.shardCount = 200; g.core.hp = 90;
    w.tier = 3; g.mods[RW.EVOLVE[w.id].mod] = 1; g.recalc();
    g.blessPending = 2; g.clearWave();
  });
  await btn('bless:0'); await page.waitForTimeout(300); await shot('f2_bless');
  await press('bless:0'); await btn('bless:2'); await press('bless:2');
  const blessOk = await page.evaluate(() => RW.game.rs.bless === 2);
  await btn('repair');
  await shot('f2_shop');
  await press('repair');           // 维修
  await until(() => RW.game.core.hp > 90).catch(() => {});
  await press('upgrade');          // 圣火升级（取代旧的「加固」）
  await until(() => (RW.game.core.lv || 1) > 1).catch(() => {});
  await press('buy:0');            // 买第一张卡
  await page.waitForTimeout(300);
  await press('evolve:0');         // 进化起手武器
  await until(() => !!RW.game.weapons[0].ev).catch(() => {});
  await page.waitForTimeout(300);
  await shot('f3_shop_after');
  const evolved = await page.evaluate(() => RW.game.weapons[0].name || '');
  const coreAfter = await page.evaluate(() => [Math.round(RW.game.core.hp), RW.game.core.maxHp, 'Lv' + (RW.game.core.lv || 1)]);
  await press('next');             // 下一波（Boss 波）
  await page.waitForTimeout(8000);
  await shot('f4_boss');
  // 直接让主角倒下（不靠怪物慢慢打，CI 机器慢时也稳定），等复活页出现
  await page.evaluate(() => { const g = RW.game; g.player.hp = 0; g.lastHits.push({ src: '测试', dmg: 1, wave: g.wave }); g.die(); });
  await until(() => RW.game.mode === 'revive', undefined);
  await page.waitForTimeout(300);
  await shot('f5_revive');
  await press('revive');
  await page.waitForTimeout(400);
  // 终局：直接跳到第 20 波，等灭火者落地后击倒它
  await page.evaluate(() => { const g = RW.game; g.player.hp = g.player.maxHp = 999; g.core.hp = g.core.maxHp = 9999; g.startWave(RW.RUN.waves); g.wt = g.bossAt; });
  await until(() => !!RW.game.boss);
  await page.waitForTimeout(600); await shot('f6_final_boss');
  await page.evaluate(() => { const g = RW.game; g.killEnemy(g.boss, null, 'kill'); });
  await until(() => RW.game.mode === 'result');
  await btn('endless'); await page.waitForTimeout(300); await shot('f7_victory');
  const victory = await page.evaluate(() => { const r = RW.game.result; return [r.won, r.score, r.achievements.length]; });
  await press('endless');          // 继续无尽：先领祝福再整备
  await btn('bless:0'); await press('bless:0');
  await btn('next'); await shot('f8_endless_shop');
  await press('next');
  await until(() => RW.game.mode === 'battle' && RW.game.wave === RW.RUN.waves + 1);
  await page.evaluate(() => RW.game.finishRun());
  await btn('again'); await page.waitForTimeout(300); await shot('f9_result');
  // 成就页
  await press('home'); await press('records'); await page.waitForTimeout(300); await shot('f10_records');
  const achCount = await page.evaluate(() => RW.countKeys(RW.game.prog.ach));
  await press('home');
  // 每日挑战
  await press('daily');
  await until(() => RW.game.mode === 'battle' && !!RW.game.daily);
  const daily = await page.evaluate(() => [RW.game.clsId, RW.game.danger, RW.game.mutList.join(',')]);
  console.log('setup', setupOk, 'bless', blessOk, 'evolved', evolved, 'victory [won,score,ach]', victory, 'achievements', achCount, 'daily', daily);
  console.log('towers after build', towers1, 'core after repair/upgrade', coreAfter, 'errors', errors.length ? errors : 'none');
  if (!setupOk || !blessOk || !evolved || !victory[0] || !daily[0]) { console.error('流程断言失败'); process.exitCode = 1; }
  await browser.close(); server.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
