"use client";

import React, { useMemo, useState } from "react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import { getVoloStatus } from "@/utils/volo";
import { Calendar, MapPin, Wind, Droplets, Thermometer, Eye, Sun, Cloud, Zap } from "lucide-react";

interface HourlyTableProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
  dayLabel?: string;
  siteName?: string;
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED WEATHER ICONS — CSS animations for sun & clouds
   ═══════════════════════════════════════════════════════════ */

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="12" fill="#FBBF24" className="animate-pulse" style={{ animationDuration: "2s" }} />
      <g className="animate-spin" style={{ animationDuration: "8s", transformOrigin: "32px 32px" }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
          <line key={i} x1="32" y1="8" x2="32" y2="16" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round"
            transform={`rotate(${deg} 32 32)`} />
        ))}
      </g>
    </svg>
  );
}

function CloudIcon({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  const fill = dark ? "#94A3B8" : "#E2E8F0";
  const stroke = dark ? "#64748B" : "#94A3B8";
  return (
    <svg className={className} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M44 36H16a12 12 0 0 1-1.5-23.8A16 16 0 0 1 42 10a12 12 0 0 1 2 26z"
        fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round"
        className="animate-bounce" style={{ animationDuration: "3s" }} />
    </svg>
  );
}

function SunCloudIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="20" r="10" fill="#FBBF24" className="animate-pulse" style={{ animationDuration: "2.5s" }} />
      <g className="animate-spin" style={{ animationDuration: "10s", transformOrigin: "22px 20px" }}>
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <line key={i} x1="22" y1="5" x2="22" y2="10" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"
            transform={`rotate(${deg} 22 20)`} />
        ))}
      </g>
      <path d="M52 38H20a10 10 0 0 1-1.2-19.9A13 13 0 0 1 44 16a10 10 0 0 1 8 22z"
        fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" strokeLinejoin="round"
        className="animate-bounce" style={{ animationDuration: "4s" }} />
    </svg>
  );
}

function RainIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M48 28H14a10 10 0 0 1-1.2-19.9A13 13 0 0 1 38 8a10 10 0 0 1 10 20z"
        fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" strokeLinejoin="round" />
      {[20, 28, 36].map((x, i) => (
        <line key={i} x1={x} y1="32" x2={x - 3} y2="42" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round"
          className="animate-bounce" style={{ animationDelay: `${i * 0.2}s`, animationDuration: "1s" }} />
      ))}
    </svg>
  );
}

function StormIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M48 26H14a10 10 0 0 1-1.2-19.9A13 13 0 0 1 38 6a10 10 0 0 1 10 20z"
        fill="#64748B" stroke="#475569" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="30,28 24,40 32,40 28,50 40,36 32,36 36,28" fill="#FBBF24" className="animate-pulse" style={{ animationDuration: "0.6s" }} />
    </svg>
  );
}

function SnowIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M48 26H14a10 10 0 0 1-1.2-19.9A13 13 0 0 1 38 6a10 10 0 0 1 10 20z"
        fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" strokeLinejoin="round" />
      {[18, 26, 34].map((cx, i) => (
        <circle key={i} cx={cx} cy={38 + (i % 2) * 4} r="2" fill="#BAE6FD"
          className="animate-bounce" style={{ animationDelay: `${i * 0.3}s`, animationDuration: "1.5s" }} />
      ))}
    </svg>
  );
}

function FogIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {[14, 22, 30, 38].map((y, i) => (
        <line key={i} x1={8 + i * 2} y1={y} x2={56 - i * 2} y2={y} stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" opacity={0.6 - i * 0.1}
          className="animate-pulse" style={{ animationDelay: `${i * 0.2}s`, animationDuration: "3s" }} />
      ))}
    </svg>
  );
}

function getWeatherAnimation(code: number, className: string) {
  if (code >= 95) return <StormIcon className={className} />;
  if (code >= 80) return <RainIcon className={className} />;
  if (code >= 71) return <SnowIcon className={className} />;
  if (code >= 61) return <RainIcon className={className} />;
  if (code >= 51) return <RainIcon className={className} />;
  if (code >= 45) return <FogIcon className={className} />;
  if (code >= 30) return <CloudIcon className={className} dark />;
  if (code >= 20) return <CloudIcon className={className} />;
  if (code >= 10) return <SunCloudIcon className={className} />;
  if (code >= 3) return <SunCloudIcon className={className} />;
  return <SunIcon className={className} />;
}

function ventoTesto(speed: number): string {
  if (speed < 3) return "Calma";
  if (speed < 8) return "Leggero";
  if (speed < 15) return "Moderato";
  if (speed < 22) return "Fresco";
  if (speed < 30) return "Forte";
  return "Molto forte";
}

