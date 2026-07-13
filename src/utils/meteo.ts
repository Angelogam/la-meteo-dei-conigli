"use client";

import type { HourData, MeteoData, ThermalData, WindProfile } from "@/types/meteo";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

export const fetchMeteo = async (lat: number, lon: number): Promise<MeteoData> => {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: "temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,soil_temperature_0_to_7cm,soil_moisture_0_to_7cm,uv_index,is_day",
    daily: "temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum",
    timezone: "Europe/Rome",
    forecast_days: "4",
  });

  const res = await fetch(`${BASE_URL}?${params}`);
  if (!res.ok) throw new Error(`Errore HTTP ${res.status}`);
  const raw = await res.json();

  const times: string[] = raw.hourly.time;
  const hourly: HourData[] = times.map((t: string, i: number) => ({
    time: new Date(t),
    temperature: raw.hourly.temperature_2m[i],
    humidity: raw.hourly.relative_humidity_2m[i],
    dewPoint: raw.hourly.dew_point_2m[i],
    apparentTemp: raw.hourly.apparent_temperature[i],
    precipitationProba: raw.hourly.precipitation_probability?.[i] ?? 0,
    precipitation: raw.hourly.precipitation[i],
    rain: 0,
    showers: 0,
    snowfall: 0,
    weatherCode: raw.hourly.weather_code[i],
    pressure: raw.hourly.pressure_msl[i],
    surfacePressure: raw.hourly.pressure_msl[i],
    cloudCover: raw.hourly.cloud_cover[i],
    cloudCoverLow: 0,
    cloudCoverMid: 0,
    cloudCoverHigh: 0,
    evapotranspiration: 0,
    et0: 0,
    vapourPressureDeficit: 0,
    windSpeed: raw.hourly.wind_speed_10m[i],
    windDir: raw.hourly.wind_direction_10m[i],
    windGusts: raw.hourly.wind_gusts_10m[i],
    soilTemp: raw.hourly.soil_temperature_0_to_7cm?.[i] ?? null,
    soilMoisture: raw.hourly.soil_moisture_0_to_7cm?.[i] ?? null,
    uvIndex: raw.hourly.uv_index?.[i] ?? null,
    temp80m: null,
    temp120m: null,
    shortwaveRadiation: 0,
    directRadiation: 0,
    diffuseRadiation: 0,
    directNormalIrradiance: 0,
    terrestrialRadiation: 0,
    sunshineDuration: 0,
  }));

  const dTimes: string[] = raw.daily.time;
  const daily = dTimes.map((t: string, i: number) => ({
    date: new Date(t),
    tempMax: raw.daily.temperature_2m_max[i],
    tempMin: raw.daily.temperature_2m_min[i],
    weatherCode: raw.daily.weather_code[i],
    precipitationSum: raw.daily.precipitation_sum[i],
  }));

  return { hourly, daily, lat, lon };
};

export const fetchWindProfiles = async (lat: number, lon: number): Promise<WindProfile[]> => {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: "pressure_level,temperature_120m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,wind_speed_300m,wind_direction_300m,wind_speed_600m,wind_direction_600m,wind_speed_900m,wind_direction_900m,wind_speed_1200m,wind_direction_1200m,wind_speed_1500m,wind_direction_1500m,wind_speed_1800m,wind_direction_1800m,wind_speed_2100m,wind_direction_2100m,wind_speed_2400m,wind_direction_2400m,wind_speed_2800m,wind_direction_2800m,wind_speed_3200m,wind_direction_3200m,wind_speed_3600m,wind_direction_3600m,wind_speed_4000m,wind_direction_4000m",
    timezone: "Europe/Rome",
    forecast_days: "4",
  });

  try {
    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) return [];
    const raw = await res.json();
    const times: string[] = raw.hourly.time;
    const profiles: WindProfile[] = [];
    const levels = [
      { height: 120 },
      { height: 180 },
      { height: 300 },
      { height: 600 },
      { height: 900 },
      { height: 1200 },
      { height: 1500 },
      { height: 1800 },
      { height: 2100 },
      { height: 2400 },
      { height: 2800 },
      { height: 3200 },
      { height: 3600 },
      { height: 4000 },
    ];

    for (let t = 0; t < times.length; t++) {
      const levelsData = levels.map((l) => {
        const speedKey = `wind_speed_${l.height}m`;
        const dirKey = `wind_direction_${l.height}m`;
        return {
          height: l.height,
          speed: raw.hourly[speedKey]?.[t] ?? null,
          dir: raw.hourly[dirKey]?.[t] ?? null,
        };
      });
      profiles.push({ time: new Date(times[t]), levels: levelsData });
    }
    return profiles;
  } catch {
    return [];
  }
};

export const fetchMeteoHourly = async (lat: number, lon: number): Promise<HourData[]> => {
  const data = await fetchMeteo(lat, lon);
  return data.hourly;
};

export const wic = (code: number, emoji: boolean = true): string => {
  if (emoji) {
    if (code === 0) return "☀️";
    if (code <= 3) return "🌤️";
    if (code <= 48) return "🌫️";
    if (code <= 57) return "🌦️";
    if (code <= 67) return "🌧️";
    if (code <= 77) return "🌨️";
    if (code <= 82) return "🌦️";
    return "⛈️";
  }
  return "";
};

export const wd = (deg: number): string => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
};

export const wa = (deg: number): string => wd(deg);

export const enrDaily = (daily: MeteoData["daily"], hourly: HourData[]) => {
  return daily.map((d) => {
    const dayHours = hourly.filter(
      (h) =>
        h.time.getDate() === d.date.getDate() &&
        h.time.getMonth() === d.date.getMonth() &&
        h.time.getFullYear() === d.date.getFullYear()
    );
    const avgWind = dayHours.length ? dayHours.reduce((s, h) => s + h.windSpeed, 0) / dayHours.length : 0;
    const maxWind = dayHours.length ? Math.max(...dayHours.map((h) => h.windSpeed)) : 0;
    const avgCloud = dayHours.length ? dayHours.reduce((s, h) => s + h.cloudCover, 0) / dayHours.length : 0;
    return { ...d, avgWind, maxWind, avgCloud };
  });
};

export const calcThermal = (dayData: HourData[], siteAlt: number): ThermalData | null => {
  if (!dayData.length) return null;
  const avgTemp = dayData.reduce((s, h) => s + h.temperature, 0) / dayData.length;
  const avgDew = dayData.reduce((s, h) => s + h.dewPoint, 0) / dayData.length;
  const avgHum = dayData.reduce((s, h) => s + h.humidity, 0) / dayData.length;
  const maxTemp = Math.max(...dayData.map((h) => h.temperature));
  const minTemp = Math.min(...dayData.map((h) => h.temperature));
  const tempRange = maxTemp - minTemp;
  const cloudBase = Math.round((avgTemp - avgDew) * 125);
  const cape = Math.round(Math.max(0, (tempRange * 50) + (avgHum > 50 ? 200 : 0)));
  const thermalTop = Math.round(cloudBase + (cape / 100) * 300);
  const soarIdx = Math.min(10, Math.max(0, Math.round(
    (tempRange / 15) * 3 + (avgHum < 60 ? 2 : 0) + (cloudBase > 800 ? 2 : 0) + (avgTemp > 20 ? 2 : 0) + (avgTemp > 25 ? 1 : 0)
  )));
  return { cloudBase, thermalTop, soarIdx };
};

export const filterFlightHours = (data: HourData[]): HourData[] => {
  return data.filter((h) => {
    const hh = h.time.getHours();
    return hh >= 9 && hh <= 19;
  });
};