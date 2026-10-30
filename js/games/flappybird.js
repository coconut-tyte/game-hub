/**
 * Flappy Bird Game
 * Full canvas-based implementation. No external libraries required.
 * Integrates with GameRegistry, GameModal, UIManager, SoundManager, StreakManager.
 */
(function () {
  'use strict';

  // ─── State ────────────────────────────────────────────────────────────────
  let animId = null;
  let canvas, ctx;
  let gameState = 'idle'; // 'idle' | 'playing' | 'dead'
  let score = 0;
  let highScore = 0;
  let currentMode = 'normal';

  // ─── Difficulty configs ───────────────────────────────────────────────────
  const DIFFICULTIES = {
    easy:    { gravity: 0.25, flapPower: -5.5, pipeSpeed: 2.0, pipeInterval: 110, gapSize: 175 },
    normal:  { gravity: 0.35, flapPower: -6.5, pipeSpeed: 2.8, pipeInterval:  90, gapSize: 145 },
    hard:    { gravity: 0.45, flapPower: -7.5, pipeSpeed: 3.8, pipeInterval:  70, gapSize: 115 },
    reverse: { gravity: -0.32, flapPower: 6.2, pipeSpeed: 2.6, pipeInterval:  90, gapSize: 150 },
  };

  // ─── Constants ────────────────────────────────────────────────────────────
  const W = 400;
  const H = 500;
  const GROUND_H = 60;
  const BIRD_R = 16;
  const PIPE_W = 52;
  const PIPE_COLOR_BODY = '#3aaa35';
  const PIPE_COLOR_EDGE = '#2d8a29';
  const PIPE_COLOR_CAP  = '#4ecf48';

  // ─── Bird ─────────────────────────────────────────────────────────────────
  let bird = {};
  let wingAngle = 0;
  let wingDir = 1;
  let deathRotation = 0;

  // ─── Pipes ────────────────────────────────────────────────────────────────
  let pipes = [];
  let frameCount = 0;
  let pipesPassed = 0;

  // ─── Ground scroll ────────────────────────────────────────────────────────
  let groundX = 0;

  // ─── Clouds ───────────────────────────────────────────────────────────────
  let clouds = [];

  // ─── Event handlers (kept as named refs for removal) ──────────────────────
  let _keyHandler = null;
  let _clickHandler = null;
  let _touchHandler = null;

  // ──────────────────────────────────────────────────────────────────────────
  // Init / Reset
  // ──────────────────────────────────────────────────────────────────────────
  function initGame(modeId) {
    currentMode = modeId || 'normal';
    score = 0;
    frameCount = 0;
    pipesPassed = 0;
    pipes = [];
    groundX = 0;
    gameState = 'idle';
    deathRotation = 0;
    wingAngle = 0;
    wingDir = 1;

    bird = {
      x: 100,
      y: H / 2 - 30,
      vy: 0,
      alive: true,
    };

    // Seed clouds
    clouds = [];
    for (let i = 0; i < 4; i++) {
      clouds.push(createCloud((Math.random() * W * 1.2) | 0));
    }

    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  function createCloud(x) {
    return {
      x,
      y: (20 + Math.random() * 120) | 0,
      w: (60 + Math.random() * 70) | 0,
      h: (25 + Math.random() * 20) | 0,
      speed: 0.4 + Math.random() * 0.4,
    };
  }

  function restartGame() {
    initGame(currentMode);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Input
  // ──────────────────────────────────────────────────────────────────────────
  function flap() {
    if (gameState === 'dead') return;
    if (gameState === 'idle') gameState = 'playing';
    const cfg = DIFFICULTIES[currentMode];
    bird.vy = cfg.flapPower;
    SoundManager.play('jump');
  }

  function setupListeners() {
    _keyHandler = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        flap();
      }
    };
    _clickHandler = () => flap();
    _touchHandler = (e) => { e.preventDefault(); flap(); };

    document.addEventListener('keydown', _keyHandler);
    canvas.addEventListener('click', _clickHandler);
    canvas.addEventListener('touchstart', _touchHandler, { passive: false });
  }

  function removeListeners() {
    if (_keyHandler)  document.removeEventListener('keydown', _keyHandler);
    if (_clickHandler) canvas.removeEventListener('click', _clickHandler);
    if (_touchHandler) canvas.removeEventListener('touchstart', _touchHandler);
    _keyHandler = _clickHandler = _touchHandler = null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Update
  // ──────────────────────────────────────────────────────────────────────────
  function update() {
    const cfg = DIFFICULTIES[currentMode];

    if (gameState === 'idle') {
      // Gentle bob while waiting
      bird.y = H / 2 - 30 + Math.sin(frameCount * 0.05) * 8;
      wingAngle += 0.12 * wingDir;
      if (Math.abs(wingAngle) > 0.45) wingDir *= -1;
      frameCount++;
      return;
    }

    if (gameState === 'dead') {
      // Tumble bird down
      deathRotation += 0.12;
      bird.vy += cfg.gravity;
      bird.y += bird.vy;
      return;
    }

    // ── Playing ──
    frameCount++;

    // Bird physics
    bird.vy += cfg.gravity;
    bird.y += bird.vy;

    // Wing animation
    wingAngle += 0.18 * wingDir;
    if (Math.abs(wingAngle) > 0.55) wingDir *= -1;

    // Ground scroll
    groundX -= cfg.pipeSpeed;
    if (groundX <= -20) groundX = 0;

    // Cloud scroll
    for (const c of clouds) {
      c.x -= c.speed;
      if (c.x + c.w < -20) {
        c.x = W + 20;
        c.y = (20 + Math.random() * 120) | 0;
        c.w = (60 + Math.random() * 70) | 0;
        c.h = (25 + Math.random() * 20) | 0;
      }
    }

    // Spawn pipes
    if (frameCount % cfg.pipeInterval === 0) {
      spawnPipe(cfg);
    }

    // Move pipes
    for (const p of pipes) {
      p.x -= cfg.pipeSpeed;
    }

    // Score passing pipes
    for (const p of pipes) {
      if (!p.passed && p.x + PIPE_W < bird.x - BIRD_R) {
        p.passed = true;
        score++;
        pipesPassed++;
        GameModal.setScore(score);
        SoundManager.play('score');
        if (score > highScore) {
          highScore = score;
        }
      }
    }

    // Remove off-screen pipes
    pipes = pipes.filter(p => p.x + PIPE_W > -10);

    // Collision detection
    if (checkCollision(cfg)) {
      killBird();
    }
  }

  function spawnPipe(cfg) {
    const minY = 60;
    const maxY = H - GROUND_H - cfg.gapSize - 60;
    const gapTop = minY + Math.random() * (maxY - minY);
    pipes.push({
      x: W + 10,
      gapTop,
      gapBottom: gapTop + cfg.gapSize,
      passed: false,
    });
  }

  function checkCollision(cfg) {
    const hitR = BIRD_R - 3; // Slightly forgiving hitbox

    // Ground collision
    if (bird.y + hitR >= H - GROUND_H) return true;
    // Ceiling collision
    if (bird.y - hitR <= 0) return true;

    // Pipe collision (AABB)
    for (const p of pipes) {
      const bLeft  = bird.x - hitR;
      const bRight = bird.x + hitR;
      const bTop   = bird.y - hitR;
      const bBot   = bird.y + hitR;

      const pLeft  = p.x;
      const pRight = p.x + PIPE_W;

      if (bRight > pLeft && bLeft < pRight) {
        if (bTop < p.gapTop || bBot > p.gapBottom) return true;
      }
    }
    return false;
  }

  function killBird() {
    if (gameState === 'dead') return;
    gameState = 'dead';
    bird.alive = false;
    SoundManager.play('lose');

    const isNewHigh = score > 0 && score >= highScore;

    StreakManager.recordScore('flappybird', score);

    setTimeout(() => {
      if (isNewHigh && score > 0) {
        UIManager.toast(`🏆 Kỷ lục mới: ${score}!`, 'success');
      }
      UIManager.showLoss({
        title: `Game Over! Điểm: ${score}`,
        emoji: '💀',
        gameId: 'flappybird',
        score: score,
        onPlayAgain: restartGame,
      });
    }, 800);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Draw
  // ──────────────────────────────────────────────────────────────────────────
  function draw() {
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
    sky.addColorStop(0, '#70c5ce');
    sky.addColorStop(1, '#b8e8f0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H - GROUND_H);

    // Clouds
    drawClouds();

    // Pipes
    drawPipes();

    // Ground
    drawGround();

    // Bird
    drawBird();

    // HUD
    drawHUD();

    // Idle prompt
    if (gameState === 'idle') {
      drawIdlePrompt();
    }
  }

  function drawClouds() {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const c of clouds) {
      drawCloud(c.x, c.y, c.w, c.h);
    }
    ctx.restore();
  }

  function drawCloud(x, y, w, h) {
    ctx.beginPath();
    ctx.ellipse(x + w * 0.25, y + h * 0.6, w * 0.25, h * 0.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.5,  y + h * 0.4, w * 0.3,  h * 0.6, 0, 0, Math.PI * 2);
    ctx.ellipse(x + w * 0.75, y + h * 0.6, w * 0.22, h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPipes() {
    for (const p of pipes) {
      // Top pipe
      drawPipePair(p.x, 0, p.gapTop, true);
      // Bottom pipe
      drawPipePair(p.x, p.gapBottom, H - GROUND_H, false);
    }
  }

  function drawPipePair(x, yStart, yEnd, isTop) {
    const h = yEnd - yStart;
    if (h <= 0) return;
    const capH = 16;
    const capW = PIPE_W + 8;
    const capX = x - 4;

    ctx.save();

    // Pipe body
    ctx.fillStyle = PIPE_COLOR_BODY;
    ctx.fillRect(x, yStart, PIPE_W, h);

    // Pipe shading (left highlight)
    ctx.fillStyle = PIPE_COLOR_CAP;
    ctx.fillRect(x + 4, yStart, 8, h);

    // Pipe shading (right shadow)
    ctx.fillStyle = PIPE_COLOR_EDGE;
    ctx.fillRect(x + PIPE_W - 8, yStart, 8, h);

    // Cap
    ctx.fillStyle = PIPE_COLOR_BODY;
    if (isTop) {
      roundRect(ctx, capX, yEnd - capH, capW, capH, 4);
    } else {
      roundRect(ctx, capX, yStart, capW, capH, 4);
    }
    ctx.fill();

    // Cap highlight
    ctx.fillStyle = PIPE_COLOR_CAP;
    if (isTop) {
      ctx.fillRect(capX + 5, yEnd - capH + 3, 10, capH - 6);
    } else {
      ctx.fillRect(capX + 5, yStart + 3, 10, capH - 6);
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawGround() {
    // Main ground
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, H - GROUND_H, W, GROUND_H);

    // Top strip (grass)
    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(0, H - GROUND_H, W, 12);

    // Animated stripes
    ctx.fillStyle = '#c8b04a';
    const stripeW = 20;
    const offset = ((groundX % stripeW) + stripeW) % stripeW;
    for (let sx = -stripeW + offset; sx < W + stripeW; sx += stripeW) {
      ctx.fillRect(sx, H - GROUND_H + 14, 10, GROUND_H - 14);
    }
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);

    // Rotation based on velocity or death
    let angle;
    if (gameState === 'dead') {
      angle = deathRotation;
    } else {
      angle = Math.max(-0.5, Math.min(1.2, bird.vy * 0.08));
    }
    ctx.rotate(angle);

    // Wing (drawn behind body)
    ctx.save();
    ctx.rotate(wingAngle);
    ctx.fillStyle = '#e8b800';
    ctx.beginPath();
    ctx.ellipse(-4, 2, 10, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    ctx.fill();

    // Body shading
    ctx.fillStyle = '#ffec60';
    ctx.beginPath();
    ctx.arc(-3, -4, BIRD_R * 0.55, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ff8c00';
    ctx.beginPath();
    ctx.moveTo(BIRD_R - 2, -3);
    ctx.lineTo(BIRD_R + 10, 0);
    ctx.lineTo(BIRD_R - 2, 3);
    ctx.closePath();
    ctx.fill();

    // Eye white
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(5, -5, 6, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(7, -5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(8, -6.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawHUD() {
    // Score
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 4;
    ctx.strokeText(score, W / 2, 48);
    ctx.fillStyle = 'white';
    ctx.fillText(score, W / 2, 48);

    // Best score indicator
    if (highScore > 0 && gameState === 'playing') {
      ctx.font = '14px Arial, sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.strokeText(`Kỷ lục: ${highScore}`, W / 2, 68);
      ctx.fillStyle = '#ffe066';
      ctx.fillText(`Kỷ lục: ${highScore}`, W / 2, 68);
    }

    ctx.restore();
  }

  function drawIdlePrompt() {
    ctx.save();
    ctx.textAlign = 'center';

    // Semi-transparent panel
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, W / 2 - 110, H / 2 + 10, 220, 60, 12);
    ctx.fill();

    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText('Nhấn Space / Click để bay!', W / 2, H / 2 + 36);

    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = '#ffe066';
    const modeLabels = { easy: '😊 Dễ', normal: '😤 Thường', hard: '💀 Khó', reverse: '🔄 Đảo Trọng Lực' };
    ctx.fillText(`Chế độ: ${modeLabels[currentMode] || currentMode}`, W / 2, H / 2 + 56);

    ctx.restore();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Main loop
  // ──────────────────────────────────────────────────────────────────────────
  function loop() {
    ctx.clearRect(0, 0, W, H);
    update();
    draw();
    animId = requestAnimationFrame(loop);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Build DOM
  // ──────────────────────────────────────────────────────────────────────────
  function buildUI(modeId) {
    const body = document.querySelector('.modal-body') || document.body;
    body.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'canvas-wrapper';
    wrapper.style.cssText = 'display:flex;justify-content:center;align-items:center;';

    canvas = document.createElement('canvas');
    canvas.id = 'flappy-canvas';
    canvas.width = W;
    canvas.height = H;
    canvas.style.cssText = 'border-radius:12px;display:block;cursor:pointer;';

    wrapper.appendChild(canvas);
    body.appendChild(wrapper);

    ctx = canvas.getContext('2d');
    setupListeners();
    initGame(modeId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Registration
  // ──────────────────────────────────────────────────────────────────────────
  GameRegistry.register({
    id: 'flappybird',
    icon: '🐦',
    name: 'Flappy Bird',
    modes: [
      { id: 'normal',  label: '😤 Cổ Điển' },
      { id: 'reverse', label: '🔄 Đảo Trọng Lực' },
      { id: 'easy',    label: '😊 Dễ' },
      { id: 'hard',    label: '💀 Khó' },
    ],
    startMode(modeId) {
      buildUI(modeId);
    },
    cleanup() {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      removeListeners();
    },
  });
})();
