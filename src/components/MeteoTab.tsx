"use client";

import type { MeteoCurrent } from "@/services/openMeteoService";
import type { HourData } from "@/types/meteo";
import {
  Zap, Calendar, MapPin, Wind, Thermometer, Droplets, Eye,
  Mountain, Cloud, Activity, AlertTriangle, CheckCircle2,
  CloudRain, ChevronDown, ChevronUp, Sun, Radiation,
  ArrowUp, CloudSnow, ArrowRight, TrendingUp,
  TrendingDown, Minus
} from "lucide-react";
import { useState } from "react";

interface MeteoTabProps {
  currentData: MeteoCurrent | null;
  dayData: HourData[];
  site: { alt: number; name?: string; orientation?: string };
  thermalDelta: number;
  modelName?: string;
  selectedHour?: number;
  selectedDay?: number;
  cape?: number | null;
  liftedIndex?: number | null;
  cin?: number | null;
}

import { calcCloudBase } from "@/utils/calcCloudBase";

function calcLCL(siteAlt: number, t: number, dew: number): number {
  // LCL più preciso (formula di Bolton 1980), usato come riferimento secondario
  const a = 17.27;
  const b = 237.7;
  const gamma = (a * dew / (b + dew)) + Math.log((dew + 273.15) / (t + 273.15));
  if (gamma <= 0) return siteAlt;
  return Math.round(siteAlt + (b * (t + 273.15) * gamma) / (a * (t - dew)));
}

function calcMixingRatio(t: number, rh: number) {
  const es = 6.112 * Math.exp((17.67 * t) / (t + 243.5));
  const e = es * rh / 100;
  return 622 * e / (1013.25 - e);
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
  return "text-fuchsia-300";
}

function getCelCoverGradient(pct: number) {
  if (pct >= 80) return "from-slate-500 to-slate-600";
  if (pct >= 50) return "from-sky-500 to-sky-600";
  if (pct >= 20) return "from-sky-400 to-sky-500";
  return "from-fuchsia-400 to-fuchsia-500";
}

function getSignalColor(signal: string) {
  return signal === "green" ? "from-emerald-500/20 to-emerald-600/5" :
         signal === "yellow" ? "from-sky-500/20 to-sky-600/5" :
         "from-rose-500/20 to-rose-600/5";
}

function getSignalBorder(signal: string) {
  return signal === "green" ? "border-emerald-500/30" :
         signal === "yellow" ? "border-sky-500/30" :
         "border-rose-500/30";
}

function getSignalBg(signal: string) {
  return signal === "green" ? "bg-emerald-500/10 border-emerald-500/30" :
         signal === "yellow" ? "bg-sky-500/10 border-sky-500/30" :
         "bg-rose-500/10 border-rose-500/30";
}

function getSignalText(signal: string) {
  return signal === "green" ? "text-emerald-400" :
         signal === "yellow" ? "text-sky-400" :
         "text-rose-400";
}

function getSignalDot(signal: string) {
  return signal === "green" ? "bg-emerald-400 shadow-emerald-400/50" :
         signal === "yellow" ? "bg-sky-400 shadow-sky-400/50" :
         "bg-rose-400 shadow-rose-400/50";
}

function getSignalEmoji(signal: string) {
  return signal === "green" ? "✓" : signal === "yellow" ? "⚠" : "✗";
}

function getUVLabel(uv: number) {
  if (uv >= 11) return "Estremo";
  if (uv >= 8) return "Molto elevato";
  if (uv >= 6) return "Elevato";
  if (uv >= 3) return "Moderato";
  return "Basso";
}

function getUVColor(uv: number) {
  if (uv >= 11) return "text-purple-400";
  if (uv >= 8) return "text-rose-400";
  if (uv >= 6) return "text-orange-400";
  if (uv >= 3) return "text-amber-400";
  return "text-emerald-400";
}

