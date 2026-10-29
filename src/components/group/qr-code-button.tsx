"use client";

import { useEffect, useState } from "react";
import { QrCode, X, Download, Printer, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const FONT = `system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
const font = (px: number, weight = "700") => `${weight} ${px}px ${FONT}`;

const MESSAGE_MAX = 400;

// Neutral suggested poster message: the same wording works for every organiser, whatever way they collect entry.
function suggestMessage(fee: string, days: number, name: string): string {
  const f = fee.trim();
  const parts: string[] = [];
  if (f) {
    parts.push(`Entry: ${f} per player${days > 1 ? ` for all ${days} days` : ""}.`);
    parts.push("The organiser will tell you how to pay after you join.");
  } else {
    parts.push("Entry details are given by the organiser after you join.");
  }
  parts.push("Unpaid entries are removed before racing starts.");
  parts.push(name ? `Good luck all! ${name}` : "Good luck all!");
  return parts.join(" ");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
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

// Wraps text (keeping the organiser's own line breaks) and shrinks the font until it fits the box.
function fitText(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxHeight: number,
  maxPx: number, minPx: number, weight: string,
): { px: number; lineH: number; lines: string[] } {
  const paragraphs = text.replace(/\r/g, "").split("\n");
  let result = { px: minPx, lineH: Math.round(minPx * 1.3), lines: [] as string[] };
  for (let px = maxPx; px >= minPx; px -= 2) {
    ctx.font = font(px, weight);
    const lines = paragraphs.flatMap(p => (p.trim() ? wrapLine(ctx, p.trim(), maxWidth) : [""]));
    const lineH = Math.round(px * 1.3);
    result = { px, lineH, lines };
    if (lines.length * lineH <= maxHeight) return result;
  }
  // Still too long at the smallest size: cut it off with an ellipsis.
  const maxLines = Math.max(1, Math.floor(maxHeight / result.lineH));
  const cut = result.lines.slice(0, maxLines);
  if (result.lines.length > maxLines) cut[cut.length - 1] = `${cut[cut.length - 1].replace(/[\s.,;:]+$/, "")}…`;
  return { ...result, lines: cut };
}

// Draws a fixed-size A4 poster (title, QR code, join details, message) and returns a PNG data URL.
async function buildPoster(opts: {
  url: string; name: string; code: string; pin: string; message: string; host: string;
}): Promise<string> {
  const W = 1240;
  const H = 1754; // A4 proportions (1 : 1.414)
  const pad = 90;
  const message = opts.message.trim();
  const hasMessage = message.length > 0;
  const qrSize = hasMessage ? 560 : 760;

  const mod: any = await import("qrcode");
  const toDataURL = mod.toDataURL || mod.default?.toDataURL;
  const qrUrl: string = await toDataURL(opts.url, {
    errorCorrectionLevel: "M", margin: 1, width: qrSize,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const qrImg = await loadImage(qrUrl);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Header band
  const headerH = 230;
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#0f172a");
  grad.addColorStop(1, "#0f4c2a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, headerH);
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.font = font(92);
  ctx.fillText("🏇 Derby Day", W / 2, 100);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = font(34, "500");
  ctx.fillText("Competition Management Platform", W / 2, 175);
  ctx.textBaseline = "top";

  // Competition name: fixed zone, shrinks to fit (up to a couple of lines)
  const titleTop = headerH + 25;
  const titleZoneH = 190;
  const title = fitText(ctx, opts.name, W - pad * 2, titleZoneH, 78, 42, "700");
  const titleBlockH = title.lines.length * title.lineH;
  ctx.fillStyle = "#0f172a";
  ctx.font = font(title.px);
  title.lines.forEach((l, i) =>
    ctx.fillText(l, W / 2, titleTop + (titleZoneH - titleBlockH) / 2 + i * title.lineH));

  // QR code
  const boxPad = 24;
  const boxTop = titleTop + titleZoneH + 25;
  const boxSize = qrSize + boxPad * 2;
  const boxX = (W - boxSize) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 4;
  ctx.fillRect(boxX, boxTop, boxSize, boxSize);
  ctx.strokeRect(boxX, boxTop, boxSize, boxSize);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImg, boxX + boxPad, boxTop + boxPad, qrSize, qrSize);
  ctx.imageSmoothingEnabled = true;

  // Scan to join + code/PIN
  const scanY = boxTop + boxSize + 30;
  ctx.fillStyle = "#16a34a";
  ctx.font = font(86);
  ctx.fillText("Scan to join", W / 2, scanY);

  const codeY = scanY + 110;
  ctx.fillStyle = "#0f172a";
  ctx.font = font(48, "600");
  ctx.fillText(opts.pin ? `Code ${opts.code}  ·  PIN ${opts.pin}` : `Code ${opts.code}`, W / 2, codeY);

  // Footer sits at the bottom of the page
  const footerY = H - 100;

    // Message area: whatever room is left between the code line and the footer
  if (hasMessage) {
    const msgTop = codeY + 84;
    const msgH = footerY - 26 - msgTop;
    const msg = fitText(ctx, message, W - pad * 2, msgH, 46, 26, "500");
    ctx.fillStyle = "#334155";
    ctx.font = font(msg.px, "500");
    msg.lines.forEach((l, i) => ctx.fillText(l, W / 2, msgTop + i * msg.lineH));
  }

  ctx.fillStyle = "#64748b";
  ctx.font = font(40, "600");
  ctx.fillText(opts.host, W / 2, footerY);

  return canvas.toDataURL("image/png");
}

// Organiser-only: a printable/downloadable A4 QR code poster that opens this competition's
// invite page. The PIN is built into the link, so anyone who scans can join. The poster message
// is saved on the competition so it can be edited later. When none is saved yet, a neutral
// suggested message is offered for the organiser to review, edit and save.
export function QrCodeButton({ group, onSaved }: { group: any; onSaved?: (message: string) => void }) {
  const supabase = createClient();
  const saved: string = group.poster_message || "";

  const days: number = Array.isArray(group.meeting_ids) ? group.meeting_ids.length : 0;
  const organiserName: string = (() => {
    const names = group.member_names || {};
    const owner = String(group.owner_email || "").toLowerCase();
    const key = Object.keys(names).find(k => k.toLowerCase() === owner);
    const full = key ? String(names[key] || "") : "";
    return full.trim().split(/\s+/)[0] || "";
  })();
  const suggest = (f: string) => suggestMessage(f, days, organiserName);

  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState("");
  const [message, setMessage] = useState(saved || suggest(""));
  const [saving, setSaving] = useState(false);
  const [poster, setPoster] = useState<string | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);

  const inviteUrl = () =>
    `${window.location.origin}/invite?code=${group.invite_code}&pin=${group.join_pin || ""}`;
  const filename = `derby-day-${String(group.name || "competition").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-poster.png`;
  const dirty = message.trim() !== saved.trim();
  const isSuggestion = message.trim() === suggest(fee).trim();

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
          message,
          host: window.location.host,
        });
        if (!cancelled) setPoster(url);
      } catch {
        if (!cancelled) toast.error("Couldn't create the QR code. Please try again.");
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, message, group.name, group.invite_code, group.join_pin]);

  const openModal = () => {
    setMessage(group.poster_message || suggest(fee));
    setOpen(true);
  };

  // Changing the fee rewrites the message only while it is still the untouched suggestion.
  const changeFee = (v: string) => {
    const wasSuggestion = !message.trim() || message.trim() === suggest(fee).trim();
    setFee(v);
    if (wasSuggestion) setMessage(suggest(v));
  };

  const saveMessage = async () => {
    setSaving(true);
    const clean = message.trim();
    const db: any = supabase;
    const { error } = await db.from("groups").update({ poster_message: clean || null }).eq("id", group.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save the message. Please try again.");
      return;
    }
    setMessage(clean);
    onSaved?.(clean);
    toast.success("Message saved.");
  };

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
      <button onClick={openModal}
        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl text-base font-bold text-white border border-white/30 active:scale-95 transition-all">
        <QrCode className="w-5 h-5" />  Create QR code poster
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #derby-qr-print, #derby-qr-print * { visibility: visible !important; }
              #derby-qr-print { position: fixed !important; left: 0; top: 0; width: 100%; max-height: 100vh; object-fit: contain; border: 0 !important; }
              @page { size: A4 portrait; margin: 8mm; }
            }
          `}</style>
          <div className="w-full max-w-sm rounded-3xl p-5 space-y-4 bg-white text-slate-900 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base">QR code poster (A4)</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Entry fee (optional)</label>
              <input value={fee} onChange={e => changeFee(e.target.value)} maxLength={20}
                placeholder="e.g. €20 or £15 p.p."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base mb-3" />

              <label className="text-xs font-medium text-slate-500 block mb-1">Message on the poster (optional): how to enter, who to pay, closing time</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={MESSAGE_MAX} rows={5}
                placeholder={"e.g. Use your full name so we can match your entry.\nEntry fee: see Jim. Unpaid entries are removed before racing."}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-base" />
              <div className="flex items-center justify-between mt-1.5 gap-2">
                <p className="text-xs text-slate-400">{message.length}/{MESSAGE_MAX} · Enter makes a new line</p>
                <button onClick={saveMessage} disabled={!dirty || saving}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white disabled:opacity-40">
                  {saving ? "Saving..." : !dirty && saved ? "Saved ✓" : "Save message"}
                </button>
              </div>
              {!saved && isSuggestion && (
                <p className="text-xs text-amber-600 mt-1">Suggested message: read it, change anything you like, then tap Save message.</p>
              )}
              {!isSuggestion && (
                <button type="button" onClick={() => setMessage(suggest(fee))}
                  className="text-xs font-semibold text-slate-500 underline mt-1">
                  Reset to suggested message
                </button>
              )}
              <p className="text-xs text-slate-400 mt-1">Saved with this competition, so you can edit and reprint any time. Posters are public, so keep bank details off and say who to ask instead.</p>
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
