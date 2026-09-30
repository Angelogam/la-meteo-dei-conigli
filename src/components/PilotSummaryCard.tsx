"use client";

import React from "react";
import { Wind, CloudRain, Thermometer, Clock, AlertTriangle, CheckCircle2, XCircle, ArrowUp, ArrowDown } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface PilotSummaryCardProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  siteName?: string;
}

/** Calcola la finestra di volo ideale (prime 3 ore con condizioni migliori) */
function findFlightWindow(data: HourData[]): { start: number; end: number; hours: number } | null {
  const oreVolo = data.filter(h => {
    const ora = new Date(h.time).getHours();
    return ora >= 9 && ora <= 18;
  });

  if (oreVolo.length === 0) return null;

  // Trova il periodo con vento < 25 km/h e nessuna pioggia
  let bestStart = oreVolo[0].time.getHours();
  let bestEnd = bestStart;
  let bestScore = 0;
  let currentStart = -1;
  let currentScore = 0;

  for (let i = 0; i < oreVolo.length; i++) {
    const h = oreVolo[i];
    const ora = new Date(h.time).getHours();
    const ventoOk = h.windSpeed < 25;
    const pioggiaOk = h.precipitation < 0.5;
    const score = (ventoOk ? 10 : 0) + (pioggiaOk ? 10 : 0) - (h.windSpeed || 0);

    if (ventoOk && pioggiaOk) {
      if (currentStart === -1) currentStart = ora;
      currentScore += score;
      if (currentScore > bestScore) {
        bestScore = currentScore;
        bestStart = currentStart;
        bestEnd = ora;
      }
    } else {
      currentStart = -1;
      currentScore = 0;
    }
  }

  const durata = bestEnd - bestStart + 1;
  return durata >= 2 ? { start: bestStart, end: bestEnd, hours: durata } : null;
}

/** Calcola il vento medio e le raffiche nelle prossime 3 ore */
function getWindForecast(data: HourData[], currentHour: number): { speed: number; gust: number; trend: "↑" | "↓" | "→"; label: string } {
  const nextHours = data.slice(currentHour, currentHour + 4);
  if (nextHours.length === 0) return { speed: 0, gust: 0, trend: "→", label: "--" };

  const avgSpeed = nextHours.reduce((s, h) => s + (h.windSpeed || 0), 0) / nextHours.length;
  const avgGust = nextHours.reduce((s, h) => s + (h.windGusts || 0), 0) / nextHours.length;
  const gustSpread = avgGust - avgSpeed;

  // Trend: confronta prima e dopo
  const firstHalf = nextHours.slice(0, 2).reduce((s, h) => s + (h.windSpeed || 0), 0) / Math.max(1, 2);
  const lastHalf = nextHours.slice(-2).reduce((s, h) => s + (h.windSpeed || 0), 0) / Math.max(1, 2);
  const trend = lastHalf > firstHalf + 2 ? "↑" : lastHalf < firstHalf - 2 ? "↓" : "→";

  let label = "Calmo";
  if (avgSpeed > 25) label = "Pericoloso";
  else if (avgSpeed > 18) label = "Forte";
  else if (avgSpeed > 12) label = "Moderato";
  else if (avgSpeed > 6) label = "Leggero";

  return { speed: Math.round(avgSpeed), gust: Math.round(avgGust), trend, label };
}

/** Calcola la probabilità di pioggia nelle prossime 6 ore */
function getRainForecast(data: HourData[], currentHour: number): { proba: number; risk: " bassa" | "media" | "alta"; label: string } {
  const next6h = data.slice(currentHour, currentHour + 6);
  if (next6h.length === 0) return { proba: 0, risk: " bassa", label: "--" };

  const pioggiaOre = next6h.filter(h => h.precipitation > 0.3).length;
  const proba = Math.round((pioggiaOre / next6h.length) * 100);

  let risk: "bassa" | "media" | "alta" = "bassa";
  if (proba > 50) risk = "alta";
  else if (proba > 20) risk = "media";

  return { proba, risk, label: `${proba}%` };
}

/** Calcola la stabilità dall'indice Lifted */
function getStability(liftedIndex: number): { level: "stabile" | "neutro" | "instabile"; label: string } {
  if (liftedIndex < -3) return { level: "instabile", label: "Instabile ⚠️" };
  if (liftedIndex < 0) return { level: "neutro", label: "Neutro" };
  return { level: "stabile", label: "Stabile ✅" };
}

