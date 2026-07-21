// ============================================================
// GGS ARENA — Edge Function: submit-score (anti-cheat dasar)
// Deploy: Dashboard -> Edge Functions -> Deploy new function
//         nama: submit-score -> paste file ini -> Deploy
// Validasi: batas skor per game, nickname, 1 submit per run,
//           rate limit per IP (3/menit), sanity check reaction.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const LIMITS: Record<string, number> = { aim: 20000, typing: 400, reaction: 1000, cps: 300 };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const { player_name, game, score, detail, run_id, event_id } = await req.json();

    // --- validasi dasar
    const name = String(player_name ?? "").trim();
    if (name.length < 2 || name.length > 18) return json({ ok: false, error: "Nickname 2-18 karakter." }, 400);
    if (typeof game !== "string" || !(game in LIMITS)) return json({ ok: false, error: "Game tidak dikenal." }, 400);
    const s = Number(score);
    if (!Number.isInteger(s) || s < 0 || s > LIMITS[game]) {
      return json({ ok: false, error: "Skor di luar batas wajar, ketolak." }, 400);
    }
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof run_id !== "string" || !uuidRe.test(run_id)) return json({ ok: false, error: "Run tidak valid." }, 400);
    const det = detail && typeof detail === "object" && !Array.isArray(detail) ? detail : {};
    if (JSON.stringify(det).length > 2000) return json({ ok: false, error: "Detail kegedean." }, 400);

    // --- sanity check per game (kasar tapi nolak yang mustahil)
    if (game === "reaction" && det.avg_ms !== undefined && Number(det.avg_ms) < 80) {
      return json({ ok: false, error: "Reaksi terlalu cepat buat manusia 🤨" }, 400);
    }
    if (game === "typing" && det.wpm !== undefined && Number(det.wpm) > 300) {
      return json({ ok: false, error: "WPM di luar batas manusia 🤨" }, 400);
    }

    // --- rate limit per IP (di-hash, IP asli tidak disimpan)
    const ip = (req.headers.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
    const salt = Deno.env.get("IP_SALT") ?? "ggs-arena-v1";
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + salt));
    const ip_hash = Array.from(new Uint8Array(buf)).slice(0, 12)
      .map((b) => b.toString(16).padStart(2, "0")).join("");

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await sb.from("scores")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ip_hash).gte("created_at", since);
    if ((count ?? 0) >= 3) return json({ ok: false, error: "Santai bro, kebanyakan submit 😅 Coba semenit lagi." }, 429);

    // --- insert (run_id unique -> submit kedua utk run yang sama ketolak)
    const { data: row, error } = await sb.from("scores")
      .insert({ player_name: name.slice(0, 18), game, score: s, detail: det, run_id, event_id: event_id ?? null, ip_hash })
      .select("id, player_name, game, score, detail, event_id, created_at")
      .single();

    if (error) {
      if ((error as { code?: string }).code === "23505") return json({ ok: false, error: "Run ini udah pernah di-submit." }, 409);
      return json({ ok: false, error: "Gagal simpan skor." }, 500);
    }
    return json({ ok: true, row });
  } catch {
    return json({ ok: false, error: "Request tidak valid." }, 400);
  }
});
