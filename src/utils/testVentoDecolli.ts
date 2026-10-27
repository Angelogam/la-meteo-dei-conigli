"use client";

import { weatherService } from "@/services/weatherService";
import { DECOLLI } from "@/data/decolli";

export interface EsitoTestVento {
  nome: string;
  lat: number;
  lon: number;
  alt: number;
  vento: number | null;
  direzione: number | null;
  temperatura: number | null;
  raffica: number | null;
  weatherCode: number | null;
  ok: boolean;
  errore?: string;
}

export async function testVentoTuttiIDecolli(): Promise<{
  risultati: EsitoTestVento[];
  summary: string;
}> {
  const risultati: EsitoTestVento[] = [];
  let okCount = 0;
  let koCount = 0;

  console.log("🚀 Test vento Open‑Meteo su TUTTI i decolli…");
  console.log(`📡 ${DECOLLI.length} decolli da testare`);

  for (const decollo of DECOLLI) {
    try {
      const result = await weatherService.fetchWeather(decollo.lat, decollo.lon);
      const data = result.current;
      if (data && data.windSpeed != null) {
        okCount++;
        risultati.push({
          nome: decollo.name,
          lat: decollo.lat,
          lon: decollo.lon,
          alt: decollo.altitude,
          vento: data.windSpeed,
          direzione: data.windDir,
          temperatura: data.temperature,
          raffica: data.windGusts,
          weatherCode: data.weatherCode,
          ok: true,
        });
        console.log(`✅ ${decollo.name}: ${Math.round(data.windSpeed)} km/h da ${Math.round(data.windDir)}°`);
      } else {
        koCount++;
        risultati.push({
          nome: decollo.name,
          lat: decollo.lat,
          lon: decollo.lon,
          alt: decollo.altitude,
          vento: null,
          direzione: null,
          temperatura: null,
          raffica: null,
          weatherCode: null,
          ok: false,
          errore: "Nessun dato vento ricevuto",
        });
        console.warn(`❌ ${decollo.name}: nessun dato`);
      }
    } catch (err) {
      koCount++;
      risultati.push({
        nome: decollo.name,
        lat: decollo.lat,
        lon: decollo.lon,
        alt: decollo.altitude,
        vento: null,
        direzione: null,
        temperatura: null,
        raffica: null,
        weatherCode: null,
        ok: false,
        errore: err instanceof Error ? err.message : String(err),
      });
      console.error(`❌ ${decollo.name}: ${err}`);
    }
  }

  const summary = koCount === 0
    ? `✅✅✅ TUTTI I ${DECOLLI.length} DECOLLI MOSTRANO VENTO REALE DA OPEN‑METEO`
    : `⚠️ ${okCount}/${DECOLLI.length} OK · ${koCount} falliti`;

  console.log("");
  console.log("=".repeat(60));
  console.log(summary);
  console.log("=".repeat(60));

  return { risultati, summary };
}