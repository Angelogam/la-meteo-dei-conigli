"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";

const DECOLLI = [
  { id: "malanotte", name: "Malanotte", lat: 44.2587, lon: 7.7943, exposure: "S/SE", alt: 1740, valley: "Valle Infernotto" },
  { id: "colle_tenda", name: "Colle di Tenda", lat: 44.1509, lon: 7.5693, exposure: "S", alt: 1990, valley: "Valle Roya/Vermenagna" },
  { id: "boves", name: "Boves", lat: 44.3211, lon: 7.5447, exposure: "NE", alt: 900, valley: "Cuneese" },
  { id: "monte_male", name: "Monte Male - Dronero", lat: 44.4316, lon: 7.3629, exposure: "S", alt: 950, valley: "Valle Maira" },
  { id: "iretta", name: "Iretta", lat: 44.4989, lon: 7.3820, exposure: "SO", alt: 1050, valley: "Valle Maira" },
  { id: "val_mala", name: "Pratoni di Val Mala", lat: 44.5078, lon: 7.3466, exposure: "S", alt: 1400, valley: "Valle Maira" },
  { id: "birrone", name: "Monte Birrone", lat: 44.5399, lon: 7.2529, exposure: "S", alt: 2131, valley: "Valle Maira" },
  { id: "agnello", name: "Colle dell'Agnello", lat: 44.6828, lon: 6.9782, exposure: "S", alt: 2748, valley: "Valle Varaita" },
  { id: "pian_mune", name: "Pian Mune - Seggiovia", lat: 44.6386, lon: 7.2309, exposure: "S/SW", alt: 1870, valley: "Valle Po" },
  { id: "pian_mune_basso", name: "Pian Mune - Bric Lombatera", lat: 44.6574, lon: 7.2600, exposure: "S", alt: 1350, valley: "Valle Po" },
  { id: "martiniana", name: "Martiniana Po", lat: 44.6070, lon: 7.3832, exposure: "NE", alt: 1400, valley: "Valle Po" },
  { id: "rucas", name: "Rucas alto", lat: 44.7421, lon: 7.2201, exposure: "S/SE", alt: 1500, valley: "Valle Infernotto" },
  { id: "montoso", name: "Montoso - decollo basso", lat: 44.7644, lon: 7.2498, exposure: "SE", alt: 1250, valley: "Valle Infernotto" },
  { id: "vandalino", name: "Monte Vandalino", lat: 44.8367, lon: 7.1739, exposure: "S/SE", alt: 2120, valley: "Val Pellice" },
  { id: "pian_alpe", name: "Pian dell'Alpe", lat: 45.0640, lon: 7.0283, exposure: "S", alt: 1990, valley: "Val Chisone" },
  { id: "roletto", name: "Roletto - Piggi", lat: 44.9325, lon: 7.3110, exposure: "S", alt: 820, valley: "Pinerolese" },
  { id: "piossasco", name: "Piossasco - Monte S. Giorgio", lat: 44.9967, lon: 7.4480, exposure: "S", alt: 673, valley: "Collina Torinese" },
  { id: "truccetti", name: "Truccetti", lat: 45.0797, lon: 7.3420, exposure: "S", alt: 900, valley: "Canavese" },
  { id: "val_torre", name: "Val della Torre", lat: 45.1626, lon: 7.4637, exposure: "S", alt: 970, valley: "Val della Torre" },
  { id: "rocca_canavese", name: "Rocca Canavese - M. della Neve", lat: 45.3276, lon: 7.5728, exposure: "S", alt: 1100, valley: "Canavese" },
  { id: "elisabetta", name: "Santa Elisabetta", lat: 45.4183, lon: 7.6419, exposure: "S", alt: 1000, valley: "Canavese" },
  { id: "elisabetta_alto", name: "Santa Elisabetta alto", lat: 45.4402, lon: 7.6480, exposure: "S", alt: 1400, valley: "Canavese" },
  { id: "cavallaria", name: "Monte Cavallaria", lat: 45.5173, lon: 7.7988, exposure: "S", alt: 1430, valley: "Canavese" },
  { id: "andrate", name: "Andrate", lat: 45.5506, lon: 7.8808, exposure: "S", alt: 1000, valley: "Canavese" },
];

