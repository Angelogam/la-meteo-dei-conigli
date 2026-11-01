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

function HeroGlider({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 150 82" aria-hidden="true" focusable="false">
      <path className="hero-foto-glider-wing" d="M12 27 Q75 -8 138 27 Q76 43 12 27 Z" />
      <path className="hero-foto-glider-line" d="M28 29 L68 58 M122 29 L82 58 M49 34 L68 58 M101 34 L82 58" />
      <circle className="hero-foto-glider-pilot-head" cx="75" cy="57" r="4" />
      <path className="hero-foto-glider-pilot" d="M75 61 L75 70 M75 70 L69 77 M75 70 L81 77" />
    </svg>
  );
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

      <HeroGlider className="hero-foto__glider hero-foto__glider--one" />
      <HeroGlider className="hero-foto__glider hero-foto__glider--two" />

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
