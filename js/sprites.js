// 圣火守护者 · 精灵图层：把 assets/sprites/<名>/<名>.png 图集画成面朝镜头、脚底为轴心的受光立牌。
// 依赖 gl3d.js（GL.spriteTexture / spriteMaterial / preRender）与 sprite_anim.js（window.SpriteAnim 的步行 / 呼吸 / 过渡姿态）。
// world3d.js 决定哪个实体用哪套图（英雄 → hero，小鬼 → grunt，暗弓手 → elite，崩山巨像 → boss，盾卫 → guard）。
// 图没加载好（或加载失败）时 SPR.has() 返回 false，world3d 退回原来的方块低模。
(function (root) {
  var RW = root.RW = root.RW || {};
  var SPR = { inited: false, sets: {}, nearest: false, base: 'assets/sprites/' };

  // 图集元数据：与 assets/sprites/<名>/<名>.json 逐字段一致（tools/check.js 会核对，改 json 时同步改这里）。
  // 4 列 × 6 行；行：0 走·下 1 走·右 2 走·左（单独画的，不是镜像） 3 走·上 4 待机·正面 5 攻击·正面。
  // pivot_x / pivot_y = 脚底在一格里的像素位置；body_height_px = 站立身高像素；height_rel_hero = 相对英雄身高；
  // fps.attack = 攻击 4 帧各自的时长（秒）。
  SPR.META = {
    hero: { name: 'hero', image: 'hero.png', frame_w: 200, frame_h: 152, cols: 4, rows: { walk_down: 0, walk_right: 1, walk_left: 2, walk_up: 3, idle_down: 4, attack: 5 }, pivot_x: 99.88, pivot_y: 149.53, body_height_px: 112, height_rel_hero: 1.0, fps: { walk: 8, idle: 4, attack: [0.125, 0.2, 0.2, 0.35] }, attack_facing: 'down', attack_thrust_dir: null },
    grunt: { name: 'grunt', image: 'grunt.png', frame_w: 178, frame_h: 143, cols: 4, rows: { walk_down: 0, walk_right: 1, walk_left: 2, walk_up: 3, idle_down: 4, attack: 5 }, pivot_x: 88.97, pivot_y: 141.31, body_height_px: 112, height_rel_hero: 0.85, fps: { walk: 8, idle: 4, attack: [0.15, 0.15, 0.2, 0.3] }, attack_facing: 'down', attack_thrust_dir: null },
    elite: { name: 'elite', image: 'elite.png', frame_w: 236, frame_h: 128, cols: 4, rows: { walk_down: 0, walk_right: 1, walk_left: 2, walk_up: 3, idle_down: 4, attack: 5 }, pivot_x: 118.1, pivot_y: 125.86, body_height_px: 112, height_rel_hero: 1.0, fps: { walk: 8, idle: 4, attack: [0.18, 0.2, 0.22, 0.3] }, attack_facing: 'down', attack_thrust_dir: null },
    boss: { name: 'boss', image: 'boss.png', frame_w: 240, frame_h: 234, cols: 4, rows: { walk_down: 0, walk_right: 1, walk_left: 2, walk_up: 3, idle_down: 4, attack: 5 }, pivot_x: 120.0, pivot_y: 231.2, body_height_px: 176, height_rel_hero: 1.9, fps: { walk: 6, idle: 4, attack: [0.28, 0.32, 0.25, 0.4] }, attack_facing: 'down', attack_thrust_dir: null },
    guard: { name: 'guard', image: 'guard.png', frame_w: 176, frame_h: 117, cols: 4, rows: { walk_down: 0, walk_right: 1, walk_left: 2, walk_up: 3, idle_down: 4, attack: 5 }, pivot_x: 88.11, pivot_y: 115.48, body_height_px: 112, height_rel_hero: 1.0, fps: { walk: 8, idle: 4, attack: [0.12, 0.12, 0.18, 0.3] }, attack_facing: 'down', attack_thrust_dir: 'right' }
  };
  var ROWS = 6;
  // 渲染参数：英雄身高 = 碰撞半径 × heroH（世界单位；r=10 → 46，屏幕上约 40–75 像素）；姿态过渡 0.2 s；
  // 每套图最多同屏 cap 个；立牌脚底比地面高 lift，免得和地面打架
  SPR.CFG = { heroH: 4.6, blend: 0.2, cap: 200, lift: 0.6, still: 12 };
  // 动作模式
  SPR.IDLE = 0; SPR.WALK = 1; SPR.ATTACK = 2; SPR.FACE = 3;   // FACE：站着朝某个方向（走路行第 0 帧，蓄力 / 瞄准）

  // ---------- 初始化：贴图、材质、每套图一个 InstancedMesh ----------
  function commit() {
    for (var k in SPR.sets) {
      var S = SPR.sets[k], im = S.obj, n = S.count;
      if (!im) continue;
      im.count = n;
      if (!n) continue;
      im.instanceMatrix.clearUpdateRanges(); im.instanceMatrix.addUpdateRange(0, n * 16); im.instanceMatrix.needsUpdate = true;
      im.instanceColor.clearUpdateRanges(); im.instanceColor.addUpdateRange(0, n * 3); im.instanceColor.needsUpdate = true;
      S.flash.clearUpdateRanges(); S.flash.addUpdateRange(0, n); S.flash.needsUpdate = true;
      S.frame.clearUpdateRanges(); S.frame.addUpdateRange(0, n * 4); S.frame.needsUpdate = true;
    }
  }
  function reset() { for (var k in SPR.sets) SPR.sets[k].count = 0; }

  SPR.init = function () {
    var GL = RW.GL, THREE = root.THREE;
    if (SPR.inited || !GL || !GL.ok || !THREE) return false;
    SPR.inited = true;
    var CAP = SPR.CFG.cap;
    // 浏览器调试：?nearest 用最近邻采样对照（默认线性 + mipmap）
    try { if (typeof location !== 'undefined' && /[?&]nearest\b/.test(location.search)) SPR.nearest = true; } catch (e) { /* 小游戏里没有 location */ }
    for (var name in SPR.META) (function (name, M) {
      var S = SPR.sets[name] = { name: name, M: M, ok: false, count: 0 };
      // 几何：1×1 平面，脚底移到原点：x ∈ [-px, 1-px]、y ∈ [py-1, py]（px/py = 轴心在格子里的比例）
      var geo = new THREE.PlaneGeometry(1, 1);
      geo.translate(0.5 - M.pivot_x / M.frame_w, M.pivot_y / M.frame_h - 0.5, 0);
      S.aspect = M.frame_w / M.frame_h;           // 立牌 宽 / 高
      S.hk = M.frame_h / M.body_height_px;        // 立牌高 = 身高 × hk（格子里身体上下留白）
      S.atkTotal = 0;
      for (var i = 0; i < M.fps.attack.length; i++) S.atkTotal += M.fps.attack[i];
      S.tex = GL.spriteTexture(SPR.base + name + '/' + M.image, function (t) { S.ok = !!t; }, SPR.nearest);
      S.mat = GL.spriteMaterial(S.tex, name === 'grunt' || name === 'elite' || name === 'boss');
      var im = new THREE.InstancedMesh(geo, S.mat, CAP);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 3), 3);
      im.instanceColor.setUsage(THREE.DynamicDrawUsage);
      S.flash = new THREE.InstancedBufferAttribute(new Float32Array(CAP), 1); S.flash.setUsage(THREE.DynamicDrawUsage);
      S.frame = new THREE.InstancedBufferAttribute(new Float32Array(CAP * 4), 4); S.frame.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('iFlash', S.flash); geo.setAttribute('iFrame', S.frame);
      // 立牌不投实时阴影（脚下保留圆形接触阴影），但接受建筑 / 地形的阴影
      im.count = 0; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = true;
      GL.scene.add(im); S.obj = im;
    })(name, SPR.META[name]);
    GL.preRender.push(commit); GL.postRender.push(reset);
    return true;
  };
  // 这套图能画了吗（贴图已加载）
  SPR.has = function (set) { var S = SPR.sets[set]; return !!(S && S.ok); };
  // 一套图的身高（世界单位）：英雄 r=10 时的身高 × 相对身高 × k
  SPR.bodyH = function (set, k) { return 10 * SPR.CFG.heroH * SPR.META[set].height_rel_hero * (k || 1); };
  SPR.atkTotal = function (set) { return SPR.sets[set].atkTotal; };
  // 立牌上的一点 → 世界坐标（fx / fy 按立牌宽 / 高的比例，脚底为 0；给提灯光、发光点用）。写进 out[0..2]
  SPR.point = function (set, x, y, z, bodyH, fx, fy, out) {
    var S = SPR.sets[set], GL = RW.GL, R = GL.camRight, Up = GL.camUp, H = bodyH * S.hk, W = H * S.aspect;
    out[0] = x + R[0] * W * fx + Up[0] * H * fy; out[1] = y + SPR.CFG.lift + R[1] * W * fx + Up[1] * H * fy; out[2] = z + R[2] * W * fx + Up[2] * H * fy;
    return out;
  };

  // ---------- 画一格 ----------
  // set 图集名；(x, y, z) 脚底世界坐标（y 是抬高）；row / frame 图集行列；mirror 水平镜像；bodyH 身高（世界单位）；
  // sx / sy 姿态缩放；roll 绕视线滚转（弧度，倒地用）；r g b 着色（sRGB，1 = 原色）；flash 闪白 0..1
  SPR.put = function (set, x, y, z, row, frame, mirror, bodyH, sx, sy, roll, r, g, b, flash) {
    var S = SPR.sets[set];
    if (!S || !S.ok || S.count >= SPR.CFG.cap) return false;
    var GL = RW.GL, R = GL.camRight, Up = GL.camUp, B = GL.camBack;
    var H = bodyH * S.hk, W = H * S.aspect, i = S.count++, e = S.obj.instanceMatrix.array, o = i * 16;
    var c = 1, s = 0;
    if (roll) { c = Math.cos(roll); s = Math.sin(roll); }
    var kw = W * sx, kh = H * sy;
    // 列 0 = 镜头右 × 宽，列 1 = 镜头上 × 高，列 2 = 朝镜头的法线；滚转在镜头平面内转一下右 / 上轴
    e[o] = (R[0] * c + Up[0] * s) * kw; e[o + 1] = (R[1] * c + Up[1] * s) * kw; e[o + 2] = (R[2] * c + Up[2] * s) * kw; e[o + 3] = 0;
    e[o + 4] = (Up[0] * c - R[0] * s) * kh; e[o + 5] = (Up[1] * c - R[1] * s) * kh; e[o + 6] = (Up[2] * c - R[2] * s) * kh; e[o + 7] = 0;
    e[o + 8] = B[0]; e[o + 9] = B[1]; e[o + 10] = B[2]; e[o + 11] = 0;
    e[o + 12] = x; e[o + 13] = y + SPR.CFG.lift; e[o + 14] = z; e[o + 15] = 1;
    var ca = S.obj.instanceColor.array;
    ca[i * 3] = GL.lin(r == null ? 1 : r); ca[i * 3 + 1] = GL.lin(g == null ? 1 : g); ca[i * 3 + 2] = GL.lin(b == null ? 1 : b);
    S.flash.array[i] = flash || 0;
    // 图集里的一格：贴图 flipY，v 从下往上；镜像 = 从右边起、宽度取负
    var fa = S.frame.array, fw = 1 / S.M.cols, fh = 1 / ROWS;
    fa[i * 4] = mirror ? (frame + 1) * fw : frame * fw; fa[i * 4 + 1] = 1 - (row + 1) * fh;
    fa[i * 4 + 2] = mirror ? -fw : fw; fa[i * 4 + 3] = fh;
    return true;
  };

  // ---------- 动作状态机（每个实体一份，挂在模拟对象的 _spr 上） ----------
  // seq 变了（对象池复用给了新怪）就重置
  SPR.state = function (obj, seq) {
    var st = obj._spr;
    if (!st) st = obj._spr = { seq: seq, mode: -1, t0: -9, atk0: -9, dir: 0, py: 0, psx: 1, psy: 1, cy: 0, csx: 1, csy: 1, aF: 0, aU: 0 };
    if (st.seq !== seq) { st.seq = seq; st.mode = -1; st.t0 = -9; st.atk0 = -9; st.dir = 0; st.py = st.cy = 0; st.psx = st.psy = st.csx = st.csy = 1; }
    return st;
  };
  // 攻击从现在开始播（按图集里每帧时长走一遍；播完停在最后一帧，状态型攻击由 animate 循环）
  SPR.trigger = function (st, t) { st.atk0 = t; };
  SPR.attacking = function (st, t, set) { return t - st.atk0 < SPR.sets[set].atkTotal; };
  // 屏幕方向：+x 右，+z（模拟 y）下。带一点滞后，斜着走时不会在两行之间抖
  function dirOf(st, vx, vy) {
    var ax = Math.abs(vx), ay = Math.abs(vy), horiz = st.dir === 1 || st.dir === 2;
    if (horiz ? ay > ax * 1.25 : ax <= ay * 1.25) st.dir = vy > 0 ? 0 : 3;
    else st.dir = vx > 0 ? 1 : 2;
    return st.dir;
  }
  var OUT = { row: 4, frame: 0, y: 0, sx: 1, sy: 1 }, PA = { y: 0, sx: 1, sy: 1 }, PB = { y: 0, sx: 1, sy: 1 }, CF = { frame: 0, u: 0 };
  var SA = root.SpriteAnim;
  // 算出这一帧该画哪一格、什么姿态。mode 见 SPR.IDLE / WALK / ATTACK / FACE；vx vy 世界速度（FACE 时是朝向）；
  // phase 每个实体的相位偏移（同类怪别齐步走）；loop = 攻击播完是否从头循环（状态型攻击，如 Boss 弹幕）
  // 返回共用的 OUT（row, frame, y（身高比例）, sx, sy），调用方立刻用掉
  SPR.animate = function (set, st, t, mode, vx, vy, phase, loop) {
    var S = SPR.sets[set], M = S.M, tt = t + (phase || 0), pose;
    if (mode !== st.mode) {
      // 记住切换瞬间的姿态，0.2 s 内平滑过渡过去
      st.py = st.cy; st.psx = st.csx; st.psy = st.csy; st.mode = mode; st.t0 = t;
      if (mode === SPR.ATTACK && st.atk0 < st.t0 - S.atkTotal) st.atk0 = t;
    }
    if (mode === SPR.WALK) {
      OUT.row = dirOf(st, vx, vy);
      OUT.frame = SA.frameAt(tt, M.fps.walk, 4);
      pose = SA.walkPose(tt, M.fps.walk, 0.025, 0.03, PB);
    } else if (mode === SPR.ATTACK) {
      var ta = t - st.atk0;
      if (loop && ta >= S.atkTotal) ta -= Math.floor(ta / S.atkTotal) * S.atkTotal;
      SA.castFrameAt(Math.min(ta, S.atkTotal - 1e-3), M.fps.attack, CF);
      OUT.row = M.rows.attack; OUT.frame = CF.frame; st.aF = CF.frame; st.aU = CF.u;
      pose = SA.restPose(PB);
    } else if (mode === SPR.FACE) {
      OUT.row = dirOf(st, vx, vy); OUT.frame = 0;
      pose = SA.idlePose(tt, 1.6, 0.02, PB);
    } else {
      OUT.row = M.rows.idle_down;
      OUT.frame = SA.frameAt(tt, M.fps.idle, 4);
      pose = SA.idlePose(tt, 1.6, 0.03, PB);
    }
    var k = (t - st.t0) / SPR.CFG.blend;
    if (k < 1) { PA.y = st.py; PA.sx = st.psx; PA.sy = st.psy; pose = SA.blendPose(PA, pose, k, PB); }
    st.cy = pose.y; st.csx = pose.sx; st.csy = pose.sy;
    OUT.y = pose.y; OUT.sx = pose.sx; OUT.sy = pose.sy;
    return OUT;
  };

  RW.SPR = SPR;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
