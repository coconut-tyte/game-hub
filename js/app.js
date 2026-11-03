const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = (s) => document.querySelector(s);
const esc = (t) => Object.assign(document.createElement('i'), { textContent: t }).innerHTML;
const RARITY = { common:'Thường', rare:'Hiếm', epic:'Sử thi', legendary:'Huyền thoại', mythic:'Thần thoại', secret:'Secret' };
const GUIDE = { fps:'Bấm vào mục tiêu xuất hiện ngẫu nhiên trong 15 giây. Mục tiêu 🎯 +1, vàng ⭐ +3.' };
let me = null, games = [], perks = {};
const PERK = { coin_bonus:v=>`+${v}% xu nhận được`, extra_life:v=>`+${v} mạng/khiên khởi đầu`, score_boost:v=>`+${v}% điểm Bắn Súng`, bonus_time:v=>`+${v}s thời gian Pikachu` };

// ---------- Loading ----------
function progress(p){ $('#prog').style.width = p + '%'; }
async function boot(){
  progress(30);
  const { data:{ session } } = await sb.auth.getSession();
  progress(70);
  if (session) await enter(); else show('auth');
  progress(100);
  setTimeout(() => { $('#loading').style.opacity = 0; setTimeout(() => $('#loading').remove(), 400); }, 250);
}
function show(id){ $('#auth').classList.toggle('hidden', id !== 'auth'); $('#app').classList.toggle('hidden', id !== 'app'); }

// ---------- Auth (tên đăng nhập -> email ảo) ----------
const mail = (u) => `${u.toLowerCase()}@gamehub.app`;
function creds(){
  const u = $('#u').value.trim(), p = $('#p').value;
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(u)) { $('#authMsg').textContent = 'Tên đăng nhập 3–16 ký tự: chữ, số, _'; return null; }
  if (p.length < 6) { $('#authMsg').textContent = 'Mật khẩu cần ít nhất 6 ký tự'; return null; }
  return { u, p };
}
$('#signup').onclick = async () => {
  const c = creds(); if (!c) return;
  const { error } = await sb.auth.signUp({ email: mail(c.u), password: c.p, options:{ data:{ username: c.u.toLowerCase() } } });
  if (error) $('#authMsg').textContent = error.message.includes('registered') ? 'Tên này đã có người dùng' : error.message;
  else await enter();
};
$('#login').onclick = async () => {
  const c = creds(); if (!c) return;
  const { error } = await sb.auth.signInWithPassword({ email: mail(c.u), password: c.p });
  if (error) $('#authMsg').textContent = 'Sai tên đăng nhập hoặc mật khẩu'; else await enter();
};
$('#logout').onclick = async () => { await sb.auth.signOut(); location.reload(); };

async function enter(){
  await refreshMe();
  ({ data: games } = await sb.from('games').select('*'));
  show('app'); go('hub');
}
async function refreshMe(){
  const { data:{ user } } = await sb.auth.getUser();
  ({ data: me } = await sb.from('profiles').select('*').eq('id', user.id).single());
  $('#coins').textContent = me.coins; $('#me').textContent = me.username;
  const { data: up } = await sb.from('user_pets').select('pets(perk,perk_value)');
  perks = {}; (up || []).forEach(({ pets: q }) => perks[q.perk] = Math.max(perks[q.perk] || 0, q.perk_value));
}

