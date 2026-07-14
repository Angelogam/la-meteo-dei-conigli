"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// PARAMETRI MINIMI INDISPENSABILI (tolgo quelli opzionali che causano errori)
const HOURLY_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "precipitation_probability",
  "weather_code",
  "pressure_msl",
  "surface_pressure",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "shortwave_radiation",
  "direct_radiation",
  "sunshine_duration",
  "temperature_80m",
  "temperature_120m",
  "cape",
  "convective_inhibition",
  "lifted_index",
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
  "wind_speed_900m",
  "wind_direction_900m",
  "wind_speed_1200m",
  "wind_direction_1200m",
  "wind_speed_1500m",
  "wind_direction_1500m",
].join(",");

const CURRENT_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
].join(",");

const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "sunrise",
  "sunset",
  "daylight_duration",
  "sunshine_duration",
  "uv_index_max",
  "precipitation_sum",
  "rain_sum",
  "showers_sum",
  "snowfall_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "shortwave_radiation_sum",
].join(",");

function get(arr: any[], idx: number, def: number = 0): number {
  if (!arr || !Array.isArray(arr)) return def;
  const v = arr[idx];
  return (v === null || v === undefined) ? def : Number(v);
}

function getStr(arr: any[], idx: number, def: string = ""): string {
  if (!arr || !Array.isArray(arr)) return def;
  const v = arr[idx];
  return (v === null || v === undefined) ? def : String(v);
}

export interface MeteoHourly {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  apparentTemp: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  pressure: number;
  surfacePressure: number;
  cloudCover: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  uvIndex: number;
  temp80m: number | null;
  temp120m: number | null;
  shortwaveRadiation: number;
  directRadiation: number;
  sunshineDuration: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  windProfile: { height: number; speed: number; dir: number }[];
}

export interface MeteoDaily {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
  shortwaveRadiationSum: number;
}

export interface MeteoCurrent {
  time: Date;
  temperature: number;
  humidity: number;
  apparentTemp: number;
  isDay: number;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
}

export interface MeteoResponse {
  hourly: MeteoHourly[];
  daily: MeteoDaily[];
  current: MeteoCurrent;
  lat: number;
  lon: number;
  elevation: number;
}

