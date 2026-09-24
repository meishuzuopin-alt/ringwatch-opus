// 环带值守 · 3D 场景：地形与道具（读 js/map.js）、角色/怪物/建筑的低模、特效、镜头、昼夜。
// 世界坐标：x = 模拟 x，z = 模拟 y，y 朝上。所有模型在本地坐标里面朝 +X，脚底 y = 0。
(function (root) {
  var RW = root.RW;
  var GL = RW.GL, GB = GL.GB, hex = GL.hex, shade = GL.shade;
  var T = RW.TUNE, V = T.VIEW, TAU = Math.PI * 2;

  var W3 = { ready: false, t: 0, meshes: {}, lamps: [], env: null, envTarget: null, camT: { x: 0, z: 0 }, snap: true,
    bounds: { x0: 0, x1: 0, z0: 0, z1: 0 } };

  function rnd(seed) { var s = seed % 2147483647; if (s <= 0) s += 2147483646; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function h2(c, r) { var n = (c * 374761393 + r * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967295; }

  // ================= 调色 =================
  var PAL = {
    grass: hex('#6a9a3e'), grass2: hex('#6f9f41'), grassDark: hex('#65943b'),
    dirt: hex('#b08652'), dirt2: hex('#aa8250'), stone: hex('#aaa498'), stone2: hex('#b3ada1'),
    rock: hex('#7b7f86'), rock2: hex('#8d9098'), rockDark: hex('#5f636b'), moss: hex('#5f8f3a'),
    bed: hex('#3d5a6e'), water: hex('#2f8fd0'), plank: hex('#8a5a34'), plank2: hex('#9b6a3f'), wood: hex('#6b4428'),
    trunk: hex('#6b4a2e'), leaf: hex('#3f7f35'), leaf2: hex('#4d9440'), leaf3: hex('#356b2e'),
    wall: hex('#e8dcc4'), wallWood: hex('#8a6440'), roofBlue: hex('#3f5f9e'), roofRed: hex('#b5523a'),
    lamp: hex('#ffcf6b'), banner: hex('#2a2440'), gold: hex('#e0a83a'), flower: [hex('#ffffff'), hex('#ffd6f0'), hex('#fff1a8')]
  };

  // ================= 地形 =================
  function buildTerrain() {
    var G = RW.GRID, M = RW.MAP, C = G.cell, cols = G.cols, rows = G.rows;
    var gb = new GB(), water = new GB(), R = rnd(12345), lamps = [];
    function ch(c, r) { if (c < 0 || r < 0 || c >= cols || r >= rows) return '#'; return M.rows[r][c]; }
    function isWater(k) { return k === '~' || k === 'w' || k === '='; }
    var WY = -14, BED = -40;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      var k = ch(c, r), x0 = c * C, z0 = r * C, x1 = x0 + C, z1 = z0 + C, cx = x0 + C / 2, cz = z0 + C / 2, h = h2(c, r);
      if (isWater(k)) {
        // 河床 + 水面
        gb.quad([x0, BED, z1], [x1, BED, z1], [x1, BED, z0], [x0, BED, z0], shade(PAL.bed, 0.9 + h * 0.2));
        for (var sy = 0; sy < 2; sy++) for (var sx = 0; sx < 2; sx++) {
          var a0 = x0 + sx * C / 2, b0 = z0 + sy * C / 2, a1 = a0 + C / 2, b1 = b0 + C / 2;
          water.quad([a0, WY, b1], [a1, WY, b1], [a1, WY, b0], [a0, WY, b0], shade(PAL.water, 0.92 + h2(c * 2 + sx, r * 2 + sy) * 0.16), 0.35);
        }
        if (k === '=') buildBridgeCell(gb, c, r, ch, lamps);
        if (k === 'w') { // 瀑布下的白沫
          gb.box(cx + 10, WY - 2, cz, 10, 4, C, hex('#dff4ff'), 0.4);
        }
        continue;
      }
      // 地面格子
      var top;
      if (k === ',' || k === 'S') top = h < 0.5 ? PAL.dirt : PAL.dirt2;
      else if (k === '_' || k === 'C') top = h < 0.5 ? PAL.stone : PAL.stone2;
      else if (k === '#' || k === '^') top = PAL.moss;
      else top = h < 0.33 ? PAL.grass : (h < 0.66 ? PAL.grass2 : PAL.grassDark);
      var gy = 0;
      if (k === '#' || k === '^') {
        // 岩壁：一到两层石块，顶上长草
        var ht = k === '^' ? 70 + h * 50 : 34 + h * 22;
        gb.box(cx, 0, cz, C, ht, C, shade(PAL.rock, 0.9 + h * 0.2), 0, shade(PAL.moss, 0.9 + h * 0.2), true);
        if (h > 0.55) gb.box(cx + (h - 0.5) * 12, ht, cz - (h - 0.5) * 10, C * 0.55, 8 + h * 10, C * 0.5, PAL.rock2, 0, PAL.moss, true);
        if (h < 0.3 && k === '#') gb.blob(cx + 8, ht + 6, cz + 6, 10, 9, 10, PAL.leaf2, 0, c * 31 + r, 0.25);
        continue;
      }
      gb.quad([x0, gy, z1], [x1, gy, z1], [x1, gy, z0], [x0, gy, z0], top);
      if (k === '_' || k === 'C') {
        // 石板：内缩一圈的浅色板
        gb.quad([x0 + 3, 0.6, z1 - 3], [x1 - 3, 0.6, z1 - 3], [x1 - 3, 0.6, z0 + 3], [x0 + 3, 0.6, z0 + 3], shade(top, 1.06));
      }
      // 靠河的一侧：竖直岸壁 + 木栅栏
      var nb = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (var q = 0; q < 4; q++) {
        var nk = ch(c + nb[q][0], r + nb[q][1]);
        if (!isWater(nk)) continue;
        var bank = shade(PAL.rock, 0.85 + h * 0.2);
        if (nb[q][1] === 1) { gb.quad([x0, BED, z1], [x1, BED, z1], [x1, 0, z1], [x0, 0, z1], bank); if (nk !== '=') fence(gb, x0, z1 - 3, x1, z1 - 3); }
        if (nb[q][1] === -1) { gb.quad([x1, BED, z0], [x0, BED, z0], [x0, 0, z0], [x1, 0, z0], bank); if (nk !== '=') fence(gb, x0, z0 + 3, x1, z0 + 3); }
        if (nb[q][0] === 1) gb.quad([x1, BED, z1], [x1, BED, z0], [x1, 0, z0], [x1, 0, z1], bank);
        if (nb[q][0] === -1) gb.quad([x0, BED, z0], [x0, BED, z1], [x0, 0, z1], [x0, 0, z0], bank);
      }
      if (k === 'T') tree(gb, cx + (h - 0.5) * 12, cz + (h2(r, c) - 0.5) * 12, 1.25 + h * 0.5, c * 7 + r * 13);
      if (k === 'L') { lantern(gb, cx, cz, lamps); }
      if (k === 'S') gate(gb, cx, cz, c, r, cols, rows, lamps);
      if (k === '.' && h > 0.72) flowers(gb, cx, cz, c, r);
      if (k === '.' || k === 'L') tufts(gb, cx, cz, c, r);
      if (k === '.' && h < 0.12) gb.blob(cx + 6, 2, cz - 4, 6, 4, 5, PAL.rock2, 0, c * 17 + r, 0.3);
      if (k === '.' && h > 0.45 && h < 0.5) bush(gb, cx - 8, cz + 6, c * 3 + r);
    }
    // 房屋：找出 H 连通块
    var seen = {};
    for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
      if (ch(c, r) !== 'H' || seen[r * cols + c]) continue;
      var w = 0, hh = 0;
      while (ch(c + w, r) === 'H') w++;
      while (ch(c, r + hh) === 'H') hh++;
      for (var yy = 0; yy < hh; yy++) for (var xx = 0; xx < w; xx++) seen[(r + yy) * cols + c + xx] = 1;
      house(gb, c * C, r * C, w * C, hh * C, (c + r) % 2 === 0, lamps);
    }
    // 地图外的一圈暗色森林（远景）
    var W = cols * C, H = rows * C;
    var skirt = hex('#22402a');
    gb.quad([-900, -3, H + 900], [W + 900, -3, H + 900], [W + 900, -3, -900], [-900, -3, -900], skirt);
    var R2 = rnd(777);
    for (var i = 0; i < 160; i++) {
      var side = i % 4, tx, tz;
      if (side === 0) { tx = -40 - R2() * 260; tz = R2() * H; }
      else if (side === 1) { tx = W + 40 + R2() * 260; tz = R2() * H; }
      else if (side === 2) { tx = R2() * W; tz = -40 - R2() * 200; }
      else { tx = R2() * W; tz = H + 40 + R2() * 260; }
      tree(gb, tx, tz, 1.1 + R2() * 0.8, i * 11);
    }
    return { land: gb, water: water, lamps: lamps };
  }
  function fence(gb, x0, z0, x1, z1) {
    var n = 3;
    for (var i = 0; i <= n; i++) {
      var t = i / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
      gb.box(x, 0, z, 2.6, 22, 2.6, PAL.wood);
    }
    var dx = x1 - x0, dz = z1 - z0;
    if (Math.abs(dx) > Math.abs(dz)) { gb.box((x0 + x1) / 2, 14, z0, Math.abs(dx), 1.8, 1.6, PAL.plank2); gb.box((x0 + x1) / 2, 8, z0, Math.abs(dx), 1.6, 1.4, PAL.plank); }
    else { gb.box(x0, 14, (z0 + z1) / 2, 1.6, 1.8, Math.abs(dz), PAL.plank2); }
  }
  function tree(gb, x, z, s, seed) {
    var R = rnd(seed * 97 + 13);
    var trunk = 52 * s;
    gb.cyl(x, 0, z, 4.4 * s, 2.6 * s, trunk, 6, PAL.trunk);
    var lc = [PAL.leaf, PAL.leaf2, PAL.leaf3][seed % 3];
    gb.blob(x, trunk * 0.95, z, 22 * s, 18 * s, 22 * s, lc, 0, seed, 0.22);
    gb.blob(x + (R() - 0.5) * 8 * s, trunk * 1.22, z + (R() - 0.5) * 8 * s, 15 * s, 13 * s, 15 * s, shade(lc, 1.1), 0, seed + 5, 0.22);
    if (R() < 0.45) gb.blob(x + 7 * s, trunk * 0.72, z + 5 * s, 11 * s, 10 * s, 11 * s, shade(lc, 0.9), 0, seed + 9, 0.25);
  }
  function tufts(gb, x, z, c, r) {
    var R = rnd(c * 977 + r * 131 + 5);
    if (R() < 0.4) return;
    for (var i = 0; i < 2; i++) {
      var tx = x + (R() - 0.5) * 34, tz = z + (R() - 0.5) * 34, s = 1.6 + R() * 1.6, col = shade(PAL.grass, 1.05 + R() * 0.25);
      var a = [tx - s, 0, tz], b = [tx + s, 0, tz], t = [tx + (R() - 0.5) * 2, s * 2, tz + 0.5];
      gb.tri(a, b, t, col); gb.tri(b, a, t, col);
    }
  }
  function bush(gb, x, z, seed) { gb.blob(x, 9, z, 16, 14, 16, PAL.leaf2, 0, seed, 0.3); }
  function flowers(gb, x, z, c, r) {
    var R = rnd(c * 131 + r * 7);
    for (var i = 0; i < 4; i++) {
      var fx = x + (R() - 0.5) * 30, fz = z + (R() - 0.5) * 30, col = PAL.flower[i % 3];
      gb.box(fx, 0, fz, 1, 3, 1, PAL.leaf2);
      gb.box(fx, 3, fz, 2.4, 1.6, 2.4, col, 0.25);
    }
  }
  function lantern(gb, x, z, lamps) {
    gb.box(x, 0, z, 3.2, 46, 3.2, PAL.wood);
    gb.box(x + 8, 42, z, 16, 2.2, 2.2, PAL.wood);
    gb.box(x + 14, 30, z, 6, 9, 6, PAL.lamp, 1.2);
    gb.box(x + 14, 39, z, 8, 1.8, 8, PAL.wood);
    lamps.push({ x: x + 14, y: 34, z: z, s: 1.1 });
  }
  function banner(gb, x, z, h) {
    gb.box(x, 0, z, 3, h, 3, PAL.wood);
    gb.box(x, h - 3, z + 5, 1.5, 1.5, 12, PAL.wood);
    gb.box(x + 1, h - 22, z + 5, 1, 19, 10, PAL.banner);
    gb.box(x + 1.6, h - 15, z + 5, 0.6, 5, 5, PAL.gold, 0.6);
  }
  function gate(gb, x, z, c, r, cols, rows, lamps) {
    var vertical = c === 0 || c === cols - 1;
    for (var s = -1; s <= 1; s += 2) {
      var px = vertical ? x : x + s * 24, pz = vertical ? z + s * 24 : z;
      gb.box(px, 0, pz, 12, 68, 12, PAL.rock2, 0, PAL.stone);
      gb.box(px, 68, pz, 15, 4, 15, PAL.stone2);
      gb.box(px, 72, pz, 5, 7, 5, PAL.lamp, 1.3);
      lamps.push({ x: px, y: 75, z: pz, s: 1.3 });
    }
    banner(gb, x + (vertical ? 0 : -14), z + (vertical ? -14 : 0), 76);
  }
  function buildBridgeCell(gb, c, r, ch, lamps) {
    var C = 40, x0 = c * C, z0 = r * C, cx = x0 + C / 2;
    // 桥面木板（沿南北方向铺，桥两侧有栏杆）
    for (var i = 0; i < 5; i++) gb.box(cx, -2, z0 + 4 + i * 8, C, 3, 7, i % 2 ? PAL.plank : PAL.plank2);
    gb.box(cx, -18, z0 + C / 2, C, 16, 4, PAL.wood);
    var left = ch(c - 1, r) !== '=', right = ch(c + 1, r) !== '=';
    if (left) { gb.box(x0 + 2, 1, z0 + C / 2, 2.5, 20, C, PAL.plank2); for (var j = 0; j < 2; j++) gb.box(x0 + 2, 0, z0 + 6 + j * 28, 3.6, 24, 3.6, PAL.wood); }
    if (right) { gb.box(x0 + C - 2, 1, z0 + C / 2, 2.5, 20, C, PAL.plank2); for (var k = 0; k < 2; k++) gb.box(x0 + C - 2, 0, z0 + 6 + k * 28, 3.6, 24, 3.6, PAL.wood); }
    // 桥头灯笼
    if (ch(c, r - 1) !== '=' && ch(c, r - 1) !== '~') { if (left) lantern(gb, x0 + 2, z0 - 6, lamps); if (right) lantern(gb, x0 + C - 12, z0 - 6, lamps); }
    if (ch(c, r + 1) !== '=' && ch(c, r + 1) !== '~') { if (left) lantern(gb, x0 + 2, z0 + C + 6, lamps); if (right) lantern(gb, x0 + C - 12, z0 + C + 6, lamps); }
  }
  function house(gb, x0, z0, w, d, blue, lamps) {
    var cx = x0 + w / 2, cz = z0 + d / 2, wall = blue ? PAL.wall : PAL.wallWood, roof = blue ? PAL.roofBlue : PAL.roofRed;
    var span = Math.min(w, d);
    var wallH = Math.max(52, Math.min(78, span * 0.72));
    var roofH = Math.max(28, Math.min(50, span * 0.4));
    var doorH = 36;
    gb.box(cx, 0, cz, w - 8, 4, d - 6, PAL.stone2);
    gb.box(cx, 4, cz, w - 12, wallH, d - 12, wall);
    gb.box(x0 + 7, 4, cz, 3, wallH, d - 10, PAL.wood); gb.box(x0 + w - 7, 4, cz, 3, wallH, d - 10, PAL.wood);
    gb.box(cx, wallH, cz, w - 10, 4, d - 10, PAL.wood);
    gb.roof(cx, wallH + 4, cz, w - 2, roofH, d + 2, roof);
    gb.box(cx - w * 0.2, wallH + roofH * 0.45, cz - 4, 7, 20, 7, PAL.rockDark);
    gb.box(cx, 4, z0 + d - 5.5, 12, doorH, 1.4, PAL.wood);
    var winY = 4 + doorH * 0.45;
    for (var i = -1; i <= 1; i += 2) gb.box(cx + i * w * 0.25, winY, z0 + d - 5.8, 9, 11, 1, PAL.lamp, 0.9);
    gb.box(cx, doorH + 8, z0 + d - 3, w * 0.55, 2, 7, PAL.wood);
    lamps.push({ x: cx - w * 0.25, y: winY + 5, z: z0 + d - 3, s: 0.8 });
    lamps.push({ x: cx + w * 0.25, y: winY + 5, z: z0 + d - 3, s: 0.8 });
    gb.box(x0 + w - 4, 0, z0 + d - 2, 9, 9, 9, PAL.plank2);
  }

  // ================= 模型 =================
  function model(fn) { var gb = new GB(); fn(gb); return GL.upload(gb); }
  var SKIN = hex('#f1c9a5'), HAIR = hex('#4a2f1f');
  function buildModels() {
    var M = W3.meshes;
    // ---- 主角（分部件，方便做走路/披风动画）----
    M.heroLeg = model(function (g) { g.box(0, 0, 0, 4.5, 5, 4.8, hex('#4a3020')); g.box(0, 5, 0, 4.2, 7, 4.4, hex('#2b2622')); });
    M.heroBody = model(function (g) {
      g.box(0, 11, 0, 7.5, 12, 11, hex('#2d2a33'));
      g.box(0, 11, 0, 7.9, 2, 11.4, hex('#5a3a22'));
      g.box(3.9, 12, 0, 0.6, 10, 2, hex('#c8963c'), 0.3);
      g.box(0, 11, 5.8, 3, 11, 1.5, hex('#2d2a33')); g.box(0, 11, -5.8, 3, 11, 1.5, hex('#2d2a33'));
      g.box(0.5, 8, 6.2, 3.2, 4, 2.6, hex('#3a2a20')); g.box(0.5, 8, -6.2, 3.2, 4, 2.6, hex('#3a2a20'));
      g.box(0, 23, 0, 7, 7, 7, SKIN);
      g.box(3.6, 25, 1.6, 0.4, 1.4, 1.2, hex('#2a1a10')); g.box(3.6, 25, -1.6, 0.4, 1.4, 1.2, hex('#2a1a10'));
      g.blob(-0.8, 29.5, 0, 4.8, 3.2, 4.8, HAIR, 0, 3, 0.3);
      g.blob(-2.5, 26, 0, 3, 3.5, 4.2, HAIR, 0, 7, 0.3);
    });
    // 斗篷与兜帽/尖帽做成白色，绘制时按英雄的 cape 颜色着色；其余帽子、手持物自带颜色
    var CLOTH = hex('#ffffff'), STEEL = hex('#c8d2e0'), WOOD = hex('#6b4428'), GOLDC = hex('#e0a83a');
    M.cape = model(function (g) { g.box(-4.8, 7, 0, 1.4, 16, 12, CLOTH); g.blob(-2, 21, 0, 4.2, 2.6, 6.4, CLOTH, 0, 5, 0.2); });
    M.hat_wizard = model(function (g) { g.cyl(-0.3, 29.4, 0, 6.8, 6.4, 0.9, 8, CLOTH); g.cyl(-0.8, 30.3, 0, 4.2, 0, 11, 7, CLOTH); });
    M.hat_hood = model(function (g) { g.blob(-1, 27.5, 0, 4.9, 4.4, 4.9, CLOTH, 0, 9, 0.12); g.cyl(-2.2, 29, 0, 3.2, 0, 6, 5, CLOTH); });
    M.hat_helm = model(function (g) {
      g.box(-0.2, 25.5, 0, 8, 6.2, 8, STEEL); g.box(3.9, 25.6, 0, 0.4, 1.1, 5.6, hex('#1e2230'));
      g.box(-0.2, 31.6, 0, 3, 1.4, 1.4, STEEL); g.box(-1.2, 33, 0, 5, 3.4, 1, hex('#ff5a3a'));
    });
    M.hat_bandana = model(function (g) {
      g.box(0, 27.6, 0, 7.6, 2.2, 7.6, hex('#3a2350')); g.box(-5, 26.5, 1.5, 2.6, 1, 1.4, hex('#3a2350')); g.box(-6.2, 25.6, 2.2, 2, 1, 1.2, hex('#3a2350'));
      g.box(1.2, 23.2, 0, 5.2, 2.6, 7.4, hex('#1c1226'));
    });
    M.hat_goggles = model(function (g) {
      g.box(0, 27.2, 0, 7.6, 1.4, 7.6, hex('#5a3a22'));
      g.box(3.8, 26.8, 1.7, 0.8, 2.2, 2.2, hex('#8fe3ff'), 1.2); g.box(3.8, 26.8, -1.7, 0.8, 2.2, 2.2, hex('#8fe3ff'), 1.2);
    });
    M.hat_horn = model(function (g) {
      g.blob(-0.3, 29, 0, 4.6, 3.2, 4.6, hex('#8a8a92'), 0, 4, 0.08);
      g.cyl(-0.5, 29.5, 4.6, 1.5, 0, 7, 5, hex('#efe4cc')); g.cyl(-0.5, 29.5, -4.6, 1.5, 0, 7, 5, hex('#efe4cc'));
    });
    M.hat_halo = model(function (g) {
      g.blob(-1.6, 25, 0, 4.6, 6, 4.8, hex('#f4f0e0'), 0, 3, 0.1);
      for (var i = 0; i < 10; i++) { var a = i / 10 * Math.PI * 2; g.box(Math.cos(a) * 5, 35, Math.sin(a) * 5, 2.4, 0.8, 2.4, hex('#fff1a8'), 2.2); }
    });
    M.hat_cap = model(function (g) { g.blob(-0.3, 29, 0, 4.4, 2.6, 4.4, hex('#6a5236'), 0, 6, 0.06); g.box(3.6, 28.4, 0, 3.6, 0.6, 5, hex('#5a4630')); });
    M.hat_tophat = model(function (g) { g.cyl(0, 29.6, 0, 6.2, 6.2, 0.8, 10, hex('#2a1a2a')); g.cyl(0, 30.4, 0, 3.8, 3.8, 8.5, 10, hex('#2a1a2a')); g.cyl(0, 31.2, 0, 3.9, 3.9, 1.3, 10, hex('#ffe066'), 0.3); });
    M.hat_crown = model(function (g) {
      g.cyl(0, 29.8, 0, 4.2, 4.4, 2.4, 8, GOLDC, 0.4);
      for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2; g.box(Math.cos(a) * 3.8, 32.2, Math.sin(a) * 3.8, 1.2, 2.2, 1.2, GOLDC, 0.4); }
      g.box(4.2, 31, 0, 0.6, 1.2, 1.2, hex('#7affd0'), 1.6);
    });
    M.prop_staff = model(function (g) { g.box(2, 0, 7, 1.6, 30, 1.6, WOOD); g.blob(2, 32, 7, 3, 3, 3, hex('#ffb347'), 1.4, 2, 0.1); g.box(2, 28, 7, 3, 1.5, 3, hex('#c8963c'), 0.3); });
    M.prop_crossbow = model(function (g) { g.box(6, 15, 3, 12, 2, 2, WOOD); g.box(11, 15.5, 3, 1.5, 1.5, 12, hex('#4a3020')); g.box(12, 16, 3, 0.4, 0.4, 11, hex('#f6e2b0'), 0.5); g.box(4, 12, 3, 2, 4, 2, WOOD); });
    M.prop_sword = model(function (g) {
      g.box(3, 5, 7, 1.4, 5, 1.4, hex('#4a3020')); g.box(3, 10, 7, 1.6, 1.2, 6, GOLDC); g.box(3, 11.2, 7, 0.8, 16, 2.6, STEEL);
      g.box(2, 5, -7.2, 1.4, 12, 8.5, hex('#3f5f9e')); g.box(2.8, 9, -7.2, 0.4, 4, 3, GOLDC, 0.3);
    });
    M.prop_dagger = model(function (g) {
      g.box(3, 9, 7, 3, 1.2, 1.2, hex('#2a1a10')); g.box(8, 9, 7, 7, 0.6, 1.6, STEEL);
      g.box(3, 9, -7, 3, 1.2, 1.2, hex('#2a1a10')); g.box(8, 9, -7, 7, 0.6, 1.6, STEEL);
    });
    M.prop_wrench = model(function (g) { g.box(2, 4, 7, 1.6, 20, 1.6, STEEL); g.box(2, 23, 7, 5, 3, 2, STEEL); g.box(3.4, 26, 7, 1.4, 2.4, 2, STEEL); g.box(0.6, 26, 7, 1.4, 2.4, 2, STEEL); });
    M.prop_axe = model(function (g) { g.box(2, 0, 7, 1.8, 29, 1.8, WOOD); g.box(5.6, 21, 7, 5.6, 8, 0.8, STEEL); g.box(-0.8, 23, 7, 2, 4, 0.8, STEEL); });
    M.prop_book = model(function (g) { g.box(5, 11, 6, 5.5, 7, 1.6, hex('#8a2a1a')); g.box(5, 11.6, 6.9, 4.4, 5.8, 0.4, hex('#ffe2a8'), 0.6); });
    M.prop_bomb = model(function (g) { g.blob(5, 12, 7, 3.6, 3.6, 3.6, hex('#2a2a30'), 0, 3, 0.05); g.box(5, 15.4, 7, 0.8, 2.6, 0.8, hex('#c8963c')); g.blob(5, 18.4, 7, 1.1, 1.1, 1.1, hex('#ffb347'), 2.5, 2, 0.1); });
    M.prop_coin = model(function (g) { g.blob(2.5, 9, 7, 3.6, 3.8, 3.6, hex('#8a6440'), 0, 5, 0.12); g.box(2.5, 12.6, 7, 1.8, 1.4, 1.8, hex('#5a3a22')); g.cyl(5.5, 15, 7, 2.2, 2.2, 0.8, 8, GOLDC, 0.8); });
    M.prop_dice = model(function (g) { g.box(5, 10, 7, 3.6, 3.6, 3.6, hex('#f4f0e0')); g.box(6.9, 11.2, 7, 0.3, 0.9, 0.9, hex('#1f5a4a')); g.box(4, 14, 8.5, 2.6, 2.6, 2.6, hex('#ffd6d6')); });
    // ---- 敌人 ----
    M.imp = model(function (g) {
      var b = hex('#6a3f8e');
      g.box(-1, 0, 2.2, 2.4, 4, 2.4, b); g.box(-1, 0, -2.2, 2.4, 4, 2.4, b);
      g.blob(0, 7, 0, 5.5, 4.6, 5, b, 0, 11, 0.2);
      g.blob(4, 10, 0, 3.4, 3.2, 3.4, hex('#7d4ea3'), 0, 3, 0.15);
      g.cyl(3, 12.5, 2, 1, 0, 4, 4, hex('#1d1028')); g.cyl(3, 12.5, -2, 1, 0, 4, 4, hex('#1d1028'));
      g.box(6.8, 10, 1.2, 0.6, 1, 1, hex('#ff3b3b'), 2); g.box(6.8, 10, -1.2, 0.6, 1, 1, hex('#ff3b3b'), 2);
      g.box(3, 5, 4.5, 4, 1.4, 1.4, b); g.box(3, 5, -4.5, 4, 1.4, 1.4, b);
    });
    M.batBody = model(function (g) { g.blob(0, 0, 0, 3.5, 3, 3, hex('#5a3a8a'), 0, 2, 0.15); g.box(2.8, 0.8, 1, 0.5, 0.7, 0.7, hex('#ff5a8a'), 2); g.box(2.8, 0.8, -1, 0.5, 0.7, 0.7, hex('#ff5a8a'), 2); });
    M.batWing = model(function (g) {
      var c = hex('#7a4ab0');
      g.tri([1, 0, 1.5], [-2, 0, 9], [2, 3, 7], c); g.tri([1, 0, 1.5], [2, 3, 7], [-2, 0, 9], c);
      g.tri([1, 0, -1.5], [2, 3, -7], [-2, 0, -9], c); g.tri([1, 0, -1.5], [-2, 0, -9], [2, 3, -7], c);
    });
    M.brute = model(function (g) {
      var st = hex('#6d7486'), dk = hex('#454a58');
      g.box(-1, 0, 4, 5, 7, 5, dk); g.box(-1, 0, -4, 5, 7, 5, dk);
      g.box(0, 6, 0, 14, 13, 16, st);
      g.box(0, 6, 0, 14.6, 3, 16.6, hex('#8c5a34'));
      g.blob(0, 18, 7.5, 5, 4, 4, dk, 0, 3, 0.2); g.blob(0, 18, -7.5, 5, 4, 4, dk, 0, 4, 0.2);
      g.box(5, 16, 0, 7, 7, 8, dk);
      g.box(8.6, 18, 2, 0.6, 1.2, 1.4, hex('#ff4a2a'), 2); g.box(8.6, 18, -2, 0.6, 1.2, 1.4, hex('#ff4a2a'), 2);
      g.box(5, 8, 9.5, 3, 10, 3, dk); g.box(7, 4, 9.5, 10, 4, 4, hex('#5a3a22'));
    });
    M.wolf = model(function (g) {
      var f = hex('#6b4a30');
      for (var i = 0; i < 4; i++) g.box(i < 2 ? 5 : -5, 0, i % 2 ? 2.8 : -2.8, 2.4, 5, 2.4, shade(f, 0.8));
      g.box(0, 5, 0, 16, 7, 7.5, f);
      g.box(9.5, 7, 0, 6, 6, 6, f); g.box(13.5, 7, 0, 4, 3.5, 4, shade(f, 1.1));
      g.cyl(9, 12.5, 2, 1.2, 0, 3.5, 4, shade(f, 0.7)); g.cyl(9, 12.5, -2, 1.2, 0, 3.5, 4, shade(f, 0.7));
      g.box(12.6, 10, 1.6, 0.5, 1, 1, hex('#ffd24a'), 2); g.box(12.6, 10, -1.6, 0.5, 1, 1, hex('#ffd24a'), 2);
      g.box(-9.5, 8, 0, 5, 2, 2, shade(f, 0.9));
      g.box(-1, 12, 0, 5, 7, 5, hex('#3a2e2a')); g.box(-1, 19, 0, 4.4, 4.4, 4.4, hex('#5a5f6a'));
      g.box(4, 16, 3.5, 14, 1, 1, hex('#8a6440')); g.cyl(11.5, 16, 3.5, 1.2, 0, 3, 4, hex('#c9ccd6'));
    });
    M.sack = model(function (g) {
      var c = hex('#7a2e9e');
      g.blob(0, 10, 0, 11, 10, 11, c, 0, 5, 0.18);
      g.blob(-3, 16, 5, 4, 4, 4, shade(c, 1.2), 0, 8, 0.2); g.blob(-4, 12, -6, 4, 3.5, 4, shade(c, 1.2), 0, 9, 0.2);
      g.box(10, 12, 2.5, 0.8, 2, 2, hex('#ffe14a'), 2); g.box(10, 12, -2.5, 0.8, 2, 2, hex('#ffe14a'), 2);
    });
    M.goblin = model(function (g) {
      var s = hex('#6fbf3a');
      g.box(0, 0, 2, 2, 4, 2, hex('#4a3020')); g.box(0, 0, -2, 2, 4, 2, hex('#4a3020'));
      g.box(0, 4, 0, 5.5, 6, 6, hex('#7a5a3a'));
      g.box(1, 10, 0, 6, 5, 6, s);
      g.tri([0, 13, 3], [0, 11, 3], [-1, 14, 8], s); g.tri([0, 11, 3], [0, 13, 3], [-1, 14, 8], s);
      g.tri([0, 11, -3], [0, 13, -3], [-1, 14, -8], s); g.tri([0, 13, -3], [0, 11, -3], [-1, 14, -8], s);
      g.box(4.1, 12, 1.4, 0.6, 1, 1, hex('#ffe14a'), 2); g.box(4.1, 12, -1.4, 0.6, 1, 1, hex('#ffe14a'), 2);
      g.blob(-5, 8, 0, 5, 5, 5, hex('#1c1c22'), 0, 6, 0.08);
      g.box(-5, 13, 0, 1, 3, 1, hex('#caa46a')); g.box(-5, 16, 0, 1.8, 1.8, 1.8, hex('#ffb040'), 2.5);
    });
    M.archer = model(function (g) {
      var c = hex('#39445c');
      g.box(0, 0, 1.8, 2, 6, 2, hex('#2a2a33')); g.box(0, 0, -1.8, 2, 6, 2, hex('#2a2a33'));
      g.cyl(0, 5, 0, 5, 3.5, 10, 6, c);
      g.box(0, 15, 0, 4.5, 4.5, 4.5, hex('#2a2e3c'));
      g.cyl(0, 17, 0, 3.5, 0, 6, 5, c);
      g.box(2.4, 16, 0, 0.5, 0.8, 3, hex('#ffe066'), 2);
      g.box(4, 8, 0, 1.2, 14, 1.2, hex('#6b4428')); g.box(4.5, 15, 0, 1.2, 2, 1.2, hex('#8a6440'));
    });
    M.shaman = model(function (g) {
      var c = hex('#2e4f9e');
      g.cyl(0, 0, 0, 7, 4, 13, 7, c);
      g.box(0, 13, 0, 5, 5, 5, hex('#e8e2d0'));
      g.box(2.6, 14.5, 1.1, 0.4, 1, 1, hex('#3a2a20')); g.box(2.6, 14.5, -1.1, 0.4, 1, 1, hex('#3a2a20'));
      g.cyl(-1, 18, 0, 1.5, 0, 6, 4, hex('#ff6b4a'));
      g.box(4, 0, 5, 1.2, 22, 1.2, hex('#6b4428')); g.blob(4, 23, 5, 2.4, 3.2, 2.4, hex('#6fc3ff'), 1.8, 2, 0.1);
    });
    M.warlock = model(function (g) {
      var c = hex('#4a0f24');
      g.cyl(0, 0, 0, 11, 5, 26, 8, c);
      g.box(0, 26, 0, 7, 8, 7, hex('#2a0812'));
      g.cyl(0, 28, 0, 6, 0, 13, 6, c);
      g.box(3.6, 29, 1.5, 0.5, 1.2, 1.4, hex('#ff3b8c'), 2.5); g.box(3.6, 29, -1.5, 0.5, 1.2, 1.4, hex('#ff3b8c'), 2.5);
      g.box(4, 12, 8, 1.4, 28, 1.4, hex('#2a1a10')); g.blob(4, 42, 8, 3.5, 3.5, 3.5, hex('#ff3b8c'), 1.8, 3, 0.1);
      g.box(0, 22, 0, 12, 2, 16, hex('#6a1a36'));
    });
    M.brood = model(function (g) {
      var c = hex('#3c1f5c');
      g.blob(0, 16, 0, 16, 13, 14, c, 0, 5, 0.2);
      g.blob(12, 20, 0, 8, 7, 8, shade(c, 1.2), 0, 6, 0.2);
      g.box(19, 21, 3, 1, 2, 2, hex('#ff5a8a'), 2); g.box(19, 21, -3, 1, 2, 2, hex('#ff5a8a'), 2);
      for (var i = 0; i < 4; i++) g.box(i < 2 ? 6 : -6, 0, i % 2 ? 6 : -6, 3, 8, 3, shade(c, 0.7));
      g.blob(-6, 26, 0, 7, 5, 9, hex('#9b4dff'), 0.4, 9, 0.3);
    });
    M.broodWing = model(function (g) {
      var c = hex('#5a2e8a');
      g.tri([2, 0, 6], [-10, 0, 34], [6, 10, 28], c); g.tri([2, 0, 6], [6, 10, 28], [-10, 0, 34], c);
      g.tri([2, 0, -6], [6, 10, -28], [-10, 0, -34], c); g.tri([2, 0, -6], [-10, 0, -34], [6, 10, -28], c);
    });
    M.golem = model(function (g) {
      var s = hex('#6a6660'), s2 = hex('#7d7870'), lava = hex('#ff6a2e');
      g.blob(-4, 10, 12, 10, 12, 9, s, 0, 3, 0.2); g.blob(-4, 10, -12, 10, 12, 9, s, 0, 4, 0.2);
      g.blob(0, 38, 0, 26, 20, 24, s2, 0, 5, 0.2);
      g.blob(16, 50, 0, 11, 10, 11, s, 0, 6, 0.2);
      g.box(26, 52, 4, 1.2, 3, 3, lava, 3); g.box(26, 52, -4, 1.2, 3, 3, lava, 3);
      g.blob(8, 34, 28, 11, 16, 10, s, 0, 7, 0.25); g.blob(12, 16, 30, 10, 9, 10, s2, 0, 8, 0.25);
      g.blob(8, 34, -28, 11, 16, 10, s, 0, 9, 0.25); g.blob(12, 16, -30, 10, 9, 10, s2, 0, 10, 0.25);
      g.box(18, 36, 0, 6, 10, 20, lava, 2.2);
      g.box(10, 44, 12, 8, 2, 2, lava, 2.2); g.box(8, 30, -14, 8, 2, 2, lava, 2.2); g.box(-6, 46, 6, 2, 10, 2, lava, 2.2);
    });
    // ---- 建筑 / 士兵 / 圣火 / 金币 ----
    M.sentry = model(function (g) {
      g.box(0, 0, 0, 22, 26, 22, PAL.rock2, 0, PAL.stone);
      g.box(0, 26, 0, 16, 62, 16, PAL.wallWood);
      g.box(0, 58, 8.2, 7, 8, 0.8, hex('#1a120c'));
      g.cyl(0, 88, 0, 16, 0, 26, 4, PAL.roofRed);
      g.box(0, 40, 8.4, 8, 28, 0.8, PAL.banner); g.box(0, 52, 8.9, 4, 6, 0.4, PAL.gold, 0.6);
    });
    M.pylon = model(function (g) {
      g.box(0, 0, 0, 20, 10, 20, PAL.rock2, 0, PAL.stone);
      g.box(0, 10, 0, 10, 70, 10, PAL.rock);
      g.blob(0, 92, 0, 8, 22, 8, hex('#8fe3ff'), 1.1, 3, 0.15);
      g.blob(6, 48, 4, 4, 16, 4, hex('#8fe3ff'), 0.9, 5, 0.2); g.blob(-6, 36, -4, 4, 14, 4, hex('#8fe3ff'), 0.9, 6, 0.2);
    });
    M.siphon = model(function (g) {
      g.box(0, 0, 0, 16, 6, 16, PAL.stone);
      g.box(0, 6, 0, 5, 78, 5, PAL.wood);
      g.box(0, 78, 0, 16, 3, 3, PAL.wood);
      g.cyl(0, 92, 0, 7, 7, 2, 8, PAL.gold, 1.0);
    });
    M.barracks = model(function (g) {
      g.box(0, 0, 0, 32, 4, 28, PAL.stone2);
      g.box(0, 4, 0, 28, 48, 24, PAL.wallWood);
      g.roof(0, 52, 0, 34, 28, 30, PAL.roofRed);
      g.box(0, 4, 12.2, 10, 28, 0.8, hex('#1a120c'));
      banner(g, -15, 13, 72);
    });
    M.mortar = model(function (g) {
      g.box(0, 0, 0, 30, 10, 30, PAL.rock2, 0, PAL.stone);
      g.box(0, 31, 0, 18, 54, 18, PAL.wallWood, 0, PAL.rockDark);
      g.box(0, 61, 0, 32, 9, 32, PAL.rockDark, 0, PAL.gold);
      g.box(16, 72, 0, 38, 13, 13, hex('#aeb8c4'), 0.25, PAL.stone);
      g.box(34, 72, 0, 6, 15, 15, PAL.gold);
      g.box(-11, 35, 0, 5, 27, 23, PAL.roofRed);
    });
    M.ward = model(function (g) {
      g.box(0, 0, 0, 30, 8, 30, PAL.stone2, 0, PAL.gold);
      g.box(0, 8, 0, 16, 66, 16, PAL.rock2);
      g.box(0, 42, 8.5, 5, 26, 1, hex('#315c50'));
      g.blob(0, 50, 11, 6, 10, 4, hex('#78dfb3'), 1, 3, 0.1);
      g.cyl(0, 79, 0, 15, 9, 5, 6, PAL.stone);
      g.blob(0, 94, 0, 7, 12, 7, hex('#9fffd5'), 1.2, 5, 0.1);
    });
    M.snare = model(function (g) {
      g.box(0, 0, 0, 24, 8, 24, PAL.rockDark, 0, PAL.stone);
      g.box(0, 8, 0, 10, 62, 10, PAL.wallWood);
      g.cyl(0, 66, 0, 15, 8, 6, 6, PAL.rock2);
      for (var si = 0; si < 4; si++) {
        var sa = si * Math.PI / 2 + Math.PI / 4;
        g.box(Math.cos(sa) * 12, 79, Math.sin(sa) * 12, 3, 27, 3, hex('#dc8cff'), 0.2);
      }
      g.blob(0, 92, 0, 7, 8, 7, hex('#c07bff'), 1.3, 4, 0.08);
    });
    M.beacon = model(function (g) {
      g.box(0, 0, 0, 24, 8, 24, PAL.stone2, 0, PAL.gold);
      g.box(0, 8, 0, 10, 78, 10, PAL.wood);
      g.cyl(0, 88, 0, 18, 6, 5, 6, PAL.gold, 0.5);
      g.box(0, 99, 0, 3, 26, 3, hex('#ff9a3c'), 0.8);
      g.blob(0, 111, 0, 8, 12, 8, hex('#ffc65c'), 1.25, 6, 0.1);
      g.blob(0, 125, 0, 4, 9, 4, hex('#fff0b0'), 1.5, 8, 0.1);
    });
    M.soldier = model(function (g) {
      g.box(0, 0, 1.6, 1.8, 4, 1.8, hex('#5a5f6a')); g.box(0, 0, -1.6, 1.8, 4, 1.8, hex('#5a5f6a'));
      g.box(0, 4, 0, 4, 6, 5, hex('#c9ccd6'));
      g.box(0, 10, 0, 3.6, 3.6, 3.6, hex('#aeb2bd'));
      g.box(-0.5, 13.5, 0, 3, 1.6, 0.8, hex('#d23a2a'));
      g.box(3, 5, 3, 7, 1, 1, hex('#e6e8ee'), 0.3);
      g.box(0.5, 4, -3.2, 3.5, 5, 0.8, hex('#8a2a22'));
    });
    M.core = model(function (g) {
      g.box(0, 0, 0, 56, 6, 56, PAL.stone2);
      g.box(0, 6, 0, 40, 8, 40, PAL.stone);
      g.box(0, 14, 0, 26, 10, 26, PAL.rock2);
      g.cyl(0, 24, 0, 11, 16, 8, 8, hex('#3a3430'));
      g.cyl(0, 31, 0, 13, 13, 1, 8, PAL.gold, 0.8);
      for (var i = 0; i < 4; i++) { var a = i * Math.PI / 2 + Math.PI / 4; banner(g, Math.cos(a) * 30, Math.sin(a) * 30, 40); }
    });
    M.coin = model(function (g) { g.cyl(0, -0.8, 0, 3.4, 3.4, 1.6, 8, PAL.gold, 0.6, hex('#ffd76a')); });
    M.stone = model(function (g) { g.blob(0, 2, 0, 5, 3, 5, PAL.rock2, 0, 4, 0.25); });
    M.crystal = model(function (g) { g.blob(0, 0, 0, 2.6, 4.5, 2.6, hex('#9dffcf'), 1.2, 3, 0.1); });
  }

  // 敌人类型 → 模型与基础尺寸
  var EMODEL = {
    mite: { m: 'imp', base: 8 }, spore: { m: 'batBody', base: 6, fly: 28 }, shell: { m: 'brute', base: 14 }, dasher: { m: 'wolf', base: 10 },
    splitter: { m: 'sack', base: 12 }, bomber: { m: 'goblin', base: 10 }, spitter: { m: 'archer', base: 9 }, shielder: { m: 'shaman', base: 11 },
    warden: { m: 'warlock', base: 22 }, brood: { m: 'brood', base: 26 }, boss: { m: 'golem', base: 38 }
  };
  var TMODEL = { sentry: 'sentry', pylon: 'pylon', siphon: 'siphon', barracks: 'barracks', mortar: 'mortar', ward: 'ward', snare: 'snare', beacon: 'beacon' };

  // ================= 昼夜 =================
  function envPreset(kind) {
    // grade = [饱和度, 对比度, 边缘光, 亮度偏移]；shadowDark = 阴影里保留多少直射光；line = 描边颜色；
    // bloom = 泛光强度，thr = 泛光阈值（越低越多东西发光）
    var P = {
      day: { light: [-0.45, 0.82, 0.36], sun: hex('#fff0d4'), sky: shade(hex('#bcd4ff'), 0.55), ground: shade(hex('#6b5a40'), 0.4), fog: hex('#a9c6e8'), clear: hex('#9fc3ea'), fogNear: 1400, fogFar: 3200, em: 1.0, lamp: 0.15,
        grade: [1.12, 1.06, 0.18, 0.0], shadowDark: 0.42, line: hex('#2a2230'), bloom: 0.35, thr: 0.9 },
      dusk: { light: [-0.7, 0.55, 0.3], sun: shade(hex('#ffae6a'), 0.95), sky: shade(hex('#8a7fb8'), 0.55), ground: shade(hex('#5a3a30'), 0.4), fog: hex('#7a5f80'), clear: hex('#5e4a70'), fogNear: 1300, fogFar: 3000, em: 1.2, lamp: 0.6,
        grade: [1.15, 1.08, 0.3, 0.0], shadowDark: 0.4, line: hex('#24162a'), bloom: 0.6, thr: 0.78 },
      night: { light: [-0.35, 0.8, 0.45], sun: shade(hex('#8aa4ff'), 0.4), sky: shade(hex('#3a5088'), 0.55), ground: shade(hex('#1c1c30'), 0.4), fog: hex('#141c30'), clear: hex('#0c1222'), fogNear: 1200, fogFar: 2800, em: 1.5, lamp: 1.0,
        grade: [1.1, 1.1, 0.35, 0.01], shadowDark: 0.5, line: hex('#0a0c16'), bloom: 0.95, thr: 0.62 },
      boss: { light: [-0.5, 0.7, 0.4], sun: shade(hex('#ff9a7a'), 0.7), sky: shade(hex('#6a3050'), 0.55), ground: shade(hex('#2a1418'), 0.4), fog: hex('#3a1420'), clear: hex('#200a14'), fogNear: 1200, fogFar: 2800, em: 1.4, lamp: 0.9,
        grade: [1.14, 1.12, 0.35, 0.0], shadowDark: 0.45, line: hex('#12060a'), bloom: 0.85, thr: 0.66 }
    };
    var e = P[kind], l = e.light, ll = Math.sqrt(l[0] * l[0] + l[1] * l[1] + l[2] * l[2]);
    return { light: [l[0] / ll, l[1] / ll, l[2] / ll], sun: e.sun.slice(), sky: e.sky.slice(), ground: e.ground.slice(), fog: e.fog.slice(), clear: e.clear.slice(), fogNear: e.fogNear, fogFar: e.fogFar, em: e.em, lamp: e.lamp,
      grade: e.grade.slice(), shadowDark: e.shadowDark, line: e.line.slice(), bloom: e.bloom, thr: e.thr, time: 0 };
  }
  W3.envFor = function (g) {
    if (g.mode === 'title' || g.mode === 'pick') return 'dusk';
    if (g.wave > 0 && g.wave % RW.BOSS_WAVES.every === 0 && g.mode !== 'shop') return 'boss';
    return g.wave <= 3 ? 'day' : (g.wave <= 6 ? 'dusk' : 'night');
  };
  function lerpEnv(a, b, k) {
    ['light', 'sun', 'sky', 'ground', 'fog', 'clear', 'line'].forEach(function (key) { for (var i = 0; i < 3; i++) a[key][i] += (b[key][i] - a[key][i]) * k; });
    for (var j = 0; j < 4; j++) a.grade[j] += (b.grade[j] - a.grade[j]) * k;
    ['fogNear', 'fogFar', 'em', 'lamp', 'shadowDark', 'bloom', 'thr'].forEach(function (key) { a[key] += (b[key] - a[key]) * k; });
  }

  // ================= 初始化 =================
  W3.init = function () {
    if (!GL.ok) return false;
    var t = buildTerrain();
    W3.land = GL.upload(t.land, { static: true });
    W3.water = GL.upload(t.water, { static: true, water: true });
    W3.lamps = t.lamps;
    buildModels();
    // 发光小物件不描边、不投影，保持干净的光点
    ['coin', 'crystal'].forEach(function (k) { if (W3.meshes[k]) { W3.meshes[k].outline = false; W3.meshes[k].shadow = false; } });
    // 浏览器调试参数：?lowfx 关掉全部画质效果；?hifx 锁定画质、不自动降级（截图用）
    try {
      if (typeof location !== 'undefined') {
        if (/[?&]lowfx\b/.test(location.search)) GL.fx.shadow = GL.fx.outline = GL.fx.bloom = false;
        if (/[?&]hifx\b/.test(location.search)) perf.locked = true;
      }
    } catch (e) { /* 微信里没有 location */ }
    W3.env = envPreset('dusk');
    W3.ready = true;
    return true;
  };

  // ================= 镜头 =================
  var CAM = { pitch: 46 * Math.PI / 180, fov: 30 * Math.PI / 180, dist: 980 };
  W3.updateCamera = function (g, dt, orbit, aspect) {
    var p = g.player, WD = T.WORLD, ct = W3.camT;
    var tx, tz;
    if (orbit) { tx = T.core.x + Math.cos(W3.t * 0.12) * 120; tz = T.core.y - 120 + Math.sin(W3.t * 0.12) * 80; }
    else { tx = p.x + p.vx * T.camera.lead; tz = p.y + p.vy * T.camera.lead; }
    // 横屏视野很宽：按地面上的可见半宽限制镜头，别拍到地图外面
    var asp = aspect || V.w / V.h, mx = Math.min(WD.w / 2, Math.tan(CAM.fov / 2) * CAM.dist * asp * 0.92);
    tx = Math.max(mx, Math.min(WD.w - mx, tx)); tz = Math.max(330, Math.min(WD.h - 230, tz));
    if (W3.snap) { ct.x = tx; ct.z = tz; W3.snap = false; }
    else { var k = 1 - Math.exp(-T.camera.follow * dt); ct.x += (tx - ct.x) * k; ct.z += (tz - ct.z) * k; }
    var sh = g.shake > 0.01 ? 11 * g.shake * Math.sqrt(g.shake) : 0;
    var sx = sh ? (Math.random() * 2 - 1) * sh : 0, sz = sh ? (Math.random() * 2 - 1) * sh : 0;
    var cx = ct.x + sx, cz = ct.z + sz;
    var eye = [cx, Math.sin(CAM.pitch) * CAM.dist, cz + Math.cos(CAM.pitch) * CAM.dist];
    GL.setCamera(eye, [cx, 0, cz], CAM.fov, aspect || V.w / V.h);
    GL.updateBillboardAxes();
    // 可见范围（地面上的大致矩形）
    var halfW = Math.tan(CAM.fov / 2) * CAM.dist * (aspect || V.w / V.h) * 1.25;
    var b = W3.bounds;
    b.x0 = cx - halfW - 80; b.x1 = cx + halfW + 80; b.z0 = cz - 760; b.z1 = cz + 360;
  };
  W3.inView = function (x, z, m) { var b = W3.bounds; return x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m; };
  // 世界点 -> 逻辑屏幕坐标（HUD 用）
  var SP = { x: 0, y: 0, ok: false };
  W3.toScreen = function (x, y, z) {
    var p = GL.project(x, y, z);
    if (!p) { SP.ok = false; return SP; }
    // 3D 铺满整个窗口：NDC -> 窗口 CSS 像素 -> 逻辑坐标
    var v = RW.Plat.view;
    SP.x = ((p[0] * 0.5 + 0.5) * v.cssW - v.ox) / v.s; SP.y = ((0.5 - p[1] * 0.5) * v.cssH - v.oy) / v.s;
    SP.ok = p[0] > -1.1 && p[0] < 1.1 && p[1] > -1.1 && p[1] < 1.1;
    return SP;
  };

  // ================= 每帧绘制 =================
  var WHITE = [1, 1, 1], BLACK = [0, 0, 0];
  // 帧率自适应：平均帧时间持续超过 30ms，按 泛光 -> 描边 -> 阴影 的顺序逐个关掉
  var perf = { avg: 1 / 60, slowT: 0, locked: false };
  function adaptQuality(dt) {
    if (perf.locked || !(dt > 0) || dt > 0.25) return;
    perf.avg += (dt - perf.avg) * 0.05;
    perf.slowT = perf.avg > 0.03 ? perf.slowT + dt : 0;
    if (perf.slowT < 3) return;
    perf.slowT = 0; perf.avg = 1 / 60;
    var fx = GL.fx;
    if (fx.bloom) fx.bloom = false; else if (fx.outline) fx.outline = false; else if (fx.shadow) fx.shadow = false;
    console.warn('帧率偏低，自动降低画质', JSON.stringify(fx));
  }
  W3.blobShadow = function () { return GL.fx.shadow ? 0.45 : 1; };   // 有真阴影时，脚下的圆影只做接触阴影

  W3.draw = function (g, viewport, dt, orbit) {
    W3.t += dt;
    adaptQuality(dt);
    var target = envPreset(W3.envFor(g));
    lerpEnv(W3.env, target, Math.min(1, dt * 1.5));
    var env = W3.env; env.time = W3.t;
    W3.updateCamera(g, dt, orbit, viewport[2] / viewport[3]);
    var M = W3.meshes, k;
    drawCore(g, M);
    drawTowers(g, M);
    drawSoldiers(g, M);
    drawEnemies(g, M);
    drawCorpses(g, M);
    if (!orbit || g.mode === 'down') drawHero(g, M);
    drawPickups(g, M);
    drawFx(g, env);
    // 阴影覆盖当前可见范围；光照、雾、描边、泛光、调色都由 env 决定
    var b = W3.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    var r = Math.sqrt((b.x1 - b.x0) * (b.x1 - b.x0) + (b.z1 - b.z0) * (b.z1 - b.z0)) / 2 + 40;
    GL.frame(env, { cx: cx, cz: cz, r: r });
  };

  function flashOf(e) { return e.flash > 0 ? 0.85 : 0; }
  function tintOf(e) {
    if (e.shieldT > 0) return [0.75, 0.85, 1.2];
    if (e.slowT > 0) return [0.8, 0.95, 1.25];
    return WHITE;
  }

  // 手持物发光点（本地坐标：前 +X、右 +Z、上 +Y）
  var PROP_GLOW = { staff: [2, 32, 7, '#ffb347', 9], book: [5, 12, 7.5, '#fff1a8', 8], bomb: [5, 18.4, 7, '#ffb347', 6], coin: [5.5, 15.4, 7, '#ffe066', 6] };
  function drawHero(g, M) {
    var p = g.player;
    if (g.mode === 'revive' || g.mode === 'result') return;
    if (p.inv > 0 && p.dashT <= 0 && g.mode === 'battle' && p.hurtT <= 0 && Math.sin(W3.t * 45) > 0) return;
    var d = g.cls || RW.CLASSES.mage, look = d.look || { hat: 'wizard', prop: 'staff' };
    var sc = p.r / 10 * 1.35, face = p.face, speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    var mv = Math.min(1, speed / 120), t = W3.t;
    var sw = mv * 0.6 * Math.sin(t * 14), bob = Math.abs(Math.sin(t * 14)) * mv * 1.5;
    var cx = p.x, cz = p.y, cs = Math.cos(face), sn = Math.sin(face);
    // ---- 动作 ----
    var lean = p.dashT > 0 ? -0.35 : 0, propTilt = 0, sy = sc, fall = 0;
    var atk = 0;
    for (var wi = 0; wi < g.weapons.length; wi++) atk = Math.max(atk, g.weapons[wi].kick || 0);
    lean -= atk * 0.07; propTilt -= atk * 0.5;                                           // 攻击：身体前压，武器前送
    if (p.castT > 0) { var ck = p.castT / 0.45; propTilt -= 1.1 * Math.sin(ck * Math.PI); bob += 3 * Math.sin(ck * Math.PI); }   // 施法：举起武器、轻跳
    if (p.hurtT > 0) { var hk = p.hurtT / 0.3; lean += 0.32 * hk; sy *= 1 - 0.1 * hk; }            // 受击：后仰、压扁
    if (speed < 12 && g.mode === 'battle') sy *= 1 + 0.025 * Math.sin(t * 3.2);                  // 待机：呼吸
    if (g.mode === 'clear') { bob += Math.abs(Math.sin(t * 9)) * 5; propTilt -= 0.7; }             // 过波：欢呼跳
    if (g.mode === 'down') { fall = Math.min(1, (1.1 - (g.downT || 0)) / 0.45); lean += 1.45 * fall; bob = 0; }   // 倒地
    if (fall < 0.6) {
      GL.put(M.heroLeg, cx - sn * 2.6 * sc, 0, cz + cs * 2.6 * sc, face, sc, sc, sc, sw);
      GL.put(M.heroLeg, cx + sn * 2.6 * sc, 0, cz - cs * 2.6 * sc, face, sc, sc, sc, -sw);
    }
    var by = fall > 0 ? 3 * fall : bob;
    GL.put(M.heroBody, cx, by, cz, face, sc, sy, sc, lean);
    var capeLift = mv * 0.9 + (p.dashT > 0 ? 0.4 : 0) + Math.sin(t * 6) * 0.05;
    var cc = hex(d.cape);
    GL.put(M.cape, cx, by, cz, face, sc, sy, sc, -Math.min(0.9, capeLift) * 0.6 + lean, cc[0], cc[1], cc[2]);
    var hat = M['hat_' + look.hat];
    if (hat) {
      var tinted = look.hat === 'wizard' || look.hat === 'hood';
      GL.put(hat, cx, by, cz, face, sc, sy, sc, lean, tinted ? cc[0] : 1, tinted ? cc[1] : 1, tinted ? cc[2] : 1);
    }
    var prop = M['prop_' + look.prop];
    if (prop) GL.put(prop, cx, by, cz, face, sc, sy, sc, lean + propTilt);
    var pg = PROP_GLOW[look.prop];
    if (pg && fall < 0.5 && Math.abs(propTilt) < 0.3) GL.glow(cx + (cs * pg[0] - sn * pg[2]) * sc, pg[1] * sc + by, cz + (sn * pg[0] + cs * pg[2]) * sc, pg[4], hex(pg[3]), 0.8);
    if (look.hat === 'halo' && fall < 0.5) GL.glow(cx, 35 * sc + by, cz, 10, hex('#fff1a8'), 0.35);
    if (g.mode === 'down') return;
    // 影子 + 脚下光圈（位阶颜色）
    GL.ground(false, cx, 0.8, cz, 13 * sc, 2, 0.3, BLACK, (0.35) * W3.blobShadow());
    var ec = hex(RW.EVO[p.stage].color);
    GL.ground(true, cx, 1, cz, 16 * sc, 1, 0.15, ec, 0.45);
    if (g.momTier > 0) GL.ground(true, cx, 1.2, cz, (22 + g.momTier * 5) * sc, 0, 0, g.momTier >= 3 ? hex('#ff5a2e') : hex('#ffc861'), 0.25 + 0.1 * Math.sin(W3.t * 10));
    if (g.cls && g.cls.focus && g.focus > 0) {
      var fk = g.focus / g.cls.focus.max;
      GL.ground(true, cx, 1.3, cz, 24 * sc - fk * 8, 1, 0.08, fk >= 1 ? WHITE : hex('#9dff7a'), 0.3 + 0.5 * fk);
    }
    // 冲刺残影
    if (p.trailT > 0 && p.trailN > 1) {
      for (var i = 0; i < p.trailN - 1; i++) {
        var k = p.trailT / 0.3 * (1 - i / p.trailN);
        GL.streak(true, p.trail[i * 2], 8, p.trail[i * 2 + 1], p.trail[i * 2 + 2], p.trail[i * 2 + 3], 12 * sc * (1 - i / p.trailN), ec, 0.6 * k);
      }
    }
    // 护身剑环
    for (var w = 0; w < g.weapons.length; w++) {
      var wp = g.weapons[w];
      if (wp.d.kind === 'blades' && wp.bladeN) {
        for (var b = 0; b < wp.bladeN; b++) {
          var a = wp.phase + b * TAU / wp.bladeN, bx = p.x + Math.cos(a) * wp.bladeR, bz = p.y + Math.sin(a) * wp.bladeR;
          GL.beam3(true, bx - Math.sin(a) * 9, 12, bz + Math.cos(a) * 9, bx + Math.sin(a) * 9, 12, bz - Math.cos(a) * 9, 4, hex('#bff5ff'), 0.95);
          GL.streak(true, bx, 10, bz, p.x + Math.cos(a - 0.5) * wp.bladeR, p.y + Math.sin(a - 0.5) * wp.bladeR, 5, hex('#bff5ff'), 0.35);
        }
      }
      if (wp.d.kind === 'lance' && wp.charge > 0) {
        var k2 = 1 - wp.charge / wp.d.charge, len = wp.d.range * g.st.range;
        GL.streak(true, p.x, 2, p.y, p.x + Math.cos(wp.ang) * len, p.y + Math.sin(wp.ang) * len, 3 + 5 * k2, hex('#b58cff'), 0.2 + 0.5 * k2);
        GL.glow(p.x, 20, p.y, 12 + 16 * k2, hex('#b58cff'), 0.5 * k2);
      }
    }
  }

  function drawEnemies(g, M) {
    var t = W3.t;
    for (var i = 0; i < g.enemies.length; i++) {
      var e = g.enemies[i];
      if (!e.on || !W3.inView(e.x, e.y, 60)) continue;
      var em = EMODEL[e.type], mesh = M[em.m], s = e.r / em.base * 1.25;
      var sp = e.spawnT > 0 ? 1 - e.spawnT / 0.18 * 0.8 : 1;
      s *= sp;
      var yaw, tilt = 0, y = 0, tint = tintOf(e), fl = flashOf(e);
      if ((e.type === 'dasher' || e.type === 'boss') && (e.state === 3 || e.state === 4 || (e.type === 'dasher' && (e.state === 1 || e.state === 2)))) yaw = Math.atan2(e.dy, e.dx);
      else if (e.type === 'spitter' && e.state === 1) yaw = Math.atan2(e.dy - e.y, e.dx - e.x);
      else if (e.type === 'boss' || e.type === 'warden' || e.type === 'shielder' || e.type === 'spitter') yaw = Math.atan2(g.player.y - e.y, g.player.x - e.x);
      else yaw = Math.atan2(e.vy, e.vx);
      var sq = 1;
      var walkPh = t * 12 + e.seq;
      if (e.type === 'splitter') sq = 1 + Math.sin(t * 6 + e.seq) * 0.08;
      if (e.type === 'bomber' && e.state === 1) { sq = 1.15; if (Math.sin(t * 40) > 0) fl = 0.6; }
      if (e.type === 'dasher' && e.state === 1 && Math.sin(t * 40) > 0) fl = 0.7;
      if (e.type === 'dasher' && e.state === 2) tilt = -0.25;
      if (e.type === 'boss' && e.state === 1) tilt = 0.12;
      if (e.type === 'boss' && e.enraged) { tint = [1.25, 0.8, 0.7]; }
      if (em.fly) y = em.fly + Math.sin(t * 8 + e.seq) * 4;
      else y = Math.abs(Math.sin(walkPh)) * (e.elite ? 1 : 2);
      GL.put(mesh, e.x, y, e.y, yaw, s * sq, s / sq, s * sq, tilt, tint[0], tint[1], tint[2], fl);
      if (e.type === 'spore') GL.put(M.batWing, e.x, y + 1 * s, e.y, yaw, s, s * Math.sin(t * 22 + e.seq) * 1.2, s, 0, 1, 1, 1, fl);
      if (e.type === 'brood') GL.put(M.broodWing, e.x, 26 * s, e.y, yaw, s, s * (0.6 + 0.5 * Math.sin(t * 5 + e.seq)), s, 0, 1, 1, 1, fl);
      // 影子
      GL.ground(false, e.x, 0.6, e.y, e.r * (em.fly ? 0.8 : 1.15), 2, 0.3, BLACK, (em.fly ? 0.18 : 0.3) * W3.blobShadow());
      if (!em.fly) GL.ground(true, e.x, 0.7, e.y, e.r * 1.3, 1, 0.12, e.elite ? C('#ff3b5c') : C('#ff6a4a'), e.elite ? 0.55 : 0.22);
      // 特殊光效
      if (e.type === 'bomber') GL.glow(e.x - Math.cos(yaw) * 5 * s, 16 * s, e.y - Math.sin(yaw) * 5 * s, e.state === 1 ? 14 : 6, hex('#ffb040'), 0.9);
      if (e.type === 'shielder') GL.glow(e.x + Math.cos(yaw) * 4 * s, 23 * s, e.y + Math.sin(yaw) * 4 * s, 10, hex('#6fc3ff'), 0.7);
      if (e.type === 'warden') {
        for (var o = 0; o < 3; o++) { var oa = t * 2 + o * TAU / 3; GL.glow(e.x + Math.cos(oa) * 26, 30 + Math.sin(t * 3 + o) * 4, e.y + Math.sin(oa) * 26, e.charging ? 14 : 8, hex('#ff3b8c'), 0.85); }
        if (e.charging) GL.ground(true, e.x, 1, e.y, e.r + 30, 1, 0.2, hex('#ff3b8c'), 0.6);
      }
      if (e.type === 'boss') {
        GL.glow(e.x, 40, e.y, e.r * 1.2, e.enraged ? hex('#ff4a1a') : hex('#ff8a3a'), 0.25 + 0.15 * Math.sin(t * 5));
      }
      if (e.shieldT > 0) GL.glow(e.x, e.r, e.y, e.r * 1.8, hex('#6fa8ff'), 0.28);
    }
  }
  function drawCorpses(g, M) {
    for (var i = 0; i < g.corpses.length; i++) {
      var c = g.corpses[i];
      if (!c.on || !W3.inView(c.x, c.y, 40)) continue;
      var em = EMODEL[c.type], s = c.r / em.base * 1.25, k = c.life / c.max;
      var sink = k < 0.3 ? (0.3 - k) / 0.3 : 0;
      var y = c.z - sink * c.r * 1.5 + (em.fly ? 0 : 0);
      GL.put(M[em.m], c.x, y, c.y, c.rot, s * (1 - sink * 0.3), s * (1 - sink * 0.5), s * (1 - sink * 0.3), c.tilt, 0.55, 0.5, 0.55, k > 0.9 ? 0.5 : 0);
    }
  }
  function drawTowers(g, M) {
    for (var i = 0; i < g.towers.length; i++) {
      var tw = g.towers[i];
      if (!tw.on || !W3.inView(tw.x, tw.y, 80)) continue;
      var d = tw.d, s = d.r / 12 * 0.9, bk = tw.build > 0 ? 1 - tw.build / T.build.time : 1;
      var yaw = d.kind === 'sentry' || d.kind === 'mortar' ? tw.ang : -Math.PI / 2;
      GL.put(M[TMODEL[tw.id]], tw.x, (bk - 1) * 90, tw.y, d.kind === 'barracks' ? 0 : yaw, s, s * bk, s, 0, 1, 1, 1, tw.flash > 0 ? 0.7 : 0);
      GL.ground(false, tw.x, 0.5, tw.y, d.r * 1.6, 2, 0.2, BLACK, (0.3) * W3.blobShadow());
      var range = (d.range || 0) * RW.TOWER_TIER.range[g.tech[tw.id] - 1];
      if (d.kind === 'barracks') range = d.leash;
      if (range) GL.ground(true, tw.x, 0.8, tw.y, range, 1, 0.012, hex(d.color), 0.25);
      if (d.kind === 'pylon') { GL.glow(tw.x, 84, tw.y, 18, hex('#8fe3ff'), 0.5 + 0.2 * Math.sin(W3.t * 4)); if (tw.pulse > 0) GL.ground(true, tw.x, 1, tw.y, range, 0, 0, hex('#8fe3ff'), tw.pulse); }
      if (d.kind === 'siphon') GL.glow(tw.x, 78, tw.y, 14, hex('#ffe066'), 0.6);
      if (d.kind === 'ward') GL.glow(tw.x, 92, tw.y, 14, hex('#78dfb3'), 0.45 + 0.25 * Math.sin(W3.t * 2.5));
      if (d.kind === 'snare' && tw.pulse > 0) GL.ground(true, tw.x, 1, tw.y, range, 0, 0, hex('#dc8cff'), tw.pulse);
      if (d.kind === 'beacon') GL.glow(tw.x, 124, tw.y, 22, hex('#ffc65c'), 0.65 + 0.2 * Math.sin(W3.t * 4));
      if (tw.buffT > 0) GL.glow(tw.x, 48, tw.y, d.r * 1.25, hex('#ffc65c'), Math.min(0.65, tw.buffT / 5));
    }
  }
  function drawSoldiers(g, M) {
    for (var i = 0; i < g.soldiers.length; i++) {
      var s = g.soldiers[i];
      if (!s.on || !W3.inView(s.x, s.y, 30)) continue;
      var sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      GL.put(M.soldier, s.x, Math.abs(Math.sin(W3.t * 14 + i)) * Math.min(1, sp / 80) * 2, s.y, s.ang, 1.1, 1.1, 1.1, 0, 1, 1, 1, s.flash > 0 ? 0.7 : 0);
      GL.ground(false, s.x, 0.6, s.y, 7, 2, 0.3, BLACK, (0.3) * W3.blobShadow());
    }
  }
  function drawCore(g, M) {
    var co = g.core;
    GL.put(M.core, co.x, 0, co.y, 0, 1, 1, 1, 0, 1, 1, 1, co.flash > 0 ? 0.4 : 0);
    var t = W3.t, k = co.hp / co.maxHp;
    // 圣火：几层叠起来的火光
    var fc = co.alert > 0 && Math.sin(t * 14) > 0 ? hex('#ff4a3a') : hex('#ffb347');
    GL.glow(co.x, 44, co.y, 30 + Math.sin(t * 9) * 3, fc, 0.9);
    GL.glow(co.x, 52 + Math.sin(t * 7) * 2, co.y, 18, hex('#fff1b0'), 0.9);
    for (var i = 0; i < 5; i++) {
      var ph = (t * 1.4 + i / 5) % 1;
      GL.glow(co.x + Math.sin(i * 2.1 + t * 3) * 6, 38 + ph * 40, co.y + Math.cos(i * 1.7 + t * 2) * 6, 10 * (1 - ph), hex('#ff8a2a'), 0.8 * (1 - ph));
    }
    GL.ground(true, co.x, 1, co.y, 120 + Math.sin(t * 3) * 6, 0, 0, hex('#ffb347'), 0.22 * W3.env.lamp + 0.08);
    GL.ground(true, co.x, 1.2, co.y, 42, 1, 0.12, k < 0.3 ? hex('#ff3b3b') : hex('#ffd27a'), 0.5);
    GL.ground(true, co.x, 1.3, co.y, T.core.gunRange, 1, 0.01, hex('#ffd27a'), 0.18);
  }
  function drawPickups(g, M) {
    var t = W3.t, i;
    for (i = 0; i < g.shards.length; i++) {
      var s = g.shards[i];
      if (!s.on || !W3.inView(s.x, s.y, 10)) continue;
      if (!s.mag && !s.tower && s.life < T.shard.blink && Math.sin(t * 22) < 0) continue;
      var sc = s.val > 1 ? 1.5 : 1;
      GL.put(M.coin, s.x, 5 + Math.sin(t * 5 + i) * 1.5, s.y, t * 4 + i, sc, sc, sc, 1.57, 1, 1, 1, 0);
    }
    for (i = 0; i < g.orbs.length; i++) {
      var o = g.orbs[i];
      if (!o.on || o.dead > 0 || !W3.inView(o.x, o.y, 10)) continue;
      var y = 10 + Math.sin(t * 3 + o.bob) * 3, big = o.r > 5 ? 1.5 : 1;
      GL.put(M.crystal, o.x, y, o.y, t * 2 + o.bob, big, big, big, 0);
      GL.glow(o.x, y, o.y, 12 * big, hex('#7dffc0'), 0.55);
      GL.ground(true, o.x, 0.8, o.y, 10 * big, 0, 0, hex('#7dffc0'), 0.25);
    }
    for (i = 0; i < g.heals.length; i++) {
      var h = g.heals[i];
      if (!h.on) continue;
      GL.glow(h.x, 12 + Math.sin(t * 6 + i) * 2, h.y, 10, hex('#ff5a6a'), 0.9);
      GL.glow(h.x, 12, h.y, 4, WHITE, 0.9);
    }
    for (i = 0; i < g.mines.length; i++) {
      var m = g.mines[i];
      if (!m.on || !W3.inView(m.x, m.y, 60)) continue;
      var armed = m.arm <= 0;
      GL.put(M.stone, m.x, 0, m.y, i, 1, 1, 1, 0);
      GL.ground(true, m.x, 1, m.y, 12, 1, 0.25, hex('#ff7a4a'), armed ? 0.6 + 0.3 * Math.sin(t * 8 + i) : 0.25);
      if (armed) GL.ground(true, m.x, 0.9, m.y, m.rad, 1, 0.02, hex('#ff7a4a'), 0.2);
    }
  }

  // ---------- 特效：子弹、敌方弹、预警、爆炸、光效、粒子、夜晚灯光 ----------
  var colCache = {};
  function C(h) { return colCache[h] || (colCache[h] = hex(h)); }
  function drawFx(g, env) {
    var t = W3.t, i, k;
    // 夜晚灯光
    if (env.lamp > 0.05) {
      for (i = 0; i < W3.lamps.length; i++) {
        var L = W3.lamps[i];
        if (!W3.inView(L.x, L.z, 80)) continue;
        var fl = 0.9 + 0.1 * Math.sin(t * 7 + i);
        GL.glow(L.x, L.y, L.z, 12 * L.s * fl, C('#ffcf6b'), 0.7 * env.lamp);
        GL.ground(true, L.x, 0.7, L.z, 70 * L.s, 0, 0, C('#ffb347'), 0.25 * env.lamp * fl);
      }
    }
    // 刷怪预警
    for (i = 0; i < g.marks.length; i++) {
      var mk = g.marks[i];
      if (!mk.on || !W3.inView(mk.x, mk.y, 40)) continue;
      k = 1 - Math.max(0, mk.t) / T.spawn.telegraph;
      var elite = RW.ENEMIES[mk.type].elite, rr = (elite ? 34 : 14) * (1.6 - 0.6 * k);
      GL.ground(true, mk.x, 1, mk.y, rr, 1, 0.18, C('#ff3b5c'), 0.3 + 0.6 * k);
      GL.ground(false, mk.x, 0.9, mk.y, rr * 0.8, 2, 0.2, C('#3a0010'), 0.25 * k);
      if (elite) GL.glow(mk.x, 10, mk.y, 30 * k, C('#ff3b5c'), 0.4 * k);
    }
    // 敌人预警
    for (i = 0; i < g.enemies.length; i++) {
      var e = g.enemies[i];
      if (!e.on || !W3.inView(e.x, e.y, 300)) continue;
      var d = e.d;
      if (e.type === 'dasher' && e.state === 1) {
        k = 1 - e.st / d.aim; var len = d.dashSpeed * d.dash + 10;
        GL.streak(false, e.x, 1, e.y, e.x + e.dx * len, e.y + e.dy * len, 6 + 10 * k, C('#ff2a5a'), 0.2 + 0.4 * k);
        GL.streak(true, e.x, 1.2, e.y, e.x + e.dx * len, e.y + e.dy * len, 2, WHITE, 0.4 + 0.4 * k);
      } else if (e.type === 'spitter' && e.state === 1) {
        k = 1 - e.st / d.aim;
        var ax = e.dx - e.x, ay = e.dy - e.y, al = Math.sqrt(ax * ax + ay * ay) || 1;
        GL.streak(true, e.x, 1, e.y, e.x + ax / al * 520, e.y + ay / al * 520, 2 + 3 * k, C('#ffe066'), 0.2 + 0.5 * k);
      } else if (e.type === 'bomber' && e.state === 1) {
        k = 1 - e.st / d.fuse;
        GL.ground(false, e.x, 0.9, e.y, d.blast, 2, 0.05, C('#ff3a10'), 0.12 + 0.2 * k);
        GL.ground(true, e.x, 1, e.y, d.blast, 1, 0.06, C('#ff8a3a'), 0.5 + 0.5 * Math.abs(Math.sin(t * 20 * (0.5 + k))));
      } else if (e.type === 'shielder' && e.lkN > 0) {
        for (var q = 0; q < e.lkN; q++) { var o = g.enemies[e.lk[q]]; if (o.on) GL.beam3(true, e.x, 22, e.y, o.x, o.r, o.y, 2, C('#6fc3ff'), 0.6); }
      } else if (e.type === 'boss' && e.state === 1) {
        k = 1 - e.st / d.slam.tele[e.enraged ? 1 : 0];
        GL.ground(false, e.ax, 0.9, e.ay, d.slam.r, 2, 0.05, C('#ff1a3a'), 0.15 + 0.3 * k);
        GL.ground(true, e.ax, 1, e.ay, d.slam.r, 1, 0.05, C('#ff4a4a'), 0.9);
        GL.ground(true, e.ax, 1.1, e.ay, Math.max(3, d.slam.r * (1 - k)), 1, 0.08, WHITE, 0.9);
      } else if (e.type === 'boss' && e.state === 3) {
        k = 1 - e.st / d.charge.aim; var L2 = d.charge.speed * d.charge.time;
        GL.streak(false, e.x, 0.9, e.y, e.x + e.dx * L2, e.y + e.dy * L2, e.r * (0.5 + 0.6 * k), C('#ff1a3a'), 0.3 + 0.3 * k);
      }
    }
    // 子弹
    for (i = 0; i < g.bullets.length; i++) {
      var b = g.bullets[i];
      if (!b.on || !W3.inView(b.x, b.y, 20)) continue;
      var bc = C(b.color);
      GL.streak(true, b.x - b.vx * 0.05, 14, b.y - b.vy * 0.05, b.x, b.y, b.r * 2.2, bc, 0.9);
      GL.glow(b.x, 14, b.y, b.r * 3.5, bc, 0.8);
    }
    for (i = 0; i < g.missiles.length; i++) {
      var m = g.missiles[i];
      if (!m.on) continue;
      GL.streak(true, m.x - m.vx * 0.08, 16, m.y - m.vy * 0.08, m.x, m.y, 4, C(m.color), 0.9);
      GL.glow(m.x, 16, m.y, 9, C(m.color), 0.9);
    }
    for (i = 0; i < g.ebullets.length; i++) {
      var eb = g.ebullets[i];
      if (!eb.on || !W3.inView(eb.x, eb.y, 20)) continue;
      if (eb.kind === 'bolt') { GL.streak(true, eb.x - eb.vx * 0.05, 14, eb.y - eb.vy * 0.05, eb.x, eb.y, 3, C('#ffe066'), 1); GL.glow(eb.x, 14, eb.y, 7, C('#fff3a0'), 0.9); }
      else { GL.glow(eb.x, 12, eb.y, eb.r * 3.2, C('#ff3b8c'), 0.95); GL.glow(eb.x, 12, eb.y, eb.r * 1.2, WHITE, 0.95); GL.ground(false, eb.x, 0.7, eb.y, eb.r * 1.4, 2, 0.3, C('#3a0020'), 0.25); }
    }
    // 技能持续效果
    var sk = g.skill;
    if (sk && sk.wellT > 0) {
      var wk = sk.wellT / sk.d.pull;
      GL.ground(false, sk.wx, 0.8, sk.wy, sk.d.radius, 2, 0.1, C('#12021f'), 0.35);
      for (var s3 = 0; s3 < 3; s3++) GL.ground(true, sk.wx, 1 + s3 * 0.1, sk.wy, sk.d.radius * (0.35 + 0.25 * s3) * (0.6 + 0.4 * wk), 1, 0.08, C('#c07bff'), 0.7);
      GL.glow(sk.wx, 18, sk.wy, 30 + (1 - wk) * 20, C('#c07bff'), 0.8);
      GL.glow(sk.wx, 18, sk.wy, 10, C('#1a0030'), 0.9);
    }
    if (sk && sk.veilT > 0) GL.ground(true, g.player.x, 1, g.player.y, sk.d.radius, 1, 0.02, C('#a8d4ff'), 0.3 + 0.15 * Math.sin(t * 20));
    // 通用特效
    for (i = 0; i < g.fx.length; i++) {
      var f = g.fx[i];
      if (!f.on) continue;
      k = 1 - f.life / f.max;
      var fc = C(f.color);
      switch (f.kind) {
        case 'ring':
          if (!W3.inView(f.x, f.y, f.r2)) break;
          var rad = Math.max(1, f.r + (f.r2 - f.r) * (1 - (1 - k) * (1 - k)));
          GL.ground(true, f.x, 1.5, f.y, rad, 1, Math.min(0.5, f.w * 3 / rad), fc, 1 - k);
          if (f.r2 > 60) GL.ground(true, f.x, 1.4, f.y, rad, 0, 0, fc, 0.2 * (1 - k));
          break;
        case 'flash':
          GL.glow(f.x, 12, f.y, f.r * 1.4, fc, (1 - k) * 0.9);
          GL.ground(true, f.x, 1, f.y, f.r * 1.2, 0, 0, fc, (1 - k) * 0.6);
          break;
        case 'muzzle':
          GL.glow(f.x, 14, f.y, 8 * f.r2, fc, 1 - k);
          break;
        case 'beam':
          GL.streak(true, f.x, 12, f.y, f.x2, f.y2, f.w * 3 * (1 - k * 0.5), fc, 0.5 * (1 - k));
          GL.streak(true, f.x, 12.5, f.y, f.x2, f.y2, f.w * 1.2 * (1 - k * 0.5), fc, 1 - k);
          GL.streak(true, f.x, 13, f.y, f.x2, f.y2, f.w * 0.4 * (1 - k), WHITE, 1 - k);
          GL.streak(true, f.x, 1, f.y, f.x2, f.y2, f.w * 2, fc, 0.4 * (1 - k));
          break;
        case 'arc':
          for (var j = 0; j + 3 < f.n; j += 2) {
            var x0 = f.pts[j], z0 = f.pts[j + 1], x1 = f.pts[j + 2], z1 = f.pts[j + 3], px = x0, pz = z0, py = 14;
            for (var sg = 1; sg <= 4; sg++) {
              var qq = sg / 4, nx = x0 + (x1 - x0) * qq + (sg < 4 ? (Math.random() - 0.5) * 16 : 0), nz = z0 + (z1 - z0) * qq + (sg < 4 ? (Math.random() - 0.5) * 16 : 0), ny = 14 + (sg < 4 ? (Math.random() - 0.5) * 10 : 0);
              GL.beam3(true, px, py, pz, nx, ny, nz, 3.5, fc, 1 - k);
              GL.beam3(true, px, py, pz, nx, ny, nz, 1.2, WHITE, 1 - k);
              px = nx; pz = nz; py = ny;
            }
          }
          break;
        case 'bolt':
          var bx = f.x, bz = f.y, by = 0, top = 320;
          var lx = bx, ly = top, lz = bz - 60;
          for (var s4 = 1; s4 <= 6; s4++) {
            var q2 = s4 / 6, nx2 = bx + (s4 < 6 ? (Math.random() - 0.5) * 30 : 0), ny2 = top * (1 - q2), nz2 = bz - 60 * (1 - q2) + (s4 < 6 ? (Math.random() - 0.5) * 20 : 0);
            GL.beam3(true, lx, ly, lz, nx2, ny2, nz2, 7, fc, 1 - k);
            GL.beam3(true, lx, ly, lz, nx2, ny2, nz2, 2.5, WHITE, 1 - k);
            lx = nx2; ly = ny2; lz = nz2;
          }
          GL.glow(bx, 10, bz, 40, fc, 1 - k);
          break;
        case 'spokes':
          for (var sp2 = 0; sp2 < 16; sp2++) {
            var a2 = sp2 * TAU / 16, r0 = f.r * (0.2 + 0.7 * k), r1 = f.r * (0.4 + 0.8 * k);
            GL.streak(true, f.x + Math.cos(a2) * r0, 2, f.y + Math.sin(a2) * r0, f.x + Math.cos(a2) * r1, f.y + Math.sin(a2) * r1, 5, fc, 1 - k);
          }
          GL.glow(f.x, 20, f.y, f.r * 0.8 * (1 - k * 0.5), fc, 0.6 * (1 - k));
          break;
        case 'gulp':
          GL.ground(true, f.x, 1.5, f.y, f.r * (2.2 - k), 1, 0.2, fc, 1 - k);
          break;
        case 'slash':
          GL.glow(f.x, 10, f.y, 8, fc, 1 - k);
          break;
      }
    }
    // 粒子
    for (i = 0; i < g.parts.length; i++) {
      var p = g.parts[i];
      if (!p.on || !W3.inView(p.x, p.y, 10)) continue;
      var pk = p.life / p.max, py2 = 6 + (1 - pk) * 18 * (p.glow ? 1 : 0.4);
      GL.glow(p.x, py2, p.y, p.size * (p.glow ? 2.6 : 1.6), C(p.color), Math.min(1, pk * 1.6), p.glow ? 0 : 2);
    }
    // 焦痕
    for (i = 0; i < g.decals.length; i++) {
      var dc = g.decals[i];
      if (!dc.on || !W3.inView(dc.x, dc.y, dc.r)) continue;
      GL.ground(false, dc.x, 0.5, dc.y, dc.r * 1.2, 2, 0.4, C('#140a06'), 0.45 * Math.min(1, dc.life / dc.max * 1.5));
    }
  }

  RW.W3 = W3;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
