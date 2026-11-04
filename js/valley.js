// Thung lũng hoa về đêm — tự dựng bằng three.js (point sprites + shader), lấy cảm hứng từ mô tả.
(() => {
const VS = `
attribute float aType; attribute float aSize; attribute vec3 aColor; attribute float aSeed; attribute vec3 aDir;
uniform float uTime, uPix, uDisperse, uIntro, uDim, uAspect; uniform vec2 uMouse;
varying vec3 vCol; varying float vA, vType;
void main(){
  vec3 p = position; float t = uTime;
  if (aType > 2.5) p += vec3(sin(t*.3*aSeed+aSeed*40.), sin(t*.25+aSeed*20.)*.6, cos(t*.28*aSeed+aSeed*30.))*2.5;
  float dsp = uDisperse * (aType < 1.5 ? 1. : .4);
  p += aDir*dsp*(6.+22.*aSeed) + vec3(0., dsp*(2.+4.*aSeed), 0.)
     + dsp*vec3(sin(t*.6+aSeed*30.), cos(t*.5+aSeed*17.), sin(t*.4+aSeed*9.))*1.2;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  float dist = max(-mv.z, .01);
  float grow = 1.;
  if (aType < .5) grow = .2 + .8*smoothstep(190., 26., dist);
  else if (aType < 1.5) grow = .35 + .65*smoothstep(25., 110., dist);
  float fade = (1. - smoothstep(170., 300., dist)) * smoothstep(1., 6., dist);
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 d = (ndc - uMouse) * vec2(uAspect, 1.);
  float l = length(d), live = aType < 2.5 ? 1. : 0.;
  ndc += normalize(d + vec2(1e-5)) / vec2(uAspect, 1.) * (.22 * exp(-l*5.) * live);
  float glow = exp(-l*6.) * live;
  gl_Position = vec4(ndc * clip.w, clip.z, clip.w);
  gl_PointSize = clamp(aSize * grow * (1. + glow*1.2) * (1. - .35*uDisperse) * uPix * 620. / dist, 1., 140.);
  vCol = aColor * (1. + glow*1.6 + uDisperse*.6) * uDim;
  vA = fade * uIntro; vType = aType;
}`;
const FS = `
varying vec3 vCol; varying float vA, vType;
void main(){
  vec2 uv = gl_PointCoord - .5; float r = length(uv)*2., ang = atan(uv.y, uv.x), a;
  if (vType < .5) { float pt = .62 + .38*cos(ang*5. + 1.2); a = smoothstep(pt, pt*.25, r)*.9 + exp(-r*r*7.)*.5; }
  else if (vType < 1.5) a = smoothstep(1., .2, r)*.55;
  else a = exp(-r*r*6.);
  gl_FragColor = vec4(vCol, a * vA);
}`;
const hgt = (x, z) => 6*Math.sin(x*.035)*Math.cos(z*.03) + 3.2*Math.sin(x*.08 + z*.06) + 1.5*Math.sin(z*.13);
const gs = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.4;

class Valley {
  constructor(root, onLoaded, onIntroDone, onProgress) {
    const T = THREE; this.T = T; this.onLoaded = onLoaded; this.onIntroDone = onIntroDone; this.onProgress = onProgress;
    this.box = root.querySelector('.js-canvas-container') || root;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(dpr); this.renderer.setClearColor(0x02030a, 1);
    this.box.appendChild(this.renderer.domElement);
    this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(62, 1, .1, 420);
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
  build() {
    const T = this.T, pts = [];
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, R = 130 + 35 * Math.sin(k * 2.3), x = R * Math.cos(a), z = R * Math.sin(a); pts.push(new T.Vector3(x, hgt(x, z) + 4.5, z)); }
    this.curve = new T.CatmullRomCurve3(pts, true, 'centripetal');
    const S = this.curve.getSpacedPoints(720);
    const pal = ['#ff7eb6', '#ffc2dd', '#f5efe2', '#9bb8ff', '#b69cff', '#7ff0d4', '#ffc46b'].map((c) => new T.Color(c));
    const leaf = ['#1d8a78', '#2fa58f', '#2a6f9a'].map((c) => new T.Color(c)), grass = new T.Color('#2b6c93'), dust = new T.Color('#ffe9a8');
    const N = [11000, 9000, 14000, 800], total = N.reduce((a, b) => a + b, 0);
    const pos = new Float32Array(total * 3), typ = new Float32Array(total), siz = new Float32Array(total), col = new Float32Array(total * 3), sd = new Float32Array(total), dir = new Float32Array(total * 3);
    let i = 0;
    const put = (type, x, y, z, size, c, b) => {
      pos.set([x, y, z], i * 3); typ[i] = type; siz[i] = size; col.set([c.r * b, c.g * b, c.b * b], i * 3); sd[i] = Math.random();
      const dx = gs(), dy = Math.abs(gs()) * .8, dz = gs(), n = Math.hypot(dx, dy, dz) || 1; dir.set([dx / n, dy / n, dz / n], i * 3); i++;
    };
    for (let type = 0; type < 4; type++) for (let n = 0; n < N[type]; n++) {
      const k = Math.random() * 720 | 0, P = S[k], Q = S[k + 1], tx = Q.x - P.x, tz = Q.z - P.z, L = Math.hypot(tx, tz) || 1, nx = -tz / L, nz = tx / L;
      let off = gs() * [11, 20, 34, 26][type]; if (type < 2) off = (off < 0 ? -1 : 1) * ((type ? 1.2 : 2.5) + Math.abs(off));
      const x = P.x + nx * off, z = P.z + nz * off, g = hgt(x, z) + off * off * .004;
      if (type === 0) put(0, x, g + .3 + Math.random() * .9, z, .9 + Math.random() * 1.1, pal[Math.random() * pal.length | 0], 1.6);
      else if (type === 1) put(1, x, g + Math.random() * 1.2, z, 1.2 + Math.random() * 1.2, leaf[Math.random() * 3 | 0], .5 + Math.random() * .5);
      else if (type === 2) put(2, x, g + .1, z, .25 + Math.random() * .35, grass, .5);
      else put(3, x, g + 2 + Math.random() * 14, z, .5 + Math.random() * .6, dust, 1);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('aType', new T.BufferAttribute(typ, 1));
    geo.setAttribute('aSize', new T.BufferAttribute(siz, 1)); geo.setAttribute('aColor', new T.BufferAttribute(col, 3));
    geo.setAttribute('aSeed', new T.BufferAttribute(sd, 1)); geo.setAttribute('aDir', new T.BufferAttribute(dir, 3));
    const mat = new T.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: this.u, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending });
    this.points = new T.Points(geo, mat); this.points.frustumCulled = false; this.scene.add(this.points);
  }
  buildSky() {
    const T = this.T, u = this.u;
    this.sky = new T.Mesh(new T.SphereGeometry(360, 24, 14), new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, depthTest: false, uniforms: { uIntro: u.uIntro },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'varying vec3 vP; uniform float uIntro; void main(){ float y = vP.y; vec3 top = vec3(.008,.012,.04), mid = vec3(.05,.07,.2), hor = vec3(.34,.17,.40);' +
        ' vec3 c = mix(hor, mid, smoothstep(-.05,.28,y)); c = mix(c, top, smoothstep(.2,.9,y)); c = mix(vec3(.01,.012,.03), c, smoothstep(-.35,-.02,y));' +
        ' gl_FragColor = vec4(c*(.3+.7*uIntro), 1.); }' }));
    this.sky.renderOrder = -3; this.sky.frustumCulled = false; this.scene.add(this.sky);
    const N = 2600, p = new Float32Array(N * 3), sz = new Float32Array(N), sd = new Float32Array(N), cl = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const y = Math.random() * 1.15 - .15, th = Math.random() * Math.PI * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), w = Math.random();
      p.set([Math.cos(th) * r * 340, y * 340, Math.sin(th) * r * 340], i * 3);
      sz[i] = 1.4 + Math.pow(Math.random(), 4) * 4.2; sd[i] = Math.random();
      cl.set(w < .2 ? [1, .82, .7] : w < .4 ? [.7, .8, 1] : [.95, .95, 1], i * 3);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('aSize', new T.BufferAttribute(sz, 1));
    g.setAttribute('aSeed', new T.BufferAttribute(sd, 1)); g.setAttribute('aColor', new T.BufferAttribute(cl, 3));
    this.stars = new T.Points(g, new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending,
      vertexShader: 'attribute float aSize, aSeed; attribute vec3 aColor; uniform float uTime, uPix; varying vec3 vC; varying float vT; void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.);' +
        ' float tw = .6 + .4*sin(uTime*(.7+aSeed*2.5)+aSeed*100.); vT = tw; vC = aColor; gl_PointSize = aSize*uPix*(.85+.3*tw); }',
      fragmentShader: 'varying vec3 vC; varying float vT; uniform float uIntro; void main(){ vec2 uv = gl_PointCoord-.5; float r = length(uv)*2.; float a = (exp(-r*r*6.) + .6*exp(-r*18.))*vT*uIntro; gl_FragColor = vec4(vC*a, a); }' }));
    this.stars.renderOrder = -2; this.stars.frustumCulled = false; this.scene.add(this.stars);
    const mg = new T.BufferGeometry(); mg.setAttribute('position', new T.BufferAttribute(new Float32Array([-.35 * 330, .5 * 330, .8 * 330]), 3));
    this.moon = new T.Points(mg, new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: T.AdditiveBlending,
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
    this.camera.position.set(P.x, P.y + Math.sin(u.uTime.value * .7) * .25, P.z); this.camera.lookAt(Q.x, Q.y - .6, Q.z);
    this.tilt.set(this.m.y * .08, -this.m.x * .12, 0); this.tq.setFromEuler(this.tilt); this.camera.quaternion.multiply(this.tq);
    this.sky.position.copy(this.camera.position); this.stars.position.copy(this.camera.position); this.moon.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
    if (++this.frames === 2) setTimeout(() => this.onLoaded && this.onLoaded(), 350);
    if (this.intro >= 1 && this.onIntroDone) this.onIntroDone();
  }
}
window.Valley = Valley;
})();
