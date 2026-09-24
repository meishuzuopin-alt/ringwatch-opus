// 环带值守 · 界面：标题 / 选武器 / 整备商店 / 复活 / 结算 / 暂停
(function (root) {
  var RW = root.RW;
  var T = RW.TUNE, W = T.W, H = T.H, TAU = Math.PI * 2;
  var D = RW.Draw, C = D.C;
  var ROMAN = ['I', 'II', 'III'];

  var UI = { btns: [], pressed: null, toastMsg: '', toastT: 0, sel: null, t: 0 };

  UI.frame = function (dt) {
    UI.btns.length = 0;
    UI.t += dt;
    if (UI.toastT > 0) UI.toastT -= dt;
  };
  UI.toast = function (msg, dur) { UI.toastMsg = msg; UI.toastT = dur || 1.8; };
  UI.hit = function (x, y) {
    for (var i = UI.btns.length - 1; i >= 0; i--) {
      var b = UI.btns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  };
  UI.down = function (x, y) { var b = UI.hit(x, y); UI.pressed = b ? b.id : null; return b; };
  UI.up = function (x, y) {
    var b = UI.hit(x, y), id = UI.pressed;
    UI.pressed = null;
    if (b && b.id === id) {
      if (b.disabled) { if (b.why) UI.toast(b.why); if (UI.onDeny) UI.onDeny(); return null; }
      return b.id;
    }
    return null;
  };

  // opts: { style: 'primary'|'normal'|'ad'|'danger'|'ghost', sub, disabled, why, size, draw }
  UI.button = function (id, x, y, w, h, label, opts) {
    opts = opts || {};
    UI.btns.push({ id: id, x: x, y: y, w: w, h: h, disabled: !!opts.disabled, why: opts.why });
    var c = D.ctx, pressed = UI.pressed === id;
    if (opts.draw) { opts.draw(x, y, w, h, pressed); return; }
    var st = opts.style || 'normal';
    if (pressed) { c.save(); c.translate(x + w / 2, y + h / 2); c.scale(0.96, 0.96); c.translate(-x - w / 2, -y - h / 2); }
    c.globalAlpha = opts.disabled ? 0.4 : 1;
    var fill = '#1e1712', stroke = '#6a5234', tc = C.text;
    if (st === 'primary') { fill = C.cyan; stroke = '#b9fbff'; tc = '#04121a'; }
    else if (st === 'ad') { fill = '#1f1a08'; stroke = C.gold; tc = C.gold; }
    else if (st === 'danger') { fill = '#2a0b14'; stroke = C.red; tc = '#ffc2cd'; }
    else if (st === 'ghost') { fill = 'rgba(0,0,0,0)'; stroke = '#5a4630'; tc = C.dim; }
    c.fillStyle = fill; D.rr(x, y, w, h, 7); c.fill();
    c.strokeStyle = stroke; c.lineWidth = 1.5; D.rr(x + 0.5, y + 0.5, w - 1, h - 1, 7); c.stroke();
    var size = opts.size || 15;
    if (opts.sub) {
      D.text(label, x + w / 2, y + h / 2 - 8, size, tc, 'center', true);
      D.text(opts.sub, x + w / 2, y + h / 2 + 11, 10, st === 'primary' ? '#0b3440' : C.dim, 'center');
    } else D.text(label, x + w / 2, y + h / 2 + 1, size, tc, 'center', true);
    c.globalAlpha = 1;
    if (pressed) c.restore();
  };

  UI.dim = function (a) { var c = D.ctx; c.fillStyle = 'rgba(2,4,10,' + a + ')'; c.fillRect(0, 0, W, H); };
  UI.panel = function (x, y, w, h, border) {
    var c = D.ctx;
    c.fillStyle = 'rgba(24,18,14,0.96)'; D.rr(x, y, w, h, 10); c.fill();
    c.strokeStyle = border || C.line; c.lineWidth = 1.5; D.rr(x + 0.5, y + 0.5, w - 1, h - 1, 10); c.stroke();
  };
  UI.drawToast = function () {
    if (UI.toastT <= 0 || !UI.toastMsg) return;
    var c = D.ctx; c.font = D.font(13, true);
    var w = Math.min(W - 40, c.measureText(UI.toastMsg).width + 32);
    c.globalAlpha = Math.min(1, UI.toastT * 3);
    var ty = UI.toastY || 8;
    c.fillStyle = 'rgba(26,20,16,0.96)'; D.rr((W - w) / 2, ty, w, 34, 17); c.fill();
    c.strokeStyle = C.cyan; c.lineWidth = 1; D.rr((W - w) / 2, ty, w, 34, 17); c.stroke();
    D.text(UI.toastMsg, W / 2, ty + 17, 13, C.text, 'center', true);
    c.globalAlpha = 1;
  };

  // ================= 标题 =================
  UI.title = function (g, muted) {
    var c = D.ctx, t = UI.t;
    D.drawBg(true);
    if (!D.gl) {
      c.save(); c.translate(W / 2, 250);
      for (var k = 0; k < 3; k++) {
        c.save(); c.rotate(-0.3 + k * 0.02); c.scale(1, 0.3);
        c.strokeStyle = 'rgba(255,200,97,' + (0.2 - k * 0.05) + ')'; c.lineWidth = 3 - k;
        c.beginPath(); c.arc(0, 0, 130 + k * 18, 0, TAU); c.stroke();
        c.restore();
      }
      c.restore();
    }
    D.glowText('环带值守', W / 2, 150, 52, C.cyan, 'center', 20);
    D.text('R I N G W A T C H', W / 2, 192, 12, '#e8d8b8', 'center', true, 3);
    D.text('夜色压境，守住村子的圣火。', W / 2, 400, 13, C.text, 'center', true, 3);
    D.text('撑过倒计时，整备，再迎下一波。', W / 2, 422, 12, C.dim, 'center', false, 3);
    if (g.best > 0) D.text('最佳纪录：撑到第 ' + g.best + ' 波', W / 2, 452, 13, C.gold, 'center', true, 3);
    UI.button('start', 80, 480, 260, 62, '开始值守', { style: 'primary', size: 22 });
    UI.button('mute', 80, 556, 125, 40, muted ? '音效：关' : '音效：开', { size: 13 });
    UI.button('howto', 215, 556, 125, 40, '玩法说明', { size: 13 });
    D.text('拖动移动 · 自动攻击 · 灵火晋升 · 随时造塔', W / 2, 626, 11, C.dim, 'center', false, 3);
    D.text('v3.0 · 画面与音效均为运行时生成', W / 2, 736, 10, C.faint, 'center', false, 3);
  };

  UI.howto = function () {
    UI.dim(0.85);
    UI.panel(20, 70, W - 40, 620, C.cyan);
    D.text('玩法说明', W / 2, 100, 20, C.cyan, 'center', true);
    var lines = [
      ['移动', '按住屏幕任意位置拖动。松手会滑行一小段。'],
      ['攻击', '武器自动瞄准最近的敌人，你只管走位。'],
      ['金币', '敌人死亡掉落。8 秒后消失，靠近才能捡到。'],
      ['波次', '撑过倒计时，场上的敌人全部清掉，进入整备。'],
      ['战意', '在身边击杀会攒战意，攒满进入狂热：攻速、伤害、移速都涨。逃跑会掉。'],
      ['造塔', '战斗中点左下「造塔」，花金币在脚下建箭塔 / 寒霜塔 / 聚金桩 / 兵营。'],
      ['技能', '右下冲刺（短暂无敌）和技能键。整备时可以换技能、升技能。'],
      ['整备', '买武器 / 改造 / 技能 / 建筑科技。每件货都写了强在哪、弱在哪。'],
      ['预警', '红准星＝要刷怪；粉线＝冲锋；黄虚线＝喷刺；橙圈＝爆囊要炸。']
    ];
    for (var i = 0; i < lines.length; i++) {
      var y = 140 + i * 52;
      D.text(lines[i][0], 42, y, 14, C.gold, 'left', true);
      var wl = D.wrap(lines[i][1], 280, 12);
      for (var j = 0; j < wl.length; j++) D.text(wl[j], 96, y + j * 17, 12, C.text, 'left');
    }
    UI.button('howtoClose', 110, 634, 200, 40, '知道了', { style: 'primary' });
  };

  // ================= 选择职业 =================
  UI.pick = function (g) {
    D.drawBg(true);
    UI.dim(0.45);
    D.text('选择职业', W / 2, 60, 24, C.text, 'center', true, 3);
    D.text('两种完全不同的打法', W / 2, 90, 12, C.dim, 'center', false, 3);
    for (var i = 0; i < g.offers.length; i++) {
      var id = g.offers[i], d = RW.CLASSES[id], y = 118 + i * 262;
      UI.button('pick:' + id, 20, y, W - 40, 248, '', { draw: (function (d, id) {
        return function (x, y, w, h, pressed) {
          var c = D.ctx;
          c.fillStyle = pressed ? 'rgba(40,30,20,0.95)' : 'rgba(18,14,12,0.9)'; D.rr(x, y, w, h, 12); c.fill();
          c.strokeStyle = d.color; c.lineWidth = 2; D.rr(x + 1, y + 1, w - 2, h - 2, 12); c.stroke();
          UI.classGlyph(id, x + 60, y + 80, d);
          D.text(d.name, x + 124, y + 36, 26, d.color, 'left', true);
          var wn = RW.WEAPONS[d.weapon].name, sn = RW.SKILLS[d.skill].name;
          D.text('起手：' + wn + ' · 技能：' + sn, x + 124, y + 66, 11, C.dim, 'left');
          D.text('生命 ' + d.hp, x + 124, y + 84, 11, C.dim, 'left');
          var pl = D.wrap(d.passive, w - 150, 12);
          for (var q = 0; q < pl.length; q++) D.text(pl[q], x + 124, y + 106 + q * 16, 12, '#ffe2a8', 'left', true);
          UI.prosCons(x + 24, y + 164, w - 48, d.pros, d.cons);
        };
      })(d, id) });
    }
    UI.button('back', 20, 670, 120, 40, '返回', { style: 'ghost', size: 13 });
  };
  UI.classGlyph = function (id, x, y, d) {
    var c = D.ctx;
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.beginPath(); c.arc(x, y, 44, 0, TAU); c.fill();
    c.strokeStyle = d.color; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 44, 0, TAU); c.stroke();
    // 简笔人物：头、斗篷、武器
    c.fillStyle = d.cape; c.beginPath(); c.moveTo(x - 14, y - 6); c.lineTo(x + 14, y - 6); c.lineTo(x + 20, y + 30); c.lineTo(x - 20, y + 30); c.closePath(); c.fill();
    c.fillStyle = '#2d2a33'; c.fillRect(x - 9, y - 8, 18, 30);
    c.fillStyle = '#f1c9a5'; c.beginPath(); c.arc(x, y - 16, 8, 0, TAU); c.fill();
    c.fillStyle = '#4a2f1f'; c.beginPath(); c.arc(x, y - 20, 8, Math.PI, 0); c.fill();
    if (id === 'mage') {
      c.strokeStyle = '#8a6440'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 22, y + 30); c.lineTo(x + 22, y - 26); c.stroke();
      c.shadowColor = '#ffb347'; c.shadowBlur = 14; c.fillStyle = '#ffb347'; c.beginPath(); c.arc(x + 22, y - 30, 6, 0, TAU); c.fill(); c.shadowBlur = 0;
    } else {
      c.strokeStyle = '#8a6440'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 4, y + 4); c.lineTo(x + 30, y + 4); c.stroke();
      c.strokeStyle = '#4a3020'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 26, y - 10); c.quadraticCurveTo(x + 34, y + 4, x + 26, y + 18); c.stroke();
      c.strokeStyle = '#f6e2b0'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 26, y - 10); c.lineTo(x + 26, y + 18); c.stroke();
    }
  };

  UI.weaponGlyph = function (id, x, y, r, color) {
    var c = D.ctx;
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 2.5;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.globalAlpha = 0.12; c.fill(); c.globalAlpha = 1; c.stroke();
    c.lineWidth = 2;
    switch (id) {
      case 'needle': c.beginPath(); c.moveTo(x - 10, y + 6); c.lineTo(x + 10, y - 6); c.stroke(); c.beginPath(); c.arc(x + 10, y - 6, 3, 0, TAU); c.fill(); break;
      case 'scatter': for (var k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x - 8, y); c.lineTo(x + 10, y + k * 5); c.stroke(); } break;
      case 'blades': for (var b = 0; b < 3; b++) { var a = b * TAU / 3; c.beginPath(); c.arc(x + Math.cos(a) * 9, y + Math.sin(a) * 9, 4, 0, TAU); c.fill(); } break;
      case 'lance': c.lineWidth = 4; c.beginPath(); c.moveTo(x - 12, y); c.lineTo(x + 12, y); c.stroke(); break;
      case 'arc': c.beginPath(); c.moveTo(x - 10, y - 6); c.lineTo(x - 2, y + 4); c.lineTo(x + 2, y - 4); c.lineTo(x + 10, y + 6); c.stroke(); break;
      case 'mines': c.beginPath(); c.arc(x, y, 7, 0, TAU); c.stroke(); c.beginPath(); c.arc(x, y, 2.5, 0, TAU); c.fill(); break;
      default: c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill();
    }
  };
  UI.weaponStatLine = function (id, tier, g) {
    var d = RW.WEAPONS[id], dmg = Math.round(d.dmg * RW.TIER_DMG[tier - 1] * 10) / 10;
    switch (d.kind) {
      case 'needle': return '伤害 ' + dmg + ' · 间隔 ' + d.cd[tier - 1] + 's · 射程 ' + d.range;
      case 'scatter': return '伤害 ' + dmg + '×' + (d.pellets + tier - 1) + ' 片 · 间隔 ' + d.cd[tier - 1] + 's · 射程 ' + d.range;
      case 'blades': return '伤害 ' + dmg + ' · ' + (d.count + tier - 1) + ' 片刃 · 半径 ' + d.range;
      case 'lance': return '伤害 ' + dmg + ' · 间隔 ' + d.cd[tier - 1] + 's · 贯穿 · 射程 ' + d.range;
      case 'arc': return '伤害 ' + dmg + ' · 连跳 ' + (d.jumps + tier - 1) + ' 次 · 间隔 ' + d.cd[tier - 1] + 's';
      case 'mines': return '伤害 ' + dmg + ' · 范围 ' + d.range + ' · 同时 ' + (d.maxMines + tier - 1) + ' 颗';
    }
    return '';
  };
  UI.towerStatLine = function (id, tier) {
    var d = RW.TOWERS[id], ti = tier - 1, hp = Math.round(d.hp * RW.TOWER_TIER.hp[ti]);
    var rg = Math.round(d.range * RW.TOWER_TIER.range[ti]);
    if (d.kind === 'sentry') return '伤害 ' + Math.round(d.dmg * RW.TOWER_TIER.dmg[ti] * 10) / 10 + ' · 间隔 ' + d.cd + 's · 射程 ' + rg + ' · 耐久 ' + hp;
    if (d.kind === 'pylon') return '减速 ' + Math.round(d.slow * 100) + '% · 半径 ' + rg + ' · 耐久 ' + hp;
    if (d.kind === 'barracks') return '士兵 ' + d.soldiers[ti] + ' 名 · 士兵伤害 ' + Math.round(d.soldier.dmg * RW.TOWER_TIER.dmg[ti] * 10) / 10 + ' · 耐久 ' + hp;
    return '吸取半径 ' + rg + ' · 加成 +' + Math.round(d.bonus[ti] * 100) + '% · 耐久 ' + hp;
  };
  UI.prosCons = function (x, y, w, pros, cons, note) {
    var c = D.ctx, yy = y, i;
    var pl = D.wrap(pros, w - 30, 12);
    c.fillStyle = C.good; D.rr(x - 3, yy - 9, 18, 18, 4); c.fill(); D.text('强', x + 6, yy, 11, '#06150c', 'center', true);
    for (i = 0; i < pl.length; i++) D.text(pl[i], x + 22, yy + i * 16, 12, '#c9ffd6', 'left');
    yy += Math.max(1, pl.length) * 16 + 6;
    var cl = D.wrap(cons, w - 30, 12);
    c.fillStyle = C.bad; D.rr(x - 3, yy - 9, 18, 18, 4); c.fill(); D.text('弱', x + 6, yy, 11, '#1a0508', 'center', true);
    for (i = 0; i < cl.length; i++) D.text(cl[i], x + 22, yy + i * 16, 12, '#ffc9d1', 'left');
    yy += Math.max(1, cl.length) * 16;
    if (note) { D.text(note, x, yy + 4, 10, C.dim, 'left'); yy += 16; }
    return yy;
  };

  // ---------- 改造：由 fx 自动生成「强 / 弱」 ----------
  UI.fmtStat = function (k, v) {
    var s = RW.STATS[k];
    if (s.pct) return s.label + ' ' + (v > 0 ? '+' : '') + Math.round(v * 100) + '%';
    return s.label + ' ' + (v > 0 ? '+' : '') + (Math.round(v * 10) / 10);
  };
  UI.modText = function (id) {
    var m = RW.MODS[id], up = [], down = [];
    for (var k in m.fx) {
      var v = m.fx[k], s = RW.STATS[k];
      if (s.special) continue;
      var good = s.inverse ? v < 0 : v > 0;
      (good ? up : down).push(UI.fmtStat(k, v));
    }
    if (id === 'bounty') { up.push('精英掉落金币 ×2'); down.push('第 3 波起每波多来 1 只精英'); }
    return { pros: up.join('，'), cons: down.join('，'), note: id === 'bounty' ? '' : (m.note || '') };
  };

  UI.cardInfo = function (g, sl) {
    var info = { name: '', tag: '', color: C.text, pros: '', cons: '', note: '', stat: '' };
    if (sl.kind === 'weapon') {
      var d = RW.WEAPONS[sl.id];
      info.name = d.name + ' ' + ROMAN[sl.tier - 1]; info.color = d.color;
      info.tag = sl.upgrade ? '武器升级' : '新武器';
      if (sl.upgrade) {
        info.pros = '伤害 ×' + (RW.TIER_DMG[sl.tier - 1] / RW.TIER_DMG[sl.tier - 2]).toFixed(2) + '，' + UI.upgradeExtra(d, sl.tier);
        info.cons = d.cons;
      } else { info.pros = d.pros; info.cons = d.cons; }
      info.stat = UI.weaponStatLine(sl.id, sl.tier, g);
      info.note = d.extraNote;
    } else if (sl.kind === 'tech') {
      var td = RW.TOWERS[sl.id];
      info.name = td.name + '科技 ' + ROMAN[sl.tier - 1]; info.color = td.color;
      info.tag = '建筑科技 · 已建 ' + UI.countTowers(g, sl.id) + ' 座';
      info.pros = '所有' + td.name + '（包括以后建的）立即升级：' + (td.kind === 'barracks' ? '士兵更多更强' : (td.kind === 'siphon' ? '范围更大、收益加成' : '伤害、射程、耐久提升'));
      info.cons = UI.countTowers(g, sl.id) ? td.cons : '你现在一座' + td.name + '都没有，买了暂时没用';
      info.stat = UI.towerStatLine(sl.id, sl.tier);
    } else if (sl.kind === 'skill') {
      var sd = RW.SKILLS[sl.id];
      info.name = sd.name + ' ' + ROMAN[sl.tier - 1]; info.color = sd.color;
      info.tag = sl.upgrade ? '技能升级' : (sl.replace ? '技能 · 替换「' + sl.replace + '」' : '技能');
      info.pros = sl.upgrade ? '伤害 ×' + (RW.SKILL_TIER[sl.tier - 1] / RW.SKILL_TIER[sl.tier - 2]).toFixed(2) + '，' + sd.pros : sd.pros;
      info.cons = sl.replace ? '会替换掉现在的「' + sl.replace + '」；' + sd.cons : sd.cons;
      info.stat = '冷却 ' + sd.cd + 's';
    } else if (sl.kind === 'mod') {
      var md = RW.MODS[sl.id], mt = UI.modText(sl.id);
      info.name = md.name; info.color = C.violet;
      info.tag = '改造 · 已有 ' + g.modCount(sl.id) + '/' + md.max;
      info.pros = mt.pros; info.cons = mt.cons; info.note = mt.note;
    }
    return info;
  };
  UI.upgradeExtra = function (d, tier) {
    switch (d.kind) {
      case 'needle': return '间隔 ' + d.cd[tier - 2] + '→' + d.cd[tier - 1] + 's';
      case 'scatter': return '多 1 片弹，间隔缩短';
      case 'blades': return '多 1 片刃';
      case 'lance': return '贯线变宽，间隔缩短';
      case 'arc': return '多跳 1 次';
      case 'mines': return '同时存在的雷 +1';
    }
    return '';
  };

  UI.nextPreview = function (g) {
    var n = g.wave + 1, def = RW.waveDef(n), names = [], k;
    var mix = [];
    for (k in def.mix) mix.push([k, def.mix[k]]);
    mix.sort(function (a, b) { return b[1] - a[1]; });
    for (k = 0; k < Math.min(4, mix.length); k++) names.push(RW.ENEMIES[mix[k][0]].name);
    var el = {};
    for (k = 0; k < def.elites.length; k++) { var nm = RW.ENEMIES[def.elites[k][1]].name; el[nm] = (el[nm] || 0) + 1; }
    var es = [];
    for (k in el) es.push(k + '×' + el[k]);
    var boss = n % RW.BOSS_WAVES.every === 0;
    return { boss: boss, text: '下一波 ' + n + '：' + names.join(' ') + (es.length ? ' · 精英 ' + es.join(' ') : '') + (boss ? ' · BOSS ' + RW.ENEMIES.boss.name + '！' : '') };
  };
  UI.countTowers = function (g, id) {
    var n = 0;
    for (var i = 0; i < g.towers.length; i++) if (g.towers[i].on && g.towers[i].id === id) n++;
    return n;
  };

  // ================= 整备商店 =================
  UI.shop = function (g, adLabel) {
    var c = D.ctx, shop = g.shop, i;
    D.drawBg(true);
    UI.dim(0.72);
    // 头部
    D.text('波间整备', 16, 28, 22, C.text, 'left', true);
    var pm = Math.round((g.priceMul() - 1) * 100);
    D.text('第 ' + g.wave + ' 波已完成 · 物价 +' + pm + '%', 16, 50, 11, C.dim, 'left');
    var pv = UI.nextPreview(g);
    D.text(pv.text, 16, 64, 10, pv.boss ? '#ff9ab0' : C.gold, 'left', true);
    D.shardIcon(W - 100, 30, 10);
    D.text(String(g.shardCount), W - 86, 31, 26, C.shard, 'left', true);
    // 属性条
    UI.statStrip(g, 74);
    // 武器槽
    var y = 124;
    D.text('武器 ' + g.weapons.length + '/' + RW.MAX_SLOTS + ' · 点两次出售（返还 50%）', 16, y, 11, C.dim, 'left');
    for (i = 0; i < RW.MAX_SLOTS; i++) {
      var sx = 16 + i * 66, sy = y + 12;
      var w = g.weapons[i];
      if (!w) { c.strokeStyle = '#4a3a28'; c.lineWidth = 1; if (c.setLineDash) c.setLineDash([3, 3]); D.rr(sx, sy, 60, 42, 6); c.stroke(); if (c.setLineDash) c.setLineDash([]); continue; }
      UI.button('wslot:' + i, sx, sy, 60, 42, '', { draw: (function (w, i) {
        return function (x, yy, bw, bh) {
          var sel = UI.sel === 'w:' + i;
          c.fillStyle = sel ? '#2a0b14' : '#1e1712'; D.rr(x, yy, bw, bh, 6); c.fill();
          c.strokeStyle = sel ? C.red : w.d.color; c.lineWidth = sel ? 2 : 1.5; D.rr(x, yy, bw, bh, 6); c.stroke();
          if (sel) { D.text('出售', x + bw / 2, yy + 14, 12, '#ffc2cd', 'center', true); D.text('+' + g.weaponSellValue(w), x + bw / 2, yy + 30, 11, C.shard, 'center', true); }
          else { D.text(w.d.name, x + bw / 2, yy + 15, 12, w.d.color, 'center', true); D.text(ROMAN[w.tier - 1], x + bw / 2, yy + 31, 11, C.text, 'center', true); }
        };
      })(w, i) });
    }
    // 技能 + 圣火
    y = 190;
    c.fillStyle = '#1e1712'; D.rr(16, y, W - 32, 62, 6); c.fill();
    c.strokeStyle = '#4a3a28'; c.lineWidth = 1; D.rr(16, y, W - 32, 62, 6); c.stroke();
    var sk = g.skill;
    D.text('技能', 26, y + 14, 10, C.dim, 'left');
    if (sk) { D.text(sk.d.name + ' ' + ROMAN[sk.tier - 1], 26, y + 32, 13, sk.d.color, 'left', true); D.text('冷却 ' + Math.round(sk.d.cd * g.st.cdr * 10) / 10 + 's', 26, y + 49, 10, C.dim, 'left'); }
    var co = g.core, ck = co.hp / co.maxHp;
    D.text('圣火 ' + Math.ceil(co.hp) + '/' + co.maxHp + ' · 下波开场回 ' + Math.round(T.core.waveHeal * 100) + '%', 118, y + 14, 10, ck < 0.4 ? C.bad : '#ffd27a', 'left', true);
    c.fillStyle = '#140e0a'; c.fillRect(118, y + 22, 120, 6);
    c.fillStyle = ck < 0.3 ? C.red : (ck < 0.6 ? '#ff9f43' : '#ffd27a'); c.fillRect(118, y + 22, 120 * ck, 6);
    var rc2 = g.coreRepairCost(), ac = g.coreArmorCost();
    UI.button('repair', 118, y + 32, 124, 26, '维修 +50% · ' + rc2, { size: 11, disabled: co.hp >= co.maxHp || g.shardCount < rc2, why: co.hp >= co.maxHp ? '圣火是满的' : '金币不足' });
    UI.button('armor', 250, y + 32, 146, 26, '加固 上限+' + T.core.armorHp + ' · ' + ac, { size: 11, disabled: g.shardCount < ac, why: '金币不足' });
    // 卡片
    y = 262;
    for (i = 0; i < 4; i++) {
      var sl = shop.slots[i];
      UI.card(g, sl, i, 16, y + i * 106, W - 32, 98);
    }
    // 底部操作
    var by = 690;
    var rc = g.rerollCost();
    UI.button('reroll', 16, by, 120, 50, '刷新', { sub: rc + ' 金币', disabled: g.shardCount < rc, why: '金币不足，刷新要 ' + rc });
    var adOk = g.wave >= RW.AD.FIRST_AD_WAVE;
    if (adOk) UI.button('adReroll', 144, by, 116, 50, adLabel, { style: 'ad', sub: shop.adUsed ? '本轮已用' : '免费刷新 1 次', size: 13, disabled: shop.adUsed, why: '每轮整备只能用一次' });
    UI.button('next', adOk ? 268 : 144, by, adOk ? 136 : 260, 50, '开始第 ' + (g.wave + 1) + ' 波', { style: 'primary', size: adOk ? 15 : 18 });
  };

  UI.statStrip = function (g, y) {
    var s = g.st, c = D.ctx;
    c.fillStyle = 'rgba(30,24,18,0.9)'; D.rr(10, y, W - 20, 36, 6); c.fill();
    var items = [
      ['生命', Math.round(s.maxHp), s.maxHp - T.player.hp],
      ['伤害', pct(s.dmg - 1), s.dmg - 1],
      ['攻速', pct(s.rate - 1), s.rate - 1],
      ['移速', Math.round(T.player.speed * s.speed), s.speed - 1],
      ['护甲', Math.round(s.armor), s.armor],
      ['暴击', Math.round(s.crit * 100) + '%', s.crit - T.player.crit],
      ['射程', pct(s.range - 1), s.range - 1],
      ['回血', (Math.round(s.regen * 10) / 10) + '/s', s.regen],
      ['冷却', pct(s.cdr - 1), -(s.cdr - 1)],
      ['金币', pct(s.harvest - 1), s.harvest - 1],
      ['弹数', '+' + s.extra, s.extra],
      ['受伤', pct(s.takenMul - 1), -(s.takenMul - 1)]
    ];
    for (var i = 0; i < items.length; i++) {
      var col = i % 6, row = (i / 6) | 0, x = 16 + col * 66, yy = y + 10 + row * 16;
      var it = items[i], color = it[2] > 0.001 ? C.good : (it[2] < -0.001 ? C.bad : C.text);
      D.text(it[0], x, yy, 9, C.dim, 'left');
      D.text(String(it[1]), x + 26, yy, 10, color, 'left', true);
    }
    function pct(v) { var r = Math.round(v * 100); return (r > 0 ? '+' : '') + r + '%'; }
  };

  UI.card = function (g, sl, i, x, y, w, h) {
    var c = D.ctx;
    if (!sl || sl.kind === 'none') { c.strokeStyle = '#3a2e20'; D.rr(x, y, w, h, 8); c.stroke(); return; }
    if (sl.sold) {
      c.fillStyle = 'rgba(26,20,14,0.6)'; D.rr(x, y, w, h, 8); c.fill();
      c.strokeStyle = '#3a2e20'; c.lineWidth = 1; D.rr(x, y, w, h, 8); c.stroke();
      D.text(sl.gone ? '已失效' : '已购入', x + w / 2, y + h / 2, 14, C.faint, 'center', true);
      return;
    }
    var info = UI.cardInfo(g, sl);
    var afford = g.shardCount >= sl.price;
    c.fillStyle = 'rgba(26,20,16,0.96)'; D.rr(x, y, w, h, 8); c.fill();
    var rare = (sl.kind === 'weapon' || sl.kind === 'skill' || sl.kind === 'tech') ? sl.tier : (RW.MODS[sl.id] && RW.MODS[sl.id].cost >= 20 ? 2 : 1);
    var rc = rare >= 3 ? '#c07bff' : (rare === 2 ? '#4f8cff' : '#5a4630');
    if (rare >= 2) { c.fillStyle = rare >= 3 ? 'rgba(192,123,255,0.08)' : 'rgba(79,140,255,0.06)'; D.rr(x, y, w, h, 8); c.fill(); }
    c.strokeStyle = sl.locked ? C.gold : rc; c.lineWidth = sl.locked ? 2 : (rare >= 2 ? 1.8 : 1.2); D.rr(x + 0.5, y + 0.5, w - 1, h - 1, 8); c.stroke();
    D.text(rare >= 3 ? '史诗' : (rare === 2 ? '稀有' : '普通'), x + w - 108, y + h - 12, 9, rare >= 3 ? '#d9b3ff' : (rare === 2 ? '#8fb6ff' : C.faint), 'right', true);
    c.fillStyle = info.color; c.fillRect(x + 1, y + 10, 3, h - 20);
    D.text(info.name, x + 14, y + 16, 16, info.color, 'left', true);
    c.font = D.font(16, true);
    var nw = c.measureText(info.name).width;
    D.text(info.tag, x + 20 + nw, y + 17, 10, C.dim, 'left');
    var textW = w - 128;
    var yy = y + 38;
    if (info.stat) { D.text(info.stat, x + 14, y + 34, 10, C.dim, 'left'); yy = y + 52; }
    var pl = D.wrap(info.pros, textW, 11), cl = D.wrap(info.cons, textW, 11);
    c.fillStyle = C.good; D.rr(x + 12, yy - 7, 14, 14, 3); c.fill(); D.text('强', x + 19, yy, 10, '#06150c', 'center', true);
    D.text(pl[0] || '', x + 32, yy, 11, '#c9ffd6', 'left');
    if (pl[1]) D.text(pl[1], x + 32, yy + 13, 11, '#c9ffd6', 'left');
    var cy = yy + (pl[1] ? 29 : 18);
    if (!info.stat && pl[1] && cl[1]) cy -= 2;
    c.fillStyle = C.bad; D.rr(x + 12, cy - 7, 14, 14, 3); c.fill(); D.text('弱', x + 19, cy, 10, '#1a0508', 'center', true);
    D.text(cl[0] || '', x + 32, cy, 11, '#ffc9d1', 'left');
    if (cl[1] && cy + 13 < y + h - 4) D.text(cl[1], x + 32, cy + 13, 11, '#ffc9d1', 'left');
    // 价格与锁定
    UI.button('buy:' + i, x + w - 100, y + 10, 90, 44, '', { disabled: !afford, why: '金币不足，还差 ' + (sl.price - g.shardCount), draw: function (bx, by, bw, bh, pressed) {
      c.globalAlpha = afford ? 1 : 0.45;
      c.fillStyle = pressed ? '#bdfcff' : (afford ? C.cyan : '#2a2016'); D.rr(bx, by, bw, bh, 7); c.fill();
      D.shardIcon(bx + 22, by + bh / 2, 7);
      D.text(String(sl.price), bx + 36, by + bh / 2 + 1, 18, afford ? '#04121a' : C.text, 'left', true);
      c.globalAlpha = 1;
    } });
    UI.button('lock:' + i, x + w - 100, y + 60, 90, 28, sl.locked ? '已锁定' : '锁定', { style: sl.locked ? 'ad' : 'ghost', size: 11 });
  };

  // ================= 复活 =================
  UI.revive = function (g, adLabel) {
    UI.dim(0.78);
    UI.panel(24, 170, W - 48, 350, C.red);
    D.glowText('值守中断', W / 2, 220, 34, C.red, 'center', 14);
    D.text('第 ' + g.wave + ' 波 · 还剩 ' + Math.max(0, Math.ceil(g.dur - g.wt)) + ' 秒', W / 2, 262, 13, C.text, 'center');
    var h = g.lastHits[g.lastHits.length - 1];
    if (h) D.text('致命一击：' + h.src, W / 2, 288, 13, '#ffb3c1', 'center', true);
    UI.button('revive', 50, 330, W - 100, 70, adLabel + ' · 原地复活', { style: 'ad', size: 18, sub: '恢复 60% 生命，清空身边敌人（每局一次）' });
    if (adLabel === '预览发放') D.text('广告位未配置：本按钮直接发放奖励，不会播放广告', W / 2, 414, 10, C.dim, 'center');
    UI.button('giveup', 50, 440, W - 100, 52, '结束值守，查看结算', { style: 'ghost', size: 14 });
  };

  // ================= 结算 =================
  UI.result = function (g) {
    var r = g.result, c = D.ctx;
    D.drawBg(true);
    UI.dim(0.6);
    D.text('值守结束', W / 2, 60, 16, C.dim, 'center', true);
    D.glowText('撑到第 ' + r.wave + ' 波', W / 2, 104, 36, r.newBest ? C.gold : C.cyan, 'center', 16);
    if (r.coreDown) D.text('圣火熄灭了', W / 2, 140, 13, C.red, 'center', true);
    else if (r.newBest) D.text('新纪录', W / 2, 140, 13, C.gold, 'center', true);
    else D.text('最佳：第 ' + r.best + ' 波', W / 2, 140, 12, C.dim, 'center');
    UI.panel(16, 162, W - 32, 62);
    D.text('击杀', 56, 182, 11, C.dim, 'center'); D.text(String(r.kills), 56, 204, 18, C.text, 'center', true);
    D.text('金币', 160, 182, 11, C.dim, 'center'); D.text(String(r.shards), 160, 204, 18, C.shard, 'center', true);
    D.text('位阶', 280, 182, 11, C.dim, 'center'); D.text(r.stage, 280, 204, 16, C.text, 'center', true);
    D.text('最高连杀', 370, 182, 11, C.dim, 'center'); D.text('×' + (r.streak || 0), 370, 204, 18, C.gold, 'center', true);
    // 输出构成
    var rows = Math.max(1, Math.min(9, r.list.length)), ph = 44 + rows * 25;
    UI.panel(16, 236, W - 32, ph);
    D.text('输出构成', 30, 256, 13, C.text, 'left', true);
    var max = 1, i;
    for (i = 0; i < r.list.length; i++) max = Math.max(max, r.list[i].dmg);
    for (i = 0; i < rows && i < r.list.length; i++) {
      var it = r.list[i], yy = 282 + i * 25;
      D.text(it.name, 30, yy, 12, it.color, 'left', true);
      c.fillStyle = '#2a2016'; c.fillRect(140, yy - 6, 190, 12);
      c.fillStyle = it.color; c.fillRect(140, yy - 6, 190 * it.dmg / max, 12);
      D.text(String(it.dmg), W - 30, yy, 11, C.text, 'right');
    }
    // 死因
    var dy = 236 + ph + 12;
    UI.panel(16, dy, W - 32, 104);
    D.text('最后受到的伤害', 30, dy + 20, 13, C.text, 'left', true);
    if (!r.hits.length) D.text('无', 30, dy + 46, 12, C.dim, 'left');
    for (i = 0; i < r.hits.length; i++) {
      var hh = r.hits[r.hits.length - 1 - i];
      D.text((i === 0 ? '致命 · ' : '之前 · ') + hh.src, 30, dy + 46 + i * 20, 12, i === 0 ? '#ffb3c1' : C.dim, 'left', i === 0);
      D.text('-' + (Math.round(hh.dmg * 10) / 10), W - 30, dy + 46 + i * 20, 12, '#ff6b81', 'right', true);
    }
    UI.button('again', 16, 628, 250, 58, '再来一局', { style: 'primary', size: 20 });
    UI.button('home', 276, 628, 128, 58, '返回标题', { size: 14 });
    D.text(UI.adviceFor(r), W / 2, 710, 11, C.dim, 'center');
  };
  UI.adviceFor = function (r) {
    var h = r.hits[r.hits.length - 1];
    if (r.coreDown) return '提示：在桥头和圣火周围建箭塔、寒霜塔，看到「圣火受攻击」就回防。';
    if (!h) return '';
    if (h.src.indexOf(RW.ENEMIES.boss.name) >= 0) return '提示：Boss 的红圈会砸在你站过的位置，看到就横向冲刺出去。';
    if (h.src === '爆囊') return '提示：爆囊橙圈亮起就跑出圈外；在远处打爆它，它只会炸伤同伴。';
    if (h.src === '喷刺者') return '提示：黄色虚线是它的弹道，侧移一步就能躲开。';
    if (h.src === '冲锋棱') return '提示：看到粉色冲锋线时横向闪，别沿着线跑。';
    if (h.src.indexOf('孢塔') >= 0) return '提示：孢塔充能发红时拉开距离，弹幕之间有空隙。';
    if (h.src === '壳虫') return '提示：壳虫有护甲，贯线、布雷、升级后的武器更好打。';
    return '提示：被围时往怪少的一侧斜着走，比直线后退安全。';
  };

  // ================= 暂停 =================
  UI.pause = function (g, muted) {
    UI.dim(0.75);
    UI.panel(50, 220, W - 100, 300, C.cyan);
    D.text('暂停', W / 2, 262, 26, C.text, 'center', true);
    D.text('第 ' + g.wave + ' 波', W / 2, 294, 12, C.dim, 'center');
    UI.button('resume', 80, 320, W - 160, 52, '继续', { style: 'primary', size: 18 });
    UI.button('mute', 80, 384, W - 160, 44, muted ? '音效：关' : '音效：开', { size: 14 });
    UI.button('quit', 80, 440, W - 160, 44, '放弃本局', { style: 'danger', size: 14 });
  };

  RW.UI = UI;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
