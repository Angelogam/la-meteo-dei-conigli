"use client";

import React, { useState, useCallback, useRef } from "react";
import { TrendingUp, Info, ArrowUp, Thermometer, MousePointerClick } from "lucide-react";
import type { TermicheData } from "@/utils/termiche";

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheData }[];
  oraCorrente: number;
}

// Solo ogni 2 ore: 8, 10, 12, 14, 16, 18 — colonne più larghe
const HOURS_VISIBILI = [8, 10, 12, 14, 16, 18];

const QUOTE_LABELS = [4000, 3000, 2000, 1000, 500];

const LEGENDA: { colore: string; label: string }[] = [
  { colore: "#ef4444", label: "Forte" },
  { colore: "#f97316", label: "Buona" },
  { colore: "#eab308", label: "Moderata" },
  { colore: "#84cc16", label: "Debole" },
  { colore: "#64748b", label: "Assente" },
];

function getColoreDaRateo(rateo: number): string {
  if (rateo >= 3) return "#ef4444";
  if (rateo >= 2) return "#f97316";
  if (rateo >= 1) return "#eab308";
  if (rateo >= 0.3) return "#84cc16";
  return "#64748b";
}

const GraficoTermiche = ({ hourly, oraCorrente }: GraficoTermicheProps) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!hourly || hourly.length === 0) return null;

  const dataMap = new Map<number, TermicheData>();
  for (const h of hourly) {
    dataMap.set(h.hour, h.termiche);
  }

  // Per ogni ora visibile, trova il dato; se non esatto, usa l'ora successiva
  const daMostrare = HOURS_VISIBILI.map((h) => {
    const diretto = dataMap.get(h);
    if (diretto) return { hour: h, termiche: diretto };
    // cerca l'ora successiva (es: se h=10, cerca 10)
    for (let i = h; i <= h + 1; i++) {
      const d = dataMap.get(i);
      if (d) return { hour: h, termiche: d };
    }
    return { hour: h, termiche: null as unknown as TermicheData };
  }).filter(Boolean) as { hour: number; termiche: TermicheData }[];

  const MIN_QUOTA = 500;
  const MAX_QUOTA = 4000;
  const GRAFICO_ALTEZZA = 350;

  const quotaToPct = (q: number): number => {
    if (q <= MIN_QUOTA) return 0;
    if (q >= MAX_QUOTA) return 100;
    return ((q - MIN_QUOTA) / (MAX_QUOTA - MIN_QUOTA)) * 100;
  };

  const handleHourClick = useCallback((hour: number) => {
    setSelectedHour((prev) => (prev === hour ? null : hour));
  }, []);

  const selectedData = selectedHour !== null ? dataMap.get(selectedHour) : null;

  return (
    <div className="w-full py-4" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-800/50 border border-amber-500/40 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-200">Previsione termiche</h3>
            <p className="text-sm text-slate-400">Quota (m slm) — Forza (m/s)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-500 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/30">
          <MousePointerClick className="w-4 h-4" />
          <span>Clicca per dettagli</span>
        </div>
      </div>

      {/* Griglia principale — colonne larghe e distanziate */}
      <div className="flex gap-2 relative">
        {/* Etichette quote verticali a sinistra */}
        <div className="flex flex-col justify-between shrink-0 w-16 pr-3" style={{ height: GRAFICO_ALTEZZA + 'px' }}>
          {QUOTE_LABELS.map((q) => (
            <div key={q} className="text-sm font-mono text-slate-400 text-right leading-none flex items-center justify-end h-0">
              {q}
            </div>
          ))}
        </div>

        {/* Colonne orarie — UNA OGNI 2 ORE, MOLTO PIÙ LARGHE */}
        <div className="flex-1 grid grid-cols-6 gap-3">
          {daMostrare.map(({ hour, termiche: t }) => {
            const isCurrentHour = hour === oraCorrente || (hour <= oraCorrente && hour + 2 > oraCorrente);
            const isSelected = selectedHour === hour;
            const isHovered = hoveredHour === hour;
            const nonNull = t && t.rateo > 0;

            let topPct = 0;
            let colore = "#64748b";
            let rateoStr = "--";
            let quotaStr = "--";
            let baseStr = "--";
            let labelForza = "N/D";

            if (t) {
              topPct = quotaToPct(t.top);
              colore = getColoreDaRateo(t.rateo);
              rateoStr = t.rateo > 0 ? t.rateo.toFixed(1) : "--";
              quotaStr = t.top > 0 ? t.top.toString() : "--";
              baseStr = t.base > 0 ? t.base.toString() : "--";
              if (t.rateo >= 3) labelForza = "Forte 🔥";
              else if (t.rateo >= 2) labelForza = "Buona 🪂";
              else if (t.rateo >= 1) labelForza = "Moderata 🌤️";
              else if (t.rateo >= 0.3) labelForza = "Debole 🌥️";
              else labelForza = "Assente ❄️";
            }

            return (
              <div
                key={hour}
                className={`relative cursor-pointer transition-all duration-200 rounded-xl border-2 overflow-hidden ${
                  isSelected
                    ? "bg-amber-900/20 border-amber-400/60 shadow-lg shadow-amber-500/15 scale-[1.03] z-10"
                    : isCurrentHour
                    ? "bg-green-900/15 border-green-500/40"
                    : "bg-slate-800/30 border-slate-700/50 hover:border-amber-400/30 hover:bg-slate-700/30"
                }`}
                onClick={() => handleHourClick(hour)}
                onMouseEnter={() => setHoveredHour(hour)}
                onMouseLeave={() => setHoveredHour(null)}
              >
                {/* Area del grafico */}
                <div className="relative w-full" style={{ height: GRAFICO_ALTEZZA + 'px' }}>
                  {/* Linee guida ogni 500m */}
                  {QUOTE_LABELS.map((q) => (
                    <div
                      key={q}
                      className="absolute left-0 right-0 border-t border-slate-700/30"
                      style={{ bottom: `${quotaToPct(q)}%` }}
                    />
                  ))}

                  {/* Barra della termica */}
                  {nonNull && (
                    <div
                      className="absolute left-1.5 right-1.5 transition-all duration-500 ease-out rounded-t-lg"
                      style={{
                        bottom: 0,
                        height: `${Math.max(topPct, 2)}%`,
                        backgroundColor: colore,
                        opacity: isHovered || isSelected ? 0.95 : 0.75,
                      }}
                    >
                      {/* Quota + m/s dentro la barra */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-extrabold text-white drop-shadow-xl leading-none">
                          {quotaStr}
                        </span>
                        <span className="text-xs font-semibold text-white/90 drop-shadow-md mt-1">
                          m
                        </span>
                        <span className="text-sm font-bold text-white/80 drop-shadow-md mt-1">
                          {rateoStr} m/s
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Nessuna termica */}
                  {!nonNull && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-base text-slate-500">—</span>
                    </div>
                  )}

                  {/* Linea base */}
                  {nonNull && t && t.base > MIN_QUOTA && (
                    <div className="absolute left-0 right-0 border-t-2 border-dashed border-white/30" style={{ bottom: `${quotaToPct(t.base)}%` }}>
                      <span className="absolute -top-3.5 left-1 text-[9px] text-white/30 uppercase tracking-widest font-bold">base</span>
                    </div>
                  )}
                </div>

                {/* Dati SOTTO la colonna — ben leggibili */}
                <div className="bg-slate-900/80 border-t border-slate-700/50 px-2 py-3 text-center space-y-1.5">
                  <div className={`text-base font-bold ${isSelected ? 'text-amber-300' : isCurrentHour ? 'text-green-400' : 'text-slate-200'}`}>
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  <div className="text-xs font-semibold text-slate-400">
                    {labelForza}
                  </div>
                  <div className="text-sm font-bold text-emerald-300">
                    Base {baseStr} m
                  </div>
                  <div className="text-sm font-bold text-red-300">
                    Top {quotaStr} m
                  </div>
                  <div className="text-base font-extrabold text-amber-300">
                    {rateoStr} m/s
                  </div>
                  {nonNull && t && (
                    <div className="text-xs font-medium text-blue-300">
                      Δ {(t.top - t.base)}m
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dettaglio espanso con dati reali */}
      {selectedHour !== null && selectedData && (
        <div className="mt-5 bg-slate-800/80 rounded-xl border border-amber-500/30 overflow-hidden animate-in slide-in-from-top-3 duration-200">
          <div className="bg-amber-900/30 px-4 py-3 flex items-center justify-between border-b border-amber-500/20">
            <span className="text-base font-bold text-amber-200 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              Dettaglio termiche — ore {String(selectedHour).padStart(2, "0")}:00
            </span>
            <button
              onClick={() => setSelectedHour(null)}
              className="text-sm text-slate-400 hover:text-white transition-colors bg-slate-700/50 hover:bg-slate-600/50 px-3 py-1.5 rounded-lg"
            >
              Chiudi ✕
            </button>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/30">
              <TrendingUp className="w-5 h-5 text-amber-400 mb-2" />
              <span className="text-xs text-slate-400 block">Forza salita</span>
              <span className="text-2xl font-bold text-amber-300">{selectedData.rateo.toFixed(1)} m/s</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/30">
              <ArrowUp className="w-5 h-5 text-green-400 mb-2" />
              <span className="text-xs text-slate-400 block">Quota base</span>
              <span className="text-2xl font-bold text-green-300">{selectedData.base} m</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/30">
              <ArrowUp className="w-5 h-5 text-red-400 mb-2" />
              <span className="text-xs text-slate-400 block">Quota top</span>
              <span className="text-2xl font-bold text-red-300">{selectedData.top} m</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/30">
              <Thermometer className="w-5 h-5 text-orange-400 mb-2" />
              <span className="text-xs text-slate-400 block">Spessore</span>
              <span className="text-2xl font-bold text-orange-300">{selectedData.top - selectedData.base} m</span>
            </div>
            {selectedData.gradienteReale > 0 && (
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/30 col-span-2">
                <Thermometer className="w-5 h-5 text-blue-400 mb-2" />
                <span className="text-xs text-slate-400 block">Gradiente termico reale</span>
                <span className="text-2xl font-bold text-blue-300">{selectedData.gradienteReale}°C / 100m</span>
              </div>
            )}
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/30 col-span-2">
              <Info className="w-5 h-5 text-slate-400 mb-2" />
              <span className="text-xs text-slate-400 block">Indice di forza termica</span>
              <div className="w-full bg-slate-700/60 rounded-full h-4 overflow-hidden mt-2">
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${Math.min(100, (selectedData.forza / 10) * 100)}%`,
                  backgroundColor: getColoreDaRateo(selectedData.rateo),
                }} />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                <span>Debole</span>
                <span className="text-slate-300 font-bold">{selectedData.forza.toFixed(1)} / 10</span>
                <span>Forte</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedHour !== null && !selectedData && (
        <div className="mt-4 bg-slate-800/50 rounded-xl border border-slate-700/30 p-5 text-center">
          <span className="text-base text-slate-500">Nessun dato termico per le ore {String(selectedHour).padStart(2, "0")}:00</span>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-4 pt-3 border-t border-slate-600/30">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
          {LEGENDA.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: item.colore }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-0 border-t-2 border-dashed border-white/40 shrink-0" />
            <span>Base termica</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficoTermiche;