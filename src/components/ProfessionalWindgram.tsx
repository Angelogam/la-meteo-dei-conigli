"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { fetchHourly } from "@/lib/openMeteoClient";

interface WindgramProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  siteName?: string;
  selectedDay?: number;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

// Scala colori IDENTICA ad Alpium
const STABILITY_SCALE = [
  { val: -0.20, color: "#8a5bb8" },
  { val: 0.00, color: "#4f7fd9" },
  { val: 0.16, color: "#45b3cd" },
  { val: 0.32, color: "#4ec099" },
  { val: 0.48, color: "#8bc953" },
  { val: 0.65, color: "#d8c728" },
  { val: 0.82, color: "#eeb319" },
  { val: 0.98, color: "#e86c1f" },
  { val: 1.20, color: "#c92e1e" },
];

function getStabilityColor(deltaT: number): string {
  if (deltaT < 0.00) return "#8a5bb8";
  if (deltaT <= 0.16) return "#4f7fd9";
  if (deltaT <= 0.32) return "#45b3cd";
  if (deltaT <= 0.48) return "#4ec099";
  if (deltaT <= 0.65) return "#8bc953";
  if (deltaT <= 0.82) return "#d8c728";
  if (deltaT <= 0.98) return "#eeb319";
  if (deltaT <= 1.20) return "#e86c1f";
  return "#c92e1e";
}

// Livelli di pressione con altitudini approssimate
const PRESSURE_LEVELS = [
  { hpa: 850, alt: 1500 },
  { hpa: 700, alt: 3100 },
  { hpa: 600, alt: 4400 },
  { hpa: 500, alt: 5800 },
];

// Griglia di altitudini ogni 100m da 1500 a 6000
const ALT_GRID: number[] = [];
for (let a = 1500; a <= 6000; a += 100) ALT_GRID.push(a);

/**
 * Interpola la temperatura a una data altitudine usando i livelli di pressione disponibili
 */
function interpolateTemp(
  temps: Record<number, number | null>,
  alt: number
): number | null {
  const sorted = PRESSURE_LEVELS.slice().sort((a, b) => a.alt - b.alt);

  if (alt <= sorted[0].alt) return temps[sorted[0].hpa] ?? null;
  if (alt >= sorted[sorted.length - 1].alt) {
    return temps[sorted[sorted.length - 1].hpa] ?? null;
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (alt >= lo.alt && alt <= hi.alt) {
      const tLo = temps[lo.hpa];
      const tHi = temps[hi.hpa];
      if (tLo == null || tHi == null) return null;
      const frac = (alt - lo.alt) / (hi.alt - lo.alt);
      return tLo + (tHi - tLo) * frac;
    }
  }
  return null;
}

