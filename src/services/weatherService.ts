"use client";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// --- TIPI ---

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

// --- PARAMETRI COMPLETI richiesti a Open-Meteo ---

const HOURLY_PARAMS = [
  // Base
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
  // Temperature in quota (per gradiente termico)
  "temperature_80m",
  "temperature_120m",
  // Vento in quota reale (per VentiTab)
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
  // CAPE, CIN, Lifted Index (per termiche reali)
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

// --- SERVIZIO ---

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

    // Log dei parametri ricevuti (debug)
    console.log("=== OPEN-METEO PARAMETRI RICEVUTI ===");
    console.log("Hourly keys:", Object.keys(raw.hourly));
    console.log("Daily keys:", Object.keys(raw.daily));
    console.log("Current keys:", Object.keys(raw.current || {}));
    console.log("Elevation:", raw.elevation);

    // Converte dati orari
    const hourly: MeteoHourly[] = raw.hourly.time.map((t: string, i: number) => {
      const get = (key: string) => raw.hourly[key]?.[i] ?? 0;
      return {
        time: new Date(t),
        temperature: get("temperature_2m"),
        humidity: get("relative_humidity_2m"),
        dewPoint: get("dew_point_2m"),
        apparentTemp: get("apparent_temperature"),
        precipitation: get("precipitation"),
        precipitationProbability: get("precipitation_probability"),
        weatherCode: get("weather_code"),
        pressure: get("pressure_msl"),
        surfacePressure: get("surface_pressure"),
        cloudCover: get("cloud_cover"),
        cloudCoverLow: get("cloud_cover_low"),
        cloudCoverMid: get("cloud_cover_mid"),
        cloudCoverHigh: get("cloud_cover_high"),
        windSpeed: get("wind_speed_10m"),
        windDir: get("wind_direction_10m"),
        windGusts: get("wind_gusts_10m"),
        uvIndex: get("uv_index"),
        temp80m: get("temperature_80m") || null,
        temp120m: get("temperature_120m") || null,
        shortwaveRadiation: get("shortwave_radiation"),
        directRadiation: get("direct_radiation"),
        sunshineDuration: get("sunshine_duration"),
        cape: get("cape"),
        cin: get("convective_inhibition"),
        liftedIndex: get("lifted_index"),
        windSpeed80m: get("wind_speed_80m"),
        windDir80m: get("wind_direction_80m"),
        windSpeed120m: get("wind_speed_120m"),
        windDir120m: get("wind_direction_120m"),
        windSpeed180m: get("wind_speed_180m"),
        windDir180m: get("wind_direction_180m"),
        windSpeed300m: get("wind_speed_300m"),
        windDir300m: get("wind_direction_300m"),
        windSpeed600m: get("wind_speed_600m"),
        windDir600m: get("wind_direction_600m"),
        windSpeed900m: get("wind_speed_900m"),
        windDir900m: get("wind_direction_900m"),
        windSpeed1200m: get("wind_speed_1200m"),
        windDir1200m: get("wind_direction_1200m"),
        windSpeed1500m: get("wind_speed_1500m"),
        windDir1500m: get("wind_direction_1500m"),
        windSpeed1800m: get("wind_speed_1800m"),
        windDir1800m: get("wind_direction_1800m"),
        windSpeed2100m: get("wind_speed_2100m"),
        windDir2100m: get("wind_direction_2100m"),
        windSpeed2400m: get("wind_speed_2400m"),
        windDir2400m: get("wind_direction_2400m"),
        windSpeed2800m: get("wind_speed_2800m"),
        windDir2800m: get("wind_direction_2800m"),
        windSpeed3200m: get("wind_speed_3200m"),
        windDir3200m: get("wind_direction_3200m"),
        windSpeed3600m: get("wind_speed_3600m"),
        windDir3600m: get("wind_direction_3600m"),
        windSpeed4000m: get("wind_speed_4000m"),
        windDir4000m: get("wind_direction_4000m"),
      };
    });

    // Converte dati giornalieri
    const daily: MeteoDaily[] = raw.daily.time.map((t: string, i: number) => {
      const get = (key: string) => raw.daily[key]?.[i] ?? 0;
      return {
        date: new Date(t),
        weatherCode: get("weather_code"),
        tempMax: get("temperature_2m_max"),
        tempMin: get("temperature_2m_min"),
        apperentTempMax: get("apparent_temperature_max"),
        apperentTempMin: get("apparent_temperature_min"),
        sunrise: String(get("sunrise") || ""),
        sunset: String(get("sunset") || ""),
        daylightDuration: get("daylight_duration"),
        sunshineDuration: get("sunshine_duration"),
        uvIndexMax: get("uv_index_max"),
        precipitationSum: get("precipitation_sum"),
        rainSum: get("rain_sum"),
        showersSum: get("showers_sum"),
        snowfallSum: get("snowfall_sum"),
        precipitationHours: get("precipitation_hours"),
        precipitationProbabilityMax: get("precipitation_probability_max"),
        windSpeedMax: get("wind_speed_10m_max"),
        windGustsMax: get("wind_gusts_10m_max"),
        windDirDominant: get("wind_direction_10m_dominant"),
        shortwaveRadiationSum: get("shortwave_radiation_sum"),
        et0Sum: get("et0_fao_evapotranspiration"),
      };
    });

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