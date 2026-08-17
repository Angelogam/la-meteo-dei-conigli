"use client";

export interface WindLevel {
  alt: number;
  speed: number;
  dir: number;
  dirName: string;
}

export function getWeatherIcon(code: number, isDay: number): string {
  const icons: Record<number, string> = {
    0: isDay ? '\u2600\ufe0f' : '\U0001f319',
    1: isDay ? '\U0001f324\ufe0f' : '\U0001f324\ufe0f',
    2: isDay ? '\u26c5' : '\u2601\ufe0f',
    3: '\u2601\ufe0f',
    45: '\U0001f32b\ufe0f', 48: '\U0001f32b\ufe0f',
    51: '\U0001f326\ufe0f', 53: '\U0001f327\ufe0f', 55: '\U0001f327\ufe0f',
    61: '\U0001f327\ufe0f', 63: '\U0001f327\ufe0f', 65: '\U0001f327\ufe0f',
    71: '\u2744\ufe0f', 73: '\u2744\ufe0f', 75: '\u2744\ufe0f',
    80: '\U0001f327\ufe0f', 81: '\U0001f327\ufe0f', 82: '\u26c8\ufe0f',
    95: '\u26c8\ufe0f', 96: '\u26c8\ufe0f', 99: '\u26c8\ufe0f',
  };
  return icons[code] || (isDay ? '\u2600\ufe0f' : '\U0001f319');
}

export function getWindDirection(deg: number): string {
  if (deg == null) return '--';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

export function getWindArrow(deg: number): string {
  if (deg == null) return '\u27a1\ufe0f';
  const arrows = ['\u2191', '\u2197', '\u2192', '\u2198', '\u2193', '\u2199', '\u2190', '\u2196'];
  return arrows[Math.round(deg / 45) % 8];
}

export function getCloudCondition(cover: number): { text: string; icon: string; color: string } {
  if (cover < 20) return { text: 'Sereno', icon: '\u2600\ufe0f', color: '#ffd93d' };
  if (cover < 40) return { text: 'Poco nuvoloso', icon: '\U0001f324\ufe0f', color: '#f9a825' };
  if (cover < 60) return { text: 'Nuvoloso', icon: '\u26c5', color: '#90a4ae' };
  if (cover < 80) return { text: 'Molto nuvoloso', icon: '\u2601\ufe0f', color: '#78909c' };
  return { text: 'Coperto', icon: '\u2601\ufe0f', color: '#546e7a' };
}

export function getWindProfile(
  surfaceWind: number,
  surfaceDir: number,
  realProfile?: { height: number; speed: number; dir: number }[]
): WindLevel[] {
  if (realProfile && realProfile.length > 0) {
    return realProfile.map((level) => ({
      alt: level.height,
      speed: level.speed,
      dir: level.dir,
      dirName: getWindDirection(level.dir),
    }));
  }

  const profile: WindLevel[] = [];
  const heights = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];
  for (const alt of heights) {
    if (alt === 0) {
      profile.push({ alt: 10, speed: surfaceWind, dir: surfaceDir, dirName: getWindDirection(surfaceDir) });
      continue;
    }
    const factor = 1 + (alt / 1000) * 0.25;
    const speed = Math.min(surfaceWind * factor, surfaceWind * 3.5);
    const dirOffset = Math.min((alt / 1000) * 15, 45);
    const dir = (surfaceDir + dirOffset) % 360;
    profile.push({
      alt,
      speed: Math.round(speed * 10) / 10,
      dir: Math.round(dir),
      dirName: getWindDirection(dir),
    });
  }
  return profile;
}

export function getThermalStrength(temp: number, cloud: number, hum: number, thermalDelta: number): { label: string; color: string } {
  const score = (temp > 22 ? 2 : temp > 18 ? 1 : 0) +
    (cloud < 30 ? 2 : cloud < 50 ? 1 : 0) +
    (hum < 50 ? 1 : 0) +
    (thermalDelta > 10 ? 2 : thermalDelta > 6 ? 1 : 0);
  if (score >= 6) return { label: 'Forte \U0001f525', color: '#ff1744' };
  if (score >= 4) return { label: 'Media \U0001f4aa', color: '#ff6d00' };
  if (score >= 2) return { label: 'Debole \U0001fae4', color: '#ffd600' };
  return { label: 'Assente \u2744\ufe0f', color: '#4fc3f7' };
}

