"use client";

import React, { useState, useCallback, useRef } from "react";
import { TrendingUp, Info, ArrowUp, Wind, Thermometer, MousePointerClick } from "lucide-react";
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
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!hourly || hourly.length === 0) return null;

  const dataMap = new Map<number, TermicheData>();
  for (const h of hourly) {
    dataMap.set(h.hour, h.termiche);
  }

  const MIN_QUOTA = 500;
  const MAX_QUOTA = 4000;
  const GRAFICO_ALTEZZA = 220;

  const quotaToPct = (q: number): number => {
    if (q <= MIN_QUOTA) return 0;
    if (q >= MAX_QUOTA) return 100;
    return ((q - MIN_QUOTA) / (MAX_QUOTA - MIN_QUOTA)) * 100;
  };

  const handleHourClick = useCallback((hour: number) => {
    setSelectedHour((prev) => (prev === hour ? null : hour));
  }, []);

  const handleHourHover = useCallback((hour: number | null, e?: React.MouseEvent) => {
    setHoveredHour(hour);
    if (hour !== null && e && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    } else {
      setTooltipPos(null);
    }
  }, []);

  // Dettaglio selezionato
  const selectedData = selectedHour !== null ? dataMap.get(selectedHour) : null;

  return (
    <div className="w-full py-2 px-0.5" ref={containerRef}>
      {/* Header con hint interattività */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-800/50 border border-amber-500/50 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-[10px] font-bold text-amber-200">Termiche</h3>
            <p className="text-[7px] text-slate-400">Quota (m slm) · Forza (m/s)</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[7px] text-slate-500">
          <MousePointerClick className="w-2.5 h-2.5" />
          <span>Clicca su un'ora per i dettagli</span>
        </div>
      </div>

      {/* Griglia principale */}
      <div className="flex gap-0 relative">
        {/* Etichette quote verticali a sinistra */}
        <div className="flex flex-col justify-between shrink-0 w-10 pr-1" style={{ height: GRAFICO_ALTEZZA + 'px' }}>
          {QUOTE_LABELS.map((q) => (
            <div key={q} className="text-[7px] text-slate-500 text-right leading-none flex items-center justify-end h-0" style={{ marginBottom: `calc(${GRAFICO_ALTEZZA / (QUOTE_LABELS.length - 1)}px - 3px)` }}>
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
              className={`flex-1 flex flex-col items-center min-w-0 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "bg-amber-900/20 rounded-sm scale-[1.02] z-10"
                  : isCurrentHour
                  ? "bg-green-900/15 rounded-sm"
                  : "hover:bg-slate-700/20 rounded-sm"
              }`}
              onClick={() => handleHourClick(hour)}
              onMouseEnter={(e) => handleHourHover(hour, e)}
              onMouseLeave={() => handleHourHover(null)}
            >
              {/* Area del grafico */}
              <div
                className="relative w-full overflow-hidden transition-all duration-200"
                style={{
                  height: GRAFICO_ALTEZZA + 'px',
                  borderColor: isSelected ? 'rgba(251,191,36,0.3)' : 'transparent',
                  borderWidth: '1px',
                  borderRadius: '2px',
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
                    className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out"
                    style={{
                      height: `${topPct}%`,
                      backgroundColor: colore,
                      opacity: isHovered || isSelected ? 0.9 : 0.7,
                      minHeight: '2px',
                    }}
                  >
                    {/* Etichetta altitudine e m/s */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-white drop-shadow-md leading-tight">
                        {quotaStr}m
                      </span>
                      <span className="text-[7px] font-semibold text-white/80 drop-shadow-md leading-tight">
                        {rateoStr} m/s
                      </span>
                    </div>
                  </div>
                )}

                {/* Nessuna termica */}
                {!nonNull && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[7px] text-slate-500">--</span>
                  </div>
                )}

                {/* Linea base della termica */}
                {nonNull && t && t.base > MIN_QUOTA && (
                  <div
                    className="absolute w-full border-t border-dashed border-white/20 transition-all duration-300"
                    style={{ bottom: `${quotaToPct(t.base)}%` }}
                  >
                    <span className="absolute -top-2 left-0.5 text-[4px] text-white/20 uppercase tracking-wider">
                      base
                    </span>
                  </div>
                )}

                {/* Indicatore di selezione */}
                {isSelected && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full shadow-lg shadow-amber-500/50 animate-pulse" />
                )}
              </div>

              {/* Etichetta ora sotto */}
              <div
                className={`text-[8px] font-mono mt-0.5 leading-none transition-all duration-200 ${
                  isSelected
                    ? "text-amber-300 font-bold"
                    : isCurrentHour
                    ? "text-green-400 font-bold"
                    : isHovered
                    ? "text-slate-300"
                    : "text-slate-400"
                }`}
              >
                {String(hour).padStart(2, "0")}
              </div>

              {/* Quota massima sotto */}
              <div className={`text-[6px] leading-none mt-0.5 truncate max-w-full transition-colors duration-200 ${
                isSelected ? "text-amber-400" : "text-slate-500"
              }`}>
                {quotaStr}m
              </div>
            </div>
          );
        })}
      </div>

      {/* Dettaglio espanso con dati reali */}
      {selectedHour !== null && selectedData && (
        <div className="mt-2 bg-slate-800/60 rounded-lg border border-slate-700/40 overflow-hidden animate-in slide-in-from-top-2 duration-200">
          {/* Intestazione dettaglio */}
          <div className="bg-slate-700/30 px-3 py-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-amber-200">
              Dettaglio termiche — ore {String(selectedHour).padStart(2, "0")}:00
            </span>
            <button
              onClick={() => setSelectedHour(null)}
              className="text-[8px] text-slate-400 hover:text-slate-200 transition-colors"
            >
              Chiudi ✕
            </button>
          </div>

          {/* Corpo dettaglio con griglia dati */}
          <div className="p-3 grid grid-cols-2 gap-2">
            {/* Forza salita */}
            <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-700/30">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp className="w-3 h-3 text-amber-400" />
                <span className="text-[8px] text-slate-400">Forza salita</span>
              </div>
              <span className="text-sm font-bold text-amber-300">{selectedData.rateo.toFixed(1)} m/s</span>
              <span className="text-[8px] text-slate-500 ml-1">{getIntensitaLabel(selectedData.rateo)}</span>
            </div>

            {/* Quota base */}
            <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-700/30">
              <div className="flex items-center gap-1 mb-0.5">
                <ArrowUp className="w-3 h-3 text-green-400" />
                <span className="text-[8px] text-slate-400">Quota base</span>
              </div>
              <span className="text-sm font-bold text-green-300">{selectedData.base}m</span>
              <span className="text-[8px] text-slate-500 ml-1">slm</span>
            </div>

            {/* Quota top */}
            <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-700/30">
              <div className="flex items-center gap-1 mb-0.5">
                <ArrowUp className="w-3 h-3 text-red-400" />
                <span className="text-[8px] text-slate-400">Quota top</span>
              </div>
              <span className="text-sm font-bold text-red-300">{selectedData.top}m</span>
              <span className="text-[8px] text-slate-500 ml-1">slm</span>
            </div>

            {/* Spessore termica */}
            <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-700/30">
              <div className="flex items-center gap-1 mb-0.5">
                <Thermometer className="w-3 h-3 text-orange-400" />
                <span className="text-[8px] text-slate-400">Spessore</span>
              </div>
              <span className="text-sm font-bold text-orange-300">{selectedData.top - selectedData.base}m</span>
              <span className="text-[8px] text-slate-500 ml-1">salita</span>
            </div>

            {/* Gradiente termico */}
            {selectedData.gradienteReale > 0 && (
              <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-700/30 col-span-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <Thermometer className="w-3 h-3 text-blue-400" />
                  <span className="text-[8px] text-slate-400">Gradiente termico reale</span>
                </div>
                <span className="text-sm font-bold text-blue-300">{selectedData.gradienteReale}°C/100m</span>
              </div>
            )}

            {/* Indice di forza */}
            <div className="bg-slate-900/40 rounded-lg p-2 border border-slate-700/30 col-span-2">
              <div className="flex items-center gap-1 mb-1">
                <Info className="w-3 h-3 text-slate-400" />
                <span className="text-[8px] text-slate-400">Indice di forza termica</span>
              </div>
              <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (selectedData.forza / 10) * 100)}%`,
                    backgroundColor: getColoreDaRateo(selectedData.rateo),
                  }}
                />
              </div>
              <div className="flex justify-between text-[7px] text-slate-500 mt-0.5">
                <span>Debole</span>
                <span>{selectedData.forza.toFixed(1)} / 10</span>
                <span>Forte</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dettaglio per ora selezionata senza dati */}
      {selectedHour !== null && !selectedData && (
        <div className="mt-2 bg-slate-800/40 rounded-lg border border-slate-700/30 p-3 text-center">
          <span className="text-[10px] text-slate-500">
            Nessun dato termico disponibile per le ore {String(selectedHour).padStart(2, "0")}:00
          </span>
        </div>
      )}

      {/* Legenda */}
      <div className="mt-2 pt-1.5 border-t border-slate-600/30">
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[7px] text-slate-400">
          {LEGENDA.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.colore }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <div className="w-3 h-0 border-t border-dashed border-white/30 shrink-0" />
            <span>Base termica</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficoTermiche;