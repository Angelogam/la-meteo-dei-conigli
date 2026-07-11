"use client";

import type { HourData, ThermalData, AiAnalysis } from "@/types/meteo";
import { WeatherIcon } from "@/components/WeatherIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useMemo } from "react";
import { Sun, Cloud, Wind, Droplets, Gauge, Thermometer, CloudRain, CloudLightning, CloudSnow, Clock } from "lucide-react";

interface MeteoTabProps {
  current: HourData;
  dayIdx: number;
  hour: number;
  enrichedDaily: any[];
  dateLabels: string[];
  thermal: ThermalData | null;
  pressureGrad: { grad: number; desc: string };
  aiData: AiAnalysis | null;
  onDaySelect: (idx: number) => void;
  onDayDetailClick?: (idx: number) => void;
  onHourChange: (h: number) => void;
  startHour?: number;
  endHour?: number;
}

function getWeatherDescription(code: number, precipitation: number, temp: number): { label: string; icon: React.ReactNode; color: string } {
  // WMO Weather codes: https://open-meteo.com/en/docs
  // 0 = clear sky, 1-3 = mainly clear/partly cloudy/overcast
  // 45-48 = fog, 51-57 = drizzle, 61-67 = rain, 71-77 = snow
  // 80-82 = rain showers, 95-99 = thunderstorms

  if (code >= 95) {
    return {
      label: "Temporale ⛈️",
      icon: <CloudLightning className="w-8 h-8 text-yellow-300" />,
      color: "from-purple-800/60 to-yellow-900/40",
    };
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82) || precipitation > 0.5) {
    if (precipitation > 5) {
      return {
        label: `Pioggia forte (${precipitation.toFixed(1)} mm) 🌧️`,
        icon: <CloudRain className="w-8 h-8 text-blue-300" />,
        color: "from-blue-800/60 to-blue-900/40",
      };
    }
    return {
      label: `Pioggia debole (${precipitation.toFixed(1)} mm) 🌦️`,
      icon: <CloudRain className="w-8 h-8 text-sky-300" />,
      color: "from-blue-700/50 to-slate-800/40",
    };
  }
  if (code >= 71 && code <= 77) {
    return {
      label: "Neve ❄️",
      icon: <CloudSnow className="w-8 h-8 text-white" />,
      color: "from-slate-600/60 to-white/20",
    };
  }
  if (code >= 45 && code <= 48) {
    return {
      label: "Nebbia 🌫️",
      icon: <Cloud className="w-8 h-8 text-slate-300" />,
      color: "from-slate-600/60 to-slate-700/40",
    };
  }
  if (code >= 51 && code <= 57) {
    return {
      label: "Pioviggine 🌧️",
      icon: <CloudRain className="w-8 h-8 text-blue-200" />,
      color: "from-blue-700/50 to-slate-800/40",
    };
  }
  if (code <= 3) {
    const cloudText = code === 0 ? "Sereno" : code === 1 ? "Poco nuvoloso" : code === 2 ? "Parzialmente nuvoloso" : "Nuvoloso";
    const emoji = code === 0 ? "☀️" : code === 1 ? "🌤️" : code === 2 ? "⛅" : "☁️";
    return {
      label: `${cloudText} ${emoji}`,
      icon: <Sun className="w-8 h-8 text-amber-300" />,
      color: code === 0
        ? "from-amber-600/40 to-yellow-600/30"
        : "from-slate-600/50 to-amber-700/30",
    };
  }
  return {
    label: "Nuvoloso ☁️",
    icon: <Cloud className="w-8 h-8 text-slate-300" />,
    color: "from-slate-600/60 to-slate-700/40",
  };
}

