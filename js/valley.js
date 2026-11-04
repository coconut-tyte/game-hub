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
  if (aType < .5) grow = smoothstep(150., 22., dist);
  else if (aType < 1.5) grow = .35 + .65*smoothstep(25., 110., dist);
  float fade = (1. - smoothstep(120., 260., dist)) * smoothstep(1., 6., dist);
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 d = (ndc - uMouse) * vec2(uAspect, 1.);
  float l = length(d), live = aType < 2.5 ? 1. : 0.;
  ndc += normalize(d + vec2(1e-5)) / vec2(uAspect, 1.) * (.22 * exp(-l*5.) * live);
  float glow = exp(-l*6.) * live;
  gl_Position = vec4(ndc * clip.w, clip.z, clip.w);
  gl_PointSize = clamp(aSize * grow * (1. + glow*1.2) * (1. - .35*uDisperse) * uPix * 520. / dist, 1., 140.);
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
  constructor(root, onLoaded, onIntroDone) {
    const T = THREE; this.T = T; this.onLoaded = onLoaded; this.onIntroDone = onIntroDone;
    this.box = root.querySelector('.js-canvas-container') || root;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer = new T.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(dpr); this.renderer.setClearColor(0x02030a, 1);
    this.box.appendChild(this.renderer.domElement);
    this.scene = new T.Scene(); this.camera = new T.PerspectiveCamera(62, 1, .1, 420);
    this.u = { uTime: { value: 0 }, uPix: { value: dpr }, uDisperse: { value: 0 }, uIntro: { value: 0 }, uDim: { value: 1 },
      uAspect: { value: 1 }, uMouse: { value: new T.Vector2(9, 9) } };
    this.build();
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
    const N = [9000, 8000, 12000, 700], total = N.reduce((a, b) => a + b, 0);
    const pos = new Float32Array(total * 3), typ = new Float32Array(total), siz = new Float32Array(total), col = new Float32Array(total * 3), sd = new Float32Array(total), dir = new Float32Array(total * 3);
    let i = 0;
    const put = (type, x, y, z, size, c, b) => {
      pos.set([x, y, z], i * 3); typ[i] = type; siz[i] = size; col.set([c.r * b, c.g * b, c.b * b], i * 3); sd[i] = Math.random();
      const dx = gs(), dy = Math.abs(gs()) * .8, dz = gs(), n = Math.hypot(dx, dy, dz) || 1; dir.set([dx / n, dy / n, dz / n], i * 3); i++;
    };
    for (let type = 0; type < 4; type++) for (let n = 0; n < N[type]; n++) {
      const k = Math.random() * 720 | 0, P = S[k], Q = S[k + 1], tx = Q.x - P.x, tz = Q.z - P.z, L = Math.hypot(tx, tz) || 1, nx = -tz / L, nz = tx / L;
      let off = gs() * [16, 22, 34, 26][type]; if (type < 2) off = (off < 0 ? -1 : 1) * ((type ? 1.2 : 2.5) + Math.abs(off));
      const x = P.x + nx * off, z = P.z + nz * off, g = hgt(x, z) + off * off * .004;
      if (type === 0) put(0, x, g + .3 + Math.random() * .9, z, .9 + Math.random() * 1.1, pal[Math.random() * pal.length | 0], 1.3);
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
  resize() {
    const w = this.box.clientWidth || innerWidth, h = this.box.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.u.uAspect.value = w / h;
  }
  setMode(m) { this.interactive = m === 'hero'; this.dimTarget = m === 'hero' ? 1 : .5; }
  startHoverTransition() { this.hover = true; window.GE?.audio.setMuffle(true); }
  stopHoverTransition() { this.hover = false; window.GE?.audio.setMuffle(false); }
  loop(now) {
    requestAnimationFrame(this.loop);
    if (document.hidden) { this.last = now; return; }
    const dt = Math.min(.05, (now - this.last) / 1000); this.last = now; if (!dt) return;
    const k = (s) => 1 - Math.exp(-dt * s), u = this.u;
    this.ease += ((this.hover ? 1 : 0) - this.ease) * k(this.hover ? 2.2 : 1.6);
    this.disp += ((this.hover ? 1 : 0) - this.disp) * k(1.8);
    const move = 1 - this.ease, prev = this.pos;
    if (now - this.lastInput > 1500) this.target += dt * .0012 * move * (this.interactive ? 1 : .7);
    this.pos += (this.target - this.pos) * k(3) * move;
    const speed = Math.abs(this.pos - prev) / dt * 900;
    document.documentElement.style.setProperty('--v', Math.min(.8, .25 + speed / 40).toFixed(3));
    if (this.frames > 3 && this.intro < 1) this.intro = Math.min(1, this.intro + dt / 3.2);
    u.uIntro.value = 1 - Math.pow(1 - this.intro, 3);
    u.uDim.value += (this.dimTarget - u.uDim.value) * k(2);
    u.uTime.value += dt; u.uDisperse.value = this.disp;
    this.m.lerp(this.mt, k(4)); if (this.moved) u.uMouse.value.copy(this.m);
    const u0 = ((this.pos % 1) + 1) % 1, P = this.curve.getPointAt(u0), Q = this.curve.getPointAt((u0 + .012) % 1);
    this.camera.position.set(P.x, P.y + Math.sin(u.uTime.value * .7) * .25, P.z); this.camera.lookAt(Q.x, Q.y - .6, Q.z);
    this.tilt.set(this.m.y * .08, -this.m.x * .12, 0); this.tq.setFromEuler(this.tilt); this.camera.quaternion.multiply(this.tq);
    this.renderer.render(this.scene, this.camera);
    if (++this.frames === 2) setTimeout(() => this.onLoaded && this.onLoaded(), 350);
    if (this.intro >= 1 && this.onIntroDone) this.onIntroDone();
  }
}
window.Valley = Valley;
})();
