import { WeatherResponse, MeteoHourly, MeteoCurrent, MeteoDaily } from "@/types/meteo";

export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<{ data: WeatherResponse | null; ok: boolean }> {
    // Placeholder implementation
    return { data: null, ok: false };
  },
  async fetchWithFallback(lat: number, lon: number): Promise<{ data: WeatherResponse | null; ok: boolean }> {
    // Placeholder implementation
    return { data: null, ok: false };
  },
  async fetchCurrent(lat: number, lon: number): Promise<{ data: MeteoCurrent | null; ok: boolean }> {
    // Placeholder implementation
    return { data: null, ok: false };
  },
  async fetchManyCurrent(coords: { lat: number; lon: number }[]): Promise<Record<string, { ok: boolean; data: MeteoCurrent | null }>> {
    // Placeholder implementation
    return {};
  },
  async fetchWindProfile(lat: number, lon: number, date: string): Promise<{ ventoOrario: any[] } | null> {
    // Placeholder implementation
    return null;
  }
};