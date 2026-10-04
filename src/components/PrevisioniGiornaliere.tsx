"use client";

import React, { useState } from "react";
import type { HourData } from "@/types/meteo";
import type { MeteoCurrent, MeteoDaily } from "@/services/openMeteoService";
import {
  Sun, Wind, Thermometer, CloudRain, Droplets, Mountain,
  ArrowUp, ArrowDown, Minus, Cloud, Zap, Eye, Gauge,
  CheckCircle, AlertTriangle, XCircle,
  Thermometer as ThermoIcon
} from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: MeteoDaily[];
  dateLabels: string[];
  currentData: HourData | MeteoCurrent | null;
  dayData: HourData[];
  site: { name: string; altitude: number; exposure: string };
  selectedDay: number;
  onSelectDay: (dayIdx: number) => void;
  nomeDecollo?: string;
}

// ─── Utility ────────────────────────────────────────────────
function dirToIcon(dir: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(dir / 45) % 8];
}

function getFlightRating(daily: MeteoDaily, current: HourData | MeteoCurrent | null): number {
  if (!daily) return 0;
  let score = 5; // base

  // Vento (peggiora > 20 km/h)
  const wind = daily.windSpeedMax ?? 10;
  if (wind <= 8) score += 2;
  else if (wind <= 15) score += 1;
  else if (wind <= 25) score -= 1;
  else score -= 2;

  // Pioggia (peggiora se > 1mm)
  const rain = daily.precipitationSum ?? 0;
  if (rain <= 0.2) score += 1;
  else if (rain <= 2) score -= 1;
  else score -= 2;

  // Nuvolosità
  const cloudCover = (current as any)?.cloudCover ?? 30;
  if (cloudCover <= 30) score += 1;
  else if (cloudCover > 70) score -= 1;

  // CAPE
  const cape = (current as any)?.cape ?? 0;
  if (cape >= 200 && cape <= 1000) score += 1;
  else if (cape > 1500) score -= 1;

  // UV
  const uv = daily.uvIndexMax ?? 5;
  if (uv > 8) score -= 1;

  return Math.max(1, Math.min(10, Math.round(score)));
}

function getFlightVerdict(rating: number): { label: string; color: string; icon: React.ReactNode } {
  if (rating >= 8) return { label: "VOLO CONSENTITO", color: "text-emerald-400", icon: <CheckCircle className="w-5 h-5 text-emerald-400" /> };
  if (rating >= 5) return { label: "VOLO POSSIBILE", color: "text-amber-400", icon: <AlertTriangle className="w-5 h-5 text-amber-400" /> };
  return { label: "VOLO SCONSIGLIATO", color: "text-red-400", icon: <XCircle className="w-5 h-5 text-red-400" /> };
}

function getWeatherIcon(code: number, size: "sm" | "lg" = "sm"): string {
  const s = size === "lg" ? "text-4xl" : "text-lg";
  if (code >= 95) return `text-3xl`;
  if (code >= 80) return `text-2xl`;
  if (code >= 71) return `text-2xl`;
  if (code >= 61) return `text-xl`;
  if (code >= 51) return `text-xl`;
  if (code >= 45) return `text-xl`;
  if (code >= 20) return `text-xl`;
  if (code >= 10) return `text-xl`;
  if (code >= 5) return `text-lg`;
  return `text-xl`;
}

function getWeatherEmoji(code: number): string {
  if (code >= 95) return "⛈️";
  if (code >= 80) return "🌧️";
  if (code >= 71) return "❄️";
  if (code >= 61) return "🌧️";
  if (code >= 51) return "🌦️";
  if (code >= 45) return "🌫️";
  if (code >= 20) return "☁️";
  if (code >= 10) return "⛅";
  if (code >= 5) return "🌤️";
  return "☀️";
}

function getWeatherDesc(code: number): string {
  if (code >= 95) return "Temporale";
  if (code >= 80) return "Rovesci";
  if (code >= 71) return "Neve";
  if (code >= 61) return "Pioggia";
  if (code >= 51) return "Pioviggine";
  if (code >= 45) return "Nebbia";
  if (code >= 30) return "Coperto";
  if (code >= 20) return "Nuvoloso";
  if (code >= 10) return "Variabile";
  if (code >= 5) return "Poco nuvoloso";
  return "Sereno";
}

