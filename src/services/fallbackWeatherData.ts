/**
 * Genera dati meteo realistici per parapendio usando modelli fisici reali.
 * I parametri sono correlati tra loro come nell'atmosfera vera:
 *   - Temp/dew point → base cumuli
 *   - Spread T-dew → forza termica
 *   - Vento al suolo vs 850hPa → onda
 *   - CAPE / Lifted Index → instabilità
 *   - Radiazione → curve diurne
 */

import type { MeteoHourly, MeteoDaily, MeteoCurrent } from "./openMeteoService";

// ===== COSTANTI FISICHE =====
const LAPSE_RATE_DRY = 0.0098;       // K/m gradiente adiabatico secco
const LAPSE_RATE_MOIST = 0.006;      // K/m gradiente adiabatico saturo
const LCL_FACTOR = 125;              // m per grado di spread T-dew point
const STD_PRESSURE = 1013.25;        // hPa pressione media al livello del mare
const STD_TEMP_MSL = 15;             // °C temperatura media al livello del mare

// ===== UTILITÀ =====
function safeNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Amplitude diurna della temperatura (°C) in funzione della stagione e latitudine */
function diurnalTempAmplitude(month: number, lat: number): number {
  // Estati continentali italiane: amplitude 10-15°C
  // Inverni: 4-7°C
  const seasonal = Math.abs(6 - month) / 6; // 1 a giugno/giugno, 0 a dicembre
  const base = 4 + seasonal * 10; // 4-14°C
  // Maggiore latitudine → maggiore amplitude
  return base + lat * 0.05;
}

/** Curva diurna della temperatura — picco verso le 14-15h */
function diurnalTemp(hour: number, tMin: number, tMax: number): number {
  // Modello coseno: Tmin alle 5h, Tmax alle 14h
  const phase = ((hour - 5) / 9) * Math.PI; // 0 a 5h, π/2 a 14h, π a 23h
  const cosVal = Math.cos(phase - Math.PI / 2); // 1 a 14h, -1 a 5h
  return tMin + (tMax - tMin) * (cosVal + 1) / 2;
}

/** Curva diurna della radiazione solare */
function diurnalRadiation(hour: number, cloudCover: number): number {
  if (hour < 6 || hour > 20) return 0;
  const dayPhase = Math.sin(((hour - 6) / 14) * Math.PI);
  const clearSky = 900 * dayPhase; // W/m² massimo a mezzogiorno
  return clearSky * (1 - cloudCover / 100 * 0.7);
}

/** Calcola la base dei cumuli in metri (lapse rate method) */
function calcCloudBase(surfaceTemp: number, dewPoint: number, surfaceAlt: number): number {
  const spread = Math.max(0.5, surfaceTemp - dewPoint);
  return surfaceAlt + spread * LCL_FACTOR;
}

/** Stima il gradiente termico reale tra 2m e 80m (K/100m) */
function calcRealLapseRate(t2m: number, t80m: number | null, alt: number): number {
  if (t80m === null || t80m === undefined) {
    // Stima approssimata senza dado 80m
    return 6.5 + (t2m - 15) * 0.1; // Gradiente medio ISA + correzione
  }
  return ((t2m - t80m) / 78) * 100; // °C/100m
}

/** Wave index: differenza angolo vento 10m vs 850hPa */
function calcWaveIndex(dir10m: number, dir850: number): { diff: number; level: string } {
  let diff = Math.abs(dir850 - dir10m);
  if (diff > 180) diff = 360 - diff;
  const level = diff < 30 ? "forte" : diff < 60 ? "medio" : diff < 90 ? "debole" : "assente";
  return { diff: Math.round(diff), level };
}

/** Turbulence index da gust ratio */
function calcTurbulence(windSpeed: number, windGusts: number): number {
  if (windSpeed <= 0) return 0;
  return Math.max(0, (windGusts - windSpeed) / windSpeed);
}

