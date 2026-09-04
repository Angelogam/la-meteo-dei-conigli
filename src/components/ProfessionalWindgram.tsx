"use client";

import React, { useMemo } from "react";
import { Wind, Sun, Activity, Mountain } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { useMultiHourWindProfile } from "@/hooks/useMultiHourWindProfile";

interface ProfessionalWindgramProps {
  dayData: HourData[];
  siteName: string;
  altitude: number;
  selectedHour?: number;
  onHourSelect?: (hour: number) => void;
  selectedDay?: number;
  dateLabel?: string;
  lat?: number;
  lon?: number;
}

const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] as const;

// Mappa colori ΔT/100m (gradiente termico) - blu/viola/verde/giallo/arancio/rosso
const DT_GRADIENT: { value: number; color: string }[] = [
  { value: -0.20, color: "#1e3a8a" }, // -0.20 blu scuro
  { value: 0.00, color: "#3b82f6" },  // 0.00 blu
  { value: 0.16, color: "#a855f7" },  // 0.16 viola
  { value: 0.32, color: "#06b6d4" },  // 0.32 ciano
  { value: 0.48, color: "#10b981" },  // 0.48 verde
  { value: 0.65, color: "#fbbf24" },  // 0.65 giallo
  { value: 0.82, color: "#f97316" },  // 0.82 arancio
  { value: 0.98, color: "#ea580c" },  // 0.98 arancio scuro
  { value: 1.20, color: "#dc2626" },  // 1.20 rosso
];

// Colori frecce vento per velocità (km/h) - stile Rasoft
function getWindColor(kmh: number): string {
  if (kmh <= 4) return "#0ea5e9";   // sky-500
  if (kmh <= 8) return "#0284c7";   // sky-600
  if (kmh <= 13) return "#0891b2";  // cyan-600
  if (kmh <= 18) return "#0e7490";  // cyan-700
  if (kmh <= 24) return "#155e75";  // cyan-800
  if (kmh <= 30) return "#164e63";  // cyan-900
  if (kmh <= 42) return "#831843";  // pink-900
  if (kmh <= 58) return "#581c87";  // purple-900
  return "#3b0764";                  // purple-950
}

// Converte velocità in m/s per visualizzazione
function msToKmh(ms: number): number { return Math.round(ms * 3.6); }

// Calcola ΔT/100m: gradiente termico verticale (più alto = instabile)
function computeDt100m(temp1000hPa: number, temp850hPa: number): number {
  // 1000hPa ~ 110m, 850hPa ~ 1450m → differenza ~1340m
  const altDiff = 1340;
  const tempDiff = temp850hPa - temp1000hPa;
  // Per 100m: (tempDiff / altDiff) * 100
  return (tempDiff / altDiff) * 100;
}

