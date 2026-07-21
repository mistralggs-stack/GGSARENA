// ============================================================
// GGS ARENA — konfigurasi Supabase (frontend)
// ------------------------------------------------------------
// CATATAN KEAMANAN:
// - SUPABASE_ANON_KEY memang PUBLIK (aman di repo) — dilindungi RLS:
//   publik cuma bisa BACA skor; nulis harus lewat Edge Function.
// - JANGAN PERNAH taro service_role key di file ini / frontend manapun.
// - Selama ANON_KEY masih placeholder, app otomatis fallback ke mode LOCAL.
// ============================================================

export const SUPABASE_URL = 'https://wuikzfaeadrugpkgvkgd.supabase.co';
export const SUPABASE_ANON_KEY = 'PASTE_ANON_KEY_DI_SINI';
