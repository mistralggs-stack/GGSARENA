// ============================================================
// GGS ARENA — efek: sound (Web Audio), confetti, count-up angka
// Nggak ada file aset — semua digenerate. Ada toggle mute.
// ============================================================

let audioCtx = null;
let muted = localStorage.getItem('ggs_muted') === '1';

function ctx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; }
  }
  return audioCtx;
}

function tone(freq, dur = 0.08, type = 'square', gain = 0.05) {
  if (muted) return;
  const c = ctx(); if (!c) return;
  try {
    if (c.state === 'suspended') c.resume();
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(c.destination);
    const t = c.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch { /* no-op */ }
}
function melody(notes, step = 95, dur = 0.13, gain = 0.06) {
  notes.forEach((f, i) => setTimeout(() => tone(f, dur, 'square', gain), i * step));
}

export const sfx = {
  hit()      { tone(680, 0.05, 'square', 0.05); },
  combo(n)   { tone(520 + Math.min(n, 5) * 90, 0.06, 'square', 0.055); },
  miss()     { tone(150, 0.10, 'sawtooth', 0.045); },
  click()    { tone(440, 0.04, 'triangle', 0.04); },
  go()       { tone(880, 0.06, 'square', 0.055); },
  win()      { melody([523, 659, 784, 1046]); },
  record()   { melody([659, 784, 1046, 1318, 1568], 90, 0.15, 0.07); },
};

export function isMuted() { return muted; }
export function toggleMute() {
  muted = !muted;
  localStorage.setItem('ggs_muted', muted ? '1' : '0');
  if (!muted) sfx.click();
  return muted;
}

/** Animasi angka naik 0 -> to (dengan pengaman kalau rAF di-throttle) */
export function countUp(el, to, ms = 650) {
  if (!el) return;
  const start = performance.now();
  let done = false;
  const finish = () => { if (!done) { done = true; el.textContent = to; } };
  const tick = (now) => {
    if (done) return;
    const p = Math.min(1, (now - start) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));   // ease-out cubic
    if (p < 1) requestAnimationFrame(tick); else finish();
  };
  requestAnimationFrame(tick);
  setTimeout(finish, ms + 150);   // jaring pengaman: angka final tetap muncul
}

/** Ledakan confetti ringan (canvas, tanpa library) */
export function confetti(originX, originY) {
  const cvs = document.createElement('canvas');
  cvs.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:80';
  cvs.width = window.innerWidth; cvs.height = window.innerHeight;
  document.body.appendChild(cvs);
  const cx = cvs.getContext('2d');
  const colors = ['#E8401F', '#16181D', '#E8A100', '#1E7A46', '#B32C10'];
  const ox = originX ?? window.innerWidth / 2;
  const oy = originY ?? window.innerHeight * 0.42;
  const parts = Array.from({ length: 130 }, () => ({
    x: ox, y: oy,
    vx: (Math.random() - 0.5) * 16,
    vy: (Math.random() - 1.15) * 15,
    g: 0.32 + Math.random() * 0.22,
    w: 5 + Math.random() * 6,
    c: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.45,
  }));
  const t0 = performance.now();
  const draw = (now) => {
    cx.clearRect(0, 0, cvs.width, cvs.height);
    parts.forEach((p) => {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.rot += p.vr;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot);
      cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.w / 2, p.w, p.w * 0.55);
      cx.restore();
    });
    if (now - t0 < 2200) requestAnimationFrame(draw); else cvs.remove();
  };
  requestAnimationFrame(draw);
  setTimeout(() => cvs.remove(), 2600);   // pengaman kalau rAF di-throttle
}
