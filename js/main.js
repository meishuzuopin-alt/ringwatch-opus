// 环带值守 · 主循环：固定 1/60 秒步进、输入（浮动摇杆 / 战斗按钮 / 键盘）、界面动作分发
(function (root) {
  var RW = root.RW;
  var P = RW.Plat, D = RW.Draw, UI = RW.UI, S = RW.Sfx, T = RW.TUNE, DT = T.DT;
  var SAVE_KEY = 'ringwatch_save_v1';

  var g = null, paused = false, showHow = false, muted = false, buildMenu = false, buildMenuT = 0;
  var js = { active: false, id: null, ox: 0, oy: 0, kx: 0, ky: 0, mx: 0, my: 0 };
  var acc = 0, last = 0, inputBuf = { mx: 0, my: 0, dash: false, skill: false };
  var BATTLE_BTNS = { pause: 1, dash: 1, skill: 1, build: 1 };

  function persist() { P.save(SAVE_KEY, { best: g.best, muted: muted }); }
  function inBattle() { return g.mode === 'battle' || g.mode === 'clear' || g.mode === 'down'; }
  function resetStick() { js.active = false; js.id = null; js.mx = js.my = js.kx = js.ky = 0; }

  function start() {
    P.init();
    if (P.gl3d && RW.W3) { try { RW.W3.init(); } catch (err) { console.error(err); P.gl3d = false; } }
    var save = P.load(SAVE_KEY, { best: 0, muted: false }) || {};
    g = new RW.Game();
    g.best = save.best || 0;
    muted = !!save.muted;
    S.setMuted(muted);
    RW.game = g;
    P.onPointer(onPointer);
    P.onKey = onKey;
    P.onHide(function () { if (inBattle()) { paused = true; resetStick(); } });
    last = P.now();
    P.raf(frame);
  }

  // ---------- 战斗按钮：按下即生效（战斗里要快） ----------
  function battleButton(id) {
    if (id === 'pause') { paused = true; resetStick(); buildMenu = false; S.play({ type: 'ui' }); return; }
    if (id === 'dash') { inputBuf.dash = true; return; }
    if (id === 'skill') {
      if (!g.skill) return;
      if (g.skill.cd > 0) { UI.toast(g.skill.d.name + ' 冷却中 ' + g.skill.cd.toFixed(1) + 's', 0.8); return; }
      inputBuf.skill = true; return;
    }
    if (id === 'build') { buildMenu = !buildMenu; buildMenuT = 5; S.play({ type: 'ui' }); return; }
    if (id.indexOf('bt:') === 0) {
      var r = g.buildTower(id.slice(3));
      if (r !== 'ok') { UI.toast(r, 1.2); S.play({ type: 'deny' }); }
      else buildMenu = false;
    }
  }

  // ---------- 输入 ----------
  function onPointer(type, id, x, y) {
    if (type === 'down') S.unlock();
    if (inBattle() && !paused) {
      if (type === 'down') {
        var b = UI.hit(x, y);
        if (b && (BATTLE_BTNS[b.id] || b.id.indexOf('bt:') === 0)) {
          if (b.disabled) { if (b.why) UI.toast(b.why, 1.2); S.play({ type: 'deny' }); return; }
          UI.pressed = b.id; battleButton(b.id); return;
        }
        if (buildMenu && y > 604 && y < 668) return;       // 点在造塔菜单条上，不启动摇杆
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
    var k = P.keys, x = 0, y = 0;
    if (k.KeyA || k.ArrowLeft) x -= 1;
    if (k.KeyD || k.ArrowRight) x += 1;
    if (k.KeyW || k.ArrowUp) y -= 1;
    if (k.KeyS || k.ArrowDown) y += 1;
    var l = Math.sqrt(x * x + y * y) || 1;
    inputBuf.mx = x / l; inputBuf.my = y / l;
    return inputBuf;
  }
  function onKey(code) {
    S.unlock();
    if (code === 'Escape' || code === 'KeyP') {
      if (inBattle()) { paused = !paused; resetStick(); }
      return;
    }
    if (inBattle() && !paused) {
      if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') { battleButton('dash'); return; }
      if (code === 'KeyQ' || code === 'KeyE' || code === 'KeyJ') { battleButton('skill'); return; }
      if (code === 'KeyB') { battleButton('build'); return; }
      if (/^Digit[1-4]$/.test(code)) { battleButton('bt:' + RW.TOWER_ORDER[+code.slice(5) - 1]); return; }
    }
    if (code === 'Enter' || code === 'Space') {
      if (showHow) { showHow = false; return; }
      if (paused) { paused = false; return; }
      if (g.mode === 'title') action('start');
      else if (g.mode === 'shop') action('next');
      else if (g.mode === 'result') action('again');
    }
    if (g.mode === 'pick' && /^Digit[12]$/.test(code)) action('pick:' + g.offers[+code.slice(5) - 1]);
    if (g.mode === 'shop' && /^Digit[1234]$/.test(code)) action('buy:' + (+code.slice(5) - 1));
    if (g.mode === 'shop' && code === 'KeyR') action('reroll');
  }

  // ---------- 界面动作 ----------
  function action(id) {
    var parts = id.split(':'), cmd = parts[0], arg = parts[1];
    if (cmd !== 'wslot') UI.sel = null;
    S.play({ type: 'ui' });
    switch (cmd) {
      case 'start': case 'again': g.rollStartOffers(); break;
      case 'howto': showHow = true; break;
      case 'howtoClose': showHow = false; break;
      case 'mute': muted = !muted; S.setMuted(muted); persist(); break;
      case 'back': case 'home': g.mode = 'title'; break;
      case 'pick': g.startRun(arg); resetStick(); buildMenu = false; D.camSnap = true; if (RW.W3) RW.W3.snap = true; break;
      case 'resume': paused = false; break;
      case 'quit': paused = false; resetStick(); g.finishRun(); break;
      case 'revive':
        P.showReward('revive', function (r) {
          g.revive(); resetStick();
          UI.toast(r.preview ? '预览发放：已复活（未播放广告）' : '已复活');
        }, function (msg) { UI.toast(msg); });
        break;
      case 'giveup': g.finishRun(); break;
      case 'reroll': if (!g.reroll(false)) UI.toast('晶屑不足'); break;
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
      case 'repair': var r1 = g.repairCore(); if (r1 !== 'ok') UI.toast(r1); break;
      case 'armor': var r2 = g.armorCore(); if (r2 !== 'ok') UI.toast(r2); break;
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
      if (ev[i].type === 'result') persist();
      if (ev[i].type === 'shop') { UI.sel = null; buildMenu = false; }
    }
    ev.length = 0;
  }
  function frame() {
    var now = P.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    UI.frame(dt);
    if (buildMenu && !paused) { buildMenuT -= dt; if (buildMenuT <= 0) buildMenu = false; }
    if (!paused && !showHow) {
      acc += dt;
      var steps = 0;
      while (acc >= DT && steps < 5) { g.update(getInput()); drain(); acc -= DT; steps++; }
      if (steps >= 5) acc = 0;
    } else acc = 0;
    var intensity = Math.min(1, g.wave / 10 + (g.player.hp / g.player.maxHp < 0.35 ? 0.3 : 0));
    S.updateMusic(inBattle() && !paused && g.mode !== 'down', intensity);
    if (inBattle() || g.mode === 'revive') D.updateCamera(g, paused ? 0 : dt);
    render(paused ? 0 : dt);
    P.raf(frame);
  }
  function viewportPx(x, y, w, h) {
    var v = P.view, cw = P.canvas.height;
    var px = Math.round((v.ox + x * v.s) * v.dpr), pw = Math.round(w * v.s * v.dpr), ph = Math.round(h * v.s * v.dpr);
    var py = Math.round(cw - (v.oy + (y + h) * v.s) * v.dpr);
    return [px, py, pw, ph];
  }
  function render(dt) {
    var gl3 = P.gl3d && RW.W3 && RW.W3.ready;
    if (gl3) {
      var gl = RW.GL.gl;
      gl.viewport(0, 0, P.canvas.width, P.canvas.height);
      gl.clearColor(0.02, 0.02, 0.04, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      var battle = inBattle() || g.mode === 'revive';
      var V = T.VIEW, vp = battle ? viewportPx(V.x, V.y, V.w, V.h) : viewportPx(0, 0, T.W, T.H);
      RW.W3.draw(g, vp, dt || 0, !battle);
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
      case 'revive': if (gl3) D.overlay3D(g); else D.world(g); D.hud(g, UI, false); UI.btns.length = 0; UI.revive(g, P.adLabel('revive')); break;
      case 'shop': UI.shop(g, P.adLabel('reroll')); break;
      case 'result': UI.result(g); break;
    }
    UI.pressed = pressed;
    UI.drawToast();
    if (gl3) RW.GL.drawHud(P.hud, P.canvas.width, P.canvas.height);
  }

  RW.Main = { start: start, action: function (id) { action(id); }, battle: function (id) { battleButton(id); }, isPaused: function () { return paused; } };
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
