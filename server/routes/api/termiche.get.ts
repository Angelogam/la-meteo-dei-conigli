import { defineHandler } from "nitro";
import { getQuery, setResponseHeader, createError } from "nitro/h3";
import { calcolaTermiche, type InputTermica } from "../../utils/aerologia";
import { fetchOpenMeteo } from "../../utils/upstream";
import { rejectUnknownParameters, singleQuery, parseCoordinate, parseNumberParameter } from "../../utils/query";

const ALLOWED = ["latitude", "longitude", "altitude", "days", "timezone"] as const;

const HOURLY_FIELDS = [
  "temperature_2m",
  "dew_point_2m",
  "wind_speed_10m",
  "wind_gusts_10m",
  "cloud_cover",
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
].join(",");

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export default defineHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

  const query = getQuery(event);
  rejectUnknownParameters(query, ALLOWED);

  const latitude = parseCoordinate(singleQuery(query, "latitude"), "latitude", -90, 90);
  const longitude = parseCoordinate(singleQuery(query, "longitude"), "longitude", -180, 180);
  const altitude = parseNumberParameter(singleQuery(query, "altitude"), "altitude", 0, 8849, 0);
  const days = parseNumberParameter(singleQuery(query, "days"), "days", 1, 3, 1);
  const timezone = singleQuery(query, "timezone") ?? "auto";

  const upstream = await fetchOpenMeteo({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: HOURLY_FIELDS,
    forecast_days: String(days),
    timezone,
  });

  const hourly = (upstream.hourly ?? null) as Record<string, unknown> | null;
  if (!hourly || !Array.isArray(hourly.time)) {
    throw createError({ statusCode: 502, statusMessage: "Risposta upstream priva del blocco hourly" });
  }

  const times = hourly.time as unknown[];
  const series: Record<string, unknown[]> = {
    temperature: (hourly.temperature_2m ?? []) as unknown[],
    dewPoint: (hourly.dew_point_2m ?? []) as unknown[],
    windSpeed: (hourly.wind_speed_10m ?? []) as unknown[],
    windGusts: (hourly.wind_gusts_10m ?? []) as unknown[],
    cloudCover: (hourly.cloud_cover ?? []) as unknown[],
    humidity: (hourly.relative_humidity_2m ?? []) as unknown[],
    precipitation: (hourly.precipitation ?? []) as unknown[],
    weatherCode: (hourly.weather_code ?? []) as unknown[],
  };

  const nowMs = Date.now();
  const inputs: InputTermica[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const time = typeof times[i] === "string" ? (times[i] as string) : "";
    if (!time) continue;
    // Include le ore da "adesso" in avanti (la prima ora precedente è utile come contesto)
    const timeMs = Date.parse(time.length === 16 ? `${time}:00` : time);
    if (Number.isFinite(timeMs) && timeMs + 60 * 60_000 < nowMs) continue;

    inputs.push({
      time,
      temperature: num(series.temperature[i]) ?? Number.NaN,
      dewPoint: num(series.dewPoint[i]) ?? Number.NaN,
      windSpeed: num(series.windSpeed[i]),
      windGusts: num(series.windGusts[i]),
      cloudCover: num(series.cloudCover[i]),
      humidity: num(series.humidity[i]),
      precipitation: num(series.precipitation[i]),
      weatherCode: num(series.weatherCode[i]),
    });
  }

  const termiche = inputs
    .map((input) => calcolaTermiche(input, altitude))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  // Finestra migliore: massimizza rateo con penalità per precipitazioni
  const volabili = termiche.filter((t) => (t.precipitation ?? 0) <= 0.3 && t.rateo >= 0.5);
  const migliore = volabili.reduce<typeof termiche[number] | null>(
    (best, current) => (best === null || current.rateo > best.rateo ? current : best),
    null,
  );

  return {
    ok: true,
    data: {
      location: { latitude, longitude, altitude },
      ore: termiche,
      finestraMigliore: migliore
        ? { ora: migliore.time, rateoMs: migliore.rateo, baseM: migliore.base, topM: migliore.top }
        : null,
    },
    meta: {
      source: "open-meteo",
      disclaimer: "Rateo, base e top sono stime empiriche (ETICHETTA: ESTIMATED) e non garanzie di sicurezza del volo.",
      timestamp: new Date().toISOString(),
    },
  };
});
