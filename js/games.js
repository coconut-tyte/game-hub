// Mỗi game: { guide, start(el, api) -> hàm dọn dẹp }. api.setHud(text), api.finish(score, won)
window.Games = {};

// ---- Bắn Súng Ngộ Nghĩnh ----
Games.fps = {
  guide: 'Bấm vào mục tiêu xuất hiện ngẫu nhiên trong 15 giây. 🎯 được +1, ⭐ vàng được +3. Đạt 10 điểm là thắng.',
  start(el, api, lv = 0) {
    el.style.height = '300px'; let score = 0, t = [15, 15, 20][lv];
    api.setHud('Điểm: 0 · Còn 15s');
    const spawn = setInterval(() => {
      const b = document.createElement('button'), gold = Math.random() < .15;
      b.className = 'target'; b.textContent = gold ? '⭐' : '🎯';
      b.style.left = Math.random() * 85 + '%'; b.style.top = Math.random() * 80 + '%';
      b.onclick = () => { score += gold ? 3 : 1; b.remove(); api.setHud(`Điểm: ${score} · Còn ${t}s`); };
      el.append(b); setTimeout(() => b.remove(), [1500, 1100, 800][lv]);
    }, [600, 450, 320][lv]);
    const clock = setInterval(() => {
      api.setHud(`Điểm: ${score} · Còn ${--t}s`);
      if (t <= 0) api.finish(Math.round(score * 10 * (1 + (api.perks.score_boost || 0) / 100)), score >= [8, 10, 14][lv]);
    }, 1000);
    return () => { clearInterval(spawn); clearInterval(clock); };
  }
};

// ---- Dò Mìn: Thợ săn kho báu ----
Games.minesweeper = {
  guide: 'Chạm ô để mở; con số là số mìn xung quanh. Bật 🚩 rồi chạm để cắm cờ. Trong ô an toàn có giấu vài viên 💎, mỗi viên +100 điểm. Có vài ô bẫy 🌀: mở trúng bị trừ 50 điểm và bàn cờ đổi màu 4 giây. Mở hết ô an toàn để thắng, mở trúng 💣 là thua.',
  start(el, api, lv = 0) {
    const [N, MINES, TREAS, TRAPS] = [[8, 8, 4, 1], [9, 12, 5, 2], [10, 18, 6, 3]][lv], t0 = Date.now();
    let pen = 0, placed = false, flag = false, gems = 0, open = 0, over = false;
    el.innerHTML = '<div style="margin-bottom:.5rem"><button class="btn alt" id="fl">🚩 Cắm cờ: tắt</button></div><div class="ms"></div>';
    const g = el.querySelector('.ms'); g.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    el.querySelector('#fl').onclick = (e) => { flag = !flag; e.target.textContent = '🚩 Cắm cờ: ' + (flag ? 'bật' : 'tắt'); };
    const cells = Array.from({ length: N * N }, (_, i) => ({ i, m: 0, t: 0, x: 0, r: 0, f: 0, n: 0 }));
    const nb = (i) => { const x = i % N, y = i / N | 0, o = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const a = x + dx, b = y + dy; if ((dx || dy) && a >= 0 && b >= 0 && a < N && b < N) o.push(b * N + a); }
      return o; };
    let lpT = null, lp = false;
    const flagIt = (c) => { if (over || c.r) return; c.f ^= 1; draw(c); };
    const btns = cells.map((c) => { const b = document.createElement('button'); b.className = 'cell';
      b.onpointerdown = () => { lp = false; lpT = setTimeout(() => { lp = true; navigator.vibrate?.(20); flagIt(c); }, 420); };
      b.onpointerup = b.onpointerleave = () => clearTimeout(lpT);
      b.oncontextmenu = (e) => { e.preventDefault(); flagIt(c); };
      b.onclick = () => { if (lp) { lp = false; return; } tap(c); };
      g.append(b); return b; });
    const draw = (c) => { const b = btns[c.i];
      b.textContent = c.f && !c.r ? '🚩' : !c.r ? '' : c.m ? '💣' : (c.t ? '💎' : c.x ? '🌀' : '') + (c.n || '');
      b.className = 'cell' + (c.r ? ' open' : '') + (c.r && c.n && !c.m ? ' n' + c.n : ''); };
    const hud = () => api.setHud(`💎 ${gems}/${TREAS} · Đã mở ${open}/${N * N - MINES}`);
    hud();
    function place(safe) {
      const away = [safe, ...nb(safe)];
      const pool = cells.filter((c) => !away.includes(c.i)).sort(() => Math.random() - .5);
      pool.slice(0, MINES).forEach((c) => c.m = 1);
      pool.slice(MINES, MINES + TREAS).forEach((c) => c.t = 1);
      pool.slice(MINES + TREAS, MINES + TREAS + TRAPS).forEach((c) => c.x = 1);
      cells.forEach((c) => c.n = nb(c.i).filter((j) => cells[j].m).length);
    }
    function reveal(c, d = 0) {
      if (c.r) return; c.f = 0; c.r = 1; open++; if (c.t) gems++;
      if (c.x) { pen += 50; g.style.filter = 'hue-rotate(160deg)'; setTimeout(() => g.style.filter = '', 4000); }
      draw(c); btns[c.i].classList.add('pop'); btns[c.i].style.animationDelay = Math.min(d, 12) * 35 + 'ms';
      if (!c.n) nb(c.i).forEach((j) => !cells[j].m && reveal(cells[j], d + 1));
    }
    function tap(c) {
      if (over || c.r) return;
      if (flag) { c.f ^= 1; return draw(c); }
      if (c.f) return;
      if (!placed) { place(c.i); placed = true; }
      if (c.m) { over = true; g.classList.add('shake'); cells.filter((x) => x.m).forEach((x) => { x.r = 1; draw(x); }); return setTimeout(() => api.finish(Math.max(0, gems * 100 - pen), false), 900); }
      reveal(c); hud();
      if (open === N * N - MINES) { over = true; api.finish(Math.max(0, 500 + gems * 100 + Math.max(0, 300 - Math.round((Date.now() - t0) / 1000)) - pen), true); }
    }
    return () => {};
  }
};

