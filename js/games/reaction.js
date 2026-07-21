// ============================================================
// GGS ARENA — Game 03: REACTION TIME (Tes Refleks) — versi warna
// 5 ronde. Tiap ronde ada INSTRUKSI warna (MERAH/KUNING/HIJAU).
// Pad nyala warna acak (ada jebakan) — klik CUMA pas warna target.
// Klik warna salah / kecepetan = ronde diulang + kena "salah".
// Skor = 60000 / rata² ms (makin cepet & akurat makin gede).
// ============================================================

import { $, esc, clamp, rand, cleanText, toast, shareScore, wireFullscreen, MOBILE_BLOCK_MSG, setSubmitGate } from '../util.js';
import { sfx, confetti, countUp } from '../fx.js';
import { checkRecord } from '../store.js';
import { shareScoreCard, shareOutcomeToast } from '../scorecard.js';

const ROUNDS = 5;
const WAIT_MIN = 900,  WAIT_MAX = 2200;   // jeda sebelum warna pertama muncul
const STEP_MIN = 650,  STEP_MAX = 1000;   // durasi tiap warna jebakan
const MAX_TRAPS = 3;                       // maksimal warna jebakan sebelum target

const COLORS = [
  { key: 'green',  name: 'HIJAU',  hex: '#1E7A46', fg: '#ffffff' },
  { key: 'red',    name: 'MERAH',  hex: '#E8401F', fg: '#ffffff' },
  { key: 'yellow', name: 'KUNING', hex: '#E8A100', fg: '#16181D' },
];
const NEUTRAL = { bg: '#16181D', fg: '#ECEAE4' };   // layar tunggu/penalti
const IDLEBG  = { bg: '',        fg: '' };           // pakai default CSS

