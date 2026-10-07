import { fetchHourly } from "@/lib/openMeteoClient";
import React, { useMemo, useState } from "react";
import { useMultiHourWindProfile } from "@/hooks/useMultiHourWindProfile";
import type { HourData } from "@/types/meteo";
import { Wind, Loader2 } from "lucide-react";
import { calcCloudBase } from "@/utils/calcCloudBase";

interface AlpiumWindgramProps {
  siteName: string;
  siteAlt: number;
  lat: number;
  lon: number;
  selectedDay?: number;
  dayData?: HourData[];
  dateLabel?: string;
}

// Quote di pressione (hPa) e relative altezze indicative (m) per l'asse verticale
const PRESSURE_LEVELS = [
  { hpa: 500, alt: 5800 },
  { hpa: 550, alt: 5000 },
  { hpa: 600, alt: 4400 },
  { hpa: 650, alt: 3700 },
  { hpa: 700, alt: 3100 },
  { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 1950 },
  { hpa: 850, alt: 1450 },
  { hpa: 900, alt: 1000 },
  { hpa: 925, alt: 760 },
  { hpa: 950, alt: 500 },
  { hpa: 975, alt: 320 },
  { hpa: 1000, alt: 110 },
];

const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] as const;

const MIN_ALT = 100;
const MAX_ALT = 6000;

// ============== UTILS ==============
function pressureToAlt(hpa: number): number {
  // Formula barometrica approssimata (ISA): altitudine standard per una data pressione
  if (hpa >= 1013.25) return 0;
  return 44330 * (1 - Math.pow(hpa / 1013.25, 0.190284));
}

function lapseRateCper100m(tempLow: number, altLow: number, tempHigh: number, altHigh: number): number {
  const dh = altHigh - altLow;
  if (dh <= 0) return 0;
  return ((tempHigh - tempLow) / dh) * 100;
}

// Colori sfondo instabilità (ΔT/100m): dal blu stabile al rosso instabile
function instabilityColor(deltaT: number): string {
  // deltaT negativo = inversione (stabile)
  // deltaT ~ 0.65 = adiabatico secco (neutro)
  // deltaT > 0.8 = instabile
  if (deltaT <= -0.5) return "#3b5fa0";      // inversione forte, blu scuro
  if (deltaT <= -0.2) return "#5b78b8";
  if (deltaT <= 0.0) return "#7fa0c8";
  if (deltaT <= 0.2) return "#9bbed6";
  if (deltaT <= 0.4) return "#bedfd6";
  if (deltaT <= 0.55) return "#dfeec0";
  if (deltaT <= 0.65) return "#fef08a";      // neutro (adiabatico secco)
  if (deltaT <= 0.75) return "#fde047";      // giallo termico
  if (deltaT <= 0.85) return "#fbbf24";
  if (deltaT <= 0.95) return "#fb923c";
  if (deltaT <= 1.05) return "#f97316";
  if (deltaT <= 1.20) return "#ea580c";
  return "#dc2626";                          // molto instabile
}

function instabilityOpacity(deltaT: number): number {
  if (deltaT <= -0.5) return 0.95;
  if (deltaT <= 0.4) return 0.85;
  if (deltaT <= 0.65) return 0.75;
  return 0.9;
}

function speedColor(speed: number): string {
  if (speed <= 4) return "#0284c7";
  if (speed <= 8) return "#0d9488";
  if (speed <= 13) return "#16a34a";
  if (speed <= 18) return "#65a30d";
  if (speed <= 24) return "#eab308";
  if (speed <= 30) return "#f97316";
  if (speed <= 42) return "#dc2626";
  if (speed <= 58) return "#991b1b";
  return "#86198f";
}

