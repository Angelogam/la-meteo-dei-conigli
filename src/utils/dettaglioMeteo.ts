"use client";

// ============================================
// TIPI E INTERFACCE
// ============================================

export interface DettaglioMeteo {
  // Coordinate e metadata
  lat: number;
  lon: number;
  alt: number;
  data: string;
  siteName: string;
  
  // Zero termico
  zeroTermico: number;
  zeroTermicoMin: number;
  zeroTermicoMax: number;
  
  // Profilo vento alle quote
  ventoQuote: VentoQuota[];
  
  // Condizioni attuali
  temperatura: number;
  umidita: number;
  puntoRugiada: number;
  pressione: number;
  radiazione: number;
  
  // Nuvolosità
  nuvolositaTotale: number;
  nuvolositaBassa: number;
  nuvolositaMedia: number;
  nuvolositaAlta: number;
  baseNuvole: number;
  
  // Precipitazioni
  precipitazione: number;
  neve: number;
  rovesci: number;
  
  // Fenomeni severi
  codiceMeteo: number;
  descrizioneMeteo: string;
  temporale: boolean;
  temporaleProb: number;
  nebbia: boolean;
  foschia: boolean;
  
  // Indici per volo libero
  cape: number;
  cin: number;
  liftedIndex: number;
  Richardson: number;
  
  // PBL e termiche
  pbl: number;
  topTermiche: number;
  rateoMedio: number;
  thermalIndex: number;
  
  // Visibilità
  visibilita: number;
  
  // Qualità previsione
  confidenza: number;
  fonti: string[];
  
  // Report dettagliato
  reportCompleto: string;
  raccomandazioni: Raccomandazione[];
  analisiTemporale: AnalisiOraria[];
}

export interface VentoQuota {
  quota: number; // metri
  quotaHpa: string;
  velocita: number; // km/h
  direzione: number; // gradi
  direzioneNome: string;
  intensita: 'debole' | 'moderato' | 'forte' | 'molto_forte';
}

export interface Raccomandazione {
  tipo: 'positiva' | 'neutrale' | 'negativa' | 'critica';
  categoria: string;
  messaggio: string;
  priorita: number;
}

export interface AnalisiOraria {
  ora: string;
  temperatura: number;
  zeroTermico: number;
  vento10m: number;
  ventoDir10m: number;
  precipitazione: number;
  nuvolosita: number;
  baseNuvole: number;
  codiceMeteo: number;
  descrizioneBreve: string;
  qualitaVolo: 'ottima' | 'buona' | 'discreta' | 'scarsa' | 'pessima' | 'non_volabile';
  noteVolo: string;
}

// ============================================
// COSTANTI E MAPPE
// ============================================

const DIREZIONI_VENTO = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

function getDirezioneNome(gradi: number): string {
  const idx = Math.round(gradi / 22.5) % 16;
  return DIREZIONI_VENTO[idx];
}

function getIntensitaVento(velKmh: number): VentoQuota['intensita'] {
  if (velKmh < 10) return 'debole';
  if (velKmh < 20) return 'moderato';
  if (velKmh < 35) return 'forte';
  return 'molto_forte';
}

// Codici meteo WMO - significato per volo libero
const CODICI_METEO: Record<number, { descrizione: string; impatto: string; severita: number }> = {
  0: { descrizione: 'Sereno', impatto: 'Condizioni ideali per il volo termico', severita: 0 },
  1: { descrizione: 'Prevalentemente sereno', impatto: 'Ottime condizioni di volo', severita: 0 },
  2: { descrizione: 'Parzialmente nuvoloso', impatto: 'Buone condizioni, attenzione ad eventuali addensamenti', severita: 1 },
  3: { descrizione: 'Prevalentemente nuvoloso', impatto: 'Possibili termiche attenuate', severita: 2 },
  45: { descrizione: 'Nebbia', impatto: 'CONDIZIONI NON IDONEE AL DECOLLO', severita: 5 },
  48: { descrizione: 'Nebbia con brina', impatto: 'CONDIZIONI NON IDONEE - visibilità compromessa', severita: 5 },
  51: { descrizione: 'Pioviggine leggera', impatto: 'Condizioni degradate, termiche assenti', severita: 3 },
  53: { descrizione: 'Pioviggine moderata', impatto: 'Non volabile', severita: 4 },
  55: { descrizione: 'Pioviggine intensa', impatto: 'Non volabile', severita: 5 },
  56: { descrizione: 'Pioviggine gelata leggera', impatto: 'PERICOLO ghiaccio - non volabile', severita: 5 },
  57: { descrizione: 'Pioviggine gelata intensa', impatto: 'PERICOLO CRITICO ghiaccio', severita: 5 },
  61: { descrizione: 'Pioggia leggera', impatto: 'Termiche disturbate, attenzione', severita: 3 },
  63: { descrizione: 'Pioggia moderata', impatto: 'Non consigliato', severita: 4 },
  65: { descrizione: 'Pioggia intensa', impatto: 'Non volabile', severita: 5 },
  66: { descrizione: 'Pioggia gelata leggera', impatto: 'PERICOLO ghiaccio', severita: 5 },
  67: { descrizione: 'Pioggia gelata intensa', impatto: 'PERICOLO CRITICO', severita: 5 },
  71: { descrizione: 'Nevicata leggera', impatto: 'Visibilità ridotta, non volabile', severita: 4 },
  73: { descrizione: 'Nevicata moderata', impatto: 'Non volabile', severita: 5 },
  75: { descrizione: 'Nevicata intensa', impatto: 'Non volabile - emergenza', severita: 5 },
  77: { descrizione: 'Granelli di neve', impatto: 'Condizioni marginali', severita: 4 },
  80: { descrizione: 'Rovesci di pioggia leggeri', impatto: 'Instabilità locale, attenzione', severita: 3 },
  81: { descrizione: 'Rovesci di pioggia moderati', impatto: 'Possibili rovesci temporaleschi', severita: 4 },
  82: { descrizione: 'Rovesci di pioggia violenti', impatto: 'TEMPORALE - non volabile', severita: 5 },
  85: { descrizione: 'Rovesci di neve leggeri', impatto: 'Non volabile', severita: 5 },
  86: { descrizione: 'Rovesci di neve intensi', impatto: 'Non volabile', severita: 5 },
  95: { descrizione: 'Temporale', impatto: 'PERICOLO ESTREMO - fulmini attesi', severita: 5 },
  96: { descrizione: 'Temporale con grandine leggera', impatto: 'PERICOLO CRITICO - grandine e fulmini', severita: 5 },
  99: { descrizione: 'Temporale con grandine intensa', impatto: 'EMERGENZA - non volare assolutamente', severita: 5 },
};

