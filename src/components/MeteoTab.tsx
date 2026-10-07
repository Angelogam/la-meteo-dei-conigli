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

function cardGlow(color: string) {
  return `box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 4px 20px -4px ${color}, inset 0 1px 0 rgba(255,255,255,0.05)`;
}

function metricCard({
  icon, label, sublabel, value, unit, color, bgFrom, bgTo, glowColor, children,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  value: React.ReactNode;
  unit?: string;
  color: string;
  bgFrom: string;
  bgTo: string;
  glowColor: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="relative rounded-2xl p-4 overflow-hidden group transition-all duration-300 hover:-translate-y-0.5"
      style={{ background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})`, boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px -8px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.06)` }}
    >
      {/* top shine */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {/* corner glow */}
      <div className="absolute -top-8 -right-8 w-16 h-16 rounded-full opacity-10" style={{ background: color, filter: 'blur(20px)' }} />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
            {icon}
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.12em] opacity-60">{label}</div>
            {sublabel && <div className="text-[8px] opacity-40 mt-0.5">{sublabel}</div>}
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-black tabular-nums" style={{ color }}>{value}</span>
        {unit && <span className="text-xs opacity-50 font-semibold">{unit}</span>}
      </div>

      {children && <div className="mt-2 pt-2.5 border-t border-white/5">{children}</div>}
    </div>
  );
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

  // ── Color helpers ──
  const rateoColor = avgThermalRate > 2 ? "#f43f5e" : avgThermalRate > 1.2 ? "#fb923c" : "#fbbf24";
  const cloudBaseColor = veryLowCloudRisk ? "#f43f5e" : lowCloudRisk ? "#a78bfa" : "#34d399";
  const thunderColor = thunderProb > 40 ? "#f43f5e" : thunderProb > 20 ? "#fbbf24" : "#34d399";
  const spreadColor = spread > 6 ? "#34d399" : spread > 3 ? "#fbbf24" : "#f43f5e";
  const skyColor = cloudCover >= 90 ? "#94a3b8" : cloudCover >= 50 ? "#fbbf24" : "#34d399";
  const liColor = avgLi < -4 ? "#f43f5e" : avgLi < 0 ? "#fbbf24" : "#34d399";
  const capeColor = avgCape > 600 ? "#a78bfa" : "#34d399";

  return (
    <div className={`rounded-2xl overflow-hidden ${sc.border} bg-[#0f172a] shadow-2xl transition-shadow duration-700 ${sc.glow}`} data-testid="meteo-tab">
      {/* ═══════════ TOP GRADIENT BAR ═══════════ */}
      <div className="h-0.5 bg-gradient-to-r from-sky-400 via-amber-400 to-rose-500 opacity-70" />

      {/* ═══════════ HERO ═══════════ */}
      <div className="px-6 py-6 border-b border-white/5" style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.5) 0%, transparent 100%)' }}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(249,115,22,0.1))', border: '1px solid rgba(245,158,11,0.3)' }}>
              <MapPin className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-white tracking-wide">{siteName || "Decollo"}</h2>
                {orientation && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                    <Wind className="w-3 h-3" />{orientation}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs">
                <span className="font-semibold text-slate-300">{siteAlt}m slm</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">{modelName || "Open-Meteo"}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">{(() => { const d = new Date(); d.setDate(d.getDate() + selectedDay!); return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }); })()}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className={`px-4 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-2.5`} style={{ ...sc }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.dot, animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite', boxShadow: `0 0 8px ${sc.dot}` }} />
              <span className={`text-xs font-black tracking-widest`}>{signalLabel}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {weatherCode >= 95 ? <Zap className="w-3 h-3 text-rose-400" style={{ animation: 'pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite' }} /> :
               weatherCode >= 80 ? <CloudRain className="w-3 h-3 text-orange-400" /> :
               weatherCode >= 30 ? <Cloud className="w-3 h-3 text-slate-400" /> :
               weatherCode >= 10 ? <Cloud className="w-3 h-3 text-amber-300" /> :
               <Sun className="w-3 h-3 text-amber-400" />}
              <span className="text-slate-400">{getWeatherDescription(weatherCode)}</span>
            </div>
          </div>
        </div>

        {/* Score + Temp + Wind */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          {/* Flight Score */}
          <div
            className="relative rounded-2xl p-6 flex flex-col items-center justify-center text-center overflow-hidden"
            style={{ background: signal === 'green' ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.03))' : signal === 'yellow' ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.03))' : 'linear-gradient(135deg, rgba(244,63,94,0.12), rgba(244,63,94,0.03))', border: `1px solid ${sc.border}` }}
          >
            <div className="absolute inset-0 opacity-5" style={{ background: signal === 'green' ? 'radial-gradient(circle at 50% 60%, #10b981, transparent 70%)' : signal === 'yellow' ? 'radial-gradient(circle at 50% 60%, #f59e0b, transparent 70%)' : 'radial-gradient(circle at 50% 60%, #f43f5e, transparent 70%)' }} />
            <div className="relative">
              <div className="text-[9px] text-slate-500 uppercase tracking-[0.15em] font-black mb-2">Voto Volo</div>
              <div className={`text-7xl font-black tabular-nums leading-none ${sc.text}`}>
                {animatedScore}
                <span className="text-lg text-slate-500 font-bold ml-0.5">/10</span>
              </div>
              <div className={`text-sm font-black mt-3 ${sc.text}`}>{signalLabel}</div>
              <div className="text-[10px] text-slate-500 mt-1">{isFlyable ? "Condizioni favorevoli" : signal === "yellow" ? "Valutare con attenzione" : "Non volare"}</div>
              <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500">
                {isFlyable ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-rose-400" />}
                <span>{isFlyable ? "Tutti i parametri nella norma" : "Parametri critici rilevati"}</span>
              </div>
            </div>
          </div>

          {/* Temperatura */}
          <div
            className="flex-1 rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[9px] text-slate-500 uppercase tracking-[0.12em] font-black">Temperatura aria</div>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-5xl font-black text-white tabular-nums leading-none">{animatedTemp}</span>
                  <span className="text-xl text-amber-400/60 font-black">°C</span>
                </div>
              </div>
              <span className="text-3xl opacity-80">{weatherCode >= 95 ? '⛈️' : weatherCode >= 80 ? '🌧️' : weatherCode >= 30 ? '☁️' : weatherCode >= 10 ? '🌤️' : '☀️'}</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Percepita", val: `${Math.round(feelsLike)}°C`, color: "text-slate-200" },
                { label: "Punto rugiada", val: `${Math.round(dew)}°C`, color: "text-slate-200" },
                { label: "Spread (T-Tδ)", val: `${Math.round(spread)}°C`, color: "text-amber-300 font-black" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{r.label}</span>
                  <span className={`text-xs font-bold ${r.color}`}>{r.val}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-3 leading-tight pt-3 border-t border-white/5">
              {avgThermalRate > 1.2 ? '🔥 Termiche attive' : avgThermalRate > 0.6 ? '⛅ Termiche deboli' : '❄️ Atmosfera stabile'}
            </p>
          </div>

          {/* Vento */}
          <div
            className="flex-1 rounded-2xl p-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/20 to-transparent" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[9px] text-slate-500 uppercase tracking-[0.12em] font-black">Vento al suolo</div>
                <div className="flex items-baseline gap-1 mt-1.5">
                  <span className="text-5xl font-black text-white tabular-nums leading-none">{animatedWind}</span>
                  <span className="text-base text-sky-400/50 font-black">km/h</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-black" style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)', color: '#7dd3fc' }}>
                    {dirLabel(windDir)} {windDir}°
                  </span>
                </div>
              </div>
              <div className="relative w-10 h-10 shrink-0" style={{ transform: `rotate(${windDir - 180}deg)`, transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                <Wind className="w-8 h-8 text-sky-400/30 absolute -top-1 -left-1" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-0.5 h-3 bg-sky-400 rounded-full origin-bottom" style={{ transformOrigin: 'bottom center', transform: 'translateY(-4px)' }} />
                </div>
              </div>
            </div>
            {windGusts > 0 && (
              <div className="flex items-center gap-2 text-xs mb-3">
                <span className="text-slate-500">Raffiche</span>
                <span className={`font-black ${windGusts > windSpeed * 1.5 ? "text-rose-400" : "text-orange-300"}`}>{Math.round(windGusts)} km/h</span>
                <span className="text-slate-600">·</span>
                <span className={`font-bold ${windGusts > windSpeed * 1.5 ? "text-rose-400" : "text-slate-400"}`}>×{gustRatio.toFixed(1)}</span>
              </div>
            )}
            <p className="text-[10px] text-slate-500 leading-tight pt-3 border-t border-white/5">
              {windSpeed <= 8 ? "Calmo: decollo assistito" : windSpeed <= 15 ? "Moderato: condizioni ideali" : windSpeed <= 25 ? "Sostenuto: attenzione" : "Forte: solo esperti"}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ DATI VOLO — CARDS RAFFINATE ═══════════ */}
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-sky-400 to-blue-500" />
          <span className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-black">Dati di volo</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {/* Rateo termico */}
          {metricCard({
            icon: <ArrowUp className="w-3.5 h-3.5" style={{ color: rateoColor }} />,
            label: "Rateo termico",
            sublabel: "Ascendenza media",
            value: <><span style={{ color: rateoColor }}>{animatedThermalRate.toFixed(1)}</span></>,
            unit: "m/s",
            color: rateoColor,
            bgFrom: "rgba(30,41,59,0.9)", bgTo: "rgba(15,23,42,0.95)",
            glowColor: `${rateoColor}30`,
            children: (
              <div>
                <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (animatedThermalRate / 4) * 100)}%`, background: `linear-gradient(90deg, ${rateoColor}80, ${rateoColor})` }} />
                </div>
                <p className="text-[8px] opacity-50 leading-tight">{rateoSub}</p>
              </div>
            ),
          })}

          {/* Base cumuli */}
          {metricCard({
            icon: <Mountain className="w-3.5 h-3.5" style={{ color: cloudBaseColor }} />,
            label: "Base cumuli",
            sublabel: "Quota nubi",
            value: <><span style={{ color: cloudBaseColor }}>{Math.round(cloudBase)}</span></>,
            unit: "m slm",
            color: cloudBaseColor,
            bgFrom: "rgba(30,41,59,0.9)", bgTo: "rgba(15,23,42,0.95)",
            glowColor: `${cloudBaseColor}30`,
            children: (
              <div>
                <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, (animatedCloudBaseDiff / 1500) * 100))}%`, background: `linear-gradient(90deg, ${cloudBaseColor}80, ${cloudBaseColor})` }} />
                </div>
                <p className="text-[8px] opacity-50">{cloudBaseSub}</p>
              </div>
            ),
          })}

          {/* Zero termico */}
          {metricCard({
            icon: <CloudSnow className="w-3.5 h-3.5 text-violet-400" />,
            label: "Zero termico",
            sublabel: "Confine neve",
            value: <><span className="text-violet-300 font-black tabular-nums">{avgFreezing}</span></>,
            unit: "m",
            color: "#a78bfa",
            bgFrom: "rgba(30,41,59,0.9)", bgTo: "rgba(15,23,42,0.95)",
            glowColor: "rgba(167,139,250,0.2)",
            children: (
              <p className="text-[8px] text-violet-400/60 leading-tight">{zeroTermSub}</p>
            ),
          })}

          {/* CAPE + LI */}
          {metricCard({
            icon: <Zap className="w-3.5 h-3.5" style={{ color: capeColor }} />,
            label: "CAPE",
            sublabel: "Energia termica",
            value: <><span style={{ color: capeColor }}>{animatedCape}</span></>,
            unit: "J/kg",
            color: capeColor,
            bgFrom: "rgba(30,41,59,0.9)", bgTo: "rgba(15,23,42,0.95)",
            glowColor: `${capeColor}30`,
            children: (
              <div className="flex items-center justify-between text-[8px]">
                <span className="opacity-50">Lifted Index</span>
                <span className="font-black" style={{ color: liColor }}>{avgLi.toFixed(1)}</span>
              </div>
            ),
          })}

          {/* Top termica */}
          {metricCard({
            icon: <ArrowUp className="w-3.5 h-3.5 text-amber-400" />,
            label: "Top termica",
            sublabel: "Massima quota",
            value: <><span className="text-amber-300 font-black tabular-nums">{thermalTop}</span></>,
            unit: "m",
            color: "#fbbf24",
            bgFrom: "rgba(30,41,59,0.9)", bgTo: "rgba(15,23,42,0.95)",
            glowColor: "rgba(251,191,36,0.2)",
            children: (
              <p className="text-[8px] text-amber-400/60 leading-tight">{thermalTopSub}</p>
            ),
          })}

          {/* Rischio tufo */}
          {metricCard({
            icon: <Activity className="w-3.5 h-3.5" style={{ color: thunderColor }} />,
            label: "Rischio tufo",
            sublabel: "Probabilità",
            value: <><span style={{ color: thunderColor }}>{thunderProb}</span></>,
            unit: "%",
            color: thunderColor,
            bgFrom: "rgba(30,41,59,0.9)", bgTo: "rgba(15,23,42,0.95)",
            glowColor: `${thunderColor}30`,
            children: (
              <p className="text-[8px] opacity-50 leading-tight">
                {thunderProb > 40 ? "Pericoloso — evitare pomeriggio" : thunderProb > 20 ? "Attenzione — monitorare" : "Basso rischio"}
              </p>
            ),
          })}
        </div>

        {/* Seconda riga */}
        <div className="grid grid-cols-4 gap-3 mt-3">
          {/* Spread */}
          <div
            className="relative rounded-2xl p-4 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/20 to-transparent" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <Thermometer className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Spread</div>
                <div className="text-[8px] text-slate-600">T − T punto rugiada</div>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-black tabular-nums" style={{ color: spreadColor }}>{Math.round(spread)}°C</span>
              <span className="text-[10px] text-slate-500">oggi</span>
            </div>
            <div className="text-[9px] text-slate-500">
              Media: <span className="font-bold text-slate-300">{avgSpread.toFixed(1)}°C</span>
            </div>
          </div>

          {/* Pressione */}
          <div
            className="relative rounded-2xl p-4 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Pressione</div>
                <div className="text-[8px] text-slate-600">Atmosferica</div>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-black text-amber-300 tabular-nums">{Math.round(pressure)}</span>
              <span className="text-[10px] text-amber-400/50">hPa</span>
            </div>
            <div className="flex items-center gap-1.5">
              {pressureTrend > 2 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : pressureTrend < -2 ? <TrendingDown className="w-3 h-3 text-rose-400" /> : <Minus className="w-3 h-3 text-slate-500" />}
              <span className={`text-[9px] font-bold ${pressureTrendColor}`}>{pressureTrendLabel}</span>
              <span className="text-[9px] text-slate-600">Δ{pressureTrend > 0 ? "+" : ""}{pressureTrend.toFixed(1)}</span>
            </div>
          </div>

          {/* Copertura cielo */}
          <div
            className="relative rounded-2xl p-4 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))', border: `1px solid ${skyColor}30`, boxShadow: `0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)` }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-400/20 to-transparent" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${skyColor}18`, border: `1px solid ${skyColor}30` }}>
                <CloudOff className="w-3.5 h-3.5" style={{ color: skyColor }} />
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Cielo</div>
                <div className="text-[8px] text-slate-600">Nuvolosità</div>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-black tabular-nums" style={{ color: skyColor }}>{animatedCloudCover}%</span>
              <span className="text-[10px] text-slate-500">{getCloudCoverLabel(cloudCover)}</span>
            </div>
            {cloudCover > 0 && (
              <div className="space-y-1">
                {[
                  { label: "Basso", pct: cloudCoverLow, color: "#fbbf24" },
                  { label: "Medio", pct: cloudCoverMid, color: "#a78bfa" },
                  { label: "Alto", pct: cloudCoverHigh, color: "#e879f9" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-2">
                    <span className="text-[8px] text-slate-500 w-5 font-bold">{l.label[0]}</span>
                    <div className="flex-1 h-1 bg-slate-700/60 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${l.pct}%`, background: l.color }} />
                    </div>
                    <span className="text-[8px] font-bold tabular-nums" style={{ color: l.color }}>{l.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visibilità */}
          <div
            className="relative rounded-2xl p-4 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Visibilità</div>
                <div className="text-[8px] text-slate-600">Distanza</div>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-black text-emerald-300 tabular-nums">{Math.round(visibility / 1000)}</span>
              <span className="text-[10px] text-emerald-400/50">km</span>
            </div>
            <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full transition-all" style={{ width: `${animatedVisibility}%` }} />
            </div>
            <p className="text-[8px] text-slate-500 leading-tight">
              {visibility >= 10000 ? "Navigazione sicura" : visibility >= 5000 ? "Volo locale OK" : "Attenzione navigazione"}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════ VENTO IN QUOTA ═══════════ */}
      <div className="border-t border-white/5 px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <span className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-black">Profilo vento verticale</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Suolo (10m)", val: Math.round(windSpeed), dir: dirLabel(windDir), color: "#fbbf24", sub: windGusts > 0 ? `Raffiche ${Math.round(windGusts)} km/h · ${turbulenceLevel}` : undefined, border: "rgba(251,191,36,0.2)" },
            { label: "80m", val: wind80m != null ? Math.round(wind80m) : null, dir: wind80m != null ? dirLabel(windDir80m ?? windDir) : null, color: "#fb923c", sub: `~${siteAlt + 80}m slm`, border: "rgba(251,146,60,0.2)" },
            { label: "120m", val: wind120m != null ? Math.round(wind120m) : null, dir: wind120m != null ? dirLabel(windDir120m ?? windDir) : null, color: "#a78bfa", sub: `~${siteAlt + 120}m slm`, border: "rgba(167,139,250,0.2)" },
            { label: "180m", val: wind180m != null ? Math.round(wind180m) : null, dir: wind180m != null ? dirLabel(windDir180m ?? windDir) : null, color: "#e879f9", sub: `~${siteAlt + 180}m slm`, border: "rgba(232,121,249,0.2)" },
          ].map(layer => layer.val !== null ? (
            <div
              key={layer.label}
              className="relative rounded-2xl p-4 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', border: `1px solid ${layer.border}`, boxShadow: `0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)` }}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="text-[9px] text-slate-500 uppercase tracking-[0.1em] font-black mb-2">{layer.label}</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black tabular-nums" style={{ color: layer.color }}>{layer.val}</span>
                <span className="text-sm text-slate-500 font-semibold">{layer.dir}</span>
                <span className="text-xs text-slate-600">km/h</span>
              </div>
              {layer.sub && <div className="text-[9px] text-slate-500 mt-1.5">{layer.sub}</div>}
            </div>
          ) : null)}
        </div>

        {wind850 != null && (
          <div className="grid grid-cols-2 gap-3">
            <div className="relative rounded-2xl p-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(88,28,135,0.15), rgba(15,23,42,0.9))', border: '1px solid rgba(167,139,250,0.25)', boxShadow: '0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent" />
              <div className="flex items-center gap-2 mb-2">
                <Waves className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-violet-300 font-black uppercase tracking-wider">Onda montana</span>
              </div>
              <div className="text-xs text-violet-400/60 font-semibold mt-1">Wave index: {waveIndex.toFixed(0)}° · Shear {windSheer} km/h</div>
              <p className="text-[9px] text-slate-500 mt-2 leading-tight">
                {waveIndex < 30 ? "Onda montana attiva — provare quote superiori per dynamic" : waveIndex < 60 ? "Onda presente — condizioni favorevoli per volo in quota" : "Nessun effetto onda significativo"}
              </p>
            </div>
            <div className="relative rounded-2xl p-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-400/20 to-transparent" />
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-rose-400" />
                <span className="text-xs text-slate-400 font-black uppercase tracking-wider">Turbolenza</span>
              </div>
              <div className={`text-xl font-black tabular-nums ${turbulenceColor}`}>{turbulenceLevel}</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">Rapporto raffiche: {gustRatio.toFixed(2)}x</div>
              <p className="text-[9px] text-slate-500 mt-2 leading-tight">
                {gustRatio > 1.8 ? "⚠️ Raffiche pericolose — decollo solo in assenza di vento" : gustRatio > 1.4 ? "Raffiche significative — valutare con attenzione" : "Turbolenza bassa — volo tranquillo"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ FINESTRA DI VOLO ═══════════ */}
      <div className="border-t border-white/5 px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
          <span className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-black">Finestra di volo & precipitazioni</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Ore favorevoli", value: `${flightHours}h`, sub: flightHours > 6 ? "Finestra ampia" : flightHours > 3 ? "Finestra decente" : "Finestra breve",
              color: "#34d399", border: "rgba(52,211,153,0.2)", bg: "rgba(52,211,153,0.06)",
            },
            {
              label: "Orario migliore", value: flightWindow, sub: "Spread > 4°C · no pioggia",
              color: "#fbbf24", border: "rgba(251,191,36,0.2)", bg: "rgba(251,191,36,0.06)",
            },
            {
              label: "Pioggia (6h)", value: `${Math.round(nextRainProb)}%`, sub: nextRainProb > 40 ? "Posticipare" : nextRainProb > 20 ? "Possibile isolata" : "Improbabile",
              color: nextRainProb > 40 ? "#f43f5e" : nextRainProb > 20 ? "#a78bfa" : "#34d399", border: nextRainProb > 40 ? "rgba(244,63,94,0.2)" : nextRainProb > 20 ? "rgba(167,139,250,0.2)" : "rgba(52,211,153,0.2)", bg: nextRainProb > 40 ? "rgba(244,63,94,0.06)" : nextRainProb > 20 ? "rgba(167,139,250,0.06)" : "rgba(52,211,153,0.06)",
            },
            {
              label: "Soleggiamento", value: `${(totalSunshine / 3600).toFixed(1)}h`, sub: totalSunshine / 3600 > 6 ? "Giornata soleggiata" : totalSunshine / 3600 > 3 ? "Parzialmente nuvoloso" : "Poca luce",
              color: "#fbbf24", border: "rgba(251,191,36,0.2)", bg: "rgba(251,191,36,0.06)",
            },
          ].map(card => (
            <div key={card.label} className="relative rounded-2xl p-4 overflow-hidden" style={{ background: card.bg, border: `1px solid ${card.border}`, boxShadow: '0 8px 32px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="text-[9px] text-slate-500 uppercase tracking-[0.1em] font-black mb-2">{card.label}</div>
              <div className="text-2xl font-black tabular-nums" style={{ color: card.color }}>{card.value}</div>
              <p className="text-[9px] text-slate-500 mt-2 leading-tight">{card.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ RAPPORTO METEO ═══════════ */}
      {(warnings.length > 0 || tactics.length > 0) && (() => {
        const scoreColor = signal === "green" ? "#34d399" : signal === "yellow" ? "#fbbf24" : "#f43f5e";
        const barColor = signal === "green" ? "from-emerald-400 to-emerald-500" : signal === "yellow" ? "from-amber-400 to-amber-500" : "from-rose-400 to-rose-500";
        const overallScore = signal === "green" ? 9 : signal === "yellow" ? 5 : 2;

        const termicoParts: string[] = [];
        if (avgThermalRate > 2) termicoParts.push(`Le termiche si presentano vigorose con un rateo medio di ${avgThermalRate.toFixed(1)} m/s.`);
        else if (avgThermalRate > 1.5) termicoParts.push(`Le termiche sono medie, con rateo di ${avgThermalRate.toFixed(1)} m/s.`);
        else if (avgThermalRate > 1) termicoParts.push(`Le termiche sono discrete ma moderate (${avgThermalRate.toFixed(1)} m/s).`);
        else termicoParts.push(`Le termiche risultano deboli con rateo inferiore a 1 m/s.`);

        if (avgLi < -4) termicoParts.push(`LI ${avgLi.toFixed(1)} indica instabilità marcata — volare al mattino.`);
        else if (avgLi < -2) termicoParts.push(`Instabilità moderata (${avgLi.toFixed(1)}) — tendenza al peggioramento pomeridiano.`);
        else if (avgLi > 0) termicoParts.push(`Atmosfera stabile (LI positivo): preferire il vento di cresta.`);

        if (pressureTrend > 2) termicoParts.push(`Pressione in rialzo (${pressureTrendLabel}): condizioni in miglioramento.`);
        else if (pressureTrend < -2) termicoParts.push(`Pressione in calo (${pressureTrendLabel}): si avvicina un sistema perturbato.`);

        if (cinVal > 200) termicoParts.push(`CIN ${Math.round(cinVal)} J/kg: le termiche si attivano dopo le 10:30.`);
        else termicoParts.push(`Nessuna inibizione convettiva — termiche attive dalle prime ore di sole.`);

        const ventoParts: string[] = [];
        ventoParts.push(`Vento da ${dirLabel(windDir)} (${windDir}°) ${Math.round(windSpeed)} km/h`);
        if (windGusts > 0) ventoParts[ventoParts.length - 1] += `, raffiche a ${Math.round(windGusts)} km/h`;
        ventoParts.push(`Turbolenza ${turbulenceLevel.toLowerCase()}.`);

        if (wind850 != null && wind850 > 30) ventoParts.push(`Vento a 850 hPa superiore a 30 km/h — attenzione shear verticale.`);
        if (waveIndex < 40 && wind850 != null && wind850 > 15) ventoParts.push(`Wave index favorevole — provare quote superiori per dynamic.`);

        const strategiaParts: string[] = [];
        if (cloudBase > siteAlt + 800) strategiaParts.push(`Base cumuli a ${Math.round(cloudBase)}m slm (+${Math.round(cloudBase - siteAlt)}m): spazio di manovra abbondante.`);
        else if (cloudBase > siteAlt + 400) strategiaParts.push(`Base cumuli a ${Math.round(cloudBase)}m slm: spazio sufficiente.`);
        else strategiaParts.push(`Attenzione: base cumuli a soli ${Math.round(cloudBase - siteAlt)}m — rischio nebbia mattutina.`);

        if (flightHours > 6) strategiaParts.push(`Finestra di ${flightHours}h (${flightWindow}): pianificare le ore centrali.`);
        else if (flightHours >= 4) strategiaParts.push(`Finestra di ${flightHours}h (${flightWindow}).`);
        else strategiaParts.push(`Finestra breve (${flightHours}h): valutare attentamente.`);

        if (thunderProb > 40) strategiaParts.push(`Rischio tufo ${thunderProb}% — evitare il pomeriggio.`);
        else if (thunderProb > 20) strategiaParts.push(`Rischio tufo moderato (${thunderProb}%): monitorare l'evoluzione.`);

        if (nextRainProb > 40) strategiaParts.push(`Pioggia probabile al ${Math.round(nextRainProb)}%: posticipare il volo.`);
        else if (nextRainProb > 20) strategiaParts.push(`Possibile pioggia isolata (${Math.round(nextRainProb)}%): tenere pronto il copri ala.`);

        if (avgCape > 1000) strategiaParts.push(`CAPE elevato (${Math.round(avgCape)} J/kg): energia termica abbondante ma rischio temporali.`);
        else if (avgCape > 400) strategiaParts.push(`CAPE ${Math.round(avgCape)} J/kg: energia termica sufficiente e controllabile.`);

        const pericoloParts: string[] = [];
        const dangerWarnings = warnings.filter(w => w.type === "danger");
        const warningWarnings = warnings.filter(w => w.type === "warning");
        if (dangerWarnings.length > 0) {
          pericoloParts.push(`Criticità (${dangerWarnings.length}):`);
          dangerWarnings.forEach((w, i) => { pericoloParts.push(`${i + 1}) ${w.text}.`); });
        }
        if (warningWarnings.length > 0) {
          warningWarnings.forEach((w, i) => { pericoloParts.push(`${dangerWarnings.length + i + 1}) ${w.text}.`); });
        }
        if (pericoloParts.length === 0) pericoloParts.push("Nessun segnale di pericolo immediato.");

        let giudizioFinale: string;
        if (signal === "green") giudizioFinale = `Condizioni complessivamente favorevoli per il decollo di ${siteName || "questo sito"}. Rateo termico e base dei cumuli consentono un volo sicuro.`;
        else if (signal === "yellow") giudizioFinale = `Condizioni critiche che richiedono valutazione attenta. ${signalLabel.toLowerCase()}. Volo consentito solo a piloti esperti.`;
        else giudizioFinale = `Condizioni meteo critiche per il volo. Si sconsiglia il decollo.`;

        const dateStr = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

        return (
          <div className="rounded-2xl overflow-hidden mt-1" style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 16px 64px -16px rgba(0,0,0,0.6)' }}>
            <div className="px-6 py-5 border-b border-white/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.25)' }}>
                    <FileText className="w-5 h-5 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] font-black mb-1">Bollettino meteo operatore</p>
                    <h4 className="text-sm font-black text-white">{siteName || "Decollo"} — {siteAlt}m slm</h4>
                    <p className="text-xs text-slate-500 mt-1">{dateStr} · {String(now).padStart(2,"0")}:00 UTC</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black tabular-nums" style={{ color: scoreColor }}>{overallScore}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{signalLabel}</div>
                </div>
              </div>
            </div>

            <div className="px-6 pt-3 pb-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Condizioni complessive</span>
                <span className="text-[9px] text-slate-600">{warnings.length + tactics.length} elementi analizzati</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000`} style={{ width: `${overallScore * 10}%` }} />
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              {[
                { num: "01", title: "Quadro Termico", color: "#fb923c", parts: termicoParts },
                { num: "02", title: "Profilo Vento", color: "#38bdf8", parts: ventoParts },
                { num: "03", title: "Convezione & Rischio", color: "#a78bfa", parts: strategiaParts },
              ].map(sec => (
                <section key={sec.num}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${sec.color}18`, border: `1px solid ${sec.color}30` }}>
                      <span className="text-[9px] font-black" style={{ color: sec.color }}>{sec.num}</span>
                    </div>
                    <span className="text-xs font-black" style={{ color: sec.color }}>{sec.title}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-[1.8] pl-10">{sec.parts.join(" ")}</p>
                </section>
              ))}
            </div>

            <div className="mx-6 border-t border-white/5" />

            <div className="px-6 py-4 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}>
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] text-rose-400/70 font-bold uppercase tracking-widest block mb-1">Segnali di pericolo</span>
                  <p className="text-xs text-rose-200/80 leading-relaxed">{pericoloParts.join(" ")}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' }}>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[9px] text-emerald-400/70 font-bold uppercase tracking-widest block mb-1">Giudizio finale</span>
                  <p className="text-xs text-emerald-200/80 leading-relaxed">{giudizioFinale}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
