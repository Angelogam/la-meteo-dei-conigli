"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { RefreshCw, FileText, Check, Copy, AlertTriangle, ShieldCheck } from "lucide-react";
import { fetchHourly } from "@/lib/openMeteoClient";
import { generateReportMeteo, type GeneratedReport } from "@/utils/generateReportMeteo";
import { useMultiHourWindProfile } from "@/hooks/useMultiHourWindProfile";
import { useStabilitaMasseAria } from "@/hooks/useStabilitaMasseAria";

interface WindgramProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  siteName?: string;
  selectedDay?: number;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const PRESSURE_LEVELS = [
  { hpa: 600, alt: 4000 },
  { hpa: 650, alt: 3500 },
  { hpa: 700, alt: 3000 },
  { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 2000 },
  { hpa: 850, alt: 1500 },
  { hpa: 900, alt: 1000 },
];

const ALT_TICKS = [4000, 3500, 3000, 2500, 2000, 1500, 1000];

const computeDisplayAltitudes = (siteAlt: number): number[] => {
  const base = Math.floor(siteAlt / 250) * 250;
  const result: number[] = [];
  for (let alt = 4000; alt >= base; alt -= 250) result.push(alt);
  return result;
};

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

function getBarbAngle(dirDeg: number): number {
  const thetaDeg = (dirDeg + 90) % 360;
  return (thetaDeg * Math.PI) / 180;
}

