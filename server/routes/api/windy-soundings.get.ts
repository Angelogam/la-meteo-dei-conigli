import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";

const WINDY_PLUGIN_URL = "https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/plugin.min.js";
const WINDY_PLUGIN_NAME = "Windy Plugin PG Soundings";
const WINDY_PLUGIN_VERSION = "1.6.2";
const PLUGIN_TIMEOUT_MS = 8_000;
const MAX_PLUGIN_BYTES = 2_000_000;

interface SoundingSite {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
}

const SOUNDING_SITES: SoundingSite[] = [
  { name: "Montoso – Decollo Basso", lat: 44.764372, lon: 7.249758, elevation: 1250 },
  { name: "Pian Munè – Seggiovia", lat: 44.638610, lon: 7.230889, elevation: 1870 },
  { name: "Colle dell'Agnello", lat: 44.682826, lon: 6.978201, elevation: 2748 },
  { name: "Monte Birrone", lat: 44.539893, lon: 7.252939, elevation: 2131 },
  { name: "Monte Vandalino", lat: 44.836712, lon: 7.173867, elevation: 2120 },
  { name: "Pian dell'Alpe", lat: 45.063962, lon: 7.028267, elevation: 1990 },
];

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default defineHandler(async (event) => {
  const query = getQuery(event);
  const siteValue = query.site;
  const actionValue = query.action;
  const site = typeof siteValue === "string" ? siteValue.trim() : undefined;
  const action = typeof actionValue === "string" ? actionValue.trim() : undefined;

  if (action === "plugin") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PLUGIN_TIMEOUT_MS);
    try {
      const response = await fetch(WINDY_PLUGIN_URL, {
        signal: controller.signal,
        headers: {
          "User-Agent": "MeteoConigli/1.1 (+https://la-meteo-dei-conigli-mrcq.vercel.app)",
          "Accept": "application/javascript, text/javascript, */*",
        },
      });
      if (!response.ok) {
        throw createError({ statusCode: 502, statusMessage: "Il provider Windy non ha restituito il plugin" });
      }
      const js = await response.text();
      if (js.length === 0 || js.length > MAX_PLUGIN_BYTES) {
        throw createError({ statusCode: 502, statusMessage: "Dimensione del plugin Windy non valida" });
      }
      return {
        ok: true,
        name: WINDY_PLUGIN_NAME,
        version: WINDY_PLUGIN_VERSION,
        url: WINDY_PLUGIN_URL,
        js,
      };
    } catch (error: unknown) {
      const err = error as { statusCode?: number; name?: string };
      if (err?.statusCode) throw error;
      if (err?.name === "AbortError") {
        throw createError({ statusCode: 504, statusMessage: "Timeout del provider Windy" });
      }
      throw createError({ statusCode: 502, statusMessage: "Provider Windy temporaneamente non raggiungibile" });
    } finally {
      clearTimeout(timer);
    }
  }

  if (action === "sites") {
    return {
      ok: true,
      plugin: WINDY_PLUGIN_NAME,
      version: WINDY_PLUGIN_VERSION,
      url: WINDY_PLUGIN_URL,
      sites: SOUNDING_SITES,
    };
  }

  if (site) {
    const slug = slugify(site);
    const found = SOUNDING_SITES.find((candidate) => slugify(candidate.name) === slug);
    if (!found) {
      throw createError({
        statusCode: 404,
        statusMessage: "Sito sounding non trovato",
        data: { available: SOUNDING_SITES.map((candidate) => ({ name: candidate.name, slug: slugify(candidate.name) })) },
      });
    }
    return {
      ok: true,
      plugin: WINDY_PLUGIN_NAME,
      version: WINDY_PLUGIN_VERSION,
      url: WINDY_PLUGIN_URL,
      site: found,
      embedUrl: "https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/",
      config: { lat: found.lat, lon: found.lon, elevation: found.elevation },
    };
  }

  return {
    ok: true,
    name: WINDY_PLUGIN_NAME,
    version: WINDY_PLUGIN_VERSION,
    url: WINDY_PLUGIN_URL,
    description: "Sounding atmosferici per parapendio — skew-T, hodograph e profili vento",
    endpoints: [
      "GET /api/windy-soundings?action=plugin",
      "GET /api/windy-soundings?action=sites",
      "GET /api/windy-soundings?site=montoso-decollo-basso",
    ],
    sites: SOUNDING_SITES.map((candidate) => ({ ...candidate, slug: slugify(candidate.name) })),
  };
});
