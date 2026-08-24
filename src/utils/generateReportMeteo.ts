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

  // Filtra ore diurne 8:00 - 19:00 per la data target
  const targetDateStr = dateObj.toISOString().split("T")[0];
  const dayIndices: number[] = [];
  times.forEach((t, i) => {
    if (t.startsWith(targetDateStr)) {
      const hr = parseInt(t.split("T")[1].split(":")[0], 10);
      if (hr >= 8 && hr <= 19) dayIndices.push(i);
    }
  });

  // Se non trova per data precisa, fallback su tutte le ore nel range 8-19
  if (dayIndices.length === 0) {
    times.forEach((t, i) => {
      const hr = parseInt(t.split("T")[1].split(":")[0], 10);
      if (hr >= 8 && hr <= 19) dayIndices.push(i);
    });
  }

  if (dayIndices.length === 0) return null;

  // Temperature
  const dayTemps = dayIndices.map((i) => temps[i] ?? 18);
  const tempMin = Math.round(Math.min(...dayTemps));
  const tempMax = Math.round(Math.max(...dayTemps));

  // Nuvole & Pioggia
  const dayClouds = dayIndices.map((i) => clouds[i] ?? 50);
  const avgCloud = Math.round(dayClouds.reduce((a, b) => a + b, 0) / dayClouds.length);

  const dayPrecips = dayIndices.map((i) => precips[i] ?? 0);
  const totPrecip = Math.round(dayPrecips.reduce((a, b) => a + b, 0) * 10) / 10;
  const maxPrecipHour = Math.max(...dayPrecips);
  const hasThunderstorm = dayIndices.some((i) => (codes[i] ?? 0) >= 95 || (codes[i] ?? 0) === 82);
  const hasHeavyRain = totPrecip >= 1.5 || maxPrecipHour >= 0.6;
  const hasLightRain = totPrecip > 0.1 || dayIndices.some((i) => (codes[i] ?? 0) >= 51 && (codes[i] ?? 0) <= 67);

  // CAPE & Stabilità
  const dayCapes = dayIndices.map((i) => capes[i] ?? 200);
  const maxCape = Math.round(Math.max(...dayCapes, 100));

  // Stima Lifted Index
  let liftedIndex = -1.0;
  if (hasThunderstorm || maxCape > 1200) liftedIndex = -5.0;
  else if (maxCape > 800) liftedIndex = -3.5;
  else if (maxCape > 400) liftedIndex = -1.8;
  else liftedIndex = 1.5;

  // Zero Termico
  const dayFreezes = dayIndices.map((i) => freezes[i] ?? 3200).filter((f) => f > 0);
  const avgFreeze = dayFreezes.length > 0 ? Math.round(dayFreezes.reduce((a, b) => a + b, 0) / dayFreezes.length) : 3200;

  // Base Cumuli (LCL)
  const centralIndices = dayIndices.filter((i) => {
    const hr = parseInt(times[i].split("T")[1].split(":")[0], 10);
    return hr >= 11 && hr <= 16;
  });
  const avgSpread = centralIndices.length > 0
    ? centralIndices.reduce((acc, i) => acc + Math.max(0.5, (temps[i] ?? 15) - (dews[i] ?? 12)), 0) / centralIndices.length
    : 4;

  const baseCumuliMin = Math.round(altitude + Math.max(150, (avgSpread - 1.5) * 125));
  const baseCumuliMax = Math.round(altitude + Math.max(300, (avgSpread + 1.5) * 125));

  // Rateo salita realistico
  let rateoMin = 0.2;
  let rateoMax = 0.5;

  if (hasThunderstorm || hasHeavyRain) {
    rateoMin = 0.0;
    rateoMax = 0.2;
  } else if (hasLightRain || avgCloud > 80) {
    rateoMin = 0.2;
    rateoMax = 0.6;
  } else if (maxCape > 800 && avgCloud < 60) {
    rateoMin = 1.5;
    rateoMax = 2.6;
  } else if (maxCape > 400 && avgCloud < 70) {
    rateoMin = 1.0;
    rateoMax = 1.8;
  } else {
    rateoMin = 0.5;
    rateoMax = 1.0;
  }

  // Vento
  const dayWinds = dayIndices.map((i) => winds[i] ?? 8);
  const avgWindGround = Math.round(dayWinds.reduce((a, b) => a + b, 0) / dayWinds.length);
  const maxWindGround = Math.round(Math.max(...dayWinds));
  const mainWindDir = degToCardinal(dirs[dayIndices[Math.floor(dayIndices.length / 2)]] ?? 180);

  const wind1500_2500 = Math.round(avgWindGround * 1.3 + 4);
  const dir1500_2500 = degToCardinal((dirs[dayIndices[0]] ?? 180) + 15);

  const wind2500_3500 = Math.round(avgWindGround * 2.0 + 8);
  const dir2500_3500 = degToCardinal((dirs[dayIndices[0]] ?? 180) + 30);

  const windOver3500 = Math.round(avgWindGround * 2.8 + 14);
  const dirOver3500 = degToCardinal((dirs[dayIndices[0]] ?? 180) + 45);

  // Innesco termico
  let oraInnesco = "Non previsto / Termiche inibite";
  if (!hasHeavyRain && !hasThunderstorm && avgCloud < 85) {
    oraInnesco = "11:30 - 12:00";
  }

  // CALCOLO VOTO RIGOROSO
  let score = 7;
  let giudizioDesc = "";

  if (hasThunderstorm) {
    score = 0;
    giudizioDesc = "NON VOLABILE ❌ — Rischio temporali e fulminazioni. Volo categoricamente vietato";
  } else if (hasHeavyRain) {
    score = 1;
    giudizioDesc = "NON VOLABILE ❌ — Pioggia diffusa e cielo coperto. Nessuna condizione di sicurezza";
  } else if (hasLightRain) {
    score = 2;
    giudizioDesc = "SCONSIGLIATO ⚠️ — Piogge/rovesci intermittenti e nubi basse. Si sconsiglia il decollo";
  } else if (avgCloud >= 85) {
    score = 3;
    giudizioDesc = "MOLTO LIMITATO ⚠️ — Copertura nuvolosa totale, termiche assenti o solo deboli planate";
  } else if (maxWindGround > 28 || wind2500_3500 > 35) {
    score = 4;
    giudizioDesc = "DIFFICILE / CRITICO ⚠️ — Vento troppo sostenuto e raffiche; riservato a piloti esperti con vele adatte";
  } else if (avgCloud <= 50 && maxCape > 600) {
    score = 8;
    giudizioDesc = "OTTIMA GIORNATA ✅ — Buona attività termica, aria limpida e convezione organizzata";
  } else {
    score = 6;
    giudizioDesc = "DISCRETO / BUONO ✅ — Condizioni tranquille per volo locale o planata serena";
  }

  // Data formattata
  const giorniSettimana = ["DOMENICA", "LUNEDÌ", "MARTEDÌ", "MERCOLEDÌ", "GIOVEDÌ", "VENERDÌ", "SABATO"];
  const mesi = ["GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE", "DICEMBRE"];
  const dataHeader = `${giorniSettimana[dateObj.getDay()]} ${dateObj.getDate()} ${mesi[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  const titolo = `REPORT METEO ${siteName.toUpperCase()} – ${dataHeader}`;

  // 1. Quadro Termico
  let paragrafoTermico = "";
  if (hasHeavyRain || hasThunderstorm) {
    paragrafoTermico = `Giornata compromessa da perturbazione/instabilità bagnata. Temperature al suolo tra ${tempMin} °C e ${tempMax} °C con forte umidità e assenza di irraggiamento solare. Gradiente termico debole o invertito sotto le nubi. Lo zero termico è stimato a circa ${avgFreeze} m con base nubi molto bassa (spesso a ridosso del decollo, ${baseCumuliMin}–${baseCumuliMax} m). Termiche completamente azzerate (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s).`;
  } else if (hasLightRain || avgCloud >= 80) {
    paragrafoTermico = `Giornata uggiosa e prevalentemente coperta (${avgCloud}% nuvolosità media). Temperature contenute tra ${tempMin} °C e ${tempMax} °C con scarsa escursione. Gradiente termico modesto, zero termico a circa ${avgFreeze} m e base nubi compresa tra ${baseCumuliMin} e ${baseCumuliMax} m. Termiche molto deboli (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s) e discontinue a causa della mancanza di soleggiamento diretto.`;
  } else {
    paragrafoTermico = `Riscaldamento solare efficace con temperature al suolo previste tra ${tempMin} °C e ${tempMax} °C e gradiente termico vivace (~0.8–0.9 °C/100m). CAPE max di circa ${maxCape} J/kg con Lifted Index a ${liftedIndex.toFixed(1)} K. Lo zero termico si attesta a circa ${avgFreeze} m, base cumuli a ${baseCumuliMin}–${baseCumuliMax} m. Innesco previsto attorno alle ${oraInnesco} con salite termiche medie di ${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s.`;
  }

  // 2. Quadro Vento
  const paragrafoVento = `Al suolo vento medio di ${avgWindGround} km/h (raffiche fino a ${maxWindGround} km/h) da ${mainWindDir}. Tra 1500 e 2500 m il flusso si attesta a circa ${wind1500_2500} km/h da ${dir1500_2500}. Tra 2500 e 3500 m il vento raggiunge circa ${wind2500_3500} km/h da ${dir2500_3500}${wind2500_3500 > 30 ? ", con shear marcato sui crinali sopravento" : ""}. Oltre 3500 m intensità sui ${windOver3500} km/h da ${dirOver3500}.`;

  // 3. Convezione & Instabilità
  let paragrafoInstabilita = "";
  if (hasThunderstorm) {
    paragrafoInstabilita = `Alto rischio temporalesco su tutto il settore. Possibili celle convettive intense con fulmini, pioggia forte e improvvisi colpi di vento discendente (outflow). Nessun decollo consentito.`;
  } else if (hasHeavyRain || hasLightRain) {
    paragrafoInstabilita = `Precipitazioni previste con accumulo stimato di ${totPrecip} mm. Cielo coperto, visibilità compromessa e rischio di bagnare l'ala con conseguente perdita di profilo e stallo paracadutale.`;
  } else {
    paragrafoInstabilita = `Nessun rischio significativo di pioggia o temporali durante la fascia utile. Cumuli regolari senza iper-sviluppo cumulonembico.`;
  }

  // 4. Finestra & Strategia
  let paragrafoStrategia = "";
  if (hasThunderstorm || hasHeavyRain) {
    paragrafoStrategia = `Nessuna finestra utile. Si raccomanda di non salire al decollo e rimandare l'attività a giornate più stabili.`;
  } else if (hasLightRain || avgCloud >= 85) {
    paragrafoStrategia = `Finestra sconsigliata. Possibile solo qualche brevissima discesa o gonfiaggio a terra se le precipitazioni cessano del tutto, tenendo conto del terreno viscido e del tetto nubi basso.`;
  } else {
    paragrafoStrategia = `Lancio consigliato tra le 11:30 e le 16:30 sfruttando le ore centrali di miglior galleggiamento. Mantenere quote di sicurezza sotto la base nubi.`;
  }

  // Segnali di pericolo
  let segnaliPericolo = "";
  if (hasThunderstorm) {
    segnaliPericolo = "Temporali imminenti, fulmini, raffiche improvvise, calo repentino della visibilità.";
  } else if (hasHeavyRain || hasLightRain) {
    segnaliPericolo = "Pioggia, ala bagnata (rischio stallo profondo), nubi sul decollo, fondo scivoloso.";
  } else if (maxWindGround > 25 || wind2500_3500 > 32) {
    segnaliPericolo = "Vento forte al decollo o turbolenza sui versanti sottovento in quota.";
  } else {
    segnaliPericolo = "Velature pomeridiane con calo di attività termica o raffiche locali su cresta.";
  }

  const giudizioFinale = `${score} / 10 – ${giudizioDesc}.`;

  const testoCompleto = `${titolo}

1. Quadro Termico & Stabilità: ${paragrafoTermico}

2. Profilo Vento in Quota: ${paragrafoVento}

3. Convezione Pomeridiana & Rischio: ${paragrafoInstabilita}

4. Finestra di Decollo & Tattica: ${paragrafoStrategia}

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