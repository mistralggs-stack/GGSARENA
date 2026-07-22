// ============================================================
// GGS ARENA — utilities
// ============================================================

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape untuk render aman ke innerHTML */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));

/** Clamp angka */
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/** Rentang acak inklusif */
export const rand = (min, max) => min + Math.random() * (max - min);

/** Format angka ribuan: 12345 -> 12.345 (id-ID) */
export const fmtNum = (n) => Number(n || 0).toLocaleString('id-ID');

/** Bersihkan & batasi panjang input teks */
export const cleanText = (s, max = 40) => String(s ?? '').trim().slice(0, max);

/** Toast notifikasi ringan */
let _toastEl = null;
let _toastTimer = null;
export function toast(msg, ms = 2200) {
  if (!_toastEl) {
    _toastEl = document.createElement('div');
    _toastEl.className = 'toast';
    document.body.appendChild(_toastEl);
  }
  _toastEl.textContent = msg;
  _toastEl.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => _toastEl.classList.remove('show'), ms);
}

/** Format sisa waktu -> "2h 04:12:33" untuk countdown event */
export function fmtCountdown(ms) {
  if (ms <= 0) return 'SELESAI';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return (d > 0 ? `${d}h ` : '') + `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

/** Kirim skor ke parent window (untuk mode embed / integrasi lain) */
export function postToParent(payload) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'ggs:score', ...payload }, '*');
    }
  } catch (_) { /* no-op */ }
}

/** Baca query param */
export const qp = (key) => new URLSearchParams(location.search).get(key);

// ---------- Profil pemain (gear/equipment) ----------
// Sekali submit, gear ke-simpen di browser -> main berikutnya form udah keisi,
// gak perlu ngetik ulang mouse/keyboard/dpi dkk tiap kali (orang jadi males).
const PROFILE_KEY = 'ggs_profile';

export function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') || {}; }
  catch { return {}; }
}

export function saveProfile(patch) {
  const p = loadProfile();
  for (const k of Object.keys(patch)) {
    const v = patch[k];
    if (v !== undefined && v !== null && v !== '') p[k] = v;
  }
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch { /* no-op */ }
}

/** Isi otomatis field form dari profil tersimpan. map = { '#selector': 'profileKey' } */
export function prefillProfile(root, map) {
  const p = loadProfile();
  for (const sel of Object.keys(map)) {
    const el = root.querySelector(sel);
    if (!el) continue;
    const v = p[map[sel]];
    if (v === undefined || v === null || v === '') continue;
    if (el.tagName === 'SELECT' || !el.value) el.value = String(v);
  }
}

// ---------- Kunci tombol "Main Lagi" sehabis game kelar ----------
// Banyak player gak sengaja kepencet "Main Lagi" -> skor kereset sebelum
// sempet di-submit. Tombol di-disable dulu beberapa detik + countdown di label.
export function lockAgainBtn(btn, ms = 2500) {
  if (!btn) return;
  const orig = btn.dataset.origLabel || btn.textContent;
  btn.dataset.origLabel = orig;
  btn.disabled = true;
  const end = performance.now() + ms;
  const t = setInterval(() => {
    const left = Math.ceil((end - performance.now()) / 1000);
    if (left <= 0) { clearInterval(t); btn.disabled = false; btn.textContent = orig; }
    else { btn.textContent = `${orig} (${left})`; }
  }, 200);
  btn.textContent = `${orig} (${Math.ceil(ms / 1000)})`;
}

// ---------- Deteksi input (buat fairness leaderboard) ----------
export const hasFinePointer = () => !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);   // ada mouse/trackpad/pen
export const isTouchOnly    = () => !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches) && !hasFinePointer();

export const MOBILE_BLOCK_MSG =
  'Sistem mendeteksi kamu main pakai layar sentuh 📱. Skor dari HP nggak bisa masuk leaderboard biar adil — buat ikut kompetisi, main pakai mouse & keyboard di komputer ya! 🖱️⌨️';

/**
 * Atur popup pas mobile-run: tampilin notice + tombol simpan disembunyiin.
 * Form (nickname dkk) TETEP tampil — boleh diisi, cuma gak bisa submit.
 * sel = { gate, form, save } (CSS selector relatif ke root)
 */
export function setSubmitGate(root, blocked, sel) {
  const gate = root.querySelector(sel.gate);
  const form = root.querySelector(sel.form);
  const save = root.querySelector(sel.save);
  if (gate) gate.hidden = !blocked;
  if (form) form.style.display = '';
  if (save) save.style.display = blocked ? 'none' : '';
}

/** Pasang tombol fullscreen buat sebuah elemen (cross-browser + auto-label) */
export function wireFullscreen(btn, el) {
  if (!btn || !el) return;
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const paint = () => { btn.textContent = fsEl() === el ? '⛶ Keluar Layar Penuh' : '⛶ Layar Penuh'; };
  btn.addEventListener('click', () => {
    try {
      if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
      else { const r = el.requestFullscreen || el.webkitRequestFullscreen; if (r) r.call(el); }
    } catch (_) { toast('Browser nolak fullscreen 😅'); }
  });
  document.addEventListener('fullscreenchange', paint);
  document.addEventListener('webkitfullscreenchange', paint);
  paint();
}

/**
 * Share / tantang skor. Pakai native share (mobile) kalau ada,
 * fallback ke copy clipboard + buka WhatsApp.
 * return: 'shared' | 'cancel' | 'fallback'
 */
export async function shareScore({ gameLabel, score, line = '', url }) {
  const shareUrl = url || location.href.split('#')[0];
  const text = `Gw dapet ${score} PTS di ${gameLabel} — GGS Arena 🔥${line ? ' (' + line + ')' : ''} Kalahin kalo bisa 👉`;
  try {
    if (navigator.share) { await navigator.share({ title: 'GGS Arena', text, url: shareUrl }); return 'shared'; }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  try { await navigator.clipboard.writeText(`${text} ${shareUrl}`); } catch { /* no-op */ }
  try { window.open('https://wa.me/?text=' + encodeURIComponent(`${text} ${shareUrl}`), '_blank', 'noopener'); } catch { /* no-op */ }
  return 'fallback';
}
