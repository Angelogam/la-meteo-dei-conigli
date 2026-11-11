/**
 * Test unitario: computeLocandinaData usa il sounding REALE per le righe vento.
 * Dati sintetici ma realistici (851hPa≈1500m: 20 km/h NW; 700hPa≈3100m: 35 km/h NW).
 * Avvio: npx tsx scripts/test_windrows.ts (o node con tsx installato)
 */
import { computeLocandinaData, type LocandinaInput, type SoundingHour } from "../src/utils/PosterGenerator";
import type { MeteoHourly } from "../src/services/openMeteoService";

function mkHour(hour: number, over: Partial<MeteoHourly> = {}): MeteoHourly {
  const t = new Date(2026, 10, 7, hour, 0, 0);
  return {
    time: t,
    temperature: 10 - Math.abs(hour - 14) * 0.5,
    humidity: 55,
    dewPoint: 2,
    precipitation: 0,
    precipitationProbability: 5,
    weatherCode: 1,
    cloudCover: 25,
    cloudCoverLow: 10, cloudCoverMid: 10, cloudCoverHigh: 5,
    windSpeed: 6, windDir: 300,
    windGusts: 18,
    cape: 40, liftedIndex: -1,
    shortwaveRadiation: 400, directRadiation: 500, diffuseRadiation: 100, directNormalIrradiance: 600, terrestrialRadiation: 300,
    uvIndex: 3, visibility: 30000,
    pressure: 1015, surfacePressure: 890,
    isDay: true,
    freezingLevel: 3200,
    windSpeed80m: 8, windDir80m: 300,
    windSpeed120m: 9, windDir120m: 300,
    windSpeed180m: 11, windDir180m: 300,
    windSpeed925: 10, windDir925: 300,
    windSpeed850: 20, windDir850: 315,
    windSpeed700: 35, windDir700: 300,
    windSpeed600: 42, windDir600: 295,
    windSpeed500: 55, windDir500: 290,
    ...over,
  } as unknown as MeteoHourly;
}

/* sounding "modello": livelli hPa REALI con geopotenziali */
const mkLevels = (hour: number) => {
  const g = Math.sin(hour / 3) * 2;
  const lv: SoundingHour["levels"] = [
    { hpa: 0, alt: 1742, temp: 9 - Math.abs(hour - 14) * 0.5, speed: 6, dir: 300 },
    { hpa: 925, alt: 780 + g, temp: 3, speed: 12, dir: 305 },
    { hpa: 850, alt: 1500 + g, temp: -1, speed: 20, dir: 315 },
    { hpa: 800, alt: 1960 + g, temp: -4, speed: 26, dir: 310 },
    { hpa: 750, alt: 2480 + g, temp: -7, speed: 30, dir: 305 },
    { hpa: 700, alt: 3100 + g, temp: -11, speed: 35, dir: 300 },
    { hpa: 650, alt: 3720 + g, temp: -15, speed: 40, dir: 295 },
    { hpa: 600, alt: 4400 + g, temp: -19, speed: 42, dir: 295 },
    { hpa: 550, alt: 5010 + g, temp: -24, speed: 50, dir: 290 },
    { hpa: 500, alt: 5800 + g, temp: -30, speed: 55, dir: 290 },
  ];
  return { hour, temp2m: 9 - Math.abs(hour - 14) * 0.5, cloud: 25, levels: lv } as SoundingHour;
};

const hours = Array.from({ length: 24 }, (_, h) => mkHour(h));

const input: LocandinaInput = {
  siteName: "Malanotte",
  province: "Cuneo",
  date: new Date(2026, 10, 7, 12, 0, 0),
  elevation: 1740,
  current: mkHour(12),
  hourly: hours,
  daily: { tempMax: 12, tempMin: 3, sunrise: "2026-11-07T07:20", sunset: "2026-11-07T17:05", uvIndexMax: 3 },
  report: "test",
  probabilities: { flyable: 72, thermal: 60, wind: 80, rain: 5, storm: 3 },
  sounding: { siteAlt: 1740, hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map(mkLevels), source: "modello" },
  analisiReport: null,
  windgramImage: null,
};

const d = computeLocandinaData(input);
console.log("windSource:", d.windSource);
for (const r of d.windRows) console.log(`  ${r.quota} m · ${r.dir} (${r.dirDeg}°) · ${r.speedMin}–${r.speedMax} km/h`);

const assert = (c: boolean, msg: string) => { if (!c) { console.error("FALLITO:", msg); process.exit(1); } };
assert(d.windSource === "modello", "windSource deve essere 'modello' col sounding");
const r2000 = d.windRows.find(r => r.quota === 2000);
const r3500 = d.windRows.find(r => r.quota === 3500);
assert(r2000 && r2000.speedMin >= 14 && r2000.speedMin <= 30, `2000 m deve stare ~17-31 km/h (da 850hPa=20, 800hPa=26): ${r2000?.speedMin}-${r2000?.speedMax}`);
assert(r2000 && r2000.dir !== "Var" && r2000.dirDeg != null, "2000 m deve avere direzione reale");
assert(r3500 && r3500.speedMax >= 33 && r3500.speedMax <= 46, `3500 m deve stare ~33-45 km/h (700-650hPa): ${r3500?.speedMin}-${r3500?.speedMax}`);
assert(d.relDay === "OGGI" || d.relDay === "DOMANI" || d.relDay === null, "relDay coerente");

/* senza sounding → stima */
const d2 = computeLocandinaData({ ...input, sounding: null });
console.log("windSource (senza sounding):", d2.windSource);
assert(d2.windSource === "stima", "senza sounding → stima");

console.log("\n✔ test windRows dal sounding: OK");
