-- ============================================================
-- GGS ARENA — Supabase schema (Tahap 2)
-- Paste seluruh file ini di: Dashboard -> SQL Editor -> Run
-- ============================================================

-- Tabel skor (sesuai brief: scores + event_id buat Tahap 3)
create table if not exists public.scores (
  id          uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 2 and 18),
  game        text not null check (game in ('aim','typing','reaction','cps')),
  score       integer not null check (score >= 0),
  detail      jsonb not null default '{}'::jsonb,
  event_id    uuid,
  run_id      uuid not null unique,          -- 1 run = 1 submit (anti dobel)
  ip_hash     text,                          -- hash IP (rate limit; bukan IP asli)
  created_at  timestamptz not null default now()
);

-- Index buat leaderboard (per game, urut skor) & recap bulanan
create index if not exists scores_game_score_idx   on public.scores (game, score desc, created_at asc);
create index if not exists scores_game_created_idx on public.scores (game, created_at desc);
create index if not exists scores_iphash_idx       on public.scores (ip_hash, created_at desc);

-- Row Level Security: publik cuma boleh BACA.
-- Nulis skor HANYA lewat Edge Function submit-score (service role) -> semua validasi jalan.
alter table public.scores enable row level security;

drop policy if exists "public read scores" on public.scores;
create policy "public read scores"
  on public.scores for select
  to anon, authenticated
  using (true);

-- (tidak ada policy insert/update/delete utk anon = ketolak semua)

-- Realtime: broadcast INSERT ke semua client yang subscribe
alter publication supabase_realtime add table public.scores;
