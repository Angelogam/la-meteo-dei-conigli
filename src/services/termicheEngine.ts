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

/**
 * Calcola termiche REALI combinando:
 * 1. Dati meteo (temp, dew, vento, nuvole) da weatherService
 * 2. CAPE reale (dai dati hourly di Open-Meteo via weatherService)
 * 3. Fattori fisici: gradiente verticale, wind shear, ora del giorno, stagione
 * 
 * Non fa richieste API aggiuntive.
 */
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

  const temp = weather.temperature ?? 15;
  const dew = weather.dewPoint ?? (temp - 8);
  const hum = weather.humidity ?? 60;
  const windSpeed = weather.windSpeed ?? 10;
  const cloudCover = weather.cloudCover ?? 30;
  const precipitation = weather.precipitation ?? 0;
  const temp80m = weather.temp80m ?? null;
  const temp120m = weather.temp120m ?? null;
  const ora = weather.time?.getHours?.() ?? new Date().getHours();
  const capeValue = Math.min(2000, weather.cape ?? 0);
  const cinValue = weather.cin ?? 0;
  const liValue = weather.liftedIndex ?? 0;

  // 1. Spread
  const spread = Math.max(0.5, temp - dew);

  // 2. BASE TERMICA (LCL) — limitata a valori realistici
  const lclSopraSuolo = Math.min(2500, Math.max(100, Math.round(spread * LCL_FACTOR)));
  const base = Math.max(alt + 100, Math.min(alt + 3000, alt + lclSopraSuolo));

  // 3. GRADIENTE TERMICO VERTICALE REALE — limitato
  let gradiente = GRADIENTE_SECCO;
  if (temp80m != null && temp80m > -50 && temp80m < 50) {
    gradiente = Math.min(1.5, Math.max(0.3, ((temp - temp80m) / 78) * 100));
  } else if (temp120m != null && temp120m > -50 && temp120m < 50) {
    gradiente = Math.min(1.5, Math.max(0.3, ((temp - temp120m) / 118) * 100));
  }

  // 4. FORZA TERMICA (0-10) — valori LIMITATI per essere realistici
  let forza = 0;

  // Da CAPE (max 4 punti) — CAPE realistico per Alpi: 0-1500 J/kg
  if (capeValue > 1000) forza += 4;
  else if (capeValue > 600) forza += 3;
  else if (capeValue > 300) forza += 2;
  else if (capeValue > 100) forza += 1;
  else if (capeValue > 50) forza += 0.5;

  // Da gradiente (max 1.5 punti)
  if (gradiente > 1.2) forza += 1.5;
  else if (gradiente > 0.98) forza += 1;
  else if (gradiente > 0.7) forza += 0.5;

  // Da CIN (max 0.5 punti)
  if (cinValue > -50) forza += 0.5;
  else if (cinValue > -100) forza += 0.3;

  // Da Lifted Index (max 0.5 punti)
  if (liValue < -4) forza += 0.5;
  else if (liValue < -2) forza += 0.3;
  else if (liValue < 0) forza += 0.2;

  // Da vento (max 0.5 punti)
  if (windSpeed >= 5 && windSpeed <= 15) forza += 0.5;
  else if (windSpeed >= 3 && windSpeed < 5) forza += 0.3;
  else if (windSpeed > 15 && windSpeed <= 22) forza += 0.2;

  // Da nuvolosità (max 0.5 punti)
  if (cloudCover >= 15 && cloudCover <= 45) forza += 0.5;
  else if (cloudCover >= 5 && cloudCover < 15) forza += 0.3;
  else if (cloudCover > 45 && cloudCover <= 60) forza += 0.2;

  // Da ora del giorno (max 0.3 punti)
  if (ora >= 11 && ora <= 15) forza += 0.3;
  else if (ora >= 9 && ora < 11) forza += 0.2;
  else if (ora > 15 && ora <= 17) forza += 0.1;

  // Da umidità (max 0.2 punti)
  if (hum >= 30 && hum <= 50) forza += 0.2;
  else if (hum > 50 && hum <= 65) forza += 0.1;

  // Pioggia annulla tutto
  if (precipitation > 1) forza = 0;

  forza = Math.max(0, Math.min(10, Math.round(forza * 10) / 10));

  // 5. TOP TERMICO — limitato a valori realistici per Alpi (4000m max)
  let top: number;
  if (capeValue > 50) {
    top = Math.min(4000, base + Math.min(2500, Math.round(capeValue * 1.8)));
  } else {
    const deltaPoten = Math.max(0.5, Math.min(1.5, gradiente / GRADIENTE_SECCO));
    top = Math.min(4000, base + Math.round(300 * deltaPoten));
  }

  // 6. RATEO (m/s) — limitato a max 5 m/s (valori superiori sono estremi rari)
  let rateo: number;
  if (capeValue > 50 && (top - base) > 200) {
    const spessore = Math.max(400, Math.min(2500, top - base));
    rateo = Math.min(5, Math.sqrt((2 * Math.min(1500, capeValue)) / spessore) * 3.5);
  } else {
    rateo = Math.min(4, (forza / 10) * 3.5);
  }

  // Correzione per vento
  if (windSpeed > 22) rateo *= 0.6;
  else if (windSpeed > 15) rateo *= 0.8;
  else if (windSpeed < 3) rateo *= 0.5;

  // Correzione per nuvolosità eccessiva
  if (cloudCover > 70) rateo *= 0.2;
  else if (cloudCover > 55) rateo *= 0.5;
  else if (cloudCover > 40) rateo *= 0.8;

  if (precipitation > 0.5) rateo *= 0.3;
  if (precipitation > 1) rateo = 0;

  rateo = Math.max(0.05, Math.min(5, Math.round(rateo * 10) / 10));

  // 7. Label e colore — scale RIDOTTE per essere più realistiche
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
    cape: Math.round(Math.min(2000, capeValue)),
    cin: Math.round(cinValue),
    li: Math.round(liValue * 10) / 10,
    gradienteReale: Math.round(gradiente * 100) / 100,
    totaleOre: 0,
  };
}

/**
 * Calcola termiche per TUTTE le ore di volo (8-19)
 */
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
    // Prima controlla il giorno corrente, poi eventualmente domani
    let weather = hourlyData.find(h => {
      const t = new Date(h.time);
      return t.getHours() === ora && t.getDate() === giornoCorrente;
    });

    // Se non trova per oggi, cerca per domani
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

  // Conta ore con termiche attive
  const oreAttive = risultati.filter(r => r.rateo >= 0.3).length;
  return risultati.map(r => ({ ...r, totaleOre: oreAttive }));
}