// 圣火守护者 · 音乐与音效：全部 Web Audio 运行时合成，没有任何音频文件（全部原创）
// 背景音乐：中速风笛旋律，下面用八分音符竖琴滚奏。原创曲，不使用洛奇原曲。
// 音乐按状态切换：menu / battle（按强度 0–2 换段落）/ boss
(function (root) {
  var RW = root.RW;

  // ---------------- 乐句（原创） ----------------
  // 每小节 16 个十六分音符。数字 = 相对 E 的半音，竖琴按这个音高拨一下。. 延音，- 休止
  // 旋律相对 E4，长笛来吹。D 大调，进行是 D - G - D - A
  var RIFF = {
    air: [
      '10c . 14c . 17c . 22c . 17c . 14c . 10c . 14c .',
      '3c . 7c . 10c . 15c . 10c . 7c . 3c . 7c .',
      '10c . 14c . 17c . 22c . 17c . 14c . 10c . 14c .',
      '5c . 9c . 12c . 17c . 12c . 9c . 5c . 9c .'
    ],
    glen: [
      '3c . 7c . 10c . 15c . 10c . 7c . 3c . 7c .',
      '10c . 14c . 17c . 22c . 17c . 14c . 10c . 14c .',
      '7m . 10m . 14m . 19m . 14m . 10m . 7m . 10m .',
      '5c . 9c . 12c . 17c . 10c . 14c . 17c . 22c .'
    ],
    reel: [
      '10c . 14c . 17c . 22c . 17c . 14c . 10c . 14c .',
      '3c . 7c . 10c . 15c . 10c . 7c . 3c . 7c .',
      '10c . 14c . 17c . 22c . 17c . 14c . 10c . 14c .',
      '5c . 9c . 12c . 17c . 12c . 9c . 5c . 9c .'
    ],
    jig: [
      '10c . 14c . 17c . 14c . 7m . 10m . 14m . 10m .',
      '3c . 7c . 10c . 15c . 5c . 9c . 12c . 17c .',
      '10c . 14c . 17c . 22c . 17c . 14c . 10c . 14c .',
      '5c . 9c . 12c . 17c . 10c . 14c . 17c . 22c .'
    ],
    dusk: [
      '0m . 3m . 7m . 0m . 3m . 7m . 0m . 3m .',
      '0m . 3m . 7m . 8m . 7m . 3m . 0m . 1m .',
      '5m . 8m . 0m . 3m . 7m . 8m . 7m . 3m .',
      '0m . 1m . 0m . 3m . 7m . 3m . 0m . 0m .'
    ],
    hunt: [
      '0m . 0m . 3m . 7m . 0m . 0m . 3m . 7m .',
      '8m . 7m . 3m . 0m . 1m . 0m . 3m . 7m .',
      '7m . 8m . 7m . 3m . 0m . 3m . 7m . 12m .',
      '0m . 3m . 1m . 0m . 0m . 1m . 0m . 0m .'
    ]
  };
  // 风笛：八分音符一格。同一句动机先出现，再高一度回答，最后落回 D
  var LEAD = {
    air: [
      '-2 2 5 7 5 . 2 .',
      '-2 0 2 5 3 . 2 .',
      '5 7 10 7 5 . 2 .',
      '-2 . 2 . -2 . . .'
    ],
    glen: [
      '10 12 14 12 10 . 7 .',
      '5 7 10 7 5 . 2 .',
      '2 5 7 5 3 . 2 .',
      '-2 . . . 2 . -2 .'
    ],
    reel: [
      '-2 2 5 7 5 . 2 .',
      '-2 0 2 5 3 . 2 .',
      '5 7 10 7 5 . 2 .',
      '-2 . 2 . -2 . . .'
    ],
    jig: [
      '10 12 14 12 10 . 7 .',
      '5 7 10 7 5 . 2 .',
      '2 5 7 5 3 . 2 .',
      '-2 . . . 2 . -2 .'
    ],
    dusk: [
      '0 3 0 3 7 . 3 .',
      '12 7 3 0 3 . 0 .',
      '0 1 0 3 7 . 8 .',
      '7 . 3 . 0 . . .'
    ],
    hunt: [
      '7 8 7 3 0 3 7 12',
      '12 10 8 7 3 . 0 .',
      '0 3 7 12 7 3 0 3',
      '0 . 1 . 0 . . .'
    ]
  };
  // k 手鼓，s 掌击，h 沙锤。没有军鼓和吊镲
  var DRUM = {
    soft:  { k: 'x...............', s: '........x.......', h: 'x...x...x...x...' },
    pulse: { k: 'x.......x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    drive: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    alarm: { k: 'x..x..x.x..x..x.', s: '..x...x...x...x.', h: 'xxxxxxxxxxxxxxxx' }
  };
  var FILL = { k: 'x.......x.......', s: '........xxxxxxxx', t: 'x.x.x.x.........' };

  function parseRiff(bars) {
    var out = [];
    for (var b = 0; b < bars.length; b++) {
      var tok = bars[b].split(/\s+/), row = [];
      for (var i = 0; i < 16; i++) {
        var t = tok[i] || '-';
        if (t === '.' || t === '-') { row.push(t === '.' ? { hold: true } : null); continue; }
        var kind = t.charAt(t.length - 1), n = parseInt(t, 10), len = 1;
        for (var j = i + 1; j < 16 && tok[j] === '.'; j++) len++;
        row.push({ n: n, kind: kind, len: len });
      }
      out.push(row);
    }
    return out;
  }
  function parseLead(bars) {
    var out = [];
    for (var b = 0; b < bars.length; b++) {
      var tok = bars[b].split(/\s+/), row = [];
      for (var i = 0; i < 8; i++) {
        var t = tok[i] || '-';
        if (t === '.' || t === '-') { row.push(null); continue; }
        var len = 1;
        for (var j = i + 1; j < 8 && tok[j] === '.'; j++) len++;
        row.push({ n: parseInt(t, 10), len: len });
      }
      out.push(row);
    }
    return out;
  }
  var R = {}, Ld = {};
  for (var rk in RIFF) R[rk] = parseRiff(RIFF[rk]);
  for (var lk in LEAD) Ld[lk] = parseLead(LEAD[lk]);

  // 段落编排：每个状态一组 4 小节乐句的循环
  var SONG = {
    menu:    { bpm: 100, parts: [['air', 'soft', 1], ['glen', 'soft', 1], ['air', 'pulse', 1], ['glen', 'soft', 1]], vol: 0.74 },
    battle0: { bpm: 112, parts: [['reel', 'pulse', 1], ['jig', 'pulse', 1], ['reel', 'pulse', 1], ['glen', 'soft', 1]], vol: 0.76 },
    battle1: { bpm: 120, parts: [['reel', 'pulse', 1], ['jig', 'drive', 1], ['reel', 'pulse', 1], ['jig', 'pulse', 1]], vol: 0.78 },
    battle2: { bpm: 128, parts: [['jig', 'drive', 1], ['reel', 'drive', 1], ['jig', 'drive', 1], ['glen', 'pulse', 1]], vol: 0.8 },
    boss:    { bpm: 148, parts: [['dusk', 'alarm', 1], ['hunt', 'alarm', 1], ['dusk', 'alarm', 1], ['hunt', 'drive', 1]], vol: 0.84 }
  };
  var E2 = 82.407;   // 低音 E

  function Sfx() {
    this.ctx = null; this.master = null; this.muted = false; this.musicOff = false; this.last = {}; this.noiseBuf = null;
    this.music = { state: 'off', song: null, next: 0, step: 0, part: 0 };
  }
  var S = Sfx.prototype;
  // 地图主题（js/map.js 的 music）：key 移调半音数、tempo 速度倍率、amb 环境层
  S.kf = 1; S.tempo = 1; S.amb = 'meadow';
  S.setTheme = function (mu) {
    mu = mu || {};
    this.kf = Math.pow(2, (mu.key || 0) / 12); this.tempo = mu.tempo || 1; this.amb = mu.amb || 'meadow';
  };

  function distCurve(k) {
    var n = 2048, c = new Float32Array(n);
    for (var i = 0; i < n; i++) { var x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    return c;
  }

  // 用给定的 AudioContext 搭建总线（实时播放和离线渲染共用）
  S.build = function (ctx) {
    this.ctx = ctx;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
    this.master = ctx.createGain(); this.master.connect(comp); comp.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.connect(this.master);
    this.applyGains();
    // 噪声
    var len = Math.floor(ctx.sampleRate * 1.2), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), seed = 12345;
    for (var i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = seed / 0x3fffffff - 1; }
    this.noiseBuf = buf;
    // 拨弦：左右两轨，几乎无失真
    this.gtr = [this.guitarChain(-0.4, 1.8), this.guitarChain(0.4, 2)];
    // 旋律：干净三角波 + 一点回声
    var lead = this.guitarChain(0, 1.4, true);
    var dl = ctx.createDelay(1); dl.delayTime.value = 0.28;
    var fb = ctx.createGain(); fb.gain.value = 0.28;
    var wet = ctx.createGain(); wet.gain.value = 0.3;
    lead.out.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(this.musicBus);
    this.lead = lead;
    // 贝斯
    this.bass = ctx.createBiquadFilter(); this.bass.type = 'lowpass'; this.bass.frequency.value = 700;
    var bg = ctx.createGain(); bg.gain.value = 0.32; this.bass.connect(bg); bg.connect(this.musicBus);
    // 鼓
    this.drums = ctx.createGain(); this.drums.gain.value = 0.45; this.drums.connect(this.musicBus);
    // 技能音效仍走一轨稍亮的拨弦，不再用重失真
    this.stabGtr = this.guitarChain(0, 3.5, false, this.sfxBus);
  };
  S.guitarChain = function (pan, drive, lead, dest) {
    var ctx = this.ctx, inp = ctx.createGain(), sh = ctx.createWaveShaper();
    sh.curve = distCurve(drive); sh.oversample = '4x';
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = lead ? 180 : 70;
    var mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 480; mid.Q.value = 0.6; mid.gain.value = lead ? 1.5 : 2;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lead ? 2400 : 1800; lp.Q.value = 0.5;
    var out = ctx.createGain(); out.gain.value = lead ? 0.2 : 0.16;
    inp.connect(sh); sh.connect(hp); hp.connect(mid); mid.connect(lp); lp.connect(out);
    var node = out;
    if (pan && ctx.createStereoPanner) { var p = ctx.createStereoPanner(); p.pan.value = pan; out.connect(p); node = p; }
    node.connect(dest || this.musicBus);
    return { inp: inp, out: out };
  };

  S.init = function () {
    if (this.ctx) return;
    var ctx = RW.Plat.createAudioContext();
    if (!ctx) return;
    this.build(ctx);
  };
  // 浏览器需要用户手势解锁
  S.unlock = function () {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume();
  };
  // 三条总线的基准音量 × 设置页里的百分比（总音量 / 音乐 / 音效）
  S.vol = { master: 1, music: 1, sfx: 1 };
  S.applyGains = function () {
    if (!this.master) return;
    this.master.gain.value = this.muted ? 0 : 0.8 * this.vol.master;
    this.sfxBus.gain.value = 0.9 * this.vol.sfx;
    this.musicBus.gain.value = this.musicOff ? 0 : 0.62 * this.vol.music;
  };
  S.setVolumes = function (master, music, sfx) { this.vol = { master: master, music: music, sfx: sfx }; this.applyGains(); };
  S.setMuted = function (m) { this.muted = m; this.applyGains(); };
  S.setMusicOff = function (off) { this.musicOff = off; this.applyGains(); };
  S.ok = function (key, gap) {
    if (!this.ctx || this.muted) return false;
    var t = this.ctx.currentTime;
    if (gap && this.last[key] && t - this.last[key] < gap) return false;
    this.last[key] = t;
    return true;
  };

  // ---------------- 基础发声 ----------------
  S.tone = function (f0, f1, dur, type, vol, delay, dest) {
    var ctx = this.ctx, t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  };
  S.noise = function (dur, vol, ftype, f0, f1, delay, dest) {
    var ctx = this.ctx, t = ctx.currentTime + (delay || 0);
    var src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noiseBuf;
    flt.type = ftype || 'lowpass';
    flt.frequency.setValueAtTime(f0 || 2000, t);
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(dest || this.sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  };

  // 竖琴一拨：基音加很轻的八度泛音，很快衰减
  S.chord = function (chain, semis, at, dur, minor, vol) {
    var ctx = this.ctx, f = E2 * this.kf * Math.pow(2, semis / 12) * 2;
    var g = ctx.createGain();
    var v = (vol || 1) * 0.9;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v, at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, at + Math.min(0.55, dur + 0.12));
    g.connect(chain.inp);
    var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(at); o.stop(at + 0.6);
    var h = ctx.createOscillator(), hg = ctx.createGain(); h.type = 'sine'; h.frequency.value = f * 2; hg.gain.value = 0.18;
    h.connect(hg); hg.connect(g); h.start(at); h.stop(at + 0.35);
  };
  S.bassNote = function (semis, at, dur, vol) {
    var ctx = this.ctx, f = E2 * this.kf / 2 * Math.pow(2, semis / 12), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.006);
    g.gain.exponentialRampToValueAtTime(vol * 0.4, at + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.04);
    g.connect(this.bass);
    var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; var og = ctx.createGain(); og.gain.value = 0.35; o.connect(og); og.connect(g); o.start(at); o.stop(at + dur + 0.06);
    var s = ctx.createOscillator(); s.type = 'sine'; s.frequency.value = f; var sg = ctx.createGain(); sg.gain.value = 1.1;
    s.connect(sg); sg.connect(g); s.start(at); s.stop(at + dur + 0.06);
  };
  S.leadNote = function (semis, at, dur) {
    var ctx = this.ctx, f = Math.max(40, E2 * this.kf * 4 * Math.pow(2, semis / 12)), g = ctx.createGain(), o = ctx.createOscillator();
    o.type = 'sine';
    var from = this._fl && Math.abs(this._fl - f) > 1 ? this._fl : f;
    o.frequency.setValueAtTime(from, at);
    if (from !== f) o.frequency.exponentialRampToValueAtTime(f, at + 0.04);
    this._fl = f;
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 5.8; lg.gain.setValueAtTime(f * 0.004, at); lg.gain.linearRampToValueAtTime(f * 0.01, at + Math.min(0.35, dur * 0.5));
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.5, at + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.06);
    o.connect(g); g.connect(this.lead.inp);
    o.start(at); o.stop(at + dur + 0.2); lfo.start(at); lfo.stop(at + dur + 0.2);
    this.hit(at, 0.05, 0.012, 'bandpass', 1800);
  };
  // 鼓组
  S.kick = function (at, vol) {
    var ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(90, at); o.frequency.exponentialRampToValueAtTime(48, at + 0.08);
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    o.connect(g); g.connect(this.drums); o.start(at); o.stop(at + 0.18);
  };
  S.snare = function (at, vol) {
    var ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(220, at); o.frequency.exponentialRampToValueAtTime(160, at + 0.08);
    g.gain.setValueAtTime(vol * 0.6, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
    o.connect(g); g.connect(this.drums); o.start(at); o.stop(at + 0.12);
    this.hit(at, 0.18, vol, 'bandpass', 2200);
    this.hit(at, 0.12, vol * 0.5, 'highpass', 6000);
  };
  S.hat = function (at, vol, open) { this.hit(at, open ? 0.25 : 0.035, vol, 'highpass', 8000); };
  S.crash = function (at, vol) { this.hit(at, 1.4, vol, 'highpass', 5000); this.hit(at, 0.6, vol * 0.5, 'bandpass', 3500); };
  S.tom = function (at, vol, f) {
    var ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(f * 0.6, at + 0.2);
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
    o.connect(g); g.connect(this.drums); o.start(at); o.stop(at + 0.3);
  };
  S.hit = function (at, dur, vol, ftype, f) {
    var ctx = this.ctx, src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noiseBuf; flt.type = ftype; flt.frequency.value = f;
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(flt); flt.connect(g); g.connect(this.drums);
    src.start(at, (at * 7.31) % 0.8); src.stop(at + dur + 0.02);
  };

  // ---------------- 音乐排程 ----------------
  // 在绝对时间 at 播放第 step 个十六分音符（step 从本段落开头算起）
  S.playStep = function (song, step, at) {
    var spb = 60 / (song.bpm * this.tempo) / 4, bar = (step >> 4) % 4, s = step % 16, phrase = (step >> 6) % song.parts.length;
    var part = song.parts[phrase], riff = R[part[0]], dr = DRUM[part[1]], withLead = part[2], v = song.vol;
    // 吉他 + 贝斯
    var ev = riff[bar][s];
    if (ev && !ev.hold) {
      var dur = ev.len * spb;
      this.chord(this.gtr[s % 2], ev.n, at, dur, ev.kind === 'm', v);
      if (s % 8 === 0) this.bassNote(ev.n, at, spb * 8, 0.22 * v);
    }
    // 主音吉他（八分音符格）
    if (withLead && s % 2 === 0) {
      var lr = Ld[part[0]] || Ld.air, le = lr[bar][s >> 1];
      if (le) this.leadNote(le.n, at, le.len * spb * 2);
    }
    // 鼓：乐句最后一小节的后半用加花
    var fill = part[1] !== 'soft' && bar === 3 && s >= 8;
    var K = fill ? FILL.k : dr.k, SN = fill ? FILL.s : dr.s;
    if (K.charAt(s) === 'x') this.kick(at, 0.32 * v);
    if (SN.charAt(s) === 'x') this.snare(at, (fill ? 0.12 : 0.1) * v);
    if (fill && FILL.t.charAt(s) === 'x') this.tom(at, 0.28 * v, 180 - (s - 8) * 12);
    if (!fill && dr.h.charAt(s) === 'x') this.hat(at, 0.025 * v, false);
    if (s === 0 && bar === 0) this.tone(880 * this.kf, 660 * this.kf, 0.18, 'sine', 0.03 * v, 0, this.musicBus);
    this.ambience(step, s, bar, at, v);
  };
  // 地图环境层：林地鸟鸣、雪岭风铃与风声、沼泽低鸣与蛙声（都很轻，垫在音乐下面）
  S.ambience = function (step, s, bar, at, v) {
    var dt = at - this.ctx.currentTime, B = this.musicBus, k = this.kf;
    if (dt < 0) dt = 0;
    if (this.amb === 'forest') {
      if (s === 6 && bar % 2 === 0) { this.tone(2400, 3300, 0.07, 'sine', 0.018 * v, dt, B); this.tone(2900, 3600, 0.06, 'sine', 0.014 * v, dt + 0.09, B); }
      if (s === 13 && bar === 3) this.tone(1900, 2600, 0.1, 'sine', 0.015 * v, dt, B);
    } else if (this.amb === 'snow') {
      var chime = [1320, 1480, 1760, 1980, 2217];
      if (s === 0 || s === 10) this.tone(chime[(step >> 2) % 5] * k, chime[(step >> 2) % 5] * k * 0.995, 0.9, 'sine', 0.012 * v, dt, B);
      if (s === 0 && bar === 0) this.noise(2.4, 0.03 * v, 'bandpass', 500, 1400, dt, B);
    } else if (this.amb === 'marsh') {
      if (s === 0 && bar % 2 === 0) { this.tone(E2 * k / 2, E2 * k / 2, 1.8, 'triangle', 0.035 * v, dt, B); this.tone(E2 * k * 0.75, E2 * k * 0.75, 1.8, 'sine', 0.02 * v, dt, B); }
      if (s === 12 && bar % 2 === 1) { this.tone(180, 120, 0.08, 'triangle', 0.03 * v, dt, B); this.tone(170, 110, 0.08, 'triangle', 0.025 * v, dt + 0.12, B); }
    }
  };

  // state: 'off' | 'menu' | 'battle' | 'boss'；intensity 0–1
  S.updateMusic = function (state, intensity) {
    var m = this.music;
    if (!this.ctx || this.muted || this.musicOff) state = 'off';
    var key = state === 'battle' ? 'battle' + (intensity > 0.75 ? 2 : (intensity > 0.4 ? 1 : 0)) : state;
    if (key === 'off') { m.state = 'off'; m.next = 0; return; }
    var now = this.ctx.currentTime;
    // 换状态：菜单 <-> 战斗 / Boss 立刻切（从新段落的开头起）；战斗强度变化等到当前乐句结束
    var bigChange = m.state === 'off' || (m.state.slice(0, 6) !== key.slice(0, 6));
    if (key !== m.state && (bigChange || m.step % 64 === 0)) { m.state = key; m.song = SONG[key]; m.step = 0; if (bigChange) m.next = now + 0.05; }
    if (m.next < now) m.next = now + 0.05;
    var spb = 60 / (m.song.bpm * this.tempo) / 4;
    while (m.next < now + 0.2) {
      this.playStep(m.song, m.step, m.next);
      m.next += spb; m.step++;
      if (key !== m.state && m.step % 64 === 0) { m.state = key; m.song = SONG[key]; m.step = 0; spb = 60 / (m.song.bpm * this.tempo) / 4; }
    }
  };

  // 离线渲染一段音乐（试听、测试用）：返回 AudioBuffer 的 Promise
  RW.renderMusic = function (state, seconds, sampleRate, theme) {
    var sr = sampleRate || 44100, OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    var ctx = new OAC(2, Math.ceil(sr * seconds), sr), s = new Sfx();
    s.build(ctx);
    s.setTheme(theme);   // 地图主题（移调、速度、环境层）
    var song = SONG[state], spb = 60 / (song.bpm * s.tempo) / 4, n = Math.floor(seconds / spb);
    for (var i = 0; i < n; i++) s.playStep(song, i, 0.05 + i * spb);
    return ctx.startRendering();
  };
  RW.SONGS = Object.keys(SONG);

  // ---------------- 音效 ----------------
  // 每层分开：低频身体、噪声瞬态、泛音铃。音高每次略偏，避免同一声反复。
  S.impact = function (power, delay, pitch) {
    var p = Math.max(0.18, Math.min(1, power || 0.4)), d = delay || 0;
    var j = (0.92 + Math.random() * 0.16) * (pitch || 1), len = 0.14 + p * 0.62;
    this.tone((62 + p * 48) * j, 30, len, 'sine', 0.34 + p * 0.38, d, this.sfxBus);
    this.tone(40 * j, 26, len * 1.25, 'sine', 0.16 * p, d + 0.015, this.sfxBus);
    this.noise(0.02 + p * 0.015, 0.16 + p * 0.2, 'highpass', 1800, 600, d, this.sfxBus);
    this.noise(len * 0.55, 0.22 + p * 0.32, 'lowpass', 520 + p * 380, 70, d, this.sfxBus);
    if (p > 0.5) this.noise(0.28 + p * 0.2, 0.08 * p, 'bandpass', 240, 90, d + 0.04, this.sfxBus);
  };
  S.boom = function (vol) { this.impact(0.62 + Math.min(0.38, vol || 0.4)); };
  S.whoosh = function (dur, vol, f0, f1, delay) {
    this.noise(dur, vol, 'bandpass', f0, f1 || f0 * 0.4, delay || 0, this.sfxBus);
  };
  S.bell = function (freq, dur, vol, delay) {
    var ctx = this.ctx, t = ctx.currentTime + (delay || 0);
    var f = Math.max(50, freq * (0.985 + Math.random() * 0.03));
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(vol * 0.35, t + dur * 0.28);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + dur + 0.02);
    var o2 = ctx.createOscillator(), g2 = ctx.createGain();
    o2.type = 'sine'; o2.frequency.value = f * 2.76;
    g2.gain.setValueAtTime(vol * 0.12, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.22);
    o2.connect(g2); g2.connect(this.sfxBus); o2.start(t); o2.stop(t + dur * 0.3);
  };
  S.swell = function (f0, f1, dur, vol, delay) {
    this.tone(f0, f1, dur, 'sine', vol, delay || 0, this.sfxBus);
    this.whoosh(dur, vol * 0.35, f0 * 3, f1 * 2, delay || 0);
  };

  // 怪物的受击 / 死亡：身体冲击 + 材质层（甲壳金属声、黏液声、骨头声、灵体声）
  S.creature = function (type, power) {
    var pr = (RW.ENEMY_SFX && RW.ENEMY_SFX[type]) || { pitch: 1, body: 0.5, tone: 'flesh' }, p = power * (0.6 + 0.6 * pr.body), q = pr.pitch;
    this.impact(p, 0, q);
    switch (pr.tone) {
      case 'shell': this.bell(900 * q, 0.14, 0.05 * power); this.noise(0.04, 0.08 * power, 'highpass', 4200, 2600, 0, this.sfxBus); break;
      case 'goo': this.tone(320 * q, 110 * q, 0.14, 'sine', 0.12 * power, 0, this.sfxBus); this.noise(0.12, 0.08 * power, 'lowpass', 700, 180, 0.01, this.sfxBus); break;
      case 'bone': this.noise(0.03, 0.12 * power, 'bandpass', 2600, 2000, 0, this.sfxBus); this.tone(1300 * q, 820 * q, 0.05, 'triangle', 0.05 * power, 0, this.sfxBus); break;
      case 'spirit': this.whoosh(0.2, 0.07 * power, 1200 * q, 3200 * q); this.bell(1400 * q, 0.3, 0.03 * power, 0.02); break;
    }
  };

  S.play = function (ev) {
    var a = ev.a;
    switch (ev.type) {
      case 'shot':
        if (a === 'needle' && this.ok('needle', 0.05)) this.whoosh(0.07, 0.08, 2800, 900);
        else if (a === 'scatter' && this.ok('scatter', 0.05)) { this.impact(0.42); this.whoosh(0.12, 0.1, 900, 300); }
        else if (a === 'tower' && this.ok('tower', 0.08)) this.whoosh(0.05, 0.05, 1600, 700);
        break;
      case 'hit':
        if (a && this.ok('crit', 0.05)) { this.creature(ev.b, 0.64); this.bell(740, 0.12, 0.05); }
        else if (this.ok('hit', 0.04)) this.creature(ev.b, 0.36);
        break;
      case 'bladeHit': if (this.ok('blade', 0.05)) { this.impact(0.46); this.whoosh(0.08, 0.07, 2200, 600); } break;
      case 'charge': if (this.ok('charge', 0.1)) this.swell(140, 420, 0.34, 0.08); break;
      case 'lance': if (this.ok('lance', 0.05)) { this.impact(0.55); this.whoosh(0.14, 0.1, 1600, 280); } break;
      case 'arc': if (this.ok('arc', 0.06)) { this.whoosh(0.06, 0.1, 3200, 900); this.whoosh(0.04, 0.06, 1800, 400, 0.03); } break;
      case 'mineDrop': if (this.ok('mdrop', 0.1)) this.impact(0.22); break;
      case 'boom': if (this.ok('boom', 0.06)) this.boom(0.7); break;
      case 'pulse': if (this.ok('pulse', 0.1)) this.swell(90, 50, 0.28, 0.16); break;
      case 'kill':
        if (this.ok('kill' + (a || ''), 0.04)) this.creature(a, a === 'shell' ? 0.74 : 0.5);
        break;
      case 'shrine': if (this.ok('shrine', 0.5)) { this.bell(660, 0.5, 0.07); this.bell(990, 0.6, 0.06, 0.1); this.bell(1320, 0.8, 0.05, 0.22); } break;
      case 'coreForm': if (this.ok('cform', 1)) { this.impact(0.7); this.bell(392, 0.8, 0.08, 0.05); this.bell(588, 1, 0.07, 0.2); this.bell(784, 1.3, 0.06, 0.35); } break;
      case 'eliteDown': if (this.ok('eliteDown')) { this.impact(0.86); this.bell(220, 0.7, 0.1, 0.05); this.bell(330, 0.8, 0.08, 0.18); } break;
      case 'pickup': if (this.ok('pick', 0.028)) this.bell(620 * Math.pow(2, Math.min(a || 1, 12) / 12), 0.09, 0.05); break;
      case 'hurt': if (this.ok('hurt', 0.1)) { this.impact(0.72); this.whoosh(0.16, 0.08, 400, 120); } break;
      case 'dodge': if (this.ok('dodge', 0.1)) this.whoosh(0.14, 0.1, 600, 1800); break;
      case 'dashWarn': if (this.ok('dwarn', 0.15)) { this.bell(520, 0.06, 0.04); this.bell(520, 0.06, 0.04, 0.1); } break;
      case 'coreAlert': if (this.ok('calert', 1.5)) { this.bell(196, 0.2, 0.08); this.bell(196, 0.22, 0.08, 0.24); } break;
      case 'coreHit': if (this.ok('chit', 0.12)) this.impact(0.58); break;
      case 'bossWarn': if (this.ok('bwarn', 1)) { this.impact(0.7); this.impact(0.8, 0.36); this.impact(0.95, 0.72); this.bell(110, 1.1, 0.1, 1.05); } break;
      case 'bossSlamWarn': if (this.ok('bsw', 0.5)) this.swell(80, 180, 0.7, 0.1); break;
      case 'bossSlam': if (this.ok('bslam', 0.3)) { this.impact(1); this.impact(0.82, 0.09); } break;
      case 'bossRage': if (this.ok('brage', 1)) { this.impact(0.9); this.swell(160, 90, 0.8, 0.12); } break;
      case 'bossDown': if (this.ok('bdown', 1)) { this.impact(1); this.bell(196, 0.5, 0.08, 0.2); this.bell(247, 0.6, 0.07, 0.4); this.bell(294, 0.8, 0.07, 0.62); this.bell(392, 1.3, 0.08, 0.86); } break;
      case 'streak': if (this.ok('streak', 0.5)) this.bell(660 * Math.pow(2, Math.min(5, (a || 10) / 30) / 12), 0.28, 0.06); break;
      case 'edash': if (this.ok('edash', 0.1)) this.whoosh(0.12, 0.09, 500, 1600); break;
      case 'dash': if (this.ok('pdash', 0.1)) this.whoosh(0.16, 0.14, 280, 1400); break;
      case 'skill':
        if (!this.ok('skill', 0.2)) break;
        if (a === 'nova') this.impact(0.95);
        else if (a === 'veil') this.whoosh(0.45, 0.12, 400, 2200);
        else if (a === 'well') { this.swell(280, 70, 0.7, 0.14); this.bell(196, 0.6, 0.06, 0.05); }
        else if (a === 'storm') { this.impact(0.55); for (var q = 0; q < 5; q++) this.whoosh(0.05, 0.07, 900 + q * 280, 400, q * 0.04); }
        else this.impact(0.6);
        break;
      case 'strike': if (this.ok('strike', 0.05)) this.impact(0.68); break;
      case 'build': if (this.ok('build', 0.1)) { this.impact(0.24); this.impact(0.28, 0.09); } break;
      case 'soldier': if (this.ok('soldier', 0.3)) this.bell(494, 0.16, 0.05); break;
      case 'eat': if (this.ok('eat', 0.04)) { this.impact(0.2); this.whoosh(0.08, 0.05, 300, 120); } break;
      case 'gulp': if (this.ok('gulp', 0.04)) this.bell(520, 0.08, 0.04); break;
      case 'victory': if (this.ok('victory', 2)) { this.impact(0.9); for (var vz = 0; vz < 5; vz++) this.bell([262, 330, 392, 523, 659][vz], 1.4, 0.07, vz * 0.16); } break;
      case 'evolve': if (this.ok('evolve')) { this.bell(392, 0.2, 0.06); this.bell(494, 0.24, 0.06, 0.12); this.bell(587, 0.3, 0.06, 0.24); this.bell(784, 0.7, 0.07, 0.38); } break;
      case 'fuse': if (this.ok('fuse', 0.2)) { for (var z = 0; z < 3; z++) this.bell(700 + z * 80, 0.05, 0.03, z * 0.08); } break;
      case 'spitAim': if (this.ok('saim', 0.3)) this.whoosh(0.12, 0.04, 900, 1400); break;
      case 'spit': if (this.ok('spit', 0.1)) this.whoosh(0.09, 0.08, 1400, 500); break;
      case 'broodSpawn': if (this.ok('brood', 0.3)) { this.impact(0.3); this.whoosh(0.18, 0.06, 240, 90); } break;
      case 'eliteWarn': if (this.ok('ewarn', 0.5)) { this.impact(0.4); this.bell(165, 0.3, 0.06, 0.12); } break;
      case 'eliteFire': if (this.ok('efire', 0.2)) { this.whoosh(0.16, 0.1, 500, 160); this.impact(0.35); } break;
      case 'towerHit': if (this.ok('thit', 0.2)) this.impact(0.3); break;
      case 'towerDown': if (this.ok('tdown')) this.impact(0.78); break;
      case 'waveStart': if (this.ok('ws')) { this.impact(0.45); this.bell(262, 0.16, 0.05, 0.08); this.bell(392, 0.4, 0.06, 0.2); } break;
      case 'waveClear': if (this.ok('wc')) { this.bell(523, 0.18, 0.05); this.bell(659, 0.2, 0.05, 0.12); this.bell(784, 0.24, 0.05, 0.24); this.bell(1046, 0.6, 0.06, 0.36); } break;
      case 'buy': if (this.ok('buy', 0.05)) { this.bell(880, 0.08, 0.045); this.bell(1175, 0.14, 0.04, 0.06); } break;
      case 'reroll': if (this.ok('reroll', 0.05)) this.whoosh(0.18, 0.08, 400, 1600); break;
      case 'sell': if (this.ok('sell', 0.05)) this.bell(660, 0.12, 0.05); break;
      case 'lock': case 'ui': case 'placing': if (this.ok('ui', 0.03)) this.bell(980, 0.04, 0.03); break;
      case 'deny': if (this.ok('deny', 0.08)) this.impact(0.22); break;
      case 'die': if (this.ok('die')) { this.impact(0.95); this.bell(196, 0.8, 0.07, 0.1); this.bell(155, 1.1, 0.06, 0.35); } break;
      // 审计补上的反馈音：战意升档 / 掉档、专注满、回血、兵营指令、重燃提示、失败结算
      case 'momTier': if (this.ok('mtier', 0.3)) { var tk = a || 1; this.impact(0.35 + 0.15 * tk); for (var mz = 0; mz <= tk; mz++) this.bell(392 * Math.pow(2, (mz * 4) / 12), 0.22 + mz * 0.06, 0.05, mz * 0.07); } break;
      case 'momDown': if (this.ok('mdown', 0.6)) this.whoosh(0.22, 0.05, 900, 300); break;
      case 'focusMax': if (this.ok('focus', 0.5)) { this.bell(1320, 0.12, 0.04); this.bell(1760, 0.2, 0.035, 0.06); } break;
      case 'heal': if (this.ok('heal', 0.3)) this.bell(880, 0.18, 0.03); break;
      case 'command': if (this.ok('cmd', 0.15)) { this.swell(220, 330, 0.22, 0.06); this.bell(440, 0.2, 0.045, 0.08); } break;
      case 'reviveOffer': if (this.ok('roffer', 1)) { this.swell(70, 140, 1, 0.12); this.bell(147, 1.2, 0.07, 0.3); } break;
      case 'result': if (this.ok('result', 2)) { this.impact(0.6); var dn = [392, 330, 262, 196]; for (var rz = 0; rz < dn.length; rz++) this.bell(dn[rz], 0.9, 0.06, rz * 0.2); } break;
      case 'revive': if (this.ok('rev')) { this.bell(392, 0.16, 0.06); this.bell(523, 0.2, 0.06, 0.12); this.bell(784, 0.55, 0.07, 0.26); } break;
      case 'slash': if (this.ok('slash', 0.05)) { this.whoosh(0.09, 0.1, 1800, 420); this.noise(0.03, 0.06, 'highpass', 2400, 800, 0, this.sfxBus); } break;
      case 'slashHeavy': if (this.ok('sheavy', 0.06)) { this.impact(0.62); this.whoosh(0.12, 0.12, 900, 220); } break;
      case 'shatter': if (this.ok('shatter', 0.04)) { this.noise(0.08, 0.1, 'bandpass', 1800, 900, 0, this.sfxBus); this.impact(0.28); } break;
      case 'comboUp': if (this.ok('combo', 0.05)) { var semi = [0, 2, 4, 7, 9][((a || 1) - 1) % 5]; this.bell(587.33 * Math.pow(2, semi / 12), 0.12, 0.05); } break;
      case 'comboBreak': if (this.ok('cbreak', 0.2)) this.tone(392, 196, 0.18, 'sine', 0.06, 0, this.sfxBus); break;
      case 'overloadStart': if (this.ok('ov', 0.4)) { this.impact(0.8); this.bell(294, 0.4, 0.07); this.bell(440, 0.55, 0.06, 0.08); this.whoosh(0.3, 0.1, 200, 80); } break;
      case 'overloadEnd': if (this.ok('ovend', 0.3)) this.tone(330, 180, 0.22, 'sine', 0.05, 0, this.sfxBus); break;
      case 'nightWin': if (this.ok('nwin', 1)) { this.bell(523, 0.4, 0.07); this.bell(659, 0.5, 0.06, 0.12); this.bell(784, 0.7, 0.06, 0.24); } break;
      case 'nightLose': if (this.ok('nlose', 1)) { this.impact(0.7); this.bell(196, 0.8, 0.06, 0.05); this.bell(147, 1, 0.05, 0.2); } break;
    }
  };

  RW.Sfx = new Sfx();
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
