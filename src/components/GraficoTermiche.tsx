"use client";

import React, { useState, useCallback, useRef } from "react";
import { TrendingUp, Info, ArrowUp, Thermometer, MousePointerClick, X } from "lucide-react";
import type { TermicheData } from "@/utils/termiche";

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheData }[];
  oraCorrente: number;
}

const QUOTE_LABELS = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const LEGENDA: { colore: string; label: string }[] = [
  { colore: "#ef4444", label: "Forte (>3 m/s)" },
  { colore: "#f97316", label: "Buona (2-3 m/s)" },
  { colore: "#eab308", label: "Moderata (1-2 m/s)" },
  { colore: "#84cc16", label: "Debole (0.3-1 m/s)" },
  { colore: "#64748b", label: "Assente (<0.3 m/s)" },
];

function getColoreDaRateo(rateo: number): string {
  if (rateo >= 3) return "#ef4444";
  if (rateo >= 2) return "#f97316";
  if (rateo >= 1) return "#eab308";
  if (rateo >= 0.3) return "#84cc16";
  return "#64748b";
}

function getIntensitaLabel(rateo: number): string {
  if (rateo >= 3) return "Forte";
  if (rateo >= 2) return "Buona";
  if (rateo >= 1) return "Moderata";
  if (rateo >= 0.3) return "Debole";
  return "Assente";
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

  const MIN_QUOTA = 500;
  const MAX_QUOTA = 4000;
  const GRAFICO_ALTEZZA = 300;

  const quotaToPct = (q: number): number => {
    if (q <= MIN_QUOTA) return 0;
    if (q >= MAX_QUOTA) return 100;
    return ((q - MIN_QUOTA) / (MAX_QUOTA - MIN_QUOTA)) * 100;
  };

  const handleHourClick = useCallback((hour: number) => {
    setSelectedHour((prev) => (prev === hour ? null : hour));
  }, []);

  // Dettaglio selezionato
  const selectedData = selectedHour !== null ? dataMap.get(selectedHour) : null;

  return (
    <div className="w-full py-4 px-1" ref={containerRef}>
      {/* Header con hint interattività */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-800/60 border border-amber-500/50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-amber-200">Termiche</h3>
            <p className="text-xs text-slate-400">Quota (m slm) · Forza (m/s)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700/30">
          <MousePointerClick className="w-3.5 h-3.5" />
          <span>Clicca su un'ora per i dettagli</span>
        </div>
      </div>

      {/* Griglia principale */}
      <div className="flex gap-0 relative">
        {/* Etichette quote verticali a sinistra */}
        <div className="flex flex-col justify-between shrink-0 w-14 pr-2" style={{ height: GRAFICO_ALTEZZA + 'px' }}>
          {QUOTE_LABELS.map((q) => (
            <div key={q} className="text-xs font-mono text-slate-400 text-right leading-none flex items-center justify-end h-0" style={{ marginBottom: `calc(${GRAFICO_ALTEZZA / (QUOTE_LABELS.length - 1)}px - 5px)` }}>
              {q}
            </div>
          ))}
        </div>

        {/* Colonne orarie */}
        {HOURS.map((hour) => {
          const t = dataMap.get(hour);
          const isCurrentHour = hour === oraCorrente;
          const isSelected = selectedHour === hour;
          const isHovered = hoveredHour === hour;
          const nonNull = t && t.rateo > 0;

          let topPct = 0;
          let colore = "#64748b";
          let rateoStr = "--";
          let quotaStr = "--";
          let baseStr = "--";

          if (t) {
            topPct = quotaToPct(t.top);
            colore = getColoreDaRateo(t.rateo);
            rateoStr = t.rateo.toFixed(1);
            quotaStr = t.top.toString();
            baseStr = t.base.toString();
          }

          return (
            <div
              key={hour}
              className={`flex-1 flex flex-col items-center min-w-0 cursor-pointer transition-all duration-200 rounded-lg ${
                isSelected
                  ? "bg-amber-900/25 scale-[1.03] z-10 shadow-lg shadow-amber-900/20"
                  : isCurrentHour
                  ? "bg-green-900/20"
                  : "hover:bg-slate-700/30"
              }`}
              onClick={() => handleHourClick(hour)}
              onMouseEnter={() => setHoveredHour(hour)}
              onMouseLeave={() => setHoveredHour(null)}
            >
              {/* Area del grafico */}
              <div
                className="relative w-full overflow-hidden"
                style={{
                  height: GRAFICO_ALTEZZA + 'px',
                  borderColor: isSelected ? 'rgba(251,191,36,0.4)' : 'transparent',
                  borderWidth: '1px',
                  borderRadius: '4px',
                }}
              >
                {/* Linee guida orizzontali ogni 500m */}
                {QUOTE_LABELS.map((q) => {
                  const yPct = quotaToPct(q);
                  return (
                    <div
                      key={q}
                      className="absolute w-full border-t border-slate-700/30"
                      style={{ bottom: `${yPct}%` }}
                    />
                  );
                })}

                {/* Barra della termica */}
                {nonNull && (
                  <div
                    className="absolute bottom-0 left-1 right-1 transition-all duration-500 ease-out rounded-t-md"
                    style={{
                      height: `${topPct}%`,
                      backgroundColor: colore,
                      opacity: isHovered || isSelected ? 0.95 : 0.8,
                      minHeight: '4px',
                    }}
                  >
                    {/* Etichetta altitudine e m/s dentro la barra */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm md:text-base font-bold text-white drop-shadow-lg leading-tight">
                        {quotaStr} m
                      </span>
                      <span className="text-xs font-semibold text-white/90 drop-shadow-md leading-tight mt-1">
                        {rateoStr} m/s
                      </span>
                    </div>
                  </div>
                )}

                {/* Indicatore "nessuna termica" */}
                {!nonNull && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-slate-500">—</span>
                  </div>
                )}

                {/* Linea base della termica */}
                {nonNull && t && t.base > MIN_QUOTA && (
                  <div
                    className="absolute w-full border-t border-dashed border-white/30 transition-all duration-300"
                    style={{ bottom: `${quotaToPct(t.base)}%` }}
                  >
                    <span className="absolute -top-3 left-0.5 text-[8px] text-white/30 uppercase tracking-wider font-medium">
                      base
                    </span>
                  </div>
                )}

                {/* Indicatore di ora selezionata */}
                {isSelected && (
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-400 rounded-full shadow-lg shadow-amber-500/60 animate-pulse" />
                )}
              </div>

              {/* Etichetta ora sotto */}
              <div
                className={`text-sm font-mono font-bold mt-1 leading-none transition-all duration-200 ${
                  isSelected
                    ? "text-amber-300"
                    : isCurrentHour
                    ? "text-green-400"
                    : isHovered
                    ? "text-slate-200"
                    : "text-slate-400"
                }`}
              >
                {String(hour).padStart(2, "0")}:00
              </div>

              {/* Quota massima grande sotto */}
              <div className={`text-xs font-bold leading-none mt-1 mb-1 transition-colors duration-200 ${
                isSelected ? "text-amber-400" : "text-slate-400"
              }`}>
                {quotaStr} m
              </div>
            </div>
          );
        })}
      </div>

      {/* Dettaglio espanso con dati reali */}
      {selectedHour !== null && selectedData && (
        <div className="mt-4 bg-slate-800/70 rounded-xl border border-slate-600/50 overflow-hidden animate-in slide-in-from-top-3 duration-200">
          {/* Intestazione dettaglio */}
          <div className="bg-slate-700/40 px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm font-bold text-amber-200 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Dettaglio termiche — ore {String(selectedHour).padStart(2, "0")}:00
            </span>
            <button
              onClick={() => setSelectedHour(null)}
              className="text-xs text-slate-400 hover:text-white transition-colors bg-slate-700/50 hover:bg-slate-600/50 px-2 py-1 rounded-lg flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Chiudi
            </button>
          </div>

          {/* Corpo dettaglio con griglia dati */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Forza salita */}
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-400 font-medium">Forza salita</span>
              </div>
              <span className="text-xl font-bold text-amber-300">{selectedData.rateo.toFixed(1)} m/s</span>
              <span className="text-sm text-slate-500 ml-1.5">{getIntensitaLabel(selectedData.rateo)}</span>
            </div>

            {/* Quota base */}
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ArrowUp className="w-4 h-4 text-green-400" />
                <span className="text-xs text-slate-400 font-medium">Quota base</span>
              </div>
              <span className="text-xl font-bold text-green-300">{selectedData.base} m</span>
              <span className="text-sm text-slate-500 ml-1.5">slm</span>
            </div>

            {/* Quota top */}
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ArrowUp className="w-4 h-4 text-red-400" />
                <span className="text-xs text-slate-400 font-medium">Quota top</span>
              </div>
              <span className="text-xl font-bold text-red-300">{selectedData.top} m</span>
              <span className="text-sm text-slate-500 ml-1.5">slm</span>
            </div>

            {/* Spessore termica */}
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-slate-400 font-medium">Spessore</span>
              </div>
              <span className="text-xl font-bold text-orange-300">{selectedData.top - selectedData.base} m</span>
              <span className="text-sm text-slate-500 ml-1.5">salita</span>
            </div>

            {/* Gradiente termico */}
            {selectedData.gradienteReale > 0 && (
              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30 col-span-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Thermometer className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-400 font-medium">Gradiente termico reale</span>
                </div>
                <span className="text-xl font-bold text-blue-300">{selectedData.gradienteReale}°C / 100m</span>
              </div>
            )}

            {/* Indice di forza */}
            <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/30 col-span-2 md:col-span-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Indice di forza termica</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (selectedData.forza / 10) * 100)}%`,
                    backgroundColor: getColoreDaRateo(selectedData.rateo),
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1.5 font-medium">
                <span>Debole</span>
                <span className="text-slate-300">{selectedData.forza.toFixed(1)} / 10</span>
                <span>Forte</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dettaglio per ora selezionata senza dati */}
      {selectedHour !== null && !selectedData && (
        <div className="mt-4 bg-slate-800/50 rounded-xl border border-slate-700/30 p-4 text-center">
          <span className="text-sm text-slate-500">
            Nessun dato termico disponibile per le ore {String(selectedHour).padStart(2, "0")}:00
          </span>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-4 pt-3 border-t border-slate-600/30">
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-slate-400">
          {LEGENDA.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.colore }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t-2 border-dashed border-white/40 shrink-0" />
            <span>Base termica</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficoTermiche;