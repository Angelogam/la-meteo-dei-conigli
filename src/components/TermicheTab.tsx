"use client";

import React, { useMemo, useState } from "react";
import { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import {
  Thermometer, Wind, Cloud, Droplets, TrendingUp, ArrowUp,
  Flame, Activity, Sparkles, Info
} from "lucide-react";

interface TermicheTabProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat: number; lon: number; name: string };
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export default function TermicheTab({ dayData, site }: TermicheTabProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const oreConDati = useMemo(() => {
    return HOURS
      .map(ora => {
        const h = dayData.find(d => new Date(d.time).getHours() === ora);
        if (!h) return null;
        const t = calcolaTermiche(h, site.alt);
        return {
          ora, rateo: t.rateo, base: t.base, top: t.top,
          forza: t.forza, attendibilita: t.attendibilita,
          temp: h.temperature, vento: h.windSpeed, nuvole: h.cloudCover, umidita: h.humidity,
        };
      })
      .filter(Boolean) as any[];
  }, [dayData, site.alt]);

  const maxRateo = useMemo(() => Math.max(...oreConDati.map(o => o!.rateo), 0.1), [oreConDati]);
  const mediaRateo = useMemo(() => {
    const vals = oreConDati.map(o => o!.rateo);
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [oreConDati]);
  const oreAttive = useMemo(() => oreConDati.filter(o => o!.rateo >= 0.5).length, [oreConDati]);

  const selectedDetail = useMemo(() => {
    if (selectedHour == null) return null;
    return oreConDati.find(o => o!.ora === selectedHour) || null;
  }, [selectedHour, oreConDati]);

  if (oreConDati.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Flame className="w-12 h-12 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato termico per {site.name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con nome decollo */}
      <div className="bg-gradient-to-br from-orange-900/40 to-amber-800/20 border border-orange-500/30 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-800/60 to-amber-700/30 border border-orange-500/40 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="text-base font-bold text-white">{site.name} — Termiche</div>
            <div className="text-[10px] text-slate-400">{site.alt}m slm · {oreConDati.length} ore di volo</div>
          </div>
        </div>

        {/* Statistiche rapide */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900/60 rounded-xl p-3 text-center">
            <Activity className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-orange-300">{mediaRateo.toFixed(1)}</div>
            <div className="text-[10px] text-slate-500">Media m/s</div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 text-center">
            <ArrowUp className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-amber-300">
              {oreConDati.reduce((max, o) => o!.rateo > max ? o!.rateo : max, 0).toFixed(1)}
            </div>
            <div className="text-[10px] text-slate-500">Picco m/s</div>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 text-center">
            <Sparkles className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-emerald-300">{oreAttive}/{oreConDati.length}</div>
            <div className="text-[10px] text-slate-500">Ore attive</div>
          </div>
        </div>
      </div>

      {/* Grafico a barre interattivo */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/30 border border-slate-700/40 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            Intensità termica oraria
          </h4>
          <span className="text-[10px] text-slate-500">m/s</span>
        </div>

        <div className="flex items-end gap-1.5 h-40 pb-1">
          {oreConDati.map((d: any) => {
            const pct = maxRateo > 0 ? (d.rateo / maxRateo) * 100 : 0;
            const isSelected = d.ora === selectedHour;

            return (
              <button
                key={d.ora}
                onClick={() => setSelectedHour(d.ora === selectedHour ? null : d.ora)}
                className={`flex flex-col items-center flex-1 min-w-0 transition-all duration-200 ${
                  isSelected ? "scale-110 z-10" : "hover:scale-105"
                }`}
              >
                <span className={`text-[9px] font-bold leading-none mb-1 transition-colors ${
                  d.rateo >= 3 ? "text-red-300" :
                  d.rateo >= 2 ? "text-orange-300" :
                  d.rateo >= 1 ? "text-amber-300" :
                  d.rateo >= 0.3 ? "text-lime-300" :
                  "text-slate-600"
                }`}>
                  {d.rateo.toFixed(1)}
                </span>

                <div className="w-full h-28 bg-slate-800/60 rounded-lg relative overflow-hidden">
                  <div
                    className={`absolute bottom-0 left-0 right-0 rounded-t transition-all duration-300 ${
                      d.rateo >= 3 ? "bg-gradient-to-t from-red-500 to-red-600" :
                      d.rateo >= 2 ? "bg-gradient-to-t from-orange-500 to-orange-600" :
                      d.rateo >= 1 ? "bg-gradient-to-t from-amber-500 to-amber-600" :
                      d.rateo >= 0.3 ? "bg-gradient-to-t from-lime-500 to-lime-600" :
                      "bg-slate-700"
                    } ${isSelected ? "ring-2 ring-white/30" : ""}`}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  >
                    {isSelected && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg shadow-white/50" />
                    )}
                  </div>
                </div>

                <span className={`text-[9px] mt-1 font-mono ${
                  isSelected ? "text-orange-300 font-bold" : d.rateo > 0 ? "text-slate-400" : "text-slate-600"
                }`}>
                  {String(d.ora).padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-700/30">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> ≥3 — Forti
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> 2-3 — Buone
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 1-2 — Mod.
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-lime-500" /> 0.3-1 — Deboli
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" /> {'<'}0.3 — Nulla
          </span>
        </div>
      </div>

      {/* Dettaglio ora selezionata */}
      {selectedDetail && (
        <div className="bg-gradient-to-br from-orange-900/30 to-amber-800/15 border border-orange-500/20 rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-800/40 border border-orange-400/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {String(selectedDetail.ora).padStart(2, "0")}:00
              </div>
              <div className="text-[10px] text-slate-500">Dettaglio orario</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block">Termiche</span>
              <span className="text-xl font-bold text-orange-300">{selectedDetail.rateo.toFixed(1)} m/s</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block">Base</span>
              <span className="text-xl font-bold text-emerald-300">{selectedDetail.base}m</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block">Top</span>
              <span className="text-xl font-bold text-sky-300">{selectedDetail.top}m</span>
            </div>
            <div className="bg-slate-900/60 rounded-xl p-3 text-center">
              <span className="text-[10px] text-slate-500 block">Salita</span>
              <span className="text-xl font-bold text-purple-300">{selectedDetail.top - selectedDetail.base}m</span>
            </div>
          </div>

          <div className="bg-slate-900/40 rounded-xl p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">Temp:</span>
                <span className="font-bold text-amber-300">{Math.round(selectedDetail.temp)}°C</span>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-400">Vento:</span>
                <span className="font-bold text-sky-300">{Math.round(selectedDetail.vento)} km/h</span>
              </div>
              <div className="flex items-center gap-2">
                <Cloud className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Nuvole:</span>
                <span className="font-bold text-slate-300">{Math.round(selectedDetail.nuvole)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-400">Umidità:</span>
                <span className="font-bold text-blue-300">{Math.round(selectedDetail.umidita)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info legenda */}
      <div className="flex items-start gap-2 bg-slate-800/30 border border-slate-700/30 rounded-xl px-4 py-3">
        <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Le termiche sono calcolate combinando temperatura, punto di rugiada, vento, nuvolosità e ora del giorno.
          I valori rappresentano la velocità di salita in m/s. Clicca su una barra per vedere il dettaglio.
        </p>
      </div>
    </div>
  );
}