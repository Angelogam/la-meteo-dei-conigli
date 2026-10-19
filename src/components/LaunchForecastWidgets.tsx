"use client";

import { useMemo } from "react";
import { ExternalLink, MapPinned } from "lucide-react";

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
  const validCoordinates =
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;

  const mapUrl = useMemo(() => {
    const params = new URLSearchParams({
      lang: "it",
      lat: Number.isFinite(lat) ? lat.toFixed(5) : "44.9",
      lon: Number.isFinite(lon) ? lon.toFixed(5) : "7.3",
      zoom: "7.5",
    });
    return `https://xctherm.com/icon?${params.toString()}`;
  }, [lat, lon]);

  return (
    <section className="launch-forecast-widget" aria-labelledby="launch-map-title" data-testid="launch-forecast-widget">
      <div className="launch-widget-heading">
        <div className="launch-widget-title-group">
          <p className="launch-widget-kicker"><MapPinned className="h-4 w-4" aria-hidden="true" /> MAPPA METEO INTERATTIVA · ICON-D2</p>
          <h2 id="launch-map-title">Vento e nuvole attorno a {siteName}</h2>
          <p>{altitude.toLocaleString("it-IT")} m s.l.m. · Centro mappa impostato sul decollo selezionato</p>
        </div>
        <a className="launch-widget-open" href={mapUrl} target="_blank" rel="noopener noreferrer">
          Apri a schermo intero <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      {validCoordinates ? (
        <div className="launch-xctherm-frame">
          <iframe
            title={`Mappa XC Therm ICON-D2 di vento e meteo per ${siteName}`}
            src={mapUrl}
            width="100%"
            height="100%"
            loading="lazy"
            allowFullScreen
            allow="geolocation"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <div className="launch-widget-empty" role="status">
          Le coordinate del decollo non sono valide: apri la mappa completa per esplorare il meteo.
        </div>
      )}

      <p className="launch-widget-caption">
        Mappa interattiva XC Therm. Se non viene caricata all’interno della pagina, usa “Apri a schermo intero”.
        La mappa esterna mostra il modello ICON-D2; le previsioni termiche e il windgram qui sotto usano i dati disponibili nella tua app.
      </p>
    </section>
  );
}
