"use client";

import React, { useMemo } from "react";
import { ArrowUp, TrendingUp, ThermometerSun, CloudSun, Calendar, Sparkles, Activity, MapPin } from "lucide-react";
import { analisiAvanzataCompleta } from "@/services/analisiAvanzata";
import AnalisiAvanzataCard from "@/components/AnalisiAvanzataCard";
import TermicheAquila from "@/components/TermicheAquila";
import type { MeteoHourly, MeteoCurrent } from "@/services/weatherService";

interface TermicheTabProps {
  currentData: any;
  dayData: any[];
  site?: { alt: number; lat?: number; lon?: number; name?: string };
  hourlyData?: MeteoHourly[];
  current?: MeteoCurrent;
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * Calcolo termiche FALLBACK con limiti FISICI:
 * - Rateo MAX 5 m/s (già estremo per Alpi)
 * - Base MAX alt + 2000m
 * - Top MAX 4000m
 * - Spread e vento non possono da soli produrre rateo > 3 m/s
 */
function calcolaTermicheSicure(h: any, alt: number) {
  const spread = Math.max(0.3, Math.min(20, h.temperature - h.dewPoint));
  const windSpeed = h.windSpeed ?? 0;
  const cloudCover = h.cloudCover ?? 30;
  const precipitation = h.precipitation ?? 0;

  // Base termica (LCL) — limitata
  const baseSopraSuolo = Math.round(Math.min(2000, Math.max(50, spread * 120)));
  const base = alt + baseSopraSuolo;

  // Fattore spread (max 2.5 m/s da solo)
  let rateoSpread = Math.min(2.5, spread * 0.2);

  // Fattore vento (max +1 m/s)
  let bonusVento = 0;
  if (windSpeed >= 5 && windSpeed <= 15) bonusVento = Math.min(1, windSpeed / 15);
  else if (windSpeed >= 3 && windSpeed < 5) bonusVento = 0.3;

  // Fattore nuvole (max +0.5 m/s)
  let bonusNuvole = 0;
  if (cloudCover >= 15 && cloudCover <= 40) bonusNuvole = 0.5;
  else if (cloudCover >= 5 && cloudCover < 15) bonusNuvole = 0.3;
  else if (cloudCover > 40 && cloudCover <= 55) bonusNuvole = 0.2;

  // Penalità per pioggia
  let penalita = 1;
  if (precipitation > 2) penalita = 0;
  else if (precipitation > 1) penalita = 0.2;
  else if (precipitation > 0.3) penalita = 0.5;

  // Vento forte penalizza
  if (windSpeed > 25) penalita *= 0.3;
  else if (windSpeed > 20) penalita *= 0.6;

  // Calcolo rateo finale (MAX 5 m/s)
  const rateo = Math.max(0, Math.min(5, Math.round((rateoSpread + bonusVento + bonusNuvole) * penalita * 10) / 10));

  // Top — basato su rateo e base, limitato a 4000m
  const top = Math.min(4000, Math.max(base + 200, base + Math.round(rateo * 400)));

  // Label e colore
  let label: string;
  if (rateo >= 4) { label = "Forti"; }
  else if (rateo >= 3) { label = "Buone"; }
  else if (rateo >= 2) { label = "Moderate"; }
  else if (rateo >= 1) { label = "Deboli"; }
  else if (rateo >= 0.3) { label = "M. deboli"; }
  else { label = "Assenti"; }

  return { ora: new Date(h.time).getHours(), rateo, base, top, label };
}

export default function TermicheTab({ currentData, dayData, site, hourlyData, current }: TermicheTabProps) {
  const alt = site?.alt ?? 1000;

  const analisiAvanzata = useMemo(() => {
    if (hourlyData && hourlyData.length > 0 && current) {
      return analisiAvanzataCompleta(hourlyData, current, alt);
    }
    return null;
  }, [hourlyData, current, alt]);

  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) return formatDateShort(new Date(dayData[0].time));
    return formatDateShort(new Date());
  }, [dayData]);

  if (analisiAvanzata && analisiAvanzata.length > 0) {
    // Usa analisiAvanzata — valori già limitati nel motore
    const mediaRateo = analisiAvanzata.reduce((s, a) => s + a.rateoSalita, 0) / analisiAvanzata.length;
    const maxRateo = Math.max(...analisiAvanzata.map(a => a.rateoSalita));
    const oreAttive = analisiAvanzata.filter(a => a.rateoSalita >= 0.3).length;
    const mediaForza = analisiAvanzata.reduce((s, a) => s + a.forzaTermica, 0) / analisiAvanzata.length;
    const mediaConfidenza = analisiAvanzata.reduce((s, a) => s + a.confidenza, 0) / analisiAvanzata.length;

    return (
      <div className="space-y-4">
        <div className="bg-slate-800/60 border border-orange-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-orange-400 shrink-0" />
          <div>
            <div className="text-sm font-bold text-white">{site?.name || "Decollo"} — Termiche</div>
            <div className="text-[10px] text-slate-400 flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              <span>{dataGiorno}</span>
              <span className="text-slate-600">·</span>
              <span>{alt}m</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-orange-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-bold text-orange-300">Analisi termica — {site?.name}</h3>
            <span className="text-xs text-slate-500 ml-auto bg-slate-800/60 px-2 py-0.5 rounded-full">
              <Activity className="w-3 h-3 inline mr-1" />
              Confidenza {Math.round(mediaConfidenza * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-amber-300">{Math.min(5, mediaRateo).toFixed(1)}</div>
              <div className="text-xs text-slate-400">Media m/s</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <ArrowUp className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-orange-300">{Math.min(5, maxRateo).toFixed(1)}</div>
              <div className="text-xs text-slate-400">Picco m/s</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <Activity className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-300">{oreAttive}</div>
              <div className="text-xs text-slate-400">Ore attive</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <ThermometerSun className="w-5 h-5 text-sky-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-sky-300">{Math.min(10, mediaForza).toFixed(1)}</div>
              <div className="text-xs text-slate-400">Forza /10</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-slate-300 px-1">{site?.name} — Dettaglio orario termiche</h4>
          {analisiAvanzata.map((a) => (
            <AnalisiAvanzataCard key={a.ora} analisi={{
              ...a,
              rateoSalita: Math.min(5, a.rateoSalita),
              forzaTermica: Math.min(10, a.forzaTermica),
              baseNuvole: Math.min(3500, a.baseNuvole),
              topTermico: Math.min(4500, a.topTermico),
            }} />
          ))}
        </div>

        <div className="text-center text-xs text-slate-600 border-t border-slate-700/30 pt-3">
          {site?.name} · {analisiAvanzata.length} ore analizzate
        </div>
      </div>
    );
  }

  // FALLBACK — usa calcolaTermicheSicure con limiti fisici REALI (0-5 m/s)
  const termichePerOra = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    return dayData
      .filter((h: any) => {
        if (!h.time) return false;
        const hh = new Date(h.time).getHours();
        return hh >= 8 && hh <= 19;
      })
      .map((h: any) => calcolaTermicheSicure(h, alt))
      .filter(t => t.rateo >= 0)
      .sort((a, b) => a.ora - b.ora);
  }, [dayData, alt]);

  // Se non ci sono dati, mostra messaggio
  if (termichePerOra.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm">
        <CloudSun className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="font-bold text-slate-400 mb-1">Nessun dato termico disponibile</p>
        <p className="text-xs">Attendi il caricamento dei dati meteo</p>
      </div>
    );
  }

  const mediaSalita = termichePerOra.reduce((s, t) => s + t.rateo, 0) / termichePerOra.length;
  const maxSalita = Math.max(...termichePerOra.map(t => t.rateo));
  const oreAttive = termichePerOra.filter(t => t.rateo >= 0.3).length;

  const termicheAquilaData = termichePerOra.map(t => ({
    hour: `${String(t.ora).padStart(2, "0")}:00`,
    speed: t.rateo,
    base: t.base,
    top: t.top,
  }));

  return (
    <div className="space-y-4">
      {/* Intestazione */}
      <div className="bg-slate-800/60 border border-orange-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-orange-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{site?.name || "Decollo"} — Termiche</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{dataGiorno}</span>
            <span className="text-slate-600">·</span>
            <span>{alt}m</span>
          </div>
        </div>
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <TrendingUp className="w-6 h-6 text-amber-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-amber-300">{mediaSalita.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Media m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <ArrowUp className="w-6 h-6 text-orange-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-orange-300">{maxSalita.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Picco m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <ThermometerSun className="w-6 h-6 text-orange-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-orange-300">{oreAttive}</div>
          <div className="text-sm text-slate-400">Ore attive</div>
        </div>
      </div>

      {/* Card a colonna con aquila e nuvole - sostituisce le vecchie card */}
      <TermicheAquila data={termicheAquilaData} />

      {/* Nota range realistico */}
      <div className="text-center text-[10px] text-slate-600 border-t border-slate-700/30 pt-2 mt-2">
        Valori realistici per Alpi · Rateo max ~4-5 m/s in condizioni estreme
      </div>
    </div>
  );
}