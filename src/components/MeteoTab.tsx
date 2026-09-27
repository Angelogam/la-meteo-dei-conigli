"use client";

import type { MeteoCurrent } from "@/services/openMeteoService";
import type { HourData } from "@/types/meteo";
import {
  Zap, Calendar, MapPin, Wind, Thermometer, Droplets, Eye,
  Mountain, Cloud, Activity, AlertTriangle, CheckCircle2,
  CloudRain, ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";

interface MeteoTabProps {
  currentData: MeteoCurrent | null;
  dayData: HourData[];
  site: { alt: number; name?: string; orientation?: string };
  thermalDelta: number;
  modelName?: string;
  selectedHour?: number;
  cape?: number | null;
  liftedIndex?: number | null;
  cin?: number | null;
}

function calcCloudBase(siteAlt: number, t: number, dew: number) {
  const spread = Math.max(0.5, t - dew);
  return siteAlt + spread * 125;
}

function calcWaveIndex(dir10: number, dir850: number) {
  let diff = Math.abs(dir850 - dir10);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function dirLabel(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getWeatherDescription(code: number): string {
  if (code >= 95) return "Temporale";
  if (code >= 80) return "Pioggia";
  if (code >= 71) return "Neve";
  if (code >= 61) return "Pioggia leggera";
  if (code >= 51) return "Piombo";
  if (code >= 45) return "Nebbia";
  if (code >= 30) return "Nuvoloso";
  if (code >= 20) return "Temporale lontano";
  if (code >= 10) return "Parzialmente nuvoloso";
  if (code >= 5) return "Nubi sparse";
  return "Sereno";
}

function getCloudCoverLabel(pct: number) {
  if (pct >= 90) return "Coperto";
  if (pct >= 70) return "Molto coperto";
  if (pct >= 50) return "Parz. coperto";
  if (pct >= 30) return "Variabile";
  if (pct >= 10) return "Poco nuvoloso";
  return "Sereno";
}

function getCloudCoverColor(pct: number) {
  if (pct >= 80) return "text-slate-400";
  if (pct >= 50) return "text-sky-400";
  if (pct >= 20) return "text-sky-300";
  return "text-amber-300";
}

function getCelCoverGradient(pct: number) {
  if (pct >= 80) return "from-slate-500 to-slate-600";
  if (pct >= 50) return "from-sky-500 to-sky-600";
  if (pct >= 20) return "from-sky-400 to-sky-500";
  return "from-amber-400 to-amber-500";
}

function getSignalColor(signal: string) {
  return signal === "green" ? "from-emerald-500/20 to-emerald-600/5" :
         signal === "yellow" ? "from-amber-500/20 to-amber-600/5" :
         "from-rose-500/20 to-rose-600/5";
}

function getSignalBorder(signal: string) {
  return signal === "green" ? "border-emerald-500/30" :
         signal === "yellow" ? "border-amber-500/30" :
         "border-rose-500/30";
}

function getSignalBg(signal: string) {
  return signal === "green" ? "bg-emerald-500/10 border-emerald-500/30" :
         signal === "yellow" ? "bg-amber-500/10 border-amber-500/30" :
         "bg-rose-500/10 border-rose-500/30";
}

function getSignalText(signal: string) {
  return signal === "green" ? "text-emerald-400" :
         signal === "yellow" ? "text-amber-400" :
         "text-rose-400";
}

function getSignalDot(signal: string) {
  return signal === "green" ? "bg-emerald-400 shadow-emerald-400/50" :
         signal === "yellow" ? "bg-amber-400 shadow-amber-400/50" :
         "bg-rose-400 shadow-rose-400/50";
}

function getSignalEmoji(signal: string) {
  return signal === "green" ? "✓" : signal === "yellow" ? "⚠" : "✗";
}

export default function MeteoTab({ currentData, dayData, site, thermalDelta, modelName, selectedHour, cape: propCape, liftedIndex: propLi, cin: propCin }: MeteoTabProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!currentData || dayData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-700/50">
        <Cloud className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato meteo</p>
      </div>
    );
  }

  const { alt: siteAlt, name: siteName, orientation } = site;
  const t = currentData.temperature ?? 18;
  const dew = currentData.dewPoint ?? t - 8;
  const humidity = currentData.humidity ?? 50;
  const windSpeed = currentData.windSpeed ?? 0;
  const windDir = currentData.windDir ?? 180;
  const windGusts = currentData.windGusts ?? 0;
  const precipitation = currentData.precipitation ?? 0;
  const weatherCode = currentData.weatherCode ?? 0;
  const visibility = currentData.visibility ?? 10000;
  const pressure = currentData.pressure ?? 1013;
  const uvIndex = currentData.uvIndex ?? 5;
  const cape = currentData.cape ?? propCape ?? 0;
  const liftedIndex = currentData.liftedIndex ?? propLi ?? 0;
  const feelsLike = currentData.apparentTemp ?? t;

  // Cloud cover
  const cloudCover = currentData.cloudCover ?? 0;
  const cloudCoverLow = currentData.cloudCoverLow ?? 0;
  const cloudCoverMid = currentData.cloudCoverMid ?? 0;
  const cloudCoverHigh = currentData.cloudCoverHigh ?? 0;

  // === Calcoli per il volo ===
  const cloudBase = calcCloudBase(siteAlt, t, dew);
  const spread = Math.max(0.5, t - dew);
  const avgCape = dayData.reduce((s, h) => s + (h.cape ?? 0), 0) / dayData.length;
  const avgLi = dayData.reduce((s, h) => s + (h.liftedIndex ?? 0), 0) / dayData.length;
  const avgSpread = dayData.reduce((s, h) => s + Math.max(0.5, (h.temperature ?? t) - (h.dewPoint ?? dew)), 0) / dayData.length;
  const avgThermalRate = Math.min(4, Math.max(0.3, avgSpread * 0.25 + avgCape * 0.001));

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

  // Vento in quota
  const midData = dayData.slice(8, 16);
  const valid850 = midData.filter(h => h.windSpeed850 != null);
  const dir850Use = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windDir850 ?? 0), 0) / valid850.length : null;
  const wind850 = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windSpeed850 ?? 0), 0) / valid850.length : null;
  const waveIndex = calcWaveIndex(windDir, dir850Use ?? 180);

  const zeroThermal = dayData.reduce((s, h) => s + (h.freezingLevel ?? 0), 0) / dayData.length;
  const avgFreezing = zeroThermal > 0 ? Math.round(zeroThermal) : siteAlt + 3000;

  // Previsione prossime 6h
  const now = new Date().getHours();
  const next6h = dayData.filter(h => {
    const hr = h.time instanceof Date ? h.time.getHours() : new Date(h.time).getHours();
    return hr >= now && hr <= now + 6;
  });
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

  // Warnings
  const warnings: { icon: string; text: string; type: "danger" | "warning" | "info" }[] = [];
  if (cloudBase < siteAlt + 300) warnings.push({ icon: "🌫️", text: "Base cumuli molto bassa → nebbia mattutina", type: "danger" });
  if (avgFreezing < siteAlt + 2000) warnings.push({ icon: "❄️", text: "Zero termico basso → rischio neve", type: "warning" });
  if (windSpeed > 20) warnings.push({ icon: "💨", text: `Vento forte al suolo (${Math.round(windSpeed)} km/h)`, type: "warning" });
  if (windSpeed > 0 && windGusts > windSpeed * 1.5) warnings.push({ icon: "💨", text: `Raffiche forti (${Math.round(windGusts)} km/h)`, type: "danger" });
  if (avgCape > 800 && humidity > 60) warnings.push({ icon: "⚡", text: "CAPE elevato + umidità → temporali probabili", type: "danger" });
  if (waveIndex < 30 && windSpeed > 15) warnings.push({ icon: "🌊", text: "Wave index basso → onda montana attiva", type: "info" });
  if (visibility < 3000) warnings.push({ icon: "👁️", text: `Visibilità ridotta (${Math.round(visibility / 1000)}km)`, type: "warning" });
  if (nextRainProb > 30) warnings.push({ icon: "🌧️", text: `Pioggia probabile nelle prossime 6h (${Math.round(nextRainProb)}%)`, type: "warning" });
  if (avgLi < -4) warnings.push({ icon: "🔥", text: `Instabilità estrema (LI ${avgLi.toFixed(1)})`, type: "danger" });
  if (flightHours < 4) warnings.push({ icon: "⏰", text: "Finestra di volo molto breve", type: "warning" });
  if (cloudCoverLow > 80) warnings.push({ icon: "☁️", text: "Nuvoloso basso esteso (>80%)", type: "warning" });

  const instabilityLabel = avgSpread > 1.5 ? "fortemente instabile"
    : avgSpread > 1.0 ? "moderatamente instabile"
    : avgSpread > 0.6 ? "instabile"
    : "stabile";

  const wind2000m = wind850 != null ? Math.round(wind850 * 1.15) : null;
  const dir2000m = dir850Use != null ? Math.round(dir850Use + 10) : null;

  const windAngle = (windDir + 180) % 360;

  // Orario pioggia风险分析
  const rainHours = dayData.filter(h => (h.precipitationProba ?? 0) > 30).map(h => ({
    hour: h.time instanceof Date ? h.time.getHours() : new Date(h.time).getHours(),
    prob: h.precipitationProba ?? 0
  }));

  // Volabilità assessment
  const isFlyable = signal === "green";
  const isMaybeFlyable = signal === "yellow";
  const isNotFlyable = signal === "red";

  // Low cloud base risk
  const lowCloudRisk = cloudBase < siteAlt + 500;
  const veryLowCloudRisk = cloudBase < siteAlt + 300;

  return (
    <div className={`bg-gradient-to-br ${getSignalColor(signal)} border ${getSignalBorder(signal)} rounded-2xl overflow-hidden shadow-2xl`}>

      {/* ══════════════ HEADER ══════════════ */}
      <div className="px-6 py-4 border-b border-slate-700/40">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">{siteName || "Decollo"}</h2>
                {orientation && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-[10px] font-bold text-slate-400">
                    {orientation}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                <Calendar className="w-3 h-3" />
                <span className="font-medium">{new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</span>
                <span className="text-slate-600">·</span>
                <span className="font-semibold">{siteAlt}m</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">{modelName || "Open-Meteo"}</span>
              </div>
            </div>
          </div>

          {/* Signal badge */}
          <div className="flex flex-col items-end gap-1.5">
            <div className={`px-3 py-1.5 rounded-full border ${getSignalBg(signal)}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${getSignalDot(signal)} shadow-sm animate-pulse`} />
                <span className={`text-xs font-black tracking-wider ${getSignalText(signal)}`}>
                  {signalLabel}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">{getWeatherDescription(weatherCode)}</span>
          </div>
        </div>
      </div>

      {/* ══════════════ HERO: Temp + Vento ══════════════ */}
      <div className="px-6 py-4 border-b border-slate-700/30 bg-slate-900/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Condizioni attuali</div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-white tabular-nums">{Math.round(t)}</span>
              <span className="text-xl text-slate-400 font-bold">°C</span>
            </div>
            <div className="text-sm text-slate-400 font-medium mt-0.5">Percepiti {Math.round(feelsLike)}°C · {getWeatherDescription(weatherCode)}</div>
          </div>

          {/* Wind indicator */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Vento</div>
              <div className="text-2xl font-black text-cyan-300 tabular-nums">{Math.round(windSpeed)}</div>
              <div className="text-xs text-slate-400 font-medium">
                {dirLabel(windDir)}
                {windGusts > 0 && <span className="text-slate-500"> · raffiche {Math.round(windGusts)}</span>}
              </div>
            </div>
            <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="w-0.5 h-5 bg-cyan-400 rounded-full origin-bottom shadow-sm shadow-cyan-400/50"
                  style={{ transform: `rotate(${windAngle}deg) translateY(-50%)`, marginTop: '-10px' }}
                />
              </div>
              <span className="text-[8px] font-black text-slate-500 absolute top-0.5">N</span>
              <span className="text-[8px] font-black text-slate-500 absolute bottom-0.5">S</span>
              <span className="text-[8px] font-black text-slate-500 absolute left-0.5">O</span>
              <span className="text-[8px] font-black text-slate-500 absolute right-0.5">E</span>
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[10px] text-slate-500 font-bold uppercase">Umidità</span>
            </div>
            <span className="text-lg font-black text-sky-300 tabular-nums">{humidity}%</span>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Thermometer className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-slate-500 font-bold uppercase">P. rugiada</span>
            </div>
            <span className="text-lg font-black text-amber-300 tabular-nums">{Math.round(dew)}°</span>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[10px] text-slate-500 font-bold uppercase">Pressione</span>
            </div>
            <span className="text-lg font-black text-violet-300 tabular-nums">{Math.round(pressure)}</span>
            <span className="text-[9px] text-violet-400/60 font-bold ml-0.5">hPa</span>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-2.5 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-slate-500 font-bold uppercase">Visibilità</span>
            </div>
            <span className="text-lg font-black text-emerald-300 tabular-nums">{Math.round(visibility / 1000)}</span>
            <span className="text-[9px] text-emerald-400/60 font-bold ml-0.5">km</span>
          </div>
        </div>
      </div>

      {/* ══════════════ VERDETTO VOLO ══════════════ */}
      <div className="px-6 py-4 border-b border-slate-700/30">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">Verdetto volo</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Status card */}
          <div className={`rounded-xl p-4 border ${getSignalBg(signal)}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black ${signal === "green" ? "bg-emerald-500/20 text-emerald-400" : signal === "yellow" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"}`}>
                {getSignalEmoji(signal)}
              </div>
              <div>
                <div className={`text-sm font-black ${getSignalText(signal)}`}>{signalLabel}</div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {isFlyable ? "Condizioni ideali per il volo" :
                   isMaybeFlyable ? "Condizioni marginali, valutare con attenzione" :
                   "Condizioni non sicure per il volo"}
                </div>
              </div>
            </div>
          </div>

          {/* Sky coverage */}
          <div className="rounded-xl p-4 border border-slate-700/30 bg-slate-800/40">
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-4 h-4 text-sky-400" />
              <span className="text-xs text-slate-400 font-bold uppercase">Copertura cielo</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className={`text-2xl font-black ${getCloudCoverColor(cloudCover)}`}>{cloudCover}%</span>
              <span className="text-xs text-slate-500 font-semibold">{getCloudCoverLabel(cloudCover)}</span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${getCelCoverGradient(cloudCover)} rounded-full transition-all`} style={{ width: `${cloudCover}%` }} />
            </div>
          </div>

          {/* Low cloud risk */}
          <div className={`rounded-xl p-4 border ${veryLowCloudRisk ? "bg-rose-500/10 border-rose-500/30" : lowCloudRisk ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Mountain className="w-4 h-4 text-sky-400" />
              <span className="text-xs text-slate-400 font-bold uppercase">Base cumuli</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className={`text-2xl font-black tabular-nums ${veryLowCloudRisk ? "text-rose-300" : lowCloudRisk ? "text-amber-300" : "text-sky-300"}`}>{cloudBase}</span>
              <span className="text-xs text-slate-500 font-semibold">m</span>
            </div>
            <div className="text-xs font-semibold mb-2">
              {veryLowCloudRisk ? (
                <span className="text-rose-400">⚠ Rischio alto — troppo bassa</span>
              ) : lowCloudRisk ? (
                <span className="text-amber-400">↑ Marginale (+{Math.round(cloudBase - siteAlt)}m)</span>
              ) : (
                <span className="text-emerald-400">✓ Buona (+{Math.round(cloudBase - siteAlt)}m)</span>
              )}
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${veryLowCloudRisk ? "bg-rose-500" : lowCloudRisk ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, Math.max(0, ((cloudBase - siteAlt) / 1500) * 100))}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ LIVE RAIN RISK TIMELINE ══════════════ */}
      {rainHours.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-700/30">
          <div className="flex items-center gap-2 mb-3">
            <CloudRain className="w-4 h-4 text-sky-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Rischio piovaschi — prossime 24h</span>
          </div>
          <div className="flex gap-1 items-end h-12">
            {dayData.slice(0, 24).map((h, i) => {
              const prob = h.precipitationProba ?? 0;
              const hr = h.time instanceof Date ? h.time.getHours() : new Date(h.time).getHours();
              const isNow = hr === now;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div
                    className={`w-full rounded-t-sm transition-all ${prob > 50 ? "bg-rose-500" : prob > 30 ? "bg-amber-500" : prob > 10 ? "bg-sky-500" : "bg-slate-700"
                      } ${isNow ? "ring-1 ring-white/30" : ""}`}
                    style={{ height: `${Math.max(4, prob)}%`, minHeight: prob > 0 ? '4px' : '2px' }}
                  />
                  {hr % 3 === 0 && (
                    <span className="text-[8px] text-slate-600 font-medium">{hr}:00</span>
                  )}
                  {prob > 30 && (
                    <div className="absolute bottom-full mb-1 px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-[9px] text-slate-300 font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                      {hr}:00 — {Math.round(prob)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-500 font-semibold">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-700 inline-block" /> &lt;10%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-500 inline-block" /> 10-30%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500 inline-block" /> 30-50%</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block" /> &gt;50%</span>
          </div>
        </div>
      )}

      {/* ══════════════ CLOUD LAYERS ══════════════ */}
      <div className="px-6 py-4 border-b border-slate-700/30">
        <div className="flex items-center gap-2 mb-3">
          <Cloud className="w-4 h-4 text-sky-400" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Strati nuvolosi</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Basse", pct: cloudCoverLow, icon: "🌫️", color: cloudCoverLow > 70 ? "text-rose-400" : cloudCoverLow > 40 ? "text-amber-400" : "text-sky-400", bg: cloudCoverLow > 70 ? "bg-rose-500/10 border-rose-500/20" : cloudCoverLow > 40 ? "bg-amber-500/10 border-amber-500/20" : "bg-sky-500/10 border-sky-500/20" },
            { label: "Medie", pct: cloudCoverMid, icon: "☁️", color: cloudCoverMid > 70 ? "text-rose-400" : cloudCoverMid > 40 ? "text-amber-400" : "text-sky-300", bg: cloudCoverMid > 70 ? "bg-rose-500/10 border-rose-500/20" : cloudCoverMid > 40 ? "bg-amber-500/10 border-amber-500/20" : "bg-sky-500/10 border-sky-500/20" },
            { label: "Alte", pct: cloudCoverHigh, icon: "🌤️", color: cloudCoverHigh > 70 ? "text-slate-400" : cloudCoverHigh > 40 ? "text-sky-400" : "text-cyan-300", bg: cloudCoverHigh > 70 ? "bg-slate-500/10 border-slate-500/20" : cloudCoverHigh > 40 ? "bg-sky-500/10 border-sky-500/20" : "bg-cyan-500/10 border-cyan-500/20" },
          ].map(layer => (
            <div key={layer.label} className={`rounded-xl p-3 border ${layer.bg}`}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm">{layer.icon}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{layer.label}</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1.5">
                <span className={`text-xl font-black tabular-nums ${layer.color}`}>{layer.pct}%</span>
              </div>
              <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${layer.pct > 70 ? "bg-rose-500" : layer.pct > 40 ? "bg-amber-500" : "bg-sky-500"}`}
                  style={{ width: `${layer.pct}%` }}
                />
              </div>
              <div className={`text-[10px] font-semibold mt-1 ${layer.color}`}>
                {layer.pct >= 90 ? "Coperto" : layer.pct >= 70 ? "Molto coperto" : layer.pct >= 50 ? "Parz. coperto" : layer.pct >= 30 ? "Variabile" : layer.pct >= 10 ? "Poco nuvoloso" : "Sereno"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════ FLIGHT METRICS ══════════════ */}
      <div className="px-6 py-4 border-b border-slate-700/30">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">Parametri di volo</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Thermal rate */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 rounded-xl p-3 border border-orange-500/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Wind className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] text-orange-400/70 font-bold uppercase">Rateo termico</span>
            </div>
            <span className="text-2xl font-black text-orange-300 tabular-nums">{avgThermalRate.toFixed(1)}</span>
            <span className="text-xs text-orange-400/60 font-bold ml-1">m/s</span>
            <div className="mt-1.5 h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all" style={{ width: `${Math.min(100, avgThermalRate / 4 * 100)}%` }} />
            </div>
          </div>

          {/* Cloud base (compact) */}
          <div className="bg-gradient-to-br from-sky-500/10 to-sky-600/5 rounded-xl p-3 border border-sky-500/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[10px] text-sky-400/70 font-bold uppercase">Base cumuli</span>
            </div>
            <span className="text-2xl font-black text-sky-300 tabular-nums">{cloudBase}</span>
            <span className="text-xs text-sky-400/60 font-bold ml-1">m</span>
            <div className="mt-1.5 text-[10px] text-sky-400/50 font-semibold">
              +{Math.round(cloudBase - siteAlt)}m sopr.
            </div>
          </div>

          {/* Freezing level */}
          <div className={`bg-gradient-to-br ${avgFreezing < siteAlt + 2000 ? "from-rose-500/10 to-rose-600/5 border-rose-500/20" : "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20"} rounded-xl p-3 border`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Mountain className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[10px] text-violet-400/70 font-bold uppercase">Zero termico</span>
            </div>
            <span className={`text-2xl font-black tabular-nums ${avgFreezing < siteAlt + 2000 ? "text-rose-300" : "text-violet-300"}`}>
              {avgFreezing}
            </span>
            <span className="text-xs text-violet-400/60 font-bold ml-1">m</span>
            <div className="mt-1.5 text-[10px] text-violet-400/50 font-semibold">
              {avgFreezing > siteAlt ? `+${Math.round(avgFreezing - siteAlt)}m sopr.` : "Sotto il decollo"}
            </div>
          </div>

          {/* CAPE */}
          <div className={`bg-gradient-to-br ${avgCape > 600 ? "from-amber-500/10 to-amber-600/5 border-amber-500/20" : "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"} rounded-xl p-3 border`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-amber-400/70 font-bold uppercase">CAPE</span>
            </div>
            <span className={`text-2xl font-black tabular-nums ${avgCape > 600 ? "text-amber-300" : "text-emerald-300"}`}>
              {Math.round(avgCape)}
            </span>
            <span className="text-xs text-amber-400/60 font-bold ml-1">J/kg</span>
            <div className="mt-1.5 h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${avgCape > 600 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, avgCape / 1500 * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ MORE METRICS (collapsible) ══════════════ */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-6 py-3 border-b border-slate-700/30 flex items-center justify-between hover:bg-slate-800/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Analisi stabilità &amp; vento</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-[9px] text-slate-400 font-bold">+5</span>
        </div>
        {showDetails ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {showDetails && (
        <div className="px-6 py-4 border-b border-slate-700/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Spread / Instability */}
            <div className={`rounded-xl p-3 border ${avgSpread > 1.5 ? "bg-rose-500/10 border-rose-500/30" : avgSpread > 1.0 ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">ΔT/100m</div>
              <span className={`text-xl font-black tabular-nums ${avgSpread > 1.5 ? "text-rose-300" : avgSpread > 1.0 ? "text-amber-300" : "text-emerald-300"}`}>
                {avgSpread.toFixed(2)}
              </span>
              <div className="text-[10px] font-semibold mt-0.5 opacity-70">{instabilityLabel}</div>
            </div>

            {/* Lifted Index */}
            <div className={`rounded-xl p-3 border ${avgLi < -4 ? "bg-rose-500/10 border-rose-500/30" : avgLi < 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Lifted Index</div>
              <span className={`text-xl font-black tabular-nums ${avgLi < -4 ? "text-rose-300" : avgLi < 0 ? "text-amber-300" : "text-emerald-300"}`}>
                {avgLi.toFixed(1)}
              </span>
              <div className="text-[10px] font-semibold mt-0.5 opacity-70">
                {avgLi < -4 ? "Estremamente instabile" : avgLi < 0 ? "Instabile" : "Stabile"}
              </div>
            </div>

            {/* Rain probability */}
            <div className={`rounded-xl p-3 border ${nextRainProb > 40 ? "bg-rose-500/10 border-rose-500/30" : nextRainProb > 20 ? "bg-amber-500/10 border-amber-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Pioggia (6h)</div>
              <span className={`text-xl font-black tabular-nums ${nextRainProb > 40 ? "text-rose-300" : nextRainProb > 20 ? "text-amber-300" : "text-emerald-300"}`}>
                {Math.round(nextRainProb)}%
              </span>
              <div className="mt-1.5 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${nextRainProb > 40 ? "bg-rose-500" : nextRainProb > 20 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${nextRainProb}%` }} />
              </div>
            </div>

            {/* Flight window */}
            <div className="rounded-xl p-3 border border-sky-500/20 bg-sky-500/5">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Finestra volo</div>
              <span className="text-lg font-black text-sky-300 tabular-nums leading-tight">{flightWindow}</span>
              <div className="text-[10px] text-sky-400/60 font-semibold mt-0.5">{flightHours} ore favorevoli</div>
            </div>
          </div>

          {/* Wind profile */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-1">
                <Wind className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-400 font-bold">Suolo (10m)</span>
              </div>
              <div className="text-xl font-black text-cyan-300 tabular-nums">
                {Math.round(windSpeed)} <span className="text-sm text-cyan-400/60">km/h {dirLabel(windDir)}</span>
              </div>
              {windGusts > 0 && (
                <div className="text-xs text-slate-500 font-semibold mt-0.5">Raffiche {Math.round(windGusts)} km/h</div>
              )}
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-1">
                <Wind className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-slate-400 font-bold">Quota ~2000m</span>
              </div>
              <div className="text-xl font-black text-violet-300 tabular-nums">
                {wind2000m != null ? `${wind2000m} km/h ${dirLabel(dir2000m ?? 0)}` : "—"}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                Wind shear: {waveIndex.toFixed(0)}°
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ WARNINGS / GOOD ══════════════ */}
      {warnings.length > 0 ? (
        <div className="px-6 py-4 bg-orange-500/10 border-t border-orange-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-sm font-black uppercase tracking-wider">Attenzione ({warnings.length})</span>
          </div>
          <div className="space-y-1.5">
            {warnings.slice(0, 5).map((w, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-xs font-medium py-1.5 px-2.5 rounded-lg ${
                  w.type === "danger" ? "bg-rose-500/10 text-rose-200/90 border border-rose-500/20" :
                  w.type === "warning" ? "bg-amber-500/10 text-amber-200/90 border border-amber-500/20" :
                  "bg-sky-500/10 text-sky-200/90 border border-sky-500/20"
                }`}
              >
                <span className="shrink-0">{w.icon}</span>
                {w.text}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 py-4 bg-emerald-500/10 border-t border-emerald-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 text-sm font-bold">✓ Condizioni favorevoli per il volo — nessun warning attivo</span>
          </div>
        </div>
      )}
    </div>
  );
}
