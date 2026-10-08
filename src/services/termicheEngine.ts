"use client";

export interface TermicheReali {
  hour: number;
  base: number;
  top: number;
  rateo: number;
  forza: number;
  label: string;
  colore: string;
  cape: number;
  cin: number;
  li: number;
  gradienteReale: number;
  totaleOre: number;
}

const GRADIENTE_SECCO = 0.98;
const LCL_FACTOR = 125;

export function calcolaTermicheReali(
  weather: any,
  altitude: number
): TermicheReali {
  const alt = altitude ?? 1000;

  if (!weather) {
    return {
      hour: new Date().getHours(),
      base: 0, top: 0, rateo: 0, forza: 0,
      label: "N/D", colore: "#475569",
      cape: 0, cin: 0, li: 0,
      gradienteReale: 0, totaleOre: 0,
    };
  }

  // Temperature: usa dato API reale, altrimenti non calcolare
  const temp = weather.temperature;
  if (temp === null || temp === undefined) {
    return {
      hour: new Date().getHours(),
      base: 0, top: 0, rateo: 0, forza: 0,
      label: "N/D", colore: "#475569",
      cape: 0, cin: 0, li: 0,
      gradienteReale: 0, totaleOre: 0,
    };
  }
  const dew = weather.dewPoint;
  const hum = weather.humidity;
  const windSpeed = weather.windSpeed;
  const cloudCover = weather.cloudCover;
  const precipitation = weather.precipitation;
  const temp80m = weather.temp80m ?? null;
  const temp120m = weather.temp120m ?? null;
  const ora = weather.time?.getHours?.() ?? new Date().getHours();
  // Usa CAPE reale dall'API quando disponibile, altrimenti null (non 0!)
  const capeValue = weather.cape !== null && weather.cape !== undefined
    ? Math.min(2000, Math.max(0, weather.cape))
    : null;
  // CIN negativo è valido (inibizione), 0 o positivo significa nessuna inibizione
  const cinValue = weather.cin !== null && weather.cin !== undefined ? weather.cin : null;
  const liValue = weather.liftedIndex;

  if (dew === null || dew === undefined || hum === null || hum === undefined ||
      windSpeed === null || windSpeed === undefined ||
      cloudCover === null || cloudCover === undefined ||
      precipitation === null || precipitation === undefined ||
      capeValue === null || liValue === null || liValue === undefined) {
    return {
      hour: ora,
      base: 0, top: 0, rateo: 0, forza: 0,
      label: "N/D", colore: "#475569",
      cape: 0, cin: cinValue !== null ? Math.round(cinValue) : 0,
      li: 0, gradienteReale: 0, totaleOre: 0,
    };
  }

  const spread = temp - dew;

  const lclSopraSuolo = Math.min(2500, Math.max(100, Math.round(spread * LCL_FACTOR)));
  const base = Math.max(alt + 100, Math.min(alt + 3000, alt + lclSopraSuolo));

  let gradiente = GRADIENTE_SECCO;
  if (temp80m != null && temp80m > -50 && temp80m < 50) {
    // Formula corretta: distanza reale 80m, non 78m
    gradiente = Math.min(1.5, Math.max(0.3, ((temp - temp80m) / 80) * 100));
  } else if (temp120m != null && temp120m > -50 && temp120m < 50) {
    // Formula corretta: distanza reale 120m, non 118m
    gradiente = Math.min(1.5, Math.max(0.3, ((temp - temp120m) / 120) * 100));
  }

  let forza = 0;

  if (capeValue > 1000) forza += 4;
  else if (capeValue > 600) forza += 3;
  else if (capeValue > 300) forza += 2;
  else if (capeValue > 100) forza += 1;
  else if (capeValue > 50) forza += 0.5;

  if (gradiente > 1.2) forza += 1.5;
  else if (gradiente > 0.98) forza += 1;
  else if (gradiente > 0.7) forza += 0.5;

  if (cinValue > -50) forza += 0.5;
  else if (cinValue > -100) forza += 0.3;

  if (liValue < -4) forza += 0.5;
  else if (liValue < -2) forza += 0.3;
  else if (liValue < 0) forza += 0.2;

  if (windSpeed >= 5 && windSpeed <= 15) forza += 0.5;
  else if (windSpeed >= 3 && windSpeed < 5) forza += 0.3;
  else if (windSpeed > 15 && windSpeed <= 22) forza += 0.2;

  if (cloudCover >= 15 && cloudCover <= 45) forza += 0.5;
  else if (cloudCover >= 5 && cloudCover < 15) forza += 0.3;
  else if (cloudCover > 45 && cloudCover <= 60) forza += 0.2;

  if (ora >= 11 && ora <= 15) forza += 0.3;
  else if (ora >= 9 && ora < 11) forza += 0.2;
  else if (ora > 15 && ora <= 17) forza += 0.1;

  if (hum >= 30 && hum <= 50) forza += 0.2;
  else if (hum > 50 && hum <= 65) forza += 0.1;

  if (precipitation > 1) forza = 0;

  forza = Math.max(0, Math.min(10, Math.round(forza * 10) / 10));

  let top: number;
  if (capeValue > 50) {
    top = Math.min(4000, base + Math.min(2500, Math.round(capeValue * 1.8)));
  } else {
    const deltaPoten = Math.min(1.5, gradiente / GRADIENTE_SECCO);
    top = Math.min(4000, base + Math.round(300 * deltaPoten));
  }

  let rateo: number;
  if (capeValue > 50 && (top - base) > 200) {
    const spessore = Math.max(400, Math.min(2500, top - base));
    rateo = Math.min(5, Math.sqrt((2 * Math.min(1500, capeValue)) / spessore) * 3.5);
  } else {
    rateo = Math.min(4, (forza / 10) * 3.5);
  }

  if (windSpeed > 22) rateo *= 0.6;
  else if (windSpeed > 15) rateo *= 0.8;
  else if (windSpeed < 3) rateo *= 0.5;

  if (cloudCover > 70) rateo *= 0.2;
  else if (cloudCover > 55) rateo *= 0.5;
  else if (cloudCover > 40) rateo *= 0.8;

  if (precipitation > 0.5) rateo *= 0.3;
  if (precipitation > 1) rateo = 0;

  rateo = Math.max(0.05, Math.min(5, Math.round(rateo * 10) / 10));

  let label: string;
  let colore: string;

  if (rateo >= 4.0) { label = "Forti (estreme)"; colore = "#dc2626"; }
  else if (rateo >= 3.0) { label = "Buone"; colore = "#f97316"; }
  else if (rateo >= 2.0) { label = "Moderate"; colore = "#eab308"; }
  else if (rateo >= 1.0) { label = "Deboli"; colore = "#84cc16"; }
  else if (rateo >= 0.3) { label = "M. deboli"; colore = "#6b7280"; }
  else { label = "Assenti"; colore = "#475569"; }

  return {
    hour: ora,
    base,
    top,
    rateo,
    forza,
    label,
    colore,
    cape: capeValue !== null ? Math.round(Math.min(2000, capeValue)) : 0,
    cin: cinValue !== null ? Math.round(cinValue) : 0,
    li: Math.round(liValue * 10) / 10,
    gradienteReale: Math.round(gradiente * 100) / 100,
    totaleOre: 0,
  };
}

