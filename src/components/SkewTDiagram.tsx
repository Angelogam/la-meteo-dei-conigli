"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface SkewTDiagramProps {
  latitude: number;
  longitude: number;
  siteAltitude: number;
  siteName: string;
  selectedHour?: number;
  selectedDay?: number;
}

const W = 960;
const H = 620;
const M = { top: 80, right: 80, bottom: 70, left: 80 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

const P_BOTTOM = 1050;
const P_TOP = 100;
const T_MIN = -40;
const T_MAX = 45;
const SKEW_DEG = 35;

const PRESSURE_LEVELS = [
  { p: 500, alt: 5800 },
  { p: 550, alt: 5000 },
  { p: 600, alt: 4400 },
  { p: 650, alt: 3750 },
  { p: 700, alt: 3100 },
  { p: 750, alt: 2500 },
  { p: 800, alt: 1950 },
  { p: 850, alt: 1450 },
  { p: 925, alt: 750 },
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
  return M.left + normT * PW + skew + PW * 0.04;
}

function pressureToAlt(p: number): number {
  if (p >= 1013.25) return 0;
  return 44330 * (1 - Math.pow(p / 1013.25, 0.190284));
}

function daysUntilNextSaturday(): number {
  const today = new Date();
  const day = today.getDay();
  let days = (6 - day + 7) % 7;
  if (days === 0) days = 7;
  return days;
}

function renderWindBarb(x: number, y: number, speedKmh: number, dirDeg: number): React.ReactNode {
  if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
  const knots = speedKmh * 0.539957;
  const angle = ((dirDeg - 90) * Math.PI) / 180;
  const staffLen = 20;
  const endX = x + staffLen * Math.cos(angle);
  const endY = y + staffLen * Math.sin(angle);
  const barbColor = speedKmh > 30 ? "#d946ef" : speedKmh > 18 ? "#0284c7" : "#3b82f6";
  const barbAngle = angle + (115 * Math.PI) / 180;

  const elems: React.ReactNode[] = [];
  let rem = Math.round(knots / 5) * 5;
  let pos = 1.0;

  while (rem >= 50 && pos >= 0.3) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    elems.push(
      <polygon key={`p50-${pos.toFixed(2)}`} points={`${bx},${by} ${bx + 10 * Math.cos(barbAngle)},${by + 10 * Math.sin(barbAngle)} ${bx + 5 * Math.cos(angle)},${by + 5 * Math.sin(angle)}`} fill={barbColor} stroke={barbColor} strokeWidth="1" />
    );
    rem -= 50; pos -= 0.28;
  }
  while (rem >= 10 && pos >= 0.2) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    elems.push(
      <line key={`l10-${pos.toFixed(2)}`} x1={bx} y1={by} x2={bx + 9 * Math.cos(barbAngle)} y2={by + 9 * Math.sin(barbAngle)} stroke={barbColor} strokeWidth="1.5" strokeLinecap="round" />
    );
    rem -= 10; pos -= 0.18;
  }
  if (rem >= 5 && pos >= 0.2) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    elems.push(
      <line key={`l5-${pos.toFixed(2)}`} x1={bx} y1={by} x2={bx + 5 * Math.cos(barbAngle)} y2={by + 5 * Math.sin(barbAngle)} stroke={barbColor} strokeWidth="1.5" strokeLinecap="round" />
    );
  }

  return (
    <g>
      <line x1={x} y1={y} x2={endX} y2={endY} stroke={barbColor} strokeWidth="1.5" strokeLinecap="round" />
      {elems}
    </g>
  );
}

