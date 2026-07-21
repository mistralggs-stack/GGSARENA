# Setup Supabase — GGS Arena (Tahap 2)

> 3 langkah di dashboard, ±5 menit. Project: `GGSARENA` (wuikzfaeadrugpkgvkgd).

## Langkah 1 — Bikin tabel + aturan akses (SQL)
1. Buka dashboard Supabase → project **GGSARENA**
2. Sidebar kiri → **SQL Editor** → **New query**
3. Copy **seluruh isi** file [`supabase/schema.sql`](supabase/schema.sql) → paste → klik **Run**
4. Harus muncul "Success. No rows returned" ✅

Ini bikin tabel `scores` + index + RLS (publik cuma bisa baca, nulis harus lewat Edge Function) + nyalain realtime.

## Langkah 2 — Deploy Edge Function anti-cheat
1. Sidebar kiri → **Edge Functions** → **Deploy a new function** → pilih **Via Editor**
2. Nama function: `submit-score` (persis, pakai strip)
3. Hapus contoh kode → copy **seluruh isi** [`supabase/functions/submit-score/index.ts`](supabase/functions/submit-score/index.ts) → paste → klik **Deploy function**
4. PENTING: function ini harus bisa diakses tanpa login user.
   Buka function `submit-score` → **Details/Settings** → **matikan "Verify JWT"** (set OFF) → Save.
   (Validasinya udah di dalam kode function, bukan di JWT.)

## Langkah 3 — Kasih anon key ke frontend
1. Sidebar kiri → **Project Settings** (gir) → **API Keys**
2. Copy key yang berlabel **`anon` / `public`** (JANGAN yang `service_role`!)
3. Kirim key itu ke Claude — atau edit sendiri [`js/config.js`](js/config.js):
   ganti `PASTE_ANON_KEY_DI_SINI` dengan key-nya → commit + push
4. Begitu ke-push, Vercel auto-deploy → footer site bakal nulis **BACKEND: SUPABASE** ✅

## Cek beres
- Buka https://ggsarena.vercel.app → footer: `BACKEND: SUPABASE`
- Main 1 game → submit skor → buka site dari HP/browser lain → skor muncul juga = **shared leaderboard jalan** 🎉
- Submit spam berkali-kali cepet → ketolak ("Santai bro...") = anti-cheat jalan

## Catatan keamanan
- **anon key** = publik by design, aman di repo (dilindungi RLS)
- **service_role key** = RAHASIA. Jangan pernah dishare/dicommit. Edge Function udah dapet otomatis dari environment Supabase.
- Password database cuma buat lo. Nggak dipakai app.
