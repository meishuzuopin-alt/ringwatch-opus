// 圣火守护者 · 3D 渲染层（基于 Three.js，见 vendor/three.min.js）
// 提供：矩阵工具、几何构建器 GB（平面着色的方块/棱柱/圆柱/低模球，模型全部在代码里生成）、
// 实例化网格、实时阴影、卡通描边（反向外壳）、泛光、调色、贴地/发光特效四边形。
(function (root) {
  var RW = root.RW;

  // ---------- 颜色 ----------
  var colorCache = {};
  function hex(h) {
    var c = colorCache[h];
    if (c) return c;
    var s = h.charAt(0) === '#' ? h.slice(1) : h;
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    var v = parseInt(s, 16);
    c = [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
    colorCache[h] = c;
    return c;
  }
  function shade(col, k) { return [Math.min(1, col[0] * k), Math.min(1, col[1] * k), Math.min(1, col[2] * k)]; }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  // ---------- 矩阵 ----------
  var M4 = {
    perspective: function (out, fovy, aspect, near, far) {
      var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
      out.fill(0);
      out[0] = f / aspect; out[5] = f; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
      return out;
    },
    lookAt: function (out, e, t, u) {
      var zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2], l = Math.sqrt(zx * zx + zy * zy + zz * zz);
      zx /= l; zy /= l; zz /= l;
      var xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx;
      l = Math.sqrt(xx * xx + xy * xy + xz * xz); xx /= l; xy /= l; xz /= l;
      var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
      out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
      out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
      out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
      out[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
      out[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
      out[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
      out[15] = 1;
      return out;
    },
    ortho: function (out, l, r, b, t, n, f) {
      out.fill(0);
      out[0] = 2 / (r - l); out[5] = 2 / (t - b); out[10] = -2 / (f - n);
      out[12] = -(r + l) / (r - l); out[13] = -(t + b) / (t - b); out[14] = -(f + n) / (f - n); out[15] = 1;
      return out;
    },
    mul: function (out, a, b) {
      for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) {
        out[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
      }
      return out;
    }
  };

  // ---------- 几何构建器 ----------
  // 顶点格式：位置 3 + 法线 3 + 颜色 4（第 4 位 = 自发光强度），共 10 个 float
  function GB() { this.v = []; this.tx = 0; this.ty = 0; this.tz = 0; this.rc = 1; this.rs = 0; this.sc = 1; }
  GB.prototype.setXf = function (x, y, z, rot, scale) {
    this.tx = x || 0; this.ty = y || 0; this.tz = z || 0; this.rc = Math.cos(rot || 0); this.rs = Math.sin(rot || 0); this.sc = scale || 1;
    return this;
  };
  GB.prototype.xf = function (p) {
    var x = p[0] * this.sc, y = p[1] * this.sc, z = p[2] * this.sc;
    return [x * this.rc - z * this.rs + this.tx, y + this.ty, x * this.rs + z * this.rc + this.tz];
  };
  GB.prototype.tri = function (a, b, c, col, em) {
    a = this.xf(a); b = this.xf(b); c = this.xf(c);
    var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
    nx /= l; ny /= l; nz /= l;
    var e = em || 0, V = this.v;
    V.push(a[0], a[1], a[2], nx, ny, nz, col[0], col[1], col[2], e);
    V.push(b[0], b[1], b[2], nx, ny, nz, col[0], col[1], col[2], e);
    V.push(c[0], c[1], c[2], nx, ny, nz, col[0], col[1], col[2], e);
  };
  // 四边形 a b c d 逆时针（从外面看）
  GB.prototype.quad = function (a, b, c, d, col, em) { this.tri(a, b, c, col, em); this.tri(a, c, d, col, em); };
  // 盒子：底面中心 (x, y, z)，尺寸 sx sy sz；top 可选单独颜色
  GB.prototype.box = function (x, y, z, sx, sy, sz, col, em, top, noBottom) {
    var x0 = x - sx / 2, x1 = x + sx / 2, y0 = y, y1 = y + sy, z0 = z - sz / 2, z1 = z + sz / 2;
    var side = col, tc = top || shade(col, 1.08);
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], tc, em);             // 顶
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], side, em);           // 南 +z
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], shade(side, 0.92), em); // 北 -z
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], shade(side, 0.96), em); // 东 +x
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], shade(side, 0.9), em);  // 西 -x
    if (!noBottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], shade(side, 0.6), em);
  };
  // 两坡屋顶：沿 x 方向的屋脊
  GB.prototype.roof = function (x, y, z, sx, h, sz, col) {
    var x0 = x - sx / 2, x1 = x + sx / 2, z0 = z - sz / 2, z1 = z + sz / 2, yr = y + h;
    this.quad([x0, y, z1], [x1, y, z1], [x1, yr, z], [x0, yr, z], col);
    this.quad([x1, y, z0], [x0, y, z0], [x0, yr, z], [x1, yr, z], shade(col, 0.8));
    this.tri([x0, y, z0], [x0, y, z1], [x0, yr, z], shade(col, 0.7));
    this.tri([x1, y, z1], [x1, y, z0], [x1, yr, z], shade(col, 0.75));
  };
  // 圆柱 / 圆台 / 圆锥（r1 = 0 时为锥）
  GB.prototype.cyl = function (x, y, z, r0, r1, h, n, col, em, capCol) {
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      var p0 = [x + c0 * r0, y, z + s0 * r0], p1 = [x + c1 * r0, y, z + s1 * r0];
      var q0 = [x + c0 * r1, y + h, z + s0 * r1], q1 = [x + c1 * r1, y + h, z + s1 * r1];
      if (r1 > 0) this.quad(p1, p0, q0, q1, shade(col, 0.88 + 0.12 * Math.cos(a0 - 2.3)), em);
      else this.tri(p1, p0, [x, y + h, z], shade(col, 0.88 + 0.12 * Math.cos(a0 - 2.3)), em);
      if (r1 > 0) this.tri([x, y + h, z], q1, q0, capCol || shade(col, 1.1), em);
    }
  };
  // 低模球：八面体细分一次，带随机起伏（树冠、石头）
  var ICO = null;
  function icoBase() {
    if (ICO) return ICO;
    var v = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    var f = [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]];
    var out = [];
    function norm(p) { var l = Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]); return [p[0] / l, p[1] / l, p[2] / l]; }
    function mid(a, b) { return norm([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]); }
    for (var i = 0; i < f.length; i++) {
      var a = v[f[i][0]], b = v[f[i][1]], c = v[f[i][2]], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      out.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
    }
    ICO = out;
    return out;
  }
  GB.prototype.blob = function (x, y, z, rx, ry, rz, col, em, seed, jitter) {
    var faces = icoBase(), jit = jitter == null ? 0.18 : jitter, sd = seed || 1;
    var cache = {};
    function j(p) {
      var key = (p[0] * 97 + p[1] * 31 + p[2] * 7).toFixed(3);
      if (cache[key] == null) { sd = (sd * 16807) % 2147483647; cache[key] = 1 + (sd / 2147483647 - 0.5) * 2 * jit; }
      var k = cache[key];
      return [x + p[0] * rx * k, y + p[1] * ry * k, z + p[2] * rz * k];
    }
    for (var i = 0; i < faces.length; i++) {
      var f = faces[i], ny = (f[0][1] + f[1][1] + f[2][1]) / 3;
      this.tri(j(f[0]), j(f[1]), j(f[2]), shade(col, 0.82 + 0.3 * (ny * 0.5 + 0.5)), em);
    }
  };
  GB.prototype.count = function () { return this.v.length / 10; };

  // ======================================================================
  // 以下为 Three.js 实现。对 world3d.js 暴露的接口保持不变：
  // upload / put / ground / streak / beam3 / glow / setCamera / project / frame
  // ======================================================================
  var THREE = root.THREE;

  // sRGB -> 线性（顶点色、实例色、特效色都按 sRGB 书写，Three.js 在线性空间里计算光照）
  function lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  var tmpC = null;
  function srgb(col) { return tmpC.setRGB(col[0], col[1], col[2], THREE.SRGBColorSpace); }

  // ---------- 实例批次（特效四边形用） ----------
  function Batch(cap, floats) { this.cap = cap; this.fl = floats; this.data = new Float32Array(cap * floats); this.n = 0; }
  Batch.prototype.reset = function () { this.n = 0; };

  var GL = {
    ok: false, hex: hex, shade: shade, mix: mixc, lin: lin, M4: M4, GB: GB,
    view: new Float32Array(16), proj: new Float32Array(16), vp: new Float32Array(16),
    cam: [0, 0, 0], camRight: [1, 0, 0], camUp: [0, 1, 0],
    // 画质开关：阴影 / 描边 / 泛光 / 环境光遮蔽。地址加 ?lowfx 全关；帧率持续偏低时 world3d 会逐级自动关闭
    fx: { shadow: true, outline: true, bloom: true, ao: true },
    // 风格化光照开关（FG-ART-002 阶段 1）。制作人要保留原版的光感，这些默认全关，只作对照 / 备选：
    //   aces 色调映射 · toon 三段色阶 · noise 噪点斑驳 · ao 环境光遮蔽 · nightFog 光圈外夜雾（自发光穿雾）
    //   rim 冷色边缘光 · grad 顶点下暗上亮 · coreLight 圣火暖光圈 · night35 夜晚提亮到白天 35% 的备选预设
    // 默认开着的只有低风险三项：描边（本色压暗）、只给火焰 / 法术 / 敌眼的局部泛光、轻暗角。
    // 浏览器里加 ?art=all 全开，?art=toon,ao 只开其中几项（截图对照用）
    ART: { aces: false, toon: false, noise: false, ao: false, nightFog: false, rim: false, grad: false, coreLight: false, night35: false },
    meshes: [], statics: [],
    // 每帧渲染前 / 后的回调（精灵图层在这里提交实例、清空计数）
    preRender: [], postRender: []
  };

  // ---------- 材质 ----------
  // 网格材质（FG-ART-002 阶段 1，美术圣经第 4、5 节）：
  //   卡通三段色阶（MeshToonMaterial + 3 格渐变图）· 顶点色渐变（下暗上亮）· 冷色边缘光 · 世界坐标噪声斑驳
  //   · 圣火暖光圈（半径 = 圣域半径，边缘清楚）· 光圈外贴地的低矮冷雾（自发光部分穿透雾，远处敌人先露红眼）
  //   + 每顶点自发光强度（aEm）+ 每实例闪白（iFlash）
  var U = {
    uTime: { value: 0 }, uEmBoost: { value: 1 }, uGrade: { value: null }, uLineW: { value: 1.2 }, uLineWB: { value: 0.9 },
    uRim: { value: null }, uNoise: { value: 0.12 }, uCore: { value: null }, uCoreCol: { value: null },
    uFogLow: { value: null }, uEmHDR: { value: 2.2 }, uGradK: { value: 0 }, uFogPierce: { value: 0 },
    // C1 色温过渡（参数在 RW.C1_LIGHT）：uBand = (inner, outer, 暖饱和, 冷饱和)，uGain = (暖明度, 冷明度)
    uBand: { value: new THREE.Vector4(0.42, 1.32, 0.8, 0.2) }, uGain: { value: new THREE.Vector2(1.04, 0.64) },
    uWarm: { value: new THREE.Vector3(1.48, 0.72, 0.36) }, uCool: { value: new THREE.Vector3(0.40, 0.48, 1.12) },
    uWarmAdd: { value: 0.14 }, uChill: { value: 0 }
  };
  // 固有色按离圣火的距离从暖色收到冷靛蓝。宽 smoothstep，不在半径上切一刀。
  var C1_ALBEDO = [
    '{',
    '  float fgCd = length(vWp.xz - uCore.xy);',
    '  float fgR = max(uCore.z, 1.0);',
    '  float fgT = uCore.z < 2.0 ? mix(0.35, 0.85, uChill) : smoothstep(fgR * uBand.x, fgR * uBand.y, fgCd);',
    '  float fgL = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));',
    '  diffuseColor.rgb = mix(vec3(fgL), diffuseColor.rgb, mix(uBand.z, uBand.w, fgT)) * mix(uWarm, uCool, fgT) * mix(uGain.x, uGain.y, fgT);',
    '}'
  ].join('\n');
  // 同一条过渡带上的暖色补光（没有 6% 硬边）。ART.coreLight 的旧硬光圈仍走 uCore.w，默认关。
  var C1_FILL = [
    '{',
    '  float fgCd2 = length(vWp.xz - uCore.xy);',
    '  float fgR2 = max(uCore.z, 1.0);',
    '  float fgT2 = uCore.z < 2.0 ? 1.0 : smoothstep(fgR2 * uBand.x, fgR2 * uBand.y, fgCd2);',
    '  reflectedLight.directDiffuse += diffuseColor.rgb * uCoreCol * uWarmAdd * (1.0 - fgT2);',
    '}'
  ].join('\n');
  // 3 格渐变：暗面 / 中间调 / 亮面（最近邻采样，形成清楚的色阶）
  function toonRamp() {
    var t = new THREE.DataTexture(new Uint8Array([66, 66, 66, 255, 140, 140, 140, 255, 235, 235, 235, 255]), 3, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  }
  var NOISE_GLSL = [
    'float fgHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float fgNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);',
    '  return mix(mix(fgHash(i), fgHash(i+vec2(1,0)), f.x), mix(fgHash(i+vec2(0,1)), fgHash(i+vec2(1,1)), f.x), f.y); }'
  ].join('\n');
  // 把本项目的光照扩展注进 Three 的材质着色器：自发光 / 闪白 / 顶点渐变 / 斑驳 / 圣火暖光圈 / 边缘光 / 低雾。
  // sprite = true 是贴图立牌（精灵图）：没有顶点色和 aEm，颜色来自图集贴图；每实例 iFrame 选图集里的一格
  //   （iFrame = [u0, v0, u 宽（负数 = 水平镜像）, v 高]）；不加斑驳和顶点渐变，画好的画面不再叠笔触
  function fgInject(sh, water, sprite) {
    ['uTime', 'uEmBoost', 'uRim', 'uNoise', 'uCore', 'uCoreCol', 'uFogLow', 'uEmHDR', 'uGradK', 'uFogPierce', 'uBand', 'uGain', 'uWarm', 'uCool', 'uWarmAdd', 'uChill'].forEach(function (k) { sh.uniforms[k] = U[k]; });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + (sprite ? 'attribute vec4 iFrame;\n' : 'attribute float aEm;\n') + 'varying float vEm;\nvarying float vFlash;\nvarying vec3 vWp;\nvarying float vGrad;\nuniform float uTime;\nuniform float uGradK;\n#ifdef USE_INSTANCING\nattribute float iFlash;\n#endif')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + (sprite ? 'vEm = 0.0;\nvGrad = 1.0;\n' : 'vEm = aEm;\n' +
        // 顶点色渐变：模型底部偏暗、顶部偏亮（贴地的平地面不压暗）
        'vGrad = mix(1.0, (normal.y > 0.9 && position.y < 2.0) ? 1.0 : mix(0.74, 1.06, smoothstep(0.0, 42.0, position.y)), uGradK);\n') +
        '#ifdef USE_INSTANCING\nvFlash = iFlash;\n#else\nvFlash = 0.0;\n#endif' +
        (water ? '\ntransformed.y += sin(transformed.x*0.05 + uTime*2.0)*2.0 + cos(transformed.z*0.06 + uTime*1.6)*2.0;\nvGrad = 1.0;' : ''))
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvec4 fgW = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nfgW = instanceMatrix * fgW;\n#endif\nvWp = (modelMatrix * fgW).xyz;');
    if (sprite) sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vec2(iFrame.x + uv.x * iFrame.z, iFrame.y + uv.y * iFrame.w);\n#endif');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vEm;\nvarying float vFlash;\nvarying vec3 vWp;\nvarying float vGrad;\nuniform float uTime;\nuniform float uEmBoost;\nuniform vec4 uRim;\nuniform float uNoise;\nuniform vec4 uCore;\nuniform vec3 uCoreCol;\nuniform vec4 uFogLow;\nuniform float uEmHDR;\nuniform float uFogPierce;\nuniform vec4 uBand;\nuniform vec2 uGain;\nuniform vec3 uWarm;\nuniform vec3 uCool;\nuniform float uWarmAdd;\nuniform float uChill;\n' + NOISE_GLSL)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' +
        // 圣火暖光圈：圈内是暖光，边缘在最后 6% 半径内收掉，圈外全交给冷色环境光
        '{ float cd = length(vWp.xz - uCore.xy);\n  float cm = uCore.w * (1.0 - smoothstep(uCore.z * 0.94, uCore.z, cd)) * (0.55 + 0.45 * (1.0 - cd / max(uCore.z, 1.0)));\n  reflectedLight.directDiffuse += diffuseColor.rgb * uCoreCol * cm; }\n' +
        C1_FILL + '\n' +
        // 冷色边缘光：掠射角的面亮一圈月青色
        '{ float fr = 1.0 - saturate(dot(normalize(geometryNormal), normalize(geometryViewDir)));\n  reflectedLight.indirectDiffuse += uRim.rgb * uRim.w * smoothstep(0.5, 0.95, fr); }')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), vFlash);')
      // 雾：距离雾 + 贴地的低矮冷雾；自发光（圣火、敌人眼睛、法术）穿透雾
      .replace('#include <fog_fragment>', [
        '#ifdef USE_FOG',
        '  float fgF = smoothstep(fogNear, fogFar, vFogDepth);',
        '  float fgLow = uFogLow.x * (1.0 - smoothstep(0.0, uFogLow.y, vWp.y)) * smoothstep(uFogLow.z, uFogLow.w, length(vWp.xz - uCore.xy));',
        '  fgF = clamp(fgF + fgLow, 0.0, 1.0) * (1.0 - uFogPierce * clamp(vEm * 1.6, 0.0, 0.92));',
        '  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fgF);',
        '#endif'
      ].join('\n'));
    if (sprite) {
      // 手绘立牌和地形用同一条色温过渡，圈外不会比地面更亮
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + C1_ALBEDO);
      return;
    }
    sh.fragmentShader = sh.fragmentShader
      // 斑驳：两层世界坐标噪声，石头、木头、茅草、草地都带一点笔触感。C1 色温接在斑驳之后。
      .replace('#include <color_fragment>', '#include <color_fragment>\nfloat fgN = fgNoise(vWp.xz * 0.045 + vWp.y * 0.03) * 0.65 + fgNoise(vWp.xz * 0.19 - vWp.y * 0.11) * 0.35;\ndiffuseColor.rgb *= vGrad * (1.0 - uNoise + 2.0 * uNoise * fgN);\n' + C1_ALBEDO)
      // 自发光进 HDR（乘 uEmHDR），只有它和法术光效能过泛光阈值
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vEm * uEmBoost * uEmHDR;' +
        (water ? '\nfloat s1 = sin(vWp.x*0.09 + uTime*1.7) * cos(vWp.z*0.07 - uTime*1.3);\ndiffuseColor.rgb *= 0.85 + 0.25*s1;\ntotalEmissiveRadiance += vec3(0.35,0.6,0.9) * smoothstep(0.82, 0.98, s1) * 0.8;' : ''));
  }
  // toon = true 用三段色阶，false 用原版的 MeshStandardMaterial（平直着色、粗糙 0.92）
  function meshMaterial(water, toon) {
    var m = toon ? new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: GL.ramp })
      : new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 });
    m.onBeforeCompile = function (sh) { fgInject(sh, water, false); };
    return m;
  }
  // 精灵图立牌材质：Lambert 受光（半球光 + 太阳 + 阴影 + 雾都照常作用在画好的角色上），alphaTest 抠像，写深度
  // 贴图：sRGB；线性过滤 + mipmap（图集约为游戏尺寸的 2.2 倍，最近邻会闪烁，见 docs/ART.md）
  GL.spriteTexture = function (url, onLoad, nearest) {
    var tex = new THREE.TextureLoader().load(url, function (t) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = !nearest;
      t.minFilter = nearest ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
      t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
      t.anisotropy = 1; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.needsUpdate = true;
      if (onLoad) onLoad(t);
    }, undefined, function () { if (onLoad) onLoad(null); });
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  };
  GL.spriteMaterial = function (tex) {
    var m = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide });
    m.onBeforeCompile = function (sh) { fgInject(sh, false, true); };
    return m;
  };
  // 描边：背面外壳，沿平滑法线外扩（外扩量随离镜头距离变化，屏幕上粗细基本一致）
  // 颜色 = 物体本色压暗（顶点色 × 实例色 × 压暗系数），不用纯黑；角色 2 像素、建筑 1.5 像素（按 960×540 计）
  function lineMaterial(wU) {
    var m = new THREE.MeshBasicMaterial({ color: 0x4a4250, vertexColors: true, side: THREE.BackSide, fog: true });
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uLineW = wU;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aSmooth;\nuniform float uLineW;')
        .replace('#include <project_vertex>', [
          'vec4 wp0 = vec4(transformed, 1.0);',
          '#ifdef USE_INSTANCING', 'wp0 = instanceMatrix * wp0;', '#endif',
          'wp0 = modelMatrix * wp0;',
          'vec3 sn = aSmooth;',
          '#ifdef USE_INSTANCING', 'sn = mat3(instanceMatrix) * sn;', '#endif',
          'wp0.xyz += normalize(sn + vec3(0.0, 0.0001, 0.0)) * uLineW * length(cameraPosition - wp0.xyz);',
          'vec4 mvPosition = viewMatrix * wp0;',
          'gl_Position = projectionMatrix * mvPosition;'
        ].join('\n'));
    };
    return m;
  }
  // 特效四边形：中心 + 两个半轴；kind: 0 柔光圆 1 圆环 2 实心圆（阴影/填充） 3 光条
  var FX_VS = [
    'attribute vec4 iC; attribute vec4 iU; attribute vec4 iV; attribute vec4 iCol;',
    'varying vec2 vUv; varying vec4 vCol; varying float vKind; varying float vParam;',
    'void main(){',
    '  vec3 w = iC.xyz + iU.xyz * position.x + iV.xyz * position.y;',
    '  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);',
    '  vUv = position.xy; vCol = vec4(pow(iCol.rgb, vec3(2.2)), iCol.a); vKind = iC.w; vParam = iU.w;',
    '}'
  ].join('\n');
  var FX_FS = [
    'varying vec2 vUv; varying vec4 vCol; varying float vKind; varying float vParam;',
    'uniform float uGain;',
    'void main(){',
    '  float r = length(vUv); float a = 0.0;',
    '  if (vKind < 0.5) { a = pow(max(0.0, 1.0 - r), 1.6); }',
    '  else if (vKind < 1.5) { float t = max(vParam, 0.02); a = smoothstep(1.0, 1.0 - 0.15*t, r) * smoothstep(1.0 - t - 0.08, 1.0 - t, r); }',
    '  else if (vKind < 2.5) { a = smoothstep(1.0, 0.9 - vParam*0.5, r); }',
    '  else { float y = abs(vUv.y); float x = abs(vUv.x); a = pow(max(0.0, 1.0 - y), 1.5) * smoothstep(1.0, 0.7, x); }',
    '  if (a < 0.004) discard;',
    '  gl_FragColor = vec4(vCol.rgb * uGain, vCol.a * a);',
    '}'
  ].join('\n');
  function fxMesh(B, additive) {
    var g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    var ib = new THREE.InstancedInterleavedBuffer(B.data, 16, 1);
    ib.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iC', new THREE.InterleavedBufferAttribute(ib, 4, 0));
    g.setAttribute('iU', new THREE.InterleavedBufferAttribute(ib, 4, 4));
    g.setAttribute('iV', new THREE.InterleavedBufferAttribute(ib, 4, 8));
    g.setAttribute('iCol', new THREE.InterleavedBufferAttribute(ib, 4, 12));
    g.instanceCount = 0;
    var m = new THREE.ShaderMaterial({
      vertexShader: FX_VS, fragmentShader: FX_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uGain: { value: additive ? 1.6 : 1.0 } }   // 加法光效在 HDR 里提一点亮度，让泛光能抓到
    });
    var mesh = new THREE.Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = additive ? 20 : 10;
    mesh.userData = { B: B, ib: ib };
    return mesh;
  }

  // 环境光遮蔽（屏幕空间，只读深度，不多渲染一遍场景）：建筑和单位脚下、墙角压暗，解决漂浮感
  // 16 个采样点螺旋分布在半球投影里，按深度重建的视空间位置估算遮挡；亮的东西（火、法术）不压暗
  GL.BLOOM_THR = 1.05;   // 泛光阈值（HDR 亮度）：普通受光表面到不了，只有自发光 × uEmHDR 和叠加光效能过
  function aoPass() {
    var p = new THREE.ShaderPass({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: null }, uProj: { value: new THREE.Matrix4() }, uProjInv: { value: new THREE.Matrix4() },
        uRes: { value: new THREE.Vector2(4, 4) }, uRadius: { value: 30 }, uStrength: { value: 1.5 }
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform sampler2D tDepth; uniform mat4 uProj; uniform mat4 uProjInv;',
        'uniform vec2 uRes; uniform float uRadius; uniform float uStrength; varying vec2 vUv;',
        'vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 p = uProjInv * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return p.xyz / p.w; }',
        'void main(){',
        '  vec4 c = texture2D(tDiffuse, vUv);',
        '  float d0 = texture2D(tDepth, vUv).x;',
        '  if (d0 >= 1.0 || uStrength <= 0.0) { gl_FragColor = c; return; }',
        '  vec3 P = vpos(vUv);',
        '  vec3 N = normalize(cross(dFdx(P), dFdy(P)));',
        '  float rpx = uRadius * uProj[1][1] * 0.5 * uRes.y / max(1.0, -P.z);',
        '  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));',
        '  float occ = 0.0; float r2 = uRadius * uRadius;',
        '  for (int i = 0; i < 16; i++) {',
        '    float fi = float(i); float t = (fi + 0.5) / 16.0;',
        '    float a = fi * 2.3999632 + ign * 6.2831853;',
        '    vec2 uv = vUv + vec2(cos(a), sin(a)) * t * rpx / uRes;',
        '    vec3 v = vpos(uv) - P; float vv = dot(v, v); float vn = dot(v, N);',
        '    occ += max(0.0, vn - 0.02 * -P.z * 0.01) / (vv + 1.0) * max(0.0, 1.0 - vv / r2) * 8.0;',
        '  }',
        '  float ao = clamp(1.0 - uStrength * occ / 16.0, 0.35, 1.0);',
        '  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));',
        '  ao = mix(ao, 1.0, smoothstep(0.9, 2.0, l));',
        '  gl_FragColor = vec4(c.rgb * ao, c.a);',
        '}'
      ].join('\n')
    });
    var render0 = p.render;
    p.render = function (renderer, writeBuffer, readBuffer, dt, mask) {
      this.uniforms.tDepth.value = readBuffer.depthTexture;
      return render0.call(this, renderer, writeBuffer, readBuffer, dt, mask);
    };
    return p;
  }

  GL.init = function (canvas) {
    if (!THREE) return false;
    var r;
    try { r = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' }); } catch (e) { return false; }
    if (!r.capabilities.isWebGL2) return false;
    GL.renderer = r; GL.gl = r.getContext();
    tmpC = new THREE.Color();
    r.setPixelRatio(1);   // 画布尺寸由 platform.js 按设备像素比设置好了
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.0;   // 默认沿用原版；ART.aces 打开时换 ACES
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;   // r18x 起 PCFSoftShadowMap 已移除（会报警告），PCFShadowMap 本身已是柔化过滤
    var sc = GL.scene = new THREE.Scene();
    sc.fog = new THREE.Fog(0x7a5f80, 1300, 3000);
    sc.background = new THREE.Color(0x5e4a70);
    GL.camera = new THREE.PerspectiveCamera(30, 1, 30, 5000);
    GL.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    sc.add(GL.hemi);
    var sun = GL.sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 1.2;
    sun.shadow.camera.near = 100; sun.shadow.camera.far = 5000;
    sc.add(sun); sc.add(sun.target);
    // 英雄提灯的小暖光（唯一的点光源）：强度由 world3d 每帧按闪烁 / 施法闪光设置，0 = 关
    GL.lamp = new THREE.PointLight(0xffb347, 0, 190, 2);
    GL.lamp.castShadow = false;
    sc.add(GL.lamp);
    GL.ramp = toonRamp();
    U.uRim.value = new THREE.Vector4(0.37, 0.66, 0.78, 0.2);
    U.uCore.value = new THREE.Vector4(0, 0, 0, 0); U.uCoreCol.value = new THREE.Color(1, 0.5, 0.16);   // 圣火金偏余烬橙（线性空间）
    U.uFogLow.value = new THREE.Vector4(0, 40, 900, 1400);
    GL.mats = { std: [meshMaterial(false, false), meshMaterial(false, true)], water: [meshMaterial(true, false), meshMaterial(true, true)] };
    GL.matStd = GL.mats.std[0];
    GL.matWater = GL.mats.water[0];
    GL.matLine = lineMaterial(U.uLineW);     // 角色、敌人、道具
    GL.matLineB = lineMaterial(U.uLineWB);   // 建筑、塔、地形上的房屋和树
    GL.fxAdd = new Batch(3000, 16);
    GL.fxAlpha = new Batch(2000, 16);
    GL.fxAddMesh = fxMesh(GL.fxAdd, true); GL.fxAlphaMesh = fxMesh(GL.fxAlpha, false);
    sc.add(GL.fxAlphaMesh); sc.add(GL.fxAddMesh);
    // 后处理：多重采样 HDR 渲染（带深度）-> 环境光遮蔽 -> 泛光（只抓自发光和法术）-> 调色 + 暗角 -> ACES + sRGB
    var rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    rt.depthTexture = new THREE.DepthTexture(4, 4); rt.depthTexture.type = THREE.UnsignedIntType;
    var comp = GL.composer = new THREE.EffectComposer(r, rt);
    comp.addPass(new THREE.RenderPass(sc, GL.camera));
    GL.aoPass = aoPass();
    comp.addPass(GL.aoPass);
    GL.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, GL.BLOOM_THR);
    comp.addPass(GL.bloomPass);
    U.uGrade.value = new THREE.Vector4(1, 1, 0, 0);
    GL.gradePass = new THREE.ShaderPass({
      uniforms: { tDiffuse: { value: null }, uGrade: U.uGrade, uVig: { value: 0.22 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform vec4 uGrade; uniform float uVig; varying vec2 vUv;',
        'void main(){',
        '  vec4 c = texture2D(tDiffuse, vUv);',
        '  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));',
        '  c.rgb = mix(vec3(l), c.rgb, uGrade.x);',
        '  c.rgb = max(vec3(0.0), (c.rgb - 0.18) * uGrade.y + 0.18 + uGrade.w);',   // 以中灰为支点做对比度
        '  vec2 vd = (vUv - 0.5) * vec2(1.0, 0.78);',
        '  c.rgb *= 1.0 - uVig * smoothstep(0.28, 0.62, length(vd));',   // 轻微暗角，把视线收向画面中间
        '  gl_FragColor = c;',
        '}'
      ].join('\n')
    });
    comp.addPass(GL.gradePass);
    comp.addPass(new THREE.OutputPass());
    GL.ok = true;
    return true;
  };

  GL.resize = function (w, h) {
    if (!GL.renderer || (GL.rw === w && GL.rh === h)) return;
    GL.rw = w; GL.rh = h;
    GL.renderer.setSize(w, h, false);
    GL.composer.setSize(w, h);
    GL.bloomPass.resolution.set(w, h);
    GL.aoPass.uniforms.uRes.value.set(w, h);
  };

  // ---------- 网格上传：GB -> BufferGeometry + InstancedMesh（+ 描边外壳） ----------
  var INST_CAP = 160;
  GL.upload = function (gb, opts) {
    opts = opts || {};
    var src = gb.v, n = src.length / 10;
    var pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), em = new Float32Array(n), smo = new Float32Array(n * 3);
    var acc = {}, keys = new Array(n), i, o, k;
    for (i = 0; i < n; i++) {
      o = i * 10;
      pos[i * 3] = src[o]; pos[i * 3 + 1] = src[o + 1]; pos[i * 3 + 2] = src[o + 2];
      nor[i * 3] = src[o + 3]; nor[i * 3 + 1] = src[o + 4]; nor[i * 3 + 2] = src[o + 5];
      col[i * 3] = lin(src[o + 6]); col[i * 3 + 1] = lin(src[o + 7]); col[i * 3 + 2] = lin(src[o + 8]);
      em[i] = src[o + 9];
      k = Math.round(src[o] * 20) + ',' + Math.round(src[o + 1] * 20) + ',' + Math.round(src[o + 2] * 20);
      keys[i] = k;
      var a = acc[k] || (acc[k] = [0, 0, 0]);
      a[0] += src[o + 3]; a[1] += src[o + 4]; a[2] += src[o + 5];
    }
    for (i = 0; i < n; i++) {
      var sm = acc[keys[i]], l = Math.sqrt(sm[0] * sm[0] + sm[1] * sm[1] + sm[2] * sm[2]);
      if (l < 1e-4) { smo[i * 3] = nor[i * 3]; smo[i * 3 + 1] = nor[i * 3 + 1]; smo[i * 3 + 2] = nor[i * 3 + 2]; }
      else { smo[i * 3] = sm[0] / l; smo[i * 3 + 1] = sm[1] / l; smo[i * 3 + 2] = sm[2] / l; }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aEm', new THREE.BufferAttribute(em, 1));
    geo.setAttribute('aSmooth', new THREE.BufferAttribute(smo, 3));
    var mesh = { geo: geo, n: n, outline: true, shadow: true, count: 0 };
    if (opts.static) {
      mesh.obj = new THREE.Mesh(geo, opts.water ? GL.matWater : GL.matStd);
      mesh.obj.receiveShadow = true; mesh.obj.castShadow = !opts.water;
      mesh.water = !!opts.water;
      GL.scene.add(mesh.obj); GL.statics.push(mesh);
      if (!opts.water) { mesh.line = new THREE.Mesh(geo, GL.matLineB); GL.scene.add(mesh.line); }
      else mesh.outline = mesh.shadow = false;
      mesh.isStatic = true;
      return mesh;
    }
    var im = new THREE.InstancedMesh(geo, GL.matStd, INST_CAP);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(INST_CAP * 3), 3);
    im.instanceColor.setUsage(THREE.DynamicDrawUsage);
    var fl = new THREE.InstancedBufferAttribute(new Float32Array(INST_CAP), 1);
    fl.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iFlash', fl);
    im.count = 0; im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true;
    GL.scene.add(im);
    var ln = new THREE.InstancedMesh(geo, GL.matLine, INST_CAP);
    ln.instanceMatrix = im.instanceMatrix;   // 与本体共用实例矩阵和实例色（描边 = 本色压暗）
    ln.instanceColor = im.instanceColor;
    ln.count = 0; ln.frustumCulled = false;
    GL.scene.add(ln);
    mesh.obj = im; mesh.line = ln; mesh.flash = fl;
    GL.meshes.push(mesh);
    return mesh;
  };

  // 切换风格化光照开关：色阶要换材质，其余只改 uniform / 通道
  GL.setArt = function (flags) {
    var A = GL.ART, k;
    for (k in flags) if (k in A) A[k] = !!flags[k];
    if (!GL.renderer) return A;
    var t = A.toon ? 1 : 0;
    GL.matStd = GL.mats.std[t]; GL.matWater = GL.mats.water[t];
    GL.meshes.forEach(function (m) { m.obj.material = GL.matStd; });
    GL.statics.forEach(function (m) { m.obj.material = m.water ? GL.matWater : GL.matStd; });
    GL.renderer.toneMapping = A.aces ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
    U.uNoise.value = A.noise ? 0.12 : 0;
    U.uGradK.value = A.grad ? 1 : 0;
    U.uFogPierce.value = A.nightFog ? 1 : 0;
    return A;
  };

  // 建筑类网格（塔、兵营、圣火）用细一档的描边
  GL.lineBuilding = function (mesh) { if (mesh && mesh.line && !mesh.isStatic) mesh.line.material = GL.matLineB; };

  // 往网格里加一个实例：位置 (x, y 高度, z)、朝向、缩放 (sx, sy, sz)、前倾、着色 rgb、闪白
  // 变换 = 平移 · 绕 Y 转 -yaw · 绕 Z 转 tilt · 缩放（与旧着色器完全一致）
  GL.put = function (mesh, x, y, z, yaw, sx, sy, sz, tilt, r, g, b, flash) {
    if (mesh.count >= INST_CAP) return;
    var i = mesh.count++, e = mesh.obj.instanceMatrix.array, o = i * 16;
    var c = Math.cos(yaw), s = Math.sin(yaw), ct = Math.cos(tilt || 0), st = Math.sin(tilt || 0);
    e[o] = c * ct * sx; e[o + 1] = st * sx; e[o + 2] = s * ct * sx; e[o + 3] = 0;
    e[o + 4] = -c * st * sy; e[o + 5] = ct * sy; e[o + 6] = -s * st * sy; e[o + 7] = 0;
    e[o + 8] = -s * sz; e[o + 9] = 0; e[o + 10] = c * sz; e[o + 11] = 0;
    e[o + 12] = x; e[o + 13] = y; e[o + 14] = z; e[o + 15] = 1;
    var ca = mesh.obj.instanceColor.array;
    ca[i * 3] = r == null ? 1 : lin(r); ca[i * 3 + 1] = g == null ? 1 : lin(g); ca[i * 3 + 2] = b == null ? 1 : lin(b);
    mesh.flash.array[i] = flash || 0;
  };
  function commitInstances() {
    for (var i = 0; i < GL.meshes.length; i++) {
      var m = GL.meshes[i], im = m.obj, n = m.count;
      im.count = n;
      im.castShadow = m.shadow && GL.fx.shadow;
      m.line.count = m.outline && GL.fx.outline ? n : 0;
      if (n) {
        im.instanceMatrix.clearUpdateRanges(); im.instanceMatrix.addUpdateRange(0, n * 16); im.instanceMatrix.needsUpdate = true;
        im.instanceColor.clearUpdateRanges(); im.instanceColor.addUpdateRange(0, n * 3); im.instanceColor.needsUpdate = true;
        m.flash.clearUpdateRanges(); m.flash.addUpdateRange(0, n); m.flash.needsUpdate = true;
      }
    }
  }
  function resetInstances() { for (var i = 0; i < GL.meshes.length; i++) GL.meshes[i].count = 0; }

  // 切地图时拆掉旧的静态地形网格
  GL.removeStatic = function (mesh) {
    if (!mesh || !mesh.obj) return;
    GL.scene.remove(mesh.obj);
    var si = GL.statics.indexOf(mesh); if (si >= 0) GL.statics.splice(si, 1);
    if (mesh.line) GL.scene.remove(mesh.line);
    mesh.geo.dispose();
  };

  // ---------- 特效 ----------
  GL.addK = 1;   // 设置：特效亮度（只压叠加发光层，不影响模型和地面预警）
  function fxPush(B, cx, cy, cz, kind, ux, uy, uz, param, vx, vy, vz, r, g, b, a) {
    if (B.n >= B.cap) return;
    if (B === GL.fxAdd) a *= GL.addK;
    var o = B.n * 16, d = B.data;
    d[o] = cx; d[o + 1] = cy; d[o + 2] = cz; d[o + 3] = kind;
    d[o + 4] = ux; d[o + 5] = uy; d[o + 6] = uz; d[o + 7] = param;
    d[o + 8] = vx; d[o + 9] = vy; d[o + 10] = vz; d[o + 11] = 0;
    d[o + 12] = r; d[o + 13] = g; d[o + 14] = b; d[o + 15] = a;
    B.n++;
  }
  GL.fxPush = fxPush;
  // 贴地圆（kind 0 柔光 / 1 圆环 / 2 实心）
  GL.ground = function (add, x, y, z, rad, kind, param, col, a) {
    fxPush(add ? GL.fxAdd : GL.fxAlpha, x, y, z, kind, rad, 0, 0, param || 0, 0, 0, rad, col[0], col[1], col[2], a);
  };
  // 贴地光条：从 (x0,z0) 到 (x1,z1)，宽 w
  GL.streak = function (add, x0, y, z0, x1, z1, w, col, a) {
    var dx = (x1 - x0) / 2, dz = (z1 - z0) / 2, l = Math.sqrt(dx * dx + dz * dz) || 1;
    fxPush(add ? GL.fxAdd : GL.fxAlpha, x0 + dx, y, z0 + dz, 3, dx, 0, dz, 0, -dz / l * w, 0, dx / l * w, col[0], col[1], col[2], a);
  };
  // 立体光条（任意两点，朝向相机的宽度）
  GL.beam3 = function (add, x0, y0, z0, x1, y1, z1, w, col, a) {
    var dx = (x1 - x0) / 2, dy = (y1 - y0) / 2, dz = (z1 - z0) / 2;
    var cx = x0 + dx, cy = y0 + dy, cz = z0 + dz;
    var ex = GL.cam[0] - cx, ey = GL.cam[1] - cy, ez = GL.cam[2] - cz;
    var sx = dy * ez - dz * ey, sy = dz * ex - dx * ez, sz = dx * ey - dy * ex, sl = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1;
    fxPush(add ? GL.fxAdd : GL.fxAlpha, cx, cy, cz, 3, dx, dy, dz, 0, sx / sl * w, sy / sl * w, sz / sl * w, col[0], col[1], col[2], a);
  };
  // 面向相机的发光点
  GL.glow = function (x, y, z, rad, col, a, kind) {
    var R = GL.camRight, Up = GL.camUp;
    fxPush(GL.fxAdd, x, y, z, kind || 0, R[0] * rad, R[1] * rad, R[2] * rad, 0.3, Up[0] * rad, Up[1] * rad, Up[2] * rad, col[0], col[1], col[2], a);
  };
  function commitFx(mesh) {
    var B = mesh.userData.B, ib = mesh.userData.ib;
    mesh.geometry.instanceCount = B.n;
    if (B.n) { ib.clearUpdateRanges(); ib.addUpdateRange(0, B.n * 16); ib.needsUpdate = true; }
  }

  // ---------- 镜头 ----------
  GL.setCamera = function (eye, target, fovy, aspect) {
    var c = GL.camera;
    c.fov = fovy * 180 / Math.PI; c.aspect = aspect; c.updateProjectionMatrix();
    c.position.set(eye[0], eye[1], eye[2]); c.lookAt(target[0], target[1], target[2]);
    c.updateMatrixWorld();
    GL.view.set(c.matrixWorldInverse.elements); GL.proj.set(c.projectionMatrix.elements);
    M4.mul(GL.vp, GL.proj, GL.view);
    GL.cam[0] = eye[0]; GL.cam[1] = eye[1]; GL.cam[2] = eye[2];
    var v = GL.view;
    GL.camRight = [v[0], v[4], v[8]]; GL.camUp = [v[1], v[5], v[9]]; GL.camBack = [v[2], v[6], v[10]];   // camBack：从场景指向镜头
  };
  GL.updateBillboardAxes = function () {};
  // 世界坐标 -> NDC（返回 null 表示在相机后面）
  var PT = [0, 0, 0];
  GL.project = function (x, y, z) {
    var m = GL.vp;
    var cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.001) return null;
    PT[0] = cx / cw; PT[1] = cy / cw;
    return PT;
  };

  // ---------- 一帧：光照 / 雾 / 阴影范围 / 后处理，然后渲染 ----------
  // env: { light, sun, sky, ground, fog, clear, fogNear, fogFar, time, em, grade, shadowDark, line, bloom, thr }
  // shadowBox: { cx, cz, r } 阴影需要覆盖的地面范围
  GL.frame = function (env, shadowBox) {
    var sc = GL.scene, PI = Math.PI;
    U.uTime.value = env.time; U.uEmBoost.value = env.em;
    sc.background.copy(srgb(env.clear));
    sc.fog.color.copy(srgb(env.fog)); sc.fog.near = env.fogNear; sc.fog.far = env.fogFar;
    var amb = env.amb == null ? 1 : env.amb;   // 昼夜亮度倍率（夜晚约为白天的 35%）
    GL.hemi.color.copy(srgb(env.sky)); GL.hemi.groundColor.copy(srgb(env.ground)); GL.hemi.intensity = PI * 1.25 * amb;
    GL.sun.color.copy(srgb(env.sun)); GL.sun.intensity = PI * 1.05 * amb;
    var L = env.light, D = 2000, sb = shadowBox;
    GL.sun.position.set(sb.cx + L[0] * D, L[1] * D, sb.cz + L[2] * D);
    GL.sun.target.position.set(sb.cx, 0, sb.cz); GL.sun.target.updateMatrixWorld();
    var cam = GL.sun.shadow.camera;
    cam.left = -sb.r; cam.right = sb.r; cam.top = sb.r; cam.bottom = -sb.r; cam.far = D + 1500; cam.updateProjectionMatrix();
    GL.sun.castShadow = GL.fx.shadow;
    GL.sun.shadow.intensity = 1 - (env.shadowDark == null ? 0.45 : env.shadowDark);
    // 描边：本色压暗，略带环境色调；宽度按 960×540 的像素换算成「每单位距离的外扩量」
    var lc = env.line || [0.08, 0.06, 0.1];
    GL.matLine.color.setRGB(0.24 + lc[0] * 0.5, 0.22 + lc[1] * 0.5, 0.26 + lc[2] * 0.5); GL.matLineB.color.copy(GL.matLine.color);
    var perPx = 2 * Math.tan(GL.camera.fov * Math.PI / 360) / 540;
    U.uLineW.value = 2.0 * perPx; U.uLineWB.value = 1.5 * perPx;
    GL.matLineB.visible = GL.matLine.visible = GL.fx.outline;
    var gr = env.grade || [1, 1, 0, 0];
    U.uGrade.value.set(gr[0], gr[1], gr[2], gr[3]);
    // 冷色边缘光、斑驳、圣火暖光圈、低矮冷雾（world3d 的昼夜预设给参数）
    var rim = env.rim || [0.37, 0.66, 0.78, 0.2];
    var A = GL.ART;
    U.uRim.value.set(rim[0], rim[1], rim[2], A.rim ? rim[3] : 0);
    var cl = env.coreLight;
    if (cl) U.uCore.value.set(cl.x, cl.z, cl.r, A.coreLight ? cl.k : 0); else U.uCore.value.w = 0;
    // C1：按 chill 在白天端和夜晚端之间混合。参数只写在 RW.C1_LIGHT。
    var C1 = RW.C1_LIGHT, ck = env.chill || 0;
    if (C1) {
      var dC = C1.day, nC = C1.night, wC = C1.warm;
      U.uBand.value.set(C1.inner, C1.outer, wC.sat, dC.sat + (nC.sat - dC.sat) * ck);
      U.uGain.value.set(wC.gain, dC.gain + (nC.gain - dC.gain) * ck);
      U.uWarm.value.set(wC.tint[0], wC.tint[1], wC.tint[2]);
      U.uCool.value.set(dC.tint[0] + (nC.tint[0] - dC.tint[0]) * ck, dC.tint[1] + (nC.tint[1] - dC.tint[1]) * ck, dC.tint[2] + (nC.tint[2] - dC.tint[2]) * ck);
      U.uWarmAdd.value = dC.add + (nC.add - dC.add) * ck;
      U.uChill.value = ck;
    }
    // 低矮冷雾从光圈边缘往外 fogLow[2] 距离内渐浓
    var fl = env.fogLow || [0, 40, 360], r0 = cl ? cl.r : 600;
    U.uFogLow.value.set(A.nightFog ? fl[0] : 0, fl[1], r0, r0 + fl[2]);
    // 环境光遮蔽：画质开关 + 深度重建需要的投影矩阵
    GL.aoPass.enabled = GL.fx.ao && A.ao;
    GL.aoPass.uniforms.uProj.value.copy(GL.camera.projectionMatrix); GL.aoPass.uniforms.uProjInv.value.copy(GL.camera.projectionMatrixInverse);
    GL.gradePass.uniforms.uVig.value = env.vig == null ? 0.22 : env.vig;
    // 泛光：阈值固定在 HDR 1.05，普通受光表面不发光，只有自发光和法术光效会晕开
    GL.bloomPass.enabled = GL.fx.bloom;
    GL.bloomPass.strength = Math.min(0.9, (env.bloom || 0) * 0.9); GL.bloomPass.threshold = GL.BLOOM_THR; GL.bloomPass.radius = 0.45;
    commitInstances();
    commitFx(GL.fxAlphaMesh); commitFx(GL.fxAddMesh);
    var i;
    for (i = 0; i < GL.preRender.length; i++) GL.preRender[i]();
    GL.composer.render();
    for (i = 0; i < GL.postRender.length; i++) GL.postRender[i]();
    resetInstances(); GL.fxAdd.reset(); GL.fxAlpha.reset();
  };

  RW.GL = GL;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
