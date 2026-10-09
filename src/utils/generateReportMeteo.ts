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
  const pbl = get("boundary_layer_height");
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
  const avgPbl = mean(select(pbl).filter((v) => v != null && v > 0));
  const maxPbl = select(pbl).filter((v): v is number => v != null && Number.isFinite(v))
    .reduce<number | null>((m, v) => m == null ? v : Math.max(m, v), null);

  // Gradiente ambientale calcolato solo tra livelli verticali effettivamente restituiti dal modello.
  // Un valore negativo indica inversione (temperatura crescente con la quota); non è da solo
  // una diagnosi completa di instabilità del pacchetto d'aria.
  const profileLapses: number[] = [];
  const profileInversions: Array<{ low: number; high: number }> = [];
  hours.filter(({ hour }) => hour >= 10 && hour <= 16).forEach(({ i }) => {
    const levels: Array<{ z: number; t: number }> = [];
    const add = (z: unknown, temp: unknown) => {
      if (z == null || temp == null) return;
      const zz = Number(z), tt = Number(temp);
      if (Number.isFinite(zz) && Number.isFinite(tt) && zz > altitude + 30) levels.push({ z: zz, t: tt });
    };
    add(altitude + 2, temps[i]);
    add(altitude + 80, hourlyData?.temperature_80m?.[i]);
    add(altitude + 120, hourlyData?.temperature_120m?.[i]);
    add(altitude + 180, hourlyData?.temperature_180m?.[i]);
    [925, 850, 800, 750, 700, 650, 600, 550, 500].forEach((hpa) =>
      add(hourlyData?.[`geopotential_height_${hpa}hPa`]?.[i], hourlyData?.[`temperature_${hpa}hPa`]?.[i])
    );
    levels.sort((a, b) => a.z - b.z);
    for (let j = 0; j < levels.length - 1; j++) {
      const lower = levels[j], upper = levels[j + 1];
      const dz = upper.z - lower.z;
      if (dz < 50) continue;
      const lapse = (lower.t - upper.t) / dz * 100;
      if (Number.isFinite(lapse)) {
        profileLapses.push(lapse);
        if (lapse < -0.05) profileInversions.push({ low: lower.z, high: upper.z });
      }
    }
  });
  const lapseMin = profileLapses.length ? Math.min(...profileLapses) : null;
  const lapseMax = profileLapses.length ? Math.max(...profileLapses) : null;
  const inversionBottom = profileInversions.length ? Math.min(...profileInversions.map((v) => v.low)) : null;
  const inversionTop = profileInversions.length ? Math.max(...profileInversions.map((v) => v.high)) : null;

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
  const topText = topMin != null && topMax != null ? `${fmt(topMin)}–${fmt(topMax)} m s.l.m. (proxy del top dello strato limite modellato, non quota garantita delle termiche)` : "N/D: il modello non fornisce un top dello strato limite utilizzabile";
  const pblText = avgPbl != null ? `spessore medio dello strato limite ${fmt(avgPbl)} m AGL (massimo ${fmt(maxPbl)} m AGL)` : "spessore dello strato limite N/D";
  const lapseText = lapseMin != null && lapseMax != null
    ? `gradiente ambientale tra livelli disponibili ${fmt(lapseMin, 2)}–${fmt(lapseMax, 2)} °C/100 m`
    : "gradiente verticale N/D: mancano livelli termici validi";
  const inversionText = inversionBottom != null && inversionTop != null
    ? `sono presenti segmenti con inversione modellata tra circa ${fmt(inversionBottom)} e ${fmt(inversionTop)} m s.l.m.; questi strati possono limitare il rimescolamento`
    : "non è stata rilevata un'inversione nei segmenti verticali disponibili; i dati mancanti non escludono strati stabili";
  const activityText = peakActivity != null ? `indice empirico mostrato nel grafico fino a ${fmt(peakActivity, 1)} m/s (non misurato)${peakHour != null ? ` (massimo intorno alle ${String(peakHour).padStart(2, "0")}:00)` : ""}` : "indice di attività N/D";
  const capeText = maxCape != null ? `CAPE massimo ${fmt(maxCape)} J/kg` : "CAPE N/D";
  const liText = avgLi != null ? `Lifted Index medio ${fmt(avgLi, 1)} K` : "Lifted Index N/D";
  const cinText = minCin != null ? `CIN minimo ${fmt(minCin)} J/kg` : "CIN N/D";

  const paragrafoTermico =
    `IN PAROLE SEMPLICI — Temperatura prevista durante la giornata: ${tempText}. La base delle nubi è stimata a ${baseText}: è una stima del livello in cui l'aria che sale potrebbe iniziare a condensare, non una garanzia che si formino nubi. Il limite superiore mostrato è ${topText}. ${pblText}. Questo strato è la zona più bassa dell'atmosfera che può rimescolarsi con il riscaldamento del terreno. ${activityText}. I valori di ascendenza in m/s sono stime indicative, non misure e non garantiscono una termica sfruttabile. ${capeText}; ${liText}; ${cinText}. CAPE descrive quanta energia potrebbe alimentare una salita dell'aria; CIN indica quanto è difficile avviarla; il Lifted Index è un altro indizio sulla tendenza a salire. Nessuno di questi numeri, preso da solo, dice se si volerà bene o se ci saranno temporali.`;

  const paragrafoVento =
    `VENTO — Al decollo il modello prevede in media ${fmt(avgWind)} km/h da ${degToCardinal(avgDir)}, con un massimo orario di ${fmt(maxWind)} km/h e raffiche fino a ${fmt(maxGust)} km/h. “Da N”, per esempio, significa che il vento arriva da nord. Nel grafico, ogni colonna indica un'ora e ogni riga un livello dell'atmosfera: le frecce mostrano la direzione e le etichette la velocità. ${levelText("Circa 1.500 m (850 hPa)", w850)}; ${levelText("circa 3.000 m (700 hPa)", w700)}; ${levelText("circa 5.500 m (500 hPa)", w500)}. Le quote dei livelli hPa sono approssimative e cambiano con la pressione atmosferica. Un vento forte in quota non equivale automaticamente a turbolenza al decollo, ma può indicare un flusso diverso da quello vicino al terreno: controllare sempre manica, raffiche e condizioni locali.`;

  const validRain = p.filter((v): v is number => v != null);
  const rainText = totalRain != null ? `precipitazione cumulata nelle ore visualizzate ${fmt(totalRain, 1)} mm` : "precipitazione N/D";
  const cloudText = avgCloud != null ? `copertura nuvolosa media ${fmt(avgCloud)}% (massimo ${fmt(maxCloud)}%)` : "copertura nuvolosa N/D";
  const freezeText = avgFreeze != null ? `zero termico medio modellato ${fmt(avgFreeze)} m s.l.m.` : "zero termico N/D";
  const thunderCode = wc.some((v) => v != null && v >= 95);
  const paragrafoInstabilita =
    `INSTABILITÀ, NUBI E PIOGGIA — ${lapseText}. In pratica, il gradiente indica quanto velocemente cambia la temperatura salendo: più è elevato, più l'ambiente può favorire la salita dell'aria, ma l'umidità e la stabilità degli strati vicini contano altrettanto. ${inversionText}. ${rainText}; ${cloudText}; ${freezeText}. Nel grafico, la retinatura bianca segnala le ore in cui il modello prevede precipitazioni; non rappresenta l'altezza della pioggia dentro la colonna d'aria. ${thunderCode ? "È presente almeno un codice meteo compatibile con temporali: controllare aggiornamenti e radar." : "Non compare un codice temporalesco nelle ore selezionate, ma questo non esclude rovesci o sviluppi locali."} ${maxCape != null && maxCape >= 1000 ? "Il CAPE suggerisce potenziale per moti convettivi, non conferma che nascerà un temporale." : "CAPE e CIN vanno interpretati insieme a nubi, pioggia e profilo verticale."} I colori sono una stima del gradiente termico ambientale fra livelli del modello: non misurano direttamente turbolenza o forza delle termiche.`;

  const paragrafoStrategia =
    `COME LEGGERE IL GRAFICO — 1) Guarda l'asse in basso: sono le ore. 2) Guarda l'asse verticale: sono le quote in metri sul livello del mare. 3) Leggi il vento all'ora che ti interessa: la freccia indica la direzione e il numero la velocità. 4) Leggi il fondo colorato: rosso/arancione indica un gradiente termico più favorevole alla salita dell'aria; blu/viola indica uno strato più stabile che può frenare il rimescolamento; il grigio significa che mancano dati validi. 5) La retinatura bianca segnala precipitazione prevista in quell'ora: controlla anche quantità e andamento. 6) Le curve e i simboli di quota sono stime del modello, non misure dirette. Le fasce colorate non dicono da sole se il volo è sicuro: verifica vento reale, manica, raffiche, nubi, visibilità e aggiornamenti meteo prima di ogni decisione. Il bollettino è un aiuto alla lettura, non un'autorizzazione al volo.`;

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
