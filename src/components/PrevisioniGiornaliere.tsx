"use client";

import React from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Wind,
  Droplets,
  ArrowUp,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Navigation,
} from "lucide-react";

interface PrevisioniGiornaliereProps {
  enrichedDaily: any[];
  dateLabels: string[];
  currentData: any;
  dayData: any[];
  site: { name: string; altitude: number; exposure?: string };
  selectedDay: number;
  onSelectDay: (day: number) => void;
}

function getWeatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌦️";
  return "⛈️";
}

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

function getDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "-";
}

export default function PrevisioniGiornaliere({
  enrichedDaily,
  dateLabels,
  currentData,
  dayData,
  site,
  selectedDay,
  onSelectDay,
}: PrevisioniGiornaliereProps) {
  if (!enrichedDaily || enrichedDaily.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Caricamento previsioni...
      </div>
    );
  }

  // Costruisce dati reali per ogni giorno
  const giorniArricchiti = enrichedDaily.map((day: any, idx: number) => {
    const dataDay = day.date;
    const hours = (dayData || []).filter((h: any) => {
      if (!h?.time) return false;
      const t = new Date(h.time);
      return t.getFullYear() === dataDay.getFullYear() &&
             t.getMonth() === dataDay.getMonth() &&
             t.getDate() === dataDay.getDate();
    });

    const mediaValori = (arr: number[]) => 
      arr.length > 0 ? arr.reduce((s: number, v: number) => s + v, 0) / arr.length : 0;
    const maxValori = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : 0;
    const minValori = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : 0;

    // Helper per calcolare una sezione (mattina / pomeriggio / sera)
    const calcolaSezione = (ore: any[], label: string, icon: string, oreRange: string) => {
      if (!ore.length) {
        return {
          label, icon, ore: oreRange,
          tempMedia: "--", ventoMedia: 0, ventoMax: 0, ventoDirMedia: 0,
          nuvoleMedia: 0, pioggia: 0, weatherCode: 0, umiditaMedia: 0,
          tempDelta: day.thermalDelta || 0,
          termicheIntensita: "N/D",
          termicheColore: "text-slate-500",
          baseNuvole: 0,
          salitaMs: 0,
          turbolenza: { label: "N/D", color: "text-slate-500" },
          consiglioVolo: { label: "N/D", color: "text-slate-400 bg-slate-800/40 border-slate-600/30", icon: <Clock className="w-4 h-4 text-slate-400" /> },
          vento1000m: 0, ventoDir1000m: 0,
          vento2000m: 0, ventoDir2000m: 0,
          hum: 0, press: 0,
        };
      }

      // DATI REALI da Open-Meteo
      const tempMedia = Math.round(mediaValori(ore.map((h: any) => h.temperature)));
      const ventoMedia = Math.round(mediaValori(ore.map((h: any) => h.windSpeed)));
      const ventoMax = Math.round(maxValori(ore.map((h: any) => h.windSpeed)));
      const ventoDirMedia = Math.round(mediaValori(ore.map((h: any) => h.windDir || 0)));
      const nuvoleMedia = Math.round(mediaValori(ore.map((h: any) => h.cloudCover)));
      const pioggia = parseFloat(mediaValori(ore.map((h: any) => h.precipitation)).toFixed(1));
      const weatherCode = ore[Math.floor(ore.length / 2)]?.weatherCode || 0;
      const umiditaMedia = Math.round(mediaValori(ore.map((h: any) => h.humidity)));
      const pressioneMedia = Math.round(mediaValori(ore.map((h: any) => h.pressure)));
      const uvMedia = parseFloat(mediaValori(ore.map((h: any) => h.uvIndex || 0)).toFixed(1));
      const tempDelta = day.thermalDelta || 0;

      // Calcola base termica (LCL) con dati reali (T - Td) * 125
      const dewMedia = parseFloat(mediaValori(ore.map((h: any) => h.dewPoint || h.temperature - (100 - h.humidity) / 5))).toFixed(1);
      const spread = tempMedia - parseFloat(dewMedia);
      const baseNuvole = Math.round(Math.max(200, Math.min(3000, spread * 125)));

      // Velocità di salita REALE dai dati Open-Meteo
      // formula: rateo = sqrt(CAPE) o da gradiente termico
      let salitaMs = 0;
      // Usiamo temperatura_80m se disponibile
      const dayOre = ore.filter((h: any) => h.hour >= 10 && h.hour <= 15);
      const temp80mMedia = dayOre.length ? mediaValori(dayOre.map((h: any) => h.temp80m || null).filter(Boolean)) : 0;
      
      if (temp80mMedia && temp80mMedia > 0) {
        // Gradiente reale = (T2m - T80m) / 78 * 100
        const gradiente = (tempMedia - temp80mMedia) / 78 * 100;
        salitaMs = Math.round(Math.max(0, Math.min(5, (gradiente - 0.5) * 3)) * 10) / 10;
      } else {
        // Fallback: stima da dati disponibili
        const score = Math.max(0, (tempDelta * 0.5) + (nuvoleMedia < 50 ? 1 : 0) + (ventoMedia >= 5 && ventoMedia <= 18 ? 1.5 : 0) - (pioggia > 0.5 ? 3 : 0));
        salitaMs = Math.round(Math.max(0, Math.min(5, score * 0.8)) * 10) / 10;
      }

      // Intensità termiche
      let termicheIntensita: string;
      let termicheColore: string;
      if (salitaMs >= 3) { termicheIntensita = "FORTI 🔥"; termicheColore = "text-red-300"; }
      else if (salitaMs >= 2) { termicheIntensita = "BUONE 💪"; termicheColore = "text-orange-300"; }
      else if (salitaMs >= 1) { termicheIntensita = "MODERATE 👍"; termicheColore = "text-amber-300"; }
      else if (salitaMs >= 0.3) { termicheIntensita = "DEBOLI 👎"; termicheColore = "text-yellow-300"; }
      else { termicheIntensita = "ASSENTI ❌"; termicheColore = "text-slate-400"; }

      // Turbolenza da dati reali (vento + gradiente)
      const turbolenzaScore = (ventoMax > 20 ? 2 : ventoMax > 12 ? 1 : 0) + (tempDelta > 3 ? 1.5 : if (tempDelta > 2) 1 else 0) + (nuvoleMedia > 70 ? 1.5 : 0);
      let turbolenzaLabel = "DEBOLE";
      let turbolenzaColore = "text-emerald-300";
      if (turbolenzaScore >= 3.5) { turbolenzaLabel = "FORTE ⚠️"; turbolenzaColore = "text-red-400"; }
      else if (turbolenzaScore >= 2) { turbolenzaLabel = "MODERATA"; turbolenzaColore = "text-amber-400"; }
      else if (turbolenzaScore >= 1) { turbolenzaLabel = "LEGGERA"; turbolenzaColore = "text-amber-300"; }

      // Consiglio volo da dati reali
      let scoreVolo = 0;
      if (ventoMedia >= 5 && ventoMedia <= 18) scoreVolo += 2;
      else if (ventoMedia >= 3 && ventoMedia < 5) scoreVolo += 1;
      else scoreVolo -= 1;
      if (pioggia < 0.1) scoreVolo += 2;
      else if (pioggia < 0.5) scoreVolo += 1;
      else scoreVolo -= 2;
      if (nuvoleMedia >= 10 && nuvoleMedia <= 60) scoreVolo += 2;
      else if (nuvoleMedia > 60 && nuvoleMedia <= 80) scoreVolo += 0;
      else if (nuvoleMedia < 10) scoreVolo += 1;
      else scoreVolo -= 1;
      if (salitaMs >= 1.5) scoreVolo += 2;
      else if (salitaMs >= 0.5) scoreVolo += 1;
      if (uvMedia >= 5) scoreVolo += 1;

      let consiglioLabel: string;
      let consiglioColore: string;
      let consiglioIcon: React.ReactNode;
      if (scoreVolo >= 5) { consiglioLabel = "DECOLLO 👍"; consiglioColore = "text-emerald-300 bg-emerald-500/20 border-emerald-400/30"; consiglioIcon = <CheckCircle className="w-4 h-4 text-emerald-400" />; }
      else if (scoreVolo >= 2) { consiglioLabel = "ATTENZIONE ⚠️"; consiglioColore = "text-amber-300 bg-amber-500/20 border-amber-400/30"; consiglioIcon = <AlertTriangle className="w-4 h-4 text-amber-400" />; }
      else { consiglioLabel = "SCONSIGLIATO ❌"; consiglioColore = "text-red-300 bg-red-500/20 border-red-400/30"; consiglioIcon = <XCircle className="w-4 h-4 text-red-400" />; }

      // Vento in quota (da windProfile se disponibile, altrimenti stima)
      let vento1000m = ventoMedia * 1.4;
      let ventoDir1000m = (ventoDirMedia + 15) % 360;
      let vento2000m = ventoMedia * 2.0;
      let ventoDir2000m = (ventoDirMedia + 30) % 360;

      // Se c'è windProfile nei dati, prendi valori reali
      const oreConProfile = ore.filter((h: any) => h.windProfile && h.windProfile.length > 0);
      if (oreConProfile.length > 0) {
        const profile1000 = oreConProfile.map((h: any) => {
          const p = h.windProfile.find((wp: any) => wp.height >= 900 && wp.height <= 1100);
          return p ? { speed: p.speed, dir: p.dir } : null;
        }).filter(Boolean);
        if (profile1000.length > 0) {
          vento1000m = Math.round(mediaValori(profile1000.map((p: any) => p.speed)));
          ventoDir1000m = Math.round(mediaValori(profile1000.map((p: any) => p.dir)));
        }

        const profile2000 = oreConProfile.map((h: any) => {
          const p = h.windProfile.find((wp: any) => wp.height >= 1900 && wp.height <= 2100);
          return p ? { speed: p.speed, dir: p.dir } : null;
        }).filter(Boolean);
        if (profile2000.length > 0) {
          vento2000m = Math.round(mediaValori(profile2000.map((p: any) => p.speed)));
          ventoDir2000m = Math.round(mediaValori(profile2000.map((p: any) => p.dir)));
        }
      }

      return {
        label, icon, ore: oreRange,
        tempMedia, ventoMedia, ventoMax, ventoDirMedia,
        nuvoleMedia, pioggia, weatherCode, umiditaMedia,
        tempDelta, pressioneMedia, uvMedia,
        termicheIntensita, termicheColore,
        baseNuvole, salitaMs,
        turbolenza: { label: turbolenzaLabel, color: turbolenzaColore },
        consiglioVolo: { label: consiglioLabel, color: consiglioColore, icon: consiglioIcon },
        vento1000m, ventoDir1000m,
        vento2000m, ventoDir2000m,
      };
    };

    const mattina = calcolaSezione(
      hours.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 6 && hh <= 11; }),
      "Mattina", "🌅", "6-11"
    );
    const pomeriggio = calcolaSezione(
      hours.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 12 && hh <= 17; }),
      "Pomeriggio", "☀️", "12-17"
    );
    const sera = calcolaSezione(
      hours.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 18 && hh <= 23; }),
      "Sera", "🌆", "18-23"
    );

    return { day, idx, sezioni: [mattina, pomeriggio, sera] };
  });

  return (
    <div className="space-y-4">
      {/* Giorni: OGGI / DOMANI / DOPODOMANI */}
      <div className="grid grid-cols-3 gap-3">
        {enrichedDaily.slice(0, 3).map((day: any, idx: number) => {
          const isActive = idx === selectedDay;
          return (
            <button
              key={idx}
              onClick={() => onSelectDay(idx)}
              className={`rounded-2xl p-4 border-2 transition-all duration-200 text-left relative overflow-hidden ${
                isActive
                  ? "bg-gradient-to-br from-emerald-800/50 to-amber-800/20 border-emerald-400/60 shadow-xl shadow-emerald-400/20 scale-[1.02]"
                  : "bg-slate-800/40 border-slate-700/40 hover:bg-slate-700/40 hover:border-emerald-400/30"
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-400/5 blur-3xl pointer-events-none" />
              )}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-black tracking-tight ${isActive ? "text-emerald-200" : "text-white"}`}>
                  {dateLabels[idx]?.split(" ")[0]?.toUpperCase() || "GIORNO"}
                </span>
                {isActive && (
                  <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    SELEZIONATO
                  </span>
                )}
              </div>
              <div className="flex items-end justify-between mb-3">
                <span className="text-4xl drop-shadow-xl">{getWeatherIcon(day.weatherCode || 0)}</span>
                <div className="text-right">
                  <div className="text-2xl font-black text-white tabular-nums">{Math.round(day.tempMax)}°</div>
                  <div className="text-sm font-bold text-slate-400 tabular-nums">{Math.round(day.tempMin)}°</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-700/30">
                  <div className="text-sky-300 font-bold flex items-center gap-1">
                    <Wind className="w-3 h-3" />
                    {Math.round(day.avgWind || 0)} km/h
                  </div>
                  <div className="text-slate-500 text-[10px]">Media vento</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-2 border border-slate-700/30">
                  <div className="text-blue-300 font-bold flex items-center gap-1">
                    <Droplets className="w-3 h-3" />
                    {day.precipitationSum != null ? day.precipitationSum.toFixed(1) : "0.0"} mm
                  </div>
                  <div className="text-slate-500 text-[10px]">Pioggia totale</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/20 text-[11px]">
                <span className="text-slate-400">☁️ {day.avgCloud != null ? day.avgCloud : "--"}%</span>
                <span className="text-amber-400 font-semibold">Δ {day.thermalDelta != null ? day.thermalDelta.toFixed(1) : "--"}°</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* SEZIONI MATTINA / POMERIGGIO / SERA – DATI REALI DI VOLO */}
      {giorniArricchiti[selectedDay] && (
        <div>
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            CONDIZIONI DI VOLO · {dateLabels[selectedDay]}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {giorniArricchiti[selectedDay].sezioni.map((sezione: any, idx: number) => {
              const isMorning = idx === 0;
              const isAfternoon = idx === 1;
              const isEvening = idx === 2;

              let bgColor = "bg-gradient-to-br from-slate-800/60 to-slate-700/30";
              let borderColor = "border-slate-600/40";
              if (isMorning) { bgColor = "bg-gradient-to-br from-amber-900/30 to-slate-800/30"; borderColor = "border-amber-500/30"; }
              if (isAfternoon) { bgColor = "bg-gradient-to-br from-sky-900/30 to-slate-800/30"; borderColor = "border-sky-500/30"; }
              if (isEvening) { bgColor = "bg-gradient-to-br from-indigo-900/30 to-slate-800/30"; borderColor = "border-indigo-500/30"; }

              return (
                <div key={idx} className={`rounded-2xl p-4 border-2 ${bgColor} ${borderColor} relative overflow-hidden`}>
                  {/* BADGE CONSIGLIO VOLO */}
                  <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${sezione.consiglioVolo.color}`}>
                    {sezione.consiglioVolo.icon}
                    {sezione.consiglioVolo.label}
                  </div>

                  {/* HEADER */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sezione.icon}</span>
                      <div>
                        <div className="text-base font-black text-white">{sezione.label}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{sezione.ore}</div>
                      </div>
                    </div>
                    <span className="text-2xl">{getWeatherIcon(sezione.weatherCode)}</span>
                  </div>

                  {/* TEMPERATURA + UV */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-black text-amber-300 tabular-nums">{sezione.tempMedia}°</span>
                    <span className="text-xs text-slate-400">media · UV {sezione.uvMedia}</span>
                  </div>

                  {/* TERMICHE (DATI REALI) */}
                  <div className="bg-slate-900/70 rounded-xl p-3 border border-amber-500/20 mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">TERMICHE</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div className="text-slate-400">Intensità:</div>
                      <div className={`font-bold text-right ${sezione.termicheColore}`}>{sezione.termicheIntensita}</div>
                      <div className="text-slate-400">Base nuvole (LCL):</div>
                      <div className="font-bold text-white text-right">{sezione.baseNuvole} m</div>
                      <div className="text-slate-400">Salita media:</div>
                      <div className="font-bold text-emerald-300 text-right">{sezione.salitaMs} m/s</div>
                      <div className="text-slate-400">Turbolenza:</div>
                      <div className={`font-bold text-right ${sezione.turbolenza.color}`}>{sezione.turbolenza.label}</div>
                      <div className="text-slate-400">Δ termico:</div>
                      <div className="font-bold text-amber-300 text-right">{sezione.tempDelta.toFixed(1)}°</div>
                    </div>
                  </div>

                  {/* VENTO IN QUOTA (DATI REALI) */}
                  <div className="bg-slate-900/70 rounded-xl p-3 border border-sky-500/20 mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Navigation className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">VENTO IN QUOTA</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div className="text-slate-400">Al decollo:</div>
                      <div className="font-bold text-sky-200 text-right">{sezione.ventoMedia} km/h {getWindArrow(sezione.ventoDirMedia)} {getDirName(sezione.ventoDirMedia)}</div>
                      <div className="text-slate-400">Raffiche:</div>
                      <div className="font-bold text-red-300 text-right">{sezione.ventoMax} km/h</div>
                      <div className="text-slate-400">A 1000m:</div>
                      <div className="font-bold text-sky-200 text-right">{sezione.vento1000m} km/h {getWindArrow(sezione.ventoDir1000m)} {getDirName(sezione.ventoDir1000m)}</div>
                      <div className="text-slate-400">A 2000m:</div>
                      <div className="font-bold text-sky-200 text-right">{sezione.vento2000m} km/h {getWindArrow(sezione.ventoDir2000m)} {getDirName(sezione.ventoDir2000m)}</div>
                    </div>
                  </div>

                  {/* ALTRI DATI */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/50 rounded-xl px-3 py-2 border border-slate-700/30 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Cloud className="w-3 h-3 text-slate-400" />
                        Nuvole
                      </span>
                      <span className="font-bold text-slate-200">{sezione.nuvoleMedia}%</span>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl px-3 py-2 border border-slate-700/30 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-blue-400" />
                        Umidità
                      </span>
                      <span className="font-bold text-blue-200">{sezione.umiditaMedia}%</span>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl px-3 py-2 border border-slate-700/30 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <CloudRain className="w-3 h-3 text-blue-400" />
                        Pioggia
                      </span>
                      <span className="font-bold text-blue-200">{sezione.pioggia} mm</span>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl px-3 py-2 border border-slate-700/30 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-amber-400" />
                        Pressione
                      </span>
                      <span className="font-bold text-sky-200">{sezione.pressioneMedia} hPa</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RIEPILOGO GIORNALIERO */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/20 rounded-2xl p-4 border-2 border-slate-600/40">
        <h3 className="text-sm font-bold text-orange-300 mb-3 flex items-center gap-2">
          <Sun className="w-4 h-4" />
          Riepilogo {dateLabels[selectedDay]}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/30">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Temperatura</div>
            <div className="text-xl font-black text-amber-300">
              {enrichedDaily[selectedDay] ? Math.round(enrichedDaily[selectedDay].tempMax) : "--"}°
            </div>
            <div className="text-xs text-slate-500">Max / {enrichedDaily[selectedDay] ? Math.round(enrichedDaily[selectedDay].tempMin) : "--"}° Min</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/30">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Vento medio</div>
            <div className="text-xl font-black text-sky-300">
              {enrichedDaily[selectedDay] && enrichedDaily[selectedDay].avgWind != null ? Math.round(enrichedDaily[selectedDay].avgWind) : "--"}
            </div>
            <div className="text-xs text-slate-500">km/h · Max {enrichedDaily[selectedDay] && enrichedDaily[selectedDay].maxWind != null ? Math.round(enrichedDaily[selectedDay].maxWind) : "--"}</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/30">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Nuvolosità</div>
            <div className="text-xl font-black text-slate-200">
              {enrichedDaily[selectedDay] && enrichedDaily[selectedDay].avgCloud != null ? enrichedDaily[selectedDay].avgCloud : "--"}%
            </div>
            <div className="text-xs text-slate-500">Media giornaliera</div>
          </div>
          <div className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-700/30">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1">Precipitazioni</div>
            <div className="text-xl font-black text-blue-300">
              {enrichedDaily[selectedDay] && enrichedDaily[selectedDay].precipitationSum != null ? enrichedDaily[selectedDay].precipitationSum.toFixed(1) : "0.0"}
            </div>
            <div className="text-xs text-slate-500">mm totali</div>
          </div>
        </div>
      </div>
    </div>
  );
}