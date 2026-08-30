"use client";

import React, { useMemo } from "react";
import { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import { Thermometer, Wind, Cloud, Droplets, Sun, TrendingUp, AlertTriangle, MapPin } from "lucide-react";
import SkewTDiagram from "@/components/SkewTDiagram";

interface TermicheTabProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat: number; lon: number; name: string };
}

export default function TermicheTab({ dayData, site }: TermicheTabProps) {
  const oreConDati = useMemo(() => {
    const ore = Array.from({ length: 14 }, (_, i) => i + 8);
    return ore
      .map(ora => {
        const h = dayData.find(d => new Date(d.time).getHours() === ora);
        if (!h) return null;
        const t = calcolaTermiche(h, site.alt);
        return { ora: `${String(ora).padStart(2, "0")}:00`, rateo: t.rateo, base: t.base, top: t.top, forza: t.forza, attendibilita: t.attendibilita, temp: h.temperature, vento: h.windSpeed, nuvole: h.cloudCover, umidita: h.humidity };
      })
      .filter(Boolean);
  }, [dayData, site.alt]);

  const maxRateo = useMemo(() => Math.max(...oreConDati.map(o => o!.rateo), 0.1), [oreConDati]);
  const mediaRateo = useMemo(() => {
    const vals = oreConDati.map(o => o!.rateo);
    return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }, [oreConDati]);

  if (oreConDati.length === 0) {
    return (
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400">Nessun dato termico disponibile per oggi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{site.name}</div>
          <div className="text-[10px] text-slate-400">{site.alt}m · Dati Open-Meteo</div>
        </div>
      </div>

      <SkewTDiagram
        latitude={site.lat}
        longitude={site.lon}
        siteAltitude={site.alt}
        siteName={site.name}
        selectedHour={12}
        selectedDay={0}
      />

      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-orange-400" />
          Previsione termiche — {site.name}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Media termiche</p>
            <p className="text-xl font-bold text-orange-400">{mediaRateo.toFixed(1)} m/s</p>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Picco massimo</p>
            <p className="text-xl font-bold text-amber-300">{maxRateo.toFixed(1)} m/s</p>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Ore attive</p>
            <p className="text-xl font-bold text-emerald-400">{oreConDati.filter(o => o!.rateo >= 0.5).length}</p>
          </div>
          <div className="bg-slate-900/60 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Giudizio</p>
            <p className="text-xl font-bold" style={{ color: mediaRateo >= 1.0 ? "#34d399" : mediaRateo >= 0.5 ? "#fbbf24" : "#f87171" }}>
              {mediaRateo >= 1.0 ? "Ottimo" : mediaRateo >= 0.5 ? "Discreto" : "Debole"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700/30">
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-bold text-slate-200">Dettaglio orario termiche</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/30 text-slate-500">
                <th className="p-3 text-left">Ora</th>
                <th className="p-3 text-left">Rateo</th>
                <th className="p-3 text-left">Base</th>
                <th className="p-3 text-left">Top</th>
                <th className="p-3 text-left">Temp</th>
                <th className="p-3 text-left">Vento</th>
                <th className="p-3 text-left">Nuvole</th>
                <th className="p-3 text-left">Umidità</th>
              </tr>
            </thead>
            <tbody>
              {oreConDati.map((r) => r && (
                <tr key={r.ora} className="border-b border-slate-700/20 hover:bg-slate-700/30 transition-colors">
                  <td className="p-3 font-bold text-white">{r.ora}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (r.rateo / 4.5) * 100)}%`,
                            backgroundColor: r.rateo >= 1.5 ? "#34d399" : r.rateo >= 0.5 ? "#fbbf24" : "#f87171",
                          }}
                        />
                      </div>
                      <span className="font-bold text-orange-300 tabular-nums">{r.rateo.toFixed(1)} m/s</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-300">{r.base} m</td>
                  <td className="p-3 text-sky-300">{r.top} m</td>
                  <td className="p-3 text-amber-300">{Math.round(r.temp)}°C</td>
                  <td className="p-3 text-sky-300">
                    <Wind className="w-3 h-3 inline mr-1" />
                    {Math.round(r.vento)} km/h
                  </td>
                  <td className="p-3 text-slate-300">
                    <Cloud className="w-3 h-3 inline mr-1" />
                    {Math.round(r.nuvole)}%
                  </td>
                  <td className="p-3 text-blue-300">
                    <Droplets className="w-3 h-3 inline mr-1" />
                    {Math.round(r.umidita)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}