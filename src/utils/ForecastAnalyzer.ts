import type { MeteoCurrent, MeteoHourly } from "@/services/openMeteoService";

export interface ForecastProbabilitySet {
  thermal: number;
  wind: number;
  rain: number;
  storm: number;
  cloud: number;
  flyable: number;
}

export interface ForecastAnalysis {
  report: string;
  verdictLabel: string;
  verdictScore: number;
  scoreText: string;
  probabilities: ForecastProbabilitySet;
  params: {
    thermals: string;
    cloudBase: string;
    maxAltitude: string;
    zeroIsotherm: string;
    visibility: string;
    rain: string;
    storm: string;
  };
  windows: {
    morning: string;
    midday: string;
    afternoon: string;
    evening: string;
  };
  semaforo: "GO" | "ATTENZIONE" | "NO GO";
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const avg = (items: Array<number | null | undefined>) => {
  const valid = items.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const maxValue = (items: Array<number | null | undefined>) => {
  const valid = items.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return valid.length ? Math.max(...valid) : 0;
};

const minValue = (items: Array<number | null | undefined>) => {
  const valid = items.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return valid.length ? Math.min(...valid) : 0;
};

function toItalianDirection(deg: number | null | undefined): string {
  if (deg == null || Number.isNaN(deg)) return "variabile";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return directions[index];
}

export function generateForecast(
  siteName: string,
  current: MeteoCurrent | null,
  hourly: MeteoHourly[],
  _daily: Array<{ tempMax?: number | null; tempMin?: number | null; weatherCode?: number | null; precipitationProbabilityMax?: number | null; precipitationSum?: number | null }>,
): ForecastAnalysis {
  const timeWindow = hourly.filter((item) => item.time instanceof Date && item.time.getHours() >= 9 && item.time.getHours() <= 18);
  const dayTemps = timeWindow.map((item) => item.temperature ?? current?.temperature ?? null);
  const humidity = timeWindow.map((item) => item.humidity ?? current?.humidity ?? null);
  const cloudCover = timeWindow.map((item) => item.cloudCover ?? current?.cloudCover ?? null);
  const precipProb = timeWindow.map((item) => item.precipitationProbability ?? null);
  const windSpeeds = timeWindow.map((item) => item.windSpeed ?? current?.windSpeed ?? null);
  const gusts = timeWindow.map((item) => item.windGusts ?? current?.windGusts ?? null);
  const capeSeries = timeWindow.map((item) => item.cape ?? null);
  const liftedSeries = timeWindow.map((item) => item.liftedIndex ?? null);
  const visibilitySeries = timeWindow.map((item) => item.visibility ?? current?.visibility ?? null);
  const tempAvg = avg(dayTemps);
  const humidityAvg = avg(humidity);
  const cloudAvg = avg(cloudCover);
  const windAvg = avg(windSpeeds);
  const gustAvg = avg(gusts);
  const capeAvg = avg(capeSeries);
  const minLifted = minValue(liftedSeries);
  const maxVisibility = maxValue(visibilitySeries);
  const rainChance = maxValue(precipProb);

  const thermalProbability = clamp(
    Math.round((tempAvg >= 18 ? 42 : 18) + (capeAvg > 150 ? 18 : capeAvg / 15) - (cloudAvg > 60 ? 18 : 0) + (humidityAvg < 60 ? 12 : 0)),
    5,
    97,
  );

  const favorableWindProbability = clamp(
    Math.round(60 + (windAvg >= 12 && windAvg <= 25 ? 25 : 0) + (gustAvg <= 30 ? 12 : 0) - (windAvg > 28 ? 25 : 0) - (Math.abs((current?.windDir ?? 180) - 180) > 90 ? 10 : 0)),
    8,
    96,
  );

  const rainProbability = clamp(Math.round(rainChance + (cloudAvg > 70 ? 18 : 0)), 0, 95);
  const stormProbability = clamp(Math.round((capeAvg > 250 ? 34 : capeAvg / 12) + (minLifted < -2 ? 20 : 0) + (rainChance > 50 ? 18 : 0)), 0, 92);
  const cloudProbability = clamp(Math.round(cloudAvg + (rainChance > 45 ? 15 : 0)), 0, 96);
  const flyableProbability = clamp(
    Math.round(
      thermalProbability * 0.29 +
        favorableWindProbability * 0.27 +
        (100 - rainProbability) * 0.18 +
        (100 - stormProbability) * 0.17 +
        (100 - cloudProbability) * 0.09,
    ),
    0,
    100,
  );

  const score = flyableProbability >= 80 ? 8 + Math.round((flyableProbability - 80) / 10) : Math.round(flyableProbability / 10);
  const roundedScore = clamp(score, 0, 10);

  const verdictLabel = roundedScore >= 8 ? "10/10" : roundedScore >= 7 ? "8/10" : roundedScore >= 6 ? "7/10" : roundedScore >= 5 ? "6/10" : roundedScore >= 4 ? "5/10" : roundedScore >= 3 ? "4/10" : roundedScore >= 2 ? "3/10" : roundedScore >= 1 ? "2/10" : "NO GO";
  const semaforo: "GO" | "ATTENZIONE" | "NO GO" = roundedScore >= 7 ? "GO" : roundedScore >= 4 ? "ATTENZIONE" : "NO GO";

  const thermalsText =
    thermalProbability >= 75
      ? "termiche regolari e sostenute"
      : thermalProbability >= 50
        ? "termiche discrete ma non sempre continue"
        : "termiche deboli o frammentate";

  const cloudBase = `${Math.max(700, 1000 + (cloudAvg > 50 ? -100 : 0) + Math.round((20 - tempAvg) * 18))} m`;
  const maxAltitude = `${Math.min(4200, Math.max(1800, Math.round(2200 + tempAvg * 55 + capeAvg * 0.8))) } m`;
  const zeroIsotherm = `${Math.max(1500, Math.round(2200 + (tempAvg - 18) * 120))} m`;
  const visibilityText = `${Math.round(Math.max(5, maxVisibility || 15))} km`;
  const rainText = `${rainProbability}%`;
  const stormText = `${stormProbability}%`;

  const report = `La giornata su ${siteName} si presenterà ${
    flyableProbability >= 70 ? "in generale favorevole" : flyableProbability >= 45 ? "mista ma ancora valutabile" : "compromessa"
  } per il volo libero. Il riscaldamento del terreno favorirà ${thermalsText} durante la tarda mattina e il primo pomeriggio, con una dinamica convettiva che consentirà ${
    thermalProbability >= 55 ? "salite progressive e ben organizzate" : "ascendenze più irregolari e meno profonde"
  }. La circolazione di fondo appare ${
    favorableWindProbability >= 65 ? "in linea con un profilo utile al decollo" : "discontinua e da monitorare in quota"
  }, mentre la copertura nuvolosa e le precipitazioni restano i fattori principali da tenere sotto controllo. ${
    rainProbability < 30
      ? "Il quadro sembra relativamente stabile, con visibilità buona e rischio di pioggia basso."
      : rainProbability < 55
        ? "Un lieve aumento della variabilità convettiva rende opportuno un controllo attento del profilo tra mezzogiorno e pomeriggio."
        : "Il rischio precipitativo e la turbolenza convettiva potrebbero ridurre sensibilmente la finestra di volo."
  } In sintesi, ${
    semaforo === "GO"
      ? "la finestra di volo appare positiva e adatta all’attività di decollo con attenzione alla gestione del vento in quota."
      : semaforo === "ATTENZIONE"
        ? "la giornata merita un monitoraggio costante e una valutazione del decollo in base alla relativa finestra di salita."
        : "le condizioni non sono adeguate per un esordio sicuro e conviene posticipare o scegliere una alternativa."
  }`;

  const windows = {
    morning: `Mattina: ${current?.temperature != null ? `temperatura ${current.temperature.toFixed(1)}°C` : "stabilità iniziale"}; possibili ascendenze ancora leggere e vento in fase di riattivazione.`,
    midday: `Mezzogiorno: ${thermalProbability >= 60 ? "massima energia termica" : "incremento attenuato"}; controllo del vento in quota e della base nuvolosa.`,
    afternoon: `Pomeriggio: ${stormProbability < 35 ? "migliore finestra di volo" : "rischio convettivo più marcato"}; valutare la stabilità prima di decollare.`,
    evening: `Sera: graduale attenuazione del riscaldamento terreno; eventuale fuga dei venti e calo della quota di salita.`,
  };

  return {
    report,
    verdictLabel: verdictLabel === "NO GO" ? "NO GO" : `${verdictLabel}`,
    verdictScore: roundedScore,
    scoreText: semaforo === "GO" ? "Giornata favorevole" : semaforo === "ATTENZIONE" ? "Giornata da monitorare" : "Giornata non consigliata",
    probabilities: {
      thermal: thermalProbability,
      wind: favorableWindProbability,
      rain: rainProbability,
      storm: stormProbability,
      cloud: cloudProbability,
      flyable: flyableProbability,
    },
    params: {
      thermals: thermalsText,
      cloudBase: cloudBase,
      maxAltitude: maxAltitude,
      zeroIsotherm: zeroIsotherm,
      visibility: visibilityText,
      rain: `${rainProbability}%`,
      storm: `${stormProbability}%`,
    },
    windows,
    semaforo,
  };
}

export function generateDetailedReport(
  siteName: string,
  current: MeteoCurrent | null,
  hourly: MeteoHourly[],
  daily: Array<{ tempMax?: number | null; tempMin?: number | null; weatherCode?: number | null; precipitationProbabilityMax?: number | null; precipitationSum?: number | null }>,
) {
  const analysis = generateForecast(siteName, current, hourly, daily);
  return analysis.report;
}

export function getWindDirectionLabel(windDeg: number | null | undefined): string {
  return toItalianDirection(windDeg);
}
