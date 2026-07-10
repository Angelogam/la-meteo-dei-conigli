"use client";
import React, { useEffect, useState, useMemo } from "react";

const DECOLLI = [
  { id: "malanotte", name: "Malanotte", lat: 44.25874571728482, lon: 7.794304664370852, exposure: "S/SE", valley: "Valle Infernotto", difficulty: 3, altitude: 1740 },
  { id: "colle_di_tenda", name: "Colle di Tenda", lat: 44.15093973937469, lon: 7.569262924652476, exposure: "S", valley: "Valle Roya/Vermenagna", difficulty: 2, altitude: 1870 },
  { id: "boves", name: "Boves", lat: 44.32113720462757, lon: 7.544697617792515, exposure: "S", valley: "Cuneese", difficulty: 1, altitude: 900 },
  { id: "monte_male", name: "Monte Male – Dronero", lat: 44.43163071064606, lon: 7.362886778152897, exposure: "S", valley: "Valle Maira", difficulty: 3, altitude: 1500 },
  { id: "iretta", name: "Iretta", lat: 44.49893744007536, lon: 7.382036612070795, exposure: "S", valley: "Valle Maira", difficulty: 2, altitude: 1300 },
  { id: "val_mala", name: "Pratoni di Val Mala", lat: 44.50780117336976, lon: 7.346618978966227, exposure: "S", valley: "Valle Maira", difficulty: 2, altitude: 1400 },
  { id: "birrone", name: "Monte Birrone", lat: 44.5398927839592, lon: 7.25293945830122, exposure: "S", valley: "Valle Maira", difficulty: 4, altitude: 2131 },
  { id: "agnello", name: "Colle dell'Agnello", lat: 44.68282592463814, lon: 6.978200601250462, exposure: "S", valley: "Valle Varaita", difficulty: 5, altitude: 2748 },
  { id: "pian_mune_alto", name: "Pian Munè – Seggiovia", lat: 44.63861029121272, lon: 7.230889474766025, exposure: "S/SW", valley: "Valle Po", difficulty: 2, altitude: 1870 },
  { id: "pian_mune_basso", name: "Pian Munè – Bric Lombatera", lat: 44.65736521807557, lon: 7.260017009542715, exposure: "S", valley: "Valle Po", difficulty: 1, altitude: 1350 },
  { id: "martiniana_po", name: "Martiniana Po", lat: 44.60695265332723, lon: 7.38322612877631, exposure: "S", valley: "Valle Po", difficulty: 1, altitude: 900 },
  { id: "rucas_alto", name: "Rucas alto", lat: 44.74213930591463, lon: 7.220118689737356, exposure: "S/SE", valley: "Valle Infernotto", difficulty: 2, altitude: 1500 },
  { id: "montoso_basso", name: "Montoso – decollo basso", lat: 44.7643723437882, lon: 7.249757926713178, exposure: "SE", valley: "Valle Infernotto", difficulty: 1, altitude: 1250 },
  { id: "vandalino", name: "Monte Vandalino", lat: 44.83671231480542, lon: 7.173866924055591, exposure: "S/SE", valley: "Val Pellice", difficulty: 4, altitude: 2120 },
  { id: "pian_dell_alpe", name: "Pian dell'Alpe", lat: 45.06396153999711, lon: 7.028266530872771, exposure: "S", valley: "Val Chisone", difficulty: 3, altitude: 1700 },
  { id: "roletto", name: "Roletto – Piggi", lat: 44.93249288285819, lon: 7.310959031722244, exposure: "S", valley: "Pinerolese", difficulty: 1, altitude: 820 },
  { id: "piossasco", name: "Piossasco – Monte S. Giorgio", lat: 44.99671840144012, lon: 7.44800217882953, exposure: "S", valley: "Collina Torinese", difficulty: 1, altitude: 673 },
  { id: "truccetti", name: "Truccetti", lat: 45.07973511679036, lon: 7.342018342463826, exposure: "S", valley: "Canavese", difficulty: 1, altitude: 900 },
  { id: "val_della_torre", name: "Val della Torre", lat: 45.16262748864921, lon: 7.463716167415302, exposure: "S", valley: "Val della Torre", difficulty: 1, altitude: 970 },
  { id: "rocca_canavese", name: "Rocca Canavese – M. della Neve", lat: 45.32757754837493, lon: 7.572793582322621, exposure: "S", valley: "Canavese", difficulty: 2, altitude: 1100 },
  { id: "s_elisabetta", name: "Santa Elisabetta", lat: 45.4182733880574, lon: 7.641945041749434, exposure: "S", valley: "Canavese", difficulty: 1, altitude: 900 },
  { id: "s_elisabetta_alto", name: "Santa Elisabetta alto", lat: 45.44019393073506, lon: 7.648025947229948, exposure: "S", valley: "Canavese", difficulty: 2, altitude: 1100 },
  { id: "cavallaria", name: "Monte Cavallaria", lat: 45.51729363773779, lon: 7.798808327293107, exposure: "S", valley: "Canavese", difficulty: 2, altitude: 1300 },
  { id: "andrate", name: "Andrate", lat: 45.55063933418272, lon: 7.880775591143394, exposure: "S", valley: "Canavese", difficulty: 1, altitude: 1000 },
];

interface HourData { time: Date; temperature: number; dewPoint: number; humidity: number; cloudCover: number; precipitation: number; visibility: number; windSpeed: number; windGust: number; windDir: number; wind80m: number | null; windDir80m: number | null; wind120m: number | null; windDir120m: number | null; uvIndex: number; isDay: number; weatherCode: number; pressure: number; }
interface DailyData { date: Date; weatherCode: number; tempMax: number; tempMin: number; sunrise: Date; sunset: Date; uvMax: number; precipitationSum: number; precipitationHours: number; windMax: number; windDirDominant: number; }

const WI: Record<number, string> = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌧️", 55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "🌧️", 71: "❄️", 73: "❄️", 75: "❄️", 80: "🌧️", 81: "🌧️", 82: "⛈️", 95: "⛈️", 96: "⛈️", 99: "⛈️" };

