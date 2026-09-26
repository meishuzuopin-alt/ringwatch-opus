// 圣火守护者 · 夜战局内三选一。数值在 RW.NIGHT.picks。暂停时 mode = 'npick'，战斗时钟不走。
(function (root) {
  var RW = root.RW;
  var G = RW.Game.prototype;
  var TAU = Math.PI * 2;
  var cardMap = null;

  function qa(g, type, extra) {
    if (RW.QA && RW.QA.hit) RW.QA.hit(g, type, extra);
  }
  function defs() {
    if (cardMap) return cardMap;
    cardMap = {};
    var list = (RW.NIGHT.picks && RW.NIGHT.picks.cards) || [];
    for (var i = 0; i < list.length; i++) cardMap[list[i].id] = list[i];
    return cardMap;
  }
  G.nightCard = function (id) { return defs()[id] || null; };

  function refresh(g) {
    var steps = RW.NIGHT.picks.steps;
    if (g.pkLv >= steps.length) { g.pkNeed = 0; g.pkLeft = 0; }
    else { g.pkNeed = steps[g.pkLv]; g.pkLeft = steps.length - g.pkLv; }
  }
  function makeSrc(name, color, fire, silent) {
    return { name: name, color: color, dmg: 0, kills: 0, crit: false, nightFire: !!fire, silent: !!silent };
  }
  function every(cd, step, min, lv) {
    var t = cd - (lv - 1) * (step || 0);
    return t < min ? min : t;
  }
  function copyNear(g, n) {
    var ids = [];
    for (var i = 0; i < n; i++) ids.push(g.nbuf[i]);
    return ids;
  }
  // 持续伤害不走飘字。火焰来源仍会吸血、上灼烧。
  function chip(g, e, dmg, source) {
    if (!e.on || dmg <= 0) return;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    if (source) source.dmg = (source.dmg || 0) + dmg;
    if (g.nightOnHit) g.nightOnHit(e, dmg, source);
    if (e.hp <= 0) g.nightKill(e, source, false);
  }
  function weightOf(g, c) {
    var R = RW.NIGHT.picks.rarity[c.rarity];
    var w = R ? R.w : 10;
    if ((g.pk[c.id] || 0) > 0) w *= RW.NIGHT.picks.ownedWeight || 1;
    return w > 0 ? w : 0;
  }
  function roll(g, n) {
    var list = RW.NIGHT.picks.cards, pool = [], out = [], i;
    for (i = 0; i < list.length; i++) {
      var c = list[i];
      if ((g.pk[c.id] || 0) >= c.max) continue;
      pool.push(c);
    }
    while (out.length < n && pool.length) {
      var sum = 0;
      for (i = 0; i < pool.length; i++) sum += weightOf(g, pool[i]);
      var r = g.R() * (sum || 1), acc = 0, pick = pool.length - 1;
      for (i = 0; i < pool.length; i++) {
        acc += weightOf(g, pool[i]);
        if (r <= acc) { pick = i; break; }
      }
      out.push(pool[pick].id);
      pool.splice(pick, 1);
    }
    return out;
  }

  G.nightPickReset = function () {
    var P = RW.NIGHT && RW.NIGHT.picks;
    if (!P) { this.pk = null; return; }
    var pk = { any: 0 }, list = P.cards, i;
    for (i = 0; i < list.length; i++) pk[list[i].id] = 0;
    this.pk = pk;
    this.pkXp = 0; this.pkLv = 0; this.pkTaken = 0;
    this._pickDue = false;
    this.nightOffers = [];
    this.nightFreeLeft = P.freeRerolls || 0;
    this._adBusy = false;
    this.shieldN = 0; this.shieldMax = 0; this.shieldCd = 0;
    this.pulseT = 0; this.frostT = 0; this.chainT = 0; this.auraT = 0; this.burnClk = 0;
    this.emberAng = 0; this._embN = 0; this.pkAura = 0;
    this._leechT = null; this._leechAcc = 0; this._chainStamp = 0;
    this._nightSpeed = this.st ? this.st.speed : 1;
    if (this.slashSrc) this.slashSrc.nightFire = true;
    if (this.coreSrc) this.coreSrc.nightFire = true;
    if (this.shockSrc) this.shockSrc.nightFire = true;
    this.emberSrc = makeSrc('环焰', '#ffb15a', true, false);
    this.burnSrc = makeSrc('灼痕', '#ff7a3c', true, true);
    this.auraSrc = makeSrc('圣火', '#E8702A', true, true);
    this.chainSrc = makeSrc('链电', '#d7e6ff', false, false);
    this.pulseSrc = makeSrc('斥浪', '#ffd7a1', false, false);
    this.nightSyncPick();
    refresh(this);
  };

  G.nightSyncPick = function () {
    var pk = this.pk;
    if (!pk) return;
    var h = this.nightCard('hearth');
    this.core.gunRange = RW.TUNE.core.gunRange + (pk.hearth || 0) * (h ? h.range : 0);
    this.pkAura = (pk.hearth || 0) * (h ? h.aura : 0);
    var s = this.nightCard('stride');
    if (this.st && this._nightSpeed) this.st.speed = this._nightSpeed * (1 + (pk.stride || 0) * (s ? s.speed : 0));
    var w = this.nightCard('ward');
    var maxC = (pk.ward || 0) * (w ? w.charges : 0);
    if (maxC > (this.shieldMax || 0)) this.shieldN = (this.shieldN || 0) + (maxC - (this.shieldMax || 0));
    this.shieldMax = maxC;
    refresh(this);
  };

  G.nightSlashInterval = function () {
    var S = RW.NIGHT.slash, lv = this.pk && this.pk.tempo || 0;
    if (!lv) return S.interval;
    var c = this.nightCard('tempo');
    var cd = S.interval / (1 + lv * (c ? c.rate : 0));
    if (c && cd < c.min) cd = c.min;
    return cd;
  };

  G.nightGainXp = function (e) {
    if (!this.pk || this.nightBench || this.nightPhase !== 'battle' || this.mode !== 'battle') return;
    var xp = RW.NIGHT.picks.xp, n = xp[e.type];
    if (n == null) n = 1;
    this.pkXp += n;
    var steps = RW.NIGHT.picks.steps;
    if (this.pkLv < steps.length && this.pkXp >= steps[this.pkLv]) this._pickDue = true;
  };

  G.nightOpenPick = function () {
    if (this.mode !== 'battle' || this.nightPhase !== 'battle' || this.nightBench) return false;
    var steps = RW.NIGHT.picks.steps;
    if (this.pkLv >= steps.length || this.pkXp < steps[this.pkLv]) { this._pickDue = false; refresh(this); return false; }
    var offers = roll(this, RW.NIGHT.picks.offer || 3);
    if (!offers.length) { this._pickDue = false; return false; }
    this.pkLv++;
    this._pickDue = false;
    this.nightOffers = offers;
    this.freeze = 0;
    this.mode = 'npick';
    refresh(this);
    if (RW.UI) { RW.UI.focusId = 'npick:0'; RW.UI.toastT = 0; }
    qa(this, 'pickOpen', { n: this.pkLv, xp: this.pkXp });
    return true;
  };

  G.nightChoose = function (i) {
    if (this.mode !== 'npick') return false;
    var id = this.nightOffers[i | 0];
    var c = id && this.nightCard(id);
    if (!c) return false;
    var lv = (this.pk[id] || 0) + 1;
    if (lv > c.max) return false;
    this.pk[id] = lv;
    this.pk.any = 1;
    this.pkTaken = (this.pkTaken || 0) + 1;
    this.nightSyncPick();
    this.mode = 'battle';
    this.emit('buy');
    qa(this, 'pick', { id: id, lv: lv });
    var steps = RW.NIGHT.picks.steps;
    if (this.pkLv < steps.length && this.pkXp >= steps[this.pkLv]) this.nightOpenPick();
    return true;
  };

  G.nightRerollOffers = function () {
    if (this.mode !== 'npick') return false;
    var offers = roll(this, RW.NIGHT.picks.offer || 3);
    if (!offers.length) return false;
    this.nightOffers = offers;
    this.emit('reroll');
    if (RW.UI) RW.UI.focusId = 'npick:0';
    return true;
  };
  G.nightFreeReroll = function () {
    if (this.mode !== 'npick' || !(this.nightFreeLeft > 0)) return false;
    this.nightFreeLeft--;
    return this.nightRerollOffers();
  };

  // 没有广告位、或适配器说次数用完，就不发奖。crazygames 的上限在 AdsCrazy.allow。
  G.nightAdReady = function () {
    if (this._adBusy || this.mode !== 'npick') return false;
    var P = RW.Plat;
    if (!P) return false;
    if (P.adProvider === 'crazygames') return !!(RW.AdsCrazy && RW.AdsCrazy.allow && RW.AdsCrazy.allow('reroll') && RW.AdsCrazy.show);
    if (P.adProvider === 'wechat') return !!(P.adUnit && P.adUnit('reroll') && P.showReward);
    return false;
  };
  G.nightAdWhy = function () {
    var P = RW.Plat;
    if (P && P.adProvider === 'crazygames' && RW.AdsCrazy && RW.AdsCrazy.allow && !RW.AdsCrazy.allow('reroll')) return '每局只能看一次广告刷新';
    return '此版本不播放广告';
  };
  G.nightAdReroll = function (done) {
    var self = this;
    if (self.mode !== 'npick' || self._adBusy) { if (done) done(false, '请稍等'); return false; }
    if (!self.nightAdReady()) { if (done) done(false, self.nightAdWhy()); return false; }
    function grant() {
      self._adBusy = false;
      if (self.mode === 'npick') self.nightRerollOffers();
      if (done) done(true);
    }
    function fail(msg) {
      self._adBusy = false;
      if (done) done(false, msg || '广告未看完，没有重抽');
    }
    self._adBusy = true;
    var P = RW.Plat;
    if (P.adProvider === 'crazygames') RW.AdsCrazy.show('reroll', grant, fail);
    else P.showReward('reroll', grant, fail);
    return true;
  };

  G.nightOnHit = function (e, dmg, source) {
    var pk = this.pk;
    if (!pk || !pk.any || !e) return;
    if (pk.leech && source && source.nightFire) this.nightLeech(dmg);
    if (pk.scorch && source && source.nightFire && !source.silent && e.on) {
      var sc = this.nightCard('scorch');
      e.burn = sc.time;
      e.burnDps = sc.dps * pk.scorch;
    }
  };
  G.nightLeech = function (amt) {
    var pk = this.pk;
    if (!pk || !pk.leech || !(amt > 0)) return;
    var c = this.nightCard('leech'), co = this.core;
    if (!c || !co || co.hp <= 0 || co.hp >= co.maxHp) return;
    var cap = c.cap * pk.leech, now = this.nightT;
    if (this._leechT == null || now - this._leechT >= 1) { this._leechT = now; this._leechAcc = 0; }
    var room = cap - (this._leechAcc || 0);
    if (room <= 0) return;
    var h = amt * c.ratio * pk.leech;
    if (h > room) h = room;
    this._leechAcc += h;
    co.hp = Math.min(co.maxHp, co.hp + h);
  };

  G.nightShieldAbsorb = function () {
    var p = this.player;
    if (!this.pk || !this.pk.ward || !(this.shieldN > 0) || !p || p.dead || p.inv > 0) return false;
    var w = this.nightCard('ward');
    this.shieldN--;
    this.shieldCd = every(w.cd, w.cdStep, w.cdMin, this.pk.ward);
    p.inv = Math.max(p.inv || 0, w.inv || 0.2);
    this.ringFx(p.x, p.y, 10, 40, 0.28, '#ffe7c2', 3);
    var n = RW.take(this.nums, true);
    if (n) { n.x = p.x; n.y = p.y - 16; n.kind = 'heal'; n.text = '格挡'; n.vy = -50; n.life = n.max = 0.6; }
    return true;
  };

  G.nightPickTick = function () {
    var pk = this.pk;
    if (!pk || !pk.any || this.nightPhase !== 'battle') return;
    var DT = RW.TUNE.DT;
    if (pk.scorch) this.nightBurnTick(DT);
    if (pk.hearth) this.nightAuraTick(DT);
    if (pk.embers) this.nightEmberTick(DT);
    if (pk.pulse) this.nightPulseTick(DT);
    if (pk.frost) this.nightFrostTick(DT);
    if (pk.chain) this.nightChainTick(DT);
    if (pk.ward) this.nightWardTick(DT);
  };

  G.nightBurnTick = function (DT) {
    var sc = this.nightCard('scorch');
    this.burnClk -= DT;
    if (this.burnClk > 0) return;
    var tick = sc.tick || 0.4;
    this.burnClk += tick;
    if (this.burnClk < 0) this.burnClk = tick;
    var dmgK = tick, i;
    for (i = 0; i < this.enemies.length; i++) {
      var e = this.enemies[i];
      if (!e.on || !(e.burn > 0)) continue;
      e.burn -= tick;
      chip(this, e, (e.burnDps || 0) * dmgK, this.burnSrc);
    }
  };
  G.nightAuraTick = function (DT) {
    var c = this.nightCard('hearth'), r = this.pkAura || 0;
    if (!(r > 0)) return;
    this.auraT -= DT;
    if (this.auraT > 0) return;
    this.auraT = c.tick || 0.5;
    var co = this.core, dmg = c.auraDps * this.pk.hearth * this.auraT;
    var ids = copyNear(this, this.near(co.x, co.y, r + 24)), i;
    for (i = 0; i < ids.length; i++) {
      var e = this.enemies[ids[i]];
      if (!e.on || e.spawnT > 0) continue;
      var dx = e.x - co.x, dy = e.y - co.y, rr = r + e.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      chip(this, e, dmg, this.auraSrc);
    }
    if (((this._auraVis = (this._auraVis || 0) + 1) % 3) === 0) this.ringFx(co.x, co.y, r * 0.82, r, 0.32, '#E8702A', 2);
  };
  G.nightEmberTick = function (DT) {
    var c = this.nightCard('embers'), lv = this.pk.embers || 0;
    var n = lv * (c.count || 1);
    if (n > 8) n = 8;
    if (n < 1) { this._embN = 0; return; }
    var buf = this._embXY || (this._embXY = new Float32Array(16));
    this._embN = n;
    this.emberAng += (c.spin || 2) * DT;
    var p = this.player, rad = c.radius, hit = c.hitR, now = this.nightT;
    var dmg = (c.dmg || 0) + (c.dmgLv || 0) * (lv - 1), i, j;
    for (i = 0; i < n; i++) {
      var a = this.emberAng + i * TAU / n;
      var x = p.x + Math.cos(a) * rad, y = p.y + Math.sin(a) * rad;
      buf[i * 2] = x; buf[i * 2 + 1] = y;
      var ids = copyNear(this, this.near(x, y, hit + 28));
      for (j = 0; j < ids.length; j++) {
        var e = this.enemies[ids[j]];
        if (!e.on || e.spawnT > 0 || (e.embT || 0) > now) continue;
        var dx = e.x - x, dy = e.y - y, rr = hit + e.r;
        if (dx * dx + dy * dy > rr * rr) continue;
        e.embT = now + (c.hitCd || 0.5);
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        this.nightReceiveHit(e, dmg, dx / d, dy / d, c.knock || 0, this.emberSrc, false);
      }
    }
  };
  G.nightPulseTick = function (DT) {
    var c = this.nightCard('pulse'), lv = this.pk.pulse || 0;
    this.pulseT += DT;
    if (this.pulseT < every(c.cd, c.cdStep, c.cdMin, lv)) return;
    this.pulseT = 0;
    var p = this.player, r = c.radius + (lv - 1) * (c.radiusStep || 0);
    this.ringFx(p.x, p.y, 18, r, 0.34, '#ffd7a1', 4);
    var ids = copyNear(this, this.near(p.x, p.y, r + 24)), i;
    for (i = 0; i < ids.length; i++) {
      var e = this.enemies[ids[i]];
      if (!e.on || e.spawnT > 0) continue;
      var dx = e.x - p.x, dy = e.y - p.y, rr = r + e.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      this.nightReceiveHit(e, (c.dmg || 0) * lv, dx / d, dy / d, c.knock || 0, this.pulseSrc, false);
    }
  };
  G.nightFrostTick = function (DT) {
    var c = this.nightCard('frost'), lv = this.pk.frost || 0;
    this.frostT += DT;
    if (this.frostT < every(c.cd, c.cdStep, c.cdMin, lv)) return;
    this.frostT = 0;
    var p = this.player, r = c.radius + (lv - 1) * (c.radiusStep || 0);
    var slow = c.slow + (lv - 1) * (c.slowStep || 0);
    if (slow > c.slowCap) slow = c.slowCap;
    this.ringFx(p.x, p.y, r * 0.72, r, 0.42, '#b7e6ff', 3);
    var cnt = this.near(p.x, p.y, r + 24), i;
    for (i = 0; i < cnt; i++) {
      var e = this.enemies[this.nbuf[i]];
      if (!e.on || e.spawnT > 0) continue;
      var dx = e.x - p.x, dy = e.y - p.y, rr = r + e.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      e.slowT = c.time;
      if (!(e.slowAmt >= slow)) e.slowAmt = slow;
    }
  };
  G.nightChainTick = function (DT) {
    var c = this.nightCard('chain'), lv = this.pk.chain || 0;
    this.chainT += DT;
    if (this.chainT < every(c.cd, c.cdStep, c.cdMin, lv)) return;
    this.chainT = 0;
    var p = this.player;
    var cur = this.nearest(p.x, p.y, c.range);
    if (!cur) return;
    var jumps = (c.jumps || 1) + (lv - 1) * (c.jumpStep || 0);
    var dmg = (c.dmg || 0) * lv;
    var fromX = p.x, fromY = p.y;
    var stamp = (this._chainStamp = (this._chainStamp || 0) + 1);
    var k;
    for (k = 0; k < jumps && cur; k++) {
      cur._cst = stamp;
      var dx = cur.x - fromX, dy = cur.y - fromY, dist = Math.sqrt(dx * dx + dy * dy) || 1;
      var hit = cur;
      fromX = cur.x; fromY = cur.y;
      this.nightReceiveHit(hit, dmg, dx / dist, dy / dist, c.knock || 0, this.chainSrc, false);
      var f = RW.take(this.fx, true);
      if (f) {
        f.kind = 'beam'; f.x = fromX - dx; f.y = fromY - dy; f.x2 = fromX; f.y2 = fromY;
        f.life = f.max = 0.14; f.color = '#d7e6ff'; f.w = 2;
      }
      var cnt = this.near(fromX, fromY, c.hop + 24), best = null, bestD = 1e15, i;
      for (i = 0; i < cnt; i++) {
        var e = this.enemies[this.nbuf[i]];
        if (!e.on || e.spawnT > 0 || e._cst === stamp) continue;
        var ex = e.x - fromX, ey = e.y - fromY, ed = ex * ex + ey * ey, rr = (c.hop || 0) + e.r;
        if (ed < bestD && ed <= rr * rr) { bestD = ed; best = e; }
      }
      cur = best;
    }
  };
  G.nightWardTick = function (DT) {
    if (this.shieldN >= this.shieldMax) return;
    this.shieldCd -= DT;
    if (this.shieldCd > 0) return;
    var w = this.nightCard('ward');
    this.shieldN++;
    this.shieldCd = every(w.cd, w.cdStep, w.cdMin, this.pk.ward || 1);
    this.ringFx(this.player.x, this.player.y, 8, 28, 0.22, '#ffe7c2', 2);
  };

  var _fireBullet = G.fireBullet;
  G.fireBullet = function (x, y, a, speed, life, dmg, knock, r, source, pierce, color) {
    if (this.nightOn && this.pk && source === this.coreSrc && !this._volley) {
      var pk = this.pk;
      if (pk.pierce) {
        var pc = this.nightCard('pierce');
        pierce = (pierce || 0) + pk.pierce * (pc ? pc.extra : 1);
      }
      if (pk.volley) {
        var vc = this.nightCard('volley');
        var extra = pk.volley * (vc ? vc.extra : 1);
        var spread = vc ? vc.spread : 0.2;
        var mul = vc && vc.dmgMul != null ? vc.dmgMul : 1;
        this._volley = true;
        for (var k = 0; k < extra; k++) {
          var off = ((k % 2) ? 1 : -1) * spread * (1 + ((k / 2) | 0));
          _fireBullet.call(this, x, y, a + off, speed, life, dmg * mul, knock, r, source, pierce, color);
        }
        this._volley = false;
      }
    }
    return _fireBullet.call(this, x, y, a, speed, life, dmg, knock, r, source, pierce, color);
  };
  var _hurtPlayer = G.hurtPlayer;
  G.hurtPlayer = function (dmg, source, fx, fy) {
    if (this.nightOn && !this.nightGod && this.nightShieldAbsorb && this.nightShieldAbsorb()) return;
    return _hurtPlayer.call(this, dmg, source, fx, fy);
  };
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));