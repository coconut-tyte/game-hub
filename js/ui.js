/* ==========================================
   UI MANAGER – Modals, Toasts, Win Screen
   ========================================== */
const UIManager = (() => {

  /* ── TOAST ── */
  function toast(msg, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  /* ── CONFETTI ── */
  function launchConfetti() {
    const container = document.getElementById('confetti-container');
    container.innerHTML = '';
    const colors = ['#818cf8','#c084fc','#fb923c','#22c55e','#fbbf24','#ef4444','#38bdf8'];
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.cssText = `
        left: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${Math.random() * 2 + 1.5}s;
        animation-delay: ${Math.random() * 0.5}s;
        transform: rotate(${Math.random() * 360}deg);
        width: ${Math.random() * 10 + 6}px;
        height: ${Math.random() * 14 + 8}px;
      `;
      container.appendChild(piece);
    }
  }

  /* ── WIN SCREEN ── */
  function showWin(opts = {}) {
    const { title = 'Bạn Đã Thắng!', emoji = '🎉', gameId = '', onPlayAgain = null, onMenu = null } = opts;
    const streak = gameId ? StreakManager.recordWin(gameId) : 0;
    SoundManager.play('win');
    launchConfetti();

    document.getElementById('win-emoji').textContent = emoji;
    document.getElementById('win-title').textContent = title;
    document.getElementById('win-streak-msg').textContent =
      streak > 1 ? `🔥 Chuỗi thắng: ${streak} trận liên tiếp!` : '';

    const overlay = document.getElementById('win-overlay');
    overlay.classList.add('active');

    document.getElementById('win-play-again').onclick = () => {
      overlay.classList.remove('active');
      if (onPlayAgain) onPlayAgain();
    };
    document.getElementById('win-menu').onclick = () => {
      overlay.classList.remove('active');
      GameModal.close();
      if (onMenu) onMenu();
    };
  }

  function showLoss(opts = {}) {
    const { title = 'Game Over!', emoji = '😢', onPlayAgain = null } = opts;
    StreakManager.recordLoss();
    SoundManager.play('lose');

    document.getElementById('win-emoji').textContent = emoji;
    document.getElementById('win-title').textContent = title;
    document.getElementById('win-streak-msg').textContent = 'Chuỗi thắng đã bị reset về 0';

    const overlay = document.getElementById('win-overlay');
    overlay.classList.add('active');

    document.getElementById('win-play-again').onclick = () => {
      overlay.classList.remove('active');
      if (onPlayAgain) onPlayAgain();
    };
    document.getElementById('win-menu').onclick = () => {
      overlay.classList.remove('active');
      GameModal.close();
    };
  }

  /* ── LEADERBOARD ── */
  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    const stats = StreakManager.getAllStats();
    const gameNames = {
      caroo: { name: 'Caro', icon: '⬛' },
      chess: { name: 'Cờ Vua', icon: '♟️' },
      xiangqi: { name: 'Cờ Tướng', icon: '🀄' },
      oanquan: { name: 'Ô Ăn Quan', icon: '🟣' },
      flappybird: { name: 'Flappy Bird', icon: '🐦' },
      pacman: { name: 'Pac-Man', icon: '👾' },
      mario: { name: 'Super Mario', icon: '🍄' },
      snake: { name: 'Snake', icon: '🐍' }
    };

    const body = document.getElementById('lb-body');
    body.innerHTML = `
      <div class="lb-game-row" style="border-bottom: 2px solid var(--border); background: var(--bg-secondary);">
        <span style="font-weight:900;color:var(--text-primary);">Tổng quan</span>
        <span>
          <span style="color:var(--accent);font-weight:900;">${stats.totalWins} thắng</span>
          &nbsp; <span style="color:var(--accent-orange);font-weight:900;">🔥 ${stats.bestStreak} best</span>
        </span>
      </div>
      ${Object.entries(gameNames).map(([id, g]) => {
        const gs = stats.gameStats?.[id] || { wins: 0, bestScore: 0 };
        return `
          <div class="lb-game-row">
            <span class="lb-game-name">${g.icon} ${g.name}</span>
            <span>
              <span class="lb-game-score">${gs.wins} thắng</span>
              ${gs.bestScore > 0 ? `&nbsp;<span class="lb-game-streak">Điểm cao: ${gs.bestScore}</span>` : ''}
            </span>
          </div>
        `;
      }).join('')}
    `;

    document.getElementById('lb-overlay').classList.add('active');
    SoundManager.play('button');
  });

  document.getElementById('lb-close').addEventListener('click', () => {
    document.getElementById('lb-overlay').classList.remove('active');
  });

  document.getElementById('lb-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('lb-overlay')) {
      document.getElementById('lb-overlay').classList.remove('active');
    }
  });

  return { toast, showWin, showLoss, launchConfetti };
})();

