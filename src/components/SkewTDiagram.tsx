"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface SoundingData {
  pressure: number[];
  temperature: number[];
  dewPoint: number[];
  windSpeed: number[];
  windDir: number[];
  cloudCover: number[];
  cloudCoverLow: number[];
  cloudCoverMid: number[];
  cloudCoverHigh: number[];
  rh: number[];
  precipitation: number[];
  cape: number;
  cin: number;
  liftedIndex: number;
  freezingLevel: number;
}

interface SkewTDiagramProps {
  latitude: number;
  longitude: number;
  siteAltitude: number;
  siteName: string;
  selectedHour?: number;
  selectedDay?: number;
}

const W = 1000;
const H = 700;
const M = { top: 80, right: 90, bottom: 70, left: 80 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

const P_BOTTOM = 1050;
const P_TOP = 100;
const T_MIN = -40;
const T_MAX = 45;
const SKEW_DEG = 30;

const PRESSURE_LEVELS = [
  { p: 1000, alt: 110 },
  { p: 925, alt: 760 },
  { p: 850, alt: 1450 },
  { p: 700, alt: 3000 },
  { p: 600, alt: 4200 },
  { p: 500, alt: 5500 },
  { p: 400, alt: 7200 },
  { p: 300, alt: 9200 },
  { p: 250, alt: 10400 },
  { p: 200, alt: 11800 },
  { p: 150, alt: 13600 },
  { p: 100, alt: 16200 },
];

function pToY(p: number): number {
  const logP = Math.log(p);
  return M.top + PH * (logP - Math.log(P_TOP)) / (Math.log(P_BOTTOM) - Math.log(P_TOP));
}

function tToX(t: number, p: number): number {
  const normT = (t - T_MIN) / (T_MAX - T_MIN);
  const skew = Math.tan(SKEW_DEG * Math.PI / 180)
    * (Math.log(p) - Math.log(P_BOTTOM))
    / (Math.log(P_TOP) - Math.log(P_BOTTOM))
    * PW;
  return M.left + normT * PW + skew + PW * 0.05;
}

function renderWindBarb(
  x: number, y: number, speedKmh: number, dirDeg: number
): React.ReactNode {
  if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
  const knots = speedKmh * 0.539957;
  const angle = ((dirDeg - 90) * Math.PI) / 180;
  const staffLen = 24;
  const ex = x + staffLen * Math.cos(angle);
  const ey = y + staffLen * Math.sin(angle);
  const barbColor = speedKmh > 30 ? "#c026d3" : speedKmh > 18 ? "#0284c7" : "#3b82f6";
  const barbAngle = angle + (115 * Math.PI) / 180;

  const elems: React.ReactNode[] = [];
  let rem = Math.round(knots / 5) * 5;
  let pos = 1.0;

  // Pennacchio 50 nodi
  while (rem >= 50 && pos >= 0.3) {
    const bx = x + pos * (ex - x);
    const by = y + pos * (ey - y);
    elems.push(
      <polygon
        key={`p50-${x}-${y}-${pos}`}
        points={`${bx},${by} ${bx + 12 * Math.cos(barbAngle)},${by + 12 * Math.sin(barbAngle)} ${bx + 6 * Math.cos(angle)},${by + 6 * Math.sin(angle)}`}
        fill={barbColor}
        stroke={barbColor}
        strokeWidth="1"
      />
    );
    rem -= 50;
    pos -= 0.28;
  }

  // Alette 10 nodi
  while (rem >= 10 && pos >= 0.2) {
    const bx = x + pos * (ex - x);
    const by = y + pos * (ey - y);
    elems.push(
      <line
        key={`l10-${x}-${y}-${pos}`}
        x1={bx} y1={by}
        x2={bx + 10 * Math.cos(barbAngle)} y2={by + 10 * Math.sin(barbAngle)}
        stroke={barbColor} strokeWidth="1.8" strokeLinecap="round"
      />
    );
    rem -= 10;
    pos -= 0.18;
  }

  // Alette 5 nodi
  if (rem >= 5 && pos >= 0.2) {
    const bx = x + pos * (ex - x);
    const by = y + pos * (ey - y);
    elems.push(
      <line
        key={`l5-${x}-${y}`}
        x1={bx} y1={by}
        x2={bx + 6 * Math.cos(barbAngle)} y2={by + 6 * Math.sin(barbAngle)}
        stroke={barbColor} strokeWidth="1.8" strokeLinecap="round"
      />
    );
  }

  return (
    <g key={`wb-${Math.round(x)}-${Math.round(y)}`}>
      <line x1={x} y1={y} x2={ex} y2={ey} stroke={barbColor} strokeWidth="1.8" strokeLinecap="round" />
      {elems}
    </g>
  );
}

function getStabilityColor(spread: number, rh: number, cc: number): string {
  if (cc > 60) {
    const intensity = Math.min(0.55, cc / 120);
    return `rgba(100, 116, 139, ${intensity})`;
  }
  if (rh > 85) return `rgba(59, 130, 246, ${Math.min(0.4, (rh - 80) / 50)})`;
  if (rh > 70) return `rgba(96, 165, 250, ${Math.min(0.25, (rh - 70) / 60)})`;
  if (spread < 3) return "rgba(16, 185, 129, 0.18)";
  if (spread < 6) return "rgba(34, 197, 94, 0.14)";
  if (spread < 10) return "rgba(132, 204, 22, 0.10)";
  if (spread < 15) return "rgba(234, 179, 8, 0.07)";
  return "transparent";
}

export default function SkewTDiagram({
  latitude, longitude, siteAltitude, siteName,
  selectedHour = 12, selectedDay = 0
}: SkewTDiagramProps) {
  const [sounding, setSounding] = useState<SoundingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d.toISOString().split("T")[0];
  }, [selectedDay]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const hourlyParams = [
      "temperature_2m", "dew_point_2m", "relative_humidity_2m",
      "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
      "cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high",
      "precipitation", "rain",
      "cape", "convective_inhibition", "lifted_index",
      "freezing_level_height",
      "wind_speed_925hPa", "wind_direction_925hPa",
      "wind_speed_850hPa", "wind_direction_850hPa",
      "wind_speed_700hPa", "wind_direction_700hPa",
      "wind_speed_600hPa", "wind_direction_600hPa",
      "wind_speed_500hPa", "wind_direction_500hPa",
      "wind_speed_400hPa", "wind_direction_400hPa",
      "wind_speed_300hPa", "wind_direction_300hPa",
      "wind_speed_250hPa", "wind_direction_250hPa",
      "wind_speed_200hPa", "wind_direction_200hPa",
      "wind_speed_150hPa", "wind_direction_150hPa",
      "wind_speed_100hPa", "wind_direction_100hPa",
    ].join(",");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${hourlyParams}&timezone=Europe/Rome&start_date=${dateStr}&end_date=${dateStr}`;

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => {
        if (!mounted) return;

        const times: string[] = json.hourly.time;
        const idx = times.findIndex(t => parseInt(t.split("T")[1].split(":")[0]) === selectedHour);
        if (idx === -1) { setError("Ora non trovata"); setLoading(false); return; }

        const h = json.hourly;
        const getVal = (key: string, i: number) => h[key]?.[i] ?? null;

        const windKeys: Record<number, { ws: string; wd: string }> = {
          925: { ws: "wind_speed_925hPa", wd: "wind_direction_925hPa" },
          850: { ws: "wind_speed_850hPa", wd: "wind_direction_850hPa" },
          700: { ws: "wind_speed_700hPa", wd: "wind_direction_700hPa" },
          600: { ws: "wind_speed_600hPa", wd: "wind_direction_600hPa" },
          500: { ws: "wind_speed_500hPa", wd: "wind_direction_500hPa" },
          400: { ws: "wind_speed_400hPa", wd: "wind_direction_400hPa" },
          300: { ws: "wind_speed_300hPa", wd: "wind_direction_300hPa" },
          250: { ws: "wind_speed_250hPa", wd: "wind_direction_250hPa" },
          200: { ws: "wind_speed_200hPa", wd: "wind_direction_200hPa" },
          150: { ws: "wind_speed_150hPa", wd: "wind_direction_150hPa" },
          100: { ws: "wind_speed_100hPa", wd: "wind_direction_100hPa" },
        };

        // Stima profilo T e Td interpolando dai dati isobarici
        const tProfile: number[] = [];
        const tdProfile: number[] = [];
        const wsProfile: number[] = [];
        const wdProfile: number[] = [];
        const ccProfile: number[] = [];
        const rhProfile: number[] = [];

        const surfT = getVal("temperature_2m", idx) ?? 20;
        const surfTd = getVal("dew_point_2m", idx) ?? 10;
        const surfWS = getVal("wind_speed_10m", idx) ?? 5;
        const surfWD = getVal("wind_direction_10m", idx) ?? 180;
        const surfCC = getVal("cloud_cover", idx) ?? 20;
        const surfRH = getVal("relative_humidity_2m", idx) ?? 50;

        // Livelli isobbarici disponibili
        const levels = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200, 150, 100];
        const tVals: number[] = [surfT];
        const tdVals: number[] = [surfTd];
        const wsVals: number[] = [surfWS];
        const wdVals: number[] = [surfWD];

        for (let i = 1; i < levels.length; i++) {
          const lk = windKeys[levels[i]];
          if (lk) {
            tVals.push(getVal(`temperature_${levels[i]}hPa`, idx) ?? (surfT - i * 7));
            tdVals.push(getVal(`dew_point_${levels[i]}hPa`, idx) ?? (surfTd - i * 5));
            wsVals.push(getVal(lk.ws, idx) ?? (surfWS + i * 2));
            wdVals.push(getVal(lk.wd, idx) ?? (surfWD + i * 5));
          } else {
            tVals.push(surfT - i * 7);
            tdVals.push(surfTd - i * 5);
            wsVals.push(surfWS + i * 2);
            wdVals.push(surfWD + i * 5);
          }
        }

        // Interpola su PRESSURE_LEVELS (che incl. 1000)
        for (const pl of PRESSURE_LEVELS) {
          // Trova indice nel source
          let srcIdx = levels.findIndex(l => l <= pl.p);
          if (srcIdx <= 0) srcIdx = 0;
          if (srcIdx >= levels.length - 1) srcIdx = levels.length - 2;

          const p1 = levels[srcIdx], p2 = levels[srcIdx + 1];
          const ratio = (p1 === p2) ? 0 : (pl.p - p1) / (p2 - p1);

          tProfile.push(tVals[srcIdx] + ratio * (tVals[srcIdx + 1] - tVals[srcIdx]));
          tdProfile.push(tdVals[srcIdx] + ratio * (tdVals[srcIdx + 1] - tdVals[srcIdx]));
          wsProfile.push(wsVals[srcIdx] + ratio * (wsVals[srcIdx + 1] - wsVals[srcIdx]));
          wdProfile.push(wdVals[srcIdx] + ratio * (wdVals[srcIdx + 1] - wdVals[srcIdx]));
          ccProfile.push(Math.min(100, Math.max(0, surfCC + (srcIdx > 3 ? -srcIdx * 3 : srcIdx * 2))));
          rhProfile.push(Math.min(100, Math.max(0, surfRH - srcIdx * 4)));
        }

        const sounding: SoundingData = {
          pressure: PRESSURE_LEVELS.map(l => l.p),
          temperature: tProfile,
          dewPoint: tdProfile,
          windSpeed: wsProfile,
          windDir: wdProfile,
          cloudCover: ccProfile,
          cloudCoverLow: ccProfile.map((c, i) => i < 3 ? c : c * 0.3),
          cloudCoverMid: ccProfile.map((c, i) => (i >= 2 && i < 6) ? c : c * 0.2),
          cloudCoverHigh: ccProfile.map((c, i) => i >= 5 ? c : c * 0.1),
          rh: rhProfile,
          precipitation: [],
          cape: getVal("cape", idx) ?? 0,
          cin: getVal("convective_inhibition", idx) ?? 0,
          liftedIndex: getVal("lifted_index", idx) ?? 0,
          freezingLevel: getVal("freezing_level_height", idx) ?? 3000,
        };

        setSounding(sounding);
        setLoading(false);
      })
      .catch(err => { if (mounted) { setError(err.message); setLoading(false); } });

    return () => { mounted = false; };
  }, [latitude, longitude, selectedHour, dateStr]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center shadow-2xl">
        <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
        <span className="text-sm text-slate-400">Caricamento diagramma aerologico...</span>
      </div>
    );
  }

  if (error || !sounding) {
    return (
      <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
        <p className="text-sm text-rose-300">Errore: {error || "Nessun dato"}</p>
      </div>
    );
  }

  const n = sounding.pressure.length;

  // Costruisci path temperatura e rugiada
  const tempPath = sounding.pressure.map((p, i) => {
    const x = tToX(sounding.temperature[i], p);
    const y = pToY(p);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const dewPath = sounding.pressure.map((p, i) => {
    const x = tToX(sounding.dewPoint[i], p);
    const y = pToY(p);
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  // Regione umida (area tra temperatura e dewpoint)
  const moistPolygon = sounding.pressure.map((p, i) => {
    const xt = tToX(sounding.temperature[i], p);
    const xd = tToX(sounding.dewPoint[i], p);
    const y = pToY(p);
    return `${xt},${y}`;
  }).concat(
    [...sounding.pressure].reverse().map((p, ri) => {
      const i = n - 1 - ri;
      const xd = tToX(sounding.dewPoint[i], p);
      const y = pToY(p);
      return `${xd},${y}`;
    })
  ).join(" ");

  // Regioni di stabilità (colorate per ogni livello)
  const stabilityRects: { y: number; h: number; color: string }[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p1 = sounding.pressure[i];
    const p2 = sounding.pressure[i + 1];
    const y1 = pToY(p1);
    const y2 = pToY(p2);
    const spread = sounding.temperature[i] - sounding.dewPoint[i];
    const color = getStabilityColor(spread, sounding.rh[i], sounding.cloudCover[i]);
    if (color !== "transparent") {
      stabilityRects.push({ y: Math.min(y1, y2), h: Math.abs(y2 - y1), color });
    }
  }

  // Nuvole e pioggia
  const cloudLayers: { y: number; cx: number; cover: number; isRain: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const cc = sounding.cloudCover[i];
    if (cc > 15) {
      const y = pToY(sounding.pressure[i]);
      const xt = tToX(sounding.temperature[i], sounding.pressure[i]);
      cloudLayers.push({
        y,
        cx: xt - 40,
        cover: cc,
        isRain: cc > 50 && sounding.precipitation?.[i] > 0.3,
      });
    }
  }

  return (
    <div className="bg-white rounded-[28px] p-3 sm:p-6 shadow-2xl border border-slate-200 overflow-hidden select-none">
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[800px]"
          style={{ shapeRendering: "geometricPrecision" }}
        >
          <defs>
            {/* Gradiente per l'umidità */}
            <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.15" />
            </linearGradient>

            {/* Pattern pioggia */}
            <pattern id="rainPattern" width="6" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(15)">
              <line x1="1" y1="0" x2="1" y2="6" stroke="#60a5fa" strokeWidth="1" opacity="0.5" />
              <line x1="4" y1="2" x2="4" y2="8" stroke="#60a5fa" strokeWidth="0.8" opacity="0.35" />
            </pattern>
          </defs>

          {/* === SFONDO BASE === */}
          <rect x={M.left} y={M.top} width={PW} height={PH} fill="#f8fafc" />

          {/* === REGIONI STABILITÀ (masse d'aria) === */}
          {stabilityRects.map((r, i) => (
            <rect key={`stab-${i}`} x={M.left} y={r.y} width={PW} height={r.h} fill={r.color} />
          ))}

          {/* === REGIONE UMIDA (masse umide - blu) === */}
          <polygon points={moistPolygon} fill="url(#moistGrad)" />

          {/* === NUBI (nuvole grigie) === */}
          {cloudLayers.map((cl, i) => {
            const cc = cl.cover;
            const grayVal = Math.max(100, 180 - cc);
            const opacity = Math.min(0.6, cc / 100);
            const cloudColor = `rgb(${grayVal},${grayVal + 10},${grayVal + 20})`;
            return (
              <g key={`cloud-${i}`}>
                {/* Nuvola principale */}
                <ellipse cx={cl.cx} cy={cl.y} rx={45} ry={10} fill={cloudColor} opacity={opacity} />
                <ellipse cx={cl.cx - 20} cy={cl.y - 4} rx={28} ry={8} fill={cloudColor} opacity={opacity * 0.75} />
                <ellipse cx={cl.cx + 20} cy={cl.y - 4} rx={28} ry={8} fill={cloudColor} opacity={opacity * 0.75} />
                <ellipse cx={cl.cx} cy={cl.y - 7} rx={22} ry={7} fill={cloudColor} opacity={opacity * 0.6} />
                {/* Pioggia sotto nuvola */}
                {cl.isRain && (
                  <rect x={cl.cx - 40} y={cl.y + 6} width={80} height={Math.min(30, cc * 0.3)} fill="url(#rainPattern)" opacity="0.4" />
                )}
              </g>
            );
          })}

          {/* === GRIGLIA LIVELLI ISOBARICI === */}
          {PRESSURE_LEVELS.map(lvl => {
            const y = pToY(lvl.p);
            return (
              <g key={`grid-${lvl.p}`}>
                <line x1={M.left} y1={y} x2={M.left + PW} y2={y} stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="3 4" opacity="0.5" />
                {/* Tick sinistro */}
                <line x1={M.left - 5} y1={y} x2={M.left} y2={y} stroke="#94a3b8" strokeWidth="1.2" />
              </g>
            );
          })}

          {/* === GRIGLIA TEMPERATURA (linee isoterme inclinate) === */}
          {[-30, -20, -10, 0, 10, 20, 30, 40].map(t => {
            const points = PRESSURE_LEVELS.map(lvl => {
              const x = tToX(t, lvl.p);
              const y = pToY(lvl.p);
              return `${x},${y}`;
            }).join(" ");
            return (
              <polyline key={`iso-${t}`} points={points} fill="none" stroke="#e2e8f0" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.5" />
            );
          })}

          {/* === LINEA ZERO TERMICO === */}
          {(() => {
            const freezeY = pToY(
              sounding.pressure.find((p, i) =>
                i < sounding.pressure.length - 1 && sounding.temperature[i] >= 0 && sounding.temperature[i + 1] < 0
              ) ?? 500
            );
            if (freezeY > M.top && freezeY < M.top + PH) {
              return (
                <g>
                  <line x1={M.left} y1={freezeY} x2={M.left + PW} y2={freezeY} stroke="#0ea5e9" strokeWidth="2" strokeDasharray="8 4" opacity="0.7" />
                  {/* Icona fiocco */}
                  <circle cx={M.left + PW - 20} cy={freezeY} r="8" fill="white" stroke="#0ea5e9" strokeWidth="1.5" />
                  <text x={M.left + PW - 20} y={freezeY + 3.5} fill="#0ea5e9" fontSize="10" fontWeight="900" textAnchor="middle">❄</text>
                </g>
              );
            }
            return null;
          })()}

          {/* === PROFILI TEMPERATURA E RUGIADA === */}
          <path d={dewPath} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={tempPath} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Punti temperatura */}
          {sounding.pressure.map((p, i) => {
            const x = tToX(sounding.temperature[i], p);
            const y = pToY(p);
            return <circle key={`tp-${i}`} cx={x} cy={y} r="4.5" fill="#ef4444" stroke="#fff" strokeWidth="2" />;
          })}

          {/* Punti dewpoint */}
          {sounding.pressure.map((p, i) => {
            const x = tToX(sounding.dewPoint[i], p);
            const y = pToY(p);
            return <circle key={`dp-${i}`} cx={x} cy={y} r="4.5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />;
          })}

          {/* === BARBETTE VENTO === */}
          {sounding.pressure.map((p, i) => {
            const x = M.left + PW + 35;
            const y = pToY(p);
            return (
              <g key={`wb-${i}`}>
                {renderWindBarb(x, y, sounding.windSpeed[i], sounding.windDir[i])}
              </g>
            );
          })}

          {/* === ETICHETTE QUOTA (destra) === */}
          {PRESSURE_LEVELS.filter(l => [1000, 850, 700, 500, 300, 200].includes(l.p)).map(l => {
            const y = pToY(l.p);
            return (
              <text key={`alt-${l.p}`} x={M.left + PW + 8} y={y + 4} fill="#94a3b8" fontSize="10" fontWeight="600" fontFamily="monospace">
                {(l.alt / 1000).toFixed(1)}km
              </text>
            );
          })}

          {/* === BORDO === */}
          <rect x={M.left} y={M.top} width={PW} height={PH} fill="none" stroke="#475569" strokeWidth="1.5" />

        </svg>
      </div>

      {/* === LEGENDA MINIMALE === */}
      <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-x-5 gap-y-1.5 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500/60"></span>
          <span className="text-[10px] text-slate-500 font-medium">Stabile</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500/50"></span>
          <span className="text-[10px] text-slate-500 font-medium">Umidità</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-400/50"></span>
          <span className="text-[10px] text-slate-500 font-medium">Nuvole</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-red-500 rounded"></span>
          <span className="text-[10px] text-slate-500 font-medium">Temperatura</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-blue-500 rounded"></span>
          <span className="text-[10px] text-slate-500 font-medium">Rugiada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-sky-500 rounded border-dashed border-t-2 border-sky-500"></span>
          <span className="text-[10px] text-slate-500 font-medium">0°C</span>
        </div>
      </div>
    </div>
  );
}