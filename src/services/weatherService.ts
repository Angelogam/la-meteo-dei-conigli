import type { HourData, DailyData, MeteoCurrent, MeteoHourly, MeteoDaily } from "@/types/meteo";

export interface WeatherResponse {
  hourly: HourData[];
  daily: DailyData[];
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
  },
};

export type { MeteoHourly, MeteoCurrent, MeteoDaily };