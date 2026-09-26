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
  // 假手柄：测试里改 window.__pad 的按键和摇杆
  await page.addInitScript(() => {
    window.__pad = { buttons: new Array(17).fill(0), axes: [0, 0, 0, 0] };
    navigator.getGamepads = () => [{ connected: true, id: 'test-pad', mapping: 'standard', buttons: window.__pad.buttons.map(v => ({ pressed: v > 0.5, value: v })), axes: window.__pad.axes }];
  });
  await page.goto(`http://localhost:${server.address().port}/preview.html?skipopening`);
  await page.waitForTimeout(400);
  const toS = (x, y) => page.evaluate(([x, y]) => { const v = RW.Plat.view; return [v.ox + x * v.s, v.oy + y * v.s]; }, [x, y]);
  const tap = async (x, y) => { const [a, b] = await toS(x, y); await page.mouse.click(a, b); await page.waitForTimeout(150); };
  const shot = n => page.screenshot({ path: path.join(out, n + '.png') });
  // 软件渲染很慢：等界面真正画出某个按钮 / 进入某个状态再操作，不靠固定延时
  const until = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 120000, polling: 50 });   // 大地图 + 机器繁忙时软件渲染更慢
  const btn = id => until(id => RW.UI.btns.some(b => b.id === id), id);
  // 按按钮 id 点击：等它画出来，再点它的中心（界面改版不用改测试坐标）
  const press = async id => {
    await btn(id);
    const r = await page.evaluate(id => { const b = RW.UI.btns.find(b => b.id === id); return [b.x + b.w / 2, b.y + b.h / 2]; }, id);
    await tap(r[0], r[1]);
  };
  // 设置页：震屏调低一档，关掉再看是否记住
  await press('settings'); await btn('set:shake:-1'); await shot('f_settings');
  await press('set:shake:-1'); await press('settingsClose');
  const optOk = await page.evaluate(() => RW.opt.shake === 0.75 && JSON.parse(localStorage.getItem('ringwatch_save_v1')).opt.shake === 0.75);
  await press('start'); await press('hero:mage');
  await press('mut:swarm'); await press('mut:swarm');   // 变异器开关：开了再关
  await press('map:forest');                             // 地图：林缘营地
  const setupOk = await page.evaluate(() => RW.UI.runMuts.length === 0 && RW.UI.runDanger === 0 && RW.MAP.id === 'forest');
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
  await press('statsHelp'); await btn('statsClose'); await shot('f2b_stats_help'); await press('statsClose');
  await press('repair');           // 维修
  await until(() => RW.game.core.hp > 90).catch(() => {});
  await press('upgrade');          // 圣火升级（取代旧的「加固」）
  await until(() => (RW.game.core.lv || 1) > 1).catch(() => {});
  await press('upgrade');          // 再升一级：3 级要先选圣火形态
  await btn('coreForm:ward'); await page.waitForTimeout(300); await shot('f2c_core_form');
  await press('coreForm:ward');
  await until(() => RW.game.core.form === 'ward').catch(() => {});
  const formOk = await page.evaluate(() => RW.game.core.form === 'ward' && RW.game.core.lv === 3 && RW.game.mapId === 'forest');
  await press('buy:0');            // 买第一张卡
  await page.waitForTimeout(300);
  await press('evolve:0');         // 进化起手武器
  await until(() => !!RW.game.weapons[0].ev).catch(() => {});
  await page.waitForTimeout(300);
  await shot('f3_shop_after');
  const evolved = await page.evaluate(() => RW.game.weapons[0].name || '');
  const coreAfter = await page.evaluate(() => [Math.round(RW.game.core.hp), RW.game.core.maxHp, 'Lv' + (RW.game.core.lv || 1)]);
  // 局中存档：退出到标题，再「继续上局」回到同一次整备
  const runSaved = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('ringwatch_run_v1') || 'null'); return !!s && s.wave === 4; });
  await page.evaluate(() => RW.Main.action('toTitle'));
  await btn('continueRun'); await shot('f3b_title_continue'); await press('continueRun');
  await until(() => RW.game.mode === 'shop' && RW.game.wave === 4);
  const resumed = await page.evaluate(() => RW.game.wave === 4 && RW.game.weapons.length >= 1);
  await press('next');             // 下一波（Boss 波）
  await page.waitForTimeout(8000);
  await shot('f4_boss');
  // 直接让主角倒下（不靠怪物慢慢打，CI 机器慢时也稳定），等复活页出现
  // 英雄倒下但圣火还亮着：倒计时复活，不结束
  await page.evaluate(() => { const g = RW.game; g.player.hp = 0; g.lastHits.push({ src: '测试', dmg: 1, wave: g.wave }); g.die(); });
  await page.waitForTimeout(600); await shot('f4b_respawn');
  const respawnOk = await page.evaluate(() => RW.game.mode === 'battle' && RW.game.player.dead && RW.game.player.respawnT > 0);
  await page.evaluate(() => { RW.game.player.respawnT = 0.05; });
  await until(() => !RW.game.player.dead);
  // 圣火熄灭才进复活页
  await page.evaluate(() => { const g = RW.game; g.hurtCore(1e9, '测试'); });
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
  // 手柄：左摇杆往右推，主角往右走；菜单键暂停，B 键继续
  const x0 = await page.evaluate(() => RW.game.player.x);
  await page.evaluate(() => { window.__pad.axes[0] = 1; });
  await until(x0 => RW.game.player.x > x0 + 24, x0).catch(() => {});
  await page.evaluate(() => { window.__pad.axes[0] = 0; });
  const x1 = await page.evaluate(() => RW.game.player.x);
  // 软件渲染一帧可能超过 150 毫秒：按住直到生效再松开
  await page.evaluate(() => { window.__pad.buttons[9] = 1; });
  await until(() => RW.Main.isPaused()); await page.evaluate(() => { window.__pad.buttons[9] = 0; });
  await page.waitForTimeout(300); await shot('f11_pause_pad');
  await page.evaluate(() => { window.__pad.buttons[1] = 1; });
  await until(() => !RW.Main.isPaused()); await page.evaluate(() => { window.__pad.buttons[1] = 0; });
  const padOk = x1 > x0 + 20;
  console.log('respawn', respawnOk, 'map+form', formOk, 'settings', optOk, 'run save', runSaved, 'resumed', resumed, 'pad move', Math.round(x1 - x0));
  console.log('setup', setupOk, 'bless', blessOk, 'evolved', evolved, 'victory [won,score,ach]', victory, 'achievements', achCount, 'daily', daily);
  console.log('towers after build', towers1, 'core after repair/upgrade', coreAfter, 'errors', errors.length ? errors : 'none');
  if (!setupOk || !blessOk || !evolved || !victory[0] || !daily[0] || !optOk || !runSaved || !resumed || !padOk || !formOk || !respawnOk) { console.error('流程断言失败'); process.exitCode = 1; }
  await browser.close(); server.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
