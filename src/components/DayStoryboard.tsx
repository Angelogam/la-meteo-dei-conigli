"use client";

import React, { useMemo } from "react";
import { Cloud, CloudRain, Sun, Thermometer, Wind, Sunrise, Sunset } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface DayStoryboardProps {
  dayData: HourData[];
  siteName: string;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
}

type Period = { title: string; time: string; start: number; end: number; icon: React.ReactNode; tone: string; note: string };

const PERIODS: Period[] = [
  { title: "Mattina", time: "08–11", start: 8, end: 11, icon: <Sunrise />, tone: "morning", note: "Avvio della giornata" },
  { title: "Centrale", time: "12–15", start: 12, end: 15, icon: <Sun />, tone: "midday", note: "Fascia di massimo riscaldamento" },
  { title: "Pomeriggio", time: "16–19", start: 16, end: 19, icon: <Sunset />, tone: "evening", note: "Evoluzione nel pomeriggio" },
];

function average(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

function fmt(value: number | null, digits = 0): string {
  return value === null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

function weatherLabel(cloud: number | null, rain: number | null): string {
  if (rain !== null && rain >= 0.5) return "Possibili precipitazioni";
  if (cloud === null) return "Dati incompleti";
  if (cloud >= 80) return "Cielo molto nuvoloso";
  if (cloud >= 45) return "Nuvolosità variabile";
  return "Più spazio al sole";
}

function lineSegments<T>(items: T[], getY: (item: T) => number | null, getX: (item: T, index: number) => number): string[] {
  const segments: string[] = [];
  let current: string[] = [];
  items.forEach((item, index) => {
    const y = getY(item);
    if (y === null || !Number.isFinite(y)) {
      if (current.length) segments.push(current.join(" "));
      current = [];
      return;
    }
    current.push(`${getX(item, index)},${y}`);
  });
  if (current.length) segments.push(current.join(" "));
  return segments.filter(segment => segment.includes(" "));
}

export default function DayStoryboard({ dayData, siteName, selectedHour, onHourSelect }: DayStoryboardProps) {
  const timeline = useMemo(() => PERIODS.map((p) => {
    const hours = dayData.filter((h) => {
      const hour = new Date(h.time).getHours();
      return hour >= p.start && hour <= p.end;
    });
    return {
      ...p,
      hours,
      temp: average(hours.map(h => h.temperature)),
      wind: average(hours.map(h => h.windSpeed)),
      gust: average(hours.map(h => h.windGusts)),
      cloud: average(hours.map(h => h.cloudCover)),
      rain: average(hours.map(h => h.precipitation)),
    };
  }), [dayData]);

  const chart = dayData.filter((h) => {
    const hour = new Date(h.time).getHours();
    return hour >= 7 && hour <= 20 && (h.temperature != null || h.windSpeed != null);
  });
  const temps = chart.map(h => h.temperature).filter((v): v is number => v != null && Number.isFinite(v));
  const winds = chart.map(h => h.windSpeed).filter((v): v is number => v != null && Number.isFinite(v));
  const minT = temps.length ? Math.floor(Math.min(...temps) - 1) : 0;
  const maxT = temps.length ? Math.ceil(Math.max(...temps) + 1) : 1;
  const maxWind = winds.length ? Math.max(10, Math.ceil(Math.max(...winds) / 5) * 5) : 10;
  const xFor = (_h: HourData, index: number) => chart.length <= 1 ? 50 : 8 + index * 84 / (chart.length - 1);
  const tempY = (h: HourData) => h.temperature == null || !Number.isFinite(h.temperature)
    ? null : 46 - ((h.temperature - minT) / Math.max(1, maxT - minT)) * 34;
  const windY = (h: HourData) => h.windSpeed == null || !Number.isFinite(h.windSpeed)
    ? null : 46 - (h.windSpeed / maxWind) * 34;
  const tempSegments = lineSegments(chart, tempY, xFor);
  const windSegments = lineSegments(chart, windY, xFor);
  const hasData = dayData.length > 0;

  return (
    <section className="storyboard-panel" aria-labelledby="storyboard-title">
      <div className="storyboard-heading">
        <div>
          <p className="storyboard-eyebrow">LA GIORNATA, ORA PER ORA</p>
          <h2 id="storyboard-title">Come evolve il meteo</h2>
          <p className="storyboard-subtitle">{siteName} · valori medi delle fasce orarie disponibili</p>
        </div>
        <div className="storyboard-legend" aria-label="Legenda del grafico">
          <span className="legend-temp" /> Temperatura (°C)
          <span className="legend-wind" /> Vento (km/h)
        </div>
      </div>

      {!hasData ? (
        <div className="storyboard-empty" role="status">Le previsioni orarie non sono ancora disponibili. Riprova tra poco.</div>
      ) : (
        <>
          <div className="storyboard-periods">
            {timeline.map((p) => {
              const targetHour = p.hours.length
                ? new Date(p.hours.reduce((best, item) => Math.abs(new Date(item.time).getHours() - (p.start + 1)) < Math.abs(new Date(best.time).getHours() - (p.start + 1)) ? item : best).time).getHours()
                : p.start + 1;
              return (
                <button key={p.title} type="button" className={`story-period ${p.tone}`} onClick={() => onHourSelect(targetHour)} aria-label={`Seleziona la fascia ${p.title}`}>
                  <div className="story-period-top"><span className="story-period-icon">{p.icon}</span><span className="story-period-time">{p.time}</span></div>
                  <h3>{p.title}</h3>
                  <p className="story-weather">{weatherLabel(p.cloud, p.rain)}</p>
                  <div className="story-metrics">
                    <span><Thermometer /> <b>{fmt(p.temp, 1)}°C</b></span>
                    <span><Wind /> <b>{fmt(p.wind)} km/h</b></span>
                    <span><Cloud /> <b>{fmt(p.cloud)}%</b></span>
                    {p.gust !== null && <span><Wind /> <b>Raffiche {fmt(p.gust)} km/h</b></span>}
                    {p.rain !== null && p.rain > 0 && <span><CloudRain /> <b>{fmt(p.rain, 1)} mm/h</b></span>}
                  </div>
                  <span className="story-period-note">{p.note}</span>
                </button>
              );
            })}
          </div>

          <div className="story-chart-card">
            <div className="story-chart-title">
              <div><span className="story-chart-kicker">ANDAMENTO PREVISTO</span><h3>Temperatura e vento</h3></div>
              <span className="story-chart-range">{temps.length ? `${minT}° – ${maxT}°C` : "Temperatura N/D"} · vento fino a {maxWind} km/h</span>
            </div>
            <div className="story-chart-scroll">
              <svg className="story-temp-chart" viewBox="0 0 100 56" preserveAspectRatio="none" role="img" aria-label="Grafico orario di temperatura e vento. L'asse verticale del vento è normalizzato sulla scala indicata.">
                {[12, 23, 34, 45].map(y => <line key={y} x1="5" y1={y} x2="95" y2={y} stroke="rgba(148,163,184,.16)" strokeWidth=".25" vectorEffect="non-scaling-stroke" />)}
                {tempSegments.map((segment, i) => <polyline key={`temp-${i}`} points={segment} fill="none" stroke="#fb923c" strokeWidth="1.15" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
                {windSegments.map((segment, i) => <polyline key={`wind-${i}`} points={segment} fill="none" stroke="#38bdf8" strokeWidth=".95" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="2 1.5" vectorEffect="non-scaling-stroke" />)}
                {chart.map((h, i) => {
                  const hour = new Date(h.time).getHours();
                  const y = tempY(h);
                  return y === null ? null : <circle key={h.time.toString()} cx={xFor(h, i)} cy={y} r={hour === selectedHour ? 1.45 : .7} fill={hour === selectedHour ? "#fff" : "#fb923c"} stroke={hour === selectedHour ? "#38bdf8" : "#fb923c"} strokeWidth=".35" vectorEffect="non-scaling-stroke" />;
                })}
              </svg>
              <div className="story-hour-buttons">
                {chart.map((h) => {
                  const hour = new Date(h.time).getHours();
                  return <button type="button" key={h.time.toString()} className={hour === selectedHour ? "active" : ""} aria-pressed={hour === selectedHour} onClick={() => onHourSelect(hour)}><span>{String(hour).padStart(2, "0")}</span><b>{h.temperature == null ? "—" : `${Math.round(h.temperature)}°`}</b><small>{h.windSpeed == null ? "—" : `${Math.round(h.windSpeed)} km/h`}</small></button>;
                })}
              </div>
            </div>
          </div>
          <p className="storyboard-disclaimer">Sintesi descrittiva dei dati di previsione, non un giudizio automatico sull'idoneità al volo. Valuta anche vento in quota, raffiche, evoluzione locale e bollettini ufficiali.</p>
        </>
      )}
    </section>
  );
}