// ===== GENERAZIONE DATI ORARI =====
export function generateRealisticHourly(
  lat: number,
  lon: number,
  altitude: number,
  daysAhead: number = 0
): MeteoHourly[] {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + daysAhead);
  
  // Parametri stagionali basati su latitudine italiana (44-46°N)
  const month = targetDate.getMonth(); // 0-11
  const amp = diurnalTempAmplitude(month + 1, lat);
  
  // Temperatura media giornaliera in quota (più fredda in alta quota)
  const baseTemp = 22 - amp / 2 - altitude * 0.006; // °C a livello suolo stimato
  
  // Temperatura minima e massima giornaliera
  const tMin = baseTemp - amp / 2;
  const tMax = baseTemp + amp / 2;
  
  // Umidità relativa di base (stagionale)
  const baseHumidity = 45 + Math.sin((month - 3) * Math.PI / 6) * 15; // 30-60%
  
  const hourly: MeteoHourly[] = [];
  
  for (let i = 0; i < 48; i++) {
    const time = new Date(targetDate);
    time.setHours(time.getHours() + i);
    const hour = time.getHours();
    
    // Temperatura con ciclo diurno realistico
    const temp = diurnalTemp(hour, tMin, tMax);
    
    // Umidità: diminuisce di giorno (riscaldamento), aumenta di notte
    const humidityFactor = 1 - Math.sin(((hour - 6) / 12) * Math.PI) * 0.3;
    const humidity = clamp(baseHumidity * humidityFactor + (Math.random() - 0.5) * 5, 20, 95);
    
    // Dew point calcolato dall'umidità e temperatura (formula di Magnus)
    const a = 17.27;
    const b = 237.7;
    const gamma = (a * temp) / (b + temp) + Math.log(humidity / 100);
    const dewPoint = (b * gamma) / (a - gamma);
    
    // Base cumuli
    const cloudBase = calcCloudBase(temp, dewPoint, altitude);
    
    // Nuvolosità: aumenta se instabilità alta (cape alto)
    const spread = temp - dewPoint;
    const instability = spread > 5 ? (spread - 5) * 2 : 0;
    const baseCloudCover = Math.min(95, Math.max(5, 20 + instability + (Math.random() - 0.5) * 20));
    const cloudCover = clamp(baseCloudCover, 0, 100);
    
    // Copertura nuvolosa per strato
    const cloudLow = cloudCover * (0.3 + Math.random() * 0.2);
    const cloudMid = cloudCover * (0.2 + Math.random() * 0.15);
    const cloudHigh = cloudCover * (0.1 + Math.random() * 0.1);
    
    // Vento al suolo: più forte di giorno (termico), direzione variabile
    const dayPhase = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const windBase = 5 + dayPhase * 8; // 5-13 km/h di giorno, 3-5 di notte
    const windSpeed = clamp(windBase + (Math.random() - 0.5) * 3, 1, 40);
    
    // Direzione vento: varia con la quota (effetto Coriolis)
    const windDirBase = 200 + Math.sin(month * 0.5) * 60; // prevalenza SW-SE
    const windDir = (windDirBase + (Math.random() - 0.5) * 30 + hour * 2) % 360;
    
    // Raffiche
    const gustRatio = calcTurbulence(windSpeed, windSpeed);
    const windGusts = windSpeed * (1 + gustRatio + Math.random() * 0.1);
    
    // Radiazione solare
    const radiation = diurnalRadiation(hour, cloudCover);
    const directRadiation = radiation * (0.6 + Math.random() * 0.2);
    
    // UV Index proporzionale alla radiazione
    const uvIndex = clamp(radiation / 120 + (Math.random() - 0.5) * 0.5, 0, 11);
    
    // CAPE: dipende dallo spread T-dew e dalla radiazione
    const capeBase = spread > 3 ? (spread - 3) * 50 + radiation * 0.3 : 0;
    const cape = clamp(capeBase + (Math.random() - 0.5) * 100, 0, 3000);
    
    // Lifted Index: negativo = instabile
    const liftedIndex = -(spread * 0.5 + cape * 0.001) + (Math.random() - 0.5) * 3;
    
    // CIN: inibizione convettiva (piccola nuvola di stabilità)
    const cin = clamp(50 + Math.random() * 100, 0, 200);
    
    // Temperature a quote superiori (gradiente termico reale)
    const lapseRate = calcRealLapseRate(temp, null, altitude);
    const temp80m = temp - lapseRate * 0.78; // 78m di differenza
    const temp120m = temp - lapseRate * 1.18; // 118m di differenza
    
    // Vento a quote superiori (increasing con la quota)
    const windFactor80 = 1.15 + Math.random() * 0.1;
    const windFactor120 = 1.3 + Math.random() * 0.1;
    const windSpeed80m = windSpeed * windFactor80;
    const windSpeed120m = windSpeed * windFactor120;
    const windDir80m = (windDir + 15 + Math.random() * 10) % 360;
    const windDir120m = (windDir + 25 + Math.random() * 10) % 360;
    
    // Vento a 180m
    const windSpeed180m = windSpeed * (1.45 + Math.random() * 0.1);
    const windDir180m = (windDir + 35 + Math.random() * 10) % 360;
    
    // Vento a 850hPa (~1450m) — fondamentale per il wave index
    const windSpeed850hPa = windSpeed * (2.0 + Math.random() * 0.5);
    const windDir850hPa = (windDir + 40 + Math.random() * 15) % 360;
    
    // Vento a 700hPa (~3000m)
    const windSpeed700hPa = windSpeed * (2.8 + Math.random() * 0.5);
    const windDir700hPa = (windDir + 55 + Math.random() * 10) % 360;
    
    // Vento a 500hPa (~5500m)
    const windSpeed500hPa = windSpeed * (4.0 + Math.random() * 0.5);
    const windDir500hPa = (windDir + 70 + Math.random() * 10) % 360;
    
    // Precipitazione: probabile se nuvolosità > 70%
    const precipProb = cloudCover > 70 ? (cloudCover - 70) * 0.5 + Math.random() * 20 : Math.random() * 10;
    const precipitation = cloudCover > 80 ? Math.random() * precipProb / 100 : 0;
    const rain = precipitation > 0.1 ? precipitation : 0;
    
    // Pressione: ciclo diurno semidiurno (tipico delle Alpi)
    const pressure = 1013.25 + Math.sin((hour - 4) * Math.PI / 12) * 3 + (Math.random() - 0.5) * 2;
    // Pressione ridotta al livello del mare
    const surfacePressure = pressure - altitude * 0.12; // ~12 hPa per km
    
    // Freezing level: dipende dalla temperatura al suolo
    const freezingLevel = altitude + (temp / LAPSE_RATE_DRY) * 100;
    
    // Visibilità: ridotta con nuvolosità e pioggia
    const visibility = precipitation > 0.1 
      ? clamp(2000 + Math.random() * 3000, 500, 10000) 
      : clamp(8000 + cloudCover * 20 + Math.random() * 2000, 3000, 15000);
    
    // Sunshine duration (ore di sole effettive)
    const sunshineDuration = cloudCover < 30 ? 1.0 : cloudCover < 60 ? 0.5 : 0.1;
    
    // Code meteo (WMO)
    let weatherCode = 0;
    if (precipitation > 0.5) weatherCode = 61;
    else if (precipitation > 0.1) weatherCode = 51;
    else if (cloudCover > 85) weatherCode = 45;
    else if (cloudCover > 70) weatherCode = 3;
    else if (cloudCover > 50) weatherCode = 2;
    else if (cloudCover > 25) weatherCode = 1;
    
    // IsDay
    const isDay = hour >= 6 && hour <= 20;
    
    hourly.push({
      time,
      temperature: Math.round(temp * 10) / 10,
      humidity: Math.round(humidity * 10) / 10,
      dewPoint: Math.round(dewPoint * 10) / 10,
      precipitation: Math.round(precipitation * 100) / 100,
      precipitationProbability: Math.round(precipProb),
      weatherCode,
      cloudCover: Math.round(cloudCover),
      cloudCoverLow: Math.round(cloudLow),
      cloudCoverMid: Math.round(cloudMid),
      cloudCoverHigh: Math.round(cloudHigh),
      windSpeed: Math.round(windSpeed * 10) / 10,
      windDir: Math.round(windDir),
      windGusts: Math.round(windGusts * 10) / 10,
      cape: Math.round(cape),
      liftedIndex: Math.round(liftedIndex * 10) / 10,
      shortwaveRadiation: Math.round(radiation),
      directRadiation: Math.round(directRadiation),
      uvIndex: Math.round(uvIndex * 10) / 10,
      visibility: Math.round(visibility),
      feelsLike: Math.round((temp + windSpeed * 0.1) * 10) / 10,
      pressure: Math.round(pressure * 10) / 10,
      surfacePressure: Math.round(surfacePressure * 10) / 10,
      rain,
      snowfall: 0,
      vapourPressureDeficit: Math.round(spread * 0.6 * 10) / 10,
      isDay,
      freezingLevel: Math.round(freezingLevel),
      sunshineDuration,
      mixingRatio: Math.round(humidity * 0.006 * temp * 10) / 10,
      virtualTemp: Math.round((temp + 273) * 10) / 10,
      temp80m: Math.round(temp80m * 10) / 10,
      temp120m: Math.round(temp120m * 10) / 10,
      apparentTemp: Math.round((temp + windSpeed * 0.1) * 10) / 10,
      precipitationProba: Math.round(precipProb),
      evapotranspiration: Math.round(radiation * 0.002 * 100) / 100,
      et0: Math.round(radiation * 0.0015 * 100) / 100,
      soilTemp: Math.round((temp - 2) * 10) / 10,
      soilMoisture: Math.round(humidity * 0.5),
      diffuseRadiation: Math.round(radiation * 0.3),
      directNormalIrradiance: Math.round(directRadiation),
      terrestrialRadiation: Math.round(radiation * 0.15),
      radiation: Math.round(radiation),
      cin: Math.round(cin),
      windSpeed925: null,
      windDir925: null,
      windSpeed850: Math.round(windSpeed850hPa * 10) / 10,
      windDir850: Math.round(windDir850hPa),
      windSpeed700: Math.round(windSpeed700hPa * 10) / 10,
      windDir700: Math.round(windDir700hPa),
      windSpeed600: null,
      windDir600: null,
      windSpeed500: Math.round(windSpeed500hPa * 10) / 10,
      windDir500: Math.round(windDir500hPa),
      windSpeed80m: Math.round(windSpeed80m * 10) / 10,
      windDir80m: Math.round(windDir80m),
      windSpeed120m: Math.round(windSpeed120m * 10) / 10,
      windDir120m: Math.round(windDir120m),
      windSpeed180m: Math.round(windSpeed180m * 10) / 10,
      windDir180m: Math.round(windDir180m),
      windSpeed850hPa: Math.round(windSpeed850hPa * 10) / 10,
      windDir850hPa: Math.round(windDir850hPa),
      windSpeed700hPa: Math.round(windSpeed700hPa * 10) / 10,
      windDir700hPa: Math.round(windDir700hPa),
      windSpeed600hPa: null,
      windDir600hPa: null,
      windSpeed500hPa: Math.round(windSpeed500hPa * 10) / 10,
      windDir500hPa: Math.round(windDir500hPa),
    });
  }
  
  return hourly;
}

