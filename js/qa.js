// 圣火守护者 · M0 验收钩子。?perf 记帧时间，?fxbench / ?night 由 main 开夜战，?day 开同一座桥的白天，事件进 RW.QA.log。
(function (root) {
  var QA = {
    log: [],
    frames: [],
    perf: false,
    bench: false,
    wantNight: false,
    wantDay: false,
    seed: null,
    boot: function (search) {
      var q = {};
      String(search || '').replace(/[?&]([^=&]+)(?:=([^&]*))?/g, function (_, k, v) {
        q[decodeURIComponent(k)] = v == null ? '' : decodeURIComponent(v);
      });
      this.perf = Object.prototype.hasOwnProperty.call(q, 'perf');
      this.bench = Object.prototype.hasOwnProperty.call(q, 'fxbench');
      this.wantDay = Object.prototype.hasOwnProperty.call(q, 'day');
      this.wantNight = this.bench || Object.prototype.hasOwnProperty.call(q, 'night') || this.wantDay;
      if (Object.prototype.hasOwnProperty.call(q, 'seed') && q.seed !== '') this.seed = +q.seed;
      else this.seed = this.bench ? 1 : null;
      this.log = []; this.frames = [];
    },
    hit: function (g, type, extra) {
      var row = { type: type, t: g && g.playT ? Math.round(g.playT * 1000) / 1000 : 0 };
      if (extra) for (var k in extra) row[k] = extra[k];
      this.log.push(row);
      if (this.log.length > 5000) this.log.splice(0, this.log.length - 5000);
    },
    frame: function (dt, enemies) {
      if (!this.perf) return;
      this.frames.push(dt);
      this.lastEnemies = enemies || 0;
      if (this.frames.length > 20000) this.frames.splice(0, this.frames.length - 20000);
    },
    summary: function () {
      var f = this.frames.slice().sort(function (a, b) { return a - b; });
      function pct(p) {
        if (!f.length) return 0;
        var i = Math.min(f.length - 1, Math.max(0, Math.ceil(p * f.length) - 1));
        return Math.round(f[i] * 10000) / 10000;
      }
      return { n: f.length, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: f.length ? Math.round(f[f.length - 1] * 10000) / 10000 : 0, enemies: this.lastEnemies || 0 };
    },
    dump: function () {
      return JSON.stringify({ perf: this.summary(), events: this.log.length });
    }
  };
  root.RW.QA = QA;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
