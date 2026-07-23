"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

export interface MeteoHourly {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  pressure: number;
  apparentTemp: number;
  precipitation: number;
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
  temp80m: number | null;
  temp120m: number | null;
  [key: string]: any;
}

export interface MeteoCurrent {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  weatherCode: number;
  cloudCover: number;
  precipitation: number;
  pressure: number;
  uvIndex: number;
}

export interface MeteoDaily {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipSum: number;
  precipProbaMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  uvIndexMax: number;
  [key: string]: any;
}

export interface WindProfileResult {
  ventoOrario: {
    ora: number;
    gust: number;
    quote: Record<number, { speed: number; dir: number }>;
  }[];
}

interface FetchResult {
  hourly: MeteoHourly[];
  daily: MeteoDaily[];
  current: MeteoCurrent;
}

interface BatchCurrentResult {
  ok: boolean;
  data: MeteoCurrent | null;
  error?: string;
}

const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "shortwave_radiation",
  "cape",
  "convective_inhibition",
  "lifted_index",
  "temperature_80m",
  "temperature_120m",
  "wind_speed_80m",
  "wind_direction_80m",
  "wind_speed_120m",
  "wind_direction_120m",
  "wind_speed_180m",
  "wind_direction_180m",
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
].join(",");

function parseHourly(raw: any): MeteoHourly[] {
  if (!raw?.hourly?.time) return [];
  const { hourly } = raw;
  const len = hourly.time.length;
  const result: MeteoHourly[] = [];

  for (let i = 0; i < len; i++) {
    result.push({
      time: new Date(hourly.time[i]),
      temperature: hourly.temperature_2m?.[i] ?? 0,
      humidity: hourly.relative_humidity_2m?.[i] ?? 50,
      dewPoint: hourly.dew_point_2m?.[i] ?? 5,
      pressure: hourly.pressure_msl?.[i] ?? 1013,
      apparentTemp: hourly.apparent_temperature?.[i] ?? 0,
      precipitation: hourly.precipitation?.[i] ?? 0,
      weatherCode: hourly.weather_code?.[i] ?? 0,
      cloudCover: hourly.cloud_cover?.[i] ?? 0,
      windSpeed: hourly.wind_speed_10m?.[i] ?? 0,
      windDir: hourly.wind_direction_10m?.[i] ?? 0,
      windGusts: hourly.wind_gusts_10m?.[i] ?? 0,
      uvIndex: hourly.uv_index?.[i] ?? 0,
      shortwaveRadiation: hourly.shortwave_radiation?.[i] ?? 0,
      cape: hourly.cape?.[i] ?? 0,
      cin: hourly.convective_inhibition?.[i] ?? 0,
      liftedIndex: hourly.lifted_index?.[i] ?? 0,
      temp80m: hourly.temperature_80m?.[i] ?? null,
      temp120m: hourly.temperature_120m?.[i] ?? null,
    });
  }
  return result;
}

function parseDaily(raw: any): MeteoDaily[] {
  if (!raw?.daily?.time) return [];
  const { daily } = raw;
  const len = daily.time.length;
  const result: MeteoDaily[] = [];

  for (let i = 0; i < len; i++) {
    result.push({
      date: new Date(daily.time[i]),
      weatherCode: daily.weather_code?.[i] ?? 0,
      tempMax: daily.temperature_2m_max?.[i] ?? 0,
      tempMin: daily.temperature_2m_min?.[i] ?? 0,
      precipSum: daily.precipitation_sum?.[i] ?? 0,
      precipProbaMax: daily.precipitation_probability_max?.[i] ?? 0,
      windSpeedMax: daily.wind_speed_10m_max?.[i] ?? 0,
      windGustsMax: daily.wind_gusts_10m_max?.[i] ?? 0,
      windDirDominant: daily.wind_direction_10m_dominant?.[i] ?? 0,
      uvIndexMax: daily.uv_index_max?.[i] ?? 0,
    });
  }
  return result;
}

