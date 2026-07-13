"use client";

import React, { useState } from "react";
import { TrendingUp, MousePointerClick, Info } from "lucide-react";
import type { TermicheData } from "@/utils/termiche";

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheData }[];
  oraCorrente: number;
}

const HOURS_VISIBILI = [8, 10, 12, 14, 16, 18];
const QUOTE_LABELS = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500];
const MIN_QUOTA = 500;
const MAX_QUOTA = 4000;
const GRAFICO_ALTEZZA = 300;

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

const getLabelForza = (rateo: number): string => {
  if (rateo >= 3) return "Forte";
  if (rateo >= 2) return "Buona";
  if (rateo >= 1) return "Moderata";
  if (rateo >= 0.3) return "Debole";
  return "Assente";
};

const getEmoji = (rateo: number): string => {
  if (rateo >= 3) return "🔥";
  if (rateo >= 2) return "🪂";
  if (rateo >= 1) return "🌤️";
  if (rateo >= 0.3) return "🌥️";
  return "❄️";
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
    <div className="w-full py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-0.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-800/50 border border-amber-500/40 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-200">Previsione termiche</h3>
            <p className="text-[11px] text-slate-500">Quota (m slm) — Forza (m/s)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/30">
          <MousePointerClick className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clicca per dettagli</span>
        </div>
      </div>

      {/* Grafico + info colonne */}
      <div className="flex gap-1 relative">
        {/* Etichette quota */}
        <div className="flex flex-col justify-between shrink-0 w-14 pr-2 relative" style={{ height: GRAFICO_ALTEZZA + 'px' }}>
          {QUOTE_LABELS.map((q) => {
            const pct = quotaToPct(q);
            return (
              <div
                key={q}
                className="absolute text-[11px] font-mono text-slate-500 leading-none flex items-center font-medium"
                style={{ bottom: `${pct}%`, transform: 'translateY(50%)' }}
              >
                {q}
              </div>
            );
          })}
        </div>

        {/* Colonne griglia */}
        <div className="flex-1 grid grid-cols-6 gap-1.5 relative">
          {daMostrare.map(({ hour, termiche: t }) => {
            const isCurrent = hour === oraCorrente || (hour <= oraCorrente && hour + 2 > oraCorrente);
            const isSelected = selectedHour === hour;
            const nonNull = t && t.rateo > 0 && t.top > 500;

            let colore = "#64748b";
            let rateoStr = "--";
            let quotaTopStr = "--";
            let quotaBaseStr = "--";
            let labelForza = "N/D";
            let emoji = "❄️";
            let topPct = 0;
            let basePct = 0;

            if (t) {
              colore = getColore(t.rateo);
              rateoStr = t.rateo > 0 ? t.rateo.toFixed(1) : "--";
              quotaTopStr = t.top > 0 ? t.top.toString() : "--";
              quotaBaseStr = t.base > 0 ? t.base.toString() : "--";
              labelForza = getLabelForza(t.rateo);
              emoji = getEmoji(t.rateo);
            }

            if (nonNull) {
              topPct = quotaToPct(t.top);
              basePct = quotaToPct(t.base);
            }

            const barHeightPct = topPct - basePct;

            return (
              <div
                key={hour}
                className={`relative cursor-pointer transition-all duration-200 rounded-lg border ${
                  isSelected
                    ? "bg-amber-900/20 border-amber-400/60 shadow-lg shadow-amber-500/20 z-10 ring-1 ring-amber-400/30"
                    : isCurrent
                    ? "bg-green-900/15 border-green-500/40"
                    : "bg-slate-800/30 border-slate-700/50 hover:border-amber-400/40 hover:bg-slate-700/40"
                }`}
                onClick={() => setSelectedHour((prev) => (prev === hour ? null : hour))}
              >
                {/* Area grafico */}
                <div className="relative w-full" style={{ height: GRAFICO_ALTEZZA + 'px' }}>
                  {/* Righe guida */}
                  {QUOTE_LABELS.map((q) => (
                    <div
                      key={q}
                      className="absolute left-0 right-0 border-t border-slate-700/15"
                      style={{ bottom: `${quotaToPct(q)}%` }}
                    />
                  ))}

                  {/* Barra termica */}
                  {nonNull && barHeightPct > 1 && (
                    <>
                      <div className="absolute left-0 right-0 border-t border-dashed border-white/25 z-10" style={{ bottom: `${basePct}%` }} />
                      <div
                        className="absolute left-1.5 right-1.5 transition-all duration-500 ease-out rounded-t-md rounded-b-sm"
                        style={{
                          bottom: `${basePct}%`,
                          height: `${Math.max(barHeightPct, 3)}%`,
                          backgroundColor: colore,
                          opacity: isSelected ? 0.95 : 0.8,
                        }}
                      >
                        <div className="absolute inset-0 flex flex-col items-center justify-center px-0.5">
                          <span className="text-sm font-bold text-white drop-shadow-lg leading-tight">{quotaTopStr}</span>
                          <span className="text-[9px] font-medium text-white/60 drop-shadow">m slm</span>
                          <span className="text-[10px] font-bold text-white/80 drop-shadow mt-0.5">{rateoStr} m/s</span>
                        </div>
                      </div>
                    </>
                  )}

                  {(!nonNull || barHeightPct <= 1) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-base text-slate-600">—</span>
                    </div>
                  )}
                </div>

                {/* Dati sotto colonna */}
                <div className="bg-slate-900/80 border-t border-slate-700/40 px-1.5 py-2.5 text-center">
                  {/* Ora */}
                  <div className={`text-sm font-bold mb-1.5 ${isSelected ? 'text-amber-300' : isCurrent ? 'text-green-400' : 'text-slate-200'}`}>
                    {String(hour).padStart(2, "0")}:00
                  </div>

                  {/* Emoji + label */}
                  <div className="flex items-center justify-center gap-1 mb-1.5">
                    <span className="text-base">{emoji}</span>
                    <span className={`text-[11px] font-semibold ${isSelected ? 'text-amber-400' : 'text-slate-400'}`}>
                      {labelForza}
                    </span>
                  </div>

                  {/* Rateo */}
                  <div className="flex items-baseline justify-center gap-0.5 mb-2">
                    <span className="text-lg font-black tabular-nums leading-none" style={{ color: colore }}>
                      {rateoStr}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">m/s</span>
                  </div>

                  {/* Base e Top */}
                  <div className="grid grid-cols-2 gap-1 mt-1 border-t border-slate-700/20 pt-1.5">
                    <div className="text-center">
                      <span className="block text-[9px] text-green-400/70 font-semibold uppercase tracking-wider">Base</span>
                      <span className="block text-xs font-bold text-green-300 tabular-nums">{quotaBaseStr} m</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-[9px] text-red-400/70 font-semibold uppercase tracking-wider">Top</span>
                      <span className="block text-xs font-bold text-red-300 tabular-nums">{quotaTopStr} m</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dettaglio selezionato */}
      {selectedHour !== null && selectedData && (
        <div className="mt-4 bg-slate-800/80 rounded-xl border border-amber-500/30 overflow-hidden animate-in slide-in-from-top-3 duration-200">
          <div className="bg-amber-900/30 px-4 py-2.5 flex items-center justify-between border-b border-amber-500/20">
            <span className="text-sm font-bold text-amber-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Dettaglio termiche — ore {String(selectedHour).padStart(2, "0")}:00
            </span>
            <button
              onClick={() => setSelectedHour(null)}
              className="text-[11px] text-slate-400 hover:text-white transition-colors bg-slate-700/50 hover:bg-slate-600/50 px-2.5 py-1 rounded-lg"
            >
              Chiudi ✕
            </button>
          </div>
          <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/30 text-center">
              <span className="text-[10px] text-slate-400 block mb-0.5">Forza salita</span>
              <span className="text-base font-bold text-amber-300">{selectedData.rateo.toFixed(1)} m/s</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/30 text-center">
              <span className="text-[10px] text-slate-400 block mb-0.5">Base (LCL)</span>
              <span className="text-base font-bold text-green-300">{selectedData.base} m</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/30 text-center">
              <span className="text-[10px] text-slate-400 block mb-0.5">Top</span>
              <span className="text-base font-bold text-red-300">{selectedData.top} m</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/30 text-center">
              <span className="text-[10px] text-slate-400 block mb-0.5">Spessore</span>
              <span className="text-base font-bold text-orange-300">{selectedData.top - selectedData.base} m</span>
            </div>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-3 pt-2.5 border-t border-slate-600/25">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
          {LEGENDA.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.colore }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t border-dashed border-white/30 shrink-0" />
            <span>Base termica (LCL)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficoTermiche;