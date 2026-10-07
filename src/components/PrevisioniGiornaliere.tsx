"use client";

import { useRef, useEffect, useState } from "react";
import type { HourData } from "@/types/meteo";
import type { MeteoCurrent, MeteoDaily } from "@/services/openMeteoService";
import { ArrowUp, Cloud, Thermometer, Zap, Sun, Wind } from "lucide-react";
import AeroCard from "./AeroCard";

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

function dirToIcon(dir: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(dir / 45) % 8];
}

function getFlightRating(daily: MeteoDaily, current: HourData | MeteoCurrent | null): number {
  if (!daily) return 0;
  let score = 5;
  const wind = daily.windSpeedMax ?? null;
  if (wind !== null) {
    if (wind <= 8) score += 2;
    else if (wind <= 15) score += 1;
    else if (wind <= 25) score -= 1;
    else score -= 2;
  }
  const rain = daily.precipitationSum ?? 0;
  if (rain <= 0.2) score += 1;
  else if (rain <= 2) score -= 1;
  else score -= 2;
  const cloudCover = (current as any)?.cloudCover ?? 30;
  if (cloudCover <= 30) score += 1;
  else if (cloudCover > 70) score -= 1;
  const cape = (current as any)?.cape ?? null;
  if (cape !== null) {
    if (cape >= 200 && cape <= 1000) score += 1;
    else if (cape > 1500) score -= 1;
  }
  const uv = daily.uvIndexMax ?? null;
  if (uv !== null && uv > 8) score -= 1;
  return Math.max(1, Math.min(10, Math.round(score)));
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

function getFlightVerdict(rating: number): { label: string; color: string; bg: string; ring: string } {
  if (rating >= 8) return { label: "VOLO CONSENTITO", color: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/50" };
  if (rating >= 5) return { label: "VOLO POSSIBILE", color: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/50" };
  return { label: "VOLO SCONSIGLIATO", color: "text-red-400", bg: "bg-red-500/10", ring: "ring-red-500/50" };
}

function useAnimatedValue(target: number, duration = 1000): number {
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

export default function PrevisioniGiornaliere({
  enrichedDaily,
  dateLabels,
  currentData,
  site,
  selectedDay,
  onSelectDay,
}: PrevisioniGiornaliereProps) {
  const tabs = ["Oggi", "Domani", "Dopodomani"];

  const temp = currentData?.temperature ?? null;
  const feelsLike = (currentData as any)?.feelsLike ?? null;
  const dewPoint = (currentData as any)?.dewPoint ?? null;
  const spread = temp !== null && dewPoint !== null ? temp - dewPoint : 3;
  const windSpeed = currentData?.windSpeed ?? null;
  const windGusts = (currentData as any)?.windGusts ?? null;
  const windDir = currentData?.windDir ?? null;
  const humidity = currentData?.humidity ?? null;
  const pressure = (currentData as any)?.surfacePressure ?? null;
  const visibility = (currentData as any)?.visibility ?? null;
  const cape = (currentData as any)?.cape ?? null;
  const uvIndex = currentData?.uvIndex ?? null;

  // Thermal rate from real CAPE when available, otherwise estimate from spread
  const thermalRate = cape !== null
    ? Math.max(0.1, Math.min(3, spread * 0.15 + (cape > 0 ? cape / 5000 : 0)))
    : Math.max(0.1, Math.min(3, spread * 0.15));
  const cloudBase = site.altitude + Math.round(spread * 125);
  // Freezing level: usa dato API quando disponibile, altrimenti N/D
  const zeroCLevel = (currentData as any)?.freezingLevel ?? null;
  const topThermal = cape !== null ? Math.round(cloudBase + thermalRate * 2000) : null;

  const daily = enrichedDaily[selectedDay] ?? enrichedDaily[0];
  const flightRating = getFlightRating(daily, currentData);
  const verdict = getFlightVerdict(flightRating);

  // Animated counter for hero score
  const animatedScore = useAnimatedValue(flightRating);

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HERO — ANIMATED: barra verde luminosa in alto             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-emerald-500/40 shadow-2xl shadow-emerald-500/20">
        {/* Striscia verde luminosa in cima — animata */}
        <div
          className="h-2 bg-gradient-to-r from-emerald-400 via-emerald-300 to-sky-400"
          style={{ animation: 'shimmer 3s linear infinite', backgroundSize: '200% 100%' }}
        />

        {/* Badge animato */}
        <div className="px-6 py-4 bg-emerald-950/50 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <span className="text-4xl" style={{ animation: 'bounce 2s ease-in-out infinite' }}>🛩️</span>
            <div>
              <div className="text-[10px] font-black text-emerald-400/80 uppercase tracking-[0.3em]">
                ★ NUOVO LAYOUT — Previsioni Volo
              </div>
              <div className="text-lg font-black text-white">{site.name}</div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className={`px-4 py-1.5 rounded-full text-xs font-black ${verdict.bg} ${verdict.color} border ${verdict.ring} ring-2`}>
                {verdict.label}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* RIGA VOTO + TEMP + VENTO */}
          <div className="grid grid-cols-[auto_1fr_1fr] gap-8 items-center mb-6">
            {/* VOTO GIGANTE ANIMATO */}
            <div className="flex flex-col items-center">
              <div className="text-[120px] leading-none font-black text-emerald-400 drop-shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all duration-700">
                {animatedScore}
              </div>
              <div className="text-xl text-emerald-500/50 font-black">/ 10</div>
              <div className="mt-2 text-xs text-slate-500 font-bold uppercase tracking-widest">Voto Volo</div>
            </div>

            {/* TEMPERATURA */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50 hover:border-amber-500/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] hover:scale-[1.01]">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="font-black uppercase tracking-wider">Temperatura</span>
              </div>
              <div className="text-5xl font-black text-white">
                {temp !== null ? `${Math.round(temp)}<span className="text-2xl text-slate-500">°C</span>` : <span className="text-4xl text-slate-500">N/D</span>}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Percepita</span>
                  <span className="text-slate-300 font-bold">{feelsLike !== null ? `${Math.round(feelsLike)}°C` : "N/D"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Spread</span>
                  <span className="text-slate-300 font-bold">{temp !== null && dewPoint !== null ? `${spread.toFixed(1)}°C` : "N/D"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Punto Rugiada</span>
                  <span className="text-slate-300 font-bold">{dewPoint !== null ? `${Math.round(dewPoint)}°C` : "N/D"}</span>
                </div>
              </div>
            </div>

            {/* VENTO */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50 hover:border-sky-500/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(14,165,233,0.1)] hover:scale-[1.01]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Wind className="w-4 h-4 text-sky-400" style={{ animation: 'spin 4s linear infinite' }} />
                  <span className="font-black uppercase tracking-wider">Vento</span>
                </div>
                <div
                  className="w-8 h-8 rounded-full border-2 border-sky-500/30 flex items-center justify-center"
                  style={{ transform: windDir !== null ? `rotate(${windDir}deg)` : undefined, transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                >
                  <div className="w-0.5 h-3 bg-sky-400 rounded-full -translate-y-1" />
                </div>
              </div>
              <div className="text-5xl font-black text-white">
                {windSpeed !== null ? `${Math.round(windSpeed)}<span className="text-2xl text-slate-500"> km/h</span>` : <span className="text-4xl text-slate-500">N/D</span>}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Direzione</span>
                  <span className="text-slate-300 font-bold">{windDir !== null ? `${dirToIcon(windDir)} ${windDir}°` : "N/D"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Raffiche</span>
                  <span className="text-slate-300 font-bold">{windGusts !== null ? `${Math.round(windGusts)} km/h` : "N/D"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Esposizione</span>
                  <span className="text-slate-300 font-bold">{site.exposure}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 STATISTICHE ORIZZONTALI */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: "💧", label: "Umidità", value: humidity !== null ? `${humidity}%` : "N/D", color: humidity !== null ? "text-sky-400" : "text-slate-500", sub: humidity !== null ? "Rilevata" : "—" },
              { icon: "📊", label: "Pressione", value: pressure !== null ? `${Math.round(pressure)} hPa` : "N/D", color: pressure !== null ? "text-amber-400" : "text-slate-500", sub: pressure !== null ? "MSL" : "—" },
              { icon: "👁️", label: "Visibilità", value: visibility !== null ? `${visibility} m` : "N/D", color: visibility !== null ? "text-emerald-400" : "text-slate-500", sub: visibility !== null ? (visibility >= 10000 ? "Ottima" : visibility >= 5000 ? "Buona" : "Scadente") : "—" },
              { icon: "☀️", label: "UV", value: uvIndex !== null ? `${Math.round(uvIndex)}` : "N/D", color: uvIndex !== null ? (uvIndex > 6 ? "text-rose-400" : "text-amber-400") : "text-slate-500", sub: uvIndex !== null ? (uvIndex > 8 ? "Estremo" : uvIndex > 5 ? "Alto" : "Moderato") : "—" },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 text-center hover:border-slate-600 hover:scale-[1.03] transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] cursor-default"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="text-3xl mb-2 transition-transform duration-300 hover:scale-125">{stat.icon}</div>
                <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{stat.label}</div>
                <div className="text-[9px] text-slate-600 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* AEROCARDS — 6 parametri di volo                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-6 bg-emerald-500 rounded-full" />
          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Parametri di Volo</div>
          <span className="text-[9px] text-slate-600 ml-auto">Clicca per espandere</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <AeroCard
            icon={<ArrowUp className="w-5 h-5" />}
            title="Rateo Termico"
            value={`${thermalRate.toFixed(1)} m/s`}
            subtitle={thermalRate >= 1.5 ? "Termiche forti" : thermalRate >= 0.8 ? "Termiche discrete" : "Termiche deboli"}
            accent="purple"
            barValue={thermalRate}
            barMax={3}
            detail={<div className="text-[10px] text-slate-400">Ascendenza media</div>}
          />
          <AeroCard
            icon={<Cloud className="w-5 h-5" />}
            title="Base Cumuli"
            value={`${cloudBase.toLocaleString()} m`}
            subtitle={`+${cloudBase - site.altitude}m sopra campo`}
            accent="sky"
            barValue={cloudBase}
            barMax={4000}
            detail={<div className="text-[10px] text-slate-400">Quota inizio nubi</div>}
          />
          <AeroCard
            icon={<Thermometer className="w-5 h-5" />}
            title="Zero Termico"
            value={zeroCLevel !== null ? `${zeroCLevel.toLocaleString()} m` : "N/D"}
            subtitle={zeroCLevel !== null ? `+${zeroCLevel - site.altitude}m dal suolo` : "Dato non disponibile"}
            accent="violet"
            barValue={zeroCLevel ?? 0}
            barMax={5000}
            detail={<div className="text-[10px] text-slate-400">Confine neve/pioggia</div>}
          />
          <AeroCard
            icon={<Zap className="w-5 h-5" />}
            title="CAPE"
            value={cape !== null ? `${Math.round(cape)} J/kg` : "N/D"}
            subtitle={cape !== null ? (cape > 1000 ? "Instabilità alta" : cape > 300 ? "Moderata" : "Stabile") : "Dato non disponibile"}
            accent="amber"
            barValue={cape ?? 0}
            barMax={2000}
            detail={<div className="text-[10px] text-slate-400">Energia termica</div>}
          />
          <AeroCard
            icon={<ArrowUp className="w-5 h-5" />}
            title="Top Termica"
            value={topThermal !== null ? `${topThermal.toLocaleString()} m` : "N/D"}
            subtitle={topThermal !== null ? `+${topThermal - site.altitude}m dal suolo` : "Dato non disponibile"}
            accent="emerald"
            barValue={topThermal ?? 0}
            barMax={6000}
            detail={<div className="text-[10px] text-slate-400">Massima quota</div>}
          />
          <AeroCard
            icon={<Sun className="w-5 h-5" />}
            title="UV Indice"
            value={`${Math.round(uvIndex)}`}
            subtitle={uvIndex > 8 ? "Estremo" : uvIndex > 6 ? "Molto alto" : uvIndex > 3 ? "Alto" : "Basso"}
            accent="rose"
            barValue={uvIndex}
            barMax={11}
            detail={<div className="text-[10px] text-slate-400">Protezione solare</div>}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PREVISIONI 3 GIORNI                                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-6 bg-emerald-500 rounded-full" />
          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Previsioni 3 Giorni</div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {tabs.map((tabName, idx) => {
            const d = enrichedDaily[idx];
            const isActive = selectedDay === idx;
            const label = dateLabels[idx] || tabName;
            const isRainy = d && d.precipitationSum > 0.5;
            const rating = getFlightRating(d, currentData);

            return (
              <button
                key={idx}
                onClick={() => onSelectDay(idx)}
                className={`
                  relative rounded-2xl p-5 text-left transition-all duration-300
                  ${isActive
                    ? 'bg-emerald-950/60 border-2 border-emerald-400 shadow-xl shadow-emerald-900/40 scale-[1.03]'
                    : isRainy
                    ? 'bg-rose-950/20 border border-rose-500/30 hover:border-rose-500/50 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                    : 'bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-4xl transition-transform duration-300 hover:scale-110`}>{d ? getWeatherEmoji(d.weatherCode) : "☀️"}</span>
                  <div className={`text-sm font-black px-3 py-1 rounded-full transition-all duration-300 ${isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700/50 text-slate-400'}`}>
                    {rating}/10
                  </div>
                </div>
                <div className="font-black text-white text-lg">{tabName}</div>
                <div className="text-[10px] text-slate-500 mb-3">{label}</div>
                {d && (
                  <>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-xl font-black text-amber-300">{d.temperatureMax !== null ? `${Math.round(d.temperatureMax)}°` : "N/D"}</span>
                      <span className="text-xs text-slate-600">/</span>
                      <span className="text-lg font-bold text-sky-300">{d.temperatureMin !== null ? `${Math.round(d.temperatureMin)}°` : "N/D"}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mb-1">
                      {d.precipitationSum > 0.5 ? '🌧️ Pioggia attesa' : '☀️ Sereno'}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      Vento max: {d.windSpeedMax !== null ? `${Math.round(d.windSpeedMax)} km/h` : "N/D"}
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