export default function PilotSummaryCard({ dayData, altitude, selectedHour, siteName }: PilotSummaryCardProps) {
  if (!dayData || dayData.length === 0) return null;

  const current = dayData[selectedHour] || dayData[0];
  const window = findFlightWindow(dayData);
  const wind = getWindForecast(dayData, selectedHour);
  const rain = getRainForecast(dayData, selectedHour);
  const stability = getStability(current.liftedIndex || 0);

  // Calcola shear stimato (differenza vento suolo vs 1000m)
  const windAt1000 = dayData[selectedHour]?.windSpeed850 || current.windSpeed * 1.3;
  const shear = Math.round(Math.abs(windAt1000 - current.windSpeed));

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          DECOLLO OGGI
        </h3>
        {siteName && (
          <span className="text-xs text-slate-500 font-semibold">{siteName}</span>
        )}
      </div>

      {/* SEMAFORO PRINCIPALE */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/30">
        {rain.proba > 50 || wind.speed > 25 ? (
          <>
            <XCircle className="w-8 h-8 text-red-400 shrink-0" />
            <div>
              <div className="text-lg font-black text-red-300">NON DECOLLARE</div>
              <div className="text-xs text-red-400/70">
                {rain.proba > 50 ? "Pioggia probabile" : "Vento troppo forte"}
              </div>
            </div>
          </>
        ) : wind.speed > 18 ? (
          <>
            <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <div className="text-lg font-black text-amber-300">ATTENZIONE</div>
              <div className="text-xs text-amber-400/70">Vento forte — solo esperti</div>
            </div>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
            <div>
              <div className="text-lg font-black text-emerald-300">DECOLLO CONSENTITO</div>
              <div className="text-xs text-emerald-400/70">Condizioni favorevoli</div>
            </div>
          </>
        )}
      </div>

      {/* GRIGLIA RAPIDA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Vento */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Wind className="w-3 h-3" />
            <span>Vento</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{wind.speed}</span>
            <span className="text-xs text-slate-500">km/h</span>
          </div>
          <div className={`text-xs font-bold mt-1 ${
            wind.speed > 25 ? "text-red-400" :
            wind.speed > 18 ? "text-amber-400" :
            wind.speed > 12 ? "text-sky-400" :
            "text-emerald-400"
          }`}>
            {wind.label} {wind.trend}
          </div>
          {wind.gust - wind.speed > 15 && (
            <div className="text-xs text-red-400 mt-0.5">Raffiche +{Math.round(wind.gust - wind.speed)} km/h</div>
          )}
        </div>

        {/* Shear */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <ArrowUp className="w-3 h-3" />
            <span>Shear</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{shear}</span>
            <span className="text-xs text-slate-500">km/h</span>
          </div>
          <div className={`text-xs font-bold mt-1 ${
            shear > 20 ? "text-red-400" :
            shear > 10 ? "text-amber-400" :
            "text-emerald-400"
          }`}>
            {shear > 20 ? "Pericoloso" : shear > 10 ? "Moderato" : "Tranq."}
          </div>
        </div>

        {/* Pioggia */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <CloudRain className="w-3 h-3" />
            <span>Pioggia (6h)</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{rain.proba}%</span>
          </div>
          <div className={`text-xs font-bold mt-1 ${
            rain.risk === "alta" ? "text-red-400" :
            rain.risk === "media" ? "text-amber-400" :
            "text-emerald-400"
          }`}>
            Rischio {rain.risk}
          </div>
        </div>

        {/* Stabilità */}
        <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Thermometer className="w-3 h-3" />
            <span>Stabilità</span>
          </div>
          <div className="text-lg font-black text-white mt-0.5">
            {current.liftedIndex != null ? Math.round(current.liftedIndex) : "--"}
          </div>
          <div className="text-xs text-slate-500">Lifted Index</div>
          <div className={`text-xs font-bold mt-1 ${
            (current.liftedIndex || 0) < -3 ? "text-red-400" :
            (current.liftedIndex || 0) < 0 ? "text-amber-400" :
            "text-emerald-400"
          }`}>
            {stability.label}
          </div>
        </div>
      </div>

      {/* FINESTRA DI VOLO */}
      {window && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
          <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <div className="text-sm font-black text-emerald-300">
              Finestra di volo: {String(window.start).padStart(2, "0")}:00 – {String(window.end).padStart(2, "0")}:00
            </div>
            <div className="text-xs text-emerald-400/60">
              {window.hours} ore favorevoli · Vento {wind.label}
            </div>
          </div>
        </div>
      )}

      {/* ALERT PERICOLOSI */}
      {(wind.speed > 25 || (wind.gust - wind.speed) > 15 || shear > 20 || rain.proba > 50) && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-950/30 border border-red-500/30">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-300 space-y-1">
            {wind.speed > 25 && <div>⚠️ Vento al suolo troppo forte (&gt;25 km/h)</div>}
            {(wind.gust - wind.speed) > 15 && <div>⚠️ Raffiche pericolose (+{Math.round(wind.gust - wind.speed)} km/h)</div>}
            {shear > 20 && <div>⚠️ Shear verticale forte — rischio collasso asimmetrico</div>}
            {rain.proba > 50 && <div>⚠️ Pioggia probabile — temporali possibili</div>}
          </div>
        </div>
      )}

      {/* DISCLAIMER */}
      <div className="text-[10px] text-slate-600 text-center pt-2 border-t border-slate-800/50">
        ⚠️ Verifica sempre le condizioni sul posto. Questa app è un supporto, non sostituisce il giudizio del pilota.
      </div>
    </div>
  );
}