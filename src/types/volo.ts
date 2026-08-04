import type { HourData } from "@/types/meteo";

export interface Decollo {
  id: string;
  nome: string;
  lat: number;
  lon: number;
  quota: number;
  valley?: string;
  esposizione: string;
}

export interface VoloStatus {
  level: "info" | "warning" | "danger" | "success";
  message: string;
  icon: string;
}

export interface WindLevel {
  quota?: number;
  alt?: number;
  velocita: number;
  direzione: number;
}

export type StatoCondizione = "favorevole" | "laterale" | "sottovento" | "sconosciuto";

export interface ValutazioneDecollo {
  status: StatoCondizione;
  label: string;
  icon: string;
  descrizione: string;
}

export interface AnalisiCompleta {
  rateoSalita: number;
  forzaTermica: number;
  baseNuvole: number;
  topTermico: number;
  zeroTermico: number;
  cape: number;
  cin: number;
  liftedIndex: number;
  turbolenza: string;
  confidenza: number;
  temperatura: number;
  tempMax: number;
  tempMin: number;
  ventoMedio: number;
  ventoMax: number;
  direzioneDominante: string;
  copertura: number;
  pressione: number;
  umidita: number;
  uvIndex: number;
  pioggiaTotale: number;
  rischioTemporali: number;
  stabilitaAtmosferica: string;
  voloGiudizio: string;
  voloDescrizione: string;
  voloScore: number;
}

export type AnalisiCompletaConMargine = AnalisiCompleta & {
  margineSicurezza: number;
};

export function getVoloStatus(data: HourData): VoloStatus {
  const windSpeed = data.windSpeed ?? 0;
  const windGusts = data.windGusts ?? 0;
  const weatherCode = data.weatherCode ?? 0;
  const precipitation = data.precipitation ?? 0;
  const cloudCover = data.cloudCover ?? 0;

  const alerts: string[] = [];
  if (weatherCode >= 95) alerts.push("Temporale in corso");
  if (precipitation > 2) alerts.push("Pioggia intensa");
  if (windSpeed > 35) alerts.push("Vento fortissimo");
  if (windGusts > 45) alerts.push("Raffiche pericolose");

  if (alerts.length > 0) {
    return { level: "danger", message: alerts.join(" - "), icon: "danger" };
  }

  const warnings: string[] = [];
  if (windSpeed > 25) warnings.push("Vento forte");
  if (windGusts > 30) warnings.push("Raffiche intense");
  if (precipitation > 0.5) warnings.push("Pioggia debole");
  if (cloudCover > 80) warnings.push("Cielo molto coperto");
  if (windSpeed < 4) warnings.push("Vento troppo debole per volare");

  if (warnings.length > 0) {
    return { level: "warning", message: warnings.join(" - "), icon: "warning" };
  }

  const goods: string[] = [];
  if (windSpeed >= 5 && windSpeed <= 18) goods.push("Vento ideale per volare");
  if (cloudCover <= 40 && cloudCover >= 10) goods.push("Cumuli da termica");
  if (weatherCode <= 2) goods.push("Cielo sereno");

  if (goods.length >= 2) {
    return { level: "success", message: goods.slice(0, 2).join(", "), icon: "success" };
  }

  if (goods.length >= 1) {
    return { level: "info", message: goods[0], icon: "info" };
  }

  return { level: "info", message: "Condizioni nella norma.", icon: "info" };
}