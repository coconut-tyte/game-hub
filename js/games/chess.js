/**
 * chess.js — Full Chess Game for Game Hub
 * Modes: PvP, Easy AI (random legal), Hard AI (minimax depth 3, material + PST)
 * Features: all pieces, castling, en passant, pawn promotion, check/checkmate/stalemate
 */
(function () {
  'use strict';

  // ─── Piece constants ─────────────────────────────────────────────────────────
  const PIECES = {
    wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
    bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
  };

  const PIECE_VALUE = { K: 20000, Q: 900, R: 500, B: 330, N: 320, P: 100 };

  // Piece-square tables (from white's perspective, flipped for black)
  const PST = {
    P: [
      [ 0,  0,  0,  0,  0,  0,  0,  0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [ 5,  5, 10, 25, 25, 10,  5,  5],
      [ 0,  0,  0, 20, 20,  0,  0,  0],
      [ 5, -5,-10,  0,  0,-10, -5,  5],
      [ 5, 10, 10,-20,-20, 10, 10,  5],
      [ 0,  0,  0,  0,  0,  0,  0,  0],
    ],
    N: [
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,  0,  0,  0,  0,-20,-40],
      [-30,  0, 10, 15, 15, 10,  0,-30],
      [-30,  5, 15, 20, 20, 15,  5,-30],
      [-30,  0, 15, 20, 20, 15,  0,-30],
      [-30,  5, 10, 15, 15, 10,  5,-30],
      [-40,-20,  0,  5,  5,  0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50],
    ],
    B: [
      [-20,-10,-10,-10,-10,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5, 10, 10,  5,  0,-10],
      [-10,  5,  5, 10, 10,  5,  5,-10],
      [-10,  0, 10, 10, 10, 10,  0,-10],
      [-10, 10, 10, 10, 10, 10, 10,-10],
      [-10,  5,  0,  0,  0,  0,  5,-10],
      [-20,-10,-10,-10,-10,-10,-10,-20],
    ],
    R: [
      [ 0,  0,  0,  0,  0,  0,  0,  0],
      [ 5, 10, 10, 10, 10, 10, 10,  5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [ 0,  0,  0,  5,  5,  0,  0,  0],
    ],
    Q: [
      [-20,-10,-10, -5, -5,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5,  5,  5,  5,  0,-10],
      [ -5,  0,  5,  5,  5,  5,  0, -5],
      [  0,  0,  5,  5,  5,  5,  0, -5],
      [-10,  5,  5,  5,  5,  5,  0,-10],
      [-10,  0,  5,  0,  0,  0,  0,-10],
      [-20,-10,-10, -5, -5,-10,-10,-20],
    ],
    K: [
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-20,-30,-30,-40,-40,-30,-30,-20],
      [-10,-20,-20,-20,-20,-20,-20,-10],
      [ 20, 20,  0,  0,  0,  0, 20, 20],
      [ 20, 30, 10,  0,  0, 10, 30, 20],
    ],
  };

  // ─── State ───────────────────────────────────────────────────────────────────
  let gameBoard = [];      // 8x8 array, null or 'wK', 'bP', etc.
  let currentTurn = 'w';  // 'w' | 'b'
  let gameMode = 'pvp';
  let gameOver = false;
  let sessionWins = 0;

  let selectedSq = null;   // [row, col] or null
  let legalMovesCache = []; // legal move objects for selected piece

  let lastMove = null;     // { from:[r,c], to:[r,c] }
  let enPassantTarget = null; // [row, col] square where capture is possible

  // Castling rights: { wK, wQ, bK, bQ } — true means still allowed
  let castleRights = { wK: true, wQ: true, bK: true, bQ: true };

  let aiTimeout = null;
  let checkSq = null; // [r,c] of king in check

  // ─── Board Setup ─────────────────────────────────────────────────────────────
  function initialBoard() {
    const b = Array.from({ length: 8 }, () => Array(8).fill(null));
    const order = ['R','N','B','Q','K','B','N','R'];
    for (let c = 0; c < 8; c++) {
      b[0][c] = 'b' + order[c];
      b[7][c] = 'w' + order[c];
      b[1][c] = 'bP';
      b[6][c] = 'wP';
    }
    return b;
  }

  // ─── Piece helpers ────────────────────────────────────────────────────────────
  function color(piece) { return piece ? piece[0] : null; }
  function type(piece)  { return piece ? piece[1] : null; }
  function isWhite(piece) { return color(piece) === 'w'; }
  function isBlack(piece) { return color(piece) === 'b'; }
  function enemy(col)   { return col === 'w' ? 'b' : 'w'; }
  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  // ─── Move Generation ─────────────────────────────────────────────────────────
  /**
   * Returns pseudo-legal moves (ignoring check) for piece at [r,c].
   * Each move: { from:[r,c], to:[r,c], promotion?, castle?, enPassant? }
   */
  function pseudoMoves(b, r, c, ep, cr) {
    const piece = b[r][c];
    if (!piece) return [];
    const col = color(piece);
    const t = type(piece);
    const moves = [];

    function tryPush(tr, tc, opts = {}) {
      if (!inBounds(tr, tc)) return false;
      const target = b[tr][tc];
      if (target && color(target) === col) return false; // blocked by own
      moves.push({ from: [r, c], to: [tr, tc], ...opts });
      return !target; // can continue sliding only if square was empty
    }

    function slide(dirs) {
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (inBounds(nr, nc)) {
          const can = tryPush(nr, nc);
          if (!can) break;
          nr += dr; nc += dc;
        }
      }
    }

    switch (t) {
      case 'P': {
        const dir = col === 'w' ? -1 : 1;
        const startRow = col === 'w' ? 6 : 1;
        const promRow = col === 'w' ? 0 : 7;
        // Forward 1
        const nr1 = r + dir;
        if (inBounds(nr1, c) && !b[nr1][c]) {
          if (nr1 === promRow) {
            for (const promo of ['Q','R','B','N'])
              moves.push({ from: [r,c], to: [nr1, c], promotion: promo });
          } else {
            moves.push({ from: [r,c], to: [nr1, c] });
          }
          // Forward 2 from start
          const nr2 = r + dir * 2;
          if (r === startRow && !b[nr2][c]) {
            moves.push({ from: [r,c], to: [nr2, c], doublePush: true });
          }
        }
        // Captures
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (!inBounds(nr1, nc)) continue;
          const target = b[nr1][nc];
          if (target && color(target) !== col) {
            if (nr1 === promRow) {
              for (const promo of ['Q','R','B','N'])
                moves.push({ from: [r,c], to: [nr1, nc], promotion: promo });
            } else {
              moves.push({ from: [r,c], to: [nr1, nc] });
            }
          }
          // En passant
          if (ep && nr1 === ep[0] && nc === ep[1]) {
            moves.push({ from: [r,c], to: [nr1, nc], enPassant: true });
          }
        }
        break;
      }
      case 'N':
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
          tryPush(r+dr, c+dc);
        break;
      case 'B':
        slide([[1,1],[1,-1],[-1,1],[-1,-1]]);
        break;
      case 'R':
        slide([[1,0],[-1,0],[0,1],[0,-1]]);
        break;
      case 'Q':
        slide([[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]]);
        break;
      case 'K': {
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
          tryPush(r+dr, c+dc);
        // Castling
        const baseRow = col === 'w' ? 7 : 0;
        if (r === baseRow && c === 4) {
          // Kingside
          if (cr[col+'K'] && !b[baseRow][5] && !b[baseRow][6]
            && b[baseRow][7] === col+'R') {
            moves.push({ from: [r,c], to: [baseRow, 6], castle: 'K' });
          }
          // Queenside
          if (cr[col+'Q'] && !b[baseRow][3] && !b[baseRow][2] && !b[baseRow][1]
            && b[baseRow][0] === col+'R') {
            moves.push({ from: [r,c], to: [baseRow, 2], castle: 'Q' });
          }
        }
        break;
      }
    }
    return moves;
  }

  /** Is the square [r,c] attacked by `byColor`? */
  function isAttacked(b, r, c, byColor) {
    // Check all squares for pieces of `byColor` that can reach [r,c]
    for (let sr = 0; sr < 8; sr++) {
      for (let sc = 0; sc < 8; sc++) {
        const piece = b[sr][sc];
        if (!piece || color(piece) !== byColor) continue;
        const moves = pseudoMoves(b, sr, sc, null, { wK:false,wQ:false,bK:false,bQ:false });
        if (moves.some(m => m.to[0] === r && m.to[1] === c && !m.castle)) return true;
      }
    }
    return false;
  }

  /** Find king of `col` on board b */
  function findKing(b, col) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (b[r][c] === col+'K') return [r, c];
    return null;
  }

  /** Apply a move to a board copy; returns new board state */
  function applyMove(b, move) {
    const nb = b.map(row => [...row]);
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;
    const piece = nb[fr][fc];

    nb[tr][tc] = move.promotion ? (color(piece) + move.promotion) : piece;
    nb[fr][fc] = null;

    // En passant capture
    if (move.enPassant) {
      const captureRow = fr; // same row as pawn, target col
      nb[captureRow][tc] = null;
    }

    // Castling: move the rook
    if (move.castle) {
      const row = fr;
      if (move.castle === 'K') {
        nb[row][5] = nb[row][7];
        nb[row][7] = null;
      } else {
        nb[row][3] = nb[row][0];
        nb[row][0] = null;
      }
    }

    return nb;
  }

  /** Full legal move filter: move must not leave own king in check */
  function legalMoves(b, col, ep, cr) {
    const legal = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = b[r][c];
        if (!piece || color(piece) !== col) continue;
        const pseudo = pseudoMoves(b, r, c, ep, cr);
        for (const move of pseudo) {
          // Castling safety: cannot castle through check or while in check
          if (move.castle) {
            const row = r;
            const [, kc] = [r, c];
            const passThrough = move.castle === 'K' ? [5, 6] : [2, 3];
            const enemyCol = enemy(col);
            if (isAttacked(b, row, kc, enemyCol)) continue; // in check
            if (passThrough.some(pc2 => isAttacked(b, row, pc2, enemyCol))) continue;
          }
          const nb = applyMove(b, move);
          const king = findKing(nb, col);
          if (king && !isAttacked(nb, king[0], king[1], enemy(col))) {
            legal.push(move);
          }
        }
      }
    }
    return legal;
  }

  /** Apply move to global state */
  function commitMove(move) {
    const piece = gameBoard[move.from[0]][move.from[1]];
    const [fr, fc] = move.from;
    const [tr, tc] = move.to;

    // Update en passant target
    enPassantTarget = move.doublePush
      ? [(fr + tr) >> 1, tc]  // midpoint row
      : null;

    // Update castling rights
    if (type(piece) === 'K') {
      castleRights[color(piece)+'K'] = false;
      castleRights[color(piece)+'Q'] = false;
    }
    if (type(piece) === 'R') {
      if (fc === 7) castleRights[color(piece)+'K'] = false;
      if (fc === 0) castleRights[color(piece)+'Q'] = false;
    }
    // If rook captured
    const target = gameBoard[tr][tc];
    if (target && type(target) === 'R') {
      if (tc === 7) castleRights[color(target)+'K'] = false;
      if (tc === 0) castleRights[color(target)+'Q'] = false;
    }

    gameBoard = applyMove(gameBoard, move);
    lastMove = { from: move.from, to: move.to };
    currentTurn = enemy(currentTurn);
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────
  const FILES = ['a','b','c','d','e','f','g','h'];

  function render() {
    const container = document.getElementById('modal-body');
    if (!container) return;

    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display:flex; flex-direction:column; align-items:center;
      gap:10px; padding:8px; font-family:'Segoe UI',sans-serif;
    `;

    // Status bar
    const statusRow = document.createElement('div');
    statusRow.style.cssText = 'display:flex;gap:16px;align-items:center;';

    const turnBadge = document.createElement('div');
    const isWhiteTurn = currentTurn === 'w';
    turnBadge.style.cssText = `
      padding:5px 14px; border-radius:20px; font-weight:700; font-size:15px;
      background:${isWhiteTurn ? '#f8fafc' : '#1e1e2e'};
      color:${isWhiteTurn ? '#111' : '#f8fafc'};
      border:2px solid ${isWhiteTurn ? '#cbd5e1' : '#6366f1'};
    `;
    turnBadge.textContent = gameOver ? '—' : `${isWhiteTurn ? '♔' : '♚'} ${isWhiteTurn ? 'Trắng' : 'Đen'} đi`;
    statusRow.appendChild(turnBadge);

    if (gameMode !== 'pvp') {
      const tag = document.createElement('span');
      tag.style.cssText = 'font-size:13px;opacity:.7;';
      tag.textContent = gameMode === 'easy' ? '🤖 AI Dễ' : '🧠 AI Khó';
      statusRow.appendChild(tag);
    }

    wrapper.appendChild(statusRow);

    // Board container with coordinate labels
    const boardWrap = document.createElement('div');
    boardWrap.style.cssText = 'position:relative; display:inline-block;';

    // File labels (a-h) — bottom
    const fileRow = document.createElement('div');
    fileRow.style.cssText = `
      display:grid; grid-template-columns:20px repeat(8,56px);
      font-size:11px; color:#94a3b8; text-align:center;
    `;
    fileRow.appendChild(document.createElement('div')); // spacer
    FILES.forEach(f => {
      const lbl = document.createElement('div');
      lbl.textContent = f;
      fileRow.appendChild(lbl);
    });

    // Board grid with rank labels
    const boardGrid = document.createElement('div');
    boardGrid.style.cssText = 'display:flex; flex-direction:column;';

    // Determine possible-move targets if a piece is selected
    const possibleTargets = new Set();
    const captureTargets = new Set();
    legalMovesCache.forEach(m => {
      const key = m.to[0]*8+m.to[1];
      if (gameBoard[m.to[0]][m.to[1]]) captureTargets.add(key);
      else possibleTargets.add(key);
    });

    // Check highlight
    checkSq = null;
    const king = findKing(gameBoard, currentTurn);
    if (king && !gameOver) {
      if (isAttacked(gameBoard, king[0], king[1], enemy(currentTurn))) {
        checkSq = king;
      }
    }

    for (let r = 0; r < 8; r++) {
      const rowEl = document.createElement('div');
      rowEl.style.cssText = 'display:flex; align-items:center;';

      // Rank label
      const rankLbl = document.createElement('div');
      rankLbl.style.cssText = `
        width:20px; font-size:11px; color:#94a3b8;
        text-align:center; line-height:56px;
      `;
      rankLbl.textContent = 8 - r;
      rowEl.appendChild(rankLbl);

      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.className = 'chess-cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
        const isLight = (r + c) % 2 === 0;
        const key = r*8+c;

        let bg = isLight ? '#f0d9b5' : '#b58863';

        // Last move highlight
        if (lastMove) {
          const [fr,fc] = lastMove.from, [tr,tc] = lastMove.to;
          if ((r===fr&&c===fc)||(r===tr&&c===tc)) {
            bg = isLight ? '#cdd16f' : '#aaa23a';
            cell.classList.add('last-move');
          }
        }

        // Selected
        if (selectedSq && selectedSq[0]===r && selectedSq[1]===c) {
          bg = isLight ? '#f6f669' : '#baca2b';
          cell.classList.add('selected');
        }

        // Check
        if (checkSq && checkSq[0]===r && checkSq[1]===c) {
          bg = 'radial-gradient(ellipse at center, #ff0000 0%, #ff000080 60%, transparent 100%)';
          cell.classList.add('in-check');
          cell.style.background = bg;
        } else {
          cell.style.background = bg;
        }

        cell.style.cssText += `
          width:56px; height:56px;
          display:flex; align-items:center; justify-content:center;
          position:relative; cursor:pointer; box-sizing:border-box;
          font-size:36px; line-height:1; user-select:none;
          transition:filter .1s;
        `;
        if (checkSq && checkSq[0]===r && checkSq[1]===c) {
          cell.style.background = 'radial-gradient(ellipse at center, #ff6b6b 0%, #dc2626 55%, #b58863 100%)';
        }

        // Possible move dot
        if (possibleTargets.has(key)) {
          cell.classList.add('possible-move');
          const dot = document.createElement('div');
          dot.style.cssText = `
            position:absolute; width:18px; height:18px;
            border-radius:50%; background:rgba(0,0,0,0.2);
            pointer-events:none; z-index:2;
          `;
          cell.appendChild(dot);
        }

        // Capture ring
        if (captureTargets.has(key)) {
          cell.classList.add('possible-capture');
          cell.style.outline = '4px solid rgba(0,0,0,0.35)';
          cell.style.outlineOffset = '-4px';
          cell.style.borderRadius = '50%';
        }

        const piece = gameBoard[r][c];
        if (piece) {
          const pieceEl = document.createElement('span');
          pieceEl.textContent = PIECES[piece];
          pieceEl.style.cssText = `
            z-index:3; font-size:38px; line-height:1;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,.5));
            pointer-events:none;
          `;
          cell.appendChild(pieceEl);
        }

        cell.addEventListener('click', () => handleSquareClick(r, c));
        rowEl.appendChild(cell);
      }
      boardGrid.appendChild(rowEl);
    }

    boardWrap.appendChild(boardGrid);
    boardWrap.appendChild(fileRow);
    wrapper.appendChild(boardWrap);

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🔄 Ván mới';
    resetBtn.style.cssText = `
      padding:7px 20px; border-radius:20px; border:none;
      background:#6366f1; color:#fff; font-size:14px;
      cursor:pointer; font-weight:600;
    `;
    resetBtn.addEventListener('click', () => startGame(gameMode));
    wrapper.appendChild(resetBtn);

    container.appendChild(wrapper);
  }

  // ─── Interaction ─────────────────────────────────────────────────────────────
  function handleSquareClick(r, c) {
    if (gameOver) return;
    if (gameMode !== 'pvp' && currentTurn === 'b') return; // AI's turn

    const piece = gameBoard[r][c];

    if (selectedSq) {
      const [sr, sc] = selectedSq;
      // Try to execute selected move
      const move = legalMovesCache.find(m => m.to[0]===r && m.to[1]===c);
      if (move) {
        // Auto-promote to queen for simplicity
        const execMove = move.promotion ? { ...move, promotion: 'Q' } : move;
        executeMove(execMove);
        return;
      }
      // Re-select own piece
      if (piece && color(piece) === currentTurn) {
        selectSquare(r, c);
        return;
      }
      // Deselect
      selectedSq = null;
      legalMovesCache = [];
      render();
      return;
    }

    if (piece && color(piece) === currentTurn) {
      selectSquare(r, c);
    }
  }

  function selectSquare(r, c) {
    selectedSq = [r, c];
    legalMovesCache = legalMoves(gameBoard, currentTurn, enPassantTarget, castleRights)
      .filter(m => m.from[0]===r && m.from[1]===c);
    render();
  }

  function executeMove(move) {
    selectedSq = null;
    legalMovesCache = [];

    commitMove(move);
    if (typeof SoundManager !== 'undefined') SoundManager.play('move');

    render();
    checkGameEnd();

    if (!gameOver && gameMode !== 'pvp' && currentTurn === 'b') {
      GameModal.setStatus('🤖 AI đang suy nghĩ…');
      const delay = gameMode === 'hard' ? 400 : 100;
      aiTimeout = setTimeout(doAiMove, delay);
    }
  }

  function checkGameEnd() {
    const col = currentTurn;
    const moves = legalMoves(gameBoard, col, enPassantTarget, castleRights);
    const king = findKing(gameBoard, col);
    const inCheck = king && isAttacked(gameBoard, king[0], king[1], enemy(col));

    if (moves.length === 0) {
      gameOver = true;
      if (typeof SoundManager !== 'undefined') SoundManager.play('win');

      if (inCheck) {
        // Checkmate — the player whose turn it is LOST
        const winner = enemy(col);
        const winnerName = winner === 'w' ? 'Trắng' : 'Đen';

        if (gameMode === 'pvp') {
          sessionWins++;
          GameModal.setScore(sessionWins);
          GameModal.setStatus(`♚ Chiếu hết! ${winnerName} thắng!`);
          if (typeof UIManager !== 'undefined') {
            UIManager.showWin({
              title: `${winnerName} Chiến Thắng!`,
              emoji: '♛',
              gameId: 'chess',
              onPlayAgain: () => startGame(gameMode),
            });
          }
        } else if (winner === 'w') {
          // Human wins
          sessionWins++;
          GameModal.setScore(sessionWins);
          GameModal.setStatus('🎉 Chiếu hết! Bạn thắng!');
          if (typeof UIManager !== 'undefined') {
            UIManager.showWin({
              title: 'Bạn Chiến Thắng!',
              emoji: '♛',
              gameId: 'chess',
              onPlayAgain: () => startGame(gameMode),
            });
          }
        } else {
          GameModal.setStatus('😞 Chiếu hết! AI thắng!');
          if (typeof UIManager !== 'undefined') {
            UIManager.showLoss({
              title: 'AI Thắng Rồi!',
              emoji: '🤖',
              gameId: 'chess',
              onPlayAgain: () => startGame(gameMode),
            });
          }
        }
      } else {
        // Stalemate
        GameModal.setStatus('🤝 Hòa! (Pat)');
        if (typeof UIManager !== 'undefined') {
          UIManager.toast('Hòa! Không còn nước đi hợp lệ.', 'info');
        }
      }
    } else if (inCheck) {
      GameModal.setStatus(`⚠️ ${col === 'w' ? 'Trắng' : 'Đen'} đang bị chiếu!`);
    } else {
      const turnName = currentTurn === 'w' ? 'Trắng' : 'Đen';
      GameModal.setStatus(`${currentTurn === 'w' ? '♔' : '♚'} ${turnName} đi`);
    }
  }

  // ─── AI ──────────────────────────────────────────────────────────────────────
  function doAiMove() {
    if (gameOver || currentTurn !== 'b') return;
    const moves = legalMoves(gameBoard, 'b', enPassantTarget, castleRights);
    if (!moves.length) return;

    let chosen;
    if (gameMode === 'easy') {
      chosen = moves[Math.floor(Math.random() * moves.length)];
    } else {
      chosen = bestMoveHard(moves);
    }
    if (chosen) {
      const execMove = chosen.promotion ? { ...chosen, promotion: 'Q' } : chosen;
      executeMove(execMove);
    }
  }

  function bestMoveHard(moves) {
    let best = null;
    let bestScore = -Infinity;
    for (const move of moves) {
      const snapBoard = gameBoard.map(r => [...r]);
      const snapEP = enPassantTarget;
      const snapCR = { ...castleRights };
      const snapTurn = currentTurn;
      const snapLast = lastMove;

      commitMove(move);
      const score = -negamax(gameBoard, 2, -Infinity, Infinity, 'w');

      // Restore
      gameBoard = snapBoard;
      enPassantTarget = snapEP;
      castleRights = snapCR;
      currentTurn = snapTurn;
      lastMove = snapLast;

      if (score > bestScore) {
        bestScore = score;
        best = move;
      }
    }
    return best;
  }

  function negamax(b, depth, alpha, beta, col) {
    const moves = legalMoves(b, col, enPassantTarget, castleRights);
    const king = findKing(b, col);
    const inCheck = king && isAttacked(b, king[0], king[1], enemy(col));

    if (moves.length === 0) {
      return inCheck ? -50000 - depth * 100 : 0; // checkmate or stalemate
    }
    if (depth === 0) return evalBoard(b, col);

    let best = -Infinity;
    for (const move of moves) {
      const snapBoard = gameBoard.map(r => [...r]);
      const snapEP = enPassantTarget;
      const snapCR = { ...castleRights };
      const snapTurn = currentTurn;
      const snapLast = lastMove;

      commitMove(move);
      const score = -negamax(gameBoard, depth - 1, -beta, -alpha, enemy(col));

      gameBoard = snapBoard;
      enPassantTarget = snapEP;
      castleRights = snapCR;
      currentTurn = snapTurn;
      lastMove = snapLast;

      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }
    return best;
  }

  function evalBoard(b, col) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = b[r][c];
        if (!piece) continue;
        const pCol = color(piece);
        const pType = type(piece);
        const val = PIECE_VALUE[pType] || 0;
        const pstRow = pCol === 'w' ? r : 7 - r;
        const pst = PST[pType] ? PST[pType][pstRow][c] : 0;
        const total = val + pst;
        score += pCol === col ? total : -total;
      }
    }
    return score;
  }

  // ─── Game control ─────────────────────────────────────────────────────────────
  function startGame(modeId) {
    cleanup();
    gameMode = modeId;
    gameBoard = initialBoard();
    currentTurn = 'w';
    gameOver = false;
    selectedSq = null;
    legalMovesCache = [];
    lastMove = null;
    enPassantTarget = null;
    castleRights = { wK: true, wQ: true, bK: true, bQ: true };
    sessionWins = 0;
    checkSq = null;
    GameModal.setScore(0);
    GameModal.setStatus('♔ Trắng đi trước');
    render();
  }

  function cleanup() {
    if (aiTimeout) {
      clearTimeout(aiTimeout);
      aiTimeout = null;
    }
    selectedSq = null;
    legalMovesCache = [];
  }

  // ─── Register ─────────────────────────────────────────────────────────────────
  GameRegistry.register({
    id: 'chess',
    icon: '♟',
    name: 'Cờ Vua',
    modes: [
      { id: 'pvp',  label: '👥 2 Người' },
      { id: 'easy', label: '🤖 AI Dễ' },
      { id: 'hard', label: '🧠 AI Khó' },
    ],
    startMode(modeId) {
      startGame(modeId);
    },
    cleanup() {
      cleanup();
    },
  });

})();
