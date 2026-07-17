"use client";

import React, { useMemo, useRef } from "react";
import type { MeteoHourly } from "@/services/weatherService";

interface WindgramProps {
  hourlyData: MeteoHourly[];
  site: { name: string; alt: number; lat: number; lon: number };
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

const QUOTE_LIVELLI = [80, 120, 300, 600, 1000, 1500, 2000, 2500, 3000];
const ORE = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function getDirAbbrev(deg: number): string {
  const abbrevs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return abbrevs[Math.round(deg / 22.5) % 16];
}

function getSpeedColor(speed: number): string {
  if (speed <= 8) return "#34d399";
  if (speed <= 15) return "#a3e635";
  if (speed <= 22) return "#fbbf24";
  if (speed <= 30) return "#fb923c";
  return "#f87171";
}

export default function Windgram({ hourlyData, site, selectedHour, onHourSelect }: WindgramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Matrice: [ora][quota] = { speed, dir }
  const matrice = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return null;
    const oggi = new Date();
    const giorno = oggi.getDate();
    const mese = oggi.getMonth();
    const anno = oggi.getFullYear();

    const matrix: Record<number, Record<number, { speed: number; dir: number }>> = {};

    for (const o of ORE) {
      matrix[o] = {};
      const hourData = hourlyData.find(h => {
        const t = new Date(h.time);
        return t.getHours() === o && t.getDate() === giorno && t.getMonth() === mese && t.getFullYear() === anno;
      });
      if (!hourData) continue;

      for (const q of QUOTE_LIVELLI) {
        let speed = 0, dir = 0;
        // Cerca i dati reali nel windProfile
        if (hourData.windProfile && hourData.windProfile.length > 0) {
          const profilo = hourData.windProfile.find(w => w.height === q);
          if (profilo && profilo.speed > 0) {
            speed = profilo.speed;
            dir = profilo.dir;
          }
        }
        // Fallback per i livelli più bassi
        if (speed === 0 && q === 80) { speed = hourData.windSpeed; dir = hourData.windDir; }
        matrix[o][q] = { speed: Math.round(speed * 10) / 10, dir: Math.round(dir) };
      }
    }

    return matrix;
  }, [hourlyData]);

  const maxSpeed = useMemo(() => {
    if (!matrice) return 30;
    let max = 0;
    for (const o of ORE) {
      for (const q of QUOTE_LIVELLI) {
        const v = matrice[o]?.[q];
        if (v && v.speed > max) max = v.speed;
      }
    }
    return Math.max(30, Math.ceil(max / 5) * 5);
  }, [matrice]);

  // Render canvas per l'ora selezionata
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matrice) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const padding = { top: 20, bottom: 30, left: 40, right: 30 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    ctx.clearRect(0, 0, W, H);

    // Sfondo
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // Griglia orizzontale (quote)
    ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
    ctx.lineWidth = 1;
    for (let qi = 0; qi < QUOTE_LIVELLI.length; qi++) {
      const y = padding.top + (1 - qi / (QUOTE_LIVELLI.length - 1)) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px monospace";
      ctx.textAlign = "right";
      ctx.fillText(String(QUOTE_LIVELLI[qi]) + "m", padding.left - 5, y + 4);
    }

    // Linea quota decollo
    const decolloY = padding.top + (1 - (site.alt - 80) / (QUOTE_LIVELLI[QUOTE_LIVELLI.length - 1] - 80)) * chartH;
    if (decolloY > padding.top && decolloY < H - padding.bottom) {
      ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, decolloY);
      ctx.lineTo(W - padding.right, decolloY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#fbbf24";
      ctx.font = "9px monospace";
      ctx.textAlign = "left";
      ctx.fillText("Decollo " + site.alt + "m", padding.left + 5, decolloY - 3);
    }

    // Dati per l'ora selezionata
    if (!matrice[selectedHour]) return;

    // Barre di velocità
    for (let qi = 0; qi < QUOTE_LIVELLI.length; qi++) {
      const q = QUOTE_LIVELLI[qi];
      const v = matrice[selectedHour]?.[q];
      if (!v || v.speed === 0) continue;

      const y = padding.top + (1 - qi / (QUOTE_LIVELLI.length - 1)) * chartH;
      const barW = (v.speed / maxSpeed) * chartW;
      const barColor = getSpeedColor(v.speed);

      // Barra
      const grad = ctx.createLinearGradient(padding.left, 0, padding.left + barW, 0);
      grad.addColorStop(0, barColor + "cc");
      grad.addColorStop(1, barColor + "44");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(padding.left, y - 6, barW, 12, 4);
      ctx.fill();

      // Etichetta velocità
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(String(Math.round(v.speed)) + " km/h", padding.left + barW + 6, y + 4);

      // Direzione
      const dirLabel = getDirAbbrev(v.dir);
      const freccia = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round(v.dir / 45) % 8];
      ctx.fillStyle = "#60a5fa";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(freccia + " " + dirLabel + " (" + String(Math.round(v.dir)) + "°)", padding.left + barW + 6, y - 6);
    }
  }, [matrice, selectedHour, site.alt, maxSpeed]);

  if (!matrice) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        Nessun dato vento in quota disponibile
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4">
      {/* Selettore ora */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ORE.map(ora => {
          const hasData = matrice[ora] && Object.keys(matrice[ora]).length > 0;
          const isSelected = ora === selectedHour;
          return (
            <button
              key={ora}
              onClick={() => onHourSelect(ora)}
              disabled={!hasData}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isSelected
                  ? "bg-emerald-600/30 border-emerald-400/50 text-emerald-200 shadow-sm"
                  : hasData
                    ? "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/40"
                    : "bg-slate-800/20 border-slate-800/30 text-slate-600 cursor-not-allowed"
              }`}
            >
              {String(ora).padStart(2, "0")}:00
            </button>
          );
        })}
      </div>

      {/* Canvas profilo vento */}
      <div className="flex gap-4">
        <div className="flex-1">
          <canvas
            ref={canvasRef}
            width={500}
            height={360}
            className="w-full h-auto rounded-xl"
          />
        </div>

        {/* Legenda */}
        <div className="w-28 shrink-0 space-y-1 text-[10px]">
          <div className="text-slate-500 font-bold mb-1">km/h</div>
          {[
            { label: "≤8", color: "#34d399" },
            { label: "9–15", color: "#a3e635" },
            { label: "16–22", color: "#fbbf24" },
            { label: "23–30", color: "#fb923c" },
            { label: ">30", color: "#f87171" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: l.color }} />
              <span className="text-slate-400">{l.label}</span>
            </div>
          ))}
          <div className="border-t border-slate-700/50 pt-2 mt-2">
            <div className="text-slate-500 font-bold mb-1">Direzione</div>
            <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
              {["N", "NE", "E", "SE", "S", "SW", "W", "NW"].map(d => (
                <span key={d} className="text-slate-400">{d}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Info ora selezionata */}
      {matrice[selectedHour] && (
        <div className="mt-3 bg-slate-800/40 rounded-xl px-3 py-2 text-xs text-slate-400">
          <span className="font-bold text-slate-200">{String(selectedHour).padStart(2, "0")}:00</span> — Dati reali da Open-Meteo · {site.name} ({site.lat.toFixed(4)}, {site.lon.toFixed(4)}) · Quota decollo: {site.alt}m slm
        </div>
      )}
    </div>
  );
}