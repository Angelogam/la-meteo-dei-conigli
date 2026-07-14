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
  modelName?: string;
  cape?: number;
  liftedIndex?: number;
  cin?: number;
}

export default function MeteoTab({ currentData, dayData, site, thermalDelta, stabilityIndex, modelName, cape, liftedIndex, cin }: MeteoTabProps) {
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

  const condizioniVolo =
    windSpeed < 3 ? "Troppo calma" :
    windSpeed > 30 ? "Vento forte" :
    precipitation > 1 ? "Pioggia 🌧️" :
    weatherCode >= 95 ? "Temporale ⛈️" :
    forzaTermica >= 5 ? "Ottime 🪂🔥" :
    forzaTermica >= 3 ? "Buone 🪂" :
    forzaTermica >= 1 ? "Deboli 🌤️" :
    "Assenti ❄️";

  const dirCardinali = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const dirLabel = dirCardinali[Math.round((windDir ?? 0) / 45) % 8];
  const arrow = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round((windDir ?? 0) / 45) % 8];

  const voloEmoji =
    condizioniVolo.includes("Ottime") ? "🪂🔥" :
    condizioniVolo.includes("Buone") ? "🪂" :
    condizioniVolo.includes("Deboli") ? "🌤️" :
    condizioniVolo.includes("calma") ? "🌀" :
    condizioniVolo.includes("Pioggia") || condizioniVolo.includes("Temporale") ? "⛈️" :
    condizioniVolo.includes("forte") ? "💨" : "❄️";

  const cieloDesc =
    weatherCode === 0 ? "Sereno" :
    weatherCode <= 2 ? "Poco nuvoloso" :
    weatherCode <= 3 ? "Nuvoloso" :
    weatherCode <= 48 ? "Nebbia" :
    weatherCode >= 95 ? "Temporale" :
    "Coperto";

  return (
    <div className="space-y-4">
      <div className={`card p-6 border-4 text-center ${
        condizioniVolo.includes("Ottime") ? "bg-emerald-900/40 border-emerald-400" :
        condizioniVolo.includes("Buone") ? "bg-green-900/40 border-green-400" :
        condizioniVolo.includes("Deboli") ? "bg-amber-900/40 border-amber-400" :
        condizioniVolo.includes("calma") ? "bg-slate-800/60 border-slate-400" :
        "bg-red-900/40 border-red-400"
      }`}>
        <div className="text-6xl mb-3">{voloEmoji}</div>
        <div className="text-2xl font-bold text-white mb-1">{condizioniVolo}</div>
        <div className="text-base text-slate-300">{cieloDesc} · Vento {windSpeed} km/h da {dirLabel}</div>
        <div className="mt-4 pt-3 border-t border-white/10">
          <span className="text-sm text-slate-400">Zero termico</span>
          <div className="text-2xl font-bold text-white mt-0.5">{zeroTermico} <span className="text-base text-slate-400 font-normal">m</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card bg-slate-800/60 border border-slate-600/50 p-4 text-center">
          <div className="text-sm text-slate-400 uppercase mb-2 font-bold">Vento decollo</div>
          <div className="text-3xl font-bold text-white flex items-center justify-center gap-2 mb-1">
            {arrow} {Math.round(windSpeed)} <span className="text-base text-slate-400 font-normal">km/h</span>
          </div>
          <div className="text-base text-slate-400">{dirLabel} ({Math.round(windDir ?? 0)}°)</div>
        </div>
        <div className="card bg-slate-800/60 border border-slate-600/50 p-4 text-center">
          <div className="text-sm text-slate-400 uppercase mb-2 font-bold">Vento atterraggio</div>
          <div className="text-3xl font-bold text-white flex items-center justify-center gap-2 mb-1">
            {Math.round(windSpeed * 0.7)} <span className="text-base text-slate-400 font-normal">km/h</span>
          </div>
          <div className="text-base text-slate-400">Raffiche {raffiche} km/h</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card bg-slate-800/60 border border-slate-600/50 p-4 text-center">
          <ArrowUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">Base nuvole</div>
          <div className="text-2xl font-bold text-white mb-1">{cloudBase} <span className="text-base text-slate-400 font-normal">m</span></div>
          <div className="text-sm text-slate-400">Spread {spread.toFixed(1)}°C</div>
        </div>
        <div className="card bg-slate-800/60 border border-slate-600/50 p-4 text-center">
          <ArrowUp className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">Top termiche</div>
          <div className="text-2xl font-bold text-white mb-1">{topTermico} <span className="text-base text-slate-400 font-normal">m</span></div>
          <div className="text-sm text-slate-400">{precipitation > 1 ? "Pioggia ⛔" : `Spessore ${topTermico - cloudBase}m`}</div>
        </div>
        <div className="card bg-slate-800/60 border border-slate-600/50 p-4 text-center">
          <TrendingUp className="w-8 h-8 text-orange-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">Forza termica</div>
          <div className="text-2xl font-bold text-white mb-1">{forzaTermica.toFixed(1)} <span className="text-base text-slate-400 font-normal">/10</span></div>
          <div className="text-sm text-slate-400">{rateoTermico} m/s</div>
        </div>
        <div className="card bg-slate-800/60 border border-slate-600/50 p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">Turbolenza</div>
          <div className="text-xl font-bold text-white mb-1">
            {raffiche > 30 ? "Forte ⚠️" : raffiche > 22 ? "Moderata 🟡" : raffiche > 14 ? "Leggera 🟢" : "Assente ✅"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card bg-slate-800/50 border border-slate-600/50 p-4 text-center">
          <TrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">CAPE</div>
          <div className="text-xl font-bold text-white">{cape != null ? `${Math.round(cape)} J/kg` : "--"}</div>
          <div className="text-sm text-slate-400 mt-1">{cape != null ? (cape > 1000 ? "Molto instabile ⚠️" :<dyad-write path="src/components/MeteoTab.tsx" description="Completato MeteoTab con classi card">
  <div className="text-sm text-slate-400 mt-1">{cape != null ? (cape > 1000 ? "Molto instabile ⚠️" : cape > 500 ? "Instabile 🟡" : cape > 200 ? "Moderato 🟢" : "Stabile 🔵") : "--"}</div>
        </div>
        <div className="card bg-slate-800/50 border border-slate-600/50 p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">Lifted Index</div>
          <div className="text-xl font-bold text-white">{liftedIndex != null ? `${liftedIndex.toFixed(1)}°C` : "--"}</div>
          <div className="text-sm text-slate-400 mt-1">{liftedIndex != null ? (liftedIndex < -5 ? "Instabile 🟠" : liftedIndex < 0 ? "Leggero 🟢" : "Stabile 🔵") : "--"}</div>
        </div>
        <div className="card bg-slate-800/50 border border-slate-600/50 p-4 text-center">
          <Cloud className="w-6 h-6 text-blue-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">CIN</div>
          <div className="text-xl font-bold text-white">{cin != null ? `${Math.round(cin)} J/kg` : "--"}</div>
          <div className="text-sm text-slate-400 mt-1">{cin != null ? (cin < -50 ? "Inibizione forte ⛔" : cin < -20 ? "Inibizione media 🟡" : "Inibizione debole 🟢") : "--"}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card bg-slate-800/50 border border-slate-600/50 p-4 text-center">
          <Droplets className="w-6 h-6 text-sky-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">Umidità</div>
          <div className="text-xl font-bold text-white">{humidity ?? "--"}%</div>
          <div className="text-sm text-slate-400 mt-1">{dewPoint != null ? `Rugiada ${Math.round(dewPoint)}°C` : ""}</div>
        </div>
        <div className="card bg-slate-800/50 border border-slate-600/50 p-4 text-center">
          <Gauge className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">Pressione</div>
          <div className="text-xl font-bold text-white">{Math.round(pressure ?? 1013)} hPa</div>
          <div className="text-sm text-slate-400 mt-1">{pressure > 1020 ? "Alta" : pressure < 1010 ? "Bassa" : "Normale"}</div>
        </div>
        <div className="card bg-slate-800/50 border border-slate-600/50 p-4 text-center">
          <Cloud className="w-6 h-6 text-slate-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">Nuvolosità</div>
          <div className="text-xl font-bold text-white">{cloudCover ?? "--"}%</div>
          <div className="text-sm text-slate-400 mt-1">{cloudCover < 20 ? "Sereno" : cloudCover < 50 ? "Poco" : cloudCover < 80 ? "Nuvoloso" : "Coperto"}</div>
        </div>
        <div className="card bg-slate-800/50 border border-slate-600/50 p-4 text-center">
          <Sun className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">UV Index</div>
          <div className="text-xl font-bold text-white">{uvIndex != null ? `${uvIndex.toFixed(1)}` : "--"}</div>
          <div className="text-sm text-slate-400 mt-1">{uvIndex >= 8 ? "Estremo" : uvIndex >= 6 ? "Alto" : uvIndex >= 3 ? "Moderato" : uvIndex >= 1 ? "Basso" : "Nessuno"}</div>
        </div>
        <div className="card bg-slate-800/50 border border-slate-600/50 p-4 text-center">
          <TrendingUp className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">Gradiente</div>
          <div className="text-xl font-bold text-white">{gradienteReale.toFixed(2)}°</div>
          <div className="text-sm text-slate-400 mt-1">{gradienteLabel} · {gradienteReale > 1.2 ? "Instabile" : gradienteReale > 0.98 ? "Neutro" : "Stabile"}</div>
        </div>
        <div className="card bg-slate-800/50 border border-slate-600/50 p-4 text-center">
          <Eye className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
          <div className="text-sm text-slate-400 uppercase mb-1 font-bold">Delta T</div>
          <div className="text-xl font-bold text-white">{Math.round(thermalDelta ?? 0)}°C</div>
          <div className="text-sm text-slate-400 mt-1">{thermalDelta > 10 ? "Buona escursione" : thermalDelta > 6 ? "Moderata" : "Bassa"}</div>
        </div>
      </div>

      <div className="text-center text-sm text-slate-600 border-t border-slate-700/30 pt-3">
        Dati da Open-Meteo · Modello: {modelName || "auto"} · Aggiornamento: {new Date().toLocaleTimeString("it-IT")}
      </div>
    </div>
  );
}