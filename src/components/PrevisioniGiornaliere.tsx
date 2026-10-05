"use client";

import { useState } from "react";
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
  const wind = daily.windSpeedMax ?? 10;
  if (wind <= 8) score += 2;
  else if (wind <= 15) score += 1;
  else if (wind <= 25) score -= 1;
  else score -= 2;
  const rain = daily.precipitationSum ?? 0;
  if (rain <= 0.2) score += 1;
  else if (rain <= 2) score -= 1;
  else score -= 2;
  const cloudCover = (current as any)?.cloudCover ?? 30;
  if (cloudCover <= 30) score += 1;
  else if (cloudCover > 70) score -= 1;
  const cape = (current as any)?.cape ?? 0;
  if (cape >= 200 && cape <= 1000) score += 1;
  else if (cape > 1500) score -= 1;
  const uv = daily.uvIndexMax ?? 5;
  if (uv > 8) score -= 1;
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

export default function PrevisioniGiornaliere({
  enrichedDaily,
  dateLabels,
  currentData,
  site,
  selectedDay,
  onSelectDay,
}: PrevisioniGiornaliereProps) {
  const tabs = ["Oggi", "Domani", "Dopodomani"];

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
  const uvIndex = currentData?.uvIndex ?? 5;

  const thermalRate = Math.max(0.1, Math.min(3, spread * 0.15 + (cape > 0 ? cape / 5000 : 0)));
  const cloudBase = site.altitude + Math.round(spread * 125);
  const zeroCLevel = (currentData as any)?.freezingLevel ?? Math.round(5500 - temp * 155);
  const topThermal = Math.round(cloudBase + thermalRate * 2000);

  const daily = enrichedDaily[selectedDay] ?? enrichedDaily[0];
  const flightRating = getFlightRating(daily, currentData);
  const verdict = getFlightVerdict(flightRating);

  const windLevels = [
    { label: "Suolo", speed: windSpeed, dir: windDir, alt: "10m" },
    { label: "80m", speed: windSpeed * 1.1, dir: windDir + 10, alt: "80m" },
    { label: "120m", speed: windSpeed * 1.2, dir: windDir + 20, alt: "120m" },
    { label: "180m", speed: windSpeed * 1.3, dir: windDir + 30, alt: "180m" },
  ];

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HERO — REDSIGN TOTALE: barra verde luminosa in alto       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-emerald-500/40 shadow-2xl shadow-emerald-500/20">
        {/* Striscia verde luminosa in cima */}
        <div className="h-2 bg-gradient-to-r from-emerald-400 via-emerald-300 to-sky-400" />
        
        {/* Badge animato */}
        <div className="px-6 py-4 bg-emerald-950/50 border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🛩️</span>
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
            {/* VOTO GIGANTE */}
            <div className="flex flex-col items-center">
              <div className="text-[120px] leading-none font-black text-emerald-400 drop-shadow-[0_0_40px_rgba(16,185,129,0.6)]">
                {flightRating}
              </div>
              <div className="text-xl text-emerald-500/50 font-black">/ 10</div>
              <div className="mt-2 text-xs text-slate-500 font-bold uppercase tracking-widest">Voto Volo</div>
            </div>

            {/* TEMPERATURA */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="font-black uppercase tracking-wider">Temperatura</span>
              </div>
              <div className="text-5xl font-black text-white">
                {Math.round(temp)}<span className="text-2xl text-slate-500">°C</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Percepita</span>
                  <span className="text-slate-300 font-bold">{Math.round(feelsLike)}°C</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Spread</span>
                  <span className="text-slate-300 font-bold">{spread.toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Punto Rugiada</span>
                  <span className="text-slate-300 font-bold">{Math.round(dewPoint)}°C</span>
                </div>
              </div>
            </div>

            {/* VENTO */}
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <Wind className="w-4 h-4 text-sky-400" />
                <span className="font-black uppercase tracking-wider">Vento</span>
              </div>
              <div className="text-5xl font-black text-white">
                {Math.round(windSpeed)}<span className="text-2xl text-slate-500"> km/h</span>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Direzione</span>
                  <span className="text-slate-300 font-bold">{dirToIcon(windDir)} {windDir}°</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Raffiche</span>
                  <span className="text-slate-300 font-bold">{Math.round(windGusts)} km/h</span>
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
              { icon: "💧", label: "Umidità", value: `${humidity}%`, color: "text-sky-400", sub: "Rilevata" },
              { icon: "📊", label: "Pressione", value: `${Math.round(pressure)}`, color: "text-amber-400", sub: "hPa" },
              { icon: "👁️", label: "Visibilità", value: `${visibility >= 10 ? "10+" : visibility}`, color: "text-emerald-400", sub: visibility >= 10 ? "Ottima" : "Buona" },
              { icon: "☀️", label: "UV", value: `${Math.round(uvIndex)}`, color: uvIndex > 6 ? "text-rose-400" : "text-amber-400", sub: uvIndex > 8 ? "Estremo" : uvIndex > 5 ? "Alto" : "Moderato" },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 text-center hover:border-slate-600 transition-colors">
                <div className="text-3xl mb-2">{stat.icon}</div>
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
            value={`${zeroCLevel.toLocaleString()} m`}
            subtitle={`+${zeroCLevel - site.altitude}m dal suolo`}
            accent="violet"
            barValue={zeroCLevel}
            barMax={5000}
            detail={<div className="text-[10px] text-slate-400">Confine neve/pioggia</div>}
          />
          <AeroCard
            icon={<Zap className="w-5 h-5" />}
            title="CAPE"
            value={`${Math.round(cape)} J/kg`}
            subtitle={cape > 1000 ? "Instabilità alta" : cape > 300 ? "Moderata" : "Stabile"}
            accent="amber"
            barValue={cape}
            barMax={2000}
            detail={<div className="text-[10px] text-slate-400">Energia termica</div>}
          />
          <AeroCard
            icon={<ArrowUp className="w-5 h-5" />}
            title="Top Termica"
            value={`${topThermal.toLocaleString()} m`}
            subtitle={`+${topThermal - site.altitude}m dal suolo`}
            accent="emerald"
            barValue={topThermal}
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
      {/* PROFILO VENTO VERTICALE                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-slate-900 to-sky-950/30 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-sky-500 rounded-full" />
            <div className="text-sm font-black text-white">Profilo Vento Verticale</div>
          </div>
          <div className="text-[10px] text-sky-400 font-bold">{dirToIcon(windDir)} {windDir}°</div>
        </div>
        
        <div className="space-y-3">
          {windLevels.map((level) => (
            <div key={level.label} className="flex items-center gap-4">
              <div className="w-16 text-xs font-bold text-slate-400">{level.label}</div>
              <div className="flex-1">
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${level.speed > 25 ? 'bg-rose-500' : level.speed > 15 ? 'bg-amber-500' : 'bg-sky-500'}`}
                    style={{ width: `${Math.min(100, level.speed * 2.5)}%` }}
                  />
                </div>
              </div>
              <div className="w-24 text-right">
                <span className="text-sm font-black text-white">{Math.round(level.speed)}</span>
                <span className="text-xs text-slate-500 ml-1">km/h</span>
              </div>
              <div className="w-10 text-xs text-slate-500">{dirToIcon(level.dir)}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-between text-[9px] text-slate-600">
          <span>0 km/h</span>
          <span>30 km/h</span>
          <span>60 km/h</span>
          <span>100+ km/h</span>
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
                    ? 'bg-rose-950/20 border border-rose-500/30 hover:border-rose-500/50'
                    : 'bg-slate-800/40 border border-slate-700/50 hover:border-slate-600'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-4xl">{d ? getWeatherEmoji(d.weatherCode) : "☀️"}</span>
                  <div className={`text-sm font-black px-3 py-1 rounded-full ${isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-700/50 text-slate-400'}`}>
                    {rating}/10
                  </div>
                </div>
                <div className="font-black text-white text-lg">{tabName}</div>
                <div className="text-[10px] text-slate-500 mb-3">{label}</div>
                {d && (
                  <>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-xl font-black text-amber-300">{Math.round(d.temperatureMax)}°</span>
                      <span className="text-xs text-slate-600">/</span>
                      <span className="text-lg font-bold text-sky-300">{Math.round(d.temperatureMin)}°</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mb-1">
                      {d.precipitationSum > 0.5 ? '🌧️ Pioggia attesa' : '☀️ Sereno'}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      Vento max: {Math.round(d.windSpeedMax)} km/h
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
