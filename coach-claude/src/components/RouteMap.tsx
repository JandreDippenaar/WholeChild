import { useEffect, useRef } from "react";
import type { Sample } from "../types";

/**
 * Offline canvas route renderer. Projects lat/lng (equirectangular with
 * latitude correction), then draws the track colour-graded by speed. No tiles,
 * no network — works fully locally.
 */
export function RouteMap({ samples, color = "#f55a2a", height = 280 }: { samples: Sample[]; color?: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const pts = samples.filter((s) => s.lat != null && s.lng != null);
    if (pts.length < 2) return;

    const dpr = window.devicePixelRatio || 1;
    const width = wrap.clientWidth;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Project.
    const lats = pts.map((p) => p.lat!);
    const lngs = pts.map((p) => p.lng!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const midLat = (minLat + maxLat) / 2;
    const cos = Math.cos((midLat * Math.PI) / 180);

    const pad = 18;
    const geoW = (maxLng - minLng) * cos || 1e-6;
    const geoH = maxLat - minLat || 1e-6;
    const scale = Math.min((width - pad * 2) / geoW, (height - pad * 2) / geoH);
    const offX = (width - geoW * scale) / 2;
    const offY = (height - geoH * scale) / 2;

    const project = (lat: number, lng: number): [number, number] => {
      const x = offX + (lng - minLng) * cos * scale;
      const y = height - (offY + (lat - minLat) * scale); // flip Y
      return [x, y];
    };

    // Speed range for colour grading.
    const speeds = pts.map((p) => p.speed ?? 0);
    const maxSpeed = Math.max(...speeds, 0.0001);

    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = project(pts[i - 1].lat!, pts[i - 1].lng!);
      const [x1, y1] = project(pts[i].lat!, pts[i].lng!);
      const sp = (pts[i].speed ?? 0) / maxSpeed;
      ctx.beginPath();
      ctx.strokeStyle = speedColor(sp, color);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // Start (green) + end (red) dots.
    const [sx, sy] = project(pts[0].lat!, pts[0].lng!);
    const [ex, ey] = project(pts[pts.length - 1].lat!, pts[pts.length - 1].lng!);
    dot(ctx, sx, sy, "#22c55e");
    dot(ctx, ex, ey, "#ef4444");
  }, [samples, color, height]);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} className="rounded-xl" />
    </div>
  );
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string) {
  ctx.beginPath();
  ctx.fillStyle = fill;
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#0a0c10";
  ctx.stroke();
}

/** Blend from a cool base into the accent colour as speed increases. */
function speedColor(t: number, base: string): string {
  const slow = [56, 100, 140]; // muted blue
  const fast = hexToRgb(base);
  const r = Math.round(slow[0] + (fast[0] - slow[0]) * t);
  const g = Math.round(slow[1] + (fast[1] - slow[1]) * t);
  const b = Math.round(slow[2] + (fast[2] - slow[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
}
