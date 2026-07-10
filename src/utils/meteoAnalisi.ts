"use client";
import type { Decollo } from "@/data/decolli";
import { getWindDirection, getWindArrow, getCloudCondition, getThermalIndex, getWeatherIcon, calculateWindShear, getWindProfile } from "./meteoUtils";

interface HourData {
  time: Date;
  temperature: number;
  dewPoint: number;
  humidity: number;
  cloudCover: number;
  precipitation: number;
  visibility: number;
  windSpeed: number;
  windGust: number;
  windDir: number;
  wind80m: number | null;
  windDir80m: number | null;
  wind120m: number | null;
  windDir120m: number | null;
  uvIndex: number;
  isDay: number;
  weatherCode: number;
  pressure: number;
}

interface DailyData {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  sunrise: Date;
  sunset: Date;
  uvMax: number;
  precipitationSum: number;
  precipitationHours: number;
  windMax: number;
  windDirDominant: number;
}

interface ThermalProfile {
  cloudBase: number;
  thermalTop: number;
  nbl: number;
  verticalIntensity: number;
  soarIndex: number;
  thermalDelta: number;
  avgTemp: number;
  maxTemp: number;
  minTemp: number;
  avgCloud: number;
  avgHumidity: number;
  hourlyProfile: Array<{
    hour: number;
    temperature: number;
    intensity: number;
    cloudBase: number;
    thermalTop: number;
    windSpeed: number;
    windDir: number;
    cloudCover: number;
  }>;
}

interface MeteoData {
  hourly: HourData[];
  daily: DailyData[];
}

export function generateGeneralDescription(dayData: HourData[], site: Decollo) {
  const temps = dayData.map(h => h.temperature).filter(t => t !== undefined);
  if (temps.length === 0) return "Dati insufficienti per l'analisi.";
  
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const avgCloud = dayData.reduce((sum, h) => sum + h.cloudCover, 0) / dayData.length;
  const maxWind = Math.max(...dayData.map(h => h.windSpeed));
  const hasRain = dayData.some(h => h.precipitation > 0.5);
  const totalRain = dayData.reduce((sum, h) => sum + h.precipitation, 0);
  
  let desc = `📋 PANORAMICA GENERALE\n\n`;
  desc += `🌅 La giornata al decollo di ${site.name} si presenta `;
  
  if (avgCloud < 30) desc += `con cielo prevalentemente sereno e temperature tra ${Math.round(minTemp)}°C e ${Math.round(maxTemp)}°C (media ${Math.round(avgTemp)}°C). `;
  else if (avgCloud < 60) desc += `con cielo parzialmente nuvoloso e temperature tra ${Math.round(minTemp)}°C e ${Math.round(maxTemp)}°C. `;
  else desc += `con cielo nuvoloso e temperature fresche tra ${Math.round(minTemp)}°C e ${Math.round(maxTemp)}°C. `;
  
  if (maxWind > 25) desc += `💨 Attenzione al vento che raggiungerà ${Math.round(maxWind)} km/h. `;
  else if (maxWind > 15) desc += `💨 Vento moderato fino a ${Math.round(maxWind)} km/h. `;
  else desc += `💨 Vento debole fino a ${Math.round(maxWind)} km/h. `;
  
  if (hasRain) desc += `🌧️ Precipitazioni previste (${Math.round(totalRain)} mm), valutare attentamente. `;
  else desc += `✅ Nessuna precipitazione prevista. `;
  
  desc += `📍 Il sito è esposto a ${site.exposure}.`;
  return desc;
}

