"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { fetchHourly } from "@/lib/openMeteoClient";
import { useMultiHourWindProfile } from "@/hooks/useMultiHourWindProfile";

interface ProfessionalWindgramProps {
  latitude: number;
  longitude: number;
  altitude?: number;
  siteName?: string;
  selectedDay?: number;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const ALT_LEVELS = [6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500, 1000];
const HPA_LEVELS = [
  { hpa: 500, alt: 5500 },
  { hpa: 550, alt: 5000 },
  { hpa: 600, alt: 4500 },
  { hpa: 650, alt: 4000 },
  { hpa: 700, alt: 3500 },
  { hpa: 750, alt: 3000 },
  { hpa: 800, alt: 2500 },
  { hpa: 850, alt: 2000 },
];

// ΔT / 100m → colour stops (smooth interpolation)
const SCALE_STOPS: { val: number; r: number; g: number; b: number }[] = [
  { val: -0.20, r: 124, g: 58, b: 237 },   // violet  — strongly stable
  { val:  0.00, r: 59,  g: 130, b: 246 },  // blue
  { val:  0.16, r: 6,  g: 182, b: 212 },   // cyan
  { val:  0.32, r: 16,  g: 185, b: 129 },  // emerald — neutral
  { val:  0.48, r: 132, g: 204, b: 22 },   // lime
  { val:  0.65, r: 234, g: 179, b: 8  },   // yellow
  { val:  0.82, r: 249, g: 115, b: 22 },   // orange
  { val:  0.98, r: 239, g: 68,  b: 68  },  // red     — unstable
  { val:  1.20, r: 185, g: 28,  b: 28  },  // dark red
];

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function deltaTToRGB(t: number): [number, number, number] {
  const s = Math.max(-0.25, Math.min(1.30, t));
  if (s <= SCALE_STOPS[0].val) return [SCALE_STOPS[0].r, SCALE_STOPS[0].g, SCALE_STOPS[0].b];
  if (s >= SCALE_STOPS[SCALE_STOPS.length - 1].val) {
    const last = SCALE_STOPS[SCALE_STOPS.length - 1];
    return [last.r, last.g, last.b];
  }
  for (let i = 0; i < SCALE_STOPS.length - 1; i++) {
    const a = SCALE_STOPS[i], b = SCALE_STOPS[i + 1];
    if (s >= a.val && s <= b.val) {
      const f = (s - a.val) / (b.val - a.val);
      return [
        Math.round(a.r + (b.r - a.r) * f),
        Math.round(a.g + (b.g - a.g) * f),
        Math.round(a.b + (b.b - a.b) * f),
      ];
    }
  }
  const last = SCALE_STOPS[SCALE_STOPS.length - 1];
  return [last.r, last.g, last.b];
}

function deltaTToColor(t: number): string {
  const [r, g, b] = deltaTToRGB(t);
  return `rgb(${r},${g},${b})`;
}

// Wind barb direction: meteorological convention (from where wind comes)
function barbAngle(windDeg: number): number {
  return ((windDeg + 90) * Math.PI) / 180;
}

function dirLetter(deg: number): string {
  const d = ["N","NE","E","SE","S","SO","O","NO"];
  return d[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

export default function ProfessionalWindgram({
  latitude, longitude, altitude = 1374, siteName = "Sito", selectedDay = 0,
}: ProfessionalWindgramProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { interpolateAtAltitude } = useMultiHourWindProfile({
    lat: latitude, lon: longitude, siteAlt: altitude, selectedDay,
  });

  const dateObj = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    return d;
  }, [selectedDay]);
  const dateStr = useMemo(() => dateObj.toISOString().split("T")[0], [dateObj]);
  const dayName = useMemo(() => {
    const d = ["dom","lun","mar","mer","gio","ven","sab"];
    return d[dateObj.getDay()];
  }, [dateObj]);
  const monthName = useMemo(() => {
    const m = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
    return m[dateObj.getMonth()];
  }, [dateObj]);

  // ── Canvas geometry ──
  const CW = 1200, CH = 880;
  const ML = 95, MT = 70, MR = 145, MB = 80;
  const PW = CW - ML - MR, PH = CH - MT - MB;
  const ALT_MIN = 1000, ALT_MAX = 4200;
  const yFromAlt = (alt: number) => MT + PH - ((Math.min(ALT_MAX, Math.max(ALT_MIN, alt)) - ALT_MIN) / (ALT_MAX - ALT_MIN)) * PH;
  const xFromIdx = (i: number) => ML + (i / (HOURS.length - 1)) * PW;

  // ── Fetch data ──
  useEffect(() => {
    let ok = true;
    setLoading(true);
    const params = [
      "temperature_2m","relative_humidity_2m","dew_point_2m","precipitation",
      "cloud_cover","wind_speed_10m","wind_direction_10m","wind_gusts_10m",
      "wind_speed_80m","wind_direction_80m","wind_speed_120m","wind_direction_120m",
      "wind_speed_180m","wind_direction_180m","temperature_180m","surface_pressure",
      "shortwave_radiation","freezing_level_height","cape","lifted_index",
    ].join(",");
    fetchHourly(latitude, longitude, params, dateStr, dateStr)
      .then(j => { if (ok) { setData(j); setLoading(false); } })
      .catch(e => { if (ok) { setError(e?.message ?? "Errore"); setLoading(false); } });
    return () => { ok = false; };
  }, [latitude, longitude, dateStr]);

  // ── Compute hourly profiles ──
  const hourlyData = useMemo(() => {
    if (!data?.hourly?.time) return [];
    const times = data.hourly.time;
    return HOURS.map((hr) => {
      const idx = times.findIndex(t => parseInt(t.split("T")[1].split(":")[0]) === hr);
      if (idx === -1) {
        const fb = Array(ALT_LEVELS.length).fill(0).map((_, i) => 0.85 - i * 0.055);
        return {
          hour: hr, sunPct: 80, thermalAvg: 1.1, tempGround: 18,
          windGround: 8, windDirGround: 180, precip: 0, cloudCover: 10,
          zeroThermal: 4380, thermalTop: altitude + 900, cloudBase: altitude + 800,
          cloudPct: 5, deltaT: 0.75,
          levelWinds: ALT_LEVELS.map(a => ({ alt: a, speed: 12, dir: 240 })),
          deltaTProfile: fb,
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
      const t180 = h.temperature_180m?.[idx];
      const t180Num = (t180 != null && !isNaN(Number(t180))) ? Number(t180) : null;

      const sunPct = Math.min(100, Math.max(10, Math.round(((rad / 900) * (1 - (cloud / 100) * 0.65)) * 100)));
      const spread = Math.max(1, t - dew);
      const cloudBase = Math.round(altitude + Math.min(1500, spread * 125));
      const cloudPct = Math.max(2, Math.min(95, Math.round(cloud)));

      let gamma0 = 0.72;
      if (t180Num != null && t180Num !== t && t180Num >= -60)
        gamma0 = Math.max(0.1, (t - t180Num) / 1.8);
      const hrsFromPeak = Math.abs(hr - 14);
      const sunInt = (sunPct / 100) * Math.max(0, 1 - hrsFromPeak / 5);
      const solarBoost = sunInt * 0.55;
      const capeBoost = cape > 50 ? Math.min(0.35, cape / 2500) : 0;
      const spreadBoost = spread > 6 ? (spread - 6) * 0.03 : 0;
      gamma0 = Math.max(0.05, Math.min(1.6, gamma0 + solarBoost + capeBoost + spreadBoost));

      const gammaFree = 0.52;
      const Hscale = 1200;
      const thermalTop = Math.round(Math.min(4000, cloudBase + Math.min(800, (0.6 + spread * 0.08 + (sunPct / 100) * 0.45 + (cape > 200 ? cape / 2500 : 0)) * 100 + cape * 0.1)));

      function gammaAt(alt: number) {
        const al = alt - ALT_MIN;
        let g = gammaFree + (gamma0 - gammaFree) * Math.exp(-al / Hscale);
        if (alt > thermalTop) {
          const d = alt - thermalTop;
          g -= Math.min(0.7, d / 500) * 0.6;
        }
        if (alt > cloudBase) g -= 0.1;
        if (precip > 0.3) g -= 0.12;
        return Math.max(-0.35, Math.min(1.6, g));
      }

      const STEP = 50;
      const nSteps = Math.ceil((ALT_MAX - ALT_MIN) / STEP);
      const temps = new Array(nSteps + 1);
      temps[0] = t;
      for (let s = 0; s < nSteps; s++) {
        const mid = ALT_MIN + (s + 0.5) * STEP;
        temps[s + 1] = temps[s] - gammaAt(mid) * (STEP / 100);
      }
      function localDeltaT(alt: number) {
        const i0 = Math.round((alt - ALT_MIN) / STEP);
        const iL = Math.max(0, Math.min(i0, nSteps - 1));
        const iR = Math.min(nSteps, i0 + 1);
        const dAlt = (iR - iL) * STEP;
        if (dAlt === 0) return gammaAt(alt);
        return ((temps[iR] - temps[iL]) / dAlt) * 100;
      }

      const deltaTProfile = ALT_LEVELS.map(a => localDeltaT(a));
      const deltaT = deltaTProfile[0] ?? gamma0;

      const levelWinds = ALT_LEVELS.map(a => {
        const interp = interpolateAtAltitude(hr, a);
        return { alt: a, speed: interp?.speed ?? wind10, dir: interp?.dir ?? windDir10 };
      });

      return {
        hour: hr, sunPct, thermalAvg: Math.max(0.4, Math.min(2.5, 0.6 + spread * 0.08 + (sunPct / 100) * 0.45 + (cape > 200 ? cape / 2500 : 0))),
        tempGround: Math.round(t), windGround: Math.round(wind10), windDirGround: Math.round(windDir10),
        precip, cloudCover: cloud, zeroThermal: Math.round(freeze), thermalTop, cloudBase, cloudPct, deltaT,
        levelWinds, deltaTProfile,
      };
    });
  }, [data, altitude, interpolateAtAltitude]);

  // ── Canvas: horizontal stability bands + grid + overlays ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || hourlyData.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Black background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // Fill chart area black
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(ML, MT, PW, PH);

    // ── Horizontal color bands ──
    // Each row covers a small altitude slice; colour = deltaT at that altitude,
    // interpolated horizontally across time.
    const BAND_H = 3; // px per band
    const totalBands = Math.ceil(PH / BAND_H);

    for (let row = 0; row < totalBands; row++) {
      const altCenter = ALT_MIN + ((row + 0.5) * PH / totalBands);
      const yTop = MT + PH - (row + 1) * BAND_H;
      const yBot = MT + PH - row * BAND_H;

      // Interpolate deltaT at this altitude from the profile
      const li = (altCenter - ALT_MIN) / 500;
      const li0 = Math.max(0, Math.floor(li));
      const li1 = Math.min(ALT_LEVELS.length - 1, li0 + 1);
      const frac = li - li0;
      const dtAtAlt = (v: number[]) => {
        const a = v[li0] ?? 0.72;
        const b = v[li1] ?? a;
        return a + (b - a) * frac;
      };

      // Sample deltaT at each hour for this altitude
      const samples = hourlyData.map(hd => dtAtAlt(hd.deltaTProfile));

      // Build gradient from sample points
      const grad = ctx.createLinearGradient(ML, 0, ML + PW, 0);
      hourlyData.forEach((_, hi) => {
        grad.addColorStop(hi / (HOURS.length - 1), deltaTToColor(samples[hi]));
      });

      ctx.fillStyle = grad;
      ctx.fillRect(ML, yTop, PW, BAND_H);
    }

    // ── Grid lines ──
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.5;

    // Horizontal grid (ALT_LEVELS)
    ALT_LEVELS.filter(a => a >= ALT_MIN && a <= ALT_MAX).forEach((alt) => {
      const y = yFromAlt(alt);
      ctx.beginPath();
      ctx.moveTo(ML, y);
      ctx.lineTo(ML + PW, y);
      ctx.stroke();
    });

    // Vertical grid (hours)
    HOURS.forEach((_, i) => {
      const x = xFromIdx(i);
      ctx.beginPath();
      ctx.moveTo(x, MT);
      ctx.lineTo(x, MT + PH);
      ctx.stroke();
    });

    // HPA grid (dashed, lighter)
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.setLineDash([4, 4]);
    HPA_LEVELS.forEach((lvl) => {
      const y = yFromAlt(lvl.alt);
      ctx.beginPath();
      ctx.moveTo(ML, y);
      ctx.lineTo(ML + PW, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // ── Border ──
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(ML, MT, PW, PH);

    // ── Thermal top line (black dashed → visible on dark bg) ──
    if (hourlyData.length > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      hourlyData.forEach((hd, i) => {
        const x = xFromIdx(i);
        const y = yFromAlt(hd.thermalTop);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── 0°C isotherm (cyan dashed) ──
    if (hourlyData.length > 0) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      hourlyData.forEach((hd, i) => {
        const x = xFromIdx(i);
        const y = yFromAlt(hd.zeroThermal);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Snowflake markers
      hourlyData.forEach((hd, i) => {
        const x = xFromIdx(i);
        const y = yFromAlt(hd.zeroThermal);
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("❄", x, y);
      });
    }

    // ── Cloud base curve (purple dashed) ──
    if (hourlyData.length > 0) {
      ctx.strokeStyle = "rgba(192,132,252,0.7)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      hourlyData.forEach((hd, i) => {
        const x = xFromIdx(i);
        const y = yFromAlt(hd.cloudBase);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── Wind barbs (right side of chart) ──
    hourlyData.forEach((hd, hi) => {
      const bx = ML + PW + 6; // just inside right margin
      hd.levelWinds.forEach((wl) => {
        const by = yFromAlt(wl.alt);
        const ang = barbAngle(wl.dir);
        const len = Math.min(40, 8 + wl.speed * 0.5);
        const ex = bx - len * Math.cos(ang); // barbs point INTO the chart (wind FROM direction)
        const ey = by - len * Math.sin(ang);
        const col = wl.speed > 35 ? "#c084fc" : wl.speed > 20 ? "#38bdf8" : "rgba(255,255,255,0.85)";
        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";

        // Staff
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Arrow head (at end, pointing along wind direction)
        const ax = ex, ay = ey;
        const tipX = ax - 5 * Math.cos(ang);
        const tipY = ay - 5 * Math.sin(ang);
        const perpX = -Math.sin(ang), perpY = Math.cos(ang);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(tipX + 3 * perpX, tipY + 3 * perpY);
        ctx.lineTo(tipX - 3 * perpX, tipY - 3 * perpY);
        ctx.closePath();
        ctx.fill();

        // Flags
        const flagSteps = Math.floor(wl.speed / 10);
        for (let fi = 0; fi < flagSteps; fi++) {
          const d = 10 + fi * 10;
          const fx = bx - d * Math.cos(ang);
          const fy = by - d * Math.sin(ang);
          const px = perpX, py = perpY;
          // Full flag (20 kt) or half flag (10 kt)
          const isFull = (fi < Math.floor(wl.speed / 20));
          const fLen = isFull ? 8 : 5;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + fLen * px, fy + fLen * py);
          ctx.lineTo(fx - 3 * Math.cos(ang), fy - 3 * Math.sin(ang));
          ctx.closePath();
          ctx.fill();
        }

        // Speed label
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`${Math.round(wl.speed)}${dirLetter(wl.dir)}`, bx, by + 10);
      });
    });

    // ── Left axis labels (hPa) ──
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    HPA_LEVELS.forEach((lvl) => {
      const y = yFromAlt(lvl.alt);
      ctx.fillText(`${lvl.hpa}`, ML - 6, y);
    });

    // ── Right axis labels (altitude) ──
    ctx.textAlign = "left";
    ALT_LEVELS.filter(a => a >= ALT_MIN && a <= ALT_MAX).forEach((alt) => {
      const y = yFromAlt(alt);
      ctx.fillText(`${alt}m`, ML + PW + 6, y);
    });

    // ── Bottom hour labels ──
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 11px monospace";
    HOURS.forEach((hr, i) => {
      const x = xFromIdx(i);
      ctx.fillText(`${String(hr).padStart(2,"0")}:00`, x, MT + PH + 6);
    });

    // ── Top metric values (above chart) ──
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    hourlyData.forEach((hd, i) => {
      const x = xFromIdx(i);
      const color = hd.thermalAvg >= 1.4 ? "#ef4444" : hd.thermalAvg >= 0.9 ? "#f97316" : "rgba(255,255,255,0.7)";
      ctx.fillStyle = color;
      ctx.font = "bold 11px monospace";
      ctx.fillText(hd.thermalAvg.toFixed(1), x, MT - 4);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "8px monospace";
      ctx.fillText(`☀${hd.sunPct}%`, x, MT - 16);
    });

    // ── 0°C label ──
    if (hourlyData.length > 0) {
      const avgZT = hourlyData.reduce((a, h) => a + h.zeroThermal, 0) / hourlyData.length;
      const lx = ML + PW - 130;
      const ly = yFromAlt(avgZT) - 10;
      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.roundRect(lx, ly, 125, 20, 4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`0 °C · ${Math.round(avgZT)} m`, lx + 62, ly + 10);
    }

    // ── Title on canvas ──
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${siteName}  ·  ${dayName} ${dateObj.getDate()} ${monthName}`, ML, 12);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "9px monospace";
    ctx.fillText(`plotted ${dateStr}  ·  ground ${Math.round(altitude + 5)}m  ·  SRTM ${Math.round(altitude)}m`, ML, 30);

  }, [hourlyData, altitude, dateObj, siteName, dayName, monthName, dateStr]);

  // ── SVG overlay: cloud-base badges ──
  const zeroThermalPts = useMemo(() =>
    hourlyData.length ? hourlyData.map((h, i) => `${xFromIdx(i)},${yFromAlt(h.zeroThermal)}`).join(" ") : "",
    [hourlyData]
  );
  const avgZeroThermal = useMemo(() =>
    hourlyData.length ? Math.round(hourlyData.reduce((a, h) => a + h.zeroThermal, 0) / hourlyData.length) : 4000,
    [hourlyData]
  );

  if (loading) return (
    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-10 flex flex-col items-center justify-center text-slate-300 shadow-2xl min-h-[500px]">
      <RefreshCw className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
      <span className="text-lg font-bold text-white">Caricamento Grafico Aerologico…</span>
      <span className="text-sm text-slate-400 mt-1">{siteName} ({altitude}m)</span>
    </div>
  );
  if (error) return (
    <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 text-center text-rose-300">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
      <p className="font-bold text-white">Impossibile caricare i dati</p>
      <p className="text-xs text-slate-400 mt-1">{error}</p>
    </div>
  );

  return (
    <div className="bg-slate-950 text-white rounded-[20px] shadow-2xl border border-slate-800 overflow-hidden font-sans select-none">
      {/* Chart */}
      <div className="w-full overflow-x-auto px-1 pb-1">
        <div className="relative" style={{ minWidth: CW, height: CH }}>
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="absolute inset-0"
            style={{ width: CW, height: CH }}
          />
          <svg viewBox={`0 0 ${CW} ${CH}`} className="absolute inset-0" style={{ width: CW, height: CH, pointerEvents: "none" }}>
            {/* Cloud base badges */}
            {hourlyData.map((hd, i) => {
              const bx = xFromIdx(i);
              const by = yFromAlt(hd.cloudBase);
              const rc = hd.thermalAvg >= 1.4 ? "#ef4444" : hd.thermalAvg >= 0.9 ? "#f97316" : "rgba(255,255,255,0.7)";
              return (
                <g key={`badge-${i}`}>
                  <rect x={bx - 32} y={by + 6} width="64" height="28" rx="5" fill="rgba(15,23,42,0.85)" stroke="rgba(192,132,252,0.6)" strokeWidth="1" />
                  <text x={bx} y={by + 18} fill="white" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="monospace">{hd.cloudBase}m</text>
                  <text x={bx} y={by + 30} fill={rc} fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">↑{hd.thermalAvg.toFixed(1)} m/s</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 pb-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
          <span>Stabile ↑</span>
          <span className="text-white font-extrabold text-sm">ΔT / 100 m</span>
          <span>Instabile ↑</span>
        </div>
        <div className="w-full h-4 rounded-sm flex overflow-hidden border border-slate-700">
          {SCALE_STOPS.map((item, idx) => (
            <div
              key={idx}
              className="flex-1 h-full"
              style={{ backgroundColor: `rgb(${item.r},${item.g},${item.b})` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] font-mono font-bold text-slate-500 mt-1 px-0.5">
          {SCALE_STOPS.map((item, idx) => (
            <span key={idx}>{item.val.toFixed(2)}</span>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2 text-[9px] text-slate-500 font-mono">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:"#0f172a",border:"1px solid rgba(255,255,255,0.2)"}}/> sfondo = aria calma</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:"#38bdf8"}}/> 0 °C</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:"rgba(192,132,252,0.7)"}}/> base nuvole</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block" style={{background:"rgba(255,255,255,0.9)"}}/> termo</span>
        </div>
        <div className="text-center text-[9px] text-slate-600 font-mono mt-2">
          Fonte: AROME 0-48 h + ICON-EU 0-120 h via Open-Meteo · Diagnostica di volo a vela
        </div>
      </div>
    </div>
  );
}
