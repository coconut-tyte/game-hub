/* ==========================================
   SNAKE GAME
   ========================================== */
(function() {
  let canvas, ctx;
  let animId = null;
  let gameInterval = null;
  let mode = 'normal'; // 'easy', 'normal', 'hard', 'wrap'
  let score = 0;
  let highScore = 0;
  let gridSize = 24; // 24x24 tiles
  let tileSize = 20; // 480x480 canvas
  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 15, y: 12 };
  let specialFood = null;
  let eatCount = 0;
  let isGameOver = false;
  let isPaused = false;
  let speedMs = 110;

  function initGame(selectedMode) {
    cleanup();
    mode = selectedMode || 'normal';
    score = 0;
    eatCount = 0;
    isGameOver = false;
    isPaused = false;
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    specialFood = null;

    if (mode === 'easy') speedMs = 140;
    else if (mode === 'normal') speedMs = 100;
    else if (mode === 'hard') speedMs = 65;
    else if (mode === 'wrap') speedMs = 95;

    highScore = StreakManager.getStats('snake').bestScore || 0;
    GameModal.setScore(0);
    GameModal.setStatus(`Rắn Săn Mồi - Chế độ: ${getModeName(mode)}`);

    // Snake starts in middle with 4 segments
    snake = [
      { x: 10, y: 12 },
      { x: 9, y: 12 },
      { x: 8, y: 12 },
      { x: 7, y: 12 }
    ];

    spawnFood();
    setupCanvas();
    startGameLoop();
  }

  function getModeName(m) {
    switch (m) {
      case 'easy': return 'Dễ';
      case 'normal': return 'Bình thường';
      case 'hard': return 'Khó';
      case 'wrap': return 'Xuyên tường';
      default: return m;
    }
  }

  function setupCanvas() {
    const container = document.getElementById('modal-body');
    container.innerHTML = `
      <div class="board-container" style="display:flex; flex-direction:column; align-items:center;">
        <div class="canvas-wrapper" style="position:relative; width:480px; max-width:100%; border:2px solid var(--border); border-radius:12px; overflow:hidden;">
          <canvas id="snake-canvas" width="480" height="480" style="display:block; background:#12151e;"></canvas>
        </div>
        <div style="margin-top:12px; color:var(--text-secondary); font-size:0.85rem; text-align:center;">
          Dùng phím mũi tên hoặc <b>W/A/S/D</b> để điều khiển. Space để tạm dừng.
        </div>
      </div>
    `;

    canvas = document.getElementById('snake-canvas');
    ctx = canvas.getContext('2d');

    window.addEventListener('keydown', handleKey);
    setupTouch();
  }

  let touchStartX = 0;
  let touchStartY = 0;
  function setupTouch() {
    if (!canvas) return;
    canvas.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 25 && dir.x === 0) nextDir = { x: 1, y: 0 };
        else if (dx < -25 && dir.x === 0) nextDir = { x: -1, y: 0 };
      } else {
        if (dy > 25 && dir.y === 0) nextDir = { x: 0, y: 1 };
        else if (dy < -25 && dir.y === 0) nextDir = { x: 0, y: -1 };
      }
    }, { passive: true });
  }

  function handleKey(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
      isPaused = !isPaused;
      GameModal.setStatus(isPaused ? 'Đã tạm dừng ⏸️' : 'Đang chơi...');
      return;
    }

    if (isGameOver || isPaused) return;

    if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && dir.y === 0) {
      nextDir = { x: 0, y: -1 };
    } else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && dir.y === 0) {
      nextDir = { x: 0, y: 1 };
    } else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && dir.x === 0) {
      nextDir = { x: -1, y: 0 };
    } else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && dir.x === 0) {
      nextDir = { x: 1, y: 0 };
    }
  }

  function spawnFood() {
    let valid = false;
    let newX, newY;
    while (!valid) {
      newX = Math.floor(Math.random() * gridSize);
      newY = Math.floor(Math.random() * gridSize);
      valid = !snake.some(segment => segment.x === newX && segment.y === newY);
    }
    food = { x: newX, y: newY };
  }

  function spawnSpecialFood() {
    let valid = false;
    let newX, newY;
    while (!valid) {
      newX = Math.floor(Math.random() * gridSize);
      newY = Math.floor(Math.random() * gridSize);
      valid = !snake.some(seg => seg.x === newX && seg.y === newY) && (food.x !== newX || food.y !== newY);
    }
    specialFood = {
      x: newX,
      y: newY,
      timer: Date.now() + 6000 // expires in 6s
    };
  }

  function update() {
    if (isGameOver || isPaused) return;

    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Wall collision logic
    if (mode === 'hard') {
      if (head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize) {
        gameOver();
        return;
      }
    } else {
      // Wrap around
      if (head.x < 0) head.x = gridSize - 1;
      else if (head.x >= gridSize) head.x = 0;
      if (head.y < 0) head.y = gridSize - 1;
      else if (head.y >= gridSize) head.y = 0;
    }

    // Self collision
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      gameOver();
      return;
    }

    snake.unshift(head);

    // Eating normal food
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      eatCount++;
      SoundManager.play('eat');
      GameModal.setScore(score);
      spawnFood();

      if (eatCount % 5 === 0) {
        spawnSpecialFood();
      }
    } 
    // Eating special food
    else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
      score += 50;
      SoundManager.play('score');
      UIManager.toast('⭐ Ăn sao vàng +50 điểm!', 'success');
      GameModal.setScore(score);
      specialFood = null;
    } else {
      snake.pop();
    }

    // Check special food expiry
    if (specialFood && Date.now() > specialFood.timer) {
      specialFood = null;
    }
  }

  function gameOver() {
    isGameOver = true;
    clearInterval(gameInterval);
    SoundManager.play('lose');
    StreakManager.recordScore('snake', score);

    UIManager.showLoss({
      title: `Rắn đã va chạm! Điểm: ${score}`,
      emoji: '🐍',
      onPlayAgain: () => initGame(mode)
    });
  }

  function draw() {
    if (!ctx) return;
    // Clear
    ctx.fillStyle = '#0f131d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tileSize, 0);
      ctx.lineTo(i * tileSize, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * tileSize);
      ctx.lineTo(canvas.width, i * tileSize);
      ctx.stroke();
    }

    // Draw food (Apple)
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
      food.x * tileSize + tileSize / 2,
      food.y * tileSize + tileSize / 2,
      tileSize / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    // Stem
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(food.x * tileSize + tileSize / 2 - 1, food.y * tileSize + 2, 2, 4);
    ctx.restore();

    // Draw Special Star Food
    if (specialFood) {
      ctx.save();
      const timeLeft = Math.max(0, specialFood.timer - Date.now());
      const blink = Math.floor(Date.now() / 200) % 2 === 0;
      if (timeLeft > 1500 || blink) {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        const cx = specialFood.x * tileSize + tileSize / 2;
        const cy = specialFood.y * tileSize + tileSize / 2;
        ctx.translate(cx, cy);
        ctx.rotate((Date.now() / 300) % (Math.PI * 2));
        
        // Draw 5-pointed star
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          ctx.lineTo(Math.cos((18 + i * 72) * 0.01745) * 8, -Math.sin((18 + i * 72) * 0.01745) * 8);
          ctx.lineTo(Math.cos((54 + i * 72) * 0.01745) * 4, -Math.sin((54 + i * 72) * 0.01745) * 4);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw Snake
    snake.forEach((seg, index) => {
      ctx.save();
      if (index === 0) {
        // Head
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(
          seg.x * tileSize + 1,
          seg.y * tileSize + 1,
          tileSize - 2,
          tileSize - 2,
          6
        );
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        let eyeX1, eyeY1, eyeX2, eyeY2;
        if (dir.x === 1) {
          eyeX1 = eyeX2 = seg.x * tileSize + 14;
          eyeY1 = seg.y * tileSize + 4;
          eyeY2 = seg.y * tileSize + 12;
        } else if (dir.x === -1) {
          eyeX1 = eyeX2 = seg.x * tileSize + 4;
          eyeY1 = seg.y * tileSize + 4;
          eyeY2 = seg.y * tileSize + 12;
        } else if (dir.y === 1) {
          eyeY1 = eyeY2 = seg.y * tileSize + 14;
          eyeX1 = seg.x * tileSize + 4;
          eyeX2 = seg.x * tileSize + 12;
        } else {
          eyeY1 = eyeY2 = seg.y * tileSize + 4;
          eyeX1 = seg.x * tileSize + 4;
          eyeX2 = seg.x * tileSize + 12;
        }
        ctx.fillRect(eyeX1, eyeY1, 2, 2);
        ctx.fillRect(eyeX2, eyeY2, 2, 2);
      } else {
        // Body with gradient tint
        const ratio = 1 - index / snake.length;
        ctx.fillStyle = `rgba(34, 197, 94, ${0.45 + ratio * 0.5})`;
        ctx.beginPath();
        ctx.roundRect(
          seg.x * tileSize + 2,
          seg.y * tileSize + 2,
          tileSize - 4,
          tileSize - 4,
          4
        );
        ctx.fill();
      }
      ctx.restore();
    });

    // Score overlay in top right
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12px Nunito, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Kỷ lục: ${highScore}`, canvas.width - 12, 20);

    if (isPaused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TẠM DỪNG (PAUSED)', canvas.width / 2, canvas.height / 2);
    }

    animId = requestAnimationFrame(draw);
  }

  function startGameLoop() {
    clearInterval(gameInterval);
    cancelAnimationFrame(animId);

    gameInterval = setInterval(() => {
      update();
    }, speedMs);

    draw();
  }

  function cleanup() {
    clearInterval(gameInterval);
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('keydown', handleKey);
  }

  GameRegistry.register({
    id: 'snake',
    icon: '🐍',
    name: 'Snake (Rắn Săn Mồi)',
    modes: [
      { id: 'easy', label: '😊 Dễ (Chậm)' },
      { id: 'normal', label: '😤 Bình thường' },
      { id: 'hard', label: '💀 Khó (Tường chết)' },
      { id: 'wrap', label: '🔄 Xuyên tường' }
    ],
    startMode(modeId) {
      initGame(modeId);
    },
    cleanup() {
      cleanup();
    }
  });
})();
