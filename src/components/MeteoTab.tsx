"use client";

import { useRef, useEffect, useState } from "react";
import type { MeteoCurrent } from "@/services/openMeteoService";
import type { HourData } from "@/types/meteo";
import {
  MapPin, Wind, Thermometer, Droplets, Eye, Mountain, Cloud,
  Activity, AlertTriangle, CheckCircle2, FileText, ShieldCheck,
  Sun, Radiation, ArrowUp, CloudSnow, ArrowRight, TrendingUp,
  TrendingDown, Minus, CloudRain, Zap, Gauge, CloudOff,
  Waves
} from "lucide-react";
import { calcCloudBase } from "@/utils/calcCloudBase";

interface MeteoTabProps {
  currentData: MeteoCurrent | null;
  dayData: HourData[];
  site: { alt: number; name?: string; orientation?: string };
  thermalDelta: number;
  modelName?: string;
  selectedDay?: number;
  selectedHour?: number;
  cape?: number | null;
  liftedIndex?: number | null;
  cin?: number | null;
}

function useAnimatedValue(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  useEffect(() => {
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

function useFloatAnimatedValue(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  useEffect(() => {
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(parseFloat((target * eased).toFixed(1)));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

function usePercentAnimatedValue(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  useEffect(() => {
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
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
  if (pct >= 90) return "Totale";
  if (pct >= 70) return "Coperto";
  if (pct >= 50) return "Variabile";
  if (pct >= 30) return "Qualche nuvola";
  if (pct >= 10) return "Pochissime nubi";
  return "Sereno";
}

type Signal = "green" | "yellow" | "red";

function signalColors(signal: Signal) {
  return signal === "green" ? {
    border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400",
    dot: "#34d399", badge: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.3)]",
  } : signal === "yellow" ? {
    border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400",
    dot: "#f59e0b", badge: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.3)]",
  } : {
    border: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-400",
    dot: "#fb7185", badge: "bg-rose-500/15 border-rose-500/40 text-rose-300",
    glow: "shadow-[0_0_30px_rgba(244,63,94,0.3)]",
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
  const capeVal = currentData.cape ?? propCape ?? 0;
  const liftedIndexVal = currentData.liftedIndex ?? propLi ?? 0;
  const cinVal = currentData.cin ?? propCin ?? 0;
  const feelsLike = currentData.apparentTemp ?? t;
  const cloudCover = currentData.cloudCover ?? 0;
  const cloudCoverLow = currentData.cloudCoverLow ?? 0;
  const cloudCoverMid = currentData.cloudCoverMid ?? 0;
  const cloudCoverHigh = currentData.cloudCoverHigh ?? 0;
  const spread = Math.max(0.5, t - dew);

  // === Calcoli per il volo ===
  const cloudBase = calcCloudBase(siteAlt, t, dew);
  const avgCape = dayData.reduce((s, h) => s + (h.cape ?? 0), 0) / dayData.length;
  const avgLi = dayData.reduce((s, h) => s + (h.liftedIndex ?? 0), 0) / dayData.length;
  const avgSpread = dayData.reduce((s, h) => s + Math.max(0.5, (h.temperature ?? t) - (h.dewPoint ?? dew)), 0) / dayData.length;
  const avgThermalRate = Math.min(4, Math.max(0.3, avgSpread * 0.25 + avgCape * 0.001));
  const maxThermalRate = Math.min(4, Math.max(0.3, avgSpread * 0.3 + (avgCape * 1.5) * 0.001));
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

  const thunderProb = avgCape > 1200 && avgLi < -4 ? 80
    : avgCape > 900 && avgLi < -3 ? 60
    : avgCape > 600 && avgLi < -2 ? 40
    : avgCape > 400 ? 20 : 5;

  const orientEsposizione = orientation?.toUpperCase() ?? "S";
  const isSWSite = orientEsposizione.includes("SO") || orientEsposizione.includes("SW");
  const windFromWest = windDir >= 245 && windDir <= 315;
  const rischioRotore = (isSWSite || windFromWest) && windSpeed > 20 ? 60
    : windFromWest && windSpeed > 15 ? 40
    : windFromWest ? 20 : 5;

  let signal: Signal;
  let signalLabel: string;
  if (weatherCode >= 95 || weatherCode === 82) { signal = "red"; signalLabel = "TEMPORALI"; }
  else if (windSpeed > 30 || nextCape > 1000 || precipitation > 1) { signal = "red"; signalLabel = "PERICOLOSO"; }
  else if (windSpeed > 20 || avgCape > 600 || nextRainProb > 40 || cloudBase < siteAlt + 300) { signal = "yellow"; signalLabel = "ATTENZIONE"; }
  else { signal = "green"; signalLabel = "VOLO CONSENTITO"; }
  const sc = signalColors(signal);
  const isFlyable = signal === "green";

  // === Animated values ===
  const animatedScore = useAnimatedValue(signal === "green" ? 9 : signal === "yellow" ? 6 : 2);
  const animatedTemp = useAnimatedValue(Math.round(t));
  const animatedWind = useAnimatedValue(Math.round(windSpeed));
  const animatedHumidity = usePercentAnimatedValue(humidity);
  const animatedVisibility = usePercentAnimatedValue(Math.min(100, (visibility / 15000) * 100));
  const animatedThermalRate = useFloatAnimatedValue(avgThermalRate);
  const animatedCape = useAnimatedValue(Math.round(avgCape));
  const animatedCloudBaseDiff = useAnimatedValue(Math.max(0, cloudBase - siteAlt));
  const animatedCloudCover = usePercentAnimatedValue(cloudCover);

  const warnings: { icon: string; text: string; type: "danger" | "warning" | "info" }[] = [];
  if (cloudBase < siteAlt + 300) warnings.push({ icon: "🌫️", text: "Base cumuli molto bassa — nebbia mattutina al decollo", type: "danger" });
  if (avgFreezing < siteAlt + 2000) warnings.push({ icon: "❄️", text: "Zero termico basso — rischio neve in quota", type: "warning" });
  if (windSpeed > 20) warnings.push({ icon: "💨", text: `Vento forte al suolo (${Math.round(windSpeed)} km/h)`, type: "warning" });
  if (windSpeed > 0 && windGusts > windSpeed * 1.5) warnings.push({ icon: "💨", text: `Raffiche forti (${Math.round(windGusts)} km/h)`, type: "danger" });
  if (avgCape > 800 && humidity > 60) warnings.push({ icon: "⚡", text: "CAPE elevato + umidità → temporali probabili", type: "danger" });
  if (waveIndex < 30 && windSpeed > 15) warnings.push({ icon: "🌊", text: "Wave index basso → onda montana attiva", type: "info" });
  if (visibility < 3000) warnings.push({ icon: "👁️", text: `Visibilità ridotta (${Math.round(visibility / 1000)}km)`, type: "warning" });
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

  // ── Sottotitoli pratici ──
  const rateoSub = avgThermalRate > 2 ? "Forti (>" + avgThermalRate.toFixed(1) + " m/s) — cross-country"
    : avgThermalRate > 1.2 ? "Buone — allenamento e volo locale"
    : avgThermalRate > 0.7 ? "Discrete — pazienza"
    : "Deboli — dynamic di cresta";
  const cloudBaseSub = cloudBase > siteAlt + 800 ? `+${Math.round(cloudBase - siteAlt)}m dal campo`
    : cloudBase > siteAlt + 400 ? `+${Math.round(cloudBase - siteAlt)}m — spazio sufficiente`
    : cloudBase > siteAlt + 200 ? `Attenzione: nubi basse a ${Math.round(cloudBase - siteAlt)}m`
    : "Rischio nebbia al decollo";
  const zeroTermSub = avgFreezing > siteAlt + 3000 ? "Neve solo in alta quota"
    : avgFreezing > siteAlt + 1500 ? "Possibile neve sopra 2000m"
    : "Zero molto basso — rischio ghiaccio";
  const capeSub = avgCape > 1000 ? "⚠️ Forte instabilità — vigilanza dopo le 14:00"
    : avgCape > 400 ? "Buona energia — termiche controllabili"
    : avgCape > 100 ? "Termiche limitate"
    : "Nessuna energia termica";
  const thermalTopSub = thermalTop > siteAlt + 1500 ? `ottima per cross-country`
    : thermalTop > siteAlt + 800 ? `quota confortevole`
    : `top limitato dalla stabilità`;
  const cloudCoverSub = cloudCover >= 80 ? 'Termiche inibite'
    : cloudCover >= 50 ? 'Termiche irregolari'
    : 'Condizioni ideali per il termico';
  const pressureSub = pressureTrend > 2 ? "Bel tempo in arrivo"
    : pressureTrend < -2 ? "Peggioramento imminente"
    : "Stabile";

  return (
    <div className={`rounded-2xl overflow-hidden ${sc.border} bg-slate-900 shadow-xl transition-shadow duration-700 ${sc.glow}`} data-testid="meteo-tab">
      {/* ═══════════ TOP GRADIENT BAR ═══════════ */}
      <div className="h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-rose-400 animate-pulse" style={{ animationDuration: '3s' }} />

      {/* ═══════════ HERO: VOTO + CONDIZIONI ═══════════ */}
      <div className="px-5 py-5 border-b border-white/5 bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-transparent">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-600/10 border border-amber-500/40 flex items-center justify-center shrink-0">
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
                <span className="text-slate-600">{(() => { const d = new Date(); d.setDate(d.getDate() + selectedDay!); return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }); })()}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className={`px-3 py-1.5 rounded-xl border backdrop-blur-sm ${sc.badge}`}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.dot, animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
                <span className={`text-xs font-black tracking-wider ${sc.text}`}>{signalLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              {weatherCode >= 95 ? <Zap className="w-3 h-3 text-rose-400" style={{ animation: 'pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite' }} /> :
               weatherCode >= 80 ? <CloudRain className="w-3 h-3 text-orange-400" /> :
               weatherCode >= 30 ? <Cloud className="w-3 h-3 text-slate-400" /> :
               weatherCode >= 10 ? <Cloud className="w-3 h-3 text-amber-300" /> :
               <Sun className="w-3 h-3 text-amber-400" />}
              <span className="text-slate-400">{getWeatherDescription(weatherCode)}</span>
            </div>
          </div>
        </div>

        {/* Flight Score + Temp + Wind */}
        <div className="flex flex-col sm:flex-row items-stretch gap-4">
          {/* Flight Score */}
          <div className={`relative rounded-2xl p-5 border ${sc.bg} flex flex-col items-center justify-center text-center`}>
            <div className="absolute inset-0 rounded-2xl opacity-10" style={{ background: signal === 'green' ? 'radial-gradient(circle at 50% 50%, #10b981, transparent 70%)' : signal === 'yellow' ? 'radial-gradient(circle at 50% 50%, #f59e0b, transparent 70%)' : 'radial-gradient(circle at 50% 50%, #f43f5e, transparent 70%)' }} />
            <div className="absolute inset-0 rounded-2xl opacity-20" style={{ boxShadow: signal === 'green' ? 'inset 0 0 30px rgba(16,185,129,0.4)' : signal === 'yellow' ? 'inset 0 0 30px rgba(245,158,11,0.4)' : 'inset 0 0 30px rgba(244,63,94,0.4)' }} />
            <div className="relative">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-1">Voto Volo</div>
              <div className={`text-7xl font-black tabular-nums leading-none ${sc.text}`}>
                {animatedScore}
                <span className="text-lg text-slate-500 font-bold ml-0.5">/10</span>
              </div>
              <div className={`text-sm font-black mt-2 ${sc.text}`}>{signalLabel}</div>
              <div className="text-[10px] text-slate-500 mt-1">
                {isFlyable ? "Condizioni favorevoli" : signal === "yellow" ? "Valutare con attenzione" : "Non volare"}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500">
                {isFlyable ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-rose-400" />}
                <span>{isFlyable ? "Tutti i parametri nella norma" : "Parametri critici rilevati"}</span>
              </div>
            </div>
          </div>

          {/* Temperatura */}
          <div className="flex-1 rounded-2xl p-4 bg-slate-800/60 border border-slate-700/40">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Temperatura aria</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-5xl font-black text-white tabular-nums">{animatedTemp}</span>
                  <span className="text-xl text-amber-400/70 font-black">°C</span>
                </div>
              </div>
              <span className="text-3xl">{weatherCode >= 95 ? '⛈️' : weatherCode >= 80 ? '🌧️' : weatherCode >= 30 ? '☁️' : weatherCode >= 10 ? '🌤️' : '☀️'}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Percepita</span>
                <span className="font-bold text-slate-200">{Math.round(feelsLike)}°C</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Punto rugiada</span>
                <span className="font-bold text-slate-200">{Math.round(dew)}°C</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Spread (T-Tδ)</span>
                <span className="font-bold text-amber-300">{Math.round(spread)}°C</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2.5 leading-tight border-t border-slate-700/30 pt-2.5">
              {avgThermalRate > 1.2 ? '🔥 Termiche attive — l\'aria si riscalda rapidamente' : avgThermalRate > 0.6 ? '⛅ Termiche deboli — solo correnti locali' : '❄️ Nessuna termica — atmosfera stabile'}
            </p>
          </div>

          {/* Vento con indicatore rotante */}
          <div className="flex-1 rounded-2xl p-4 bg-slate-800/60 border border-slate-700/40">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Vento al suolo</div>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-5xl font-black text-white tabular-nums">{animatedWind}</span>
                  <span className="text-base text-amber-400/70 font-black">km/h</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-xs font-black text-amber-300">
                    {dirLabel(windDir)} {windDir}°
                  </span>
                </div>
              </div>
              <div className="relative w-10 h-10 shrink-0" style={{ transform: `rotate(${windDir - 180}deg)`, transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <Wind className="w-8 h-8 text-amber-400/40 absolute -top-1 -left-1" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-0.5 h-3 bg-amber-400 rounded-full origin-bottom" style={{ transformOrigin: 'bottom center', transform: 'translateY(-4px)' }} />
                </div>
              </div>
            </div>
            {windGusts > 0 && (
              <div className="flex items-center gap-2 text-xs mb-2">
                <span className="text-slate-500">Raffiche</span>
                <span className={`font-black ${windGusts > windSpeed * 1.5 ? "text-rose-400" : "text-orange-300"}`}>{Math.round(windGusts)} km/h</span>
                <span className="text-slate-600">·</span>
                <span className={`font-bold ${windGusts > windSpeed * 1.5 ? "text-rose-400" : "text-slate-400"}`}>×{gustRatio.toFixed(1)}</span>
              </div>
            )}
            <p className="text-[10px] text-slate-500 leading-tight border-t border-slate-700/30 pt-2.5">
              {windSpeed <= 8 ? "Calmo: decollo assistito e atterraggio dolce"
                : windSpeed <= 15 ? "Moderato: condizioni ideali per il termico"
                : windSpeed <= 25 ? "Sostenuto: attenzione in decollo e atterraggio"
                : "Forte: solo per piloti esperti"}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ PANNELLO DATI VOLO — DESIGN MIGLIORATO ═══════════ */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Dati di volo</span>
        </div>

        {/* Prima riga: 6 card premium */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {/* Rateo termico — card premium */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-rose-950/40 to-slate-900/80 border border-rose-500/25 p-3">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/0 via-rose-500/80 to-rose-500/0" />
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowUp className="w-3 h-3 text-rose-400" />
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Rateo termico</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-black text-rose-300 tabular-nums">{animatedThermalRate.toFixed(1)}</span>
              <span className="text-[9px] text-rose-400/60 font-semibold">m/s</span>
            </div>
            <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-600 to-pink-400 transition-all duration-700" style={{ width: `${Math.min(100, (animatedThermalRate / 4) * 100)}%` }} />
            </div>
            <div className="mt-1.5 text-[8px] text-slate-500 leading-tight">{rateoSub}</div>
          </div>

          {/* Base cumuli */}
          <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${veryLowCloudRisk ? 'from-rose-950/40 to-slate-900/80 border-rose-500/25' : lowCloudRisk ? 'from-violet-950/40 to-slate-900/80 border-violet-500/25' : 'from-emerald-950/40 to-slate-900/80 border-emerald-500/25'} border p-3`}>
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/0 via-emerald-500/80 to-rose-500/0" style={{ background: `linear-gradient(to right, transparent, ${veryLowCloudRisk ? '#f43f5e' : lowCloudRisk ? '#8b5cf6' : '#10b981'}, transparent)` }} />
            <div className="flex items-center gap-1.5 mb-2">
              <Mountain className={`w-3 h-3 ${veryLowCloudRisk ? 'text-rose-400' : lowCloudRisk ? 'text-violet-400' : 'text-emerald-400'}`} />
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Base cumuli</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className={`text-2xl font-black tabular-nums ${veryLowCloudRisk ? 'text-rose-300' : lowCloudRisk ? 'text-violet-300' : 'text-emerald-300'}`}>{Math.round(cloudBase)}</span>
              <span className="text-[9px] text-slate-500">m slm</span>
            </div>
            <div className="text-[9px] font-semibold" style={{ color: veryLowCloudRisk ? '#fb7185' : lowCloudRisk ? '#a78bfa' : '#34d399' }}>
              +{animatedCloudBaseDiff}m dal campo
            </div>
          </div>

          {/* Zero termico */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-950/40 to-slate-900/80 border border-violet-500/25 p-3">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500/80 to-transparent" />
            <div className="flex items-center gap-1.5 mb-2">
              <CloudSnow className="w-3 h-3 text-violet-400" />
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Zero termico</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-black text-violet-300 tabular-nums">{avgFreezing}</span>
              <span className="text-[9px] text-violet-400/60 font-semibold">m</span>
            </div>
            <div className="text-[9px] text-violet-400/60 font-semibold">
              {avgFreezing > siteAlt ? `+${Math.round(avgFreezing - siteAlt)}m sopr.` : '⚠ Sotto campo'}
            </div>
          </div>

          {/* CAPE + LI */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-950/40 to-slate-900/80 border border-emerald-500/25 p-3">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/80 to-transparent" />
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">CAPE</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className={`text-2xl font-black tabular-nums ${avgCape > 600 ? 'text-violet-300' : 'text-emerald-300'}`}>{animatedCape}</span>
              <span className="text-[9px] text-emerald-400/60 font-semibold">J/kg</span>
            </div>
            <div className="text-[9px] text-slate-400">
              LI: <span className={`font-bold ${avgLi < -4 ? 'text-rose-400' : avgLi < 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{avgLi.toFixed(1)}</span>
            </div>
          </div>

          {/* Top termica */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-amber-950/40 to-slate-900/80 border border-amber-500/25 p-3">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-500/80 to-transparent" />
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowUp className="w-3 h-3 text-amber-400" />
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Top termica</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-black text-amber-300 tabular-nums">{thermalTop}</span>
              <span className="text-[9px] text-amber-400/60 font-semibold">m</span>
            </div>
            <div className="text-[9px] text-amber-400/60 font-semibold">
              +{Math.round(thermalTop - siteAlt)}m
            </div>
          </div>

          {/* Rischio tufo */}
          <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${thunderProb > 40 ? 'from-rose-950/40 to-slate-900/80 border-rose-500/25' : thunderProb > 20 ? 'from-amber-950/40 to-slate-900/80 border-amber-500/25' : 'from-emerald-950/40 to-slate-900/80 border-emerald-500/25'} border p-3`}>
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-rose-500/80 to-transparent" style={{ background: thunderProb > 40 ? 'linear-gradient(to right, transparent, #f43f5e, transparent)' : thunderProb > 20 ? 'linear-gradient(to right, transparent, #f59e0b, transparent)' : 'linear-gradient(to right, transparent, #10b981, transparent)' }} />
            <div className="flex items-center gap-1.5 mb-2">
              <Activity className={`w-3 h-3 ${thunderProb > 40 ? 'text-rose-400' : thunderProb > 20 ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Rischio tufo</span>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className={`text-2xl font-black tabular-nums ${thunderProb > 40 ? 'text-rose-300' : thunderProb > 20 ? 'text-amber-300' : 'text-emerald-300'}`}>{thunderProb}</span>
              <span className="text-[9px] text-slate-500">%</span>
            </div>
            <div className="text-[9px] font-semibold" style={{ color: thunderProb > 40 ? '#fb7185' : thunderProb > 20 ? '#fbbf24' : '#34d399' }}>
              {thunderProb > 40 ? "Pericoloso" : thunderProb > 20 ? "Attenzione" : "Basso"}
            </div>
          </div>
        </div>

        {/* Seconda riga */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {/* Spread */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-800/80 border border-slate-700/40 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Thermometer className="w-3 h-3 text-rose-400" />
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Spread</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-black tabular-nums ${spread > 6 ? 'text-emerald-400' : spread > 3 ? 'text-amber-400' : 'text-rose-400'}`}>{Math.round(spread)}</span>
              <span className="text-[9px] text-slate-500">°C oggi</span>
            </div>
            <div className="text-[8px] text-slate-500 mt-1">Media giornata: <span className="font-bold text-slate-300">{avgSpread.toFixed(1)}°C</span></div>
          </div>

          {/* Pressione */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-800/80 border border-slate-700/40 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Gauge className="w-3 h-3 text-amber-400" />
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Pressione</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-amber-300 tabular-nums">{Math.round(pressure)}</span>
              <span className="text-[9px] text-amber-400/60">hPa</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {pressureTrend > 2 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : pressureTrend < -2 ? <TrendingDown className="w-3 h-3 text-rose-400" /> : <Minus className="w-3 h-3 text-slate-500" />}
              <span className={`text-[8px] font-semibold ${pressureTrendColor}`}>{pressureTrendLabel}</span>
              <span className="text-[8px] text-slate-600">Δ{pressureTrend > 0 ? "+" : ""}{pressureTrend.toFixed(1)}</span>
            </div>
          </div>

          {/* Copertura cielo */}
          <div className={`relative rounded-2xl overflow-hidden border p-3 ${cloudCover >= 90 ? 'bg-slate-700/30 border-slate-500/30' : cloudCover >= 50 ? 'bg-amber-950/30 border-amber-500/25' : 'bg-emerald-950/30 border-emerald-500/25'}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <CloudOff className={`w-3 h-3 ${cloudCover >= 90 ? 'text-slate-400' : cloudCover >= 50 ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Copertura</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-black tabular-nums ${cloudCover >= 90 ? 'text-slate-300' : cloudCover >= 50 ? 'text-amber-300' : 'text-emerald-300'}`}>{animatedCloudCover}%</span>
            </div>
            {cloudCover > 0 && (
              <div className="mt-1 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[7px] text-slate-500">
                  <span className="w-3 font-bold">B</span>
                  <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden"><div className="h-full bg-amber-500/70 rounded-full" style={{ width: `${cloudCoverLow}%` }} /></div>
                  <span className="w-6 text-amber-400 font-bold tabular-nums">{cloudCoverLow}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-[7px] text-slate-500">
                  <span className="w-3 font-bold">M</span>
                  <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden"><div className="h-full bg-violet-500/70 rounded-full" style={{ width: `${cloudCoverMid}%` }} /></div>
                  <span className="w-6 text-violet-400 font-bold tabular-nums">{cloudCoverMid}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-[7px] text-slate-500">
                  <span className="w-3 font-bold">A</span>
                  <div className="flex-1 h-1 bg-slate-700/50 rounded-full overflow-hidden"><div className="h-full bg-fuchsia-500/70 rounded-full" style={{ width: `${cloudCoverHigh}%` }} /></div>
                  <span className="w-6 text-fuchsia-400 font-bold tabular-nums">{cloudCoverHigh}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Visibilità */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-800/80 border border-slate-700/40 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="w-3 h-3 text-emerald-400" />
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Visibilità</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-emerald-300 tabular-nums">{Math.round(visibility / 1000)}</span>
              <span className="text-[9px] text-emerald-400/60">km</span>
            </div>
            <div className="text-[8px] text-slate-500 mt-1">
              {visibility >= 10000 ? "Navigazione sicura" : visibility >= 5000 ? "Volo locale OK" : "Attenzione navigazione"}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ VENTO IN QUOTA ═══════════ */}
      <div className="border-t border-white/5 px-5 py-4">
        <div className="flex items-center gap-2 mb-3.5">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Profilo vento verticale</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <div className="rounded-2xl p-3 bg-gradient-to-br from-amber-950/30 to-slate-900/60 border border-amber-500/20">
            <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">Suolo</div>
            <div className="text-xl font-black text-amber-300 tabular-nums">{Math.round(windSpeed)} <span className="text-sm text-amber-400/60 font-semibold">{dirLabel(windDir)}</span></div>
            {windGusts > 0 && <div className="text-xs text-slate-500 mt-1">Raffiche {Math.round(windGusts)} km/h · <span className={gustRatio > 1.5 ? "text-rose-400" : "text-slate-500"}>{turbulenceLevel}</span></div>}
          </div>
          {wind80m != null && (
            <div className="rounded-2xl p-3 bg-gradient-to-br from-orange-950/30 to-slate-900/60 border border-orange-500/20">
              <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">80m</div>
              <div className="text-xl font-black text-orange-300 tabular-nums">{Math.round(wind80m)} <span className="text-sm text-orange-400/60 font-semibold">{dirLabel(windDir80m ?? windDir)}</span></div>
              <div className="text-xs text-slate-500 mt-1">~{siteAlt + 80}m slm</div>
            </div>
          )}
          {wind120m != null && (
            <div className="rounded-2xl p-3 bg-gradient-to-br from-violet-950/30 to-slate-900/60 border border-violet-500/20">
              <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">120m</div>
              <div className="text-xl font-black text-violet-300 tabular-nums">{Math.round(wind120m)} <span className="text-sm text-violet-400/60 font-semibold">{dirLabel(windDir120m ?? windDir)}</span></div>
              <div className="text-xs text-slate-500 mt-1">~{siteAlt + 120}m slm</div>
            </div>
          )}
          {wind180m != null && (
            <div className="rounded-2xl p-3 bg-gradient-to-br from-purple-950/30 to-slate-900/60 border border-purple-500/20">
              <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">180m</div>
              <div className="text-xl font-black text-purple-300 tabular-nums">{Math.round(wind180m)} <span className="text-sm text-purple-400/60 font-semibold">{dirLabel(windDir180m ?? windDir)}</span></div>
              <div className="text-xs text-slate-500 mt-1">~{siteAlt + 180}m slm</div>
            </div>
          )}
        </div>

        {wind850 != null && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl p-3 bg-gradient-to-r from-violet-950/40 to-violet-900/20 border border-violet-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Waves className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[9px] text-violet-300 font-bold uppercase tracking-wider">Onda montana</span>
              </div>
              <div className="text-[9px] text-violet-400/60 font-semibold">Wave index: {waveIndex.toFixed(0)}° · Shear {windSheer} km/h</div>
              <p className="text-[8px] text-slate-500 mt-1 leading-tight">
                {waveIndex < 30 ? "🌊 Onda montana attiva — provare quote superiori" : waveIndex < 60 ? "Onda presente — condizioni favorevoli per volo in quota" : "Nessun effetto onda significativo"}
              </p>
            </div>
            <div className="rounded-2xl p-3 bg-slate-800/60 border border-slate-700/40">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Turbolenza</span>
              </div>
              <div className={`text-lg font-black tabular-nums ${turbulenceColor}`}>{turbulenceLevel}</div>
              <div className="text-[9px] text-slate-500">Rapporto raffiche: {gustRatio.toFixed(2)}x</div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ FINESTRA DI VOLO + PIOGGIA ═══════════ */}
      <div className="border-t border-white/5 px-5 py-4">
        <div className="flex items-center gap-2 mb-3.5">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Finestra di volo & precipitazioni</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-2xl p-3 bg-gradient-to-br from-emerald-950/30 to-slate-900/60 border border-emerald-500/20">
            <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">Ore favorevoli</div>
            <span className="text-2xl font-black text-emerald-300 tabular-nums">{flightHours}<span className="text-sm text-emerald-400/60 font-bold ml-1">h</span></span>
            <p className="text-[8px] text-slate-500 mt-1.5 leading-tight">
              {flightHours > 6 ? "Finestra ampia" : flightHours > 3 ? "Finestra decente" : "Finestra breve"}
            </p>
          </div>
          <div className="rounded-2xl p-3 bg-gradient-to-br from-amber-950/30 to-slate-900/60 border border-amber-500/20">
            <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">Orario migliore</div>
            <span className="text-base font-black text-amber-300 tabular-nums">{flightWindow}</span>
            <p className="text-[8px] text-slate-500 mt-1.5 leading-tight">spread &gt; 4°C e senza pioggia</p>
          </div>
          <div className="rounded-2xl p-3 bg-gradient-to-br from-violet-950/30 to-slate-900/60 border border-violet-500/20">
            <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">Pioggia (6h)</div>
            <span className={`text-2xl font-black tabular-nums ${nextRainProb > 40 ? "text-rose-300" : nextRainProb > 20 ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(nextRainProb)}<span className="text-sm font-bold ml-1">%</span></span>
            <p className="text-[8px] text-slate-500 mt-1.5 leading-tight">
              {nextRainProb > 40 ? "⚠️ Probabile — posticipare" : nextRainProb > 20 ? "Possibile isolata" : "Improbabile"}
            </p>
          </div>
          <div className="rounded-2xl p-3 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40">
            <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">Soleggiamento</div>
            <span className="text-2xl font-black text-amber-300 tabular-nums">{Math.round(totalSunshine / 3600 * 10) / 10}<span className="text-sm text-amber-400/60 font-bold ml-1">h</span></span>
            <p className="text-[8px] text-slate-500 mt-1.5 leading-tight">
              {totalSunshine / 3600 > 6 ? '☀️ Termiche garantite' : totalSunshine / 3600 > 3 ? '⛅ Parzialmente soleggiata' : '☁️ Termiche deboli'}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ RAPPORTO METEO ═══════════ */}
      {(warnings.length > 0 || tactics.length > 0) && (() => {
        const scoreColor = signal === "green" ? "text-emerald-400" : signal === "yellow" ? "text-amber-400" : "text-rose-400";
        const scoreBg = signal === "green" ? "from-emerald-500/15 to-emerald-600/5 border-emerald-500/30"
          : signal === "yellow" ? "from-amber-500/15 to-amber-600/5 border-amber-500/30"
          : "from-rose-500/15 to-rose-600/5 border-rose-500/30";
        const barColor = signal === "green" ? "from-emerald-400 to-emerald-500"
          : signal === "yellow" ? "from-amber-400 to-amber-500"
          : "from-rose-400 to-rose-500";
        const overallScore = signal === "green" ? 9 : signal === "yellow" ? 5 : 2;

        const termicoParts: string[] = [];
        if (avgThermalRate > 2) termicoParts.push(`Le termiche si presentano vigorose con un rateo medio di ${avgThermalRate.toFixed(1)} m/s, pertanto sarà possibile valutare con attenzione la scelta tra le diverse vallette per ottimizzare il volo.`);
        else if (avgThermalRate > 1.5) termicoParts.push(`Le termiche sono medie, con un rateo di ${avgThermalRate.toFixed(1)} m/s: il volo è possibile purché si utilizzi una tecnica corretta e si apprezzino le migliori colonne.`);
        else if (avgThermalRate > 1) termicoParts.push(`Le termiche sono discrete ma moderate (${avgThermalRate.toFixed(1)} m/s), consigliabile mantenere prudenza e privilegiare tratti brevi.`);
        else termicoParts.push(`Le termiche risultano deboli con rateo inferiore a 1 m/s, si raccomanda pertanto di preferire il dynamic di cresta piuttosto che il volo termico.`);

        if (avgLi < -4) termicoParts.push(`L'indice di sollevamento estremamente negativo (${avgLi.toFixed(1)}) indica un'instabilità marcata: è consigliabile limitare il volo al mattino.`);
        else if (avgLi < -2) termicoParts.push(`Instabilità moderata-${avgLi.toFixed(1)}: si prevedono termiche organizzate ma con tendenza al peggioramento nel pomeriggio.`);
        else if (avgLi > 0) termicoParts.push(`Atmosfera stabilmente stratificata (LI positivo): le termiche saranno scarsamente sviluppate, preferire il vento di cresta.`);

        if (pressureTrend > 2) termicoParts.push(`La pressione è in rialzo (${pressureTrendLabel}), il che suggerisce un miglioramento delle condizioni.`);
        else if (pressureTrend < -2) termicoParts.push(`La pressione è in calo (${pressureTrendLabel}): si avvicina un sistema perturbato, si consiglia di volare nelle prime ore.`);

        if (cinVal > 200) termicoParts.push(`Presente un'inibizione convettiva (CIN ${Math.round(cinVal)} J/kg): le termiche non si svilupperanno prima delle 10:30.`);
        else if (cinVal <= 200) termicoParts.push(`Nessuna inibizione convettiva rilevante: le termiche potranno attivarsi già dalle prime ore di sole.`);

        const ventoParts: string[] = [];
        ventoParts.push(`Il vento soffia da ${dirLabel(windDir)} (${windDir}°) con una velocità al suolo di ${Math.round(windSpeed)} km/h`);
        if (windGusts > 0) ventoParts[ventoParts.length - 1] += `, accompagnata da raffiche che raggiungono i ${Math.round(windGusts)} km/h`;
        ventoParts[ventoParts.length - 1] += `. La turbolenza è classificata come ${turbulenceLevel.toLowerCase()}`;

        if (windSpeed > 15 && windSpeed <= 25) ventoParts.push(`È fondamentale orientare il decollo sempre controvento e prestare la massima attenzione nelle fasi di atterraggio.`);
        else if (windSpeed > 10 && windSpeed <= 15) ventoParts.push(`Il vento è moderato: si prestino attenzioni a possibili rafaghe e a fenomeni di turbolenza meccanica.`);
        else if (windSpeed <= 10) ventoParts.push(`Condizioni di vento favorevoli per un decollo assistito e un atterraggio in sicurezza.`);

        if (wind850 != null && wind850 > 30) ventoParts.push(`In quota, il vento a 850 hPa supera i 30 km/h, condizione che richiede particolare cautela.`);
        if (wind850 != null && Math.abs(wind850 - windSpeed) > 15) ventoParts.push(`Significativo wind shear tra suolo e quota: attenzione alla transizione tra gli strati.`);
        if (waveIndex < 40 && wind850 != null && wind850 > 15) ventoParts.push(`Il wave index è favorevole allo sviluppo di onda montana: provare quote superiori.`);

        const strategiaParts: string[] = [];
        if (cloudBase > siteAlt + 800) strategiaParts.push(`La base dei cumuli si attesta a ${Math.round(cloudBase)} m slm (+${Math.round(cloudBase - siteAlt)}m dal campo), offrendo un ampio spazio di manovra e margini di sicurezza abbondanti.`);
        else if (cloudBase > siteAlt + 400) strategiaParts.push(`La base dei cumuli si trova a ${Math.round(cloudBase)} m slm: lo spazio di manovra è sufficiente.`);
        else strategiaParts.push(`Attenzione: la base dei cumuli si trova a soli ${Math.round(cloudBase - siteAlt)}m sopra il campo. Rischio di nebbia mattutina al decollo.`);

        if (flightHours > 6) strategiaParts.push(`La finestra di volo si estende per oltre ${flightHours} ore (${flightWindow}): è possibile pianificare con calma.`);
        else if (flightHours >= 4) strategiaParts.push(`Finestra di volo di circa ${flightHours} ore (${flightWindow}). Pianificare le ore centrali.`);
        else strategiaParts.push(`Finestra di volo breve (${flightHours} ore). Valutare attentamente se le condizioni sono sufficienti.`);

        if (thunderProb > 40) strategiaParts.push(`Il rischio temporali è elevato (${thunderProb}%): si sconsiglia vivamente il volo nel pomeriggio.`);
        else if (thunderProb > 20) strategiaParts.push(`Rischio temporali moderato (${thunderProb}%). Monitorare costantemente l'evoluzione.`);

        if (nextRainProb > 40) strategiaParts.push(`La probabilità di pioggia supera il ${Math.round(nextRainProb)}%: si consiglia di posticipare il volo.`);
        else if (nextRainProb > 20) strategiaParts.push(`Possibile pioggia isolata (${Math.round(nextRainProb)}%): tenere pronto il copri ala.`);

        if (tactics.some(t => t.includes("CAPE"))) {
          if (avgCape > 1000) strategiaParts.push(`Il CAPE medio raggiunge valori elevati (${Math.round(avgCape)} J/kg), indicativo di forte instabilità.`);
          else if (avgCape > 400) strategiaParts.push(`CAPE nella fascia ${Math.round(avgCape)} J/kg: energia termica sufficiente per termiche controllabili.`);
        }

        if (spread < 2 && humidity > 80) strategiaParts.push(`Aria molto umida con spread ridotto (${Math.round(spread)}°C): le termiche saranno pesanti ma poco organizzate.`);
        else if (spread > 8) strategiaParts.push(`Spread elevato (${Math.round(spread)}°C): aria secca in quota con termiche vigorose.`);

        const pericoloParts: string[] = [];
        const dangerWarnings = warnings.filter(w => w.type === "danger");
        const warningWarnings = warnings.filter(w => w.type === "warning");

        if (dangerWarnings.length > 0) {
          pericoloParts.push(`Si rilevano ${dangerWarnings.length} criticità di livello critico:`);
          dangerWarnings.forEach((w, i) => { pericoloParts.push(`${i + 1}) ${w.text}.`); });
        }
        if (warningWarnings.length > 0) {
          pericoloParts.push(`Ulteriori ${warningWarnings.length} avvertenze:`);
          warningWarnings.forEach((w, i) => { pericoloParts.push(`${dangerWarnings.length + i + 1}) ${w.text}.`); });
        }
        if (pericoloParts.length === 0) {
          pericoloParts.push("Nessun segnale di pericolo immediato rilevato.");
        }

        let giudizioFinale: string;
        if (signal === "green") {
          giudizioFinale = `Le condizioni meteo per il decollo di ${siteName || "questo sito"} si presentano complessivamente favorevoli. Il rateo termico medio e la quota della base dei cumuli consentono un volo termico sicuro.`;
        } else if (signal === "yellow") {
          giudizioFinale = `Le condizioni meteo presentano elementi di criticità che richiedono valutazione attenta. ${signalLabel.toLowerCase()}. Il volo è consentito solo a piloti con adeguata esperienza.`;
        } else {
          giudizioFinale = `Condizioni meteo critiche per il volo a ${siteName || "questo sito"}. ${signalLabel.toLowerCase()}. Si sconsiglia il decollo fino a netto miglioramento delle condizioni.`;
        }

        const dateStr = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

        return (
          <div className="rounded-2xl overflow-hidden shadow-2xl mt-1">
            <div className="px-6 py-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-800/60 via-slate-800/40 to-transparent">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-1">Bollettino meteo operatore</p>
                    <h4 className="text-base font-black text-white leading-tight">{siteName || "Decollo"} — {siteAlt}m slm</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {dateStr} · {String(now).padStart(2,"0")}:00 UTC · {modelName || "Open-Meteo"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className={`bg-gradient-to-br ${scoreBg} border rounded-2xl px-4 py-2.5 text-center`}>
                    <div className={`text-2xl font-black tabular-nums ${scoreColor}`}>{overallScore}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{signalLabel}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pt-4 pb-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Condizioni complessive</span>
                <span className="text-[10px] text-slate-500 font-semibold">{warnings.length + tactics.length} elementi analizzati</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000 ease-out`} style={{ width: `${overallScore * 10}%` }} />
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <section>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                    <Thermometer className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-orange-400/60 font-bold uppercase tracking-widest mr-2">01</span>
                    <span className="text-sm font-black text-orange-200">Quadro Termico &amp; Stabilità</span>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-[1.85] font-normal pl-11">{termicoParts.join(" ")}</p>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
                    <Wind className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-sky-400/60 font-bold uppercase tracking-widest mr-2">02</span>
                    <span className="text-sm font-black text-sky-200">Profilo Vento in Quota</span>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-[1.85] font-normal pl-11">{ventoParts.join(" ")}</p>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                    <Cloud className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <span className="text-[10px] text-violet-400/60 font-bold uppercase tracking-widest mr-2">03</span>
                    <span className="text-sm font-black text-violet-200">Convezione &amp; Rischio</span>
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-[1.85] font-normal pl-11">{strategiaParts.join(" ")}</p>
              </section>
            </div>

            <div className="mx-6 border-t border-slate-800/80" />

            <div className="px-6 py-4 space-y-2.5">
              <div className="flex items-start gap-3 bg-rose-500/8 border border-rose-500/20 rounded-2xl px-4 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <span className="text-[10px] text-rose-400/70 font-bold uppercase tracking-widest block mb-1">Segnali di pericolo</span>
                  <p className="text-xs text-rose-200/90 leading-[1.7] font-medium">{pericoloParts.join(" ")}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl px-4 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest block mb-1">Giudizio finale</span>
                  <p className="text-xs text-emerald-200/90 leading-[1.7] font-medium">{giudizioFinale}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
