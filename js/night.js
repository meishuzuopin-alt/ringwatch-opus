// 圣火守护者 · M0 夜战（北桥三分钟）。挂在 Game 上，由 G.update 在 nightOn 时转入。
// 波次模式不走这里。数值读 RW.NIGHT（js/data.js）。
(function (root) {
  var RW = root.RW;
  var T = RW.TUNE;
  var DT = T.DT;
  var G = RW.Game.prototype;
  var TAU = Math.PI * 2;

  function qa(g, type, extra) {
    if (RW.QA && RW.QA.hit) RW.QA.hit(g, type, extra);
  }
  function cellOf(p) {
    var cell = (RW.MAP && RW.MAP.cell) || 40;
    return { x: p.c * cell + cell / 2, y: p.r * cell + cell / 2 };
  }
  function postXY(name) {
    var M = RW.MAP, p = M && M.posts && M.posts[name];
    if (!p) return { x: T.core.x, y: T.core.y - 80 };
    return cellOf(p);
  }
  function gateXY(id) {
    var M = RW.MAP, s = M && M.spawns && M.spawns[id];
    if (!s) return postXY('approach');
    return cellOf(s);
  }
  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return d;
  }

  function buildSlots(N) {
    var ev = [], slots = N.slots || [], kinds = ['mite', 'dasher', 'spitter', 'warden'];
    var openerLeft = (N.opener && N.opener.n) || 0;
    var cut = N.spawnCutoff;
    for (var s = 0; s < slots.length; s++) {
      var sl = slots[s], t0 = sl.t0, t1 = Math.min(sl.t1, cut);
      if (t0 >= cut) continue;
      if (t1 <= t0) t1 = Math.min(cut, t0 + 0.05);
      for (var ki = 0; ki < kinds.length; ki++) {
        var kind = kinds[ki], n = sl[kind] | 0;
        if (!n) continue;
        var pinned = sl.at && sl.at[kind];
        if (pinned) {
          for (var a = 0; a < pinned.length && a < n; a++) {
            ev.push({ t: Math.min(pinned[a], cut - 0.02), type: kind, gate: sl.gates[a % sl.gates.length], telegraph: T.spawn.telegraph });
          }
          n -= pinned.length;
        }
        for (var i = 0; i < n; i++) {
          var u = (n === 1) ? 0.35 : (i + 0.5) / n;
          var item = { t: t0 + (t1 - t0) * u, type: kind, gate: sl.gates[i % sl.gates.length], telegraph: T.spawn.telegraph };
          if (kind === 'mite' && s === 0 && openerLeft > 0) {
            openerLeft--;
            item.t = 0; item.telegraph = N.opener.telegraph || 0; item.post = N.opener.post; item.opener = true;
          }
          ev.push(item);
        }
      }
    }
    ev.sort(function (a, b) { return a.t - b.t; });
    return ev;
  }
  function buildCurve(N) {
    var ev = [], acc = {}, i, cut = N.spawnCutoff;
    var bursts = N.bursts || [];
    for (i = 0; i < bursts.length; i++) {
      var b = bursts[i];
      for (var k = 0; k < b[2]; k++) ev.push({ t: Math.min(b[0], cut - 0.02), type: b[1], gate: 'S3', telegraph: T.spawn.telegraph });
    }
    for (var t = 0; t < cut; t += 0.5) {
      var seg = null, sp = N.spawn || [];
      for (i = 0; i < sp.length; i++) if (t >= sp[i][0] && t < sp[i][1]) seg = sp[i][2];
      if (!seg) continue;
      for (var type in seg) {
        acc[type] = (acc[type] || 0) + seg[type] * 0.5;
        while (acc[type] >= 1) { acc[type] -= 1; ev.push({ t: t, type: type, gate: 'S3', telegraph: T.spawn.telegraph }); }
      }
    }
    ev.sort(function (a, b) { return a.t - b.t; });
    return ev;
  }

  function placeTower(g, id, x, y) {
    var d = RW.TOWERS[id];
    if (!d) return;
    var found = RW.NAV.walkable(x, y);
    if (!found) {
      for (var r = 16; r <= 96 && !found; r += 16) for (var a = 0; a < 8 && !found; a++) {
        var nx = x + Math.cos(a * TAU / 8) * r, ny = y + Math.sin(a * TAU / 8) * r;
        if (RW.NAV.walkable(nx, ny)) { x = nx; y = ny; found = true; }
      }
    }
    if (!found) return;
    var tw = RW.take(g.towers);
    if (!tw) return;
    tw.id = id; tw.d = d; tw.x = x; tw.y = y;
    tw.cd = 0.25; tw.build = 0; tw.pulse = 0; tw.flash = 0; tw.spawnT = 0; tw.soldiers = 0;
    tw.ang = -Math.PI / 2; tw.spent = 0;
    tw.troop = RW.TROOP_ORDER[0]; tw.form = RW.FORMATION_ORDER[0]; tw.post = null;
    tw.maxHp = tw.hp = d.hp;
  }

  G.startNight = function (opts) {
    opts = opts || {};
    var N = RW.NIGHT;
    this.nightOn = false;
    this.nightGod = false;
    RW.loadMap(N.map);
    this.mapId = N.map;
    // 敌人网格跟世界尺寸走（applyMap 改了宽高，这里和 startRun 一样补齐）
    var cell = 40, gw = Math.ceil(T.WORLD.w / cell), gh = Math.ceil(T.WORLD.h / cell);
    if (this.gridHead.length !== gw * gh) { this.gridHead = new Int16Array(gw * gh); this.gridHead.fill(-1); }
    if (opts.seed != null) this.rand = RW.mulberry(opts.seed >>> 0);
    this.danger = 0; this.dg = RW.DANGER[0]; this.mut = {}; this.mutList = []; this.daily = ''; this.endless = false;
    this._rec = { kills: 0, coins: 0, built: 0, counted: false };
    this.resetRun();
    RW.clearPool(this.orbs); RW.clearPool(this.chests); RW.clearPool(this.mates);
    this.cls = RW.CLASSES.mage; this.clsId = 'mage';
    this.recalc();
    this.player.hp = this.player.maxHp;
    this.weapons = []; this.skill = null; this.skills = [];
    this.wave = 1; this.mode = 'battle'; this.won = false;
    this.eliteQ = []; this.dur = N.duration;
    var F = N.flame;
    this.core.maxHp = F.hp; this.core.hp = F.hp;
    this.core.gunDmg = F.gunDmg;
    this._gunCd0 = T.core.gunCd;
    var post = postXY(N.heroStart);
    var p = this.player;
    p.x = post.x; p.y = post.y; p.vx = p.vy = p.pvx = p.pvy = 0; p.face = -Math.PI / 2; p.dead = false;
    this.nightPost = post;
    this.nightOn = true;
    this.nightBench = !!opts.bench;
    this.nightGod = !!(opts.god || opts.bench);
    this.nightPhase = 'intro';
    this.introT = N.introSec;
    this.playT = 0; this.nightT = 0;
    this.nightDur = opts.bench ? 60 : N.duration;
    this.nCombo = 0; this.bestCombo = 0; this.comboT = 0; this.comboAtLast = 0;
    this.comebackLeft = N.comeback.perNight;
    this.ovLeft = 0; this.ovCd = 0; this.ovComeback = false; this.overloads = 0;
    this.kills = 0; this.firstKillT = -1;
    this.slashCd = 0.15; this.slashWind = 0; this.slashAng = p.face; this.slashHeavy = false;
    this.chain = 0; this.chainT = 0;
    this.freeze = 0; this.stopLog = []; this.lastStopT = -9; this.shatterQ = [];
    this.numTimes = []; this._benchOv = -1; this.nightLock = 0; this._winClear = 0;
    this.slashSrc = { name: '挥砍', color: '#ffe7c2', dmg: 0, kills: 0, crit: false, nightSlash: true };
    this.shockSrc = { name: '超载', color: '#ffa24a', dmg: 0, kills: 0, crit: false, nightShock: true };
    this.banner = N.introSec; this.bannerText = '守桥一夜';
    this.enemyCount = 0;
    if (opts.bench) {
      this.spawnQ = [];
      for (var i = 0; i < 150; i++) {
        var a = (i / 150) * TAU, rr = 48 + (i % 6) * 10;
        this.spawnQ.push({ t: (i % 20) * 0.04, type: 'mite', ax: p.x + Math.cos(a) * rr, ay: p.y + Math.sin(a) * rr, goal: false, telegraph: 0, abs: true, opener: true });
      }
    } else this.spawnQ = (N.slots && N.slots.length) ? buildSlots(N) : buildCurve(N);
    this.spawnI = 0; this.spawnHold = null;
    var towers = N.towers || [];
    for (var ti = 0; ti < towers.length; ti++) {
      var off = ti === 0 ? -1 : 1;
      // 白盒的树格走不了。两座箭塔放在桥南口两侧，罩住桥面，而不是圣火正下方。
      placeTower(this, towers[ti].kind, post.x + off * 48, post.y - 36);
    }
    if (RW.navPulse) RW.navPulse(p.x, p.y);
    if (this.nightPickReset) this.nightPickReset();
    qa(this, 'start', { seed: opts.seed != null ? opts.seed : null, bench: !!opts.bench, dur: this.nightDur });
  };

  G.updateNight = function (inp) {
    var N = RW.NIGHT;
    if (this.mode === 'result') {
      if (this.nightLock > 0) {
        this.nightLock -= DT;
        if (this.nightLock <= 0) qa(this, 'restartReady');
      }
      this.updateFx();
      return;
    }
    if (this.mode === 'npick') return;
    if (this.freeze > 0) {
      this.freeze--;
      if (this.freeze <= 0) this.nightFlushShatter();
      this.updateFx();
      return;
    }
    this.clock += DT;
    this.shake = Math.max(0, this.shake - DT * (N.shake.decay || 2.6));
    if (this.flash > 0) this.flash = Math.max(0, this.flash - DT * 3);
    if (this.banner > 0) this.banner -= DT;
    if (this.core.flash > 0) this.core.flash -= DT;
    if (this.core.alert > 0) this.core.alert -= DT;
    if (this.nightPhase === 'intro' || this.nightPhase === 'battle') this.playT += DT;

    if (this.nightPhase === 'win' || this.nightPhase === 'lose') {
      this.settleT -= DT;
      if (this.nightPhase === 'win') this.nightDrain();
      this.updateFx();
      if (this.settleT <= 0) this.nightSettle();
      return;
    }

    inp = inp || { mx: 0, my: 0 };
    var p = this.player;
    if (p.dead) this.updateRespawn();
    else {
      if (this.nightPhase === 'battle' && inp.dash) this.tryDash(inp);
      this.movePlayer(inp);
    }
    if (inp) { inp.dash = false; inp.skill = false; }
    if (p.inv > 0) p.inv -= DT;
    if (p.dashCd > 0) p.dashCd -= DT;
    if (p.hurtT > 0) p.hurtT -= DT;

    if (this.nightPhase === 'intro') {
      this.introT -= DT;
      if (this.introT <= 0) this.nightPhase = 'battle';
    }
    if (this.nightPhase === 'battle') {
      this.nightT += DT;
      if (this.comboT > 0) {
        this.comboT -= DT;
        if (this.comboT <= 0) this.nightBreakCombo();
      }
      this.nightPump();
      this.nightSlash();
      this.nightOverloadClock();
      this.updateMomentum();
      if (this.nightBench) this.nightBenchOverload();
    }
    if ((this.navTick = (this.navTick || 0) + 1) % 10 === 0 || this.navTick === 1) { if (RW.navPulse) RW.navPulse(p.x, p.y); }
    this.updateMarks();
    this.buildGrid();
    this.nightRate = this.ovLeft > 0 ? N.overload.towerRateMul : 1;
    this.core.gunCd = this._gunCd0 / this.nightRate;
    if (this.nightPhase === 'battle' || this.nightPhase === 'intro') {
      this.updateTowers();
      this.updateEnemies();
      this.updateBullets();
      this.updateEBullets();
      if (this.nightPhase === 'battle' && this.nightPickTick) this.nightPickTick();
    }
    this.updateFx();
    if (this.nightPhase === 'lose' || this.nightPhase === 'win' || this.mode === 'result') return;
    if (this.core.hp <= 0) { this.nightLose(); return; }
    if (this.nightPhase === 'battle' && this.nightT >= this.nightDur) { this.nightWin(); return; }
    if (this._pickDue && this.nightOpenPick && this.nightPhase === 'battle') this.nightOpenPick();
  };

  G.nightBreakCombo = function () {
    if (this.nCombo > 0) { this.emit('comboBreak'); qa(this, 'comboBreak', { combo: this.nCombo }); }
    this.nCombo = 0; this.comboAtLast = 0; this.comboT = 0;
  };

  G.nightPump = function () {
    var N = RW.NIGHT;
    if (this.nightT >= N.spawnCutoff && !this.nightBench) return;
    var guard = 0;
    while (guard++ < 8) {
      var ev = this.spawnHold;
      if (!ev) {
        if (this.spawnI >= this.spawnQ.length) return;
        if (this.spawnQ[this.spawnI].t > this.nightT) return;
        ev = this.spawnQ[this.spawnI++];
      }
      var pos;
      if (ev.abs) pos = { x: ev.ax, y: ev.ay };
      else if (ev.post) pos = postXY(ev.post);
      else if (!N.spawnFromGates) {
        var a = this.R() * TAU, rr = this.RR(80, 160);
        pos = { x: this.player.x + Math.cos(a) * rr, y: this.player.y + Math.sin(a) * rr };
      } else pos = gateXY(ev.gate);
      if (!ev.abs) {
        var jx = pos.x + this.RR(-12, 12), jy = pos.y + this.RR(-12, 12);
        if (RW.NAV.walkable(jx, jy)) { pos.x = jx; pos.y = jy; }
      }
      var spec = (N.enemies && N.enemies[ev.type]) || {};
      var goal = !ev.opener && this.R() < (spec.coreBias != null ? spec.coreBias : 0.5);
      if (ev.telegraph > 0) {
        var mk = RW.take(this.marks);
        if (!mk) { this.spawnHold = ev; return; }
        this.spawnHold = null;
        mk.x = pos.x; mk.y = pos.y; mk.t = ev.telegraph; mk.type = ev.type; mk.goal = goal;
      } else {
        if (!this.nightSpawn(ev.type, pos.x, pos.y, goal, true)) { this.spawnHold = ev; return; }
        this.spawnHold = null;
      }
    }
  };

  G.nightSpawn = function (type, x, y, goal, instant) {
    var d = RW.ENEMIES[type];
    if (!d) return null;
    if (d.fly && RW.NIGHT && !RW.NIGHT.allowFly) return null;
    var e = this.spawnEnemy(type, x, y, goal);
    if (!e) return null;
    var spec = (RW.NIGHT.enemies && RW.NIGHT.enemies[type]) || {};
    if (spec.hp) e.hp = e.maxHp = spec.hp;
    if (spec.knockRes != null) e.knockRes = spec.knockRes;
    e.armor = 0;
    e.burn = 0; e.burnDps = 0; e.embT = 0;
    if (instant) e.spawnT = 0;
    return e;
  };

  G.nightSlash = function () {
    var N = RW.NIGHT, S = N.slash, p = this.player;
    if (this.slashWind > 0) {
      this.slashWind -= DT;
      if (this.slashWind <= 0) this.nightResolveSlash();
      return;
    }
    if (p.dead || this.nightPhase !== 'battle') return;
    if (this.slashCd > 0) this.slashCd -= DT;
    this.chainT += DT;
    if (this.chain > 0 && this.chainT > S.chainReset) this.chain = 0;
    if (this.slashCd > 0) return;
    var rad = S.radius * (this.ovLeft > 0 ? N.overload.slashRadiusMul : 1);
    var best = null, bestD = 1e15, i;
    for (i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.on || e.spawnT > 0) continue;
      var dx = e.x - p.x, dy = e.y - p.y, d2 = dx * dx + dy * dy, reach = rad + e.r;
      if (d2 > reach * reach || d2 >= bestD) continue;
      bestD = d2; best = e;
    }
    if (!best) return;
    this.chain++; this.chainT = 0;
    this.slashHeavy = (this.chain % S.heavyEvery) === 0;
    this.slashAng = Math.atan2(best.y - p.y, best.x - p.x);
    p.face = this.slashAng;
    this.slashWind = S.hitDelay;
    this.slashRad = rad;
    this.emit(this.slashHeavy ? 'slashHeavy' : 'slash');
    var f = RW.take(this.fx, true);
    f.kind = 'nightArc'; f.x = p.x; f.y = p.y; f.r = this.slashAng; f.r2 = rad;
    f.w = S.arc * Math.PI / 180; f.life = f.max = 0.16; f.color = this.slashHeavy ? '#ffa24a' : '#ffe7c2';
  };

  G.nightResolveSlash = function () {
    var N = RW.NIGHT, S = N.slash, p = this.player;
    var rad = this.slashRad || S.radius, half = (S.arc * Math.PI / 180) / 2;
    var heavy = this.slashHeavy, any = false, killed = false, i;
    var ids = [];
    for (i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.on || e.spawnT > 0) continue;
      var dx = e.x - p.x, dy = e.y - p.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > rad + e.r) continue;
      if (Math.abs(angDiff(Math.atan2(dy, dx), this.slashAng)) > half) continue;
      ids.push(i);
    }
    for (i = 0; i < ids.length; i++) {
      var en = this.enemies[ids[i]];
      if (!en.on) continue;
      var dx2 = en.x - p.x, dy2 = en.y - p.y, dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
      var near = 1 + S.near.bonus * clamp01((S.near.r1 - dist2) / (S.near.r1 - S.near.r0));
      var mom = this.momTier > 0 ? (1 + T.momentum.dmg[this.momTier - 1]) : 1;
      var cb = this.ovComeback ? N.comeback.dmgMul : 1;
      var dmg = Math.round(S.dmg * (heavy ? S.heavyMul : 1) * near * mom * cb);
      var kn = S.knock * (heavy ? S.heavyKnockMul : 1);
      var dead = this.nightReceiveHit(en, dmg, dx2 / dist2, dy2 / dist2, kn, this.slashSrc, heavy);
      any = true; if (dead) killed = true;
    }
    this.slashCd = this.nightSlashInterval ? this.nightSlashInterval() : S.interval;
    if (!any) return;
    var stop = heavy ? N.hitstop.heavy : N.hitstop.hit;
    if (killed) stop = Math.max(stop, N.hitstop.kill);
    this.nightStop(stop, false);
    if (this.freeze <= 0) this.nightFlushShatter();
  };

  // 返回是否因此死亡。挥砍、冲击波、箭塔、火舌都走这里。
  G.nightReceiveHit = function (e, dmg, kx, ky, knock, source, heavy) {
    if (!e.on || dmg <= 0) return false;
    var N = RW.NIGHT;
    e.flash = 1;
    e.hp -= dmg;
    if (source) source.dmg = (source.dmg || 0) + dmg;
    if (this.nightOnHit) this.nightOnHit(e, dmg, source);
    if (!(source && source.silent)) {
      var fromHero = source === this.slashSrc || (source && source.nightShock);
      if (fromHero || (N.combo.countTowers && source)) this.nightNum(e, dmg, !!heavy);
      else if (!source || source === this.slashSrc) this.nightNum(e, dmg, !!heavy);
      else this.nightNum(e, dmg, false);
    }
    if (!(e.type === 'dasher' && e.state === 2) && e.knockRes > 0 && knock > 0) {
      e.kvx += kx * knock * e.knockRes;
      e.kvy += ky * knock * e.knockRes;
      var sp = Math.sqrt(e.kvx * e.kvx + e.kvy * e.kvy), cap = N.knock.capPerSec;
      if (sp > cap) { e.kvx *= cap / sp; e.kvy *= cap / sp; }
    }
    this.emit('hit', 0, e.type);
    if (heavy) this.shake = Math.min(1, this.shake + (N.shake.heavy || 0));
    if (e.hp > 0) return false;
    this.nightKill(e, source, heavy);
    return true;
  };

  G.nightKill = function (e, source, heavy) {
    if (!e.on) return;
    var N = RW.NIGHT, fromCombo = source === this.slashSrc || (source && source.nightShock);
    e.on = false;
    this.enemyCount--;
    this.kills++;
    if (this.firstKillT < 0) this.firstKillT = this.nightT;
    if (source) source.kills = (source.kills || 0) + 1;
    if (this.nightGainXp) this.nightGainXp(e);
    var pl = this.player, kdx = e.x - pl.x, kdy = e.y - pl.y;
    if (fromCombo && kdx * kdx + kdy * kdy < T.momentum.near * T.momentum.near) this.addMomentum(e.elite ? 6 : 1);
    if (fromCombo) {
      if (this.comboT <= 0) this.nCombo = 0;
      this.nCombo++;
      this.comboT = N.combo.window;
      if (this.nCombo > this.bestCombo) this.bestCombo = this.nCombo;
      this.emit('comboUp', this.nCombo);
      this.nightTryOverload();
    }
    this.nightQueueShatter(e, !!heavy);
    if (e.elite) this.shake = Math.min(1, this.shake + (N.shake.killElite || 0));
    this.emit('shatter', e.type);
    qa(this, 'kill', { type: e.type, combo: this.nCombo, elite: !!e.elite });
  };

  G.nightTryOverload = function () {
    var N = RW.NIGHT, O = N.overload;
    if (this.ovLeft > 0 || this.ovCd > 0) return;
    var thresh = O.threshold, back = false;
    var flame = this.core.maxHp > 0 ? this.core.hp / this.core.maxHp : 1;
    if (this.comebackLeft > 0 && flame < N.comeback.flameBelow) { thresh *= N.comeback.thresholdMul; back = true; }
    if (this.nCombo - this.comboAtLast < thresh) return;
    this.nightBeginOverload(back);
  };

  G.nightBeginOverload = function (comeback) {
    var N = RW.NIGHT, O = N.overload, S = N.slash, p = this.player;
    this.ovLeft = O.duration;
    this.ovCd = O.cooldown;
    this.overloads++;
    this.comboAtLast = this.nCombo;
    this.ovComeback = !!comeback;
    if (comeback) this.comebackLeft--;
    var rad = S.radius * O.slashRadiusMul, i, ids = [];
    for (i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.on || e.spawnT > 0) continue;
      var dx = e.x - p.x, dy = e.y - p.y;
      if (dx * dx + dy * dy <= (rad + e.r) * (rad + e.r)) ids.push(i);
    }
    for (i = 0; i < ids.length; i++) {
      var en = this.enemies[ids[i]];
      if (!en.on) continue;
      var dx2 = en.x - p.x, dy2 = en.y - p.y, d = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
      var mul = this.ovComeback ? N.comeback.dmgMul : 1;
      this.nightReceiveHit(en, Math.round(O.shockDmg * mul), dx2 / d, dy2 / d, S.knock, this.shockSrc, true);
    }
    this.nightStop(N.hitstop.overload, true);
    this.shake = Math.min(1, this.shake + (N.shake.overload || 0));
    this.flash = Math.max(this.flash, 0.35);
    this.ringFx(p.x, p.y, 20, rad, 0.45, '#E8702A', 6);
    this.emit('overloadStart');
    qa(this, 'overload', { n: this.overloads, comeback: !!comeback });
    if (this.freeze <= 0) this.nightFlushShatter();
  };

  G.nightOverloadClock = function () {
    if (this.ovCd > 0) this.ovCd -= DT;
    if (this.ovLeft > 0) {
      this.ovLeft -= DT;
      if (this.ovLeft <= 0) { this.ovLeft = 0; this.ovComeback = false; this.emit('overloadEnd'); }
    }
  };
  G.nightBenchOverload = function () {
    var bucket = Math.floor(this.nightT / 10);
    if (bucket > this._benchOv && this.ovLeft <= 0) {
      this._benchOv = bucket;
      this.nightBeginOverload(false);
    }
  };

  G.nightNum = function (e, val, heavy) {
    var D = RW.NIGHT.dmgText, now = this.playT, i;
    for (i = this.numTimes.length - 1; i >= 0; i--) if (now - this.numTimes[i] > 1) this.numTimes.splice(i, 1);
    for (i = 0; i < this.nums.length; i++) {
      var prev = this.nums[i];
      if (!prev.on || prev.seq !== e.seq) continue;
      if (now - (prev.born || 0) > D.merge) continue;
      prev.val = (prev.val || 0) + val;
      prev.text = String(Math.round(prev.val));
      prev.life = prev.max = D.life;
      prev.kind = heavy ? 'heavy' : prev.kind;
      if (heavy) { prev.color = D.heavyColor; prev.scale = D.heavyScale; }
      return;
    }
    if (this.numTimes.length >= D.perSec) return;
    var alive = 0, oldest = null;
    for (i = 0; i < this.nums.length; i++) if (this.nums[i].on) { alive++; if (!oldest || this.nums[i].life < oldest.life) oldest = this.nums[i]; }
    if (alive >= D.max && oldest) oldest.on = false;
    var n = RW.take(this.nums, true);
    n.x = e.x + this.RR(-6, 6); n.y = e.y - e.r - 2; n.vy = D.rise;
    n.kind = heavy ? 'heavy' : 'hit'; n.val = val; n.text = String(Math.round(val));
    n.life = n.max = D.life; n.seq = e.seq; n.born = now;
    n.color = heavy ? D.heavyColor : D.color; n.scale = heavy ? D.heavyScale : 1;
    this.numTimes.push(now);
  };

  G.nightQueueShatter = function (e, heavy) {
    var Sh = RW.NIGHT.shatter, base = e.type === 'mite' ? 6 : (e.elite ? 10 : 8);
    if (heavy) base += 2;
    if (base < Sh.shards[0]) base = Sh.shards[0];
    if (base > Sh.shards[1]) base = Sh.shards[1];
    var em = Sh.embers[0] + Math.floor(this.R() * (Sh.embers[1] - Sh.embers[0] + 1));
    if (heavy) em++;
    if (this.ovLeft > 0) em++;
    this.shatterQ.push({ x: e.x, y: e.y, n: base, em: em });
  };
  G.nightFlushShatter = function () {
    var q = this.shatterQ, life = RW.NIGHT.shatter.life, i, k;
    for (i = 0; i < q.length; i++) {
      var s = q[i];
      for (k = 0; k < s.n; k++) {
        var p = RW.take(this.parts, true), a = this.R() * TAU, sp = this.RR(120, 260);
        p.x = s.x; p.y = s.y; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
        p.life = p.max = life; p.color = '#1A1626'; p.size = this.RR(4, 9); p.drag = 0.88; p.glow = false;
      }
      for (k = 0; k < s.em; k++) {
        var em = RW.take(this.parts, true), a2 = this.R() * TAU, sp2 = this.RR(40, 110);
        em.x = s.x; em.y = s.y; em.vx = Math.cos(a2) * sp2; em.vy = Math.sin(a2) * sp2 - 30;
        em.life = em.max = life; em.color = '#E8702A'; em.size = this.RR(3, 5); em.drag = 0.88; em.glow = true;
      }
    }
    q.length = 0;
  };

  G.nightStop = function (sec, force) {
    if (!sec || sec <= 0) return;
    var N = RW.NIGHT;
    if (force) {
      var fr = Math.max(1, Math.round(sec / DT));
      if (fr > this.freeze) this.freeze = fr;
      qa(this, 'hitstop', { ms: Math.round(sec * 1000), force: true });
      return;
    }
    if (this.playT - this.lastStopT < T.hitstop.gap) return;
    var cap = N.hitstop.capPerSec, used = 0, i, log = this.stopLog;
    for (i = log.length - 1; i >= 0; i--) {
      if (this.playT - log[i].t >= 1) log.splice(i, 1);
      else used += log[i].s;
    }
    var grant = Math.min(sec, cap - used);
    if (grant <= 1 / 120) return;
    var frames = Math.max(1, Math.round(grant / DT));
    if (frames > this.freeze) this.freeze = frames;
    this.lastStopT = this.playT;
    log.push({ t: this.playT, s: grant });
    qa(this, 'hitstop', { ms: Math.round(grant * 1000), force: false });
  };

  G.nightTouch = function (e) {
    if (!e.on) return;
    var N = RW.NIGHT, mul = e.elite ? N.flame.eliteTouchMul : 1;
    e.on = false;
    this.enemyCount--;
    this.nightHurtCore(N.flame.touchDmg * mul, e.d ? e.d.name : '');
  };

  G.nightHurtCore = function (dmg, who) {
    if (this.nightGod) return;
    if (this.nightPhase !== 'battle' && this.nightPhase !== 'intro') return;
    var co = this.core;
    if (co.hp <= 0) return;
    co.hp -= dmg; co.flash = 0.2;
    this._coreDmg = this._coreDmg || {}; this._coreDmg[who || '?'] = (this._coreDmg[who || '?'] || 0) + dmg;
    if (co.alert <= 0) this.emit('coreAlert');
    co.alert = 1.2;
    this.shake = Math.min(1, this.shake + (RW.NIGHT.shake.coreHit || 0));
    this.emit('coreHit');
    if (co.hp <= 0) {
      co.hp = 0;
      this.lastHits.push({ src: (who || '敌人') + '扑火', dmg: dmg, wave: 1 });
      if (this.lastHits.length > 3) this.lastHits.shift();
      this.deathCause = 'core';
      this.nightLose();
    }
  };

  G.nightDown = function () {
    var p = this.player, R = RW.NIGHT.respawn, co = this.core;
    this._downs = (this._downs || 0) + 1;
    p.dead = true; p.hp = 0;
    p.respawnT = p.respawnMax = R.base;
    p.deadX = p.x; p.deadY = p.y;
    var cost = Math.min(Math.max(0, co.hp - 1), co.maxHp * R.coreCost);
    if (cost > 0) { co.hp -= cost; p.coreCost = Math.round(cost); } else p.coreCost = 0;
    this.nightBreakCombo();
    this.emit('die', 'respawn');
  };

  G.nightWin = function () {
    if (this.nightPhase === 'win' || this.nightPhase === 'lose' || this.mode === 'result') return;
    this.nightPhase = 'win'; this.won = true;
    this.settleT = Math.max(RW.NIGHT.endSec, RW.NIGHT.result.showDelay);
    this._winClear = 0.6;
    this.spawnI = this.spawnQ.length; this.spawnHold = null;
    RW.clearPool(this.marks);
    this.banner = this.settleT; this.bannerText = '守住了';
    this.emit('nightWin');
    qa(this, 'nightEnd', { won: true, t: this.nightT, flame: this.core.hp });
  };
  G.nightDrain = function () {
    if (this._winClear <= 0) return;
    this._winClear -= DT;
    var left = 0, i;
    for (i = 0; i < this.enemies.length; i++) if (this.enemies[i].on) left++;
    if (!left) { this._winClear = 0; return; }
    var budget = Math.max(1, Math.ceil(left * DT / Math.max(0.05, this._winClear + DT)));
    for (i = 0; i < this.enemies.length && budget > 0; i++) {
      var e = this.enemies[i];
      if (!e.on) continue;
      e.on = false; this.enemyCount--; budget--;
      this.nightQueueShatter(e, !!e.elite);
    }
    this.nightFlushShatter();
  };
  G.nightLose = function () {
    if (this.nightPhase === 'lose' || this.nightPhase === 'win' || this.mode === 'result') return;
    this.nightPhase = 'lose'; this.won = false;
    this.core.hp = 0;
    this.settleT = RW.NIGHT.result.showDelay;
    this.burst(this.core.x, this.core.y, 40, '#ff3b5c', 280, 3.5, true);
    this.flash = 0.55; this.shake = 1;
    this.banner = this.settleT; this.bannerText = '圣火熄灭';
    this.emit('nightLose');
    qa(this, 'nightEnd', { won: false, t: this.nightT, flame: 0 });
  };

  G.nightSettle = function () {
    if (this.mode === 'result') return;
    var co = this.core, ratio = co.maxHp > 0 ? co.hp / co.maxHp : 0;
    var stars = 0;
    if (this.won) {
      var st = RW.NIGHT.result.stars;
      stars = ratio >= st[0] ? 3 : (ratio >= st[1] ? 2 : 1);
    }
    this.result = {
      night: true, won: !!this.won, time: this.nightT, kills: this.kills, bestCombo: this.bestCombo,
      overloads: this.overloads, flame: Math.max(0, Math.round(co.hp)), flameMax: co.maxHp, stars: stars,
      hero: this.clsId, list: [], hits: this.lastHits.slice(), unlocked: [], achievements: [],
      score: 0, wave: 1, shards: 0, stage: '', streak: this.bestCombo, danger: 0, mutators: [],
      newBest: false, best: this.best, coreDown: !this.won, endless: false, canEndless: false, daily: ''
    };
    this.nightLock = RW.NIGHT.result.restartLock;
    this.mode = 'result';
    qa(this, 'settleShown', { won: !!this.won, stars: stars });
    if (RW.QA && RW.QA.perf && RW.QA.dump) {
      try { console.log(RW.QA.dump(this)); } catch (err) { /* 结算照常 */ }
    }
  };
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
