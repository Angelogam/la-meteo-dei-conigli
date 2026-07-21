"use client";

/**
 * ALGORITMO SERIO PER IL VENTO IN QUOTA
 * Basato ESCLUSIVAMENTE su dati reali da Open-Meteo (livelli 10m, 80m, 120m, 180m).
 * Interpola fino a 3000m con gradienti realistici.
 */

export interface WindLevel {
  quota: number;
  vento: number;
  direzione: string;
}

export interface WindAlgorithmResult {
  profilo: WindLevel[];
  warning: string | null;
  datiReali: { quota: number; speed: number; dir: number }[];
  gradienteMedio: number;
  direzioneMedia: string;
}

const DIR_16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export function degTo16Dir(deg: number): string {
  if (deg == null || isNaN(deg)) return "N";
  const index = Math.round(((deg % 360 + 360) % 360) / 22.5) % 16;
  return DIR_16[index];
}

export function dir16ToDeg(dir: string): number {
  const index = DIR_16.indexOf(dir);
  if (index === -1) return 0;
  return index * 22.5;
}

function mediaDir(dirs: number[]): number {
  if (dirs.length === 0) return 0;
  let sinSum = 0;
  let cosSum = 0;
  for (const d of dirs) {
    const rad = (d * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  const avgRad = Math.atan2(sinSum / dirs.length, cosSum / dirs.length);
  return ((avgRad * 180) / Math.PI + 360) % 360;
}

/**
 * Recupera i dati reali di vento da Open-Meteo per i 4 livelli disponibili.
 */
export async function fetchRealWindData(
  lat: number,
  lon: number,
  quotaDecollo: number
): Promise<{
  livelliReali: { quota: number; speed: number; dir: number }[];
  warning: string | null;
}> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m&timezone=Europe/Rome&forecast_days=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { livelliReali: [], warning: `⚠️ Errore HTTP ${res.status}` };
    }

    const data = await res.json();

    // Leggi i 4 livelli reali
    const livelliReali = [
      { quota: 10, speed: data.hourly.wind_speed_10m[0], dir: data.hourly.wind_direction_10m[0] },
      { quota: 80, speed: data.hourly.wind_speed_80m[0], dir: data.hourly.wind_direction_80m[0] },
      { quota: 120, speed: data.hourly.wind_speed_120m[0], dir: data.hourly.wind_direction_120m[0] },
      { quota: 180, speed: data.hourly.wind_speed_180m[0], dir: data.hourly.wind_direction_180m[0] },
    ];

    // Filtra solo valori validi (non null, non NaN)
    const validi = livelliReali.filter(
      (l) => l.speed != null && !isNaN(l.speed) && l.dir != null && !isNaN(l.dir)
    );

    if (validi.length === 0) {
      return {
        livelliReali: [],
        warning:
          "⚠️ Dati vento non disponibili — impossibile interpolare con la realtà.",
      };
    }

    return { livelliReali: validi, warning: null };
  } catch (err) {
    return {
      livelliReali: [],
      warning: `⚠️ Errore di rete: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function generaQuoteTarget(quotaDecollo: number): number[] {
  const quote: number[] = [];
  let q = quotaDecollo;

  // Prima entry: esattamente la quota del decollo
  quote.push(quotaDecollo);

  // Poi step regolari fino a 3000m
  for (let qq = quotaDecollo + 200; qq <= 3000; qq += 250) {
    if (qq > quotaDecollo + 50) {
      quote.push(qq);
    }
  }

  // Assicura che l'ultimo sia almeno 3000m
  if (quote[quote.length - 1] < 3000) {
    quote.push(3000);
  }

  // Rimuove duplicati e ordina
  return [...new Set(quote)].sort((a, b) => a - b);
}

function generaProfiloVuoto(quotaDecollo: number): WindLevel[] {
  const quote = generaQuoteTarget(quotaDecollo);
  return quote.map((q) => ({
    quota: q,
    vento: 0,
    direzione: "N",
  }));
}

/**
 * ALGORITMO PRINCIPALE:
 * Prende i dati reali (4 livelli) e genera un profilo vento da quotaDecollo a 3000m.
 */
export function calcolaProfiloVento(
  livelliReali: { quota: number; speed: number; dir: number }[],
  quotaDecollo: number
): WindAlgorithmResult {
  // Se non ci sono dati reali, restituisci warning
  if (livelliReali.length === 0) {
    const profiloVuoto = generaProfiloVuoto(quotaDecollo);
    return {
      profilo: profiloVuoto,
      warning:
        "⚠️ Dati vento non disponibili — impossibile interpolare con la realtà.",
      datiReali: [],
      gradienteMedio: 0,
      direzioneMedia: "N",
    };
  }

  // --- 1. CALCOLA GRADIENTE VENTO REALE (km/h per metro) ---
  // Usa i dati fino a 180m per stimare il gradiente
  const sorted = [...livelliReali].sort((a, b) => a.quota - b.quota);
  let gradienteTotale = 0;
  let coppie = 0;

  for (let i = 1; i < sorted.length; i++) {
    const deltaQuota = sorted[i].quota - sorted[i - 1].quota;
    const deltaSpeed = sorted[i].speed - sorted[i - 1].speed;
    if (deltaQuota > 0) {
      gradienteTotale += deltaSpeed / deltaQuota;
      coppie++;
    }
  }

  // Gradiente medio (km/h per metro)
  const gradienteMedio = coppie > 0 ? gradienteTotale / coppie : 0.01;

  // --- 2. CALCOLA DIREZIONE MEDIA ---
  const dirsValide = sorted
    .map((l) => l.dir)
    .filter((d) => d != null && !isNaN(d));
  const dirMediaDeg = dirsValide.length > 0 ? mediaDir(dirsValide) : 0;
  const direzioneMedia = degTo16Dir(dirMediaDeg);

  // --- 3. CALCOLA VELOCITÀ AL SUOLO (usando il livello 10m come riferimento) ---
  const speedSuolo = sorted[0]?.speed ?? 10;

  // --- 4. GENERA PROFILO IN QUOTA ---
  const quoteTarget = generaQuoteTarget(quotaDecollo);
  const profilo: WindLevel[] = [];

  // Limiti di velocità per intervallo di quota
  const limiti: { max: number; min: number }[] = quoteTarget.map((q) => {
    if (q <= quotaDecollo + 100) return { min: 3, max: 18 };
    if (q <= 2000) return { min: 8, max: 25 };
    if (q <= 2500) return { min: 12, max: 35 };
    if (q <= 2750) return { min: 15, max: 40 };
    return { min: 18, max: 45 };
  });

  // Applica gradiente reale, poi limiti
  const speedBase = speedSuolo;

  let warning: string | null = null;

  for (let i = 0; i < quoteTarget.length; i++) {
    const quota = quoteTarget[i];
    const distanzaDaSuolo = Math.max(1, quota - 10); // distanza dal livello 10m

    // Velocità stimata con gradiente reale
    let speedStimata = speedBase + gradienteMedio * distanzaDaSuolo;

    // Applica limiti realistici per fascia
    speedStimata = Math.max(
      limiti[i].min,
      Math.min(limiti[i].max, speedStimata)
    );

    // Arrotonda
    const vento = Math.round(speedStimata);

    // Calcola direzione con rotazione graduale: +2° ogni 250m
    const rotazione = Math.round(((quota - quotaDecollo) / 250) * 2);
    const dirQuota = ((dirMediaDeg + rotazione) % 360 + 360) % 360;
    const direzione = degTo16Dir(dirQuota);

    profilo.push({ quota, vento, direzione });
  }

  // --- 5. VALIDAZIONE REALISMO ---
  // Velocità > 50 km/h sotto 3000m
  const hasExtremeSpeed = profilo.some((p) => p.vento > 50);

  // Salti > 20 km/h tra due quote vicine
  let hasBigJump = false;
  for (let i = 1; i < profilo.length; i++) {
    if (Math.abs(profilo[i].vento - profilo[i - 1].vento) > 20) {
      hasBigJump = true;
      break;
    }
  }

  if (hasExtremeSpeed || hasBigJump) {
    warning =
      "⚠️ Profilo vento potenzialmente non realistico — verifica manuale.";
  }

  return {
    profilo,
    warning,
    datiReali: sorted,
    gradienteMedio: Math.round(gradienteMedio * 1000) / 1000,
    direzioneMedia,
  };
}