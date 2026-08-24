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

// Livelli di pressione (hPa -> quota approssimativa standard)
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

const ALT_TICKS = [6000, 5000, 4000, 3000, 2000, 1500];

// Scala colori stabilità (-0.20 -> 1.20)
const STABILITY_SCALE = [
  { val: -0.20, color: "#8a5bb8" }, // viola (molto stabile / inversione)
  { val: 0.00, color: "#4f7fd9" },  // blu
  { val: 0.16, color: "#45b3cd" },  // azzurro ciano
  { val: 0.32, color: "#4ec099" },  // verde acqua
  { val: 0.48, color: "#8bc953" },  // verde chiaro
  { val: 0.65, color: "#d8c728" },  // giallo verde
  { val: 0.82, color: "#eeb319" },  // giallo oro
  { val: 0.98, color: "#e86c1f" },  // arancione
  { val: 1.20, color: "#c92e1e" },  // rosso scuro (forte instabilità)
];

function getStabilityColor(deltaT: number): string {
  if (deltaT <= -0.1) return STABILITY_SCALE[0].color;
  if (deltaT <= 0.08) return STABILITY_SCALE[1].color;
  if (deltaT <= 0.24) return STABILITY_SCALE[2].color;
  if (deltaT <= 0.40) return STABILITY_SCALE[3].color;
  if (deltaT <= 0.56) return STABILITY_SCALE[4].color;
  if (deltaT <= 0.73) return STABILITY_SCALE[5].color;
  if (deltaT <= 0.90) return STABILITY_SCALE[6].color;
  if (deltaT <= 1.10) return STABILITY_SCALE[7].color;
  return STABILITY_SCALE[8].color;
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
        "rain",
        "showers",
        "weather_code",
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

  const width = 960;
  const height = 490;
  const margin = { top: 78, right: 75, bottom: 65, left: 75 };
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

  // Dati orari calcolati esattamente su Open-Meteo per il giorno selezionato
  const hourlyData = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times: string[] = data.hourly.time;

    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) {
        return {
          hour: targetHour,
          sunPct: 20,
          thermalAvg: 0.2,
          tempGround: 15,
          windGround: 8,
          windDirGround: 180,
          precip: 0,
          cloudCover: 50,
          zeroThermal: 3200,
          thermalTop: altitude + 200,
          cloudBase: altitude + 200,
          cloudPct: 50,
          deltaT: 0.3,
          levelWinds: LEVELS.map((l) => ({ ...l, speed: 12, dir: 180 })),
        };
      }

      const h = data.hourly;
      const t = h.temperature_2m[idx] ?? 15;
      const dew = h.dew_point_2m[idx] ?? (t - 6);
      const rad = h.shortwave_radiation?.[idx] ?? 0;
      const cloud = h.cloud_cover?.[idx] ?? 60;
      const precip = h.precipitation?.[idx] ?? 0;
      const code = h.weather_code?.[idx] ?? 0;
      const wind10 = h.wind_speed_10m?.[idx] ?? 8;
      const windDir10 = h.wind_direction_10m?.[idx] ?? 180;
      const freeze = h.freezing_level_height?.[idx] ?? (altitude + (t / 0.0098) * 100);
      const cape = h.cape?.[idx] ?? 150;

      // Calcolo % di sole reale basato su irraggiamento e nuvole
      let sunPct = 0;
      if (cloud >= 90 || precip > 0.2) {
        sunPct = Math.min(15, Math.max(0, Math.round(rad / 50)));
      } else {
        sunPct = Math.min(100, Math.max(5, Math.round(((rad / 850) * (1 - (cloud / 100) * 0.7)) * 100)));
      }

      // Spread Termico & Base Cumulo
      const spread = Math.max(0.2, t - dew);
      const cloudBase = Math.round(altitude + spread * 125);
      const cloudPct = Math.max(0, Math.min(100, Math.round(cloud)));

      // Gradiente T verticale
      let deltaT = 0.45;
      const t80 = h.temperature_80m?.[idx];
      const t120 = h.temperature_120m?.[idx];
      if (t80 != null) deltaT = Math.round(((t - t80) / 78) * 100 * 100) / 100;
      else if (t120 != null) deltaT = Math.round(((t - t120) / 118) * 100 * 100) / 100;
      else deltaT = spread >= 10 ? 0.98 : spread >= 6 ? 0.75 : spread >= 3 ? 0.50 : 0.25;

      // Rateo termico REALISTICO: se piove o è coperto al 90%+ è 0 o 0.1-0.3 m/s
      let rateo = 0.0;
      if (precip > 0.8 || code >= 95) {
        rateo = 0.0;
      } else if (precip > 0.1 || cloud >= 85) {
        rateo = Math.min(0.4, Math.max(0.1, spread * 0.05));
      } else {
        rateo = Math.max(0.3, Math.min(3.5, 0.4 + (spread * 0.15) + (sunPct / 100) * 0.6 + (cape > 300 ? (cape / 800) * 0.5 : 0)));
      }
      rateo = Math.round(rateo * 10) / 10;

      // Quota top termico
      const thermalTop = Math.round(Math.min(4200, cloudBase + (rateo > 0.4 ? rateo * 200 + cape * 0.2 : 50)));

      // Venti reali per livello isobarico
      const levelWinds = [
        { hpa: 500, alt: 5800, speed: h.wind_speed_500hPa?.[idx] ?? (wind10 * 2.4), dir: h.wind_direction_500hPa?.[idx] ?? (windDir10 + 20) },
        { hpa: 550, alt: 5000, speed: (h.wind_speed_500hPa?.[idx] ? h.wind_speed_500hPa[idx] * 0.9 : wind10 * 2.1), dir: (h.wind_direction_500hPa?.[idx] ?? windDir10) + 15 },
        { hpa: 600, alt: 4400, speed: h.wind_speed_600hPa?.[idx] ?? (wind10 * 1.8), dir: h.wind_direction_600hPa?.[idx] ?? (windDir10 + 10) },
        { hpa: 650, alt: 3750, speed: (h.wind_speed_700hPa?.[idx] ? h.wind_speed_700hPa[idx] * 1.1 : wind10 * 1.5), dir: (h.wind_direction_700hPa?.[idx] ?? windDir10) + 5 },
        { hpa: 700, alt: 3100, speed: h.wind_speed_700hPa?.[idx] ?? (wind10 * 1.3), dir: h.wind_direction_700hPa?.[idx] ?? windDir10 },
        { hpa: 750, alt: 2500, speed: (h.wind_speed_850hPa?.[idx] ? h.wind_speed_850hPa[idx] * 1.1 : wind10 * 1.15), dir: (h.wind_direction_850hPa?.[idx] ?? windDir10) },
        { hpa: 800, alt: 1950, speed: (h.wind_speed_850hPa?.[idx] ? h.wind_speed_850hPa[idx] * 0.95 : wind10 * 1.05), dir: (h.wind_direction_850hPa?.[idx] ?? windDir10) },
        { hpa: 850, alt: 1450, speed: h.wind_speed_850hPa?.[idx] ?? wind10, dir: (h.wind_direction_850hPa?.[idx] ?? windDir10) },
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
        thermalTop,
        cloudBase,
        cloudPct,
        deltaT,
        levelWinds,
      };
    });
  }, [data, altitude]);

  // Report Meteorologico Testuale
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

  // Barbette vento
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number) => {
    if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
    const knots = speedKmh * 0.539957;
    const angle = ((dirDeg - 90) * Math.PI) / 180;
    const staffLen = 20;
    const endX = x + staffLen * Math.cos(angle);
    const endY = y + staffLen * Math.sin(angle);

    const barbColor = speedKmh > 30 ? "#d946ef" : speedKmh > 18 ? "#0284c7" : "#2563eb";

    const elements = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 1.0;
    const barbAngle = angle + (115 * Math.PI) / 180;

    // Pennacchio 50 nodi
    while (rem >= 50 && pos >= 0.3) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const p1 = `${bx},${by}`;
      const p2 = `${bx + 10 * Math.cos(barbAngle)},${by + 10 * Math.sin(barbAngle)}`;
      const p3 = `${bx + 5 * Math.cos(angle)},${by + 5 * Math.sin(angle)}`;
      elements.push(<polygon key={`p50-${x}-${y}-${pos}`} points={`${p1} ${p2} ${p3}`} fill={barbColor} stroke={barbColor} strokeWidth="1" />);
      rem -= 50;
      pos -= 0.28;
    }

    // Alette 10 nodi
    while (rem >= 10 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <line
          key={`l10-${x}-${y}-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 9.5 * Math.cos(barbAngle)}
          y2={by + 9.5 * Math.sin(barbAngle)}
          stroke={barbColor}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      );
      rem -= 10;
      pos -= 0.18;
    }

    // Alette 5 nodi
    if (rem >= 5 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <line
          key={`l5-${x}-${y}-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 5.5 * Math.cos(barbAngle)}
          y2={by + 5.5 * Math.sin(barbAngle)}
          stroke={barbColor}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      );
    }

    return (
      <g key={`wb-${x}-${Math.round(y)}`}>
        <line x1={x} y1={y} x2={endX} y2={endY} stroke={barbColor} strokeWidth="1.7" strokeLinecap="round" />
        {elements}
      </g>
    );
  };

  // Linea tratteggiata Zero Termico
  const zeroThermalPath = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`).join(" ");
  }, [hourlyData]);

  // Curva Paracadute Viola (Top Termico)
  const thermalTopCurve = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData
      .map((h, i) => `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(h.thermalTop)}`)
      .join(" ");
  }, [hourlyData]);

  const avgZeroThermal = useMemo(() => {
    if (hourlyData.length === 0) return 3500;
    const sum = hourlyData.reduce((acc, h) => acc + h.zeroThermal, 0);
    return Math.round(sum / hourlyData.length);
  }, [hourlyData]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-slate-300 shadow-2xl">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
        <span className="text-base font-bold text-white">Caricamento Grafico Aerologico...</span>
        <span className="text-xs text-slate-400 mt-1">{siteName} ({altitude}m)</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-5 text-center text-rose-300">
        <AlertTriangle className="w-7 h-7 mx-auto mb-2 text-rose-400" />
        <p className="font-bold text-white text-sm">Impossibile caricare i dati Open-Meteo</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  const isRainyDay = hourlyData.some(h => h.precip > 0.1 || h.cloudCover > 80);

  return (
    <div className="space-y-4">
      {/* Contenitore Grafico */}
      <div className="bg-white text-slate-900 rounded-2xl p-3 sm:p-5 shadow-xl border border-slate-300 overflow-hidden font-sans select-none">
        
        {/* Titolo Principale in Alto */}
        <div className="text-center pb-2">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight lowercase">
            {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-600 font-mono tracking-wide mt-0.5 font-semibold">
            plotted {dateStr} 00:00 UTC &middot; model ground {Math.round(altitude + 5)} m &middot; SRTM {Math.round(altitude)} m
          </p>
        </div>

        {/* SVG Windgram */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[760px]"
            style={{ shapeRendering: "geometricPrecision", textRendering: "geometricPrecision" }}
          >
            <defs>
              <pattern id="thermalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#0f172a" strokeWidth="1.1" strokeDasharray="2 2" opacity="0.35" />
                <line x1="0" y1="0" x2="8" y2="0" stroke="#0f172a" strokeWidth="1.1" strokeDasharray="2 2" opacity="0.35" />
              </pattern>
            </defs>

            {/* HEADER METRICHE: Valore Medio Ascendenze & Sole % */}
            <text x={margin.left + plotW / 2} y={26} fill="#334155" fontSize="12" fontWeight="800" textAnchor="middle">
              valore medio ascendenze (m/s)
            </text>

            <text x={margin.left - 10} y={64} fill="#a16207" fontSize="11" fontWeight="900" textAnchor="end">
              sole %
            </text>

            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const isStrong = h.thermalAvg >= 1.5;
              const isZero = h.thermalAvg <= 0.3;
              return (
                <g key={`head-col-${i}`}>
                  <text
                    x={x}
                    y={46}
                    fill={isZero ? "#64748b" : isStrong ? "#b91c1c" : "#0f172a"}
                    fontSize="15"
                    fontWeight="900"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {h.thermalAvg.toFixed(1)}
                  </text>
                  <text
                    x={x}
                    y={64}
                    fill={h.sunPct >= 80 ? "#16a34a" : h.sunPct >= 40 ? "#ca8a04" : "#dc2626"}
                    fontSize="12"
                    fontWeight="900"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {h.sunPct}
                  </text>
                </g>
              );
            })}

            {/* SFONDO DINAMICO & ZONE DI STABILITÀ */}
            <rect
              x={margin.left}
              y={margin.top}
              width={plotW}
              height={plotH}
              fill={isRainyDay ? "#94a3b8" : "#a3e635"}
              opacity={isRainyDay ? "0.6" : "1"}
            />

            {/* Fasce Inferiori Stabilità collegate al gradiente reale di ciascuna ora */}
            {hourlyData.map((h, i) => {
              if (i >= hourlyData.length - 1) return null;
              const x1 = getXFromHourIdx(i);
              const x2 = getXFromHourIdx(i + 1);
              const w = x2 - x1;
              const col = getStabilityColor(h.deltaT);

              return (
                <rect
                  key={`ground-col-${i}`}
                  x={x1}
                  y={getYFromAlt(2300)}
                  width={w}
                  height={margin.top + plotH - getYFromAlt(2300)}
                  fill={col}
                  opacity="0.8"
                />
              );
            })}

            {/* Retinato Termico (visibile solo se non piove forte) */}
            {!isRainyDay && (
              <path
                d={`M ${getXFromHourIdx(2)},${getYFromAlt(1450)} 
                    L ${getXFromHourIdx(2)},${getYFromAlt(2100)} 
                    Q ${getXFromHourIdx(5)},${getYFromAlt(2400)} ${getXFromHourIdx(8)},${getYFromAlt(2200)} 
                    L ${getXFromHourIdx(10)},${getYFromAlt(1800)} 
                    L ${getXFromHourIdx(10)},${getYFromAlt(1450)} Z`}
                fill="url(#thermalHatch)"
              />
            )}

            {/* LIVELLI ISOBARICI & QUOTE */}
            {LEVELS.map((lvl) => {
              const y = getYFromAlt(lvl.alt);
              return (
                <g key={`grid-lvl-${lvl.hpa}`}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={margin.left + plotW}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="0.8"
                    strokeDasharray="2 3"
                    opacity="0.45"
                  />
                  <text x={margin.left - 8} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="900" textAnchor="end">
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
                  <line
                    x1={margin.left + plotW}
                    y1={y}
                    x2={margin.left + plotW + 5}
                    y2={y}
                    stroke="#0f172a"
                    strokeWidth="1.2"
                  />
                  <text x={margin.left + plotW + 8} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="start">
                    {alt} m
                  </text>
                </g>
              );
            })}

            {/* LINEE VERTICALI ORARIE */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <line
                  key={`vline-${h}`}
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + plotH}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                  strokeDasharray="2 3"
                  opacity="0.3"
                />
              );
            })}

            {/* BARBETTE DEL VENTO REALI */}
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

            {/* LINEA DELLO ZERO TERMICO */}
            {zeroThermalPath && (
              <polyline
                points={zeroThermalPath}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.6"
                strokeDasharray="5 3"
                strokeLinecap="round"
              />
            )}

            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.zeroThermal);
              return (
                <g key={`zero-snowflake-${i}`} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="7.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                  <text x="0" y="3.5" fill="#0284c7" fontSize="10" fontWeight="900" textAnchor="middle">
                    ❄
                  </text>
                </g>
              );
            })}

            {/* BADGE ZERO TERMICO LATERALE */}
            <g transform={`translate(${margin.left + plotW - 130}, ${getYFromAlt(avgZeroThermal) - 12})`}>
              <rect x="0" y="0" width="124" height="24" rx="5" fill="#0284c7" stroke="#ffffff" strokeWidth="1.8" filter="drop-shadow(0 2px 3px rgba(0,0,0,0.15))" />
              <text x="62" y="16" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                0 °C &middot; {avgZeroThermal} m
              </text>
            </g>

            {/* CURVA TOP TERMICO (VIOLA) */}
            {thermalTopCurve && (
              <path d={thermalTopCurve} fill="none" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" />
            )}

            {/* ICONE PARACADUTE */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.thermalTop);
              return (
                <g key={`paraglider-icon-${i}`} transform={`translate(${x}, ${y})`}>
                  <path
                    d="M -16,-5 C -13,-18 13,-18 16,-5 C 10,-8 -10,-8 -16,-5 Z"
                    fill={h.thermalAvg <= 0.3 ? "#94a3b8" : "#c084fc"}
                    stroke={h.thermalAvg <= 0.3 ? "#475569" : "#6b21a8"}
                    strokeWidth="1.8"
                  />
                  <line x1="-13" y1="-6" x2="0" y2="1" stroke="#6b21a8" strokeWidth="1.1" />
                  <line x1="13" y1="-6" x2="0" y2="1" stroke="#6b21a8" strokeWidth="1.1" />
                  <circle cx="0" cy="1.5" r="3.5" fill="#ffffff" stroke="#6b21a8" strokeWidth="1.8" />
                </g>
              );
            })}

            {/* CARTELLINI CUMULI */}
            {hourlyData.map((h, i) => {
              if (i === 0 || i === hourlyData.length - 1) return null;
              const x = getXFromHourIdx(i);
              const cloudY = getYFromAlt(h.cloudBase + 240);
              const isRain = h.precip > 0;

              return (
                <g key={`cumulus-cloud-${i}`} transform={`translate(${x}, ${cloudY})`}>
                  <path
                    d="M -16,2 A 5.5,5.5 0 0,1 -7,-5 A 9,9 0 0,1 7,-6 A 5.5,5.5 0 0,1 16,1 A 4.5,4.5 0 0,1 13,7 L -13,7 A 4.5,4.5 0 0,1 -16,2 Z"
                    fill={isRain ? "#cbd5e1" : "#ffffff"}
                    stroke="#334155"
                    strokeWidth="1.4"
                    filter="drop-shadow(0 1.5px 2.5px rgba(0,0,0,0.12))"
                  />
                  <text x="0" y="4" fill={isRain ? "#0284c7" : "#0f172a"} fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                    {isRain ? "🌧️" : `${h.cloudPct}%`}
                  </text>
                </g>
              );
            })}

            {/* BADGE QUOTA BASE & ASCENDENZA */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const badgeY = getYFromAlt(h.thermalTop) + 12;
              const isBad = h.thermalAvg <= 0.3;

              return (
                <g key={`badge-data-${i}`} transform={`translate(${x}, ${badgeY})`}>
                  <rect
                    x="-26"
                    y="0"
                    width="52"
                    height="26"
                    rx="5"
                    fill="#ffffff"
                    stroke={isBad ? "#94a3b8" : "#ea580c"}
                    strokeWidth="1.3"
                    filter="drop-shadow(0 1.5px 3px rgba(0,0,0,0.15))"
                  />
                  <text x="0" y="10.5" fill="#0f172a" fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    {h.cloudBase} m
                  </text>
                  <text x="0" y="21" fill={isBad ? "#64748b" : "#b91c1c"} fontSize="9" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    {isBad ? "0.0 m/s" : `↑ ${h.thermalAvg.toFixed(1)} m/s`}
                  </text>
                </g>
              );
            })}

            {/* ASSE X INFERIORE: ORE 08:00 - 18:00 */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <text
                  key={`label-hour-${h}`}
                  x={x}
                  y={margin.top + plotH + 20}
                  fill="#0f172a"
                  fontSize="11.5"
                  fontWeight="900"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {String(h).padStart(2, "0")}:00
                </text>
              );
            })}

            {/* BORDO RETTANGOLARE DEL PLOT */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.3" />
          </svg>
        </div>

        {/* SCALA GRADIENTE INFERIORE */}
        <div className="mt-3 pt-2.5 border-t border-slate-200 flex flex-col items-center">
          <div className="w-full max-w-xl px-1">
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-black text-slate-800 mb-1">
              <span>Stabile &larr;</span>
              <span className="text-slate-950 font-black text-xs sm:text-sm font-mono">&Delta;T / 100 m</span>
              <span>&rarr; Instabile</span>
            </div>

            <div className="w-full h-3.5 rounded-sm flex overflow-hidden border border-slate-400 shadow-inner">
              {STABILITY_SCALE.map((item, idx) => (
                <div key={idx} className="flex-1 h-full" style={{ backgroundColor: item.color }} />
              ))}
            </div>

            <div className="flex justify-between text-[9px] sm:text-[11px] font-mono font-bold text-slate-800 mt-0.5 px-0.5">
              {STABILITY_SCALE.map((item, idx) => (
                <span key={idx}>{item.val.toFixed(2)}</span>
              ))}
            </div>

            <div className="text-center text-[10px] text-slate-500 font-mono mt-2">
              Fonte: Open-Meteo &middot; Diagnostica aerologica per volo libero
            </div>
          </div>
        </div>
      </div>

      {/* BOLLETTINO E REPORT METEOROLOGICO */}
      {reportGenerato && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-2xl p-4 sm:p-6 shadow-xl space-y-3.5 text-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-900/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-2">
                  {reportGenerato.titolo}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Quota Decollo {altitude} m slm
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                  reportGenerato.score >= 7
                    ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
                    : reportGenerato.score >= 4
                    ? "bg-amber-950/60 text-amber-300 border-amber-500/50"
                    : "bg-rose-950/60 text-rose-300 border-rose-500/50"
                }`}
              >
                Voto: {reportGenerato.score}/10
              </span>

              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-all border border-slate-700"
                title="Copia testo bollettino"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copiato!" : "Copia"}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed text-slate-300">
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

          <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-start gap-2 text-xs bg-rose-950/30 border border-rose-500/30 rounded-lg p-2.5 text-rose-200">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300">Segnali di pericolo: </strong>
                {reportGenerato.segnaliPericolo}
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-2.5 text-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
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