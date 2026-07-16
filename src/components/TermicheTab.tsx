"use client";

import React, { useMemo } from "react";
import { ArrowUp, TrendingUp, ThermometerSun, CloudSun, Calendar, Sparkles, Activity } from "lucide-react";
import { analisiAvanzataCompleta } from "@/services/analisiAvanzata";
import AnalisiAvanzataCard from "@/components/AnalisiAvanzataCard";
import type { MeteoHourly, MeteoCurrent } from "@/services/weatherService";

interface TermicheTabProps {
  currentData: any;
  dayData: any[];
  site?: { alt: number; lat?: number; lon?: number };
  hourlyData?: MeteoHourly[];
  current?: MeteoCurrent;
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function TermicheTab({ currentData, dayData, site, hourlyData, current }: TermicheTabProps) {
  const alt = site?.alt ?? 1000;

  // Usa l'analisi avanzata se i dati sono disponibili
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
    const mediaRateo = analisiAvanzata.reduce((s, a) => s + a.rateoSalita, 0) / analisiAvanzata.length;
    const maxRateo = Math.max(...analisiAvanzata.map(a => a.rateoSalita));
    const oreAttive = analisiAvanzata.filter(a => a.rateoSalita >= 0.3).length;
    const mediaForza = analisiAvanzata.reduce((s, a) => s + a.forzaTermica, 0) / analisiAvanzata.length;
    const mediaConfidenza = analisiAvanzata.reduce((s, a) => s + a.confidenza, 0) / analisiAvanzata.length;

    return (
      <div className="space-y-4">
        {/* Data */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-slate-800/60 border border-slate-600/50 px-4 py-1.5 rounded-lg">
            <Calendar className="w-4 h-4 text-slate-400" />{dataGiorno}
          </span>
        </div>

        {/* Riepilogo */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-orange-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-bold text-orange-300">Analisi termica avanzata</h3>
            <span className="text-xs text-slate-500 ml-auto bg-slate-800/60 px-2 py-0.5 rounded-full">
              <Activity className="w-3 h-3 inline mr-1" />
              Confidenza {Math.round(mediaConfidenza * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-amber-300">{mediaRateo.toFixed(1)}</div>
              <div className="text-xs text-slate-400">Media m/s</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <ArrowUp className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-orange-300">{maxRateo.toFixed(1)}</div>
              <div className="text-xs text-slate-400">Picco m/s</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <Activity className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-300">{oreAttive}</div>
              <div className="text-xs text-slate-400">Ore attive</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-3 text-center">
              <ThermometerSun className="w-5 h-5 text-sky-400 mx-auto mb-1" />
              <div className="text-2xl font-bold text-sky-300">{mediaForza.toFixed(1)}</div>
              <div className="text-xs text-slate-400">Forza /10</div>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Analisi basata su {analisiAvanzata.length} ore di dati · 
            Gradiente reale: {analisiAvanzata.map(a => a.gradienteReale).reduce((s, v) => s + v, 0) / analisiAvanzata.length}°C/100m · 
            CAPE medio: {Math.round(analisiAvanzata.reduce((s, a) => s + a.cape, 0) / analisiAvanzata.length)} J/kg
          </p>
        </div>

        {/* Card orarie con analisi avanzata */}
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-slate-300 px-1">Dettaglio orario con analisi fisica</h4>
          {analisiAvanzata.map((a) => (
            <AnalisiAvanzataCard
              key={a.ora}
              analisi={a}
            />
          ))}
        </div>

        <div className="text-center text-xs text-slate-600 border-t border-slate-700/30 pt-3">
          Ogni ora viene analizzata con {Math.round(mediaConfidenza * 100)}% di confidenza · {analisiAvanzata.length} ore analizzate
        </div>
      </div>
    );
  }

  // Fallback: calcolo termiche semplice
  const termichePerOra = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    return dayData
      .filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 8 && hh <= 19; })
      .map((h: any) => {
        const spread = h.temperature - h.dewPoint;
        const base = Math.max(200, Math.min(3000, alt + Math.round(spread * 125)));
        let gradiente = 0.98;
        if (h.temp80m != null) gradiente = ((h.temperature - h.temp80m) / 78) * 100;
        else if (h.temp120m != null) gradiente = ((h.temperature - h.temp120m) / 118) * 100;
        let forza = 0;
        if (gradiente > 1.2) forza += 3; else if (gradiente > 0.98) forza += 2; else if (gradiente > 0.7) forza += 1;
        if (h.windSpeed >= 5 && h.windSpeed <= 15) forza += 2;
        if (h.cloudCover >= 15 && h.cloudCover <= 45) forza += 2;
        if (h.humidity >= 30 && h.humidity <= 50) forza += 1.5;
        if (h.precipitation > 1) forza = 0;
        forza = Math.max(0, Math.min(10, Math.round(forza * 10) / 10));
        let rateo = (forza / 10) * 4;
        if (h.precipitation > 1) rateo = 0;
        rateo = Math.max(0.05, Math.round(rateo * 10) / 10);
        const top = Math.min(5000, base + Math.round(forza * 250));
        let label = "Assenti";
        let colore = "#475569";
        if (rateo >= 4) { label = "Forti"; colore = "#ef4444"; }
        else if (rateo >= 3) { label = "Buone"; colore = "#f97316"; }
        else if (rateo >= 2) { label = "Moderate"; colore = "#eab308"; }
        else if (rateo >= 1) { label = "Deboli"; colore = "#84cc16"; }
        else if (rateo >= 0.3) { label = "M. deboli"; colore = "#6b7280"; }
        return { ora: new Date(h.time).getHours(), rateo, forza, base, top, label, colore, gradiente: Math.round(gradiente * 100) / 100 };
      })
      .sort((a, b) => a.ora - b.ora);
  }, [dayData, alt]);

  const mediaSalita = termichePerOra.reduce((s, t) => s + t.rateo, 0) / termichePerOra.length;
  const maxSalita = Math.max(...termichePerOra.map(t => t.rateo));
  const oreAttive = termichePerOra.filter(t => t.rateo >= 0.3).length;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-slate-800/60 border border-slate-600/50 px-4 py-1.5 rounded-lg">
          <Calendar className="w-4 h-4 text-slate-400" />{dataGiorno}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <TrendingUp className="w-6 h-6 text-amber-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-amber-300">{mediaSalita.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Media m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <ArrowUp className="w-6 h-6 text-green-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-green-300">{maxSalita.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Picco m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <ThermometerSun className="w-6 h-6 text-orange-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-orange-300">{oreAttive}</div>
          <div className="text-sm text-slate-400">Ore attive</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {termichePerOra.map((t) => (
          <div key={t.ora} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-base font-bold text-slate-200 mb-1">{String(t.ora).padStart(2, "0")}:00</div>
            <div className="text-xl font-bold" style={{ color: t.colore }}>{t.rateo.toFixed(1)} m/s</div>
            <div className="text-sm text-slate-400">{t.label}</div>
            <div className="text-sm text-green-300 mt-1">Base {t.base}m</div>
            <div className="text-sm text-red-300">Top {t.top}m</div>
            <div className="text-xs text-slate-500 mt-1">Grad {t.gradiente}°</div>
          </div>
        ))}
      </div>
    </div>
  );
}