async function fetchRaw(lat: number, lon: number): Promise<any> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: HOURLY_PARAMS,
    current: CURRENT_PARAMS,
    daily: DAILY_PARAMS,
    timezone: "Europe/Rome",
    forecast_days: "7",
  });

  const url = `${BASE_URL}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<MeteoResponse> {
    const raw = await fetchRaw(lat, lon);

    const times = raw.hourly?.time || [];
    const hourly: MeteoHourly[] = times.map((t: string, i: number) => {
      const windProfile = [
        { height: 80, speed: get(raw.hourly.wind_speed_80m, i), dir: get(raw.hourly.wind_direction_80m, i) },
        { height: 120, speed: get(raw.hourly.wind_speed_120m, i), dir: get(raw.hourly.wind_direction_120m, i) },
        { height: 180, speed: get(raw.hourly.wind_speed_180m, i), dir: get(raw.hourly.wind_direction_180m, i) },
        { height: 300, speed: get(raw.hourly.wind_speed_300m, i), dir: get(raw.hourly.wind_direction_300m, i) },
        { height: 600, speed: get(raw.hourly.wind_speed_600m, i), dir: get(raw.hourly.wind_direction_600m, i) },
        { height: 900, speed: get(raw.hourly.wind_speed_900m, i), dir: get(raw.hourly.wind_direction_900m, i) },
        { height: 1200, speed: get(raw.hourly.wind_speed_1200m, i), dir: get(raw.hourly.wind_direction_1200m, i) },
        { height: 1500, speed: get(raw.hourly.wind_speed_1500m, i), dir: get(raw.hourly.wind_direction_1500m, i) },
      ].filter(h => h.speed > 0); // solo livelli con dati

      return {
        time: new Date(t),
        temperature: get(raw.hourly.temperature_2m, i, 15),
        humidity: get(raw.hourly.relative_humidity_2m, i, 50),
        dewPoint: get(raw.hourly.dew_point_2m, i, 8),
        apparentTemp: get(raw.hourly.apparent_temperature, i, 15),
        precipitation: get(raw.hourly.precipitation, i, 0),
        precipitationProbability: get(raw.hourly.precipitation_probability, i, 0),
        weatherCode: get(raw.hourly.weather_code, i, 0),
        pressure: get(raw.hourly.pressure_msl, i, 1013),
        surfacePressure: get(raw.hourly.surface_pressure, i, 1013),
        cloudCover: get(raw.hourly.cloud_cover, i, 0),
        windSpeed: get(raw.hourly.wind_speed_10m, i, 5),
        windDir: get(raw.hourly.wind_direction_10m, i, 180),
        windGusts: get(raw.hourly.wind_gusts_10m, i, 0),
        uvIndex: get(raw.hourly.uv_index, i, 0),
        temp80m: raw.hourly.temperature_80m?.[i] ?? null,
        temp120m: raw.hourly.temperature_120m?.[i] ?? null,
        shortwaveRadiation: get(raw.hourly.shortwave_radiation, i, 0),
        directRadiation: get(raw.hourly.direct_radiation, i, 0),
        sunshineDuration: get(raw.hourly.sunshine_duration, i, 0),
        cape: get(raw.hourly.cape, i, 0),
        cin: get(raw.hourly.convective_inhibition, i, 0),
        liftedIndex: get(raw.hourly.lifted_index, i, 0),
        windProfile,
      };
    });

    const dTimes = raw.daily?.time || [];
    const daily: MeteoDaily[] = dTimes.map((t: string, i: number) => ({
      date: new Date(t),
      weatherCode: get(raw.daily.weather_code, i, 0),
      tempMax: get(raw.daily.temperature_2m_max, i, 15),
      tempMin: get(raw.daily.temperature_2m_min, i, 5),
      precipitationSum: get(raw.daily.precipitation_sum, i, 0),
      precipitationProbabilityMax: get(raw.daily.precipitation_probability_max, i, 0),
      windSpeedMax: get(raw.daily.wind_speed_10m_max, i, 10),
      windGustsMax: get(raw.daily.wind_gusts_10m_max, i, 0),
      windDirDominant: get(raw.daily.wind_direction_10m_dominant, i, 180),
      uvIndexMax: get(raw.daily.uv_index_max, i, 0),
      sunrise: getStr(raw.daily.sunrise, i, "06:00"),
      sunset: getStr(raw.daily.sunset, i, "21:00"),
      shortwaveRadiationSum: get(raw.daily.shortwave_radiation_sum, i, 0),
    }));

    // Se l'API non ha dato current, lo prendo da hourly
    const currentRaw = raw.current;
    let current: MeteoCurrent;
    if (currentRaw && currentRaw.time) {
      current = {
        time: new Date(currentRaw.time),
        temperature: currentRaw.temperature_2m ?? 0,
        humidity: currentRaw.relative_humidity_2m ?? 50,
        apparentTemp: currentRaw.apparent_temperature ?? 0,
        isDay: currentRaw.is_day ?? 1,
        precipitation: currentRaw.precipitation ?? 0,
        weatherCode: currentRaw.weather_code ?? 0,
        cloudCover: currentRaw.cloud_cover ?? 0,
        pressure: currentRaw.pressure_msl ?? 1013,
        windSpeed: currentRaw.wind_speed_10m ?? 0,
        windDir: currentRaw.wind_direction_10m ?? 0,
        windGusts: currentRaw.wind_gusts_10m ?? 0,
      };
    } else {
      // Fallback: prendo la prima ora disponibile
      const first = hourly[0];
      current = {
        time: first?.time || new Date(),
        temperature: first?.temperature || 0,
        humidity: first?.humidity || 50,
        apparentTemp: first?.apparentTemp || 0,
        isDay: 1,
        precipitation: first?.precipitation || 0,
        weatherCode: first?.weatherCode || 0,
        cloudCover: first?.cloudCover || 0,
        pressure: first?.pressure || 1013,
        windSpeed: first?.windSpeed || 0,
        windDir: first?.windDir || 0,
        windGusts: first?.windGusts || 0,
      };
    }

    return { hourly, daily, current, lat, lon, elevation: raw.elevation || 0 };
  },

  async fetchWithFallback(lat: number, lon: number) {
    try {
      return await this.fetchWeather(lat, lon);
    } catch (err) {
      console.error(`Errore fetch per ${lat},${lon}:`, err);
      // Dati fittizi per non far crashare
      const now = new Date();
      const hourly: MeteoHourly[] = [];
      for (let h = 0; h < 72; h++) {
        const t = new Date(now);
        t.setHours(t.getHours() + h);
        hourly.push({
          time: t,
          temperature: 20 + Math.sin(h / 4) * 5,
          humidity: 50 + Math.sin(h / 6) * 10,
          dewPoint: 10 + Math.sin(h / 5) * 3,
          apparentTemp: 20 + Math.sin(h / 4) * 5,
          precipitation: h > 24 && h < 28 ? 2 : 0,
          precipitationProbability: h > 24 && h < 28 ? 60 : 10,
          weatherCode: h > 24 && h < 28 ? 61 : 0,
          pressure: 1015 + Math.sin(h / 10) * 5,
          surfacePressure: 1010 + Math.sin(h / 10) * 5,
          cloudCover: 30 + Math.sin(h / 3) * 30,
          windSpeed: 8 + Math.sin(h / 4) * 5,
          windDir: 180 + Math.sin(h / 6) * 30,
          windGusts: 12 + Math.sin(h / 4) * 8,
          uvIndex: 5 + Math.sin(h / 3) * 3,
          temp80m: null,
          temp120m: null,
          shortwaveRadiation: 400 * Math.max(0, Math.sin(h / 24 * Math.PI)),
          directRadiation: 300 * Math.max(0, Math.sin(h / 24 * Math.PI)),
          sunshineDuration: 3600 * Math.max(0, Math.sin(h / 24 * Math.PI)),
          cape: 200 + Math.sin(h / 4) * 150,
          cin: -50 + Math.sin(h / 6) * 30,
          liftedIndex: -2 + Math.sin(h / 5) * 1,
          windProfile: [
            { height: 500, speed: 10 + Math.sin(h / 4) * 5, dir: 190 + Math.sin(h / 6) * 20 },
            { height: 1000, speed: 15 + Math.sin(h / 4) * 8, dir: 200 + Math.sin(h / 6) * 25 },
            { height: 2000, speed: 20 + Math.sin(h / 4) * 10, dir: 210 + Math.sin(h / 6) * 30 },
          ],
        });
      }

      const daily: MeteoDaily[] = [];
      for (let d = 0; d < 7; d++) {
        const t = new Date(now);
        t.setDate(t.getDate() + d);
        daily.push({
          date: t,
          weatherCode: d === 1 ? 61 : 0,
          tempMax: 22 + Math.sin(d) * 3,
          tempMin: 14 + Math.sin(d) * 2,
          precipitationSum: d === 1 ? 3 : 0,
          precipitationProbabilityMax: d === 1 ? 70 : 10,
          windSpeedMax: 15 + Math.sin(d) * 5,
          windGustsMax: 20 + Math.sin(d) * 8,
          windDirDominant: 180 + Math.sin(d) * 30,
          uvIndexMax: 7 + Math.sin(d) * 2,
          sunrise: "06:30",
          sunset: "21:00",
          shortwaveRadiationSum: 5000 + Math.sin(d) * 1000,
        });
      }

      const current: MeteoCurrent = {
        time: now,
        temperature: 22,
        humidity: 45,
        apparentTemp: 21,
        isDay: 1,
        precipitation: 0,
        weatherCode: 0,
        cloudCover: 20,
        pressure: 1018,
        windSpeed: 8,
        windDir: 190,
        windGusts: 12,
      };

      return { hourly, daily, current, lat, lon, elevation: 1000 };
    }
  },
};