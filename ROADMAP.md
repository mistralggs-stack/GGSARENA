# GGS ARENA — Roadmap & Ide

> Semua opsi ke depan, dikumpulin di satu tempat. Status per 19 Juli 2026.

## ✅ Udah jadi (Tahap 1++)
- 3 game: **Aim Trainer** (combo x1–x5), **Typing Test** (1 menit, teks ngalir), **Reaction Time** (mode warna MERAH/KUNING/HIJAU + jebakan)
- Design **Performance Lab** + logo GGS + ikon custom
- **Leaderboard**: papan penuh di hub + game view, toggle **All-time / Bulan Ini**, **Podium Top 3** 🥇🥈🥉
- **Popup hasil juicy**: skor count-up, confetti + badge REKOR, sound effect + mute
- **Share & Tantang**, **Posisi lo #X dari Y**
- Gear di leaderboard = **CTA link ke toko** (search GGS)
- **3 slot sponsor** + footer lengkap + tombol **Be Our Sponsor**
- **Fullscreen** tiap game, **data demo** (`?demo=1`)
- Backend: `localStorage` (per-device) — **belum shared**

---

## 🧭 Jalur rekomendasi (urutan garap)
1. **Tahap 2 — Supabase** → fondasi: leaderboard shared realtime + anti-cheat
2. **Tahap 3 — Turnamen bulanan + voucher** → mesin traffic utama
3. **Growth cheap wins** (challenge link, kartu skor, SEO) → viral + organik
4. **Tahap 4 — Deploy + embed** ke goodgamingshop.com

---

## 🗂️ Semua opsi

### A. Backend — Tahap 2 (WAJIB, fondasi)
| Ide | Dampak | Effort | Kapan |
|---|---|---|---|
| Supabase Postgres: leaderboard **shared realtime** | ●●● | ●● | Tahap 2 |
| Edge Function **anti-cheat** (rate limit, batas skor, 1 submit/run) | ●●● | ●● | Tahap 2 |
| Recap bulanan **server-side** (valid, gak bisa diakalin) | ●●● | ● | Tahap 2 |

### B. Turnamen & Event — Tahap 3 (mesin traffic)
| Ide | Dampak | Effort | Kapan |
|---|---|---|---|
| Admin panel: bikin event, hapus skor curang, **export CSV pemenang** | ●●● | ●●● | Tahap 3 |
| Event leaderboard + **countdown** | ●●● | ●● | Tahap 3 |
| **Challenge bulanan + hadiah voucher GGS** | ●●● | ●● | Tahap 3 |
| **Diskon code Top-3** tiap bulan → dorong sales | ●●● | ● | Tahap 3 |

### C. Growth & Viral (sebagian bisa SEKARANG)
| Ide | Dampak | Effort | Kapan |
|---|---|---|---|
| **Challenge link** "kalahin skor gw" (viral loop) | ●●● | ● | Sekarang |
| **Kartu skor share** (gambar buat IG story / WA) | ●●● | ●● | Sekarang |
| **OG preview + SEO** (traffic organik Google) | ●● | ● | Sekarang |
| **QR code in-store** (offline → online) | ●● | ● | Sekarang |
| Referral ringan (ajak temen → entry undian) | ●● | ●● | Tahap 2 |
| Affiliate komisi-sales (butuh integrasi toko — **tunda**) | ●●● | ●●●● | Nanti |

### D. Deploy & Embed — Tahap 4
| Ide | Dampak | Effort | Kapan |
|---|---|---|---|
| Deploy GitHub Pages / Vercel | ●●● | ● | Tahap 4 |
| Embed iframe di goodgamingshop.com (`allowfullscreen`) | ●●● | ● | Tahap 4 |
| **Embed game di halaman produk** (aim di halaman mouse → konversi) | ●●● | ●● | Tahap 4 |

### E. Big Ideas (super menarik, jangka panjang)
| Ide | Dampak | Effort | Kapan |
|---|---|---|---|
| **Duel 1v1 realtime** (adu langsung sama temen) | ●●● | ●●●● | Nanti |
| **Daily challenge + streak** (balik tiap hari) | ●●● | ●● | Nanti |
| **Achievements / badges** | ●● | ●● | Nanti |
| **Leaderboard per-gear** ("jagoan pakai mouse ATK") — nyambung produk | ●●● | ●● | Nanti |
| **"Pro vs You"** — kalahin skor staff/pro GGS | ●● | ● | Nanti |
| **Season / tema terbatas** (skin arena tiap bulan) | ●● | ●● | Nanti |
| **Loyalty**: main → poin → diskon toko | ●●● | ●●●● | Nanti |
| **Mode in-store layar besar** (turnamen offline, tampil di TV) | ●● | ●● | Nanti |
| Game baru: CPS clicker, tracking, flick, memory | ●● | ●● | Nanti |

---

## 📌 Yang perlu lo siapin (buat isi placeholder)
- Email sponsor (sekarang `partnership@goodgamingshop.com`)
- Handle sosial asli (IG / TikTok / Discord) + nomor WhatsApp
- Akun Supabase (buat Tahap 2)