export default function SkewTDiagram({
  latitude, longitude, siteAltitude, siteName,
  selectedHour = 12, selectedDay = 0,
}: SkewTDiagramProps) {
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

    const hourlyParams = [
      "temperature_2m", "relative_humidity_2m", "dew_point_2m",
      "cloud_cover", "cloud_cover_low", "cloud_cover_mid", "cloud_cover_high",
      "wind_speed_10m", "wind_direction_10m",
      "wind_speed_80m", "wind_direction_80m",
      "wind_speed_120m", "wind_direction_120m",
      "wind_speed_925hPa", "wind_direction_925hPa",
      "wind_speed_850hPa", "wind_direction_850hPa",
      "wind_speed_700hPa", "wind_direction_700hPa",
      "wind_speed_600hPa", "wind_direction_600hPa",
      "wind_speed_500hPa", "wind_direction_500hPa",
      "temperature_80m", "temperature_120m",
      "surface_pressure", "shortwave_radiation",
      "freezing_level_height", "cape", "lifted_index",
    ].join(",");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=${hourlyParams}&timezone=Europe/Rome&start_date=${dateStr}&end_date=${dateStr}`;

    async function fetchMeteo() {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (isMounted) { setData(json); setLoading(false); }
      } catch (err) {
        if (isMounted) { setError(err instanceof Error ? err.message : "Errore dati"); setLoading(false); }
      }
    }

    fetchMeteo();
    return () => { isMounted = false; };
  }, [latitude, longitude, dateStr]);

  // Dati per l'ora selezionata (o 12:00 se non disponibile)
  const soundingData = useMemo(() => {
    if (!data?.hourly?.time) return null;
    const h = data.hourly;
    const times = h.time;
    // Usa l'ora selezionata o 12
    const targetH = selectedHour >= 6 && selectedHour <= 21 ? selectedHour : 12;
    const idx = times.findIndex((t: string) => parseInt(t.split("T")[1].split(":")[0], 10) === targetH);
    if (idx < 0) return null;

    const t = h.temperature_2m[idx] ?? 18;
    const dew = h.dew_point_2m[idx] ?? (t - 8);
    const wind10 = h.wind_speed_10m?.[idx] ?? 7;
    const windDir10 = h.wind_direction_10m?.[idx] ?? 180;
    const t80 = h.temperature_80m?.[idx];
    const t120 = h.temperature_120m?.[idx];
    const surfacePressure = h.surface_pressure?.[idx] ?? 1013;

    // Costruisci profilo verticale
    const levels: { p: number; alt: number; t: number; td: number; ws: number; wd: number }[] = [];

    // Livello suolo
    levels.push({ p: surfacePressure, alt: siteAltitude, t, td: dew, ws: wind10, wd: windDir10 });

    // Livelli isobarici con temperature
    const hpaLevels = [925, 850, 700, 600, 500];
    hpaLevels.forEach(p => {
      const tKey = `temperature_${p}hPa`;
      const wsKey = `wind_speed_${p}hPa`;
      const wdKey = `wind_direction_${p}hPa`;
      const tVal = h[tKey]?.[idx];
      if (tVal != null && !isNaN(tVal)) {
        const alt = pressureToAlt(p);
        levels.push({
          p, alt, t: tVal,
          td: tVal - 5, // stima punto di rugiada
          ws: h[wsKey]?.[idx] ?? wind10 * (p < 850 ? 2 : 1.3),
          wd: h[wdKey]?.[idx] ?? windDir10,
        });
      }
    });

    // Interpola temperature 80m e 120m nel profilo
    if (t80 != null) {
      const insertIdx = levels.findIndex(l => l.alt >= 80);
      if (insertIdx > 0) {
        levels.splice(insertIdx, 0, { p: 1000, alt: 80, t: t80, td: t80 - 4, ws: h.wind_speed_80m?.[idx] ?? wind10 * 1.1, wd: h.wind_direction_80m?.[idx] ?? windDir10 });
      }
    }
    if (t120 != null) {
      const insertIdx = levels.findIndex(l => l.alt >= 120);
      if (insertIdx > 0) {
        levels.splice(insertIdx, 0, { p: 988, alt: 120, t: t120, td: t120 - 4, ws: h.wind_speed_120m?.[idx] ?? wind10 * 1.2, wd: h.wind_direction_120m?.[idx] ?? windDir10 });
      }
    }

    levels.sort((a, b) => a.alt - b.alt);
    return { levels, wind10, windDir10, cape: h.cape?.[idx] ?? 0, cloudPct: h.cloud_cover?.[idx] ?? 0, precip: h.precipitation?.[idx] ?? 0 };
  }, [data, siteAltitude, selectedHour]);

  // Path isoterme (dry adiabatic)
  const dryAdiabatPaths = useMemo(() => {
    if (!soundingData) return [];
    const paths: { t0: number; d: string }[] = [];
    for (let t0 = -20; t0 <= 30; t0 += 10) {
      let d = "";
      soundingData.levels.forEach((lvl, i) => {
        const t = t0 + (lvl.alt - siteAltitude) * 0.0098; // gradiente adiabatico secco
        const x = tToX(t, lvl.p);
        const y = pToY(lvl.p);
        d += `${i === 0 ? "M" : "L"} ${x} ${y} `;
      });
      paths.push({ t0, d });
    }
    return paths;
  }, [soundingData, siteAltitude]);

  // Path saturado adiabatic (approssimato)
  const satAdiabatPath = useMemo(() => {
    if (!soundingData) return "";
    let d = "";
    soundingData.levels.forEach((lvl, i) => {
      // Approssimazione: tasso adiabatico saturo ~0.006 K/m
      const t = lvl.td + (lvl.alt - siteAltitude) * 0.006;
      const x = tToX(t, lvl.p);
      const y = pToY(lvl.p);
      d += `${i === 0 ? "M" : "L"} ${x} ${y} `;
    });
    return d;
  }, [soundingData, siteAltitude]);

  // Temp e dewpoint profile paths
  const tempPath = useMemo(() => {
    if (!soundingData) return "";
    return soundingData.levels.map((lvl, i) => {
      const x = tToX(lvl.t, lvl.p);
      const y = pToY(lvl.p);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  }, [soundingData]);

  const dewPath = useMemo(() => {
    if (!soundingData) return "";
    return soundingData.levels.map((lvl, i) => {
      const x = tToX(lvl.td, lvl.p);
      const y = pToY(lvl.p);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  }, [soundingData]);

  // Wind barbs along the pressure axis
  const windBarbs = useMemo(() => {
    if (!soundingData) return [];
    return soundingData.levels.map(lvl => ({
      x: tToX(lvl.t, lvl.p),
      y: pToY(lvl.p),
      speed: lvl.ws,
      dir: lvl.wd,
    }));
  }, [soundingData]);

  const dateInfo = useMemo(() => {
    const d = new Date(dateStr + "T00:00:00");
    const giorni = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
    const mesi = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
    return { giorno: giorni[d.getDay()], data: d.getDate(), mese: mesi[d.getMonth()] };
  }, [dateStr]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[350px] text-slate-300 shadow-2xl">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
        <span className="text-base font-bold text-white">Caricamento Skew-T…</span>
        <span className="text-xs text-slate-400 mt-1">{siteName} · {dateStr}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl p-5 text-center text-rose-300">
        <AlertTriangle className="w-7 h-7 mx-auto mb-2 text-rose-400" />
        <p className="font-bold text-white text-sm">Impossibile caricare i dati</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl">
      {/* Titolo */}
      <div className="text-center pb-2">
        <h2 className="text-base sm:text-lg font-black text-white tracking-tight lowercase">
          {siteName.toLowerCase()} · Skew-T · {dateInfo.giorno} {dateInfo.data} {dateInfo.mese}
        </h2>
        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
          {dateStr} · {siteAltitude}m SRTM · Ora {String(selectedHour).padStart(2, "0")}:00
        </p>
      </div>

      {/* SVG */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <defs>
          <clipPath id="skew-clip">
            <rect x={M.left} y={M.top} width={PW} height={PH} />
          </clipPath>
          {/* Gradiente zona instabile (tra T e Td) */}
          <linearGradient id="instable-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#f97316" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* ─── SFONDO ─── */}
        <rect x={M.left} y={M.top} width={PW} height={PH} fill="#0f172a" />

        {/* ─── GRIGLIA PRESSIONE (orizzontale) ─── */}
        {PRESSURE_LEVELS.map(lv => (
          <g key={`p-${lv.p}`}>
            <line x1={M.left} y1={pToY(lv.p)} x2={M.left + PW} y2={pToY(lv.p)} stroke="#1e293b" strokeWidth={0.8} />
            <text x={M.left - 6} y={pToY(lv.p) + 4} textAnchor="end" fontSize={9} fontWeight={700} fill="#475569" fontFamily="ui-monospace, monospace">{lv.p}</text>
            <text x={M.left + PW + 5} y={pToY(lv.p) + 4} textAnchor="start" fontSize={9} fontWeight={700} fill="#475569" fontFamily="ui-monospace, monospace">{lv.alt}m</text>
          </g>
        ))}

        {/* ─── ISOTERME (dry adiabats) ─── */}
        {dryAdiabatPaths.map(({ t0, d }) => (
          <path key={`da-${t0}`} d={d} fill="none" stroke="#1e3a5f" strokeWidth={0.8} opacity={0.7} />
        ))}

        {/* ─── SATURI ADIABATIC ─── */}
        {satAdiabatPath && (
          <path d={satAdiabatPath} fill="none" stroke="#1e3a5f" strokeWidth={0.8} strokeDasharray="3 2" opacity={0.5} />
        )}

        {/* ─── ZONA INSTABILE (tra T e Td) ─── */}
        {soundingData && (
          <g clipPath="url(#skew-clip)">
            {(() => {
              let d = "";
              soundingData.levels.forEach((lvl, i) => {
                const tx = tToX(lvl.t, lvl.p);
                const ty = pToY(lvl.p);
                d += `${i === 0 ? "M" : "L"} ${tx} ${ty} `;
              });
              // Ritorno lungo Td
              soundingData.levels.slice().reverse().forEach((lvl, i) => {
                const dx = tToX(lvl.td, lvl.p);
                const dy = pToY(lvl.p);
                d += `L ${dx} ${dy} `;
              });
              return <path d={d} fill="url(#instable-grad)" />;
            })()}
          </g>
        )}

        {/* ─── CURVA TEMPERATURA (rosso) ─── */}
        {tempPath && (
          <path d={tempPath} fill="none" stroke="#ef4444" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* ─── CURVA PUNTO DI ROGIA (verde) ─── */}
        {dewPath && (
          <path d={dewPath} fill="none" stroke="#22c55e" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* ─── BARBETTE VENTO ─── */}
        {windBarbs.map((wb, i) => (
          <g key={`wb-${i}`} transform={`translate(${wb.x}, ${wb.y})`}>
            {renderWindBarb(0, 0, wb.speed, wb.dir)}
          </g>
        ))}

        {/* ─── BORDO PLOT ─── */}
        <rect x={M.left} y={M.top} width={PW} height={PH} fill="none" stroke="#334155" strokeWidth={1.2} />

        {/* ─── ETICHETTE TEMP SUP ─── */}
        <text x={M.left} y={M.top - 8} fontSize={9} fontWeight={700} fill="#64748b" fontFamily="ui-monospace, monospace">TEMPERATURA (°C)</text>
        {[0, 10, 20, 30].map(t => {
          const lvl = soundingData?.levels?.[0];
          if (!lvl) return null;
          const x = tToX(t, lvl.p);
          return (
            <text key={`tl-${t}`} x={x} y={M.top - 20} textAnchor="middle" fontSize={9} fontWeight={600} fill="#ef4444" fontFamily="ui-monospace, monospace">{t}°</text>
          );
        })}

        {/* ─── LEGENDA ─── */}
        <g transform={`translate(${M.left + 10}, ${H - 36})`}>
          {/* Temp */}
          <line x1={0} y1={0} x2={20} y2={0} stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />
          <text x={24} y={4} fontSize={9} fontWeight={600} fill="#94a3b8" fontFamily="ui-monospace, monospace">Temperatura</text>
          {/* Dew */}
          <line x1={100} y1={0} x2={120} y2={0} stroke="#22c55e" strokeWidth={2} strokeLinecap="round" />
          <text x={124} y={4} fontSize={9} fontWeight={600} fill="#94a3b8" fontFamily="ui-monospace, monospace">Punto di rugiada</text>
          {/* Instabile */}
          <rect x={230} y={-5} width={12} height={10} fill="#f97316" opacity={0.5} />
          <text x={246} y={4} fontSize={9} fontWeight={600} fill="#94a3b8" fontFamily="ui-monospace, monospace">Zona instabile</text>
        </g>

        {/* ─── FONTE ─── */}
        <text x={W / 2} y={H - 6} textAnchor="middle" fontSize={8.5} fontWeight={500} fill="#475569" fontFamily="ui-monospace, monospace">Fonte: Open-Meteo · Skew-T log-P diagram</text>
      </svg>
    </div>
  );
}
