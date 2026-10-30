/* ==========================================
   STREAK & STATS MANAGER
   ========================================== */
const StreakManager = (() => {
  const KEYS = {
    streak: 'gamehub-streak',
    bestStreak: 'gamehub-best-streak',
    totalWins: 'gamehub-total-wins',
    gameStats: 'gamehub-game-stats'
  };

  let state = {
    streak: 0,
    bestStreak: 0,
    totalWins: 0,
    gameStats: {}
  };

  function load() {
    state.streak     = parseInt(localStorage.getItem(KEYS.streak) || '0');
    state.bestStreak = parseInt(localStorage.getItem(KEYS.bestStreak) || '0');
    state.totalWins  = parseInt(localStorage.getItem(KEYS.totalWins) || '0');
    try {
      state.gameStats = JSON.parse(localStorage.getItem(KEYS.gameStats) || '{}');
    } catch(e) { state.gameStats = {}; }
  }

  function save() {
    localStorage.setItem(KEYS.streak, state.streak);
    localStorage.setItem(KEYS.bestStreak, state.bestStreak);
    localStorage.setItem(KEYS.totalWins, state.totalWins);
    localStorage.setItem(KEYS.gameStats, JSON.stringify(state.gameStats));

    // Đồng bộ wins & streak lên Supabase
    syncStatsToCloud();
  }

  async function syncStatsToCloud() {
    try {
      if (typeof AuthManager === 'undefined' || !AuthManager.isLoggedIn()) return;
      const user = AuthManager.getCurrentUser();
      const client = AuthManager.getSupabaseClient ? AuthManager.getSupabaseClient() : null;
      if (!user || !client) return;

      await client.from('profiles').update({
        wins: state.totalWins,
        streak: state.streak
      }).eq('id', user.id);
    } catch (e) {
      console.warn('StreakManager: Không thể đồng bộ lên cloud', e);
    }
  }

  function updateUI() {
    document.getElementById('streak-count').textContent = state.streak;
    document.getElementById('stat-wins').textContent = state.totalWins;
    document.getElementById('stat-streak').textContent = state.bestStreak;
    document.getElementById('game-streak').textContent = state.streak;

    // Update game win counts on cards
    Object.keys(state.gameStats).forEach(gameId => {
      const el = document.getElementById(`wins-${gameId}`);
      if (el) el.textContent = state.gameStats[gameId]?.wins || 0;
    });

    // Animate fire icon
    const fire = document.querySelector('.streak-fire');
    if (fire) {
      fire.classList.remove('pop');
      void fire.offsetWidth;
      fire.classList.add('pop');
    }
  }

  function recordWin(gameId) {
    state.streak++;
    state.totalWins++;
    if (state.streak > state.bestStreak) state.bestStreak = state.streak;

    if (!state.gameStats[gameId]) state.gameStats[gameId] = { wins: 0, bestScore: 0 };
    state.gameStats[gameId].wins++;

    save();
    updateUI();
    return state.streak;
  }

  function recordLoss() {
    state.streak = 0;
    save();
    updateUI();
  }

  function recordScore(gameId, score) {
    if (!state.gameStats[gameId]) state.gameStats[gameId] = { wins: 0, bestScore: 0 };
    if (score > state.gameStats[gameId].bestScore) {
      state.gameStats[gameId].bestScore = score;
      save();
    }
    // MỌI TRÒ CHƠI CÓ ĐIỂM ĐỀU THƯỞNG XU
    if (score > 0 && window.ShopManager) {
      const earned = Math.max(5, Math.floor(score / 6));
      ShopManager.addCoins(earned, `Ghi ${score} điểm ở ${gameId}`);
    }
    return state.gameStats[gameId].bestScore;
  }

  function getStats(gameId) {
    return state.gameStats[gameId] || { wins: 0, bestScore: 0 };
  }

  function getAllStats() { return { ...state }; }

  load();
  updateUI();

  return { recordWin, recordLoss, recordScore, getStats, getAllStats, updateUI };
})();
