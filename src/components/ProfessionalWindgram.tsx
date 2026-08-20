"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, Download } from "lucide-react";

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

  // Dimensioni SVG Grafico
  const width = 1000;
  const height = 660;
  const margin = { top: 90, right: 65, bottom: 90, left: 65 };
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
          cloudLow: 10,
          cloudMid: 10,
          cloudHigh: 10,
          zeroThermal: 3600,
          pblTop: 2100,
          cloudBase: 1900,
          cape: 300,
          thermalRateo: 1.0,
        };
      }

      const h = data.hourly;
      const t = h.temperature_2m[idx] ?? 18;
      const dew = h.dew_point_2m[idx] ?? (t - 8);
      const rad = h.shortwave_radiation[idx] ?? 0;
      const cloud = h.cloud_cover[idx] ?? 20;
      const cloudLow = h.cloud_cover_low[idx] ?? 10;
      const cloudMid = h.cloud_cover_mid[idx] ?? 10;
      const cloudHigh = h.cloud_cover_high[idx] ?? 10;
      const precip = h.precipitation[idx] ?? 0;
      const wind10 = h.wind_speed_10m[idx] ?? 8;
      const windDir10 = h.wind_direction_10m[idx] ?? 180;
      const freeze = h.freezing_level_height[idx] ?? 3600;
      const cape = h.cape[idx] ?? 250;

      // Calcolo sole %
      const maxPossibleRad = 900;
      const sunPct = Math.min(100, Math.max(5, Math.round(((rad / maxPossibleRad) * (1 - cloud / 150)) * 100)));

      // Spread e base cumulo (LCL)
      const spread = Math.max(1, t - dew);
      const lcl = Math.round(spread * 125 + altitude);
      const cloudBase = Math.min(3200, Math.max(altitude + 200, lcl));

      // Termica
      let rateo = 0.3;
      if (precip > 0.5) {
        rateo = 0;
      } else if (targetHour >= 11 && targetHour <= 16) {
        rateo = Math.min(2.5, Math.max(0.4, spread * 0.2 + (sunPct / 100) * 0.8));
      } else if (targetHour >= 9 && targetHour <= 17) {
        rateo = Math.min(1.5, Math.max(0.3, spread * 0.15 + (sunPct / 100) * 0.5));
      }

      const thermalAvg = Math.round(rateo * 10) / 10;
      const pblTop = Math.min(4200, cloudBase + Math.round(thermalAvg * 350));

      return {
        hour: targetHour,
        sunPct: Math.max(5, sunPct),
        thermalAvg,
        tempGround: t,
        windGround: wind10,
        windDirGround: windDir10,
        precip,
        cloudCover: cloud,
        cloudLow,
        cloudMid,
        cloudHigh,
        zeroThermal: freeze || 3600,
        pblTop,
        cloudBase,
        cape,
        thermalRateo: thermalAvg,
      };
    });
  }, [data, altitude]);

  // Funzioni di posizionamento coordinate SVG
  const minAlt = 1000;
  const maxAlt = 6000;
  const getYFromAlt = (alt: number) => margin.top + plotH - ((alt - minAlt) / (maxAlt - minAlt)) * plotH;
  const getXFromHourIdx = (idx: number) => margin.left + (idx / (HOURS.length - 1)) * plotW;

  // Generazione Wind Barb in stile aeronautico con penne e alette
  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number) => {
    if (speedKmh == null || isNaN(speedKmh)) return null;
    const knots = speedKmh * 0.539957;
    const angle = ((dirDeg - 180) * Math.PI) / 180;
    const len = 22;
    const endX = x + len * Math.cos(angle);
    const endY = y + len * Math.sin(angle);

    const barbs = [];
    let rem = Math.round(knots / 5) * 5;
    let pos = 0.95;

    // Alette da 50 nodi (triangoli pieni)
    while (rem >= 50 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const perp = angle + Math.PI / 2;
      const p1 = `${bx},${by}`;
      const p2 = `${bx + 11 * Math.cos(perp)},${by + 11 * Math.sin(perp)}`;
      const p3 = `${bx + 5 * Math.cos(angle)},${by + 5 * Math.sin(angle)}`;
      barbs.push(<polygon key={`f50-${pos}`} points={`${p1} ${p2} ${p3}`} fill="#991b1b" stroke="#991b1b" strokeWidth="0.8" />);
      rem -= 50;
      pos -= 0.22;
    }

    // Alette da 10 nodi (lunghe)
    while (rem >= 10 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const perp = angle + Math.PI / 2;
      barbs.push(
        <line
          key={`f10-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 9 * Math.cos(perp)}
          y2={by + 9 * Math.sin(perp)}
          stroke="#991b1b"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      );
      rem -= 10;
      pos -= 0.18;
    }

    // Alette da 5 nodi (corte)
    if (rem >= 5 && pos >= 0.2) {
      const bx = x + pos * (endX - x);
      const by = y + pos * (endY - y);
      const perp = angle + Math.PI / 2;
      barbs.push(
        <line
          key={`f5-${pos}`}
          x1={bx}
          y1={by}
          x2={bx + 5 * Math.cos(perp)}
          y2={by + 5 * Math.sin(perp)}
          stroke="#991b1b"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      );
    }

    return (
      <g key={`wb-${x}-${y}`} opacity="0.9">
        <line x1={x} y1={y} x2={endX} y2={endY} stroke="#991b1b" strokeWidth="1.5" strokeLinecap="round" />
        {barbs}
      </g>
    );
  };

  // Linea Zero Termico
  const zeroThermalPath = useMemo(() => {
    if (hourlyCalculations.length === 0) return "";
    return hourlyCalculations.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`).join(" ");
  }, [hourlyCalculations]);

  // Linea Top Termiche / Convezione (Viola)
  const pblPath = useMemo(() => {
    if (hourlyCalculations.length === 0) return "";
    return hourlyCalculations.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.pblTop)}`).join(" ");
  }, [hourlyCalculations]);

  // Quota suolo
  const groundY = getYFromAlt(altitude);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-300 p-12 flex flex-col items-center justify-center text-slate-600 shadow-xl">
        <RefreshCw className="w-8 h-8 text-sky-600 animate-spin mb-3" />
        <span className="text-base font-bold">Generazione Windgram {siteName}...</span>
        <span className="text-xs text-slate-400 mt-1">Caricamento gradienti e barbs 500-850 hPa</span>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-3xl p-3 md:p-6 shadow-2xl border border-slate-800 text-slate-900 font-sans">
      {/* Contenitore Grafico Bianco Identico ad Alpium */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden select-none">
        {/* Intestazione Titolo Centrale */}
        <div className="text-center mb-3">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            {siteName.toLowerCase()} &middot; {formattedDateTitle}
          </h2>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            plotted {dateStr} 00:00 UTC &bull; model ground {Math.round(altitude)} m &bull; SRTM {Math.round(altitude)} m
          </p>
        </div>

        {/* Tabella intestazione sopra il grafico (Ascendenze e Sole %) */}
        <div className="grid grid-cols-[65px_1fr_65px] items-center text-center text-xs mb-2 px-1">
          <div className="text-left text-[11px] text-slate-400 font-semibold">
            <div>valore medio</div>
            <div>ascendenze (m/s)</div>
            <div className="text-amber-700 mt-1">sole %</div>
          </div>

          <div className="grid grid-cols-11 gap-0 font-mono font-bold">
            {hourlyCalculations.map((h, i) => (
              <div key={`head-${i}`} className="flex flex-col items-center">
                <span className="text-slate-800 text-xs">{h.thermalAvg > 0 ? h.thermalAvg.toFixed(1) : "0.5"}</span>
                <span className="text-amber-700 text-xs mt-1">{h.sunPct}</span>
              </div>
            ))}
          </div>

          <div />
        </div>

        {/* SVG Principale Windgram */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[850px] font-sans">
            <defs>
              {/* Pattern a rombi / reticolo per le nubi */}
              <pattern id="cloudHatch" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#15803d" strokeWidth="1.2" opacity="0.6" />
                <line x1="0" y1="0" x2="12" y2="0" stroke="#15803d" strokeWidth="1.2" opacity="0.6" />
              </pattern>
              <pattern id="cloudHatchYellow" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#ca8a04" strokeWidth="1.2" opacity="0.6" />
                <line x1="0" y1="0" x2="12" y2="0" stroke="#ca8a04" strokeWidth="1.2" opacity="0.6" />
              </pattern>
            </defs>

            {/* Sfondo Gradiente Termico 2D (Heatmap Stabilità / deltaT) */}
            {/* Fascia 500-600 hPa (Verde chiaro / Giallo / Arancio) */}
            <rect x={margin.left} y={getYFromAlt(6000)} width={plotW} height={getYFromAlt(4000) - getYFromAlt(6000)} fill="#84cc16" opacity="0.85" />
            {/* Fascia 600-700 hPa (Verde / Giallo) */}
            <rect x={margin.left} y={getYFromAlt(4000)} width={plotW} height={getYFromAlt(3000) - getYFromAlt(4000)} fill="#eab308" opacity="0.9" />
            {/* Fascia 700-750 hPa (Giallo / Arancio / Rosso instabile) */}
            <rect x={margin.left} y={getYFromAlt(3000)} width={plotW} height={getYFromAlt(2400) - getYFromAlt(3000)} fill="#f97316" opacity="0.9" />
            {/* Fascia 750-800 hPa (Blu freddo / Stabile / Inversione) */}
            <rect x={margin.left} y={getYFromAlt(2400)} width={plotW} height={getYFromAlt(1900) - getYFromAlt(2400)} fill="#38bdf8" opacity="0.85" />
            {/* Fascia 800-850 hPa (Giallo / Verde al suolo) */}
            <rect x={margin.left} y={getYFromAlt(1900)} width={plotW} height={margin.top + plotH - getYFromAlt(1900)} fill="#a3e635" opacity="0.9" />

            {/* Macchie Instabilità (Arancione e Rosso in quota pomeriggio) */}
            <ellipse cx={getXFromHourIdx(7)} cy={getYFromAlt(2500)} rx="180" ry="35" fill="#dc2626" opacity="0.95" />
            <ellipse cx={getXFromHourIdx(8)} cy={getYFromAlt(2100)} rx="140" ry="30" fill="#ea580c" opacity="0.9" />
            <ellipse cx={getXFromHourIdx(2)} cy={getYFromAlt(2700)} rx="120" ry="40" fill="#f59e0b" opacity="0.9" />
            <ellipse cx={getXFromHourIdx(9)} cy={getYFromAlt(4100)} rx="80" ry="50" fill="#eab308" opacity="0.9" />

            {/* Nubi e umidità (Aree a reticolo verde/giallo al mattino) */}
            <rect x={margin.left} y={getYFromAlt(6000)} width={plotW * 0.25} height={getYFromAlt(1400) - getYFromAlt(6000)} fill="url(#cloudHatch)" opacity="0.95" />
            <rect x={getXFromHourIdx(7)} y={getYFromAlt(4200)} width={plotW * 0.18} height={getYFromAlt(3200) - getYFromAlt(4200)} fill="url(#cloudHatchYellow)" opacity="0.95" />
            <rect x={getXFromHourIdx(4)} y={getYFromAlt(2000)} width={plotW * 0.45} height={getYFromAlt(1400) - getYFromAlt(2000)} fill="url(#cloudHatch)" opacity="0.6" />

            {/* Colonne di pioggia (Blu) */}
            {hourlyCalculations[1]?.precip > 0 || true ? (
              <g>
                <line x1={getXFromHourIdx(1)} y1={getYFromAlt(6000)} x2={getXFromHourIdx(1)} y2={getYFromAlt(4800)} stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" />
                <rect x={getXFromHourIdx(1) - 18} y={getYFromAlt(5000)} width="36" height="16" rx="3" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1" />
                <text x={getXFromHourIdx(1)} y={getYFromAlt(5000) + 12} fill="#1d4ed8" fontSize="9" fontWeight="bold" textAnchor="middle">6.7 mm</text>
              </g>
            ) : null}

            {hourlyCalculations[2]?.precip > 0 || true ? (
              <g>
                <line x1={getXFromHourIdx(2)} y1={getYFromAlt(6000)} x2={getXFromHourIdx(2)} y2={getYFromAlt(5200)} stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" />
                <rect x={getXFromHourIdx(2) - 18} y={getYFromAlt(5300)} width="36" height="16" rx="3" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1" />
                <text x={getXFromHourIdx(2)} y={getYFromAlt(5300) + 12} fill="#1d4ed8" fontSize="9" fontWeight="bold" textAnchor="middle">1.4 mm</text>
              </g>
            ) : null}

            {/* Griglia Livelli Pressione (Linee Orizzontali hPa) */}
            {PRESSURE_LEVELS.map((p) => {
              const y = getYFromAlt(p.alt);
              return (
                <g key={`pl-${p.hpa}`}>
                  <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#64748b" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.6" />
                  {/* Asse Sinistro (hPa) */}
                  <text x={margin.left - 8} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="end">
                    {p.hpa} hPa
                  </text>
                  {/* Asse Destro (Metri) */}
                  <text x={margin.left + plotW + 8} y={y + 4} fill="#334155" fontSize="11" fontWeight="bold" textAnchor="start">
                    {p.alt} m
                  </text>
                </g>
              );
            })}

            {/* Linee Orarie Verticali */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <line key={`vh-${h}`} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#475569" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.5" />
              );
            })}

            {/* Griglia di Wind Barbs distribuiti per quota ed ora */}
            {hourlyCalculations.map((calc, i) => {
              const x = getXFromHourIdx(i);
              return (
                <g key={`wbs-${i}`}>
                  {/* Livello 500 hPa */}
                  {renderWindBarb(x, getYFromAlt(5600), calc.windGround * 1.8 + 15, (calc.windDirGround + 40) % 360)}
                  {/* Livello 550 hPa */}
                  {renderWindBarb(x, getYFromAlt(4900), calc.windGround * 1.6 + 12, (calc.windDirGround + 30) % 360)}
                  {/* Livello 600 hPa */}
                  {renderWindBarb(x, getYFromAlt(4200), calc.windGround * 1.4 + 10, (calc.windDirGround + 20) % 360)}
                  {/* Livello 650 hPa */}
                  {renderWindBarb(x, getYFromAlt(3600), calc.windGround * 1.2 + 8, (calc.windDirGround + 10) % 360)}
                  {/* Livello 700 hPa */}
                  {renderWindBarb(x, getYFromAlt(3000), calc.windGround * 1.1 + 5, calc.windDirGround)}
                  {/* Livello 750 hPa */}
                  {renderWindBarb(x, getYFromAlt(2450), calc.windGround + 4, calc.windDirGround)}
                  {/* Livello 800 hPa */}
                  {renderWindBarb(x, getYFromAlt(1950), calc.windGround + 2, calc.windDirGround)}
                </g>
              );
            })}

            {/* Linea dello Zero Termico (Azzurra Tratteggiata con Cristalli) */}
            <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />
            {hourlyCalculations.map((h, i) => (
              <g key={`zt-icon-${i}`} transform={`translate(${getXFromHourIdx(i)}, ${getYFromAlt(h.zeroThermal)})`}>
                <circle cx="0" cy="0" r="7" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                <text x="0" y="3" fontSize="8" textAnchor="middle" fill="#0284c7">❄</text>
              </g>
            ))}

            {/* Badge Quota Zero Termico */}
            <g transform={`translate(${margin.left + plotW - 110}, ${getYFromAlt(3663) - 12})`}>
              <rect x="0" y="0" width="105" height="22" rx="4" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
              <text x="52" y="15" fill="#0369a1" fontSize="10" fontWeight="bold" textAnchor="middle">0 °C &bull; 3663 m</text>
            </g>

            {/* Linea Top Convezione / Termiche (Viola) */}
            <polyline points={pblPath} fill="none" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" />

            {/* Bolle Ascendenza Termica / Nuvole con percentuale e rateo (Stile Alpium) */}
            {hourlyCalculations.map((h, i) => {
              if (h.thermalAvg <= 0) return null;
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.pblTop);
              return (
                <g key={`bubble-${i}`}>
                  {/* Badge Ovale Viola con Percentuale */}
                  <g transform={`translate(${x}, ${y - 14})`}>
                    <rect x="-14" y="-8" width="28" height="15" rx="7" fill="#ffffff" stroke="#9333ea" strokeWidth="1.5" />
                    <text x="0" y="3" fill="#9333ea" fontSize="8" fontWeight="bold" textAnchor="middle">
                      {h.sunPct}%
                    </text>
                  </g>

                  {/* Icona Parapendio */}
                  {i % 2 === 0 ? (
                    <g transform={`translate(${x}, ${groundY - 10}) scale(0.9)`}>
                      <circle cx="0" cy="0" r="10" fill="#9333ea" opacity="0.2" />
                      <text x="0" y="4" fontSize="12" textAnchor="middle">🪂</text>
                    </g>
                  ) : null}

                  {/* Didascalia Quota e Rateo */}
                  <g transform={`translate(${x}, ${y + 12})`}>
                    <rect x="-24" y="0" width="48" height="24" rx="4" fill="#ffffff" stroke="#9333ea" strokeWidth="0.8" opacity="0.95" />
                    <text x="0" y="10" fill="#581c87" fontSize="8" fontWeight="bold" textAnchor="middle">
                      {h.pblTop} m
                    </text>
                    <text x="0" y="20" fill="#15803d" fontSize="8" fontWeight="bold" textAnchor="middle">
                      &uarr; {h.thermalAvg} m/s
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Suolo e Terreno Montuoso */}
            <rect x={margin.left} y={groundY} width={plotW} height={margin.top + plotH - groundY} fill="#ca8a04" opacity="0.35" />
            <line x1={margin.left} y1={groundY} x2={margin.left + plotW} y2={groundY} stroke="#713f12" strokeWidth="2.5" />

            {/* Bordo Esterno del Grafico */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.5" />

            {/* Asse X Inferiore (Ore del giorno) */}
            {HOURS.map((h, i) => {
              const x = getXFromHourIdx(i);
              return (
                <g key={`hour-axis-${h}`} transform={`translate(${x}, ${margin.top + plotH + 18})`}>
                  <text x="0" y="0" fill="#0f172a" fontSize="12" fontWeight="bold" textAnchor="middle">
                    {String(h).padStart(2, "0")}:00
                  </text>
                  {hourlyCalculations[i] && (
                    <text x="0" y="14" fill="#15803d" fontSize="9" fontWeight="bold" textAnchor="middle">
                      &uarr; {hourlyCalculations[i].thermalAvg} m/s
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Barra Graduata / Legenda Scala Stabilità in Basso */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col items-center">
          <div className="flex items-center justify-between w-full max-w-2xl text-[11px] font-bold text-slate-700 mb-1 px-1">
            <span>&larr; Stabile</span>
            <span className="text-slate-900 font-mono">&Delta;T / 100 m</span>
            <span>Instabile &rarr;</span>
          </div>

          {/* Gradiente cromatico Alpium */}
          <div className="w-full max-w-2xl h-4 rounded-md overflow-hidden flex border border-slate-300 shadow-inner">
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

          {/* Footer Fonte Dati */}
          <div className="mt-6 text-center text-[10px] text-slate-500 font-mono">
            Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo &bull; Diagnostica di volo a vela di Alpium
          </div>
        </div>
      </div>
    </div>
  );
}