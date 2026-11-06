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

      {/*
        Stormo di parapendii stilizzati — SVG puro animato SOLO via keyframes CSS
        (hero-foto-fly-ltr/rtl + hero-foto-bob, vedi hero-fotografico.css).
        Livelli: foto (z -2) < scrim (z -1) < stormo (z 0) < testo (z 1).
        I velivoli restano nel 55% superiore dell'hero e non intercettano click.
      */}
      <svg
        className="hero-foto__flock"
        viewBox="0 0 1440 560"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="hero-flock-grad-emerald" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#31CE8B" />
            <stop offset="100%" stopColor="#0e9c6e" />
          </linearGradient>
          <linearGradient id="hero-flock-grad-orange" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#D97A2B" />
          </linearGradient>
          <linearGradient id="hero-flock-grad-cyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38d9ff" />
            <stop offset="100%" stopColor="#1391c9" />
          </linearGradient>
          <linearGradient id="hero-flock-grad-white" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#b9d7e6" />
          </linearGradient>
        </defs>

        {/* 1 — smeraldo, sinistra → destra */}
        <g className="hero-foto__glider hero-foto__glider--1" transform="translate(150 96)">
          <g className="hero-foto__glider-track">
            <g className="hero-foto__glider-bob">
              <g className="hero-foto__glider-art" transform="scale(1)">
                <path d="M-46 0 C-30 -24 30 -24 46 0 Q0 -10 -46 0 Z" fill="url(#hero-flock-grad-emerald)" stroke="rgba(6,18,30,.28)" strokeWidth=".8" />
                <path d="M-24 -14.6 L-24 -4.4 M0 -18 L0 -5.4 M24 -14.6 L24 -4.4" fill="none" stroke="rgba(6,18,30,.30)" strokeWidth="1" strokeLinecap="round" />
                <path d="M-44 -.5 L0 28.5 M-16 -4.4 L0 28.5 M16 -4.4 L0 28.5 M44 -.5 L0 28.5" fill="none" stroke="rgba(8,20,34,.55)" strokeWidth=".9" strokeLinecap="round" />
                <circle cx="0" cy="32.5" r="4.3" fill="#0b2239" />
                <path d="M-5.5 37.5 Q0 35 5.5 37.5 L4.6 47.5 Q0 51 -4.6 47.5 Z" fill="#14344f" />
              </g>
            </g>
          </g>
        </g>

        {/* 2 — arancio, sinistra → destra, piccolo e più basso */}
        <g className="hero-foto__glider hero-foto__glider--2" transform="translate(520 168)">
          <g className="hero-foto__glider-track">
            <g className="hero-foto__glider-bob">
              <g className="hero-foto__glider-art" transform="scale(.72)">
                <path d="M-46 0 C-30 -24 30 -24 46 0 Q0 -10 -46 0 Z" fill="url(#hero-flock-grad-orange)" stroke="rgba(6,18,30,.28)" strokeWidth=".8" />
                <path d="M-24 -14.6 L-24 -4.4 M0 -18 L0 -5.4 M24 -14.6 L24 -4.4" fill="none" stroke="rgba(6,18,30,.30)" strokeWidth="1" strokeLinecap="round" />
                <path d="M-44 -.5 L0 28.5 M-16 -4.4 L0 28.5 M16 -4.4 L0 28.5 M44 -.5 L0 28.5" fill="none" stroke="rgba(8,20,34,.55)" strokeWidth=".9" strokeLinecap="round" />
                <circle cx="0" cy="32.5" r="4.3" fill="#0b2239" />
                <path d="M-5.5 37.5 Q0 35 5.5 37.5 L4.6 47.5 Q0 51 -4.6 47.5 Z" fill="#14344f" />
              </g>
            </g>
          </g>
        </g>

        {/* 3 — ciano, destra → sinistra (arte specchiata via scale(-1)) */}
        <g className="hero-foto__glider hero-foto__glider--3" transform="translate(880 128)">
          <g className="hero-foto__glider-track hero-foto__glider-track--rtl">
            <g className="hero-foto__glider-bob">
              <g className="hero-foto__glider-art" transform="scale(-.85 .85)">
                <path d="M-46 0 C-30 -24 30 -24 46 0 Q0 -10 -46 0 Z" fill="url(#hero-flock-grad-cyan)" stroke="rgba(6,18,30,.28)" strokeWidth=".8" />
                <path d="M-24 -14.6 L-24 -4.4 M0 -18 L0 -5.4 M24 -14.6 L24 -4.4" fill="none" stroke="rgba(6,18,30,.30)" strokeWidth="1" strokeLinecap="round" />
                <path d="M-44 -.5 L0 28.5 M-16 -4.4 L0 28.5 M16 -4.4 L0 28.5 M44 -.5 L0 28.5" fill="none" stroke="rgba(8,20,34,.55)" strokeWidth=".9" strokeLinecap="round" />
                <circle cx="0" cy="32.5" r="4.3" fill="#0b2239" />
                <path d="M-5.5 37.5 Q0 35 5.5 37.5 L4.6 47.5 Q0 51 -4.6 47.5 Z" fill="#14344f" />
              </g>
            </g>
          </g>
        </g>

        {/* 4 — bianco, destra → sinistra, piccolo e in quota bassa */}
        <g className="hero-foto__glider hero-foto__glider--4" transform="translate(1150 210)">
          <g className="hero-foto__glider-track hero-foto__glider-track--rtl">
            <g className="hero-foto__glider-bob">
              <g className="hero-foto__glider-art" transform="scale(-.58 .58)">
                <path d="M-46 0 C-30 -24 30 -24 46 0 Q0 -10 -46 0 Z" fill="url(#hero-flock-grad-white)" stroke="rgba(6,18,30,.28)" strokeWidth=".8" />
                <path d="M-24 -14.6 L-24 -4.4 M0 -18 L0 -5.4 M24 -14.6 L24 -4.4" fill="none" stroke="rgba(6,18,30,.30)" strokeWidth="1" strokeLinecap="round" />
                <path d="M-44 -.5 L0 28.5 M-16 -4.4 L0 28.5 M16 -4.4 L0 28.5 M44 -.5 L0 28.5" fill="none" stroke="rgba(8,20,34,.55)" strokeWidth=".9" strokeLinecap="round" />
                <circle cx="0" cy="32.5" r="4.3" fill="#0b2239" />
                <path d="M-5.5 37.5 Q0 35 5.5 37.5 L4.6 47.5 Q0 51 -4.6 47.5 Z" fill="#14344f" />
              </g>
            </g>
          </g>
        </g>

        {/* 5 — arancio grande, sinistra → destra, in cima al quadro */}
        <g className="hero-foto__glider hero-foto__glider--5" transform="translate(700 58)">
          <g className="hero-foto__glider-track">
            <g className="hero-foto__glider-bob">
              <g className="hero-foto__glider-art" transform="scale(1.15)">
                <path d="M-46 0 C-30 -24 30 -24 46 0 Q0 -10 -46 0 Z" fill="url(#hero-flock-grad-orange)" stroke="rgba(6,18,30,.28)" strokeWidth=".8" />
                <path d="M-24 -14.6 L-24 -4.4 M0 -18 L0 -5.4 M24 -14.6 L24 -4.4" fill="none" stroke="rgba(6,18,30,.30)" strokeWidth="1" strokeLinecap="round" />
                <path d="M-44 -.5 L0 28.5 M-16 -4.4 L0 28.5 M16 -4.4 L0 28.5 M44 -.5 L0 28.5" fill="none" stroke="rgba(8,20,34,.55)" strokeWidth=".9" strokeLinecap="round" />
                <circle cx="0" cy="32.5" r="4.3" fill="#0b2239" />
                <path d="M-5.5 37.5 Q0 35 5.5 37.5 L4.6 47.5 Q0 51 -4.6 47.5 Z" fill="#14344f" />
              </g>
            </g>
          </g>
        </g>
      </svg>

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
