/* ==========================================
   AUTHENTICATION & SUPABASE SQL
   ========================================== */
const AuthManager = (() => {
  'use strict';

  // =============================================
  // 🔑 CẤU HÌNH SUPABASE - HARDCODE TRỰC TIẾP
  // =============================================
  const SUPABASE_URL = 'https://ozleahseimtzzzfotuab.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96bGVhaHNlaW10enp6Zm90dWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyODI3NDIsImV4cCI6MjEwODg1ODc0Mn0.fk5ry6a5xv57aaN6O7CnDA-VNq9boZzfFxBfatr5Ihw';

  // Xóa key cũ / URL cũ sai trong localStorage (nếu còn)
  localStorage.removeItem('supabase_url');

  let currentUser = null;
  let supabaseClient = null;

  // =============================================
  // KHỞI TẠO
  // =============================================
  function init() {
    // Khởi tạo Supabase client
    if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'REPLACE_WITH_YOUR_ANON_KEY') {
      try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase kết nối thành công!');
      } catch (e) {
        console.warn('⚠️ Lỗi kết nối Supabase:', e);
        supabaseClient = null;
      }
    } else {
      console.warn('⚠️ Chưa có anon key — chạy chế độ offline (localStorage)');
    }

    // Phục hồi phiên đăng nhập đã lưu
    const savedUser = localStorage.getItem('gamehub_current_user');
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        if (currentUser && currentUser.id && window.ShopManager) {
          ShopManager.loadFromCloud(currentUser.id);
        }
      } catch (e) {
        currentUser = null;
        localStorage.removeItem('gamehub_current_user');
      }
    }

    updateNavbarUI();

    // Bắt buộc đăng nhập nếu chưa có session
    if (!currentUser) {
      setTimeout(() => openAuthModal('login'), 700);
    }
  }

  // =============================================
  // ĐĂNG KÝ
  // =============================================
  async function register(username, email, password) {
    username = (username || '').trim();
    email    = (email    || '').trim().toLowerCase();
    password = (password || '').trim();

    if (!username || !email || !password) {
      throw new Error('Vui lòng điền đầy đủ thông tin!');
    }
    if (password.length < 6) {
      throw new Error('Mật khẩu phải từ 6 ký tự trở lên!');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Email không hợp lệ!');
    }

    // --- Đăng ký qua Supabase ---
    if (supabaseClient) {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { username } }
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already')) {
          throw new Error('Email này đã được đăng ký. Vui lòng đăng nhập!');
        }
        throw new Error(error.message);
      }

      // Lưu profile vào bảng SQL
      if (data.user) {
        const { error: profErr } = await supabaseClient.from('profiles').insert([{
          id: data.user.id,
          username,
          email,
          wins: 0,
          streak: 0,
          coins: 100,
          inventory: { items: [], equipped: { frame: null, title: null, theme: null } }
        }]);
        if (profErr) {
          console.warn('Lưu profile thất bại:', profErr.message);
        }
      }

      currentUser = {
        id: data.user.id,
        username,
        email: data.user.email
      };
      _saveSession(currentUser);
      return currentUser;
    }

    // --- Chế độ Offline ---
    const users = JSON.parse(localStorage.getItem('gamehub_sql_users') || '[]');
    if (users.some(u => u.username === username)) {
      throw new Error('Tên người dùng đã tồn tại!');
    }
    if (users.some(u => u.email === email)) {
      throw new Error('Email này đã được đăng ký!');
    }

    const newUser = {
      id: 'user_' + Date.now(),
      username,
      email,
      password: btoa(unescape(encodeURIComponent(password))),
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('gamehub_sql_users', JSON.stringify(users));

    currentUser = { id: newUser.id, username, email };
    _saveSession(currentUser);
    return currentUser;
  }

  // =============================================
  // ĐĂNG NHẬP
  // =============================================
  async function login(usernameOrEmail, password) {
    usernameOrEmail = (usernameOrEmail || '').trim();
    password        = (password        || '').trim();

    if (!usernameOrEmail || !password) {
      throw new Error('Vui lòng nhập tên đăng nhập và mật khẩu!');
    }

    // --- Đăng nhập qua Supabase ---
    if (supabaseClient) {
      let loginEmail = usernameOrEmail;

      // Nếu nhập username (không có @), tra email trong profiles
      if (!usernameOrEmail.includes('@')) {
        const { data: profile, error: profErr } = await supabaseClient
          .from('profiles')
          .select('email')
          .eq('username', usernameOrEmail)
          .maybeSingle();

        if (profile && profile.email) {
          loginEmail = profile.email;
        } else {
          throw new Error('Không tìm thấy tài khoản với tên người dùng này!');
        }
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: loginEmail,
        password
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          throw new Error('Bạn cần tắt xác thực email trong Supabase:\nAuthentication → Providers → Email → tắt "Confirm email"');
        }
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Sai email/username hoặc mật khẩu!');
        }
        throw new Error(error.message);
      }

      const username = data.user.user_metadata?.username || usernameOrEmail.split('@')[0];
      currentUser = { id: data.user.id, username, email: data.user.email };
      _saveSession(currentUser);
      return currentUser;
    }

    // --- Chế độ Offline ---
    const users = JSON.parse(localStorage.getItem('gamehub_sql_users') || '[]');
    const encoded = btoa(unescape(encodeURIComponent(password)));
    const user = users.find(u =>
      (u.username === usernameOrEmail || u.email === usernameOrEmail) &&
      u.password === encoded
    );

    if (!user) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác!');
    }

    currentUser = { id: user.id, username: user.username, email: user.email };
    _saveSession(currentUser);
    return currentUser;
  }

  // =============================================
  // ĐĂNG XUẤT
  // =============================================
  function logout() {
    if (supabaseClient) {
      supabaseClient.auth.signOut().catch(() => {});
    }
    currentUser = null;
    localStorage.removeItem('gamehub_current_user');
    updateNavbarUI();
    if (window.UIManager) UIManager.toast('👋 Đã đăng xuất!', 'info');
    // Bắt buộc đăng nhập lại
    setTimeout(() => openAuthModal('login'), 400);
  }

  // =============================================
  // INTERNAL
  // =============================================
  function _saveSession(user) {
    localStorage.setItem('gamehub_current_user', JSON.stringify(user));
    updateNavbarUI();
    if (user && user.id && window.ShopManager) {
      ShopManager.loadFromCloud(user.id);
    }
  }

  function updateNavbarUI() {
    const area = document.getElementById('nav-user-area');
    if (!area) return;

    if (currentUser) {
      // Lấy thông tin trang bị hiện tại để render ngay lập tức (không bị mất khi reload)
      const inv = (window.ShopManager && ShopManager.getInventory) ? ShopManager.getInventory() : null;
      const equipped = inv?.equipped || {};
      const titleItem = (equipped.title && window.ShopManager?.getItem) ? ShopManager.getItem(equipped.title) : null;
      const titleText = titleItem ? `【${titleItem.name}】` : '';
      const frameClass = equipped.frame || '';

      area.innerHTML = `
        <div class="user-pill" style="
          display:flex; align-items:center; gap:8px;
          background:var(--card-bg); border:1px solid var(--border);
          padding:4px 12px; border-radius:999px; font-size:0.85rem; font-weight:700;
        ">
          <div class="user-avatar-frame ${frameClass}" style="display:inline-flex; align-items:center; justify-content:center;">
            <span>👤</span>
          </div>
          <span>${currentUser.username}</span>
          <span class="user-title-display" style="font-size:0.75rem; color:#f59e0b; ${titleText ? 'display:inline-block;' : 'display:none;'}">${titleText}</span>
          <button id="logout-btn" style="
            background:transparent; border:none; color:#ef4444;
            cursor:pointer; font-size:0.8rem; font-weight:800; padding:2px 4px;
          " title="Đăng xuất">Thoát</button>
        </div>`;
      const btn = document.getElementById('logout-btn');
      if (btn) btn.onclick = logout;
      if (window.ShopManager && ShopManager.applyEquippedEffects) {
        ShopManager.applyEquippedEffects();
      }
    } else {
      area.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px;">
          <button id="nav-login-btn" class="btn-secondary" style="
            padding:6px 12px; font-size:0.82rem; border-radius:999px;
          ">Đăng nhập</button>
          <button id="nav-register-btn" class="btn-primary" style="
            padding:6px 12px; font-size:0.82rem; border-radius:999px;
          ">Đăng ký</button>
        </div>`;
      const l = document.getElementById('nav-login-btn');
      if (l) l.onclick = () => openAuthModal('login');
      const r = document.getElementById('nav-register-btn');
      if (r) r.onclick = () => openAuthModal('register');
    }
  }

  // =============================================
  // MODAL HELPERS
  // =============================================
  function openAuthModal(mode = 'login') {
    const modal = document.getElementById('auth-modal-overlay');
    if (!modal) return;
    modal.classList.add('active');
    switchAuthTab(mode);
  }

  function closeAuthModal() {
    // Chỉ cho phép đóng nếu đã đăng nhập
    if (!currentUser) return;
    const modal = document.getElementById('auth-modal-overlay');
    if (modal) modal.classList.remove('active');
  }

  function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    const tl = document.getElementById('auth-tab-login');
    const tr = document.getElementById('auth-tab-register');
    const fl = document.getElementById('auth-form-login');
    const fr = document.getElementById('auth-form-register');
    const em = document.getElementById('auth-error-msg');
    if (tl) tl.classList.toggle('active', isLogin);
    if (tr) tr.classList.toggle('active', !isLogin);
    if (fl) fl.style.display = isLogin ? 'block' : 'none';
    if (fr) fr.style.display = !isLogin ? 'block' : 'none';
    if (em) em.textContent = '';
  }

  // Khởi chạy khi DOM sẵn sàng
  document.addEventListener('DOMContentLoaded', init);

  return {
    isLoggedIn:         () => !!currentUser,
    getCurrentUser:     () => currentUser,
    getSupabaseClient:  () => supabaseClient,
    register,
    login,
    logout,
    openAuthModal,
    closeAuthModal,
    switchAuthTab
  };
})();
