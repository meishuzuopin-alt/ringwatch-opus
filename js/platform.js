// 圣火守护者 · 平台层：微信小游戏 / 浏览器 预览 两套实现，对上层暴露同一组接口
(function (root) {
  var RW = root.RW;
  var T = RW.TUNE;
  var isWx = typeof wx !== 'undefined' && typeof wx.createCanvas === 'function';
  var Plat = { isWx: isWx, view: { s: 1, ox: 0, oy: 0, dpr: 1, cssW: T.W, cssH: T.H }, keys: {} };

  Plat.init = function () {
    if (isWx) {
      var info = wx.getSystemInfoSync();
      Plat.canvas = wx.createCanvas();
      Plat.view.cssW = info.windowWidth; Plat.view.cssH = info.windowHeight;
      Plat.view.dpr = Math.min(2, info.pixelRatio || 2);
      Plat.canvas.width = Math.round(Plat.view.cssW * Plat.view.dpr);
      Plat.canvas.height = Math.round(Plat.view.cssH * Plat.view.dpr);
    } else {
      Plat.canvas = document.getElementById('game');
      var fit = function () {
        var v = Plat.view, inset = Plat.safeInsets();
        v.cssW = Math.max(1, window.innerWidth - inset.l - inset.r);
        v.cssH = Math.max(1, window.innerHeight - inset.t - inset.b);
        v.dpr = Math.min(2, window.devicePixelRatio || 1);
        Plat.canvas.style.left = inset.l + 'px'; Plat.canvas.style.top = inset.t + 'px';
        Plat.canvas.style.width = v.cssW + 'px'; Plat.canvas.style.height = v.cssH + 'px';
        Plat.canvas.style.touchAction = 'none';
        Plat.canvas.width = Math.round(v.cssW * v.dpr);
        Plat.canvas.height = Math.round(v.cssH * v.dpr);
        if (Plat.hud) {
          Plat.hud.width = Plat.canvas.width; Plat.hud.height = Plat.canvas.height;
          if (Plat.hud.style) {
            Plat.hud.style.left = inset.l + 'px'; Plat.hud.style.top = inset.t + 'px';
            Plat.hud.style.width = v.cssW + 'px'; Plat.hud.style.height = v.cssH + 'px';
          }
        }
        Plat.computeView();
        if (Plat.onResize) Plat.onResize();
      };
      window.addEventListener('resize', fit);
      window.addEventListener('orientationchange', fit);
      // 切回前台时，iOS 要把被系统挂起的音频上下文在手势里 resume
      document.addEventListener('touchend', function () {
        try { if (RW.Sfx && RW.Sfx.unlock) RW.Sfx.unlock(); } catch (e) { /* 没有音频也继续 */ }
      }, { passive: true });
      document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
      fit();
    }
    // 优先用 WebGL 画 3D，2D 画面（HUD/菜单）画到离屏画布上再贴上去；不支持 WebGL 时退回纯 2D。
    // three 0.186.1（r186）从 r163 起只要 WebGL2。先在扔掉的画布上探测，失败就不要碰游戏画布，
    // 否则 WebGL 上下文占住画布，getContext('2d') 会得到 null，画面全黑。?2d 不探测、不盖提示。
    var force2d = !isWx && typeof location !== 'undefined' && /[?&]2d\b/.test(location.search);
    var skip3d = force2d;
    if (!isWx && !force2d && !Plat.webgl2()) {
      skip3d = true;
      Plat.webgl2Missing = true;
      Plat.webgl2Msg = 'This browser does not support WebGL 2. Ringwatch uses Three.js r186, which needs WebGL 2, so the 3D view cannot start.';
      console.error(Plat.webgl2Msg);
    }
    try { Plat.gl3d = !skip3d && !!(RW.GL && RW.GL.init(Plat.canvas)); } catch (err) { console.error(err); Plat.gl3d = false; }
    if (Plat.gl3d) {
      if (isWx) Plat.hud = Plat.createOffscreen(Plat.canvas.width, Plat.canvas.height);
      else {
        // HUD：叠在 3D 画布上的透明画布，不接收鼠标（输入统一由底下的游戏画布处理）
        var h = Plat.hud = document.createElement('canvas');
        h.id = 'hud';
        h.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;width:' + Plat.view.cssW + 'px;height:' + Plat.view.cssH + 'px';
        h.width = Plat.canvas.width; h.height = Plat.canvas.height;
        Plat.canvas.parentNode.appendChild(h);
      }
      Plat.ctx = Plat.hud.getContext('2d');
    } else Plat.ctx = Plat.canvas.getContext('2d');
    if (Plat.webgl2Missing) Plat.showWebgl2Notice(Plat.webgl2Msg, !Plat.ctx);
    Plat.computeView();
  };

  // 扔掉的画布上试 WebGL2，成功后立刻丢掉上下文，避免占满浏览器的上下文名额。
  Plat.webgl2 = function () {
    if (typeof document === 'undefined') return true;
    var c = document.createElement('canvas'), gl = null;
    try { gl = c.getContext('webgl2'); } catch (e) { gl = null; }
    if (!gl) return false;
    try {
      var lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (e2) {}
    return true;
  };
  // 提示写在 DOM 上：游戏画布可能已经没有 3D。2D 还能用时给一个继续按钮；2D 也失败就只留说明。
  Plat.showWebgl2Notice = function (msg, stuck) {
    if (typeof document === 'undefined' || !document.body || document.getElementById('rw-webgl2')) return;
    var box = document.createElement('div');
    box.id = 'rw-webgl2';
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(4,6,13,0.92);color:#f4efe6;font:16px/1.45 system-ui,sans-serif;padding:24px;text-align:center';
    var inner = document.createElement('div');
    inner.style.cssText = 'max-width:520px';
    var p = document.createElement('p');
    p.style.margin = '0';
    p.textContent = stuck ? (msg + ' The 2D view could not start either. Try another browser.') : msg;
    inner.appendChild(p);
    if (!stuck) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Continue in 2D';
      b.style.cssText = 'margin-top:16px;padding:10px 18px;font:15px system-ui,sans-serif;background:#c4552a;color:#fff;border:0;border-radius:6px;cursor:pointer';
      b.onclick = function () { if (box.parentNode) box.parentNode.removeChild(box); };
      inner.appendChild(b);
    }
    box.appendChild(inner);
    document.body.appendChild(box);
  };

  // 网页包读安全区；桌面与微信是 0。读不到 env() 就当没有。
  Plat.safeInsets = function () {
    if (!Plat.web || typeof document === 'undefined' || !document.body) return { t: 0, r: 0, b: 0, l: 0 };
    try {
      var el = document.createElement('div');
      el.style.cssText = 'position:absolute;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
      document.body.appendChild(el);
      var cs = getComputedStyle(el);
      var o = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
      document.body.removeChild(el);
      return o;
    } catch (e) { return { t: 0, r: 0, b: 0, l: 0 }; }
  };
  Plat.computeView = function () {
    var v = Plat.view;
    v.s = Math.min(v.cssW / T.W, v.cssH / T.H);
    v.ox = (v.cssW - T.W * v.s) / 2;
    v.oy = (v.cssH - T.H * v.s) / 2;
  };
  Plat.toLogical = function (cx, cy) {
    var v = Plat.view;
    return { x: (cx - v.ox) / v.s, y: (cy - v.oy) / v.s };
  };
  Plat.createOffscreen = function (w, h) {
    var c = isWx ? wx.createCanvas() : document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  };
  Plat.raf = function (fn) {
    if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
    return setTimeout(function () { fn(Plat.now()); }, 16);
  };
  Plat.now = function () {
    if (typeof performance !== 'undefined' && performance.now) return performance.now();
    return Date.now();
  };

  // ---------- 输入：统一成 down / move / up（逻辑坐标） ----------
  Plat.onPointer = function (handler) {
    if (isWx) {
      var pass = function (type) {
        return function (e) {
          var list = e.changedTouches || [];
          for (var i = 0; i < list.length; i++) {
            var t = list[i], p = Plat.toLogical(t.clientX, t.clientY);
            handler(type, t.identifier, p.x, p.y);
          }
        };
      };
      wx.onTouchStart(pass('down'));
      wx.onTouchMove(pass('move'));
      wx.onTouchEnd(pass('up'));
      wx.onTouchCancel(pass('up'));
    } else {
      var c = Plat.canvas;
      var fire = function (type) {
        return function (e) {
          e.preventDefault();
          var r = c.getBoundingClientRect(), p = Plat.toLogical(e.clientX - r.left, e.clientY - r.top);
          if (type === 'down' && c.setPointerCapture) { try { c.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ } }
          handler(type, e.pointerId, p.x, p.y);
        };
      };
      c.addEventListener('pointerdown', fire('down'));
      c.addEventListener('pointermove', fire('move'));
      c.addEventListener('pointerup', fire('up'));
      c.addEventListener('pointercancel', fire('up'));
      c.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      window.addEventListener('keydown', function (e) {
        Plat.keys[e.code] = true;
        if (Plat.onKey) Plat.onKey(e.code);
        if (/^Arrow|Space/.test(e.code)) e.preventDefault();
      });
      window.addEventListener('keyup', function (e) { Plat.keys[e.code] = false; });
      window.addEventListener('blur', function () { Plat.keys = {}; });
    }
  };

  Plat.onHide = function (fn) {
    if (isWx) { if (wx.onHide) wx.onHide(fn); }
    else document.addEventListener('visibilitychange', function () { if (document.hidden) fn(); });
  };

  // ---------- 手柄（Gamepad API，标准布局：0 A 1 B 2 X 3 Y 4 LB 5 RB 6 LT 7 RT 8 视图 9 菜单 12–15 十字键）----------
  Plat.pad = function () {
    if (isWx || typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    var list = navigator.getGamepads() || [];
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].connected) return list[i];
    return null;
  };

  // ---------- 存档 ----------
  Plat.load = function (key, def) {
    try {
      // 桌面版：存档是用户目录下的 JSON 文件（方便 Steam 云存档同步）
      var dk = typeof window !== 'undefined' && window.desktop && window.desktop.load;
      var v = isWx ? wx.getStorageSync(key) : (dk ? window.desktop.load(key) : window.localStorage.getItem(key));
      if (v === '' || v === null || v === undefined) return def;
      return JSON.parse(v);
    } catch (e) { return def; }
  };
  Plat.save = function (key, val) {
    try {
      var s = JSON.stringify(val);
      if (isWx) wx.setStorageSync(key, s);
      else if (window.desktop && window.desktop.save) window.desktop.save(key, s);
      else window.localStorage.setItem(key, s);
    } catch (e) { /* 存不了就算了，不影响游戏 */ }
  };

  // ---------- 音频上下文 ----------
  Plat.createAudioContext = function () {
    try {
      if (isWx) return wx.createWebAudioContext ? wx.createWebAudioContext() : null;
      var AC = window.AudioContext || window.webkitAudioContext;
      return AC ? new AC() : null;
    } catch (e) { return null; }
  };

  // ---------- 激励视频 ----------
  // off：桌面版，不播广告，复活直接可用。
  // none：网页 Basic Launch，激励按钮藏起，调用也不发奖。
  // wechat：js/ads.js，isEnded === true 才发。
  // crazygames：js/ads-crazygames.js，只在网页包打开 --ads=crazygames 时加载。
  var webBoot = (!isWx && typeof window !== 'undefined' && window.RW_WEB) ? window.RW_WEB : null;
  Plat.web = !!(webBoot && webBoot.web);
  if (webBoot && (webBoot.ads === 'none' || webBoot.ads === 'crazygames')) Plat.adProvider = webBoot.ads;
  else Plat.adProvider = isWx ? 'wechat' : 'off';
  Plat.adUnit = function (kind) { return kind === 'revive' ? RW.AD.REWARD_REVIVE : RW.AD.REWARD_REROLL; };
  Plat.hasAds = Plat.adProvider === 'wechat' || Plat.adProvider === 'crazygames';
  Plat.adLabel = function (kind) { return Plat.adUnit(kind) || Plat.adProvider === 'crazygames' ? '看广告' : '预览发放'; };
  Plat.showReward = function (kind, onGrant, onFail) {
    if (Plat.adProvider === 'off') { if (onGrant) onGrant({ free: true }); return; }
    if (Plat.adProvider === 'none') { if (onFail) onFail('当前环境无法播放广告'); return; }
    if (Plat.adProvider === 'crazygames') {
      if (RW.AdsCrazy && RW.AdsCrazy.show) RW.AdsCrazy.show(kind, onGrant, onFail);
      else if (onFail) onFail('当前环境无法播放广告');
      return;
    }
    var unit = Plat.adUnit(kind);
    if (!unit) { if (onGrant) onGrant({ preview: true }); return; }
    if (!RW.Ads || !RW.Ads.show) { if (onFail) onFail('当前环境无法播放广告'); return; }
    RW.Ads.show(kind, unit, onGrant, onFail);
  };

  RW.Plat = Plat;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