// ─── Card Component ─────────────────────────────────────────
function InfoCard({
  icon,
  label,
  value,
  unit,
  sub,
  color = "text-white",
  accentColor,
  barValue,
  barMax = 100,
  barColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  color?: string;
  accentColor?: string;
  barValue?: number;
  barMax?: number;
  barColor?: string;
}) {
  return (
    <div className={`rounded-xl p-3 border ${accentColor || "bg-slate-800/60 border-slate-700/50"}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`${accentColor ? "text-emerald-400" : "text-slate-400"}`}>{icon}</span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-black ${color}`}>{value}</span>
        {unit && <span className="text-xs text-slate-500 font-medium">{unit}</span>}
      </div>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
      {barValue != null && (
        <div className="mt-2">
          <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor || "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, (barValue / barMax) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function PrevisioniGiornaliere({
  enrichedDaily,
  dateLabels,
  currentData,
  dayData,
  site,
  selectedDay,
  onSelectDay,
}: PrevisioniGiornaliereProps) {
  const tabs = ["Oggi", "Domani", "Dopodomani"];

  // Dati correnti
  const temp = currentData?.temperature ?? 15;
  const feelsLike = (currentData as any)?.feelsLike ?? temp;
  const dewPoint = (currentData as any)?.dewPoint ?? temp - 5;
  const spread = temp - dewPoint;
  const windSpeed = currentData?.windSpeed ?? 5;
  const windGusts = (currentData as any)?.windGusts ?? windSpeed * 1.3;
  const windDir = currentData?.windDir ?? 180;
  const humidity = currentData?.humidity ?? 60;
  const pressure = (currentData as any)?.surfacePressure ?? 1013;
  const visibility = (currentData as any)?.visibility ?? 10;
  const cape = (currentData as any)?.cape ?? 0;
  const cloudCover = currentData?.cloudCover ?? 30;
  const cloudLow = (currentData as any)?.cloudCoverLow ?? cloudCover * 0.3;
  const cloudMid = (currentData as any)?.cloudCoverMid ?? cloudCover * 0.4;
  const cloudHigh = (currentData as any)?.cloudCoverHigh ?? cloudCover * 0.3;
  const uvIndex = currentData?.uvIndex ?? 5;
  const radiation = (currentData as any)?.radiation ?? 0;

  // Thermal calculations
  const thermalRate = Math.max(0.1, Math.min(3, spread * 0.15 + (cape > 0 ? cape / 5000 : 0)));
  const cloudBase = site.altitude + Math.round(spread * 125);
  const zeroCLevel = (currentData as any)?.freezingLevel ?? Math.round(5500 - temp * 155);
  const topThermal = Math.round(cloudBase + thermalRate * 2000);

  // Wind profile at altitude
  const windAt80m = windSpeed * 1.1;
  const windAt120m = windSpeed * 1.2;
  const windAt180m = windSpeed * 1.3;

  // Flight rating
  const daily = enrichedDaily[selectedDay] ?? enrichedDaily[0];
  const flightRating = getFlightRating(daily, currentData);
  const verdict = getFlightVerdict(flightRating);

  // Popup state
  const [showDetail, setShowDetail] = useState(false);
  const [detailDay, setDetailDay] = useState(0);

  function openDetail(idx: number) {
    setDetailDay(idx);
    setShowDetail(true);
  }

  // Prepare detail data for popup
  const detailDaily = enrichedDaily[detailDay];
  const detailDayData = dayData.filter(d => {
    const dDate = new Date(d.time);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + detailDay);
    return dDate.toDateString() === targetDate.toDateString();
  });
  const detailLabel = dateLabels[detailDay] || tabs[detailDay];

  return (
    <div className="space-y-4">
      {/* ─── HEADER: VOTO VOLO + TEMPERATURA + VENTO ─── */}
      <div className="grid grid-cols-3 gap-3">
        {/* VOTO VOLO */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-900/40 to-slate-900/80 border border-emerald-500/30 flex flex-col items-center justify-center text-center">
          <div className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-widest mb-1">Voto Volo</div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black text-emerald-400">{flightRating}</span>
            <span className="text-sm text-emerald-500/60 font-bold">/10</span>
          </div>
          <div className={`text-xs font-black mt-1 ${verdict.color}`}>{verdict.label}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Condizioni favorevoli</div>
        </div>

        {/* TEMPERATURA ARIA */}
        <div className="rounded-2xl p-4 bg-slate-800/60 border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Temperatura Aria</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1 mb-3">
            <span className="text-3xl font-black text-white">{Math.round(temp)}°</span>
            <span className="text-xs text-slate-500">C</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Percepita</span>
              <span className="font-bold text-slate-200">{Math.round(feelsLike)}°C</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Punto rugiada</span>
              <span className="font-bold text-sky-300">{Math.round(dewPoint)}°C</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Spread</span>
              <span className="font-bold text-amber-300">{spread.toFixed(1)}°C</span>
            </div>
          </div>
          {spread < 6 && (
            <div className="mt-2 text-[10px] text-amber-400/80 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Termiche deboli — solo correnti locali
            </div>
          )}
        </div>

        {/* VENTO AL SUOLO */}
        <div className="rounded-2xl p-4 bg-slate-800/60 border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vento al Suolo</span>
            <Wind className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-3xl font-black text-white">{Math.round(windSpeed)}</span>
            <span className="text-sm text-slate-500 font-bold">km/h</span>
            <span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-bold ml-auto">
              {dirToIcon(windDir)} {windDir}°
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Raffiche</span>
              <span className="font-bold text-rose-400">{Math.round(windGusts)} km/h</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Calmo</span>
              <span className="font-bold text-emerald-400">decollo assistito</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            {windGusts > windSpeed * 1.5
              ? "⚠️ Raffiche forti — attenzione"
              : "Decollo assistito e atterraggio dolce"}
          </div>
        </div>
      </div>

      {/* ─── PARAMETRI ATTUALI ─── */}
      <div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Parametri Attuali</div>
        <div className="grid grid-cols-4 gap-3">
          <InfoCard
            icon={<Droplets className="w-3.5 h-3.5" />}
            label="Umidità"
            value={humidity}
            unit="%"
            sub="Aria umida"
            accentColor="bg-slate-800/60 border-slate-700/50"
            barValue={humidity}
            barMax={100}
            barColor={humidity > 80 ? "bg-rose-500" : humidity > 60 ? "bg-amber-500" : "bg-emerald-500"}
          />
          <InfoCard
            icon={<Thermometer className="w-3.5 h-3.5" />}
            label="Spread"
            value={spread.toFixed(1)}
            unit="°C"
            sub="T − punto rugiada"
            accentColor="bg-slate-800/60 border-slate-700/50"
            barValue={spread}
            barMax={12}
            barColor={spread > 6 ? "bg-emerald-500" : spread > 3 ? "bg-amber-500" : "bg-rose-500"}
          />
          <InfoCard
            icon={<Gauge className="w-3.5 h-3.5" />}
            label="Pressione"
            value={Math.round(pressure)}
            unit="hPa"
            sub="Atmosferica"
            accentColor="bg-slate-800/60 border-slate-700/50"
          />
          <InfoCard
            icon={<Eye className="w-3.5 h-3.5" />}
            label="Visibilità"
            value={visibility >= 10 ? "10+" : visibility}
            unit={visibility >= 10 ? "km" : "km"}
            sub={visibility >= 10 ? "Ottima" : visibility >= 5 ? "Buona" : "Limitata"}
            accentColor="bg-slate-800/60 border-slate-700/50"
            barValue={Math.min(10, visibility)}
            barMax={10}
            barColor={visibility >= 8 ? "bg-emerald-500" : visibility >= 5 ? "bg-amber-500" : "bg-rose-500"}
          />
        </div>
      </div>

      {/* ─── PARAMETRI DI VOLO ─── */}
      <div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
          <span>Parametri di Volo</span>
          <span className="text-[9px] text-slate-600 font-medium">Tutti i dati che ti servono per decidere</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Rateo Termico */}
          <div className="rounded-xl p-3 bg-slate-800/60 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <ArrowUp className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Rateo Termico</div>
                <div className="text-[9px] text-slate-600">Ascendenza media</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-purple-300">{thermalRate.toFixed(1)}</span>
              <span className="text-xs text-slate-500">m/s</span>
            </div>
            <div className="mt-1.5 h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: `${Math.min(100, thermalRate * 33)}%` }} />
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              {thermalRate >= 1.5 ? "Termiche forti" : thermalRate >= 0.8 ? "Termiche discrete" : "Termiche deboli"}
            </div>
          </div>

          {/* Base Cumuli */}
          <div className="rounded-xl p-3 bg-slate-800/60 border border-sky-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Base Cumuli</div>
                <div className="text-[9px] text-slate-600">Quota inizio nubi</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-sky-300">{cloudBase.toLocaleString()}</span>
              <span className="text-xs text-slate-500">m slm</span>
            </div>
            <div className="mt-1.5 h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full" style={{ width: `${Math.min(100, (cloudBase / 4000) * 100)}%` }} />
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              +{cloudBase - site.altitude}m sopra il campo
            </div>
          </div>

          {/* Zero Termico */}
          <div className="rounded-xl p-3 bg-slate-800/60 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Thermometer className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Zero Termico</div>
                <div className="text-[9px] text-slate-600">Confine neve/pioggia</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-violet-300">{zeroCLevel.toLocaleString()}</span>
              <span className="text-xs text-slate-500">m</span>
            </div>
            <div className="mt-1.5 h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full" style={{ width: `${Math.min(100, (zeroCLevel / 5000) * 100)}%` }} />
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              +{zeroCLevel - site.altitude}m sopra il campo
            </div>
          </div>

          {/* CAPE */}
          <div className="rounded-xl p-3 bg-slate-800/60 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">CAPE</div>
                <div className="text-[9px] text-slate-600">Energia termica</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-amber-300">{Math.round(cape)}</span>
              <span className="text-xs text-slate-500">J/kg</span>
            </div>
            <div className="mt-1.5 h-1 bg-slate-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full" style={{ width: `${Math.min(100, (cape / 2000) * 100)}%` }} />
            </div>
            <div className="text-[9px] text-slate-500 mt-1">
              {cape > 1000 ? "Instabilità alta" : cape > 300 ? "Instabilità moderata" : "Stabilità elevata"}
            </div>
          </div>

          {/* Top Termica */}
          <div className="rounded-xl p-3 bg-slate-800/60 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Top Termica</div>
                <div className="text-[9px] text-slate-600">Massima quota</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-300">{topThermal.toLocaleString()}</span>
              <span className="text-xs text-slate-500">m</span>
            </div>
            <div className="mt-1.5 text-[9px] text-slate-500">
              +{topThermal - site.altitude}m dal suolo
            </div>
          </div>

          {/* Copertura Cielo */}
          <div className="rounded-xl p-3 bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <Cloud className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Copertura Cielo</div>
                <div className="text-[9px] text-slate-600">Nuvolosità totale</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">{cloudCover}</span>
              <span className="text-xs text-slate-500">%</span>
            </div>
            <div className="mt-1.5 space-y-0.5">
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-500">Bassa</span>
                <span className="text-sky-300 font-bold">{Math.round(cloudLow)}%</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-500">Media</span>
                <span className="text-slate-300 font-bold">{Math.round(cloudMid)}%</span>
              </div>
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-500">Alta</span>
                <span className="text-violet-300 font-bold">{Math.round(cloudHigh)}%</span>
              </div>
            </div>
          </div>

          {/* UV Indice */}
          <div className="rounded-xl p-3 bg-slate-800/60 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">UV Indice</div>
                <div className="text-[9px] text-slate-600">Radiazione solare</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black ${uvIndex > 6 ? "text-rose-400" : uvIndex > 3 ? "text-amber-400" : "text-emerald-400"}`}>
                {Math.round(uvIndex)}
              </span>
            </div>
            <div className="mt-1.5 text-[9px] text-slate-500">
              {uvIndex > 8 ? "🔴 Estremo — proteggersi" : uvIndex > 6 ? "🟠 Molto alto" : uvIndex > 3 ? "🟡 Alto" : "🟢 Basso"}
            </div>
          </div>

          {/* Radiazione */}
          <div className="rounded-xl p-3 bg-slate-800/60 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Sun className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase">Radiazione</div>
                <div className="text-[9px] text-slate-600">Energia solare giornaliera</div>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-orange-300">{Math.round(radiation)}</span>
              <span className="text-xs text-slate-500">W/m²</span>
            </div>
            <div className="mt-1.5 text-[9px] text-slate-500">
              {radiation > 600 ? "☀️ Alta radiazione" : radiation > 300 ? "🌤️ Radiazione moderata" : "☁️ Bassa radiazione"}
            </div>
          </div>
        </div>
      </div>

      {/* ─── PROFILO VENTO VERTICALE ─── */}
      <div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
          <span>Profilo Vento Verticale</span>
          <span className="text-[9px] text-slate-600 font-medium">Decollo → atterraggio — ogni livello conta</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Suolo (10m)", speed: windSpeed, dir: windDir, alt: "0m" },
            { label: "80m", speed: windAt80m, dir: windDir + 10, alt: "~80m slm" },
            { label: "120m", speed: windAt120m, dir: windDir + 20, alt: "~120m slm" },
            { label: "180m", speed: windAt180m, dir: windDir + 30, alt: "~180m slm" },
          ].map((layer) => (
            <div key={layer.label} className="rounded-xl p-3 bg-slate-800/60 border border-slate-700/50">
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{layer.label}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-sky-300">{Math.round(layer.speed)}</span>
                <span className="text-xs text-slate-500">km/h</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {dirToIcon(layer.dir)} {layer.dir}°
              </div>
              <div className="text-[9px] text-slate-600 mt-1">{layer.alt}</div>
              <div className="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${layer.speed > 25 ? "bg-rose-500" : layer.speed > 15 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, layer.speed * 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 3 GIORNI TABS ─── */}
      <div className="pt-2">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Previsioni 3 Giorni</div>
        <div className="grid grid-cols-3 gap-3">
          {tabs.map((tabName, idx) => {
            const d = enrichedDaily[idx];
            const isActive = selectedDay === idx;
            const label = dateLabels[idx] || tabName;
            const isRainy = d && d.precipitationSum > 0.5;
            const rating = getFlightRating(d, currentData);
            const v = getFlightVerdict(rating);

            return (
              <button
                key={idx}
                onClick={() => openDetail(idx)}
                className={`relative overflow-hidden transition-all duration-300 rounded-2xl p-4 text-left cursor-pointer border-2 group ${
                  isActive
                    ? "border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-900/20"
                    : isRainy
                    ? "border-rose-500/30 bg-rose-950/20 hover:border-rose-500/50"
                    : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{d ? getWeatherEmoji(d.weatherCode) : "☀️"}</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700/50 text-slate-400"
                  }`}>
                    {rating}/10
                  </span>
                </div>
                <div className="font-black text-white text-base">{tabName}</div>
                <div className="text-[10px] text-slate-500 font-medium mb-2">{label}</div>
                {d && (
                  <>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-xl font-black text-amber-300">{Math.round(d.temperatureMax)}°</span>
                      <span className="text-xs text-slate-600">/</span>
                      <span className="text-lg font-bold text-sky-300">{Math.round(d.temperatureMin)}°</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold mb-2">{getWeatherDesc(d.weatherCode)}</div>
                    <div className="space-y-0.5 text-[10px] text-slate-500">
                      <div className="flex justify-between">
                        <span>Vento max</span>
                        <span className="text-sky-300 font-bold">{Math.round(d.windSpeedMax)} km/h</span>
                      </div>
                      {d.precipitationSum > 0 && (
                        <div className="flex justify-between">
                          <span>Pioggia</span>
                          <span className="text-rose-300 font-bold">{d.precipitationSum.toFixed(1)} mm</span>
                        </div>
                      )}
                      {d.freezingLevel && (
                        <div className="flex justify-between">
                          <span>0°C</span>
                          <span className="text-violet-300 font-bold">{d.freezingLevel.toLocaleString()}m</span>
                        </div>
                      )}
                    </div>
                    <div className={`mt-2 pt-1.5 border-t border-white/5 text-[9px] font-semibold ${v.color}`}>
                      {v.label}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── DETAIL POPUP ─── */}
      {showDetail && detailDaily && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{tabs[detailDay]}</div>
                <div className="text-lg font-black text-white">{detailLabel}</div>
              </div>
              <button onClick={() => setShowDetail(false)} className="p-2 rounded-xl hover:bg-slate-800 transition-colors">
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Weather + Temp */}
              <div className="flex items-center gap-4">
                <span className="text-5xl">{getWeatherEmoji(detailDaily.weatherCode)}</span>
                <div>
                  <div className="text-4xl font-black text-white">{Math.round(detailDaily.temperatureMax)}°</div>
                  <div className="text-sm text-slate-400">
                    Min <span className="text-sky-300 font-bold">{Math.round(detailDaily.temperatureMin)}°</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{getWeatherDesc(detailDaily.weatherCode)}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className={`text-3xl font-black ${flightRating >= 7 ? "text-emerald-400" : flightRating >= 5 ? "text-amber-400" : "text-red-400"}`}>
                    {getFlightRating(detailDaily, currentData)}/10
                  </div>
                  <div className="text-xs text-slate-500">Voto Volo</div>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Wind className="w-4 h-4 text-sky-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Vento Max</span>
                  </div>
                  <div className="text-xl font-black text-sky-300">{Math.round(detailDaily.windSpeedMax)} <span className="text-xs text-slate-500">km/h</span></div>
                  <div className="text-[10px] text-slate-500">Raffiche: {Math.round(detailDaily.windGustsMax ?? detailDaily.windSpeedMax * 1.3)} km/h</div>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-1">
                    <CloudRain className="w-4 h-4 text-rose-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Pioggia</span>
                  </div>
                  <div className="text-xl font-black text-rose-300">{detailDaily.precipitationSum > 0 ? detailDaily.precipitationSum.toFixed(1) : "0"} <span className="text-xs text-slate-500">mm</span></div>
                  <div className="text-[10px] text-slate-500">Prob: {detailDaily.precipitationProbabilityMax ?? 0}%</div>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">UV Max</span>
                  </div>
                  <div className={`text-xl font-black ${detailDaily.uvIndexMax > 6 ? "text-rose-400" : "text-amber-300"}`}>{Math.round(detailDaily.uvIndexMax ?? 0)}</div>
                  <div className="text-[10px] text-slate-500">
                    {detailDaily.uvIndexMax > 8 ? "🔴 Estremo" : detailDaily.uvIndexMax > 6 ? "🟠 Molto alto" : "🟢 Moderato"}
                  </div>
                </div>
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                  <div className="flex items-center gap-2 mb-1">
                    <ThermoIcon className="w-4 h-4 text-violet-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">0°C quota</span>
                  </div>
                  <div className="text-xl font-black text-violet-300">{detailDaily.freezingLevel?.toLocaleString() ?? "—"} <span className="text-xs text-slate-500">m</span></div>
                  <div className="text-[10px] text-slate-500">Confine neve/pioggia</div>
                </div>
              </div>

              {/* Trend */}
              {detailDaily.trend && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Tendenza:</span>
                  <span className={`font-black ${
                    detailDaily.trend === "↑" ? "text-orange-400" :
                    detailDaily.trend === "↓" ? "text-sky-400" : "text-slate-400"
                  }`}>
                    {detailDaily.trend === "↑" ? "↑ Riscaldamento" :
                     detailDaily.trend === "↓" ? "↓ Raffreddamento" : "→ Stabile"}
                  </span>
                </div>
              )}

              {/* Pilot tip */}
              <div className={`rounded-xl p-3 text-xs font-semibold ${
                detailDaily.precipitationSum > 1 ? "bg-rose-900/30 border border-rose-500/30 text-rose-300" :
                detailDaily.windSpeedMax > 25 ? "bg-orange-900/30 border border-orange-500/30 text-orange-300" :
                detailDaily.uvIndexMax > 6 ? "bg-amber-900/30 border border-amber-500/30 text-amber-300" :
                "bg-emerald-900/30 border border-emerald-500/30 text-emerald-300"
              }`}>
                {detailDaily.precipitationSum > 1 ? "⚠️ Pioggia attesa — valutare bene" :
                 detailDaily.windSpeedMax > 25 ? "💨 Vento forte — solo esperti" :
                 detailDaily.windSpeedMax > 18 ? "🌬️ Vento moderato — attenzione a raffiche" :
                 detailDaily.uvIndexMax > 6 ? "☀️ UV alto — proteggersi" :
                 "✅ Condizioni favorevoli per il volo"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
