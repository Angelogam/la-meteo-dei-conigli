"use client";

import React, { useEffect, useRef, useMemo } from "react";

interface MeteoGramData {
  hours: string[];
  temperatures: number[];
  capeValues: number[];
  cloudCover: number[];
  precipitation: number[];
  windSpeed: number[];
  windDir: number[];
  humidity: number[];
  dewPoint: number[];
}

interface MeteoGramProps {
  data: MeteoGramData;
  siteName: string;
  siteAltitude: number;
  date: string;
}

const CANVAS_PADDING = { top: 40, right: 80, bottom: 50, left: 55 };
const CHART_COLORS = {
  cape: "rgba(239, 68, 68, 0.2)",
  capeLine: "rgb(239, 68, 68)",
  temperature: "rgb(250, 204, 21)",
  dewPoint: "rgb(56, 189, 248)",
  cloudCover: "rgba(148, 163, 184, 0.25)",
  precipitation: "rgb(14, 165, 233)",
  wind: "rgb(34, 197, 94)",
  grid: "rgba(148, 163, 184, 0.12)",
  text: "rgb(203, 213, 225)",
  axisLabel: "rgb(148, 163, 184)",
};

export function MeteoGram({ data, siteName, siteAltitude, date }: MeteoGramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stats = useMemo(() => {
    if (!data.hours.length) return null;
    const maxCape = Math.max(...data.capeValues, 0);
    const avgCape = data.capeValues.reduce((a, b) => a + b, 0) / data.capeValues.length;
    const maxTemp = Math.max(...data.temperatures);
    const maxWind = Math.max(...data.windSpeed, 1);
    const maxPrecip = Math.max(...data.precipitation, 0.1);
    const avgTemp = data.temperatures.reduce((a, b) => a + b, 0) / data.temperatures.length;
    const avgDew = data.dewPoint.reduce((a, b) => a + b, 0) / data.dewPoint.length;
    const cloudBase = Math.round((avgTemp - avgDew) * 125);
    const thermalTop = cloudBase + Math.round((maxCape / 500) * 1500);
    const buoyancy = ((avgTemp - avgDew) / (avgTemp || 1)) * 100;

    return {
      maxCape,
      avgCape,
      maxTemp,
      maxWind,
      maxPrecip,
      cloudBase: Math.max(0, cloudBase),
      thermalTop: Math.max(cloudBase, thermalTop),
      buoyancy,
      capeCategory: maxCape > 1000 ? "Molto instabile" : maxCape > 500 ? "Instabile" : maxCape > 200 ? "Moderato" : "Stabile",
      thermalStrength: avgCape > 600 ? "Forte" : avgCape > 300 ? "Buona" : avgCape > 100 ? "Debole" : "Nulla",
    };
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.hours.length || !stats) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const { top, right, bottom, left } = CANVAS_PADDING;
    const chartW = w - left - right;
    const chartH = h - top - bottom;

    ctx.clearRect(0, 0, w, h);

    const n = data.hours.length;
    const stepX = chartW / (n - 1 || 1);

    const tempMin = -5;
    const tempMax = 45;
    const tempRange = tempMax - tempMin;
    const capeMax = Math.max(stats.maxCape * 1.2, 100);
    const precipMax = Math.max(stats.maxPrecip * 2, 1);
    const windMax = Math.max(stats.maxWind * 1.3, 10);

    const tempY = (v: number) => top + chartH - ((v - tempMin) / tempRange) * chartH;
    const capeY = (v: number) => top + chartH - (v / capeMax) * chartH;
    const cloudY = (v: number) => top + chartH - (v / 100) * chartH;
    const windY = (v: number) => top + chartH - (v / windMax) * chartH;
    const xPos = (i: number) => left + i * stepX;

    // Griglia
    ctx.strokeStyle = CHART_COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = top + (chartH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + chartW, y);
      ctx.stroke();
    }

    // Label asse sinistro (temperature)
    ctx.fillStyle = CHART_COLORS.axisLabel;
    ctx.font = "9px Inter, sans-serif";
    ctx.textAlign = "right";
    for (let t = 0; t <= 40; t += 10) {
      const y = tempY(t);
      ctx.fillText(`${t}°`, left - 5, y + 3);
    }

    // Label asse destro (CAPE)
    ctx.textAlign = "left";
    const capeTicks = [0, Math.round(capeMax * 0.25), Math.round(capeMax * 0.5), Math.round(capeMax * 0.75), Math.round(capeMax)];
    for (const v of capeTicks) {
      const y = capeY(v);
      ctx.fillText(`${v}`, left + chartW + 5, y + 3);
    }

    // Label ora
    ctx.textAlign = "center";
    ctx.fillStyle = CHART_COLORS.axisLabel;
    ctx.font = "8px Inter, sans-serif";
    const labelInterval = Math.max(1, Math.floor(n / 8));
    for (let i = 0; i < n; i += labelInterval) {
      ctx.fillText(data.hours[i], xPos(i), top + chartH + 14);
    }

    // Area CAPE con gradiente
    if (Math.max(...data.capeValues) > 0) {
      const gradient = ctx.createLinearGradient(0, top, 0, top + chartH);
      gradient.addColorStop(0, "rgba(239, 68, 68, 0.35)");
      gradient.addColorStop(1, "rgba(239, 68, 68, 0.05)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(xPos(0), capeY(0));
      for (let i = 1; i < n; i++) {
        ctx.lineTo(xPos(i), capeY(data.capeValues[i]));
      }
      ctx.lineTo(xPos(n - 1), capeY(0));
      ctx.lineTo(xPos(0), capeY(0));
      ctx.closePath();
      ctx.fill();
    }

    // Linea CAPE
    ctx.strokeStyle = CHART_COLORS.capeLine;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = xPos(i);
      const y = capeY(data.capeValues[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Area Nuvolosità
    ctx.fillStyle = CHART_COLORS.cloudCover;
    ctx.beginPath();
    ctx.moveTo(xPos(0), cloudY(data.cloudCover[0]));
    for (let i = 1; i < n; i++) {
      ctx.lineTo(xPos(i), cloudY(data.cloudCover[i]));
    }
    ctx.lineTo(xPos(n - 1), cloudY(0));
    ctx.lineTo(xPos(0), cloudY(0));
    ctx.closePath();
    ctx.fill();

    // Barre Precipitazioni
    for (let i = 0; i < n; i++) {
      const val = data.precipitation[i];
      if (val > 0) {
        const x = xPos(i);
        const barW = Math.max(3, stepX * 0.5);
        const barH = chartH * (val / precipMax);
        ctx.fillStyle = CHART_COLORS.precipitation;
        ctx.fillRect(x - barW / 2, top + chartH - barH, barW, barH);
      }
    }

    // Linea Temperatura
    ctx.strokeStyle = CHART_COLORS.temperature;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = xPos(i);
      const y = tempY(data.temperatures[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Punti temperatura
    ctx.fillStyle = CHART_COLORS.temperature;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(xPos(i), tempY(data.temperatures[i]), 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Linea Rugiada tratteggiata
    ctx.strokeStyle = CHART_COLORS.dewPoint;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = xPos(i);
      const y = tempY(data.dewPoint[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Punti rugiada
    ctx.fillStyle = CHART_COLORS.dewPoint;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(xPos(i), tempY(data.dewPoint[i]), 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Linea Vento tratteggiata
    ctx.strokeStyle = CHART_COLORS.wind;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = xPos(i);
      const y = windY(data.windSpeed[i]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Punti vento
    ctx.fillStyle = CHART_COLORS.wind;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(xPos(i), windY(data.windSpeed[i]), 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bordi
    ctx.strokeStyle = CHART_COLORS.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(left, top, chartW, chartH);
  }, [data, stats]);

  if (!data.hours.length || !stats) {
    return (
      <div className="bg-slate-800/80 border border-slate-600 rounded-2xl p-6 text-center">
        <p className="text-sm text-slate-400">Dati insufficienti per generare il windgram.</p>
      </div>
    );
  }

  const thunderAlert = stats.maxCape > 800;
  const xcRating = stats.maxCape > 500 && stats.avgCape > 200 ? "Buona" : stats.maxCape > 300 ? "Discreta" : "Scarsa";

  return (
    <div className="bg-slate-800/90 border border-slate-600 rounded-2xl p-3 md:p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🌤️</span> Windgram
          </h3>
          <p className="text-[10px] text-slate-400">{siteName} · {siteAltitude}m · {date}</p>
        </div>
        <div className="flex gap-2 text-[10px]">
          <span className="px-1.5 py-0.5 rounded-md bg-slate-700 border border-slate-500 text-slate-200">
            CAPE max: {stats.maxCape} J/kg
          </span>
          <span className={`px-1.5 py-0.5 rounded-md border ${
            thunderAlert ? "bg-red-900/60 border-red-500 text-red-200" : "bg-green-900/60 border-green-500 text-green-200"
          }`}>
            ⚡ {thunderAlert ? "Allerta" : "Sicuro"}
          </span>
        </div>
      </div>

      <div className="w-full" style={{ height: 320 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-xl"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 pt-2.5 border-t border-slate-600/40">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded bg-yellow-400" />
          <span className="text-[9px] text-slate-400">Temp.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded border-t border-dashed border-sky-400" />
          <span className="text-[9px] text-slate-400">Rugiada</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded bg-red-500/30" />
          <span className="text-[9px] text-slate-400">CAPE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded bg-slate-400/30" />
          <span className="text-[9px] text-slate-400">Nuvole</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded bg-blue-500" />
          <span className="text-[9px] text-slate-400">Pioggia</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 rounded border-t border-dashed border-green-400" />
          <span className="text-[9px] text-slate-400">Vento</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-600/40">
        <div className="bg-slate-700/60 rounded-xl p-2 border border-slate-600/40">
          <div className="text-[8px] text-slate-400 uppercase tracking-wider">Stabilità</div>
          <div className="text-xs font-bold text-white mt-0.5">{stats.capeCategory}</div>
          <div className="text-[8px] text-slate-500">CAPE max {stats.maxCape} J/kg</div>
        </div>
        <div className="bg-slate-700/60 rounded-xl p-2 border border-slate-600/40">
          <div className="text-[8px] text-slate-400 uppercase tracking-wider">Termiche</div>
          <div className="text-xs font-bold text-white mt-0.5">{stats.thermalStrength}</div>
          <div className="text-[8px] text-slate-500">Media {Math.round(stats.avgCape)} J/kg</div>
        </div>
        <div className="bg-slate-700/60 rounded-xl p-2 border border-slate-600/40">
          <div className="text-[8px] text-slate-400 uppercase tracking-wider">Base termica</div>
          <div className="text-xs font-bold text-white mt-0.5">{stats.cloudBase} m</div>
          <div className="text-[8px] text-slate-500">Cima ~{stats.thermalTop} m</div>
        </div>
        <div className="bg-slate-700/60 rounded-xl p-2 border border-slate-600/40">
          <div className="text-[8px] text-slate-400 uppercase tracking-wider">XC Rating</div>
          <div className={`text-xs font-bold mt-0.5 ${
            xcRating === "Buona" ? "text-green-400" : xcRating === "Discreta" ? "text-amber-400" : "text-red-400"
          }`}>
            {xcRating}
          </div>
          <div className="text-[8px] text-slate-500">Gallegg. {stats.buoyancy.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
}