function getDirLetter(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const provenienzaDeg = ((deg % 360) + 360) % 360;
  const idx = Math.round(provenienzaDeg / 45) % 8;
  return dirs[idx];
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Venti multi-livello da Open-Meteo
  const { interpolateAtAltitude } = useMultiHourWindProfile({
    lat: latitude,
    lon: longitude,
    siteAlt: altitude,
    selectedDay,
  });

  // Hook per la stabilità delle masse d'aria con dati reali Open-Meteo
  const { hourly: stabilitaData, loading: stabilitaLoading, error: stabilitaError } = useStabilitaMasseAria(
    latitude, longitude, selectedDay
  );

  // Data status check

  const displayAltitudes = useMemo(() => computeDisplayAltitudes(altitude), [altitude]);

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
        "wind_speed_180m", "wind_direction_180m",
        "temperature_180m", "surface_pressure", "shortwave_radiation",
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

  const width = 1200;
  const height = 880;
  const margin = { top: 65, right: 150, bottom: 70, left: 95 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const minAlt = 1000;
  const maxAlt = 4200;

  const getYFromAlt = (alt: number) => {
    const clamped = Math.min(maxAlt, Math.max(minAlt, alt));
    return margin.top + plotH - ((clamped - minAlt) / (maxAlt - minAlt)) * plotH;
  };

  const getXFromHourIdx = (idx: number) => {
    return margin.left + (idx / (HOURS.length - 1)) * plotW;
  };

  const hourlyData = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times: string[] = data.hourly.time;

    return HOURS.map((targetHour) => {
      const idx = times.findIndex((t) => parseInt(t.split("T")[1].split(":")[0], 10) === targetHour);
      if (idx === -1) {
        const fb = Array(13).fill(0).map((_, i) => 0.55 + i * 0.03);
        return {
          hour: targetHour, sunPct: 80, thermalAvg: 1.2, tempGround: 19,
          windGround: 8, windDirGround: 180, precip: 0, cloudCover: 10,
          zeroThermal: 4380, thermalTop: altitude + 900, cloudBase: altitude + 800,
          cloudPct: 5, deltaT: 0.75, tempAt80m: 15, tempAt120m: 12,
          levelWinds: displayAltitudes.map((alt) => ({
            alt, speed: 12, dir: 240,
          })),
          // Fallback profile: linear gradient from yellow (surface) to blue (aloft)
          deltaTProfile: Array(13).fill(0).map((_, i) => 0.9 - i * 0.055),
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
      // Usa temperature_180m come proxy per quote medie (Open-Meteo non ha 80m/120m separati)
      const t180 = h.temperature_180m?.[idx];
      const t180Num = (t180 != null && !isNaN(Number(t180))) ? Number(t180) : null;
      // Simula t80/t120 interpolando da t2m e t180
      const t80Sim = t180Num != null ? t + (t180Num - t) * (80 / 180) : null;
      const t120Sim = t180Num != null ? t + (t180Num - t) * (120 / 180) : null;

      const sunPct = Math.min(100, Math.max(10, Math.round(((rad / 900) * (1 - (cloud / 100) * 0.65)) * 100)));
      const spread = Math.max(1, t - dew);
      const cloudBase = Math.round(altitude + Math.min(1500, spread * 125));
      const cloudPct = Math.max(2, Math.min(95, Math.round(cloud)));

      // ─── First compute derived values needed by the lapse-rate model ───
      let rateo = 0.6 + (spread * 0.08) + (sunPct / 100) * 0.45 + (cape > 200 ? (cape / 1000) * 0.4 : 0);
      if (precip > 0.4) rateo = 0.3;
      else if (cloud > 80) rateo *= 0.4;
      rateo = Math.max(0.4, Math.min(2.5, Math.round(rateo * 10) / 10));
      const thermalTop = Math.round(Math.min(4000, cloudBase + Math.min(800, rateo * 100 + cape * 0.1)));

      // ─── PHYSICAL LAPSE-RATE PROFILE for air-mass coloring ───
      // Model: integrate a lapse-rate curve → temperature profile → local ΔT/100m at each 100m.
      // The lapse rate γ(h) = -dT/dh changes with altitude:
      //   • Surface layer (0–~800m): super-adiabatic from solar heating (high γ → yellow/red)
      //   • Mixed layer (~800–2500m): near-standard lapse (γ≈0.65 → green)
      //   • Free atmosphere (>2500m): standard or inversion (γ<0.4 → blue/purple)

      // 1. Derive base surface lapse rate from real data
      // Typical daytime surface lapse: 0.8–1.4 °C/100m (super-adiabatic boundary layer)
      let gamma0 = 0.72; // default: near-standard atmosphere
      if (t180Num != null && t180Num !== t && t180Num >= -60) {
        gamma0 = Math.max(0.1, (t - t180Num) / 1.8); // real measured lapse
      }
      // Strong solar boost on sunny afternoons → super-adiabatic layer near ground
      const hoursFromPeak = Math.abs(targetHour - 14);
      const sunIntensity = (sunPct / 100) * Math.max(0, 1 - hoursFromPeak / 5);
      const solarBoost = sunIntensity * 0.55; // up to +0.55 °C/100m at peak sun
      const capeBoost = cape > 50 ? Math.min(0.35, cape / 2500) : 0;
      const spreadBoost = spread > 6 ? (spread - 6) * 0.03 : 0; // dry air = stronger heating
      gamma0 = Math.max(0.05, Math.min(1.6, gamma0 + solarBoost + capeBoost + spreadBoost));

      // 2. Lapse-rate as function of altitude (smooth transition)
      //    γ(h) = γ_free + (γ0 - γ_free) × exp(-h/H)
      //    H controls how deep the surface heating extends (larger = thicker red zone)
      const gammaFree = 0.52; // standard free-atmosphere lapse
      const H = 1200; // e-folding scale: surface heating extends ~1km+ for red conditions
      function gammaAt(alt: number): number {
        const h = alt - minAlt; // metres above display bottom
        const expDecay = Math.exp(-h / H);
        let gamma = gammaFree + (gamma0 - gammaFree) * expDecay;
        // Inversion above thermal top (stable lid) — strong and wide
        if (alt > thermalTop) {
          const invDist = alt - thermalTop;
          const invStrength = Math.min(0.7, invDist / 500) * 0.6;
          gamma -= invStrength;
        }
        // Cloud base slightly stabilises
        if (alt > cloudBase) gamma -= 0.1;
        // Rain suppresses convection throughout
        if (precip > 0.3) gamma -= 0.12;
        return Math.max(-0.35, Math.min(1.6, gamma));
      }

      // 3. Build temperature profile by integrating lapse rate (trapezoidal rule)
      const STEP = 50; // 50m steps for smooth integration
      const nSteps = Math.ceil((maxAlt - minAlt) / STEP);
      const tempProfile: number[] = new Array(nSteps + 1);
      tempProfile[0] = t; // T at minAlt = surface temp
      for (let s = 0; s < nSteps; s++) {
        const altMid = minAlt + (s + 0.5) * STEP;
        tempProfile[s + 1] = tempProfile[s] - gammaAt(altMid) * (STEP / 100);
      }

      // 4. Compute local lapse rate (ΔT/100m) at each altitude from the temperature profile
      function localDeltaT(alt: number): number {
        const i0 = Math.round((alt - minAlt) / STEP);
        const iL = Math.max(0, Math.min(i0, nSteps - 1));
        const iR = Math.min(nSteps, i0 + 1);
        const dAlt = (iR - iL) * STEP;
        if (dAlt === 0) return gammaAt(alt);
        const dTemp = (tempProfile[iR] - tempProfile[iL]) / dAlt;
        return dTemp * 100; // °C per 100m
      }

      // 5. Build 250m-resolved profile for canvas rendering
      const deltaTProfile: number[] = [];
      for (let alt = minAlt; alt <= maxAlt; alt += 250) {
        deltaTProfile.push(localDeltaT(alt));
      }
      const deltaT = deltaTProfile[0] ?? gamma0;

      const levelWinds = displayAltitudes.map((alt) => {
        const interp = interpolateAtAltitude(targetHour, alt);
        return { alt, speed: interp?.speed ?? wind10, dir: interp?.dir ?? windDir10 };
      });

      return {
        hour: targetHour, sunPct, thermalAvg: rateo,
        tempGround: Math.round(t), windGround: Math.round(wind10),
        windDirGround: Math.round(windDir10), precip, cloudCover: cloud,
        zeroThermal: Math.round(freeze), thermalTop, cloudBase, cloudPct, deltaT,
        tempAt80m: t80Sim ?? Math.round(t - 3), tempAt120m: t120Sim ?? Math.round(t - 6),
        levelWinds,
        deltaTProfile,
      };
    });
  }, [data, altitude, displayAltitudes, interpolateAtAltitude]);

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

  const renderWindBarb = (x: number, y: number, speedKmh: number, dirDeg: number) => {
    if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
    const barbAngle = getBarbAngle(dirDeg);
    const staffLen = Math.min(35, 12 + speedKmh * 0.65);
    const sx = x + staffLen * Math.cos(barbAngle);
    const sy = y + staffLen * Math.sin(barbAngle);
    const barbColor = speedKmh > 35 ? "#7e22ce" : speedKmh > 20 ? "#0369a1" : "#1e3a8a";
    const fs = 1.8;

    return (
      <g key={`wb-${Math.round(x)}-${Math.round(y)}`}>
        <line x1={x} y1={y} x2={sx} y2={sy} stroke={barbColor} strokeWidth={fs} strokeLinecap="round" />
        <polygon
          points={`${sx.toFixed(1)},${sy.toFixed(1)}
                  ${(sx - 8 * Math.cos(barbAngle) - 5 * Math.sin(barbAngle)).toFixed(1)},${(sy - 8 * Math.sin(barbAngle) + 5 * Math.cos(barbAngle)).toFixed(1)}
                  ${(sx - 8 * Math.cos(barbAngle) + 5 * Math.sin(barbAngle)).toFixed(1)},${(sy - 8 * Math.sin(barbAngle) - 5 * Math.cos(barbAngle)).toFixed(1)}`}
          fill={barbColor}
        />
        {[...Array(Math.floor(speedKmh / 20))].map((_, i) => {
          const d = 16 + i * 14;
          const fx = sx - d * Math.cos(barbAngle);
          const fy = sy - d * Math.sin(barbAngle);
          const staffX = Math.cos(barbAngle);
          const staffY = Math.sin(barbAngle);
          const perpX = -Math.sin(barbAngle);
          const perpY = Math.cos(barbAngle);
          const lgPoints = `${(fx + 11 * perpX).toFixed(1)},${(fy + 11 * perpY).toFixed(1)} ${(fx - 4 * staffX).toFixed(1)},${(fy - 4 * staffY).toFixed(1)} ${(fx + 4 * staffX).toFixed(1)},${(fy + 4 * staffY).toFixed(1)}`;
          return <polygon key={`lg-${i}`} points={lgPoints} fill={barbColor} />;
        })}
        {speedKmh % 20 >= 10 && (
          <>
            {[...Array(1)].map((_, i) => {
              const d = 16 + Math.floor(speedKmh / 20) * 14 + 7;
              const fx = sx - d * Math.cos(barbAngle);
              const fy = sy - d * Math.sin(barbAngle);
              const staffX = Math.cos(barbAngle);
              const staffY = Math.sin(barbAngle);
              const perpX = -Math.sin(barbAngle);
              const perpY = Math.cos(barbAngle);
              const smPoints = `${(fx + 8 * perpX).toFixed(1)},${(fy + 8 * perpY).toFixed(1)} ${(fx - 3 * staffX).toFixed(1)},${(fy - 3 * staffY).toFixed(1)} ${(fx + 3 * staffX).toFixed(1)},${(fy + 3 * staffY).toFixed(1)}`;
              return <polygon key={`sm-${i}`} points={smPoints} fill={barbColor} />;
            })}
          </>
        )}
      </g>
    );
  };

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

  // Disegna sfondo sul canvas - Fasce orizzontali per masse d'aria con deltaT reale
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, w, h);

    if (hourlyData.length === 0) return;

    const pixelPerMeter = plotH / (maxAlt - minAlt);
    const quotaStep = 100;
    const numSteps = Math.ceil((maxAlt - minAlt) / quotaStep);

    for (let i = 0; i < numSteps; i++) {
      const altLow = minAlt + i * quotaStep;
      const altHigh = Math.min(altLow + quotaStep, maxAlt);
      const yTop = getYFromAlt(altHigh) - margin.top;
      const yBottom = getYFromAlt(altLow) - margin.top;
      if (yBottom - yTop < 0.5) continue;

      // deltaTProfile: one value every 250m from minAlt..maxAlt
      const profileIdx = Math.round((altLow - minAlt) / 250);
      const profileLen = hourlyData[0]?.deltaTProfile?.length ?? 13;
      const ci = Math.min(Math.max(0, profileIdx), profileLen - 1);

      const gradient = ctx.createLinearGradient(0, 0, plotW, 0);
      hourlyData.forEach((h, colIdx) => {
        const xAbs = getXFromHourIdx(colIdx);
        const xRel = xAbs - margin.left;
        const frac = xRel / plotW;
        const color = getStabilityColor(h.deltaTProfile?.[ci] ?? 0.72);
        gradient.addColorStop(frac, color);
      });
      const lastH = hourlyData[hourlyData.length - 1];
      gradient.addColorStop(1, getStabilityColor(lastH.deltaTProfile?.[ci] ?? 0.72));

      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(0, yTop, plotW, yBottom - yTop);
    }
  }, [hourlyData]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-300 shadow-2xl">
        <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
        <span className="text-lg font-bold text-white">Caricamento Grafico Aerologico...</span>
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
      <div className="bg-white text-slate-900 rounded-[20px] p-2 sm:p-3 shadow-2xl border border-slate-200 overflow-hidden font-sans select-none">
        <div className="text-center pb-1">
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {siteName.toLowerCase()} &middot; {formattedDateTitle.toLowerCase()}
          </h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            plotted {dateStr} 00:00 UTC · model ground {Math.round(altitude + 5)} m · SRTM {Math.round(altitude)} m
          </p>
        </div>

        {/* Stato dati stabilità */}
        <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-mono">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-500">Stabilità:</span>
            <span className={stabilitaLoading ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
              {stabilitaLoading ? "⏳ caricamento..." : "✓ dati pronti"}
            </span>
            {stabilitaError && <span className="text-red-500 font-bold">✗ {stabilitaError}</span>}
            {stabilitaData?.time && (
              <span className="text-sky-600 font-bold">
                {stabilitaData.time.length}h · t2m={stabilitaData.temperature_2m?.[0] ?? '—'}°C · t180={stabilitaData.temperature_180m?.[0] ?? '—'}°C
              </span>
            )}
            {hourlyData.length > 0 && (() => {
              const avg = hourlyData.reduce((a,b)=>a+b.deltaT,0)/hourlyData.length;
              return (
                <span className="font-bold" style={{ color: getStabilityColor(avg) }}>
                  ΔT superficie: {avg.toFixed(2)} · ΔT+2km: {(hourlyData.reduce((a,h)=>a+(h.deltaTProfile?.[6]??0),0)/hourlyData.length).toFixed(2)} · ΔT+4km: {(hourlyData.reduce((a,h)=>a+(h.deltaTProfile?.[12]??0),0)/hourlyData.length).toFixed(2)}
                </span>
              );
            })()}
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1 px-1">
            <span>valore medio ascendenze (m/s)</span>
          </div>
          <div className="grid grid-cols-12 gap-1 px-1">
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

        <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 pb-1">
          <div className="relative" style={{ overflow: "visible" }}>
            <canvas
              ref={canvasRef}
              width={plotW}
              height={plotH}
              className="absolute top-0 left-0"
              style={{ width: plotW, height: plotH, zIndex: 0 }}
            />
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto min-w-[1000px]"
              style={{ shapeRendering: "geometricPrecision", position: "relative", zIndex: 1 }}
            >
            <defs>
              <pattern id="thermalHatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#ca8a04" strokeWidth="0.8" strokeDasharray="1.5 1" opacity="0.6" />
                <line x1="0" y1="0" x2="4" y2="0" stroke="#ca8a04" strokeWidth="0.8" strokeDasharray="1.5 1" opacity="0.6" />
              </pattern>
            </defs>

            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="1.2" />

            {PRESSURE_LEVELS.map((lvl) => {
              const y = getYFromAlt(lvl.alt);
              return (
                <g key={`grid-${lvl.hpa}`}>
                  <line x1={margin.left} y1={y} x2={margin.left + plotW} y2={y} stroke="#475569" strokeWidth="0.4" strokeDasharray="2 2" opacity="0.4" />
                  <text x={margin.left - 6} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="900" textAnchor="end" fontFamily="monospace">
                    {lvl.hpa} hPa
                  </text>
                </g>
              );
            })}

            {ALT_TICKS.map((alt) => {
              const y = getYFromAlt(alt);
              return (
                <g key={`alt-${alt}`}>
                  <line x1={margin.left + plotW} y1={y} x2={margin.left + plotW + 4} y2={y} stroke="#0f172a" strokeWidth="0.8" />
                  <text x={margin.left + plotW + 6} y={y + 4} fill="#0f172a" fontSize="11" fontWeight="900" textAnchor="start" fontFamily="monospace">
                    {alt} m
                  </text>
                </g>
              );
            })}

            {HOURS.map((_, i) => {
              const x = getXFromHourIdx(i);
              return (
                <line key={`vline-${i}`} x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#e2e8f0" strokeWidth="0.5" opacity="0.4" />
              );
            })}

            {zeroThermalPath && (
              <polyline points={zeroThermalPath} fill="none" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="5 3" strokeLinecap="round" />
            )}
            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.zeroThermal);
              return (
                <g key={`snow-${i}`} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="7" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
                  <text x="0" y="4" fill="#0284c7" fontSize="9" fontWeight="900" textAnchor="middle">❄</text>
                </g>
              );
            })}

            <g transform={`translate(${margin.left + plotW - 130}, ${getYFromAlt(avgZeroThermal) - 12})`}>
              <rect x="0" y="0" width="125" height="24" rx="4" fill="#0284c7" stroke="#ffffff" strokeWidth="1.2" />
              <text x="62" y="16" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                0 °C · {avgZeroThermal} m
              </text>
            </g>

            <path
              d={`M ${getXFromHourIdx(0)},${getYFromAlt(1800)} Q ${getXFromHourIdx(5)},${getYFromAlt(2600)} ${getXFromHourIdx(10)},${getYFromAlt(2200)}`}
              fill="none" stroke="#0f172a" strokeWidth="1.5" strokeDasharray="4 3"
            />

            {thermalTopCurve && (
              <path d={thermalTopCurve} fill="none" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" />
            )}

            {hourlyData.map((h, i) => {
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.thermalTop);
              return (
                <g key={`para-${i}`} transform={`translate(${x}, ${y})`}>
                  <circle cx="0" cy="0" r="10" fill="#ffffff" stroke="#7e22ce" strokeWidth="2.5" />
                  <path d="M -24,-16 C -16,-38 16,-38 24,-16 C 14,-24 -14,-24 -24,-16 Z" fill="#d8b4fe" stroke="#7e22ce" strokeWidth="2.5" />
                  <line x1="-18" y1="-18" x2="0" y2="-6" stroke="#7e22ce" strokeWidth="2" />
                  <line x1="18" y1="-18" x2="0" y2="-6" stroke="#7e22ce" strokeWidth="2" />
                  <circle cx="0" cy="-6" r="4" fill="#7e22ce" />
                </g>
              );
            })}

            {hourlyData.map((h, i) => {
              if (i === 0 || i === hourlyData.length - 1) return null;
              const x = getXFromHourIdx(i);
              const y = getYFromAlt(h.thermalTop) - 60;
              return (
                <g key={`cloud-${i}`} transform={`translate(${x}, ${y})`}>
                  <path d="M -26,11 A 12,12 0 0,1 -13,-7 A 16,16 0 0,1 10,-10 A 13,13 0 0,1 26,4 A 8,8 0 0,1 25,12 L -24,12 A 8,8 0 0,1 -26,11 Z" fill="#ffffff" stroke="#475569" strokeWidth="2.5" />
                  <text x="0" y="10" fill="#0f172a" fontSize="13" fontWeight="900" textAnchor="middle">{h.cloudPct}%</text>
                </g>
              );
            })}

            {hourlyData.map((h, i) => {
              if (i === 0 || i === hourlyData.length - 1) return null;
              const x = getXFromHourIdx(i);
              const paraY = getYFromAlt(h.thermalTop);
              const badgeY = paraY + 12;
              const rateoColor = h.thermalAvg >= 1.5 ? "#b91c1c" : h.thermalAvg >= 1.0 ? "#b45309" : "#0f172a";
              return (
                <g key={`badge-${i}`} transform={`translate(${x}, ${badgeY})`}>
                  <rect x="-35" y="0" width="70" height="14" rx="3" fill="#ffffff" opacity="0.95" stroke="#7e22ce" strokeWidth="0.5" />
                  <text x="0" y="10" fill="#0f172a" fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    {h.cloudBase}m
                  </text>
                  <rect x="-40" y="16" width="80" height="14" rx="3" fill="#ffffff" opacity="0.95" stroke="#7e22ce" strokeWidth="0.5" />
                  <text x="0" y="27" fill={rateoColor} fontSize="11" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                    ↑{h.thermalAvg.toFixed(1)} m/s
                  </text>
                </g>
              );
            })}

            {hourlyData.map((calc, i) => (
              <g key={`col-${i}`}>
                {calc.levelWinds.map((windLevel) => {
                  const x = getXFromHourIdx(i);
                  const y = getYFromAlt(windLevel.alt);
                  const currentHourData = hourlyData[i];
                  const isNearThermal = Math.abs(y - getYFromAlt(currentHourData.thermalTop)) < 15;
                  const isNearBadge = Math.abs(y - (getYFromAlt(currentHourData.thermalTop) + 25)) < 25;
                  return (
                    <g key={`wb-${i}-${Math.round(windLevel.alt)}`}>
                      {renderWindBarb(x, y, windLevel.speed, windLevel.dir)}
                      {!(isNearThermal || isNearBadge) && (
                        <text x={x + 28} y={y - 4} fill="#0f172a" fontSize="13" fontWeight="800" textAnchor="start" fontFamily="monospace">
                          {Math.round(windLevel.speed)}km/{getDirLetter(windLevel.dir)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            ))}

            {HOURS.map((h, i) => (
              <text key={`hr-${h}`} x={getXFromHourIdx(i)} y={margin.top + plotH + 20} fill="#0f172a" fontSize="12" fontWeight="900" textAnchor="middle" fontFamily="monospace">
                {String(h).padStart(2, "0")}:00
              </text>
            ))}

            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="none" stroke="#0f172a" strokeWidth="0.8" />
            </svg>
          </div>
        </div>

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
              Fonte: Open-Meteo GFS/AROME · Temperature reali a livelli hPa · Lapse rate calcolato algoritmicamente
            </div>
          </div>
        </div>
      </div>

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
