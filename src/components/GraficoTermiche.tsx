"use client";

import React from "react";
import { TrendingUp, Info, ArrowUp } from "lucide-react";
import type { TermicheData } from "@/utils/termiche";

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheData }[];
  oraCorrente: number;
}

const QUOTE_LABELS = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500, 0];
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

function getIntensitaClasse(rateo: number): string {
  if (rateo >= 3) return "bg-red-500";
  if (rateo >= 2) return "bg-orange-500";
  if (rateo >= 1) return "bg-yellow-500";
  if (rateo >= 0.3) return "bg-green-500";
  return "bg-slate-500";
}

const GraficoTermiche = ({ hourly, oraCorrente }: GraficoTermicheProps) => {
  if (!hourly || hourly.length === 0) return null;

  // Prepara mappa ora -> termiche
  const dataMap = new Map<number, TermicheData>();
  for (const h of hourly) {
    dataMap.set(h.hour, h.termiche);
  }

  // Trova il max quota per scala
  const maxQuota = Math.max(
    100,
    ...HOURS.map(h => dataMap.get(h)?.top ?? 0)
  );
  const scaleMax = Math.max(4000, maxQuota);

  return (
    <div className="w-full py-2 px-0.5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="w-6 h-6 rounded-lg bg-amber-800/50 border border-amber-500/50 flex items-center justify-center">
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-[10px] font-bold text-amber-200">Termiche</h3>
          <p className="text-[7px] text-slate-400">Quota (m slm) · Forza (m/s)</p>
        </div>
      </div>

      {/* Griglia: colonne per ora, righe per quota */}
      <div className="flex gap-0">
        {/* Etichette quote verticali a sinistra */}
        <div className="flex flex-col justify-between shrink-0 w-10 pr-1">
          {QUOTE_LABELS.map((q) => (
            <div key={q} className="text-[7px] text-slate-500 text-right leading-none h-6 flex items-center justify-end">
              {q}
            </div>
          ))}
        </div>

        {/* Colonne orarie */}
        {HOURS.map((hour) => {
          const t = dataMap.get(hour);
          const isCurrentHour = hour === oraCorrente;
          const nonNull = t && t.rateo > 0;

          let topPct = 0;
          let colore = "#64748b";
          let rateoStr = "--";
          let topStr = "--";

          if (t) {
            topPct = Math.min(100, (t.top / scaleMax) * 100);
            colore = getColoreDaRateo(t.rateo);
            rateoStr = t.rateo.toFixed(1);
            topStr = t.top.toString();
          }

          return (
            <div
              key={hour}
              className={`flex-1 flex flex-col items-center min-w-0 ${
                isCurrentHour ? "bg-green-900/20 rounded-sm" : ""
              }`}
            >
              {/* Barra verticale (cresce dal basso verso l'alto) */}
              <div className="relative w-full h-[210px] bg-slate-800/40 rounded-sm overflow-hidden" style={{ display: 'flex', flexDirection: 'column-reverse' }}>
                {/* Linee guida orizzontali ogni 500m */}
                {QUOTE_LABELS.map((q) => {
                  const yPct = (q / scaleMax) * 100;
                  return (
                    <div
                      key={q}
                      className="absolute w-full border-t border-slate-700/30"
                      style={{ top: `${100 - yPct}%` }}
                    />
                  );
                })}

                {/* Barra della termica (dal basso fino a top) */}
                {nonNull && (
                  <div
                    className="w-full transition-all duration-500 ease-out relative"
                    style={{
                      height: `${topPct}%`,
                      backgroundColor: colore,
                      opacity: 0.7,
                      minHeight: t && t.rateo > 0.3 ? '4px' : '0px',
                    }}
                  >
                    {/* Etichetta m/s dentro la barra */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[7px] font-bold text-white drop-shadow-md leading-none">
                        {rateoStr}
                      </span>
                    </div>
                  </div>
                )}

                {/* Se non ci sono termiche, mostra "--" al centro */}
                {!nonNull && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[7px] text-slate-500">--</span>
                  </div>
                )}
              </div>

              {/* Etichetta ora sotto */}
              <div
                className={`text-[8px] font-mono mt-0.5 leading-none ${
                  isCurrentHour ? "text-green-400 font-bold" : "text-slate-400"
                }`}
              >
                {String(hour).padStart(2, "0")}
              </div>

              {/* Quota max sotto */}
              <div className="text-[6px] text-slate-500 leading-none mt-0.5 truncate max-w-full">
                {topStr}m
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda sotto */}
      <div className="mt-2 pt-1.5 border-t border-slate-600/30">
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[7px] text-slate-400">
          {LEGENDA.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.colore }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <ArrowUp className="w-2 h-2 text-amber-400 shrink-0" />
            <span>Quota max (m)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficoTermiche;