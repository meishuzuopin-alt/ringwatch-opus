// 环带值守 · 自制轻量 WebGL 低多边形渲染器（无第三方依赖）
// 提供：矩阵工具、几何构建器（平面着色的方块/棱柱/圆柱/低模球）、实例化网格绘制、
// 发光/贴地特效四边形（加法或透明混合）、HUD 贴图合成。
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

  // ---------- 着色器 ----------
  var MESH_VS = [
    'attribute vec3 aPos; attribute vec3 aNorm; attribute vec4 aCol;',
    'attribute vec4 iA; attribute vec4 iB; attribute vec4 iC;',
    'uniform mat4 uVP; uniform vec3 uCam; uniform float uFogNear; uniform float uFogFar; uniform float uTime; uniform float uWater;',
    'varying vec3 vCol; varying float vEm; varying vec3 vN; varying float vFog; varying float vFlash; varying vec3 vW;',
    'void main(){',
    '  vec3 p = aPos * iB.xyz; vec3 n = aNorm;',
    '  float ct = cos(iB.w), st = sin(iB.w);',
    '  p = vec3(p.x*ct - p.y*st, p.x*st + p.y*ct, p.z); n = vec3(n.x*ct - n.y*st, n.x*st + n.y*ct, n.z);',
    '  float c = cos(iA.w), s = sin(iA.w);',
    '  p = vec3(p.x*c - p.z*s, p.y, p.x*s + p.z*c); n = vec3(n.x*c - n.z*s, n.y, n.x*s + n.z*c);',
    '  vec3 w = p + iA.xyz;',
    '  if (uWater > 0.5) { w.y += sin(w.x*0.05 + uTime*2.0)*2.0 + cos(w.z*0.06 + uTime*1.6)*2.0; }',
    '  vW = w;',
    '  gl_Position = uVP * vec4(w, 1.0);',
    '  vN = normalize(n); vCol = aCol.rgb * iC.rgb; vEm = aCol.a; vFlash = iC.a;',
    '  float d = length(w - uCam); vFog = clamp((d - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);',
    '}'
  ].join('\n');
  var MESH_FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec3 uLight; uniform vec3 uSun; uniform vec3 uSky; uniform vec3 uGround; uniform vec3 uFog; uniform float uTime; uniform float uWater; uniform float uEmBoost;',
    'varying vec3 vCol; varying float vEm; varying vec3 vN; varying float vFog; varying float vFlash; varying vec3 vW;',
    'void main(){',
    '  vec3 n = normalize(vN);',
    '  float dif = max(dot(n, uLight), 0.0);',
    '  vec3 amb = mix(uGround, uSky, n.y * 0.5 + 0.5);',
    '  vec3 col = vCol;',
    '  if (uWater > 0.5) {',
    '    float s1 = sin(vW.x*0.09 + uTime*1.7) * cos(vW.z*0.07 - uTime*1.3);',
    '    float sp = smoothstep(0.82, 0.98, s1);',
    '    col = col * (0.85 + 0.25*s1) + vec3(0.6,0.85,1.0)*sp*0.8;',
    '  }',
    '  vec3 c = col * (amb + uSun * dif) + col * vEm * uEmBoost;',
    '  c = mix(c, vec3(1.0), vFlash);',
    '  c = mix(c, uFog, vFog);',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n');
  // 特效四边形：中心 + 两个半轴向量；kind: 0 柔光圆 1 圆环 2 实心圆（阴影/填充） 3 光条
  var FX_VS = [
    'attribute vec2 aCorner; attribute vec4 iC; attribute vec4 iU; attribute vec4 iV; attribute vec4 iCol;',
    'uniform mat4 uVP;',
    'varying vec2 vUv; varying vec4 vCol; varying float vKind; varying float vParam;',
    'void main(){',
    '  vec3 w = iC.xyz + iU.xyz * aCorner.x + iV.xyz * aCorner.y;',
    '  gl_Position = uVP * vec4(w, 1.0);',
    '  vUv = aCorner; vCol = iCol; vKind = iC.w; vParam = iU.w;',
    '}'
  ].join('\n');
  var FX_FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'varying vec2 vUv; varying vec4 vCol; varying float vKind; varying float vParam;',
    'void main(){',
    '  float r = length(vUv); float a = 0.0;',
    '  if (vKind < 0.5) { a = pow(max(0.0, 1.0 - r), 1.6); }',
    '  else if (vKind < 1.5) { float t = max(vParam, 0.02); a = smoothstep(1.0, 1.0 - 0.15*t, r) * smoothstep(1.0 - t - 0.08, 1.0 - t, r); }',
    '  else if (vKind < 2.5) { a = smoothstep(1.0, 0.9 - vParam*0.5, r); }',
    '  else { float y = abs(vUv.y); float x = abs(vUv.x); a = pow(max(0.0, 1.0 - y), 1.5) * smoothstep(1.0, 0.7, x); }',
    '  if (a < 0.004) discard;',
    '  gl_FragColor = vec4(vCol.rgb, vCol.a * a);',
    '}'
  ].join('\n');
  var HUD_VS = 'attribute vec2 aCorner; varying vec2 vUv; void main(){ vUv = vec2(aCorner.x*0.5+0.5, 0.5-aCorner.y*0.5); gl_Position = vec4(aCorner, 0.0, 1.0); }';
  var HUD_FS = 'precision mediump float; uniform sampler2D uTex; varying vec2 vUv; void main(){ gl_FragColor = texture2D(uTex, vUv); }';

  function compile(gl, vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
    var info = { prog: p, a: {}, u: {} };
    var na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
    for (var i = 0; i < na; i++) { var at = gl.getActiveAttrib(p, i); info.a[at.name] = gl.getAttribLocation(p, at.name); }
    var nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var j = 0; j < nu; j++) { var un = gl.getActiveUniform(p, j); info.u[un.name] = gl.getUniformLocation(p, un.name); }
    return info;
  }

  // ---------- 实例批次：每帧往里塞实例，然后一次画完 ----------
  function Batch(cap, floats) { this.cap = cap; this.fl = floats; this.data = new Float32Array(cap * floats); this.n = 0; }
  Batch.prototype.reset = function () { this.n = 0; };

  var GL = {
    ok: false, hex: hex, shade: shade, mix: mixc, M4: M4, GB: GB,
    view: new Float32Array(16), proj: new Float32Array(16), vp: new Float32Array(16),
    cam: [0, 0, 0]
  };

  GL.init = function (canvas) {
    var gl = null;
    try { gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: true, premultipliedAlpha: false, preserveDrawingBuffer: false }); } catch (e) { gl = null; }
    if (!gl) try { gl = canvas.getContext('experimental-webgl'); } catch (e2) { gl = null; }
    if (!gl) return false;
    var inst = gl.getExtension('ANGLE_instanced_arrays');
    if (!inst) return false;
    GL.gl = gl; GL.inst = inst;
    GL.mesh = compile(gl, MESH_VS, MESH_FS);
    GL.fx = compile(gl, FX_VS, FX_FS);
    GL.hud = compile(gl, HUD_VS, HUD_FS);
    GL.quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, GL.quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    GL.instBuf = gl.createBuffer();
    GL.fxBuf = gl.createBuffer();
    GL.hudTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, GL.hudTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    GL.fxAdd = new Batch(3000, 16);
    GL.fxAlpha = new Batch(2000, 16);
    GL.ok = true;
    return true;
  };

  // 把 GB 上传成静态网格
  GL.upload = function (gb) {
    var gl = GL.gl, buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gb.v), gl.STATIC_DRAW);
    return { buf: buf, n: gb.count(), inst: new Batch(160, 12) };
  };

  GL.setCamera = function (eye, target, fovy, aspect) {
    M4.lookAt(GL.view, eye, target, [0, 1, 0]);
    M4.perspective(GL.proj, fovy, aspect, 30, 5000);
    M4.mul(GL.vp, GL.proj, GL.view);
    GL.cam[0] = eye[0]; GL.cam[1] = eye[1]; GL.cam[2] = eye[2];
    GL.eye = eye; GL.target = target;
  };
  // 世界坐标 -> NDC（返回 null 表示在相机后面）
  var PT = [0, 0, 0];
  GL.project = function (x, y, z) {
    var m = GL.vp;
    var cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.001) return null;
    PT[0] = cx / cw; PT[1] = cy / cw;
    return PT;
  };

  GL.beginFrame = function (vx, vy, vw, vh, clear) {
    var gl = GL.gl;
    gl.viewport(vx, vy, vw, vh);
    gl.enable(gl.SCISSOR_TEST); gl.scissor(vx, vy, vw, vh);
    gl.clearColor(clear[0], clear[1], clear[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.SCISSOR_TEST);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
    gl.disable(gl.BLEND);
  };

  // env: { light:[x,y,z], sun, sky, ground, fog, fogNear, fogFar, time, em }
  GL.useMesh = function (env) {
    var gl = GL.gl, P = GL.mesh;
    gl.useProgram(P.prog);
    gl.uniformMatrix4fv(P.u.uVP, false, GL.vp);
    gl.uniform3fv(P.u.uCam, GL.cam);
    gl.uniform3fv(P.u.uLight, env.light); gl.uniform3fv(P.u.uSun, env.sun); gl.uniform3fv(P.u.uSky, env.sky);
    gl.uniform3fv(P.u.uGround, env.ground); gl.uniform3fv(P.u.uFog, env.fog);
    gl.uniform1f(P.u.uFogNear, env.fogNear); gl.uniform1f(P.u.uFogFar, env.fogFar);
    gl.uniform1f(P.u.uTime, env.time); gl.uniform1f(P.u.uWater, 0); gl.uniform1f(P.u.uEmBoost, env.em);
  };
  function bindMeshAttribs(mesh) {
    var gl = GL.gl, P = GL.mesh;
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buf);
    gl.enableVertexAttribArray(P.a.aPos); gl.vertexAttribPointer(P.a.aPos, 3, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(P.a.aNorm); gl.vertexAttribPointer(P.a.aNorm, 3, gl.FLOAT, false, 40, 12);
    gl.enableVertexAttribArray(P.a.aCol); gl.vertexAttribPointer(P.a.aCol, 4, gl.FLOAT, false, 40, 24);
  }
  // 静态网格：用常量实例属性画一次
  GL.drawStatic = function (mesh, water) {
    var gl = GL.gl, P = GL.mesh;
    bindMeshAttribs(mesh);
    gl.disableVertexAttribArray(P.a.iA); gl.disableVertexAttribArray(P.a.iB); gl.disableVertexAttribArray(P.a.iC);
    gl.vertexAttrib4f(P.a.iA, 0, 0, 0, 0); gl.vertexAttrib4f(P.a.iB, 1, 1, 1, 0); gl.vertexAttrib4f(P.a.iC, 1, 1, 1, 0);
    gl.uniform1f(P.u.uWater, water ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.n);
    gl.uniform1f(P.u.uWater, 0);
  };
  // 往网格的实例批次里加一个：位置 (x, y 高度, z)、朝向、缩放 (sx, sy, sz)、前倾、着色 rgb、闪白
  GL.put = function (mesh, x, y, z, yaw, sx, sy, sz, tilt, r, g, b, flash) {
    var B = mesh.inst;
    if (B.n >= B.cap) return;
    var o = B.n * 12, d = B.data;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = yaw;
    d[o + 4] = sx; d[o + 5] = sy; d[o + 6] = sz; d[o + 7] = tilt || 0;
    d[o + 8] = r == null ? 1 : r; d[o + 9] = g == null ? 1 : g; d[o + 10] = b == null ? 1 : b; d[o + 11] = flash || 0;
    B.n++;
  };
  GL.drawInstances = function (mesh) {
    var B = mesh.inst;
    if (!B.n) return;
    var gl = GL.gl, P = GL.mesh, I = GL.inst;
    bindMeshAttribs(mesh);
    gl.bindBuffer(gl.ARRAY_BUFFER, GL.instBuf);
    gl.bufferData(gl.ARRAY_BUFFER, B.data.subarray(0, B.n * 12), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(P.a.iA); gl.vertexAttribPointer(P.a.iA, 4, gl.FLOAT, false, 48, 0); I.vertexAttribDivisorANGLE(P.a.iA, 1);
    gl.enableVertexAttribArray(P.a.iB); gl.vertexAttribPointer(P.a.iB, 4, gl.FLOAT, false, 48, 16); I.vertexAttribDivisorANGLE(P.a.iB, 1);
    gl.enableVertexAttribArray(P.a.iC); gl.vertexAttribPointer(P.a.iC, 4, gl.FLOAT, false, 48, 32); I.vertexAttribDivisorANGLE(P.a.iC, 1);
    I.drawArraysInstancedANGLE(gl.TRIANGLES, 0, mesh.n, B.n);
    I.vertexAttribDivisorANGLE(P.a.iA, 0); I.vertexAttribDivisorANGLE(P.a.iB, 0); I.vertexAttribDivisorANGLE(P.a.iC, 0);
    gl.disableVertexAttribArray(P.a.iA); gl.disableVertexAttribArray(P.a.iB); gl.disableVertexAttribArray(P.a.iC);
    B.reset();
  };

  // ---------- 特效 ----------
  // 通用：中心 c、半轴 u v（世界向量）、kind、param、颜色 rgba
  function fxPush(B, cx, cy, cz, kind, ux, uy, uz, param, vx, vy, vz, r, g, b, a) {
    if (B.n >= B.cap) return;
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
    var R = GL.camRight, U = GL.camUp;
    fxPush(GL.fxAdd, x, y, z, kind || 0, R[0] * rad, R[1] * rad, R[2] * rad, 0.3, U[0] * rad, U[1] * rad, U[2] * rad, col[0], col[1], col[2], a);
  };
  GL.camRight = [1, 0, 0]; GL.camUp = [0, 1, 0];
  GL.updateBillboardAxes = function () {
    var v = GL.view;
    GL.camRight = [v[0], v[4], v[8]];
    GL.camUp = [v[1], v[5], v[9]];
  };

  function drawFxBatch(B, additive) {
    if (!B.n) return;
    var gl = GL.gl, P = GL.fx, I = GL.inst;
    gl.useProgram(P.prog);
    gl.uniformMatrix4fv(P.u.uVP, false, GL.vp);
    gl.enable(gl.BLEND);
    if (additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.bindBuffer(gl.ARRAY_BUFFER, GL.quadBuf);
    gl.enableVertexAttribArray(P.a.aCorner); gl.vertexAttribPointer(P.a.aCorner, 2, gl.FLOAT, false, 8, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, GL.fxBuf);
    gl.bufferData(gl.ARRAY_BUFFER, B.data.subarray(0, B.n * 16), gl.DYNAMIC_DRAW);
    var names = ['iC', 'iU', 'iV', 'iCol'];
    for (var i = 0; i < 4; i++) {
      var loc = P.a[names[i]];
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 64, i * 16); I.vertexAttribDivisorANGLE(loc, 1);
    }
    I.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, B.n);
    for (var j = 0; j < 4; j++) { var l2 = P.a[names[j]]; I.vertexAttribDivisorANGLE(l2, 0); gl.disableVertexAttribArray(l2); }
    gl.disableVertexAttribArray(P.a.aCorner);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    B.reset();
  }
  GL.flushFx = function () { drawFxBatch(GL.fxAlpha, false); drawFxBatch(GL.fxAdd, true); };
  GL.flushAlpha = function () { drawFxBatch(GL.fxAlpha, false); };
  GL.flushAdd = function () { drawFxBatch(GL.fxAdd, true); };

  // ---------- HUD：把 2D 画布整张贴到屏幕上 ----------
  GL.drawHud = function (canvas, w, h) {
    var gl = GL.gl, P = GL.hud;
    gl.viewport(0, 0, w, h);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(P.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, GL.hudTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.uniform1i(P.u.uTex, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, GL.quadBuf);
    gl.enableVertexAttribArray(P.a.aCorner); gl.vertexAttribPointer(P.a.aCorner, 2, gl.FLOAT, false, 8, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(P.a.aCorner);
    gl.disable(gl.BLEND);
  };

  RW.GL = GL;
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
