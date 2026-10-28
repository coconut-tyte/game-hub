/**
 * mario.js – Super Mario-style 2D platformer for the Game Hub
 * Modes: level1, level2, endless
 */
(function () {
  'use strict';

  /* ─────────────── constants ─────────────── */
  const CW = 480, CH = 360;
  const GRAVITY   = 0.45;
  const JUMP_VEL  = -11;
  const MOVE_SPD  = 3.8;
  const TILE      = 32;

  /* ─────────────── state ─────────────── */
  let canvas, ctx, animId;
  let keys = {};
  let gameState = 'playing'; // 'playing' | 'dead' | 'win'
  let score, lives, modeId;
  let camera;
  let mario;
  let platforms, coins, enemies, pipes, flags, movingPlatforms;
  let deathTimer = 0;
  let worldWidth;
  let clouds;
  let touchLeft = false, touchRight = false, touchJump = false;

  /* ─────────────── event listener refs ─────────────── */
  let _keyDown, _keyUp;

  /* ══════════════════════════════════════════════════
     LEVEL GENERATORS
  ══════════════════════════════════════════════════ */

  function buildLevel1() {
    worldWidth = 4800;
    platforms = [];
    coins = [];
    enemies = [];
    pipes = [];
    flags = [];
    movingPlatforms = [];

    // Ground (broken into segments with gaps)
    const groundSegments = [
      [0, 800], [864, 1200], [1280, 1700], [1800, 2300],
      [2400, 2900], [3000, 3500], [3600, 4100], [4200, 4800]
    ];
    groundSegments.forEach(([x1, x2]) => {
      platforms.push({ x: x1, y: CH - 40, w: x2 - x1, h: 40, type: 'ground' });
    });

    // Floating platforms
    const floats = [
      [200,220], [320,220], [500,180], [700,200], [900,170],
      [1050,200], [1300,160], [1500,200], [1700,180],
      [2000,160], [2200,200], [2400,170], [2700,190],
      [2900,150], [3100,200], [3300,170], [3500,160],
      [3700,200], [3900,180], [4100,160], [4300,180]
    ];
    floats.forEach(([x, y]) => {
      platforms.push({ x, y, w: 96, h: 16, type: 'platform' });
    });

    // Moving platforms
    movingPlatforms.push(
      { x: 1400, y: 200, w: 80, h: 16, type:'moving', dx: 1.2, minX: 1350, maxX: 1550 },
      { x: 2600, y: 180, w: 80, h: 16, type:'moving', dx: 1.0, minX: 2550, maxX: 2750 }
    );

    // Coins on platforms
    floats.forEach(([x, y], i) => {
      if (i % 2 === 0) spawnCoinsRow(x + 10, y - 24, 3);
    });
    spawnCoinsRow(300, CH - 80, 4);
    spawnCoinsRow(1100, CH - 100, 3);

    // Enemies
    const enemyPositions = [
      [600, CH-40], [1000, CH-40], [1350, CH-40],
      [2100, CH-40], [2500, CH-40], [3200, CH-40], [3800, CH-40]
    ];
    enemyPositions.forEach(([ex, ey]) => {
      enemies.push(makeEnemy(ex, ey - 24, 1.2));
    });
    // enemies on platforms
    enemies.push(makeEnemy(500, 180 - 24, 1.0));
    enemies.push(makeEnemy(2200, 200 - 24, 1.0));

    // Pipes
    [550, 1200, 2050, 3000, 3650].forEach(px => {
      pipes.push({ x: px, y: CH - 40 - 48, w: 40, h: 48 });
    });

    // Flag/goal
    flags.push({ x: 4700, y: CH - 40 - 80, w: 20, h: 80 });
  }

  function buildLevel2() {
    worldWidth = 5500;
    platforms = [];
    coins = [];
    enemies = [];
    pipes = [];
    flags = [];
    movingPlatforms = [];

    // Narrower ground segments + more gaps
    const groundSeg = [
      [0, 600], [750, 1100], [1200, 1550], [1650, 2000],
      [2100, 2400], [2600, 2900], [3100, 3500], [3650, 4100],
      [4200, 4600], [4700, 5500]
    ];
    groundSeg.forEach(([x1, x2]) => {
      platforms.push({ x: x1, y: CH - 40, w: x2 - x1, h: 40, type: 'ground' });
    });

    // More floating platforms
    const floats2 = [
      [150,200],[280,170],[460,200],[620,160],[780,190],
      [1000,170],[1150,200],[1350,160],[1500,190],[1700,160],
      [1900,200],[2100,170],[2300,190],[2500,160],[2700,190],
      [2900,170],[3100,200],[3350,160],[3550,200],[3750,170],
      [3950,190],[4150,160],[4350,190],[4550,170],[4750,200]
    ];
    floats2.forEach(([x,y]) => {
      platforms.push({ x, y, w: 80, h: 16, type: 'platform' });
    });

    // Moving platforms (more, faster)
    [[1300,200,1.8,1250,1450],[2050,180,1.5,2000,2200],
     [2800,170,2.0,2750,2950],[3600,190,1.7,3550,3750],
     [4400,180,2.2,4350,4550]].forEach(([x,y,dx,mn,mx]) => {
      movingPlatforms.push({ x, y, w: 80, h: 16, type:'moving', dx, minX: mn, maxX: mx });
    });

    floats2.forEach(([x,y],i) => {
      if (i % 2 === 0) spawnCoinsRow(x + 8, y - 24, 3);
    });

    // Enemies – faster speed 2.0
    [[500,CH-40],[900,CH-40],[1300,CH-40],[1800,CH-40],[2200,CH-40],
     [2700,CH-40],[3300,CH-40],[3900,CH-40],[4500,CH-40]].forEach(([ex,ey]) => {
      enemies.push(makeEnemy(ex, ey - 24, 2.2));
    });
    floats2.filter((_,i)=>i%3===0).forEach(([x,y]) => {
      enemies.push(makeEnemy(x + 20, y - 24, 1.8));
    });

    [500, 1100, 2000, 2900, 3800, 4600].forEach(px => {
      pipes.push({ x: px, y: CH - 40 - 56, w: 40, h: 56 });
    });

    flags.push({ x: 5400, y: CH - 40 - 80, w: 20, h: 80 });
  }

  /* Endless procedural generation state */
  let endlessGen;

  function initEndless() {
    worldWidth = Infinity;
    platforms = [];
    coins = [];
    enemies = [];
    pipes = [];
    flags = [];
    movingPlatforms = [];
    endlessGen = { nextX: 640 };

    // Starting ground
    platforms.push({ x: 0, y: CH - 40, w: 640, h: 40, type: 'ground' });
    spawnCoinsRow(100, CH - 80, 3);

    generateEndlessChunk(2000);
  }

  function generateEndlessChunk(upToX) {
    while (endlessGen.nextX < upToX) {
      const gapWidth  = 40 + Math.random() * 120;
      const segWidth  = 200 + Math.random() * 300;
      const nextStart = endlessGen.nextX + gapWidth;

      platforms.push({ x: nextStart, y: CH - 40, w: segWidth, h: 40, type: 'ground' });

      // Floating platforms above this segment
      const floatCount = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < floatCount; i++) {
        const fx = nextStart + 30 + Math.random() * (segWidth - 90);
        const fy = CH - 100 - Math.random() * 120;
        const fw = 80 + Math.random() * 40;
        platforms.push({ x: fx, y: fy, w: fw, h: 16, type: 'platform' });
        if (Math.random() < 0.6) spawnCoinsRow(fx + 8, fy - 24, 2 + Math.floor(Math.random() * 3));
      }

      // Moving platform
      if (Math.random() < 0.4) {
        const mx = nextStart + segWidth / 2;
        const speed = 1.2 + Math.random() * 1.5;
        movingPlatforms.push({ x: mx, y: CH - 120 - Math.random() * 80, w: 80, h: 16, type:'moving', dx: speed, minX: mx - 80, maxX: mx + 120 });
      }

      // Enemy
      if (Math.random() < 0.7) {
        const speed = 1.0 + score / 5000;
        enemies.push(makeEnemy(nextStart + 60, CH - 40 - 24, Math.min(speed, 3.0)));
      }

      // Pipe
      if (Math.random() < 0.3) {
        pipes.push({ x: nextStart + 20, y: CH - 40 - 48, w: 40, h: 48 });
      }

      endlessGen.nextX = nextStart + segWidth;
    }
  }

  /* ─────────────── helpers ─────────────── */

  function spawnCoinsRow(x, y, count) {
    for (let i = 0; i < count; i++) {
      coins.push({ x: x + i * 22, y, r: 8, collected: false });
    }
  }

  function makeEnemy(x, y, speed) {
    return { x, y, w: 24, h: 24, dx: speed, alive: true };
  }

  /* ══════════════════════════════════════════════════
     MARIO ENTITY
  ══════════════════════════════════════════════════ */

  function makeMario(x, y) {
    return {
      x, y, w: 24, h: 32,
      vx: 0, vy: 0,
      onGround: false,
      jumpCooldown: 0,
      dir: 1,  // 1=right, -1=left
      dead: false
    };
  }

  /* ══════════════════════════════════════════════════
     PHYSICS / UPDATE
  ══════════════════════════════════════════════════ */

  function allPlatforms() {
    return [...platforms, ...movingPlatforms];
  }

  function updateMario() {
    if (gameState !== 'playing') return;

    const left  = keys['ArrowLeft']  || keys['a'] || keys['A'] || touchLeft;
    const right = keys['ArrowRight'] || keys['d'] || keys['D'] || touchRight;
    const jump  = keys['ArrowUp']    || keys['w'] || keys['W'] || keys[' ']  || touchJump;

    // Horizontal
    if (left)  { mario.vx = -MOVE_SPD; mario.dir = -1; }
    else if (right) { mario.vx =  MOVE_SPD; mario.dir =  1; }
    else mario.vx *= 0.75;

    // Jump
    mario.jumpCooldown = Math.max(0, mario.jumpCooldown - 1);
    if (jump && mario.onGround && mario.jumpCooldown === 0) {
      mario.vy = JUMP_VEL;
      mario.onGround = false;
      mario.jumpCooldown = 10;
      SoundManager.play('jump');
    }

    // Gravity
    mario.vy += GRAVITY;
    mario.vy = Math.min(mario.vy, 14);

    // Move X
    mario.x += mario.vx;
    mario.x = Math.max(0, mario.x);

    // Clamp to worldWidth
    if (worldWidth !== Infinity) mario.x = Math.min(mario.x, worldWidth - mario.w);

    // Horizontal platform collision
    mario.onGround = false;
    const allP = allPlatforms();
    for (const p of allP) {
      if (rectsOverlap(mario, p)) {
        if (mario.vx > 0) mario.x = p.x - mario.w;
        else if (mario.vx < 0) mario.x = p.x + p.w;
        mario.vx = 0;
      }
    }

    // Move Y
    mario.y += mario.vy;

    // Vertical platform collision
    for (const p of allP) {
      if (rectsOverlap(mario, p)) {
        if (mario.vy > 0) {
          mario.y = p.y - mario.h;
          mario.vy = 0;
          mario.onGround = true;
        } else if (mario.vy < 0) {
          mario.y = p.y + p.h;
          mario.vy = 0;
        }
      }
    }

    // Pipes collision (solid)
    for (const pipe of pipes) {
      if (rectsOverlap(mario, pipe)) {
        const overlapX = Math.min(mario.x + mario.w, pipe.x + pipe.w) - Math.max(mario.x, pipe.x);
        const overlapY = Math.min(mario.y + mario.h, pipe.y + pipe.h) - Math.max(mario.y, pipe.y);
        if (overlapX < overlapY) {
          if (mario.x < pipe.x) mario.x = pipe.x - mario.w;
          else mario.x = pipe.x + pipe.w;
          mario.vx = 0;
        } else {
          if (mario.vy > 0) { mario.y = pipe.y - mario.h; mario.vy = 0; mario.onGround = true; }
          else { mario.y = pipe.y + pipe.h; mario.vy = 0; }
        }
      }
    }

    // Fall death
    if (mario.y > CH + 60) {
      killMario();
    }

    // Left boundary death
    if (mario.x < camera.x - 40) {
      killMario();
    }
  }

  function updateMovingPlatforms() {
    for (const mp of movingPlatforms) {
      mp.x += mp.dx;
      if (mp.x <= mp.minX || mp.x + mp.w >= mp.maxX) mp.dx *= -1;
      // Carry mario
      if (mario.onGround) {
        const mBottom = mario.y + mario.h;
        const pTop    = mp.y;
        if (Math.abs(mBottom - pTop) < 4 &&
            mario.x + mario.w > mp.x && mario.x < mp.x + mp.w) {
          mario.x += mp.dx;
        }
      }
    }
  }

  function updateEnemies() {
    for (const e of enemies) {
      if (!e.alive) continue;
      e.x += e.dx;

      // Check ground below
      const groundBelow = allPlatforms().some(p =>
        p.y >= e.y + e.h &&
        p.y <= e.y + e.h + 4 &&
        e.x + e.w > p.x && e.x < p.x + p.w
      );
      // Reverse at edges
      if (!groundBelow || checkWallCollision(e)) e.dx *= -1;

      // Apply gravity
      e.vy = (e.vy || 0) + GRAVITY;
      e.y += e.vy;
      for (const p of allPlatforms()) {
        if (rectsOverlap(e, p) && e.vy >= 0) {
          e.y = p.y - e.h;
          e.vy = 0;
        }
      }
    }
  }

  function checkWallCollision(e) {
    return allPlatforms().some(p =>
      rectsOverlap({ x: e.x + e.dx, y: e.y, w: e.w, h: e.h }, p)
    );
  }

  function updateCoins() {
    for (const c of coins) {
      if (c.collected) continue;
      if (circRectOverlap(c, mario)) {
        c.collected = true;
        score += 100;
        GameModal.setScore(score);
        SoundManager.play('score');
      }
    }
  }

  function checkEnemyCollisions() {
    if (gameState !== 'playing') return;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (!rectsOverlap(mario, e)) continue;

      // Jump on top?
      const mBottom = mario.y + mario.h;
      const eTop    = e.y;
      if (mario.vy > 0 && mBottom - eTop < 14 && mBottom <= eTop + 10) {
        e.alive = false;
        mario.vy = -7;
        score += 200;
        GameModal.setScore(score);
        SoundManager.play('capture');
      } else {
        killMario();
      }
    }
  }

  function checkFlag() {
    if (gameState !== 'playing') return;
    for (const f of flags) {
      if (mario.x + mario.w > f.x && mario.x < f.x + f.w &&
          mario.y + mario.h > f.y && mario.y < f.y + f.h + 80) {
        gameState = 'win';
        SoundManager.play('capture');
        StreakManager.recordScore('mario', score);
        setTimeout(() => {
          UIManager.showWin({
            title: 'Hoàn thành Màn!',
            gameId: 'mario',
            emoji: '🍄',
            onPlayAgain: () => startMode(modeId)
          });
        }, 600);
      }
    }
  }

  function killMario() {
    if (gameState !== 'playing') return;
    lives--;
    if (lives <= 0) {
      gameState = 'dead';
      StreakManager.recordScore('mario', score);
      setTimeout(() => {
        UIManager.showLoss({
          title: 'Bạn đã thua!',
          emoji: '😵',
          onPlayAgain: () => startMode(modeId)
        });
      }, 800);
    } else {
      // Respawn
      mario.x = Math.max(camera.x - 20, 40);
      mario.y = CH - 150;
      mario.vx = 0;
      mario.vy = 0;
      GameModal.setStatus(`Màn ${modeId === 'level1' ? 1 : modeId === 'level2' ? 2 : '∞'} | ❤️ ${lives}`);
    }
  }

  /* ─────────────── camera ─────────────── */

  function updateCamera() {
    const targetX = mario.x - CW / 3;
    camera.x += (targetX - camera.x) * 0.12;
    camera.x = Math.max(0, camera.x);
    if (worldWidth !== Infinity) camera.x = Math.min(camera.x, worldWidth - CW);

    // Endless: generate more world
    if (modeId === 'endless') {
      generateEndlessChunk(camera.x + CW + 1500);
    }
  }

  /* ══════════════════════════════════════════════════
     DRAWING
  ══════════════════════════════════════════════════ */

  let frameCount = 0;

  function draw() {
    ctx.clearRect(0, 0, CW, CH);
    drawSky();
    ctx.save();
    ctx.translate(-Math.floor(camera.x), 0);
    drawPlatforms();
    drawPipes();
    drawMovingPlatforms();
    drawCoins();
    drawEnemies();
    drawFlags();
    drawMario();
    ctx.restore();
    frameCount++;
  }

  function drawSky() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, '#5ba4f5');
    grad.addColorStop(1, '#b8dcff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);

    // Clouds (parallax)
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const cloudData = clouds || [];
    for (const c of cloudData) {
      const cx = ((c.x - camera.x * c.speed) % (CW + 200) + CW + 200) % (CW + 200) - 100;
      drawCloud(cx, c.y, c.r);
    }
  }

  function drawCloud(x, y, r) {
    ctx.beginPath();
    ctx.arc(x,     y,     r,      0, Math.PI * 2);
    ctx.arc(x+r,   y-r*0.4, r*0.8, 0, Math.PI * 2);
    ctx.arc(x+r*2, y,     r*0.9,  0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlatforms() {
    for (const p of platforms) {
      if (!inView(p)) continue;
      if (p.type === 'ground') {
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#388e3c';
        ctx.fillRect(p.x, p.y, p.w, 8);
        // Draw dirt texture
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(p.x, p.y + 8, p.w, p.h - 8);
      } else {
        // Floating platform (brown)
        ctx.fillStyle = '#8B5E3C';
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = '#A0714F';
        ctx.fillRect(p.x, p.y, p.w, 5);
        ctx.fillStyle = '#6B4226';
        ctx.fillRect(p.x, p.y + p.h - 3, p.w, 3);
      }
    }
  }

  function drawMovingPlatforms() {
    for (const p of movingPlatforms) {
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#795548';
      ctx.fillRect(p.x, p.y, p.w, 5);
      // Arrows indicating movement
      ctx.fillStyle = '#FFEB3B';
      ctx.font = '10px Arial';
      ctx.fillText(p.dx > 0 ? '→' : '←', p.x + p.w/2 - 4, p.y + 11);
    }
  }

  function drawPipes() {
    for (const p of pipes) {
      if (!inView(p)) continue;
      // Body
      ctx.fillStyle = '#388e3c';
      ctx.fillRect(p.x + 3, p.y + 12, p.w - 6, p.h - 12);
      // Highlight
      ctx.fillStyle = '#66bb6a';
      ctx.fillRect(p.x + 5, p.y + 12, 8, p.h - 12);
      // Cap
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(p.x, p.y, p.w, 12);
      ctx.fillStyle = '#43a047';
      ctx.fillRect(p.x + 2, p.y + 2, 10, 5);
    }
  }

  function drawCoins() {
    for (const c of coins) {
      if (c.collected) continue;
      if (!inView({ x: c.x - c.r, y: c.y - c.r, w: c.r*2, h: c.r*2 })) continue;

      // Coin glow
      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = '#FFD700';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Inner shine
      ctx.fillStyle = '#FFF176';
      ctx.beginPath();
      ctx.arc(c.x - 2, c.y - 2, c.r * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle
      if (frameCount % 20 < 10) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - c.r - 4);
        ctx.lineTo(c.x, c.y - c.r - 8);
        ctx.stroke();
      }
    }
  }

  function drawEnemies() {
    for (const e of enemies) {
      if (!e.alive) continue;
      if (!inView(e)) continue;

      const dir = e.dx > 0 ? 1 : -1;
      ctx.save();
      ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
      if (dir < 0) ctx.scale(-1, 1);

      // Body – dark brown blob
      ctx.fillStyle = '#4E342E';
      ctx.beginPath();
      ctx.ellipse(0, 4, e.w/2, e.h/2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Feet (animated)
      const footOff = Math.sin(frameCount * 0.25) * 4;
      ctx.fillStyle = '#3E2723';
      ctx.beginPath(); ctx.ellipse(-5, e.h/2 - 2 + footOff,  5, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse( 5, e.h/2 - 2 - footOff,  5, 4, 0, 0, Math.PI * 2); ctx.fill();

      // Eyes
      ctx.fillStyle = 'white';
      ctx.beginPath(); ctx.arc(-4, -2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 4, -2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-3, -2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 5, -2, 2, 0, Math.PI * 2); ctx.fill();

      // Eyebrows (angry)
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(-2, -5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo( 2, -5); ctx.lineTo( 6, -7); ctx.stroke();

      ctx.restore();
    }
  }

  function drawFlags() {
    for (const f of flags) {
      if (!inView({ x: f.x, y: f.y, w: f.w, h: f.h + 80 })) continue;

      // Pole
      ctx.fillStyle = '#9E9E9E';
      ctx.fillRect(f.x + 8, f.y, 4, f.h + 80);

      // Flag
      ctx.fillStyle = '#E53935';
      ctx.beginPath();
      ctx.moveTo(f.x + 12, f.y);
      ctx.lineTo(f.x + 36, f.y + 12);
      ctx.lineTo(f.x + 12, f.y + 24);
      ctx.closePath();
      ctx.fill();

      // Base
      ctx.fillStyle = '#6D4C41';
      ctx.fillRect(f.x, f.y + f.h + 75, 20, 8);
    }
  }

  function drawMario() {
    const { x, y, w, h, dir } = mario;

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (dir < 0) ctx.scale(-1, 1);

    // Legs (blue)
    ctx.fillStyle = '#1565C0';
    ctx.fillRect(-w/2, h/4, w/2 - 1, h/4);
    ctx.fillRect(1, h/4, w/2 - 1, h/4);

    // Shoes
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(-w/2 - 2, h/2, w/2, 5);
    ctx.fillRect(1, h/2, w/2 + 2, 5);

    // Body (red overalls)
    ctx.fillStyle = '#E53935';
    ctx.fillRect(-w/2, -h/4, w, h/2 + 2);

    // Face (skin)
    ctx.fillStyle = '#FFCC80';
    ctx.fillRect(-w/2 + 2, -h/2 + 4, w - 4, h/4 + 4);

    // Hat (red + brown brim)
    ctx.fillStyle = '#8D4B27';
    ctx.fillRect(-w/2, -h/2 + 4, w, 4); // brim
    ctx.fillStyle = '#E53935';
    ctx.fillRect(-w/2 + 2, -h/2 - 2, w - 4, 10); // hat top

    // Eyes
    ctx.fillStyle = '#111';
    ctx.fillRect(2, -h/4 + 2, 4, 4);

    // Mustache
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(-2, -h/4 + 8, 8, 3);

    // Buttons on overalls
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-3, -h/4 + 2, 3, 3);
    ctx.fillRect(1,  -h/4 + 2, 3, 3);

    ctx.restore();
  }

  /* ─────────────── utils ─────────────── */

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circRectOverlap(c, r) {
    const nx = Math.max(r.x, Math.min(c.x, r.x + r.w));
    const ny = Math.max(r.y, Math.min(c.y, r.y + r.h));
    return (c.x - nx) ** 2 + (c.y - ny) ** 2 < c.r ** 2;
  }

  function inView(obj) {
    return obj.x + (obj.w || 0) > camera.x - 20 &&
           obj.x < camera.x + CW + 20;
  }

  /* ══════════════════════════════════════════════════
     GAME LOOP
  ══════════════════════════════════════════════════ */

  function gameLoop() {
    if (gameState === 'playing') {
      updateMovingPlatforms();
      updateMario();
      updateEnemies();
      updateCoins();
      checkEnemyCollisions();
      checkFlag();
      updateCamera();
    }
    draw();
    animId = requestAnimationFrame(gameLoop);
  }

  /* ══════════════════════════════════════════════════
     TOUCH CONTROLS
  ══════════════════════════════════════════════════ */

  function createTouchControls() {
    removeTouchControls();
    const wrap = document.querySelector('.canvas-wrapper');
    if (!wrap) return;

    const ctrl = document.createElement('div');
    ctrl.id = 'mario-touch-controls';
    Object.assign(ctrl.style, {
      position: 'absolute', bottom: '10px', left: '0', width: '100%',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      pointerEvents: 'none', zIndex: '20', padding: '0 10px', boxSizing: 'border-box'
    });

    function makeBtn(label, onDown, onUp) {
      const btn = document.createElement('button');
      btn.textContent = label;
      Object.assign(btn.style, {
        width: '64px', height: '64px', fontSize: '24px',
        borderRadius: '50%', border: 'none',
        background: 'rgba(255,255,255,0.25)',
        color: '#fff', cursor: 'pointer', pointerEvents: 'all',
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none'
      });
      btn.addEventListener('touchstart', e => { e.preventDefault(); onDown(); }, { passive: false });
      btn.addEventListener('touchend',   e => { e.preventDefault(); onUp();   }, { passive: false });
      btn.addEventListener('mousedown',  e => { e.preventDefault(); onDown(); });
      btn.addEventListener('mouseup',    e => { e.preventDefault(); onUp();   });
      return btn;
    }

    const leftBtn  = makeBtn('←', () => touchLeft  = true, () => touchLeft  = false);
    const jumpBtn  = makeBtn('▲', () => touchJump  = true, () => touchJump  = false);
    const rightBtn = makeBtn('→', () => touchRight = true, () => touchRight = false);

    const leftGroup = document.createElement('div');
    leftGroup.style.display = 'flex'; leftGroup.style.gap = '8px';
    leftGroup.appendChild(leftBtn);
    leftGroup.appendChild(rightBtn);

    ctrl.appendChild(leftGroup);
    ctrl.appendChild(jumpBtn);

    wrap.style.position = 'relative';
    wrap.appendChild(ctrl);
  }

  function removeTouchControls() {
    const el = document.getElementById('mario-touch-controls');
    if (el) el.remove();
    touchLeft = touchRight = touchJump = false;
  }

  /* ══════════════════════════════════════════════════
     INIT / CLEANUP
  ══════════════════════════════════════════════════ */

  function startMode(mode) {
    modeId = mode;
    score  = 0;
    lives  = 3;
    gameState = 'playing';
    keys  = {};
    touchLeft = touchRight = touchJump = false;

    // Setup canvas
    const wrapper = document.querySelector('.canvas-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    canvas = document.createElement('canvas');
    canvas.width  = CW;
    canvas.height = CH;
    canvas.style.width  = '100%';
    canvas.style.height = 'auto';
    canvas.style.display = 'block';
    wrapper.appendChild(canvas);
    ctx = canvas.getContext('2d');

    // Clouds
    clouds = Array.from({ length: 6 }, (_, i) => ({
      x: i * 180, y: 40 + Math.random() * 60,
      r: 24 + Math.random() * 20,
      speed: 0.1 + Math.random() * 0.15
    }));

    // Camera
    camera = { x: 0 };

    // Build level
    if (mode === 'level1') buildLevel1();
    else if (mode === 'level2') buildLevel2();
    else initEndless();

    mario = makeMario(80, CH - 120);

    GameModal.setScore(0);
    const levelLabel = mode === 'level1' ? 1 : mode === 'level2' ? 2 : '∞';
    GameModal.setStatus(`Màn ${levelLabel} | ❤️ ${lives}`);

    // Input
    if (_keyDown) document.removeEventListener('keydown', _keyDown);
    if (_keyUp)   document.removeEventListener('keyup',   _keyUp);
    _keyDown = e => { keys[e.key] = true;  e.key === ' ' && e.preventDefault(); };
    _keyUp   = e => { keys[e.key] = false; };
    document.addEventListener('keydown', _keyDown);
    document.addEventListener('keyup',   _keyUp);

    // Touch controls
    createTouchControls();

    // Game loop
    if (animId) cancelAnimationFrame(animId);
    frameCount = 0;
    gameLoop();
  }

  function cleanup() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (_keyDown) document.removeEventListener('keydown', _keyDown);
    if (_keyUp)   document.removeEventListener('keyup',   _keyUp);
    removeTouchControls();
    keys = {};
    gameState = 'playing';
  }

  /* ══════════════════════════════════════════════════
     REGISTER
  ══════════════════════════════════════════════════ */

  GameRegistry.register({
    id: 'mario',
    icon: '🍄',
    name: 'Super Mario',
    modes: [
      { id: 'level1',  label: '🌱 Màn 1'   },
      { id: 'level2',  label: '🔥 Màn 2'   },
      { id: 'endless', label: '♾️ Vô tận' }
    ],
    startMode(modeId) { startMode(modeId); },
    cleanup() { cleanup(); }
  });

})();
