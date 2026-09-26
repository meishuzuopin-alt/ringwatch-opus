// 圣火守护者 · 音效与背景节拍：全部 Web Audio 运行时合成，没有任何音频文件
(function (root) {
  var RW = root.RW;

  function Sfx() {
    this.ctx = null; this.master = null; this.muted = false; this.last = {}; this.noiseBuf = null;
    this.music = { on: false, next: 0, step: 0, intensity: 0 };
  }
  var S = Sfx.prototype;

  S.init = function () {
    if (this.ctx) return;
    var ctx = RW.Plat.createAudioContext();
    if (!ctx) return;
    this.ctx = ctx;
    var comp = ctx.createDynamicsCompressor ? ctx.createDynamicsCompressor() : null;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    if (comp) { this.master.connect(comp); comp.connect(ctx.destination); } else this.master.connect(ctx.destination);
    var len = Math.floor(ctx.sampleRate * 0.6), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    var seed = 12345;
    for (var i = 0; i < len; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; d[i] = seed / 0x3fffffff - 1; }
    this.noiseBuf = buf;
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
  S.ok = function (key, gap) {
    if (!this.ctx || this.muted) return false;
    var t = this.ctx.currentTime;
    if (gap && this.last[key] && t - this.last[key] < gap) return false;
    this.last[key] = t;
    return true;
  };

  S.tone = function (f0, f1, dur, type, vol, delay) {
    var ctx = this.ctx, t = ctx.currentTime + (delay || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  };
  S.noise = function (dur, vol, ftype, f0, f1, delay) {
    var ctx = this.ctx, t = ctx.currentTime + (delay || 0);
    var src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noiseBuf;
    flt.type = ftype || 'lowpass';
    flt.frequency.setValueAtTime(f0 || 2000, t);
    if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.3); src.stop(t + dur + 0.02);
  };

  S.play = function (ev) {
    var a = ev.a;
    switch (ev.type) {
      case 'shot':
        if (a === 'needle' && this.ok('needle', 0.05)) this.tone(1500, 950, 0.045, 'square', 0.035);
        else if (a === 'scatter' && this.ok('scatter', 0.05)) { this.noise(0.1, 0.22, 'lowpass', 2400, 500); this.tone(190, 80, 0.09, 'triangle', 0.16); }
        else if (a === 'tower' && this.ok('tower', 0.08)) this.tone(1000, 760, 0.04, 'square', 0.02);
        break;
      case 'hit':
        if (a && this.ok('crit', 0.05)) this.tone(1800, 1300, 0.05, 'square', 0.05);
        else if (this.ok('hit', 0.035)) this.tone(320, 180, 0.035, 'triangle', 0.06);
        break;
      case 'bladeHit': if (this.ok('blade', 0.06)) this.noise(0.04, 0.09, 'highpass', 3000); break;
      case 'charge': if (this.ok('charge', 0.1)) this.tone(220, 900, 0.32, 'sawtooth', 0.03); break;
      case 'lance': if (this.ok('lance', 0.05)) { this.noise(0.16, 0.2, 'bandpass', 2600, 700); this.tone(1100, 180, 0.16, 'sawtooth', 0.08); } break;
      case 'arc': if (this.ok('arc', 0.06)) { this.noise(0.09, 0.12, 'bandpass', 5000, 2000); this.tone(2400, 900, 0.05, 'square', 0.025); } break;
      case 'mineDrop': if (this.ok('mdrop', 0.1)) this.tone(520, 480, 0.04, 'triangle', 0.04); break;
      case 'boom': if (this.ok('boom', 0.06)) { this.noise(0.32, 0.35, 'lowpass', 1400, 120); this.tone(110, 38, 0.3, 'sine', 0.4); } break;
      case 'pulse': if (this.ok('pulse', 0.1)) this.tone(140, 90, 0.18, 'sine', 0.12); break;
      case 'kill':
        if (a === 'shell' && this.ok('killS', 0.05)) { this.tone(260, 520, 0.07, 'triangle', 0.08); this.noise(0.08, 0.1, 'lowpass', 1500); }
        else if (this.ok('kill', 0.03)) this.tone(520, 980, 0.05, 'triangle', 0.05);
        break;
      case 'eliteDown': if (this.ok('eliteDown')) { this.noise(0.5, 0.35, 'lowpass', 1800, 90); this.tone(240, 50, 0.55, 'sine', 0.45); this.tone(660, 1320, 0.25, 'triangle', 0.08, 0.12); } break;
      case 'pickup': if (this.ok('pick', 0.028)) this.tone(740 * Math.pow(2, Math.min(a || 1, 14) / 12), 0, 0.06, 'sine', 0.05); break;
      case 'hurt': if (this.ok('hurt', 0.1)) { this.tone(170, 60, 0.2, 'sawtooth', 0.16); this.noise(0.12, 0.14, 'lowpass', 900); } break;
      case 'dashWarn': if (this.ok('dwarn', 0.15)) { this.tone(760, 760, 0.05, 'square', 0.035); this.tone(760, 760, 0.05, 'square', 0.035, 0.1); } break;
      case 'coreAlert': if (this.ok('calert', 1.5)) { this.tone(880, 660, 0.18, 'square', 0.07); this.tone(880, 660, 0.18, 'square', 0.07, 0.22); } break;
      case 'coreHit': if (this.ok('chit', 0.15)) this.tone(240, 180, 0.07, 'square', 0.04); break;
      case 'bossWarn': if (this.ok('bwarn', 1)) { for (var bq = 0; bq < 3; bq++) { this.tone(110, 55, 0.5, 'sawtooth', 0.18, bq * 0.55); this.tone(220, 110, 0.5, 'square', 0.05, bq * 0.55); } } break;
      case 'bossSlamWarn': if (this.ok('bsw', 0.5)) this.tone(200, 600, 0.9, 'sawtooth', 0.05); break;
      case 'bossSlam': if (this.ok('bslam', 0.3)) { this.tone(70, 30, 0.6, 'sine', 0.5); this.noise(0.5, 0.35, 'lowpass', 1200, 60); } break;
      case 'bossRage': if (this.ok('brage', 1)) { this.tone(60, 200, 0.8, 'sawtooth', 0.2); this.noise(0.8, 0.25, 'bandpass', 300, 2000); } break;
      case 'bossDown': if (this.ok('bdown', 1)) { this.noise(1.2, 0.45, 'lowpass', 2500, 50); this.tone(300, 30, 1.2, 'sine', 0.5); [523, 659, 784, 1046, 1318].forEach(function (f, i) { this.tone(f, 0, 0.3, 'triangle', 0.1, 0.4 + i * 0.1); }, this); } break;
      case 'streak': if (this.ok('streak', 0.5)) { var sf = 660 * Math.pow(2, Math.min(6, (a || 25) / 25) / 12 * 2); this.tone(sf, sf * 1.5, 0.15, 'triangle', 0.09); this.tone(sf * 1.5, sf * 2, 0.2, 'triangle', 0.07, 0.1); } break;
      case 'edash': if (this.ok('edash', 0.1)) this.noise(0.14, 0.1, 'highpass', 1200, 4000); break;
      case 'dash': if (this.ok('pdash', 0.1)) { this.noise(0.18, 0.22, 'bandpass', 900, 5000); this.tone(300, 900, 0.12, 'sine', 0.08); } break;
      case 'skill':
        if (!this.ok('skill', 0.2)) break;
        if (a === 'nova') { this.tone(90, 40, 0.5, 'sine', 0.45); this.noise(0.45, 0.35, 'lowpass', 3000, 150); this.tone(1200, 300, 0.3, 'triangle', 0.08); }
        else if (a === 'veil') { this.tone(200, 1600, 0.25, 'sawtooth', 0.06); this.noise(0.3, 0.12, 'highpass', 3000, 8000); }
        else if (a === 'well') { this.tone(600, 60, 0.9, 'sine', 0.2); this.noise(0.8, 0.12, 'lowpass', 400, 80); }
        else if (a === 'storm') { for (var q = 0; q < 6; q++) this.tone(900 + q * 180, 1400 + q * 200, 0.06, 'square', 0.03, q * 0.03); }
        break;
      case 'strike': if (this.ok('strike', 0.05)) { this.noise(0.2, 0.3, 'bandpass', 4000, 800); this.tone(120, 50, 0.15, 'sawtooth', 0.12); } break;
      case 'build': if (this.ok('build', 0.1)) { this.tone(300, 300, 0.06, 'square', 0.06); this.tone(450, 450, 0.06, 'square', 0.06, 0.08); this.tone(600, 600, 0.1, 'square', 0.06, 0.16); } break;
      case 'soldier': if (this.ok('soldier', 0.3)) this.tone(660, 880, 0.08, 'triangle', 0.05); break;
      case 'eat': if (this.ok('eat', 0.04)) { this.tone(180, 90, 0.08, 'sine', 0.18); this.noise(0.05, 0.08, 'lowpass', 900); } break;
      case 'gulp': if (this.ok('gulp', 0.04)) this.tone(520, 1040, 0.07, 'sine', 0.07); break;
      case 'evolve': if (this.ok('evolve')) { [262, 330, 392, 523, 659].forEach(function (f, i) { this.tone(f, f * 1.01, 0.3, 'triangle', 0.1, i * 0.07); }, this); this.noise(0.6, 0.15, 'highpass', 500, 6000); } break;
      case 'fuse': if (this.ok('fuse', 0.2)) { for (var z = 0; z < 4; z++) this.tone(900, 900, 0.04, 'square', 0.04, z * 0.15); } break;
      case 'spitAim': if (this.ok('saim', 0.3)) this.tone(1200, 1500, 0.12, 'sine', 0.025); break;
      case 'spit': if (this.ok('spit', 0.1)) this.noise(0.08, 0.1, 'bandpass', 2500, 1200); break;
      case 'broodSpawn': if (this.ok('brood', 0.3)) { this.tone(160, 260, 0.2, 'triangle', 0.1); this.noise(0.2, 0.1, 'lowpass', 700); } break;
      case 'eliteWarn': if (this.ok('ewarn', 0.5)) { this.tone(440, 440, 0.18, 'square', 0.05); this.tone(330, 330, 0.22, 'square', 0.05, 0.2); } break;
      case 'eliteFire': if (this.ok('efire', 0.2)) this.tone(320, 140, 0.22, 'sine', 0.12); break;
      case 'towerHit': if (this.ok('thit', 0.25)) this.tone(200, 160, 0.06, 'square', 0.03); break;
      case 'towerDown': if (this.ok('tdown')) { this.noise(0.4, 0.3, 'lowpass', 1200, 100); this.tone(300, 70, 0.4, 'sawtooth', 0.1); } break;
      case 'waveStart': if (this.ok('ws')) { this.tone(392, 0, 0.1, 'triangle', 0.1); this.tone(523, 0, 0.1, 'triangle', 0.1, 0.1); this.tone(784, 0, 0.18, 'triangle', 0.1, 0.2); } break;
      case 'waveClear': if (this.ok('wc')) { [523, 659, 784, 1046].forEach(function (f, i) { this.tone(f, 0, 0.16, 'triangle', 0.1, i * 0.08); }, this); } break;
      case 'buy': if (this.ok('buy', 0.05)) { this.tone(1320, 0, 0.07, 'square', 0.05); this.tone(1760, 0, 0.12, 'square', 0.05, 0.06); } break;
      case 'reroll': if (this.ok('reroll', 0.05)) this.noise(0.18, 0.12, 'bandpass', 600, 3000); break;
      case 'sell': if (this.ok('sell', 0.05)) this.tone(660, 440, 0.1, 'triangle', 0.08); break;
      case 'lock': case 'ui': case 'placing': if (this.ok('ui', 0.03)) this.tone(1000, 900, 0.025, 'square', 0.03); break;
      case 'deny': if (this.ok('deny', 0.08)) this.tone(180, 150, 0.12, 'square', 0.06); break;
      case 'die': if (this.ok('die')) { this.tone(420, 40, 0.9, 'sawtooth', 0.14); this.noise(0.6, 0.2, 'lowpass', 2000, 80); } break;
      case 'revive': if (this.ok('rev')) { this.tone(200, 1200, 0.5, 'sine', 0.2); this.noise(0.4, 0.15, 'highpass', 800, 6000); } break;
    }
  };

  // ---------- 背景节拍：低音 + 闷踩 + 高帽，强度随波次与血量变化 ----------
  var BASS = [0, 0, 7, 0, 3, 0, 10, 5];
  S.updateMusic = function (on, intensity) {
    var m = this.music;
    m.on = on && !this.muted && !!this.ctx; m.intensity = intensity;
    if (!m.on) { m.next = 0; return; }
    var ctx = this.ctx, now = ctx.currentTime, step = 60 / 112 / 4;
    if (m.next < now) m.next = now + 0.05;
    while (m.next < now + 0.18) {
      var s = m.step % 16, t = m.next - now;
      if (s % 4 === 0) { this.tone(95, 45, 0.16, 'sine', 0.16, t); }
      if (s % 2 === 0) {
        var n = BASS[(m.step >> 1) % 8];
        this.tone(55 * Math.pow(2, n / 12), 0, step * 1.8, 'triangle', 0.05 + 0.03 * intensity, t);
      }
      if (intensity > 0.3 && s % 2 === 1) this.noise(0.03, 0.03 + 0.03 * intensity, 'highpass', 7000, 0, t);
      if (intensity > 0.65 && (s === 6 || s === 14)) this.tone(440 * Math.pow(2, BASS[s % 8] / 12), 0, 0.08, 'square', 0.018, t);
      m.next += step; m.step++;
    }
  };

  RW.Sfx = new Sfx();
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
