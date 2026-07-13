"use client";

import React from "react";
import {
  MapPin,
  Mountain,
  Compass,
  Navigation,
  Sparkles,
  Clock,
  Thermometer,
  Wind,
  Gauge,
} from "lucide-react";

interface DecolloItem {
  id: string;
  name: string;
  valley: string;
  exposure: string;
  alt: number;
}

interface DecolloListProps {
  decolli: DecolloItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  currentData: any;
  allWeatherData?: Record<string, any>;
}

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

function getDirArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

function getDirLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLastUpdate(): string {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

const DecolloList = ({ decolli, selectedId, onSelect, currentData, allWeatherData }: DecolloListProps) => {
  const oraCorrente = formatLastUpdate();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/60 rounded-2xl border border-emerald-500/20">
        <Navigation className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-black text-emerald-300 tracking-wider uppercase">Decolli</h3>
        <span className="text-[10px] text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full ml-auto">
          {decolli.length}
        </span>
      </div>

      {/* Ora locale in alto */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
        <Clock className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[12px] font-bold text-slate-300 tabular-nums">
          {oraCorrente}
        </span>
        <span className="text-[10px] text-slate-500">Italia</span>
      </div>

      <div className="space-y-1.5 max-h-[65vh] overflow-y-auto pr-1">
        {decolli.map((site) => {
          const isSelected = site.id === selectedId;

          // Cerca i dati meteo per questo sito
          const weather = site.id === selectedId
            ? currentData
            : allWeatherData?.[site.id];

          // Dati meteo disponibili
          const temp = weather?.temperature != null ? Math.round(weather.temperature) : null;
          const wind = weather?.windSpeed != null ? Math.round(weather.windSpeed) : null;
          const dir = weather?.windDir != null ? Math.round(weather.windDir) : null;
          const gust = weather?.windGusts != null ? Math.round(weather.windGusts) : null;
          const code = weather?.weatherCode != null ? weather.weatherCode : null;

          const dirLabel2 = dir != null ? getDirLabel(dir) : "";
          const dirArrow2 = dir != null ? getDirArrow(dir) : "";
          const emoji = code != null ? getWeatherEmoji(code) : "—";

          return (
            <button
              key={site.id}
              onClick={() => onSelect(site.id)}
              className={`
                w-full text-left rounded-2xl px-3.5 py-3 transition-all duration-200 border-2
                ${
                  isSelected
                    ? "bg-gradient-to-r from-emerald-900/50 to-slate-800/70 border-emerald-400/60 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                    : "bg-slate-800/40 border-slate-700/30 hover:bg-slate-700/50 hover:border-slate-600/50 hover:scale-[1.01]"
                }
              `}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-sm font-black truncate block leading-snug tracking-tight ${
                      isSelected ? "text-white neon-green" : "text-slate-200"
                    }`}>
                      {site.name}
                    </span>
                    {isSelected && (
                      <Sparkles className="w-3 h-3 text-emerald-400 animate-twinkle shrink-0" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-0.5">
                      <Compass className="w-3 h-3 text-sky-400" />
                      {site.exposure}
                    </span>
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-500" />
                    <span className="flex items-center gap-0.5">
                      <Mountain className="w-3 h-3 text-amber-400" />
                      <span className="font-bold text-amber-300">{site.alt}</span>m
                    </span>
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-500" />
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate">{site.valley}</span>
                    </span>
                  </div>

                  {/* ===== DATI METEO ===== */}
                  {temp != null && (
                    <div className="mt-2 pt-2 border-t border-slate-700/20 grid grid-cols-3 gap-1">
                      {/* Temperatura */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-300">
                        <Thermometer className="w-3 h-3 text-amber-400" />
                        <span className="font-bold tabular-nums">{temp}°</span>
                      </div>

                      {/* Vento */}
                      <div className="flex items-center gap-1 text-[11px] text-slate-300">
                        <Wind className="w-3 h-3 text-sky-400" />
                        <span className="font-bold tabular-nums">
                          {wind}
                        </span>
                        {dir != null && (
                          <span className="text-slate-500 text-[10px]">
                            {dirArrow2}{dirLabel2}
                          </span>
                        )}
                      </div>

                      {/* Icona meteo */}
                      <div className="flex items-center justify-end text-base">
                        {emoji}
                      </div>
                    </div>
                  )}

                  {/* Raffica separata se c'è */}
                  {gust != null && gust > wind! && (
                    <div className="flex items-center gap-1 text-[10px] text-red-300/70 mt-0.5">
                      <Gauge className="w-3 h-3" />
                      <span>Raffica {gust} km/h</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected indicator + ora */}
              {isSelected && (
                <div className="mt-2 pt-2 border-t border-emerald-500/20">
                  <div className="flex items-center gap-2 text-[10px] text-emerald-300/70">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-bold tracking-wide uppercase">Selezionato</span>
                    <span className="text-slate-600">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-500 tabular-nums">{oraCorrente}</span>
                    </span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolloList;
</dyad-file>

Ora devo aggiornare `Index.tsx` per passare `allWeatherData` e fare in modo che `DecolloList` li riceva. Ma non ho quel file modificabile qui — fammi verificare se devo aggiornarlo.

<dyad-write path="src/pages/Index.tsx" description="Passaggio allWeatherData a DecolloList per mostrare meteo su ogni decollo">
// ... (solo la parte dove viene usato DecolloList)

<DecolloList
  decolli={DECOLLI.map(d => ({ id: d.id, name: d.name, valley: d.valley, exposure: d.exposure, alt: d.altitude }))}
  selectedId={selectedId}
  onSelect={setSelectedId}
  currentData={currentData}
  allWeatherData={meteoData?.allHourly || {}}
/>