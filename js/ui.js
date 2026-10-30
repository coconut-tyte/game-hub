/* ==========================================
   UI MANAGER – Modals, Toasts, Win Screen
   ========================================== */
const UIManager = (() => {

  /* ── TOAST ── */
  function toast(msg, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(40px)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  /* ── CONFETTI ── */
  function launchConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#818cf8','#c084fc','#fb923c','#22c55e','#fbbf24','#ef4444','#38bdf8'];
    for (let i = 0; i < 70; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.cssText = `
        left: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${Math.random() * 2 + 1.2}s;
        animation-delay: ${Math.random() * 0.3}s;
        transform: rotate(${Math.random() * 360}deg);
        width: ${Math.random() * 8 + 6}px;
        height: ${Math.random() * 12 + 8}px;
      `;
      container.appendChild(piece);
    }
  }

  /* ── WIN SCREEN ── */
  function showWin(opts = {}) {
    const { 
      title = 'Bạn Đã Thắng!', 
      emoji = '🎉', 
      gameId = '', 
      message = '', 
      winner = '',
      score = 0,
      onPlayAgain = null, 
      onMenu = null 
    } = opts;

    const streak = gameId ? StreakManager.recordWin(gameId) : 0;
    SoundManager.play('win');
    launchConfetti();

    // THƯỞNG XU KHI THẮNG GAME
    const bonusCoins = 35 + Math.min(65, streak * 10);
    if (window.ShopManager) {
      ShopManager.addCoins(bonusCoins, `Chiến thắng ${gameId ? (GameRegistry.get(gameId)?.name || gameId) : 'trò chơi'}`);
    }

    // Lưu điểm lên Cloud Leaderboard
    if (gameId && score > 0) {
      saveGameScoreToCloud(gameId, score);
    }

    document.getElementById('win-emoji').textContent = emoji;
    document.getElementById('win-title').textContent = title || (winner ? `${winner} Thắng!` : 'Bạn Đã Thắng!');
    
    let streakText = '';
    const coinRewardText = `🪙 +${bonusCoins} Xu thưởng!`;
    if (message) {
      streakText = `${message} • ${coinRewardText}` + (streak > 1 ? ` • 🔥 Chuỗi thắng: ${streak}` : '');
    } else {
      streakText = `${coinRewardText} • ` + (streak > 1 ? `🔥 Chuỗi thắng: ${streak} trận liên tiếp!` : (streak === 1 ? '🔥 Bắt đầu chuỗi thắng mới!' : ''));
    }
    document.getElementById('win-streak-msg').textContent = streakText;

    const overlay = document.getElementById('win-overlay');
    overlay.classList.add('active');

    document.getElementById('win-play-again').onclick = () => {
      overlay.classList.remove('active');
      if (onPlayAgain) onPlayAgain();
      else if (GameModal.restartCurrent) GameModal.restartCurrent();
    };
    document.getElementById('win-menu').onclick = () => {
      overlay.classList.remove('active');
      GameModal.close();
      if (onMenu) onMenu();
    };
  }

  /* ── LOSS SCREEN (MỌI GAME THUA VẪN CÓ THƯỞNG XU ĐỘNG VIÊN) ── */
  function showLoss(opts = {}) {
    const { title = 'Game Over!', emoji = '😢', onPlayAgain = null, message = '', gameId = '', score = 0 } = opts;
    StreakManager.recordLoss();
    SoundManager.play('lose');

    // Thưởng xu tham gia cho mọi trò chơi
    const coinsEarned = score > 0 ? Math.max(10, Math.floor(score / 8)) : 10;
    if (window.ShopManager) {
      ShopManager.addCoins(coinsEarned, `Thưởng tham gia ${gameId ? (GameRegistry.get(gameId)?.name || gameId) : 'trò chơi'}`);
    }

    // Lưu điểm nếu có
    if (gameId && score > 0) {
      saveGameScoreToCloud(gameId, score);
    }

    document.getElementById('win-emoji').textContent = emoji;
    document.getElementById('win-title').textContent = title;
    
    const coinMsg = `🪙 +${coinsEarned} Xu động viên!`;
    document.getElementById('win-streak-msg').textContent = message 
      ? `${message} • ${coinMsg}` 
      : `${coinMsg} • Chuỗi thắng đã trở về 0. Cố gắng ở ván sau nhé!`;

    const overlay = document.getElementById('win-overlay');
    overlay.classList.add('active');

    document.getElementById('win-play-again').onclick = () => {
      overlay.classList.remove('active');
      if (onPlayAgain) onPlayAgain();
      else if (GameModal.restartCurrent) GameModal.restartCurrent();
    };
    document.getElementById('win-menu').onclick = () => {
      overlay.classList.remove('active');
      GameModal.close();
    };
  }

  // Lưu điểm lên Supabase game_scores
  async function saveGameScoreToCloud(gameId, score) {
    if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
      const user = AuthManager.getCurrentUser();
      const client = AuthManager.getSupabaseClient ? AuthManager.getSupabaseClient() : null;
      if (user && client && score > 0) {
        try {
          await client.from('game_scores').insert([{
            user_id: user.id,
            username: user.username,
            game_id: gameId,
            score: score
          }]);
        } catch(e) {
          console.warn('Lỗi lưu điểm game_scores:', e);
        }
      }
    }
  }

  /* ── LEADERBOARD ĐA TRÒ CHƠI (MULTI-GAME LEADERBOARD) ── */
  const LEADERBOARD_GAMES = [
    { id: 'all',         name: 'Tổng Hợp',          icon: '⭐', isScore: false },
    { id: 'pikachu',     name: 'Pikachu Cổ Điển',   icon: '⚡', isScore: true,  unit: 'điểm' },
    { id: 'caroo',       name: 'Caro',              icon: '⬛', isScore: false, unit: 'thắng' },
    { id: 'chess',       name: 'Cờ Vua',            icon: '♟️', isScore: false, unit: 'thắng' },
    { id: 'xiangqi',     name: 'Cờ Tướng',          icon: '🀄', isScore: false, unit: 'thắng' },
    { id: 'oanquan',     name: 'Ô Ăn Quan',         icon: '🟣', isScore: false, unit: 'thắng' },
    { id: 'flappybird',  name: 'Flappy Bird',       icon: '🐦', isScore: true,  unit: 'điểm' },
    { id: 'pacman',      name: 'Pac-Man',           icon: '👾', isScore: true,  unit: 'điểm' },
    { id: 'mario',       name: 'Super Mario',       icon: '🍄', isScore: true,  unit: 'điểm' },
    { id: 'snake',       name: 'Snake (Rắn)',       icon: '🐍', isScore: true,  unit: 'điểm' },
    { id: 'minesweeper', name: 'Dò Mìn',            icon: '💣', isScore: false, unit: 'thắng' }
  ];

  let currentLbTab = 'all';

  async function renderLeaderboardTab(tabId) {
    currentLbTab = tabId;
    const stats = StreakManager.getAllStats();
    const body = document.getElementById('lb-body');
    const tabsContainer = document.getElementById('lb-tabs-scroll');

    // Cập nhật trạng thái active của tab
    if (tabsContainer) {
      tabsContainer.querySelectorAll('.lb-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
    }

    const gameDef = LEADERBOARD_GAMES.find(g => g.id === tabId);

    // TAB 1: TỔNG HỢP TOÀN SERVER
    if (tabId === 'all') {
      body.innerHTML = `
        <div class="lb-game-row" style="border-bottom: 2px solid var(--border); background: var(--bg-secondary); border-radius: 12px; margin-bottom: 14px; padding: 14px 18px;">
          <div>
            <div style="font-weight:900; color:var(--text-primary); font-size:1.1rem;">Thành Tích Của Bạn</div>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">Tất cả trò chơi</div>
          </div>
          <div style="text-align:right;">
            <div style="color:var(--accent); font-weight:900; font-size:1.25rem;">${stats.totalWins} thắng</div>
            <div style="color:var(--accent-orange); font-weight:800; font-size:0.85rem; margin-top:2px;">🔥 Kỷ lục: ${stats.bestStreak} chuỗi</div>
          </div>
        </div>

        <h4 style="font-size:0.95rem; font-weight:800; margin:14px 0 8px; color:var(--accent);">🏆 Bảng Vinh Danh Server</h4>
        <div id="lb-server-top" style="display:flex; flex-direction:column; gap:6px; margin-bottom:16px;">
          <div style="text-align:center; padding:12px; color:var(--text-secondary); font-size:0.85rem;">Đang tải dữ liệu từ Cloud...</div>
        </div>

        <h4 style="font-size:0.95rem; font-weight:800; margin:14px 0 8px; color:var(--text-primary);">🎮 Kỷ Lục Từng Trò Chơi Của Bạn</h4>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${LEADERBOARD_GAMES.filter(g => g.id !== 'all').map(g => {
            const gs = stats.gameStats?.[g.id] || { wins: 0, bestScore: 0 };
            return `
              <div class="lb-game-row" style="border-radius:8px; padding:10px 16px; cursor:pointer;" onclick="UIManager.selectLbTab('${g.id}')">
                <span class="lb-game-name" style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:1.35rem;">${g.icon}</span>
                  <span style="font-weight:700;">${g.name}</span>
                </span>
                <div style="text-align:right;">
                  <span class="lb-game-score" style="font-weight:900; color:var(--accent); font-size:0.95rem;">${gs.wins} thắng</span>
                  ${gs.bestScore > 0 ? `<div class="lb-game-streak" style="font-size:0.75rem; color:var(--accent-orange); margin-top:2px;">Điểm: <strong>${gs.bestScore}</strong></div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Tải danh sách top người chơi từ Supabase
      try {
        const client = typeof AuthManager !== 'undefined' ? AuthManager.getSupabaseClient() : null;
        if (client) {
          const { data } = await client.from('profiles').select('username, wins, streak, inventory').order('wins', { ascending: false }).limit(5);
          const topContainer = document.getElementById('lb-server-top');
          if (topContainer && data && data.length > 0) {
            topContainer.innerHTML = data.map((u, idx) => {
              const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
              const titleItem = u.inventory?.equipped?.title ? (window.ShopManager?.getItem(u.inventory.equipped.title)) : null;
              return `
                <div class="lb-rank-row rank-${idx + 1}">
                  <span class="rank-medal">${medals[idx] || (idx + 1)}</span>
                  <div class="rank-user-info">
                    <span class="rank-username">${u.username}</span>
                    ${titleItem ? `<span class="rank-user-title">【${titleItem.name}】</span>` : ''}
                  </div>
                  <div class="rank-stats">
                    <span class="rank-wins">${u.wins || 0} thắng</span>
                    <span class="rank-streak">🔥 ${u.streak || 0}</span>
                  </div>
                </div>
              `;
            }).join('');
          }
        }
      } catch (e) {}

    } else {
      // TAB 2: BẢNG XẾP HẠNG CỦA MỘT GAME CỤ THỂ
      const myGs = stats.gameStats?.[tabId] || { wins: 0, bestScore: 0 };
      const myVal = gameDef.isScore ? myGs.bestScore : myGs.wins;

      body.innerHTML = `
        <div class="lb-game-header-banner" style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-secondary); border-radius:12px; padding:14px 18px; margin-bottom:14px; border:1px solid var(--border);">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:2.2rem;">${gameDef.icon}</span>
            <div>
              <h3 style="margin:0; font-size:1.15rem; font-weight:900; color:var(--text-primary);">${gameDef.name}</h3>
              <p style="margin:2px 0 0; font-size:0.8rem; color:var(--text-secondary);">Kỷ lục của bạn: <strong style="color:#f59e0b;">${myVal} ${gameDef.unit}</strong></p>
            </div>
          </div>
          <button class="btn-primary btn-sm" onclick="GameModal.open('${tabId}'); document.getElementById('lb-overlay').classList.remove('active');">Chơi Ngay ▶</button>
        </div>

        <h4 style="font-size:0.95rem; font-weight:800; margin:12px 0 8px; color:var(--accent);">🏆 Top Cao Thủ [${gameDef.name}]</h4>
        <div id="lb-game-top-list" style="display:flex; flex-direction:column; gap:6px;">
          <div style="text-align:center; padding:16px; color:var(--text-secondary); font-size:0.85rem;">Đang tải bảng xếp hạng...</div>
        </div>
      `;

      // Truy vấn điểm số trò chơi từ Supabase game_scores
      try {
        const client = typeof AuthManager !== 'undefined' ? AuthManager.getSupabaseClient() : null;
        let scores = [];
        if (client) {
          if (gameDef.isScore) {
            const { data } = await client.from('game_scores').select('username, score, created_at').eq('game_id', tabId).order('score', { ascending: false }).limit(10);
            if (data && data.length > 0) scores = data;
          } else {
            const { data } = await client.from('profiles').select('username, wins').order('wins', { ascending: false }).limit(10);
            if (data && data.length > 0) {
              scores = data.map(d => ({ username: d.username, score: d.wins }));
            }
          }
        }

        const topContainer = document.getElementById('lb-game-top-list');
        if (topContainer) {
          if (scores.length > 0) {
            topContainer.innerHTML = scores.map((s, idx) => {
              const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
              return `
                <div class="lb-rank-row rank-${idx + 1}">
                  <span class="rank-medal">${medals[idx] || (idx + 1)}</span>
                  <div class="rank-user-info">
                    <span class="rank-username">${s.username}</span>
                  </div>
                  <div class="rank-stats">
                    <strong style="color:#f59e0b; font-size:1.05rem;">${s.score.toLocaleString()}</strong>
                    <span style="font-size:0.75rem; color:var(--text-secondary); margin-left:4px;">${gameDef.unit}</span>
                  </div>
                </div>
              `;
            }).join('');
          } else {
            // Hiển thị thành tích cá nhân nếu server chưa có người chơi
            topContainer.innerHTML = `
              <div style="text-align:center; padding:24px 12px; background:var(--card-bg); border-radius:12px; border:1px dashed var(--border);">
                <div style="font-size:2rem; margin-bottom:6px;">🎮</div>
                <p style="font-size:0.9rem; font-weight:700; color:var(--text-primary); margin-bottom:4px;">Hãy là người đầu tiên ghi danh bảng vàng!</p>
                <p style="font-size:0.8rem; color:var(--text-secondary);">Thành tích hiện tại của bạn: <strong>${myVal} ${gameDef.unit}</strong></p>
              </div>
            `;
          }
        }
      } catch (e) {
        console.warn('Lỗi tải top game:', e);
      }
    }
  }

  // Khởi tạo thanh tab cho Leaderboard
  function openLeaderboardModal() {
    const tabsContainer = document.getElementById('lb-tabs-scroll');
    if (tabsContainer) {
      tabsContainer.innerHTML = LEADERBOARD_GAMES.map(g => `
        <button class="lb-tab-btn ${g.id === currentLbTab ? 'active' : ''}" data-tab="${g.id}" onclick="UIManager.selectLbTab('${g.id}')">
          <span>${g.icon}</span>
          <span>${g.name}</span>
        </button>
      `).join('');
    }

    renderLeaderboardTab(currentLbTab);
    document.getElementById('lb-overlay').classList.add('active');
    SoundManager.play('button');
  }

  document.getElementById('leaderboard-btn').addEventListener('click', openLeaderboardModal);

  document.getElementById('lb-close').addEventListener('click', () => {
    document.getElementById('lb-overlay').classList.remove('active');
  });

  document.getElementById('lb-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('lb-overlay')) {
      document.getElementById('lb-overlay').classList.remove('active');
    }
  });

  return { 
    toast, 
    showWin, 
    showLoss, 
    launchConfetti, 
    selectLbTab: (tabId) => renderLeaderboardTab(tabId),
    openLeaderboardModal
  };
})();

/* ==========================================
   GAME MODAL MANAGER
   ========================================== */
const GameModal = (() => {
  let currentGame = null;
  const overlay = document.getElementById('modal-overlay');
  const modal   = document.getElementById('game-modal');

  function open(gameId) {
    // Mở game trực tiếp - nếu chưa đăng nhập thì nhắc nhẹ chế độ Khách (Guest)
    if (typeof AuthManager !== 'undefined' && !AuthManager.isLoggedIn()) {
      UIManager.toast('ℹ️ Bạn đang chơi với tư cách Khách. Đăng nhập để lưu điểm & xếp hạng!', 'info', 3000);
    }

    const def = GameRegistry.get(gameId);
    if (!def) return;

    currentGame = gameId;
    document.getElementById('modal-icon').textContent  = def.icon;
    document.getElementById('modal-title').textContent = def.name;

    // Reset game container to ready state
    const body = document.getElementById('modal-body');
    body.innerHTML = '';

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
          if (def.startMode) def.startMode(mode.id);
          else if (def.start) def.start();
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
      if (def.start) def.start();
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

  function restartCurrent() {
    if (!currentGame) return;
    const def = GameRegistry.get(currentGame);
    if (!def) return;
    const activeModeBtn = document.querySelector('.mode-btn.active');
    const modeId = activeModeBtn ? activeModeBtn.dataset.mode : (def.modes ? def.modes[0].id : null);
    if (modeId && def.startMode) def.startMode(modeId);
    else if (def.start) def.start();
    SoundManager.play('button');
  }

  function setScore(score) {
    const el = document.getElementById('game-score');
    if (!el) return;
    el.textContent = score;
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
  }

  function setStatus(status) {
    const el = document.getElementById('game-status');
    if (el) el.textContent = status;
  }

  // Controls
  document.getElementById('modal-close').addEventListener('click', close);
  document.getElementById('modal-restart').addEventListener('click', restartCurrent);

  document.getElementById('modal-fullscreen').addEventListener('click', () => {
    modal.classList.toggle('fullscreen');
    document.getElementById('modal-fullscreen').textContent = modal.classList.contains('fullscreen') ? '⊡' : '⛶';
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  return { open, close, setScore, setStatus, restartCurrent };
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
