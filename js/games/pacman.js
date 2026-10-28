/**
 * Pac-Man Game
 * Full canvas-based implementation. No external libraries required.
 * Integrates with GameRegistry, GameModal, UIManager, SoundManager, StreakManager.
 */
(function () {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────
  const TILE  = 20;
  const COLS  = 19;
  const ROWS  = 21;
  const CW    = COLS * TILE; // 380
  const CH    = ROWS * TILE; // 420

  // Tile types
  const T_EMPTY  = 0;
  const T_WALL   = 1;
  const T_DOT    = 2;
  const T_POWER  = 3;

  // Ghost modes
  const GM_CHASE     = 'chase';
  const GM_SCATTER   = 'scatter';
  const GM_FRIGHTENED = 'frightened';

  // Ghost colors
  const GHOST_COLORS = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852']; // Blinky,Pinky,Inky,Clyde
  const GHOST_FRIGHT_COLOR = '#2020cc';
  const GHOST_FRIGHT_BLINK = '#ffffff';

  // Scatter targets (corners)
  const SCATTER_TARGETS = [
    { col: COLS - 2, row: 0 },      // Blinky — top-right
    { col: 1,        row: 0 },      // Pinky  — top-left
    { col: COLS - 1, row: ROWS - 1 },// Inky   — bottom-right
    { col: 0,        row: ROWS - 1 },// Clyde  — bottom-left
  ];

  // Ghost spawn positions (tile col/row)
  const GHOST_SPAWNS = [
    { col: 9,  row: 8 },
    { col: 9,  row: 9 },
    { col: 8,  row: 9 },
    { col: 10, row: 9 },
  ];

  const PACMAN_SPAWN = { col: 9, row: 15 };

  // ─── Base maze template (19 cols × 21 rows) ───────────────────────────────
  // 1=wall 2=dot 3=power pellet 0=empty
  const BASE_MAZE = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
    [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,0,1,1,0,1,1,0,1,2,1,1,1,1],
    [0,0,0,0,2,0,0,1,0,0,0,1,0,0,2,0,0,0,0],
    [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
    [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
    [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
    [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
    [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
    [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ];

  // ─── State ────────────────────────────────────────────────────────────────
  let animId      = null;
  let canvas, ctx;
  let maze        = [];
  let totalDots   = 0;
  let dotsEaten   = 0;

  let pacman      = {};
  let ghosts      = [];

  let score       = 0;
  let lives       = 3;
  let level       = 1;
  let gameState   = 'playing'; // 'playing' | 'dead' | 'won' | 'paused'
  let currentMode = 'single';

  let frightenedTimer   = 0;
  let ghostEatMultiplier = 1;
  let blinkTimer        = 0;
  let blinkOn           = true;

  let frameCount        = 0;
  let scatterTimer      = 0;
  let globalGhostMode   = GM_SCATTER; // starts scatter

  let deathAnimTimer    = 0;
  let deathAnimPlaying  = false;

  // Input
  let pendingDir  = null;
  let currentDir  = null;
  let keyHandler  = null;

  // ──────────────────────────────────────────────────────────────────────────
  // Maze helpers
  // ──────────────────────────────────────────────────────────────────────────
  function cloneMaze() {
    return BASE_MAZE.map(row => [...row]);
  }

  function countDots(m) {
    let n = 0;
    for (const row of m) for (const t of row) if (t === T_DOT || t === T_POWER) n++;
    return n;
  }

  function isWall(m, col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
    return m[row][col] === T_WALL;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Init
  // ──────────────────────────────────────────────────────────────────────────
  function initGame(modeId, keepScore) {
    currentMode = modeId || 'single';
    if (!keepScore) {
      score = 0;
      lives = 3;
      level = 1;
    }

    maze = cloneMaze();
    totalDots = countDots(maze);
    dotsEaten = 0;
    frameCount = 0;
    frightenedTimer = 0;
    ghostEatMultiplier = 1;
    scatterTimer = 0;
    globalGhostMode = GM_SCATTER;
    blinkTimer = 0;
    blinkOn = true;
    gameState = 'playing';
    deathAnimTimer = 0;
    deathAnimPlaying = false;

    initPacman();
    initGhosts();

    GameModal.setScore(score);

    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  function nextLevel() {
    level++;
    maze = cloneMaze();
    totalDots = countDots(maze);
    dotsEaten = 0;
    frameCount = 0;
    frightenedTimer = 0;
    ghostEatMultiplier = 1;
    scatterTimer = 0;
    globalGhostMode = GM_SCATTER;
    deathAnimTimer = 0;
    deathAnimPlaying = false;
    gameState = 'playing';

    initPacman();
    initGhosts();
  }

  function initPacman() {
    pacman = {
      col:      PACMAN_SPAWN.col,
      row:      PACMAN_SPAWN.row,
      x:        PACMAN_SPAWN.col * TILE + TILE / 2,
      y:        PACMAN_SPAWN.row * TILE + TILE / 2,
      dir:      null,
      mouthAngle: 0.25,
      mouthDir:   1,
      speed:    getLevelSpeed(),
      moveProgress: 0,
      fromCol:  PACMAN_SPAWN.col,
      fromRow:  PACMAN_SPAWN.row,
    };
    pendingDir = null;
    currentDir = null;
  }

  function getLevelSpeed() {
    // Pixels per frame (~0.15 tiles/frame at level 1, slightly faster each level)
    return Math.min(0.15 + (level - 1) * 0.015, 0.22) * TILE;
  }

  function getGhostSpeed() {
    return Math.min(0.12 + (level - 1) * 0.012, 0.18) * TILE;
  }

  function initGhosts() {
    ghosts = GHOST_SPAWNS.map((sp, i) => ({
      col:          sp.col,
      row:          sp.row,
      x:            sp.col * TILE + TILE / 2,
      y:            sp.row * TILE + TILE / 2,
      dir:          pickRandDir(sp.col, sp.row),
      mode:         GM_SCATTER,
      color:        GHOST_COLORS[i],
      scatterTarget: SCATTER_TARGETS[i],
      speed:        getGhostSpeed(),
      moveProgress: 0,
      fromCol:      sp.col,
      fromRow:      sp.row,
      toCol:        sp.col,
      toRow:        sp.row,
      eyeDir:       { x: 0, y: -1 },
      releaseDelay: i * 120, // stagger ghost release
    }));
  }

  const DIRS = [
    { col:  0, row: -1, angle: -Math.PI / 2, name: 'up' },
    { col:  0, row:  1, angle:  Math.PI / 2, name: 'down' },
    { col: -1, row:  0, angle:  Math.PI,     name: 'left' },
    { col:  1, row:  0, angle:  0,           name: 'right' },
  ];

  function pickRandDir(col, row) {
    const avail = DIRS.filter(d => !isWall(maze, col + d.col, row + d.row));
    return avail.length ? avail[Math.floor(Math.random() * avail.length)] : DIRS[3];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Input
  // ──────────────────────────────────────────────────────────────────────────
  function setupInput() {
    keyHandler = (e) => {
      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': e.preventDefault(); pendingDir = DIRS[0]; break;
        case 'ArrowDown':  case 's': case 'S': e.preventDefault(); pendingDir = DIRS[1]; break;
        case 'ArrowLeft':  case 'a': case 'A': e.preventDefault(); pendingDir = DIRS[2]; break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); pendingDir = DIRS[3]; break;
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Update
  // ──────────────────────────────────────────────────────────────────────────
  function update() {
    if (gameState !== 'playing') return;

    frameCount++;

    // ── Global ghost mode cycling: scatter→chase ──
    scatterTimer++;
    if (globalGhostMode === GM_SCATTER && scatterTimer > 180) {
      globalGhostMode = GM_CHASE;
      scatterTimer = 0;
      for (const g of ghosts) if (g.mode !== GM_FRIGHTENED) g.mode = GM_CHASE;
    } else if (globalGhostMode === GM_CHASE && scatterTimer > 420) {
      globalGhostMode = GM_SCATTER;
      scatterTimer = 0;
      for (const g of ghosts) if (g.mode !== GM_FRIGHTENED) g.mode = GM_SCATTER;
    }

    // ── Frightened timer ──
    if (frightenedTimer > 0) {
      frightenedTimer--;
      blinkTimer++;
      if (blinkTimer % 8 === 0) blinkOn = !blinkOn;
      if (frightenedTimer === 0) {
        ghostEatMultiplier = 1;
        for (const g of ghosts) if (g.mode === GM_FRIGHTENED) g.mode = globalGhostMode;
      }
    }

    // ── Pac-Man movement (tile-based) ──
    updatePacman();

    // ── Ghosts ──
    for (const g of ghosts) updateGhost(g);

    // ── Collision: pacman eats ghost or ghost eats pacman ──
    checkPacGhostCollisions();
  }

  // ── Pac-Man tile-based movement ──────────────────────────────────────────
  function updatePacman() {
    const p = pacman;

    // Try applying pending direction
    if (pendingDir) {
      const nc = p.col + pendingDir.col;
      const nr = p.row + pendingDir.row;
      if (!isWall(maze, nc, nr)) {
        currentDir = pendingDir;
        pendingDir = null;
      }
    }

    if (!currentDir) return;

    // Check if next tile in current direction is passable
    const nc = p.col + currentDir.col;
    const nr = p.row + currentDir.row;
    if (isWall(maze, nc, nr)) {
      // Bump into wall — stop at center of tile
      p.x = p.col * TILE + TILE / 2;
      p.y = p.row * TILE + TILE / 2;
      p.moveProgress = 0;
      return;
    }

    p.moveProgress += p.speed / TILE;

    p.x = lerp(p.col * TILE + TILE / 2, nc * TILE + TILE / 2, p.moveProgress);
    p.y = lerp(p.row * TILE + TILE / 2, nr * TILE + TILE / 2, p.moveProgress);

    if (p.moveProgress >= 1) {
      p.col = wrapCol(nc);
      p.row = nr;
      p.x = p.col * TILE + TILE / 2;
      p.y = p.row * TILE + TILE / 2;
      p.moveProgress = 0;

      // Eat tile
      eatTile(p.col, p.row);
    }

    // Mouth animation
    p.mouthAngle += 0.05 * p.mouthDir;
    if (p.mouthAngle > 0.38) p.mouthDir = -1;
    if (p.mouthAngle < 0.02) p.mouthDir = 1;
  }

  function wrapCol(col) {
    if (col < 0) return COLS - 1;
    if (col >= COLS) return 0;
    return col;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function eatTile(col, row) {
    const tile = maze[row][col];
    if (tile === T_DOT) {
      maze[row][col] = T_EMPTY;
      dotsEaten++;
      score += 10;
      GameModal.setScore(score);
      SoundManager.play('eat');
      checkWin();
    } else if (tile === T_POWER) {
      maze[row][col] = T_EMPTY;
      dotsEaten++;
      score += 50;
      GameModal.setScore(score);
      SoundManager.play('eat');
      activateFrightened();
      checkWin();
    }
  }

  function activateFrightened() {
    frightenedTimer = 600; // 10 seconds at 60fps
    ghostEatMultiplier = 1;
    blinkTimer = 0;
    blinkOn = true;
    for (const g of ghosts) {
      g.mode = GM_FRIGHTENED;
    }
  }

  function checkWin() {
    if (dotsEaten >= totalDots) {
      gameState = 'won';
      StreakManager.recordScore('pacman', score);

      setTimeout(() => {
        if (currentMode === 'endless') {
          UIManager.showWin({
            title: `Màn ${level} Hoàn Thành!`,
            gameId: 'pacman',
            score,
            onPlayAgain: () => {
              nextLevel();
              GameModal.setScore(score);
            },
          });
        } else {
          UIManager.showWin({
            title: `🎉 Chiến Thắng! Điểm: ${score}`,
            gameId: 'pacman',
            score,
            onPlayAgain: () => initGame(currentMode),
          });
        }
      }, 400);
    }
  }

  // ── Ghost movement ────────────────────────────────────────────────────────
  function updateGhost(g) {
    // Staggered release from ghost house
    if (g.releaseDelay > 0) {
      g.releaseDelay--;
      return;
    }

    g.moveProgress += g.speed / TILE;

    if (g.moveProgress < 1) {
      g.x = lerp(g.fromCol * TILE + TILE / 2, g.toCol * TILE + TILE / 2, g.moveProgress);
      g.y = lerp(g.fromRow * TILE + TILE / 2, g.toRow * TILE + TILE / 2, g.moveProgress);
      return;
    }

    // Arrived at toCol/toRow — pick next direction
    g.col = wrapCol(g.toCol);
    g.row = g.toRow;
    g.x = g.col * TILE + TILE / 2;
    g.y = g.row * TILE + TILE / 2;
    g.fromCol = g.col;
    g.fromRow = g.row;
    g.moveProgress = 0;

    const nextDir = chooseGhostDir(g);
    g.dir = nextDir;
    g.toCol = wrapCol(g.col + nextDir.col);
    g.toRow = g.row + nextDir.row;
    g.eyeDir = { x: nextDir.col, y: nextDir.row };
  }

  function chooseGhostDir(g) {
    // Avoid reversing
    const oppCol = g.dir ? -g.dir.col : 0;
    const oppRow = g.dir ? -g.dir.row : 0;

    const candidates = DIRS.filter(d => {
      if (d.col === oppCol && d.row === oppRow) return false; // no reverse
      const nc = wrapCol(g.col + d.col);
      const nr = g.row + d.row;
      return !isWall(maze, nc, nr);
    });

    if (candidates.length === 0) {
      // Forced reverse
      const rev = DIRS.find(d => d.col === oppCol && d.row === oppRow);
      return rev || DIRS[3];
    }

    if (g.mode === GM_FRIGHTENED) {
      // Random
      return candidates[Math.floor(Math.random() * candidates.length)];
    }

    // Target-based: minimize distance to target
    let target;
    if (g.mode === GM_SCATTER) {
      target = g.scatterTarget;
    } else {
      // Chase — target pac-man tile
      target = { col: pacman.col, row: pacman.row };
    }

    let bestDir = candidates[0];
    let bestDist = Infinity;
    for (const d of candidates) {
      const nc = wrapCol(g.col + d.col);
      const nr = g.row + d.row;
      const dist = (nc - target.col) ** 2 + (nr - target.row) ** 2;
      if (dist < bestDist) { bestDist = dist; bestDir = d; }
    }
    return bestDir;
  }

  // ── Pac-Ghost collision ───────────────────────────────────────────────────
  function checkPacGhostCollisions() {
    const PAC_R = TILE * 0.4;
    for (const g of ghosts) {
      const dx = pacman.x - g.x;
      const dy = pacman.y - g.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PAC_R + TILE * 0.35) {
        if (g.mode === GM_FRIGHTENED) {
          // Eat ghost
          g.mode = globalGhostMode;
          const pts = 200 * ghostEatMultiplier;
          ghostEatMultiplier *= 2;
          score += pts;
          GameModal.setScore(score);
          SoundManager.play('score');
          // Reset ghost to spawn
          const sp = GHOST_SPAWNS[ghosts.indexOf(g)];
          g.col = sp.col; g.row = sp.row;
          g.x = sp.col * TILE + TILE / 2;
          g.y = sp.row * TILE + TILE / 2;
          g.fromCol = sp.col; g.fromRow = sp.row;
          g.toCol = sp.col; g.toRow = sp.row;
          g.moveProgress = 0;
          g.releaseDelay = 60;
        } else {
          // Pac-Man dies
          pacmanDie();
        }
      }
    }
  }

  function pacmanDie() {
    if (gameState !== 'playing') return;
    gameState = 'paused';
    lives--;
    SoundManager.play('lose');

    setTimeout(() => {
      if (lives <= 0) {
        gameState = 'dead';
        StreakManager.recordScore('pacman', score);
        UIManager.showLoss({
          title: 'Game Over! 💀',
          emoji: '👾',
          score,
          onPlayAgain: () => initGame(currentMode),
        });
      } else {
        initPacman();
        initGhosts();
        gameState = 'playing';
      }
    }, 900);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Draw
  // ──────────────────────────────────────────────────────────────────────────
  function draw() {
    // Background
    ctx.fillStyle = '#000010';
    ctx.fillRect(0, 0, CW, CH);

    drawMaze();
    drawPacman();
    drawGhosts();
    drawHUD();
  }

  // ── Maze ─────────────────────────────────────────────────────────────────
  function drawMaze() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = maze[r][c];
        const x = c * TILE;
        const y = r * TILE;

        if (tile === T_WALL) {
          drawWall(x, y, c, r);
        } else if (tile === T_DOT) {
          // Small dot
          ctx.fillStyle = '#ffff99';
          ctx.beginPath();
          ctx.arc(x + TILE / 2, y + TILE / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === T_POWER) {
          // Power pellet — blinking
          if ((frameCount % 50) < 30) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      }
    }
  }

  function drawWall(x, y, c, r) {
    ctx.fillStyle = '#1a1aff';
    ctx.strokeStyle = '#4444ff';
    ctx.lineWidth = 1;

    // Slightly inset walls for grid feel
    const pad = 1;
    ctx.beginPath();
    roundRectPath(ctx, x + pad, y + pad, TILE - pad * 2, TILE - pad * 2, 3);
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = '#2222cc';
    ctx.beginPath();
    roundRectPath(ctx, x + pad + 2, y + pad + 2, TILE - pad * 2 - 4, TILE - pad * 2 - 4, 2);
    ctx.fill();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
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

  // ── Pac-Man ───────────────────────────────────────────────────────────────
  function drawPacman() {
    if (gameState === 'paused') return; // Hide during death pause

    const p = pacman;
    const R = TILE * 0.42;

    // Determine facing angle
    let facing = 0;
    if (currentDir) facing = currentDir.angle;

    const mouthRad = p.mouthAngle * Math.PI;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(facing);

    // Body
    ctx.fillStyle = '#ffe000';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, mouthRad, Math.PI * 2 - mouthRad);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eye
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(R * 0.2, -R * 0.55, R * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── Ghosts ────────────────────────────────────────────────────────────────
  function drawGhosts() {
    for (const g of ghosts) {
      if (g.releaseDelay > 30) continue; // Still in house, fade in
      drawGhost(g);
    }
  }

  function drawGhost(g) {
    const R = TILE * 0.42;
    const x = g.x;
    const y = g.y;

    let bodyColor;
    if (g.mode === GM_FRIGHTENED) {
      bodyColor = (frightenedTimer < 180 && !blinkOn) ? GHOST_FRIGHT_BLINK : GHOST_FRIGHT_COLOR;
    } else {
      bodyColor = g.color;
    }

    ctx.save();

    // Body — semicircle top
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(x, y, R, Math.PI, 0);
    // Wavy bottom
    const waveCount = 3;
    const waveW = (R * 2) / waveCount;
    ctx.lineTo(x + R, y + R);
    for (let i = waveCount - 1; i >= 0; i--) {
      const wx = x - R + i * waveW;
      ctx.quadraticCurveTo(wx + waveW * 0.75, y + R + (i % 2 === 0 ? 4 : -4), wx + waveW, y + R);
      ctx.quadraticCurveTo(wx + waveW * 0.25, y + R + (i % 2 === 0 ? 4 : -4), wx, y + R);
    }
    ctx.lineTo(x - R, y);
    ctx.closePath();
    ctx.fill();

    if (g.mode !== GM_FRIGHTENED) {
      // White eyes
      const ex = g.eyeDir.x;
      const ey = g.eyeDir.y;
      for (let side = -1; side <= 1; side += 2) {
        const eyeX = x + side * R * 0.35;
        const eyeY = y - R * 0.15;
        // Sclera
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(eyeX, eyeY, R * 0.22, R * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        // Pupil
        ctx.fillStyle = '#0044ff';
        ctx.beginPath();
        ctx.arc(eyeX + ex * R * 0.08, eyeY + ey * R * 0.08, R * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Frightened face
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - R * 0.5, y - R * 0.1);
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(x - R * 0.5 + i * R * 0.25, y - R * 0.1 + (i % 2 === 0 ? 4 : -4));
      }
      ctx.stroke();

      // Scared eyes
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x - R * 0.28, y - R * 0.3, 3, 0, Math.PI * 2);
      ctx.arc(x + R * 0.28, y - R * 0.3, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  function drawHUD() {
    ctx.save();

    // Lives (small pac-man icons at bottom-left)
    for (let i = 0; i < lives; i++) {
      const lx = 12 + i * 22;
      const ly = CH - 6;
      ctx.fillStyle = '#ffe000';
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.arc(lx, ly, 8, 0.3, Math.PI * 2 - 0.3);
      ctx.closePath();
      ctx.fill();
    }

    // Level indicator
    ctx.fillStyle = '#aaaaff';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Màn ${level}`, CW - 6, CH - 6);

    // Frightened mode indicator
    if (frightenedTimer > 0) {
      ctx.fillStyle = frightenedTimer < 180 && !blinkOn ? '#ffffff' : '#00ccff';
      ctx.font = 'bold 11px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`👻 ${Math.ceil(frightenedTimer / 60)}s`, CW / 2, CH - 6);
    }

    ctx.restore();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Main loop
  // ──────────────────────────────────────────────────────────────────────────
  function loop() {
    ctx.clearRect(0, 0, CW, CH);
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
    canvas.id = 'pacman-canvas';
    canvas.width = CW;
    canvas.height = CH;
    canvas.style.cssText = 'border-radius:8px;display:block;background:#000;';

    wrapper.appendChild(canvas);
    body.appendChild(wrapper);

    ctx = canvas.getContext('2d');

    setupInput();
    initGame(modeId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Registration
  // ──────────────────────────────────────────────────────────────────────────
  GameRegistry.register({
    id: 'pacman',
    icon: '👾',
    name: 'Pac-Man',
    modes: [
      { id: 'single',  label: '🗺️ 1 Màn' },
      { id: 'endless', label: '♾️ Vô tận' },
    ],
    startMode(modeId) {
      buildUI(modeId);
    },
    cleanup() {
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
      if (keyHandler) {
        document.removeEventListener('keydown', keyHandler);
        keyHandler = null;
      }
    },
  });
})();