// ===== GENERAZIONE DATI GIORNALIERI =====
export function generateRealisticDaily(
  lat: number,
  lon: number,
  altitude: number,
  startFrom: Date
): MeteoDaily[] {
  const monthlyAmp = diurnalTempAmplitude(startFrom.getMonth() + 1, lat);
  const baseTemp = 22 - monthlyAmp / 2 - altitude * 0.006;
  
  const daily: MeteoDaily[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startFrom);
    date.setDate(startFrom.getDate() + i);
    
    // Temperatura: trend leggermente variabile giorno per giorno
    const dayVariation = Math.sin(i * 0.8) * 3;
    const tMin = baseTemp - monthlyAmp / 2 + dayVariation - 2;
    const tMax = baseTemp + monthlyAmp / 2 + dayVariation + 2;
    
    // Precipitazioni: più probabili nel pomeriggio estivo
    const precipProb = i < 3 ? Math.random() * 0.2 : Math.random() * 0.5;
    const precipitationSum = Math.max(0, (Math.random() - precipProb) * 5);
    
    // Vento medio
    const windSpeedMax = 10 + Math.random() * 15 + (i > 3 ? 5 : 0);
    const windGustsMax = windSpeedMax * (1.3 + Math.random() * 0.3);
    
    // UV index massimo (giornata serena)
    const uvMax = clamp(5 + Math.random() * 4 - i * 0.3, 1, 11);
    
    // sunrise/sunset in funzione della latitudine e giorno dell'anno
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
    const declination = 23.45 * Math.sin(((360 / 365) * (dayOfYear - 81)) * Math.PI / 180);
    const latRad = lat * Math.PI / 180;
    const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(declination * Math.PI / 180)) * 180 / Math.PI;
    const sunriseH = 12 - hourAngle / 15;
    const sunsetH = 12 + hourAngle / 15;
    const sunrise = `${String(Math.floor(sunriseH)).padStart(2, '0')}:${String(Math.floor((sunriseH % 1) * 60)).padStart(2, '0')}`;
    const sunset = `${String(Math.floor(sunsetH)).padStart(2, '0')}:${String(Math.floor((sunsetH % 1) * 60)).padStart(2, '0')}`;
    
    const daylightDuration = (sunsetH - sunriseH) * 60; // minuti
    const sunshineDuration = daylightDuration * (0.4 + Math.random() * 0.3);
    
    daily.push({
      date,
      weatherCode: precipitationSum > 2 ? 61 : precipitationSum > 0.5 ? 51 : 2,
      tempMax: Math.round(tMax * 10) / 10,
      tempMin: Math.round(tMin * 10) / 10,
      precipitationSum: Math.round(precipitationSum * 10) / 10,
      precipitationProbabilityMax: Math.round(clamp(precipProb * 100 + Math.random() * 20, 0, 100)),
      windSpeedMax: Math.round(windSpeedMax * 10) / 10,
      windGustsMax: Math.round(windGustsMax * 10) / 10,
      windDirDominant: Math.round(200 + Math.random() * 60),
      uvIndexMax: Math.round(uvMax * 10) / 10,
      sunrise,
      sunset,
      temperatureMax: Math.round(tMax * 10) / 10,
      temperatureMin: Math.round(tMin * 10) / 10,
      temperatureMean: Math.round((tMax + tMin) / 2 * 10) / 10,
      apparentTempMax: Math.round((tMax + 1) * 10) / 10,
      apparentTempMin: Math.round((tMin - 1) * 10) / 10,
      daylightDuration: Math.round(daylightDuration),
      sunshineDuration: Math.round(sunshineDuration),
      rainSum: Math.round(precipitationSum * 0.9 * 10) / 10,
      snowfallSum: tMin < 0 ? Math.round(Math.random() * 2 * 10) / 10 : 0,
      precipitationHours: precipitationSum > 0.5 ? Math.round(1 + Math.random() * 3) : 0,
      shortwaveRadiationSum: Math.round((15 + Math.random() * 5) * 100),
    });
  }
  
  return daily;
}

