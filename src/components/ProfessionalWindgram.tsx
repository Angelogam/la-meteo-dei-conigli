"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Wind, Sun, Cloud, Thermometer, Droplets, ArrowUp, RefreshCw, Compass, Gauge } from "lucide-react";

interface WindgramData {
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    surface_pressure: number[];
    cloud_cover: number[];
    shortwave_radiation: number[];
    precipitation: number[];
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
}

interface ProfessionalWindgramProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  siteName?: string;
  selectedDay?: number;
}

export default function ProfessionalWindgram({
  latitude,
  longitude,
  altitude = 1000,
  siteName = "Decollo",
  selectedDay = 0,
}: ProfessionalWindgramProps) {
  const [data, setData] = useState<WindgramData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const dateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d.toISOString().split("T")[0];
  }, [selectedDay]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchWindgram = async () => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,shortwave_radiation,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe/Rome&start_date=${dateStr}&end_date=${dateStr}`;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: Impossibile scaricare dati windgram`);
        const json = await res.json();
        if (isMounted) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Errore sconosciuto");
          setLoading(false);
        }
      }
    };

    fetchWindgram();
    return () => {
      isMounted = false;
    };
  }, [latitude, longitude, dateStr]);

  // Dimensioni SVG del grafico
  const svgWidth = 960;
  const svgHeight = 440;
  const margin = { top: 40, right: 70, bottom: 45, left: 55 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  // Elaborazione dati
  const processed = useMemo(() => {
    if (!data?.hourly?.time?.length) return null;

    const hours = data.hourly.time.map((t) => parseInt(t.split("T")[1].split(":")[0], 10));
    const temps = data.hourly.temperature_2m;
    const winds = data.hourly.wind_speed_10m;
    const windDirs = data.hourly.wind_direction_10m;
    const clouds = data.hourly.cloud_cover;
    const pressures = data.hourly.surface_pressure;
    const rads = data.hourly.shortwave_radiation;
    const precips = data.hourly.precipitation;

    // Calcolo termiche come nel codice Python
    const thermals = temps.map((t, i) => {
      const r = rads[i] ?? 0;
      const c = clouds[i] ?? 0;
      if (r > 50) {
        return Math.max(0, ((t - 5) / 10) * (1 - c / 100) * 1.5);
      }
      return 0;
    });

    const maxThermal = Math.max(...thermals, 1);
    const maxWind = Math.max(...winds, 10);
    const minTemp = Math.min(...temps, 0);
    const maxTemp = Math.max(...temps, 30);
    const minPress = Math.min(...pressures, 900);
    const maxPress = Math.max(...pressures, 1030);

    return {
      hours,
      temps,
      winds,
      windDirs,
      clouds,
      pressures,
      rads,
      precips,
      thermals,
      maxThermal,
      maxWind,
      minTemp,
      maxTemp,
      minPress,
      maxPress,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-sm font-semibold">Generazione Windgram per {siteName}...</span>
      </div>
    );
  }

  if (error || !processed) {
    return (
      <div className="bg-slate-900/90 border border-red-900/40 rounded-2xl p-6 text-center text-red-300 space-y-2">
        <p className="font-bold">Impossibile generare il Windgram</p>
        <p className="text-xs text-slate-400">{error || "Dati non disponibili"}</p>
      </div>
    );
  }

  const {
    hours,
    temps,
    winds,
    windDirs,
    clouds,
    pressures,
    thermals,
    maxWind,
    minTemp,
    maxTemp,
    minPress,
    maxPress,
    precips,
  } = processed;

  // Scale Functions
  const getX = (hourIdx: number) => margin.left + (hourIdx / (hours.length - 1)) * chartWidth;
  const getYWind = (val: number) => margin.top + chartHeight - ((val + 1) / 13) * chartHeight;
  const getYTemp = (val: number) => {
    const range = maxTemp - minTemp || 1;
    return margin.top + chartHeight - ((val - minTemp) / range) * chartHeight;
  };

  // Disegno Wind Barb
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number) => {
    if (speedKmh <= 0) return null;
    const speedKnots = speedKmh * 0.539957;
    const angleRad = ((dirDeg - 180) * Math.PI) / 180;
    const length = 26;
    const endX = x + length * Math.cos(angleRad);
    const endY = y + length * Math.sin(angleRad);

    const flags = [];
    let numFlags = 0;
    if (speedKnots >= 50) numFlags = 5;
    else if (speedKnots >= 40) numFlags = 4;
    else if (speedKnots >= 30) numFlags = 3;
    else if (speedKnots >= 20) numFlags = 2;
    else if (speedKnots >= 10) numFlags = 1;

    const perpAngle = angleRad + Math.PI / 2;
    const flagSpacing = 0.16;

    for (let f = 0; f < numFlags; f++) {
      const t = 0.35 + f * flagSpacing;
      const fx = x + t * (endX - x);
      const fy = y + t * (endY - y);
      const flen = 9 * (1 - f * 0.08);

      const p1 = `${fx},${fy}`;
      const p2 = `${fx + flen * Math.cos(perpAngle)},${fy + flen * Math.sin(perpAngle)}`;
      const p3 = `${fx + 0.7 * flen * Math.cos(perpAngle) + 4 * Math.cos(angleRad)},${fy + 0.7 * flen * Math.sin(perpAngle) + 4 * Math.sin(angleRad)}`;

      flags.push(<polygon key={f} points={`${p1} ${p2} ${p3}`} fill="#38bdf8" stroke="#38bdf8" strokeWidth="0.8" />);
    }

    return (
      <g key={`barb-${x}`}>
        <line x1={x} y1={y} x2={endX} y2={endY} stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        {flags}
      </g>
    );
  };

  // Percorso temperatura
  const tempPoints = temps.map((t, i) => `${getX(i)},${getYTemp(t)}`).join(" ");
  const tempAreaPoints = `${getX(0)},${margin.top + chartHeight} ${tempPoints} ${getX(temps.length - 1)},${margin.top + chartHeight}`;

  // Percorso termiche (linea)
  const thermalPoints = thermals.map((th, i) => `${getX(i)},${getYWind(th)}`).join(" ");

  // Isobari standard
  const pressureLevels = [850, 750, 700, 600, 500];

  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl p-4 md:p-6 space-y-4">
      {/* Intestazione Windgram */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
        <div>
          <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            Windgram Professionale &middot; {siteName}
          </h3>
          <p className="text-xs text-slate-400">
            {dateStr} &middot; {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E &middot; Quota {altitude}m s.l.m.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-lg">
            <ArrowUp className="w-3.5 h-3.5" /> Ascendenze m/s
          </span>
          <span className="flex items-center gap-1 bg-sky-950/60 border border-sky-500/40 text-sky-300 px-2.5 py-1 rounded-lg">
            <Wind className="w-3.5 h-3.5" /> Vento & Barbs
          </span>
          <span className="flex items-center gap-1 bg-rose-950/60 border border-rose-500/40 text-rose-300 px-2.5 py-1 rounded-lg">
            <Thermometer className="w-3.5 h-3.5" /> Temp °C
          </span>
        </div>
      </div>

      {/* Grafico SVG Vettoriale */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto min-w-[700px] select-none font-sans"
        >
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="cloudGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Sfondo giorno/notte */}
          {hours.map((h, i) => {
            if (i >= hours.length - 1) return null;
            const isDay = h >= 6 && h <= 19;
            const x1 = getX(i);
            const x2 = getX(i + 1);
            return (
              <rect
                key={`bg-${h}`}
                x={x1}
                y={margin.top}
                width={x2 - x1}
                height={chartHeight}
                fill={isDay ? "#1e293b" : "#0f172a"}
                opacity={isDay ? "0.6" : "0.9"}
              />
            );
          })}

          {/* Copertura nuvolosa (Area sfumata) */}
          {clouds.map((c, i) => {
            if (i >= clouds.length - 1) return null;
            const x1 = getX(i);
            const x2 = getX(i + 1);
            const alpha = (c / 100) * 0.4;
            return (
              <rect
                key={`cloud-rect-${i}`}
                x={x1}
                y={margin.top}
                width={x2 - x1}
                height={chartHeight}
                fill="#64748b"
                opacity={alpha}
              />
            );
          })}

          {/* Griglia orizzontale & Isobari */}
          {pressureLevels.map((p) => {
            if (p >= minPress && p <= maxPress) {
              const yPos = margin.top + chartHeight - ((p - minPress) / (maxPress - minPress)) * chartHeight;
              return (
                <g key={`p-${p}`}>
                  <line
                    x1={margin.left}
                    y1={yPos}
                    x2={margin.left + chartWidth}
                    y2={yPos}
                    stroke="#475569"
                    strokeDasharray="3 3"
                    strokeWidth="0.8"
                    opacity="0.5"
                  />
                  <text x={margin.left - 6} y={yPos + 3} fill="#64748b" fontSize="9" textAnchor="end">
                    {p} hPa
                  </text>
                </g>
              );
            }
            return null;
          })}

          {/* Griglia oraria verticale */}
          {hours.map((h, i) => {
            if (h % 3 !== 0) return null;
            const x = getX(i);
            return (
              <g key={`grid-h-${h}`}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={margin.top + chartHeight}
                  stroke="#334155"
                  strokeDasharray="2 2"
                  strokeWidth="0.8"
                />
                <text x={x} y={margin.top + chartHeight + 18} fill="#94a3b8" fontSize="11" textAnchor="middle" fontWeight="bold">
                  {String(h).padStart(2, "0")}:00
                </text>
              </g>
            );
          })}

          {/* Precipitazioni (Barre blu alla base) */}
          {precips.map((p, i) => {
            if (!p || p <= 0) return null;
            const x = getX(i) - 8;
            const barH = Math.min(60, p * 15);
            return (
              <rect
                key={`precip-${i}`}
                x={x}
                y={margin.top + chartHeight - barH}
                width="16"
                height={barH}
                fill="#38bdf8"
                opacity="0.5"
                rx="2"
              />
            );
          })}

          {/* Barre Ascendenze Termiche */}
          {thermals.map((th, i) => {
            if (th <= 0.05) return null;
            const x = getX(i) - 7;
            const y = getYWind(th);
            const base = getYWind(0);
            const barH = Math.max(2, base - y);
            const isStrong = th >= 1.5;
            const isMedium = th >= 0.8;
            const color = isStrong ? "#10b981" : isMedium ? "#34d399" : "#a7f3d0";

            return (
              <g key={`th-bar-${i}`}>
                <rect
                  x={x}
                  y={y}
                  width="14"
                  height={barH}
                  fill={color}
                  opacity="0.75"
                  rx="3"
                />
                <text
                  x={getX(i)}
                  y={y - 5}
                  fill="#10b981"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {th.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Linea Ascendenze */}
          <polyline
            points={thermalPoints}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Area e Linea Temperatura */}
          <polygon points={tempAreaPoints} fill="url(#tempGradient)" />
          <polyline
            points={tempPoints}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Bandierine del Vento (Wind Barbs) disposte a metà altezza */}
          {hours.map((h, i) => {
            if (h % 2 !== 0 && h % 3 !== 0) return null;
            const x = getX(i);
            const y = margin.top + chartHeight * 0.35;
            return renderWindBarb(x, y, winds[i], windDirs[i]);
          })}

          {/* Assi e Bordi */}
          <line
            x1={margin.left}
            y1={margin.top + chartHeight}
            x2={margin.left + chartWidth}
            y2={margin.top + chartHeight}
            stroke="#64748b"
            strokeWidth="1.5"
          />
          <line
            x1={margin.left}
            y1={margin.top}
            x2={margin.left}
            y2={margin.top + chartHeight}
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* Etichette assi */}
          <text
            x={margin.left - 10}
            y={margin.top - 10}
            fill="#10b981"
            fontSize="10"
            fontWeight="bold"
            textAnchor="start"
          >
            Ascendenze (m/s)
          </text>
          <text
            x={svgWidth - margin.right + 10}
            y={margin.top - 10}
            fill="#f43f5e"
            fontSize="10"
            fontWeight="bold"
            textAnchor="end"
          >
            Temp (°C)
          </text>

          {/* Asse Y Destra: Temperatura */}
          {[minTemp, (minTemp + maxTemp) / 2, maxTemp].map((tVal, idx) => {
            const yPos = getYTemp(tVal);
            return (
              <g key={`y-temp-${idx}`}>
                <text x={svgWidth - margin.right + 12} y={yPos + 4} fill="#f43f5e" fontSize="10" fontWeight="bold">
                  {Math.round(tVal)}°
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Riquadro Dati Giornalieri Stile Console */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300">
        <div className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
          <span>📊</span> STATISTICHE GIORNALIERE E PROFILO
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-800">
            <span className="text-slate-500 block">Temp Max / Min</span>
            <span className="text-amber-300 font-bold">
              {data?.daily?.temperature_2m_max?.[0]?.toFixed(1)}°C / {data?.daily?.temperature_2m_min?.[0]?.toFixed(1)}°C
            </span>
          </div>
          <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-800">
            <span className="text-slate-500 block">Pioggia Totale</span>
            <span className="text-sky-300 font-bold">
              {data?.daily?.precipitation_sum?.[0]?.toFixed(1)} mm
            </span>
          </div>
          <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-800">
            <span className="text-slate-500 block">Vento Max</span>
            <span className="text-cyan-300 font-bold">
              {maxWind.toFixed(1)} km/h
            </span>
          </div>
          <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-800">
            <span className="text-slate-500 block">Max Termica</span>
            <span className="text-emerald-400 font-bold">
              {processed.maxThermal.toFixed(1)} m/s
            </span>
          </div>
          <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-800">
            <span className="text-slate-500 block">Radiazione Max</span>
            <span className="text-yellow-400 font-bold">
              {Math.round(Math.max(...processed.rads))} W/m²
            </span>
          </div>
          <div className="bg-slate-900/80 rounded-lg p-2 border border-slate-800">
            <span className="text-slate-500 block">Nuvole Medie</span>
            <span className="text-slate-300 font-bold">
              {Math.round(clouds.reduce((s, c) => s + c, 0) / clouds.length)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}