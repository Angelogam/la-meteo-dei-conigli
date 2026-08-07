"use client";

import React, { useState } from "react";
import { Mountain, Calendar, MapPin, Sun } from "lucide-react";
import { TAKEOFFS, BASE_HOURLY_DATA } from "@/data/takeoffS<dyad-write path="src/components/FlightMeteoDashboard.tsx" description="Completamento della dashboard FlightMeteo con selezione decollo e griglia oraria">
"use client";

import React, { useState } from "react";
import { Mountain, Calendar, MapPin, Sun } from "lucide-react";
import { TAKEOFFS, BASE_HOURLY_DATA, type TakeoffSite, type HourlyMeteoData } from "@/data/takeoffSites";

export default function FlightMeteoDashboard(): React.JSX.Element {
  const [selectedTakeoff, setSelectedTakeoff] = useState<TakeoffSite>(TAKEOFFS[0]);
  const [selectedDate, setSelectedDate] = useState<string>("2026-08-08");

  const dynamicHourlyData: HourlyMeteoData[] = BASE_HOURLY_DATA.map((item) => {
    const altOffset = Math.round((selectedTakeoff.alt - 1088) * 0.4);
    return {
      ...item,
      alt: Math.max(item.alt + altOffset, selectedTakeoff.alt + 300),
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 font-sans">
      <header className="max-w-7xl mx-auto mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-cyan-400">
            <Mountain className="w-6 h-6" /> Alpium Paragliding Meteo Engine
          </h1>
          <p className="text-sm text-slate-400">Diagnostica termica e profilo di volo per i 24 decolli piemontesi</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm focus:outline-none text-slate-200 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <select
              value={selectedTakeoff.id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const found = TAKEOFFS.find((t) => t.id === e.target.value);
                if (found) setSelectedTakeoff(found);
              }}
              className="bg-transparent text-sm focus:outline-none text-slate-200 cursor-pointer"
            >
              {TAKEOFFS.map((site) => (
                <option key={site.id} value={site.id} className="bg-slate-900 text-slate-200">
                  {site.name} ({site.alt}m)
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Quota Decollo</span>
          <div className="text-xl font-bold text-cyan-400">{selectedTakeoff.alt} m MSL</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Esposizione</span>
          <div className="text-xl font-bold text-amber-400">{selectedTakeoff.orientation}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Zero Termico</span>
          <div className="text-xl font-bold text-rose-400">4519 m</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Picco Ascendenza</span>
          <div className="text-xl font-bold text-emerald-400">+1.8 m/s (13:00)</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-200">{selectedTakeoff.name} · {selectedDate}</h2>
            <p className="text-xs text-slate-400">Modello ground: {selectedTakeoff.alt}m · AROME / ICON-EU via Open-Meteo</p>
          </div>
          <div className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-3 py-1 rounded-full font-medium">
            Condizioni di Volo Attive
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px] grid grid-cols-11 gap-2 bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 text-center">
            {dynamicHourlyData.map((h, idx) => (
              <div key={idx} className="flex flex-col justify-between bg-slate-900/90 border border-slate-800 rounded-lg p-2 hover:border-cyan-500 transition-all">
                <div className="text-xs font-bold text-rose-400">{h.lift} m/s</div>
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-0.5">
                  <Sun className="w-2.5 h-2.5 text-amber-400" /> {h.sun}%
                </div>

                <div className="my-3 py-2 border-y border-slate-800/60 bg-gradient-to-b from-indigo-950/40 to-amber-950/40 rounded">
                  <div className="text-[10px] text-cyan-300 font-semibold">{h.alt} m</div>
                  <div className="text-[9px] text-slate-400">{h.hpa}</div>
                  <div className="text-[9px] text-slate-400">{h.wind}</div>
                </div>

                <div className="text-xs font-mono text-slate-300 bg-slate-800 py-1 rounded">
                  {h.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span>Stabile</span>
            <div className="h-3 w-48 bg-gradient-to-r from-purple-700 via-blue-600 via-teal-500 via-orange-500 to-red-600 rounded"></div>
            <span>Instabile</span>
          </div>
          <div>Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo</div>
        </div>
      </div>
    </div>
  );
}