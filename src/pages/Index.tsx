"use client";
import React, { useEffect, useState, useMemo } from "react";

const DECOLLI = [
  { id: "malanotte", name: "Malanotte", lat: 44.25874571728482, lon: 7.794304664370852, exposure: "S/SE", valley: "Valle Infernotto", difficulty: 3, altitude: 1740 },
  { id: "colle_di_tenda", name: "Colle di Tenda", lat: 44.15093973937469, lon: 7.569262924652476, exposure: "S", valley: "Valle Roya/Vermenagna", difficulty: 2, altitude: 1870 },
  { id: "boves", name: "Boves", lat: 44.32113720462757, lon: 7.544697617792515, exposure: "S", valley: "Cuneese", difficulty: 1, altitude: 900 },
  { id: "monte_male", name: "Monte Male \u2013 Dronero", lat: 44.43163071064606, lon: 7.362886778152897, exposure: "S", valley: "Valle Maira", difficulty: 3, altitude: 1500 },
  { id: "iretta", name: "Iretta", lat: 44.49893744007536, lon: 7.382036612070795, exposure: "S", valley: "Valle Maira", difficulty: 2, altitude: 1300 },
  { id: "val_mala", name: "Pratoni di Val Mala", lat: 44.50780117336976, lon: 7.346618978966227, exposure: "S", valley: "Valle Maira", difficulty: 2, altitude: 1400 },
  { id: "birrone", name: "Monte Birrone", lat: 44.5398927839592, lon: 7.25293945830122, exposure: "S", valley: "Valle Maira", difficulty: 4, altitude: 2131 },
  { id: "agnello", name: "Colle dell'Agnello", lat: 44.68282592463814, lon: 6.978200601250462, exposure: "S", valley: "Valle Varaita", difficulty: 5, altitude: 2748 },
  { id: "pian_mune_alto", name: "Pian Mun\u00e8 \u2013 Seggiovia", lat: 44.63861029121272, lon: 7.230889474766025, exposure: "S/SW", valley: "Valle Po", difficulty: 2, altitude: 1870 },
  { id: "pian_mune_basso", name: "Pian Mun\u00e8 \u2013 Bric Lombatera", lat: 44.65736521807557, lon: 7.260017009542715, exposure: "S", valley: "Valle Po", difficulty: 1, altitude: 1350 },
  { id: "martiniana_po", name: "Martiniana Po", lat: 44.60695265332723, lon: 7.38322612877631, exposure: "S", valley: "Valle Po", difficulty: 1, altitude: 900 },
  { id: "rucas_alto", name: "Rucas alto", lat: 44.74213930591463, lon: 7.220118689737356, exposure: "S/SE", valley: "Valle Infernotto", difficulty: 2, altitude: 1500 },
  { id: "montoso_basso", name: "Montoso \u2013 decollo basso", lat: 44.7643723437882, lon: 7.249757926713178, exposure: "SE", valley: "Valle Infernotto", difficulty: 1, altitude: 1250 },
  { id: "vandalino", name: "Monte Vandalino", lat: 44.83671231480542, lon: 7.173866924055591, exposure: "S/SE", valley: "Val Pellice", difficulty: 4, altitude: 2120 },
  { id: "pian_dell_alpe", name: "Pian dell'Alpe", lat: 45.06396153999711, lon: 7.028266530872771, exposure: "S", valley: "Val Chisone", difficulty: 3, altitude: 1700 },
  { id: "roletto", name: "Roletto \u2013 Piggi", lat: 44.93249288285819, lon: 7.310959031722244, exposure: "S", valley: "Pinerolese", difficulty: 1, altitude: 820 },
  { id: "piossasco", name: "Piossasco \u2013 Monte S. Giorgio", lat: 44.99671840144012, lon: 7.44800217882953, exposure: "S", valley: "Collina Torinese", difficulty: 1, altitude: 673 },
  { id: "truccetti", name: "Truccetti", lat: 45.07973511679036, lon: 7.342018342463826, exposure: "S", valley: "Canavese", difficulty: 1, altitude: 900 },
  { id: "val_della_torre", name: "Val della Torre", lat: 45.16262748864921, lon: 7.463716167415302, exposure: "S", valley: "Val della Torre", difficulty: 1, altitude: 970 },
  { id: "rocca_canavese", name: "Rocca Canavese \u2013 M. della Neve", lat: 45.32757754837493, lon: 7.572793582322621, exposure: "S", valley: "Canavese", difficulty: 2, altitude: 1100 },
  { id: "s_elisabetta", name: "Santa Elisabetta", lat: 45.4182733880574, lon: 7.641945041749434, exposure: "S", valley: "Canavese", difficulty: 1, altitude: 900 },
  { id: "s_elisabetta_alto", name: "Santa Elisabetta alto", lat: 45.44019393073506, lon: 7.648025947229948, exposure: "S", valley: "Canavese", difficulty: 2, altitude: 1100 },
  { id: "cavallaria", name: "Monte Cavallaria", lat: 45.51729363773779, lon: 7.798808327293107, exposure: "S", valley: "Canavese", difficulty: 2, altitude: 1300 },
  { id: "andrate", name: "Andrate", lat: 45.55063933418272, lon: 7.880775591143394, exposure: "S", valley: "Canavese", difficulty: 1, altitude: 1000 },
];

