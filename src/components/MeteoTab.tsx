"use client";

import type { MeteoCurrent } from "@/services/openMeteoService";
import type { HourData } from "@/types/meteo";
import {
  Zap, Calendar, MapPin, Wind, Thermometer, Droplets, Eye,
  Mountain, Cloud, Activity, AlertTriangle, CheckCircle2,
  CloudRain, ChevronDown, ChevronUp, Sun, Radiation,
  ArrowUp, CloudSnow, ArrowRight, TrendingUp,
  TrendingDown, Minus, CloudDrizzle, Waves, CloudLightning,
  Wind as WindIcon, Thermometer as TempIcon, Gauge, Sunrise,
  Sunset, CloudOff, Droplet, Flame, Zap as ZapIcon
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
  const a = 17.27;
  const b = 237.7;
  const gamma = (a * dew / (b + dew)) + Math.log((dew + 273.15) / (t + 273.15));
  if (gamma <= 0) return siteAlt;
  return Math.round(siteAlt + (b * (t + 273.15) * gamma) / (a * (t - dew)));
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
  if (pct >= 90) return "Totale";
  if (pct >= 70) return "Coperto";
  if (pct >= 50) return "Variabile";
  if (pct >= 30) return "Qualche nuvola";
  if (pct >= 10) return "Pochissime nubi";
  return "Sereno";
}

