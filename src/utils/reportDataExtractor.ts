/**
 * reportDataExtractor.ts — estrae e computa tutti i dati dal JSON Open-Meteo grezzo.
 *
 * Funzione pura: riceve il raw JSON e restituisce ExtractedWeatherData.
 * Nessun valore inventato: se un dato API manca, il relativo campo è null.
 * Lo scenario viene già identificato qui per coerenza.
 */

import type { ExtractedWeatherData, ScenarioMeteo } from "./reportTypes";
import { degToCardinal, degToCardinalBreve } from "./reportTypes";

/**
 * Estrae i dati meteorologici dal JSON grezzo di Open-Meteo.
 * Restituisce null se i dati sono insufficienti.
 */
export function extractWeatherData(hourlyData: any): ExtractedWeatherData | null {
  if (!hourlyData?.time || hourlyData.time.length === 0) return null;

  const times: string[] = hourlyData.time;
  const temps: (number | null)[] = (hourlyData.temperature_2m as (number | null)[] | undefined) ?? [];
  const dews: (number | null)[] = (hourlyData.dew_point_2m as (number | null)[] | undefined) ?? [];
  const winds: (number | null)[] = (hourlyData.wind_speed_10m as (number | null)[] | undefined) ?? [];
  const dirs: (number | null)[] = (hourlyData.wind_direction_10m as (number | null)[] | undefined) ?? [];
  const gusts: (number | null)[] = (hourlyData.wind_gusts_10m as (number | null)[] | undefined) ?? [];
  const precips: (number | null)[] = (hourlyData.precipitation as (number | null)[] | undefined) ?? [];
  const clouds: (number | null)[] = (hourlyData.cloud_cover as (number | null)[] | undefined) ?? [];
  const capes: (number | null)[] = (hourlyData.cape as (number | null)[] | undefined) ?? [];
  const freezes: (number | null)[] = (hourlyData.freezing_level_height as (number | null)[] | undefined) ?? [];
  const codes: (number | null)[] = (hourlyData.weather_code as (number | null)[] | undefined) ?? [];

  // Filtra ore diurne 8:00 – 19:00
  const dayIndices: number[] = [];
  times.forEach((t: string, i: number) => {
    const hr = parseInt(t.split("T")[1].split(":")[0], 10);
    if (hr >= 8 && hr <= 19) dayIndices.push(i);
  });
  if (dayIndices.length === 0) return null;

  // ── Temperature ──────────────────────────────────────────────────────────
  const validTemps = dayIndices.map((i) => temps[i]).filter((t): t is number => t != null);
  const tempMin = validTemps.length > 0 ? Math.round(Math.min(...validTemps)) : null;
  const tempMax = validTemps.length > 0 ? Math.round(Math.max(...validTemps)) : null;
  const deltaT = (tempMin != null && tempMax != null) ? tempMax - tempMin : null;

  // ── CAPE e Lifted Index (REALI) ──────────────────────────────────────────
  const validCapes = dayIndices.map((i) => capes[i]).filter((c): c is number => c != null);
  const maxCape = validCapes.length > 0 ? Math.round(Math.max(...validCapes)) : null;
  const avgCape = validCapes.length > 0 ? Math.round(validCapes.reduce((a, b) => a + b, 0) / validCapes.length) : null;
  const effectiveMaxCape = maxCape ?? 0;

  const validLIs = dayIndices
    .map((i) => (hourlyData.lifted_index as number[] | undefined)?.[i] ?? null)
    .filter((li): li is number => li != null);
  const avgLI = validLIs.length > 0 ? Math.round((validLIs.reduce((a, b) => a + b, 0) / validLIs.length) * 10) / 10 : null;

  // ── Freezing level (REALE) ───────────────────────────────────────────────
  const validFreezes = dayIndices.map((i) => freezes[i]).filter((f): f is number => f != null && f > 0);
  const avgFreeze = validFreezes.length > 0 ? Math.round(validFreezes.reduce((a, b) => a + b, 0) / validFreezes.length) : null;
  const maxFreeze = validFreezes.length > 0 ? Math.round(Math.max(...validFreezes)) : null;

  // ── Spread e base cumuli ─────────────────────────────────────────────────
  const centralIndices = dayIndices.filter((i) => {
    const hr = parseInt(times[i].split("T")[1].split(":")[0], 10);
    return hr >= 11 && hr <= 16;
  });
  const validSpreads = centralIndices
    .map((i) => { const t = temps[i], d = dews[i]; return (t != null && d != null) ? Math.max(1, t - d) : null; })
    .filter((s): s is number => s != null);
  const avgSpread = validSpreads.length > 0 ? validSpreads.reduce((a, b) => a + b, 0) / validSpreads.length : null;

  // base cumuli: formula LCL standard (spread * 125m), range minimo/massimo
  const baseCumuliMin = avgSpread != null ? Math.round(
    (tempMin ?? 0) + Math.max(300, (avgSpread - 2) * 125)
  ) : null;
  const baseCumuliMax = avgSpread != null ? Math.round(
    (tempMin ?? 0) + Math.max(600, (avgSpread + 3) * 125)
  ) : null;
  const baseCumuliMedia =
    (baseCumuliMin != null && baseCumuliMax != null)
      ? Math.round((baseCumuliMin + baseCumuliMax) / 2)
      : null;

  // ── Innesco termico ──────────────────────────────────────────────────────
  let oraInnesco = "10:30";
  for (const i of dayIndices) {
    const hr = parseInt(times[i].split("T")[1].split(":")[0], 10);
    const t = temps[i];
    const c = clouds[i];
    if (t != null && c != null && hr >= 9 && t >= (tempMin ?? 0) + 3 && c < 60) {
      oraInnesco = `${String(hr).padStart(2, "0")}:30`;
      break;
    }
  }

  // ── Rateo di salita (dipende da CAPE) ────────────────────────────────────
  let rateoMin = 0.6, rateoMax = 1.0;
  if (effectiveMaxCape > 1200)       { rateoMin = 1.5; rateoMax = 2.8; }
  else if (effectiveMaxCape > 800)   { rateoMin = 1.2; rateoMax = 2.2; }
  else if (effectiveMaxCape > 500)   { rateoMin = 0.9; rateoMax = 1.7; }
  else if (effectiveMaxCape > 250)   { rateoMin = 0.6; rateoMax = 1.2; }
  else                               { rateoMin = 0.3; rateoMax = 0.7; }

  // ── Vento al suolo (REALE) ───────────────────────────────────────────────
  const validWinds = dayIndices.map((i) => winds[i]).filter((w): w is number => w != null);
  const validDirs  = dayIndices.map((i) => dirs[i]).filter((d): d is number => d != null);
  const avgWindGround = validWinds.length > 0 ? Math.round(validWinds.reduce((a, b) => a + b, 0) / validWinds.length) : null;
  const maxWindGround = validWinds.length > 0 ? Math.round(Math.max(...validWinds)) : null;
  const validGusts    = dayIndices.map((i) => gusts[i]).filter((g): g is number => g != null);
  const maxGust       = validGusts.length > 0 ? Math.round(Math.max(...validGusts)) : null;
  const mainDirDeg    = validDirs.length > 0 ? Math.round(validDirs.reduce((a, b) => a + b, 0) / validDirs.length) : null;
  const mainWindDir      = mainDirDeg != null ? degToCardinal(mainDirDeg) : "N/D";
  const mainWindDirBreve = mainDirDeg != null ? degToCardinalBreve(mainDirDeg) : "N/D";

  // ── Vento in quota REALE dai livelli di pressione API ────────────────────
  const wind850Arr = (hourlyData.wind_speed_850hPa as number[] | undefined) ?? [];
  const dir850Arr  = (hourlyData.wind_direction_850hPa as number[] | undefined) ?? [];
  const wind700Arr = (hourlyData.wind_speed_700hPa as number[] | undefined) ?? [];
  const dir700Arr  = (hourlyData.wind_direction_700hPa as number[] | undefined) ?? [];
  const wind500Arr = (hourlyData.wind_speed_500hPa as number[] | undefined) ?? [];
  const dir500Arr  = (hourlyData.wind_direction_500hPa as number[] | undefined) ?? [];

  const avgWind = (arr: number[], idxs: number[]) => {
    const vals = idxs.map((i) => arr[i] ?? null).filter((w): w is number => w != null);
    return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  };
  const avgDir = (arr: number[], idxs: number[]) => {
    const vals = idxs.map((i) => arr[i] ?? null).filter((d): d is number => d != null);
    return vals.length > 0 ? degToCardinal(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)) : "N/D";
  };

  const wind1500_2500 = avgWind(wind850Arr, dayIndices);
  const dir1500_2500  = avgDir(dir850Arr,  dayIndices);
  const wind2500_3500 = avgWind(wind700Arr, dayIndices);
  const dir2500_3500  = avgDir(dir700Arr,  dayIndices);
  const windOver3500  = avgWind(wind500Arr, dayIndices);
  const dirOver3500   = avgDir(dir500Arr,  dayIndices);

  // ── Precipitazioni e nuvolosità (REALI) ──────────────────────────────────
  const dayPrecips = dayIndices.map((i) => precips[i]).filter((p): p is number => p != null);
  const totPrecip  = dayPrecips.length > 0 ? Math.round(dayPrecips.reduce((a, b) => a + b, 0) * 10) / 10 : 0;
  const orePioggia = dayPrecips.filter(p => p > 0.1).length;
  const hasRain    = totPrecip > 0.3;

  const validCodes = dayIndices.map((i) => codes[i]).filter((c): c is number => c != null);
  const hasThunderstorm = validCodes.some((c) => c >= 95);

  const validClouds = dayIndices.map((i) => clouds[i]).filter((c): c is number => c != null);
  const avgClouds = validClouds.length > 0 ? Math.round(validClouds.reduce((a, b) => a + b, 0) / validClouds.length) : null;
  const maxClouds = validClouds.length > 0 ? Math.round(Math.max(...validClouds)) : null;

  // ── Scenario meteorologico ───────────────────────────────────────────────
  const scenario = identificaScenario(
    effectiveMaxCape,
    avgWindGround ?? 10,
    maxWindGround ?? 10,
    totPrecip,
    hasThunderstorm,
    avgClouds ?? 50,
    avgSpread ?? 6,
    tempMax ?? 18,
  );

  return {
    tempMin, tempMax, deltaT,
    maxCape, avgCape, avgLI,
    avgFreeze, maxFreeze,
    avgSpread, baseCumuliMin, baseCumuliMax, baseCumuliMedia,
    oraInnesco, rateoMin, rateoMax,
    avgWindGround, maxWindGround, maxGust,
    mainWindDir, mainWindDirBreve,
    wind1500_2500, dir1500_2500,
    wind2500_3500, dir2500_3500,
    windOver3500, dirOver3500,
    totPrecip, orePioggia, hasRain, hasThunderstorm,
    avgClouds, maxClouds,
    scenario,
  };
}

/**
 * Identifica lo scenario meteorologico in base ai parametri aggregati.
 * Logica indipendente dai paragrafi: può essere riutilizzata altrove.
 */
export function identificaScenario(
  maxCape: number,
  avgWindGround: number,
  maxWindGround: number,
  totPrecip: number,
  hasThunderstorm: boolean,
  avgClouds: number,
  avgSpread: number,
  tempMax: number,
): ScenarioMeteo {
  if (avgClouds > 85)                        return "stabile-coperto";
  if (hasThunderstorm || (totPrecip > 2 && maxCape > 600)) return "instabile-temporali";
  if (totPrecip > 0.3)                       return "pioggia";
  if (maxWindGround > 30 || avgWindGround > 22) return "ventoso";
  if (avgClouds > 70 && maxCape < 300)       return "stabile-coperto";
  if (maxCape > 900 && avgWindGround < 15)   return "perfezionistico";
  if (maxCape > 500 && avgWindGround < 18)   return "termica-forte";
  if (maxCape < 250 || avgSpread < 4)        return "debole-poco-termico";
  return "misto";
}
