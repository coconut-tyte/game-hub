// Âm thanh nền tự tổng hợp bằng WebAudio (không cần file mp3). Bắt đầu ở trạng thái tắt tiếng.
window.GE = { audio: (() => {
  let ctx, master, lp, dl, muted = true, inited = false;
  const api = {
    get isInitialized() { return inited; },
    initAudio() { inited = true; },
    ensure() {
      if (ctx) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0;
      lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = .4;
      master.connect(lp); lp.connect(ctx.destination);
      [55, 82.41, 110, 164.81].forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f * (1 + (i - 1.5) * .002);
        const g = ctx.createGain(); g.gain.value = .05 / (1 + i * .4);
        const lfo = ctx.createOscillator(); lfo.frequency.value = .05 + i * .03;
        const lg = ctx.createGain(); lg.gain.value = .02; lfo.connect(lg); lg.connect(g.gain);
        o.connect(g); g.connect(master); o.start(); lfo.start();
      });
      dl = ctx.createDelay(1.5); dl.delayTime.value = .55;
      const fb = ctx.createGain(); fb.gain.value = .45; dl.connect(fb); fb.connect(dl); dl.connect(master);
      const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
      setInterval(() => {
        if (muted || ctx.state !== 'running' || Math.random() > .6) return;
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = notes[Math.random() * notes.length | 0];
        const g = ctx.createGain(), t = ctx.currentTime;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.06, t + .03); g.gain.exponentialRampToValueAtTime(.0008, t + 2.2);
        o.connect(g); g.connect(master); g.connect(dl); o.start(t); o.stop(t + 2.4);
      }, 1800);
    },
    toggleMute() {
      api.ensure(); ctx.resume(); muted = !muted;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(muted ? 0 : .8, ctx.currentTime + 1.2);
      return muted;
    },
    setMuffle(on) { if (!ctx) return; lp.frequency.cancelScheduledValues(ctx.currentTime); lp.frequency.linearRampToValueAtTime(on ? 380 : 2400, ctx.currentTime + .8); },
  };
  return api;
})() };
