"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DECOLLI } from "@/data/decolli";

/* ============================
   FETCH METEO COMPLETA
   ============================ */

async function fetchMeteoCompleta(lat: number, lon: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,dewpoint_2m,relativehumidity_2m,cloudcover,precipitation,visibility,` +
    `wind_speed_10m,wind_gusts_10m,wind_direction_10m,` +
    `wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,` +
    `uv_index,is_day,weathercode,pressure_msl` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,` +
    `uv_index_max,precipitation_sum,precipitation_hours,` +
    `wind_speed_10m_max,wind_direction_10m_dominant` +
    `&timezone=auto&forecast_days=3`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    const hourlyData = data.hourly.time.map((time: string, index: number) => ({
      time: new Date(time),
      temperature: data.hourly.temperature_2m[index],
      dewPoint: data.hourly.dewpoint_2m[index],
      humidity: data.hourly.relativehumidity_2m[index],
      cloudCover: data.hourly.cloudcover[index],
      precipitation: data.hourly.precipitation[index] || 0,
      visibility: data.hourly.visibility ? data.hourly.visibility[index] / 1000 : 40,
      windSpeed: data.hourly.wind_speed_10m[index],
      windGust: data.hourly.wind_gusts_10m ? data.hourly.wind_gusts_10m[index] : data.hourly.wind_speed_10m[index] + 8,
      windDir: data.hourly.wind_direction_10m[index],
      wind80m: data.hourly.wind_speed_80m ? data.hourly.wind_speed_80m[index] : null,
      windDir80m: data.hourly.wind_direction_80m ? data.hourly.wind_direction_80m[index] : null,
      wind120m: data.hourly.wind_speed_120m ? data.hourly.wind_speed_120m[index] : null,
      windDir120m: data.hourly.wind_direction_120m ? data.hourly.wind_direction_120m[index] : null,
      uvIndex: data.hourly.uv_index ? data.hourly.uv_index[index] : 0,
      isDay: data.hourly.is_day ? data.hourly.is_day[index] : 1,
      weatherCode: data.hourly.weathercode ? data.hourly.weathercode[index] : 0,
      pressure: data.hourly.pressure_msl ? data.hourly.pressure_msl[index] : 1013,
    }));

    const dailyData = data.daily.time.map((date: string, index: number) => ({
      date: new Date(date),
      weatherCode: data.daily.weathercode[index],
      tempMax: data.daily.temperature_2m_max[index],
      tempMin: data.daily.temperature_2m_min[index],
      sunrise: new Date(data.daily.sunrise[index]),
      sunset: new Date(data.daily.sunset[index]),
      uvMax: data.daily.uv_index_max[index],
      precipitationSum: data.daily.precipitation_sum[index],
      precipitationHours: data.daily.precipitation_hours[index],
      windMax: data.daily.wind_speed_10m_max[index],
      windDirDominant: data.daily.wind_direction_10m_dominant[index],
    }));

    return { hourly: hourlyData, daily: dailyData };
  } catch (error) {
    console.error("Errore fetch meteo:", error);
    throw error;
  }
}

/* ============================
   UTILITY METEO
   ============================ */

function getWeatherIcon(code: number, isDay: number): string {
  const icons: Record<number, string> = {
    0: isDay ? "☀️" : "🌙",
    1: "🌤️",
    2: "⛅",
    3: "☁️",
    45: "🌫️",
    48: "🌫️",
    51: "🌦️",
    53: "🌧️",
    55: "🌧️",
    61: "🌧️",
    63: "🌧️",
    65: "🌧️",
    71: "❄️",
    73: "❄️",
    75: "❄️",
    80: "🌧️",
    81: "🌧️",
    82: "⛈️",
    95: "⛈️",
    96: "⛈️",
    99: "⛈️",
  };
  return icons[code] || (isDay ? "☀️" : "🌙");
}

function getWindDirection(degrees: number): string {
  if (degrees === undefined || degrees === null) return "--";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
}

function getWindArrow(degrees: number): string {
  if (degrees === undefined || degrees === null) return "⬇️";
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(degrees / 45) % 8];
}

function getCloudCondition(cloudCover: number): { text: string; icon: string; color: string } {
  if (cloudCover < 20) return { text: "Sereno", icon: "☀️", color: "#ffd93d" };
  if (cloudCover < 40) return { text: "Poco nuvoloso", icon: "🌤️", color: "#f9a825" };
  if (cloudCover < 60) return { text: "Nuvoloso", icon: "⛅", color: "#90a4ae" };
  if (cloudCover < 80) return { text: "Molto nuvoloso", icon: "☁️", color: "#78909c" };
  return { text: "Coperto", icon: "☁️", color: "#546e7a" };
}

function getThermalIndex(temp: number, cloud: number, humidity: number, delta: number): { level: string; icon: string; color: string; desc: string } {
  let score = 0;
  if (temp > 22) score += 2;
  else if (temp > 18) score += 1;
  if (cloud < 30) score += 2;
  else if (cloud < 50) score += 1;
  if (humidity < 50) score += 1;
  if (delta > 10) score += 2;
  else if (delta > 6) score += 1;

  if (score >= 6) return { level: "Forte", icon: "🔥", color: "#ff1744", desc: "Ottima attività termica" };
  if (score >= 4) return { level: "Media", icon: "💪", color: "#ff6d00", desc: "Buona attività termica" };
  if (score >= 2) return { level: "Debole", icon: "🫤", color: "#ffd600", desc: "Termiche deboli" };
  return { level: "Assente", icon: "❄️", color: "#4fc3f7", desc: "Nessuna attività termica" };
}

/* ============================
   VENTO A QUOTE
   ============================ */

function getWindAtAltitude(surfaceWind: number, surfaceDir: number, altitude: number, surfaceAltitude = 10) {
  const heightFactor = 1 + (altitude - surfaceAltitude) * 0.0025;
  let windSpeed = surfaceWind * heightFactor;
  windSpeed = Math.min(windSpeed, surfaceWind * 3.5);

  let dirOffset = ((altitude - surfaceAltitude) / 1000) * 15;
  dirOffset = Math.min(dirOffset, 45);

  let windDir = surfaceDir + dirOffset;
  if (windDir > 360) windDir -= 360;
  if (windDir < 0) windDir += 360;

  return {
    altitude,
    speed: Math.round(windSpeed * 10) / 10,
    direction: Math.round(windDir),
    directionName: getWindDirection(windDir),
  };
}

function getWindProfile(surfaceWind: number, surfaceDir: number, minAlt = 400, maxAlt = 4000, step = 250) {
  const profile: ReturnType<typeof getWindAtAltitude>[] = [];
  for (let alt = minAlt; alt <= maxAlt; alt += step) {
    profile.push(getWindAtAltitude(surfaceWind, surfaceDir, alt));
  }
  profile.unshift({ altitude: 10, speed: surfaceWind, direction: surfaceDir, directionName: getWindDirection(surfaceDir) });
  return profile;
}

