"use client";

import type { WindLevel } from "@/types/meteo";

// Quote target in metri AGL per le quali vogliamo i dati del vento
const QUOTE_TARGET = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];

/**
 * Altezze approssimative dei livelli di pressione in Italia (metri AGL)
 * Queste sono stime – Open-Meteo fornisce i dati a livelli di pressione, non quote fisse.
 * Convertiamo i livelli di pressione in quote usando l'atmosfera standard ISA.
 */
function pressioneAQuota(pressioneHpa: number): number {
  // Formula barometrica (atmosfera standard): h = 44330 * (1 - (P/1013.25)^0.1903)
  return Math.round(44330 * (1 - Math.pow(pressioneHpa / 1013.25, 0.1903)));
}

export class WeatherService {
  private baseUrl = 'https://api.open-meteo.com/v1/forecast';

  async fetchWithFallback(lat: number, lon: number): Promise<any> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const url = this.buildUrl(lat, lon);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data?.hourly?.time?.length) throw new Error('Dati non validi');
        return this.parseData(data);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Errore sconosciuto');
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw new Error(`Impossibile ottenere dati: ${lastError?.message || 'nessuna risposta'}`);
  }

  // ... resto del file rimane invariato
}

export const weatherService = new WeatherService();