interface HourData {
  time: Date; temperature: number; dewPoint: number; humidity: number; cloudCover: number;
  precipitation: number; visibility: number; windSpeed: number; windGust: number; windDir: number;
  wind80m: number | null; windDir80m: number | null; wind120m: number | null; windDir120m: number | null;
  uvIndex: number; isDay: number; weatherCode: number; pressure: number;
}
interface DailyData {
  date: Date; weatherCode: number; tempMax: number; tempMin: number;
  sunrise: Date; sunset: Date; uvMax: number; precipitationSum: number;
  precipitationHours: number; windMax: number; windDirDominant: number;
}

const WI: Record<number, string> = {
  0: "\u2600", 1: "\uD83C\uDF24", 2: "\u26C5", 3: "\u2601",
  45: "\uD83C\uDF2B", 48: "\uD83C\uDF2B", 51: "\uD83C\uDF26",
  53: "\uD83C\uDF27", 55: "\uD83C\uDF27", 61: "\uD83C\uDF27",
  63: "\uD83C\uDF27", 65: "\uD83C\uDF27", 71: "\u2744",
  73: "\u2744", 75: "\u2744", 80: "\uD83C\uDF27",
  81: "\uD83C\uDF27", 82: "\u26C8", 95: "\u26C8",
  96: "\u26C8", 99: "\u26C8"
};

function wic(code: number, day: number) { return WI[code] || (day ? "\u2600" : "\uD83C\uDF19"); }
function wd(deg: number) { if (deg === undefined || deg === null) return "--"; return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8]; }
function wa(deg: number) { if (deg === undefined || deg === null) return "\u27A1"; return ["\u2B06", "\u2197", "\u27A1", "\u2198", "\u2B07", "\u2199", "\u2B05", "\u2196"][Math.round(deg / 45) % 8]; }
function ct(cc: number) { if (cc < 20) return "Sereno"; if (cc < 40) return "Poco nuvoloso"; if (cc < 60) return "Nuvoloso"; if (cc < 80) return "Molto nuvoloso"; return "Coperto"; }

