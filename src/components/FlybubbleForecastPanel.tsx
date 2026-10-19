"use client";

import { ExternalLink, MapPin, Wind } from "lucide-react";

interface FlybubbleForecastPanelProps {
  siteId: string;
  siteName: string;
  lat: number;
  lon: number;
}

/**
 * Flybubble embed IDs are site-specific. Only add IDs after verifying the
 * matching Flybubble page; never reuse another launch's ID as a fallback.
 */
const FLYBUBBLE_EMBED_IDS: Record<string, string> = {
  // Intentionally empty until matching Piemonte launch IDs are verified.
  // Example format: "verified-site-key": "verified-numeric-id",
};

export default function FlybubbleForecastPanel({
  siteId,
  siteName,
  lat,
  lon,
}: FlybubbleForecastPanelProps) {
  const embedId = FLYBUBBLE_EMBED_IDS[siteId];
  const embedUrl = embedId ? `https://weather.flybubble.com/it/embed/${embedId}` : null;
  const forecastUrl = embedId ? `https://weather.flybubble.com/it/${siteId}-${embedId}` : "https://weather.flybubble.com/it";

  return (
    <section className="flybubble-panel" aria-labelledby="flybubble-panel-title" data-testid="flybubble-forecast-panel">
      <div className="flybubble-panel-header">
        <span className="flybubble-panel-icon" aria-hidden="true"><Wind size={20} /></span>
        <div className="flybubble-panel-heading">
          <p className="flybubble-panel-kicker">PREVISIONE ESTERNA · FLYBUBBLE WEATHER</p>
          <h3 id="flybubble-panel-title">Previsioni per {siteName}</h3>
          <p><MapPin size={13} aria-hidden="true" /> {lat.toFixed(4)}, {lon.toFixed(4)}</p>
        </div>
        <span className={embedUrl ? "flybubble-status is-available" : "flybubble-status"}>
          {embedUrl ? "Widget disponibile" : "Collegamento da verificare"}
        </span>
      </div>

      {embedUrl ? (
        <div className="flybubble-frame-wrap">
          <iframe
            src={embedUrl}
            title={`Previsione Flybubble Weather per ${siteName}`}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="flybubble-frame"
          />
        </div>
      ) : (
        <div className="flybubble-unavailable" role="status">
          <div className="flybubble-unavailable-mark" aria-hidden="true"><MapPin size={19} /></div>
          <div>
            <strong>Widget specifico non ancora verificato</strong>
            <p>Per non mostrarti la previsione di un altro luogo, questo riquadro non carica Vaujany o altri siti non corrispondenti. Il windgram e i dati meteo di {siteName} restano disponibili nell’app.</p>
          </div>
        </div>
      )}

      <div className="flybubble-panel-footer">
        <span>Servizio esterno indipendente dai dati meteo dell’app</span>
        <a href={forecastUrl} target="_blank" rel="noopener noreferrer">
          {embedUrl ? "Previsione completa" : "Apri Flybubble Weather"} <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