function wic(code: number, day: number) { return WI[code] || (day ? "☀️" : "🌙"); }
function wd(deg: number) { if (deg === undefined || deg === null) return "--"; return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8]; }
function wa(deg: number) { if (deg === undefined || deg === null) return "➡️"; return ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round(deg / 45) % 8]; }
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
      time: new Date(t), temperature: d.hourly.temperature_2m[i], dewPoint: d.hourly.dewpoint_2m[i], humidity: d.hourly.relativehumidity_2m[i], cloudCover: d.hourly.cloudcover[i], precipitation: d.hourly.precipitation[i] || 0, visibility: d.hourly.visibility ? d.hourly.visibility[i] / 1000 : 40, windSpeed: d.hourly.wind_speed_10m[i], windGust: d.hourly.wind_gusts_10m ? d.hourly.wind_gusts_10m[i] : d.hourly.wind_speed_10m[i] + 8, windDir: d.hourly.wind_direction_10m[i], wind80m: d.hourly.wind_speed_80m?.[i] ?? null, windDir80m: d.hourly.wind_direction_80m?.[i] ?? null, wind120m: d.hourly.wind_speed_120m?.[i] ?? null, windDir120m: d.hourly.wind_direction_120m?.[i] ?? null, uvIndex: d.hourly.uv_index?.[i] ?? 0, isDay: d.hourly.is_day?.[i] ?? 1, weatherCode: d.hourly.weathercode?.[i] ?? 0, pressure: d.hourly.pressure_msl?.[i] ?? 1013
    })),
    daily: d.daily.time.map((t: string, i: number) => ({
      date: new Date(t), weatherCode: d.daily.weathercode[i], tempMax: d.daily.temperature_2m_max[i], tempMin: d.daily.temperature_2m_min[i], sunrise: new Date(d.daily.sunrise[i]), sunset: new Date(d.daily.sunset[i]), uvMax: d.daily.uv_index_max[i], precipitationSum: d.daily.precipitation_sum[i], precipitationHours: d.daily.precipitation_hours[i], windMax: d.daily.wind_speed_10m_max[i], windDirDominant: d.daily.wind_direction_10m_dominant[i]
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
  let risk = "basso", desc = "✅ Shear basso - Condizioni stabili";
  if (v > 30) { risk = "alto"; desc = "⚠️ SHEAR FORTE - Volo pericoloso!"; } else if (v > 20) { risk = "medio"; desc = "⚡ Shear forte - Richiesta esperienza"; } else if (v > 10) { risk = "medio-basso"; desc = "🌀 Shear moderato - Attenzione"; }
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
  const val = Math.min(5, Math.max(1, Math.round(windFactor + cloudFactor + gustFactor * 0.5 + altFactor)));
  return val;
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
  let gen = "📋 PANORAMICA GENERALE\n\n🌅 La giornata al decollo di " + site.name + " si presenta ";
  if (avgC < 30) gen += "con cielo sereno. "; else if (avgC < 60) gen += "con cielo parzialmente nuvoloso. "; else gen += "con cielo nuvoloso. ";
  if (maxW > 25) gen += "💨 Vento forte (" + Math.round(maxW) + " km/h). "; else if (maxW > 15) gen += "💨 Vento moderato (" + Math.round(maxW) + " km/h). "; else gen += "💨 Vento debole (" + Math.round(maxW) + " km/h). ";
  gen += hasRain ? "🌧️ Precipitazioni previste. " : "✅ Nessuna precipitazione. ";
  gen += "📍 Esposizione: " + site.exposure + ".";
  let adv = "💡 CONSIGLI PER IL VOLO\n\n📊 Rischio: ";
  if (risk === "alto") adv += "🔴 ALTO - Sconsigliato!\n"; else if (risk === "medio") adv += "🟡 MEDIO - Attenzione!\n"; else adv += "🟢 BASSO - Favorevole!\n\n";
  if (maxW > 25) adv += "⚠️ Vento forte (>25 km/h).\n"; else if (maxW > 18) adv += "⚠️ Vento sostenuto (18-25 km/h).\n"; else if (maxW < 5) adv += "💨 Vento debole (<5 km/h).\n"; else adv += "✅ Vento ideale (5-18 km/h).\n";
  if (soar >= 7) adv += "🔥 Termiche forti - Ottime per cross!\n"; else if (soar >= 5) adv += "💪 Termiche medie - Buona attività.\n"; else adv += "🫤 Termiche deboli - Voli locali.\n";
  if (shear) adv += shear.desc + "\n";
  let th = "🔥 ANALISI TERMICHE\n\n";
  if (thermal) {
    th += "• Base nuvole: " + thermal.cloudBase + "m\n• Plafond: " + thermal.thermalTop + "m\n• Delta: " + thermal.delta + "°C\n• Soaring Index: " + thermal.soarIdx + "/10\n";
    if (soar >= 7) th += "\n🪂 Galleggiamento eccellente!\n"; else if (soar >= 5) th += "\n🪂 Buon galleggiamento.\n"; else th += "\n🪂 Galleggiamento scarso.\n";
    thermal.hourly.forEach((h: any) => { th += "• " + String(h.hour).padStart(2, "0") + ":00 → " + (h.intensity > 2 ? "🔥" : h.intensity > 1 ? "💪" : "🫤") + " " + h.intensity + "m/s\n"; });
  }
  let alt = "🏔️ QUOTE E PLAFOND\n\n";
  if (thermal) {
    alt += "• Base decollo: " + (site.altitude || 1500) + "m\n• Cloud Base: " + thermal.cloudBase + "m\n• Thermal Top: " + thermal.thermalTop + "m\n";
    if (soar >= 7 && thermal.thermalTop > 3000) alt += "\n✅ Cross Country eccellente!\n"; else if (soar >= 5 && thermal.thermalTop > 2500) alt += "\n👍 Buono per cross.\n"; else alt += "\n🫤 Cross limitato.\n";
  }
  let hour = "⏰ SVOLGIMENTO GIORNATA\n\n";
  for (let h = 9; h <= 19; h++) {
    const d = dayData.find((x) => x.time.getHours() === h); if (!d) continue;
    const hh = thermal?.hourly?.find((x: any) => x.hour === h);
    hour += "🕐 " + String(h).padStart(2, "0") + ":00 " + wic(d.weatherCode, d.isDay) + " " + Math.round(d.temperature) + "°C\n   • Vento: " + wa(d.windDir) + " " + Math.round(d.windSpeed) + " km/h (" + wd(d.windDir) + ")\n   • Nuvole: " + Math.round(d.cloudCover) + "% (" + ct(d.cloudCover) + ")\n";
    if (hh) hour += "   • Termiche: " + (hh.intensity > 2 ? "🔥" : hh.intensity > 1 ? "💪" : "🫤") + " " + hh.intensity + "m/s\n";
    if (d.precipitation > 0.5) hour += "   • 🌧️ Pioggia: " + Math.round(d.precipitation) + "mm\n";
  }
  let press = "📊 PRESSIONE\n\n";
  const pressures = dayData.filter((h) => h.pressure).map((h) => h.pressure);
  if (pressures.length > 0) {
    const avg = pressures.reduce((a, b) => a + b, 0) / pressures.length;
    const trend = pressures[pressures.length - 1] - pressures[0];
    press += "• Media: " + Math.round(avg) + " hPa\n• Trend: " + (trend > 3 ? "⬆️ In aumento" : trend < -3 ? "⬇️ In diminuzione" : "➡️ Stabile") + "\n";
    if (trend < -3) press += "⚠️ Possibile peggioramento!\n";
  }
  let storm = "⛈️ TEMPORALI\n\n";
  if (hasStorm) storm += "🔴 ALLERTA TEMPORALI! Volo sconsigliato!\n"; else if (hasRain && avgC > 70) storm += "🟡 Possibili temporali - Monitorare.\n"; else storm += "✅ Nessun temporale.\n";
  return { general: gen, advice: adv, thermal: th, altitude: alt, hourly: hour, pressure: press, thunderstorm: storm };
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
  useEffect(() => { (async () => { setLoading(true); setError(null); try { setMeteo(await fetchMeteo(site.lat, site.lon)); } catch (e: any) { setError(e.message || "Errore caricamento dati"); } finally { setLoading(false); } })(); }, [selected]);
  const dayData = useMemo(() => { if (!meteo) return []; const start = new Date(); start.setDate(start.getDate() + dayIdx); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1); return meteo.hourly.filter((h) => h.time >= start && h.time < end); }, [meteo, dayIdx]);
  const current = useMemo(() => dayData.length > 0 ? dayData[Math.min(hour, dayData.length - 1)] : null, [dayData, hour]);
  const thermal = useMemo(() => dayData.length > 0 ? ctp(dayData, site.altitude || 1500) : null, [dayData, site.altitude]);
  const windProfile = useMemo(() => current ? gwp(current.windSpeed, current.windDir) : null, [current]);
  useEffect(() => { if (!meteo || !dayData.length) return; setAiLoading(true); const t = setTimeout(() => { setAiData(genAI(dayData, site, thermal, windProfile)); setAiLoading(false); }, 200); return () => clearTimeout(t); }, [dayData, thermal, windProfile, site]);
  const enrichedDaily = useMemo(() => { if (!meteo?.daily) return []; return meteo.daily.map((d, i) => { const hh = meteo.hourly.filter((h) => h.time.getDate() === d.date.getDate() && h.time.getMonth() === d.date.getMonth()); const temps = hh.map((h) => h.temperature).filter((t) => t != null); const delta = temps.length > 0 ? Math.round(Math.max(...temps) - Math.min(...temps)) : 0; return { ...d, delta, idx: i }; }); }, [meteo]);
  const dateLabels = enrichedDaily.map((d) => d.date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }));
  const pressureGrad = useMemo(() => { if (dayData.length < 2) return { grad: 0, desc: "Dati insufficienti" }; const g = dayData[dayData.length - 1].pressure - dayData[0].pressure; return { grad: Math.round(g * 10) / 10, desc: g > 3 ? "⬆️ In aumento" : g < -3 ? "⬇️ In diminuzione" : "➡️ Stabile" }; }, [dayData]);
  const hours9to19 = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const turbQuotes = [1000, 1500, 2000, 2500, 3000];
  const diffColor = (d: number) => d <= 2 ? "#4caf50" : d <= 3 ? "#ff9800" : "#f44336";
  const diffLabel = (d: number) => d <= 2 ? "🟢 Facile" : d <= 3 ? "🟡 Medio" : "🔴 Difficile";

  const turbColor = (v: number) => {
    if (v <= 1) return "#4caf50";
    if (v <= 2) return "#8bc34a";
    if (v <= 3) return "#ff9800";
    if (v <= 4) return "#ff5722";
    return "#f44336";
  };
  const turbLabel = (v: number) => {
    if (v <= 1) return "🟢 Calma";
    if (v <= 2) return "🟡 Leggera";
    if (v <= 3) return "🟠 Moderata";
    if (v <= 4) return "🔴 Forte";
    return "⛔ Estrema";
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "linear-gradient(135deg,#0a0e27,#1a1a3e)", color: "#eee" }}>
      <div style={{ width: 50, height: 50, border: "4px solid rgba(255,255,255,0.1)", borderTopColor: "#ff6b6b", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <p style={{ marginTop: 16, fontSize: "clamp(1rem,4vw,1.3rem)" }}>🪂 Caricamento previsioni...</p>
    </div>
  );
  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "linear-gradient(135deg,#0a0e27,#1a1a3e)", color: "#eee" }}>
      <p style={{ color: "#ff6b6b", fontSize: "clamp(1rem,4vw,1.2rem)", marginBottom: 16 }}>❌ {error}</p>
      <button style={{ background: "#ff6b6b", color: "#fff", border: "none", padding: "10px 28px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "clamp(0.85rem,2.5vw,1rem)" }} onClick={() => window.location.reload()}>🔄 Riprova</button>
    </div>
  );

  return (
    <div style={{ background: "linear-gradient(135deg,#0a0e27 0%,#1a1a3e 30%,#16213e 60%,#0d1b2a 100%)", color: "#eee", minHeight: "100vh", fontFamily: "'Segoe UI',sans-serif", overflowX: "hidden" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes hop{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes glide{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(3deg) translateY(-6px)}}@media(max-width:768px){.main-grid{grid-template-columns:1fr!important}.left-panel{height:auto!important;max-height:250px!important}.right-panel{max-height:none!important}}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:rgba(255,255,255,.03);border-radius:10px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:10px}*{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) rgba(255,255,255,.03)}`}</style>
      <header style={{ textAlign: "center", marginBottom: 20, padding: "15px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <span style={{ fontSize: "clamp(2rem,6vw,2.8rem)", animation: "hop 1.2s ease-in-out infinite" }}>🐰</span>
          <span style={{ fontSize: "clamp(1.6rem,5vw,2.2rem)", animation: "glide 2.5s ease-in-out infinite" }}>🪂</span>
          <span style={{ fontSize: "clamp(1.5rem,5vw,2.5rem)", fontWeight: 800, background: "linear-gradient(135deg,#ff6b6b,#ffd93d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Meteo dei Conigli</span>
        </div>
        <p style={{ fontSize: "clamp(0.7rem,2vw,0.9rem)", color: "#888", marginTop: 6 }}>Previsioni per volo libero • Open-Meteo • SHV FSVL Style</p>
      </header>
      <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "minmax(260px,300px) 1fr", gap: "clamp(12px,3vw,20px)", maxWidth: 1400, margin: "0 auto", padding: "0 10px" }}>
        <div className="left-panel" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", padding: 12, overflow: "hidden", backdropFilter: "blur(10px)", height: "calc(100vh - 180px)" }}>
          <h3 style={{ fontSize: "clamp(0.9rem,2vw,1.1rem)", color: "#ff6b6b", marginBottom: 12, fontWeight: 700 }}>📍 Decolli</h3>
          <div style={{ overflowY: "auto", height: "calc(100% - 40px)", paddingRight: 4 }}>
            {```jsx
            {DECOLLI.map((d) => {
              const sel = d.id === selected;
              const cw = sel && current ? wic(current.weatherCode, current.isDay) : "☁️";
              return (
                <button key={d.id} onClick={() => { setSelected(d.id); setHour(12); setDayIdx(0); }} style={{ width: "100%", textAlign: "left", background: sel ? "rgba(255,107,107,0.12)" : "rgba(255,255,255,0.03)", border: "1px solid " + (sel ? "#ff6b6b" : "rgba(255,255,255,0.08)"), borderRadius: 10, padding: "8px 10px", marginBottom: 6, cursor: "pointer", transition: "all 0.2s", color: "#eee" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: "clamp(0.8rem,1.8vw,0.95rem)", fontWeight: 700 }}>{d.name}</span><span style={{ fontSize: "clamp(0.8rem,1.8vw,1.1rem)" }}>{sel ? cw : "☁️"}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(0.6rem,1.2vw,0.7rem)", color: "#888", marginTop: 2 }}><span>{d.valley}</span><span>{d.exposure}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "clamp(0.6rem,1.2vw,0.7rem)", color: "#888", marginTop: 3 }}>
                    <span style={{fontSize: "clamp(0.5rem,1vw,0.65rem)", padding: "1px 6px", borderRadius: 10, background: diffColor(d.difficulty), color: "#fff", fontWeight: 600 }}>{diffLabel(d.difficulty)}</span>
                    <span style={{ fontSize: "clamp(0.5rem,1vw,0.65rem)", padding: "1px 6px", borderRadius: 10, background: "#2196f3", color: "#fff", fontWeight: 600 }}>{d.altitude}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="right-panel" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", padding: "clamp(10px,2vw,18px)", maxHeight: "calc(100vh - 180px)", overflowY: "auto", backdropFilter: "blur(10px)" }}>
          {current && site && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h2 style={{ fontSize: "clamp(1.2rem,3.5vw,1.6rem)", fontWeight: 700, color: "#fff" }}>{site.name}</h2>
                  <span style={{ fontSize: "clamp(0.65rem,1.5vw,0.8rem)", color: "#888" }}>{site.exposure} • {site.valley} • {site.altitude}m</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", padding: "4px 12px", borderRadius: 30 }}>
                  <span style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)" }}>{wic(current.weatherCode, current.isDay)}</span>
                  <span style={{ fontSize: "clamp(1.2rem,3vw,1.5rem)", fontWeight: 700, color: "#ffd93d" }}>{Math.round(current.temperature)}°C</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginBottom: 14 }}>
                {(["meteo", "venti", "termiche", "analisi"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 4px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: tab === t ? "rgba(255,107,107,0.15)" : "transparent", color: tab === t ? "#ff6b6b" : "#aaa", cursor: "pointer", fontWeight: 600, fontSize: "clamp(0.55rem,1.3vw,0.8rem)", textAlign: "center", transition: "all 0.2s" }}>
                    {t === "meteo" ? "🌤️ Meteo" : t === "venti" ? "💨 Venti" : t === "termiche" ? "🔥 Termiche" : "🤖 Analisi"}
                  </button>
                ))}
              </div>
              {tab === "meteo" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
                    {enrichedDaily.map((d, i) => (
                      <button key={i} onClick={() => { setDayIdx(i); setHour(12); }} style={{ background: dayIdx === i ? "rgba(255,107,107,0.15)" : "rgba(255,255,255,0.04)", border: "1px solid " + (dayIdx === i ? "#ff6b6b" : "rgba(255,255,255,0.08)"), borderRadius: 10, padding: "8px 6px", cursor: "pointer", textAlign: "center", color: "#eee" }}>
                        <div style={{ fontSize: "clamp(0.6rem,1.3vw,0.75rem)", fontWeight: 600 }}>{dateLabels[i]}</div>
                        <div style={{ fontSize: "clamp(1rem,2.5vw,1.4rem)", margin: "2px 0" }}>{wic(d.weatherCode, 1)}</div>
                        <div style={{ fontSize: "clamp(0.7rem,1.5vw,0.85rem)", color: "#ff6b6b", fontWeight: 600 }}>{Math.round(d.tempMax)}°/{Math.round(d.tempMin)}°</div>
                        <div style={{ fontSize: "clamp(0.5rem,1vw,0.65rem)", color: "#888" }}>Δ{d.delta}°C</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "6px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 10 }}>
                    <span style={{ fontSize: "clamp(0.65rem,1.5vw,0.8rem)", color: "#888" }}>⏰ Ora</span>
                    <input type="range" min={0} max={23} value={hour} onChange={(e) => setHour(parseInt(e.target.value))} style={{ flex: 1, accentColor: "#ff6b6b", height: 4, minWidth: 60 }} />
                    <span style={{ fontSize: "clamp(0.7rem,1.8vw,0.85rem)", fontWeight: 700, color: "#fff", minWidth: 40, textAlign: "center" }}>{String(hour).padStart(2, "0")}:00</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 6, marginBottom: 12 }}>
                    {[
                      ["🌡️ Temperatura", Math.round(current.temperature) + "°C", "Δ " + (thermal?.delta || 0) + "°C"],
                      ["💧 Umidità", Math.round(current.humidity) + "%", "Rugiada " + Math.round(current.dewPoint) + "°C"],
                      ["☁️ Nuvolosità", Math.round(current.cloudCover) + "%", ct(current.cloudCover)],
                      ["🌧️ Precipitazioni", current.precipitation === 0 ? "✅ Assenti" : current.precipitation + " mm", current.precipitation === 0 ? "Ideale" : "⚠️ Pioggia"],
                      ["🏔️ Base Nuvole", thermal ? thermal.cloudBase + "m" : "--", "Cloud Base"],
                      ["📈 Plafond", thermal ? thermal.thermalTop + "m" : "--", "Thermal Top"],
                      ["🪂 Galleggiamento", thermal ? thermal.soarIdx + "/10" : "--", "Soaring Index"],
                      ["💨 Vento", wa(current.windDir) + " " + Math.round(current.windSpeed) + " km/h", wd(current.windDir) + " • ⚡" + Math.round(current.windGust) + " km/h"],
                    ].map(([l, v, s]) => (
                      <div key={l as string} style={{ background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: "clamp(0.55rem,1.2vw,0.7rem)", color: "#888", fontWeight: 500 }}>{l}</div>
                        <div style={{ fontSize: "clamp(0.8rem,2vw,1rem)", fontWeight: 700, color: "#fff" }}>{v}</div>
                        <div style={{ fontSize: "clamp(0.5rem,1vw,0.65rem)", color: "#666", marginTop: 1 }}>{s}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <h4 style={{ fontSize: "clamp(0.8rem,2vw,0.95rem)", color: "#4fc3f7", marginBottom: 10, fontWeight: 600 }}>📊 Pressione</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "clamp(0.6rem,1.3vw,0.75rem)", color: "#888" }}>Attuale</div>
                        <div style={{ fontSize: "clamp(1rem,2.5vw,1.2rem)", fontWeight: 700, color: "#fff" }}>{Math.round(current.pressure)} hPa</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "clamp(0.6rem,1.3vw,0.75rem)", color: "#888" }}>Gradiente</div>
                        <div style={{ fontSize: "clamp(1rem,2.5vw,1.2rem)", fontWeight: 700, color: pressureGrad.grad > 0 ? "#4caf50" : pressureGrad.grad < 0 ? "#f44336" : "#ffd93d" }}>
                          {pressureGrad.grad > 0 ? "⬆️" : pressureGrad.grad < 0 ? "⬇️" : "➡️"} {Math.abs(pressureGrad.grad)} hPa
                        </div>
                        <div style={{ fontSize: "clamp(0.5rem,1vw,0.65rem)", color: "#888" }}>{pressureGrad.desc}</div>
                      </div>
                    </div>
                  </div>
                  {aiData?.thunderstorm && (
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: aiData.thunderstorm.includes("ALLERTA") ? "rgba(244,67,54,0.12)" : "rgba(76,175,80,0.08)", border: aiData.thunderstorm.includes("ALLERTA") ? "2px solid #f44336" : "1px solid rgba(76,175,80,0.3)", marginBottom: 8 }}>
                      <div style={{ fontSize: "clamp(0.65rem,1.5vw,0.8rem)", color: "#e0e0e0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiData.thunderstorm}</div>
                    </div>
                  )}
                </>
              )}
              {tab === "venti" && (
                <>
                  <h4 style={{ fontSize: "clamp(0.8rem,2vw,0.95rem)", color: "#4fc3f7", marginBottom: 10, fontWeight: 600 }}>💨 Turbolenza per quota</h4>
                  <div style={{ overflowX: "auto", marginBottom: 12 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "clamp(0.55rem,1.2vw,0.7rem)", minWidth: 500 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "center", padding: "4px 6px", color: "#888", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, background: "#0d1b2a" }}>Ora</th>
                          {turbQuotes.map((q) => (
                            <th key={q} style={{ textAlign: "center", padding: "4px 6px", color: "#4fc3f7", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, background: "#0d1b2a" }}>{q}m</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hours9to19.map((h) => {
                          const hd = dayData.find((x) => x.time.getHours() === h);
                          if (!hd) return null;
                          return (
                            <tr key={h}>
                              <td style={{ textAlign: "center", padding: "3px 4px", color: "#888", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{String(h).padStart(2, "0")}:00</td>
                              {turbQuotes.map((q) => {
                                const tv = calcTurbulence(dayData, h, q);
                                return (
                                  <td key={q} style={{ textAlign: "center", padding: "3px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                    <span style={{ display: "inline-block", width: 24, height: 24, lineHeight: "24px", borderRadius: "50%", background: turbColor(tv), color: "#fff", fontWeight: 700, fontSize: "clamp(0.5rem,1.1vw,0.65rem)" }}>{tv}</span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: "clamp(0.55rem,1.2vw,0.65rem)", color: "#888", width: "100%", marginBottom: 4, fontWeight: 600 }}>Legenda Turbolenza:</div>
                    {[
                      [1, "🟢 Calma"],
                      [2, "🟡 Leggera"],
                      [3, "🟠 Moderata"],
                      [4, "🔴 Forte"],
                      [5, "⛔ Estrema"],
                    ].map(([v, l]) => (
                      <div key={v} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ display: "inline-block", width: 18, height: 18, lineHeight: "18px", borderRadius: "50%", background: turbColor(v as number), color: "#fff", fontWeight: 700, fontSize: "clamp(0.45rem,1vw,0.55rem)", textAlign: "center" }}>{v}</span>
                        <span style={{ fontSize: "clamp(0.5rem,1.1vw,0.6rem)", color: "#ccc" }}>{l}</span>
                      </div>
                    ))}
                  </div>
                  <h4 style={{ fontSize: "clamp(0.8rem,2vw,0.95rem)", color: "#4fc3f7", marginBottom: 10, fontWeight: 600 }}>💨 Venti in quota (10m / 80m / 120m)</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 6, marginBottom: 12 }}>
                    {[
                      ["10m", wa(current.windDir) + " " + Math.round(current.windSpeed) + " km/h", wd(current.windDir), "⚡" + Math.round(current.windGust) + " km/h"],
                      ["80m", current.wind80m ? wa(current.windDir80m!) + " " + Math.round(current.wind80m) : "N/D", current.wind80m ? wd(current.windDir80m!) : "--", current.wind80m ? "⚡" + Math.round(current.wind80m * 1.3) + " km/h" : ""],
                      ["120m", current.wind120m ? wa(current.windDir120m!) + " " + Math.round(current.wind120m) : "N/D", current.wind120m ? wd(current.windDir120m!) : "--", current.wind120m ? "⚡" + Math.round(current.wind120m * 1.35) + " km/h" : ""],
                    ].map(([l, v, d, g]) => (
                      <div key={l as string} style={{ textAlign: "center", padding: "8px 6px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                        <div style={{ fontSize: "clamp(0.55rem,1.2vw,0.7rem)", color: "#888" }}>{l}</div>
                        <div style={{ fontSize: "clamp(0.75rem,1.8vw,0.9rem)", fontWeight: 700, color: "#fff" }}>{v}</div>
                        <div style={{ fontSize: "clamp(0.6rem,1.3vw,0.7rem)", color: "#aaa" }}>{d}</div>
                        <div style={{ fontSize: "clamp(0.5rem,1vw,0.65rem)", color: "#ff6b6b" }}>{g}</div>
                      </div>
                    ))}
                  </div>
                  <h4 style={{ fontSize: "clamp(0.8rem,2vw,0.95rem)", color: "#4fc3f7", marginBottom: 10, fontWeight: 600 }}>📊 Profilo Vento (400m - 4000m)</h4>
                  <div style={{ marginBottom: 12, padding: "8px 10px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", maxHeight: 320, overflowY: "auto" }}>
                    {windProfile?.map((p, i) => {
                      const maxSpd = current.windSpeed * 3.5;
                      const bw = Math.min(100, (p.speed / maxSpd) * 100);
                      const wcC = (s: number, m: number) => { const r = s / m; if (r < 0.3) return "#4caf50"; if (r < 0.5) return "#8bc34a"; if (r < 0.7) return "#ff9800"; if (r < 0.9) return "#ff5722"; return "#f44336"; };
                      return (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "55px 1fr 40px", gap: 6, alignItems: "center", padding: "2px 4px", fontSize: "clamp(0.55rem,1.2vw,0.7rem)" }}>
                          <span style={{ color: "#888" }}>{p.alt === 10 ? "Sup" : p.alt + "m"}</span>
                          <div style={{ height: 14, background: "rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: bw + "%", background: wcC(p.speed, maxSpd), borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 3, minWidth: 30, transition: "width 0.3s" }}>
                              <span style={{ fontSize: "clamp(0.45rem,1vw,0.55rem)", color: "#fff", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{p.speed}</span>
                            </div>
                          </div>
                          <span style={{ color: "#aaa", textAlign: "center" }}>{wa(p.dir)}</span>
                        </div>
                      );
                    })}
                  </div>
                  {windProfile && (() => { const sh = cs(windProfile); return (<div style={{ padding: 8, borderRadius: 8, border: "2px solid " + (sh.risk === "alto" ? "#f44336" : sh.risk === "medio" ? "#ff9800" : "#4caf50"), background: "rgba(0,0,0,0.2)", marginTop: 8, fontSize: "clamp(0.6rem,1.3vw,0.75rem)" }}><strong>🌪️ Wind Shear: {sh.shear}</strong><br />{sh.desc}</div>); })()}
                </>
              )}
              {tab === "termiche" && (
                <>{aiData && ["thermal", "altitude", "hourly"].map((key) => (<div key={key} style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}><div style={{ fontSize: "clamp(0.65rem,1.5vw,0.8rem)", color: "#e0e0e0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiData[key]}</div></div>))}</>
              )}
              {tab === "analisi" && (
                <div style={{ marginBottom: 14, background: "rgba(0,0,0,0.35)", borderRadius: 12, border: "1px solid rgba(255,107,107,0.12)", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(255,107,107,0.06)", borderBottom: "1px solid rgba(255,107,107,0.08)" }}>
                    <span style={{ fontSize: "clamp(1rem,2.5vw,1.3rem)" }}>🤖</span>
                    <h4 style={{ fontSize: "clamp(0.8rem,2vw,1rem)", color: "#ff6b6b", fontWeight: 600, margin: 0 }}>Analisi Completa</h4>
                    {aiLoading && <span style={{ marginLeft: "auto", fontSize: "clamp(0.6rem,1.5vw,0.75rem)", color: "#ffd93d" }}>⏳ Analisi...</span>}
                  </div>
                  <div style={{ padding: "8px 14px", maxHeight: 480, overflowY: "auto" }}>
                    {aiData && !aiLoading && ["general", "advice", "pressure", "thunderstorm"].map((key) => (
                      <div key={key} style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: "clamp(0.65rem,1.5vw,0.8rem)", color: "#e0e0e0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiData[key]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <footer style={{ textAlign: "center", marginTop: 20, padding: "14px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: "clamp(0.55rem,1.2vw,0.7rem)", color: "#666" }}>Dati da Open-Meteo.com • Ispirato SHV FSVL • Beta v2.0</p>
        <p style={{ fontSize: "clamp(0.55rem,1.2vw,0.7rem)", color: "#444", marginTop: 4 }}>🐰 Vola sicuro! 🪂</p>
      </footer>
    </div>
  );
}
```

<dyad-command type="restart"></dyad-command>Ecco la continuazione del file da dove si era interrotto.

<dyad-write path="src/pages/Index.tsx" description="Completamento del file - ultima parte del JSX">
                </button>
              );
            })}
          </div>
        </div>
        <div className="right-panel" style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", padding: "clamp(10px,2vw,18px)", maxHeight: "calc(100vh - 180px)", overflowY: "auto", backdropFilter: "blur(10px)" }}>
          {current && site && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h2 style={{ fontSize: "clamp(1.2rem,3.5vw,1.6rem)", fontWeight: 700, color: "#fff" }}>{site.name}</h2>
                  <span style={{ fontSize: "clamp(0.65rem,1.5vw,0.8rem)", color: "#888" }}>{site.exposure} • {site.valley} • {site.altitude}m</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.08)", padding: "4px 12px", borderRadius: 30 }}>
                  <span style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)" }}>{wic(current.weatherCode, current.isDay)}</span>
                  <span style={{ fontSize: "clamp(1.2rem,3vw,1.5rem)", fontWeight: 700, color: "#ffd93d" }}>{Math.round(current.temperature)}°C</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4, marginBottom: 14 }}>
                {(["meteo", "venti", "termiche", "analisi"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 4px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: tab === t ? "rgba(255,107,107,0.15)" : "transparent", color: tab === t ? "#ff6b6b" : "#aaa", cursor: "pointer", fontWeight: 600, fontSize: "clamp(0.55rem,1.3vw,0.8rem)", textAlign: "center", transition: "all 0.2s" }}>
                    {t === "meteo" ? "🌤️ Meteo" : t === "venti" ? "💨 Venti" : t === "termiche" ? "🔥 Termiche" : "🤖 Analisi"}
                  </button>
                ))}
              </div>
              {tab === "meteo" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 12 }}>
                    {enrichedDaily.map((d, i) => (
                      <button key={i} onClick={() => { setDayIdx(i); setHour(12); }} style={{ background: dayIdx === i ? "rgba(255,107,107,0.15)" : "rgba(255,255,255,0.04)", border: "1px solid " + (dayIdx === i ? "#ff6b6b" : "rgba(255,255,255,0.08)"), borderRadius: 10, padding: "8px 6px", cursor: "pointer", textAlign: "center", color: "#eee" }}>
                        <div style={{ fontSize: "clamp(0.6rem,1.3vw,0.75rem)", fontWeight: 600 }}>{dateLabels[i]}</div>
                        <div style={{ fontSize: "clamp(1rem,2.5vw,1.4rem)", margin: "2px 0" }}>{wic(d.weatherCode, 1)}</div>
                        <div style={{ fontSize: "clamp(0.7rem,1.5vw,0.85rem)", color: "#ff6b6b", fontWeight: 600 }}>{Math.round(d.tempMax)}°/{Math.round(d.tempMin)}°</div>
                        <div style={{ fontSize: "clamp(0.5rem,1vw,0.65rem)", color: "#888" }}>Δ{d.delta}°C</div>
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "6px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 10 }}>
                    <span style={{ fontSize: "clamp(0.65rem,1.5vw,0.8rem)", color: "#888" }}>⏰ Ora</span>
                    <input type="range" min={0} max={23} value={hour} onChange={(e) => setHour(parseInt(e.target.value))} style={{ flex: 1, accentColor: "#ff6b6b", height: 4, minWidth: 60 }} />
                    <span style={{ fontSize: "clamp(0.7rem,1.8vw,0.85rem)", fontWeight: 700, color: "#fff", minWidth: 40, textAlign: "center" }}>{String(hour).padStart(2, "0")}:00</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 6, marginBottom: 12 }}>
                    {[
                      ["🌡️ Temperatura", Math.round(current.temperature) + "°C", "Δ " + (thermal?.delta || 0) + "°C"],
                      ["💧 Umidità", Math.round(current.humidity) + "%", "Rugiada " + Math.round(current.dewPoint) + "°C"],
                      ["☁️ Nuvolosità", Math.round(current.cloudCover) + "%", ct(current.cloudCover)],
                      ["🌧️ Precipitazioni", current.precipitation === 0 ? "✅ Assenti" : current.precipitation + " mm", current.precipitation === 0 ? "Ideale" : "⚠️ Pioggia"],
                      ["🏔️ Base Nuvole", thermal ? thermal.cloudBase + "m" : "--", "Cloud Base"],
                      ["📈 Plafond", thermal ? thermal.thermalTop + "m" : "--", "Thermal Top"],
                      ["🪂 Galleggiamento", thermal ? thermal.soarIdx + "/10" : "--", "Soaring Index"],
                      ["💨 Vento", wa(current.windDir) + " " + Math.round(current.windSpeed) + " km/h", wd(current.windDir) + " • ⚡" + Math.round(current.windGust) + " km/h"],
                    ].map(([l, v, s]) => (
                      <div key={l as string} style={{ background: "rgba(0,0,0,0.3)", padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: "clamp(0.55rem,1.2vw,0.7rem)", color: "#888", fontWeight: 500 }}>{l}</div>
                        <div style={{ fontSize: "clamp(0.8rem,2vw,1rem)", fontWeight: 700, color: "#fff" }}>{v}</div>
                        <div style={{ fontSize: "clamp(0.5rem,1vw,0.65rem)", color: "#666", marginTop: 1 }}>{s}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <h4 style={{ fontSize: "clamp(0.8rem,2vw,0.95rem)", color: "#4fc3f7", marginBottom: 10, fontWeight: 600 }}>📊 Pressione</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "clamp(0.6rem,1.3vw,0.75rem)", color: "#888" }}>Attuale</div>
                        <div style={{ fontSize: "clamp(1rem,2.5vw,1.2rem)", fontWeight: 700, color: "#fff" }}>{Math.round(current.pressure)} hPa</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "clamp(0.6rem,1.3vw,0.75rem)", color: "#888" }}>Gradiente</div>
                        <div style={{ fontSize: "clamp(1rem,2.5vw,1.2rem)", fontWeight: 700, color: pressureGrad.grad > 0 ? "#4caf50" : pressureGrad.grad < 0 ? "#f44336" : "#ffd93d" }}>
                          {pressureGrad.grad > 0 ? "⬆️" : pressureGrad.grad < 0 ? "⬇️" : "➡️"} {Math.abs(pressureGrad.grad)} hPa
                        </div>
                        <div style={{ fontSize: "clamp(0.5rem,1vw,0.65rem)", color: "#888" }}>{pressureGrad.desc}</div>
                      </div>
                    </div>
                  </div>
                  {aiData?.thunderstorm && (
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: aiData.thunderstorm.includes("ALLERTA") ? "rgba(244,67,54,0.12)" : "rgba(76,175,80,0.08)", border: aiData.thunderstorm.includes("ALLERTA") ? "2px solid #f44336" : "1px solid rgba(76,175,80,0.3)", marginBottom: 8 }}>
                      <div style={{ fontSize: "clamp(0.65rem,1.5vw,0.8rem)", color: "#e0e0e0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiData.thunderstorm}</div>
                    </div>
                  )}
                </>
              )}
              {tab === "venti" && (
                <>
                  <h4 style={{ fontSize: "clamp(0.8rem,2vw,0.95rem)", color: "#4fc3f7", marginBottom: 10, fontWeight: 600 }}>💨 Turbolenza per quota</h4>
                  <div style={{ overflowX: "auto", marginBottom: 12 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "clamp(0.55rem,1.2vw,0.7rem)", minWidth: 500 }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "center", padding: "4px 6px", color: "#888", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, background: "#0d1b2a" }}>Ora</th>
                          {turbQuotes.map((q) => (
                            <th key={q} style={{ textAlign: "center", padding: "4px 6px", color: "#4fc3f7", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, background: "#0d1b2a" }}>{q}m</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hours9to19.map((h) => {
                          const hd = dayData.find((x) => x.time.getHours() === h);
                          if (!hd) return null;
                          return (
                            <tr key={h}>
                              <td style={{ textAlign: "center", padding: "3px 4px", color: "#888", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>{String(h).padStart(2, "0")}:00</td>
                              {turbQuotes.map((q) => {
                                const tv = calcTurbulence(dayData, h, q);
                                return (
                                  <td key={q} style={{ textAlign: "center", padding: "3px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                    <span style={{ display: "inline-block", width: 24, height: 24, lineHeight: "24px", borderRadius: "50%", background: turbColor(tv), color: "#fff", fontWeight: 700, fontSize: "clamp(0.5rem,1.1vw,0.65rem)" }}>{tv}</span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: "clamp(0.55rem,1.2vw,0.65rem)", color: "#888", width: "100%", marginBottom: 4, fontWeight: 600 }}>Legenda Turbolenza:</div>
                    {[
                      [1, "🟢 Calma"],
                      [2, "🟡 Leggera"],
                      [3, "🟠 Moderata"],
                      [4, "🔴 Forte"],
                      [5, "⛔ Estrema"],
                    ].map(([v, l]) => (
                      <div key={v} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ display: "inline-block", width: 18, height: 18, lineHeight: "18px", borderRadius: "50%", background: turbColor(v as number), color: "#fff", fontWeight: 700, fontSize: "clamp(0.45rem,1vw,0.55rem)", textAlign: "center" }}>{v}</span>
                        <span style={{ fontSize: "clamp(0.5rem,1.1vw,0.6rem)", color: "#ccc" }}>{l}</span>
                      </div>
                    ))}
                  </div>
                  <h4 style={{ fontSize: "clamp(0.8rem,2vw,0.95rem)", color: "#4fc3f7", marginBottom: 10, fontWeight: 600 }}>💨 Venti in quota (10m / 80m / 120m)</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(90px,1fr))", gap: 6, marginBottom: 12 }}>
                    {[
                      ["10m", wa(current.windDir) + " " + Math.round(current.windSpeed) + " km/h", wd(current.windDir), "⚡" + Math.round(current.windGust) + " km/h"],
                      ["80m", current.wind80m ? wa(current.windDir80m!) + " " + Math.round(current.wind80m) : "N/D", current.wind80m ? wd(current.windDir80m!) : "--", current.wind80m ? "⚡" + Math.round(current.wind80m * 1.3) + " km/h" : ""],
                      ["120m", current.wind120m ? wa(current.windDir120m!) + " " + Math.round(current.wind120m) : "N/D", current.wind120m ? wd(current.windDir120m!) : "--", current.wind120m ? "⚡" + Math.round(current.wind120m * 1.35) + " km/h" : ""],
                    ].map(([l, v, d, g]) => (
                      <div key={l as string} style={{ textAlign: "center", padding: "8px 6px", background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                        <div style={{ fontSize: "clamp(0.55rem,1.2vw,0.7rem)", color: "#888" }}>{l}</div>
                        <div style={{ fontSize: "clamp(0.75rem,1.8vw,0.9rem)", fontWeight: 700, color: "#fff" }}>{v}</div>
                        <div style={{ fontSize: "clamp(0.6rem,1.3vw,0.7rem)", color: "#aaa" }}>{d}</div>
                        <div style={{ fontSize: "clamp(0.5rem,1vw,0.65rem)", color: "#ff6b6b" }}>{g}</div>
                      </div>
                    ))}
                  </div>
                  <h4 style={{ fontSize: "clamp(0.8rem,2vw,0.95rem)", color: "#4fc3f7", marginBottom: 10, fontWeight: 600 }}>📊 Profilo Vento (400m - 4000m)</h4>
                  <div style={{ marginBottom: 12, padding: "8px 10px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", maxHeight: 320, overflowY: "auto" }}>
                    {windProfile?.map((p, i) => {
                      const maxSpd = current.windSpeed * 3.5;
                      const bw = Math.min(100, (p.speed / maxSpd) * 100);
                      const wcC = (s: number, m: number) => { const r = s / m; if (r < 0.3) return "#4caf50"; if (r < 0.5) return "#8bc34a"; if (r < 0.7) return "#ff9800"; if (r < 0.9) return "#ff5722"; return "#f44336"; };
                      return (
                        <div key={i} style={{ display: "grid", gridTemplateColumns: "55px 1fr 40px", gap: 6, alignItems: "center", padding: "2px 4px", fontSize: "clamp(0.55rem,1.2vw,0.7rem)" }}>
                          <span style={{ color: "#888" }}>{p.alt === 10 ? "Sup" : p.alt + "m"}</span>
                          <div style={{ height: 14, background: "rgba(255,255,255,0.05)", borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: bw + "%", background: wcC(p.speed, maxSpd), borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 3, minWidth: 30, transition: "width 0.3s" }}>
                              <span style={{ fontSize: "clamp(0.45rem,1vw,0.55rem)", color: "#fff", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{p.speed}</span>
                            </div>
                          </div>
                          <span style={{ color: "#aaa", textAlign: "center" }}>{wa(p.dir)}</span>
                        </div>
                      );
                    })}
                  </div>
                  {windProfile && (() => { const sh = cs(windProfile); return (<div style={{ padding: 8, borderRadius: 8, border: "2px solid " + (sh.risk === "alto" ? "#f44336" : sh.risk === "medio" ? "#ff9800" : "#4caf50"), background: "rgba(0,0,0,0.2)", marginTop: 8, fontSize: "clamp(0.6rem,1.3vw,0.75rem)" }}><strong>🌪️ Wind Shear: {sh.shear}</strong><br />{sh.desc}</div>); })()}
                </>
              )}
              {tab === "termiche" && (
                <>{aiData && ["thermal", "altitude", "hourly"].map((key) => (<div key={key} style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}><div style={{ fontSize: "clamp(0.65rem,1.5vw,0.8rem)", color: "#e0e0e0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiData[key]}</div></div>))}</>
              )}
              {tab === "analisi" && (
                <div style={{ marginBottom: 14, background: "rgba(0,0,0,0.35)", borderRadius: 12, border: "1px solid rgba(255,107,107,0.12)", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(255,107,107,0.06)", borderBottom: "1px solid rgba(255,107,107,0.08)" }}>
                    <span style={{ fontSize: "clamp(1rem,2.5vw,1.3rem)" }}>🤖</span>
                    <h4 style={{ fontSize: "clamp(0.8rem,2vw,1rem)", color: "#ff6b6b", fontWeight: 600, margin: 0 }}>Analisi Completa</h4>
                    {aiLoading && <span style={{ marginLeft: "auto", fontSize: "clamp(0.6rem,1.5vw,0.75rem)", color: "#ffd93d" }}>⏳ Analisi...</span>}
                  </div>
                  <div style={{ padding: "8px 14px", maxHeight: 480, overflowY: "auto" }}>
                    {aiData && !aiLoading && ["general", "advice", "pressure", "thunderstorm"].map((key) => (
                      <div key={key} style={{ marginBottom: 10, padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: "clamp(0.65rem,1.5vw,0.8rem)", color: "#e0e0e0", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiData[key]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <footer style={{ textAlign: "center", marginTop: 20, padding: "14px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: "clamp(0.55rem,1.2vw,0.7rem)", color: "#666" }}>Dati da Open-Meteo.com • Ispirato SHV FSVL • Beta v2.0</p>
        <p style={{ fontSize: "clamp(0.55rem,1.2vw,0.7rem)", color: "#444", marginTop: 4 }}>🐰 Vola sicuro! 🪂</p>
      </footer>
    </div>
  );
}