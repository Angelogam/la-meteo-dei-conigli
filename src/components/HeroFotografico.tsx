"use client";

import "./hero-fotografico.css";
import { Mountain, Thermometer, Wind, Compass } from "lucide-react";

interface HeroFotograficoProps {
  siteName?: string;
  elevation?: number;
  temperature?: number;
  windSpeed?: number;
  windDir?: number;
  isLoading?: boolean;
}

function windCardinale(deg?: number): string | undefined {
  if (deg === undefined || Number.isNaN(deg)) return undefined;
  const settori = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
  return settori[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export default function HeroFotografico({
  siteName,
  elevation,
  temperature,
  windSpeed,
  windDir,
  isLoading = false,
}: HeroFotograficoProps) {
  const cardinale = windCardinale(windDir);
  const hasWeather = typeof temperature === "number" || typeof windSpeed === "number";

  return (
    <section
      className="hero-foto"
      aria-label="La Meteo dei Conigli — parapendio in volo sopra le montagne"
    >
      <img
        src="/hero-parapendio-alpi.jpg"
        alt=""
        className="hero-foto__img"
        width="1920"
        height="960"
        fetchPriority="high"
        decoding="async"
        aria-hidden="true"
      />
      <div className="hero-foto__scrim" aria-hidden="true" />

      <div className="hero-foto__content">
        <p className="hero-foto__kicker">Dashboard meteo · Volo libero</p>
        <h1 className="hero-foto__title">La Meteo dei Conigli</h1>
        <p className="hero-foto__motto">Il cielo non è il limite. È solo l&rsquo;inizio.</p>

        {(siteName || hasWeather || isLoading) && (
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
            {typeof windSpeed === "number" && (
              <span className="hero-foto__chip">
                <Wind aria-hidden="true" />
                <strong>{Math.round(windSpeed)} km/h</strong>
                {cardinale && <small>da {cardinale}</small>}
              </span>
            )}
            {hasWeather && (
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

      <p className="hero-foto__credit" aria-hidden="true">Parapendio sulle Alpi</p>
    </section>
  );
}
