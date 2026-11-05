const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = (s) => document.querySelector(s);
const esc = (t) => Object.assign(document.createElement('i'), { textContent: t }).innerHTML;
const RARITY = { common:'Thường', rare:'Hiếm', epic:'Sử thi', legendary:'Huyền thoại', mythic:'Thần thoại', secret:'Secret' };
const GUIDE = { fps:'Bấm vào mục tiêu xuất hiện ngẫu nhiên trong 15 giây. Mục tiêu 🎯 +1, vàng ⭐ +3.' };
let me = null, games = [], perks = {}, cur = 'hub';
let TITLES = {}, petCache = {};
const STAGE_NAMES = ['Sơ sinh', 'Trưởng thành', 'Tối thượng'], EVO_NEED = { 1: 3, 2: 6 }, EVO_COST = { 1: 100, 2: 300 };
const effv = (v, stage = 1) => Math.round(v * (1 + (stage - 1) * .5));
const SKILLS = {
  coin_bonus: { n: 'Kho Báu', d: v => `+${v}% xu nhận được sau mỗi ván` },
  quest_bonus: { n: 'Chăm Chỉ', d: v => `+${v}% xu thưởng nhiệm vụ` },
  lucky: { n: 'Mắt Thần', d: v => `Gacha: Sử thi+ sớm hơn ${v} lượt, Huyền thoại+ sớm hơn ${v * 5} lượt` },
  extra_life: { n: 'Hồi Sinh', d: v => `+${v} mạng/khiên khởi đầu (Khủng Long, Mario, Pac-Man, Flappy)` },
  score_boost: { n: 'Nhân Điểm', d: v => `+${v}% điểm ở mọi game` },
  bonus_time: { n: 'Kéo Dài', d: v => `+${v}s ở Pikachu, +${Math.round(v / 4)}s ở Bắn Súng` },
  calm: { n: 'Bình Tĩnh', d: v => `Chậm ${v}% tốc độ ở Khủng Long, Flappy, ma Pac-Man` },
};

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
  const { data: ts } = await sb.from('titles').select('*').order('sort'); TITLES = Object.fromEntries((ts || []).map(t => [t.id, t]));
  await refreshMe();
  ({ data: games } = await sb.from('games').select('*'));
  hasSession = true; show('app'); go(pendingTab); pendingTab = 'hub';
  checkTitles();
  try { if (!localStorage.getItem('gh_help')) { localStorage.setItem('gh_help', '1'); setTimeout(openHelp, 700); } } catch (e) {}
}
async function refreshMe(){
  const { data:{ user } } = await sb.auth.getUser();
  ({ data: me } = await sb.from('profiles').select('*').eq('id', user.id).single());
  countTo($('#coins'), me.coins); $('#me').innerHTML = esc(me.username) + ' ' + titleChip(me.title_id);
  let { data: up, error: ue } = await sb.from('user_pets').select('stage, pets(perk,perk_value)');
  if (ue) ({ data: up } = await sb.from('user_pets').select('pets(perk,perk_value)'));
  perks = {}; (up || []).forEach(({ stage = 1, pets: q }) => { const e = effv(q.perk_value, stage); perks[q.perk] = Math.max(perks[q.perk] || 0, e); });
}

