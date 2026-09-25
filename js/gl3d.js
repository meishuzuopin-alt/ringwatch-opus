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
    ok: false, hex: hex, shade: shade, mix: mixc, M4: M4, GB: GB,
    view: new Float32Array(16), proj: new Float32Array(16), vp: new Float32Array(16),
    cam: [0, 0, 0], camRight: [1, 0, 0], camUp: [0, 1, 0],
    // 画质开关：阴影 / 描边 / 泛光。地址加 ?lowfx 全关；帧率持续偏低时 world3d 会逐级自动关闭
    fx: { shadow: true, outline: true, bloom: true },
    meshes: []
  };

  // ---------- 材质 ----------
  // 网格材质：顶点色 + 每顶点自发光强度（aEm）+ 每实例闪白（iFlash）
  var U = { uTime: { value: 0 }, uEmBoost: { value: 1 }, uGrade: { value: null }, uLineW: { value: 1.2 } };
  function meshMaterial(water) {
    var m = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 });
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uTime = U.uTime; sh.uniforms.uEmBoost = U.uEmBoost;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aEm;\nvarying float vEm;\nvarying float vFlash;\nvarying vec3 vWp;\nuniform float uTime;\n#ifdef USE_INSTANCING\nattribute float iFlash;\n#endif')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEm = aEm;\n#ifdef USE_INSTANCING\nvFlash = iFlash;\n#else\nvFlash = 0.0;\n#endif' +
          (water ? '\ntransformed.y += sin(transformed.x*0.05 + uTime*2.0)*2.0 + cos(transformed.z*0.06 + uTime*1.6)*2.0;' : ''))
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vEm;\nvarying float vFlash;\nvarying vec3 vWp;\nuniform float uTime;\nuniform float uEmBoost;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vEm * uEmBoost;' +
          (water ? '\nfloat s1 = sin(vWp.x*0.09 + uTime*1.7) * cos(vWp.z*0.07 - uTime*1.3);\ndiffuseColor.rgb *= 0.85 + 0.25*s1;\ntotalEmissiveRadiance += vec3(0.35,0.6,0.9) * smoothstep(0.82, 0.98, s1) * 0.8;' : ''))
        .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), vFlash);');
    };
    return m;
  }
  // 描边：背面外壳，沿平滑法线外扩（外扩量随离镜头距离变化，屏幕上粗细基本一致）
  function lineMaterial() {
    var m = new THREE.MeshBasicMaterial({ color: 0x1a1420, side: THREE.BackSide, fog: true });
    m.onBeforeCompile = function (sh) {
      sh.uniforms.uLineW = U.uLineW;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 aSmooth;\nuniform float uLineW;')
        .replace('#include <project_vertex>', [
          'vec4 wp0 = vec4(transformed, 1.0);',
          '#ifdef USE_INSTANCING', 'wp0 = instanceMatrix * wp0;', '#endif',
          'wp0 = modelMatrix * wp0;',
          'vec3 sn = aSmooth;',
          '#ifdef USE_INSTANCING', 'sn = mat3(instanceMatrix) * sn;', '#endif',
          'wp0.xyz += normalize(sn + vec3(0.0, 0.0001, 0.0)) * uLineW * length(cameraPosition - wp0.xyz) * 0.001;',
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

  GL.init = function (canvas) {
    if (!THREE) return false;
    var r;
    try { r = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' }); } catch (e) { return false; }
    if (!r.capabilities.isWebGL2) return false;
    GL.renderer = r; GL.gl = r.getContext();
    tmpC = new THREE.Color();
    r.setPixelRatio(1);   // 画布尺寸由 platform.js 按设备像素比设置好了
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.0;
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
    GL.matStd = meshMaterial(false);
    GL.matWater = meshMaterial(true);
    GL.matLine = lineMaterial();
    GL.fxAdd = new Batch(3000, 16);
    GL.fxAlpha = new Batch(2000, 16);
    GL.fxAddMesh = fxMesh(GL.fxAdd, true); GL.fxAlphaMesh = fxMesh(GL.fxAlpha, false);
    sc.add(GL.fxAlphaMesh); sc.add(GL.fxAddMesh);
    // 后处理：多重采样 HDR 渲染 -> 泛光 -> 调色 -> 色调映射 + sRGB
    var rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    var comp = GL.composer = new THREE.EffectComposer(r, rt);
    comp.addPass(new THREE.RenderPass(sc, GL.camera));
    GL.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.85);
    comp.addPass(GL.bloomPass);
    U.uGrade.value = new THREE.Vector4(1, 1, 0, 0);
    GL.gradePass = new THREE.ShaderPass({
      uniforms: { tDiffuse: { value: null }, uGrade: U.uGrade },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform vec4 uGrade; varying vec2 vUv;',
        'void main(){',
        '  vec4 c = texture2D(tDiffuse, vUv);',
        '  float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));',
        '  c.rgb = mix(vec3(l), c.rgb, uGrade.x);',
        '  c.rgb = max(vec3(0.0), (c.rgb - 0.18) * uGrade.y + 0.18 + uGrade.w);',   // 以中灰为支点做对比度
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
      GL.scene.add(mesh.obj);
      if (!opts.water) { mesh.line = new THREE.Mesh(geo, GL.matLine); GL.scene.add(mesh.line); }
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
    ln.instanceMatrix = im.instanceMatrix;   // 与本体共用实例矩阵
    ln.count = 0; ln.frustumCulled = false;
    GL.scene.add(ln);
    mesh.obj = im; mesh.line = ln; mesh.flash = fl;
    GL.meshes.push(mesh);
    return mesh;
  };

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
    GL.camRight = [v[0], v[4], v[8]]; GL.camUp = [v[1], v[5], v[9]];
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
    GL.hemi.color.copy(srgb(env.sky)); GL.hemi.groundColor.copy(srgb(env.ground)); GL.hemi.intensity = PI * 1.25;
    GL.sun.color.copy(srgb(env.sun)); GL.sun.intensity = PI * 1.05;
    var L = env.light, D = 2000, sb = shadowBox;
    GL.sun.position.set(sb.cx + L[0] * D, L[1] * D, sb.cz + L[2] * D);
    GL.sun.target.position.set(sb.cx, 0, sb.cz); GL.sun.target.updateMatrixWorld();
    var cam = GL.sun.shadow.camera;
    cam.left = -sb.r; cam.right = sb.r; cam.top = sb.r; cam.bottom = -sb.r; cam.far = D + 1500; cam.updateProjectionMatrix();
    GL.sun.castShadow = GL.fx.shadow;
    GL.sun.shadow.intensity = 1 - (env.shadowDark == null ? 0.45 : env.shadowDark);
    GL.matLine.color.copy(srgb(env.line || [0.08, 0.06, 0.1]));
    var gr = env.grade || [1, 1, 0, 0];
    U.uGrade.value.set(gr[0], gr[1], gr[2], gr[3]);
    GL.bloomPass.enabled = GL.fx.bloom;
    GL.bloomPass.strength = (env.bloom || 0) * 0.9; GL.bloomPass.threshold = 0.55 + (env.thr || 0.8) * 0.45; GL.bloomPass.radius = 0.5;
    commitInstances();
    commitFx(GL.fxAlphaMesh); commitFx(GL.fxAddMesh);
    GL.composer.render();
    resetInstances(); GL.fxAdd.reset(); GL.fxAlpha.reset();
  };

  RW.GL = GL;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
