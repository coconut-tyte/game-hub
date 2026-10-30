/* ==========================================
   SNAKE GAME – ĐA DẠNG CHẾ ĐỘ SÁNG TẠO
   ========================================== */
(function() {
  let canvas, ctx;
  let animId = null;
  let gameInterval = null;
  let mode = 'normal'; // 'easy' | 'normal' | 'hard' | 'portal' | 'hyper'
  let score = 0;
  let highScore = 0;
  let gridSize = 24; // 24x24 tiles
  let tileSize = 20; // 480x480 canvas
  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 15, y: 12 };
  let specialFood = null;
  let portals = [];
  let eatCount = 0;
  let isGameOver = false;
  let isPaused = false;
  let speedMs = 100;

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
    portals = [];

    if (mode === 'easy') speedMs = 130;
    else if (mode === 'normal') speedMs = 95;
    else if (mode === 'hard') speedMs = 65;
    else if (mode === 'portal') speedMs = 90;
    else if (mode === 'hyper') speedMs = 110; // Giảm dần mỗi lần ăn

    highScore = StreakManager.getStats('snake').bestScore || 0;
    GameModal.setScore(0);
    GameModal.setStatus(`Rắn Săn Mồi - ${getModeName(mode)}`);

    snake = [
      { x: 10, y: 12 },
      { x: 9, y: 12 },
      { x: 8, y: 12 },
      { x: 7, y: 12 }
    ];

    if (mode === 'portal') {
      spawnPortals();
    }

    spawnFood();
    setupCanvas();
    startGameLoop();
  }

  function getModeName(m) {
    switch (m) {
      case 'easy': return '😊 Dễ (Chậm & Thư giãn)';
      case 'normal': return '😤 Bình thường (Xuyên tường)';
      case 'hard': return '💀 Khó (Tường chết & Tốc độ)';
      case 'portal': return '🌀 Cổng Dịch Chuyển (Portal)';
      case 'hyper': return '⚡ Thần Tốc (Tăng tốc liên tục)';
      default: return m;
    }
  }

  function setupCanvas() {
    const container = document.getElementById('modal-body');
    container.innerHTML = `
      <div class="board-container" style="display:flex; flex-direction:column; align-items:center; max-width:100%;">
        <div class="canvas-wrapper" style="position:relative; width:480px; max-width:95vw; border:2px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:var(--shadow-sm);">
          <canvas id="snake-canvas" width="480" height="480" style="display:block; background:#12151e; width:100%; height:auto;"></canvas>
        </div>
        <div style="margin-top:10px; color:var(--text-secondary); font-size:0.85rem; text-align:center;">
          🎮 Phím mũi tên / <b>W-A-S-D</b> điều khiển | <b>Space</b> tạm dừng | Vuốt màn hình trên điện thoại
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
        if (dx > 20 && dir.x === 0) nextDir = { x: 1, y: 0 };
        else if (dx < -20 && dir.x === 0) nextDir = { x: -1, y: 0 };
      } else {
        if (dy > 20 && dir.y === 0) nextDir = { x: 0, y: 1 };
        else if (dy < -20 && dir.y === 0) nextDir = { x: 0, y: -1 };
      }
    }, { passive: true });
  }

  function handleKey(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
      isPaused = !isPaused;
      GameModal.setStatus(isPaused ? 'Đã tạm dừng ⏸️' : `Đang chơi: ${getModeName(mode)}`);
      return;
    }

    if (isGameOver || isPaused) return;

    if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && dir.y === 0) nextDir = { x: 0, y: -1 };
    else if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && dir.y === 0) nextDir = { x: 0, y: 1 };
    else if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && dir.x === 0) nextDir = { x: -1, y: 0 };
    else if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && dir.x === 0) nextDir = { x: 1, y: 0 };
  }

  function spawnFood() {
    let valid = false;
    let newX, newY;
    while (!valid) {
      newX = Math.floor(Math.random() * gridSize);
      newY = Math.floor(Math.random() * gridSize);
      valid = !snake.some(seg => seg.x === newX && seg.y === newY) &&
              !portals.some(p => p.x === newX && p.y === newY);
    }
    food = { x: newX, y: newY };
  }

  function spawnPortals() {
    portals = [
      { x: 3, y: 3, targetX: 20, targetY: 20, color: '#3b82f6' },
      { x: 20, y: 20, targetX: 3, targetY: 3, color: '#3b82f6' },
      { x: 3, y: 20, targetX: 20, targetY: 3, color: '#ec4899' },
      { x: 20, y: 3, targetX: 3, targetY: 20, color: '#ec4899' }
    ];
  }

  function spawnSpecialFood() {
    let valid = false;
    let newX, newY;
    while (!valid) {
      newX = Math.floor(Math.random() * gridSize);
      newY = Math.floor(Math.random() * gridSize);
      valid = !snake.some(seg => seg.x === newX && seg.y === newY) && 
              (food.x !== newX || food.y !== newY);
    }
    specialFood = {
      x: newX,
      y: newY,
      timer: Date.now() + 6000
    };
  }

  function update() {
    if (isGameOver || isPaused) return;

    dir = { ...nextDir };
    let head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // Portal logic
    if (mode === 'portal') {
      for (const p of portals) {
        if (head.x === p.x && head.y === p.y) {
          head = { x: p.targetX + dir.x, y: p.targetY + dir.y };
          SoundManager.play('jump');
          break;
        }
      }
    }

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

    // Ăn mồi thường
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      eatCount++;
      SoundManager.play('eat');
      GameModal.setScore(score);
      spawnFood();

      if (eatCount % 4 === 0) {
        spawnSpecialFood();
      }

      // Chế độ Hyper: tăng tốc mỗi khi ăn
      if (mode === 'hyper' && speedMs > 45) {
        speedMs -= 4;
        startGameLoop();
      }
    } 
    // Ăn mồi vàng đặc biệt
    else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
      score += 50;
      SoundManager.play('score');
      UIManager.toast('⭐ Ăn sao vàng +50 điểm!', 'success');
      GameModal.setScore(score);
      specialFood = null;
    } else {
      snake.pop();
    }

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
      title: `Rắn va chạm! Điểm: ${score}`,
      emoji: '🐍',
      gameId: 'snake',
      score: score,
      message: `Chế độ: ${getModeName(mode)}`,
      onPlayAgain: () => initGame(mode)
    });
  }

  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#0f131d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Lưới nền mờ
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

    // Vẽ Cổng Portal nếu có
    if (mode === 'portal') {
      portals.forEach(p => {
        ctx.save();
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x * tileSize + tileSize / 2, p.y * tileSize + tileSize / 2, tileSize / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }

    // Mồi đỏ
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(food.x * tileSize + tileSize / 2, food.y * tileSize + tileSize / 2, tileSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Mồi vàng
    if (specialFood) {
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(specialFood.x * tileSize + tileSize / 2, specialFood.y * tileSize + tileSize / 2, tileSize / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Con rắn
    snake.forEach((seg, index) => {
      ctx.save();
      if (index === 0) {
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(seg.x * tileSize + 1, seg.y * tileSize + 1, tileSize - 2, tileSize - 2, 6);
        ctx.fill();

        // Mắt rắn
        ctx.fillStyle = '#fff';
        ctx.fillRect(seg.x * tileSize + 5, seg.y * tileSize + 5, 3, 3);
        ctx.fillRect(seg.x * tileSize + 12, seg.y * tileSize + 5, 3, 3);
      } else {
        const ratio = 1 - index / snake.length;
        ctx.fillStyle = `rgba(34, 197, 94, ${0.45 + ratio * 0.5})`;
        ctx.beginPath();
        ctx.roundRect(seg.x * tileSize + 2, seg.y * tileSize + 2, tileSize - 4, tileSize - 4, 4);
        ctx.fill();
      }
      ctx.restore();
    });

    if (isPaused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px Nunito, sans-serif';
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
      { id: 'portal', label: '🌀 Cổng Dịch Chuyển (Mới)' },
      { id: 'hyper',  label: '⚡ Thần Tốc (Tăng tốc)' },
      { id: 'normal', label: '😤 Cổ Điển (Xuyên tường)' },
      { id: 'hard',   label: '💀 Thử Thách (Tường chết)' },
      { id: 'easy',   label: '😊 Dễ (Chậm)' }
    ],
    startMode(modeId) {
      initGame(modeId);
    },
    cleanup() {
      cleanup();
    }
  });
})();