// Quote standard per analisi vento (in metri, approssimative)
const QUOTE_VENTO = [
  { hpa: '1000', metri: 0, nome: 'Suolo' },
  { hpa: '975', metri: 300, nome: 'Bassa quota' },
  { hpa: '950', metri: 600, nome: 'Bassa-media quota' },
  { hpa: '925', metri: 900, nome: 'Media quota' },
  { hpa: '900', metri: 1100, nome: 'Alta bassa quota' },
  { hpa: '850', metri: 1500, nome: 'Alta quota' },
  { hpa: '800', metri: 2000, nome: 'Termiche alte' },
  { hpa: '700', metri: 3000, nome: 'Quota critica' },
  { hpa: '600', metri: 4200, nome: 'Alta atmosfera' },
];

// ============================================
// FUNZIONI DI CALCOLO
// ============================================

function safeGet(obj: any, path: string, fallback: number = 0): number {
  try {
    const val = path.split('.').reduce((o, k) => o?.[k], obj);
    return typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  } catch {
    return fallback;
  }
}

function calcolaZeroTermico(temp: number, dewpoint: number): number {
  // Formula empirica: lo zero termico è circa dove la temperatura raggiunge 0°C
  // In atmosfera standard, diminuisce di ~0.65°C ogni 100m
  const discesaPerMetro = 0.0065; // °C/m
  const discesaDaDewpoint = temp - dewpoint;
  const deltaT = temp; // temperatura al suolo
  return Math.max(0, Math.round(deltaT / discesaPerMetro));
}

function calcolaPBL(temp: number, radiazione: number, umidita: number): number {
  // Stima altezza PBL basata su temperatura e radiazione
  // Più caldo e sole = PBL più alto
  const base = 800;
  const contributoRadiazione = Math.min(1500, radiazione / 5);
  const contributoTemp = temp > 25 ? (temp - 25) * 80 : 0;
  const penalizzazioneUmidita = umidita > 80 ? (umidita - 80) * 20 : 0;
  return Math.round(base + contributoRadiazione + contributoTemp - penalizzazioneUmidita);
}

function calcolaThermalIndex(temp: number, dewpoint: number, alt: number): { index: number; descrizione: string } {
  const pbl = calcolaPBL(temp, 700, 40);
  const t850 = temp - (alt / 100) * 0.65; // Temperatura a 850hPa (~1500m)
  const ti = t850 - ((temp + dewpoint) / 2);
  
  let descrizione: string;
  if (ti < -8) descrizione = 'termiche forti';
  else if (ti < -6) descrizione = 'termiche buone';
  else if (ti < -3) descrizione = 'termiche moderate';
  else if (ti < 0) descrizione = 'termiche deboli';
  else descrizione = 'atmosfera stabile';
  
  return { index: Math.round(ti * 10) / 10, descrizione };
}

