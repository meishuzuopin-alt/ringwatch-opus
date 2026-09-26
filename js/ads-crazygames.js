// CrazyGames HTML5 SDK v3 适配器。奖励只在 isEnded === true 时发放。
// 不进桌面版，也不进默认网页包。tools/build-web.js --ads=crazygames 才会把它写进 index.html。
// 不从 CDN 拉 SDK：门户若注入 window.CrazyGames.SDK 就用它；被拦截或没有 SDK 时游戏照常可玩。
(function (root) {
  var RW = root.RW || (root.RW = {});

  function completed(res) {
    if (RW.Ads && RW.Ads.completed) return RW.Ads.completed(res);
    return !!(res && res.isEnded === true);
  }
  function sdk() {
    try { return root.CrazyGames && root.CrazyGames.SDK; } catch (e) { return null; }
  }
  function gameCall(name) {
    try {
      var S = sdk(), g = S && S.game;
      if (g && typeof g[name] === 'function') g[name]();
    } catch (e) { /* SDK 被广告拦截时不要打断游戏 */ }
  }
  function release() {
    RW.AdsCrazy.holding = false;
    if (RW.Sfx && RW.AdsCrazy._muted) {
      try { RW.Sfx.setMuted(!!RW.AdsCrazy._prevMute); } catch (e) {}
      RW.AdsCrazy._muted = false;
    }
  }
  function hold() {
    RW.AdsCrazy.holding = true;
    if (RW.Sfx && RW.Sfx.setMuted && !RW.AdsCrazy._muted) {
      RW.AdsCrazy._prevMute = !!RW.Sfx.muted;
      RW.AdsCrazy._muted = true;
      try { RW.Sfx.setMuted(true); } catch (e) {}
    }
  }

  RW.AdsCrazy = {
    holding: false,
    loadingStart: function () { gameCall('loadingStart'); },
    loadingStop: function () { gameCall('loadingStop'); },
    gameplayStart: function () { gameCall('gameplayStart'); },
    gameplayStop: function () { gameCall('gameplayStop'); },
    // kind: 'rewarded' | 'midgame' | 游戏里的 revive / reroll（都走 rewarded）
    show: function (kind, onGrant, onFail) {
      var placement = kind === 'midgame' ? 'midgame' : 'rewarded';
      var S = sdk();
      if (!S || !S.ad || typeof S.ad.requestAd !== 'function') {
        release();
        if (onFail) onFail('当前环境无法播放广告');
        return;
      }
      var settled = false;
      var timer = setTimeout(function () { finish(false); }, 60000);
      // 无头探测里回调可能永远不来；unref 让 Node 不必空等 60 秒。浏览器没有这个方法。
      if (timer && typeof timer.unref === 'function') timer.unref();
      function finish(ended) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        release();
        var res = { isEnded: ended === true };
        if (placement !== 'rewarded') {
          if (completed(res)) { if (onGrant) onGrant({ midgame: true, preview: false }); }
          else if (onFail) onFail('广告暂时不可用');
          return;
        }
        if (completed(res)) { if (onGrant) onGrant({ preview: false }); }
        else if (onFail) onFail('广告未看完，奖励未发放');
      }
      function begin() {
        try {
          S.ad.requestAd(placement, {
            adStarted: function () { hold(); },
            adError: function () { finish(false); },
            adFinished: function (arg) {
              var ended = true;
              if (arg && typeof arg === 'object' && Object.prototype.hasOwnProperty.call(arg, 'isEnded')) ended = arg.isEnded === true;
              finish(ended);
            }
          });
        } catch (e) { finish(false); }
      }
      if (typeof S.init === 'function' && !RW.AdsCrazy._inited) {
        try {
          var p = S.init();
          var go = function () { RW.AdsCrazy._inited = true; begin(); };
          if (p && typeof p.then === 'function') p.then(go, function () { finish(false); });
          else go();
        } catch (e) { finish(false); }
      } else begin();
    }
  };
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
