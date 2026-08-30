import axios from "axios";

export interface OpenMeteoHourly {
  time: string[];
  temperature: number[];
  humidity: number[];
  dewPoint: number[];
  cloudCover: number[];
  precipitation: number[];
  windSpeed: number[];
  windDir: number[];
  windSpeed80m?: number[];
  windDirection80m?: number[];
  windSpeed120m?: number[];
  windDirection120m?: number[];
  windSpeed180m?: number[];
  windDirection180m?: number[];
  windSpeed240m?: number[];
  windDirection240m?: number[];
  windSpeed300m?: number[];
  windDirection300m?: number[];
  windSpeed400m?: number[];
  windDirection400m?: number[];
  windSpeed500m?: number[];
  windDirection500m?: number[];
  windSpeed600m?: number[];
  windDirection600m?: number[];
  windSpeed700m?: number[];
  windDirection700m?: number[];
  windSpeed800m?: number[];
  windDirection800m?: number[];
  windSpeed900m?: number[];
  windDirection900m?: number[];
  windSpeed1000m?: number[];
  windDirection1000m?: number[];
  windSpeed1200m?: number[];
  windDirection1200m?: number[];
  windSpeed1400m?: number[];
  windDirection1400m?: number[];
  windSpeed1600m?: number[];
  windDirection1600m?: number[];
  windSpeed1800m?: number[];
  windDirection1800m?: number[];
  windSpeed2000m?: number[];
  windDirection2000m?: number[];
  windSpeed2500m?: number[];
  windDirection2500m?: number[];
  windSpeed3000m?: number[];
  windDirection3000m?: number[];
  windSpeed3500m?: number[];
  windDirection3500m?: number[];
  windSpeed4000m?: number[];
  windDirection4000m?: number[];
  windGusts?: number[];
  pressure: number[];
  cape?: number[];
  liftedIndex?: number[];
  cin?: number[];
  freezingLevel?: number[];
  shortwaveRadiation?: number[];
  weatherCode?: number[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly: OpenMeteoHourly;
}

export interface WindProfileLevel {
  alt: number;
  speed: number;
  dir: number;
  hpa: string;
}

export interface WindProfileHour {
  levels: WindProfileLevel[];
}

export interface MeteoCurrent {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  apparentTemp: number;
  isDay: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number;
  surfacePressure: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  cape: number;
}

export interface MeteoHourly {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  apparentTemp: number;
  precipitation: number;
  rain: number;
  snowfall: number;
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
  pressure: number;
  surfacePressure: number;
  precipitationProbability: number;
  windSpeed925?: number;
  windDir925?: number;
  windSpeed850?: number;
  windDir850?: number;
  windSpeed700?: number;
  windDir700?: number;
  windSpeed500?: number;
  windDir500?: number;
  windSpeed600?: number;
  windDir600?: number;
  windSpeed300?: number;
  windDir300?: number;
  windSpeed250?: number;
  windDir250?: number;
  windSpeed200?: number;
  windDir200?: number;
  windSpeed1000?: number;
  windDir1000?: number;
  windSpeed1500?: number;
  windDir1500?: number;
  windSpeed2000?: number;
  windDir2000?: number;
  windSpeed2500?: number;
  windDir2500?: number;
  windSpeed3000?: number;
  windDir3000?: number;
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
  snowfallSum: number;
  precipitationHours: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  shortwaveRadiationSum: number;
}

export interface MeteoLight {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  windSpeed: number;
  windDir: number;
  windGusts: number;
  weatherCode: number;
  cloudCover: number;
  precipitation: number;
  cape: number;
}

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

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
  "cape",
  "convective_inhibition",
  "lifted_index",
  "wind_speed_925hPa",
  "wind_direction_925hPa",
  "wind_speed_850hPa",
  "wind_direction_850hPa",
  "wind_speed_700hPa",
  "wind_direction_700hPa",
  "wind_speed_500hPa",
  "wind_direction_500hPa",
  "wind_speed_600hPa",
  "wind_direction_600hPa",
  "wind_speed_300hPa",
  "wind_direction_300hPa",
  "wind_speed_250hPa",
  "wind_direction_250hPa",
  "wind_speed_200hPa",
  "wind_direction_200hPa",
  "wind_speed_1000hPa",
  "wind_direction_1000hPa",
  "wind_speed_1500hPa",
  "wind_direction_1500hPa",
  "wind_speed_2000hPa",
  "wind_direction_2000hPa",
  "wind_speed_2500hPa",
  "wind_direction_2500hPa",
  "wind_speed_3000hPa",
  "wind_direction_3000hPa",
].join(",");

