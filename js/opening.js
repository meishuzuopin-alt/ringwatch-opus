// 圣火守护者 · 首次启动的可操作序章（纯逻辑，可在 Node 里自动游玩）
(function (root) {
  var RW = root.RW;
  var DT = RW.TUNE.DT;

  function Opening(g) {
    var co = g.core, p = g.player;
    this.g = g; this.phase = 'walk'; this.time = 0; this.near = 0;
    this.titleT = 0; this.ignited = false; this.done = false; this.speed = 34;
    this.target = { x: co.x, y: co.y + co.r + 34 };
    p.x = co.x; p.y = Math.min(RW.TUNE.WORLD.h - 70, co.y + 910);
    p.vx = p.vy = 0; p.face = -Math.PI / 2; p.moving = 0;
    g.mode = 'opening'; g.clsId = 'mage'; g.cls = RW.CLASSES.mage; g.opening = this;
  }

  Opening.prototype.update = function (inp) {
    if (this.done) return;
    var g = this.g, p = g.player, co = g.core;
    this.time += DT; g.clock += DT; inp = inp || { mx: 0, my: 0 };
    if (this.phase === 'walk') {
      var l = Math.sqrt(inp.mx * inp.mx + inp.my * inp.my);
      var mx = l > 1 ? inp.mx / l : inp.mx, my = l > 1 ? inp.my / l : inp.my;
      p.vx = mx * this.speed; p.vy = my * this.speed; p.x += p.vx * DT; p.y += p.vy * DT;
      p.x = Math.max(co.x - 150, Math.min(co.x + 150, p.x));
      p.y = Math.max(this.target.y, Math.min(RW.TUNE.WORLD.h - 70, p.y));
      p.moving = l > 0.08 ? 1 : 0; if (l > 0.08) p.face = Math.atan2(my, mx);
      var dx = p.x - this.target.x, dy = p.y - this.target.y;
      if (dx * dx + dy * dy < 42 * 42) this.near += DT; else this.near = 0;
      if (this.near >= 1.8) {
        this.phase = 'title'; this.ignited = true; this.titleT = 0;
        p.vx = p.vy = 0; p.moving = 0; g.events.push({ type: 'evolve' });
      }
    } else {
      this.titleT += DT;
      if (this.titleT >= 5.2) { this.done = true; this.phase = 'done'; }
    }
  };

  Opening.prototype.titleAlpha = function () {
    if (this.phase !== 'title') return 0;
    return Math.min(1, this.titleT / 1.4) * Math.min(1, (5.2 - this.titleT) / 1.2);
  };
  RW.Opening = Opening;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
