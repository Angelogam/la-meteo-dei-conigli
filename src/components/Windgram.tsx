"use client";

import React, { useEffect, useRef, useMemo } from "react";
import type { MeteoHourly } from "@/services/weatherService";
import { calcolaTermiche } from "@/utils/termiche";

interface WindgramProps {
  hourlyData: MeteoHourly[];
  site: { name: string; alt: number; lat: number; lon: number };
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

const ORE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function getDir(deg: number): string {
  const d = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return d[Math.round(deg / 45) % 8];
}
function arrow(deg: number): string {
  const a = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return a[Math.round(deg / 45) % 8];
}
function speedClass(s: number): string {
  if (s <= 8) return "bg-emerald-400";
  if (s <= 15) return "bg-lime-400";
  if (s <= 22) return "bg-amber-400";
  if (s <= 30) return "bg-orange-400";
  return "bg-red-400";
}
function speedText(s: number): string {
  if (s <= 8) return "text-emerald-300";
  if (s <= 15) return "text-lime-300";
  if (s <= 22) return "text-amber-300";
  if (s <= 30) return "text-orange-300";
  return "text-red-300";
}

export default function Windgram({ hourlyData, site, selectedHour, onHourSelect }: WindgramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Costruisci quote: da quota decollo ogni 200m fino a 4000m
  const quote = useMemo(() => {
    const q: number[] = [];
    for (let h = site.alt; h <= 4000; h += 200) q.push(h);
    return q;
  }, [site.alt]);

  // Matrice dati per tutte le ore e quote
  const { matrix, maxSpeed, termiche } = useMemo(() => {
    const oggi = new Date();
    const g = oggi.getDate(), m = oggi.getMonth(), y = oggi.getFullYear();
    const mat: Record<number, Record<number, { speed: number; dir: number }>> = {};
    const term: Record<number, any> = {};
    let mx = 0;

    for (const ora of ORE) {
      mat[ora] = {};

      // Trova dato orario
      const hd = hourlyData.find(h => {
        const t = new Date(h.time);
        return t.getHours() === ora && t.getDate() === g && t.getMonth() === m && t.getFullYear() === y;
      });

      if (hd) {
        // Calcola termiche
        const hData: any = {
          time: hd.time,
          temperature: hd.temperature,
          humidity: hd.humidity,
          dewPoint: hd.dewPoint,
          precipitation: hd.precipitation,
          weatherCode: hd.weatherCode,
          cloudCover: hd.cloudCover,
          windSpeed: hd.windSpeed,
          windDir: hd.windDir,
          windGusts: hd.windGusts,
          temp80m: hd.temp80m,
          temp120m: hd.temp120m,
        };
        term[ora] = calcolaTermiche(hData, site.alt);

        // Per ogni quota, interpola dal windProfile
        const profile = hd.windProfile || [];

        for (const q of quote) {
          let speed = 0, dir = 0;

          // Cerca nel profilo reale
          const match = profile.find(p => Math.abs(p.height - q) < 100);
          if (match && match.speed > 0) {
            speed = match.speed;
            dir = match.dir;
          } else if (q <= 500) {
            // Livelli bassi: usa dato superficie + interpolazione semplice
            const fattore = 1 + (q - site.alt) / 4000;
            speed = Math.round(hd.windSpeed * fattore);
            dir = hd.windDir;
          }

          if (speed > mx) mx = speed;
          mat[ora][q] = { speed: Math.round(speed), dir: Math.round(dir) };
        }
      } else {
        // Nessun dato per quest'ora
        for (const q of quote) {
          mat[ora][q] = { speed: 0, dir: 0 };
        }
      }
    }

    return { matrix: mat, maxSpeed: Math.max(20, mx), termiche: term };
  }, [hourlyData, site.alt, quote]);

  // Canvas rendering per l'ora selezionata
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matrix[selectedHour]) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const pad = { top: 24, bottom: 32, left: 48, right: 32 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);

