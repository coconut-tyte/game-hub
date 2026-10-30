/**
 * caroo.js — Caro (Gomoku) Siêu Thông Minh cho Game Hub
 * Modes: PvP, Máy Dễ, Máy Đại Sư (AI Cao Cấp với Pattern Recognition), Chớp Nhoáng (Blitz 10s)
 */
(function () {
  'use strict';

  const ROWS = 20;
  const COLS = 20;
  const WIN_LEN = 5;

  const DIRS = [
    [0, 1],   // Ngang
    [1, 0],   // Dọc
    [1, 1],   // Chéo chính ↘
    [1, -1],  // Chéo phụ ↙
  ];

  let board = [];
  let currentPlayer = 'X';
  let gameOver = false;
  let mode = 'hard'; // 'pvp' | 'easy' | 'hard' | 'blitz'
  let sessionWins = 0;
  let aiThinkTimeout = null;
  let turnTimerInterval = null;
  let turnSeconds = 10;
  let lastMove = null;

  function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function makeBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

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

  function render() {
    const container = document.getElementById('modal-body');
    if (!container) return;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'board-container';
    wrapper.style.cssText = 'display:flex; flex-direction:column; align-items:center; max-width:100%;';

    const scrollBox = document.createElement('div');
    scrollBox.className = 'board-wrapper';
    scrollBox.style.cssText = 'overflow:auto; max-width:100%; max-height:70vh; border-radius:12px; border:2px solid var(--border); box-shadow:var(--shadow-sm);';

    const boardEl = document.createElement('div');
    boardEl.className = 'caro-board';
    boardEl.style.cssText = `
      display: grid;
      grid-template-columns: repeat(${COLS}, 30px);
      grid-template-rows: repeat(${ROWS}, 30px);
      background: var(--card-bg);
      gap: 1px;
      padding: 6px;
    `;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'caro-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        cell.style.cssText = `
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.1rem;
          cursor: pointer;
          border-radius: 4px;
          transition: transform 0.1s ease, background 0.15s ease;
          background: var(--bg-secondary);
        `;

        const val = board[r][c];
        if (val) {
          cell.textContent = val;
          cell.classList.add(val, 'taken');
          cell.style.color = val === 'X' ? '#ef4444' : '#3b82f6';
          if (lastMove && lastMove[0] === r && lastMove[1] === c) {
            cell.style.boxShadow = 'inset 0 0 0 2px var(--accent-orange)';
          }
        }

        cell.addEventListener('click', () => onCellClick(r, c));
        boardEl.appendChild(cell);
      }
    }

    scrollBox.appendChild(boardEl);
    wrapper.appendChild(scrollBox);
    container.appendChild(wrapper);
  }

  function startTurnTimer() {
    clearInterval(turnTimerInterval);
    if (mode !== 'blitz' || gameOver) return;
    turnSeconds = 10;
    updateStatusLabel();
    turnTimerInterval = setInterval(() => {
      turnSeconds--;
      updateStatusLabel();
      if (turnSeconds <= 0) {
        clearInterval(turnTimerInterval);
        handleTimeout();
      }
    }, 1000);
  }

  function updateStatusLabel() {
    const timerText = mode === 'blitz' ? ` | ⏳ ${turnSeconds}s` : '';
    if (gameOver) return;
    GameModal.setStatus(`Lượt: ${currentPlayer === 'X' ? '❌ Bạn (X)' : '⭕ Máy (O)'}${timerText}`);
  }

  function handleTimeout() {
    if (gameOver) return;
    if (currentPlayer === 'X') {
      GameModal.setStatus('Hết giờ! Bạn bị tính thua lượt này.');
      handleWin(checkWin(board, 'O') || [], 'O');
    } else {
      aiMove();
    }
  }

  function onCellClick(r, c) {
    if (gameOver || board[r][c]) return;
    if (mode !== 'pvp' && currentPlayer !== 'X') return;

    placeMove(r, c);

    if (!gameOver && mode !== 'pvp') {
      currentPlayer = 'O';
      updateStatusLabel();
      startTurnTimer();
      aiThinkTimeout = setTimeout(() => {
        aiMove();
      }, 250);
    }
  }

  function placeMove(r, c) {
    board[r][c] = currentPlayer;
    lastMove = [r, c];
    SoundManager.play('move');

    const winCells = checkWin(board, currentPlayer);
    if (winCells) {
      handleWin(winCells, currentPlayer);
      return;
    }

    // Check Draw
    if (isBoardFull(board)) {
      gameOver = true;
      clearInterval(turnTimerInterval);
      GameModal.setStatus('Hòa cờ!');
      UIManager.showLoss({
        title: 'Bàn Cờ Bất Phân Thắng Bại!',
        emoji: '🤝',
        gameId: 'caroo',
        message: 'Không còn ô trống nào.',
        onPlayAgain: () => startGame(mode)
      });
      return;
    }

    if (mode === 'pvp') {
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      updateStatusLabel();
      startTurnTimer();
    }
    render();
  }

  function isBoardFull(b) {
    return b.every(row => row.every(cell => cell !== null));
  }

  function handleWin(winCells, winner) {
    gameOver = true;
    clearInterval(turnTimerInterval);
    render();

    // Highlight win cells
    winCells.forEach(([r, c]) => {
      const cell = document.querySelector(`.caro-cell[data-r="${r}"][data-c="${c}"]`);
      if (cell) {
        cell.style.background = '#22c55e44';
        cell.style.boxShadow = '0 0 12px #22c55e';
      }
    });

    if (winner === 'X' || (mode === 'pvp' && winner)) {
      sessionWins++;
      GameModal.setScore(sessionWins);
      SoundManager.play('win');
      UIManager.showWin({
        title: mode === 'pvp' ? `Người chơi ${winner} Thắng!` : 'Bạn Đã Chiến Thắng!',
        emoji: '🏆',
        gameId: 'caroo',
        message: 'Chuỗi 5 quân tuyệt đẹp!',
        onPlayAgain: () => startGame(mode)
      });
    } else {
      SoundManager.play('lose');
      UIManager.showLoss({
        title: 'Máy Đã Chiến Thắng!',
        emoji: '🤖',
        gameId: 'caroo',
        message: 'AI Đại Sư đã khóa các đường cờ của bạn.',
        onPlayAgain: () => startGame(mode)
      });
    }
  }

  // ─── AI ĐẠI SƯ (PATTERN RECOGNITION + HEURISTIC MATRIX) ────────────────────────
  function aiMove() {
    if (gameOver) return;
    let move = null;

    if (mode === 'easy') {
      move = randomMove();
    } else {
      move = findMasterMove();
    }

    if (!move) move = randomMove();
    if (move) {
      currentPlayer = 'O';
      placeMove(move[0], move[1]);
      if (!gameOver) {
        currentPlayer = 'X';
        updateStatusLabel();
        startTurnTimer();
      }
    }
  }

  function randomMove() {
    const empty = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (!board[r][c]) empty.push([r, c]);
    return empty.length ? empty[Math.floor(Math.random() * empty.length)] : null;
  }

  // Đánh giá ma trận thế cờ chuyên nghiệp
  function findMasterMove() {
    // 1. Nếu O có thể thắng ngay trong nước này -> Đánh luôn!
    const winMove = getImmediateWinOrBlock('O', 5);
    if (winMove) return winMove;

    // 2. Nếu X có 4 con hoặc 3 con hở 2 đầu chuẩn bị thắng -> Chặn ngay lập tức!
    const blockWin = getImmediateWinOrBlock('X', 5);
    if (blockWin) return blockWin;

    const blockOpen4 = getImmediateWinOrBlock('X', 4);
    if (blockOpen4) return blockOpen4;

    // 3. Nếu O có 4 con có thể kết thúc hoặc tạo thế -> Ưu tiên công
    const attackOpen4 = getImmediateWinOrBlock('O', 4);
    if (attackOpen4) return attackOpen4;

    // 4. Quét toàn bộ các ô lân cận để tính điểm công và thủ cao nhất
    let bestScore = -Infinity;
    let bestMoves = [];

    const candidates = getCandidateMoves();
    for (const [r, c] of candidates) {
      // Điểm tấn công của máy (O)
      board[r][c] = 'O';
      const attackScore = evaluatePoint(r, c, 'O');
      board[r][c] = null;

      // Điểm phòng ngự chặn người chơi (X)
      board[r][c] = 'X';
      const defenseScore = evaluatePoint(r, c, 'X');
      board[r][c] = null;

      // Hệ số cân bằng: Thủ quan trọng gấp 1.2 lần nếu đối thủ sắp nguy hiểm
      const totalScore = attackScore + defenseScore * 1.25;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMoves = [[r, c]];
      } else if (totalScore === bestScore) {
        bestMoves.push([r, c]);
      }
    }

    return bestMoves.length ? bestMoves[Math.floor(Math.random() * bestMoves.length)] : null;
  }

  function getImmediateWinOrBlock(player, targetLen) {
    const candidates = getCandidateMoves();
    for (const [r, c] of candidates) {
      board[r][c] = player;
      const win = checkWin(board, player);
      board[r][c] = null;
      if (win) return [r, c];
    }
    return null;
  }

  function getCandidateMoves() {
    const list = [];
    const visited = new Set();
    const radius = 2;

    let hasPiece = false;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) {
          hasPiece = true;
          for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
              const nr = r + dr, nc = c + dc;
              if (inBounds(nr, nc) && !board[nr][nc]) {
                const key = nr * COLS + nc;
                if (!visited.has(key)) {
                  visited.add(key);
                  list.push([nr, nc]);
                }
              }
            }
          }
        }
      }
    }

    // Nếu bàn cờ trống, đánh giữa
    if (!hasPiece) return [[Math.floor(ROWS / 2), Math.floor(COLS / 2)]];
    return list;
  }

  function evaluatePoint(r, c, player) {
    let score = 0;
    for (const [dr, dc] of DIRS) {
      let count = 1;
      let openEnds = 0;

      // Hướng thuận
      let step = 1;
      while (step < 5) {
        const nr = r + dr * step, nc = c + dc * step;
        if (!inBounds(nr, nc)) break;
        if (board[nr][nc] === player) count++;
        else if (board[nr][nc] === null) { openEnds++; break; }
        else break;
        step++;
      }

      // Hướng nghịch
      step = 1;
      while (step < 5) {
        const nr = r - dr * step, nc = c - dc * step;
        if (!inBounds(nr, nc)) break;
        if (board[nr][nc] === player) count++;
        else if (board[nr][nc] === null) { openEnds++; break; }
        else break;
        step++;
      }

      // Bảng điểm chuẩn cờ vây Caro
      if (count >= 5) score += 200000;
      else if (count === 4) score += openEnds === 2 ? 60000 : (openEnds === 1 ? 8000 : 0);
      else if (count === 3) score += openEnds === 2 ? 6000 : (openEnds === 1 ? 800 : 0);
      else if (count === 2) score += openEnds === 2 ? 600 : (openEnds === 1 ? 80 : 0);
    }
    return score;
  }

  function startGame(modeId) {
    cleanup();
    mode = modeId || 'hard';
    board = makeBoard();
    currentPlayer = 'X';
    gameOver = false;
    lastMove = null;
    sessionWins = 0;
    render();
    updateStatusLabel();
    startTurnTimer();
  }

  function cleanup() {
    clearInterval(turnTimerInterval);
    if (aiThinkTimeout) {
      clearTimeout(aiThinkTimeout);
      aiThinkTimeout = null;
    }
  }

  GameRegistry.register({
    id: 'caroo',
    icon: '⬛',
    name: 'Caro (Gomoku)',
    modes: [
      { id: 'hard',  label: '🧠 Máy Đại Sư (AI Chuẩn)' },
      { id: 'blitz', label: '⚡ Chớp Nhoáng (10s)' },
      { id: 'easy',  label: '😊 Máy Dễ' },
      { id: 'pvp',   label: '👥 2 Người chơi' },
    ],
    startMode(modeId) {
      startGame(modeId);
    },
    cleanup() {
      cleanup();
    },
  });

})();
