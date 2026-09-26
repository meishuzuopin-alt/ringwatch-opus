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
        var v = Plat.view;
        v.cssW = window.innerWidth; v.cssH = window.innerHeight;
        v.dpr = Math.min(2, window.devicePixelRatio || 1);
        Plat.canvas.style.width = v.cssW + 'px'; Plat.canvas.style.height = v.cssH + 'px';
        Plat.canvas.width = Math.round(v.cssW * v.dpr); Plat.canvas.height = Math.round(v.cssH * v.dpr);
        if (Plat.hud) {
          Plat.hud.width = Plat.canvas.width; Plat.hud.height = Plat.canvas.height;
          if (Plat.hud.style) { Plat.hud.style.width = v.cssW + 'px'; Plat.hud.style.height = v.cssH + 'px'; }
        }
        Plat.computeView();
        if (Plat.onResize) Plat.onResize();
      };
      window.addEventListener('resize', fit);
      fit();
    }
    // 优先用 WebGL 画 3D，2D 画面（HUD/菜单）画到离屏画布上再贴上去；不支持 WebGL 时退回纯 2D
    var force2d = !isWx && typeof location !== 'undefined' && /[?&]2d\b/.test(location.search);
    try { Plat.gl3d = !force2d && !!(RW.GL && RW.GL.init(Plat.canvas)); } catch (err) { console.error(err); Plat.gl3d = false; }
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
    Plat.computeView();
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
  // 广告位留空：不播放，直接预览发放。桌面版没有广告模块，复活直接可用。
  // 真正的播放和「看完才发」在 js/ads.js，微信入口才加载，桌面包不进去。
  Plat.adUnit = function (kind) { return kind === 'revive' ? RW.AD.REWARD_REVIVE : RW.AD.REWARD_REROLL; };
  Plat.hasAds = isWx;
  Plat.adLabel = function (kind) { return Plat.adUnit(kind) ? '看广告' : '预览发放'; };
  Plat.showReward = function (kind, onGrant, onFail) {
    if (!Plat.hasAds) { onGrant({ free: true }); return; }
    var unit = Plat.adUnit(kind);
    if (!unit) { onGrant({ preview: true }); return; }
    if (!RW.Ads || !RW.Ads.show) { onFail('当前环境无法播放广告'); return; }
    RW.Ads.show(kind, unit, onGrant, onFail);
  };

  RW.Plat = Plat;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
