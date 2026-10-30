/* ==========================================
   SHOP & GACHA & COINS SYSTEM (SUPABASE CLOUD)
   ========================================== */
const ShopManager = (() => {
  'use strict';

  // Danh mục vật phẩm trong Shop
  const SHOP_ITEMS = [
    // 1. KHUNG AVATAR
    { id: 'frame_neon', name: 'Khung Neon Xanh', type: 'frame', price: 100, rarity: 'rare', icon: '💠', desc: 'Viền phát sáng phong cách Cyberpunk' },
    { id: 'frame_fire', name: 'Khung Lửa Rực Cháy', type: 'frame', price: 200, rarity: 'epic', icon: '🔥', desc: 'Hiệu ứng lửa ma thuật bao quanh avatar' },
    { id: 'frame_gold', name: 'Vương Miện Hoàng Gia', type: 'frame', price: 350, rarity: 'legendary', icon: '👑', desc: 'Khung dát vàng lấp lánh khẳng định đẳng cấp Top 1' },
    { id: 'frame_sakura', name: 'Hoa Anh Đào Nhật Bản', type: 'frame', price: 120, rarity: 'rare', icon: '🌸', desc: 'Cánh hoa rơi nhẹ nhàng chung quanh' },

    // 2. DANH HIỆU (TITLES)
    { id: 'title_pikachu', name: 'Thần Đồng Pikachu', type: 'title', price: 80, rarity: 'common', icon: '⚡', desc: 'Danh hiệu cho cao thủ tinh mắt nối hình' },
    { id: 'title_chess', name: 'Đại Kiện Tướng', type: 'title', price: 150, rarity: 'rare', icon: '♟️', desc: 'Bậc thầy tính nước cờ vua và cờ tướng' },
    { id: 'title_millionaire', name: 'Đại Gia Game Hub', type: 'title', price: 500, rarity: 'legendary', icon: '💎', desc: 'Danh xưng quyền quý tỏa sáng lấp lánh' },
    { id: 'title_invincible', name: 'Chiến Thần Bất Bại', type: 'title', price: 300, rarity: 'epic', icon: '⚔️', desc: 'Uy lực áp đảo mọi đối thủ trong đấu trường' },

    // 3. GIAO DIỆN WEB (THEMES)
    { id: 'theme_cyberpunk', name: 'Theme Cyberpunk 2077', type: 'theme', price: 250, rarity: 'epic', icon: '🌆', desc: 'Tone màu Neon hồng tím tương lai hiện đại' },
    { id: 'theme_retro', name: 'Theme Retro 8-Bit Arcade', type: 'theme', price: 180, rarity: 'rare', icon: '👾', desc: 'Phong cách máy thùng thập niên 80 hoài niệm' }
  ];

  // Gacha Pool (Tỷ lệ rơi vật phẩm)
  const GACHA_COST = 50;
  const GACHA_POOL = [
    { type: 'coins', amount: 30, weight: 35, name: 'Túi 30 Xu', rarity: 'common', icon: '🪙' },
    { type: 'coins', amount: 80, weight: 25, name: 'Rương 80 Xu Lời To', rarity: 'rare', icon: '💰' },
    { type: 'item', itemId: 'title_pikachu', weight: 15, rarity: 'common' },
    { type: 'item', itemId: 'frame_neon', weight: 10, rarity: 'rare' },
    { type: 'item', itemId: 'frame_sakura', weight: 8, rarity: 'rare' },
    { type: 'item', itemId: 'frame_fire', weight: 5, rarity: 'epic' },
    { type: 'item', itemId: 'theme_cyberpunk', weight: 4, rarity: 'epic' },
    { type: 'item', itemId: 'frame_gold', weight: 1.5, rarity: 'legendary' },
    { type: 'item', itemId: 'title_millionaire', weight: 1.5, rarity: 'legendary' }
  ];

  let currentCoins = 100;
  let inventory = {
    items: [],
    equipped: { frame: null, title: null, theme: null }
  };

  // Khởi tạo
  function init() {
    loadLocalData();
    updateCoinsDisplay();
    applyEquippedEffects();
    bindShopUI();
  }

  function loadLocalData() {
    const savedCoins = localStorage.getItem('gamehub_coins');
    if (savedCoins !== null) {
      currentCoins = parseInt(savedCoins, 10) || 0;
    }

    const savedInv = localStorage.getItem('gamehub_inventory');
    if (savedInv) {
      try {
        inventory = JSON.parse(savedInv);
      } catch (e) {
        inventory = { items: [], equipped: {} };
      }
    }
  }

  function saveLocalData() {
    localStorage.setItem('gamehub_coins', currentCoins.toString());
    localStorage.setItem('gamehub_inventory', JSON.stringify(inventory));
    updateCoinsDisplay();
    syncToCloud();
  }

  // Đồng bộ lên Supabase nếu có đăng nhập
  async function syncToCloud() {
    if (typeof AuthManager !== 'undefined' && AuthManager.isLoggedIn()) {
      const user = AuthManager.getCurrentUser();
      if (!user || !user.id) return;

      const client = AuthManager.getSupabaseClient ? AuthManager.getSupabaseClient() : null;
      if (client) {
        try {
          await client.from('profiles').update({
            coins: currentCoins,
            inventory: inventory
          }).eq('id', user.id);
        } catch (e) {
          console.warn('Sync coins failed:', e);
        }
      }
    }
  }

  // Tải dữ liệu từ Supabase khi người dùng đăng nhập
  async function loadFromCloud(userId) {
    if (typeof AuthManager !== 'undefined') {
      const client = AuthManager.getSupabaseClient ? AuthManager.getSupabaseClient() : null;
      if (client && userId) {
        try {
          const { data, error } = await client.from('profiles').select('coins, inventory').eq('id', userId).single();
          if (data && !error) {
            if (typeof data.coins === 'number') {
              currentCoins = data.coins;
            }
            if (data.inventory && typeof data.inventory === 'object') {
              // Hợp nhất túi đồ (không làm mất đồ cục bộ)
              if (Array.isArray(data.inventory.items)) {
                data.inventory.items.forEach(it => {
                  if (!inventory.items.includes(it)) inventory.items.push(it);
                });
              }
              if (data.inventory.equipped && typeof data.inventory.equipped === 'object') {
                inventory.equipped = Object.assign({}, inventory.equipped, data.inventory.equipped);
              }
            }
            saveLocalData();
            applyEquippedEffects();
          }
        } catch (e) {
          console.warn('Lỗi tải dữ liệu shop từ Cloud:', e);
        }
      }
    }
  }

  function addCoins(amount, reason = '') {
    currentCoins += amount;
    saveLocalData();
    if (window.UIManager) {
      UIManager.toast(`🪙 +${amount} Xu: ${reason}`, 'success');
    }
    if (window.SoundManager) SoundManager.play('win');
  }

  function deductCoins(amount) {
    if (currentCoins < amount) return false;
    currentCoins -= amount;
    saveLocalData();
    return true;
  }

  function getCoins() {
    return currentCoins;
  }

  function getInventory() {
    return inventory;
  }

  function hasItem(itemId) {
    return inventory.items.includes(itemId);
  }

  // Mua vật phẩm trong Shop
  function buyItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return { success: false, msg: 'Vật phẩm không tồn tại!' };

    if (hasItem(itemId)) {
      return { success: false, msg: 'Bạn đã sở hữu vật phẩm này rồi!' };
    }

    if (!deductCoins(item.price)) {
      return { success: false, msg: 'Bạn không đủ Xu để mua vật phẩm này!' };
    }

    inventory.items.push(itemId);
    saveLocalData();
    if (window.SoundManager) SoundManager.play('win');

    // Tự động trang bị nếu vị trí đó trống
    if (!inventory.equipped[item.type]) {
      equipItem(itemId);
    }

    return { success: true, item };
  }

  // Trang bị / Tháo vật phẩm
  function equipItem(itemId) {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item || !hasItem(itemId)) return;

    if (inventory.equipped[item.type] === itemId) {
      // Đang trang bị -> Tháo ra
      inventory.equipped[item.type] = null;
    } else {
      // Trang bị
      inventory.equipped[item.type] = itemId;
    }

    saveLocalData();
    applyEquippedEffects();
  }

  // Áp dụng trang trí lên UI
  function applyEquippedEffects() {
    const equipped = inventory.equipped || {};
    const root = document.documentElement;

    // 1. Áp dụng Khung Avatar
    const avatarEls = document.querySelectorAll('.user-avatar-frame');
    avatarEls.forEach(el => {
      el.className = 'user-avatar-frame';
      if (equipped.frame) {
        el.classList.add(equipped.frame);
      }
    });

    // 2. Áp dụng Danh hiệu
    const titleEls = document.querySelectorAll('.user-title-display');
    titleEls.forEach(el => {
      if (equipped.title) {
        const titleItem = SHOP_ITEMS.find(i => i.id === equipped.title);
        el.textContent = titleItem ? `【${titleItem.name}】` : '';
        el.style.display = 'inline-block';
      } else {
        el.textContent = '';
        el.style.display = 'none';
      }
    });

    // 3. Áp dụng Theme
    if (equipped.theme === 'theme_cyberpunk') {
      root.setAttribute('data-shop-theme', 'cyberpunk');
    } else if (equipped.theme === 'theme_retro') {
      root.setAttribute('data-shop-theme', 'retro');
    } else {
      root.removeAttribute('data-shop-theme');
    }
  }

  // Vòng quay Gacha
  function rollGacha() {
    if (!deductCoins(GACHA_COST)) {
      return { success: false, msg: `Cần ${GACHA_COST} Xu để quay Gacha!` };
    }

    // Chọn phần thưởng theo tỉ lệ trọng số
    const totalWeight = GACHA_POOL.reduce((acc, cur) => acc + cur.weight, 0);
    let rand = Math.random() * totalWeight;
    let reward = GACHA_POOL[0];

    for (const entry of GACHA_POOL) {
      if (rand < entry.weight) {
        reward = entry;
        break;
      }
      rand -= entry.weight;
    }

    let result = { success: true, reward };

    if (reward.type === 'coins') {
      currentCoins += reward.amount;
      saveLocalData();
    } else if (reward.type === 'item') {
      const item = SHOP_ITEMS.find(i => i.id === reward.itemId);
      if (item) {
        if (!hasItem(item.id)) {
          inventory.items.push(item.id);
          saveLocalData();
          result.isNew = true;
        } else {
          // Trùng đồ -> quy đổi ra xu đền bù
          const compensation = Math.floor(item.price * 0.6);
          currentCoins += compensation;
          saveLocalData();
          result.duplicateCompensation = compensation;
        }
        result.item = item;
      }
    }

    return result;
  }

  // Cập nhật số dư Xu trên Navbar & Modal
  function updateCoinsDisplay() {
    const coinEls = document.querySelectorAll('.user-coins-val');
    coinEls.forEach(el => {
      el.textContent = currentCoins.toLocaleString();
    });
  }

  function bindShopUI() {
    const shopBtn = document.getElementById('shop-nav-btn');
    if (shopBtn) {
      shopBtn.onclick = () => openShopModal('shop');
    }

    const gachaBtn = document.getElementById('gacha-nav-btn');
    if (gachaBtn) {
      gachaBtn.onclick = () => openShopModal('gacha');
    }
  }

  function openShopModal(tab = 'shop') {
    const modal = document.getElementById('shop-modal-overlay');
    if (!modal) return;
    modal.classList.add('active');
    switchShopTab(tab);
    renderShopItems();
  }

  function closeShopModal() {
    const modal = document.getElementById('shop-modal-overlay');
    if (modal) modal.classList.remove('active');
  }

  function switchShopTab(tab) {
    const isShop = tab === 'shop';
    const isGacha = tab === 'gacha';
    const isInv = tab === 'inventory';

    document.getElementById('shop-tab-items')?.classList.toggle('active', isShop);
    document.getElementById('shop-tab-gacha')?.classList.toggle('active', isGacha);
    document.getElementById('shop-tab-inventory')?.classList.toggle('active', isInv);

    document.getElementById('shop-view-items').style.display = isShop ? 'grid' : 'none';
    document.getElementById('shop-view-gacha').style.display = isGacha ? 'flex' : 'none';
    document.getElementById('shop-view-inventory').style.display = isInv ? 'grid' : 'none';

    if (isInv) renderInventory();
  }

  function renderShopItems() {
    const container = document.getElementById('shop-view-items');
    if (!container) return;

    container.innerHTML = SHOP_ITEMS.map(item => {
      const owned = hasItem(item.id);
      return `
        <div class="shop-card rarity-${item.rarity} ${owned ? 'owned' : ''}">
          <div class="shop-card-icon">${item.icon}</div>
          <div class="shop-card-body">
            <div class="shop-card-title">${item.name}</div>
            <div class="shop-card-desc">${item.desc}</div>
            <div class="shop-card-footer">
              <span class="shop-price">🪙 ${item.price} Xu</span>
              ${owned 
                ? `<button class="btn-secondary btn-sm" disabled>Đã sở hữu</button>` 
                : `<button class="btn-primary btn-sm btn-buy" data-id="${item.id}">Mua ngay</button>`
              }
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-buy').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const res = buyItem(id);
        if (res.success) {
          if (window.UIManager) UIManager.toast(`🎉 Mua thành công ${res.item.name}!`, 'success');
          renderShopItems();
        } else {
          if (window.UIManager) UIManager.toast(`⚠️ ${res.msg}`, 'info');
        }
      };
    });
  }

  function renderInventory() {
    const container = document.getElementById('shop-view-inventory');
    if (!container) return;

    if (inventory.items.length === 0) {
      container.innerHTML = `<div class="empty-inv-msg">📦 Bạn chưa có vật phẩm nào. Hãy ghé Shop hoặc thử vận may với Gacha nhé!</div>`;
      return;
    }

    container.innerHTML = inventory.items.map(id => {
      const item = SHOP_ITEMS.find(i => i.id === id);
      if (!item) return '';
      const isEquipped = inventory.equipped[item.type] === item.id;
      return `
        <div class="shop-card rarity-${item.rarity} ${isEquipped ? 'equipped' : ''}">
          <div class="shop-card-icon">${item.icon}</div>
          <div class="shop-card-body">
            <div class="shop-card-title">${item.name}</div>
            <div class="shop-card-desc">${item.desc}</div>
            <div class="shop-card-footer">
              <span class="shop-tag">${item.type.toUpperCase()}</span>
              <button class="btn-sm ${isEquipped ? 'btn-secondary' : 'btn-primary'} btn-equip" data-id="${item.id}">
                ${isEquipped ? 'Tháo ra' : 'Trang bị'}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-equip').forEach(btn => {
      btn.onclick = () => {
        equipItem(btn.dataset.id);
        renderInventory();
      };
    });
  }

  // Khởi chạy khi DOM load
  document.addEventListener('DOMContentLoaded', init);

  return {
    init,
    getCoins,
    addCoins,
    deductCoins,
    getInventory,
    hasItem,
    getItem: (id) => SHOP_ITEMS.find(i => i.id === id),
    buyItem,
    equipItem,
    applyEquippedEffects,
    rollGacha,
    loadFromCloud,
    openShopModal,
    closeShopModal,
    switchShopTab,
    GACHA_COST
  };
})();
