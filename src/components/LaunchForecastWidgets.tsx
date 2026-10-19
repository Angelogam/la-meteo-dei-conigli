"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MapPinned, Wind, Info } from "lucide-react";

interface LaunchForecastWidgetsProps {
  lat: number;
  lon: number;
  altitude: number;
  siteName: string;
}

export default function LaunchForecastWidgets({
  lat,
  lon,
  altitude,
  siteName,
}: LaunchForecastWidgetsProps) {
  const [mapReady, setMapReady] = useState(false);
  const validCoordinates = Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

  useEffect(() => { setMapReady(false); }, [lat, lon]);

  const xcThermUrl = useMemo(() => {
    if (!validCoordinates) return "https://xctherm.com/icon?lang=it";
    const params = new URLSearchParams({
      lang: "it",
      lat: lat.toFixed(5),
      lon: lon.toFixed(5),
      zoom: "7.5",
    });
    return `https://xctherm.com/icon?${params.toString()}`;
  }, [lat, lon, validCoordinates]);

  return (
    <section
      className="launch-forecast-widget space-y-4"
      aria-labelledby="launch-map-title"
      data-testid="launch-forecast-widget"
    >
      <div className="launch-widget-heading flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="launch-widget-kicker flex items-center gap-2">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            MAPPA METEO INTERATTIVA · ICON
          </p>
          <h2 id="launch-map-title" className="launch-widget-title">
            Vento e nuvole attorno a {siteName}
          </h2>
          <p className="launch-widget-subtitle">
            {altitude.toLocaleString("it-IT")} m s.l.m. · Centro mappa sulle coordinate del decollo selezionato
          </p>
        </div>
        <a
          className="launch-widget-open"
          href={xcThermUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Apri a schermo intero
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      {validCoordinates ? (
        <div
          className={`launch-xctherm-frame ${mapReady ? "is-ready" : "is-loading"}`}
          key={`${lat.toFixed(5)}-${lon.toFixed(5)}`}
        >
          <iframe
            title={`Mappa XC Therm di vento, nuvolosità e precipitazioni per ${siteName}`}
            src={xcThermUrl}
            width="100%"
            height="100%"
            loading="lazy"
            allowFullScreen
            allow="geolocation"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => window.setTimeout(() => setMapReady(true), 1800)}
          />
          {!mapReady && (
            <div className="launch-xctherm-loading" role="status" aria-live="polite">
              <span className="launch-xctherm-spinner" aria-hidden="true" />
              <strong>Caricamento mappa XC Therm…</strong>
              <span>Se non compare, apri la mappa in una nuova scheda.</span>
            </div>
          )}
        </div>
      ) : (
        <div className="launch-widget-empty" role="status">
          <Info className="h-5 w-5 shrink-0" aria-hidden="true" />
          Coordinate del decollo non valide: la mappa non può essere centrata.
        </div>
      )}

      <div className="launch-provider-footer">
        <div className="launch-provider-copy">
          <span className="launch-provider-icon"><Wind className="h-4 w-4" aria-hidden="true" /></span>
          <div>
            <strong>Confronta con Flybubble Weather</strong>
            <p>La previsione incorporata Flybubble richiede l’ID del singolo sito. I codici di esempio di Vallouise e Vaujany non vengono riutilizzati per questo decollo.</p>
          </div>
        </div>
        <a
          className="launch-widget-open launch-widget-open-secondary"
          href="https://weather.flybubble.com/it/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cerca {siteName}
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
