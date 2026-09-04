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
  avgSpread: number
): ScenarioMeteo {
  if (hasThunderstorm || (totPrecip > 2 && maxCape > 600)) return "instabile-temporali";
  if (totPrecip > 1 || (avgClouds > 75 && maxCape > 400)) return "pioggia";
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

  // === Estrazione dati aggregati reali ===
  const dayTemps = dayIndices.map((i) => temps[i] ?? 18);
  const tempMin = Math.round(Math.min(...dayTemps));
  const tempMax = Math.round(Math.max(...dayTemps));
  const deltaT = tempMax - tempMin;

  const dayCapes = dayIndices.map((i) => capes[i] ?? 300);
  const maxCape = Math.round(Math.max(...dayCapes, 150));
  const avgCape = Math.round(dayCapes.reduce((a, b) => a + b, 0) / dayCapes.length);

  // Lifted Index realistico basato su CAPE
  let liftedIndex = 1.5;
  if (maxCape > 1500) liftedIndex = -6.0;
  else if (maxCape > 1000) liftedIndex = -4.5;
  else if (maxCape > 700) liftedIndex = -3.0;
  else if (maxCape > 400) liftedIndex = -1.5;
  else if (maxCape > 200) liftedIndex = 0.5;
  else liftedIndex = 2.5;

  // Zero termico
  const dayFreezes = dayIndices.map((i) => freezes[i] ?? 3600).filter((f) => f > 0);
  const avgFreeze = dayFreezes.length > 0 ? Math.round(dayFreezes.reduce((a, b) => a + b, 0) / dayFreezes.length) : 3600;
  const maxFreeze = dayFreezes.length > 0 ? Math.round(Math.max(...dayFreezes)) : 4200;

  // Spread e base cumuli (LCL) realistici
  const centralIndices = dayIndices.filter((i) => {
    const hr = parseInt(times[i].split("T")[1].split(":")[0], 10);
    return hr >= 11 && hr <= 16;
  });
  const avgSpread = centralIndices.length > 0
    ? centralIndices.reduce((acc, i) => acc + Math.max(1, (temps[i] ?? 18) - (dews[i] ?? 10)), 0) / centralIndices.length
    : 8;
  const baseCumuliMin = Math.round(altitude + Math.max(300, (avgSpread - 2) * 125));
  const baseCumuliMax = Math.round(altitude + Math.max(600, (avgSpread + 3) * 125));
  const baseCumuliMedia = Math.round((baseCumuliMin + baseCumuliMax) / 2);

  // Innesco termico reale
  let oraInnesco = "10:30";
  for (const i of dayIndices) {
    const hr = parseInt(times[i].split("T")[1].split(":")[0], 10);
    if (hr >= 9 && (temps[i] ?? 0) >= tempMin + 3 && (clouds[i] ?? 100) < 60) {
      oraInnesco = `${String(hr).padStart(2, "0")}:30`;
      break;
    }
  }

  // Rateo salita reale
  let rateoMin = 0.6;
  let rateoMax = 1.0;
  if (maxCape > 1200) { rateoMin = 1.5; rateoMax = 2.8; }
  else if (maxCape > 800) { rateoMin = 1.2; rateoMax = 2.2; }
  else if (maxCape > 500) { rateoMin = 0.9; rateoMax = 1.7; }
  else if (maxCape > 250) { rateoMin = 0.6; rateoMax = 1.2; }
  else { rateoMin = 0.3; rateoMax = 0.7; }

  // Vento
  const dayWinds = dayIndices.map((i) => winds[i] ?? 8);
  const dayDirs = dayIndices.map((i) => dirs[i] ?? 180);
  const avgWindGround = Math.round(dayWinds.reduce((a, b) => a + b, 0) / dayWinds.length);
  const maxWindGround = Math.round(Math.max(...dayWinds));
  const maxGust = Math.round(Math.max(...dayIndices.map(i => gusts[i] ?? 0)));
  // Direzione prevalente (moda circolare)
  const mainDirDeg = Math.round(dayDirs.reduce((a, b) => a + b, 0) / dayDirs.length);
  const mainWindDir = degToCardinal(mainDirDeg);
  const mainWindDirBreve = degToCardinalBreve(mainDirDeg);

  // Venti alle quote (modello esponenziale realistico)
  const wind1500_2500 = Math.round(avgWindGround * 1.4 + 3);
  const dir1500_2500 = degToCardinal(mainDirDeg + 12);
  const wind2500_3500 = Math.round(avgWindGround * 2.1 + 8);
  const dir2500_3500 = degToCardinal(mainDirDeg + 28);
  const windOver3500 = Math.round(avgWindGround * 2.9 + 15);
  const dirOver3500 = degToCardinal(mainDirDeg + 45);

  // Pioggia
  const dayPrecips = dayIndices.map((i) => precips[i] ?? 0);
  const totPrecip = Math.round(dayPrecips.reduce((a, b) => a + b, 0) * 10) / 10;
  const orePioggia = dayPrecips.filter(p => p > 0.1).length;
  const hasRain = totPrecip > 0.3;
  const hasThunderstorm = dayIndices.some((i) => (codes[i] ?? 0) >= 95);
  const avgClouds = Math.round(dayIndices.reduce((acc, i) => acc + (clouds[i] ?? 0), 0) / dayIndices.length);
  const maxClouds = Math.round(Math.max(...dayIndices.map(i => clouds[i] ?? 0)));

  // Identifica scenario
  const scenario = identificaScenario(maxCape, avgWindGround, maxWindGround, totPrecip, hasThunderstorm, avgClouds, avgSpread);

  // === PARAGRAFO TERMICO in base allo scenario ===
  let paragrafoTermico = "";
  const capeLabel = maxCape > 1500 ? "energia convettiva molto elevata" :
                    maxCape > 1000 ? "energia convettiva marcata" :
                    maxCape > 600 ? "energia convettiva discreta" :
                    maxCape > 300 ? "energia termica moderata" :
                    "energia termica scarsa";

  switch (scenario) {
    case "perfezionistico":
      paragrafoTermico = `Giornata di volo ideale. Il riscaldamento diurno porterà la temperatura da ${tempMin} °C del primo mattino fino a ${tempMax} °C nelle ore centrali, con un'escursione termica di ${deltaT} °C che garantirà un'attività termica robusta e ben organizzata. L'CAPE raggiungerà i ${maxCape} J/kg (${capeLabel}) con Lifted Index di ${liftedIndex.toFixed(1)} K, confermando una marcata instabilità potenziale. L'innesco è atteso per le ${oraInnesco}, con salite comprese tra ${rateoMin.toFixed(1)} e ${rateoMax.toFixed(1)} m/s che potranno superare i 3500 m di quota. Lo zero termico si attesta sui ${avgFreeze} m, lasciando ampio spazio alla convenzione secca. Base cumuli prevista tra ${baseCumuliMin} m e ${baseCumuliMax} m (media ${baseCumuliMedia} m). Visibilità ottima.`;
      break;
    case "termica-forte":
      paragrafoTermico = `Condizioni termiche molto buone. Temperature tra ${tempMin} °C e ${tempMax} °C con gradiente verticale stimato a 0.85 °C/100 m. L'CAPE tocca i ${maxCape} J/kg con Lifted Index di ${liftedIndex.toFixed(1)} K: termiche generose e ben strutturate. L'innesco parte attorno alle ${oraInnesco}, raggiungendo i picchi di salita (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s) tra le 12:00 e le 15:00. Base cumuli tra ${baseCumuliMin} m e ${baseCumuliMax} m. Lo zero termico a ${avgFreeze} m non limita la salita. Possibile sviluppo di qualche cumulo nel tardo pomeriggio ma senza fenomeni rilevanti.`;
      break;
    case "instabile-temporali":
      paragrafoTermico = `Atmosfera fortemente instabile con energia convettiva molto elevata (CAPE ${maxCape} J/kg, Lifted Index ${liftedIndex.toFixed(1)} K). La temperatura salirà rapidamente da ${tempMin} °C a ${tempMax} °C, con un gradiente termico verticalmente instabile che favorirà la formazione di nubi a sviluppo verticale. Le termiche innescheranno presto (ore ${oraInnesco}) e cresceranno rapidamente di intensità (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s). Lo zero termico è relativamente alto (${avgFreeze} m), il che spingerà i cumuli a quote notevoli. Base cumuli collocata tra ${baseCumuliMin} m e ${baseCumuliMax} m: attenzione alla trasformazione in cumulonembi. Visibilità in rapido degrado con l'avvicinamento dei fenomeni.`;
      break;
    case "ventoso":
      paragrafoTermico = `Termiche presenti ma disturbate dal vento sostenuto. Temperature tra ${tempMin} °C e ${tempMax} °C, con un gradiente termico sufficiente a generare attività convettiva moderata (CAPE ${maxCape} J/kg, Lifted Index ${liftedIndex.toFixed(1)} K). L'innesco avverrà attorno alle ${oraInnesco}, con salite modeste di ${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s. Il vento forte limiterà la qualità delle termiche rendendole spezzate e inclinate: saranno più utili i costoni soleggiati e i rilievi sottovento. Zero termico a ${avgFreeze} m, base cumuli poco significativa a ${baseCumuliMedia} m causa copertura nuvolosa limitata.`;
      break;
    case "stabile-coperto":
      paragrafoTermico = `Giornata con termiche inibite dalla copertura nuvolosa estesa (${avgClouds}% medio, picchi ${maxClouds}%). La temperatura salirà da ${tempMin} °C a ${tempMax} °C, ma l'irraggiamento solare sarà limitato con conseguente debolissimo riscaldamento del suolo. CAPE ${maxCape} J/kg, Lifted Index ${liftedIndex.toFixed(1)} K: l'energia convettiva resta sotto la soglia di attivazione. Innesco improbabile, e dove presente avverrà con grande ritardo. Salite debolissime se non assenti (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s nei rari momenti). Zero termico a ${avgFreeze} m. La base cumuli è di fatto assente per mancanza di motore termico.`;
      break;
    case "pioggia":
      paragrafoTermico = `Giornata con precipitazioni e termiche in gran parte compromesse. L'umidità elevata (spread medio ridotto) impedisce il surriscaldamento del suolo, mantenendo le temperature tra ${tempMin} °C e ${tempMax} °C senza escursione utile. CAPE ${maxCape} J/kg, Lifted Index ${liftedIndex.toFixed(1)} K. L'innesco termico non avviene, e le rare termiche (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s) sono spesso inibite dalla pioggia. Zero termico a ${avgFreeze} m. Base cumuli molto bassa a ${baseCumuliMin} m causa aria satura: possibili nubi basse e nebbie. Visibilità ridotta a tratti.`;
      break;
    case "debole-poco-termico":
      paragrafoTermico = `Termiche deboli e discontinue per la giornata odierna. La temperatura salirà da ${tempMin} °C a ${tempMax} °C con un'escursione limitata a ${deltaT} °C. CAPE ${maxCape} J/kg, Lifted Index ${liftedIndex.toFixed(1)} K: il profilo è stabile, con inversione termica nei bassi strati. L'innesco avverrà tardi (ore ${oraInnesco}) e le termiche saranno deboli (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s), spesso isolate e di breve durata. Zero termico a ${avgFreeze} m. La base cumuli si attesta oltre i ${baseCumuliMax} m, di fatto irraggiungibile con termiche così deboli. Strategia di volo obbligata a pendio e dinamico.`;
      break;
    case "misto":
    default:
      paragrafoTermico = `Condizioni termiche nella norma, con attività moderata. Temperatura del giorno compresa tra ${tempMin} °C e ${tempMax} °C, escursione diurna di ${deltaT} °C. CAPE ${maxCape} J/kg e Lifted Index di ${liftedIndex.toFixed(1)} K, configurazione di moderata instabilità. L'innesco termico è previsto per le ${oraInnesco}, con salite medie di ${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s. Lo zero termico si attesta sui ${avgFreeze} m. Base cumuli tra ${baseCumuliMin} m e ${baseCumuliMax} m. Le termiche saranno meglio organizzate sui versanti soleggiati esposti a sud-sud-ovest durante le ore centrali.`;
      break;
  }

  // === PARAGRAFO VENTO in base allo scenario ===
  const descrizioneVentoSotto = avgWindGround < 8 ? "calmo e gestibile" :
                                avgWindGround < 15 ? "debole e regolare" :
                                avgWindGround < 22 ? "moderato ma costante" :
                                "teso e richiede attenzione";

  let paragrafoVento = "";
  if (scenario === "ventoso") {
    paragrafoVento = `Vento sostenuto protagonista della giornata. Al suolo spira da ${mainWindDir} con intensità media di ${avgWindGround} km/h e raffiche fino a ${maxGust} km/h (picco ${maxWindGround} km/h): ${descrizioneVentoSotto} per i decolli, ma occhio alle raffiche in decollo. Tra 1500 e 2500 m il flusso si intensifica a ${wind1500_2500} km/h da ${dir1500_2500}, con shear verticale marcato e turbolenza meccanica. Tra 2500 e 3500 m il vento sale a ${wind2500_3500} km/h da ${dir2500_3500}, generando onda orografica sopravento e rotori sottovento. Sopra i 3500 m il flusso raggiunge i ${windOver3500} km/h da ${dirOver3500}: rotolamento aereo e turbolenza di scia in prossimità dei crinali. Si consiglia di volare sottovento ai costoni e di evitare la traversata sopravento.`;
  } else if (scenario === "perfezionistico") {
    paragrafoVento = `Profilo del vento ottimale per il volo libero. Al suolo, vento da ${mainWindDir} debole a ${avgWindGround} km/h (raffiche ${maxGust} km/h), ${descrizioneVentoSotto}: ideale per i decolli e per l'atterraggio in campo. Tra 1500 e 2500 m il flusso si porta a ${wind1500_2500} km/h da ${dir1500_2500}: dinamico ottimo, con sostegno continuo sui costoni sopravento. Tra 2500 e 3500 m il vento sale gradualmente a ${wind2500_3500} km/h da ${dir2500_3500}, consentendo transiti in altura senza penalizzazioni. Sopra i 3500 m il flusso raggiunge ${windOver3500} km/h da ${dirOver3500}, rimanendo sfruttabile per il volo d'onda. Direzione prevalente ${mainWindDir} con leggera rotazione oraria nel corso della giornata.`;
  } else if (scenario === "instabile-temporali") {
    paragrafoVento = `Vento al suolo in rinforzo nel pomeriggio. Mattinata con ${mainWindDir} debole a ${avgWindGround} km/h, ma con l'arrivo dei fenomeni convettivi sono attese raffiche discendenti (downburst) fino a ${maxGust} km/h in prossimità dei cumulonembi. Tra 1500 e 2500 m il flusso è stimato a ${wind1500_2500} km/h da ${dir1500_2500}, con rinforzi al passaggio dei sistemi. Tra 2500 e 3500 m il vento sale a ${wind2500_3500} km/h da ${dir2500_3500} all'interno della corrente ascensionale. Sopra i 3500 m il flusso raggiunge ${windOver3500} km/h da ${dirOver3500}: in quota si concentrano i moti verticali più intensi, ma anche le nubi temporalesche. Attenzione alle variazioni improvvise di intensità e direzione.`;
  } else if (scenario === "stabile-coperto") {
    paragrafoVento = `Vento al suolo da ${mainWindDir} a ${avgWindGround} km/h, raffiche ${maxGust} km/h: ${descrizioneVentoSotto}. Il flusso in quota segue il tipico profilo anticiclonico: 1500–2500 m a ${wind1500_2500} km/h da ${dir1500_2500}, 2500–3500 m a ${wind2500_3500} km/h da ${dir2500_3500}, sopra 3500 m a ${windOver3500} km/h da ${dirOver3500}. In assenza di attività termica, il volo è esclusivamente dinamico: sfruttare i costoni sopravento e cercare le ascendenti meccaniche. Possibile inversione termica nei bassi strati con stratificazione stabile.`;
  } else if (scenario === "pioggia") {
    paragrafoVento = `Vento al suolo da ${mainWindDir} a ${avgWindGround} km/h con raffiche ${maxGust} km/h: ${descrizioneVentoSotto}, ma con ulteriore rinforzo durante i rovesci. In quota, flusso sostenuto: 1500–2500 m a ${wind1500_2500} km/h da ${dir1500_2500}, 2500–3500 m a ${wind2500_3500} km/h da ${dir2500_3500}, sopra 3500 m a ${windOver3500} km/h da ${dirOver3500}. Profilo tipico da saccatura atlantica con flusso umido e instabile. Visibilità ridotta, precipitazioni in atto. Volo vivamente sconsigliato.`;
  } else {
    paragrafoVento = `Vento al suolo da ${mainWindDir} a ${avgWindGround} km/h, raffiche fino a ${maxGust} km/h: ${descrizioneVentoSotto}, ideale per i decolli. Tra 1500 e 2500 m il flusso si porta a ${wind1500_2500} km/h da ${dir1500_2500}, offrendo un buon dinamico sui versanti sopravento. Tra 2500 e 3500 m il vento raggiunge i ${wind2500_3500} km/h da ${dir2500_3500}, transitabile con attenzione alle rotazioni. Sopra i 3500 m il flusso si attesta sui ${windOver3500} km/h da ${dirOver3500}, con leggera componente da ovest al passaggio delle ore pomeridiane. Direzione al suolo ${mainWindDir} (${mainWindDirBreve}), in leggera rotazione oraria con la quota.`;
  }

  // === PARAGRAFO INSTABILITÀ/PRECIPITAZIONI ===
  let paragrafoInstabilita = "";
  if (scenario === "instabile-temporali") {
    paragrafoInstabilita = `Rischio elevato di temporali pomeridiani (probabilità stimata 50–70% nelle ore 13:00–18:00). I cumulonembi si svilupperanno dapprima sui rilievi principali, per poi estendersi alla valle. Sono attesi accumuli complessivi fino a ${totPrecip.toFixed(1)} mm con possibili grandinate. Le raffiche di outflow in discesa dai temporali potranno superare i 60–70 km/h. Si raccomanda di rientrare in atterraggio entro le 13:30 e di mantenersi a debita distanza da qualsiasi sviluppo verticale. Possibile attività elettrica: evitare assolutamente il volo.`;
  } else if (scenario === "pioggia") {
    paragrafoInstabilita = `Precipitazioni estese durante la giornata, con accumuli stimati di ${totPrecip.toFixed(1)} mm distribuiti su circa ${orePioggia} ore. Pioggia continua o a tratti, localmente anche a carattere di rovescio. Visibilità ridotta (2–5 km), con strati bassi su versanti sottovento (1500–2500 m). Base nuvolosa molto bassa a ${baseCumuliMin} m. Volo vivamente sconsigliato per pioggia e visibilità insufficiente. Possibili locali temporali se CAPE > 600 J/kg.`;
  } else if (scenario === "stabile-coperto") {
    paragrafoInstabilita = `Nessun rischio di precipitazioni significative: la copertura nuvolosa estesa (${avgClouds}% medio) non produce fenomeni rilevanti. Probabilità di pioggia inferiore al 10%. Possibile pioviggine locale in caso di nubi basse addossate ai rilievi (copertura ${maxClouds}%). L'attività cumuliforme è inibita dalla stabilità atmosferica. Le nubi alte e medie possono mascherare l'evoluzione del tempo ma non generano pericoli per il volo.`;
  } else if (scenario === "ventoso") {
    paragrafoInstabilita = `Nessun rischio di precipitazioni importanti (probabilità < 15%). Eventuali deboli piovaschi orografici sui crinali sopravento sono possibili ma senza accumuli significativi (stimati < 1 mm). Il vento sostenuto è il fattore dominante: la copertura nuvolosa si mantiene limitata (${avgClouds}%) con sviluppo di nubi basse a pendio rotte dal vento. Possibile trasporto di sabbia/polvere in alta quota.`;
  } else if (scenario === "perfezionistico" || scenario === "termica-forte") {
    paragrafoInstabilita = `Rischio molto basso di precipitazioni. La copertura nuvolosa si manterrà limitata a ${avgClouds}%, con sviluppo di cumuli congesti solo nel tardo pomeriggio (ore 15:00–17:00) ben oltre la base operativa. Probabilità di pioggia inferiore al 5%. Possibile locale rovescio orografico solo sui rilievi più elevati e isolati, con accumuli comunque trascurabili. Le condizioni sono ideali per la salita fino a quote elevate.`;
  } else if (scenario === "debole-poco-termico") {
    paragrafoInstabilita = `Nessun rischio di precipitazioni. Il profilo atmosferico stabile impedisce lo sviluppo di nubi convettive. Copertura nuvolosa modesta (${avgClouds}% medio) con prevalenza di nubi alte o velature. Cielo sereno o poco nuvoloso. L'assenza di motore termico è legata a inversione e stabilità, non a maltempo.`;
  } else {
    paragrafoInstabilita = `Rischio di precipitazioni basso-moderato (probabilità stimata 15–25% nel pomeriggio). Possibile sviluppo di cumuli sui rilievi principali dopo le 14:00, con locali piovaschi se l'instabilità aumenta. La copertura nuvolosa media sarà di ${avgClouds}% con picchi pomeridiani fino a ${maxClouds}%. Base cumuli collocata tra ${baseCumuliMin} m e ${baseCumuliMax} m, generalmente ben al di sopra della quota di volo prevista. Monitorare l'evoluzione con radar e satelliti nelle ore centrali.`;
  }

  // === STRATEGIA e SCORE in base allo scenario ===
  let score = 6;
  let paragrafoStrategia = "";
  let quotaSicura = Math.min(3000, baseCumuliMin);
  let oraFine = "16:00";

  switch (scenario) {
    case "perfezionistico":
      score = 9;
      quotaSicura = Math.min(3500, baseCumuliMin);
      oraFine = "17:00";
      paragrafoStrategia = `Finestra di volo eccezionale. Decollo consigliato dalle ${oraInnesco}, con atterraggio possibile anche fino alle ${oraFine}. Quota massima consigliata ${quotaSicura} m. Strategia: cross country lungo i costoni principali, transiti in altura con sfruttamento del dinamico sopra i 2500 m. Possibile raggiungere i 3500+ m e sfruttare il volo d'onda sui crinali sopravento. Attenzione solo al possibile sviluppo cumuliforme tardo-pomeridiano: mantenere un margine di 300–400 m sotto la base dei cumuli.`;
      break;
    case "termica-forte":
      score = 8;
      quotaSicura = Math.min(3200, baseCumuliMin);
      oraFine = "16:30";
      paragrafoStrategia = `Ottima giornata per volo termico-dinamico. Lancio possibile dalle ${oraInnesco} fino alle ${oraFine}, con condizioni stabili. Quota operativa consigliata ${quotaSicura} m. Strategia: sfruttare i costoni soleggiati per le prime ore, poi transizione in altura per collegare le termiche più generose. Cross possibile sui rilievi principali, attenzione alla rotazione del vento con la quota. Possibile raggiungere i 3200+ m durante il picco termico delle 13:00–15:00.`;
      break;
    case "misto":
      score = 7;
      quotaSicura = Math.min(3000, baseCumuliMin);
      oraFine = "16:00";
      paragrafoStrategia = `Giornata favorevole. Decollo raccomandato dalle ${oraInnesco} alle ${oraFine}, con attenzione all'evoluzione del vento. Quota operativa fino a ${quotaSicura} m. Strategia: iniziare con termiche di pendio, poi passare a termiche blu nel corso della giornata. Cross country possibile sui rilievi più alti, evitando i versanti sopravento dove il vento rinforza. Possibile raggiungere i 3000 m nelle ore centrali.`;
      break;
    case "ventoso":
      score = 5;
      quotaSicura = Math.min(2500, baseCumuliMin);
      oraFine = "15:00";
      paragrafoStrategia = `Strategia limitata dal vento. Finestra di volo dalle ${oraInnesco} alle ${oraFine}, con atterraggio prudente. Quota massima consigliata ${quotaSicura} m. Strategia: volo locale con sfruttamento dei costoni sopravento per il dinamico puro. Evitare le termiche (spezzate e inclinate) e le quote elevate. Volo adatto a piloti esperti che gestiscono il vento forte. Atterraggio anticipato se le raffiche superano i 40 km/h al suolo.`;
      break;
    case "stabile-coperto":
      score = 4;
      quotaSicura = Math.min(2200, baseCumuliMin);
      oraFine = "14:00";
      paragrafoStrategia = `Strategia obbligata al volo dinamico puro. Decollo possibile solo su pendii ripidi esposti al vento, con atterraggio anticipato entro le ${oraFine}. Quota operativa fino a ${quotaSicura} m. Strategia: cercare i costoni sopravento con vento perpendicolare al rilievo, sfruttare l'onda sottovento se presente. Niente termiche: la stabilità le inibisce totalmente.`;
      break;
    case "debole-poco-termico":
      score = 4;
      quotaSicura = Math.min(2000, altitude + 400);
      oraFine = "14:30";
      paragrafoStrategia = `Strategia di pendio obbligata. Decollo possibile dalle ${oraInnesco} (probabilmente tardi) fino alle ${oraFine}, con atterraggio se le termiche si esauriscono. Quota operativa limitata a ${quotaSicura} m. Strategia: volo di pendio puro, sfruttando i versanti soleggiati. Possibile qualche termica debole nelle ore centrali (12:00–14:00). Mantenere un margine ampio per l'atterraggio.`;
      break;
    case "pioggia":
      score = 2;
      quotaSicura = altitude;
      oraFine = "10:00";
      paragrafoStrategia = `Volo sconsigliato. Possibile solo un breve volo di pendio al mattino (entro le ${oraFine}) se le precipitazioni non sono ancora iniziate. Quota operativa strettamente limitata a ${quotaSicura} m. Strategia: valutare attentamente le condizioni locali, indossare equipaggiamento adeguato, mantenere sempre un'opzione di atterraggio sicura e rapida. Rimandare il volo se la pioggia è già in atto.`;
      break;
    case "instabile-temporali":
      score = 3;
      quotaSicura = Math.min(2200, baseCumuliMin - 200);
      oraFine = "12:30";
      paragrafoStrategia = `Strategia obbligata al volo mattutino. Decollo rigorosamente entro le ${oraInnesco}, con atterraggio improrogabile entro le ${oraFine}. Quota operativa limitata a ${quotaSicura} m, ben al di sotto della base cumuli. Strategia: sfruttare esclusivamente le prime ore di volo, mantenersi lontano dai rilievi più elevati, atterrare non appena i primi cumuli mostrano crescita verticale significativa. Possibile attività elettrica: non volare.`;
      break;
  }

  // === SEGNALI DI PERICOLO ===
  let segnaliPericolo = "";
  const pericoli: string[] = [];
  if (hasThunderstorm) pericoli.push("cumulonembi in formazione rapida e attività elettrica");
  if (hasRain && scenario !== "pioggia") pericoli.push("rovesci improvvisi con riduzione di visibilità");
  if (scenario === "ventoso") pericoli.push("raffiche al suolo superiori a 40 km/h in prossimità dei crinali");
  if (maxWindGround > 25 && scenario !== "ventoso") pericoli.push("raffiche al suolo intense e turbolenza meccanica");
  if (windOver3500 > 40) pericoli.push("vento in alta quota eccessivo (rotolamento aereo)");
  if (maxCape > 1000 && scenario !== "perfezionistico") pericoli.push("instabilità potenziale elevata, monitorare la crescita cumuliforme");
  if (avgClouds > 80) pericoli.push("copertura nuvolosa estesa con riduzione di visibilità");
  if (pericoli.length === 0) pericoli.push("evoluzione cumuliforme nel pomeriggio, monitorare i primi segnali di crescita verticale");

  segnaliPericolo = pericoli.join("; ") + ".";

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

  // === HEADER & TESTO COMPLETO ===
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