    // Sfondo
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // Griglia orizzontale — ogni 500m
    ctx.strokeStyle = "rgba(148,163,184,0.10)";
    ctx.lineWidth = 1;
    ctx.font = "10px monospace";
    ctx.textAlign = "right";

    for (let q = site.alt; q <= 4000; q += 500) {
      const idx = quote.indexOf(q);
      if (idx === -1) continue;
      const y = pad.top + (1 - idx / (quote.length - 1)) * cH;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      ctx.fillText(q + "m", pad.left - 6, y + 4);
    }

    // Linea decollo
    const decIdx = 0;
    const decY = pad.top + (1 - decIdx / (quote.length - 1)) * cH;
    ctx.strokeStyle = "rgba(251,191,36,0.3)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.left, decY);
    ctx.lineTo(W - pad.right, decY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Decollo " + site.alt + "m", pad.left + 4, decY - 4);

    // Overlay termiche (base nuvole e top termico)
    const t = termiche[selectedHour];
    if (t && t.base > site.alt && t.top > t.base) {
      // Base
      const bIdx = quote.indexOf(Math.min(...quote.filter(q => q >= t.base)));
      if (bIdx > 0) {
        const bY = pad.top + (1 - bIdx / (quote.length - 1)) * cH;
        ctx.strokeStyle = "rgba(52,211,153,0.5)";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pad.left, bY);
        ctx.lineTo(W - pad.right, bY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#34d399";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Base " + t.base + "m", pad.left + 4, bY - 4);

        // Top
        const tIdx = quote.indexOf(Math.min(...quote.filter(q => q >= t.top)));
        if (tIdx > 0) {
          const tY = pad.top + (1 - tIdx / (quote.length - 1)) * cH;
          ctx.strokeStyle = "rgba(251,146,60,0.5)";
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(pad.left, tY);
          ctx.lineTo(W - pad.right, tY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "#fb923c";
          ctx.font = "9px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("Top " + t.top + "m", pad.left + 4, tY - 4);

          // Riempimento tra base e top (zona termica)
          const fillTop = Math.min(bY, tY);
          const fillBottom = Math.max(bY, tY);
          const grad = ctx.createLinearGradient(0, fillTop, 0, fillBottom);
          grad.addColorStop(0, "rgba(52,211,153,0.05)");
          grad.addColorStop(0.5, "rgba(251,146,60,0.08)");
          grad.addColorStop(1, "rgba(52,211,153,0.03)");
          ctx.fillStyle = grad;
          ctx.fillRect(pad.left, fillTop, cW, fillBottom - fillTop);
        }
      }
    }

    // Zero termico
    const zeroIdx = quote.indexOf(Math.min(...quote.filter(q => q >= Math.round(site.alt + 200 + (20 / 0.0098)))));
    if (zeroIdx > 0) {
      const zY = pad.top + (1 - zeroIdx / (quote.length - 1)) * cH;
      ctx.strokeStyle = "rgba(96,165,250,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, zY);
      ctx.lineTo(W - pad.right, zY);
      ctx.stroke();
      ctx.fillStyle = "#60a5fa";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("0°", W - pad.right - 4, zY - 4);
    }

    // Barre di vento per ogni quota
    const hourData = matrix[selectedHour];
    for (let qi = 0; qi < quote.length; qi++) {
      const q = quote[qi];
      const v = hourData[q];
      if (!v || v.speed === 0) continue;

      const y = pad.top + (1 - qi / (quote.length - 1)) * cH;
      const w = (v.speed / maxSpeed) * cW;

      // Barra
      const col = speedClass(v.speed);
      const grad = ctx.createLinearGradient(pad.left, 0, pad.left + w, 0);
      if (v.speed <= 8) grad.addColorStop(1, "rgba(52,211,153,0.6)");
      else if (v.speed <= 15) grad.addColorStop(1, "rgba(163,230,53,0.6)");
      else if (v.speed <= 22) grad.addColorStop(1, "rgba(251,191,36,0.6)");
      else if (v.speed <= 30) grad.addColorStop(1, "rgba(251,146,60,0.6)");
      else grad.addColorStop(1, "rgba(248,113,113,0.6)");
      grad.addColorStop(0, "rgba(148,163,184,0.15)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(pad.left, y - 5, Math.max(w, 4), 10, 3);
      ctx.fill();

      // Etichetta: velocità + direzione
      const label = Math.round(v.speed) + " " + arrow(v.dir) + getDir(v.dir);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(label, pad.left + Math.max(w, 4) + 6, y + 4);
    }

    // Etichetta ora in alto
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(selectedHour).padStart(2, "0") + ":00 · " + site.name, W / 2, 16);

  }, [matrix, quote, selectedHour, site, maxSpeed, termiche]);

