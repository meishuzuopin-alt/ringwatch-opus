// 圣火守护者 · 主循环：固定 1/60 秒步进、输入（浮动摇杆 / 战斗按钮 / 键盘）、界面动作分发
(function (root) {
  var RW = root.RW;
  var P = RW.Plat, D = RW.Draw, UI = RW.UI, S = RW.Sfx, T = RW.TUNE, DT = T.DT;
  var SAVE_KEY = 'ringwatch_save_v1', RUN_KEY = 'ringwatch_run_v1';   // 局外进度 / 局中存档（最近一次整备）

  var g = null, paused = false, showHow = false, muted = false, musicOff = false, buildMenu = false, buildMenuT = 0;
  var overlay = '';   // 盖在最上层的面板：'settings' 设置 / 'stats' 属性说明 / 'form' 圣火形态
  var js = { active: false, id: null, ox: 0, oy: 0, kx: 0, ky: 0, mx: 0, my: 0 };
  var BATTLE_BTNS = { pause: 1, dash: 1, skill: 1, build: 1 };
  var acc = 0, last = 0, inputBuf = { mx: 0, my: 0, dash: false, skill: 0 };

  function persist() { P.save(SAVE_KEY, { best: g.best, muted: muted, musicOff: musicOff, prog: g.prog, hero: UI.heroSel, setup: { danger: UI.runDanger, muts: UI.runMuts, map: UI.runMap }, opt: RW.opt, keys: RW.keys }); }
  // 设置生效：音量三条总线、特效亮度（其余由渲染层直接读 RW.opt）
  function applyOpt() {
    var o = RW.opt;
    S.setVolumes(o.vol, o.music, o.sfx);
    if (RW.GL) RW.GL.addK = o.fx;
    if (RW.W3 && RW.W3.setQuality) RW.W3.setQuality(o.gfx | 0);
  }
  // 局中存档：整备时写，结算时清；标题页据此显示「继续上局」
  function saveRunNow() { var sv = g.saveRun(); if (sv) { P.save(RUN_KEY, sv); UI.runInfo = runInfoOf(sv); } }
  function clearRun() { P.save(RUN_KEY, null); UI.runInfo = null; }
  function runInfoOf(sv) { return sv && sv.v === RW.RUN_SAVE_V && RW.CLASSES[sv.cls] ? { hero: RW.CLASSES[sv.cls].name, wave: sv.wave + 1, danger: sv.danger, endless: sv.endless, daily: sv.daily } : null; }
  // 同一套设置立刻再开一局（英雄、危险、变异器；每日挑战用当天的种子）
  function startWith(hero, daily) {
    clearRun();
    if (daily) { var ds = RW.dailySetup(daily); g.startRun(ds.hero, { danger: ds.danger, mutators: ds.mutators, seed: ds.seed, daily: daily, map: ds.map }); }
    else g.startRun(hero, { danger: Math.min(UI.runDanger, UI.maxDanger(g, hero)), mutators: UI.runMuts, map: RW.mapOpen(UI.runMap, g.prog) ? UI.runMap : 'village' });
    resetStick(); buildMenu = false; D.camSnap = true; if (RW.W3) RW.W3.snap = true;
  }
  function inBattle() { return g.mode === 'battle' || g.mode === 'clear' || g.mode === 'down'; }
  function resetStick() { js.active = false; js.id = null; js.mx = js.my = js.kx = js.ky = 0; }

  function start() {
    P.init();
    if (P.gl3d && RW.W3) { try { RW.W3.init(); } catch (err) { console.error(err); P.gl3d = false; } }
    var save = P.load(SAVE_KEY, { best: 0, muted: false }) || {};
    g = new RW.Game();
    g.best = save.best || 0;
    // 局外进度（解锁、各英雄最高波数、累计数据）；老存档没有这一项
    g.prog = save.prog || { unlocked: {}, heroBest: {}, kills: 0, coins: 0, built: 0, runs: 0 };
    UI.heroSel = save.hero && RW.CLASSES[save.hero] ? save.hero : 'mage';
    if (save.setup) {   // 上次的本局设置：危险等级与变异器
      UI.runDanger = save.setup.danger | 0;
      UI.runMuts = (save.setup.muts || []).filter(function (m) { return !!RW.MUTATORS[m]; });
      if (RW.MAPS[save.setup.map] && RW.mapOpen(save.setup.map, g.prog)) UI.runMap = save.setup.map;
    }
    var od = RW.optDefaults(), so = save.opt || {};
    for (var ok in od) RW.opt[ok] = typeof so[ok] === 'number' ? so[ok] : od[ok];
    RW.opt.miniMap = so.miniMap ? 1 : 0;
    // 改过的按键：只收认识的操作和字符串键码，坏档回到默认
    if (save.keys) for (var ka in RW.keys) { var kl = save.keys[ka]; if (kl && kl.length && kl.every(function (x) { return typeof x === 'string'; })) RW.keys[ka] = kl.slice(0, 4); }
    applyOpt();
    muted = !!save.muted;
    S.setMuted(muted);
    musicOff = !!save.musicOff; S.setMusicOff(musicOff); UI.musicOff = musicOff;
    UI.runInfo = runInfoOf(P.load(RUN_KEY, null));
    RW.game = g;
    P.onPointer(onPointer);
    P.onKey = onKey;
    P.onHide(function () { if (inBattle()) { paused = true; resetStick(); } });
    // 设置：切出窗口（失去焦点）时自动暂停
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('blur', function () { if (RW.opt.blur && inBattle() && !paused) { paused = true; resetStick(); } });
    last = P.now();
    P.raf(frame);
  }

  // ---------- 战斗按钮：按下即生效（战斗里要快） ----------
  function battleButton(id) {
    if (id === 'pause') { paused = true; resetStick(); buildMenu = false; S.play({ type: 'ui' }); return; }
    if (id === 'dash') { inputBuf.dash = true; return; }
    if (id.indexOf('skill') === 0) {
      var ix = id === 'skill' ? 0 : +id.slice(6);
      var sk = (g.skills && g.skills[ix]) || g.skill;
      if (!sk) return;
      if (sk.cd > 0) { UI.toast(sk.d.name + ' 冷却中 ' + sk.cd.toFixed(1) + 's', 0.8); return; }
      if ((g.player.mp || 0) < (sk.d.mp || 18)) { UI.toast('法力不足', 0.8); return; }
      inputBuf.skill = ix + 1; return;
    }
    if (id === 'build') { buildMenu = !buildMenu; buildMenuT = 5; S.play({ type: 'ui' }); return; }
    if (id.indexOf('cmd:') === 0) {   // 兵营指挥：布防 / 召回 / 兵种 / 阵型
      var msg = g.commandBarracks(id.slice(4));
      if (msg) UI.toast(msg, 1.6);
      S.play({ type: 'ui' });
      return;
    }
    if (id.indexOf('bt:') === 0) {
      var r = g.buildTower(id.slice(3));
      if (r !== 'ok') { UI.toast(r, 1.2); S.play({ type: 'deny' }); }
      else buildMenu = false;
    }
  }

  // ---------- 输入 ----------
  function onPointer(type, id, x, y) {
    if (type === 'down') { S.unlock(); UI.padNav = false; }
    if (inBattle() && !paused) {
      if (type === 'down') {
        var b = UI.hit(x, y);
        if (b && (BATTLE_BTNS[b.id] || b.id.indexOf('bt:') === 0 || b.id.indexOf('skill') === 0 || b.id.indexOf('cmd:') === 0)) {
          if (b.disabled) { if (b.why) UI.toast(b.why, 1.2); S.play({ type: 'deny' }); return; }
          UI.pressed = b.id; battleButton(b.id); return;
        }
        if (buildMenu && y > T.H - 74 && x < 600) return;   // 点在造塔菜单条上，不启动摇杆
        if (!js.active) { js.active = true; js.id = id; js.ox = x; js.oy = y; js.kx = js.ky = js.mx = js.my = 0; }
      } else if (type === 'move') {
        if (js.active && id === js.id) updateStick(x, y);
      } else {
        if (js.active && id === js.id) resetStick();
        UI.pressed = null;
      }
      return;
    }
    if (type === 'down') UI.down(x, y);
    else if (type === 'up') { var a = UI.up(x, y); if (a) action(a); }
  }
  function updateStick(x, y) {
    var dx = x - js.ox, dy = y - js.oy, l = Math.sqrt(dx * dx + dy * dy);
    var R = 44, FOLLOW = 64, DEAD = 5, FULL = 34;
    if (l > FOLLOW) {             // 手指拖远时底座跟随，反向操作不用先把手指拉回来
      js.ox += dx / l * (l - FOLLOW); js.oy += dy / l * (l - FOLLOW);
      dx = x - js.ox; dy = y - js.oy; l = FOLLOW;
    }
    var kl = Math.min(l, R);
    js.kx = l ? dx / l * kl : 0; js.ky = l ? dy / l * kl : 0;
    var m = l <= DEAD ? 0 : Math.min(1, (l - DEAD) / (FULL - DEAD));
    js.mx = l ? dx / l * m : 0; js.my = l ? dy / l * m : 0;
  }
  function getInput() {
    if (js.active) { inputBuf.mx = js.mx; inputBuf.my = js.my; return inputBuf; }
    if (pad.move) { inputBuf.mx = pad.mx; inputBuf.my = pad.my; return inputBuf; }
    var k = P.keys, x = 0, y = 0, K = RW.keys;
    function held(a) { var l = K[a]; for (var i = 0; i < l.length; i++) if (k[l[i]]) return true; return false; }
    if (held('left')) x -= 1;
    if (held('right')) x += 1;
    if (held('up')) y -= 1;
    if (held('down')) y += 1;
    var l = Math.sqrt(x * x + y * y) || 1;
    inputBuf.mx = x / l; inputBuf.my = y / l;
    return inputBuf;
  }
  function onKey(code) {
    S.unlock();
    UI.padNav = false;
    if (overlay) {
      if (overlay === 'keys') {   // 改键：等玩家按下新键
        if (UI.keyWait) { if (code !== 'Escape') { RW.rebind(UI.keyWait, code); persist(); } UI.keyWait = null; S.play({ type: 'ui' }); }
        else if (code === 'Escape' || code === 'Enter') action('keysClose');
        return;
      }
      if (overlay === 'form') {
        if (/^Digit[123]$/.test(code)) action('coreForm:' + RW.CORE_FORM_ORDER[+code.slice(5) - 1]);
        else if (code === 'Escape') action('formClose');
        return;
      }
      if (code === 'Escape' || code === 'Enter') action(overlay === 'settings' ? 'settingsClose' : 'statsClose');
      return;
    }
    var ka = RW.keyAction(code);
    if (code === 'Escape' || ka === 'pause') {
      if (inBattle()) { paused = !paused; resetStick(); }
      return;
    }
    if (inBattle() && !paused) {
      if (/^Digit[1-4]$/.test(code)) { battleButton('bt:' + RW.TOWER_ORDER[+code.slice(5) - 1]); return; }
      if (ka === 'dash' || ka === 'build' || (ka && ka.indexOf('cmd:') === 0)) { battleButton(ka); return; }
      if (ka && ka.indexOf('skill') === 0) { battleButton('skill:' + ka.slice(5)); return; }
    }
    if (code === 'Enter' || code === 'Space') {
      if (showHow) { showHow = false; return; }
      if (paused) { paused = false; return; }
      if (g.mode === 'title') action('start');
      else if (g.mode === 'pick') action('pick:' + UI.heroSel);
      else if (g.mode === 'shop') action('next');
      else if (g.mode === 'result') action('retry');
      else if (g.mode === 'records') action('home');
    }
    if (g.mode === 'bless' && /^Digit[123]$/.test(code)) { action('bless:' + (+code.slice(5) - 1)); return; }
    if (g.mode === 'result' && code === 'KeyC' && g.result && g.result.canEndless) { action('endless'); return; }
    if (g.mode === 'records' && code === 'Escape') { action('home'); return; }
    if (g.mode === 'pick') {
      var idx = RW.CLASS_ORDER.indexOf(UI.heroSel), n = RW.CLASS_ORDER.length;
      if (code === 'ArrowRight' || code === 'KeyD') { action('hero:' + RW.CLASS_ORDER[(idx + 1) % n]); return; }
      if (code === 'ArrowLeft' || code === 'KeyA') { action('hero:' + RW.CLASS_ORDER[(idx + n - 1) % n]); return; }
      if (code === 'ArrowDown' || code === 'KeyS') { action('hero:' + RW.CLASS_ORDER[(idx + 5) % n]); return; }
      if (code === 'ArrowUp' || code === 'KeyW') { action('hero:' + RW.CLASS_ORDER[(idx + n - 5) % n]); return; }
    }
    if (g.mode === 'shop' && /^Digit[1234]$/.test(code)) action('buy:' + (+code.slice(5) - 1));
    if (g.mode === 'shop' && code === 'KeyR') action('reroll');
  }

  // ---------- 手柄 ----------
  // 战斗：左摇杆 / 十字键移动，A 或 RT 冲刺，X / Y / B 放 Q / E / R，LB 造塔（十字键选种类），LT 兵营布防，按下左 / 右摇杆换兵种 / 阵型，菜单键暂停
  // 菜单：十字键 / 左摇杆移动焦点，A 确认，B 返回，菜单键开始 / 下一波，整备页 X 刷新
  var pad = { prev: [], move: false, mx: 0, my: 0, navT: 0 };
  var PAD_DEAD = 0.22;
  function padDown(p, i) { var b = p.buttons[i]; return !!b && (b.pressed || b.value > 0.5); }
  function pollPad(dt) {
    var p = P.pad && P.pad();
    if (!p) { pad.move = false; return; }
    var now = [], i, any = false;
    for (i = 0; i < 16; i++) { now[i] = padDown(p, i); if (now[i]) any = true; }
    var ax = p.axes[0] || 0, ay = p.axes[1] || 0, mag = Math.sqrt(ax * ax + ay * ay);
    var prev = pad.prev, hit = function (k) { return now[k] && !prev[k]; };   // 这一帧刚按下
    pad.prev = now;
    if (mag > PAD_DEAD) any = true;
    if (any) { S.unlock(); UI.padNav = true; }
    var battle = inBattle() && !paused && !overlay;
    if (battle) {
      // 移动：摇杆去掉死区后重新映射到 0–1；造塔菜单打开时十字键用来选塔
      var mx = 0, my = 0;
      if (mag > PAD_DEAD) { var k = Math.min(1, (mag - PAD_DEAD) / (1 - PAD_DEAD)) / mag; mx = ax * k; my = ay * k; }
      if (!buildMenu) { if (now[14]) mx = -1; if (now[15]) mx = 1; if (now[12]) my = -1; if (now[13]) my = 1; }
      var ml = Math.sqrt(mx * mx + my * my);
      if (ml > 1) { mx /= ml; my /= ml; }
      pad.move = ml > 0.01; pad.mx = mx; pad.my = my;
      if (hit(0) || hit(7)) battleButton('dash');
      if (hit(2)) battleButton('skill:0');
      if (hit(3)) battleButton('skill:1');
      if (hit(1) || hit(5)) battleButton('skill:2');
      if (hit(4)) battleButton('build');
      if (hit(6)) battleButton('cmd:post');     // LT：兵营布防到脚下（站在兵营旁 = 召回）
      if (hit(10)) battleButton('cmd:troop');   // 按下左摇杆：换兵种
      if (hit(11)) battleButton('cmd:form');    // 按下右摇杆：换阵型
      if (buildMenu) { var order = [14, 12, 15, 13]; for (i = 0; i < 4; i++) if (hit(order[i])) battleButton('bt:' + RW.TOWER_ORDER[i]); }
      if (hit(9) || hit(8)) battleButton('pause');
      return;
    }
    pad.move = false;
    if (!any) return;
    UI.padNav = true;
    var btns = UI.lastBtns || [];
    if (!btns.length) return;
    if (!findBtn(UI.focusId)) UI.focusId = defaultFocus(btns);
    // 方向：十字键按一下走一格；摇杆推住时每 0.2 秒走一格
    var dx = 0, dy = 0;
    if (hit(14)) dx = -1; else if (hit(15)) dx = 1; else if (hit(12)) dy = -1; else if (hit(13)) dy = 1;
    pad.navT -= dt;
    if (!dx && !dy && mag > 0.6 && pad.navT <= 0) {
      if (Math.abs(ax) > Math.abs(ay)) dx = ax > 0 ? 1 : -1; else dy = ay > 0 ? 1 : -1;
      pad.navT = 0.2;
    }
    if (mag < 0.4) pad.navT = 0;
    if (dx || dy) moveFocus(btns, dx, dy);
    if (hit(0)) {
      var b = findBtn(UI.focusId);
      if (b) { if (b.disabled) { if (b.why) UI.toast(b.why); S.play({ type: 'deny' }); } else action(b.id); }
    }
    if (hit(1)) padBack();
    if (hit(9)) {
      if (paused) action('resume');
      else if (g.mode === 'title') action(UI.runInfo ? 'continueRun' : 'start');
      else if (g.mode === 'shop') action('next');
      else if (g.mode === 'result') action('retry');
    }
    if (hit(2) && g.mode === 'shop' && !overlay) action('reroll');
  }
  function findBtn(id) {
    var btns = UI.lastBtns || [];
    for (var i = 0; i < btns.length; i++) if (btns[i].id === id) return btns[i];
    return null;
  }
  function defaultFocus(btns) {
    var pref = /^(coreForm:|settingsClose|statsClose|howtoClose|resume|continueRun|start|pick:|bless:0|next|retry|revive)/;
    for (var i = 0; i < btns.length; i++) if (pref.test(btns[i].id)) return btns[i].id;
    return btns[0].id;
  }
  // 往指定方向找最近的按钮：沿方向的距离 + 偏离方向的距离 × 2.5
  function moveFocus(btns, dx, dy) {
    var cur = findBtn(UI.focusId);
    if (!cur) return;
    var cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2, best = null, bs = 1e9;
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      if (b.id === cur.id) continue;
      var vx = b.x + b.w / 2 - cx, vy = b.y + b.h / 2 - cy, along = vx * dx + vy * dy;
      if (along <= 4) continue;
      var sc = along + Math.abs(vx * dy - vy * dx) * 2.5;
      if (sc < bs) { bs = sc; best = b; }
    }
    if (best) { UI.focusId = best.id; if (g.mode === 'pick' && best.id.indexOf('hero:') === 0) action(best.id); else S.play({ type: 'ui' }); }
  }
  function padBack() {
    if (overlay) action(overlay === 'settings' ? 'settingsClose' : (overlay === 'form' ? 'formClose' : (overlay === 'keys' ? 'keysClose' : 'statsClose')));
    else if (showHow) action('howtoClose');
    else if (paused) action('resume');
    else if (g.mode === 'pick') action('back');
    else if (g.mode === 'records' || g.mode === 'result') action('home');
  }

  // ---------- 界面动作 ----------
  function action(id) {
    var parts = id.split(':'), cmd = parts[0], arg = parts[1];
    if (cmd === 'keyset') arg = parts.slice(1).join(':');   // 操作名里本身带冒号（cmd:post）
    if (cmd !== 'wslot') UI.sel = null;
    S.play({ type: 'ui' });
    switch (cmd) {
      case 'start': case 'again': g.rollStartOffers(); RW.loadMap(UI.runMap); break;
      case 'map':
        if (!RW.mapOpen(arg, g.prog)) break;
        UI.runMap = arg; RW.loadMap(arg); persist();
        UI.toast(RW.MAPS[arg].name + '：' + RW.MAPS[arg].desc, 2.4);
        break;
      case 'formClose': overlay = ''; break;
      case 'coreForm':
        var rf = g.upgradeCore(arg);
        if (rf === 'ok') { overlay = ''; UI.toast(RW.CORE_FORMS[arg].name + '：' + RW.CORE_FORMS[arg].note, 2.6); }
        else { UI.toast(rf); S.play({ type: 'deny' }); }
        break;
      case 'howto': showHow = true; break;
      case 'howtoClose': showHow = false; break;
      case 'mute': muted = !muted; S.setMuted(muted); persist(); break;
      case 'music': musicOff = !musicOff; UI.musicOff = musicOff; S.setMusicOff(musicOff); persist(); break;
      case 'back': case 'home': g.mode = 'title'; break;
      case 'hero': UI.heroSel = arg; break;
      case 'pick':
        if (!RW.isUnlocked(arg, g.prog)) { UI.toast('还没解锁：' + RW.CLASSES[arg].unlock.text); S.play({ type: 'deny' }); break; }
        UI.heroSel = arg; persist();
        startWith(arg, '');
        break;
      case 'continueRun':
        var sv = P.load(RUN_KEY, null);
        if (g.loadRun(sv)) { resetStick(); buildMenu = false; D.camSnap = true; if (RW.W3) RW.W3.snap = true; UI.toast('从第 ' + sv.wave + ' 波后的整备继续', 1.8); }
        else { clearRun(); UI.toast('上局存档读不出来，已清除'); S.play({ type: 'deny' }); }
        break;
      case 'retry':   // 结算页 / 暂停页：同设置立刻再来
        var last = g.result || {}, hero = last.hero || g.clsId, dly = last.daily || g.daily || '';
        if (g.mode !== 'result') { paused = false; g.finishRun(); }
        startWith(hero, dly);
        break;
      case 'toTitle': paused = false; resetStick(); g.mode = 'title'; break;
      case 'settings': overlay = 'settings'; break;
      case 'settingsClose': overlay = ''; persist(); break;
      case 'miniMapToggle': RW.opt.miniMap = RW.opt.miniMap ? 0 : 1; persist(); break;
      case 'statsHelp': overlay = 'stats'; break;
      case 'keys': overlay = 'keys'; UI.keyWait = null; break;
      case 'keysClose': overlay = 'settings'; UI.keyWait = null; persist(); break;
      case 'keyset': UI.keyWait = arg; break;
      case 'keysReset': RW.keys = RW.keysDefault(); UI.keyWait = null; persist(); break;
      case 'statsClose': overlay = ''; break;
      case 'optReset': RW.opt = RW.optDefaults(); applyOpt(); persist(); break;
      case 'set':
        for (var si = 0; si < RW.SETTINGS.length; si++) {
          var st = RW.SETTINGS[si];
          if (st.id !== arg) continue;
          var dir = +parts[2], v = RW.opt[st.id];
          if (st.opts) v = Math.max(0, Math.min(st.opts.length - 1, v + dir));
          else v = Math.round(Math.max(st.min, Math.min(st.max, v + dir * st.step)) * 100) / 100;
          RW.opt[st.id] = v;
        }
        applyOpt();
        break;
      case 'danger': UI.runDanger = +arg; persist(); break;
      case 'mut':
        var mi = UI.runMuts.indexOf(arg), md = RW.MUTATORS[arg];
        if (mi >= 0) UI.runMuts.splice(mi, 1); else if (md) { UI.runMuts.push(arg); UI.toast(md.name + '：' + md.note + ' · 分数 +' + Math.round(md.score * 100) + '%', 1.6); }
        persist();
        break;
      case 'daily':
        var dk = UI.dayKey(), ds = RW.dailySetup(dk);
        startWith(ds.hero, dk);
        UI.toast('每日挑战 · ' + RW.CLASSES[ds.hero].name + ' · 危险 ' + ds.danger + ' · ' + ds.mutators.map(function (m) { return RW.MUTATORS[m].name; }).join(' '), 2.6);
        break;
      case 'records': g.mode = 'records'; break;
      case 'bless':
        var rb = g.chooseBless(+arg);
        if (rb !== 'ok') { UI.toast(rb); S.play({ type: 'deny' }); }
        break;
      case 'evolve':
        var re = g.evolveWeapon(+arg);
        if (re !== 'ok') { UI.toast(re); S.play({ type: 'deny' }); }
        else UI.toast('进化成功：' + g.weapons[+arg].name + ' · ' + g.weapons[+arg].ev.note, 2);
        break;
      case 'endless':
        if (g.continueEndless()) { resetStick(); buildMenu = false; UI.toast('无尽模式：敌人每波再硬 ' + Math.round(RW.RUN.endlessHp * 100) + '%', 2); }
        break;
      case 'resume': paused = false; break;
      case 'quit': paused = false; resetStick(); g.finishRun(); break;
      case 'revive':
        P.showReward('revive', function (r) {
          g.revive(); resetStick();
          UI.toast(r.preview ? '预览发放：已复活（未播放广告）' : '已复活');   // 桌面版 r.free：直接复活
        }, function (msg) { UI.toast(msg); });
        break;
      case 'giveup': g.finishRun(); break;
      case 'exitGame': if (root.desktop) root.desktop.quit(); break;
      case 'fullscreen': if (root.desktop) root.desktop.toggleFullscreen(); break;
      case 'reroll': if (!g.reroll(false)) UI.toast('金币不足，刷新要 ' + g.rerollCost()); break;
      case 'adReroll':
        P.showReward('reroll', function (r) {
          g.shop.adUsed = true; g.reroll(true);
          UI.toast(r.preview ? '预览发放：已免费刷新（未播放广告）' : '已免费刷新');
        }, function (msg) { UI.toast(msg); });
        break;
      case 'next': g.nextWave(); resetStick(); buildMenu = false; break;
      case 'buy':
        var res = g.buy(+arg);
        if (res !== 'ok') { UI.toast(res); S.play({ type: 'deny' }); }
        break;
      case 'lock': g.toggleLock(+arg); break;
      case 'ban': var rb2 = g.banSlot(+arg); if (rb2 !== 'ok') { UI.toast(rb2); S.play({ type: 'deny' }); } else UI.toast('已禁用，本局不再出现 · 还能禁用 ' + g.bansLeft + ' 件', 1.6); break;
      case 'recTab': UI.recTab = UI.recTab === 'history' ? 'ach' : 'history'; break;
      case 'repair': var r1 = g.repairCore(); if (r1 !== 'ok') UI.toast(r1); break;
      case 'upgrade':
        if (g.coreNeedsForm()) { overlay = 'form'; break; }
        var r2 = g.upgradeCore(); if (r2 !== 'ok') UI.toast(r2); break;
      case 'wslot':
        var wi = +arg, w = g.weapons[wi];
        if (!w) break;
        if (UI.sel === 'w:' + wi) {
          if (!g.sellWeapon(wi)) UI.toast('至少要留一把武器');
          UI.sel = null;
        } else { UI.sel = 'w:' + wi; UI.toast('再点一次：出售 ' + w.d.name + '，返还 ' + g.weaponSellValue(w)); }
        break;
    }
  }
  UI.onDeny = function () { S.play({ type: 'deny' }); };

  // ---------- 主循环 ----------
  function drain() {
    var ev = g.events;
    for (var i = 0; i < ev.length; i++) {
      S.play(ev[i]);
      if (ev[i].type === 'result' || ev[i].type === 'victory') { persist(); clearRun(); }
      if (ev[i].type === 'shop' || (ev[i].type === 'buy' && ev[i].a === 'bless')) saveRunNow();
      if (ev[i].type === 'shop') { UI.sel = null; buildMenu = false; if (g.shop.interest > 0) UI.toast('利息到账 +' + g.shop.interest + ' 金币'); }
    }
    ev.length = 0;
  }
  var booted = false;
  function frame() {
    var now = P.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    UI.frame(dt);
    if (buildMenu && !paused) { buildMenuT -= dt; if (buildMenuT <= 0) buildMenu = false; }
    pollPad(dt);
    if (!paused && !showHow && !overlay) {
      acc += dt;
      var steps = 0;
      while (acc >= DT && steps < 5) { g.update(getInput()); drain(); acc -= DT; steps++; }
      if (steps >= 5) acc = 0;
    } else acc = 0;
    var intensity = Math.min(1, g.wave / 10 + (g.player.hp / g.player.maxHp < 0.35 ? 0.3 : 0) + g.momTier * 0.12);   // 战意越高音乐越猛
    // 音乐状态：菜单 / 整备放慢速重型段落；战斗按强度换段落；Boss 在场换 Boss 段落；暂停、倒地时停
    var mstate = 'menu';
    if (paused || g.mode === 'down' || g.mode === 'revive') mstate = 'off';
    else if (inBattle()) mstate = (g.boss && g.boss.on) || g.bossAlert > 0 ? 'boss' : 'battle';
    if (S.themeMap !== RW.MAP.id) { S.setTheme(RW.MAP.music); S.themeMap = RW.MAP.id; }   // 每张地图一套音乐主题与环境声
    S.updateMusic(mstate, intensity);
    if (inBattle() || g.mode === 'revive') D.updateCamera(g, paused ? 0 : dt);
    render(paused ? 0 : dt);
    // 桌面版启动计时：第一帧画完记一笔（写进 startup.log）
    if (!booted) { booted = true; if (typeof window !== 'undefined' && window.desktop && window.desktop.boot) window.desktop.boot('第一帧画面'); }
    P.raf(frame);
  }
  function render(dt) {
    var gl3 = P.gl3d && RW.W3 && RW.W3.ready;
    if (gl3) {
      // 3D 铺满整个画布，HUD 画在上层的透明画布上
      var cw = P.canvas.width, ch = P.canvas.height, battle = inBattle() || g.mode === 'revive';
      RW.GL.resize(cw, ch);
      RW.W3.draw(g, [0, 0, cw, ch], dt || 0, !battle);
    }
    D.begin();
    var pressed = UI.pressed;
    switch (g.mode) {
      case 'title': UI.title(g, muted); if (showHow) UI.howto(); break;
      case 'pick': UI.pick(g); break;
      case 'battle': case 'clear': case 'down':
        if (gl3) D.overlay3D(g); else D.world(g);
        D.hud(g, UI, buildMenu); D.joystick(js);
        if (paused) UI.pause(g, muted);
        break;
      case 'revive': if (gl3) D.overlay3D(g); else D.world(g); D.hud(g, UI, false); UI.btns.length = 0; UI.revive(g, P.hasAds ? P.adLabel('revive') : ''); break;
      case 'shop': UI.shop(g, P.hasAds ? P.adLabel('reroll') : ''); break;
      case 'bless': UI.bless(g); break;
      case 'result': UI.result(g); break;
      case 'records': UI.records(g); break;
    }
    if (overlay === 'settings') UI.settingsPanel();
    else if (overlay === 'keys') UI.keysPanel();
    else if (overlay === 'stats') UI.statsPanel(g);
    else if (overlay === 'form') UI.formPanel(g);
    UI.pressed = pressed;
    // 提示条：战斗时放在波次面板下面；暂停和其他界面放最顶上。战斗里的提示不带到结算 / 标题页（那里有自己的标题）
    if (UI.lastMode !== g.mode) { if (/^(result|title|pick|records)$/.test(g.mode)) UI.toastT = 0; UI.lastMode = g.mode; }
    UI.toastY = !paused && /^(battle|clear|down|revive)$/.test(g.mode) ? 64 : 8;   // 战斗中：顶部横幅（8–60）和 Boss 血条下方，仍在画面中央 50% 之外
    UI.drawToast();
  }

  RW.Main = { start: start, action: function (id) { action(id); }, battle: function (id) { battleButton(id); }, isPaused: function () { return paused; } };
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