export function generateThermalAnalysis(dayData: HourData[], thermalProfile: ThermalProfile | null, site: Decollo) {
  if (!thermalProfile) return "Dati insufficienti per l'analisi termica.";
  
  const { cloudBase, thermalTop, nbl, verticalIntensity, soarIndex, thermalDelta, avgTemp, avgCloud } = thermalProfile;
  
  let desc = `🔥 ANALISI TERMICHE VERTICALI\n\n`;
  desc += `📊 Dati termici:\n`;
  desc += `   • Temperatura media: ${Math.round(avgTemp)}°C\n`;
  desc += `   • Delta termico: ${thermalDelta}°C\n`;
  desc += `   • Nuvolosità media: ${Math.round(avgCloud)}%\n\n`;
  
  desc += `📈 Profilo verticale delle termiche:\n`;
  desc += `   • Base delle nuvole (Cloud Base): ${cloudBase}m\n`;
  desc += `   • Plafond termico massimo: ${thermalTop}m\n`;
  desc += `   • Livello di galleggiamento (NBL): ${nbl}m\n`;
  desc += `   • Intensità termica verticale: ${verticalIntensity} m/s\n`;
  desc += `   • Indice di galleggiamento (Soaring Index): ${soarIndex}/10\n\n`;
  
  if (soarIndex >= 7) desc += `🪂 **Galleggiamento eccellente!** Condizioni ideali per rimanere in aria a lungo.\n`;
  else if (soarIndex >= 5) desc += `🪂 **Buon galleggiamento.** Condizioni favorevoli per voli di media durata.\n`;
  else if (soarIndex >= 3) desc += `🪂 **Galleggiamento limitato.** Voli più brevi, termiche deboli.\n`;
  else desc += `🪂 **Galleggiamento scarso.** Condizioni difficili per rimanere in quota.\n`;
  
  desc += `\n⏰ Sviluppo verticale orario:\n`;
  thermalProfile.hourlyProfile.forEach(h => {
    const icon = h.intensity > 2 ? '🔥' : h.intensity > 1 ? '💪' : '🫤';
    desc += `   • ${String(h.hour).padStart(2, '0')}:00 → ${icon} intensità ${h.intensity}m/s, base nuvole ${h.cloudBase}m\n`;
  });
  
  return desc;
}

export function generateWindAnalysis(dayData: HourData[], site: Decollo, windProfileData: ReturnType<typeof getWindProfile> | null) {
  const windData = dayData.filter(h => h.time.getHours() >= 9 && h.time.getHours() <= 19);
  if (windData.length === 0) return "Dati vento non disponibili.";
  
  const avgSpeed = windData.reduce((sum, h) => sum + h.windSpeed, 0) / windData.length;
  const maxSpeed = Math.max(...windData.map(h => h.windSpeed));
  const maxGust = Math.max(...windData.map(h => h.windGust));
  const avgDir = windData.reduce((sum, h) => sum + h.windDir, 0) / windData.length;
  const dominantDir = getWindDirection(avgDir);
  
  let desc = `💨 ANALISI DEL VENTO\n\n`;
  desc += `📊 Vento superficiale (10m):\n`;
  desc += `   • Velocità media: ${Math.round(avgSpeed)} km/h\n`;
  desc += `   • Raffica massima: ${Math.round(maxGust)} km/h\n`;
  desc += `   • Direzione dominante: ${dominantDir}\n`;
  
  const expDirs = site.exposure.split('/').map(d => d.trim());
  const isFav = expDirs.some(exp => dominantDir === exp || dominantDir === exp + 'E' || dominantDir === exp + 'W');
  desc += `   • Rispetto al sito: ${isFav ? '✅ Favorevole' : '⚠️ Non favorevole'}\n\n`;
  
  const has80m = windData.some(h => h.wind80m !== null);
  const has120m = windData.some(h => h.wind120m !== null);
  
  if (has80m) {
    const avg80 = windData.filter(h => h.wind80m !== null).reduce((sum, h) => sum + h.wind80m, 0) / windData.filter(h => h.wind80m !== null).length;
    desc += `📊 Vento a 80m (quota termica):\n`;
    desc += `   • Velocità media: ${Math.round(avg80)} km/h\n`;
    desc += `   • Differenza: ${Math.round(avg80 - avgSpeed)} km/h\n\n`;
  }
  
  if (has120m) {
    const avg120 = windData.filter(h => h.wind120m !== null).reduce((sum, h) => sum + h.wind120m, 0) / windData.filter(h => h.wind120m !== null).length;
    desc += `📊 Vento a 120m (alta quota):\n`;
    desc += `   • Velocità media: ${Math.round(avg120)} km/h\n`;
    desc += `   • Differenza: ${Math.round(avg120 - avgSpeed)} km/h\n\n`;
  }
  
  if (windProfileData) {
    desc += `📊 Profilo vento completo (400m - 4000m):\n`;
    const shear = calculateWindShear(windProfileData);
    desc += `   • Shear calcolato: ${shear.shear}\n`;
    desc += `   • Variazione velocità: ${shear.speedShear} km/h\n`;
    desc += `   • Variazione direzione: ${shear.dirShear}°\n`;
    desc += `   • ${shear.description}\n`;
  }
  
  return desc;
}