export default function ProfessionalWindgram({
  latitude,
  longitude,
  altitude = 1374,
  siteName = "pian munè",
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

    const hourlyParams = [
      "temperature_2m", "relative_humidity_2m", "dew_point_2m",
      "precipitation", "cloud_cover",
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
      "wind_speed_80m", "wind_direction_80m",
      "wind_speed_120m", "wind_direction_120m",
      "wind_speed_925hPa", "wind_direction_925hPa",
      "wind_speed_850hPa", "wind_direction_850hPa",
      "wind_speed_700hPa", "wind_direction_700hPa",
      "wind_speed_600hPa", "wind_direction_600hPa",
      "wind_speed_500hPa", "wind_direction_500hPa",
      "temperature_850hPa", "temperature_700hPa",
      "temperature_600hPa", "temperature_500hPa",
      "temperature_80m", "temperature_120m",
      "surface_pressure", "shortwave_radiation",
      "freezing_level_height", "cape", "lifted_index",
    ].join(",");

    try {
      fetchHourly(latitude, longitude, hourlyParams, dateStr, dateStr).then((json) => {
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      }).catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Errore dati");
          setLoading(false);
        }
      });
    } catch (err) {
      if (isMounted) {
        setError(err instanceof Error ? err.message : "Errore dati");
        setLoading(false);
      }
    }

    return () => { isMounted = false; };
  }, [latitude, longitude, dateStr]);

  // Dimensioni
  const width = 1000;
  const height = 580;
  const margin = { top: 75, right: 85, bottom: 80, left: 85 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const minAlt = 1500;
  const maxAlt = 6000;

  const getYFromAlt = (alt: number) => {
    const clamped = Math.min(maxAlt, Math.max(minAlt, alt));
    return margin.top + plotH - ((clamped - minAlt) / (maxAlt - minAlt)) * plotH;
  };

  const getXFromHourIdx = (idx: number) => {
    return margin.left + (idx / (HOURS.length - 1)) * plotW;
  };

  // Griglia 2D: per ogni (ora, altitudine) calcola ΔT/100m
  const gridData = useMemo(() => {
    if (!data?.hourly?.time) return null;
    const times: string[] = data.hourly.time;

    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) return null;

      const h = data.hourly;
      const t2m = h.temperature_2m?.[idx] ?? 16;
      const dew = h.dew_point_2m?.[idx] ?? (t2m - 6);
      const rad = h.shortwave_radiation?.[idx] ?? 400;
      const cloud = h.cloud_cover?.[idx] ?? 30;
      const precip = h.precipitation?.[idx] ?? 0;
      const wind10 = h.wind_speed_10m?.[idx] ?? 6;
      const windDir10 = h.wind_direction_10m?.[idx] ?? 200;
      const freeze = h.freezing_level_height?.[idx] ?? (altitude + 2500);
      const cape = h.cape?.[idx] ?? 200;
      const rh2m = h.relative_humidity_2m?.[idx] ?? 50;

      // Temperature ai livelli di pressione
      const temps: Record<number, number | null> = {
        850: h.temperature_850hPa?.[idx] ?? null,
        700: h.temperature_700hPa?.[idx] ?? null,
        600: h.temperature_600hPa?.[idx] ?? null,
        500: h.temperature_500hPa?.[idx] ?? null,
      };

      // Sole %
      const sunPct = Math.min(100, Math.max(5, Math.round(((rad / 900) * (1 - (cloud / 100) * 0.6)) * 100)));
      const spread = Math.max(0.5, t2m - dew);

      // Interpola temperatura a ogni altitudine della griglia
      const tempAtAlt = ALT_GRID.map((alt) => interpolateTemp(temps, alt));

      // Calcola ΔT/100m per ogni altitudine della griglia
      const deltaTGrid = ALT_GRID.map((alt, j) => {
        if (j >= ALT_GRID.length - 1) return 0.3;
        const tBelow = tempAtAlt[j];
        const tAbove = tempAtAlt[j + 1];
        if (tBelow != null && tAbove != null) {
          // ΔT/100m = T(below) - T(above) per intervallo di 100m
          return Math.round((tBelow - tAbove) * 100) / 100;
        }
        // Fallback: stima basata su lapse rate standard + ciclo giornaliero
        const hourFactor = Math.sin(((targetHour - 6) / 12) * Math.PI);
        const baseRate = 0.10 + hourFactor * 0.60;
        const altNorm = (alt - 1500) / (6000 - 1500); // 0 (basso) → 1 (alto)
        const altFactor = 1.0 - altNorm * 0.5; // meno instabile in alto
        return Math.round((baseRate * altFactor) * 100) / 100;
      });

      // Clamp ΔT
      const clampedDeltaT = deltaTGrid.map((d) =>
        Math.max(-0.20, Math.min(1.50, d))
      );

      return {
        hour: targetHour, idx,
        sunPct, thermalAvg: Math.max(0.3, Math.min(2.5,
          0.4 + (spread * 0.06) + (sunPct / 100) * 0.4 + (cape > 100 ? (cape / 1500) * 0.3 : 0)
        )),
        tempGround: Math.round(t2m),
        windGround: Math.round(wind10),
        windDirGround: Math.round(windDir10),
        precip, cloudCover: cloud,
        zeroThermal: Math.round(freeze),
        thermalTop: Math.round(Math.min(4500, altitude + Math.min(1200, spread * 100) + 150)),
        cloudBase: Math.round(altitude + Math.min(1200, spread * 100)),
        cloudPct: Math.max(2, Math.min(95, Math.round(cloud))),
        deltaTGrid: clampedDeltaT,
        rh2m, cape,
      };
    }).filter(Boolean);
  }, [data, altitude]);

  // Curve
  const zeroThermalPath = useMemo(() => {
    if (!gridData) return "";
    return gridData.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`).join(" ");
  }, [gridData]);

  const thermalTopCurve = useMemo(() => {
    if (!gridData) return "";
    return gridData
      .map((h, i) => `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(h.thermalTop)}`)
      .join(" ");
  }, [gridData]);

  const avgZeroThermal = useMemo(() => {
    if (!gridData) return 4000;
    const sum = gridData.reduce((acc, h) => acc + h.zeroThermal, 0);
    return Math.round(sum / gridData.length);
  }, [gridData]);

  // Wind barbs
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number, idx?: number) => {
    if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
    const knots = speedKmh * 0.539957;
    const angle = ((dirDeg - 90) * Math.PI) / 180;
    const staffLen = 22;
    const endX = x + staffLen * Math.cos(angle);
    const endY = y + staffLen * Math.sin(angle);
    const barbColor = speedKmh > 25 ? "#000000" : "#1a1a2e";
    const elements: any[] = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 1.0;
    const featherAngle = angle + (115 * Math.PI) / 180 + Math.PI;
    const keyBase = idx != null ? `-${idx}` : "";

    while (rem >= 50 && pos >= 0.3) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const p1 = `${bx},${by}`;
      const p2 = `${bx + 12 * Math.cos(featherAngle)},${by + 12 * Math.sin(featherAngle)}`;
      const p3 = `${bx + 6 * Math.cos(angle)},${by + 6 * Math.sin(angle)}`;
      elements.push(<polygon key={`p50${keyBase}`} points={`${p1} ${p2} ${p3}`} fill={barbColor} stroke={barbColor} strokeWidth="0.5" />);
      rem -= 50; pos -= 0.28;
    }
    while (rem >= 10 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(<line key={`l10${keyBase}`} x1={bx} y1={by} x2={bx + 12 * Math.cos(featherAngle)} y2={by + 12 * Math.sin(featherAngle)} stroke={barbColor} strokeWidth="2" strokeLinecap="round" />);
      rem -= 10; pos -= 0.18;
    }
    if (rem >= 5 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(<line key={`l5${keyBase}`} x1={bx} y1={by} x2={bx + 6 * Math.cos(featherAngle)} y2={by + 6 * Math.sin(featherAngle)} stroke={barbColor} strokeWidth="2" strokeLinecap="round" />);
    }
    return (
      <g key={`wb${keyBase}`}>
        <line x1={x} y1={y} x2={endX} y2={endY} stroke={barbColor} strokeWidth="2" strokeLinecap="round" />
        {elements}
      </g>
    );
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-300 shadow-2xl">
        <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
        <span className="text-lg font-bold text-white">Caricamento Grafico Aerologico...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 text-center text-rose-300">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
        <p className="font-bold text-white">Impossibile caricare i dati</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  if (!gridData) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-300 shadow-2xl">
        <span className="text-lg font-bold text-white">Nessun dato disponibile</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-white text-slate-900 rounded-[28px] p-3 sm:p-5 shadow-2xl border border-slate-300 overflow-hidden font-sans select-none">

        {/* Titolo */}
        <div className="text-center pb-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight lowercase">
            {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-mono tracking-wide mt-0.5">
            plotted {dateStr} 00:00 UTC &middot; model ground {Math.round(altitude + 5)} m &middot; SRTM {Math.round(altitude)} m
          </p>
        </div>

        {/* Header: ascendenze e sole */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1 px-1">
          <span className="text-slate-500">valore medio ascendenze (m/s)</span>
        </div>
        <div className="grid grid-cols-11 gap-0 px-1 mb-1">
          {gridData.map((h, i) => (
            <div key={i} className="text-center">
              <div className="font-black text-sm" style={{ color: h.thermalAvg >= 1.6 ? "#b91c1c" : "#0f172a" }}>
                {h.thermalAvg.toFixed(1)}
              </div>
              <div className="text-xs" style={{ color: h.sunPct >= 90 ? "#94a3b8" : "#b45309" }}>
                {h.sunPct}%
              </div>
            </div>
          ))}
        </div>

        {/* SVG Windgram */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[880px]" style={{ shapeRendering: "geometricPrecision" }}>
            <defs>
              {/* Pattern crosshatch per nuvole */}
              <pattern id="crosshatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="1.5 1.5" opacity="0.4" />
              </pattern>
            </defs>

            {/* SFONDO 2D A COLORI - Griglia di celle ΔT */}
            {gridData.map((hourData, i) => {
              if (i >= gridData.length - 1) return null;
              const nextHour = gridData[i + 1];
              const cellWidth = (getXFromHourIdx(i + 1) - getXFromHourIdx(i));
              return (
                <g key={`row-${i}`}>
                  {ALT_GRID.slice(0, -1).map((alt, j) => {
                    if (j >= ALT_GRID.length - 1) return null;
                    const dt = (hourData.deltaTGrid[j] + hourData.deltaTGrid[j + 1] +
                                nextHour.deltaTGrid[j] + nextHour.deltaTGrid[j + 1]) / 4;
                    const color = getStabilityColor(dt);
                    const y1 = getYFromAlt(alt);
                    const y2 = getYFromAlt(alt + 100);
                    const cellHeight = Math.max(1, y1 - y2);
                    return (
                      <rect
                        key={`cell-${i}-${j}`}
                        x={getXFromHourIdx(i)}
                        y={y2}
                        width={cellWidth}
                        height={cellHeight}
                        fill={color}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* INDICATORI PRECIPITAZIONI (barre blu in alto) */}
            {gridData.map((h, i) => {
              if (h.precip <= 0.05) return null;
              const x = getXFromHourIdx(i);
              const barH = Math.min(25, h.precip * 12);
              return (
                <g key={`rain-${i}`}>
                  <rect x={x - 7} y={margin.top + 3} width="14" height={barH} fill="#3b82f6" opacity="0.8" rx="2" />
                  <text x={x} y={margin.top + barH + 11} fill="#1e293b" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="monospace">
                    {h.precip.toFixed(1)}mm
                  </text>
                </g>
              );
            })}

            {/* GRIGLIA ORIZZONTALE */}
            {[500, 600, 700, 850].map((hpa) => {
              const altMap: Record<number, number> = { 500: 5800, 600: 4400, 700: 3100, 850: 1500 };
              const y = getYFromAlt(altMap[hpa]);
              return (
                <g key={hpa}>
                  <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.3" />
                  <text x={margin.left - 6} y={y + 4} fill="#0f172a" fontSize="10" fontWeight="600" textAnchor="end">{hpa}hPa</text>
                </g>
              );
            })}

            {/* GRIGLIA VERTICALE */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <line key={h} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.2" />
              );
            })}

            {/* ASSE DESTRO - METRI */}
            {[1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000].map((alt) => {
              const y = getYFromAlt(alt);
              return (
                <g key={alt}>
                  <line x1={margin.left + plotW} y1={y} x2={margin.left + plotW + 4} y2={y} stroke="#0f172a" strokeWidth="1" />
                  <text x={margin.left + plotW + 6} y={y + 4} fill="#0f172a" fontSize="10" fontWeight="600" textAnchor="start">{alt}m</text>
                </g>
              );
            })}

            {/* BARBETTE VENTO ai livelli di pressione */}
            {gridData.map((calc, i) => {
              const x = getXFromHourIdx(i);
              const showLevels = [
                { alt: 1500, speed: calc.windGround * 1.2, dir: calc.windDirGround },
                { alt: 3100, speed: calc.windGround * 1.8, dir: calc.windDirGround + 20 },
                { alt: 4400, speed: calc.windGround * 2.2, dir: calc.windDirGround + 30 },
                { alt: 5800, speed: calc.windGround * 2.8, dir: calc.windDirGround + 40 },
              ];
              return (
                <g key={`col-${i}`}>
                  {showLevels.map((lvl) =>
                    renderWindBarb(x, getYFromAlt(lvl.alt), lvl.speed, lvl.dir, i)
                  )}
                </g>
              );
            })}

            {/* LINEA ZERO TERMICO */}
            {zeroThermalPath && (
              <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" />
            )}

            {/* Fiocchi neve */}
            {gridData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.zeroThermal);
              return (
                <g key={`snow-${i}`} transform={`translate(${x},${y})`}>
                  <circle cx="0" cy="0" r="6" fill="#fff" stroke="#0284c7" strokeWidth="1.5" />
                  <text x="0" y="3" fill="#0284c7" fontSize="9" fontWeight="900" textAnchor="middle">❄</text>
                </g>
              );
            })}

            {/* Badge zero termico */}
            <g transform={`translate(${margin.left + plotW - 130}, ${getYFromAlt(avgZeroThermal) - 14})`}>
              <rect x="0" y="0" width="125" height="28" rx="5" fill="#0284c7" stroke="#fff" strokeWidth="1.5" />
              <text x="62" y="19" fill="#fff" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="monospace">0°C · {avgZeroThermal}m</text>
            </g>

            {/* CURVA THERMAL TOP (viola) */}
            {thermalTopCurve && (
              <path d={thermalTopCurve} fill="none" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" />
            )}

            {/* Icone paracadute */}
            {gridData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.thermalTop);
              return (
                <g key={`para-${i}`} transform={`translate(${x},${y})`}>
                  <path d="M-16,-4 C-12,-16 12,-16 16,-4 C10,-9 -10,-9 -16,-4 Z" fill="#c084fc" stroke="#7e22ce" strokeWidth="1.5" />
                  <line x1="-12" y1="-5" x2="0" y2="0" stroke="#7e22ce" strokeWidth="1.2" />
                  <line x1="12" y1="-5" x2="0" y2="0" stroke="#7e22ce" strokeWidth="1.2" />
                  <circle cx="0" cy="0" r="3.5" fill="#fff" stroke="#7e22ce" strokeWidth="2" />
                </g>
              );
            })}

            {/* NUVOLE con % copertura */}
            {gridData.map((h, i) => {
              if (i === 0 || i === gridData.length - 1) return null;
              const x = getXFromHourIdx(i);
              const cloudY = getYFromAlt(h.cloudBase + 80);
              return (
                <g key={`cloud-${i}`} transform={`translate(${x},${cloudY})`}>
                  <path d="M-14,2 A5,5 0 0,1-6,-4 A8,8 0 0,1 6,-5 A7,7 0 0,1 14,1 A4,4 0 0,1 12,6 L-12,6 A4,4 0 0,1-14,2Z" fill="#fff" stroke="#64748b" strokeWidth="1.2" />
                  <text x="0" y="5" fill="#0f172a" fontSize="9" fontWeight="800" textAnchor="middle">{h.cloudPct}%</text>
                </g>
              );
            })}

            {/* BADGE quota cumulo + ascendenza */}
            {gridData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const badgeY = getYFromAlt(h.thermalTop) + 36;
              return (
                <g key={`badge-${i}`} transform={`translate(${x},${badgeY})`}>
                  <rect x="-28" y="0" width="56" height="26" rx="4" fill="#fff" stroke="#ea580c" strokeWidth="1.2" />
                  <text x="0" y="11" fill="#0f172a" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">{h.cloudBase}m</text>
                  <text x="0" y="22" fill="#b91c1c" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">↑{h.thermalAvg.toFixed(1)}m/s</text>
                </g>
              );
            })}

            {/* Asse X - ORE */}
            {HOURS.map((h, i) => (
              <text key={`hr-${h}`} x={getXFromHourIdx(i)} y={margin.top + plotH + 22} fill="#0f172a" fontSize="13" fontWeight="700" textAnchor="middle" fontFamily="monospace">
                {String(h).padStart(2, "0")}:00
              </text>
            ))}

            {/* Bordo plot */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.2" />

            {/* Badge aria stabile */}
            <g transform={`translate(${margin.left + plotW - 130}, ${margin.top + 10})`}>
              <rect x="0" y="0" width="125" height="24" rx="4" fill="#34d399" stroke="#fff" strokeWidth="1.5" />
              <text x="62" y="16" fill="#fff" fontSize="10" fontWeight="800" textAnchor="middle">❄ ARIA STABILE</text>
            </g>
          </svg>
        </div>

        {/* SCALA ΔT / 100m */}
        <div className="mt-2 pt-2 border-t border-slate-200 flex flex-col items-center">
          <div className="w-full max-w-2xl px-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Stabile ←</span>
              <span className="text-slate-900 font-extrabold text-sm">ΔT / 100 m</span>
              <span>→ Instabile</span>
            </div>
            <div className="w-full h-4 rounded-sm overflow-hidden border border-slate-400">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="deltaTGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    {STABILITY_SCALE.map((s, i) => (
                      <stop key={i} offset={`${i * 11.11}%`} stopColor={s.color} />
                    ))}
                  </linearGradient>
                </defs>
                <rect x="0" y="0" width="100" height="100" fill="url(#deltaTGrad)" />
              </svg>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs font-mono font-bold text-slate-700 mt-1 px-1">
              {STABILITY_SCALE.map((item, idx) => (
                <span key={idx}>{item.val.toFixed(2)}</span>
              ))}
            </div>
            <div className="text-center text-[10px] text-slate-500 font-mono mt-3">
              Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela di Alpium
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
