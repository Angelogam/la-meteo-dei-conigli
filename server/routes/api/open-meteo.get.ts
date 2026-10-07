import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const ALLOWED = new Set([
  "latitude","longitude","timezone","hourly","daily","current",
  "forecast_days","forecast_hours","start_date","end_date","models",
  "temperature_unit","wind_speed_unit","precipitation_unit"
]);

export default defineHandler(async (event) => {
  const query = getQuery(event);
  const url = new URL(OPEN_METEO_URL);

  for (const key of ALLOWED) {
    const value = query[key];
    if (typeof value === "string" && value) url.searchParams.set(key, value);
  }

  const lat = Number(url.searchParams.get("latitude"));
  const lon = Number(url.searchParams.get("longitude"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw createError({ statusCode: 400, statusMessage: "Coordinate meteo non valide" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { accept: "application/json" }
    });
    const body = await response.text();

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: "Open-Meteo ha rifiutato la richiesta",
        data: body.slice(0, 500)
      });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "s-maxage=120, stale-while-revalidate=300"
      }
    });
  } catch (error: any) {
    if (error?.statusCode) throw error;
    throw createError({ statusCode: 502, statusMessage: "Open-Meteo non raggiungibile" });
  } finally {
    clearTimeout(timer);
  }
});
