"use client";

import React from "react";
import { Wind, Thermometer, CloudRain, CloudSun, ArrowUpRight, CloudLightning } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface VoloDecisionCardProps {
  dayData: HourData[];
  selectedHour: number;
  altitude: number;
  siteName?: string;
}

export default function VoloDecisionCard({ dayData, selectedHour, altitude, siteName }: VoloDecisionCardProps) {
  if (!dayData || dayData.length === 0) return null;

  const current = dayData[selectedHour] || dayData[0];
  
  // Calcoli semplificati
  const ventoMedia = dayData.slice(selectedHour, selectedHour + 3).reduce((s: number, h: any) => s + (h.windSpeed || 0), 0) / 3;
  const rafficheMedia = dayData.slice(selectedHour, selectedHour + 3).reduce((s: number, h: any) => s + (h.windGusts || 0), 0) / 3;
  const spreadVento = rafficheMedia - ventoMedia;
  
  const pioggiaProb = dayData.slice(selectedHour, selectedHour + 6).filter((h: any) => h.precipitation > 0.3).length / 6 * 100;
  const liftedIndex = current.liftedIndex || 0;
  
  // Calcolo base nuvole semplificata
  const baseNuvole = current.dewPoint != null && current.temperature != null 
    ? Math.round((current.temperature - current.dewPoint) * 125) 
    : 0;
  
  // Determina stato volo
  const ventoPericoloso = ventoMedia > 25;
  const raffichePericolose = spreadVento > 15;
  const temporaliProbabili = pioggiaProb > 50 || (current.weatherCode >= 95 && current.weatherCode <= 99);
  const instabile = liftedIndex < -3;
  
  const statoVolo = temporaliProbabili || (ventoPericoloso && spreadVento > 10) ? "no" 
    : ventoPericoloso || raffichePericolose ? "attention" 
    : "yes";

  // Calcola finestre di volo
  const oreVolo = dayData.filter((h: any) => {
    const ora = new Date(h.time).getHours();
    return ora >= 9 && ora <= 18 && h.windSpeed < 25 && h.precipitation < 0.5;
  });
  let finestraInizio = 9;
  let finestraFine = 18;
  if (oreVolo.length > 0) {
    finestraInizio = oreVolo[0].time.getHours();
    finestraFine = oreVolo[oreVolo.length - 1].time.getHours();
  }

  return (
    <div className="bg-slate-900/90 border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-sky-400" />
            <span className="text-sm font-black text-white">Condizioni Volo</span>
          </div>
          {siteName && (
            <span className="text-xs text-slate-500 font-semibold">{siteName}</span>
          )}
        </div>
      </div>

      {/* SEMAFORO PRINCIPALE */}
      <div className="px-4 py-4 border-b border-slate-800/50">
        <div className={`flex items-center gap-4 p-4 rounded-xl ${
          statoVolo === "yes" ? "bg-emerald-950/40 border border-emerald-500/30" :
          statoVolo === "attention" ? "bg-amber-950/40 border border-amber-500/30" :
          "bg-red-950/40 border border-red-500/30"
        }`}>
          {statoVolo === "yes" ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shrink-0">
                <span className="text-2xl">✓</span>
              </div>
              <div>
                <div className="text-lg font-black text-emerald-300">VOLO CONSENTITO</div>
                <div className="text-xs text-emerald-400/70">Condizioni favorevoli per il decollo</div>
              </div>
            </>
          ) : statoVolo === "attention" ? (
            <>
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shrink-0 animate-pulse">
                <span className="text-2xl">!</span>
              </div>
              <div>
                <div className="text-lg font-black text-amber-300">ATTENZIONE</div>
                <div className="text-xs text-amber-400/70">
                  {ventoPericoloso ? "Vento forte " : ""}
                  {raffichePericolose ? "raffiche pericolose" : ""}
                  {" — solo esperti"}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-400 flex items-center justify-center shrink-0">
                <span className="text-2xl">×</span>
              </div>
              <div>
                <div className="text-lg font-black text-red-300">NON DECOLLARE</div>
                <div className="text-xs text-red-400/70">
                  {temporaliProbabili ? "Temporali in arrivo " : ""}
                  {ventoPericoloso ? "Vento eccessivo" : ""}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* GRIGLIA RAPIDA */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Vento */}
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">
            <Wind className="w-3.5 h-3.5" />
            <span>Vento al suolo</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{Math.round(ventoMedia)}</span>
            <span className="text-xs text-slate-500">km/h</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <span className={`text-xs font-bold ${
              ventoMedia > 25 ? "text-red-400" :
              ventoMedia > 18 ? "text-amber-400" :
              ventoMedia > 10 ? "text-sky-400" :
              "text-emerald-400"
            }`}>
              {ventoMedia > 25 ? "Pericoloso" : ventoMedia > 18 ? "Forte" : ventoMedia > 10 ? "Moderato" : "Leggero"}
            </span>
            {spreadVento > 10 && (
              <span className="text-xs text-red-400 ml-auto">Raff: +{Math.round(spreadVento)}</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            ↑ {current.windDir ? `${current.windDir}°` : "--"}
          </div>
        </div>

        {/* Pioggia */}
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">
            <CloudRain className="w-3.5 h-3.5" />
            <span>Pioggia (6h)</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{Math.round(pioggiaProb)}%</span>
          </div>
          <div className={`text-xs font-bold mt-1 ${
            pioggiaProb > 50 ? "text-red-400" :
            pioggiaProb > 20 ? "text-amber-400" :
            "text-emerald-400"
          }`}>
            {pioggiaProb > 50 ? "Probabile" : pioggiaProb > 20 ? "Possibile" : "Improbabile"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {current.precipitation > 0 ? `Ora: ${current.precipitation.toFixed(1)}mm` : "Asciutto"}
          </div>
        </div>

        {/* Stabilità */}
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">
            <Thermometer className="w-3.5 h-3.5" />
            <span>Stabilità</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{Math.round(liftedIndex)}</span>
          </div>
          <div className={`text-xs font-bold mt-1 ${
            liftedIndex < -3 ? "text-red-400" :
            liftedIndex < 0 ? "text-amber-400" :
            "text-emerald-400"
          }`}>
            {liftedIndex < -3 ? "Instabile ⚠️" : liftedIndex < 0 ? "Neutro" : "Stabile ✓"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            LI: {liftedIndex < -3 ? "Termiche forti ma turbolente" : liftedIndex < 0 ? "Condizioni miste" : "Atmosfera stabile"}
          </div>
        </div>

        {/* Base Nuvole */}
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-2">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Base cumuli</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{baseNuvole > 0 ? Math.round(baseNuvole / 100) * 100 : "--"}</span>
            <span className="text-xs text-slate-500">m</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {baseNuvole > 2000 ? "Alta — buon plafond" : baseNuvole > 1000 ? "Media" : "Bassa — attento"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Spread: {current.temperature != null && current.dewPoint != null ? Math.round(current.temperature - current.dewPoint) : "--"}°C
          </div>
        </div>
      </div>

      {/* FINESTRA DI VOLO */}
      <div className="px-4 pb-4">
        <div className="bg-gradient-to-r from-sky-950/40 to-slate-900/40 border border-sky-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <CloudSun className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">Finestra di Volo</span>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-lg font-black text-white">
                {String(finestraInizio).padStart(2, "0")}:00
              </div>
              <div className="text-xs text-slate-500">Inizio</div>
            </div>
            <div className="text-slate-600 text-xl">→</div>
            <div>
              <div className="text-lg font-black text-white">
                {String(finestraFine).padStart(2, "0")}:00
              </div>
              <div className="text-xs text-slate-500">Fine</div>
            </div>
            <div className="ml-auto bg-sky-500/20 border border-sky-500/30 rounded-lg px-3 py-1">
              <div className="text-sm font-black text-sky-300">
                {finestraFine - finestraInizio}h
              </div>
              <div className="text-[10px] text-sky-400/70">favorevoli</div>
            </div>
          </div>
        </div>
      </div>

      {/* ALERT RAPIDI */}
      {(ventoPericoloso || raffichePericolose || temporaliProbabili || instabile) && (
        <div className="px-4 pb-4 space-y-2">
          {ventoPericoloso && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-950/40 border border-red-500/30">
              <Wind className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs text-red-300">Vento al suolo troppo forte ({Math.round(ventoMedia)} km/h) — non decollare</span>
            </div>
          )}
          {raffichePericolose && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-950/40 border border-orange-500/30">
              <Wind className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-xs text-orange-300">Raffiche pericolose (+{Math.round(spreadVento)} km/h) — rischio collassi</span>
            </div>
          )}
          {temporaliProbabili && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-950/40 border border-purple-500/30">
              <CloudLightning className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs text-purple-300">Temporali probabili — EVITARE il volo</span>
            </div>
          )}
          {instabile && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/40 border border-amber-500/30">
              <Thermometer className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs text-amber-300">Atmosfera instabile — termiche potenti ma turbolente</span>
            </div>
          )}
        </div>
      )}

      {/* DISCLAIMER */}
      <div className="px-4 pb-3">
        <div className="text-[10px] text-slate-600 text-center py-2 border-t border-slate-800/50">
          ⚠️ Verifica sempre le condizioni sul posto. Questa app è un supporto, non sostituisce il giudizio del pilota.
        </div>
      </div>
    </div>
  );
}
