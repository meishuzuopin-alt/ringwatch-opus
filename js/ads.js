// 圣火守护者 · 激励视频。只在微信入口加载；桌面版不打包这个文件。
// 奖励只在广告回调明确看完时发放。
(function (root) {
  var RW = root.RW;
  function wxApi() {
    if (root.wx && root.wx.createRewardedVideoAd) return root.wx;
    if (typeof wx !== 'undefined' && wx.createRewardedVideoAd) return wx;
    return null;
  }
  var cache = {};
  RW.Ads = {
    provider: 'wechat',
    // 未看完、回调是空、或没有 isEnded，都不算完成
    completed: function (res) { return !!(res && res.isEnded === true); },
    show: function (kind, unit, onGrant, onFail) {
      // 网页包可以把 provider 改成 none / crazygames。微信路径保持原样。
      if (RW.Ads.provider === 'none') { if (onFail) onFail('当前环境无法播放广告'); return; }
      if (RW.Ads.provider === 'crazygames') {
        if (RW.AdsCrazy && RW.AdsCrazy.show) return RW.AdsCrazy.show(kind, onGrant, onFail);
        if (onFail) onFail('当前环境无法播放广告');
        return;
      }
      if (!unit) { if (onGrant) onGrant({ preview: true }); return; }
      var api = wxApi();
      if (!api) { if (onFail) onFail('当前环境无法播放广告'); return; }
      var slot = cache[unit];
      if (!slot) {
        slot = cache[unit] = { ad: api.createRewardedVideoAd({ adUnitId: unit }), pending: null };
        slot.ad.onClose(function (res) {
          var cb = slot.pending; slot.pending = null;
          if (!cb) return;
          if (RW.Ads.completed(res)) cb.ok({ preview: false });
          else cb.fail('广告未看完，奖励未发放');
        });
        slot.ad.onError(function () {
          var cb = slot.pending; slot.pending = null;
          if (cb) cb.fail('广告暂时不可用');
        });
      }
      slot.pending = { ok: onGrant, fail: onFail };
      var shown = slot.ad.show();
      if (shown && shown.catch) shown.catch(function () {
        var again = slot.ad.load && slot.ad.load();
        if (again && again.then) again.then(function () { return slot.ad.show(); }).catch(function () {
          var cb = slot.pending; slot.pending = null;
          if (cb) cb.fail('广告暂时不可用');
        });
        else { var cb = slot.pending; slot.pending = null; if (cb) cb.fail('广告暂时不可用'); }
      });
    }
  };
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
