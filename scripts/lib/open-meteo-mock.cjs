/**
 * Mock Open-Meteo condiviso per le verifiche Playwright locali.
 * Risponde SEMPRE con un numero per ogni variabile richiesta (mai null)
 * per evitare il crash .toFixed(null) noto nei componenti client.
 */

const PRESSURE_HEIGHTS = {
  geopotential_height_925hPa: 760, geopotential_height_900hPa: 1050,
  geopotential_height_850hPa: 1450, geopotential_height_800hPa: 1900,
  geopotential_height_750hPa: 2300, geopotential_height_700hPa: 3000,
  geopotential_height_650hPa: 3500, geopotential_height_600hPa: 4200,
  geopotential_height_550hPa: 4800, geopotential_height_500hPa: 5500,
};
const PRESSURE_TEMPS = {
  temperature_925hPa: 9, temperature_850hPa: 5, temperature_800hPa: 2,
  temperature_750hPa: 0, temperature_700hPa: -5, temperature_650hPa: -10,
  temperature_600hPa: -15, temperature_550hPa: -20, temperature_500hPa: -26,
};

function hourlyValue(variable, time) {
  const hour = Number(time.slice(11, 13));
  const daylight = hour >= 7 && hour <= 19;
  const temperature = Math.round((19 - Math.abs(hour - 14) * 0.65) * 10) / 10;

  if (variable === "temperature_2m") return temperature;
  if (variable === "relative_humidity_2m") return 55;
  if (variable === "dew_point_2m") return temperature - 7;
  if (variable === "apparent_temperature") return temperature - 1;
  if (variable === "precipitation" || variable === "rain" || variable === "snowfall") return 0;
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
  if (variable === "shortwave_radiation") return daylight ? 350 : 0;
  if (variable === "direct_radiation") return daylight ? 240 : 0;
  if (variable === "diffuse_radiation") return daylight ? 80 : 0;
  if (variable === "direct_normal_irradiance") return daylight ? 300 : 0;
  if (variable === "terrestrial_radiation") return -60;
  if (variable === "visibility") return 24000;
  if (variable === "uv_index") return daylight ? 4 : 0;
  if (variable === "is_day") return daylight ? 1 : 0;
  if (variable in PRESSURE_TEMPS) return PRESSURE_TEMPS[variable];
  if (variable in PRESSURE_HEIGHTS) return PRESSURE_HEIGHTS[variable];
  if (/^wind_speed_\d+hPa$/.test(variable)) return variable.includes("925") ? 16 : variable.includes("850") ? 22 : variable.includes("700") ? 29 : variable.includes("600") ? 35 : 39;
  if (/^wind_direction_\d+hPa$/.test(variable)) return 225;
  if (variable === "vapour_pressure_deficit") return 0.8;
  if (variable === "evapotranspiration" || variable === "et0_fao_evapotranspiration") return daylight ? 0.1 : 0;
  if (variable === "soil_temperature_0_to_10cm") return temperature - 2;
  if (variable === "soil_moisture_0_to_10cm") return 0.28;
  if (variable === "sunshine_duration") return daylight ? 3600 : 0;
  if (variable === "wind_speed_of_gust") return 18;

  /* Fallback robusto: MAI null — qualsiasi variabile non nota ottiene un valore plausibile. */
  const v = variable.toLowerCase();
  if (v.includes("direction")) return 210;
  if (v.includes("gust")) return 18;
  if (v.includes("wind") || v.includes("speed")) return 12;
  if (v.includes("cloud")) return 24;
  if (v.includes("temperature")) return 15;
  if (v.includes("precipitation") || v.includes("rain") || v.includes("snow")) return 0;
  if (v.includes("humidity")) return 55;
  if (v.includes("pressure")) return 1014;
  if (v.includes("radiation") || v.includes("irradiance")) return 200;
  if (v.includes("visibility")) return 24000;
  if (v.includes("height") || v.includes("level") || v.includes("altitude") || v.includes("gh")) return 2000;
  return 0;
}

function dailyValue(variable) {
  const values = {
    weather_code: 1, temperature_2m_max: 22, temperature_2m_min: 9, temperature_2m_mean: 15,
    precipitation_sum: 0, precipitation_probability_max: 10, precipitation_hours: 0,
    wind_speed_10m_max: 16, wind_gusts_10m_max: 22, wind_direction_10m_dominant: 210,
    uv_index_max: 4, daylight_duration: 40500, sunshine_duration: 25200,
    apparent_temperature_max: 21, apparent_temperature_min: 7, cloud_cover_mean: 24,
    shortwave_radiation_sum: 18000, et0_fao_evapotranspiration: 2,
  };
  return values[variable] ?? 0;
}

function makePayload(url) {
  const q = url.searchParams;
  const hourlyNames = (q.get("hourly") || "").split(",").filter(Boolean);
  const dailyNames = (q.get("daily") || "").split(",").filter(Boolean);
  const currentNames = (q.get("current") || "").split(",").filter(Boolean);
  const days = Math.min(3, Math.max(1, Number(q.get("forecast_days") || 3)));
  const today = new Date();
  const dayKeys = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dayKeys.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"));
  }
  const times = dayKeys.flatMap((day) => Array.from({ length: 24 }, (_, h) => `${day}T${String(h).padStart(2, "0")}:00`));
  const hourly = { time: times };
  for (const name of hourlyNames) hourly[name] = times.map((t) => hourlyValue(name, t));
  const daily = { time: dayKeys };
  for (const name of dailyNames) {
    daily[name] = name === "sunrise" ? dayKeys.map((d) => `${d}T07:30`)
      : name === "sunset" ? dayKeys.map((d) => `${d}T18:30`)
      : dayKeys.map(() => dailyValue(name));
  }
  const nowH = String(today.getHours()).padStart(2, "0");
  const currentTime = `${dayKeys[0]}T${nowH}:00`;
  const current = { time: currentTime, interval: 3600 };
  for (const name of currentNames) current[name] = hourlyValue(name, currentTime);
  const payload = {
    latitude: Number(q.get("latitude") || 44.5),
    longitude: Number(q.get("longitude") || 7.5),
    generationtime_ms: 1,
    utc_offset_seconds: 3600,
    timezone: "Europe/Rome",
    timezone_abbreviation: "CET",
    elevation: 1200,
  };
  if (hourlyNames.length) payload.hourly = hourly;
  if (dailyNames.length) payload.daily = daily;
  if (currentNames.length) payload.current = current;
  return payload;
}

async function installMock(page) {
  await page.route(
    (url) => url.pathname === "/api/open-meteo" || (url.origin === "https://api.open-meteo.com" && url.pathname.startsWith("/v1/")),
    async (route) => {
      const payload = makePayload(new URL(route.request().url()));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(payload),
      });
    },
  );
}

module.exports = { hourlyValue, dailyValue, makePayload, installMock };
