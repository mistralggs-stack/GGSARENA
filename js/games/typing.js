// ============================================================
// GGS ARENA — Game 02: TYPING TEST (Ketik Cepat)
// 60 detik (1 menit). Wordlist gaming Indonesia — teks ngalir terus,
// nggak abis selama 1 menit (auto-extend tiap buffer menipis).
// Skor = WPM x akurasi (contoh 80 WPM @ 95% = 76).
// ============================================================

import { $, esc, cleanText, toast, shareScore, wireFullscreen, isTouchOnly, MOBILE_BLOCK_MSG, setSubmitGate, saveProfile, prefillProfile, lockAgainBtn } from '../util.js';
import { sfx, confetti, countUp } from '../fx.js';
import { checkRecord } from '../store.js';
import { shareScoreCard, shareOutcomeToast } from '../scorecard.js';

const DURATION = 60;          // 1 menit
const REFILL_AT = 90;         // sisa char < ini -> tambah teks baru (biar gak abis)

// field form <-> key profil tersimpan (biar gak isi gear ulang tiap main)
const PROFILE_MAP = { '#typ-discord': 'discord', '#typ-kbd': 'keyboard', '#typ-switch': 'kb_switch' };

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
    <div class="type-text mono" id="typ-text">Tekan tombol Mulai (atau SPASI) — ada countdown 3-2-1, terus langsung ketik. Skor = WPM × akurasi. Gaskeun! 🔥</div>
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
          <div class="mobile-gate" id="typ-gate" hidden></div>
          <div class="form-grid" id="typ-form">
            <label class="field"><span>Nickname</span><input id="typ-name" maxlength="18" placeholder="nickname lo"></label>
            <label class="field"><span>Discord (ops)</span><input id="typ-discord" maxlength="32" placeholder="@discord"></label>
            <label class="field"><span>Keyboard (ops)</span><input id="typ-kbd" maxlength="40" placeholder="Keychron Q1"></label>
            <label class="field"><span>Switch (ops)</span><input id="typ-switch" maxlength="40" placeholder="Gateron Oil King"></label>
          </div>
          <div class="modal-actions">
            <div class="ps-msg" id="typ-postsave" hidden></div>
            <button class="btn accent block" id="typ-save">✓ Simpan ke Leaderboard</button>
            <button class="btn accent block" id="typ-share" hidden>📸 Share ke IG — Tantangin Player Lain</button>
            <button class="btn ghost block" id="typ-again">↻ Main Lagi</button>
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

  // Jeda pengaman setelah waktu abis: orang masih asik ngetik pas timer kelar,
  // jadi ketikan/pencetan sisa jangan sampe bikin game mulai lagi sendiri.
  const END_LOCK_MS = 2500;
  let lockUntil = 0;
  const locked = () => performance.now() < lockUntil;

  // countdown 3-2-1 sebelum tes beneran jalan (biar player siap posisi)
  const COUNTDOWN_FROM = 3;
  let cdTimer = null;

  function cancelCountdown() {
    if (!cdTimer) return;
    clearInterval(cdTimer); cdTimer = null;
    btnStart.disabled = false; btnStop.disabled = true;
    elText.textContent = 'Tekan tombol Mulai (atau SPASI) — ada countdown 3-2-1, terus langsung ketik. Skor = WPM × akurasi. Gaskeun! 🔥';
  }

  function beginCountdown() {
    if ((st && st.running) || cdTimer || locked()) return;
    hideResult();
    btnStart.disabled = true; btnStop.disabled = false;
    let n = COUNTDOWN_FROM;
    const paint = () => { elText.innerHTML = `<span class="type-countdown">${n}</span>`; };
    paint(); sfx.go();
    cdTimer = setInterval(() => {
      n--;
      if (n > 0) { paint(); sfx.go(); }
      else { clearInterval(cdTimer); cdTimer = null; sfx.combo(3); start(); }
    }, 1000);
  }

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
    // auto-scroll: caret selalu keliatan (teks panjang gak perlu scroll manual)
    const cur = elText.querySelector('.cur');
    if (cur) {
      const target = Math.max(0, cur.offsetTop - elText.clientHeight / 2);
      if (Math.abs(elText.scrollTop - target) > 10) elText.scrollTop = target;
    }
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
    if (locked()) return;   // baru aja kelar -> tahan dulu biar gak ke-restart gak sengaja
    st = { running: true, time: DURATION, text: buildText(), idx: 0, correct: 0, wrong: 0, wrongSet: new Set(), prevVal: '', tick: null };
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
    lockUntil = performance.now() + END_LOCK_MS;
    const elapsedSec = Math.max(1, DURATION - st.time);
    const cps = Math.round((st.correct / elapsedSec) * 10) / 10;   // karakter per detik
    last = { score: r.score, run_id: crypto.randomUUID(), detail: { wpm: r.wpm, cps, accuracy: r.acc, correct: st.correct, wrong: st.wrong, duration: DURATION } };

    // isi popup
    $('#typ-m-wpm', root).textContent = r.wpm;
    $('#typ-m-cps', root).textContent = cps.toFixed(1);
    $('#typ-m-acc', root).textContent = r.acc + '%';
    $('#typ-hero-tag', root).textContent =
      r.wpm >= 90 ? 'Jari dewa! ⚡' : r.wpm >= 60 ? 'Gacor! 🔥' : r.wpm >= 35 ? 'Lumayan, gas lagi 💪' : 'Warm up dulu 🐢';

    const mobileRun = isTouchOnly();
    const recEl = $('#typ-record', root);
    let isRec = false;
    if (!mobileRun) {
      const rec = checkRecord('typing', r.score);
      isRec = rec.meaningful;
      if (isRec) recEl.textContent = `★ REKOR PRIBADI BARU! (dari ${rec.prev})`;
    }
    recEl.hidden = !isRec;

    $('#typ-gate', root).textContent = MOBILE_BLOCK_MSG;
    setSubmitGate(root, mobileRun, { gate: '#typ-gate', form: '#typ-form', save: '#typ-save' });
    // alur: simpan dulu -> baru tombol share muncul. (mobile: gak bisa simpan, share langsung boleh)
    $('#typ-postsave', root).hidden = true;
    $('#typ-share', root).hidden = !mobileRun;
    showResult();
    lockAgainBtn($('#typ-again', root), END_LOCK_MS);   // biar gak kepencet "Main Lagi" sebelum submit
    countUp($('#typ-hero-score', root), r.score);
    if (isRec) { confetti(); sfx.record(); } else { sfx.win(); }
    $('#typ-name', root).value = localStorage.getItem('ggs_nick') || '';
    prefillProfile(root, PROFILE_MAP);   // gear udah pernah disimpen -> auto keisi
    // fokus ke nickname DITUNDA sampai jeda kelar — ketikan sisa gak nyampah ke form
    setTimeout(() => { if (resultBox.classList.contains('show')) $('#typ-name', root).focus(); }, END_LOCK_MS);
  }

  // Input via event 'input' + algoritma delta — jalan di desktop DAN keyboard HP
  // (Gboard dkk pakai composition/IME, event keydown-nya nggak normal).
  function processChar(ch) {
    if (st.text[st.idx] === ch) { st.correct++; }
    else { st.wrong++; st.wrongSet.add(st.idx); }
    st.idx++;
    // isi ulang duluan sebelum teks menipis -> gak pernah abis selama 1 menit
    if (st.text.length - st.idx < REFILL_AT) { st.text += ' ' + buildText(300); }
  }
  function processBackspace() {
    if (st.idx > 0) {
      st.idx--;
      if (st.wrongSet.has(st.idx)) { st.wrongSet.delete(st.idx); st.wrong--; }
      else { st.correct--; }
    }
  }
  elInput.addEventListener('input', () => {
    if (!st || !st.running) return;
    const v = elInput.value;
    const prev = st.prevVal || '';
    // cari prefix yang sama -> sisanya delta (tahan autocorrect/composition HP)
    let i = 0;
    while (i < v.length && i < prev.length && v[i] === prev[i]) i++;
    for (let k = 0; k < prev.length - i; k++) processBackspace();
    for (const ch of v.slice(i)) processChar(ch);
    st.prevVal = v;
    render(); recompute();
  });

  btnStart.addEventListener('click', () => beginCountdown());
  btnStop.addEventListener('click', () => { if (cdTimer) cancelCountdown(); else stop(); });
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
    saveProfile({ discord: detail.discord, keyboard: detail.keyboard, kb_switch: detail.switches });
    const res = await ctx.onSubmit({ game: 'typing', score: last.score, player_name: name, detail, run_id: last.run_id });
    if (res.ok) {
      const ps = $('#typ-postsave', root);
      ps.textContent = res.rank
        ? `✓ Skor masuk! Lo peringkat #${res.rank} dari ${res.total} 🔥 Pamerin & tantangin player lain 👇`
        : '✓ Skor masuk leaderboard! 🔥 Pamerin & tantangin player lain 👇';
      ps.hidden = false;
      $('#typ-form', root).style.display = 'none';
      $('#typ-save', root).style.display = 'none';
      $('#typ-share', root).hidden = false;
    } else { toast(res.error || 'Gagal simpan skor.'); }
  });

  $('#typ-share', root).addEventListener('click', async () => {
    if (!last) return;
    const result = await shareScoreCard({
      gameLabel: 'Typing Test', station: 'STATION 02', unit: 'PTS',
      score: last.score,
      player: cleanText($('#typ-name', root).value, 18) || 'ANON',
      metrics: [
        { v: last.detail.wpm, l: 'WPM' },
        { v: last.detail.cps.toFixed(1), l: 'Char/Dtk' },
        { v: `${last.detail.accuracy}%`, l: 'Akurasi' },
      ],
      tag: $('#typ-hero-tag', root).textContent,
    });
    shareOutcomeToast(result);
  });

  $('#typ-close', root).addEventListener('click', hideResult);
  $('#typ-again', root).addEventListener('click', () => { if (locked()) return; hideResult(); beginCountdown(); });
  resultBox.addEventListener('click', (e) => { if (e.target === resultBox && !locked()) hideResult(); }); // klik backdrop
  const onKey = (e) => {
    if (!_active) return;
    if (e.key === 'Escape' && resultBox.classList.contains('show')) { hideResult(); return; }
    // SPASI = mulai (dengan countdown) — cuma pas lagi gak main & modal ketutup
    if (e.code === 'Space' && !resultBox.classList.contains('show') && (!st || !st.running) && !cdTimer
        && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      beginCountdown();
    }
  };
  document.addEventListener('keydown', onKey);

  return {
    activate() { _active = true; },
    deactivate() { _active = false; cancelCountdown(); if (st && st.running) stop(true); hideResult(); },
    destroy() { document.removeEventListener('keydown', onKey); },
  };
}
