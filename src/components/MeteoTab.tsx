"use client";

import React from "react";
import {
  Thermometer,
  Droplets,
  Gauge,
  Cloud,
  Eye,
  CloudRain,
  Snowflake,
  Wind,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";

interface MeteoTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number };
  thermalDelta: number;
  stabilityIndex: number;
}

export default function MeteoTab({
  currentData,
  dayData,
  site,
  thermalDelta,
  stabilityIndex,
}: MeteoTabProps) {
  if (!currentData) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500 text-sm font-medium">Nessun dato meteo disponibile</p>
      </div>
    );
  }

  // Raccolta dati — con fallback
  const temp = currentData.temperature;
  const feelsLike = currentData.apparentTemperature ?? currentData.temperature;
  const humidity = currentData.humidity;
  const pressure = currentData.pressure;
  const cloudCover = currentData.cloudCover;
  const visibility = currentData.visibility;
  const precipitation = currentData.precipitation;
  const rain = currentData.rain;
  const snow = currentData.snowfall ?? currentData.snow;
  const dewPoint = currentData.dewPoint;
  const uvIndex = currentData.uvIndex;
  const windSpeed = currentData.windSpeed;
  const windGust = currentData.windGust;
  const windDir = currentData.windDir;
  const isDay = currentData.isDay ?? 1;
  const weatherCode = currentData.weatherCode;

  // Traduzione weatherCode
  const weatherDesc = getWeatherDesc(weatherCode, isDay);
  const weatherIcon = getWeatherEmoji(weatherCode, isDay);

  // Calcolo delta temperatura percepita
  const feelsDelta = Math.round((feelsLike - temp) * 10) / 10;

  return (
    <div className="space-y-5 animate-slide-up">
      {/* Header — weather condition */}
      <div className="flex items-center gap-4 bg-slate-800/40 rounded-2xl p-4 border border-slate-700/30">
        <span className="text-5xl">{weatherIcon}</span>
        <div>
          <div className="text-lg font-bold text-white">{weatherDesc}</div>
          <div className="text-sm text-slate-400">
            {isDay ? "Giorno" : "Notte"} · Codice {weatherCode}
          </div>
        </div>
      </div>

      {/* Griglia metriche */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          icon={<Thermometer className="w-4 h-4 text-orange-400" />}
          label="Temperatura"
          value={`${Math.round(temp)}°C`}
          sub={feelsDelta !== 0 ? `Percepita ${Math.round(feelsLike)}°C (${feelsDelta > 0 ? "+" : ""}${feelsDelta}°)` : undefined}
        />
        <MetricCard
          icon={<Droplets className="w-4 h-4 text-sky-400" />}
          label="Umidità"
          value={`${humidity ?? "—"}%`}
          sub={dewPoint != null ? `Punto rugiada ${Math.round(dewPoint)}°C` : undefined}
        />
        <MetricCard
          icon={<Gauge className="w-4 h-4 text-emerald-400" />}
          label="Pressione"
          value={pressure ? `${Math.round(pressure)} hPa` : "—"}
          sub={pressure ? (pressure > 1020 ? "Alta" : pressure < 1010 ? "Bassa" : "Normale") : undefined}
        />
        <MetricCard
          icon={<Cloud className="w-4 h-4 text-slate-400" />}
          label="Nuvolosità"
          value={`${cloudCover ?? "—"}%`}
          sub={
            cloudCover != null
              ? cloudCover < 20
                ? "Sereno"
                : cloudCover < 50
                ? "Poco nuvoloso"
                : cloudCover < 80
                ? "Nuvoloso"
                : "Molto nuvoloso"
              : undefined
          }
        />
        <MetricCard
          icon={<Eye className="w-4 h-4 text-cyan-400" />}
          label="Visibilità"
          value={visibility ? `${(visibility / 1000).toFixed(1)} km` : "—"}
          sub={visibility != null && visibility < 5000 ? "Ridotta" : "Buona"}
        />
        <MetricCard
          icon={<CloudRain className="w-4 h-4 text-blue-400" />}
          label="Precipitazioni"
          value={precipitation ? `${precipitation.toFixed(1)} mm` : "0 mm"}
          sub={rain ? `Pioggia: ${rain.toFixed(1)} mm` : snow ? `Neve: ${snow.toFixed(1)} cm` : undefined}
        />
        {snow != null && snow > 0 && (
          <MetricCard
            icon={<Snowflake className="w-4 h-4 text-blue-200" />}
            label="Neve"
            value={`${snow.toFixed(1)} cm`}
          />
        )}
        <MetricCard
          icon={<Sun className="w-4 h-4 text-yellow-400" />}
          label="Indice UV"
          value={uvIndex != null ? uvIndex.toFixed(1) : "—"}
          sub={
            uvIndex != null
              ? uvIndex < 3
                ? "Basso"
                : uvIndex < 6
                ? "Moderato"
                : uvIndex < 8
                ? "Alto"
                : "Molto alto"
              : undefined
          }
        />
        <MetricCard
          icon={<Wind className="w-4 h-4 text-sky-400" />}
          label="Vento"
          value={`${Math.round(windSpeed ?? 0)} km/h`}
          sub={windGust ? `Raffiche ${Math.round(windGust)} km/h` : undefined}
        />
      </div>

      {/* Alba/Tramonto */}
      {currentData.sunrise && currentData.sunset && (
        <div className="flex gap-4">
          <div className="flex-1 bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center">
            <Sunrise className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <div className="text-xs text-slate-400">Alba</div>
            <div className="text-sm font-bold text-white">
              {new Date(currentData.sunrise).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <div className="flex-1 bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center">
            <Sunset className="w-4 h-4 text-orange-400 mx-auto mb-1" />
            <div className="text-xs text-slate-400">Tramonto</div>
            <div className="text-sm font-bold text-white">
              {new Date(currentData.sunset).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Componente card metrica =====
function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 card-neon hover:border-slate-600/50">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-black text-white tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ===== Helper weather =====
function getWeatherDesc(code: number | undefined, isDay: number | undefined): string {
  if (code == null) return "Dato non disponibile";
  const map: Record<number, string> = {
    0: "Sereno",
    1: "Prevalentemente sereno",
    2: "Parzialmente nuvoloso",
    3: "Coperto",
    45: "Nebbia",
    48: "Nebbia con depositi",
    51: "Pioviggine leggera",
    53: "Pioviggine moderata",
    55: "Pioviggine intensa",
    56: "Pioviggine gelata leggera",
    57: "Pioviggine gelata intensa",
    61: "Pioggia leggera",
    63: "Pioggia moderata",
    65: "Pioggia intensa",
    66: "Pioggia gelata leggera",
    67: "Pioggia gelata intensa",
    71: "Neve leggera",
    73: "Neve moderata",
    75: "Neve intensa",
    77: "Granelli di neve",
    80: "Rovesci di pioggia leggeri",
    81: "Rovesci di pioggia moderati",
    82: "Rovesci di pioggia violenti",
    85: "Rovesci di neve leggeri",
    86: "Rovesci di neve intensi",
    95: "Temporale",
    96: "Temporale con grandine leggera",
    99: "Temporale con grandine intensa",
  };
  return map[code] || "Sconosciuto";
}

function getWeatherEmoji(code: number | undefined, isDay: number | undefined): string {
  if (code == null) return "❓";
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code === 1 || code === 2) return isDay ? "🌤️" : "🌤️";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 85 && code <= 86) return "❄️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}