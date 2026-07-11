"use client";

import React from "react";
import {
  ArrowUp, Wind, Droplets, Gauge, Sun, Cloud, TrendingUp, Info,
  Zap, Thermometer, Shield, Activity
} from "lucide-react";
import type { TermicheData } from "@/utils/termiche";

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheData }[];
  oraCorrente: number;
}

function getEtichettaForza(forza: number): string {
  if (forza >= 7) return "Forti";
  if (forza >= 5) return "Buone";
  if (forza >= 3) return "Moderate";
  if (forza >= 1) return "Deboli";
  return "Assenti";
}

function getColoreTesto(forza: number): string {
  if (forza >= 7) return "text-white";
  if (forza >= 5) return "text-white";
  if (forza >= 3) return "text-yellow-900";
  if (forza >= 1) return "text-green-900";
  return "text-slate-400";
}

function IconaTurbolenza(t: "alta" | "media" | "bassa") {
  switch (t) {
    case "alta":
      return <Zap className="w-3 h-3 text-red-400" />;
    case "media":
      return <Activity className="w-3 h-3 text-yellow-400" />;
    case "bassa":
      return <Shield className="w-3 h-3 text-green-400" />;
  }
}

const LEGENDA: { colore: string; label: string }[] = [
  { colore: "#ef4444", label: "Termiche forti (+7)" },
  { colore: "#f97316", label: "Buone termiche (5-7)" },
  { colore: "#eab308", label: "Moderate (3-5)" },
  { colore: "#84cc16", label: "Deboli (1-3)" },
  { colore: "#64748b", label: "Assenti (0)" },
];

