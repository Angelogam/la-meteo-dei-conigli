"use client";

export interface MeteoHourly {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  apparentTemp: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  cloudCover: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  uvIndex: number;
  shortwaveRadiation: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  windProfile?: { height: number; speed: number; dir: number }[];
}

export interface MeteoCurrent {
  temperature: number;
  humidity: number;
  pressure: number;
  cloudCover: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  weatherCode: number;
  precipitation: number;
}

export interface MeteoDaily {
  date: Date;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationSum: number;
  windSpeedMax: number;
  precipitationProbabilityMax: number;
  uvIndexMax: number;
  windDirDominant: number;
  shortwaveRadiationSum: number;
}

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "precipitation_probability",
  "weather_code",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "shortwave_radiation",
  "cape",
  "convective_inhibition",
  "lifted_index",
  // venti in quota
  "wind_speed_80m",
  "wind_direction_80m",
  "wind_speed_120m",
  "wind_direction_120m",
  "wind_speed_180m",
  "wind_direction_180m",
  "wind_speed_300m",
  "wind_direction_300m",
  "wind_speed_600m",
  "wind_direction_600m",
  "wind_speed_1000m",
  "wind_direction_1000m",
  "wind_speed_1500m",
  "wind_direction_1500m",
  "wind_speed_2000m",
  "wind_direction_2000m",
  "wind_speed_2500m",
  "wind_direction_2500m",
  "wind_speed_3000m",
  "wind_direction_3000m",
].join(",");

const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
  "shortwave_radiation_sum",
].join(",");

interface MeteoResponse {
  hourly: Record<string, (number | string)[]>;
  daily: Record<string, (number | string)[]>;
  current: Record<string, number | string>;
}

function parseDate(timeStr: string): Date {
  return new Date(timeStr);
}

function parseHourly(raw: MeteoResponse["hourly"]): MeteoHourly[] {
  const len = raw.time.length;
  const result: MeteoHourly[] = [];

  for (let i = 0; i < len; i++) {
    const t = parseDate(raw.time[i] as string);

    // Costruisci windProfile dai livelli disponibili
    const windProfile = [];
    const altLevels = [
      { key: "80m", height: 80 },
      { key: "120m", height: 120 },
      { key: "180m", height: 180 },
      { key: "300m", height: 300 },
      { key: "600m", height: 600 },
      { key: "1000m", height: 1000 },
      { key: "1500m", height: 1500 },
      { key: "2000m", height: 2000 },
      { key: "2500m", height: 2500 },
      { key: "3000m", height: 3000 },
    ];

    for (const level of altLevels) {
      const speedKey = `wind_speed_${level.key}`;
      const dirKey = `wind_direction_${level.key}`;
      const speed = raw[speedKey]?.[i] as number;
      const dir = raw[dirKey]?.[i] as number;
      if (speed != null && dir != null) {
        windProfile.push({ height: level.height, speed, dir });
      }
    }

    result.push({
      time: t,
      temperature: (raw.temperature_2m?.[i] as number) ?? 15,
      humidity: (raw.relative_humidity_2m?.[i] as number) ?? 50,
      dewPoint: (raw.dew_point_2m?.[i] as number) ?? 8,
      apparentTemp: (raw.apparent_temperature?.[i] as number) ?? 15,
      precipitation: (raw.precipitation?.[i] as number) ?? 0,
      precipitationProbability: (raw.precipitation_probability?.[i] as number) ?? 0,
      weatherCode: (raw.weather_code?.[i] as number) ?? 0,
      cloudCover: (raw.cloud_cover?.[i] as number) ?? 0,
      windSpeed: (raw.wind_speed_10m?.[i] as number) ?? 0,
      windDir: (raw.wind_direction_10m?.[i] as number) ?? 0,
      windGusts: (raw.wind_gusts_10m?.[i] as number) ?? 0,
      uvIndex: (raw.uv_index?.[i] as number) ?? 0,
      shortwaveRadiation: (raw.shortwave_radiation?.[i] as number) ?? 0,
      cape: (raw.cape?.[i] as number) ?? 0,
      cin: (raw.convective_inhibition?.[i] as number) ?? 0,
      liftedIndex: (raw.lifted_index?.[i] as number) ?? 0,
      windProfile: windProfile.length > 0 ? windProfile : undefined,
    });
  }

  return result;
}

