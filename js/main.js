/* ==========================================
   MAIN.JS – App Entry Point
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {

  /* ── FILTER BUTTONS ── */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.game-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;

      cards.forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
      SoundManager.play('button');
    });
  });

  /* ── GAME CARD CLICK ── */
  document.querySelectorAll('.game-card, .play-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = el.closest('.game-card') || el;
      const gameId = card.dataset.game;
      if (gameId) {
        GameModal.open(gameId);
      }
    });
  });

  /* ── SMOOTH SCROLL ── */
  document.querySelectorAll('.scroll-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ── NAVBAR SCROLL EFFECT ── */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.style.boxShadow = '0 4px 30px rgba(0,0,0,0.3)';
    } else {
      navbar.style.boxShadow = 'none';
    }
  }, { passive: true });

  /* ── INTERSECTION OBSERVER (card fade in) ── */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(card);
  });

  /* ── KEYBOARD SHORTCUT ── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('win-overlay').classList.remove('active');
    }
    if (e.key === 't' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      document.getElementById('theme-toggle').click();
    }
  });

  /* ── WELCOME TOAST ── */
  setTimeout(() => {
    const stats = StreakManager.getAllStats();
    if (stats.totalWins > 0) {
      UIManager.toast(`🎮 Chào mừng trở lại! Bạn đã thắng ${stats.totalWins} trận.`, 'info');
    } else {
      UIManager.toast('🎮 Chào mừng đến Game Hub! Chọn game và bắt đầu chơi!', 'info');
    }
  }, 1000);

  console.log('%c🎮 Game Hub Loaded!', 'font-size:20px;color:#818cf8;font-weight:bold;');
  console.log('%cGames: Caro, Chess, Xiangqi, Ô Ăn Quan, Flappy Bird, Pac-Man, Mario, Snake', 'color:#94a3b8;');
});
