import type { HourData } from "@/types/meteo";

export interface TermicheData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  dewPoint: number;
  pressure: number;
  windSpeed: number;
  windDir: number;
  cloudCover: number;
  precipitation: number;
  uvIndex: number;
}

export function calcolaTermiche(hourData: HourData): TermicheData {
  return {
    temperature: hourData.temperature,
    feelsLike: hourData.feelsLike,
    humidity: hourData.humidity,
    dewPoint: hourData.dewPoint,
    pressure: hourData.pressure,
    windSpeed: hourData.windSpeed,
    windDir: hourData.windDir,
    cloudCover: hourData.cloudCover,
    precipitation: hourData.precipitation,
    uvIndex: hourData.uvIndex,
  };
}