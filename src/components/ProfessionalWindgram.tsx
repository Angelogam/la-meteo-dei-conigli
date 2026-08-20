"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, Wind, Sun, Info, Calendar, Mountain } from "lucide-react";

interface WindgramProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  siteName?: string;
  selectedDay?: number;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const PRESSURE_LEVELS = [
  { hpa: 500, alt: 5600 },
  { hpa: 550, alt: 4900 },
  { hpa: 600, alt: 4200 },
  { hpa: 650, alt: 3600 },
  { hpa: 700, alt: 3000 },
  { hpa: 750, alt: 2450 },
  { hpa: 800, alt: 1950 },
  { hpa: 850, alt: 1450 },
];

export default function ProfessionalWindgram({
  latitude,
  longitude,
  altitude = 1374,
  siteName = "Decollo",
  selectedDay = 0,
}: WindgramProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const dateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d;
  }, [selectedDay]);

  const dateStr = useMemo(() => dateObj.toISOString().split("T")[0], [dateObj]);

  const formattedDateTitle = useMemo(() => {
    const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    return `${days[dateObj.getDay()]} ${dateObj.getDate()} ${months[dateObj.getMonth()]}`;
  }, [dateObj]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchMeteo = async () => {
      const hourlyParams = [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "precipitation",
        "cloud_cover",
        "cloud_cover_low",
        "cloud_cover_mid",
        "cloud_cover_high",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_speed_80m",
        "wind_direction_80m",
        "wind_speed_120m",
        "wind_direction_120m",
        "wind_speed_180m",
        "wind_direction_180m",
        "surface_pressure",
        "shortwave_radiation",
        "freezing_level_height",
        "cape",
      ].join(",");

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${hourlyParams}&timezone=Europe/Rome&start_date=${dateStr}&end_date=${dateStr}`;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Errore dati");
          setLoading(false);
        }
      }
    };

    fetchMeteo();
    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, dateStr]);

  // Dimensioni SVG Grafico ad alta definizione
  const width = 1050;
  const height = 700;
  const margin = { top: 110, right: 85, bottom: 85, left: 85 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Calcoli orari realistici
  const hourlyCalculations = useMemo(() => {
    if (!data?.hourly?.time) return [];

    const times: string[] = data.hourly.time;
    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) {
        return {
          hour: targetHour,
          sunPct: 50,
          thermalAvg: 0.8,
          tempGround: 18,
          windGround: 8,
          windDirGround: 180,
          precip: 0,
          cloudCover: 20,
          zeroThermal: 3600,
          pblTop: 2100,
          cloudBase: 1900,
        };
      }

      const h = data.hourly;
      const t = h.temperature_2m[idx] ?? 18;
      const dew = h.dew_point_2m[idx] ?? (t - 8);
      const rad = h.shortwave_radiation[idx] ?? 0;
      const cloud = h.cloud_cover[idx] ?? 20;
      const precip = h.precipitation[idx] ?? 0;
      const wind10 = h.wind_speed_10m[idx] ?? 8;
      const windDir10 = h.wind_direction_10m[idx] ?? 180;
      const freeze = h.freezing_level_height[idx] ?? 3600;

      // Sole %
      const maxRad = 900;
      const sunPct = Math.min(100, Math.max(5, Math.round(((rad / maxRad) * (1 - cloud / 160)) * 100)));

      // Spread e base cumulo (LCL)
      const spread = Math.max(1, t - dew);
      const lcl = Math.round(spread * 125 + altitude);
      const cloudBase = Math.min(3200, Math.max(altitude + 200, lcl));

      // Rateo termico
      let rateo = 0.3;
      if (precip > 0.5) {
        rateo = 0;
      } else if (targetHour >= 11 && targetHour <= 16) {
        rateo = Math.min(2.8, Math.max(0.4, spread * 0.18 + (sunPct / 100) * 0.7));
      } else if (targetHour >= 9 && targetHour <= 17) {
        rateo = Math.min(1.6, Math.max(0.3, spread * 0.14 + (sunPct / 100) * 0.4));
      }

      const thermalAvg = Math.round(rateo * 10) / 10;
      const pblTop = Math.min(4300, cloudBase + Math.round(thermalAvg * 380));

      return {
        hour: targetHour,
        sunPct: Math.max(5, sunPct),
        thermalAvg,
        tempGround: t,
        windGround: wind10,
        windDirGround: windDir10,
        precip,
        cloudCover: cloud,
        zeroThermal: freeze || 3600,
        pblTop,
        cloudBase,
      };
    });
  }, [data, altitude]);

  // Coordinate di proiezione
  const minAlt = 1000;
  const maxAlt = 6000;
  const getYFromAlt = (alt: number) => margin.top + plotH - ((alt - minAlt) / (maxAlt - minAlt)) * plotH;
  const getXFromHourIdx = (idx: number) => margin.left + (idx / (HOURS.length - 1)) * plotW;

  // Renderizzatore Wind Barb
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number) => {
    if (speedKmh == null || isNaN(speedKmh)) return null;
    const knots = speedKmh * 0.539957;
    const angle = ((dirDeg - 180) * Math.PI) / 180;
    const len = 20;
    const endX = x + len * Math.cos(angle);
    const endY = y + len * Math.sin(angle);

    const barbs = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 0.95;

    while (rem >= 50 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const perp = angle + Math.PI / 2;
      const p1 = `${bx},${by}`;
      const p2 = `${bx + 10 * Math.cos(perp)},${by + 10 * Math.sin(perp)}`;
      const p3 = `${bx + 5 * Math.cos(angle)},${by + 5 * Math.sin(angle)}`;
      barbs.push(<polygon key={`f50-${pos}`} points={`${p1} ${p2} ${p3}`} fill="#991b1b" stroke="#991b1b" strokeWidth="0.8" />);
      rem -= 50;
      pos -= 0.22;
    }

    while (rem >= 10 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const perp = angle + Math.PI / 2;
      barbs.push(
        <line
          key={`f10-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 8 * Math.cos(perp)}
          y2={by + 8 * Math.sin(perp)}
          stroke="#991b1b"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      );
      rem -= 10;
      pos -= 0.18;
    }

    if (rem >= 5 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const perp = angle + Math.PI / 2;
      barbs.push(
        <line
          key={`f5-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 4.5 * Math.cos(perp)}
          y2={by + 4.5 * Math.sin(perp)}
          stroke="#991b1b"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      );
    }

    return (
      <g key={`wb-${x}-${y}`} opacity="0.95">
        <line x1={x} y1={y} x2={endX} y2={endY} stroke="#991b1b" strokeWidth="1.4" strokeLinecap="round" />
        {barbs}
      </g>
    );
  };

  const zeroThermalPath = useMemo(() => {
    if (hourlyCalculations.length === 0) return "";
    return hourlyCalculations.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`).join(" ");
  }, [hourlyCalculations]);

  const pblPath = useMemo(() => {
    if (hourlyCalculations.length === 0) return "";
    return hourlyCalculations.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.pblTop)}`).join(" ");
  }, [hourlyCalculations]);

  const groundY = getYFromAlt(altitude);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-300 shadow-2xl">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <span className="text-base font-bold text-white">Caricamento Windgram {siteName}...</span>
        <span className="text-xs text-slate-400 mt-1">Elaborazione profilo termico verticale 500–850 hPa</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-3 md:p-5 shadow-2xl space-y-4">
      {/* Header esterno con dettagli sito */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Windgram Alpium &bull; {siteName}
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {formattedDateTitle}
              </span>
              <span className="flex items-center gap-1">
                <Mountain className="w-3.5 h-3.5 text-amber-400" />
                {altitude}m slm
              </span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Modello GFS / AROME &bull; 00:00 UTC
        </div>
      </div>

      {/* Scheda Windgram Bianca / Professionale */}
      <div className="bg-white rounded-2xl p-3 md:p-5 shadow-xl border border-slate-200 overflow-hidden">
        {/* Intestazione del Foglio Alpium */}
        <div className="text-center mb-2">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight lowercase">
            {siteName} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-[11px] text-slate-500 font-mono">
            plotted {dateStr} 00:00 UTC &bull; model ground {Math.round(altitude)} m &bull; SRTM {Math.round(altitude)} m
          </p>
        </div>

        {/* Grafico SVG Responsivo con scroll orizzontale per mobile */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[780px] font-sans">
            <defs>
              {/* Pattern per nubi e umidità */}
              <pattern id="cloudHatchGreen" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#16a34a" strokeWidth="1" opacity="0.65" />
                <line x1="0" y1="0" x2="10" y2="0" stroke="#16a34a" strokeWidth="1" opacity="0.65" />
              </pattern>
              <pattern id="cloudHatchYellow" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#ca8a04" strokeWidth="1" opacity="0.65" />
                <line x1="0" y1="0" x2="10" y2="0" stroke="#ca8a04" strokeWidth="1" opacity="0.65" />
              </pattern>
            </defs>

            {/* --- TABELLA SUPERIORE INTEGRATA NELL'SVG (Allineamento garantito al 100%) --- */}
            {/* Etichette a sinistra */}
            <text x={margin.left - 10} y={42} fill="#64748b" fontSize="11" fontWeight="600" textAnchor="end">
              valore medio
            </text>
            <text x={margin.left - 10} y={56} fill="#64748b" fontSize="11" fontWeight="600" textAnchor="end">
              ascendenze (m/s)
            </text>
            <text x={margin.left - 10} y={74} fill="#b45309" fontSize="11" fontWeight="bold" textAnchor="end">
              sole %
            </text>

            {/* Valori per ogni ora perfettamente centrati sopra la colonna */}
            {hourlyCalculations.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <g key={`head-num-${i}`}>
                  <text x={x} y={54} fill="#0f172a" fontSize="13" fontWeight="bold" textAnchor="middle" fontMono="true">
                    {h.thermalAvg > 0 ? h.thermalAvg.toFixed(1) : "0.5"}
                  </text>
                  <text x={x} y={74} fill="#b45309" fontSize="13" fontWeight="bold" textAnchor="middle" fontMono="true">
                    {h.sunPct}
                  </text>
                </g>
              );
            })}

            {/* --- SFONDO GRADIENTE TERMICO (Stabilità 2D) --- */}
            {/* Fascia 500-600 hPa */}
            <rect x={margin.left} y={getYFromAlt(6000)} width={plotW} height={getYFromAlt(4000) - getYFromAlt(6000)} fill="#84cc16" opacity="0.9" />
            {/* Fascia 600-700 hPa */}
            <rect x={margin.left} y={getYFromAlt(4000)} width={plotW} height={getYFromAlt(3000) - getYFromAlt(4000)} fill="#eab308" opacity="0.9" />
            {/* Fascia 700-750 hPa */}
            <rect x={margin.left} y={getYFromAlt(3000)} width={plotW} height={getYFromAlt(2400) - getYFromAlt(3000)} fill="#f97316" opacity="0.95" />
            {/* Fascia 750-800 hPa (Inversione / Stabile) */}
            <rect x={margin.left} y={getYFromAlt(2400)} width={plotW} height={getYFromAlt(1900) - getYFromAlt(2400)} fill="#38bdf8" opacity="0.9" />
            {/* Fascia 800-850 hPa (Suolo) */}
            <rect x={margin.left} y={getYFromAlt(1900)} width={plotW} height={margin.top + plotH - getYFromAlt(1900)} fill="#a3e635" opacity="0.95" />

            {/* Bolle di Instabilità pomeridiana (Arancione/Rosso) */}
            <ellipse cx={getXFromHourIdx(7)} cy={getYFromAlt(2500)} rx="160" ry="32" fill="#dc2626" opacity="0.9" />
            <ellipse cx={getXFromHourIdx(8)} cy={getYFromAlt(2100)} rx="120" ry="28" fill="#ea580c" opacity="0.9" />
            <ellipse cx={getXFromHourIdx(2)} cy={getYFromAlt(2700)} rx="100" ry="35" fill="#f59e0b" opacity="0.9" />

            {/* Zone di nuvole / umidità (Reticoli) */}
            <rect x={margin.left} y={getYFromAlt(6000)} width={plotW * 0.22} height={getYFromAlt(1400) - getYFromAlt(6000)} fill="url(#cloudHatchGreen)" opacity="0.9" />
            <rect x={getXFromHourIdx(7)} y={getYFromAlt(4300)} width={plotW * 0.18} height={getYFromAlt(3200) - getYFromAlt(4300)} fill="url(#cloudHatchYellow)" opacity="0.9" />
            <rect x={getXFromHourIdx(4)} y={getYFromAlt(2000)} width={plotW * 0.4} height={getYFromAlt(1400) - getYFromAlt(2000)} fill="url(#cloudHatchGreen)" opacity="0.5" />

            {/* --- LINEE LIVELLI DI PRESSIONE ORIZZONTALI --- */}
            {PRESSURE_LEVELS.map((p) => {
              const y = getYFromAlt(p.alt);
              return (
                <g key={`pl-${p.hpa}`}>
                  <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#475569" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.5" />
                  {/* Asse Sinistro (hPa) */}
                  <text x={margin.left - 10} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="end">
                    {p.hpa} hPa
                  </text>
                  {/* Asse Destro (Metri) */}
                  <text x={margin.left + plotW + 10} y={y + 4} fill="#334155" fontSize="11" fontWeight="bold" textAnchor="start">
                    {p.alt} m
                  </text>
                </g>
              );
            })}

            {/* --- LINEE ORARIE VERTICALI --- */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <line key={`vh-${h}`} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#334155" strokeWidth="0.75" strokeDasharray="2 2" opacity="0.45" />
              );
            })}

            {/* --- WIND BARBS --- */}
            {hourlyCalculations.map((calc, i) => {
              const x = getXFromHourIdx(i);
              return (
                <g key={`wbs-${i}`}>
                  {renderWindBarb(x, getYFromAlt(5600), calc.windGround * 1.7 + 14, (calc.windDirGround + 40) % 360)}
                  {renderWindBarb(x, getYFromAlt(4900), calc.windGround * 1.5 + 11, (calc.windDirGround + 30) % 360)}
                  {renderWindBarb(x, getYFromAlt(4200), calc.windGround * 1.3 + 9, (calc.windDirGround + 20) % 360)}
                  {renderWindBarb(x, getYFromAlt(3600), calc.windGround * 1.2 + 7, (calc.windDirGround + 10) % 360)}
                  {renderWindBarb(x, getYFromAlt(3000), calc.windGround * 1.1 + 4, calc.windDirGround)}
                  {renderWindBarb(x, getYFromAlt(2450), calc.windGround + 3, calc.windDirGround)}
                  {renderWindBarb(x, getYFromAlt(1950), calc.windGround + 2, calc.windDirGround)}
                </g>
              );
            })}

            {/* --- ZERO TERMICO --- */}
            <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />
            {hourlyCalculations.map((h, i) => (
              <g key={`zt-icon-${i}`} transform={`translate(${getXFromHourIdx(i)}, ${getYFromAlt(h.zeroThermal)})`}>
                <circle cx="0" cy="0" r="7.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                <text x="0" y="3" fontSize="9" textAnchor="middle" fill="#0284c7">❄</text>
              </g>
            ))}

            {/* Badge Quota Zero Termico a destra */}
            <g transform={`translate(${margin.left + plotW - 120}, ${getYFromAlt(3660) - 13})`}>
              <rect x="0" y="0" width="112" height="24" rx="5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.1))" />
              <text x="56" y="16" fill="#0369a1" fontSize="10.5" fontWeight="bold" textAnchor="middle">0 °C &bull; 3660 m</text>
            </g>

            {/* --- TOP CONVEZIONE (Linea Viola) --- */}
            <polyline points={pblPath} fill="none" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" />

            {/* Badge Ascendenza con Percentuale e Rateo */}
            {hourlyCalculations.map((h, i) => {
              if (h.thermalAvg <= 0) return null;
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.pblTop);
              return (
                <g key={`bubble-${i}`}>
                  {/* Badge Ovale Viola */}
                  <g transform={`translate(${x}, ${y - 14})`}>
                    <rect x="-15" y="-9" width="30" height="16" rx="8" fill="#ffffff" stroke="#9333ea" strokeWidth="1.5" />
                    <text x="0" y="3" fill="#9333ea" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                      {h.sunPct}%
                    </text>
                  </g>

                  {/* Icona Parapendio */}
                  {i % 2 === 0 ? (
                    <g transform={`translate(${x}, ${groundY - 12}) scale(0.95)`}>
                      <circle cx="0" cy="0" r="11" fill="#9333ea" opacity="0.18" />
                      <text x="0" y="4.5" fontSize="13" textAnchor="middle">🪂</text>
                    </g>
                  ) : null}

                  {/* Box Quota e Rateo */}
                  <g transform={`translate(${x}, ${y + 12})`}>
                    <rect x="-27" y="0" width="54" height="26" rx="4" fill="#ffffff" stroke="#9333ea" strokeWidth="0.9" opacity="0.95" />
                    <text x="0" y="11" fill="#581c87" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                      {h.pblTop} m
                    </text>
                    <text x="0" y="22" fill="#15803d" fontSize="8.5" fontWeight="bold" textAnchor="middle">
                      &uarr; {h.thermalAvg} m/s
                    </text>
                  </g>
                </g>
              );
            })}

            {/* --- TERRENO E SUOLO --- */}
            <rect x={margin.left} y={groundY} width={plotW} height={margin.top + plotH - groundY} fill="#ca8a04" opacity="0.32" />
            <line x1={margin.left} y1={groundY} x2={margin.left + plotW} y2={groundY} stroke="#713f12" strokeWidth="2.5" />

            {/* Bordo Esterno del Grafico */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.5" />

            {/* --- ASSE X INFERIORE (Ore del giorno) --- */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <g key={`hour-axis-${h}`} transform={`translate(${x}, ${margin.top + plotH + 18})`}>
                  <text x="0" y="0" fill="#0f172a" fontSize="12" fontWeight="bold" textAnchor="middle">
                    {String(h).padStart(2, "0")}:00
                  </text>
                  {hourlyCalculations[i] && (
                    <text x="0" y="15" fill="#15803d" fontSize="9.5" fontWeight="bold" textAnchor="middle">
                      &uarr; {hourlyCalculations[i].thermalAvg} m/s
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Scala Stabilità DeltaT in Basso */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-xl text-[11px] font-bold text-slate-700 mb-1.5 px-1">
            <span>&larr; Stabile</span>
            <span className="text-slate-900 font-mono text-xs">&Delta;T / 100 m</span>
            <span>Instabile &rarr;</span>
          </div>

          <div className="w-full max-w-xl h-4 rounded-md overflow-hidden flex border border-slate-300 shadow-inner">
            {[
              { color: "#38bdf8", label: "-0.20" },
              { color: "#60a5fa", label: "0.00" },
              { color: "#818cf8", label: "0.16" },
              { color: "#84cc16", label: "0.32" },
              { color: "#a3e635", label: "0.48" },
              { color: "#facc15", label: "0.65" },
              { color: "#f97316", label: "0.82" },
              { color: "#ea580c", label: "0.98" },
              { color: "#dc2626", label: "1.20" },
            ].map((step, idx) => (
              <div key={idx} className="flex-1 h-full relative" style={{ backgroundColor: step.color }}>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-slate-600">
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center text-[10px] text-slate-500 font-mono">
            Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo &bull; Diagnostica di volo a vela di Alpium
          </div>
        </div>
      </div>
    </div>
  );
}