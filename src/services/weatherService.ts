"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

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
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "shortwave_radiation",
  "direct_radiation",
  "sunshine_duration",
  "temperature_80m",
  "temperature_120m",
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
  "wind_speed_1800m",
  "wind_direction_1800m",
  "wind_speed_2100m",
  "wind_direction_2100m",
  "wind_speed_2400m",
  "wind_direction_2400m",
  "wind_speed_2800m",
  "wind_direction_2800m",
  "wind_speed_3200m",
  "wind_direction_3200m",
  "wind_speed_3600m",
  "wind_direction_3600m",
  "wind_speed_4000m",
  "wind_direction_4000m",
  "cape",
  "convective_inhibition",
  "lifted_index",
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
  "surface_pressure",
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
  "precipitation_hours",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "shortwave_radiation_sum",
  "et0_fao_evapotranspiration",
].join(",");

function safeGet(arr: any[], index: number): any {
  return (arr && arr.length > index) ? (arr[index] ?? 0) : 0;
}

function safeGetStr(arr: any[], index: number): string {
  return (arr && arr.length > index) ? String(arr[index] ?? "") : "";
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
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
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
  windSpeed80m: number;
  windDir80m: number;
  windSpeed120m: number;
  windDir120m: number;
  windSpeed180m: number;
  windDir180m: number;
  windSpeed300m: number;
  windDir300m: number;
  windSpeed600m: number;
  windDir600m: number;
  windSpeed900m: number;
  windDir900m: number;
  windSpeed1200m: number;
  windDir1200m: number;
  windSpeed1500m: number;
  windDir1500m: number;
  windSpeed1800m: number;
  windDir1800m: number;
  windSpeed2100m: number;
  windDir2100m: number;
  windSpeed2400m: number;
  windDir2400m: number;
  windSpeed2800m: number;
  windDir2800m: number;
  windSpeed3200m: number;
  windDir3200m: number;
  windSpeed3600m: number;
  windDir3600m: number;
  windSpeed4000m: number;
  windDir4000m: number;
}

export interface MeteoDaily {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  apperentTempMax: number;
  apperentTempMin: number;
  sunrise: string;
  sunset: string;
  daylightDuration: number;
  sunshineDuration: number;
  uvIndexMax: number;
  precipitationSum: number;
  rainSum: number;
  showersSum: number;
  snowfallSum: number;
  precipitationHours: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  shortwaveRadiationSum: number;
  et0Sum: number;
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
  surfacePressure: number;
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
  timezone: string;
}

