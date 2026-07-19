// ============================================================
// GGS ARENA — data store
// ------------------------------------------------------------
// Tahap 1: backend lokal (localStorage).
// API-nya sengaja dibikin async + bentuknya persis skema Supabase
// (scores: id, player_name, game, score, detail jsonb, event_id, created_at)
// biar Tahap 2 tinggal ganti implementasi backend tanpa ubah UI.
// ============================================================

const LS_KEY = 'ggs_arena_scores_v1';

/** Batas skor wajar per game (anti-cheat dasar — dipakai lagi server-side di Tahap 2) */
export const SCORE_LIMITS = {
  aim:      { min: 0, max: 20000 },   // hits*combo dalam 30s realistis < ~beberapa ribu
  typing:   { min: 0, max: 400 },     // WPM x akurasi
  reaction: { min: 0, max: 1000 },    // skor = poin refleks (makin tinggi makin bagus)
};

function readAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}
function writeAll(rows) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

/** id sederhana tanpa Date.now bergantung (cukup untuk lokal) */
function uid() {
  return 'loc_' + Math.random().toString(36).slice(2, 10);
}

/**
 * Submit satu skor.
 * entry: { player_name, game, score, detail, event_id? }
 * return: { ok, error?, row? }
 */
export async function submitScore(entry) {
  const game = entry.game;
  const limit = SCORE_LIMITS[game];
  const score = Number(entry.score);

  // Validasi client-side (di Tahap 2 divalidasi ulang di Edge Function)
  if (!limit) return { ok: false, error: 'Game tidak dikenal.' };
  if (!Number.isFinite(score) || score < limit.min || score > limit.max) {
    return { ok: false, error: 'Skor di luar batas wajar, ketolak.' };
  }
  const name = String(entry.player_name || '').trim();
  if (name.length < 2) return { ok: false, error: 'Nickname minimal 2 huruf.' };

  const row = {
    id: uid(),
    player_name: name.slice(0, 18),
    game,
    score,
    detail: entry.detail || {},
    event_id: entry.event_id || null,
    created_at: new Date().toISOString(),
  };

  const rows = readAll();
  rows.push(row);
  writeAll(rows);
  return { ok: true, row };
}

/**
 * Ambil leaderboard.
 * opts: { game, eventId (null = all-time), limit }
 * Diurutkan skor tertinggi. Reaction: skor = poin (tinggi = bagus), jadi sama.
 */
export async function getLeaderboard({ game, eventId = null, month = null, limit = 50 } = {}) {
  let rows = readAll();
  if (game) rows = rows.filter((r) => r.game === game);
  if (eventId !== null) rows = rows.filter((r) => r.event_id === eventId);
  // month = 'YYYY-MM' -> recap bulanan (buat challenge/juara bulan ini)
  if (month) rows = rows.filter((r) => String(r.created_at).slice(0, 7) === month);
  rows.sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at));
  return rows.slice(0, limit);
}

/** Hapus semua (dev/testing lokal) */
export async function clearAll() {
  localStorage.removeItem(LS_KEY);
}

/**
 * Seed data demo (idempotent — baris demo lama dihapus dulu, jadi gak dobel).
 * rows: array { player_name, game, score, detail }
 */
export async function seedDemo(rows) {
  const now = Date.now();
  const kept = readAll().filter((r) => !String(r.id || '').startsWith('demo_'));
  rows.forEach((r, i) => {
    kept.push({
      id: 'demo_' + i,
      player_name: r.player_name,
      game: r.game,
      score: r.score,
      detail: r.detail || {},
      event_id: null,
      // stagger created_at biar urutan tie-break stabil
      created_at: new Date(now - (rows.length - i) * 60000).toISOString(),
    });
  });
  writeAll(kept);
}

/** Hapus hanya baris demo (skor asli tetap aman) */
export async function clearDemo() {
  writeAll(readAll().filter((r) => !String(r.id || '').startsWith('demo_')));
}

// ---------- Personal Best (rekor pribadi, per perangkat) ----------
export function getPB(game) { return Number(localStorage.getItem('ggs_pb_' + game) || 0); }
export function setPB(game, score) { localStorage.setItem('ggs_pb_' + game, String(score)); }
/**
 * Cek rekor pribadi (per perangkat). Return { isRecord, prev, meaningful }.
 * meaningful = true CUMA kalau ngelewatin skor lama yg > 0 (main pertama gak dihitung "rekor").
 */
export function checkRecord(game, score) {
  const prev = getPB(game);
  const isRecord = score > prev;
  if (isRecord) setPB(game, score);
  return { isRecord, prev, meaningful: isRecord && prev > 0 };
}

/** Peringkat sebuah skor di leaderboard (buat "posisi lo #X dari Y") */
export async function getRank({ game, score, eventId = null, month = null }) {
  const rows = await getLeaderboard({ game, eventId, month, limit: 100000 });
  const total = rows.length;
  // rank = jumlah skor yang lebih tinggi + 1
  const higher = rows.filter((r) => r.score > score).length;
  return { rank: higher + 1, total };
}

// Flag supaya UI tahu ini masih backend lokal
export const BACKEND = 'local';
