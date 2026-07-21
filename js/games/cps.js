// ============================================================
// GGS ARENA — Game 04: CPS TEST (Klik Tercepat) — halaman terpisah
// 10 detik. Klik pad segila mungkin. Skor = total klik.
// Metrik: CPS rata², detik terbaik, konsistensi.
// Touch (HP) boleh main tapi gak bisa submit (fairness).
// ============================================================

import { $, esc, clamp, cleanText, toast, shareScore, wireFullscreen, MOBILE_BLOCK_MSG, setSubmitGate } from '../util.js';
import { sfx, confetti, countUp } from '../fx.js';
import { checkRecord } from '../store.js';
import { shareScoreCard, shareOutcomeToast } from '../scorecard.js';

const DURATION = 10;   // detik

export function createCpsGame(ctx) {
  const root = ctx.mountEl;

  root.innerHTML = `
    <div class="readouts" style="margin-bottom:14px">
      <div class="readout"><div class="r-label">Klik</div><div class="r-val hot" id="cps-clicks">0</div></div>
      <div class="readout"><div class="r-label">CPS</div><div class="r-val" id="cps-live">0.0</div></div>
      <div class="readout"><div class="r-label">Best Detik</div><div class="r-val" id="cps-best">—</div></div>
      <div class="readout"><div class="r-label">Waktu</div><div class="r-val" id="cps-time">${DURATION.toFixed(1)}</div></div>
    </div>

    <div class="label" style="margin-bottom:8px">STATION 04 · KLIK TERCEPAT — ${DURATION} DETIK</div>

    <div class="cps-pad" id="cps-pad" data-state="idle">
      <div class="cps-inner">
        <div class="big" id="cps-big">Klik Tercepat 🖱️</div>
        <div class="sub" id="cps-sub">Klik buat mulai — begitu mulai, KLIK SEGILA MUNGKIN!</div>
        <div class="cps-burst" id="cps-burst"></div>
      </div>
    </div>

    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
      <button class="btn ghost" id="cps-reset">↺ Ulang</button>
      <button class="btn ghost" id="cps-fs">⛶ Layar Penuh</button>
      <div class="mono" style="font-size:11px;color:var(--ink-3);align-self:center">Jitter, butterfly, terserah — yang penting sah: 1 jari 1 mouse</div>
    </div>

    <div class="modal-overlay" id="cps-result">
      <div class="modal-card">
        <button class="modal-x" id="cps-close" aria-label="Tutup">✕</button>
        <div class="result-hero">
          <div class="r-eyebrow">Hasil · Klik Tercepat</div>
          <div class="r-big" id="cps-hero-score">0</div>
          <div class="r-unit">TOTAL KLIK / ${DURATION} DTK</div>
          <div class="r-record" id="cps-record" hidden>★ REKOR PRIBADI BARU!</div>
          <div class="r-tag" id="cps-hero-tag">Gacor! 🔥</div>
        </div>
        <div class="result-metrics">
          <div class="result-metric"><div class="m-val hot" id="cps-m-avg">0.0</div><div class="m-label">CPS Rata²</div></div>
          <div class="result-metric"><div class="m-val" id="cps-m-peak">0</div><div class="m-label">Best Detik</div></div>
          <div class="result-metric"><div class="m-val" id="cps-m-cons">0%</div><div class="m-label">Konsistensi</div></div>
        </div>
        <div class="modal-body">
          <div class="mobile-gate" id="cps-gate" hidden></div>
          <div class="form-grid" id="cps-form">
            <label class="field"><span>Nickname</span><input id="cps-name" maxlength="18" placeholder="nickname lo"></label>
            <label class="field"><span>Discord (ops)</span><input id="cps-discord" maxlength="32" placeholder="@discord"></label>
            <label class="field"><span>Mouse (ops)</span><input id="cps-mouse" maxlength="40" placeholder="Razer Deathadder V4"></label>
            <label class="field"><span>Switch Mouse (ops)</span><input id="cps-switch" maxlength="40" placeholder="Huano Blue Shell"></label>
            <label class="field"><span>Polling Hz (ops)</span>
              <select id="cps-poll"><option value="">—</option><option>125</option><option>500</option><option selected>1000</option><option>2000</option><option>4000</option><option>8000</option></select>
            </label>
            <label class="field"><span>Teknik (ops)</span>
              <select id="cps-tech"><option value="">—</option><option>Normal</option><option>Jitter</option><option>Butterfly</option><option>Drag</option></select>
            </label>
          </div>
          <div class="modal-actions">
            <div class="ps-msg" id="cps-postsave" hidden></div>
            <button class="btn accent block" id="cps-save">✓ Simpan ke Leaderboard</button>
            <button class="btn accent block" id="cps-share" hidden>📸 Share ke IG — Tantangin Player Lain</button>
            <button class="btn ghost block" id="cps-again">↻ Main Lagi</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const pad     = $('#cps-pad', root);
  const big     = $('#cps-big', root);
  const sub     = $('#cps-sub', root);
  const burst   = $('#cps-burst', root);
  const elClicks= $('#cps-clicks', root);
  const elLive  = $('#cps-live', root);
  const elBest  = $('#cps-best', root);
  const elTime  = $('#cps-time', root);
  const resultBox = $('#cps-result', root);

  let st = null, last = null;

  function showResult() { resultBox.classList.add('show'); }
  function hideResult() { resultBox.classList.remove('show'); }

  function reset() {
    if (st) { clearInterval(st.tick); }
    st = null; last = null;
    hideResult();
    pad.dataset.state = 'idle';
    big.textContent = 'Klik Tercepat 🖱️';
    sub.textContent = 'Klik buat mulai — begitu mulai, KLIK SEGILA MUNGKIN!';
    elClicks.textContent = '0'; elLive.textContent = '0.0'; elBest.textContent = '—';
    elTime.textContent = DURATION.toFixed(1);
    burst.textContent = '';
  }

  function start() {
    st = { running: true, t0: performance.now(), time: DURATION, clicks: 0, perSec: new Array(DURATION).fill(0), usedTouch: false, tick: null };
    pad.dataset.state = 'run';
    big.textContent = '0';
    sub.textContent = 'GAS! KLIK TERUS! ⚡';
    st.tick = setInterval(() => {
      const elapsed = (performance.now() - st.t0) / 1000;
      st.time = Math.max(0, DURATION - elapsed);
      elTime.textContent = st.time.toFixed(1);
      const cps = elapsed > 0 ? st.clicks / Math.min(elapsed, DURATION) : 0;
      elLive.textContent = cps.toFixed(1);
      const bs = Math.max(...st.perSec);
      elBest.textContent = bs > 0 ? bs : '—';
      if (st.time <= 0) finish();
    }, 100);
  }

  function onPadClick(e) {
    if (!st || !st.running) {
      if (resultBox.classList.contains('show')) return;
      start();
      return;
    }
    if (e.pointerType === 'touch') st.usedTouch = true;
    const sec = Math.min(DURATION - 1, Math.floor((performance.now() - st.t0) / 1000));
    st.clicks++;
    st.perSec[sec]++;
    elClicks.textContent = st.clicks;
    big.textContent = st.clicks;
    if (st.clicks % 10 === 0) sfx.combo(Math.min(5, Math.floor(st.clicks / 20) + 1)); else sfx.hit();
    // riak visual kecil
    burst.textContent = '+1';
    burst.style.opacity = '1';
    clearTimeout(st.burstT);
    st.burstT = setTimeout(() => { burst.style.opacity = '0'; }, 120);
  }

  function finish() {
    if (!st || !st.running) return;
    st.running = false;
    clearInterval(st.tick);
    pad.dataset.state = 'done';

    const clicks = st.clicks;
    const avg = Math.round((clicks / DURATION) * 10) / 10;
    const peak = Math.max(...st.perSec, 0);
    // konsistensi: 100% kalau tiap detik stabil (std dev rendah)
    const mean = clicks / DURATION;
    const variance = st.perSec.reduce((a, v) => a + (v - mean) ** 2, 0) / DURATION;
    const cons = mean > 0 ? clamp(Math.round(100 - (Math.sqrt(variance) / mean) * 100), 0, 100) : 0;

    big.textContent = `${clicks} klik`;
    sub.textContent = 'Kelar! Cek hasilnya 👆';

    last = { score: clicks, run_id: crypto.randomUUID(), detail: { cps: avg, peak_sec: peak, consistency: cons, clicks, duration: DURATION } };

    $('#cps-m-avg', root).textContent = avg.toFixed(1);
    $('#cps-m-peak', root).textContent = peak;
    $('#cps-m-cons', root).textContent = cons + '%';
    $('#cps-hero-tag', root).textContent =
      avg >= 12 ? 'Jari lo mesin! ⚡' : avg >= 8 ? 'Gacor! 🔥' : avg >= 5 ? 'Lumayan, gas lagi 💪' : 'Warm up dulu 🐢';

    const mobileRun = st.usedTouch;
    const recEl = $('#cps-record', root);
    let isRec = false;
    if (!mobileRun) {
      const rec = checkRecord('cps', clicks);
      isRec = rec.meaningful;
      if (isRec) recEl.textContent = `★ REKOR PRIBADI BARU! (dari ${rec.prev})`;
    }
    recEl.hidden = !isRec;

    $('#cps-gate', root).textContent = MOBILE_BLOCK_MSG;
    setSubmitGate(root, mobileRun, { gate: '#cps-gate', form: '#cps-form', save: '#cps-save' });
    // alur: simpan dulu -> baru tombol share muncul. (mobile: gak bisa simpan, share langsung boleh)
    $('#cps-postsave', root).hidden = true;
    $('#cps-share', root).hidden = !mobileRun;
    showResult();
    countUp($('#cps-hero-score', root), clicks);
    if (isRec) { confetti(); sfx.record(); } else { sfx.win(); }
    $('#cps-name', root).value = localStorage.getItem('ggs_nick') || '';
  }

  pad.addEventListener('pointerdown', onPadClick);
  $('#cps-reset', root).addEventListener('click', reset);
  wireFullscreen($('#cps-fs', root), root);

  $('#cps-save', root).addEventListener('click', async () => {
    if (!last) return;
    const name = cleanText($('#cps-name', root).value, 18);
    if (name.length < 2) { toast('Nickname minimal 2 huruf.'); return; }
    localStorage.setItem('ggs_nick', name);
    const detail = {
      ...last.detail,
      discord: cleanText($('#cps-discord', root).value, 32) || undefined,
      mouse: cleanText($('#cps-mouse', root).value, 40) || undefined,
      switches: cleanText($('#cps-switch', root).value, 40) || undefined,
      polling: parseInt($('#cps-poll', root).value, 10) || undefined,
      technique: cleanText($('#cps-tech', root).value, 20) || undefined,
    };
    const res = await ctx.onSubmit({ game: 'cps', score: last.score, player_name: name, detail, run_id: last.run_id });
    if (res.ok) {
      const ps = $('#cps-postsave', root);
      ps.textContent = res.rank
        ? `✓ Skor masuk! Lo peringkat #${res.rank} dari ${res.total} 🔥 Pamerin & tantangin player lain 👇`
        : '✓ Skor masuk leaderboard! 🔥 Pamerin & tantangin player lain 👇';
      ps.hidden = false;
      $('#cps-form', root).style.display = 'none';
      $('#cps-save', root).style.display = 'none';
      $('#cps-share', root).hidden = false;
    } else { toast(res.error || 'Gagal simpan skor.'); }
  });

  $('#cps-share', root).addEventListener('click', async () => {
    if (!last) return;
    const result = await shareScoreCard({
      gameLabel: 'CPS Test', station: 'STATION 04', unit: 'KLIK / 10 DTK',
      score: last.score,
      player: cleanText($('#cps-name', root).value, 18) || 'ANON',
      metrics: [
        { v: last.detail.cps.toFixed(1), l: 'CPS Rata²' },
        { v: last.detail.peak_sec, l: 'Best Detik' },
        { v: `${last.detail.consistency}%`, l: 'Konsistensi' },
      ],
      tag: $('#cps-hero-tag', root).textContent,
    });
    shareOutcomeToast(result);
  });

  $('#cps-close', root).addEventListener('click', hideResult);
  $('#cps-again', root).addEventListener('click', () => { hideResult(); reset(); start(); });
  resultBox.addEventListener('click', (e) => { if (e.target === resultBox) hideResult(); });
  const onKey = (e) => { if (e.key === 'Escape' && resultBox.classList.contains('show')) hideResult(); };
  document.addEventListener('keydown', onKey);

  reset();

  return {
    activate() {},
    deactivate() { if (st) clearInterval(st.tick); hideResult(); },
    destroy() { if (st) clearInterval(st.tick); document.removeEventListener('keydown', onKey); },
  };
}