function parseCurrent(raw: MeteoResponse["current"]): MeteoCurrent {
  return {
    temperature: (raw.temperature_2m as number) ?? 15,
    humidity: (raw.relative_humidity_2m as number) ?? 50,
    pressure: (raw.pressure_msl as number) ?? 1013,
    cloudCover: (raw.cloud_cover as number) ?? 0,
    windSpeed: (raw.wind_speed_10m as number) ?? 0,
    windDir: (raw.wind_direction_10m as number) ?? 0,
    windGusts: (raw.wind_gusts_10m as number) ?? 0,
    weatherCode: (raw.weather_code as number) ?? 0,
    precipitation: (raw.precipitation as number) ?? 0,
  };
}

function parseDaily(raw: MeteoResponse["daily"]): MeteoDaily[] {
  const len = raw.time.length;
  const result: MeteoDaily[] = [];

  for (let i = 0; i < len; i++) {
    result.push({
      date: parseDate(raw.time[i] as string),
      tempMax: (raw.temperature_2m_max?.[i] as number) ?? 15,
      tempMin: (raw.temperature_2m_min?.[i] as number) ?? 5,
      weatherCode: (raw.weather_code?.[i] as number) ?? 0,
      precipitationSum: (raw.precipitation_sum?.[i] as number) ?? 0,
      windSpeedMax: (raw.wind_speed_10m_max?.[i] as number) ?? 0,
      precipitationProbabilityMax: (raw.precipitation_probability_max?.[i] as number) ?? 0,
      uvIndexMax: (raw.uv_index_max?.[i] as number) ?? 0,
      windDirDominant: (raw.wind_direction_10m_dominant?.[i] as number) ?? 0,
      shortwaveRadiationSum: (raw.shortwave_radiation_sum?.[i] as number) ?? 0,
    });
  }

  return result;
}

async function fetchMeteoData(lat: number, lon: number): Promise<{
  hourly: MeteoHourly[];
  current: MeteoCurrent;
  daily: MeteoDaily[];
  model: string;
}> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: HOURLY_PARAMS,
    daily: DAILY_PARAMS,
    timezone: "Europe/Rome",
    forecast_days: "3",
    models: "best_match",
  });

  const url = `${BASE_URL}?${params.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const raw: MeteoResponse = await res.json();

  return {
    hourly: parseHourly(raw.hourly),
    current: parseCurrent(raw.current || raw.hourly),
    daily: parseDaily(raw.daily),
    model: "best_match",
  };
}

export const weatherService = {
  fetchWeather: fetchMeteoData,

  async fetchWithFallback(lat: number, lon: number): Promise<{
    data: { hourly: MeteoHourly[]; current: MeteoCurrent; daily: MeteoDaily[]; model: string } | null;
    ok: boolean;
  }> {
    try {
      const data = await fetchMeteoData(lat, lon);
      return { data, ok: true };
    } catch (err) {
      console.error("⚠️ Errore Open-Meteo:", err);
      console.warn(`[weatherService] fetchWithFallback fallito per ${lat},${lon}:`, err);
      return { data: null, ok: false };
    }
  },

  async fetchCurrent(lat: number, lon: number): Promise<{
    data: MeteoCurrent | null;
    ok: boolean;
  }> {
    try {
      const data = await fetchMeteoData(lat, lon);
      return { data: data.current, ok: true };
    } catch {
      return { data: null, ok: false };
    }
  },
};