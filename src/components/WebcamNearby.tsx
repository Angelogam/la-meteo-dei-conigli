"use client";

/**
 * WEBCAM VICINO AL DECOLLO — card image-first (16:9) con overlay,
 * badge LIVE, chip distanza e galleria fluida. La prima webcam
 * è "featured" e spazia su due colonne. Modalità `compact` per
 * l'embed nella pagina di dettaglio (senza intestazione di sezione).
 */

import { useEffect, useState } from "react";
import { Camera, ExternalLink, MapPin, RefreshCw } from "lucide-react";

interface WebcamCamera {
  webcamId: string;
  title: string;
  status: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  detailUrl: string | null;
  imageUrl?: string | null;
  distanceKm: number;
}

interface WebcamResponse {
  radiusKm: number;
  cameras: WebcamCamera[];
  provider?: string;
}

interface WebcamNearbyProps {
  siteId: string;
  siteName: string;
  latitude: number;
  longitude: number;
  compact?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function windyMapUrl(latitude: number, longitude: number): string {
  return `https://www.windy.com/it/-Webcam/webcams?${latitude},${longitude},11`;
}

function getErrorMessage(value: unknown): string | null {
  if (!isRecord(value)) return null;
  for (const key of ["statusMessage", "statusText", "message"] as const) {
    if (key in value && typeof value[key] === "string") return value[key];
  }
  return null;
}

function isWebcamResponse(value: unknown): value is WebcamResponse {
  if (!isRecord(value) || typeof value.radiusKm !== "number" || !Array.isArray(value.cameras)) {
    return false;
  }
  return value.cameras.every((camera) =>
    isRecord(camera) &&
    typeof camera.webcamId === "string" &&
    typeof camera.title === "string" &&
    (typeof camera.status === "string" || camera.status === null) &&
    typeof camera.latitude === "number" &&
    typeof camera.longitude === "number" &&
    (typeof camera.city === "string" || camera.city === null) &&
    (typeof camera.region === "string" || camera.region === null) &&
    (typeof camera.detailUrl === "string" || camera.detailUrl === null) &&
    typeof camera.distanceKm === "number"
  );
}

export default function WebcamNearby({ siteId, siteName, latitude, longitude, compact = false }: WebcamNearbyProps) {
  const [data, setData] = useState<WebcamResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError(null);

    fetch(`/api/webcams?site=${encodeURIComponent(siteId)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message = getErrorMessage(payload) ?? "Non è stato possibile caricare le webcam";
          throw new Error(message);
        }
        if (!isWebcamResponse(payload)) {
          throw new Error("Risposta webcam non valida");
        }
        return payload;
      })
      .then((payload) => {
        setData(payload);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Errore nel caricamento delle webcam");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [siteId, siteName, latitude, longitude]);

  const provider = data?.provider ?? "SpotAir + webcam locali verificate";

  const body = loading ? (
    <div className="wcam-grid" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className={"wcam-card is-skeleton" + (i === 0 ? " is-featured" : "")}>
          <div className="wcam-skeleton" />
        </div>
      ))}
    </div>
  ) : error ? (
    <div className="wcam-state wcam-state--notice">
      <Camera className="h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-semibold text-slate-200">Elenco webcam non disponibile</p>
        <p className="mt-1 text-xs text-slate-400">{error}</p>
        {error.includes("WINDY_WEBCAMS_API_KEY") && (
          <p className="mt-1 text-xs text-slate-500">
            La chiave va configurata nelle variabili d’ambiente di Vercel; non inserirla nel frontend.
          </p>
        )}
      </div>
    </div>
  ) : data && data.cameras.length > 0 ? (
    <div className="wcam-grid">
      {data.cameras.map((camera, idx) => {
        const location = [camera.city, camera.region].filter(Boolean).join(" · ");
        const previewImage = camera.imageUrl ?? undefined;
        const href = camera.detailUrl || windyMapUrl(camera.latitude, camera.longitude);
        const featured = idx === 0 && data.cameras.length > 1;
        return (
          <article key={camera.webcamId} className={"wcam-card" + (featured ? " is-featured" : "")}>
            <a className="wcam-visual" href={href} target="_blank" rel="noopener noreferrer" aria-label={"Apri la webcam " + camera.title}>
              {previewImage ? (
                <img
                  className="wcam-img"
                  src={previewImage}
                  alt={"Webcam " + camera.title}
                  loading={featured ? "eager" : "lazy"}
                  referrerPolicy="no-referrer"
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                />
              ) : (
                <span className="wcam-placeholder"><Camera aria-hidden="true" /></span>
              )}
              <span className="wcam-shade" aria-hidden="true" />
              {camera.status === "active" && <span className="wcam-live"><i aria-hidden="true" /> LIVE</span>}
              {camera.distanceKm > 0 && <span className="wcam-km">{camera.distanceKm.toFixed(1)} km</span>}
              <span className="wcam-caption">
                <span className="wcam-title">{camera.title}</span>
                {location && <span className="wcam-loc"><MapPin size={10} aria-hidden="true" /> {location}</span>}
              </span>
              <span className="wcam-open"><ExternalLink size={13} aria-hidden="true" /> Apri</span>
            </a>
          </article>
        );
      })}
    </div>
  ) : (
    <div className="wcam-state">
      <Camera className="h-4 w-4" aria-hidden="true" />
      <span>Nessuna webcam verificata vicino a questo decollo.</span>
      <a className="wcam-link" href={windyMapUrl(latitude, longitude)} target="_blank" rel="noopener noreferrer">
        Cerca su Windy <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </div>
  );

  const footer = !loading && !error && data && data.cameras.length > 0 ? (
    <div className="wcam-foot">
      <span>Fonte: {provider} · disponibilità garantita dai gestori</span>
      <a className="wcam-link" href={windyMapUrl(latitude, longitude)} target="_blank" rel="noopener noreferrer">
        Mappa webcam a {siteName} <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </div>
  ) : null;

  if (compact) {
    return (
      <section className="webcam-nearby-section is-compact" aria-label="Webcam vicino al decollo">
        {body}
        {footer}
      </section>
    );
  }

  return (
    <section className="flight-section webcam-nearby-section">
      <div className="flight-section-heading-row">
        <span className="flight-section-marker is-green" aria-hidden="true" />
        <div>
          <h2 className="flight-section-heading">Webcam vicino al decollo</h2>
          <p className="flight-section-subtitle">
            Live streaming e snapshot verificati vicino a {siteName} (fonte SpotAir e gestori locali).
          </p>
        </div>
      </div>

      {body}
      {footer}
    </section>
  );
}