// ---- Flappy Bird: Cánh én thời gian ----
Games.flappy = {
  guide: 'Chạm vào màn hình (hoặc nhấn Space) để vỗ cánh. Mỗi ống đi qua +1 điểm. Nhặt 🛡️ để chống 1 lần va chạm, 🪶 để giảm trọng lực 5 giây, ⚡ để tăng tốc 3 giây (mỗi ống được +2 điểm). Đạt điểm mục tiêu (8/10/12 tùy màn) là thắng.',
  start(el, api, lv = 0) {
    const GAP = [64, 55, 48][lv], SP = [2.2, 2.5, 3][lv], GOAL = [8, 10, 12][lv];
    el.innerHTML = '<canvas width="320" height="420"></canvas>';
    const cv = el.firstChild, c = cv.getContext('2d');
    let fast = 0, y = 200, v = 0, f = 0, score = 0, shield = api.perks.extra_life ? 1 : 0, low = 0, inv = 0, raf, pipes = [], items = [];
    const flap = () => { v = -6.2; };
    const key = (e) => { if (e.code === 'Space') { e.preventDefault(); flap(); } };
    cv.onpointerdown = flap; addEventListener('keydown', key);
    const stop = () => { cancelAnimationFrame(raf); removeEventListener('keydown', key); };
    function loop() {
      f++; if (fast > 0) fast--; const sp = fast > 0 ? SP * 1.6 : SP; v += low > 0 ? .22 : .4; y += v; if (low > 0) low--; if (inv > 0) inv--;
      if (f % 90 === 1) {
        const gy = 110 + Math.random() * 190; pipes.push({ x: 320, gy, p: 0 });
        if (Math.random() < .45) items.push({ x: 380, y: gy, k: ['🛡️', '🪶', '⚡'][Math.random() * 3 | 0] });
      }
      pipes.forEach((p) => p.x -= sp); items.forEach((i) => i.x -= sp);
      pipes = pipes.filter((p) => p.x > -50); items = items.filter((i) => i.x > -20);
      let hit = y < 10 || y > 410;
      pipes.forEach((p) => {
        if (!p.p && p.x + 44 < 60) { p.p = 1; score += fast > 0 ? 2 : 1; }
        if (72 > p.x && 48 < p.x + 44 && (y - 12 < p.gy - GAP || y + 12 > p.gy + GAP)) hit = true;
      });
      items = items.filter((i) => {
        if (Math.abs(i.x - 60) < 24 && Math.abs(i.y - y) < 24) { if (i.k === '🛡️') shield = 1; else if (i.k === '🪶') low = 300; else fast = 180; score++; return false; }
        return true; });
      if (hit && inv <= 0) {
        if (!shield) { stop(); return api.finish(score * 10, score >= GOAL); }
        shield = 0; inv = 60; v = -4; y = Math.min(Math.max(y, 40), 380);
      }
      c.fillStyle = '#8fd3ff'; c.fillRect(0, 0, 320, 420);
      c.fillStyle = '#22b07d';
      pipes.forEach((p) => { c.fillRect(p.x, 0, 44, p.gy - GAP); c.fillRect(p.x, p.gy + GAP, 44, 420); });
      c.font = '24px serif'; c.textAlign = 'center';
      items.forEach((i) => c.fillText(i.k, i.x, i.y + 8));
      c.fillStyle = '#fff7'; pipes.forEach((p) => { c.fillRect(p.x + 4, 0, 6, p.gy - GAP); c.fillRect(p.x + 4, p.gy + GAP, 6, 420); });
      c.fillStyle = '#000'; c.font = '28px serif'; c.save(); c.translate(60, y); c.rotate(Math.max(-.5, Math.min(1, v / 10))); c.fillText('🐤', 0, 10); c.restore();
      if (shield) { c.strokeStyle = '#5a9fe0'; c.lineWidth = 3; c.beginPath(); c.arc(60, y, 20, 0, 7); c.stroke(); }
      api.setHud(`Điểm: ${score}${low > 0 ? ' · 🪶 nhẹ' : ''}${fast > 0 ? ' · ⚡' : ''}`);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return stop;
  }
};

// ---- Pikachu: Đua thời gian hỗn loạn ----
Games.pikachu = {
  guide: 'Chọn 2 hình giống nhau mà nối được bằng đường tối đa 2 lần rẽ (không đi xuyên ô khác) để xóa chúng. Xóa hết 24 cặp trong 120 giây để thắng. Cứ 3 cặp bạn nhận ngẫu nhiên 🧊 Đóng băng (dừng giờ 5 giây) hoặc 🔀 Xáo trộn. Bạn có sẵn 1 lượt xáo trộn.',
  start(el, api, lv = 0) {
    const W = 10, H = 8, ICONS = ['🐭','🐱','🐰','🦊','🐻','🐼','🐸','🐵','🦄','🐙','🐧','🐢'];
    const g = Array(W * H).fill(null), D = [[1,0],[-1,0],[0,1],[0,-1]];
    const pool = ICONS.flatMap((i) => [i, i, i, i]).sort(() => Math.random() - .5);
    for (let y = 1; y <= 6; y++) for (let x = 1; x <= 8; x++) g[y * W + x] = pool.pop();
    let lock = false, sel = null, time = [150, 120, 90][lv] + (api.perks.bonus_time || 0), frozen = 0, pairs = 0, over = false; const items = { freeze: 0, shuffle: [2, 1, 0][lv] };
    el.innerHTML = '<div style="margin-bottom:.5rem"><button class="btn alt" id="fz"></button> <button class="btn alt" id="sh"></button></div><div class="pk"></div>';
    const board = el.querySelector('.pk'), btns = {};
    for (let y = 1; y <= 6; y++) for (let x = 1; x <= 8; x++) {
      const i = y * W + x, b = document.createElement('button'); b.className = 'cell'; b.onclick = () => tap(i); board.append(b); btns[i] = b;
    }
    const draw = () => {
      Object.keys(btns).forEach((i) => { btns[i].textContent = g[i] || ''; btns[i].style.visibility = g[i] ? 'visible' : 'hidden'; btns[i].classList.toggle('sel', sel == i); });
      el.querySelector('#fz').textContent = `🧊 x${items.freeze}`; el.querySelector('#sh').textContent = `🔀 x${items.shuffle}`;
      api.setHud(`Cặp còn lại: ${24 - pairs} · ⏱ ${time}s${frozen ? ' (đóng băng)' : ''}`);
    };
    function linked(a, b) {
      const q = [], seen = new Map(), bx = b;
      D.forEach((_, k) => q.push([a % W, a / W | 0, k, 0]));
      while (q.length) {
        const [x, y, k, t] = q.shift(), nx = x + D[k][0], ny = y + D[k][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx; if (ni === bx) return true; if (g[ni]) continue;
        D.forEach((_, k2) => { const t2 = t + (k2 !== k ? 1 : 0), key = ni * 4 + k2;
          if (t2 > 2 || (seen.has(key) && seen.get(key) <= t2)) return; seen.set(key, t2); q.push([nx, ny, k2, t2]); });
      }
      return false;
    }
    function tap(i) {
      if (over || lock || !g[i]) return;
      if (sel === null || sel === i) { sel = sel === i ? null : i; return draw(); }
      if (g[sel] === g[i] && linked(sel, i)) {
        const a = sel; sel = null; lock = true;
        [a, i].forEach((k) => btns[k].classList.add('vanish'));
        setTimeout(() => {
          g[a] = g[i] = null; lock = false; pairs++;
          if (pairs % 3 === 0) items[Math.random() < .5 ? 'freeze' : 'shuffle']++;
          if (pairs === 24) { over = true; return api.finish(480 + time * 5, true); }
          draw();
        }, 280);
        return draw();
      }
      if (g[sel] === g[i]) { [sel, i].forEach((k) => { btns[k].classList.add('wrong'); setTimeout(() => btns[k].classList.remove('wrong'), 400); }); sel = i; }
      else sel = i;
      draw();
    }
    el.querySelector('#fz').onclick = () => { if (items.freeze > 0 && !over) { items.freeze--; frozen = 5; draw(); } };
    el.querySelector('#sh').onclick = () => {
      if (items.shuffle < 1 || over) return; items.shuffle--; sel = null;
      const idx = Object.keys(btns).map(Number).filter((i) => g[i]), vals = idx.map((i) => g[i]).sort(() => Math.random() - .5);
      idx.forEach((i, n) => g[i] = vals[n]); draw();
    };
    draw();
    const clock = setInterval(() => { if (frozen > 0) frozen--; else time--; draw(); if (time <= 0) { over = true; api.finish(pairs * 20, false); } }, 1000);
    return () => clearInterval(clock);
  }
};

// ---- Ô Ăn Quan Vũ Trụ ----
Games.oanquan = {
  guide: 'Bàn 12 ô: 2 ô Quan (🐘, trị giá 10 điểm) ở hai đầu, mỗi bên 5 ô Dân có 5 viên. Chọn một ô Dân của bạn rồi chọn chiều rải: mỗi ô rải 1 viên. Rải xong, nếu ô kế tiếp có dân thì bốc lên rải tiếp; nếu ô kế tiếp trống và ô sau nó có quân thì bạn ăn ô đó. Ô ⭐ Thần Tài nhân đôi điểm khi bị ăn. Hết cả 2 Quan là kết thúc; ai nhiều điểm hơn thắng. Hết dân trên bàn mình thì trả 5 điểm để rải lại.',
  start(el, api, lv = 0) {
    const N = 12, GOLD = [3, 9], mod = (i) => (i + N) % N;
    let cells = Array.from({ length: N }, (_, i) => ({ d: i % 6 ? 5 : 0, q: i % 6 ? 0 : 1 }));
    const sc = [0, 0], own = (w) => w ? [7,8,9,10,11] : [1,2,3,4,5];
    let sel = null, busy = false, over = false;
    el.innerHTML = '<div class="oq"></div><div id="dir" style="margin-top:.6rem;min-height:2.4rem"></div>';
    const bd = el.querySelector('.oq'), dirEl = el.querySelector('#dir');
    function sim(cs, i, dir, rec) {
      cs = cs.map((c) => ({ ...c })); const snap = (hi, cp = -1) => rec && rec.push({ cs: cs.map((c) => ({ ...c })), hi, cp });
      let gain = 0, pos = i, hand = cs[i].d; cs[i].d = 0; snap(i);
      for (let guard = 0; guard < 100; guard++) {
        while (hand > 0) { pos = mod(pos + dir); cs[pos].d++; hand--; snap(pos); }
        let nx = mod(pos + dir);
        if (cs[nx].q) break;
        if (cs[nx].d > 0) { pos = nx; hand = cs[nx].d; cs[nx].d = 0; snap(nx); continue; }
        let cap = mod(nx + dir);
        while (!cs[nx].d && !cs[nx].q && (cs[cap].d || cs[cap].q)) {
          let v = cs[cap].d + (cs[cap].q ? 10 : 0); if (GOLD.includes(cap)) v *= 2;
          gain += v; cs[cap] = { d: 0, q: 0 }; snap(cap, cap); nx = mod(cap + dir); cap = mod(nx + dir);
        }
        break;
      }
      return { cs, gain };
    }
    function render(st = cells, hi = -1, cp = -1) {
      bd.innerHTML = '';
      st.forEach((c, i) => {
        const b = document.createElement('button'); b.className = 'cell' + (sel === i ? ' open' : '') + (i === hi ? ' hi' : '') + (i === cp ? ' cap' : '');
        b.textContent = (GOLD.includes(i) ? '⭐' : '') + (c.q ? '🐘' : '') + c.d;
        if (i === 0) b.style.cssText = 'grid-column:1;grid-row:1/3';
        else if (i === 6) b.style.cssText = 'grid-column:7;grid-row:1/3';
        else if (i < 6) b.style.cssText = `grid-column:${i + 1};grid-row:2`;
        else b.style.cssText = `grid-column:${13 - i};grid-row:1`;
        if (own(0).includes(i) && c.d > 0 && !busy && !over) b.onclick = () => { sel = i; render();
          dirEl.innerHTML = '<button class="btn alt" id="l">↺ Ngược kim</button> <button class="btn alt" id="r">↻ Cùng kim</button>';
          dirEl.querySelector('#l').onclick = () => play(0, i, 1); dirEl.querySelector('#r').onclick = () => play(0, i, -1); };
        bd.append(b);
      });
      api.setHud(`Bạn: ${sc[0]} · Máy: ${sc[1]}`);
    }
    function refill(w) {
      if (own(w).some((i) => cells[i].d)) return true;
      if (sc[w] < 5) return false; sc[w] -= 5; own(w).forEach((i) => cells[i].d = 1); return true;
    }
    function end() {
      over = true; own(0).forEach((i) => sc[0] += cells[i].d); own(1).forEach((i) => sc[1] += cells[i].d);
      render(); api.finish(sc[0] * 10, sc[0] > sc[1]);
    }
    async function play(w, i, dir) {
      const rec = [], r = sim(cells, i, dir, rec); sel = null; dirEl.innerHTML = ''; busy = true;
      for (const f of rec) { if (over) return; render(f.cs, f.hi, f.cp); await new Promise((ok) => setTimeout(ok, f.cp >= 0 ? 480 : 240)); }
      cells = r.cs; sc[w] += r.gain;
      if (!cells[0].q && !cells[6].q) return end();
      const nxt = 1 - w; if (!refill(nxt)) return end();
      busy = w === 0; render();
      if (w === 0) setTimeout(ai, 500);
    }
    function ai() {
      if (over) return;
      const opts = own(1).filter((i) => cells[i].d).flatMap((i) => [1, -1].map((dir) => ({ i, dir, gain: sim(cells, i, dir).gain })));
      const val = (o) => { if (lv === 0) return Math.random(); if (lv === 1) return o.gain;
        const r = sim(cells, o.i, o.dir), reps = own(0).filter((j) => r.cs[j].d).flatMap((j) => [1, -1].map((d2) => sim(r.cs, j, d2).gain));
        return o.gain - Math.max(0, ...reps); };
      const vals = opts.map(val), best = Math.max(...vals), pick = opts.filter((o, k) => vals[k] === best);
      const m = pick[Math.random() * pick.length | 0]; busy = false; play(1, m.i, m.dir);
    }
    render();
    return () => { over = true; };
  }
};

// ---- Mario Mini: Vương quốc kẹo ----
Games.mario = {
  guide: '← → (hoặc A D) để chạy, Space hoặc ↑ để nhảy; trên điện thoại dùng 3 nút bên dưới. Nhảy lên đầu 🐛 để diệt (+20). Nhặt 🪙 (+10). Nhặt 🍄 để biến hình 8 giây: nhảy cao hơn và húc bay kẻ địch. Chạm 🚩 cuối màn để thắng. Bạn có 3 mạng.',
  start(el, api, lv = 0) {
    const LV = [
      { C: 70, gaps: [14,15,32,33,34,50,51], plats: [[8,7,3],[18,7,4],[24,5,3],[38,7,4],[44,5,3],[56,6,4]], foes: [11,28,41,53] },
      { C: 80, gaps: [12,13,28,29,30,45,46,47,62,63], plats: [[6,7,3],[16,6,4],[22,4,3],[34,7,4],[40,5,4],[52,6,3],[58,4,4],[68,6,3]], foes: [10,24,36,50,60,72] },
      { C: 90, gaps: [11,12,13,26,27,28,29,43,44,45,58,59,60,61,74,75], plats: [[5,7,3],[15,6,3],[21,4,3],[32,7,3],[38,5,3],[48,6,3],[55,4,3],[66,6,4],[78,5,3]], foes: [9,20,33,40,52,64,70,82] }];
    const L = LV[lv], T = 20, R = 12, C = L.C, VW = 480, VH = 240;
    el.innerHTML = `<canvas width="${VW}" height="${VH}"></canvas><div class="pad"><button class="btn alt" data-k="l">◀</button><button class="btn alt" data-k="j">⤒ Nhảy</button><button class="btn alt" data-k="r">▶</button></div>`;
    const cv = el.firstChild, c = cv.getContext('2d'), k = { l: 0, r: 0, j: 0 };
    const map = Array.from({ length: R }, () => Array(C).fill(' '));
    for (let x = 0; x < C; x++) if (!L.gaps.includes(x)) map[10][x] = map[11][x] = '#';
    L.plats.forEach(([x, y, l]) => { for (let i = 0; i < l; i++) map[y][x + i] = '#'; });
    let coins = L.plats.flatMap(([x, y, l]) => Array.from({ length: l }, (_, k) => ({ x: (x + k) * T + 4, y: (y - 1) * T + 4 })));
    const sp0 = L.plats[2]; let shroom = { x: (sp0[0] + 1) * T, y: (sp0[1] - 2) * T, on: 1 };
    let foes = L.foes.map((x) => ({ x: x * T, y: 9 * T + 2, d: -1 }));
    const FLAG = (C - 3) * T, p = { x: 40, y: 100, vy: 0, g: 0 }, W = 14, H = 18;
    let lives = 3 + (api.perks.extra_life || 0), score = 0, power = 0, inv = 0, raf, safe = { x: 40, y: 100 };
    const solid = (x, y) => { const tx = x / T | 0, ty = y / T | 0; return ty >= 0 && ty < R && tx >= 0 && tx < C && map[ty][tx] === '#'; };
    const hit = (x, y) => solid(x, y) || solid(x + W, y) || solid(x, y + H) || solid(x + W, y + H);
    const keyMap = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'j', KeyW: 'j', Space: 'j' };
    const kd = (e) => { const m = keyMap[e.code]; if (m) { e.preventDefault(); k[m] = 1; } };
    const ku = (e) => { const m = keyMap[e.code]; if (m) k[m] = 0; };
    addEventListener('keydown', kd); addEventListener('keyup', ku);
    el.querySelectorAll('[data-k]').forEach((b) => { const m = b.dataset.k;
      b.onpointerdown = () => k[m] = 1; b.onpointerup = b.onpointerleave = b.onpointercancel = () => k[m] = 0; });
    const stop = () => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
    const over = (a, b, s) => Math.abs(a.x - b.x) < s && Math.abs(a.y - b.y) < s;
    function hurt() {
      if (inv > 0) return; lives--; inv = 120; power = 0;
      if (lives <= 0) { stop(); return api.finish(score, false); }
      p.x = Math.max(20, safe.x - 24); p.y = safe.y - 4; p.vy = 0;
    }
    function loop() {
      const vx = (k.r - k.l) * 2.6;
      p.vy = Math.min(p.vy + .45, 9);
      if (k.j && p.g) { p.vy = power > 0 ? -9 : -7.6; p.g = 0; }
      if (!hit(p.x + vx, p.y)) p.x += vx;
      if (!hit(p.x, p.y + p.vy)) { p.y += p.vy; p.g = 0; } else { if (p.vy > 0) { p.g = 1; safe = { x: p.x, y: p.y }; } p.vy = 0; }
      if (p.y > VH + 20) hurt();
      if (power > 0) power--; if (inv > 0) inv--;
      coins = coins.filter((q) => { if (over({ x: p.x, y: p.y }, q, 16)) { score += 10; return false; } return true; });
      if (shroom.on && over(p, shroom, 18)) { shroom.on = 0; power = 480; }
      foes.forEach((f) => {
        const ahead = f.x + (f.d > 0 ? 16 : -1), ground = solid(ahead, f.y + 20), wall = solid(ahead, f.y + 6);
        if (!ground || wall) f.d *= -1; else f.x += f.d * .8;
        if (f.dead) return;
        if (over({ x: p.x, y: p.y }, f, 16)) {
          if (p.vy > 0 && p.y + H < f.y + 12) { f.dead = 1; p.vy = -5; score += 20; }
          else if (power > 0) { f.dead = 1; score += 20; }
          else hurt();
        }
      });
      foes = foes.filter((f) => !f.dead);
      if (p.x > FLAG) { stop(); return api.finish(score + lives * 50 + 200, true); }
      const cam = Math.max(0, Math.min(p.x - VW / 2, C * T - VW));
      c.fillStyle = '#8fd3ff'; c.fillRect(0, 0, VW, VH);
      for (let y = 0; y < R; y++) for (let x = (cam / T | 0); x < (cam + VW) / T + 1; x++) if (map[y]?.[x] === '#') { c.fillStyle = y > 9 ? '#a8581c' : '#22b07d'; c.fillRect(x * T - cam, y * T, T, T); c.fillStyle = '#fff6'; c.fillRect(x * T - cam, y * T, T, 3); c.fillStyle = '#0002'; c.fillRect(x * T - cam, y * T + T - 3, T, 3); }
      c.fillStyle = '#000'; c.font = '16px serif'; c.textAlign = 'left';
      coins.forEach((q) => c.fillText('🪙', q.x - cam, q.y + 14));
      if (shroom.on) c.fillText('🍄', shroom.x - cam, shroom.y + 14);
      foes.forEach((f) => c.fillText('🐛', f.x - cam, f.y + 16));
      c.fillText('🚩', FLAG - cam, 9 * T + 16);
      if (inv % 8 < 5) { c.font = power > 0 ? '28px serif' : '20px serif'; c.fillText('🐥', p.x - cam - 2, p.y + 18); }
      api.setHud(`Điểm: ${score} · ❤️ ${lives}${power > 0 ? ' · 🍄 biến hình' : ''}`);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return stop;
  }
};

// ---- Cờ Vua & Cờ Tướng (đấu với máy) + Nước đi ma thuật ----
(() => {
  const G = { chess: { W: 8, H: 8 }, xq: { W: 9, H: 10 } };
  const CH = ['rnbqkbnr','pppppppp','........','........','........','........','PPPPPPPP','RNBQKBNR'];
  const XQ = ['rheakaehr','.........','.c.....c.','p.p.p.p.p','.........','.........','P.P.P.P.P','.C.....C.','.........','RHEAKAEHR'];
  const GL = { K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙', k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟\uFE0E',
    xK:'帥',xA:'仕',xE:'相',xH:'傌',xR:'俥',xC:'炮',xP:'兵', xk:'將',xa:'士',xe:'象',xh:'馬',xr:'車',xc:'砲',xp:'卒' };
  const VAL = { chess: { p:1,n:3,b:3,r:5,q:9,k:1000 }, xq: { p:1,h:4,e:2,a:2,r:9,c:4.5,k:1000 } };
  const OR = [[1,0],[-1,0],[0,1],[0,-1]], DG = [[1,1],[1,-1],[-1,1],[-1,-1]];
  const low = (c) => c.toLowerCase(), mine = (c, s) => !!c && ((c === c.toUpperCase()) === (s === 0));
  const inb = (g, x, y) => x >= 0 && y >= 0 && x < G[g].W && y < G[g].H;

  function gen(b, s, g) {
    const out = [], { W, H } = G[g];
    const add = (x, y, tx, ty) => { if (inb(g, tx, ty) && !mine(b[ty][tx], s)) out.push([x, y, tx, ty]); };
    const slide = (x, y, ds) => { for (const [dx, dy] of ds) { let tx = x + dx, ty = y + dy;
      while (inb(g, tx, ty)) { if (b[ty][tx]) { if (!mine(b[ty][tx], s)) out.push([x, y, tx, ty]); break; } out.push([x, y, tx, ty]); tx += dx; ty += dy; } } };
    const pal = (tx, ty) => tx >= 3 && tx <= 5 && (s ? ty <= 2 : ty >= 7);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = b[y][x]; if (!mine(ch, s)) continue; const p = low(ch);
      if (g === 'chess') {
        if (p === 'p') { const d = s ? 1 : -1, st = s ? 1 : 6;
          if (inb(g, x, y + d) && !b[y + d][x]) { out.push([x, y, x, y + d]); if (y === st && !b[y + 2 * d][x]) out.push([x, y, x, y + 2 * d]); }
          for (const dx of [-1, 1]) if (inb(g, x + dx, y + d) && b[y + d][x + dx] && !mine(b[y + d][x + dx], s)) out.push([x, y, x + dx, y + d]);
        } else if (p === 'n') { for (const [u, v] of [[1,2],[2,1]]) for (const sx of [-1,1]) for (const sy of [-1,1]) add(x, y, x + u * sx, y + v * sy); }
        else if (p === 'k') [...OR, ...DG].forEach(([dx, dy]) => add(x, y, x + dx, y + dy));
        else slide(x, y, p === 'b' ? DG : p === 'r' ? OR : [...OR, ...DG]);
      } else {
        const fwd = s ? 1 : -1;
        if (p === 'r') slide(x, y, OR);
        else if (p === 'h') { for (const [dx, dy] of OR) { if (!inb(g, x + dx, y + dy) || b[y + dy][x + dx]) continue;
          for (const sg of [-1, 1]) add(x, y, x + 2 * dx + (dx ? 0 : sg), y + 2 * dy + (dy ? 0 : sg)); } }
        else if (p === 'e') { for (const [dx, dy] of DG) { const tx = x + 2 * dx, ty = y + 2 * dy;
          if (inb(g, tx, ty) && !b[y + dy][x + dx] && (s ? ty <= 4 : ty >= 5)) add(x, y, tx, ty); } }
        else if (p === 'a') DG.forEach(([dx, dy]) => pal(x + dx, y + dy) && add(x, y, x + dx, y + dy));
        else if (p === 'k') OR.forEach(([dx, dy]) => pal(x + dx, y + dy) && add(x, y, x + dx, y + dy));
        else if (p === 'c') { for (const [dx, dy] of OR) { let tx = x + dx, ty = y + dy, jumped = false;
          while (inb(g, tx, ty)) { const t = b[ty][tx];
            if (!jumped) { if (t) jumped = true; else out.push([x, y, tx, ty]); }
            else if (t) { if (!mine(t, s)) out.push([x, y, tx, ty]); break; }
            tx += dx; ty += dy; } } }
        else if (p === 'p') { add(x, y, x, y + fwd); if (s ? y >= 5 : y <= 4) { add(x, y, x - 1, y); add(x, y, x + 1, y); } }
      }
    }
    return out;
  }
  function apply(b, m, g) {
    const n = b.map((r) => r.slice()), ch = n[m[1]][m[0]];
    n[m[3]][m[2]] = ch; n[m[1]][m[0]] = '';
    if (g === 'chess' && low(ch) === 'p' && (m[3] === 0 || m[3] === 7)) n[m[3]][m[2]] = ch === 'P' ? 'Q' : 'q';
    return n;
  }
  function facing(b) {
    let a = null, c = null;
    b.forEach((r, y) => r.forEach((ch, x) => { if (ch === 'K') a = [x, y]; if (ch === 'k') c = [x, y]; }));
    if (!a || !c || a[0] !== c[0]) return false;
    for (let y = c[1] + 1; y < a[1]; y++) if (b[y][a[0]]) return false;
    return true;
  }
  function attacked(b, s, g) {
    let k = null; b.forEach((r, y) => r.forEach((ch, x) => { if (ch === (s ? 'k' : 'K')) k = [x, y]; }));
    if (!k) return true;
    return gen(b, 1 - s, g).some((m) => m[2] === k[0] && m[3] === k[1]) || (g === 'xq' && facing(b));
  }
  const legal = (b, s, g) => gen(b, s, g).filter((m) => !attacked(apply(b, m, g), s, g));
  function evalB(b, s, g) {
    let v = 0; b.forEach((r) => r.forEach((ch) => { if (ch) v += (mine(ch, s) ? 1 : -1) * VAL[g][low(ch)]; })); return v;
  }
  function search(b, s, d, al, be, g) {
    if (d === 0) return evalB(b, s, g);
    const ms = gen(b, s, g); if (!ms.length) return -500;
    let best = -Infinity;
    for (const m of ms) {
      const v = -search(apply(b, m, g), 1 - s, d - 1, -be, -al, g);
      if (v > best) best = v; if (best > al) al = best; if (al >= be) break;
    }
    return best;
  }
  function botPick(b, g, d = 3, noise = .3) {
    const ms = legal(b, 1, g); if (!ms.length) return null;
    let best = -Infinity, pick = ms[0];
    for (const m of ms) { const v = -search(apply(b, m, g), 0, d - 1, -Infinity, Infinity, g) + Math.random() * noise; if (v > best) { best = v; pick = m; } }
    return pick;
  }

  Games.chess = {
    engine: { gen, legal, apply, attacked, botPick, CH, XQ },
    guide: 'Đấu với máy, bạn cầm quân sáng/đỏ và đi trước. Chạm quân rồi chạm ô viền xanh để đi. Chiếu hết thì thắng. Chế độ ✨ Nước đi ma thuật: mỗi ván bạn có 1 lần "Đi thêm lượt" (đi 2 nước liên tiếp) và 1 lần "Biến quân" (Tốt thành Hậu / Chốt thành Xe). Cờ Vua chưa có nhập thành và bắt tốt qua đường; máy không dùng ma thuật.',
    start(el, api, lv = 0) {
      let dead = false;
      el.innerHTML = '<p>Chọn ván đấu:</p>' + [['chess',0,'♟️ Cờ Vua'],['chess',1,'✨ Cờ Vua Ma Thuật'],['xq',0,'🐘 Cờ Tướng'],['xq',1,'✨ Cờ Tướng Ma Thuật']]
        .map(([g, m, t]) => `<button class="btn" style="margin:.2rem" data-g="${g}" data-m="${m}">${t}</button>`).join('');
      el.querySelectorAll('[data-g]').forEach((bt) => bt.onclick = () => play(bt.dataset.g, +bt.dataset.m));
      function play(g, magicOn) {
        const { W, H } = G[g];
        let b = (g === 'chess' ? CH : XQ).map((r) => r.split('').map((c) => c === '.' ? '' : c));
        let last = null, sel = null, sm = [], busy = false, over = false, n = 0, extra = 0, trans = 0;
        const mg = { extra: magicOn, trans: magicOn };
        el.innerHTML = `<div id="tb" style="margin-bottom:.5rem"></div><div class="chb ${g}" style="grid-template-columns:repeat(${W},1fr)"></div>`;
        const bd = el.querySelector('.chb'), tb = el.querySelector('#tb'), name = (ch) => g === 'chess' ? GL[ch] : GL['x' + ch];
        function draw() {
          bd.innerHTML = '';
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const ch = b[y][x], bt = document.createElement('button');
            bt.className = 'sq ' + ((x + y) % 2 ? 'dk' : 'lt') + (g === 'xq' && y === 4 ? ' rv' : '') + (sel && sel[0] === x && sel[1] === y ? ' sel' : '') + (sm.some((m) => m[2] === x && m[3] === y) ? ' tg' : '') + (last && last[2] === x && last[3] === y ? ' drop' : '') + (last && ((last[0] === x && last[1] === y) || (last[2] === x && last[3] === y)) ? ' lm' : '');
            bt.textContent = ch ? name(ch) : '';
            if (ch && g === 'xq') bt.style.color = ch === ch.toUpperCase() ? '#d62a4a' : '#222';
            bt.onclick = () => tap(x, y); bd.append(bt);
          }
          tb.innerHTML = magicOn ? `<button class="btn alt" id="mx" ${!mg.extra || over ? 'disabled' : ''}>✨ Đi thêm lượt${extra ? ' (đang bật)' : ''}</button> <button class="btn alt" id="mt" ${!mg.trans || over ? 'disabled' : ''}>🔄 Biến quân${trans ? ' (chọn Tốt)' : ''}</button>` : '';
          if (magicOn) { tb.querySelector('#mx').onclick = () => { extra = 1; draw(); }; tb.querySelector('#mt').onclick = () => { trans = 1; draw(); }; }
          api.setHud(busy ? 'Máy đang nghĩ…' : `Lượt bạn · ${n} nước${!over && attacked(b, 0, g) ? ' · ⚠️ Bạn đang bị chiếu!' : ''}`);
        }
        function done(r) { over = true; draw(); setTimeout(() => !dead && api.finish(r === 'w' ? Math.max(300, 1000 - n * 5) : r === 'd' ? 200 : 50, r === 'w'), 700); }
        function noMoves(side) {
          if (legal(b, side, g).length) return false;
          if (attacked(b, side, g) || g === 'xq') done(side === 1 ? 'w' : 'l'); else done('d');
          return true;
        }
        function tap(x, y) {
          if (busy || over) return;
          const ch = b[y][x];
          if (trans) { if (ch && mine(ch, 0) && low(ch) === 'p') { b[y][x] = g === 'chess' ? 'Q' : 'R'; mg.trans = 0; } trans = 0; return draw(); }
          if (sel) { const m = sm.find((q) => q[2] === x && q[3] === y); if (m) return move(m); }
          if (ch && mine(ch, 0)) { sel = [x, y]; sm = legal(b, 0, g).filter((q) => q[0] === x && q[1] === y); } else { sel = null; sm = []; }
          draw();
        }
        function move(m) {
          b = apply(b, m, g); last = m; sel = null; sm = []; n++;
          if (noMoves(1)) return;
          if (extra) { extra = 0; mg.extra = 0; draw(); noMoves(0); return; }
          busy = true; draw(); setTimeout(bot, 600);
        }
        function bot() {
          if (dead || over) return;
          const m = botPick(b, g, [1, 2, 3][lv], [4, .8, .3][lv]); busy = false;
          if (m) { b = apply(b, m, g); last = m; }
          if (noMoves(0)) return;
          draw();
        }
        draw();
      }
      return () => { dead = true; };
    }
  };
})();


