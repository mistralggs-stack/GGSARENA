# GGS ARENA — Performance Lab

Platform mini-games kompetisi buat **GoodGamingShop**. Bench test skill lo (aim, ketik, refleks), submit skor, naik leaderboard, gaskeun turnamen.

> **Status:** Tahap 1 selesai (struktur + 3 game jalan lokal, mobile-friendly).
> Tahap 2 (Supabase shared leaderboard), Tahap 3 (event/turnamen + admin), Tahap 4 (deploy + embed + README lengkap) menyusul.

## Game (Station)
| # | Game | Metrik | Durasi |
|---|------|--------|--------|
| 01 | **Aim Trainer** (Tembak Target) | Skor · Akurasi · Combo x1–x5 | 30 dtk |
| 02 | **Typing Test** (Ketik Cepat) | Skor = WPM × Akurasi | 1 menit |
| 03 | **Reaction Time** (Tes Refleks) | Reaksi rata² (ms) | 5 ronde |

## Design language
Industrial elegant / spec-sheet look ("Performance Lab / bench test gear").
- Paper `#ECEAE4` · Ink `#16181D` · Aksen `#E8401F`
- Font: **Space Grotesk** (display) + **JetBrains Mono** (data)
- Corner calibration ticks, readout mono, station cards ala spec-sheet.

## Struktur
```
GGSAIM/
├── index.html          # shell + semua view (hub, 3 game)
├── css/styles.css      # design system Performance Lab
├── js/
│   ├── main.js         # routing view, render leaderboard, submit skor
│   ├── store.js        # data store (Tahap 1: localStorage; Tahap 2: Supabase)
│   ├── util.js         # helper
│   └── games/          # aim.js · typing.js · reaction.js
└── scripts/devserver.mjs   # static server dev (tanpa dependency)
```
Vanilla JS, no build step — gampang di-embed via iframe & deploy ke GitHub Pages/Vercel.

## Jalanin lokal
Butuh HTTP server (ES modules gak jalan via `file://`). Cukup Node:
```bash
node scripts/devserver.mjs 5178
# buka http://localhost:5178
```
Mode embed: tambah `?embed=1` (ilangin padding/ticks/footer buat iframe).

## Leaderboard (Tahap 1)
Sementara pakai `localStorage` (per-device). Skema data-nya udah persis skema Supabase target
(`player_name, game, score, detail jsonb, event_id, created_at`) biar Tahap 2 tinggal swap backend.
