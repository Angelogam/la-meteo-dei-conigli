"use client";

import React, { useMemo, useState } from "react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";
import { getVoloStatus } from "@/utils/volo";
import { Calendar, MapPin, CloudRain } from "lucide-react";
import MeteoconIcon from "./MeteoconIcon";
import { meteoconLabel } from "./meteocon-code";
import "./hourly-cards.css";

interface HourlyCardsProps {
  dayData: HourData[];
  altitude: number;
  selectedHour: number;
  onHourSelect: (hour: number) => void;
  dayLabel?: string;
  siteName?: string;
}

/* ═══════════════════════════════════════════════════════════
   CARD ORARIE INTERATTIVE — una card quadrata premium per ogni
   ora della giornata (09:00 → 19:00), stessa famiglia grafica
   delle card OGGI/DOMANI/DOPPODOMANI.
   ═══════════════════════════════════════════════════════════ */

const STATUS_BASE_SCORE: Record<string, number> = {
  temporale: 0,
  pioggia: 1,
  non_volabile: 2,
  rischioso: 3,
  calma: 4,
  discreto: 6,
  buono: 8,
  ottimo: 9,
};

function ventoTesto(speed: number): string {
  if (speed < 3) return "Calma";
  if (speed < 8) return "Leggero";
  if (speed < 15) return "Moderato";
  if (speed < 22) return "Fresco";
  if (speed < 30) return "Forte";
  return "Molto forte";
}

function direzioneVento(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(deg / 45) % 8];
}

function uvColor(uv: number): string {
  if (uv >= 11) return "#c084fc";
  if (uv >= 8) return "#fb7185";
  if (uv >= 6) return "#fb923c";
  if (uv >= 3) return "#fbbf24";
  return "#34d399";
}

function thermalColor(rateo: number): string {
  if (rateo > 1.5) return "#fb7185";
  if (rateo > 1.0) return "#a78bfa";
  return "#38bdf8";
}

/* Rosa dei venti: freccia che indica la DIREZIONE di flusso (dove va il vento),
   coerente con le frecce del bollettino in hero. */
function WindCompass({ deg, speed }: { deg: number; speed: number | null }) {
  const flow = (deg + 180) % 360;
  const raggio = speed != null ? 8 + Math.min(10, speed * 0.45) : 9;
  return (
    <svg className="hour-card__compass" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(148,197,224,.28)" strokeWidth="1.4" />
      {[
        ["N", 20, 4.4],
        ["O", 4.4, 21.6],
        ["S", 20, 38.2],
        ["E", 33.4, 21.6],
      ].map(([t, x, y]) => (
        <text key={t as string} x={x as number} y={y as number} textAnchor="middle" fontSize="6.5" fontWeight="700" fill="rgba(197,224,240,.75)">{t}</text>
      ))}
      <g transform={`rotate(${flow} 20 20)`} style={{ transition: "transform .8s cubic-bezier(.34,1.4,.5,1)" }}>
        <line x1="20" y1="12" x2="20" y2={28 - raggio * 0} stroke="#7fd4f0" strokeWidth="2.6" strokeLinecap="round" opacity=".9" />
        <polygon points="20,4.5 24,12.5 16,12.5" fill="#7fd4f0" />
      </g>
    </svg>
  );
}