async function fetchMeteo(lat: number, lon: number) {
  const p = new URLSearchParams({
    latitude: lat.toString(), longitude: lon.toString(),
    hourly: "temperature_2m,dewpoint_2m,relativehumidity_2m,cloudcover,precipitation,visibility,wind_speed_10m,wind_gusts_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,uv_index,is_day,weathercode,pressure_msl",
    daily: "weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_direction_10m_dominant",
    timezone: "auto", forecast_days: "3"
  });
  const r = await fetch("https://api.open-meteo.com/v1/forecast?" + p.toString());
  if (!r.ok) throw new Error("HTTP " + r.status);
  const d = await r.json();
  return {
    hourly: d.hourly.time.map((t: string, i: number) => ({
      time: new Date(t), temperature: d.hourly.temperature_2m[i], dewPoint: d.hourly.dewpoint_2m[i],
      humidity: d.hourly.relativehumidity_2m[i], cloudCover: d.hourly.cloudcover[i],
      precipitation: d.hourly.precipitation[i] || 0, visibility: d.hourly.visibility ? d.hourly.visibility[i] / 1000 : 40,
      windSpeed: d.hourly.wind_speed_10m[i], windGust: d.hourly.wind_gusts_10m ? d.hourly.wind_gusts_10m[i] : d.hourly.wind_speed_10m[i] + 8,
      windDir: d.hourly.wind_direction_10m[i], wind80m: d.hourly.wind_speed_80m?.[i] ?? null,
      windDir80m: d.hourly.wind_direction_80m?.[i] ?? null, wind120m: d.hourly.wind_speed_120m?.[i] ?? null,
      windDir120m: d.hourly.wind_direction_120m?.[i] ?? null, uvIndex: d.hourly.uv_index?.[i] ?? 0,
      isDay: d.hourly.is_day?.[i] ?? 1, weatherCode: d.hourly.weathercode?.[i] ?? 0,
      pressure: d.hourly.pressure_msl?.[i] ?? 1013
    })),
    daily: d.daily.time.map((t: string, i: number) => ({
      date: new Date(t), weatherCode: d.daily.weathercode[i], tempMax: d.daily.temperature_2m_max[i],
      tempMin: d.daily.temperature_2m_min[i], sunrise: new Date(d.daily.sunrise[i]), sunset: new Date(d.daily.sunset[i]),
      uvMax: d.daily.uv_index_max[i], precipitationSum: d.daily.precipitation_sum[i],
      precipitationHours: d.daily.precipitation_hours[i], windMax: d.daily.wind_speed_10m_max[i],
      windDirDominant: d.daily.wind_direction_10m_dominant[i]
    }))
  };
}

function gwp(sw: number, sd: number) {
  const p = [{ alt: 10, speed: sw, dir: sd, dirName: wd(sd) }];
  for (let a = 400; a <= 4000; a += 250) {
    const f = Math.min(3.5, 1 + (a - 10) * 0.0025);
    const s = Math.round(sw * f * 10) / 10;
    const dir = (sd + Math.min(45, ((a - 10) / 1000) * 15)) % 360;
    p.push({ alt: a, speed: s, dir: Math.round(dir), dirName: wd(dir) });
  }
  return p;
}

function cs(p: any[]) {
  if (p.length < 2) return { shear: 0, risk: "basso", desc: "Dati insufficienti" };
  const s = p[0], h = p[p.length - 1];
  const v = Math.abs(h.speed - s.speed) + Math.abs((h.dir - s.dir) % 360) * 0.5;
  let risk = "basso", desc = "Shear basso - Condizioni stabili";
  if (v > 30) { risk = "alto"; desc = "SHEAR FORTE - Volo pericoloso!"; }
  else if (v > 20) { risk = "medio"; desc = "Shear forte - Richiesta esperienza"; }
  else if (v > 10) { risk = "medio-basso"; desc = "Shear moderato - Attenzione"; }
  return { shear: Math.round(v * 10) / 10, risk, desc };
}

function ctp(dayData: HourData[], el: number) {
  if (!dayData?.length) return null;
  const temps = dayData.map((h) => h.temperature);
  const maxT = Math.max(...temps), minT = Math.min(...temps);
  const delta = Math.round(maxT - minT);
  const avgT = temps.reduce((a, b) => a + b, 0) / temps.length;
  const avgDew = dayData.reduce((s, h) => s + h.dewPoint, 0) / dayData.length;
  const avgCloud = dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length;
  const avgHum = dayData.reduce((s, h) => s + h.humidity, 0) / dayData.length;
  const cb = Math.round((avgT - avgDew) * 120 + el);
  const tt = Math.round(el + delta * 100);
  const si = Math.min(10, Math.round(delta / 2 + (avgCloud < 40 ? 2 : 0) + (avgHum < 50 ? 1 : 0)));
  return {
    cloudBase: cb, thermalTop: tt, delta, avgT, maxT, minT, avgCloud, avgHum, soarIdx: si,
    hourly: dayData.filter((h) => h.time.getHours() >= 9 && h.time.getHours() <= 19).map((h) => ({
      hour: h.time.getHours(), temp: h.temperature,
      intensity: Math.round(((h.temperature - minT) / 10) * 1.5 * 10) / 10,
      cloudBase: Math.round((h.temperature - h.dewPoint) * 120 + el),
      wind: h.windSpeed, dir: h.windDir, cloud: h.cloudCover
    }))
  };
}

