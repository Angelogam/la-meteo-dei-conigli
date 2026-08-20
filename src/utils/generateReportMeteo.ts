"use client";

function degToCardinal(deg: number): string {
  if (deg == null) return "S";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
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

export function generateReportMeteo({
  siteName,
  altitude,
  dateObj,
  hourlyData,
}: ReportMeteoParams): GeneratedReport | null {
  if (!hourlyData?.time || hourlyData.time.length === 0) return null;

  const times: string[] = hourlyData.time;
  const temps: number[] = hourlyData.temperature_2m || [];
  const dews: number[] = hourlyData.dew_point_2m || [];
  const winds: number[] = hourlyData.wind_speed_10m || [];
  const dirs: number[] = hourlyData.wind_direction_10m || [];
  const gusts: number[] = hourlyData.wind_gusts_10m || [];
  const precips: number[] = hourlyData.precipitation || [];
  const clouds: number[] = hourlyData.cloud_cover || [];
  const capes: number[] = hourlyData.cape || [];
  const freezes: number[] = hourlyData.freezing_level_height || [];
  const codes: number[] = hourlyData.weather_code || [];

  // Filtra ore diurne 8:00 - 19:00
  const dayIndices: number[] = [];
  times.forEach((t, i) => {
    const hr = parseInt(t.split("T")[1].split(":")[0], 10);
    if (hr >= 8 && hr <= 19) dayIndices.push(i);
  });

  if (dayIndices.length === 0) return null;

  // Temperature
  const dayTemps = dayIndices.map((i) => temps[i] ?? 18);
  const tempMin = Math.round(Math.min(...dayTemps));
  const tempMax = Math.round(Math.max(...dayTemps));

  // CAPE & Stabilità
  const dayCapes = dayIndices.map((i) => capes[i] ?? 300);
  const maxCape = Math.round(Math.max(...dayCapes, 150));
  const avgCape = Math.round(dayCapes.reduce((a, b) => a + b, 0) / dayCapes.length);

  // Stima Lifted Index da CAPE/Spread
  let liftedIndex = -1.5;
  if (maxCape > 1200) liftedIndex = -5.2;
  else if (maxCape > 800) liftedIndex = -4.2;
  else if (maxCape > 400) liftedIndex = -2.8;
  else if (maxCape > 150) liftedIndex = -1.2;
  else liftedIndex = 1.4;

  // Zero Termico
  const dayFreezes = dayIndices.map((i) => freezes[i] ?? 3600).filter((f) => f > 0);
  const avgFreeze = dayFreezes.length > 0 ? Math.round(dayFreezes.reduce((a, b) => a + b, 0) / dayFreezes.length) : 3600;

  // Base Cumuli (LCL) media ore centrali
  const centralIndices = dayIndices.filter((i) => {
    const hr = parseInt(times[i].split("T")[1].split(":")[0], 10);
    return hr >= 11 && hr <= 16;
  });
  const avgSpread = centralIndices.length > 0
    ? centralIndices.reduce((acc, i) => acc + Math.max(1, (temps[i] ?? 18) - (dews[i] ?? 10)), 0) / centralIndices.length
    : 8;

  const baseCumuliMin = Math.round(altitude + Math.max(400, (avgSpread - 2) * 125));
  const baseCumuliMax = Math.round(altitude + Math.max(700, (avgSpread + 2) * 125));

  // Innesco termico
  let oraInnesco = "10:30";
  const innescoIdx = dayIndices.find((i) => {
    const hr = parseInt(times[i].split("T")[1].split(":")[0], 10);
    return hr >= 10 && (temps[i] ?? 0) >= tempMin + 4;
  });
  if (innescoIdx != null) {
    const hr = parseInt(times[innescoIdx].split("T")[1].split(":")[0], 10);
    oraInnesco = `${String(hr).padStart(2, "0")}:00`;
  }

  // Rateo salita stimato
  let rateoMin = 0.8;
  let rateoMax = 1.4;
  if (maxCape > 1000) {
    rateoMin = 1.4;
    rateoMax = 2.4;
  } else if (maxCape > 500) {
    rateoMin = 1.0;
    rateoMax = 1.8;
  } else {
    rateoMin = 0.6;
    rateoMax = 1.1;
  }

  // Vento al suolo
  const dayWinds = dayIndices.map((i) => winds[i] ?? 8);
  const avgWindGround = Math.round(dayWinds.reduce((a, b) => a + b, 0) / dayWinds.length);
  const maxWindGround = Math.round(Math.max(...dayWinds));
  const mainWindDir = degToCardinal(dirs[dayIndices[Math.floor(dayIndices.length / 2)]] ?? 180);

  // Venti alle quote
  const wind1500_2500 = Math.round(avgWindGround * 1.5 + 4);
  const dir1500_2500 = degToCardinal((dirs[dayIndices[0]] ?? 180) + 15);

  const wind2500_3500 = Math.round(avgWindGround * 2.4 + 10);
  const dir2500_3500 = degToCardinal((dirs[dayIndices[0]] ?? 180) + 35);

  const windOver3500 = Math.round(avgWindGround * 3.2 + 18);
  const dirOver3500 = degToCardinal((dirs[dayIndices[0]] ?? 180) + 50);

  // Pioggia e Temporali
  const dayPrecips = dayIndices.map((i) => precips[i] ?? 0);
  const totPrecip = Math.round(dayPrecips.reduce((a, b) => a + b, 0) * 10) / 10;
  const hasRain = totPrecip > 0.3;
  const hasThunderstorm = dayIndices.some((i) => (codes[i] ?? 0) >= 95 || ((codes[i] ?? 0) >= 80 && maxCape > 800));

  let rainProbText = "bassa (<10%)";
  let probTemporali = "5–10%";
  if (hasThunderstorm || (hasRain && maxCape > 900)) {
    probTemporali = "40–55%";
    rainProbText = "alta";
  } else if (hasRain || maxCape > 600) {
    probTemporali = "25–35%";
    rainProbText = "moderata";
  }

  // Finestra di lancio consigliata
  const oraFine = hasThunderstorm || hasRain ? "12:30" : "16:00";
  const finestraLancio = `${oraInnesco} e le ${oraFine}`;
  const quotaSicura = Math.min(3200, baseCumuliMin);

  // Giudizio e Voto
  let score = 7;
  let giudizioDesc = "giornata favorevole per il volo libero";
  if (hasThunderstorm) {
    score = 3;
    giudizioDesc = "giornata insidiosa con rischio temporali pomeridiani. Volare solo al mattino e rientrare presto";
  } else if (hasRain || totPrecip > 1) {
    score = 4;
    giudizioDesc = "giornata instabile e umida con possibili rovesci. Volo locale con attenta osservazione";
  } else if (wind2500_3500 > 35 || maxWindGround > 25) {
    score = 5;
    giudizioDesc = "vento sostenuto in quota con shear marcato. Riservata a piloti esperti";
  } else if (maxCape > 600 && !hasRain) {
    score = 8;
    giudizioDesc = "ottima giornata termica con buon sostegno e quote elevate. Condizioni ideali per il volo";
  } else {
    score = 6;
    giudizioDesc = "buona giornata di volo tranquillo, termiche moderate e atmosfera gestibile";
  }

  // Data formattata
  const giorniSettimana = ["DOMENICA", "LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO"];
  const mesi = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"];
  const dataHeader = `${giorniSettimana[dateObj.getDay()]} ${dateObj.getDate()} ${mesi[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  const titolo = `REPORT METEO ${siteName.toUpperCase()} – ${dataHeader}`;

  // Costruzione Paragrafi
  const atmosferaTipo = hasThunderstorm
    ? "instabile con marcata energia convettiva pomeridiana"
    : maxCape > 800
    ? "instabile con buona energia termica"
    : hasRain
    ? "umida e variabile con moderata attività termica"
    : "generalmente stabile e favorevole per il volo termico";

  const paragrafoTermico = `Giornata ${atmosferaTipo}. Riscaldamento diurno previsto tra ${tempMin} °C e ${tempMax} °C al suolo, gradiente termico medio di circa 0.9 °C/100 m con atmosfera vivace. Il CAPE è stimato intorno a ${maxCape} J/kg con Lifted Index di ${liftedIndex.toFixed(1)} K, indice di termiche ${maxCape > 800 ? "robuste e ben organizzate" : "moderate e regolari"}. Lo zero termico si colloca a circa ${avgFreeze} m, con base cumuli tra ${baseCumuliMin} e ${baseCumuliMax} m. L'innesco termico è previsto verso le ${oraInnesco}, con salite medie di ${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s e visibilità ${totPrecip > 2 ? "discreta" : "ottima"}.`;

  const paragrafoVento = `Sotto i 1500 m il vento resta ${avgWindGround < 12 ? "debole" : "moderato"}, ${avgWindGround}–${maxWindGround} km/h da ${mainWindDir}, ideale per decolli gestibili. Tra 1500 e 2500 m il vento sale a ${wind1500_2500} km/h da ${dir1500_2500}, garantendo buon sostegno dinamico e termiche compatte. Tra 2500 e 3500 m il flusso si intensifica fino a ${wind2500_3500} km/h da ${dir2500_3500}${wind2500_3500 > 30 ? ", con shear verticale e possibile turbolenza sui crinali sopravento" : ", con condizioni generalmente navigabili"}. Sopra i 3500 m il vento raggiunge ${windOver3500} km/h da ${dirOver3500}${windOver3500 > 38 ? ", quota sconsigliata per eccesso di deriva" : ""}.`;

  let paragrafoInstabilita = "";
  if (hasThunderstorm || totPrecip > 0.5) {
    paragrafoInstabilita = `Il pomeriggio presenta rischio di rovesci convettivi: tra le 13:00 e le 17:00 sono possibili accumuli stimati fino a ${totPrecip > 0 ? totPrecip : "qualche"} mm, con sviluppo di nubi a forte estensione verticale e repentine raffiche di outflow. La probabilità di temporali è del ${probTemporali}, raccomandando cautela e atterraggio prima dell'iper-sviluppo.`;
  } else {
    paragrafoInstabilita = `Nessun rischio significativo di pioggia o temporali durante le ore centrali (probabilità temporali ${probTemporali}). La copertura nuvolosa pomeridiana rimarrà innocua senza inibire l'attività termica sulle creste.`;
  }

  const strategiaTipo = score >= 7
    ? "Cross Country possibile lungo i costoni principali e versanti esposti a sud. Mantenere quote di sicurezza e sfruttare i costoni soleggiati."
    : score >= 5
    ? "Volo locale e veleggiamento dinamico-termico lungo la valle. Evitare transizioni lunghe sopravento e monitorare la quota."
    : "Volo mattutino locale o discesa tranquilla; rientrare in atterraggio prima che la convezione pomeridiana crei turbolenza.";

  const paragrafoStrategia = `Il lancio consigliato è tra le ${finestraLancio}, sfruttando la finestra di massima stabilità. Quota massima consigliata circa ${quotaSicura} m, rimanendo sotto la base dei cumuli. Strategia: ${strategiaTipo}`;

  const segnaliPericolo = `${hasThunderstorm ? "Cumulonembi in rapida crescita pomeridiana, " : ""}turbolenza e raffiche sopra i 2500 m, ${windOver3500 > 35 ? "vento oltre 35 km/h in quota" : "calo visibilità in caso di velature"}.`;

  const giudizioFinale = `${score} / 10 – ${giudizioDesc}. Serve buona pianificazione del volo, monitoraggio della quota e osservazione dell'evoluzione cumuliforme.`;

  const testoCompleto = `${titolo}

${paragrafoTermico}

${paragrafoVento}

${paragrafoInstabilita}

${paragrafoStrategia}

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