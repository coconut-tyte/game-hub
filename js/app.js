const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = (s) => document.querySelector(s);
const esc = (t) => Object.assign(document.createElement('i'), { textContent: t }).innerHTML;
const RARITY = { common:'Thường', rare:'Hiếm', epic:'Sử thi', legendary:'Huyền thoại', mythic:'Thần thoại', secret:'Secret' };
const GUIDE = { fps:'Bấm vào mục tiêu xuất hiện ngẫu nhiên trong 15 giây. Mục tiêu 🎯 +1, vàng ⭐ +3.' };
let me = null, games = [], perks = {}, cur = 'hub';
const PERK = { coin_bonus:v=>`+${v}% xu nhận được`, extra_life:v=>`+${v} mạng/khiên khởi đầu`, score_boost:v=>`+${v}% điểm Bắn Súng`, bonus_time:v=>`+${v}s thời gian Pikachu` };

// ---------- Hero: thung lũng hoa 3D ----------
let hasSession = false, pendingTab = 'hub', valley = null;
const audioStore = () => window.GE && window.GE.audio;
function show(id){
  $('#auth').classList.toggle('hidden', id !== 'auth'); $('#app').classList.toggle('hidden', id !== 'app');
  $('#ui').classList.toggle('off', id !== 'hero'); valley?.setMode(id === 'hero' ? 'hero' : 'bg');
}
async function launch(tab = 'hub'){
  pendingTab = tab; valley?.stopHoverTransition();
  if (hasSession) await enter(); else show('auth');
}
async function boot(){
  const { data:{ session } } = await sb.auth.getSession(); hasSession = !!session;
  show('hero');
  const ready = () => $('#loader').classList.add('gone');
  try {
    if (typeof Valley === 'undefined' || typeof THREE === 'undefined') throw new Error('thiếu three.js hoặc valley.js');
    valley = new Valley($('#valley'), ready, () => { $('#ui').classList.add('on'); $('#boot').classList.add('hide'); },
      (p) => { const pc = Math.round(p * 100); $('#bootbar').style.width = pc + '%'; $('#bootpct').textContent = 'Đang đánh thức thung lũng… ' + pc + '%'; });
    $('#boot').onclick = () => valley.skipIntro();
    valley.setMode('hero');
  } catch (e) { console.warn('Không tải được thung lũng 3D', e); ready(); $('#ui').classList.add('on'); $('#boot').classList.add('hide'); }
  audioStore()?.initAudio();
  setTimeout(() => { ready(); $('#ui').classList.add('on'); $('#boot').classList.add('hide'); }, 10000);
  $('#sound').onclick = () => { const s = audioStore(); if (!s || !s.isInitialized) return; const muted = s.toggleMute(); $('#sound').setAttribute('aria-pressed', String(!muted)); };
  const arrow = $('#heroGo');
  arrow.addEventListener('pointerenter', () => valley?.startHoverTransition());
  arrow.addEventListener('pointerleave', () => valley?.stopHoverTransition());
  arrow.onclick = (e) => { e.preventDefault(); launch('hub'); };
  document.querySelectorAll('[data-launch]').forEach(a => a.onclick = (e) => { e.preventDefault(); launch(a.dataset.launch); });
  $('#home').onclick = () => show('hero');
}

// ---------- Auth (tên đăng nhập -> email ảo) ----------
const mail = (u) => `${u.toLowerCase()}@gamehub.app`;
function creds(){
  const u = $('#u').value.trim(), p = $('#p').value;
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(u)) { $('#authMsg').textContent = 'Tên đăng nhập 3–16 ký tự: chữ, số, _'; return null; }
  if (p.length < 6) { $('#authMsg').textContent = 'Mật khẩu cần ít nhất 6 ký tự'; return null; }
  return { u, p };
}
function viMsg(e){
  const m = (e.message || '').toLowerCase();
  if (m.includes('already')) return 'Tên này đã có người dùng, hãy bấm Đăng nhập';
  if (m.includes('invalid login')) return 'Sai tên đăng nhập hoặc mật khẩu';
  if (m.includes('not confirmed')) return 'Tài khoản chưa xác nhận (cần tắt Confirm email trong Supabase)';
  if (m.includes('rate') || m.includes('security')) return 'Bạn thao tác quá nhanh, thử lại sau ít phút nhé';
  if (m.includes('fetch') || m.includes('network')) return 'Không kết nối được máy chủ, kiểm tra mạng nhé';
  return 'Có lỗi: ' + e.message;
}
async function authDo(kind){
  const c = creds(); if (!c) return;
  $('#signup').disabled = $('#login').disabled = true; $('#authMsg').textContent = '';
  try {
    let r;
    if (kind === 'up') {
      r = await sb.auth.signUp({ email: mail(c.u), password: c.p, options:{ data:{ username: c.u.toLowerCase() } } });
      if (!r.error && !r.data.session) r = await sb.auth.signInWithPassword({ email: mail(c.u), password: c.p });
    } else r = await sb.auth.signInWithPassword({ email: mail(c.u), password: c.p });
    if (r.error) throw r.error;
    await enter();
  } catch (e) { $('#authMsg').textContent = viMsg(e); }
  $('#signup').disabled = $('#login').disabled = false;
}
$('#signup').onclick = () => authDo('up'); $('#login').onclick = () => authDo('in');
['#u', '#p'].forEach(q => $(q).addEventListener('keydown', e => { if (e.key === 'Enter') authDo('in'); }));
$('#logout').onclick = async () => { await sb.auth.signOut(); location.reload(); };

