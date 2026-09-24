// 环带值守 · 可替换的程序化 UI 图标图集
(function (root) {
  var RW = root.RW || (root.RW = {});
  var ICONS = {};

  function add(ids, shape, color, accent) {
    var list = ids.split(' '), i;
    for (i = 0; i < list.length; i++) ICONS[list[i]] = { shape: shape, color: color, accent: accent || '#fff0c2' };
  }

  // 武器 / 技能：轮廓表达攻击方式；色相与战斗特效一致。
  add('needle', 'bolt', '#ffe08a', '#fff4c6');
  add('scatter', 'fan', '#ff9a3c', '#ffe1ad');
  add('blades', 'crossblade', '#bff5ff', '#e8fdff');
  add('lance', 'spear', '#b58cff', '#efe1ff');
  add('arc', 'chain', '#8fc2ff', '#e2f4ff');
  add('mines', 'rune', '#ff7a4a', '#ffdda8');
  add('nova', 'burst', '#ff9a3c', '#fff0b0');
  add('veil', 'stormcloud', '#a8d4ff', '#effbff');
  add('well', 'vortex', '#c07bff', '#f1d6ff');
  add('storm', 'arrowrain', '#ffd166', '#fff2c2');

  // 八种建筑：每种采用独立外形，战斗菜单与商店科技共用。
  add('sentry', 'watchtower', '#ffd27a', '#fff0c2');
  add('pylon', 'crystal', '#8fe3ff', '#e7fcff');
  add('siphon', 'funnel', '#ffe066', '#fff3ad');
  add('barracks', 'barracks', '#ff8f6b', '#ffe0bb');
  add('mortar', 'mortar', '#ff735f', '#ffe5b7');
  add('ward', 'shield', '#78dfb3', '#e6ffe7');
  add('snare', 'snare', '#dc8cff', '#f8e0ff');
  add('beacon', 'beacon', '#ffc65c', '#fff2bd');

  // 三十四件装备 / 改造：ID 固定，方便整体替换造型而不改业务页面。
  add('fins', 'glove', '#9ce8ff');
  add('lens', 'lens', '#b6dcff');
  add('hull', 'boot', '#8fe3ff');
  add('nano', 'charm', '#93f0bd');
  add('magnet', 'magnet', '#f5d46a');
  add('whet', 'whetstone', '#d7dce6');
  add('bracer', 'bracer', '#c6a97a');
  add('apple', 'apple', '#ff7a68');
  add('feather', 'feather', '#c7edff');
  add('purse', 'purse', '#ffd06b');
  add('herb', 'herb', '#8ee08c');
  add('coil', 'potion', '#ff816e');
  add('sight', 'eye', '#f29cff');
  add('plate', 'armor', '#aabbd5');
  add('greed', 'ring', '#ffd166');
  add('overclock', 'hourglass', '#a9c9ff');
  add('bounty', 'bounty', '#ffd27a');
  add('fang', 'fang', '#ff9ca6');
  add('cloak', 'cloak', '#bca4ee');
  add('maul', 'hammer', '#d9b28a');
  add('blueprint', 'blueprint', '#93d9ff');
  add('powder', 'powder', '#ffa266');
  add('thornmail', 'thornmail', '#83d19d');
  add('piggy', 'piggy', '#ffa6b8');
  add('prism', 'prism', '#a7f2ff');
  add('contract', 'contract', '#b9a1e8');
  add('clover', 'clover', '#8de59c');
  add('holy', 'chalice', '#fff0a8');
  add('drum', 'drum', '#ff9b77');
  add('ember', 'ember', '#ffbd61');
  add('heart', 'heart', '#ff7188');
  add('crown', 'crown', '#ffe070');
  add('belt', 'belt', '#c89a70');
  add('trident', 'trident', '#80e5ed');

  // 页面动作与状态：在选角、按钮、HUD、奖励和结算中复用。
  add('ui-start', 'flame', '#ffc65c');
  add('ui-hero', 'helm', '#ffbd76');
  add('ui-howto', 'book', '#8ed8ff');
  add('ui-sound', 'sound', '#9ce8ff');
  add('ui-music', 'harp', '#ffcf78');
  add('ui-exit', 'door', '#a5adbb');
  add('ui-back', 'back', '#c7c9d2');
  add('ui-pause', 'pause', '#ffe3ad');
  add('ui-resume', 'play', '#a9f0bc');
  add('ui-build', 'hammer', '#ffd27a');
  add('ui-dash', 'wing', '#82eaff');
  add('ui-repair', 'wrench', '#ffcd7c');
  add('ui-armor', 'shield', '#a8d5ff');
  add('ui-reroll', 'reroll', '#c1a4ff');
  add('ui-next', 'gate', '#ffd27a');
  add('ui-revive', 'heart', '#ff8191');
  add('ui-giveup', 'flag', '#c3c0b9');
  add('ui-retry', 'retry', '#9fe6c2');
  add('ui-home', 'home', '#ffd27a');
  add('ui-lock', 'lock', '#cfb98f');
  add('ui-record', 'medal', '#f1cd72');
  add('ui-kill', 'skull', '#ff98a0');
  add('ui-wave', 'wave', '#90dbff');
  add('ui-shard', 'shard', '#80edff');
  add('ui-core', 'core', '#ffd27a');
  add('ui-health', 'heart', '#ff8191');
  add('ui-evolution', 'star', '#c6a4ff');
  add('ui-courtyard', 'courtyard', '#e3c47e');

  function path(c, pts, fill, stroke, width) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width || 2; c.stroke(); }
  }
  function line(c, pts, color, width) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.strokeStyle = color; c.lineWidth = width || 2; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }
  function circle(c, x, y, r, fill, stroke, width) {
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width || 2; c.stroke(); }
  }
  function star(c, x, y, r, n, fill, stroke) {
    var pts = [], i, a;
    for (i = 0; i < n * 2; i++) { a = -Math.PI / 2 + i * Math.PI / n; pts.push([x + Math.cos(a) * (i % 2 ? r * 0.42 : r), y + Math.sin(a) * (i % 2 ? r * 0.42 : r)]); }
    path(c, pts, fill, stroke, 1.8);
  }
  function rr(c, x, y, w, h, r, fill, stroke, width) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width || 2; c.stroke(); }
  }
  function paintShape(c, s, a, b) {
    var TAU = Math.PI * 2;
    c.lineCap = 'round'; c.lineJoin = 'round';
    switch (s) {
      case 'bolt': line(c, [[-13, 8], [-3, -2], [1, 4], [13, -10]], a, 4); path(c, [[13,-10],[9,-2],[5,-6]], b); circle(c,-13,8,2,b); break;
      case 'fan': path(c, [[-12,-10],[12,-10],[8,1],[13,9],[0,4],[-13,9],[-8,1]], null,a,2.5); circle(c,-6,0,2,a); circle(c,0,-2,2,a); circle(c,6,0,2,a); break;
      case 'crossblade': line(c,[[-12,-10],[12,10]],b,3); line(c,[[12,-10],[-12,10]],a,3); path(c,[[-15,-13],[-7,-11],[-11,-5]],a); path(c,[[15,-13],[7,-11],[11,-5]],b); rr(c,-2,-2,4,4,1,a); break;
      case 'spear': line(c,[[-10,13],[8,-9]],a,3); path(c,[[8,-13],[15,-12],[12,-4],[7,-7]],b); line(c,[[-14,7],[-7,14]],b,2); break;
      case 'chain': line(c,[[-13,-7],[-5,1],[0,-7],[7,2],[13,-7]],a,2.7); circle(c,-13,-7,2,b); circle(c,0,-7,2,b); circle(c,13,-7,2,b); line(c,[[-5,1],[0,8],[7,2]],b,2); break;
      case 'rune': circle(c,0,0,12,null,a,2); path(c,[[0,-12],[10,7],[-10,7]],null,b,2); star(c,0,0,5,4,a); break;
      case 'burst': star(c,0,0,15,8,a,b); circle(c,0,0,4,b); break;
      case 'stormcloud': circle(c,-7,-2,6,a); circle(c,0,-6,8,a); circle(c,8,-1,6,a); rr(c,-12,-3,24,9,4,a); line(c,[[-6,5],[-9,12]],b,2.5); line(c,[[3,5],[0,13]],b,2.5); line(c,[[11,5],[8,11]],b,2.5); break;
      case 'vortex': c.beginPath(); c.arc(0,0,13,0.3,TAU*1.8); c.strokeStyle=a; c.lineWidth=3; c.stroke(); c.beginPath(); c.arc(0,0,7,0.2,TAU*1.55); c.strokeStyle=b; c.lineWidth=2.5; c.stroke(); circle(c,0,0,2,a); break;
      case 'arrowrain': line(c,[[-10,-8],[-10,7]],a,2.5); path(c,[[-14,3],[-10,10],[-6,3]],b); line(c,[[0,-13],[0,2]],b,2.5); path(c,[[-4,-2],[0,5],[4,-2]],a); line(c,[[10,-6],[10,9]],a,2.5); path(c,[[6,5],[10,12],[14,5]],b); break;
      case 'watchtower': path(c,[[-11,12],[-9,-3],[9,-3],[11,12]],null,a,2.5); rr(c,-13,-12,26,7,1,a); line(c,[[-8,-2],[-8,11]],b,2); line(c,[[8,-2],[8,11]],b,2); circle(c,0,-8,2,b); break;
      case 'crystal': path(c,[[0,-15],[10,-5],[7,11],[0,15],[-7,11],[-10,-5]],a,b,2); line(c,[[0,-15],[0,15]],b,1.5); line(c,[[-10,-5],[0,-1],[10,-5]],b,1.5); break;
      case 'funnel': path(c,[[-13,-12],[13,-12],[6,-2],[3,4],[3,13],[-3,13],[-3,4],[-6,-2]],null,a,2.6); circle(c,0,8,2,b); break;
      case 'barracks': path(c,[[-14,11],[-14,-3],[0,-13],[14,-3],[14,11]],null,a,2.5); path(c,[[-4,11],[-4,1],[4,1],[4,11]],b); rr(c,-10,-1,4,5,1,a); rr(c,6,-1,4,5,1,a); break;
      case 'mortar': rr(c,-12,2,24,10,3,null,a,2.4); line(c,[[-4,3],[5,-9]],b,5); circle(c,8,-11,4,a,b,1.5); circle(c,-7,14,2,a); circle(c,7,14,2,a); break;
      case 'shield': path(c,[[0,-14],[12,-9],[10,4],[0,14],[-10,4],[-12,-9]],null,a,2.7); path(c,[[0,-8],[5,-5],[4,2],[0,7],[-4,2],[-5,-5]],b); break;
      case 'snare': line(c,[[-13,-10],[13,10]],a,2); line(c,[[13,-10],[-13,10]],a,2); path(c,[[-12,-13],[-5,-11],[-10,-5]],b); path(c,[[12,13],[5,11],[10,5]],b); circle(c,0,0,4,null,b,2); break;
      case 'beacon': path(c,[[-8,12],[-5,0],[0,-5],[5,0],[8,12]],null,a,2); star(c,0,-9,8,4,b); line(c,[[-12,-14],[-7,-16]],a,1.6); line(c,[[12,-14],[7,-16]],a,1.6); break;
      case 'glove': path(c,[[-11,-1],[-9,-9],[-5,-8],[-4,-14],[0,-14],[1,-7],[5,-12],[8,-10],[7,-5],[12,-7],[14,-3],[8,10],[0,14],[-10,9]],a,b,1.6); line(c,[[-8,1],[5,3]],b,1.6); break;
      case 'lens': circle(c,-2,0,10,null,a,3); line(c,[[5,7],[13,14]],b,4); circle(c,-2,0,4,'rgba(220,245,255,.45)',b,1); break;
      case 'boot': path(c,[[-8,-13],[6,-13],[6,2],[13,8],[11,13],[-12,13],[-14,8],[-8,4]],a,b,1.8); line(c,[[-7,5],[5,5]],b,1.6); break;
      case 'charm': circle(c,0,0,10,null,a,2.5); star(c,0,0,7,5,b); line(c,[[-8,-10],[-13,-14]],a,2); line(c,[[8,-10],[13,-14]],a,2); break;
      case 'magnet': c.beginPath(); c.arc(0,-1,11,Math.PI,0); c.lineTo(11,8); c.lineTo(6,8); c.lineTo(6,0); c.arc(0,0,6,0,Math.PI,true); c.lineTo(-6,8); c.lineTo(-11,8); c.closePath(); c.strokeStyle=a; c.lineWidth=3; c.stroke(); rr(c,-12,6,7,5,1,b); rr(c,5,6,7,5,1,b); break;
      case 'whetstone': path(c,[[-12,6],[-7,-10],[7,-10],[12,6],[8,11],[-8,11]],a,b,2); line(c,[[-5,-5],[5,-5]],b,2); break;
      case 'bracer': path(c,[[-10,-12],[10,-12],[8,11],[0,14],[-8,11]],a,b,2); line(c,[[-8,-4],[8,-4]],b,2); line(c,[[-7,3],[7,3]],b,2); break;
      case 'apple': circle(c,0,2,10,a,b,1.5); path(c,[[-1,-8],[0,-14],[5,-15]],null,b,2); path(c,[[1,-11],[8,-13],[7,-7]],'#8be58f'); break;
      case 'feather': path(c,[[-11,12],[-4,-8],[8,-14],[12,-8],[3,6]],a,b,1.5); line(c,[[-10,13],[7,-10]],b,1.4); line(c,[[-2,3],[-8,2]],b,1.2); line(c,[[2,-2],[-3,-3]],b,1.2); break;
      case 'purse': path(c,[[-11,-3],[-8,-10],[8,-10],[11,-3],[9,12],[-9,12]],a,b,1.7); rr(c,-4,-5,8,7,2,b); circle(c,0,3,3,null,b,1.5); break;
      case 'herb': line(c,[[0,13],[0,-3]],b,2); path(c,[[-1,2],[-12,-1],[-9,-9],[-2,-7]],a); path(c,[[1,0],[11,-4],[9,-12],[2,-9]],b); circle(c,0,-9,3,'#f4ffb8'); break;
      case 'potion': rr(c,-8,-5,16,18,4,a,b,1.7); rr(c,-4,-13,8,8,2,b); rr(c,-5,3,10,5,2,'rgba(255,255,255,.35)'); break;
      case 'eye': c.beginPath(); c.moveTo(-14,0); c.quadraticCurveTo(0,-14,14,0); c.quadraticCurveTo(0,14,-14,0); c.closePath(); c.fillStyle='rgba(242,156,255,.22)'; c.fill(); c.strokeStyle=a; c.lineWidth=2; c.stroke(); circle(c,0,0,5,b); circle(c,0,0,2,'#241a32'); break;
      case 'armor': path(c,[[0,-14],[12,-9],[10,5],[0,14],[-10,5],[-12,-9]],a,b,1.8); line(c,[[0,-10],[0,10]],b,1.3); line(c,[[-8,-6],[8,-6]],b,1.3); break;
      case 'ring': circle(c,0,3,9,null,a,4); path(c,[[0,-11],[5,-5],[0,0],[-5,-5]],b); star(c,0,-6,3,4,a); break;
      case 'hourglass': path(c,[[-10,-13],[10,-13],[3,-3],[-3,3],[10,13],[-10,13],[-3,3],[3,-3]],null,a,2.4); path(c,[[-4,-9],[4,-9],[0,-3]],b); path(c,[[-4,9],[4,9],[0,3]],b); break;
      case 'bounty': rr(c,-10,-13,20,26,2,'#e4c88e',a,1.7); line(c,[[-5,-5],[5,-5]],'#684e2d',1.4); line(c,[[-5,0],[5,0]],'#684e2d',1.4); star(c,0,6,4,5,a); break;
      case 'fang': path(c,[[-10,-12],[0,-5],[10,-12],[7,6],[0,14],[-7,6]],null,a,2); path(c,[[-5,-4],[0,10],[5,-4]],b); break;
      case 'cloak': path(c,[[-9,-12],[9,-12],[13,12],[0,7],[-13,12]],a,b,1.8); circle(c,0,-9,3,b); line(c,[[0,-4],[0,5]],b,1.4); break;
      case 'hammer': line(c,[[-4,12],[5,-5]],b,4); path(c,[[-11,-12],[5,-12],[12,-6],[7,-1],[-9,-4]],a,b,1.7); break;
      case 'blueprint': rr(c,-12,-13,24,26,1,'rgba(45,132,185,.22)',a,1.5); line(c,[[-8,7],[-8,-4],[0,-10],[8,-4],[8,7]],b,1.8); line(c,[[-10,10],[10,10]],b,1.6); circle(c,0,0,2,a); break;
      case 'powder': rr(c,-10,-7,20,19,3,a,b,1.5); rr(c,-6,-12,12,6,1,b); star(c,0,1,5,6,'#fff0c0'); break;
      case 'thornmail': path(c,[[0,-14],[12,-9],[10,4],[0,14],[-10,4],[-12,-9]],'#254d3a',a,1.8); path(c,[[-12,-4],[-5,-5],[-8,-12]],b); path(c,[[12,1],[5,0],[10,8]],b); path(c,[[-7,8],[-5,2],[-12,3]],b); break;
      case 'piggy': c.beginPath(); c.ellipse(0,1,12,9,0,0,TAU); c.fillStyle=a; c.fill(); c.strokeStyle=b; c.lineWidth=1.5; c.stroke(); circle(c,11,-2,4,a,b,1.3); circle(c,-4,-10,4,a,b,1.3); circle(c,5,-10,4,a,b,1.3); rr(c,-7,8,4,5,1,b); rr(c,4,8,4,5,1,b); line(c,[[-3,-6],[3,-6]],b,1.5); circle(c,8,-3,0.9,'#291927'); break;
      case 'prism': path(c,[[0,-14],[12,0],[0,14],[-12,0]],a,b,1.8); path(c,[[0,-14],[0,14],[-12,0]],'rgba(255,255,255,.35)'); line(c,[[-12,0],[12,0]],b,1); break;
      case 'contract': rr(c,-10,-13,20,26,2,'#30253d',a,1.6); path(c,[[0,-7],[2,-2],[8,-2],[3,2],[5,8],[0,4],[-5,8],[-3,2],[-8,-2],[-2,-2]],b); break;
      case 'clover': circle(c,-5,-4,5,a); circle(c,5,-4,5,a); circle(c,-5,5,5,a); circle(c,5,5,5,a); line(c,[[0,2],[3,14]],b,2.5); break;
      case 'chalice': path(c,[[-11,-12],[-6,-1],[0,3],[6,-1],[11,-12]],null,a,2.4); line(c,[[0,3],[0,10],[-7,10]],b,2); line(c,[[-8,13],[8,13]],a,2.5); circle(c,0,-3,2,b); break;
      case 'drum': rr(c,-11,-9,22,19,5,a,b,1.8); c.beginPath(); c.ellipse(0,-9,11,4,0,0,TAU); c.strokeStyle=b; c.lineWidth=2; c.stroke(); line(c,[[-7,-4],[-7,6]],b,1.4); line(c,[[7,-4],[7,6]],b,1.4); line(c,[[-10,-14],[10,14]],'#f9dfb1',2); break;
      case 'ember': path(c,[[0,-15],[10,-3],[8,6],[0,13],[-8,6],[-10,-3]],a,b,1.6); path(c,[[0,8],[-4,2],[0,-5],[5,2],[3,7]],'#fff2bf'); break;
      case 'heart': path(c,[[0,13],[-12,2],[-12,-5],[-8,-11],[-2,-11],[0,-6],[2,-11],[8,-11],[12,-5],[12,2]],a,b,1.5); line(c,[[-6,-2],[-2,-2],[0,3],[3,-5],[6,-1]],'#fff0d0',1.5); break;
      case 'crown': path(c,[[-13,-8],[-7,-2],[-3,-11],[2,-2],[10,-12],[9,8],[-9,8]],a,b,1.8); line(c,[[-8,11],[8,11]],b,2); circle(c,-13,-8,2,b); circle(c,10,-12,2,b); break;
      case 'belt': rr(c,-14,-6,28,12,4,a,b,1.5); rr(c,-5,-10,10,20,2,null,b,2); circle(c,0,0,2,b); break;
      case 'trident': line(c,[[0,13],[0,-6]],a,3); line(c,[[-8,-13],[-8,-7],[0,-3],[8,-7],[8,-13]],b,2.5); path(c,[[-12,-13],[-8,-7],[-4,-13]],a); path(c,[[4,-13],[8,-7],[12,-13]],a); circle(c,0,-13,2,b); break;
      case 'flame': path(c,[[0,14],[-8,7],[-7,0],[-2,-5],[-3,-12],[3,-8],[8,-2],[9,6]],a,b,1.5); path(c,[[0,9],[-3,5],[0,-1],[4,5],[3,9]],'#fff3bb'); break;
      case 'helm': path(c,[[-12,2],[-11,-6],[-7,-12],[0,-14],[7,-12],[11,-6],[12,2],[6,2],[6,-3],[-6,-3],[-6,2]],a,b,1.4); rr(c,-9,2,18,6,2,b); break;
      case 'book': rr(c,-12,-12,11,24,2,a,b,1.5); rr(c,1,-12,11,24,2,'#dfc897',b,1.5); line(c,[[0,-10],[0,11]],b,1.3); star(c,5,0,4,4,'#fff2bf'); break;
      case 'sound': path(c,[[-13,-5],[-6,-5],[3,-12],[3,12],[-6,5],[-13,5]],a); c.beginPath(); c.arc(1,0,9,-0.9,0.9); c.strokeStyle=b; c.lineWidth=2; c.stroke(); c.beginPath(); c.arc(1,0,14,-0.9,0.9); c.stroke(); break;
      case 'harp': line(c,[[-9,11],[-9,-10],[1,-13],[12,10]],a,2.6); line(c,[[-8,10],[11,10]],b,2); line(c,[[-5,-9],[-4,9]],b,1); line(c,[[0,-10],[0,9]],b,1); line(c,[[5,-7],[4,9]],b,1); break;
      case 'door': rr(c,-9,-13,18,27,2,null,a,2.2); rr(c,-5,-8,10,22,1,'rgba(255,220,160,.18)',b,1); circle(c,2,3,1.3,b); break;
      case 'back': line(c,[[11,0],[-10,0],[-2,-8]],a,3); line(c,[[-10,0],[-2,8]],a,3); break;
      case 'pause': rr(c,-10,-11,6,22,2,a); rr(c,4,-11,6,22,2,b); break;
      case 'play': path(c,[[-8,-12],[12,0],[-8,12]],a,b,1.3); break;
      case 'wrench': line(c,[[-9,10],[5,-4]],a,4); c.beginPath(); c.arc(8,-8,6,0.3,4.8); c.strokeStyle=b; c.lineWidth=3; c.stroke(); circle(c,-10,11,3,a); break;
      case 'wing': line(c,[[-12,8],[10,-11]],a,2.4); path(c,[[-11,7],[-14,-7],[-5,-3],[-3,-12],[2,-7],[7,-14],[10,-3]],b); break;
      case 'reroll': c.beginPath(); c.arc(0,0,10,0.2,4.6); c.strokeStyle=a; c.lineWidth=3; c.stroke(); path(c,[[-12,-7],[-2,-9],[-8,-1]],b); c.beginPath(); c.arc(0,0,6,3.2,7.2); c.strokeStyle=b; c.lineWidth=2; c.stroke(); break;
      case 'gate': path(c,[[-13,12],[-13,-8],[0,-14],[13,-8],[13,12]],null,a,2.4); rr(c,-4,1,8,11,1,b); line(c,[[-9,-3],[9,-3]],a,1.5); break;
      case 'flag': line(c,[[-8,13],[-8,-13]],b,2.5); path(c,[[-7,-12],[11,-9],[3,-1],[-7,-3]],a); break;
      case 'retry': c.beginPath(); c.arc(0,0,11,0.5,5.5); c.strokeStyle=a; c.lineWidth=3; c.stroke(); path(c,[[8,-11],[14,-6],[6,-4]],b); line(c,[[-1,-5],[-1,6],[6,6]],b,2); break;
      case 'home': path(c,[[-13,-2],[0,-13],[13,-2],[10,1],[9,12],[-9,12],[-10,1]],null,a,2.4); rr(c,-3,3,6,9,1,b); break;
      case 'lock': rr(c,-11,-3,22,16,3,a); c.beginPath(); c.arc(0,-4,7,Math.PI,0); c.strokeStyle=b; c.lineWidth=2.4; c.stroke(); circle(c,0,4,2,b); break;
      case 'medal': circle(c,0,-2,9,a,b,1.5); path(c,[[-7,5],[-11,14],[-3,11],[0,15],[2,6]],b); star(c,0,-2,5,5,'#fff0bc'); break;
      case 'skull': circle(c,0,-3,10,a,b,1.4); rr(c,-7,4,14,8,2,a,b,1.3); circle(c,-4,-2,2,'#231923'); circle(c,4,-2,2,'#231923'); line(c,[[-2,7],[-2,11]],b,1.5); line(c,[[2,7],[2,11]],b,1.5); break;
      case 'wave': line(c,[[-13,2],[-8,-4],[-3,2],[2,-4],[7,2],[12,-4]],a,2.5); line(c,[[-12,10],[-7,5],[-2,10],[3,5],[8,10],[13,5]],b,2); break;
      case 'shard': path(c,[[-2,-14],[8,-5],[2,0],[6,13],[-9,5],[-5,-3]],a,b,1.5); line(c,[[-2,-12],[-4,1],[2,3]],'#fff',1.4); break;
      case 'core': circle(c,0,0,12,null,a,2); star(c,0,0,9,8,b,a); circle(c,0,0,3,'#fff5c0'); break;
      case 'star': star(c,0,0,14,5,a,b); break;
      case 'courtyard': path(c,[[-14,10],[-14,-4],[0,-14],[14,-4],[14,10]],null,a,2); rr(c,-5,2,10,9,1,null,b,2); path(c,[[0,7],[-5,1],[-3,-4],[0,-1],[3,-4],[5,1]],b); line(c,[[-13,13],[13,13]],a,2); break;
      default: circle(c,0,0,8,a,b,2); break;
    }
    c.lineCap = 'butt';
  }

  var I = {
    icons: ICONS,
    has: function (id) { return !!ICONS[id]; },
    ids: function () { return Object.keys(ICONS); },
    draw: function (ctx, id, x, y, size, opts) {
      var d = ICONS[id];
      if (!ctx || !d) return false;
      opts = opts || {};
      var scale = size / 48, px = x, py = y;
      if (opts.center !== false) { px -= size / 2; py -= size / 2; }
      ctx.save(); ctx.translate(px, py); ctx.scale(scale, scale);
      var bg = opts.bg || '#11151b', edge = opts.color || d.color;
      if (opts.frame !== false) {
        ctx.shadowColor = 'rgba(0,0,0,.42)'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
        rr(ctx, 1, 1, 46, 46, 10, bg, 'rgba(255,255,255,.13)', 1);
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.globalAlpha = 0.19; rr(ctx, 3, 3, 42, 42, 8, edge); ctx.globalAlpha = 1;
        rr(ctx, 1.5, 1.5, 45, 45, 10, null, edge, opts.lineWidth || 1.3);
        line(ctx, [[7,8],[13,5],[19,4]], 'rgba(255,255,255,.24)', 1);
      }
      ctx.translate(24, 24);
      if (opts.disabled) ctx.globalAlpha = 0.32;
      if (opts.cooldown > 0) {
        ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,23,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,opts.cooldown)); ctx.closePath();
        ctx.fillStyle = 'rgba(4,6,10,.65)'; ctx.fill();
      }
      ctx.shadowColor = edge; ctx.shadowBlur = size >= 24 ? 5 : 2;
      paintShape(ctx, d.shape, edge, d.accent);
      ctx.shadowBlur = 0;
      ctx.restore();
      return true;
    }
  };
  RW.UIIcons = I;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
