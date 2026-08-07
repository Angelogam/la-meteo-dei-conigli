"use client";

import React, { useState, useMemo } from "react";

interface TermicheDato {
  rateo: number;
  forza: number;
  base: number;
  top: number;
  label: string;
  colore: string;
  gradienteReale: number;
}

interface HourlyItem {
  hour: number;
  termiche: TermicheDato;
}

interface GraficoTermicheProps {
  hourly: HourlyItem[];
  oraCorrente: number;
}

const HOURS_VISIBILI = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

const GraficoTermiche: React.FC<GraficoTermicheProps> = ({ hourly, oraCorrente }) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const data = useMemo(() => {
    if (!hourly || hourly.length === 0) return [];

    return HOURS_VISIBILI.map(hour => {
      const found = hourly.find(d => d.hour === hour);
      if (found) return found;

      for (let i = hour; i <= hour + 2; i++) {
        const vicino = hourly.find(d => d.hour === i);
        if (vicino) return vicino;
      }

      return { hour, termiche: { rateo: 0, forza: 0, base: 0, top: 0, label: "N/D", colore: "#475569", gradienteReale: 0 } };
    });
  }, [hourly]);

  const maxRateo = useMemo(
    () => Math.max(...data.map(d => d.termiche.rateo), 0.1),
    [data]
  );

  if (!hourly || hourly.length === 0 || data.length === 0) {
    return <div className="text-center py-8 text-slate-400 text-sm">Nessun dato termico disponibile</div>;
  }

  const selected = data.find(d => d.hour === selectedHour);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          Intensità termica · ora locale (Europe/Rome)
        </h3>
        <span className="text-[10px] text-slate-500">m/s · indice 0-10</span>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {[
          { label: "Forti (3+)", color: "bg-red-500/70" },
          { label: "Buone (2-3)", color: "bg-orange-400/70" },
          { label: "Moderate (1-2)", color: "bg-yellow-400/60" },
          { label: "Debole (0.3-1)", color: "bg-green-400/60" },
          { label: "Niente", color: "bg-slate-700/40" },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
            <span className="text-slate-400">{item.label}</span>
          </span>
        ))}
      </div>

      {/* Grafico a barre */}
      <div className="flex items-end gap-1 h-44 overflow-x-auto pb-1">
        {data.map(d => {
          const pct = maxRateo > 0 ? (d.termiche.rateo / maxRateo) * 100 : 0;
          const isSelected = d.hour === selectedHour;
          const isCurrent = d.hour === oraCorrente;

          return (
            <button
              key={d.hour}
              onClick={() => setSelectedHour(d.hour === selectedHour ? null : d.hour)}
              className={`flex flex-col items-center transition-all duration-300 ${
                isSelected ? "scale-110 z-10" : ""
              }`}
            >
              {/* Valore */}
              <span className={`text-[9px] font-black leading-none mb-0.5 ${
                isSelected
                  ? "text-orange-300"
                  : d.termiche.rateo > 0
                    ? "text-orange-400/80"
                    : "text-slate-600"
              }`}>
                {d.termiche.rateo > 0 ? d.termiche.rateo.toFixed(1) : "—"}
              </span>

              {/* Colonna */}
              <div className={`w-8 h-28 bg-slate-800/60 rounded-md relative overflow-hidden ${
                isCurrent ? "ring-1 ring-emerald-500/50" : ""
              }`}>
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-500 ${
                    d.termiche.rateo > 0 ? d.termiche.colore : "bg-slate-700/40"
                  }`}
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
                {isCurrent && (
                  <span className="absolute top-0.5 left-0 right-0 text-center text-[7px] font-bold text-emerald-300">
                    ●
                  </span>
                )}
              </div>

              {/* Ora */}
              <span className={`text-[10px] mt-1 font-mono ${
                isSelected
                  ? "text-orange-300 font-bold"
                  : d.termiche.rateo > 0
                    ? "text-slate-400"
                    : "text-slate-600"
              }`}>
                {String(d.hour).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dettaglio ora selezionata */}
      <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center">
        {selected && selected.termiche.rateo > 0 ? (
          <>
            <span className="text-xs text-slate-400 block">
              Alle {String(selected.hour).padStart(2, "0")}:00 — {selected.termiche.label || "Termiche"}
            </span>
            <span className="text-2xl font-bold text-orange-300 mt-1 inline-block">
              {selected.termiche.rateo.toFixed(1)} m/s
            </span>
            <span className="text-xs text-slate-500 ml-2">di salita</span>
            {selected.termiche.base > 0 && (
              <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-slate-400">
                <span>
                  Base <strong className="text-orange-200">{selected.termiche.base}m</strong>
                </span>
                <span>
                  Top <strong className="text-orange-200">{selected.termiche.top}m</strong>
                </span>
                <span>
                  Salita{" "}
                  <strong className="text-orange-200">
                    {selected.termiche.top - selected.termiche.base}m
                  </strong>
                </span>
              </div>
            )}
          </>
        ) : selected ? (
          <span className="text-xs text-slate-400">
            Alle {String(selected.hour).padStart(2, "0")}:00 — Nessuna termica attiva
          </span>
        ) : (
          <span className="text-xs text-slate-500">Seleziona un&apos;ora per vedere i dettagli</span>
        )}
      </div>
    </div>
  );
};

export default GraficoTermiche;