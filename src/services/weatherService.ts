"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoHourlyData {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  dew_point_2m: number;
  apparent_temperature: number;
  precipitation: number;
  weather_code: number;
  cloud_cover: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  surface_pressure: number;
  uv_index: number;
  temperature_80m: number;
  temperature_120m: number;
}

interface OpenMeteoDailyData {
  time: string;
  weather_code: number;
  temperature_2m_max: number;
  temperature_2m_min: number;
  precipitation_sum: number;
  precipitation_probability_max: number;
  wind_speed_10m_max: number;
  wind_gusts_10m_max: number;
}

interface OpenMeteoResponse {
  hourly: { time: string[] } & Record<string, number[]>;
  daily: { time: string[] } & Record<string, number[]>;
}

function convertHourly(raw: OpenMeteoHourlyData[], timezone: string) {
  if (!raw?.time?.length) return [];

  // Open-Meteo restituisce time in UTC o in timezone specificata.
  // Con timezone=Europe/Rome, i time sono già in ora locale.
  return raw.time.map((time, i) => {
    // Per sicurezza, forziamo il parsing come stringa e poi calcoliamo ora
    const date = new Date(time);
    
    return {
      time: date,
      temperature: raw.temperature_2m?.[i] ?? raw.temperature_2m?.[0] ?? 0,
      humidity: raw.relative_humidity_2m?.[i] ?? raw.relative_humidity_2m?.[0] ?? 50,
      dewPoint: raw.dew_point_2m?.[i] ?? raw.dew_point_2m?.[0] ?? 0,
      apparentTemp: raw.apparent_temperature?.[i] ?? raw.apparent_temperature?.[0] ?? 0,
      precipitation: raw.precipitation?.[i] ?? raw.precipitation?.[0] ?? 0,
      weatherCode: raw.weather_code?.[i] ?? raw.weather_code?.[0] ?? 0,
      cloudCover: raw.cloud_cover?.[i] ?? raw.cloud_cover?.[0] ?? 0,
      windSpeed: raw.wind_speed_10m?.[i] ?? raw.wind_speed_10m?.[0] ?? 0,
      windDir: raw.wind_direction_10m?.[i] ?? raw.wind_direction_10m?.[0] ?? 0,
      windGusts: raw.wind_gusts_10m?.[i] ?? raw.wind_gusts_10m?.[0] ?? 0,
      pressure: raw.surface_pressure?.[i] ?? raw.surface_pressure?.[0] ?? 1013,
      uvIndex: raw.uv_index?.[i] ?? raw.uv_index?.[0] ?? 0,
      temp80m: raw.temperature_80m?.[i] ?? null,
      temp120m: raw.temperature_120m?.[i] ?? null,
    };
  });
}

function convertDaily(raw: OpenMeteoDailyData[]) {
  if (!raw?.time?.length) return [];

  return raw.time.map((time, i) => {
    const date = new Date(time);
    
    return {
      date,
      weatherCode: raw.weather_code?.[i] ?? 0,
      tempMax: raw.temperature_2m_max?.[i] ?? 0,
      tempMin: raw.temperature_2m_min?.[i] ?? 0,
      precipSum: raw.precipitation_sum?.[i] ?? 0,
      precipProb: raw.precipitation_probability_max?.[i] ?? 0,
      windSpeedMax: raw.wind_speed_10m_max?.[i] ?? 0,
      windGustsMax: raw.wind_gusts_10m_max?.[i] ?? 0,
    };
  });
}

export const weatherService = {
  async fetchWeather(lat: number, lon: number) {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "apparent_temperature",
        "precipitation",
        "weather_code",
        "cloud_cover",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "surface_pressure",
        "uv_index",
        "temperature_80m",
        "temperature_120m",
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
      ].join(","),
      timezone: "Europe/Rome",
      forecast_days: "3",
    });

    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Open-Meteo error: ${response.status}`);
    }

    const data: OpenMeteoResponse = await response.json();

    return {
      hourly: convertHourly(data.hourly as any, "Europe/Rome"),
      daily: convertDaily(data.daily as any),
    };
  },

  async fetchWithFallback(lat: number, lon: number) {
    try {
      return await this.fetchWeather(lat, lon);
    } catch (error) {
      console.warn(`Fallback per ${lat},${lon}:`, error);
      throw error;
    }
  },
};