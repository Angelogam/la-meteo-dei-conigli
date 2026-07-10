"use client";

export async function fetchMeteoCompleta(lat: number, lon: number) {
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
    
    const hours = data.hourly.time;
    const hourlyData = hours.map((time: string, index: number) => ({
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

export function getWeatherIcon(code: number, isDay: number) {
  const icons: Record<number, string> = {
    0: isDay ? '☀️' : '🌙',
    1: isDay ? '🌤️' : '🌤️',
    2: isDay ? '⛅' : '☁️',
    3: '☁️',
    45: '🌫️',
    48: '🌫️',
    51: '🌦️',
    53: '🌧️',
    55: '🌧️',
    61: '🌧️',
    63: '🌧️',
    65: '🌧️',
    71: '❄️',
    73: '❄️',
    75: '❄️',
    80: '🌧️',
    81: '🌧️',
    82: '⛈️',
    95: '⛈️',
    96: '⛈️',
    99: '⛈️',
  };
  return icons[code] || (isDay ? '☀️' : '🌙');
}

export function getWeatherDescription(code: number) {
  const weatherCodes: Record<number, string> = {
    0: 'Sereno',
    1: 'Poco nuvoloso',
    2: 'Parzialmente nuvoloso',
    3: 'Nuvoloso',
    45: 'Nebbia',
    48: 'Nebbia ghiacciata',
    51: 'Pioviggine leggera',
    53: 'Pioviggine moderata',
    55: 'Pioviggine densa',
    61: 'Pioggia leggera',
    63: 'Pioggia moderata',
    65: 'Pioggia forte',
    71: 'Neve leggera',
    73: 'Neve moderata',
    75: 'Neve forte',
    80: 'Rovescio di pioggia',
    81: 'Rovescio moderato',
    82: 'Rovescio forte',
    95: 'Temporale',
    96: 'Temporale con grandine',
    99: 'Temporale forte con grandine',
  };
  return weatherCodes[code] || 'Variabile';
}

export function getWindDirection(degrees: number) {
  if (!degrees && degrees !== 0) return '--';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(degrees / 45) % 8];
}

export function getWindArrow(degrees: number) {
  if (!degrees && degrees !== 0) return '➡️';
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  return arrows[Math.round(degrees / 45) % 8];
}

export function getCloudCondition(cloudCover: number) {
  if (cloudCover < 20) return { text: 'Sereno', icon: '☀️', color: '#ffd93d' };
  if (cloudCover < 40) return { text: 'Poco nuvoloso', icon: '🌤️', color: '#f9a825' };
  if (cloudCover < 60) return { text: 'Nuvoloso', icon: '⛅', color: '#90a4ae' };
  if (cloudCover < 80) return { text: 'Molto nuvoloso', icon: '☁️', color: '#78909c' };
  return { text: 'Coperto', icon: '☁️', color: '#546e7a' };
}

export function getThermalIndex(temp: number, cloud: number, humidity: number, delta: number) {
  let score = 0;
  if (temp > 22) score += 2;
  else if (temp > 18) score += 1;
  if (cloud < 30) score += 2;
  else if (cloud < 50) score += 1;
  if (humidity < 50) score += 1;
  if (delta > 10) score += 2;
  else if (delta > 6) score += 1;
  
  if (score >= 6) return { level: 'Forte', icon: '🔥', color: '#ff1744', desc: 'Ottima attività termica' };
  if (score >= 4) return { level: 'Media', icon: '💪', color: '#ff6d00', desc: 'Buona attività termica' };
  if (score >= 2) return { level: 'Debole', icon: '🫤', color: '#ffd600', desc: 'Termiche deboli' };
  return { level: 'Assente', icon: '❄️', color: '#4fc3f7', desc: 'Nessuna attività termica' };
}

export function getWindAtAltitude(surfaceWind: number, surfaceDir: number, altitude: number, surfaceAltitude = 10) {
  const heightFactor = 1 + (altitude - surfaceAltitude) * 0.0025;
  let windSpeed = surfaceWind * heightFactor;
  windSpeed = Math.min(windSpeed, surfaceWind * 3.5);
  
  let dirOffset = (altitude - surfaceAltitude) / 1000 * 15;
  dirOffset = Math.min(dirOffset, 45);
  
  let windDir = surfaceDir + dirOffset;
  if (windDir > 360) windDir -= 360;
  if (windDir < 0) windDir += 360;
  
  return {
    altitude,
    speed: Math.round(windSpeed * 10) / 10,
    direction: Math.round(windDir),
    directionName: getWindDirection(windDir)
  };
}

export function getWindProfile(surfaceWind: number, surfaceDir: number, minAlt = 400, maxAlt = 4000, step = 250) {
  const profile = [];
  for (let alt = minAlt; alt <= maxAlt; alt += step) {
    profile.push(getWindAtAltitude(surfaceWind, surfaceDir, alt));
  }
  profile.unshift({
    altitude: 10,
    speed: surfaceWind,
    direction: surfaceDir,
    directionName: getWindDirection(surfaceDir)
  });
  return profile;
}

export function calculateWindShear(profile: ReturnType<typeof getWindProfile>) {
  if (profile.length < 2) return { shear: 0, description: 'Dati insufficienti', risk: 'basso' as const, speedShear: 0, dirShear: 0, surfaceSpeed: 0, highSpeed: 0, surfaceDir: '--', highDir: '--' };
  
  const surface = profile[0];
  const highAlt = profile[profile.length - 1];
  
  const speedShear = highAlt.speed - surface.speed;
  const dirShear = highAlt.direction - surface.direction;
  let shearValue = Math.abs(speedShear) + Math.abs(dirShear) * 0.5;
  
  let description = '';
  let risk: 'basso' | 'medio-basso' | 'medio' | 'alto' = 'basso';
  
  if (shearValue > 30) {
    description = '⚠️ SHEAR MOLTO FORTE - Turbolenze significative, volo pericoloso!';
    risk = 'alto';
  } else if (shearValue > 20) {
    description = '⚡ Shear forte - Possibili turbolenze, richiesta esperienza';
    risk = 'medio';
  } else if (shearValue > 10) {
    description = '🌀 Shear moderato - Attenzione alle variazioni di vento';
    risk = 'medio-basso';
  } else {
    description = '✅ Shear basso - Condizioni stabili, volo sicuro';
    risk = 'basso';
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
    highDir: highAlt.directionName
  };
}

export function getWindColor(speed: number, maxSpeed: number) {
  const ratio = speed / maxSpeed;
  if (ratio < 0.3) return '#4caf50';
  if (ratio < 0.5) return '#8bc34a';
  if (ratio < 0.7) return '#ff9800';
  if (ratio < 0.9) return '#ff5722';
  return '#f44336';
}

export function calculateThermalProfile(dayData: Array<{temperature: number; dewPoint: number; cloudCover: number; humidity: number; windSpeed: number; windDir: number; time: Date}>, siteElevation = 1500) {
  if (!dayData || dayData.length === 0) return null;
  
  const temps = dayData.map(h => h.temperature).filter(t => t !== undefined);
  if (temps.length === 0) return null;
  
  const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const thermalDelta = Math.round(maxTemp - minTemp);
  const avgDew = dayData.reduce((sum, h) => sum + h.dewPoint, 0) / dayData.length;
  const avgCloud = dayData.reduce((sum, h) => sum + h.cloudCover, 0) / dayData.length;
  const avgHumidity = dayData.reduce((sum, h) => sum + h.humidity, 0) / dayData.length;
  
  const cloudBase = Math.round((avgTemp - avgDew) * 120 + siteElevation);
  const thermalTop = Math.round(siteElevation + (thermalDelta * 100));
  const nbl = Math.round(siteElevation + (thermalDelta * 80));
  const verticalIntensity = Math.round((thermalDelta / 10) * 1.5 * 10) / 10;
  const soarIndex = Math.min(10, Math.round((thermalDelta / 2) + (avgCloud < 40 ? 2 : 0) + (avgHumidity < 50 ? 1 : 0)));
  
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
      .filter(h => h.time.getHours() >= 9 && h.time.getHours() <= 19)
      .map(h => {
        const hour = h.time.getHours();
        const delta = h.temperature - minTemp;
        const intensity = Math.round((delta / 10) * 1.5 * 10) / 10;
        const localCloudBase = Math.round((h.temperature - h.dewPoint) * 120 + siteElevation);
        return {
          hour,
          temperature: h.temperature,
          intensity,
          cloudBase: localCloudBase,
          thermalTop: Math.round(siteElevation + (delta * 100)),
          windSpeed: h.windSpeed,
          windDir: h.windDir,
          cloudCover: h.cloudCover,
        };
      }),
  };
}