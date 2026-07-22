"use client";

import React, { useMemo } from "react";
import { ArrowUp, TrendingUp, ThermometerSun, CloudSun, Calendar, MapPin } from "lucide-react";
import GraficoTermicoPro from "@/components/GraficoTermicoPro";
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

function calcolaTermicheSicure(h: any, alt: number) {
  const spread = Math.max(0.3, Math.min(20, h.temperature - h.dewPoint));
  const windSpeed = h.windSpeed ?? 0;
  const cloudCover = h.cloudCover ?? 30;
  const precipitation = h.precipitation ?? 0;

  const baseSopraSuolo = Math.round(Math.min(2000, Math.max(50, spread * 120)));
  const base = alt + baseSopraSuolo;

  let rateoSpread = Math.min(2.5, spread * 0.2);
  let bonusVento = 0;
  if (windSpeed >= 5 && windSpeed <= 15) bonusVento = Math.min(1, windSpeed / 15);
  else if (windSpeed >= 3 && windSpeed < 5) bonusVento = 0.3;

  let bonusNuvole = 0;
  if (cloudCover >= 15 && cloudCover <= 40) bonusNuvole = 0.5;
  else if (cloudCover >= 5 && cloudCover < 15) bonusNuvole = 0.3;
  else if (cloudCover > 40 && cloudCover <= 55) bonusNuvole = 0.2;

  let penalita = 1;
  if (precipitation > 2) penalita = 0;
  else if (precipitation > 1) penalita = 0.2;
  else if (precipitation > 0.3) penalita = 0.5;
  if (windSpeed > 25) penalita *= 0.3;
  else if (windSpeed > 20) penalita *= 0.6;

  const rateo = Math.max(0, Math.min(5, Math.round((rateoSpread + bonusVento + bonusNuvole) * penalita * 10) / 10));
  const top = Math.min(4000, Math.max(base + 200, base + Math.round(rateo * 400)));

  return { ora: new Date(h.time).getHours(), rateo, base, top };
}

export default function TermicheTab({ dayData, site }: TermicheTabProps) {
  const alt = site?.alt ?? 1000;

  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) return formatDateShort(new Date(dayData[0].time));
    return formatDateShort(new Date());
  }, [dayData]);

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

      {/* Grafico termico Pro */}
      <GraficoTermicoPro data={termicheAquilaData.length > 0 ? termicheAquilaData : [
        { hour: "08", speed: 0.8, base: 1800, top: 2100 },
        { hour: "09", speed: 0.9, base: 1850, top: 2150 },
        { hour: "10", speed: 1.0, base: 1900, top: 2200 },
        { hour: "11", speed: 1.2, base: 2000, top: 2300 },
        { hour: "12", speed: 1.2, base: 2040, top: 2520 },
        { hour: "13", speed: 1.3, base: 2130, top: 2650 },
        { hour: "14", speed: 1.3, base: 2180, top: 2700 },
        { hour: "15", speed: 1.4, base: 2240, top: 2750 },
        { hour: "16", speed: 1.5, base: 2300, top: 2800 },
        { hour: "17", speed: 1.1, base: 2200, top: 2600 },
        { hour: "18", speed: 1.0, base: 2100, top: 2500 },
        { hour: "19", speed: 0.9, base: 2000, top: 2400 },
      ]} />

      {/* Nota */}
      <div className="text-center text-[10px] text-slate-600 border-t border-slate-700/30 pt-2 mt-2">
        Valori realistici per Alpi · Rateo max ~4-5 m/s in condizioni estreme
      </div>
    </div>
  );
}