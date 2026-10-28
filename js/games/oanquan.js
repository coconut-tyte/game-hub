/**
 * oanquan.js – Ô Ăn Quan (Vietnamese Mancala)
 * Fully self-contained. Registers itself with GameRegistry.
 *
 * Board indices (internal):
 *   0-5  : Player 1's side (bottom, left → right)
 *   6    : Right quan (官) cell
 *   7-12 : Player 2's side (top, right → left, so index 7 = rightmost top)
 *   13   : Left quan (官) cell
 *
 * Visual layout:
 *   [quan-left] [p2-5][p2-4][p2-3][p2-2][p2-1][p2-0] [quan-right]
 *   [quan-left] [p1-0][p1-1][p1-2][p1-3][p1-4][p1-5] [quan-right]
 *
 * Circular order (counterclockwise when viewed from above):
 *   0→1→2→3→4→5→6(quan-right)→7→8→9→10→11→12→13(quan-left)→0→...
 */
(function () {
  'use strict';

  // ─── Board layout mapping ─────────────────────────────────────────────────
  // 14 cells total: indices 0..13
  // 0-5: P1 cells (bottom left→right)
  // 6  : Right quan
  // 7-12: P2 cells (top, 7=rightmost, 12=leftmost)
  // 13 : Left quan
  const TOTAL_CELLS = 14;
  const QUAN_RIGHT  = 6;
  const QUAN_LEFT   = 13;
  const P1_CELLS    = [0,1,2,3,4,5];
  const P2_CELLS    = [7,8,9,10,11,12];  // 7=far right top, 12=far left top

  function isQuan(idx) { return idx === QUAN_RIGHT || idx === QUAN_LEFT; }
  function ownerOf(idx) {
    if (P1_CELLS.includes(idx)) return 1;
    if (P2_CELLS.includes(idx)) return 2;
    return null; // quan cells have no owner
  }

  // ─── Initial stone counts ─────────────────────────────────────────────────
  function initStones() {
    const stones = new Array(TOTAL_CELLS).fill(5);
    stones[QUAN_RIGHT] = 10;
    stones[QUAN_LEFT]  = 10;
    return stones;
  }

  // ─── Game state ───────────────────────────────────────────────────────────
  let state = null;

  function newState(mode) {
    return {
      stones: initStones(),
      currentPlayer: 1,      // 1 or 2
      mode,                  // 'pvp' | 'ai'
      gameOver: false,
      captured: [0, 0, 0],   // index 1=P1 captured, 2=P2 captured
      animating: false,
    };
  }

  // ─── Distribution logic ───────────────────────────────────────────────────
  // Returns next index in counterclockwise circular order
  function nextIdx(idx) {
    return (idx + 1) % TOTAL_CELLS;
  }

  /**
   * Simulate a move from cellIdx for player.
   * Returns an array of "frames" describing the state of stones after each drop,
   * plus a final capture summary.
   */
  function simulateMove(stonesIn, cellIdx) {
    const stones = stonesIn.slice();
    let hand = stones[cellIdx];
    stones[cellIdx] = 0;

    let cur = cellIdx;
    const steps = [];   // each step: { drop: idx, stones: snapshot }

    // Distribute stones one by one
    while (hand > 0) {
      cur = nextIdx(cur);
      stones[cur]++;
      hand--;
      steps.push({ action: 'drop', idx: cur, stones: stones.slice() });
    }

    // After distributing, check for capture chain
    const captures = [];
    while (true) {
      const ahead = nextIdx(cur);
      // Landing rules:
      // - If the cell ahead is empty and the cell after that is non-empty → capture
      // - If landed on a quan → capture the quan (handled differently)
      // For chain: if cur is now a cell with 0 stones (we just landed and it was empty before,
      //   but in the standard rule: we look at where the LAST stone landed)
      // Standard Ô Ăn Quan capture rule:
      //   After all stones distributed, if the cell AFTER the last placed stone is empty,
      //   skip it; if the cell AFTER that is non-empty, capture it. Continue until
      //   we hit two consecutive empty cells or a quan with 0 stones.
      // Actually: if the next cell(s) in sequence has a gap (empty cell), check the one after:
      //   - If that one is non-empty → capture it, continue from there
      //   - If it's also empty → stop
      const nextCell   = nextIdx(cur);
      const afterNext  = nextIdx(nextCell);

      if (stones[nextCell] === 0) {
        // Next is empty
        if (!isQuan(nextCell) && stones[afterNext] > 0) {
          // Capture the non-empty cell after the empty one
          captures.push({ idx: afterNext, amount: stones[afterNext] });
          steps.push({ action: 'capture', idx: afterNext, stones: stones.slice() });
          stones[afterNext] = 0;
          cur = afterNext;
          continue;
        } else {
          break; // stop
        }
      } else {
        // Next cell is non-empty: pick up and continue distributing
        cur = nextCell;
        hand = stones[cur];
        stones[cur] = 0;
        steps.push({ action: 'pickup', idx: cur, stones: stones.slice() });
        while (hand > 0) {
          cur = nextIdx(cur);
          stones[cur]++;
          hand--;
          steps.push({ action: 'drop', idx: cur, stones: stones.slice() });
        }
      }
    }

    return { finalStones: stones, steps, captures };
  }

  // ─── Check for game over ──────────────────────────────────────────────────
  function checkGameOver(st) {
    const p1Empty = P1_CELLS.every(i => st.stones[i] === 0);
    const p2Empty = P2_CELLS.every(i => st.stones[i] === 0);
    if (p1Empty && p2Empty) return true;
    // If one side is empty, the other player takes all remaining stones on their side
    if (p1Empty) {
      // P2 takes all their own remaining (already 0 on P1 side)
      return true;
    }
    if (p2Empty) {
      return true;
    }
    return false;
  }

  function finalizeGame(st) {
    // Remaining stones go to their respective owners
    P1_CELLS.forEach(i => { st.captured[1] += st.stones[i]; st.stones[i] = 0; });
    P2_CELLS.forEach(i => { st.captured[2] += st.stones[i]; st.stones[i] = 0; });
    // Quan stones go to whoever last touched them... actually in standard rules
    // quan stones go to the player who captures them. If uncaptured, split evenly or
    // they stay. Common rule: uncaptured quan stones are split evenly.
    const quanRemaining = st.stones[QUAN_LEFT] + st.stones[QUAN_RIGHT];
    st.captured[1] += Math.floor(quanRemaining / 2);
    st.captured[2] += Math.ceil(quanRemaining / 2);
    st.stones[QUAN_LEFT]  = 0;
    st.stones[QUAN_RIGHT] = 0;
  }

  // ─── AI (greedy) ──────────────────────────────────────────────────────────
  function aiPickMove(st) {
    const cells = st.currentPlayer === 1 ? P1_CELLS : P2_CELLS;
    let bestCell = -1, bestGain = -Infinity;
    for (const idx of cells) {
      if (st.stones[idx] === 0) continue;
      const { captures } = simulateMove(st.stones, idx);
      const gain = captures.reduce((s, c) => s + c.amount, 0);
      if (gain > bestGain) { bestGain = gain; bestCell = idx; }
    }
    if (bestCell === -1) {
      // pick first non-empty
      bestCell = cells.find(i => st.stones[i] > 0) ?? -1;
    }
    return bestCell;
  }

  // ─── Rendering ────────────────────────────────────────────────────────────
  let boardEl = null;
  let cellEls = {}; // idx → DOM element

  function injectStyles() {
    if (document.getElementById('oq-styles')) return;
    const style = document.createElement('style');
    style.id = 'oq-styles';
    style.textContent = `
      #oq-wrapper {
        display: flex; flex-direction: column; align-items: center;
        gap: 10px; padding: 8px; box-sizing: border-box;
        user-select: none; width: 100%;
      }
      .oq-score-bar {
        display: flex; gap: 20px; justify-content: center;
        font-weight: 700; font-size: 14px;
      }
      .oq-score-item { text-align: center; }
      .oq-score-val  { font-size: 22px; color: var(--accent, #f39c12); }
      .oq-score-label{ font-size: 11px; opacity: 0.7; }
      .oanquan-board {
        display: flex; flex-direction: column; gap: 6px;
        background: #6b3a1f; padding: 10px; border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        width: min(95vw, 500px);
      }
      .oanquan-row {
        display: flex; gap: 6px; align-items: center; justify-content: center;
      }
      .oq-cell {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; cursor: pointer;
        border-radius: 8px; background: #c8a96e;
        border: 2px solid #5a3a1a;
        transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
        min-width: 44px; min-height: 54px;
        flex: 1;
      }
      .oq-cell:hover:not(.disabled) {
        background: #dbb978;
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      }
      .oq-cell.active-player {
        border-color: #27ae60;
        box-shadow: 0 0 8px rgba(39,174,96,0.7);
      }
      .oq-cell.disabled  { opacity: 0.5; cursor: not-allowed; }
      .oq-cell.quan {
        min-width: 54px; min-height: 70px; background: #8b4513;
        border-color: #4a1e0a; flex: none;
      }
      .oq-cell.quan .oq-count  { font-size: 20px; color: #ffd700; }
      .oq-cell.quan .oq-label  { color: #ffd700; font-size: 9px; }
      .oq-count { font-size: 18px; font-weight: 900; color: #3a1a00; line-height: 1; }
      .oq-label { font-size: 9px; color: #5a3a1a; margin-top: 2px; opacity: 0.8; }
      .oq-cell.highlight-capture {
        animation: oq-pulse 0.4s ease-out;
      }
      @keyframes oq-pulse {
        0%   { background: #e74c3c; transform: scale(1.15); }
        100% { background: #c8a96e; transform: scale(1); }
      }
      .oq-p2-label, .oq-p1-label {
        font-size: 12px; font-weight: 700; opacity: 0.85;
        align-self: flex-start;
      }
    `;
    document.head.appendChild(style);
  }

  function buildBoard() {
    const modal = document.getElementById('modal-body');
    if (!modal) return;
    modal.innerHTML = '';
    injectStyles();

    const wrapper = document.createElement('div');
    wrapper.id = 'oq-wrapper';

    // Score bar
    const scoreBar = document.createElement('div');
    scoreBar.className = 'oq-score-bar';
    scoreBar.id = 'oq-score-bar';
    wrapper.appendChild(scoreBar);

    // Board
    boardEl = document.createElement('div');
    boardEl.className = 'oanquan-board';

    // P2 label
    const p2label = document.createElement('div');
    p2label.className = 'oq-p2-label';
    p2label.textContent = '👤 Người 2 (Đen)';
    boardEl.appendChild(p2label);

    // Top row: quan-left | p2 cells (indices 12..7 visually left→right) | quan-right
    // P2 cells: index 12=leftmost top, 7=rightmost top
    const topRow = document.createElement('div');
    topRow.className = 'oanquan-row';
    topRow.appendChild(makeCellEl(QUAN_LEFT));
    [12,11,10,9,8,7].forEach(i => topRow.appendChild(makeCellEl(i)));
    topRow.appendChild(makeCellEl(QUAN_RIGHT));
    boardEl.appendChild(topRow);

    // Bottom row: quan-left | p1 cells 0..5 | quan-right
    const botRow = document.createElement('div');
    botRow.className = 'oanquan-row';
    botRow.appendChild(makeCellEl(QUAN_LEFT, true)); // placeholder (don't double-add)
    [0,1,2,3,4,5].forEach(i => botRow.appendChild(makeCellEl(i)));
    botRow.appendChild(makeCellEl(QUAN_RIGHT, true)); // placeholder
    boardEl.appendChild(botRow);

    // P1 label
    const p1label = document.createElement('div');
    p1label.className = 'oq-p1-label';
    p1label.textContent = '👤 Người 1 (Đỏ)';
    boardEl.appendChild(p1label);

    wrapper.appendChild(boardEl);
    modal.appendChild(wrapper);

    // Quan cells appear in both rows visually; we use real cells only in topRow,
    // and in botRow we add invisible spacers. Re-build cellEls properly.
    // Actually, let's use a cleaner approach: separate quan cell elements per row
    // and sync their display. We'll have oq-quan-left-top, oq-quan-right-top,
    // oq-quan-left-bot, oq-quan-right-bot.
    renderBoard();
  }

  // Track quan elements separately since they span both rows visually
  const quanTopEls  = {};
  const quanBotEls  = {};

  function makeCellEl(idx, isBottom) {
    const div = document.createElement('div');
    div.className = 'oq-cell';
    if (isQuan(idx)) {
      div.classList.add('quan');
      if (isBottom) {
        // bottom row quan: just a visual spacer (no click, synced display)
        div.style.visibility = 'hidden';
        div.style.pointerEvents = 'none';
        if (idx === QUAN_LEFT)  quanBotEls[idx] = div;
        else                    quanBotEls[idx] = div;
      } else {
        div.addEventListener('click', () => onCellClick(idx));
        cellEls[idx] = div;
      }
    } else {
      div.addEventListener('click', () => onCellClick(idx));
      cellEls[idx] = div;
    }
    div.dataset.idx = idx;
    return div;
  }

  function renderBoard() {
    if (!state) return;
    const isP1Turn = state.currentPlayer === 1;
    const activeCells = isP1Turn ? P1_CELLS : P2_CELLS;

    for (let i = 0; i < TOTAL_CELLS; i++) {
      const el = cellEls[i];
      if (!el) continue;
      const count = state.stones[i];
      const isActive = activeCells.includes(i) && count > 0 && !state.animating && !state.gameOver;

      // Update content
      const label = isQuan(i) ? '官' : ownerOf(i) === 1 ? 'nhỏ' : 'nhỏ';
      el.innerHTML = `<span class="oq-count">${count}</span><span class="oq-label">${isQuan(i) ? 'quan' : 'nhỏ'}</span>`;

      el.classList.toggle('active-player', isActive);
      el.classList.toggle('disabled', !isActive || state.animating || state.gameOver);
    }

    // Update score bar
    updateScoreBar();

    // Update status
    if (!state.gameOver && typeof GameModal !== 'undefined') {
      const pName = state.currentPlayer === 1 ? '🔴 Người 1' : '⚫ Người 2';
      GameModal.setStatus(`Lượt: ${pName}`);
    }
  }

  function updateScoreBar() {
    const bar = document.getElementById('oq-score-bar');
    if (!bar || !state) return;
    bar.innerHTML = `
      <div class="oq-score-item">
        <div class="oq-score-val">${state.captured[1]}</div>
        <div class="oq-score-label">🔴 Người 1</div>
      </div>
      <div class="oq-score-item">
        <div class="oq-score-val">${state.captured[2]}</div>
        <div class="oq-score-label">⚫ Người 2</div>
      </div>
    `;
  }

  // ─── Interaction ──────────────────────────────────────────────────────────
  function onCellClick(idx) {
    if (!state || state.gameOver || state.animating) return;
    if (state.mode === 'ai' && state.currentPlayer === 2) return;

    const owner = ownerOf(idx);
    if (owner !== state.currentPlayer) return;
    if (state.stones[idx] === 0) return;

    doMove(idx);
  }

  function doMove(cellIdx) {
    const { finalStones, steps, captures } = simulateMove(state.stones, cellIdx);

    // Animate steps
    state.animating = true;
    renderBoard();

    let i = 0;
    function runStep() {
      if (i >= steps.length) {
        // Animation done: apply final state
        state.stones = finalStones;
        state.animating = false;

        // Attribute captures to current player
        const gained = captures.reduce((s, c) => s + c.amount, 0);
        if (gained > 0) {
          state.captured[state.currentPlayer] += gained;
          if (typeof SoundManager !== 'undefined') SoundManager.play('eat');
          if (typeof UIManager !== 'undefined') UIManager.toast(`+${gained} quân!`);
        } else {
          if (typeof SoundManager !== 'undefined') SoundManager.play('move');
        }

        // Check game over
        if (checkGameOver(state)) {
          finalizeGame(state);
          endGame();
          return;
        }

        // Switch turn
        state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
        renderBoard();

        // AI move
        if (state.mode === 'ai' && state.currentPlayer === 2 && !state.gameOver) {
          setTimeout(doAiMove, 600);
        }
        return;
      }

      const step = steps[i++];
      // Flash capture cells
      if (step.action === 'capture') {
        const el = cellEls[step.idx];
        if (el) {
          el.classList.add('highlight-capture');
          setTimeout(() => el.classList.remove('highlight-capture'), 400);
        }
      }
      // Update stones display mid-animation
      state.stones = step.stones;
      renderBoard();
      state.animating = true; // keep animating flag during render
      setTimeout(runStep, 60);
    }

    runStep();
  }

  function doAiMove() {
    if (!state || state.gameOver || state.animating) return;
    const cell = aiPickMove(state);
    if (cell < 0) {
      // No moves for AI: game over
      finalizeGame(state);
      endGame();
      return;
    }
    doMove(cell);
  }

  function endGame() {
    state.gameOver = true;
    const p1 = state.captured[1], p2 = state.captured[2];
    let winner, message;
    if (p1 > p2) {
      winner = '🔴 Người 1';
      message = `Người 1 thắng! (${p1} vs ${p2})`;
    } else if (p2 > p1) {
      winner = '⚫ Người 2';
      message = `Người 2 thắng! (${p2} vs ${p1})`;
    } else {
      winner = 'Hòa';
      message = `Hòa! Cả hai có ${p1} quân.`;
    }

    if (typeof GameModal !== 'undefined') GameModal.setStatus(message);
    if (typeof UIManager !== 'undefined') {
      UIManager.showWin({
        gameId: 'oanquan',
        winner,
        message,
      });
    }
    renderBoard();
  }

  // ─── Registration ─────────────────────────────────────────────────────────
  if (typeof GameRegistry !== 'undefined') {
    GameRegistry.register({
      id: 'oanquan',
      icon: '🟣',
      name: 'Ô Ăn Quan',
      modes: [
        { id: 'pvp', label: '👥 2 Người' },
        { id: 'ai',  label: '🤖 vs Máy'  },
      ],
      startMode(modeId) {
        state = newState(modeId);
        cellEls = {};
        buildBoard();
      },
      cleanup() {
        state    = null;
        boardEl  = null;
        cellEls  = {};
      },
    });
  }
})();