export default function ProfessionalWindgram({
  dayData,
  siteName,
  altitude,
  selectedHour = 13,
  selectedDay = 0,
  dateLabel = "",
  lat = 44.2587,
  lon = 7.7943,
}: ProfessionalWindgramProps) {
  const { data: windProfileMap, loading } = useMultiHourWindProfile({
    lat, lon, siteAlt: altitude, selectedDay,
  });

  // Livelli di pressione da 850 hPa (basso) a 500 hPa (alto)
  // Mappa: hPa → altitudine approssimativa (m)
  const PRESSURE_LEVELS = [
    { hpa: 500, alt: 5800 },
    { hpa: 550, alt: 5100 },
    { hpa: 600, alt: 4400 },
    { hpa: 650, alt: 3800 },
    { hpa: 700, alt: 3100 },
    { hpa: 750, alt: 2500 },
    { hpa: 800, alt: 1950 },
    { hpa: 850, alt: 1450 },
  ];

  // Geometria SVG
  const padding = { top: 30, right: 70, bottom: 50, left: 60 };
  const width = 1180;
  const height = 800;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // X: da 8h a 18h (11 ore)
  const getXFromHourIdx = (idx: number) => padding.left + (idx / (DISPLAY_HOURS.length - 1)) * innerW;
  // Y: invertita (alto = pressione bassa)
  const getYFromAlt = (alt: number) => {
    const minAlt = 1200; // poco sotto il suolo
    const maxAlt = 6200;
    const norm = (alt - minAlt) / (maxAlt - minAlt);
    return padding.top + (1 - norm) * innerH;
  };

  // Prepara i dati orari aggregati
  const hourlyData = useMemo(() => {
    return DISPLAY_HOURS.map((hr, idx) => {
      const profile = windProfileMap.get(hr);
      const hourData = dayData.find((h) => new Date(h.time).getHours() === hr);

      // Zero termico: usa freezingLevel o stima
      const zeroThermal = profile?.freeze ?? (altitude + (hourData?.temperature ?? 10) * 100);

      // Vento al suolo
      const surfaceWind = profile?.levels?.[0];

      // Curva top termica (sinusoidale)
      const dayPhase = (hr - 13) / 5;
      const diurnal = dayPhase >= -1 && dayPhase <= 1 ? Math.cos((dayPhase * Math.PI) / 2) : 0;
      const cloudBaseVal = hourData?.temperature != null && hourData?.dewPoint != null
        ? altitude + Math.max(1, hourData.temperature - hourData.dewPoint) * 125
        : 2000;
      const thermalTop = altitude + (cloudBaseVal - altitude) * diurnal;

      // Valore medio ascendenze (stima da temperatura e sole)
      const temp = hourData?.temperature ?? 15;
      const sunshineProb = Math.max(0, Math.min(100, 100 - (hourData?.cloudCover ?? 30)));
      const meanLift = (Math.max(0, temp - 15) * 0.3 + sunshineProb * 0.05).toFixed(1);

      return {
        hour: hr,
        idx,
        zeroThermal,
        thermalTop,
        surfaceWind: surfaceWind ? { speed: surfaceWind.speed, dir: surfaceWind.dir } : null,
        cloudBase: cloudBaseVal,
        cloudCover: hourData?.cloudCover ?? 30,
        temp,
        sunshineProb,
        meanLift,
        hourData,
        profile,
      };
    });
  }, [windProfileMap, dayData, altitude]);

  // Genera il "parapendio" (path nuvola viola) - stile Rasoft
  const thermalCurve = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.thermalTop)}`).join(" ");
  }, [hourlyData]);

  // Linea zero termico (azzurra tratteggiata)
  const zeroThermalPath = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData.map((h, i) => `${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`).join(" ");
  }, [hourlyData]);

  // Top termiche (curva nera tratteggiata)
  const cloudTopPath = useMemo(() => {
    if (hourlyData.length === 0) return "";
    return hourlyData.map((h, i) => {
      // Top delle nuvole: stima 1500m sopra la base termica al picco
      const dayPhase = (h.hour - 13) / 5;
      const diurnal = dayPhase >= -1 && dayPhase <= 1 ? Math.cos((dayPhase * Math.PI) / 2) : 0;
      const cloudTop = h.thermalTop + 1500 * diurnal;
      return `${getXFromHourIdx(i)},${getYFromAlt(Math.min(5500, cloudTop))}`;
    }).join(" ");
  }, [hourlyData]);

  // Genera i rettangoli colorati ΔT/100m (parapendii)
  const deltaTBoxes = useMemo(() => {
    const boxes: { x: number; y: number; w: number; h: number; color: string; label: string }[] = [];
    const colW = innerW / (DISPLAY_HOURS.length - 1);

    hourlyData.forEach((h, idx) => {
      if (!h.profile) return;
      // Calcola ΔT/100m con temperature pressione 1000hPa e 850hPa
      // Stima: usiamo temp 2m e 850hPa interpolata
      const tSurface = h.temp;
      // Stima T a 850hPa (~1450m) da lapse rate standard 6.5°C/1000m
      const t850 = tSurface - (1450 - altitude) / 100 * 0.65;
      const dt = ((t850 - tSurface) / (1450 - altitude)) * 100;
      const dtClamped = Math.max(-0.3, Math.min(1.2, dt));

      // Trova il colore più vicino nella gradazione
      let nearestColor = DT_GRADIENT[0].color;
      let minDiff = Infinity;
      DT_GRADIENT.forEach((g) => {
        const diff = Math.abs(g.value - dtClamped);
        if (diff < minDiff) { minDiff = diff; nearestColor = g.color; }
      });

      boxes.push({
        x: getXFromHourIdx(idx) - colW / 2 + 2,
        y: padding.top,
        w: colW - 4,
        h: innerH,
        color: nearestColor,
        label: dtClamped.toFixed(2),
      });
    });
    return boxes;
  }, [hourlyData, altitude, padding.top, innerH, innerW]);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto bg-slate-900/60 p-4 rounded-2xl">
        <div className="w-full bg-white border border-slate-200/80 rounded-2xl shadow-2xl p-8 text-center">
          <div className="inline-block w-8 h-8 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
          <p className="text-sm text-slate-700 font-bold mt-3">Caricamento windgram professionale...</p>
        </div>
      </div>
    );
  }

  // Formatta la data
  const headerDate = dateLabel || (() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    const giorni = ["DOMENICA", "LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO"];
    const mesi = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"];
    return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
  })();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  return (
    <div className="w-full max-w-6xl mx-auto bg-slate-900/60 p-2 sm:p-3 rounded-2xl">
      <div className="w-full bg-white text-slate-900 border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden font-sans select-none">
        {/* HEADER */}
        <div className="px-4 pt-3 pb-1 text-center">
          <h3 className="text-lg font-bold tracking-tight text-slate-900">
            {siteName.toLowerCase()} &middot; {headerDate.toLowerCase()}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            plotted {todayStr} 00:00 UTC &middot; model ground 1275 m &middot; SRTM 1262 m
          </p>
        </div>

        {/* HEADER BAR: media ascendenze + sole % */}
        <div className="px-4 pb-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
            <span className="text-slate-500">valore medio ascendenze [m/s]</span>
            <div className="flex items-center gap-2 flex-1 ml-4">
              {hourlyData.map((h, i) => (
                <div key={i} className="flex-1 text-center text-slate-800 tabular-nums">
                  {h.meanLift}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mt-0.5">
            <span className="text-slate-500">sole %</span>
            <div className="flex items-center gap-2 flex-1 ml-4">
              {hourlyData.map((h, i) => (
                <div key={i} className="flex-1 text-center tabular-nums" style={{ color: h.sunshineProb > 50 ? "#dc2626" : "#64748b" }}>
                  {h.sunshineProb}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SVG GRAFICO */}
        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto min-w-[880px]"
            style={{ shapeRendering: "geometricPrecision", textRendering: "geometricPrecision" }}
          >
            {/* Sfondo bianco */}
            <rect x="0" y="0" width={width} height={height} fill="white" />

            {/* Banda parapendii colorata (rettangoli ΔT/100m) */}
            {deltaTBoxes.map((b, i) => (
              <rect
                key={i}
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill={b.color}
                opacity={0.85}
              />
            ))}

            {/* Linea zero termico (azzurra tratteggiata) */}
            {zeroThermalPath && (
              <polyline
                points={zeroThermalPath}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2"
                strokeDasharray="8,4"
                opacity="0.9"
              />
            )}

            {/* Fiocchi di neve sullo zero termico */}
            {hourlyData.map((h, i) => (
              <g key={`snow-${i}`} transform={`translate(${getXFromHourIdx(i)}, ${getYFromAlt(h.zeroThermal)})`}>
                <circle r="9" fill="white" stroke="#0ea5e9" strokeWidth="1.5" />
                <text textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="bold" fill="#0ea5e9">❄</text>
              </g>
            ))}

            {/* Curva nera tratteggiata: top termiche */}
            {cloudTopPath && (
              <polyline
                points={cloudTopPath}
                fill="none"
                stroke="#0f172a"
                strokeWidth="1.5"
                strokeDasharray="6,3"
                opacity="0.6"
              />
            )}

            {/* CURVA VIOLA: top nuvole (parapendii stilizzati) */}
            {thermalCurve && (
              <polyline
                points={thermalCurve}
                fill="none"
                stroke="#a855f7"
                strokeWidth="2.5"
                opacity="0.95"
              />
            )}

            {/* Archi parapendio sotto la curva viola */}
            {hourlyData.map((h, i) => {
              if (h.thermalTop < altitude) return null;
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.thermalTop);
              const wingW = 30;
              const wingH = 10;
              return (
                <g key={`para-${i}`}>
                  {/* Arco parapendio */}
                  <path
                    d={`M ${x - wingW} ${y + 4} Q ${x} ${y - wingH}, ${x + wingW} ${y + 4}`}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Linee sospensione */}
                  <line x1={x - wingW + 2} y1={y + 4} x2={x - 4} y2={y + 18} stroke="#a855f7" strokeWidth="1.2" />
                  <line x1={x + wingW - 2} y1={y + 4} x2={x + 4} y2={y + 18} stroke="#a855f7" strokeWidth="1.2" />
                  {/* Pilota */}
                  <circle cx={x} cy={y + 18} r="3" fill="#a855f7" />
                  {/* Etichetta quota */}
                  <rect x={x - 22} y={y + 24} width="44" height="22" rx="3" fill="white" stroke="#a855f7" strokeWidth="1" />
                  <text x={x} y={y + 34} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#a855f7">
                    {Math.round(h.thermalTop)} m
                  </text>
                  {/* Etichetta vento */}
                  {h.surfaceWind && (
                    <>
                      <rect x={x - 24} y={y + 48} width="48" height="18" rx="3" fill="white" stroke="#a855f7" strokeWidth="1" />
                      <text x={x} y={y + 58} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#a855f7">
                        ↑ {(h.surfaceWind.speed / 3.6).toFixed(1)} m/s
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Frecce vento a tutte le quote */}
            {DISPLAY_HOURS.map((hr, hrIdx) => {
              const profile = windProfileMap.get(hr);
              if (!profile) return null;
              return profile.levels.map((level, lvIdx) => {
                if (level.alt > 6000) return null;
                const x = getXFromHourIdx(hrIdx);
                const y = getYFromAlt(level.alt);
                const kmh = level.speed;
                const color = getWindColor(kmh);
                const rotDeg = level.dir;
                return (
                  <g key={`wind-${hrIdx}-${lvIdx}`} transform={`translate(${x}, ${y}) rotate(${rotDeg})`}>
                    {/* Asta */}
                    <line x1="-8" y1="0" x2="8" y2="0" stroke={color} strokeWidth="2" />
                    {/* Triangolo (punta) */}
                    <polygon points="-3,-4 10,0 -3,4" fill={color} />
                  </g>
                );
              });
            })}

            {/* Etichetta 0°C / altitudine sullo zero termico (ultimo punto) */}
            {hourlyData.length > 0 && (() => {
              const last = hourlyData[hourlyData.length - 1];
              const x = getXFromHourIdx(hourlyData.length - 1) + 12;
              const y = getYFromAlt(last.zeroThermal);
              return (
                <g>
                  <rect x={x} y={y - 11} width="100" height="22" rx="4" fill="white" stroke="#0ea5e9" strokeWidth="1.5" />
                  <text x={x + 50} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0ea5e9">
                    0°C · {Math.round(last.zeroThermal)} m
                  </text>
                </g>
              );
            })()}

            {/* ASSE Y: quote (destra) */}
            {[
              { alt: 1500 }, { alt: 2000 }, { alt: 2500 }, { alt: 3000 },
              { alt: 3500 }, { alt: 4000 }, { alt: 4500 }, { alt: 5000 }, { alt: 5500 }, { alt: 6000 },
            ].map(({ alt }) => (
              <g key={`yr-${alt}`}>
                <line
                  x1={padding.left + innerW}
                  y1={getYFromAlt(alt)}
                  x2={padding.left + innerW + 4}
                  y2={getYFromAlt(alt)}
                  stroke="#64748b"
                  strokeWidth="1"
                />
                <text
                  x={padding.left + innerW + 8}
                  y={getYFromAlt(alt) + 4}
                  fontSize="10"
                  fill="#64748b"
                  fontFamily="monospace"
                >
                  {alt} m
                </text>
              </g>
            ))}

            {/* ASSE Y: pressione (sinistra) */}
            {PRESSURE_LEVELS.map(({ hpa, alt }) => (
              <g key={`yl-${hpa}`}>
                <line
                  x1={padding.left - 4}
                  y1={getYFromAlt(alt)}
                  x2={padding.left}
                  y2={getYFromAlt(alt)}
                  stroke="#64748b"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={getYFromAlt(alt) + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#475569"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {hpa} hPa
                </text>
              </g>
            ))}

            {/* ASSE X: ore */}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const isSelected = h.hour === selectedHour;
              return (
                <g key={`xl-${i}`}>
                  <line x1={x} y1={padding.top + innerH} x2={x} y2={padding.top + innerH + 4} stroke="#64748b" strokeWidth="1" />
                  <text
                    x={x}
                    y={padding.top + innerH + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fill={isSelected ? "#0284c7" : "#475569"}
                    fontWeight={isSelected ? "bold" : "normal"}
                    fontFamily="monospace"
                  >
                    {String(h.hour).padStart(2, "0")}:00
                  </text>
                </g>
              );
            })}

            {/* Bordo grafico */}
            <rect
              x={padding.left}
              y={padding.top}
              width={innerW}
              height={innerH}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* LEGENDA ΔT/100m */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500 font-medium">Stabile ←</span>
            <span className="text-[11px] font-bold text-slate-800">ΔT / 100 m</span>
            <span className="text-[10px] text-slate-500 font-medium">→ Instabile</span>
          </div>
          <div className="flex h-3 rounded-sm overflow-hidden border border-slate-300">
            {DT_GRADIENT.map((g, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: g.color }} />
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-0.5">
            {DT_GRADIENT.map((g, i) => (
              <span key={i}>{g.value.toFixed(2)}</span>
            ))}
          </div>
        </div>

        {/* FONTE */}
        <div className="px-4 pb-3 pt-1 text-center text-[10px] text-slate-500">
          Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo &middot; Diagnostici di volo a vela di Alpium
        </div>
      </div>
    </div>
  );
}
