"use client";

export interface HourData {
  time: Date;
  temperature: number;
  feelsLike: number;
  humidity: number;
  dewPoint: number;
  precipitation: number;
  weatherCode: number;
  cloudCover: number;
  pressure: number | null;
  windSpeed: number;
  windDir: number;
  windGust: number | null;
  soilTemp: number | null;
  soilMoisture: number | null;
  uvIndex: number | null;
  isDay: boolean;
  /** Dati di vento in quota a diverse altitudini (m AGL) */
  windProfile?: WindLevel[];
}

export interface DailyData {
  date: Date;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationSum: number;
}

export interface EnrichedDaily extends DailyData {
  avgWind: number;
  maxWind: number;
  avgCloud: number;
}

export interface MeteoData {
  hourly: HourData[];
  daily: DailyData[];
  lat: number;
  lon: number;
}

export interface ThermalData {
  cloudBase: number;
  thermalTop: number;
  soarIdx: number;
}

export interface WindLevel {
  /** Quota in metri AGL (Above Ground Level) */
  height: number;
  /** Velocità del vento in km/h */
  speed: number | null;
  /** Direzione del vento in gradi */
  dir: number | null;
}

export interface WindProfile {
  time: Date;
  levels: WindLevel[];
}

export interface AiAnalysis {
  general: string;
  thermal: string;
  wind: string;
  hourly: string;
  advice: string;
  thunderstorm: string;
  altitude?: string;
  pressure?: string;
  summary?: string;
  score?: number;
  reasoning?: string;
  recommendations?: string[];
}