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

function getWeatherIcon(code: number, size: number = 40): string {
  // WMO codes
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

function getWindDirName(deg: number): string {
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

  // Calcola i dati per ogni giorno: mattina, pomeriggio, sera
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

    const sezioni = [
      {
        label: "Mattina",
        icon: "🌅",
        ore: "6-11",
        tempMedia: mattina.length ? Math.round(mediaValori(mattina.map((h: any) => h.temperature))) : "--",
        ventoMedia: mattina.length ? Math.round(mediaValori(mattina.map((h: any) => h.windSpeed))) : "--",
        ventoMax: mattina.length ? Math.round(maxValori(mattina.map((h: any) => h.windSpeed))) : "--",
        nuvoleMedia: mattina.length ? Math.round(mediaValori(mattina.map((h: any) => h.cloudCover))) : "--",
        pioggia: mattina.length ? mediaValori(mattina.map((h: any) => h.precipitation)).toFixed(1) : "0.0",
        weatherCode: mattina.length ? mattina[Math.floor(mattina.length / 2)]?.weatherCode || 0 : 0,
        umiditaMedia: mattina.length ? Math.round(mediaValori(mattina.map((h: any) => h.humidity))) : "--",
      },
      {
        label: "Pomeriggio",
        icon: "☀️",
        ore: "12-17",
        tempMedia: pomeriggio.length ? Math.round(mediaValori(pomeriggio.map((h: any) => h.temperature))) : "--",
        ventoMedia: pomeriggio.length ? Math.round(mediaValori(pomeriggio.map((h: any) => h.windSpeed))) : "--",
        ventoMax: pomeriggio.length ? Math.round(maxValori(pomeriggio.map((h: any) => h.windSpeed))) : "--",
        nuvoleMedia: pomeriggio.length ? Math.round(mediaValori(pomeriggio.map((h: any) => h.cloudCover))) : "--",
        pioggia: pomeriggio.length ? mediaValori(pomeriggio.map((h: any) => h.precipitation)).toFixed(1) : "0.0",
        weatherCode: pomeriggio.length ? pomeriggio[Math.floor(pomeriggio.length / 2)]?.weatherCode || 0 : 0,
        umiditaMedia: pomeriggio.length ? Math.round(mediaValori(pomeriggio.map((h: any) => h.humidity))) : "--",
      },
      {
        label: "Sera",
        icon: "🌆",
        ore: "18-23",
        tempMedia: sera.length ? Math.round(mediaValori(sera.map((h: any) => h.temperature))) : "--",
        ventoMedia: sera.length ? Math.round(mediaValori(sera.map((h: any) => h.windSpeed))) : "--",
        ventoMax: sera.length ? Math.round(maxValori(sera.map((h: any) => h.windSpeed))) : "--",
        nuvoleMedia: sera.length ? Math.round(mediaValori(sera.map((h: any) => h.cloudCover))) : "--",
        pioggia: sera.length ? mediaValori(sera.map((h: any) => h.precipitation)).toFixed(1) : "0.0",
        weatherCode: sera.length ? sera[Math.floor(sera.length / 2)]?.weatherCode || 0 : 0,
        umiditaMedia: sera.length ? Math.round(mediaValori(sera.map((h: any) => h.humidity))) : "--",
      },
    ];

    return { day, idx, sezioni };
  });

  return (
    <div className="space-y-4">
      {/* Giorni: OGGI / DOMANI / DOPODOMANI */}
      <div className="grid grid-cols-3 gap-3">
        {enrichedDaily.slice(0, 3).map((day: any, idx: number) => {
          const isActive = idx === selectedDay;
          const giornoInfo = giorniArricchiti[idx];

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
              {/* Glow */}
              {isActive && (
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-400/5 blur-3xl pointer-events-none" />
              )}

              {/* Nome giorno + data */}
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

              {/* Iconona + temperatura max/min */}
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

              {/* Vento + pioggia */}
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

              {/* Nuvolosità giornaliera + Delta termico */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/20 text-[11px]">
                <span className="text-slate-400">
                  ☁️ {day.avgCloud != null ? day.avgCloud : "--"}%
                </span>
                <span className="text-amber-400 font-semibold">
                  Δ {day.thermalDelta != null ? day.thermalDelta.toFixed(1) : "--"}°
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* SEZIONI MATTINA / POMERIGGIO / SERA per il giorno selezionato */}
      {giorniArricchiti[selectedDay] && (
        <div>
          <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-400" />
            Dettaglio {dateLabels[selectedDay]}
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
                <div key={idx} className={`rounded-2xl p-4 border-2 ${bgColor} ${borderColor}`}>
                  {/* Header sezione */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sezione.icon}</span>
                      <div>
                        <div className="text-base font-black text-white">{sezione.label}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{sezione.ore}</div>
                      </div>
                    </div>
                    <span className="text-2xl">{getWeatherIcon(sezione.weatherCode || 0)}</span>
                  </div>

                  {/* Temperatura */}
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl font-black text-amber-300 tabular-nums">{sezione.tempMedia}°</span>
                    <span className="text-xs text-slate-400">media</span>
                  </div>

                  {/* Griglia metriche */}
                  <div className="space-y-2 text-xs">
                    <div className="bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-700/30 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-sky-400" />
                        Vento
                      </span>
                      <span className="font-bold text-sky-200">
                        {sezione.ventoMedia} km/h <span className="text-slate-500 font-normal">(max {sezione.ventoMax})</span>
                      </span>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-700/30 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Cloud className="w-3.5 h-3.5 text-slate-400" />
                        Nuvole
                      </span>
                      <span className="font-bold text-slate-200">{sezione.nuvoleMedia}%</span>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-700/30 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-blue-400" />
                        Umidità
                      </span>
                      <span className="font-bold text-blue-200">{sezione.umiditaMedia}%</span>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl px-3 py-2 border border-slate-700/30 flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                        Pioggia
                      </span>
                      <span className="font-bold text-blue-200">{sezione.pioggia} mm</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RIEPILOGO GIORNALIERO COMPLETO */}
      {currentData && (
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
      )}
    </div>
  );
}