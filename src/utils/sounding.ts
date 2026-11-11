/* Sounding REALE del modello (temperature + geopotenziali + venti ai livelli hPa)
   per il windgram e la tabella «Venti in quota» del report.
   Condiviso da ReportAICard (locandina) e ReportGiornata (scheda Meteo/Report). */
import { fetchHourly } from "@/lib/openMeteoClient";
import type { LocandinaSounding, SoundingHour } from "@/utils/PosterGenerator";

export const SOUNDING_HPA = [925, 850, 800, 750, 700, 650, 600, 550, 500] as const;

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v != null && Number.isFinite(n) ? n : null;
};

export async function fetchSounding(lat: number, lon: number, siteAlt: number, dayOffset = 0): Promise<LocandinaSounding> {
  const params = [
    ...SOUNDING_HPA.flatMap((p) => [
      `temperature_${p}hPa`,
      `geopotential_height_${p}hPa`,
      `wind_speed_${p}hPa`,
      `wind_direction_${p}hPa`,
    ]),
    "temperature_2m",
    "cloud_cover",
    "wind_speed_10m",
    "wind_direction_10m",
  ].join(",");
  const day = new Date();
  day.setDate(day.getDate() + dayOffset);
  const dayStr = [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, "0"),
    String(day.getDate()).padStart(2, "0"),
  ].join("-");
  const j = await fetchHourly(lat, lon, params, dayStr, dayStr);
  const H = (j as { hourly?: Record<string, unknown> }).hourly ?? {};
  const timeArr = (H.time as string[] | undefined) ?? [];
  const hours: SoundingHour[] = [];
  for (let hr = 8; hr <= 19; hr++) {
    const idx = timeArr.findIndex((t) => parseInt(String(t).split("T")[1].split(":")[0], 10) === hr);
    if (idx === -1) continue;
    const t2m = num(H.temperature_2m?.[idx]);
    const levels: SoundingHour["levels"] = [];
    if (t2m != null) {
      levels.push({
        hpa: 0,
        alt: siteAlt + 2,
        temp: t2m,
        speed: num(H.wind_speed_10m?.[idx]),
        dir: num(H.wind_direction_10m?.[idx]),
      });
    }
    for (const p of SOUNDING_HPA) {
      const alt = num(H[`geopotential_height_${p}hPa`]?.[idx]);
      if (alt == null || alt <= siteAlt + 50) continue;
      levels.push({
        hpa: p,
        alt: Math.round(alt),
        temp: num(H[`temperature_${p}hPa`]?.[idx]),
        speed: num(H[`wind_speed_${p}hPa`]?.[idx]),
        dir: num(H[`wind_direction_${p}hPa`]?.[idx]),
      });
    }
    hours.push({ hour: hr, temp2m: t2m, cloud: num(H.cloud_cover?.[idx]) ?? 0, levels });
  }
  if (!hours.length) throw new Error("sounding vuoto");
  return { siteAlt, hours, source: "modello" };
}
