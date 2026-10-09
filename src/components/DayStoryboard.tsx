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

function average(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}
function fmt(value: number | null, digits = 0): string {
  return value === null ? "—" : value.toFixed(digits);
}
function weatherLabel(cloud: number | null, rain: number | null): string {
  if (rain !== null && rain >= 0.5) return "Possibili precipitazioni";
  if (cloud === null) return "Dati incompleti";
  if (cloud >= 80) return "Cielo molto nuvoloso";
  if (cloud >= 45) return "Nuvolosità variabile";
  return "Più spazio al sole";
}

export default function DayStoryboard({ dayData, siteName, selectedHour, onHourSelect }: DayStoryboardProps) {
  const periods: Period[] = [
    { title: "Mattina", time: "08–11", start: 8, end: 11, icon: <Sunrise />, tone: "morning", note: "Avvio della giornata" },
    { title: "Centrale", time: "12–15", start: 12, end: 15, icon: <Sun />, tone: "midday", note: "Fascia di massimo riscaldamento" },
    { title: "Pomeriggio", time: "16–19", start: 16, end: 19, icon: <Sunset />, tone: "evening", note: "Evoluzione nel pomeriggio" },
  ];
  const timeline = useMemo(() => periods.map((p) => {
    const hours = dayData.filter((h) => {
      const d = new Date(h.time);
      return d.getHours() >= p.start && d.getHours() <= p.end;
    });
    return {
      ...p, hours,
      temp: average(hours.map(h => h.temperature)),
      wind: average(hours.map(h => h.windSpeed)),
      gust: average(hours.map(h => h.windGusts)),
      cloud: average(hours.map(h => h.cloudCover)),
      rain: average(hours.map(h => h.precipitation)),
      maxWind: hours.reduce<number | null>((max, h) => h.windSpeed == null ? max : Math.max(max ?? h.windSpeed, h.windSpeed), null),
    };
  }), [dayData, periods]);

  const valid = dayData.filter(h => h.temperature != null || h.windSpeed != null);
  const chart = valid.filter(h => {
    const hr = new Date(h.time).getHours();
    return hr >= 7 && hr <= 20;
  });
  const temps = chart.map(h => h.temperature).filter((v): v is number => v != null && Number.isFinite(v));
  const minT = temps.length ? Math.floor(Math.min(...temps) - 1) : 0;
  const maxT = temps.length ? Math.ceil(Math.max(...temps) + 1) : 1;
  const points = chart.map((h, i) => {
    const t = h.temperature;
    const x = chart.length <= 1 ? 50 : 8 + i * 84 / (chart.length - 1);
    const y = t == null ? null : 46 - ((t - minT) / Math.max(1, maxT - minT)) * 34;
    return { h, x, y, hour: new Date(h.time).getHours() };
  });
  const line = points.filter(p => p.y !== null).map(p => `${p.x},${p.y}`).join(" ");
  const hasData = dayData.length > 0;

  return (
    <section className="storyboard-panel" aria-labelledby="storyboard-title">
      <div className="storyboard-heading">
        <div>
          <p className="storyboard-eyebrow">LA GIORNATA, ORA PER ORA</p>
          <h2 id="storyboard-title">Come evolve il meteo</h2>
          <p className="storyboard-subtitle">{siteName} · valori medi delle fasce orarie disponibili</p>
        </div>
        <div className="storyboard-legend"><span className="legend-temp" /> Temperatura <span className="legend-wind" /> Vento</div>
      </div>

      {!hasData ? (
        <div className="storyboard-empty">Le previsioni orarie non sono ancora disponibili. Riprova tra poco.</div>
      ) : (
        <>
          <div className="storyboard-periods">
            {timeline.map((p) => (
              <button key={p.title} type="button" className={`story-period ${p.tone}`} onClick={() => onHourSelect(p.start + 1)} aria-label={`Seleziona le ore della fascia ${p.title}`}>
                <div className="story-period-top"><span className="story-period-icon">{p.icon}</span><span className="story-period-time">{p.time}</span></div>
                <h3>{p.title}</h3>
                <p className="story-weather">{weatherLabel(p.cloud, p.rain)}</p>
                <div className="story-metrics">
                  <span><Thermometer /> <b>{fmt(p.temp, 1)}°</b></span>
                  <span><Wind /> <b>{fmt(p.wind)} km/h</b></span>
                  <span><Cloud /> <b>{fmt(p.cloud)}%</b></span>
                  {p.rain !== null && p.rain > 0 && <span><CloudRain /> <b>{fmt(p.rain, 1)} mm</b></span>}
                </div>
                <span className="story-period-note">{p.note}</span>
              </button>
            ))}
          </div>

          <div className="story-chart-card">
            <div className="story-chart-title">
              <div><span className="story-chart-kicker">ANDAMENTO PREVISTO</span><h3>Temperatura e vento</h3></div>
              <span className="story-chart-range">{temps.length ? `${minT}° – ${maxT}°C` : "Temperatura N/D"}</span>
            </div>
            <div className="story-chart-scroll">
              <svg className="story-temp-chart" viewBox="0 0 100 56" preserveAspectRatio="none" role="img" aria-label="Andamento della temperatura oraria; seleziona un'ora sotto il grafico">
                {[12, 23, 34, 45].map(y => <line key={y} x1="5" y1={y} x2="95" y2={y} stroke="rgba(148,163,184,.16)" strokeWidth=".25" vectorEffect="non-scaling-stroke" />)}
                {line && <polyline points={line} fill="none" stroke="#fb923c" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
                {points.filter(p => p.y !== null).map(p => <circle key={p.hour} cx={p.x} cy={p.y!} r={p.hour === selectedHour ? 1.35 : .7} fill={p.hour === selectedHour ? "#fff" : "#fb923c"} stroke={p.hour === selectedHour ? "#38bdf8" : "#fb923c"} strokeWidth=".35" vectorEffect="non-scaling-stroke" />)}
              </svg>
              <div className="story-hour-buttons">
                {chart.map((h) => {
                  const hour = new Date(h.time).getHours();
                  return <button type="button" key={h.time.toString()} className={hour === selectedHour ? "active" : ""} onClick={() => onHourSelect(hour)}><span>{String(hour).padStart(2, "0")}</span><b>{h.temperature == null ? "—" : `${Math.round(h.temperature)}°`}</b><small>{h.windSpeed == null ? "—" : `${Math.round(h.windSpeed)} km/h`}</small></button>;
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
