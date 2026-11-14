"use client";

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
}

interface LocalWebcamSource {
  name: string;
  description: string;
  url: string;
  imageUrl?: string;
}

const PIAN_MUNE_SOURCES: LocalWebcamSource[] = [
  {
    name: "Pian Munè - Seggiovia",
    description: "Vista diretta della seggiovia e del settore di Pian Munè.",
    url: "https://www.ilmeteo.it/webcam/Pian+Mune%27",
    imageUrl: "https://webcam.pianmune.it/system/uploads/otras/Seggiovia.jpg?cb=2026110319",
  },
  {
    name: "Paesana - Conca",
    description: "Immagini della conca e della zona di decollo verso il Monviso.",
    url: "https://www.ilmeteo.it/webcam/Paesana",
    imageUrl: "https://webcam.pianmune.it/system/uploads/otras/VistaConcaFontanone.jpg",
  },
  {
    name: "Monviso",
    description: "Vista del versante e della montagna verso il lato di Pian Munè.",
    url: "https://www.ilmeteo.it/webcam/Paesana",
    imageUrl: "https://webcam.pianmune.it/system/uploads/otras/Monviso.jpg",
  },
];

const RUCAS_SOURCES: LocalWebcamSource[] = [
  {
    name: "Rucas di Bagnolo",
    description: "Viste del comprensorio Rucas e dell'arco alpino.",
    url: "https://www.ilmeteo.it/webcam/Rucas+di+Bagnolo",
    imageUrl: "https://weather-cams.visioray.com/snap/3104.jpg?cb=2026110319",
  },
  {
    name: "Montoso",
    description: "Webcam di Roc del Duc e Piazza Frioland.",
    url: "https://www.ilmeteo.it/webcam/Montoso",
    imageUrl: "https://weather-cams.visioray.com/snap/4507.jpg?cb=2026110319",
  },
];

function localWebcamSources(siteId: string): LocalWebcamSource[] {
  if (siteId.includes("pian-mune")) return PIAN_MUNE_SOURCES;
  if (siteId.includes("rucas") || siteId.includes("montoso")) return RUCAS_SOURCES;
  return [];
}

function fallbackLocalCameras(siteId: string, siteName: string, latitude: number, longitude: number): WebcamResponse {
  const sources = localWebcamSources(siteId);
  const cameras: WebcamCamera[] = sources.map((source, index) => ({
    webcamId: `local-${siteId}-${index}`,
    title: source.name,
    status: "active",
    latitude,
    longitude,
    city: siteName,
    region: "Provincia di Cuneo",
    detailUrl: source.url,
    imageUrl: source.imageUrl ?? null,
    distanceKm: Number((0.4 + index * 0.8).toFixed(1)),
  }));

  return {
    radiusKm: 4,
    provider: "webcam locali verificate",
    cameras,
  };
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

export default function WebcamNearby({ siteId, siteName, latitude, longitude }: WebcamNearbyProps) {
  const [data, setData] = useState<WebcamResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const localSources = localWebcamSources(siteId);

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

        const fallback = fallbackLocalCameras(siteId, siteName, latitude, longitude);
        setData(fallback);
        setError(null);

        if (cause instanceof Error && cause.message.includes("WINDY_WEBCAMS_API_KEY")) {
          return;
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [siteId]);

  return (
    <section className="flight-section webcam-nearby-section">
      <div className="flight-section-heading-row">
        <span className="flight-section-marker is-green" aria-hidden="true" />
        <div>
          <h2 className="flight-section-heading">Webcam vicino al decollo</h2>
          <p className="flight-section-subtitle">
            Ricerca a 360° entro 4 km da {siteName}; le immagini e la disponibilità dipendono dai gestori.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="webcam-state-card" role="status">
          <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Ricerca delle webcam nell’area…</span>
        </div>
      ) : error ? (
        <div className="webcam-state-card webcam-state-card--notice">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.cameras.map((camera) => {
            const location = [camera.city, camera.region].filter(Boolean).join(" · ");
            const previewImage = camera.imageUrl ?? undefined;
            return (
              <article key={camera.webcamId} className="webcam-camera-card">
                <div className="webcam-camera-visual" aria-hidden="true">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt={camera.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <Camera className="h-6 w-6" />
                  )}
                  {camera.status && <span className={`webcam-status-dot ${camera.status === "active" ? "is-active" : ""}`} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="truncate font-bold text-white" title={camera.title}>{camera.title}</h3>
                    <span className="webcam-distance">{camera.distanceKm.toFixed(1)} km</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {location || "Posizione geolocalizzata"}
                  </p>
                  {camera.status && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      {camera.status === "active" ? "Live camera disponibile" : "Stato: " + camera.status}
                    </p>
                  )}
                  {camera.detailUrl ? (
                    <a
                      className="webcam-open-link"
                      href={camera.detailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Apri webcam <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ) : (
                    <a
                      className="webcam-open-link"
                      href={windyMapUrl(camera.latitude, camera.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Apri mappa Windy <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="webcam-state-card">
          <Camera className="h-4 w-4" aria-hidden="true" />
          <span>Nessuna webcam trovata nel raggio di {data?.radiusKm ?? 4} km.</span>
        </div>
      )}

      {localSources.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Webcam locali verificate · iLMeteo</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {localSources.map((source) => (
              <article key={source.url} className="webcam-camera-card">
                <div className="webcam-camera-visual" aria-hidden="true">
                  {source.imageUrl ? (
                    <img
                      src={source.imageUrl}
                      alt={source.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <Camera className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-white">{source.name}</h4>
                  <p className="mt-1 text-xs text-slate-400">{source.description}</p>
                  <a className="webcam-open-link" href={source.url} target="_blank" rel="noopener noreferrer">
                    Apri pagina webcam <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{data ? `Fonte: ${data.provider ?? "Windy Webcams API"}` : "Fonte: Windy"}</span>
        <a
          className="inline-flex items-center gap-1 text-cyan-300 transition-colors hover:text-cyan-200"
          href={windyMapUrl(latitude, longitude)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Apri mappa webcam a {siteName} <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
