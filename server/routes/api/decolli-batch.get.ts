import { defineHandler } from "nitro";
import { getQuery, setResponseHeader, createError } from "nitro/h3";
import { fetchOpenMeteoMulti } from "../../utils/upstream";
import { rejectUnknownParameters, singleQuery } from "../../utils/query";
import { DECOLLI } from "../../../src/data/decolli";

/**
 * DECOLLI BATCH — un'unica chiamata Open-Meteo multi-location per TUTTI i decolli
 * (come il campo grigliato di meteo-parapente). Il browser non fa più 24 richieste:
 * una sola richiesta same-origin veloce, niente rate-limit, primo disegno in ~1-2 s.
 *
 * Risposta: { sites: [{ id, name, lat, lon, elevation, hourly: {…array grezze…}, daily: {…} }] }
 * Il client (threeSourceWeather.ts) modella queste grezze nella forma MeteoDecollo.
 */

const ALLOWED = ["timezone"] as const;

/** Variabili orarie: identiche a quelle usate dal client per le card e la cartina. */
const PRESSURE_LEVELS = [925, 900, 850, 800, 750, 700, 650, 600, 550];
const HOURLY = [
  "temperature_2m",
  "dew_point_2m",
  "precipitation",
  "cloud_cover",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "cape",
  "freezing_level_height",
  "weather_code",
  "direct_radiation",
  ...PRESSURE_LEVELS.flatMap((hpa) => [
    `wind_speed_${hpa}hPa`,
    `geopotential_height_${hpa}hPa`,
    `wind_direction_${hpa}hPa`,
  ]),
  "temperature_925hPa",
  "temperature_850hPa",
  "temperature_700hPa",
  "temperature_550hPa",
].join(",");

const DAILY = ["temperature_2m_max", "temperature_2m_min", "cloud_cover_mean", "precipitation_sum"].join(",");

function validCoordinates(): { lats: string; lons: string } {
  const lats: string[] = [];
  const lons: string[] = [];
  for (const d of DECOLLI) {
    const lat = Number(d.lat);
    const lon = Number(d.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    lats.push(lat.toFixed(5));
    lons.push(lon.toFixed(5));
  }
  if (!lats.length) {
    throw createError({ statusCode: 500, statusMessage: "Elenco decolli non disponibile sul server" });
  }
  return { lats: lats.join(","), lons: lons.join(",") };
}

export default defineHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

  const query = getQuery(event);
  rejectUnknownParameters(query, ALLOWED);
  const timezone = singleQuery(query, "timezone") ?? "Europe/Rome";
  if (!/^[A-Za-z_]+\/[A-Za-z_+\-0-9]+$/.test(timezone)) {
    throw createError({ statusCode: 400, statusMessage: "Timezone non valido" });
  }

  const { lats, lons } = validCoordinates();

  const results = await fetchOpenMeteoMulti({
    latitude: lats,
    longitude: lons,
    timezone,
    forecast_days: "3",
    hourly: HOURLY,
    daily: DAILY,
  });

  if (results.length !== DECOLLI.length) {
    throw createError({
      statusCode: 502,
      statusMessage: "Risposta multi-location incompleta",
      data: { attesi: DECOLLI.length, ricevuti: results.length },
    });
  }

  const sites = DECOLLI.map((d, i) => {
    const raw = results[i];
    const hourly = (raw?.hourly ?? null) as Record<string, unknown> | null;
    const times = hourly?.time;
    if (!hourly || !Array.isArray(times) || times.length === 0) {
      return { id: d.id, name: d.name, lat: d.lat, lon: d.lon, elevation: d.elevation_m, hourly: null, daily: null };
    }
    return {
      id: d.id,
      name: d.name,
      lat: d.lat,
      lon: d.lon,
      elevation: d.elevation_m,
      hourly,
      daily: (raw?.daily ?? null) as Record<string, unknown> | null,
    };
  });

  return {
    ok: true,
    fetchedAt: new Date().toISOString(),
    count: sites.length,
    sites,
  };
});