function calculateWindShear(profile: ReturnType<typeof getWindAtAltitude>[]) {
  if (profile.length < 2) return { shear: 0, description: "Dati insufficienti", risk: "basso", speedShear: 0, dirShear: 0, surfaceSpeed: 0, highSpeed: 0, surfaceDir: "--", highDir: "--" };

  const surface = profile[0];
  const highAlt = profile[profile.length - 1];

  const speedShear = highAlt.speed - surface.speed;
  const dirShear = highAlt.direction - surface.direction;
  let shearValue = Math.abs(speedShear) + Math.abs(dirShear) * 0.5;

  let description = "";
  let risk = "basso";

  if (shearValue > 30) {
    description = "⚠️ SHEAR MOLTO FORTE - Turbolenze significative, volo pericoloso!";
    risk = "alto";
  } else if (shearValue > 20) {
    description = "⚡ Shear forte - Possibili turbolenze, richiesta esperienza";
    risk = "medio";
  } else if (shearValue > 10) {
    description = "🌀 Shear moderato - Attenzione alle variazioni di vento";
    risk = "medio-basso";
  } else {
    description = "✅ Shear basso - Condizioni stabili, volo sicuro";
    risk = "basso";
  }

  return {
    shear: Math.round(shearValue * 10) / 10,
    speedShear: Math.round(speedShear * 10) / 10,
    dirShear: Math.round(dirShear * 10) / 10,
    description,
    risk,
    surfaceSpeed: surface.speed,
    highSpeed: highAlt.speed,
    surfaceDir: surface.directionName,
    highDir: highAlt.directionName,
  };
}

function getWindColor(speed: number, maxSpeed: number): string {
  const ratio = speed / maxSpeed;
  if (ratio < 0.3) return "#4caf50";
  if (ratio < 0.5) return "#8bc34a";
  if (ratio < 0.7) return "#ff9800";
  if (ratio < 0.9) return "#ff5722";
  return "#f44336";
}

/* ============================
   ANALISI TERMICHE
   ============================ */

function calculateThermalProfile(dayData: any[], siteElevation = 1500) {
  if (!dayData || dayData.length === 0) return null;

  const temps = dayData.map((h: any) => h.temperature).filter((t: any) => t !== undefined);
  if (temps.length === 0) return null;

  const avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const thermalDelta = Math.round(maxTemp - minTemp);
  const avgDew = dayData.reduce((sum: number, h: any) => sum + h.dewPoint, 0) / dayData.length;
  const avgCloud = dayData.reduce((sum: number, h: any) => sum + h.cloudCover, 0) / dayData.length;
  const avgHumidity = dayData.reduce((sum: number, h: any) => sum + h.humidity, 0) / dayData.length;

  const cloudBase = Math.round((avgTemp - avgDew) * 120 + siteElevation);
  const thermalTop = Math.round(siteElevation + thermalDelta * 100);
  const nbl = Math.round(siteElevation + thermalDelta * 80);
  const verticalIntensity = Math.round(((thermalDelta / 10) * 1.5) * 10) / 10;
  const soarIndex = Math.min(10, Math.round(thermalDelta / 2 + (avgCloud < 40 ? 2 : 0) + (avgHumidity < 50 ? 1 : 0)));

  return {
    cloudBase,
    thermalTop,
    nbl,
    verticalIntensity,
    soarIndex,
    thermalDelta,
    avgTemp,
    maxTemp,
    minTemp,
    avgCloud,
    avgHumidity,
    hourlyProfile: dayData
      .filter((h: any) => h.time.getHours() >= 9 && h.time.getHours() <= 19)
      .map((h: any) => {
        const hour = h.time.getHours();
        const delta = h.temperature - minTemp;
        const intensity = Math.round(((delta / 10) * 1.5) * 10) / 10;
        const localCloudBase = Math.round((h.temperature - h.dewPoint) * 120 + siteElevation);
        return {
          hour,
          temperature: h.temperature,
          intensity,
          cloudBase: localCloudBase,
          thermalTop: Math.round(siteElevation + delta * 100),
          windSpeed: h.windSpeed,
          windDir: h.windDir,
          cloudCover: h.cloudCover,
        };
      }),
  };
}

/* ============================
   ANALISI AI
   ============================ */

function generateAIAnalysis(dayData: any[], site: any, thermalProfile: any, windProfileData: any) {
  if (!dayData || dayData.length === 0) return null;

  const sections = {
    general: generateGeneralDescription(dayData, site),
    thermal: generateThermalAnalysis(dayData, thermalProfile, site),
    wind: generateWindAnalysis(dayData, site, windProfileData),
    altitude: generateAltitudeAnalysis(dayData, thermalProfile, site),
    hourly: generateHourlyBreakdown(dayData, thermalProfile),
    advice: generateFlightAdvice(dayData, site, thermalProfile, windProfileData),
    pressure: generatePressureAnalysis(dayData),
    thunderstorm: generateThunderstormAlert(dayData),
  };

  return sections;
}

function generateGeneralDescription(dayData: any[], site: any) {
  const temps = dayData.map((h: any) => h.temperature).filter((t: any) => t !== undefined);
  if (temps.length === 0) return "Dati insufficienti per l'analisi.";

  const avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const avgCloud = dayData.reduce((sum: number, h: any) => sum + h.cloudCover, 0) / dayData.length;
  const maxWind = Math.max(...dayData.map((h: any) => h.windSpeed));
  const hasRain = dayData.some((h: any) => h.precipitation > 0.5);

  let desc = `📋 PANORAMICA GENERALE\n\n`;
  desc += `🌅 La giornata al decollo di ${site.name} si presenta `;

  if (avgCloud < 30) desc += `con cielo prevalentemente sereno e temperature tra ${Math.round(minTemp)}°C e ${Math.round(maxTemp)}°C (media ${Math.round(avgTemp)}°C). `;
  else if (avgCloud < 60) desc += `con cielo parzialmente nuvoloso e temperature tra ${Math.round(minTemp)}°C e ${Math.round(maxTemp)}°C. `;
  else desc += `con cielo nuvoloso e temperature fresche tra ${Math.round(minTemp)}°C e ${Math.round(maxTemp)}°C. `;

  if (maxWind > 25) desc += `💨 Attenzione al vento che raggiungerà ${Math.round(maxWind)} km/h. `;
  else if (maxWind > 15) desc += `💨 Vento moderato fino a ${Math.round(maxWind)} km/h. `;
  else desc += `💨 Vento debole fino a ${Math.round(maxWind)} km/h. `;

  if (hasRain) desc += `🌧️ Precipitazioni previste, valutare attentamente. `;
  else desc += `✅ Nessuna precipitazione prevista. `;

  desc += `📍 Il sito è esposto a ${site.exposure}.`;
  return desc;
}

function generateThermalAnalysis(dayData: any[], thermalProfile: any, site: any) {
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
  thermalProfile.hourlyProfile.forEach((h: any) => {
    const icon = h.intensity > 2 ? "🔥" : h.intensity > 1 ? "💪" : "🫤";
    desc += `   • ${String(h.hour).padStart(2, "0")}:00 → ${icon} intensità ${h.intensity}m/s, base nuvole ${h.cloudBase}m\n`;
  });

  return desc;
}

