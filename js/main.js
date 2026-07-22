// ============================================================
// GGS ARENA — orchestrator
// Routing view, mount game, render leaderboard, submit skor.
// ============================================================

import { $, $$, esc, qp, postToParent, isTouchOnly } from './util.js';
import { submitScore, getLeaderboard, getRank, onNewScore, seedDemo, clearDemo } from './store.js';
import { isMuted, toggleMute } from './fx.js';
import { createAimGame } from './games/aim.js';
import { createTypingGame } from './games/typing.js';
import { createReactionGame } from './games/reaction.js';
import { createCpsGame } from './games/cps.js';

const GAME_META = {
  aim:      { label: 'Aim Trainer',   unit: 'PTS', factory: createAimGame },
  typing:   { label: 'Typing Test',   unit: 'PTS', factory: createTypingGame },
  reaction: { label: 'Reaction Time', unit: 'PTS', factory: createReactionGame },
  cps:      { label: 'CPS Test',      unit: 'KLIK', factory: createCpsGame },
};

const instances = {};   // game instances (lazy)
let currentView = 'hub';

// ---------- Embed mode ----------
if (qp('embed') === '1') document.body.classList.add('embed');

// Bulan berjalan (YYYY-MM) buat recap bulanan
const currentMonth = () => new Date().toISOString().slice(0, 7);

// ---------- Leaderboard rendering ----------
// URL search GoodGamingShop — ganti sesuai platform toko (Shopify default: /search?q=)
const GGS_SEARCH = (q) => `https://goodgamingshop.com/search?q=${encodeURIComponent(q)}`;
// gear yang berupa produk -> jadiin link CTA ke toko
function gearLink(name) {
  return `<a class="gear-link" href="${esc(GGS_SEARCH(name))}" target="_blank" rel="noopener noreferrer sponsored" title="Cari '${esc(name)}' di GoodGamingShop">${esc(name)}</a>`;
}

// return HTML (produk = link, spek = teks biasa)
function gearLine(game, d = {}) {
  const parts = [];
  if (game === 'aim' || game === 'reaction') {
    if (d.mouse) parts.push(gearLink(d.mouse));
    if (d.mousepad) parts.push(gearLink(d.mousepad));
    if (d.glide) parts.push(gearLink(d.glide));
    if (d.dpi) parts.push(esc(`${d.dpi} DPI`));
    if (d.win_sens) parts.push(esc(`WinSens ${d.win_sens}`));
    if (d.polling) parts.push(esc(`${d.polling}Hz`));
  }
  if (game === 'typing') {
    if (d.keyboard) parts.push(gearLink(d.keyboard));
    if (d.switches) parts.push(gearLink(d.switches));
  }
  if (game === 'cps') {
    if (d.mouse) parts.push(gearLink(d.mouse));
    if (d.switches) parts.push(gearLink(d.switches));
    if (d.polling) parts.push(esc(`${d.polling}Hz`));
    if (d.technique) parts.push(esc(d.technique));
  }
  if (d.discord) parts.push(esc(d.discord));
  return parts.join(' · ');
}

function scoreSub(game, d = {}) {
  if (game === 'aim') return `${d.accuracy ?? 0}% · x${d.max_combo ?? 1}`;
  if (game === 'typing') return `${d.wpm ?? 0} WPM · ${d.accuracy ?? 0}%`;
  if (game === 'reaction') return `${d.avg_ms ?? '—'}ms avg`;
  if (game === 'cps') return `${d.cps ?? 0} CPS`;
  return '';
}

// ---------- Papan leaderboard lengkap per station (langsung di hub) ----------
const MEDALS = ['🥇', '🥈', '🥉'];
function lbRowHTML(game, r, i) {
  const rank = i < 3
    ? `<span class="medal">${MEDALS[i]}</span>`
    : String(i + 1).padStart(2, '0');
  return `
    <div class="lb-row ${i === 0 ? 'champ' : ''}">
      <div class="rank ${i < 3 ? 'top' : ''}">${rank}</div>
      <div class="who">
        <div class="nm">${esc(r.player_name)}</div>
        <div class="gear">${gearLine(game, r.detail)}</div>
      </div>
      <div class="score">${esc(r.score)} <small>${esc(scoreSub(game, r.detail))}</small></div>
    </div>`;
}
async function renderHubBoard(game) {
  const box = $(`.hub-board[data-hub="${game}"]`);
  if (!box) return;
  // inject toggle All-time / Bulan Ini sekali
  if (!box.dataset.scopeBuilt) {
    const seg = document.createElement('div');
    seg.className = 'hb-scope';
    seg.innerHTML = `<div class="seg seg-sm" data-hubscope>
      <button data-s="all" class="active">All-time</button>
      <button data-s="month">Bulan Ini</button>
    </div>`;
    $('.hb-hd', box).insertAdjacentElement('afterend', seg);
    box.dataset.scopeBuilt = '1';
    box.dataset.scope = 'all';
    seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      seg.querySelectorAll('button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      box.dataset.scope = b.dataset.s;
      renderHubBoard(game);
    }));
  }
  const list = $('[data-hublist]', box);
  const count = $('.hb-count', box);
  const month = box.dataset.scope === 'month' ? currentMonth() : null;
  const rows = await getLeaderboard({ game, eventId: null, month, limit: 100 });
  if (count) count.textContent = rows.length ? `${rows.length} SKOR` : '';
  if (!rows.length) {
    list.innerHTML = `<div class="lb-empty">${month ? 'Belum ada skor bulan ini.' : 'Belum ada yang nyoba.'}<br>Jadi #01 — sikat sekarang 🔥</div>`;
    return;
  }
  list.innerHTML = rows.map((r, i) => lbRowHTML(game, r, i)).join('');
}
function renderAllHubBoards() { Object.keys(GAME_META).forEach(renderHubBoard); }

