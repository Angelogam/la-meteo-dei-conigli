"use client";

export function getWeatherIcon(code: number, isDay: number): string {
  const icons: Record<number, string> = {
    0: isDay ? '☀️' : '🌙',
    1: isDay ? '🌤️' : '🌤️',
    2: isDay ? '⛅' : '☁️',
    3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌧️', 55: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '❄️', 73: '❄️', 75: '❄️',
    80: '🌧️', 81: '🌧️', 82: '⛈️',
    95: '⛈️', 96: '⛈️', 99: '⛈️',
  };
  return icons[code] || (isDay ? '☀️' : '🌙');
}

export function getWindDirection(deg: number): string {
  if (deg == null) return '--';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function getWindArrow(deg: number): string {
  if (deg == null) return '➡️';
  const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
  return arrows[Math.round(deg / 45) % 8];
}

export function getCloudCondition(cover: number): { text: string; icon: string; color: string } {
  if (cover < 20) return { text: 'Sereno', icon: '☀️', color: '#ffd93d' };
  if (cover < 40) return { text: 'Poco nuvoloso', icon: '🌤️', color: '#f9a825' };
  if (cover < 60) return { text: 'Nuvoloso', icon: '⛅', color: '#90a4ae' };
  if (cover < 80) return { text: 'Molto nuvoloso', icon: '☁️', color: '#78909c' };
  return { text: 'Coperto', icon: '☁️', color: '#546e7a' };
}

export function getWindProfile(surfaceWind: number, surfaceDir: number) {
  const profile: { alt: number; speed: number; dir: number; dirName: string }[] = [];
  for (let alt = 400; alt <= 4000; alt += 250) {
    const factor = 1 + (alt - 10) * 0.0025;
    let speed = Math.min(surfaceWind * factor, surfaceWind * 3.5);
    let dirOffset = (alt - 10) / 1000 * 15;
    dirOffset = Math.min(dirOffset, 45);
    let dir = (surfaceDir + dirOffset) % 360;
    profile.push({
      alt,
      speed: Math.round(speed * 10) / 10,
      dir: Math.round(dir),
      dirName: getWindDirection(dir)
    });
  }
  return profile;
}

export function getThermalStrength(temp: number, cloud: number, hum: number, thermalDelta: number): { label: string; color: string } {
  const score = (temp > 22 ? 2 : temp > 18 ? 1 : 0) +
    (cloud < 30 ? 2 : cloud < 50 ? 1 : 0) +
    (hum < 50 ? 1 : 0) +
    (thermalDelta > 10 ? 2 : thermalDelta > 6 ? 1 : 0);
  if (score >= 6) return { label: 'Forte 🔥', color: '#ff1744' };
  if (score >= 4) return { label: 'Media 💪', color: '#ff6d00' };
  if (score >= 2) return { label: 'Debole 🫤', color: '#ffd600' };
  return { label: 'Assente ❄️', color: '#4fc3f7' };
}

export function getStabilityIndex(temp: number, hum: number, cloud: number): { label: string; color: string } {
  const cape = Math.max(0, (temp - 15) * 50 + (50 - hum) * 10 - cloud * 2);
  if (cape > 1500) return { label: 'Instabile ⚠️', color: '#ff1744' };
  if (cape > 800) return { label: 'Moderato 🟡', color: '#ff9800' };
  if (cape > 300) return { label: 'Stabile 🟢', color: '#4caf50' };
  return { label: 'Molto stabile ✅', color: '#4fc3f7' };
}

export function getWeatherAlert(currentData: any, thermalDelta: number): { level: 'info' | 'warning' | 'danger' | 'success'; message: string; icon: string } {
  if (!currentData) return { level: 'info', message: 'Caricamento...', icon: 'ℹ️' };
  const alerts: string[] = [];
  if (currentData.windSpeed > 25) alerts.push('💨 VENTO FORTE');
  if (currentData.windGust > 35) alerts.push('💨 RAFFICHE PERICOLOSE');
  if (currentData.precipitation > 0.5) alerts.push('🌧️ PIOGGIA');
  if (currentData.cloudCover > 80) alerts.push('☁️ CIELO COPERTISSIMO');
  if (currentData.weatherCode >= 95) alerts.push('⛈️ TEMPORALE');
  if (thermalDelta > 12) alerts.push('🔥 FORTI TERMICHE');
  if (currentData.windSpeed < 5) alerts.push('🍃 VENTO DEBOLE');

  if (alerts.length === 0) return { level: 'success', message: '✅ Condizioni ottimali per volare!', icon: '🪂' };
  if (alerts.some(a => a.includes('TEMPORALE') || a.includes('PIOGGIA') || a.includes('VENTO FORTE'))) {
    return { level: 'danger', message: '⚠️ ' + alerts.join(' • '), icon: '🚨' };
  }
  return { level: 'warning', message: '⚠️ ' + alerts.join(' • '), icon: '⚡' };
}

export function getCloudBase(temp: number, dewPoint: number, siteAlt: number): number {
  return Math.round((temp - dewPoint) * 120 + siteAlt);
}

export function getThermalPlafond(siteAlt: number, thermalDelta: number): number {
  return Math.round(siteAlt + (thermalDelta * 100));
}

export function getPressureGradient(dayData: any[]): string {
  const first = dayData[0]?.pressure;
  const last = dayData[dayData.length - 1]?.pressure;
  if (first == null || last == null) return '--';
  const diff = last - first;
  return diff > 0 ? `⬆️ +${Math.round(diff)} hPa` : diff < 0 ? `⬇️ ${Math.round(diff)} hPa` : '➡️ Stabile';
}