// ---------- Điều hướng ----------
document.querySelectorAll('.tab').forEach(b => b.onclick = () => go(b.dataset.v));
function go(v){
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.v === v));
  cur = v; const vw = $('#view'); vw.classList.remove('enter'); void vw.offsetWidth; vw.classList.add('enter');
  ({ hub, rank, quest, pets, titles: titlesView })[v]();
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
    (rows.length ? rows.map((r, i) => `<div class="row glass ${r.username === me.username ? 'me' : ''}"><span>${medal[i] || '#' + (i + 1)} ${esc(r.username)} ${titleChip(r.title)}${r.username === me.username ? ' ⭐' : ''}</span><span><b>${mode === 'best' ? r.best : r.wins + ' thắng'}</b> <small>${mode === 'best' ? r.wins + ' thắng' : 'cao nhất ' + r.best} · ${r.plays} ván</small></span></div>`).join('') : '<p>Chưa có ai ghi điểm. Hãy là người đầu tiên!</p>') + '</div>';
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
    if (!error) { await refreshMe(); quest(); checkTitles(); }
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
const titleChip = (id) => (id && TITLES[id]) ? `<span class="ttl tt-${TITLES[id].rarity}">${esc(TITLES[id].name)}</span>` : '';
async function checkTitles(){
  const { data, error } = await sb.rpc('check_titles'); if (error || !data || !data.length) return;
  await refreshMe(); data.forEach((t, i) => setTimeout(() => titleBanner(t), i * 3000));
}
function titleBanner(t){
  const info = TITLES[t.id] || t, d = document.createElement('div'); d.className = 'tbanner';
  d.innerHTML = `<small>🏆 Danh hiệu mới!</small><span class="ttl tt-${info.rarity}">${esc(info.name)}</span><small>${esc(info.descr || '')}</small>`;
  document.body.append(d); setTimeout(() => d.remove(), 3300);
  if (['epic', 'legendary', 'mythic'].includes(info.rarity)) confetti(info.rarity === 'epic' ? 25 : 60, [GLOW[info.rarity], '#ffd166', '#ffffff']);
}
function guideHTML(id, G){
  const H = HELP.games[id]; if (!H) return `<p style="text-align:left">${esc(G.guide)}</p>`;
  const lv = G.levels ? `<li>⭐ <b>Màn chơi:</b> ${G.levels.map(l => `${l.name} (×${l.mult})`).join(' · ')} — điểm được nhân hệ số màn.</li>` : '';
  const pk = (HELP.perks[id] || []).map(k => `<span class="skillchip">${SKILLS[k].n}</span>`).join(' ');
  return `<ul class="gl"><li>🎮 <b>Điều khiển:</b> ${esc(H.keys)}</li><li>🎯 <b>Mục tiêu:</b> ${esc(H.goal)}</li>${H.tips.map(t => `<li>💡 ${esc(t)}</li>`).join('')}${lv}${pk ? `<li>🐾 <b>Kỹ năng thú cưng áp dụng:</b> ${pk}</li>` : ''}</ul>`;
}
function openHelp(){
  openModal('<h2>❓ Hướng dẫn</h2>' + HELP.topics.map((t, i) => `<details ${i === 0 ? 'open' : ''}><summary>${t.t}</summary>${t.h}</details>`).join(''));
}

