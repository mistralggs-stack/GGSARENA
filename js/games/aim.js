// ============================================================
// GGS ARENA — Game 01: AIM TRAINER (Tembak Target)
// 30 detik. Target mengecil & spawn makin cepat seiring waktu.
// Combo x1–x5. Skor = akumulasi poin (10 x multiplier per hit).
// ============================================================

import { $, esc, clamp, rand, cleanText, toast, shareScore, wireFullscreen, MOBILE_BLOCK_MSG, setSubmitGate } from '../util.js';
import { sfx, confetti, countUp } from '../fx.js';
import { checkRecord } from '../store.js';

const DURATION = 30;         // detik
const SIZE_MAX = 56, SIZE_MIN = 24;
const RATE_MAX = 1000, RATE_MIN = 440;   // ms per target (awal -> akhir)

export function createAimGame(ctx) {
  const root = ctx.mountEl;

  root.innerHTML = `
    <div class="readouts" style="margin-bottom:14px">
      <div class="readout"><div class="r-label">Skor</div><div class="r-val" id="aim-score">0</div></div>
      <div class="readout"><div class="r-label">Combo</div><div class="r-val hot" id="aim-combo">x1</div></div>
      <div class="readout"><div class="r-label">Akurasi</div><div class="r-val" id="aim-acc">0%</div></div>
      <div class="readout"><div class="r-label">Waktu</div><div class="r-val" id="aim-time">30.0</div></div>
    </div>

    <div class="arena" id="aim-arena">
      <div class="hint" id="aim-hint">
        <div>
          <div class="label" style="margin-bottom:8px">STATION 01 · TEMBAK TARGET</div>
          <div style="font-size:18px;font-weight:600">Sikat target secepat mungkin 🎯</div>
          <div class="mono" style="font-size:12px;color:var(--ink-3);margin-top:8px">
            Target makin kecil & makin cepat. Jaga combo biar skor gacor.<br>
            Tekan <b>SPASI</b> atau tombol Mulai.
          </div>
        </div>
      </div>
      <div class="combo-flag" id="aim-comboflag" style="display:none">COMBO <b>x1</b></div>
    </div>

    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
      <button class="btn accent" id="aim-start">▶ Mulai (Spasi)</button>
      <button class="btn ghost" id="aim-stop" disabled>■ Stop</button>
      <button class="btn ghost" id="aim-fs">⛶ Layar Penuh</button>
      <div class="mono" style="font-size:11px;color:var(--ink-3);align-self:center">Klik di luar target = miss</div>
    </div>

    <div class="modal-overlay" id="aim-result">
      <div class="modal-card">
        <button class="modal-x" id="aim-close" aria-label="Tutup">✕</button>
        <div class="result-hero">
          <div class="r-eyebrow">Hasil · Tembak Target</div>
          <div class="r-big" id="aim-hero-score">0</div>
          <div class="r-unit">POIN</div>
          <div class="r-record" id="aim-record" hidden>★ REKOR BARU!</div>
          <div class="r-tag" id="aim-hero-tag">Sikat! 🔥</div>
        </div>
        <div class="result-metrics">
          <div class="result-metric"><div class="m-val hot" id="aim-m-combo">x1</div><div class="m-label">Max Combo</div></div>
          <div class="result-metric"><div class="m-val" id="aim-m-acc">0%</div><div class="m-label">Akurasi</div></div>
          <div class="result-metric"><div class="m-val" id="aim-m-hits">0</div><div class="m-label">Hit / Miss</div></div>
        </div>
        <div class="modal-body">
          <div class="mobile-gate" id="aim-gate" hidden></div>
          <div class="form-grid" id="aim-form">
            <label class="field"><span>Nickname</span><input id="aim-name" maxlength="18" placeholder="nickname lo"></label>
            <label class="field"><span>Discord (ops)</span><input id="aim-discord" maxlength="32" placeholder="@discord"></label>
            <label class="field"><span>Mouse (ops)</span><input id="aim-mouse" maxlength="40" placeholder="Lamzu Atlantis"></label>
            <label class="field"><span>Mousepad (ops)</span><input id="aim-pad" maxlength="40" placeholder="Artisan Zero"></label>
            <label class="field"><span>Mouse Glide (ops)</span><input id="aim-glide" maxlength="40" placeholder="Superglide Glass"></label>
            <label class="field"><span>DPI (ops)</span><input id="aim-dpi" type="number" min="100" max="32000" step="50" placeholder="1600"></label>
            <label class="field"><span>Windows Sens (ops)</span>
              <select id="aim-winsens"><option value="">—</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option selected>6</option><option>7</option><option>8</option><option>9</option><option>10</option></select>
            </label>
            <label class="field"><span>Polling Hz (ops)</span>
              <select id="aim-poll"><option value="">—</option><option>125</option><option>500</option><option selected>1000</option><option>2000</option><option>4000</option><option>8000</option></select>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn accent block" id="aim-save">✓ Simpan ke Leaderboard</button>
            <div class="modal-actions-row">
              <button class="btn ghost" id="aim-share">📤 Bagikan</button>
              <button class="btn ghost" id="aim-again">↻ Main Lagi</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const arena   = $('#aim-arena', root);
  const hint    = $('#aim-hint', root);
  const flag    = $('#aim-comboflag', root);
  const elScore = $('#aim-score', root);
  const elCombo = $('#aim-combo', root);
  const elAcc   = $('#aim-acc', root);
  const elTime  = $('#aim-time', root);
  const btnStart= $('#aim-start', root);
  const btnStop = $('#aim-stop', root);
  const resultBox = $('#aim-result', root);

  let st = null;         // state run aktif
  let last = null;       // hasil run terakhir (untuk save)

  function multiplier(streak) { return clamp(1 + Math.floor(streak / 4), 1, 5); }

  function difficulty(elapsedFrac) {
    const size = SIZE_MAX - (SIZE_MAX - SIZE_MIN) * elapsedFrac;
    const rate = RATE_MAX - (RATE_MAX - RATE_MIN) * elapsedFrac;
    return { size, rate };
  }

  function clearTargets() { arena.querySelectorAll('.target').forEach((n) => n.remove()); }

  function spawn() {
    if (!st || !st.running) return;
    clearTargets();
    const elapsed = (DURATION - st.time) / DURATION;
    const { size, rate } = difficulty(clamp(elapsed, 0, 1));
    const t = document.createElement('div');
    t.className = 'target';
    t.style.width = t.style.height = size + 'px';
    const w = arena.clientWidth, h = arena.clientHeight;
    t.style.left = clamp(rand(4, w - size - 4), 4, w - size - 4) + 'px';
    t.style.top  = clamp(rand(4, h - size - 4), 4, h - size - 4) + 'px';

    st.miss_timer = setTimeout(() => {
      if (!st || !st.running) return;
      registerMiss();
      spawn();
    }, Math.max(220, rate));

    t.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!st || !st.running) return;
      if (e.pointerType === 'touch') st.usedTouch = true;   // main pakai jari?
      clearTimeout(st.miss_timer);
      registerHit();
      spawn();
    });
    arena.appendChild(t);
  }

  function registerHit() {
    st.hits++;
    st.streak++;
    const mult = multiplier(st.streak);
    st.maxMult = Math.max(st.maxMult, mult);
    st.score += 10 * mult;
    elScore.textContent = st.score;
    elCombo.textContent = 'x' + mult;
    flag.style.display = 'block';
    flag.innerHTML = `COMBO <b>x${mult}</b>`;
    (mult > st.lastMult ? sfx.combo(mult) : sfx.hit());
    st.lastMult = mult;
    updateAcc();
  }
  function registerMiss() {
    st.miss++;
    st.streak = 0;
    st.lastMult = 1;
    elCombo.textContent = 'x1';
    flag.innerHTML = 'COMBO <b>x1</b>';
    sfx.miss();
    updateAcc();
  }
  function updateAcc() {
    const total = st.hits + st.miss;
    st.acc = total ? Math.round((st.hits * 100) / total) : 0;
    elAcc.textContent = st.acc + '%';
  }

  function tick() {
    if (!st || !st.running) return;
    st.time = Math.max(0, st.time - 0.1);
    elTime.textContent = st.time.toFixed(1);
    if (st.time <= 0) stop();
  }

  function showResult() { resultBox.classList.add('show'); }
  function hideResult() { resultBox.classList.remove('show'); }

  function start() {
    if (st && st.running) return;
    st = { running: true, time: DURATION, hits: 0, miss: 0, streak: 0, score: 0, maxMult: 1, lastMult: 1, acc: 0, usedTouch: false, miss_timer: null, tick_timer: null };
    hint.style.display = 'none';
    hideResult();
    elScore.textContent = '0'; elCombo.textContent = 'x1'; elAcc.textContent = '0%'; elTime.textContent = DURATION.toFixed(1);
    btnStart.disabled = true; btnStop.disabled = false;
    st.tick_timer = setInterval(tick, 100);
    spawn();
  }

  function stop(silent) {
    if (!st || !st.running) return;
    st.running = false;
    clearInterval(st.tick_timer);
    clearTimeout(st.miss_timer);
    clearTargets();
    flag.style.display = 'none';
    hint.style.display = 'grid';
    btnStart.disabled = false; btnStop.disabled = true;

    last = {
      score: st.score,
      detail: { hits: st.hits, miss: st.miss, accuracy: st.acc, max_combo: st.maxMult, duration: DURATION },
    };
    if (silent) return;   // abort (pindah view) — jangan munculin popup
    hint.querySelector('div').innerHTML = `
      <div class="label" style="margin-bottom:8px">STATION 01 · TEMBAK TARGET</div>
      <div style="font-size:18px;font-weight:600">Sikat target secepat mungkin 🎯</div>
      <div class="mono" style="font-size:12px;color:var(--ink-3);margin-top:8px">Target makin kecil & makin cepat. Jaga combo biar skor gacor.<br>Tekan <b>SPASI</b> atau tombol Mulai.</div>`;

    // isi popup
    $('#aim-m-combo', root).textContent = 'x' + st.maxMult;
    $('#aim-m-acc', root).textContent = st.acc + '%';
    $('#aim-m-hits', root).textContent = `${st.hits}/${st.miss}`;
    $('#aim-hero-tag', root).textContent =
      st.acc >= 85 ? 'Aim dewa! ⚡' : st.acc >= 65 ? 'Gacor! 🔥' : st.acc >= 45 ? 'Lumayan, gas lagi 💪' : 'Latihan lagi 🎯';

    // gate: main pakai layar sentuh -> nggak bisa submit (& rekor pribadi gak dihitung)
    const mobileRun = st.usedTouch;
    const recEl = $('#aim-record', root);
    let isRec = false;
    if (!mobileRun) {
      const rec = checkRecord('aim', st.score);
      isRec = rec.meaningful;
      if (isRec) recEl.textContent = `★ REKOR PRIBADI BARU! (dari ${rec.prev})`;
    }
    recEl.hidden = !isRec;

    $('#aim-gate', root).textContent = MOBILE_BLOCK_MSG;
    setSubmitGate(root, mobileRun, { gate: '#aim-gate', form: '#aim-form', save: '#aim-save' });
    showResult();
    countUp($('#aim-hero-score', root), st.score);
    if (isRec) { confetti(); sfx.record(); } else { sfx.win(); }
    $('#aim-name', root).value = localStorage.getItem('ggs_nick') || '';
    $('#aim-name', root).focus();
  }

  // klik area kosong = miss
  arena.addEventListener('pointerdown', (e) => {
    if (!st || !st.running) return;
    if (!e.target.classList.contains('target')) { registerMiss(); }
  });

  btnStart.addEventListener('click', () => start());
  btnStop.addEventListener('click', () => stop());
  wireFullscreen($('#aim-fs', root), root);

  const onKey = (e) => {
    if (!isActive()) return;
    if (e.key === 'Escape' && resultBox.classList.contains('show')) { hideResult(); return; }
    if (resultBox.classList.contains('show')) return;   // modal kebuka -> spasi jangan mulai
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
      e.preventDefault();
      st && st.running ? stop() : start();
    }
  };
  document.addEventListener('keydown', onKey);

  $('#aim-save', root).addEventListener('click', async () => {
    if (!last) return;
    const name = cleanText($('#aim-name', root).value, 18);
    if (name.length < 2) { toast('Nickname minimal 2 huruf.'); return; }
    localStorage.setItem('ggs_nick', name);
    const detail = {
      ...last.detail,
      discord: cleanText($('#aim-discord', root).value, 32) || undefined,
      mouse: cleanText($('#aim-mouse', root).value, 40) || undefined,
      mousepad: cleanText($('#aim-pad', root).value, 40) || undefined,
      glide: cleanText($('#aim-glide', root).value, 40) || undefined,
      dpi: parseInt($('#aim-dpi', root).value, 10) || undefined,
      win_sens: parseInt($('#aim-winsens', root).value, 10) || undefined,
      polling: parseInt($('#aim-poll', root).value, 10) || undefined,
    };
    const res = await ctx.onSubmit({ game: 'aim', score: last.score, player_name: name, detail });
    if (res.ok) {
      toast(res.rank ? `Mantap! Lo peringkat #${res.rank} dari ${res.total} 🔥` : 'Skor kesimpen! 🔥');
      hideResult();
      last = null;
    } else {
      toast(res.error || 'Gagal simpan skor.');
    }
  });

  $('#aim-share', root).addEventListener('click', () => {
    if (!last) return;
    shareScore({ gameLabel: 'Aim Trainer', score: last.score, line: `${last.detail.accuracy}% akurasi · x${last.detail.max_combo} combo` })
      .then((r) => { if (r === 'fallback') toast('Teks tantangan ke-copy — paste ke temen lo! 📤'); });
  });

  $('#aim-close', root).addEventListener('click', hideResult);
  $('#aim-again', root).addEventListener('click', () => { hideResult(); start(); });
  resultBox.addEventListener('click', (e) => { if (e.target === resultBox) hideResult(); });

  let _active = false;
  function isActive() { return _active; }

  return {
    activate() { _active = true; },
    deactivate() { _active = false; if (st && st.running) stop(true); hideResult(); },
    destroy() { document.removeEventListener('keydown', onKey); },
  };
}