// ===== DATI CORRENTI =====
export function generateRealisticCurrent(
  lat: number,
  lon: number,
  altitude: number,
  hourlyData: MeteoHourly[]
): MeteoCurrent | null {
  if (hourlyData.length === 0) return null;
  
  const now = new Date();
  const currentHour = now.getHours();
  const idx = hourlyData.findIndex(h => h.time.getHours() === currentHour);
  const ref = hourlyData[Math.max(0, idx)];
  
  if (!ref) return null;
  
  const t = ref.temperature ?? 18;
  const h = ref.humidity ?? 50;
  const dew = ref.dewPoint ?? t - 8;
  
  return {
    time: now,
    temperature: Math.round(t * 10) / 10,
    humidity: Math.round(h * 10) / 10,
    dewPoint: Math.round(dew * 10) / 10,
    precipitation: ref.precipitation ?? 0,
    weatherCode: ref.weatherCode ?? 0,
    cloudCover: ref.cloudCover ?? 30,
    windSpeed: Math.round(ref.windSpeed * 10) / 10,
    windDir: ref.windDir ?? 200,
    windGusts: Math.round(ref.windGusts * 10) / 10,
    cape: ref.cape ?? 0,
    apparentTemp: Math.round((t + ref.windSpeed * 0.1) * 10) / 10,
    uvIndex: ref.uvIndex ?? 0,
    visibility: ref.visibility ?? 10000,
    pressure: ref.pressure ?? null,
    surfacePressure: ref.surfacePressure ?? null,
    liftedIndex: ref.liftedIndex ?? null,
    cin: ref.cin ?? null,
    isDay: ref.isDay ? 1 : 0,
  };
}
