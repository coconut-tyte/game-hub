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

  /* ── GAME CARD CLICK (BẮT BUỘC ĐĂNG NHẬP) ── */
  document.querySelectorAll('.game-card, .play-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = el.closest('.game-card') || el;
      const gameId = card.dataset.game;
      if (gameId) {
        if (typeof AuthManager !== 'undefined' && !AuthManager.isLoggedIn()) {
          UIManager.toast('⚠️ Bạn cần Đăng Nhập hoặc Tạo Tài Khoản để chơi game!', 'info');
          AuthManager.openAuthModal('login');
          return;
        }
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
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.05 });

  cards.forEach(card => {
    observer.observe(card);
  });

  /* ── MÀN HÌNH LOADING & HƯỚNG DẪN ── */
  const loader = document.getElementById('loading-screen');
  if (loader) {
    let progress = 0;
    const pBar = document.getElementById('loading-progress-bar');
    const pText = document.getElementById('loading-text');

    const loadInterval = setInterval(() => {
      progress += Math.floor(Math.random() * 20) + 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(loadInterval);
        if (pBar) pBar.style.width = '100%';
        if (pText) pText.textContent = 'Hoàn tất! Sẵn sàng chơi...';
        
        setTimeout(() => {
          loader.style.opacity = '0';
          loader.style.pointerEvents = 'none';
          setTimeout(() => loader.remove(), 400);

          // Kiểm tra hiển thị hướng dẫn lần đầu
          if (!localStorage.getItem('gamehub_tutorial_seen')) {
            openTutorialModal();
            localStorage.setItem('gamehub_tutorial_seen', 'true');
          }
        }, 300);
      } else {
        if (pBar) pBar.style.width = progress + '%';
        if (pText) pText.textContent = `Đang tải hệ thống game... ${progress}%`;
      }
    }, 60);
  }

  /* ── NÚT MỞ HƯỚNG DẪN ── */
  const guideBtn = document.getElementById('guide-btn');
  if (guideBtn) {
    guideBtn.onclick = () => openTutorialModal();
  }

  function openTutorialModal() {
    const modal = document.getElementById('tutorial-modal-overlay');
    if (modal) modal.classList.add('active');
    SoundManager.play('button');
  }

  const closeTutorialBtn = document.getElementById('tutorial-close');
  if (closeTutorialBtn) {
    closeTutorialBtn.onclick = () => {
      document.getElementById('tutorial-modal-overlay').classList.remove('active');
    };
  }

  /* ── XỬ LÝ FORM AUTH ── */
  const authClose = document.getElementById('auth-modal-close');
  if (authClose) {
    authClose.onclick = () => AuthManager.closeAuthModal();
  }

  const tabLogin = document.getElementById('auth-tab-login');
  const tabReg = document.getElementById('auth-tab-register');
  if (tabLogin) tabLogin.onclick = () => AuthManager.switchAuthTab('login');
  if (tabReg) tabReg.onclick = () => AuthManager.switchAuthTab('register');

  const btnDoLogin = document.getElementById('btn-submit-login');
  if (btnDoLogin) {
    btnDoLogin.onclick = async () => {
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value;
      const errBox = document.getElementById('auth-error-msg');
      try {
        await AuthManager.login(u, p);
        errBox.textContent = '';
        AuthManager.closeAuthModal();
        UIManager.toast(`🎉 Chào mừng ${u} trở lại Game Hub!`, 'success');
      } catch (err) {
        errBox.textContent = err.message;
        SoundManager.play('lose');
      }
    };
  }

  const btnDoReg = document.getElementById('btn-submit-register');
  if (btnDoReg) {
    btnDoReg.onclick = async () => {
      const u = document.getElementById('reg-username').value.trim();
      const e = document.getElementById('reg-email').value.trim();
      const p = document.getElementById('reg-password').value;
      const errBox = document.getElementById('auth-error-msg');
      try {
        await AuthManager.register(u, e, p);
        errBox.textContent = '';
        AuthManager.closeAuthModal();
        UIManager.toast(`🎉 Đăng ký thành công! Chào mừng ${u}!`, 'success');
      } catch (err) {
        errBox.textContent = err.message;
        SoundManager.play('lose');
      }
    };
  }

  /* ── NÚT KẾT NỐI SQL MODAL ── */
  const sqlBtn = document.getElementById('sql-config-btn');
  if (sqlBtn) {
    sqlBtn.onclick = () => {
      document.getElementById('sql-modal-overlay').classList.add('active');
      SoundManager.play('button');
    };
  }
  const sqlClose = document.getElementById('sql-modal-close');
  if (sqlClose) {
    sqlClose.onclick = () => {
      document.getElementById('sql-modal-overlay').classList.remove('active');
    };
  }
  const sqlSaveBtn = document.getElementById('btn-save-sql');
  if (sqlSaveBtn) {
    sqlSaveBtn.onclick = () => {
      const url = document.getElementById('cfg-sql-url').value.trim();
      const key = document.getElementById('cfg-sql-key').value.trim();
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_key', key);
      UIManager.toast('💾 Đã lưu cấu hình Supabase SQL! Tải lại trang...', 'success');
      setTimeout(() => location.reload(), 800);
    };
  }

  /* ── XỬ LÝ QUAY GACHA ── */
  const btnGachaRoll = document.getElementById('btn-gacha-roll');
  const gachaChest = document.getElementById('gacha-chest-box');
  const gachaResOverlay = document.getElementById('gacha-result-overlay');
  const btnClaim = document.getElementById('btn-gacha-claim');

  if (btnGachaRoll) {
    btnGachaRoll.addEventListener('click', () => {
      if (btnGachaRoll.disabled) return;

      const res = ShopManager.rollGacha();
      if (!res.success) {
        UIManager.toast(`⚠️ ${res.msg}`, 'info');
        return;
      }

      // Hiệu ứng mở rương
      btnGachaRoll.disabled = true;
      gachaChest.classList.add('shaking');
      SoundManager.play('deal');

      setTimeout(() => {
        gachaChest.classList.remove('shaking');
        btnGachaRoll.disabled = false;

        const iconEl = document.getElementById('gacha-res-icon');
        const nameEl = document.getElementById('gacha-res-name');
        const descEl = document.getElementById('gacha-res-desc');
        const cardEl = document.getElementById('gacha-result-card');

        cardEl.className = 'gacha-result-card rarity-' + res.reward.rarity;

        if (res.reward.type === 'coins') {
          iconEl.textContent = res.reward.icon;
          nameEl.textContent = res.reward.name;
          descEl.textContent = `Bạn nhận được +${res.reward.amount} Xu 🪙 vào tài khoản!`;
        } else if (res.reward.type === 'item') {
          iconEl.textContent = res.item.icon;
          nameEl.textContent = res.item.name;
          if (res.duplicateCompensation) {
            descEl.textContent = `Vật phẩm đã sở hữu! Đã quy đổi thành +${res.duplicateCompensation} Xu 🪙`;
          } else {
            descEl.textContent = `🎉 VẬT PHẨM MỚI! ${res.item.desc}`;
          }
        }

        gachaResOverlay.style.display = 'flex';
        SoundManager.play('win');
      }, 1100);
    });
  }

  if (btnClaim) {
    btnClaim.addEventListener('click', () => {
      gachaResOverlay.style.display = 'none';
    });
  }

  /* ── TẢI DỮ LIỆU BẢNG VÀNG VINH DANH (HALL OF FAME) ── */
  async function loadHallOfFame() {
    try {
      if (typeof AuthManager !== 'undefined') {
        const client = AuthManager.getSupabaseClient ? AuthManager.getSupabaseClient() : null;
        if (client) {
          const { data, error } = await client
            .from('profiles')
            .select('username, wins, inventory')
            .order('wins', { ascending: false })
            .limit(3);

          if (data && data.length > 0 && !error) {
            const ranks = [
              { nameId: 'hof-name-1', scoreId: 'hof-score-1', idx: 0 },
              { nameId: 'hof-name-2', scoreId: 'hof-score-2', idx: 1 },
              { nameId: 'hof-name-3', scoreId: 'hof-score-3', idx: 2 }
            ];

            ranks.forEach(r => {
              const user = data[r.idx];
              if (user) {
                const nEl = document.getElementById(r.nameId);
                const sEl = document.getElementById(r.scoreId);
                if (nEl) nEl.textContent = user.username;
                if (sEl) sEl.textContent = (user.wins || 0).toLocaleString();
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('Load Hall of Fame fallback:', e);
    }
  }

  loadHallOfFame();

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
