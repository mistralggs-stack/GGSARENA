// ============================================================
// GGS ARENA — Game 02: TYPING TEST (Ketik Cepat)
// 60 detik (1 menit). Wordlist gaming Indonesia — teks ngalir terus,
// nggak abis selama 1 menit (auto-extend tiap buffer menipis).
// Skor = WPM x akurasi (contoh 80 WPM @ 95% = 76).
// ============================================================

import { $, esc, cleanText, toast, shareScore, wireFullscreen } from '../util.js';
import { sfx, confetti, countUp } from '../fx.js';
import { checkRecord } from '../store.js';

const DURATION = 60;          // 1 menit
const REFILL_AT = 90;         // sisa char < ini -> tambah teks baru (biar gak abis)

// Wordlist gaming casual Indonesia
const WORDS = [
  'gacor', 'sikat', 'mabar', 'gaskeun', 'mantul', 'clutch', 'headshot', 'push',
  'rank', 'meta', 'buff', 'nerf', 'respawn', 'cooldown', 'ultimate', 'combo',
  'flick', 'spray', 'recoil', 'aim', 'sens', 'carry', 'jungle', 'roam', 'gank',
  'rungkad', 'cuan', 'rush', 'camping', 'noob', 'pro', 'smurf', 'clutchup',
  'keyboard', 'switch', 'keycaps', 'mouse', 'mousepad', 'polling', 'dpi', 'wireless',
  'lightweight', 'peripheral', 'turnamen', 'juara', 'arena', 'goodgamingshop',
  'ez', 'mid', 'top', 'auto', 'toxic', 'afk', 'wipe', 'poke', 'burst', 'crit',
  'clutchgod', 'onetap', 'tracking', 'micro', 'macro', 'wallbang', 'peek',
];

function buildText(minChars = 300) {
  const arr = [];
  let len = 0;
  while (len < minChars) {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    arr.push(w);
    len += w.length + 1;
  }
  return arr.join(' ');
}

