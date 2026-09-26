// CrazyGames HTML5 SDK v3 适配器。奖励只在 isEnded === true 时发放。
// 不进桌面版，也不进默认网页包。tools/build-web.js --ads=crazygames 才会把它写进 index.html。
// 不从 CDN 拉 SDK：门户若注入 window.CrazyGames.SDK 就用它；被拦截或没有 SDK 时游戏照常可玩。
// 次数上限读 RW.AD。中插的会话 / 间隔闸门在 midgame()，不在 show()：探测可以直接 show('midgame')。
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
  function limits() {
    var AD = RW.AD || {};
    return {
      revive: AD.REVIVE_PER_SESSION != null ? AD.REVIVE_PER_SESSION : 1,
      reroll: AD.REROLL_PER_RUN != null ? AD.REROLL_PER_RUN : 1,
      double: AD.DOUBLE_PER_RUN != null ? AD.DOUBLE_PER_RUN : 1,
      skip: AD.MIDGAME_SKIP_RUNS != null ? AD.MIDGAME_SKIP_RUNS : 2,
      gap: AD.MIDGAME_GAP != null ? AD.MIDGAME_GAP : 180
    };
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
  function mark(kind) {
    var a = RW.AdsCrazy;
    if (kind === 'revive') a.sessionRevives++;
    else if (kind === 'reroll') a.runRerolls++;
    else if (kind === 'double') a.runDoubles++;
    if (kind !== 'midgame') a.rewardedThisRun = true;
  }

  RW.AdsCrazy = {
    holding: false,
    sessionRevives: 0,
    runRerolls: 0,
    runDoubles: 0,
    sessionRuns: 0,
    rewardedThisRun: false,
    lastMid: 0,
    // 激励是否还能再给。金币购买不走这里。
    allow: function (kind) {
      var L = limits(), a = RW.AdsCrazy;
      if (kind === 'revive') return a.sessionRevives < L.revive;
      if (kind === 'reroll') return a.runRerolls < L.reroll;
      if (kind === 'double') return a.runDoubles < L.double;
      return true;
    },
    // 一局结算时记一次。前 MIDGAME_SKIP_RUNS 局结束时不请求中插。
    noteRun: function () { RW.AdsCrazy.sessionRuns++; },
    // 新的一局：刷新和翻倍重新计数。复活是按会话计的，不在这里清。
    beginRun: function () {
      RW.AdsCrazy.runRerolls = 0;
      RW.AdsCrazy.runDoubles = 0;
      RW.AdsCrazy.rewardedThisRun = false;
    },
    // 离开结算面前调用。前两局、刚看过激励、或距上次不足间隔，都不去请求。SDK 仍可能再拒。
    midgame: function (done) {
      var self = RW.AdsCrazy, L = limits();
      function skip() { if (done) done(false); }
      if (self._midPending) return;
      if (self.rewardedThisRun) return skip();
      if (self.sessionRuns <= L.skip) return skip();
      var now = (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
      if (self.lastMid && now - self.lastMid < L.gap * 1000) return skip();
      self._midPending = true;
      function finish(shown) {
        self._midPending = false;
        if (shown) self.lastMid = Date.now();
        if (done) done(!!shown);
      }
      self.show('midgame', function () { finish(true); }, function () { finish(false); });
    },
    loadingStart: function () { gameCall('loadingStart'); },
    loadingStop: function () { gameCall('loadingStop'); },
    gameplayStart: function () { gameCall('gameplayStart'); },
    gameplayStop: function () { gameCall('gameplayStop'); },
    // kind: 'rewarded' | 'midgame' | revive / reroll / double（都走 rewarded）
    show: function (kind, onGrant, onFail) {
      var placement = kind === 'midgame' ? 'midgame' : 'rewarded';
      if (placement === 'rewarded' && !RW.AdsCrazy.allow(kind)) {
        if (onFail) onFail('广告次数已用完');
        return;
      }
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
        if (completed(res)) { mark(kind); if (onGrant) onGrant({ preview: false }); }
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
