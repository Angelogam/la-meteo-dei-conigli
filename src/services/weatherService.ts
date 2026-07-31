import { MeteoHourly, MeteoCurrent, MeteoDaily, WeatherResponse } from "@/types/meteo";

export interface MeteoHourly {
  time: Date;
  temperature: number;
  apparentTemp: number;
  humidity: number;
  dewPoint: number;
  pressure: number;
  surfacePressure: number;
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
  shortwaveRadiation: number;
  directRadiation: number;
  uvIndex: number;
  visibility: number;
  vapourPressureDeficit: number;
  isDay: boolean;
  freezingLevel: number;
  sunshineDuration: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  mixingRatio: number;
  virtualTemp: number;
  temp80m?: number;
  temp120m?: number;
}

export interface MeteoCurrent {
  time: Date;
  temperature: number;
  humidity: number;
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
  uvIndex: number;
  dewPoint: number;
  temp80m?: number;
  temp120m?: number;
}

export interface MeteoDaily {
  date: Date;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  temperatureMean: number;
  apparentTempMax: number;
  apparentTempMin: number;
  sunrise: string;
  sunset: string;
  daylightDuration: number;
  sunshineDuration: number;
  precipitationSum: number;
  rainSum: number;
  snowfallSum: number;
  precipitationHours: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  windGustsMax: number;
  windDirDominant: number;
  shortwaveRadiationSum: number;
  uvIndexMax: number;
  windSpeed: number;
  cloudCover: number;
  weatherDescription: string;
  precipSum: number;
}

export interface WeatherResponse {
  hourly: MeteoHourly[];
  daily: MeteoDaily[];
  current: MeteoCurrent;
}

export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<{ data: WeatherResponse | null; ok: boolean }> {
    return { data: null, ok: false };
  },
  async fetchWithFallback(lat: number, lon: number): Promise<{ data: WeatherResponse | null; ok: boolean }> {
    return { data: null, ok: false };
  },
  async fetchCurrent(lat: number, lon: number): Promise<{ data: MeteoCurrent | null; ok: boolean }> {
    return { data: null, ok: false };
  },
  async fetchManyCurrent(coords: { lat: number; lon: number }[]): Promise<Record<string, { ok: boolean; data: MeteoCurrent | null }>> {
    return {};
  },
  async fetchWindProfile(lat: number, lon: number, date: string): Promise<{ ventoOrario: any[] } | null> {
    return null;
  }
};