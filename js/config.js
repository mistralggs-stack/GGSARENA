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
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1aWt6ZmFlYWRydWdwa2d2a2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NDM3NTYsImV4cCI6MjEwMDIxOTc1Nn0.BA1OBP_IyLxyt9aD5cjjKsy-lr-9JGVgJIuKzqRrCkQ';
