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

  // Message area: whatever room is left between the
