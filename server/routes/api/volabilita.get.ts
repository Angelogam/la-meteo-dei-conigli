import { defineHandler } from "nitro";
import { getQuery, setResponseHeader, createError } from "nitro/h3";
import { calcolaIndiceVolabilita } from "../../utils/aerologia";
import { fetchOpenMeteo } from "../../utils/upstream";
import { rejectUnknownParameters, singleQuery, parseCoordinate, parseNumberParameter, parseEsposizione } from "../../utils/query";

const ALLOWED = ["latitude", "longitude", "altitude", "exposure", "timezone"] as const;

const CURRENT_FIELDS = [
  "temperature_2m",
  "dew_point_2m",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "cloud_cover",
  "precipitation",
  "weather_code",
  "cape",
  "lifted_index",
].join(",");

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export default defineHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

  const query = getQuery(event);
  rejectUnknownParameters(query, ALLOWED);

  const latitude = parseCoordinate(singleQuery(query, "latitude"), "latitude", -90, 90);
  const longitude = parseCoordinate(singleQuery(query, "longitude"), "longitude", -180, 180);
  const altitude = parseNumberParameter(singleQuery(query, "altitude"), "altitude", 0, 8849, 0);
  const exposure = parseEsposizione(singleQuery(query, "exposure"));
  const timezone = singleQuery(query, "timezone") ?? "auto";

  const upstream = await fetchOpenMeteo({
    latitude: String(latitude),
    longitude: String(longitude),
    current: CURRENT_FIELDS,
    timezone,
  });

  const current = (upstream.current ?? null) as Record<string, unknown> | null;
  if (!current) {
    throw createError({ statusCode: 502, statusMessage: "Risposta upstream priva del blocco current" });
  }

  const temperature = num(current.temperature_2m);
  const dewPoint = num(current.dew_point_2m);
  const windSpeed = num(current.wind_speed_10m);
  const windDir = num(current.wind_direction_10m);
  const cloudCover = num(current.cloud_cover);
  const precipitation = num(current.precipitation);

  if (temperature === undefined || dewPoint === undefined || windSpeed === undefined ||
      windDir === undefined || cloudCover === undefined || precipitation === undefined) {
    throw createError({ statusCode: 502, statusMessage: "Dati current incompleti dal provider" });
  }

  const volabilita = calcolaIndiceVolabilita({
    windSpeed,
    windGusts: num(current.wind_gusts_10m),
    windDir,
    esposizione: exposure,
    temperature,
    dewPoint,
    cloudCover,
    precipitation,
    weatherCode: num(current.weather_code),
    cape: num(current.cape),
    liftedIndex: num(current.lifted_index),
    quota: altitude,
  });

  return {
    ok: true,
    data: {
      ...volabilita,
      location: { latitude, longitude, altitude, exposure },
      current: {
        time: current.time ?? null,
        temperature,
        dewPoint,
        windSpeed,
        windGusts: num(current.wind_gusts_10m) ?? null,
        windDir,
        cloudCover,
        precipitation,
        weatherCode: num(current.weather_code) ?? null,
        cape: num(current.cape) ?? null,
        liftedIndex: num(current.lifted_index) ?? null,
      },
    },
    meta: {
      source: "open-meteo",
      disclaimer: "Le previsioni sono dati modellistici e non certificano la sicurezza o l'idoneità al volo.",
      timestamp: new Date().toISOString(),
    },
  };
});
