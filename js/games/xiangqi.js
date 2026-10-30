/**
 * xiangqi.js – Cờ Tướng (Chinese Chess)
 * Fully self-contained. Registers itself with GameRegistry.
 */
(function () {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────
  const COLS = 9;
  const ROWS = 10;

  // Piece type constants
  const PT = {
    TUONG: 'T',  // 将/帅 General
    SI:    'S',  // 士/仕 Advisor
    TUONG2:'X',  // 象/相 Elephant (using X to avoid clash with Xe)
    MA:    'M',  // 馬   Horse
    XE:    'R',  // 車   Chariot
    PHAO:  'P',  // 炮   Cannon
    TOT:   'Z',  // 卒/兵 Soldier
  };

  // Vietnamese display names: [red, black]
  const PIECE_LABEL = {
    [PT.TUONG]:  ['帥', '將'],
    [PT.SI]:     ['仕', '士'],
    [PT.TUONG2]: ['相', '象'],
    [PT.MA]:     ['傌', '馬'],
    [PT.XE]:     ['俥', '車'],
    [PT.PHAO]:   ['炮', '砲'],
    [PT.TOT]:    ['兵', '卒'],
  };

  // Colors
  const RED   = 'red';
  const BLACK = 'black';

  // ─── Board helpers ────────────────────────────────────────────────────────
  function rc(r, c) { return r * COLS + c; }
  function row(idx)  { return Math.floor(idx / COLS); }
  function col(idx)  { return idx % COLS; }
  function inBoard(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }

  // Palace bounds (row, col inclusive)
  const PALACE = {
    [RED]:   { rMin: 7, rMax: 9, cMin: 3, cMax: 5 },
    [BLACK]: { rMin: 0, rMax: 2, cMin: 3, cMax: 5 },
  };

  function inPalace(r, c, color) {
    const p = PALACE[color];
    return r >= p.rMin && r <= p.rMax && c >= p.cMin && c <= p.cMax;
  }

  // ─── Initial board setup ──────────────────────────────────────────────────
  // Each piece: { type, color }
  function createInitialBoard() {
    const board = new Array(ROWS * COLS).fill(null);
    function place(r, c, type, color) { board[rc(r, c)] = { type, color }; }

    // Black (top, rows 0-2)
    const backRank = [PT.XE, PT.MA, PT.TUONG2, PT.SI, PT.TUONG, PT.SI, PT.TUONG2, PT.MA, PT.XE];
    backRank.forEach((t, c) => place(0, c, t, BLACK));
    place(2, 1, PT.PHAO, BLACK);
    place(2, 7, PT.PHAO, BLACK);
    for (let c = 0; c < 9; c += 2) place(3, c, PT.TOT, BLACK);

    // Red (bottom, rows 9-7)
    backRank.forEach((t, c) => place(9, c, t, RED));
    place(7, 1, PT.PHAO, RED);
    place(7, 7, PT.PHAO, RED);
    for (let c = 0; c < 9; c += 2) place(6, c, PT.TOT, RED);

    return board;
  }

  // ─── Move generation ──────────────────────────────────────────────────────
  function getLegalMoves(board, fromIdx, checkKingSafety = true) {
    const piece = board[fromIdx];
    if (!piece) return [];
    const r = row(fromIdx), c = col(fromIdx);
    const moves = [];

    function tryAdd(tr, tc) {
      if (!inBoard(tr, tc)) return;
      const target = board[rc(tr, tc)];
      if (target && target.color === piece.color) return;
      moves.push(rc(tr, tc));
    }

    switch (piece.type) {
      case PT.TUONG: {
        // Stays in palace, moves 1 step orthogonally
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
          const nr = r+dr, nc = c+dc;
          if (inPalace(nr, nc, piece.color)) tryAdd(nr, nc);
        });
        break;
      }
      case PT.SI: {
        // Stays in palace, moves 1 step diagonally
        [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([dr,dc]) => {
          const nr = r+dr, nc = c+dc;
          if (inPalace(nr, nc, piece.color)) tryAdd(nr, nc);
        });
        break;
      }
      case PT.TUONG2: {
        // Moves exactly 2 diagonally, cannot cross river, blocked by piece at midpoint
        const homeRows = piece.color === RED ? [5,6,7,8,9] : [0,1,2,3,4];
        [[2,2],[2,-2],[-2,2],[-2,-2]].forEach(([dr,dc]) => {
          const nr = r+dr, nc = c+dc;
          if (!inBoard(nr, nc)) return;
          if (!homeRows.includes(nr)) return; // can't cross river
          const mr = r+dr/2, mc = c+dc/2;
          if (board[rc(mr, mc)]) return; // blocked
          tryAdd(nr, nc);
        });
        break;
      }
      case PT.MA: {
        // Moves 1 orthogonal then 1 diagonal; can be blocked
        [[1,0,2,1],[1,0,2,-1],[-1,0,-2,1],[-1,0,-2,-1],
         [0,1,1,2],[0,1,-1,2],[0,-1,1,-2],[0,-1,-1,-2]].forEach(([br,bc,dr,dc]) => {
          const blockR = r+br, blockC = c+bc;
          if (!inBoard(blockR, blockC)) return;
          if (board[rc(blockR, blockC)]) return; // leg blocked
          tryAdd(r+dr, c+dc);
        });
        break;
      }
      case PT.XE: {
        // Slides any number of squares orthogonally
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
          let nr = r+dr, nc = c+dc;
          while (inBoard(nr, nc)) {
            const target = board[rc(nr, nc)];
            if (target) {
              if (target.color !== piece.color) moves.push(rc(nr, nc));
              break;
            }
            moves.push(rc(nr, nc));
            nr += dr; nc += dc;
          }
        });
        break;
      }
      case PT.PHAO: {
        // Slides like Xe to move; captures by jumping exactly one piece
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
          let nr = r+dr, nc = c+dc;
          let jumped = false;
          while (inBoard(nr, nc)) {
            const target = board[rc(nr, nc)];
            if (!jumped) {
              if (target) { jumped = true; }
              else { moves.push(rc(nr, nc)); }
            } else {
              if (target) {
                if (target.color !== piece.color) moves.push(rc(nr, nc));
                break;
              }
            }
            nr += dr; nc += dc;
          }
        });
        break;
      }
      case PT.TOT: {
        // Before crossing river: only forward
        // After crossing river: forward + sideways
        const forward = piece.color === RED ? -1 : 1;
        const crossedRiver = piece.color === RED ? r < 5 : r >= 5;
        tryAdd(r + forward, c);
        if (crossedRiver) {
          tryAdd(r, c+1);
          tryAdd(r, c-1);
        }
        break;
      }
    }

    if (!checkKingSafety) return moves;

    // Filter moves that leave own general in check
    return moves.filter(toIdx => {
      const next = applyMove(board, fromIdx, toIdx);
      return !isInCheck(next, piece.color);
    });
  }

  function applyMove(board, fromIdx, toIdx) {
    const next = board.slice();
    next[toIdx] = next[fromIdx];
    next[fromIdx] = null;
    return next;
  }

  // Find general position for given color
  function findGeneral(board, color) {
    for (let i = 0; i < board.length; i++) {
      const p = board[i];
      if (p && p.type === PT.TUONG && p.color === color) return i;
    }
    return -1;
  }

  // Check if two generals are facing each other (no pieces between)
  function generalsFacing(board) {
    const ri = findGeneral(board, RED);
    const bi = findGeneral(board, BLACK);
    if (ri < 0 || bi < 0) return false;
    if (col(ri) !== col(bi)) return false;
    const c0 = col(ri);
    const rRow = row(ri), bRow = row(bi);
    const minR = Math.min(rRow, bRow), maxR = Math.max(rRow, bRow);
    for (let r2 = minR+1; r2 < maxR; r2++) {
      if (board[rc(r2, c0)]) return false;
    }
    return true;
  }

  function isInCheck(board, color) {
    const genIdx = findGeneral(board, color);
    if (genIdx < 0) return true;
    // Check if any opponent piece can capture the general
    const opp = color === RED ? BLACK : RED;
    for (let i = 0; i < board.length; i++) {
      const p = board[i];
      if (p && p.color === opp) {
        const moves = getLegalMoves(board, i, false);
        if (moves.includes(genIdx)) return true;
      }
    }
    // Also check generals facing
    if (generalsFacing(board)) return true;
    return false;
  }

  function hasAnyLegalMove(board, color) {
    for (let i = 0; i < board.length; i++) {
      const p = board[i];
      if (p && p.color === color) {
        if (getLegalMoves(board, i).length > 0) return true;
      }
    }
    return false;
  }

  // ─── AI (Positional Evaluation + 2-Ply Minimax + Piece-Square Table) ───────────────────
  const PIECE_VALUE = {
    [PT.TUONG]: 10000,
    [PT.SI]:    250,
    [PT.TUONG2]:250,
    [PT.MA]:    450,
    [PT.XE]:    1000,
    [PT.PHAO]:  500,
    [PT.TOT]:   120,
  };

  function evaluate(board, color) {
    let score = 0;
    for (let i = 0; i < board.length; i++) {
      const p = board[i];
      if (!p) continue;
      let val = PIECE_VALUE[p.type] || 0;
      const r = row(i);
      const c = col(i);

      // Thưởng vị trí cho Tốt qua sông
      if (p.type === PT.TOT) {
        if (p.color === RED && r <= 4) val += 80;
        else if (p.color === BLACK && r >= 5) val += 80;
      }
      // Thưởng vị trí cho Mã và Xe chiếm trung lộ
      if ((p.type === PT.MA || p.type === PT.XE) && c >= 2 && c <= 6) {
        val += 35;
      }

      score += (p.color === color ? val : -val);
    }
    return score;
  }

  function aiPickMove(board, aiColor) {
    let best = null, bestScore = -Infinity;
    const oppColor = aiColor === RED ? BLACK : RED;

    // 1. Quét nước ăn Tướng ngay lập tức
    for (let fromIdx = 0; fromIdx < board.length; fromIdx++) {
      const p = board[fromIdx];
      if (!p || p.color !== aiColor) continue;
      const moves = getLegalMoves(board, fromIdx);
      for (const toIdx of moves) {
        if (board[toIdx] && board[toIdx].type === PT.TUONG) {
          return { fromIdx, toIdx };
        }
      }
    }

    // 2. Tìm nước đi tốt nhất với tính trước phản đòn (Minimax 2-ply)
    for (let fromIdx = 0; fromIdx < board.length; fromIdx++) {
      const p = board[fromIdx];
      if (!p || p.color !== aiColor) continue;
      const moves = getLegalMoves(board, fromIdx);

      for (const toIdx of moves) {
        const nextBoard = applyMove(board, fromIdx, toIdx);
        let moveScore = evaluate(nextBoard, aiColor);

        // Phản đòn của đối thủ
        let oppBestScore = -Infinity;
        for (let oppFrom = 0; oppFrom < nextBoard.length; oppFrom++) {
          const oppP = nextBoard[oppFrom];
          if (!oppP || oppP.color !== oppColor) continue;
          const oppMoves = getLegalMoves(nextBoard, oppFrom);
          for (const oppTo of oppMoves) {
            const oppNext = applyMove(nextBoard, oppFrom, oppTo);
            const oppScore = evaluate(oppNext, oppColor);
            if (oppScore > oppBestScore) oppBestScore = oppScore;
          }
        }

        if (oppBestScore !== -Infinity) {
          moveScore -= oppBestScore * 0.8;
        }

        if (moveScore > bestScore) {
          bestScore = moveScore;
          best = { fromIdx, toIdx };
        }
      }
    }
    return best;
  }

  // ─── Game State ───────────────────────────────────────────────────────────
  let state = null;

  function newState(mode) {
    return {
      board: createInitialBoard(),
      currentTurn: RED,
      selected: null,
      possibleMoves: [],
      mode,          // 'pvp' | 'ai'
      aiColor: BLACK,
      gameOver: false,
      scores: { [RED]: 0, [BLACK]: 0 },
    };
  }

  // ─── Rendering ────────────────────────────────────────────────────────────
  let container = null;
  let gridEl    = null;

  function injectStyles() {
    if (document.getElementById('xq-styles')) return;
    const style = document.createElement('style');
    style.id = 'xq-styles';
    style.textContent = `
      :root { --xiangqi-bg: #c8a96e; }
      #xq-wrapper {
        display: flex; flex-direction: column; align-items: center;
        gap: 8px; padding: 8px; box-sizing: border-box;
        user-select: none;
      }
      .xq-grid {
        display: grid;
        grid-template-columns: repeat(9, 1fr);
        border: 3px solid #5a3a1a;
        background: var(--xiangqi-bg);
        position: relative;
        width: min(90vw, 420px);
        height: min(100vw, 467px);
      }
      .xq-cell {
        border: 1px solid #5a3a1a;
        display: flex; align-items: center; justify-content: center;
        position: relative; cursor: pointer;
        box-sizing: border-box;
      }
      .xq-cell.river-top  { border-bottom: 3px solid #5a3a1a; }
      .xq-cell.river-bot  { border-top:    3px solid #5a3a1a; }
      .xq-cell.possible-move::after {
        content: ''; display: block; width: 40%; height: 40%;
        border-radius: 50%; background: rgba(80,200,80,0.55);
        pointer-events: none;
      }
      .xq-cell.possible-move.can-capture::after {
        width: 80%; height: 80%; background: rgba(255,80,80,0.35);
        border: 2px solid rgba(200,0,0,0.5); border-radius: 50%;
      }
      .xq-piece {
        width: 82%; height: 82%; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: clamp(10px, 2.5vw, 16px); font-weight: 700;
        cursor: pointer; z-index: 2; border: 2px solid;
        transition: transform 0.1s;
        position: relative;
      }
      .xq-piece.red {
        background: radial-gradient(circle at 35% 35%, #ffe066, #c0392b);
        color: #7a1b0a; border-color: #7a1b0a;
      }
      .xq-piece.black {
        background: radial-gradient(circle at 35% 35%, #888, #111);
        color: #f0e6c0; border-color: #333;
      }
      .xq-piece.selected {
        box-shadow: 0 0 0 3px #0af, 0 0 12px #0af;
        transform: scale(1.1);
      }
      .xq-river-label {
        position: absolute; left: 50%; transform: translateX(-50%);
        top: -13px; font-size: 11px; color: #5a3a1a;
        white-space: nowrap; pointer-events: none; z-index: 5;
        font-style: italic; letter-spacing: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  function buildBoard() {
    const modal = document.getElementById('modal-body');
    if (!modal) return;

    modal.innerHTML = '';
    injectStyles();

    container = document.createElement('div');
    container.id = 'xq-wrapper';

    gridEl = document.createElement('div');
    gridEl.className = 'xq-grid';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'xq-cell';
        cell.dataset.idx = rc(r, c);
        if (r === 4) { cell.classList.add('river-top'); }
        if (r === 5) { cell.classList.add('river-bot'); }
        cell.addEventListener('click', onCellClick);
        gridEl.appendChild(cell);
      }
    }

    // River label
    const riverLabel = document.createElement('div');
    riverLabel.className = 'xq-river-label';
    riverLabel.textContent = '楚河  漢界';
    gridEl.style.position = 'relative';
    gridEl.appendChild(riverLabel);
    // Position the label at the river
    riverLabel.style.top = '44.5%';

    container.appendChild(gridEl);
    modal.appendChild(container);

    renderBoard();
  }

  function renderBoard() {
    if (!gridEl || !state) return;
    const cells = gridEl.querySelectorAll('.xq-cell');
    cells.forEach(cell => {
      const idx = parseInt(cell.dataset.idx);
      // Clear
      cell.innerHTML = '';
      cell.classList.remove('possible-move', 'can-capture');

      // Possible moves highlight
      if (state.possibleMoves.includes(idx)) {
        cell.classList.add('possible-move');
        if (state.board[idx]) cell.classList.add('can-capture');
      }

      // Piece
      const piece = state.board[idx];
      if (piece) {
        const div = document.createElement('div');
        div.className = `xq-piece ${piece.color}`;
        if (state.selected === idx) div.classList.add('selected');
        const labels = PIECE_LABEL[piece.type];
        div.textContent = piece.color === RED ? labels[0] : labels[1];
        cell.appendChild(div);
      }
    });

    // Update status
    if (!state.gameOver) {
      const turnName = state.currentTurn === RED ? '🔴 Đỏ' : '⚫ Đen';
      if (typeof GameModal !== 'undefined') GameModal.setStatus(`Lượt: ${turnName}`);
    }
  }

  // ─── Interaction ──────────────────────────────────────────────────────────
  function onCellClick(e) {
    if (!state || state.gameOver) return;
    if (state.mode === 'ai' && state.currentTurn === state.aiColor) return;

    const idx = parseInt(e.currentTarget.dataset.idx);
    const piece = state.board[idx];

    // If a piece is selected
    if (state.selected !== null) {
      // Clicking a valid destination
      if (state.possibleMoves.includes(idx)) {
        doMove(state.selected, idx);
        return;
      }
      // Clicking own piece → reselect
      if (piece && piece.color === state.currentTurn) {
        selectPiece(idx);
        return;
      }
      // Deselect
      state.selected = null;
      state.possibleMoves = [];
      renderBoard();
      return;
    }

    // Select a piece
    if (piece && piece.color === state.currentTurn) {
      selectPiece(idx);
    }
  }

  function selectPiece(idx) {
    state.selected = idx;
    state.possibleMoves = getLegalMoves(state.board, idx);
    renderBoard();
  }

  function doMove(fromIdx, toIdx) {
    const captured = state.board[toIdx];
    state.board = applyMove(state.board, fromIdx, toIdx);
    state.selected = null;
    state.possibleMoves = [];

    if (typeof SoundManager !== 'undefined') SoundManager.play('move');

    // Check if general captured (shouldn't happen with legal move filtering but just in case)
    if (captured && captured.type === PT.TUONG) {
      endGame(state.currentTurn);
      return;
    }

    // Switch turn
    state.currentTurn = state.currentTurn === RED ? BLACK : RED;

    // Check for checkmate / stalemate
    if (!hasAnyLegalMove(state.board, state.currentTurn)) {
      // Current player has no moves
      if (isInCheck(state.board, state.currentTurn)) {
        // Checkmate: previous player wins
        endGame(state.currentTurn === RED ? BLACK : RED);
      } else {
        // Stalemate: current player loses (Xiangqi rule)
        endGame(state.currentTurn === RED ? BLACK : RED);
      }
      return;
    }

    renderBoard();

    // AI move
    if (state.mode === 'ai' && state.currentTurn === state.aiColor && !state.gameOver) {
      setTimeout(doAiMove, 400);
    }
  }

  function doAiMove() {
    if (!state || state.gameOver) return;
    const move = aiPickMove(state.board, state.aiColor);
    if (!move) {
      endGame(state.aiColor === RED ? BLACK : RED);
      return;
    }
    doMove(move.fromIdx, move.toIdx);
  }

  function endGame(winnerColor) {
    state.gameOver = true;
    state.scores[winnerColor] = (state.scores[winnerColor] || 0) + 1;
    const winnerName = winnerColor === RED ? '🔴 Đỏ' : '⚫ Đen';
    if (typeof GameModal !== 'undefined') GameModal.setStatus(`${winnerName} thắng!`);
    if (typeof UIManager !== 'undefined') {
      UIManager.showWin({
        gameId: 'xiangqi',
        winner: winnerName,
        message: `${winnerName} thắng ván cờ!`,
      });
    }
    renderBoard();
  }

  // ─── Registration ─────────────────────────────────────────────────────────
  if (typeof GameRegistry !== 'undefined') {
    GameRegistry.register({
      id: 'xiangqi',
      icon: '🀄',
      name: 'Cờ Tướng',
      modes: [
        { id: 'pvp', label: '👥 2 Người' },
        { id: 'ai',  label: '🤖 vs AI'  },
      ],
      startMode(modeId) {
        state = newState(modeId);
        buildBoard();
        if (typeof GameModal !== 'undefined') {
          GameModal.setScore('🔴 Đỏ: 0  |  ⚫ Đen: 0');
        }
      },
      cleanup() {
        state = null;
        container = null;
        gridEl = null;
      },
    });
  }
})();
