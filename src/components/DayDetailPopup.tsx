"use client";

import type { HourData, DailyData } from "@/types/meteo";
import { Card, CardContent } from "@/components/ui/card";
import { X, Sun, Cloud, Wind, Droplets, Gauge, Thermometer, ArrowUpDown, Eye, Umbrella } from "lucide-react";
import { useMemo } from "react";

interface DayDetailPopupProps {
  dayData: HourData[];
  daily: DailyData;
  dayLabel: string;
  altitude: number;
  onClose: () => void;
  onHourSelect?: (h: number) => void;
}

export function DayDetailPopup({ dayData, daily, dayLabel, altitude, onClose, onHourSelect }: DayDetailPopupProps) {
  const stats = useMemo(() => {
    if (!dayData.length) return null;

    const temps = dayData.map(h => h.temperature);
    const feels = dayData.map(h => h.feelsLike);
    const winds = dayData.map(h => h.windSpeed);
    const gusts = dayData.map(h => h.windGust ?? 0);
    const hums = dayData.map(h => h.humidity);
    const clouds = dayData.map(h => h.cloudCover);
    const precips = dayData.reduce((s, h) => s + h.precipitation, 0);
    const pressures = dayData.map(h => h.pressure);
    const dews = dayData.map(h => h.dewPoint);
    const uvs = dayData.map(h => h.uvIndex ?? 0);

    return {
      tMin: Math.round(Math.min(...temps)),
      tMax: Math.round(Math.max(...temps)),
      feelMin: Math.round(Math.min(...feels)),
      feelMax: Math.round(Math.max(...feels)),
      windAvg: Math.round(winds.reduce((a, b) => a + b, 0) / winds.length),
      windMax: Math.round(Math.max(...winds)),
      gustMax: Math.round(Math.max(...gusts)),
      humAvg: Math.round(hums.reduce((a, b) => a + b, 0) / hums.length),
      humMin: Math.round(Math.min(...hums)),
      humMax: Math.round(Math.max(...hums)),
      cloudAvg: Math.round(clouds.reduce((a, b) => a + b, 0) / clouds.length),
      precipTot: Math.round(precips * 10) / 10,
      pressureAvg: Math.round(pressures.reduce((a, b) => a + b, 0) / pressures.length),
      pressureMin: Math.round(Math.min(...pressures)),
      pressureMax: Math.round(Math.max(...pressures)),
      dewAvg: Math.round(dews.reduce((a, b) => a + b, 0) / dews.length),
      uvMax: Math.round(Math.max(...uvs)),
    };
  }, [dayData]);

  const weatherDesc = useMemo(() => {
    if (!stats) return "";
    const parts: string[] = [];
    if (stats.cloudAvg < 20) parts.push("Sereno o poco nuvoloso");
    else if (stats.cloudAvg < 40) parts.push("Poco nuvoloso");
    else if (stats.cloudAvg < 70) parts.push("Parzialmente nuvoloso");
    else if (stats.cloudAvg < 85) parts.push("Molto nuvoloso");
    else parts.push("Coperto");

    if (stats.precipTot > 5) parts.push("con piogge diffuse");
    else if (stats.precipTot > 1) parts.push("con possibili piogge deboli");
    else parts.push("senza precipitazioni");

    return parts.join(" ");
  }, [stats]);

  const windDir = useMemo(() => {
    if (!dayData.length) return "";
    const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const avgDir = dayData.reduce((s, h) => s + (h.windDirection ?? 0), 0) / dayData.length;
    const idx = Math.round(avgDir / 22.5) % 16;
    return dirs[idx] || "N";
  }, [dayData]);

  const visibility = useMemo(() => {
    if (!stats) return "Buona";
    if (stats.humAvg > 80 && stats.cloudAvg > 60) return "Ridotta";
    if (stats.humAvg > 70) return "Moderata";
    return "Buona";
  }, [stats]);

  const soaringRating = useMemo(() => {
    if (!stats) return 0;
    let score = 5;
    // Vento ideale per volo: 8-20 km/h
    if (stats.windAvg >= 8 && stats.windAvg <= 20) score += 2;
    else if (stats.windAvg > 25) score -= 2;
    // Poca nuvolosità = termiche migliori
    if (stats.cloudAvg < 30) score += 2;
    else if (stats.cloudAvg > 70) score -= 1;
    // Escursione termica
    const escursione = stats.tMax - stats.tMin;
    if (escursione > 8) score += 1;
    // Pioggia
    if (stats.precipTot > 2) score -= 2;
    return Math.max(1, Math.min(10, score));
  }, [stats]);

  if (!stats) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-600 shadow-2xl">
          <p className="text-slate-300">Nessun dato disponibile per questo giorno.</p>
          <button onClick={onClose} className="mt-4 text-sm text-blue-400 hover:underline">Chiudi</button>
        </div>
      </div>
    );
  }

  const hours = dayData.filter(h => {
    const hh = h.time.getHours();
    return hh >= 7 && hh <= 20;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-3 pt-12 pb-24 overflow-y-auto">
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-600 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-5 py-4 border-b border-slate-600 bg-slate-700/50">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-600/60 flex items-center justify-center hover:bg-slate-500 transition-colors"
          >
            <X className="w-4 h-4 text-slate-200" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-orange-600/30 border border-amber-500/40 flex items-center justify-center">
              <Sun className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{dayLabel}</h2>
              <p className="text-xs text-slate-400">{weatherDesc}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Riepilogo rapido - 3 card orizzontali */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-slate-600/50 bg-slate-700/40 shadow-none">
              <CardContent className="p-3 text-center">
                <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="text-xs text-slate-400">Temperatura</div>
                <div className="text-lg font-black text-white">{stats.tMin}°/{stats.tMax}°</div>
                <div className="text-[10px] text-slate-500">Percepita {stats.feelMin}°/{stats.feelMax}°</div>
              </CardContent>
            </Card>
            <Card className="border-slate-600/50 bg-slate-700/40 shadow-none">
              <CardContent className="p-3 text-center">
                <Wind className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                <div className="text-xs text-slate-400">Vento</div>
                <div className="text-lg font-black text-white">{stats.windAvg}</div>
                <div className="text-[10px] text-slate-500">km/h da {windDir}</div>
              </CardContent>
            </Card>
            <Card className="border-slate-600/50 bg-slate-700/40 shadow-none">
              <CardContent className="p-3 text-center">
                <Umbrella className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <div className="text-xs text-slate-400">Pioggia</div>
                <div className="text-lg font-black text-white">{stats.precipTot}</div>
                <div className="text-[10px] text-slate-500">mm totali</div>
              </CardContent>
            </Card>
          </div>

          {/* Dettaglio parametri - griglia 2x3 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-700/30 border border-slate-600/30">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Droplets className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Umidità</span>
              </div>
              <span className="text-sm font-bold text-white">{stats.humMin}%–{stats.humMax}%</span>
              <span className="text-[10px] text-slate-500 ml-1">media {stats.humAvg}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-700/30 border border-slate-600/30">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Cloud className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Nuvolosità</span>
              </div>
              <span className="text-sm font-bold text-white">{stats.cloudAvg}%</span>
              <span className="text-[10px] text-slate-500 ml-1">media</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-700/30 border border-slate-600/30">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Gauge className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Pressione</span>
              </div>
              <span className="text-sm font-bold text-white">{stats.pressureMin}–{stats.pressureMax}</span>
              <span className="text-[10px] text-slate-500 ml-1">hPa</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-700/30 border border-slate-600/30">
              <div className="flex items-center gap-1.5 mb-0.5">
                <ArrowUpDown className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Raffiche</span>
              </div>
              <span className="text-sm font-bold text-white">{stats.gustMax}</span>
              <span className="text-[10px] text-slate-500 ml-1">km/h</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-700/30 border border-slate-600/30">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Eye className="w-3 h-3 text-green-400" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Visibilità</span>
              </div>
              <span className="text-sm font-bold text-white">{visibility}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-700/30 border border-slate-600/30">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Thermometer className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Punto rugiada</span>
              </div>
              <span className="text-sm font-bold text-white">{stats.dewAvg}°</span>
              <span className="text-[10px] text-slate-500 ml-1">media</span>
            </div>
          </div>

          {/* Tabella oraria stile 3B Meteo */}
          <div className="mt-2">
            <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">Previsioni orarie</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700">
              {hours.map((h, i) => {
                const hh = h.time.getHours();
                const isNow = hh === new Date().getHours() && 
                  h.time.getDate() === new Date().getDate() &&
                  h.time.getMonth() === new Date().getMonth();
                return (
                  <button
                    key={i}
                    onClick={() => onHourSelect?.(hh)}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                      isNow
                        ? "bg-blue-600/30 border border-blue-500/40"
                        : "bg-slate-700/30 border border-slate-600/20 hover:bg-slate-700/50"
                    }`}
                  >
                    <span className="w-10 text-xs font-bold text-slate-300">{String(hh).padStart(2, "0")}:00</span>
                    <span className="w-8 text-center text-sm font-black text-white">{Math.round(h.temperature)}°</span>
                    <div className="flex-1 flex items-center gap-1">
                      <span className="text-[10px] text-slate-400">
                        <Droplets className="w-2.5 h-2.5 inline mr-0.5 text-blue-400" />
                        {h.humidity}%
                      </span>
                      <span className="text-[10px] text-slate-400">
                        <Wind className="w-2.5 h-2.5 inline mr-0.5 text-sky-400" />
                        {Math.round(h.windSpeed)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        <Cloud className="w-2.5 h-2.5 inline mr-0.5 text-slate-400" />
                        {h.cloudCover}%
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 w-8 text-right">
                      {h.precipitation > 0 ? `${h.precipitation}mm` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Valutazione volo */}
          <div className="mt-1 p-3 rounded-xl bg-gradient-to-r from-slate-700/40 to-slate-800/40 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">🪂 Valutazione Volo</span>
                <div className="text-xl font-black text-white mt-1">
                  {soaringRating >= 8 ? "Ottimo" : soaringRating >= 6 ? "Buono" : soaringRating >= 4 ? "Discreto" : "Scarso"}
                </div>
              </div>
              <div className="w-14 h-14 rounded-full border-4 flex items-center justify-center text-lg font-black"
                style={{
                  borderColor: soaringRating >= 8 ? "#22c55e" : soaringRating >= 6 ? "#eab308" : soaringRating >= 4 ? "#f97316" : "#ef4444",
                  color: soaringRating >= 8 ? "#22c55e" : soaringRating >= 6 ? "#eab308" : soaringRating >= 4 ? "#f97316" : "#ef4444",
                }}
              >
                {soaringRating}/10
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {soaringRating >= 8 ? "Condizioni ideali per volo libero: vento moderato, cielo sereno, ottima escursione termica." :
               soaringRating >= 6 ? "Buone condizioni: termiche regolari, vento gestibile." :
               soaringRating >= 4 ? "Condizioni discrete: possibile turbolenza o vento sostenuto." :
               "Condizioni difficili: vento forte o pioggia. Si consiglia prudenza."}
            </div>
          </div>

          {/* Dati aggiuntivi */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-2 rounded-lg bg-slate-700/20">
              <span className="text-slate-400">UV max</span>
              <div className="text-xs font-bold text-white">{stats.uvMax}</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-700/20">
              <span className="text-slate-400">Altitudine</span>
              <div className="text-xs font-bold text-white">{altitude}m</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-700/20">
              <span className="text-slate-400">Raffica max</span>
              <div className="text-xs font-bold text-white">{stats.gustMax} km/h</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}