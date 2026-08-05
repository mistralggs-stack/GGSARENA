// Audit skor curang di Supabase — nyari yang kena flag anti-cheat / lewat batas manusia.
// Kunci TIDAK pernah ditulis di file ini: taro di env var pas jalanin.
//
//   export SUPABASE_SERVICE_KEY='...'          # service_role key (rahasia, jangan di-commit)
//   node scripts/audit-scores.mjs              # cuma NAMPILIN tersangka (aman, read-only)
//   node scripts/audit-scores.mjs --delete id1,id2,id3   # hapus id tertentu (permanen)
//
// Sengaja gak ada opsi "hapus semua sekaligus" — id harus disebut satu-satu
// biar gak ada skor sah yang kehapus gara-gara salah pencet.

const URL_BASE = process.env.SUPABASE_URL || 'https://wuikzfaeadrugpkgvkgd.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_KEY;

if (!KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY belum diisi.\n   Jalanin: export SUPABASE_SERVICE_KEY=\'...\' dulu.');
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function api(path, opts = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

// Alasan sebuah skor dicurigai. Ambang batasnya sama persis sama yang dipakai
// anti-cheat di browser (js/games/*.js) biar konsisten.
function alasanCurang(row) {
  const d = row.detail || {};
  const alasan = [];

  if (Array.isArray(d.macro_flags) && d.macro_flags.length) alasan.push(`flag macro: ${d.macro_flags.join(', ')}`);
  if (Array.isArray(d.cheat_flags) && d.cheat_flags.length) alasan.push(`flag cheat: ${d.cheat_flags.join(', ')}`);

  if (row.game === 'cps') {
    if (row.score > 190) alasan.push(`${(row.score / 10).toFixed(1)} CPS — di atas batas manusia (19)`);
    if (d.peak_sec > 25) alasan.push(`${d.peak_sec} klik dalam 1 detik`);
    if (d.gap_cv !== undefined && d.gap_cv !== null && d.gap_cv < 0.06) alasan.push(`ritme metronom (gap_cv ${d.gap_cv})`);
    if (d.distinct_pos !== undefined && d.distinct_pos <= 2 && row.score >= 80) alasan.push('kursor diam di 1 titik');
  }
  if (row.game === 'typing') {
    if (d.wpm > 170) alasan.push(`${d.wpm} WPM — di atas rekor dunia`);
    if (d.max_burst >= 12) alasan.push(`teks masuk borongan (${d.max_burst} char sekaligus)`);
    if (d.char_cv !== undefined && d.char_cv !== null && d.char_cv < 0.12) alasan.push(`ritme ngetik robot (char_cv ${d.char_cv})`);
  }
  if (row.game === 'reaction') {
    if (row.score > 450) alasan.push(`rata² ${d.avg_ms}ms — terlalu cepat buat manusia`);
  }
  if (row.game === 'aim') {
    if (d.min_gap !== undefined && d.min_gap !== null && d.min_gap < 25) alasan.push(`klik beruntun ${d.min_gap}ms`);
  }
  return alasan;
}

function tampilkan(rows, judul) {
  console.log(`\n${judul}`);
  if (!rows.length) { console.log('  (gak ada — bersih ✅)'); return; }
  for (const r of rows) {
    const tgl = String(r.created_at).slice(0, 16).replace('T', ' ');
    console.log(`  • ${r.player_name} — ${r.score} poin · ${tgl}`);
    console.log(`    id: ${r.id}`);
    for (const a of alasanCurang(r)) console.log(`    ⚠ ${a}`);
  }
}

async function audit() {
  const semua = await api('scores?select=*&order=score.desc&limit=2000');
  console.log(`Total skor di database: ${semua.length}`);

  const tersangka = semua.filter((r) => alasanCurang(r).length > 0);
  for (const game of ['cps', 'typing', 'reaction', 'aim']) {
    tampilkan(tersangka.filter((r) => r.game === game), `=== ${game.toUpperCase()} — tersangka curang ===`);
  }

  // Top 10 tiap game buat di-eyeball manual (kadang curang gak ketangkep pola)
  console.log('\n=== TOP 10 tiap game (buat review manual) ===');
  for (const game of ['aim', 'typing', 'reaction', 'cps']) {
    const top = semua.filter((r) => r.game === game).slice(0, 10);
    console.log(`\n${game.toUpperCase()}:`);
    top.forEach((r, i) => console.log(`  ${String(i + 1).padStart(2)}. ${r.score} — ${r.player_name} (${r.id})`));
  }

  console.log(`\n${tersangka.length} skor kena flag. Hapus dengan:`);
  console.log('  node scripts/audit-scores.mjs --delete <id1>,<id2>');
}

async function hapus(idsRaw) {
  const ids = idsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!ids.length) { console.error('❌ Gak ada id yang disebut.'); process.exit(1); }

  // tunjukin dulu apa yang bakal kehapus — biar ketauan kalau salah id
  const list = await api(`scores?id=in.(${ids.map(encodeURIComponent).join(',')})&select=*`);
  if (!list.length) { console.error('❌ Id-nya gak ketemu di database.'); process.exit(1); }
  console.log('Yang bakal dihapus:');
  list.forEach((r) => console.log(`  • ${r.player_name} — ${r.game} ${r.score} poin (${r.id})`));

  await api(`scores?id=in.(${ids.map(encodeURIComponent).join(',')})`, { method: 'DELETE' });
  console.log(`\n✅ ${list.length} skor dihapus.`);
}

const argDelete = process.argv.indexOf('--delete');
try {
  if (argDelete !== -1) await hapus(process.argv[argDelete + 1] || '');
  else await audit();
} catch (e) {
  console.error('❌ Gagal:', e.message);
  process.exit(1);
}
