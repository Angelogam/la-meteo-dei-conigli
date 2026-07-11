"use client";

export interface TermicheData {
  base: number;
  top: number;
  forza: number;
  rateo: number;
  label: string;
  colore: string;
  turbolenza: "alta" | "media" | "bassa";
  stabilita: number; // 0-100 indice di stabilità/comfort
}

export function calcolaTermiche(params: {
  hour: number;
  temperature: number;
  windSpeed: number;
  windGust: number;
  humidity: number;
  cloudCover: number;
  pressure: number;
}): TermicheData {
  const { hour, temperature, windSpeed, windGust, humidity, cloudCover, pressure } = params;

  // Fattori base
  const tempFactor = Math.max(0, (temperature - 12) / 28); // 12-40°C
  const windIdeal = Math.max(0, 1 - Math.abs(windSpeed - 10) / 25); // vento ideale 5-15 km/h
  const gustPenalty = Math.max(0, 1 - (windGust - windSpeed) / 30); // raffiche penalizzano
  const humidityIdeal = Math.max(0, 1 - Math.abs(humidity - 40) / 60); // umidità ideale 30-50%
  const cloudIdeal = (() => {
    if (cloudCover <= 10) return 1.0; // cielo sereno
    if (cloudCover <= 30) return 0.9; // poco nuvoloso
    if (cloudCover <= 60) return 0.7; // parzialmente nuvoloso
    return 0.4; // molto nuvoloso
  })();
  const pressureFactor = Math.max(0, (pressure - 1000) / 30); // >1015 hPa ideale

  // Fattore orario: picco tra 11-14, calo graduale dopo le 15
  const hourFactor = (() => {
    if (hour >= 10 && hour <= 15) return 1.0; // picco
    if (hour >= 8 && hour <= 9) return 0.7 + (hour - 8) * 0.15;
    if (hour === 16) return 0.6; // prima attenuazione
    if (hour === 17) return 0.4;
    if (hour === 18) return 0.25;
    if (hour >= 7) return 0.4;
    return 0.1;
  })();

  // === OTTIMIZZAZIONE DOPO LE 16: vento moderato → termiche più dolci, meno turbolenza ===
  // Dopo le 16 l'irraggiamento cala, ma se il vento è tra 8-18 km/h
  // le termiche diventano più stabili e "dolci", con meno turbolenza
  const isLateAfternoon = hour >= 16;
  const windModerate = windSpeed >= 8 && windSpeed <= 18;

  // Fattore "dolcezza" post-16: vento moderato arrotonda le termiche
  const dolcezzaFactor = (() => {
    if (!isLateAfternoon) return 1.0; // non applicato prima delle 16
    if (windModerate) return 0.85; // vento moderato → termiche più dolci (-15% forza ma +comfort)
    return 0.9; // comunque attenuazione naturale
  })();

  // Calcolo forza base
  const forzaBase = tempFactor * windIdeal * humidityIdeal * cloudIdeal * pressureFactor * hourFactor;
  const forzaArrotondata = Math.round(forzaBase * 10 * dolcezzaFactor) / 10;
  const forza = Math.min(10, Math.max(0, forzaArrotondata));

  // Turbolenza: dopo le 16 con vento moderato → bassa
  const turbolenza: "alta" | "media" | "bassa" = (() => {
    if (isLateAfternoon && windModerate) return "bassa";
    if (windGust - windSpeed > 15 || windSpeed > 25) return "alta";
    if (windGust - windSpeed > 8 || windSpeed > 18) return "media";
    return "bassa";
  })();

  // Stabilità (0-100): più alta = più comfort
  const stabilita = (() => {
    let stab = 50;
    // Dopo le 16 con vento moderato → +30 stabilità
    if (isLateAfternoon && windModerate) stab += 30;
    // Vento troppo forte penalizza
    if (windSpeed > 25) stab -= 20;
    else if (windSpeed > 18) stab -= 10;
    // Raffiche forti penalizzano
    if (windGust - windSpeed > 12) stab -= 15;
    // Cielo sereno aiuta
    if (cloudCover <= 20) stab += 10;
    // Ora tarda = più stabile
    if (hour >= 17) stab += 10;
    return Math.min(100, Math.max(0, stab));
  })();

  // Rateo di salita (m/s) — proporzionale alla forza, ma con dolcezza riduciamo picchi
  const rateoBase = 1.0 + forza * 0.45;
  const rateo = Math.round(rateoBase * dolcezzaFactor * 10) / 10;

  // Quote base/top
  const base = Math.round(400 + temperature * 20 + forza * 50);
  const top = Math.round(base + 200 + forza * 180);

  // Label e colore
  const label = (() => {
    if (forza >= 7) return "Forti";
    if (forza >= 5) return "Buone";
    if (forza >= 3) return (isLateAfternoon && windModerate) ? "Moderate/dolci" : "Moderate";
    if (forza >= 1) return (isLateAfternoon && windModerate) ? "Deboli/dolci" : "Deboli";
    return "Assenti";
  })();

  const colore = (() => {
    if (forza >= 7) return "#ef4444";
    if (forza >= 5) return "#f97316";
    if (forza >= 3) return "#eab308";
    if (forza >= 1) return "#84cc16";
    return "#64748b";
  })();

  return { base, top: top, forza, rateo, label, colore, turbolenza, stabilita };
}