// Thung lũng hoa về đêm — tự dựng bằng three.js: địa hình, núi xa, sương, hoa/đom đóm (point sprites), bầu trời sao.
(() => {
const VS = `
attribute float aType; attribute float aSize; attribute vec3 aColor; attribute float aSeed; attribute vec3 aDir; attribute float aH;
uniform float uTime, uPix, uDisperse, uIntro, uDim, uAspect; uniform vec2 uMouse;
varying vec3 vCol; varying float vA, vType, vSeed, vBlur;
void main(){
  vec3 p = position; float t = uTime;
  if (aType < 1.5) p.xz += vec2(sin(t*.9+aSeed*30.+p.z*.15), cos(t*.8+aSeed*20.+p.x*.15))*(.12+.1*aH);
  if (aType > 2.5 && aType < 3.5) p += vec3(sin(t*.3*aSeed+aSeed*40.), sin(t*.25+aSeed*20.)*.6, cos(t*.28*aSeed+aSeed*30.))*2.5;
  float dsp = uDisperse * (aType < 1.5 ? 1. : .4);
  p += aDir*dsp*(6.+22.*aSeed) + vec3(0., dsp*(2.+4.*aSeed), 0.) + dsp*vec3(sin(t*.6+aSeed*30.), cos(t*.5+aSeed*17.), sin(t*.4+aSeed*9.))*1.2;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float dist = max(-mv.z, .01);
  float grow = 1.;
  if (aType < .5) grow = .2 + .8*smoothstep(190., 26., dist);
  else if (aType < 1.5) grow = .35 + .65*smoothstep(25., 110., dist);
  float fade = (1. - smoothstep(170., 300., dist)) * smoothstep(1., 6., dist);
  if (aType > 3.5) fade *= smoothstep(10., 45., dist);
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 d = (ndc - uMouse) * vec2(uAspect, 1.);
  float l = length(d), live = aType < 2.5 ? 1. : 0.;
  ndc += normalize(d + vec2(1e-5)) / vec2(uAspect, 1.) * (.22 * exp(-l*5.) * live);
  float glow = exp(-l*6.) * live;
  gl_Position = vec4(ndc * clip.w, clip.z, clip.w);
  gl_PointSize = clamp(aSize * grow * (1. + glow*1.2) * (1. - .35*uDisperse) * uPix * 620. / dist, 1., aType > 3.5 ? 420. : 140.);
  vBlur = aType < .5 ? smoothstep(18., 3., dist) : 0.;
  vCol = aColor * (1. + glow*1.6 + uDisperse*.6) * uDim;
  vA = fade * uIntro * (1. - .45*vBlur); vType = aType; vSeed = aSeed;
}`;
const FS = `
varying vec3 vCol; varying float vA, vType, vSeed, vBlur;
void main(){
  vec2 uv = gl_PointCoord - .5; float r = length(uv)*2., ang = atan(uv.y, uv.x), a; vec3 c = vCol;
  if (vType < .5) {
    float vr = floor(vSeed*4.), pn = vr < .5 ? 5. : vr < 1.5 ? 8. : vr < 2.5 ? 3. : 12.;
    float edge = .5 + .42*pow(abs(cos(ang*pn*.5 + vSeed*6.28)), .7), core = exp(-r*r*14.);
    a = smoothstep(edge, edge*.35, r)*.78 + core*.55 + exp(-r*r*3.)*.16;
    a = mix(a, smoothstep(1., .45, r)*.55, vBlur);
    c = mix(c, vec3(1., .93, .72), core*.75);
  } else if (vType < 1.5) a = smoothstep(1., .2, r)*.55;
  else if (vType > 3.5) a = exp(-r*r*3.)*.07;
  else a = exp(-r*r*6.);
  gl_FragColor = vec4(c, a * vA);
}`;
const TERRAIN_VS = 'varying vec3 vN, vW; void main(){ vN = normal; vW = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }';
const TERRAIN_FS = `varying vec3 vN, vW; uniform float uIntro;
void main(){
  vec3 n = normalize(vN), L = normalize(vec3(-.35,.5,.8));
  float l = max(dot(n, L), 0.);
  vec3 c = mix(vec3(.035,.10,.13), vec3(.07,.20,.18), smoothstep(-2., 12., vW.y)) * (.45 + 1.1*l);
  c += vec3(.10,.07,.22) * pow(1. - n.y, 2.);
  c = mix(c, vec3(.165,.088,.21), smoothstep(60., 380., length(vW - cameraPosition)));
  gl_FragColor = vec4(c * (.3 + .7*uIntro), 1.);
}`;
const RIDGE_VS = 'attribute float aH; varying float vH; varying vec3 vW; void main(){ vH = aH; vW = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }';
const RIDGE_FS = 'varying float vH; varying vec3 vW; uniform vec3 uTop, uBot; uniform float uIntro; void main(){ vec3 c = mix(uBot, uTop, smoothstep(0., 1., vH)); gl_FragColor = vec4(c * (.3 + .7*uIntro), 1.); }';
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hills = (x, z) => 9 * Math.sin(x * .02 + 1) * Math.cos(z * .017) + 5 * Math.sin(x * .045 + z * .03) + 2.2 * Math.sin(z * .11 + x * .04);
const gs = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.4;
const G = 150, SZ = 760, HALF = SZ / 2, CELL = SZ / G;

class Valley {
  constructor(root, onLoaded, onIntroDone, onProgress) {
    const T = THREE; this.T = T; this.onLoaded = onLoaded; this.onIntroDone = onIntroDone; this.onProgress = onProgress;
    this.box = root.querySelector('.js-canvas-container') || root;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(dpr); this.renderer.setClearColor(0x02030a, 1);
    this.box.appendChild(this.renderer.domElement);
    this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(62, 1, .1, 800);
    this.u = { uTime: { value: 0 }, uPix: { value: dpr }, uDisperse: { value: 0 }, uIntro: { value: 0 }, uDim: { value: 1 },
      uAspect: { value: 1 }, uMouse: { value: new T.Vector2(9, 9) } };
    this.build(); this.buildSky();
    this.pos = 0; this.target = 0; this.ease = 0; this.disp = 0; this.hover = false; this.interactive = true; this.dimTarget = 1;
    this.m = new T.Vector2(); this.mt = new T.Vector2(); this.moved = false; this.lastInput = performance.now();
    this.tilt = new T.Euler(); this.tq = new T.Quaternion(); this.intro = 0; this.last = performance.now(); this.frames = 0; this.tY = null;
    this.resize(); addEventListener('resize', () => this.resize());
    addEventListener('pointermove', (e) => { this.moved = true; this.mt.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); });
    addEventListener('wheel', (e) => { if (!this.interactive) return; this.target += e.deltaY * .00004; this.lastInput = performance.now(); }, { passive: true });
    addEventListener('touchstart', (e) => { this.tY = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchmove', (e) => { if (!this.interactive || this.tY == null) return; const y = e.touches[0].clientY;
      this.target += (this.tY - y) * .00004 * 20; this.tY = y; this.lastInput = performance.now(); }, { passive: true });
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  hAt(x, z) {
    const fx = (x + HALF) / CELL, fz = (z + HALF) / CELL, i = Math.max(0, Math.min(G - 1, Math.floor(fx))), j = Math.max(0, Math.min(G - 1, Math.floor(fz)));
    const tx = Math.min(1, Math.max(0, fx - i)), tz = Math.min(1, Math.max(0, fz - j)), h = this.hg, W = G + 1;
    return (h[j * W + i] * (1 - tx) + h[j * W + i + 1] * tx) * (1 - tz) + (h[(j + 1) * W + i] * (1 - tx) + h[(j + 1) * W + i + 1] * tx) * tz;
  }
  build() {
    const T = this.T, pts = [];
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, R = 130 + 35 * Math.sin(k * 2.3); pts.push(new T.Vector3(R * Math.cos(a), 0, R * Math.sin(a))); }
    this.curve = new T.CatmullRomCurve3(pts, true, 'centripetal');
    const S = this.curve.getSpacedPoints(720), S0 = this.curve.getSpacedPoints(360);
    // địa hình: thung lũng dọc đường bay, đồi cao dần ở hai bên
    const W = G + 1, hg = this.hg = new Float32Array(W * W);
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
      const x = -HALF + i * CELL, z = -HALF + j * CELL; let d = 1e12;
      for (const p of S0) { const dx = p.x - x, dz = p.z - z, dd = dx * dx + dz * dz; if (dd < d) d = dd; }
      hg[j * W + i] = 1.2 * Math.sin(x * .05) * Math.cos(z * .04) + sm(14, 75, Math.sqrt(d)) * (5 + hills(x, z) * .55);
    }
    const tp = new Float32Array(W * W * 3), idx = [];
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) tp.set([-HALF + i * CELL, hg[j * W + i], -HALF + j * CELL], (j * W + i) * 3);
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const a = j * W + i; idx.push(a, a + W, a + 1, a + 1, a + W, a + W + 1); }
    const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(tp, 3)); tg.setIndex(new T.BufferAttribute(new Uint32Array(idx), 1)); tg.computeVertexNormals();
    this.ground = new T.Mesh(tg, new T.ShaderMaterial({ vertexShader: TERRAIN_VS, fragmentShader: TERRAIN_FS, uniforms: { uIntro: this.u.uIntro } }));
    this.ground.frustumCulled = false; this.scene.add(this.ground);
    // hoa / lá / cỏ / đom đóm / sương
    const pal = ['#ffd1e8', '#ff9cc9', '#f5efe2', '#b9c8ff', '#c9a8ff', '#9ff0e0', '#ffd699'].map((c) => new T.Color(c));
    const leaf = ['#1d8a78', '#2fa58f', '#2a6f9a'].map((c) => new T.Color(c)), grass = new T.Color('#2b6c93'), dust = new T.Color('#ffe9a8'), mist = new T.Color('#5b4a9e');
    const N = [14000, 9000, 14000, 1400, 90], total = N.reduce((a, b) => a + b, 0);
    const pos = new Float32Array(total * 3), typ = new Float32Array(total), siz = new Float32Array(total), col = new Float32Array(total * 3), sd = new Float32Array(total), dir = new Float32Array(total * 3);
    const PALS = [['#ffd1e8', '#ff9cc9', '#ffc2dd'], ['#b9c8ff', '#8fa6ff', '#d0dcff'], ['#c9a8ff', '#b183ff', '#e0ccff'], ['#f5efe2', '#fff6d6', '#ffffff'], ['#9ff0e0', '#6fe3d0', '#c8fff4'], ['#ffd699', '#ffb86b', '#ffe2b3']].map((a) => a.map((c) => new T.Color(c)));
    const patches = Array.from({ length: 150 }, () => ({ k: Math.random() * 720 | 0, off: (Math.random() < .5 ? -1 : 1) * (4 + Math.random() * 22), rad: 3 + Math.random() * 7, p: PALS[Math.random() * PALS.length | 0] }));
    const hts = new Float32Array(total), stem = [];
    let n = 0;
    const put = (type, x, y, z, size, c, b, h = 0) => {
      pos.set([x, y, z], n * 3); typ[n] = type; siz[n] = size; col.set([c.r * b, c.g * b, c.b * b], n * 3); sd[n] = Math.random(); hts[n] = h; if (h > 0) stem.push(x, y - h, z, 0, sd[n], h, x, y, z, 1, sd[n], h);
      const dx = gs(), dy = Math.abs(gs()) * .8, dz = gs(), l = Math.hypot(dx, dy, dz) || 1; dir.set([dx / l, dy / l, dz / l], n * 3); n++;
    };
    for (let type = 0; type < 5; type++) for (let c = 0; c < N[type]; c++) {
      const k = Math.random() * 720 | 0, P = S[k], Q = S[k + 1], tx = Q.x - P.x, tz = Q.z - P.z, L = Math.hypot(tx, tz) || 1, nx = -tz / L, nz = tx / L;
      let off = gs() * [11, 20, 34, 26, 40][type]; if (type < 2) off = (off < 0 ? -1 : 1) * ((type ? 1.2 : 2.5) + Math.abs(off));
      const x = P.x + nx * off, z = P.z + nz * off, g = this.hAt(x, z);
      if (type === 0) {
        let fx = x, fz = z, fc = pal[Math.random() * pal.length | 0];
        if (Math.random() < .75) { const q = patches[Math.random() * patches.length | 0], P2 = S[q.k], Q2 = S[q.k + 1], ax = Q2.x - P2.x, az = Q2.z - P2.z, L2 = Math.hypot(ax, az) || 1;
          fx = P2.x - az / L2 * q.off + gs() * q.rad; fz = P2.z + ax / L2 * q.off + gs() * q.rad; fc = q.p[Math.random() * 3 | 0]; }
        const tall = Math.random() < .32, hh = tall ? .8 + Math.random() * 2.6 : 0;
        put(0, fx, this.hAt(fx, fz) + .25 + Math.random() * .5 + hh, fz, .55 + Math.random() * .7 + (tall ? .2 : 0), fc, 1.15, hh);
      }
      else if (type === 1) put(1, x, g + Math.random() * 1.2, z, 1.2 + Math.random() * 1.2, leaf[Math.random() * 3 | 0], .5 + Math.random() * .5);
      else if (type === 2) put(2, x, g + .1, z, .25 + Math.random() * .35, grass, .5);
      else if (type === 3) put(3, x, g + 1.5 + Math.random() * 10, z, .5 + Math.random() * .6, dust, 1);
      else put(4, x, g + 2 + Math.random() * 5, z, 55 + Math.random() * 55, mist, .9);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('aType', new T.BufferAttribute(typ, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(siz, 1)); geo.setAttribute('aColor', new T.BufferAttribute(col, 3));
    geo.setAttribute('aSeed', new T.BufferAttribute(sd, 1)); geo.setAttribute('aDir', new T.BufferAttribute(dir, 3)); geo.setAttribute('aH', new T.BufferAttribute(hts, 1));
    const mat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: this.u, transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending });
    this.points = new T.Points(geo, mat); this.points.frustumCulled = false; this.scene.add(this.points);
    this.buildStems(stem); this.buildTrees(S);
  }
  buildStems(a) {
    const T = this.T, m = a.length / 6, pos = new Float32Array(m * 3), at = new Float32Array(m), sd = new Float32Array(m), hh = new Float32Array(m);
    for (let i = 0; i < m; i++) { pos.set([a[i * 6], a[i * 6 + 1], a[i * 6 + 2]], i * 3); at[i] = a[i * 6 + 3]; sd[i] = a[i * 6 + 4]; hh[i] = a[i * 6 + 5]; }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aT', new T.BufferAttribute(at, 1));
    g.setAttribute('aSeed', new T.BufferAttribute(sd, 1)); g.setAttribute('aH', new T.BufferAttribute(hh, 1));
    this.stems = new T.LineSegments(g, new T.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: 'attribute float aT, aSeed, aH; uniform float uTime, uDisperse, uIntro; varying float vT, vA; void main(){ vec3 p = position;' +
        ' p.xz += vec2(sin(uTime*.9+aSeed*30.+p.z*.15), cos(uTime*.8+aSeed*20.+p.x*.15))*(.12+.1*aH)*aT; vec4 mv = modelViewMatrix*vec4(p,1.); float dist = max(-mv.z,.01);' +
        ' gl_Position = projectionMatrix*mv; vT = aT; vA = uIntro*(1.-uDisperse)*(1.-smoothstep(120.,230.,dist))*smoothstep(1.,6.,dist); }',
      fragmentShader: 'varying float vT, vA; uniform float uDim; void main(){ gl_FragColor = vec4(mix(vec3(.04,.2,.15), vec3(.3,.75,.55), vT)*uDim, .55*vA); }' }));
    this.stems.frustumCulled = false; this.scene.add(this.stems);
  }
  buildTrees(S) {
    const T = this.T, pos = [], hh = [];
    for (let c = 0; c < 480; c++) {
      const k = Math.random() * 720 | 0, P = S[k], Q = S[k + 1], tx = Q.x - P.x, tz = Q.z - P.z, L = Math.hypot(tx, tz) || 1, off = (Math.random() < .5 ? -1 : 1) * (30 + Math.random() * 100);
      const x = P.x - tz / L * off, z = P.z + tx / L * off; if (Math.abs(x) > HALF - 20 || Math.abs(z) > HALF - 20) continue;
      const g = this.hAt(x, z) - .5, h = 7 + Math.random() * 16, w = h * (.28 + Math.random() * .1);
      for (let t = 0; t < 3; t++) {
        const by = g + h * .28 * t, th = h * (1 - .28 * t) * .78, tw = w * (1 - .2 * t);
        for (let s = 0; s < 7; s++) { const a0 = s / 7 * 6.283, a1 = (s + 1) / 7 * 6.283;
          pos.push(x, by + th, z, x + Math.cos(a0) * tw, by, z + Math.sin(a0) * tw, x + Math.cos(a1) * tw, by, z + Math.sin(a1) * tw); hh.push(1, 0, 0); }
      }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('aH', new T.BufferAttribute(new Float32Array(hh), 1));
    this.trees = new T.Mesh(g, new T.ShaderMaterial({ side: T.DoubleSide, uniforms: { uIntro: this.u.uIntro },
      vertexShader: 'attribute float aH; varying float vH; varying vec3 vW; void main(){ vH = aH; vW = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'varying float vH; varying vec3 vW; uniform float uIntro; void main(){ vec3 c = mix(vec3(.012,.025,.05), vec3(.07,.13,.20), vH*vH); c = mix(c, vec3(.165,.088,.21), smoothstep(50.,360.,length(vW-cameraPosition))); gl_FragColor = vec4(c*(.3+.7*uIntro), 1.); }' }));
    this.trees.frustumCulled = false; this.scene.add(this.trees);
  }
  buildSky() {
    const T = this.T, u = this.u;
    this.sky = new T.Mesh(new T.SphereGeometry(650, 24, 14), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, depthTest: false, uniforms: { uIntro: u.uIntro },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'varying vec3 vP; uniform float uIntro; void main(){ float y = vP.y; vec3 top = vec3(.008,.012,.04), mid = vec3(.05,.07,.2), hor = vec3(.34,.17,.40);' +
        ' vec3 c = mix(hor, mid, smoothstep(-.02,.3,y)); c = mix(c, top, smoothstep(.2,.9,y)); c = mix(vec3(.04,.025,.08), c, smoothstep(-.35,-.02,y));' +
        ' gl_FragColor = vec4(c*(.3+.7*uIntro), 1.); }' }));
    this.sky.renderOrder = -3; this.sky.frustumCulled = false; this.scene.add(this.sky);
    // núi xa (hai lớp), đứng yên quanh gốc thế giới
    const ring = (R, H, seed, top, bot) => {
      const N = 180, p = [], ix = [], hh = [];
      for (let i = 0; i <= N; i++) {
        const th = i / N * Math.PI * 2, q = .5 + .5 * (Math.sin(th * 3 + seed) * .5 + Math.sin(th * 7 + seed * 2) * .3 + Math.sin(th * 19 + seed * 3) * .2), y = H * (.3 + .7 * q);
        p.push(R * Math.cos(th), -30, R * Math.sin(th), R * Math.cos(th), y, R * Math.sin(th)); hh.push(0, 1);
        if (i < N) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(p), 3)); g.setAttribute('aH', new T.BufferAttribute(new Float32Array(hh), 1)); g.setIndex(ix);
      const m = new T.Mesh(g, new T.ShaderMaterial({ side: T.DoubleSide, vertexShader: RIDGE_VS, fragmentShader: RIDGE_FS,
        uniforms: { uTop: { value: new T.Color(top) }, uBot: { value: new T.Color(bot) }, uIntro: u.uIntro } }));
      m.frustumCulled = false; this.scene.add(m);
    };
    ring(372, 95, 1.3, '#4a3478', '#53295f'); ring(330, 62, 4.1, '#1a1744', '#2a1a4e');
    const N = 2600, p = new Float32Array(N * 3), sz = new Float32Array(N), sd = new Float32Array(N), cl = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const y = Math.random() * 1.15 - .15, th = Math.random() * Math.PI * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), w = Math.random();
      p.set([Math.cos(th) * r * 600, y * 600, Math.sin(th) * r * 600], i * 3);
      sz[i] = 1.4 + Math.pow(Math.random(), 4) * 4.2; sd[i] = Math.random();
      cl.set(w < .2 ? [1, .82, .7] : w < .4 ? [.7, .8, 1] : [.95, .95, 1], i * 3);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('aSize', new T.BufferAttribute(sz, 1));
    g.setAttribute('aSeed', new T.BufferAttribute(sd, 1)); g.setAttribute('aColor', new T.BufferAttribute(cl, 3));
    this.stars = new T.Points(g, new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending,
      vertexShader: 'attribute float aSize, aSeed; attribute vec3 aColor; uniform float uTime, uPix; varying vec3 vC; varying float vT; void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.);' +
        ' float tw = .6 + .4*sin(uTime*(.7+aSeed*2.5)+aSeed*100.); vT = tw; vC = aColor; gl_PointSize = aSize*uPix*(.85+.3*tw); }',
      fragmentShader: 'varying vec3 vC; varying float vT; uniform float uIntro; void main(){ vec2 uv = gl_PointCoord-.5; float r = length(uv)*2.; float a = (exp(-r*r*6.) + .6*exp(-r*18.))*vT*uIntro; gl_FragColor = vec4(vC*a, a); }' }));
    this.stars.renderOrder = -2; this.stars.frustumCulled = false; this.scene.add(this.stars);
    const mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(new Float32Array([-.35 * 600, .5 * 600, .8 * 600]), 3));
    this.moon = new T.Points(mg, new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, depthTest: true, blending: T.AdditiveBlending,
      vertexShader: 'uniform float uPix; void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_PointSize = 150.*uPix; }',
      fragmentShader: 'uniform float uIntro; void main(){ vec2 uv = gl_PointCoord-.5; float d = length(uv)*2.; float a = (smoothstep(.2,.17,d) + .55*exp(-d*d*5.))*uIntro; gl_FragColor = vec4(vec3(.96,.93,.84)*a, a); }' }));
    this.moon.renderOrder = -2; this.moon.frustumCulled = false; this.scene.add(this.moon);
  }
  skipIntro() { this.intro = 1; }
  resize() {
    const w = this.box.clientWidth || innerWidth, h = this.box.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.u.uAspect.value = w / h;
  }
  setMode(m) { this.interactive = m === 'hero'; this.dimTarget = m === 'hero' ? 1 : .5; }
  startHoverTransition() { this.hover = true; window.GE?.audio.setMuffle(true); }
  stopHoverTransition() { this.hover = false; window.GE?.audio.setMuffle(false); }
  loop(now) {
    requestAnimationFrame(this.loop);
    try { this.step(now); }
    catch (e) { if (!this.err) { this.err = e; console.error('Valley lỗi:', e); this.onLoaded && this.onLoaded(); this.onIntroDone && this.onIntroDone(); } }
  }
  step(now) {
    if (document.hidden) { this.last = now; return; }
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; if (!(dt > 0)) return;
    const k = (s) => 1 - Math.exp(-dt * s), u = this.u;
    this.ease += ((this.hover ? 1 : 0) - this.ease) * k(this.hover ? 2.2 : 1.6);
    this.disp += ((this.hover ? 1 : 0) - this.disp) * k(1.8);
    const move = 1 - this.ease, prev = this.pos;
    if (this.frames > 3 && this.intro < 1) this.intro = Math.min(1, this.intro + dt / 6);
    const ip = this.intro, boost = ip < 1 ? 36 * (1 - ip) * (1 - ip) : 0;
    if (ip < 1 || now - this.lastInput > 1500) this.target += dt * ((boost + 2.4) / 900) * move * (this.interactive ? 1 : .7);
    this.pos += (this.target - this.pos) * k(3) * move;
    const speed = Math.abs(this.pos - prev) / dt * 900;
    document.documentElement.style.setProperty('--v', Math.min(.8, .25 + speed / 40).toFixed(3));
    u.uIntro.value = 1 - Math.pow(1 - this.intro, 3); this.onProgress && this.onProgress(this.intro);
    u.uDim.value += (this.dimTarget - u.uDim.value) * k(2);
    u.uTime.value += dt; u.uDisperse.value = this.disp;
    this.m.lerp(this.mt, k(4)); if (this.moved) u.uMouse.value.copy(this.m);
    const u0 = ((this.pos % 1) + 1) % 1, P = this.curve.getPointAt(u0), Q = this.curve.getPointAt((u0 + .012) % 1);
    this.camera.position.set(P.x, this.hAt(P.x, P.z) + 2.8 + Math.sin(u.uTime.value * .7) * .15, P.z);
    this.camera.lookAt(Q.x, this.hAt(Q.x, Q.z) + 4.0, Q.z);
    this.tilt.set(this.m.y * .08, -this.m.x * .12, 0); this.tq.setFromEuler(this.tilt); this.camera.quaternion.multiply(this.tq);
    this.sky.position.copy(this.camera.position); this.stars.position.copy(this.camera.position); this.moon.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
    if (++this.frames === 2) setTimeout(() => this.onLoaded && this.onLoaded(), 350);
    if (this.intro >= 1 && this.onIntroDone) this.onIntroDone();
  }
}
window.Valley = Valley;
})();
