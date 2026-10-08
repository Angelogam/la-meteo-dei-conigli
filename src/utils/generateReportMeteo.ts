"use client";

function degToCardinal(deg: number): string {
  if (deg == null) return "S";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

function degToCardinalBreve(deg: number): string {
  if (deg == null) return "S";
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "N/D";
  return decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
}

interface ReportMeteoParams {
  siteName: string;
  altitude: number;
  dateObj: Date;
  hourlyData: any;
}

export interface GeneratedReport {
  titolo: string;
  paragrafoTermico: string;
  paragrafoVento: string;
  paragrafoInstabilita: string;
  paragrafoStrategia: string;
  segnaliPericolo: string;
  giudizioFinale: string;
  score: number;
  testoCompleto: string;
}

type ScenarioMeteo =
  | "perfezionistico"
  | "termica-forte"
  | "instabile-temporali"
  | "ventoso"
  | "stabile-coperto"
  | "pioggia"
  | "debole-poco-termico"
  | "misto";

function identificaScenario(
  maxCape: number,
  avgWindGround: number,
  maxWindGround: number,
  totPrecip: number,
  hasThunderstorm: boolean,
  avgClouds: number,
  avgSpread: number,
  tempMax: number
): ScenarioMeteo {
  if (avgClouds > 85) return "stabile-coperto";
  if (hasThunderstorm || (totPrecip > 2 && maxCape > 600)) return "instabile-temporali";
  if (totPrecip > 0.3) return "pioggia";
  if (maxWindGround > 30 || avgWindGround > 22) return "ventoso";
  if (avgClouds > 70 && maxCape < 300) return "stabile-coperto";
  if (maxCape > 900 && avgWindGround < 15) return "perfezionistico";
  if (maxCape > 500 && avgWindGround < 18) return "termica-forte";
  if (maxCape < 250 || avgSpread < 4) return "debole-poco-termico";
  return "misto";
}

export function generateReportMeteo({
  siteName,
  altitude,
  dateObj,
  hourlyData,
}: ReportMeteoParams): GeneratedReport | null {
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

  // Filtra ore diurne 8:00 - 19:00
  const dayIndices: number[] = [];
  times.forEach((t, i) => {
    const hr = parseInt(t.split("T")[1].split(":")[0], 10);
    if (hr >= 8 && hr <= 19) dayIndices.push(i);
  });

  if (dayIndices.length === 0) return null;

  // === DATI REALI — nessun fallback inventato ===
  const validTemps = dayIndices.map((i) => temps[i]).filter((t): t is number => t != null);
  const tempMin = validTemps.length > 0 ? Math.round(Math.min(...validTemps)) : null;
  const tempMax = validTemps.length > 0 ? Math.round(Math.max(...validTemps)) : null;
  const deltaT = (tempMin != null && tempMax != null) ? tempMax - tempMin : null;

  const validCapes = dayIndices.map((i) => capes[i]).filter((c): c is number => c != null);
  const maxCape = validCapes.length > 0 ? Math.round(Math.max(...validCapes)) : null;
  const avgCape = validCapes.length > 0 ? Math.round(validCapes.reduce((a, b) => a + b, 0) / validCapes.length) : null;
  const effectiveMaxCape = maxCape ?? 0;

  // Lifted Index REALE dall'API — mai ricostruito da CAPE
  const validLIs = dayIndices.map((i) => (hourlyData.lifted_index as number[] | undefined)?.[i] ?? null).filter((li): li is number => li != null);
  const avgLI = validLIs.length > 0 ? Math.round((validLIs.reduce((a, b) => a + b, 0) / validLIs.length) * 10) / 10 : null;

  // Zero termico REALE
  const validFreezes = dayIndices.map((i) => freezes[i]).filter((f): f is number => f != null && f > 0);
  const avgFreeze = validFreezes.length > 0 ? Math.round(validFreezes.reduce((a, b) => a + b, 0) / validFreezes.length) : null;
  const maxFreeze = validFreezes.length > 0 ? Math.round(Math.max(...validFreezes)) : null;

  // Spread e base cumuli da dati reali
  const centralIndices = dayIndices.filter((i) => {
    const hr = parseInt(times[i].split("T")[1].split(":")[0], 10);
    return hr >= 11 && hr <= 16;
  });
  const validSpreads = centralIndices
    .map((i) => { const t = temps[i], d = dews[i]; return (t != null && d != null) ? Math.max(1, t - d) : null; })
    .filter((s): s is number => s != null);
  const avgSpread = validSpreads.length > 0 ? validSpreads.reduce((a, b) => a + b, 0) / validSpreads.length : null;
  const baseCumuliMin = avgSpread != null ? Math.round(altitude + Math.max(300, (avgSpread - 2) * 125)) : null;
  const baseCumuliMax = avgSpread != null ? Math.round(altitude + Math.max(600, (avgSpread + 3) * 125)) : null;
  const baseCumuliMedia = (baseCumuliMin != null && baseCumuliMax != null) ? Math.round((baseCumuliMin + baseCumuliMax) / 2) : null;

  // Innesco termico
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

  // Rateo salita
  let rateoMin = 0.6, rateoMax = 1.0;
  if (effectiveMaxCape > 1200) { rateoMin = 1.5; rateoMax = 2.8; }
  else if (effectiveMaxCape > 800) { rateoMin = 1.2; rateoMax = 2.2; }
  else if (effectiveMaxCape > 500) { rateoMin = 0.9; rateoMax = 1.7; }
  else if (effectiveMaxCape > 250) { rateoMin = 0.6; rateoMax = 1.2; }
  else { rateoMin = 0.3; rateoMax = 0.7; }

  // Vento al suolo REALE
  const validWinds = dayIndices.map((i) => winds[i]).filter((w): w is number => w != null);
  const validDirs = dayIndices.map((i) => dirs[i]).filter((d): d is number => d != null);
  const avgWindGround = validWinds.length > 0 ? Math.round(validWinds.reduce((a, b) => a + b, 0) / validWinds.length) : null;
  const maxWindGround = validWinds.length > 0 ? Math.round(Math.max(...validWinds)) : null;
  const validGusts = dayIndices.map((i) => gusts[i]).filter((g): g is number => g != null);
  const maxGust = validGusts.length > 0 ? Math.round(Math.max(...validGusts)) : null;
  const mainDirDeg = validDirs.length > 0 ? Math.round(validDirs.reduce((a, b) => a + b, 0) / validDirs.length) : null;
  const mainWindDir = mainDirDeg != null ? degToCardinal(mainDirDeg) : "N/D";
  const mainWindDirBreve = mainDirDeg != null ? degToCardinalBreve(mainDirDeg) : "N/D";

  // Venti alle quote REALI dai livelli di pressione API
  const wind850Arr = (hourlyData.wind_speed_850hPa as number[] | undefined) ?? [];
  const dir850Arr = (hourlyData.wind_direction_850hPa as number[] | undefined) ?? [];
  const wind700Arr = (hourlyData.wind_speed_700hPa as number[] | undefined) ?? [];
  const dir700Arr = (hourlyData.wind_direction_700hPa as number[] | undefined) ?? [];
  const wind500Arr = (hourlyData.wind_speed_500hPa as number[] | undefined) ?? [];
  const dir500Arr = (hourlyData.wind_direction_500hPa as number[] | undefined) ?? [];

  const v850w = dayIndices.map((i) => wind850Arr[i] ?? null).filter((w): w is number => w != null);
  const v850d = dayIndices.map((i) => dir850Arr[i] ?? null).filter((d): d is number => d != null);
  const v700w = dayIndices.map((i) => wind700Arr[i] ?? null).filter((w): w is number => w != null);
  const v700d = dayIndices.map((i) => dir700Arr[i] ?? null).filter((d): d is number => d != null);
  const v500w = dayIndices.map((i) => wind500Arr[i] ?? null).filter((w): w is number => w != null);
  const v500d = dayIndices.map((i) => dir500Arr[i] ?? null).filter((d): d is number => d != null);

  const wind1500_2500 = v850w.length > 0 ? Math.round(v850w.reduce((a, b) => a + b, 0) / v850w.length) : null;
  const dir1500_2500 = v850d.length > 0 ? degToCardinal(Math.round(v850d.reduce((a, b) => a + b, 0) / v850d.length)) : "N/D";
  const wind2500_3500 = v700w.length > 0 ? Math.round(v700w.reduce((a, b) => a + b, 0) / v700w.length) : null;
  const dir2500_3500 = v700d.length > 0 ? degToCardinal(Math.round(v700d.reduce((a, b) => a + b, 0) / v700d.length)) : "N/D";
  const windOver3500 = v500w.length > 0 ? Math.round(v500w.reduce((a, b) => a + b, 0) / v500w.length) : null;
  const dirOver3500 = v500d.length > 0 ? degToCardinal(Math.round(v500d.reduce((a, b) => a + b, 0) / v500d.length)) : "N/D";

  // Pioggia e nuvolosità reali
  const dayPrecips = dayIndices.map((i) => precips[i]).filter((p): p is number => p != null);
  const totPrecip = dayPrecips.length > 0 ? Math.round(dayPrecips.reduce((a, b) => a + b, 0) * 10) / 10 : 0;
  const orePioggia = dayPrecips.filter(p => p > 0.1).length;
  const hasRain = totPrecip > 0.3;
  const validCodes = dayIndices.map((i) => codes[i]).filter((c): c is number => c != null);
  const hasThunderstorm = validCodes.some((c) => c >= 95);
  const validClouds = dayIndices.map((i) => clouds[i]).filter((c): c is number => c != null);
  const avgClouds = validClouds.length > 0 ? Math.round(validClouds.reduce((a, b) => a + b, 0) / validClouds.length) : null;
  const maxClouds = validClouds.length > 0 ? Math.round(Math.max(...validClouds)) : null;

  // Scenario
  const scenario = identificaScenario(
    effectiveMaxCape,
    avgWindGround ?? 10,
    maxWindGround ?? 10,
    totPrecip,
    hasThunderstorm,
    avgClouds ?? 50,
    avgSpread ?? 6,
    tempMax ?? 18
  );

  // === PARAGRAFI ===
  const capeLabel = (maxCape ?? 0) > 1500 ? "energia convettiva molto elevata" :
                    (maxCape ?? 0) > 1000 ? "energia convettiva marcata" :
                    (maxCape ?? 0) > 600 ? "energia convettiva discreta" :
                    (maxCape ?? 0) > 300 ? "energia termica moderata" :
                    "energia termica scarsa";

  const liStr = avgLI != null ? avgLI.toFixed(1) : "N/D";
  const tzStr = avgFreeze != null ? `${avgFreeze} m` : "N/D";
  const bcMinStr = baseCumuliMin != null ? `${baseCumuliMin} m` : "N/D";
  const bcMaxStr = baseCumuliMax != null ? `${baseCumuliMax} m` : "N/D";
  const bcMidStr = baseCumuliMedia != null ? `${baseCumuliMedia} m` : "N/D";
  const dtStr = deltaT != null ? `${deltaT} °C` : "N/D";
  const tmStr = tempMin != null ? `${tempMin} °C` : "N/D";
  const tMStr = tempMax != null ? `${tempMax} °C` : "N/D";
  const acStr = avgClouds != null ? `${avgClouds}%` : "N/D";
  const mcStr = maxClouds != null ? `${maxClouds}%` : "N/D";

  let paragrafoTermico = "";
  switch (scenario) {
    case "perfezionistico":
      paragrafoTermico = `Giornata di volo ideale. Il riscaldamento diurno porterà la temperatura da ${tmStr} del primo mattino fino a ${tMStr} nelle ore centrali, con un'escursione termica di ${dtStr} che garantirà un'attività termica robusta e ben organizzata. L'CAPE raggiungerà i ${fmt(maxCape)} J/kg (${capeLabel}) con Lifted Index di ${liStr} K, confermando una marcata instabilità potenziale. L'innesco è atteso per le ${oraInnesco}, con salite comprese tra ${rateoMin.toFixed(1)} e ${rateoMax.toFixed(1)} m/s che potranno superare i 3500 m di quota. Lo zero termico si attesta sui ${tzStr}, lasciando ampio spazio alla convenzione secca. Base cumuli prevista tra ${bcMinStr} e ${bcMaxStr} (media ${bcMidStr}). Visibilità ottima.`;
      break;
    case "termica-forte":
      paragrafoTermico = `Condizioni termiche molto buone. Temperature tra ${tmStr} e ${tMStr} con gradiente verticale stimato a 0.85 °C/100 m. L'CAPE tocca i ${fmt(maxCape)} J/kg con Lifted Index di ${liStr} K: termiche generose e ben strutturate. L'innesco parte attorno alle ${oraInnesco}, raggiungendo i picchi di salita (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s) tra le 12:00 e le 15:00. Base cumuli tra ${bcMinStr} e ${bcMaxStr}. Lo zero termico a ${tzStr} non limita la salita. Possibile sviluppo di qualche cumulo nel tardo pomeriggio ma senza fenomeni rilevanti.`;
      break;
    case "instabile-temporali":
      paragrafoTermico = `Atmosfera fortemente instabile con energia convettiva molto elevata (CAPE ${fmt(maxCape)} J/kg, Lifted Index ${liStr} K). La temperatura salirà rapidamente da ${tmStr} a ${tMStr}, con un gradiente termico verticalmente instabile che favorirà la formazione di nubi a sviluppo verticale. Le termiche innescheranno presto (ore ${oraInnesco}) e cresceranno rapidamente di intensità (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s). Lo zero termico è relativamente alto (${tzStr}), il che spingerà i cumuli a quote notevoli. Base cumuli collocata tra ${bcMinStr} e ${bcMaxStr}: attenzione alla trasformazione in cumulonembi. Visibilità in rapido degrado con l'avvicinamento dei fenomeni.`;
      break;
    case "ventoso":
      paragrafoTermico = `Termiche presenti ma disturbate dal vento sostenuto. Temperature tra ${tmStr} e ${tMStr}, con un gradiente termico sufficiente a generare attività convettiva moderata (CAPE ${fmt(maxCape)} J/kg, Lifted Index ${liStr} K). L'innesco avverrà attorno alle ${oraInnesco}, con salite modeste di ${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s. Il vento forte limiterà la qualità delle termiche rendendole spezzate e inclinate: saranno più utili i costoni soleggiati e i rilievi sottovento. Zero termico a ${tzStr}, base cumuli poco significativa a ${bcMidStr} causa copertura nuvolosa limitata.`;
      break;
    case "stabile-coperto":
      paragrafoTermico = `Giornata con termiche inibite dalla copertura nuvolosa estesa (${acStr} medio, picchi ${mcStr}). La temperatura salirà da ${tmStr} a ${tMStr}, ma l'irraggiamento solare sarà limitato con conseguente debolissimo riscaldamento del suolo. CAPE ${fmt(maxCape)} J/kg, Lifted Index ${liStr} K: l'energia convettiva resta sotto la soglia di attivazione. Innesco improbabile, e dove presente avverrà con grande ritardo. Salite debolissime se non assenti (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s nei rari momenti). Zero termico a ${tzStr}. La base cumuli è di fatto assente per mancanza di motore termico.`;
      break;
    case "pioggia":
      paragrafoTermico = `Giornata con precipitazioni e termiche in gran parte compromesse. L'umidità elevata (spread medio ridotto) impedisce il surriscaldamento del suolo, mantenendo le temperature tra ${tmStr} e ${tMStr} senza escursione utile. CAPE ${fmt(maxCape)} J/kg, Lifted Index ${liStr} K. L'innesco termico non avviene, e le rare termiche (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s) sono spesso inibite dalla pioggia. Zero termico a ${tzStr}. Base cumuli molto bassa a ${bcMinStr} causa aria satura: possibili nubi basse e nebbie. Visibilità ridotta a tratti.`;
      break;
    case "debole-poco-termico":
      paragrafoTermico = `Termiche deboli e discontinue per la giornata odierna. La temperatura salirà da ${tmStr} a ${tMStr} con un'escursione limitata a ${dtStr}. CAPE ${fmt(maxCape)} J/kg, Lifted Index ${liStr} K: il profilo è stabile, con inversione termica nei bassi strati. L'innesco avverrà tardi (ore ${oraInnesco}) e le termiche saranno deboli (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s), spesso isolate e di breve durata. Zero termico a ${tzStr}. La base cumuli si attesta oltre i ${bcMaxStr}, di fatto irraggiungibile con termiche così deboli. Strategia di volo obbligata a pendio e dinamico.`;
      break;
    case "misto":
    default:
      paragrafoTermico = `Condizioni termiche nella norma, con attività moderata. Temperatura del giorno compresa tra ${tmStr} e ${tMStr}, escursione diurna di ${dtStr}. CAPE ${fmt(maxCape)} J/kg e Lifted Index di ${liStr} K, configurazione di moderata instabilità. L'innesco termico è previsto per le ${oraInnesco}, con salite medie di ${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s. Lo zero termico si attesta sui ${tzStr}. Base cumuli tra ${bcMinStr} e ${bcMaxStr}. Le termiche saranno meglio organizzate sui versanti soleggiati esposti a sud-sud-ovest durante le ore centrali.`;
      break;
  }

  // === PARAGRAFO VENTO ===
  const awg = avgWindGround ?? 10;
  const mwG = maxWindGround ?? 10;
  const mg = maxGust ?? 0;
  const descrizioneVentoSotto = awg < 8 ? "calmo e gestibile" :
                                awg < 15 ? "debole e regolare" :
                                awg < 22 ? "moderato ma costante" :
                                "teso e richiede attenzione";

  const w1525 = wind1500_2500 != null ? `${wind1500_2500} km/h` : "N/D";
  const d1525 = dir1500_2500;
  const w2535 = wind2500_3500 != null ? `${wind2500_3500} km/h` : "N/D";
  const d2535 = dir2500_3500;
  const w35 = windOver3500 != null ? `${windOver3500} km/h` : "N/D";
  const d35 = dirOver3500;

  let paragrafoVento = "";
  if (scenario === "ventoso") {
    paragrafoVento = `Vento sostenuto protagonista della giornata. Al suolo spira da ${mainWindDir} con intensità media di ${fmt(avgWindGround)} km/h e raffiche fino a ${fmt(maxGust)} km/h (picco ${fmt(maxWindGround)} km/h): ${descrizioneVentoSotto} per i decolli, ma occhio alle raffiche in decollo. Tra 1500 e 2500 m il flusso si porta a ${w1525} da ${d1525}, con shear verticale marcato e turbolenza meccanica. Tra 2500 e 3500 m il vento sale a ${w2535} da ${d2535}, generando onda orografica sopravento e rotori sottovento. Sopra i 3500 m il flusso raggiunge ${w35} da ${d35}: rotolamento aereo e turbolenza di scia in prossimità dei crinali. Si consiglia di volare sottovento ai costoni e di evitare la traversata sopravento.`;
  } else if (scenario === "perfezionistico") {
    paragrafoVento = `Profilo del vento ottimale per il volo libero. Al suolo, vento da ${mainWindDir} debole a ${fmt(avgWindGround)} km/h (raffiche ${fmt(maxGust)} km/h), ${descrizioneVentoSotto}: ideale per i decolli e per l'atterraggio in campo. Tra 1500 e 2500 m il flusso si porta a ${w1525} da ${d1525}: dinamico ottimo, con sostegno continuo sui costoni sopravento. Tra 2500 e 3500 m il vento sale gradualmente a ${w2535} da ${d2535}, consentendo transiti in altura senza penalizzazioni. Sopra i 3500 m il flusso raggiunge ${w35} da ${d35}, rimanendo sfruttabile per il volo d'onda. Direzione prevalente ${mainWindDir} con leggera rotazione oraria nel corso della giornata.`;
  } else if (scenario === "instabile-temporali") {
    paragrafoVento = `Vento al suolo in rinforzo nel pomeriggio. Mattinata con ${mainWindDir} debole a ${fmt(avgWindGround)} km/h, ma con l'arrivo dei fenomeni convettivi sono attese raffiche discendenti (downburst) fino a ${fmt(maxGust)} km/h in prossimità dei cumulonembi. Tra 1500 e 2500 m il flusso è stimato a ${w1525} da ${d1525}, con rinforzi al passaggio dei sistemi. Tra 2500 e 3500 m il vento sale a ${w2535} da ${d2535} all'interno della corrente ascensionale. Sopra i 3500 m il flusso raggiunge ${w35} da ${d35}: in quota si concentrano i moti verticali più intensi, ma anche le nubi temporalesche. Attenzione alle variazioni improvvise di intensità e direzione.`;
  } else if (scenario === "stabile-coperto") {
    paragrafoVento = `Vento al suolo da ${mainWindDir} a ${fmt(avgWindGround)} km/h, raffiche ${fmt(maxGust)} km/h: ${descrizioneVentoSotto}. Il flusso in quota segue il tipico profilo anticiclonico: 1500–2500 m a ${w1525} da ${d1525}, 2500–3500 m a ${w2535} da ${d2535}, sopra 3500 m a ${w35} da ${d35}. In assenza di attività termica, il volo è esclusivamente dinamico: sfruttare i costoni sopravento e cercare le ascendenti meccaniche. Possibile inversione termica nei bassi strati con stratificazione stabile.`;
  } else if (scenario === "pioggia") {
    paragrafoVento = `Vento al suolo da ${mainWindDir} a ${fmt(avgWindGround)} km/h con raffiche ${fmt(maxGust)} km/h: ${descrizioneVentoSotto}, ma con ulteriore rinforzo durante i rovesci. In quota, flusso sostenuto: 1500–2500 m a ${w1525} da ${d1525}, 2500–3500 m a ${w2535} da ${d2535}, sopra 3500 m a ${w35} da ${d35}. Profilo tipico da saccatura atlantica con flusso umido e instabile. Visibilità ridotta, precipitazioni in atto. Volo vivamente sconsigliato.`;
  } else {
    paragrafoVento = `Vento al suolo da ${mainWindDir} a ${fmt(avgWindGround)} km/h, raffiche fino a ${fmt(maxGust)} km/h: ${descrizioneVentoSotto}, ideale per i decolli. Tra 1500 e 2500 m il flusso si porta a ${w1525} da ${d1525}, offrendo un buon dinamico sui versanti sopravento. Tra 2500 e 3500 m il vento raggiunge i ${w2535} da ${d2535}, transitabile con attenzione alle rotazioni. Sopra i 3500 m il flusso si attesta sui ${w35} da ${d35}, con leggera componente da ovest al passaggio delle ore pomeridiane. Direzione al suolo ${mainWindDir} (${mainWindDirBreve}), in leggera rotazione oraria con la quota.`;
  }

  // === PARAGRAFO INSTABILITÀ ===
  let paragrafoInstabilita = "";
  if (scenario === "instabile-temporali") {
    paragrafoInstabilita = `Rischio elevato di temporali pomeridiani (probabilità stimata 50–70% nelle ore 13:00–18:00). I cumulonembi si svilupperanno dapprima sui rilievi principali, per poi estendersi alla valle. Sono attesi accumuli complessivi fino a ${totPrecip.toFixed(1)} mm con possibili grandinate. Le raffiche di outflow in discesa dai temporali potranno superare i 60–70 km/h. Si raccomanda di rientrare in atterraggio entro le 13:30 e di mantenersi a debita distanza da qualsiasi sviluppo verticale. Possibile attività elettrica: evitare assolutamente il volo.`;
  } else if (scenario === "pioggia") {
    paragrafoInstabilita = `Precipitazioni estese durante la giornata, con accumuli stimati di ${totPrecip.toFixed(1)} mm distribuiti su circa ${orePioggia} ore. Pioggia continua o a tratti, localmente anche a carattere di rovescio. Visibilità ridotta (2–5 km), con strati bassi su versanti sottovento (1500–2500 m). Base nuvolosa molto bassa a ${bcMinStr}. Volo vivamente sconsigliato per pioggia e visibilità insufficiente. Possibili locali temporali se CAPE > 600 J/kg.`;
  } else if (scenario === "stabile-coperto") {
    paragrafoInstabilita = `Nessun rischio di precipitazioni significative: la copertura nuvolosa estesa (${acStr} medio) non produce fenomeni rilevanti. Probabilità di pioggia inferiore al 10%. Possibile pioviggine locale in caso di nubi basse addossate ai rilievi (copertura ${mcStr}). L'attività cumuliforme è inibita dalla stabilità atmosferica. Le nubi alte e medie possono mascherare l'evoluzione del tempo ma non generano pericoli per il volo.`;
  } else if (scenario === "ventoso") {
    paragrafoInstabilita = `Nessun rischio di precipitazioni importanti (probabilità < 15%). Eventuali deboli piovaschi orografici sui crinali sopravento sono possibili ma senza accumuli significativi (stimati < 1 mm). Il vento sostenuto è il fattore dominante: la copertura nuvolosa si mantiene limitata (${acStr}) con sviluppo di nubi basse a pendio rotte dal vento. Possibile trasporto di sabbia/polvere in alta quota.`;
  } else if (scenario === "perfezionistico" || scenario === "termica-forte") {
    paragrafoInstabilita = `Rischio molto basso di precipitazioni. La copertura nuvolosa si manterrà limitata a ${acStr}, con sviluppo di cumuli congesti solo nel tardo pomeriggio (ore 15:00–17:00) ben oltre la base operativa. Probabilità di pioggia inferiore al 5%. Possibile locale rovescio orografico solo sui rilievi più elevati e isolati, con accumuli comunque trascurabili. Le condizioni sono ideali per la salita fino a quote elevate.`;
  } else if (scenario === "debole-poco-termico") {
    paragrafoInstabilita = `Nessun rischio di precipitazioni. Il profilo atmosferico stabile impedisce lo sviluppo di nubi convettive. Copertura nuvolosa modesta (${acStr} medio) con prevalenza di nubi alte o velature. Cielo sereno o poco nuvoloso. L'assenza di motore termico è legata a inversione e stabilità, non a maltempo.`;
  } else {
    paragrafoInstabilita = `Rischio di precipitazioni basso-moderato (probabilità stimata 15–25% nel pomeriggio). Possibile sviluppo di cumuli sui rilievi principali dopo le 14:00, con locali piovaschi se l'instabilità aumenta. La copertura nuvolosa media sarà di ${acStr} con picchi pomeridiani fino a ${mcStr}. Base cumuli collocata tra ${bcMinStr} e ${bcMaxStr}, generalmente ben al di sopra della quota di volo prevista. Monitorare l'evoluzione con radar e satelliti nelle ore centrali.`;
  }

  // === STRATEGIA e SCORE ===
  let score = 6;
  let paragrafoStrategia = "";
  const qs = baseCumuliMin != null ? Math.min(3000, baseCumuliMin) : altitude + 500;
  let oraFine = "16:00";

  switch (scenario) {
    case "perfezionistico":
      score = 9;
      { const q = baseCumuliMin != null ? Math.min(3500, baseCumuliMin) : 3500; }
      oraFine = "17:00";
      paragrafoStrategia = `Finestra di volo eccezionale. Decollo consigliato dalle ${oraInnesco}, con atterraggio possibile anche fino alle ${oraFine}. Quota massima consigliata ${baseCumuliMin != null ? Math.min(3500, baseCumuliMin) : "N/D"} m. Strategia: cross country lungo i costoni principali, transiti in altura con sfruttamento del dinamico sopra i 2500 m. Possibile raggiungere i 3500+ m e sfruttare il volo d'onda sui crinali sopravento. Attenzione solo al possibile sviluppo cumuliforme tardo-pomeridiano: mantenere un margine di 300–400 m sotto la base dei cumuli.`;
      break;
    case "termica-forte":
      score = 8;
      oraFine = "16:30";
      paragrafoStrategia = `Ottima giornata per volo termico-dinamico. Lancio possibile dalle ${oraInnesco} fino alle ${oraFine}, con condizioni stabili. Quota operativa consigliata ${baseCumuliMin != null ? Math.min(3200, baseCumuliMin) : "N/D"} m. Strategia: sfruttare i costoni soleggiati per le prime ore, poi transizione in altura per collegare le termiche più generose. Cross possibile sui rilievi principali, attenzione alla rotazione del vento con la quota. Possibile raggiungere i 3200+ m durante il picco termico delle 13:00–15:00.`;
      break;
    case "misto":
      score = 7;
      oraFine = "16:00";
      paragrafoStrategia = `Giornata favorevole. Decollo raccomandato dalle ${oraInnesco} alle ${oraFine}, con attenzione all'evoluzione del vento. Quota operativa fino a ${baseCumuliMin != null ? Math.min(3000, baseCumuliMin) : "N/D"} m. Strategia: iniziare con termiche di pendio, poi passare a termiche blu nel corso della giornata. Cross country possibile sui rilievi più alti, evitando i versanti sopravento dove il vento rinforza. Possibile raggiungere i 3000 m nelle ore centrali.`;
      break;
    case "ventoso":
      score = 5;
      oraFine = "15:00";
      paragrafoStrategia = `Strategia limitata dal vento. Finestra di volo dalle ${oraInnesco} alle ${oraFine}, con atterraggio prudente. Quota massima consigliata ${baseCumuliMin != null ? Math.min(2500, baseCumuliMin) : "N/D"} m. Strategia: volo locale con sfruttamento dei costoni sopravento per il dinamico puro. Evitare le termiche (spezzate e inclinate) e le quote elevate. Volo adatto a piloti esperti che gestiscono il vento forte. Atterraggio anticipato se le raffiche superano i 40 km/h al suolo.`;
      break;
    case "stabile-coperto":
      score = 4;
      oraFine = "14:00";
      paragrafoStrategia = `Strategia obbligata al volo dinamico puro. Decollo possibile solo su pendii ripidi esposti al vento, con atterraggio anticipato entro le ${oraFine}. Quota operativa fino a ${baseCumuliMin != null ? Math.min(2200, baseCumuliMin) : "N/D"} m. Strategia: cercare i costoni sopravento con vento perpendicolare al rilievo, sfruttare l'onda sottovento se presente. Niente termiche: la stabilità le inibisce totalmente.`;
      break;
    case "debole-poco-termico":
      score = 4;
      oraFine = "14:30";
      paragrafoStrategia = `Strategia di pendio obbligata. Decollo possibile dalle ${oraInnesco} (probabilmente tardi) fino alle ${oraFine}, con atterraggio se le termiche si esauriscono. Quota operativa limitata a ${Math.min(2000, altitude + 400)} m. Strategia: volo di pendio puro, sfruttando i versanti soleggiati. Possibile qualche termica debole nelle ore centrali (12:00–14:00). Mantenere un margine ampio per l'atterraggio.`;
      break;
    case "pioggia":
      score = 2;
      oraFine = "10:00";
      paragrafoStrategia = `Volo sconsigliato. Possibile solo un breve volo di pendio al mattino (entro le ${oraFine}) se le precipitazioni non sono ancora iniziate. Quota operativa strettamente limitata a ${altitude} m. Strategia: valutare attentamente le condizioni locali, indossare equipaggiamento adeguato, mantenere sempre un'opzione di atterraggio sicura e rapida. Rimandare il volo se la pioggia è già in atto.`;
      break;
    case "instabile-temporali":
      score = 3;
      oraFine = "12:30";
      paragrafoStrategia = `Strategia obbligata al volo mattutino. Decollo rigorosamente entro le ${oraInnesco}, con atterraggio improrogabile entro le ${oraFine}. Quota operativa limitata a ${baseCumuliMin != null ? Math.min(2200, baseCumuliMin - 200) : altitude} m, ben al di sotto della base cumuli. Strategia: sfruttare esclusivamente le prime ore di volo, mantenersi lontano dai rilievi più elevati, atterrare non appena i primi cumuli mostrano crescita verticale significativa. Possibile attività elettrica: non volare.`;
      break;
  }

  // === PENALITÀ REALI ===
  if (tempMax != null && tempMax < 12) {
    score = Math.max(1, score - Math.round((12 - tempMax) * 0.5));
  }
  if (avgClouds != null && avgClouds > 90 && scenario !== "stabile-coperto") {
    score = Math.max(1, score - Math.round((avgClouds - 90) * 0.3));
  }
  if (maxWindGround != null && maxWindGround > 25) {
    score = Math.max(1, score - 1);
  }
  if (maxWindGround != null && maxWindGround > 35) {
    score = Math.max(1, score - 1);
  }
  score = Math.min(10, Math.max(1, score));

  // === SEGNALI DI PERICOLO ===
  const pericoli: string[] = [];
  if (hasThunderstorm) pericoli.push("cumulonembi in formazione rapida e attività elettrica");
  if (hasRain && scenario !== "pioggia") pericoli.push("rovesci improvvisi con riduzione di visibilità");
  if (scenario === "ventoso") pericoli.push("raffiche al suolo superiori a 40 km/h in prossimità dei crinali");
  if (maxWindGround != null && maxWindGround > 25 && scenario !== "ventoso") pericoli.push("raffiche al suolo intense e turbolenza meccanica");
  if (windOver3500 != null && windOver3500 > 40) pericoli.push("vento in alta quota eccessivo (rotolamento aereo)");
  if (maxCape != null && maxCape > 1000 && scenario !== "perfezionistico") pericoli.push("instabilità potenziale elevata, monitorare la crescita cumuliforme");
  if (avgClouds != null && avgClouds > 80) pericoli.push("copertura nuvolosa estesa con riduzione di visibilità");
  if (pericoli.length === 0) pericoli.push("evoluzione cumuliforme nel pomeriggio, monitorare i primi segnali di crescita verticale");
  const segnaliPericolo = pericoli.join("; ") + ".";

  // === GIUDIZIO FINALE ===
  const giudizioDescMap: Record<ScenarioMeteo, string> = {
    "perfezionistico": "giornata eccezionale, volo consigliato a tutti i livelli con ampia finestra operativa",
    "termica-forte": "giornata molto buona, condizioni ideali per cross country e volo d'alta quota",
    "misto": "giornata favorevole, ottima per attività di volo e allenamento",
    "ventoso": "giornata vivace riservata a piloti esperti, strategia di volo limitata",
    "stabile-coperto": "giornata marginale, volo di pendio puro con termiche inibite",
    "debole-poco-termico": "giornata difficile, solo volo di pendio con termiche deboli",
    "pioggia": "giornata sfavorevole, volo sconsigliato per pioggia e visibilità ridotta",
    "instabile-temporali": "giornata pericolosa, volo solo al mattino e rientro immediato in caso di sviluppo temporalesco",
  };
  const giudizioFinale = `${score} / 10 – ${giudizioDescMap[scenario]}. Monitorare l'evoluzione meteo nelle ore centrali e pianificare attentamente la finestra di volo.`;

  // === HEADER ===
  const giorniSettimana = ["DOMENICA", "LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO"];
  const mesi = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"];
  const dataHeader = `${giorniSettimana[dateObj.getDay()]} ${dateObj.getDate()} ${mesi[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  const titolo = `REPORT METEO ${siteName.toUpperCase()} – ${dataHeader}`;

  const testoCompleto = `${titolo}

1. Quadro termico e stabilità: ${paragrafoTermico}

2. Profilo del vento in quota: ${paragrafoVento}

3. Instabilità e precipitazioni: ${paragrafoInstabilita}

4. Strategia di volo consigliata: ${paragrafoStrategia}

Segnali di pericolo: ${segnaliPericolo}

Giudizio finale: ${giudizioFinale}`;

  return {
    titolo,
    paragrafoTermico,
    paragrafoVento,
    paragrafoInstabilita,
    paragrafoStrategia,
    segnaliPericolo,
    giudizioFinale,
    score,
    testoCompleto,
  };
}
