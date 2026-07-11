"use client";

import type { HourData, DailyData } from "@/types/meteo";
import { Card, CardContent } from "@/components/ui/card";
import { X, Sun, Cloud, CloudRain, CloudSun, CloudSnow, CloudLightning, CloudFog, Wind, Droplets, Gauge, Thermometer, ArrowUpDown, Eye, Umbrella, Moon, CloudDrizzle } from "lucide-react";
import { useMemo } from "react";

interface DayDetailPopupProps {
  dayData: HourData[];
  daily: DailyData;
  dayLabel: string;
  altitude: number;
  onClose: () => void;
  onHourSelect?: (h: number) => void;
}

function get3bWeatherIcon(code: number, isDay: boolean, size: number = 16) {
  const props = { size, className: "shrink-0" };
  
  if (code === 0) {
    return isDay 
      ? <Sun {...props} className="text-amber-400 shrink-0" /> 
      : <Moon {...props} className="text-slate-300 shrink-0" />;
  }
  if (code <= 2) return <CloudSun {...props} className="text-amber-300 shrink-0" />;
  if (code === 3) return <Cloud {...props} className="text-slate-300 shrink-0" />;
  if (code <= 48) return <CloudFog {...props} className="text-slate-400 shrink-0" />;
  if (code <= 57) return <CloudDrizzle {...props} className="text-blue-300 shrink-0" />;
  if (code <= 67) return <CloudRain {...props} className="text-blue-400 shrink-0" />;
  if (code <= 77) return <CloudSnow {...props} className="text-blue-200 shrink-0" />;
  if (code <= 82) return <CloudRain {...props} className="text-blue-300 shrink-0" />;
  return <CloudLightning {...props} className="text-purple-300 shrink-0" />;
}

function get3bWeatherLabel(code: number): string {
  if (code === 0) return "Sereno";
  if (code === 1) return "Poco nuvoloso";
  if (code === 2) return "Parzialmente nuvoloso";
  if (code === 3) return "Coperto";
  if (code <= 48) return "Nebbia";
  if (code <= 57) return "Pioviggine";
  if (code <= 67) return "Pioggia";
  if (code <= 77) return "Neve";
  if (code <= 82) return "Rovesci";
  return "Temporale";
}

function getRainBar(precip: number): { width: number; color: string; label: string } {
  if (precip <= 0) return { width: 0, color: "bg-transparent", label: "" };
  if (precip < 0.5) return { width: 15, color: "bg-blue-200/50", label: "debole" };
  if (precip < 1.5) return { width: 35, color: "bg-blue-300", label: "moderata" };
  if (precip < 4) return { width: 60, color: "bg-blue-500", label: "forte" };
  return { width: 100, color: "bg-blue-700", label: "molto forte" };
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
    if (stats.windAvg >= 8 && stats.windAvg <= 20) score += 2;
    else if (stats.windAvg > 25) score -= 2;
    if (stats.cloudAvg < 30) score += 2;
    else if (stats.cloudAvg > 70) score -= 1;
    const escursione = stats.tMax - stats.tMin;
    if (escursione > 8) score += 1;
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

  // Filtro 8:00–20:00
  const hours = dayData.filter(h => {
    const hh = h.time.getHours();
    return hh >= 8 && hh <= 20;
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
              <p className="text-xs text-slate-300">Previsioni 8:00–20:00 · 3B Meteo style</p>
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

          {/* Previsioni orarie stile 3B Meteo - con nuvole e pioggia */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
              Fascia oraria 8:00–20:00 · 3B Meteo
            </h3>
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700">
              {/* Intestazione tabella */}
              <div className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-600/30">
                <span className="w-10">Ora</span>
                <span className="w-8 text-center">Temp</span>
                <span className="w-8 text-center">Icona</span>
                <span className="flex-1 text-center">Nuvolosità</span>
                <span className="w-16 text-center">Pioggia</span>
                <span className="w-8 text-center">Vento</span>
              </div>

              {hours.map((h, i) => {
                const hh = h.time.getHours();
                const isNow = hh === new Date().getHours() && 
                  h.time.getDate() === new Date().getDate() &&
                  h.time.getMonth() === new Date().getMonth();
                const rain = getRainBar(h.precipitation);

                // Icona 3B per ora
                const weatherIcon = get3bWeatherIcon(h.weatherCode, h.isDay, 14);

                // Barra nuvolosità
                const cloudBarWidth = Math.min(100, h.cloudCover);

                return (
                  <button
                    key={i}
                    onClick={() => onHourSelect?.(hh)}
                    className={`w-full flex items-center gap-1 p-1.5 rounded-lg text-left transition-colors text-xs ${
                      isNow
                        ? "bg-blue-600/30 border border-blue-500/40"
                        : "bg-slate-700/30 border border-slate-600/20 hover:bg-slate-700/50"
                    }`}
                  >
                    {/* Ora */}
                    <span className="w-10 font-bold text-slate-300 tabular-nums">{String(hh).padStart(2, "0")}:00</span>

                    {/* Temperatura */}
                    <span className="w-8 text-center font-black text-white tabular-nums">{Math.round(h.temperature)}°</span>

                    {/* Icona meteo */}
                    <span className="w-8 flex justify-center<dyad-write path="src/components/DayDetailPopup.tsx" description="Continuo il file DayDetailPopup dalla riga interrotta">
                    <span className="w-8 flex justify-center">{weatherIcon}</span>

                    {/* Barra nuvolosità */}
                    <span className="flex-1 flex items-center gap-0.5">
                      <div className="h-2.5 bg-slate-600/60 rounded-full overflow-hidden flex-1 max-w-20">
                        <div
                          className={`h-full rounded-full transition-all ${
                            h.cloudCover >= 80 ? "bg-slate-400" :
                            h.cloudCover >= 50 ? "bg-slate-300" :
                            h.cloudCover >= 20 ? "bg-blue-200/40" : "bg-amber-200/30"
                          }`}
                          style={{ width: `${cloudBarWidth}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-500 w-6 tabular-nums">{h.cloudCover}%</span>
                    </span>

                    {/* Pioggia */}
                    <span className="w-16 flex items-center gap-0.5 justify-center">
                      {h.precipitation > 0 ? (
                        <>
                          <div className="h-2 w-12 bg-slate-600/40 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${rain.color}`}
                              style={{ width: `${rain.width}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-blue-300 tabular-nums">{h.precipitation.toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="text-[9px] text-slate-600">—</span>
                      )}
                    </span>

                    {/* Vento */}
                    <span className="w-8 text-right text-[10px] font-medium text-sky-300 tabular-nums">{Math.round(h.windSpeed)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legenda pioggia */}
          <div className="flex items-center gap-4 justify-start text-[9px] text-slate-500">
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 rounded bg-blue-200/50" />
              <span>debole</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 rounded bg-blue-300" />
              <span>moderata</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 rounded bg-blue-500" />
              <span>forte</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 rounded bg-blue-700" />
              <span>molto forte</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}