function direzioneVento(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

function uvColor(uv: number) {
  if (uv >= 11) return "text-purple-400";
  if (uv >= 8) return "text-rose-400";
  if (uv >= 6) return "text-orange-400";
  if (uv >= 3) return "text-amber-400";
  return "text-emerald-400";
}

export default function HourlyTable({ dayData, altitude, selectedHour, onHourSelect, dayLabel, siteName }: HourlyTableProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const rows = useMemo(() => {
    const ore = Array.from({ length: 11 }, (_, i) => i + 9);
    return ore.map((ora) => {
      const h = dayData.find(d => d.time.getHours() === ora);
      if (!h) return null;
      const t = calcolaTermiche(h, altitude);
      const v = getVoloStatus(h);
      const now = new Date();
      const oraCorrente = now.getHours();
      const isAdesso = ora === oraCorrente;
      const probPioggia = h.precipitationProba ?? 0;
      const humidity = h.humidity ?? 50;
      const dew = h.dewPoint ?? (h.temperature ?? 18) - 8;
      const pressure = h.pressure ?? 1013;
      const visibility = h.visibility ?? 10000;
      const uv = h.uvIndex ?? 0;
      const cape = h.cape ?? 0;
      const windDir = h.windDir ?? 180;
      const windGusts = h.windGusts ?? 0;

      return {
        ora,
        icona: h.weatherCode,
        temperatura: h.temperature !== null && h.temperature !== undefined ? Math.round(h.temperature) : null,
        feelsLike: h.apparentTemp !== null && h.apparentTemp !== undefined ? Math.round(h.apparentTemp) : null,
        vento: Math.round(h.windSpeed),
        ventoTesto: ventoTesto(h.windSpeed),
        direzione: direzioneVento(windDir),
        windDirDeg: windDir,
        raffiche: windGusts > 0 ? Math.round(windGusts) : null,
        termiche: t.rateo,
        nuvole: Math.round(h.cloudCover),
        nuvoleLow: Math.round(h.cloudCoverLow ?? 0),
        nuvoleMid: Math.round(h.cloudCoverMid ?? 0),
        nuvoleHigh: Math.round(h.cloudCoverHigh ?? 0),
        pioggia: h.precipitation > 0 ? h.precipitation.toFixed(1) : null,
        probPioggia,
        voloIcona: v.icon,
        voloTesto: v.label,
        voloColore: v.color,
        isAdesso,
        humidity,
        dew,
        pressure,
        visibility,
        uv,
        cape,
      };
    }).filter((r): r is NonNullable<typeof r> => r != null);
  }, [dayData, altitude]);

  const dataLabel = useMemo(() => {
    if (dayLabel) return dayLabel;
    if (dayData && dayData.length > 0) {
      const d = dayData[0].time;
      const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
      return `${giorni[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
    }
    return "";
  }, [dayData, dayLabel]);

  if (rows.length === 0) {
    return <div className="text-center py-12 text-slate-400 text-base">Nessun dato disponibile.</div>;
  }

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/30 bg-slate-900/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-wide">Previsioni orarie</h3>
            {siteName && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 mt-0.5">
                <MapPin className="w-3 h-3" />
                {siteName}
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-slate-400 font-medium bg-slate-700/50 px-3 py-1 rounded-full">{dataLabel}</span>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/40 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-3 py-3 text-left font-bold whitespace-nowrap">⏰ Ora</th>
              <th className="px-3 py-3 text-left font-bold whitespace-nowrap">🌤️ Tempo</th>
              <th className="px-3 py-3 text-left font-bold whitespace-nowrap">🌡️ Temp.</th>
              <th className="px-3 py-3 text-left font-bold whitespace-nowrap">💨 Vento</th>
              <th className="px-3 py-3 text-left font-bold whitespace-nowrap">☁️ Nuvole</th>
              <th className="px-3 py-3 text-left font-bold whitespace-nowrap">🌬️ Termiche</th>
              <th className="px-3 py-3 text-left font-bold whitespace-nowrap">💧 Umidità</th>
              <th className="px-3 py-3 text-left font-bold whitespace-nowrap">☀️ UV</th>
              <th className="px-3 py-3 text-left font-bold whitespace-nowrap">🌧️ Pioggia</th>
              <th className="px-3 py-3 text-left font-bold whitespace-nowrap">🛡️ Volo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isSelected = r.ora === selectedHour;
              return (
                <tr
                  key={r.ora}
                  onClick={() => onHourSelect(r.ora)}
                  onMouseEnter={() => setHoveredHour(r.ora)}
                  onMouseLeave={() => setHoveredHour(null)}
                  className={`
                    border-b border-slate-700/20 cursor-pointer transition-all duration-200
                    ${isSelected ? "bg-emerald-900/40 border-emerald-500/50" : "hover:bg-slate-700/40"}
                    ${r.isAdesso ? "bg-emerald-900/20 ring-1 ring-emerald-500/40" : ""}
                    ${hoveredHour === r.ora && !isSelected ? "bg-slate-700/30" : ""}
                  `}
                >
                  {/* Ora */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-black tabular-nums ${r.isAdesso ? "text-emerald-400" : "text-white"}`}>
                        {String(r.ora).padStart(2, "0")}:00
                      </span>
                      {r.isAdesso && (
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-full animate-pulse">
                          ORA
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Weather animation */}
                  <td className="px-3 py-3">
                    <div className="w-12 h-10 flex items-center justify-center">
                      {getWeatherAnimation(r.icona, "w-10 h-10 drop-shadow-lg")}
                    </div>
                  </td>

                  {/* Temperatura + feels like */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span className="text-base font-black text-rose-300 tabular-nums">
                        {r.temperatura !== null ? `${r.temperatura}°` : "—"}
                      </span>
                      {r.feelsLike !== null && (
                        <span className="text-[10px] text-slate-500 font-medium">Percepiti {r.feelsLike}°</span>
                      )}
                    </div>
                  </td>

                  {/* Vento */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <Wind className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="text-sm font-bold text-sky-300 tabular-nums">{r.vento} <span className="text-slate-500 text-xs font-medium">km/h</span></span>
                      </div>
                      <div className="flex items-center gap-1.5 ml-5">
                        <span className="text-xs text-slate-400 font-medium">{r.direzione}</span>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="text-xs text-slate-500">{r.ventoTesto}</span>
                      </div>
                      {r.raffiche !== null && (
                        <div className="ml-5 text-[10px] text-rose-400/70 font-medium">
                          🌪️ {r.raffiche} km/h
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Nuvole con barre */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-black text-slate-200 tabular-nums">{r.nuvole}%</span>
                      <div className="flex gap-0.5 h-1.5">
                        <div className="flex-1 rounded-full bg-sky-500/60" style={{ width: `${r.nuvoleLow}%`, maxWidth: "100%" }} />
                        <div className="flex-1 rounded-full bg-violet-500/60" style={{ width: `${r.nuvoleMid}%`, maxWidth: "100%" }} />
                        <div className="flex-1 rounded-full bg-slate-400/40" style={{ width: `${r.nuvoleHigh}%`, maxWidth: "100%" }} />
                      </div>
                      <div className="flex gap-2 text-[9px] text-slate-500 font-medium">
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />B</span>
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />M</span>
                        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />A</span>
                      </div>
                    </div>
                  </td>

                  {/* Termiche */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <span className={`text-base font-black tabular-nums ${
                        r.termiche > 1.5 ? "text-rose-400" : r.termiche > 1.0 ? "text-violet-400" : "text-sky-400"
                      }`}>
                        ↑{r.termiche.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">m/s</span>
                    </div>
                  </td>

                  {/* Umidità + punto rugiada */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="text-sm font-bold text-sky-300 tabular-nums">{r.humidity}%</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium ml-5">
                        Rdg. {r.dew}°C
                      </span>
                    </div>
                  </td>

                  {/* UV */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className={`text-sm font-black tabular-nums ${uvColor(r.uv)}`}>{r.uv}</span>
                      </div>
                      <div className="w-12 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${r.uv >= 8 ? "bg-rose-500" : r.uv >= 5 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, r.uv * 9)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Pioggia */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        {r.pioggia !== null ? (
                          <>
                            <Cloud className="w-3.5 h-3.5 text-sky-400" />
                            <span className="text-sm font-bold text-sky-300 tabular-nums">{r.pioggia} mm</span>
                          </>
                        ) : (
                          <span className="text-sm text-slate-500 font-medium">—</span>
                        )}
                      </div>
                      {r.probPioggia > 0 && (
                        <div className="flex items-center gap-1.5 ml-5">
                          <span className="text-[10px] text-slate-500 font-medium">Prob:</span>
                          <span className={`text-xs font-black tabular-nums ${
                            r.probPioggia >= 60 ? "text-rose-400" :
                            r.probPioggia >= 30 ? "text-violet-400" :
                            "text-slate-400"
                          }`}>{Math.round(r.probPioggia)}%</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Volo status */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${r.voloColore}`}>
                        <span className="text-sm">{r.voloIcona}</span>
                        {r.voloTesto}
                      </span>
                      {r.cape > 0 && (
                        <span className="text-[9px] text-slate-500 font-medium text-center">
                          CAPE {Math.round(r.cape)}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend footer */}
      <div className="px-5 py-2.5 border-t border-slate-700/30 bg-slate-900/20 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" /> Basse</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" /> Medie</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" /> Alte</span>
        <span className="ml-auto text-slate-600">Clicca su un'ora per dettagli</span>
      </div>
    </div>
  );
}
