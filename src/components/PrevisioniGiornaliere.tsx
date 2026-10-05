"use client";

import { useState } from "react";
import type { HourData } from "@/types/meteo";
import type { MeteoCurrent, MeteoDaily } from "@/services/openMeteoService";
import {
  Sun, Wind, Thermometer, CloudRain, Droplets,
  ArrowUp, Cloud, Zap, Eye, Gauge,
  ChevronDown, Sparkles
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

// ─── Utility Functions ──────────────────────────────────────
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

// ─── Expandable Card Component ──────────────────────────────
function AeroCard({
  icon,
  title,
  value,
  subtitle,
  detail,
  accent = "sky",
  barValue,
  barMax,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  detail?: React.ReactNode;
  accent?: "sky" | "emerald" | "amber" | "purple" | "rose" | "violet";
  barValue?: number;
  barMax?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  
  const accentColors = {
    sky: { icon: "bg-sky-500/20 text-sky-400", bar: "bg-sky-500", border: "border-sky-500/20" },
    emerald: { icon: "bg-emerald-500/20 text-emerald-400", bar: "bg-emerald-500", border: "border-emerald-500/20" },
    amber: { icon: "bg-amber-500/20 text-amber-400", bar: "bg-amber-500", border: "border-amber-500/20" },
    purple: { icon: "bg-purple-500/20 text-purple-400", bar: "bg-purple-500", border: "border-purple-500/20" },
    rose: { icon: "bg-rose-500/20 text-rose-400", bar: "bg-rose-500", border: "border-rose-500/20" },
    violet: { icon: "bg-violet-500/20 text-violet-400", bar: "bg-violet-500", border: "border-violet-500/20" },
  };
  
  const c = accentColors[accent];

  return (
    <div 
      onClick={() => setExpanded(!expanded)}
      className={`
        relative rounded-2xl border bg-slate-900/60 backdrop-blur-sm 
        overflow-hidden transition-all duration-300 cursor-pointer
        hover:border-white/20 hover:scale-[1.02] hover:bg-slate-800/60
        ${expanded ? `ring-2 ${c.border.replace('border', 'ring')} bg-slate-800/70` : ''}
      `}
    >
      <div className="p-4">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        
        {/* Title */}
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</div>
        
        {/* Value */}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-white">{value}</span>
        </div>
        
        {/* Subtitle */}
        {subtitle && (
          <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
        )}
        
        {/* Progress Bar */}
        {barValue != null && barMax != null && (
          <div className="mt-3">
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                style={{ width: `${Math.min(100, (barValue / barMax) * 100)}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Expanded Detail */}
        {expanded && detail && (
          <div className="mt-3 pt-3 border-t border-white/10 animate-in slide-in-from-top-2">
            {detail}
          </div>
        )}
        
        {/* Expand indicator */}
        <div className="mt-2 flex justify-center">
          <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────
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

  // Core data
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
  const uvIndex = currentData?.uvIndex ?? 5;

  // Derived values
  const thermalRate = Math.max(0.1, Math.min(3, spread * 0.15 + (cape > 0 ? cape / 5000 : 0)));
  const cloudBase = site.altitude + Math.round(spread * 125);
  const zeroCLevel = (currentData as any)?.freezingLevel ?? Math.round(5500 - temp * 155);
  const topThermal = Math.round(cloudBase + thermalRate * 2000);

  // Flight rating
  const daily = enrichedDaily[selectedDay] ?? enrichedDaily[0];
  const flightRating = getFlightRating(daily, currentData);
  const verdict = getFlightVerdict(flightRating);

  // Wind profile at different altitudes
  const windLevels = [
    { label: "Suolo", speed: windSpeed, dir: windDir, alt: "10m" },
    { label: "80m", speed: windSpeed * 1.1, dir: windDir + 10, alt: "80m" },
    { label: "120m", speed: windSpeed * 1.2, dir: windDir + 20, alt: "120m" },
    { label: "180m", speed: windSpeed * 1.3, dir: windDir + 30, alt: "180m" },
  ];

  return (
    <div className="space-y-6">
      {/* ══════════ HERO SECTION: VOTO VOLO + INFO PRINCIPALI ══════════ */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/50">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400/70 uppercase tracking-[0.2em] mb-1">
                <Sparkles className="w-3 h-3" />
                Condizioni Volo
              </div>
              <div className="text-lg font-black text-white">{site.name}</div>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-black ${verdict.bg} ${verdict.color} border ${verdict.ring} ring-2`}>
              {verdict.label}
            </div>
          </div>
          
          {/* Main Rating Display */}
          <div className="flex items-center gap-8 mb-6">
            <div className="flex items-center gap-3">
              <div className="text-8xl font-black text-emerald-400 drop-shadow-lg">
                {flightRating}
              </div>
              <div className="text-lg text-emerald-500/60 font-bold">/10</div>
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-6">
              {/* Temperature */}
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <Sun className="w-3 h-3 text-amber-400" />
                  Temperatura
                </div>
                <div className="text-3xl font-black text-white">{Math.round(temp)}°<span className="text-base text-slate-500">C</span></div>
                <div className="text-xs text-slate-400 mt-1">Percepita {Math.round(feelsLike)}°C</div>
                <div className="text-xs text-slate-400">Spread {spread.toFixed(1)}°C</div>
              </div>
              
              {/* Wind */}
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <Wind className="w-3 h-3 text-sky-400" />
                  Vento
                </div>
                <div className="text-3xl font-black text-white">{Math.round(windSpeed)}<span className="text-base text-slate-500"> km/h</span></div>
                <div className="text-xs text-slate-400 mt-1">{dirToIcon(windDir)} {windDir}°</div>
                <div className="text-xs text-slate-400">Raffiche {Math.round(windGusts)} km/h</div>
              </div>
            </div>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: <Droplets className="w-4 h-4" />, label: "Umidità", value: `${humidity}%`, color: "text-sky-400", sub: "Aria umida" },
              { icon: <Gauge className="w-4 h-4" />, label: "Pressione", value: `${Math.round(pressure)}`, color: "text-amber-400", sub: "hPa" },
              { icon: <Eye className="w-4 h-4" />, label: "Visibilità", value: `${visibility >= 10 ? "10+" : visibility}`, color: "text-emerald-400", sub: visibility >= 10 ? "km" : "km" },
              { icon: <Sun className="w-4 h-4" />, label: "UV", value: `${Math.round(uvIndex)}`, color: uvIndex > 6 ? "text-rose-400" : "text-amber-400", sub: uvIndex > 8 ? "Estremo" : uvIndex > 6 ? "Alto" : "Moderato" },
            ].map((stat, i) => (
              <div key={i} className="rounded-xl bg-slate-800/50 border border-slate-700/50 p-3 text-center">
                <div className={`flex justify-center mb-2 ${stat.color}`}>{stat.icon}</div>
                <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-slate-500">{stat.label}</div>
                <div className="text-[9px] text-slate-600 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ INTERACTIVE FLOW PARAMS ══════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Parametri di Volo</div>
          <span className="text-[9px] text-slate-600">Clicca per espandere</span>
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
            detail={
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400">Ascendenza media in termiche</div>
                <div className="flex gap-1 text-[9px]">
                  <span className={thermalRate >= 1.5 ? "text-emerald-400" : "text-slate-500"}>✓ Strong</span>
                  <span className={thermalRate >= 0.8 ? "text-amber-400" : "text-slate-500"}>✓ Moderate</span>
                  <span className={thermalRate < 0.8 ? "text-rose-400" : "text-slate-500"}>✗ Weak</span>
                </div>
              </div>
            }
          />
          <AeroCard
            icon={<Cloud className="w-5 h-5" />}
            title="Base Cumuli"
            value={`${cloudBase.toLocaleString()} m`}
            subtitle={`+${cloudBase - site.altitude}m sopra campo`}
            accent="sky"
            barValue={cloudBase}
            barMax={4000}
            detail={
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400">Quota inizio nubi cumuliformi</div>
                <div className="text-[9px] text-sky-400">{cloudBase - site.altitude > 500 ? "✓ Buona quota" : "⚠️ Bassa quota"}</div>
              </div>
            }
          />
          <AeroCard
            icon={<Thermometer className="w-5 h-5" />}
            title="Zero Termico"
            value={`${zeroCLevel.toLocaleString()} m`}
            subtitle={`+${zeroCLevel - site.altitude}m dal suolo`}
            accent="violet"
            barValue={zeroCLevel}
            barMax={5000}
            detail={
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400">Confine neve/pioggia</div>
                <div className="text-[9px] text-violet-400">{zeroCLevel < 2000 ? "⚠️ Neve probabile" : "✓ Asciiutto"}</div>
              </div>
            }
          />
          <AeroCard
            icon={<Zap className="w-5 h-5" />}
            title="CAPE"
            value={`${Math.round(cape)} J/kg`}
            subtitle={cape > 1000 ? "Instabilità alta" : cape > 300 ? "Moderata" : "Stabile"}
            accent="amber"
            barValue={cape}
            barMax={2000}
            detail={
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400">Energia termica disponibile</div>
                <div className="text-[9px] text-amber-400">{cape > 500 ? "✓ Termiche attivate" : "⚠️ Energia limitata"}</div>
              </div>
            }
          />
          <AeroCard
            icon={<ArrowUp className="w-5 h-5" />}
            title="Top Termica"
            value={`${topThermal.toLocaleString()} m`}
            subtitle={`+${topThermal - site.altitude}m dal suolo`}
            accent="emerald"
            barValue={topThermal}
            barMax={6000}
            detail={
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400">Massima quota delle termiche</div>
                <div className="text-[9px] text-emerald-400">✓ {topThermal > 3000 ? "Ottima quota" : "Quota media"}</div>
              </div>
            }
          />
          <AeroCard
            icon={<Sun className="w-5 h-5" />}
            title="UV Indice"
            value={`${Math.round(uvIndex)}`}
            subtitle={uvIndex > 8 ? "Estremo" : uvIndex > 6 ? "Molto alto" : uvIndex > 3 ? "Alto" : "Basso"}
            accent="rose"
            barValue={uvIndex}
            barMax={11}
            detail={
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400">Protezione solare</div>
                <div className="text-[9px] text-rose-400">{uvIndex > 8 ? "🔴 Protect obbligatorio" : uvIndex > 6 ? "🟠 Crema solare" : "🟢 Rischio basso"}</div>
              </div>
            }
          />
        </div>
      </div>

      {/* ══════════ WIND PROFILE VISUAL ══════════ */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wind className="w-5 h-5 text-sky-400" />
            <div className="text-sm font-black text-white">Profilo Vento Verticale</div>
          </div>
          <div className="text-[10px] text-slate-500">{dirToIcon(windDir)} {windDir}°</div>
        </div>
        
        <div className="space-y-3">
          {windLevels.map((level) => (
            <div key={level.label} className="flex items-center gap-4">
              <div className="w-16 text-xs font-bold text-slate-400">{level.label}</div>
              <div className="flex-1">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${level.speed > 25 ? 'bg-rose-500' : level.speed > 15 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, level.speed * 2)}%` }}
                  />
                </div>
              </div>
              <div className="w-24 text-right">
                <span className="text-sm font-black text-white">{Math.round(level.speed)}</span>
                <span className="text-xs text-slate-500 ml-1">km/h</span>
              </div>
              <div className="w-8 text-xs text-slate-500">{dirToIcon(level.dir)}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex justify-between text-[9px] text-slate-600">
          <span>0 km/h</span>
          <span>50 km/h</span>
          <span>100+ km/h</span>
        </div>
      </div>

      {/* ══════════ 3 DAYS PREVIEW ══════════ */}
      <div>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Previsioni 3 Giorni</div>
        <div className="grid grid-cols-3 gap-3">
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
                  relative rounded-2xl p-4 text-left transition-all duration-300
                  ${isActive 
                    ? 'bg-emerald-950/40 border-2 border-emerald-400 shadow-lg shadow-emerald-900/30 scale-[1.02]' 
                    : isRainy
                    ? 'bg-rose-950/20 border border-rose-500/30 hover:border-rose-500/50'
                    : 'bg-slate-800/40 border border-slate-700/50 hover:border-slate-600'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl">{d ? getWeatherEmoji(d.weatherCode) : "☀️"}</span>
                  <div className={`text-xs font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/50 text-slate-400'}`}>
                    {rating}/10
                  </div>
                </div>
                <div className="font-black text-white">{tabName}</div>
                <div className="text-[10px] text-slate-500 mb-2">{label}</div>
                {d && (
                  <>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-lg font-black text-amber-300">{Math.round(d.temperatureMax)}°</span>
                      <span className="text-xs text-slate-600">/</span>
                      <span className="text-base font-bold text-sky-300">{Math.round(d.temperatureMin)}°</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mb-2">
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