export function createReactionGame(ctx) {
  const root = ctx.mountEl;

  root.innerHTML = `
    <div class="readouts" style="margin-bottom:14px">
      <div class="readout"><div class="r-label">Ronde</div><div class="r-val" id="rx-round">0/${ROUNDS}</div></div>
      <div class="readout"><div class="r-label">Terakhir</div><div class="r-val" id="rx-last">—</div></div>
      <div class="readout"><div class="r-label">Terbaik</div><div class="r-val hot" id="rx-best">—</div></div>
      <div class="readout"><div class="r-label">Salah</div><div class="r-val" id="rx-err">0</div></div>
    </div>

    <div class="label" style="margin-bottom:8px">STATION 03 · TES REFLEKS WARNA — 5 RONDE</div>

    <div class="rx-instruct" id="rx-instruct" hidden>
      <span class="ri-label">KLIK CUMA PAS</span>
      <span class="ri-dot" id="rx-idot"></span>
      <span class="ri-name" id="rx-iname">—</span>
    </div>

    <div class="react-pad" id="rx-pad" data-state="idle">
      <div>
        <div class="big" id="rx-big">Tes Refleks Warna 🎨</div>
        <div class="sub" id="rx-sub">Klik buat mulai. Nanti klik CUMA pas warna yang diminta — jangan ketipu!</div>
        <div class="react-dots" id="rx-dots"></div>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
      <button class="btn ghost" id="rx-reset">↺ Ulang</button>
      <button class="btn ghost" id="rx-fs">⛶ Layar Penuh</button>
      <div class="mono" style="font-size:11px;color:var(--ink-3);align-self:center">Baca instruksi warnanya — jangan asal klik</div>
    </div>

    <div class="modal-overlay" id="rx-result">
      <div class="modal-card">
        <button class="modal-x" id="rx-close" aria-label="Tutup">✕</button>
        <div class="result-hero">
          <div class="r-eyebrow">Hasil · Tes Refleks Warna</div>
          <div class="r-big" id="rx-hero-score">0</div>
          <div class="r-unit">POIN REFLEKS</div>
          <div class="r-record" id="rx-record" hidden>★ REKOR BARU!</div>
          <div class="r-tag" id="rx-hero-tag">Mantul! ⚡</div>
        </div>
        <div class="result-metrics">
          <div class="result-metric"><div class="m-val hot" id="rx-m-avg">—</div><div class="m-label">Rata² (ms)</div></div>
          <div class="result-metric"><div class="m-val" id="rx-m-best">—</div><div class="m-label">Terbaik (ms)</div></div>
          <div class="result-metric"><div class="m-val" id="rx-m-err">0</div><div class="m-label">Salah Klik</div></div>
        </div>
        <div class="modal-body">
          <div class="mobile-gate" id="rx-gate" hidden></div>
          <div class="form-grid" id="rx-form">
            <label class="field"><span>Nickname</span><input id="rx-name" maxlength="18" placeholder="nickname lo"></label>
            <label class="field"><span>Discord (ops)</span><input id="rx-discord" maxlength="32" placeholder="@discord"></label>
            <label class="field"><span>Mouse (ops)</span><input id="rx-mouse" maxlength="40" placeholder="Razer Deathadder V4"></label>
            <label class="field"><span>Polling Hz (ops)</span>
              <select id="rx-poll"><option value="">—</option><option>125</option><option>500</option><option selected>1000</option><option>2000</option><option>4000</option><option>8000</option></select>
            </label>
          </div>
          <div class="modal-actions">
            <div class="ps-msg" id="rx-postsave" hidden></div>
            <button class="btn accent block" id="rx-save">✓ Simpan ke Leaderboard</button>
            <button class="btn accent block" id="rx-share" hidden>📸 Share ke IG — Tantangin Player Lain</button>
            <button class="btn ghost block" id="rx-again">↻ Main Lagi</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const pad      = $('#rx-pad', root);
  const big      = $('#rx-big', root);
  const sub      = $('#rx-sub', root);
  const dots     = $('#rx-dots', root);
  const instruct = $('#rx-instruct', root);
  const iDot     = $('#rx-idot', root);
  const iName    = $('#rx-iname', root);
  const elRound  = $('#rx-round', root);
  const elLast   = $('#rx-last', root);
  const elBest   = $('#rx-best', root);
  const elErr    = $('#rx-err', root);
  const resultBox = $('#rx-result', root);

  let st = null, last = null, timer = null;

  function paint(bg, fg) { pad.style.background = bg || ''; pad.style.color = fg || ''; }
  function renderDots() {
    dots.innerHTML = '';
    for (let i = 0; i < ROUNDS; i++) {
      const d = document.createElement('span');
      d.className = 'd' + (st && i < st.times.length ? ' on' : '');
      dots.appendChild(d);
    }
  }
  function setPad(phase, title, subtitle) {
    st.phase = phase;
    pad.dataset.state = phase;
    big.textContent = title;
    sub.textContent = subtitle;
  }
  function setInstruct(target) {
    instruct.hidden = false;
    iDot.style.background = target.hex;
    iName.textContent = target.name;
    iName.style.color = target.hex;
  }
  function hideInstruct() { instruct.hidden = true; }

  function showResult() { resultBox.classList.add('show'); }
  function hideResult() { resultBox.classList.remove('show'); }

  const randColorExcept = (except) => {
    const pool = COLORS.filter((c) => c.key !== except);
    return pool[Math.floor(Math.random() * pool.length)];
  };

  function reset() {
    clearTimeout(timer);
    st = { times: [], errors: 0, round: 0, phase: 'idle', target: null, goAt: 0, seq: [], seqIdx: 0, usedTouch: false };
    last = null;
    hideResult();
    hideInstruct();
    paint(IDLEBG.bg, IDLEBG.fg);
    elRound.textContent = `0/${ROUNDS}`;
    elLast.textContent = elBest.textContent = '—';
    elErr.textContent = '0';
    setPad('idle', 'Tes Refleks Warna 🎨', 'Klik buat mulai. Nanti klik CUMA pas warna yang diminta — jangan ketipu!');
    renderDots();
  }

  function beginRound() {
    clearTimeout(timer);
    st.target = COLORS[Math.floor(Math.random() * COLORS.length)];
    setInstruct(st.target);
    paint(NEUTRAL.bg, NEUTRAL.fg);
    setPad('wait', 'SIAP…', `Tunggu warna ${st.target.name}, jangan ketipu warna lain`);
    renderDots();
    // susun urutan: beberapa warna jebakan lalu target
    const nTraps = Math.floor(rand(0, MAX_TRAPS + 0.999));
    st.seq = [];
    let prev = null;
    for (let i = 0; i < nTraps; i++) {
      const pool = COLORS.filter((c) => c.key !== st.target.key && c.key !== prev);
      const c = pool[Math.floor(Math.random() * pool.length)] || randColorExcept(st.target.key);
      st.seq.push(c); prev = c.key;
    }
    st.seq.push(st.target);
    st.seqIdx = 0;
    timer = setTimeout(showNext, rand(WAIT_MIN, WAIT_MAX));
  }

  function showNext() {
    const c = st.seq[st.seqIdx];
    paint(c.hex, c.fg);
    sfx.go();   // bunyi SAMA buat semua warna — biar gak ada clue audio, murni baca warna
    if (c.key === st.target.key) {
      // TARGET muncul -> mulai ukur
      st.goAt = performance.now();
      setPad('go', c.name, 'SIKAT SEKARANG! ⚡');
    } else {
      // warna jebakan -> jangan klik
      setPad('trap', c.name, `Bukan ${st.target.name} — TAHAN ✋`);
      timer = setTimeout(() => { st.seqIdx++; showNext(); }, rand(STEP_MIN, STEP_MAX));
    }
  }

  function penalty(kind) {
    clearTimeout(timer);
    st.errors++;
    elErr.textContent = st.errors;
    sfx.miss();
    paint(NEUTRAL.bg, NEUTRAL.fg);
    if (kind === 'early') setPad('early', 'KECEPETAN! 😅', 'Warnanya belum muncul. Klik buat ulang ronde ini');
    else setPad('wrong', 'SALAH WARNA! 😅', `Harusnya nunggu ${st.target.name}. Klik buat ulang ronde ini`);
  }

  function recordHit() {
    clearTimeout(timer);
    const ms = Math.round(performance.now() - st.goAt);
    st.times.push(ms);
    st.round++;
    elLast.textContent = ms + 'ms';
    elBest.textContent = Math.min(...st.times) + 'ms';
    elRound.textContent = `${st.round}/${ROUNDS}`;
    renderDots();
    paint(IDLEBG.bg, IDLEBG.fg);
    sfx.hit();

    if (st.round >= ROUNDS) { hideInstruct(); finish(); }
    else setPad('roundresult', `${ms}ms 👌`, 'Klik buat lanjut ronde berikutnya');
  }

  function finish() {
    const avg = Math.round(st.times.reduce((a, b) => a + b, 0) / st.times.length);
    const best = Math.min(...st.times);
    const score = clamp(Math.round(60000 / avg), 0, 1000);
    last = { score, run_id: crypto.randomUUID(), detail: { avg_ms: avg, best_ms: best, rounds: ROUNDS, errors: st.errors, times: st.times } };
    setPad('done', `${avg}ms rata²`, 'Mantul! Cek hasilnya 👆');

    $('#rx-m-avg', root).textContent = avg;
    $('#rx-m-best', root).textContent = best;
    $('#rx-m-err', root).textContent = st.errors;
    $('#rx-hero-tag', root).textContent =
      (st.errors === 0 && avg <= 320 ? 'Bersih & ngebut! ⚡ ' : '') +
      (avg <= 320 ? 'Refleks + otak dewa!' : avg <= 430 ? 'Mantul! 🔥' : 'Lumayan, gas lagi 💪');

    const mobileRun = st.usedTouch;
    const recEl = $('#rx-record', root);
    let isRec = false;
    if (!mobileRun) {
      const rec = checkRecord('reaction', score);
      isRec = rec.meaningful;
      if (isRec) recEl.textContent = `★ REKOR PRIBADI BARU! (dari ${rec.prev})`;
    }
    recEl.hidden = !isRec;

    $('#rx-gate', root).textContent = MOBILE_BLOCK_MSG;
    setSubmitGate(root, mobileRun, { gate: '#rx-gate', form: '#rx-form', save: '#rx-save' });
    // alur: simpan dulu -> baru tombol share muncul. (mobile: gak bisa simpan, share langsung boleh)
    $('#rx-postsave', root).hidden = true;
    $('#rx-share', root).hidden = !mobileRun;
    showResult();
    countUp($('#rx-hero-score', root), score);
    if (isRec) { confetti(); sfx.record(); } else { sfx.win(); }
    $('#rx-name', root).value = localStorage.getItem('ggs_nick') || '';
  }

  pad.addEventListener('pointerdown', (e) => {
    const p = st ? st.phase : 'idle';
    if (p === 'idle') return beginRound();
    if (p === 'wait') return penalty('early');
    if (p === 'trap') return penalty('wrong');
    if (p === 'go') { if (e.pointerType === 'touch') st.usedTouch = true; return recordHit(); }
    if (p === 'early' || p === 'wrong') return beginRound();     // ulang ronde ini
    if (p === 'roundresult') return beginRound();                // lanjut ronde
    // 'done' -> diam, tinggal simpan
  });

  $('#rx-reset', root).addEventListener('click', reset);
  wireFullscreen($('#rx-fs', root), root);

  $('#rx-save', root).addEventListener('click', async () => {
    if (!last) return;
    const name = cleanText($('#rx-name', root).value, 18);
    if (name.length < 2) { toast('Nickname minimal 2 huruf.'); return; }
    localStorage.setItem('ggs_nick', name);
    const detail = {
      ...last.detail,
      discord: cleanText($('#rx-discord', root).value, 32) || undefined,
      mouse: cleanText($('#rx-mouse', root).value, 40) || undefined,
      polling: parseInt($('#rx-poll', root).value, 10) || undefined,
    };
    const res = await ctx.onSubmit({ game: 'reaction', score: last.score, player_name: name, detail, run_id: last.run_id });
    if (res.ok) {
      const ps = $('#rx-postsave', root);
      ps.textContent = res.rank
        ? `✓ Skor masuk! Lo peringkat #${res.rank} dari ${res.total} ⚡ Pamerin & tantangin player lain 👇`
        : '✓ Skor masuk leaderboard! ⚡ Pamerin & tantangin player lain 👇';
      ps.hidden = false;
      $('#rx-form', root).style.display = 'none';
      $('#rx-save', root).style.display = 'none';
      $('#rx-share', root).hidden = false;
    } else { toast(res.error || 'Gagal simpan skor.'); }
  });

  $('#rx-share', root).addEventListener('click', async () => {
    if (!last) return;
    const result = await shareScoreCard({
      gameLabel: 'Reaction Time', station: 'STATION 03', unit: 'POIN REFLEKS',
      score: last.score,
      player: cleanText($('#rx-name', root).value, 18) || 'ANON',
      metrics: [
        { v: `${last.detail.avg_ms}ms`, l: 'Rata²' },
        { v: `${last.detail.best_ms}ms`, l: 'Terbaik' },
        { v: last.detail.errors, l: 'Salah' },
      ],
      tag: $('#rx-hero-tag', root).textContent,
    });
    shareOutcomeToast(result);
  });

  $('#rx-close', root).addEventListener('click', hideResult);
  $('#rx-again', root).addEventListener('click', () => { hideResult(); reset(); beginRound(); });
  resultBox.addEventListener('click', (e) => { if (e.target === resultBox) hideResult(); });
  const onKey = (e) => { if (e.key === 'Escape' && resultBox.classList.contains('show')) hideResult(); };
  document.addEventListener('keydown', onKey);

  reset();

  return {
    activate() {},
    deactivate() { clearTimeout(timer); hideResult(); },
    destroy() { clearTimeout(timer); document.removeEventListener('keydown', onKey); },
  };
}
