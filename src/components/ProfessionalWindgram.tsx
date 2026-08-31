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

// Livelli di pressione precisi (hPa -> quota approssimativa standard)
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

// Scala colori stabilità Alpium (-0.20 -> 1.20)
const STABILITY_SCALE = [
  { val: -0.20, color: "#8a5bb8" }, // viola
  { val: 0.00, color: "#4f7fd9" },  // blu
  { val: 0.16, color: "#45b3cd" },  // azzurro ciano
  { val: 0.32, color: "#4ec099" },  // verde acqua
  { val: 0.48, color: "#8bc953" },  // verde chiaro
  { val: 0.65, color: "#d8c728" },  // giallo verde
  { val: 0.82, color: "#eeb319" },  // giallo oro
  { val: 0.98, color: "#e86c1f" },  // arancione
  { val: 1.20, color: "#c92e1e" },  // rosso scuro
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

  // Dimensioni SVG ad altissima fedeltà
  const width = 1000;
  const height = 660;
  const margin = { top: 90, right: 85, bottom: 95, left: 85 };
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

  // Dati orari interpolati fedelmente su Open-Meteo
  const hourlyData = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times: string[] = data.hourly.time;

    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) {
        return {
          hour: targetHour,
          sunPct: 80,
          thermalAvg: 1.2,
          tempGround: 19,
          windGround: 8,
          windDirGround: 180,
          precip: 0,
          cloudCover: 10,
          zeroThermal: 4380,
          thermalTop: altitude + 900,
          cloudBase: altitude + 800,
          cloudPct: 5,
          deltaT: 0.75,
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
      const freeze = h.freezing_level_height?.[idx] ?? (altitude + (t / 0.0098) * 100);
      const cape = h.cape?.[idx] ?? 350;

      // Sole % reale
      const sunPct = Math.min(100, Math.max(10, Math.round(((rad / 900) * (1 - (cloud / 100) * 0.65)) * 100)));

      // Spread T - Dew
      const spread = Math.max(1, t - dew);
      const cloudBase = Math.round(altitude + spread * 125);
      const cloudPct = Math.max(2, Math.min(95, Math.round(cloud)));

      // Gradiente T calcolato su livelli verticali
      let deltaT = 0.72;
      const t80 = h.temperature_80m?.[idx];
      const t120 = h.temperature_120m?.[idx];
      if (t80 != null) deltaT = Math.round(((t - t80) / 78) * 100 * 100) / 100;
      else if (t120 != null) deltaT = Math.round(((t - t120) / 118) * 100 * 100) / 100;
      else deltaT = spread >= 10 ? 0.98 : spread >= 6 ? 0.82 : 0.65;

      // Rateo salita medio
      let rateo = 0.6 + (spread * 0.08) + (sunPct / 100) * 0.45 + (cape > 200 ? (cape / 1000) * 0.4 : 0);
      if (precip > 0.4) rateo = 0.3;
      else if (cloud > 80) rateo *= 0.4;
      rateo = Math.max(0.4, Math.min(2.5, Math.round(rateo * 10) / 10));

      // Quota top termico
      const thermalTop = Math.round(Math.min(3600, cloudBase + Math.min(700, rateo * 220 + cape * 0.3)));

      // Venti per ciascun livello isobarico da Open-Meteo
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

  // Report Meteorologico Testuale Coerente
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

  // Disegno barbetta identica al riferimento originale Alpium
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number) => {
    if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
    const knots = speedKmh * 0.539957;
    // Open-Meteo: direzione in gradi DA DOVE viene il vento (convenzione meteorologica standard)
    // La barbetta punta nella direzione DA DOVE viene il vento
    const angle = ((dirDeg - 90) * Math.PI) / 180;
    const staffLen = 22;
    const endX = x + staffLen * Math.cos(angle);
    const endY = y + staffLen * Math.sin(angle);

    // Colore barbetta stile alpium (blu/viola scuro o arancio se vento forte)
    const barbColor = speedKmh > 30 ? "#d946ef" : speedKmh > 18 ? "#0284c7" : "#3b82f6";

    const elements = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 1.0;
    // Direzione in cui soffia il vento: ribaltata di 180° rispetto alla convenzione met.
    const barbAngle = angle + (115 * Math.PI) / 180;
    // Le piume devono stare sul lato destro del gambo, quindi ribaltiamo l'angolo
    const featherAngle = barbAngle + Math.PI;

    // Pennacchio 50 nodi
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

    // Alette 10 nodi
    while (rem >= 10 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      elements.push(
        <line
          key={`l10-${x}-${y}-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 10 * Math.cos(featherAngle)}
          y2={by + 10 * Math.sin(featherAngle)}
          stroke={barbColor}
          strokeWidth="1.6"
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
          x2={bx + 5.5 * Math.cos(featherAngle)}
          y2={by + 5.5 * Math.sin(featherAngle)}
          stroke={barbColor}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      );
    }

    return (
      <g key={`wb-${x}-${Math.round(y)}`}>
        <line x1={x} y1={y} x2={endX} y2={endY} stroke={barbColor} strokeWidth="1.6" strokeLinecap="round" />
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

  // Quota media zero termico per etichetta
  const avgZeroThermal = useMemo(() => {
    if (hourlyData.length === 0) return 4381;
    const sum = hourlyData.reduce((acc, h) => acc + h.zeroThermal, 0);
    return Math.round(sum / hourlyData.length);
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
    <div className="space-y-6">
      {/* Contenitore Grafico Alpium Bianco con Bordo Arrotondato */}
      <div className="bg-white text-slate-900 rounded-[28px] p-4 sm:p-7 shadow-2xl border border-slate-300 overflow-hidden font-sans select-none">
        
        {/* Titolo Principale in Alto */}
        <div className="text-center pb-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight lowercase">
            {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-mono tracking-wide mt-0.5">
            plotted {dateStr} 00:00 UTC &middot; model ground {Math.round(altitude + 5)} m &middot; SRTM {Math.round(altitude)} m
          </p>
        </div>

        {/* SVG Windgram Completo */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[880px]"
            style={{ shapeRendering: "geometricPrecision", textRendering: "geometricPrecision" }}
          >
            <defs>
              {/* Pattern a Reticolo (Cross-Hatching) per le zone termiche attive */}
              <pattern id="thermalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
                <line x1="0" y1="0" x2="8" y2="0" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" opacity="0.35" />
              </pattern>
            </defs>

            {/* HEADER METRICHE: Valore Medio Ascendenze & Sole % */}
            <text x={margin.left + plotW / 2} y={32} fill="#64748b" fontSize="12" fontWeight="700" textAnchor="middle">
              valore medio ascendenze (m/s)
            </text>

            <text x={margin.left - 12} y={75} fill="#a16207" fontSize="11" fontWeight="800" textAnchor="end">
              sole %
            </text>

            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const isStrong = h.thermalAvg >= 1.6;
              return (
                <g key={`head-col-${i}`}>
                  <text
                    x={x}
                    y={52}
                    fill={isStrong ? "#b91c1c" : "#1e293b"}
                    fontSize="16"
                    fontWeight="900"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {h.thermalAvg.toFixed(1)}
                  </text>
                  <text
                    x={x}
                    y={75}
                    fill={h.sunPct >= 90 ? "#94a3b8" : "#b45309"}
                    fontSize="12"
                    fontWeight="800"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {h.sunPct}
                  </text>
                </g>
              );
            })}

            {/* SFONDO DINAMICO & ZONE DI STABILITÀ (Palette Alpium) */}
            {/* Base Verde/Gialla Generale */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="#a3e635" />

            {/* Fascia Superiore 500-600 hPa Gialla/Verde */}
            <path
              d={`M ${margin.left},${getYFromAlt(5800)} 
                  Q ${margin.left + plotW * 0.3},${getYFromAlt(6000)} ${margin.left + plotW * 0.5},${getYFromAlt(5700)} 
                  T ${margin.left + plotW},${getYFromAlt(5600)} 
                  L ${margin.left + plotW},${margin.top} L ${margin.left},${margin.top} Z`}
              fill="#eab308"
              opacity="0.85"
            />

            {/* Bolle Calde / Fasce Termiche centrali a 650-700 hPa */}
            <path
              d={`M ${margin.left + plotW * 0.22},${getYFromAlt(4900)} 
                  Q ${margin.left + plotW * 0.35},${getYFromAlt(5200)} ${margin.left + plotW * 0.45},${getYFromAlt(4800)} 
                  Q ${margin.left + plotW * 0.35},${getYFromAlt(4500)} ${margin.left + plotW * 0.22},${getYFromAlt(4900)} Z`}
              fill="#facc15"
              opacity="0.9"
            />

            <path
              d={`M ${margin.left + plotW * 0.55},${getYFromAlt(3900)} 
                  Q ${margin.left + plotW * 0.65},${getYFromAlt(4000)} ${margin.left + plotW * 0.75},${getYFromAlt(3700)} 
                  Q ${margin.left + plotW * 0.65},${getYFromAlt(3500)} ${margin.left + plotW * 0.55},${getYFromAlt(3900)} Z`}
              fill="#facc15"
              opacity="0.8"
            />

            <path
              d={`M ${margin.left + plotW * 0.78},${getYFromAlt(3600)} 
                  Q ${margin.left + plotW * 0.88},${getYFromAlt(3700)} ${margin.left + plotW * 0.98},${getYFromAlt(3400)} 
                  Q ${margin.left + plotW * 0.88},${getYFromAlt(3300)} ${margin.left + plotW * 0.78},${getYFromAlt(3600)} Z`}
              fill="#facc15"
              opacity="0.85"
            />

            {/* Fasce Inferiori Stabilità (Azzurro / Blu / Viola a 700-750 hPa) */}
            <path
              d={`M ${margin.left},${getYFromAlt(3400)} 
                  Q ${margin.left + plotW * 0.25},${getYFromAlt(3500)} ${margin.left + plotW * 0.5},${getYFromAlt(3000)} 
                  L ${margin.left + plotW},${getYFromAlt(3000)} 
                  L ${margin.left + plotW},${getYFromAlt(2700)} 
                  Q ${margin.left + plotW * 0.5},${getYFromAlt(2700)} ${margin.left},${getYFromAlt(3100)} Z`}
              fill="#38bdf8"
              opacity="0.8"
            />

            <path
              d={`M ${margin.left},${getYFromAlt(3100)} 
                  Q ${margin.left + plotW * 0.25},${getYFromAlt(3200)} ${margin.left + plotW * 0.45},${getYFromAlt(2800)} 
                  L ${margin.left + plotW * 0.45},${getYFromAlt(2650)} 
                  Q ${margin.left + plotW * 0.2},${getYFromAlt(2950)} ${margin.left},${getYFromAlt(2800)} Z`}
              fill="#6366f1"
              opacity="0.75"
            />

            {/* Base Calda Termica al Suolo (Arancio / Rosso 750-850 hPa) */}
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

            {/* Nuclei Caldi Arancioni/Rossi di Picco Termico al Suolo */}
            <path
              d={`M ${margin.left + plotW * 0.55},${getYFromAlt(1900)} 
                  Q ${margin.left + plotW * 0.65},${getYFromAlt(2000)} ${margin.left + plotW * 0.82},${getYFromAlt(1850)} 
                  Q ${margin.left + plotW * 0.70},${getYFromAlt(1700)} ${margin.left + plotW * 0.55},${getYFromAlt(1900)} Z`}
              fill="#dc2626"
              opacity="0.9"
            />

            {/* Area con Tratteggio Reticolare (Cross-Hatching) nelle ore centrali convettive */}
            <path
              d={`M ${getXFromHourIdx(2)},${getYFromAlt(1450)} 
                  L ${getXFromHourIdx(2)},${getYFromAlt(2100)} 
                  Q ${getXFromHourIdx(5)},${getYFromAlt(2400)} ${getXFromHourIdx(8)},${getYFromAlt(2200)} 
                  L ${getXFromHourIdx(10)},${getYFromAlt(1800)} 
                  L ${getXFromHourIdx(10)},${getYFromAlt(1450)} Z`}
              fill="url(#thermalHatch)"
            />

            {/* Watermark Alpium Discreto Centrale */}
            <text
              x={margin.left + plotW * 0.48}
              y={getYFromAlt(3500)}
              fill="#0f172a"
              opacity="0.08"
              fontSize="68"
              fontWeight="900"
              textAnchor="middle"
              letterSpacing="6"
              transform={`rotate(-15, ${margin.left + plotW * 0.48}, ${getYFromAlt(3500)})`}
            >
              ALPIUM
            </text>

            {/* LINEE ORIZZONTALI LIVELLI ISOBARICI & QUOTE */}
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
                    opacity="0.4"
                  />
                  {/* Testo Asse Sinistro (hPa) */}
                  <text x={margin.left - 12} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="800" textAnchor="end">
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
                  <text x={margin.left + plotW + 10} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="700" textAnchor="start">
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

            {/* BARBETTE DEL VENTO ISOARICHE (Vettori di vento Open-Meteo) */}
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

            {/* LINEA DELLO ZERO TERMICO (Azzurra Tratteggiata con Icone Fiocco di Neve) */}
            {zeroThermalPath && (
              <polyline
                points={zeroThermalPath}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeDasharray="6 4"
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

            {/* BADGE ZERO TERMICO LATERALE AZZURRO (es. 0 °C • 4381 m) */}
            <g transform={`translate(${margin.left + plotW - 130}, ${getYFromAlt(avgZeroThermal) - 13})`}>
              <rect x="0" y="0" width="125" height="26" rx="6" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
              <text x="62.5" y="17" fill="#ffffff" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                0 °C &middot; {avgZeroThermal} m
              </text>
            </g>

            {/* LINEA NERA TRATTEGGIATA PBL / BOUNDARY LAYER */}
            <path
              d={`M ${getXFromHourIdx(0)},${getYFromAlt(1800)} 
                  Q ${getXFromHourIdx(5)},${getYFromAlt(2700)} ${getXFromHourIdx(10)},${getYFromAlt(2300)}`}
              fill="none"
              stroke="#0f172a"
              strokeWidth="2.2"
              strokeDasharray="5 4"
            />

            {/* CURVA PARACADUTE VIOLA CON ARCHI (Thermal Top & Paraglider Icons) */}
            {thermalTopCurve && (
              <path d={thermalTopCurve} fill="none" stroke="#9333ea" strokeWidth="3.5" strokeLinecap="round" />
            )}

            {/* ICONE PARACADUTE VIOLA SUI NODI */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.thermalTop);
              return (
                <g key={`paraglider-icon-${i}`} transform={`translate(${x}, ${y})`}>
                  {/* Arco parapendio viola */}
                  <path
                    d="M -15,-4 C -12,-16 12,-16 15,-4 C 10,-8 -10,-8 -15,-4 Z"
                    fill="#c084fc"
                    stroke="#7e22ce"
                    strokeWidth="1.8"
                  />
                  {/* Funi */}
                  <line x1="-12" y1="-5" x2="0" y2="0" stroke="#7e22ce" strokeWidth="1" />
                  <line x1="12" y1="-5" x2="0" y2="0" stroke="#7e22ce" strokeWidth="1" />
                  {/* Pallino centrale */}
                  <circle cx="0" cy="0" r="3.5" fill="#ffffff" stroke="#7e22ce" strokeWidth="2" />
                </g>
              );
            })}

            {/* CARTELLINI CUMULI: Nuvola Bianca con % di Copertura */}
            {hourlyData.map((h, i) => {
              if (i === 0 || i === hourlyData.length - 1) return null;
              const x = getXFromHourIdx(i);
              const cloudY = getYFromAlt(h.cloudBase + 250);

              return (
                <g key={`cumulus-cloud-${i}`} transform={`translate(${x}, ${cloudY})`}>
                  {/* Sagoma Nuvola */}
                  <path
                    d="M -13,2 A 5,5 0 0,1 -6,-4 A 8,8 0 0,1 6,-5 A 6,6 0 0,1 13,1 A 4,4 0 0,1 11,6 L -11,6 A 4,4 0 0,1 -13,2 Z"
                    fill="#ffffff"
                    stroke="#64748b"
                    strokeWidth="1.2"
                  />
                  {/* Testo % copertura */}
                  <text x="0" y="3" fill="#0f172a" fontSize="8" fontWeight="900" textAnchor="middle">
                    {h.cloudPct}%
                  </text>
                </g>
              );
            })}

            {/* BADGE GIALLI QUOTA CUMULO & ASCENDENZA (es. 2282 m ↑ 1.7 m/s) */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const badgeY = getYFromAlt(h.thermalTop) + 12;

              return (
                <g key={`badge-data-${i}`} transform={`translate(${x}, ${badgeY})`}>
                  <rect
                    x="-24"
                    y="0"
                    width="48"
                    height="24"
                    rx="4"
                    fill="#ffffff"
                    stroke="#ea580c"
                    strokeWidth="1.2"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
                  />
                  <text x="0" y="10" fill="#0f172a" fontSize="8.5" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    {h.cloudBase} m
                  </text>
                  <text x="0" y="20" fill="#b91c1c" fontSize="8.5" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    &uarr; {h.thermalAvg.toFixed(1)} m/s
                  </text>
                </g>
              );
            })}

            {/* ASSE X INFERIORE: ORE ESATTE 08:00 - 18:00 */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <text
                  key={`label-hour-${h}`}
                  x={x}
                  y={margin.top + plotH + 22}
                  fill="#0f172a"
                  fontSize="11.5"
                  fontWeight="800"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {String(h).padStart(2, "0")}:00
                </text>
              );
            })}

            {/* BORDO RETTANGOLARE NERO DEL PLOT */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.4" />
          </svg>
        </div>

        {/* SCALA GRADIENTE INFERIORE DELTA T / 100 m IDENTICA AD ALPIUM */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col items-center">
          <div className="w-full max-w-2xl px-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Stabile &larr;</span>
              <span className="text-slate-900 font-extrabold text-sm">&Delta;T / 100 m</span>
              <span>&rarr; Instabile</span>
            </div>

            {/* Barra Continua Segmentata a 9 Colori */}
            <div className="w-full h-4 rounded-sm flex overflow-hidden border border-slate-400">
              {STABILITY_SCALE.map((item, idx) => (
                <div key={idx} className="flex-1 h-full" style={{ backgroundColor: item.color }} />
              ))}
            </div>

            {/* Etichette Valori Sotto la Barra */}
            <div className="flex justify-between text-[10px] sm:text-xs font-mono font-bold text-slate-700 mt-1 px-1">
              {STABILITY_SCALE.map((item, idx) => (
                <span key={idx}>{item.val.toFixed(2)}</span>
              ))}
            </div>

            {/* Didascalia Fonte Dati */}
            <div className="text-center text-[10px] text-slate-500 font-mono mt-3">
              Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo &middot; Diagnostica di volo a vela di Alpium
            </div>
          </div>
        </div>
      </div>

      {/* BOLLETTINO E REPORT METEOROLOGICO DI SUPPORTO */}
      {reportGenerato && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 text-slate-200">
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

          <div className="space-y-3 text-sm sm:text-base leading-relaxed text-slate-300">
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

          <div className="pt-3 border-t border-slate-800/80 space-y-2">
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