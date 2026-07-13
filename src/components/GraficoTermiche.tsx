"use client";

import React, { useState } from "react";
import { TrendingUp, MousePointerClick, Clock } from "lucide-react";
import type { TermicheData } from "@/utils/termiche";

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheData }[];
  oraCorrente: number;
}

const HOURS_VISIBILI = [8, 10, 12, 14, 16, 18];
const QUOTE_LABELS = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500];
const MIN_QUOTA = 500;
const MAX_QUOTA = 4000;
const GRAFICO_ALTEZZA = 280;

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
    <div className="w-full">
      {/* Area grafico + etichette */}
      <div className="flex gap-0 relative">
        {/* Colonna etichette quota */}
        <div className="flex flex-col justify-between shrink-0 w-12 pr-2 relative" style={{ height: GRAFICO_ALTEZZA + 'px' }}>
          {QUOTE_LABELS.map((q) => {
            const pct = quotaToPct(q);
            return (
              <div
                key={q}
                className="absolute text-xs font-semibold text-slate-400 leading-none flex items-center tracking-wide"
                style={{ bottom: `${pct}%`, transform: 'translateY(50%)' }}
              >
                {q}
              </div>
            );
          })}
        </div>

        {/* Griglia colonne */}
        <div className="flex-1 grid grid-cols-6 gap-2 relative">
          {daMostrare.map(({ hour, termiche: t }) => {
            const isCurrent = hour === oraCorrente || (hour <= oraCorrente && hour + 2 > oraCorrente);
            const isSelected = selectedHour === hour;
            const nonNull = t && t.rateo > 0 && t.top > 500;

            let colore = "#64748b";
            let rateo = 0;
            let quotaTop = 0;
            let quotaBase = 0;
            let labelForza = "Assente";
            let emoji = "❄️";
            let topPct = 0;
            let basePct = 0;

            if (t) {
              colore = getColore(t.rateo);
              rateo = t.rateo;
              quotaTop = t.top;
              quotaBase = t.base;
              labelForza = getLabelForza(t.rateo);
              emoji = getEmoji(t.rateo);
            }

            if (nonNull) {
              topPct = quotaToPct(quotaTop);
              basePct = quotaToPct(quotaBase);
            }

            const barHeightPct = topPct - basePct;

            return (
              <div
                key={hour}
                className={`relative cursor-pointer transition-all duration-200 rounded-xl border-2 overflow-hidden ${
                  isSelected
                    ? "bg-green-900/15 border-green-400/60 shadow-lg shadow-green-500/20 z-10 scale-[1.02]"
                    : isCurrent
                    ? "bg-green-900/10 border-green-500/40"
                    : "bg-slate-800/25 border-slate-700/50 hover:border-green-400/40 hover:bg-slate-700/40"
                }`}
                onClick={() => setSelectedHour((prev) => (prev === hour ? null : hour))}
              >
                {/* Area grafico */}
                <div className="relative w-full" style={{ height: GRAFICO_ALTEZZA + 'px' }}>
                  {/* Righe guida */}
                  {QUOTE_LABELS.map((q) => (
                    <div
                      key={q}
                      className="absolute left-0 right-0"
                      style={{ bottom: `${quotaToPct(q)}%`, borderTop: '1px solid rgba(100, 116, 139, 0.12)' }}
                    />
                  ))}

                  {/* Barra termica */}
                  {nonNull && barHeightPct > 1 && (
                    <>
                      {/* Linea base tratteggiata */}
                      <div className="absolute left-0 right-0 border-t border-dashed border-white/30 z-10" style={{ bottom: `${basePct}%` }} />
                      {/* Barra */}
                      <div
                        className="absolute left-2 right-2 transition-all duration-500 ease-out rounded-t-lg rounded-b-sm flex items-center justify-center"
                        style={{
                          bottom: `${basePct}%`,
                          height: `${Math.max(barHeightPct, 3)}%`,
                          backgroundColor: colore,
                          opacity: isSelected ? 0.95 : 0.8,
                        }}
                      >
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-sm font-bold text-white drop-shadow-xl">{quotaTop}</span>
                          <span className="text-[8px] text-white/70 drop-shadow font-medium">m</span>
                          <span className="text-[10px] font-bold text-white/90 drop-shadow mt-0.5">{rateo.toFixed(1)} m/s</span>
                        </div>
                      </div>
                    </>
                  )}

                  {(!nonNull || barHeightPct <= 1) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-base font-medium text-slate-600">—</span>
                    </div>
                  )}
                </div>

                {/* Footer colonna */}
                <div className="bg-slate-900/90 border-t border-slate-700/40 px-1.5 py-2.5 text-center">
                  {/* Ora */}
                  <div className={`text-sm font-bold mb-1.5 ${isSelected ? 'text-green-300' : isCurrent ? 'text-green-400' : 'text-slate-200'}`}>
                    {String(hour).padStart(2, "0")}:00
                  </div>

                  {/* Emoji + label forza */}
                  <div className="flex items-center justify-center gap-1 mb-1.5">
                    <span className="text-base">{emoji}</span>
                    <span className={`text-[11px] font-semibold tracking-wide ${isSelected ? 'text-green-400' : 'text-slate-400'}`}>
                      {labelForza}
                    </span>
                  </div>

                  {/* Rateo */}
                  <div className="flex items-baseline justify-center gap-0.5 mb-2">
                    <span className={`text-lg font-black tabular-nums leading-none ${rateo <= 0 ? 'text-slate-500' : ''}`} style={rateo > 0 ? { color: colore } : {}}>
                      {rateo > 0 ? rateo.toFixed(1) : "--"}
                    </span>
                    <span className="text-[9px] text-slate-500 font-medium">m/s</span>
                  </div>

                  {/* Base - Top */}
                  <div className="grid grid-cols-2 gap-1 border-t border-slate-700/20 pt-1.5">
                    <div className="text-center">
                      <div className="text-[9px] text-green-400/70 font-semibold uppercase tracking-wider mb-0.5">Base</div>
                      <div className="text-xs font-bold text-green-300 tabular-nums">{quotaBase > 0 ? quotaBase + "m" : "--"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[9px] text-red-400/70 font-semibold uppercase tracking-wider mb-0.5">Top</div>
                      <div className="text-xs font-bold text-red-300 tabular-nums">{quotaTop > 0 ? quotaTop + "m" : "--"}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pannello dettaglio */}
      {selectedHour !== null && selectedData && (
        <div className="mt-4 bg-slate-800/85 rounded-2xl border-2 border-green-400/30 overflow-hidden animate-in slide-in-from-top-3 duration-200">
          <div className="bg-green-900/30 px-4 py-2.5 flex items-center justify-between border-b border-green-400/20">
            <span className="text-sm font-bold text-green-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
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
              <div className="text-[10px] text-slate-400 mb-0.5">Forza salita</div>
              <div className="text-base font-bold text-green-300">{selectedData.rateo.toFixed(1)} m/s</div>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/30 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Base (LCL)</div>
              <div className="text-base font-bold text-green-300">{selectedData.base} m</div>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/30 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Top</div>
              <div className="text-base font-bold text-green-300">{selectedData.top} m</div>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-2.5 border border-slate-700/30 text-center">
              <div className="text-[10px] text-slate-400 mb-0.5">Spessore</div>
              <div className="text-base font-bold text-green-300">{selectedData.top - selectedData.base} m</div>
            </div>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-3 pt-2.5 border-t border-slate-600/25">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-400">
          {LEGENDA.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.colore }} />
              <span>{item.label}</span>
            </div>
))}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-0 border-t border-dashed border-white/30 shrink-0" />
            <span>Base termica (LCL)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficoTermiche;