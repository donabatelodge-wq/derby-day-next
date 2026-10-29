"use client";

import { useEffect, useState } from "react";
import { QrCode, X, Download, Printer, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

const FONT = `system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
const font = (px: number, weight = "700") => `${weight} ${px}px ${FONT}`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (!line || ctx.measureText(test).width <= maxWidth) line = test;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines;
}

// Draws a printable poster (title, QR code, join details) and returns it as a PNG data URL.
async function buildPoster(opts: {
  url: string; name: string; code: string; pin: string; extra: string; host: string;
}): Promise<string> {
  const mod: any = await import("qrcode");
  const toDataURL = mod.toDataURL || mod.default?.toDataURL;
  const qrUrl: string = await toDataURL(opts.url, {
    errorCorrectionLevel: "M", margin: 1, width: 800,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const qrImg = await loadImage(qrUrl);

  const W = 1080;
  const pad = 80;
  const measure = document.createElement("canvas").getContext("2d")!;

  measure.font = font(66);
  const titleLines = wrap(measure, opts.name, W - pad * 2).slice(0, 3);

  measure.font = font(38, "500");
  const extraLines = opts.extra.trim() ? wrap(measure, opts.extra.trim(), W - pad * 2).slice(0, 2) : [];

  const headerH = 230;
  const titleTop = headerH + 80;
  const titleBottom = titleTop + titleLines.length * 80;
  const qrSize = 640;
  const qrY = titleBottom + 60;
  const scanY = qrY + qrSize + 80;
  const codeY = scanY + 120;
  const extraTop = codeY + 90;
  const lastBottom = extraLines.length > 0 ? extraTop + extraLines.length * 52 : codeY + 60;
  const footerY = lastBottom + 50;
  const H = footerY + 40 + 70;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#0f172a");
  grad.addColorStop(1, "#0f4c2a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, headerH);

  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = font(84);
  ctx.fillText("🏇 Derby Day", W / 2, 95);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = font(32, "500");
  ctx.fillText("Competition Management Platform", W / 2, 165);

  ctx.textBaseline = "top";
  ctx.fillStyle = "#0f172a";
  ctx.font = font(66);
  titleLines.forEach((l, i) => ctx.fillText(l, W / 2, titleTop + i * 80));

  const boxPad = 24;
  const qrX = (W - qrSize) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 4;
  ctx.fillRect(qrX - boxPad, qrY - boxPad, qrSize + boxPad * 2, qrSize + boxPad * 2);
  ctx.strokeRect(qrX - boxPad, qrY - boxPad, qrSize + boxPad * 2, qrSize + boxPad * 2);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#16a34a";
  ctx.font = font(88);
  ctx.fillText("Scan to join", W / 2, scanY);

  ctx.fillStyle = "#0f172a";
  ctx.font = font(46, "600");
  ctx.fillText(opts.pin ? `Code ${opts.code}  ·  PIN ${opts.pin}` : `Code ${opts.code}`, W / 2, codeY);

  ctx.fillStyle = "#475569";
  ctx.font = font(38, "500");
  extraLines.forEach((l, i) => ctx.fillText(l, W / 2, extraTop + i * 52));

  ctx.fillStyle = "#64748b";
  ctx.font = font(40, "600");
  ctx.fillText(opts.host, W / 2, footerY);

  return canvas.toDataURL("image/png");
}

// Organiser-only: a printable/downloadable QR code poster that opens this competition's
// invite page. The PIN is built into the link, so anyone who scans can join.
export function QrCodeButton({ group }: { group: any }) {
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState("");
  const [poster, setPoster] = useState<string | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);

  const inviteUrl = () =>
    `${window.location.origin}/invite?code=${group.invite_code}&pin=${group.join_pin || ""}`;
  const filename = `derby-day-${String(group.name || "competition").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-poster.png`;

  useEffect(() => {
    try {
      const f = new File([""], "x.png", { type: "image/png" });
      setCanShareFile(!!(navigator as any).canShare?.({ files: [f] }));
    } catch {
      setCanShareFile(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const url = await buildPoster({
          url: inviteUrl(),
          name: group.name || "Competition",
          code: group.invite_code,
          pin: group.join_pin || "",
          extra,
          host: window.location.host,
        });
        if (!cancelled) setPoster(url);
      } catch {
        if (!cancelled) toast.error("Couldn't create the QR code. Please try again.");
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, extra, group.name, group.invite_code, group.join_pin]);

  const download = () => {
    if (!poster) return;
    const a = document.createElement("a");
    a.href = poster;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const share = async () => {
    if (!poster) return;
    try {
      const blob = await (await fetch(poster)).blob();
      const file = new File([blob], filename, { type: "image/png" });
      await (navigator as any).share({ files: [file], title: group.name });
    } catch {
      // cancelled or not supported — nothing to do
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl());
      toast.success("Invite link copied.");
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-base font-bold text-white border border-white/30 active:scale-95 transition-all">
        <QrCode className="w-5 h-5" /> QR code poster
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #derby-qr-print, #derby-qr-print * { visibility: visible !important; }
              #derby-qr-print { position: fixed !important; left: 0; top: 0; width: 100%; max-height: 100vh; object-fit: contain; border: 0 !important; }
              @page { margin: 8mm; }
            }
          `}</style>
          <div className="w-full max-w-sm rounded-3xl p-5 space-y-4 bg-white text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">QR code poster</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img id="derby-qr-print" src={poster} alt={`QR code for ${group.name}`}
                className="w-full rounded-xl border border-slate-200" />
            ) : (
              <div className="w-full h-64 rounded-xl border border-slate-200 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Extra line on the poster (optional)</label>
              <input value={extra} onChange={e => setExtra(e.target.value)} maxLength={80}
                placeholder="e.g. Use your full name so we can match your entry"
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-base" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={download} disabled={!poster}
                className="h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                style={{ background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)" }}>
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={() => window.print()} disabled={!poster}
                className="h-12 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                <Printer className="w-4 h-4" /> Print
              </button>
              {canShareFile && (
                <button onClick={share} disabled={!poster}
                  className="h-12 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                  <Share2 className="w-4 h-4" /> Share image
                </button>
              )}
              <button onClick={copyLink}
                className="h-12 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 active:scale-95">
                <Copy className="w-4 h-4" /> Copy link
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              The PIN is built into this code, so anyone who scans it can join. Joining closes 30 minutes before the first race.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
