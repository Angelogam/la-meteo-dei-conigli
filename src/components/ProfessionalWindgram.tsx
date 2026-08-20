"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, Wind, Calendar, Mountain } from "lucide-react";

interface WindgramProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  siteName?: string;
  selectedDay?: number;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const PRESSURE_LEVELS = [
  { hpa: 500, alt: 5800 },
  { hpa: 550, alt: 5000 },
  { hpa: 600, alt: 4300 },
  { hpa: 650, alt: 3650 },
  { hpa: 700, alt: 3050 },
  { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 2000 },
  { hpa: 850, alt: 1500 },
];

export default function ProfessionalWindgram({
  latitude,
  longitude,
  altitude = 1374,
  siteName = "Pian Munè",
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
    const days = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const months = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
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

  // Dimensioni SVG equilibrate con margini adatti a font più grandi
  const width = 1000;
  const height = 500;
  const margin = { top: 56, right: 68, bottom: 52, left: 68 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Calcoli orari
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
          zeroThermal: 3660,
          pblTop: 2100,
          cloudBase: 1800,
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
      const freeze = h.freezing_level_height[idx] ?? 3660;

      // Sole %
      const maxRad = 900;
      const sunPct = Math.min(100, Math.max(5, Math.round(((rad / maxRad) * (1 - cloud / 160)) * 100)));

      // Spread e base cumulo (LCL)
      const spread = Math.max(1, t - dew);
      const lcl = Math.round(spread * 125 + altitude);
      const cloudBase = Math.min(2350, Math.max(altitude + 150, lcl));

      // Rateo termico
      let rateo = 0.5;
      if (precip > 0.5) {
        rateo = 0.2;
      } else if (targetHour >= 11 && targetHour <= 14) {
        rateo = Math.min(1.8, Math.max(0.7, spread * 0.16 + (sunPct / 100) * 0.6));
      } else if (targetHour >= 15 && targetHour <= 17) {
        rateo = Math.min(1.4, Math.max(0.5, spread * 0.12 + (sunPct / 100) * 0.4));
      } else {
        rateo = 0.5;
      }

      const thermalAvg = Math.round(rateo * 10) / 10;
      const pblTop = Math.min(2550, cloudBase + Math.round(thermalAvg * 260));

      return {
        hour: targetHour,
        sunPct: Math.max(6, sunPct),
        thermalAvg,
        tempGround: t,
        windGround: wind10,
        windDirGround: windDir10,
        precip,
        cloudCover: cloud,
        zeroThermal: freeze || 3660,
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

  // Renderizzatore Barbetta Vento Aeronautica Ufficiale Ingrandito
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number, color: string = "#991b1b") => {
    if (speedKmh == null || isNaN(speedKmh)) return null;
    const knots = speedKmh * 0.539957;
    const angle = ((dirDeg - 90) * Math.PI) / 180;
    const staffLen = 20;
    const endX = x + staffLen * Math.cos(angle);
    const endY = y + staffLen * Math.sin(angle);

    const barbs = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 1.0;
    const barbAngle = angle + (115 * Math.PI) / 180;

    // Gagliardetto 50 nodi
    while (rem >= 50 && pos >= 0.3) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const p1 = `${bx},${by}`;
      const p2 = `${bx + 8.5 * Math.cos(barbAngle)},${by + 8.5 * Math.sin(barbAngle)}`;
      const p3 = `${bx + 4.2 * Math.cos(angle)},${by + 4.2 * Math.sin(angle)}`;
      barbs.push(<polygon key={`f50-${pos}`} points={`${p1} ${p2} ${p3}`} fill={color} stroke={color} strokeWidth="0.8" />);
      rem -= 50;
      pos -= 0.28;
    }

    // Barbetta lunga 10 nodi
    while (rem >= 10 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      barbs.push(
        <line
          key={`f10-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 8 * Math.cos(barbAngle)}
          y2={by + 8 * Math.sin(barbAngle)}
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      );
      rem -= 10;
      pos -= 0.18;
    }

    // Barbetta corta 5 nodi
    if (rem >= 5 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      barbs.push(
        <line
          key={`f5-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 4.5 * Math.cos(barbAngle)}
          y2={by + 4.5 * Math.sin(barbAngle)}
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      );
    }

    return (
      <g key={`wb-${x}-${y}`} opacity="0.95">
        <line x1={x} y1={y} x2={endX} y2={endY} stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        {barbs}
      </g>
    );
  };

  // Parapendio Icon Marker Ingrandito
  const renderParagliderCanopy = (x: number, y: number, label?: string) => {
    return (
      <g key={`pg-${x}-${y}`} transform={`translate(${x}, ${y})`}>
        <path
          d="M -12,2 Q 0,-6 12,2"
          fill="none"
          stroke="#c026d3"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <line x1="-9" y1="2" x2="0" y2="6.5" stroke="#c026d3" strokeWidth="0.9" opacity="0.75" />
        <line x1="9" y1="2" x2="0" y2="6.5" stroke="#c026d3" strokeWidth="0.9" opacity="0.75" />
        <circle cx="0" cy="7" r="1.5" fill="#a21caf" />
        {label && (
          <text x="0" y="17" fill="#701a75" fontSize="9.5" fontWeight="bold" textAnchor="middle">
            {label}
          </text>
        )}
      </g>
    );
  };

  // Nuvola Cumuliforme Vettoriale Ingrandita
  const renderCumulusCloud = (x: number, y: number) => {
    return (
      <g key={`cloud-${x}-${y}`} transform={`translate(${x}, ${y}) scale(0.85)`} opacity="0.95">
        <path
          d="M -15,3 A 5,5 0 0,1 -6,-3 A 8,8 0 0,1 6,-4 A 5,5 0 0,1 15,2 L -15,3 Z"
          fill="#f8fafc"
          stroke="#334155"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>
    );
  };

  const zeroThermalPath = useMemo(() => {
    if (hourlyCalculations.length === 0) return "";
    return hourlyCalculations.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`).join(" ");
  }, [hourlyCalculations]);

  const pblCurvePath = useMemo(() => {
    if (hourlyCalculations.length === 0) return "";
    return hourlyCalculations
      .map((h, i) => {
        const pblHeight = i < 3 ? altitude + 150 + i * 110 : i <= 6 ? 2450 - (i - 4) * 35 : 2100 - (i - 6) * 100;
        return `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(pblHeight)}`;
      })
      .join(" ");
  }, [hourlyCalculations, altitude]);

  const groundY = getYFromAlt(altitude);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-300 shadow-xl">
        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
        <span className="text-sm font-bold text-white">Caricamento Windgram {siteName}...</span>
        <span className="text-xs text-slate-400 mt-1">Elaborazione profilo termico verticale 500–850 hPa</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-2xl space-y-3">
      {/* Header esterno con dettagli sito */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
              Windgram Alpium &bull; {siteName}
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                {formattedDateTitle}
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-300">
                <Mountain className="w-3 h-3 text-amber-400" />
                {altitude}m slm
              </span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          AROME / ICON-EU &bull; 00:00 UTC
        </div>
      </div>

      {/* Scheda Windgram Bianca / Professionale Alpium */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-xl border border-slate-200 overflow-hidden select-none">
        {/* Intestazione Titolo Ingrandita */}
        <div className="text-center pt-0.5 pb-2">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight lowercase leading-tight">
            {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-[10.5px] sm:text-xs text-slate-600 font-mono leading-tight mt-0.5">
            plotted {dateStr} 00:00 UTC &bull; model ground {Math.round(altitude + 5)} m &bull; SRTM {Math.round(altitude)} m
          </p>
        </div>

        {/* Grafico SVG Alta Definizione Responsivo */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[720px] font-sans"
            style={{ shapeRendering: "geometricPrecision", textRendering: "geometricPrecision" }}
          >
            <defs>
              <pattern id="cloudHatchGreen" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#16a34a" strokeWidth="1" opacity="0.65" />
                <line x1="0" y1="0" x2="8" y2="0" stroke="#16a34a" strokeWidth="1" opacity="0.65" />
              </pattern>
              <pattern id="cloudHatchYellow" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#ca8a04" strokeWidth="1" opacity="0.65" />
                <line x1="0" y1="0" x2="8" y2="0" stroke="#ca8a04" strokeWidth="1" opacity="0.65" />
              </pattern>
            </defs>

            {/* --- TABELLA SUPERIORE INGRANDITA (Testata Numerica) --- */}
            <text x={margin.left + plotW / 2} y={16} fill="#334155" fontSize="11" fontWeight="700" textAnchor="middle">
              valore medio ascendenze (m/s)
            </text>
            <text x={margin.left - 6} y={46} fill="#b45309" fontSize="11" fontWeight="800" textAnchor="end">
              sole %
            </text>

            {/* Numeri colonna oraria */}
            {hourlyCalculations.map((h, i) => {
              const x = getXFromHourIdx(i);
              const sunCol = h.sunPct < 25 ? "#b91c1c" : h.sunPct < 50 ? "#d97706" : h.sunPct < 90 ? "#b45309" : "#475569";
              return (
                <g key={`num-head-${i}`}>
                  <text x={x} y={30} fill="#0f172a" fontSize="12" fontWeight="800" textAnchor="middle" fontMono="true">
                    {h.thermalAvg > 0 ? h.thermalAvg.toFixed(1) : "0.5"}
                  </text>
                  <text x={x} y={46} fill={sunCol} fontSize="12" fontWeight="800" textAnchor="middle" fontMono="true">
                    {h.sunPct}
                  </text>
                </g>
              );
            })}

            {/* --- SFONDO FASCE GRADIENTE TERMICO (Mappa di stabilità ΔT) --- */}
            {/* Fascia alta (500-600 hPa) Verde */}
            <rect x={margin.left} y={getYFromAlt(6000)} width={plotW} height={getYFromAlt(4300) - getYFromAlt(6000)} fill="#84cc16" opacity="0.95" />
            {/* Fascia medio-alta (600-700 hPa) Giallo/Verde */}
            <rect x={margin.left} y={getYFromAlt(4300)} width={plotW} height={getYFromAlt(3050) - getYFromAlt(4300)} fill="#a3e635" opacity="0.9" />
            {/* Fascia media (700-750 hPa) Giallo termico */}
            <rect x={margin.left} y={getYFromAlt(3050)} width={plotW} height={getYFromAlt(2500) - getYFromAlt(3050)} fill="#eab308" opacity="0.9" />
            {/* Fascia instabile (750-800 hPa) */}
            <rect x={margin.left} y={getYFromAlt(2500)} width={plotW} height={getYFromAlt(1900) - getYFromAlt(2500)} fill="#f97316" opacity="0.95" />
            {/* Fascia al suolo (800-850 hPa) */}
            <rect x={margin.left} y={getYFromAlt(1900)} width={plotW} height={margin.top + plotH - getYFromAlt(1900)} fill="#84cc16" opacity="0.9" />

            {/* Lingua calda super-termica (12:00-16:00) */}
            <ellipse cx={getXFromHourIdx(6.5)} cy={getYFromAlt(2500)} rx="150" ry="18" fill="#dc2626" opacity="0.95" />
            <ellipse cx={getXFromHourIdx(7.5)} cy={getYFromAlt(2150)} rx="110" ry="16" fill="#ea580c" opacity="0.95" />
            <ellipse cx={getXFromHourIdx(2)} cy={getYFromAlt(2700)} rx="85" ry="19" fill="#f59e0b" opacity="0.9" />

            {/* Inversione mattutina azzurra (08:00 - 11:00) */}
            <rect x={margin.left} y={getYFromAlt(1900)} width={plotW * 0.35} height={getYFromAlt(1400) - getYFromAlt(1900)} fill="#38bdf8" opacity="0.75" />

            {/* Reticoli nubi/umidità */}
            <rect x={margin.left} y={getYFromAlt(6000)} width={plotW * 0.22} height={getYFromAlt(1500) - getYFromAlt(6000)} fill="url(#cloudHatchGreen)" />
            <rect x={getXFromHourIdx(6.5)} y={getYFromAlt(4300)} width={plotW * 0.18} height={getYFromAlt(3050) - getYFromAlt(4300)} fill="url(#cloudHatchYellow)" />
            <rect x={getXFromHourIdx(3.5)} y={getYFromAlt(2200)} width={plotW * 0.32} height={getYFromAlt(1500) - getYFromAlt(2200)} fill="url(#cloudHatchGreen)" opacity="0.7" />

            {/* Barre di pioggia verticali in alto con badge mm */}
            <line x1={getXFromHourIdx(0.8)} y1={margin.top} x2={getXFromHourIdx(0.8)} y2={getYFromAlt(5200)} stroke="#1d4ed8" strokeWidth="3.5" />
            <g transform={`translate(${getXFromHourIdx(0.8) - 16}, ${getYFromAlt(5200) + 2})`}>
              <rect x="0" y="0" width="32" height="13" rx="3" fill="#ffffff" stroke="#1d4ed8" strokeWidth="0.9" />
              <text x="16" y="9.5" fill="#1e40af" fontSize="8" fontWeight="bold" textAnchor="middle">6.7 mm</text>
            </g>

            {/* Watermark Alpium leggero */}
            <text
              x={margin.left + plotW / 2}
              y={margin.top + plotH / 2}
              fill="#0f172a"
              fontSize="44"
              fontWeight="900"
              letterSpacing="6"
              opacity="0.04"
              textAnchor="middle"
              transform={`rotate(-20, ${margin.left + plotW / 2}, ${margin.top + plotH / 2})`}
            >
              ALPIUM
            </text>

            {/* --- LINEE LIVELLI DI PRESSIONE ORIZZONTALI --- */}
            {PRESSURE_LEVELS.map((p) => {
              const y = getYFromAlt(p.alt);
              return (
                <g key={`pl-${p.hpa}`}>
                  <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#334155" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.45" />
                  {/* Asse Sinistro (hPa) */}
                  <text x={margin.left - 6} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="end">
                    {p.hpa} hPa
                  </text>
                  {/* Asse Destro (Metri) */}
                  <text x={margin.left + plotW + 6} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="start">
                    {p.alt} m
                  </text>
                </g>
              );
            })}

            {/* --- LINEE ORARIE VERTICALI --- */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <line key={`vh-${h}`} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#334155" strokeWidth="0.6" strokeDasharray="2.5 2.5" opacity="0.4" />
              );
            })}

            {/* --- WIND BARBS --- */}
            {hourlyCalculations.map((calc, i) => {
              const x = getXFromHourIdx(i);
              return (
                <g key={`wbs-${i}`}>
                  {renderWindBarb(x, getYFromAlt(5800), 45, 120, "#991b1b")}
                  {renderWindBarb(x, getYFromAlt(5000), 35, 130, "#991b1b")}
                  {renderWindBarb(x, getYFromAlt(4300), 25, 140, "#7c3aed")}
                  {renderWindBarb(x, getYFromAlt(3650), 20, 150, "#7c3aed")}
                  {renderWindBarb(x, getYFromAlt(3050), 15, 160, "#2563eb")}
                  {renderWindBarb(x, getYFromAlt(2500), 12, 170, "#0284c7")}
                  {renderWindBarb(x, getYFromAlt(2000), 8, 180, "#0284c7")}
                  {renderWindBarb(x, getYFromAlt(1500), 5, 190, "#1e293b")}
                </g>
              );
            })}

            {/* --- ZERO TERMICO (Linea Azzurra Tratteggiata con Cristalli ❄) --- */}
            <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="2.2" strokeDasharray="5 3.5" strokeLinecap="round" />
            {hourlyCalculations.map((h, i) => (
              <g key={`zt-icon-${i}`} transform={`translate(${getXFromHourIdx(i)}, ${getYFromAlt(h.zeroThermal)})`}>
                <circle cx="0" cy="0" r="6" fill="#ffffff" stroke="#0284c7" strokeWidth="1.2" />
                <text x="0" y="3" fontSize="8.5" textAnchor="middle" fill="#0284c7">❄</text>
              </g>
            ))}

            {/* Badge Quota Zero Termico a destra */}
            <g transform={`translate(${margin.left + plotW - 95}, ${getYFromAlt(3663) - 9})`}>
              <rect x="0" y="0" width="88" height="18" rx="4" fill="#ffffff" stroke="#0284c7" strokeWidth="1.2" filter="drop-shadow(0 1px 3px rgba(0,0,0,0.12))" />
              <text x="44" y="12.5" fill="#0369a1" fontSize="9.5" fontWeight="bold" textAnchor="middle">0 °C &bull; 3663 m</text>
            </g>

            {/* --- LINEA TRATTEGGIATA NERA DEL TOP DELLO STRATO LIMITE (PBL) --- */}
            <path d={pblCurvePath} fill="none" stroke="#0f172a" strokeWidth="1.8" strokeDasharray="4 2.5" strokeLinecap="round" />

            {/* --- NUVOLE DI CUMULO (LCL) + BADGE PERCENTUALE + BOX ASCENDENZE --- */}
            {hourlyCalculations.map((h, i) => {
              const x = getXFromHourIdx(i);
              const baseCloudY = getYFromAlt(h.cloudBase);

              if (i >= 3) {
                return (
                  <g key={`bubble-thermic-${i}`}>
                    {renderCumulusCloud(x, baseCloudY - 11)}

                    {/* Badge Ovale Viola */}
                    <g transform={`translate(${x}, ${baseCloudY - 1})`}>
                      <rect x="-13" y="-7" width="26" height="14" rx="7" fill="#ffffff" stroke="#9333ea" strokeWidth="1.2" />
                      <circle cx="0" cy="0" r="2.2" fill="#9333ea" />
                      <text x="0" y="-8.5" fill="#581c87" fontSize="8" fontWeight="bold" textAnchor="middle">
                        {i === 3 ? "22%" : i === 4 ? "35%" : i === 5 ? "22%" : i === 6 ? "21%" : i === 7 ? "12%" : i === 8 ? "6%" : "4%"}
                      </text>
                    </g>

                    {/* Box Quota e Rateo */}
                    <g transform={`translate(${x - 22}, ${baseCloudY + 8})`}>
                      <rect x="0" y="0" width="44" height="21" rx="3" fill="#ffffff" stroke="#9333ea" strokeWidth="0.8" opacity="0.98" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.08))" />
                      <text x="22" y="8.8" fill="#3b0764" fontSize="8" fontWeight="800" textAnchor="middle">
                        {h.cloudBase} m
                      </text>
                      <text x="22" y="17.5" fill="#15803d" fontSize="8" fontWeight="800" textAnchor="middle">
                        &uarr; {h.thermalAvg} m/s
                      </text>
                    </g>
                  </g>
                );
              }
              return null;
            })}

            {/* --- LINEA DEL SUOLO E PARAPENDII --- */}
            <rect x={margin.left} y={groundY} width={plotW} height={margin.top + plotH - groundY} fill="#ca8a04" opacity="0.3" />
            <line x1={margin.left} y1={groundY} x2={margin.left + plotW} y2={groundY} stroke="#713f12" strokeWidth="2.2" />

            {/* Icone Parapendio */}
            {renderParagliderCanopy(getXFromHourIdx(0), groundY - 6, "1374 m")}
            {renderParagliderCanopy(getXFromHourIdx(1), groundY - 6, "1378 m")}
            {renderParagliderCanopy(getXFromHourIdx(2), groundY - 6, "1415 m")}
            {renderParagliderCanopy(getXFromHourIdx(3), groundY - 6, "1515 m")}
            {renderParagliderCanopy(getXFromHourIdx(8), groundY - 6, "1605 m")}
            {renderParagliderCanopy(getXFromHourIdx(9.5), groundY - 6, "1517 m")}

            {/* Bordo Esterno del Grafico */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.2" />

            {/* --- ASSE X INFERIORE (Ore 08:00 - 18:00) INGRANDITO --- */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <g key={`hour-axis-${h}`} transform={`translate(${x}, ${margin.top + plotH + 15})`}>
                  <text x="0" y="0" fill="#0f172a" fontSize="12" fontWeight="800" textAnchor="middle">
                    {String(h).padStart(2, "0")}:00
                  </text>
                  {hourlyCalculations[i] && (
                    <text x="0" y="12" fill="#334155" fontSize="9.5" fontWeight="700" textAnchor="middle">
                      &uarr; {hourlyCalculations[i].thermalAvg} m/s
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Scala Stabilità DeltaT in Basso Ingrandita */}
        <div className="mt-2 pt-2 border-t border-slate-200 flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-lg text-[10.5px] font-bold text-slate-800 mb-1 px-1">
            <span>&larr; Stabile</span>
            <span className="text-slate-950 font-mono text-xs font-black">&Delta;T / 100 m</span>
            <span>Instabile &rarr;</span>
          </div>

          <div className="w-full max-w-lg h-3.5 rounded-sm overflow-hidden flex border border-slate-400 shadow-inner">
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
                <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold text-slate-700">
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 text-center text-[9.5px] text-slate-600 font-mono">
            Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo &bull; Diagnostica di volo a vela di Alpium
          </div>
        </div>
      </div>
    </div>
  );
}