// ============================================================
// GGS ARENA — Kartu Skor (share ke Instagram Story / sosmed)
// Generate PNG 1080x1920 gaya Performance Lab via canvas.
// Mobile: native share sheet (IG muncul) · Desktop: auto-download.
// ============================================================

import { toast } from './util.js';

const W = 1080, H = 1920;
const PAPER = '#ECEAE4', PAPER2 = '#E3E1DA', INK = '#16181D',
      INK2 = '#3A3D45', INK3 = '#6E7178', ACCENT = '#E8401F';

let _logo = null;
function loadLogo() {
  if (_logo) return Promise.resolve(_logo);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { _logo = img; resolve(img); };
    img.onerror = () => resolve(null);
    img.src = 'assets/ggs-logo.svg';
  });
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('700 300px "JetBrains Mono"'),
      document.fonts.load('600 60px "JetBrains Mono"'),
      document.fonts.load('700 80px "Space Grotesk"'),
      document.fonts.ready,
    ]);
  } catch { /* fallback font tetap kebaca */ }
}

function tick(cx, x, y, dx, dy, len = 34) {
  cx.beginPath();
  cx.moveTo(x + dx * len, y); cx.lineTo(x, y); cx.lineTo(x, y + dy * len);
  cx.stroke();
}

/**
 * Bikin kartu skor. opts:
 * { gameLabel, station, score, unit, player, metrics:[{v,l}x3], tag }
 * return { blob, dataUrl }
 */
export async function buildScoreCard(opts) {
  await ensureFonts();
  const logo = await loadLogo();

  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const cx = cvs.getContext('2d');

  // ---- background paper + garis blueprint halus
  cx.fillStyle = PAPER; cx.fillRect(0, 0, W, H);
  cx.strokeStyle = 'rgba(22,24,29,0.05)'; cx.lineWidth = 2;
  for (let y = 80; y < H; y += 80) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(W, y); cx.stroke(); }

  // ---- corner calibration ticks
  cx.strokeStyle = INK; cx.lineWidth = 5;
  tick(cx, 48, 48, 1, 1); tick(cx, W - 48, 48, -1, 1);
  tick(cx, 48, H - 48, 1, -1); tick(cx, W - 48, H - 48, -1, -1);

  const cxr = W / 2;

  // ---- logo + brand
  if (logo) {
    const lw = 330, lh = lw * (25.41 / 107.82);
    cx.drawImage(logo, cxr - lw / 2, 120, lw, lh);
  } else {
    cx.fillStyle = INK; cx.font = '700 70px "Space Grotesk", sans-serif';
    cx.textAlign = 'center'; cx.fillText('GGS', cxr, 180);
  }
  cx.textAlign = 'center';
  cx.fillStyle = INK3; cx.font = '600 26px "JetBrains Mono", monospace';
  cx.fillText('G G S   A R E N A   ·   P E R F O R M A N C E   L A B', cxr, 268);

  // rule
  cx.fillStyle = INK; cx.fillRect(80, 320, W - 160, 4);

  // ---- station + game
  cx.fillStyle = ACCENT; cx.font = '700 34px "JetBrains Mono", monospace';
  cx.fillText(`${opts.station}  ·  ${opts.gameLabel.toUpperCase()}`, cxr, 430);

  // ---- player
  cx.fillStyle = INK2; cx.font = '600 30px "JetBrains Mono", monospace';
  cx.fillText('O P E R A T O R', cxr, 540);
  cx.fillStyle = INK; cx.font = '700 92px "Space Grotesk", sans-serif';
  cx.fillText(opts.player, cxr, 650);

  // ---- skor raksasa
  const scoreStr = String(opts.score);
  let fs = scoreStr.length <= 3 ? 380 : scoreStr.length === 4 ? 300 : 240;
  cx.fillStyle = INK; cx.font = `700 ${fs}px "JetBrains Mono", monospace`;
  cx.fillText(scoreStr, cxr, 1080);
  cx.fillStyle = ACCENT; cx.font = '700 44px "JetBrains Mono", monospace';
  cx.fillText(opts.unit.toUpperCase(), cxr, 1160);
  if (opts.tag) {
    cx.fillStyle = INK2; cx.font = '600 40px "Space Grotesk", sans-serif';
    cx.fillText(opts.tag, cxr, 1240);
  }

  // ---- metrik 3 kolom (panel)
  const py = 1310, ph = 210, px = 80, pw = W - 160;
  cx.fillStyle = PAPER2; cx.fillRect(px, py, pw, ph);
  cx.strokeStyle = INK; cx.lineWidth = 4; cx.strokeRect(px, py, pw, ph);
  const colW = pw / 3;
  opts.metrics.slice(0, 3).forEach((m, i) => {
    const mx = px + colW * i + colW / 2;
    if (i > 0) {
      cx.strokeStyle = 'rgba(22,24,29,0.25)'; cx.lineWidth = 2;
      cx.beginPath(); cx.moveTo(px + colW * i, py + 30); cx.lineTo(px + colW * i, py + ph - 30); cx.stroke();
    }
    cx.fillStyle = INK; cx.font = '700 64px "JetBrains Mono", monospace';
    cx.fillText(String(m.v), mx, py + 105);
    cx.fillStyle = INK3; cx.font = '600 24px "JetBrains Mono", monospace';
    cx.fillText(m.l.toUpperCase(), mx, py + 160);
  });

  // ---- CTA tantangan (blok ink)
  const by = 1610, bh = 150;
  cx.fillStyle = INK; cx.fillRect(80, by, W - 160, bh);
  cx.fillStyle = ACCENT; cx.fillRect(80, by, 14, bh);
  cx.fillStyle = PAPER; cx.font = '700 52px "Space Grotesk", sans-serif';
  cx.fillText('Kalahin gw kalo bisa 🔥', cxr, by + 92);

  // ---- footer
  const now = new Date();
  const tgl = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  cx.fillStyle = INK2; cx.font = '600 30px "JetBrains Mono", monospace';
  cx.fillText('goodgamingshop.com  ·  @goodgamingshop', cxr, 1830);
  cx.fillStyle = INK3; cx.font = '500 24px "JetBrains Mono", monospace';
  cx.fillText(`CERTIFIED RUN · ${tgl.toUpperCase()}`, cxr, 1875);

  const blob = await new Promise((r) => cvs.toBlob(r, 'image/png'));
  return { blob, dataUrl: cvs.toDataURL('image/png') };
}

/**
 * Share kartu: native share sheet kalau bisa (IG nongol di situ),
 * kalau nggak → download PNG. return 'shared' | 'downloaded' | 'cancel'
 */
export async function shareScoreCard(opts) {
  const { blob } = await buildScoreCard(opts);
  const file = new File([blob], `ggs-arena-${opts.gameLabel.toLowerCase().replace(/\s+/g, '-')}-${opts.score}.png`, { type: 'image/png' });
  const text = `${opts.player} — ${opts.score} ${opts.unit} di ${opts.gameLabel}, GGS Arena 🔥 Kalahin kalo bisa!`;

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'GGS Arena', text });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancel';
    }
  }
  // fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

/** Toast standar habis share (mekanik hadiah) */
export function shareOutcomeToast(result) {
  if (result === 'shared') toast('Post ke IG Story + tag @goodgamingshop buat klaim hadiah 🎁');
  else if (result === 'downloaded') toast('Kartu ke-download! Upload ke IG Story + tag @goodgamingshop 🎁');
}
