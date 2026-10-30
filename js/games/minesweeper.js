/* ==========================================
   MINESWEEPER (DÒ MÌN)
   ========================================== */
(function() {
  'use strict';

  let ROWS = 9;
  let COLS = 9;
  let MINES = 10;
  let board = [];
  let revealedCount = 0;
  let flagsCount = 0;
  let gameOver = false;
  let firstClick = true;
  let timerInterval = null;
  let seconds = 0;
  let currentMode = 'easy'; // 'easy' | 'medium' | 'hard' | 'blitz'
  let blitzTimeLimit = 60;

  const MODES_CONFIG = {
    easy:   { rows: 9,  cols: 9,  mines: 10, label: '😊 Dễ (9x9, 10 mìn)' },
    medium: { rows: 12, cols: 12, mines: 25, label: '😤 Trung bình (12x12, 25 mìn)' },
    hard:   { rows: 15, cols: 15, mines: 45, label: '💀 Khó (15x15, 45 mìn)' },
    blitz:  { rows: 10, cols: 10, mines: 15, label: '⚡ Thần Tốc (60s phá mìn)' }
  };

  const NUMBER_COLORS = [
    '', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#eab308'
  ];

  function createBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          mine: false,
          revealed: false,
          flagged: false,
          neighborMines: 0
        });
      }
      board.push(row);
    }
  }

  function placeMines(firstR, firstC) {
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      // Safe zone around first click
      if (Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1) continue;
      if (!board[r][c].mine) {
        board[r][c].mine = true;
        placed++;
      }
    }

    // Calculate numbers
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].mine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) {
              count++;
            }
          }
        }
        board[r][c].neighborMines = count;
      }
    }
  }

  function startGame(modeId) {
    cleanup();
    currentMode = modeId || 'easy';
    const cfg = MODES_CONFIG[currentMode] || MODES_CONFIG.easy;
    ROWS = cfg.rows;
    COLS = cfg.cols;
    MINES = cfg.mines;

    gameOver = false;
    firstClick = true;
    revealedCount = 0;
    flagsCount = 0;
    seconds = currentMode === 'blitz' ? blitzTimeLimit : 0;

    createBoard();
    buildUI();
    updateStatus();
    startTimer();
  }

  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (gameOver) return;
      if (currentMode === 'blitz') {
        seconds--;
        if (seconds <= 0) {
          seconds = 0;
          updateStatus();
          handleGameOver(false, 'Hết thời gian Blitz!');
          return;
        }
      } else {
        seconds++;
      }
      updateStatus();
    }, 1000);
  }

  function updateStatus() {
    const remainingMines = MINES - flagsCount;
    const timeText = currentMode === 'blitz' ? `⏳ ${seconds}s` : `⏱️ ${seconds}s`;
    GameModal.setStatus(`🚩 Còn: ${remainingMines} | ${timeText}`);
    GameModal.setScore(revealedCount);
  }

  function buildUI() {
    const container = document.getElementById('modal-body');
    if (!container) return;
    container.innerHTML = `
      <div class="minesweeper-wrapper" style="display:flex; flex-direction:column; align-items:center; user-select:none; max-width:100%;">
        <div class="minesweeper-controls" style="display:flex; gap:12px; margin-bottom:12px; font-weight:700; font-size:0.9rem;">
          <button id="ms-flag-toggle" class="mode-btn" style="background:var(--card-bg); border-color:var(--border);">
            🖱️ Chế độ: <strong id="ms-mode-text" style="color:var(--accent);">Mở ô</strong>
          </button>
          <button id="ms-restart-quick" class="mode-btn" style="background:var(--card-bg); border-color:var(--border);">
            🔄 Ván mới
          </button>
        </div>
        <div class="minesweeper-grid" id="ms-grid" style="
          display: grid;
          grid-template-columns: repeat(${COLS}, minmax(0, 1fr));
          gap: 3px;
          background: var(--bg-secondary);
          padding: 8px;
          border-radius: 12px;
          border: 2px solid var(--border);
          box-shadow: var(--shadow-sm);
          max-width: 95vw;
          overflow: auto;
        "></div>
      </div>
    `;

    let mobileFlagMode = false;
    const toggleBtn = document.getElementById('ms-flag-toggle');
    const modeText = document.getElementById('ms-mode-text');
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        mobileFlagMode = !mobileFlagMode;
        modeText.textContent = mobileFlagMode ? '🚩 Cắm Cờ' : '⛏️ Mở Ô';
        toggleBtn.style.borderColor = mobileFlagMode ? 'var(--accent-orange)' : 'var(--border)';
        SoundManager.play('button');
      };
    }

    const quickRestart = document.getElementById('ms-restart-quick');
    if (quickRestart) {
      quickRestart.onclick = () => startGame(currentMode);
    }

    renderGrid(mobileFlagMode);
  }

  function renderGrid(mobileFlagMode) {
    const grid = document.getElementById('ms-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const cellSize = Math.min(38, Math.floor(Math.min(window.innerWidth * 0.88, 480) / COLS));

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cellData = board[r][c];
        const cell = document.createElement('div');
        cell.className = 'ms-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.style.cssText = `
          width: ${cellSize}px;
          height: ${cellSize}px;
          min-width: ${cellSize}px;
          min-height: ${cellSize}px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: ${Math.floor(cellSize * 0.45)}px;
          cursor: pointer;
          transition: all 0.12s ease;
          background: ${cellData.revealed ? 'var(--card-bg)' : 'var(--bg-primary)'};
          border: 1px solid var(--border);
          box-shadow: ${cellData.revealed ? 'none' : 'inset 0 1px 2px rgba(255,255,255,0.1)'};
        `;

        if (cellData.revealed) {
          if (cellData.mine) {
            cell.textContent = '💣';
            cell.style.background = '#ef444433';
            cell.style.borderColor = '#ef4444';
          } else if (cellData.neighborMines > 0) {
            cell.textContent = cellData.neighborMines;
            cell.style.color = NUMBER_COLORS[cellData.neighborMines] || 'var(--text-primary)';
          }
        } else if (cellData.flagged) {
          cell.textContent = '🚩';
        }

        // Left Click
        cell.addEventListener('click', (e) => {
          e.preventDefault();
          const flagToggle = document.getElementById('ms-mode-text');
          const isFlagActive = flagToggle && flagToggle.textContent.includes('Cờ');
          if (isFlagActive) {
            toggleFlag(r, c);
          } else {
            reveal(r, c);
          }
        });

        // Right Click for Flag
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          toggleFlag(r, c);
        });

        grid.appendChild(cell);
      }
    }
  }

  function toggleFlag(r, c) {
    if (gameOver || board[r][c].revealed) return;
    board[r][c].flagged = !board[r][c].flagged;
    flagsCount += board[r][c].flagged ? 1 : -1;
    SoundManager.play('click');
    updateStatus();
    buildUI();
  }

  function reveal(r, c) {
    if (gameOver || board[r][c].flagged || board[r][c].revealed) return;

    if (firstClick) {
      firstClick = false;
      placeMines(r, c);
    }

    if (board[r][c].mine) {
      handleGameOver(false, 'Bạn đã đạp trúng mìn! 💥');
      return;
    }

    // Flood-fill for empty cells
    const queue = [[r, c]];
    board[r][c].revealed = true;
    revealedCount++;

    while (queue.length > 0) {
      const [currR, currC] = queue.shift();
      if (board[currR][currC].neighborMines === 0) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = currR + dr, nc = currC + dc;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
              const neighbor = board[nr][nc];
              if (!neighbor.revealed && !neighbor.mine && !neighbor.flagged) {
                neighbor.revealed = true;
                revealedCount++;
                if (neighbor.neighborMines === 0) {
                  queue.push([nr, nc]);
                }
              }
            }
          }
        }
      }
    }

    SoundManager.play('move');
    updateStatus();
    buildUI();

    // Check Win
    const totalSafeCells = ROWS * COLS - MINES;
    if (revealedCount >= totalSafeCells) {
      handleGameOver(true, `Hoàn thành xuất sắc trong ${seconds} giây! 🏆`);
    }
  }

  function handleGameOver(won, msg) {
    gameOver = true;
    clearInterval(timerInterval);

    // Reveal all mines
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].mine) {
          board[r][c].revealed = true;
        }
      }
    }
    buildUI();

    if (won) {
      SoundManager.play('win');
      StreakManager.recordScore('minesweeper', (ROWS * COLS) - seconds);
      UIManager.showWin({
        title: 'Thắng Trận Dò Mìn!',
        emoji: '🎉',
        gameId: 'minesweeper',
        message: msg,
        onPlayAgain: () => startGame(currentMode)
      });
    } else {
      SoundManager.play('lose');
      UIManager.showLoss({
        title: 'Nổ Mìn!',
        emoji: '💥',
        gameId: 'minesweeper',
        message: msg,
        onPlayAgain: () => startGame(currentMode)
      });
    }
  }

  function cleanup() {
    clearInterval(timerInterval);
    gameOver = true;
  }

  GameRegistry.register({
    id: 'minesweeper',
    icon: '💣',
    name: 'Dò Mìn (Minesweeper)',
    modes: [
      { id: 'easy',   label: '😊 Dễ (9x9)' },
      { id: 'medium', label: '😤 Vừa (12x12)' },
      { id: 'hard',   label: '💀 Khó (15x15)' },
      { id: 'blitz',  label: '⚡ Thần Tốc (60s)' }
    ],
    startMode(modeId) {
      startGame(modeId);
    },
    cleanup() {
      cleanup();
    }
  });

})();
