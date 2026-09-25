// 环带值守 · 渲染：镜头、甲板、实体、光效、小地图、战斗 HUD。全部 Canvas 运行时绘制。
(function (root) {
  var RW = root.RW;
  var T = RW.TUNE, A = T.ARENA, WD = T.WORLD, V = T.VIEW, W = T.W, H = T.H, TAU = Math.PI * 2;
  var F = T.FONT;

  var C = {
    bg: '#06070c', panel: 'rgba(14,12,18,0.9)', line: '#4a3a24', grid: 'rgba(94,242,255,0.09)',
    text: '#f3ead8', dim: '#9a8f7c', faint: '#5a5040', cyan: '#ffc861', shard: '#ffd76a',
    gold: '#ffd166', red: '#ff3b5c', good: '#7dff9b', bad: '#ff6b81', violet: '#b58cff', orb: '#7dff9b'
  };

  var D = { C: C, ctx: null, bgSpace: null, bgScale: 0, t: 0, cam: { x: 0, y: 0 }, camSnap: true };

  // ---------- 基础工具 ----------
  D.font = function (size, bold) { return (bold ? 'bold ' : '') + size + 'px ' + F; };
  D.text = function (s, x, y, size, color, align, bold, stroke) {
    var c = D.ctx;
    c.font = D.font(size, bold);
    c.textAlign = align || 'left';
    c.textBaseline = 'middle';
    if (stroke) { c.lineWidth = stroke; c.strokeStyle = 'rgba(2,4,10,0.9)'; c.lineJoin = 'round'; c.strokeText(s, x, y); }
    c.fillStyle = color || C.text;
    c.fillText(s, x, y);
  };
  D.glowText = function (s, x, y, size, color, align, blur) {
    var c = D.ctx;
    c.shadowColor = color; c.shadowBlur = blur || 14;
    D.text(s, x, y, size, color, align, true);
    c.shadowBlur = 0;
  };
  D.rr = function (x, y, w, h, r) {
    var c = D.ctx;
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r);
    c.closePath();
  };
  D.wrap = function (s, maxW, size) {
    var c = D.ctx; c.font = D.font(size);
    var lines = [], cur = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (c.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; }
      else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  };
  D.shardIcon = function (x, y, s, color) {
    var c = D.ctx;
    if (!color || color === C.shard) {
      c.fillStyle = '#b07a1e'; c.beginPath(); c.arc(x, y, s * 0.85, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffd76a'; c.beginPath(); c.arc(x, y, s * 0.68, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#b07a1e'; c.fillRect(x - s * 0.12, y - s * 0.4, s * 0.24, s * 0.8);
      return;
    }
    c.fillStyle = color || C.shard;
    c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.7, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.7, y); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.65)';
    c.beginPath(); c.moveTo(x, y - s); c.lineTo(x + s * 0.25, y - s * 0.1); c.lineTo(x, y); c.closePath(); c.fill();
  };
  D.circle = function (x, y, r) { var c = D.ctx; c.beginPath(); c.arc(x, y, r, 0, TAU); };
  D.add = function () { D.ctx.globalCompositeOperation = 'lighter'; };
  D.norm = function () { D.ctx.globalCompositeOperation = 'source-over'; D.ctx.globalAlpha = 1; };

  // ---------- 背景：屏幕空间的深空 + 环带（预渲染，只有一张屏幕大小） ----------
  D.buildBg = function (scale) {
    var P = RW.Plat, cw = Math.ceil(W * scale), ch = Math.ceil(H * scale);
    var cv = P.createOffscreen(cw, ch), c = cv.getContext('2d');
    c.setTransform(scale, 0, 0, scale, 0, 0);
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#060b18'); g.addColorStop(0.55, '#04070f'); g.addColorStop(1, '#070512');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 160; i++) {
      c.fillStyle = 'rgba(200,230,255,' + (0.15 + rnd() * 0.5).toFixed(2) + ')';
      var sr = rnd() < 0.9 ? 0.6 : 1.2;
      c.fillRect(rnd() * W, rnd() * H, sr, sr);
    }
    c.save();
    c.translate(W * 0.5, H * 0.46); c.rotate(-0.32);
    for (var k = 0; k < 5; k++) {
      c.strokeStyle = 'rgba(120,170,255,' + (0.035 + k * 0.012).toFixed(3) + ')';
      c.lineWidth = 10 - k * 1.6;
      var ea = 250 + k * 22, eb = 70 + k * 7;
      c.save(); c.scale(1, eb / ea); c.beginPath(); c.arc(0, 0, ea, 0, TAU); c.restore(); c.stroke();
    }
    for (var d = 0; d < 90; d++) {
      var a = rnd() * TAU, rr = 250 + rnd() * 100;
      c.fillStyle = 'rgba(160,190,230,' + (0.08 + rnd() * 0.18).toFixed(2) + ')';
      c.fillRect(Math.cos(a) * rr, Math.sin(a) * rr * 0.28, 1.4, 1.4);
    }
    c.restore();
    D.bgSpace = cv; D.bgScale = scale;
    // 甲板上的固定装饰（起降圈、编号），只生成一次
    if (!D.deckDeco) {
      D.deckDeco = [];
      seed = 99;
      for (var q = 0; q < 14; q++) D.deckDeco.push({ x: 80 + rnd() * (WD.w - 160), y: 80 + rnd() * (WD.h - 160), r: 30 + rnd() * 40, n: (q + 1) * 7 % 97 });
    }
  };

  D.begin = function () {
    var P = RW.Plat, v = P.view, c = P.ctx;
    D.ctx = c;
    D.gl = !!P.gl3d;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    if (D.gl) c.clearRect(0, 0, P.hud.width, P.hud.height);
    else { c.fillStyle = C.bg; c.fillRect(0, 0, P.canvas.width, P.canvas.height); }
    var sc = v.s * v.dpr;
    if (!D.bgSpace || Math.abs(D.bgScale - sc) > 0.01) D.buildBg(sc);
    D.base = [sc, 0, 0, sc, v.ox * v.dpr, v.oy * v.dpr];
    c.setTransform(sc, 0, 0, sc, v.ox * v.dpr, v.oy * v.dpr);
  };
  D.setBase = function (dx, dy) {
    var b = D.base;
    D.ctx.setTransform(b[0], 0, 0, b[3], b[4] + (dx || 0) * b[0], b[5] + (dy || 0) * b[3]);
  };
  D.drawBg = function () {
    if (!D.gl) { D.ctx.drawImage(D.bgSpace, 0, 0, W, H); return; }
    // 3D 模式：背景就是场景本身，只压一层上下渐暗让文字更清楚
    var c = D.ctx, gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(6,8,16,0.75)'); gr.addColorStop(0.3, 'rgba(6,8,16,0.15)'); gr.addColorStop(0.7, 'rgba(6,8,16,0.2)'); gr.addColorStop(1, 'rgba(6,8,16,0.8)');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
  };

  // ---------- 镜头 ----------
  D.updateCamera = function (g, dt) {
    var p = g.player, cam = D.cam, cf = T.camera;
    var tx = p.x + p.vx * cf.lead - V.w / 2, ty = p.y + p.vy * cf.lead - V.h / 2;
    tx = Math.max(0, Math.min(WD.w - V.w, tx)); ty = Math.max(0, Math.min(WD.h - V.h, ty));
    if (D.camSnap) { cam.x = tx; cam.y = ty; D.camSnap = false; return; }
    var k = 1 - Math.exp(-cf.follow * dt);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  };
  D.inView = function (x, y, m) {
    if (D.gl) return RW.W3.inView(x, y, m);
    var cam = D.cam;
    return x > cam.x - m && x < cam.x + V.w + m && y > cam.y - m && y < cam.y + V.h + m;
  };

  // ================= 世界 =================
  D.world = function (g) {
    var c = D.ctx;
    D.t = g.clock;
    D.drawBg();
    var sh = g.shake > 0.01 ? 11 * g.shake * Math.sqrt(g.shake) * RW.opt.shake : 0;   // 设置：屏幕震动
    var sx = sh ? (Math.random() * 2 - 1) * sh : 0, sy = sh ? (Math.random() * 2 - 1) * sh : 0;
    c.save();
    c.beginPath(); c.rect(V.x, V.y, V.w, V.h); c.clip();
    c.translate(V.x - D.cam.x + sx, V.y - D.cam.y + sy);
    D.deck(g);
    D.decals(g);
    D.orbs(g);
    D.towers(g);
    D.core(g);
    D.marks(g);
    D.mines(g);
    D.shards(g);
    D.enemyUnder(g);
    D.soldiers(g);
    D.mates(g);
    D.chests(g);
    D.enemies(g);
    D.player(g);
    D.bullets(g);
    D.fx(g);
    D.parts(g);
    D.nums(g);
    c.restore();
    D.norm();
    if (g.flash > 0 && RW.opt.flash > 0) { c.fillStyle = 'rgba(230,250,255,' + (g.flash * 0.35 * RW.opt.flash).toFixed(3) + ')'; c.fillRect(V.x, V.y, V.w, V.h); }
    if (g.streak >= 8) {
      var sk = Math.min(1, g.streakT / 1.3), big = g.streak >= 50 ? 22 : (g.streak >= 25 ? 19 : 16);
      var scol = g.streak >= 50 ? '#ff5cd6' : (g.streak >= 25 ? C.gold : C.cyan);
      c.globalAlpha = 0.4 + 0.6 * sk;
      D.text('连杀', W - 50, V.y + D.MINI.h + 26, 10, C.dim, 'center', true, 3);
      D.text('×' + g.streak, W - 50, V.y + D.MINI.h + 46, big, scol, 'center', true, 4);
      c.fillStyle = scol; c.fillRect(W - 80, V.y + D.MINI.h + 60, 60 * sk, 3);
      c.globalAlpha = 1;
    }
    D.edgeArrows(g);
    D.minimap(g);
    D.bossBar(g);
  };

  D.deck = function (g) {
    var c = D.ctx, cam = D.cam;
    var x0 = Math.max(0, cam.x - 40), x1 = Math.min(WD.w, cam.x + V.w + 40);
    var y0 = Math.max(0, cam.y - 40), y1 = Math.min(WD.h, cam.y + V.h + 40);
    c.fillStyle = 'rgba(9,17,31,0.82)';
    c.fillRect(x0, y0, x1 - x0, y1 - y0);
    // 细虚线网格
    c.strokeStyle = C.grid; c.lineWidth = 1;
    if (c.setLineDash) c.setLineDash([2, 6]);
    c.beginPath();
    var gx = Math.floor(x0 / 40) * 40, gy = Math.floor(y0 / 40) * 40;
    for (var x = gx; x <= x1; x += 40) { c.moveTo(x + 0.5, y0); c.lineTo(x + 0.5, y1); }
    for (var y = gy; y <= y1; y += 40) { c.moveTo(x0, y + 0.5); c.lineTo(x1, y + 0.5); }
    c.stroke();
    if (c.setLineDash) c.setLineDash([]);
    // 甲板拼缝（每 200）
    c.strokeStyle = 'rgba(94,242,255,0.14)'; c.lineWidth = 1.5;
    c.beginPath();
    for (x = Math.floor(x0 / 200) * 200; x <= x1; x += 200) { c.moveTo(x, y0); c.lineTo(x, y1); }
    for (y = Math.floor(y0 / 200) * 200; y <= y1; y += 200) { c.moveTo(x0, y); c.lineTo(x1, y); }
    c.stroke();
    // 起降圈装饰
    var deco = D.deckDeco;
    for (var i = 0; i < deco.length; i++) {
      var d = deco[i];
      if (!D.inView(d.x, d.y, d.r + 10)) continue;
      c.strokeStyle = 'rgba(94,242,255,0.07)'; c.lineWidth = 3;
      D.circle(d.x, d.y, d.r); c.stroke();
      c.lineWidth = 1; D.circle(d.x, d.y, d.r * 0.6); c.stroke();
      D.text(String(d.n < 10 ? '0' + d.n : d.n), d.x, d.y, 14, 'rgba(94,242,255,0.10)', 'center', true);
    }
    // 护栏：警示斜纹 + 发光边
    c.fillStyle = 'rgba(255,209,102,0.08)';
    var stripe = 24;
    for (var s = Math.floor(x0 / stripe) * stripe; s < x1; s += stripe) {
      if (y0 < A.y) { c.beginPath(); c.moveTo(s, 0); c.lineTo(s + 12, 0); c.lineTo(s + 12 + A.y, A.y); c.lineTo(s + A.y, A.y); c.fill(); }
      if (y1 > A.y + A.h) { c.beginPath(); c.moveTo(s, A.y + A.h); c.lineTo(s + 12, A.y + A.h); c.lineTo(s + 12 + A.y, WD.h); c.lineTo(s + A.y, WD.h); c.fill(); }
    }
    for (s = Math.floor(y0 / stripe) * stripe; s < y1; s += stripe) {
      if (x0 < A.x) { c.beginPath(); c.moveTo(0, s); c.lineTo(0, s + 12); c.lineTo(A.x, s + 12 + A.x); c.lineTo(A.x, s + A.x); c.fill(); }
      if (x1 > A.x + A.w) { c.beginPath(); c.moveTo(A.x + A.w, s); c.lineTo(A.x + A.w, s + 12); c.lineTo(WD.w, s + 12 + A.x); c.lineTo(WD.w, s + A.x); c.fill(); }
    }
    c.strokeStyle = 'rgba(94,242,255,0.55)'; c.lineWidth = 2;
    c.strokeRect(A.x, A.y, A.w, A.h);
  };

  D.decals = function (g) {
    var c = D.ctx;
    for (var i = 0; i < g.decals.length; i++) {
      var d = g.decals[i];
      if (!d.on || !D.inView(d.x, d.y, d.r)) continue;
      c.globalAlpha = Math.min(1, d.life / d.max * 1.5);
      c.fillStyle = d.color;
      D.circle(d.x, d.y, d.r); c.fill();
    }
    c.globalAlpha = 1;
  };

  D.orbs = function (g) {
    var c = D.ctx, t = D.t;
    D.add();
    for (var i = 0; i < g.orbs.length; i++) {
      var o = g.orbs[i];
      if (!o.on || o.dead > 0 || !D.inView(o.x, o.y, 12)) continue;
      var bob = Math.sin(t * 3 + o.bob) * 1.2;
      c.fillStyle = 'rgba(125,255,155,0.16)';
      D.circle(o.x, o.y + bob, o.r * 2.4); c.fill();
    }
    D.norm();
    for (i = 0; i < g.orbs.length; i++) {
      o = g.orbs[i];
      if (!o.on || o.dead > 0 || !D.inView(o.x, o.y, 12)) continue;
      bob = Math.sin(t * 3 + o.bob) * 1.2;
      c.fillStyle = C.orb; D.circle(o.x, o.y + bob, o.r); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.7)'; D.circle(o.x - o.r * 0.3, o.y + bob - o.r * 0.3, o.r * 0.35); c.fill();
    }
  };

  D.towers = function (g) {
    var c = D.ctx, i;
    for (i = 0; i < g.towers.length; i++) {
      var tw = g.towers[i];
      if (!tw.on || !D.inView(tw.x, tw.y, 200)) continue;
      var d = tw.d, ti = g.tech[tw.id] - 1;
      var range = (d.range || 0) * RW.TOWER_TIER.range[ti];
      if (d.kind === 'barracks') range = d.leash;
      if (range) {
        c.strokeStyle = d.color; c.globalAlpha = 0.14; c.lineWidth = 1;
        if (c.setLineDash) c.setLineDash([4, 6]);
        D.circle(tw.x, tw.y, range); c.stroke();
        if (c.setLineDash) c.setLineDash([]);
        c.globalAlpha = 1;
      }
      if (d.kind === 'pylon' && tw.pulse > 0) {
        D.add(); c.fillStyle = d.color; c.globalAlpha = tw.pulse * 0.3;
        D.circle(tw.x, tw.y, range); c.fill(); D.norm();
      }
      if (tw.build > 0) {
        var k = 1 - tw.build / T.build.time;
        c.strokeStyle = d.color; c.lineWidth = 3;
        c.beginPath(); c.arc(tw.x, tw.y, d.r + 4, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
        c.globalAlpha = 0.5;
      }
      c.fillStyle = '#0b1626';
      c.strokeStyle = tw.flash > 0 ? '#ffffff' : d.color; c.lineWidth = 2.5;
      if (d.kind === 'barracks') {
        c.beginPath();
        c.moveTo(tw.x - d.r, tw.y + d.r * 0.8); c.lineTo(tw.x - d.r, tw.y - d.r * 0.2); c.lineTo(tw.x, tw.y - d.r); c.lineTo(tw.x + d.r, tw.y - d.r * 0.2); c.lineTo(tw.x + d.r, tw.y + d.r * 0.8); c.closePath();
        c.fill(); c.stroke();
        c.fillStyle = d.color; c.fillRect(tw.x - 4, tw.y + 1, 8, 10);
        c.strokeStyle = d.color; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(tw.x, tw.y - d.r); c.lineTo(tw.x, tw.y - d.r - 12); c.stroke();
        c.fillStyle = d.color; c.beginPath(); c.moveTo(tw.x, tw.y - d.r - 12); c.lineTo(tw.x + 9 + Math.sin(D.t * 6) * 1.5, tw.y - d.r - 9); c.lineTo(tw.x, tw.y - d.r - 6); c.fill();
      } else {
        c.beginPath();
        for (var q = 0; q < 8; q++) { var a = q * TAU / 8 + Math.PI / 8; var rx = tw.x + Math.cos(a) * d.r, ry = tw.y + Math.sin(a) * d.r; if (q) c.lineTo(rx, ry); else c.moveTo(rx, ry); }
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = d.color;
        if (d.kind === 'sentry') {
          c.save(); c.translate(tw.x, tw.y); c.rotate(tw.ang);
          c.fillRect(0, -2.5, 15, 5); c.restore();
          D.circle(tw.x, tw.y, 4.5); c.fill();
        } else if (d.kind === 'pylon') {
          D.circle(tw.x, tw.y, 4 + Math.sin(D.t * 6) * 1.5); c.fill();
        } else D.shardIcon(tw.x, tw.y, 6, d.color);
      }
      c.globalAlpha = 1;
      for (var p = 0; p < g.tech[tw.id]; p++) { c.fillStyle = d.color; c.fillRect(tw.x - 7 + p * 6, tw.y + d.r + 3, 4, 3); }
      if (tw.hp < tw.maxHp) {
        var bw = 30;
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(tw.x - bw / 2, tw.y + d.r + 8, bw, 4);
        c.fillStyle = tw.hp / tw.maxHp < 0.35 ? C.red : d.color;
        c.fillRect(tw.x - bw / 2, tw.y + d.r + 8, bw * Math.max(0, tw.hp / tw.maxHp), 4);
      }
    }
  };

  // ---------- 核心舱 ----------
  D.core = function (g) {
    var c = D.ctx, co = g.core, t = D.t;
    if (!D.inView(co.x, co.y, 80)) return;
    var k = co.hp / co.maxHp, hurt = co.flash > 0;
    D.add();
    c.fillStyle = 'rgba(94,242,255,' + (0.06 + 0.03 * Math.sin(t * 2)).toFixed(3) + ')';
    D.circle(co.x, co.y, co.r + 18); c.fill();
    if (co.alert > 0) { c.fillStyle = 'rgba(255,50,80,' + (0.12 * (0.5 + 0.5 * Math.sin(t * 14))).toFixed(3) + ')'; D.circle(co.x, co.y, co.r + 26); c.fill(); }
    D.norm();
    c.strokeStyle = 'rgba(94,242,255,0.18)'; c.lineWidth = 1;
    if (c.setLineDash) c.setLineDash([3, 6]);
    D.circle(co.x, co.y, T.core.gunRange); c.stroke();
    if (c.setLineDash) c.setLineDash([]);
    c.fillStyle = '#0b1a2c'; c.strokeStyle = hurt ? '#ffffff' : '#9fe8ff'; c.lineWidth = 3;
    c.beginPath();
    for (var i = 0; i < 6; i++) { var a = i * TAU / 6; var x = co.x + Math.cos(a) * co.r, y = co.y + Math.sin(a) * co.r; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#5ef2ff'; c.lineWidth = 2;
    c.beginPath(); c.arc(co.x, co.y, co.r * 0.62, t * 1.5, t * 1.5 + 4.2); c.stroke();
    c.save(); c.translate(co.x, co.y); c.rotate(co.ang);
    c.fillStyle = '#9fe8ff'; c.fillRect(0, -3, co.r * 0.9, 6); c.restore();
    c.fillStyle = hurt ? '#ffffff' : '#dffaff'; D.circle(co.x, co.y, co.r * 0.28); c.fill();
    c.strokeStyle = k < 0.3 ? C.red : (k < 0.6 ? '#ff9f43' : '#3ee08f'); c.lineWidth = 4;
    c.beginPath(); c.arc(co.x, co.y, co.r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
    D.text('圣火', co.x, co.y + co.r + 20, 10, '#ffd27a', 'center', true, 3);
  };
  D.bossDraw = function (e, sc, col) {
    var c = D.ctx, r = e.r * sc, t = D.t, rage = e.enraged;
    var base = rage ? '#ff6a2e' : e.d.color;
    if (e.state === 4) {
      D.add();
      for (var k = 1; k <= 4; k++) { c.globalAlpha = 0.3 / k; c.fillStyle = base; D.circle(e.x - e.dx * k * 18, e.y - e.dy * k * 18, r); c.fill(); }
      D.norm();
    }
    c.shadowColor = base; c.shadowBlur = 20;
    c.fillStyle = '#1a0610'; c.strokeStyle = e.flash > 0 ? '#ffffff' : base; c.lineWidth = 4;
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = i * TAU / 10 + t * 0.4, rr = r * (i % 2 ? 0.82 : 1.05);
      var x = e.x + Math.cos(a) * rr, y = e.y + Math.sin(a) * rr;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath(); c.fill(); c.stroke();
    c.shadowBlur = 0;
    c.strokeStyle = base; c.lineWidth = 2.5;
    c.beginPath(); c.arc(e.x, e.y, r * 0.62, -t * 1.3, -t * 1.3 + 4.5); c.stroke();
    var glow = e.state === 1 || e.state === 3 ? 0.6 + 0.4 * Math.sin(t * 30) : (e.state === 2 ? 1 : 0.5);
    D.add(); c.fillStyle = 'rgba(255,90,130,' + (0.35 * glow).toFixed(2) + ')'; D.circle(e.x, e.y, r * 0.6); c.fill(); D.norm();
    c.fillStyle = '#ffe3ec'; D.circle(e.x, e.y, r * 0.22 * (0.8 + 0.4 * glow)); c.fill();
  };
  D.bossBar = function (g) {
    var b = g.boss, c = D.ctx;
    if (b && b.on) {
      var w = 420, x = W / 2 - w / 2, y = 92;
      c.fillStyle = 'rgba(4,8,16,0.8)'; c.fillRect(x - 4, y - 4, w + 8, 30);
      D.text('BOSS · ' + b.d.name + (b.enraged ? ' · 狂暴' : ''), x, y + 5, 11, b.enraged ? '#ff9a6a' : '#ff9ab0', 'left', true);
      c.fillStyle = '#2a0610'; c.fillRect(x, y + 14, w, 8);
      c.fillStyle = b.enraged ? '#ff6a2e' : '#ff2e63'; c.fillRect(x, y + 14, w * Math.max(0, b.hp / b.maxHp), 8);
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.fillRect(x + w * b.d.phase2, y + 13, 1.5, 10);
    }
    if (g.bossAlert > 0 && g.mode === 'battle') {
      var al = Math.min(1, g.bossAlert * 1.5);
      c.globalAlpha = al;
      c.fillStyle = 'rgba(40,0,10,0.75)'; c.fillRect(0, 186, W, 96);
      c.fillStyle = 'rgba(255,46,99,0.25)';
      for (var s = -2; s < W / 24 + 2; s++) { c.beginPath(); c.moveTo(s * 24 + (D.t * 60 % 24), 186); c.lineTo(s * 24 + 12 + (D.t * 60 % 24), 186); c.lineTo(s * 24 + (D.t * 60 % 24), 194); c.lineTo(s * 24 - 12 + (D.t * 60 % 24), 194); c.fill(); }
      D.glowText('BOSS 来袭 · ' + RW.ENEMIES.boss.name, W / 2, 226, 28, '#ff2e63', 'center', 18);
      D.text('红圈＝砸地，粗红线＝冲撞，半血后狂暴召唤', W / 2, 258, 12, '#ffd0dc', 'center', true, 3);
      c.globalAlpha = 1;
    }
  };

  D.chests = function (g) {
    var c = D.ctx;
    for (var i = 0; i < g.chests.length; i++) {
      var b = g.chests[i];
      if (!b.on || !D.inView(b.x, b.y, 20)) continue;
      c.fillStyle = '#c9893a'; c.strokeStyle = '#5a3a16'; c.lineWidth = 2;
      c.fillRect(b.x - 12, b.y - 10, 24, 18); c.strokeRect(b.x - 12, b.y - 10, 24, 18);
      c.fillStyle = '#ffe08a'; c.fillRect(b.x - 3, b.y - 10, 6, 18);
    }
  };
  D.mates = function (g) {
    var c = D.ctx;
    for (var i = 0; i < g.mates.length; i++) {
      var m = g.mates[i];
      if (!m.on || !D.inView(m.x, m.y, 24)) continue;
      c.fillStyle = m.flash > 0 ? '#ffffff' : m.d.color;
      c.strokeStyle = '#1a120c'; c.lineWidth = 1.5;
      D.circle(m.x, m.y, m.r); c.fill(); c.stroke();
      if (m.star === 2) { c.fillStyle = '#ffe08a'; D.circle(m.x, m.y - m.r - 3, 3); c.fill(); }
    }
  };
  D.soldiers = function (g) {
    var c = D.ctx;
    for (var i = 0; i < g.soldiers.length; i++) {
      var s = g.soldiers[i];
      if (!s.on || !D.inView(s.x, s.y, 20)) continue;
      c.fillStyle = s.flash > 0 ? '#ffffff' : '#ff9ecf';
      c.strokeStyle = '#3a0c22'; c.lineWidth = 1.5;
      D.circle(s.x, s.y, s.r); c.fill(); c.stroke();
      c.strokeStyle = '#ffe3f0'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(s.x + Math.cos(s.ang) * 3, s.y + Math.sin(s.ang) * 3); c.lineTo(s.x + Math.cos(s.ang) * 11, s.y + Math.sin(s.ang) * 11); c.stroke();
      if (s.hp < s.maxHp) { c.fillStyle = '#ff9ecf'; c.fillRect(s.x - 6, s.y - s.r - 5, 12 * s.hp / s.maxHp, 2); }
    }
  };

  D.marks = function (g) {
    var c = D.ctx;
    for (var i = 0; i < g.marks.length; i++) {
      var m = g.marks[i];
      if (!m.on || !D.inView(m.x, m.y, 40)) continue;
      var k = 1 - Math.max(0, m.t) / T.spawn.telegraph;
      var elite = RW.ENEMIES[m.type].elite;
      var r = (elite ? 28 : 12) * (1.6 - 0.6 * k);
      c.strokeStyle = elite ? C.red : 'rgba(255,90,110,0.9)';
      c.globalAlpha = 0.35 + 0.6 * k;
      c.lineWidth = elite ? 2.5 : 1.5;
      D.circle(m.x, m.y, r); c.stroke();
      c.beginPath();
      c.moveTo(m.x - r - 4, m.y); c.lineTo(m.x - r + 5, m.y); c.moveTo(m.x + r - 5, m.y); c.lineTo(m.x + r + 4, m.y);
      c.moveTo(m.x, m.y - r - 4); c.lineTo(m.x, m.y - r + 5); c.moveTo(m.x, m.y + r - 5); c.lineTo(m.x, m.y + r + 4);
      c.stroke();
      c.globalAlpha = 1;
    }
  };

  D.mines = function (g) {
    var c = D.ctx;
    for (var i = 0; i < g.mines.length; i++) {
      var m = g.mines[i];
      if (!m.on || !D.inView(m.x, m.y, 70)) continue;
      var armed = m.arm <= 0;
      var blink = armed ? (Math.sin(D.t * 10 + i) > 0 ? 1 : 0.45) : 0.35;
      if (armed) { c.strokeStyle = 'rgba(255,138,92,0.10)'; c.lineWidth = 1; D.circle(m.x, m.y, m.rad); c.stroke(); }
      c.fillStyle = '#2a1410'; c.strokeStyle = '#ff8a5c'; c.lineWidth = 2;
      D.circle(m.x, m.y, 6); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,200,150,' + blink + ')';
      D.circle(m.x, m.y, 2.4); c.fill();
    }
  };

  D.shards = function (g) {
    for (var i = 0; i < g.shards.length; i++) {
      var s = g.shards[i];
      if (!s.on || !D.inView(s.x, s.y, 10)) continue;
      if (!s.mag && !s.tower && s.life < T.shard.blink && Math.sin(D.t * 22) < 0) continue;
      var big = s.val > 1;
      D.shardIcon(s.x, s.y, big ? 5.5 : 3.8, big ? '#8affd8' : C.shard);
    }
  };

  // 画在敌人下面的预警：冲锋线、喷刺瞄准线、爆囊引信圈、护盾连线
  D.enemyUnder = function (g) {
    var c = D.ctx, i, e, d, k;
    for (i = 0; i < g.enemies.length; i++) {
      e = g.enemies[i];
      if (!e.on || !D.inView(e.x, e.y, 260)) continue;
      d = e.d;
      if (e.type === 'dasher' && e.state === 1) {
        var len = d.dashSpeed * d.dash + 10;
        k = 1 - e.st / d.aim;
        c.strokeStyle = 'rgba(255,79,216,' + (0.25 + 0.6 * k).toFixed(2) + ')';
        c.lineWidth = 2 + 12 * k; c.lineCap = 'round';
        c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + e.dx * len, e.y + e.dy * len); c.stroke();
        c.lineCap = 'butt';
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + e.dx * len, e.y + e.dy * len); c.stroke();
      } else if (e.type === 'spitter' && e.state === 1) {
        k = 1 - e.st / d.aim;
        c.strokeStyle = 'rgba(255,242,122,' + (0.2 + 0.7 * k).toFixed(2) + ')'; c.lineWidth = 1 + 2 * k;
        if (c.setLineDash) c.setLineDash([8, 6]);
        var ax = e.dx - e.x, ay = e.dy - e.y, al = Math.sqrt(ax * ax + ay * ay) || 1;
        c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + ax / al * 520, e.y + ay / al * 520); c.stroke();
        if (c.setLineDash) c.setLineDash([]);
      } else if (e.type === 'bomber' && e.state === 1) {
        k = 1 - e.st / d.fuse;
        c.fillStyle = 'rgba(255,60,20,' + (0.08 + 0.18 * k).toFixed(2) + ')';
        D.circle(e.x, e.y, d.blast); c.fill();
        c.strokeStyle = 'rgba(255,120,60,' + (0.5 + 0.5 * k).toFixed(2) + ')'; c.lineWidth = 2;
        if (c.setLineDash) c.setLineDash([6, 5]);
        D.circle(e.x, e.y, d.blast); c.stroke();
        if (c.setLineDash) c.setLineDash([]);
        c.strokeStyle = '#ffb08a'; c.lineWidth = 3;
        c.beginPath(); c.arc(e.x, e.y, d.blast, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
      } else if (e.type === 'boss' && e.state === 1) {
        k = 1 - e.st / d.slam.tele[e.enraged ? 1 : 0];
        c.fillStyle = 'rgba(255,40,80,' + (0.1 + 0.25 * k).toFixed(2) + ')';
        D.circle(e.ax, e.ay, d.slam.r); c.fill();
        c.strokeStyle = '#ff2e63'; c.lineWidth = 3; D.circle(e.ax, e.ay, d.slam.r); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 2; D.circle(e.ax, e.ay, Math.max(2, d.slam.r * (1 - k))); c.stroke();
      } else if (e.type === 'boss' && e.state === 3) {
        k = 1 - e.st / d.charge.aim;
        var L = d.charge.speed * d.charge.time;
        c.strokeStyle = 'rgba(255,46,99,' + (0.2 + 0.5 * k).toFixed(2) + ')'; c.lineWidth = e.r * 2 * (0.4 + 0.6 * k); c.lineCap = 'round';
        c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + e.dx * L, e.y + e.dy * L); c.stroke(); c.lineCap = 'butt';
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5;
        if (c.setLineDash) c.setLineDash([10, 8]);
        c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + e.dx * L, e.y + e.dy * L); c.stroke();
        if (c.setLineDash) c.setLineDash([]);
      } else if (e.type === 'shielder' && e.lkN > 0) {
        c.strokeStyle = 'rgba(110,168,255,0.55)'; c.lineWidth = 1.5;
        c.beginPath();
        for (var q = 0; q < e.lkN; q++) { var o = g.enemies[e.lk[q]]; if (!o.on) continue; c.moveTo(e.x, e.y); c.lineTo(o.x, o.y); }
        c.stroke();
      }
    }
  };

  D.enemies = function (g) {
    var c = D.ctx;
    for (var i = 0; i < g.enemies.length; i++) {
      var e = g.enemies[i];
      if (!e.on || !D.inView(e.x, e.y, 40)) continue;
      var sc = e.spawnT > 0 ? 1 - e.spawnT / 0.18 * 0.7 : 1;
      var col = e.flash > 0 ? '#ffffff' : e.d.color;
      switch (e.type) {
        case 'mite': D.mite(e, sc, col); break;
        case 'spore': D.spore(e, sc, col); break;
        case 'shell': D.shell(e, sc, col); break;
        case 'dasher': D.dasher(e, sc, col); break;
        case 'splitter': D.splitter(e, sc, col); break;
        case 'bomber': D.bomber(e, sc, col); break;
        case 'spitter': D.spitter(e, sc, col); break;
        case 'shielder': D.shielder(e, sc, col); break;
        case 'warden': D.warden(e, sc, col); break;
        case 'brood': D.brood(e, sc, col); break;
        case 'boss': D.bossDraw(e, sc, col); break;
      }
      if (e.shieldT > 0) {
        c.strokeStyle = 'rgba(110,168,255,0.8)'; c.lineWidth = 2;
        c.beginPath();
        for (var h = 0; h < 6; h++) { var a = h * TAU / 6 + D.t; var hx = e.x + Math.cos(a) * (e.r + 5), hy = e.y + Math.sin(a) * (e.r + 5); if (h) c.lineTo(hx, hy); else c.moveTo(hx, hy); }
        c.closePath(); c.stroke();
      }
      if (e.slowT > 0) { c.strokeStyle = 'rgba(102,217,255,0.7)'; c.lineWidth = 1; D.circle(e.x, e.y, e.r + 3); c.stroke(); }
      if (e.elite && !e.d.boss) D.eliteBar(e);
    }
  };
  D.eliteBar = function (e) {
    var c = D.ctx, bw = e.r * 2 + 6, hy = e.y - e.r - 16;
    c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(e.x - bw / 2 - 1, hy - 1, bw + 2, 6);
    c.fillStyle = e.d.color; c.fillRect(e.x - bw / 2, hy, bw * Math.max(0, e.hp / e.maxHp), 4);
    D.text('精英·' + e.d.name, e.x, hy - 9, 10, '#ffd0dc', 'center', true, 3);
  };
  D.mite = function (e, sc, col) {
    var c = D.ctx, a = Math.atan2(e.vy, e.vx), r = e.r * sc;
    c.save(); c.translate(e.x, e.y); c.rotate(a);
    c.fillStyle = col; c.strokeStyle = '#3a1a05'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(r * 1.25, 0); c.lineTo(-r * 0.85, r * 0.85); c.lineTo(-r * 0.45, 0); c.lineTo(-r * 0.85, -r * 0.85); c.closePath();
    c.fill(); c.stroke();
    c.restore();
  };
  D.spore = function (e, sc, col) {
    var c = D.ctx, r = e.r * sc, a = Math.atan2(e.vy, e.vx);
    c.strokeStyle = col; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x - Math.cos(a) * r * 2, e.y - Math.sin(a) * r * 2); c.stroke();
    c.fillStyle = col; c.strokeStyle = '#3a0a1f';
    D.circle(e.x, e.y, r); c.fill(); c.stroke();
  };
  D.shell = function (e, sc, col) {
    var c = D.ctx, r = e.r * sc, rot = D.t * 0.4 + e.seq;
    c.fillStyle = '#2b2208'; c.strokeStyle = col; c.lineWidth = 3.5;
    c.beginPath();
    for (var k = 0; k < 6; k++) { var a = rot + k * TAU / 6; var x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r; if (k) c.lineTo(x, y); else c.moveTo(x, y); }
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col;
    c.beginPath();
    for (var j = 0; j < 6; j++) { var b = rot + j * TAU / 6; var x2 = e.x + Math.cos(b) * r * 0.42, y2 = e.y + Math.sin(b) * r * 0.42; if (j) c.lineTo(x2, y2); else c.moveTo(x2, y2); }
    c.closePath(); c.fill();
    if (e.armor > 0) { for (var p = 0; p < Math.min(4, e.armor); p++) c.fillRect(e.x - 7 + p * 4, e.y - r - 6, 3, 3); }
  };
  D.dasher = function (e, sc, col) {
    var c = D.ctx, r = e.r * sc, a;
    if (e.state === 1 || e.state === 2) a = Math.atan2(e.dy, e.dx); else a = Math.atan2(e.vy, e.vx);
    if (e.state === 1 && Math.sin(D.t * 40) > 0) col = '#ffffff';
    if (e.state === 2) {
      D.add();
      for (var k = 1; k <= 4; k++) { c.globalAlpha = 0.35 / k; D.diamond(e.x - e.dx * k * 11, e.y - e.dy * k * 11, a, r * (1 + k * 0.08), e.d.color); }
      D.norm();
    }
    D.diamond(e.x, e.y, a, r, col);
  };
  D.diamond = function (x, y, a, r, col) {
    var c = D.ctx;
    c.save(); c.translate(x, y); c.rotate(a);
    c.fillStyle = col; c.strokeStyle = '#3a0530'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(r * 1.5, 0); c.lineTo(0, r * 0.75); c.lineTo(-r * 0.9, 0); c.lineTo(0, -r * 0.75); c.closePath();
    c.fill(); c.stroke();
    c.restore();
  };
  D.splitter = function (e, sc, col) {
    var c = D.ctx, r = e.r * sc, t = D.t;
    c.fillStyle = 'rgba(224,112,255,0.25)'; c.strokeStyle = col; c.lineWidth = 2.5;
    c.beginPath();
    for (var k = 0; k <= 16; k++) {
      var a = k * TAU / 16, rr = r * (1 + 0.08 * Math.sin(a * 3 + t * 5 + e.wob));
      var x = e.x + Math.cos(a) * rr, y = e.y + Math.sin(a) * rr;
      if (k) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = col;
    for (var n = 0; n < 3; n++) { var b = n * TAU / 3 + t * 1.5; D.circle(e.x + Math.cos(b) * r * 0.42, e.y + Math.sin(b) * r * 0.42, r * 0.22); c.fill(); }
  };
  D.bomber = function (e, sc, col) {
    var c = D.ctx, r = e.r * sc, armed = e.state === 1;
    if (armed && Math.sin(D.t * (20 + (1 - e.st / e.d.fuse) * 40)) > 0) col = '#ffffff';
    c.fillStyle = '#3a0c02'; c.strokeStyle = col; c.lineWidth = 3;
    D.circle(e.x, e.y, r * (armed ? 1.15 : 1)); c.fill(); c.stroke();
    c.fillStyle = col; D.circle(e.x, e.y, r * 0.35); c.fill();
    c.strokeStyle = '#ffd1a8'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(e.x, e.y - r); c.quadraticCurveTo(e.x + 5, e.y - r - 5, e.x + 2, e.y - r - 9); c.stroke();
    D.add(); c.fillStyle = 'rgba(255,200,80,0.9)'; D.circle(e.x + 2, e.y - r - 9, 2 + Math.random() * 1.5); c.fill(); D.norm();
  };
  D.spitter = function (e, sc, col) {
    var c = D.ctx, r = e.r * sc, g = RW.game, p = g.player;
    var a = e.state === 1 ? Math.atan2(e.dy - e.y, e.dx - e.x) : Math.atan2(p.y - e.y, p.x - e.x);
    c.save(); c.translate(e.x, e.y); c.rotate(a);
    c.fillStyle = col; c.strokeStyle = '#3a3505'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(r * 1.9, 0); c.lineTo(-r * 0.4, r * 0.6); c.lineTo(-r * 1.1, 0); c.lineTo(-r * 0.4, -r * 0.6); c.closePath();
    c.fill(); c.stroke();
    c.fillStyle = '#3a3505'; D.circle(0, 0, r * 0.28); c.fill();
    c.restore();
  };
  D.shielder = function (e, sc, col) {
    var c = D.ctx, r = e.r * sc;
    c.fillStyle = '#0c1a3a'; c.strokeStyle = col; c.lineWidth = 2.5;
    c.fillRect(e.x - r * 0.8, e.y - r * 0.8, r * 1.6, r * 1.6); c.strokeRect(e.x - r * 0.8, e.y - r * 0.8, r * 1.6, r * 1.6);
    c.strokeStyle = 'rgba(110,168,255,' + (0.4 + 0.3 * Math.sin(D.t * 5)).toFixed(2) + ')'; c.lineWidth = 1.5;
    D.circle(e.x, e.y, r + 6); c.stroke();
    c.fillStyle = col; D.circle(e.x, e.y, r * 0.3); c.fill();
  };
  D.warden = function (e, sc, col) {
    var c = D.ctx, r = e.r * sc, rot = D.t * 1.2;
    var ch = e.charging ? 1 - Math.max(0, e.fireT) / e.d.charge : 0;
    c.shadowColor = C.red; c.shadowBlur = 12 + ch * 16;
    c.strokeStyle = col; c.lineWidth = 3;
    D.circle(e.x, e.y, r); c.stroke();
    c.shadowBlur = 0;
    c.lineWidth = 2; D.circle(e.x, e.y, r * 0.62); c.stroke();
    c.fillStyle = col;
    for (var k = 0; k < 8; k++) {
      var a = rot + k * TAU / 8;
      c.beginPath();
      c.moveTo(e.x + Math.cos(a) * (r + 7), e.y + Math.sin(a) * (r + 7));
      c.lineTo(e.x + Math.cos(a + 0.18) * r, e.y + Math.sin(a + 0.18) * r);
      c.lineTo(e.x + Math.cos(a - 0.18) * r, e.y + Math.sin(a - 0.18) * r);
      c.closePath(); c.fill();
    }
    c.fillStyle = ch > 0 ? 'rgba(255,220,230,' + (0.4 + ch * 0.6).toFixed(2) + ')' : '#5a0a1c';
    D.circle(e.x, e.y, r * (0.3 + ch * 0.25)); c.fill();
    if (ch > 0) { c.strokeStyle = 'rgba(255,120,150,' + (ch * 0.8).toFixed(2) + ')'; c.lineWidth = 1.5; D.circle(e.x, e.y, r + 18 - ch * 12); c.stroke(); }
  };
  D.brood = function (e, sc, col) {
    var c = D.ctx, r = e.r * sc * (e.charging ? 1.08 + 0.04 * Math.sin(D.t * 30) : 1 + 0.03 * Math.sin(D.t * 3));
    c.shadowColor = col; c.shadowBlur = 14;
    c.fillStyle = '#240a3a'; c.strokeStyle = col; c.lineWidth = 3;
    D.circle(e.x, e.y, r); c.fill(); c.stroke();
    c.shadowBlur = 0;
    c.fillStyle = col;
    for (var k = 0; k < 7; k++) {
      var a = k * TAU / 7 + D.t * 0.4;
      D.circle(e.x + Math.cos(a) * r * 0.62, e.y + Math.sin(a) * r * 0.62, r * 0.16); c.fill();
    }
    c.fillStyle = '#ff7ab6'; D.circle(e.x, e.y, r * 0.25); c.fill();
  };

  D.player = function (g) {
    var c = D.ctx, p = g.player, i;
    if (g.mode === 'down' || g.mode === 'revive' || g.mode === 'result') return;
    var evo = RW.EVO[p.stage], col = evo.color;
    // 冲刺残影
    if (p.trailT > 0 && p.trailN > 1) {
      D.add();
      c.strokeStyle = col; c.lineCap = 'round';
      for (i = 0; i < p.trailN - 1; i++) {
        var k = p.trailT / 0.3 * (1 - i / p.trailN);
        c.globalAlpha = k * 0.7; c.lineWidth = p.r * 2 * (1 - i / p.trailN);
        c.beginPath(); c.moveTo(p.trail[i * 2], p.trail[i * 2 + 1]); c.lineTo(p.trail[i * 2 + 2], p.trail[i * 2 + 3]); c.stroke();
      }
      c.lineCap = 'butt';
      D.norm();
    }
    // 环刃
    for (i = 0; i < g.weapons.length; i++) {
      var w = g.weapons[i];
      if (w.d.kind === 'blades' && w.bladeN) {
        D.add();
        for (var b = 0; b < w.bladeN; b++) {
          var a = w.phase + b * TAU / w.bladeN;
          c.strokeStyle = 'rgba(157,255,106,0.35)'; c.lineWidth = 6;
          c.beginPath(); c.arc(p.x, p.y, w.bladeR, a - 0.5, a); c.stroke();
        }
        D.norm();
        for (b = 0; b < w.bladeN; b++) {
          a = w.phase + b * TAU / w.bladeN;
          var bx = p.x + Math.cos(a) * w.bladeR, by = p.y + Math.sin(a) * w.bladeR;
          c.save(); c.translate(bx, by); c.rotate(a + Math.PI / 2);
          c.fillStyle = w.d.color;
          c.beginPath(); c.moveTo(12, 0); c.quadraticCurveTo(0, -10, -12, 0); c.quadraticCurveTo(0, -3, 12, 0); c.fill();
          c.restore();
        }
      }
      if (w.d.kind === 'lance' && w.charge > 0) {
        var k2 = 1 - w.charge / w.d.charge, len = w.d.range * g.st.range;
        c.strokeStyle = 'rgba(181,140,255,' + (0.2 + 0.6 * k2).toFixed(2) + ')'; c.lineWidth = 1 + 3 * k2;
        if (c.setLineDash) c.setLineDash([6, 5]);
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + Math.cos(w.ang) * len, p.y + Math.sin(w.ang) * len); c.stroke();
        if (c.setLineDash) c.setLineDash([]);
        D.add(); c.fillStyle = 'rgba(181,140,255,' + (0.3 * k2).toFixed(2) + ')'; D.circle(p.x, p.y, p.r + 10 * k2); c.fill(); D.norm();
      }
    }
    // 引力井 / 雷幕范围
    var sk = g.skill;
    if (sk && sk.wellT > 0) {
      var wk = sk.wellT / sk.d.pull;
      D.add();
      c.fillStyle = 'rgba(192,123,255,0.12)'; D.circle(sk.wx, sk.wy, sk.d.radius); c.fill();
      c.strokeStyle = 'rgba(192,123,255,0.8)'; c.lineWidth = 2;
      for (var s = 0; s < 3; s++) { c.beginPath(); c.arc(sk.wx, sk.wy, sk.d.radius * (0.3 + 0.23 * s) * (0.6 + 0.4 * wk), D.t * (3 + s) , D.t * (3 + s) + 4); c.stroke(); }
      D.norm();
      c.fillStyle = '#12021f'; D.circle(sk.wx, sk.wy, 10 + (1 - wk) * 8); c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; D.circle(sk.wx, sk.wy, 10 + (1 - wk) * 8); c.stroke();
    }
    if (sk && sk.veilT > 0) {
      c.strokeStyle = 'rgba(168,212,255,' + (0.25 + 0.15 * Math.sin(D.t * 20)).toFixed(2) + ')'; c.lineWidth = 2;
      if (c.setLineDash) c.setLineDash([3, 7]);
      D.circle(p.x, p.y, sk.d.radius); c.stroke();
      if (c.setLineDash) c.setLineDash([]);
    }
    var blink = p.inv > 0 && p.dashT <= 0 && g.mode === 'battle' && Math.sin(D.t * 45) > 0;
    // 武器挂点
    var n = g.weapons.length;
    for (i = 0; i < n; i++) {
      var wp = g.weapons[i];
      if (wp.d.kind === 'blades') continue;
      var ang = wp.d.kind === 'mines' ? D.t * 2 + i * TAU / n : wp.ang;
      var dist = p.r + 6 - wp.kick * 4;
      c.fillStyle = wp.d.color;
      D.circle(p.x + Math.cos(ang) * dist, p.y + Math.sin(ang) * dist, 2.6); c.fill();
    }
    c.globalAlpha = blink ? 0.35 : 1;
    // 形态外观：触须 / 甲壳 / 棘冠
    if (p.stage >= 1) {
      c.strokeStyle = col; c.lineWidth = 2;
      for (var t = 0; t < 5; t++) {
        var ta = t * TAU / 5 + D.t * 0.8, wig = Math.sin(D.t * 6 + t) * 0.35;
        c.beginPath();
        c.moveTo(p.x + Math.cos(ta) * p.r, p.y + Math.sin(ta) * p.r);
        c.quadraticCurveTo(p.x + Math.cos(ta + wig) * (p.r + 8), p.y + Math.sin(ta + wig) * (p.r + 8), p.x + Math.cos(ta + wig * 2) * (p.r + 12), p.y + Math.sin(ta + wig * 2) * (p.r + 12));
        c.stroke();
      }
    }
    c.shadowColor = col; c.shadowBlur = 14;
    c.strokeStyle = col; c.lineWidth = 2.5 + p.stage * 0.5;
    if (p.stage >= 2) {
      c.beginPath();
      for (var h = 0; h < 6; h++) { var ha = h * TAU / 6 + D.t * 0.3; var hx = p.x + Math.cos(ha) * p.r, hy = p.y + Math.sin(ha) * p.r; if (h) c.lineTo(hx, hy); else c.moveTo(hx, hy); }
      c.closePath(); c.stroke();
    } else { D.circle(p.x, p.y, p.r); c.stroke(); }
    c.shadowBlur = 0;
    if (p.stage >= 3) {
      c.fillStyle = col;
      for (var sp = 0; sp < 6; sp++) {
        var sa = sp * TAU / 6 + D.t * 0.3 + TAU / 12;
        c.beginPath();
        c.moveTo(p.x + Math.cos(sa) * (p.r + 7), p.y + Math.sin(sa) * (p.r + 7));
        c.lineTo(p.x + Math.cos(sa + 0.25) * p.r * 0.9, p.y + Math.sin(sa + 0.25) * p.r * 0.9);
        c.lineTo(p.x + Math.cos(sa - 0.25) * p.r * 0.9, p.y + Math.sin(sa - 0.25) * p.r * 0.9);
        c.closePath(); c.fill();
      }
    }
    c.fillStyle = '#eafdff';
    D.circle(p.x, p.y, p.r * 0.42); c.fill();
    c.fillStyle = col;
    var fa = p.face;
    c.beginPath();
    c.moveTo(p.x + Math.cos(fa) * (p.r + 6), p.y + Math.sin(fa) * (p.r + 6));
    c.lineTo(p.x + Math.cos(fa + 0.5) * (p.r + 1), p.y + Math.sin(fa + 0.5) * (p.r + 1));
    c.lineTo(p.x + Math.cos(fa - 0.5) * (p.r + 1), p.y + Math.sin(fa - 0.5) * (p.r + 1));
    c.closePath(); c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(79,240,184,0.08)'; c.lineWidth = 1;
    D.circle(p.x, p.y, T.player.pickup * g.st.pickup + p.r - T.player.radius); c.stroke();
  };

  D.bullets = function (g) {
    var c = D.ctx, i;
    D.add();
    c.lineCap = 'round';
    for (i = 0; i < g.bullets.length; i++) {
      var b = g.bullets[i];
      if (!b.on || !D.inView(b.x, b.y, 20)) continue;
      c.strokeStyle = b.color; c.globalAlpha = 0.35; c.lineWidth = b.r * 4;
      c.beginPath(); c.moveTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03); c.lineTo(b.x, b.y); c.stroke();
      c.globalAlpha = 1; c.lineWidth = b.r * 1.4;
      c.beginPath(); c.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02); c.lineTo(b.x, b.y); c.stroke();
    }
    for (i = 0; i < g.missiles.length; i++) {
      var m = g.missiles[i];
      if (!m.on || !D.inView(m.x, m.y, 20)) continue;
      c.strokeStyle = m.color; c.globalAlpha = 0.5; c.lineWidth = 5;
      c.beginPath(); c.moveTo(m.x - m.vx * 0.05, m.y - m.vy * 0.05); c.lineTo(m.x, m.y); c.stroke();
      c.globalAlpha = 1; c.fillStyle = '#ffffff'; D.circle(m.x, m.y, 2.5); c.fill();
    }
    c.lineCap = 'butt';
    D.norm();
    for (i = 0; i < g.bullets.length; i++) {
      b = g.bullets[i];
      if (!b.on || !D.inView(b.x, b.y, 20)) continue;
      c.fillStyle = '#ffffff'; D.circle(b.x, b.y, b.r * 0.6); c.fill();
    }
    for (i = 0; i < g.ebullets.length; i++) {
      var e = g.ebullets[i];
      if (!e.on || !D.inView(e.x, e.y, 20)) continue;
      if (e.kind === 'bolt') {
        var a = Math.atan2(e.vy, e.vx);
        c.save(); c.translate(e.x, e.y); c.rotate(a);
        c.fillStyle = '#1a1600'; c.fillRect(-10, -3.5, 16, 7);
        c.fillStyle = '#fff27a'; c.fillRect(-9, -2.2, 14, 4.4);
        c.fillStyle = '#ffffff'; c.fillRect(2, -1.4, 4, 2.8);
        c.restore();
      } else {
        c.fillStyle = '#1a0008'; D.circle(e.x, e.y, e.r + 2); c.fill();
        c.fillStyle = '#ff5c8a'; D.circle(e.x, e.y, e.r); c.fill();
        c.fillStyle = '#ffe3ec'; D.circle(e.x, e.y, e.r * 0.45); c.fill();
      }
    }
  };

  D.fx = function (g) {
    var c = D.ctx;
    D.add();
    for (var i = 0; i < g.fx.length; i++) {
      var f = g.fx[i];
      if (!f.on) continue;
      var k = 1 - f.life / f.max;
      switch (f.kind) {
        case 'ring':
          if (!D.inView(f.x, f.y, f.r2 + 10)) break;
          c.strokeStyle = f.color; c.globalAlpha = 1 - k; c.lineWidth = f.w * (1 - k * 0.6);
          D.circle(f.x, f.y, Math.max(0.5, f.r + (f.r2 - f.r) * (1 - (1 - k) * (1 - k)))); c.stroke();
          break;
        case 'flash':
          if (!D.inView(f.x, f.y, f.r)) break;
          c.fillStyle = f.color; c.globalAlpha = (1 - k) * 0.8;
          D.circle(f.x, f.y, f.r * (0.7 + 0.3 * k)); c.fill();
          break;
        case 'muzzle':
          c.save(); c.translate(f.x, f.y); c.rotate(f.r);
          c.globalAlpha = 1 - k; c.fillStyle = f.color;
          c.beginPath(); c.moveTo(0, -4 * f.r2); c.lineTo(18 * f.r2, 0); c.lineTo(0, 4 * f.r2); c.closePath(); c.fill();
          c.fillStyle = '#ffffff'; D.circle(0, 0, 3 * f.r2); c.fill();
          c.restore();
          break;
        case 'beam':
          c.globalAlpha = 1 - k; c.lineCap = 'round';
          c.strokeStyle = f.color; c.lineWidth = f.w * 4 * (1 - k * 0.5);
          c.globalAlpha = (1 - k) * 0.4;
          c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x2, f.y2); c.stroke();
          c.globalAlpha = 1 - k; c.lineWidth = f.w * 1.8 * (1 - k * 0.5);
          c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x2, f.y2); c.stroke();
          c.strokeStyle = '#ffffff'; c.lineWidth = f.w * 0.7 * (1 - k);
          c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x2, f.y2); c.stroke();
          c.lineCap = 'butt';
          break;
        case 'arc':
          D.jagged(f.pts, f.n, f.color, 1 - k, 3.5, 14);
          if (f.n > 4) D.jagged(f.pts, f.n, '#ffffff', (1 - k) * 0.8, 1.2, 10);
          break;
        case 'bolt':
          c.globalAlpha = 1 - k;
          var pts = f.pts; pts[0] = f.x2; pts[1] = f.y2; pts[2] = f.x; pts[3] = f.y;
          D.jagged(pts, 4, f.color, 1 - k, 5, 26, 7);
          D.jagged(pts, 4, '#ffffff', 1 - k, 2, 20, 7);
          break;
        case 'spokes':
          c.globalAlpha = 1 - k; c.strokeStyle = f.color; c.lineWidth = 2.5;
          c.beginPath();
          for (var s = 0; s < 16; s++) {
            var a = s * TAU / 16, r0 = f.r * (0.2 + 0.7 * k), r1 = f.r * (0.4 + 0.8 * k);
            c.moveTo(f.x + Math.cos(a) * r0, f.y + Math.sin(a) * r0); c.lineTo(f.x + Math.cos(a) * r1, f.y + Math.sin(a) * r1);
          }
          c.stroke();
          break;
        case 'gulp':
          c.globalAlpha = 1 - k; c.strokeStyle = f.color; c.lineWidth = 3;
          D.circle(f.x, f.y, f.r * (1.6 - 0.6 * k)); c.stroke();
          break;
        case 'slash':
          c.globalAlpha = 1 - k; c.strokeStyle = f.color; c.lineWidth = 2.5;
          c.beginPath(); c.arc(f.x, f.y, 8, f.r - 1, f.r + 1); c.stroke();
          break;
      }
    }
    D.norm();
  };
  // 锯齿闪电：pts 是折点，每段再细分并随机偏移
  D.jagged = function (pts, n, color, alpha, width, jitter, seg) {
    var c = D.ctx;
    seg = seg || 4;
    c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = width;
    c.beginPath();
    for (var j = 0; j + 3 < n; j += 2) {
      var x0 = pts[j], y0 = pts[j + 1], x1 = pts[j + 2], y1 = pts[j + 3];
      c.moveTo(x0, y0);
      for (var s = 1; s < seg; s++) {
        var q = s / seg;
        c.lineTo(x0 + (x1 - x0) * q + (Math.random() - 0.5) * jitter, y0 + (y1 - y0) * q + (Math.random() - 0.5) * jitter);
      }
      c.lineTo(x1, y1);
    }
    c.stroke();
  };

  D.parts = function (g) {
    var c = D.ctx, i, p, s;
    for (i = 0; i < g.parts.length; i++) {
      p = g.parts[i];
      if (!p.on || p.glow || !D.inView(p.x, p.y, 10)) continue;
      c.globalAlpha = Math.min(1, p.life / p.max * 1.6);
      c.fillStyle = p.color; s = p.size;
      c.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    D.add();
    for (i = 0; i < g.parts.length; i++) {
      p = g.parts[i];
      if (!p.on || !p.glow || !D.inView(p.x, p.y, 10)) continue;
      c.globalAlpha = Math.min(1, p.life / p.max * 1.6);
      c.fillStyle = p.color; s = p.size;
      c.fillRect(p.x - s, p.y - s, s * 2, s * 2);
    }
    D.norm();
  };

  // ================= 3D 模式的叠加层：飘字、血条、闪白、边缘箭头、小地图 =================
  D.overlay3D = function (g) {
    var c = D.ctx, W3 = RW.W3, i, sp;
    D.t = g.clock;
    // 让小地图、边缘箭头沿用 2D 的视野矩形
    var b = W3.bounds;
    D.cam.x = b.x0; D.cam.y = b.z0; D.viewW = b.x1 - b.x0; D.viewH = b.z1 - b.z0;
    // 建筑血条 / 士兵血条
    for (i = 0; i < g.towers.length; i++) {
      var tw = g.towers[i];
      if (!tw.on || tw.hp >= tw.maxHp) continue;
      sp = W3.toScreen(tw.x, 48, tw.y);
      if (!sp.ok) continue;
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(sp.x - 15, sp.y, 30, 4);
      c.fillStyle = tw.hp / tw.maxHp < 0.35 ? C.red : tw.d.color; c.fillRect(sp.x - 15, sp.y, 30 * Math.max(0, tw.hp / tw.maxHp), 4);
    }
    // 精英名字与血条
    for (i = 0; i < g.enemies.length; i++) {
      var e = g.enemies[i];
      if (!e.on || !e.elite || e.d.boss) continue;
      sp = W3.toScreen(e.x, e.r * 2.2 + 12, e.y);
      if (!sp.ok) continue;
      var bw = e.r * 1.6 + 10;
      c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(sp.x - bw / 2 - 1, sp.y - 1, bw + 2, 6);
      c.fillStyle = e.d.color; c.fillRect(sp.x - bw / 2, sp.y, bw * Math.max(0, e.hp / e.maxHp), 4);
      D.text('精英·' + e.d.name, sp.x, sp.y - 9, 10, '#ffd0dc', 'center', true, 3);
    }
    // 圣火血量（在屏幕内时画在它头顶）
    var co = g.core;
    sp = W3.toScreen(co.x, 86, co.y);
    if (sp.ok) {
      var ck = co.hp / co.maxHp;
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(sp.x - 30, sp.y, 60, 6);
      c.fillStyle = ck < 0.3 ? C.red : (ck < 0.6 ? '#ff9f43' : '#ffd27a'); c.fillRect(sp.x - 30, sp.y, 60 * ck, 6);
      D.text('圣火', sp.x, sp.y - 9, 10, '#ffe2a8', 'center', true, 3);
    }
    // 飘字
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (i = 0; i < g.nums.length; i++) {
      var n = g.nums[i];
      if (!n.on || !D.numShown(n)) continue;
      sp = W3.toScreen(n.x, 22, n.y);
      if (!sp.ok) continue;
      var k = 1 - n.life / n.max, pop = k < 0.12 ? 1.5 - k / 0.12 * 0.5 : 1, size, color;
      if (n.kind === 'crit') { size = 18; color = C.gold; }
      else if (n.kind === 'hurt') { size = 16; color = '#ff4d6d'; }
      else if (n.kind === 'heal') { size = 15; color = '#7dff9b'; }
      else if (n.kind === 'armor') { size = 11; color = '#93a7b8'; }
      else { size = 13; color = '#ffffff'; }
      c.globalAlpha = n.life < 0.2 ? n.life / 0.2 : 1;
      c.font = 'bold ' + Math.round(size * pop) + 'px ' + F;
      c.lineWidth = 3; c.strokeStyle = 'rgba(2,4,10,0.95)'; c.strokeText(n.text, sp.x, sp.y);
      c.fillStyle = color; c.fillText(n.text, sp.x, sp.y);
    }
    c.globalAlpha = 1;
    if (g.flash > 0 && RW.opt.flash > 0) { c.fillStyle = 'rgba(255,245,225,' + (g.flash * 0.3 * RW.opt.flash).toFixed(3) + ')'; c.fillRect(V.x, V.y, V.w, V.h); }
    D.streakUI(g);
    D.edgeArrows(g);
    D.minimap(g);
    D.bossBar(g);
    D.momentumBar(g);
  };
  D.momentumBar = function (g) {
    if (g.mode !== 'battle' && g.mode !== 'clear') return;
    var c = D.ctx, M = T.momentum, w = 220, x = W / 2 - w / 2, y = H - 26;
    var tier = g.momTier, k = g.mom / M.max;
    c.fillStyle = 'rgba(8,10,18,0.7)'; D.rr(x - 4, y - 14, w + 8, 26, 6); c.fill();
    var names = ['战意', '战意 · 振奋', '战意 · 激昂', '战意 · 狂热'];
    var col = tier >= 3 ? '#ff5a2e' : (tier >= 1 ? '#ffc861' : '#8a8fa0');
    D.text(names[tier], x, y - 5, 10, col, 'left', true);
    // 右侧：英雄特性指示（凝神层数 / 狂怒加成 / 特性名）
    if (g.cls && g.cls.focus) {
      var F = g.cls.focus;
      for (var f = 0; f < F.max; f++) { c.fillStyle = f < g.focus ? (g.focus >= F.max ? '#ffffff' : '#9dff7a') : 'rgba(255,255,255,0.15)'; c.fillRect(x + w - 50 + f * 10, y - 9, 7, 7); }
    } else if (g.cls) {
      var tagName = g.cls.passive.split('：')[0];
      if (g.st.rage > 0) { var pl = g.player; tagName += ' +' + Math.round(g.st.rage * Math.max(0, 1 - pl.hp / pl.maxHp) * 100) + '%'; }
      D.text(tagName, x + w, y - 5, 9, g.cls.color, 'right', true);
    }
    c.fillStyle = '#1a1420'; c.fillRect(x, y + 3, w, 5);
    c.fillStyle = col; c.fillRect(x, y + 3, w * k, 5);
    for (var q = 0; q < M.tiers.length; q++) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x + w * M.tiers[q] / M.max, y + 2, 1, 7); }
  };
  D.streakUI = function (g) {
    var c = D.ctx;
    if (g.streak < 8) return;
    var sk = Math.min(1, g.streakT / 1.3), big = g.streak >= 50 ? 22 : (g.streak >= 25 ? 19 : 16);
    var scol = g.streak >= 50 ? '#ff5cd6' : (g.streak >= 25 ? C.gold : '#ffe2a8');
    c.globalAlpha = 0.4 + 0.6 * sk;
    var sy = 70 + D.MINI.h;
    D.text('连杀', W - 12 - D.MINI.w / 2, sy + 20, 10, C.dim, 'center', true, 3);
    D.text('×' + g.streak, W - 12 - D.MINI.w / 2, sy + 40, big, scol, 'center', true, 4);
    c.fillStyle = scol; c.fillRect(W - 12 - D.MINI.w / 2 - 30, sy + 54, 60 * sk, 3);
    c.globalAlpha = 1;
  };

  // 设置：伤害数字 0 关 / 1 只看暴击、受伤、回血 / 2 全部
  D.numShown = function (n) { var m = RW.opt.nums; return m >= 2 || (m === 1 && (n.kind === 'crit' || n.kind === 'hurt' || n.kind === 'heal')); };
  D.nums = function (g) {
    var c = D.ctx;
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    for (var i = 0; i < g.nums.length; i++) {
      var n = g.nums[i];
      if (!n.on || !D.numShown(n) || !D.inView(n.x, n.y, 20)) continue;
      var k = 1 - n.life / n.max;
      var pop = k < 0.12 ? 1.5 - k / 0.12 * 0.5 : 1;
      var size, color;
      if (n.kind === 'crit') { size = 17; color = C.gold; }
      else if (n.kind === 'hurt') { size = 16; color = '#ff4d6d'; }
      else if (n.kind === 'armor') { size = 11; color = '#93a7b8'; }
      else { size = 13; color = '#ffffff'; }
      c.globalAlpha = n.life < 0.2 ? n.life / 0.2 : 1;
      c.font = 'bold ' + Math.round(size * pop) + 'px ' + F;
      c.lineWidth = 3; c.strokeStyle = 'rgba(2,4,10,0.95)';
      c.strokeText(n.text, n.x, n.y);
      c.fillStyle = color;
      c.fillText(n.text, n.x, n.y);
    }
    c.globalAlpha = 1;
  };

  // ---------- 屏幕外的精英：视口边缘箭头 ----------
  // 世界点在屏幕上的位置（3D 用投影，2D 用镜头平移）
  var SCR = { x: 0, y: 0, on: false };
  D.screenOf = function (x, y, lift) {
    if (D.gl) {
      var sp = RW.W3.toScreen(x, lift || 0, y);
      SCR.x = sp.x; SCR.y = sp.y;
      SCR.on = sp.ok && sp.x > V.x + 4 && sp.x < V.x + V.w - 4 && sp.y > V.y + 4 && sp.y < V.y + V.h - 4;
    } else {
      SCR.x = x - D.cam.x + V.x; SCR.y = y - D.cam.y + V.y;
      SCR.on = D.inView(x, y, 0);
    }
    return SCR;
  };
  function edgeArrow(c, sx, sy, color, label, labelColor, pulse) {
    var cx = V.x + V.w / 2, cy = V.y + V.h / 2, dx = sx - cx, dy = sy - cy;
    var k = Math.min((V.w / 2 - 24) / Math.abs(dx || 1e-3), (V.h / 2 - 24) / Math.abs(dy || 1e-3));
    var ax = Math.min(W - 140, Math.max(40, cx + dx * k)), ay = Math.min(H - 90, Math.max(100, cy + dy * k)), a = Math.atan2(dy, dx);
    c.save(); c.translate(ax, ay); c.rotate(a);
    c.fillStyle = color; c.globalAlpha = pulse;
    c.beginPath(); c.moveTo(13, 0); c.lineTo(-7, 9); c.lineTo(-7, -9); c.closePath(); c.fill();
    c.restore(); c.globalAlpha = 1;
    D.text(label, ax - Math.cos(a) * 22, ay - Math.sin(a) * 16, 10, labelColor, 'center', true, 3);
  }
  D.edgeArrows = function (g) {
    var c = D.ctx, co = g.core, sp = D.screenOf(co.x, co.y, 20);
    if (!sp.on) {
      var alert = co.alert > 0;
      edgeArrow(c, sp.x, sp.y, alert ? (Math.sin(D.t * 14) > 0 ? '#ff3b5c' : '#ffffff') : '#ffd27a', alert ? '圣火受攻击' : '圣火', alert ? '#ff9ab0' : '#ffe2a8', 0.85);
    }
    for (var i = 0; i < g.enemies.length; i++) {
      var e = g.enemies[i];
      if (!e.on || !e.elite) continue;
      sp = D.screenOf(e.x, e.y, 10);
      if (sp.on) continue;
      edgeArrow(c, sp.x, sp.y, e.d.color, e.d.name, '#ffd0dc', 0.6 + 0.4 * Math.sin(D.t * 8));
    }
  };

  // ---------- 小地图：整块甲板一览，白框是当前屏幕 ----------
  D.MINI = { w: 110, h: Math.round(110 * WD.h / WD.w) };
  D.buildMiniTerrain = function () {
    var Gd = RW.GRID, M = RW.MAP, cv = RW.Plat.createOffscreen(Gd.cols, Gd.rows), c = cv.getContext('2d');
    var cols = { '~': '#2f6fa0', 'w': '#2f6fa0', '=': '#8a5a34', '^': '#4a4e56', '#': '#5a5e66', 'T': '#2e5a2a', 'H': '#9a6a44', ',': '#8a7048', '_': '#8a8680', 'C': '#ffd27a', 'S': '#c04040', 'L': '#4a7a34', '.': '#3f6a2e' };
    for (var r = 0; r < Gd.rows; r++) for (var q = 0; q < Gd.cols; q++) { c.fillStyle = cols[M.rows[r][q]] || '#3f6a2e'; c.fillRect(q, r, 1, 1); }
    D.miniTerrain = cv;
  };
  D.minimap = function (g) {
    var c = D.ctx, M = D.MINI, x0 = W - M.w - 12, y0 = 70, s = M.w / WD.w, i;
    c.fillStyle = 'rgba(4,8,16,0.72)'; c.fillRect(x0, y0, M.w, M.h);
    if (RW.GRID) {
      if (!D.miniTerrain) D.buildMiniTerrain();
      c.globalAlpha = 0.75; c.drawImage(D.miniTerrain, x0, y0, M.w, M.h); c.globalAlpha = 1;
    }
    c.strokeStyle = 'rgba(255,210,122,0.6)'; c.lineWidth = 1; c.strokeRect(x0 + 0.5, y0 + 0.5, M.w - 1, M.h - 1);
    c.fillStyle = 'rgba(125,255,155,0.45)';
    for (i = 0; i < g.orbs.length; i++) { var o = g.orbs[i]; if (o.on && o.dead <= 0) c.fillRect(x0 + o.x * s - 0.5, y0 + o.y * s - 0.5, 1, 1); }
    for (i = 0; i < g.towers.length; i++) { var tw = g.towers[i]; if (tw.on) { c.fillStyle = tw.d.color; c.fillRect(x0 + tw.x * s - 2, y0 + tw.y * s - 2, 4, 4); } }
    var co = g.core;
    c.fillStyle = co.alert > 0 && Math.sin(D.t * 14) > 0 ? '#ff3b5c' : '#ffd27a';
    c.fillRect(x0 + co.x * s - 3.5, y0 + co.y * s - 3.5, 7, 7);
    c.fillStyle = '#ff6b81';
    for (i = 0; i < g.enemies.length; i++) { var e = g.enemies[i]; if (e.on && !e.elite) c.fillRect(x0 + e.x * s - 1, y0 + e.y * s - 1, 2, 2); }
    for (i = 0; i < g.enemies.length; i++) {
      e = g.enemies[i];
      if (!e.on || !e.elite) continue;
      c.fillStyle = e.d.color; c.fillRect(x0 + e.x * s - 2.5, y0 + e.y * s - 2.5, 5, 5);
    }
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.strokeRect(x0 + Math.max(0, D.cam.x) * s, y0 + Math.max(0, D.cam.y) * s, (D.gl ? D.viewW : V.w) * s, (D.gl ? D.viewH : V.h) * s);
    c.fillStyle = '#ffffff';
    D.circle(x0 + g.player.x * s, y0 + g.player.y * s, 2.2); c.fill();
  };

  // ================= 战斗 HUD =================
  // 悬浮面板底
  D.hudPanel = function (x, y, w, h) {
    var c = D.ctx;
    c.fillStyle = 'rgba(10,8,14,0.62)'; D.rr(x, y, w, h, 8); c.fill();
    c.strokeStyle = 'rgba(255,210,122,0.18)'; c.lineWidth = 1; D.rr(x + 0.5, y + 0.5, w - 1, h - 1, 8); c.stroke();
  };
  D.hud = function (g, ui, menu) {
    var c = D.ctx, p = g.player;
    // ---- 左上：生命 / 位阶 / 武器 ----
    D.hudPanel(10, 10, 250, 118);
    var hpk = Math.max(0, p.hp / p.maxHp), bx = 22, bw = 226, bh = 18, by = 28;
    D.text('生命', bx, 21, 10, C.dim, 'left');
    if (g.cls) D.text(g.cls.name, bx + bw, 21, 10, g.cls.color, 'right', true);
    D.vial(bx + 22, by + 16, 20, hpk, hpk < 0.3 ? '#e23b4a' : '#c42838', Math.ceil(p.hp));
    var mpk = Math.max(0, (p.mp || 0) / (p.maxMp || 1));
    D.vial(bx + 74, by + 16, 20, mpk, '#2f6dff', Math.ceil(p.mp || 0));
    D.text('红 ' + Math.ceil(p.hp) + '/' + Math.round(p.maxHp), bx + 104, by + 8, 11, '#ffb4be', 'left', true);
    D.text('蓝 ' + Math.ceil(p.mp || 0) + '/' + Math.round(p.maxMp || 0), bx + 104, by + 24, 11, '#b9d0ff', 'left', true);
    var evo = RW.EVO, st = p.stage, next = evo[st + 1];
    var ek = next ? (p.mass - evo[st].mass) / (next.mass - evo[st].mass) : 1;
    c.fillStyle = '#0c1a1a'; c.fillRect(bx, by + 46, bw, 5);
    c.fillStyle = evo[st].color; c.fillRect(bx, by + 46, bw * Math.min(1, ek), 5);
    D.text(evo[st].name + (next ? ' → ' + next.name + '  ' + Math.floor(p.mass) + '/' + next.mass : ' · 最终形态'), bx, by + 60, 10, evo[st].color, 'left', true);
    var x = bx, y = 132;
    for (var i = 0; i < g.weapons.length; i++) {
      var w = g.weapons[i];
      c.fillStyle = 'rgba(20,15,11,0.85)'; D.rr(x, y, 34, 28, 5); c.fill();
      c.strokeStyle = w.ev ? C.gold : w.d.color; c.lineWidth = w.ev ? 2 : 1.5; D.rr(x, y, 34, 28, 5); c.stroke();
      var cd = w.d.kind === 'blades' ? 0 : Math.max(0, Math.min(1, w.cd / (w.d.cd[w.tier - 1] / g.st.rate)));
      if (cd > 0) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(x + 1, y + 1 + 26 * (1 - cd), 32, 26 * cd); }
      D.text((w.name || w.d.name)[0], x + 13, y + 14, 13, w.ev ? C.gold : w.d.color, 'center', true);
      D.text(['I', 'II', 'III'][w.tier - 1], x + 27, y + 21, 8, C.text, 'center', true);
      x += 38;
    }
    // ---- 上方正中：波次 / 倒计时 / 圣火 ----
    var left = Math.max(0, Math.ceil(g.dur - g.wt)), cx = W / 2;
    D.hudPanel(cx - 90, 8, 180, 70);
    D.text(g.endless ? '无尽 · 第 ' + g.wave + ' 波' : '第 ' + g.wave + ' / ' + RW.RUN.waves + ' 波' + (g.danger ? ' · 危险 ' + g.danger : ''), cx, 22, 12, g.danger >= 4 ? '#ffb3c1' : C.dim, 'center', true);
    var urgent = g.mode === 'battle' && left <= 5;
    var duel = g.final && !g.won && left <= 0;   // 终局：倒计时走完后要打倒灭火者才算守住
    D.text(g.mode === 'clear' ? (g.won ? '守住了' : '清场') : (duel ? '决战' : String(left)), cx, 46, duel ? 22 : 28, duel ? C.red : (urgent ? C.gold : C.text), 'center', true);
    var co = g.core, ck = Math.max(0, co.hp / co.maxHp), cbx = cx - 62, cby = 64;
    D.text('火', cbx - 10, cby + 3, 10, co.alert > 0 && Math.sin(g.clock * 14) > 0 ? C.red : '#ffd27a', 'center', true);
    c.fillStyle = '#1e1712'; c.fillRect(cbx, cby, 132, 7);
    c.fillStyle = ck < 0.3 ? C.red : (ck < 0.6 ? '#ff9f43' : '#ffd27a'); c.fillRect(cbx, cby, 132 * ck, 7);
    if (co.flash > 0) { c.fillStyle = '#ffffff'; c.fillRect(cbx, cby, 132 * ck, 7); }
    // ---- 右上：金币 / 击杀 / 暂停 ----
    D.hudPanel(W - 222, 10, 168, 50);
    D.shardIcon(W - 204, 30, 9);
    D.text(String(g.shardCount), W - 190, 31, 22, C.shard, 'left', true);
    D.text('击杀 ' + g.kills + ' · 建筑 ' + g.towerCount() + '/' + T.build.max, W - 62, 50, 10, C.dim, 'right');
    ui.button('pause', W - 46, 10, 36, 36, '', { draw: function (bx2, by2, bw2, bh2) {
      c.fillStyle = 'rgba(20,15,11,0.85)'; D.rr(bx2, by2, bw2, bh2, 6); c.fill();
      c.strokeStyle = C.line; D.rr(bx2, by2, bw2, bh2, 6); c.stroke();
      c.fillStyle = C.text; c.fillRect(bx2 + 12, by2 + 10, 4, 14); c.fillRect(bx2 + 20, by2 + 10, 4, 14);
      D.text('Esc', bx2 + bw2 / 2, by2 + bh2 + 8, 8, C.faint, 'center');
    } });
    // 低血警示
    if (g.mode === 'battle' && hpk < 0.35) {
      var pulse = 0.35 + 0.25 * Math.sin(g.clock * 6);
      var gr = c.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.6);
      gr.addColorStop(0, 'rgba(255,30,60,0)'); gr.addColorStop(1, 'rgba(255,30,60,' + pulse.toFixed(2) + ')');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
    }
    D.battleButtons(g, ui, menu);
    // 横幅
    if (g.banner > 0 && (g.mode === 'battle' || (g.mode === 'clear' && g.won))) {
      var k = g.banner / 1.6, al = Math.min(1, k * 3);
      c.globalAlpha = al;
      c.fillStyle = 'rgba(4,8,16,0.7)'; c.fillRect(0, 196, W, 76);
      D.glowText(g.bannerText || ('第 ' + g.wave + ' 波'), W / 2, 226, g.bannerText ? 28 : 34, C.cyan, 'center', 16);
      var sub = g.won ? (RW.RUN.waves + ' 波全部守住') : (g.bannerText ? ('第 ' + g.wave + ' 波 · 坚守 ' + g.dur + ' 秒') : ('坚守 ' + g.dur + ' 秒'));
      if (!g.won && g.final && !g.bannerText) sub = '终局 · 坚守 ' + g.dur + ' 秒并击败灭火者';
      if (g.eliteQ.length) sub += ' · 精英 ×' + g.eliteQ.length;
      D.text(sub, W / 2, 256, 13, C.dim, 'center');
      c.globalAlpha = 1;
      if (g.wave === 1) {
        D.text('踩金色木箱召唤同伴，两个一样的会合成。Q / E / R 放技能', W / 2, 292, 13, C.text, 'center', false, 3);
        D.text('B 造塔（1–4 选种类），花金币建塔，守住中央的圣火', W / 2, 314, 13, C.shard, 'center', false, 3);
      }
    }
    if (g.evolveT > 0) {
      c.globalAlpha = Math.min(1, g.evolveT * 2);
      var ev = evo[p.stage];
      D.glowText('晋升 · ' + ev.name, W / 2, 150, 30, ev.color, 'center', 18);
      var bits = [];
      if (ev.armor) bits.push('护甲 ' + ev.armor);
      if (ev.hp) bits.push('生命 +' + ev.hp);
      if (ev.dmg) bits.push('伤害 +' + Math.round(ev.dmg * 100) + '%');
      bits.push('移速 ×' + ev.speed);
      D.text(bits.join(' · '), W / 2, 182, 12, C.text, 'center', true, 3);
      D.text(D.eatHint(p.stage), W / 2, 202, 11, ev.color, 'center', false, 3);
      c.globalAlpha = 1;
    }
    if (g.eliteAlert > 0 && g.mode === 'battle') {
      c.globalAlpha = Math.min(1, g.eliteAlert * 2);
      var ey = g.boss && g.boss.on ? 142 : 106;
      D.glowText('精英来袭 · ' + g.eliteAlertName, W / 2, ey, 18, C.red, 'center', 12);
      D.text(g.eliteAlertType === 'brood' ? '它会不停放出蝙蝠，先杀它' : '它会充能后放出一圈弹幕', W / 2, ey + 22, 11, '#ffb3c1', 'center', false, 3);
      c.globalAlpha = 1;
    }
    if (g.core.alert > 2.2 && g.mode === 'battle') D.text('圣火正在受到攻击！', W / 2, 92, 13, '#ff9ab0', 'center', true, 3);
    if (g.mode === 'clear') {
      D.glowText('本波完成', W / 2, 226, 32, C.gold, 'center', 16);
      D.text('收成 +' + (g.haul || 0) + '    地上的金币按 50% 回收', W / 2, 260, 13, C.shard, 'center', false, 3);
    }
  };
  D.eatHint = function (stage) {
    var r = RW.EVO[stage].eatR, names = [];
    for (var id in RW.ENEMIES) { var e = RW.ENEMIES[id]; if (!e.elite && e.r <= r) names.push(e.name); }
    return names.length ? '可以直接踩碎：' + names.join('、') : '';
  };

  // ---------- 右下：冲刺 + 技能；左下：造塔 ----------
  D.BTN = { dash: { x: W - 316, y: H - 48, r: 28 }, build: { x: 52, y: H - 52, r: 32 } };   // 冲刺放在三个技能键左边，别叠在 Q 上
  var KEYCAP = { dash: '空格', build: 'B', 'skill:0': 'Q', 'skill:1': 'E', 'skill:2': 'R' };
  D.battleButtons = function (g, ui, menu) {
    var c = D.ctx, B = D.BTN, p = g.player, sk = g.skill;
    function round(id, b, label, color, k, sub) {
      ui.button(id, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, '', { draw: function (x, y, w, h, pressed) {
        c.globalAlpha = 0.9;
        c.fillStyle = pressed ? 'rgba(80,60,30,0.9)' : 'rgba(24,18,12,0.78)';
        D.circle(b.x, b.y, b.r); c.fill();
        c.strokeStyle = k > 0 ? '#6a5234' : color; c.lineWidth = 2.5; D.circle(b.x, b.y, b.r); c.stroke();
        if (k > 0) {
          c.fillStyle = 'rgba(0,0,0,0.55)';
          c.beginPath(); c.moveTo(b.x, b.y); c.arc(b.x, b.y, b.r - 2, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.closePath(); c.fill();
        }
        c.globalAlpha = 1;
        D.text(label, b.x, b.y - (sub ? 5 : 0), b.r > 30 ? 14 : 12, k > 0 ? C.dim : color, 'center', true, 3);
        if (sub) D.text(sub, b.x, b.y + 11, 9, C.dim, 'center', false, 3);
        if (KEYCAP[id]) {   // 桌面：按键提示
          var kw = KEYCAP[id].length > 1 ? 30 : 18;
          c.fillStyle = 'rgba(10,8,14,0.85)'; D.rr(b.x - kw / 2, b.y - b.r - 10, kw, 15, 4); c.fill();
          c.strokeStyle = 'rgba(255,255,255,0.3)'; D.rr(b.x - kw / 2, b.y - b.r - 10, kw, 15, 4); c.stroke();
          D.text(KEYCAP[id], b.x, b.y - b.r - 2, 9, C.text, 'center', true);
        }
      } });
    }
    var dk = p.dashCd > 0 ? p.dashCd / (T.dash.cd * g.st.cdr) : 0;
    round('dash', B.dash, '冲刺', C.cyan, dk, dk > 0 ? p.dashCd.toFixed(1) : '');
    var slots = g.skills && g.skills.length ? g.skills : (sk ? [sk] : []);
    for (var si = 0; si < slots.length; si++) {
      (function (s, i) {
        var b = { x: W - 64 - (slots.length - 1 - i) * 78, y: H - 58, r: 30 };
        var k = s.cd > 0 ? s.cd / (s.d.cd * g.st.cdr * 0.72) : 0;
        round('skill:' + i, b, s.d.name, s.d.color, k, s.cd > 0 ? s.cd.toFixed(1) : (s.d.mp || 18) + '');
      })(slots[si], si);
    }
    round('build', B.build, menu ? '收起' : '造塔', C.gold, 0, menu ? '' : g.towerCount() + '/' + T.build.max);
    if (menu) {
      var ids = RW.TOWER_ORDER;
      for (var i = 0; i < ids.length; i++) {
        (function (id, i) {
          var d = RW.TOWERS[id], price = g.buildPrice(id), ok = g.shardCount >= price && g.towerCount() < T.build.max;
          var y = H - 70;
          ui.button('bt:' + id, 96 + i * 124, y, 118, 58, '', { disabled: !ok, why: g.towerCount() >= T.build.max ? '建筑已达上限' : '金币不足，需要 ' + price, draw: function (x, yy, w, h, pressed) {
            c.globalAlpha = ok ? 0.95 : 0.5;
            c.fillStyle = pressed ? '#3a2a18' : 'rgba(24,18,12,0.92)'; D.rr(x, yy, w, h, 8); c.fill();
            c.strokeStyle = d.color; c.lineWidth = 1.5; D.rr(x, yy, w, h, 8); c.stroke();
            D.text(d.name + ' ' + ['I', 'II', 'III'][g.tech[id] - 1], x + 8, yy + 14, 12, d.color, 'left', true);
            D.text(D.towerBlurb(id), x + 8, yy + 30, 9, C.dim, 'left');
            D.shardIcon(x + 14, yy + 44, 5);
            D.text(String(price), x + 23, yy + 45, 12, ok ? C.shard : C.bad, 'left', true);
            D.text(String(i + 1), x + w - 9, yy + 45, 9, C.faint, 'center');
            c.globalAlpha = 1;
          } });
        })(ids[i], i);
      }
    }
  };
  D.towerBlurb = function (id) {
    return { sentry: '自动射击', pylon: '范围减速', siphon: '自动收金币', barracks: '出兵拦截' }[id];
  };

  D.joystick = function (js) {
    if (!js.active) return;
    var c = D.ctx;
    c.strokeStyle = 'rgba(94,242,255,0.28)'; c.lineWidth = 2;
    D.circle(js.ox, js.oy, 44); c.stroke();
    c.fillStyle = 'rgba(94,242,255,0.05)'; D.circle(js.ox, js.oy, 44); c.fill();
    c.fillStyle = 'rgba(94,242,255,0.38)'; D.circle(js.ox + js.kx, js.oy + js.ky, 16); c.fill();
  };

  D.vial = function (x, y, r, k, fill, num) {
    var c = D.ctx;
    c.save();
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
    c.fillStyle = '#14080c'; c.fillRect(x - r, y - r, r * 2, r * 2);
    var h = r * 2 * Math.max(0, Math.min(1, k));
    c.fillStyle = fill; c.fillRect(x - r, y + r - h, r * 2, h);
    c.restore();
    c.strokeStyle = 'rgba(255,236,210,0.55)'; c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
    D.text(String(num), x, y + 4, 11, '#ffffff', 'center', true, 2);
  };

  RW.Draw = D;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