const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "temperature_2m_mean",
  "apparent_temperature_max",
  "apparent_temperature_min",
  "sunrise",
  "sunset",
  "daylight_duration",
  "sunshine_duration",
  "precipitation_sum",
  "rain_sum",
  "snowfall_sum",
  "precipitation_hours",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "shortwave_radiation_sum",
  "uv_index_max",
].join(",");

const CURRENT_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "rain",
  "showers",
  "snowfall",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "cape",
].join(",");

export const weatherService = {
  async fetchLight(lat: number, lon: number): Promise<{ data: MeteoLight | null; ok: boolean }> {
    try {
      const params = new URLSearchParams({
        latitude: lat.toString(),
        longitude: lon.toString(),
        current: CURRENT_PARAMS,
        timezone: "Europe/Rome",
        forecast_days: "1",
      });

      const res = await fetch(`${OPEN_METEO_BASE}?${params.toString()}`);
      if (!res.ok) return { data: null, ok: false };
      const json = await res.json();
      const c = json.current;
      if (!c) return { data: null, ok: false };

      const temp = c.temperature_2m ?? 0;
      const hum = c.relative_humidity_2m ?? 50;
      const dew = c.dew_point_2m ?? (temp - (100 - hum) / 5);

      return {
        data: {
          time: new Date(c.time),
          temperature: temp,
          humidity: hum,
          dewPoint: dew,
          windSpeed: c.wind_speed_10m ?? 0,
          windDir: c.wind_direction_10m ?? 0,
          windGusts: c.wind_gusts_10m ?? c.wind_speed_10m ?? 0,
          weatherCode: c.weather_code ?? 0,
          cloudCover: c.cloud_cover ?? 0,
          precipitation: c.precipitation ?? 0,
          cape: c.cape ?? 0,
        },
        ok: true,
      };
    } catch {
      return { data: null, ok: false };
    }
  },

  async fetchCurrent(lat: number, lon: number): Promise<{ data: MeteoLight | null; ok: boolean }> {
    return this.fetchLight(lat, lon);
  },

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

    const res = await fetch(`${OPEN_METEO_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const json: any = await res.json();

    const hourly: MeteoHourly[] = [];
    const len = json.hourly.time.length;
    for (let i = 0; i < len; i++) {
      const t = json.hourly.temperature_2m[i] ?? 0;
      const h = json.hourly.relative_humidity_2m[i] ?? 50;
      const dew = json.hourly.dew_point_2m?.[i] ?? (t - (100 - h) / 5);

      hourly.push({
        time: new Date(json.hourly.time[i]),
        temperature: t,
        humidity: h,
        dewPoint: dew,
        pressure: json.hourly.pressure_msl[i] ?? 1013,
        surfacePressure: json.hourly.surface_pressure?.[i] ?? 1013,
        precipitation: json.hourly.precipitation[i] ?? 0,
        rain: json.hourly.rain?.[i] ?? 0,
        snowfall: json.hourly.snowfall?.[i] ?? 0,
        weatherCode: json.hourly.weather_code[i] ?? 0,
        cloudCover: json.hourly.cloud_cover[i] ?? 0,
        cloudCoverLow: json.hourly.cloud_cover_low?.[i] ?? 0,
        cloudCoverMid: json.hourly.cloud_cover_mid?.[i] ?? 0,
        cloudCoverHigh: json.hourly.cloud_cover_high?.[i] ?? 0,
        windSpeed: json.hourly.wind_speed_10m[i] ?? 0,
        windDir: json.hourly.wind_direction_10m[i] ?? 0,
        windGusts: json.hourly.wind_gusts_10m?.[i] ?? 0,
        uvIndex: json.hourly.uv_index?.[i] ?? 0,
        cape: json.hourly.cape?.[i] ?? 0,
        cin: json.hourly.convective_inhibition?.[i] ?? 0,
        liftedIndex: json.hourly.lifted_index?.[i] ?? 0,
        temp80m: json.hourly.temperature_80m?.[i],
        temp120m: json.hourly.temperature_120m?.[i],
        shortwaveRadiation: json.hourly.shortwave_radiation?.[i] ?? 0,
        feelsLike: json.hourly.apparent_temperature?.[i] ?? t,
        apparentTemp: json.hourly.apparent_temperature?.[i] ?? t,
        precipitationProbability: json.hourly.precipitation_probability?.[i] ?? 0,
        windSpeed925: json.hourly.wind_speed_925hPa?.[i],
        windDir925: json.hourly.wind_direction_925hPa?.[i],
        windSpeed850: json.hourly.wind_speed_850hPa?.[i],
        windDir850: json.hourly.wind_direction_850hPa?.[i],
        windSpeed700: json.hourly.wind_speed_700hPa?.[i],
        windDir700: json.hourly.wind_direction_700hPa?.[i],
        windSpeed500: json.hourly.wind_speed_500hPa?.[i],
        windDir500: json.hourly.wind_direction_500hPa?.[i],
        windSpeed600: json.hourly.wind_speed_600hPa?.[i],
        windDir600: json.hourly.wind_direction_600hPa?.[i],
        windSpeed300: json.hourly.wind_speed_300hPa?.[i],
        windDir300: json.hourly.wind_direction_300hPa?.[i],
        windSpeed250: json.hourly.wind_speed_250hPa?.[i],
        windDir250: json.hourly.wind_direction_250hPa?.[i],
        windSpeed200: json.hourly.wind_speed_200hPa?.[i],
        windDir200: json.hourly.wind_direction_200hPa?.[i],
        windSpeed1000: json.hourly.wind_speed_1000hPa?.[i],
        windDir1000: json.hourly.wind_direction_1000hPa?.[i],
        windSpeed1500: json.hourly.wind_speed_1500hPa?.[i],
        windDir1500: json.hourly.wind_direction_1500hPa?.[i],
        windSpeed2000: json.hourly.wind_speed_2000hPa?.[i],
        windDir2000: json.hourly.wind_direction_2000hPa?.[i],
        windSpeed2500: json.hourly.wind_speed_2500hPa?.[i],
        windDir2500: json.hourly.wind_direction_2500hPa?.[i],
        windSpeed3000: json.hourly.wind_speed_3000hPa?.[i],
        windDir3000: json.hourly.wind_direction_3000hPa?.[i],
      });
    }

    const c = json.current;
    const curTemp = c?.temperature_2m ?? 0;
    const curHum = c?.relative_humidity_2m ?? 50;

    const current: MeteoCurrent = {
      time: new Date(c?.time || Date.now()),
      temperature: curTemp,
      humidity: curHum,
      dewPoint: c?.dew_point_2m ?? (curTemp - (100 - curHum) / 5),
      apparentTemp: c?.apparent_temperature ?? curTemp,
      isDay: c?.is_day ?? 1,
      precipitation: c?.precipitation ?? 0,
      rain: c?.rain ?? 0,
      snowfall: c?.snowfall ?? 0,
      weatherCode: c?.weather_code ?? 0,
      cloudCover: c?.cloud_cover ?? 0,
      pressure: c?.pressure_msl ?? 1013,
      surfacePressure: c?.surface_pressure ?? 1013,
      windSpeed: c?.wind_speed_10m ?? 0,
      windDir: c?.wind_direction_10m ?? 0,
      windGusts: c?.wind_gusts_10m ?? c?.wind_speed_10m ?? 0,
      cape: c?.cape ?? 0,
    };

    const daily: MeteoDaily[] = [];
    const dailyLen = json.daily?.time?.length || 0;
    for (let i = 0; i < dailyLen; i++) {
      daily.push({
        date: new Date(json.daily.time[i]),
        tempMax: json.daily.temperature_2m_max[i] ?? 0,
        tempMin: json.daily.temperature_2m_min[i] ?? 0,
        apparentTempMax: json.daily.apparent_temperature_max[i] ?? 0,
        apparentTempMin: json.daily.apparent_temperature_min[i] ?? 0,
        sunrise: json.daily.sunrise[i] ?? "",
        sunset: json.daily.sunset[i] ?? "",
        daylightDuration: json.daily.daylight_duration[i] ?? 0,
        sunshineDuration: json.daily.sunshine_duration[i] ?? 0,
        uvIndexMax: json.daily.uv_index_max[i] ?? 0,
        uvIndexClearSkyMax: json.daily.uv_index_clear_sky_max[i] ?? 0,
        precipitationSum: json.daily.precipitation_sum[i] ?? 0,
        rainSum: json.daily.rain_sum[i] ?? 0,
        snowfallSum: json.daily.snowfall_sum[i] ?? 0,
        precipitationHours: json.daily.precipitation_hours[i] ?? 0,
        precipitationProbabilityMax: json.daily.precipitation_probability_max[i] ?? 0,
        windSpeedMax: json.daily.wind_speed_10m_max[i] ?? 0,
        windGustsMax: json.daily.wind_gusts_10m_max[i] ?? 0,
        windDirDominant: json.daily.wind_direction_10m_dominant[i] ?? 0,
        shortwaveRadiationSum: json.daily.shortwave_radiation_sum[i] ?? 0,
      });
    }

    return { hourly, current, daily, model: "Open-Meteo DWD/AROME/ICON" };
  },

  async fetchWithFallback(lat: number, lon: number) {
    try {
      const data = await this.fetchWeather(lat, lon);
      return { data, ok: true };
    } catch {
      return { data: null, ok: false };
    }
  }
};

export async function fetchWindProfile(
  latitude: number,
  longitude: number,
  altitude: number,
  selectedDay: number = 0
): Promise<Map<number, WindProfileHour>> {
  const result = new Map<number, WindProfileHour>();
  
  try {
    const response = await axios.get<OpenMeteoResponse>(
      `https://api.open-meteo.com/v1/forecast`,
      {
        params: {
          latitude,
          longitude,
          hourly: "wind_speed_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m,wind_speed_240m,wind_direction_240m,wind_speed_300m,wind_direction_300m,wind_speed_400m,wind_direction_400m,wind_speed_500m,wind_direction_500m,wind_speed_600m,wind_direction_600m,wind_speed_700m,wind_direction_700m,wind_speed_800m,wind_direction_800m,wind_speed_900m,wind_direction_900m,wind_speed_1000m,wind_direction_1000m,wind_speed_1200m,wind_direction_1200m,wind_speed_1400m,wind_direction_1400m,wind_speed_1600m,wind_direction_1600m,wind_speed_1800m,wind_direction_1800m,wind_speed_2000m,wind_direction_2000m,wind_speed_2500m,wind_direction_2500m,wind_speed_3000m,wind_direction_3000m,wind_speed_3500m,wind_direction_3500m,wind_speed_4000m,wind_direction_4000m",
          start_date: new Date(Date.now() + selectedDay * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          end_date: new Date(Date.now() + (selectedDay + 1) * 24 * 60 * 60 * 1000 - 1).toISOString().split("T")[0],
          timezone: "Europe/Rome",
        },
        timeout: 10000,
      }
    );

    const data = response.data;
    const times = data.hourly.time;
    
    for (let i = 0; i < times.length; i++) {
      const date = new Date(times[i]);
      const hour = date.getHours();
      
      const DISPLAY_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
      if (!DISPLAY_HOURS.includes(hour)) continue;
      
      const levels: WindProfileLevel[] = [];
      
      if (data.hourly.windSpeed && data.hourly.windSpeed[i] != null) {
        levels.push({ alt: 10, speed: data.hourly.windSpeed[i], dir: data.hourly.windDir?.[i] ?? 0, hpa: "10m" });
      }
      if (data.hourly.windSpeed80m && data.hourly.windSpeed80m[i] != null) {
        levels.push({ alt: 80, speed: data.hourly.windSpeed80m[i], dir: data.hourly.windDirection80m?.[i] ?? 0, hpa: "80m" });
      }
      if (data.hourly.windSpeed120m && data.hourly.windSpeed120m[i] != null) {
        levels.push({ alt: 120, speed: data.hourly.windSpeed120m[i], dir: data.hourly.windDirection120m?.[i] ?? 0, hpa: "120m" });
      }
      if (data.hourly.windSpeed180m && data.hourly.windSpeed180m[i] != null) {
        levels.push({ alt: 180, speed: data.hourly.windSpeed180m[i], dir: data.hourly.windDirection180m?.[i] ?? 0, hpa: "180m" });
      }
      if (data.hourly.windSpeed240m && data.hourly.windSpeed240m[i] != null) {
        levels.push({ alt: 240, speed: data.hourly.windSpeed240m[i], dir: data.hourly.windDirection240m?.[i] ?? 0, hpa: "240m" });
      }
      if (data.hourly.windSpeed300m && data.hourly.windSpeed300m[i] != null) {
        levels.push({ alt: 300, speed: data.hourly.windSpeed300m[i], dir: data.hourly.windDirection300m?.[i] ?? 0, hpa: "300m" });
      }
      if (data.hourly.windSpeed400m && data.hourly.windSpeed400m[i] != null) {
        levels.push({ alt: 400, speed: data.hourly.windSpeed400m[i], dir: data.hourly.windDirection400m?.[i] ?? 0, hpa: "400m" });
      }
      if (data.hourly.windSpeed500m && data.hourly.windSpeed500m[i] != null) {
        levels.push({ alt: 500, speed: data.hourly.windSpeed500m[i], dir: data.hourly.windDirection500m?.[i] ?? 0, hpa: "500m" });
      }
      if (data.hourly.windSpeed600m && data.hourly.windSpeed600m[i] != null) {
        levels.push({ alt: 600, speed: data.hourly.windSpeed600m[i], dir: data.hourly.windDirection600m?.[i] ?? 0, hpa: "600m" });
      }
      if (data.hourly.windSpeed700m && data.hourly.windSpeed700m[i] != null) {
        levels.push({ alt: 700, speed: data.hourly.windSpeed700m[i], dir: data.hourly.windDirection700m?.[i] ?? 0, hpa: "700m" });
      }
      if (data.hourly.windSpeed800m && data.hourly.windSpeed800m[i] != null) {
        levels.push({ alt: 800, speed: data.hourly.windSpeed800m[i], dir: data.hourly.windDirection800m?.[i] ?? 0, hpa: "800m" });
      }
      if (data.hourly.windSpeed900m && data.hourly.windSpeed900m[i] != null) {
        levels.push({ alt: 900, speed: data.hourly.windSpeed900m[i], dir: data.hourly.windDirection900m?.[i] ?? 0, hpa: "900m" });
      }
      if (data.hourly.windSpeed1000m && data.hourly.windSpeed1000m[i] != null) {
        levels.push({ alt: 1000, speed: data.hourly.windSpeed1000m[i], dir: data.hourly.windDirection1000m?.[i] ?? 0, hpa: "1000m" });
      }
      if (data.hourly.windSpeed1200m && data.hourly.windSpeed1200m[i] != null) {
        levels.push({ alt: 1200, speed: data.hourly.windSpeed1200m[i], dir: data.hourly.windDirection1200m?.[i] ?? 0, hpa: "1200m" });
      }
      if (data.hourly.windSpeed1400m && data.hourly.windSpeed1400m[i] != null) {
        levels.push({ alt: 1400, speed: data.hourly.windSpeed1400m[i], dir: data.hourly.windDirection1400m?.[i] ?? 0, hpa: "1400m" });
      }
      if (data.hourly.windSpeed1600m && data.hourly.windSpeed1600m[i] != null) {
        levels.push({ alt: 1600, speed: data.hourly.windSpeed1600m[i], dir: data.hourly.windDirection1600m?.[i] ?? 0, hpa: "1600m" });
      }
      if (data.hourly.windSpeed1800m && data.hourly.windSpeed1800m[i] != null) {
        levels.push({ alt: 1800, speed: data.hourly.windSpeed1800m[i], dir: data.hourly.windDirection1800m?.[i] ?? 0, hpa: "1800m" });
      }
      if (data.hourly.windSpeed2000m && data.hourly.windSpeed2000m[i] != null) {
        levels.push({ alt: 2000, speed: data.hourly.windSpeed2000m[i], dir: data.hourly.windDirection2000m?.[i] ?? 0, hpa: "2000m" });
      }
      if (data.hourly.windSpeed2500m && data.hourly.windSpeed2500m[i] != null) {
        levels.push({ alt: 2500, speed: data.hourly.windSpeed2500m[i], dir: data.hourly.windDirection2500m?.[i] ?? 0, hpa: "2500m" });
      }
      if (data.hourly.windSpeed3000m && data.hourly.windSpeed3000m[i] != null) {
        levels.push({ alt: 3000, speed: data.hourly.windSpeed3000m[i], dir: data.hourly.windDirection3000m?.[i] ?? 0, hpa: "3000m" });
      }
      if (data.hourly.windSpeed3500m && data.hourly.windSpeed3500m[i] != null) {
        levels.push({ alt: 3500, speed: data.hourly.windSpeed3500m[i], dir: data.hourly.windDirection3500m?.[i] ?? 0, hpa: "3500m" });
      }
      if (data.hourly.windSpeed4000m && data.hourly.windSpeed4000m[i] != null) {
        levels.push({ alt: 4000, speed: data.hourly.windSpeed4000m[i], dir: data.hourly.windDirection4000m?.[i] ?? 0, hpa: "4000m" });
      }
      
      if (levels.length > 0) {
        result.set(hour, { levels });
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error fetching wind profile:", error);
    return result;
  }
}

export async function fetchPrevisioniGiornaliere(
  latitude: number,
  longitude: number,
  altitude: number = 0
): Promise<any[]> {
  try {
    const response = await axios.get<OpenMeteoResponse>(
      `https://api.open-meteo.com/v1/forecast`,
      {
        params: {
          latitude,
          longitude,
          hourly: "temperature_2m,relative_humidity_2m,dew_point_2m,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_gusts_10m,pressure_msl,cape,lifted_index,convective_inhibition,freezing_level_height,shortwave_radiation",
          timezone: "Europe/Rome",
          forecast_days: "1",
        },
      }
    );

    const data = response.data;
    const hourly = data.hourly;
    const len = hourly.time.length;
    const result: any[] = [];

    for (let i = 0; i < len; i++) {
      result.push({
        time: new Date(hourly.time[i]),
        temperature: hourly.temperature_2m?.[i] ?? 0,
        humidity: hourly.relative_humidity_2m?.[i] ?? 0,
        dewPoint: hourly.dew_point_2m?.[i] ?? 0,
        cloudCover: hourly.cloud_cover?.[i] ?? 0,
        precipitation: hourly.precipitation?.[i] ?? 0,
        windSpeed10m: hourly.wind_speed_10m?.[i] ?? 0,
        windDirection10m: hourly.wind_direction_10m?.[i] ?? 0,
        windSpeed80m: hourly.wind_speed_80m?.[i] ?? 0,
        windDirection80m: hourly.wind_direction_80m?.[i] ?? 0,
        windGusts: hourly.wind_gusts_10m?.[i] ?? 0,
        pressure: hourly.pressure_msl?.[i] ?? 0,
        cape: hourly.cape?.[i] ?? 0,
        liftedIndex: hourly.lifted_index?.[i] ?? 0,
        cin: hourly.convective_inhibition?.[i] ?? 0,
        freezingLevel: hourly.freezing_level_height?.[i] ?? 0,
        shortwaveRadiation: hourly.shortwave_radiation?.[i] ?? 0,
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching previsioni giornaliere:", error);
    return [];
  }
}