// ---------- Sponsor slots ----------
// Isi array ini buat nampilin sponsor (kiri→kanan). Kosongin = tampil placeholder.
// Contoh: { name:'Brand X', img:'assets/sponsors/brandx.png', url:'https://brandx.com' }
const SPONSORS = [
  // >>> CONTOH sponsor (biar keliatan perspektifnya) — ganti/isi punya lo <<<
  { name: 'VOLTZ',    img: 'assets/sponsors/sponsor-1.svg', url: 'https://goodgamingshop.com' },
  { name: 'GLIDR',    img: 'assets/sponsors/sponsor-2.svg', url: 'https://goodgamingshop.com' },
  { name: 'APEXKEYS', img: 'assets/sponsors/sponsor-3.svg', url: 'https://goodgamingshop.com' },
];
function renderSponsors() {
  const grid = $('#sponsors');
  if (!grid) return;
  let html = '';
  for (let i = 0; i < 3; i++) {
    const s = SPONSORS[i];
    if (s && s.img) {
      const inner = `<img src="${esc(s.img)}" alt="${esc(s.name || 'Sponsor')}">`;
      html += `<div class="sponsor-slot filled">${
        s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer sponsored">${inner}</a>` : `<span class="inner">${inner}</span>`
      }</div>`;
    } else {
      html += `<div class="sponsor-slot">
        <div>
          <div class="ph-no">SLOT ${String(i + 1).padStart(2, '0')}</div>
          <div class="ph-txt">Ruang sponsor — colek GGS 📩</div>
        </div>
      </div>`;
    }
  }
  grid.innerHTML = html;
}

async function renderBoard(game) {
  const panel = $(`.lb-panel[data-lb="${game}"]`);
  if (!panel) return;
  if (!panel.dataset.built) {
    panel.innerHTML = `
      <div class="panel">
        <div class="panel-hd">
          <h3><svg class="ico-xs"><use href="#ico-trophy"/></svg>Leaderboard</h3>
          <div class="seg seg-sm" data-scope>
            <button data-s="all" class="active">All-time</button>
            <button data-s="month">Bulan Ini</button>
            <button data-s="event" disabled title="Aktif saat ada event (Tahap 3)">Event</button>
          </div>
        </div>
        <div class="panel-bd" style="padding:8px 12px">
          <div class="lb" data-board></div>
        </div>
      </div>`;
    panel.dataset.built = '1';
    panel.dataset.scope = 'all';
    $$('[data-scope] button', panel).forEach((b) =>
      b.addEventListener('click', () => {
        if (b.disabled) return;
        $$('[data-scope] button', panel).forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        panel.dataset.scope = b.dataset.s;
        renderBoard(game);
      })
    );
  }

  const scope = panel.dataset.scope || 'all';
  const eventId = scope === 'event' ? (window.__ggsActiveEventId || null) : null;
  const month = scope === 'month' ? currentMonth() : null;
  const rows = await getLeaderboard({ game, eventId, month });
  const board = $('[data-board]', panel);

  if (!rows.length) {
    board.innerHTML = `<div class="lb-empty">${month ? 'Belum ada skor bulan ini.' : 'Belum ada skor.'} Jadi yang pertama — sikat! 🔥</div>`;
    return;
  }
  board.innerHTML = rows.map((r, i) => lbRowHTML(game, r, i)).join('');
}

// ---------- Leaderboard semua station (view "board") ----------
const BOARD_ICONS = { aim: '#ico-aim', typing: '#ico-typing', reaction: '#ico-reaction', cps: '#ico-cps' };
let boardScope = 'all';
async function renderBoardView() {
  const grid = $('#board-grid');
  if (!grid) return;
  const month = boardScope === 'month' ? currentMonth() : null;
  const panels = await Promise.all(Object.keys(GAME_META).map(async (game) => {
    const rows = await getLeaderboard({ game, eventId: null, month, limit: 50 });
    const body = rows.length
      ? rows.map((r, i) => lbRowHTML(game, r, i)).join('')
      : `<div class="lb-empty">${month ? 'Belum ada skor bulan ini.' : 'Belum ada skor.'} Sikat! 🔥</div>`;
    return `
      <div class="panel">
        <div class="panel-hd">
          <h3><svg class="ico-xs"><use href="${BOARD_ICONS[game]}"/></svg>${esc(GAME_META[game].label)}</h3>
          <span class="micro">${rows.length ? rows.length + ' SKOR' : ''}</span>
        </div>
        <div class="panel-bd" style="padding:8px 12px">
          <div class="lb board-lb">${body}</div>
        </div>
      </div>`;
  }));
  grid.innerHTML = panels.join('');
}
$$('#board-scope button').forEach((b) => b.addEventListener('click', () => {
  $$('#board-scope button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  boardScope = b.dataset.s;
  renderBoardView();
}));

// ---------- Panel hero: top 5 skor bulan ini (gabungan semua game) ----------
async function renderMonthTop() {
  const box = $('#month-top');
  if (!box) return;
  const month = currentMonth();
  const per = await Promise.all(Object.keys(GAME_META).map((g) => getLeaderboard({ game: g, month, limit: 5 })));
  const rows = per.flat().sort((a, b) => b.score - a.score).slice(0, 5);
  if (!rows.length) {
    box.innerHTML = '<div class="mt-empty">Belum ada skor bulan ini — jadi yang pertama 🔥</div>';
    return;
  }
  box.innerHTML = rows.map((r, i) => `
    <div class="mt-row ${i === 0 ? 'first' : ''}">
      <span class="no">${i + 1}</span>
      <span class="md">${i < 3 ? MEDALS[i] : '·'}</span>
      <span class="nm">${esc(r.player_name)}</span>
      <span class="sc">${esc(r.score)}</span>
    </div>`).join('');
}

// ---------- Submit handler (dishare ke semua game) ----------
async function handleSubmit(entry) {
  entry.event_id = window.__ggsActiveEventId || null;
  const res = await submitScore(entry);
  if (res.ok) {
    postToParent({ game: entry.game, payload: res.row });
    renderBoard(entry.game);
    renderHubBoard(entry.game);
    renderMonthTop();
    // posisi lo #X dari Y (all-time)
    try {
      const { rank, total } = await getRank({ game: entry.game, score: res.row.score });
      res.rank = rank; res.total = total;
    } catch { /* no-op */ }
  }
  return res;
}

// ---------- Routing ----------
function showView(name) {
  const prev = currentView;
  if (prev && prev !== name && instances[prev]) instances[prev].deactivate();

  $$('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === name));
  currentView = name;

  if (GAME_META[name]) {
    if (!instances[name]) {
      const mount = document.getElementById('mount-' + name);
      instances[name] = GAME_META[name].factory({ mountEl: mount, onSubmit: handleSubmit });
    }
    instances[name].activate();
    renderBoard(name);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (name === 'board') {
    renderBoardView();      // leaderboard semua station
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    renderAllHubBoards();   // refresh papan pas balik ke hub
  }
  // sinkron ke hash biar bisa di-share / back button
  const hash = name === 'hub' ? '' : '#' + name;
  if (location.hash !== hash) history.replaceState(null, '', hash || location.pathname + location.search);
}

// station card / keyboard nav
$$('.station').forEach((s) => {
  s.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showView(s.dataset.open); } });
});
// semua elemen dgn [data-open] (station card + tombol "Papan lengkap") buka game-nya
$$('[data-open]').forEach((el) => el.addEventListener('click', () => showView(el.dataset.open)));
$$('[data-back]').forEach((b) => b.addEventListener('click', () => showView('hub')));

// ---------- Boot ----------

// Pemain layar sentuh (HP/tablet): kasih tau DI DEPAN soal aturan leaderboard
if (isTouchOnly()) { const tn = $('#touch-notice'); if (tn) tn.hidden = false; }

// Data demo: ?demo=1 isi 5 pemain di semua station · ?demo=off hapus demo
const demoFlag = qp('demo');
if (demoFlag === '1') {
  const { DEMO } = await import('./demo-data.js');
  await seedDemo(DEMO);
} else if (demoFlag === 'off') {
  await clearDemo();
}

renderSponsors();
renderAllHubBoards();
renderMonthTop();

// ---------- Footer: mute toggle ----------
const muteBtn = $('#mute-toggle');
if (muteBtn) {
  const paint = () => { muteBtn.textContent = isMuted() ? '🔇 Suara: Off' : '🔊 Suara: On'; };
  paint();
  muteBtn.addEventListener('click', () => { toggleMute(); paint(); });
}

// Realtime (mode Supabase): skor pemain lain masuk -> papan langsung ke-refresh
onNewScore((row) => {
  renderHubBoard(row.game);
  renderBoard(row.game);
  renderMonthTop();
  if (currentView === 'board') renderBoardView();
});

const initial = (location.hash || '').replace('#', '');
showView(GAME_META[initial] || initial === 'board' ? initial : 'hub');
