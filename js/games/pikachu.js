/* ==========================================
   PIKACHU CỔ ĐIỂN (ONET CONNECT 2003)
   Thuật toán nối đường I, L, Z chuẩn xác 100%
   Tương thích hoàn hảo Di Động & Máy Tính
   ========================================== */
(() => {
  'use strict';

  // Bộ 12 Pokemon cổ điển nhận diện cực rõ nét
  const POKEMON_LIST = [
    { id: 'pika',   icon: '⚡', name: 'Pikachu',   bg: 'rgba(234, 179, 8, 0.18)',   border: '#eab308' },
    { id: 'fire',   icon: '🔥', name: 'Charmander',bg: 'rgba(239, 68, 68, 0.18)',   border: '#ef4444' },
    { id: 'water',  icon: '💧', name: 'Squirtle',  bg: 'rgba(59, 130, 246, 0.18)',  border: '#3b82f6' },
    { id: 'grass',  icon: '🍃', name: 'Bulbasaur', bg: 'rgba(34, 197, 94, 0.18)',   border: '#22c55e' },
    { id: 'star',   icon: '⭐', name: 'Staryu',    bg: 'rgba(245, 158, 11, 0.18)',  border: '#f59e0b' },
    { id: 'ice',    icon: '❄️', name: 'Articuno',  bg: 'rgba(6, 182, 212, 0.18)',   border: '#06b6d4' },
    { id: 'mush',   icon: '🍄', name: 'Paras',     bg: 'rgba(244, 63, 94, 0.18)',   border: '#f43f5e' },
    { id: 'turtle', icon: '🐢', name: 'Wartortle', bg: 'rgba(16, 185, 129, 0.18)',  border: '#10b981' },
    { id: 'fox',    icon: '🦊', name: 'Vulpix',    bg: 'rgba(249, 115, 22, 0.18)',  border: '#f97316' },
    { id: 'frog',   icon: '🐸', name: 'Poliwag',   bg: 'rgba(132, 204, 22, 0.18)',  border: '#84cc16' },
    { id: 'panda',  icon: '🐼', name: 'Pancham',   bg: 'rgba(148, 163, 184, 0.18)', border: '#94a3b8' },
    { id: 'octo',   icon: '🐙', name: 'Octillery', bg: 'rgba(168, 85, 247, 0.18)',  border: '#a855f7' }
  ];

  class PikachuGame {
    constructor(container, options = {}) {
      this.container = container;
      this.mode = options.mode || 'classic'; // 'classic' hoặc 'blitz'

      // Mobile (<=650px): 6 hàng x 8 cột (48 ô vừa vặn màn hình điện thoại)
      // Desktop (>650px): 7 hàng x 10 cột (70 ô rộng rãi thoải mái)
      const isMobile = window.innerWidth <= 650;
      this.rows = isMobile ? 6 : 7;
      this.cols = isMobile ? 8 : 10;

      this.board = [];
      this.selected = null;
      this.score = 0;
      this.timeLeft = this.mode === 'blitz' ? 90 : 210;
      this.maxTime = this.timeLeft;
      this.timerInterval = null;
      this.isLocked = false;
      this.combo = 0;
      this.comboTimer = null;
      this.shufflesLeft = 5;
      this.hintsLeft = 5;

      this.init();
    }

    init() {
      this.renderLayout();
      this.generateBoard();
      this.startTimer();
      this.bindEvents();
    }

    renderLayout() {
      this.container.innerHTML = `
        <div class="pikachu-wrapper">
          <div class="pika-header">
            <div class="pika-stat-box">
              <span class="pika-stat-label">Thời gian:</span>
              <div class="pika-time-bar-bg">
                <div class="pika-time-bar" id="pika-time-progress"></div>
              </div>
              <span class="pika-stat-val" id="pika-time-text">${this.formatTime(this.timeLeft)}</span>
            </div>
            <div class="pika-stat-box">
              <span class="pika-stat-label">Điểm:</span>
              <span class="pika-stat-val score" id="pika-score-text">0</span>
              <span id="pika-combo-badge" class="pika-combo-badge" style="display:none;"></span>
            </div>
            <div class="pika-actions">
              <button class="btn-secondary btn-sm pika-tool-btn" id="pika-shuffle-btn" title="Đổi vị trí các con thú">🔀 Đổi bài (<span id="pika-shuffle-count">${this.shufflesLeft}</span>)</button>
              <button class="btn-secondary btn-sm pika-tool-btn" id="pika-hint-btn" title="Tìm cặp có thể ăn">💡 Gợi ý (<span id="pika-hint-count">${this.hintsLeft}</span>)</button>
            </div>
          </div>
          <div class="pika-board-container" id="pika-board-container">
            <canvas id="pika-line-canvas" class="pika-line-canvas"></canvas>
            <div class="pika-grid" id="pika-grid" style="grid-template-columns: repeat(${this.cols}, 1fr);"></div>
          </div>
        </div>
      `;

      this.gridEl = this.container.querySelector('#pika-grid');
      this.canvas = this.container.querySelector('#pika-line-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.boardContainer = this.container.querySelector('#pika-board-container');

      this.resizeCanvas();
    }

    resizeCanvas() {
      if (!this.canvas || !this.boardContainer) return;
      const rect = this.boardContainer.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
      }
    }

    formatTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    generateBoard() {
      const total = this.rows * this.cols;
      if (total % 2 !== 0) throw new Error('Số ô Pikachu phải là số chẵn!');

      const pairs = total / 2;
      const types = POKEMON_LIST.slice(0, Math.min(10, POKEMON_LIST.length));
      let pool = [];

      for (let i = 0; i < pairs; i++) {
        const item = types[i % types.length];
        pool.push(item, item);
      }

      // Xáo trộn
      pool.sort(() => Math.random() - 0.5);

      // Ma trận có viền ngoài padding 0 (r: 0..rows+1, c: 0..cols+1)
      this.paddedRows = this.rows + 2;
      this.paddedCols = this.cols + 2;
      this.board = Array(this.paddedRows).fill(null).map(() => Array(this.paddedCols).fill(null));

      let idx = 0;
      for (let r = 1; r <= this.rows; r++) {
        for (let c = 1; c <= this.cols; c++) {
          this.board[r][c] = pool[idx++];
        }
      }

      this.renderGrid();

      // Đảm bảo luôn có ít nhất 1 cặp ăn được ban đầu
      if (!this.findAnyMatch()) {
        this.shuffleBoard(false);
      }
    }

    renderGrid() {
      this.gridEl.innerHTML = '';
      this.gridEl.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;

      for (let r = 1; r <= this.rows; r++) {
        for (let c = 1; c <= this.cols; c++) {
          const val = this.board[r][c];
          const cell = document.createElement('div');
          cell.className = 'pika-cell' + (val ? '' : ' empty');
          cell.dataset.r = r;
          cell.dataset.c = c;
          if (val) {
            cell.innerHTML = `<span>${val.icon}</span>`;
            cell.style.background = val.bg;
            cell.style.borderColor = val.border;
          }
          this.gridEl.appendChild(cell);
        }
      }
      setTimeout(() => this.resizeCanvas(), 80);
    }

    bindEvents() {
      this.gridEl.addEventListener('click', (e) => {
        const cell = e.target.closest('.pika-cell');
        if (!cell || cell.classList.contains('empty') || this.isLocked) return;

        const r = parseInt(cell.dataset.r, 10);
        const c = parseInt(cell.dataset.c, 10);
        this.onCellClick(r, c, cell);
      });

      this.container.querySelector('#pika-shuffle-btn').addEventListener('click', () => {
        if (this.shufflesLeft > 0 && !this.isLocked) {
          this.shufflesLeft--;
          this.container.querySelector('#pika-shuffle-count').textContent = this.shufflesLeft;
          this.shuffleBoard(true);
        } else if (this.shufflesLeft <= 0) {
          if (window.UIManager) UIManager.toast('Bạn đã dùng hết lượt Đổi bài!', 'info');
        }
      });

      this.container.querySelector('#pika-hint-btn').addEventListener('click', () => {
        if (this.hintsLeft > 0 && !this.isLocked) {
          const match = this.findAnyMatch();
          if (match) {
            this.hintsLeft--;
            this.container.querySelector('#pika-hint-count').textContent = this.hintsLeft;
            this.highlightHint(match.p1, match.p2);
          } else {
            if (window.UIManager) UIManager.toast('Không còn nước đi! Đang tự động đổi bài...', 'info');
            this.shuffleBoard(true);
          }
        } else if (this.hintsLeft <= 0) {
          if (window.UIManager) UIManager.toast('Bạn đã dùng hết lượt Gợi ý!', 'info');
        }
      });

      window.addEventListener('resize', () => this.resizeCanvas());
    }

    onCellClick(r, c, cellEl) {
      if (!this.selected) {
        this.selected = { r, c, el: cellEl };
        cellEl.classList.add('selected');
        if (window.SoundManager) SoundManager.play('button');
        return;
      }

      // Nhấn lại chính ô đó -> Hủy chọn
      if (this.selected.r === r && this.selected.c === c) {
        cellEl.classList.remove('selected');
        this.selected = null;
        if (window.SoundManager) SoundManager.play('button');
        return;
      }

      const p1 = { r: this.selected.r, c: this.selected.c };
      const p2 = { r, c };

      // Cùng loại Pokemon
      if (this.board[p1.r][p1.c].id === this.board[p2.r][p2.c].id) {
        const path = this.findPath(p1, p2);
        if (path) {
          this.matchSuccess(p1, p2, path, this.selected.el, cellEl);
          this.selected = null;
          return;
        }
      }

      // Khác loại hoặc không nối được -> chuyển chọn sang ô mới
      this.selected.el.classList.remove('selected');
      this.selected = { r, c, el: cellEl };
      cellEl.classList.add('selected');
      if (window.SoundManager) SoundManager.play('button');
    }

    matchSuccess(p1, p2, path, el1, el2) {
      this.isLocked = true;
      el1.classList.remove('selected');
      el1.classList.add('matched');
      el2.classList.add('matched');

      this.drawConnectingPath(path);
      if (window.SoundManager) SoundManager.play('match');

      // Tính combo & điểm
      this.combo++;
      const gainedScore = 100 + (this.combo * 25);
      this.score += gainedScore;
      
      const scoreEl = this.container.querySelector('#pika-score-text');
      if (scoreEl) scoreEl.textContent = this.score;
      const modalScoreEl = document.getElementById('game-score');
      if (modalScoreEl) modalScoreEl.textContent = this.score;

      const comboBadge = this.container.querySelector('#pika-combo-badge');
      if (comboBadge && this.combo > 1) {
        comboBadge.textContent = `Combo x${this.combo}! 🔥`;
        comboBadge.style.display = 'inline-block';
      }

      clearTimeout(this.comboTimer);
      this.comboTimer = setTimeout(() => {
        this.combo = 0;
        if (comboBadge) comboBadge.style.display = 'none';
      }, 3500);

      setTimeout(() => {
        this.clearCanvas();
        this.board[p1.r][p1.c] = null;
        this.board[p2.r][p2.c] = null;

        el1.className = 'pika-cell empty';
        el1.innerHTML = '';
        el1.style.background = 'transparent';
        el1.style.borderColor = 'transparent';

        el2.className = 'pika-cell empty';
        el2.innerHTML = '';
        el2.style.background = 'transparent';
        el2.style.borderColor = 'transparent';

        this.isLocked = false;

        // Kiểm tra xem đã ăn hết bàn chưa
        if (this.isBoardEmpty()) {
          this.gameWin();
          return;
        }

        // Kiểm tra nếu hết nước đi hợp lệ -> Tự động đổi bài an toàn
        if (!this.findAnyMatch()) {
          if (window.UIManager) UIManager.toast('🔄 Hết nước đi! Tự động đổi vị trí...', 'info');
          this.shuffleBoard(false);
        }
      }, 260);
    }

    isBoardEmpty() {
      for (let r = 1; r <= this.rows; r++) {
        for (let c = 1; c <= this.cols; c++) {
          if (this.board[r][c] !== null) return false;
        }
      }
      return true;
    }

    /* ── THUẬT TOÁN TÌM ĐƯỜNG NỐI CHUẨN I, L, Z (TỐI ĐA 2 KHÚC GẬP) ── */
    findPath(p1, p2) {
      // 1. Đường thẳng (I) - 0 khúc gập
      let path = this.checkLine(p1, p2);
      if (path) return path;

      // 2. Một góc vuông (L) - 1 khúc gập
      path = this.checkOneCorner(p1, p2);
      if (path) return path;

      // 3. Hai góc vuông (Z hoặc U) - 2 khúc gập
      path = this.checkTwoCorners(p1, p2);
      if (path) return path;

      return null;
    }

    checkLine(p1, p2) {
      if (p1.r !== p2.r && p1.c !== p2.c) return null;

      if (p1.r === p2.r) {
        const minC = Math.min(p1.c, p2.c);
        const maxC = Math.max(p1.c, p2.c);
        for (let c = minC + 1; c < maxC; c++) {
          if (this.board[p1.r][c] !== null) return null;
        }
        return [p1, p2];
      } else {
        const minR = Math.min(p1.r, p2.r);
        const maxR = Math.max(p1.r, p2.r);
        for (let r = minR + 1; r < maxR; r++) {
          if (this.board[r][p1.c] !== null) return null;
        }
        return [p1, p2];
      }
    }

    checkOneCorner(p1, p2) {
      // Góc C1: (p1.r, p2.c)
      const c1 = { r: p1.r, c: p2.c };
      if (this.board[c1.r][c1.c] === null) {
        if (this.checkLine(p1, c1) && this.checkLine(c1, p2)) {
          return [p1, c1, p2];
        }
      }

      // Góc C2: (p2.r, p1.c)
      const c2 = { r: p2.r, c: p1.c };
      if (this.board[c2.r][c2.c] === null) {
        if (this.checkLine(p1, c2) && this.checkLine(c2, p2)) {
          return [p1, c2, p2];
        }
      }

      return null;
    }

    checkTwoCorners(p1, p2) {
      // Quét tất cả hàng r (từ 0 đến rows+1)
      for (let r = 0; r < this.paddedRows; r++) {
        const c1 = { r, c: p1.c };
        const c2 = { r, c: p2.c };

        const isC1Free = (r === p1.r) || (this.board[r][p1.c] === null);
        const isC2Free = (r === p2.r) || (this.board[r][p2.c] === null);

        if (isC1Free && isC2Free) {
          if (this.checkLine(p1, c1) && this.checkLine(c1, c2) && this.checkLine(c2, p2)) {
            return [p1, c1, c2, p2];
          }
        }
      }

      // Quét tất cả cột c (từ 0 đến cols+1)
      for (let c = 0; c < this.paddedCols; c++) {
        const c1 = { r: p1.r, c };
        const c2 = { r: p2.r, c };

        const isC1Free = (c === p1.c) || (this.board[p1.r][c] === null);
        const isC2Free = (c === p2.c) || (this.board[p2.r][c] === null);

        if (isC1Free && isC2Free) {
          if (this.checkLine(p1, c1) && this.checkLine(c1, c2) && this.checkLine(c2, p2)) {
            return [p1, c1, c2, p2];
          }
        }
      }

      return null;
    }

    findAnyMatch() {
      const active = [];
      for (let r = 1; r <= this.rows; r++) {
        for (let c = 1; c <= this.cols; c++) {
          if (this.board[r][c] !== null) {
            active.push({ r, c, val: this.board[r][c] });
          }
        }
      }

      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          if (active[i].val.id === active[j].val.id) {
            if (this.findPath(active[i], active[j])) {
              return { p1: active[i], p2: active[j] };
            }
          }
        }
      }
      return null;
    }

    shuffleBoard(animate = true) {
      const remaining = [];
      for (let r = 1; r <= this.rows; r++) {
        for (let c = 1; c <= this.cols; c++) {
          if (this.board[r][c] !== null) remaining.push(this.board[r][c]);
        }
      }

      if (remaining.length === 0) return;

      let attempts = 0;
      do {
        remaining.sort(() => Math.random() - 0.5);
        let idx = 0;
        for (let r = 1; r <= this.rows; r++) {
          for (let c = 1; c <= this.cols; c++) {
            if (this.board[r][c] !== null) {
              this.board[r][c] = remaining[idx++];
            }
          }
        }
        attempts++;
        if (attempts > 35) break; // An toàn tuyệt đối chống treo trình duyệt
      } while (!this.findAnyMatch() && remaining.length > 2);

      this.renderGrid();
      if (animate && window.SoundManager) SoundManager.play('move');
    }

    highlightHint(p1, p2) {
      const el1 = this.gridEl.querySelector(`[data-r="${p1.r}"][data-c="${p1.c}"]`);
      const el2 = this.gridEl.querySelector(`[data-r="${p2.r}"][data-c="${p2.c}"]`);
      if (el1 && el2) {
        el1.classList.add('hint');
        el2.classList.add('hint');
        setTimeout(() => {
          el1.classList.remove('hint');
          el2.classList.remove('hint');
        }, 1500);
      }
    }

    /* ── VẼ TIA SÉT NỐI ĐƯỜNG VUÔNG VẮN 100% ── */
    drawConnectingPath(points) {
      if (!this.ctx || !points || points.length < 2) return;
      this.resizeCanvas();
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const boardRect = this.boardContainer.getBoundingClientRect();

      // Loại bỏ điểm trùng lặp liên tiếp
      const cleanPoints = points.filter((pt, idx) => {
        if (idx === 0) return true;
        return pt.r !== points[idx - 1].r || pt.c !== points[idx - 1].c;
      });

      const getPixelCoord = (p) => {
        let x = 0;
        let y = 0;

        // Tọa độ X: Lấy đúng tâm cột đó
        if (p.c >= 1 && p.c <= this.cols) {
          const sample = this.gridEl.querySelector(`[data-c="${p.c}"]`);
          if (sample) {
            const r = sample.getBoundingClientRect();
            x = r.left - boardRect.left + r.width / 2;
          }
        } else if (p.c === 0) {
          x = 6;
        } else if (p.c === this.cols + 1) {
          x = boardRect.width - 6;
        }

        // Tọa độ Y: Lấy đúng tâm hàng đó
        if (p.r >= 1 && p.r <= this.rows) {
          const sample = this.gridEl.querySelector(`[data-r="${p.r}"]`);
          if (sample) {
            const r = sample.getBoundingClientRect();
            y = r.top - boardRect.top + r.height / 2;
          }
        } else if (p.r === 0) {
          y = 6;
        } else if (p.r === this.rows + 1) {
          y = boardRect.height - 6;
        }

        return { x, y };
      };

      const coords = cleanPoints.map(getPixelCoord);

      // Lớp 1: Hào quang vàng cam Neon ngoài
      this.ctx.beginPath();
      this.ctx.moveTo(coords[0].x, coords[0].y);
      for (let i = 1; i < coords.length; i++) {
        this.ctx.lineTo(coords[i].x, coords[i].y);
      }
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 6;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.shadowColor = '#fbbf24';
      this.ctx.shadowBlur = 14;
      this.ctx.stroke();

      // Lớp 2: Lõi trắng phát sáng bên trong
      this.ctx.beginPath();
      this.ctx.moveTo(coords[0].x, coords[0].y);
      for (let i = 1; i < coords.length; i++) {
        this.ctx.lineTo(coords[i].x, coords[i].y);
      }
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2.5;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.stroke();
    }

    clearCanvas() {
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    startTimer() {
      const timeBar = this.container.querySelector('#pika-time-progress');
      const timeText = this.container.querySelector('#pika-time-text');

      this.timerInterval = setInterval(() => {
        this.timeLeft--;
        const pct = Math.max(0, (this.timeLeft / this.maxTime) * 100);
        if (timeBar) timeBar.style.width = `${pct}%`;
        if (timeText) timeText.textContent = this.formatTime(this.timeLeft);

        if (this.timeLeft <= 0) {
          clearInterval(this.timerInterval);
          this.gameOver();
        }
      }, 1000);
    }

    gameOver() {
      clearInterval(this.timerInterval);
      this.isLocked = true;
      if (window.UIManager) {
        UIManager.showLoss({
          gameId: 'pikachu',
          title: 'Hết Giờ!',
          score: this.score,
          message: `Điểm số đạt được: ${this.score}`,
          emoji: '⏰'
        });
      }
    }

    gameWin() {
      clearInterval(this.timerInterval);
      if (window.UIManager) {
        UIManager.showWin({
          gameId: 'pikachu',
          title: 'Chiến Thắng Pikachu!',
          emoji: '⚡',
          score: this.score,
          message: `Xuất sắc! Điểm: ${this.score}`
        });
      }
    }

    destroy() {
      clearInterval(this.timerInterval);
      clearTimeout(this.comboTimer);
    }
  }

  // Đăng ký vào hệ thống GameRegistry
  let currentInstance = null;

  if (window.GameRegistry) {
    GameRegistry.register({
      id: 'pikachu',
      name: 'Pikachu Cổ Điển',
      icon: '⚡',
      category: 'puzzle',
      modes: [
        { id: 'classic', label: 'Cổ điển', desc: 'Tìm cặp Pokemon nối tối đa 2 khúc gập' },
        { id: 'blitz', label: 'Tốc độ (90s)', desc: 'Chạy đua với thời gian săn combo điểm' }
      ],
      startMode: (modeId) => {
        const body = document.getElementById('modal-body');
        if (!body) return;
        if (currentInstance) currentInstance.destroy();
        currentInstance = new PikachuGame(body, { mode: modeId });
      },
      cleanup: () => {
        if (currentInstance) {
          currentInstance.destroy();
          currentInstance = null;
        }
      },
      restartCurrent: () => {
        const body = document.getElementById('modal-body');
        if (!body) return;
        if (currentInstance) {
          const mode = currentInstance.mode;
          currentInstance.destroy();
          currentInstance = new PikachuGame(body, { mode });
        }
      }
    });
  }
})();
