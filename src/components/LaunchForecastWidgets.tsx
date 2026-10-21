"use client";

import { useMemo } from "react";
import { ExternalLink, MapPinned } from "lucide-react";

interface LaunchForecastWidgetsProps {
  lat: number;
  lon: number;
  altitude: number;
  siteName: string;
}

/**
 * Embedded XC Therm ICON-D2 map. The actual map runs on XC Therm's domain,
 * so the app can set its center and viewport but cannot edit its internal UI.
 */
export default function LaunchForecastWidgets({
  lat,
  lon,
  altitude,
  siteName,
}: LaunchForecastWidgetsProps) {
  const validCoordinates = Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;

  const mapUrl = useMemo(() => {
    const params = new URLSearchParams({
      lang: "it",
      lat: lat.toFixed(5),
      lon: lon.toFixed(5),
      zoom: "7.2",
    });
    return `https://xctherm.com/icon?${params.toString()}`;
  }, [lat, lon]);

  return (
    <section className="xctherm-launch-map" aria-labelledby="xctherm-launch-map-title" data-testid="xctherm-launch-map">
      <header className="xctherm-launch-map-header">
        <div>
          <p className="xctherm-launch-map-kicker"><MapPinned size={15} aria-hidden="true" /> MAPPA METEO · ICON-D2</p>
          <h3 id="xctherm-launch-map-title">Meteo e vento attorno a {siteName || "questo decollo"}</h3>
          <p>{Math.round(lat * 10000) / 10000}, {Math.round(lon * 10000) / 10000} · Quota decollo {Math.round(altitude).toLocaleString("it-IT")} m</p>
        </div>
        {validCoordinates && (
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="xctherm-open-map">
            Apri mappa completa <ExternalLink size={15} aria-hidden="true" />
          </a>
        )}
      </header>

      {validCoordinates ? (
        <div className="xctherm-launch-map-frame">
          <iframe
            title={`Mappa XC Therm ICON-D2 per ${siteName || "decollo selezionato"}`}
            width="100%"
            height="100%"
            style={{ minHeight: 600, border: 0 }}
            src={mapUrl}
            allowFullScreen
            allow="geolocation"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <div className="xctherm-launch-map-error" role="status">
          Coordinate non valide: non è possibile centrare la mappa sul decollo selezionato.
        </div>
      )}
      <p className="xctherm-launch-map-caption">
        Mappa esterna XC Therm. Il grafico aerologico personalizzato dell’app è riportato subito sotto.
      </p>
    </section>
  );
}
