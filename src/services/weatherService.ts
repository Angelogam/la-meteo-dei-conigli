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
    
    const raw: any = await res.json();

    // DEBUG: stampa i raw headers per vedere se riceviamo weather_code
    console.log("=== WEATHER SERVICE RAW HOURLY KEYS ===");
    console.log(Object.keys(raw.hourly).join(", "));
    console.log("=== RAW DAILY KEYS ===");
    console.log(Object.keys(raw.daily).join(", "));
    
    // Se non trova weather_code, prova weathercode (vecchio nome)
    const hourlyCodes = raw.hourly.weather_code || raw.hourly.weathercode;
    const dailyCodes = raw.daily.weather_code || raw.daily.weathercode;
    
    if (!hourlyCodes) {
      console.error("❌ CRITICAL: weather_code non trovato in hourly! Keys:", Object.keys(raw.hourly));
    }

    // --- HOURLY ---
    const hourly: MeteoHourly[] = (raw.hourly.time as string[]).map((t: string, i: number) => {
      const date = new Date(t);
      return {
        time: date,
        temperature: raw.hourly.temperature_2m?.[i] ?? 0,
        humidity: raw.hourly.relative_humidity_2m?.[i] ?? 50,
        dewPoint: raw.hourly.dew_point_2m?.[i] ?? 0,
        apparentTemp: raw.hourly.apparent_temperature?.[i] ?? 0,
        precipitation: raw.hourly.precipitation?.[i] ?? 0,
        weatherCode: raw.hourly.weather_code?.[i] ?? raw.hourly.weathercode?.[i] ?? 0,
        cloudCover: raw.hourly.cloud_cover?.[i] ?? 0,
        windSpeed: raw.hourly.wind_speed_10m?.[i] ?? 0,
        windDir: raw.hourly.wind_direction_10m?.[i] ?? 0,
        windGusts: raw.hourly.wind_gusts_10m?.[i] ?? 0,
        pressure: raw.hourly.surface_pressure?.[i] ?? 1013,
        uvIndex: raw.hourly.uv_index?.[i] ?? 0,
        temp80m: raw.hourly.temperature_80m?.[i] ?? null,
        temp120m: raw.hourly.temperature_120m?.[i] ?? null,
      };
    });

    // --- DAILY ---
    const daily: MeteoDaily[] = (raw.daily.time as string[]).map((t: string, i: number) => {
      const date = new Date(t);
      return {
        date,
        weatherCode: raw.daily.weather_code?.[i] ?? raw.daily.weathercode?.[i] ?? 0,
        tempMax: raw.daily.temperature_2m_max?.[i] ?? 0,
        tempMin: raw.daily.temperature_2m_min?.[i] ?? 0,
        precipSum: raw.daily.precipitation_sum?.[i] ?? 0,
        precipProb: raw.daily.precipitation_probability_max?.[i] ?? 0,
        windSpeedMax: raw.daily.wind_speed_10m_max?.[i] ?? 0,
        windGustsMax: raw.daily.wind_gusts_10m_max?.[i] ?? 0,
      };
    });

    console.log("=== WEATHER SERVICE: primo hourly ===");
    console.log({
      time: hourly[0].time,
      temp: hourly[0].temperature,
      weatherCode: hourly[0].weatherCode,
      precip: hourly[0].precipitation,
    });

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