async function enter(){
  await refreshMe();
  ({ data: games } = await sb.from('games').select('*'));
  hasSession = true; show('app'); go(pendingTab); pendingTab = 'hub';
}
async function refreshMe(){
  const { data:{ user } } = await sb.auth.getUser();
  ({ data: me } = await sb.from('profiles').select('*').eq('id', user.id).single());
  countTo($('#coins'), me.coins); $('#me').textContent = me.username;
  const { data: up } = await sb.from('user_pets').select('pets(perk,perk_value)');
  perks = {}; (up || []).forEach(({ pets: q }) => perks[q.perk] = Math.max(perks[q.perk] || 0, q.perk_value));
}

// ---------- Điều hướng ----------
document.querySelectorAll('.tab').forEach(b => b.onclick = () => go(b.dataset.v));
function go(v){
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.v === v));
  cur = v; const vw = $('#view'); vw.classList.remove('enter'); void vw.offsetWidth; vw.classList.add('enter');
  ({ hub, rank, quest, pets })[v]();
}

// ---------- 3D tilt (rAF, 60fps) ----------
function tilt(el){
  let raf;
  el.onpointermove = (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 16 + 'deg');
      el.style.setProperty('--rx', (.5 - (e.clientY - r.top) / r.height) * 16 + 'deg');
    });
  };
  el.onpointerleave = () => { el.style.setProperty('--rx','0deg'); el.style.setProperty('--ry','0deg'); };
}

