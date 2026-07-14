"use client";

import React, { useMemo } from "react";
import {
  Sun, Moon, CloudSun, Thermometer, Wind, Droplets,
  Clock, ArrowUp, TrendingUp, Mountain, Cloud,
  CheckCircle, Umbrella, Gauge, Sparkles
} from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import { degreesToCardinal, windArrow } from "@/utils/windDirections";

interface AnalisiTabProps {
  currentData: HourData | null;
  dayData: HourData[];
  windProfile?: { height: number; speed: number; dir: number }[];
  hourlyData?: any[];
  targetHour?: number;
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
}

function getRischioPioggia(mm: number): { label: string; color: string } {
  if (mm === 0) return { label: "Assente", color: "text-emerald-300" };
  if (mm < 0.3) return { label: "Debole", color: "text-amber-300" };
  if (mm < 1) return { label: "Moderato", color: "text-orange-400" };
  if (mm < 3) return { label: "Alto", color: "text-red-400" };
  return { label: "Probabile", color: "text-red-500" };
}

export default function AnalisiTab({ currentData, dayData, site, hourlyData }: AnalisiTabProps) {
  const alt = site?.alt ?? 1000;

  // Media di un array con controllo null
  const media = (arr: number[]) => arr.filter(v => v != null).reduce((s, v) => s + v, 0) / Math.max(1, arr.filter(v => v != null).length);

  // Riepilogo generale del giorno
  const riepilogo = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;

    const temps = dayData.map(h => h.temperature);
    const winds = dayData.map(h => h.windSpeed);
    const hums = dayData.map(h => h.humidity);
    const clouds = dayData.map(h => h.cloudCover);
    const precipTot = dayData.reduce((s, h) => s + (h.precipitation || 0), 0);

    const tempMin = Math.min(...temps);
    const tempMax = Math.max(...temps);
    const tempMediaVal = media(temps);
    const windMedia = media(winds);
    const windMax = Math.max(...winds);
    const humMedia = media(hums);
    const cloudMedia = media(clouds);
    const precipTotRound = Math.round(precipTot * 10) / 10;

    // Termiche medie del giorno
    const termicheOrarie = dayData.map(h => calcolaTermiche(h, alt));
    const salitaMedia = media(termicheOrarie.map(t => t.rateo));
    const baseMedia = Math.round(media(termicheOrarie.map(t => t.base)));
    const topMedia = Math.round(media(termicheOrarie.map(t => t.top)));

    let termicheLabel = "Assenti ❌";
    let termicheColore = "text-slate-400";
    if (salitaMedia >= 4) { termicheLabel = "Forti 🔥"; termicheColore = "text-red-400"; }
    else if (salitaMedia >= 3) { termicheLabel = "Buone 🪂"; termicheColore = "text-orange-400"; }
    else if (salitaMedia >= 2) { termicheLabel = "Moderate 👍"; termicheColore = "text-amber-400"; }
    else if (salitaMedia >= 1) { termicheLabel = "Deboli 👎"; termicheColore = "text-amber-300"; }
    else if (salitaMedia >= 0.3) { termicheLabel = "M. deboli ☁️"; termicheColore = "text-yellow-300"; }

    return {
      tempMin: Math.round(tempMin),
      tempMax: Math.round(tempMax),
      tempMedia: Math.round(tempMediaVal),
      windMedia: Math.round(windMedia),
      windMax: Math.round(windMax),
      humMedia: Math.round(humMedia),
      cloudMedia: Math.round(cloudMedia),
      precipTot: precipTotRound,
      salitaMedia: Math.round(salitaMedia * 10) / 10,
      baseMedia,
      topMedia,
      termicheLabel,
      termicheColore,
    };
  }, [dayData, alt]);

  // Fasce orarie (mattina, pomeriggio, sera)
  const fasce = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];

    const suddividi = (inizio: number, fine: number, label: string) => {
      const ore = dayData.filter(h => {
        const hh = h.time.getHours();
        return hh >= inizio && hh < fine;
      });
      if (ore.length === 0) return null;

      const t = media(ore.map(h => h.temperature));
      const ws = media(ore.map(h => h.windSpeed));
      const wdVal = media(ore.map(h => h.windDir));
      const cc = media(ore.map(h => h.cloudCover));
      const hum = media(ore.map(h => h.humidity));
      const prec = ore.reduce((s, h) => s + (h.precipitation || 0), 0);

      const termicheOra = ore.map(h => calcolaTermiche(h, alt));
      const salita = media(termicheOra.map(t => t.rateo));
      const base = Math.round(media(termicheOra.map(t => t.base)));
      const top = Math.round(media(termicheOra.map(t => t.top)));

      let termLabel = "Assenti";
      let termCol = "text-slate-400";
      if (salita >= 4) { termLabel = "Forti 🔥"; termCol = "text-red-400"; }
      else if (salita >= 3) { termLabel = "Buone 🪂"; termCol = "text-orange-400"; }
      else if (salita >= 2) { termLabel = "Moderate 👍"; termCol = "text-amber-400"; }
      else if (salita >= 1) { termLabel = "Deboli 👎"; termCol = "text-amber-300"; }
      else if (salita >= 0.3) { termLabel = "M. deboli ☁️"; termCol = "text-yellow-300"; }

      return {
        label,
        temp: Math.round(t), vento: Math.round(ws), dir: Math.round(wdVal),
        cloud: Math.round(cc), hum: Math.round(hum), precip: Math.round(prec * 10) / 10,
        salita: Math.round(salita * 10) / 10, base, top,
        termLabel, termCol, nOre: ore.length,
      };
    };

    return [
      suddividi(8, 12, "Mattina"),
      suddividi(12, 17, "Pomeriggio"),
      suddividi(17, 21, "Sera"),
    ].filter(Boolean);
  }, [dayData, alt]);

  if (!dayData || dayData.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-lg">
        <Clock className="w-8 h-8 mr-3 text-slate-500" />
        Nessun dato disponibile per questa giornata.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Riepilogo generale giorno */}
      {riepilogo && (
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-orange-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-orange-300 flex items-center gap-2">
              <Sun className="w-4 h-4" />
              Riepilogo giornata
            </h3>
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <Thermometer className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-amber-300">{riepilogo.tempMax}°</div>
              <div className="text-xs text-slate-400">max / {riepilogo.tempMin}° min</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <Wind className="w-5 h-5 text-sky-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-sky-300">{riepilogo.windMedia}</div>
              <div className="text-xs text-slate-400">media, max {riepilogo.windMax}</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <Cloud className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <div className="text-xl font-bold text-slate-200">{riepilogo.cloudMedia}%</div>
              <div className="text-xs text-slate-400">nuvolosità media</div>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3 text-center">
              <ArrowUp className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <div className={`text-xl font-bold ${riepilogo.termicheColore}`}>{riepilogo.salitaMedia}</div>
              <div className="text-xs text-slate-400">m/s medi</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-400">
            <div className="bg-slate-900/50 rounded-lg p-2">
              <span className="font-bold text-slate-300">Base termica media:</span>{" "}
              <span className="text-green-300 font-bold">{riepilogo.baseMedia} m slm</span>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <span className="font-bold text-slate-300">Top termico medio:</span>{" "}
              <span className="text-red-300 font-bold">{riepilogo.topMedia} m slm</span>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <span className="font-bold text-slate-300">Umidità media:</span>{" "}
              <span className="text-blue-300 font-bold">{riepilogo.humMedia}%</span>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-2">
              <span className="font-bold text-slate-300">Precipitazioni:</span>{" "}
              <span className={riepilogo.precipTot > 0 ? "text-blue-300 font-bold" : "text-emerald-300 font-bold"}>
                {riepilogo.precipTot > 0 ? `${riepilogo.precipTot} mm` : "Assenti"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fasce orarie */}
      {fasce.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4" />
            Analisi per fascia oraria
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {fasce.map((f: any, idx: number) => {
              const dirCardinal = degreesToCardinal(f.dir);
              const dirArrow = windArrow(f.dir);
              const colori = ["border-amber-500/30", "border-sky-500/30", "border-indigo-500/30"];
              const icone = [
                <Sun className="w-5 h-5 text-amber-300" />,
                <CloudSun className="w-5 h-5 text-yellow-300" />,
                <Moon className="w-5 h-5 text-indigo-300" />,
              ];

              return (
                <div key={idx} className={`rounded-xl p-3 border-2 ${colori[idx]} bg-slate-800/40`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    {icone[idx]}
                    <span className="text-xs font-bold text-white">{f.label}</span>
                    <span className="text-[10px] text-slate-400">({f.nOre} ore)</span>
                  </div>

                  <div className="text-xl font-bold text-amber-300 mb-1">
                    {f.temp}°C
                  </div>

                  <div className="bg-slate-900/60 rounded-lg p-2 mb-2">
                    <div className="flex items-center gap-1 text-xs mb-0.5">
                      <Wind className="w-3 h-3 text-sky-400" />
                      <span className="text-sky-300 font-bold">{f.vento} km/h</span>
                      <span className="text-slate-500">{dirArrow} {dirCardinal} ({f.dir}°)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                      <span>Nuvole: <span className="text-slate-200 font-bold">{f.cloud}%</span></span>
                      <span>Umidità: <span className="text-blue-200 font-bold">{f.hum}%</span></span>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 rounded-lg p-2 mb-2">
                    <div className="flex items-center gap-1 text-xs mb-0.5">
                      <ArrowUp className="w-3 h-3 text-orange-400" />
                      <span className={f.termCol + " font-bold"}>{f.termLabel}</span>
                      <span className="text-slate-400">({f.salita} m/s)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                      <span>Base: <Mountain className="w-2.5 h-2.5 text-green-400 inline" />{" "}
                        <span className="text-green-300 font-bold">{f.base} m slm</span>
                      </span>
                      <span>Top: <TrendingUp className="w-2.5 h-2.5 text-red-400 inline" />{" "}
                        <span className="text-red-300 font-bold">{f.top} m slm</span>
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-400 mt-0.5">
                      Spessore: {f.top - f.base} m
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/50 rounded-lg px-2 py-1">
                    <div className="flex items-center gap-1 text-[10px]">
                      <Droplets className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-300">{f.hum}%</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      {f.precip === 0
                        ? <CheckCircle className="w-3 h-3 text-emerald-400" />
                        : <Umbrella className="w-3 h-3 text-blue-400" />
                      }
                      <span className={f.precip === 0 ? "text-emerald-300" : "text-blue-300"}>
                        {f.precip === 0 ? "Secco" : `${f.precip}mm`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Riepilogo volo */}
      {currentData && (
        <div className="bg-gradient-to-br from-orange-900/20 to-amber-900/10 border-2 border-orange-700/30 rounded-2xl p-4 text-center">
          <h3 className="text-sm font-bold text-orange-300 flex items-center justify-center gap-2 mb-2">
            🪂 Interpretazione volo
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {riepilogo?.salitaMedia && riepilogo.salitaMedia >= 2
              ? "Condizioni favorevoli per il volo libero. Termiche attive per tutta la giornata."
              : riepilogo?.salitaMedia && riepilogo.salitaMedia >= 1
              ? "Condizioni discrete per il volo. Termiche presenti ma non intense."
              : riepilogo?.salitaMedia && riepilogo.salitaMedia >= 0.3
              ? "Condizioni marginali. Termiche deboli, consigliata esperienza."
              : "Termiche assenti o molto deboli. Volo sconsigliato."
            }
            {riepilogo?.windMedia && riepilogo.windMedia > 25 && " Vento sostenuto: richiesta esperienza."}
            {riepilogo?.precipTot && riepilogo.precipTot > 0.5 && " Possibili precipitazioni."}
          </p>
        </div>
      )}
    </div>
  );
}