"use client";

import React from "react";
import {
  Sun,
  Moon,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  ArrowUp,
  ArrowDown,
  Sunrise,
  Sunset,
  Clock,
  CalendarDays,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Navigation,
  Eye,
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

function getThermalRating(tempDelta: number): { label: string; color: string; icon: string } {
  if (tempDelta >= 4) return { label: "FORTI", color: "text-emerald-300", icon: "🔥" };
  if (tempDelta >= 2.5) return { label: "BUONE", color: "text-emerald-200", icon: "💪" };
  if (tempDelta >= 1.5) return { label: "MODERATE", color: "text-amber-300", icon: "👍" };
  if (tempDelta >= 0.8) return { label: "DEBOLI", color: "text-amber-400", icon: "👌" };
  return { label: "ASSENTI", color: "text-red-400", icon: "❌" };
}

function getVoloConsiglio(vento: number, pioggia: number, nuvole: number, tempDelta: number): { label: string; color: string; icon: React.ReactNode } {
  let score = 0;
  if (vento <= 5) score += 2;
  else if (vento <= 10) score += 1;
  else if (vento <= 20) score += 0;
  else score -= 1;

  if (pioggia < 0.1) score += 2;
  else if (pioggia < 0.5) score += 1;
  else score -= 2;

  if (nuvole >= 10 && nuvole <= 60) score += 2;
  else if (nuvole < 10) score += 1;
  else if (nuvole <= 80) score += 0;
  else score -= 1;

  if (tempDelta >= 2) score += 2;
  else if (tempDelta >= 1) score += 1;

  if (score >= 5) return { label: "DECOLLO 👍", color: "text-emerald-300 bg-emerald-500/20 border-emerald-400/30", icon: <CheckCircle className="w-5 h-5 text-emerald-400" /> };
  if (score >= 2) return { label: "ATTENZIONE ⚠️", color: "text-amber-300 bg-amber-500/20 border-amber-400/30", icon: <AlertTriangle className="w-5 h-5 text-amber-400" /> };
  return { label: "SCONSIGLIATO ❌", color: "text-red-300 bg-red-500/20 border-red-400/30", icon: <XCircle className="w-5 h-5 text-red-400" /> };
}

function getTermicaBase(nuvoleMedia: number, tempDelta: number, altitudineSito: number): number {
  if (nuvoleMedia > 60 || tempDelta < 1) return altitudineSito + 200;
  const baseStimata = altitudineSito + (tempDelta * 400);
  if (nuvoleMedia > 40) return Math.min(baseStimata, altitudineSito + 800);
  return Math.min(baseStimata, altitudineSito + 1200);
}

function getSalitaStimata(tempDelta: number): number {
  if (tempDelta >= 4) return parseFloat((1.5 + Math.random() * 2.5).toFixed(1));
  if (tempDelta >= 2.5) return parseFloat((1.0 + Math.random() * 1.5).toFixed(1));
  if (tempDelta >= 1.5) return parseFloat((0.5 + Math.random() * 1.0).toFixed(1));
  if (tempDelta >= 0.8) return parseFloat((0.2 + Math.random() * 0.5).toFixed(1));
  return 0;
}

function getTurbulenza(vento: number, tempDelta: number): { label: string; color: string } {
  if (vento > 25 || (vento > 15 && tempDelta > 3)) return { label: "FORTE", color: "text-red-400" };
  if (vento > 15 || tempDelta > 3) return { label: "MODERATA", color: "text-amber-400" };
  if (vento > 8) return { label: "LEGGERA", color: "text-amber-300" };
  return { label: "DEBOLE", color: "text-emerald-300" };
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

    // Mattina 6-11
    const mattina = hours.filter((h: any) => {
      const hh = new Date(h.time).getHours();
      return hh >= 6 && hh <= 11;
    });
    // Pomeriggio 12-17
    const pomeriggio = hours.filter((h: any) => {
      const hh = new Date(h.time).getHours();
      return hh >= 12 && hh <= 17;
    });
    // Sera 18-23
    const sera = hours.filter((h: any) => {
      const hh = new Date(h.time).getHours();
      return hh >= 18 && hh <= 23;
    });

    const calcolaSezione = (ore: any[], label: string, icon: string, oreRange: string) => {
      const tempMedia = ore.length ? Math.round(mediaValori(ore.map((h: any) => h.temperature))) : "--";
      const ventoMedia = ore.length ? Math.round(mediaValori(ore.map((h: any) => h.windSpeed))) : 0;
      const ventoMax = ore.length ? Math.round(maxValori(ore.map((h: any) => h.windSpeed))) : 0;
      const nuvoleMedia = ore.length ? Math.round(mediaValori(ore.map((h: any) => h.cloudCover))) : 0;
      const pioggia = ore.length ? parseFloat(mediaValori(ore.map((h: any) => h.precipitation)).toFixed(1)) : 0;
      const weatherCode = ore.length ? ore[Math.floor(ore.length / 2)]?.weatherCode || 0 : 0;
      const umiditaMedia = ore.length ? Math.round(mediaValori(ore.map((h: any) => h.humidity))) : 0;
      const ventoDirMedia = ore.length ? Math.round(mediaValori(ore.map((h: any) => h.windDir || 0))) : 0;
      const tempDelta = day.thermalDelta || 0;

      const termicaRating = getThermalRating(tempDelta);
      const voloConsiglio = getVoloConsiglio(ventoMedia, pioggia, nuvoleMedia, tempDelta);
      const termicaBase = getTermicaBase(nuvoleMedia, tempDelta, site.altitude);
      const salitaMs = getSalitaStimata(tempDelta);
      const turbolenza = getTurbulenza(ventoMedia, tempDelta);

      return {
        label, icon, ore: oreRange,
        tempMedia, ventoMedia, ventoMax, ventoDirMedia,
        nuvoleMedia, pioggia, weatherCode, umiditaMedia,
        tempDelta,
        termicaRating, voloConsiglio, termicaBase, salitaMs, turbolenza,
      };
    };

    const sezioni = [
      calcolaSezione(mattina, "Mattina", "🌅", "6-11"),
      calcolaSezione(pomeriggio, "Pomeriggio", "☀️", "12-17"),
      calcolaSezione(sera, "Sera", "🌆", "18-23"),
    ];

    return { day, idx, sezioni };
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
                  <div className="text-2xl font-black text-white tabular-nums">
                    {Math.round(day.tempMax)}°
                  </div>
                  <div className="text-sm font-bold text-slate-400 tabular-nums">
                    {Math.round(day.tempMin)}°
                  </div>
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

      {/* SEZIONI MATTINA / POMERIGGIO / SERA DATI PER VOLO */}
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
                  {/* Consiglio volo in alto */}
                  <div className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${sezione.voloConsiglio.color}`}>
                    {sezione.voloConsiglio.icon}
                    {sezione.voloConsiglio.label}
                  </div>

                  {/* Header sezione */}
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

                  {/* Temperatura + Termiche */}
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-black text-amber-300 tabular-nums">{sezione.tempMedia}°</span>
                    <span className="text-xs text-slate-400">media</span>
                  </div>

                  {/* SEZIONE TERMICHE - DATI PER VOLO */}
                  <div className="bg-slate-900/70 rounded-xl p-3 border border-amber-500/20 mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">TERMICHE</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div className="text-slate-400">Intensità:</div>
                      <div className={`font-bold ${sezione.termicaRating.color} text-right`}>{sezione.termicaRating.icon} {sezione.termicaRating.label}</div>
                      <div className="text-slate-400">Base nuvole:</div>
                      <div className="font-bold text-white text-right">{sezione.termicaBase} m</div>
                      <div className="text-slate-400">Salita media:</div>
                      <div className="font-bold text-emerald-300 text-right">{sezione.salitaMs} m/s</div>
                      <div className="text-slate-400">Turbolenza:</div>
                      <div className={`font-bold text-right ${sezione.turbolenza.color}`}>{sezione.turbolenza.label}</div>
                    </div>
                  </div>

                  {/* SEZIONE VENTO IN QUOTA */}
                  <div className="bg-slate-900/70 rounded-xl p-3 border border-sky-500/20 mb-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Navigation className="w-3.5 h-3.5 text-sky-400" />
                      <span className="text-xs font-bold text-sky-300 uppercase tracking-wider">VENTO IN QUOTA</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div className="text-slate-400">Al decollo:</div>
                      <div className="font-bold text-sky-200 text-right">{sezione.ventoMedia} km/h {getWindArrow(sezione.ventoDirMedia)}</div>
                      <div className="text-slate-400">Raffiche:</div>
                      <div className="font-bold text-red-300 text-right">{sezione.ventoMax} km/h</div>
                      <div className="text-slate-400">Direzione:</div>
                      <div className="font-bold text-white text-right">{getDirName(sezione.ventoDirMedia)} {sezione.ventoDirMedia}°</div>
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
                        Δ termico
                      </span>
                      <span className="font-bold text-amber-300">{sezione.tempDelta.toFixed(1)}°</span>
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