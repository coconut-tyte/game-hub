/* ==========================================
   SOUND MANAGER (Web Audio API – no files needed)
   ========================================== */
const SoundManager = (() => {
  let audioCtx = null;
  let enabled = JSON.parse(localStorage.getItem('gamehub-sound') ?? 'true');
  const btn = document.getElementById('sound-toggle');

  function getCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function beep(freq, dur, type = 'sine', vol = 0.15) {
    if (!enabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + dur);
    } catch(e) {}
  }

  const sounds = {
    click:   () => beep(440, 0.08, 'square', 0.1),
    move:    () => beep(523, 0.1, 'sine', 0.12),
    capture: () => { beep(300, 0.1, 'sawtooth', 0.15); setTimeout(() => beep(200, 0.1, 'sawtooth', 0.1), 80); },
    win:     () => { [523,659,784,1047].forEach((f,i) => setTimeout(() => beep(f, 0.2, 'sine', 0.18), i * 120)); },
    lose:    () => { [300,250,200,150].forEach((f,i) => setTimeout(() => beep(f, 0.2, 'sawtooth', 0.15), i * 100)); },
    score:   () => beep(880, 0.12, 'sine', 0.15),
    jump:    () => { beep(400, 0.05, 'square', 0.12); setTimeout(() => beep(600, 0.1, 'square', 0.1), 50); },
    eat:     () => beep(700, 0.08, 'sine', 0.12),
    button:  () => beep(392, 0.07, 'square', 0.08),
  };

  function updateBtn() {
    btn.textContent = enabled ? '🔊' : '🔇';
    localStorage.setItem('gamehub-sound', JSON.stringify(enabled));
  }

  btn.addEventListener('click', () => {
    enabled = !enabled;
    updateBtn();
  });

  updateBtn();

  return { play: (name) => sounds[name] && sounds[name](), isEnabled: () => enabled };
})();