// ---- Pac-Man Kẹo ----
Games.pacman = {
  maze: ['###############','#o.....#.....o#','#.###.#.#.###.#','#.............#','#.###.###.###.#','#.....#G#.....#','#.###.....###.#','#......P......#','#.###.###.###.#','#o..#.....#..o#','##.#.#.#.#.#.##','#.............#','###############'],
  mods: [{}, { 3: '#..#.......#..#', 7: '#..#...P...#..#' }, { 3: '#.##.......##.#', 9: '#o.##.....##.o#' }],
  guide: 'Điều khiển bằng mũi tên/WASD, vuốt trên màn hình hoặc 4 nút bên dưới. Ăn hết chấm nhỏ để thắng. Ăn chấm lớn trắng để dọa ma 😱 trong vài giây, lúc đó ăn ma được +200. Chạm ma khi chưa dọa là mất 1 mạng (có 3 mạng). Màn càng cao ma càng đông và đuổi càng sát.',
  start(el, api, lv = 0) {
    const T = 24, W = 15, H = 13, D = [[1,0],[-1,0],[0,1],[0,-1]], P = Games.pacman;
    el.innerHTML = `<canvas width="${W * T}" height="${H * T}"></canvas><div class="pad"><button class="btn alt" data-d="0,-1">▲</button><button class="btn alt" data-d="-1,0">◀</button><button class="btn alt" data-d="1,0">▶</button><button class="btn alt" data-d="0,1">▼</button></div>`;
    const cv = el.firstChild, c = cv.getContext('2d');
    const grid = P.maze.map((r, i) => (P.mods[lv][i] || r).split(''));
    let pellets = 0, start = [7, 7], home = [7, 5];
    grid.forEach((row, r) => row.forEach((ch, x) => { if (ch === '.' || ch === 'o') pellets++; if (ch === 'P') { start = [x, r]; row[x] = ' '; } if (ch === 'G') { home = [x, r]; row[x] = ' '; } }));
    const free = (x, r) => r >= 0 && r < H && x >= 0 && x < W && grid[r][x] !== '#';
    const NG = [2, 3, 4][lv], CHASE = [.5, .65, .8][lv], GSP = [.05, .06, .07][lv], PSP = .09, FR = [420, 330, 240][lv];
    let lives = 3 + (api.perks.extra_life || 0), score = 0, fright = 0, inv = 0, f = 0, raf, ended = false, want = [0, 0], face = 0, pac, ghosts;
    const mkGhost = (i, wait) => ({ c: home[0], r: home[1], dc: 0, dr: 0, t: 0, wait: wait ?? 60 + i * 110, i });
    const reset = () => { pac = { c: start[0], r: start[1], dc: 0, dr: 0, t: 0 }; want = [0, 0]; ghosts = Array.from({ length: NG }, (_, i) => mkGhost(i)); fright = 0; inv = 90; };
    reset();
    const setDir = (a, b) => { want = [a, b];
      if ((pac.dc || pac.dr) && pac.dc === -a && pac.dr === -b) { pac.c += pac.dc; pac.r += pac.dr; pac.dc = a; pac.dr = b; pac.t = 1 - pac.t; if (pac.t >= 1) pac.t = 0; } };
    const km = { ArrowUp: [0,-1], KeyW: [0,-1], ArrowDown: [0,1], KeyS: [0,1], ArrowLeft: [-1,0], KeyA: [-1,0], ArrowRight: [1,0], KeyD: [1,0] };
    const kd = (e) => { const d = km[e.code]; if (d) { e.preventDefault(); setDir(...d); } };
    addEventListener('keydown', kd);
    el.querySelectorAll('[data-d]').forEach((b) => b.onpointerdown = () => setDir(...b.dataset.d.split(',').map(Number)));
    let sx = 0, sy = 0;
    cv.onpointerdown = (e) => { sx = e.clientX; sy = e.clientY; };
    cv.onpointerup = (e) => { const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
      Math.abs(dx) > Math.abs(dy) ? setDir(dx > 0 ? 1 : -1, 0) : setDir(0, dy > 0 ? 1 : -1); };
    const stop = () => { cancelAnimationFrame(raf); removeEventListener('keydown', kd); };
    const end = (won) => { if (ended) return; ended = true; stop(); api.finish(won ? score + lives * 100 + 300 : score, won); };
    const eat = () => {
      const ch = grid[pac.r][pac.c];
      if (ch === '.') { score += 10; pellets--; } else if (ch === 'o') { score += 50; pellets--; fright = FR; } else return;
      grid[pac.r][pac.c] = ' '; if (!pellets) end(true);
    };
    const chooseP = (e) => { if ((want[0] || want[1]) && free(e.c + want[0], e.r + want[1])) { e.dc = want[0]; e.dr = want[1]; } else if (!free(e.c + e.dc, e.r + e.dr)) e.dc = e.dr = 0; };
    const chooseG = (e) => {
      let o = D.filter(([a, b]) => free(e.c + a, e.r + b) && !((e.dc || e.dr) && a === -e.dc && b === -e.dr));
      if (!o.length) o = D.filter(([a, b]) => free(e.c + a, e.r + b)); if (!o.length) return;
      const sg = fright > 0 ? -1 : 1;
      const pick = Math.random() < CHASE ? o.reduce((bst, d) => sg * Math.hypot(pac.c - (e.c + d[0]), pac.r - (e.r + d[1])) < sg * Math.hypot(pac.c - (e.c + bst[0]), pac.r - (e.r + bst[1])) ? d : bst) : o[Math.random() * o.length | 0];
      e.dc = pick[0]; e.dr = pick[1];
    };
    const step = (e, sp, choose) => {
      if (e.wait > 0) { e.wait--; return; }
      if (!e.dc && !e.dr) { choose(e); if (!e.dc && !e.dr) return; }
      e.t += sp;
      if (e.t >= 1) { e.c += e.dc; e.r += e.dr; e.t = 0; if (e === pac) eat(); if (!ended) choose(e); }
    };
    const hurt = () => { lives--; if (lives <= 0) return end(false); reset(); };
    function loop() {
      f++; if (inv > 0) inv--; if (fright > 0) fright--;
      step(pac, PSP, chooseP);
      ghosts.forEach((g) => step(g, fright > 0 ? GSP * .7 : GSP, chooseG));
      if (ended) return;
      const px = pac.c + pac.dc * pac.t, py = pac.r + pac.dr * pac.t;
      for (const g of ghosts) {
        if (Math.hypot(px - (g.c + g.dc * g.t), py - (g.r + g.dr * g.t)) < .6) {
          if (fright > 0) { score += 200; Object.assign(g, mkGhost(g.i, 80)); }
          else if (inv <= 0) { hurt(); break; }
        }
      }
      if (ended) return;
      c.fillStyle = '#1b1442'; c.fillRect(0, 0, W * T, H * T);
      grid.forEach((row, r) => row.forEach((ch, x) => {
        if (ch === '#') { c.fillStyle = '#4f46e5'; c.fillRect(x * T + 1, r * T + 1, T - 2, T - 2); c.fillStyle = '#a5b4fc'; c.fillRect(x * T + 1, r * T + 1, T - 2, 4); }
        else if (ch === '.') { c.fillStyle = '#ffe2b8'; c.beginPath(); c.arc(x * T + T / 2, r * T + T / 2, 2.8, 0, 7); c.fill(); }
        else if (ch === 'o') { c.fillStyle = '#fff'; c.beginPath(); c.arc(x * T + T / 2, r * T + T / 2, 6 + Math.sin(f * .2) * 1.5, 0, 7); c.fill(); }
      }));
      const ang = (pac.dc || pac.dr) ? Math.atan2(pac.dr, pac.dc) : face; face = ang;
      const m = .1 + .22 * Math.abs(Math.sin(f * .35));
      if (inv % 10 < 6) { c.fillStyle = '#ffd400'; c.beginPath(); c.moveTo((px + .5) * T, (py + .5) * T);
        c.arc((px + .5) * T, (py + .5) * T, T * .42, ang + m * Math.PI, ang - m * Math.PI + Math.PI * 2); c.closePath(); c.fill(); }
      c.fillStyle = '#000'; c.font = '20px serif'; c.textAlign = 'center';
      ghosts.forEach((g) => c.fillText(fright > 0 && (fright > 120 || f % 20 < 10) ? '😱' : ['👻','🎃','👹','🦇'][g.i % 4], (g.c + g.dc * g.t + .5) * T, (g.r + g.dr * g.t + .5) * T + 7));
      api.setHud(`Điểm: ${score} · ❤️ ${lives} · còn ${pellets} chấm`);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return stop;
  }
};

// ---- Màn chơi / độ khó (hệ số điểm theo màn) ----
const lvls = (names) => names.map((name, i) => ({ name, mult: [1, 1.3, 1.7][i] }));
['fps', 'minesweeper', 'pikachu', 'flappy', 'oanquan', 'chess'].forEach((k) => Games[k].levels = lvls(['Dễ', 'Vừa', 'Khó']));
['mario', 'pacman'].forEach((k) => Games[k].levels = lvls(['Màn 1', 'Màn 2', 'Màn 3']));
