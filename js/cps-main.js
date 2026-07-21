// ============================================================
// CPS TEST — orchestrator halaman terpisah (cps.html)
// Mount game, leaderboard sendiri (game: 'cps'), mode embed.
// ============================================================

import { $, $$, esc, qp, postToParent, isTouchOnly } from './util.js';
import { submitScore, getLeaderboard, getRank, onNewScore, BACKEND } from './store.js';
import { createCpsGame } from './games/cps.js';

if (qp('embed') === '1') document.body.classList.add('embed');

const currentMonth = () => new Date().toISOString().slice(0, 7);
const MEDALS = ['🥇', '🥈', '🥉'];
const GGS_SEARCH = (q) => `https://goodgamingshop.com/search?q=${encodeURIComponent(q)}`;
const gearLink = (name) =>
  `<a class="gear-link" href="${esc(GGS_SEARCH(name))}" target="_blank" rel="noopener noreferrer sponsored">${esc(name)}</a>`;

function gearLine(d = {}) {
  const parts = [];
  if (d.mouse) parts.push(gearLink(d.mouse));
  if (d.switches) parts.push(gearLink(d.switches));
  if (d.polling) parts.push(esc(`${d.polling}Hz`));
  if (d.technique) parts.push(esc(d.technique));
  if (d.discord) parts.push(esc(d.discord));
  return parts.join(' · ');
}

let scope = 'all';
async function renderBoard() {
  const board = $('#cps-board');
  const month = scope === 'month' ? currentMonth() : null;
  const rows = await getLeaderboard({ game: 'cps', month, limit: 100 });
  if (!rows.length) {
    board.innerHTML = `<div class="lb-empty">${month ? 'Belum ada skor bulan ini.' : 'Belum ada skor.'} Jadi #01 — sikat! 🔥</div>`;
    return;
  }
  board.innerHTML = rows.map((r, i) => `
    <div class="lb-row ${i === 0 ? 'champ' : ''}">
      <div class="rank ${i < 3 ? 'top' : ''}">${i < 3 ? `<span class="medal">${MEDALS[i]}</span>` : String(i + 1).padStart(2, '0')}</div>
      <div class="who">
        <div class="nm">${esc(r.player_name)}</div>
        <div class="gear">${gearLine(r.detail)}</div>
      </div>
      <div class="score">${esc(r.score)} <small>${esc((r.detail?.cps ?? 0) + ' CPS')}</small></div>
    </div>`).join('');
}

$$('#cps-scope button').forEach((b) => b.addEventListener('click', () => {
  $$('#cps-scope button').forEach((x) => x.classList.remove('active'));
  b.classList.add('active');
  scope = b.dataset.s;
  renderBoard();
}));

async function handleSubmit(entry) {
  const res = await submitScore(entry);
  if (res.ok) {
    postToParent({ game: 'cps', payload: res.row });
    renderBoard();
    try {
      const { rank, total } = await getRank({ game: 'cps', score: res.row.score });
      res.rank = rank; res.total = total;
    } catch { /* no-op */ }
  }
  return res;
}

$('#backend-flag').textContent = `BACKEND: ${BACKEND.toUpperCase()}`;
if (isTouchOnly()) { const tn = $('#touch-notice'); if (tn) tn.hidden = false; }
createCpsGame({ mountEl: $('#mount-cps'), onSubmit: handleSubmit });
renderBoard();
onNewScore((row) => { if (row.game === 'cps') renderBoard(); });