// ---------- Màn hình ----------
function hub(){
  $('#view').innerHTML = '<div class="grid">' + games.map((g, n) =>
    `<div class="card glass" style="--i:${n}" data-g="${esc(g.id)}" tabindex="0"><div class="e">${g.emoji}</div><h3>${esc(g.name)}</h3><small>${Games[g.id] ? 'Chơi ngay' : 'Sắp có'}</small></div>`).join('') + '</div>';
  document.querySelectorAll('.card').forEach(c => { tilt(c); c.onclick = () => openGame(c.dataset.g); });
}
async function rank(sel = games[0].id, mode = 'best'){
  const { data } = await sb.rpc('leaderboard', { p_game: sel });
  const rows = [...(data || [])].sort((x, y) => mode === 'wins' ? y.wins - x.wins || y.best - x.best : y.best - x.best).slice(0, 10);
  const medal = ['🥇', '🥈', '🥉'];
  $('#view').innerHTML = `<div class="glass" style="padding:1rem"><div class="rk"><select id="gsel">${games.map(g => `<option value="${esc(g.id)}" ${g.id === sel ? 'selected' : ''}>${g.emoji} ${esc(g.name)}</option>`).join('')}</select>
    <button class="tab" data-m="best" aria-selected="${mode === 'best'}">🏅 Điểm cao</button><button class="tab" data-m="wins" aria-selected="${mode === 'wins'}">🏆 Thắng nhiều</button></div>` +
    (rows.length ? rows.map((r, i) => `<div class="row glass ${r.username === me.username ? 'me' : ''}"><span>${medal[i] || '#' + (i + 1)} ${esc(r.username)}${r.username === me.username ? ' ⭐' : ''}</span><span><b>${mode === 'best' ? r.best : r.wins + ' thắng'}</b> <small>${mode === 'best' ? r.wins + ' thắng' : 'cao nhất ' + r.best} · ${r.plays} ván</small></span></div>`).join('') : '<p>Chưa có ai ghi điểm. Hãy là người đầu tiên!</p>') + '</div>';
  $('#gsel').onchange = (e) => rank(e.target.value, mode);
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => rank(sel, b.dataset.m));
}
async function quest(){
  const [{ data:qs }, { data:uq }] = await Promise.all([sb.from('daily_quests').select('*').order('id'), sb.from('user_quests').select('*').eq('day', new Date().toISOString().slice(0,10))]);
  $('#view').innerHTML = qs.map(q => {
    const p = uq.find(x => x.quest_id === q.id), prog = p ? p.progress : 0, ok = prog >= q.goal;
    return `<div class="row glass"><span>${esc(q.title)} (${Math.min(prog,q.goal)}/${q.goal})</span>
      <button class="btn" data-q="${q.id}" ${!ok || (p && p.claimed) ? 'disabled' : ''}>${p && p.claimed ? 'Đã nhận' : `Nhận 🪙${q.reward}`}</button></div>`;
  }).join('');
  document.querySelectorAll('[data-q]').forEach(b => b.onclick = async () => {
    const { error } = await sb.rpc('claim_quest', { p_quest: +b.dataset.q });
    if (!error) { await refreshMe(); quest(); }
  });
}
const GLOW = { common:'#9aa0a6', rare:'#3b8bff', epic:'#a24bff', legendary:'#ff9d00', mythic:'#ff3b7b', secret:'#00d1a0' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const modal = $('#modal');
function countTo(el, to){
  const from = +el.textContent || 0; if (from === to) return;
  const t0 = performance.now();
  (function step(t){ const k = Math.min(1, (t - t0) / 600); el.textContent = Math.round(from + (to - from) * k); if (k < 1) requestAnimationFrame(step); })(t0);
}
function toast(msg){ const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; document.body.append(d); setTimeout(() => d.remove(), 2500); }
function confetti(n = 40, cols = ['#ff7eb6', '#ffd166', '#7fe0c3', '#8ec5ff']){
  const w = document.createElement('div'); w.className = 'confetti';
  for (let i = 0; i < n; i++) { const e = document.createElement('i');
    e.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % cols.length]};--dx:${(Math.random() - .5) * 240}px;--r:${Math.random() * 720}deg;animation-delay:${Math.random() * .3}s`; w.append(e); }
  document.body.append(w); setTimeout(() => w.remove(), 2400);
}

// ---------- Gacha có pity + hiệu ứng ----------
async function pets(){
  const { data } = await sb.from('user_pets').select('pets(*)');
  const pe = me.pity_epic || 0, pl = me.pity_leg || 0;
  $('#view').innerHTML = `<div class="glass" style="padding:1.2rem;text-align:center"><div class="egg">🥚</div>
    <button class="btn" id="roll" ${me.coins < 100 ? 'disabled' : ''}>🎁 Quay Gacha (🪙100)</button>
    <div class="pity"><small>Sử thi+ chắc chắn sau <b>${10 - pe}</b> lượt</small><div class="bar"><i style="width:${pe * 10}%"></i></div>
    <small>Huyền thoại+ chắc chắn sau <b>${50 - pl}</b> lượt</small><div class="bar"><i style="width:${pl * 2}%"></i></div></div></div>
    <h3>Bộ sưu tập (${data.length})</h3><div class="grid">` + data.map(({ pets: p }, n) =>
    `<div class="card glass" style="--i:${n}"><div class="e">${p.emoji}</div><h3>${esc(p.name)}</h3><b class="r-${p.rarity}">${RARITY[p.rarity]}</b><br><small>${(PERK[p.perk] || (() => ''))(p.perk_value)}</small></div>`).join('') + '</div>';
  document.querySelectorAll('.card').forEach(tilt);
  $('#roll').onclick = roll;
}
async function roll(){
  const b = $('#roll'); if (b) b.disabled = true;
  const { data: r, error } = await sb.rpc('gacha_roll');
  if (error) { toast('Không đủ xu hoặc có lỗi, thử lại nhé'); return go('pets'); }
  const p = r.pet, gc = GLOW[p.rarity], big = ['epic', 'legendary', 'mythic', 'secret'].includes(p.rarity);
  openModal(`<div class="gstage" style="--gc:${gc}"><div class="gegg shake" id="ge">🥚</div><p>Đang ấp trứng…</p></div>`);
  await sleep(1400); $('#ge')?.classList.replace('shake', 'crack'); await sleep(450);
  if (['mythic', 'secret'].includes(p.rarity)) { const f = document.createElement('div'); f.id = 'flash'; document.body.append(f); setTimeout(() => f.remove(), 800); }
  if (big) confetti(p.rarity === 'epic' ? 30 : 70, [gc, '#ffd166', '#ffffff']);
  await refreshMe();
  setBox(`<div class="gstage" style="--gc:${gc}"><div class="flip"><div class="face"><div style="font-size:4.5rem">${p.emoji}</div><h2>${esc(p.name)}</h2><b class="r-${p.rarity}">${RARITY[p.rarity]}</b><small>${(PERK[p.perk] || (() => ''))(p.perk_value)}</small></div></div>
    <p>${r.isnew ? '✨ Thú mới!' : `Đã có rồi, hoàn 🪙${r.refund}`}</p>
    <p><small>Sử thi+ sau ${10 - r.pity_epic} lượt · Huyền thoại+ sau ${50 - r.pity_leg} lượt</small></p>
    <button class="btn" id="again" ${me.coins < 100 ? 'disabled' : ''}>Quay tiếp (🪙100)</button></div>`);
  $('#again').onclick = () => { closeModal(); setTimeout(roll, 280); };
}

// ---------- Khung (modal) gọn gàng, luôn đóng được ----------
function setBox(html){ $('#box').innerHTML = `<button class="xbtn" id="xx" aria-label="Đóng">✕</button>` + html; $('#xx').onclick = closeGame; }
function openModal(html){
  setBox(html); modal.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('show')));
  document.body.style.overflow = 'hidden';
}
function closeModal(){
  modal.classList.remove('show'); document.body.style.overflow = '';
  setTimeout(() => { if (!modal.classList.contains('show')) modal.classList.add('hidden'); }, 260);
}
let stopGame = null;
function closeGame(){ stopGame?.(); stopGame = null; closeModal(); go(cur); }
modal.addEventListener('pointerdown', (e) => { if (e.target === modal) closeGame(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) closeGame(); });

function openGame(id){
  let lv = 0; const g = games.find(x => x.id === id), G = Games[id];
  if (!G) return openModal(`<h2>${g.emoji} ${esc(g.name)}</h2><p>Game này đang được xây dựng. Quay lại sau nhé!</p>`);
  openModal(`<h2>${g.emoji} ${esc(g.name)}</h2><details id="gd" open><summary>📖 Hướng dẫn tân thủ</summary><p style="text-align:left">${esc(G.guide)}</p></details>
    ${G.levels ? `<div class="lvl">${G.levels.map((l, k) => `<button class="tab" data-l="${k}" aria-selected="${k === 0}">${l.name}</button>`).join("")}</div>` : ""}
    <button class="btn" id="go">▶ Bắt đầu</button><p id="hud"></p><div id="arena"></div>`);
  document.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { lv = +b.dataset.l; document.querySelectorAll('[data-l]').forEach(x => x.setAttribute('aria-selected', x === b)); });
  $('#go').onclick = async () => {
    const mult = G.levels?.[lv]?.mult ?? 1;
    document.querySelectorAll('.lvl').forEach(x => x.classList.add('hidden'));
    $('#go').classList.add('hidden'); $('#gd').open = false; $('#arena').style.minHeight = '260px';
    for (const n of ['3', '2', '1', 'Go!']) {
      const d = document.createElement('div'); d.className = 'cd'; d.textContent = n; document.body.append(d);
      await sleep(650); d.remove(); if (!modal.classList.contains('show')) return;
    }
    $('#arena').style.minHeight = '';
    const apiObj = {
      perks,
      setHud: (t) => { const h = $('#hud'); if (h) h.textContent = t; },
      finish: async (score, won) => {
        stopGame?.(); stopGame = null; score = Math.round(score * mult);
        const { data: earned } = await sb.rpc('submit_score', { p_game: id, p_score: score, p_won: won });
        await refreshMe();
        if (won) confetti(50);
        setBox(`<h2>${won ? 'Chiến thắng! 🎉' : 'Hết lượt! 💫'}</h2><p style="font-size:1.3rem">Điểm: <b>${score}</b></p><p>Nhận 🪙 <b>${earned ?? 0}</b></p><button class="btn" id="again">Chơi lại</button>`);
        $('#again').onclick = () => openGame(id);
      }
    };
    stopGame = G.start($('#arena'), apiObj, lv);
  };
}

boot();
