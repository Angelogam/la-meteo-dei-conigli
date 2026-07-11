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
  uvIndex: number;
  isDay: boolean;
  soilTemp: number | null;
  soilMoisture: number | null;
}

export interface DailyData {
  date: Date;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationSum: number;
  avgWind?: number;
  maxWind?: number;
  avgCloud?: number;
}

export interface MeteoData {
  hourly: HourData[];
  daily: DailyData[];
  lat: number;
  lon: number;
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

export interface ThermalData {
  cloudBase: number;
  thermalTop: number;
  soarIdx: number;
}

export interface Location {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
}