export default function MeteoTab({ currentData, dayData, site, thermalDelta, modelName, selectedHour, selectedDay = 0, cape: propCape, liftedIndex: propLi, cin: propCin }: MeteoTabProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
  const cinVal = currentData.cin ?? propCin ?? 0;
  const feelsLike = currentData.apparentTemp ?? t;

  // Cloud cover
  const cloudCover = currentData.cloudCover ?? 0;
  const cloudCoverLow = currentData.cloudCoverLow ?? 0;
  const cloudCoverMid = currentData.cloudCoverMid ?? 0;
  const cloudCoverHigh = currentData.cloudCoverHigh ?? 0;

  // === Calcoli per il volo ===
  const cloudBase = calcCloudBase(siteAlt, t, dew);
  const lcl = calcLCL(siteAlt, t, dew);
  const spread = Math.max(0.5, t - dew);
  const mixingRatio = calcMixingRatio(t, humidity);
  const avgCape = dayData.reduce((s, h) => s + (h.cape ?? 0), 0) / dayData.length;
  const avgLi = dayData.reduce((s, h) => s + (h.liftedIndex ?? 0), 0) / dayData.length;
  const avgSpread = dayData.reduce((s, h) => s + Math.max(0.5, (h.temperature ?? t) - (h.dewPoint ?? dew)), 0) / dayData.length;
  const avgThermalRate = Math.min(4, Math.max(0.3, avgSpread * 0.25 + avgCape * 0.001));
  const maxThermalRate = Math.min(4, Math.max(0.3, avgSpread * 0.3 + (avgCape * 1.5) * 0.001));

  // Stima altezza massima termica — stessa formula di ProfessionalWindgram per coerenza
  const currentRateo = Math.max(0.4, Math.min(2.5, avgThermalRate));
  const thermalTop = Math.round(Math.min(4000, cloudBase + Math.min(800, currentRateo * 100 + avgCape * 0.1)));

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

  // Vento in quota (850hPa ~ 1500m)
  const midData = dayData.slice(8, 16);
  const valid850 = midData.filter(h => h.windSpeed850 != null);
  const dir850Use = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windDir850 ?? 0), 0) / valid850.length : null;
  const wind850 = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windSpeed850 ?? 0), 0) / valid850.length : null;
  const waveIndex = calcWaveIndex(windDir, dir850Use ?? 180);

  // Vento a quote intermedie (80m, 120m, 180m)
  const midDay = dayData[Math.floor(dayData.length / 2)] ?? dayData[0];
  const wind80m = midDay.windSpeed80m ?? null;
  const windDir80m = midDay.windDir80m ?? null;
  const wind120m = midDay.windSpeed120m ?? null;
  const windDir120m = midDay.windDir120m ?? null;
  const wind180m = midDay.windSpeed180m ?? null;
  const windDir180m = midDay.windDir180m ?? null;

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

  // Radiazione solare giornaliera e durata soleggiamento
  const totalRadiation = dayData.reduce((s, h) => s + (h.shortwaveRadiation ?? h.radiation ?? 0), 0);
  const totalSunshine = dayData.reduce((s, h) => s + (h.sunshineDuration ?? 0), 0);
  const maxUV = Math.max(...dayData.map(h => h.uvIndex ?? 0));
  const minUV = Math.min(...dayData.map(h => h.uvIndex ?? 0));

  // Tendenza pressione (confronto prime 6h vs ultime 6h)
  const first6h = dayData.slice(0, 6);
  const last6h = dayData.slice(-6);
  const avgPressureFirst = first6h.reduce((s, h) => s + (h.pressure ?? 1013), 0) / first6h.length;
  const avgPressureLast = last6h.reduce((s, h) => s + (h.pressure ?? 1013), 0) / last6h.length;
  const pressureTrend = avgPressureLast - avgPressureFirst;
  const pressureTrendLabel = pressureTrend > 2 ? "↑ In rialzo" : pressureTrend < -2 ? "↓ In calo" : "→ Stabile";
  const pressureTrendColor = pressureTrend > 2 ? "text-emerald-400" : pressureTrend < -2 ? "text-rose-400" : "text-slate-400";

  // Turbolenza stimata (gust ratio + shear)
  const gustRatio = windGusts > 0 ? windGusts / windSpeed : 1;
  const turbulenceLevel = gustRatio > 1.8 ? "Alta" : gustRatio > 1.4 ? "Moderata" : "Bassa";
  const turbulenceColor = gustRatio > 1.8 ? "text-rose-400" : gustRatio > 1.4 ? "text-violet-400" : "text-emerald-400";

  // Orario pioggia
  const rainHours = dayData.filter(h => (h.precipitationProba ?? 0) > 30).map(h => ({
    hour: h.time instanceof Date ? h.time.getHours() : new Date(h.time).getHours(),
    prob: h.precipitationProba ?? 0
  }));

  // Evapotraspirazione giornaliera
  const et0 = dayData.reduce((s, h) => s + (h.evapotranspiration ?? h.et0 ?? 0), 0);

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
  if (pressureTrend < -3) warnings.push({ icon: "🌧️", text: "Pressione in deciso calo → peggioramento atteso", type: "warning" });
  if (gustRatio > 1.8) warnings.push({ icon: "🌀", text: "Turbolenza elevata — raffiche forti", type: "danger" });
  if (cinVal > 500) warnings.push({ icon: "🛑", text: `Inibizione convettiva alta (CIN ${Math.round(cinVal)}) — termiche soppresse`, type: "warning" });
  if (cloudCover >= 90 && avgCape < 100) warnings.push({ icon: "☁️", text: "Cielo completamente coperto senza energia termica — termiche inibite", type: "warning" });
  if (spread < 2 && humidity > 80) warnings.push({ icon: "💨", text: "Aria molto umida e stable — termiche deboli attese", type: "warning" });

  const instabilityLabel = avgSpread > 1.5 ? "fortemente instabile"
    : avgSpread > 1.0 ? "moderatamente instabile"
    : avgSpread > 0.6 ? "instabile"
    : "stabile";

  const wind2000m = wind850 != null ? Math.round(wind850 * 1.15) : null;
  const dir2000m = dir850Use != null ? Math.round(dir850Use + 10) : null;

  const windAngle = (windDir + 180) % 360;

  const isFlyable = signal === "green";
  const isMaybeFlyable = signal === "yellow";
  const isNotFlyable = signal === "red";
  const lowCloudRisk = cloudBase < siteAlt + 500;
  const veryLowCloudRisk = cloudBase < siteAlt + 300;

  // Giuvizio tattico
  const tactics: string[] = [];
  if (avgThermalRate > 2) tactics.push("Termiche vigorose — valutare scelte tra vallette");
  if (avgThermalRate > 1.5 && avgThermalRate <= 2) tactics.push("Termiche medie — volo possibile con tecnica");
  if (avgThermalRate <= 1) tactics.push("Termiche deboli — preferire volo di cresta se vento adatto");
  if (windSpeed > 15 && windSpeed <= 25) tactics.push(`Vento da ${dirLabel(windDir)} — orientare decollo controvento`);
  if (windSpeed > 10 && windSpeed <= 15) tactics.push("Vento moderato — attenzione a rafaghe e turbolenza");
  if (cloudBase > siteAlt + 800) tactics.push("Ottima base cumuli — ampio spazio di manovra");
  if (wind850 != null && wind850 > 30) tactics.push("Vento forte in quota — attenzione a decollo e atterraggio");
  if (waveIndex < 40 && wind850 != null && wind850 > 15) tactics.push("Possibile onda montana — provare quote superiori");
  if (avgLi < -2) tactics.push("Instabilità pomeridiana — volare al mattino presto");
  if (pressureTrend > 2) tactics.push("Alta pressione in rinforzo — condizioni che migliorano");
  if (pressureTrend < -2) tactics.push("Bassa pressione in avvicinamento — attenzione al peggioramento");
  if (humidity > 70 && avgCape > 200) tactics.push("Umidità elevata — cumuli sviluppati ma rischio fulmine");
  if (flightHours > 6) tactics.push("Lunga finestra di volo — scegliere il momento migliore");
  if (cloudCover >= 85 && avgCape < 200) tactics.push("Cielo coperto — termiche soppresse, volo di pendio solo");
  if (wind2000m != null && Math.abs(wind2000m - windSpeed) > 15) tactics.push("Notevole wind shear — attenzione alla transizione tra strati");

  return (
    <div className={`bg-gradient-to-br ${getSignalColor(signal)} border ${getSignalBorder(signal)} rounded-2xl overflow-hidden shadow-2xl`}>

      {/* ══════════════ HEADER ══════════════ */}
      <div className="px-6 py-4 border-b border-slate-700/40 bg-gradient-to-r from-transparent via-slate-800/30 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/10 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-shadow group">
              <MapPin className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">{siteName || "Decollo"}</h2>
                {orientation && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700/60 border border-slate-600/40 text-[10px] font-bold text-slate-400 backdrop-blur-sm">
                    <Wind className="w-3 h-3" />{orientation}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <Calendar className="w-3 h-3 text-slate-600" />
                <span className="font-medium text-slate-400">{(() => { const d = new Date(); d.setDate(d.getDate() + selectedDay); return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }); })()}</span>
                <span className="text-slate-700">·</span>
                <span className="font-semibold text-slate-300">{siteAlt}m</span>
                <span className="text-slate-700">·</span>
                <span className="text-slate-500">{modelName || "Open-Meteo"}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`relative px-4 py-2 rounded-2xl border ${getSignalBg(signal)} backdrop-blur-sm`}>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${getSignalDot(signal)} shadow-sm animate-pulse`} style={{ boxShadow: '0 0 8px 2px currentColor' }} />
                <span className={`text-sm font-black tracking-wider ${getSignalText(signal)}`}>{signalLabel}</span>
              </div>
              {signal === "green" && <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-emerald-400/30 rounded-full blur-sm" />}
            </div>
            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              {weatherCode >= 95 ? <Zap className="w-3 h-3 text-rose-400 animate-pulse" /> :
               weatherCode >= 80 ? <CloudRain className="w-3 h-3 text-sky-400" /> :
               weatherCode >= 30 ? <Cloud className="w-3 h-3 text-slate-400" /> :
               weatherCode >= 10 ? <Cloud className="w-3 h-3 text-sky-300" /> :
               <Sun className="w-3 h-3 text-amber-400 animate-spin-slow" />}
              <span className="text-slate-400">{getWeatherDescription(weatherCode)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════ HERO ══════════════ */}
      <div className="px-6 py-5 border-b border-slate-700/30 bg-gradient-to-br from-slate-900/40 via-slate-800/30 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shadow-lg shadow-slate-900/50">
                <span className="text-4xl select-none weather-icon">
                  {weatherCode >= 95 ? '⛈️' : weatherCode >= 80 ? '🌧️' : weatherCode >= 30 ? '☁️' : weatherCode >= 10 ? '🌤️' : '☀️'}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                <span className="text-[8px]">{Math.round(t > feelsLike ? 1 : t < feelsLike ? -1 : 0)}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Condizioni attuali</div>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-black text-white tabular-nums leading-none">{Math.round(t)}</span>
                <span className="text-2xl text-slate-400 font-black -mt-1">°C</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-slate-400">Percepiti <strong className="text-slate-300">{Math.round(feelsLike)}°</strong></span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">{getWeatherDescription(weatherCode)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Vento</div>
              <div className="flex items-baseline justify-end gap-1.5">
                <span className="text-5xl font-black text-cyan-300 tabular-nums leading-none">{Math.round(windSpeed)}</span>
                <span className="text-sm text-cyan-400/70 font-black">km/h</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-xs font-black text-cyan-300" title={`${windDir}°`}>
                  <Wind className="w-3 h-3" />{dirLabel(windDir)}
                </span>
              </div>
              {windGusts > 0 && (
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className="text-[10px] text-slate-500 font-semibold">Raffiche</span>
                  <span className="flex items-center gap-0.5 text-[10px] text-rose-400/80 font-black">
                    <ArrowUp className="w-2.5 h-2.5 rotate-45" />{Math.round(windGusts)}
                  </span>
                  <span className="text-[10px] text-slate-600">km/h</span>
                </div>
              )}
            </div>
            <div className="relative w-20 h-20 flex-shrink-0">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full bg-slate-800/90 border-2 border-slate-700/70 shadow-2xl shadow-slate-900/60" />
              {/* Tick marks */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                <div
                  key={deg}
                  className="absolute w-px bg-slate-600/60 origin-center"
                  style={{
                    height: deg % 90 === 0 ? '6px' : '4px',
                    top: deg % 90 === 0 ? '1px' : '3px',
                    left: '50%',
                    transform: `translateX(-50%) rotate(${deg}deg) translateY(0)`,
                    transformOrigin: '50% 35px',
                  }}
                />
              ))}
              {/* Cardinal labels */}
              <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[7px] font-black text-slate-500">N</span>
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] font-black text-slate-500">S</span>
              <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-500">O</span>
              <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[7px] font-black text-slate-500">E</span>
              {/* Animated compass needle */}
              <div
                className="absolute inset-2 rounded-full flex items-center justify-center"
                style={{ transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', transform: `rotate(${windAngle}deg)` }}
              >
                {/* Needle body */}
                <div className="relative w-1 h-8 flex flex-col items-center">
                  {/* Arrow head */}
                  <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-cyan-400 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 6px rgba(34,211,238,0.5))' }} />
                  {/* Needle shaft */}
                  <div className="w-1 h-5 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-full shadow-sm" />
                </div>
                {/* Counterweight */}
                <div className="w-1 h-3 bg-slate-500 rounded-full absolute -bottom-1" />
              </div>
              {/* Center dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-600 border border-slate-500 shadow-sm z-10" />
              </div>
              {/* Direction degree text */}
              <div className="absolute inset-0 flex items-center justify-center pt-5">
                <span className="text-[8px] font-black text-cyan-400/70 tabular-nums">{windDir}°</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2.5 mt-4">
          <div className="metric-card bg-slate-800/50 hover:bg-slate-800/80 hover:border-sky-500/40 hover:shadow-md hover:shadow-sky-500/5 rounded-xl p-3 border border-slate-700/30 cursor-default group">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-sky-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Umidità</span>
            </div>
            <span className="text-xl font-black text-sky-300 tabular-nums">{humidity}%</span>
            <div className="h-1 bg-slate-700/50 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full transition-all" style={{ width: `${humidity}%` }} />
            </div>
          </div>
          <div className="metric-card bg-slate-800/50 hover:bg-slate-800/80 hover:border-violet-500/40 hover:shadow-md hover:shadow-violet-500/5 rounded-xl p-3 border border-slate-700/30 cursor-default group">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Thermometer className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">P. rugiada</span>
            </div>
            <span className="text-xl font-black text-violet-300 tabular-nums">{Math.round(dew)}°</span>
            <div className="h-1 bg-slate-700/50 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all" style={{ width: `${Math.min(100, (dew / (t + 5)) * 100)}%` }} />
            </div>
          </div>
          <div className="metric-card bg-slate-800/50 hover:bg-slate-800/80 hover:border-violet-500/40 hover:shadow-md hover:shadow-violet-500/5 rounded-xl p-3 border border-slate-700/30 cursor-default group">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-violet-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Pressione</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-violet-300 tabular-nums">{Math.round(pressure)}</span>
              <span className="text-[9px] text-violet-400/60 font-bold">hPa</span>
            </div>
            <div className="flex items-center gap-0.5 mt-1.5 text-[10px] font-semibold">
              {pressureTrend > 2 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : pressureTrend < -2 ? <TrendingDown className="w-3 h-3 text-rose-400" /> : <Minus className="w-3 h-3 text-slate-500" />}
              <span className={pressureTrendColor}>{pressureTrendLabel}</span>
            </div>
          </div>
          <div className="metric-card bg-slate-800/50 hover:bg-slate-800/80 hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 rounded-xl p-3 border border-slate-700/30 cursor-default group">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Visibilità</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-300 tabular-nums">{Math.round(visibility / 1000)}</span>
              <span className="text-[9px] text-emerald-400/60 font-bold">km</span>
            </div>
            <div className="h-1 bg-slate-700/50 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(100, (visibility / 15000) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ VERDETTO VOLO ══════════════ */}
      <div className="px-6 py-4 border-b border-slate-700/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-black">Verdetto volo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-semibold">{flightHours}h favorevoli</span>
            <span className="text-slate-700">·</span>
            <span className="text-[10px] text-slate-500 font-semibold">{flightWindow}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Signal card */}
          <div className={`relative rounded-2xl p-4 border overflow-hidden group ${getSignalBg(signal)}`}>
            <div className={`absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity`} style={{ background: signal === 'green' ? 'radial-gradient(circle at 30% 50%, #10b981, transparent 70%)' : signal === 'yellow' ? 'radial-gradient(circle at 30% 50%, #0ea5e9, transparent 70%)' : 'radial-gradient(circle at 30% 50%, #f43f5e, transparent 70%)' }} />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black border ${signal === "green" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/10" : signal === "yellow" ? "bg-sky-500/20 border-sky-500/40 text-sky-400 shadow-lg shadow-sky-500/10" : "bg-rose-500/20 border-rose-500/40 text-rose-400 shadow-lg shadow-rose-500/10"}`}>
                  {getSignalEmoji(signal)}
                </div>
                <div>
                  <div className={`text-base font-black ${getSignalText(signal)}`}>{signalLabel}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {isFlyable ? "Volo consigliato" : isMaybeFlyable ? "Valuta con attenzione" : "Non volare"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                {isFlyable ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : isMaybeFlyable ? <AlertTriangle className="w-3 h-3 text-amber-400" /> : <AlertTriangle className="w-3 h-3 text-rose-400" />}
                <span>{isFlyable ? "Tutti i parametri nella norma" : isMaybeFlyable ? "Qualche criticità da monitorare" : "Parametri critici rilevati"}</span>
              </div>
            </div>
          </div>

          {/* Cloud cover card */}
          <div className="rounded-2xl p-4 border border-slate-700/40 bg-slate-800/50 hover:bg-slate-800/70 transition-colors group">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Cloud className="w-4 h-4 text-sky-400" />
              </div>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Copertura cielo</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className={`text-3xl font-black tabular-nums ${getCloudCoverColor(cloudCover)}`}>{cloudCover}%</span>
              <span className="text-xs text-slate-500 font-semibold">{getCloudCoverLabel(cloudCover)}</span>
            </div>
            <div className="space-y-1.5">
              {cloudCover > 0 && (
                <>
                  <div className="flex items-center gap-2 text-[9px] text-slate-500">
                    <span className="w-4 text-right">B</span>
                    <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500/70 rounded-full" style={{ width: `${cloudCoverLow}%` }} />
                    </div>
                    <span className="w-6 text-sky-400 font-bold tabular-nums">{cloudCoverLow}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-slate-500">
                    <span className="w-4 text-right">M</span>
                    <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500/70 rounded-full" style={{ width: `${cloudCoverMid}%` }} />
                    </div>
                    <span className="w-6 text-violet-400 font-bold tabular-nums">{cloudCoverMid}%</span>
                  </div>
                  <div className="flex items-center gap-2 text-[9px] text-slate-500">
                    <span className="w-4 text-right">A</span>
                    <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="h-full bg-fuchsia-500/70 rounded-full" style={{ width: `${cloudCoverHigh}%` }} />
                    </div>
                    <span className="w-6 text-fuchsia-400 font-bold tabular-nums">{cloudCoverHigh}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cloud base card */}
          <div className={`relative rounded-2xl p-4 border overflow-hidden ${veryLowCloudRisk ? "bg-rose-500/10 border-rose-500/30" : lowCloudRisk ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"} group`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${veryLowCloudRisk ? "bg-rose-500/20" : lowCloudRisk ? "bg-violet-500/20" : "bg-emerald-500/20"}`}>
                <Mountain className={`w-4 h-4 ${veryLowCloudRisk ? "text-rose-400" : lowCloudRisk ? "text-violet-400" : "text-emerald-400"}`} />
              </div>
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Base cumuli</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className={`text-3xl font-black tabular-nums ${veryLowCloudRisk ? "text-rose-300" : lowCloudRisk ? "text-violet-300" : "text-sky-300"}`}>{Math.round(cloudBase)}</span>
              <span className="text-xs text-slate-500 font-semibold">m slm</span>
            </div>
            <div className={`text-xs font-bold mb-2 ${veryLowCloudRisk ? "text-rose-400" : lowCloudRisk ? "text-violet-400" : "text-emerald-400"}`}>
              {veryLowCloudRisk ? '⚠ Troppo bassa' : lowCloudRisk ? '↑ Marginale' : '✓ Buona'} (+{Math.round(cloudBase - siteAlt)}m)
            </div>
            <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`absolute top-0 h-full rounded-full transition-all ${veryLowCloudRisk ? "bg-rose-500" : lowCloudRisk ? "bg-violet-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, Math.max(0, ((cloudBase - siteAlt) / 1500) * 100))}%` }} />
              <div className="absolute top-0 h-full w-px bg-white/20" style={{ left: `${Math.min(100, Math.max(0, ((siteAlt + 500 - siteAlt) / 1500) * 100))}%` }} title="Soglia 500m" />
              <div className="absolute top-0 h-full w-px bg-white/30" style={{ left: `${Math.min(100, Math.max(0, ((siteAlt + 800 - siteAlt) / 1500) * 100))}%` }} title="Ottimale 800m" />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[9px] text-slate-600 font-mono">
              <span>{siteAlt}m</span>
              <span className={veryLowCloudRisk ? "text-rose-500/70" : lowCloudRisk ? "text-violet-500/70" : "text-emerald-500/70"}>+{Math.round(cloudBase - siteAlt)}m</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ RAIN TIMELINE ══════════════ */}
      {rainHours.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-700/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative">
              <CloudRain className="w-4 h-4 text-sky-400 animate-bounce" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Rischio piovaschi — 09:00 / 19:00</span>
            <div className="ml-auto flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" /> 10-30%</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" /> 30-50%</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" /> &gt;50%</span>
            </div>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
            {/* Header riga orari */}
            <div className="flex gap-1 mb-1.5">
              {[9,10,11,12,13,14,15,16,17,18,19].map(h => (
                <div key={h} className="flex-1 text-center">
                  <span className="text-[9px] font-black text-slate-500 tabular-nums">{String(h).padStart(2,"0")}</span>
                </div>
              ))}
            </div>
            {/* Barre rischio pioggia */}
            <div className="flex gap-1 items-end h-14">
              {[9,10,11,12,13,14,15,16,17,18,19].map(hour => {
                const entry = dayData.find(h => {
                  const hr = h.time instanceof Date ? h.time.getHours() : new Date(h.time).getHours();
                  return hr === hour;
                });
                const prob = entry ? (entry.precipitationProba ?? 0) : 0;
                const isNow = hour === now;
                const barColor = prob > 50 ? "from-rose-500 to-rose-400" : prob > 30 ? "from-violet-500 to-violet-400" : prob > 10 ? "from-sky-500 to-sky-400" : "from-slate-600 to-slate-500";
                const iconHour = () => {
                  if (prob > 50) return "🌧️";
                  if (prob > 30) return "🌦️";
                  if (prob > 10) return "☁️";
                  return hour >= 10 && hour <= 15 ? "☀️" : "🌙";
                };
                const iconKey = `icon-${hour}`;
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    {/* Icona animata */}
                    <div className={`h-4 flex items-center justify-center transition-all ${prob > 30 ? '' : 'opacity-60'}`}>
                      <span
                        key={hour}
                        className="text-xs leading-none"
                        style={prob > 30 ? { animation: `floatIcon 1.8s ease-in-out infinite` } : {}}
                      >{iconHour()}</span>
                    </div>
                    {/* Barra */}
                    <div className={`w-full rounded-md bg-gradient-to-t ${barColor} transition-all duration-500 group-hover:opacity-80`}
                         style={{ height: `${Math.max(4, prob)}%`, minHeight: `${Math.max(4, prob)}%`, animation: prob > 30 ? `growBar 0.8s ease-out ${hour * 0.05}s both` : undefined }} />
                    {isNow && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white shadow-sm shadow-white/50" />}
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 border border-slate-600 rounded-lg text-[10px] text-white font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                      {hour}:00 — {Math.round(prob)}% pioggia
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Fuso ora corrente */}
            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-white" /> ora attuale</span>
              <span>·</span>
              <span>09:00 → 19:00</span>
              <span>·</span>
              <span className="text-amber-400">🌧️ &gt;50%</span>
              <span>🌦️ 30-50%</span>
              <span>☁️ &lt;30%</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ CLOUD LAYERS ══════════════ */}
      <div className="px-6 py-4 border-b border-slate-700/30">
        <div className="flex items-center gap-2 mb-3"><Cloud className="w-4 h-4 text-sky-400" /><span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Strati nuvolosi</span></div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Basse", pct: cloudCoverLow, icon: "🌫️", color: cloudCoverLow > 70 ? "text-rose-400" : cloudCoverLow > 40 ? "text-violet-400" : "text-sky-400", bg: cloudCoverLow > 70 ? "bg-rose-500/10 border-rose-500/20" : cloudCoverLow > 40 ? "bg-violet-500/10 border-violet-500/20" : "bg-sky-500/10 border-sky-500/20" },
            { label: "Medie", pct: cloudCoverMid, icon: "☁️", color: cloudCoverMid > 70 ? "text-rose-400" : cloudCoverMid > 40 ? "text-violet-400" : "text-sky-300", bg: cloudCoverMid > 70 ? "bg-rose-500/10 border-rose-500/20" : cloudCoverMid > 40 ? "bg-violet-500/10 border-violet-500/20" : "bg-sky-500/10 border-sky-500/20" },
            { label: "Alte", pct: cloudCoverHigh, icon: "🌤️", color: cloudCoverHigh > 70 ? "text-slate-400" : cloudCoverHigh > 40 ? "text-sky-400" : "text-cyan-300", bg: cloudCoverHigh > 70 ? "bg-slate-500/10 border-slate-500/20" : cloudCoverHigh > 40 ? "bg-sky-500/10 border-sky-500/20" : "bg-cyan-500/10 border-cyan-500/20" },
          ].map(layer => (
            <div key={layer.label} className={`rounded-xl p-3 border ${layer.bg}`}>
              <div className="flex items-center gap-1.5 mb-2"><span className="text-sm">{layer.icon}</span><span className="text-[10px] text-slate-400 font-bold uppercase">{layer.label}</span></div>
              <div className="flex items-baseline gap-1 mb-1.5"><span className={`text-xl font-black tabular-nums ${layer.color}`}>{layer.pct}%</span></div>
              <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${layer.pct > 70 ? "bg-rose-500" : layer.pct > 40 ? "bg-violet-500" : "bg-sky-500"}`} style={{ width: `${layer.pct}%` }} /></div>
              <div className={`text-[10px] font-semibold mt-1 ${layer.color}`}>{layer.pct >= 90 ? "Coperto" : layer.pct >= 70 ? "Molto coperto" : layer.pct >= 50 ? "Parz. coperto" : layer.pct >= 30 ? "Variabile" : layer.pct >= 10 ? "Poco nuvoloso" : "Sereno"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════ FLIGHT METRICS ══════════════ */}
      <div className="px-6 py-4 border-b border-slate-700/30">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">Parametri di volo</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 rounded-xl p-3 border border-rose-500/20">
            <div className="flex items-center gap-1.5 mb-1.5"><Wind className="w-3.5 h-3.5 text-rose-400" /><span className="text-[10px] text-rose-400/70 font-bold uppercase">Rateo termico</span></div>
            <span className="text-2xl font-black text-rose-300 tabular-nums">{avgThermalRate.toFixed(1)}</span>
            <span className="text-xs text-rose-400/60 font-bold ml-1">m/s</span>
            <div className="mt-1.5 h-1 bg-slate-700/50 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full transition-all" style={{ width: `${Math.min(100, avgThermalRate / 4 * 100)}%` }} /></div>
          </div>
          <div className="bg-gradient-to-br from-sky-500/10 to-sky-600/5 rounded-xl p-3 border border-sky-500/20">
            <div className="flex items-center gap-1.5 mb-1.5"><Cloud className="w-3.5 h-3.5 text-sky-400" /><span className="text-[10px] text-sky-400/70 font-bold uppercase">Base cumuli</span></div>
            <span className="text-2xl font-black text-sky-300 tabular-nums">{Math.round(cloudBase)}</span>
            <span className="text-xs text-sky-400/60 font-bold ml-1">m</span>
            <div className="mt-1.5 text-[10px] text-sky-400/50 font-semibold">+{Math.round(cloudBase - siteAlt)}m sopr.</div>
          </div>
          <div className={`bg-gradient-to-br ${avgFreezing < siteAlt + 2000 ? "from-rose-500/10 to-rose-600/5 border-rose-500/20" : "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20"} rounded-xl p-3 border`}>
            <div className="flex items-center gap-1.5 mb-1.5"><Mountain className="w-3.5 h-3.5 text-violet-400" /><span className="text-[10px] text-violet-400/70 font-bold uppercase">Zero termico</span></div>
            <span className={`text-2xl font-black tabular-nums ${avgFreezing < siteAlt + 2000 ? "text-rose-300" : "text-violet-300"}`}>{avgFreezing}</span>
            <span className="text-xs text-violet-400/60 font-bold ml-1">m</span>
            <div className="mt-1.5 text-[10px] text-violet-400/50 font-semibold">{avgFreezing > siteAlt ? `+${Math.round(avgFreezing - siteAlt)}m sopr.` : "Sotto il decollo"}</div>
          </div>
          <div className={`bg-gradient-to-br ${avgCape > 600 ? "from-violet-500/10 to-violet-600/5 border-violet-500/20" : "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"} rounded-xl p-3 border`}>
            <div className="flex items-center gap-1.5 mb-1.5"><Zap className="w-3.5 h-3.5 text-violet-400" /><span className="text-[10px] text-violet-400/70 font-bold uppercase">CAPE</span></div>
            <span className={`text-2xl font-black tabular-nums ${avgCape > 600 ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(avgCape)}</span>
            <span className="text-xs text-violet-400/60 font-bold ml-1">J/kg</span>
            <div className="mt-1.5 h-1 bg-slate-700/50 rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${avgCape > 600 ? "bg-violet-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, avgCape / 1500 * 100)}%` }} /></div>
          </div>
        </div>
      </div>

      {/* ══════════════ ATTRAVERSAMENTO QUOTA ══════════════ */}
      <div className="px-6 py-4 border-b border-slate-700/30">
        <div className="flex items-center gap-2 mb-3">
          <ArrowUp className="w-4 h-4 text-sky-400" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Profili quota & evaporazione</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-sky-500/10 to-cyan-600/5 rounded-xl p-3 border border-sky-500/20">
            <div className="flex items-center gap-1.5 mb-1.5"><ArrowUp className="w-3.5 h-3.5 text-sky-400" /><span className="text-[10px] text-sky-400/70 font-bold uppercase">Top termica</span></div>
            <span className="text-2xl font-black text-sky-300 tabular-nums">{thermalTop}</span>
            <span className="text-xs text-sky-400/60 font-bold ml-1">m</span>
            <div className="text-[10px] text-sky-400/50 font-semibold mt-0.5">+{Math.round(thermalTop - siteAlt)}m dal suolo</div>
          </div>
          <div className={`bg-gradient-to-br ${cloudCover >= 90 ? "from-slate-500/10 to-slate-600/5 border-slate-500/30" : "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"} rounded-xl p-3 border`}>
            <div className="flex items-center gap-1.5 mb-1.5"><Cloud className="w-3.5 h-3.5 text-sky-400" /><span className="text-[10px] font-bold uppercase">Stato cielo</span></div>
            <span className={`text-xl font-black tabular-nums ${cloudCover >= 90 ? "text-slate-300" : cloudCover >= 70 ? "text-violet-300" : "text-emerald-300"}`}>
              {cloudCover >= 90 ? "Tot. coperto" : cloudCover >= 70 ? "Coperto" : cloudCover >= 50 ? "Var." : cloudCover >= 20 ? "Poco nuv." : "Sereno"}
            </span>
            <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{cloudCover}% copertura totale</div>
          </div>
          <div className={`bg-gradient-to-br ${avgFreezing < siteAlt + 2500 ? "from-rose-500/10 to-rose-600/5 border-rose-500/20" : "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20"} rounded-xl p-3 border`}>
            <div className="flex items-center gap-1.5 mb-1.5"><CloudSnow className="w-3.5 h-3.5 text-violet-400" /><span className="text-[10px] text-violet-400/70 font-bold uppercase">Zero termico</span></div>
            <span className={`text-xl font-black tabular-nums ${avgFreezing < siteAlt + 2500 ? "text-rose-300" : "text-cyan-300"}`}>{avgFreezing}</span>
            <span className="text-xs text-violet-400/60 font-bold ml-1">m slm</span>
            <div className="text-[10px] text-violet-400/50 font-semibold mt-0.5">{avgFreezing > siteAlt ? `+${Math.round(avgFreezing - siteAlt)}m sopr. decollo` : "⚠ Sotto il decollo!"}</div>
          </div>
          <div className="bg-gradient-to-br from-sky-500/10 to-sky-600/5 rounded-xl p-3 border border-sky-500/20">
            <div className="flex items-center gap-1.5 mb-1.5"><Droplets className="w-3.5 h-3.5 text-sky-400" /><span className="text-[10px] text-sky-400/70 font-bold uppercase">Evapotrnp.</span></div>
            <span className="text-xl font-black text-sky-300 tabular-nums">{et0.toFixed(1)}</span>
            <span className="text-xs text-sky-400/60 font-bold ml-1">mm/gg</span>
            <div className="text-[10px] text-sky-400/50 font-semibold mt-0.5">Perdita d'acqua stimata</div>
          </div>
        </div>
      </div>

      {/* ══════════════ AMBIENTE & RADIAZIONE ══════════════ */}
      <div className="px-6 py-4 border-b border-slate-700/30">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">Ambiente & radiazione</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl p-3 border border-fuchsia-500/20 bg-fuchsia-500/5">
            <div className="flex items-center gap-1.5 mb-1.5"><Sun className="w-3.5 h-3.5 text-fuchsia-400" /><span className="text-[10px] text-fuchsia-400/70 font-bold uppercase">UV indice</span></div>
            <span className={`text-2xl font-black tabular-nums ${getUVColor(uvIndex)}`}>{uvIndex}</span>
            <div className={`text-[10px] font-semibold mt-0.5 ${getUVColor(uvIndex)}`}>{getUVLabel(uvIndex)}</div>
          </div>
          <div className="rounded-xl p-3 border border-violet-500/20 bg-violet-500/5">
            <div className="flex items-center gap-1.5 mb-1.5"><Activity className="w-3.5 h-3.5 text-violet-400" /><span className="text-[10px] text-violet-400/70 font-bold uppercase">Tend. Pressione</span></div>
            <span className={`text-xl font-black tabular-nums ${pressureTrendColor}`}>{pressureTrendLabel}</span>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Δ {pressureTrend > 0 ? "+" : ""}{pressureTrend.toFixed(1)} hPa</div>
          </div>
          <div className="rounded-xl p-3 border border-rose-500/20 bg-rose-500/5">
            <div className="flex items-center gap-1.5 mb-1.5"><Radiation className="w-3.5 h-3.5 text-rose-400" /><span className="text-[10px] text-rose-400/70 font-bold uppercase">Radiazione</span></div>
            <span className="text-xl font-black text-rose-300 tabular-nums">{Math.round(totalRadiation)}</span>
            <div className="text-[10px] text-rose-400/60 font-semibold mt-0.5">Wh/m² totale</div>
          </div>
          <div className="rounded-xl p-3 border border-fuchsia-500/20 bg-fuchsia-500/5">
            <div className="flex items-center gap-1.5 mb-1.5"><Sun className="w-3.5 h-3.5 text-fuchsia-400" /><span className="text-[10px] text-fuchsia-400/70 font-bold uppercase">Soleggiamento</span></div>
            <span className="text-xl font-black text-fuchsia-300 tabular-nums">{Math.round(totalSunshine / 3600 * 10) / 10}</span>
            <div className="text-[10px] text-fuchsia-400/60 font-semibold mt-0.5">ore di sole</div>
          </div>
        </div>
      </div>

      {/* ══════════════ COLLAPSIBLE: Stability + Wind Profile ══════════════ */}
      <button onClick={() => setShowDetails(!showDetails)} className="w-full px-6 py-3 border-b border-slate-700/30 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
        <div className="flex items-center gap-2"><span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Analisi stabilità & vento</span><span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-[9px] text-slate-400 font-bold">+5</span></div>
        {showDetails ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {showDetails && (
        <div className="px-6 py-4 border-b border-slate-700/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`rounded-xl p-3 border ${avgSpread > 1.5 ? "bg-rose-500/10 border-rose-500/30" : avgSpread > 1.0 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">ΔT/100m</div>
              <span className={`text-xl font-black tabular-nums ${avgSpread > 1.5 ? "text-rose-300" : avgSpread > 1.0 ? "text-violet-300" : "text-emerald-300"}`}>{avgSpread.toFixed(2)}</span>
              <div className="text-[10px] font-semibold mt-0.5 opacity-70">{instabilityLabel}</div>
            </div>
            <div className={`rounded-xl p-3 border ${avgLi < -4 ? "bg-rose-500/10 border-rose-500/30" : avgLi < 0 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Lifted Index</div>
              <span className={`text-xl font-black tabular-nums ${avgLi < -4 ? "text-rose-300" : avgLi < 0 ? "text-violet-300" : "text-emerald-300"}`}>{avgLi.toFixed(1)}</span>
              <div className="text-[10px] font-semibold mt-0.5 opacity-70">{avgLi < -4 ? "Estremamente instabile" : avgLi < 0 ? "Instabile" : "Stabile"}</div>
            </div>
            <div className={`rounded-xl p-3 border ${nextRainProb > 40 ? "bg-rose-500/10 border-rose-500/30" : nextRainProb > 20 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Pioggia (6h)</div>
              <span className={`text-xl font-black tabular-nums ${nextRainProb > 40 ? "text-rose-300" : nextRainProb > 20 ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(nextRainProb)}%</span>
              <div className="mt-1.5 h-1 bg-slate-700/50 rounded-full overflow-hidden"><div className={`h-full rounded-full ${nextRainProb > 40 ? "bg-rose-500" : nextRainProb > 20 ? "bg-violet-500" : "bg-emerald-500"}`} style={{ width: `${nextRainProb}%` }} /></div>
            </div>
            <div className="rounded-xl p-3 border border-sky-500/20 bg-sky-500/5">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Finestra volo</div>
              <span className="text-lg font-black text-sky-300 tabular-nums leading-tight">{flightWindow}</span>
              <div className="text-[10px] text-sky-400/60 font-semibold mt-0.5">{flightHours} ore favorevoli</div>
            </div>
          </div>

          {/* Wind profile multi-level */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-1"><Wind className="w-4 h-4 text-cyan-400" /><span className="text-xs text-slate-400 font-bold">Suolo (10m)</span></div>
              <div className="text-xl font-black text-cyan-300 tabular-nums">{Math.round(windSpeed)} <span className="text-sm text-cyan-400/60">km/h {dirLabel(windDir)}</span></div>
              {windGusts > 0 && <div className="text-xs text-slate-500 font-semibold mt-0.5">Raffiche {Math.round(windGusts)} km/h</div>}
            </div>
            {wind80m != null && (
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1"><Wind className="w-4 h-4 text-sky-400" /><span className="text-xs text-slate-400 font-bold">80m</span></div>
                <div className="text-xl font-black text-sky-300 tabular-nums">{Math.round(wind80m)} <span className="text-sm text-sky-400/60">km/h {dirLabel(windDir80m ?? windDir)}</span></div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">~{siteAlt + 80}m slm</div>
              </div>
            )}
            {wind120m != null && (
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1"><Wind className="w-4 h-4 text-violet-400" /><span className="text-xs text-slate-400 font-bold">120m</span></div>
                <div className="text-xl font-black text-violet-300 tabular-nums">{Math.round(wind120m)} <span className="text-sm text-violet-400/60">km/h {dirLabel(windDir120m ?? windDir)}</span></div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">~{siteAlt + 120}m slm</div>
              </div>
            )}
            {wind180m != null && (
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1"><Wind className="w-4 h-4 text-purple-400" /><span className="text-xs text-slate-400 font-bold">180m</span></div>
                <div className="text-xl font-black text-purple-300 tabular-nums">{Math.round(wind180m)} <span className="text-sm text-purple-400/60">km/h {dirLabel(windDir180m ?? windDir)}</span></div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">~{siteAlt + 180}m slm</div>
              </div>
            )}
          </div>

          {wind2000m != null && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-r from-violet-900/30 to-violet-800/20 rounded-xl p-3 border border-violet-500/30">
                <div className="flex items-center gap-2 mb-1"><Wind className="w-4 h-4 text-violet-400" /><span className="text-xs text-violet-300 font-bold">Quota ~2000m (850hPa)</span></div>
                <div className="text-xl font-black text-violet-300 tabular-nums">{wind2000m} <span className="text-sm text-violet-400/60">km/h {dirLabel(dir2000m ?? 0)}</span></div>
                <div className="text-xs text-violet-400/60 font-semibold mt-0.5">Wind shear: {waveIndex.toFixed(0)}°</div>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1"><Wind className="w-4 h-4 text-rose-400" /><span className="text-xs text-slate-400 font-bold">Turbolenza</span></div>
                <div className={`text-xl font-black tabular-nums ${turbulenceColor}`}>{turbulenceLevel}</div>
                <div className="text-xs text-slate-500 font-semibold mt-0.5">Gust ratio: {gustRatio.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ COLLAPSIBLE: ADVANCED ══════════════ */}
      <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full px-6 py-3 border-b border-slate-700/30 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
        <div className="flex items-center gap-2"><span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Metriche avanzate</span><span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-[9px] text-slate-400 font-bold">+8</span></div>
        {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>

      {showAdvanced && (
        <div className="px-6 py-4 border-b border-slate-700/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`rounded-xl p-3 border ${cinVal > 200 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">CIN (Inibizione)</div>
              <span className={`text-xl font-black tabular-nums ${cinVal > 200 ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(cinVal)}</span>
              <span className="text-xs text-slate-500 font-bold ml-1">J/kg</span>
              <div className="text-[10px] font-semibold mt-0.5 opacity-70">{cinVal > 500 ? "Termiche soppresse" : cinVal > 200 ? "Leggera inibizione" : "Favorevole"}</div>
            </div>
            <div className="rounded-xl p-3 border border-fuchsia-500/20 bg-fuchsia-500/5">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">UV max giornaliero</div>
              <span className="text-xl font-black text-fuchsia-300 tabular-nums">{maxUV}</span>
              <span className="text-xs text-fuchsia-400/60 font-bold ml-1">{getUVLabel(maxUV)}</span>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Min {minUV}</div>
            </div>
            <div className="rounded-xl p-3 border border-violet-500/20 bg-violet-500/5">
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Pressione media</div>
              <span className="text-xl font-black text-violet-300 tabular-nums">{Math.round((avgPressureFirst + avgPressureLast) / 2)}</span>
              <span className="text-xs text-violet-400/60 font-bold ml-1">hPa</span>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{avgPressureFirst.toFixed(0)}→{avgPressureLast.toFixed(0)}</div>
            </div>
            <div className={`rounded-xl p-3 border ${avgThermalRate > 1.5 ? "bg-rose-500/10 border-rose-500/30" : avgThermalRate > 1 ? "bg-violet-500/10 border-violet-500/30" : "bg-sky-500/10 border-sky-500/30"}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Pot. termico</div>
              <span className={`text-xl font-black tabular-nums ${avgThermalRate > 1.5 ? "text-rose-300" : avgThermalRate > 1 ? "text-violet-300" : "text-sky-300"}`}>{avgThermalRate > 1.5 ? "Buono" : avgThermalRate > 1 ? "Discreto" : "Debole"}</span>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Max stimato {maxThermalRate.toFixed(1)} m/s</div>
            </div>
            <div className={`rounded-xl p-3 border ${avgSpread > 1.5 ? "bg-rose-500/10 border-rose-500/30" : avgSpread > 1.0 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Spread medio</div>
              <span className={`text-xl font-black tabular-nums ${avgSpread > 1.5 ? "text-rose-300" : avgSpread > 1.0 ? "text-violet-300" : "text-emerald-300"}`}>{avgSpread.toFixed(2)}</span>
              <span className="text-xs text-slate-500 font-bold ml-1">°C</span>
              <div className="text-[10px] font-semibold mt-0.5 opacity-70">T − Tδ medio</div>
            </div>
            <div className={`rounded-xl p-3 border ${cloudCover >= 90 ? "bg-slate-500/10 border-slate-500/30" : cloudCover >= 70 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Copertura cielo</div>
              <span className={`text-xl font-black tabular-nums ${cloudCover >= 90 ? "text-slate-300" : cloudCover >= 70 ? "text-violet-300" : "text-emerald-300"}`}>{cloudCover}%</span>
              <span className="text-xs text-slate-500 font-bold ml-1">{getCloudCoverLabel(cloudCover)}</span>
              <div className="text-[10px] font-semibold mt-0.5 opacity-70">Totale (basso+medio+alto)</div>
            </div>
            <div className={`rounded-xl p-3 border ${gustRatio > 1.8 ? "bg-rose-500/10 border-rose-500/30" : gustRatio > 1.4 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Gust ratio</div>
              <span className={`text-xl font-black tabular-nums ${gustRatio > 1.8 ? "text-rose-300" : gustRatio > 1.4 ? "text-violet-300" : "text-emerald-300"}`}>{gustRatio.toFixed(2)}</span>
              <div className="text-[10px] font-semibold mt-0.5 opacity-70">Raffiche / media</div>
            </div>
            <div className={`rounded-xl p-3 border ${(nextRainProb > 40 ? "bg-rose-500/10 border-rose-500/30" : nextRainProb > 20 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30")}`}>
              <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Pioggia 24h</div>
              <span className={`text-xl font-black tabular-nums ${(nextRainProb > 40 ? "text-rose-300" : nextRainProb > 20 ? "text-violet-300" : "text-emerald-300")}`}>{Math.round(dayData.reduce((s, h) => s + (h.precipitation ?? 0), 0))}</span>
              <span className="text-xs text-slate-500 font-bold ml-1">mm</span>
              <div className="text-[10px] font-semibold mt-0.5 opacity-70">Totale precipitazioni</div>
            </div>
          </div>

          {/* Wind gradient visual */}
          {(wind80m != null || wind120m != null || wind180m != null) && (
            <div className="mt-4 bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-3">Gradiente verticale del vento</div>
              <div className="space-y-2">
                {[
                  { label: "10m (suolo)", speed: windSpeed, dir: windDir, color: "bg-cyan-500" },
                  ...(wind80m != null ? [{ label: "80m", speed: wind80m, dir: windDir80m ?? windDir, color: "bg-sky-500" }] : []),
                  ...(wind120m != null ? [{ label: "120m", speed: wind120m, dir: windDir120m ?? windDir, color: "bg-violet-500" }] : []),
                  ...(wind180m != null ? [{ label: "180m", speed: wind180m, dir: windDir180m ?? windDir, color: "bg-purple-500" }] : []),
                  ...(wind2000m != null ? [{ label: "~2000m", speed: wind2000m, dir: dir2000m ?? windDir, color: "bg-rose-500" }] : []),
                ].map((layer, i, arr) => {
                  const maxW = Math.max(...arr.map(l => l.speed || 1));
                  const barWidth = ((layer.speed ?? 0) / maxW) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-bold w-16 shrink-0 text-right">{layer.label}</span>
                      <div className="flex-1 h-5 bg-slate-700/30 rounded-full overflow-hidden relative">
                        <div className={`h-full ${layer.color} rounded-full transition-all flex items-center justify-end pr-2`} style={{ width: `${Math.max(8, barWidth)}%` }}>
                          <span className="text-[9px] font-black text-white/90">{Math.round(layer.speed)} km/h</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold w-8 shrink-0">{dirLabel(layer.dir)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TACTICAL JUDGMENT ══════════════ */}
      {tactics.length > 0 && (
        <div className="px-6 py-4 border-b border-slate-700/30">
          <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Giudizio tattico</span></div>
          <div className="space-y-1.5">
            {tactics.map((tac, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
                <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                {tac}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ WARNINGS / GOOD ══════════════ */}
      {warnings.length > 0 ? (
        <div className="px-6 py-4 bg-slate-800/60 border-t border-slate-700/60">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-rose-400" /><span className="text-rose-400 text-sm font-black uppercase tracking-wider">Attenzione ({warnings.length})</span></div>
          <div className="space-y-1.5">
            {warnings.slice(0, 5).map((w, i) => (
              <div key={i} className={`flex items-start gap-2 text-xs font-medium py-1.5 px-2.5 rounded-lg ${w.type === "danger" ? "bg-rose-950/40 text-rose-200 border border-rose-800/40" : w.type === "warning" ? "bg-violet-950/40 text-violet-200 border border-violet-800/40" : "bg-sky-950/40 text-sky-200 border border-sky-800/40"}`}>
                <span className="shrink-0">{w.icon}</span>
                {w.text}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 py-4 bg-emerald-950/30 border-t border-emerald-800/40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 text-sm font-bold">✓ Condizioni favorevoli per il volo — nessun warning attivo</span>
          </div>
        </div>
      )}
    </div>
  );
}
