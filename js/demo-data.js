// ============================================================
// GGS ARENA — data demo (5 pemain, skor di semua station)
// Dipakai buat ngisi leaderboard biar keliatan pas demo/presentasi.
// Load via URL ?demo=1  ·  hapus via ?demo=off
// (backend lokal Tahap 1 — di Tahap 2 diganti data asli Supabase)
// ============================================================

export const DEMO = [
  // ---------- AIM TRAINER ----------
  { player_name: 'Reyz',    game: 'aim', score: 872, detail: { accuracy: 91, max_combo: 5, mouse: 'Vaxee XE',            glide: 'Superglide Glass', dpi: 800,  win_sens: 6, polling: 8000, discord: '@reyz' } },
  { player_name: 'Dovah',   game: 'aim', score: 810, detail: { accuracy: 88, max_combo: 5, mouse: 'Razer Viper V3 Pro', glide: 'Razer PTFE',       dpi: 1600, win_sens: 6, polling: 8000, discord: '@dovahh' } },
  { player_name: 'Bagas',   game: 'aim', score: 645, detail: { accuracy: 84, max_combo: 4, mouse: 'Lamzu Atlantis',     glide: 'Corepad Skatez',   dpi: 1600, win_sens: 6, polling: 4000, discord: '@bagasgg' } },
  { player_name: 'SasaFPS', game: 'aim', score: 590, detail: { accuracy: 82, max_combo: 4, mouse: 'Pulsar X2',          glide: 'Tiger Ice',        dpi: 1000, win_sens: 6, polling: 1000, discord: '@sasa' } },
  { player_name: 'MalikGG', game: 'aim', score: 430, detail: { accuracy: 76, max_combo: 3, mouse: 'Logitech GPX 2',     glide: 'Stock',            dpi: 400,  win_sens: 6, polling: 2000, discord: '@malik' } },

  // ---------- TYPING TEST ----------
  { player_name: 'Bagas',   game: 'typing', score: 128, detail: { wpm: 136, accuracy: 94, keyboard: 'Keychron Q1',  switches: 'Gateron Oil King', discord: '@bagasgg' } },
  { player_name: 'SasaFPS', game: 'typing', score: 119, detail: { wpm: 128, accuracy: 93, keyboard: 'GMMK Pro',     switches: 'Boba U4T',         discord: '@sasa' } },
  { player_name: 'Reyz',    game: 'typing', score: 104, detail: { wpm: 115, accuracy: 90, keyboard: 'Wooting 60HE', switches: 'Lekker',           discord: '@reyz' } },
  { player_name: 'MalikGG', game: 'typing', score: 92,  detail: { wpm: 101, accuracy: 91, keyboard: 'Ajazz AK820',  switches: 'Cherry MX Red',    discord: '@malik' } },
  { player_name: 'Dovah',   game: 'typing', score: 77,  detail: { wpm: 88,  accuracy: 87, keyboard: 'Mode Sonnet',  switches: 'Alpaca',           discord: '@dovahh' } },

  // ---------- REACTION TIME ----------
  { player_name: 'Dovah',   game: 'reaction', score: 469, detail: { avg_ms: 128, best_ms: 116, rounds: 5, mouse: 'Razer Viper V3 Pro', polling: 8000, discord: '@dovahh' } },
  { player_name: 'Reyz',    game: 'reaction', score: 432, detail: { avg_ms: 139, best_ms: 122, rounds: 5, mouse: 'Vaxee XE',            polling: 8000, discord: '@reyz' } },
  { player_name: 'SasaFPS', game: 'reaction', score: 397, detail: { avg_ms: 151, best_ms: 133, rounds: 5, mouse: 'Pulsar X2',          polling: 1000, discord: '@sasa' } },
  { player_name: 'MalikGG', game: 'reaction', score: 357, detail: { avg_ms: 168, best_ms: 149, rounds: 5, mouse: 'Logitech GPX 2',     polling: 2000, discord: '@malik' } },
  { player_name: 'Bagas',   game: 'reaction', score: 330, detail: { avg_ms: 182, best_ms: 160, rounds: 5, mouse: 'Lamzu Atlantis',     polling: 4000, discord: '@bagasgg' } },
];
