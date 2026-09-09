"use client";

import type { MeteoCurrent } from "@/services/openMeteoService";
import type { HourData } from "@/types/meteo";
import { CloudSun, Wind, Thermometer, Droplets, Sun, Zap, Eye, Calendar, MapPin } from "lucide-react";

interface MeteoTabProps {
  currentData: MeteoCurrent | null;
  dayData: HourData[];
  site: { alt: number; name?: string };
  thermalDelta: number;
  modelName?: string;
  selectedHour?: number;
}

// Calcola base cumuli in metri
function calcCloudBase(siteAlt: number, t: number, dew: number) {
  const spread = Math.max(0.5, t - dew);
  return siteAlt + spread * 125;
}

// Calcola top termico realistico
function calcThermalTop(cloudBase: number, cape: number, spread: number, cloudCover: number) {
  const rate = Math.min(4, Math.max(0.3, spread * 0.25 + cape * 0.001));
  const cloudPenalty = cloudCover > 60 ? 0.4 : cloudCover > 40 ? 0.7 : 1.0;
  return Math.round(Math.min(5000, cloudBase + rate * 500 * cloudPenalty + spread * 60));
}

// Calcola wave index (gradi di differenza vento 10m vs 850hPa)
function calcWaveIndex(dir10: number, dir850: number) {
  let diff = Math.abs(dir850 - dir10);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

// Direzione cardinale
function dirLabel(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function dirArrow(deg: number) {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

export default function MeteoTab({ currentData, dayData, site, thermalDelta, modelName, selectedHour }: MeteoTabProps) {
  if (!currentData || dayData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <CloudSun className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato meteo per {site?.name || "questo decollo"}</p>
      </div>
    );
  }

  const { alt: siteAlt, name: siteName } = site;
  const t = currentData.temperature ?? 18;
  const dew = currentData.dewPoint ?? t - 8;
  const humidity = currentData.humidity ?? 50;
  const windSpeed = currentData.windSpeed ?? 0;
  const windDir = currentData.windDir ?? 180;
  const windGusts = currentData.windGusts ?? 0;
  const cape = currentData.cape ?? 0;
  const li = currentData.liftedIndex ?? 1.5;
  const cloudCover = currentData.cloudCover ?? 20;
  const precipitation = currentData.precipitation ?? 0;
  const weatherCode = currentData.weatherCode ?? 0;
  const visibility = currentData.visibility ?? 10000;
  const pressure = currentData.surfacePressure ?? currentData.pressure ?? 1013;
  const uvIndex = currentData.uvIndex ?? 0;

  // === Calcoli per il volo ===
  const cloudBase = calcCloudBase(siteAlt, t, dew);
  const spread = Math.max(0.5, t - dew);
  const avgCape = dayData.reduce((s, h) => s + (h.cape ?? 0), 0) / dayData.length;
  const avgLi = dayData.reduce((s, h) => s + (h.liftedIndex ?? 0), 0) / dayData.length;
  const avgSpread = dayData.reduce((s, h) => s + Math.max(0.5, (h.temperature ?? t) - (h.dewPoint ?? dew)), 0) / dayData.length;
  const avgThermalRate = Math.min(4, Math.max(0.3, avgSpread * 0.25 + avgCape * 0.001));
  const thermalTop = calcThermalTop(cloudBase, avgCape, avgSpread, cloudCover);

  // Finestra di volo
  const flightHours = dayData.filter(h => {
    const ht = h.temperature ?? t;
    const hd = h.dewPoint ?? dew;
    const hSpread = Math.max(0.5, ht - hd);
    return hSpread > 4 && (h.cape ?? 0) < 600 && (h.precipitationProba ?? 0) < 30;
  }).length;
  const windowStart = dayData.findIndex(h => (h.temperature ?? t) - (h.dewPoint ?? dew) > 4);
  const reversedEnd = [...dayData].reverse().findIndex(h => (h.temperature ?? t) - (h.dewPoint ?? dew) > 4);
  const windowEnd = dayData.length - 1 - reversedEnd;
  const flightWindow = windowStart >= 0 && windowEnd > windowStart
    ? `${String(dayData[windowStart]?.time?.getHours() ?? 8).padStart(2, "0")}:00 – ${String(dayData[Math.min(windowEnd, dayData.length - 1)]?.time?.getHours() ?? 17).padStart(2, "0")}:00`
    : "—";

  // Trova dato per l'ora selezionata (o ora corrente se non selezionata)
  const hourIdx = selectedHour != null
    ? dayData.findIndex(h => (h.time instanceof Date ? h.time : new Date(h.time)).getHours() === selectedHour)
    : dayData.findIndex(h => (h.time instanceof Date ? h.time : new Date(h.time)).getHours() === new Date().getHours());
  const selHr = hourIdx >= 0 ? dayData[hourIdx] : null;

  // Vento in quota — usa solo dati reali (null = non disponibile, non 0)
  const midData = dayData.slice(8, 16);
  const valid80 = midData.filter(h => h.windSpeed80m != null);
  const valid120 = midData.filter(h => h.windSpeed120m != null);
  const valid180 = midData.filter(h => h.windSpeed180m != null);
  const valid850 = midData.filter(h => h.windSpeed850 != null);
  const avgWind80m = valid80.length > 0 ? valid80.reduce((s, h) => s + (h.windSpeed80m ?? 0), 0) / valid80.length : null;
  const avgWind120m = valid120.length > 0 ? valid120.reduce((s, h) => s + (h.windSpeed120m ?? 0), 0) / valid120.length : null;
  const avgWind180m = valid180.length > 0 ? valid180.reduce((s, h) => s + (h.windSpeed180m ?? 0), 0) / valid180.length : null;
  const avgWind850 = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windSpeed850 ?? 0), 0) / valid850.length : null;
  const dir80m = valid80.length > 0 ? valid80.reduce((s, h) => s + (h.windDir80m ?? 0), 0) / valid80.length : null;
  const dir120m = valid120.length > 0 ? valid120.reduce((s, h) => s + (h.windDir120m ?? 0), 0) / valid120.length : null;
  const dir180m = valid180.length > 0 ? valid180.reduce((s, h) => s + (h.windDir180m ?? 0), 0) / valid180.length : null;
  const dir850 = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windDir850 ?? 0), 0) / valid850.length : null;

  // Usa dato ora selezionata se disponibile, altrimenti media
  const wind80m = selHr?.windSpeed80m ?? avgWind80m;
  const wind120m = selHr?.windSpeed120m ?? avgWind120m;
  const wind180m = selHr?.windSpeed180m ?? avgWind180m;
  const wind850 = selHr?.windSpeed850 ?? avgWind850;
  const dir80mUse = selHr?.windDir80m ?? dir80m;
  const dir120mUse = selHr?.windDir120m ?? dir120m;
  const dir180mUse = selHr?.windDir180m ?? dir180m;
  const dir850Use = selHr?.windDir850 ?? dir850;

  const waveIndex = calcWaveIndex(windDir, dir850Use ?? 180);
  const zeroThermal = dayData.reduce((s, h) => s + (h.freezingLevel ?? 0), 0) / dayData.length;
  const avgFreezing = zeroThermal > 0 ? Math.round(zeroThermal) : siteAlt + 3000;

  // Stima tasso termico corrente
  const currentRate = Math.min(4, Math.max(0.3, spread * 0.25 + cape * 0.001));
  const currentTop = calcThermalTop(cloudBase, cape, spread, cloudCover);

  // Previsione prossime 6h
  const now = new Date().getHours();
  const next6h = dayData.filter(h => {
    const hr = h.time instanceof Date ? h.time.getHours() : new Date(h.time).getHours();
    return hr >= now && hr <= now + 6;
  });
  const nextRain = next6h.reduce((s, h) => s + (h.precipitation ?? 0), 0);
  const nextRainProb = next6h.reduce((s, h) => s + (h.precipitationProba ?? 0), 0) / (next6h.length || 1);
  const nextCape = next6h.reduce((s, h) => s + (h.cape ?? 0), 0) / (next6h.length || 1);

  // Semáforo volo
  let signal: "green" | "yellow" | "red";
  let signalLabel: string;
  if (weatherCode >= 95 || weatherCode === 82) { signal = "red"; signalLabel = "TEMPORALI"; }
  else if (windSpeed > 30 || nextCape > 1000 || precipitation > 1) { signal = "red"; signalLabel = "PERICOLOSO"; }
  else if (windSpeed > 20 || avgCape > 600 || nextRainProb > 40 || cloudBase < siteAlt + 300) {
    signal = "yellow"; signalLabel = "ATTENZIONE";
  } else { signal = "green"; signalLabel = "VOLO CONSENTITO"; }

  const signalColors = {
    green: { bg: "bg-emerald-500/20", border: "border-emerald-500/50", text: "text-emerald-400", ring: "ring-emerald-500/30" },
    yellow: { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-400", ring: "ring-amber-500/30" },
    red: { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-400", ring: "ring-red-500/30" },
  };
  const sc = signalColors[signal];

  // Warning list
  const warnings: string[] = [];
  if (cloudBase < siteAlt + 300) warnings.push("Base cumuli bassa → nebbia mattutina");
  if (avgFreezing < siteAlt + 2000) warnings.push("Zero termico basso → rischio neve");
  if (windSpeed > 20) warnings.push(`Vento forte al suolo (${Math.round(windSpeed)} km/h)`);
  if (windSpeed > 0 && windGusts > windSpeed * 1.5) warnings.push(`Raffiche forti (${Math.round(windGusts)} km/h)`);
  if (avgCape > 800 && humidity > 60) warnings.push("CAPE elevato + umidità → temporali probabili");
  if (waveIndex < 30 && windSpeed > 15) warnings.push("Wave index basso → onda montana attiva");
  if (visibility < 3000) warnings.push(`Visibilità ridotta (${Math.round(visibility / 1000)}km)`);
  if (nextRainProb > 30) warnings.push(`Pioggia probabile nelle prossime 6h (${Math.round(nextRainProb)}%)`);
  if (avgLi < -4) warnings.push(`Instabilità estrema (LI ${avgLi.toFixed(1)})`);
  if (flightHours < 4) warnings.push("Finestra di volo molto breve");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800/60 border border-emerald-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
        <div>
          <div className="text-sm font-bold text-white">{siteName || "Decollo"}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</span>
            <span className="text-slate-600">·</span>
            <span>{siteAlt}m · {modelName || "Open-Meteo"}</span>
          </div>
        </div>
      </div>

      {/* Semáforo volo */}
      <div className={`rounded-xl border ${sc.border} ${sc.bg} p-4`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-5 h-5 rounded-full ${sc.text.replace("text-", "bg-").replace("/40", "/50")} ring-4 ${sc.ring}`} />
            {signal === "green" && (
              <div className={`absolute inset-0 rounded-full ${sc.text.replace("text-", "bg-").replace("/40", "/50")} animate-ping opacity-20`} />
            )}
          </div>
          <div>
            <p className={`font-black text-xl ${sc.text} tracking-wider`}>{signalLabel}</p>
            <p className="text-slate-500 text-xs">Giudizio volo · {flightHours} ore favorevoli</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-black text-slate-100">{flightWindow}</p>
            <p className="text-slate-500 text-[10px]">Finestra di volo</p>
          </div>
        </div>
      </div>

      {/* 6 Indicatori chiave */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* 1. Termiche */}
        <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Termiche</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">Rateo corrente</span>
              <span className="text-orange-300 font-black text-sm tabular-nums">{currentRate.toFixed(1)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">Media giornata</span>
              <span className="text-orange-400 font-bold text-sm tabular-nums">{avgThermalRate.toFixed(1)} m/s</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (currentRate / 4) * 100)}%`,
                  backgroundColor: currentRate >= 2 ? "#f97316" : currentRate >= 1 ? "#eab308" : "#dc2626",
                }}
              />
            </div>
          </div>
        </div>

        {/* 2. Base / Top */}
        <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <CloudSun className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Cumuli</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">Base</span>
              <span className="text-sky-300 font-black text-sm tabular-nums">{cloudBase}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">Top</span>
              <span className="text-violet-300 font-black text-sm tabular-nums">{currentTop}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">Spread T-deW</span>
              <span className="text-amber-300 font-bold text-sm tabular-nums">{spread.toFixed(1)}°C</span>
            </div>
          </div>
        </div>

        {/* 3. Vento suolo */}
        <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Wind className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vento Suolo</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500 text-[10px]">Velocità</span>
              <span className={`font-black text-lg tabular-nums ${windSpeed > 20 ? "text-red-400" : windSpeed > 12 ? "text-amber-400" : "text-cyan-300"}`}>
                {Math.round(windSpeed)}
              </span>
              <span className="text-slate-600 text-xs">km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">Direzione</span>
              <span className="text-slate-300 font-bold text-sm">{dirLabel(windDir)} {dirArrow(windDir)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">Raffiche</span>
              <span className={`font-bold text-sm tabular-nums ${windGusts > windSpeed * 1.5 ? "text-red-400" : "text-slate-400"}`}>
                {Math.round(windGusts)} km/h
              </span>
            </div>
          </div>
        </div>

        {/* 4. Vento in quota */}
        <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Wind className="w-4 h-4 text-violet-400" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vento Quota</span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">80m</span>
              <span className="text-violet-300 font-bold tabular-nums">{wind80m != null ? `${Math.round(wind80m)} ${dirLabel(Math.round(dir80mUse ?? 0))} ${dirArrow(Math.round(dir80mUse ?? 0))}` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">120m</span>
              <span className="text-violet-300 font-bold tabular-nums">{wind120m != null ? `${Math.round(wind120m)} ${dirLabel(Math.round(dir120mUse ?? 0))} ${dirArrow(Math.round(dir120mUse ?? 0))}` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">850hPa (~1500m)</span>
              <span className={`font-bold tabular-nums ${wind850 != null && wind850 > 20 ? "text-red-400" : wind850 != null ? "text-sky-300" : ""}`}>
                {wind850 != null ? `${Math.round(wind850)} ${dirLabel(Math.round(dir850Use ?? 0))} ${dirArrow(Math.round(dir850Use ?? 0))}` : "—"}
              </span>
            </div>
            {wind180m != null && (
              <div className="flex justify-between">
                <span className="text-slate-500">180m</span>
                <span className="text-violet-300 font-bold tabular-nums">{Math.round(wind180m)} {dirLabel(Math.round(dir180mUse ?? 0))} {dirArrow(Math.round(dir180mUse ?? 0))}</span>
              </div>
            )}
            {wind850 != null && (
              <div className="pt-1 border-t border-slate-700/50 flex justify-between">
                <span className="text-slate-500">Wave Index</span>
                <span className={`font-black text-sm tabular-nums ${waveIndex < 30 ? "text-emerald-400" : waveIndex < 60 ? "text-amber-400" : "text-slate-400"}`}>
                  {Math.round(waveIndex)}°
                  {waveIndex < 30 && <span className="text-[9px] ml-1">🌊 onda</span>}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 5. Instabilità */}
        <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Instabilità</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-slate-500 text-[10px]">CAPE</span>
              <span className={`font-black text-lg tabular-nums ${avgCape > 800 ? "text-red-400" : avgCape > 300 ? "text-amber-400" : "text-emerald-400"}`}>
                {Math.round(avgCape)}
              </span>
              <span className="text-slate-600 text-[10px]">J/kg</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (avgCape / 1500) * 100)}%`,
                  backgroundColor: avgCape > 800 ? "#dc2626" : avgCape > 300 ? "#eab308" : "#10b981",
                }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">Lifted Index</span>
              <span className={`font-bold text-sm tabular-nums ${avgLi < -4 ? "text-red-400" : avgLi < -2 ? "text-amber-400" : "text-emerald-400"}`}>
                {avgLi.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">CIN</span>
              <span className="text-slate-400 font-bold text-sm tabular-nums">{Math.round(currentData.cin ?? 0)} J/kg</span>
            </div>
          </div>
        </div>

        {/* 6. Zero termico + visibilità */}
        <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Altro</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">Zero termico</span>
              <span className={`font-bold text-sm tabular-nums ${avgFreezing < siteAlt + 2000 ? "text-red-400" : "text-cyan-300"}`}>
                {avgFreezing}m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">Visibilità</span>
              <span className={`font-bold text-sm tabular-nums ${visibility < 3000 ? "text-red-400" : visibility < 5000 ? "text-amber-400" : "text-emerald-400"}`}>
                {visibility >= 10000 ? "10+" : Math.round(visibility / 1000)}km
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">UV Index</span>
              <span className={`font-bold text-sm tabular-nums ${uvIndex >= 8 ? "text-red-400" : uvIndex >= 5 ? "text-amber-400" : "text-slate-300"}`}>
                {Math.round(uvIndex)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-[10px]">Pressione</span>
              <span className="text-slate-300 font-bold text-sm tabular-nums">{Math.round(pressure)} hPa</span>
            </div>
          </div>
        </div>

        {/* 7. Tendenza prossime 6h */}
        <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/50 md:col-span-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tendenza prossime 6h</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
            <div>
              <span className="text-slate-500">Pioggia totale</span>
              <p className={`font-black text-base tabular-nums ${nextRain > 2 ? "text-red-400" : nextRain > 0.5 ? "text-amber-400" : "text-emerald-400"}`}>
                {nextRain > 0 ? `${nextRain.toFixed(1)}` : "0"}mm
              </p>
            </div>
            <div>
              <span className="text-slate-500">Prob. pioggia</span>
              <p className={`font-black text-base tabular-nums ${nextRainProb > 40 ? "text-red-400" : nextRainProb > 20 ? "text-amber-400" : "text-emerald-400"}`}>
                {Math.round(nextRainProb)}%
              </p>
            </div>
            <div>
              <span className="text-slate-500">CAPE medio</span>
              <p className={`font-black text-base tabular-nums ${nextCape > 800 ? "text-red-400" : nextCape > 300 ? "text-amber-400" : "text-emerald-400"}`}>
                {Math.round(nextCape)} J/kg
              </p>
            </div>
            <div>
              <span className="text-slate-500">Ore secche</span>
              <p className="font-black text-base tabular-nums text-sky-300">
                {dayData.filter(h => (h.precipitationProba ?? 0) < 20 && (h.cape ?? 0) < 400).length}
                <span className="text-slate-500 text-xs font-normal">/{dayData.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      {warnings.length > 0 && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            Attenzione
          </div>
          {warnings.map((w, i) => (
            <p key={i} className="text-amber-200/80 text-xs flex items-start gap-1.5">
              <span className="text-amber-500 mt-0.5 shrink-0">·</span>
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Nuvolosità dettagliata */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <p className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
          <CloudSun className="w-3.5 h-3.5" />
          Nuvolosità per strato
        </p>
        <div className="space-y-2">
          {[
            { label: "Bassa (0–2 km)", value: currentData.cloudCoverLow ?? 0, color: "bg-blue-400" },
            { label: "Media (2–6 km)", value: currentData.cloudCoverMid ?? 0, color: "bg-sky-400" },
            { label: "Alta (6–12 km)", value: currentData.cloudCoverHigh ?? 0, color: "bg-indigo-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 w-28 shrink-0">{label}</span>
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value || 0)}%` }} />
              </div>
              <span className="text-[11px] font-bold text-slate-300 w-8 tabular-nums text-right">{Math.round(value || 0)}%</span>
            </div>
          ))}
          <div className="border-t border-slate-700/50 pt-2 flex items-center gap-3">
            <span className="text-[11px] text-slate-400 w-28 shrink-0">Totale</span>
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-slate-400 transition-all" style={{ width: `${Math.min(100, cloudCover || 0)}%` }} />
            </div>
            <span className="text-[11px] font-bold text-white w-8 tabular-nums text-right">{Math.round(cloudCover ?? 0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
