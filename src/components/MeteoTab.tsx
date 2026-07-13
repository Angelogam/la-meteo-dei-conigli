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

  // ===== CALCOLI PER VOLO LIBERO =====
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
  const ventoAtterraggio = Math.round(windSpeed * 0.7);
  const raffiche = windGust ?? Math.round(windSpeed * 1.4);

  const turbolenza =
    raffiche > 30 ? "Forte ⚠️" :
    raffiche > 22 ? "Moderata 🟡" :
    raffiche > 14 ? "Leggera 🟢" : "Assente ✅";

  const condizioniVolo =
    ventoDecollo < 5 ? "Troppo calma 🌀" :
    ventoDecollo > 30 ? "Vento forte ❌" :
    precipitation > 0.5 ? "Pioggia 🌧️" :
    weatherCode >= 95 ? "Temporale ⛈️" :
    forzaTermica >= 5 ? "Ottime 🪂🔥" :
    forzaTermica >= 3 ? "Buone 👍" :
    forzaTermica >= 1 ? "Deboli 👎" :
    "Assenti ❄️";

  const dirCardinali = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const dirLabel = dirCardinali[Math.round((windDir ?? 0) / 45) % 8];
  const arrow = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round((windDir ?? 0) / 45) % 8];

  return (
    <div className="space-y-4">
      {/* BANNER CONDIZIONI VOLO */}
      <div className={`rounded-2xl p-4 border-2 ${
        condizioniVolo.includes("Ottime") ? "bg-emerald-900/30 border-emerald-500/50" :
        condizioniVolo.includes("Buone") ? "bg-green-900/30 border-green-500/40" :
        condizioniVolo.includes("Deboli") ? "bg-amber-900/30 border-amber-500/40" :
        condizioniVolo.includes("assente") || condizioniVolo.includes("calma") ? "bg-slate-800/40 border-slate-500/40" :
        "bg-red-900/30 border-red-500/50"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-3xl bg-slate-900/50 border border-slate-700/50">
              {condizioniVolo.includes("Ottime") || condizioniVolo.includes("Buone") ? "🪂" :
               condizioniVolo.includes("Deboli") ? "🌤️" :
               condizioniVolo.includes("calma") ? "🌀" :
               condizioniVolo.includes("pioggia") || condizioniVolo.includes("Temporale") ? "⛈️" :
               condizioniVolo.includes("forte") ? "💨" : "❄️"}
            </div>
            <div>
              <div className="text-lg font-black text-white">Condizioni: {condizioniVolo}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {weatherCode === 0 ? "Cielo sereno" :
                 weatherCode <= 2 ? "Poco nuvoloso" :
                 weatherCode <= 3 ? "Nuvoloso" :
                 weatherCode >= 95 ? "Temporale" :
                 "Coperto"} · 
                Vento {ventoDecollo} km/h da {dirLabel}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-white tabular-nums">{Math.round(temp)}°</div>
            <div className="text-[10px] text-slate-500">temperatura</div>
          </div>
        </div>
      </div>

      {/* RIGA VELOCE — decollo + atterraggio */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Vento decollo</div>
          <div className="text-2xl font-black text-white tabular-nums flex items-center justify-center gap-1">
            {arrow} {Math.round(ventoDecollo)}
            <span className="text-xs text-slate-500 font-normal">km/h</span>
          </div>
          <div className="text-[10px] text-slate-500">{dirLabel} ({Math.round(windDir ?? 0)}°)</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 text-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Vento atterraggio</div>
          <div className="text-2xl font-black text-white tabular-nums">{ventoatterraggio}<span className="text-xs text-slate-500 font-normal ml-0.5">km/h</span></div>
          <div className="text-[10px] text-slate-500">Raffiche {raffiche} km/h</div>
        </div>
      </div>

      {/* RIGA TERMICHE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MiniCard icon={<ArrowUp className="w-4 h-4 text-green-400" />} label="Base nuvole" value={`${cloudBase} m`} sub="LCL" />
        <MiniCard icon={<ArrowUp className="w-4 h-4 text-red-400" />} label="Top termiche" value={`${topTermico} m`} sub={`+${topTermico - cloudBase}m salita`} />
        <MiniCard icon={<TrendingUp className="w-4 h-4 text-orange-400" />} label="Forza termica" value={`${forzaTermica.toFixed(1)}/10`} sub={`${rateoTermico} m/s`} />
        <MiniCard icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} label="Turbolenza" value={turbolenza.split(" ")[0]} sub={turbolenza.includes("⚠️") ? "Attenzione" : turbolenza.includes("🟡") ? "Gestibile" : "Tranquillo"} />
      </div>

      {/* GRIGLIA METRICHE DETTAGLIO */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <DetailCard icon={<Droplets className="w-3.5 h-3.5 text-sky-400" />} label="Umidità" value={`${humidity ?? "--"}%`} sub={dewPoint ? `Rugiada ${Math.round(dewPoint)}°C` : undefined} />
        <DetailCard icon={<Gauge className="w-3.5 h-3.5 text-emerald-400" />} label="Pressione" value={`${Math.round(pressure ?? 1013)} hPa`} sub={pressure > 1020 ? "Alta · bel tempo" : pressure < 1010 ? "Bassa · instabile" : "Normale"} />
        <DetailCard icon={<Cloud className="w-3.5 h-3.5 text-slate-400" />} label="Nuvolosità" value={`${cloudCover ?? "--"}%`} sub={cloudCover < 20 ? "Sereno" : cloudCover < 50 ? "Poco nuvoloso" : cloudCover < 80 ? "Nuvoloso" : "Molto nuvoloso"} />
        <DetailCard icon={<Sun className="w-3.5 h-3.5 text-yellow-400" />} label="Stabilità" value={stabilityIndex?.label ?? "--"} sub={stabilityIndex?.color ? "Atmosfera" : undefined} />
        <DetailCard icon={<TrendingUp className="w-3.5 h-3.5 text-purple-400" />} label="Gradiente" value={`${gradienteReale.toFixed(2)}°C/100m`} sub={gradienteReale > 1.2 ? "Instabile" : gradienteReale > 0.98 ? "Neutro" : "Stabile"} />
        <DetailCard icon={<Eye className="w-3.5 h-3.5 text-cyan-400" />} label="Delta T" value={`${Math.round(thermalDelta ?? 0)}°C`} sub={thermalDelta > 10 ? "Buona escursione" : thermalDelta > 6 ? "Moderata" : "Bassa"} />
      </div>
    </div>
  );
}

// ===== CARD PICCOLA =====
function MiniCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-base font-black text-white tabular-nums">{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ===== CARD DETTAGLIO =====
function DetailCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-bold text-white">{value}</div>
      {sub && <div className="text-[9px] text-slate-500 mt-0.25">{sub}</div>}
    </div>
  );
}