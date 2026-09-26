// 圣火守护者 · 界面：标题 / 选武器 / 整备商店 / 复活 / 结算 / 暂停
(function (root) {
  var RW = root.RW;
  var T = RW.TUNE, W = T.W, H = T.H, TAU = Math.PI * 2;
  var D = RW.Draw, C = D.C;
  var ROMAN = ['I', 'II', 'III'];

  var UI = { btns: [], lastBtns: [], focusId: null, padNav: false, pressed: null, toastMsg: '', toastT: 0, sel: null, t: 0 };

  UI.frame = function (dt) {
    UI.lastBtns = UI.btns; UI.btns = [];   // 上一帧的按钮留给手柄导航用
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
    if (opts.draw) { opts.draw(x, y, w, h, pressed); UI.focusRing(id, x, y, w, h); return; }
    var st = opts.style || 'normal';
    if (pressed) { c.save(); c.translate(x + w / 2, y + h / 2); c.scale(0.96, 0.96); c.translate(-x - w / 2, -y - h / 2); }
    c.globalAlpha = opts.disabled ? 0.45 : 1;
    // 木框金边按钮：主按钮是亮一档的木板 + 选中黄铜边；特别（ad）是金币黄铜边；危险带裂纹
    var U = D.UIC, tc = C.text;
    D.woodFrame(x, y, w, h, { style: st === 'normal' ? 'btn' : st });
    if (st === 'primary') tc = U.parch;
    else if (st === 'ad') tc = '#f0d6a0';
    else if (st === 'danger') tc = '#ffc2b0';
    else if (st === 'ghost') tc = C.dim;
    var size = opts.size || 15;
    if (opts.sub) {
      D.text(label, x + w / 2, y + h / 2 - 8, size, tc, 'center', true);
      D.text(opts.sub, x + w / 2, y + h / 2 + 11, 10, st === 'primary' ? '#d8c49a' : C.dim, 'center');
    } else D.text(label, x + w / 2, y + h / 2 + 1, size, tc, 'center', true);
    c.globalAlpha = 1;
    if (pressed) c.restore();
    UI.focusRing(id, x, y, w, h);
  };
  // 手柄 / 键盘导航时，当前选中的按钮画一圈金边
  UI.focusRing = function (id, x, y, w, h) {
    if (!UI.padNav || UI.focusId !== id) return;
    D.focusBrackets(x, y, w, h, 0.65 + 0.35 * Math.sin(UI.t * 8));   // 四角 L 形羊皮纸括号
  };

  UI.dim = function (a) { var c = D.ctx; c.fillStyle = 'rgba(2,4,10,' + a + ')'; c.fillRect(0, 0, W, H); };
  UI.panel = function (x, y, w, h, border) { D.woodFrame(x, y, w, h, { style: 'panel', edge: border }); };
  UI.drawToast = function () {
    if (UI.toastT <= 0 || !UI.toastMsg) return;
    var c = D.ctx, msg = RW.I18n ? RW.I18n.tr(UI.toastMsg) : UI.toastMsg;
    c.font = D.font(13, true);
    var w = Math.min(W - 40, c.measureText(msg).width + 32);
    c.globalAlpha = Math.min(1, UI.toastT * 3);
    var ty = UI.toastY || 8;
    D.tip = true;   // 提示层（界面审计：不许盖住战场中央）
    D.woodFrame((W - w) / 2, ty, w, 34, { style: 'hud', alpha: 0.95 });
    D.text(msg, W / 2, ty + 17, 13, C.text, 'center', true);
    D.tip = false;
    c.globalAlpha = 1;
  };

  // 首次启动不放菜单：玩家从第一帧就能拿着火种走向祭坛。
  UI.opening = function (g) {
    var o = g.opening, c = D.ctx;
    if (!o) return;
    UI.btns.length = 0;
    if (!o.ignited) {
      var dx = o.target.x - g.player.x, dy = o.target.y - g.player.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      c.globalAlpha = Math.min(1, o.time / 1.2) * Math.min(1, dist / 90);
      D.text('把火种带到祭坛', W / 2, 58, 17, D.UIC.parch, 'center', true, 4);
      D.text('WASD / 方向键 / 按住鼠标或手指拖动', W / 2, 82, 11, C.dim, 'center', false, 3);
      c.globalAlpha = 1;
      if (o.near > 0) {
        D.text('点燃圣火', W / 2, H - 74, 14, C.gold, 'center', true, 3);
        c.fillStyle = 'rgba(16,12,8,0.8)'; c.fillRect(W / 2 - 90, H - 56, 180, 4);
        c.fillStyle = C.gold; c.fillRect(W / 2 - 90, H - 56, 180 * Math.min(1, o.near / 1.8), 4);
      }
    } else {
      c.globalAlpha = o.titleAlpha();
      D.glowText('圣火守护者', W / 2, H / 2 - 12, 52, '#FFB547', 'center', 22);
      D.text('Ringwatch', W / 2, H / 2 + 40, 18, D.UIC.parch, 'center', true, 5);
      c.globalAlpha = 1;
    }
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
    // 标题页（FG-ART-002 阶段 3，参考概念图 1）：Logo 木牌在上三分之一，菜单是左侧竖排的木框按钮
    // 文案按 docs/UI_COPY_V1.md 第 4.1 节
    D.woodFrame(W / 2 - 220, 22, 440, 104, { style: 'panel', alpha: 0.9 });
    D.glowText('圣火守护者', W / 2, 70, 58, '#FFB547', 'center', 22);
    D.woodFrame(W / 2 - 100, 112, 200, 26, { style: 'hud' });
    D.text(RW.I18n && RW.I18n.lang === 'en' ? 'Hold the last flame' : 'FLAME GUARDIAN', W / 2, 125, 12, D.UIC.parch, 'center', true);
    D.text('长夜围住村庄，你是火旁最后的守护者。', W / 2, 162, 14, C.text, 'center', true, 3);
    var pr = g.prog || {};
    D.text(g.best > 0 ? '最佳纪录：守到第 ' + g.best + ' 波' + (pr.wins ? ' · 通关 ' + pr.wins + ' 次' : '') + (pr.bestScore ? ' · 最高分 ' + pr.bestScore : '') : '第一簇火，正等你点亮。', W / 2, 186, 12, g.best > 0 ? C.gold : C.dim, 'center', true, 3);
    var ri = UI.runInfo, mx = 36, mw = 214, y = 212;
    if (ri) {   // 有没打完的一局：继续是首选
      UI.button('continueRun', mx, y, mw, 52, '继续守护', { style: 'primary', size: 19,
        sub: ri.hero + ' · ' + (ri.daily ? '每日 · ' : '') + (ri.endless ? '无尽 · ' : '') + '第 ' + ri.wave + ' 波前' + (ri.danger ? ' · 危险 ' + ri.danger : '') });
      UI.button('start', mx, y + 58, mw, 38, '新的守护', { size: 13, sub: '将放弃上局' });
      y += 102;
    } else { UI.button('start', mx, y, mw, 56, '开始守护', { style: 'primary', size: 21 }); y += 62; }
    UI.button('night', W - 250, 220, 200, 52, '守桥一夜', { style: 'primary', size: 18, sub: '北桥 · 三分' });
    var dk = UI.dayKey(), ds = RW.dailySetup(dk), db = pr.daily && pr.daily[dk];
    UI.button('daily', mx, y, mw, 42, '每日挑战', { size: 14, style: 'ad', sub: RW.CLASSES[ds.hero].name + (db ? ' · 今日 ' + db + ' 分' : ' · 今日未挑战') });
    UI.button('records', mx, y + 48, mw, 42, '火光纪录', { size: 14, sub: RW.countKeys(pr.ach) + ' / ' + RW.ACHIEVEMENTS.length + ' 个成就' });
    UI.button('howto', mx, y + 96, mw / 2 - 3, 34, '玩法', { size: 13 });
    UI.button('settings', mx + mw / 2 + 3, y + 96, mw / 2 - 3, 34, '设置', { size: 13 });
    if (root.desktop) UI.button('exitGame', mx, y + 136, mw, 34, '退出', { style: 'ghost', size: 13 });
    UI.button('mute', mx, H - 44, mw / 2 - 3, 30, muted ? '声音：关' : '声音：开', { size: 11, style: 'ghost' });
    UI.button('music', mx + mw / 2 + 3, H - 44, mw / 2 - 3, 30, UI.musicOff ? '音乐：关' : '音乐：开', { size: 11, style: 'ghost' });
    if (RW.I18n && RW.I18n.web) UI.button('lang', W - 156, H - 44, 120, 30, RW.I18n.lang === 'en' ? '中文' : 'English', { size: 12, style: 'ghost' });
    var K = RW.keyLabel;
    D.text(K('up') + K('left') + K('down') + K('right') + ' 移动 · 自动攻击 · ' + K('dash') + ' 冲刺 · ' + K('skill0') + '/' + K('skill1') + '/' + K('skill2') + ' 技能 · 1–4 造塔 · Enter 开始 · 支持手柄', W / 2 + 130, H - 38, 11, C.dim, 'center', false, 3);
    D.text('v4.0 · 模型、音乐与音效均为程序生成的原创内容', W / 2 + 130, H - 18, 10, C.faint, 'center', false, 3);
  };

  UI.dayKey = function () {
    var d = new Date(), m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
  };

  UI.howto = function () {
    UI.dim(0.85);
    UI.panel(W / 2 - 360, 40, 720, 460, C.cyan);
    D.text('玩法说明', W / 2, 72, 20, C.cyan, 'center', true);
    var K = RW.keyLabel, mv = K('up') + K('left') + K('down') + K('right');
    var lines = [
      ['移动', mv + ' / 方向键；也可以按住鼠标拖动。武器自动瞄准最近的敌人，你只管走位。'],
      ['技能', K('dash') + ' 冲刺（短暂无敌），' + K('skill0') + ' / ' + K('skill1') + ' / ' + K('skill2') + ' 放技能。'],
      ['造塔', '按 1–4 直接在脚下造塔（箭塔 / 寒霜塔 / 聚金桩 / 兵营），' + K('build') + ' 打开造塔菜单。'],
      ['兵营', K('cmd:post') + ' 让最近的兵营到你脚下布防，' + K('cmd:troop') + ' 换兵种、' + K('cmd:form') + ' 换阵型、' + K('cmd:recall') + ' 召回。'],
      ['圣火', '圣火亮着，英雄倒下会倒计时复活；圣火熄灭每局能重燃 ' + RW.REKINDLE.times + ' 次。'],
      ['圣域', '升级圣火，照亮的范围更大：里面的田舍产金、敌人变慢，还会解锁新能力，满级打全图。'],
      ['战意', '在身边击杀攒战意，攒满进入狂热：攻速、伤害、移速都涨。离开战斗会慢慢掉。'],
      ['整备', '买武器 / 道具 / 技能 / 科技。同流派武器凑层数有套装；III 阶武器配对应道具能进化。'],
      ['通关', '一局 20 波，第 20 波击败灭火者即通关，可以接着打无尽。晋升和打倒 Boss 时三选一拿祝福。'],
      ['预警', RW.opt.cb ? '蓝准星＝要刷怪；蓝线＝冲锋；黄虚线＝喷刺；黄圈＝爆囊要炸。' : '红准星＝要刷怪；粉线＝冲锋；黄虚线＝喷刺；橙圈＝爆囊要炸。']
    ];
    for (var i = 0; i < lines.length; i++) {
      var col = i < 5 ? 0 : 1, y = 110 + (i % 5) * 62, x0 = W / 2 - 336 + col * 350;   // 10 条，两列各 5 条
      D.text(lines[i][0], x0, y, 14, C.gold, 'left', true);
      var wl = D.wrap(lines[i][1], 270, 12);
      for (var j = 0; j < wl.length; j++) D.text(wl[j], x0 + 50, y + j * 17, 12, C.text, 'left');
    }
    UI.button('howtoClose', W / 2 - 100, 436, 200, 44, '明白', { style: 'primary' });
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
    D.text('选择守火人', 24, 36, 24, C.text, 'left', true, 3);
    D.text('已解锁 ' + nUn + ' / ' + ids.length + ' · 每个英雄自带不同的属性和特性 · 方向键切换，Enter 出发', 24, 60, 11, C.dim, 'left', false, 3);
    for (i = 0; i < ids.length; i++) {
      var col = i % 5, row = (i / 5) | 0;
      UI.button('hero:' + ids[i], 24 + col * 86, 76 + row * 104, 80, 96, '', { draw: UI.heroTile(g, ids[i]) });
    }
    UI.runSetup(g, 24, 290, 424, 188);
    UI.heroDetail(g, UI.heroSel, 468, 24, W - 492, 454);
    var sel = UI.heroSel, ok = RW.isUnlocked(sel, prog);
    UI.button('back', 24, 486, 160, 44, '返回', { style: 'ghost', size: 14 });
    UI.button('pick:' + sel, 468, 486, W - 492, 44, ok ? '举火出发' : '尚未相遇', { style: ok ? 'primary' : 'ghost', size: 17, sub: ok ? RW.CLASSES[sel].name + ' · ' + RW.MAPS[UI.runMap].name : '', disabled: !ok, why: '解锁条件：' + RW.CLASSES[sel].unlock.text });
  };
  // 本局设置：危险等级（按英雄解锁）+ 变异器；记在 UI 上，存档一起保存
  UI.runDanger = 0; UI.runMuts = []; UI.runMap = 'village';
  UI.maxDanger = function (g, id) {
    var hd = g.prog && g.prog.heroDanger ? g.prog.heroDanger[id] : undefined;
    return hd == null ? 0 : Math.min(RW.DANGER.length - 1, hd + 1);
  };
  UI.scoreMul = function (danger, muts) {
    var m = 1 + danger * RW.SCORE.danger;
    for (var i = 0; i < muts.length; i++) m += RW.MUTATORS[muts[i]].score;
    return m;
  };
  UI.runSetup = function (g, x, y, w, h) {
    var c = D.ctx, id = UI.heroSel, top = UI.maxDanger(g, id), i;
    if (UI.runDanger > top) UI.runDanger = top;
    UI.panel(x, y, w, h);
    D.text('本局设置', x + 16, y + 18, 13, C.text, 'left', true);
    D.text('分数倍率 ×' + UI.scoreMul(UI.runDanger, UI.runMuts).toFixed(2), x + w - 16, y + 18, 12, C.gold, 'right', true);
    // 地图
    D.text('地图', x + 16, y + 46, 11, C.dim, 'left');
    for (i = 0; i < RW.MAP_ORDER.length; i++) {
      var mpId = RW.MAP_ORDER[i], mp = RW.MAPS[mpId], mOpen = RW.mapOpen(mpId, g.prog);
      UI.button('map:' + mpId, x + 50 + i * 92, y + 32, 88, 28, mp.name, { style: UI.runMap === mpId ? 'primary' : 'normal', size: 12, disabled: !mOpen,
        why: '解锁条件：' + (mp.unlock ? mp.unlock.text : '') });
    }
    D.text('危险', x + 16, y + 80, 11, C.dim, 'left');
    for (i = 0; i < RW.DANGER.length; i++) {
      var on = UI.runDanger === i, open = i <= top;
      UI.button('danger:' + i, x + 50 + i * 42, y + 66, 38, 28, String(i), { style: on ? 'danger' : 'normal', size: 13, disabled: !open,
        why: '先用' + RW.CLASSES[id].name + '通关危险 ' + (i - 1) });
    }
    D.text(RW.DANGER[UI.runDanger].note, x + 310, y + 80, 10, UI.runDanger ? '#ffb3c1' : C.dim, 'left');
    D.text('变异器（点选开关，难度越高分越多）', x + 16, y + 110, 11, C.dim, 'left');
    for (i = 0; i < RW.MUT_ORDER.length; i++) {
      var mid = RW.MUT_ORDER[i], mo = UI.runMuts.indexOf(mid) >= 0, col = i % 4, row = (i / 4) | 0;
      UI.button('mut:' + mid, x + 16 + col * 100, y + 122 + row * 32, 94, 27, RW.MUTATORS[mid].name, { style: mo ? 'ad' : 'ghost', size: 12 });
    }
  };

  UI.heroTile = function (g, id) {
    return function (x, y, w, h, pressed) {
      var c = D.ctx, d = RW.CLASSES[id], ok = RW.isUnlocked(id, g.prog), on = UI.heroSel === id;
      c.fillStyle = pressed ? 'rgba(50,38,26,0.96)' : (on ? 'rgba(40,30,22,0.96)' : 'rgba(18,14,12,0.9)'); D.chamfer(x, y, w, h, 10); c.fill();
      c.strokeStyle = on ? d.color : (ok ? '#5a4630' : '#2a2016'); c.lineWidth = on ? 2.5 : 1.2; D.chamfer(x + 1, y + 1, w - 2, h - 2, 10); c.stroke();
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
    c.fillStyle = '#c8b89a'; D.chamfer(x - 9, y - 4, 18, 13, 3); c.fill();
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
    c.fillStyle = 'rgba(18,14,12,0.92)'; D.chamfer(x, y, w, h, 12); c.fill();
    c.strokeStyle = d.color; c.lineWidth = 2; D.chamfer(x + 1, y + 1, w - 2, h - 2, 12); c.stroke();
    UI.heroGlyph(id, x + 60, y + 70, 1);
    D.text(d.name, x + 122, y + 34, 26, d.color, 'left', true);
    c.font = D.font(26, true);
    var nw = c.measureText(RW.I18n ? RW.I18n.tr(d.name) : d.name).width;
    c.fillStyle = 'rgba(255,255,255,0.08)'; D.chamfer(x + 130 + nw, y + 24, 64, 20, 10); c.fill();
    D.text(d.tag, x + 162 + nw, y + 34, 10, C.text, 'center', true);
    D.text('起手：' + RW.WEAPONS[d.weapon].name + ' · 技能：' + RW.SKILLS[d.skill].name, x + 122, y + 64, 11, C.dim, 'left');
    var best = (g.prog && g.prog.heroBest && g.prog.heroBest[id]) || 0, hd = g.prog && g.prog.heroDanger ? g.prog.heroDanger[id] : undefined;
    D.text('生命 ' + d.hp + (best ? '　·　最高到第 ' + best + ' 波' : '') + (hd != null ? '　·　已通关危险 ' + hd : ''), x + 122, y + 82, 11, hd != null ? C.gold : C.dim, 'left');
    var yy = y + 106;
    var pl = D.wrap(d.passive, w - 142, 12);
    for (var q = 0; q < pl.length; q++) D.text(pl[q], x + 122, yy + q * 16, 12, '#ffe2a8', 'left', true);
    yy = Math.max(y + 150, yy + pl.length * 16 + 10);
    var ft = UI.fxText(d.fx);
    if (ft.pros || ft.cons) {
      c.fillStyle = 'rgba(255,255,255,0.04)'; D.chamfer(x + 14, yy - 12, w - 28, ft.pros && ft.cons ? 42 : 24, 6); c.fill();
      if (ft.pros) { D.text('↑ ' + ft.pros, x + 24, yy, 11, C.good, 'left', true); yy += 18; }
      if (ft.cons) { D.text('↓ ' + ft.cons, x + 24, yy, 11, C.bad, 'left', true); yy += 18; }
      yy += 12;
    }
    yy = UI.prosCons(x + 24, yy + 4, w - 48, d.pros, d.cons) + 18;
    // 起手武器与技能
    var wd = RW.WEAPONS[d.weapon], sd = RW.SKILLS[d.skill], boxes = [['起手武器', wd.name, wd.color, wd.pros], ['主动技能', sd.name, sd.color, sd.pros]];
    for (var bi = 0; bi < boxes.length && yy < y + h - (ok ? 60 : 120); bi++) {
      var bx = boxes[bi], tl = D.wrap(bx[3], w - 60, 11);
      c.fillStyle = 'rgba(255,255,255,0.04)'; D.chamfer(x + 14, yy, w - 28, 30 + tl.length * 15, 6); c.fill();
      c.fillStyle = bx[2]; c.fillRect(x + 14, yy + 6, 3, 18 + tl.length * 15);
      D.text(bx[0], x + 26, yy + 13, 10, C.dim, 'left');
      D.text(bx[1], x + 86, yy + 13, 13, bx[2], 'left', true);
      for (var li = 0; li < tl.length; li++) D.text(tl[li], x + 26, yy + 31 + li * 15, 11, C.text, 'left');
      yy += 38 + tl.length * 15;
    }
    if (!ok) {
      var u = d.unlock, up = RW.unlockProgress(id, g.prog), k = Math.min(1, up.have / up.need), by = y + h - 58;
      c.fillStyle = 'rgba(0,0,0,0.55)'; D.chamfer(x + 12, by, w - 24, 46, 8); c.fill();
      UI.lockIcon(x + 34, by + 22);
      D.text('解锁条件：' + u.text, x + 56, by + 15, 12, C.gold, 'left', true);
      c.fillStyle = '#2a2016'; D.chamfer(x + 56, by + 27, w - 140, 8, 4); c.fill();
      c.fillStyle = C.gold; D.chamfer(x + 56, by + 27, Math.max(8, (w - 140) * k), 8, 4); c.fill();
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
        c.fillStyle = '#f4f0e0'; D.chamfer(15, -2, 18, 18, 3); c.fill();
        c.fillStyle = '#1f5a4a'; [[20, 3], [28, 11], [24, 7]].forEach(function (p) { c.beginPath(); c.arc(p[0], p[1], 1.8, 0, TAU); c.fill(); }); break;
    }
    c.lineCap = 'butt';
  };

  UI.weaponGlyph = function (id, x, y, r, color) {
    var c = D.ctx;
    if (id === 'cleaver') id = 'swing';
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
      case 'repeater': for (var q = -1; q <= 1; q++) { c.beginPath(); c.moveTo(x - 10, y + q * 5 + 4); c.lineTo(x + 8, y + q * 5 - 4); c.stroke(); } break;
      case 'javelin': c.beginPath(); c.moveTo(x - 12, y + 8); c.lineTo(x + 10, y - 8); c.stroke(); c.beginPath(); c.moveTo(x + 12, y - 10); c.lineTo(x + 4, y - 8); c.lineTo(x + 10, y - 2); c.closePath(); c.fill(); break;
      case 'swing': c.lineWidth = 3; c.beginPath(); c.arc(x - 4, y + 4, 12, -1.4, 0.2); c.stroke(); c.beginPath(); c.moveTo(x - 4, y + 4); c.lineTo(x + 8, y - 8); c.stroke(); break;
      case 'pike': c.beginPath(); c.moveTo(x - 13, y); c.lineTo(x + 8, y); c.stroke(); c.beginPath(); c.moveTo(x + 13, y); c.lineTo(x + 6, y - 4); c.lineTo(x + 6, y + 4); c.closePath(); c.fill(); break;
      case 'flail': c.beginPath(); c.moveTo(x - 10, y + 8); c.lineTo(x + 2, y - 2); c.stroke(); c.beginPath(); c.arc(x + 5, y - 5, 5, 0, TAU); c.fill(); break;
      default: c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill();
    }
  };
  UI.weaponStatLine = function (id, tier, g) {
    var d = RW.WEAPONS[id], mul = g && g.st ? g.st.dmg * (g.st[d.tag] || 1) * (g.momDmg ? g.momDmg() : 1) : 1;
    var dmg = Math.round(d.dmg * RW.TIER_DMG[tier - 1] * mul * 10) / 10;
    var lane = d.tag === 'melee' ? '近战' : (d.tag === 'spell' ? '法术' : '远程');
    switch (d.kind) {
      case 'needle': return lane + ' ' + dmg + ' · 间隔 ' + d.cd[tier - 1] + 's · 射程 ' + d.range;
      case 'scatter': return lane + ' ' + dmg + '×' + (d.pellets + tier - 1) + ' 片 · 间隔 ' + d.cd[tier - 1] + 's · 射程 ' + d.range;
      case 'blades': return lane + ' ' + dmg + ' · ' + (d.count + tier - 1) + ' 片刃 · 半径 ' + d.range;
      case 'lance': return lane + ' ' + dmg + ' · 间隔 ' + d.cd[tier - 1] + 's · 贯穿 · 射程 ' + d.range;
      case 'arc': return lane + ' ' + dmg + ' · 连跳 ' + (d.jumps + tier - 1) + ' 次 · 间隔 ' + d.cd[tier - 1] + 's';
      case 'mines': return lane + ' ' + dmg + ' · 范围 ' + d.range + ' · 同时 ' + (d.maxMines + tier - 1) + ' 颗';
      case 'swing': return lane + ' ' + dmg + ' · 扇形横扫 · 间隔 ' + d.cd[tier - 1] + 's · 距离 ' + d.range;
    }
    return '';
  };
  UI.towerStatLine = function (id, tier) {
    var d = RW.TOWERS[id], ti = tier - 1, hp = Math.round(d.hp * RW.TOWER_TIER.hp[ti]);
    var rg = Math.round(d.range * RW.TOWER_TIER.range[ti]);
    if (d.kind === 'sentry') return '伤害 ' + Math.round(d.dmg * RW.TOWER_TIER.dmg[ti] * 10) / 10 + ' · 间隔 ' + d.cd + 's · 射程 ' + rg + ' · 耐久 ' + hp;
    if (d.kind === 'pylon') return '减速 ' + Math.round(d.slow * 100) + '% · 半径 ' + rg + ' · 耐久 ' + hp;
    if (d.kind === 'barracks') { var k = RW.TOWER_TIER.dmg[ti]; return '士兵 ' + d.soldiers[ti] + ' 名 · 伤害 盾卫 ' + Math.round(RW.TROOPS.guard.dmg * k * 10) / 10 + ' / 枪兵 ' + Math.round(RW.TROOPS.spear.dmg * k * 10) / 10 + ' / 弓手 ' + Math.round(RW.TROOPS.archer.dmg * k * 10) / 10 + ' · 耐久 ' + hp; }
    return '吸取半径 ' + rg + ' · 加成 +' + Math.round(d.bonus[ti] * 100) + '% · 耐久 ' + hp;
  };
  UI.prosCons = function (x, y, w, pros, cons, note) {
    var c = D.ctx, yy = y, i;
    var pl = D.wrap(pros, w - 30, 12);
    c.fillStyle = C.good; D.chamfer(x - 3, yy - 9, 18, 18, 4); c.fill(); D.text('强', x + 6, yy, 11, '#06150c', 'center', true);
    for (i = 0; i < pl.length; i++) D.text(pl[i], x + 22, yy + i * 16, 12, '#c9ffd6', 'left');
    yy += Math.max(1, pl.length) * 16 + 6;
    var cl = D.wrap(cons, w - 30, 12);
    c.fillStyle = C.bad; D.chamfer(x - 3, yy - 9, 18, 18, 4); c.fill(); D.text('弱', x + 6, yy, 11, '#1a0508', 'center', true);
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
      var evo = RW.EVOLVE[sl.id];
      if (evo && sl.tier === 3) info.pros += '；配上「' + RW.MODS[evo.mod].name + '」可进化为' + evo.name;
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
      for (var ek in RW.EVOLVE) if (RW.EVOLVE[ek].mod === sl.id && g.findWeapon(ek)) { info.tag += ' · 可进化' + RW.WEAPONS[ek].name; break; }
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
      case 'swing': return '扫得更快';
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
    var boss = n % RW.BOSS_WAVES.every === 0, fin = n === RW.RUN.waves && !g.endless;
    var bn = fin ? RW.ENEMIES.tyrant.name + '（终局）' : RW.ENEMIES.boss.name;
    return { boss: boss, text: '下一波 ' + n + (g.endless ? '（无尽）' : ' / ' + RW.RUN.waves) + '：' + names.join(' ') + (es.length ? ' · 精英 ' + es.join(' ') : '') + (boss ? ' · BOSS ' + bn + '！' : '') };
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
    D.text('第 ' + g.wave + ' 波已完成 · 物价 +' + pm + '% · 1–4 购买 · R 刷新 · Enter 下一波 · 还能禁用 ' + g.bansLeft + ' 件', 16, 50, 11, C.dim, 'left');
    var pv = UI.nextPreview(g);
    D.text(pv.text, 16, 64, 10, pv.boss ? '#ff9ab0' : C.gold, 'left', true);
    D.shardIcon(W - 110, 30, 11);
    D.text(String(g.shardCount), W - 94, 31, 28, C.shard, 'left', true);
    // 属性条
    UI.statStrip(g, 74);
    UI.button('statsHelp', 318, 12, 92, 26, '属性', { size: 11, style: 'ghost' });
    // 武器槽
    var y = 128;
    D.text('武器 ' + g.weapons.length + '/' + RW.MAX_SLOTS + ' · 点两次出售（返还 50%）', 16, y, 11, C.dim, 'left');
    for (i = 0; i < RW.MAX_SLOTS; i++) {
      var sx = 16 + i * 66, sy = y + 9;
      var w = g.weapons[i];
      if (!w) { c.strokeStyle = '#4a3a28'; c.lineWidth = 1; if (c.setLineDash) c.setLineDash([3, 3]); D.chamfer(sx, sy, 60, 42, 6); c.stroke(); if (c.setLineDash) c.setLineDash([]); continue; }
      UI.button('wslot:' + i, sx, sy, 60, 42, '', { draw: (function (w, i) {
        return function (x, yy, bw, bh) {
          var sel = UI.sel === 'w:' + i;
          c.fillStyle = sel ? '#2a0b14' : '#1e1712'; D.chamfer(x, yy, bw, bh, 6); c.fill();
          c.strokeStyle = sel ? C.red : (w.ev ? C.gold : w.d.color); c.lineWidth = sel || w.ev ? 2 : 1.5; D.chamfer(x, yy, bw, bh, 6); c.stroke();
          if (sel) { D.text('出售', x + bw / 2, yy + 14, 12, '#ffc2cd', 'center', true); D.text('+' + g.weaponSellValue(w), x + bw / 2, yy + 30, 11, C.shard, 'center', true); }
          else { D.text(w.name || w.d.name, x + bw / 2, yy + 15, (w.name || w.d.name).length > 3 ? 11 : 12, w.ev ? C.gold : w.d.color, 'center', true); D.text(w.ev ? '进化' : ROMAN[w.tier - 1], x + bw / 2, yy + 31, 11, w.ev ? C.gold : C.text, 'center', true); }
        };
      })(w, i) });
    }
    // 技能 + 圣火
    y = 190;
    c.fillStyle = '#1e1712'; D.chamfer(16, y, LW - 32, 62, 6); c.fill();
    c.strokeStyle = '#4a3a28'; c.lineWidth = 1; D.chamfer(16, y, LW - 32, 62, 6); c.stroke();
    // 三个技能；带「◂」的是买新技能时会被替换的那一招（最近放过的）
    var sks = g.skills && g.skills.length ? g.skills : (g.skill ? [g.skill] : []), keys = [RW.keyLabel('skill0'), RW.keyLabel('skill1'), RW.keyLabel('skill2')];
    for (var si = 0; si < sks.length && si < 3; si++) {
      var sk = sks[si], sy2 = y + 12 + si * 17;
      D.text(keys[si], 24, sy2, 10, C.faint, 'left', true);
      D.text(sk.d.name + ' ' + ROMAN[sk.tier - 1] + (sk === g.skill ? ' ◂' : ''), 36, sy2, 11, sk.d.color, 'left', true);
    }
    var co = g.core, ck = co.hp / co.maxHp;
    var fr = g.front;
    D.text('圣火 Lv' + (co.lv || 1) + '/' + RW.CORE_MAX_LV + (fr ? ' · ' + fr.name : '') + '  ' + Math.ceil(co.hp) + '/' + co.maxHp, 118, y + 14, 10, ck < 0.4 ? C.bad : '#ffd27a', 'left', true);
    c.fillStyle = '#140e0a'; c.fillRect(118, y + 22, 120, 6);
    c.fillStyle = ck < 0.3 ? C.red : (ck < 0.6 ? '#ff9f43' : '#ffd27a'); c.fillRect(118, y + 22, 120 * ck, 6);
    var rc2 = g.coreRepairCost(), uc = g.coreUpgradeCost(), nxt = RW.CORE_LV[(co.lv || 1) + 1], maxed = !nxt;
    UI.button('repair', 118, y + 32, 124, 26, '护火 · ' + rc2, { size: 11, disabled: co.hp >= co.maxHp || g.shardCount < rc2, why: co.hp >= co.maxHp ? '生命已满' : '金币不足' });
    var needF = g.coreNeedsForm(), cf = RW.CORE_FORMS[co.form];
    UI.button('upgrade', 250, y + 32, 146, 26, maxed ? '已满级' : ((needF ? '择形升级 · ' : '升级 · ') + uc), { size: 11, style: needF ? 'ad' : 'normal', disabled: maxed || g.shardCount < uc, why: maxed ? '已满级' : '金币不足' });
    if (cf) D.text(cf.name + ' ' + ['I', 'II', 'III'][(co.formTier || 1) - 1], 396, y + 14, 10, cf.color, 'right', true);
    // 卡片
    // 右栏：4 张货
    for (i = 0; i < 4; i++) {
      var sl = shop.slots[i];
      UI.card(g, sl, i, LW + 16, 82 + i * 112, W - LW - 32, 104);
    }
    // 圣火之后：键位提示
    var nx2 = RW.CORE_LV[(g.core.lv || 1) + 1];
    D.text(nx2 ? '圣火下一级 Lv' + ((g.core.lv || 1) + 1) + '：' + nx2.desc : '圣火已满级：天火照遍全图', 16, 268, 10, nx2 ? '#ffd27a' : C.gold, 'left');
    UI.setsPanel(g, 16, 280, LW - 32);
    UI.evolvePanel(g, 16, 360, LW - 32);
    // 底部操作（左栏）
    var by = H - 66;
    var rc = g.rerollCost();
    UI.button('reroll', 16, by, 120, 50, '刷新', { sub: rc + ' 金币', disabled: g.shardCount < rc, why: '金币不足，刷新要 ' + rc });
    var adOk = !!adLabel && g.wave >= RW.AD.FIRST_AD_WAVE;   // 桌面版没有广告入口
    var cgAds = !!(RW.Plat && RW.Plat.adProvider === 'crazygames' && RW.AdsCrazy);
    var adSpent = cgAds ? !RW.AdsCrazy.allow('reroll') : !!shop.adUsed;
    if (adOk) UI.button('adReroll', 144, by, 116, 50, adLabel, { style: 'ad', sub: adSpent ? (cgAds ? '本局已用' : '本轮已用') : (cgAds ? '本局 1 次' : '免费刷新 1 次'), size: 13, disabled: adSpent, why: cgAds ? '每局只能看一次广告刷新' : '每轮整备只能用一次' });
    UI.button('next', adOk ? 268 : 144, by, adOk ? 136 : 260, 50, '迎战', { style: 'primary', size: adOk ? 15 : 18, sub: '第 ' + (g.wave + 1) + ' 波' });
  };

  // 流派套装：同流派武器阶数之和，2 / 4 / 6 层各一档
  UI.setText = function (fx) { var t = UI.fxText(fx); return t.pros + (t.cons ? '，' + t.cons : ''); };
  UI.setsPanel = function (g, x, y, w) {
    var c = D.ctx, cnt = g.sets || {};
    D.text('流派套装 · 同流派武器的阶数相加（I=1 II=2 III=3）', x, y + 4, 10, C.dim, 'left');
    for (var k = 0; k < RW.SET_ORDER.length; k++) {
      var tag = RW.SET_ORDER[k], S = RW.SETS[tag], n = cnt[tag] || 0, yy = y + 22 + k * 20, nx = null, j;
      D.text(S.name, x, yy, 11, n >= 2 ? S.color : C.faint, 'left', true);
      for (j = 0; j < 6; j++) {
        c.fillStyle = j < n ? S.color : '#2a2016';
        c.fillRect(x + 32 + j * 11 + (j >= 2 ? 3 : 0) + (j >= 4 ? 3 : 0), yy - 5, 9, 10);
      }
      D.text(String(n), x + 112, yy, 11, n >= 2 ? C.text : C.faint, 'left', true);
      for (j = 0; j < S.tiers.length; j++) if (n < S.tiers[j][0]) { nx = S.tiers[j]; break; }
      var txt = nx ? (nx[0] + ' 层：' + UI.setText(nx[1])) : '三档全部生效';
      D.text(txt, x + 132, yy, 10, nx ? C.dim : S.color, 'left');
    }
  };
  // 武器进化：III 阶 + 指定道具 → 整备时免费进化
  UI.evolvePanel = function (g, x, y, w) {
    var c = D.ctx, cw = (w - 8) / 2;
    D.text('武器进化 · III 阶武器 + 对应道具 → 免费进化，伤害 ×' + RW.EVOLVE_MUL, x, y + 4, 10, C.dim, 'left');
    for (var i = 0; i < g.weapons.length; i++) {
      var wp = g.weapons[i], ev = RW.EVOLVE[wp.id], col = i % 2, row = (i / 2) | 0;
      var bx = x + col * (cw + 8), by = y + 14 + row * 31;
      if (!ev) continue;
      if (g.canEvolve(wp)) {
        UI.button('evolve:' + i, bx, by, cw, 27, '进化 → ' + ev.name, { style: 'ad', size: 12 });
        continue;
      }
      c.fillStyle = 'rgba(30,24,18,0.9)'; D.chamfer(bx, by, cw, 27, 6); c.fill();
      if (wp.ev) { c.strokeStyle = C.gold; c.lineWidth = 1; D.chamfer(bx + 0.5, by + 0.5, cw - 1, 26, 6); c.stroke(); D.text(ev.name + ' · ' + ev.note, bx + 8, by + 14, 10, C.gold, 'left', true); continue; }
      var hasT = wp.tier >= 3, hasM = g.modCount(ev.mod) > 0;
      D.text(wp.d.name, bx + 8, by + 14, 11, wp.d.color, 'left', true);
      c.font = D.font(11, true);
      var nx = bx + 12 + c.measureText(RW.I18n ? RW.I18n.tr(wp.d.name) : wp.d.name).width;
      D.text('III', nx, by + 14, 10, hasT ? C.good : C.faint, 'left', true);
      D.text('+ ' + RW.MODS[ev.mod].name, nx + 22, by + 14, 10, hasM ? C.good : C.faint, 'left', true);
      D.text('→ ' + ev.name, bx + cw - 8, by + 14, 10, C.dim, 'right');
    }
  };

  UI.statStrip = function (g, y) {
    var s = g.st, c = D.ctx;
    c.fillStyle = 'rgba(30,24,18,0.9)'; D.chamfer(10, y, 400, 44, 6); c.fill();
    var items = [
      ['生命', Math.round(s.maxHp), s.maxHp - T.player.hp],
      ['伤害', pct(s.dmg - 1), s.dmg - 1],
      ['近战', pct(s.melee - 1), s.melee - 1],
      ['远程', pct(s.ranged - 1), s.ranged - 1],
      ['法术', pct(s.spell - 1), s.spell - 1],
      ['攻速', pct(s.rate - 1), s.rate - 1],
      ['移速', Math.round(T.player.speed * s.speed), s.speed - 1],
      ['护甲', Math.round(s.armor) + ' · ' + Math.round((1 - (s.takenMul / Math.max(0.01, s.dmgTaken))) * 100) + '%', s.armor],
      ['暴击', Math.round(s.crit * 100) + '%', s.crit - T.player.crit],
      ['射程', pct(s.range - 1), s.range - 1],
      ['回血', (Math.round(s.regen * 10) / 10) + '/s', s.regen],
      ['冷却', pct(s.cdr - 1), -(s.cdr - 1)],
      ['收成', '+' + Math.round(T.harvestBase + Math.max(0, s.harvest - 1) * T.harvestPer), s.harvest - 1],
      ['弹数', '+' + s.extra, s.extra],
      ['受伤', pct(s.takenMul - 1), -(s.takenMul - 1)]
    ];
    for (var i = 0; i < items.length; i++) {
      var col = i % 6, row = (i / 6) | 0, x = 16 + col * 66, yy = y + 9 + row * 13;
      var it = items[i], color = it[2] > 0.001 ? C.good : (it[2] < -0.001 ? C.bad : C.text);
      D.text(it[0], x, yy, 9, C.dim, 'left');
      D.text(String(it[1]), x + 26, yy, 10, color, 'left', true);
    }
    function pct(v) { var r = Math.round(v * 100); return (r > 0 ? '+' : '') + r + '%'; }
  };

  UI.card = function (g, sl, i, x, y, w, h) {
    var c = D.ctx;
    if (!sl || sl.kind === 'none') { c.strokeStyle = '#3a2e20'; D.chamfer(x, y, w, h, 8); c.stroke(); return; }
    if (sl.sold) {
      c.fillStyle = 'rgba(26,20,14,0.6)'; D.chamfer(x, y, w, h, 8); c.fill();
      c.strokeStyle = '#3a2e20'; c.lineWidth = 1; D.chamfer(x, y, w, h, 8); c.stroke();
      D.text(sl.gone ? '已失效' : '已购入', x + w / 2, y + h / 2, 14, C.faint, 'center', true);
      return;
    }
    var info = UI.cardInfo(g, sl);
    var afford = g.shardCount >= sl.price;
    c.fillStyle = 'rgba(26,20,16,0.96)'; D.chamfer(x, y, w, h, 8); c.fill();
    // 品质：道具看表里的 r；武器 / 技能 / 科技按品阶 I→普通 II→精良 III→稀有
    var rare = sl.kind === 'mod' ? (RW.MODS[sl.id].r || 0) : Math.max(0, sl.tier - 1), RQ = RW.RARITY[rare];
    if (rare >= 1) { c.globalAlpha = 0.07 + rare * 0.02; c.fillStyle = RQ.color; D.chamfer(x, y, w, h, 8); c.fill(); c.globalAlpha = 1; }
    c.strokeStyle = sl.locked ? C.gold : (rare ? RQ.color : '#5a4630'); c.lineWidth = sl.locked ? 2 : (rare >= 1 ? 1.4 + rare * 0.3 : 1.2); D.chamfer(x + 0.5, y + 0.5, w - 1, h - 1, 8); c.stroke();
    D.text(RQ.name, x + w - 108, y + h - 12, 9, rare ? RQ.color : C.faint, 'right', true);
    c.fillStyle = info.color; c.fillRect(x + 1, y + 10, 3, h - 20);
    D.text(info.name, x + 14, y + 16, 16, info.color, 'left', true);
    c.font = D.font(16, true);
    var nw = c.measureText(RW.I18n ? RW.I18n.tr(info.name) : info.name).width;
    D.text(info.tag, x + 20 + nw, y + 17, 10, C.dim, 'left');
    var textW = w - 128;
    var yy = y + 38;
    if (info.stat) { D.text(info.stat, x + 14, y + 34, 10, C.dim, 'left'); yy = y + 52; }
    var pl = D.wrap(info.pros, textW, 11), cl = D.wrap(info.cons, textW, 11);
    c.fillStyle = C.good; D.chamfer(x + 12, yy - 7, 14, 14, 3); c.fill(); D.text('强', x + 19, yy, 10, '#06150c', 'center', true);
    D.text(pl[0] || '', x + 32, yy, 11, '#c9ffd6', 'left');
    if (pl[1]) D.text(pl[1], x + 32, yy + 13, 11, '#c9ffd6', 'left');
    var cy = yy + (pl[1] ? 29 : 18);
    if (!info.stat && pl[1] && cl[1]) cy -= 2;
    c.fillStyle = C.bad; D.chamfer(x + 12, cy - 7, 14, 14, 3); c.fill(); D.text('弱', x + 19, cy, 10, '#1a0508', 'center', true);
    D.text(cl[0] || '', x + 32, cy, 11, '#ffc9d1', 'left');
    if (cl[1] && cy + 13 < y + h - 4) D.text(cl[1], x + 32, cy + 13, 11, '#ffc9d1', 'left');
    // 价格与锁定
    UI.button('buy:' + i, x + w - 100, y + 10, 90, 44, '', { disabled: !afford, why: '金币不足，还差 ' + (sl.price - g.shardCount), draw: function (bx, by, bw, bh, pressed) {
      c.globalAlpha = afford ? 1 : 0.45;
      D.woodFrame(bx, by, bw, bh, { style: afford ? 'primary' : 'btn' });   // 买得起：亮一档的木板 + 选中黄铜边
      D.shardIcon(bx + 22, by + bh / 2, 7);
      D.text(String(sl.price), bx + 36, by + bh / 2 + 1, 18, afford ? D.UIC.parch : C.text, 'left', true);
      c.globalAlpha = 1;
    } });
    UI.button('lock:' + i, x + w - 100, y + 60, 44, 28, sl.locked ? '已锁' : '锁定', { style: sl.locked ? 'ad' : 'ghost', size: 11 });
    UI.button('ban:' + i, x + w - 54, y + 60, 44, 28, '禁用', { style: 'ghost', size: 11, disabled: g.bansLeft <= 0, why: '本局禁用次数用完了' });
  };

  // ================= 祝福三选一 =================
  UI.bless = function (g) {
    var c = D.ctx, o = g.blessOffers || [], cw = 260, gap = 24, x0 = (W - cw * 3 - gap * 2) / 2;
    D.drawBg(true);
    UI.dim(0.72);
    D.glowText('圣火的祝福', W / 2, 70, 34, C.gold, 'center', 16);
    D.text('三选一 · 立即生效，本局一直有效' + (g.blessPending > 1 ? ' · 还有 ' + (g.blessPending - 1) + ' 次' : '') + ' · 按 1–3 选择', W / 2, 106, 12, C.dim, 'center');
    for (var i = 0; i < o.length; i++) UI.button('bless:' + i, x0 + i * (cw + gap), 140, cw, 280, '', { draw: UI.blessCard(o[i], i) });
    // 已有的祝福
    var have = UI.fxText(g.bless || {});
    if (have.pros) {
      var hl = D.wrap('已有祝福：' + have.pros, W - 160, 11);
      for (var j = 0; j < Math.min(2, hl.length); j++) D.text(hl[j], W / 2, 452 + j * 16, 11, '#c9ffd6', 'center');
    }
  };
  UI.blessCard = function (id, i) {
    return function (x, y, w, h, pressed) {
      var c = D.ctx, b = RW.BLESSINGS[id], RQ = RW.RARITY[b.r];
      c.fillStyle = pressed ? 'rgba(60,46,30,0.98)' : 'rgba(26,20,16,0.97)'; D.chamfer(x, y, w, h, 12); c.fill();
      c.globalAlpha = 0.1 + b.r * 0.04; c.fillStyle = RQ.color; D.chamfer(x, y, w, h, 12); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = RQ.color; c.lineWidth = 2 + b.r * 0.5; D.chamfer(x + 1, y + 1, w - 2, h - 2, 12); c.stroke();
      // 圣火徽记
      var cx = x + w / 2, cy = y + 66, fl = 0.9 + 0.1 * Math.sin(UI.t * 5 + i);
      c.fillStyle = 'rgba(255,200,97,0.12)'; c.beginPath(); c.arc(cx, cy, 36, 0, TAU); c.fill();
      c.fillStyle = RQ.color; c.beginPath(); c.moveTo(cx, cy - 26 * fl); c.quadraticCurveTo(cx + 18, cy, cx, cy + 20); c.quadraticCurveTo(cx - 18, cy, cx, cy - 26 * fl); c.fill();
      c.fillStyle = '#fff4d6'; c.beginPath(); c.moveTo(cx, cy - 10 * fl); c.quadraticCurveTo(cx + 8, cy + 6, cx, cy + 16); c.quadraticCurveTo(cx - 8, cy + 6, cx, cy - 10 * fl); c.fill();
      D.text(b.name, cx, y + 122, 20, RQ.color, 'center', true);
      D.text(RQ.name, cx, y + 146, 11, C.dim, 'center', true);
      var t = UI.fxText(b.fx).pros.split('，');
      for (var k = 0; k < t.length; k++) D.text(t[k], cx, y + 178 + k * 22, 14, '#c9ffd6', 'center', true);
      D.text('按 ' + (i + 1), cx, y + h - 18, 11, C.faint, 'center');
    };
  };

  // ================= 复活 =================
  UI.revive = function (g, adLabel) {
    var cx = W / 2;
    UI.dim(0.78);
    UI.panel(cx - 220, 100, 440, 340, C.red);
    D.glowText('圣火熄灭', cx, 146, 34, C.red, 'center', 14);
    D.text(g.revivesLeft > 0 ? '余烬还暖，仍可再点一次。' : '余烬已冷', cx, 180, 13, C.text, 'center');
    var waveLeft = g.wt == null ? null : Math.max(0, Math.ceil(g.dur - g.wt));
    D.text('第 ' + g.wave + ' 波 · 还剩 ' + (waveLeft == null ? '—' : waveLeft) + ' 秒', cx, 198, 10, C.dim, 'center');
    var h = g.lastHits[g.lastHits.length - 1];
    if (h) D.text('最后一击：' + h.src, cx, 214, 12, '#ffb3c1', 'center', true);
    var left = g.revivesLeft, all = RW.REKINDLE.times;
    if (adLabel === null) {
      D.text('此版本不播放广告，圣火熄灭后直接结算。', cx, 250, 12, C.dim, 'center');
      UI.button('giveup', cx - 190, 300, 380, 52, '查看结算', { style: 'ghost', size: 14, sub: '今夜的守护到此为止' });
      return;
    }
    var cg = RW.Plat && RW.Plat.adProvider === 'crazygames';
    var adLeft = !cg || !RW.AdsCrazy || RW.AdsCrazy.allow('revive');
    if (cg) {
      // 会话里只给 1 次广告复活；其余次数用局内金币买，和「看广告」一样大。
      if (adLeft) UI.button('revive', cx - 190, 248, 380, 52, '重燃圣火', { style: 'ad', size: 16, sub: (adLabel ? adLabel + ' · ' : '') + '剩 ' + left + '/' + all + ' 次' });
      var rg = (RW.AD && RW.AD.REVIVE_GOLD) || 0;
      UI.button('goldRevive', cx - 190, adLeft ? 306 : 248, 380, adLeft ? 40 : 70, '金币重燃', { size: adLeft ? 14 : 18, sub: rg + ' 金币 · 剩 ' + left + '/' + all + ' 次', disabled: g.shardCount < rg, why: '金币不足' });
    } else {
      UI.button('revive', cx - 190, 244, 380, 70, '重燃圣火', { style: 'ad', size: 18, sub: (adLabel ? adLabel + ' · ' : '') + '剩 ' + left + '/' + all + ' 次 · 恢复半数火光' });
    }
    for (var ri = 0; ri < all; ri++) {   // 三簇小火苗：亮着的是还能用的重燃
      var fx2 = cx - (all - 1) * 14 + ri * 28, on = ri < left;
      D.ctx.fillStyle = on ? '#ffb347' : '#3a2a20'; D.ctx.beginPath(); D.ctx.moveTo(fx2, 226); D.ctx.quadraticCurveTo(fx2 + 8, 236, fx2, 242); D.ctx.quadraticCurveTo(fx2 - 8, 236, fx2, 226); D.ctx.fill();
    }
    if (!cg && adLabel === '预览发放') D.text('广告位未配置：本按钮直接发放奖励，不会播放广告', cx, 328, 10, C.dim, 'center');
    UI.button('giveup', cx - 190, 352, 380, 52, '查看结算', { style: 'ghost', size: 14, sub: '今夜的守护到此为止' });
  };

  // ================= 结算 =================
  UI.nightResult = function (g) {
    var r = g.result, i;
    D.drawBg(true);
    UI.dim(0.62);
    D.glowText(r.won ? '守住' : '熄灭', W / 2, 72, 40, r.won ? C.gold : '#ff6b81', 'center', 16);
    var rows = [
      ['结果', r.won ? '守住' : '熄灭'],
      ['用时', Math.max(0, Math.round(r.time)) + ' 秒'],
      ['击杀数', String(r.kills)],
      ['最高连击', String(r.bestCombo || 0)],
      ['超载次数', String(r.overloads || 0)],
      ['圣火剩余', (r.flame || 0) + ' / ' + (r.flameMax || 0)],
      ['星级', String(r.stars || 0)]
    ];
    UI.panel(W / 2 - 200, 100, 400, 268);
    for (i = 0; i < rows.length; i++) {
      var yy = 128 + i * 34;
      D.text(rows[i][0], W / 2 - 176, yy, 15, C.dim, 'left', true);
      D.text(rows[i][1], W / 2 + 176, yy, 16, i === 0 ? (r.won ? C.gold : '#ff6b81') : C.text, 'right', true);
    }
    var lock = g.nightLock > 0;
    UI.button('retry', W / 2 - 200, 388, 400, 52, '再来一夜', { style: 'primary', size: 18, disabled: lock, why: lock ? '请稍等' : '' });
    UI.button('home', W / 2 - 200, 450, 400, 40, '返回标题', { size: 14 });
  };
  UI.result = function (g) {
    if (g.result && g.result.night) { UI.nightResult(g); return; }
    var r = g.result, c = D.ctx, i;
    D.drawBg(true);
    UI.dim(0.6);
    var victory = r.won && !r.endless, head = r.daily ? '每日挑战 ' + r.daily : (victory ? '通关' : (r.endless ? '无尽模式' : '守护结束'));
    var setup = '危险 ' + (r.danger || 0) + (r.mutators && r.mutators.length ? ' · ' + r.mutators.map(function (m) { return RW.MUTATORS[m].name; }).join(' ') : '');
    D.text(head + (r.hero && RW.CLASSES[r.hero] ? ' · ' + RW.CLASSES[r.hero].name : '') + ' · ' + setup, W / 2, 30, 14, C.dim, 'center', true);
    if (victory) D.glowText('圣火长明', W / 2, 70, 40, C.gold, 'center', 22);
    else D.glowText((r.endless ? '长夜第 ' : '守到第 ') + r.wave + ' 波', W / 2, 70, 36, r.newBest ? C.gold : C.cyan, 'center', 16);
    var sub = '得分 ' + r.score + (r.newScore ? '（新纪录）' : '');
    if (victory) sub = '击败灭火者 · 20 波全部守住 · ' + sub;
    else if (r.coreDown) sub = '圣火熄灭了 · ' + sub;
    else if (r.newBest) sub = '新纪录 · ' + sub;
    D.text(sub, W / 2, 104, 13, victory || r.newScore ? C.gold : (r.coreDown ? C.red : C.dim), 'center', true);
    // 左栏：数据 + 输出构成
    var LX = 24, LW = 440;
    UI.panel(LX, 124, LW, 62);
    var st = [['击杀', String(r.kills), C.text], ['金币', String(r.shards), C.shard], ['位阶', r.stage, C.text], ['最高连杀', '×' + (r.streak || 0), C.gold]];
    for (i = 0; i < st.length; i++) {
      var sx = LX + 55 + i * 110;
      D.text(st[i][0], sx, 144, 11, C.dim, 'center'); D.text(st[i][1], sx, 166, 18, st[i][2], 'center', true);
    }
    var ach = r.achievements || [], rows = Math.max(1, Math.min(ach.length ? 6 : 10, r.list.length)), ph = 40 + rows * 26;
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
    if (ach.length) {   // 本局新成就
      var an = ach.map(function (id) { for (var q = 0; q < RW.ACHIEVEMENTS.length; q++) if (RW.ACHIEVEMENTS[q].id === id) return RW.ACHIEVEMENTS[q].name; return id; });
      var al = D.wrap(an.join('、'), LW - 28, 12), ay = 196 + ph + 10, ah = Math.min(H - 16 - ay, 36 + al.length * 17);
      c.fillStyle = 'rgba(40,32,14,0.95)'; D.chamfer(LX, ay, LW, ah, 10); c.fill();
      c.strokeStyle = C.gold; c.lineWidth = 1.5; D.chamfer(LX + 0.5, ay + 0.5, LW - 1, ah - 1, 10); c.stroke();
      D.text('新成就 ×' + ach.length, LX + 14, ay + 18, 13, C.gold, 'left', true);
      for (i = 0; i < al.length && ay + 40 + i * 17 < ay + ah - 6; i++) D.text(al[i], LX + 14, ay + 40 + i * 17, 12, '#ffe2a8', 'left', true);
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
    var adv = D.wrap(victory ? '提示：这个英雄解锁了下一级危险。继续无尽的话，敌人每波再硬 ' + Math.round(RW.RUN.endlessHp * 100) + '%。' : UI.adviceFor(r), RWd - 28, 12);
    for (i = 0; i < adv.length; i++) D.text(adv[i], RX + 14, 262 + i * 18, 12, C.dim, 'left');
    var un = r.unlocked || [];
    if (un.length) {   // 新解锁的英雄
      var uy = 320;
      c.fillStyle = 'rgba(60,44,12,0.95)'; D.chamfer(RX, uy, RWd, 64, 10); c.fill();
      c.strokeStyle = C.gold; c.lineWidth = 2; D.chamfer(RX + 1, uy + 1, RWd - 2, 62, 10); c.stroke();
      for (i = 0; i < Math.min(3, un.length); i++) UI.heroGlyph(un[i], RX + 36 + i * 44, uy + 32, 0.44);
      var names = un.map(function (id) { return RW.CLASSES[id].name; }).join('、'), tx = RX + 36 + Math.min(3, un.length) * 44 - 12;
      c.font = D.font(16, true);
      var unlockLine = '解锁新英雄：' + names;
      if (c.measureText(RW.I18n ? RW.I18n.tr(unlockLine) : unlockLine).width < RX + RWd - 12 - tx) D.glowText(unlockLine, tx, uy + 33, 16, C.gold, 'left', 8);
      else { D.glowText('解锁新英雄 ×' + un.length, tx, uy + 22, 15, C.gold, 'left', 8); D.text(names, tx, uy + 44, 12, '#ffe2a8', 'left', true); }
    }
    var same = (r.hero && RW.CLASSES[r.hero] ? RW.CLASSES[r.hero].name : '') + (r.daily ? ' · 今日挑战' : (r.danger ? ' · 危险 ' + r.danger : ''));
    if (r.canEndless) {
      UI.button('endless', RX, 396, RWd / 2 - 5, 52, '继续无尽', { style: 'ad', size: 17, sub: '从第 ' + (r.wave + 1) + ' 波接着打' });
      UI.button('retry', RX + RWd / 2 + 5, 396, RWd / 2 - 5, 52, '再守一夜', { style: 'primary', size: 16, sub: same });
    } else UI.button('retry', RX, 396, RWd, 52, '再守一夜', { style: 'primary', size: 18, sub: same });
    UI.button('again', RX, 456, RWd / 2 - 5, 38, '重新选择', { size: 13 });
    UI.button('home', RX + RWd / 2 + 5, 456, RWd / 2 - 5, 38, '返回标题', { size: 13 });
    if (RW.Plat && RW.Plat.adProvider === 'crazygames' && r.shards > 0) {
      if (r.doubled) D.text('本局金币已翻倍', RX + RWd / 2, 516, 12, C.gold, 'center', true);
      else {
        var allowD = !RW.AdsCrazy || RW.AdsCrazy.allow('double');
        var dc = g.doubleCost(), bank = (g.prog && g.prog.coins) || 0;
        UI.button('doubleAd', RX, 498, RWd / 2 - 5, 36, '看广告翻倍', { style: 'ad', size: 13, disabled: !allowD, why: '每局一次' });
        UI.button('doubleGold', RX + RWd / 2 + 5, 498, RWd / 2 - 5, 36, '金币翻倍', { size: 13, sub: dc + ' 金币', disabled: bank < dc, why: '金币不足' });
      }
    } else D.text('Enter 同设置再来' + (r.canEndless ? ' · C 继续无尽' : ''), RX + RWd / 2, 508, 10, C.faint, 'center');
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

  // ================= 成就与纪录 =================
  UI.records = function (g) {
    var c = D.ctx, pr = g.prog || {}, got = pr.ach || {}, i;
    D.drawBg(true);
    UI.dim(0.72);
    D.text('火光纪录', 24, 36, 24, C.text, 'left', true, 3);
    D.text('成就 ' + RW.countKeys(got) + ' / ' + RW.ACHIEVEMENTS.length + ' · 以后上架时与 Steam 成就一一对应', 24, 60, 11, C.dim, 'left', false, 3);
    // 左栏：累计数据 + 各英雄
    UI.panel(24, 74, 300, 404);
    var rec = [['局数', pr.runs || 0], ['通关', pr.wins || 0], ['最高分', pr.bestScore || 0], ['累计击杀', pr.kills || 0], ['累计金币', pr.coins || 0], ['无尽最高', pr.endlessBest ? '第 ' + pr.endlessBest + ' 波' : '—']];
    for (i = 0; i < rec.length; i++) {
      var rx = 40 + (i % 3) * 94, ry = 96 + ((i / 3) | 0) * 44;
      D.text(rec[i][0], rx, ry, 10, C.dim, 'left');
      D.text(String(rec[i][1]), rx, ry + 19, 15, C.gold, 'left', true);
    }
    D.text('英雄 · 最高波数 · 已通关危险', 40, 196, 11, C.dim, 'left');
    for (i = 0; i < RW.CLASS_ORDER.length; i++) {
      var id = RW.CLASS_ORDER[i], d = RW.CLASSES[id], ok = RW.isUnlocked(id, pr), yy = 218 + i * 25;
      var hb = pr.heroBest && pr.heroBest[id], hd = pr.heroDanger ? pr.heroDanger[id] : undefined;
      D.text(d.name, 40, yy, 12, ok ? d.color : C.faint, 'left', true);
      D.text(ok ? (hb ? '第 ' + hb + ' 波' : '—') : '未解锁', 130, yy, 11, ok ? C.text : C.faint, 'left');
      for (var k = 0; k < RW.DANGER.length; k++) {
        c.fillStyle = hd != null && k <= hd ? (k >= 4 ? C.red : C.gold) : '#2a2016';
        D.chamfer(214 + k * 16, yy - 6, 12, 12, 3); c.fill();
      }
    }
    UI.button('recTab', W - 184, 24, 160, 32, UI.recTab === 'history' ? '看成就' : '最近几局', { size: 12 });
    if (UI.recTab === 'history') { UI.historyList(pr); UI.button('home', 24, 488, 160, 40, '返回', { style: 'ghost', size: 14 }); return; }
    // 右栏：成就两列
    var half = Math.ceil(RW.ACHIEVEMENTS.length / 2), cw = (W - 364) / 2;
    for (i = 0; i < RW.ACHIEVEMENTS.length; i++) {
      var a = RW.ACHIEVEMENTS[i], on = !!got[a.id], col = (i / half) | 0, ax = 344 + col * cw, ay = 84 + (i % half) * 20;
      c.fillStyle = on ? C.gold : 'rgba(0,0,0,0)'; c.strokeStyle = on ? C.gold : '#5a4630'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(ax + 6, ay, 5, 0, TAU); c.fill(); c.stroke();
      D.text(a.name, ax + 18, ay, 11, on ? '#ffe2a8' : C.dim, 'left', true);
      D.text(a.desc, ax + 96, ay, 10, on ? C.text : C.faint, 'left');
    }
    UI.button('home', 24, 488, 160, 40, '返回', { style: 'ghost', size: 14 });
  };

  // ================= 圣火形态（升到 3 级时三选一） =================
  UI.formPanel = function (g) {
    UI.btns.length = 0;
    UI.dim(0.82);
    var cw = 270, gap = 20, x0 = (W - cw * 3 - gap * 2) / 2, cost = g.coreUpgradeCost();
    D.glowText('圣火形态', W / 2, 70, 32, C.gold, 'center', 14);
    D.text('升到 ' + RW.CORE_FORM_AT + ' 级时选一种，本局不能再改 · 花费 ' + cost + ' 金币', W / 2, 104, 12, C.dim, 'center');
    for (var i = 0; i < RW.CORE_FORM_ORDER.length; i++) {
      (function (id, i) {
        var F = RW.CORE_FORMS[id];
        UI.button('coreForm:' + id, x0 + i * (cw + gap), 130, cw, 290, '', { disabled: g.shardCount < cost, why: '金币不足，需要 ' + cost, draw: function (x, y, w, h, pressed) {
          var c = D.ctx;
          c.fillStyle = pressed ? 'rgba(60,46,30,0.98)' : 'rgba(26,20,16,0.97)'; D.chamfer(x, y, w, h, 12); c.fill();
          c.strokeStyle = F.color; c.lineWidth = 2.5; D.chamfer(x + 1, y + 1, w - 2, h - 2, 12); c.stroke();
          var cx = x + w / 2, cy = y + 80, fl = 0.9 + 0.1 * Math.sin(UI.t * 5 + i);
          c.fillStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.arc(cx, cy, 44, 0, TAU); c.fill();
          c.fillStyle = F.color; c.beginPath(); c.moveTo(cx, cy - 34 * fl); c.quadraticCurveTo(cx + 22, cy, cx, cy + 26); c.quadraticCurveTo(cx - 22, cy, cx, cy - 34 * fl); c.fill();
          D.text(F.name, cx, y + 150, 20, F.color, 'center', true);
          var nl = D.wrap(F.note, w - 40, 13);
          for (var k = 0; k < nl.length; k++) D.text(nl[k], cx, y + 184 + k * 20, 13, C.text, 'center');
          // 进阶预告：6 级二阶、9 级三阶
          for (var ti = 1; F.tiers && ti < F.tiers.length; ti++) D.text(RW.SANCTUARY.formTierAt[ti + 1] + ' 级 ' + ['', 'II', 'III'][ti] + '：' + F.tiers[ti].note, cx, y + 236 + (ti - 1) * 16, 11, '#ffd27a', 'center');
          D.text('按 ' + (i + 1), cx, y + h - 18, 11, C.faint, 'center');
        } });
      })(RW.CORE_FORM_ORDER[i], i);
    }
    UI.button('formClose', W / 2 - 80, 440, 160, 40, '稍后', { style: 'ghost', size: 14 });
  };

  // ================= 设置 =================
  UI.optText = function (st, v) {
    if (st.opts) return st.opts[v];
    return st.pct ? Math.round(v * 100) + '%' : String(v);
  };
  UI.settingsPanel = function () {
    UI.btns.length = 0;   // 设置页盖在最上层，下面的按钮不响应
    UI.dim(0.8);
    var x0 = 30, w = W - 60, i, half = Math.ceil(RW.SETTINGS.length / 2), cw = (w - 40) / 2;
    UI.panel(x0, 16, w, H - 32, C.gold);
    D.text('设置', W / 2, 42, 20, C.text, 'center', true);
    // 两列：每行 名字（+ 说明）· − 数值 +
    for (i = 0; i < RW.SETTINGS.length; i++) {
      var st = RW.SETTINGS[i], v = RW.opt[st.id], col = (i / half) | 0, x = x0 + 20 + col * (cw + 20 - 10), y = 66 + (i % half) * 52;
      D.text(st.name, x + 8, st.note ? y + 9 : y + 15, 13, C.text, 'left', true);
      if (st.note) D.text(st.note, x + 8, y + 27, 9, C.dim, 'left');
      var lo = st.opts ? v <= 0 : v <= st.min + 1e-6, hi = st.opts ? v >= st.opts.length - 1 : v >= st.max - 1e-6;
      UI.button('set:' + st.id + ':-1', x + cw - 152, y, 34, 30, '−', { size: 16, disabled: lo });
      D.text(UI.optText(st, v), x + cw - 78, y + 15, 12, C.gold, 'center', true);
      UI.button('set:' + st.id + ':1', x + cw - 38, y, 34, 30, '+', { size: 16, disabled: hi });
    }
    var by = H - 70;
    UI.button('keys', x0 + 20, by, 150, 38, '按键设置', { size: 13 });
    UI.button('optReset', x0 + 180, by, 130, 38, '恢复默认', { size: 13, style: 'ghost' });
    if (root.desktop) UI.button('fullscreen', x0 + 320, by, 170, 38, '切换全屏', { size: 12, sub: 'F11' });
    UI.button('settingsClose', x0 + w - 170, by, 150, 38, '完成', { style: 'primary', size: 15 });
  };
  // 改键：两列列出可改的操作；点「改键」后按下新键（Esc 取消）
  UI.keysPanel = function () {
    UI.btns.length = 0;
    UI.dim(0.85);
    var x0 = 30, w = W - 60, A = RW.KEY_ACTIONS, half = Math.ceil(A.length / 2), cw = (w - 40) / 2;
    UI.panel(x0, 16, w, H - 32, C.gold);
    D.text('按键设置', W / 2, 42, 20, C.text, 'center', true);
    D.text(UI.keyWait ? '请按下新的按键（Esc 取消）' : '点「改键」再按下新键；和别的操作冲突时会互换。数字 1–4 造塔、Esc 暂停固定不变', W / 2, 66, 11, UI.keyWait ? C.gold : C.dim, 'center');
    for (var i = 0; i < A.length; i++) {
      var id = A[i][0], col = (i / half) | 0, x = x0 + 20 + col * (cw + 10), y = 86 + (i % half) * 50, wait = UI.keyWait === id;
      D.text(A[i][1], x + 8, y + 15, 13, C.text, 'left', true);
      var ks = RW.keys[id].map(RW.keyName).join(' / ');
      D.text(ks, x + 130, y + 15, 12, wait ? C.gold : C.shard, 'left', true);
      UI.button('keyset:' + id, x + cw - 100, y, 90, 30, wait ? '按新键…' : '改键', { size: 12, style: wait ? 'ad' : 'normal' });
    }
    var by = H - 70;
    UI.button('keysReset', x0 + 20, by, 150, 38, '恢复默认', { size: 13, style: 'ghost' });
    UI.button('keysClose', x0 + w - 170, by, 150, 38, '完成', { style: 'primary', size: 15 });
  };
  // 整备页「属性说明」：每个属性一句话，现在的数值写在前面
  UI.statsPanel = function (g) {
    UI.btns.length = 0;
    UI.dim(0.85);
    UI.panel(24, 20, W - 48, H - 40, C.gold);
    D.text('属性说明', W / 2, 46, 18, C.text, 'center', true);
    var keys = Object.keys(RW.STAT_DESC), half = Math.ceil(keys.length / 2), cw = (W - 96) / 2, s = g.st || {};
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i], st = RW.STATS[k], col = (i / half) | 0, x = 48 + col * cw, y = 76 + (i % half) * 24, v = s[k];
      var vt = v == null ? '' : (st.pct ? (k === 'crit' || k === 'dodge' || k === 'lifesteal' || k === 'luck' || k === 'interest' ? Math.round(v * 100) + '%' : '×' + (Math.round(v * 100) / 100)) : String(Math.round(v * 10) / 10));
      D.text(st.label, x, y, 12, C.gold, 'left', true);
      D.text(vt, x + 96, y, 11, C.text, 'right', true);
      D.text(RW.STAT_DESC[k], x + 106, y, 10, C.dim, 'left');
    }
    UI.button('statsClose', W / 2 - 80, H - 62, 160, 36, '知道了', { style: 'primary', size: 14 });
  };

  UI.historyList = function (pr) {
    var list = pr.history || [], x = 344;
    D.text('最近 ' + list.length + ' 局', x, 84, 13, C.text, 'left', true);
    if (!list.length) { D.text('还没有打完的局', x, 116, 12, C.dim, 'left'); return; }
    for (var i = 0; i < list.length; i++) {
      var h = list[i], y = 116 + i * 30, hc = RW.CLASSES[h.hero] || {}, mp = RW.MAPS[h.map] || {};
      D.text(h.won ? (h.endless ? '通关 · 无尽' : '通关') : '失败', x, y, 12, h.won ? C.gold : C.dim, 'left', true);
      D.text((hc.name || '') + ' · ' + (mp.name || '') + (h.daily ? ' · 每日' : '') + (h.danger ? ' · 危险 ' + h.danger : ''), x + 90, y, 12, hc.color || C.text, 'left', true);
      D.text('第 ' + h.wave + ' 波', x + 400, y, 12, C.text, 'left');
      D.text(h.score + ' 分', W - 40, y, 12, C.gold, 'right', true);
    }
  };

  // ================= 暂停 =================
  UI.pause = function (g, muted) {
    UI.dim(0.75);
    var cx = W / 2;
    UI.panel(cx - 170, 70, 340, 366, C.cyan);
    D.text('暂停', cx, 104, 26, C.text, 'center', true);
    D.text('火光在这里等你。第 ' + g.wave + ' 波 · Esc 继续', cx, 132, 12, C.dim, 'center');
    UI.button('resume', cx - 140, 150, 280, 48, '继续', { style: 'primary', size: 18 });
    UI.button('mute', cx - 140, 208, 136, 38, muted ? '声音：关' : '声音：开', { size: 13 });
    UI.button('music', cx + 4, 208, 136, 38, UI.musicOff ? '音乐：关' : '音乐：开', { size: 13 });
    UI.button('settings', cx - 140, 254, 136, 38, '设置', { size: 13 });
    UI.button('retry', cx + 4, 254, 136, 38, '重新守护', { size: 13 });
    UI.button('toTitle', cx - 140, 300, 280, 44, '回到标题', { size: 14, sub: UI.runInfo ? '已存至第 ' + UI.runInfo.wave + ' 波前' : '尚未整备，本局不保存' });
    UI.button('quit', cx - 140, 354, 280, 44, '结束守护', { style: 'danger', size: 14, sub: '立即查看结算' });
    D.text('重新守护 / 结束守护都会记一局', cx, 416, 10, C.faint, 'center');
  };

  RW.UI = UI;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