// ---------- Điều hướng ----------
document.querySelectorAll('.tab').forEach(b => b.onclick = () => go(b.dataset.v));
function go(v){
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b.dataset.v === v));
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
  $('#view').innerHTML = '<div class="grid">' + games.map(g =>
    `<div class="card glass" data-g="${esc(g.id)}" tabindex="0"><div class="e">${g.emoji}</div><h3>${esc(g.name)}</h3><small>${Games[g.id] ? 'Chơi ngay' : 'Sắp có'}</small></div>`).join('') + '</div>';
  document.querySelectorAll('.card').forEach(c => { tilt(c); c.onclick = () => openGame(c.dataset.g); });
}
async function rank(sel = games[0].id){
  const { data } = await sb.from('scores').select('score, won, profiles(username)').eq('game_id', sel).order('score', { ascending:false }).limit(10);
  $('#view').innerHTML = `<div class="glass" style="padding:1rem"><select id="gsel" class="pill">${games.map(g => `<option value="${esc(g.id)}" ${g.id===sel?'selected':''}>${g.emoji} ${esc(g.name)}</option>`).join('')}</select>` +
    (data.length ? data.map((r,i) => `<div class="row glass"><span>#${i+1} ${esc(r.profiles.username)}</span><b>${r.score}</b></div>`).join('') : '<p>Chưa có ai ghi điểm. Hãy là người đầu tiên!</p>') + '</div>';
  $('#gsel').onchange = (e) => rank(e.target.value);
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
async function pets(){
  const { data } = await sb.from('user_pets').select('pets(*)');
  $('#view').innerHTML = `<div class="glass" style="padding:1.2rem;text-align:center"><button class="btn" id="roll" ${me.coins<100?'disabled':''}>🎁 Quay Gacha (🪙100)</button><div id="got" style="font-size:1.2rem;min-height:3rem;margin-top:.8rem"></div></div>
    <h3>Bộ sưu tập (${data.length})</h3><div class="grid">` + data.map(({ pets:p }) =>
    `<div class="card glass"><div class="e">${p.emoji}</div><h3>${esc(p.name)}</h3><b class="r-${p.rarity}">${RARITY[p.rarity]}</b><br><small>${(PERK[p.perk] || (() => ''))(p.perk_value)}</small></div>`).join('') + '</div>';
  document.querySelectorAll('.card').forEach(tilt);
  $('#roll').onclick = async () => {
    const { data:p, error } = await sb.rpc('gacha_roll');
    if (error) return $('#got').textContent = 'Không đủ xu!';
    await refreshMe(); pets();
    setTimeout(() => $('#got').innerHTML = `Bạn nhận được ${p.emoji} <b class="r-${p.rarity}">${esc(p.name)} (${RARITY[p.rarity]})</b>!`, 50);
  };
}

// ---------- Khung chơi game (dùng chung) ----------
let stopGame = null;
function openGame(id){
  const g = games.find(x => x.id === id), G = Games[id];
  $('#modal').classList.remove('hidden');
  if (!G){
    $('#box').innerHTML = `<h2>${g.emoji} ${esc(g.name)}</h2><p>Game này đang được xây dựng.</p><button class="btn" id="x">Đóng</button>`;
    return $('#x').onclick = closeGame;
  }
  $('#box').innerHTML = `<h2>${g.emoji} ${esc(g.name)}</h2><p>${esc(G.guide)}</p><div id="arena"></div><p id="hud"></p><button class="btn" id="go">Bắt đầu</button> <button class="btn alt" id="x">Thoát</button>`;
  $('#x').onclick = closeGame;
  $('#go').onclick = () => {
    $('#go').classList.add('hidden');
    stopGame = G.start($('#arena'), {
      perks,
      setHud: (t) => { const h = $('#hud'); if (h) h.textContent = t; },
      finish: async (score, won) => {
        stopGame?.(); stopGame = null;
        const { data: earned } = await sb.rpc('submit_score', { p_game: id, p_score: score, p_won: won });
        await refreshMe();
        $('#box').innerHTML = `<h2>${won ? 'Chiến thắng! 🎉' : 'Hết lượt! 💫'}</h2><p>Điểm: <b>${score}</b> · Nhận 🪙${earned ?? 0}</p><button class="btn" id="x">Về Hub</button>`;
        $('#x').onclick = closeGame;
      }
    });
  };
}
function closeGame(){ stopGame?.(); stopGame = null; $('#modal').classList.add('hidden'); go('hub'); }

boot();
