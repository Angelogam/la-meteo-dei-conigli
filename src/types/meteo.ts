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
  height: number;
  speed: number | null;
  dir: number | null;
}

export interface WindProfile {
  time: Date;
  levels: WindLevel[];
}

export interface AiAnalysis {
  summary: string;
  score: number;
  reasoning: string;
  recommendations: string[];
}