export function calcolaTermicheMultiple(
  hourlyData: any[],
  altitude: number
): TermicheReali[] {
  if (!hourlyData || hourlyData.length === 0) return [];

  const oreVolo = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const oggi = new Date();
  const giornoCorrente = oggi.getDate();

  const risultati: TermicheReali[] = [];

  for (const ora of oreVolo) {
    let weather = hourlyData.find(h => {
      const t = new Date(h.time);
      return t.getHours() === ora && t.getDate() === giornoCorrente;
    });

    if (!weather) {
      const domani = new Date(oggi);
      domani.setDate(oggi.getDate() + 1);
      weather = hourlyData.find(h => {
        const t = new Date(h.time);
        return t.getHours() === ora && t.getDate() === domani.getDate();
      });
    }

    if (!weather) {
      risultati.push({
        hour: ora,
        base: 0, top: 0, rateo: 0, forza: 0,
        label: "N/D", colore: "#475569",
        cape: 0, cin: 0, li: 0,
        gradienteReale: 0, totaleOre: 0,
      });
      continue;
    }

    const termica = calcolaTermicheReali(weather, altitude);
    risultati.push(termica);
  }

  const oreAttive = risultati.filter(r => r.rateo >= 0.3).length;
  return risultati.map(r => ({ ...r, totaleOre: oreAttive }));
}