export function getStabilityIndex(temp: number, hum: number, cloud: number): { label: string; color: string } {
  const cape = Math.max(0, (temp - 15) * 50 + (50 - hum) * 10 - cloud * 2);
  if (cape > 1500) return { label: 'Instabile \u26a0\ufe0f', color: '#ff1744' };
  if (cape > 800) return { label: 'Moderato \U0001f7e1', color: '#ff9800' };
  if (cape > 300) return { label: 'Stabile \U0001f7e2', color: '#4caf50' };
  return { label: 'Molto stabile \u2705', color: '#4fc3f7' };
}

/** Descrive un weather code WMO in italiano */
export function getWeatherDescription(code: number): string {
  if (code === 0 || code === 1) return "Sereno";
  if (code === 2) return "Poco nuvoloso";
  if (code === 3) return "Nuvoloso";
  if (code >= 45 && code <= 48) return "Nebbia";
  if (code >= 51 && code <= 57) return "Pioggerella";
  if (code >= 61 && code <= 67) return "Pioggia";
  if (code >= 71 && code <= 77) return "Neve";
  if (code >= 80 && code <= 82) return "Rovesci";
  if (code >= 95) return "Temporali";
  return "N/D";
}

/**
 * Genera un alert meteo basato sui dati reali di HourData.
 * currentData è di tipo HourData (da useWeatherData).
 */
export function getWeatherAlert(currentData: any, thermalDelta: number): { level: 'info' | 'warning' | 'danger' | 'success'; message: string; icon: string } | null {
  if (!currentData) return null;

  // Legge i campi da HourData
  const windSpeed = currentData.windSpeed ?? 0;
  const windGusts = currentData.windGusts ?? 0;
  const weatherCode = currentData.weatherCode ?? 0;
  const precipitation = currentData.precipitation ?? 0;
  const cloudCover = currentData.cloudCover ?? 0;
  const temperature = currentData.temperature ?? 0;

  const alerts: string[] = [];

  // Condizioni pericolose
  if (weatherCode >= 95) alerts.push('\u26c8\ufe0f Temporale in corso');
  if (precipitation > 2) alerts.push('\U0001f327\ufe0f Pioggia intensa');
  if (windSpeed > 35) alerts.push('\U0001f4a8 Vento fortissimo');
  if (windGusts > 45) alerts.push('\U0001f4a8 Raffiche pericolose');

  if (alerts.length > 0) {
    return { level: 'danger', message: '\u26a0\ufe0f ' + alerts.join(' \u2022 '), icon: '\U0001f6a8' };
  }

  // Condizioni di attenzione
  const warnings: string[] = [];
  if (windSpeed > 25) warnings.push('Vento forte');
  if (windGusts > 30) warnings.push('Raffiche intense');
  if (precipitation > 0.5) warnings.push('Pioggia debole');
  if (cloudCover > 80) warnings.push('Cielo molto coperto');
  if (windSpeed < 4) warnings.push('Vento troppo debole per volare');

  if (warnings.length > 0) {
    return { level: 'warning', message: '\u26a0\ufe0f ' + warnings.join(' \u2022 '), icon: '\u26a1' };
  }

  // Condizioni buone
  const goods: string[] = [];
  if (windSpeed >= 5 && windSpeed <= 18) goods.push('Vento ideale per volare');
  if (cloudCover <= 40 && cloudCover >= 10) goods.push('Cumuli da termica');
  if (thermalDelta > 8) goods.push('Buona escursione termica');
  if (weatherCode <= 2) goods.push('Cielo sereno');

  if (goods.length >= 2) {
    return { level: 'success', message: '\u2705 Condizioni ottimali per volare! ' + goods.slice(0, 2).join(', '), icon: '\U0001fa82' };
  }

  if (goods.length >= 1) {
    return { level: 'info', message: '\u2139\ufe0f Condizioni discrete. ' + goods[0], icon: '\u2601\ufe0f' };
  }

  return { level: 'info', message: '\u2139\ufe0f Condizioni nella norma. Verifica i dettagli orari.', icon: '\U0001f324\ufe0f' };
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
  return diff > 0 ? '\u2b06\ufe0f +' + Math.round(diff) + ' hPa' : diff < 0 ? '\u2b07\ufe0f ' + Math.round(diff) + ' hPa' : '\u27a1\ufe0f Stabile';
}