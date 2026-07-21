// ============================================================
// GGS ARENA — data store (dual backend)
// ------------------------------------------------------------
// SUPABASE (config keisi): leaderboard shared realtime semua pemain.
//   - Baca: langsung ke Postgres (RLS: public read-only)
//   - Tulis: HANYA lewat Edge Function submit-score (anti-cheat)
// LOCAL (config placeholder): localStorage per-device — buat dev/demo.
// API-nya sama persis, UI nggak perlu tau bedanya.
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const SB_ACTIVE =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL || '') &&
  (SUPABASE_ANON_KEY || '').length > 40;

export const BACKEND = SB_ACTIVE ? 'supabase' : 'local';

/** Batas skor wajar per game (divalidasi ULANG server-side di Edge Function) */
export const SCORE_LIMITS = {
  aim:      { min: 0, max: 20000 },
  typing:   { min: 0, max: 400 },
  reaction: { min: 0, max: 1000 },
  cps:      { min: 0, max: 300 },
};

// ---------- Supabase client (lazy — cuma ke-load kalau aktif) ----------
let _sb = null;
async function sb() {
  if (!_sb) {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    _sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _sb;
}

// ---------- LOCAL backend (localStorage) ----------
const LS_KEY = 'ggs_arena_scores_v1';
function readAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}
function writeAll(rows) { localStorage.setItem(LS_KEY, JSON.stringify(rows)); }
function uid() { return 'loc_' + Math.random().toString(36).slice(2, 10); }

function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return { start: `${month}-01T00:00:00.000Z`, end: `${next}-01T00:00:00.000Z` };
}

// ---------- submitScore ----------
/**
 * entry: { player_name, game, score, detail, run_id, event_id? }
 * return: { ok, error?, row? }
 */
export async function submitScore(entry) {
  const game = entry.game;
  const limit = SCORE_LIMITS[game];
  const score = Number(entry.score);
  const name = String(entry.player_name || '').trim();

  // validasi client-side (server tetap validasi ulang)
  if (!limit) return { ok: false, error: 'Game tidak dikenal.' };
  if (!Number.isFinite(score) || score < limit.min || score > limit.max) {
    return { ok: false, error: 'Skor di luar batas wajar, ketolak.' };
  }
  if (name.length < 2) return { ok: false, error: 'Nickname minimal 2 huruf.' };

  if (SB_ACTIVE) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          player_name: name.slice(0, 18),
          game,
          score,
          detail: entry.detail || {},
          run_id: entry.run_id,
          event_id: entry.event_id || null,
        }),
      });
      const body = await res.json().catch(() => null);
      if (body && typeof body.ok === 'boolean') return body;
      return { ok: false, error: 'Server lagi bermasalah, coba lagi.' };
    } catch {
      return { ok: false, error: 'Gagal konek server. Cek internet lo.' };
    }
  }

  // LOCAL
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

// ---------- getLeaderboard ----------
export async function getLeaderboard({ game, eventId = null, month = null, limit = 50 } = {}) {
  if (SB_ACTIVE) {
    try {
      const client = await sb();
      let q = client.from('scores').select('*')
        .eq('game', game)
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit);
      if (eventId !== null) q = q.eq('event_id', eventId);
      if (month) {
        const { start, end } = monthRange(month);
        q = q.gte('created_at', start).lt('created_at', end);
      }
      const { data, error } = await q;
      return error ? [] : (data || []);
    } catch { return []; }
  }

  let rows = readAll();
  if (game) rows = rows.filter((r) => r.game === game);
  if (eventId !== null) rows = rows.filter((r) => r.event_id === eventId);
  if (month) rows = rows.filter((r) => String(r.created_at).slice(0, 7) === month);
  rows.sort((a, b) => b.score - a.score || new Date(a.created_at) - new Date(b.created_at));
  return rows.slice(0, limit);
}

// ---------- getRank (posisi lo #X dari Y) ----------
export async function getRank({ game, score, eventId = null, month = null }) {
  if (SB_ACTIVE) {
    const client = await sb();
    const base = () => {
      let q = client.from('scores').select('id', { count: 'exact', head: true }).eq('game', game);
      if (eventId !== null) q = q.eq('event_id', eventId);
      if (month) { const { start, end } = monthRange(month); q = q.gte('created_at', start).lt('created_at', end); }
      return q;
    };
    const { count: total } = await base();
    const { count: higher } = await base().gt('score', score);
    return { rank: (higher ?? 0) + 1, total: total ?? 0 };
  }
  const rows = await getLeaderboard({ game, eventId, month, limit: 100000 });
  return { rank: rows.filter((r) => r.score > score).length + 1, total: rows.length };
}

// ---------- Realtime (skor baru masuk -> callback) ----------
export async function onNewScore(cb) {
  if (!SB_ACTIVE) return;   // local: nggak ada realtime antar device
  try {
    const client = await sb();
    client.channel('scores-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scores' }, (payload) => {
        try { cb(payload.new); } catch { /* no-op */ }
      })
      .subscribe();
  } catch { /* no-op */ }
}

// ---------- Personal Best (selalu lokal per-device) ----------
export function getPB(game) { return Number(localStorage.getItem('ggs_pb_' + game) || 0); }
export function setPB(game, score) { localStorage.setItem('ggs_pb_' + game, String(score)); }
export function checkRecord(game, score) {
  const prev = getPB(game);
  const isRecord = score > prev;
  if (isRecord) setPB(game, score);
  return { isRecord, prev, meaningful: isRecord && prev > 0 };
}

// ---------- Demo & util (khusus mode LOCAL — jangan kotori DB shared) ----------
export async function clearAll() {
  if (SB_ACTIVE) return;
  localStorage.removeItem(LS_KEY);
}

export async function seedDemo(rows) {
  if (SB_ACTIVE) return;   // demo cuma buat localStorage
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
      created_at: new Date(now - (rows.length - i) * 60000).toISOString(),
    });
  });
  writeAll(kept);
}

export async function clearDemo() {
  if (SB_ACTIVE) return;
  writeAll(readAll().filter((r) => !String(r.id || '').startsWith('demo_')));
}
