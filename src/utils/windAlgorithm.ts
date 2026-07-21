"use client";

// === Esponenti pubblici ===
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
  let sinSum = 0, cosSum = 0;
  for (const d of dirs) {
    const rad = (d * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
  }
  const avgRad = Math.atan2(sinSum / dirs.length, cosSum / dirs.length);
  return ((avgRad * 180) / Math.PI + 360) % 360;
}

function generaQuoteTarget(quotaDecollo: number): number[] {
  const set = new Set<number>();
  set.add(quotaDecollo);
  for (let q = Math.ceil(quotaDecollo / 250) * 250 + 250; q <= 3000; q += 250) {
    set.add(q);
  }
  if (Math.max(...set) < 3000) set.add(3000);
  return Array.from(set).sort((a, b) => a - b);
}

export async function fetchRealWindData(
  lat: number,
  lon: number,
  _quotaDecollo: number
): Promise<{
  livelliReali: { quota: number; speed: number; dir: number }[];
  warning: string | null;
}> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,wind_speed_180m,wind_direction_180m&timezone=Europe/Rome&forecast_days=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { livelliReali: [], warning: `Errore HTTP ${res.status}` };
    const raw = await res.json();
    const livelliReali = [
      { quota: 10,  speed: raw.hourly.wind_speed_10m[0], dir: raw.hourly.wind_direction_10m[0] },
      { quota: 80,  speed: raw.hourly.wind_speed_80m[0], dir: raw.hourly.wind_direction_80m[0] },
      { quota: 120, speed: raw.hourly.wind_speed_120m[0], dir: raw.hourly.wind_direction_120m[0] },
      { quota: 180, speed: raw.hourly.wind_speed_180m[0], dir: raw.hourly.wind_direction_180m[0] },
    ].filter(l => l.speed != null && !isNaN(l.speed) && l.dir != null && !isNaN(l.dir));
    if (livelliReali.length === 0) return { livelliReali: [], warning: "Dati vento non disponibili." };
    return { livelliReali, warning: null };
  } catch (err) {
    return { livelliReali: [], warning: `Errore: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export function calcolaProfiloVento(
  livelliReali: { quota: number; speed: number; dir: number }[],
  quotaDecollo: number
): WindAlgorithmResult {
  if (livelliReali.length === 0) {
    return {
      profilo: generaQuoteTarget(quotaDecollo).map(q => ({ quota: q, vento: 0, direzione: "N" })),
      warning: "Dati vento non disponibili.",
      datiReali: [],
      gradienteMedio: 0,
      direzioneMedia: "N",
    };
  }
  const sorted = [...livelliReali].sort((a, b) => a.quota - b.quota);
  let gradTot = 0, coppie = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dq = sorted[i].quota - sorted[i - 1].quota;
    const dv = sorted[i].speed - sorted[i - 1].speed;
    if (dq > 0) { gradTot += dv / dq; coppie++; }
  }
  const gradienteMedio = coppie > 0 ? gradTot / coppie : 0.01;
  const dirsValide = sorted.map(l => l.dir).filter(d => d != null && !isNaN(d));
  const dirMediaDeg = dirsValide.length > 0 ? mediaDir(dirsValide) : 0;
  const direzioneMedia = degTo16Dir(dirMediaDeg);
  const speedBase = sorted[0]?.speed ?? 10;
  const quoteTarget = generaQuoteTarget(quotaDecollo);
  const profilo: WindLevel[] = [];
  const limiti: { min: number; max: number }[] = quoteTarget.map(q => {
    if (q <= quotaDecollo + 100) return { min: 3, max: 18 };
    if (q <= 2000) return { min: 8, max: 25 };
    if (q <= 2500) return { min: 12, max: 35 };
    if (q <= 2750) return { min: 15, max: 40 };
    return { min: 18, max: 45 };
  });
  let warning: string | null = null;
  for (let i = 0; i < quoteTarget.length; i++) {
    const quota = quoteTarget[i];
    const dist = Math.max(1, quota - 10);
    let speed = speedBase + gradienteMedio * dist;
    speed = Math.max(limiti[i].min, Math.min(limiti[i].max, speed));
    const vento = Math.round(speed);
    const rot = Math.round(((quota - quotaDecollo) / 250) * 2);
    const dirq = ((dirMediaDeg + rot) % 360 + 360) % 360;
    profilo.push({ quota, vento, direzione: degTo16Dir(dirq) });
  }
  const hasExtreme = profilo.some(p => p.vento > 50);
  const hasJump = profilo.some((p, i) => i > 0 && Math.abs(p.vento - profilo[i - 1].vento) > 20);
  if (hasExtreme || hasJump) warning = "Profilo vento potenzialmente non realistico.";
  return { profilo, warning, datiReali: sorted, gradienteMedio: Math.round(gradienteMedio * 1000) / 1000, direzioneMedia };
}