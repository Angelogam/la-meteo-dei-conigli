"use client";

export interface HourData {
  time: Date;
  temperature: number;
  dewPoint: number;
  humidity: number;
  cloudCover: number;
  precipitation: number;
  visibility: number;
  windSpeed: number;
  windGust: number;
  windDir: number;
  wind80m: number | null;
  windDir80m: number | null;
  wind120m: number | null;
  windDir120m: number | null;
  uvIndex: number;
  isDay: number;
  weatherCode: number;
  pressure: number;
}

export interface DailyData {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  sunrise: Date;
  sunset: Date;
  uvMax: number;
  precipitationSum: number;
  precipitationHours: number;
  windMax: number;
  windDirDominant: number;
}

export interface MeteoData {
  hourly: HourData[];
  daily: DailyData[];
}

export interface ThermalData {
  cloudBase: number;
  thermalTop: number;
  delta: number;
  avgT: number;
  maxT: number;
  minT: number;
  avgCloud: number;
  avgHum: number;
  soarIdx: number;
  hourly: {
    hour: number;
    temp: number;
    intensity: number;
    cloudBase: number;
    wind: number;
    dir: number;
    cloud: number;
  }[];
}

export interface AiAnalysis {
  general: string;
  advice: string;
  thermal: string;
  altitude: string;
  hourly: string;
  pressure: string;
  thunderstorm: string;
}

export interface PressureGradient {
  grad: number;
  desc: string;
}