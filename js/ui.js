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
    D.glowText('环带值守', W / 2, 120, 64, C.cyan, 'center', 24);
    D.text('R I N G W A T C H', W / 2, 170, 13, '#e8d8b8', 'center', true, 3);
    D.text('夜色压境，守住村子的圣火。撑过倒计时，整备，再迎下一波。', W / 2, 214, 14, C.text, 'center', true, 3);
    if (g.best > 0) D.text('最佳纪录：撑到第 ' + g.best + ' 波', W / 2, 244, 13, C.gold, 'center', true, 3);
    UI.button('start', W / 2 - 150, 280, 300, 62, '开始值守', { style: 'primary', size: 22 });
    UI.button('mute', W / 2 - 150, 356, 145, 42, muted ? '音效：关' : '音效：开', { size: 13 });
    UI.button('howto', W / 2 + 5, 356, 145, 42, '玩法说明', { size: 13 });
    D.text('WASD 移动 · 自动攻击 · 空格冲刺 · Q 技能 · B 造塔 · Enter 开始', W / 2, 430, 12, C.dim, 'center', false, 3);
    D.text('v4.0 · 模型、音乐与音效均为程序生成的原创内容', W / 2, H - 18, 10, C.faint, 'center', false, 3);
  };

  UI.howto = function () {
    UI.dim(0.85);
    UI.panel(W / 2 - 360, 40, 720, 460, C.cyan);
    D.text('玩法说明', W / 2, 72, 20, C.cyan, 'center', true);
    var lines = [
      ['移动', 'WASD / 方向键；也可以按住鼠标拖动。'],
      ['攻击', '武器自动瞄准最近的敌人，你只管走位。'],
      ['金币', '敌人死亡掉落。8 秒后消失，靠近才能捡到。'],
      ['波次', '撑过倒计时，场上的敌人全部清掉，进入整备。'],
      ['战意', '在身边击杀会攒战意，攒满进入狂热：攻速、伤害、移速都涨。逃跑会掉。'],
      ['造塔', '按 B 再按 1–4，花金币在脚下建箭塔 / 寒霜塔 / 聚金桩 / 兵营。'],
      ['技能', '空格冲刺（短暂无敌），Q 放技能。整备时可以换技能、升技能。'],
      ['整备', '买武器 / 改造 / 技能 / 建筑科技。每件货都写了强在哪、弱在哪。'],
      ['预警', '红准星＝要刷怪；粉线＝冲锋；黄虚线＝喷刺；橙圈＝爆囊要炸。']
    ];
    for (var i = 0; i < lines.length; i++) {
      var col = i < 5 ? 0 : 1, y = 110 + (i % 5) * 62, x0 = W / 2 - 336 + col * 350;
      D.text(lines[i][0], x0, y, 14, C.gold, 'left', true);
      var wl = D.wrap(lines[i][1], 270, 12);
      for (var j = 0; j < wl.length; j++) D.text(wl[j], x0 + 50, y + j * 17, 12, C.text, 'left');
    }
    UI.button('howtoClose', W / 2 - 100, 436, 200, 44, '知道了', { style: 'primary' });
  };

  // ================= 选择英雄 =================
  // 上半：10 个英雄头像（5 × 2）；下半：选中英雄的详情；未解锁的显示条件与进度
  UI.heroSel = 'mage';
  UI.pick = function (g) {
    var c = D.ctx, ids = RW.CLASS_ORDER, prog = g.prog, nUn = 0, i;
    for (i = 0; i < ids.length; i++) if (RW.isUnlocked(ids[i], prog)) nUn++;
    if (!RW.CLASSES[UI.heroSel]) UI.heroSel = ids[0];
    D.drawBg(true);
    UI.dim(0.5);
    D.text('选择英雄', 24, 36, 24, C.text, 'left', true, 3);
    D.text('已解锁 ' + nUn + ' / ' + ids.length + ' · 每个英雄自带不同的属性和特性 · 方向键切换，Enter 出发', 24, 60, 11, C.dim, 'left', false, 3);
    for (i = 0; i < ids.length; i++) {
      var col = i % 5, row = (i / 5) | 0;
      UI.button('hero:' + ids[i], 24 + col * 86, 76 + row * 104, 80, 96, '', { draw: UI.heroTile(g, ids[i]) });
    }
    // 累计进度
    var pr = prog || {};
    UI.panel(24, 294, 424, 162);
    D.text('值守记录', 40, 316, 13, C.text, 'left', true);
    var rec = [['局数', pr.runs || 0], ['累计击杀', pr.kills || 0], ['累计金币', pr.coins || 0], ['累计建造', pr.built || 0], ['最佳纪录', g.best ? '第 ' + g.best + ' 波' : '—']];
    for (i = 0; i < rec.length; i++) {
      var rx = 40 + (i % 3) * 136, ry = 350 + ((i / 3) | 0) * 50;
      D.text(rec[i][0], rx, ry, 10, C.dim, 'left');
      D.text(String(rec[i][1]), rx, ry + 20, 17, C.gold, 'left', true);
    }
    UI.heroDetail(g, UI.heroSel, 468, 24, W - 492, 432);
    var sel = UI.heroSel, ok = RW.isUnlocked(sel, prog);
    UI.button('back', 24, 472, 160, 48, '返回', { style: 'ghost', size: 14 });
    UI.button('pick:' + sel, 468, 472, W - 492, 48, ok ? '出发 · ' + RW.CLASSES[sel].name : '未解锁', { style: ok ? 'primary' : 'ghost', size: 17, disabled: !ok, why: '还没解锁：' + RW.CLASSES[sel].unlock.text });
  };
  UI.heroTile = function (g, id) {
    return function (x, y, w, h, pressed) {
      var c = D.ctx, d = RW.CLASSES[id], ok = RW.isUnlocked(id, g.prog), on = UI.heroSel === id;
      c.fillStyle = pressed ? 'rgba(50,38,26,0.96)' : (on ? 'rgba(40,30,22,0.96)' : 'rgba(18,14,12,0.9)'); D.rr(x, y, w, h, 10); c.fill();
      c.strokeStyle = on ? d.color : (ok ? '#5a4630' : '#2a2016'); c.lineWidth = on ? 2.5 : 1.2; D.rr(x + 1, y + 1, w - 2, h - 2, 10); c.stroke();
      c.globalAlpha = ok ? 1 : 0.28;
      UI.heroGlyph(id, x + w / 2, y + 36, 0.56);
      c.globalAlpha = 1;
      if (!ok) UI.lockIcon(x + w / 2, y + 36);
      D.text(d.name, x + w / 2, y + h - 14, 12, ok ? (on ? d.color : C.text) : C.faint, 'center', true);
    };
  };
  UI.lockIcon = function (x, y) {
    var c = D.ctx;
    c.strokeStyle = '#c8b89a'; c.lineWidth = 2.2;
    c.beginPath(); c.arc(x, y - 4, 6, Math.PI, 0); c.stroke();
    c.fillStyle = '#c8b89a'; D.rr(x - 9, y - 4, 18, 13, 3); c.fill();
    c.fillStyle = '#2a2016'; c.fillRect(x - 1.2, y, 2.4, 5);
  };
  // 属性加成 -> 「强 / 弱」两行文字（英雄和道具共用）
  UI.fxText = function (fx) {
    var up = [], down = [];
    for (var k in fx) {
      var v = fx[k], s = RW.STATS[k];
      if (!s || s.special) continue;
      var good = s.inverse ? v < 0 : v > 0;
      (good ? up : down).push(UI.fmtStat(k, v));
    }
    return { pros: up.join('，'), cons: down.join('，') };
  };
  UI.heroDetail = function (g, id, x, y, w, h) {
    var c = D.ctx, d = RW.CLASSES[id], ok = RW.isUnlocked(id, g.prog);
    c.fillStyle = 'rgba(18,14,12,0.92)'; D.rr(x, y, w, h, 12); c.fill();
    c.strokeStyle = d.color; c.lineWidth = 2; D.rr(x + 1, y + 1, w - 2, h - 2, 12); c.stroke();
    UI.heroGlyph(id, x + 60, y + 70, 1);
    D.text(d.name, x + 122, y + 34, 26, d.color, 'left', true);
    c.font = D.font(26, true);
    var nw = c.measureText(d.name).width;
    c.fillStyle = 'rgba(255,255,255,0.08)'; D.rr(x + 130 + nw, y + 24, 64, 20, 10); c.fill();
    D.text(d.tag, x + 162 + nw, y + 34, 10, C.text, 'center', true);
    D.text('起手：' + RW.WEAPONS[d.weapon].name + ' · 技能：' + RW.SKILLS[d.skill].name, x + 122, y + 64, 11, C.dim, 'left');
    var best = (g.prog && g.prog.heroBest && g.prog.heroBest[id]) || 0;
    D.text('生命 ' + d.hp + (best ? '　·　最高到第 ' + best + ' 波' : ''), x + 122, y + 82, 11, C.dim, 'left');
    var yy = y + 106;
    var pl = D.wrap(d.passive, w - 142, 12);
    for (var q = 0; q < pl.length; q++) D.text(pl[q], x + 122, yy + q * 16, 12, '#ffe2a8', 'left', true);
    yy = Math.max(y + 150, yy + pl.length * 16 + 10);
    var ft = UI.fxText(d.fx);
    if (ft.pros || ft.cons) {
      c.fillStyle = 'rgba(255,255,255,0.04)'; D.rr(x + 14, yy - 12, w - 28, ft.pros && ft.cons ? 42 : 24, 6); c.fill();
      if (ft.pros) { D.text('↑ ' + ft.pros, x + 24, yy, 11, C.good, 'left', true); yy += 18; }
      if (ft.cons) { D.text('↓ ' + ft.cons, x + 24, yy, 11, C.bad, 'left', true); yy += 18; }
      yy += 12;
    }
    yy = UI.prosCons(x + 24, yy + 4, w - 48, d.pros, d.cons) + 18;
    // 起手武器与技能
    var wd = RW.WEAPONS[d.weapon], sd = RW.SKILLS[d.skill], boxes = [['起手武器', wd.name, wd.color, wd.pros], ['主动技能', sd.name, sd.color, sd.pros]];
    for (var bi = 0; bi < boxes.length && yy < y + h - (ok ? 60 : 120); bi++) {
      var bx = boxes[bi], tl = D.wrap(bx[3], w - 60, 11);
      c.fillStyle = 'rgba(255,255,255,0.04)'; D.rr(x + 14, yy, w - 28, 30 + tl.length * 15, 6); c.fill();
      c.fillStyle = bx[2]; c.fillRect(x + 14, yy + 6, 3, 18 + tl.length * 15);
      D.text(bx[0], x + 26, yy + 13, 10, C.dim, 'left');
      D.text(bx[1], x + 86, yy + 13, 13, bx[2], 'left', true);
      for (var li = 0; li < tl.length; li++) D.text(tl[li], x + 26, yy + 31 + li * 15, 11, C.text, 'left');
      yy += 38 + tl.length * 15;
    }
    if (!ok) {
      var u = d.unlock, up = RW.unlockProgress(id, g.prog), k = Math.min(1, up.have / up.need), by = y + h - 58;
      c.fillStyle = 'rgba(0,0,0,0.55)'; D.rr(x + 12, by, w - 24, 46, 8); c.fill();
      UI.lockIcon(x + 34, by + 22);
      D.text('解锁条件：' + u.text, x + 56, by + 15, 12, C.gold, 'left', true);
      c.fillStyle = '#2a2016'; D.rr(x + 56, by + 27, w - 140, 8, 4); c.fill();
      c.fillStyle = C.gold; D.rr(x + 56, by + 27, Math.max(8, (w - 140) * k), 8, 4); c.fill();
      D.text(Math.min(up.have, up.need) + ' / ' + up.need, x + w - 24, by + 31, 11, C.text, 'right', true);
    }
  };
  // 头像：斗篷 + 身体 + 头 + 帽子 + 手持物；k 为缩放（1 = 半径 44 的大头像）
  UI.heroGlyph = function (id, x, y, k) {
    var c = D.ctx, d = RW.CLASSES[id], L = d.look || {};
    c.save(); c.translate(x, y); c.scale(k, k);
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.fill();
    c.strokeStyle = d.color; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.stroke();
    c.fillStyle = d.cape; c.beginPath(); c.moveTo(-14, -6); c.lineTo(14, -6); c.lineTo(20, 30); c.lineTo(-20, 30); c.closePath(); c.fill();
    c.fillStyle = '#2d2a33'; c.fillRect(-9, -8, 18, 30);
    c.fillStyle = '#f1c9a5'; c.beginPath(); c.arc(0, -16, 8, 0, TAU); c.fill();
    UI.hatGlyph(L.hat, d);
    UI.propGlyph(L.prop, d);
    c.restore();
  };
  UI.hatGlyph = function (hat, d) {
    var c = D.ctx;
    switch (hat) {
      case 'wizard':
        c.fillStyle = d.cape; c.beginPath(); c.moveTo(-14, -20); c.lineTo(14, -20); c.lineTo(4, -44); c.closePath(); c.fill();
        c.fillStyle = '#c8963c'; c.fillRect(-12, -23, 24, 3); break;
      case 'hood':
        c.fillStyle = d.cape; c.beginPath(); c.arc(0, -17, 11, Math.PI * 0.9, Math.PI * 2.1); c.lineTo(0, -34); c.closePath(); c.fill();
        c.fillStyle = '#f1c9a5'; c.beginPath(); c.arc(0, -14, 6, 0, TAU); c.fill(); break;
      case 'helm':
        c.fillStyle = '#b8c4d8'; c.beginPath(); c.arc(0, -17, 10, Math.PI, 0); c.fill(); c.fillRect(-10, -17, 20, 6);
        c.fillStyle = '#2a2a3a'; c.fillRect(-7, -15, 14, 2.5);
        c.fillStyle = '#ff6a4a'; c.fillRect(-1.5, -34, 3, 8); break;
      case 'bandana':
        c.fillStyle = '#2a1a3a'; c.fillRect(-9, -21, 18, 6);
        c.beginPath(); c.moveTo(-9, -18); c.lineTo(-18, -12); c.lineTo(-16, -20); c.closePath(); c.fill();
        c.fillStyle = '#1a1020'; c.fillRect(-8, -14, 16, 6); break;
      case 'goggles':
        c.fillStyle = '#4a2f1f'; c.beginPath(); c.arc(0, -20, 8, Math.PI, 0); c.fill();
        c.fillStyle = '#6b4428'; c.fillRect(-9, -21, 18, 3);
        c.fillStyle = '#8fe3ff'; c.beginPath(); c.arc(-4, -20, 3, 0, TAU); c.arc(4, -20, 3, 0, TAU); c.fill(); break;
      case 'horn':
        c.fillStyle = '#8a8a90'; c.beginPath(); c.arc(0, -18, 9, Math.PI, 0); c.fill();
        c.fillStyle = '#f0e6d0';
        c.beginPath(); c.moveTo(-8, -20); c.quadraticCurveTo(-18, -24, -16, -34); c.lineTo(-6, -24); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(8, -20); c.quadraticCurveTo(18, -24, 16, -34); c.lineTo(6, -24); c.closePath(); c.fill(); break;
      case 'halo':
        c.fillStyle = '#e8d8a0'; c.beginPath(); c.arc(0, -18, 9, Math.PI, 0); c.fill(); c.fillRect(-9, -18, 3, 12); c.fillRect(6, -18, 3, 12);
        c.shadowColor = '#fff1a8'; c.shadowBlur = 10; c.strokeStyle = '#fff1a8'; c.lineWidth = 2.5;
        c.beginPath(); c.ellipse(0, -31, 10, 3.5, 0, 0, TAU); c.stroke(); c.shadowBlur = 0; break;
      case 'cap':
        c.fillStyle = '#5a4630'; c.beginPath(); c.arc(0, -19, 9, Math.PI, 0); c.fill(); c.fillRect(0, -21, 14, 3); break;
      case 'tophat':
        c.fillStyle = '#2a1a2a'; c.fillRect(-12, -24, 24, 3); c.fillRect(-7, -38, 14, 14);
        c.fillStyle = '#ffe066'; c.fillRect(-7, -28, 14, 2.5); break;
      case 'crown':
        c.fillStyle = '#4a2f1f'; c.beginPath(); c.arc(0, -19, 8, Math.PI, 0); c.fill();
        c.fillStyle = '#ffd24a'; c.beginPath(); c.moveTo(-9, -22); c.lineTo(-9, -32); c.lineTo(-4.5, -27); c.lineTo(0, -34); c.lineTo(4.5, -27); c.lineTo(9, -32); c.lineTo(9, -22); c.closePath(); c.fill(); break;
      default:
        c.fillStyle = '#4a2f1f'; c.beginPath(); c.arc(0, -20, 8, Math.PI, 0); c.fill();
    }
  };
  UI.propGlyph = function (prop, d) {
    var c = D.ctx;
    c.lineCap = 'round';
    switch (prop) {
      case 'staff':
        c.strokeStyle = '#8a6440'; c.lineWidth = 3; c.beginPath(); c.moveTo(22, 30); c.lineTo(22, -26); c.stroke();
        c.shadowColor = '#ffb347'; c.shadowBlur = 14; c.fillStyle = '#ffb347'; c.beginPath(); c.arc(22, -30, 6, 0, TAU); c.fill(); c.shadowBlur = 0; break;
      case 'crossbow':
        c.strokeStyle = '#8a6440'; c.lineWidth = 4; c.beginPath(); c.moveTo(4, 4); c.lineTo(30, 4); c.stroke();
        c.strokeStyle = '#4a3020'; c.lineWidth = 3; c.beginPath(); c.moveTo(26, -10); c.quadraticCurveTo(34, 4, 26, 18); c.stroke();
        c.strokeStyle = '#f6e2b0'; c.lineWidth = 1; c.beginPath(); c.moveTo(26, -10); c.lineTo(26, 18); c.stroke(); break;
      case 'sword':
        c.strokeStyle = '#dfe8f5'; c.lineWidth = 4; c.beginPath(); c.moveTo(22, 14); c.lineTo(22, -26); c.stroke();
        c.strokeStyle = '#c8963c'; c.lineWidth = 3; c.beginPath(); c.moveTo(15, 14); c.lineTo(29, 14); c.stroke();
        c.fillStyle = '#3f5f9e'; c.beginPath(); c.moveTo(-26, -6); c.lineTo(-12, -6); c.lineTo(-12, 12); c.lineTo(-19, 20); c.lineTo(-26, 12); c.closePath(); c.fill(); break;
      case 'dagger':
        c.strokeStyle = '#dfe8f5'; c.lineWidth = 3; c.beginPath(); c.moveTo(20, 12); c.lineTo(30, -6); c.stroke();
        c.beginPath(); c.moveTo(-20, 12); c.lineTo(-30, -6); c.stroke(); break;
      case 'wrench':
        c.strokeStyle = '#b8c4d8'; c.lineWidth = 4; c.beginPath(); c.moveTo(20, 24); c.lineTo(24, -12); c.stroke();
        c.lineWidth = 3; c.beginPath(); c.arc(24, -16, 6, Math.PI * 0.2, Math.PI * 1.6); c.stroke(); break;
      case 'axe':
        c.strokeStyle = '#6b4428'; c.lineWidth = 4; c.beginPath(); c.moveTo(22, 28); c.lineTo(22, -24); c.stroke();
        c.fillStyle = '#dfe8f5'; c.beginPath(); c.moveTo(22, -24); c.quadraticCurveTo(40, -18, 36, -2); c.lineTo(22, -8); c.closePath(); c.fill(); break;
      case 'book':
        c.fillStyle = '#8a2a1a'; c.fillRect(14, -2, 18, 22);
        c.fillStyle = '#ffe2a8'; c.fillRect(17, 1, 12, 16);
        c.shadowColor = '#fff1a8'; c.shadowBlur = 12; c.fillStyle = '#fff1a8'; c.fillRect(21, 4, 4, 10); c.fillRect(18, 7, 10, 3); c.shadowBlur = 0; break;
      case 'bomb':
        c.fillStyle = '#2a2a30'; c.beginPath(); c.arc(24, 8, 9, 0, TAU); c.fill();
        c.strokeStyle = '#c8963c'; c.lineWidth = 2; c.beginPath(); c.moveTo(28, 0); c.quadraticCurveTo(32, -8, 36, -6); c.stroke();
        c.shadowColor = '#ff7a4a'; c.shadowBlur = 10; c.fillStyle = '#ffb347'; c.beginPath(); c.arc(36, -6, 3, 0, TAU); c.fill(); c.shadowBlur = 0; break;
      case 'coin':
        c.shadowColor = '#ffe066'; c.shadowBlur = 10; c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(24, 6, 9, 0, TAU); c.fill(); c.shadowBlur = 0;
        c.fillStyle = '#b8862a'; D.text('¥', 24, 7, 11, '#8a5a1a', 'center', true); break;
      case 'dice':
        c.fillStyle = '#f4f0e0'; D.rr(15, -2, 18, 18, 3); c.fill();
        c.fillStyle = '#1f5a4a'; [[20, 3], [28, 11], [24, 7]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 1.8, 0, TAU); c.fill(); }); break;
    }
    c.lineCap = 'butt';
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
    var m = RW.MODS[id], t = UI.fxText(m.fx);
    if (id === 'bounty') { t.pros = '精英掉落金币 ×2'; t.cons = '第 3 波起每波多来 1 只精英'; }
    if (!t.cons) t.cons = '无';
    return { pros: t.pros, cons: t.cons, note: id === 'bounty' ? '' : (m.note || '') };
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
      info.name = md.name; info.color = RW.RARITY[md.r || 0].color;
      info.tag = '道具 · 已有 ' + g.modCount(sl.id) + '/' + md.max;
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
    var c = D.ctx, shop = g.shop, i, LW = 420;   // 左栏宽度：沿用竖屏时的排版
    D.drawBg(true);
    UI.dim(0.72);
    // 头部
    D.text('波间整备', 16, 28, 22, C.text, 'left', true);
    var pm = Math.round((g.priceMul() - 1) * 100);
    D.text('第 ' + g.wave + ' 波已完成 · 物价 +' + pm + '%', 16, 50, 11, C.dim, 'left');
    var pv = UI.nextPreview(g);
    D.text(pv.text, 16, 64, 10, pv.boss ? '#ff9ab0' : C.gold, 'left', true);
    D.shardIcon(W - 110, 30, 11);
    D.text(String(g.shardCount), W - 94, 31, 28, C.shard, 'left', true);
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
    c.fillStyle = '#1e1712'; D.rr(16, y, LW - 32, 62, 6); c.fill();
    c.strokeStyle = '#4a3a28'; c.lineWidth = 1; D.rr(16, y, LW - 32, 62, 6); c.stroke();
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
    // 右栏：4 张货
    for (i = 0; i < 4; i++) {
      var sl = shop.slots[i];
      UI.card(g, sl, i, LW + 16, 82 + i * 112, W - LW - 32, 104);
    }
    // 圣火之后：键位提示
    D.text('1–4 购买 · R 刷新 · Enter 开始下一波', 16, 268, 11, C.faint, 'left');
    // 底部操作（左栏）
    var by = H - 66;
    var rc = g.rerollCost();
    UI.button('reroll', 16, by, 120, 50, '刷新', { sub: rc + ' 金币', disabled: g.shardCount < rc, why: '金币不足，刷新要 ' + rc });
    var adOk = g.wave >= RW.AD.FIRST_AD_WAVE;
    if (adOk) UI.button('adReroll', 144, by, 116, 50, adLabel, { style: 'ad', sub: shop.adUsed ? '本轮已用' : '免费刷新 1 次', size: 13, disabled: shop.adUsed, why: '每轮整备只能用一次' });
    UI.button('next', adOk ? 268 : 144, by, adOk ? 136 : 260, 50, '开始第 ' + (g.wave + 1) + ' 波', { style: 'primary', size: adOk ? 15 : 18 });
  };

  UI.statStrip = function (g, y) {
    var s = g.st, c = D.ctx;
    c.fillStyle = 'rgba(30,24,18,0.9)'; D.rr(10, y, 400, 36, 6); c.fill();
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
    // 品质：道具看表里的 r；武器 / 技能 / 科技按品阶 I→普通 II→精良 III→稀有
    var rare = sl.kind === 'mod' ? (RW.MODS[sl.id].r || 0) : Math.max(0, sl.tier - 1), RQ = RW.RARITY[rare];
    if (rare >= 1) { c.globalAlpha = 0.07 + rare * 0.02; c.fillStyle = RQ.color; D.rr(x, y, w, h, 8); c.fill(); c.globalAlpha = 1; }
    c.strokeStyle = sl.locked ? C.gold : (rare ? RQ.color : '#5a4630'); c.lineWidth = sl.locked ? 2 : (rare >= 1 ? 1.4 + rare * 0.3 : 1.2); D.rr(x + 0.5, y + 0.5, w - 1, h - 1, 8); c.stroke();
    D.text(RQ.name, x + w - 108, y + h - 12, 9, rare ? RQ.color : C.faint, 'right', true);
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
    var cx = W / 2;
    UI.dim(0.78);
    UI.panel(cx - 220, 100, 440, 340, C.red);
    D.glowText('值守中断', cx, 146, 34, C.red, 'center', 14);
    D.text('第 ' + g.wave + ' 波 · 还剩 ' + Math.max(0, Math.ceil(g.dur - g.wt)) + ' 秒', cx, 186, 13, C.text, 'center');
    var h = g.lastHits[g.lastHits.length - 1];
    if (h) D.text('致命一击：' + h.src, cx, 212, 13, '#ffb3c1', 'center', true);
    UI.button('revive', cx - 190, 244, 380, 70, adLabel + ' · 原地复活', { style: 'ad', size: 18, sub: '恢复 60% 生命，清空身边敌人（每局一次）' });
    if (adLabel === '预览发放') D.text('广告位未配置：本按钮直接发放奖励，不会播放广告', cx, 328, 10, C.dim, 'center');
    UI.button('giveup', cx - 190, 352, 380, 52, '结束值守，查看结算', { style: 'ghost', size: 14 });
  };

  // ================= 结算 =================
  UI.result = function (g) {
    var r = g.result, c = D.ctx, i;
    D.drawBg(true);
    UI.dim(0.6);
    D.text('值守结束' + (r.hero && RW.CLASSES[r.hero] ? ' · ' + RW.CLASSES[r.hero].name : ''), W / 2, 30, 14, C.dim, 'center', true);
    D.glowText('撑到第 ' + r.wave + ' 波', W / 2, 70, 36, r.newBest ? C.gold : C.cyan, 'center', 16);
    if (r.coreDown) D.text('圣火熄灭了', W / 2, 104, 13, C.red, 'center', true);
    else if (r.newBest) D.text('新纪录', W / 2, 104, 13, C.gold, 'center', true);
    else D.text('最佳：第 ' + r.best + ' 波', W / 2, 104, 12, C.dim, 'center');
    // 左栏：数据 + 输出构成
    var LX = 24, LW = 440;
    UI.panel(LX, 124, LW, 62);
    var st = [['击杀', String(r.kills), C.text], ['金币', String(r.shards), C.shard], ['位阶', r.stage, C.text], ['最高连杀', '×' + (r.streak || 0), C.gold]];
    for (i = 0; i < st.length; i++) {
      var sx = LX + 55 + i * 110;
      D.text(st[i][0], sx, 144, 11, C.dim, 'center'); D.text(st[i][1], sx, 166, 18, st[i][2], 'center', true);
    }
    var rows = Math.max(1, Math.min(10, r.list.length)), ph = 40 + rows * 26;
    UI.panel(LX, 196, LW, ph);
    D.text('输出构成', LX + 14, 214, 13, C.text, 'left', true);
    var max = 1;
    for (i = 0; i < r.list.length; i++) max = Math.max(max, r.list[i].dmg);
    for (i = 0; i < rows && i < r.list.length; i++) {
      var it = r.list[i], yy = 240 + i * 26;
      D.text(it.name, LX + 14, yy, 12, it.color, 'left', true);
      c.fillStyle = '#2a2016'; c.fillRect(LX + 130, yy - 6, 230, 12);
      c.fillStyle = it.color; c.fillRect(LX + 130, yy - 6, 230 * it.dmg / max, 12);
      D.text(String(it.dmg), LX + LW - 14, yy, 11, C.text, 'right');
    }
    // 右栏：死因 / 解锁 / 按钮
    var RX = 488, RWd = W - RX - 24;
    UI.panel(RX, 124, RWd, 118);
    D.text('最后受到的伤害', RX + 14, 144, 13, C.text, 'left', true);
    if (!r.hits.length) D.text('无', RX + 14, 170, 12, C.dim, 'left');
    for (i = 0; i < r.hits.length; i++) {
      var hh = r.hits[r.hits.length - 1 - i];
      D.text((i === 0 ? '致命 · ' : '之前 · ') + hh.src, RX + 14, 170 + i * 22, 12, i === 0 ? '#ffb3c1' : C.dim, 'left', i === 0);
      D.text('-' + (Math.round(hh.dmg * 10) / 10), RX + RWd - 14, 170 + i * 22, 12, '#ff6b81', 'right', true);
    }
    var adv = D.wrap(UI.adviceFor(r), RWd - 28, 12);
    for (i = 0; i < adv.length; i++) D.text(adv[i], RX + 14, 262 + i * 18, 12, C.dim, 'left');
    var un = r.unlocked || [];
    if (un.length) {   // 新解锁的英雄
      var uy = 320;
      c.fillStyle = 'rgba(60,44,12,0.95)'; D.rr(RX, uy, RWd, 64, 10); c.fill();
      c.strokeStyle = C.gold; c.lineWidth = 2; D.rr(RX + 1, uy + 1, RWd - 2, 62, 10); c.stroke();
      for (i = 0; i < Math.min(3, un.length); i++) UI.heroGlyph(un[i], RX + 36 + i * 44, uy + 32, 0.44);
      var names = un.map(function (id) { return RW.CLASSES[id].name; }).join('、');
      D.glowText('解锁新英雄：' + names, RX + 36 + Math.min(3, un.length) * 44 - 12, uy + 33, 16, C.gold, 'left', 8);
    }
    UI.button('again', RX, 404, RWd - 150, 58, '再来一局', { style: 'primary', size: 20 });
    UI.button('home', RX + RWd - 140, 404, 140, 58, '返回标题', { size: 14 });
    D.text('Enter 再来一局', RX + (RWd - 150) / 2, 476, 10, C.faint, 'center');
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
    var cx = W / 2;
    UI.panel(cx - 170, 110, 340, 300, C.cyan);
    D.text('暂停', cx, 150, 26, C.text, 'center', true);
    D.text('第 ' + g.wave + ' 波 · Esc 继续', cx, 180, 12, C.dim, 'center');
    UI.button('resume', cx - 140, 206, 280, 52, '继续', { style: 'primary', size: 18 });
    UI.button('mute', cx - 140, 270, 280, 44, muted ? '音效：关' : '音效：开', { size: 14 });
    UI.button('quit', cx - 140, 326, 280, 44, '放弃本局', { style: 'danger', size: 14 });
  };

  RW.UI = UI;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
