"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

export interface MeteoHourly {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  apparentTemp: number;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  pressure: number;
  uvIndex: number;
  temp80m: number | null;
  temp120m: number | null;
}

export interface MeteoDaily {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipSum: number;
  precipProb: number;
  windSpeedMax: number;
  windGustsMax: number;
}

export interface MeteoResult {
  hourly: MeteoHourly[];
  daily: MeteoDaily[];
}

export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<MeteoResult> {
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

    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
    
    const data = await res.json();

    const hourly: MeteoHourly[] = data.hourly.time.map((t: string, i: number) => ({
      time: new Date(t),
      temperature: data.hourly.temperature_2m?.[i] ?? 0,
      humidity: data.hourly.relative_humidity_2m?.[i] ?? 50,
      dewPoint: data.hourly.dew_point_2m?.[i] ?? 0,
      apparentTemp: data.hourly.apparent_temperature?.[i] ?? 0,
      precipitation: data.hourly.precipitation?.[i] ?? 0,
      weatherCode: data.hourly.weather_code?.[i] ?? 0,
      cloudCover: data.hourly.cloud_cover?.[i] ?? 0,
      windSpeed: data.hourly.wind_speed_10m?.[i] ?? 0,
      windDir: data.hourly.wind_direction_10m?.[i] ?? 0,
      windGusts: data.hourly.wind_gusts_10m?.[i] ?? 0,
      pressure: data.hourly.surface_pressure?.[i] ?? 1013,
      uvIndex: data.hourly.uv_index?.[i] ?? 0,
      temp80m: data.hourly.temperature_80m?.[i] ?? null,
      temp120m: data.hourly.temperature_120m?.[i] ?? null,
    }));

    const daily: MeteoDaily[] = data.daily.time.map((t: string, i: number) => ({
      date: new Date(t),
      weatherCode: data.daily.weather_code?.[i] ?? 0,
      tempMax: data.daily.temperature_2m_max?.[i] ?? 0,
      tempMin: data.daily.temperature_2m_min?.[i] ?? 0,
      precipSum: data.daily.precipitation_sum?.[i] ?? 0,
      precipProb: data.daily.precipitation_probability_max?.[i] ?? 0,
      windSpeedMax: data.daily.wind_speed_10m_max?.[i] ?? 0,
      windGustsMax: data.daily.wind_gusts_10m_max?.[i] ?? 0,
    }));

    return { hourly, daily };
  },

  async fetchWithFallback(lat: number, lon: number): Promise<MeteoResult> {
    try {
      return await this.fetchWeather(lat, lon);
    } catch (error) {
      console.warn(`Fallback per ${lat},${lon}:`, error);
      throw error;
    }
  },
};