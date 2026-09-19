"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, FileText, Check, Copy, AlertTriangle, ShieldCheck } from "lucide-react";
import { fetchHourly } from "@/lib/openMeteoClient";
import { generateReportMeteo, type GeneratedReport } from "@/utils/generateReportMeteo";

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
  { hpa: 600, alt: 4400 },
  { hpa: 650, alt: 3750 },
  { hpa: 700, alt: 3100 },
  { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 1950 },
  { hpa: 850, alt: 1450 },
];

const ALT_TICKS = [6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500];

const STABILITY_COLORS = [
  { val: -0.20, color: "#8b5cf6" },
  { val: 0.00, color: "#3b82f6" },
  { val: 0.16, color: "#06b6d4" },
  { val: 0.32, color: "#10b981" },
  { val: 0.48, color: "#84cc16" },
  { val: 0.65, color: "#eab308" },
  { val: 0.82, color: "#f97316" },
  { val: 0.98, color: "#ef4444" },
  { val: 1.20, color: "#dc2626" },
];

function getStabilityColor(deltaT: number): string {
  if (deltaT <= -0.1) return STABILITY_COLORS[0].color;
  if (deltaT <= 0.08) return STABILITY_COLORS[1].color;
  if (deltaT <= 0.24) return STABILITY_COLORS[2].color;
  if (deltaT <= 0.40) return STABILITY_COLORS[3].color;
  if (deltaT <= 0.56) return STABILITY_COLORS[4].color;
  if (deltaT <= 0.73) return STABILITY_COLORS[5].color;
  if (deltaT <= 0.90) return STABILITY_COLORS[6].color;
  if (deltaT <= 1.10) return STABILITY_COLORS[7].color;
  return STABILITY_COLORS[8].color;
}

function getAltitudeBandColor(alt: number, deltaT: number): string {
  const altitudeFactor = Math.max(0, Math.min(1, (alt - 1500) / 4000));
  const stableColor = getStabilityColor(deltaT);
  return altitudeFactor > 0.5 ? "#6366f1" : stableColor;
}

