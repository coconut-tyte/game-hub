// Mỗi game: { guide, start(el, api) -> hàm dọn dẹp }. api.setHud(text), api.finish(score, won)
window.Games = {};

// ---- Bắn Súng Ngộ Nghĩnh ----
Games.fps = {
  guide: 'Bấm vào mục tiêu xuất hiện ngẫu nhiên trong 15 giây. 🎯 được +1, ⭐ vàng được +3. Đạt 10 điểm là thắng.',
  start(el, api) {
    el.style.height = '300px'; let score = 0, t = 15;
    api.setHud('Điểm: 0 · Còn 15s');
    const spawn = setInterval(() => {
      const b = document.createElement('button'), gold = Math.random() < .15;
      b.className = 'target'; b.textContent = gold ? '⭐' : '🎯';
      b.style.left = Math.random() * 85 + '%'; b.style.top = Math.random() * 80 + '%';
      b.onclick = () => { score += gold ? 3 : 1; b.remove(); api.setHud(`Điểm: ${score} · Còn ${t}s`); };
      el.append(b); setTimeout(() => b.remove(), 1100);
    }, 450);
    const clock = setInterval(() => {
      api.setHud(`Điểm: ${score} · Còn ${--t}s`);
      if (t <= 0) api.finish(Math.round(score * 10 * (1 + (api.perks.score_boost || 0) / 100)), score >= 10);
    }, 1000);
    return () => { clearInterval(spawn); clearInterval(clock); };
  }
};

// ---- Dò Mìn: Thợ săn kho báu ----
Games.minesweeper = {
  guide: 'Chạm ô để mở; con số là số mìn xung quanh. Bật 🚩 rồi chạm để cắm cờ. Trong ô an toàn có giấu 5 viên 💎, mỗi viên +100 điểm. Có 2 ô bẫy 🌀: mở trúng bị trừ 50 điểm và bàn cờ đổi màu 4 giây. Mở hết ô an toàn để thắng, mở trúng 💣 là thua.',
  start(el, api) {
    const N = 9, MINES = 10, TREAS = 5, TRAPS = 2, t0 = Date.now();
    let pen = 0, placed = false, flag = false, gems = 0, open = 0, over = false;
    el.innerHTML = '<div style="margin-bottom:.5rem"><button class="btn alt" id="fl">🚩 Cắm cờ: tắt</button></div><div class="ms"></div>';
    const g = el.querySelector('.ms');
    el.querySelector('#fl').onclick = (e) => { flag = !flag; e.target.textContent = '🚩 Cắm cờ: ' + (flag ? 'bật' : 'tắt'); };
    const cells = Array.from({ length: N * N }, (_, i) => ({ i, m: 0, t: 0, x: 0, r: 0, f: 0, n: 0 }));
    const nb = (i) => { const x = i % N, y = i / N | 0, o = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const a = x + dx, b = y + dy; if ((dx || dy) && a >= 0 && b >= 0 && a < N && b < N) o.push(b * N + a); }
      return o; };
    const btns = cells.map((c) => { const b = document.createElement('button'); b.className = 'cell'; b.onclick = () => tap(c); g.append(b); return b; });
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
    function reveal(c) {
      if (c.r || c.f) return; c.r = 1; open++; if (c.t) gems++;
      if (c.x) { pen += 50; g.style.filter = 'hue-rotate(160deg)'; setTimeout(() => g.style.filter = '', 4000); }
      draw(c);
      if (!c.n) nb(c.i).forEach((j) => !cells[j].m && reveal(cells[j]));
    }
    function tap(c) {
      if (over || c.r) return;
      if (flag) { c.f ^= 1; return draw(c); }
      if (c.f) return;
      if (!placed) { place(c.i); placed = true; }
      if (c.m) { over = true; cells.filter((x) => x.m).forEach((x) => { x.r = 1; draw(x); }); return setTimeout(() => api.finish(Math.max(0, gems * 100 - pen), false), 900); }
      reveal(c); hud();
      if (open === N * N - MINES) { over = true; api.finish(Math.max(0, 500 + gems * 100 + Math.max(0, 300 - Math.round((Date.now() - t0) / 1000)) - pen), true); }
    }
    return () => {};
  }
};