function calcTurbulence(dayData: HourData[], h: number, alt: number): number {
  const hd = dayData.find((x) => x.time.getHours() === h);
  if (!hd) return 0;
  const gustFactor = hd.windGust / Math.max(hd.windSpeed, 1);
  const windFactor = Math.min(hd.windSpeed * 0.12, 2.5);
  const cloudFactor = hd.cloudCover > 70 ? 1.5 : hd.cloudCover > 40 ? 0.8 : 0.3;
  const altFactor = (alt - 500) / 3000;
  return Math.min(5, Math.max(1, Math.round(windFactor + cloudFactor + gustFactor * 0.5 + altFactor)));
}

function genAI(dayData: HourData[], site: any, thermal: any, wp: any[]) {
  if (!dayData?.length) return null;
  const maxW = Math.max(...dayData.map((h) => h.windSpeed));
  const avgC = dayData.reduce((s, h) => s + h.cloudCover, 0) / dayData.length;
  const hasRain = dayData.some((h) => h.precipitation > 0.5);
  const hasStorm = dayData.some((h) => h.weatherCode >= 95);
  const soar = thermal?.soarIdx || 0;
  const shear = wp ? cs(wp) : null;
  let rs = 0;
  if (maxW > 25) rs += 2;
  if (hasStorm) rs += 3;
  if (soar < 3) rs += 1;
  if (shear?.risk === "alto") rs += 2;
  else if (shear?.risk === "medio") rs += 1;
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
  if (shear) adv += shear.desc + "\n";
  let th = "ANALISI TERMICHE\n\n";
  if (thermal) {
    th += "* Base nuvole: " + thermal.cloudBase + "m\n* Plafond: " + thermal.thermalTop + "m\n* Delta: " + thermal.delta + " C\n* Soaring Index: " + thermal.soarIdx + "/10\n";
    if (soar >= 7) th += "\nGalleggiamento eccellente!\n"; else if (soar >= 5) th += "\nBuon galleggiamento.\n"; else th += "\nGalleggiamento scarso.\n";
    thermal.hourly.forEach((h: any) => { th += "* " + String(h.hour).padStart(2, "0") + ":00 -> " + h.intensity + "m/s\n"; });
  }
  let a = "QUOTE E PLAFOND\n\n";
  if (thermal) {
    a += "* Base decollo: " + (site.altitude || 1500) + "m\n* Cloud Base: " + thermal.cloudBase + "m\n* Thermal Top: " + thermal.thermalTop + "m\n";
    if (soar >= 7 && thermal.thermalTop > 3000) a += "\nCross Country eccellente!\n"; else if (soar >= 5 && thermal.thermalTop > 2500) a += "\nBuono per cross.\n"; else a += "\nCross limitato.\n";
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
  return { general: gen, advice: adv, thermal: th, altitude: a, hourly: hh, pressure: press, thunderstorm: storm };
}

export default function Index() {
  const [selected, setSelected] = useState(DECOLLI[0].id);
  const [meteo, setMeteo] = useState<{ hourly: HourData[]; daily: DailyData[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [hour, setHour] = useState(12);
  const [tab, setTab] = useState<"meteo" | "venti" | "termiche" | "analisi">("meteo");
  const [aiData, setAiData] = useState<Record<string, string> | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const site = DECOLLI.find((x) => x.id === selected)!;

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try { setMeteo(await fetchMeteo(site.lat, site.lon)); }
      catch (e: any) { setError(e.message || "Errore caricamento dati"); }
      finally { setLoading(false); }
    })();
  }, [selected]);

  const dayData = useMemo(() => {
    if (!meteo) return [];
    const start = new Date(); start.setDate(start.getDate() + dayIdx); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return meteo.hourly.filter((h) => h.time >= start && h.time < end);
  }, [meteo, dayIdx]);

  const current = useMemo(() => dayData.length > 0 ? dayData[Math.min(hour, dayData.length - 1)] : null, [dayData, hour]);
  const thermal = useMemo(() => dayData.length > 0 ? ctp(dayData, site.altitude || 1500) : null, [dayData, site.altitude]);
  const windProfile = useMemo(() => current ? gwp(current.windSpeed, current.windDir) : null, [current]);

  useEffect(() => {
    if (!meteo || !dayData.length) return;
    setAiLoading(true);
    const t = setTimeout(() => { setAiData(genAI(dayData, site, thermal, windProfile)); setAiLoading(false); }, 200);
    return () => clearTimeout(t);
  }, [dayData, thermal, windProfile, site]);

  const enrichedDaily = useMemo(() => {
    if (!meteo?.daily) return [];
    return meteo.daily.map((d, i) => {
      const hh = meteo.hourly.filter((h) => h.time.getDate() === d.date.getDate() && h.time.getMonth() === d.date.getMonth());
      const temps = hh.map((h) => h.temperature).filter((t) => t != null);
      const delta = temps.length > 0 ? Math.round(Math.max(...temps) - Math.min(...temps)) : 0;
      return { ...d, delta, idx: i };
    });
  }, [meteo]);

  const dateLabels = enrichedDaily.map((d) => d.date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }));
  const pressureGrad = useMemo(() => {
    if (dayData.length < 2) return { grad: 0, desc: "Dati insufficienti" };
    const g = dayData[dayData.length - 1].pressure - dayData[0].pressure;
    return { grad: Math.round(g * 10) / 10, desc: g > 3 ? "In aumento" : g < -3 ? "In diminuzione" : "Stabile" };
  }, [dayData]);

  const hours9to19 = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const turbQuotes = [1000, 1500, 2000, 2500, 3000];
  const diffColor = (d: number) => d <= 2 ? "#4caf50" : d <= 3 ? "#ff9800" : "#f44336";
  const diffLabel = (d: number) => d <= 2 ? "Facile" : d <= 3 ? "Medio" : "Difficile";
  const turbColor = (v: number) => { if (v <= 1) return "#4caf50"; if (v <= 2) return "#8bc34a"; if (v <= 3) return "#ff9800"; if (v <= 4) return "#ff5722"; return "#f44336"; };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "linear-gradient(135deg,#0a0e27,#1a1a3e)", color: "#eee" }}>
      <div className="w-12 h-12 border-4 border-white/10 border-t-red-400 rounded-full animate-spin" />
      <p className="mt-4 text-lg">Caricamento previsioni...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "linear-gradient(135deg,#0a0e27,#1a1a3e)", color: "#eee" }}>
      <p className="text-red-400 text-lg mb-4">Errore: {error}</p>
      <button className="bg-red-500 text-white px-7 py-2.5 rounded-lg font-semibold cursor-pointer" onClick={() => window.location.reload()}>Riprova</button>
    </div>
  );

  return (
    <div style={{ background: "linear-gradient(135deg,#0a0e27 0%,#1a1a3e 30%,#16213e 60%,#0d1b2a 100%)", color: "#eee", minHeight: "100vh", fontFamily: "'Segoe UI',sans-serif" }}>
      <header className="text-center mb-5 py-4 border-b border-white/10">
        <div className="flex items-center justify-center gap-2.5">
          <span className="text-4xl md:text-5xl animate-bounce">🐰</span>
          <span className="text-3xl md:text-4xl animate-pulse">🪂</span>
          <span className="text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-red-400 to-yellow-300 bg-clip-text text-transparent">Meteo dei Conigli</span>
        </div>
        <p className="text-sm text-gray-500 mt-1.5">Previsioni per volo libero - Open-Meteo - SHV FSVL Style</p>
      </header>
      <div className="grid md:grid-cols-[260px_1fr] gap-4 max-w-7xl mx-auto px-2.5">
        <div className="bg-white/5 rounded-2xl border border-white/10 p-3 backdrop-blur md:h-[calc(100vh-180px)] overflow-hidden">
          <h3 className="text-lg text-red-400 mb-3 font-bold">Decolli</h3>
          <div className="overflow-y-auto h-[calc(100%-40px)] pr-1">
            {DECOLLI.map((d) => {
              const sel = d.id === selected;
              const cw = sel && current ? wic(current.weatherCode, current.isDay) : "";
              return (
                <button key={d.id} onClick={() => { setSelected(d.id); setHour(12); setDayIdx(0); }} className={"w-full text-left rounded-xl p-2.5 mb-1.5 cursor-pointer transition-colors " + (sel ? "bg-red-500/15 border border-red-500" : "bg-white/5 border border-white/10")}>
                  <div className="flex justify-between items-center"><span className="font-bold text-sm">{d.name}</span><span>{sel ? cw : ""}</span></div>
                  <div className="flex justify-between text-xs text-gray-500 mt-0.5"><span>{d.valley}</span><span>{d.exposure}</span></div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold text-white" style={{background: diffColor(d.difficulty)}}>{diffLabel(d.difficulty)}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold text-white" style={{background: "#2196f3"}}>{d.altitude}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-4 md:max-h-[calc(100vh-180px)] overflow-y-auto backdrop-blur">
          {current && site && (
            <>
              <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-3 flex-wrap gap-2">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white">{site.name}</h2>
                  <span className="text-xs text-gray-500">{site.exposure} - {site.valley} - {site.altitude}m</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                  <span className="text-2xl md:text-3xl">{wic(current.weatherCode, current.isDay)}</span>
                  <span className="text-xl md:text-2xl font-bold text-yellow-300">{Math.round(current.temperature)}°C</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 mb-4">
                {(["meteo", "venti", "termiche", "analisi"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={"py-1.5 px-1 rounded-lg border border-white/10 text-xs font-semibold text-center transition-colors " + (tab === t ? "bg-red-500/20 text-red-400" : "bg-transparent text-gray-400")}>
                    {t === "meteo" ? "Meteo" : t === "venti" ? "Venti" : t === "termiche" ? "Termiche" : "Analisi"}
                  </button>
                ))}
              </div>
              {tab === "meteo" && (
                <>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {enrichedDaily.map((d, i) => (
                      <button key={i} onClick={() => { set setDayIdx(i); setHour(12); }} className={"rounded-xl p-2 text-center cursor-pointer " + (dayIdx === i ? "bg-red-500/15 border border-red-500" : "bg-black/20 border border-white/10")}>
                        <div className="text-xs font-semibold">{dateLabels[i]}</div>
                        <div className="text-xl my-0.5">{wic(d.weatherCode, 1)}</div>
                        <div className="text-sm text-red-400 font-semibold">{Math.round(d.tempMax)}°/{Math.round(d.tempMin)}°</div>
                        <div className="text-xs text-gray-500">Δ{d.delta}°C</div>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2.5 mb-3 py-1.5 px-3 bg-white/5 rounded-xl">
                    <span className="text-xs text-gray-500">⏰ Ora</span>
                    <input type="range" min={0} max={23} value={hour} onChange={(e) => setHour(parseInt(e.target.value))} className="flex-1 h-1 accent-red-400 min-w-[60px]" />
                    <span className="text-sm font-bold text-white min-w-[40px] text-center">{String(hour).padStart(2, "0")}:00</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
                    {[
                      ["Temperatura", Math.round(current.temperature) + "°C", "Δ " + (thermal?.delta || 0) + "°C"],
                      ["Umidità", Math.round(current.humidity) + "%", "Rugiada " + Math.round(current.dewPoint) + "°C"],
                      ["Nuvolosità", Math.round(current.cloudCover) + "%", ct(current.cloudCover)],
                      ["Precipitazioni", current.precipitation === 0 ? "Assenti" : current.precipitation + " mm", current.precipitation === 0 ? "Ideale" : "Pioggia"],
                      ["Base Nuvole", thermal ? thermal.cloudBase + "m" : "--", "Cloud Base"],
                      ["Plafond", thermal ? thermal.thermalTop + "m" : "--", "Thermal Top"],
                      ["Galleggiamento", thermal ? thermal.soarIdx + "/10" : "--", "Soaring Index"],
                      ["Vento", wa(current.windDir) + " " + Math.round(current.windSpeed) + " km/h", wd(current.windDir) + " • ⚡" + Math.round(current.windGust) + " km/h"],
                    ].map(([l, v, s]) => (
                      <div key={l as string} className="bg-black/30 p-2 rounded-xl border border-white/5">
                        <div className="text-xs text-gray-500 font-medium">{l}</div>
                        <div className="text-sm md:text-base font-bold text-white">{v}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{s}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3 p-2.5 bg-black/30 rounded-xl border border-white/5">
                    <h4 className="text-sm text-blue-300 mb-2.5 font-semibold">Pressione</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Attuale</div>
                        <div className="text-lg font-bold text-white">{Math.round(current.pressure)} hPa</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Gradiente</div>
                        <div className="text-lg font-bold" style={{color: pressureGrad.grad > 0 ? "#4caf50" : pressureGrad.grad < 0 ? "#f44336" : "#ffd93d"}}>
                          {pressureGrad.grad > 0 ? "↑" : pressureGrad.grad < 0 ? "↓" : "→"} {Math.abs(pressureGrad.grad)} hPa
                        </div>
                        <div className="text-xs text-gray-500">{pressureGrad.desc}</div>
                      </div>
                    </div>
                  </div>
                  {aiData?.thunderstorm && (
                    <div className={"p-2 rounded-lg mb-2 " + (aiData.thunderstorm.includes("ALLERTA") ? "bg-red-500/15 border-2 border-red-500" : "bg-green-500/10 border border-green-500/30")}>
                      <div className="text-xs leading-relaxed whitespace-pre-wrap text-gray-200">{aiData.thunderstorm}</div>
                    </div>
                  )}
                </>
              )}
              {tab === "venti" && (
                <>
                  <h4 className="text-sm text-blue-300 mb-2.5 font-semibold">Turbolenza per quota</h4>
                  <div className="overflow-x-auto mb-3">
                    <table className="w-full border-collapse text-xs min-w-[500px]">
                      <thead>
                        <tr>
                          <th className="text-center p-1 text-gray-500 border-b border-white/10 sticky top-0" style={{background: "#0d1b2a"}}>Ora</th>
                          {turbQuotes.map((q) => (
                            <th key={q} className="text-center p-1 text-blue-300 border-b border-white/10 sticky top-0" style={{background: "#0d1b2a"}}>{q}m</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hours9to19.map((h) => {
                          const hd = dayData.find((x) => x.time.getHours() === h);
                          if (!hd) return null;
                          return (
                            <tr key={h}>
                              <td className="text-center p-1 text-gray-500 border-b border-white/5">{String(h).padStart(2, "0")}:00</td>
                              {turbQuotes.map((q) => {
                                const tv = calcTurbulence(dayData, h, q);
                                return (
                                  <td key={q} className="text-center p-1 border-b border-white/5">
                                    <span className="inline-block w-6 h-6 leading-6 rounded-full text-white font-bold text-xs" style={{background: turbColor(tv)}}>{tv}</span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-black/30 rounded-xl border border-white/5">
                    <div className="text-xs text-gray-500 w-full mb-1 font-semibold">Legenda Turbolenza:</div>
                    {[
                      [1, "Calma"],
                      [2, "Leggera"],
                      [3, "Moderata"],
                      [4, "Forte"],
                      [5, "Estrema"],
                    ].map(([v, l]) => (
                      <div key={v} className="flex items-center gap-1">
                        <span className="inline-block w-4 h-4 leading-4 rounded-full text-white font-bold text-xs text-center" style={{background: turbColor(v as number)}}>{v}</span>
                        <span className="text-xs text-gray-400">{l}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {tab === "termiche" && (
                <>{aiData && ["thermal", "altitude", "hourly"].map((key) => (<div key={key} className="mb-2.5 p-2 bg-black/30 rounded-xl border border-white/5"><div className="text-xs leading-relaxed whitespace-pre-wrap text-gray-200">{aiData[key]}</div></div>))}</>
              )}
              {tab === "analisi" && (
                <div className="mb-4 bg-black/40 rounded-xl border border-red-500/20 overflow-hidden">
                  <div className="flex items-center gap-2 p-2 bg-red-500/10 border-b border-red-500/10">
                    <h4 className="text-sm text-red-400 font-semibold m-0">Analisi Completa</h4>
                    {aiLoading && <span className="ml-auto text-xs text-yellow-300">Analisi...</span>}
                  </div>
                  <div className="p-2 max-h-[480px] overflow-y-auto">
                    {aiData && !aiLoading && ["general", "advice", "pressure", "thunderstorm"].map((key) => (
                      <div key={key} className="mb-2.5 p-2 bg-black/30 rounded-xl border border-white/5">
                        <div className="text-xs leading-relaxed whitespace-pre-wrap text-gray-200">{aiData[key]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <footer className="text-center mt-5 py-3 border-t border-white/5">
        <p className="text-xs text-gray-600">Dati da Open-Meteo.com - Ispirato SHV FSVL - Beta v2.0</p>
        <p className="text-xs text-gray-500 mt-1">Vola sicuro!</p>
      </footer>
    </div>
  );
}