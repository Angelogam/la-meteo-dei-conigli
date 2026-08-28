"use client";

import React, { useMemo } from "react";
import {
  Sun,
  Thermometer,
  Wind,
  Cloud,
  Droplets,
  Eye,
  Zap,
  TrendingUp,
  Activity,
  Shield,
  Layers,
  Map,
  ChevronDown,
  ChevronUp,
  Clock,
  Gauge,
  AlertTriangle,
  CheckCircle,
  Mountain,
  Compass,
  Waves,
  Snowflake,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { AnalisiApprofondita } from "@/utils/analisiApprofondita";
import type { HourData } from "@/types/meteo";

interface Props {
  analisi: AnalisiApprofondita | null;
  siteName: string;
  dayData?: HourData[];
  site?: { alt: number; lat: number; lon: number; exposure: string };
  currentData?: HourData | null;
}

function getPunteggioColore(p: number): string {
  if (p >= 80) return "bg-emerald-500";
  if (p >= 60) return "bg-green-500";
  if (p >= 40) return "bg-yellow-500";
  if (p >= 20) return "bg-orange-500";
  return "bg-red-500";
}

function getPunteggioTesto(p: number): string {
  if (p >= 80) return "text-emerald-300";
  if (p >= 60) return "text-green-300";
  if (p >= 40) return "text-yellow-300";
  if (p >= 20) return "text-orange-300";
  return "text-red-300";
}

function Sezione({
  titolo,
  icona,
  children,
  badge,
}: {
  titolo: string;
  icona: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          {icona}
          <span className="text-sm font-bold text-white">{titolo}</span>
        </div>
        {badge}
      </div>
      <div className="px-4 pb-4 space-y-2">{children}</div>
    </div>
  );
}

function Riga({ label, value, unit, color, warn }: { label: string; value: string | number; unit?: string; color?: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5">
      <span className="text-slate-400">{label}</span>
      <div className="flex items-center gap-1">
        <span className={`font-bold ${color || "text-white"} ${warn ? "text-red-300" : ""}`}>
          {value}
        </span>
        {unit && <span className="text-slate-500">{unit}</span>}
        {warn && <AlertTriangle className="w-3 h-3 text-red-300" />}
      </div>
    </div>
  );
}

function BadgeStato({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bg} ${color}`}>
      {label}
    </span>
  );
}

/** ============================================================
 *  MOTORE DI ANALISI METEO PER PARAPENDIO
 *  ============================================================ */

interface WindAtAltitude {
  altitude: number;
  speed: number;
  dir: number;
  dirName: string;
  gust?: number;
}

interface ThermalAnalysis {
  base: number;
  top: number;
  rate: number;
  strength: "assente" | "debole" | "moderata" | "forte" | "molto forte";
  triggerTime: string;
  duration: string;
}

interface StabilityAnalysis {
  cape: number;
  cin: number;
  liftedIndex: number;
  kIndex: number;
  totalTotals: number;
  state: "molto stabile" | "stabile" | "leggermente instabile" | "instabile" | "molto instabile";
  thunderRisk: "nessuno" | "basso" | "moderato" | "alto" | "estremo";
}

interface FlyabilityResult {
  score: number;
  label: "NON VOLABILE" | "SCONSIGLIATO" | "IMPEGNATIVO" | "BUONO" | "OTTIMO" | "ECCELLENTE";
  color: string;
  bg: string;
  reasons: string[];
  warnings: string[];
  noFlyReasons: string[];
  window: { start: string; end: string; quality: string };
}

function degToDir(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

function windArrow(deg: number): string {
  const arrows = ["\u2191", "\u2197", "\u2192", "\u2198", "\u2193", "\u2199", "\u2190", "\u2196"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function calcLCL(temp: number, dewPoint: number): number {
  return Math.round((temp - dewPoint) * 125);
}

function calcFreezingLevel(temp: number, altitude: number): number {
  return Math.round(altitude + (temp / 0.0065));
}

function interpolateWind(
  targetAlt: number,
  levels: { alt: number; speed: number; dir: number }[]
): { speed: number; dir: number } | null {
  if (!levels.length) return null;
  const sorted = [...levels].sort((a, b) => a.alt - b.alt);
  if (targetAlt <= sorted[0].alt) return { speed: sorted[0].speed, dir: sorted[0].dir };
  if (targetAlt >= sorted[sorted.length - 1].alt) return null;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].alt <= targetAlt && sorted[i + 1].alt >= targetAlt) {
      const ratio = (targetAlt - sorted[i].alt) / (sorted[i + 1].alt - sorted[i].alt);
      const speed = sorted[i].speed + ratio * (sorted[i + 1].speed - sorted[i].speed);
      let diff = sorted[i + 1].dir - sorted[i].dir;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      const dir = (sorted[i].dir + diff * ratio + 360) % 360;
      return { speed: Math.round(speed), dir: Math.round(dir) };
    }
  }
  return { speed: Math.round(sorted[0].speed), dir: Math.round(sorted[0].dir) };
}

function analyzeThermals(
  dayData: HourData[],
  altitude: number,
  currentHour: HourData | null
): ThermalAnalysis {
  if (!dayData.length) {
    return { base: 0, top: 0, rate: 0, strength: "assente", triggerTime: "N/D", duration: "N/D" };
  }

  const dayHours = dayData.filter(h => {
    const hr = new Date(h.time).getHours();
    return hr >= 8 && hr <= 19;
  });

  const spreads = dayHours.map(h => Math.max(1, h.temperature - (h.dewPoint ?? h.temperature - 8)));
  const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  const maxSpread = Math.max(...spreads);

  const cloudBases = dayHours.map(h => calcLCL(h.temperature, h.dewPoint ?? h.temperature - 8));
  const avgBase = Math.round(altitude + cloudBases.reduce((a, b) => a + b, 0) / cloudBases.length);
  const minBase = Math.min(...cloudBases.map(b => altitude + b));

  const rates = dayHours.map(h => {
    const spread = Math.max(1, h.temperature - (h.dewPoint ?? h.temperature - 8));
    const wind = h.windSpeed ?? 5;
    const cloud = h.cloudCover ?? 30;
    let rate = spread * 0.22;
    if (wind >= 5 && wind <= 15) rate += 0.4;
    if (cloud >= 15 && cloud <= 45) rate += 0.3;
    if (h.precipitation && h.precipitation > 0.5) rate *= 0.2;
    return Math.max(0, Math.min(5, rate));
  });
  const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  const maxRate = Math.max(...rates);

  const triggerHour = dayHours.findIndex(h => {
    const hr = new Date(h.time).getHours();
    return hr >= 10 && h.temperature > (dayHours[0]?.temperature ?? 0) + 3;
  });
  const triggerTime = triggerHour >= 0 ? `${String(new Date(dayHours[triggerHour].time).getHours()).padStart(2, "0")}:00` : "11:00";

  let strength: ThermalAnalysis["strength"] = "assente";
  if (avgRate >= 3) strength = "molto forte";
  else if (avgRate >= 2) strength = "forte";
  else if (avgRate >= 1) strength = "moderata";
  else if (avgRate >= 0.3) strength = "debole";

  const top = Math.min(4000, avgBase + Math.round(avgRate * 300 + maxSpread * 50));

  return {
    base: minBase,
    top,
    rate: Math.round(avgRate * 10) / 10,
    strength,
    triggerTime,
    duration: `${triggerTime} - 17:00`,
  };
}

function analyzeStability(
  dayData: HourData[],
  currentData: HourData | null
): StabilityAnalysis {
  const dayHours = dayData.filter(h => {
    const hr = new Date(h.time).getHours();
    return hr >= 10 && hr <= 16;
  });
  if (!dayHours.length) dayHours.push(...dayData);

  const temps = dayHours.map(h => h.temperature);
  const dews = dayHours.map(h => h.dewPoint ?? h.temperature - 8);
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const avgDew = dews.reduce((a, b) => a + b, 0) / dews.length;
  const spread = avgTemp - avgDew;

  const cape = Math.min(3000, Math.max(0, Math.round(spread * spread * 8 + (avgTemp - 10) * 15)));
  const cin = Math.max(0, Math.round(200 - cape * 0.15));
  const liftedIndex = Math.round((avgTemp - avgDew - 6) * 10) / 10;

  const kIndex = Math.round((avgTemp - avgDew) * 2 + (avgTemp - 15));
  const totalTotals = Math.round((avgTemp - avgDew) * 3 + (avgTemp - 10) * 2);

  let state: StabilityAnalysis["state"] = "stabile";
  if (liftedIndex < -6) state = "molto instabile";
  else if (liftedIndex < -3) state = "instabile";
  else if (liftedIndex < 0) state = "leggermente instabile";
  else if (liftedIndex < 3) state = "stabile";
  else state = "molto stabile";

  let thunderRisk: StabilityAnalysis["thunderRisk"] = "nessuno";
  if (cape > 2000 && liftedIndex < -6) thunderRisk = "estremo";
  else if (cape > 1200 && liftedIndex < -4) thunderRisk = "alto";
  else if (cape > 600 && liftedIndex < -2) thunderRisk = "moderato";
  else if (cape > 200) thunderRisk = "basso";

  return { cape, cin, liftedIndex, kIndex, totalTotals, state, thunderRisk };
}

function buildWindProfile(
  currentData: HourData | null,
  altitude: number
): WindAtAltitude[] {
  if (!currentData) return [];

  const groundSpeed = currentData.windSpeed ?? 5;
  const groundDir = currentData.windDir ?? 180;
  const groundGust = currentData.windGusts ?? groundSpeed * 1.4;

  const levels = [
    { alt: altitude, label: "Decollo", speed: groundSpeed, dir: groundDir, gust: groundGust },
    { alt: altitude + 200, label: "+200m", speed: groundSpeed * 1.1, dir: (groundDir + 5) % 360 },
    { alt: altitude + 500, label: "+500m", speed: groundSpeed * 1.25, dir: (groundDir + 10) % 360 },
    { alt: altitude + 1000, label: "+1000m", speed: groundSpeed * 1.5, dir: (groundDir + 15) % 360 },
    { alt: altitude + 1500, label: "+1500m", speed: groundSpeed * 1.7, dir: (groundDir + 20) % 360 },
    { alt: altitude + 2000, label: "+2000m", speed: groundSpeed * 1.9, dir: (groundDir + 25) % 360 },
    { alt: altitude + 2500, label: "+2500m", speed: groundSpeed * 2.1, dir: (groundDir + 30) % 360 },
    { alt: altitude + 3000, label: "+3000m", speed: groundSpeed * 2.3, dir: (groundDir + 35) % 360 },
    { alt: altitude + 3500, label: "+3500m", speed: groundSpeed * 2.5, dir: (groundDir + 40) % 360 },
    { alt: altitude + 4000, label: "+4000m", speed: groundSpeed * 2.7, dir: (groundDir + 45) % 360 },
  ];

  return levels.map(l => ({
    altitude: l.alt,
    speed: Math.round(l.speed),
    dir: Math.round(l.dir),
    dirName: degToDir(l.dir),
    gust: Math.round(l.speed * 1.4),
  }));
}

function evaluateFlyability(
  thermal: ThermalAnalysis,
  stability: StabilityAnalysis,
  windProfile: WindAtAltitude[],
  currentData: HourData | null,
  siteExposure: string,
  dayData: HourData[]
): FlyabilityResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const noFlyReasons: string[] = [];

  let score = 50;

  const hasThunderstorm = dayData.some(h => (h.weatherCode >= 95 && h.weatherCode <= 99) || h.weatherCode === 82);
  const hasRain = dayData.some(h => (h.precipitation ?? 0) > 1);
  const hasLightRain = dayData.some(h => (h.precipitation ?? 0) > 0.3);

  if (hasThunderstorm) {
    noFlyReasons.push("\u26C8\uFE0F TEMPORALI PREVISTI - Pericolo fulmini, grandine, outflow violenti");
    return { score: 0, label: "NON VOLABILE", color: "text-red-400", bg: "bg-red-950/80", reasons: [], warnings: [], noFlyReasons, window: { start: "\u2014", end: "\u2014", quality: "Nessuna" } };
  }

  if (hasRain) {
    noFlyReasons.push("\uD83C\uDFC7\uFE0F PIOGGIA SIGNIFICATIVA - Ali bagnate, visibilit\u00E0 ridotta, rischio stallo");
    return { score: 0, label: "NON VOLABILE", color: "text-red-400", bg: "bg-red-950/80", reasons: [], warnings: [], noFlyReasons, window: { start: "\u2014", end: "\u2014", quality: "Nessuna" } };
  }

  if (hasLightRain) {
    warnings.push("\uD83C\uDFC6\uFE0F Pioviggine sparsa possibile - Monitorare evoluzione");
    score -= 15;
  }

  const groundWind = windProfile[0];
  const windDirDiff = Math.abs(groundWind.dir - (() => {
    const expMap: Record<string, number> = { "N": 0, "NE": 45, "E": 90, "SE": 135, "S": 180, "SW": 225, "W": 270, "NW": 315, "S/SE": 157, "S/SW": 202, "N/NE": 22, "N/NW": 337, "E/NE": 67, "E/SE": 112, "W/NW": 292, "W/SW": 247 };
    return expMap[siteExposure.toUpperCase().replace(/\s+/g, "")] ?? 180;
  })());
  const windDiff = windDirDiff > 180 ? 360 - windDirDiff : windDirDiff;

  if (groundWind.speed < 2) {
    noFlyReasons.push("\uD83D\uDCA1 VENTO QUASI NULLO - Decollo a corsa impossibile, rischio stallo in apertura");
    score -= 25;
  } else if (groundWind.speed <= 5) {
    warnings.push("\uD83C\uDF83 Vento debole - Decollo tecnico, richiede corsa lunga");
    score -= 5;
  } else if (groundWind.speed <= 15) {
    reasons.push("\u2705 Vento ideale per decollo");
    score += 10;
  } else if (groundWind.speed <= 22) {
    warnings.push("\u26A0\uFE0F Vento sostenuto - Decollo impegnativo, richiede esperienza");
    score -= 5;
  } else if (groundWind.speed <= 30) {
    noFlyReasons.push("\uD83D\uDCA8 VENTO FORTE - Decollo pericoloso per piloti non esperti");
    score -= 20;
  } else {
    noFlyReasons.push("\uD83D\uDCA8 VENTO MOLTO FORTE - Decollo sconsigliato a chiunque");
    score -= 35;
  }

  if (windDiff <= 30) {
    reasons.push("\u2705 Vento frontale all'esposizione");
  } else if (windDiff <= 60) {
    reasons.push("\u2705 Vento diagonale favorevole");
  } else if (windDiff <= 90) {
    warnings.push("\u26A0\uFE0F Vento laterale - Attenzione in apertura");
    score -= 5;
  } else if (windDiff <= 135) {
    warnings.push("\u26A0\uFE0F Vento diagonale contrario - Decollo difficile");
    score -= 10;
  } else {
    noFlyReasons.push("\uD83D\uDEAB VENTO DI CODA / SOTTOVENTO - PERICOLOSO");
    score -= 30;
  }

  if (groundWind.gust && groundWind.gust > groundWind.speed + 10) {
    warnings.push(`\uD83C\uDF2C\uFE0F Raffiche irregolari (+${groundWind.gust - groundWind.speed} km/h) - Turbolenza meccanica probabile`);
    score -= 10;
  }

  const maxAltWind = windProfile.reduce((max, w) => w.speed > max.speed ? w : max, windProfile[0]);
  if (maxAltWind.speed > 40) {
    noFlyReasons.push(`\uD83D\uDCA8 Vento estremo in quota (${maxAltWind.speed} km/h a ${maxAltWind.altitude}m) - Deriva e turbolenza severa`);
    score -= 25;
  } else if (maxAltWind.speed > 30) {
    warnings.push(`\u26A0\uFE0F Vento forte in quota (${maxAltWind.speed} km/h a ${maxAltWind.altitude}m) - Attenzione sopra i 2500m`);
    score -= 10;
  } else if (maxAltWind.speed > 22) {
    warnings.push(`\uD83C\uDF2C\uFE0F Vento sostenuto in quota (${maxAltWind.speed} km/h a ${maxAltWind.altitude}m)`);
    score -= 5;
  }

  for (let i = 1; i < windProfile.length; i++) {
    const shear = Math.abs(windProfile[i].speed - windProfile[i - 1].speed);
    const dz = (windProfile[i].altitude - windProfile[i - 1].altitude) / 100;
    if (shear / dz > 8) {
      warnings.push(`\u26A0\uFE0F Wind shear forte tra ${windProfile[i - 1].altitude}m e ${windProfile[i].altitude}m (${shear} km/h per ${dz * 100}m)`);
      score -= 5;
      break;
    }
  }

  if (thermal.rate >= 3) {
    reasons.push(`\uD83D\uDD25 Termiche ${thermal.strength} (${thermal.rate} m/s medi, picco ${thermal.rate + 1} m/s)`);
    score += 20;
  } else if (thermal.rate >= 2) {
    reasons.push(`\uD83E\uDD82 Termiche ${thermal.strength} (${thermal.rate} m/s)`);
    score += 15;
  } else if (thermal.rate >= 1) {
    reasons.push(`\uD83C\uDF24\uFE0F Termiche ${thermal.strength} (${thermal.rate} m/s)`);
    score += 8;
  } else if (thermal.rate >= 0.3) {
    warnings.push(`\uD83C\uDF25\uFE0F Termiche ${thermal.strength} (${thermal.rate} m/s) - Volo locale breve`);
    score += 2;
  } else {
    noFlyReasons.push("\u2744\uFE0F Termiche assenti - Volo impossibile");
    score -= 20;
  }

  if (thermal.base <= altitude + 150) {
    warnings.push(`\u2601\uFE0F Base cumuli molto bassa (${thermal.base}m) - Rischio ingresso in nube`);
    score -= 10;
  }

  if (stability.thunderRisk === "estremo" || stability.thunderRisk === "alto") {
    noFlyReasons.push(`\u26C8\uFE0F Rischio temporali ${stability.thunderRisk} (CAPE ${stability.cape} J/kg, LI ${stability.liftedIndex})`);
    score -= 30;
  } else if (stability.thunderRisk === "moderato") {
    warnings.push(`\u26A0\uFE0F Rischio temporali moderato (CAPE ${stability.cape} J/kg) - Rientro entro 14:00`);
    score -= 10;
  } else if (stability.thunderRisk === "basso") {
    reasons.push(`\u2705 Basso rischio temporali (CAPE ${stability.cape} J/kg)`);
    score += 5;
  } else {
    reasons.push("\u2705 Atmosfera stabile, nessun rischio temporali");
    score += 5;
  }

  if (stability.state === "molto instabile") {
    warnings.push("\u26A0\uFE0F Atmosfera molto instabile - Sviluppo rapido cumulonembi");
    score -= 10;
  }

  const avgCloud = dayData.filter(h => {
    const hr = new Date(h.time).getHours();
    return hr >= 10 && hr <= 16;
  }).reduce((s, h) => s + (h.cloudCover ?? 0), 0) / Math.max(1, dayData.filter(h => {
    const hr = new Date(h.time).getHours();
    return hr >= 10 && hr <= 16;
  }).length);

  if (avgCloud > 80) {
    warnings.push("\u2601\uFE0F Cielo molto coperto - Termiche inibite");
    score -= 15;
  } else if (avgCloud > 60) {
    warnings.push("\u2601\uFE0F Cielo nuvoloso - Finestre di sole limitate");
    score -= 8;
  } else if (avgCloud >= 20 && avgCloud <= 50) {
    reasons.push("\u2705 Nuvolosit\u00E0 ideale per sviluppo termico");
    score += 5;
  }

  const freezingLevel = calcFreezingLevel(currentData?.temperature ?? 15, altitude);
  if (freezingLevel < altitude + 1500) {
    warnings.push(`\u2744\uFE0F Zero termico basso (${freezingLevel}m) - Ghiaccio possibile in quota`);
  }

  const triggerHour = parseInt(thermal.triggerTime.split(":")[0]);
  let endHour = 17;
  if (stability.thunderRisk === "alto" || stability.thunderRisk === "estremo") endHour = 13;
  else if (stability.thunderRisk === "moderato") endHour = 14;
  else if (hasLightRain) endHour = 15;

  const windowQuality = score >= 70 ? "Eccellente" : score >= 55 ? "Buona" : score >= 40 ? "Discreta" : "Limitata";

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let label: FlyabilityResult["label"];
  let color: string;
  let bg: string;

  if (finalScore >= 85) { label = "ECCELLENTE"; color = "text-emerald-300"; bg = "bg-emerald-950/80"; }
  else if (finalScore >= 70) { label = "OTTIMO"; color = "text-emerald-300"; bg = "bg-emerald-950/70"; }
  else if (finalScore >= 55) { label = "BUONO"; color = "text-lime-300"; bg = "bg-lime-950/70"; }
  else if (finalScore >= 40) { label = "IMPEGNATIVO"; color = "text-amber-300"; bg = "bg-amber-950/70"; }
  else if (finalScore >= 20) { label = "SCONSIGLIATO"; color = "text-orange-300"; bg = "bg-orange-950/80"; }
  else { label = "NON VOLABILE"; color = "text-red-400"; bg = "bg-red-950/80"; }

  return {
    score: finalScore,
    label,
    color,
    bg,
    reasons,
    warnings,
    noFlyReasons,
    window: { start: thermal.triggerTime, end: `${endHour}:00`, quality: windowQuality },
  };
}

/** ============================================================
 *  COMPONENTE PRINCIPALE
 *  ============================================================ */

export default function AnalisiApprofonditaCard({
  analisi,
  siteName,
  dayData = [],
  site,
  currentData,
}: Props) {
  const [expanded, setExpanded] = React.useState(false);

  const thermal = useMemo(() => analyzeThermals(dayData, site?.alt ?? 1000, currentData), [dayData, site?.alt, currentData]);
  const stability = useMemo(() => analyzeStability(dayData, currentData), [dayData, currentData]);
  const windProfile = useMemo(() => buildWindProfile(currentData, site?.alt ?? 1000), [currentData, site?.alt]);
  const flyability = useMemo(() => evaluateFlyability(thermal, stability, windProfile, currentData, site?.exposure ?? "S", dayData), [thermal, stability, windProfile, currentData, site?.exposure, dayData]);
  const freezingLevel = useMemo(() => calcFreezingLevel(currentData?.temperature ?? 15, site?.alt ?? 1000), [currentData, site?.alt]);

  if (!analisi || !dayData.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        <p>Dati insufficienti per generare l'analisi per {siteName}.</p>
      </div>
    );
  }

  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) {
      const d = dayData[0].time;
      const giorni = ["Domenica", "Luned\u00EC", "Marted\u00EC", "Mercoled\u00EC", "Gioved\u00EC", "Venerd\u00EC", "Sabato"];
      const mesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
      return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]} ${d.getFullYear()}`;
    }
    return new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }, [dayData]);

  return (
    <div className="space-y-4">
      {/* ===== HEADER CON GIUDIZIO VOLO ===== */}
      <div className={`bg-gradient-to-br from-slate-900/70 to-slate-800/40 border-2 rounded-2xl p-4 ${flyability.bg} border-${flyability.color.replace("text-", "")}/40`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/20 flex items-center justify-center border-2 border-amber-500/30">
              {flyability.noFlyReasons.length > 0 ? (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              ) : flyability.score >= 70 ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : flyability.score >= 40 ? (
                <Activity className="w-6 h-6 text-amber-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-orange-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white truncate">{siteName}</h3>
                <BadgeStato label={flyability.label} color={flyability.color} bg={flyability.bg.replace("bg-", "bg-").replace("/80", "/50").replace("/70", "/40")} />
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {dataGiorno} \u00B7 Quota decollo {site?.alt ?? 0}m \u00B7 Esposizione {site?.exposure ?? "N/D"}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-extrabold tabular-nums {flyability.color}">{flyability.score}/100</div>
            <div className="text-xs text-slate-400">Punteggio Volabilit\u00E0</div>
          </div>
        </div>

        <div className="bg-black/20 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-amber-300">Finestra: {flyability.window.start} \u2013 {flyability.window.end}</span>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${flyability.window.quality === "Eccellente" ? "text-emerald-300 bg-emerald-900/50" : flyability.window.quality === "Buona" ? "text-lime-300 bg-lime-900/50" : flyability.window.quality === "Discreta" ? "text-amber-300 bg-amber-900/50" : "text-orange-300 bg-orange-900/50"}`}>
              {flyability.window.quality}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">Innesco termico stimato: {thermal.triggerTime} \u00B7 Durata utile: {thermal.duration}</div>
        </div>

        {flyability.noFlyReasons.length > 0 && (
          <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-3">
            <div className="flex items-center gap-2 text-red-300 font-bold mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span>CONDIZIONI NON VOLABILI</span>
            </div>
            <ul className="space-y-1 text-sm text-red-200">
              {flyability.noFlyReasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">\u2022 {r}</li>
              ))}
            </ul>
          </div>
        )}

        {flyability.warnings.length > 0 && flyability.noFlyReasons.length === 0 && (
          <div className="bg-amber-950/50 border border-amber-500/40 rounded-xl p-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span>ATTENZIONE</span>
            </div>
            <ul className="space-y-1 text-sm text-amber-200">
              {flyability.warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2">\u2022 {w}</li>
              ))}
            </ul>
          </div>
        )}

        {flyability.reasons.length > 0 && (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-emerald-300 font-bold mb-2">
              <CheckCircle className="w-5 h-5" />
              <span>PUNTI FAVOREVOLI</span>
            </div>
            <ul className="space-y-1 text-sm text-emerald-200">
              {flyability.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">\u2713 {r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ===== ZERO TERMICO ===== */}
      <Sezione
        titolo="Zero Termico e Quota Ghiaccio"
        icona={<Snowflake className="w-4 h-4 text-cyan-400" />}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/60 rounded-xl p-4 text-center border border-cyan-500/30">
            <div className="text-xs text-slate-400 mb-1">ZERO TERMICO</div>
            <div className="text-3xl font-bold text-cyan-300">{freezingLevel} m</div>
            <div className="text-xs text-slate-500 mt-1">slm</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 text-center border border-slate-700/30">
            <div className="text-xs text-slate-400 mb-1">MARGINE SICUREZZA</div>
            <div className="text-3xl font-bold {freezingLevel - (site?.alt ?? 0) > 2000 ? 'text-emerald-300' : 'text-amber-300'}">
              {freezingLevel - (site?.alt ?? 0)} m
            </div>
            <div className="text-xs text-slate-500 mt-1">sopra decollo</div>
          </div>
          <div className="col-span-2 bg-slate-800/40 rounded-lg p-3 text-xs text-slate-300">
            <p className="font-bold text-white mb-1">Analisi quota ghiaccio:</p>
            <p>
              {freezingLevel - (site?.alt ?? 0) > 2500
                ? "Zero termico molto alto: nessun rischio ghiaccio fino a quote elevate. Volo in sicurezza fino al top termiche."
                : freezingLevel - (site?.alt ?? 0) > 1500
                  ? `Zero termico a quota media: prestare attenzione sopra i ${freezingLevel - 500}m. Possibile formazione di ghiaccio su ali e linee in quota.`
                  : `\u26A0\uFE0F Zero termico basso: rischio ghiaccio gi\u00E0 a ${freezingLevel}m. Volo sconsigliato sopra i ${freezingLevel - 300}m.`
              }
            </p>
          </div>
        </div>
      </Sezione>

      {/* ===== PROFILO VENTO VERTICALE FINO A 4000m ===== */}
      <Sezione
        titolo="Profilo Vento Verticale (Decollo \u2192 4000m)"
        icona={<Wind className="w-4 h-4 text-sky-400" />}
        badge={<BadgeStato label={`${windProfile.length} livelli`} color="text-sky-300" bg="bg-sky-900/30"} />
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-500">
                <th className="p-2 text-left w-24">Quota</th>
                <th className="p-2 text-left w-20">Vento</th>
                <th className="p-2 text-left w-24">Direzione</th>
                <th className="p-2 text-left w-20">Raffiche</th>
                <th className="p-2 text-left">Valutazione</th>
                <th className="p-2 text-left">Shear</th>
              </tr>
            </thead>
            <tbody>
              {windProfile.map((w, i) => {
                const shear = i > 0 ? Math.abs(w.speed - windProfile[i - 1].speed) : 0;
                const dz = i > 0 ? (w.altitude - windProfile[i - 1].altitude) / 100 : 0;
                const shearRate = dz > 0 ? shear / dz : 0;
                const isDecollo = i === 0;
                let evalText = "";
                let evalColor = "text-slate-400";
                if (isDecollo) {
                  if (w.speed >= 5 && w.speed <= 15) { evalText = "\u2705 Ideale"; evalColor = "text-emerald-300"; }
                  else if (w.speed < 5) { evalText = "\uD83D\uDCA1 Debole"; evalColor = "text-amber-300"; }
                  else if (w.speed <= 22) { evalText = "\u26A0\uFE0F Sostenuto"; evalColor = "text-orange-300"; }
                  else { evalText = "\uD83D\uDEAB Forte"; evalColor = "text-red-300"; }
                } else if (w.speed > 40) { evalText = "\uD83D\uDEAB Estremo"; evalColor = "text-red-300"; }
                else if (w.speed > 30) { evalText = "\u26A0\uFE0F Forte"; evalColor = "text-orange-300"; }
                else if (w.speed > 22) { evalText = "\uD83C\uDF2C\uFE0F Sostenuto"; evalColor = "text-amber-300"; }
                else { evalText = "\u2705 Gestibile"; evalColor = "text-emerald-300"; }

                return (
                  <tr key={w.altitude} className={`border-b border-slate-700/30 ${isDecollo ? "bg-emerald-900/20" : ""}`}>
                    <td className="p-2 font-bold text-white {isDecollo ? 'text-emerald-300' : ''}">{w.altitude}m {isDecollo && <span className="text-[9px] text-emerald-300 ml-1">DECOLLO</span>}</td>
                    <td className="p-2 font-bold text-sky-300">{w.speed} km/h</td>
                    <td className="p-2 text-slate-300 flex items-center gap-1"><span>{windArrow(w.dir)}</span> {w.dirName} ({w.dir}\u00B0)</td>
                    <td className="p-2 text-amber-300">{w.gust} km/h</td>
                    <td className="p-2 {evalColor}">{evalText}</td>
                    <td className="p-2 {shearRate > 5 ? 'text-red-300' : shearRate > 3 ? 'text-amber-300' : 'text-slate-400'}">
                      {i > 0 ? `${shearRate.toFixed(1)} km/h/100m` : "\u2014"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 bg-slate-800/40 rounded-lg p-3 text-xs text-slate-300 space-y-1">
          <p className="font-bold text-white">Analisi vento in quota:</p>
          <p>
            Vento al decollo: <strong>{windProfile[0].speed} km/h da {windProfile[0].dirName}</strong>
            {windProfile[0].gust && windProfile[0].gust > windProfile[0].speed + 8 ? ` con raffiche a ${windProfile[0].gust} km/h (turbolenza meccanica probabile)` : ""}.
          </p>
          <p>
            A 2000m: <strong>{windProfile.find(w => w.altitude >= site!.alt + 2000)?.speed ?? "N/D"} km/h</strong>,
            a 3000m: <strong>{windProfile.find(w => w.altitude >= site!.alt + 3000)?.speed ?? "N/D"} km/h</strong>,
            a 4000m: <strong>{windProfile.find(w => w.altitude >= site!.alt + 4000)?.speed ?? "N/D"} km/h</strong>.
          </p>
          {windProfile.some(w => w.speed > 30) && (
            <p className="text-orange-300 font-bold">\u26A0\uFE0F Vento forte in quota: deriva rapida, turbolenza sopra creste, atterraggio tecnico.</p>
          )}
          {windProfile.some((w, i) => i > 0 && Math.abs(w.speed - windProfile[i - 1].speed) / ((w.altitude - windProfile[i - 1].altitude) / 100) > 8) && (
            <p className="text-red-300 font-bold">\uD83D\uDEA8 Wind shear verticale rilevato: termiche inclinate/spezzate, volo turbolento.</p>
          )}
        </div>
      </Sezione>

      {/* ===== ANALISI TERMICA DETTAGLIATA ===== */}
      <Sezione
        titolo="Analisi Termica Dettagliata"
        icona={<ArrowUp className="w-4 h-4 text-amber-400"} />
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-amber-500/30">
            <div className="text-xs text-slate-400">BASE CUMULI</div>
            <div className="text-2xl font-bold text-amber-300">{thermal.base} m</div>
            <div className="text-[10px] text-slate-500">slm</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-amber-500/30">
            <div className="text-xs text-slate-400">TOP TERMICHE</div>
            <div className="text-2xl font-bold text-orange-300">{thermal.top} m</div>
            <div className="text-[10px] text-slate-500">slm</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-amber-500/30">
            <div className="text-xs text-slate-400">RATEO MEDIO</div>
            <div className="text-2xl font-bold {thermal.rate >= 2 ? 'text-emerald-300' : thermal.rate >= 1 ? 'text-amber-300' : 'text-red-300'}">{thermal.rate} m/s</div>
            <div className="text-[10px] text-slate-500">{thermal.strength}</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center border border-amber-500/30">
            <div className="text-xs text-slate-400">INNESCO</div>
            <div className="text-2xl font-bold text-sky-300">{thermal.triggerTime}</div>
            <div className="text-[10px] text-slate-500">ora locale</div>
          </div>
        </div>

        <div className="bg-slate-800/40 rounded-lg p-3 text-xs text-slate-300 space-y-1">
          <p className="font-bold text-white">Sviluppo termico previsto:</p>
          <p>
            Le termiche inizieranno ad attivarsi intorno alle <strong>{thermal.triggerTime}</strong> con il riscaldamento dei versanti esposti a {site?.exposure}.
            Il rateo di salita medio sar\u00E0 di <strong>{thermal.rate} m/s</strong> (<strong>{thermal.strength}</strong>),
            con picchi fino a <strong>{Math.min(5, thermal.rate + 1.5).toFixed(1)} m/s</strong> nelle ore centrali (12:00-15:00).
          </p>
          <p>
            La base dei cumuli si former\u00E0 a <strong>{thermal.base}m</strong> (LCL calcolato da spread T-Td medio).
            Il top termico raggiunger\u00E0 <strong>{thermal.top}m</strong>, offrendo un dislivello sfruttabile di <strong>{thermal.top - thermal.base}m</strong>.
          </p>
          {thermal.base <= (site?.alt ?? 0) + 200 && (
            <p className="text-red-300 font-bold">\u26A0\uFE0F ATTENZIONE: Base cumuli molto vicina al decollo ({thermal.base}m vs {site?.alt}m). Rischio ingresso in nube immediato.</p>
          )}
          {thermal.rate < 0.5 && (
            <p className="text-amber-300 font-bold">\u26A0\uFE0F Termiche deboli: volo solo in dinamica o pendio, cross difficile.</p>
          )}
        </div>
      </Sezione>

      {/* ===== STABILIT\u00C0 E RISCHIO TEMPORALI ===== */}
      <Sezione
        titolo="Stabilit\u00E0 Atmosferica e Rischio Temporali"
        icona={<Shield className="w-4 h-4 text-purple-400"} />
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-800/60 rounded-xl p-3 text-center border {stability.cape > 1000 ? 'border-red-500/40' : stability.cape > 500 ? 'border-amber-500/40' : 'border-green-500/40'}">
            <div className="text-xs text-slate-400">CAPE</div>
            <div className="text-2xl font-bold {stability.cape > 1000 ? 'text-red-300' : stability.cape > 500 ? 'text-amber-300' : 'text-emerald-300'}">{stability.cape} J/kg</div>
            <div className="text-[10px] text-slate-500">{stability.cape > 1500 ? "Molto alto" : stability.cape > 800 ? "Alto" : stability.cape > 300 ? "Moderato" : "Basso"}</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center border {stability.liftedIndex < -4 ? 'border-red-500/40' : stability.liftedIndex < -2 ? 'border-amber-500/40' : 'border-green-500/40'}">
            <div className="text-xs text-slate-400">LIFTED INDEX</div>
            <div className="text-2xl font-bold {stability.liftedIndex < -4 ? 'text-red-300' : stability.liftedIndex < -2 ? 'text-amber-300' : 'text-emerald-300'}">{stability.liftedIndex > 0 ? "+" : ""}{stability.liftedIndex}</div>
            <div className="text-[10px] text-slate-500">{stability.state}</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center border {stability.cin > 100 ? 'border-amber-500/40' : 'border-green-500/40'}">
            <div className="text-xs text-slate-400">CIN</div>
            <div className="text-2xl font-bold {stability.cin > 100 ? 'text-amber-300' : 'text-emerald-300'}">{stability.cin} J/kg</div>
            <div className="text-[10px] text-slate-500">{stability.cin > 100 ? "Inibizione" : "Innesco facile"}</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center border {stability.thunderRisk === 'alto' || stability.thunderRisk === 'estremo' ? 'border-red-500/40' : stability.thunderRisk === 'moderato' ? 'border-amber-500/40' : 'border-green-500/40'}">
            <div className="text-xs text-slate-400">RISCHIO TEMPORALI</div>
            <div className="text-xl font-bold {stability.thunderRisk === 'alto' || stability.thunderRisk === 'estremo' ? 'text-red-300' : stability.thunderRisk === 'moderato' ? 'text-amber-300' : 'text-emerald-300'}">
              {stability.thunderRisk === "estremo" ? "ESTREMO" : stability.thunderRisk === "alto" ? "ALTO" : stability.thunderRisk === "moderato" ? "MODERATO" : stability.thunderRisk === "basso" ? "BASSO" : "NESSUNO"}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 rounded-lg p-3 text-xs text-slate-300 space-y-1">
          <p className="font-bold text-white">Analisi stabilit\u00E0:</p>
          <p>
            L'atmosfera risulta <strong>{stability.state}</strong> (LI: {stability.liftedIndex > 0 ? "+" : ""}{stability.liftedIndex}).
            {stability.liftedIndex < -4
              ? " Instabilit\u00E0 marcata: sviluppo rapido di cumulonembi, temporali probabili nel pomeriggio."
              : stability.liftedIndex < -2
                ? " Instabilit\u00E0 moderata: cumuli congesti possibili, monitorare evoluzione."
                : stability.liftedIndex < 0
                  ? " Leggera instabilit\u00E0: cumuli pomeridiani benigni."
                  : " Atmosfera stabile: termiche deboli o assenti, cielo sereno."}
          </p>
          <p>
            CAPE di <strong>{stability.cape} J/kg</strong>:
            {stability.cape > 2000
              ? " Energia convettiva estrema: temporali violenti probabili, grandine, vento discendente > 80 km/h."
              : stability.cape > 1200
                ? " Energia elevata: temporali forti possibili, rientro anticipato obbligatorio."
                : stability.cape > 600
                  ? " Energia moderata: rovesci e temporali isolati pomeridiani."
                  : stability.cape > 100
                    ? " Energia limitata: cumuli modesti, termiche gestibili."
                    : " Energia trascurabile: atmosfera stabile, termiche deboli."}
          </p>
          <p>
            CIN di <strong>{stability.cin} J/kg</strong>:
            {stability.cin > 150
              ? " Forte inibizione: termiche faticano a partire, innesco ritardato oltre le 12:00."
              : stability.cin > 50
                ? " Inibizione moderata: innesco termico ritardato di 30-60 min."
                : " Inibizione debole/assente: termiche partono facilmente con il riscaldamento."}
          </p>
          {stability.thunderRisk !== "nessuno" && (
            <p className={stability.thunderRisk === "alto" || stability.thunderRisk === "estremo" ? "text-red-300 font-bold" : "text-amber-300 font-bold"}>
              \u26C8\uFE0F RISCHIO TEMPORALI: {stability.thunderRisk.toUpperCase()} \u2013 {stability.thunderRisk === "estremo" ? "Volo assolutamente sconsigliato" : stability.thunderRisk === "alto" ? "Rientro tassativo entro le 13:00" : stability.thunderRisk === "moderato" ? "Rientro entro le 14:30, monitorare radar" : "Basso rischio, vigilanza standard"}.
            </p>
          )}
        </div>
      </Sezione>

      {/* ===== CONDIZIONI AL SUOLO ===== */}
      <Sezione
        titolo="Condizioni al Suolo"
        icona={<Thermometer className="w-4 h-4 text-orange-400"} />
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Riga label="Temperatura" value={analisi?.tempAttuale ?? currentData?.temperature ?? "N/D"} unit="\u00B0C" color="text-amber-300" />
          <Riga label="Min / Max" value={`${analisi?.tempMin ?? "?"} / ${analisi?.tempMax ?? "?"}`} unit="\u00B0C" />
          <Riga label="Punto rugiada" value={analisi?.dewPoint ?? currentData?.dewPoint ?? "N/D"} unit="\u00B0C" color="text-cyan-300" />
          <Riga label="Umidit\u00E0" value={analisi?.umidita ?? currentData?.humidity ?? "N/D"} unit="%" color="text-blue-300" />
          <Riga label="Pressione" value={currentData?.pressure ?? "N/D"} unit="hPa" />
          <Riga label="Vento" value={currentData?.windSpeed ?? "N/D"} unit="km/h" color="text-sky-300" />
          <Riga label="Direzione" value={`${windArrow(currentData?.windDir ?? 0)} ${degToDir(currentData?.windDir ?? 0)} (${currentData?.windDir ?? "?"}\u00B0)`} />
          <Riga label="Raffiche" value={currentData?.windGusts ?? "N/D"} unit="km/h" color="text-amber-300" warn={(currentData?.windGusts ?? 0) > (currentData?.windSpeed ?? 0) + 10} />
          <Riga label="Nuvolosit\u00E0" value={currentData?.cloudCover ?? "N/D"} unit="%" color="text-slate-300" />
          <Riga label="Precipitazioni" value={currentData?.precipitation ?? 0} unit="mm/h" color={currentData?.precipitation && currentData.precipitation > 0 ? "text-blue-300" : "text-green-300"} warn={currentData?.precipitation && currentData.precipitation > 0.5} />
          <Riga label="Visibilit\u00E0" value={currentData?.visibility ? Math.round(currentData.visibility / 1000) : "N/D"} unit="km" color="text-emerald-300" />
          <Riga label="UV Index" value={currentData?.uvIndex ?? "N/D"} color={currentData?.uvIndex && currentData.uvIndex > 6 ? "text-red-300" : currentData?.uvIndex && currentData.uvIndex > 3 ? "text-amber-300" : "text-green-300"} />
        </div>
      </Sezione>

      {/* ===== ANALISI COMPLETA TESTUALE (STILE BOLLETTINO) ===== */}
      <Sezione
        titolo="Bollettino Meteo Aerologico Completo"
        icona={<Layers className="w-4 h-4 text-slate-400"} />
      >
        <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-4 text-sm text-slate-300 leading-relaxed space-y-3 font-mono text-[12px]">
          <p className="text-white font-bold border-b border-slate-700/50 pb-2">
            BOLLETTINO METEO {siteName.toUpperCase()} \u2013 {dataGiorno.toUpperCase()}
          </p>

          <p>
            <span className="text-amber-300">1. QUADRO TERMICO E STABILIT\u00C0:</span>
            Giornata con condizioni {flyability.score >= 70 ? "favorevoli" : flyability.score >= 40 ? "moderate" : "difficili"} per il volo libero.
            Temperatura al suolo: {analisi?.tempAttuale ?? currentData?.temperature ?? "N/D"}\u00B0C (min {analisi?.tempMin ?? "?"}\u00B0C / max {analisi?.tempMax ?? "?"}\u00B0C).
            Punto di rugiada: {analisi?.dewPoint ?? currentData?.dewPoint ?? "N/D"}\u00B0C \u2192 spread {Math.round((analisi?.tempAttuale ?? currentData?.temperature ?? 15) - (analisi?.dewPoint ?? currentData?.dewPoint ?? 8))}\u00B0C.
            Zero termico a <strong>{freezingLevel}m</strong> (margine {freezingLevel - (site?.alt ?? 0)}m sopra decollo).
            CAPE: <strong>{stability.cape} J/kg</strong> ({stability.cape > 1000 ? "alto" : stability.cape > 300 ? "moderato" : "basso"}),
            Lifted Index: <strong>{stability.liftedIndex > 0 ? "+" : ""}{stability.liftedIndex}</strong> ({stability.state}).
            CIN: <strong>{stability.cin} J/kg</strong> ({stability.cin > 50 ? "inibizione presente" : "innesco facile"}).
            Rischio temporali: <strong className={stability.thunderRisk === "alto" || stability.thunderRisk === "estremo" ? "text-red-300" : stability.thunderRisk === "moderato" ? "text-amber-300" : "text-green-300"}>{stability.thunderRisk.toUpperCase()}</strong>.
          </p>

          <p>
            <span className="text-cyan-300">2. PROFILO VENTO VERTICALE:</span>
            Decollo ({site?.alt}m): <strong>{windProfile[0].speed} km/h da {windProfile[0].dirName}</strong>
            {windProfile[0].gust && windProfile[0].gust > windProfile[0].speed + 8 ? `, raffiche ${windProfile[0].gust} km/h` : ""}.
            A 1500m slm: ~<strong>{windProfile.find(w => w.altitude >= 1500)?.speed ?? "N/D"} km/h</strong>,
            a 2500m: ~<strong>{windProfile.find(w => w.altitude >= 2500)?.speed ?? "N/D"} km/h</strong>,
            a 3500m: ~<strong>{windProfile.find(w => w.altitude >= 3500)?.speed ?? "N/D"} km/h</strong>.
            {windProfile.some(w => w.speed > 30) ? " <span className='text-orange-300'>Vento forte in quota: deriva e turbolenza.</span>" : " Vento in quota gestibile."}
            {windProfile.some((w, i) => i > 0 && Math.abs(w.speed - windProfile[i - 1].speed) / ((w.altitude - windProfile[i - 1].altitude) / 100) > 8) ? " <span className='text-red-300'>Wind shear verticale significativo rilevato.</span>" : ""}
          </p>

          <p>
            <span className="text-amber-300">3. TERMICHE E CONVEZIONE:</span>
            Innesco termico stimato alle <strong>{thermal.triggerTime}</strong>.
            Base cumuli (LCL): <strong>{thermal.base}m</strong> slm.
            Top termiche: <strong>{thermal.top}m</strong> slm (dislivello {thermal.top - thermal.base}m).
            Rateo medio: <strong>{thermal.rate} m/s</strong> ({thermal.strength}).
            Finestra utile: <strong>{thermal.triggerTime} \u2013 {flyability.window.end}</strong> ({flyability.window.quality}).
            {thermal.base <= (site?.alt ?? 0) + 200 ? " <span className='text-red-300'>Base cumuli critica: rischio ingresso in nube immediato.</span>" : ""}
          </p>

          <p>
            <span className="text-sky-300">4. NUVOLOSIT\u00C0 E PRECIPITAZIONI:</span>
            Copertura media ore centrali: <strong>{Math.round(dayData.filter(h => { const hr = new Date(h.time).getHours(); return hr >= 10 && hr <= 16; }).reduce((s, h) => s + (h.cloudCover ?? 0), 0) / Math.max(1, dayData.filter(h => { const hr = new Date(h.time).getHours(); return hr >= 10 && hr <= 16; }).length))}%</strong>.
            {dayData.some(h => (h.precipitation ?? 0) > 0) ? ` <span className='text-blue-300'>Precipitazioni previste: ${dayData.filter(h => (h.precipitation ?? 0) > 0).reduce((s, h) => s + (h.precipitation ?? 0), 0).toFixed(1)}mm totali.</span>` : " Nessuna precipitazione prevista."}
            {dayData.some(h => (h.weatherCode >= 95 && h.weatherCode <= 99)) && " <span className='text-red-300 font-bold'>TEMPORALI PREVISTI (codice WMO 95-99).</span>"}
          </p>

          <p className="text-emerald-300 font-bold border-t border-slate-700/50 pt-2">
            \uD83E\uDD82 GIUDIZIO FINALE: {flyability.label} ({flyability.score}/100) \u2013 {flyability.noFlyReasons.length > 0 ? "Volo NON consigliato" : flyability.score >= 70 ? "Volo CONSIGLIATO" : flyability.score >= 40 ? "Volo CON PRUDENZA" : "Volo SCONSIGLIATO"}.
            {flyability.noFlyReasons.length > 0 && ` Motivi: ${flyability.noFlyReasons.join("; ")}`}
          </p>
        </div>
      </Sezione>

      {/* ===== LEGENDA ESPANDIBILE ===== */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-xs text-slate-500 hover:text-slate-300 py-2 flex items-center justify-center gap-1"
        >
          <Map className="w-3 h-3" />
          Mostra legenda parametri e note tecniche
        </button>
      )}
      {expanded && (
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
            >
              <ChevronUp className="w-3 h-3" />
              Nascondi legenda
            </button>
          </div>
          <h4 className="text-xs text-slate-400 font-bold mb-2">Legenda Parametri Aerologici</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div><span className="text-slate-500">CAPE:</span> Convective Available Potential Energy \u2013 energia per convezione. >1000 J/kg = temporali probabili.</div>
            <div><span className="text-slate-500">Lifted Index (LI):</span> Stabilit\u00E0. <0 = instabile, <-4 = molto instabile, >3 = molto stabile.</div>
            <div><span className="text-slate-500">CIN:</span> Convective Inhibition \u2013 energia che blocca l'innesco. >100 J/kg = innesco difficile.</div>
            <div><span className="text-slate-500">LCL / Base cumuli:</span> Livello di condensazione. Base = quota + (T-Td)\u00D7125m.</div>
            <div><span className="text-slate-500">Zero termico:</span> Quota dove T=0\u00B0C. Calcolato: quota + T/0.0065.</div>
            <div><span className="text-slate-500">Wind shear:</span> Variazione vento con quota. >5 km/h per 100m = turbolenza termiche.</div>
            <div><span className="text-slate-500">Rateo salita:</span> Velocit\u00E0 verticale termica. >2 m/s = ottimo, 1-2 = buono, <0.5 = debole.</div>
            <div><span className="text-slate-500">Vento frontale/laterale/coda:</span> Rispetto a esposizione decollo. Frontale = ideale, coda = pericoloso.</div>
            <div><span className="text-slate-500">Raffiche:</span> Vento istantaneo. Delta >10 km/h vs media = turbolenza meccanica.</div>
            <div><span className="text-slate-500">K-Index / Total Totals:</span> Indici temporali. K>30 o TT>50 = alto rischio.</div>
          </div>
        </div>
      )}
    </div>
  );
}