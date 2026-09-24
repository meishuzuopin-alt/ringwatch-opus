// 环带值守 · 音乐与音效：重金属 / 摇滚风格，全部 Web Audio 运行时合成，没有任何音频文件（全部原创）
// 编制：两轨失真节奏吉他（左右声道）+ 主音吉他 + 贝斯 + 合成鼓组。
// 音乐按状态切换：menu（菜单 / 整备，慢速重型）/ battle（按强度 0–2 换段落）/ boss（半音与三全音的压迫段落）
(function (root) {
  var RW = root.RW;

  // ---------------- 乐句（原创） ----------------
  // 每小节 16 个十六分音符。记号：数字 = 相对 E 的半音；m = 闷音、c = 开放强力和弦（后面的 . 表示延音）、- = 休止
  // l = 主音吉他旋律（相对 E4），用在副歌与高强度段落
  var RIFF = {
    gallop: [   // 主歌：E 小调 gallop（八分 + 两个十六分）
      '0m - 0m 0m 0m - 0m 0m 0m - 0m 0m 3c . . .',
      '0m - 0m 0m 0m - 0m 0m 5c . . . 3c . 1c .',
      '0m - 0m 0m 0m - 0m 0m 0m - 0m 0m 3c . . .',
      '0m - 0m 0m 0m - 0m 0m 8c . . . 7c . . .'
    ],
    anthem: [   // 副歌：开放和弦，大场面
      '0c . . . . . . . 3c . . . . . . .',
      '5c . . . . . . . 3c . . . 1c . . .',
      '8c . . . . . . . 7c . . . . . . .',
      '5c . . . 3c . . . 0c . . . . . 0m 0m'
    ],
    thrash: [   // 高强度：十六分闷音 + 重音和弦
      '0m 0m 0m 0m 6c . 0m 0m 0m 0m 5c . 0m 0m 3c .',
      '0m 0m 0m 0m 6c . 0m 0m 0m 0m 8c . 7c . 6c .',
      '0m 0m 0m 0m 6c . 0m 0m 0m 0m 5c . 0m 0m 3c .',
      '0m 0m 3c . 0m 0m 5c . 0m 0m 6c . 7c . 10c .'
    ],
    boss: [     // Boss：半音 + 三全音
      '0m 0m 1c . 0m 0m 6c . 0m 0m 1c . 0m 6c 5c .',
      '0m 0m 1c . 0m 0m 6c . 10c . . . 8c . 7c .',
      '0m 0m 1c . 0m 0m 6c . 0m 0m 1c . 0m 6c 5c .',
      '0m 1c 0m 6c 0m 5c 0m 1c 0m 0m 0m 0m 6c . . .'
    ],
    doom: [     // 菜单 / 整备：慢速、厚重
      '0c . . . . . . . . . . . 3c . . .',
      '1c . . . . . . . 0c . . . . . . .',
      '0c . . . . . . . . . . . 5c . 3c .',
      '1c . . . . . . . 6c . . . 5c . . .'
    ]
  };
  // 主音吉他：八分音符一格（相对 E4 的半音），- 为休止、. 为延音
  var LEAD = {
    anthem: [
      '7 . . . 10 . 12 .',
      '12 . . 10 7 . . .',
      '15 . . . 14 . 12 .',
      '10 . 7 . 5 . . .'
    ],
    thrash: [
      '12 - 15 - 12 - 10 -',
      '7 - 10 - 12 . . .',
      '12 - 15 - 17 - 15 -',
      '19 . . . 17 . 15 .'
    ]
  };
  // 鼓：k 底鼓 s 军鼓 h 踩镲 c 吊镲 t 通鼓（每字符一格十六分）
  var DRUM = {
    half:   { k: 'x.........x.....', s: '........x.......', h: 'x...x...x...x...' },
    groove: { k: 'x.....x.x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    gallop: { k: 'x.xxx.xxx.xxx.xx', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    double: { k: 'xxxxxxxxxxxxxxxx', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
    blast:  { k: 'x.x.x.x.x.x.x.x.', s: '.x.x.x.x.x.x.x.x', h: 'xxxxxxxxxxxxxxxx' }
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
    menu:    { bpm: 96,  parts: [['doom', 'half', 0], ['doom', 'half', 0], ['anthem', 'half', 0], ['doom', 'groove', 0]], vol: 0.7 },
    battle0: { bpm: 144, parts: [['gallop', 'groove', 0], ['gallop', 'gallop', 0], ['anthem', 'groove', 0], ['gallop', 'gallop', 0]], vol: 0.85 },
    battle1: { bpm: 156, parts: [['gallop', 'gallop', 0], ['thrash', 'double', 0], ['anthem', 'groove', 1], ['thrash', 'double', 0]], vol: 0.95 },
    battle2: { bpm: 168, parts: [['thrash', 'double', 1], ['thrash', 'double', 0], ['anthem', 'double', 1], ['thrash', 'blast', 1]], vol: 1 },
    boss:    { bpm: 172, parts: [['boss', 'double', 0], ['boss', 'blast', 0], ['thrash', 'double', 1], ['boss', 'blast', 1]], vol: 1 }
  };
  var E2 = 82.407;   // 低音 E

  function Sfx() {
    this.ctx = null; this.master = null; this.muted = false; this.musicOff = false; this.last = {}; this.noiseBuf = null;
    this.music = { state: 'off', song: null, next: 0, step: 0, part: 0 };
  }
  var S = Sfx.prototype;

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
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicOff ? 0 : 0.55; this.musicBus.connect(this.master);
    // 噪声
    var len = Math.floor(ctx.sampleRate * 1.2), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0), seed = 12345;
    for (var i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = seed / 0x3fffffff - 1; }
    this.noiseBuf = buf;
    // 节奏吉他：左右两轨，各自失真 + 箱体滤波
    this.gtr = [this.guitarChain(-0.7, 38), this.guitarChain(0.7, 42)];
    // 主音吉他：轻失真 + 回声
    var lead = this.guitarChain(0, 16, true);
    var dl = ctx.createDelay(1); dl.delayTime.value = 0.28;
    var fb = ctx.createGain(); fb.gain.value = 0.28;
    var wet = ctx.createGain(); wet.gain.value = 0.3;
    lead.out.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(this.musicBus);
    this.lead = lead;
    // 贝斯
    this.bass = ctx.createBiquadFilter(); this.bass.type = 'lowpass'; this.bass.frequency.value = 700;
    var bg = ctx.createGain(); bg.gain.value = 0.55; this.bass.connect(bg); bg.connect(this.musicBus);
    // 鼓
    this.drums = ctx.createGain(); this.drums.gain.value = 0.9; this.drums.connect(this.musicBus);
    // 音效里的吉他砸和弦共用一轨失真
    this.stabGtr = this.guitarChain(0, 40, false, this.sfxBus);
  };
  S.guitarChain = function (pan, drive, lead, dest) {
    var ctx = this.ctx, inp = ctx.createGain(), sh = ctx.createWaveShaper();
    sh.curve = distCurve(drive); sh.oversample = '4x';
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = lead ? 200 : 90;
    var mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 650; mid.Q.value = 0.8; mid.gain.value = lead ? 0 : -5;   // 金属吉他常见的中频挖空
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lead ? 5200 : 4200; lp.Q.value = 0.7;
    var out = ctx.createGain(); out.gain.value = lead ? 0.16 : 0.2;
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
  S.setMuted = function (m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
  };
  S.setMusicOff = function (off) {
    this.musicOff = off;
    if (this.musicBus) this.musicBus.gain.value = off ? 0 : 0.55;
  };
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

  // 吉他一击：强力和弦（根音 + 五度，开放和弦再加八度），at 为绝对时间
  S.chord = function (chain, semis, at, dur, mute, vol, octave) {
    var ctx = this.ctx, f = E2 * Math.pow(2, semis / 12) * (octave || 1);
    var g = ctx.createGain(), flt = ctx.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = mute ? 900 : 6000;   // 闷音：先滤掉高频再进失真，声音更「咚」
    var v = (vol || 1) * (mute ? 0.9 : 0.7);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v, at + 0.004);
    g.gain.exponentialRampToValueAtTime(v * (mute ? 0.05 : 0.5), at + (mute ? dur * 0.9 : dur * 0.8));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.05);
    g.connect(flt); flt.connect(chain.inp);
    var ratios = mute ? [1, 1.4983] : [1, 1.4983, 2];
    for (var i = 0; i < ratios.length; i++) {
      for (var d = -1; d <= 1; d += 2) {
        var o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = f * ratios[i]; o.detune.value = d * 7;
        o.connect(g); o.start(at); o.stop(at + dur + 0.08);
      }
    }
  };
  S.bassNote = function (semis, at, dur, vol) {
    var ctx = this.ctx, f = E2 / 2 * Math.pow(2, semis / 12), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.006);
    g.gain.exponentialRampToValueAtTime(vol * 0.4, at + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.04);
    g.connect(this.bass);
    var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(g); o.start(at); o.stop(at + dur + 0.06);
    var s = ctx.createOscillator(); s.type = 'sine'; s.frequency.value = f; var sg = ctx.createGain(); sg.gain.value = 1.4;
    s.connect(sg); sg.connect(g); s.start(at); s.stop(at + dur + 0.06);
  };
  S.leadNote = function (semis, at, dur) {
    var ctx = this.ctx, f = E2 * 4 * Math.pow(2, semis / 12), g = ctx.createGain(), o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.985, at); o.frequency.exponentialRampToValueAtTime(f, at + 0.05);   // 推弦进音
    var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(f * 0.012, at + dur * 0.6);   // 揉弦
    lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.5, at + 0.01); g.gain.setValueAtTime(0.5, at + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.06);
    o.connect(g); g.connect(this.lead.inp);
    o.start(at); o.stop(at + dur + 0.1); lfo.start(at); lfo.stop(at + dur + 0.1);
  };
  // 鼓组
  S.kick = function (at, vol) {
    var ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(160, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.12);
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    o.connect(g); g.connect(this.drums); o.start(at); o.stop(at + 0.25);
    this.hit(at, 0.012, vol * 0.35, 'highpass', 3000);   // 鼓槌咔嗒声
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
    var spb = 60 / song.bpm / 4, bar = (step >> 4) % 4, s = step % 16, phrase = (step >> 6) % song.parts.length;
    var part = song.parts[phrase], riff = R[part[0]], dr = DRUM[part[1]], withLead = part[2], v = song.vol;
    // 吉他 + 贝斯
    var ev = riff[bar][s];
    if (ev && !ev.hold) {
      var dur = ev.len * spb, mute = ev.kind === 'm';
      this.chord(this.gtr[0], ev.n, at, dur, mute, v);
      this.chord(this.gtr[1], ev.n, at + 0.006, dur, mute, v * 0.95);   // 双轨：右声道略晚一点，更宽
      this.bassNote(ev.n, at, dur, 0.5 * v);
    }
    // 主音吉他（八分音符格）
    if (withLead && s % 2 === 0) {
      var lr = Ld[part[0]] || Ld.anthem, le = lr[bar][s >> 1];
      if (le) this.leadNote(le.n, at, le.len * spb * 2);
    }
    // 鼓：乐句最后一小节的后半用加花
    var fill = bar === 3 && s >= 8;
    var K = fill ? FILL.k : dr.k, SN = fill ? FILL.s : dr.s;
    if (K.charAt(s) === 'x') this.kick(at, 0.9 * v);
    if (SN.charAt(s) === 'x') this.snare(at, (fill ? 0.35 + 0.04 * (s - 8) : 0.5) * v);
    if (fill && FILL.t.charAt(s) === 'x') this.tom(at, 0.5 * v, 180 - (s - 8) * 12);
    if (!fill && dr.h.charAt(s) === 'x') this.hat(at, 0.12 * v, part[1] === 'half' && s === 0);
    if (s === 0 && bar === 0) this.crash(at, 0.22 * v);
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
    var spb = 60 / m.song.bpm / 4;
    while (m.next < now + 0.2) {
      this.playStep(m.song, m.step, m.next);
      m.next += spb; m.step++;
      if (key !== m.state && m.step % 64 === 0) { m.state = key; m.song = SONG[key]; m.step = 0; spb = 60 / m.song.bpm / 4; }
    }
  };

  // 离线渲染一段音乐（试听、测试用）：返回 AudioBuffer 的 Promise
  RW.renderMusic = function (state, seconds, sampleRate) {
    var sr = sampleRate || 44100, OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    var ctx = new OAC(2, Math.ceil(sr * seconds), sr), s = new Sfx();
    s.build(ctx);
    var song = SONG[state], spb = 60 / song.bpm / 4, n = Math.floor(seconds / spb);
    for (var i = 0; i < n; i++) s.playStep(song, i, 0.05 + i * spb);
    return ctx.startRendering();
  };
  RW.SONGS = Object.keys(SONG);

  // ---------------- 音效 ----------------
  // 吉他砸和弦：开波、技能、Boss 等关键时刻用
  S.stab = function (semis, dur, vol, delay) {
    this.chord(this.stabGtr, semis, this.ctx.currentTime + (delay || 0), dur, false, vol);
  };
  // 泛音尖啸（pinch harmonic）：连杀
  S.squeal = function (f, dur, delay) {
    var ctx = this.ctx, t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.06, t + dur * 0.4);
    var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 7; lg.gain.value = f * 0.03; lfo.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.stabGtr.inp);
    o.start(t); o.stop(t + dur + 0.05); lfo.start(t); lfo.stop(t + dur + 0.05);
  };
  S.boom = function (vol, len) {
    this.noise(len, vol * 0.8, 'lowpass', 1600, 90);
    this.tone(120, 34, len, 'sine', vol);
  };

  S.play = function (ev) {
    var a = ev.a;
    switch (ev.type) {
      case 'shot':
        if (a === 'needle' && this.ok('needle', 0.05)) { this.noise(0.04, 0.06, 'bandpass', 3200, 1600); this.tone(900, 500, 0.04, 'square', 0.025); }
        else if (a === 'scatter' && this.ok('scatter', 0.05)) { this.noise(0.12, 0.28, 'lowpass', 2600, 400); this.tone(150, 60, 0.1, 'triangle', 0.2); }
        else if (a === 'tower' && this.ok('tower', 0.08)) this.noise(0.04, 0.05, 'bandpass', 2400, 1200);
        break;
      case 'hit':
        if (a && this.ok('crit', 0.05)) { this.tone(1400, 700, 0.06, 'square', 0.05); this.noise(0.05, 0.12, 'highpass', 3000); }
        else if (this.ok('hit', 0.035)) { this.tone(240, 120, 0.04, 'triangle', 0.07); this.noise(0.025, 0.05, 'bandpass', 1800); }
        break;
      case 'bladeHit': if (this.ok('blade', 0.06)) this.noise(0.05, 0.1, 'highpass', 3500); break;
      case 'charge': if (this.ok('charge', 0.1)) this.tone(160, 700, 0.32, 'sawtooth', 0.035); break;
      case 'lance': if (this.ok('lance', 0.05)) { this.noise(0.18, 0.24, 'bandpass', 2600, 600); this.tone(900, 120, 0.18, 'sawtooth', 0.09); } break;
      case 'arc': if (this.ok('arc', 0.06)) { this.noise(0.1, 0.14, 'bandpass', 5000, 1800); this.tone(2000, 700, 0.05, 'square', 0.025); } break;
      case 'mineDrop': if (this.ok('mdrop', 0.1)) this.tone(420, 380, 0.04, 'triangle', 0.05); break;
      case 'boom': if (this.ok('boom', 0.06)) this.boom(0.45, 0.34); break;
      case 'pulse': if (this.ok('pulse', 0.1)) this.tone(120, 70, 0.2, 'sine', 0.14); break;
      case 'kill':
        if (a === 'shell' && this.ok('killS', 0.05)) { this.tone(200, 90, 0.09, 'triangle', 0.12); this.noise(0.1, 0.14, 'lowpass', 1400); }
        else if (this.ok('kill', 0.03)) { this.tone(180, 70, 0.06, 'sine', 0.12); this.noise(0.04, 0.06, 'bandpass', 1400); }
        break;
      case 'eliteDown': if (this.ok('eliteDown')) { this.boom(0.55, 0.6); this.stab(0, 0.6, 0.9, 0.05); this.stab(7, 0.8, 0.8, 0.3); } break;
      case 'pickup': if (this.ok('pick', 0.028)) this.tone(900 * Math.pow(2, Math.min(a || 1, 14) / 12), 0, 0.05, 'triangle', 0.045); break;
      case 'hurt': if (this.ok('hurt', 0.1)) { this.tone(140, 50, 0.22, 'sawtooth', 0.18); this.noise(0.14, 0.2, 'lowpass', 900); } break;
      case 'dodge': if (this.ok('dodge', 0.1)) this.noise(0.12, 0.12, 'bandpass', 1200, 5000); break;
      case 'dashWarn': if (this.ok('dwarn', 0.15)) { this.tone(700, 700, 0.05, 'square', 0.035); this.tone(700, 700, 0.05, 'square', 0.035, 0.1); } break;
      case 'coreAlert': if (this.ok('calert', 1.5)) { this.stab(6, 0.18, 0.7); this.stab(6, 0.18, 0.7, 0.22); } break;
      case 'coreHit': if (this.ok('chit', 0.15)) this.tone(200, 150, 0.08, 'square', 0.045); break;
      case 'bossWarn': if (this.ok('bwarn', 1)) { for (var bq = 0; bq < 4; bq++) this.stab(bq === 3 ? 1 : 0, 0.3, 1, bq * 0.36); this.boom(0.5, 1.2); } break;
      case 'bossSlamWarn': if (this.ok('bsw', 0.5)) this.tone(160, 520, 0.9, 'sawtooth', 0.06); break;
      case 'bossSlam': if (this.ok('bslam', 0.3)) { this.boom(0.7, 0.7); this.stab(-5, 0.5, 0.9); } break;
      case 'bossRage': if (this.ok('brage', 1)) { this.squeal(1318, 0.9); this.boom(0.5, 0.9); } break;
      case 'bossDown': if (this.ok('bdown', 1)) { this.boom(0.8, 1.4); [0, 3, 5, 7, 12].forEach(function (n, i) { this.stab(n, i === 4 ? 1.6 : 0.3, 0.9, 0.3 + i * 0.22); }, this); } break;
      case 'streak': if (this.ok('streak', 0.5)) this.squeal(1046 * Math.pow(2, Math.min(6, (a || 25) / 25) / 12 * 2), 0.5); break;
      case 'edash': if (this.ok('edash', 0.1)) this.noise(0.14, 0.12, 'highpass', 1200, 4000); break;
      case 'dash': if (this.ok('pdash', 0.1)) { this.noise(0.18, 0.26, 'bandpass', 700, 5000); this.tone(220, 700, 0.12, 'sine', 0.08); } break;
      case 'skill':
        if (!this.ok('skill', 0.2)) break;
        if (a === 'nova') { this.boom(0.6, 0.5); this.stab(0, 0.45, 1); }
        else if (a === 'veil') { this.stab(5, 0.35, 0.9); this.noise(0.4, 0.16, 'highpass', 3000, 8000); }
        else if (a === 'well') { this.tone(500, 50, 0.9, 'sine', 0.24); this.stab(1, 0.8, 0.8, 0.05); }
        else if (a === 'storm') { this.stab(7, 0.3, 0.9); for (var q = 0; q < 6; q++) this.noise(0.05, 0.1, 'bandpass', 2400 + q * 400, 0, q * 0.035); }
        break;
      case 'strike': if (this.ok('strike', 0.05)) { this.noise(0.22, 0.34, 'bandpass', 4000, 700); this.tone(100, 40, 0.16, 'sawtooth', 0.14); } break;
      case 'build': if (this.ok('build', 0.1)) { this.tone(220, 220, 0.06, 'square', 0.06); this.noise(0.05, 0.12, 'lowpass', 1200, 0, 0.06); this.tone(330, 330, 0.1, 'square', 0.06, 0.12); } break;
      case 'soldier': if (this.ok('soldier', 0.3)) this.tone(520, 700, 0.08, 'triangle', 0.05); break;
      case 'eat': if (this.ok('eat', 0.04)) { this.tone(150, 70, 0.09, 'sine', 0.2); this.noise(0.06, 0.1, 'lowpass', 900); } break;
      case 'gulp': if (this.ok('gulp', 0.04)) this.tone(420, 840, 0.07, 'sine', 0.07); break;
      case 'evolve': if (this.ok('evolve')) { [0, 3, 7, 12].forEach(function (n, i) { this.stab(n, i === 3 ? 0.9 : 0.18, 0.85, i * 0.12); }, this); this.squeal(1318, 0.7, 0.4); } break;
      case 'fuse': if (this.ok('fuse', 0.2)) { for (var z = 0; z < 4; z++) this.tone(900, 900, 0.04, 'square', 0.04, z * 0.15); } break;
      case 'spitAim': if (this.ok('saim', 0.3)) this.tone(1100, 1400, 0.12, 'sine', 0.025); break;
      case 'spit': if (this.ok('spit', 0.1)) this.noise(0.08, 0.12, 'bandpass', 2500, 1200); break;
      case 'broodSpawn': if (this.ok('brood', 0.3)) { this.tone(140, 240, 0.2, 'triangle', 0.1); this.noise(0.2, 0.12, 'lowpass', 700); } break;
      case 'eliteWarn': if (this.ok('ewarn', 0.5)) { this.stab(0, 0.2, 0.8); this.stab(6, 0.35, 0.8, 0.22); } break;
      case 'eliteFire': if (this.ok('efire', 0.2)) this.tone(280, 120, 0.22, 'sine', 0.14); break;
      case 'towerHit': if (this.ok('thit', 0.25)) this.tone(180, 140, 0.06, 'square', 0.035); break;
      case 'towerDown': if (this.ok('tdown')) { this.boom(0.4, 0.4); this.tone(260, 60, 0.4, 'sawtooth', 0.1); } break;
      case 'waveStart': if (this.ok('ws')) { this.stab(0, 0.12, 0.9); this.stab(0, 0.12, 0.9, 0.14); this.stab(5, 0.7, 1, 0.28); } break;
      case 'waveClear': if (this.ok('wc')) { [0, 5, 7, 12].forEach(function (n, i) { this.stab(n, i === 3 ? 1.2 : 0.2, 0.8, i * 0.16); }, this); } break;
      case 'buy': if (this.ok('buy', 0.05)) { this.tone(1320, 0, 0.06, 'triangle', 0.06); this.tone(1980, 0, 0.12, 'triangle', 0.05, 0.05); } break;
      case 'reroll': if (this.ok('reroll', 0.05)) this.noise(0.2, 0.14, 'bandpass', 600, 3000); break;
      case 'sell': if (this.ok('sell', 0.05)) this.tone(660, 440, 0.1, 'triangle', 0.08); break;
      case 'lock': case 'ui': case 'placing': if (this.ok('ui', 0.03)) this.tone(900, 800, 0.025, 'square', 0.03); break;
      case 'deny': if (this.ok('deny', 0.08)) this.tone(160, 130, 0.12, 'square', 0.06); break;
      case 'die': if (this.ok('die')) { this.stab(0, 1.2, 1); this.stab(-1, 1.4, 0.9, 0.35); this.boom(0.5, 0.8); } break;
      case 'revive': if (this.ok('rev')) { this.stab(0, 0.2, 0.9); this.stab(7, 0.2, 0.9, 0.15); this.stab(12, 0.8, 1, 0.3); } break;
    }
  };

  RW.Sfx = new Sfx();
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
