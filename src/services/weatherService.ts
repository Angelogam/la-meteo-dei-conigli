"use client";

export interface MeteoHourly {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  apparentTemp: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  uvIndex: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  temp80m?: number;
  temp120m?: number;
  shortwaveRadiation: number;
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
  sunrise: string;
  sunset: string;
  daylightDuration: number;
  sunshineDuration: number;
  uvIndexMax: number;
  uvIndexClearSkyMax: number;
  precipitationSum: number;
  rainSum: number;
  showersSum: number;
  snowfallSum: number;
  precipitationHours: number;
  precipProbMax: number;
  weatherCode: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  shortwaveRadiationSum: number;
  et0Sum: number;
}

const HOURLY_PARAMS = [
  "temperature_2m", "relative_humidity_2m", "dew_point_2m", "apparent_temperature",
  "precipitation_probability", "precipitation", "weather_code",
  "pressure_msl", "surface_pressure", "cloud_cover", "cloud_cover_low",
  "cloud_cover_mid", "cloud_cover_high", "wind_speed_10m", "wind_direction_10m",
  "wind_gusts_10m", "uv_index", "shortwave_radiation",
  "temperature_80m", "temperature_120m",
  "wind_speed_80m", "wind_direction_80m", "wind_speed_120m", "wind_direction_120m",
  "wind_speed_180m", "wind_direction_180m", "wind_speed_300m", "wind_direction_300m",
  "wind_speed_600m", "wind_direction_600m", "wind_speed_1000m", "wind_direction_1000m",
  "wind_speed_1500m", "wind_direction_1500m", "wind_speed_2000m", "wind_direction_2000m",
  "wind_speed_2500m", "wind_direction_2500m", "wind_speed_3000m", "wind_direction_3000m",
  "cape", "convective_inhibition", "lifted_index",
].join(",");

const DAILY_PARAMS = [
  "weather_code", "temperature_2m_max", "temperature_2m_min",
  "apparent_temperature_max", "apparent_temperature_min",
  "sunrise", "sunset", "daylight_duration", "sunshine_duration",
  "uv_index_max", "uv_index_clear_sky_max",
  "precipitation_sum", "rain_sum", "showers_sum", "snowfall_sum",
  "precipitation_hours", "precipitation_probability_max",
  "wind_speed_10m_max", "wind_gusts_10m_max", "wind_direction_10m_dominant",
  "shortwave_radiation_sum", "et0_fao_evapotranspiration",
].join(",");

const CURRENT_PARAMS = [
  "temperature_2m", "relative_humidity_2m", "apparent_temperature",
  "is_day", "precipitation", "rain", "showers", "snowfall",
  "weather_code", "cloud_cover", "pressure_msl", "surface_pressure",
  "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m",
].join(",");

function buildWindProfile(rawHourly: Record<string, (number | string)[]>, idx: number): { height: number; speed: number; dir: number }[] {
  const profile: { height: number; speed: number; dir: number }[] = [];
  const levels = [
    { height: 80, speedKey: "wind_speed_80m", dirKey: "wind_direction_80m" },
    { height: 120, speedKey: "wind_speed_120m", dirKey: "wind_direction_120m" },
    { height: 180, speedKey: "wind_speed_180m", dirKey: "wind_direction_180m" },
    { height: 300, speedKey: "wind_speed_300m", dirKey: "wind_direction_300m" },
    { height: 600, speedKey: "wind_speed_600m", dirKey: "wind_direction_600m" },
    { height: 1000, speedKey: "wind_speed_1000m", dirKey: "wind_direction_1000m" },
    { height: 1500, speedKey: "wind_speed_1500m", dirKey: "wind_direction_1500m" },
    { height: 2000, speedKey: "wind_speed_2000m", dirKey: "wind_direction_2000m" },
    { height: 2500, speedKey: "wind_speed_2500m", dirKey: "wind_direction_2500m" },
    { height: 3000, speedKey: "wind_speed_3000m", dirKey: "wind_direction_3000m" },
  ];
  for (const level of levels) {
    const speedArr = rawHourly[level.speedKey];
    const dirArr = rawHourly[level.dirKey];
    if (speedArr && dirArr && typeof speedArr[idx] === "number" && typeof dirArr[idx] === "number") {
      const speed = speedArr[idx] as number;
      const dir = dirArr[idx] as number;
      if (speed >= 0) {
        profile.push({ height: level.height, speed: Math.round(speed * 10) / 10, dir });
      }
    }
  }
  return profile;
}

