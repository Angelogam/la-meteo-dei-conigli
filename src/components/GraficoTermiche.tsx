"use client";

import React, { useState } from "react";
import { TrendingUp, MousePointerClick } from "lucide-react";
import type { TermicheData } from "@/utils/termiche";

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheData }[];
  oraCorrente: number;
}

const HOURS_VISIBILI = [8, 10, 12, 14, 16, 18];
const QUOTE_LABELS = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500];
const MIN_QUOTA = 500;
const MAX_QUOTA = 4000;
const GRAFICO_ALTEZZA = 320;

const LEGENDA = [
  { colore: "#ef4444", label: "Forte" },
  { colore: "#f97316", label: "Buona" },
  { colore: "#eab308", label: "Moderata" },
  { colore: "#84cc16", label: "Debole" },
  { colore: "#64748b", label: "Assente" },
];

const getColore = (rateo: number): string => {
  if (rateo >= 3) return "#ef4444";
  if (rateo >= 2) return "#f97316";
  if (rateo >= 1) return "#eab308";
  if (rateo >= 0.3) return "#84cc16";
  return "#64748b";
};

const quotaToPct = (q: number): number => {
  const clipped = Math.max(MIN_QUOTA, Math.min(MAX_QUOTA, q));
  return ((clipped - MIN_QUOTA) / (MAX_QUOTA - MIN_QUOTA)) * 100;
};

