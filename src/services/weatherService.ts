"use client";

/**
 * weatherService — Versione compatibilità
 * 
 * Tutta la logica è ora in:
 * - meteoFetcher.ts  → fetch raw da API
 * - meteoParser.ts   → parsing e tipi
 * - meteoRepository.ts → React Query hooks
 *
 * Questo file mantiene i tipi e le funzioni legacy per non rompere
 * import esistenti in altri componenti.
 */

import { fetchWithFallback, fetchOpenMeteoRaw } from "./meteoFetcher";
import { parseRawResponse, type ParsedMeteoData, type CurrentParsed } from "./meteoParser";

// === TIPI LEGACY (esportati per retrocompatibilità) ===
export type MeteoHourly = ParsedMeteoData["hourly"][0];
export type MeteoCurrent = CurrentParsed;
export type MeteoDaily = ParsedMeteoData["daily"][0];
export type FetchResult = ParsedMeteoData & { source: "open-meteo" | "7timer"; responseTimeMs: number };
export interface WindProfileResult {
  ventoOrario: {
    ora: number;
    gust: number;
    quote: Record<number, { speed: number; dir: number }>;
  }[];
}
export type TelemetryData = Record<string, never>;
export const telemetry = { getStats: () => ({}), reset: () => {} };

// === FUNZIONI LEGACY (delegano ai nuovi moduli) ===
export const weatherService = {
  async fetchWeather(lat: number, lon: number): Promise<FetchResult> {
    const start = performance.now();
    const { raw, source } = await fetchWithFallback(lat, lon);
    const parsed = raw ? parseRawResponse(raw) : null;
    const responseTimeMs = Math.round(performance.now() - start);

    const empty: ParsedMeteoData = {
      hourly: [],
      daily: [],
      current: { temperature: 0, humidity: 50, windSpeed: 0, windDir: 0, windGusts: 0, weatherCode: 0, cloudCover: 0, precipitation: 0, pressure: 1013, uvIndex: 0, dewPoint: 5 },
    };

    return {
      ...(parsed ?? empty),
      source,
      responseTimeMs,
    };
  },

  async fetchWithFallback(lat: number, lon: number) {
    const data = await this.fetchWeather(lat, lon);
    return { data: data.hourly.length > 0 ? data : null, ok: data.hourly.length > 0 };
  },

  async fetchCurrent(lat: number, lon: number) {
    const data = await this.fetchWeather(lat, lon);
    return { data: data.current, source: data.source };
  },

  async fetchManyCurrent(coords: Array<{ lat: number; lon: number }>) {
    const results: Record<string, { ok: boolean; data: CurrentParsed | null; source?: string; error?: string }> = {};
    for (const c of coords) {
      const key = `light:${c.lat.toFixed(4)}:${c.lon.toFixed(4)}`;
      try {
        const res = await this.fetchWeather(c.lat, c.lon);
        results[key] = { ok: res.hourly.length > 0, data: res.current, source: res.source };
      } catch (err) {
        results[key] = { ok: false, data: null, error: String(err) };
      }
    }
    return results;
  },

  async fetchWindProfile(lat: number, lon: number) {
    const data = await this.fetchWeather(lat, lon);
    const oreUtili = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const quoteBase = [500, 800, 1000, 1200, 1500, 1800, 2000, 2500, 3000];

    const ventoOrario = oreUtili.map(ora => {
      const h = data.hourly.find(h => h.time.getHours() === ora);
      const q: Record<number, { speed: number; dir: number }> = {};
      const surface = h ? { speed: h.windSpeed, dir: h.windDir } : { speed: 0, dir: 0 };

      for (const qAlt of quoteBase) {
        const ratio = Math.max(1, qAlt / 10);
        const speed = Math.min(surface.speed * Math.pow(ratio, 0.143), surface.speed * 1.5);
        const rot = Math.round((qAlt / 250) * 2);
        const dir = ((surface.dir + rot) % 360 + 360) % 360;
        q[qAlt] = {
          speed: Math.max(0.5, Math.round(speed * 10) / 10),
          dir: Math.round(dir),
        };
      }

      return { ora, gust: h?.windGusts ?? 0, quote: q };
    });

    return { ventoOrario };
  },

  clearCache() {
    // React Query gestisce la cache
  },
};