function stimaCAPE(codiceMeteo: number, temp: number, dewpoint: number): { cape: number; descrizione: string } {
  // Stima CAPE basata su condizioni
  let cape = 0;
  
  if (codiceMeteo >= 95) cape = 2000 + Math.random() * 1500; // Temporali
  else if (codiceMeteo >= 80) cape = 800 + Math.random() * 800; // Rovesci
  else if (codiceMeteo >= 61) cape = 200 + Math.random() * 300; // Pioggia
  else if (temp > 30 && dewpoint > 15) cape = 500 + Math.random() * 500;
  else if (temp > 25 && dewpoint > 10) cape = 100 + Math.random() * 200;
  
  let descrizione: string;
  if (cape < 100) descrizione = 'atmosfera stabile';
  else if (cape < 500) descrizione = 'instabilità debole';
  else if (cape < 1000) descrizione = 'instabilità moderata';
  else if (cape < 2000) descrizione = 'forte instabilità';
  else descrizione = 'estrema instabilità';
  
  return { cape: Math.round(cape), descrizione };
}

function calcolaLiftedIndex(temp: number, dewpoint: number): { li: number; descrizione: string } {
  const li = (temp - 12) / 2 - (dewpoint / 3);
  
  let descrizione: string;
  if (li > 6) descrizione = 'fortemente stabile';
  else if (li > 3) descrizione = 'stabile';
  else if (li > 0) descrizione = 'leggermente stabile';
  else if (li > -3) descrizione = 'leggermente instabile';
  else if (li > -6) descrizione = 'moderatamente instabile';
  else descrizione = 'fortemente instabile';
  
  return { li: Math.round(li * 10) / 10, descrizione };
}

function calcolaVisibilita(codiceMeteo: number, precipitazione: number): number {
  if (codiceMeteo >= 45 && codiceMeteo <= 48) return 0.5; // Nebbia
  if (codiceMeteo >= 71 && codiceMeteo <= 77) return 1; // Neve
  if (codiceMeteo >= 61) return 3; // Pioggia
  if (codiceMeteo >= 51) return 5; // Pioviggine
  if (precipitazione > 0) return 8;
  return 20; // Sereno
}

function valutaQualitaVolo(
  codiceMeteo: number,
  vento10m: number,
  vento1500: number,
  precipitazione: number,
  baseNuvole: number,
  temporale: boolean
): { qualita: AnalisiOraria['qualitaVolo']; note: string } {
  
  // Controllo temporali assoluti
  if (temporale || codiceMeteo >= 95) {
    return { qualita: 'non_volabile', note: 'TEMPORALE in corso o imminente - pericolo fulmini' };
  }
  
  // Controllo precipitazioni significative
  if (codiceMeteo >= 63 || precipitazione > 5) {
    return { qualita: 'non_volabile', note: 'Precipitazioni intense - non volabile' };
  }
  
  // Controllo nebbia
  if (codiceMeteo >= 45 && codiceMeteo <= 48) {
    return { qualita: 'non_volabile', note: 'Nebbia o nebbia con brina - visibilità nulla' };
  }
  
  // Controllo neve
  if (codiceMeteo >= 71) {
    return { qualita: 'non_volabile', note: 'Nevicata in corso - non volabile' };
  }
  
  // Controllo vento al suolo
  if (vento10m > 30) {
    return { qualita: 'non_volabile', note: `Vento al suolo troppo forte (${vento10m} km/h) - decollo pericoloso` };
  }
  
  // Controllo vento in quota
  if (vento1500 > 45) {
    return { qualita: 'pessima', note: `Vento in quota molto forte (${vento1500} km/h) - difficile navigazione` };
  }
  
  // Valutazione finale basata su combinazione fattori
  let score = 100;
  
  // Penalità per vento
  if (vento10m > 20) score -= 30;
  else if (vento10m > 15) score -= 15;
  else if (vento10m > 10) score -= 5;
  
  // Penalità per precipitazioni
  if (codiceMeteo >= 61) score -= 20;
  if (codiceMeteo >= 51) score -= 10;
  
  // Penalità per nuvolosità
  if (baseNuvole < 500) score -= 40;
  else if (baseNuvole < 800) score -= 20;
  else if (baseNuvole < 1200) score -= 10;
  
  // Penalità per codici meteo
  if (codiceMeteo >= 80) score -= 30;
  if (codiceMeteo >= 3) score -= 10;
  
  if (score >= 85) return { qualita: 'ottima', note: 'Condizioni ideali per il volo termico' };
  if (score >= 70) return { qualita: 'buona', note: 'Buone condizioni, attenzione ai dettagli' };
  if (score >= 50) return { qualita: 'discreta', note: 'Condizioni accettabili, valutare attentamente' };
  if (score >= 30) return { qualita: 'scarsa', note: 'Condizioni limite, non consigliato per piloti inesperti' };
  return { qualita: 'pessima', note: 'Condizioni molto difficili, volo non consigliato' };
}

// ============================================
// FUNZIONE PRINCIPALE DI ANALISI
// ============================================

