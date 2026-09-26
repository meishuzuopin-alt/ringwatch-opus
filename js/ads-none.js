// 网页 Basic Launch：不加载任何广告 SDK，激励请求不发奖。
// 不进 preview.html / game.js；只由 tools/build-web.js 在 --ads=none 时写进网页包。
(function (root) {
  var RW = root.RW || (root.RW = {});
  RW.Ads = {
    provider: 'none',
    completed: function (res) { return !!(res && res.isEnded === true); },
    show: function (kind, unit, onGrant, onFail) {
      if (onFail) onFail('当前环境无法播放广告');
    }
  };
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