const GraficoTermiche = ({ hourly, oraCorrente }: GraficoTermicheProps) => {
  if (!hourly || hourly.length === 0) return null;

  const maxForza = Math.max(...hourly.map((h) => h.termiche.forza), 1);

  return (
    <div className="w-full py-4 px-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-800/50 border border-amber-500/50 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-amber-200">Forza termiche & quota massima</h3>
          <p className="text-[10px] text-slate-300">
            Elaborazione in tempo reale basata su vento, sole e umidit&agrave;
          </p>
        </div>
      </div>

      {/* Grafico a barre orizzontali */}
      <div className="space-y-1">
        {hourly.map((h) => {
          const t = h.termiche;
          const isCurrentHour = h.hour === oraCorrente;
          const forzaPercent = Math.round((t.forza / maxForza) * 100);
          const quotaMax = t.top;
          const etichetta = getEtichettaForza(t.forza);
          const coloreTesto = getColoreTesto(t.forza);
          const mostraEtichetta = forzaPercent > 18;

          return (
            <div
              key={h.hour}
              className="flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors hover:bg-slate-700/30"
            >
              {/* Ora */}
              <div className="shrink-0 w-10 text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1.5">
                {isCurrentHour && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />}
                {String(h.hour).padStart(2, "0")}:00
              </div>

              {/* Barra forza */}
              <div className="flex-1 h-6 bg-slate-700/60 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out flex items-center justify-center"
                  style={{
                    width: `${forzaPercent}%`,
                    backgroundColor: t.colore,
                    opacity: 0.9,
                  }}
                >
                  {mostraEtichetta && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${coloreTesto} drop-shadow-sm`}>
                      {etichetta}
                    </span>
                  )}
                </div>
                {!mostraEtichetta && (
                  <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider ${coloreTesto} drop-shadow-sm`}>
                    {etichetta}
                  </span>
                )}
              </div>

              {/* Quota massima raggiungibile */}
              <div className="shrink-0 w-24 text-center">
                <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">quota max</div>
                <span className="text-[13px] font-bold text-amber-200">
                  &uarr; {quotaMax > 0 ? `${quotaMax}m` : "—"}
                </span>
              </div>

              {/* Rateo */}
              <div className="shrink-0 w-14 text-center">
                <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">rateo</div>
                <span className="text-[13px] font-bold text-green-300">{t.rateo} m/s</span>
              </div>

              {/* Turbolenza e stabilità */}
              <div className="shrink-0 flex items-center gap-1.5 pl-1 border-l border-slate-600/40">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-0.5">
                    {IconaTurbolenza(t.turbolenza)}
                  </div>
                  <span className="text-[8px] text-slate-400 uppercase tracking-wider">
                    {t.turbolenza === "bassa" ? "dolce" : t.turbolenza}
                  </span>
                </div>
                {/* Indicatore stabilità */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                    style={{
                      backgroundColor: t.stabilita > 70 ? "rgba(34,197,94,0.3)" : t.stabilita > 40 ? "rgba(250,204,21,0.3)" : "rgba(239,68,68,0.3)",
                      color: t.stabilita > 70 ? "#86efac" : t.stabilita > 40 ? "#fde047" : "#fca5a5",
                      borderColor: t.stabilita > 70 ? "rgba(34,197,94,0.4)" : t.stabilita > 40 ? "rgba(250,204,21,0.4)" : "rgba(239,68,68,0.4)",
                    }}
                  >
                    {t.stabilita > 70 ? "C" : t.stabilita > 40 ? "M" : "T"}
                  </div>
                  <span className="text-[8px] text-slate-400 uppercase tracking-wider">conf.</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-4 pt-3 border-t border-slate-600/50">
        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
          {LEGENDA.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.colore }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <ArrowUp className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Quota massima</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-green-400 shrink-0" />
            <span>Dolce / bassa turbolenza</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-red-400 shrink-0" />
            <span>Alta turbolenza</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-yellow-400 shrink-0" />
            <span>Turbolenza media</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center text-[7px] font-bold border" style={{ backgroundColor: "rgba(34,197,94,0.3)", color: "#86efac", borderColor: "rgba(34,197,94,0.4)" }}>C</span>
            <span>Comfort (stabile)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center text-[7px] font-bold border" style={{ backgroundColor: "rgba(239,68,68,0.3)", color: "#fca5a5", borderColor: "rgba(239,68,68,0.4)" }}>T</span>
            <span>Turbolento</span>
          </div>
        </div>
      </div>

      {/* Info calcolo ottimizzato */}
      <div className="mt-3 p-2 rounded-lg bg-slate-800/60 border border-slate-600/30">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Info className="w-3 h-3 text-slate-300 shrink-0" />
          <span className="text-[10px] font-medium text-slate-300">Fattori considerati</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-[9px] text-slate-300">
          <span className="flex items-center gap-1">
            <Sun className="w-2.5 h-2.5 text-amber-400 shrink-0" />
            Gradiente termico
          </span>
          <span className="flex items-center gap-1">
            <Wind className="w-2.5 h-2.5 text-blue-400 shrink-0" />
            Vento (5-15 km/h ideale)
          </span>
          <span className="flex items-center gap-1">
            <Cloud className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            Nuvole (10-30% ideale)
          </span>
          <span className="flex items-center gap-1">
            <Droplets className="w-2.5 h-2.5 text-blue-300 shrink-0" />
            Umidit&agrave; (30-50% ideale)
          </span>
          <span className="flex items-center gap-1">
            <Gauge className="w-2.5 h-2.5 text-purple-400 shrink-0" />
            Pressione (+1015 hPa ideale)
          </span>
          <span className="flex items-center gap-1">
            <Thermometer className="w-2.5 h-2.5 text-orange-400 shrink-0" />
            Ora del giorno
          </span>
        </div>
        <div className="mt-1.5 text-[9px] text-slate-400">
          Dopo le 16: se vento moderato (8-18 km/h) le termiche diventano pi&ugrave; dolci e stabili, meno turbolenza &rarr; volo pi&ugrave; confortevole.
        </div>
      </div>
    </div>
  );
};

export default GraficoTermiche;