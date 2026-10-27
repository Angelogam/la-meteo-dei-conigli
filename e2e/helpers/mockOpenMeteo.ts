import type { Page } from "@playwright/test";

interface OpenMeteoMockOptions {
  /** Reject the detailed pressure-level query to verify the shared-data fallback. */
  failSounding?: boolean;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function allDays(start: string, end: string): string[] {
  const result: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= last && result.length < 17) {
    result.push(dayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function requestedDays(url: URL): string[] {
  const start = url.searchParams.get("start_date");
  const end = url.searchParams.get("end_date");
  if (start && end) return allDays(start, end);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days = Math.min(16, Math.max(1, Number(url.searchParams.get("forecast_days") || 3)));
  const result: string[] = [];
  for (let index = 0; index < days; index++) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + index);
    result.push(dayKey(date));
  }
  return result;
}

function requestedHours(url: URL): string[] {
  const start = url.searchParams.get("start_date");
  const end = url.searchParams.get("end_date");
  if (start && end) {
    return allDays(start, end).flatMap((day) =>
      Array.from({ length: 24 }, (_, hour) => `${day}T${String(hour).padStart(2, "0")}:00`),
    );
  }

  const hours = Number(url.searchParams.get("forecast_hours") || 0);
  if (hours > 0) {
    const cursor = new Date();
    cursor.setUTCMinutes(0, 0, 0);
    return Array.from({ length: Math.min(384, hours) }, (_, index) => {
      const time = new Date(cursor.getTime() + index * 60 * 60 * 1000);
      return `${dayKey(time)}T${String(time.getUTCHours()).padStart(2, "0")}:00`;
    });
  }

  return requestedDays(url).flatMap((day) =>
    Array.from({ length: 24 }, (_, hour) => `${day}T${String(hour).padStart(2, "0")}:00`),
  );
}

const PRESSURE_TEMPERATURES: Record<string, number> = {
  temperature_925hPa: 9,
  temperature_850hPa: 5,
  temperature_800hPa: 2,
  temperature_750hPa: 0,
  temperature_700hPa: -5,
  temperature_650hPa: -10,
  temperature_600hPa: -15,
  temperature_550hPa: -20,
  temperature_500hPa: -26,
};

const PRESSURE_HEIGHTS: Record<string, number> = {
  geopotential_height_925hPa: 760,
  geopotential_height_850hPa: 1450,
  geopotential_height_800hPa: 1900,
  geopotential_height_750hPa: 2300,
  geopotential_height_700hPa: 3000,
  geopotential_height_650hPa: 3500,
  geopotential_height_600hPa: 4200,
  geopotential_height_550hPa: 4800,
  geopotential_height_500hPa: 5500,
};

function hourlyValue(variable: string, time: string): number | null {
  const hour = Number(time.slice(11, 13));
  const daylight = hour >= 7 && hour <= 19;
  const temperature = Math.round((19 - Math.abs(hour - 14) * 0.65) * 10) / 10;

  if (variable === "temperature_2m") return temperature;
  if (variable === "relative_humidity_2m") return 55;
  if (variable === "dew_point_2m") return temperature - 7;
  if (variable === "precipitation" || variable === "snowfall") return 0;
  if (variable === "precipitation_probability") return 10;
  if (variable === "weather_code") return 1;
  if (variable.startsWith("cloud_cover")) return variable === "cloud_cover_low" ? 12 : variable === "cloud_cover_mid" ? 22 : variable === "cloud_cover_high" ? 28 : 24;
  if (variable === "wind_speed_10m") return 12 + Math.round(Math.max(0, 3 - Math.abs(hour - 14) / 2));
  if (variable === "wind_direction_10m") return 210;
  if (variable === "wind_gusts_10m") return 18;
  if (variable === "temperature_80m") return temperature - 1;
  if (variable === "temperature_120m") return temperature - 2;
  if (variable === "temperature_180m") return temperature - 3;
  if (variable === "wind_speed_80m") return 18;
  if (variable === "wind_speed_120m") return 21;
  if (variable === "wind_speed_180m") return 24;
  if (variable === "wind_direction_80m" || variable === "wind_direction_120m" || variable === "wind_direction_180m") return 220;
  if (variable === "cape") return daylight ? 350 : 0;
  if (variable === "convective_inhibition") return daylight ? -12 : -2;
  if (variable === "lifted_index") return -1.2;
  if (variable === "freezing_level_height") return 3100;
  if (variable === "boundary_layer_height") return daylight ? 1450 : 250;
  if (variable === "convective_cloud_base") return 1900;
  if (variable === "convective_cloud_top") return 3100;
  if (variable === "surface_pressure") return 820;
  if (variable === "pressure_msl") return 1014;
  if (variable === "shortwave_radiation") return daylight ? Math.round(350 * Math.sin(Math.PI * (hour - 7) / 12)) : 0;
  if (variable === "direct_radiation") return daylight ? 240 : 0;
  if (variable === "diffuse_radiation") return daylight ? 80 : 0;
  if (variable === "direct_normal_irradiance") return daylight ? 300 : 0;
  if (variable === "terrestrial_radiation") return -60;
  if (variable === "visibility") return 24000;
  if (variable === "uv_index") return daylight ? 4 : 0;
  if (variable === "is_day") return daylight ? 1 : 0;
  if (variable in PRESSURE_TEMPERATURES) return PRESSURE_TEMPERATURES[variable];
  if (variable in PRESSURE_HEIGHTS) return PRESSURE_HEIGHTS[variable];
  if (/^wind_speed_\d+hPa$/.test(variable)) return variable.includes("925") ? 16 : variable.includes("850") ? 22 : variable.includes("700") ? 29 : variable.includes("600") ? 35 : 39;
  if (/^wind_direction_\d+hPa$/.test(variable)) return variable.includes("500") ? 245 : 225;
  if (variable === "vapour_pressure_deficit") return 0.8;
  if (variable === "evapotranspiration" || variable === "et0_fao_evapotranspiration") return daylight ? 0.1 : 0;
  if (variable === "soil_temperature_0_to_10cm") return temperature - 2;
  if (variable === "soil_moisture_0_to_10cm") return 0.28;
  if (variable === "sunshine_duration") return daylight ? 3600 : 0;
  return null;
}

function dailyValue(variable: string): number | string | null {
  const values: Record<string, number | string> = {
    weather_code: 1,
    temperature_2m_max: 22,
    temperature_2m_min: 9,
    temperature_2m_mean: 15,
    precipitation_sum: 0,
    precipitation_probability_max: 10,
    wind_speed_10m_max: 16,
    wind_gusts_10m_max: 22,
    wind_direction_10m_dominant: 210,
    uv_index_max: 4,
    daylight_duration: 40500,
    sunshine_duration: 25200,
    apparent_temperature_max: 21,
    apparent_temperature_min: 7,
    cloud_cover_mean: 24,
  };
  return values[variable] ?? null;
}

function makePayload(url: URL): Record<string, unknown> {
  const hourlyNames = (url.searchParams.get("hourly") || "").split(",").filter(Boolean);
  const dailyNames = (url.searchParams.get("daily") || "").split(",").filter(Boolean);
  const currentNames = (url.searchParams.get("current") || "").split(",").filter(Boolean);
  const times = requestedHours(url);
  const days = requestedDays(url);
  const hourly: Record<string, unknown> = { time: times };
  const daily: Record<string, unknown> = { time: days };
  const currentTime = new Date();
  currentTime.setUTCMinutes(0, 0, 0);
  const currentTimeText = `${dayKey(currentTime)}T${String(currentTime.getUTCHours()).padStart(2, "0")}:00`;
  const current: Record<string, unknown> = { time: currentTimeText, interval: 3600 };

  for (const name of hourlyNames) hourly[name] = times.map((time) => hourlyValue(name, time));
  for (const name of dailyNames) {
    if (name === "sunrise" || name === "sunset") {
      daily[name] = days.map((day) => `${day}T${name === "sunrise" ? "07:30" : "18:30"}`);
    } else {
      daily[name] = days.map(() => dailyValue(name));
    }
  }
  for (const name of currentNames) current[name] = hourlyValue(name, currentTimeText);

  const payload: Record<string, unknown> = {
    latitude: Number(url.searchParams.get("latitude") || 44.5),
    longitude: Number(url.searchParams.get("longitude") || 7.5),
    generationtime_ms: 1,
    utc_offset_seconds: 7200,
    timezone: "Europe/Rome",
    timezone_abbreviation: "CEST",
    elevation: 1200,
  };
  if (hourlyNames.length) payload.hourly = hourly;
  if (dailyNames.length) payload.daily = daily;
  if (currentNames.length) payload.current = current;
  return payload;
}

/** Keep browser tests deterministic and independent of Open-Meteo rate limits. */
export async function installOpenMeteoMock(page: Page, options: OpenMeteoMockOptions = {}): Promise<void> {
  await page.route(
    (url) => url.pathname === "/api/open-meteo" || (url.origin === "https://api.open-meteo.com" && url.pathname === "/v1/forecast"),
    async (route) => {
      const url = new URL(route.request().url());
      const hourly = url.searchParams.get("hourly") || "";
      if (options.failSounding && hourly.includes("temperature_925hPa")) {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*", "retry-after": "1" },
          body: JSON.stringify({ reason: "Simulated rate limit for the detailed sounding request" }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(makePayload(url)),
      });
    },
  );
}