// ============== HOOK DATI ==============
// Recupera temperature per livelli hPa da Open-Meteo per calcolare il lapse rate reale
function useAlpiumData(lat: number, lon: number, siteAlt: number, selectedDay: number) {
  const [hourly, setHourly] = useState<{
    times: string[];
    windSpeed: Record<string, number[]>;
    windDir: Record<string, number[]>;
    temp: Record<string, number[]>;
    temp2m: number[];
    dew2m: number[];
    cloud: number[];
    gust10: number[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const today = new Date();
    const target = new Date(today);
    target.setDate(today.getDate() + selectedDay);
    const dayStr = target.toISOString().split("T")[0];

    // Temperature per ogni livello di pressione per il lapse rate
    const tempFields = [
      "temperature_500hPa", "temperature_550hPa", "temperature_600hPa",
      "temperature_650hPa", "temperature_700hPa", "temperature_750hPa",
      "temperature_800hPa", "temperature_850hPa", "temperature_900hPa",
      "temperature_925hPa", "temperature_950hPa", "temperature_975hPa", "temperature_1000hPa",
    ].join(",");

    const windFields = [
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
      "wind_speed_80m", "wind_direction_80m",
      "wind_speed_120m", "wind_direction_120m",
      "wind_speed_925hPa", "wind_direction_925hPa",
      "wind_speed_850hPa", "wind_direction_850hPa",
      "wind_speed_700hPa", "wind_direction_700hPa",
      "wind_speed_600hPa", "wind_direction_600hPa",
      "wind_speed_500hPa", "wind_direction_500hPa",
    ].join(",");

    const allParams = [...windFields.split(","), ...tempFields.split(","), "temperature_2m", "dew_point_2m", "cloud_cover"].join(",");

    fetchHourly(lat, lon, allParams, dayStr, dayStr)
      .then((j) => {
        if (!mounted) return;
        const times: string[] = j.hourly.time;
        const windSpeed: Record<string, number[]> = {};
        const windDir: Record<string, number[]> = {};
        const temp: Record<string, number[]> = {};

        [
          "10m", "80m", "120m", "925hPa", "850hPa", "700hPa", "600hPa", "500hPa",
        ].forEach((k) => {
          windSpeed[k] = j.hourly[`wind_speed_${k}`] ?? [];
          windDir[k] = j.hourly[`wind_direction_${k}`] ?? [];
        });

        [
          "500hPa", "550hPa", "600hPa", "650hPa", "700hPa", "750hPa",
          "800hPa", "850hPa", "900hPa", "925hPa", "950hPa", "975hPa", "1000hPa",
        ].forEach((k) => {
          temp[k] = j.hourly[`temperature_${k}`] ?? [];
        });

        setHourly({
          times,
          windSpeed,
          windDir,
          temp,
          temp2m: j.hourly.temperature_2m ?? [],
          dew2m: j.hourly.dew_point_2m ?? [],
          cloud: j.hourly.cloud_cover ?? [],
          gust10: j.hourly.wind_gusts_10m ?? [],
        });
        setLoading(false);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Errore");
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [lat, lon, siteAlt, selectedDay]);

  return { hourly, loading, error };
}

// ============== COMPONENTE PRINCIPALE ==============
export default function AlpiumWindgram({
  siteName,
  siteAlt,
  lat,
  lon,
  selectedDay = 0,
  dayData,
  dateLabel,
}: AlpiumWindgramProps) {
  const { hourly, loading, error } = useAlpiumData(lat, lon, siteAlt, selectedDay);
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  // ============ INDICI PER CIASCUNA ORA ============
  const hourIndices = useMemo(() => {
    if (!hourly) return new Map<number, number>();
    const m = new Map<number, number>();
    DISPLAY_HOURS.forEach((hr) => {
      const idx = hourly.times.findIndex((t) => {
        const h = parseInt(t.split("T")[1].split(":")[0], 10);
        return h === hr;
      });
      if (idx !== -1) m.set(hr, idx);
    });
    return m;
  }, [hourly]);

  // ============ DATI PER CELLA (alt, hour) ============
  // Per ogni coppia (hpaLevel, hour): speed, dir, temp
  const cellData = useMemo(() => {
    if (!hourly) return new Map<string, { speed: number; dir: number; temp: number }>();
    const m = new Map<string, { speed: number; dir: number; temp: number }>();

    PRESSURE_LEVELS.forEach((lv) => {
      const hpaKey = `${lv.hpa}hPa`;
      const altKey = `${lv.alt}m`;
      const speedKey = altToSpeedKey(lv.alt, siteAlt);
      const tempKey = hpaKey;

      const speedArr = hourly.windSpeed[speedKey];
      const dirArr = hourly.windDir[speedKey];
      const tempArr = hourly.temp[tempKey];

      DISPLAY_HOURS.forEach((hr) => {
        const idx = hourIndices.get(hr);
        if (idx === undefined) return;
        const speed = speedArr?.[idx] ?? 0;
        const dir = dirArr?.[idx] ?? 0;
        const temp = tempArr?.[idx] ?? NaN;
        m.set(`${lv.hpa}-${hr}`, { speed, dir, temp });
      });
    });
    return m;
  }, [hourly, hourIndices, siteAlt]);

  // ============ CURVA TERMICA SINUSOIDALE ============
  // Per ogni ora, calcola base e top della termica
  const thermalCurve = useMemo(() => {
    if (!hourly) return new Map<number, { base: number; top: number; rate: number }>();
    const m = new Map<number, { base: number; top: number; rate: number }>();

    DISPLAY_HOURS.forEach((hr) => {
      const idx = hourIndices.get(hr);
      if (idx === undefined) return;
      const t = hourly.temp2m[idx];
      if (t === undefined || t === null) return null;
      const tNum = Number(t);
      const dew = hourly.dew2m[idx] !== undefined ? Number(hourly.dew2m[idx]) : (tNum - 6);
      const spread = Math.max(1, t - dew);
      const lcl = calcCloudBase(siteAlt, t, dew);

      // Curva sinusoidale: 0 alle 8h, 1 alle 13h, 0 alle 18h
      const dayPhase = (hr - 13) / 5;
      if (dayPhase < -1 || dayPhase > 1) {
        m.set(hr, { base: siteAlt, top: siteAlt, rate: 0 });
        return;
      }
      const diurnal = Math.cos((dayPhase * Math.PI) / 2);
      const thermalTop = siteAlt + (lcl - siteAlt) * diurnal;
      const rate = 0.5 + 2.5 * diurnal;
      m.set(hr, { base: siteAlt, top: Math.min(4000, thermalTop), rate });
    });
    return m;
  }, [hourly, hourIndices, siteAlt]);

  // ============ ZERO GRADI ============
  // Trova la quota dello zero termico interpolando le temperature hPa
  const zeroCLevelByHour = useMemo(() => {
    if (!hourly) return new Map<number, number>();
    const m = new Map<number, number>();
    DISPLAY_HOURS.forEach((hr) => {
      const idx = hourIndices.get(hr);
      if (idx === undefined) return;

      // Costruisci lista (alt, temp) per interpolazione
      const points: { alt: number; temp: number }[] = [];
      PRESSURE_LEVELS.forEach((lv) => {
        const temp = hourly.temp[`${lv.hpa}hPa`]?.[idx];
        if (temp != null && !isNaN(temp)) points.push({ alt: lv.alt, temp });
      });
      // Aggiungi il suolo
      const t2 = hourly.temp2m[idx];
      if (t2 != null) points.push({ alt: siteAlt, temp: t2 });

      points.sort((a, b) => a.alt - b.alt);

      // Cerca lo zero (interpolazione lineare)
      for (let i = 0; i < points.length - 1; i++) {
        if (points[i].temp <= 0 && points[i + 1].temp >= 0) {
          const ratio = -points[i].temp / (points[i + 1].temp - points[i].temp);
          const alt = points[i].alt + ratio * (points[i + 1].alt - points[i].alt);
          m.set(hr, alt);
          break;
        }
      }
    });
    return m;
  }, [hourly, hourIndices, siteAlt]);

  // ============ LAYOUT SVG ============
  const W = 880;
  const H = 620;
  const margin = { left: 50, right: 90, top: 80, bottom: 50 };
  const plotW = W - margin.left - margin.right;
  const plotH = H - margin.top - margin.bottom;

  const altToY = (alt: number) => {
    const clamped = Math.max(MIN_ALT, Math.min(MAX_ALT, alt));
    return margin.top + ((MAX_ALT - clamped) / (MAX_ALT - MIN_ALT)) * plotH;
  };
  const hourToX = (hr: number) => {
    const idx = DISPLAY_HOURS.indexOf(hr as typeof DISPLAY_HOURS[number]);
    if (idx === -1) return margin.left;
    return margin.left + (idx / (DISPLAY_HOURS.length - 1)) * plotW;
  };
  const xToHour = (x: number) => {
    const ratio = (x - margin.left) / plotW;
    const idx = Math.round(ratio * (DISPLAY_HOURS.length - 1));
    return DISPLAY_HOURS[Math.max(0, Math.min(DISPLAY_HOURS.length - 1, idx))];
  };

  // ============ HEADER: temperature, sole, vento al suolo ============
  const headerData = useMemo(() => {
    if (!hourly) return new Map<number, { temp: number; cloud: number; gust: number }>();
    const m = new Map<number, { temp: number; cloud: number; gust: number }>();
    DISPLAY_HOURS.forEach((hr) => {
      const idx = hourIndices.get(hr);
      if (idx === undefined) return;
      m.set(hr, {
        temp: hourly.temp2m[idx] ?? NaN,
        cloud: hourly.cloud[idx] ?? 0,
        gust: hourly.gust10[idx] ?? 0,
      });
    });
    return m;
  }, [hourly, hourIndices]);

  // ============ SFONDO: MAPPA INSTABILITÀ ============
  // Genera un grid di piccoli rettangoli colorati ΔT/100m
  const instabilityGrid = useMemo(() => {
    if (!hourly) return [];
    const cells: { x: number; y: number; w: number; h: number; color: string; opacity: number }[] = [];

    // Colonne: una per ogni ora
    const colW = plotW / DISPLAY_HOURS.length;
    // Righe: 30 fasce di altitudine
    const rowH = plotH / 24;

    for (let c = 0; c < DISPLAY_HOURS.length; c++) {
      const hr = DISPLAY_HOURS[c];
      const idx = hourIndices.get(hr);
      if (idx === undefined) continue;

      for (let r = 0; r < 24; r++) {
        const alt = MAX_ALT - (r + 0.5) * (MAX_ALT - MIN_ALT) / 24;

        // Calcola lapse rate attorno a questa quota
        const tBelow = getTempAtAlt(hourly, idx, alt - 200, siteAlt);
        const tAbove = getTempAtAlt(hourly, idx, alt + 200, siteAlt);
        const dt = lapseRateCper100m(tBelow, alt - 200, tAbove, alt + 200);
        const color = instabilityColor(dt);
        const opacity = instabilityOpacity(dt);

        cells.push({
          x: margin.left + c * colW,
          y: margin.top + r * rowH,
          w: colW + 1,
          h: rowH + 1,
          color,
          opacity,
        });
      }
    }
    return cells;
  }, [hourly, hourIndices, siteAlt, margin.left, margin.top, plotW, plotH]);

  if (loading) {
    return (
      <div className="w-full bg-slate-900 p-6 rounded-2xl flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
        <span className="text-slate-300">Caricamento windgram Alpium...</span>
      </div>
    );
  }
  if (error || !hourly) {
    return (
      <div className="w-full bg-slate-900 p-6 rounded-2xl text-center text-red-400">
        Errore: {error ?? "dati non disponibili"}
      </div>
    );
  }

  // ============ RENDER ============
  return (
    <div className="w-full bg-[#0a0e1a] p-2 sm:p-4 rounded-2xl">
      <div className="bg-[#0f1424] border border-slate-800 rounded-2xl overflow-hidden">
        {/* HEADER */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Wind className="w-5 h-5 text-sky-400" />
              Windgram
            </h3>
            <p className="text-sm text-slate-300 font-semibold">
              {siteName} &mdash; {dateLabel ?? "previsione"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              plotted {new Date().toISOString().slice(0, 16).replace("T", " ")} UTC &middot; model ground {siteAlt} m
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-1 rounded bg-slate-800">6 km &middot; default</span>
            <button className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">⬇ PNG</button>
          </div>
        </div>

        {/* TABELLA ORE / TEMPERATURA / VENTO AL SUOLO */}
        <div className="px-4">
          <svg width="100%" viewBox={`0 0 ${W} 70`} preserveAspectRatio="none" className="block">
            <rect x={margin.left} y={0} width={plotW} height={70} fill="#1e293b" />
            {/* Temperature e sole */}
            {DISPLAY_HOURS.map((hr, i) => {
              const x = margin.left + (i / (DISPLAY_HOURS.length - 1)) * plotW;
              const d = headerData.get(hr);
              const temp = d?.temp ?? NaN;
              const isRed = temp >= 25;
              const isOrange = temp >= 18 && temp < 25;
              const tempColor = isRed ? "#ef4444" : isOrange ? "#f97316" : "#cbd5e1";
              return (
                <g key={`hdr-${hr}`}>
                  <text x={x} y={18} textAnchor="middle" className="text-[14px] font-bold" fill={tempColor}>
                    {isNaN(temp) ? "—" : temp.toFixed(1)}
                  </text>
                  {/* Icona sole in base alla copertura nuvolosa */}
                  <g transform={`translate(${x - 8}, 28)`}>
                    <circle cx="6" cy="6" r="4" fill="#fbbf24" opacity={1 - (d?.cloud ?? 0) / 100 * 0.7} />
                    {/* Raggi */}
                    {Array.from({ length: 8 }).map((_, k) => {
                      const ang = (k * Math.PI) / 4;
                      return (
                        <line
                          key={k}
                          x1={6 + Math.cos(ang) * 6}
                          y1={6 + Math.sin(ang) * 6}
                          x2={6 + Math.cos(ang) * 9}
                          y2={6 + Math.sin(ang) * 9}
                          stroke="#fbbf24"
                          strokeWidth="1.2"
                          opacity={1 - (d?.cloud ?? 0) / 100 * 0.8}
                        />
                      );
                    })}
                  </g>
                  <text x={x} y={56} textAnchor="middle" className="text-[10px]" fill="#94a3b8">
                    sole %
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* SVG GRAFICO PRINCIPALE */}
        <div className="px-2 sm:px-4">
          <svg
            width="100%"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="block"
            onMouseMove={(e) => {
              const rect = (e.target as SVGElement).getBoundingClientRect();
              const scaleX = W / rect.width;
              const x = (e.clientX - rect.left) * scaleX;
              setHoverHour(xToHour(x));
            }}
            onMouseLeave={() => setHoverHour(null)}
          >
            {/* SFONDO MAPPA INSTABILITÀ */}
            {instabilityGrid.map((cell, i) => (
              <rect key={`inst-${i}-${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width={cell.w} height={cell.h} fill={cell.color} opacity={cell.opacity} />
            ))}

            {/* Bordo area plot */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#334155" strokeWidth="1" />

            {/* LINEE ORIZZONTALI QUOTE hPa */}
            {PRESSURE_LEVELS.map((lv) => (
              <g key={`grid-${lv.hpa}`}>
                <line
                  x1={margin.left}
                  y1={altToY(lv.alt)}
                  x2={margin.left + plotW}
                  y2={altToY(lv.alt)}
                  stroke="#475569"
                  strokeWidth="0.5"
                  strokeDasharray="2 3"
                />
                <text x={margin.left - 8} y={altToY(lv.alt) + 4} textAnchor="end" className="text-[11px] font-bold" fill="#94a3b8">
                  {lv.hpa} hPa
                </text>
                <text x={margin.left + plotW + 6} y={altToY(lv.alt) + 4} textAnchor="start" className="text-[10px]" fill="#64748b">
                  {lv.alt} m
                </text>
              </g>
            ))}

            {/* ETICHETTE ORE (in basso) */}
            {DISPLAY_HOURS.map((hr, i) => {
              const x = hourToX(hr);
              return (
                <g key={`hour-${hr}`}>
                  <line x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#1e293b" strokeWidth="0.5" />
                  <text x={x} y={H - margin.bottom + 18} textAnchor="middle" className="text-[11px] font-bold" fill="#cbd5e1">
                    {String(hr).padStart(2, "0")}:00
                  </text>
                </g>
              );
            })}

            {/* FRECCE VENTO */}
            {PRESSURE_LEVELS.map((lv) =>
              DISPLAY_HOURS.map((hr) => {
                const d = cellData.get(`${lv.hpa}-${hr}`);
                if (!d) return null;
                const x = hourToX(hr);
                const y = altToY(lv.alt);
                const color = speedColor(d.speed);
                // Direzione del moto (freccia verso dove va il vento)
                const targetDeg = (d.dir + 180) % 360;
                const isHover = hoverHour === hr;
                return (
                  <g key={`w-${lv.hpa}-${hr}`} transform={`translate(${x}, ${y}) rotate(${targetDeg})`}>
                    {/* Linea */}
                    <line x1={-9} y1={0} x2={6} y2={0} stroke={color} strokeWidth={isHover ? 2 : 1.4} />
                    {/* Testa */}
                    <polygon points="6,-3.5 11,0 6,3.5" fill={color} stroke={color} strokeWidth="0.5" />
                    {/* Codetta */}
                    <line x1={-9} y1={0} x2={-12} y2={0} stroke={color} strokeWidth="1.2" />
                  </g>
                );
              })
            )}

            {/* LINEA ZERO GRADI (azzurra tratteggiata con fiocchi) */}
            {DISPLAY_HOURS.map((hr, i) => {
              const z = zeroCLevelByHour.get(hr);
              if (z == null) return null;
              const x = hourToX(hr);
              return (
                <g key={`zero-${hr}`}>
                  <line x1={x} y1={altToY(z)} x2={x} y2={altToY(z)} stroke="#7dd3fc" strokeWidth="1.5" strokeDasharray="3 2" />
                  {/* Fiocco di neve */}
                  <g transform={`translate(${x}, ${altToY(z) - 10})`} opacity="0.95">
                    <text textAnchor="middle" y="4" className="text-[14px]" fill="#7dd3fc">❄</text>
                  </g>
                </g>
              );
            })}

            {/* CURVA TERMICA GIALLA (base termica, parte dal suolo) */}
            <path
              d={
                DISPLAY_HOURS.map((hr, i) => {
                  const t = thermalCurve.get(hr);
                  if (!t) return "";
                  const x = hourToX(hr);
                  const y = altToY(t.base);
                  return `${i === 0 ? "M" : "L"} ${x} ${y}`;
                }).join(" ")
              }
              stroke="#facc15"
              strokeWidth="2"
              fill="none"
              opacity="0.85"
            />

            {/* CURVA CUMULIBASE (viola/magenta con mezzelune) */}
            {DISPLAY_HOURS.map((hr, i) => {
              const t = thermalCurve.get(hr);
              if (!t || t.top <= t.base + 100) return null;
              const x = hourToX(hr);
              const yTop = altToY(t.top);
              const yBase = altToY(t.base);
              const height = yBase - yTop;
              // Mezzaluna cumulibase (arco viola)
              return (
                <g key={`cb-${hr}`}>
                  <path
                    d={`M ${x - 8} ${yTop + 2} Q ${x} ${yTop - 8} ${x + 8} ${yTop + 2}`}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="1.8"
                  />
                  <path
                    d={`M ${x - 6} ${yTop + 4} Q ${x} ${yTop - 4} ${x + 6} ${yTop + 4}`}
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="1.2"
                  />
                  <text x={x} y={yTop - 14} textAnchor="middle" className="text-[9px] font-bold" fill="#e9d5ff">
                    {Math.round(t.top)} m
                  </text>
                  <text x={x} y={yTop - 4} textAnchor="middle" className="text-[9px]" fill="#c084fc">
                    ↑{t.rate.toFixed(1)} m/s
                  </text>
                </g>
              );
            })}

            {/* LINEA ALTIMETRIA DECOLLO */}
            <line
              x1={margin.left}
              y1={altToY(siteAlt)}
              x2={margin.left + plotW}
              y2={altToY(siteAlt)}
              stroke="#10b981"
              strokeWidth="2"
              opacity="0.6"
            />
            <text x={margin.left + 4} y={altToY(siteAlt) - 4} className="text-[10px] font-bold" fill="#10b981">
              ▲ {siteAlt} m
            </text>

            {/* HOVER LINEA VERTICALE */}
            {hoverHour != null && (
              <line
                x1={hourToX(hoverHour)}
                y1={margin.top}
                x2={hourToX(hoverHour)}
                y2={margin.top + plotH}
                stroke="#fbbf24"
                strokeWidth="1"
                strokeDasharray="3 2"
                opacity="0.6"
              />
            )}
          </svg>
        </div>

        {/* LEGENDA SCALA INSTABILITÀ */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-center gap-3 flex-wrap text-[10px] text-slate-400">
            <span>Stabile ←</span>
            {[
              { c: "#3b5fa0", v: "-0.20" },
              { c: "#7fa0c8", v: "0.00" },
              { c: "#dfeec0", v: "0.16" },
              { c: "#fef08a", v: "0.32" },
              { c: "#fbbf24", v: "0.48" },
              { c: "#fb923c", v: "0.65" },
              { c: "#f97316", v: "0.82" },
              { c: "#ea580c", v: "0.98" },
              { c: "#dc2626", v: "1.20" },
            ].map((s) => (
              <div key={s.v} className="flex items-center gap-1">
                <div className="w-4 h-3 rounded-sm" style={{ backgroundColor: s.c }} />
                <span>{s.v}</span>
              </div>
            ))}
            <span>→ Instabile</span>
          </div>
          <p className="text-center text-[9px] text-slate-500 mt-1">ΔT / 100 m</p>
          <p className="text-center text-[10px] text-slate-400 mt-2">
            Fonte: Open-Meteo GFS &middot; hPa levels &middot; Stile grafico Alpium
          </p>
        </div>
      </div>
    </div>
  );
}

// ============== HELPER ==============
function altToSpeedKey(alt: number, siteAlt: number): string {
  // Mappa l'altitudine del livello hPa al campo wind_speed_* di Open-Meteo
  if (alt <= siteAlt + 50) return "10m";
  if (alt <= siteAlt + 100) return "80m";
  if (alt <= siteAlt + 200) return "120m";
  if (alt <= 850) return "925hPa";
  if (alt <= 1700) return "850hPa";
  if (alt <= 3500) return "700hPa";
  if (alt <= 4700) return "600hPa";
  return "500hPa";
}

function getTempAtAlt(
  hourly: { temp: Record<string, number[]> },
  idx: number,
  alt: number,
  siteAlt: number
): number {
  // Interpolazione lineare temperatura tra due livelli hPa
  const points: { alt: number; temp: number }[] = [];
  // Suolo
  PRESSURE_LEVELS.forEach((lv) => {
    const t = hourly.temp[`${lv.hpa}hPa`]?.[idx];
    if (t != null && !isNaN(t)) points.push({ alt: lv.alt, temp: t });
  });
  points.sort((a, b) => a.alt - b.alt);

  if (points.length === 0) return 15 - (alt - siteAlt) * 0.0065;

  if (alt <= points[0].alt) return points[0].temp;
  if (alt >= points[points.length - 1].alt) return points[points.length - 1].temp;

  for (let i = 0; i < points.length - 1; i++) {
    if (points[i].alt <= alt && points[i + 1].alt >= alt) {
      const ratio = (alt - points[i].alt) / (points[i + 1].alt - points[i].alt);
      return points[i].temp + ratio * (points[i + 1].temp - points[i].temp);
    }
  }
  return points[0].temp;
}
