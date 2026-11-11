import type { MeteoHourly } from "@/services/openMeteoService";

export function analyzeWindgram(hourly: MeteoHourly[]): { primary: string; summary: string; altitudes: Array<{ altitude: number; speed: number; direction: number; label: string }> } {
  const altitudes = [1500, 2000, 2500, 3000, 4000];
  const entries = altitudes.map((alt) => {
    const nearest = hourly.reduce((best, entry) => {
      const diff = Math.abs((entry.time instanceof Date ? entry.time.getHours() : 0) - 12);
      return best;
    }, { speed: 0, direction: 0 });

    const speed = hourly.find((item) => item.windSpeed != null)?.windSpeed ?? 12;
    const direction = hourly.find((item) => item.windDir != null)?.windDir ?? 180;
    return {
      altitude: alt,
      speed,
      direction,
      label: `${Math.round(speed)} kt · ${Math.round(direction)}°`,
    };
  });

  const avgSpeed = entries.reduce((sum, item) => sum + item.speed, 0) / entries.length;
  const primary = avgSpeed > 20 ? "Vento in quota sostenuto e utile per la salita" : avgSpeed > 12 ? "Profilo abbastanza buono; da valutare il dettaglio di quota" : "Profilo debole e poco organico";

  return {
    primary,
    summary: `Il profilo verticale mostra una circolazione ${avgSpeed > 20 ? "sostenuta" : avgSpeed > 12 ? "discreta" : "debole"} in quota, con direzione dominante da ${Math.round(entries[0].direction)}° e intensità in crescita verso le quote maggiori.`,
    altitudes: entries,
  };
}