export function generateAltitudeAnalysis(dayData: HourData[], thermalProfile: ThermalProfile | null, site: Decollo) {
  if (!thermalProfile) return "Dati insufficienti per l'analisi delle quote.";
  
  const { cloudBase, thermalTop, nbl, soarIndex, thermalDelta } = thermalProfile;
  
  let desc = `🏔️ ANALISI QUOTE E PLAFOND\n\n`;
  desc += `📊 Quote stimate:\n`;
  desc += `   • Base decollo: ${site.altitude || 1500}m\n`;
  desc += `   • Base delle nuvole: ${cloudBase}m\n`;
  desc += `   • Plafond termico massimo: ${thermalTop}m\n`;
  desc += `   • Livello di galleggiamento: ${nbl}m\n`;
  desc += `   • Delta termico: ${thermalDelta}°C\n\n`;
  
  if (soarIndex >= 7 && thermalTop > 3000) desc += `✅ **Cross Country:** ⭐ Eccellente! Termiche forti e plafond elevato.\n`;
  else if (soarIndex >= 5 && thermalTop > 2500) desc += `👍 **Cross Country:** Buone condizioni per voli di distanza.\n`;
  else if (soarIndex >= 3) desc += `🫤 **Cross Country:** Condizioni limitate.\n`;
  else desc += `❌ **Cross Country:** Sconsigliato, termiche deboli.\n`;
  
  if (soarIndex >= 7) desc += `🪂 **Galleggiamento:** Eccellente! Puoi rimanere in aria a lungo.\n`;
  else if (soarIndex >= 5) desc += `🪂 **Galleggiamento:** Buono, voli di media durata.\n`;
  else desc += `🪂 **Galleggiamento:** Limitato, voli brevi.\n`;
  
  return desc;
}

