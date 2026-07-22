"use client";

import React, { useState } from "react";

interface ThermalData {
  hour: string;
  speed: number;
  base: number;
  top: number;
}

const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

/** Palette esclusivamente arancio */
function getColor(speed: number): string {
  if (speed >= 3.5) return "#9a3412";
  if (speed >= 2.5) return "#c2410c";
  if (speed >= 1.5) return "#ea580c";
  if (speed >= 0.8) return "#f97316";
  if (speed >= 0.3) return "#fb923c";
  return "#fdba74";
}

function getLabel(speed: number): string {
  if (speed >= 3.5) return "Fortissime";
  if (speed >= 2.5) return "Forte";
  if (speed >= 1.5) return "Buona";
  if (speed >= 0.8) return "Moderata";
  if (speed >= 0.3) return "Debole";
  return "Assente";
}

const TermicheAquila: React.FC<{ data: ThermalData[] }> = ({ data }) => {
  const [selected, setSelected] = useState<number>(4);

  const map = new Map(data.map(d => [d.hour, d]));
  const full = HOURS.map(h => map.get(h) || { hour: h, speed: 0, base: 0, top: 0 });
  const maxSpeed = Math.max(...full.map(d => d.speed), 0.5);
  const sel = full[selected];
  const barHeight = 100;

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-orange-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          Intensità termica
        </h3>
        <span className="text-[10px] text-slate-500">m/s</span>
      </div>

      {/* Legenda arancio */}
      <div className="flex flex-wrap gap-3 mb-4 text-[10px]">
        {[
          { label: "≥ 3.5 — Fortissime", color: "#9a3412" },
          { label: "2.5–3.5 — Forte", color: "#c2410c" },
          { label: "1.5–2.5 — Buona", color: "#ea580c" },
          { label: "0.8–1.5 — Moderata", color: "#f97316" },
          { label: "0.3–0.8 — Debole", color: "#fb923c" },
          { label: "< 0.3 — Assente", color: "#fdba74" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: item.color }} />
            <span className="text-slate-400">{item.label}</span>
          </span>
        ))}
      </div>

      {/* Grafico barre strette — scrollbar nascosta */}
      <div className="flex items-end gap-1 h-32 overflow-x-auto pb-1 justify-center scrollbar-none">
        {full.map((d, i) => {
          const pct = maxSpeed > 0 ? (d.speed / maxSpeed) * 100 : 0;
          const isSelected = i === selected;
          const col = getColor(d.speed);
          const barW = isSelected ? "w-7" : "w-5";

          return (
            <button
              key={d.hour}
              onClick={() => setSelected(i)}
              className={`flex flex-col items-center flex-shrink-0 transition-all duration-200 ${barW} ${
                isSelected ? "scale-110 z-10" : ""
              }`}
            >
              {/* Valore sopra */}
              <span
                className={`text-[9px] font-black leading-none mb-0.5 transition-all ${
                  isSelected ? "text-orange-200" : d.speed > 0 ? "text-orange-300/80" : "text-slate-600"
                }`}
              >
                {d.speed > 0 ? d.speed.toFixed(1) : "—"}
              </span>

              {/* Barra */}
              <div
                className="w-full rounded-full relative overflow-hidden transition-all"
                style={{ height: `${barHeight}px`, background: "rgba(30,41,59,0.6)" }}
              >
                {d.speed > 0 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-500"
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      background: col,
                      boxShadow: isSelected ? `0 0 10px ${col}` : "none",
                    }}
                  />
                )}
              </div>

              {/* Ora */}
              <span
                className={`text-[8px] mt-0.5 font-mono ${
                  isSelected ? "text-orange-300 font-bold" : d.speed > 0 ? "text-slate-500" : "text-slate-600"
                }`}
              >
                {d.hour.slice(0, 2)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dettaglio ora selezionata */}
      {sel && sel.speed > 0 && (
        <div className="mt-4 bg-gradient-to-r from-orange-900/20 to-amber-900/10 rounded-xl p-4 border border-orange-700/30 text-center">
          <span className="text-xs text-slate-400 block">
            Alle {sel.hour} — {getLabel(sel.speed)}
          </span>
          <span className="text-3xl font-black text-orange-300 drop-shadow-lg">{sel.speed.toFixed(1)} m/s</span>
          <span className="text-xs text-slate-500 ml-2">di salita</span>
          {sel.base > 0 && (
            <div className="flex items-center justify-center gap-5 mt-2 text-[11px] text-slate-400">
              <span>Base <strong className="text-orange-200">{sel.base}m</strong></span>
              <span>Top <strong className="text-orange-200">{sel.top}m</strong></span>
              <span>Salita <strong className="text-orange-200">{sel.top - sel.base}m</strong></span>
            </div>
          )}
        </div>
      )}

      {sel && sel.speed === 0 && (
        <div className="mt-4 bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 text-center">
          <span className="text-xs text-slate-400">Alle {sel.hour} — Nessuna termica</span>
        </div>
      )}
    </div>
  );
};

export default TermicheAquila;