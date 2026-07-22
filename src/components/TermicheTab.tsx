"use client";

import React, { useMemo } from "react";
import { ArrowUp, TrendingUp, ThermometerSun, CloudSun, Calendar, MapPin, Clock } from "lucide-react";
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

function getCurrentTime(): string {
  return new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
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
  const oraCorrente = getCurrentTime();

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

  const mediaSalita = useMemo(() => {
    if (termichePerOra.length === 0) return 0;
    return termichePerOra.reduce((s, t) => s + t.rateo, 0) / termichePerOra.length;
  }, [termichePerOra]);

  const maxSalita = useMemo(() => {
    if (termichePerOra.length === 0) return 0;
    return Math.max(...termichePerOra.map(t => t.rateo));
  }, [termichePerOra]);

  const oreAttive = useMemo(() => {
    return termichePerOra.filter(t => t.rateo >= 0.3).length;
  }, [termichePerOra]);

  if (termichePerOra.length === 0 && !site) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm">
        <CloudSun className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="font-bold text-slate-400 mb-1">Nessun dato termico disponibile</p>
        <p className="text-xs">Aggiornamento: {oraCorrente}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center bg-slate-800/60 border border-orange-500/30 rounded-xl px-4 py-3">
        <div className="text-base font-bold text-white">{site?.name || "Decollo"} — Termiche</div>
        <div className="text-[10px] text-slate-500 flex items-center justify-center gap-2 mt-1">
          <Calendar className="w-3 h-3" />
          <span>{dataGiorno}</span>
          <span className="text-slate-600">·</span>
          <Clock className="w-3 h-3" />
          <span>{oraCorrente}</span>
          <span className="text-slate-600">·</span>
          <MapPin className="w-3 h-3" />
          <span>{alt}m</span>
        </div>
      </div>

      {/* Griglia metriche centrata */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <TrendingUp className="w-6 h-6 text-amber-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Media</div>
          <div className="text-xl font-bold text-amber-300">{mediaSalita.toFixed(1)} m/s</div>
          <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
        </div>
        <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <ArrowUp className="w-6 h-6 text-orange-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Picco</div>
          <div className="text-xl font-bold text-orange-300">{maxSalita.toFixed(1)} m/s</div>
          <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
        </div>
        <div className="card-center bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <ThermometerSun className="w-6 h-6 text-orange-400 mx-auto mb-1" />
          <div className="text-xs text-slate-400">Attive</div>
          <div className="text-xl font-bold text-orange-300">{oreAttive}</div>
          <div className="text-xs text-slate-500">ore</div>
          <div className="card-datetime">{dataGiorno} · {oraCorrente}</div>
        </div>
      </div>

      {/* Tabella oraria centrata */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
        <div className="text-xs text-slate-400 text-center mb-3 font-bold uppercase tracking-wider">
          Andamento orario termiche
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {termichePerOra.map((t, idx) => {
            const rateoColor = t.rateo >= 2 ? "bg-orange-500" : t.rateo >= 1 ? "bg-amber-500" : t.rateo >= 0.3 ? "bg-yellow-500" : "bg-slate-600";
            return (
              <div key={idx} className="card-center bg-slate-800/60 rounded-lg p-2 min-w-[70px]">
                <div className="text-xs font-bold text-white">{String(t.ora).padStart(2, "0")}:00</div>
                <div className={`text-sm font-bold mt-1 ${rateoColor.replace("bg-", "text-")}`}>
                  {t.rateo.toFixed(1)}
                </div>
                <div className="text-[9px] text-slate-500">m/s</div>
                <div className="card-datetime">{dataGiorno}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data e ora */}
      <div className="text-center text-[10px] text-slate-600 border-t border-slate-700/30 pt-2">
        {site?.name} · Ultimo aggiornamento: {oraCorrente}
      </div>
    </div>
  );
}