export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<{
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
      current: CURRENT_PARAMS,
      timezone: "Europe/Rome",
      forecast_days: "3",
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const raw = await res.json();
    const hourlyRaw = raw.hourly;
    const dailyRaw = raw.daily;
    const currentRaw = raw.current;

    const hourly: MeteoHourly[] = [];
    const len = hourlyRaw.time.length;
    for (let i = 0; i < len; i++) {
      hourly.push({
        time: new Date(hourlyRaw.time[i]),
        temperature: hourlyRaw.temperature_2m[i] as number,
        humidity: hourlyRaw.relative_humidity_2m[i] as number,
        dewPoint: (hourlyRaw.dew_point_2m?.[i] as number) ?? 10,
        apparentTemp: hourlyRaw.apparent_temperature[i] as number,
        precipitationProbability: (hourlyRaw.precipitation_probability?.[i] as number) ?? 0,
        precipitation: hourlyRaw.precipitation[i] as number,
        weatherCode: hourlyRaw.weather_code[i] as number,
        cloudCover: hourlyRaw.cloud_cover[i] as number,
        cloudCoverLow: (hourlyRaw.cloud_cover_low?.[i] as number) ?? 0,
        cloudCoverMid: (hourlyRaw.cloud_cover_mid?.[i] as number) ?? 0,
        cloudCoverHigh: (hourlyRaw.cloud_cover_high?.[i] as number) ?? 0,
        windSpeed: hourlyRaw.wind_speed_10m[i] as number,
        windDir: hourlyRaw.wind_direction_10m[i] as number,
        windGusts: (hourlyRaw.wind_gusts_10m?.[i] as number) ?? 0,
        uvIndex: (hourlyRaw.uv_index?.[i] as number) ?? 0,
        cape: (hourlyRaw.cape?.[i] as number) ?? 0,
        cin: (hourlyRaw.convective_inhibition?.[i] as number) ?? 0,
        liftedIndex: (hourlyRaw.lifted_index?.[i] as number) ?? 0,
        temp80m: (hourlyRaw.temperature_80m?.[i] as number) ?? undefined,
        temp120m: (hourlyRaw.temperature_120m?.[i] as number) ?? undefined,
        shortwaveRadiation: (hourlyRaw.shortwave_radiation?.[i] as number) ?? 0,
        windProfile: buildWindProfile(hourlyRaw, i),
      });
    }

    const current: MeteoCurrent = {
      time: new Date(currentRaw.time),
      temperature: currentRaw.temperature_2m as number,
      humidity: currentRaw.relative_humidity_2m as number,
      apparentTemp: currentRaw.apparent_temperature as number,
      isDay: currentRaw.is_day as number,
      precipitation: currentRaw.precipitation as number,
      rain: currentRaw.rain as number,
      showers: currentRaw.showers as number,
      snowfall: currentRaw.snowfall as number,
      weatherCode: currentRaw.weather_code as number,
      cloudCover: currentRaw.cloud_cover as number,
      pressure: currentRaw.pressure_msl as number,
      surfacePressure: currentRaw.surface_pressure as number,
      windSpeed: currentRaw.wind_speed_10m as number,
      windDir: currentRaw.wind_direction_10m as number,
      windGusts: currentRaw.wind_gusts_10m as number,
    };

    const daily: MeteoDaily[] = [];
    const dailyLen = dailyRaw.time.length;
    for (let i = 0; i < dailyLen; i++) {
      daily.push({
        date: new Date(dailyRaw.time[i]),
        tempMax: dailyRaw.temperature_2m_max[i] as number,
        tempMin: dailyRaw.temperature_2m_min[i] as number,
        apparentTempMax: dailyRaw.apparent_temperature_max[i] as number,
        apparentTempMin: dailyRaw.apparent_temperature_min[i] as number,
        sunrise: dailyRaw.sunrise[i] as string,
        sunset: dailyRaw.sunset[i] as string,
        daylightDuration: dailyRaw.daylight_duration[i] as number,
        sunshineDuration: dailyRaw.sunshine_duration[i] as number,
        uvIndexMax: dailyRaw.uv_index_max[i] as number,
        uvIndexClearSkyMax: dailyRaw.uv_index_clear_sky_max[i] as number,
        precipitationSum: dailyRaw.precipitation_sum[i] as number,
        rainSum: dailyRaw.rain_sum[i] as number,
        showersSum: dailyRaw.showers_sum[i] as number,
        snowfallSum: dailyRaw.snowfall_sum[i] as number,
        precipitationHours: dailyRaw.precipitation_hours[i] as number,
        precipProbMax: dailyRaw.precipitation_probability_max[i] as number,
        weatherCode: dailyRaw.weather_code[i] as number,
        windSpeedMax: dailyRaw.wind_speed_10m_max[i] as number,
        windGustsMax: dailyRaw.wind_gusts_10m_max[i] as number,
        windDirDominant: dailyRaw.wind_direction_10m_dominant[i] as number,
        shortwaveRadiationSum: dailyRaw.shortwave_radiation_sum[i] as number,
        et0Sum: dailyRaw.et0_fao_evapotranspiration[i] as number,
      });
    }

    return { hourly, current, daily, model: "auto" };
  },

  async fetchWithFallback(lat: number, lon: number): Promise<{
    data: { hourly: MeteoHourly[]; current: MeteoCurrent; daily: MeteoDaily[]; model: string } | null;
    ok: boolean;
  }> {
    try {
      const data = await this.fetchWeather(lat, lon);
      return { data, ok: true };
    } catch (err) {
      console.warn(`[weatherService] fetchWithFallback fallito per ${lat},${lon}:`, err);
      return { data: null, ok: false };
    }
  },
};