export function generateFlightAdvice(dayData: HourData[], site: Decollo, thermalProfile: ThermalProfile | null, windProfileData: ReturnType<typeof getWindProfile> | null) {
  if (dayData.length === 0) return "Dati insufficienti per i consigli di volo.";
  
  const maxWind = Math.max(...dayData.map(h => h.windSpeed));
  const maxGust = Math.max(...dayData.map(h => h.windGust));
  const avgCloud = dayData.reduce((sum, h) => sum + h.cloudCover, 0) / dayData.length;
  const hasRain = dayData.some(h => h.precipitation > 0.5);
  const soarIndex = thermalProfile?.soarIndex || 0;
  
  let desc = `💡 CONSIGLI PER IL VOLO\n\n`;
  
  let riskScore = 0;
  if (maxWind > 25) riskScore += 2;
  if (maxGust > 35) riskScore += 2;
  if (avgCloud > 80) riskScore += 1;
  if (hasRain) riskScore += 2;
  if (soarIndex < 3) riskScore += 1;
  
  if (windProfileData) {
    const shear = calculateWindShear(windProfileData);
    if (shear.risk === 'alto') riskScore += 2;
    else if (shear.risk === 'medio') riskScore += 1;
  }
  
  desc += `📊 Valutazione del rischio: `;
  if (riskScore >= 5) desc += `🔴 ALTO - Condizioni pericolose, sconsigliato volare.\n`;
  else if (riskScore >= 3) desc += `🟡 MEDIO - Condizioni impegnative.\n`;
  else desc += `🟢 BASSO - Condizioni favorevoli.\n`;
  desc += `\n`;
  
  desc += `📌 Consigli specifici:\n`;
  if (maxWind > 25) desc += `   • ⚠️ VENTO FORTE (>25 km/h): Volo sconsigliato.\n`;
  else if (maxWind > 18) desc += `   • ⚠️ Vento sostenuto (18-25 km/h).\n`;
  else if (maxWind < 5) desc += `   • 💨 Vento debole (<5 km/h): Possibili difficoltà di decollo.\n`;
  else desc += `   • ✅ Vento ideale (5-18 km/h).\n`;
  
  if (soarIndex >= 7) desc += `   • 🔥 Termiche forti: Ottime per cross.\n`;
  else if (soarIndex >= 5) desc += `   • 💪 Termiche medie: Buona attività.\n`;
  else desc += `   • 🫤 Termiche deboli: Voli locali.\n`;
  
  if (windProfileData) {
    const shear = calculateWindShear(windProfileData);
    desc += `   • ${shear.description}\n`;
  }
  
  desc += `\n⏰ Momenti migliori:\n`;
  const goodHours = dayData.filter(h => {
    const hour = h.time.getHours();
    return hour >= 10 && hour <= 17 && h.windSpeed < 22 && h.cloudCover < 70 && h.precipitation < 0.5;
  });
  
  if (goodHours.length > 0) {
    const hours = goodHours.map(h => `${String(h.time.getHours()).padStart(2, '0')}:00`).join(', ');
    desc += `   • 🕐 ${hours}\n`;
  } else {
    desc += `   • ⚠️ Nessuna ora ottimale identificata.\n`;
  }
  
  desc += `\n🎯 Consiglio finale: `;
  if (riskScore < 3 && !hasRain && maxWind < 22) desc += `Condizioni favorevoli! Divertiti! 🪂\n`;
  else if (riskScore < 5) desc += `Valuta attentamente. ⚠️\n`;
  else desc += `Sconsigliato volare oggi. ❌\n`;
  
  return desc;
}

export function generateHourlyBreakdown(dayData: HourData[], thermalProfile: ThermalProfile | null) {
  if (dayData.length === 0) return "Dati insufficienti.";
  
  let desc = `⏰ SVOLGIMENTO DELLA GIORNATA (9:00 - 19:00)\n\n`;
  
  for (let hour = 9; hour <= 19; hour++) {
    const data = dayData.find(h => h.time.getHours() === hour);
    if (!data) continue;
    
    const weatherIcon = getWeatherIcon(data.weatherCode || 0, data.isDay);
    const cloud = getCloudCondition(data.cloudCover);
    const windDir = getWindDirection(data.windDir);
    const thermal = getThermalIndex(data.temperature, data.cloudCover, data.humidity, 0);
    
    const profile = thermalProfile?.hourlyProfile?.find(h => h.hour === hour);
    const intensity = profile ? profile.intensity : 0;
    const cloudBase = profile ? profile.cloudBase : '--';
    
    desc += `🕐 ${String(hour).padStart(2, '0')}:00 ${weatherIcon} ${Math.round(data.temperature)}°C\n`;
    desc += `   • Vento: ${getWindArrow(data.windDir)} ${Math.round(data.windSpeed)} km/h (${windDir})\n`;
    desc += `   • Nuvolosità: ${cloud.icon} ${Math.round(data.cloudCover)}%\n`;
    desc += `   • Termiche: ${thermal.icon} ${thermal.level} (intensità ${intensity}m/s, base ${cloudBase}m)\n`;
    if (data.precipitation > 0.5) desc += `   • 🌧️ Pioggia: ${Math.round(data.precipitation)} mm/h\n`;
    if (hour < 19) desc += `\n`;
  }
  
  return desc;
}

