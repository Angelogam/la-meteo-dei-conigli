"use client";

import type { MeteoCurrent } from "@/services/openMeteoService";
import type { HourData } from "@/types/meteo";
import { Wind, CloudSun, Zap, Sun, Thermometer, Droplets } from "lucide-react";

interface FlightStatusCardProps {
  currentData: MeteoCurrent | null;
  hourlyData: HourData[];
  siteAlt: number;
}

function calcWaveIndex(windDir10: number, windDir850: number) {
  let diff = Math.abs(windDir850 - windDir10);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function getFlightStatus(
  current: MeteoCurrent | null,
  hourly: HourData[],
  siteAlt: number
): {
  signal: "green" | "yellow" | "red";
  signalLabel: string;
  reasons: string[];
  flightWindow: string;
  cloudBase: number;
  thermalTop: number;
  avgThermalRate: number;
  windSpeed: number;
  windGusts: number;
  waveIndex: number;
  cape: number;
  li: number;
} {
  if (!current || hourly.length === 0) {
    return {
      signal: "yellow",
      signalLabel: "DATI INSUFFICIENTI",
      reasons: ["Dati meteo non disponibili"],
      flightWindow: "—",
      cloudBase: 0,
      thermalTop: 0,
      avgThermalRate: 0,
      windSpeed: 0,
      windGusts: 0,
      waveIndex: 0,
      cape: 0,
      li: 0,
    };
  }

  const reasons: string[] = [];
  let score = 100;

  const t = current.temperature ?? 20;
  const dew = current.dewPoint ?? t - 8;
  const spread = Math.max(0.5, t - dew);
  const cloudBase = siteAlt + spread * 125;
  const rainProb = hourly.reduce((s, h) => s + (h.precipitationProba ?? 0), 0) / hourly.length;
  const avgCape = hourly.reduce((s, h) => s + (h.cape ?? 0), 0) / hourly.length;
  const avgLi = hourly.reduce((s, h) => s + (h.liftedIndex ?? 0), 0) / hourly.length;
  const windSpeed = current.windSpeed ?? 0;
  const windGusts = current.windGusts ?? 0;

  // === VENTO ===
  if (windSpeed < 3) {
    reasons.push("Vento troppo debole");
    score -= 30;
  } else if (windSpeed <= 15) {
    // ottimale
  } else if (windSpeed <= 25) {
    reasons.push("Vento forte al suolo");
    score -= 20;
  } else {
    reasons.push("Vento pericoloso!");
    score -= 50;
  }

  const gustRatio = windSpeed > 0 ? (windGusts - windSpeed) / windSpeed : 0;
  if (gustRatio > 0.4) {
    reasons.push(`Raffiche pericolose (${Math.round(gustRatio * 100)}%)`);
    score -= 25;
  }

  // === BASE CUMULI ===
  if (cloudBase < siteAlt + 200) {
    reasons.push("Base cumuli troppo bassa (nebbia)");
    score -= 35;
  } else if (cloudBase < siteAlt + 500) {
    reasons.push("Base cumuli bassa");
    score -= 15;
  }

  // === TOP TERMICO ===
  const avgSpread = hourly.reduce((s, h) => s + Math.max(0.5, (h.temperature ?? t) - (h.dewPoint ?? dew)), 0) / hourly.length;
  const avgThermalRate = Math.min(5, Math.max(0, avgSpread * 0.3 + avgCape * 0.001));
  const thermalTop = cloudBase + avgThermalRate * 400 + avgSpread * 50;

  if (thermalTop < siteAlt + 500) {
    reasons.push("Termiche deboli (top basso)");
    score -= 20;
  } else if (thermalTop >= siteAlt + 1500) {
    score += 10;
  }

  // === RISCHIO TEMPORALI ===
  if (avgCape > 1000) {
    reasons.push("CAPE molto alto → temporali probabili");
    score -= 40;
  } else if (avgCape > 600) {
    reasons.push("CAPE elevato → attenzione");
    score -= 20;
  }

  if (avgLi < -4) {
    reasons.push("Instabilità estrema");
    score -= 30;
  } else if (avgLi < -2) {
    reasons.push("Instabilità moderata");
    score -= 10;
  }

  if (rainProb > 40) {
    reasons.push("Alta probabilità pioggia");
    score -= 25;
  } else if (rainProb > 20) {
    reasons.push("Probabilità pioggia");
    score -= 10;
  }

  // === WAVE INDEX ===
  const w10 = current.windDir ?? 200;
  const w850 = hourly[6]?.windDir850 ?? 200;
  const waveIndex = calcWaveIndex(w10, w850);

  if (waveIndex < 30 && windSpeed > 15) {
    reasons.push("Onda montana possibile!");
  }

  // === ZERO TERMICO (da dati orari) ===
  const avgFreezingLevel = hourly.reduce((s, h) => s + (h.freezingLevel ?? 0), 0) / hourly.length;
  const zeroThermal = avgFreezingLevel > 0 ? Math.round(avgFreezingLevel) : siteAlt + 3000;

  // === FINESTRA DI VOLO ===
  const flightHours = hourly.filter(h => {
    const ht = h.temperature ?? t;
    const hd = h.dewPoint ?? dew;
    const hSpread = Math.max(0.5, ht - hd);
    return hSpread > 4 && (h.cape ?? 0) < 600 && (h.precipitationProba ?? 0) < 30;
  }).length;

  const windowStart = hourly.findIndex(h => (h.temperature ?? t) - (h.dewPoint ?? dew) > 4);
  const reversedEnd = [...hourly].reverse().findIndex(h => (h.temperature ?? t) - (h.dewPoint ?? dew) > 4);
  const windowEnd = hourly.length - 1 - reversedEnd;

  let flightWindow = "—";
  if (windowStart >= 0 && windowEnd > windowStart) {
    const startHour = hourly[windowStart]?.time?.getHours() ?? 8;
    const endHour = hourly[Math.min(windowEnd, hourly.length - 1)]?.time?.getHours() ?? 17;
    flightWindow = `${String(startHour).padStart(2, "0")}:00 – ${String(endHour).padStart(2, "0")}:00`;
  }

  // === SIGNAL ===
  const finalScore = Math.max(0, Math.min(100, score));
  let signal: "green" | "yellow" | "red";
  let signalLabel: string;

  if (finalScore >= 70) {
    signal = "green";
    signalLabel = "DECOLLO CONSENTITO";
  } else if (finalScore >= 40) {
    signal = "yellow";
    signalLabel = "DECOLLO SCONSIGLIATO";
  } else {
    signal = "red";
    signalLabel = "DECOLLO PERICOLOSO";
  }

  if (reasons.length === 0) {
    reasons.push("Condizioni ideali per il volo!");
  }

  return {
    signal,
    signalLabel,
    reasons,
    flightWindow,
    cloudBase: Math.round(cloudBase),
    thermalTop: Math.round(thermalTop),
    avgThermalRate,
    windSpeed,
    windGusts,
    waveIndex,
    cape: Math.round(avgCape),
    li: Math.round(avgLi * 10) / 10,
    zeroThermal,
  };
}

export default function FlightStatusCard({ currentData, hourlyData, siteAlt }: FlightStatusCardProps) {
  const status = getFlightStatus(currentData, hourlyData, siteAlt);

  const signalColors = {
    green: { bg: "bg-emerald-500/15", border: "border-emerald-500/40", text: "text-emerald-400", dot: "bg-emerald-500", ring: "ring-emerald-500/30" },
    yellow: { bg: "bg-amber-500/15", border: "border-amber-500/40", text: "text-amber-400", dot: "bg-amber-500", ring: "ring-amber-500/30" },
    red: { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400", dot: "bg-red-500", ring: "ring-red-500/30" },
  };

  const c = signalColors[status.signal];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 space-y-4`}>
      {/* Header con segnale */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-5 h-5 rounded-full ${c.dot} ring-4 ${c.ring}`} />
            {status.signal === "green" && (
              <div className={`absolute inset-0 rounded-full ${c.dot} animate-ping opacity-30`} />
            )}
          </div>
          <div>
            <p className={`font-black text-lg ${c.text} tracking-wider`}>{status.signalLabel}</p>
            <p className="text-slate-500 text-xs">Valutazione sicurezza volo</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-slate-100">{status.cape}</p>
          <p className="text-slate-500 text-xs">CAPE J/kg</p>
        </div>
      </div>

      {/* 5 Indicatori in griglia */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* 1. Base Cumuli */}
        <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <CloudSun className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-400 text-xs font-medium">Base Cumuli</span>
          </div>
          <p className="text-lg font-black text-slate-100 tabular-nums">
            {status.cloudBase >= 1000 ? `${(status.cloudBase / 100).toFixed(0)}k` : status.cloudBase}m
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {status.cloudBase < siteAlt + 300 ? "⚠ Bassa" : status.cloudBase < siteAlt + 800 ? "🟡 Media" : "🟢 Buona"}
          </p>
        </div>

        {/* 2. Top Termico */}
        <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Thermometer className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-slate-400 text-xs font-medium">Top Termico</span>
          </div>
          <p className="text-lg font-black text-slate-100 tabular-nums">
            {(status.thermalTop / 100).toFixed(0)}k
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Rateo {status.avgThermalRate.toFixed(1)} m/s</p>
        </div>

        {/* 3. Vento */}
        <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Wind className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-400 text-xs font-medium">Vento Suolo</span>
          </div>
          <p className="text-lg font-black text-slate-100 tabular-nums">{Math.round(status.windSpeed)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">km/h · Raffiche {Math.round(status.windGusts)}</p>
        </div>

        {/* 4. Finestra */}
        <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-4 h-4 text-yellow-400 shrink-0" />
            <span className="text-slate-400 text-xs font-medium">Finestra Volo</span>
          </div>
          <p className="text-base font-black text-slate-100 tabular-nums leading-tight">{status.flightWindow}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Ore migliori</p>
        </div>

        {/* 5. Wave Index */}
        <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-violet-400 shrink-0" />
            <span className="text-slate-400 text-xs font-medium">Wave Index</span>
          </div>
          <p className="text-lg font-black text-slate-100 tabular-nums">{status.waveIndex}°</p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {status.waveIndex < 30 ? "🌊 Onda attiva" : status.waveIndex < 60 ? "🟡 Moderato" : "🟢 Nessuna onda"}
          </p>
        </div>
      </div>

      {/* Motivi */}
      <div className="flex flex-wrap gap-1.5">
        {status.reasons.map((r, i) => (
          <span
            key={i}
            className={`text-xs px-2 py-0.5 rounded-full border ${
              r.includes("pericoloso") || r.includes(" temporali") || r.includes("tropo")
                ? "bg-red-500/15 border-red-500/30 text-red-300"
                : r.includes("ideali")
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-amber-500/15 border-amber-500/30 text-amber-300"
            }`}
          >
            {r}
          </span>
        ))}
      </div>
    </div>
  );
}
