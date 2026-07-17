/**
 * FIX DATI VENTO DECOLLI
 * 
 * Obiettivo:
 * - Leggere i dati di vento da Open‑Meteo per OGNI decollo
 * - Aggiornare automaticamente ogni card
 * - Usare weatherService (named export) per evitare fetch duplicati
 * - Mostrare direzione e intensità del vento in tempo reale
 * 
 * Integrazione con DecolliCard.tsx
 */

import { weatherService } from "@/services/weatherService";
import { DECOLLI } from "@/data/decolli";

export interface VentoDecollo {
  nome: string;
  vento: number;
  ventoLabel: string;
  direzione: number;
  direzioneCardinale: string;
  raffica: number | null;
  temperatura: number | null;
  ok: boolean;
}

function getCardinalDir(deg: number): string {
  if (deg == null) return "N/D";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function getWindArrow(deg: number): string {
  if (deg == null) return "→";
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

/**
 * Aggiorna vento per un singolo decollo
 */
export async function aggiornaVentoSingoloDecollo(lat: number, lon: number, nome: string): Promise<VentoDecollo> {
  try {
    const { data } = await weatherService.fetchWithFallback(lat, lon);
    
    if (!data || !data.current) {
      return {
        nome,
        vento: 0,
        ventoLabel: "N/D",
        direzione: 0,
        direzioneCardinale: "N/D",
        raffica: null,
        temperatura: null,
        ok: false,
      };
    }

    const windSpeed = data.current.windSpeed ?? 0;
    const windDir = data.current.windDir ?? 0;
    const windGust = data.current.windGusts ?? null;
    const temp = data.current.temperature ?? null;

    const cardinale = getCardinalDir(windDir);
    const arrow = getWindArrow(windDir);

    return {
      nome,
      vento: Math.round(windSpeed),
      ventoLabel: `${arrow} ${Math.round(windSpeed)} km/h da ${cardinale} (${Math.round(windDir)}°)`,
      direzione: Math.round(windDir),
      direzioneCardinale: cardinale,
      raffica: windGust != null ? Math.round(windGust) : null,
      temperatura: temp != null ? Math.round(temp) : null,
      ok: windSpeed >= 0 && windSpeed <= 120,
    };
  } catch (err) {
    console.warn(`[fixVento] Errore per ${nome}:`, err);
    return {
      nome,
      vento: 0,
      ventoLabel: "Errore",
      direzione: 0,
      direzioneCardinale: "N/D",
      raffica: null,
      temperatura: null,
      ok: false,
    };
  }
}

/**
 * Aggiorna vento per TUTTI i decolli e restituisce i risultati
 */
export async function aggiornaVentoTuttiDecolli(): Promise<VentoDecollo[]> {
  console.log("🚀 [fixVento] Aggiornamento vento per", DECOLLI.length, "decolli...");
  
  const risultati: VentoDecollo[] = [];

  for (let i = 0; i < DECOLLI.length; i++) {
    const d = DECOLLI[i];
    const risultato = await aggiornaVentoSingoloDecollo(d.lat, d.lon, d.name);
    risultati.push(risultato);
    console.log(`  [${i + 1}/${DECOLLI.length}] ${d.name}: ${risultato.ventoLabel} ${risultato.ok ? "✅" : "❌"}`);
  }

  const ok = risultati.filter(r => r.ok).length;
  const ko = risultati.filter(r => !r.ok).length;
  console.log(`✅ [fixVento] Completato: ${ok} OK, ${ko} falliti`);
  
  return risultati;
}

/**
 * Test automatico: verifica che tutti i decolli abbiano vento aggiornato
 */
export async function testVentoDecolli(): Promise<{ ok: number; ko: number; dettagli: VentoDecollo[] }> {
  const risultati = await aggiornaVentoTuttiDecolli();
  const ok = risultati.filter(r => r.ok).length;
  const ko = risultati.filter(r => !r.ok).length;

  console.log("");
  console.log("=".repeat(60));
  if (ko === 0) {
    console.log(`✅✅✅ TUTTI I ${DECOLLI.length} DECOLLI MOSTRANO VENTO REALE DA OPEN‑METEO`);
  } else {
    console.log(`⚠️ ${ok}/${DECOLLI.length} OK · ${ko} falliti`);
    for (const r of risultati.filter(r => !r.ok)) {
      console.warn(`  ❌ ${r.nome}: nessun dato vento`);
    }
  }
  console.log("=".repeat(60));
  console.log("");

  return { ok, ko, dettagli: risultati };
}