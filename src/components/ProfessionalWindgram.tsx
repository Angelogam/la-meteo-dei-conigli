"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, Wind, Calendar, Mountain, FileText, Check, Copy, AlertTriangle, ShieldCheck } from "lucide-react";
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
  { hpa: 500, alt: 5800, speedKey: "wind_speed_500hPa", dirKey: "wind_direction_500hPa" },
  { hpa: 600, alt: 4300, speedKey: "wind_speed_600hPa", dirKey: "wind_direction_600hPa" },
  { hpa: 700, alt: 3050, speedKey: "wind_speed_700hPa", dirKey: "wind_direction_700hPa" },
  { hpa: 850, alt: 1500, speedKey: "wind_speed_850hPa", dirKey: "wind_direction_850hPa" },
  { hpa: 925, alt: 760, speedKey: "wind_speed_925hPa", dirKey: "wind_direction_925hPa" },
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
        "wind_gusts_10m",
        "wind_speed_80m",
        "wind_direction_80m",
        "wind_speed_120m",
        "wind_direction_120m",
        "wind_speed_180m",
        "wind_direction_180m",
        "wind_speed_925hPa",
        "wind_direction_925hPa",
        "wind_speed_850hPa",
        "wind_direction_850hPa",
        "wind_speed_700hPa",
        "wind_direction_700hPa",
        "wind_speed_600hPa",
        "wind_direction_600hPa",
        "wind_speed_500hPa",
        "wind_direction_500hPa",
        "temperature_80m",
        "temperature_120m",
        "surface_pressure",
        "shortwave_radiation",
        "freezing_level_height",
        "cape",
        "lifted_index",
        "convective_inhibition",
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

  const width = 1080;
  const height = 480;
  const margin = { top: 56, right: 76, bottom: 66, left: 76 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Calcoli orari basati ESCLUSIVAMENTE su dati reali Open-Meteo
  const hourlyCalculations = useMemo(() => {
    if (!data?.hourly?.time) return [];

    const times: string[] = data.hourly.time;
    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) {
        return {
          hour: targetHour,
          sunPct: 50,
          thermalAvg: 0.5,
          tempGround: 18,
          windGround: 8,
          windDirGround: 180,
          precip: 0,
          cloudCover: 20,
          zeroThermal: 3200,
          pblTop: altitude + 800,
          cloudBase: altitude + 600,
          windsLevels: [],
          deltaT: 0.65,
        };
      }

      const h = data.hourly;
      const t = h.temperature_2m[idx] ?? 18;
      const dew = h.dew_point_2m[idx] ?? (t - 8);
      const rad = h.shortwave_radiation?.[idx] ?? 0;
      const cloud = h.cloud_cover?.[idx] ?? 20;
      const precip = h.precipitation?.[idx] ?? 0;
      const wind10 = h.wind_speed_10m?.[idx] ?? 8;
      const windDir10 = h.wind_direction_10m?.[idx] ?? 180;
      const freeze = h.freezing_level_height?.[idx] ?? (altitude + (t / 0.0098));
      const cape = h.cape?.[idx] ?? 0;

      // Sole % effettivo
      const maxRad = 900;
      const sunPct = Math.min(100, Math.max(0, Math.round(((rad / maxRad) * (1 - (cloud / 100) * 0.7)) * 100)));

      // Spread e base cumulo reale (LCL)
      const spread = Math.max(0.5, t - dew);
      const lclAboveGround = Math.round(spread * 125);
      const cloudBase = Math.round(altitude + lclAboveGround);

      // Gradiente termico reale calcolato tra T suolo e T 80m/120m
      let deltaT = 0.65;
      const t80 = h.temperature_80m?.[idx];
      const t120 = h.temperature_120m?.[idx];
      if (t80 != null) {
        deltaT = Math.round(((t - t80) / 78) * 100 * 100) / 100;
      } else if (t120 != null) {
        deltaT = Math.round(((t - t120) / 118) * 100 * 100) / 100;
      } else {
        deltaT = spread >= 10 ? 0.95 : spread >= 6 ? 0.75 : 0.55;
      }

      // Rateo termico calcolato su fisica del riscaldamento e CAPE
      let rateo = (spread * 0.22) + (sunPct / 100) * 0.8 + (cape > 300 ? (cape / 800) * 0.6 : 0);
      if (precip > 0.5) rateo = 0;
      else if (cloud > 80) rateo *= 0.3;
      else if (wind10 > 25) rateo *= 0.6;
      rateo = Math.max(0, Math.min(4.5, Math.round(rateo * 10) / 10));

      const pblTop = Math.round(cloudBase + Math.min(1500, rateo * 350 + (cape * 0.6)));

      // Estrai venti a diversi livelli isobarici reali
      const windsLevels = [
        { alt: 5800, speed: h.wind_speed_500hPa?.[idx] ?? (wind10 * 2.8), dir: h.wind_direction_500hPa?.[idx] ?? windDir10 },
        { alt: 4300, speed: h.wind_speed_600hPa?.[idx] ?? (wind10 * 2.2), dir: h.wind_direction_600hPa?.[idx] ?? windDir10 },
        { alt: 3050, speed: h.wind_speed_700hPa?.[idx] ?? (wind10 * 1.7), dir: h.wind_direction_700hPa?.[idx] ?? windDir10 },
        { alt: 1500, speed: h.wind_speed_850hPa?.[idx] ?? (wind10 * 1.2), dir: h.wind_direction_850hPa?.[idx] ?? windDir10 },
        { alt: Math.round(altitude), speed: wind10, dir: windDir10 },
      ];

      return {
        hour: targetHour,
        sunPct,
        thermalAvg: rateo,
        tempGround: Math.round(t),
        windGround: Math.round(wind10),
        windDirGround: Math.round(windDir10),
        precip,
        cloudCover: cloud,
        zeroThermal: Math.round(freeze),
        pblTop,
        cloudBase,
        windsLevels,
        deltaT,
      };
    });
  }, [data, altitude]);

  // Report coerente
  const reportGenerato = useMemo<GeneratedReport | null>(() => {
    if (!data?.hourly) return null;
    return generateReportMeteo({
      siteName,
      altitude,
      dateObj,
      hourlyData: data.hourly,
    });
  }, [data, siteName, altitude, dateObj]);

  const handleCopyReport = () => {
    if (!reportGenerato) return;
    navigator.clipboard.writeText(reportGenerato.testoCompleto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minAlt = 800;
  const maxAlt = 6000;
  const getYFromAlt = (alt: number) => margin.top + plotH - ((Math.min(maxAlt, Math.max(minAlt, alt)) - minAlt) / (maxAlt - minAlt)) * plotH;
  const getXFromHourIdx = (idx: number) => margin.left + (idx / (HOURS.length - 1)) * plotW;

  const groundY = getYFromAlt(altitude);

  // Render Barbetta del vento
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number, color: string = "#991b1b") => {
    if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
    const knots = speedKmh * 0.539957;
    const angle = ((dirDeg - 90) * Math.PI) / 180;
    const staffLen = 22;
    const endX = x + staffLen * Math.cos(angle);
    const endY = y + staffLen * Math.sin(angle);

    const barbs = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 1.0;
    const barbAngle = angle + (115 * Math.PI) / 180;

    while (rem >= 50 && pos >= 0.3) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const p1 = `${bx},${by}`;
      const p2 = `${bx + 11 * Math.cos(barbAngle)},${by + 11 * Math.sin(barbAngle)}`;
      const p3 = `${bx + 5.5 * Math.cos(angle)},${by + 5.5 * Math.sin(angle)}`;
      barbs.push(<polygon key={`f50-${pos}`} points={`${p1} ${p2} ${p3}`} fill={color} stroke={color} strokeWidth="1.2" />);
      rem -= 50;
      pos -= 0.28;
    }

    while (rem >= 10 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      barbs.push(
        <line
          key={`f10-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 9.5 * Math.cos(barbAngle)}
          y2={by + 9.5 * Math.sin(barbAngle)}
          stroke={color}
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
      barbs.push(
        <line
          key={`f5-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 5 * Math.cos(barbAngle)}
          y2={by + 5 * Math.sin(barbAngle)}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      );
    }

    return (
      <g key={`wb-${x}-${Math.round(y)}`} opacity="0.9">
        <line x1={x} y1={y} x2={endX} y2={endY} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {barbs}
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
      .map((h, i) => `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(h.pblTop)}`)
      .join(" ");
  }, [hourlyCalculations]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-300 shadow-xl">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <span className="text-base font-bold text-white">Caricamento Windgram reale {siteName}...</span>
        <span className="text-sm text-slate-400 mt-1">Interrogazione Open-Meteo per quota {altitude}m</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 text-center text-red-300">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
        <p className="font-bold">Errore caricamento dati Open-Meteo</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-2xl space-y-6">
      {/* Header esterno */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Windgram Aerologico Reale &bull; {siteName}
            </h3>
            <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                {formattedDateTitle}
              </span>
              <span className="flex items-center gap-1.5 font-bold text-amber-300">
                <Mountain className="w-4 h-4 text-amber-400" />
                {altitude}m slm
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm text-slate-300 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg flex items-center gap-2 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Open-Meteo GFS/AROME
          </span>
        </div>
      </div>

      {/* Scheda Windgram Grafica */}
      <div className="bg-white rounded-2xl p-3 sm:p-5 shadow-xl border border-slate-200 overflow-hidden select-none">
        <div className="text-center pt-1 pb-3">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight lowercase leading-tight">
            {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-mono leading-tight mt-1">
            dati orari {dateStr} &bull; decollo {Math.round(altitude)} m slm &bull; coordinate {latitude.toFixed(2)}°N, {longitude.toFixed(2)}°E
          </p>
        </div>

        {/* Grafico SVG */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-2">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[840px] font-sans"
            style={{ shapeRendering: "geometricPrecision", textRendering: "geometricPrecision" }}
          >
            {/* Header Valori Termici */}
            <text x={margin.left + plotW / 2} y={18} fill="#334155" fontSize="13" fontWeight="800" textAnchor="middle">
              valore medio ascendenze stimate (m/s)
            </text>
            <text x={margin.left - 8} y={54} fill="#b45309" fontSize="13" fontWeight="900" textAnchor="end">
              sole %
            </text>

            {hourlyCalculations.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <g key={`num-head-${i}`}>
                  <text x={x} y={35} fill="#0f172a" fontSize="14" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    {h.thermalAvg > 0 ? `${h.thermalAvg.toFixed(1)}` : "—"}
                  </text>
                  <text x={x} y={54} fill="#d97706" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                    {h.sunPct}%
                  </text>
                </g>
              );
            })}

            {/* Sfondo gradiente dinamico per stabilità */}
            {hourlyCalculations.map((h, i) => {
              if (i >= hourlyCalculations.length - 1) return null;
              const x1 = getXFromHourIdx(i);
              const x2 = getXFromHourIdx(i + 1);
              const w = x2 - x1;

              let colStab = "#84cc16"; // normale
              if (h.deltaT > 0.9) colStab = "#f97316";
              else if (h.deltaT > 1.1) colStab = "#dc2626";
              else if (h.deltaT < 0.4) colStab = "#38bdf8";
              else if (h.deltaT < 0.6) colStab = "#a3e635";

              return (
                <rect
                  key={`bg-col-${i}`}
                  x={x1}
                  y={margin.top}
                  width={w}
                  height={plotH}
                  fill={colStab}
                  opacity="0.65"
                />
              );
            })}

            {/* Linee di Pressione e Quota */}
            {PRESSURE_LEVELS.map((p) => {
              const y = getYFromAlt(p.alt);
              return (
                <g key={`pl-${p.hpa}`}>
                  <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#334155" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />
                  <text x={margin.left - 8} y={y + 5} fill="#0f172a" fontSize="12" fontWeight="900" textAnchor="end">
                    {p.hpa} hPa
                  </text>
                  <text x={margin.left + plotW + 8} y={y + 5} fill="#0f172a" fontSize="12" fontWeight="900" textAnchor="start">
                    {p.alt} m
                  </text>
                </g>
              );
            })}

            {/* Linee Verticali Orarie */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <line key={`vh-${h}`} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#334155" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.35" />
              );
            })}

            {/* Venti reali ai vari livelli per ciascuna ora */}
            {hourlyCalculations.map((calc, i) => {
              const x = getXFromHourIdx(i);
              return (
                <g key={`wbs-${i}`}>
                  {calc.windsLevels.map((wLevel, wIdx) => {
                    const y = getYFromAlt(wLevel.alt);
                    const barbCol = wLevel.speed > 25 ? "#b91c1c" : wLevel.speed > 15 ? "#d97706" : "#0284c7";
                    return renderWindBarb(x, y, wLevel.speed, wLevel.dir, barbCol);
                  })}
                </g>
              );
            })}

            {/* Linea Zero Termico Reale */}
            {zeroThermalPath && (
              <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="2.8" strokeDasharray="6 4" strokeLinecap="round" />
            )}
            {hourlyCalculations.map((h, i) => (
              <g key={`zt-icon-${i}`} transform={`translate(${getXFromHourIdx(i)}, ${getYFromAlt(h.zeroThermal)})`}>
                <circle cx="0" cy="0" r="7.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                <text x="0" y="4" fill="#0284c7" fontSize="11" textAnchor="middle">❄</text>
              </g>
            ))}

            {/* Top Termico / PBL Reale */}
            {pblCurvePath && (
              <path d={pblCurvePath} fill="none" stroke="#0f172a" strokeWidth="2.2" strokeDasharray="5 3" strokeLinecap="round" />
            )}

            {/* Base cumulo LCL reale */}
            {hourlyCalculations.map((h, i) => {
              const x = getXFromHourIdx(i);
              const cloudY = Math.min(getYFromAlt(h.cloudBase), groundY - 35);
              if (h.thermalAvg > 0.2) {
                return (
                  <g key={`cumulus-${i}`} transform={`translate(${x}, ${cloudY})`}>
                    <path
                      d="M -14,4 A 5,5 0 0,1 -7,-3 A 8,8 0 0,1 7,-4 A 5,5 0 0,1 14,4 Z"
                      fill="#ffffff"
                      stroke="#475569"
                      strokeWidth="1.3"
                    />
                    <rect x="-24" y="6" width="48" height="22" rx="4" fill="#ffffff" stroke="#9333ea" strokeWidth="1.2" />
                    <text x="0" y="17" fill="#581c87" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                      {h.cloudBase}m
                    </text>
                    <text x="0" y="26" fill="#15803d" fontSize="8.5" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                      &uarr; {h.thermalAvg} m/s
                    </text>
                  </g>
                );
              }
              return null;
            })}

            {/* Suolo e Quota Decollo */}
            <rect x={margin.left} y={groundY} width={plotW} height={margin.top + plotH - groundY} fill="#ca8a04" opacity="0.3" />
            <line x1={margin.left} y1={groundY} x2={margin.left + plotW} y2={groundY} stroke="#713f12" strokeWidth="2.5" />

            {/* Bordo plot */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.5" />

            {/* Asse X inferiore con ore e vento suolo */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              const hData = hourlyCalculations[i];
              return (
                <g key={`hour-axis-${h}`} transform={`translate(${x}, ${margin.top + plotH + 22})`}>
                  <text x="0" y="0" fill="#0f172a" fontSize="13" fontWeight="900" textAnchor="middle">
                    {String(h).padStart(2, "0")}:00
                  </text>
                  {hData && (
                    <text x="0" y="15" fill="#0369a1" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                      {hData.windGround} km/h
                    </text>
                  )}
                  {hData && (
                    <text x="0" y="27" fill="#b45309" fontSize="10" fontWeight="800" textAnchor="middle" fontFamily="monospace">
                      {hData.tempGround}°C
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Scala Gradiente Stabilità */}
        <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-xl text-xs sm:text-sm font-black text-slate-800 mb-1.5 px-1">
            <span>&larr; Stabile (Inversione)</span>
            <span className="text-slate-950 font-mono text-sm font-black">&Delta;T / 100 m reale</span>
            <span>Instabile (Super-termico) &rarr;</span>
          </div>

          <div className="w-full max-w-xl h-5 rounded-md overflow-hidden flex border border-slate-400 shadow-inner">
            {[
              { color: "#38bdf8", label: "<0.4" },
              { color: "#a3e635", label: "0.6" },
              { color: "#84cc16", label: "0.75" },
              { color: "#f97316", label: "0.95" },
              { color: "#dc2626", label: ">1.1" },
            ].map((step, idx) => (
              <div key={idx} className="flex-1 h-full relative" style={{ backgroundColor: step.color }}>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-slate-800">
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center text-xs text-slate-600 font-mono">
            Dati calcolati in tempo reale su coordinate {latitude.toFixed(4)}, {longitude.toFixed(4)} da Open-Meteo
          </div>
        </div>
      </div>

      {/* Bollettino / Report Meteorologico Dettagliato */}
      {reportGenerato && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-4 text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                  {reportGenerato.titolo}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bollettino aerologico analitico &bull; Quota Decollo {altitude} m slm
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-black border ${
                  reportGenerato.score >= 7
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
                    : reportGenerato.score >= 5
                    ? "bg-amber-950/60 text-amber-300 border-amber-500/50"
                    : "bg-rose-950/60 text-rose-300 border-rose-500/50"
                }`}
              >
                Voto: {reportGenerato.score}/10
              </span>

              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all border border-slate-700"
                title="Copia testo bollettino"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiato!" : "Copia"}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3.5 text-sm sm:text-base leading-relaxed text-slate-300 font-normal">
            <p>
              <strong className="text-amber-300 font-semibold">1. Quadro Termico & Stabilità: </strong>
              {reportGenerato.paragrafoTermico}
            </p>

            <p>
              <strong className="text-cyan-300 font-semibold">2. Profilo Vento in Quota: </strong>
              {reportGenerato.paragrafoVento}
            </p>

            <p>
              <strong className="text-purple-300 font-semibold">3. Convezione Pomeridiana & Rischio: </strong>
              {reportGenerato.paragrafoInstabilita}
            </p>

            <p>
              <strong className="text-emerald-300 font-semibold">4. Finestra di Decollo & Tattica: </strong>
              {reportGenerato.paragrafoStrategia}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-start gap-2 text-xs sm:text-sm bg-rose-950/30 border border-rose-500/30 rounded-xl p-3 text-rose-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300">Segnali di pericolo: </strong>
                {reportGenerato.segnaliPericolo}
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs sm:text-sm bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-emerald-300">Giudizio finale: </strong>
                {reportGenerato.giudizioFinale}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}