// ---- Flappy Bird: Cánh én thời gian ----
Games.flappy = {
  guide: 'Chạm vào màn hình (hoặc nhấn Space) để vỗ cánh. Mỗi ống đi qua +1 điểm. Nhặt 🛡️ để chống 1 lần va chạm, 🪶 để giảm trọng lực 5 giây, ⚡ để tăng tốc 3 giây (mỗi ống được +2 điểm). Đạt 10 điểm là thắng.',
  start(el, api) {
    el.innerHTML = '<canvas width="320" height="420"></canvas>';
    const cv = el.firstChild, c = cv.getContext('2d');
    let fast = 0, y = 200, v = 0, f = 0, score = 0, shield = api.perks.extra_life ? 1 : 0, low = 0, inv = 0, raf, pipes = [], items = [];
    const flap = () => { v = -6.2; };
    const key = (e) => { if (e.code === 'Space') { e.preventDefault(); flap(); } };
    cv.onpointerdown = flap; addEventListener('keydown', key);
    const stop = () => { cancelAnimationFrame(raf); removeEventListener('keydown', key); };
    function loop() {
      f++; if (fast > 0) fast--; const sp = fast > 0 ? 4 : 2.5; v += low > 0 ? .22 : .4; y += v; if (low > 0) low--; if (inv > 0) inv--;
      if (f % 90 === 1) {
        const gy = 110 + Math.random() * 190; pipes.push({ x: 320, gy, p: 0 });
        if (Math.random() < .45) items.push({ x: 380, y: gy, k: ['🛡️', '🪶', '⚡'][Math.random() * 3 | 0] });
      }
      pipes.forEach((p) => p.x -= sp); items.forEach((i) => i.x -= sp);
      pipes = pipes.filter((p) => p.x > -50); items = items.filter((i) => i.x > -20);
      let hit = y < 10 || y > 410;
      pipes.forEach((p) => {
        if (!p.p && p.x + 44 < 60) { p.p = 1; score += fast > 0 ? 2 : 1; }
        if (72 > p.x && 48 < p.x + 44 && (y - 12 < p.gy - 55 || y + 12 > p.gy + 55)) hit = true;
      });
      items = items.filter((i) => {
        if (Math.abs(i.x - 60) < 24 && Math.abs(i.y - y) < 24) { if (i.k === '🛡️') shield = 1; else if (i.k === '🪶') low = 300; else fast = 180; score++; return false; }
        return true; });
      if (hit && inv <= 0) {
        if (!shield) { stop(); return api.finish(score * 10, score >= 10); }
        shield = 0; inv = 60; v = -4; y = Math.min(Math.max(y, 40), 380);
      }
      c.fillStyle = '#bfe6ff'; c.fillRect(0, 0, 320, 420);
      c.fillStyle = '#7fe0c3';
      pipes.forEach((p) => { c.fillRect(p.x, 0, 44, p.gy - 55); c.fillRect(p.x, p.gy + 55, 44, 420); });
      c.font = '24px serif'; c.textAlign = 'center';
      items.forEach((i) => c.fillText(i.k, i.x, i.y + 8));
      c.font = '28px serif'; c.fillText('🐤', 60, y + 10);
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
  start(el, api) {
    const W = 10, H = 8, ICONS = ['🐭','🐱','🐰','🦊','🐻','🐼','🐸','🐵','🦄','🐙','🐧','🐢'];
    const g = Array(W * H).fill(null), D = [[1,0],[-1,0],[0,1],[0,-1]];
    const pool = ICONS.flatMap((i) => [i, i, i, i]).sort(() => Math.random() - .5);
    for (let y = 1; y <= 6; y++) for (let x = 1; x <= 8; x++) g[y * W + x] = pool.pop();
    let sel = null, time = 120 + (api.perks.bonus_time || 0), frozen = 0, pairs = 0, over = false; const items = { freeze: 0, shuffle: 1 };
    el.innerHTML = '<div style="margin-bottom:.5rem"><button class="btn alt" id="fz"></button> <button class="btn alt" id="sh"></button></div><div class="pk"></div>';
    const board = el.querySelector('.pk'), btns = {};
    for (let y = 1; y <= 6; y++) for (let x = 1; x <= 8; x++) {
      const i = y * W + x, b = document.createElement('button'); b.className = 'cell'; b.onclick = () => tap(i); board.append(b); btns[i] = b;
    }
    const draw = () => {
      Object.keys(btns).forEach((i) => { btns[i].textContent = g[i] || ''; btns[i].style.visibility = g[i] ? 'visible' : 'hidden'; btns[i].style.outline = sel == i ? '3px solid #ff7eb6' : ''; });
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
      if (over || !g[i]) return;
      if (sel === null || sel === i) { sel = sel === i ? null : i; return draw(); }
      if (g[sel] === g[i] && linked(sel, i)) {
        g[sel] = g[i] = null; sel = null; pairs++;
        if (pairs % 3 === 0) items[Math.random() < .5 ? 'freeze' : 'shuffle']++;
        if (pairs === 24) { over = true; return api.finish(480 + time * 5, true); }
      } else sel = i;
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
  start(el, api) {
    const N = 12, GOLD = [3, 9], mod = (i) => (i + N) % N;
    let cells = Array.from({ length: N }, (_, i) => ({ d: i % 6 ? 5 : 0, q: i % 6 ? 0 : 1 }));
    const sc = [0, 0], own = (w) => w ? [7,8,9,10,11] : [1,2,3,4,5];
    let sel = null, busy = false, over = false;
    el.innerHTML = '<div class="oq"></div><div id="dir" style="margin-top:.6rem;min-height:2.4rem"></div>';
    const bd = el.querySelector('.oq'), dirEl = el.querySelector('#dir');
    function sim(cs, i, dir) {
      cs = cs.map((c) => ({ ...c })); let gain = 0, pos = i, hand = cs[i].d; cs[i].d = 0;
      for (let guard = 0; guard < 100; guard++) {
        while (hand > 0) { pos = mod(pos + dir); cs[pos].d++; hand--; }
        let nx = mod(pos + dir);
        if (cs[nx].q) break;
        if (cs[nx].d > 0) { pos = nx; hand = cs[nx].d; cs[nx].d = 0; continue; }
        let cap = mod(nx + dir);
        while (!cs[nx].d && !cs[nx].q && (cs[cap].d || cs[cap].q)) {
          let v = cs[cap].d + (cs[cap].q ? 10 : 0); if (GOLD.includes(cap)) v *= 2;
          gain += v; cs[cap] = { d: 0, q: 0 }; nx = mod(cap + dir); cap = mod(nx + dir);
        }
        break;
      }
      return { cs, gain };
    }
    function render() {
      bd.innerHTML = '';
      cells.forEach((c, i) => {
        const b = document.createElement('button'); b.className = 'cell' + (sel === i ? ' open' : '');
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
    function play(w, i, dir) {
      const r = sim(cells, i, dir); cells = r.cs; sc[w] += r.gain; sel = null; dirEl.innerHTML = '';
      if (!cells[0].q && !cells[6].q) return end();
      const nxt = 1 - w; if (!refill(nxt)) return end();
      busy = w === 0; render();
      if (w === 0) setTimeout(ai, 700);
    }
    function ai() {
      if (over) return;
      const opts = own(1).filter((i) => cells[i].d).flatMap((i) => [1, -1].map((dir) => ({ i, dir, gain: sim(cells, i, dir).gain })));
      const best = Math.max(...opts.map((o) => o.gain)), pick = opts.filter((o) => o.gain === best);
      const m = pick[Math.random() * pick.length | 0]; busy = false; play(1, m.i, m.dir);
    }
    render();
    return () => { over = true; };
  }
};

// ---- Mario Mini: Vương quốc kẹo ----
Games.mario = {
  guide: '← → (hoặc A D) để chạy, Space hoặc ↑ để nhảy; trên điện thoại dùng 3 nút bên dưới. Nhảy lên đầu 🐛 để diệt (+20). Nhặt 🪙 (+10). Nhặt 🍄 để biến hình 8 giây: nhảy cao hơn và húc bay kẻ địch. Chạm 🚩 cuối màn để thắng. Bạn có 3 mạng.',
  start(el, api) {
    const T = 20, R = 12, C = 70, VW = 480, VH = 240;
    el.innerHTML = `<canvas width="${VW}" height="${VH}"></canvas><div class="pad"><button class="btn alt" data-k="l">◀</button><button class="btn alt" data-k="j">⤒ Nhảy</button><button class="btn alt" data-k="r">▶</button></div>`;
    const cv = el.firstChild, c = cv.getContext('2d'), k = { l: 0, r: 0, j: 0 };
    const map = Array.from({ length: R }, () => Array(C).fill(' '));
    for (let x = 0; x < C; x++) if (![14, 15, 32, 33, 34, 50, 51].includes(x)) map[10][x] = map[11][x] = '#';
    [[8,7,3],[18,7,4],[24,5,3],[38,7,4],[44,5,3],[56,6,4]].forEach(([x, y, l]) => { for (let i = 0; i < l; i++) map[y][x + i] = '#'; });
    let coins = [[9,6],[10,6],[19,6],[20,6],[25,4],[26,4],[39,6],[40,6],[45,4],[57,5],[58,5],[22,9],[36,9]].map(([x, y]) => ({ x: x * T + 4, y: y * T + 4 }));
    let shroom = { x: 25 * T, y: 3 * T, on: 1 };
    let foes = [11, 28, 41, 53].map((x) => ({ x: x * T, y: 9 * T + 2, d: -1 }));
    const FLAG = 67 * T, p = { x: 40, y: 100, vy: 0, g: 0 }, W = 14, H = 18;
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
      c.fillStyle = '#bfe6ff'; c.fillRect(0, 0, VW, VH);
      for (let y = 0; y < R; y++) for (let x = (cam / T | 0); x < (cam + VW) / T + 1; x++) if (map[y]?.[x] === '#') { c.fillStyle = y > 9 ? '#c98f5a' : '#7fe0c3'; c.fillRect(x * T - cam, y * T, T, T); }
      c.font = '16px serif'; c.textAlign = 'left';
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
  function botPick(b, g) {
    const ms = legal(b, 1, g); if (!ms.length) return null;
    let best = -Infinity, pick = ms[0];
    for (const m of ms) { const v = -search(apply(b, m, g), 0, 2, -Infinity, Infinity, g) + Math.random() * .3; if (v > best) { best = v; pick = m; } }
    return pick;
  }

  Games.chess = {
    engine: { gen, legal, apply, attacked, botPick, CH, XQ },
    guide: 'Đấu với máy, bạn cầm quân sáng/đỏ và đi trước. Chạm quân rồi chạm ô viền xanh để đi. Chiếu hết thì thắng. Chế độ ✨ Nước đi ma thuật: mỗi ván bạn có 1 lần "Đi thêm lượt" (đi 2 nước liên tiếp) và 1 lần "Biến quân" (Tốt thành Hậu / Chốt thành Xe). Cờ Vua chưa có nhập thành và bắt tốt qua đường; máy không dùng ma thuật.',
    start(el, api) {
      let dead = false;
      el.innerHTML = '<p>Chọn ván đấu:</p>' + [['chess',0,'♟️ Cờ Vua'],['chess',1,'✨ Cờ Vua Ma Thuật'],['xq',0,'🐘 Cờ Tướng'],['xq',1,'✨ Cờ Tướng Ma Thuật']]
        .map(([g, m, t]) => `<button class="btn" style="margin:.2rem" data-g="${g}" data-m="${m}">${t}</button>`).join('');
      el.querySelectorAll('[data-g]').forEach((bt) => bt.onclick = () => play(bt.dataset.g, +bt.dataset.m));
      function play(g, magicOn) {
        const { W, H } = G[g];
        let b = (g === 'chess' ? CH : XQ).map((r) => r.split('').map((c) => c === '.' ? '' : c));
        let sel = null, sm = [], busy = false, over = false, n = 0, extra = 0, trans = 0;
        const mg = { extra: magicOn, trans: magicOn };
        el.innerHTML = `<div id="tb" style="margin-bottom:.5rem"></div><div class="chb ${g}" style="grid-template-columns:repeat(${W},1fr)"></div>`;
        const bd = el.querySelector('.chb'), tb = el.querySelector('#tb'), name = (ch) => g === 'chess' ? GL[ch] : GL['x' + ch];
        function draw() {
          bd.innerHTML = '';
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const ch = b[y][x], bt = document.createElement('button');
            bt.className = 'sq ' + ((x + y) % 2 ? 'dk' : 'lt') + (g === 'xq' && y === 4 ? ' rv' : '') + (sel && sel[0] === x && sel[1] === y ? ' sel' : '') + (sm.some((m) => m[2] === x && m[3] === y) ? ' tg' : '');
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
          b = apply(b, m, g); sel = null; sm = []; n++;
          if (noMoves(1)) return;
          if (extra) { extra = 0; mg.extra = 0; draw(); noMoves(0); return; }
          busy = true; draw(); setTimeout(bot, 60);
        }
        function bot() {
          if (dead || over) return;
          const m = botPick(b, g); busy = false;
          if (m) b = apply(b, m, g);
          if (noMoves(0)) return;
          draw();
        }
        draw();
      }
      return () => { dead = true; };
    }
  };
})();
