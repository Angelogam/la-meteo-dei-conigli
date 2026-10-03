"use client";

import React, { useMemo } from "react";
import type { HourData } from "@/types/meteo";
import { Wind, Thermometer, CloudRain, CloudSun, ArrowUpRight, AlertTriangle, CheckCircle, XCircle, Zap, Droplets, Eye, Sunrise, Sunset, Mountain } from "lucide-react";
import { calcolaTermiche } from "@/utils/termiche";

interface VoloDecisionCardProps {
  dayData: HourData[];
  selectedHour: number;
  altitude: number;
  siteName?: string;
}

// ─── Utility ────────────────────────────────────────────────────────────────
function ventoTesto(speed: number): string {
  if (speed < 3) return "Calma";
  if (speed < 8) return "Leggero";
  if (speed < 15) return "Moderato";
  if (speed < 22) return "Fresco";
  if (speed < 30) return "Forte";
  return "Pericoloso";
}

function direzioneVento(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

function termicheTesto(rateo: number): string {
  if (rateo >= 3) return "Ottime 🔥";
  if (rateo >= 2) return "Buone 🪂";
  if (rateo >= 1) return "Moderate 🌤️";
  if (rateo >= 0.3) return "Deboli 🌥️";
  return "Assenti ❄️";
}

function liftedIndexTesto(li: number): string {
  if (li < -5) return "Molto instabile — termiche forti ma turbolente";
  if (li < -2) return "Instabile — condizioni dinamico-termiche";
  if (li < 0) return "Neutro — condizioni variabili";
  if (li < 3) return "Stabile — buone condizioni di crociera";
  return "Molto stabile — termiche deboli";
}

// ─── Componente ─────────────────────────────────────────────────────────────
export default function VoloDecisionCard({ dayData, selectedHour, altitude, siteName }: VoloDecisionCardProps) {
  if (!dayData || dayData.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-8 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin mx-auto mb-3" />
        <p className="text-sm text-sky-300 font-semibold">Caricamento dati meteo…</p>
      </div>
    );
  }

  // ── Calcoli ──────────────────────────────────────────────────────────────
  const current = dayData[selectedHour] || dayData[0];
  const currentThermal = calcolaTermiche(current as any, altitude);

  const ventoMedia = dayData.slice(selectedHour, Math.min(selectedHour + 3, dayData.length)).reduce((s: number, h: any) => s + (h.windSpeed || 0), 0) / Math.min(3, dayData.length - selectedHour);
  const rafficheMedia = dayData.slice(selectedHour, Math.min(selectedHour + 3, dayData.length)).reduce((s: number, h: any) => s + (h.windGusts || 0), 0) / Math.min(3, dayData.length - selectedHour);
  const spreadVento = rafficheMedia - ventoMedia;

  const pioggiaProb = dayData.slice(selectedHour, Math.min(selectedHour + 6, dayData.length)).filter((h: any) => h.precipitation > 0.3).length / Math.min(6, dayData.length - selectedHour) * 100;
  const liftedIndex = current.liftedIndex || 0;
  const cape = current.cape || 0;
  const baseNuvole = current.dewPoint != null && current.temperature != null
    ? Math.round((current.temperature - current.dewPoint) * 125)
    : 0;

  const ventoPericoloso = ventoMedia > 25;
  const raffichePericolose = spreadVento > 15;
  const temporaliProbabili = pioggiaProb > 50 || (current.weatherCode >= 95 && current.weatherCode <= 99);
  const instabile = liftedIndex < -3;

  // Voto volo
  let voto = 10;
  let votoLabel = "Eccellente";
  let votoColor = "emerald";
  if (temporaliProbabili) { voto = 0; votoLabel = "Temporali"; votoColor = "red"; }
  else if (ventoPericoloso && spreadVento > 10) { voto = 1; votoLabel = "Pericoloso"; votoColor = "red"; }
  else if (pioggiaProb > 60) { voto = 2; votoLabel = "Pioggia probabile"; votoColor = "red"; }
  else if (ventoMedia > 25) { voto = 3; votoLabel = "Vento forte"; votoColor = "red"; }
  else if (ventoMedia > 18 || spreadVento > 10) { voto = 4; votoLabel = "Attenzione"; votoColor = "orange"; }
  else if (pioggiaProb > 30 || instabile) { voto = 5; votoLabel = "Discreto"; votoColor = "amber"; }
  else if (currentThermal.rateo < 0.3) { voto = 6; votoLabel = "Termiche assenti"; votoColor = "amber"; }
  else if (currentThermal.rateo < 1) { voto = 7; votoLabel = "Modesto"; votoColor = "yellow"; }
  else if (currentThermal.rateo < 1.5) { voto = 8; votoLabel = "Buono"; votoColor = "lime"; }
  else if (currentThermal.rateo < 2.5) { voto = 9; votoLabel = "Ottimo"; votoColor = "emerald"; }
  else { voto = 10; votoLabel = "Eccellente"; votoColor = "emerald"; }

  // Finestra di volo
  const oreVolo = dayData.filter((h: any) => {
    const ora = new Date(h.time).getHours();
    return ora >= 9 && ora <= 18 && h.windSpeed < 25 && h.precipitation < 0.5;
  });
  let finestraInizio = 9, finestraFine = 18;
  if (oreVolo.length > 0) {
    finestraInizio = oreVolo[0].time.getHours();
    finestraFine = oreVolo[oreVolo.length - 1].time.getHours();
  }
  const oreFavorevoli = finestraFine - finestraInizio;

  // Alerte
  const alerte: { tipo: string; testo: string; icona: React.ReactNode; colore: string }[] = [];
  if (temporaliProbabili) alerte.push({ tipo: "pericolo", testo: "Temporali probabili — EVITARE il volo", icona: <Zap className="w-4 h-4" />, colore: "purple" });
  if (ventoPericoloso) alerte.push({ tipo: "pericolo", testo: `Vento al suolo ${Math.round(ventoMedia)} km/h — troppo forte per decollare`, icona: <Wind className="w-4 h-4" />, colore: "red" });
  if (raffichePericolose) alerte.push({ tipo: "pericolo", testo: `Raffiche +${Math.round(spreadVento)} km/h — rischio collassi`, icona: <Wind className="w-4 h-4" />, colore: "orange" });
  if (instabile) alerte.push({ tipo: "attenzione", testo: "Atmosfera instabile — termiche potenti ma turbolente", icona: <Thermometer className="w-4 h-4" />, colore: "amber" });
  if (baseNuvole < 800) alerte.push({ tipo: "attenzione", testo: "Base cumuli molto bassa — possibile nebbia mattutina al decollo", icona: <CloudRain className="w-4 h-4" />, colore: "amber" });
  if (cape < 50) alerte.push({ tipo: "info", testo: "CAPE basso — termiche deboli, preferire dynamic di cresta", icona: <ArrowUpRight className="w-4 h-4" />, colore: "sky" });
  if (liftedIndex > 3) alerte.push({ tipo: "info", testo: "Atmosfera molto stabile — termiche assenti, solo dynamic", icona: <Thermometer className="w-4 h-4" />, colore: "sky" });

  // ── Render ───────────────────────────────────────────────────────────────
  const votoColors: Record<string, { bg: string; border: string; text: string; sub: string; glow: string }> = {
    red: { bg: "from-red-950/60 to-red-900/30", border: "border-red-500/50", text: "text-red-300", sub: "text-red-400/60", glow: "shadow-red-900/40" },
    orange: { bg: "from-orange-950/60 to-orange-900/30", border: "border-orange-500/50", text: "text-orange-300", sub: "text-orange-400/60", glow: "shadow-orange-900/40" },
    amber: { bg: "from-amber-950/60 to-amber-900/30", border: "border-amber-500/50", text: "text-amber-300", sub: "text-amber-400/60", glow: "shadow-amber-900/40" },
    yellow: { bg: "from-yellow-950/60 to-yellow-900/30", border: "border-yellow-500/50", text: "text-yellow-300", sub: "text-yellow-400/60", glow: "shadow-yellow-900/40" },
    lime: { bg: "from-lime-950/60 to-lime-900/30", border: "border-lime-500/50", text: "text-lime-300", sub: "text-lime-400/60", glow: "shadow-lime-900/40" },
    emerald: { bg: "from-emerald-950/60 to-emerald-900/30", border: "border-emerald-500/50", text: "text-emerald-300", sub: "text-emerald-400/60", glow: "shadow-emerald-900/40" },
  };
  const vc = votoColors[votoColor];

  return (
    <div className={`bg-gradient-to-br ${vc.bg} border ${vc.border} rounded-3xl overflow-hidden shadow-xl ${vc.glow}`}>

      {/* ═══ HEADER ═══ */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${vc.bg} border ${vc.border} flex items-center justify-center`}>
              {voto >= 7 ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
               voto >= 4 ? <AlertTriangle className="w-5 h-5 text-amber-400" /> :
               <XCircle className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <div className={`text-sm font-black ${vc.text}`}>{votoLabel}</div>
              <div className="text-xs text-slate-500 font-medium">
                {siteName && <span className="text-emerald-400/70">{siteName} · </span>}
                Volo n° {voto}/10
              </div>
            </div>
          </div>
          {/* Finestra di volo badge */}
          <div className="text-right">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Finestra di volo</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-lg font-black text-white">{String(finestraInizio).padStart(2, "0")}:00</span>
              <span className="text-slate-600">→</span>
              <span className="text-lg font-black text-white">{String(finestraFine).padStart(2, "0")}:00</span>
            </div>
            <div className="text-xs text-sky-400 font-bold">{oreFavorevoli}h favorevoli</div>
          </div>
        </div>
      </div>

      {/* ═══ VOTO GIGANTE ═══ */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-end gap-4">
          <div>
            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">VOTO VOLO</div>
            <div className={`text-7xl font-black tabular-nums ${vc.text} leading-none`}>
              {voto}
              <span className="text-2xl text-slate-600 font-bold ml-1">/10</span>
            </div>
          </div>
          <div className="flex-1 mb-2">
            <div className={`text-lg font-black ${vc.text}`}>{votoLabel}</div>
            <div className="text-sm text-slate-400 mt-0.5">
              {voto >= 8 ? "Condizioni ideali per il volo libero" :
               voto >= 6 ? "Condizioni accettabili con cauzione" :
               voto >= 4 ? "Condizioni critiche — solo piloti esperti" :
               "NON DECOLLARE — condizioni pericolose"}
            </div>
          </div>
        </div>
        {/* Barra progresso */}
        <div className="mt-4 h-2 bg-slate-800/80 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              voto >= 8 ? "bg-emerald-500" :
              voto >= 6 ? "bg-lime-500" :
              voto >= 4 ? "bg-amber-500" :
              "bg-red-500"
            }`}
            style={{ width: `${voto * 10}%` }}
          />
        </div>
      </div>

      {/* ═══ GRIGLIA CONDIZIONI ═══ */}
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Vento */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 hover:border-sky-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <Wind className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vento al suolo</div>
              <div className="text-[10px] text-slate-600">Decollo assistito</div>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-black tabular-nums ${ventoMedia > 20 ? "text-red-400" : ventoMedia > 12 ? "text-amber-400" : "text-sky-300"}`}>
              {Math.round(ventoMedia)}
            </span>
            <span className="text-sm text-slate-500 font-semibold">km/h</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-bold text-slate-400">{direzioneVento(current.windDir ?? 180)}°</span>
            <span className="text-xs text-slate-600">·</span>
            <span className={`text-xs font-bold ${ventoMedia > 20 ? "text-red-400" : ventoMedia > 12 ? "text-amber-400" : "text-emerald-400"}`}>
              {ventoTesto(ventoMedia)}
            </span>
          </div>
          {spreadVento > 8 && (
            <div className="mt-2 text-xs text-rose-400 font-semibold">
              🌪️ Raffiche: +{Math.round(spreadVento)} km/h
            </div>
          )}
          <div className="mt-2 text-[10px] text-slate-600">
            {ventoMedia < 5 ? "Calmo — atterraggio dolce" :
             ventoMedia < 12 ? "Ideale per principianti" :
             ventoMedia < 20 ? "Moderato — esperienza consigliata" :
             "Pericoloso — non decollare"}
          </div>
        </div>

        {/* Termiche */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 hover:border-violet-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Termiche</div>
              <div className="text-[10px] text-slate-600">Ascendenza media</div>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-black tabular-nums ${currentThermal.rateo >= 2 ? "text-violet-300" : currentThermal.rateo >= 1 ? "text-sky-300" : "text-slate-400"}`}>
              ↑{currentThermal.rateo.toFixed(1)}
            </span>
            <span className="text-sm text-slate-500 font-semibold">m/s</span>
          </div>
          <div className={`text-xs font-bold mt-1.5 ${currentThermal.rateo >= 2 ? "text-violet-400" : currentThermal.rateo >= 1 ? "text-sky-400" : "text-slate-500"}`}>
            {termicheTesto(currentThermal.rateo)}
          </div>
          {cape > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <Zap className={`w-3 h-3 ${cape > 200 ? "text-amber-400" : "text-slate-500"}`} />
              <span className="text-xs text-slate-500">CAPE: <span className={`font-bold ${cape > 200 ? "text-amber-400" : "text-slate-400"}`}>{Math.round(cape)}</span> J/kg</span>
            </div>
          )}
          <div className="mt-1.5 text-[10px] text-slate-600">
            {currentThermal.rateo >= 2 ? "Ottime per cross-country" :
             currentThermal.rateo >= 1 ? "Buone per voli locali" :
             currentThermal.rateo >= 0.3 ? "Deboli — preferire dynamic" :
             "Assenti — solo dynamic di cresta"}
          </div>
        </div>

        {/* Lifted Index / Stabilità */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 hover:border-rose-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stabilità</div>
              <div className="text-[10px] text-slate-600">Lifted Index</div>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-black tabular-nums ${liftedIndex < -2 ? "text-rose-400" : liftedIndex < 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {liftedIndex > 0 ? "+" : ""}{Math.round(liftedIndex)}
            </span>
            <span className="text-sm text-slate-500 font-semibold">°C</span>
          </div>
          <div className={`text-xs font-bold mt-1.5 ${liftedIndex < -2 ? "text-rose-400" : liftedIndex < 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {liftedIndex < -2 ? "Instabile ⚠️" : liftedIndex < 0 ? "Neutro" : "Stabile ✓"}
          </div>
          <div className="mt-2 text-[10px] text-slate-500 leading-relaxed">
            {liftedIndexTesto(liftedIndex)}
          </div>
        </div>

        {/* Base Cumuli */}
        <div className="bg-slate-900/60 border border-slate-700/40 rounded-2xl p-4 hover:border-sky-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <Mountain className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Base cumuli</div>
              <div className="text-[10px] text-slate-600">Quota inizio nuvole</div>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-black tabular-nums ${baseNuvole > 2500 ? "text-emerald-400" : baseNuvole > 1500 ? "text-sky-400" : "text-amber-400"}`}>
              {baseNuvole > 0 ? Math.round(baseNuvole / 100) * 100 : "--"}
            </span>
            <span className="text-sm text-slate-500 font-semibold">m</span>
          </div>
          <div className="mt-1.5 text-xs font-bold text-slate-400">
            {baseNuvole > 2500 ? "Alta — ottimo plafond 🪂" :
             baseNuvole > 1500 ? "Buona quota" :
             baseNuvole > 800 ? "Bassa — attenzione" :
             "Molto bassa — nebbia probabile"}
          </div>
          <div className="mt-1.5 text-[10px] text-slate-600">
            Spread: {current.temperature != null && current.dewPoint != null ? Math.round(current.temperature - current.dewPoint) : "--"}°C
          </div>
        </div>

      </div>

      {/* ═══ PARAMETRI AGGIUNTIVI ═══ */}
      <div className="px-6 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Umidità */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-400">Umidità</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-sky-300">{current.humidity ?? "--"}</span>
            <span className="text-xs text-slate-500">%</span>
          </div>
          <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500/60 rounded-full" style={{ width: `${current.humidity ?? 0}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-slate-600">
            {(current.humidity ?? 0) > 80 ? "Aria umida — cumuli sviluppati" :
             (current.humidity ?? 0) > 60 ? "Umidità moderata" :
             "Aria secca — termiche stabili"}
          </div>
        </div>

        {/* Visibilità */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-400">Visibilità</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-emerald-300">{current.visibility ? Math.round(current.visibility / 1000) : "--"}</span>
            <span className="text-xs text-slate-500">km</span>
          </div>
          <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${Math.min(100, (current.visibility ?? 10000) / 10000 * 100)}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-slate-600">
            {(current.visibility ?? 10000) > 10000 ? "Ottima — navigazione sicura" :
             (current.visibility ?? 10000) > 5000 ? "Buona visibilità" :
             "Visibilità ridotta — attenzione"}
          </div>
        </div>

        {/* Temperatura */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold text-slate-400">Temperatura</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-rose-300">{Math.round(current.temperature ?? 0)}</span>
            <span className="text-xs text-slate-500">°C</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-600">
            Percepiti: <span className="text-slate-400 font-semibold">{Math.round(current.apparentTemp ?? current.temperature ?? 0)}°C</span>
          </div>
          <div className="mt-0.5 text-[10px] text-slate-600">
            Spread termico: <span className="text-slate-400 font-semibold">{Math.round((current.temperature ?? 0) - (current.dewPoint ?? (current.temperature ?? 18) - 8))}°C</span>
          </div>
        </div>

        {/* Pioggia */}
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <CloudRain className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-400">Pioggia (6h)</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-black ${pioggiaProb > 50 ? "text-rose-400" : pioggiaProb > 20 ? "text-amber-400" : "text-emerald-400"}`}>
              {Math.round(pioggiaProb)}%
            </span>
          </div>
          <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pioggiaProb > 50 ? "bg-rose-500/60" : pioggiaProb > 20 ? "bg-amber-500/60" : "bg-emerald-500/60"}`} style={{ width: `${pioggiaProb}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-slate-600">
            {pioggiaProb > 50 ? "Pioggia probabile — non decollare" :
             pioggiaProb > 20 ? "Possibile pioggia sparsa" :
             "Improbabile — cielo asciutto"}
          </div>
        </div>

      </div>

      {/* ═══ ALERTE ═══ */}
      {alerte.length > 0 && (
        <div className="px-6 pb-4 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">Avvertenze per il pilota ({alerte.length})</span>
          </div>
          {alerte.map((a, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${
              a.tipo === "pericolo" ? "bg-red-950/40 border-red-500/30" :
              a.tipo === "attenzione" ? "bg-amber-950/40 border-amber-500/30" :
              "bg-sky-950/30 border-sky-500/20"
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                a.tipo === "pericolo" ? "bg-red-500/20 text-red-400" :
                a.tipo === "attenzione" ? "bg-amber-500/20 text-amber-400" :
                "bg-sky-500/20 text-sky-400"
              }`}>
                {a.icona}
              </div>
              <span className={`text-sm font-semibold ${
                a.tipo === "pericolo" ? "text-red-300" :
                a.tipo === "attenzione" ? "text-amber-300" :
                "text-sky-300"
              }`}>
                {a.testo}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ DISCLAIMER ═══ */}
      <div className="px-6 pb-4">
        <div className="text-[10px] text-slate-600 text-center py-2 border-t border-white/5">
          ⚠️ Verifica sempre le condizioni sul posto. Questa app è un supporto, non sostituisce il giudizio del pilota.
        </div>
      </div>
    </div>
  );
}
