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
  imageUrl?: string | null;
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

/**
 * Aggiunge un cache-buster all'URL dell'immagine webcam: le snapshot
 * (SpotAir/meteobridge/Holfuy/Fripon/…) aggiornano l'immagine in continuo,
 * il busto evita che browser e CDN servano frame vecchi.
 */
function withCacheBuster(imageUrl: string): string {
  const separator = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${separator}cb=${Date.now().toString(36)}`;
}

/**
 * Webcam curate nel database decolli (fonte SpotAir + club):
 * snapshot live già verificate e pagine ufficiali dei gestori.
 */
function curatedCameras(site: (typeof DECOLLI)[number]) {
  return (site.webcams ?? []).map((webcam, index) => ({
    webcamId: `curated-${site.id}-${index}`,
    title: webcam.name,
    status: "active",
    latitude: site.lat,
    longitude: site.lon,
    city: site.location_name ?? site.site_name,
    region: webcam.fonte,
    detailUrl: webcam.url && webcam.url.startsWith("https:") ? webcam.url : webcam.url ?? null,
    imageUrl: webcam.imageUrl ? withCacheBuster(webcam.imageUrl) : null,
    distanceKm: Number((webcam.distKm ?? 0).toFixed(1)),
  }));
}

function localFallbackCameras(site: (typeof DECOLLI)[number]) {
  const base = {
    lat: site.lat,
    lon: site.lon,
    city: site.location_name ?? site.site_name,
    region: "Provincia di Cuneo",
  };

  const siteId = site.id.toLowerCase();
  if (siteId.includes("pian-mune")) {
    return [
      {
        webcamId: "local-pian-mune-seggiovia",
        title: "Pian Munè - Seggiovia",
        status: "active",
        latitude: base.lat,
        longitude: base.lon,
        city: base.city,
        region: base.region,
        detailUrl: "https://www.ilmeteo.it/webcam/Pian+Mune%27",
        imageUrl: "https://webcam.pianmune.it/system/uploads/otras/Seggiovia.jpg",
        distanceKm: 0.4,
      },
      {
        webcamId: "local-pian-mune-ponente",
        title: "Paesana - Conca",
        status: "active",
        latitude: base.lat,
        longitude: base.lon,
        city: base.city,
        region: base.region,
        detailUrl: "https://www.ilmeteo.it/webcam/Paesana",
        imageUrl: "https://webcam.pianmune.it/system/uploads/otras/VistaConcaFontanone.jpg",
        distanceKm: 0.8,
      },
    ];
  }

  if (siteId.includes("rucas") || siteId.includes("montoso")) {
    return [
      {
        webcamId: "local-rucas",
        title: "Rucas di Bagnolo",
        status: "active",
        latitude: base.lat,
        longitude: base.lon,
        city: base.city,
        region: base.region,
        detailUrl: "https://www.ilmeteo.it/webcam/Rucas+di+Bagnolo",
        imageUrl: "https://weather-cams.visioray.com/snap/3104.jpg",
        distanceKm: 0.7,
      },
      {
        webcamId: "local-montoso",
        title: "Montoso",
        status: "active",
        latitude: base.lat,
        longitude: base.lon,
        city: base.city,
        region: base.region,
        detailUrl: "https://www.ilmeteo.it/webcam/Montoso",
        imageUrl: "https://weather-cams.visioray.com/snap/4507.jpg",
        distanceKm: 1.1,
      },
    ];
  }

  return [];
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

function dedupeCameras<T extends { title: string; webcamId: string }>(cameras: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const camera of cameras) {
    const key = camera.title.trim().toLocaleLowerCase("it-IT");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(camera);
  }
  return result;
}

function buildResponse(site: (typeof DECOLLI)[number], cameras: WindyWebcam[], provider: string, radiusKm = SEARCH_RADIUS_KM) {
  return {
    ok: true,
    provider,
    site: { id: site.id, name: site.site_name, latitude: site.lat, longitude: site.lon },
    radiusKm,
    total: cameras.length,
    cameras,
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

  const curated = curatedCameras(site);
  const fallbackCameras = localFallbackCameras(site);
  const apiKey = process.env.WINDY_WEBCAMS_API_KEY?.trim();
  if (!apiKey) {
    setHeader(event, "Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    const cameras = curated.length > 0 ? curated : fallbackCameras;
    return buildResponse(site, cameras, curated.length > 0 ? "SpotAir + webcam locali verificate" : "webcam locali verificate");
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

    const windyCameras = payload.webcams
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

    const merged = dedupeCameras([...curated, ...windyCameras] as WindyWebcam[]);
    const finalCameras = merged.length > 0 ? merged : (fallbackCameras as WindyWebcam[]);

    setHeader(event, "Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    return buildResponse(
      site,
      finalCameras,
      curated.length > 0 && windyCameras.length > 0
        ? "SpotAir + Windy Webcams API"
        : windyCameras.length > 0
          ? "Windy Webcams API"
          : "SpotAir + webcam locali verificate",
    );
  } catch (error: unknown) {
    const canFallback = curated.length > 0 || fallbackCameras.length > 0;
    if (error instanceof Error && "statusCode" in error && typeof error.statusCode === "number") {
      if (canFallback) {
        setHeader(event, "Cache-Control", "public, s-maxage=600");
        return buildResponse(site, (curated.length > 0 ? curated : fallbackCameras) as WindyWebcam[], "SpotAir + webcam locali verificate");
      }
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      if (canFallback) {
        setHeader(event, "Cache-Control", "public, s-maxage=600");
        return buildResponse(site, (curated.length > 0 ? curated : fallbackCameras) as WindyWebcam[], "SpotAir + webcam locali verificate");
      }
      return buildResponse(site, [], "webcam locali verificate");
    }
    if (canFallback) {
      setHeader(event, "Cache-Control", "public, s-maxage=600");
      return buildResponse(site, (curated.length > 0 ? curated : fallbackCameras) as WindyWebcam[], "SpotAir + webcam locali verificate");
    }
    throw createError({ statusCode: 502, statusMessage: "Provider Windy temporaneamente non raggiungibile" });
  } finally {
    clearTimeout(timer);
  }
});