const GraficoTermiche = ({ hourly, oraCorrente }: GraficoTermicheProps) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  if (!hourly || hourly.length === 0) return null;

  const dataMap = new Map<number, TermicheData>();
  for (const h of hourly) dataMap.set(h.hour, h.termiche);

  const daMostrare = HOURS_VISIBILI.map((h) => {
    const diretto = dataMap.get(h);
    if (diretto) return { hour: h, termiche: diretto };
    for (let i = h; i <= h + 1; i++) {
      const d = dataMap.get(i);
      if (d) return { hour: h, termiche: d };
    }
    return { hour: h, termiche: null as unknown as TermicheData };
  }).filter(Boolean) as { hour: number; termiche: TermicheData }[];

  const selectedData = selectedHour !== null ? dataMap.get(selectedHour) : null;

  return (
    <div className="w-full py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-800/50 border border-amber-500/40 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-200">Previsione termiche</h3>
            <p className="text-xs text-slate-500">Quota (m slm) —&nbsp;Forza (m/s) —&nbsp;Dati reali</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/30">
          <MousePointerClick className="w-3.5 h-3.5" />
          <span>Clicca per dettagli</span>
        </div>
      </div>

      {/* Area griglia + colonne */}
      <div className="flex gap-0 relative">
        {/* Etichette quota — allineate alle righe orizzontali */}
        <div className="flex flex-col justify-between shrink-0 w-16 pr-3 relative" style={{ height: GRAFICO_ALTEZZA + 'px' }}>
          {QUOTE_LABELS.map((q) => {
            const pct = quotaToPct(q);
            return (
              <div
                key={q}
                className="absolute text-xs font-mono text-slate-400 leading-none flex items-center"
                style={{ bottom: `${pct}%`, transform: 'translateY(50%)' }}
              >
                {q}
              </div>
            );
          })}
        </div>

        {/* Colonne */}
        <div className="flex-1 grid grid-cols-6 gap-2 relative">
          {daMostrare.map(({ hour, termiche: t }) => {
            const isCurrent = hour === oraCorrente || (hour <= oraCorrente && hour + 2 > oraCorrente);
            const isSelected = selectedHour === hour;
            const nonNull = t && t.rateo > 0 && t.top > 500;

            let colore = "#64748b";
            let rateoStr = "--";
            let quotaTopStr = "--";
            let quotaBaseStr = "--";
            let labelForza = "N/D";
            let topPct = 0;
            let basePct = 0;

            if (t) {
              colore = getColore(t.rateo);
              rateoStr = t.rateo > 0 ? t.rateo.toFixed(1) : "--";
              quotaTopStr = t.top > 0 ? t.top.toString() : "--";
              quotaBaseStr = t.base > 0 ? t.base.toString() : "--";

              if (t.rateo >= 3) labelForza = "Forte 🔥";
              else if (t.rateo >= 2) labelForza = "Buona 🪂";
              else if (t.rateo >= 1) labelForza = "Moderata 🌤️";
              else if (t.rateo >= 0.3) labelForza = "Debole 🌥️";
              else labelForza = "Assente ❄️";
            }

            if (nonNull) {
              topPct = quotaToPct(t.top);
              basePct = quotaToPct(t.base);
            }

            const barHeightPct = topPct - basePct;

            return (
              <div
                key={hour}
                className={`relative cursor-pointer transition-all duration-200 rounded-lg border overflow-hidden ${
                  isSelected
                    ? "bg-amber-900/20 border-amber-400/60 shadow-lg shadow-amber-500/15 scale-[1.02] z-10"
                    : isCurrent
                    ? "bg-green-900/15 border-green-500/40"
                    : "bg-slate-800/30 border-slate-700/50 hover:border-amber-400/30 hover:bg-slate-700/30"
                }`}
                onClick={() => setSelectedHour((prev) => (prev === hour ? null : hour))}
              >
                {/* Area del grafico */}
                <div className="relative w-full" style={{ height: GRAFICO_ALTEZZA + 'px' }}>
                  {/* Righe orizzontali guida */}
                  {QUOTE_LABELS.map((q) => (
                    <div
                      key={q}
                      className="absolute left-0 right-0 border-t border-slate-700/20"
                      style={{ bottom: `${quotaToPct(q)}%` }}
                    />
                  ))}

                  {/* Barra termica — parte dalla BASE, arriva al TOP */}
                  {nonNull && barHeightPct > 1 && (
                    <>
                      {/* Linea di base tratteggiata */}
                      <div className="absolute left-0 right-0 border-t border-dashed border-white/30 z-10" style={{ bottom: `${basePct}%` }} />

                      {/* Barra colorata */}
                      <div
                        className="absolute left-2 right-2 transition-all duration-500 ease-out rounded-t-md rounded-b-sm"
                        style={{
                          bottom: `${basePct}%`,
                          height: `${Math.max(barHeightPct, 3)}%`,
                          backgroundColor: colore,
                          opacity: isSelected ? 0.95 : 0.8,
                        }}
                      >
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-base font-extrabold text-white drop-shadow-xl leading-tight">{quotaTopStr}</span>
                          <span className="text-[10px] font-semibold text-white/70 drop-shadow-md">m slm</span>
                          <span className="text-xs font-bold text-white/80 drop-shadow-md mt-0.5">{rateoStr} m/s</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Nessuna termica */}
                  {(!nonNull || barHeightPct <= 1) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm text-slate-600">—</span>
                    </div>
                  )}
                </div>

                {/* Dati sotto la colonna — allineati e leggibili */}
                <div className="bg-slate-900/80 border-t border-slate-700/40 px-2 py-3 text-center">
                  {/* Ora */}
                  <div className={`text-base font-bold mb-2 ${isSelected ? 'text-amber-300' : isCurrent ? 'text-green-400' : 'text-slate-200'}`}>
                    {String(hour).padStart(2, "0")}:00
                  </div>

                  {/* Forza */}
                  <div className={`text-xs font-semibold mb-2 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                    {labelForza}
                  </div>

                  {/* Rateo */}
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-lg font-black tabular-nums" style={{ color: colore }}>
                      {rateoStr}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">m/s</span>
                  </div>

                  {/* Base (verde) */}
                  <div className="flex items-center justify-between px-2 mb-1">
                    <span className="text-[10px] text-green-400/80 font-semibold uppercase tracking-wider">Base</span>
                    <span className="text-sm font-bold text-green-300 tabular-nums">{quotaBaseStr} m</span>
                  </div>

                  {/* Top (rosso) */}
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] text-red-400/80 font-semibold uppercase tracking-wider">Top</span>
                    <span className="text-sm font-bold text-red-300 tabular-nums">{quotaTopStr} m</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dettaglio espanso */}
      {selectedHour !== null && selectedData && (
        <div className="mt-5 bg-slate-800/80 rounded-xl border border-amber-500/30 overflow-hidden animate-in slide-in-from-top-3 duration-200">
          <div className="bg-amber-900/30 px-4 py-3 flex items-center justify-between border-b border-amber-500/20">
            <span className="text-sm font-bold text-amber-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Dettaglio termiche — ore {String(selectedHour).padStart(2, "0")}:00
            </span>
            <button
              onClick={() => setSelectedHour(null)}
              className="text-xs text-slate-400 hover:text-white transition-colors bg-slate-700/50 hover:bg-slate-600/50 px-3 py-1.5 rounded-lg"
            >
              Chiudi ✕
            </button>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/30">
              <span className="text-[10px] text-slate-400 block mb-1">Forza salita</span>
              <span className="text-lg font-bold text-amber-300">{selectedData.rateo.toFixed(1)} m/s</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/30">
              <span className="text-[10px] text-slate-400 block mb-1">Quota base (LCL)</span>
              <span className="text-lg font-bold text-green-300">{selectedData.base} m</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/30">
              <span className="text-[10px] text-slate-400 block mb-1">Quota top</span>
              <span className="text-lg font-bold text-red-300">{selectedData.top} m</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/30">
              <span className="text-[10px] text-slate-400 block mb-1">Spessore</span>
              <span className="text-lg font-bold text-orange-300">{selectedData.top - selectedData.base} m</span>
            </div>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-4 pt-3 border-t border-slate-600/30">
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
          {LEGENDA.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.colore }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t border-dashed border-white/40 shrink-0" />
            <span>Base termica (LCL)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficoTermiche;