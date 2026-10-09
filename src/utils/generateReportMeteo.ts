"use client";

import type { HourlyDerivedData } from "@/services/derivedMeteorology";

function degToCardinal(deg: number | null): string {
  if (deg == null || !Number.isFinite(deg)) return "N/D";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null || !Number.isFinite(n)) return "N/D";
  return decimals > 0 ? n.toFixed(decimals).replace(".", ",") : Math.round(n).toString();
}

function mean(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => v != null && Number.isFinite(v));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

function meanDirection(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (!valid.length) return null;
  const radians = valid.map((v) => v * Math.PI / 180);
  const x = radians.reduce((sum, v) => sum + Math.sin(v), 0);
  const y = radians.reduce((sum, v) => sum + Math.cos(v), 0);
  return (Math.round((Math.atan2(x, y) * 180 / Math.PI + 360) % 360) + 360) % 360;
}

interface ReportMeteoParams {
  siteName: string;
  altitude: number;
  dateObj: Date;
  hourlyData: any;
  /** Stessi dati derivati usati dal windgram, indicizzati per ora locale. */
  derivedByHour?: Map<number, HourlyDerivedData | null>;
}

export interface GeneratedReport {
  titolo: string;
  paragrafoTermico: string;
  paragrafoVento: string;
  paragrafoInstabilita: string;
  paragrafoStrategia: string;
  segnaliPericolo: string;
  giudizioFinale: string;
  /** Indice di copertura dei dati, NON un voto alla giornata di volo. */
  score: number;
  testoCompleto: string;
}

export function generateReportMeteo({
  siteName,
  altitude,
  dateObj,
  hourlyData,
  derivedByHour,
}: ReportMeteoParams): GeneratedReport | null {
  const times: string[] = hourlyData?.time ?? [];
  if (!times.length) return null;

  const get = (key: string): Array<number | null> => hourlyData?.[key] ?? [];
  const temps = get("temperature_2m");
  const dew = get("dew_point_2m");
  const winds = get("wind_speed_10m");
  const dirs = get("wind_direction_10m");
  const gusts = get("wind_gusts_10m");
  const precip = get("precipitation");
  const clouds = get("cloud_cover");
  const cape = get("cape");
  const li = get("lifted_index");
  const cin = get("convective_inhibition");
  const freezing = get("freezing_level_height");
  const codes = get("weather_code");
  const hours = times.map((t, i) => ({ i, hour: Number(t.split("T")[1]?.slice(0, 2)) }))
    .filter(({ hour }) => Number.isFinite(hour) && hour >= 8 && hour <= 19);
  if (!hours.length) return null;

  const select = (arr: Array<number | null>) => hours.map(({ i }) => arr[i] ?? null);
  const t = select(temps), td = select(dew), w = select(winds), d = select(dirs);
  const g = select(gusts), p = select(precip), cc = select(clouds), cp = select(cape);
  const lis = select(li), cins = select(cin), fr = select(freezing), wc = select(codes);
  const validTemps = t.filter((v): v is number => v != null && Number.isFinite(v));
  const tempMin = validTemps.length ? Math.min(...validTemps) : null;
  const tempMax = validTemps.length ? Math.max(...validTemps) : null;
  const avgWind = mean(w), maxWind = w.filter((v): v is number => v != null).reduce<number | null>((m, v) => m == null ? v : Math.max(m, v), null);
  const maxGust = g.filter((v): v is number => v != null).reduce<number | null>((m, v) => m == null ? v : Math.max(m, v), null);
  const avgDir = meanDirection(d);
  const totalRain = p.some((v) => v != null) ? p.reduce((sum, v) => sum + (v ?? 0), 0) : null;
  const avgCloud = mean(cc), maxCloud = cc.filter((v): v is number => v != null).reduce<number | null>((m, v) => m == null ? v : Math.max(m, v), null);
  const maxCape = cp.filter((v): v is number => v != null).reduce<number | null>((m, v) => m == null ? v : Math.max(m, v), null);
  const avgLi = mean(lis), minCin = cins.filter((v): v is number => v != null).reduce<number | null>((m, v) => m == null ? v : Math.min(m, v), null);
  const avgFreeze = mean(fr.filter((v) => v != null && v > 0));

  const derivedHours = hours.map(({ i, hour }) => {
    const h = Number(times[i].split("T")[1]?.slice(0, 2));
    return { hour: h, derived: derivedByHour?.get(h) ?? null };
  });
  const bases = derivedHours.map(({ derived }) => derived?.cloudBase ?? null).filter((v): v is number => v != null);
  const tops = derivedHours.map(({ derived }) => derived?.estimatedThermalTop ?? null).filter((v): v is number => v != null);
  const activities = derivedHours.map(({ derived }) => derived?.estimatedThermalActivity ?? null).filter((v): v is number => v != null);
  const baseMin = bases.length ? Math.min(...bases) : null, baseMax = bases.length ? Math.max(...bases) : null;
  const topMin = tops.length ? Math.min(...tops) : null, topMax = tops.length ? Math.max(...tops) : null;
  const peakActivity = activities.length ? Math.max(...activities) : null;
  const peakHour = derivedHours.reduce<{ hour: number | null; activity: number }>((best, item) => {
    const value = item.derived?.estimatedThermalActivity;
    return value != null && value > best.activity ? { hour: item.hour, activity: value } : best;
  }, { hour: null, activity: -Infinity }).hour;

  const windAtLevel = (level: string) => {
    const speeds = select(get(`wind_speed_${level}hPa`));
    const directions = select(get(`wind_direction_${level}hPa`));
    return { speed: mean(speeds), direction: meanDirection(directions) };
  };
  const w850 = windAtLevel("850"), w700 = windAtLevel("700"), w500 = windAtLevel("500");
  const levelText = (label: string, v: { speed: number | null; direction: number | null }) =>
    `${label}: ${fmt(v.speed)} km/h${v.direction != null ? ` da ${degToCardinal(v.direction)}` : ""}`;
  const tempText = tempMin != null && tempMax != null ? `${fmt(tempMin)}–${fmt(tempMax)} °C` : "N/D";
  const baseText = baseMin != null && baseMax != null ? `${fmt(baseMin)}–${fmt(baseMax)} m s.l.m.` : "N/D: T/Td o dati derivati insufficienti";
  const topText = topMin != null && topMax != null ? `${fmt(topMin)}–${fmt(topMax)} m s.l.m. (stima)` : "N/D: dati insufficienti";
  const activityText = peakActivity != null ? `indice empirico mostrato nel grafico fino a ${fmt(peakActivity, 1)} m/s (non misurato)${peakHour != null ? ` (massimo intorno alle ${String(peakHour).padStart(2, "0")}:00)` : ""}` : "indice di attività N/D";
  const capeText = maxCape != null ? `CAPE massimo ${fmt(maxCape)} J/kg` : "CAPE N/D";
  const liText = avgLi != null ? `Lifted Index medio ${fmt(avgLi, 1)} K` : "Lifted Index N/D";
  const cinText = minCin != null ? `CIN minimo ${fmt(minCin)} J/kg` : "CIN N/D";

  const paragrafoTermico =
    `Temperatura prevista ${tempText}. La base nube è una stima LCL calcolata ora per ora da temperatura e punto di rugiada: ${baseText}. La sommità termica mostrata dal grafico è una stima: usa l'altezza dello strato limite modellata (PBL) se disponibile, altrimenti una stima empirica di 400 m sopra la base nube: ${topText}. ${activityText}. ${capeText}; ${liText}; ${cinText}. CAPE e indice di attività non sono misure dirette del rateo in volo e non determinano da soli la quota massima raggiungibile.`;

  const paragrafoVento =
    `Vento previsto al suolo: media ${fmt(avgWind)} km/h da ${degToCardinal(avgDir)}, massimo orario ${fmt(maxWind)} km/h e raffica massima modellata ${fmt(maxGust)} km/h. ${levelText("850 hPa (quota approssimativa ~1.500 m s.l.m.)", w850)}; ${levelText("700 hPa (~3.000 m)", w700)}; ${levelText("500 hPa (~5.500 m)", w500)}. Le quote associate ai livelli di pressione sono approssimative; il vento in quota descrive il flusso del modello e non misura direttamente la turbolenza sul decollo. Verificare la direzione rispetto al pendio e all'esposizione locale.`;

  const validRain = p.filter((v): v is number => v != null);
  const rainText = totalRain != null ? `precipitazione cumulata nelle ore visualizzate ${fmt(totalRain, 1)} mm` : "precipitazione N/D";
  const cloudText = avgCloud != null ? `copertura nuvolosa media ${fmt(avgCloud)}% (massimo ${fmt(maxCloud)}%)` : "copertura nuvolosa N/D";
  const freezeText = avgFreeze != null ? `zero termico medio modellato ${fmt(avgFreeze)} m s.l.m.` : "zero termico N/D";
  const thunderCode = wc.some((v) => v != null && v >= 95);
  const paragrafoInstabilita =
    `Nel periodo 08–19: ${rainText}; ${cloudText}; ${freezeText}. ${thunderCode ? "Il codice meteo modellato include almeno un'ora con codice temporale: controllare evoluzione e aggiornamenti." : "Nessun codice meteo temporalesco è presente nelle ore selezionate; questo non esclude sviluppi locali."} ${maxCape != null && maxCape >= 1000 ? "Il CAPE raggiunge valori elevati, indicativi di potenziale convettivo, non di una probabilità certa di temporali." : "Il CAPE da solo non basta per valutare tutta l'instabilità: va letto insieme a CIN, profilo termico, nubi e precipitazioni."}`;

  const paragrafoStrategia =
    `Come leggere il windgram: le frecce e i numeri mostrano direzione e velocità del vento ai diversi livelli; le fasce colorate rappresentano la struttura termica stimata dal modello; la curva delle termiche compare solo quando è disponibile una stima di quota supportata dai dati. Per decidere sul decollo servono anche osservazioni locali, manica a vento, orientamento del sito e andamento reale delle raffiche. Questo bollettino descrive una previsione modellistica: non è un'autorizzazione al volo né sostituisce la valutazione del pilota.`;

  const dangers: string[] = [];
  if (thunderCode) dangers.push("codice meteo temporalesco previsto in almeno un'ora");
  if (totalRain != null && totalRain > 0.3) dangers.push(`precipitazioni modellate (${fmt(totalRain, 1)} mm nel periodo)`);
  if (maxGust != null && maxGust >= 35) dangers.push(`raffica massima modellata al suolo ${fmt(maxGust)} km/h: verificare soglie e condizioni del sito`);
  if (w500.speed != null && w500.speed >= 40) dangers.push(`vento forte a 500 hPa (${fmt(w500.speed)} km/h); valutare il flusso in quota`);
  if (maxCape != null && maxCape >= 1000) dangers.push(`potenziale convettivo elevato (CAPE ${fmt(maxCape)} J/kg), da valutare con CIN e evoluzione nuvolosa`);
  if (dangers.length === 0) dangers.push("nessun segnale automatico sopra le soglie di questo riepilogo; verificare comunque i dati locali e quelli mancanti");

  // L'indice misura solo la completezza dei dati, non la qualità o sicurezza del volo.
  const variables: Array<Array<number | null>> = [t, td, w, d, g, p, cc, cp, lis, cins, fr];
  const total = variables.reduce((n, arr) => n + arr.length, 0);
  const present = variables.reduce((n, arr) => n + arr.filter((v) => v != null && Number.isFinite(v)).length, 0);
  const score = total > 0 ? Math.max(1, Math.min(10, Math.round((present / total) * 10))) : 1;

  const weekdays = ["DOMENICA", "LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO"];
  const months = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"];
  const titolo = `REPORT WINDGRAM ${siteName.toUpperCase()} – ${weekdays[dateObj.getDay()]} ${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  const segnaliPericolo = dangers.join("; ") + ".";
  const giudizioFinale = `Copertura dei dati: ${score}/10. Questo numero descrive soltanto la presenza delle variabili previste, non la sicurezza della giornata. Quota sito: ${altitude} m s.l.m. Confrontare sempre vento, evoluzione termica, nubi e precipitazioni con osservazioni sul posto.`;
  const testoCompleto = `${titolo}

1. Termiche e stabilità: ${paragrafoTermico}

2. Vento verticale: ${paragrafoVento}

3. Nuvole e precipitazioni: ${paragrafoInstabilita}

4. Come interpretare il grafico: ${paragrafoStrategia}

Segnali da verificare: ${segnaliPericolo}

${giudizioFinale}`;

  return { titolo, paragrafoTermico, paragrafoVento, paragrafoInstabilita, paragrafoStrategia, segnaliPericolo, giudizioFinale, score, testoCompleto };
}
