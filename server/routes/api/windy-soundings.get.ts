import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";

const WINDY_PLUGIN_URL = "https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/plugin.min.js";
const WINDY_PLUGIN_NAME = "Windy Plugin PG Soundings";
const WINDY_PLUGIN_VERSION = "1.6.2";

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

export default defineHandler(async (event) => {
  const query = getQuery(event);
  const site = query.site as string | undefined;
  const action = query.action as string | undefined;

  // Restituisce il JS del plugin (proxy)
  if (action === "plugin") {
    try {
      const res = await fetch(WINDY_PLUGIN_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MeteoConigli/1.0)",
          "Accept": "*/*",
        },
      });
      if (!res.ok) {
        throw createError({
          statusCode: res.status,
          statusMessage: `Errore nel fetch del plugin: ${res.statusText}`,
        });
      }
      const js = await res.text();
      return {
        name: WINDY_PLUGIN_NAME,
        version: WINDY_PLUGIN_VERSION,
        url: WINDY_PLUGIN_URL,
        js,
      };
    } catch (err: any) {
      throw createError({
        statusCode: 502,
        statusMessage: "Errore proxy plugin Windy",
        data: { detail: err.message },
      });
    }
  }

  // Restituisce la lista dei siti disponibili per sounding
  if (action === "sites") {
    return {
      plugin: WINDY_PLUGIN_NAME,
      version: WINDY_PLUGIN_VERSION,
      url: WINDY_PLUGIN_URL,
      sites: SOUNDING_SITES,
    };
  }

  // Restituisce i dati di un sito specifico
  if (site) {
    const found = SOUNDING_SITES.find(
      (s) => s.name.toLowerCase().replace(/\s/g, "-") === site.toLowerCase()
    );
    if (!found) {
      throw createError({
        statusCode: 404,
        statusMessage: `Sito "${site}" non trovato`,
        data: { available: SOUNDING_SITES.map((s) => s.name) },
      });
    }
    return {
      plugin: WINDY_PLUGIN_NAME,
      version: WINDY_PLUGIN_VERSION,
      url: WINDY_PLUGIN_URL,
      site: found,
      embedUrl: `https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/`,
      config: {
        lat: found.lat,
        lon: found.lon,
        elevation: found.elevation,
      },
    };
  }

  // Default: info generale
  return {
    name: WINDY_PLUGIN_NAME,
    version: WINDY_PLUGIN_VERSION,
    url: WINDY_PLUGIN_URL,
    description: "Sounding atmosferici per parapendio — skew-T, hodograph e profili vento",
    endpoints: [
      "GET /api/windy-soundings?action=plugin",
      "GET /api/windy-soundings?action=sites",
      "GET /api/windy-soundings?site=montoso-decollo-basso",
    ],
    sites: SOUNDING_SITES,
  };
});