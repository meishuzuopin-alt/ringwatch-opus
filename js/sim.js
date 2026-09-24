// 环带值守 · 核心模拟（无渲染依赖，可在 Node 里无头运行做数值测试）
// 世界坐标：整块甲板 TUNE.WORLD，活动范围 TUNE.ARENA；镜头由渲染层处理。
(function (root) {
  var RW = root.RW;
  var T = RW.TUNE;
  // ---------- 地图：读 js/map.js，生成阻挡网格、敌人入口、圣火位置 ----------
  var MAP = RW.MAP, MCELL = MAP.cell, MC = MAP.rows[0].length, MR = MAP.rows.length;
  var GRID = new Uint8Array(MC * MR), GATES = { north: [], side: [], south: [] }, CORE_CELL = 0;
  (function () {
    for (var r = 0; r < MR; r++) for (var c = 0; c < MC; c++) {
      var ch = MAP.rows[r][c], i = r * MC + c;
      GRID[i] = MAP.blocked.indexOf(ch) >= 0 ? 1 : 0;
      if (ch === 'S') (r < MR / 3 ? GATES.north : (r > MR * 2 / 3 ? GATES.south : GATES.side)).push({ x: c * MCELL + MCELL / 2, y: r * MCELL + MCELL / 2 });
      if (ch === 'C') { CORE_CELL = i; T.core.x = c * MCELL + MCELL / 2; T.core.y = r * MCELL + MCELL / 2; }
    }
    T.WORLD.w = MC * MCELL; T.WORLD.h = MR * MCELL;
    T.ARENA.x = 0; T.ARENA.y = 0; T.ARENA.w = T.WORLD.w; T.ARENA.h = T.WORLD.h;
    RW.GRID = { grid: GRID, cols: MC, rows: MR, cell: MCELL, gates: GATES };
  })();
  var A = T.ARENA, P = T.player, DASH = T.dash;
  var AX0 = A.x, AY0 = A.y, AX1 = A.x + A.w, AY1 = A.y + A.h;
  var DT = T.DT, TAU = Math.PI * 2;
  var KNOCK_DECAY = Math.exp(-10 * DT), PUSH_DECAY = Math.exp(-9 * DT);

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- 对象池 ----------
  function makePool(n, make) {
    var arr = new Array(n);
    for (var i = 0; i < n; i++) { var o = make(); o.on = false; o.idx = i; arr[i] = o; }
    arr.cursor = 0;
    return arr;
  }
  function take(pool, force) {
    var n = pool.length;
    for (var k = 0; k < n; k++) {
      var i = (pool.cursor + k) % n;
      if (!pool[i].on) { pool.cursor = (i + 1) % n; pool[i].on = true; return pool[i]; }
    }
    if (force) { var j = pool.cursor; pool.cursor = (j + 1) % n; pool[j].on = true; return pool[j]; }
    return null;
  }
  function clearPool(pool) { for (var i = 0; i < pool.length; i++) pool[i].on = false; }
  function countOn(pool) { var c = 0; for (var i = 0; i < pool.length; i++) if (pool[i].on) c++; return c; }
  function clampX(x, m) { return Math.min(AX1 - m, Math.max(AX0 + m, x)); }
  function clampY(y, m) { return Math.min(AY1 - m, Math.max(AY0 + m, y)); }
  function cellIdx(x, y) {
    var c = (x / MCELL) | 0, r = (y / MCELL) | 0;
    if (c < 0 || r < 0 || c >= MC || r >= MR) return -1;
    return r * MC + c;
  }
  function walkable(x, y) { var i = cellIdx(x, y); return i >= 0 && GRID[i] === 0; }
  function mapChar(x, y) { var c = (x / MCELL) | 0, r = (y / MCELL) | 0; return (r >= 0 && r < MR && c >= 0 && c < MC) ? MAP.rows[r][c] : '#'; }
  // 圆与阻挡格碰撞：返回是否撞到
  function collideGrid(o, r) {
    var hit = false;
    var c0 = Math.max(0, ((o.x - r) / MCELL) | 0), c1 = Math.min(MC - 1, ((o.x + r) / MCELL) | 0);
    var r0 = Math.max(0, ((o.y - r) / MCELL) | 0), r1 = Math.min(MR - 1, ((o.y + r) / MCELL) | 0);
    for (var cy = r0; cy <= r1; cy++) for (var cx = c0; cx <= c1; cx++) {
      if (GRID[cy * MC + cx] !== 1) continue;
      var bx0 = cx * MCELL, by0 = cy * MCELL, bx1 = bx0 + MCELL, by1 = by0 + MCELL;
      var qx = o.x < bx0 ? bx0 : (o.x > bx1 ? bx1 : o.x), qy = o.y < by0 ? by0 : (o.y > by1 ? by1 : o.y);
      var dx = o.x - qx, dy = o.y - qy, d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      hit = true;
      if (d2 > 1e-6) { var d = Math.sqrt(d2), push = r - d; o.x += dx / d * push; o.y += dy / d * push; }
      else {
        // 圆心在格子里：沿最短方向推出去
        var l = o.x - bx0, rr = bx1 - o.x, t = o.y - by0, b = by1 - o.y, m = Math.min(l, rr, t, b);
        if (m === l) o.x = bx0 - r; else if (m === rr) o.x = bx1 + r; else if (m === t) o.y = by0 - r; else o.y = by1 + r;
      }
    }
    return hit;
  }
  // 流场：4 邻接 BFS 距离
  var DIST_CORE = new Int16Array(MC * MR), DIST_PLAYER = new Int16Array(MC * MR), BFSQ = new Int16Array(MC * MR);
  function bfs(dist, start) {
    dist.fill(32767);
    if (start < 0) return;
    var h = 0, t = 0;
    dist[start] = 0; BFSQ[t++] = start;
    while (h < t) {
      var i = BFSQ[h++], c = i % MC, r = (i / MC) | 0, nd = dist[i] + 1;
      if (c > 0 && GRID[i - 1] === 0 && dist[i - 1] > nd) { dist[i - 1] = nd; BFSQ[t++] = i - 1; }
      if (c < MC - 1 && GRID[i + 1] === 0 && dist[i + 1] > nd) { dist[i + 1] = nd; BFSQ[t++] = i + 1; }
      if (r > 0 && GRID[i - MC] === 0 && dist[i - MC] > nd) { dist[i - MC] = nd; BFSQ[t++] = i - MC; }
      if (r < MR - 1 && GRID[i + MC] === 0 && dist[i + MC] > nd) { dist[i + MC] = nd; BFSQ[t++] = i + MC; }
    }
  }
  bfs(DIST_CORE, CORE_CELL);
  var NAV = { x: 0, y: 0, ok: false };
  // 沿流场下一步的方向（写入 NAV），找不到更近的格子就 ok=false
  function navStep(x, y, dist) {
    var i = cellIdx(x, y);
    NAV.ok = false;
    if (i < 0) return;
    var c = i % MC, r = (i / MC) | 0, best = dist[i], bi = -1;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      var nc = c + dx, nr = r + dy;
      if (nc < 0 || nr < 0 || nc >= MC || nr >= MR) continue;
      var ni = nr * MC + nc;
      if (GRID[ni] !== 0) continue;
      if (dx && dy && (GRID[r * MC + nc] !== 0 || GRID[nr * MC + c] !== 0)) continue;
      var dd = dist[ni] + (dx && dy ? 0.4 : 0);
      if (dd < best) { best = dd; bi = ni; }
    }
    if (bi < 0) return;
    var tx = (bi % MC) * MCELL + MCELL / 2 - x, ty = ((bi / MC) | 0) * MCELL + MCELL / 2 - y, tl = Math.sqrt(tx * tx + ty * ty) || 1;
    NAV.x = tx / tl; NAV.y = ty / tl; NAV.ok = true;
  }
  RW.NAV = { collide: collideGrid, walkable: walkable, mapChar: mapChar, distCore: DIST_CORE, distPlayer: DIST_PLAYER };

  // ---------- 网格（敌人空间划分，查询全部用距离平方） ----------
  var CELL = 40, GC = Math.ceil(A.w / CELL), GR = Math.ceil(A.h / CELL);

  function src(name, color, crit) { return { name: name, color: color, dmg: 0, kills: 0, crit: !!crit }; }

  function Game(opts) {
    opts = opts || {};
    this.rand = mulberry(opts.seed != null ? opts.seed : ((Date.now() * 9301 + 49297) >>> 0));
    this.events = [];
    this.enemies = makePool(T.MAX_ENEMIES, function () {
      return { x: 0, y: 0, vx: 0, vy: 0, kvx: 0, kvy: 0, r: 8, hp: 1, maxHp: 1, dmg: 1, armor: 0, speed: 1, knockRes: 1,
        flash: 0, spawnT: 0, state: 0, st: 0, cd: 0, dx: 0, dy: 0, tx: 0, ty: 0, slowT: 0, slowAmt: 0, bhit: 0, chewT: 0,
        tk: 0, tref: null, fireT: 0, charging: false, elite: false, seq: 0, wob: 0, type: 'mite', d: null,
        shieldT: 0, dashHit: -1, lk: [-1, -1, -1, -1], lkN: 0, goalCore: false, ax: 0, ay: 0, enraged: false, atk: 0, sumT: 0 };
    });
    this.bullets = makePool(260, function () { return { x: 0, y: 0, vx: 0, vy: 0, life: 0, dmg: 0, knock: 0, r: 3, src: null, pierce: 0, last: -1, color: '#fff' }; });
    this.ebullets = makePool(180, function () { return { x: 0, y: 0, vx: 0, vy: 0, life: 0, dmg: 0, r: 5, kind: 'orb', src: '' }; });
    this.shards = makePool(220, function () { return { x: 0, y: 0, vx: 0, vy: 0, val: 1, life: 0, mag: false, recall: false, tower: null, sp: 0 }; });
    this.mines = makePool(24, function () { return { x: 0, y: 0, arm: 0, life: 0, w: null, dmg: 0, rad: 0, knock: 0 }; });
    this.towers = makePool(T.build.max, function () { return { id: '', d: null, x: 0, y: 0, hp: 1, maxHp: 1, cd: 0, build: 0, ang: -Math.PI / 2, pulse: 0, flash: 0, spawnT: 0, soldiers: 0 }; });
    this.soldiers = makePool(28, function () { return { x: 0, y: 0, vx: 0, vy: 0, hp: 1, maxHp: 1, r: 6, cd: 0, home: null, slot: 0, flash: 0, ang: 0 }; });
    this.orbs = makePool(T.biomass.count, function () { return { x: 0, y: 0, dead: 0, r: 4, bob: 0 }; });
    this.missiles = makePool(80, function () { return { x: 0, y: 0, vx: 0, vy: 0, life: 0, dmg: 0, tgt: null, tseq: 0, color: '#fff' }; });
    this.blasts = makePool(24, function () { return { x: 0, y: 0, rad: 0, de: 0, dp: 0, src: null, color: '#fff', who: '' }; });
    this.parts = makePool(520, function () { return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, color: '#fff', size: 2, drag: 0.9, glow: false }; });
    this.nums = makePool(80, function () { return { x: 0, y: 0, vy: 0, life: 0, max: 1, text: '', kind: 'hit' }; });
    this.marks = makePool(60, function () { return { x: 0, y: 0, t: 0, type: 'mite', goal: false }; });
    this.fx = makePool(72, function () { return { kind: 'ring', x: 0, y: 0, x2: 0, y2: 0, life: 0, max: 1, color: '#fff', r: 10, r2: 20, w: 2, n: 0, pts: new Float32Array(40) }; });
    this.corpses = makePool(70, function () { return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rot: 0, rv: 0, tilt: 0, tv: 0, type: 'mite', r: 8, life: 0, max: 1, color: '#fff' }; });
    this.heals = makePool(20, function () { return { x: 0, y: 0, life: 0, sp: 0 }; });
    this.decals = makePool(40, function () { return { x: 0, y: 0, r: 10, life: 0, max: 1, color: '#000' }; });
    this.gridHead = new Int16Array(GC * GR);
    this.gridNext = new Int16Array(T.MAX_ENEMIES);
    this.gridHead.fill(-1); this.gridNext.fill(-1);   // 未建网格前的查询必须是空表，否则 0→0 成环
    this.nbuf = new Int16Array(T.MAX_ENEMIES);
    this.chainSeq = new Int32Array(24);
    this.mode = 'title';
    this.best = 0;
    this.clock = 0;
    this.seq = 0;
    this.player = { x: 0, y: 0, vx: 0, vy: 0, pvx: 0, pvy: 0, hp: 30, maxHp: 30, inv: 0, face: -Math.PI / 2, r: P.radius, moving: 0,
      mass: 0, stage: 0, dashT: 0, dashCd: 0, dx: 0, dy: -1, dashId: 0, trail: new Float32Array(24), trailN: 0, trailT: 0 };
    this.resetRun();
  }
  var G = Game.prototype;

  G.R = function () { return this.rand(); };
  G.RR = function (a, b) { return a + (b - a) * this.rand(); };
  G.emit = function (type, a, b) { this.events.push({ type: type, a: a, b: b }); };

  // ================= 局 =================
  G.resetRun = function () {
    var p = this.player, CO = T.core;
    this.core = { x: CO.x, y: CO.y, r: CO.r, hp: CO.hp, maxHp: CO.hp, flash: 0, alert: 0, cd: 0, ang: 0 };
    this.coreSrc = src('圣火之光', '#ffd27a', false);
    this.boss = null; this.bossAlert = 0; this.deathCause = '';
    p.x = CO.x; p.y = CO.y + 80; p.vx = p.vy = p.pvx = p.pvy = 0; p.inv = 0;
    p.mass = 0; p.stage = 0; p.dashT = 0; p.dashCd = 0; p.trailN = 0; p.trailT = 0;
    this.weapons = [];
    this.mods = {};
    this.skill = null;
    this.tech = { sentry: 1, pylon: 1, siphon: 1, barracks: 1 };
    this.towerStats = {};
    for (var id in RW.TOWERS) this.towerStats[id] = src(RW.TOWERS[id].name, RW.TOWERS[id].color, false);
    this.dashSrc = src('冲刺', '#5ef2ff', false);
    this.eatSrc = src('践踏', '#9dff7a', false);
    this.envSrc = src('爆囊连锁', '#ff5a1f', false);
    this.thornSrc = src('荆棘反伤', '#9fc4ff', false);
    this.shardCount = 0; this.shardFrac = 0; this.totalShards = 0; this.built = 0;
    this.mom = 0; this.momT = 9; this.momTier = 0; this.focusT = 0; this.focus = 0;
    this.kills = 0; this.wave = 0; this.reviveUsed = false; this.streak = 0; this.streakT = 0; this.bestStreak = 0;
    this.lastHits = [];
    this.lsT = 0; this.runHeals = 0;
    p.hurtT = 0; p.castT = 0;
    this.combo = 0; this.comboT = 0;
    this.shake = 0; this.freeze = 0; this.lastStop = -9; this.flash = 0;
    this.banner = 0; this.enemyCount = 0; this.evolveT = 0;
    this.shop = null; this.result = null;
    this.eliteAlert = 0; this.eliteAlertName = '';
    var pools = [this.corpses, this.heals, this.enemies, this.bullets, this.ebullets, this.shards, this.mines, this.towers, this.soldiers, this.orbs, this.missiles, this.blasts, this.parts, this.nums, this.marks, this.fx, this.decals];
    for (var i = 0; i < pools.length; i++) clearPool(pools[i]);
    this.seedOrbs();
    this.recalc();
    p.hp = p.maxHp;
  };

  G.seedOrbs = function () {
    for (var i = 0; i < this.orbs.length; i++) {
      var o = this.orbs[i];
      o.on = true; o.dead = 0; o.bob = this.R() * TAU;
      this.placeOrb(o);
    }
  };
  G.placeOrb = function (o) {
    var p = this.player;
    for (var k = 0; k < 10; k++) {
      o.x = this.RR(AX0 + 30, AX1 - 30); o.y = this.RR(AY0 + 30, AY1 - 30);
      if (!walkable(o.x, o.y) || !walkable(o.x + 8, o.y) || !walkable(o.x - 8, o.y)) continue;
      var dx = o.x - p.x, dy = o.y - p.y;
      if (dx * dx + dy * dy > 90 * 90) break;
    }
    o.r = this.R() < 0.2 ? 6 : 4;
  };

  G.rollStartOffers = function () {
    this.offers = RW.CLASS_ORDER.slice();   // 全部英雄都列出；未解锁的由界面挡住
    this.mode = 'pick';
    return this.offers;
  };

  G.startRun = function (classId) {
    var cls = RW.CLASSES[classId] || RW.CLASSES.mage;
    this.resetRun();
    this.cls = cls; this.clsId = RW.CLASSES[classId] ? classId : 'mage';
    this.recalc(); this.player.hp = this.player.maxHp;
    this.runHeals = 0;
    this.addWeapon(cls.weapon);
    this.setSkill(cls.skill);
    this.shardCount = 16;   // 开局给一点钱：第一波就能在脚下建一座塔
    this.startWave(1);
  };

  G.addWeapon = function (id) {
    var d = RW.WEAPONS[id];
    this.weapons.push({ id: id, d: d, name: d.name, color: d.color, crit: true, tier: 1, cd: 0.25, spent: d.cost, dmg: 0, kills: 0, ang: -Math.PI / 2, charge: 0, phase: 0, kick: 0, mineCount: 0 });
  };
  G.findWeapon = function (id) {
    for (var i = 0; i < this.weapons.length; i++) if (this.weapons[i].id === id) return this.weapons[i];
    return null;
  };
  G.setSkill = function (id) {
    var d = RW.SKILLS[id];
    if (this.skill && this.skill.id === id) { this.skill.tier = Math.min(3, this.skill.tier + 1); return; }
    var old = this.skill;
    this.skill = { id: id, d: d, name: d.name, color: d.color, crit: true, tier: 1, cd: 0, dmg: old ? 0 : 0, kills: 0, veilT: 0, veilAcc: 0, wellT: 0, wx: 0, wy: 0 };
    if (old) { this.retiredSkills = this.retiredSkills || []; this.retiredSkills.push(old); }
  };

  G.recalc = function () {
    var s = { dmg: 1, rate: 1, speed: 1, range: 1, crit: P.crit, maxHp: this.cls ? this.cls.hp : P.hp, armor: 0, regen: 0, pickup: 1, harvest: 1, knock: 1, extra: 0, cdr: 1, dmgTaken: 1, bounty: 0,
      lifesteal: 0, dodge: 0, critMul: P.critMul, luck: 0, towerDmg: 1, blastR: 1, thorns: 0, interest: 0, healOrb: 1, healCore: 0, coreRegen: 0,
      buildCost: 1, rage: 0, shopPrice: 1, freeReroll: 0, dashCd: 1 };
    var k;
    if (this.cls && this.cls.fx) for (k in this.cls.fx) s[k] += this.cls.fx[k];
    for (var id in this.mods) {
      var n = this.mods[id], fx = RW.MODS[id].fx;
      for (k in fx) s[k] += fx[k] * n;
    }
    var evo = RW.EVO[this.player.stage];
    s.armor += evo.armor; s.maxHp += evo.hp; s.dmg += evo.dmg;
    s.dmg = Math.max(0.3, s.dmg); s.rate = Math.max(0.4, s.rate); s.speed = Math.max(0.55, s.speed) * evo.speed;
    s.range = Math.max(0.5, s.range); s.maxHp = Math.max(6, s.maxHp); s.pickup = Math.max(0.5, s.pickup);
    s.crit = Math.min(0.9, Math.max(0, s.crit)); s.knock = Math.max(0.2, s.knock); s.cdr = Math.max(0.5, s.cdr);
    s.dodge = Math.min(T.dodgeCap, Math.max(0, s.dodge)); s.lifesteal = Math.max(0, s.lifesteal); s.harvest = Math.max(0.2, s.harvest);
    s.buildCost = Math.max(0.4, s.buildCost); s.shopPrice = Math.max(0.5, s.shopPrice); s.dashCd = Math.max(0.4, s.dashCd);
    s.towerDmg = Math.max(0.3, s.towerDmg); s.blastR = Math.max(0.5, s.blastR);
    s.takenMul = s.dmgTaken * Math.min(1.6, Math.max(0.4, 1 - s.armor * T.armorPerPoint));
    this.st = s;
    var p = this.player;
    p.maxHp = s.maxHp; p.r = evo.r;
    if (p.hp > p.maxHp) p.hp = p.maxHp;
  };

  G.hpMul = function (w) {
    var g = RW.GROWTH, k = w - 1;
    return 1 + g.hpA * k + g.hpB * k * k + (w > 8 ? g.hpC9 * (w - 8) * (w - 8) : 0);
  };

  G.startWave = function (n) {
    var p = this.player;
    this.wave = n;
    this.def = RW.waveDef(n);
    this.wt = 0; this.dur = this.def.dur; this.spawnAcc = 0.6;
    this.eliteQ = [];
    for (var i = 0; i < this.def.elites.length; i++) this.eliteQ.push({ t: this.def.elites[i][0] * this.dur, type: this.def.elites[i][1] });
    if (this.st.bounty > 0 && n >= 3) this.eliteQ.push({ t: this.dur * 0.55, type: n % 2 ? 'warden' : 'brood' });
    this.eliteQ.sort(function (a, b) { return a.t - b.t; });
    this.eliteIdx = 0;
    var BW = RW.BOSS_WAVES;
    this.bossAt = n % BW.every === 0 ? this.dur * BW.at : -1;
    this.boss = null;
    var co = this.core;
    co.hp = Math.min(co.maxHp, co.hp + co.maxHp * T.core.waveHeal);
    p.vx = p.vy = p.pvx = p.pvy = 0; p.dashT = 0; p.dashCd = 0;
    p.hp = p.maxHp; p.inv = 0.8;
    for (var t = 0; t < this.towers.length; t++) { var tw = this.towers[t]; if (tw.on) { tw.hp = tw.maxHp; tw.cd = 0.5; } }
    for (var s = 0; s < this.soldiers.length; s++) { var so = this.soldiers[s]; if (so.on) so.hp = so.maxHp; }
    for (var w = 0; w < this.weapons.length; w++) { var wp = this.weapons[w]; wp.cd = 0.3; wp.charge = 0; wp.mineCount = 0; }
    if (this.skill) { this.skill.cd = Math.min(this.skill.cd, 1.5); this.skill.veilT = 0; this.skill.wellT = 0; }
    clearPool(this.enemies); clearPool(this.bullets); clearPool(this.ebullets); clearPool(this.shards); clearPool(this.mines);
    clearPool(this.marks); clearPool(this.missiles); clearPool(this.blasts);
    this.enemyCount = 0;
    this.mode = 'battle';
    this.banner = 1.6;
    this.emit('waveStart', n);
  };

  // ================= 主步进（固定 1/60） =================
  G.update = function (inp) {
    this.clock += DT;
    var m = this.mode;
    if (m !== 'battle' && m !== 'clear' && m !== 'down') { this.updateFx(); return; }
    if (this.freeze > 0) { this.freeze--; return; }
    this.shake = Math.max(0, this.shake - DT * 2.6);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - DT * 3);
    if (this.banner > 0) this.banner -= DT;
    if (this.evolveT > 0) this.evolveT -= DT;
    if (this.eliteAlert > 0) this.eliteAlert -= DT;
    if (this.bossAlert > 0) this.bossAlert -= DT;
    if (this.streakT > 0) { this.streakT -= DT; if (this.streakT <= 0) this.streak = 0; }
    if (this.core.flash > 0) this.core.flash -= DT;
    if (this.core.alert > 0) this.core.alert -= DT;
    if (this.comboT > 0) { this.comboT -= DT; if (this.comboT <= 0) this.combo = 0; }
    this.updateMomentum();
    if (m === 'down') {
      this.updateFx();
      this.downT -= DT;
      if (this.downT <= 0) this.afterDeath();
      return;
    }
    inp = inp || { mx: 0, my: 0 };
    if (m === 'battle') this.wt += DT;
    if (m === 'battle' && inp.dash) this.tryDash(inp);
    if (m === 'battle' && inp.skill) this.castSkill();
    inp.dash = false; inp.skill = false;
    this.movePlayer(inp);
    var p = this.player;
    if (p.inv > 0) p.inv -= DT;
    if (p.dashCd > 0) p.dashCd -= DT;
    if (m === 'battle' && this.st.regen > 0) p.hp = Math.min(p.maxHp, p.hp + this.st.regen * DT);
    if (m === 'battle' && this.st.coreRegen > 0) this.core.hp = Math.min(this.core.maxHp, this.core.hp + this.st.coreRegen * DT);
    if (p.hurtT > 0) p.hurtT -= DT;
    if (p.castT > 0) p.castT -= DT;
    if (m === 'battle' && this.wt < this.dur) this.updateSpawner();
    if ((this.navTick = (this.navTick || 0) + 1) % 10 === 0 || this.navTick === 1) bfs(DIST_PLAYER, cellIdx(p.x, p.y));
    this.updateFocus();
    this.updateMarks();
    this.buildGrid();
    if (m === 'battle') { this.updateWeapons(); this.updateSkill(); }
    this.updateTowers();
    this.updateSoldiers();
    this.updateBullets();
    this.updateMissiles();
    this.updateEnemies();
    this.updateEBullets();
    this.updateMines();
    this.processBlasts();
    this.updateOrbs();
    this.updateHeals();
    this.updateCorpses();
    this.updateShards();
    this.updateFx();
    if (this.mode === 'battle' && this.wt >= this.dur) this.clearWave();
    if (this.mode === 'clear') { this.clearT -= DT; if (this.clearT <= 0) this.enterShop(); }
  };

  G.stop = function (frames, force) {
    if (force || this.clock - this.lastStop >= T.hitstop.gap) {
      if (frames > this.freeze) this.freeze = frames;
      this.lastStop = this.clock;
    }
  };

  // ---------- 玩家移动：加速度 + 反向更快 + 松手短滑；冲刺覆盖一切 ----------
  G.movePlayer = function (inp) {
    var p = this.player, s = this.st;
    var ix = inp.mx || 0, iy = inp.my || 0;
    var m = Math.sqrt(ix * ix + iy * iy);
    if (m > 1) { ix /= m; iy /= m; m = 1; }
    p.moving = m;
    if (m > 0.05) p.face = Math.atan2(iy, ix);
    if (p.trailT > 0) p.trailT -= DT;
    if (p.dashT > 0) {
      p.dashT -= DT;
      p.vx = p.dx * DASH.speed; p.vy = p.dy * DASH.speed;
      this.recordTrail();
      if (p.dashT <= 0) { p.vx *= 0.38; p.vy *= 0.38; }
    } else {
      var max = P.speed * s.speed * (1 + T.momentum.speed[Math.max(0, this.momTier - 1)] * (this.momTier > 0 ? 1 : 0));
      var tx = ix * max, ty = iy * max;
      var dvx = tx - p.vx, dvy = ty - p.vy;
      var dl = Math.sqrt(dvx * dvx + dvy * dvy);
      var acc;
      if (m > 0.05) acc = (p.vx * tx + p.vy * ty < 0) ? P.turnAccel : P.accel;
      else acc = P.friction;
      var step = acc * DT;
      if (dl <= step) { p.vx = tx; p.vy = ty; }
      else { p.vx += dvx / dl * step; p.vy += dvy / dl * step; }
    }
    p.x += (p.vx + p.pvx) * DT; p.y += (p.vy + p.pvy) * DT;
    p.pvx *= PUSH_DECAY; p.pvy *= PUSH_DECAY;
    var r = p.r;
    if (p.x < AX0 + r) { p.x = AX0 + r; if (p.vx < 0) p.vx = 0; p.pvx = 0; }
    if (p.x > AX1 - r) { p.x = AX1 - r; if (p.vx > 0) p.vx = 0; p.pvx = 0; }
    if (p.y < AY0 + r) { p.y = AY0 + r; if (p.vy < 0) p.vy = 0; p.pvy = 0; }
    if (p.y > AY1 - r) { p.y = AY1 - r; if (p.vy > 0) p.vy = 0; p.pvy = 0; }
    this.pushOutOfTowers(p, r);
    this.pushOutOfCore(p, r);
    if (collideGrid(p, r) && p.dashT > 0) p.dashT = Math.min(p.dashT, 0.02);
  };
  G.pushOutOfCore = function (o, r) {
    var co = this.core, dx = o.x - co.x, dy = o.y - co.y, rr = r + co.r, d2 = dx * dx + dy * dy;
    if (d2 < rr * rr) {
      var d = Math.sqrt(d2);
      if (d < 0.01) { dx = 0; dy = 1; d = 1; }
      o.x = co.x + dx / d * rr; o.y = co.y + dy / d * rr;
    }
  };
  G.recordTrail = function () {
    var p = this.player, tr = p.trail;
    for (var i = tr.length - 2; i >= 2; i -= 2) { tr[i] = tr[i - 2]; tr[i + 1] = tr[i - 1]; }
    tr[0] = p.x; tr[1] = p.y;
    p.trailN = Math.min(tr.length / 2, p.trailN + 1);
    p.trailT = 0.3;
  };
  G.tryDash = function (inp) {
    var p = this.player;
    if (p.dashCd > 0 || p.dashT > 0) return false;
    var ix = inp.mx || 0, iy = inp.my || 0, m = Math.sqrt(ix * ix + iy * iy);
    if (m > 0.2) { p.dx = ix / m; p.dy = iy / m; }
    else { p.dx = Math.cos(p.face); p.dy = Math.sin(p.face); }
    p.dashT = DASH.time; p.dashCd = DASH.cd * this.st.cdr * this.st.dashCd;
    p.inv = Math.max(p.inv, DASH.iframes);
    p.dashId++; p.trailN = 0;
    this.recordTrail();
    this.shake = Math.min(1, this.shake + 0.1);
    this.emit('dash');
    return true;
  };

  G.pushOutOfTowers = function (o, r) {
    for (var i = 0; i < this.towers.length; i++) {
      var tw = this.towers[i];
      if (!tw.on) continue;
      var dx = o.x - tw.x, dy = o.y - tw.y, rr = r + tw.d.r;
      var d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        var d = Math.sqrt(d2);
        if (d < 0.01) { dx = 1; dy = 0; d = 1; }
        o.x = tw.x + dx / d * rr; o.y = tw.y + dy / d * rr;
      }
    }
  };

  // ---------- 刷怪：主要刷在你周围一圈（屏幕外沿），少量刷在全甲板 ----------
  G.pickMix = function (mix) {
    var tot = 0, k;
    for (k in mix) tot += mix[k];
    var r = this.R() * tot;
    for (k in mix) { r -= mix[k]; if (r <= 0) return k; }
    return 'mite';
  };
  G.updateSpawner = function () {
    var f = this.wt / this.dur, d = this.def;
    var cut = this.boss && this.boss.on ? RW.BOSS_WAVES.rateCut : 1;
    this.spawnAcc = Math.min(6, this.spawnAcc + (d.r0 + (d.r1 - d.r0) * f) * cut * DT);
    if (this.bossAt >= 0 && this.wt >= this.bossAt) {
      this.bossAt = -1;
      this.placeCluster('boss', 1);
      this.bossAlert = 2.6;
      this.shake = Math.min(1, this.shake + 0.5);
      this.emit('bossWarn');
    }
    var guard = 0;
    while (this.spawnAcc >= 1 && guard++ < 6) {
      if (this.enemyCount + countOn(this.marks) >= T.MAX_ENEMIES) break;
      var type = this.pickMix(d.mix);
      var c = type === 'mite' ? 1 + Math.floor(this.R() * RW.ENEMIES.mite.cluster) : 1;
      this.spawnAcc -= c;
      this.placeCluster(type, c);
    }
    while (this.eliteIdx < this.eliteQ.length && this.wt >= this.eliteQ[this.eliteIdx].t) {
      var el = this.eliteQ[this.eliteIdx++];
      this.placeCluster(el.type, 1);
      this.eliteAlert = 1.8; this.eliteAlertName = RW.ENEMIES[el.type].name; this.eliteAlertType = el.type;
      this.emit('eliteWarn');
    }
  };
  G.spawnPoint = function (out, goal) {
    var p = this.player, sp = T.spawn, x = 0, y = 0, co = this.core;
    if (goal) {
      // 冲圣火的怪：从地图入口进场（北面山道为主），给你拦截的时间
      var gw = MAP.gateWeight, rg = this.R(), list = rg < gw.north ? GATES.north : (rg < gw.north + gw.side ? GATES.side : GATES.south);
      if (!list.length) list = GATES.north;
      var gt = list[Math.floor(this.R() * list.length)];
      out.x = gt.x + this.RR(-10, 10); out.y = gt.y + this.RR(-10, 10);
      return;
    }
    for (var tries = 0; tries < 20; tries++) {
      if (this.R() < sp.anywhere) { x = this.RR(AX0 + 24, AX1 - 24); y = this.RR(AY0 + 24, AY1 - 24); }
      else {
        var a = this.R() * TAU, r = this.RR(sp.ringMin, sp.ringMax);
        x = clampX(p.x + Math.cos(a) * r, 24); y = clampY(p.y + Math.sin(a) * r, 24);
      }
      var ci = cellIdx(x, y);
      if (ci < 0 || GRID[ci] !== 0 || DIST_PLAYER[ci] > 60) continue;
      var dx = x - p.x, dy = y - p.y, cx = x - co.x, cy = y - co.y;
      if (dx * dx + dy * dy >= sp.safeDist * sp.safeDist && cx * cx + cy * cy > (co.r + 60) * (co.r + 60)) break;
    }
    if (!walkable(x, y)) { var g0 = GATES.north[0]; x = g0.x; y = g0.y; }
    out.x = x; out.y = y;
  };
  var SP = { x: 0, y: 0 };
  G.placeCluster = function (type, c) {
    var goal = this.R() < (RW.ENEMIES[type].coreBias || 0);
    this.spawnPoint(SP, goal);
    for (var i = 0; i < c; i++) {
      var mk = take(this.marks);
      if (!mk) return;
      mk.x = clampX(SP.x + (i ? this.RR(-22, 22) : 0), 12);
      mk.y = clampY(SP.y + (i ? this.RR(-22, 22) : 0), 12);
      mk.t = T.spawn.telegraph + i * 0.06;
      mk.type = type; mk.goal = goal;
    }
  };
  G.updateMarks = function () {
    for (var i = 0; i < this.marks.length; i++) {
      var mk = this.marks[i];
      if (!mk.on) continue;
      if (this.mode !== 'battle') { mk.on = false; continue; }
      mk.t -= DT;
      if (mk.t <= 0) {
        if (this.enemyCount < T.MAX_ENEMIES || mk.type === 'boss') { this.spawnEnemy(mk.type, mk.x, mk.y, mk.goal); mk.on = false; }
        else mk.t = 0.2;
      }
    }
  };
  G.spawnEnemy = function (type, x, y, goal) {
    var d = RW.ENEMIES[type], e = take(this.enemies);
    if (!e && d.boss) {
      // 满员时给 Boss 腾位置：清掉一只普通怪
      for (var i = 0; i < this.enemies.length; i++) if (!this.enemies[i].elite) { this.killEnemy(this.enemies[i], null, 'silent'); break; }
      e = take(this.enemies);
    }
    if (!e) return null;
    var w = this.wave, g = RW.GROWTH;
    e.type = type; e.d = d; e.x = x; e.y = y;
    e.vx = e.vy = e.kvx = e.kvy = 0; e.r = d.r;
    e.maxHp = e.hp = d.hp * this.hpMul(w);
    e.dmg = d.dmg * (1 + g.dmgC * (w - 1));
    e.armor = Math.floor((d.armor || 0) + (d.armorGrow || 0) * (w - 1));
    e.speed = d.speed * (1 + Math.min(g.spdCap, g.spdC * (w - 1)));
    e.knockRes = d.knockRes; e.flash = 0; e.spawnT = 0.18;
    e.state = 0; e.st = 0; e.cd = d.cdMin ? this.RR(0.6, d.cdMax) : (d.fireCdMin ? this.RR(1, d.fireCdMax) : 0);
    e.slowT = 0; e.slowAmt = 0; e.bhit = 0; e.chewT = 0; e.tk = 0; e.tref = null; e.shieldT = 0; e.dashHit = -1; e.lkN = 0;
    e.fireT = d.fireCd ? d.fireCd * 0.7 : (d.spawnCd ? d.spawnCd * 0.5 : 0); e.charging = false;
    e.elite = !!d.elite; e.seq = ++this.seq; e.wob = this.R() * TAU;
    e.goalCore = !!goal; e.enraged = false; e.atk = 0; e.sumT = 0; e.ax = x; e.ay = y;
    if (d.boss) { e.st = 1.5; this.boss = e; }
    this.enemyCount++;
    if (e.elite) this.emit('eliteSpawn');
    return e;
  };

  // ---------- 网格 ----------
  G.buildGrid = function () {
    var head = this.gridHead, next = this.gridNext;
    head.fill(-1);
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.on) continue;
      var cx = Math.min(GC - 1, Math.max(0, ((e.x - AX0) / CELL) | 0));
      var cy = Math.min(GR - 1, Math.max(0, ((e.y - AY0) / CELL) | 0));
      var c = cy * GC + cx;
      next[i] = head[c]; head[c] = i;
    }
  };
  G.near = function (x, y, r) {
    var head = this.gridHead, next = this.gridNext, buf = this.nbuf, n = 0;
    var x0 = Math.max(0, ((x - r - AX0) / CELL) | 0), x1 = Math.min(GC - 1, ((x + r - AX0) / CELL) | 0);
    var y0 = Math.max(0, ((y - r - AY0) / CELL) | 0), y1 = Math.min(GR - 1, ((y + r - AY0) / CELL) | 0);
    for (var cy = y0; cy <= y1; cy++) for (var cx = x0; cx <= x1; cx++) {
      var i = head[cy * GC + cx];
      while (i !== -1) { if (n < buf.length) buf[n++] = i; i = next[i]; }
    }
    return n;
  };
  G.nearest = function (x, y, range) {
    var best = null, bd = range * range;
    var cnt = this.near(x, y, range);
    for (var j = 0; j < cnt; j++) {
      var e = this.enemies[this.nbuf[j]];
      if (!e.on || e.spawnT > 0) continue;
      var dx = e.x - x, dy = e.y - y, d2 = dx * dx + dy * dy;
      if (d2 < bd) { bd = d2; best = e; }
    }
    return best;
  };

  // ================= 武器 =================
  G.momDmg = function () {
    var m = this.momTier > 0 ? 1 + T.momentum.dmg[this.momTier - 1] : 1;
    if (this.st.rage > 0) { var p = this.player; m *= 1 + this.st.rage * Math.max(0, 1 - p.hp / p.maxHp); }   // 狂怒：越残血越痛
    return m;
  };
  G.momRate = function () { return this.momTier > 0 ? 1 + T.momentum.rate[this.momTier - 1] : 1; };
  G.weaponDmg = function (w) { return w.d.dmg * RW.TIER_DMG[w.tier - 1] * this.st.dmg * this.momDmg(); };

  G.updateWeapons = function () {
    var p = this.player, s = this.st;
    for (var i = 0; i < this.weapons.length; i++) {
      var w = this.weapons[i], d = w.d, t = w.tier - 1;
      if (w.kick > 0) w.kick = Math.max(0, w.kick - DT * 6);
      w.cd -= DT;
      var e, a, k, n;
      switch (d.kind) {
        case 'needle':
          if (w.cd > 0) break;
          e = this.nearest(p.x, p.y, d.range * s.range);
          if (!e) { w.cd = 0; break; }
          a = Math.atan2(e.y - p.y, e.x - p.x); w.ang = a; w.kick = 1;
          n = 1 + s.extra;
          var prc = this.cls.focus && this.focus >= this.cls.focus.max ? 2 : 0;
          for (k = 0; k < n; k++) this.fireBullet(p.x, p.y, a + (k - (n - 1) / 2) * 0.12, d.speed, (d.range * s.range) / d.speed + 0.05, this.weaponDmg(w), d.knock * s.knock, prc ? 4.5 : 3.5, w, prc, prc ? '#ffffff' : d.color);
          this.muzzle(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 14, a, d.color, 0.5);
          w.cd = d.cd[t] / (s.rate * this.momRate());
          this.emit('shot', 'needle');
          break;
        case 'scatter':
          if (w.cd > 0) break;
          e = this.nearest(p.x, p.y, d.range * s.range);
          if (!e) { w.cd = 0; break; }
          a = Math.atan2(e.y - p.y, e.x - p.x); w.ang = a; w.kick = 1;
          n = d.pellets + t + 2 * s.extra;
          var spread = d.spread + 0.035 * (n - d.pellets);
          for (k = 0; k < n; k++) {
            var sp = d.speed * this.RR(0.85, 1.12);
            this.fireBullet(p.x, p.y, a + (k / (n - 1) - 0.5) * spread + this.RR(-0.04, 0.04), sp, (d.range * s.range) / d.speed, this.weaponDmg(w), d.knock * s.knock, 3, w, 0, d.color);
          }
          this.muzzle(p.x + Math.cos(a) * 16, p.y + Math.sin(a) * 16, a, d.color, 1.3);
          p.pvx -= Math.cos(a) * d.recoil; p.pvy -= Math.sin(a) * d.recoil;
          this.shake = Math.min(1, this.shake + 0.08);
          w.cd = d.cd[t] / (s.rate * this.momRate());
          this.emit('shot', 'scatter');
          break;
        case 'blades':
          this.updateBlades(w);
          break;
        case 'lance':
          if (w.charge > 0) {
            w.charge -= DT;
            if (w.charge <= 0) { this.fireLance(w); w.cd = d.cd[t] / (s.rate * this.momRate()); }
            break;
          }
          if (w.cd > 0) break;
          e = this.nearest(p.x, p.y, d.range * s.range * 0.9);
          if (!e) { w.cd = 0; break; }
          w.ang = Math.atan2(e.y - p.y, e.x - p.x);
          w.charge = d.charge;
          this.emit('charge');
          break;
        case 'arc':
          if (w.cd > 0) break;
          e = this.nearest(p.x, p.y, d.range * s.range);
          if (!e) { w.cd = 0; break; }
          this.fireArc(w, e);
          w.cd = d.cd[t] / (s.rate * this.momRate());
          break;
        case 'mines':
          if (w.cd > 0) break;
          var cap = d.maxMines + t + 2 * s.extra;
          if (w.mineCount >= cap || !this.canPlaceMine(p.x, p.y)) { w.cd = 0.1; break; }
          var mn = take(this.mines);
          if (!mn) { w.cd = 0.1; break; }
          mn.x = p.x; mn.y = p.y; mn.arm = d.arm; mn.life = d.life; mn.w = w;
          mn.dmg = this.weaponDmg(w); mn.rad = d.range * (1 + (s.range - 1) * 0.5); mn.knock = d.knock * s.knock;
          w.mineCount++;
          w.cd = d.cd[t] / (s.rate * this.momRate());
          this.emit('mineDrop');
          break;
      }
    }
  };

  G.fireBullet = function (x, y, a, speed, life, dmg, knock, r, source, pierce, color) {
    var b = take(this.bullets);
    if (!b) return;
    b.x = x; b.y = y; b.vx = Math.cos(a) * speed; b.vy = Math.sin(a) * speed;
    b.life = life; b.dmg = dmg; b.knock = knock; b.r = r; b.src = source; b.pierce = pierce; b.last = -1; b.color = color;
  };
  G.muzzle = function (x, y, a, color, size) {
    var f = take(this.fx, true);
    f.kind = 'muzzle'; f.x = x; f.y = y; f.r = a; f.r2 = size; f.life = f.max = 0.07; f.color = color;
  };

  G.updateBlades = function (w) {
    var p = this.player, d = w.d, s = this.st, t = w.tier - 1;
    var n = d.count + t + s.extra;
    var rad = d.range * (1 + (s.range - 1) * 0.6) + (p.r - P.radius);
    w.phase += d.spin * s.rate * DT;
    w.bladeN = n; w.bladeR = rad;
    var dmg = this.weaponDmg(w), hitCd = d.cd[t];
    for (var k = 0; k < n; k++) {
      var a = w.phase + k * TAU / n;
      var bx = p.x + Math.cos(a) * rad, by = p.y + Math.sin(a) * rad;
      var cnt = this.near(bx, by, d.bladeR + 30);
      for (var j = 0; j < cnt; j++) {
        var e = this.enemies[this.nbuf[j]];
        if (!e.on || e.spawnT > 0 || e.bhit > 0) continue;
        var dx = e.x - bx, dy = e.y - by, rr = d.bladeR + e.r;
        if (dx * dx + dy * dy > rr * rr) continue;
        var ex = e.x - p.x, ey = e.y - p.y, el = Math.sqrt(ex * ex + ey * ey) || 1;
        var tx = -Math.sin(a), ty = Math.cos(a);
        e.bhit = hitCd;
        this.hitEnemy(e, dmg, (ex / el) * 0.7 + tx * 0.3, (ey / el) * 0.7 + ty * 0.3, d.knock * s.knock, w, false);
        this.spark(bx, by, d.color);
        this.emit('bladeHit');
      }
    }
  };

  G.fireLance = function (w) {
    var p = this.player, d = w.d, s = this.st, t = w.tier - 1;
    var len = d.range * s.range, width = d.width + 3 * t;
    var n = 1 + s.extra, dmg = this.weaponDmg(w), anyHit = false;
    for (var k = 0; k < n; k++) {
      var off = k === 0 ? 0 : ((k % 2) ? 1 : -1) * 0.105 * Math.ceil(k / 2);
      var a = w.ang + off, ux = Math.cos(a), uy = Math.sin(a);
      for (var i = 0; i < this.enemies.length; i++) {
        var e = this.enemies[i];
        if (!e.on || e.spawnT > 0) continue;
        var ex = e.x - p.x, ey = e.y - p.y;
        var proj = ex * ux + ey * uy;
        if (proj < -e.r || proj > len + e.r) continue;
        var px = ex - ux * proj, py = ey - uy * proj, rr = width + e.r;
        if (px * px + py * py > rr * rr) continue;
        this.hitEnemy(e, dmg, ux, uy, d.knock * s.knock, w, false);
        anyHit = true;
      }
      var f = take(this.fx, true);
      f.kind = 'beam'; f.x = p.x; f.y = p.y; f.x2 = p.x + ux * len; f.y2 = p.y + uy * len;
      f.life = f.max = 0.28; f.color = d.color; f.w = width;
      for (var q = 0; q < 10; q++) {
        var pt = take(this.parts, true), u = this.R() * len;
        pt.x = p.x + ux * u; pt.y = p.y + uy * u; pt.vx = -uy * this.RR(-90, 90) + ux * 60; pt.vy = ux * this.RR(-90, 90) + uy * 60;
        pt.life = pt.max = this.RR(0.2, 0.4); pt.color = q % 2 ? '#ffffff' : d.color; pt.size = 2.5; pt.drag = 0.9; pt.glow = true;
      }
    }
    if (anyHit) this.stop(T.hitstop.heavy);
    this.shake = Math.min(1, this.shake + 0.22);
    this.flash = Math.max(this.flash, 0.12);
    w.kick = 1;
    this.emit('lance');
  };

  G.fireArc = function (w, first) {
    var p = this.player, d = w.d, s = this.st, t = w.tier - 1;
    var jumps = d.jumps + t + s.extra, dmg = this.weaponDmg(w);
    var f = take(this.fx, true);
    f.kind = 'arc'; f.life = f.max = 0.2; f.color = d.color; f.n = 0; f.w = 3;
    f.pts[f.n++] = p.x; f.pts[f.n++] = p.y;
    var cur = first, used = 0, jr2 = d.jumpRange * d.jumpRange * s.range;
    for (var j = 0; j <= jumps && cur; j++) {
      this.chainSeq[used++] = cur.seq;
      if (f.n < 38) { f.pts[f.n++] = cur.x; f.pts[f.n++] = cur.y; }
      var cx = cur.x, cy = cur.y;
      var dx0 = cx - p.x, dy0 = cy - p.y, dl0 = Math.sqrt(dx0 * dx0 + dy0 * dy0) || 1;
      this.hitEnemy(cur, dmg * Math.pow(d.falloff, j), dx0 / dl0, dy0 / dl0, d.knock * s.knock, w, false);
      this.nodeFlash(cx, cy, d.color, 12);
      var next = null, bd = jr2;
      var cnt = this.near(cx, cy, d.jumpRange * s.range);
      for (var q = 0; q < cnt; q++) {
        var e = this.enemies[this.nbuf[q]];
        if (!e.on || e.spawnT > 0) continue;
        var skip = false;
        for (var u = 0; u < used; u++) if (this.chainSeq[u] === e.seq) { skip = true; break; }
        if (skip) continue;
        var ddx = e.x - cx, ddy = e.y - cy, d2 = ddx * ddx + ddy * ddy;
        if (d2 < bd) { bd = d2; next = e; }
      }
      cur = next;
      if (used >= this.chainSeq.length) break;
    }
    w.kick = 1;
    this.emit('arc');
  };
  G.nodeFlash = function (x, y, color, r) {
    var f = take(this.fx, true);
    f.kind = 'flash'; f.x = x; f.y = y; f.r = r; f.life = f.max = 0.12; f.color = color;
  };

  G.canPlaceMine = function (x, y) {
    for (var i = 0; i < this.mines.length; i++) {
      var m = this.mines[i];
      if (!m.on) continue;
      var dx = m.x - x, dy = m.y - y;
      if (dx * dx + dy * dy < 18 * 18) return false;
    }
    return true;
  };

  G.updateMines = function () {
    for (var i = 0; i < this.mines.length; i++) {
      var m = this.mines[i];
      if (!m.on) continue;
      if (this.mode !== 'battle') { m.on = false; continue; }
      m.life -= DT;
      if (m.life <= 0) { m.on = false; if (m.w) m.w.mineCount--; continue; }
      if (m.arm > 0) { m.arm -= DT; continue; }
      var trig = m.w ? m.w.d.trigger : 24, cnt = this.near(m.x, m.y, trig + 30), boom = false;
      for (var j = 0; j < cnt; j++) {
        var e = this.enemies[this.nbuf[j]];
        if (!e.on || e.spawnT > 0) continue;
        var dx = e.x - m.x, dy = e.y - m.y, rr = trig + e.r;
        if (dx * dx + dy * dy < rr * rr) { boom = true; break; }
      }
      if (boom) {
        m.on = false;
        if (m.w) m.w.mineCount--;
        this.queueBlast(m.x, m.y, m.rad, m.dmg, 0, m.w, '#ff8a5c', '', m.knock);
        this.stop(T.hitstop.mine);
      }
    }
  };

  // ---------- 爆炸：统一排队处理，连锁不会递归 ----------
  G.queueBlast = function (x, y, rad, dmgEnemies, dmgPlayer, source, color, who, knock) {
    var b = take(this.blasts, true);
    // 火药：只放大主角自己的爆炸（符文陷阱、黑洞内爆；它们的 source.crit 为真）。
    // 环境连锁（炸药地精被打爆）和敌人的爆炸不吃这个加成
    if (dmgPlayer <= 0 && source && source.crit && this.st) rad *= this.st.blastR;
    b.x = x; b.y = y; b.rad = rad; b.de = dmgEnemies; b.dp = dmgPlayer; b.src = source; b.color = color; b.who = who || ''; b.knock = knock || 220;
  };
  G.processBlasts = function () {
    for (var guard = 0; guard < 3; guard++) {
      var any = false;
      for (var i = 0; i < this.blasts.length; i++) {
        var b = this.blasts[i];
        if (!b.on) continue;
        b.on = false; any = true;
        this.doBlast(b);
      }
      if (!any) break;
    }
  };
  G.doBlast = function (b) {
    var p = this.player, j;
    for (j = 0; j < this.enemies.length; j++) {
      var e = this.enemies[j];
      if (!e.on || e.spawnT > 0) continue;
      var dx = e.x - b.x, dy = e.y - b.y, rr = b.rad + e.r, d2 = dx * dx + dy * dy;
      if (d2 > rr * rr) continue;
      var d = Math.sqrt(d2) || 1;
      if (b.de > 0) this.hitEnemy(e, b.de, dx / d, dy / d, b.knock, b.src, false);
    }
    if (b.dp > 0) {
      var px = p.x - b.x, py = p.y - b.y, pr = b.rad + p.r;
      if (px * px + py * py < pr * pr) this.hurtPlayer(b.dp, b.who || '爆炸', b.x, b.y);
      var co = this.core, cx = co.x - b.x, cy = co.y - b.y, cr = b.rad + co.r;
      if (cx * cx + cy * cy < cr * cr) this.hurtCore(b.dp * 1.5, b.who || '爆炸');
      for (j = 0; j < this.towers.length; j++) {
        var tw = this.towers[j];
        if (!tw.on) continue;
        var tx = tw.x - b.x, ty = tw.y - b.y, tr = b.rad + tw.d.r;
        if (tx * tx + ty * ty < tr * tr) this.hurtTower(tw, b.dp * 2);
      }
      for (j = 0; j < this.soldiers.length; j++) {
        var so = this.soldiers[j];
        if (!so.on) continue;
        var sx = so.x - b.x, sy = so.y - b.y, sr = b.rad + so.r;
        if (sx * sx + sy * sy < sr * sr) this.hurtSoldier(so, b.dp * 2);
      }
    }
    var f = take(this.fx, true);
    f.kind = 'ring'; f.x = b.x; f.y = b.y; f.r = 6; f.r2 = b.rad * 1.1; f.life = f.max = 0.34; f.color = b.color; f.w = 5;
    var f2 = take(this.fx, true);
    f2.kind = 'flash'; f2.x = b.x; f2.y = b.y; f2.r = b.rad * 0.8; f2.life = f2.max = 0.14; f2.color = '#ffe2c8';
    this.burst(b.x, b.y, 18, b.color, 240, 3.2, true);
    this.decal(b.x, b.y, b.rad * 0.7, 'rgba(20,8,4,0.55)');
    this.shake = Math.min(1, this.shake + 0.3);
    this.emit('boom');
  };

  // ================= 主动技能 =================
  G.skillDmg = function () { return this.skill.d.dmg * RW.SKILL_TIER[this.skill.tier - 1] * this.st.dmg * this.momDmg(); };
  G.castSkill = function () {
    var sk = this.skill, p = this.player;
    if (!sk || sk.cd > 0) return false;
    p.castT = 0.45;
    var d = sk.d, i, e;
    sk.cd = d.cd * this.st.cdr;
    switch (sk.id) {
      case 'nova':
        var rad = (d.radius + 20 * (sk.tier - 1)) * this.st.blastR, dmg = this.skillDmg();   // 炎爆也吃「爆炸范围」
        for (i = 0; i < this.enemies.length; i++) {
          e = this.enemies[i];
          if (!e.on || e.spawnT > 0) continue;
          var dx = e.x - p.x, dy = e.y - p.y, rr = rad + e.r, d2 = dx * dx + dy * dy;
          if (d2 > rr * rr) continue;
          var dd = Math.sqrt(d2) || 1;
          this.hitEnemy(e, dmg, dx / dd, dy / dd, d.knock * this.st.knock, sk, false);
        }
        this.ringFx(p.x, p.y, 10, rad, 0.45, d.color, 7);
        this.ringFx(p.x, p.y, 4, rad * 0.7, 0.3, '#ffffff', 3);
        var f = take(this.fx, true);
        f.kind = 'spokes'; f.x = p.x; f.y = p.y; f.r = rad; f.life = f.max = 0.35; f.color = d.color;
        this.burst(p.x, p.y, 36, d.color, 380, 3, true);
        this.flash = Math.max(this.flash, 0.35);
        this.shake = Math.min(1, this.shake + 0.4);
        this.stop(3, true);
        break;
      case 'veil':
        sk.veilT = d.dur + 0.5 * (sk.tier - 1); sk.veilAcc = 0.99;
        this.flash = Math.max(this.flash, 0.2);
        break;
      case 'well':
        var tgt = this.nearest(p.x, p.y, 300);
        if (tgt) { sk.wx = tgt.x; sk.wy = tgt.y; }
        else { sk.wx = clampX(p.x + Math.cos(p.face) * 130, 30); sk.wy = clampY(p.y + Math.sin(p.face) * 130, 30); }
        sk.wellT = d.pull;
        this.ringFx(sk.wx, sk.wy, d.radius, 6, 0.5, d.color, 3);
        break;
      case 'storm':
        var n = d.missiles + 6 * (sk.tier - 1);
        for (i = 0; i < n; i++) {
          var ms = take(this.missiles, true), a = i * TAU / n + this.RR(-0.1, 0.1);
          ms.x = p.x; ms.y = p.y; ms.vx = Math.cos(a) * 220; ms.vy = Math.sin(a) * 220;
          ms.life = d.life; ms.dmg = this.skillDmg(); ms.tgt = null; ms.tseq = 0; ms.color = i % 3 ? d.color : '#ffffff';
        }
        this.ringFx(p.x, p.y, 8, 70, 0.25, d.color, 4);
        this.flash = Math.max(this.flash, 0.15);
        break;
    }
    this.emit('skill', sk.id);
    return true;
  };
  G.updateSkill = function () {
    var sk = this.skill, p = this.player;
    if (!sk) return;
    if (sk.cd > 0) sk.cd -= DT;
    var d = sk.d, i, e;
    if (sk.veilT > 0) {
      sk.veilT -= DT;
      sk.veilAcc += d.rate * DT;
      while (sk.veilAcc >= 1) {
        sk.veilAcc -= 1;
        // 随机挑一个范围内的敌人劈下去，没有就劈空地
        var pick = null, seen = 0, rad = d.radius;
        var cnt = this.near(p.x, p.y, rad);
        for (var j = 0; j < cnt; j++) {
          e = this.enemies[this.nbuf[j]];
          if (!e.on || e.spawnT > 0) continue;
          var dx = e.x - p.x, dy = e.y - p.y;
          if (dx * dx + dy * dy > rad * rad) continue;
          seen++;
          if (this.R() * seen < 1) pick = e;
        }
        var sx, sy;
        if (pick) { sx = pick.x; sy = pick.y; }
        else { var a = this.R() * TAU, r = this.RR(40, rad); sx = clampX(p.x + Math.cos(a) * r, 10); sy = clampY(p.y + Math.sin(a) * r, 10); }
        var dmg = this.skillDmg();
        cnt = this.near(sx, sy, 40);
        for (var q = 0; q < cnt; q++) {
          e = this.enemies[this.nbuf[q]];
          if (!e.on || e.spawnT > 0) continue;
          var ex = e.x - sx, ey = e.y - sy;
          if (ex * ex + ey * ey > (28 + e.r) * (28 + e.r)) continue;
          this.hitEnemy(e, e === pick ? dmg : dmg * 0.5, 0, 1, 60, sk, false);
        }
        var f = take(this.fx, true);
        f.kind = 'bolt'; f.x = sx; f.y = sy; f.x2 = sx + this.RR(-40, 40); f.y2 = sy - 300; f.life = f.max = 0.22; f.color = d.color;
        this.ringFx(sx, sy, 4, 34, 0.25, '#ffffff', 3);
        this.nodeFlash(sx, sy, d.color, 26);
        this.decal(sx, sy, 12, 'rgba(10,20,40,0.6)');
        this.burst(sx, sy, 6, d.color, 160, 2.5, true);
        this.shake = Math.min(1, this.shake + 0.08);
        this.emit('strike');
      }
    }
    if (sk.wellT > 0) {
      sk.wellT -= DT;
      var R = d.radius, force = d.force;
      for (i = 0; i < this.enemies.length; i++) {
        e = this.enemies[i];
        if (!e.on || e.spawnT > 0) continue;
        var wx = sk.wx - e.x, wy = sk.wy - e.y, w2 = wx * wx + wy * wy;
        if (w2 > R * R || w2 < 16) continue;
        var wl = Math.sqrt(w2), k = (1 - wl / R * 0.5) * force * e.knockRes * DT * 6;
        e.kvx += wx / wl * k; e.kvy += wy / wl * k;
        e.kvx *= 0.93; e.kvy *= 0.93;
      }
      if (this.R() < 0.7) {
        var pa = this.R() * TAU, pr = this.RR(R * 0.5, R);
        var pt = take(this.parts, true);
        pt.x = sk.wx + Math.cos(pa) * pr; pt.y = sk.wy + Math.sin(pa) * pr;
        pt.vx = -Math.cos(pa) * pr * 2.2 - Math.sin(pa) * 120; pt.vy = -Math.sin(pa) * pr * 2.2 + Math.cos(pa) * 120;
        pt.life = pt.max = 0.4; pt.color = this.R() < 0.5 ? d.color : '#ffffff'; pt.size = 2.4; pt.drag = 0.97; pt.glow = true;
      }
      if (sk.wellT <= 0) {
        this.queueBlast(sk.wx, sk.wy, d.blast, this.skillDmg(), 0, sk, d.color, '', 260);
        this.ringFx(sk.wx, sk.wy, 10, d.blast * 1.6, 0.5, '#ffffff', 4);
        this.flash = Math.max(this.flash, 0.3);
        this.stop(4, true);
      }
    }
  };
  G.ringFx = function (x, y, r, r2, life, color, w) {
    var f = take(this.fx, true);
    f.kind = 'ring'; f.x = x; f.y = y; f.r = r; f.r2 = r2; f.life = f.max = life; f.color = color; f.w = w;
  };
  G.updateMissiles = function () {
    var d = RW.SKILLS.storm;
    for (var i = 0; i < this.missiles.length; i++) {
      var m = this.missiles[i];
      if (!m.on) continue;
      if (this.mode !== 'battle') { m.on = false; continue; }
      m.life -= DT;
      if (m.life <= 0) { m.on = false; continue; }
      var t = m.tgt;
      if (!t || !t.on || t.seq !== m.tseq) { t = this.nearest(m.x, m.y, 300); m.tgt = t; m.tseq = t ? t.seq : 0; }
      var sp = Math.sqrt(m.vx * m.vx + m.vy * m.vy) || 1;
      sp = Math.min(d.speed, sp + 600 * DT);
      var ang = Math.atan2(m.vy, m.vx);
      if (t) {
        var want = Math.atan2(t.y - m.y, t.x - m.x), da = want - ang;
        while (da > Math.PI) da -= TAU;
        while (da < -Math.PI) da += TAU;
        ang += Math.max(-d.turn * DT, Math.min(d.turn * DT, da));
      }
      m.vx = Math.cos(ang) * sp; m.vy = Math.sin(ang) * sp;
      m.x += m.vx * DT; m.y += m.vy * DT;
      if (t) {
        var dx = t.x - m.x, dy = t.y - m.y, rr = t.r + 5;
        if (dx * dx + dy * dy < rr * rr) {
          m.on = false;
          this.hitEnemy(t, m.dmg, m.vx / sp, m.vy / sp, 60, this.skill, false);
          this.nodeFlash(m.x, m.y, m.color, 10);
          this.spark(m.x, m.y, m.color);
        }
      }
    }
  };

  // ================= 建筑 =================
  G.towerCount = function () { return countOn(this.towers); };
  G.buildPrice = function (id) {
    return Math.round(RW.TOWERS[id].cost * this.priceMul() * this.st.buildCost * (1 + T.build.step * this.towerCount()));
  };
  // 返回 'ok' 或原因
  G.canBuildHere = function (x, y) {
    if (x < AX0 + 20 || x > AX1 - 20 || y < AY0 + 20 || y > AY1 - 20) return false;
    var ch = mapChar(x, y);
    if (!walkable(x, y) || ch === '=' || ch === 'S') return false;
    var co = this.core, cdx = x - co.x, cdy = y - co.y, cmin = co.r + 22;
    if (cdx * cdx + cdy * cdy < cmin * cmin) return false;
    for (var i = 0; i < this.towers.length; i++) {
      var tw = this.towers[i];
      if (!tw.on) continue;
      var dx = tw.x - x, dy = tw.y - y;
      if (dx * dx + dy * dy < T.build.spacing * T.build.spacing) return false;
    }
    return true;
  };
  G.buildTower = function (id) {
    var p = this.player;
    if (this.mode !== 'battle' && this.mode !== 'clear') return '只能在战斗中建造';
    if (this.towerCount() >= T.build.max) return '建筑已达上限 ' + T.build.max;
    var price = this.buildPrice(id);
    if (this.shardCount < price) return '金币不足，需要 ' + price;
    var d = RW.TOWERS[id], back = p.r + d.r + 1;
    var bx = p.x - Math.cos(p.face) * back, by = p.y - Math.sin(p.face) * back;
    if (!this.canBuildHere(bx, by)) { bx = p.x; by = p.y; if (!this.canBuildHere(bx, by)) return '离其他建筑太近'; }
    var tw = take(this.towers);
    if (!tw) return '建筑已达上限';
    tw.id = id; tw.d = d; tw.x = bx; tw.y = by; tw.cd = 0.4; tw.build = T.build.time; tw.pulse = 0; tw.flash = 0;
    tw.spawnT = 1; tw.soldiers = 0; tw.ang = p.face; tw.spent = price;
    tw.maxHp = tw.hp = d.hp * RW.TOWER_TIER.hp[this.tech[id] - 1];
    this.shardCount -= price;
    this.built++;
    this.ringFx(bx, by, 6, 46, 0.4, d.color, 3);
    this.burst(bx, by, 14, d.color, 160, 2.5, true);
    this.emit('build', id);
    return 'ok';
  };
  G.updateCoreGun = function () {
    var co = this.core, CO = T.core;
    co.cd -= DT;
    if (co.cd > 0) return;
    var e = this.nearest(co.x, co.y, CO.gunRange);
    if (!e) { co.cd = 0; return; }
    var a = Math.atan2(e.y - co.y, e.x - co.x);
    co.ang = a;
    this.fireBullet(co.x + Math.cos(a) * co.r, co.y + Math.sin(a) * co.r, a, 460, CO.gunRange / 460 + 0.05, CO.gunDmg * (1 + 0.1 * (this.wave - 1)), 40, 3, this.coreSrc, 0, '#9fe8ff');
    co.cd = CO.gunCd;
    this.emit('shot', 'tower');
  };
  G.updateTowers = function () {
    if (this.mode === 'battle') this.updateCoreGun();
    for (var i = 0; i < this.towers.length; i++) {
      var tw = this.towers[i];
      if (!tw.on) continue;
      if (tw.flash > 0) tw.flash -= DT;
      if (tw.build > 0) { tw.build -= DT; continue; }
      if (this.mode !== 'battle') continue;
      var d = tw.d, ti = this.tech[tw.id] - 1, st = this.towerStats[tw.id];
      var range = (d.range || 0) * RW.TOWER_TIER.range[ti];
      tw.cd -= DT;
      if (tw.pulse > 0) tw.pulse -= DT;
      if (d.kind === 'sentry') {
        if (tw.cd > 0) continue;
        var e = this.nearest(tw.x, tw.y, range);
        if (!e) { tw.cd = 0; continue; }
        var a = Math.atan2(e.y - tw.y, e.x - tw.x);
        tw.ang = a;
        this.fireBullet(tw.x + Math.cos(a) * 12, tw.y + Math.sin(a) * 12, a, d.speed, range / d.speed + 0.05, d.dmg * RW.TOWER_TIER.dmg[ti] * this.st.towerDmg, d.knock, 3, st, 0, d.color);
        this.muzzle(tw.x + Math.cos(a) * 14, tw.y + Math.sin(a) * 14, a, d.color, 0.5);
        tw.cd = d.cd;
        this.emit('shot', 'tower');
      } else if (d.kind === 'pylon') {
        if (tw.cd > 0) continue;
        tw.cd = d.cd; tw.pulse = 0.3;
        var hit = false, cnt = this.near(tw.x, tw.y, range + 30);
        for (var j = 0; j < cnt; j++) {
          var en = this.enemies[this.nbuf[j]];
          if (!en.on || en.spawnT > 0) continue;
          var dx = en.x - tw.x, dy = en.y - tw.y, rr = range + en.r, d2 = dx * dx + dy * dy;
          if (d2 > rr * rr) continue;
          var dd = Math.sqrt(d2) || 1;
          en.slowT = d.slowTime; en.slowAmt = d.slow;
          this.hitEnemy(en, d.dmg * RW.TOWER_TIER.dmg[ti] * this.st.towerDmg, dx / dd, dy / dd, d.knock, st, false);
          hit = true;
        }
        this.ringFx(tw.x, tw.y, 10, range, 0.4, d.color, 2.5);
        if (hit) this.emit('pulse');
      } else if (d.kind === 'barracks') {
        var cap = d.soldiers[ti];
        if (tw.soldiers < cap) {
          tw.spawnT -= DT;
          if (tw.spawnT <= 0) { this.spawnSoldier(tw); tw.spawnT = d.spawnCd; }
        }
      }
    }
  };
  G.hurtTower = function (tw, dmg) {
    if (!tw.on || this.mode !== 'battle') return;
    tw.hp -= dmg; tw.flash = 0.1;
    if (tw.hp <= 0) this.destroyTower(tw);
    else this.emit('towerHit');
  };
  G.destroyTower = function (tw) {
    tw.on = false;
    for (var i = 0; i < this.soldiers.length; i++) { var s = this.soldiers[i]; if (s.on && s.home === tw) this.killSoldier(s); }
    for (var k = 0; k < this.shards.length; k++) { var sh = this.shards[k]; if (sh.on && sh.tower === tw) sh.tower = null; }
    this.burst(tw.x, tw.y, 24, tw.d.color, 230, 3, true);
    this.ringFx(tw.x, tw.y, 8, 70, 0.45, '#ff3b5c', 4);
    this.decal(tw.x, tw.y, 22, 'rgba(10,10,14,0.7)');
    this.shake = Math.min(1, this.shake + 0.35);
    this.emit('towerDown', tw.d.name);
  };

  // ---------- 士兵 ----------
  G.spawnSoldier = function (tw) {
    var s = take(this.soldiers);
    if (!s) return;
    var ti = this.tech.barracks - 1, sd = tw.d.soldier;
    s.home = tw; s.slot = tw.soldiers; tw.soldiers++;
    s.x = tw.x + this.RR(-6, 6); s.y = tw.y + tw.d.r + 4; s.vx = s.vy = 0;
    s.maxHp = s.hp = sd.hp * RW.TOWER_TIER.hp[ti]; s.r = sd.r; s.cd = 0.3; s.flash = 0; s.ang = 0;
    this.ringFx(s.x, s.y, 3, 16, 0.25, tw.d.color, 2);
    this.emit('soldier');
  };
  G.hurtSoldier = function (s, dmg) {
    if (!s.on) return;
    s.hp -= dmg; s.flash = 0.1;
    if (s.hp <= 0) this.killSoldier(s);
  };
  G.killSoldier = function (s) {
    s.on = false;
    if (s.home && s.home.soldiers > 0) s.home.soldiers--;
    this.burst(s.x, s.y, 8, '#ff9ecf', 140, 2, false);
  };
  G.updateSoldiers = function () {
    var battle = this.mode === 'battle';
    for (var i = 0; i < this.soldiers.length; i++) {
      var s = this.soldiers[i];
      if (!s.on) continue;
      var tw = s.home;
      if (!tw || !tw.on) { this.killSoldier(s); continue; }
      if (s.flash > 0) s.flash -= DT;
      var d = tw.d, sd = d.soldier, ti = this.tech.barracks - 1;
      s.cd -= DT;
      var tgt = null;
      if (battle) {
        // 只拦截兵营警戒圈内的敌人
        var best = 1e9, cnt = this.near(tw.x, tw.y, d.leash);
        for (var j = 0; j < cnt; j++) {
          var e = this.enemies[this.nbuf[j]];
          if (!e.on || e.spawnT > 0) continue;
          var hx = e.x - tw.x, hy = e.y - tw.y;
          if (hx * hx + hy * hy > d.leash * d.leash) continue;
          var sx = e.x - s.x, sy = e.y - s.y, s2 = sx * sx + sy * sy;
          if (s2 < best) { best = s2; tgt = e; }
        }
      }
      var gx, gy;
      if (tgt) { gx = tgt.x; gy = tgt.y; }
      else { var a = s.slot * 1.9 + this.clock * 0.3; gx = tw.x + Math.cos(a) * 30; gy = tw.y + Math.sin(a) * 30; }
      var dx = gx - s.x, dy = gy - s.y, dl = Math.sqrt(dx * dx + dy * dy) || 1;
      var reach = tgt ? tgt.r + s.r + 3 : 4;
      var want = dl > reach ? sd.speed : 0;
      var k = Math.min(1, 10 * DT);
      s.vx += (dx / dl * want - s.vx) * k; s.vy += (dy / dl * want - s.vy) * k;
      s.x += s.vx * DT; s.y += s.vy * DT;
      if (dl > 1) s.ang = Math.atan2(dy, dx);
      // 士兵之间软分离
      for (var q = 0; q < this.soldiers.length; q++) {
        if (q === i) continue;
        var o = this.soldiers[q];
        if (!o.on) continue;
        var ox = s.x - o.x, oy = s.y - o.y, o2 = ox * ox + oy * oy, rr = s.r + o.r;
        if (o2 < rr * rr && o2 > 0.01) { var od = Math.sqrt(o2); s.x += ox / od * (rr - od) * 0.3; s.y += oy / od * (rr - od) * 0.3; }
      }
      s.x = clampX(s.x, s.r); s.y = clampY(s.y, s.r);
      collideGrid(s, s.r);
      if (tgt && dl <= reach + 2 && s.cd <= 0) {
        s.cd = sd.atkCd;
        this.hitEnemy(tgt, sd.dmg * RW.TOWER_TIER.dmg[ti] * this.st.towerDmg, dx / dl, dy / dl, 70, this.towerStats.barracks, false);
        var f = take(this.fx, true);
        f.kind = 'slash'; f.x = s.x + dx / dl * 6; f.y = s.y + dy / dl * 6; f.r = s.ang; f.life = f.max = 0.12; f.color = '#ffd1e8';
      }
      if (!tgt && s.hp < s.maxHp) s.hp = Math.min(s.maxHp, s.hp + 2 * DT);
    }
  };

  // ================= 子弹 / 敌人 / 伤害 =================
  G.updateBullets = function () {
    for (var i = 0; i < this.bullets.length; i++) {
      var b = this.bullets[i];
      if (!b.on) continue;
      b.x += b.vx * DT; b.y += b.vy * DT; b.life -= DT;
      if (b.life <= 0 || b.x < AX0 - 10 || b.x > AX1 + 10 || b.y < AY0 - 10 || b.y > AY1 + 10) { b.on = false; continue; }
      var cnt = this.near(b.x, b.y, b.r + 30);
      for (var j = 0; j < cnt; j++) {
        var e = this.enemies[this.nbuf[j]];
        if (!e.on || e.spawnT > 0 || e.seq === b.last) continue;
        var dx = e.x - b.x, dy = e.y - b.y, rr = e.r + b.r;
        if (dx * dx + dy * dy > rr * rr) continue;
        var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy) || 1;
        this.hitEnemy(e, b.dmg, b.vx / sp, b.vy / sp, b.knock, b.src, false);
        this.spark(b.x, b.y, b.color);
        if (b.pierce > 0) { b.pierce--; b.last = e.seq; }
        else { b.on = false; break; }
      }
    }
  };

  G.hitEnemy = function (e, dmg, kx, ky, knock, source, heavy) {
    if (!e.on) return;
    var crit = false, critCh = this.st.crit;
    if (source && source.crit && this.cls) {
      if (this.cls.near) {
        var nr = this.cls.near, mdx = e.x - this.player.x, mdy = e.y - this.player.y, md = Math.sqrt(mdx * mdx + mdy * mdy);
        dmg *= 1 + nr.bonus * Math.max(0, Math.min(1, (nr.r1 - md) / (nr.r1 - nr.r0)));
      } else if (this.cls.focus) critCh += this.focus * this.cls.focus.crit;
    }
    if (source && source.crit && this.R() < critCh) { dmg *= this.st.critMul; crit = true; }
    // 吸血：只算主角自己的武器与技能（它们的 source.crit 为真），每秒次数有上限
    if (source && source.crit && this.st.lifesteal > 0 && this.clock >= this.lsT && this.R() < this.st.lifesteal) {
      var pl = this.player;
      if (pl.hp < pl.maxHp && this.mode === 'battle') { pl.hp = Math.min(pl.maxHp, pl.hp + 1); this.lsT = this.clock + 1 / T.lifestealPerSec; this.addNum(pl.x, pl.y - 18, 1, 'heal'); }
    }
    e.hx = kx; e.hy = ky; e.hk = knock;
    if (e.shieldT > 0) dmg *= 1 - RW.ENEMIES.shielder.reduce;
    var dd = Math.max(1, dmg - e.armor);
    var armored = (e.armor > 0 && dd < dmg * 0.8) || e.shieldT > 0;
    e.hp -= dd; e.flash = 0.08;
    var kr = knock * e.knockRes;
    if (e.type === 'dasher' && e.state === 2) kr = 0;
    e.kvx += kx * kr; e.kvy += ky * kr;
    if (source) source.dmg += dd;
    this.addNum(e.x + this.RR(-6, 6), e.elite ? e.y + this.RR(-6, 6) : e.y - e.r - 2, dd, crit ? 'crit' : (armored ? 'armor' : 'hit'));
    if (heavy) this.stop(T.hitstop.heavy);
    if (crit && e.elite) this.stop(T.hitstop.eliteCrit);
    this.emit('hit', crit ? 1 : 0);
    if (e.hp <= 0) this.killEnemy(e, source, 'kill');
  };

  // how: 'kill'（被打死）| 'eat'（被吞）| 'silent'（清场/复活，不掉落）
  G.killEnemy = function (e, source, how) {
    e.on = false;
    this.enemyCount--;
    var d = e.d;
    if (how !== 'eat') {
      this.burst(e.x, e.y, e.elite ? 30 : (e.r > 11 ? 12 : 7), d.color, e.elite ? 260 : 160, e.elite ? 3.5 : 2.5, e.elite);
      this.ringFx(e.x, e.y, e.r * 0.6, e.r * (e.elite ? 4 : 2.4), e.elite ? 0.45 : 0.2, e.elite ? '#ffffff' : d.color, e.elite ? 4 : 2);
    }
    this.spawnCorpse(e, how);
    if (how === 'silent') return;
    var pl = this.player, kdx = e.x - pl.x, kdy = e.y - pl.y, near = kdx * kdx + kdy * kdy < T.momentum.near * T.momentum.near;
    if (near || how === 'eat') this.addMomentum(d.boss ? 25 : (e.elite ? 6 : 1));
    if (near && this.R() < T.healOrb.chance * this.st.healOrb) this.spawnHeal(e.x, e.y);
    this.kills++;
    if (source) source.kills++;
    this.streak = this.streakT > 0 ? this.streak + 1 : 1; this.streakT = 1.3;
    if (this.streak > this.bestStreak) this.bestStreak = this.streak;
    if (this.streak % 25 === 0) this.emit('streak', this.streak);
    var n = d.shards;
    if (e.elite && this.st.bounty > 0) n *= 2;
    for (var k = 0; k < n; k++) this.spawnShard(e.x, e.y, d.shardVal);
    if (how === 'kill') {
      if (e.type === 'splitter') {
        for (var s = 0; s < d.splits; s++) {
          var sp = this.spawnEnemy('spore', e.x + this.RR(-8, 8), e.y + this.RR(-8, 8), e.goalCore);
          if (sp) { sp.spawnT = 0.05; var a = s * TAU / d.splits; sp.kvx = Math.cos(a) * 160; sp.kvy = Math.sin(a) * 160; }
        }
        this.ringFx(e.x, e.y, 4, 30, 0.25, d.color, 3);
      }
      if (e.type === 'bomber') {
        // 在远处打爆它：只炸怪，不炸你
        this.queueBlast(e.x, e.y, 52, 10 + this.wave * 2, 0, this.envSrc, d.color, '', 200);
      }
    }
    if (e.decal !== false && how === 'kill' && e.r >= 10) this.decal(e.x, e.y, e.r * 0.8, 'rgba(0,0,0,0.35)');
    if (d.boss && how === 'kill') { this.boss = null; this.stop(14, true); this.shake = 1; this.flash = 0.8; this.ringFx(e.x, e.y, e.r, 320, 0.9, '#ffffff', 8); this.burst(e.x, e.y, 60, d.color, 420, 4, true); this.emit('bossDown'); return; }
    if (e.elite) { this.stop(T.hitstop.eliteKill, true); this.shake = Math.min(1, this.shake + 0.7); this.flash = Math.max(this.flash, 0.25); this.emit('eliteDown'); }
    else { if (e.type === 'shell') this.stop(T.hitstop.shellKill); this.emit(how === 'eat' ? 'eat' : 'kill', e.type); }
  };

  G.canEat = function (e) {
    return !e.elite && e.r <= RW.EVO[this.player.stage].eatR;
  };
  G.eatEnemy = function (e) {
    var p = this.player;
    this.killEnemy(e, this.eatSrc, 'eat');
    this.addMass(e.d.mass);
    var f = take(this.fx, true);
    f.kind = 'gulp'; f.x = p.x; f.y = p.y; f.r = p.r; f.life = f.max = 0.18; f.color = RW.EVO[p.stage].color;
    for (var i = 0; i < 6; i++) {
      var pt = take(this.parts, true), a = this.R() * TAU;
      pt.x = e.x + Math.cos(a) * e.r; pt.y = e.y + Math.sin(a) * e.r; pt.vx = (p.x - pt.x) * 6; pt.vy = (p.y - pt.y) * 6;
      pt.life = pt.max = 0.18; pt.color = e.d.color; pt.size = 3; pt.drag = 0.9; pt.glow = false;
    }
  };
  G.addMass = function (m) {
    var p = this.player;
    p.mass += m;
    var evo = RW.EVO;
    while (p.stage < evo.length - 1 && p.mass >= evo[p.stage + 1].mass) {
      p.stage++;
      this.recalc();
      p.hp = p.maxHp;
      this.evolveT = 2.2;
      this.ringFx(p.x, p.y, p.r, 140, 0.6, evo[p.stage].color, 6);
      this.ringFx(p.x, p.y, p.r, 90, 0.45, '#ffffff', 3);
      this.burst(p.x, p.y, 40, evo[p.stage].color, 320, 3, true);
      this.flash = Math.max(this.flash, 0.4);
      this.stop(T.hitstop.evolve, true);
      this.emit('evolve', evo[p.stage].name);
    }
  };

  G.pickTarget = function (e) {
    var p = this.player, d = e.d;
    var tx = p.x, ty = p.y, tk = 0, tref = null;
    var pdx = p.x - e.x, pdy = p.y - e.y, best = pdx * pdx + pdy * pdy;
    var ID = T.core.interceptDist;
    if (e.goalCore && best > ID * ID) {
      var co = this.core, cdx = co.x - e.x, cdy = co.y - e.y;
      tx = co.x; ty = co.y; tk = 3; best = cdx * cdx + cdy * cdy;
    }
    var i;
    if (d.towerAggro) {
      var ta = d.towerAggro * d.towerAggro;
      for (i = 0; i < this.towers.length; i++) {
        var tw = this.towers[i];
        if (!tw.on) continue;
        var dx = tw.x - e.x, dy = tw.y - e.y, d2 = dx * dx + dy * dy;
        if (d2 < ta && d2 < best * 1.6) { best = d2 / 1.6; tx = tw.x; ty = tw.y; tk = 1; tref = tw; }
      }
    }
    if (d.soldierAggro) {
      var sa = d.soldierAggro * d.soldierAggro;
      for (i = 0; i < this.soldiers.length; i++) {
        var s = this.soldiers[i];
        if (!s.on) continue;
        var sx = s.x - e.x, sy = s.y - e.y, s2 = sx * sx + sy * sy;
        if (s2 < sa && s2 < best) { best = s2; tx = s.x; ty = s.y; tk = 2; tref = s; }
      }
    }
    e.tx = tx; e.ty = ty; e.tk = tk; e.tref = tref;
  };

  G.updateEnemies = function () {
    var p = this.player, battle = this.mode === 'battle', i;
    for (i = 0; i < this.enemies.length; i++) { var z = this.enemies[i]; if (z.on && z.shieldT > 0) z.shieldT -= DT; }
    for (i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.on) continue;
      if (e.spawnT > 0) { e.spawnT -= DT; continue; }
      var d = e.d;
      if (e.flash > 0) e.flash -= DT;
      if (e.bhit > 0) e.bhit -= DT;
      if (e.slowT > 0) e.slowT -= DT;
      if (e.chewT > 0) e.chewT -= DT;
      var slow = e.slowT > 0 ? 1 - e.slowAmt : 1;
      this.pickTarget(e);
      var dx = e.tx - e.x, dy = e.ty - e.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = dx / dist, ny = dy / dist, want = e.speed, steer = 7, direct = false;
      if (!d.fly && dist > 70 && (e.tk === 0 || e.tk === 3)) {
        navStep(e.x, e.y, e.tk === 3 ? DIST_CORE : DIST_PLAYER);
        if (NAV.ok) { nx = NAV.x; ny = NAV.y; }
      }
      var dvx = nx * want, dvy = ny * want;
      var pdx = p.x - e.x, pdy = p.y - e.y, pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
      switch (e.type) {
        case 'mite': case 'spore': case 'splitter':
          var wob = Math.sin(this.clock * 5 + e.wob) * (e.type === 'splitter' ? 0.15 : 0.35);
          dvx = (nx - ny * wob) * want; dvy = (ny + nx * wob) * want;
          break;
        case 'shell':
          break;
        case 'dasher':
          if (e.state === 0) {
            e.cd -= DT;
            if (pdist < d.dashRange && e.cd <= 0 && battle) {
              e.state = 1; e.st = d.aim;
              var lx = p.x + p.vx * 0.12 - e.x, ly = p.y + p.vy * 0.12 - e.y, ll = Math.sqrt(lx * lx + ly * ly) || 1;
              e.dx = lx / ll; e.dy = ly / ll;
              this.emit('dashWarn');
            }
          } else if (e.state === 1) {
            dvx = dvy = 0; steer = 14;
            e.st -= DT;
            if (e.st <= 0) { e.state = 2; e.st = d.dash; this.emit('edash'); }
          } else if (e.state === 2) {
            e.vx = e.dx * d.dashSpeed; e.vy = e.dy * d.dashSpeed; direct = true;
            e.st -= DT;
            if (e.st <= 0) { e.state = 3; e.st = d.recover; }
          } else {
            dvx *= 0.25; dvy *= 0.25;
            e.st -= DT;
            if (e.st <= 0) { e.state = 0; e.cd = this.RR(d.cdMin, d.cdMax); }
          }
          break;
        case 'bomber':
          if (e.state === 0) {
            if (dist < d.trigger + (e.tk === 1 ? e.tref.d.r : (e.tk === 3 ? this.core.r : 0)) && battle) { e.state = 1; e.st = d.fuse; this.emit('fuse'); }
          } else {
            dvx = dvy = 0; steer = 12;
            e.st -= DT;
            if (e.st <= 0) {
              // 引信烧完：炸你、炸塔、炸兵，也会炸到它身边的同伴
              e.on = false; this.enemyCount--;
              this.queueBlast(e.x, e.y, d.blast, e.dmg * 2, e.dmg, this.envSrc, d.color, d.name, 240);
              this.stop(2);
              continue;
            }
          }
          break;
        case 'spitter':
          if (e.state === 0) {
            if (pdist < d.keep - 30) { dvx = -pdx / pdist * want; dvy = -pdy / pdist * want; }
            else if (pdist < d.keep + 40) { dvx = -pdy / pdist * want * 0.6; dvy = pdx / pdist * want * 0.6; }
            e.cd -= DT;
            if (e.cd <= 0 && pdist < d.keep + 120 && battle) {
              e.state = 1; e.st = d.aim; e.dx = p.x; e.dy = p.y;
              this.emit('spitAim');
            }
          } else {
            dvx = dvy = 0; steer = 14;
            e.st -= DT;
            if (e.st <= 0) {
              var bx = e.dx - e.x, by = e.dy - e.y, bl = Math.sqrt(bx * bx + by * by) || 1;
              var b = take(this.ebullets);
              if (b) {
                b.x = e.x + bx / bl * e.r; b.y = e.y + by / bl * e.r; b.vx = bx / bl * d.boltSpeed; b.vy = by / bl * d.boltSpeed;
                b.life = 2.5; b.dmg = e.dmg; b.r = 4; b.kind = 'bolt'; b.src = d.name;
              }
              e.state = 0; e.cd = this.RR(d.fireCdMin, d.fireCdMax);
              this.emit('spit');
            }
          }
          break;
        case 'shielder':
          if (pdist < d.keep - 20) { dvx = -pdx / pdist * want; dvy = -pdy / pdist * want; }
          else if (pdist < d.keep + 50) { dvx *= 0.1; dvy *= 0.1; }
          // 连接身边最多 4 个同伴，替它们减伤
          e.lkN = 0;
          var lc = this.near(e.x, e.y, d.link);
          for (var q = 0; q < lc && e.lkN < d.links; q++) {
            var oi = this.nbuf[q], o = this.enemies[oi];
            if (!o.on || o === e || o.type === 'shielder' || o.spawnT > 0) continue;
            var ox = o.x - e.x, oy = o.y - e.y;
            if (ox * ox + oy * oy > d.link * d.link) continue;
            o.shieldT = 0.2;
            e.lk[e.lkN++] = oi;
          }
          break;
        case 'warden':
          if (pdist < 110) { dvx *= 0.15; dvy *= 0.15; }
          if (battle) {
            e.fireT -= DT;
            e.charging = e.fireT <= d.charge;
            if (e.fireT <= 0) { this.wardenFire(e); e.fireT = d.fireCd; e.charging = false; }
          }
          break;
        case 'boss':
          if (this.updateBoss(e, pdist, battle)) direct = true;
          dvx = e.bvx; dvy = e.bvy;
          break;
        case 'brood':
          if (pdist < 140) { dvx *= 0.2; dvy *= 0.2; }
          if (battle) {
            e.fireT -= DT;
            e.charging = e.fireT <= 0.6;
            if (e.fireT <= 0) {
              e.fireT = d.spawnCd; e.charging = false;
              for (var k2 = 0; k2 < d.spawnN; k2++) {
                if (this.enemyCount >= T.MAX_ENEMIES) break;
                var a2 = this.R() * TAU, sp2 = this.spawnEnemy('spore', e.x + Math.cos(a2) * e.r, e.y + Math.sin(a2) * e.r, e.goalCore);
                if (sp2) { sp2.spawnT = 0.1; sp2.kvx = Math.cos(a2) * 180; sp2.kvy = Math.sin(a2) * 180; }
              }
              this.ringFx(e.x, e.y, e.r, e.r + 24, 0.3, d.color, 3);
              this.emit('broodSpawn');
            }
          }
          break;
      }
      if (!direct) {
        var kk = Math.min(1, steer * DT);
        e.vx += (dvx - e.vx) * kk; e.vy += (dvy - e.vy) * kk;
      }
      // 软分离
      var cnt = this.near(e.x, e.y, e.r + 30);
      for (var j = 0; j < cnt; j++) {
        var oj = this.nbuf[j];
        if (oj === i) continue;
        var ot = this.enemies[oj];
        if (!ot.on || ot.spawnT > 0) continue;
        var sx = e.x - ot.x, sy = e.y - ot.y, rr = e.r + ot.r, s2 = sx * sx + sy * sy;
        if (s2 >= rr * rr || s2 < 0.0001) continue;
        var sd = Math.sqrt(s2), push = (rr - sd) * (e.elite ? 0.05 : (ot.elite ? 0.5 : 0.25));
        e.x += sx / sd * push; e.y += sy / sd * push;
      }
      var mv = direct ? 1 : slow;
      e.x += (e.vx * mv + e.kvx) * DT; e.y += (e.vy * mv + e.kvy) * DT;
      e.kvx *= KNOCK_DECAY; e.kvy *= KNOCK_DECAY;
      if (e.type === 'boss' && e.state === 4 && (e.x < AX0 + e.r || e.x > AX1 - e.r || e.y < AY0 + e.r || e.y > AY1 - e.r)) { e.st = 0; this.shake = Math.min(1, this.shake + 0.4); }
      if (e.x < AX0 + e.r) { e.x = AX0 + e.r; if (e.state === 2 && e.type === 'dasher') e.st = 0; }
      if (e.x > AX1 - e.r) { e.x = AX1 - e.r; if (e.state === 2 && e.type === 'dasher') e.st = 0; }
      if (e.y < AY0 + e.r) { e.y = AY0 + e.r; if (e.state === 2 && e.type === 'dasher') e.st = 0; }
      if (e.y > AY1 - e.r) { e.y = AY1 - e.r; if (e.state === 2 && e.type === 'dasher') e.st = 0; }
      this.pushOutOfTowers(e, e.r);
      this.pushOutOfCore(e, e.r);
      if (!d.fly && collideGrid(e, e.r)) {
        if (e.type === 'dasher' && e.state === 2) e.st = 0;
        if (e.type === 'boss' && e.state === 4) { e.st = 0; this.shake = Math.min(1, this.shake + 0.4); }
      }
      if (!battle) continue;
      // 撞塔 / 撞兵
      if (e.tk === 1 && e.tref && e.tref.on && e.chewT <= 0) {
        var tdx = e.tref.x - e.x, tdy = e.tref.y - e.y, trr = e.tref.d.r + e.r + 4;
        if (tdx * tdx + tdy * tdy < trr * trr) { e.chewT = d.chewCd || 1; this.hurtTower(e.tref, e.dmg); }
      } else if (e.tk === 2 && e.tref && e.tref.on && e.chewT <= 0) {
        var sdx = e.tref.x - e.x, sdy = e.tref.y - e.y, srr = e.tref.r + e.r + 2;
        if (sdx * sdx + sdy * sdy < srr * srr) { e.chewT = 0.7; this.hurtSoldier(e.tref, e.dmg); }
      } else if (e.tk === 3 && e.chewT <= 0) {
        var co = this.core, kdx = co.x - e.x, kdy = co.y - e.y, krr = co.r + e.r + 4;
        if (kdx * kdx + kdy * kdy < krr * krr) { e.chewT = d.chewCd || 0.9; this.hurtCore(e.dmg, d.name); }
      }
      // 撞玩家：能吞就吞，吞不下就挨打；冲刺中撞到的怪吃一下冲刺伤害
      var cr = e.r + p.r - 2;
      if (pdx * pdx + pdy * pdy < cr * cr) {
        if (this.canEat(e)) { this.eatEnemy(e); continue; }
        if (p.dashT > 0 && e.dashHit !== p.dashId) {
          e.dashHit = p.dashId;
          this.hitEnemy(e, DASH.dmg * this.st.dmg, p.dx, p.dy, DASH.knock, this.dashSrc, false);
          continue;
        }
        if (p.inv <= 0) this.hurtPlayer(e.type === 'boss' && e.state === 4 ? e.dmg * d.charge.mul : e.dmg, d.name, e.x, e.y);
      }
    }
  };

  // ---------- 核心舱 ----------
  G.hurtCore = function (dmg, who) {
    var co = this.core;
    if (this.mode !== 'battle' || co.hp <= 0) return;
    co.hp -= dmg; co.flash = 0.12;
    if (co.alert <= 0) this.emit('coreAlert');
    co.alert = 2.5;
    this.emit('coreHit');
    if (co.hp <= 0) {
      co.hp = 0;
      this.lastHits.push({ src: (who || '敌人') + ' → 圣火', dmg: dmg, wave: this.wave });
      if (this.lastHits.length > 3) this.lastHits.shift();
      this.burst(co.x, co.y, 50, '#ff3b5c', 320, 4, true);
      this.ringFx(co.x, co.y, co.r, 220, 0.8, '#ff3b5c', 8);
      this.flash = 0.6; this.shake = 1;
      this.deathCause = 'core';
      this.die();
    }
  };
  G.coreRepairCost = function () { return Math.round(T.core.repairCost * this.priceMul()); };
  G.coreArmorCost = function () { return Math.round(T.core.armorCost * this.priceMul() * (1 + 0.3 * ((this.core.maxHp - T.core.hp) / T.core.armorHp))); };
  G.repairCore = function () {
    var co = this.core, c = this.coreRepairCost();
    if (co.hp >= co.maxHp) return '圣火是满的';
    if (this.shardCount < c) return '金币不足，需要 ' + c;
    this.shardCount -= c; co.hp = Math.min(co.maxHp, co.hp + co.maxHp * T.core.repairPart);
    this.emit('buy', 'repair');
    return 'ok';
  };
  G.armorCore = function () {
    var co = this.core, c = this.coreArmorCost();
    if (this.shardCount < c) return '金币不足，需要 ' + c;
    this.shardCount -= c; co.maxHp += T.core.armorHp; co.hp += T.core.armorHp;
    this.emit('buy', 'armor');
    return 'ok';
  };

  // ---------- Boss：裂星者。砸地 / 旋转弹幕 / 直线冲撞，半血后狂暴召唤 ----------
  G.updateBoss = function (e, pdist, battle) {
    var d = e.d, p = this.player, ph = e.enraged ? 1 : 0, direct = false;
    var pdx = p.x - e.x, pdy = p.y - e.y, pl = pdist || 1;
    e.bvx = pdx / pl * e.speed; e.bvy = pdy / pl * e.speed;
    if (!battle) return false;
    if (!e.enraged && e.hp < e.maxHp * d.phase2) {
      e.enraged = true; e.sumT = 0.6; e.state = 0; e.st = 1.0;
      this.flash = Math.max(this.flash, 0.5); this.shake = 1; this.stop(10, true);
      this.ringFx(e.x, e.y, e.r, 260, 0.7, d.color, 8);
      this.emit('bossRage');
    }
    if (e.enraged) {
      e.sumT -= DT;
      if (e.sumT <= 0) {
        e.sumT = d.summonCd;
        for (var k = 0; k < d.summon.length; k++) {
          var a = k * TAU / d.summon.length + this.R();
          var m = this.spawnEnemy(d.summon[k], clampX(e.x + Math.cos(a) * (e.r + 20), 20), clampY(e.y + Math.sin(a) * (e.r + 20), 20), false);
          if (m) { m.spawnT = 0.15; m.kvx = Math.cos(a) * 200; m.kvy = Math.sin(a) * 200; }
        }
        this.ringFx(e.x, e.y, e.r, e.r + 60, 0.4, '#ff9ab0', 4);
        this.emit('broodSpawn');
      }
    }
    switch (e.state) {
      case 0:
        e.st -= DT;
        if (e.st <= 0) {
          var pick = e.atk % 3; e.atk++;
          if (pick === 0) { e.state = 1; e.st = d.slam.tele[ph]; e.ax = p.x; e.ay = p.y; this.emit('bossSlamWarn'); }
          else if (pick === 1) { e.state = 2; e.st = d.barrage.dur + ph * 0.8; e.fireT = 0; e.wob = Math.atan2(pdy, pdx); }
          else { e.state = 3; e.st = d.charge.aim - ph * 0.2; e.dx = pdx / pl; e.dy = pdy / pl; this.emit('dashWarn'); }
        }
        break;
      case 1: // 砸地预警：锁定你当时的位置
        e.bvx *= 0.3; e.bvy *= 0.3;
        e.st -= DT;
        if (e.st <= 0) {
          this.queueBlast(e.ax, e.ay, d.slam.r, 0, e.dmg * d.slam.mul, null, d.color, d.name + '砸地', 260);
          this.ringFx(e.ax, e.ay, 10, d.slam.r * 1.4, 0.5, '#ffffff', 5);
          this.decal(e.ax, e.ay, d.slam.r * 0.9, 'rgba(40,0,10,0.6)');
          this.stop(4, true); this.shake = Math.min(1, this.shake + 0.5);
          this.emit('bossSlam');
          e.state = 0; e.st = d.rest[ph];
        }
        break;
      case 2: // 旋转弹幕
        e.bvx = 0; e.bvy = 0;
        e.st -= DT; e.fireT -= DT;
        if (e.fireT <= 0) {
          var B = d.barrage, arms = B.arms + ph;
          e.fireT = B.every;
          for (var q = 0; q < arms; q++) {
            var b = take(this.ebullets);
            if (!b) break;
            var ang = e.wob + q * TAU / arms;
            b.x = e.x + Math.cos(ang) * e.r; b.y = e.y + Math.sin(ang) * e.r;
            b.vx = Math.cos(ang) * B.speed; b.vy = Math.sin(ang) * B.speed;
            b.life = 5; b.dmg = B.dmg * (1 + RW.GROWTH.dmgC * (this.wave - 1)); b.r = 6; b.kind = 'orb'; b.src = d.name + '弹幕';
          }
          e.wob += B.turn * (ph ? -1.2 : 1);
          this.emit('eliteFire');
        }
        if (e.st <= 0) { e.state = 0; e.st = d.rest[ph]; }
        break;
      case 3: // 冲撞瞄准
        e.bvx = 0; e.bvy = 0;
        e.st -= DT;
        if (e.st <= 0) { e.state = 4; e.st = d.charge.time; this.emit('edash'); }
        break;
      case 4: // 冲撞
        e.vx = e.dx * d.charge.speed; e.vy = e.dy * d.charge.speed; direct = true;
        e.st -= DT;
        if (Math.random() < 0.6) this.decal(e.x, e.y, e.r * 0.5, 'rgba(60,0,20,0.35)');
        if (e.st <= 0) { e.state = 0; e.st = d.rest[ph]; e.vx *= 0.2; e.vy *= 0.2; }
        break;
    }
    return direct;
  };

  G.wardenFire = function (e) {
    var d = e.d, n = this.wave >= d.lateWave ? d.bulletsLate : d.bullets;
    var off = this.R() * TAU, dmg = d.bulletDmg * (1 + RW.GROWTH.dmgC * (this.wave - 1));
    for (var k = 0; k < n; k++) {
      var b = take(this.ebullets);
      if (!b) break;
      var a = off + k * TAU / n;
      b.x = e.x + Math.cos(a) * e.r; b.y = e.y + Math.sin(a) * e.r;
      b.vx = Math.cos(a) * d.bulletSpeed; b.vy = Math.sin(a) * d.bulletSpeed;
      b.life = 6; b.dmg = dmg; b.r = 5; b.kind = 'orb'; b.src = RW.ENEMIES.warden.name + '弹幕';
    }
    this.ringFx(e.x, e.y, e.r, e.r + 30, 0.3, '#ff9ab0', 3);
    this.emit('eliteFire');
  };

  G.updateEBullets = function () {
    var p = this.player, battle = this.mode === 'battle';
    for (var i = 0; i < this.ebullets.length; i++) {
      var b = this.ebullets[i];
      if (!b.on) continue;
      if (!battle) { b.on = false; continue; }
      b.x += b.vx * DT; b.y += b.vy * DT; b.life -= DT;
      if (b.life <= 0 || b.x < AX0 || b.x > AX1 || b.y < AY0 || b.y > AY1) { b.on = false; continue; }
      var dx = b.x - p.x, dy = b.y - p.y, rr = b.r + p.r - 2;
      if (p.inv <= 0 && dx * dx + dy * dy < rr * rr) { b.on = false; this.hurtPlayer(b.dmg, b.src, b.x - b.vx, b.y - b.vy); continue; }
      var co = this.core, kx = b.x - co.x, ky = b.y - co.y, kr = b.r + co.r;
      if (kx * kx + ky * ky < kr * kr) { b.on = false; this.hurtCore(b.dmg, b.src); continue; }
      for (var t = 0; t < this.towers.length; t++) {
        var tw = this.towers[t];
        if (!tw.on) continue;
        var tx = b.x - tw.x, ty = b.y - tw.y, tr = b.r + tw.d.r;
        if (tx * tx + ty * ty < tr * tr) { b.on = false; this.hurtTower(tw, b.dmg); break; }
      }
    }
  };

  G.hurtPlayer = function (dmg, source, fx, fy) {
    var p = this.player;
    if (p.inv > 0 || this.mode !== 'battle') return;
    if (this.st.dodge > 0 && this.R() < this.st.dodge) {   // 闪避：不掉血，短暂无敌
      p.inv = 0.25;
      var nd = take(this.nums, true);
      nd.x = p.x; nd.y = p.y - 16; nd.kind = 'heal'; nd.text = '闪避'; nd.vy = -50; nd.life = nd.max = 0.6;
      this.emit('dodge');
      return;
    }
    if (this.st.thorns > 0) {   // 荆棘：反震身边的敌人
      var tr = T.thornsR, near = this.near(p.x, p.y, tr), td = this.st.thorns * this.st.dmg, ids = [];
      for (var ti = 0; ti < near; ti++) ids.push(this.nbuf[ti]);   // 先拷出来：击杀可能再次用到 nbuf
      for (ti = 0; ti < ids.length; ti++) {
        var te = this.enemies[ids[ti]];
        if (!te.on || te.spawnT > 0) continue;
        var tx = te.x - p.x, ty = te.y - p.y, tl = Math.sqrt(tx * tx + ty * ty) || 1;
        if (tl > tr + te.r) continue;
        this.hitEnemy(te, td, tx / tl, ty / tl, 160, this.thornSrc, false);
      }
      this.ringFx(p.x, p.y, 8, tr, 0.3, '#9fc4ff', 3);
    }
    p.hurtT = 0.3;
    var d = dmg * this.st.takenMul;
    p.hp -= d; p.inv = P.iframes;
    var ax = p.x - fx, ay = p.y - fy, al = Math.sqrt(ax * ax + ay * ay) || 1;
    p.pvx += ax / al * P.hurtPush; p.pvy += ay / al * P.hurtPush;
    this.addNum(p.x, p.y - 16, d, 'hurt');
    this.burst(p.x, p.y, 10, '#ff4d6d', 170, 2.5, false);
    this.shake = Math.min(1, this.shake + 0.55);
    this.stop(T.hitstop.playerHurt, true);
    this.lastHits.push({ src: source, dmg: d, wave: this.wave });
    if (this.lastHits.length > 3) this.lastHits.shift();
    this.emit('hurt');
    if (p.hp <= 0) { p.hp = 0; this.die(); }
  };

  G.die = function () {
    this.mode = 'down';
    this.downT = 1.1;
    this.burst(this.player.x, this.player.y, 34, RW.EVO[this.player.stage].color, 260, 3, true);
    this.emit('die');
  };
  G.canRevive = function () { return !this.reviveUsed && this.wave >= RW.AD.FIRST_AD_WAVE; };
  G.afterDeath = function () {
    if (this.canRevive()) { this.mode = 'revive'; this.emit('reviveOffer'); }
    else this.finishRun();
  };
  G.revive = function () {
    var p = this.player;
    this.reviveUsed = true;
    p.hp = Math.ceil(p.maxHp * 0.6); p.inv = 2.2;
    var co = this.core; co.hp = Math.max(co.hp, co.maxHp * 0.5); this.deathCause = '';
    for (var i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.on) continue;
      var dx = e.x - p.x, dy = e.y - p.y, d2 = dx * dx + dy * dy;
      if (d2 < 170 * 170 && !e.elite) this.killEnemy(e, null, 'silent');
      else { var d = Math.sqrt(d2) || 1; e.kvx += dx / d * 300 * e.knockRes; e.kvy += dy / d * 300 * e.knockRes; }
    }
    clearPool(this.ebullets);
    this.ringFx(p.x, p.y, 10, 190, 0.55, RW.EVO[p.stage].color, 6);
    this.flash = 0.5;
    this.mode = 'battle';
    this.emit('revive');
  };
  G.finishRun = function () {
    var reached = this.wave;
    var newBest = reached > this.best;
    if (newBest) this.best = reached;
    var ws = [], i;
    for (i = 0; i < this.weapons.length; i++) {
      var w = this.weapons[i];
      ws.push({ name: w.d.name + ' ' + ['I', 'II', 'III'][w.tier - 1], dmg: Math.round(w.dmg), kills: w.kills, color: w.d.color });
    }
    for (var id in this.towerStats) { var ts = this.towerStats[id]; if (ts.dmg > 0) ws.push({ name: ts.name + (id === 'barracks' ? '士兵' : ''), dmg: Math.round(ts.dmg), kills: ts.kills, color: ts.color }); }
    var extra = [this.skill, this.dashSrc, this.envSrc, this.coreSrc].concat(this.retiredSkills || []);
    for (i = 0; i < extra.length; i++) { var x = extra[i]; if (x && x.dmg > 0) ws.push({ name: x.name, dmg: Math.round(x.dmg), kills: x.kills, color: x.color }); }
    if (this.eatSrc.kills > 0) ws.push({ name: '践踏（只数）', dmg: this.eatSrc.kills, kills: this.eatSrc.kills, color: this.eatSrc.color, count: true });
    ws.sort(function (a, b) { return b.dmg - a.dmg; });
    var unlocked = this.recordProgress(reached);
    this.result = { unlocked: unlocked, hero: this.clsId, wave: reached, kills: this.kills, shards: this.totalShards, list: ws, hits: this.lastHits.slice(), newBest: newBest, best: this.best,
      stage: RW.EVO[this.player.stage].name, towers: this.built, streak: this.bestStreak, coreDown: this.deathCause === 'core' };
    this.mode = 'result';
    this.emit('result');
  };

  // 局外进度：累计数据 + 各英雄最高波数，返回本局新解锁的英雄
  G.recordProgress = function (reached) {
    var pr = this.prog || (this.prog = {});
    pr.unlocked = pr.unlocked || {}; pr.heroBest = pr.heroBest || {};
    pr.kills = (pr.kills || 0) + this.kills;
    pr.coins = (pr.coins || 0) + this.totalShards;
    pr.built = (pr.built || 0) + this.built;
    pr.runs = (pr.runs || 0) + 1;
    var id = this.clsId;
    if (id) pr.heroBest[id] = Math.max(pr.heroBest[id] || 0, reached);   // 「打到第 n 波」= 到达第 n 波
    var out = [];
    for (var i = 0; i < RW.CLASS_ORDER.length; i++) {
      var h = RW.CLASS_ORDER[i];
      if (RW.isUnlocked(h, pr)) continue;
      var up = RW.unlockProgress(h, pr);
      if (up.have >= up.need) { pr.unlocked[h] = 1; out.push(h); }
    }
    return out;
  };

  // ================= 战意 / 凝神 / 回血火光 / 尸体 =================
  G.addMomentum = function (n) {
    var M = T.momentum;
    this.mom = Math.min(M.max, this.mom + n * M.per); this.momT = 0;
    var tier = 0;
    for (var i = 0; i < M.tiers.length; i++) if (this.mom >= M.tiers[i]) tier = i + 1;
    if (tier > this.momTier) {
      this.momTier = tier;
      var p = this.player;
      this.ringFx(p.x, p.y, p.r, 90 + tier * 30, 0.4, tier >= 3 ? '#ff5a2e' : '#ffc861', 4);
      if (tier >= 3) this.flash = Math.max(this.flash, 0.2);
      this.emit('momTier', tier);
    }
  };
  G.updateMomentum = function () {
    var M = T.momentum;
    this.momT += DT;
    if (this.momT > M.decayDelay && this.mom > 0) {
      this.mom = Math.max(0, this.mom - M.decay * DT);
      var tier = 0;
      for (var i = 0; i < M.tiers.length; i++) if (this.mom >= M.tiers[i]) tier = i + 1;
      if (tier < this.momTier) { this.momTier = tier; this.emit('momDown', tier); }
    }
  };
  G.updateFocus = function () {
    if (!this.cls || !this.cls.focus) { this.focus = 0; return; }
    var F = this.cls.focus, p = this.player, sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (sp < F.still && this.mode === 'battle') this.focusT = Math.min(F.per * F.max + 0.01, this.focusT + DT);
    else this.focusT = Math.max(0, this.focusT - DT * (F.per * F.max / F.decay));
    var n = Math.min(F.max, Math.floor(this.focusT / F.per));
    if (n > this.focus && n === F.max) { this.ringFx(p.x, p.y, p.r, 40, 0.3, '#ffffff', 3); this.emit('focusMax'); }
    this.focus = n;
  };
  G.spawnHeal = function (x, y) {
    var h = take(this.heals);
    if (!h) return;
    h.x = x; h.y = y; h.life = T.healOrb.life; h.sp = 0;
  };
  G.updateHeals = function () {
    var p = this.player, pr = P.pickup * this.st.pickup + 10;
    for (var i = 0; i < this.heals.length; i++) {
      var h = this.heals[i];
      if (!h.on) continue;
      h.life -= DT;
      if (h.life <= 0 || this.mode === 'shop') { h.on = false; continue; }
      var dx = p.x - h.x, dy = p.y - h.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < pr) { h.sp = Math.min(500, h.sp + 1500 * DT); h.x += dx / d * h.sp * DT; h.y += dy / d * h.sp * DT; }
      if (d < p.r + 6) {
        h.on = false;
        var before = p.hp;
        p.hp = Math.min(p.maxHp, p.hp + T.healOrb.heal);
        if (p.hp > before) this.addNum(p.x, p.y - 18, p.hp - before, 'heal');
        if (this.st.healCore > 0) { var co = this.core; co.hp = Math.min(co.maxHp, co.hp + this.st.healCore); }
        this.emit('heal');
      }
    }
  };
  G.spawnCorpse = function (e, how) {
    if (how === 'eat') return;
    var c = take(this.corpses, true), k = e.hk || 120;
    var hx = e.hx || 0, hy = e.hy || 0, hl = Math.sqrt(hx * hx + hy * hy);
    if (hl < 0.01) { var a = this.R() * TAU; hx = Math.cos(a); hy = Math.sin(a); hl = 1; }
    var boost = e.elite ? 0.35 : 1, sp = (140 + Math.min(k, 340) * 0.9) * boost;
    c.x = e.x; c.y = e.y; c.z = 0; c.vx = hx / hl * sp; c.vy = hy / hl * sp;
    c.vz = (170 + Math.min(k, 300) * 0.7) * boost; c.rot = Math.atan2(e.vy || 0.01, e.vx || 0.01); c.rv = this.RR(-12, 12);
    c.tilt = 0; c.tv = this.RR(6, 14) * (this.R() < 0.5 ? -1 : 1); c.type = e.type; c.r = e.r; c.color = e.d.color;
    c.life = c.max = e.elite ? 1.8 : 1.3;
  };
  G.updateCorpses = function () {
    for (var i = 0; i < this.corpses.length; i++) {
      var c = this.corpses[i];
      if (!c.on) continue;
      c.life -= DT;
      if (c.life <= 0) { c.on = false; continue; }
      c.vz -= 1100 * DT; c.z += c.vz * DT;
      if (c.z < 0) { c.z = 0; c.vz = -c.vz * 0.3; c.vx *= 0.55; c.vy *= 0.55; c.rv *= 0.5; c.tv *= 0.4; }
      c.x += c.vx * DT; c.y += c.vy * DT; c.rot += c.rv * DT;
      c.tilt = Math.max(-1.57, Math.min(1.57, c.tilt + c.tv * DT));
      if (!walkable(c.x, c.y) && c.z < 6) { c.vx *= -0.3; c.vy *= -0.3; }
    }
  };

  // ================= 绿球（吃了长质量） =================
  G.updateOrbs = function () {
    var p = this.player, reach = p.r + 12;
    for (var i = 0; i < this.orbs.length; i++) {
      var o = this.orbs[i];
      if (!o.on) continue;
      if (o.dead > 0) { o.dead -= DT; if (o.dead <= 0) { this.placeOrb(o); o.bob = 0; } continue; }
      var dx = p.x - o.x, dy = p.y - o.y, d2 = dx * dx + dy * dy;
      if (d2 < reach * reach) {
        if (d2 < (p.r + o.r) * (p.r + o.r)) {
          o.dead = T.biomass.respawn;
          this.addMass(o.r > 5 ? 3 : T.biomass.mass);
          this.burst(o.x, o.y, 5, '#7dff9b', 90, 2, false);
          this.emit('gulp');
        } else { var dl = Math.sqrt(d2); o.x += dx / dl * 120 * DT; o.y += dy / dl * 120 * DT; }
      }
    }
  };

  // ================= 金币 =================
  G.spawnShard = function (x, y, val) {
    var s = take(this.shards);
    if (!s) return;
    var a = this.R() * TAU, sp = this.RR(40, 110);
    s.x = x; s.y = y; s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
    s.val = val; s.life = T.shard.life; s.mag = false; s.recall = false; s.tower = null; s.sp = 0;
  };
  G.updateShards = function () {
    var p = this.player, s = this.st;
    var pr = P.pickup * s.pickup + (p.r - P.radius), pr2 = pr * pr;
    for (var i = 0; i < this.shards.length; i++) {
      var sh = this.shards[i];
      if (!sh.on) continue;
      if (sh.tower) {
        var tw = sh.tower;
        if (!tw.on) { sh.tower = null; continue; }
        var tdx = tw.x - sh.x, tdy = tw.y - sh.y, tl = Math.sqrt(tdx * tdx + tdy * tdy);
        if (tl < 10) { this.collectShard(sh, 1 + RW.TOWERS.siphon.bonus[this.tech.siphon - 1]); continue; }
        var ts = Math.min(tl / DT, RW.TOWERS.siphon.pull);
        sh.x += tdx / tl * ts * DT; sh.y += tdy / tl * ts * DT;
        continue;
      }
      var dx = p.x - sh.x, dy = p.y - sh.y, d2 = dx * dx + dy * dy;
      if (sh.mag) {
        var dl = Math.sqrt(d2) || 1;
        sh.sp = Math.min(T.shard.magnetSpeed * (sh.recall ? 2 : 1), sh.sp + 1500 * DT);
        if (dl < p.r + 6 || dl < sh.sp * DT) { this.collectShard(sh, sh.recall ? T.shard.recallRate : 1); continue; }
        sh.x += dx / dl * sh.sp * DT; sh.y += dy / dl * sh.sp * DT;
        continue;
      }
      sh.x += sh.vx * DT; sh.y += sh.vy * DT; sh.vx *= 0.9; sh.vy *= 0.9;
      sh.life -= DT;
      if (sh.life <= 0) { sh.on = false; this.spark(sh.x, sh.y, '#3a8a7a'); continue; }
      if (this.mode === 'battle' && d2 < pr2) { sh.mag = true; sh.sp = 120; continue; }
      var rg = RW.TOWERS.siphon.range * RW.TOWER_TIER.range[this.tech.siphon - 1];
      for (var t = 0; t < this.towers.length; t++) {
        var tt = this.towers[t];
        if (!tt.on || tt.id !== 'siphon' || tt.build > 0) continue;
        var sx = tt.x - sh.x, sy = tt.y - sh.y;
        if (sx * sx + sy * sy < rg * rg) { sh.tower = tt; break; }
      }
    }
  };
  G.collectShard = function (sh, mul) {
    sh.on = false;
    this.shardFrac += sh.val * this.st.harvest * mul;
    var whole = Math.floor(this.shardFrac + 1e-6);
    this.shardFrac -= whole;
    this.shardCount += whole; this.totalShards += whole;
    this.combo = Math.min(this.combo + 1, 24); this.comboT = 0.5;
    this.emit('pickup', this.combo);
  };

  // ================= 波次结束 =================
  G.clearWave = function () {
    this.mode = 'clear';
    this.clearT = 1.6;
    for (var i = 0; i < this.enemies.length; i++) { var e = this.enemies[i]; if (e.on) this.killEnemy(e, null, 'silent'); }
    this.enemyCount = 0;
    clearPool(this.marks); clearPool(this.ebullets); clearPool(this.missiles); clearPool(this.blasts);
    if (this.skill) { this.skill.veilT = 0; this.skill.wellT = 0; }
    for (var j = 0; j < this.shards.length; j++) { var s = this.shards[j]; if (s.on && !s.tower && !s.mag) { s.mag = true; s.recall = true; s.sp = 60; } }
    this.ringFx(this.player.x, this.player.y, 10, 700, 0.8, '#5ef2ff', 3);
    this.emit('waveClear', this.wave);
  };

  // ================= 整备（商店） =================
  G.priceMul = function () { return (1 + T.priceGrowth * Math.max(0, this.wave - 1)) * (this.st ? this.st.shopPrice : 1); };
  G.enterShop = function () {
    clearPool(this.shards); clearPool(this.mines); clearPool(this.bullets);
    for (var w = 0; w < this.weapons.length; w++) this.weapons[w].mineCount = 0;
    if (!this.shop) this.shop = { slots: [], rerolls: 0, adUsed: false };
    this.shop.rerolls = 0; this.shop.adUsed = false;
    this.shop.free = Math.round(this.st.freeReroll);
    this.shop.interest = 0;
    if (this.st.interest > 0) {   // 利息：按手上金币发放
      var it = Math.min(T.interestCap, Math.floor(this.shardCount * this.st.interest));
      if (it > 0) { this.shardCount += it; this.totalShards += it; this.shop.interest = it; }
    }
    this.rollShop(true);
    this.mode = 'shop';
    this.emit('shop');
  };
  G.modCount = function (id) { return this.mods[id] || 0; };
  G.offerFor = function (kind, id) {
    var pm = this.priceMul(), o = { kind: kind, id: id, locked: false, sold: false, price: 0, tier: 1, upgrade: false, replace: '' };
    if (kind === 'weapon') {
      var w = this.findWeapon(id), d = RW.WEAPONS[id];
      o.tier = w ? w.tier + 1 : 1; o.upgrade = !!w;
      o.price = Math.round(d.cost * RW.TIER_COST[o.tier - 1] * pm);
    } else if (kind === 'tech') {
      o.tier = this.tech[id] + 1; o.upgrade = true;
      o.price = Math.round(RW.TOWERS[id].techCost * RW.TECH_COST[o.tier - 1] * pm);
    } else if (kind === 'skill') {
      var sk = this.skill, sd = RW.SKILLS[id];
      if (sk && sk.id === id) { o.tier = sk.tier + 1; o.upgrade = true; }
      else { o.tier = 1; o.replace = sk ? sk.d.name : ''; }
      o.price = Math.round(sd.cost * RW.TIER_COST[o.tier - 1] * pm);
    } else {
      var md = RW.MODS[id];
      o.price = Math.round(md.cost * pm * (1 + 0.25 * this.modCount(id)));
    }
    return o;
  };
  G.candidates = function (kind, exclude) {
    var out = [], i, id;
    if (kind === 'weapon') {
      for (i = 0; i < RW.WEAPON_ORDER.length; i++) {
        id = RW.WEAPON_ORDER[i];
        var w = this.findWeapon(id);
        if (w ? w.tier < 3 : this.weapons.length < RW.MAX_SLOTS) out.push(id);
      }
    } else if (kind === 'tech') {
      for (i = 0; i < RW.TOWER_ORDER.length; i++) { id = RW.TOWER_ORDER[i]; if (this.tech[id] < 3) out.push(id); }
    } else if (kind === 'skill') {
      for (i = 0; i < RW.SKILL_ORDER.length; i++) { id = RW.SKILL_ORDER[i]; if (!(this.skill && this.skill.id === id && this.skill.tier >= 3)) out.push(id); }
    } else {
      for (i = 0; i < RW.MOD_ORDER.length; i++) { id = RW.MOD_ORDER[i]; if (this.modCount(id) < RW.MODS[id].max) out.push(id); }
    }
    var res = [];
    for (i = 0; i < out.length; i++) if (!exclude[kind + ':' + out[i]]) res.push(out[i]);
    return res;
  };
  G.rollShop = function (keepLocked) {
    var shop = this.shop, slots = [], used = {};
    for (var i = 0; i < 4; i++) {
      var old = shop.slots[i];
      if (keepLocked && old && old.locked && !old.sold && this.candidates(old.kind, {}).indexOf(old.id) >= 0) {
        var re = this.offerFor(old.kind, old.id); re.locked = true;
        slots.push(re); used[old.kind + ':' + old.id] = true;
      } else slots.push(null);
    }
    for (var s = 0; s < 4; s++) {
      if (slots[s]) continue;
      var o = null;
      for (var tries = 0; tries < 10 && !o; tries++) {
        var r = this.R(), kind = r < 0.32 ? 'weapon' : (r < 0.7 ? 'mod' : (r < 0.84 ? 'skill' : 'tech'));
        var firstNew = this.wave <= 1 && s === 0;         // 第一次整备保证有一把「新」武器可选
        if (firstNew) kind = 'weapon';
        var c = this.candidates(kind, used);
        if (firstNew) { var self = this; c = c.filter(function (id) { return !self.findWeapon(id); }); }
        if (!c.length) continue;
        var id = kind === 'mod' ? this.pickMod(c) : c[Math.floor(this.R() * c.length)];
        o = this.offerFor(kind, id);
        used[kind + ':' + id] = true;
      }
      if (!o) { var cm = this.candidates('mod', used); if (cm.length) { o = this.offerFor('mod', cm[0]); used['mod:' + cm[0]] = true; } }
      slots[s] = o || { kind: 'none', sold: true, price: 0 };
    }
    shop.slots = slots;
  };
  // 按品质权重抽道具：先抽品质，该品质没货就往低一档找
  G.pickMod = function (c) {
    var wts = RW.rarityWeights(this.wave, this.st.luck), sum = 0, r, i;
    for (i = 0; i < wts.length; i++) sum += wts[i];
    var roll = this.R() * sum, want = 0;
    for (i = 0; i < wts.length; i++) { roll -= wts[i]; if (roll < 0) { want = i; break; } }
    for (r = want; r >= 0; r--) {
      var pool = c.filter(function (id) { return (RW.MODS[id].r || 0) === r; });
      if (pool.length) return pool[Math.floor(this.R() * pool.length)];
    }
    return c[Math.floor(this.R() * c.length)];
  };
  G.rerollCost = function () {
    if (this.shop.free > 0) return 0;
    return Math.round(T.rerollBase + T.rerollPerWave * (this.wave - 1) + T.rerollStep * this.shop.rerolls);
  };
  G.reroll = function (free) {
    if (!free && this.shop.free > 0) { this.shop.free--; free = true; }
    if (!free) {
      var c = this.rerollCost();
      if (this.shardCount < c) return false;
      this.shardCount -= c; this.shop.rerolls++;
    }
    this.rollShop(true);
    this.emit('reroll');
    return true;
  };
  G.toggleLock = function (i) {
    var sl = this.shop.slots[i];
    if (!sl || sl.sold) return;
    sl.locked = !sl.locked;
    this.emit('lock', sl.locked);
  };
  G.buy = function (i) {
    var sl = this.shop.slots[i];
    if (!sl || sl.sold) return '已售出';
    if (this.shardCount < sl.price) return '金币不足';
    if (sl.kind === 'weapon') {
      var w = this.findWeapon(sl.id);
      if (w) { if (w.tier >= 3) return '已满级'; w.tier++; w.spent += sl.price; }
      else { if (this.weapons.length >= RW.MAX_SLOTS) return '武器槽已满'; this.addWeapon(sl.id); this.weapons[this.weapons.length - 1].spent = sl.price; }
    } else if (sl.kind === 'mod') {
      if (this.modCount(sl.id) >= RW.MODS[sl.id].max) return '已达上限';
      this.mods[sl.id] = this.modCount(sl.id) + 1;
      this.recalc();
    } else if (sl.kind === 'tech') {
      if (this.tech[sl.id] >= 3) return '已满级';
      this.tech[sl.id]++;
      var hpm = RW.TOWER_TIER.hp[this.tech[sl.id] - 1];
      for (var t = 0; t < this.towers.length; t++) { var tw = this.towers[t]; if (tw.on && tw.id === sl.id) { tw.maxHp = tw.hp = tw.d.hp * hpm; } }
    } else if (sl.kind === 'skill') {
      this.setSkill(sl.id);
    } else return '无货';
    this.shardCount -= sl.price;
    sl.sold = true; sl.locked = false;
    this.refreshPrices();
    this.emit('buy', sl.kind);
    return 'ok';
  };
  G.refreshPrices = function () {
    var sl = this.shop.slots;
    for (var i = 0; i < sl.length; i++) {
      var o = sl[i];
      if (!o || o.sold || o.kind === 'none') continue;
      var valid = this.candidates(o.kind, {}).indexOf(o.id) >= 0;
      if (!valid) { o.sold = true; o.gone = true; continue; }
      var re = this.offerFor(o.kind, o.id);
      o.price = re.price; o.tier = re.tier; o.upgrade = re.upgrade; o.replace = re.replace;
    }
  };
  G.weaponSellValue = function (w) { return Math.floor(w.spent * T.sellRate); };
  G.sellWeapon = function (idx) {
    if (this.weapons.length <= 1) return false;
    var w = this.weapons[idx];
    if (!w) return false;
    this.shardCount += this.weaponSellValue(w);
    this.weapons.splice(idx, 1);
    this.refreshPrices();
    this.emit('sell');
    return true;
  };
  G.nextWave = function () { this.startWave(this.wave + 1); };

  // ================= 表现池 =================
  G.burst = function (x, y, n, color, speed, size, glow) {
    for (var i = 0; i < n; i++) {
      var p = take(this.parts, true);
      var a = this.R() * TAU, sp = speed * this.RR(0.3, 1);
      p.x = x; p.y = y; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      p.life = p.max = this.RR(0.25, 0.55); p.color = i % 3 === 0 ? '#ffffff' : color; p.size = size * this.RR(0.6, 1.2); p.drag = 0.88; p.glow = !!glow;
    }
  };
  G.spark = function (x, y, color) {
    for (var i = 0; i < 3; i++) {
      var p = take(this.parts, true);
      var a = this.R() * TAU, sp = this.RR(40, 130);
      p.x = x; p.y = y; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
      p.life = p.max = 0.16; p.color = color; p.size = 1.8; p.drag = 0.85; p.glow = true;
    }
  };
  G.decal = function (x, y, r, color) {
    var d = take(this.decals, true);
    d.x = x; d.y = y; d.r = r; d.life = d.max = 4; d.color = color;
  };
  G.addNum = function (x, y, val, kind) {
    var n = take(this.nums, true);
    n.x = x; n.y = y; n.kind = kind;
    var v = val < 1 && kind === 'hurt' ? Math.round(val * 10) / 10 : Math.max(1, Math.round(val));
    n.text = (kind === 'hurt' ? '-' : '') + v + (kind === 'crit' ? '!' : '');
    n.vy = kind === 'hurt' ? -50 : -62;
    n.life = n.max = kind === 'crit' ? 0.75 : 0.6;
  };
  G.updateFx = function () {
    var i;
    for (i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      if (!p.on) continue;
      p.life -= DT;
      if (p.life <= 0) { p.on = false; continue; }
      p.x += p.vx * DT; p.y += p.vy * DT; p.vx *= p.drag; p.vy *= p.drag;
    }
    for (i = 0; i < this.nums.length; i++) {
      var n = this.nums[i];
      if (!n.on) continue;
      n.life -= DT;
      if (n.life <= 0) { n.on = false; continue; }
      n.y += n.vy * DT; n.vy *= 0.9;
    }
    for (i = 0; i < this.fx.length; i++) {
      var f = this.fx[i];
      if (!f.on) continue;
      f.life -= DT;
      if (f.life <= 0) f.on = false;
    }
    for (i = 0; i < this.decals.length; i++) {
      var d = this.decals[i];
      if (!d.on) continue;
      d.life -= DT;
      if (d.life <= 0) d.on = false;
    }
  };

  RW.Game = Game;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
