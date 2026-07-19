# GGS ARENA — Project Brief untuk Claude Code

## Konteks
GoodGamingShop (goodgamingshop.com) — toko gaming peripheral, mau bikin mini-games arcade di website untuk narik crowd & ngadain pertandingan/turnamen online. Sudah ada prototype single-file HTML (`ggs-arena.html`, sertakan di repo) berisi 2 game: Aim Trainer (Tembak Target) & Typing Test (Ketik Cepat) dengan leaderboard localStorage.

## Goal
Upgrade prototype jadi platform kompetisi yang bisa dipakai untuk event beneran.

## Requirement inti
1. **Shared leaderboard** — semua pemain lihat satu leaderboard yang sama, realtime.
   - Backend: Supabase (owner sudah familiar — pernah deploy KOL tracker Supabase + GitHub Pages).
   - Table: scores (id, player_name, game, score, detail jsonb, event_id, created_at).
2. **Event/turnamen mode**
   - Admin bisa bikin event: nama, game, tanggal mulai/selesai, hadiah (teks).
   - Leaderboard per event + leaderboard all-time terpisah.
   - Countdown event aktif di UI.
3. **Anti-cheat dasar**
   - Skor divalidasi server-side seadanya (rate limit, batas skor masuk akal per game, submit sekali per run).
   - Jangan expose logic skor di endpoint publik tanpa sanity check.
4. **Admin panel sederhana** (protected, boleh pakai Supabase auth)
   - CRUD event, hapus skor curang, export CSV pemenang.
5. **Embed-ready**
   - Output bisa di-iframe di goodgamingshop.com ATAU standalone page (GitHub Pages / Vercel).
   - Responsive mobile — mayoritas traffic GGS dari HP.

## Game (pertahankan feel prototype, boleh refactor)
- Aim Trainer: 30s, target mengecil & spawn makin cepat, combo x1–x5, skor + akurasi + max combo.
- Typing Test: 30s, wordlist gaming Indonesia, skor = WPM × akurasi.
- Nice-to-have: game ke-3 reaction time test.

## Branding & Design
- IKUTI design language di `ggs-performance-lab.html` (versi final yang disetujui owner): industrial elegant / spec-sheet look — paper #ECEAE4, tinta #16181D, aksen #E8401F, font Space Grotesk + JetBrains Mono, corner calibration ticks, konsep "Performance Lab / bench test gear".
- JANGAN pakai dark-neon-esports look (versi `ggs-arena.html` lama hanya referensi logika game, bukan design).
- Copy bahasa Indonesia casual gaming ("gacor", "sikat", dll) — lihat prototype.

## Stack preferensi
- Frontend: vanilla/Vite atau React ringan — bebas, yang penting cepat & gampang di-embed.
- Backend: Supabase (Postgres + RLS + Edge Functions untuk validasi submit skor).
- Deploy: GitHub Pages atau Vercel.

## Definition of done
- [ ] Pemain bisa main, submit skor dengan nickname, muncul di leaderboard shared realtime
- [ ] Admin bisa bikin event & leaderboard ke-filter per event
- [ ] Skor spam/curang kasar ketolak
- [ ] Jalan mulus di mobile
- [ ] Dokumentasi setup Supabase (SQL schema + env vars) di README