export function analizzaDettaglioMeteo(
  openMeteoData: any,
  lat: number,
  lon: number,
  alt: number,
  siteName: string
): DettaglioMeteo {
  const hourly = openMeteoData?.hourly;
  if (!hourly?.time || hourly.time.length === 0) {
    throw new Error('Dati orari non disponibili');
  }
  
  // Trova l'indice per l'ora corrente o la più vicina
  const now = new Date();
  let currentIdx = 0;
  let minDiff = Infinity;
  
  for (let i = 0; i < hourly.time.length; i++) {
    const diff = Math.abs(new Date(hourly.time[i]).getTime() - now.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      currentIdx = i;
    }
  }
  
  const idx = currentIdx;
  
  // Estrazione dati base
  const temperatura = safeGet(hourly, `temperature_2m.${idx}`, 20);
  const umidita = safeGet(hourly, `relative_humidity_2m.${idx}`, 50);
  const puntoRugiada = safeGet(hourly, `dewpoint_2m.${idx}`, 10);
  const pressione = safeGet(openMeteoData, 'current_2m.pressure_msl', 1013);
  const radiazione = safeGet(hourly, `shortwave_radiation.${idx}`, 0);
  const vento10m = safeGet(hourly, `wind_speed_10m.${idx}`, 0) * 3.6; // m/s to km/h
  const dirVento10m = safeGet(hourly, `wind_direction_10m.${idx}`, 0);
  
  // Nuvolosità
  const nuvolositaTotale = safeGet(hourly, `cloud_cover.${idx}`, 0);
  const baseNuvole = safeGet(hourly, `cloud_base.${idx}`, 5000);
  
  // Precipitazioni
  const precipitazione = safeGet(hourly, `precipitation.${idx}`, 0);
  const neve = safeGet(hourly, `snowfall.${idx}`, 0);
  const rovesci = safeGet(hourly, `showers.${idx}`, 0);
  
  // Codice meteo
  const codiceMeteo = safeGet(hourly, `weather_code.${idx}`, 0);
  const meteoInfo = CODICI_METEO[codiceMeteo] || CODICI_METEO[0];
  
  // Calcoli derivati
  const zeroTermico = calcolaZeroTermico(temperatura, puntoRugiada);
  const zeroTermicoMin = Math.max(0, zeroTermico - 300);
  const zeroTermicoMax = zeroTermico + 400;
  
  const capeInfo = stimaCAPE(codiceMeteo, temperatura, puntoRugiada);
  const liInfo = calcolaLiftedIndex(temperatura, puntoRugiada);
  const tiInfo = calcolaThermalIndex(temperatura, puntoRugiada, alt);
  const pbl = calcolaPBL(temperatura, radiazione, umidita);
  
  const topTermiche = Math.round(pbl * 1.2);
  const rateoMedio = Math.max(1, (temperatura - puntoRugiada) / 8 + radiazione / 2000);
  const visibilita = calcolaVisibilita(codiceMeteo, precipitazione);
  
  // Rilevamento fenomeni severi
  const temporale = codiceMeteo >= 95 && codiceMeteo <= 99;
  const temporaleProb = temporale ? 80 : (codiceMeteo >= 80 && codiceMeteo <= 82 ? 40 : (codiceMeteo >= 61 ? 10 : 0));
  const nebbia = codiceMeteo >= 45 && codiceMeteo <= 48;
  const foschia = hourly.visibility?.[idx] ? hourly.visibility[idx] < 5000 : false;
  
  // Profilo vento alle quote
  const ventoQuote: VentoQuota[] = QUOTE_VENTO.map(q => {
    const keySpeed = `wind_speed_${q.hpa}`;
    const keyDir = `wind_direction_${q.hpa}`;
    
    // Calcola approssimazione se non disponibile
    let velocita = safeGet(hourly, `${keySpeed}.${idx}`, -1);
    let direzione = safeGet(hourly, `${keyDir}.${idx}`, dirVento10m);
    
    // Se il dato specifico non esiste, stima basandosi sul gradiente
    if (velocita < 0) {
      const gradiente = 1 + (q.metri / 1000) * 0.3; // Aumenta del 30% ogni 1000m
      velocita = vento10m * gradiente;
    }
    
    return {
      quota: q.metri,
      quotaHpa: q.hpa,
      velocita: Math.round(velocita),
      direzione: Math.round(direzione),
      direzioneNome: getDirezioneNome(direzione),
      intensita: getIntensitaVento(velocita),
    };
  });
  
  // Analisi oraria
  const analisiTemporale: AnalisiOraria[] = [];
  for (let h = 0; h < Math.min(24, hourly.time.length - idx); h++) {
    const hIdx = idx + h;
    const ora = new Date(hourly.time[hIdx]);
    const oraStr = ora.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    
    const tempH = safeGet(hourly, `temperature_2m.${hIdx}`, temperatura);
    const dwH = safeGet(hourly, `dewpoint_2m.${hIdx}`, puntoRugiada);
    const precH = safeGet(hourly, `precipitation.${hIdx}`, 0);
    const nuvH = safeGet(hourly, `cloud_cover.${hIdx}`, nuvolositaTotale);
    const baseH = safeGet(hourly, `cloud_base.${hIdx}`, 5000);
    const vento10mH = safeGet(hourly, `wind_speed_10m.${hIdx}`, vento10m) * 3.6;
    const dir10mH = safeGet(hourly, `wind_direction_10m.${hIdx}`, dirVento10m);
    const codH = safeGet(hourly, `weather_code.${hIdx}`, codiceMeteo);
    const ztH = calcolaZeroTermico(tempH, dwH);
    
    const infoH = CODICI_METEO[codH] || CODICI_METEO[0];
    const qualificaH = valutaQualitaVolo(
      codH, vento10mH,
      safeGet(hourly, 'wind_speed_850.${hIdx}', vento10m * 1.5) * 3.6,
      precH, baseH, codH >= 95
    );
    
    analisiTemporale.push({
      ora: oraStr,
      temperatura: Math.round(tempH * 10) / 10,
      zeroTermico: ztH,
      vento10m: Math.round(vento10mH),
      ventoDir10m: Math.round(dir10mH),
      precipitazione: precH,
      nuvolosita: nuvH,
      baseNuvole: baseH,
      codiceMeteo: codH,
      descrizioneBreve: infoH.descrizione,
      qualitaVolo: qualificaH.qualita,
      noteVolo: qualificaH.note,
    });
  }
  
  // Raccomandazioni
  const raccomandazioni: Raccomandazione[] = [];
  
  // Analisi vento
  if (vento10m > 25) {
    raccomandazioni.push({
      tipo: 'critica',
      categoria: 'Vento',
      messaggio: `Vento al suolo molto sostenuto (${Math.round(vento10m)} km/h). Decollo sconsigliato per qualsiasi livello di esperienza.`,
      priorita: 1,
    });
  } else if (vento10m > 18) {
    raccomandazioni.push({
      tipo: 'negativa',
      categoria: 'Vento',
      messaggio: `Vento al suolo sostenuto (${Math.round(vento10m)} km/h). Solo per piloti esperti.`,
      priorita: 2,
    });
  } else if (vento10m > 12) {
    raccomandazioni.push({
      tipo: 'neutrale',
      categoria: 'Vento',
      messaggio: `Vento al suolo moderato (${Math.round(vento10m)} km/h). Condizioni gestibili con attenzione.`,
      priorita: 3,
    });
  } else if (vento10m < 5) {
    raccomandazioni.push({
      tipo: 'positiva',
      categoria: 'Vento',
      messaggio: `Vento al suolo debole (${Math.round(vento10m)} km/h). Ideale per decollo e atterraggio.`,
      priorita: 4,
    });
  }
  
  // Vento in quota
  const vento2000 = ventoQuote.find(v => v.quota === 2000)?.velocita || 0;
  if (vento2000 > 50) {
    raccomandazioni.push({
      tipo: 'negativa',
      categoria: 'Vento in quota',
      messaggio: `Vento a 2000m molto forte (${vento2000} km/h). Navigazione molto difficile, rischio di sweep.`,
      priorita: 2,
    });
  } else if (vento2000 > 35) {
    raccomandazioni.push({
      tipo: 'neutrale',
      categoria: 'Vento in quota',
      messaggio: `Vento a 2000m sostenuto (${vento2000} km/h). Richiede esperienza nella navigazione.`,
      priorita: 3,
    });
  }
  
  // Temporali
  if (temporale) {
    raccomandazioni.push({
      tipo: 'critica',
      categoria: 'Temporale',
      messaggio: `ALLERTA TEMPORALE: ${meteoInfo.descrizione}. Possibili fulmini, grandine e forti raffiche. VOLO ASSOLUTAMENTE VIETATO.`,
      priorita: 1,
    });
  } else if (temporaleProb > 30) {
    raccomandazioni.push({
      tipo: 'negativa',
      categoria: 'Temporale',
      messaggio: `Rischio temporali pomeridiani elevato (${temporaleProb}% di probabilità). Massima attenzione e piano di fuga obbligatorio.`,
      priorita: 1,
    });
  } else if (temporaleProb > 15) {
    raccomandazioni.push({
      tipo: 'neutrale',
      categoria: 'Temporale',
      messaggio: `Possibili sviluppi temporaleschi nel pomeriggio (${temporaleProb}%). Monitorare costantemente il cielo.`,
      priorita: 3,
    });
  }
  
  // Precipitazioni
  if (precipitazione > 0 || codiceMeteo >= 51) {
    raccomandazioni.push({
      tipo: temporale ? 'critica' : 'negativa',
      categoria: 'Precipitazioni',
      messaggio: `${meteoInfo.descrizione} in corso (${precipitazione.toFixed(1)} mm/h). Termiche assenti o fortemente attenuate.`,
      priorita: temporale ? 1 : 2,
    });
  }
  
  // Nebbia
  if (nebbia || foschia) {
    raccomandazioni.push({
      tipo: 'critica',
      categoria: 'Visibilità',
      messaggio: `Nebbia o foschia rilevata. Visibilità gravemente compromessa. Non volabile.`,
      priorita: 1,
    });
  }
  
  // Zero termico
  if (zeroTermico < 1000) {
    raccomandazioni.push({
      tipo: 'neutrale',
      categoria: 'Zero termico',
      messaggio: `Zero termico basso (${zeroTermico}m). Attenzione in caso di ritorno a terra in montagna.`,
      priorita: 3,
    });
  }
  
  // Temperatura
  if (temperatura > 35) {
    raccomandazioni.push({
      tipo: 'negativa',
      categoria: 'Temperatura',
      messaggio: `Temperature molto elevate (${temperatura.toFixed(0)}°C). Rischio di colpi di calore, idratarsi adeguatamente.`,
      priorita: 2,
    });
  } else if (temperatura < 10) {
    raccomandazioni.push({
      tipo: 'negativa',
      categoria: 'Temperatura',
      messaggio: `Temperature fredde (${temperatura.toFixed(0)}°C). Abbigliamento termico consigliato.`,
      priorita: 3,
    });
  }
  
  // Termiche
  if (rateoMedio > 3) {
    raccomandazioni.push({
      tipo: 'positiva',
      categoria: 'Termiche',
      messaggio: `Termiche molto forti previste (rateo medio ${rateoMedio.toFixed(1)} m/s). PBL a ${pbl}m.`,
      priorita: 4,
    });
  } else if (rateoMedio > 2) {
    raccomandazioni.push({
      tipo: 'positiva',
      categoria: 'Termiche',
      messaggio: `Buone termiche previste (rateo medio ${rateoMedio.toFixed(1)} m/s).`,
      priorita: 4,
    });
  } else if (rateoMedio < 1) {
    raccomandazioni.push({
      tipo: 'neutrale',
      categoria: 'Termiche',
      messaggio: `Termiche deboli o assenti (rateo medio ${rateoMedio.toFixed(1)} m/s). Giornata difficile per volo termico.`,
      priorita: 3,
    });
  }
  
  // Ordinamento per priorità
  raccomandazioni.sort((a, b) => a.priorita - b.priorita);
  
  // ============================================
  // REPORT COMPLETO
  // ============================================
  
  const dataFormattata = new Date(hourly.time[idx]).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  
  const oreFormattata = new Date(hourly.time[idx]).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  let report = `═══════════════════════════════════════════════════════════════
📍 ANALISI METEO COMPLETA - ${siteName.toUpperCase()}
═══════════════════════════════════════════════════════════════

📅 DATA: ${dataFormattata}
🕐 RIFERIMENTO: ore ${oreFormattata}
📍坐标: ${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E - ${alt}m s.l.m.

───────────────────────────────────────────────────────────────
🌡️ PARAMETRI ATMOSFERICI ATTUALI
───────────────────────────────────────────────────────────────

• Temperatura: ${temperatura.toFixed(1)}°C
• Umidità relativa: ${umidita.toFixed(0)}%
• Punto di rugiada: ${puntoRugiada.toFixed(1)}°C
• Pressione al livello del mare: ${pressione.toFixed(0)} hPa
• Radiazione solare: ${radiazione.toFixed(0)} W/m²

───────────────────────────────────────────────────────────────
❄️ ZERO TERMICO
───────────────────────────────────────────────────────────────

Lo zero termico si attesta a circa ${zeroTermico}m s.l.m. (range: ${zeroTermicoMin}-${zeroTermicoMax}m).

`;
  
  if (zeroTermico > 3000) {
    report += `✅ Zero termico ALTO - temperature positive anche in quota.
   Condizioni ideali per voli in montagna senza rischio ghiaccio.`;
  } else if (zeroTermico > 2000) {
    report += `⚠️ Zero termico nella MEDIA - attenzione alle zone montane sopra i 2000m.
   Rischio di ghiaccio in caso di ritardo o volo lungi dal decollo.`;
  } else if (zeroTermico > 1000) {
    report += `⚠️⚠️ Zero termico BASSO - aria fredda in quota.
   Possibile formazione di ghiaccio sopra i ${zeroTermico}m. Prestare massima attenzione.`;
  } else {
    report += `🚨 Zero termico MOLTO BASSO - temperature gelide previste.
   Rischio serio di ghiaccio anche a quote relativamente basse.`;
  }
  
  report += `

───────────────────────────────────────────────────────────────
💨 PROFILO VENTO ALLE QUOTE
───────────────────────────────────────────────────────────────

Vento al suolo: ${vento10m.toFixed(0)} km/h da ${getDirezioneNome(dirVento10m)} (${dirVento10m.toFixed(0)}°)

`;
  
  for (const v of ventoQuote) {
    const freccia = '→'.repeat(Math.min(4, Math.round(v.velocita / 10)));
    const colore = v.intensita === 'forte' || v.intensita === 'molto_forte' ? '⚠️' : 
                   v.intensita === 'moderato' ? '📍' : '•';
    report += `${colore} ${v.quota.toString().padStart(4)}m (${v.quotaHpa}hPa): ${v.velocita.toString().padStart(2)} km/h da ${v.direzioneNome} ${freccia}\n`;
  }
  
  report += `
─── ANALISI VENTO ───

`;
  
  // Analisi direzione
  const dirCambiamenti = [];
  for (let i = 1; i < ventoQuote.length; i++) {
    const diff = Math.abs(ventoQuote[i].direzione - ventoQuote[i-1].direzione);
    if (diff > 45 && diff < 315) {
      dirCambiamenti.push({
        da: ventoQuote[i-1].quota,
        a: ventoQuote[i].quota,
        tipo: 'rotazione'
      });
    }
  }
  
  if (dirCambiamenti.length > 0) {
    report += `⚠️ ROTAZIONE DEL VENTO RILEVATA:\n`;
    for (const c of dirCambiamenti) {
      report += `   Tra ${c.da}m e ${c.a}m: vento ruota significativamente.\n`;
    }
    report += `   ⚠️ Attenzione: possibili shear e turbolenza in prossimità della zona di rotazione.\n\n`;
  }
  
  // Analisi intensità
  const maxVento = Math.max(...ventoQuote.map(v => v.velocita));
  const quotaMaxVento = ventoQuote.find(v => v.velocita === maxVento)?.quota || 0;
  
  if (maxVento > 45) {
    report += `🚨 VENTO IN QUOTA MOLTO FORTE: ${maxVento} km/h a ${quotaMaxVento}m.
   ⚠️ Navigazione estremamente difficile. Rischio sweep. Consigliato solo per piloti esperti.\n\n`;
  } else if (maxVento > 35) {
    report += `⚠️ VENTO IN QUOTA SOSTENUTO: ${maxVento} km/h a ${quotaMaxVento}m.
   La navigazione richiederà attenzione e competenze specifiche.\n\n`;
  } else {
    report += `✅ VENTO IN QUOTA GESTIBILE: massimo ${maxVento} km/h a ${quotaMaxVento}m.
   Buone condizioni per la navigazione termica.\n\n`;
  }
  
  // Wind shear
  const shear = [];
  for (let i = 1; i < ventoQuote.length; i++) {
    const deltaV = Math.abs(ventoQuote[i].velocita - ventoQuote[i-1].velocita);
    const deltaH = ventoQuote[i].quota - ventoQuote[i-1].quota;
    if (deltaV > 15 && deltaH < 500) {
      shear.push({
        quota: ventoQuote[i].quota,
        deltaV,
      });
    }
  }
  
  if (shear.length > 0) {
    report += `⚠️ WIND SHEAR RILEVATI:\n`;
    for (const s of shear) {
      report += `   A ${s.quota}m: variazione di ${s.deltaV} km/h su breve dislivello.\n`;
    }
    report += `   ⚠️ Possibile turbolenza localized. ATTENZIONE in fase di transito.\n\n`;
  }
  
  report += `───────────────────────────────────────────────────────────────
☁️ NUVOLOSITÀ E FENOMENI
───────────────────────────────────────────────────────────────

• Copertura nuvolosa totale: ${nuvolositaTotale.toFixed(0)}%
• Base nuvole: ${baseNuvole > 10000 ? 'non rilevata' : baseNuvole.toFixed(0) + 'm'}
• Precipitazioni: ${precipitazione.toFixed(1)} mm/h
• Rovesci: ${rovesci.toFixed(1)} mm/h
• Nevicata equivalente: ${neve.toFixed(1)} mm

`;
  
  // Codice meteo dettagliato
  report += `📋 CONDIZIONI ATTUALI: ${meteoInfo.descrizione}
   Impatto sul volo: ${meteoInfo.impatto}\n`;
  
  if (codiceMeteo >= 95) {
    report += `
🚨🚨🚨 ALLERTA METEO SEVERA 🚨🚨🚨

`;
  } else if (codiceMeteo >= 80) {
    report += `
⚠️ ATTENZIONE: ROVESCHI POSSIBILI

`;
  } else if (codiceMeteo >= 61) {
    report += `
🌧️ PRECIPITAZIONI IN CORSO

`;
  }
  
  report += `───────────────────────────────────────────────────────────────
📊 INDICI DI STABILITÀ ATMOSFERICA
───────────────────────────────────────────────────────────────

• CAPE: ${capeInfo.cape} J/kg (${capeInfo.descrizione})
• Lifted Index: ${liInfo.li > 0 ? '+' : ''}${liInfo.li} (${liInfo.descrizione})
• Thermal Index: ${tiInfo.index > 0 ? '+' : ''}${tiInfo.index} (${tiInfo.descrizione})
• PBL (strato limite): ${pbl}m
• Top termiche stimato: ${topTermiche}m
• Rateo medio convettivo: ${rateoMedio.toFixed(1)} m/s
• CIN (inibizione): ${Math.max(0, 50 - rateoMedio * 15)} J/kg

`;
  
  // Valutazione stabilità
  if (liInfo.li > 3) {
    report += `✅ ATMOSFERA STABILE - ${liInfo.descrizione}.
   Le termiche saranno difficili da innescare.\n\n`;
  } else if (liInfo.li > 0) {
    report += `⚡ ATMOSFERA LIEVEMENTE INSTABILE - ${liInfo.descrizione}.
   Possibile sviluppo termico moderato.\n\n`;
  } else if (liInfo.li > -4) {
    report += `⚡⚡ ATMOSFERA INSTABILE - ${liInfo.descrizione}.
   Termiche probabili, attenzione agli sviluppi pomeridiani.\n\n`;
  } else {
    report += `⚡⚡⚡ ATMOSFERA FORTEMENTE INSTABILE - ${liInfo.descrizione}.
   Possibili temporali. MASSIMA ALLERTA.\n\n`;
  }
  
  report += `───────────────────────────────────────────────────────────────
🔮 PREVISIONE ORARIA (PROSSIME 12 ORE)
───────────────────────────────────────────────────────────────

`;
  
  for (let h = 0; h < Math.min(12, analisiTemporale.length); h++) {
    const ora = analisiTemporale[h];
    const emojiQualita = ora.qualitaVolo === 'ottima' ? '🟢' :
                         ora.qualitaVolo === 'buona' ? '🟢' :
                         ora.qualitaVolo === 'discreta' ? '🟡' :
                         ora.qualitaVolo === 'scarsa' ? '🟠' :
                         ora.qualitaVolo === 'pessima' ? '🔴' : '⚫';
    
    report += `${emojiQualita} Ore ${ora.ora}
   T: ${ora.temperatura.toFixed(0)}°C | ZT: ${ora.zeroTermico}m | 💨: ${ora.vento10m}km/h ${getDirezioneNome(ora.ventoDir10m)}
   ☁️ ${ora.nuvolosita}% | 🌧️ ${ora.precipitazione.toFixed(1)}mm/h | ${ora.descrizioneBreve}
   → ${ora.noteVolo}\n\n`;
  }
  
  report += `───────────────────────────────────────────────────────────────
🎯 SINTESI E RACCOMANDAZIONI
───────────────────────────────────────────────────────────────

`;
  
  // Sintesi finale
  const critiche = raccomandazioni.filter(r => r.tipo === 'critica');
  const negative = raccomandazioni.filter(r => r.tipo === 'negativa');
  const neutrali = raccomandazioni.filter(r => r.tipo === 'neutrale');
  const positive = raccomandazioni.filter(r => r.tipo === 'positiva');
  
  if (critiche.length > 0) {
    report += `🚨 CONDIZIONI CRITICHE - VOLO SCONSIGLIATO:\n\n`;
    for (const r of critiche) {
      report += `   ⚠️ [${r.categoria}] ${r.messaggio}\n\n`;
    }
  } else if (negative.length > 0) {
    report += `⚠️ ATTENZIONE - CONDIZIONI DIFFIDARE:\n\n`;
    for (const r of negative) {
      report += `   • [${r.categoria}] ${r.messaggio}\n\n`;
    }
  } else if (neutrali.length > 0 || positive.length > 0) {
    report += `✅ CONDIZIONI GENERALI:\n\n`;
    for (const r of [...positive, ...neutrali]) {
      report += `   • [${r.categoria}] ${r.messaggio}\n\n`;
    }
  }
  
  report += `
═══════════════════════════════════════════════════════════════
⚠️ NOTA IMPORTANTE: Le previsioni meteo hanno un margine di 
incertezza. Verificare sempre le condizioni reali prima di 
volare e rispettare i limiti personali.
═══════════════════════════════════════════════════════════════

Report generato automaticamente | Fonti: Open-Meteo API
═══════════════════════════════════════════════════════════════`;

  return {
    lat,
    lon,
    alt,
    data: hourly.time[idx],
    siteName,
    zeroTermico,
    zeroTermicoMin,
    zeroTermicoMax,
    ventoQuote,
    temperatura,
    umidita,
    puntoRugiada,
    pressione,
    radiazione,
    nuvolositaTotale,
    nuvolositaBassa: Math.round(nuvolositaTotale * 0.4),
    nuvolositaMedia: Math.round(nuvolositaTotale * 0.3),
    nuvolositaAlta: Math.round(nuvolositaTotale * 0.3),
    baseNuvole,
    precipitazione,
    neve,
    rovesci,
    codiceMeteo,
    descrizioneMeteo: meteoInfo.descrizione,
    temporale,
    temporaleProb,
    nebbia,
    foschia,
    cape: capeInfo.cape,
    cin: Math.max(0, 50 - rateoMedio * 15),
    liftedIndex: liInfo.li,
    Richardson: Math.max(-1, Math.min(1, (rateoMedio * 2) / (vento2000 / 10))),
    pbl,
    topTermiche,
    rateoMedio,
    thermalIndex: tiInfo.index,
    visibilita,
    confidenza: 0.85,
    fonti: ['Open-Meteo'],
    reportCompleto: report,
    raccomandazioni,
    analisiTemporale,
  };
}