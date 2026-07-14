"use client";

import React from "react";
import {
  CloudSun, Droplets, Gauge, Cloud, Wind, ArrowUp, TrendingUp,
  Sun, Eye, AlertTriangle, Thermometer,
} from "lucide-react";

interface MeteoTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number };
  thermalDelta: number;
  stabilityIndex: { label: string; color: string };
}

export default function MeteoTab({ currentData, dayData, site, thermalDelta, stabilityIndex }: MeteoTabProps) {
  if (!currentData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <CloudSun className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato meteo</p>
      </div>
    );
  }

  const temp = currentData.temperature;
  const humidity = currentData.humidity;
  const pressure = currentData.pressure;
  const cloudCover = currentData.cloudCover;
  const windSpeed = currentData.windSpeed;
  const windDir = currentData.windDir;
  const windGust = currentData.windGusts;
  const precipitation = currentData.precipitation;
  const dewPoint = currentData.dewPoint ?? (temp - (100 - (humidity ?? 50)) / 5);
  const weatherCode = currentData.weatherCode;
  const temp80m = currentData.temp80m;
  const temp120m = currentData.temp120m;
  const uvIndex = currentData.uvIndex;

  const spread = temp - dewPoint;
  const cloudBase = Math.max(200, Math.min(3000, Math.round(spread * 125)));

  let gradienteReale = 0.98;
  let gradienteLabel = "Adiabatico secco";
  if (temp80m != null) { gradienteReale = ((temp - temp80m) / 78) * 100; gradienteLabel = "Da T80m"; }
  else if (temp120m != null) { gradienteReale = ((temp - temp120m) / 118) * 100; gradienteLabel = "Da T120m"; }

  let forzaTermica = 0;
  if (gradienteReale >= 1.2) forzaTermica += 3;
  else if (gradienteReale >= 0.98) forzaTermica += 2;
  else if (gradienteReale >= 0.7) forzaTermica += 1;
  if (windSpeed >= 5 && windSpeed <= 15) forzaTermica += 2;
  else if (windSpeed >= 3 && windSpeed < 5) forzaTermica += 1.5;
  else if (windSpeed > 15 && windSpeed <= 22) forzaTermica += 1;
  if (cloudCover >= 15 && cloudCover <= 45) forzaTermica += 2;
  else if (cloudCover >= 5 && cloudCover < 15) forzaTermica += 1.5;
  if (humidity >= 30 && humidity <= 50) forzaTermica += 1.5;
  else if (humidity > 50 && humidity <= 65) forzaTermica += 1;
  if (uvIndex != null) {
    if (uvIndex >= 7) forzaTermica += 1;
    else if (uvIndex >= 5) forzaTermica += 0.7;
    else if (uvIndex >= 3) forzaTermica += 0.4;
  }
  forzaTermica = Math.min(10, Math.max(0, Math.round(forzaTermica * 10) / 10));
  let rateoTermico = (forzaTermica / 10) * 4;
  if (precipitation > 1) rateoTermico = 0;
  rateoTermico = Math.round(rateoTermico * 10) / 10;
  const topTermico = Math.min(5000, cloudBase + Math.round(forzaTermica * 250));
  const raffiche = windGust ?? Math.round(windSpeed * 1.4);
  const zeroTermico = Math.max(0, Math.round(site.alt + (temp / 0.0098) + 200));
  const turbolenza = raffiche > 30 ? "Forte" : raffiche > 22 ? "Moderata" : raffiche > 14 ? "Leggera" : "Assente";

  const condizioniVolo =
    windSpeed < 3 ? "Troppo calma" :
    windSpeed > 30 ? "Vento forte" :
    precipitation > 1 ? "Pioggia" :
    weatherCode >= 95 ? "Temporale" :
    forzaTermica >= 5 ? "Ottime" :
    forzaTermica >= 3 ? "Buone" :
    forzaTermica >= 1 ? "Deboli" :
    "Assenti";

  const dirCardinali = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const dirLabel = dirCardinali[Math.round((windDir ?? 0) / 45) % 8];
  const arrow = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round((windDir ?? 0) / 45) % 8];

  const voloIcon = "";

  const cieloDesc =
    weatherCode === 0 ? "Sereno" :
    weatherCode <= 2 ? "Poco nuvoloso" :
    weatherCode <= 3 ? "Nuvoloso" :
    weatherCode <= 48 ? "Nebbia" :
    weatherCode >= 95 ? "Temporale" :
    "Coperto";

  return (
    <div className="space-y-4">
      <div className={`rounded-xl p-6 border-4 text-center ${
        condizioniVolo.includes("Ottime") ? "bg-emerald-900/40 border-emerald-400" :
        condizioniVolo.includes("Buone") ? "bg-green-900/40 border-green-400" :
        condizioniVolo.includes("Deboli") ? "bg-amber-900/40 border-amber-400" :
        condizioniVolo.includes("calma") ? "bg-slate-800/60 border-slate-400" :
        "bg-red-900/40 border-red-400"
      }`}>
        <div className="text-xl font-bold text-white mb-1">{condizioniVolo}</div>
        <div className="text-base text-slate-300">{cieloDesc} · Vento {windSpeed} km/h da {dirLabel}</div>
        <div className="mt-4 pt-3 border-t border-white/10">
          <span className="text-sm text-slate-400">Zero termico</span>
          <div className="text-2xl font-bold text-white mt-0.5">{zeroTermico} <span className="text-base text-slate-400 font-normal">m</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/60 border border-slate-600/50 rounded-xl p-4 text-center">
          <div className="text-sm text-slate-400 uppercase mb-2 font-bold">Vento decollo</div>
          <div className="text-3xl font-bold text-white flex items-center justify-center gap-2 mb-1">
            {arrow} {Math.round(windSpeed)} <span className="text-base text-slate-400 font-normal">km/h</span>
          </div>
          <div className="text-base text-slate-400">{dirLabel} ({Math.round(windDir ?? 0)}°)</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-600/50 rounded-xl p-4 text-center">
          <div className="text-sm text-slate-400 uppercase mb-2 font-bold">Vento atterraggio</div>
          <div className="text-3xl font-bold text-white flex items-center justify-center gap-2 mb-1">
            {Math.round(windSpeed * 0.7)} <span className="text-base text-slate-400 font-normal">km/h</span>
          </div>
          <div className="text-base text-slate-400">Raffiche {raffiche} km/h</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigCard icon={<ArrowUp className="w-8 h-8 text-green-400" />} label="Base nuvole (LCL)" value={`${cloudBase}`} unit="m" sub={`Spread ${spread.toFixed(1)}°C`} />
        <BigCard icon={<ArrowUp className="w-8 h-8 text-red-400" />} label="Top termiche" value={`${topTermico}`} unit="m" sub={precipitation > 1 ? "Pioggia" : `Spessore ${topTermico - cloudBase}m`} />
        <BigCard icon={<TrendingUp className="w-8 h-8 text-orange-400" />} label="Forza termica" value={`${forzaTermica.toFixed(1)}`} unit="/10" sub={`${rateoTermico} m/s`} />
        <BigCard icon={<AlertTriangle className="w-8 h-8 text-amber-400" />} label="Turbolenza" value={turbolenza} unit="" sub={turbolenza === "Forte" ? "Attenzione" : turbolenza === "Moderata" ? "Gestibile" : turbolenza === "Leggera" ? "Ok" : "Nessuna"} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SmallCard icon={<Droplets className="w-6 h-6 text-sky-400" />} label="Umidità" value={`${humidity ?? "--"}%`} sub={dewPoint != null ? `Rugiada ${Math.round(dewPoint)}°C` : undefined} />
        <SmallCard icon={<Gauge className="w-6 h-6 text-emerald-400" />} label="Pressione" value={`${Math.round(pressure ?? 1013)} hPa`} sub={pressure > 1020 ? "Alta" : pressure < 1010 ? "Bassa" : "Normale"} />
        <SmallCard icon={<Cloud className="w-6 h-6 text-slate-400" />} label="Nuvolosità" value={`${cloudCover ?? "--"}%`} sub={cloudCover < 20 ? "Sereno" : cloudCover < 50 ? "Poco" : cloudCover < 80 ? "Nuvoloso" : "Coperto"} />
        <SmallCard icon={<Sun className="w-6 h-6 text-yellow-400" />} label="UV Index" value={uvIndex != null ? `${uvIndex.toFixed(1)}` : "--"} sub={uvIndex >= 8 ? "Estremo" : uvIndex >= 6 ? "Alto" : uvIndex >= 3 ? "Moderato" : uvIndex >= 1 ? "Basso" : "Nessuno"} />
        <SmallCard icon={<TrendingUp className="w-6 h-6 text-purple-400" />} label="Gradiente" value={`${gradienteReale.toFixed(2)}°`} sub={`${gradienteLabel} · ${gradienteReale > 1.2 ? "Instabile" : gradienteReale > 0.98 ? "Neutro" : "Stabile"}`} />
        <SmallCard icon={<Eye className="w-6 h-6 text-cyan-400" />} label="Delta T" value={`${Math.round(thermalDelta ?? 0)}°C`} sub={thermalDelta > 10 ? "Buona escursione" : thermalDelta > 6 ? "Moderata" : "Bassa"} />
      </div>

      <div className="text-center text-sm text-slate-600 border-t border-slate-700/30 pt-3">
        Dati reali da Open-Meteo · Ultimo aggiornamento: {new Date().toLocaleTimeString("it-IT")}
      </div>
    </div>
  );
}

function BigCard({ icon, label, value, unit, sub }: { icon: React.ReactNode; label: string; value: string; unit: string; sub?: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-600/50 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-sm text-slate-400 uppercase mb-1 font-bold">{label}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}<span className="text-base text-slate-400 font-normal ml-1">{unit}</span></div>
      {sub && <div className="text-sm text-slate-400">{sub}</div>}
    </div>
  );
}

function SmallCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-sm text-slate-400 uppercase mb-1 font-bold">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-sm text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}