"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DECOLLI } from "@/data/decolli";
import { Activity, Loader2, AlertTriangle } from "lucide-react";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meteoData, setMeteoData] = useState<any>(null);

  useEffect(() => {
    const fetchMeteo = async () => {
      try {
        // Prendo il primo decollo (Malanotte)
        const site = DECOLLI[0];
        const params = new URLSearchParams({
          latitude: site.lat.toString(),
          longitude: site.lon.toString(),
          hourly: "temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,weather_code,pressure_msl,dew_point_2m,uv_index,cape,convective_inhibition,lifted_index",
          daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
          current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,pressure_msl",
          timezone: "Europe/Rome",
          forecast_days: "3",
        });

        const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
        console.log("📡 Chiamata Open-Meteo:", url);
        
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log("✅ Dati ricevuti:", data);
        console.log("🌡️ Temperatura corrente:", data.current?.temperature_2m);
        console.log("💨 Vento corrente:", data.current?.wind_speed_10m, "km/h");
        console.log("☁️ Nuvolosità:", data.current?.cloud_cover, "%");
        console.log("🌧️ Pioggia:", data.current?.precipitation, "mm");
        
        setMeteoData(data);
        setLoading(false);
      } catch (err) {
        console.error("❌ Errore:", err);
        setError(err instanceof Error ? err.message : "Errore sconosciuto");
        setLoading(false);
      }
    };

    fetchMeteo();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
        <p className="text-slate-400 text-lg">Caricamento dati meteo da Open-Meteo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <AlertTriangle className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Errore di connessione</h2>
        <p className="text-slate-400 text-center">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all"
        >
          Riprova
        </button>
      </div>
    );
  }

  if (!meteoData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <p className="text-slate-400">Nessun dato ricevuto</p>
      </div>
    );
  }

  const current = meteoData.current;
  const hourly = meteoData.hourly;
  const daily = meteoData.daily;
  const site = DECOLLI[0];

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <main className="max-w-7xl w-full mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">{site.name}</h2>
          <p className="text-slate-400">{site.valley} · {site.altitude}m · {site.exposure}</p>
        </div>

        {/* Card meteo corrente */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-4">Meteo attuale</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-amber-300">{Math.round(current.temperature_2m)}°C</div>
              <div className="text-sm text-slate-400 mt-1">Temperatura</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-sky-300">{Math.round(current.wind_speed_10m)} km/h</div>
              <div className="text-sm text-slate-400 mt-1">Vento</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-slate-200">{current.cloud_cover}%</div>
              <div className="text-sm text-slate-400 mt-1">Nuvolosità</div>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-300">{current.precipitation} mm</div>
              <div className="text-sm text-slate-400 mt-1">Pioggia</div>
            </div>
          </div>
        </div>

        {/* Tabella oraria */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Previsioni orarie</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {hourly.time.slice(0, 12).map((t: string, i: number) => {
              const date = new Date(t);
              const hour = date.getHours();
              return (
                <div key={i} className="bg-slate-900/50 rounded-xl p-3 text-center">
                  <div className="text-sm font-bold text-slate-300">{String(hour).padStart(2, "0")}:00</div>
                  <div className="text-lg font-bold text-amber-300 my-1">{Math.round(hourly.temperature_2m[i])}°</div>
                  <div className="text-sm text-sky-300">{Math.round(hourly.wind_speed_10m[i])} km/h</div>
                  <div className="text-sm text-slate-400">{hourly.cloud_cover[i]}%</div>
                  {hourly.precipitation[i] > 0 && (
                    <div className="text-sm text-blue-300">{hourly.precipitation[i].toFixed(1)}mm</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Console log automatico */}
        <div className="mt-6 bg-slate-900/80 border border-slate-700/50 rounded-2xl p-4">
          <h4 className="text-sm font-bold text-emerald-400 mb-2">🧪 Test automatico</h4>
          <div className="text-xs text-slate-400 space-y-1 font-mono">
            <p>✅ {hourly.time.length} ore di dati disponibili</p>
            <p>✅ {daily.time.length} giorni di previsioni</p>
            <p>✅ Temperatura: {Math.round(current.temperature_2m)}°C</p>
            <p>✅ Vento: {Math.round(current.wind_speed_10m)} km/h da {Math.round(current.wind_direction_10m)}°</p>
            <p>✅ Nuvolosità: {current.cloud_cover}%</p>
            <p>✅ Pioggia: {current.precipitation}mm</p>
            <p>✅ Umidità: {current.relative_humidity_2m}%</p>
            <p className="text-slate-600 mt-2">Dati ottenuti da Open-Meteo per {site.name}</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}