`

So the file got mangled with a dyad-write tag inserted mid-way into the code. I need to rewrite the file completely and cleanly. The user also asked earlier to add temperature to the hourly data and make the font whiter/more readable in `VentiInterpolatiTab.tsx`.

In my previous response, I apparently sent a corrupted file. Now I need to provide the correct complete file for `getVentiInterpolati.ts`, and then update `VentiInterpolatiTab.tsx` to display the temp and use better contrast. Let me write the full getVentiInterpolati.ts correctly this time, then rewrite VentiInterpolatiTab.tsx including temperature display.

Let me reconstruct the file from what was shown in the original context. From the original context, the file `src/utils/getVentiInterpolati.ts` was provided (though truncated at the end in the context dump). It included:

- Interface QuotaVento { speed, dir }
- Interface VentiInterpolatiPerOra { ora, quote, gust }
- Interface VentiInterpolatiData { giorno, lat, lon, quotaDecollo, ventoOrario }
- Cache map
- LIVELLI_QUOTA array
- interpolateVento function
- getVentiInterpolati async function

I need to add `temp` to `VentiInterpolatiPerOra` and populate it from `temperature_2m`.

Then in `VentiInterpolatiTab.tsx`, I need to:
1. Show temperature in the table (with °C)
2. Make text whiter (e.g., use `text-white` instead of `text-slate-400`/`text-slate-500`, `text-sm` etc.)

Let me write both files fully.

For the tab component, the user specifically asked "metti anche i gradi in temperatura e aumenta la lettura del font rendilo + bianco" — add degrees in temperature and increase font readability make it more white. The user selected the "Riepilogo orario vento al decollo" section. So I should add temp column there, and generally brighten the text.

Let me construct the full `getVentiInterpolati.ts` file.</think>Il file era stato corrotto con un tag `<dyad-write>` inserito in mezzo al codice. Lo riscrivo completamente da zero in modo pulito:

<dyad-write path="src/utils/getVentiInterpolati.ts" description="Riscrittura completa del file corrotto, aggiunta temperatura ai dati orari">
"use client";

export interface QuotaVento {
  speed: number;
  dir: number;
}

export interface VentiInterpolatiPerOra {
  ora: number;
  quote: Record<number, QuotaVento>;
  gust: number;
  temp: number;
}

export interface VentiInterpolatiData {
  giorno: string;
  lat: number;
  lon: number;
  quotaDecollo: number;
  ventoOrario: VentiInterpolatiPerOra[];
}

// Cache interna (3 minuti)
const cacheVenti = new Map<string, { data: VentiInterpolatiData; ts: number }>();
const CACHE_TTL = 3 * 60 * 1000;

// Livelli di quota con le chiavi API corrispondenti
const LIVELLI_QUOTA = [
  { quota: 0, speedKey: "wind_speed_10m", dirKey: "wind_direction_10m" },
  { quota: 760, speedKey: "wind_speed_925hPa", dirKey: "wind_direction_925hPa" },
  { quota: 1450, speedKey: "wind_speed_850hPa", dirKey: "wind_direction_850hPa" },
  { quota: 3000, speedKey: "wind_speed_700hPa", dirKey: "wind_direction_700hPa" },
  { quota: 4000, speedKey: "wind_speed_600hPa", dirKey: "wind_direction_600hPa" },
];

/**
 * Interpola linearmente tra due livelli per una quota data
 */
function interpolateVento(
  quota: number,
  sotto: { quota: number; speed: number; dir: number },
  sopra: { quota: number; speed: number; dir: number }
): { speed: number; dir: number } {
  const ratio = (quota - sotto.quota) / (sopra.quota - sotto.quota);

  // Interpolazione velocità
  const speed = sotto.speed + ratio * (sopra.speed - sotto.speed);

  // Interpolazione direzione (gestisce il wrap 360°)
  let diffDir = sopra.dir - sotto.dir;
  if (diffDir > 180) diffDir -= 360;
  if (diffDir < -180) diffDir += 360;
  const dir = ((sotto.dir + diffDir * ratio) % 360 + 360) % 360;

  return { speed: Math.round(speed), dir: Math.round(dir) };
}

export async function getVentiInterpolati(lat: number, lon: number, quotaDecollo: number, day: string): Promise<VentiInterpolatiData> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)},${quotaDecollo},${day}`;
  const cached = cacheVenti.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_925hPa,wind_direction_925hPa,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa,wind_speed_600hPa,wind_direction_600hPa&timezone=Europe/Rome&start_date=${day}&end_date=${day}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const hours: string[] = data.hourly.time;
  const temps: number[] = data.hourly.temperature_2m;

  // Genera tutte le quote dal decollo ogni 250m fino a 4000m
  const partenza = Math.floor(quotaDecollo / 250) * 250;
  const quoteInterpolazione: number[] = [];
  for (let q = partenza; q <= 4000; q += 250) {
    quoteInterpolazione.push(q);
  }
  // Assicura che la quota decollo esatta sia inclusa
  if (!quoteInterpolazione.includes(quotaDecollo)) {
    quoteInterpolazione.push(quotaDecollo);
    quoteInterpolazione.sort((a, b) => a - b);
  }

  const ventoOrario: VentiInterpolatiPerOra[] = [];

  for (let i = 0; i < hours.length; i++) {
    const ora = Number(hours[i].split("T")[1].split(":")[0]);
    if (ora >= 9 && ora <= 19) {
      const quote: Record<number, QuotaVento> = {};

      // Estrae i livelli disponibili per questa ora
      const livelliDisponibili: { quota: number; speed: number; dir: number }[] = [];

      LIVELLI_QUOTA.forEach((livello) => {
        const speedArr = data.hourly[livello.speedKey];
        const dirArr = data.hourly[livello.dirKey];
        if (speedArr && dirArr && speedArr[i] != null && dirArr[i] != null) {
          livelliDisponibili.push({
            quota: livello.quota,
            speed: speedArr[i] as number,
            dir: dirArr[i] as number,
          });
        }
      });

      // Se non abbiamo livelli, saltiamo
      if (livelliDisponibili.length === 0) continue;

      // Ordina per quota
      livelliDisponibili.sort((a, b) => a.quota - b.quota);

      quoteInterpolazione.forEach((q) => {
        // Se q è esattamente un livello disponibile, usa quello
        const esatto = livelliDisponibili.find((l) => l.quota === q);
        if (esatto) {
          quote[q] = {<dyad-write path="src/utils/getVentiInterpolati.ts" description="Riscrittura completa del file con temperatura inclusa nei dati orari">
"use client";

export interface QuotaVento {
  speed: number;
  dir: number;
}

export interface VentiInterpolatiPerOra {
  ora: number;
  quote: Record<number, QuotaVento>;
  gust: number;
  temp: number;
}

export interface VentiInterpolatiData {
  giorno: string;
  lat: number;
  lon: number;
  quotaDecollo: number;
  ventoOrario: VentiInterpolatiPerOra[];
}

// Cache interna (3 minuti)
const cacheVenti = new Map<string, { data: VentiInterpolatiData; ts: number }>();
const CACHE_TTL = 3 * 60 * 1000;

// Livelli di quota con le chiavi API corrispondenti
const LIVELLI_QUOTA = [
  { quota: 0, speedKey: "wind_speed_10m", dirKey: "wind_direction_10m" },
  { quota: 760, speedKey: "wind_speed_925hPa", dirKey: "wind_direction_925hPa" },
  { quota: 1450, speedKey: "wind_speed_850hPa", dirKey: "wind_direction_850hPa" },
  { quota: 3000, speedKey: "wind_speed_700hPa", dirKey: "wind_direction_700hPa" },
  { quota: 4000, speedKey: "wind_speed_600hPa", dirKey: "wind_direction_600hPa" },
];

/**
 * Interpola linearmente tra due livelli per una quota data
 */
function interpolateVento(
  quota: number,
  sotto: { quota: number; speed: number; dir: number },
  sopra: { quota: number; speed: number; dir: number }
): { speed: number; dir: number } {
  const ratio = (quota - sotto.quota) / (sopra.quota - sotto.quota);

  // Interpolazione velocità
  const speed = sotto.speed + ratio * (sopra.speed - sotto.speed);

  // Interpolazione direzione (gestisce il wrap 360°)
  let diffDir = sopra.dir - sotto.dir;
  if (diffDir > 180) diffDir -= 360;
  if (diffDir < -180) diffDir += 360;
  const dir = ((sotto.dir + diffDir * ratio) % 360 + 360) % 360;

  return { speed: Math.round(speed), dir: Math.round(dir) };
}

export async function getVentiInterpolati(lat: number, lon: number, quotaDecollo: number, day: string): Promise<VentiInterpolatiData> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)},${quotaDecollo},${day}`;
  const cached = cacheVenti.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,wind_speed_925hPa,wind_direction_925hPa,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa,wind_speed_600hPa,wind_direction_600hPa&timezone=Europe/Rome&start_date=${day}&end_date=${day}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const hours: string[] = data.hourly.time;
  const temps: number[] = data.hourly.temperature_2m;

  // Genera tutte le quote dal decollo ogni 250m fino a 4000m
  const partenza = Math.floor(quotaDecollo / 250) * 250;
  const quoteInterpolazione: number[] = [];
  for (let q = partenza; q <= 4000; q += 250) {
    quoteInterpolazione.push(q);
  }
  // Assicura che la quota decollo esatta sia inclusa
  if (!quoteInterpolazione.includes(quotaDecollo)) {
    quoteInterpolazione.push(quotaDecollo);
    quoteInterpolazione.sort((a, b) => a - b);
  }

  const ventoOrario: VentiInterpolatiPerOra[] = [];

  for (let i = 0; i < hours.length; i++) {
    const ora = Number(hours[i].split("T")[1].split(":")[0]);
    if (ora >= 9 && ora <= 19) {
      const quote: Record<number, QuotaVento> = {};

      // Estrae i livelli disponibili per questa ora
      const livelliDisponibili: { quota: number; speed: number; dir: number }[] = [];

      LIVELLI_QUOTA.forEach((livello) => {
        const speedArr = data.hourly[livello.speedKey];
        const dirArr = data.hourly[livello.dirKey];
        if (speedArr && dirArr && speedArr[i] != null && dirArr[i] != null) {
          livelliDisponibili.push({
            quota: livello.quota,
            speed: speedArr[i] as number,
            dir: dirArr[i] as number,
          });
        }
      });

      // Se non abbiamo livelli, saltiamo
      if (livelliDisponibili.length === 0) continue;

      // Ordina per quota
      livelliDisponibili.sort((a, b) => a.quota - b.quota);

      quoteInterpolazione.forEach((q) => {
        // Se q è esattamente un livello disponibile, usa quello
        const esatto = livelliDisponibili.find((l) => l.quota === q);
        if (esatto) {
          quote[q] = { speed: Math.round(esatto.speed), dir: Math.round(esatto.dir) };
          return;
        }

        // Trova il livello sotto e sopra
        const sotto = livelliDisponibili.filter((l) => l.quota <= q).pop();
        const sopra = livelliDisponibili.find((l) => l.quota >= q);

        if (sotto && sopra && sotto !== sopra) {
          // Interpola tra sotto e sopra
          const interp = interpolateVento(q, sotto, sopra);
          quote[q] = interp;
        } else if (sotto && !sopra) {
          // Sopra l'ultimo livello: estrapola con lo stesso gradiente
          const ultimo = sotto;
          const penultimo = livelliDisponibili[livelliDisponibili.length - 2] || ultimo;
          const gradientVento = ultimo.quota !== penultimo.quota
            ? (ultimo.speed - penultimo.speed) / (ultimo.quota - penultimo.quota)
            : 0.01;
          const speed = Math.max(0, ultimo.speed + gradientVento * (q - ultimo.quota));
          quote[q] = { speed: Math.round(speed), dir: Math.round(ultimo.dir) };
        } else if (!sotto && sopra) {
          // Sotto il primo livello: usa il primo livello
          quote[q] = { speed: Math.round(sopra.speed), dir: Math.round(sopra.dir) };
        }
      });

      ventoOrario.push({ ora, quote, gust: data.hourly.wind_gusts_10m[i], temp: temps[i] });
    }
  }

  const result: VentiInterpolatiData = {
    giorno: day, lat, lon, quotaDecollo, ventoOrario,
  };

  cacheVenti.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}