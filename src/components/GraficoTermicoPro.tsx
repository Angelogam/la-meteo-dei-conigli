"use client";

import React, { useState } from "react";

interface ThermalData {
  hour: string;
  speed: number;
  base: number;
  top: number;
}

interface GraficoTermicoProProps {
  data: ThermalData[];
}

const HOURS = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"];

function getColor(speed: number): string {
  if (speed >= 3.5) return "#dc2626";
  if (speed >= 2.5) return "#ea580c";
  if (speed >= 1.5) return "#f97316";
  if (speed >= 0.8) return "#22c55e";
  if (speed >= 0.3) return "#84cc16";
  return "#facc15";
}

function getLabel(speed: number): string {
  if (speed >= 3.5) return "Fortissime";
  if (speed >= 2.5) return "Forte";
  if (speed >= 1.5) return "Buona";
  if (speed >= 0.8) return "Moderata";
  if (speed >= 0.3) return "Debole";
  return "Assente";
}

const GraficoTermicoPro: React.FC<GraficoTermicoProProps> = ({ data }) => {
  const [selected, setSelected] = useState<number>(4);

  const map = new Map(data.map((d) => [d.hour, d]));
  const full = HOURS.map((h) => map.get(h) || { hour: h, speed: 0, base: 0, top: 0 });
  const maxSpeed = Math.max(...full.map((d) => d.speed), 0.5);
  const sel = full[selected];
  const barHeight = 160;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-700/40 rounded-2xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-orange-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          Intensità termica
        </h3>
        <span className="text-[10px] text-slate-500">m/s</span>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
        {[
          { label: "≥ 3.5", color: "#dc2626" },
          { label: "2.5–3.5", color: "#ea580c" },
          { label: "1.5–2.5", color: "#f97316" },
          { label: "0.8–1.5", color: "#22c55e" },
          { label: "0.3–0.8", color: "#84cc16" },
          { label: "< 0.3", color: "#facc15" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-slate-500">{item.label}</span>
          </span>
        ))}
      </div>

      {/* Grafico barre */}
      <div className="flex items-end justify-center gap-1.5 h-44 overflow-x-auto pb-1">
        {full.map((d, i) => {
          const pct = maxSpeed > 0 ? (d.speed / maxSpeed) * 100 : 0;
          const isSelected = i === selected;
          const col = getColor(d.speed);

          return (
            <button
              key={d.hour}
              onClick={() => setSelected(i)}
              className={`flex flex-col items-center flex-shrink-0 transition-all duration-200 ${
                isSelected ? "scale-110 z-10" : "opacity-80 hover:opacity-100"
              }`}
              style={{ width: "28px" }}
            >
              {/* Valore sopra */}
              <span
                className={`text-[10px] font-bold leading-none mb-0.5 transition-colors ${
                  isSelected ? "text-white" : d.speed > 0 ? "text-orange-200/70" : "text-slate-600"
                }`}
              >
                {d.speed > 0 ? d.speed.toFixed(1) : "—"}
              </span>

              {/* Barra */}
              <div
                className="w-full rounded-full relative overflow-hidden"
                style={{ height: `${barHeight}px`, background: "rgba(30,41,59,0.6)" }}
              >
                {d.speed > 0 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-500 ease-out"
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      background: col,
                      boxShadow: isSelected ? `0 0 12px ${col}` : "none",
                    }}
                  />
                )}
              </div>

              {/* Ora */}
              <span
                className={`text-[10px] mt-1 font-mono transition-colors ${
                  isSelected ? "text-orange-300 font-bold" : d.speed > 0 ? "text-slate-500" : "text-slate-600"
                }`}
              >
                {d.hour}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dettaglio ora selezionata */}
      {sel && sel.speed > 0 && (
        <div className="mt-4 bg-gradient-to-r from-orange-900/20 to-amber-900/10 rounded-xl p-4 border border-orange-700/30 text-center">
          <span className="text-xs text-slate-400 block">
            Alle {sel.hour}:00 — {getLabel(sel.speed)}
          </span>
          <span className="text-3xl font-black text-orange-300 drop-shadow-lg">{sel.speed.toFixed(1)} m/s</span>
          <span className="text-xs text-slate-500 ml-2">di salita</span>
          {sel.base > 0 && (
            <div className="flex items-center justify-center gap-5 mt-2 text-[11px] text-slate-400">
              <span>Base <strong className="text-emerald-300">{sel.base}m</strong></span>
              <span>Top <strong className="text-red-300">{sel.top}m</strong></span>
              <span>Salita <strong className="text-amber-300">{sel.top - sel.base}m</strong></span>
            </div>
          )}
        </div>
      )}

      {sel && sel.speed === 0 && (
        <div className="mt-4 bg-slate-800/40 rounded-xl p-4 border border-slate-700/30 text-center">
          <span className="text-xs text-slate-400">Alle {sel.hour}:00 — Nessuna termica</span>
        </div>
      )}

      {/* Nota */}
      <div className="text-center text-[9px] text-slate-600 mt-3">
        Basato su dati reali Open-Meteo · Rateo massimo ~4-5 m/s
      </div>
    </div>
  );
};

export default GraficoTermicoPro;