function getUVLabel(uv: number) {
  if (uv >= 11) return "Estremo";
  if (uv >= 8) return "Molto elevato";
  if (uv >= 6) return "Elevato";
  if (uv >= 3) return "Moderato";
  return "Basso";
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

export default function MeteoTab({ currentData, dayData, site, thermalDelta, modelName, selectedHour, selectedDay = 0, cape: propCape, liftedIndex: propLi, cin: propCin }: MeteoTabProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!currentData || dayData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900 rounded-3xl border border-slate-700/50">
        <Cloud className="w-12 h-12 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato meteo disponibile</p>
        <p className="text-sm mt-1 opacity-60">Verifica che il modello selezionato sia attivo</p>
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

  // === Calcoli per il volo ===
  const cloudBase = calcCloudBase(siteAlt, t, dew);
  const spread = Math.max(0.5, t - dew);
  const avgCape = dayData.reduce((s, h) => s + (h.cape ?? 0), 0) / dayData.length;
  const avgLi = dayData.reduce((s, h) => s + (h.liftedIndex ?? 0), 0) / dayData.length;
  const avgSpread = dayData.reduce((s, h) => s + Math.max(0.5, (h.temperature ?? t) - (h.dewPoint ?? dew)), 0) / dayData.length;
  const avgThermalRate = Math.min(4, Math.max(0.3, avgSpread * 0.25 + avgCape * 0.001));
  const maxThermalRate = Math.min(4, Math.max(0.3, avgSpread * 0.3 + (avgCape * 1.5) * 0.001));
  const currentRateo = Math.max(0.4, Math.min(2.5, avgThermalRate));
  const thermalTop = Math.round(Math.min(4000, cloudBase + Math.min(800, currentRateo * 100 + avgCape * 0.1)));

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

  const midData = dayData.slice(8, 16);
  const valid850 = midData.filter(h => h.windSpeed850 != null);
  const dir850Use = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windDir850 ?? 0), 0) / valid850.length : null;
  const wind850 = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windSpeed850 ?? 0), 0) / valid850.length : null;
  const waveIndex = calcWaveIndex(windDir, dir850Use ?? 180);

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
  const minUV = Math.min(...dayData.map(h => h.uvIndex ?? 0));

  const first6h = dayData.slice(0, 6);
  const last6h = dayData.slice(-6);
  const avgPressureFirst = first6h.reduce((s, h) => s + (h.pressure ?? 1013), 0) / first6h.length;
  const avgPressureLast = last6h.reduce((s, h) => s + (h.pressure ?? 1013), 0) / last6h.length;
  const pressureTrend = avgPressureLast - avgPressureFirst;
  const pressureTrendLabel = pressureTrend > 2 ? "↑ In rialzo" : pressureTrend < -2 ? "↓ In calo" : "→ Stabile";
  const pressureTrendColor = pressureTrend > 2 ? "text-emerald-400" : pressureTrend < -2 ? "text-rose-400" : "text-slate-400";

  const gustRatio = windGusts > 0 ? windGusts / windSpeed : 1;
  const turbulenceLevel = gustRatio > 1.8 ? "Alta" : gustRatio > 1.4 ? "Moderata" : "Bassa";
  const turbulenceColor = gustRatio > 1.8 ? "text-rose-400" : gustRatio > 1.4 ? "text-amber-400" : "text-emerald-400";

  const rainHours = dayData.filter(h => (h.precipitationProba ?? 0) > 30).map(h => ({
    hour: h.time instanceof Date ? h.time.getHours() : new Date(h.time).getHours(),
    prob: h.precipitationProba ?? 0
  }));

  const et0 = dayData.reduce((s, h) => s + (h.evapotranspiration ?? h.et0 ?? 0), 0);

  let signal: "green" | "yellow" | "red";
  let signalLabel: string;
  if (weatherCode >= 95 || weatherCode === 82) { signal = "red"; signalLabel = "TEMPORALI"; }
  else if (windSpeed > 30 || nextCape > 1000 || precipitation > 1) { signal = "red"; signalLabel = "PERICOLOSO"; }
  else if (windSpeed > 20 || avgCape > 600 || nextRainProb > 40 || cloudBase < siteAlt + 300) { signal = "yellow"; signalLabel = "ATTENZIONE"; }
  else { signal = "green"; signalLabel = "VOLO CONSENTITO"; }

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

  // ── Sottotitoli intelligenti per ogni dato ──
  const humiditySub = humidity > 70 ? "Aria umida: termiche pesanti ma rischio fulmini"
    : humidity > 40 ? "Umidità ideale: buon equilibrio per il volo"
    : "Aria secca: termiche leggere ma cielo limpido";
  const dewSub = Math.round(t - dew) > 8 ? `Spread ${Math.round(t - dew)}°C — termiche vigorose attese`
    : Math.round(t - dew) > 4 ? `Spread ${Math.round(t - dew)}°C — termiche moderate`
    : `Spread ${Math.round(t - dew)}°C — termiche deboli`;
  const visSub = visibility >= 10000 ? "Visibilità ottima — volo in sicurezza totale"
    : visibility >= 5000 ? "Visibilità buona — ok per volo locale"
    : visibility >= 3000 ? "Visibilità ridotta — attenzione alla navigazione"
    : "Visibilità pericolosa — non volare!";
  const windSub = windSpeed <= 8 ? "Vento calmo — decollo e atterraggio facili"
    : windSpeed <= 15 ? "Vento moderato — condizioni ideali per volo termico"
    : windSpeed <= 25 ? "Vento sostenuto — attenzione in quota e al decollo"
    : "Vento forte — sconsigliato per piloti non esperti";
  const rateoSub = avgThermalRate > 2 ? "Termiche forti — perfetto per cross-country"
    : avgThermalRate > 1.2 ? "Termiche buone — ideale per allenamento"
    : avgThermalRate > 0.7 ? "Termiche discrete — volo possibile con pazienza"
    : "Termiche deboli — meglio limitarsi al dinamico";
  const cloudBaseSub = cloudBase > siteAlt + 800 ? "Base alta: ampio spazio di volo sicuro"
    : cloudBase > siteAlt + 400 ? "Base accettabile: spazio di manovra buono"
    : cloudBase > siteAlt + 200 ? "Base bassa: volare con cautela"
    : "Base molto bassa: rischio nebbia e visibilità zero";
  const zeroTermSub = avgFreezing > siteAlt + 3000 ? `Zero alto (${avgFreezing}m): neve in quota, pioggia al suolo`
    : avgFreezing > siteAlt + 1500 ? "Zero medio: possibile neve in alta quota"
    : avgFreezing > siteAlt ? "Zero basso: attenzione al ghiaccio"
    : "Zero sotto il decollo: rischio neve immediata!";
  const capeSub = avgCape > 1000 ? "CAPE elevato: forte instabilità, vigilanza temporali"
    : avgCape > 400 ? "CAPE moderato: termiche sviluppate ma controllabili"
    : avgCape > 100 ? "CAPE basso: cielo probabilmente stabile"
    : "CAPE nullo: nessuna energia termica disponibile";
  const thermalTopSub = thermalTop > siteAlt + 1500 ? `Top termico a ${thermalTop}m — massima quota di sviluppo`
    : thermalTop > siteAlt + 800 ? `Top termico a ${thermalTop}m — quota di volo confortevole`
    : `Top termico a ${thermalTop}m — limitato dalla stabilità`;
  const cloudCoverSub = cloudCover >= 90 ? "Cielo coperto: termiche inibite, solo动态 volo di cresta"
    : cloudCover >= 60 ? "Nuvolosità marcata: termiche possibili ma irregolari"
    : cloudCover >= 30 ? "Parzialmente nuvoloso: buone condizioni per termiche"
    : "Cielo sereno: condizioni ideali per il volo";
  const pressureSub = pressureTrend > 2 ? "Alta pressione:bel tempo in arrivo, termiche classiche"
    : pressureTrend < -2 ? "Pressione in calo: peggioramento imminente, volare subito"
    : "Pressione stabile: condizioni costanti durante la giornata";

  return (
    <div className={`rounded-3xl overflow-hidden border ${getSignalBorder(signal)} shadow-2xl`}>
      {/* ══════════════ TOP GRADIENT BAR ══════════════ */}
      <div className="h-1 bg-gradient-to-r from-orange-400 via-amber-400 to-rose-400" />

      {/* ══════════════ HEADER ══════════════ */}
      <div className="px-5 py-4 bg-slate-900/95 border-b border-white/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-600/10 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
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
              <div className="flex items-center gap-2 mt-1 text-xs">
                <Calendar className="w-3 h-3 text-amber-500/50 shrink-0" />
                <span className="font-medium text-slate-400">{(() => { const d = new Date(); d.setDate(d.getDate() + selectedDay); return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }); })()}</span>
                <span className="text-slate-700">·</span>
                <span className="font-semibold text-slate-300">{siteAlt}m slm</span>
                <span className="text-slate-700">·</span>
                <span className="text-amber-500/70 font-semibold text-xs">{modelName || "Open-Meteo"}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className={`px-3 py-1.5 rounded-xl border backdrop-blur-sm ${
              signal === 'green' ? 'bg-emerald-500/15 border-emerald-500/40' :
              signal === 'yellow' ? 'bg-amber-500/15 border-amber-500/40' :
              'bg-rose-500/15 border-rose-500/40'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getSignalDot(signal)} animate-pulse`} />
                <span className={`text-xs font-black tracking-wider ${getSignalText(signal)}`}>{signalLabel}</span>
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

      {/* ══════════════ HERO: TEMP + WIND COMPASS ══════════════ */}
      <div className="px-5 py-5 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-transparent border-b border-white/5">
        <div className="flex items-center justify-between gap-6">
          {/* Temperatura */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/25 to-orange-600/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <span className="text-3xl select-none">{weatherCode >= 95 ? '⛈️' : weatherCode >= 80 ? '🌧️' : weatherCode >= 30 ? '☁️' : weatherCode >= 10 ? '🌤️' : '☀️'}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-950 border border-amber-500/40 flex items-center justify-center">
                <span className="text-[8px] font-black text-amber-300">{Math.round(t > feelsLike ? 1 : t < feelsLike ? -1 : 0)}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-amber-500/60 uppercase tracking-widest font-black mb-1">Temperatura aria</div>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-black text-white tabular-nums leading-none">{Math.round(t)}</span>
                <span className="text-2xl text-amber-400/70 font-black -mt-1">°C</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs">
                <span className="text-slate-500">Percepiti <span className="font-bold text-slate-200">{Math.round(feelsLike)}°</span></span>
                <span className="text-slate-700">·</span>
                <span className="text-slate-500">P. rugiada <span className="font-bold text-slate-300">{Math.round(dew)}°</span></span>
                <span className="text-slate-700">·</span>
                <span className="text-slate-500">Spread <span className="font-bold text-amber-300">{Math.round(spread)}°</span></span>
              </div>
              <p className="text-[10px] text-amber-400/50 mt-1.5 leading-tight max-w-[280px]">
                {avgThermalRate > 1.2 ? '🔥 Termiche attive — l\'aria si riscalda rapidamente' : avgThermalRate > 0.6 ? '⛅ Teramica debole — solo termiche locali' : '❄️ Nessuna termica —atmosfera stabile'}
              </p>
            </div>
          </div>

          {/* Vento + bussola */}
          <div className="flex items-center gap-5">
            <div className="text-right">
              <div className="text-[10px] text-amber-500/60 uppercase tracking-widest font-black mb-1">Vento al suolo</div>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-6xl font-black text-white tabular-nums leading-none">{Math.round(windSpeed)}</span>
                <span className="text-base text-amber-400/70 font-black">km/h</span>
              </div>
              {windGusts > 0 && (
                <div className="flex items-center justify-end gap-1.5 mt-1">
                  <span className="text-xs text-slate-500 font-semibold">Raffiche</span>
                  <span className="flex items-center gap-0.5 text-xs text-orange-400 font-black">
                    <ArrowUp className="w-3 h-3 rotate-45" />{Math.round(windGusts)}
                  </span>
                  <span className="text-xs text-slate-600">km/h</span>
                  <span className="text-xs text-slate-600">·</span>
                  <span className={`text-xs font-black ${windGusts > windSpeed * 1.5 ? "text-rose-400" : "text-slate-400"}`}>
                    {gustRatio.toFixed(2)}x
                  </span>
                </div>
              )}
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-xs font-black text-amber-300">
                  <Wind className="w-3 h-3" />{dirLabel(windDir)} {windDir}°
                </span>
              </div>
              <p className="text-[10px] text-amber-400/50 mt-1.5 leading-tight max-w-[240px] text-right">{windSub}</p>
            </div>
            {/* Bussola vento */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-slate-800/90 border-2 border-amber-500/20 shadow-2xl" />
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
                <div key={deg} className="absolute w-px bg-amber-500/25 origin-center"
                  style={{ height: deg % 90 === 0 ? '5px' : '3px', top: deg % 90 === 0 ? '1px' : '2px', left: '50%', transform: `translateX(-50%) rotate(${deg}deg)`, transformOrigin: '50% 28px' }} />
              ))}
              <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[7px] font-black text-amber-500/50">N</span>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-black text-amber-500/50">S</span>
              <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] font-black text-amber-500/50">O</span>
              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[7px] font-black text-amber-500/50">E</span>
              <div className="absolute inset-1.5 rounded-full flex items-center justify-center" style={{ transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', transform: `rotate(${windAngle}deg)` }}>
                <div className="relative w-0.5 h-7 flex flex-col items-center">
                  <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[10px] border-b-amber-400 drop-shadow-lg" />
                  <div className="w-0.5 h-5 bg-gradient-to-b from-amber-400 to-orange-600 rounded-full" />
                </div>
                <div className="w-0.5 h-2.5 bg-slate-500 rounded-full absolute -bottom-1" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pt-5">
                <span className="text-[8px] font-black text-amber-400/60 tabular-nums">{windDir}°</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 metric cards orizzontali */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-5">
          {/* Umidità */}
          <div className="rounded-xl p-3.5 bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-slate-700/40 hover:border-orange-500/30 transition-all group cursor-default">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-500/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Droplets className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Umidità</div>
                <div className="text-[9px] text-slate-600 font-semibold">H₂O nell'aria</div>
              </div>
            </div>
            <span className="text-3xl font-black text-orange-300 tabular-nums">{humidity}%</span>
            <div className="h-1.5 bg-slate-700/50 rounded-full mt-2.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-700 to-orange-400 rounded-full transition-all duration-500" style={{ width: `${humidity}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{humiditySub}</p>
          </div>

          {/* Punto di rugiada */}
          <div className="rounded-xl p-3.5 bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-slate-700/40 hover:border-rose-500/30 transition-all group cursor-default">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-500/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Thermometer className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Punto di rugiada</div>
                <div className="text-[9px] text-slate-600 font-semibold">Temperatura condensa</div>
              </div>
            </div>
            <span className="text-3xl font-black text-rose-300 tabular-nums">{Math.round(dew)}°</span>
            <div className="h-1.5 bg-slate-700/50 rounded-full mt-2.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-700 to-rose-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ((dew + 20) / 60) * 100)}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{dewSub}</p>
          </div>

          {/* Pressione */}
          <div className="rounded-xl p-3.5 bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-slate-700/40 hover:border-amber-500/30 transition-all group cursor-default">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Gauge className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Pressione</div>
                <div className="text-[9px] text-slate-600 font-semibold">Atmosferica</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-amber-300 tabular-nums">{Math.round(pressure)}</span>
              <span className="text-xs text-amber-400/60 font-bold">hPa</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold">
              {pressureTrend > 2 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : pressureTrend < -2 ? <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> : <Minus className="w-3.5 h-3.5 text-slate-500" />}
              <span className={pressureTrendColor}>{pressureTrendLabel}</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{pressureSub}</p>
          </div>

          {/* Visibilità */}
          <div className="rounded-xl p-3.5 bg-gradient-to-br from-slate-800/80 to-slate-900/60 border border-slate-700/40 hover:border-emerald-500/30 transition-all group cursor-default">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Eye className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Visibilità</div>
                <div className="text-[9px] text-slate-600 font-semibold">Distanza visibile</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-emerald-300 tabular-nums">{Math.round(visibility / 1000)}</span>
              <span className="text-xs text-emerald-400/60 font-bold">km</span>
            </div>
            <div className="h-1.5 bg-slate-700/50 rounded-full mt-2.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (visibility / 15000) * 100)}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{visSub}</p>
          </div>
        </div>
      </div>

      {/* ══════════════ VERDETTO VOLO ══════════════ */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Verdetto volo</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 font-semibold bg-slate-800/50 px-2 py-1 rounded-lg">{flightHours}h favorevoli</span>
            <span className="text-[10px] text-slate-500 font-semibold bg-slate-800/50 px-2 py-1 rounded-lg">⏰ {flightWindow}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Signal card */}
          <div className={`relative rounded-2xl p-4 border overflow-hidden group ${
            signal === 'green' ? 'bg-emerald-500/10 border-emerald-500/30' :
            signal === 'yellow' ? 'bg-amber-500/10 border-amber-500/30' :
            'bg-rose-500/10 border-rose-500/30'
          }`}>
            <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity" style={{ background: signal === 'green' ? 'radial-gradient(circle at 30% 50%, #10b981, transparent 70%)' : signal === 'yellow' ? 'radial-gradient(circle at 30% 50%, #f59e0b, transparent 70%)' : 'radial-gradient(circle at 30% 50%, #f43f5e, transparent 70%)' }} />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black border ${
                  signal === "green" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                  signal === "yellow" ? "bg-amber-500/20 border-amber-500/40 text-amber-400" :
                  "bg-rose-500/20 border-rose-500/40 text-rose-400"
                }`}>
                  {getSignalEmoji(signal)}
                </div>
                <div>
                  <div className={`text-sm font-black ${getSignalText(signal)}`}>{signalLabel}</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    {isFlyable ? "Volo consigliato — tutti i parametri ok" : isMaybeFlyable ? "Valuta con attenzione" : "Non volare — pericolo"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                {isFlyable ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : isMaybeFlyable ? <AlertTriangle className="w-3 h-3 text-amber-400" /> : <AlertTriangle className="w-3 h-3 text-rose-400" />}
                <span>{isFlyable ? "Tutti i parametri nella norma" : isMaybeFlyable ? "Qualche criticità da monitorare" : "Parametri critici rilevati"}</span>
              </div>
            </div>
          </div>

          {/* Cloud cover */}
          <div className={`relative rounded-2xl p-4 border overflow-hidden group ${cloudCover >= 90 ? 'bg-slate-500/10 border-slate-500/30' : cloudCover >= 70 ? 'bg-violet-500/10 border-violet-500/30' : cloudCover >= 50 ? 'bg-amber-500/10 border-amber-500/30' : cloudCover >= 20 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
                cloudCover >= 90 ? "bg-slate-500/20" : cloudCover >= 70 ? "bg-violet-500/20" : cloudCover >= 50 ? "bg-amber-500/20" : cloudCover >= 20 ? "bg-orange-500/20" : "bg-emerald-500/20"
              }`}>
                <Cloud className={`w-4 h-4 ${
                  cloudCover >= 90 ? "text-slate-400" : cloudCover >= 70 ? "text-violet-400" : cloudCover >= 50 ? "text-amber-400" : cloudCover >= 20 ? "text-orange-400" : "text-emerald-400"
                }`} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider">Copertura cielo</span>
                <div className="text-[9px] text-slate-500 font-semibold mt-0.5">Percentuale nuvole</div>
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-2.5">
              <span className="text-3xl font-black tabular-nums">{cloudCover}%</span>
              <span className="text-xs font-semibold opacity-70">{getCloudCoverLabel(cloudCover)}</span>
            </div>
            {cloudCover > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                  <span className="w-4 text-right font-bold">B</span>
                  <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500/70 rounded-full transition-all" style={{ width: `${cloudCoverLow}%` }} />
                  </div>
                  <span className="w-6 text-amber-400 font-bold tabular-nums">{cloudCoverLow}%</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                  <span className="w-4 text-right font-bold">M</span>
                  <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500/70 rounded-full transition-all" style={{ width: `${cloudCoverMid}%` }} />
                  </div>
                  <span className="w-6 text-violet-400 font-bold tabular-nums">{cloudCoverMid}%</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-slate-500">
                  <span className="w-4 text-right font-bold">A</span>
                  <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-fuchsia-500/70 rounded-full transition-all" style={{ width: `${cloudCoverHigh}%` }} />
                  </div>
                  <span className="w-6 text-fuchsia-400 font-bold tabular-nums">{cloudCoverHigh}%</span>
                </div>
              </div>
            )}
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{cloudCoverSub}</p>
          </div>

          {/* Cloud base */}
          <div className={`relative rounded-2xl p-4 border overflow-hidden ${veryLowCloudRisk ? "bg-rose-500/10 border-rose-500/30" : lowCloudRisk ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${veryLowCloudRisk ? "bg-rose-500/20" : lowCloudRisk ? "bg-violet-500/20" : "bg-emerald-500/20"}`}>
                <Mountain className={`w-4 h-4 ${veryLowCloudRisk ? "text-rose-400" : lowCloudRisk ? "text-violet-400" : "text-emerald-400"}`} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider">Base cumuli</span>
                <div className="text-[9px] text-slate-500 font-semibold mt-0.5">Quota inizio nuvole</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1.5">
              <span className={`text-3xl font-black tabular-nums ${veryLowCloudRisk ? "text-rose-300" : lowCloudRisk ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(cloudBase)}</span>
              <span className="text-xs font-semibold opacity-70">m slm</span>
            </div>
            <div className={`text-xs font-bold mb-2.5 ${veryLowCloudRisk ? "text-rose-400" : lowCloudRisk ? "text-violet-400" : "text-emerald-400"}`}>
              {veryLowCloudRisk ? '⚠ Troppo bassa' : lowCloudRisk ? '↑ Marginale' : '✓ Buona'} (+{Math.round(cloudBase - siteAlt)}m dal suolo)
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
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{cloudBaseSub}</p>
          </div>
        </div>
      </div>

      {/* ══════════════ RAIN TIMELINE ══════════════ */}
      {rainHours.length > 0 && (
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3.5">
            <CloudRain className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Rischio piovaschi — 09:00 / 19:00</span>
            <div className="ml-auto flex items-center gap-3 text-[9px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> 10-30%</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" /> 30-50%</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" /> &gt;50%</span>
            </div>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/40">
            <div className="flex gap-1 mb-2">
              {[9,10,11,12,13,14,15,16,17,18,19].map(h => (
                <div key={h} className="flex-1 text-center">
                  <span className="text-[9px] font-black text-slate-500 tabular-nums">{String(h).padStart(2,"0")}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-1 items-end h-16">
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
                    <div className={`h-4 flex items-center justify-center transition-all ${prob > 30 ? '' : 'opacity-60'}`}>
                      <span>{prob > 50 ? "🌧️" : prob > 30 ? "🌦️" : prob > 10 ? "☁️" : hour >= 10 && hour <= 15 ? "☀️" : "🌙"}</span>
                    </div>
                    <div className={`w-full rounded-md bg-gradient-to-t ${barColor} transition-all duration-500 group-hover:opacity-80`}
                         style={{ height: `${Math.max(4, prob)}%`, minHeight: `${Math.max(4, prob)}%` }} />
                    {isNow && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-sm shadow-white/50" />}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-[10px] text-white font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
                      {hour}:00 — {Math.round(prob)}% pioggia
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2.5 flex items-center justify-center gap-3 text-[10px] text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white" /> ora attuale</span>
              <span>·</span>
              <span>09:00 → 19:00</span>
              <span>·</span>
              <span className="text-rose-400">🌧️ &gt;50%</span>
              <span className="text-violet-400">🌦️ 30-50%</span>
              <span className="text-orange-400">☁️ &lt;30%</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ PARAMETRI DI VOLO ══════════════ */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-black mb-3.5">Parametri di volo</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Rateo termico */}
          <div className="rounded-xl p-3.5 border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-rose-600/5 hover:border-rose-500/40 transition-all">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <ArrowUp className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div>
                <span className="text-[9px] text-rose-400/80 font-black uppercase tracking-wider">Rateo termico</span>
                <div className="text-[9px] text-slate-500 font-semibold">Velocità ascendenza</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-rose-300 tabular-nums">{avgThermalRate.toFixed(1)}</span>
              <span className="text-xs text-rose-400/60 font-bold">m/s</span>
            </div>
            <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-600 to-pink-400 rounded-full transition-all" style={{ width: `${Math.min(100, avgThermalRate / 4 * 100)}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{rateoSub}</p>
          </div>

          {/* Base cumuli */}
          <div className="rounded-xl p-3.5 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5 hover:border-amber-500/40 transition-all">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <span className="text-[9px] text-amber-400/80 font-black uppercase tracking-wider">Base cumuli</span>
                <div className="text-[9px] text-slate-500 font-semibold">Quota nuvole basse</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-300 tabular-nums">{Math.round(cloudBase)}</span>
              <span className="text-xs text-amber-400/60 font-bold">m</span>
            </div>
            <div className="text-[9px] text-amber-400/50 font-semibold mt-1.5">+{Math.round(cloudBase - siteAlt)}m sopra il campo</div>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{cloudBaseSub}</p>
          </div>

          {/* Zero termico */}
          <div className="rounded-xl p-3.5 border hover:border-violet-500/40 transition-all bg-gradient-to-br from-violet-500/10 to-violet-600/5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <CloudSnow className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div>
                <span className="text-[9px] text-violet-400/80 font-black uppercase tracking-wider">Zero termico</span>
                <div className="text-[9px] text-slate-500 font-semibold">Confine neve/pioggia</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black tabular-nums ${avgFreezing < siteAlt + 2000 ? "text-rose-300" : "text-violet-300"}`}>{avgFreezing}</span>
              <span className="text-xs text-violet-400/60 font-bold">m</span>
            </div>
            <div className="text-[9px] text-violet-400/50 font-semibold mt-1.5">{avgFreezing > siteAlt ? `+${Math.round(avgFreezing - siteAlt)}m sopr. decollo` : "⚠ Sotto il decollo!"}</div>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{zeroTermSub}</p>
          </div>

          {/* CAPE */}
          <div className="rounded-xl p-3.5 border hover:border-emerald-500/40 transition-all bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ZapIcon className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <span className="text-[9px] text-emerald-400/80 font-black uppercase tracking-wider">CAPE</span>
                <div className="text-[9px] text-slate-500 font-semibold">Energia termica</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black tabular-nums ${avgCape > 600 ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(avgCape)}</span>
              <span className="text-xs text-emerald-400/60 font-bold">J/kg</span>
            </div>
            <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${avgCape > 600 ? "bg-violet-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, avgCape / 1500 * 100)}%` }} />
            </div>
            <p className="text-[9px] text-slate-500 mt-2 leading-tight">{capeSub}</p>
          </div>
        </div>
      </div>

      {/* ══════════════ PROFILI QUOTA ══════════════ */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3.5">
          <ArrowUp className="w-4 h-4 text-amber-400" />
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Profili quota & ambiente</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Top termico */}
          <div className="rounded-xl p-3.5 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <span className="text-[9px] text-amber-400/80 font-black uppercase tracking-wider">Top termica</span>
                <div className="text-[9px] text-slate-500 font-semibold">Massima quota</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-300 tabular-nums">{thermalTop}</span>
              <span className="text-xs text-amber-400/60 font-bold">m</span>
            </div>
            <div className="text-[9px] text-amber-400/50 font-semibold mt-1">+{Math.round(thermalTop - siteAlt)}m dal suolo</div>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{thermalTopSub}</p>
          </div>

          {/* Stato cielo */}
          <div className="rounded-xl p-3.5 border hover:border-slate-500/40 transition-all bg-gradient-to-br from-slate-500/10 to-slate-600/5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-slate-500/20 flex items-center justify-center">
                <CloudOff className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Stato cielo</span>
                <div className="text-[9px] text-slate-500 font-semibold">Condizioni generali</div>
              </div>
            </div>
            <span className={`text-lg font-black tabular-nums ${cloudCover >= 90 ? "text-slate-300" : cloudCover >= 70 ? "text-violet-300" : "text-emerald-300"}`}>
              {cloudCover >= 90 ? "Tot. coperto" : cloudCover >= 70 ? "Coperto" : cloudCover >= 50 ? "Variabile" : cloudCover >= 20 ? "Poco nuvoloso" : "Sereno"}
            </span>
            <div className="text-[9px] text-slate-500 font-semibold mt-1.5">{cloudCover}% copertura totale</div>
          </div>

          {/* UV */}
          <div className="rounded-xl p-3.5 border hover:border-orange-500/40 transition-all bg-gradient-to-br from-orange-500/10 to-orange-600/5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Sun className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div>
                <span className="text-[9px] text-orange-400/80 font-black uppercase tracking-wider">UV indice</span>
                <div className="text-[9px] text-slate-500 font-semibold">Radiazione solare</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black tabular-nums ${uvIndex >= 8 ? "text-rose-400" : uvIndex >= 6 ? "text-orange-400" : uvIndex >= 3 ? "text-amber-400" : "text-emerald-400"}`}>{uvIndex}</span>
              <span className={`text-xs font-semibold ${uvIndex >= 8 ? "text-rose-400" : uvIndex >= 6 ? "text-orange-400" : uvIndex >= 3 ? "text-amber-400" : "text-emerald-400"}`}>{getUVLabel(uvIndex)}</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{uvIndex >= 6 ? '🔆 Protezione solare necessaria in volo' : '☀️ Livello UV gestibile senza problemi'}</p>
          </div>

          {/* Radiazione */}
          <div className="rounded-xl p-3.5 border hover:border-amber-500/40 transition-all bg-gradient-to-br from-amber-500/10 to-amber-600/5">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Radiation className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <span className="text-[9px] text-amber-400/80 font-black uppercase tracking-wider">Radiazione</span>
                <div className="text-[9px] text-slate-500 font-semibold">Energia solare</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-300 tabular-nums">{Math.round(totalRadiation)}</span>
              <span className="text-xs text-amber-400/60 font-bold">Wh/m²</span>
            </div>
            <div className="text-[9px] text-amber-400/50 font-semibold mt-1">
              {totalSunshine / 3600 > 6 ? '☀️ Giornata molto soleggiata' : totalSunshine / 3600 > 3 ? '⛅ Giornata parzialmente soleggiata' : '☁️ Poca luce solare'}
            </div>
            <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{totalRadiation > 4000 ? '🔥 Alta radiazione: termiche forti attese' : totalRadiation > 2000 ? '⛅ Radiazione moderata' : '☁️ Bassa radiazione: termiche deboli'}</p>
          </div>
        </div>
      </div>

      {/* ══════════════ COLLAPSIBLE: STABILITÀ & VENTO ══════════════ */}
      <button onClick={() => setShowDetails(!showDetails)} className="w-full px-5 py-3.5 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Analisi stabilità & vento</span>
            <div className="text-[9px] text-slate-500 font-semibold mt-0.5">Dati termodinamici + profilo verticale</div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-slate-700/50 text-[9px] text-slate-400 font-bold">+5</span>
        </div>
        {showDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {showDetails && (
        <div className="px-5 py-4 border-b border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* ΔT/100m */}
            <div className={`rounded-xl p-3.5 border ${avgSpread > 1.5 ? "bg-rose-500/10 border-rose-500/30" : avgSpread > 1.0 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">ΔT/100m</div>
              <span className={`text-xl font-black tabular-nums ${avgSpread > 1.5 ? "text-rose-300" : avgSpread > 1.0 ? "text-violet-300" : "text-emerald-300"}`}>{avgSpread.toFixed(2)}</span>
              <span className="text-[9px] text-slate-500 font-semibold ml-1">°C</span>
              <div className="text-[9px] font-semibold mt-0.5 opacity-70">{instabilityLabel}</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{instabilityLabel.includes("fortemente") ? "Atmosfera instabile: termiche potenti ma turbolente" : instabilityLabel.includes("stabile") ? "Atmosfera stabile: poche termiche" : "Instabilità moderata: termiche organizzate"}</p>
            </div>

            {/* Lifted Index */}
            <div className={`rounded-xl p-3.5 border ${avgLi < -4 ? "bg-rose-500/10 border-rose-500/30" : avgLi < 0 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Lifted Index</div>
              <span className={`text-xl font-black tabular-nums ${avgLi < -4 ? "text-rose-300" : avgLi < 0 ? "text-violet-300" : "text-emerald-300"}`}>{avgLi.toFixed(1)}</span>
              <div className="text-[9px] font-semibold mt-0.5 opacity-70">{avgLi < -4 ? "Estremamente instabile" : avgLi < 0 ? "Instabile" : "Stabile"}</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{avgLi < -2 ? "⚠️ Instabilità pomeridiana — volare al mattino" : avgLi > 0 ? "Atmosfera stabile: vento di cresta preferibile" : "Instabilità moderata: termiche possibili"}</p>
            </div>

            {/* Pioggia 6h */}
            <div className={`rounded-xl p-3.5 border ${nextRainProb > 40 ? "bg-rose-500/10 border-rose-500/30" : nextRainProb > 20 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Pioggia (6h)</div>
              <span className={`text-xl font-black tabular-nums ${nextRainProb > 40 ? "text-rose-300" : nextRainProb > 20 ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(nextRainProb)}%</span>
              <div className="mt-2 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${nextRainProb > 40 ? "bg-rose-500" : nextRainProb > 20 ? "bg-violet-500" : "bg-emerald-500"}`} style={{ width: `${nextRainProb}%` }} />
              </div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{nextRainProb > 40 ? "⚠ Pioggia molto probabile nelle prossime 6h" : nextRainProb > 20 ? "Possibile pioggia isolata — tenere pronto il copri Ala" : "Pioggia improbabile nelle prossime 6h"}</p>
            </div>

            {/* Finestra volo */}
            <div className="rounded-xl p-3.5 border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5">
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Finestra di volo</div>
              <span className="text-base font-black text-amber-300 tabular-nums leading-tight block">{flightWindow}</span>
              <div className="text-[9px] text-amber-400/60 font-semibold mt-1">{flightHours} ore favorevoli</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{flightHours > 6 ? "Lunga finestra: ottimo per cross-country" : flightHours > 3 ? "Finestra decente: buona per volo locale" : "Finestra breve: volare presto o tardi"}</p>
            </div>
          </div>

          {/* Wind profile */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-1.5">
                <Wind className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-400 font-bold">Suolo (10m)</span>
              </div>
              <div className="text-xl font-black text-amber-300 tabular-nums">{Math.round(windSpeed)} <span className="text-sm text-amber-400/60 font-semibold">{dirLabel(windDir)}</span></div>
              {windGusts > 0 && <div className="text-xs text-slate-500 font-semibold mt-1">Raffiche {Math.round(windGusts)} km/h · rapporto {gustRatio.toFixed(1)}x</div>}
            </div>
            {wind80m != null && (
              <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <Wind className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-slate-400 font-bold">80m</span>
                </div>
                <div className="text-xl font-black text-orange-300 tabular-nums">{Math.round(wind80m)} <span className="text-sm text-orange-400/60 font-semibold">{dirLabel(windDir80m ?? windDir)}</span></div>
                <div className="text-xs text-slate-500 font-semibold mt-1">~{siteAlt + 80}m slm</div>
              </div>
            )}
            {wind120m != null && (
              <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <Wind className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-slate-400 font-bold">120m</span>
                </div>
                <div className="text-xl font-black text-violet-300 tabular-nums">{Math.round(wind120m)} <span className="text-sm text-violet-400/60 font-semibold">{dirLabel(windDir120m ?? windDir)}</span></div>
                <div className="text-xs text-slate-500 font-semibold mt-1">~{siteAlt + 120}m slm</div>
              </div>
            )}
            {wind180m != null && (
              <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <Wind className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-slate-400 font-bold">180m</span>
                </div>
                <div className="text-xl font-black text-purple-300 tabular-nums">{Math.round(wind180m)} <span className="text-sm text-purple-400/60 font-semibold">{dirLabel(windDir180m ?? windDir)}</span></div>
                <div className="text-xs text-slate-500 font-semibold mt-1">~{siteAlt + 180}m slm</div>
              </div>
            )}
          </div>

          {wind2000m != null && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-r from-violet-900/30 to-violet-800/20 rounded-xl p-3.5 border border-violet-500/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <Wind className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-violet-300 font-bold">Quota ~2000m (850hPa)</span>
                </div>
                <div className="text-xl font-black text-violet-300 tabular-nums">{wind2000m} <span className="text-sm text-violet-400/60 font-semibold">{dirLabel(dir2000m ?? 0)}</span></div>
                <div className="text-xs text-violet-400/60 font-semibold mt-1">Wind shear: {waveIndex.toFixed(0)}°</div>
                <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{waveIndex < 30 ? "🌊 Onda montana molto probabile — provare quote superiori" : waveIndex < 60 ? "Onda presente — condizioni favorevoli per volo in quota" : "Nessun effetto onda significativo"}</p>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-3.5 border border-slate-700/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <Waves className="w-4 h-4 text-rose-400" />
                  <span className="text-xs text-slate-400 font-bold">Turbolenza</span>
                </div>
                <div className={`text-xl font-black tabular-nums ${turbulenceColor}`}>{turbulenceLevel}</div>
                <div className="text-xs text-slate-500 font-semibold mt-1">Rapporto raffiche: {gustRatio.toFixed(2)}</div>
                <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{gustRatio > 1.8 ? "⚠️ Raffiche forti e imprevedibili — attenzione in decollo" : gustRatio > 1.4 ? "Raffiche moderate — valutare condizioni al decollo" : "Turbolenza bassa — volo tranquillo"}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ COLLAPSIBLE: ADVANCED ══════════════ */}
      <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full px-5 py-3.5 border-b border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Metriche avanzate</span>
            <div className="text-[9px] text-slate-500 font-semibold mt-0.5">Parametri tecnici per piloti esperti</div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-slate-700/50 text-[9px] text-slate-400 font-bold">+8</span>
        </div>
        {showAdvanced ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {showAdvanced && (
        <div className="px-5 py-4 border-b border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* CIN */}
            <div className={`rounded-xl p-3.5 border ${cinVal > 200 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">CIN (Inibizione)</div>
              <span className={`text-xl font-black tabular-nums ${cinVal > 200 ? "text-violet-300" : "text-emerald-300"}`}>{Math.round(cinVal)}</span>
              <span className="text-xs text-slate-500 font-bold ml-1">J/kg</span>
              <div className="text-[9px] font-semibold mt-0.5 opacity-70">{cinVal > 500 ? "Termiche soppresse" : cinVal > 200 ? "Leggera inibizione" : "Favorevole"}</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{cinVal > 200 ? "Strato stabile in basso blocca le termiche — aspettare che il suolo si riscaldi" : "No inibizione convettiva — le termiche possono svilupparsi liberamente"}</p>
            </div>

            {/* UV max */}
            <div className="rounded-xl p-3.5 border border-amber-500/20 bg-amber-500/5">
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">UV massimo</div>
              <span className="text-xl font-black text-amber-300 tabular-nums">{maxUV}</span>
              <span className="text-xs text-amber-400/60 font-bold ml-1">{getUVLabel(maxUV)}</span>
              <div className="text-[9px] text-slate-500 font-semibold mt-0.5">Min: {minUV}</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{maxUV >= 8 ? "🔆 UV molto alto: occhiali da sole obbligatori, crema solare" : maxUV >= 5 ? "☀️ UV moderato-alto: protezione consigliata" : "🌤️ UV basso: nessuna protezione necessaria"}</p>
            </div>

            {/* Pressione media */}
            <div className="rounded-xl p-3.5 border border-violet-500/20 bg-violet-500/5">
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Pressione media</div>
              <span className="text-xl font-black text-violet-300 tabular-nums">{Math.round((avgPressureFirst + avgPressureLast) / 2)}</span>
              <span className="text-xs text-violet-400/60 font-bold ml-1">hPa</span>
              <div className="text-[9px] text-slate-500 font-semibold mt-0.5">{avgPressureFirst.toFixed(0)}→{avgPressureLast.toFixed(0)}</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{avgPressureLast > 1020 ? "Alta pressione: bel tempo duraturo" : avgPressureLast < 1008 ? "Bassa pressione: tempo variabile o perturbato" : "Pressione normale: condizioni stabili"}</p>
            </div>

            {/* Potere termico */}
            <div className={`rounded-xl p-3.5 border ${avgThermalRate > 1.5 ? "bg-rose-500/10 border-rose-500/30" : avgThermalRate > 1 ? "bg-violet-500/10 border-violet-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Potere termico</div>
              <span className={`text-xl font-black tabular-nums ${avgThermalRate > 1.5 ? "text-rose-300" : avgThermalRate > 1 ? "text-violet-300" : "text-amber-300"}`}>{avgThermalRate > 1.5 ? "Buono" : avgThermalRate > 1 ? "Discreto" : "Debole"}</span>
              <div className="text-[9px] text-slate-500 font-semibold mt-0.5">Max stimato {maxThermalRate.toFixed(1)} m/s</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{avgThermalRate > 1.5 ? "Ottimo per cross-country — cercare le migliori vallette" : avgThermalRate > 1 ? "Buone condizioni per allenamento e volo locale" : "Termiche deboli — adattare la tecnica di volo"}</p>
            </div>

            {/* Spread medio */}
            <div className={`rounded-xl p-3.5 border ${avgSpread > 1.5 ? "bg-rose-500/10 border-rose-500/30" : avgSpread > 1.0 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Spread medio</div>
              <span className={`text-xl font-black tabular-nums ${avgSpread > 1.5 ? "text-rose-300" : avgSpread > 1.0 ? "text-violet-300" : "text-emerald-300"}`}>{avgSpread.toFixed(2)}</span>
              <span className="text-xs text-slate-500 font-bold ml-1">°C</span>
              <div className="text-[9px] font-semibold mt-0.5 opacity-70">T − Tδ medio</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{avgSpread > 1.5 ? "Aria secca in quota: termiche veloci ma secche" : avgSpread > 1.0 ? "Buon equilibrio umidità/temperatura" : "Aria umida: termiche pesanti e cumuli sviluppati"}</p>
            </div>

            {/* Copertura cielo */}
            <div className={`rounded-xl p-3.5 border ${cloudCover >= 90 ? "bg-slate-500/10 border-slate-500/30" : cloudCover >= 70 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Copertura cielo</div>
              <span className={`text-xl font-black tabular-nums ${cloudCover >= 90 ? "text-slate-300" : cloudCover >= 70 ? "text-violet-300" : "text-emerald-300"}`}>{cloudCover}%</span>
              <span className="text-xs text-slate-500 font-bold ml-1">{getCloudCoverLabel(cloudCover)}</span>
              <div className="text-[9px] font-semibold mt-0.5 opacity-70">Totale (basso+medio+alto)</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{cloudCover >= 90 ? "Cielo completamente coperto: termiche inibite, solo动态 di cresta" : cloudCover >= 50 ? "Nuvolosità variabile: termiche irregolari ma possibili" : "Cielo prevalentemente sereno: condizioni ideali"}</p>
            </div>

            {/* Gust ratio */}
            <div className={`rounded-xl p-3.5 border ${gustRatio > 1.8 ? "bg-rose-500/10 border-rose-500/30" : gustRatio > 1.4 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Gust ratio</div>
              <span className={`text-xl font-black tabular-nums ${gustRatio > 1.8 ? "text-rose-300" : gustRatio > 1.4 ? "text-violet-300" : "text-emerald-300"}`}>{gustRatio.toFixed(2)}</span>
              <div className="text-[9px] font-semibold mt-0.5 opacity-70">Raffunge / media</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{gustRatio > 1.8 ? "⚠️ Raffiche pericolose — attendere calma o evitare" : gustRatio > 1.4 ? "Raffiche significative — valutare con cautela" : "Raffiche contenute — volo tranquillo"}</p>
            </div>

            {/* Pioggia 24h */}
            <div className={`rounded-xl p-3.5 border ${(nextRainProb > 40 ? "bg-rose-500/10 border-rose-500/30" : nextRainProb > 20 ? "bg-violet-500/10 border-violet-500/30" : "bg-emerald-500/10 border-emerald-500/30")}`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase mb-1">Pioggia 24h</div>
              <span className={`text-xl font-black tabular-nums ${(nextRainProb > 40 ? "text-rose-300" : nextRainProb > 20 ? "text-violet-300" : "text-emerald-300")}`}>{Math.round(dayData.reduce((s, h) => s + (h.precipitation ?? 0), 0))}</span>
              <span className="text-xs text-slate-500 font-bold ml-1">mm</span>
              <div className="text-[9px] font-semibold mt-0.5 opacity-70">Totale precipitazioni attese</div>
              <p className="text-[9px] text-slate-500 mt-1.5 leading-tight">{Math.round(dayData.reduce((s, h) => s + (h.precipitation ?? 0), 0)) > 5 ? "⚠️ Piogge consistenti previste — posticipare il volo" : Math.round(dayData.reduce((s, h) => s + (h.precipitation ?? 0), 0)) > 1 ? "Possibili rovesci isolati — tenere pronto il copri Ala" : "Nessuna pioggia significativa prevista"}</p>
            </div>
          </div>

          {/* Wind gradient visual */}
          {(wind80m != null || wind120m != null || wind180m != null) && (
            <div className="mt-4 bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-black mb-3">Gradiente verticale del vento</div>
              <div className="space-y-2">
                {[
                  { label: "10m (suolo)", speed: windSpeed, dir: windDir, color: "bg-amber-500" },
                  ...(wind80m != null ? [{ label: "80m", speed: wind80m, dir: windDir80m ?? windDir, color: "bg-orange-500" }] : []),
                  ...(wind120m != null ? [{ label: "120m", speed: wind120m, dir: windDir120m ?? windDir, color: "bg-violet-500" }] : []),
                  ...(wind180m != null ? [{ label: "180m", speed: wind180m, dir: windDir180m ?? windDir, color: "bg-purple-500" }] : []),
                  ...(wind2000m != null ? [{ label: "~2000m", speed: wind2000m, dir: dir2000m ?? windDir, color: "bg-rose-500" }] : []),
                ].map((layer, i, arr) => {
                  const maxW = Math.max(...arr.map(l => l.speed ?? 1));
                  const barWidth = ((layer.speed ?? 0) / maxW) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[9px] text-slate-400 font-bold w-16 shrink-0 text-right">{layer.label}</span>
                      <div className="flex-1 h-5 bg-slate-700/30 rounded-full overflow-hidden relative">
                        <div className={`h-full ${layer.color} rounded-full transition-all flex items-center justify-end pr-2`} style={{ width: `${Math.max(8, barWidth)}%` }}>
                          <span className="text-[9px] font-black text-white/90">{Math.round(layer.speed)} km/h</span>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold w-8 shrink-0">{dirLabel(layer.dir)}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-600 mt-3 leading-tight">Il gradiente mostra come il vento cambia con la quota. Un forte aumento significa wind shear — attenzione in transizione tra strati.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TACTICAL JUDGMENT ══════════════ */}
      {tactics.length > 0 && (
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-black">Giudizio tattico</span>
          </div>
          <div className="space-y-1.5">
            {tactics.map((tac, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-800/40 rounded-xl px-4 py-2.5 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
                <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                {tac}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════ WARNINGS ══════════════ */}
      {warnings.length > 0 ? (
        <div className="px-5 py-4 bg-rose-950/20 border-t border-rose-800/30">
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
        <div className="px-5 py-4 bg-emerald-950/20 border-t border-emerald-800/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 text-sm font-bold">✓ Condizioni favorevoli per il volo — nessun warning attivo</span>
          </div>
        </div>
      )}
    </div>
  );
}
