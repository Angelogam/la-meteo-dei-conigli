"use client";

import React from "react";

interface ThermalData {
  hour: string;
  speed: number;
  base: number;
  top: number;
}

/** Mappa colore in base al rateo di salita */
function barColor(speed: number): string {
  if (speed < 0.8) return "#64748b";   // grigio
  if (speed < 1.2) return "#facc15";   // giallo
  if (speed < 2.0) return "#f97316";   // arancio
  return "#dc2626";                     // rosso
}

function labelColor(speed: number): string {
  if (speed < 0.8) return "text-slate-400";
  if (speed < 1.2) return "text-yellow-400";
  return "text-orange-300";
}

const TermicheAquila: React.FC<{ data: ThermalData[] }> = ({ data }) => {
  const maxSpeed = Math.max(...data.map((t) => t.speed), 0.5);
  const barMaxHeight = 160; // px massimi per la barra più alta

  return (
    <div className="bg-slate-900/30 border border-slate-700/40 rounded-2xl p-4">
      {/* Intestazione */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          Intensità termica
        </h3>
        <span className="text-[10px] text-slate-500">m/s</span>
      </div>

      {/* Legenda colori */}
      <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
        {[
          { label: "≥ 2.0 — Forte", color: "#dc2626" },
          { label: "1.2 – 2.0 — Moderata", color: "#f97316" },
          { label: "0.8 – 1.2 — Debole", color: "#facc15" },
          { label: "< 0.8 — Molto debole", color: "#64748b" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
            <span className="text-slate-400">{item.label}</span>
          </span>
        ))}
      </div>

      {/* Barre verticali */}
      <div className="flex items-end gap-2 h-44 overflow-x-auto pb-1">
        {data.map((t, i) => {
          const pct = maxSpeed > 0 ? (t.speed / maxSpeed) * 100 : 0;
          const heightPx = Math.max(4, (pct / 100) * barMaxHeight);
          return (
            <div
              key={i}
              className="flex flex-col items-center flex-shrink-0 w-9"
            >
              {/* Valore in cima */}
              <span className={`text-[10px] font-black leading-none mb-1 ${labelColor(t.speed)}`}>
                {t.speed.toFixed(1)}
              </span>

              {/* Barra */}
              <div className="w-full h-28 bg-slate-800/50 rounded-md relative overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${heightPx}px`,
                    background: barColor(t.speed),
                  }}
                />
              </div>

              {/* Ora in basso */}
              <span className="text-[10px] mt-1 font-mono text-slate-400">
                {t.hour.slice(0, 2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dettaglio orario selezionato (es. 12:00) */}
      {data.length > 0 && (
        <div className="mt-3 bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center text-xs">
          <span className="text-slate-400 block">Alle ore {data[Math.min(4, data.length - 1)].hour}</span>
          <span className="text-lg font-bold text-orange-300">
            {data[Math.min(4, data.length - 1)].speed.toFixed(1)} m/s
          </span>
          <span className="text-slate-500 ml-2">di salita</span>
          <div className="flex items-center justify-center gap-4 mt-1 text-[11px] text-slate-400">
            <span>Base: {Math.round(data[Math.min(4, data.length - 1)].base)}m</span>
            <span>Top: {Math.round(data[Math.min(4, data.length - 1)].top)}m</span>
            <span>Salita: {Math.round(data[Math.min(4, data.length - 1)].top - data[Math.min(4, data.length - 1)].base)}m</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TermicheAquila;