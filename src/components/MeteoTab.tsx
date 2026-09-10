"use client";

import type { MeteoCurrent } from "@/services/openMeteoService";
import type { HourData } from "@/types/meteo";
import { Zap, Calendar, MapPin, CloudSun } from "lucide-react";

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
  const precipitation = currentData.precipitation ?? 0;
  const weatherCode = currentData.weatherCode ?? 0;
  const visibility = currentData.visibility ?? 10000;

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

  // Trova dato per l'ora selezionata (o ora corrente se non selezionata)
  const hourIdx = selectedHour != null
    ? dayData.findIndex(h => (h.time instanceof Date ? h.time : new Date(h.time)).getHours() === selectedHour)
    : dayData.findIndex(h => (h.time instanceof Date ? h.time : new Date(h.time)).getHours() === new Date().getHours());
  const selHr = hourIdx >= 0 ? dayData[hourIdx] : null;

  // Vento in quota — usa solo dati reali (null = non disponibile, non 0)
  const midData = dayData.slice(8, 16);
  const valid850 = midData.filter(h => h.windSpeed850 != null);
  const avgWind850 = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windSpeed850 ?? 0), 0) / valid850.length : null;
  const dir850 = valid850.length > 0 ? valid850.reduce((s, h) => s + (h.windDir850 ?? 0), 0) / valid850.length : null;

  // Usa dato ora selezionata se disponibile, altrimenti media
  const wind850 = selHr?.windSpeed850 ?? avgWind850;
  const dir850Use = selHr?.windDir850 ?? dir850;

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

  // Determina label instabilità
  const instabilityLabel = avgSpread > 1.5 ? "fortemente instabile"
    : avgSpread > 1.0 ? "moderatamente instabile"
    : avgSpread > 0.6 ? "instabile"
    : "stabile";

  // Vento quota 2000m stimato (extrapolazione da 850hPa)
  const wind2000m = wind850 != null ? Math.round(wind850 * 1.15) : null;
  const dir2000m = dir850Use != null ? Math.round(dir850Use + 10) : null;

  return (
    <div className="bg-[#111a22] border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-700/50 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
        <div className="min-w-0">
          <div className="text-base font-black text-white tracking-wide">{siteName || "Decollo"}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}</span>
            <span className="text-slate-600">·</span>
            <span>{siteAlt}m · {modelName || "Open-Meteo"}</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${signal === "green" ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : signal === "yellow" ? "bg-amber-400 shadow-sm shadow-amber-400/50" : "bg-red-400 shadow-sm shadow-red-400/50"}`} />
          <span className={`text-xs font-black tracking-widest ${signal === "green" ? "text-emerald-400" : signal === "yellow" ? "text-amber-400" : "text-red-400"}`}>
            {signalLabel}
          </span>
        </div>
      </div>

      {/* Sezioni */}
      <div className="divide-y divide-slate-700/30">
        {/* Rateo termico medio */}
        <div className="px-5 py-3 flex items-baseline justify-between">
          <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Rateo termico medio</span>
          <span className="text-xl font-black text-orange-300 tabular-nums">{avgThermalRate.toFixed(1)} <span className="text-sm text-orange-400/60 font-semibold">m/s</span></span>
        </div>

        {/* Base cumulo */}
        <div className="px-5 py-3 flex items-baseline justify-between">
          <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Base cumulo</span>
          <span className="text-xl font-black text-sky-300 tabular-nums">{cloudBase} <span className="text-sm text-sky-400/60 font-semibold">m</span></span>
        </div>

        {/* Vento decollo */}
        <div className="px-5 py-3 flex items-baseline justify-between">
          <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Vento decollo</span>
          <span className="text-xl font-black text-cyan-300 tabular-nums">
            {Math.round(windSpeed)} <span className="text-sm text-cyan-400/60 font-semibold">km/h {dirLabel(windDir)}</span>
            {windGusts > 0 && <span className="text-sm text-slate-400 font-semibold"> · Raffiche {Math.round(windGusts)} km/h</span>}
          </span>
        </div>

        {/* Vento quota 2000m */}
        <div className="px-5 py-3 flex items-baseline justify-between">
          <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Vento quota ~2000m</span>
          <span className="text-xl font-black text-violet-300 tabular-nums">
            {wind2000m != null ? `${wind2000m} km/h ${dirLabel(dir2000m ?? 0)}` : "—"}
          </span>
        </div>

        {/* Instabilità */}
        <div className="px-5 py-3 flex items-baseline justify-between">
          <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Instabilità (ΔT/100m)</span>
          <span className={`text-base font-black tabular-nums ${avgSpread > 1.5 ? "text-red-400" : avgSpread > 1.0 ? "text-amber-400" : "text-emerald-400"}`}>
            {avgSpread.toFixed(2)} → {instabilityLabel}
          </span>
        </div>

        {/* Zero termico */}
        <div className="px-5 py-3 flex items-baseline justify-between">
          <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Zero termico</span>
          <span className={`text-xl font-black tabular-nums ${avgFreezing < siteAlt + 2000 ? "text-red-400" : "text-cyan-300"}`}>
            {avgFreezing} <span className="text-sm text-cyan-400/60 font-semibold">m</span>
          </span>
        </div>

        {/* Probabilità pioggia */}
        <div className="px-5 py-3 flex items-baseline justify-between">
          <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Probabilità pioggia</span>
          <span className={`text-xl font-black tabular-nums ${nextRainProb > 40 ? "text-red-400" : nextRainProb > 20 ? "text-amber-400" : "text-emerald-400"}`}>
            {Math.round(nextRainProb)} <span className="text-sm text-slate-400 font-semibold">%</span>
          </span>
        </div>

        {/* Ore favorevoli */}
        <div className="px-5 py-3 flex items-baseline justify-between">
          <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Ore favorevoli al volo</span>
          <span className="text-xl font-black text-sky-300 tabular-nums">{flightWindow}</span>
        </div>
      </div>

      {/* Warning / Good */}
      {warnings.length > 0 ? (
        <div className="px-5 py-3 bg-orange-500/15 border-t border-orange-500/30">
          <div className="flex items-center gap-1.5 text-orange-400 text-xs font-black uppercase tracking-wider mb-1.5">
            <Zap className="w-3.5 h-3.5" />
            Attenzione
          </div>
          {warnings.slice(0, 3).map((w, i) => (
            <p key={i} className="text-orange-200/80 text-xs flex items-start gap-1.5 py-0.5">
              <span className="text-orange-500 mt-0.5 shrink-0">›</span>
              {w}
            </p>
          ))}
        </div>
      ) : (
        <div className="px-5 py-3 bg-emerald-500/10 border-t border-emerald-500/20">
          <span className="text-emerald-300 text-xs font-bold">✓ Condizioni favorevoli per il volo</span>
        </div>
      )}
    </div>
  );
}
