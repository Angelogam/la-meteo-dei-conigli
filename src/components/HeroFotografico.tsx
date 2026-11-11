"use client";

import "./hero-fotografico.css";
import { ArrowUp, Compass, Gauge, Mountain, Thermometer, Wind } from "lucide-react";

/* Dati REALI del giorno (calcolati in Index.tsx dalle stesse fonti della pagina:
   Open-Meteo corrente + orari del giorno + verdetto di generateForecast). */
export interface PromoWindRow {
  q: string;
  v: string;
  s: string;
  /** direzione meteorologica in gradi (vento da N = 0) — per la freccia di flusso */
  deg?: number;
  /** velocità in km/h già arrotondata */
  spd?: number;
}

export interface PromoData {
  site?: string;
  elev?: number;
  dateLabel?: string;
  wind?: PromoWindRow[];
  zero?: number | null;
  volabile?: number | null;
  gust?: string;
  verdict?: "GO" | "ATTENZIONE" | "NO GO";
}

interface HeroFotograficoProps {
  siteName?: string;
  elevation?: number;
  temperature?: number;
  windSpeed?: number;
  windDir?: number;
  promo?: PromoData | null;
  isLoading?: boolean;
}

function windCardinale(deg?: number): string | undefined {
  if (deg === undefined || Number.isNaN(deg)) return undefined;
  const settori = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
  return settori[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

const VERDICT_LABEL: Record<NonNullable<PromoData["verdict"]>, string> = {
  GO: "SI VOLA",
  "ATTENZIONE": "CON CAUTELA",
  "NO GO": "MEGLIO NO",
};

/* Titolo del sito: una sola hero cinematografica con il bollettino REALE del giorno
   incorporato. Nessun iframe: foto + testo + dati sono React/CSS nativi, quindi il
   titolo è SEMPRE presente (funziona anche con movimento ridotto, adblocker o rete lenta). */
export default function HeroFotografico({
  siteName,
  elevation,
  temperature,
  windSpeed,
  windDir,
  promo,
  isLoading = false,
}: HeroFotograficoProps) {
  const cardinale = windCardinale(windDir);
  const verdict = promo?.verdict;
  const verdictClass = verdict === "GO" ? "is-go" : verdict === "NO GO" ? "is-nogo" : verdict ? "is-caution" : "";

  return (
    <section
      className="hero-foto"
      aria-label="La Meteo dei Conigli — il bollettino dei piloti, per i piloti"
    >
      <img
        src="/hero-parapendio-alpi-v2.jpg"
        alt=""
        className="hero-foto__img"
        width="2400"
        height="1021"
        fetchPriority="high"
        decoding="async"
        aria-hidden="true"
      />
      <div className="hero-foto__scrim" aria-hidden="true" />

      <div className="hero-foto__inner">
        {/* colonna sinistra: titolo */}
        <div className="hero-foto__content">
          <p className="hero-foto__kicker">Bollettino dei piloti, per i piloti</p>
          <h1 className="hero-foto__title">La Meteo dei Conigli</h1>
          <p className="hero-foto__motto">Il cielo non è il limite. È solo l&rsquo;inizio.</p>

          {(siteName || typeof temperature === "number" || isLoading) && (
            <div className="hero-foto__chips" role="status" aria-live="polite">
              {isLoading && !siteName && (
                <span className="hero-foto__chip"><span className="hero-foto__chip-spinner" />Carico il decollo…</span>
              )}
              {siteName && (
                <span className="hero-foto__chip">
                  <Mountain aria-hidden="true" />
                  <strong>{siteName}</strong>
                  {elevation !== undefined && <small>{elevation.toLocaleString("it-IT")} m</small>}
                </span>
              )}
              {typeof temperature === "number" && (
                <span className="hero-foto__chip">
                  <Thermometer aria-hidden="true" />
                  <strong>{Math.round(temperature)}°C</strong>
                </span>
              )}
              {typeof windSpeed === "number" && windCardinale(windDir) && (
                <span className="hero-foto__chip">
                  <Wind aria-hidden="true" />
                  <strong>{Math.round(windSpeed)} km/h</strong>
                  <small>da {cardinale}</small>
                </span>
              )}
              {typeof temperature === "number" && (
                <span className="hero-foto__chip hero-foto__chip--live">
                  <span className="hero-foto__live-dot" /> Live
                </span>
              )}
            </div>
          )}

          <div className="hero-foto__actions">
            <button
              type="button"
              className="hero-foto__cta"
              onClick={() => document.getElementById("overview")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <Compass aria-hidden="true" />
              Vai alla dashboard
            </button>
            <button
              type="button"
              className="hero-foto__cta hero-foto__cta--ghost"
              onClick={() => document.getElementById("flight-site-list")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Scegli il decollo
            </button>
          </div>
        </div>

        {/* colonna destra: bollettino REALE del giorno (nessun dato inventato) */}
        <aside className="hero-bulletin" aria-label="Bollettino del giorno in breve">
          <header className="hero-bulletin__head">
            <span className={`hero-bulletin__verdict ${verdictClass}`}>
              {verdict ? VERDICT_LABEL[verdict] : "…"}
            </span>
            {promo?.volabile != null && (
              <span className="hero-bulletin__volabile">
                <Gauge aria-hidden="true" />
                volabile <strong>{Math.round(promo.volabile)}%</strong>
              </span>
            )}
          </header>

          <p className="hero-bulletin__where">
            <strong>{promo?.site ?? siteName ?? "Decollo"}</strong>
            {(promo?.elev ?? elevation) !== undefined && (
              <span> · {(promo?.elev ?? elevation)?.toLocaleString("it-IT")} m s.l.m.</span>
            )}
            {promo?.dateLabel && <em>{promo.dateLabel}</em>}
          </p>

          <div className="hero-bulletin__rows">
            {(promo?.wind?.length ? promo.wind : [null, null, null]).slice(0, 3).map((row, i) => (
              <div className="hero-bulletin__row" key={i}>
                {row?.deg != null ? (
                  <span
                    className="hero-bulletin__arrow"
                    style={{ transform: `rotate(${(row.deg + 180) % 360}deg)` }}
                    aria-hidden="true"
                  >
                    <ArrowUp />
                  </span>
                ) : (
                  <span className="hero-bulletin__arrow hero-bulletin__arrow--empty" aria-hidden="true"><ArrowUp /></span>
                )}
                <span className="hero-bulletin__quota">{row?.q ?? "in quota"}</span>
                <span className="hero-bulletin__val">
                  {row ? (
                    <>
                      <strong>{row.spd != null ? `${row.spd}` : row.v}</strong>
                      <small> km/h{row.deg != null ? ` da ${windCardinale(row.deg)}` : ""}</small>
                    </>
                  ) : (
                    <small>—</small>
                  )}
                </span>
                <span className="hero-bulletin__src">{row?.s ?? "dati in arrivo"}</span>
              </div>
            ))}
          </div>

          <footer className="hero-bulletin__foot">
            <span><strong>Zero termico</strong> {promo?.zero != null ? `${promo.zero} m` : "—"}</span>
            <span><strong>Raffiche</strong> {promo?.gust ?? "—"}</span>
            <span className="hero-bulletin__fonte">Fonte: Open-Meteo</span>
          </footer>
        </aside>
      </div>

      <p className="hero-foto__credit" aria-hidden="true">Parapendio sulle Alpi · foto Unsplash</p>
    </section>
  );
}
