"use client";

import React from "react";
import {
  Thermometer,
  Wind,
  Cloud,
  Droplets,
  Gauge,
  ArrowUp,
  CloudSun,
  CloudRain,
  Sun,
  Eye,
  AlertTriangle,
  Compass,
  TrendingUp,
} from "lucide-react";

interface MeteoTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number };
  thermalDelta: number;
  stabilityIndex: { label: string; color: string };
}

export default function MeteoTab({
  currentData,
  dayData,
  site,
  thermalDelta,
  stabilityIndex,
}: MeteoTabProps) {
  if (!currentData) {
    return (
      <div className="flex items-center justify-center py-16">
        <CloudSun className="w-12 h-12 text-slate-600 mb-3" />
        <p className="text-slate-500 text-sm">Nessun dato meteo disponibile</p>
      </div>
    );
  }

  const {
    temperature: temp,
    humidity,
    pressure,
    cloudCover,
    windSpeed,
    windDir,
    windGust,
    precipitation,
    dewPoint,
    weatherCode,
    isDay,
    temp80m,
    temp120m,
  } = currentData;

  const spread = temp - (dewPoint ?? (temp - (100 - (humidity ?? 50)) / 5));
  const cloudBase = Math.max(200, Math.min(3000, Math.round(spread * 125)));

  const gradienteReale = temp80m != null
    ? ((temp - temp80m) / 78) * 100
    : temp120m != null
    ? ((temp - temp120m) / 118) * 100
    : 0.98;

  const forzaTermica = Math.min(10, Math.max(0,
    (gradienteReale > 1.2 ? 3 : gradienteReale > 0.98 ? 2 : gradienteReale > 0.7 ? 1 : 0) +
    (windSpeed >= 5 && windSpeed <= 15 ? 2 : windSpeed >= 3 && windSpeed < 5 ? 1 : 0) +
    (cloudCover >= 15 && cloudCover <= 45 ? 2 : cloudCover >= 5 && cloudCover < 15 ? 1 : 0) +
    (humidity >= 30 && humidity <= 50 ? 1.5 : humidity > 50 && humidity <= 65 ? 1 : 0)
  ));

  const rateoTermico = Math.round((forzaTermica / 10) * 4 * 10) / 10;
  const topTermico = Math.min(5000, cloudBase + Math.round(forzaTermica * 250));

  const ventoDecollo = windSpeed;
  const raffiche = windGust ?? Math.round(windSpeed * 1.4);

  // ===== ZERO TERMICO =====
  // Formula: 0°C quota = temperatura / gradiente adiabatico secco (0.98°C/100m)
  // + altitudine sito + 2 * temperatura per compensazione
  const zeroTermico = Math.max(0, Math.round(site.alt + (temp / 0.0098) + 200));

  const turbolenza =
    raffiche > 30 ? "Forte" :
    raffiche > 22 ? "Moderata" :
    raffiche > 14 ? "Leggera" : "Assente";

  const condizioniVolo =
    ventoDecollo < 5 ? "Troppo calma" :
    ventoDecollo > 30 ? "Vento forte" :
    precipitation > 0.5 ? "Pioggia" :
    weatherCode >= 95 ? "Temporale" :
    forzaTermica >= 5 ? "Ottime" :
    forzaTermica >= 3 ? "Buone" :
    forzaTermica >= 1 ? "Deboli" :
    "Assenti";

  const dirCardinali = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const dirLabel = dirCardinali[Math.round((windDir ?? 0) / 45) % 8];
  const arrow = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round((windDir ?? 0) / 45) % 8];

  const voloEmoji =
    condizioniVolo === "Ottime" ? "🪂🔥" :
    condizioniVolo === "Buone" ? "🪂" :
    condizioniVolo === "Deboli" ? "🌤️" :
    condizioniVolo === "Troppo calma" ? "🌀" :
    condizioniVolo === "Pioggia" || condizioniVolo === "Temporale" ? "⛈️" :
    condizioniVolo === "Vento forte" ? "💨" : "❄️";

  return (
    <div className="space-y-6">
      {/* ===== BANNER CONDIZIONI VOLO ===== */}
      <div className={`rounded-3xl p-6 border-4 text-center ${
        condizioniVolo === "Ottime" ? "bg-emerald-900/40 border-emerald-400" :
        condizioniVolo === "Buone" ? "bg-green-900/40 border-green-400" :
        condizioniVolo === "Deboli" ? "bg-amber-900/40 border-amber-400" :
        condizioniVolo === "Troppo calma" ? "bg-slate-800/60 border-slate-400" :
        "bg-red-900/40 border-red-400"
      }`}>
        <div className="text-5xl mb-3">{voloEmoji}</div>
        <div className="text-3xl font-black text-white mb-1">{condizioniVolo}</div>
        <div className="text-base text-slate-300">
          {weatherCode === 0 ? "Cielo sereno" :
           weatherCode <= 2 ? "Poco nuvoloso" :
           weatherCode <= 3 ? "Nuvoloso" :
           weatherCode >= 95 ? "Temporale" :
           "Coperto"} · Vento {ventoDecollo} km/h da {dirLabel}
        </div>
        {/* ===== ZERO TERMICO ===== */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <span className="text-slate-400 text-sm">Zero termico</span>
          <div className="text-2xl font-black text-white tabular-nums mt-0.5">
            {zeroTermico} <span className="text-base text-slate-400 font-normal">m</span>
          </div>
        </div>
      </div>

      {/* ===== RIGA VENTO DECOLLO / ATTERRAGGIO ===== */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/60 border-2 border-slate-600 rounded-2xl p-5 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">Vento decollo</div>
          <div className="text-4xl font-black text-white flex items-center justify-center gap-2 mb-1">
            {arrow} {Math.round(ventoDecollo)}
            <span className="text-base text-slate-400 font-normal">km/h</span>
          </div>
          <div className="text-sm text-slate-400">{dirLabel} ({Math.round(windDir ?? 0)}°)</div>
        </div>
        <div className="bg-slate-800/60 border-2 border-slate-600 rounded-2xl p-5 text-center">
          <div className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">Vento atterraggio</div>
          <div className="text-4xl font-black text-white flex items-center justify-center gap-2 mb-1">
            {Math.round(ventoDecollo * 0.7)}
            <span className="text-base text-slate-400 font-normal">km/h</span>
          </div>
          <div className="text-sm text-slate-400">Raffiche {raffiche} km/h</div>
        </div>
      </div>

      {/* ===== TERMICHE ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <BigCard icon={<ArrowUp className="w-8 h-8 text-green-400" />} label="Base nuvole" value={`${cloudBase}`} unit="m" sub="LCL" />
        <BigCard icon={<ArrowUp className="w-8 h-8 text-red-400" />} label="Top termiche" value={`${topTermico}`} unit="m" sub={`+${topTermico - cloudBase}m`} />
        <BigCard icon={<TrendingUp className="w-8 h-8 text-orange-400" />} label="Forza termica" value={`${forzaTermica.toFixed(0)}`} unit="/10" sub={`${rateoTermico} m/s`} />
        <BigCard icon={<AlertTriangle className="w-8 h-8 text-amber-400" />} label="Turbolenza" value={turbolenza} unit="" sub={turbolenza === "Forte" ? "⚠️ Attenzione" : turbolenza === "Moderata" ? "🟡 Gestibile" : turbolenza === "Leggera" ? "🟢 Ok" : "✅ Nessuna"} />
      </div>

      {/* ===== DETTAGLIO ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SmallCard icon={<Droplets className="w-6 h-6 text-sky-400" />} label="Umidità" value={`${humidity ?? "--"}%`} sub={dewPoint ? `Rugiada ${Math.round(dewPoint)}°C` : undefined} />
        <SmallCard icon={<Gauge className="w-6 h-6 text-emerald-400" />} label="Pressione" value={`${Math.round(pressure ?? 1013)} hPa`} sub={pressure > 1020 ? "Alta" : pressure < 1010 ? "Bassa" : "Normale"} />
        <SmallCard icon={<Cloud className="w-6 h-6 text-slate-400" />} label="Nuvolosità" value={`${cloudCover ?? "--"}%`} sub={cloudCover < 20 ? "Sereno" : cloudCover < 50 ? "Poco" : cloudCover < 80 ? "Nuvoloso" : "Coperto"} />
        <SmallCard icon={<Sun className="w-6 h-6 text-yellow-400" />} label="Stabilità" value={stabilityIndex?.label ?? "--"} sub="Atmosfera" />
        <SmallCard icon={<TrendingUp className="w-6 h-6 text-purple-400" />} label="Gradiente" value={`${gradienteReale.toFixed(1)}°`} sub={gradienteReale > 1.2 ? "Instabile" : gradienteReale > 0.98 ? "Neutro" : "Stabile"} />
        <SmallCard icon={<Eye className="w-6 h-6 text-cyan-400" />} label="Delta T" value={`${Math.round(thermalDelta ?? 0)}°C`} sub={thermalDelta > 10 ? "Buona" : thermalDelta > 6 ? "Moderata" : "Bassa"} />
      </div>
    </div>
  );
}

// ===== CARD GRANDE (termiche) =====
function BigCard({ icon, label, value, unit, sub }: { icon: React.ReactNode; label: string; value: string; unit: string; sub?: string }) {
  return (
    <div className="bg-slate-800/60 border-2 border-slate-600 rounded-2xl p-5 text-center">
      <div className="flex justify-center mb-3">{icon}</div>
      <div className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">{label}</div>
      <div className="text-4xl font-black text-white tabular-nums mb-1">
        {value}
        {unit && <span className="text-base text-slate-400 font-normal ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-sm text-slate-400">{sub}</div>}
    </div>
  );
}

// ===== CARD PICCOLA (dettaglio) =====
function SmallCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800/50 border-2 border-slate-600 rounded-2xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-bold">{label}</div>
      <div className="text-2xl font-black text-white tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}