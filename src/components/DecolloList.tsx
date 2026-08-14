import React from "react";
import {
  MapPin,
  Mountain,
  Compass,
  Navigation,
  Sparkles,
} from "lucide-react";
import type { Decollo } from "@/data/decolli";
import type { MeteoDaily, MeteoHourly } from "@/services/weatherService";

interface DecolloListProps {
  decolli: Decollo[];
  selectedId: string;
  onSelect: (id: string) => void;
  allDailyData?: Record<string, MeteoDaily[]>;
  allHourlyData?: Record<string, MeteoHourly[]>;
}

/**
 * Icona meteo in base al codice WMO
 */
function getWeatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  if (code >= 95) return "⛈️";
  return "☀️";
}

/**
 * Direzione vento in italiano
 */
function getDirLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "-";
}

/**
 * Freccia vento
 */
function getDirArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

const DecolloList = ({
  decolli,
  selectedId,
  onSelect,
  allDailyData,
  allHourlyData,
}: DecolloListProps) => {
  // Trova i dati corrente per ogni decollo
  const getCurrentData = (id: string) => {
    const hourly = allHourlyData?.[id];
    if (!hourly || hourly.length === 0) return null;
    const now = new Date();
    const currentHour = hourly.find(
      (h) =>
        h.time.getFullYear() === now.getFullYear() &&
        h.time.getMonth() === now.getMonth() &&
        h.time.getDate() === now.getDate() &&
        h.time.getHours() === now.getHours()
    );
    if (currentHour) return currentHour;
    const first = hourly.find(
      (h) =>
        h.time.getFullYear() === now.getFullYear() &&
        h.time.getMonth() === now.getMonth() &&
        h.time.getDate() === now.getDate()
    );
    return first || null;
  };

  // Altezza fissa per la card "grande" del decollo selezionato
  const LARGE_CARD_HEIGHT = "350px";

  return (
    <div className="space-y-3">
      {/* Lista dei decolli */}
      <div className="card bg-slate-800/60 border border-emerald-500/30 flex items-center gap-2 px-4 py-3">
        <Navigation className="w-6 h-6 text-emerald-400 shrink-0" />
        <span className="text-lg font-bold text-emerald-300">Decolli</span>
        <span className="text-sm text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full ml-auto">
          {decolli.length}
        </span>
      </div>

      {/* Container scrollabile per tutti i decolli */}
      <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
        {decolli.map((site) => {
          const isSelected = site.id === selectedId;
          const current = getCurrentData(site.id);
          const hasData = current != null;
          const temp = hasData ? Math.round(current.temperature) : null;
          const wind = hasData ? Math.round(current.windSpeed) : null;
          const dir = hasData ? Math.round(current.windDir) : null;
          const gust = hasData && current.windGusts > 0 ? Math.round(current.windGusts) : null;
          const code = hasData ? current.weatherCode : null;
          const dirArrow = dir != null ? getDirArrow(dir) : "";
          const dirName = dir != null ? getDirLabel(dir) : "";
          const emoji = code != null ? getWeatherEmoji(code) : "—";

          return (
            <button
              key={site.id}
              onClick={() => onSelect(site.id)}
              className={`
                w-full text-left rounded-xl p-4 transition-all duration-200 border-2 cursor-pointer
                ${isSelected
                  ? "bg-emerald-900/50 border-emerald-500 shadow-lg"
                  : "bg-slate-800/40 border-slate-700/40 hover:bg-slate-700/50"
                }
              `}
            >
              {/* Card grande solo per il decollo selezionato */}
              {isSelected && (
                <div className="bg-slate-900/50 rounded-xl p-6 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl mt-0.5 shrink-0">{emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-bold text-white mb-1 flex items-center gap-1">
                        {site.name}
                        {/* Icona di selezione */}
                        <span className="w-4 h-4 text-emerald-400">✦</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Compass className="w-4 h-4 text-sky-400" />
                          {site.exposure}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mountain className="w-4 h-4 text-amber-400" />
                          {site.altitude}m
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-rose-400" />
                          {site.valley}
                        </span>
                      </div>
                      {hasData && temp != null && (
                        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-700/30">
                          <span className="flex items-center gap-1.5 text-base font-bold text-amber-300">
                            <Thermometer className="w-5 h-5 text-amber-400" />{temp}°
                          </span>
                          <span className="flex items-center gap-1.5 text-base font-bold text-sky-300">
                            <Wind className="w-5 h-5 text-sky-400" />{wind}
                            <span className="text-slate-400 font-normal text-sm">{dirArrow}{dirName}</span>
                          </span>
                          {gust != null && gust > 0 && (
                            <span className="text-sm text-red-300">
                              <Gauge className="w-4 h-4 inline" />{gust}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card piccola per gli altri */}
                {!isSelected && (
                  <div className="card w-full text-left p-4 transition-all duration-200 border-2">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl mt-0.5 shrink-0">{emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-bold text-white mb-1 flex items-center gap-1">
                          {site.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Compass className="w-4 h-4 text-sky-400" />
                            {site.exposure}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mountain className="w-4 h-4 text-amber-400" />
                            {site.altitude}m
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-rose-400" />
                            {site.valley}
                          </span>
                        </div>
                        {hasData && temp != null && (
                          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-700/30">
                            <span className="flex items-center gap-1.5 text-base font-bold text-amber-300">
                              <Thermometer className="w-5 h-5 text-amber-400" />{temp}°
                            </span>
                            <span className="flex items-center gap-1.5 text-base font-bold text-sky-300">
                              <Wind className="w-5 h-5 text-sky-400" />{wind}
                              <span className="text-slate-400 font-normal text-sm">{dirArrow}{dirName}</span>
                            </span>
                            {gust != null && gust > 0 && (
                              <span className="text-sm text-red-300">
                                <Gauge className="w-4 h-4 inline" />{gust}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DecolloList;