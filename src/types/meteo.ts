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
  pressure: number;
  windSpeed: number;
  windDir: number;
  windGust: number;
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

export interface PressureGradient {
  grad: number;
  desc: string;
}

export interface AiAnalysis {
  general: string;
  advice: string;
  thermal: string;
  altitude: string;
  hourly: string;
  wind: string;
  pressure: string;
  thunderstorm: string;
}