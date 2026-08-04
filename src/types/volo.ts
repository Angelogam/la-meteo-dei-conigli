import type { HourData } from "@/types/meteo";

export interface Decollo {
  id: string;
  nome: string;
  lat: number;
  lon: number;
  quota: number;
  valley: string;
  esposizione: string;
}

export interface VoloStatus {
  level: 'info' | 'warning' | 'danger' | 'success';
  message: string;
  icon: string;
}

export interface WindLevel {
  quota?: number;
  alt?: number;
  velocita: number;
  direzione: number;
}

export function getVoloStatus(data: HourData): VoloStatus {
  const windSpeed = data.windSpeed ?? 0;
  const windGusts = data.windGusts ?? 0;
  const weatherCode = data.weatherCode ?? 0;
  const precipitation = data.precipitation ?? 0;
  const cloudCover = data.cloudCover ?? 0;

  const alerts: string[] = [];
  if (weatherCode >= 95) alerts.push('⛈️ Temporale in corso');
  if (precipitation > 2) alerts.push('🌧️ Pioggia intensa');
  if (windSpeed > 35) alerts.push('💨 Vento fortissimo');
  if (windGusts > 45) alerts.push('💨 Raffiche pericolose');

  if (alerts.length > 0) {
    return { level: 'danger', message: '⚠️ ' + alerts.join(' • '), icon: '🚨' };
  }

  const warnings: string[] = [];
  if (windSpeed > 25) warnings.push('Vento forte');
  if (windGusts > 30) warnings.push('Raffiche intense');
  if (precipitation > 0.5) warnings.push('Pioggia debole');
  if (cloudCover > 80) warnings.push('Cielo molto coperto');
  if (windSpeed < 4) warnings.push('Vento troppo debole per volare');

  if (warnings.length > 0) {
    return { level: 'warning', message: '⚠️ ' + warnings.join(' • '), icon: '⚡' };
  }

  const goods: string[] = [];
  if (windSpeed >= 5 && windSpeed <= 18) goods.push('Vento ideale per volare');
  if (cloudCover <= 40 && cloudCover >= 10) goods.push('Cumuli da termica');
  if (weatherCode <= 2) goods.push('Cielo sereno');

  if (goods.length >= 2) {
    return { level<dyad-write path="src/types/volo.ts">
import type { HourData } from "@/types/meteo";

export interface Decollo {
  id: string;
  nome: string;
  lat: number;
  lon: number;
  quota: number;
  valley: string;
  esposizione: string;
}

export interface VoloStatus {
  level: 'info' | 'warning' | 'danger' | 'success';
  message: string;
  icon: string;
}

export interface WindLevel {
  quota?: number;
  alt?: number;
  velocita: number;
  direzione: number;
}

export function getVoloStatus(data: HourData): VoloStatus {
  const windSpeed = data.windSpeed ?? 0;
  const windGusts = data.windGusts ?? 0;
  const weatherCode = data.weatherCode ?? 0;
  const precipitation = data.precipitation ?? 0;
  const cloudCover = data.cloudCover ?? 0;

  const alerts: string[] = [];
  if (weatherCode >= 95) alerts.push('⛈️ Temporale in corso');
  if (precipitation > 2) alerts.push('🌧️ Pioggia intensa');
  if (windSpeed > 35) alerts.push('💨 Vento fortissimo');
  if (windGusts > 45) alerts.push('💨 Raffiche pericolose');

  if (alerts.length > 0) {
    return { level: 'danger', message: '⚠️ ' + alerts.join(' • '), icon: '🚨' };
  }

  const warnings: string[] = [];
  if (windSpeed > 25) warnings.push('Vento forte');
  if (windGusts > 30) warnings.push('Raffiche intense');
  if (precipitation > 0.5) warnings.push('Pioggia debole');
  if (cloudCover > 80) warnings.push('Cielo molto coperto');
  if (windSpeed < 4) warnings.push('Vento troppo debole per volare');

  if (warnings.length > 0) {
    return { level: 'warning', message: '⚠️ ' + warnings.join(' • '), icon: '⚡' };
  }

  const goods: string[] = [];
  if (windSpeed >= 5 && windSpeed <= 18) goods.push('Vento ideale per volare');
  if (cloudCover <= 40 && cloudCover >= 10) goods.push('Cumuli da termica');
  if (weatherCode <= 2) goods.push('Cielo sereno');

  if (goods.length >= 2) {
    return { level: 'success', message: '✅ Condizioni ottimali per volare! ' + goods.slice(0, 2).join(', '), icon: '🪂' };
  }

  if (goods.length >= 1) {
    return { level: 'info', message: 'ℹ️ Condizioni discrete. ' + goods[0], icon: '🌤️' };
  }

  return { level: 'info', message: 'ℹ️ Condizioni nella norma. Verifica i dettagli orari.', icon: '🌤️' };
}