export function generateSiteInfo(site: Decollo) {
  let desc = `📍 INFORMAZIONI SITO\n\n`;
  desc += `🏔️ **${site.name}**\n`;
  desc += `   • Altitudine: ${site.altitude || 'N/D'}m\n`;
  desc += `   • Esposizione: ${site.exposure}\n`;
  desc += `   • Valle: ${site.valley}\n`;
  desc += `   • Difficoltà: ${site.difficulty <= 2 ? '🟢 Facile' : site.difficulty <= 3 ? '🟡 Medio' : '🔴 Difficile'}\n`;
  desc += `   • ${site.description || ''}\n`;
  desc += `   • Parcheggio: ${site.parking || 'N/D'}\n`;
  desc += `   • Decollo: ${site.takeoff || 'N/D'}\n`;
  return desc;
}

export function generatePressureAnalysis(dayData: HourData[]) {
  const pressures = dayData.filter(h => h.pressure !== undefined).map(h => h.pressure);
  if (pressures.length === 0) return "Dati pressione non disponibili.";
  
  const avgPressure = pressures.reduce((a, b) => a + b, 0) / pressures.length;
  const maxPressure = Math.max(...pressures);
  const minPressure = Math.min(...pressures);
  const trend = pressures[pressures.length - 1] - pressures[0];
  
  let desc = `📊 ANALISI PRESSIONE\n\n`;
  desc += `   • Pressione media: ${Math.round(avgPressure)} hPa\n`;
  desc += `   • Minima: ${Math.round(minPressure)} hPa\n`;
  desc += `   • Massima: ${Math.round(maxPressure)} hPa\n`;
  desc += `   • Trend: ${trend > 0 ? '⬆️ In aumento' : trend < 0 ? '⬇️ In diminuzione' : '➡️ Stabile'}\n`;
  
  if (trend < -3) desc += `   ⚠️ Pressione in rapida diminuzione - possibile peggioramento meteo!\n`;
  else if (trend > 3) desc += `   ✅ Pressione in aumento - miglioramento meteo in arrivo.\n`;
  
  return desc;
}

export function generateThunderstormAlert(dayData: HourData[]) {
  const hasThunderstorm = dayData.some(h => h.weatherCode >= 95 && h.weatherCode <= 99);
  const hasRain = dayData.some(h => h.precipitation > 0.5);
  const cloudCover = dayData.reduce((sum, h) => sum + h.cloudCover, 0) / dayData.length;
  
  let desc = `⛈️ ALLERTA TEMPORALI\n\n`;
  
  if (hasThunderstorm) {
    desc += `🔴 **ALLERTA TEMPORALI IN CORSO!**\n`;
    desc += `   • Temporali previsti nella giornata.\n`;
    desc += `   • VOLO SCONSIGLIATO - Pericolo di fulmini e turbolenze!\n`;
  } else if (hasRain && cloudCover > 70) {
    desc += `🟡 ATTENZIONE: Possibili temporali nelle ore centrali.\n`;
    desc += `   • Monitorare l'evoluzione delle nuvole.\n`;
    desc += `   • Prepararsi ad un eventuale rientro anticipato.\n`;
  } else if (cloudCover > 60) {
    desc += `🟢 Nessun temporale previsto.\n`;
    desc += `   • Nuvolosità significativa ma senza temporali.\n`;
  } else {
    desc += `✅ Nessun temporale previsto.\n`;
    desc += `   • Cielo sereno o poco nuvoloso.\n`;
  }
  
  return desc;
}

export function generateAIAnalysis(meteoData: MeteoData, site: Decollo, dayData: HourData[], thermalProfile: ThermalProfile | null, windProfileData: ReturnType<typeof getWindProfile> | null) {
  if (!meteoData || !dayData || dayData.length === 0) return null;
  
  return {
    general: generateGeneralDescription(dayData, site),
    thermal: generateThermalAnalysis(dayData, thermalProfile, site),
    wind: generateWindAnalysis(dayData, site, windProfileData),
    altitude: generateAltitudeAnalysis(dayData, thermalProfile, site),
    hourly: generateHourlyBreakdown(dayData, thermalProfile),
    advice: generateFlightAdvice(dayData, site, thermalProfile, windProfileData),
    siteInfo: generateSiteInfo(site),
    pressure: generatePressureAnalysis(dayData),
    thunderstorm: generateThunderstormAlert(dayData),
  };
}