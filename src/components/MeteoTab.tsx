"use client";

import type { MeteoCurrent } from "@/services/openMeteoService";
import type { HourData } from "@/types/meteo";
import {
  MapPin, Wind, Thermometer, Droplets, Eye, Mountain, Cloud,
  Activity, AlertTriangle, CheckCircle2,
  Sun, Radiation, ArrowUp, CloudSnow, ArrowRight, TrendingUp,
  TrendingDown, Minus, CloudRain, Zap, Gauge, CloudOff, Timer, Plane
} from "lucide-react";
import { calcCloudBase } from "@/utils/calcCloudBase";

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

function dirLabel(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getWeatherDescription(code: number): string {
  if (code >= 95) return "Temporale";
  if (code >= 80) return "Pioggia";
  if (code >= 71) return "Neve";
  if (code >= 61) return "Pioggia leggera";
  if (code >= 45) return "Nebbia";
  if (code >= 30) return "Nuvoloso";
  if (code >= 20) return "Temporale lontano";
  if (code >= 10) return "Parzialmente nuvoloso";
  if (code >= 5) return "Nubi sparse";
  return "Sereno";
}

function getSignalColor(signal: "green" | "yellow" | "red") {
  return signal === "green" ? {
    border: "border-emerald-500/30",
    bgClass: "bg-emerald-500/10",
    text: "text-emerald-400",
    dotColor: "#34d399",
    badge: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  } : signal === "yellow" ? {
    border: "border-amber-500/30",
    bgClass: "bg-amber-500/10",
    text: "text-amber-400",
    dotColor: "#f59e0b",
    badge: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  } : {
    border: "border-rose-500/30",
    bgClass: "bg-rose-500/10",
    text: "text-rose-400",
    dotColor: "#fb7185",
    badge: "bg-rose-500/20 border-rose-500/40 text-rose-300",
  };
}

export default function MeteoTab({ currentData, dayData, site, thermalDelta, modelName, selectedDay = 0, cape: propCape, liftedIndex: propLi, cin: propCin }: MeteoTabProps) {
  if (!currentData || dayData.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-700/50 p-12 text-center">
        <Cloud className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-bold">Nessun dato meteo disponibile</p>
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
  const cloudCover = currentData.cloudCover ?? 0;
  const cloudCoverLow = currentData.cloudCoverLow ?? 0;
  const cloudCoverMid = currentData.cloudCoverMid ?? 0;
  const cloudCoverHigh = currentData.cloudCoverHigh ?? 0;
  const spread = Math.max(0.5, t - dew);

  // ── Calcoli per il volo ──
  const cloudBase = calcCloudBase(siteAlt, t, dew);
  const avgCape = dayData.reduce((s, h) => s + (h.cape ?? 0), 0) / dayData.length;
  const avgLi = dayData.reduce((s, h) => s + (h.liftedIndex ?? 0), 0) / dayData.length;
  const avgSpread = dayData.reduce((s, h) => s + Math.max(0.5, (h.temperature ?? t) - (h.dewPoint ?? dew)), 0) / dayData.length;
  const avgThermalRate = Math.min(4, Math.max(0.3, avgSpread * 0.25 + avgCape * 0.001));
  const thermalTop = Math.round(Math.min(4000, cloudBase + Math.min(800, avgThermalRate * 100 + avgCape * 0.1)));

  const midData = dayData.slice(8, 16);
  const valid850 = midData.filter(h => h.windSpeed850 != null);
  const dir850Use = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windDir850 ?? 0), 0) / valid850.length : null;
  const wind850 = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windSpeed850 ?? 0), 0) / valid850.length : null;
  const waveIndex = Math.abs(windDir - (dir850Use ?? windDir)) > 180 ? 360 - Math.abs(windDir - (dir850Use ?? windDir)) : Math.abs(windDir - (dir850Use ?? windDir));
  const windSheer = wind850 != null ? Math.round(wind850 - windSpeed) : 0;

  const midDay = dayData[Math.floor(dayData.length / 2)] ?? dayData[0];
  const wind80m = midDay.windSpeed80m ?? null;
  const windDir80m = midDay.windDir80m ?? null;
  const wind120m = midDay.windSpeed120m ?? null;
  const windDir120m = midDay.windDir120m ?? null;
  const wind180m = midDay.windSpeed180m ?? null;
  const windDir180m = midDay.windDir180m ?? null;

  const zeroThermal = dayData.reduce((s, h) => s + (h.freezingLevel ?? 0), 0) / dayData.length;
  const avgFreezing = zeroThermal > 0 ? Math.round(zeroThermal) : siteAlt + 3000;

  const now = new Date().getHours();
  const next6h = dayData.filter(h => {
    const hr = h.time instanceof Date ? h.time.getHours() : new Date(h.time).getHours();
    return hr >= now && hr <= now + 6;
  });
  const nextRainProb = next6h.reduce((s, h) => s + (h.precipitationProba ?? 0), 0) / (next6h.length || 1);
  const nextCape = next6h.reduce((s, h) => s + (h.cape ?? 0), 0) / (next6h.length || 1);

  const totalRadiation = dayData.reduce((s, h) => s + (h.shortwaveRadiation ?? h.radiation ?? 0), 0);
  const totalSunshine = dayData.reduce((s, h) => s + (h.sunshineDuration ?? 0), 0);
  const maxUV = Math.max(...dayData.map(h => h.uvIndex ?? 0));

  const first6h = dayData.slice(0, 6);
  const last6h = dayData.slice(-6);
  const avgPressureFirst = first6h.reduce((s, h) => s + (h.pressure ?? 1013), 0) / first6h.length;
  const avgPressureLast = last6h.reduce((s, h) => s + (h.pressure ?? 1013), 0) / last6h.length;
  const pressureTrend = avgPressureLast - avgPressureFirst;
  const pressureTrendLabel = pressureTrend > 2 ? "↑ Rialzo" : pressureTrend < -2 ? "↓ Calo" : "→ Stabile";
  const pressureTrendColor = pressureTrend > 2 ? "text-emerald-400" : pressureTrend < -2 ? "text-rose-400" : "text-slate-400";

  const gustRatio = windGusts > 0 ? windGusts / windSpeed : 1;
  const turbulenceLevel = gustRatio > 1.8 ? "Alta" : gustRatio > 1.4 ? "Moderata" : "Bassa";
  const turbulenceColor = gustRatio > 1.8 ? "text-rose-400" : gustRatio > 1.4 ? "text-amber-400" : "text-emerald-400";

  const flightHours = dayData.filter(h => {
    const ht = h.temperature ?? t;
    const hd = h.dewPoint ?? dew;
    return (ht - hd) > 4 && (h.cape ?? 0) < 600 && (h.precipitationProba ?? 0) < 30 && (h.cloudCover ?? 0) < 85;
  }).length;
  const windowStart = dayData.findIndex(h => (h.temperature ?? t) - (h.dewPoint ?? dew) > 4);
  const reversedEnd = [...dayData].reverse().findIndex(h => (h.temperature ?? t) - (h.dewPoint ?? dew) > 4);
  const windowEnd = dayData.length - 1 - reversedEnd;
  const flightWindow = windowStart >= 0 && windowEnd > windowStart
    ? `${String(dayData[windowStart]?.time?.getHours() ?? 8).padStart(2, "0")}:00–${String(dayData[Math.min(windowEnd, dayData.length - 1)]?.time?.getHours() ?? 17).padStart(2, "0")}:00`
    : "—";

  // ── Rischio temporali ──
  const thunderProb = avgCape > 1200 && avgLi < -4 ? 80
    : avgCape > 900 && avgLi < -3 ? 60
    : avgCape > 600 && avgLi < -2 ? 40
    : avgCape > 400 ? 20 : 5;

  // ── Rischio rotore ──
  const orientEsposizione = orientation?.toUpperCase() ?? "S";
  const isSWSite = orientEsposizione.includes("SO") || orientEsposizione.includes("SW");
  const windFromWest = windDir >= 245 && windDir <= 315;
  const rischioRotore = (isSWSite || windFromWest) && windSpeed > 20 ? 60
    : windFromWest && windSpeed > 15 ? 40
    : windFromWest ? 20 : 5;

  // ── Segnale ──
  let signal: "green" | "yellow" | "red";
  let signalLabel: string;
  if (weatherCode >= 95 || weatherCode === 82) { signal = "red"; signalLabel = "TEMPORALI"; }
  else if (windSpeed > 30 || nextCape > 1000 || precipitation > 1) { signal = "red"; signalLabel = "PERICOLOSO"; }
  else if (windSpeed > 20 || avgCape > 600 || nextRainProb > 40 || cloudBase < siteAlt + 300) { signal = "yellow"; signalLabel = "ATTENZIONE"; }
  else { signal = "green"; signalLabel = "VOLO CONSENTITO"; }
  const sc = getSignalColor(signal);
  const isFlyable = signal === "green";

  const warnings: { icon: string; text: string; type: "danger" | "warning" | "info" }[] = [];
  if (cloudBase < siteAlt + 300) warnings.push({ icon: "🌫️", text: "Base cumuli molto bassa — nebbia mattutina al decollo", type: "danger" });
  if (avgFreezing < siteAlt + 2000) warnings.push({ icon: "❄️", text: "Zero termico basso — rischio neve in quota", type: "warning" });
  if (windSpeed > 20) warnings.push({ icon: "💨", text: `Vento forte al suolo (${Math.round(windSpeed)} km/h)`, type: "warning" });
  if (windSpeed > 0 && windGusts > windSpeed * 1.5) warnings.push({ icon: "💨", text: `Raffiche forti (${Math.round(windGusts)} km/h)`, type: "danger" });
  if (avgCape > 800 && humidity > 60) warnings.push({ icon: "⚡", text: "CAPE elevato + umidità → temporali probabili", type: "danger" });
  if (waveIndex < 30 && windSpeed > 15) warnings.push({ icon: "🌊", text: "Wave index basso → onda montana attiva", type: "info" });
  if (visibility < 3000) warnings.push({ icon: "👁️", text: `Visibilità ridotta (${Math.round(visibility / 1000)} km)`, type: "warning" });
  if (nextRainProb > 30) warnings.push({ icon: "🌧️", text: `Pioggia probabile nelle prossime 6h (${Math.round(nextRainProb)}%)`, type: "warning" });
  if (avgLi < -4) warnings.push({ icon: "🔥", text: `Instabilità estrema (LI ${avgLi.toFixed(1)})`, type: "danger" });
  if (flightHours < 4) warnings.push({ icon: "⏰", text: "Finestra di volo molto breve", type: "warning" });
  if (cloudCoverLow > 80) warnings.push({ icon: "☁️", text: "Nuvoloso basso esteso (>80%)", type: "warning" });
  if (gustRatio > 1.8) warnings.push({ icon: "🌀", text: "Turbolenza elevata — raffiche forti", type: "danger" });
  if (cinVal > 500) warnings.push({ icon: "🛑", text: `Inibizione convettiva alta (CIN ${Math.round(cinVal)})`, type: "warning" });
  if (cloudCover >= 90 && avgCape < 100) warnings.push({ icon: "☁️", text: "Cielo coperto — termiche inibite", type: "warning" });
  if (spread < 2 && humidity > 80) warnings.push({ icon: "💨", text: "Aria molto umida e stable — termiche deboli attese", type: "warning" });

  const tactics: string[] = [];
  if (avgThermalRate > 2) tactics.push("Termiche vigorose — valutare scelte tra vallette");
  if (avgThermalRate > 1.5 && avgThermalRate <= 2) tactics.push("Termiche medie — volo possibile con tecnica");
  if (avgThermalRate <= 1) tactics.push("Termiche deboli — preferire dynamic di cresta");
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
  if (wind850 != null && Math.abs(wind850 - windSpeed) > 15) tactics.push("Notevole wind shear — attenzione alla transizione tra strati");

  const lowCloudRisk = cloudBase < siteAlt + 500;
  const veryLowCloudRisk = cloudBase < siteAlt + 300;

  return (
    <div className={`rounded-2xl overflow-hidden ${sc.border} bg-slate-900 shadow-xl`}>
      {/* ═══════════ TOP GRADIENT BAR ═══════════ */}
      <div className={`h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-rose-400`} />

      {/* ═══════════ HEADER ═══════════ */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-600/10 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-white tracking-wide">{siteName || "Decollo"}</h2>
                {orientation && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-300">
                    <Wind className="w-3 h-3" />{orientation}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-300">{siteAlt}m slm</span>
                <span>·</span>
                <span>{modelName || "Open-Meteo"}</span>
                <span>·</span>
                <span className="text-slate-600">{(() => { const d = new Date(); d.setDate(d.getDate() + selectedDay); return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }); })()}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className={`px-3 py-1.5 rounded-xl border backdrop-blur-sm ${sc.badge}`}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: sc.dotColor }} />
                <span className={`text-xs font-black tracking-wider ${sc.text}`}>{signalLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              {weatherCode >= 95 ? <Zap className="w-3 h-3 text-rose-400 animate-pulse" /> :
               weatherCode >= 80 ? <CloudRain className="w-3 h-3 text-orange-400" /> :
               weatherCode >= 30 ? <Cloud className="w-3 h-3 text-slate-400" /> :
               weatherCode >= 10 ? <Cloud className="w-3 h-3 text-amber-300" /> :
               <Sun className="w-3 h-3 text-amber-400" />}
              <span className="text-slate-400">{getWeatherDescription(weatherCode)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ HERO: Voto + Temp + Vento ═══════════ */}
      <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-br from-slate-800/40 via-transparent to-transparent">
        <div className="flex flex-col sm:flex-row items-stretch gap-4">
          {/* Flight Score */}
          <div className={`relative rounded-2xl p-4 border ${sc.bgClass} flex flex-col items-center justify-center text-center`}>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Voto Volo</div>
            <div className={`text-6xl font-black tabular-nums leading-none ${sc.text}`}>
              {signal === "green" ? "9" : signal === "yellow" ? "6" : "2"}
              <span className="text-lg text-slate-500 font-bold ml-0.5">/10</span>
            </div>
            <div className={`text-sm font-black mt-1 ${sc.text}`}>{signalLabel}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isFlyable ? "Condizioni favorevoli" : signal === "yellow" ? "Valutare con attenzione" : "Non volare"}
            </div>
          </div>

          {/* Temperatura */}
          <div className="flex-1 rounded-2xl p-4 bg-slate-800/60 border border-slate-700/40">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Temperatura aria</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-black text-white tabular-nums">{Math.round(t)}</span>
                  <span className="text-lg text-amber-400/70 font-black">°C</span>
                </div>
              </div>
              <span className="text-3xl">{weatherCode >= 95 ? '⛈️' : weatherCode >= 80 ? '🌧️' : weatherCode >= 30 ? '☁️' : weatherCode >= 10 ? '🌤️' : '☀️'}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Percepita</span>
                <span className="font-bold text-slate-200">{Math.round(feelsLike)}°C</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Punto rugiada</span>
                <span className="font-bold text-slate-200">{Math.round(dew)}°C</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Spread</span>
                <span className="font-bold text-amber-300">{Math.round(spread)}°C</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 leading-tight border-t border-slate-700/30 pt-2">
              {avgThermalRate > 1.2 ? '🔥 Termiche attive — l\'aria si riscalda rapidamente' : avgThermalRate > 0.6 ? '⛅ Termiche deboli — solo correnti locali' : '❄️ Nessuna termica — atmosfera stabile'}
            </p>
          </div>

          {/* Vento */}
          <div className="flex-1 rounded-2xl p-4 bg-slate-800/60 border border-slate-700/40">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Vento al suolo</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-black text-white tabular-nums">{Math.round(windSpeed)}</span>
                  <span className="text-sm text-amber-400/70 font-black">km/h</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-xs font-black text-amber-300">
                    {dirLabel(windDir)} {windDir}°
                  </span>
                </div>
              </div>
              <Wind className="w-8 h-8 text-amber-400/30 shrink-0" />
            </div>
            {windGusts > 0 && (
              <div className="flex items-center gap-2 text-xs mb-2">
                <span className="text-slate-500">Raffiche</span>
                <span className={`font-black ${windGusts > windSpeed * 1.5 ? "text-rose-400" : "text-orange-300"}`}>{Math.round(windGusts)} km/h</span>
                <span className="text-slate-600">·</span>
                <span className={`font-bold ${windGusts > windSpeed * 1.5 ? "text-rose-400" : "text-slate-400"}`}>×{gustRatio.toFixed(1)}</span>
              </div>
            )}
            <p className="text-[10px] text-slate-500 leading-tight border-t border-slate-700/30 pt-2">
              {windSpeed <= 8 ? "Calmo: decollo assistito e atterraggio dolce"
                : windSpeed <= 15 ? "Moderato: condizioni ideali per il termico"
                : windSpeed <= 25 ? "Sostenuto: attenzione in decollo e atterraggio"
                : "Forte: solo per piloti esperti"}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ ROW 1: Condizioni + Parametri Volo ═══════════ */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-3">Parametri attuali</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Umidità */}
          <div className="rounded-xl p-3.5 bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
                <Droplets className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Umidità</div>
                <div className="text-[9px] text-slate-600">H₂O nell'aria</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-orange-300 tabular-nums">{humidity}</span>
              <span className="text-xs text-orange-400/60 font-bold">%</span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-700 to-orange-400 rounded-full" style={{ width: `${humidity}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{humidity > 70 ? "Aria umida: termiche pesanti ma attenzione ai temporali" : humidity > 40 ? "Umidità ideale: buon equilibrio per termiche organizzate" : "Aria secca: termiche leggere, cielo limpido"}</p>
          </div>

          {/* Spread */}
          <div className="rounded-xl p-3.5 bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/20 flex items-center justify-center">
                <Thermometer className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Spread</div>
                <div className="text-[9px] text-slate-600">T − T punto rugiada</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-rose-300 tabular-nums">{Math.round(spread)}</span>
              <span className="text-xs text-rose-400/60 font-bold">°C</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{spread > 8 ? "Aria secca in quota — termiche vigorose attese" : spread > 4 ? "Umidità controllata — termiche moderate e prevedibili" : "Aria umida — termiche pesanti e cumuli bassi"}</p>
          </div>

          {/* Pressione */}
          <div className="rounded-xl p-3.5 bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Pressione</div>
                <div className="text-[9px] text-slate-600">Atmosferica</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-300 tabular-nums">{Math.round(pressure)}</span>
              <span className="text-xs text-amber-400/60 font-bold">hPa</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-semibold">
              {pressureTrend > 2 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : pressureTrend < -2 ? <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> : <Minus className="w-3.5 h-3.5 text-slate-500" />}
              <span className={pressureTrendColor}>{pressureTrendLabel}</span>
              <span className="text-slate-600">Δ {pressureTrend > 0 ? "+" : ""}{pressureTrend.toFixed(1)}</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{pressureTrend > 2 ? "Bel tempo in arrivo, termiche classiche da alta pressione" : pressureTrend < -2 ? "Peggioramento imminente, volare nelle prime ore" : "Condizioni stabili per tutta la giornata"}</p>
          </div>

          {/* Visibilità */}
          <div className="rounded-xl p-3.5 bg-slate-800/50 border border-slate-700/40">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Visibilità</div>
                <div className="text-[9px] text-slate-600">Distanza visibile</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-300 tabular-nums">{Math.round(visibility / 1000)}</span>
              <span className="text-xs text-emerald-400/60 font-bold">km</span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full" style={{ width: `${Math.min(100, (visibility / 15000) * 100)}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{visibility >= 10000 ? "Navigazione sicura su tutta la valle" : visibility >= 5000 ? "Volo locale senza problemi" : visibility >= 3000 ? "Attenzione alla navigazione in quota" : "Non volare — visibilità critica"}</p>
          </div>
        </div>
      </div>

      {/* ═══════════ ROW 2: Parametri di volo ═══════════ */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Plane className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Parametri di volo</span>
          <span className="text-[9px] text-slate-600 ml-auto">Tutti i dati che ti servono per decidere se e quando volare</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Rateo termico */}
          <div className="rounded-xl p-3.5 bg-slate-800/50 border border-rose-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/20 flex items-center justify-center">
                <ArrowUp className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Rateo termico</div>
                <div className="text-[9px] text-slate-600">Ascendenza media</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-rose-300 tabular-nums">{avgThermalRate.toFixed(1)}</span>
              <span className="text-xs text-rose-400/60 font-bold">m/s</span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-600 to-pink-400 rounded-full" style={{ width: `${Math.min(100, avgThermalRate / 4 * 100)}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{avgThermalRate > 2 ? "Termiche forti — perfetto per cross-country" : avgThermalRate > 1.2 ? "Termiche buone — ideale per allenamento" : avgThermalRate > 0.7 ? "Termiche discrete — volo con pazienza" : "Termiche deboli — meglio dynamic di cresta"}</p>
          </div>

          {/* Base cumuli */}
          <div className={`rounded-xl p-3.5 border ${veryLowCloudRisk ? "bg-rose-500/10 border-rose-500/20" : lowCloudRisk ? "bg-violet-500/10 border-violet-500/20" : "bg-emerald-500/10 border-emerald-500/20"}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${veryLowCloudRisk ? "bg-rose-500/20" : lowCloudRisk ? "bg-violet-500/20" : "bg-emerald-500/20"}`}>
                <Mountain className={`w-3.5 h-3.5 ${veryLowCloudRisk ? "text-rose-400" : lowCloudRisk ? "text-violet-400" : "text-emerald-400"}`} />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Base cumuli</div>
                <div className="text-[9px] text-slate-600">Quota inizio nubi</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black tabular-nums ${veryLowCloudRisk ? "text-rose-300" : lowCloudRisk ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(cloudBase)}</span>
              <span className="text-xs opacity-60">m slm</span>
              <span className={`text-xs font-bold ml-auto ${veryLowCloudRisk ? "text-rose-400" : lowCloudRisk ? "text-violet-400" : "text-emerald-400"}`}>+{Math.round(cloudBase - siteAlt)}m</span>
            </div>
            <div className="relative h-1.5 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
              <div className={`absolute top-0 h-full rounded-full ${veryLowCloudRisk ? "bg-rose-500" : lowCloudRisk ? "bg-violet-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, Math.max(0, ((cloudBase - siteAlt) / 1500) * 100))}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{cloudBase > siteAlt + 800 ? `+${Math.round(cloudBase - siteAlt)}m dal suolo: ampio spazio per volare in sicurezza` : cloudBase > siteAlt + 400 ? `+${Math.round(cloudBase - siteAlt)}m: spazio di manovra sufficiente` : cloudBase > siteAlt + 200 ? `Attenzione: nubi basse a ${Math.round(cloudBase - siteAlt)}m dal campo` : "Rischio nebbia al decollo, attendere il riscaldamento"}</p>
          </div>

          {/* Zero termico */}
          <div className="rounded-xl p-3.5 bg-slate-800/50 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                <CloudSnow className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Zero termico</div>
                <div className="text-[9px] text-slate-600">Confine neve/pioggia</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black tabular-nums ${avgFreezing < siteAlt + 2000 ? "text-rose-300" : "text-violet-300"}`}>{avgFreezing}</span>
              <span className="text-xs text-violet-400/60 font-bold">m</span>
            </div>
            <div className="text-[9px] text-violet-400/50 font-semibold mt-1">{avgFreezing > siteAlt ? `+${Math.round(avgFreezing - siteAlt)}m sopr. decollo` : "⚠ Sotto il campo!"}</div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{avgFreezing > siteAlt + 3000 ? "Pioggia al suolo, neve solo in alta quota — nessuna preoccupazione" : avgFreezing > siteAlt + 1500 ? "Possibile neve sopra i 2000-2500m — attenzione alle pareti esposte" : "Zero molto basso: rischio ghiaccio sulle pareti nord"}</p>
          </div>

          {/* CAPE */}
          <div className="rounded-xl p-3.5 bg-slate-800/50 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">CAPE</div>
                <div className="text-[9px] text-slate-600">Energia termica</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black tabular-nums ${avgCape > 600 ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(avgCape)}</span>
              <span className="text-xs text-emerald-400/60 font-bold">J/kg</span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
              <div className={`h-full rounded-full ${avgCape > 600 ? "bg-violet-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, avgCape / 1500 * 100)}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{avgCape > 1000 ? "⚠️ Forte instabilità — vigilanza temporali dopo le 14:00" : avgCape > 400 ? "Buona energia termica — termiche sviluppate ma controllabili" : "Cielo probabilmente stabile — termiche limitate"}</p>
          </div>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {/* Top termico */}
          <div className="rounded-xl p-3.5 bg-slate-800/50 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Top termica</div>
                <div className="text-[9px] text-slate-600">Massima quota</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-300 tabular-nums">{thermalTop}</span>
              <span className="text-xs text-amber-400/60 font-bold">m</span>
            </div>
            <div className="text-[9px] text-amber-400/50 font-semibold mt-1">+{Math.round(thermalTop - siteAlt)}m dal suolo</div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{thermalTop > siteAlt + 1500 ? `Max quota in termica: ${thermalTop}m slm — ottima per cross-country` : thermalTop > siteAlt + 800 ? `Quota di volo confortevole a ${thermalTop}m slm` : `Top limitato dalla stabilità a ${thermalTop}m slm`}</p>
          </div>

          {/* Copertura cielo */}
          <div className={`rounded-xl p-3.5 border ${cloudCover >= 90 ? "bg-slate-500/10 border-slate-500/30" : cloudCover >= 70 ? "bg-violet-500/10 border-violet-500/20" : cloudCover >= 50 ? "bg-amber-500/10 border-amber-500/20" : cloudCover >= 20 ? "bg-orange-500/10 border-orange-500/20" : "bg-emerald-500/10 border-emerald-500/20"}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cloudCover >= 90 ? "bg-slate-500/20" : cloudCover >= 70 ? "bg-violet-500/20" : cloudCover >= 50 ? "bg-amber-500/20" : cloudCover >= 20 ? "bg-orange-500/20" : "bg-emerald-500/20"}`}>
                <CloudOff className={`w-3.5 h-3.5 ${cloudCover >= 90 ? "text-slate-400" : cloudCover >= 70 ? "text-violet-400" : cloudCover >= 50 ? "text-amber-400" : cloudCover >= 20 ? "text-orange-400" : "text-emerald-400"}`} />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Copertura cielo</div>
                <div className="text-[9px] text-slate-600">Nuvolosità totale</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black tabular-nums ${cloudCover >= 90 ? "text-slate-300" : cloudCover >= 70 ? "text-violet-300" : cloudCover >= 50 ? "text-amber-300" : "text-emerald-300"}`}>{cloudCover}%</span>
              <span className="text-xs opacity-60">{cloudCover >= 90 ? "Totale" : cloudCover >= 70 ? "Coperto" : cloudCover >= 50 ? "Variabile" : cloudCover >= 20 ? "Poco nuvoloso" : "Sereno"}</span>
            </div>
            {cloudCover > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                  <span className="w-4 font-bold">B</span>
                  <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden"><div className="h-full bg-amber-500/70 rounded-full" style={{ width: `${cloudCoverLow}%` }} /></div>
                  <span className="w-6 text-amber-400 font-bold tabular-nums">{cloudCoverLow}%</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                  <span className="w-4 font-bold">M</span>
                  <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden"><div className="h-full bg-violet-500/70 rounded-full" style={{ width: `${cloudCoverMid}%` }} /></div>
                  <span className="w-6 text-violet-400 font-bold tabular-nums">{cloudCoverMid}%</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                  <span className="w-4 font-bold">A</span>
                  <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden"><div className="h-full bg-fuchsia-500/70 rounded-full" style={{ width: `${cloudCoverHigh}%` }} /></div>
                  <span className="w-6 text-fuchsia-400 font-bold tabular-nums">{cloudCoverHigh}%</span>
                </div>
              </div>
            )}
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{cloudCover >= 80 ? 'Cielo coperto: termiche inibite, solo dynamic di cresta' : cloudCover >= 50 ? 'Nuvolosità variabile: termiche possibili ma irregolari' : 'Cielo sereno: condizioni ideali per il volo termico'}</p>
          </div>

          {/* UV */}
          <div className="rounded-xl p-3.5 bg-slate-800/50 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
                <Sun className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">UV indice</div>
                <div className="text-[9px] text-slate-600">Radiazione solare</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black tabular-nums ${uvIndex >= 8 ? "text-rose-400" : uvIndex >= 6 ? "text-orange-400" : uvIndex >= 3 ? "text-amber-400" : "text-emerald-400"}`}>{uvIndex}</span>
              <span className={`text-xs font-semibold ${uvIndex >= 8 ? "text-rose-400" : uvIndex >= 6 ? "text-orange-400" : uvIndex >= 3 ? "text-amber-400" : "text-emerald-400"}`}>{uvIndex >= 11 ? "Estremo" : uvIndex >= 8 ? "Molto elevato" : uvIndex >= 6 ? "Elevato" : uvIndex >= 3 ? "Moderato" : "Basso"}</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{uvIndex >= 6 ? '🔆 UV alto in quota: occhiali da sole e crema solare obbligatori' : '☀️ UV gestibile: protezione standard sufficiente'}</p>
          </div>

          {/* Radiazione */}
          <div className="rounded-xl p-3.5 bg-slate-800/50 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <Radiation className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Radiazione</div>
                <div className="text-[9px] text-slate-600">Energia solare giornaliera</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-300 tabular-nums">{Math.round(totalRadiation)}</span>
              <span className="text-xs text-amber-400/60 font-bold">Wh/m²</span>
            </div>
            <div className="text-[9px] text-amber-400/50 font-semibold mt-1">{Math.round(totalSunshine / 3600)}h di sole</div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{totalRadiation > 4000 ? '🔥 Alta radiazione: termiche forti attese nel pomeriggio' : totalRadiation > 2000 ? '⛅ Radiazione moderata: termiche regolari' : '☁️ Bassa radiazione: cielo coperto, termiche deboli'}</p>
          </div>
        </div>
      </div>

      {/* ═══════════ VENTO IN QUOTA ═══════════ */}
      <div className="border-t border-white/5 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Wind className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Profilo vento verticale</span>
          <span className="text-[9px] text-slate-600 ml-auto">Decollo → atterraggio — ogni livello conta per la sicurezza</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="rounded-xl p-3 bg-amber-500/5 border border-amber-500/20">
            <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Suolo (10m)</div>
            <div className="text-xl font-black text-amber-300 tabular-nums">{Math.round(windSpeed)} <span className="text-sm text-amber-400/60 font-semibold">{dirLabel(windDir)}</span></div>
            {windGusts > 0 && <div className="text-xs text-slate-500 mt-1">Raffiche {Math.round(windGusts)} km/h · <span className={gustRatio > 1.5 ? "text-rose-400" : "text-slate-500"}>{turbulenceLevel}</span></div>}
          </div>
          {wind80m != null && (
            <div className="rounded-xl p-3 bg-orange-500/5 border border-orange-500/20">
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">80m</div>
              <div className="text-xl font-black text-orange-300 tabular-nums">{Math.round(wind80m)} <span className="text-sm text-orange-400/60 font-semibold">{dirLabel(windDir80m ?? windDir)}</span></div>
              <div className="text-xs text-slate-500 mt-1">~{siteAlt + 80}m slm</div>
            </div>
          )}
          {wind120m != null && (
            <div className="rounded-xl p-3 bg-violet-500/5 border border-violet-500/20">
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">120m</div>
              <div className="text-xl font-black text-violet-300 tabular-nums">{Math.round(wind120m)} <span className="text-sm text-violet-400/60 font-semibold">{dirLabel(windDir120m ?? windDir)}</span></div>
              <div className="text-xs text-slate-500 mt-1">~{siteAlt + 120}m slm</div>
            </div>
          )}
          {wind180m != null && (
            <div className="rounded-xl p-3 bg-purple-500/5 border border-purple-500/20">
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">180m</div>
              <div className="text-xl font-black text-purple-300 tabular-nums">{Math.round(wind180m)} <span className="text-sm text-purple-400/60 font-semibold">{dirLabel(windDir180m ?? windDir)}</span></div>
              <div className="text-xs text-slate-500 mt-1">~{siteAlt + 180}m slm</div>
            </div>
          )}
        </div>

        {/* Wind gradient bars */}
        {(wind80m != null || wind120m != null || wind180m != null) && (
          <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30 mb-3">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-black mb-2.5">Gradiente verticale — come cambia il vento salendo</div>
            <div className="space-y-1.5">
              {[
                { label: "10m (suolo)", speed: windSpeed, dir: windDir, color: "bg-amber-500" },
                ...(wind80m != null ? [{ label: "80m", speed: wind80m, dir: windDir80m ?? windDir, color: "bg-orange-500" }] : []),
                ...(wind120m != null ? [{ label: "120m", speed: wind120m, dir: windDir120m ?? windDir, color: "bg-violet-500" }] : []),
                ...(wind180m != null ? [{ label: "180m", speed: wind180m, dir: windDir180m ?? windDir, color: "bg-purple-500" }] : []),
                ...(wind850 != null ? [{ label: "~2000m", speed: Math.round(wind850), dir: dir850Use ?? windDir, color: "bg-rose-500" }] : []),
              ].map((layer, i, arr) => {
                const maxW = Math.max(...arr.map(l => l.speed ?? 1));
                const barWidth = ((layer.speed ?? 0) / maxW) * 100;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[9px] text-slate-400 font-bold w-16 shrink-0 text-right">{layer.label}</span>
                    <div className="flex-1 h-5 bg-slate-700/30 rounded-full overflow-hidden relative">
                      <div className={`h-full ${layer.color} rounded-full flex items-center justify-end pr-2`} style={{ width: `${Math.max(8, barWidth)}%` }}>
                        <span className="text-[9px] font-black text-white/90">{Math.round(layer.speed)} km/h</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold w-8 shrink-0">{dirLabel(layer.dir)}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-slate-600 mt-2.5 leading-tight">
              Gradiente forte = wind shear = termiche deformate. Differenza direzione &gt;45° = rotazione vento in quota.
            </p>
          </div>
        )}

        {wind850 != null && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-r from-violet-900/30 to-violet-800/20 rounded-xl p-3.5 border border-violet-500/30">
              <div className="flex items-center gap-2 mb-1.5">
                <Wind className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-violet-300 font-bold">Quota ~2000m (850hPa)</span>
              </div>
              <div className="text-xl font-black text-violet-300 tabular-nums">{Math.round(wind850)} <span className="text-sm text-violet-400/60 font-semibold">{dirLabel(dir850Use ?? windDir)}</span></div>
              <div className="text-xs text-violet-400/60 font-semibold mt-1">Wave index: {waveIndex.toFixed(0)}° · Shear {windSheer} km/h</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{waveIndex < 30 ? "🌊 Onda montana attiva — provare quote superiori per dynamic" : waveIndex < 60 ? "Onda presente — condizioni favorevoli per volo in quota" : "Nessun effetto onda significativo"}</p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-1.5">
                <Activity className="w-4 h-4 text-rose-400" />
                <span className="text-xs text-slate-400 font-bold">Turbolenza</span>
              </div>
              <div className={`text-xl font-black tabular-nums ${turbulenceColor}`}>{turbulenceLevel}</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">Rapporto raffiche: {gustRatio.toFixed(2)}x</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{gustRatio > 1.8 ? "⚠️ Raffiche pericolose — decollo solo in assenza di vento" : gustRatio > 1.4 ? "Raffiche significative — valutare il decollo con attenzione" : "Turbolenza bassa — volo tranquillo"}</p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ FINESTRA DI VOLO + PIOGGIA ═══════════ */}
      <div className="border-t border-white/5 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Finestra di volo & precipitazioni</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="rounded-xl p-3.5 bg-emerald-500/5 border border-emerald-500/20">
            <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Ore favorevoli</div>
            <span className="text-2xl font-black text-emerald-300 tabular-nums">{flightHours}<span className="text-sm text-emerald-400/60 font-bold ml-1">h</span></span>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{flightHours > 6 ? "Finestra ampia: puoi scegliere l'ora migliore" : flightHours > 3 ? "Finestra decente: pianifica le ore centrali" : "Finestra breve: volare presto o tardi"}</p>
          </div>
          <div className="rounded-xl p-3.5 bg-amber-500/5 border border-amber-500/20">
            <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Orario migliore</div>
            <span className="text-base font-black text-amber-300 tabular-nums">{flightWindow}</span>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">Periodo con spread &gt; 4°C e assenza di pioggia</p>
          </div>
          <div className="rounded-xl p-3.5 bg-violet-500/5 border border-violet-500/20">
            <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Pioggia (6h)</div>
            <span className={`text-2xl font-black tabular-nums ${nextRainProb > 40 ? "text-rose-300" : nextRainProb > 20 ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(nextRainProb)}<span className="text-sm font-bold ml-1">%</span></span>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{nextRainProb > 40 ? "⚠️ Pioggia molto probabile — posticipare" : nextRainProb > 20 ? "Possibile pioggia isolata — tenere pronto il copri ala" : "Pioggia improbabile nelle prossime 6h"}</p>
          </div>
          <div className="rounded-xl p-3.5 bg-slate-800/50 border border-slate-700/40">
            <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Soleggiamento</div>
            <span className="text-2xl font-black text-amber-300 tabular-nums">{Math.round(totalSunshine / 3600 * 10) / 10}<span className="text-sm text-amber-400/60 font-bold ml-1">h</span></span>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{totalSunshine / 3600 > 6 ? '☀️ Giornata molto soleggiata — termiche garantite' : totalSunshine / 3600 > 3 ? '⛅ Giornata parzialmente soleggiata' : '☁️ Poca luce solare — termiche deboli'}</p>
          </div>
        </div>

        {/* Rain timeline */}
        {dayData.filter(h => (h.precipitationProba ?? 0) > 30).length > 0 && (
          <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/40">
            <div className="flex items-center gap-2 mb-2.5">
              <CloudRain className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Rischio piovaschi — 09:00 → 19:00</span>
            </div>
            <div className="flex gap-1 items-end h-12">
              {[9,10,11,12,13,14,15,16,17,18,19].map(hour => {
                const entry = dayData.find(h => {
                  const hr = h.time instanceof Date ? h.time.getHours() : new Date(h.time).getHours();
                  return hr === hour;
                });
                const prob = entry ? (entry.precipitationProba ?? 0) : 0;
                const isNow = hour === now;
                const barColor = prob > 50 ? "from-rose-500 to-rose-400" : prob > 30 ? "from-violet-500 to-violet-400" : prob > 10 ? "from-orange-500 to-orange-400" : "from-slate-600 to-slate-500";
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div className="h-3 flex items-center justify-center text-xs">{prob > 50 ? "🌧️" : prob > 30 ? "🌦️" : prob > 10 ? "☁️" : hour >= 10 && hour <= 15 ? "☀️" : "🌙"}</div>
                    <div className={`w-full rounded-md bg-gradient-to-t ${barColor}`} style={{ height: `${Math.max(4, prob)}%`, minHeight: `${Math.max(4, prob)}%` }} />
                    {isNow && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                    <div className="text-[8px] text-slate-600 mt-0.5">{String(hour).padStart(2,"0")}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-center gap-3 text-[9px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white" /> ora attuale</span>
              <span className="text-rose-400">🌧️ &gt;50%</span>
              <span className="text-violet-400">🌦️ 30-50%</span>
              <span className="text-orange-400">☁️ &lt;30%</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ STABILITÀ TERMODINAMICA ═══════════ */}
      <div className="border-t border-white/5 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-violet-400" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Stabilità termodinamica</span>
          <span className="text-[9px] text-slate-600 ml-auto">Per piloti esperti — legge l'atmosfera come un radar</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`rounded-xl p-3.5 border ${avgSpread > 1.5 ? "bg-rose-500/10 border-rose-500/30" : avgSpread > 1.0 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
            <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">ΔT / 100m</div>
            <span className={`text-xl font-black tabular-nums ${avgSpread > 1.5 ? "text-rose-300" : avgSpread > 1.0 ? "text-violet-300" : "text-emerald-300"}`}>{avgSpread.toFixed(2)}</span>
            <span className="text-[9px] text-slate-500 font-bold ml-1">°C</span>
            <div className="text-[9px] font-semibold mt-0.5 opacity-70">{avgSpread > 1.5 ? "Fortemente instabile" : avgSpread > 1.0 ? "Moderatamente instabile" : avgSpread > 0.6 ? "Instabile" : "Stabile"}</div>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{avgSpread > 1.5 ? "Atmosfera instabile: termiche potenti ma turbolente" : avgSpread > 1.0 ? "Instabilità moderata: termiche organizzate e prevedibili" : "Atmosfera stabile: poche termiche, preferire dynamic di cresta"}</p>
          </div>
          <div className={`rounded-xl p-3.5 border ${avgLi < -4 ? "bg-rose-500/10 border-rose-500/30" : avgLi < 0 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
            <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Lifted Index</div>
            <span className={`text-xl font-black tabular-nums ${avgLi < -4 ? "text-rose-300" : avgLi < 0 ? "text-violet-300" : "text-emerald-300"}`}>{avgLi.toFixed(1)}</span>
            <div className="text-[9px] font-semibold mt-0.5 opacity-70">{avgLi < -4 ? "Estremamente instabile" : avgLi < 0 ? "Instabile" : "Stabile"}</div>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{avgLi < -2 ? "⚠️ Instabilità pomeridiana — volare al mattino presto" : avgLi > 0 ? "Atmosfera stabile: vento di cresta preferibile" : "Instabilità moderata: termiche possibili"}</p>
          </div>
          <div className={`rounded-xl p-3.5 border ${cinVal > 200 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
            <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">CIN (Inibizione)</div>
            <span className={`text-xl font-black tabular-nums ${cinVal > 200 ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(cinVal)}</span>
            <span className="text-xs text-slate-500 font-bold ml-1">J/kg</span>
            <div className="text-[9px] font-semibold mt-0.5 opacity-70">{cinVal > 500 ? "Termiche soppresse" : cinVal > 200 ? "Leggera inibizione" : "Favorevole"}</div>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{cinVal > 200 ? "Strato stabile in basso blocca le termiche — aspettare il riscaldamento del suolo (10:30+)" : "No inibizione convettiva — le termiche si svilupperanno appena il sole riscalda il terreno"}</p>
          </div>
          <div className="rounded-xl p-3.5 border border-amber-500/20 bg-amber-500/5">
            <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Rischio temporali</div>
            <span className={`text-2xl font-black tabular-nums ${thunderProb > 40 ? "text-rose-300" : thunderProb > 20 ? "text-amber-300" : "text-emerald-300"}`}>{thunderProb}<span className="text-sm font-bold ml-1">%</span></span>
            <div className="text-[9px] font-semibold mt-0.5 opacity-70">{thunderProb > 40 ? "Pericoloso" : thunderProb > 20 ? "Attenzione" : "Basso rischio"}</div>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{thunderProb > 40 ? "⚠️ Rischio temporali elevato — evitare voli pomeridiani, pianificare per il mattino" : thunderProb > 20 ? "Possibile sviluppo temporalesco nel pomeriggio — monitorare l'evoluzione" : "Nessun rischio temporali significativo nella giornata"}</p>
          </div>
        </div>
      </div>

      {/* ═══════════ GIUDIZIO TATTICO ═══════════ */}
      {tactics.length > 0 && (
        <div className="border-t border-white/5 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Giudizio tattico</span>
            <span className="text-[9px] text-slate-600 ml-auto">Consigli pratici basati sulle condizioni attuali</span>
          </div>
          <div className="space-y-1.5">
            {tactics.map((tac, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-800/40 rounded-xl px-4 py-2.5 border border-slate-700/30">
                <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                {tac}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ WARNINGS ═══════════ */}
      {warnings.length > 0 ? (
        <div className="border-t border-rose-800/30 px-5 py-4 bg-rose-950/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-rose-400 text-sm font-black uppercase tracking-wider">Attenzione ({warnings.length})</span>
          </div>
          <div className="space-y-1.5">
            {warnings.slice(0, 5).map((w, i) => (
              <div key={i} className={`flex items-start gap-2.5 text-xs font-medium py-2 px-3 rounded-xl ${w.type === "danger" ? "bg-rose-950/50 text-rose-200 border border-rose-800/50" : w.type === "warning" ? "bg-amber-950/40 text-amber-200 border border-amber-800/40" : "bg-sky-950/40 text-sky-200 border border-sky-800/40"}`}>
                <span className="shrink-0 text-base">{w.icon}</span>
                {w.text}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border-t border-emerald-800/30 px-5 py-4 bg-emerald-950/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 text-sm font-bold">✓ Condizioni favorevoli per il volo — nessun warning attivo</span>
          </div>
        </div>
      )}
    </div>
  );
}