export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<MeteoResponse> {
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

    if (!res.ok) {
      throw new Error(`Errore Open-Meteo: ${res.status} ${res.statusText}`);
    }

    const raw = await res.json();

    // Converte dati orari — con safeGet per ogni campo
    const hourly: MeteoHourly[] = (raw.hourly?.time || []).map((t: string, i: number) => ({
      time: new Date(t),
      temperature: safeGet(raw.hourly.temperature_2m, i),
      humidity: safeGet(raw.hourly.relative_humidity_2m, i),
      dewPoint: safeGet(raw.hourly.dew_point_2m, i),
      apparentTemp: safeGet(raw.hourly.apparent_temperature, i),
      precipitation: safeGet(raw.hourly.precipitation, i),
      precipitationProbability: safeGet(raw.hourly.precipitation_probability, i),
      weatherCode: safeGet(raw.hourly.weather_code, i),
      pressure: safeGet(raw.hourly.pressure_msl, i),
      surfacePressure: safeGet(raw.hourly.surface_pressure, i),
      cloudCover: safeGet(raw.hourly.cloud_cover, i),
      cloudCoverLow: safeGet(raw.hourly.cloud_cover_low, i),
      cloudCoverMid: safeGet(raw.hourly.cloud_cover_mid, i),
      cloudCoverHigh: safeGet(raw.hourly.cloud_cover_high, i),
      windSpeed: safeGet(raw.hourly.wind_speed_10m, i),
      windDir: safeGet(raw.hourly.wind_direction_10m, i),
      windGusts: safeGet(raw.hourly.wind_gusts_10m, i),
      uvIndex: safeGet(raw.hourly.uv_index, i),
      temp80m: raw.hourly.temperature_80m?.[i] ?? null,
      temp120m: raw.hourly.temperature_120m?.[i] ?? null,
      shortwaveRadiation: safeGet(raw.hourly.shortwave_radiation, i),
      directRadiation: safeGet(raw.hourly.direct_radiation, i),
      sunshineDuration: safeGet(raw.hourly.sunshine_duration, i),
      cape: safeGet(raw.hourly.cape, i),
      cin: safeGet(raw.hourly.convective_inhibition, i),
      liftedIndex: safeGet(raw.hourly.lifted_index, i),
      windSpeed80m: safeGet(raw.hourly.wind_speed_80m, i),
      windDir80m: safeGet(raw.hourly.wind_direction_80m, i),
      windSpeed120m: safeGet(raw.hourly.wind_speed_120m, i),
      windDir120m: safeGet(raw.hourly.wind_direction_120m, i),
      windSpeed180m: safeGet(raw.hourly.wind_speed_180m, i),
      windDir180m: safeGet(raw.hourly.wind_direction_180m, i),
      windSpeed300m: safeGet(raw.hourly.wind_speed_300m, i),
      windDir300m: safeGet(raw.hourly.wind_direction_300m, i),
      windSpeed600m: safeGet(raw.hourly.wind_speed_600m, i),
      windDir600m: safeGet(raw.hourly.wind_direction_600m, i),
      windSpeed900m: safeGet(raw.hourly.wind_speed_900m, i),
      windDir900m: safeGet(raw.hourly.wind_direction_900m, i),
      windSpeed1200m: safeGet(raw.hourly.wind_speed_1200m, i),
      windDir1200m: safeGet(raw.hourly.wind_direction_1200m, i),
      windSpeed1500m: safeGet(raw.hourly.wind_speed_1500m, i),
      windDir1500m: safeGet(raw.hourly.wind_direction_1500m, i),
      windSpeed1800m: safeGet(raw.hourly.wind_speed_1800m, i),
      windDir1800m: safeGet(raw.hourly.wind_direction_1800m, i),
      windSpeed2100m: safeGet(raw.hourly.wind_speed_2100m, i),
      windDir2100m: safeGet(raw.hourly.wind_direction_2100m, i),
      windSpeed2400m: safeGet(raw.hourly.wind_speed_2400m, i),
      windDir2400m: safeGet(raw.hourly.wind_direction_2400m, i),
      windSpeed2800m: safeGet(raw.hourly.wind_speed_2800m, i),
      windDir2800m: safeGet(raw.hourly.wind_direction_2800m, i),
      windSpeed3200m: safeGet(raw.hourly.wind_speed_3200m, i),
      windDir3200m: safeGet(raw.hourly.wind_direction_3200m, i),
      windSpeed3600m: safeGet(raw.hourly.wind_speed_3600m, i),
      windDir3600m: safeGet(raw.hourly.wind_direction_3600m, i),
      windSpeed4000m: safeGet(raw.hourly.wind_speed_4000m, i),
      windDir4000m: safeGet(raw.hourly.wind_direction_4000m, i),
    }));

    // Converte dati giornalieri
    const daily: MeteoDaily[] = (raw.daily?.time || []).map((t: string, i: number) => ({
      date: new Date(t),
      weatherCode: safeGet(raw.daily.weather_code, i),
      tempMax: safeGet(raw.daily.temperature_2m_max, i),
      tempMin: safeGet(raw.daily.temperature_2m_min, i),
      apperentTempMax: safeGet(raw.daily.apparent_temperature_max, i),
      apperentTempMin: safeGet(raw.daily.apparent_temperature_min, i),
      sunrise: safeGetStr(raw.daily.sunrise, i),
      sunset: safeGetStr(raw.daily.sunset, i),
      daylightDuration: safeGet(raw.daily.daylight_duration, i),
      sunshineDuration: safeGet(raw.daily.sunshine_duration, i),
      uvIndexMax: safeGet(raw.daily.uv_index_max, i),
      precipitationSum: safeGet(raw.daily.precipitation_sum, i),
      rainSum: safeGet(raw.daily.rain_sum, i),
      showersSum: safeGet(raw.daily.showers_sum, i),
      snowfallSum: safeGet(raw.daily.snowfall_sum, i),
      precipitationHours: safeGet(raw.daily.precipitation_hours, i),
      precipitationProbabilityMax: safeGet(raw.daily.precipitation_probability_max, i),
      windSpeedMax: safeGet(raw.daily.wind_speed_10m_max, i),
      windGustsMax: safeGet(raw.daily.wind_gusts_10m_max, i),
      windDirDominant: safeGet(raw.daily.wind_direction_10m_dominant, i),
      shortwaveRadiationSum: safeGet(raw.daily.shortwave_radiation_sum, i),
      et0Sum: safeGet(raw.daily.et0_fao_evapotranspiration, i),
    }));

    // Converte dati correnti
    const current: MeteoCurrent = {
      time: raw.current?.time ? new Date(raw.current.time) : new Date(),
      temperature: raw.current?.temperature_2m ?? 0,
      humidity: raw.current?.relative_humidity_2m ?? 0,
      apparentTemp: raw.current?.apparent_temperature ?? 0,
      isDay: raw.current?.is_day ?? 1,
      precipitation: raw.current?.precipitation ?? 0,
      weatherCode: raw.current?.weather_code ?? 0,
      cloudCover: raw.current?.cloud_cover ?? 0,
      pressure: raw.current?.pressure_msl ?? 1013,
      surfacePressure: raw.current?.surface_pressure ?? 1013,
      windSpeed: raw.current?.wind_speed_10m ?? 0,
      windDir: raw.current?.wind_direction_10m ?? 0,
      windGusts: raw.current?.wind_gusts_10m ?? 0,
    };

    return { hourly, daily, current, lat, lon, elevation: raw.elevation, timezone: raw.timezone };
  },

  async fetchWithFallback(lat: number, lon: number) {
    try {
      return await this.fetchWeather(lat, lon);
    } catch (err) {
      console.error(`Errore fetch per ${lat},${lon}:`, err);
      // Restituisci dati vuoti per non far crashare l'app
      return {
        hourly: [] as MeteoHourly[],
        daily: [] as MeteoDaily[],
        current: null as unknown as MeteoCurrent,
        lat, lon, elevation: 0, timezone: "Europe/Rome",
      };
    }
  },
};