/* ==========================================
   GAME MODAL MANAGER
   ========================================== */
const GameModal = (() => {
  let currentGame = null;
  const overlay = document.getElementById('modal-overlay');
  const modal   = document.getElementById('game-modal');

  function open(gameId) {
    const def = GameRegistry.get(gameId);
    if (!def) return;

    currentGame = gameId;
    document.getElementById('modal-icon').textContent  = def.icon;
    document.getElementById('modal-title').textContent = def.name;

    // Build mode buttons
    const modeBar = document.getElementById('modal-mode-bar');
    modeBar.innerHTML = '';
    if (def.modes && def.modes.length) {
      def.modes.forEach((mode, i) => {
        const btn = document.createElement('button');
        btn.className = `mode-btn${i === 0 ? ' active' : ''}`;
        btn.textContent = mode.label;
        btn.dataset.mode = mode.id;
        btn.addEventListener('click', () => {
          modeBar.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          def.startMode(mode.id);
          SoundManager.play('button');
        });
        modeBar.appendChild(btn);
      });
    }

    overlay.classList.add('active');
    document.getElementById('game-score').textContent  = 0;
    document.getElementById('game-status').textContent = 'Đang chơi';
    document.getElementById('game-streak').textContent = StreakManager.getAllStats().streak;

    // Start first mode
    if (def.modes && def.modes.length > 0) {
      def.startMode(def.modes[0].id);
    } else {
      def.start();
    }
    SoundManager.play('click');
  }

  function close() {
    if (currentGame) {
      const def = GameRegistry.get(currentGame);
      if (def && def.cleanup) def.cleanup();
    }
    overlay.classList.remove('active');
    document.getElementById('modal-body').innerHTML = '';
    currentGame = null;
  }

  function setScore(score) {
    const el = document.getElementById('game-score');
    el.textContent = score;
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
  }

  function setStatus(status) {
    document.getElementById('game-status').textContent = status;
  }

  // Controls
  document.getElementById('modal-close').addEventListener('click', close);
  document.getElementById('modal-restart').addEventListener('click', () => {
    if (currentGame) {
      const def = GameRegistry.get(currentGame);
      const activeModeBtn = document.querySelector('.mode-btn.active');
      const modeId = activeModeBtn ? activeModeBtn.dataset.mode : null;
      if (modeId && def.startMode) def.startMode(modeId);
      else if (def.start) def.start();
      SoundManager.play('button');
    }
  });
  document.getElementById('modal-fullscreen').addEventListener('click', () => {
    modal.classList.toggle('fullscreen');
    document.getElementById('modal-fullscreen').textContent = modal.classList.contains('fullscreen') ? '⊡' : '⛶';
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  return { open, close, setScore, setStatus };
})();

/* ==========================================
   GAME REGISTRY
   ========================================== */
const GameRegistry = (() => {
  const registry = {};

  function register(def) { registry[def.id] = def; }
  function get(id) { return registry[id]; }

  return { register, get };
})();
