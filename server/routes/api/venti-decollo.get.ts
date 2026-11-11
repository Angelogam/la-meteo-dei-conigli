import { defineHandler } from "nitro";
import { getQuery, setResponseHeader, createError } from "nitro/h3";
import { valutaVentoDecollo } from "../../utils/aerologia";
import { fetchOpenMeteo } from "../../utils/upstream";
import { rejectUnknownParameters, singleQuery, parseCoordinate, parseNumberParameter, parseEsposizione } from "../../utils/query";

const ALLOWED = ["latitude", "longitude", "altitude", "exposure", "timezone"] as const;

const CURRENT_FIELDS = [
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
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

  const windSpeed = num(current.wind_speed_10m);
  const windDir = num(current.wind_direction_10m);
  if (windSpeed === undefined || windDir === undefined) {
    throw createError({ statusCode: 502, statusMessage: "Dati vento incompleti dal provider" });
  }

  const esito = valutaVentoDecollo({
    windSpeed,
    windGusts: num(current.wind_gusts_10m) ?? null,
    windDir,
    esposizione: exposure,
  });

  return {
    ok: true,
    data: {
      ...esito,
      location: { latitude, longitude, altitude, exposure },
      current: {
        time: current.time ?? null,
        windSpeed,
        windGusts: num(current.wind_gusts_10m) ?? null,
        windDir,
      },
    },
    meta: {
      source: "open-meteo",
      disclaimer: "Le previsioni sono dati modellistici e non certificano la sicurezza o l'idoneità al volo.",
      timestamp: new Date().toISOString(),
    },
  };
});