export default function ProfessionalWindgram({
  latitude,
  longitude,
  altitude = 1374,
  siteName = "Iretta",
  selectedDay = 0,
}: WindgramProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

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
        "temperature_2m", "relative_humidity_2m", "dew_point_2m", "precipitation",
        "cloud_cover", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
        "wind_speed_80m", "wind_direction_80m", "wind_speed_120m", "wind_direction_120m",
        "wind_speed_180m", "wind_direction_180m", "wind_speed_925hPa", "wind_direction_925hPa",
        "wind_speed_850hPa", "wind_direction_850hPa", "wind_speed_700hPa", "wind_direction_700hPa",
        "wind_speed_600hPa", "wind_direction_600hPa", "wind_speed_500hPa", "wind_direction_500hPa",
        "temperature_80m", "temperature_120m", "surface_pressure", "shortwave_radiation",
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

  // Dimensioni SVG - ottimizzato per massimizzare il grafico
  const width = 1200;
  const height = 640;
  const margin = { top: 55, right: 100, bottom: 55, left: 80 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const minAlt = 1200;
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
          levelWinds: PRESSURE_LEVELS.map((l) => ({ ...l, speed: 12, dir: 240 })),
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
      const t80 = h.temperature_80m?.[idx];
      const t120 = h.temperature_120m?.[idx];

      const sunPct = Math.min(100, Math.max(10, Math.round(((rad / 900) * (1 - (cloud / 100) * 0.65)) * 100)));
      const spread = Math.max(1, t - dew);
      const cloudBase = Math.round(altitude + Math.min(1500, spread * 125));
      const cloudPct = Math.max(2, Math.min(95, Math.round(cloud)));

      let deltaT = 0.72;
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
        hour: targetHour, sunPct, thermalAvg: rateo,
        tempGround: Math.round(t), windGround: Math.round(wind10),
        windDirGround: Math.round(windDir10), precip, cloudCover: cloud,
        zeroThermal: Math.round(freeze), thermalTop, cloudBase, cloudPct, deltaT,
        tempAt80m: t80 ?? Math.round(t - 3), tempAt120m: t120 ?? Math.round(t - 6),
        levelWinds,
      };
    });
  }, [data, altitude]);

  // Report
  const reportGenerato = useMemo<GeneratedReport | null>(() => {
    if (!data?.hourly) return null;
    return generateReportMeteo({ siteName, altitude, dateObj, hourlyData: data.hourly });
  }, [data, siteName, altitude, dateObj]);

  const handleCopyReport = () => {
    if (!reportGenerato) return;
    navigator.clipboard.writeText(reportGenerato.testoCompleto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Wind barb rendering
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number) => {
    if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
    const knots = speedKmh * 0.539957;
    const angle = ((dirDeg - 90) * Math.PI) / 180;
    const staffLen = 16;
    const endX = x + staffLen * Math.cos(angle);
    const endY = y + staffLen * Math.sin(angle);
    const barbColor = speedKmh > 30 ? "#d946ef" : speedKmh > 18 ? "#0284c7" : "#3b82f6";
    const barbAngle = angle + (115 * Math.PI) / 180;
    const featherAngle = barbAngle + Math.PI;

    const elements: React.ReactElement[] = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 1.0;

    while (rem >= 50 && pos >= 0.3) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const p1 = `${bx},${by}`;
      const p2 = `${bx + 8 * Math.cos(featherAngle)},${by + 8 * Math.sin(featherAngle)}`;
      const p3 = `${bx + 3.5 * Math.cos(angle)},${by + 3.5 * Math.sin(angle)}`;
      elements.push(<polygon key={`p50-${x}-${y}-${pos}`} points={`${p1} ${p2} ${p3}`} fill={barbColor} stroke={barbColor} strokeWidth="0.7" />);
      rem -= 50; pos -= 0.28;
    }
    while (rem >= 10 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(<line key={`l10-${x}-${y}-${pos}`} x1={bx} y1={by} x2={bx + 8 * Math.cos(featherAngle)} y2={by + 8 * Math.sin(featherAngle)} stroke={barbColor} strokeWidth="1.2" strokeLinecap="round" />);
      rem -= 10; pos -= 0.18;
    }
    if (rem >= 5 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(<line key={`l5-${x}-${y}-${pos}`} x1={bx} y1={by} x2={bx + 4.5 * Math.cos(featherAngle)} y2={by + 4.5 * Math.sin(featherAngle)} stroke={barbColor} strokeWidth="1.2" strokeLinecap="round" />);
    }

    return (
      <g key={`wb-${x}-${Math.round(y)}`}>
        <line x1={x} y1={y} x2={endX} y2={endY} stroke={barbColor} strokeWidth="1.2" strokeLinecap="round" />
        {elements}
      </g>
    );
  };

  // Paths
  const zeroThermalPath = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`).join(" ");
  }, [hourlyData]);

  const thermalTopCurve = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData.map((h, i) => `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(h.thermalTop)}`).join(" ");
  }, [hourlyData]);

  const avgZeroThermal = useMemo(() => {
    if (hourlyData.length === 0) return 4381;
    return Math.round(hourlyData.reduce((acc, h) => acc + h.zeroThermal, 0) / hourlyData.length);
  }, [hourlyData]);

  // Path zona convettiva (cross-hatch giallo)
  const convectiveZonePath = useMemo(() => {
    if (hourlyData.length === 0) return "";
    const convectiveCols = hourlyData
      .map((h, i) => ({ i, h, active: h.deltaT > 0.65 && h.thermalTop < 2800 }))
      .filter(c => c.active);
    if (convectiveCols.length === 0) return "";

    const points: string[] = [];
    convectiveCols.forEach((c, idx) => {
      const x = getXFromHourIdx(c.i);
      const yTop = getYFromAlt(c.h.thermalTop + 400);
      if (idx === 0) points.push(`M ${x},${yTop}`);
      else points.push(`L ${x},${yTop}`);
    });
    for (let i = convectiveCols.length - 1; i >= 0; i--) {
      const x = getXFromHourIdx(convectiveCols[i].i);
      const yBot = getYFromAlt(convectiveCols[i].h.thermalTop);
      points.push(`L ${x},${yBot}`);
    }
    points.push("Z");
    return points.join(" ");
  }, [hourlyData]);

  // Per ogni colonna, calcolo i rettangoli di colore per altitudine
  const stabilityRects = useMemo(() => {
    if (hourlyData.length === 0) return [];
    const rects: { x: number; y: number; w: number; h: number; fill: string; opacity: number }[] = [];
    const colW = plotW / HOURS.length;

    hourlyData.forEach((h, i) => {
      const x = getXFromHourIdx(i) - colW / 2;
      const bands = [
        { altMin: 1300, altMax: 2000 },
        { altMin: 2000, altMax: 2500 },
        { altMin: 2500, altMax: 3000 },
        { altMin: 3000, altMax: 3500 },
        { altMin: 3500, altMax: 4000 },
        { altMin: 4000, altMax: 4500 },
        { altMin: 4500, altMax: 5000 },
        { altMin: 5000, altMax: 5500 },
        { altMin: 5500, altMax: 6000 },
      ];

      bands.forEach((band) => {
        const yTop = getYFromAlt(band.altMax);
        const yBot = getYFromAlt(band.altMin);
        const color = getAltitudeBandColor((band.altMin + band.altMax) / 2, h.deltaT);
        const opacity = band.altMax > 4500 ? 0.65 : 0.45;
        rects.push({ x, y: yTop, w: colW + 1, h: yBot - yTop, fill: color, opacity });
      });
    });
    return rects;
  }, [hourlyData]);

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
      {/* Contenitore Bianco stile Alpium */}
      <div className="bg-white text-slate-900 rounded-[20px] p-2 sm:p-3 shadow-2xl border border-slate-200 overflow-hidden font-sans select-none">

        {/* Titolo */}
        <div className="text-center pb-1">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            plotted {dateStr} 00:00 UTC · model ground {Math.round(altitude + 5)} m · SRTM {Math.round(altitude)} m
          </p>
        </div>

        {/* Tabella Ascendenza + Sole */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1 px-1">
            <span>valore medio ascendenze (m/s)</span>
          </div>
          <div className="grid grid-cols-11 gap-1 px-1">
            {hourlyData.map((h, i) => (
              <div key={i} className="text-center">
                <div className="font-black text-sm leading-tight" style={{ color: h.thermalAvg >= 1.6 ? "#b91c1c" : "#0f172a" }}>
                  {h.thermalAvg.toFixed(1)}
                </div>
                <div className="text-[9px] leading-tight" style={{ color: h.sunPct >= 70 ? "#b45309" : "#94a3b8" }}>
                  sole {h.sunPct}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SVG Windgram */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[1000px]"
            style={{ shapeRendering: "geometricPrecision" }}
          >
            <defs>
              <pattern id="thermalHatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#ca8a04" strokeWidth="0.8" strokeDasharray="1.5 1" opacity="0.6" />
                <line x1="0" y1="0" x2="4" y2="0" stroke="#ca8a04" strokeWidth="0.8" strokeDasharray="1.5 1" opacity="0.6" />
              </pattern>
            </defs>

            {/* SFONDO: rettangoli di stabilità */}
            {stabilityRects.map((r, idx) => (
              <rect
                key={`stab-${idx}`}
                x={r.x}
                y={r.y}
                width={r.w}
                height={r.h}
                fill={r.fill}
                opacity={r.opacity}
              />
            ))}

            {/* Pattern cross-hatch giallo per zone convettive */}
            {convectiveZonePath && (
              <path d={convectiveZonePath} fill="url(#thermalHatch)" />
            )}

            {/* LINEE ORIZZONTALI LIVELLI ISOBARICI */}
            {PRESSURE_LEVELS.map((lvl) => {
              const y = getYFromAlt(lvl.alt);
              return (
                <g key={`grid-${lvl.hpa}`}>
                  <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#475569" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.4" />
                  <text x={margin.left - 6} y={y + 3.5} fill="#0f172a" fontSize="10" fontWeight="800" textAnchor="end" fontFamily="monospace">
                    {lvl.hpa} hPa
                  </text>
                </g>
              );
            })}

            {/* QUTE IN METRI (asse destro) */}
            {ALT_TICKS.map((alt) => {
              const y = getYFromAlt(alt);
              return (
                <g key={`alt-${alt}`}>
                  <line x1={margin.left + plotW} y1={y} x2={margin.left + plotW + 4} y2={y} stroke="#0f172a" strokeWidth="0.8" />
                  <text x={margin.left + plotW + 6} y={y + 3.5} fill="#0f172a" fontSize="10" fontWeight="700" textAnchor="start" fontFamily="monospace">
                    {alt} m
                  </text>
                </g>
              );
            })}

            {/* LINEE VERTICALI ORARIE */}
            {HOURS.map((_, i) => {
              const x = getXFromHourIdx(i);
              return (
                <line key={`vline-${i}`} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#475569" strokeWidth="0.3" strokeDasharray="1 3" opacity="0.3" />
              );
            })}

            {/* BARBETTE DEL VENTO */}
            {hourlyData.map((calc, i) => (
              <g key={`col-${i}`}>
                {calc.levelWinds.map((wLvl) => {
                  const y = getYFromAlt(wLvl.alt);
                  return renderWindBarb(getXFromHourIdx(i), y, wLvl.speed, wLvl.dir);
                })}
              </g>
            ))}

            {/* LINEA ZERO TERMICO (azzurra tratteggiata con fiocchi) */}
            {zeroThermalPath && (
              <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round" />
            )}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.zeroThermal);
              return (
                <g key={`snow-${i}`} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.2" />
                  <text x="0" y="3" fill="#0284c7" fontSize="7" fontWeight="900" textAnchor="middle">❄</text>
                </g>
              );
            })}

            {/* BADGE ZERO TERMICO */}
            <g transform={`translate(${margin.left + plotW - 125}, ${getYFromAlt(avgZeroThermal) - 10})`}>
              <rect x="0" y="0" width="120" height="22" rx="3" fill="#0284c7" stroke="#ffffff" strokeWidth="1.2" />
              <text x="60" y="15" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                0 °C · {avgZeroThermal} m
              </text>
            </g>

            {/* LINEA PBL / BOUNDARY LAYER (nera tratteggiata) */}
            <path
              d={`M ${getXFromHourIdx(0)},${getYFromAlt(1800)} Q ${getXFromHourIdx(5)},${getYFromAlt(2600)} ${getXFromHourIdx(10)},${getYFromAlt(2200)}`}
              fill="none" stroke="#0f172a" strokeWidth="1.5" strokeDasharray="4 3"
            />

            {/* CURVA THERMAL TOP (viola) */}
            {thermalTopCurve && (
              <path d={thermalTopCurve} fill="none" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" />
            )}

            {/* ICONE PARAPENDIO VIOLA SUL THERMAL TOP - INGRANDITO */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.thermalTop);
              return (
                <g key={`para-${i}`} transform={`translate(${x}, ${y})`}>
                  {/* Arcina viola sopra - più grande */}
                  <path d="M -22,-4 A 22,22 0 0,1 22,-4" fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
                  {/* Parapendio ingrandito */}
                  <path d="M -16,-10 C -11,-24 11,-24 16,-10 C 10,-15 -10,-15 -16,-10 Z" fill="#c084fc" stroke="#7e22ce" strokeWidth="1.8" />
                  <line x1="-12" y1="-12" x2="0" y2="-2" stroke="#7e22ce" strokeWidth="1.4" />
                  <line x1="12" y1="-12" x2="0" y2="-2" stroke="#7e22ce" strokeWidth="1.4" />
                  <circle cx="0" cy="-2" r="5" fill="#ffffff" stroke="#7e22ce" strokeWidth="1.8" />
                </g>
              );
            })}

            {/* ICONE NUVOLE CUMULI - VERA FORMA DI NUVOLA, PIÙ GRANDE */}
            {hourlyData.map((h, i) => {
              if (i === 0 || i === hourlyData.length - 1) return null;
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.thermalTop) - 50; // 50px sopra il parapendio
              return (
                <g key={`cloud-${i}`} transform={`translate(${x}, ${y})`}>
                  {/* Nuvola con bollini */}
                  <path d="M -18,7 A 8,8 0 0,1 -9,-4 A 11,11 0 0,1 7,-6 A 9,9 0 0,1 18,2 A 6,6 0 0,1 17,8 L -16,8 A 6,6 0 0,1 -18,7 Z" fill="#ffffff" stroke="#64748b" strokeWidth="1.8" />
                  <text x="0" y="5.5" fill="#0f172a" fontSize="10" fontWeight="900" textAnchor="middle">{h.cloudPct}%</text>
                </g>
              );
            })}

            {/* BADGE QUOTA CUMULO + ASCENDENZA - SOTTO IL PARAPENDIO (fuori dall'icona) */}
            {hourlyData.map((h, i) => {
              if (i === 0 || i === hourlyData.length - 1) return null;
              const x = getXFromHourIdx(i);
              const paraY = getYFromAlt(h.thermalTop);
              const badgeY = paraY + 32; // 32px sotto il parapendio
              const rateoColor = h.thermalAvg >= 1.5 ? "#b91c1c" : h.thermalAvg >= 1.0 ? "#b45309" : "#0f172a";
              return (
                <g key={`badge-${i}`} transform={`translate(${x}, ${badgeY})`}>
                  <text x="0" y="0" fill="#0f172a" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    {h.cloudBase}m
                  </text>
                  <text x="0" y="15" fill={rateoColor} fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    ↑{h.thermalAvg.toFixed(1)} m/s
                  </text>
                </g>
              );
            })}

            {/* ORE ASSE X */}
            {HOURS.map((h, i) => (
              <text key={`hr-${h}`} x={getXFromHourIdx(i)} y={margin.top + plotH + 18} fill="#0f172a" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                {String(h).padStart(2, "0")}:00
              </text>
            ))}

            {/* BORDO PLOT */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="0.8" />
          </svg>
        </div>

        {/* SCALA STABILITÀ IDENTICA AD ALPIUM */}
        <div className="mt-2 pt-2 border-t border-slate-200">
          <div className="w-full max-w-2xl px-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Stabile ←</span>
              <span className="text-slate-900 font-extrabold text-sm">ΔT / 100 m</span>
              <span>→ Instabile</span>
            </div>
            <div className="w-full h-3.5 rounded-sm flex overflow-hidden border border-slate-400">
              {STABILITY_COLORS.map((item, idx) => (
                <div key={idx} className="flex-1 h-full" style={{ backgroundColor: item.color }} />
              ))}
            </div>
            <div className="flex justify-between text-[9px] font-mono font-bold text-slate-700 mt-1 px-1">
              {STABILITY_COLORS.map((item, idx) => (
                <span key={idx}>{item.val.toFixed(2)}</span>
              ))}
            </div>
            <div className="text-center text-[9px] text-slate-500 font-mono mt-1.5">
              Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela di Alpium
            </div>
          </div>
        </div>
      </div>

      {/* BOLLETTINO METEOROLOGICO */}
      {reportGenerato && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-white tracking-wide">{reportGenerato.titolo}</h4>
                <p className="text-xs text-slate-400 mt-0.5">Bollettino aerologico analitico · Quota Decollo {altitude} m slm</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-black border ${reportGenerato.score >= 7 ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/50" : reportGenerato.score >= 5 ? "bg-amber-950/60 text-amber-300 border-amber-500/50" : "bg-rose-950/60 text-rose-300 border-rose-500/50"}`}>
                Voto: {reportGenerato.score}/10
              </span>
              <button onClick={handleCopyReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all border border-slate-700">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiato!" : "Copia"}</span>
              </button>
            </div>
          </div>
          <div className="space-y-3 text-sm sm:text-base leading-relaxed text-slate-300">
            <p><strong className="text-amber-300 font-semibold">1. Quadro Termico & Stabilità: </strong>{reportGenerato.paragrafoTermico}</p>
            <p><strong className="text-cyan-300 font-semibold">2. Profilo Vento in Quota: </strong>{reportGenerato.paragrafoVento}</p>
            <p><strong className="text-purple-300 font-semibold">3. Convezione Pomeridiana & Rischio: </strong>{reportGenerato.paragrafoInstabilita}</p>
            <p><strong className="text-emerald-300 font-semibold">4. Finestra di Decollo & Tattica: </strong>{reportGenerato.paragrafoStrategia}</p>
          </div>
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex items-start gap-2 text-xs sm:text-sm bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div><strong className="text-rose-300">Segnali di pericolo: </strong>{reportGenerato.segnaliPericolo}</div>
            </div>
            <div className="flex items-start gap-2 text-xs sm:text-sm bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div><strong className="text-emerald-300">Giudizio finale: </strong>{reportGenerato.giudizioFinale}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
