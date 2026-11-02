import { defineHandler } from "nitro";
import { createError, getQuery, setHeader } from "nitro/h3";
import { DECOLLI } from "../../../src/data/decolli";

const SEARCH_RADIUS_KM = 4;
const MAX_CAMERAS = 50;
const REQUEST_TIMEOUT_MS = 8_000;
const WINDY_WEBCAMS_API_URL = "https://api.windy.com/webcams/api/v3/webcams";

interface WindyWebcam {
  webcamId: string;
  title: string;
  status: string | null;
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  detailUrl: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getCoordinate(value: unknown, min: number, max: number): number | null {
  const coordinate = typeof value === "number" ? value : Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max
    ? coordinate
    : null;
}

function getWindyDetailUrl(value: unknown): string | null {
  const detailUrl = getString(value);
  if (!detailUrl) return null;

  try {
    const url = new URL(detailUrl);
    return url.protocol === "https:" && url.hostname === "www.windy.com" ? url.toString() : null;
  } catch {
    return null;
  }
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(lat2 - lat1);
  const longitudeDelta = radians(lon2 - lon1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeWebcam(value: unknown): Omit<WindyWebcam, "webcamId"> & { webcamId: string } {
  if (!isRecord(value) || !isRecord(value.location) || !isRecord(value.urls)) {
    throw createError({ statusCode: 502, statusMessage: "Risposta webcam Windy non valida" });
  }

  const webcamId = value.webcamId;
  const title = getString(value.title);
  const latitude = getCoordinate(value.location.latitude, -90, 90);
  const longitude = getCoordinate(value.location.longitude, -180, 180);
  if ((typeof webcamId !== "number" && typeof webcamId !== "string") || !title || latitude === null || longitude === null) {
    throw createError({ statusCode: 502, statusMessage: "Dati webcam Windy incompleti" });
  }

  return {
    webcamId: String(webcamId),
    title,
    status: getString(value.status),
    latitude,
    longitude,
    city: getString(value.location.city),
    region: getString(value.location.region),
    detailUrl: getWindyDetailUrl(value.urls.detail),
  };
}

export default defineHandler(async (event) => {
  const query = getQuery(event);
  const unsupportedParameters = Object.keys(query).filter((key) => key !== "site");
  if (unsupportedParameters.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "La richiesta contiene parametri non supportati",
      data: { parameters: unsupportedParameters },
    });
  }

  if (Array.isArray(query.site) || typeof query.site !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Specificare un solo ID decollo valido" });
  }

  const site = DECOLLI.find((candidate) => candidate.id === query.site.trim());
  if (!site) {
    throw createError({
      statusCode: 404,
      statusMessage: "Decollo non trovato",
      data: { available: DECOLLI.map(({ id, site_name }) => ({ id, name: site_name })) },
    });
  }

  const apiKey = process.env.WINDY_WEBCAMS_API_KEY?.trim();
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: "API webcam non configurata: aggiungere WINDY_WEBCAMS_API_KEY alle variabili d'ambiente",
    });
  }

  const url = new URL(WINDY_WEBCAMS_API_URL);
  url.searchParams.set("nearby", `${site.lat},${site.lon},${SEARCH_RADIUS_KM}`);
  url.searchParams.set("limit", String(MAX_CAMERAS));
  url.searchParams.set("lang", "it");
  url.searchParams.set("sortKey", "popularity");
  url.searchParams.set("sortDirection", "desc");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "x-windy-api-key": apiKey, Accept: "application/json" },
    });
    if (!response.ok) {
      if (response.status === 429) {
        throw createError({ statusCode: 503, statusMessage: "Limite richieste Windy raggiunto" });
      }
      if (response.status === 401 || response.status === 403) {
        throw createError({ statusCode: 502, statusMessage: "Chiave API Windy non valida o non autorizzata" });
      }
      throw createError({ statusCode: 502, statusMessage: "Il provider Windy non ha restituito le webcam" });
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw createError({ statusCode: 502, statusMessage: "Risposta JSON webcam Windy non valida" });
    }
    if (!isRecord(payload) || !Array.isArray(payload.webcams)) {
      throw createError({ statusCode: 502, statusMessage: "Risposta webcam Windy non valida" });
    }

    const cameras = payload.webcams
      .map((webcam) => {
        const camera = normalizeWebcam(webcam);
        return {
          ...camera,
          exactDistanceKm: distanceKm(site.lat, site.lon, camera.latitude, camera.longitude),
        };
      })
      .filter((camera) => camera.exactDistanceKm <= SEARCH_RADIUS_KM)
      .sort((a, b) => a.exactDistanceKm - b.exactDistanceKm)
      .map(({ exactDistanceKm, ...camera }) => ({
        ...camera,
        distanceKm: Number(exactDistanceKm.toFixed(1)),
      }));

    setHeader(event, "Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    return {
      ok: true,
      provider: "Windy Webcams API",
      site: { id: site.id, name: site.site_name, latitude: site.lat, longitude: site.lon },
      radiusKm: SEARCH_RADIUS_KM,
      total: cameras.length,
      cameras,
    };
  } catch (error: unknown) {
    if (error instanceof Error && "statusCode" in error && typeof error.statusCode === "number") {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw createError({ statusCode: 504, statusMessage: "Timeout del provider Windy" });
    }
    throw createError({ statusCode: 502, statusMessage: "Provider Windy temporaneamente non raggiungibile" });
  } finally {
    clearTimeout(timer);
  }
});
