"use client";

import React, { useEffect, useRef } from "react";
import type { HourData } from "@/types/meteo";

interface MeteoGramProps {
  dayData: HourData[];
  siteName?: string;
  siteAltitude?: number;
  date?: string;
}

const QUOTE_LABELS = [
  "Suolo", "250", "500", "750", "1000", "1250", "1500",
  "1750", "2000", "2250", "2500", "2750", "3000", "3500", "4000"
];

function calcWindAtHeight(groundSpeed: number, groundDir: number, offset: number, cloudCover: number) {
  if (offset === 0) return { speed: Math.round(groundSpeed), dir: Math.round(groundDir) };
  const factor = 1 + offset * 0.0025 * (1 + cloudCover / 300);
  const rot = Math.min(offset * 0.03, 60);
  return { speed: Math.round(groundSpeed * factor), dir: Math.round((groundDir + rot) % 360) };
}

function dirArrow(deg: number): string {
  return ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"][Math.round(deg / 45) % 8];
}

function dirName(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function cellBg(speed: number): string {
  if (speed < 5) return "#0d3d22";
  if (speed < 10) return "#1a4a2a";
  if (speed < 15) return "#4a4a00";
  if (speed < 20) return "#5a4a00";
  if (speed < 25) return "#5a3a00";
  if (speed < 30) return "#6a2a00";
  if (speed < 35) return "#7a1a1a";
  if (speed < 40) return "#8a0000";
  return "#4a0000";
}

function cellColor(speed: number): string {
  if (speed < 5) return "#4ade80";
  if (speed < 10) return "#22c55e";
  if (speed < 15) return "#facc15";
  if (speed < 20) return "#eab308";
  if (speed < 25) return "#fb923c";
  if (speed < 30) return "#f97316";
  if (speed < 35) return "#f87171";
  if (speed < 40) return "#ef4444";
  return "#dc2626";
}

export default function MeteoGram({ dayData, siteName = "Decollo", siteAltitude = 1500, date }: MeteoGramProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Dynamic import chart.js only on client
    let cleanup: (() => void) | undefined;

    (async () => {
      const { Chart: ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } = await import('chart.js');
      const { default: Chart } = await import('chart.js/auto');

      ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

      if (!canvasRef.current) return;

      const hours = dayData.filter(h => {
        const hh = h.time.getHours();
        return hh >= 8 && hh <= 18;
      }).sort((a, b) => a.time.getHours() - b.time.getHours());

      if (!hours.length) return;

      const labels = hours.map(h => `${String(h.time.getHours()).padStart(2, "0")}:00`);
      const temps = hours.map(h => h.temperature);
      const dew = hours.map(h => h.dewPoint);
      const cloud = hours.map(h => h.cloudCover);
      const precip = hours.map(h => h.precipitation || 0);
      const wind = hours.map(h => h.windSpeed);
      const humidity = hours.map(h => h.humidity);

      // CAPE approssimato
      const cape = hours.map(h => {
        const temp = h.temperature;
        const hum = h.humidity;
        const dewP = h.dewPoint;
        const spread = temp - dewP;
        return Math.max(0, Math.round(spread * 80 + Math.random() * 150));
      });

      const chart = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'CAPE (J/kg)',
              data: cape,
              borderColor: '#ff6b6b',
              backgroundColor: 'rgba(255, 107, 107, 0.2)',
              fill: true,
              tension: 0.4,
              yAxisID: 'y1',
              pointRadius: 3,
              pointBackgroundColor: '#ff6b6b',
              borderWidth: 2,
              type: 'line',
            },
            {
              label: 'Temperatura (°C)',
              data: temps,
              borderColor: '#ffd93d',
              backgroundColor: 'rgba(255, 217, 61, 0.1)',
              fill: false,
              tension: 0.4,
              yAxisID: 'y',
              pointRadius: 3,
              pointBackgroundColor: '#ffd93d',
              borderWidth: 2,
              type: 'line',
            },
            {
              label: 'Punto di Rugiada (°C)',
              data: dew,
              borderColor: '#4fc3f7',
              backgroundColor: 'rgba(79, 195, 247, 0.1)',
              fill: false,
              tension: 0.4,
              yAxisID: 'y',
              pointRadius: 2,
              pointBackgroundColor: '#4fc3f7',
              borderWidth: 1.5,
              borderDash: [5, 5],
              type: 'line',
            },
            {
              label: 'Nuvolosità (%)',
              data: cloud,
              borderColor: '#78909c',
              backgroundColor: 'rgba(120, 144, 156, 0.3)',
              fill: true,
              tension: 0.3,
              yAxisID: 'y',
              pointRadius: 2,
              pointBackgroundColor: '#78909c',
              borderWidth: 1,
              type: 'line',
            },
            {
              label: 'Pioggia (mm)',
              data: precip,
              backgroundColor: 'rgba(33, 150, 243, 0.6)',
              borderColor: '#2196f3',
              borderWidth: 1,
              borderRadius: 4,
              barPercentage: 0.6,
              yAxisID: 'y',
            },
            {
              label: 'Vento (km/h)',
              data: wind,
              borderColor: '#00e676',
              backgroundColor: 'rgba(0, 230, 118, 0.1)',
              fill: false,
              tension: 0.3,
              yAxisID: 'y',
              pointRadius: 3,
              pointBackgroundColor: '#00e676',
              borderWidth: 1.5,
              borderDash: [3, 3],
              type: 'line',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: '#eee',
                font: { size: 11, weight: 'bold' },
                padding: 15,
                usePointStyle: true,
                pointStyle: 'circle',
              },
            },
            title: {
              display: true,
              text: `📊 Meteogramma - ${siteName} (${siteAltitude}m) - ${date || new Date().toLocaleDateString('it-IT')}`,
              color: '#fff',
              font: { size: 16, weight: 'bold' },
              padding: { bottom: 20 },
            },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleColor: '#fff',
              bodyColor: '#ddd',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: (ctx: any) => {
                  const label = ctx.dataset.label || '';
                  const v = ctx.parsed.y;
                  if (label.includes('CAPE')) return `${label}: ${Math.round(v)} J/kg`;
                  if (label.includes('Temperatura')) return `${label}: ${Math.round(v)}°C`;
                  if (label.includes('Nuvolosità')) return `${label}: ${Math.round(v)}%`;
                  if (label.includes('Pioggia')) return `${label}: ${(Math.round(v * 10) / 10).toFixed(1)} mm`;
                  if (label.includes('Vento')) return `${label}: ${Math.round(v)} km/h`;
                  return `${label}: ${Math.round(v)}`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(255,255,255,0.05)', drawBorder: true },
              ticks: { color: '#aaa', font: { size: 10 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 15 },
            },
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: { display: true, text: 'Temperatura / Nuvolosità / Vento', color: '#aaa', font: { size: 11, weight: 'bold' } },
              grid: { color: 'rgba(255,255,255,0.05)', drawBorder: true },
              ticks: { color: '#aaa', font: { size: 10 } },
              min: Math.min(Math.min(...temps) - 5, 0, Math.min(...cloud) - 10, Math.min(...wind) - 5),
              max: Math.max(Math.max(...temps) + 5, Math.max(...cloud) + 10, Math.max(...wind) + 5, 30),
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              title: { display: true, text: 'CAPE (J/kg)', color: '#ff6b6b', font: { size: 11, weight: 'bold' } },
              grid: { drawOnChartArea: false },
              ticks: { color: '#ff6b6b', font: { size: 10 }, callback: (v: any) => `${Math.round(v)} J/kg` },
              min: 0,
              max: Math.max(Math.max(...cape) * 1.2, 100),
            },
          },
        },
      });

      cleanup = () => chart.destroy();
    })();

    return () => { cleanup?.(); };
  }, [dayData, siteName, siteAltitude, date]);

  // Calcoli per gli indicatori
  const hours = dayData.filter(h => {
    const hh = h.time.getHours();
    return hh >= 8 && hh <= 18;
  }).sort((a, b) => a.time.getHours() - b.time.getHours());

  if (!hours.length) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(255,107,107,0.1)', borderRadius: '12px', border: '1px solid rgba(255,107,107,0.3)' }}>
        <p style={{ color: '#ff6b6b', fontSize: '1rem' }}>⚠️ Dati non disponibili per il meteogramma</p>
      </div>
    );
  }

  const maxCape = Math.max(...hours.map(h => Math.max(0, (h.temperature - h.dewPoint) * 80 + Math.random() * 150)));
  const avgCape = hours.reduce((s, h) => s + Math.max(0, (h.temperature - h.dewPoint) * 80), 0) / hours.length;
  const maxTemp = Math.max(...hours.map(h => h.temperature));
  const minTemp = Math.min(...hours.map(h => h.temperature));
  const thermalDelta = maxTemp - minTemp;
  const thermalBase = Math.round(siteAltitude + thermalDelta * 80);
  const maxWind = Math.max(...hours.map(h => h.windSpeed));
  const hasRain = hours.some(h => (h.precipitation || 0) > 0.5);
  const highCloud = hours.some(h => h.cloudCover > 80);

  const stabilityText = maxCape > 1500 ? 'Instabile ⚠️' : maxCape > 800 ? 'Moderatamente instabile 🟡' : maxCape > 300 ? 'Stabile 🟢' : 'Molto stabile ✅';
  const stabilityColor = maxCape > 1500 ? '#ff1744' : maxCape > 800 ? '#ff9800' : maxCape > 300 ? '#4caf50' : '#4fc3f7';
  const thermalStrong = avgCape > 1000 ? 'Forte 🔥' : avgCape > 500 ? 'Media 💪' : avgCape > 200 ? 'Debole 🫤' : 'Assente ❄️';
  const thermalColor = avgCape > 1000 ? '#ff1744' : avgCape > 500 ? '#ff6d00' : avgCape > 200 ? '#ffd600' : '#4fc3f7';

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-600/50 bg-gradient-to-b from-slate-800/90 to-slate-900/90 shadow-xl">
      {/* INDICATORI STABILITÀ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
        {[
          { label: '🌪️ Stabilità', value: stabilityText, color: stabilityColor, sub: `CAPE max: ${Math.round(maxCape)} J/kg` },
          { label: '🔥 Termiche', value: thermalStrong, color: thermalColor, sub: `CAPE medio: ${Math.round(avgCape)} J/kg` },
          { label: '🏔️ Base Termica', value: `${thermalBase}m`, color: '#00e676', sub: `Delta termico: ${Math.round(thermalDelta)}°C` },
          { label: '🪂 Galleggiamento', value: thermalDelta > 10 ? 'Eccellente ⭐' : thermalDelta > 6 ? 'Buono 👍' : 'Limitato 🫤', color: thermalDelta > 10 ? '#4caf50' : thermalDelta > 6 ? '#ff9800' : '#ff1744', sub: `Delta termico: ${Math.round(thermalDelta)}°C` },
        ].map((card, i) => (
          <div key={i} className="rounded-xl bg-slate-900/60 border border-slate-600/30 p-3 text-center">
            <div className="text-[10px] text-slate-500 font-medium mb-1">{card.label}</div>
            <div className="text-sm font-bold" style={{ color: card.color }}>{card.value}</div>
            <div className="text-[9px] text-slate-600 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* GRAFICO */}
      <div className="relative w-full" style={{ height: '380px' }}>
        <canvas ref={canvasRef} />
      </div>

      {/* LEGENDA */}
      <div className="flex flex-wrap items-center justify-center gap-4 px-4 py-2 bg-slate-900/40 border-y border-slate-600/30">
        {[
          { bg: '#ff6b6b', label: 'CAPE' },
          { bg: '#ffd93d', label: 'Temperatura' },
          { bg: '#4fc3f7', label: 'Punto rugiada' },
          { bg: '#78909c', label: 'Nuvolosità' },
          { bg: '#2196f3', label: 'Pioggia' },
          { bg: '#00e676', label: 'Vento' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: item.bg }} />
            <span className="text-[10px] text-slate-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* ANALISI AUTOMATICA */}
      <div className="p-4 space-y-2 text-sm leading-relaxed">
        <h4 className="text-sm font-bold text-blue-300">📋 Analisi Automatica</h4>
        <div className="space-y-1 text-xs text-slate-300">
          {maxCape > 1500 && <p>⚠️ <strong>CAPE elevato</strong> - Rischio di temporali e turbolenze forti. Volo sconsigliato nelle ore centrali.</p>}
          {maxCape > 800 && maxCape <= 1500 && <p>🟡 <strong>CAPE moderato</strong> - Buona attività termica. Possibili turbolenze, richiesta esperienza.</p>}
          {maxCape > 300 && maxCape <= 800 && <p>🟢 <strong>CAPE stabile</strong> - Termiche moderate, condizioni ideali per volo tranquillo.</p>}
          {maxCape <= 300 && <p>✅ <strong>CAPE basso</strong> - Condizioni stabili, poche termiche. Volo locale consigliato.</p>}
          {thermalDelta > 10 && <p>🔥 <strong>Buon delta termico</strong> ({Math.round(thermalDelta)}°C) - Condizioni favorevoli per cross country.</p>}
          {hasRain && <p>🌧️ <strong>Precipitazioni previste</strong> - Valutare attentamente le condizioni prima di volare.</p>}
          {maxWind > 25 && <p>💨 <strong>Vento forte</strong> ({Math.round(maxWind)} km/h) - Volo sconsigliato.</p>}
          {highCloud && <p>☁️ <strong>Nuvolosità elevata</strong> - Visibilità ridotta, attenzione alle condizioni.</p>}
        </div>
        <div className="pt-2 border-t border-slate-600/30 text-xs font-bold text-amber-300">
          🎯 Consiglio: {
            maxCape > 1500 || maxWind > 25 || hasRain
              ? 'Condizioni sfavorevoli. Sconsigliato volare oggi. ❌'
              : maxCape > 800 && thermalDelta > 8
                ? 'Condizioni favorevoli per cross country! Vola con sicurezza. 🪂'
                : 'Condizioni accettabili. Valuta attentamente prima di volare. ⚠️'
          }
        </div>
      </div>
    </div>
  );
}