  if (!matrix || Object.keys(matrix).length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        Nessun dato vento disponibile
      </div>
    );
  }

  const t = termiche[selectedHour];
  const hasThermal = t && t.rateo > 0;

  return (
    <div className="bg-slate-900/40 border border-slate-700/40 rounded-2xl p-4 space-y-4">
      {/* Selettore ora — minimalist */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {ORE.map(ora => {
          const hasData = matrix[ora] && Object.keys(matrix[ora]).length > 0;
          const isSel = ora === selectedHour;
          return (
            <button
              key={ora}
              onClick={() => onHourSelect(ora)}
              disabled={!hasData}
              className={
                "shrink-0 px-3 py-1.5 rounded-lg text-sm font-bold transition-all border " +
                (isSel
                  ? "bg-emerald-600/30 border-emerald-400/50 text-emerald-200"
                  : hasData
                    ? "bg-slate-800/40 border-slate-700/40 text-slate-400 hover:text-slate-200"
                    : "bg-slate-800/20 border-slate-800/30 text-slate-600 cursor-not-allowed"
                )
              }
            >
              {(ora).toString().padStart(2, "0")}:00
            </button>
          );
        })}
      </div>

      {/* Canvas + legenda */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <canvas
            ref={canvasRef}
            width={520}
            height={480}
            className="w-full h-auto rounded-xl"
          />
        </div>

        {/* Legenda compatta in colonna */}
        <div className="w-24 shrink-0 text-[11px] space-y-2">
          <div className="text-slate-500 font-semibold">Vento</div>
          {[
            { label: "≤8", c: "bg-emerald-400" },
            { label: "9-15", c: "bg-lime-400" },
            { label: "16-22", c: "bg-amber-400" },
            { label: "23-30", c: "bg-orange-400" },
            { label: ">30", c: "bg-red-400" },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={"w-2.5 h-2.5 rounded " + l.c} />
              <span className="text-slate-400">{l.label} km/h</span>
            </div>
          ))}
          <div className="border-t border-slate-700/30 pt-2 mt-2">
            <div className="text-slate-500 font-semibold mb-1">Direz.</div>
            <div className="grid grid-cols-2 gap-x-1 text-slate-400">
              {["N","NE","E","SE","S","SW","W","NW"].map(d => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Info termiche compatta */}
      {hasThermal && (
        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400 bg-slate-800/30 rounded-xl px-3 py-2 border border-slate-700/30">
          <span className="text-slate-500 font-semibold">{String(selectedHour).padStart(2, "0")}:00</span>
          <span>Base <span className="text-emerald-300 font-bold">{t.base}m</span></span>
          <span>Top <span className="text-orange-300 font-bold">{t.top}m</span></span>
          <span>Salita <span className="text-amber-300 font-bold">{t.rateo.toFixed(1)} m/s</span></span>
          <span>Spessore <span className="text-cyan-300 font-bold">{t.top - t.base}m</span></span>
          <span className="text-slate-500 ml-auto">{site.name} · {site.lat.toFixed(4)}, {site.lon.toFixed(4)}</span>
        </div>
      )}
      {!hasThermal && (
        <div className="text-xs text-slate-500 bg-slate-800/20 rounded-xl px-3 py-2">
          {String(selectedHour).padStart(2, "0")}:00 · {site.name} · {site.lat.toFixed(4)}, {site.lon.toFixed(4)}
        </div>
      )}
    </div>
  );
}