function generateWindAnalysis(dayData: any[], site: any, windProfileData: any) {
  const windData = dayData.filter((h: any) => h.time.getHours() >= 9 && h.time.getHours() <= 19);
  if (windData.length === 0) return "Dati vento non disponibili.";

  const avgSpeed = windData.reduce((sum: number, h: any) => sum + h.windSpeed, 0) / windData.length;
  const maxSpeed = Math.max(...windData.map((h: any) => h.windSpeed));
  const maxGust = Math.max(...windData.map((h: any) => h.windGust));
  const avgDir = windData.reduce((sum: number, h: any) => sum + h.windDir, 0) / windData.length;
  const dominantDir = getWindDirection(avgDir);

  let desc = `💨 ANALISI DEL VENTO\n\n`;
  desc += `📊 Vento superficiale (10m):\n`;
  desc += `   • Velocità media: ${Math.round(avgSpeed)} km/h\n`;
  desc += `   • Raffica massima: ${Math.round(maxGust)} km/h\n`;
  desc += `   • Direzione dominante: ${dominantDir}\n`;

  const expDirs = site.exposure.split("/").map((d: string) => d.trim());
  const isFav = expDirs.some((exp: string) => dominantDir === exp || dominantDir === exp + "E" || dominantDir === exp + "W");
  desc += `   • Rispetto al sito: ${isFav ? "✅ Favorevole" : "⚠️ Non favorevole"}\n\n`;

  const has80m = windData.some((h: any) => h.wind80m !== null);
  const has120m = windData.some((h: any) => h.wind120m !== null);

  if (has80m) {
    const avg80 = windData.filter((h: any) => h.wind80m !== null).reduce((sum: number, h: any) => sum + h.wind80m, 0) / windData.filter((h: any) => h.wind80m !== null).length;
    desc += `📊 Vento a 80m (quota termica):\n`;
    desc += `   • Velocità media: ${Math.round(avg80)} km/h\n`;
    desc += `   • Differenza: ${Math.round(avg80 - avgSpeed)} km/h\n\n`;
  }

  if (has120m) {
    const avg120 = windData.filter((h: any) => h.wind120m !== null).reduce((sum: number, h: any) => sum + h.wind120m, 0) / windData.filter((h: any) => h.wind120m !== null).length;
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

function generateAltitudeAnalysis(dayData: any[], thermalProfile: any, site: any) {
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

function generateFlightAdvice(dayData: any[], site: any, thermalProfile: any, windProfileData: any) {
  if (dayData.length === 0) return "Dati insufficienti per i consigli di volo.";

  const maxWind = Math.max(...dayData.map((h: any) => h.windSpeed));
  const maxGust = Math.max(...dayData.map((h: any) => h.windGust));
  const avgCloud = dayData.reduce((sum: number, h: any) => sum + h.cloudCover, 0) / dayData.length;
  const hasRain = dayData.some((h: any) => h.precipitation > 0.5);
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
    if (shear.risk === "alto") riskScore += 2;
    else if (shear.risk === "medio") riskScore += 1;
  }

  desc += `📊 Valutazione del rischio: `;
  if (riskScore >= 5) {
    desc += `🔴 ALTO - Condizioni pericolose, sconsigliato volare.\n`;
  } else if (riskScore >= 3) {
    desc += `🟡 MEDIO - Condizioni impegnative.\n`;
  } else {
    desc += `🟢 BASSO - Condizioni favorevoli.\n`;
  }
  desc += `\n`;

  desc += `📌 Consigli specifici:\n`;

  if (maxWind > 25) {
    desc += `   • ⚠️ VENTO FORTE (>25 km/h): Volo sconsigliato.\n`;
  } else if (maxWind > 18) {
    desc += `   • ⚠️ Vento sostenuto (18-25 km/h).\n`;
  } else if (maxWind < 5) {
    desc += `   • 💨 Vento debole (<5 km/h): Possibili difficoltà di decollo.\n`;
  } else {
    desc += `   • ✅ Vento ideale (5-18 km/h).\n`;
  }

  if (soarIndex >= 7) {
    desc += `   • 🔥 Termiche forti: Ottime per cross.\n`;
  } else if (soarIndex >= 5) {
    desc += `   • 💪 Termiche medie: Buona attività.\n`;
  } else {
    desc += `   • 🫤 Termiche deboli: Voli locali.\n`;
  }

  if (windProfileData) {
    const shear = calculateWindShear(windProfileData);
    desc += `   • ${shear.description}\n`;
  }

  desc += `\n⏰ Momenti migliori:\n`;
  const goodHours = dayData.filter((h: any) => {
    const hour = h.time.getHours();
    return hour >= 10 && hour <= 17 && h.windSpeed < 22 && h.cloudCover < 70 && h.precipitation < 0.5;
  });

  if (goodHours.length > 0) {
    const hours = goodHours.map((h: any) => `${String(h.time.getHours()).padStart(2, "0")}:00`).join(", ");
    desc += `   • 🕐 ${hours}\n`;
  } else {
    desc += `   • ⚠️ Nessuna ora ottimale identificata.\n`;
  }

  desc += `\n🎯 Consiglio finale: `;
  if (riskScore < 3 && !hasRain && maxWind < 22) {
    desc += `Condizioni favorevoli! Divertiti! 🪂\n`;
  } else if (riskScore < 5) {
    desc += `Valuta attentamente. ⚠️\n`;
  } else {
    desc += `Sconsigliato volare oggi. ❌\n`;
  }

  return desc;
}

function generateHourlyBreakdown(dayData: any[], thermalProfile: any) {
  if (dayData.length === 0) return "Dati insufficienti.";

  let desc = `⏰ SVOLGIMENTO DELLA GIORNATA (9:00 - 19:00)\n\n`;

  for (let hour = 9; hour <= 19; hour++) {
    const data = dayData.find((h: any) => h.time.getHours() === hour);
    if (!data) continue;

    const weatherIcon = getWeatherIcon(data.weatherCode || 0, data.isDay);
    const cloud = getCloudCondition(data.cloudCover);
    const windDir = getWindDirection(data.windDir);
    const thermal = getThermalIndex(data.temperature, data.cloudCover, data.humidity, 0);

    const profile = thermalProfile?.hourlyProfile?.find((h: any) => h.hour === hour);
    const intensity = profile ? profile.intensity : 0;
    const cloudBase = profile ? profile.cloudBase : "--";

    desc += `🕐 ${String(hour).padStart(2, "0")}:00 ${weatherIcon} ${Math.round(data.temperature)}°C\n`;
    desc += `   • Vento: ${getWindArrow(data.windDir)} ${Math.round(data.windSpeed)} km/h (${windDir})\n`;
    desc += `   • Nuvolosità: ${cloud.icon} ${Math.round(data.cloudCover)}%\n`;
    desc += `   • Termiche: ${thermal.icon} ${thermal.level} (intensità ${intensity}m/s, base ${cloudBase}m)\n`;
    if (data.precipitation > 0.5) {
      desc += `   • 🌧️ Pioggia: ${Math.round(data.precipitation)} mm/h\n`;
    }
    if (hour < 19) desc += `\n`;
  }

  return desc;
}

function generatePressureAnalysis(dayData: any[]) {
  const pressures = dayData.filter((h: any) => h.pressure !== undefined).map((h: any) => h.pressure);
  if (pressures.length === 0) return "Dati pressione non disponibili.";

  const avgPressure = pressures.reduce((a: number, b: number) => a + b, 0) / pressures.length;
  const maxPressure = Math.max(...pressures);
  const minPressure = Math.min(...pressures);
  const trend = pressures[pressures.length - 1] - pressures[0];

  let desc = `📊 ANALISI PRESSIONE\n\n`;
  desc += `   • Pressione media: ${Math.round(avgPressure)} hPa\n`;
  desc += `   • Minima: ${Math.round(minPressure)} hPa\n`;
  desc += `   • Massima: ${Math.round(maxPressure)} hPa\n`;
  desc += `   • Trend: ${trend > 0 ? "⬆️ In aumento" : trend < 0 ? "⬇️ In diminuzione" : "➡️ Stabile"}\n`;

  if (trend < -3) desc += `   ⚠️ Pressione in rapida diminuzione - possibile peggioramento meteo!\n`;
  else if (trend > 3) desc += `   ✅ Pressione in aumento - miglioramento meteo in arrivo.\n`;

  return desc;
}

function generateThunderstormAlert(dayData: any[]) {
  const hasThunderstorm = dayData.some((h: any) => h.weatherCode >= 95 && h.weatherCode <= 99);
  const hasRain = dayData.some((h: any) => h.precipitation > 0.5);
  const cloudCover = dayData.reduce((sum: number, h: any) => sum + h.cloudCover, 0) / dayData.length;

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

/* ============================
   STILI COMPLETI
   ============================ */

const s = {
  app: {
    background:```typescript
  app: {
    background: "linear-gradient(135deg, #0a0e27 0%, #1a1a3e 30%, #16213e 60%, #0d1b2a 100%)",
    color: "#eee",
    minHeight: "100vh",
    padding: "20px",
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    maxWidth: "100%",
    overflowX: "hidden" as const,
  },
  loadingFull: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0e27, #1a1a3e)",
    color: "#eee",
    padding: "20px",
  },
  spinner: {
    width: "60px",
    height: "60px",
    border: "4px solid rgba(255, 255, 255, 0.1)",
    borderTopColor: "#ff6b6b",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginTop: "20px",
    fontSize: "clamp(1rem, 4vw, 1.4rem)" as any,
    color: "#fff",
    textAlign: "center" as const,
  },
  loadingSub: {
    marginTop: "10px",
    fontSize: "clamp(0.8rem, 3vw, 1rem)" as any,
    color: "#888",
    textAlign: "center" as const,
  },
  errorFull: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0e27, #1a1a3e)",
    color: "#eee",
    padding: "20px",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: "clamp(1rem, 4vw, 1.2rem)" as any,
    marginBottom: "20px",
    textAlign: "center" as const,
  },
  retryButton: {
    background: "#ff6b6b",
    color: "#fff",
    border: "none",
    padding: "12px 30px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "clamp(0.9rem, 3vw, 1rem)" as any,
    transition: "all 0.3s ease",
  },
  header: {
    textAlign: "center" as const,
    marginBottom: "clamp(15px, 3vw, 30px)" as any,
    padding: "clamp(10px, 2vw, 20px) 0" as any,
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "clamp(8px, 2vw, 12px)" as any,
    flexWrap: "wrap" as const,
  },
  logoRabbit: {
    fontSize: "clamp(2rem, 6vw, 2.8rem)" as any,
  },
  logoParaglider: {
    fontSize: "clamp(1.6rem, 5vw, 2.2rem)" as any,
  },
  logoText: {
    fontSize: "clamp(1.5rem, 5vw, 2.5rem)" as any,
    fontWeight: 800,
    background: "linear-gradient(135deg, #ff6b6b, #ffd93d)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "clamp(0.7rem, 2vw, 1rem)" as any,
    color: "#888",
    marginTop: "8px",
    letterSpacing: "0.3px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 340px) 1fr",
    gap: "clamp(15px, 3vw, 20px)" as any,
    maxWidth: "1440px",
    margin: "0 auto",
  },
  left: {
    background: "rgba(255, 255, 255, 0.05)",
    padding: "15px",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    height: "calc(100vh - 200px)",
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: "clamp(1rem, 3vw, 1.2rem)" as any,
    marginBottom: "15px",
    color: "#ff6b6b",
    fontWeight: 600,
  },
  cardList: {
    overflowY: "auto" as const,
    height: "calc(100% - 50px)",
    paddingRight: "5px",
  },
  right: {
    background: "rgba(255, 255, 255, 0.05)",
    padding: "clamp(12px, 2vw, 20px)" as any,
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    maxHeight: "calc(100vh - 200px)",
    overflowY: "auto" as const,
  },
  tabContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "5px",
    marginBottom: "15px",
  },
  tab: {
    padding: "8px 4px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontSize: "clamp(0.6rem, 1.5vw, 0.85rem)" as any,
    transition: "all 0.3s ease",
    fontWeight: 500,
    textAlign: "center" as const,
  },
  card: {
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "clamp(10px, 1.5vw, 14px)" as any,
    marginBottom: "10px",
    cursor: "pointer",
    textAlign: "left" as const,
    width: "100%",
    transition: "all 0.3s ease",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  cardTitle: {
    fontSize: "clamp(0.85rem, 2vw, 1rem)" as any,
    fontWeight: "bold",
    color: "#fff",
  },
  cardWeather: {
    fontSize: "clamp(1rem, 2.5vw, 1.4rem)" as any,
  },
  cardWeatherPlaceholder: {
    fontSize: "clamp(0.8rem, 2vw, 1.2rem)" as any,
    opacity: 0.3,
  },
  cardDetails: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
    flexWrap: "wrap" as const,
    gap: "4px",
  },
  cardSmall: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)" as any,
    color: "#888",
  },
  cardBadges: {
    display: "flex",
    gap: "5px",
    marginTop: "4px",
    flexWrap: "wrap" as const,
  },
  badge: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)" as any,
    padding: "2px 8px",
    borderRadius: "12px",
    color: "#fff",
    fontWeight: 600,
  },
  siteHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    paddingBottom: "15px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    flexWrap: "wrap" as const,
    gap: "10px",
  },
  siteName: {
    fontSize: "clamp(1.2rem, 4vw, 1.8rem)" as any,
    marginBottom: "2px",
    color: "#fff",
    fontWeight: 700,
  },
  siteInfo: {
    fontSize: "clamp(0.7rem, 2vw, 0.9rem)" as any,
    color: "#888",
  },
  weatherNow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(255, 255, 255, 0.08)",
    padding: "6px 14px",
    borderRadius: "30px",
  },
  weatherIcon: {
    fontSize: "clamp(1.6rem, 4vw, 2.2rem)" as any,
  },
  tempNow: {
    fontSize: "clamp(1.2rem, 3vw, 1.6rem)" as any,
    fontWeight: "bold",
  },
  daySelector: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginBottom: "15px",
  },
  dayButton: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "12px",
    padding: "clamp(8px, 1.5vw, 12px)" as any,
    cursor: "pointer",
    textAlign: "center" as const,
    transition: "all 0.3s ease",
  },
  dayName: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.9rem)" as any,
    fontWeight: "bold",
    color: "#fff",
  },
  dayWeatherIcon: {
    fontSize: "clamp(1.2rem, 3vw, 1.8rem)" as any,
    marginTop: "2px",
  },
  dayTemp: {
    fontSize: "clamp(0.9rem, 2vw, 1.1rem)" as any,
    color: "#ff6b6b",
    marginTop: "2px",
    fontWeight: 600,
  },
  dayDelta: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)" as any,
    color: "#888",
    marginTop: "2px",
  },
  dayRain: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)" as any,
    color: "#4fc3f7",
    marginTop: "2px",
  },
  hourSelector: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "15px",
    padding: "8px 12px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    flexWrap: "wrap" as const,
  },
  hourLabel: {
    fontSize: "clamp(0.7rem, 2vw, 0.9rem)" as any,
    color: "#888",
    fontWeight: 500,
  },
  hourSlider: {
    flex: 1,
    accentColor: "#ff6b6b",
    height: "4px",
    minWidth: "80px",
  },
  hourValue: {
    fontSize: "clamp(0.7rem, 2vw, 0.9rem)" as any,
    fontWeight: "bold",
    color: "#fff",
    minWidth: "45px",
    textAlign: "center" as const,
  },
  meteoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "8px",
    marginBottom: "15px",
  },
  meteoCard: {
    background: "rgba(0, 0, 0, 0.3)",
    padding: "clamp(8px, 1.5vw, 12px)" as any,
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  meteoLabel: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)" as any,
    color: "#888",
    marginBottom: "2px",
    fontWeight: 500,
  },
  meteoValue: {
    fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)" as any,
    fontWeight: "bold",
    color: "#fff",
  },
  meteoSub: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)" as any,
    color: "#666",
    marginTop: "2px",
  },
  pressureSection: {
    marginBottom: "15px",
    padding: "clamp(10px, 2vw, 16px)" as any,
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  pressureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "10px",
  },
  pressureCard: {
    textAlign: "center" as const,
    padding: "8px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "8px",
  },
  pressureLabel: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)" as any,
    color: "#888",
    marginBottom: "4px",
  },
  pressureValue: {
    fontSize: "clamp(1rem, 2.5vw, 1.3rem)" as any,
    fontWeight: "bold",
    color: "#fff",
  },
  pressureSub: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)" as any,
    color: "#888",
    marginTop: "2px",
  },
  thunderstormSection: {
    marginBottom: "15px",
  },
  thunderstormAlert: {
    padding: "12px 16px",
    borderRadius: "10px",
    background: "rgba(244, 67, 54, 0.15)",
    border: "2px solid #f44336",
  },
  thunderstormSafe: {
    padding: "12px 16px",
    borderRadius: "10px",
    background: "rgba(76, 175, 80, 0.1)",
    border: "1px solid rgba(76, 175, 80, 0.3)",
  },
  windSection: {
    marginBottom: "15px",
    padding: "clamp(10px, 2vw, 16px)" as any,
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  windTitle: {
    fontSize: "clamp(0.85rem, 2.5vw, 1rem)" as any,
    color: "#4fc3f7",
    marginBottom: "12px",
    fontWeight: 600,
  },
  windGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "10px",
  },
  windCard: {
    textAlign: "center" as const,
    padding: "clamp(8px, 1.5vw, 12px)" as any,
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "10px",
  },
  windLabel: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)" as any,
    color: "#888",
    marginBottom: "4px",
    fontWeight: 500,
  },
  windValue: {
    fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)" as any,
    fontWeight: "bold",
    color: "#fff",
  },
  windDir: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.8rem)" as any,
    color: "#aaa",
    marginTop: "2px",
  },
  windGustSmall: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.7rem)" as any,
    color: "#ff6b6b",
    marginTop: "2px",
  },
  windProfileSection: {
    marginBottom: "15px",
    padding: "clamp(10px, 2vw, 16px)" as any,
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  windProfileContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  windProfileLegend: {
    display: "flex",
    gap: "15px",
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)" as any,
    color: "#888",
    padding: "4px 8px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    flexWrap: "wrap" as const,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  windProfile: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "3px",
    maxHeight: "300px",
    overflowY: "auto" as const,
    padding: "4px",
  },
  windProfileRow: {
    display: "grid",
    gridTemplateColumns: "70px 1fr 50px",
    gap: "8px",
    alignItems: "center",
    padding: "3px 6px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "6px",
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)" as any,
  },
  windProfileAlt: {
    color: "#888",
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)" as any,
  },
  windProfileBarContainer: {
    height: "16px",
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "10px",
    overflow: "hidden",
    position: "relative" as const,
  },
  windProfileBar: {
    height: "100%",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: "4px",
    transition: "width 0.5s ease",
    minWidth: "30px",
  },
  windProfileSpeed: {
    fontSize: "clamp(0.5rem, 1vw, 0.6rem)" as any,
    color: "#fff",
    fontWeight: "bold",
  },
  windProfileDir: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)" as any,
    color: "#aaa",
    textAlign: "center" as const,
  },
  shearAnalysis: {
    marginTop: "8px",
    padding: "8px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "8px",
  },
  shearBox: {
    padding: "10px",
    borderRadius: "8px",
    border: "2px solid",
    background: "rgba(0, 0, 0, 0.2)",
  },
  shearTitle: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.85rem)" as any,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: "2px",
  },
  shearValue: {
    fontSize: "clamp(0.8rem, 2vw, 1rem)" as any,
    fontWeight: "bold",
    color: "#fff",
  },
  shearDesc: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)" as any,
    color: "#ddd",
    marginTop: "2px",
  },
  shearDetails: {
    display: "flex",
    gap: "10px",
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)" as any,
    color: "#888",
    marginTop: "4px",
    flexWrap: "wrap" as const,
  },
  hourlyWindSection: {
    marginBottom: "15px",
    padding: "clamp(10px, 2vw, 16px)" as any,
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  hourlyWindGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(45px, 1fr))",
    gap: "3px",
    overflowX: "auto" as const,
  },
  hourlyWindCard: {
    textAlign: "center" as const,
    padding: "6px 4px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "6px",
    minWidth: "40px",
  },
  hourlyTime: {
    fontSize: "clamp(0.5rem, 1.2vw, 0.65rem)" as any,
    color: "#888",
    marginBottom: "2px",
    fontWeight: 500,
  },
  hourlyWind: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "1px",
  },
  hourlySpeed: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.9rem)" as any,
    fontWeight: "bold",
    color: "#fff",
  },
  hourlyDir: {
    fontSize: "clamp(0.5rem, 1vw, 0.6rem)" as any,
    color: "#666",
  },
  hourlyWeather: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.8rem)" as any,
    marginTop: "1px",
  },
  thermalSection: {
    marginBottom: "15px",
  },
  altitudeSection: {
    marginBottom: "15px",
  },
  hourlySection: {
    marginBottom: "15px",
  },
  aiSection: {
    marginBottom: "20px",
    background: "rgba(0, 0, 0, 0.4)",
    borderRadius: "14px",
    border: "1px solid rgba(255, 107, 107, 0.15)",
    overflow: "hidden",
  },
  aiHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "clamp(10px, 2vw, 14px) clamp(12px, 2vw, 18px)" as any,
    background: "rgba(255, 107, 107, 0.08)",
    borderBottom: "1px solid rgba(255, 107, 107, 0.1)",
    flexWrap: "wrap" as const,
  },
  aiIcon: {
    fontSize: "clamp(1.2rem, 3vw, 1.6rem)" as any,
  },
  aiTitle: {
    fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)" as any,
    color: "#ff6b6b",
    margin: 0,
    fontWeight: 600,
  },
  aiLoading: {
    marginLeft: "auto",
    fontSize: "clamp(0.7rem, 2vw, 0.85rem)" as any,
    color: "#ffd93d",
  },
  aiContent: {
    padding: "clamp(10px, 2vw, 16px)" as any,
    maxHeight: "500px",
    overflowY: "auto" as const,
  },
  aiBlock: {
    marginBottom: "10px",
    padding: "clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)" as any,
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  aiTextWhite: {
    fontSize: "clamp(0.75rem, 2vw, 0.9rem)" as any,
    color: "#e0e0e0",
    lineHeight: "1.7",
    whiteSpace: "pre-wrap" as const,
    fontWeight: 400,
  },
  footer: {
    textAlign: "center" as const,
    marginTop: "30px",
    padding: "20px 0",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
  },
  footerText: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)" as any,
    color: "#666",
  },
  footerSmall: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)" as any,
    color: "#444",
    marginTop: "5px",
  },
};

export default function App() {
  const [selected, setSelected] = useState(DECOLLI[0].id);
  const [meteoData, setMeteoData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(12);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("meteo");

  const site = DECOLLI.find((x) => x.id === selected) || DECOLLI[0];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMeteoCompleta(site.lat, site.lon);
        setMeteoData(data);
      } catch (err: any) {
        setError("Errore nel caricamento dei dati meteo");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selected, site.lat, site.lon]);

  const getDayData = useCallback(() => {
    if (!meteoData) return [];
    const today = new Date();
    const dayStart = new Date(today);
    dayStart.setDate(today.getDate() + selectedDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return meteoData.hourly.filter((h: any) => h.time >= dayStart && h.time < dayEnd);
  }, [meteoData, selectedDay]);

  const dayData = getDayData();

  const currentData = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    return dayData.find((h: any) => h.time.getHours() === selectedHour) || dayData[0];
  }, [dayData, selectedHour]);

  const thermalProfile = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    return calculateThermalProfile(dayData, site.altitude || 1500);
  }, [dayData, site.altitude]);

  const windProfileData = useMemo(() => {
    if (!currentData) return null;
    return getWindProfile(currentData.windSpeed, currentData.windDir, 400, 4000, 250);
  }, [currentData]);

  useEffect(() => {
    if (meteoData && dayData && dayData.length > 0) {
      setIsAnalyzing(true);
      const timer = setTimeout(() => {
        const analysis = generateAIAnalysis(dayData, site, thermalProfile, windProfileData);
        setAiAnalysis(analysis);
        setIsAnalyzing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [meteoData, dayData, thermalProfile, windProfileData, site]);

  const enrichedDailyData = useMemo(() => {
    if (!meteoData || !meteoData.daily) return [];
    return meteoData.daily.map((day: any, index: number) => {
      const dayHours = meteoData.hourly.filter(
        (h: any) => h.time.getDate() === day.date.getDate() && h.time.getMonth() === day.date.getMonth()
      );
      const temps = dayHours.map((h: any) => h.temperature).filter((t: any) => t !== undefined && t !== null);
      const delta = temps.length > 0 ? Math.round(Math.max(...temps) - Math.min(...temps)) : 0;
      return { ...day, thermalDelta: delta, dayIndex: index };
    });
  }, [meteoData]);

  const dateLabels = enrichedDailyData.map((d: any) =>
    d.date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })
  );

  const hoursRange = Array.from({ length: 11 }, (_, i) => i + 9);

  const getPressureGradient = () => {
    if (!dayData || dayData.length < 2) return { gradient: 0, description: "Dati insufficienti" };
    const first = dayData[0].pressure;
    const last = dayData[dayData.length - 1].pressure;
    const gradient = last - first;
    let description = "";
    if (gradient > 3) description = "⬆️ Pressione in aumento - miglioramento";
    else if (gradient < -3) description = "⬇️ Pressione in diminuzione - peggioramento";
    else description = "➡️ Pressione stabile";
    return { gradient: Math.round(gradient * 10) / 10, description };
  };

  if (loading) {
    return (
      <div style={s.loadingFull}>
        <div style={s.spinner}></div>
        <p style={s.loadingText}>🪂 Caricamento previsioni meteo...</p>
        <p style={s.loadingSub}>Open-Meteo • Free Flight Forecast</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.errorFull}>
        <p style={s.errorText}>❌ {error}</p>
        <button style={s.retryButton} onClick={() => window.location.reload()}>
          🔄 Riprova
        </button>
      </div>
    );
  }

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.logoContainer}>
          <span style={s.logoRabbit}>🐰</span>
          <span style={s.logoParaglider}>🪂</span>
          <span style={s.logoText}>Meteo dei Conigli</span>
        </div>
        <p style={s.subtitle}>Previsioni per volo libero • Dati da Open-Meteo • Stile SHV FSVL</p>
      </header>

      <div style={s.grid}>
        <div style={s.left}>
          <h2 style={s.sectionTitle}>📍 Decolli</h2>
          <div style={s.cardList}>
            {DECOLLI.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelected(d.id)}
                style={{
                  ...s.card,
                  borderColor: d.id === selected ? "#ff6b6b" : "rgba(255,255,255,0.08)",
                  background: d.id === selected ? "rgba(255,107,107,0.15)" : "rgba(255,255,255,0.03)",
                }}
              >
                <div style={s.cardTop}>
                  <div style={s.cardTitle}>{d.name}</div>
                  <div style={s.cardWeather}>
                    {currentData && d.id === selected ? (
                      getWeatherIcon(currentData.weatherCode || 0, currentData.isDay)
                    ) : (
                      <span style={s.cardWeatherPlaceholder}>☁️</span>
                    )}
                  </div>
                </div>
                <div style={s.cardDetails}>
                  <span style={s.cardSmall}>{d.valley}</span>
                  <span style={s.cardSmall}>{d.exposure}</span>
                </div>
                <div style={s.cardBadges}>
                  <span
                    style={{
                      ...s.badge,
                      background: d.difficulty <= 2 ? "#4caf50" : d.difficulty <= 3 ? "#ff9800" : "#f44336",
                    }}
                  >
                    {d.difficulty <= 2 ? "🟢 Facile" : d.difficulty <= 3 ? "🟡 Medio" : "🔴 Difficile"}
                  </span>
                  <span style={{ ...s.badge, background: "#2196f3" }}>{d.altitude || "N/D"}m</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={s.right}>
          {currentData && site && (
            <>
              <div style={s.siteHeader}>
                <div>
                  <h2 style={s.siteName}>{site.name}</h2>
                  <span style={s.siteInfo}>
                    {site.exposure} • {site.valley} • {site.altitude || "N/D"}m
                  </span>
                </div>
                <div style={s.weatherNow}>
                  <span style={s.weatherIcon}>{getWeatherIcon(currentData.weatherCode || 0, currentData.isDay)}</span>
                  <span style={s.tempNow}>{Math.round(currentData.temperature)}°C</span>
                </div>
              </div>

              <div style={s.tabContainer}>
                <button
                  style={{
                    ...s.tab,
                    background: activeBackground: "rgba(255,107,107,0.2)" : "transparent",
                  }}
                  onClick={() => setActiveTab("meteo")}
                >
                  🌤️ Meteo
                </button>
                <button
                  style={{
                    ...s.tab,
                    background: activeTab === "venti" ? "rgba(255,107,107,0.2)" : "transparent",
                  }}
                  onClick={() => setActiveTab("venti")}
                >
                  💨 Venti
                </button>
                <button
                  style={{
                    ...s.tab,
                    background: activeTab === "termiche" ? "rgba(255,107,107,0.2)" : "transparent",
                  }}
                  onClick={() => setActiveTab("termiche")}
                >
                  🔥 Termiche
                </button>
                <button
                  style={{
                    ...s.tab,
                    background: activeTab === "analisi" ? "rgba(255,107,107,0.2)" : "transparent",
                  }}
                  onClick={() => setActiveTab("analisi")}
                >
                  🤖 Analisi
                </button>
              </div>

              {activeTab === "meteo" && (
                <>
                  <div style={s.daySelector}>
                    {enrichedDailyData.map((day: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedDay(index);
                          setSelectedHour(12);
                        }}
                        style={{
                          ...s.dayButton,
                          background: selectedDay === index ? "rgba(255,107,107,0.2)" : "rgba(255,255,255,0.05)",
                          borderColor: selectedDay === index ? "#ff6b6b" : "rgba(255,255,255,0.1)",
                        }}
                      >
                        <div style={s.dayName}>{dateLabels[index]}</div>
                        <div style={s.dayWeatherIcon}>{getWeatherIcon(day.weatherCode, true)}</div>
                        <div style={s.dayTemp}>
                          {Math.round(day.tempMax)}°/{Math.round(day.tempMin)}°
                        </div>
                        <div style={s.dayDelta}>Δ{day.thermalDelta}°C</div>
                        <div style={s.dayRain}>
                          {day.precipitationSum > 0 ? `🌧️${Math.round(day.precipitationSum)}mm` : "☀️"}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div style={s.hourSelector}>
                    <label style={s.hourLabel}>⏰ Ora:</label>
                    <input
                      type="range"
                      min="9"
                      max="19"
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                      style={s.hourSlider}
                    />
                    <span style={s.hourValue}>{String(selectedHour).padStart(2, "0")}:00</span>
                  </div>

                  <div style={s.meteoGrid}>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>🌡️ Temperatura</div>
                      <div style={s.meteoValue}>{Math.round(currentData.temperature)}°C</div>
                      <div style={s.meteoSub}>Δ {thermalProfile?.thermalDelta || 0}°C</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>💧 Umidità</div>
                      <div style={s.meteoValue}>{Math.round(currentData.humidity)}%</div>
                      <div style={s.meteoSub}>Rugiada {Math.round(currentData.dewPoint)}°C</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>☁️ Nuvolosità</div>
                      <div style={s.meteoValue}>{Math.round(currentData.cloudCover)}%</div>
                      <div style={s.meteoSub}>
                        {getCloudCondition(currentData.cloudCover).icon} {getCloudCondition(currentData.cloudCover).text}
                      </div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>🌧️ Precipitazioni</div>
                      <div style={s.meteoValue}>
                        {currentData.precipitation === 0 ? "✅ Assenti" : `${currentData.precipitation} mm`}
                      </div>
                      <div style={s.meteoSub}>{currentData.precipitation === 0 ? "Ideale" : "⚠️ Pioggia"}</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>🏔️ Base Nuvole</div>
                      <div style={s.meteoValue}>
                        {thermalProfile?.cloudBase ? `${thermalProfile.cloudBase}m` : "--"}
                      </div>
                      <div style={s.meteoSub}>Cloud Base</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>📈 Plafond</div>
                      <div style={s.meteoValue}>
                        {thermalProfile?.thermalTop ? `${thermalProfile.thermalTop}m` : "--"}
                      </div>
                      <div style={s.meteoSub}>Thermal Top</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>🪂 Galleggiamento</div>
                      <div style={s.meteoValue}>
                        {thermalProfile?.soarIndex ? `${thermalProfile.soarIndex}/10` : "--"}
                      </div>
                      <div style={s.meteoSub}>Soaring Index</div>
                    </div>
                    <div style={s.meteoCard}>
                      <div style={s.meteoLabel}>💨 Vento</div>
                      <div style={s.meteoValue}>
                        {getWindArrow(currentData.windDir)} {Math.round(currentData.windSpeed)} km/h
                      </div>
                      <div style={s.meteoSub}>
                        {getWindDirection(currentData.windDir)} • ⚡{Math.round(currentData.windGust)} km/h
                      </div>
                    </div>
                  </div>

                  <div style={s.pressureSection}>
                    <h3 style={s.windTitle}>📊 Pressione e Gradiente</h3>
                    <div style={s.pressureGrid}>
                      <div style={s.pressureCard}>
                        <div style={s.pressureLabel}>Pressione attuale</div>
                        <div style={s.pressureValue}>{Math.round(currentData.pressure)} hPa</div>
                      </div>
                      <div style={s.pressureCard}>
                        <div style={s.pressureLabel}>Gradiente</div>
                        <div
                          style={{
                            ...s.pressureValue,
                            color:
                              getPressureGradient().gradient > 0
                                ? "#4caf50"
                                : getPressureGradient().gradient < 0
                                ? "#f44336"
                                : "#ffd93d",
                          }}
                        >
                          {getPressureGradient().gradient > 0
                            ? "⬆️"
                            : getPressureGradient().gradient < 0
                            ? "⬇️"
                            : "➡️"}{" "}
                          {Math.abs(getPressureGradient().gradient)} hPa
                        </div>
                        <div style={s.pressureSub}>{getPressureGradient().description}</div>
                      </div>
                    </div>
                  </div>

                  {aiAnalysis?.thunderstorm && (
                    <div style={s.thunderstormSection}>
                      <div
                        style={
                          aiAnalysis.thunderstorm.includes("ALLERTA")
                            ? s.thunderstormAlert
                            : s.thunderstormSafe
                        }
                      >
                        <div
                          style={s.aiTextWhite}
                          dangerouslySetInnerHTML={{
                            __html: aiAnalysis.thunderstorm.replace(/\n/g, "<br/>"),
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === "venti" && (
                <>
                  <div style={s.windSection}>
                    <h3 style={s.windTitle}>💨 Vento a differenti quote</h3>
                    <div style={s.windGrid}>
                      <div style={s.windCard}>
                        <div style={s.windLabel}>10 m (superficie)</div>
                        <div style={s.windValue}>
                          {getWindArrow(currentData.windDir)} {Math.round(currentData.windSpeed)} km/h
                        </div>
                        <div style={s.windDir}>{getWindDirection(currentData.windDir)}</div>
                        <div style={s.windGustSmall}>⚡ {Math.round(currentData.windGust)} km/h</div>
                      </div>
                      <div style={s.windCard}>
                        <div style={s.windLabel}>80 m (quota termica)</div>
                        <div style={s.windValue}>
                          {currentData.wind80m
                            ? `${getWindArrow(currentData.windDir80m)} ${Math.round(currentData.wind80m)} km/h`
                            : "N/D"}
                        </div>
                        <div style={s.windDir}>
                          {currentData.wind80m ? getWindDirection(currentData.windDir80m) : "--"}
                        </div>
                        <div style={s.windGustSmall}>
                          ⚡ {currentData.wind80m ? Math.round(currentData.wind80m * 1.3) : "--"} km/h
                        </div>
                      </div>
                      <div style={s.windCard}>
                        <div style={s.windLabel}>120 m (alta quota)</div>
                        <div style={s.windValue}>
                          {currentData.wind120m
                            ? `${getWindArrow(currentData.windDir120m)} ${Math.round(currentData.wind120m)} km/h`
                            : "N/D"}
                        </div>
                        <div style={s.windDir}>
                          {currentData.wind120m ? getWindDirection(currentData.windDir120m) : "--"}
                        </div>
                        <div style={s.windGustSmall}>
                          ⚡ {currentData.wind120m ? Math.round(currentData.wind120m * 1.35) : "--"} km/h
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={s.windProfileSection}>
                    <h3 style={s.windTitle}>📊 Profilo Vento (400m - 4000m)</h3>

                    <div style={s.windProfileContainer}>
                      <div style={s.windProfileLegend}>
                        <span style={s.legendItem}>⚡ Velocità (km/h)</span>
                        <span style={s.legendItem}>🧭 Direzione</span>
                      </div>

                      <div style={s.windProfile}>
                        {windProfileData &&
                          windProfileData.map((level: any, index: number) => {
                            const maxSpeed = currentData.windSpeed * 3.5;
                            const barWidth = Math.min(100, (level.speed / maxSpeed) * 100);

                            return (
                              <div key={index} style={s.windProfileRow}>
                                <div style={s.windProfileAlt}>
                                  {level.altitude === 10 ? "Superficie" : `${level.altitude}m`}
                                </div>
                                <div style={s.windProfileBarContainer}>
                                  <div
                                    style={{
                                      ...s.windProfileBar,
                                      width: `${barWidth}%`,
                                      background: `linear-gradient(to right, ${getWindColor(
                                        level.speed,
                                        maxSpeed
                                      )}, ${getWindColor(level.speed, maxSpeed)})`,
                                    }}
                                  >
                                    <span style={s.windProfileSpeed}>{level.speed} km/h</span>
                                  </div>
                                </div>
                                <div style={s.windProfileDir}>
                                  {getWindArrow(level.direction)} {level.directionName}
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {windProfileData && (
                        <div style={s.shearAnalysis}>
                          {(() => {
                            const shear = calculateWindShear(windProfileData);
                            return (
                              <div
                                style={{
                                  ...s.shearBox,
                                  borderColor:
                                    shear.risk === "alto"
                                      ? "#f44336"
                                      : shear.risk === "medio"
                                      ? "#ff9800"
                                      : "#4caf50",
                                }}
                              >
                                <div style={s.shearTitle}>🌪️ Analisi Wind Shear</div>
                                <div style={s.shearValue}>Shear: {shear.shear}</div>
                                <div style={s.shearDesc}>{shear.description}</div>
                                <div style={s.shearDetails}>
                                  <span>
                                    Superficie: {shear.surfaceSpeed} km/h ({shear.surfaceDir})
                                  </span>
                                  <span>
                                    Alta quota: {shear.highSpeed} km/h ({shear.highDir})
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={s.hourlyWindSection}>
                    <h3 style={s.windTitle}>📊 Vento orario (9:00 - 19:00)</h3>
                    <div style={s.hourlyWindGrid}>
                      {hoursRange.map((hour) => {
                        const hourData = dayData?.find((h: any) => h.time.getHours() === hour);
                        if (!hourData) return null;
                        return (
                          <div key={hour} style={s.hourlyWindCard}>
                            <div style={s.hourlyTime}>{String(hour).padStart(2, "0")}:00</div>
                            <div style={s.hourlyWind}>
                              {getWindArrow(hourData.windDir)}
                              <span style={s.hourlySpeed}>{Math.round(hourData.windSpeed)}</span>
                            </div>
                            <div style={s.hourlyDir}>{getWindDirection(hourData.windDir)}</div>
                            <div style={s.hourlyWeather}>
                              {getWeatherIcon(hourData.weatherCode || 0, hourData.isDay)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeTab === "termiche" && (
                <>
                  <div style={s.thermalSection}>
                    <h3 style={s.windTitle}>🔥 Analisi Termiche</h3>
                    <div style={s.aiBlock}>
                      <div
                        style={s.aiTextWhite}
                        dangerouslySetInnerHTML={{
                          __html: aiAnalysis?.thermal?.replace(/\n/g, "<br/>") || "Dati non disponibili",
                        }}
                      />
                    </div>
                  </div>

                  <div style={s.altitudeSection}>
                    <h3 style={s.windTitle}>🏔️ Quote e Plafond</h3>
                    <div style={s.aiBlock}>
                      <div
                        style={s.aiTextWhite}
                        dangerouslySetInnerHTML={{
                          __html: aiAnalysis?.altitude?.replace(/\n/g, "<br/>") || "Dati non disponibili",
                        }}
                      />
                    </div>
                  </div>

                  <div style={s.hourlySection}>
                    <h3 style={s.windTitle}>⏰ Sviluppo Orario</h3>
                    <div style={s.aiBlock}>
                      <div
                        style={s.aiTextWhite}
                        dangerouslySetInnerHTML={{
                          __html: aiAnalysis?.hourly?.replace(/\n/g, "<br/>") || "Dati non disponibili",
                        }}
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "analisi" && (
                <div style={s.aiSection}>
                  <div style={s.aiHeader}>
                    <span style={s.aiIcon}>🤖</span>
                    <h3 style={s.aiTitle}>Analisi Completa della Giornata</h3>
                    {isAnalyzing && <span style={s.aiLoading}>⏳ Analisi in corso...</span>}
                  </div>

                  {aiAnalysis && !isAnalyzing && (
                    <div style={s.aiContent}>
                      <div style={s.aiBlock}>
                        <div
                          style={s.aiTextWhite}
                          dangerouslySetInnerHTML={{
                            __html: aiAnalysis.general.replace(/\n/g, "<br/>"),
                          }}
                        />
                      </div>
                      <div style={s.aiBlock}>
                        <div
                          style={s.aiTextWhite}
                          dangerouslySetInnerHTML={{
                            __html: aiAnalysis.advice.replace(/\n/g, "<br/>"),
                          }}
                        />
                      </div>
                      <div style={s.aiBlock}>
                        <div
                          style={s.aiTextWhite}
                          dangerouslySetInnerHTML={{
                            __html: aiAnalysis.pressure.replace(/\n/g, "<br/>"),
                          }}
                        />
                      </div>
                      {aiAnalysis.thunderstorm && (
                        <div style={s.aiBlock}>
                          <div
                            style={s.aiTextWhite}
                            dangerouslySetInnerHTML={{
                              __html: aiAnalysis.thunderstorm.replace(/\n/g, "<br/>"),
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <footer style={s.footer}>
        <p style={s.footerText}>
          🌤️ Dati meteo forniti da Open-Meteo.com • Ispirato a SHV FSVL • Ottimizzato per volo libero
        </p>
        <p style={s.footerSmall}>🐰 Vola sicuro e divertiti! 🪂 • Beta v2.0</p>
      </footer>
    </div>
  );
}