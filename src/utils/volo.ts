import type { HourData } from "@/types/meteo";

export function getVoloStatus(hourData: HourData): string {
  // Simplified implementation for example
  if (hourData.windSpeed > 20) {
    return 'Rischio alto';
  }
  if (hourData.windDir === 0 || hourData.windDir === 360) {
    return 'Vento da nord';
  }
  return 'Vento da ' + hourData.windDir + '°';
}