export function MeteoTab({
  current,
  dayIdx,
  hour,
  enrichedDaily,
  dateLabels,
  thermal,
  pressureGrad,
  aiData,
  onDaySelect,
  onDayDetailClick,
  onHourChange,
  startHour = 9,
  endHour = 19,
}: MeteoTabProps) {
  const hours = useMemo(() => {
    const arr: { value: number; label: string }[] = [];
    for (let h = startHour; h <= endHour; h++) {
      arr.push({ value: h, label: `${h}:00` });
    }
    return arr;
  }, [startHour, endHour]);

  const weatherInfo = useMemo(() => {
    if (!current) return null;
    return getWeatherDescription(current.weatherCode, current.precipitation, current.temperature);
  }, [current]);

  const now = new Date();
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="space-y-4 text-slate-200">
      {/* ORA ATTUALE - Card superiore con previsione live */}
      {current && weatherInfo && (
        <Card className={`border border-slate-600 bg-slate-800/80 shadow-lg overflow-hidden transition-all duration-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-700/60 border border-slate-500/50 flex items-center justify-center shadow-inner">
                  <WeatherIcon code={current.weatherCode} size={34} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                      {currentTimeStr}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight leading-none mt-0.5">
                    {Math.round(current.temperature)}°C
                  </div>
                  <div className="text-xs font-medium text-slate-400 mt-0.5">
                    Percepita {Math.round(current.feelsLike)}°C
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-extrabold text-white drop-shadow-sm">
                  {weatherInfo.label}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Umidità {current.humidity}% · Vento {Math.round(current.windSpeed)} km/h
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Select day - pillole eleganti con click per dettaglio */}
      <div className="flex gap-1.5 flex-wrap">
        {enrichedDaily.map((day: any, i: number) => (
          <button
            key={i}
            onClick={() => {
              onDaySelect(i);
              onDayDetailClick?.(i);
            }}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 border ${
              i === dayIdx
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20 scale-105"
                : "bg-slate-700 text-slate-300 border-slate-500 hover:bg-slate-600 hover:text-white"
            }`}
          >
            {dateLabels[i]}
          </button>
        ))}
      </div>

      {/* Hour slider 9-19 con etichette eleganti */}
      <div className="pt-3 pb-1 px-1">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] font-medium text-slate-400">{startHour}:00</span>
          <div className="flex items-center gap-2">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-sm font-bold text-white">{String(hour).padStart(2, "0")}:00</span>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-[10px] font-medium text-slate-400">{endHour}:00</span>
        </div>
        <Slider
          value={[hour]}
          min={startHour}
          max={endHour}
          step={1}
          onValueChange={([v]) => onHourChange(v)}
          className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-400 [&_[role=slider]]:w-4 [&_[role=slider]]:h-4 [&_[role=slider]]:shadow-lg"
        />
        <div className="flex justify-between mt-1 text-[8px] text-slate-500">
          {hours.filter((_, i) => i % 2 === 0).map((h) => (
            <span key={h.value}>{h.label}</span>
          ))}
        </div>
      </div>

      {/* Current weather card - rinnovata */}
      <Card className="border border-slate-600 bg-slate-800/80 shadow-lg overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-700/60 border border-slate-500/50 flex items-center justify-center">
                <WeatherIcon code={current.weatherCode} size={36} />
              </div>
              <div>
                <div className="text-4xl font-black text-white tracking-tight leading-none">
                  {Math.round(current.temperature)}°
                </div>
                <div className="text-xs font-medium text-slate-400 mt-1">
                  Percepita {Math.round(current.feelsLike)}°
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <Droplets className="w-3 h-3 text-blue-400" />
                <span className="text-[11px] font-medium text-slate-200">{current.humidity}%</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Wind className="w-3 h-3 text-sky-400" />
                <span className="text-[11px] font-medium text-slate-200">{Math.round(current.windSpeed)} km/h</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Gauge className="w-3 h-3 text-purple-400" />
                <span className="text-[11px] font-medium text-slate-200">{Math.round(current.windGust)} km/h</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Cloud className="w-3 h-3 text-slate-400" />
                <span className="text-[11px] font-medium text-slate-200">{current.cloudCover}%</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-600 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Pressione {Math.round(current.pressure)} hPa</span>
            <span className="text-slate-400">UV {current.uvIndex ?? "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Thermal summary - sfondo grigio-blu invece di amber */}
      {thermal && (
        <Card className="border border-slate-600 bg-slate-800/80 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-slate-700/60 border border-slate-500/50 flex items-center justify-center">
                <Thermometer className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="text-sm font-bold text-slate-100">Condizioni termiche</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-700/60 p-2.5 text-center border border-slate-600/50">
                <div className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Base</div>
                <div className="text-sm font-bold text-white mt-0.5">{thermal.cloudBase}m</div>
              </div>
              <div className="rounded-xl bg-slate-700/60 p-2.5 text-center border border-slate-600/50">
                <div className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Cima</div>
                <div className="text-sm font-bold text-white mt-0.5">{thermal.thermalTop}m</div>
              </div>
              <div className="rounded-xl bg-slate-700/60 p-2.5 text-center border border-slate-600/50">
                <div className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">Soaring</div>
                <div className="text-sm font-bold text-white mt-0.5">{thermal.soarIdx}/10</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI analysis preview */}
      {aiData && (
        <Card className="border border-slate-600 bg-slate-800/80 shadow-lg overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-slate-700/60 border border-slate-500/50 flex items-center justify-center">
                <span className="text-xs">📊</span>
              </div>
              <span className="text-sm font-bold text-slate-100">Analisi meteo</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{aiData.general}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}