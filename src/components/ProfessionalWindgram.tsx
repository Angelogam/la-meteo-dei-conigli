"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, Wind, AlertTriangle } from "lucide-react";
import { fetchHourly } from "@/lib/openMeteoClient";

interface WindgramProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  siteName?: string;
  selectedDay?: number;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const LEVELS = [
  { hpa: 500, alt: 5800 },
  { hpa: 550, alt: 5000 },
  { hpa: 600, alt: 4400 },
  { hpa: 650, alt: 3750 },
  { hpa: 700, alt: 3100 },
  { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 1950 },
  { hpa: 850, alt: 1450 },
];

const ALT_TICKS = [6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500];

// Scala colori stabilita ALOPIUM IDENTICA
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
  // Threshold esatti basati su STABILITY_SCALE (ordine crescente)
  if (deltaT < 0.00) return "#8a5bb8";     // purple (molto stabile)
  if (deltaT <= 0.08) return "#4f7fd9";    // blue
  if (deltaT <= 0.20) return "#45b3cd";    // cyan
  if (deltaT <= 0.35) return "#4ec099";    // green
  if (deltaT <= 0.50) return "#8bc953";    // light green
  if (deltaT <= 0.68) return "#d8c728";    // yellow
  if (deltaT <= 0.85) return "#eeb319";    // orange
  if (deltaT <= 1.05) return "#e86c1f";    // orange-red
  return "#c92e1e";                       // red (instabile)
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

    const fetchMeteo = async () => {
      const hourlyParams = [
        "temperature_2m", "relative_humidity_2m", "dew_point_2m",
        "precipitation", "cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high",
        "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
        "wind_speed_80m", "wind_direction_80m",
        "wind_speed_120m", "wind_direction_120m",
        "wind_speed_180m", "wind_direction_180m",
        "wind_speed_925hPa", "wind_direction_925hPa",
        "wind_speed_850hPa", "wind_direction_850hPa",
        "wind_speed_700hPa", "wind_direction_700hPa",
        "wind_speed_600hPa", "wind_direction_600hPa",
        "wind_speed_500hPa", "wind_direction_500hPa",
        "temperature_80m", "temperature_120m",
        "surface_pressure", "shortwave_radiation",
        "freezing_level_height", "cape", "lifted_index",
      ].join(",");

      try {
        const json = await fetchHourly(latitude, longitude, hourlyParams, dateStr, dateStr);
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
    return () => { isMounted = false; };
  }, [latitude, longitude, dateStr]);

  // Dimensioni SVG identiche al riferimento Alpium
  const width = 1000;
  const height = 580;
  const margin = { top: 70, right: 85, bottom: 80, left: 85 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const minAlt = 1300;
  const maxAlt = 6000;

  const getYFromAlt = (alt: number) => {
    const clamped = Math.min(maxAlt, Math.max(minAlt, alt));
    return margin.top + plotH - ((clamped - minAlt) / (maxAlt - minAlt)) * plotH;
  };

  const getXFromHourIdx = (idx: number) => {
    return margin.left + (idx / (HOURS.length - 1)) * plotW;
  };

  // Dati orari
  const hourlyData = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times: string[] = data.hourly.time;

    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) {
        return {
          hour: targetHour, sunPct: 80, thermalAvg: 1.2, tempGround: 19,
          windGround: 8, windDirGround: 180, precip: 0, cloudCover: 10,
          zeroThermal: 4380, thermalTop: altitude + 900, cloudBase: altitude + 800,
          cloudPct: 5, deltaT: 0.75, tempAt80m: 15, tempAt120m: 12,
          levelWinds: LEVELS.map((l) => ({ ...l, speed: 12, dir: 240 })),
        };
      }

      const h = data.hourly;
      const t = h.temperature_2m[idx] ?? 18;
      const dew = h.dew_point_2m[idx] ?? (t - 8);
      const rad = h.shortwave_radiation?.[idx] ?? 600;
      const cloud = h.cloud_cover?.[idx] ?? 10;
      const precip = h.precipitation?.[idx] ?? 0;
      const wind10 = h.wind_speed_10m?.[idx] ?? 7;
      const windDir10 = h.wind_direction_10m?.[idx] ?? 180;
      const freeze = h.freezing_level_height?.[idx] ?? (altitude + t / 0.0098);
      const cape = h.cape?.[idx] ?? 350;

      const sunPct = Math.min(100, Math.max(10, Math.round(((rad / 900) * (1 - (cloud / 100) * 0.65)) * 100)));
      const spread = Math.max(1, t - dew);
      const cloudBase = Math.round(altitude + Math.min(1500, spread * 125));
      const cloudPct = Math.max(2, Math.min(95, Math.round(cloud)));

      let deltaT = 0.72;
      const t80 = h.temperature_80m?.[idx];
      const t120 = h.temperature_120m?.[idx];
      if (t80 != null) deltaT = Math.round(((t - t80) / 78) * 100 * 100) / 100;
      else if (t120 != null) deltaT = Math.round(((t - t120) / 118) * 100 * 100) / 100;
      else deltaT = spread >= 10 ? 0.98 : spread >= 6 ? 0.82 : 0.65;

      let rateo = 0.6 + (spread * 0.08) + (sunPct / 100) * 0.45 + (cape > 200 ? (cape / 1000) * 0.4 : 0);
      if (precip > 0.4) rateo = 0.3;
      else if (cloud > 80) rateo *= 0.4;
      rateo = Math.max(0.4, Math.min(2.5, Math.round(rateo * 10) / 10));

      const thermalTop = Math.round(Math.min(4000, cloudBase + Math.min(800, rateo * 100 + cape * 0.1)));

      const levelWinds = [
        { hpa: 500, alt: 5800, speed: h.wind_speed_500hPa?.[idx] ?? (wind10 * 2.8), dir: h.wind_direction_500hPa?.[idx] ?? (windDir10 + 40) },
        { hpa: 550, alt: 5000, speed: (h.wind_speed_500hPa?.[idx] ? h.wind_speed_500hPa[idx] * 0.9 : wind10 * 2.5), dir: (h.wind_direction_500hPa?.[idx] ?? windDir10) + 30 },
        { hpa: 600, alt: 4400, speed: h.wind_speed_600hPa?.[idx] ?? (wind10 * 2.1), dir: h.wind_direction_600hPa?.[idx] ?? (windDir10 + 20) },
        { hpa: 650, alt: 3750, speed: (h.wind_speed_700hPa?.[idx] ? h.wind_speed_700hPa[idx] * 1.15 : wind10 * 1.8), dir: (h.wind_direction_700hPa?.[idx] ?? windDir10) + 15 },
        { hpa: 700, alt: 3100, speed: h.wind_speed_700hPa?.[idx] ?? (wind10 * 1.5), dir: h.wind_direction_700hPa?.[idx] ?? (windDir10 + 10) },
        { hpa: 750, alt: 2500, speed: (h.wind_speed_850hPa?.[idx] ? h.wind_speed_850hPa[idx] * 1.15 : wind10 * 1.3), dir: (h.wind_direction_850hPa?.[idx] ?? windDir10) + 5 },
        { hpa: 800, alt: 1950, speed: (h.wind_speed_850hPa?.[idx] ? h.wind_speed_850hPa[idx] * 0.95 : wind10 * 1.1), dir: h.wind_direction_850hPa?.[idx] ?? windDir10 },
        { hpa: 850, alt: 1450, speed: h.wind_speed_850hPa?.[idx] ?? wind10, dir: h.wind_direction_850hPa?.[idx] ?? windDir10 },
      ];

      return {
        hour: targetHour, sunPct, thermalAvg: rateo, tempGround: Math.round(t),
        windGround: Math.round(wind10), windDirGround: Math.round(windDir10),
        precip, cloudCover: cloud, zeroThermal: Math.round(freeze),
        thermalTop, cloudBase, cloudPct, deltaT,
        tempAt80m: t80 ?? Math.round(t - 3), tempAt120m: t120 ?? Math.round(t - 6),
        levelWinds,
      };
    });
  }, [data, altitude]);

  // Curve
  const zeroThermalPath = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`).join(" ");
  }, [hourlyData]);

  const thermalTopCurve = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData
      .map((h, i) => `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(h.thermalTop)}`)
      .join(" ");
  }, [hourlyData]);

  const avgZeroThermal = useMemo(() => {
    if (hourlyData.length === 0) return 4381;
    const sum = hourlyData.reduce((acc, h) => acc + h.zeroThermal, 0);
    return Math.round(sum / hourlyData.length);
  }, [hourlyData]);

  // Sfondo colorato continuo basato su deltaT (IDENTICO ad Alpium)
  const backgroundRects = useMemo(() => {
    if (hourlyData.length === 0) return [];
    const results: { x: number; w: number; color: string }[] = [];
    for (let i = 0; i < hourlyData.length - 1; i++) {
      const h1 = hourlyData[i];
      const h2 = hourlyData[i + 1];
      const x1 = getXFromHourIdx(i);
      const x2 = getXFromHourIdx(i + 1);
      const w = x2 - x1;
      // Usa deltaT medio per questa colonna
      const avgDeltaT = (h1.deltaT + h2.deltaT) / 2;
      const color = getStabilityColor(avgDeltaT);
      results.push({ x: x1, w, color });
    }
    return results;
  }, [hourlyData]);

  // Barbette vento
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number) => {
    if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
    const knots = speedKmh * 0.539957;
    const angle = ((dirDeg - 90) * Math.PI) / 180;
    const staffLen = 22;
    const endX = x + staffLen * Math.cos(angle);
    const endY = y + staffLen * Math.sin(angle);
    const barbColor = speedKmh > 30 ? "#d946ef" : speedKmh > 18 ? "#0284c7" : "#3b82f6";
    const elements: any[] = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 1.0;
    const barbAngle = angle + (115 * Math.PI) / 180;
    const featherAngle = barbAngle + Math.PI;

    while (rem >= 50 && pos >= 0.3) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const p1 = `${bx},${by}`;
      const p2 = `${bx + 11 * Math.cos(featherAngle)},${by + 11 * Math.sin(featherAngle)}`;
      const p3 = `${bx + 5.5 * Math.cos(angle)},${by + 5.5 * Math.sin(angle)}`;
      elements.push(<polygon key={`p50-${x}-${y}-${pos}`} points={`${p1} ${p2} ${p3}`} fill={barbColor} stroke={barbColor} strokeWidth="1" />);
      rem -= 50;
      pos -= 0.28;
    }
    while (rem >= 10 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <line key={`l10-${x}-${y}-${pos}`} x1={bx} y1={by} x2={bx + 10 * Math.cos(featherAngle)} y2={by + 10 * Math.sin(featherAngle)} stroke={barbColor} strokeWidth="1.6" strokeLinecap="round" />
      );
      rem -= 10;
      pos -= 0.18;
    }
    if (rem >= 5 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <line key={`l5-${x}-${y}-${pos}`} x1={bx} y1={by} x2={bx + 5.5 * Math.cos(featherAngle)} y2={by + 5.5 * Math.sin(featherAngle)} stroke={barbColor} strokeWidth="1.6" strokeLinecap="round" />
      );
    }
    return (
      <g key={`wb-${x}-${Math.round(y)}`}>
        <line x1={x} y1={y} x2={endX} y2={endY} stroke={barbColor} strokeWidth="1.6" strokeLinecap="round" />
        {elements}
      </g>
    );
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-300 shadow-2xl">
        <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
        <span className="text-lg font-bold text-white">Caricamento Grafico Aerologico Alpium...</span>
        <span className="text-sm text-slate-400 mt-1">Interrogazione Open-Meteo per {siteName} ({altitude}m)</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 text-center text-rose-300">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
        <p className="font-bold text-white">Impossibile caricare i dati Open-Meteo</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Contenitore Grafico Bianco con Bordo Arrotondato — IDENTICO ALPIUM */}
      <div className="bg-white text-slate-900 rounded-[28px] p-3 sm:p-5 shadow-2xl border border-slate-300 overflow-hidden font-sans select-none">
        
        {/* Titolo Principale */}
        <div className="text-center pb-1">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight lowercase">
            {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-mono tracking-wide mt-0.5">
            plotted {dateStr} 00:00 UTC &middot; model ground {Math.round(altitude + 5)} m &middot; SRTM {Math.round(altitude)} m
          </p>
        </div>

        {/* HEADER IN ALTO: Ascendenza media e Sole % — IDENTICO ALPIUM */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1 px-1">
          <span className="text-slate-500">valore medio ascendenze (m/s)</span>
        </div>
        <div className="grid grid-cols-11 gap-0 px-1 mb-1">
          {hourlyData.map((h, i) => (
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

        {/* SVG Windgram — IDENTICO ALPIUM */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[880px]"
            style={{ shapeRendering: "geometricPrecision", textRendering: "geometricPrecision" }}
          >
            <defs>
              {/* Pattern reticolo per zone convettive */}
              <pattern id="thermalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
                <line x1="0" y1="0" x2="8" y2="0" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
              </pattern>
              {/* Gradient sfondo per precipitazioni */}
              <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
              </linearGradient>
            </defs>

            {/* SFONDO COLORATO CONTINUO BASE — IDENTICO ALPIUM */}
            {backgroundRects.map((rect, i) => (
              <rect
                key={`bg-${i}`}
                x={rect.x}
                y={margin.top}
                width={rect.w}
                height={plotH}
                fill={rect.color}
                opacity="0.55"
              />
            ))}

            {/* INDICATORI PRECIPITAZIONI IN ALTO (barre blu) — IDENTICO ALPIUM */}
            {hourlyData.map((h, i) => {
              if (h.precip <= 0.05) return null;
              const x = getXFromHourIdx(i);
              const barHeight = Math.min(30, h.precip * 15);
              return (
                <g key={`rain-${i}`}>
                  <rect x={x - 8} y={margin.top + 5} width="16" height={barHeight} fill="#3b82f6" opacity="0.7" rx="2" />
                  <text x={x} y={margin.top + barHeight + 12} fill="#1e293b" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="monospace">
                    {h.precip.toFixed(2)} mm
                  </text>
                </g>
              );
            })}

            {/* LINEE ORIZZONTALI LIVELLI ISOBARICI & QUOTE */}
            {LEVELS.map((lvl) => {
              const y = getYFromAlt(lvl.alt);
              return (
                <g key={`grid-lvl-${lvl.hpa}`}>
                  <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.4" />
                  <text x={margin.left - 12} y={y + 5} fill="#0f172a" fontSize="13" fontWeight="800" textAnchor="end">
                    {lvl.hpa} hPa
                  </text>
                </g>
              );
            })}

            {/* Testo Asse Destro (Metri) */}
            {ALT_TICKS.map((alt) => {
              const y = getYFromAlt(alt);
              return (
                <g key={`grid-alt-${alt}`}>
                  <line x1={margin.left + plotW} y1={y} x2={margin.left + plotW + 5} y2={y} stroke="#0f172a" strokeWidth="1.2" />
                  <text x={margin.left + plotW + 10} y={y + 5} fill="#0f172a" fontSize="13" fontWeight="700" textAnchor="start">
                    {alt} m
                  </text>
                </g>
              );
            })}

            {/* LINEE VERTICALI ORARIE */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <line key={`vline-${h}`} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.3" />
              );
            })}

            {/* BARBETTE DEL VENTO ISOARICHE */}
            {hourlyData.map((calc, i) => {
              const x = getXFromHourIdx(i);
              return (
                <g key={`col-barbs-${i}`}>
                  {calc.levelWinds.map((wLvl) => {
                    const y = getYFromAlt(wLvl.alt);
                    return renderWindBarb(x, y, wLvl.speed, wLvl.dir);
                  })}
                </g>
              );
            })}

            {/* LINEA DELLO ZERO TERMICO (Azzurra Tratteggiata con Fiocchi di Neve) */}
            {zeroThermalPath && (
              <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />
            )}

            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.zeroThermal);
              return (
                <g key={`zero-snowflake-${i}`} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="7.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                  <text x="0" y="3.5" fill="#0284c7" fontSize="10" fontWeight="900" textAnchor="middle">❄</text>
                </g>
              );
            })}

            {/* BADGE ZERO TERMICO LATERALE */}
            <g transform={`translate(${margin.left + plotW - 145}, ${getYFromAlt(avgZeroThermal) - 15})`}>
              <rect x="0" y="0" width="140" height="30" rx="6" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
              <text x="70" y="20" fill="#ffffff" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                0 °C &middot; {avgZeroThermal} m
              </text>
            </g>

            {/* CURVA PARACADUTE VIOLA (Thermal Top) */}
            {thermalTopCurve && (
              <path d={thermalTopCurve} fill="none" stroke="#9333ea" strokeWidth="3.5" strokeLinecap="round" />
            )}

            {/* ICONE PARACADUTE VIOLA SUI NODI */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.thermalTop);
              return (
                <g key={`paraglider-icon-${i}`} transform={`translate(${x}, ${y})`}>
                  <path d="M -18,-5 C -14,-18 14,-18 18,-5 C 12,-10 -12,-10 -18,-5 Z" fill="#c084fc" stroke="#7e22ce" strokeWidth="2" />
                  <line x1="-14" y1="-6" x2="0" y2="0" stroke="#7e22ce" strokeWidth="1.5" />
                  <line x1="14" y1="-6" x2="0" y2="0" stroke="#7e22ce" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke="#7e22ce" strokeWidth="2.5" />
                </g>
              );
            })}

            {/* CARTELLINI CUMULI con % di Copertura */}
            {hourlyData.map((h, i) => {
              if (i === 0 || i === hourlyData.length - 1) return null;
              const x = getXFromHourIdx(i);
              const cloudY = getYFromAlt(h.cloudBase + 80);
              return (
                <g key={`cumulus-cloud-${i}`} transform={`translate(${x}, ${cloudY})`}>
                  <path
                    d="M -16,3 A 6,6 0 0,1 -7,-5 A 10,10 0 0,1 7,-6 A 8,8 0 0,1 16,2 A 5,5 0 0,1 14,8 L -14,8 A 5,5 0 0,1 -16,3 Z"
                    fill="#ffffff"
                    stroke="#64748b"
                    strokeWidth="1.5"
                  />
                  <text x="0" y="4" fill="#0f172a" fontSize="10" fontWeight="900" textAnchor="middle">
                    {h.cloudPct}%
                  </text>
                </g>
              );
            })}

            {/* LINEE TRATTEGGIATE VERTICALI che collegano badge alla curva thermal top */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const badgeY = getYFromAlt(h.thermalTop) + 42;
              return (
                <line
                  key={`connector-${i}`}
                  x1={x}
                  y1={getYFromAlt(h.thermalTop) + 28}
                  x2={x}
                  y2={badgeY}
                  stroke="#ea580c"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  opacity="0.6"
                />
              );
            })}

            {/* BADGE QUOTA CUMULO & ASCENDENZA */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const badgeY = getYFromAlt(h.thermalTop) + 42;
              return (
                <g key={`badge-data-${i}`} transform={`translate(${x}, ${badgeY})`}>
                  <rect x="-30" y="0" width="60" height="28" rx="5" fill="#ffffff" stroke="#ea580c" strokeWidth="1.5" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))" />
                  <text x="0" y="12" fill="#0f172a" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    {h.cloudBase} m
                  </text>
                  <text x="0" y="23" fill="#b91c1c" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    ↑ {h.thermalAvg.toFixed(1)} m/s
                  </text>
                </g>
              );
            })}

            {/* ASSE X INFERIORE: ORE ESATTE */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <text key={`label-hour-${h}`} x={x} y={margin.top + plotH + 25} fill="#0f172a" fontSize="14" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                  {String(h).padStart(2, "0")}:00
                </text>
              );
            })}

            {/* BORDO RETTANGOLARE NERO DEL PLOT */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.4" />

            {/* ETICHETTA ZONA STABILE (in alto a destra) */}
            <g transform={`translate(${margin.left + plotW - 145}, ${margin.top + 12})`}>
              <rect x="0" y="0" width="140" height="26" rx="5" fill="#34d399" stroke="#ffffff" strokeWidth="2" />
              <text x="70" y="18" fill="#ffffff" fontSize="12" fontWeight="900" textAnchor="middle">
                ❄ ARIA STABILE
              </text>
            </g>
          </svg>
        </div>

        {/* SCALA GRADIENTE INFERIORE ΔT / 100 m — IDENTICA AD ALPIUM */}
    <div className="mt-2 pt-2 border-t border-slate-200 flex flex-col items-center">
      <div className="w-full max-w-2xl px-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
          <span>Stabile ←</span>
          <span className="text-slate-900 font-extrabold text-sm">ΔT / 100 m</span>
          <span>→ Instabile</span>
        </div>

            {/* Barra Continua con Gradiente SVG — 9 colori esatti */}
        <div className="w-full h-4 rounded-sm overflow-hidden border border-slate-400">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="deltaTGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8a5bb8" />
                <stop offset="12.5%" stopColor="#4f7fd9" />
                <stop offset="25%" stopColor="#45b3cd" />
                <stop offset="37.5%" stopColor="#4ec099" />
                <stop offset="50%" stopColor="#8bc953" />
                <stop offset="62.5%" stopColor="#d8c728" />
                <stop offset="75%" stopColor="#eeb319" />
                <stop offset="87.5%" stopColor="#e86c1f" />
                <stop offset="100%" stopColor="#c92e1e" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="100" height="100" fill="url(#deltaTGradient)" />
          </svg>
        </div>

            {/* Etichette Valori Sotto la Barra */}
            <div className="flex justify-between text-[10px] sm:text-xs font-mono font-bold text-slate-700 mt-1 px-1">
              {STABILITY_SCALE.map((item, idx) => (
                <span key={idx}>{item.val.toFixed(2)}</span>
              ))}
            </div>

            {/* Didascalia Fonte Dati */}
            <div className="text-center text-[10px] text-slate-500 font-mono mt-3">
              Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela di Alpium
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