export default function HourlyCards({ dayData, altitude, selectedHour, onHourSelect, dayLabel, siteName }: HourlyCardsProps) {
  const [sortBy, setSortBy] = useState<"ora" | "voto">("ora");

  const rows = useMemo(() => {
    const ore = Array.from({ length: 11 }, (_, i) => i + 9);
    return ore.map((ora) => {
      const h = dayData.find(d => new Date(d.time).getHours() === ora);
      if (!h) return null;
      const t = calcolaTermiche(h, altitude);
      if (!t) return null;
      const v = getVoloStatus(h);
      const now = new Date();
      const oraCorrente = now.getHours();
      const isAdesso = ora === oraCorrente;
      const probPioggia = h.precipitationProba ?? null;
      const humidity = h.humidity != null ? Math.round(h.humidity) : null;
      const dew = h.dewPoint != null ? Math.round(h.dewPoint) : null;
      const pressure = h.surfacePressure ?? h.pressure;
      const visibility = h.visibility != null ? Math.round(h.visibility / 1000) : null;
      const uv = h.uvIndex != null ? Math.round(h.uvIndex * 10) / 10 : null;
      const cape = h.cape != null ? Math.round(h.cape) : null;
      const windDir = h.windDir;
      const windSpeed = h.windSpeed != null ? Math.round(h.windSpeed) : null;
      const windGusts = h.windGusts != null && h.windGusts > 0 ? Math.round(h.windGusts) : null;
      const cloudCover = h.cloudCover != null ? Math.round(h.cloudCover) : null;

      const base = STATUS_BASE_SCORE[v.status] ?? 3;
      const score = Math.max(1, Math.min(10, base + (t.rateo >= 1.5 ? 1 : 0)));

      return {
        ora,
        icona: h.weatherCode,
        temperatura: h.temperature != null ? Math.round(h.temperature) : null,
        feelsLike: h.apparentTemp != null ? Math.round(h.apparentTemp) : null,
        vento: windSpeed,
        ventoTesto: windSpeed != null ? ventoTesto(windSpeed) : "N/D",
        direzione: windDir != null ? direzioneVento(windDir) : null,
        windDirDeg: windDir,
        raffiche: windGusts,
        termiche: t.rateo,
        nuvole: cloudCover,
        nuvoleLow: h.cloudCoverLow != null ? Math.round(h.cloudCoverLow) : 0,
        nuvoleMid: h.cloudCoverMid != null ? Math.round(h.cloudCoverMid) : 0,
        nuvoleHigh: h.cloudCoverHigh != null ? Math.round(h.cloudCoverHigh) : 0,
        pioggia: h.precipitation != null ? h.precipitation : null,
        probPioggia,
        voloIcona: v.icon,
        voloTesto: v.label,
        voloStatus: v.status,
        voloDescrizione: v.description,
        isAdesso,
        humidity,
        dew,
        pressure: pressure != null ? Math.round(pressure) : null,
        visibility,
        uv,
        cape,
        score,
      };
    }).filter((r): r is NonNullable<typeof r> => r != null);
  }, [dayData, altitude]);

  /* Curva temperature della giornata per la sparkline in ogni card */
  const sparkPoints = useMemo(() => {
    if (rows.length < 2) return null;
    const temps = rows.map(r => r.temperatura ?? 0);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const span = Math.max(1, max - min);
    const w = 100;
    const h = 26;
    const pts = temps.map((t, i) => {
      const x = (i / (temps.length - 1)) * (w - 6) + 3;
      const y = h - 5 - ((t - min) / span) * (h - 11);
      return { x, y };
    });
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${h} L${pts[0].x.toFixed(1)},${h} Z`;
    return { pts, line, area, hours: rows.map(r => r.ora) };
  }, [rows]);

  const sortedRows = useMemo(() => {
    if (sortBy === "ora") return rows;
    return [...rows].sort((a, b) => b.score - a.score || a.ora - b.ora);
  }, [rows, sortBy]);

  const dataLabel = useMemo(() => {
    if (dayLabel) return dayLabel;
    if (dayData && dayData.length > 0) {
      const d = dayData[0].time;
      const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
      return `${giorni[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
    }
    return "";
  }, [dayData, dayLabel]);

  if (rows.length === 0) {
    return <div className="text-center py-12 text-slate-400 text-base">Nessun dato disponibile.</div>;
  }

  return (
    <div className="hour-cards">
      {/* Header */}
      <div className="hour-cards__header">
        <div className="hour-cards__header-left">
          <div className="hour-cards__header-icon">
            <Calendar className="w-4 h-4 text-sky-300" />
          </div>
          <div>
            <h3 className="hour-cards__title">Le ore della giornata, una card ciascuna</h3>
            {siteName && (
              <span className="hour-cards__site">
                <MapPin className="w-3 h-3" />
                {siteName}
              </span>
            )}
          </div>
        </div>
        <div className="hour-cards__header-right">
          <div className="hour-cards__sort" role="group" aria-label="Ordinamento delle card orarie">
            <button
              type="button"
              className={sortBy === "ora" ? "is-active" : ""}
              aria-pressed={sortBy === "ora"}
              onClick={() => setSortBy("ora")}
            >
              Per ora
            </button>
            <button
              type="button"
              className={sortBy === "voto" ? "is-active" : ""}
              aria-pressed={sortBy === "voto"}
              onClick={() => setSortBy("voto")}
            >
              Migliori per volo
            </button>
          </div>
          <span className="hour-cards__date">{dataLabel}</span>
        </div>
      </div>

      {/* Griglia di card quadrate */}
      <div className="hour-cards__grid" role="list">
        {sortedRows.map((r) => {
          const active = r.ora === selectedHour;
          const sparkIdx = sparkPoints ? sparkPoints.hours.indexOf(r.ora) : -1;
          const sparkDot = sparkIdx >= 0 && sparkPoints ? sparkPoints.pts[sparkIdx] : null;
          const tCol = thermalColor(r.termiche);
          const uCol = r.uv != null ? uvColor(r.uv) : "#64748b";
          return (
            <button
              type="button"
              role="listitem"
              key={r.ora}
              data-testid={`hour-card-${r.ora}`}
              className={`hour-card hour-card--${r.voloStatus}${active ? " is-selected" : ""}${r.isAdesso ? " is-now" : ""}`}
              onClick={() => onHourSelect(r.ora)}
              aria-pressed={active}
              aria-label={`${String(r.ora).padStart(2, "0")}:00 — ${r.voloTesto}. Temperatura ${r.temperatura != null ? `${r.temperatura} gradi` : "non disponibile"}, vento ${r.vento ?? "non disponibile"} chilometri orari${r.direzione ? ` da ${r.direzione}` : ""}, termiche ${r.termiche.toFixed(1)} metri al secondo, nuvole ${r.nuvole ?? "non disponibili"} percento, indice di volo ${r.score} su 10.`}
              title={r.voloDescrizione}
            >
              {/* Testata: ora + indice volo */}
              <span className="hour-card__head">
                <span className="hour-card__time">
                  {String(r.ora).padStart(2, "0")}:00
                  {r.isAdesso && <em className="hour-card__now">ORA</em>}
                </span>
                <span className="hour-card__score" title="Indice di volo dell'ora (indicativo)">
                  <small>VOLO</small>
                  <strong>{r.score}</strong>
                  <span>/10</span>
                </span>
              </span>

              {/* Cielo: STESSA icona delle card giornaliere (Meteocons animati)
                  + condizione in parole + possibilità di pioggia + temperatura */}
              <span className="hour-card__sky">
                <MeteoconIcon code={typeof r.icona === "number" ? r.icona : null} size="hero" />
                <span className="hour-card__sky-copy">
                  <span className="hour-card__weather">{meteoconLabel(typeof r.icona === "number" ? r.icona : null)}</span>
                  {r.probPioggia != null && r.probPioggia > 0 && (
                    <span className="hour-card__rain-chance"><CloudRain size={11} aria-hidden="true" /> {Math.round(r.probPioggia)}% pioggia</span>
                  )}
                </span>
                <span className="hour-card__temp">
                  <strong>{r.temperatura != null ? `${r.temperatura}°` : "—"}</strong>
                  {r.feelsLike != null && <small>percepiti {r.feelsLike}°</small>}
                </span>
              </span>

              {/* Verdetto volo */}
              <span className={`hour-card__verdict ${r.voloStatus === "ottimo" || r.voloStatus === "buono" ? "is-good" : r.voloStatus === "discreto" ? "is-mid" : r.voloStatus === "calma" ? "is-calm" : "is-bad"}`}>
                <span aria-hidden="true">{r.voloIcona}</span>
                {r.voloTesto}
              </span>

              {/* Metriche */}
              <span className="hour-card__metrics">
                <span className="hour-card__metric hour-card__metric--wind">
                  <span className="hour-card__metric-label">
                    Vento
                    {r.windDirDeg != null && <WindCompass deg={r.windDirDeg} speed={r.vento} />}
                  </span>
                  <span className="hour-card__metric-value">
                    <strong>{r.vento != null ? `${r.vento} km/h` : "N/D"}</strong>
                    <small>
                      {r.direzione ? `${r.direzione} · ` : ""}{r.ventoTesto}
                      {r.raffiche != null ? ` · raffiche ${r.raffiche}` : ""}
                    </small>
                  </span>
                </span>

                <span className="hour-card__metric">
                  <span className="hour-card__metric-label">Termiche</span>
                  <span className="hour-card__metric-value">
                    <strong style={{ color: tCol }}>↑{r.termiche.toFixed(1)} m/s</strong>
                    <span className="hour-card__bar">
                      <i style={{ width: `${Math.min(100, (r.termiche / 3) * 100)}%`, background: tCol }} />
                    </span>
                  </span>
                </span>

                <span className="hour-card__metric">
                  <span className="hour-card__metric-label">Nuvole</span>
                  <span className="hour-card__metric-value">
                    <strong>{r.nuvole != null ? `${r.nuvole}%` : "N/D"}</strong>
                    {r.nuvole != null && (
                      <span className="hour-card__clouds" title={`Basse ${r.nuvoleLow}% · Medie ${r.nuvoleMid}% · Alte ${r.nuvoleHigh}%`}>
                        <i style={{ width: `${r.nuvoleLow}%` }} />
                        <i style={{ width: `${r.nuvoleMid}%` }} />
                        <i style={{ width: `${r.nuvoleHigh}%` }} />
                      </span>
                    )}
                  </span>
                </span>

                <span className="hour-card__metric hour-card__metric--duo">
                  <span>
                    <span className="hour-card__metric-label">Umidità</span>
                    <span className="hour-card__metric-value">
                      <strong>{r.humidity != null ? `${r.humidity}%` : "N/D"}</strong>
                      {r.dew != null && <small>rug. {r.dew}°</small>}
                    </span>
                  </span>
                  <span>
                    <span className="hour-card__metric-label">UV</span>
                    <span className="hour-card__metric-value">
                      <strong style={{ color: uCol }}>{r.uv != null ? r.uv : "N/D"}</strong>
                      {r.uv != null && (
                        <span className="hour-card__bar hour-card__bar--uv">
                          <i style={{ width: `${Math.min(100, r.uv * 9)}%`, background: uCol }} />
                        </span>
                      )}
                    </span>
                  </span>
                </span>

                <span className="hour-card__metric">
                  <span className="hour-card__metric-label">Pioggia</span>
                  <span className="hour-card__metric-value">
                    <strong className={r.pioggia != null && r.pioggia > 0 ? "is-rain" : ""}>
                      {r.pioggia != null ? `${r.pioggia.toFixed(1)} mm` : "—"}
                    </strong>
                    {r.probPioggia != null && r.probPioggia > 0 && (
                      <small>prob. {Math.round(r.probPioggia)}%</small>
                    )}
                  </span>
                </span>
              </span>

              {/* Sparkline della giornata con il punto su quest'ora */}
              {sparkPoints && (
                <svg className="hour-card__spark" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
                  <path d={sparkPoints.area} fill="url(#hourSparkFill)" opacity=".55" />
                  <path d={sparkPoints.line} fill="none" stroke="rgba(126,212,240,.85)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  {sparkDot && (
                    <>
                      <circle cx={sparkDot.x} cy={sparkDot.y} r="3.1" fill="rgba(127,212,240,.28)" />
                      <circle cx={sparkDot.x} cy={sparkDot.y} r="1.7" fill="#8ee6ff" />
                    </>
                  )}
                  <defs>
                    <linearGradient id="hourSparkFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(127,212,240,.5)" />
                      <stop offset="100%" stopColor="rgba(127,212,240,0)" />
                    </linearGradient>
                  </defs>
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="hour-cards__legend">
        <span className="hour-cards__legend-item"><i className="is-good" /> Ottimo / Buono</span>
        <span className="hour-cards__legend-item"><i className="is-mid" /> Discreto</span>
        <span className="hour-cards__legend-item"><i className="is-calm" /> Calma</span>
        <span className="hour-cards__legend-item"><i className="is-bad" /> Rischioso / Non volabile</span>
        <span className="hour-cards__legend-hint">Clicca su una card per sincronizzare windgram, termiche e briefing.</span>
      </div>
    </div>
  );
}
