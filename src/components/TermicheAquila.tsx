"use client";

import React, { useState } from "react";

interface ThermalData {
  hour: string;
  speed: number;
  base: number;
  top: number;
}

const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function getColor(speed: number): string {
  if (speed >= 3.0) return "#ef4444";
  if (speed >= 2.0) return "#f97316";
  if (speed >= 1.2) return "#eab308";
  if (speed >= 0.8) return "#84cc16";
  return "#64748b";
}

function getLabel(speed: number): string {
  if (speed >= 3.0) return "Forti";
  if (speed >= 2.0) return "Buone";
  if (speed >= 1.2) return "Moderate";
  if (speed >= 0.8) return "Deboli";
  if (speed >= 0.3) return "Molto deboli";
  return "Assenti";
}

function getBgColor(speed: number): string {
  if (speed >= 3.0) return "bg-red-500/80";
  if (speed >= 2.0) return "bg-orange-500/80";
  if (speed >= 1.2) return "bg-yellow-500/80";
  if (speed >= 0.8) return "bg-lime-500/80";
  return "bg-slate-600/50";
}

const TermicheAquila: React.FC<{ data: ThermalData[] }> = ({ data }) => {
  const [selected, setSelected] = useState<number>(4); // 12:00 di default

  // Mappa i dati reali sulle ore canoniche (riempi i buchi con 0)
  const map = new Map(data.map(d => [d.hour, d]));
  const full = HOURS.map(h => map.get(h) || { hour: h, speed: 0, base: 0, top: 0 });
  const maxSpeed = Math.max(...full.map(d => d.speed), 0.5);
  const sel = full[selected];

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border border-slate-700/40 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          Intensità termica · ora locale
        </h3>
        <span className="text-[10px] text-slate-500">m/s · indice 0–10</span>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
        {[
          { label: "Forte (≥3)", color: "bg-red-500/70" },
          { label: "Buona (2–3)", color: "bg-orange-400/70" },
          { label: "Moderata (1.2–2)", color: "bg-yellow-400/60" },
          { label: "Debole (0.8–1.2)", color: "bg-lime-400/60" },
          { label: "Nulla", color: "bg-slate-600/50" },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
            <span className="text-slate-400">{item.label}</span>
          </span>
        ))}
      </div>

      {/* Grafico a barre */}
      <div className="flex items-end gap-1 h-44 overflow-x-auto pb-1">
        {full.map((d, i) => {
          const pct = maxSpeed > 0 ? (d.speed / maxSpeed) * 100 : 0;
          const isSelected = i === selected;
          return (
            <button
              key={d.hour}
              onClick={() => setSelected(i)}
              className={`flex flex-col items-center flex-shrink-0 w-8 transition-all duration-200 ${
                isSelected ? "scale-110" : ""
              }`}
            >
              {/* Valore sopra */}
              <span
                className={`text-[10px] font-bold leading-none mb-1 transition-colors ${
                  d.speed > 0 ? "text-white" : "text-slate-600"
                } ${isSelected ? "text-orange-300 text-xs" : ""}`}
              >
                {d.speed > 0 ? d.speed.toFixed(1) : "—"}
              </span>

              {/* Barra */}
              <div className="w-full h-28 bg-slate-800/60 rounded-md relative overflow-hidden">
                {d.speed > 0 && (
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-500 ${getBgColor(d.speed)} ${
                      isSelected ? "ring-1 ring-white/30" : ""
                    }`}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  >
                    {isSelected && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg shadow-white/50" />
                    )}
                  </div>
                )}
              </div>

              {/* Ora */}
              <span
                className={`text-[10px] mt-1 font-mono ${
                  isSelected ? "text-orange-300 font-bold" : d.speed > 0 ? "text-slate-400" : "text-slate-600"
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
        <div className="mt-4 bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center">
          <span className="text-xs text-slate-400 block">
            Alle {sel.hour} — {getLabel(sel.speed)}
          </span>
          <span className="text-2xl font-bold text-orange-300">{sel.speed.toFixed(1)} m/s</span>
          <span className="text-xs text-slate-500 ml-2">di salita</span>
          {sel.base > 0 && (
            <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-slate-400">
              <span>Base: {sel.base}m</span>
              <span>Top: {sel.top}m</span>
              <span>Salita: {sel.top - sel.base}m</span>
            </div>
          )}
        </div>
      )}

      {sel && sel.speed === 0 && (
        <div className="mt-4 bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center">
          <span className="text-xs text-slate-400 block">
            Alle {sel.hour} — Nessuna termica
          </span>
        </div>
      )}
    </div>
  );
};

export default TermicheAquila;