// ---------- Thú cưng: kỹ năng + tiến hóa ----------
async function pets(){
  let { data, error } = await sb.from('user_pets').select('stage, shards, pets(*)'), legacy = false;
  if (error) { ({ data } = await sb.from('user_pets').select('pets(*)')); data = (data || []).map(x => ({ ...x, stage: 1, shards: 0 })); legacy = true; }
  data = data || []; petCache = Object.fromEntries(data.map(x => [x.pets.id, x.pets]));
  const ORD = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4, secret: 5 };
  data.sort((a, b) => ORD[b.pets.rarity] - ORD[a.pets.rarity] || b.stage - a.stage);
  const pe = me.pity_epic || 0, pl = me.pity_leg || 0, lk = perks.lucky || 0, eat = Math.max(5, 10 - lk), lat = Math.max(25, 50 - lk * 5);
  $('#view').innerHTML = `<div class="glass" style="padding:1.2rem;text-align:center"><div class="egg">🥚</div>
    <button class="btn" id="roll" ${me.coins < 100 ? 'disabled' : ''}>🎁 Quay Gacha (🪙100)</button>
    <div class="pity"><small>Sử thi+ chắc chắn sau <b>${Math.max(0, eat - pe)}</b> lượt</small><div class="bar"><i style="width:${Math.min(100, pe / eat * 100)}%"></i></div>
    <small>Huyền thoại+ chắc chắn sau <b>${Math.max(0, lat - pl)}</b> lượt</small><div class="bar"><i style="width:${Math.min(100, pl / lat * 100)}%"></i></div></div></div>
    <h3>Bộ sưu tập (${data.length}) <small>· trùng thú = +1 mảnh tiến hóa</small></h3><div class="grid">` + data.map(({ pets: p, stage, shards }, n) => {
    const need = EVO_NEED[stage], cost = EVO_COST[stage], can = !legacy && stage < 3 && shards >= need && me.coins >= cost, sk = SKILLS[p.perk] || { n: p.perk, d: () => '' };
    return `<div class="card glass pet st${stage}" style="--i:${n};--gc:${GLOW[p.rarity]}"><div class="stars">${'★'.repeat(stage)}${'☆'.repeat(3 - stage)}</div>
      <div class="e">${p.emoji}</div><h3>${esc(p.name)}</h3><b class="r-${p.rarity}">${RARITY[p.rarity]} · ${STAGE_NAMES[stage - 1]}</b>
      <div class="sk"><b>${sk.n}</b><small>${sk.d(effv(p.perk_value, stage))}</small>${stage < 3 ? `<small class="nx">Bậc kế: ${sk.d(effv(p.perk_value, stage + 1))}</small>` : ''}</div>
      ${stage < 3 ? `<div class="bar"><i style="width:${Math.min(100, shards / need * 100)}%"></i></div><small>Mảnh ${shards}/${need} · 🪙${cost}</small><button class="btn evo" data-p="${p.id}" ${can ? '' : 'disabled'}>⚡ Tiến hóa</button>` : '<small class="max">✨ Bậc tối đa</small>'}</div>`;
  }).join('') + '</div>';
  document.querySelectorAll('.card').forEach(tilt);
  $('#roll').onclick = roll;
  document.querySelectorAll('.evo').forEach(b => b.onclick = () => evolve(+b.dataset.p));
}
async function evolve(id){
  const { data: r, error } = await sb.rpc('evolve_pet', { p_pet: id });
  if (error) { toast('Chưa đủ mảnh hoặc xu để tiến hóa'); return go('pets'); }
  const p = petCache[id], gc = GLOW[p.rarity];
  openModal(`<div class="gstage" style="--gc:${gc}"><div class="evo-aura"><div class="evo-pet">${p.emoji}</div></div><p>Đang tiến hóa…</p></div>`);
  await sleep(1700);
  const f = document.createElement('div'); f.id = 'flash'; document.body.append(f); setTimeout(() => f.remove(), 800);
  confetti(r.stage === 3 ? 80 : 40, [gc, '#ffd166', '#ffffff']); await refreshMe();
  const sk = SKILLS[p.perk];
  setBox(`<div class="gstage evo-done" style="--gc:${gc}"><div class="evo-aura calm"><div class="evo-pet big">${r.stage === 3 ? '<i class="crown">👑</i>' : ''}${p.emoji}${r.stage === 2 ? '<i class="spark">✨</i>' : ''}</div></div>
    <h2>${esc(p.name)}</h2><b class="r-${p.rarity}">${STAGE_NAMES[r.stage - 1]} · Bậc ${r.stage}/3</b><p><b>${sk.n}</b>: ${sk.d(effv(p.perk_value, r.stage))}</p><button class="btn" id="again">Tuyệt vời!</button></div>`);
  $('#again').onclick = closeGame; checkTitles();
}
async function titlesView(){
  const { data: mine } = await sb.from('user_titles').select('title_id'), have = new Set((mine || []).map(x => x.title_id)), list = Object.values(TITLES).sort((a, b) => a.sort - b.sort);
  if (!list.length) { $('#view').innerHTML = '<div class="glass" style="padding:1rem">Danh hiệu chưa sẵn sàng.</div>'; return; }
  $('#view').innerHTML = `<div class="glass" style="padding:1rem">Đang dùng: ${titleChip(me.title_id) || '<small>chưa chọn</small>'} · Đã mở khóa <b>${have.size}/${list.length}</b></div><div class="grid" style="margin-top:1rem">` +
    list.map((t, n) => { const ok = have.has(t.id), eq = me.title_id === t.id;
      return `<div class="card glass tcard ${ok ? '' : 'locked'}" style="--i:${n}"><div class="e">${ok ? '🏅' : '🔒'}</div><span class="ttl tt-${t.rarity}">${esc(t.name)}</span><small>${esc(t.descr)}</small>` +
        (ok ? `<button class="btn ${eq ? 'alt' : ''}" data-t="${t.id}" ${eq ? 'disabled' : ''}>${eq ? '✓ Đang dùng' : 'Trang bị'}</button>` : '<small>Chưa mở khóa</small>') + '</div>'; }).join('') + '</div>';
  document.querySelectorAll('.card').forEach(tilt);
  document.querySelectorAll('[data-t]').forEach(b => b.onclick = async () => { await sb.rpc('equip_title', { p_title: b.dataset.t }); await refreshMe(); titlesView(); });
}
async function roll(){
  const b = $('#roll'); if (b) b.disabled = true;
  const { data: r, error } = await sb.rpc('gacha_roll');
  if (error) { toast('Không đủ xu hoặc có lỗi, thử lại nhé'); return go('pets'); }
  const p = r.pet, gc = GLOW[p.rarity], big = ['epic', 'legendary', 'mythic', 'secret'].includes(p.rarity), stg = r.stage || 1;
  openModal(`<div class="gstage" style="--gc:${gc}"><div class="gegg shake" id="ge">🥚</div><p>Đang ấp trứng…</p></div>`);
  await sleep(1400); $('#ge')?.classList.replace('shake', 'crack'); await sleep(450);
  if (['mythic', 'secret'].includes(p.rarity)) { const f = document.createElement('div'); f.id = 'flash'; document.body.append(f); setTimeout(() => f.remove(), 800); }
  if (big) confetti(p.rarity === 'epic' ? 30 : 70, [gc, '#ffd166', '#ffffff']);
  await refreshMe();
  const sk = SKILLS[p.perk] || { n: p.perk, d: () => '' }, dup = r.isnew ? '✨ Thú mới!' : `Đã có rồi: <b>+1 mảnh tiến hóa</b> (${r.shards}/${EVO_NEED[stg] || 'MAX'}) · hoàn 🪙${r.refund}`;
  setBox(`<div class="gstage" style="--gc:${gc}"><div class="flip"><div class="face"><div style="font-size:4.5rem">${p.emoji}</div><h2>${esc(p.name)}</h2><b class="r-${p.rarity}">${RARITY[p.rarity]}</b><small><b>${sk.n}</b>: ${sk.d(effv(p.perk_value, stg))}</small></div></div>
    <p>${dup}</p><p><small>Sử thi+ sau ${Math.max(0, (r.epic_at || 10) - r.pity_epic)} lượt · Huyền thoại+ sau ${Math.max(0, (r.leg_at || 50) - r.pity_leg)} lượt</small></p>
    <button class="btn" id="again" ${me.coins < 100 ? 'disabled' : ''}>Quay tiếp (🪙100)</button></div>`);
  $('#again').onclick = () => { closeModal(); setTimeout(roll, 280); }; checkTitles();
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
  let lv = 0; const g = games.find(x => x.id === id), G = Games[id], seen = (() => { try { return localStorage.getItem('gh_g_' + id); } catch (e) { return null; } })();
  if (!G) return openModal(`<h2>${g.emoji} ${esc(g.name)}</h2><p>Game này đang được xây dựng. Quay lại sau nhé!</p>`);
  openModal(`<h2>${g.emoji} ${esc(g.name)}</h2><details id="gd" ${seen ? '' : 'open'}><summary>📖 Hướng dẫn</summary>${guideHTML(id, G)}</details>
    ${G.levels ? `<div class="lvl">${G.levels.map((l, k) => `<button class="tab" data-l="${k}" aria-selected="${k === 0}">${l.name}</button>`).join("")}</div>` : ""}
    <button class="btn" id="go">▶ Bắt đầu</button><p id="hud"></p><div id="arena"></div>`);
  document.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { lv = +b.dataset.l; document.querySelectorAll('[data-l]').forEach(x => x.setAttribute('aria-selected', x === b)); });
  $('#go').onclick = async () => {
    const mult = G.levels?.[lv]?.mult ?? 1;
    document.querySelectorAll('.lvl').forEach(x => x.classList.add('hidden'));
    try { localStorage.setItem('gh_g_' + id, '1'); } catch (e) {}
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
        stopGame?.(); stopGame = null; score = Math.round(score * mult * (1 + (perks.score_boost || 0) / 100));
        const { data: earned } = await sb.rpc('submit_score', { p_game: id, p_score: score, p_won: won });
        await refreshMe(); checkTitles();
        if (won) confetti(50);
        setBox(`<h2>${won ? 'Chiến thắng! 🎉' : 'Hết lượt! 💫'}</h2><p style="font-size:1.3rem">Điểm: <b>${score}</b></p><p>Nhận 🪙 <b>${earned ?? 0}</b></p><button class="btn" id="again">Chơi lại</button>`);
        $('#again').onclick = () => openGame(id);
      }
    };
    stopGame = G.start($('#arena'), apiObj, lv);
  };
}

$('#helpBtn').onclick = openHelp;
boot();
