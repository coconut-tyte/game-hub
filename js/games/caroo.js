/**
 * caroo.js — Caro (Gomoku) Game for Game Hub
 * 20x20 board, 5-in-a-row to win
 * Modes: PvP, Easy AI (random), Hard AI (minimax + alpha-beta, depth 3)
 */
(function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────────────────────
  const ROWS = 20;
  const COLS = 20;
  const WIN_LEN = 5;
  const CELL_SIZE = 32; // px

  const DIRS = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal ↘
    [1, -1],  // diagonal ↙
  ];

  // ─── State ───────────────────────────────────────────────────────────────────
  let board = [];
  let currentPlayer = 'X';
  let gameOver = false;
  let mode = 'pvp'; // 'pvp' | 'easy' | 'hard'
  let sessionWins = 0;
  let aiThinkTimeout = null;

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function makeBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  /** Returns array of winning cell coords if player has won, else null */
  function checkWin(b, player) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (b[r][c] !== player) continue;
        for (const [dr, dc] of DIRS) {
          const cells = [[r, c]];
          for (let k = 1; k < WIN_LEN; k++) {
            const nr = r + dr * k;
            const nc = c + dc * k;
            if (!inBounds(nr, nc) || b[nr][nc] !== player) break;
            cells.push([nr, nc]);
          }
          if (cells.length === WIN_LEN) return cells;
        }
      }
    }
    return null;
  }

  function isBoardFull(b) {
    return b.every(row => row.every(cell => cell !== null));
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────
  function render() {
    const container = document.getElementById('modal-body');
    if (!container) return;

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display:flex; flex-direction:column; align-items:center;
      gap:12px; padding:8px;
    `;

    // Info row
    const info = document.createElement('div');
    info.style.cssText = 'display:flex;gap:20px;align-items:center;font-size:14px;';

    const turnBadge = document.createElement('div');
    turnBadge.id = 'caro-turn';
    turnBadge.style.cssText = `
      padding:6px 14px; border-radius:20px; font-weight:600; font-size:15px;
      background:${currentPlayer === 'X' ? '#3b82f6' : '#ef4444'};
      color:#fff; transition:background .3s;
    `;
    turnBadge.textContent = gameOver ? '—' : `Lượt: ${currentPlayer === 'X' ? '✖ X' : '⭕ O'}`;
    info.appendChild(turnBadge);

    if (mode !== 'pvp') {
      const modeTag = document.createElement('span');
      modeTag.style.cssText = 'opacity:.7;';
      modeTag.textContent = mode === 'easy' ? '🤖 Dễ' : '🧠 Khó';
      info.appendChild(modeTag);
    }

    wrapper.appendChild(info);

    // Scrollable board area
    const scrollArea = document.createElement('div');
    scrollArea.style.cssText = `
      max-width:100%; max-height:520px;
      overflow:auto; border:2px solid #374151;
      border-radius:8px; background:#1a1a2e;
    `;

    const grid = document.createElement('div');
    grid.className = 'caro-board';
    grid.style.cssText = `
      display:grid;
      grid-template-columns:repeat(${COLS}, ${CELL_SIZE}px);
      grid-template-rows:repeat(${ROWS}, ${CELL_SIZE}px);
      gap:1px; background:#374151;
      width:${COLS * (CELL_SIZE + 1)}px;
    `;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'caro-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        const mark = board[r][c];

        cell.style.cssText = `
          width:${CELL_SIZE}px; height:${CELL_SIZE}px;
          display:flex; align-items:center; justify-content:center;
          font-size:${CELL_SIZE * 0.55}px; font-weight:700;
          cursor:${!mark && !gameOver ? 'pointer' : 'default'};
          background:#1e1e3a; transition:background .1s;
          user-select:none;
          color:${mark === 'X' ? '#60a5fa' : '#f87171'};
        `;

        if (mark) {
          cell.textContent = mark === 'X' ? '✖' : '⭕';
          cell.classList.add(mark, 'taken');
        } else if (!gameOver) {
          cell.addEventListener('mouseenter', () => {
            cell.style.background = '#2d2d5e';
          });
          cell.addEventListener('mouseleave', () => {
            cell.style.background = '#1e1e3a';
          });
          cell.addEventListener('click', () => handleCellClick(r, c));
        }

        grid.appendChild(cell);
      }
    }

    scrollArea.appendChild(grid);
    wrapper.appendChild(scrollArea);

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🔄 Ván mới';
    resetBtn.style.cssText = `
      padding:8px 20px; border-radius:20px; border:none;
      background:#6366f1; color:#fff; font-size:14px;
      cursor:pointer; font-weight:600; transition:opacity .2s;
    `;
    resetBtn.addEventListener('mouseenter', () => resetBtn.style.opacity = '0.8');
    resetBtn.addEventListener('mouseleave', () => resetBtn.style.opacity = '1');
    resetBtn.addEventListener('click', () => startGame(mode));
    wrapper.appendChild(resetBtn);

    container.appendChild(wrapper);
  }

  function highlightWin(winCells) {
    winCells.forEach(([r, c]) => {
      const cell = document.querySelector(`.caro-cell[data-r="${r}"][data-c="${c}"]`);
      if (cell) {
        cell.classList.add('win-cell');
        cell.style.background = '#14532d';
        cell.style.color = '#4ade80';
        cell.style.transform = 'scale(1.1)';
        cell.style.zIndex = '2';
        cell.style.position = 'relative';
        cell.style.borderRadius = '4px';
        cell.style.boxShadow = '0 0 8px #4ade80';
      }
    });
  }

  // ─── Game logic ──────────────────────────────────────────────────────────────
  function handleCellClick(r, c) {
    if (gameOver || board[r][c]) return;
    if (mode !== 'pvp' && currentPlayer === 'O') return; // AI's turn

    placeMove(r, c);

    if (!gameOver && mode !== 'pvp') {
      // Schedule AI move
      GameModal.setStatus('🤖 AI đang suy nghĩ…');
      const delay = mode === 'hard' ? 300 : 150;
      aiThinkTimeout = setTimeout(aiMove, delay);
    }
  }

  function placeMove(r, c) {
    if (board[r][c] || gameOver) return;

    board[r][c] = currentPlayer;
    if (typeof SoundManager !== 'undefined') SoundManager.play('move');

    render();

    const winCells = checkWin(board, currentPlayer);
    if (winCells) {
      highlightWin(winCells);
      handleWin(currentPlayer);
      return;
    }

    if (isBoardFull(board)) {
      gameOver = true;
      GameModal.setStatus('🤝 Hòa! Bàn đã đầy.');
      if (typeof UIManager !== 'undefined') {
        UIManager.toast('Hòa nhau!', 'info');
      }
      return;
    }

    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    GameModal.setStatus(`Lượt: ${currentPlayer === 'X' ? '✖ X' : '⭕ O'}`);
  }

  function handleWin(player) {
    gameOver = true;
    if (typeof SoundManager !== 'undefined') SoundManager.play('win');

    const isHuman = (mode === 'pvp') || (player === 'X');
    const isAI = (mode !== 'pvp') && (player === 'O');

    if (mode === 'pvp') {
      sessionWins++;
      GameModal.setScore(sessionWins);
      GameModal.setStatus(`🎉 ${player} thắng!`);
      if (typeof UIManager !== 'undefined') {
        UIManager.showWin({
          title: `${player === 'X' ? '✖ X' : '⭕ O'} Chiến Thắng!`,
          emoji: '🏆',
          gameId: 'caroo',
          onPlayAgain: () => startGame(mode),
        });
      }
    } else if (isHuman) {
      sessionWins++;
      GameModal.setScore(sessionWins);
      GameModal.setStatus('🎉 Bạn thắng!');
      if (typeof UIManager !== 'undefined') {
        UIManager.showWin({
          title: 'Bạn Chiến Thắng!',
          emoji: '🏆',
          gameId: 'caroo',
          onPlayAgain: () => startGame(mode),
        });
      }
    } else {
      // AI wins
      GameModal.setStatus('😞 Máy thắng!');
      if (typeof UIManager !== 'undefined') {
        UIManager.showLoss({
          title: 'Máy Thắng Rồi!',
          emoji: '🤖',
          onPlayAgain: () => startGame(mode),
        });
      }
    }
  }

  // ─── AI ──────────────────────────────────────────────────────────────────────
  function aiMove() {
    if (gameOver) return;
    let move;
    if (mode === 'easy') {
      move = randomMove();
    } else {
      move = hardMove();
    }
    if (move) placeMove(move[0], move[1]);
  }

  function randomMove() {
    const empty = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (!board[r][c]) empty.push([r, c]);
    if (!empty.length) return null;
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // ── Hard AI: threat-based heuristic + minimax (depth 3) ──────────────────────
  function hardMove() {
    // Immediate win or block
    const win = findThreat(board, 'O', 5);
    if (win) return win;
    const block = findThreat(board, 'X', 5);
    if (block) return block;

    // Minimax
    const candidates = getCandidates(board);
    if (!candidates.length) {
      // First move: center
      return [Math.floor(ROWS / 2), Math.floor(COLS / 2)];
    }

    let best = null;
    let bestScore = -Infinity;

    for (const [r, c] of candidates) {
      board[r][c] = 'O';
      const score = minimax(board, 2, -Infinity, Infinity, false);
      board[r][c] = null;
      if (score > bestScore) {
        bestScore = score;
        best = [r, c];
      }
    }
    return best;
  }

  /** Find any empty cell that gives `player` `count` in a row */
  function findThreat(b, player, count) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (b[r][c]) continue;
        b[r][c] = player;
        const w = checkWin(b, player);
        b[r][c] = null;
        if (w) return [r, c];
      }
    }
    return null;
  }

  /** Candidate moves: empty cells adjacent to any placed stone */
  function getCandidates(b) {
    const seen = new Set();
    const cands = [];
    const radius = 2;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!b[r][c]) continue;
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr, nc = c + dc;
            if (!inBounds(nr, nc) || b[nr][nc]) continue;
            const key = nr * COLS + nc;
            if (!seen.has(key)) {
              seen.add(key);
              cands.push([nr, nc]);
            }
          }
        }
      }
    }
    return cands;
  }

  function minimax(b, depth, alpha, beta, isMax) {
    const oWin = checkWin(b, 'O');
    if (oWin) return 100000 + depth * 10;
    const xWin = checkWin(b, 'X');
    if (xWin) return -(100000 + depth * 10);
    if (depth === 0 || isBoardFull(b)) return evaluate(b);

    const cands = getCandidates(b);
    if (!cands.length) return evaluate(b);

    if (isMax) {
      let best = -Infinity;
      for (const [r, c] of cands) {
        b[r][c] = 'O';
        best = Math.max(best, minimax(b, depth - 1, alpha, beta, false));
        b[r][c] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const [r, c] of cands) {
        b[r][c] = 'X';
        best = Math.min(best, minimax(b, depth - 1, alpha, beta, true));
        b[r][c] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  /** Board heuristic: score all lines for O (positive) and X (negative) */
  function evaluate(b) {
    let score = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (const [dr, dc] of DIRS) {
          score += lineScore(b, r, c, dr, dc, 'O');
          score -= lineScore(b, r, c, dr, dc, 'X');
        }
      }
    }
    return score;
  }

  function lineScore(b, r, c, dr, dc, player) {
    let count = 0;
    let openEnds = 0;
    // Check before
    const pr = r - dr, pc = c - dc;
    if (!inBounds(pr, pc) || b[pr][pc] === null) openEnds++;
    else if (b[pr][pc] !== player) return 0;

    for (let k = 0; k < WIN_LEN; k++) {
      const nr = r + dr * k, nc = c + dc * k;
      if (!inBounds(nr, nc)) break;
      if (b[nr][nc] === player) count++;
      else if (b[nr][nc] === null) { openEnds++; break; }
      else break;
    }
    if (count === 0) return 0;
    const table = [0, 1, 10, 100, 1000, 100000];
    let s = table[Math.min(count, 5)];
    if (openEnds === 0) s = Math.floor(s / 4);
    return s;
  }

  // ─── Public API ──────────────────────────────────────────────────────────────
  function startGame(modeId) {
    cleanup();
    mode = modeId;
    board = makeBoard();
    currentPlayer = 'X';
    gameOver = false;
    sessionWins = 0;
    GameModal.setScore(0);
    GameModal.setStatus('Lượt: ✖ X');
    render();
  }

  function cleanup() {
    if (aiThinkTimeout) {
      clearTimeout(aiThinkTimeout);
      aiThinkTimeout = null;
    }
  }

  // ─── Register ────────────────────────────────────────────────────────────────
  GameRegistry.register({
    id: 'caroo',
    icon: '⬛',
    name: 'Caro',
    modes: [
      { id: 'pvp',  label: '👥 2 Người chơi' },
      { id: 'easy', label: '🤖 vs Máy Dễ' },
      { id: 'hard', label: '🧠 vs Máy Khó' },
    ],
    startMode(modeId) {
      startGame(modeId);
    },
    cleanup() {
      cleanup();
    },
  });

})();
