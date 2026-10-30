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

  /* ── GAME CARD CLICK (MỞ NGAY LẬP TỨC) ── */
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

  /* ── TẢI DỮ LIỆU BẢNG VÀNG VINH DANH (100% NGƯỜI THẬT TỪ SUPABASE) ── */
  async function loadHallOfFame() {
    const podium = document.getElementById('hof-podium');
    if (!podium) return;

    try {
      if (typeof AuthManager !== 'undefined') {
        const client = AuthManager.getSupabaseClient ? AuthManager.getSupabaseClient() : null;
        if (client) {
          const { data, error } = await client
            .from('profiles')
            .select('username, wins, inventory')
            .order('wins', { ascending: false })
            .limit(3);

          if (!error && data && data.length > 0) {
            const top1 = data[0] || null;
            const top2 = data[1] || null;
            const top3 = data[2] || null;

            const renderUserPodium = (user, rankNum, crown, frameClass, defaultAvatar, pillarClass) => {
              if (!user) {
                return `
                  <div class="podium-rank rank-${rankNum}">
                    <div class="podium-crown">${crown}</div>
                    <div class="podium-avatar-wrapper" style="opacity:0.6;">
                      <div class="podium-avatar">👤</div>
                    </div>
                    <div class="podium-name" style="color:var(--text-secondary);">Chờ ghi danh...</div>
                    <div class="podium-title-tag">Vị trí #${rankNum}</div>
                    <div class="podium-score">0 Thắng</div>
                    <div class="podium-pillar ${pillarClass}"><span>#${rankNum}</span></div>
                  </div>
                `;
              }

              const inv = user.inventory || {};
              const equipped = inv.equipped || {};
              const frame = equipped.frame ? `frame-${equipped.frame.replace('frame_', '')}` : frameClass;
              const titleName = equipped.title ? (equipped.title.replace('title_', '').toUpperCase()) : 'Cao Thủ';

              return `
                <div class="podium-rank rank-${rankNum}">
                  <div class="podium-crown">${crown}</div>
                  <div class="podium-avatar-wrapper ${frame}">
                    <div class="podium-avatar">${defaultAvatar}</div>
                  </div>
                  <div class="podium-name" title="${user.username}">${user.username}</div>
                  <div class="podium-title-tag">🎖️ ${titleName}</div>
                  <div class="podium-score"><strong>${(user.wins || 0).toLocaleString()}</strong> Thắng</div>
                  <div class="podium-pillar ${pillarClass}"><span>#${rankNum}</span></div>
                </div>
              `;
            };

            podium.innerHTML = 
              renderUserPodium(top2, 2, '🥈', 'frame-fire', '🔥', 'pillar-2') +
              renderUserPodium(top1, 1, '👑', 'frame-gold', '⚡', 'pillar-1') +
              renderUserPodium(top3, 3, '🥉', 'frame-neon', '🦊', 'pillar-3');
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Load Hall of Fame fallback:', e);
    }

    // Nếu chưa có tài khoản nào trên Supabase
    podium.innerHTML = `
      <div style="text-align:center; padding:30px; width:100%; color:var(--text-secondary); font-size:1rem;">
        🌟 Chưa có người chơi ghi danh trên Bảng Vinh Danh. Hãy chơi và giành chiến thắng đầu tiên để đứng Top 1!
      </div>
    `;
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
