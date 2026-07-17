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
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  uvIndex: number;
  shortwaveRadiation: number;
  pressure: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  temp80m: number;
  temp120m: number;
  windProfile?: { height: number; speed: number; dir: number }[];
}

export interface MeteoCurrent {
  time: Date;
  temperature: number;
  humidity: number;
  apparentTemp: number;
  isDay: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  surfacePressure: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
}

export interface MeteoDaily {
  date: Date;
  tempMax: number;
  tempMin: number;
  apparentTempMax: number;
  apparentTempMin: number;
  weatherCode: number;
  precipitationSum: number;
  precipitationProbMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherServiceResult {
  hourly: MeteoHourly[];
  current: MeteoCurrent;
  daily: MeteoDaily[];
  model: string;
}

const BASE_URL = "https://api.open-meteo.com/v1/forecast";
const HOURLY_PARAMS = ["temperature_2m","relative_humidity_2m","dew_point_2m","apparent_temperature","precipitation","precipitation_probability","weather_code","pressure_msl","surface_pressure","cloud_cover","cloud_cover_low","cloud_cover_mid","cloud_cover_high","wind_speed_10m","wind_direction_10m","wind_gusts_10m","uv_index","shortwave_radiation","temperature_80m","temperature_120m","wind_speed_80m","wind_direction_80m","wind_speed_120m","wind_direction_120m","wind_speed_180m","wind_direction_180m","wind_speed_300m","wind_direction_300m","wind_speed_600m","wind_direction_600m","wind_speed_1000m","wind_direction_1000m","wind_speed_1500m","wind_direction_1500m","wind_speed_2000m","wind_direction_2000m","wind_speed_2500m","wind_direction_2500m","wind_speed_3000m","wind_direction_3000m","cape","convective_inhibition","lifted_index"].join(",");
const DAILY_PARAMS = ["weather_code","temperature_2m_max","temperature_2m_min","apparent_temperature_max","apparent_temperature_min","precipitation_sum","precipitation_probability_max","wind_speed_10m_max","wind_gusts_10m_max","wind_direction_10m_dominant","uv_index_max","shortwave_radiation_sum","sunrise","sunset"].join(",");
const CURRENT_PARAMS = ["temperature_2m","relative_humidity_2m","apparent_temperature","is_day","precipitation","rain","showers","snowfall","weather_code","cloud_cover","pressure_msl","surface_pressure","wind_speed_10m","wind_direction_10m","wind_gusts_10m"].join(",");

function safeVal(arr: any[] | undefined, i: number, fb: number = 0): number {
  if (!arr) return fb;
  const v = arr[i];
  return v != null ? Number(v) : fb;
}

function parseHourly(raw: any): MeteoHourly[] {
  if (!raw?.time?.length) return [];
  const r: MeteoHourly[] = [];
  for (let i = 0; i < raw.time.length; i++) {
    r.push({
      time: new Date(String(raw.time[i])),
      temperature: safeVal(raw.temperature_2m, i),
      humidity: safeVal(raw.relative_humidity_2m, i),
      dewPoint: safeVal(raw.dew_point_2m, i),
      apparentTemp: safeVal(raw.apparent_temperature, i),
      precipitation: safeVal(raw.precipitation, i),
      precipitationProbability: safeVal(raw.precipitation_probability, i),
      weatherCode: safeVal(raw.weather_code, i),
      cloudCover: safeVal(raw.cloud_cover, i),
      cloudCoverLow: safeVal(raw.cloud_cover_low, i),
      cloudCoverMid: safeVal(raw.cloud_cover_mid, i),
      cloudCoverHigh: safeVal(raw.cloud_cover_high, i),
      windSpeed: safeVal(raw.wind_speed_10m, i),
      windDir: safeVal(raw.wind_direction_10m, i),
      windGusts: safeVal(raw.wind_gusts_10m, i),
      uvIndex: safeVal(raw.uv_index, i),
      shortwaveRadiation: safeVal(raw.shortwave_radiation, i),
      pressure: safeVal(raw.pressure_msl, i),
      cape: safeVal(raw.cape, i),
      cin: safeVal(raw.convective_inhibition, i),
      liftedIndex: safeVal(raw.lifted_index, i, 99),
      temp80m: safeVal(raw.temperature_80m, i),
      temp120m: safeVal(raw.temperature_120m, i),
      windProfile: undefined,
    });
  }
  return r;
}

function parseCurrent(raw: any): MeteoCurrent {
  return {
    time: new Date(String(raw?.time ?? new Date().toISOString())),
    temperature: Number(raw?.temperature_2m ?? 20),
    humidity: Number(raw?.relative_humidity_2m ?? 50),
    apparentTemp: Number(raw?.apparent_temperature ?? 20),
    isDay: Number(raw?.is_day ?? 1),
    precipitation: Number(raw?.precipitation ?? 0),
    rain: Number(raw?.rain ?? 0),
    showers: Number(raw?.showers ?? 0),
    snowfall: Number(raw?.snowfall ?? 0),
    weatherCode: Number(raw?.weather_code ?? 0),
    cloudCover: Number(raw?.cloud_cover ?? 0),
    pressure: Number(raw?.pressure_msl ?? 1013),
    surfacePressure: Number(raw?.surface_pressure ?? 1013),
    windSpeed: Number(raw?.wind_speed_10m ?? 0),
    windDir: Number(raw?.wind_direction_10m ?? 0),
    windGusts: Number(raw?.wind_gusts_10m ?? 0),
  };
}

function parseDaily(raw: any): MeteoDaily[] {
  if (!raw?.time?.length) return [];
  const r: MeteoDaily[] = [];
  for (let i = 0; i < raw.time.length; i++) {
    r.push({
      date: new Date(String(raw.time[i])),
      tempMax: safeVal(raw.temperature_2m_max, i),
      tempMin: safeVal(raw.temperature_2m_min, i),
      apparentTempMax: safeVal(raw.apparent_temperature_max, i),
      apparentTempMin: safeVal(raw.apparent_temperature_min, i),
      weatherCode: safeVal(raw.weather_code, i),
      precipitationSum: safeVal(raw.precipitation_sum, i),
      precipitationProbMax: safeVal(raw.precipitation_probability_max, i),
      windSpeedMax: safeVal(raw.wind_speed_10m_max, i),
      windGustsMax: safeVal(raw.wind_gusts_10m_max, i),
      windDirDominant: safeVal(raw.wind_direction_10m_dominant, i),
      uvIndexMax: safeVal(raw.uv_index_max, i),
      sunrise: String(raw.sunrise?.[i] ?? ""),
      sunset: String(raw.sunset?.[i] ?? ""),
    });
  }
  return r;
}

async function fetchAPI(lat: number, lon: number): Promise<any> {
  const p = new URLSearchParams({
    latitude: String(lat), longitude: String(lon),
    hourly: HOURLY_PARAMS, daily: DAILY_PARAMS, current: CURRENT_PARAMS,
    timezone: "Europe/Rome", forecast_days: "3",
  });
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 15000);
  try {
    const res = await fetch(BASE_URL + "?" + p, { signal: c.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    clearTimeout(t);
    return null;
  }
}

const cache = new Map<string, { d: WeatherServiceResult; ts: number }>();
const CACHE_TTL = 180000;

class WeatherService {
  async fetchWeather(lat: number, lon: number): Promise<WeatherServiceResult> {
    const r = await this.fetchWithFallback(lat, lon);
    if (!r.ok || !r.data) throw new Error("Weather fetch failed");
    return r.data;
  }

  async fetchWithFallback(lat: number, lon: number): Promise<{ data: WeatherServiceResult | null; ok: boolean; cached: boolean }> {
    const key = lat.toFixed(4) + "," + lon.toFixed(4);
    const c = cache.get(key);
    if (c && Date.now() - c.ts < CACHE_TTL) return { data: c.d, ok: true, cached: true };

    for (let a = 0; a < 3; a++) {
      const raw = await fetchAPI(lat, lon);
      if (!raw?.hourly?.time?.length) {
        await new Promise(r => setTimeout(r, 2000 * (a + 1)));
        continue;
      }
      const hourly = parseHourly(raw.hourly);
      if (!hourly.length) continue;
      const current = raw.current ? parseCurrent(raw.current) : {
        time: new Date(), temperature: hourly[0].temperature, humidity: hourly[0].humidity,
        apparentTemp: hourly[0].apparentTemp, isDay: 1, precipitation: hourly[0].precipitation,
        rain: 0, showers: 0, snowfall: 0, weatherCode: hourly[0].weatherCode,
        cloudCover: hourly[0].cloudCover, pressure: 1013, surfacePressure: 1013,
        windSpeed: hourly[0].windSpeed, windDir: hourly[0].windDir, windGusts: hourly[0].windGusts,
      };
      const daily = parseDaily(raw.daily || {});
      const data: WeatherServiceResult = { hourly, current, daily, model: "open-meteo" };
      cache.set(key, { d: data, ts: Date.now() });
      return { data, ok: true, cached: false };
    }

    if (c) return { data: c.d, ok: true, cached: true };
    return { data: null, ok: false, cached: false };
  }

  async fetchCurrent(lat: number, lon: number): Promise<{ data: MeteoCurrent | null; ok: boolean; error?: string }> {
    try {
      const p = new URLSearchParams({
        latitude: String(lat), longitude: String(lon),
        current: CURRENT_PARAMS, timezone: "Europe/Rome", forecast_days: "1",
      });
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 10000);
      const res = await fetch(BASE_URL + "?" + p, { signal: c.signal });
      clearTimeout(t);
      if (!res.ok) return { data: null, ok: false, error: "HTTP " + res.status };
      const raw = await res.json();
      if (!raw.current) return { data: null, ok: false, error: "No current data" };
      return { data: parseCurrent(raw.current), ok: true };
    } catch (err) {
      return { data: null, ok: false, error: err instanceof Error ? err.message : "Unknown" };
    }
  }

  async fetchDaily(lat: number, lon: number): Promise<{ data: MeteoDaily[] | null; ok: boolean }> {
    try {
      const p = new URLSearchParams({
        latitude: String(lat), longitude: String(lon),
        daily: DAILY_PARAMS, timezone: "Europe/Rome", forecast_days: "3",
      });
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 10000);
      const res = await fetch(BASE_URL + "?" + p, { signal: c.signal });
      clearTimeout(t);
      if (!res.ok) return { data: null, ok: false };
      const raw = await res.json();
      if (!raw.daily?.time?.length) return { data: null, ok: false };
      return { data: parseDaily(raw.daily), ok: true };
    } catch {
      return { data: null, ok: false };
    }
  }
}

export const weatherService = new WeatherService();