export function createTypingGame(ctx) {
  const root = ctx.mountEl;

  root.innerHTML = `
    <div class="readouts" style="margin-bottom:14px">
      <div class="readout"><div class="r-label">WPM</div><div class="r-val hot" id="typ-wpm">0</div></div>
      <div class="readout"><div class="r-label">Akurasi</div><div class="r-val" id="typ-acc">100%</div></div>
      <div class="readout"><div class="r-label">Skor</div><div class="r-val" id="typ-score">0</div></div>
      <div class="readout"><div class="r-label">Waktu</div><div class="r-val" id="typ-time">60.0</div></div>
    </div>

    <div class="label" style="margin-bottom:8px">STATION 02 · KETIK CEPAT — 1 MENIT (60 DETIK)</div>
    <div class="type-text mono" id="typ-text">Tekan tombol Mulai lalu langsung ketik. Skor = WPM × akurasi. Gaskeun! 🔥</div>
    <input class="type-input mono" id="typ-input" type="text" autocomplete="off" autocapitalize="off"
           autocorrect="off" spellcheck="false" placeholder="Klik di sini terus mulai ngetik..." disabled>

    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
      <button class="btn accent" id="typ-start">▶ Mulai</button>
      <button class="btn ghost" id="typ-stop" disabled>■ Stop</button>
      <button class="btn ghost" id="typ-fs">⛶ Layar Penuh</button>
      <div class="mono" style="font-size:11px;color:var(--ink-3);align-self:center">Typo tetep jalan — jaga akurasi</div>
    </div>

    <div class="modal-overlay" id="typ-result">
      <div class="modal-card">
        <button class="modal-x" id="typ-close" aria-label="Tutup">✕</button>
        <div class="result-hero">
          <div class="r-eyebrow">Hasil · Ketik Cepat</div>
          <div class="r-big" id="typ-hero-score">0</div>
          <div class="r-unit">POIN (WPM × AKURASI)</div>
          <div class="r-record" id="typ-record" hidden>★ REKOR BARU!</div>
          <div class="r-tag" id="typ-hero-tag">Gacor! 🔥</div>
        </div>
        <div class="result-metrics">
          <div class="result-metric"><div class="m-val hot" id="typ-m-wpm">0</div><div class="m-label">WPM</div></div>
          <div class="result-metric"><div class="m-val" id="typ-m-cps">0</div><div class="m-label">Char / Detik</div></div>
          <div class="result-metric"><div class="m-val" id="typ-m-acc">0%</div><div class="m-label">Akurasi</div></div>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <label class="field"><span>Nickname</span><input id="typ-name" maxlength="18" placeholder="nickname lo"></label>
            <label class="field"><span>Discord (ops)</span><input id="typ-discord" maxlength="32" placeholder="@discord"></label>
            <label class="field"><span>Keyboard (ops)</span><input id="typ-kbd" maxlength="40" placeholder="Keychron Q1"></label>
            <label class="field"><span>Switch (ops)</span><input id="typ-switch" maxlength="40" placeholder="Gateron Oil King"></label>
          </div>
          <div class="modal-actions">
            <button class="btn accent block" id="typ-save">✓ Simpan ke Leaderboard</button>
            <div class="modal-actions-row">
              <button class="btn ghost" id="typ-share">📤 Bagikan</button>
              <button class="btn ghost" id="typ-again">↻ Main Lagi</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const elText  = $('#typ-text', root);
  const elInput = $('#typ-input', root);
  const elWpm   = $('#typ-wpm', root);
  const elAcc   = $('#typ-acc', root);
  const elScore = $('#typ-score', root);
  const elTime  = $('#typ-time', root);
  const btnStart= $('#typ-start', root);
  const btnStop = $('#typ-stop', root);
  const resultBox = $('#typ-result', root);

  let st = null, last = null, _active = false;

  function render() {
    const { text, idx, wrongSet } = st;
    let html = '';
    for (let i = 0; i < text.length; i++) {
      const ch = esc(text[i] === ' ' ? ' ' : text[i]);
      if (i < idx) html += `<span class="${wrongSet.has(i) ? 'wrong' : 'done'}">${ch}</span>`;
      else if (i === idx) html += `<span class="cur">${ch}</span>`;
      else html += `<span>${ch}</span>`;
    }
    elText.innerHTML = html;
  }

  function recompute() {
    const mins = (DURATION - st.time) / 60 || (1 / 60);
    const wpm = Math.max(0, Math.round((st.correct / 5) / mins));
    const total = st.correct + st.wrong;
    const acc = total ? st.correct / total : 1;
    const score = Math.round(wpm * acc);
    elWpm.textContent = wpm;
    elAcc.textContent = Math.round(acc * 100) + '%';
    elScore.textContent = score;
    return { wpm, acc: Math.round(acc * 100), score };
  }

  function showResult() { resultBox.classList.add('show'); }
  function hideResult() { resultBox.classList.remove('show'); }

  function start() {
    if (st && st.running) return;
    st = { running: true, time: DURATION, text: buildText(), idx: 0, correct: 0, wrong: 0, wrongSet: new Set(), tick: null };
    hideResult();
    elWpm.textContent = '0'; elAcc.textContent = '100%'; elScore.textContent = '0'; elTime.textContent = DURATION.toFixed(1);
    render();
    elInput.disabled = false; elInput.value = ''; elInput.focus();
    btnStart.disabled = true; btnStop.disabled = false;
    st.tick = setInterval(() => {
      st.time = Math.max(0, st.time - 0.1);
      elTime.textContent = st.time.toFixed(1);
      recompute();
      if (st.time <= 0) stop();
    }, 100);
  }

  function stop(silent) {
    if (!st || !st.running) return;
    st.running = false;
    clearInterval(st.tick);
    elInput.disabled = true;
    btnStart.disabled = false; btnStop.disabled = true;
    const r = recompute();
    if (silent) return;   // abort (pindah view) — jangan munculin popup
    const elapsedSec = Math.max(1, DURATION - st.time);
    const cps = Math.round((st.correct / elapsedSec) * 10) / 10;   // karakter per detik
    last = { score: r.score, detail: { wpm: r.wpm, cps, accuracy: r.acc, correct: st.correct, wrong: st.wrong, duration: DURATION } };

    // isi popup
    $('#typ-m-wpm', root).textContent = r.wpm;
    $('#typ-m-cps', root).textContent = cps.toFixed(1);
    $('#typ-m-acc', root).textContent = r.acc + '%';
    $('#typ-hero-tag', root).textContent =
      r.wpm >= 90 ? 'Jari dewa! ⚡' : r.wpm >= 60 ? 'Gacor! 🔥' : r.wpm >= 35 ? 'Lumayan, gas lagi 💪' : 'Warm up dulu 🐢';

    const rec = checkRecord('typing', r.score);
    const recEl = $('#typ-record', root);
    recEl.hidden = !rec.meaningful;
    if (rec.meaningful) recEl.textContent = `★ REKOR PRIBADI BARU! (dari ${rec.prev})`;
    showResult();
    countUp($('#typ-hero-score', root), r.score);
    if (rec.meaningful) { confetti(); sfx.record(); } else { sfx.win(); }
    $('#typ-name', root).value = localStorage.getItem('ggs_nick') || '';
    $('#typ-name', root).focus();
  }

  elInput.addEventListener('keydown', (e) => {
    if (!st || !st.running) return;
    const text = st.text;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (st.idx > 0) {
        st.idx--;
        if (st.wrongSet.has(st.idx)) { st.wrongSet.delete(st.idx); st.wrong--; }
        else { st.correct--; }
      }
      render(); recompute();
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      if (text[st.idx] === e.key) { st.correct++; }
      else { st.wrong++; st.wrongSet.add(st.idx); }
      st.idx++;
      // isi ulang duluan sebelum teks menipis -> gak pernah abis selama 1 menit
      if (st.text.length - st.idx < REFILL_AT) { st.text += ' ' + buildText(300); }
      render(); recompute();
    }
  });

  btnStart.addEventListener('click', () => start());
  btnStop.addEventListener('click', () => stop());
  wireFullscreen($('#typ-fs', root), root);

  $('#typ-save', root).addEventListener('click', async () => {
    if (!last) return;
    const name = cleanText($('#typ-name', root).value, 18);
    if (name.length < 2) { toast('Nickname minimal 2 huruf.'); return; }
    localStorage.setItem('ggs_nick', name);
    const detail = {
      ...last.detail,
      discord: cleanText($('#typ-discord', root).value, 32) || undefined,
      keyboard: cleanText($('#typ-kbd', root).value, 40) || undefined,
      switches: cleanText($('#typ-switch', root).value, 40) || undefined,
    };
    const res = await ctx.onSubmit({ game: 'typing', score: last.score, player_name: name, detail });
    if (res.ok) { toast(res.rank ? `Mantap! Lo peringkat #${res.rank} dari ${res.total} 🔥` : 'Skor kesimpen! Gacor 🔥'); hideResult(); last = null; }
    else { toast(res.error || 'Gagal simpan skor.'); }
  });

  $('#typ-share', root).addEventListener('click', () => {
    if (!last) return;
    shareScore({ gameLabel: 'Typing Test', score: last.score, line: `${last.detail.wpm} WPM · ${last.detail.accuracy}%` })
      .then((r) => { if (r === 'fallback') toast('Teks tantangan ke-copy — paste ke temen lo! 📤'); });
  });

  $('#typ-close', root).addEventListener('click', hideResult);
  $('#typ-again', root).addEventListener('click', () => { hideResult(); start(); });
  resultBox.addEventListener('click', (e) => { if (e.target === resultBox) hideResult(); }); // klik backdrop
  const onKey = (e) => { if (e.key === 'Escape' && resultBox.classList.contains('show')) hideResult(); };
  document.addEventListener('keydown', onKey);

  return {
    activate() { _active = true; },
    deactivate() { _active = false; if (st && st.running) stop(true); hideResult(); },
    destroy() { document.removeEventListener('keydown', onKey); },
  };
}
