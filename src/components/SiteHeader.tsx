"use client";

import React from "react";
import {
  Compass,
  Eye,
  Gauge,
  MapPin,
  Mountain,
  Navigation,
  Sun,
  Wind,
} from "lucide-react";
import type { HourData } from "@/types/meteo";
import type { MeteoCurrent } from "@/services/openMeteoService";

interface SiteHeaderProps {
  site_name: string;
  location_name: string;
  orientation: string;
  elevation_m: number;
  currentData: HourData | MeteoCurrent | null;
  sunrise?: string;
  sunset?: string;
  uvIndex?: number;
}

interface WeatherCondition {
  label: string;
  icon: string;
}

/** Open-Meteo uses WMO weather interpretation codes. Unknown codes stay explicit. */
function getWeatherCondition(code: number | null | undefined): WeatherCondition {
  if (code == null) return { label: "Dato non disponibile", icon: "—" };
  if (code === 0) return { label: "Sereno", icon: "☀️" };
  if (code === 1) return { label: "Prevalentemente sereno", icon: "🌤️" };
  if (code === 2) return { label: "Parzialmente nuvoloso", icon: "⛅" };
  if (code === 3) return { label: "Coperto", icon: "☁️" };
  if (code === 45 || code === 48) return { label: "Nebbia", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Pioviggine", icon: "🌦️" };
  if ([61, 63, 65, 66, 67].includes(code)) return { label: "Pioggia", icon: "🌧️" };
  if ([71, 73, 75, 77].includes(code)) return { label: "Neve", icon: "❄️" };
  if ([80, 81, 82].includes(code)) return { label: "Rovesci", icon: "🌧️" };
  if (code === 85 || code === 86) return { label: "Rovesci di neve", icon: "🌨️" };
  if ([95, 96, 99].includes(code)) return { label: "Temporale", icon: "⛈️" };
  return { label: "Condizione non riconosciuta", icon: "—" };
}

function formatVisibility(visibility: number | null | undefined): string {
  if (visibility == null || !Number.isFinite(visibility) || visibility < 0) return "N/D";
  if (visibility >= 10_000) return "10+ km";
  return `${(visibility / 1_000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;
}

export default function SiteHeader({
  site_name,
  location_name,
  orientation,
  elevation_m,
  currentData,
  sunrise,
  sunset,
  uvIndex,
}: SiteHeaderProps) {
  const weatherCode = currentData?.weatherCode ?? null;
  const condition = getWeatherCondition(weatherCode);
  const windSpeed = currentData?.windSpeed;
  const windGusts = currentData?.windGusts;
  const temperature = currentData?.temperature;
  const pressure = currentData?.surfacePressure;
  const visibility = currentData?.visibility;

  return (
    <section className="card header-decollo launch-hero" aria-labelledby="launch-hero-title">
      <div className="launch-hero-top">
        <div className="launch-hero-identity">
          <div className="launch-hero-mark" aria-hidden="true">
            <Navigation />
          </div>
          <div className="launch-hero-copy">
            <div className="launch-hero-kicker">DECOLLO SELEZIONATO</div>
            <h2 id="launch-hero-title">{site_name}</h2>
            <div className="launch-hero-meta" aria-label="Informazioni sul decollo">
              <span><MapPin aria-hidden="true" />{location_name}</span>
              <span><Compass aria-hidden="true" />Esposizione {orientation || "N/D"}</span>
              <span><Mountain aria-hidden="true" />{Number.isFinite(elevation_m) ? `${elevation_m} m s.l.m.` : "Quota N/D"}</span>
              {sunrise && sunset && (
                <span><Sun aria-hidden="true" />{sunrise}–{sunset}</span>
              )}
              {uvIndex != null && Number.isFinite(uvIndex) && (
                <span className={`launch-uv-chip ${uvIndex >= 8 ? "is-high" : uvIndex >= 5 ? "is-moderate" : ""}`}>
                  <Sun aria-hidden="true" />UV {Math.round(uvIndex)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="launch-hero-condition">
          <span className="launch-hero-condition-icon" aria-hidden="true">{condition.icon}</span>
          <div className="launch-hero-condition-copy">
            <span className="launch-hero-section-label">CONDIZIONI ATTUALI</span>
            <strong>{condition.label}</strong>
            <span className="launch-hero-condition-temp">
              {temperature != null && Number.isFinite(temperature) ? `${Math.round(temperature)}°C` : "Temperatura N/D"}
            </span>
          </div>
        </div>
      </div>

      <div className="launch-hero-metrics" aria-label="Misure meteo attuali">
        <div className="launch-metric">
          <span className="launch-metric-icon"><Wind aria-hidden="true" /></span>
          <span className="launch-metric-copy">
            <small>Vento</small>
            <strong>{windSpeed != null && Number.isFinite(windSpeed) ? `${Math.round(windSpeed)} km/h` : "N/D"}</strong>
          </span>
          {windSpeed != null && Number.isFinite(windSpeed) && (
            <span className="launch-metric-detail">
              {currentData?.windDir != null && Number.isFinite(currentData.windDir) ? `${Math.round(currentData.windDir)}°` : ""}
              {windGusts != null && Number.isFinite(windGusts) && windGusts > windSpeed + 5 ? ` · raffiche ${Math.round(windGusts)}` : ""}
            </span>
          )}
        </div>
        <div className="launch-metric">
          <span className="launch-metric-icon"><Gauge aria-hidden="true" /></span>
          <span className="launch-metric-copy">
            <small>Pressione</small>
            <strong>{pressure != null && Number.isFinite(pressure) ? `${Math.round(pressure)} hPa` : "N/D"}</strong>
          </span>
        </div>
        <div className="launch-metric">
          <span className="launch-metric-icon"><Eye aria-hidden="true" /></span>
          <span className="launch-metric-copy">
            <small>Visibilità</small>
            <strong>{formatVisibility(visibility)}</strong>
          </span>
        </div>
      </div>
      {!currentData && (
        <p className="launch-hero-data-note" role="status">I dati meteo attuali non sono ancora disponibili.</p>
      )}
    </section>
  );
}