function getWeatherIcon(code: number): string {
  const icons: Record<number, string> = {
    0: "\u2600\uFE0F", 1: "\uD83C\uDF24\uFE0F", 2: "\u26C5", 3: "\u2601\uFE0F",
    45: "\uD83C\uDF2B\uFE0F", 48: "\uD83C\uDF2B\uFE0F",
    51: "\uD83C\uDF26\uFE0F", 53: "\uD83C\uDF27\uFE0F", 55: "\uD83C\uDF27\uFE0F",
    61: "\uD83C\uDF27\uFE0F", 63: "\uD83C\uDF27\uFE0F", 65: "\uD83C\uDF27\uFE0F",
    71: "\u2744\uFE0F", 73: "\u2744\uFE0F", 75: "\u2744\uFE0F",
    80: "\uD83C\uDF26\uFE0F", 81: "\uD83C\uDF27\uFE0F", 82: "\u26C8\uFE0F",
    95: "\u26C8\uFE0F", 96: "\u26C8\uFE0F", 99: "\u26C8\uFE0F",
  };
  return icons[code] || "\u2600\uFE0F";
}

function getWindDirection(deg: number): string {
  if (deg == null) return "--";
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export default function Home() {
  const [selectedId, setSelectedId] = useState(DECOLLI[0].id);
  const [meteoData, setMeteoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedHour, setSelectedHour] = useState(12);
  const [activeTab, setActiveTab] = useState("meteo");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const site = DECOLLI.find((d) => d.id === selectedId) || DECOLLI[0];

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        latitude: site.lat.toString(),
        longitude: site.lon.toString(),
        hourly: "temperature_2m,dewpoint_2m,relativehumidity_2m,cloudcover,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,wind_speed_80m,wind_direction_80m,wind_speed_120m,wind_direction_120m,uv_index,is_day,weathercode,pressure_msl",
        daily: "weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_direction_10m_dominant",
        timezone: "Europe/Rome",
        forecast_days: "3",
      });

      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();

      const result = {
        hourly: raw.hourly.time.map((t: string, i: number) => ({
          time: new Date(t),
          temperature: raw.hourly.temperature_2m[i],
          dewPoint: raw.hourly.dewpoint_2m[i],
          humidity: raw.hourly.relativehumidity_2m[i],
          cloudCover: raw.hourly.cloudcover[i],
          precipitation: raw.hourly.precipitation[i] || 0,
          windSpeed: raw.hourly.wind_speed_10m[i],
          windGust: raw.hourly.wind_gusts_10m ? raw.hourly.wind_gusts_10m[i] : raw.hourly.wind_speed_10m[i] + 8,
          windDir: raw.hourly.wind_direction_10m[i],
          wind80m: raw.hourly.wind_speed_80m ? raw.hourly.wind_speed_80m[i] : null,
          windDir80m: raw.hourly.wind_direction_80m ? raw.hourly.wind_direction_80m[i] : null,
          wind120m: raw.hourly.wind_speed_120m ? raw.hourly.wind_speed_120m[i] : null,
          windDir120m: raw.hourly.wind_direction_120m ? raw.hourly.wind_direction_120m[i] : null,
          uvIndex: raw.hourly.uv_index ? raw.hourly.uv_index[i] : 0,
          isDay: raw.hourly.is_day ? raw.hourly.is_day[i] : 1,
          weatherCode: raw.hourly.weathercode ? raw.hourly.weathercode[i] : 0,
          pressure: raw.hourly.pressure_msl ? raw.hourly.pressure_msl[i] : 1013,
        })),
        daily: raw.daily.time.map((d: string, i: number) => ({
          date: new Date(d),
          weatherCode: raw.daily.weathercode[i],
          tempMax: raw.daily.temperature_2m_max[i],
          tempMin: raw.daily.temperature_2m_min[i],
          sunrise: new Date(raw.daily.sunrise[i]),
          sunset: new Date(raw.daily.sunset[i]),
          uvMax: raw.daily.uv_index_max[i],
          precipitationSum: raw.daily.precipitation_sum[i],
          precipitationHours: raw.daily.precipitation_hours[i],
          windMax: raw.daily.wind_speed_10m_max[i],
          windDirDominant: raw.daily.wind_direction_10m_dominant[i],
        })),
      };

      setMeteoData(result);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, [site]);

  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadWeather]);

  const dayData = useMemo(() => {
    if (!meteoData) return [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() + selectedDay);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return meteoData.hourly.filter((h: any) => h.time >= start && h.time < end);
  }, [meteoData, selectedDay]);

  const currentData = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    return dayData[Math.min(selectedHour, dayData.length - 1)];
  }, [dayData, selectedHour]);

  const thermalDelta = useMemo(() => {
    if (!dayData || dayData.length === 0) return 0;
    const temps = dayData.map((h: any) => h.temperature).filter((t: any) => t != null);
    if (temps.length === 0) return 0;
    return Math.round(Math.max(...temps) - Math.min(...temps));
  }, [dayData]);

  const enrichedDaily = useMemo(() => {
    if (!meteoData || !meteoData.daily) return [];
    return meteoData.daily.map((day: any) => {
      const hours = meteoData.hourly.filter(
        (h: any) => h.time.getDate() === day.date.getDate() && h.time.getMonth() === day.date.getMonth()
      );
      const temps = hours.map((h: any) => h.temperature).filter((t: any) => t != null);
      const delta = temps.length > 0 ? Math.round(Math.max(...temps) - Math.min(...temps)) : 0;
      return { ...day, thermalDelta: delta };
    });
  }, [meteoData]);

  const dateLabels = enrichedDaily.map((d: any) =>
    d.date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })
  );

  const thermalStrength = useMemo(() => {
    if (!currentData) return { label: "--", color: "#888" };
    const temp = currentData.temperature;
    const cloud = currentData.cloudCover;
    const humidity = currentData.humidity;
    const score =
      (temp > 22 ? 2 : temp > 18 ? 1 : 0) +
      (cloud < 30 ? 2 : cloud < 50 ? 1 : 0) +
      (humidity < 50 ? 1 : 0) +
      (thermalDelta > 10 ? 2 : thermalDelta > 6 ? 1 : 0);
    if (score >= 6) return { label: "Forte", color: "#ff1744" };
    if (score >= 4) return { label: "Media", color: "#ff6d00" };
    if (score >= 2) return { label: "Debole", color: "#ffd600" };
    return { label: "Assente", color: "#4fc3f7" };
  }, [currentData, thermalDelta]);

  if (loading && !meteoData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "linear-gradient(145deg, #1a2a3a, #0d1b2a)" }}>
        <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin" />
        <p className="mt-4 text-lg text-[#e8f0f8]">Caricamento previsioni meteo...</p>
        <p className="text-sm text-[#8899aa]">Sto cercando le migliori fonti per te</p>
      </div>
    );
  }

  if (error && !meteoData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: "linear-gradient(145deg, #1a2a3a, #0d1b2a)" }}>
        <p className="text-red-400 text-lg mb-4 text-center">{error}</p>
        <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-semibold" onClick={loadWeather}>Riprova</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ background: "linear-gradient(145deg, #1a2a3a 0%, #0d1b2a 100%)", color: "#e8f0f8", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <header className="text-center pb-4 mb-5" style={{ borderBottom: "2px solid rgba(76, 175, 80, 0.3)" }}>
        <div className="flex items-center justify-center gap-2.5 flex-wrap">
          <span className="text-4xl inline-block">Meteo dei Conigli</span>
        </div>
        <p className="text-sm text-[#8899aa] mt-1">Previsioni per volo libero - Open-Meteo</p>
        <p className="text-xs text-[#667788]">Aggiornato: {lastUpdate.toLocaleTimeString("it-IT")}</p>
      </header>

      <div className="grid gap-4 max-w-7xl mx-auto" style={{ gridTemplateColumns: "minmax(260px, 320px) 1fr" }}>
        <div className="rounded-2xl p-3 overflow-hidden backdrop-blur" style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(76, 175, 80, 0.25)", height: "calc(100vh - 200px)" }}>
          <h2 className="text-green-500 font-semibold mb-3 text-lg">Decolli</h2>
          <div className="overflow-y-auto pr-1" style={{ height: "calc(100% - 44px)" }}>
            {DECOLLI.map((d) => {
              const isSelected = d.id === selectedId;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  className="w-full text-left rounded-xl p-2.5 mb-2 border-2 transition-all"
                  style={{
                    background: isSelected ? "rgba(76, 175, 80, 0.15)" : "rgba(255,255,255,0.03)",
                    borderColor: isSelected ? "#4caf50" : "rgba(255,255,255,0.1)",
                    color: "#e8f0f8",
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">{d.name}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#8899aa] mt-0.5">
                    <span>{d.valley}</span>
                    <span>{d.exposure} - {d.alt}m</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl p-4 overflow-y-auto backdrop-blur" style={{ background: "rgba(255,255,255,0.04)", border: "2px solid rgba(76, 175, 80, 0.25)", maxHeight: "calc(100vh - 200px)" }}>
          <div className="flex justify-between items-center flex-wrap mb-3 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <h2 className="text-2xl font-bold text-[#e8f0f8]">{site.name}</h2>
              <span className="text-xs text-[#8899aa]">{site.exposure} - {site.valley} - {site.alt}m</span>
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full" style={{ background: "rgba(76, 175, 80, 0.12)" }}>
              <span className="text-2xl">{currentData ? getWeatherIcon(currentData.weatherCode || 0) : ""}</span>
              <span className="text-xl font-bold">{currentData ? Math.round(currentData.temperature) : "--"}</span>
            </div>
          </div>

          <div className="grid gap-1 mb-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {["meteo", "venti", "termiche", "analisi"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="text-xs font-medium rounded-t-lg border-0 cursor-pointer transition-all text-center py-2"
                style={{
                  background: activeTab === tab ? "rgba(76, 175, 80, 0.2)" : "transparent",
                  borderBottom: activeTab === tab ? "2px solid #4caf50" : "2px solid transparent",
                  color: "#e8f0f8",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {enrichedDaily.map((day: any, idx: number) => (
              <button
                key={idx}
                onClick={() => { setSelectedDay(idx); setSelectedHour(12); }}
                className="rounded-xl p-2 text-center cursor-pointer transition-all border-2"
                style={{
                  background: selectedDay === idx ? "rgba(76, 175, 80, 0.2)" : "rgba(255,255,255,0.05)",
                  borderColor: selectedDay === idx ? "#4caf50" : "rgba(255,255,255,0.1)",
                  color: "#e8f0f8",
                }}
              >
                <div className="font-semibold text-xs">{dateLabels[idx]}</div>
                <div className="text-xl mt-0.5">{getWeatherIcon(day.weatherCode)}</div>
                <div className="text-sm text-green-500 font-semibold">{Math.round(day.tempMax)}/{Math.round(day.tempMin)}</div>
                <div className="text-[10px] text-[#8899aa]">D{day.thermalDelta}</div>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 p-2 mb-3 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.04)" }}>
            <span className="text-[#8899aa]">Ora:</span>
            <input type="range" min="0" max="23" value={String(selectedHour)} onChange={(e) => setSelectedHour(parseInt(e.target.value))} className="flex-1 accent-green-500" />
            <span className="font-bold min-w-[44px] text-center">{String(selectedHour).padStart(2, "0")}:00</span>
          </div>

          {activeTab === "meteo" && currentData && (
            <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
              <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[10px] text-[#8899aa]">Temperatura</div>
                <div className="font-bold text-lg">{Math.round(currentData.temperature)}</div>
                <div className="text-[10px] text-[#667788]">D {thermalDelta}</div>
              </div>
              <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[10px] text-[#8899aa]">Umidita</div>
                <div className="font-bold text-lg">{Math.round(currentData.humidity)}%</div>
                <div className="text-[10px] text-[#667788]">{Math.round(currentData.dewPoint)}</div>
              </div>
              <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[10px] text-[#8899aa]">Nuvolosita</div>
                <div className="font-bold text-lg">{Math.round(currentData.cloudCover)}%</div>
              </div>
              <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[10px] text-[#8899aa]">Precipitazioni</div>
                <div className="font-bold text-lg">{currentData.precipitation === 0 ? "No" : `${currentData.precipitation} mm`}</div>
              </div>
              <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[10px] text-[#8899aa]">Base Nuvole</div>
                <div className="font-bold text-lg">{Math.round((currentData.temperature - currentData.dewPoint) * 120 + site.alt)}m</div>
              </div>
              <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[10px] text-[#8899aa]">Plafond</div>
                <div className="font-bold text-lg">{Math.round(site.alt + thermalDelta * 100)}m</div>
              </div>
              <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-[10px] text-[#8899aa]">Vento</div>
                <div className="font-bold text-lg">{Math.round(currentData.windSpeed)} km/h</div>
                <div className="text-[10px] text-[#667788]">{getWindDirection(currentData.windDir)}</div>
              </div>
            </div>
          )}

          {activeTab === "venti" && currentData && (
            <div className="mb-3">
              <h4 className="text-sm text-green-500 font-semibold mb-2.5">Vento a differenti quote</h4>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[10px] text-[#8899aa]">10 m</div>
                  <div className="font-bold">{Math.round(currentData.windSpeed)} km/h</div>
                  <div className="text-[10px] text-[#8899aa]">{getWindDirection(currentData.windDir)}</div>
                </div>
                <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[10px] text-[#8899aa]">80 m</div>
                  <div className="font-bold">{currentData.wind80m ? `${Math.round(currentData.wind80m)} km/h` : "N/D"}</div>
                  <div className="text-[10px] text-[#8899aa]">{currentData.wind80m ? getWindDirection(currentData.windDir80m) : "--"}</div>
                </div>
                <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[10px] text-[#8899aa]">120 m</div>
                  <div className="font-bold">{currentData.wind120m ? `${Math.round(currentData.wind120m)} km/h` : "N/D"}</div>
                  <div className="text-[10px] text-[#8899aa]">{currentData.wind120m ? getWindDirection(currentData.windDir120m) : "--"}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "termiche" && currentData && (
            <div className="mb-3">
              <h4 className="text-sm text-green-500 font-semibold mb-2.5">Analisi Termiche</h4>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[10px] text-[#8899aa]">Temp</div>
                  <div className="font-bold">{Math.round(currentData.temperature)}</div>
                </div>
                <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[10px] text-[#8899aa]">Delta</div>
                  <div className="font-bold">{thermalDelta}</div>
                </div>
                <div className="text-center p-2.5 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[10px] text-[#8899aa]">Termiche</div>
                  <div className="font-bold" style={{ color: thermalStrength.color }}>{thermalStrength.label}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "analisi" && currentData && (
            <div className="mb-3">
              <div className="p-3 rounded-lg mb-2.5" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <h4 className="text-sm text-green-500 font-semibold mb-2">Panoramica</h4>
                <p className="text-xs leading-relaxed text-[#d0d8e0]">
                  Temperatura {Math.round(currentData.temperature)}, umidita {Math.round(currentData.humidity)}%, nuvole {Math.round(currentData.cloudCover)}%.
                  Vento {Math.round(currentData.windSpeed)} km/h da {getWindDirection(currentData.windDir)}.
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <h4 className="text-sm text-green-500 font-semibold mb-2">Consigli</h4>
                <p className="text-xs leading-relaxed text-[#d0d8e0]">
                  {currentData.windSpeed > 25 ? "Rischio ALTO - vento forte." : currentData.windSpeed > 18 ? "Rischio MEDIO." : "Rischio BASSO - condizioni favorevoli."}
                  <br />Termiche: {thermalStrength.label}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="text-center mt-5 pt-3 text-xs text-[#667788]" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <p>Vola sicuro e divertiti! - Dati da Open-Meteo</p>
      </footer>
    </div>
  );
}