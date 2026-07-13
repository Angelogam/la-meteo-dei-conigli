"use client";

// --- TIPI NUOVI (usati dai servizi moderni) ---

export interface HourData {
  time: Date;
  temperature: number;
  humidity: number;
  dewPoint: number;
  apparentTemp: number;
  precipitationProba: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weatherCode: number;
  pressure: number;
  surfacePressure: number;
  cloudCover: number;
  cloudCoverLow: number;
  cloudCoverMid: number;
  cloudCoverHigh: number;
  evapotranspiration: number;
  et0: number;
  vapourPressureDeficit: number;
  windSpeed: number;
  windDir: number;
  windGusts: number; // Nome corretto (plurale)
  soilTemp: number;
  soilMoisture: number;
  uvIndex: number;
  temp80m: number;
  temp120m: number;
  shortwaveRadiation: number;
  directRadiation: number;
  diffuseRadiation: number;
  directNormalIrradiance: number;
  terrestrialRadiation: number;
  sunshineDuration: number;
  windProfile?: { height: number; speed: number; dir: number }[];
}

export interface CurrentData {
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

export interface DailyData {
  time: Date;
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
  precipitationProbaMax: number;
  weatherCode: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  shortwaveRadiationSum: number;
  et0Sum: number;
}

// --- TIPI VECCHI (per retrocompatibilità con meteo.ts, volo.ts ecc.) ---

export interface MeteoData {
  hourly: HourData[];
  daily: {
    date: Date;
    tempMax: number;
    tempMin: number;
    weatherCode: number;
    precipitationSum: number;
  }[];
  lat: number;
  lon: number;
}

export interface MeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: Record<string, string>;
  current: Record<string, number | string>;
  hourly_units: Record<string, string>;
  hourly: Record<string, (number | string)[]>;
  daily_units: Record<string, string>;
  daily: Record<string, (number | string)[]>;
}

export interface ThermalData {
  cloudBase: number;
  thermalTop: number;
  soarIdx: number;
}

export interface WindProfile {
  time: Date;
  levels: { height: number; speed: number; dir: number }[];
}

export interface WindLevel {
  height: number;
  speed: number;
  dir: number;
  dirName?: string;
}

export interface AiAnalysis {
  thermal: string;
  altitude: string;
  hourly: string;
  thunderstorm: string;
}

export interface EnrichedDaily {
  date: Date;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationSum: number;
  avgWind?: number;
  maxWind?: number;
  avgCloud?: number;
}