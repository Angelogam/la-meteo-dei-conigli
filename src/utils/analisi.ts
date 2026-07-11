"use client";

import type { HourData } from "@/types/meteo";
import type { Decollo } from "@/data/decolli";
import { wic, wa, wd, ct } from "@/utils/meteo";

export function genAI(dayData: HourData[], site: Decollo, thermal: any, wp: any[]) {
  if (!dayData?.length) return null;
  const maxW = Math.max(...dayData.map((h) => h.windSpeed));
  const avgC = dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length;
  const hasRain = dayData.some((h) => h.precipitation > 0.5);
  const hasStorm = dayData.some((h) => h.weatherCode >= 95);
  const soar = thermal?.soarIdx || 0;
  let rs = 0;
  if (maxW > 25) rs += 2;
  if (hasStorm) rs += 3;
  if (soar < 3) rs += 1;
  let risk = "basso";
  if (rs >= 5) risk = "alto";
  else if (rs >= 3) risk = "medio";

  let gen = "PANORAMICA GENERALE\n\nLa giornata al decollo di " + site.name + " si presenta ";
  if (avgC < 30) gen += "con cielo sereno. "; else if (avgC < 60) gen += "con cielo parzialmente nuvoloso. "; else gen += "con cielo nuvoloso. ";
  if (maxW > 25) gen += "Vento forte (" + Math.round(maxW) + " km/h). "; else if (maxW > 15) gen += "Vento moderato (" + Math.round(maxW) + " km/h). "; else gen += "Vento debole (" + Math.round(maxW) + " km/h). ";
  gen += hasRain ? "Precipitazioni previste. " : "Nessuna precipitazione. ";
  gen += "Esposizione: " + site.exposure + ".";

  let adv = "CONSIGLI PER IL VOLO\n\nRischio: ";
  if (risk === "alto") adv += "ALTO - Sconsigliato!\n"; else if (risk === "medio") adv += "MEDIO - Attenzione!\n"; else adv += "BASSO - Favorevole!\n\n";
  if (maxW > 25) adv += "Vento forte (>25 km/h).\n"; else if (maxW > 18) adv += "Vento sostenuto (18-25 km/h).\n"; else if (maxW < 5) adv += "Vento debole (<5 km/h).\n"; else adv += "Vento ideale (5-18 km/h).\n";
  if (soar >= 7) adv += "Termiche forti - Ottime per cross!\n"; else if (soar >= 5) adv += "Termiche medie - Buona attivita.\n"; else adv += "Termiche deboli - Voli locali.\n";

  let th = "ANALISI TERMICHE\n\n";
  if (thermal) {
    th += "* Base nuvole: " + thermal.cloudBase + "m\n* Plafond: " + thermal.thermalTop + "m\n* Delta: " + thermal.delta + " C\n* Soaring Index: " + thermal.soarIdx + "/10\n";
    if (soar >= 7) th += "\nGalleggiamento eccellente!\n"; else if (soar >= 5) th += "\nBuon galleggiamento.\n"; else th += "\nGalleggiamento scarso.\n";
    thermal.hourly.forEach((h: any) => { th += "* " + String(h.hour).padStart(2, "0") + ":00 -> " + h.intensity + "m/s\n"; });
  }

  let al = "QUOTE E PLAFOND\n\n";
  if (thermal) {
    al += "* Base decollo: " + (site.altitude || 1500) + "m\n* Cloud Base: " + thermal.cloudBase + "m\n* Thermal Top: " + thermal.thermalTop + "m\n";
    if (soar >= 7 && thermal.thermalTop > 3000) al += "\nCross Country eccellente!\n"; else if (soar >= 5 && thermal.thermalTop > 2500) al += "\nBuono per cross.\n"; else al += "\nCross limitato.\n";
  }

  let hh = "SVOLGIMENTO GIORNATA\n\n";
  for (let h = 9; h <= 19; h++) {
    const d = dayData.find((x) => x.time.getHours() === h); if (!d) continue;
    const hhh = thermal?.hourly?.find((x: any) => x.hour === h);
    hh += String(h).padStart(2, "0") + ":00 " + wic(d.weatherCode, d.isDay) + " " + Math.round(d.temperature) + " C\n   * Vento: " + wa(d.windDir) + " " + Math.round(d.windSpeed) + " km/h (" + wd(d.windDir) + ")\n   * Nuvole: " + Math.round(d.cloudCover) + "% (" + ct(d.cloudCover) + ")\n";
    if (hhh) hh += "   * Termiche: " + hhh.intensity + "m/s\n";
    if (d.precipitation > 0.5) hh += "   * Pioggia: " + Math.round(d.precipitation) + "mm\n";
  }

  let press = "PRESSIONE\n\n";
  const pressures = dayData.filter((h) => h.pressure).map((h) => h.pressure);
  if (pressures.length > 0) {
    const avg = pressures.reduce((a, b) => a + b, 0) / pressures.length;
    const trend = pressures[pressures.length - 1] - pressures[0];
    press += "* Media: " + Math.round(avg) + " hPa\n* Trend: " + (trend > 3 ? "In aumento" : trend < -3 ? "In diminuzione" : "Stabile") + "\n";
    if (trend < -3) press += "Possibile peggioramento!\n";
  }

  let storm = "TEMPORALI\n\n";
  if (hasStorm) storm += "ALLERTA TEMPORALI! Volo sconsigliato!\n"; else if (hasRain && avgC > 70) storm += "Possibili temporali - Monitorare.\n"; else storm += "Nessun temporale.\n";

  return { general: gen, advice: adv, thermal: th, altitude: al, hourly: hh, pressure: press, thunderstorm: storm };
}