function parseCurrent(raw: any, hourly: MeteoHourly[]): MeteoCurrent {
  const first = hourly[0];
  return {
    temperature: first?.temperature ?? 0,
    humidity: first?.humidity ?? 50,
    windSpeed: first?.windSpeed ?? 0,
    windDir: first?.windDir ?? 0,
    windGusts: first?.windGusts ?? 0,
    weatherCode: first?.weatherCode ?? 0,
    cloudCover: first?.cloudCover ?? 0,
    precipitation: first?.precipitation ?? 0,
    pressure: first?.pressure ?? 1013,
    uvIndex: first?.uvIndex ?? 0,
  };
}

async function fetchOpenMeteo(lat: number, lon: number): Promise<{
  hourly: MeteoHourly[];
  daily: MeteoDaily[];
  current: MeteoCurrent;
} | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: HOURLY_PARAMS,
      daily: DAILY_PARAMS,
      timezone: "Europe/Rome",
      forecast_days: "3",
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!res.ok) return null;

    const raw = await res.json();
    if (!raw?.hourly?.time?.length) return null;

    const hourly = parseHourly(raw);
    const daily = parseDaily(raw);
    const current = parseCurrent(raw, hourly);

    return { hourly, daily, current };
  } catch {
    return null;
  }
}

function buildWindProfileFromHourly(hourly: MeteoHourly[]): WindProfileResult {
  const oreUtili = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const quoteBase = [500, 800, 1000, 1200, 1500, 1800, 2000, 2500, 3000];

  const ventoOrario = oreUtili.map(ora => {
    const h = hourly.find(h => h.time.getHours() === ora);
    const q: Record<number, { speed: number; dir: number }> = {};

    const surface = h ? { speed: h.windSpeed, dir: h.windDir } : { speed: 0, dir: 0 };

    for (const qAlt of quoteBase) {
      if (h) {
        const ratio = Math.max(1, qAlt / 10);
        const speed = Math.min(surface.speed * Math.pow(ratio, 0.143), surface.speed * 1.5);
        const rot = Math.round((qAlt / 250) * 2);
        const dir = ((surface.dir + rot) % 360 + 360) % 360;
        q[qAlt] = {
          speed: Math.max(0.5, Math.round(speed * 10) / 10),
          dir: Math.round(dir),
        };
      } else {
        q[qAlt] = { speed: 0, dir: 0 };
      }
    }

    const gust = h?.windGusts ?? 0;

    return { ora, gust, quote: q };
  });

  return { ventoOrario };
}

export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<FetchResult> {
    const result = await fetchOpenMeteo(lat, lon);
    if (!result) {
      return { hourly: [], daily: [], current: { temperature: 0, humidity: 0, windSpeed: 0, windDir: 0, windGusts: 0, weatherCode: 0, cloudCover: 0, precipitation: 0, pressure: 1013, uvIndex: 0 } };
    }
    return result;
  },

  async fetchWithFallback(lat: number, lon: number): Promise<{ data: FetchResult | null; ok: boolean }> {
    const result = await fetchOpenMeteo(lat, lon);
    if (result && result.hourly.length > 0) {
      return { data: result, ok: true };
    }
    return { data: null, ok: false };
  },

  async fetchCurrent(lat: number, lon: number): Promise<{ data: MeteoCurrent | null }> {
    const result = await fetchOpenMeteo(lat, lon);
    if (result) {
      return { data: result.current };
    }
    return { data: null };
  },

  async fetchManyCurrent(coords: { lat: number; lon: number }[]): Promise<Record<string, BatchCurrentResult>> {
    const results: Record<string, BatchCurrentResult> = {};
    for (const c of coords) {
      const key = `light:${c.lat.toFixed(4)}:${c.lon.toFixed(4)}`;
      try {
        const result = await fetchOpenMeteo(c.lat, c.lon);
        results[key] = result
          ? { ok: true, data: result.current }
          : { ok: false, data: null, error: "No data" };
      } catch (err) {
        results[key] = { ok: false, data: null, error: String(err) };
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    return results;
  },

  async fetchWindProfile(lat: number, lon: number, _date?: string): Promise<WindProfileResult> {
    const result = await fetchOpenMeteo(lat, lon);
    if (result) {
      return buildWindProfileFromHourly(result.hourly);
    }
    return { ventoOrario: [] };
  },
};