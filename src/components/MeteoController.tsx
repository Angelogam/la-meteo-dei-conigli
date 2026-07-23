"use client";

import { useEffect, useState } from "react";
import { weatherService, type MeteoHourly, type MeteoCurrent, type MeteoDaily } from "@/services/weatherService";

interface MeteoDataParsed {
  hourly: MeteoHourly[];
  current: MeteoCurrent;
  daily: MeteoDaily[];
}

const CardMeteo = ({ titolo, valore, icona, colore }: { titolo: string; valore: string; icona: string; colore: string }) => {
  return (
    <div style={{
      background: colore, padding: "12px", borderRadius: "10px",
      marginBottom: "10px", color: "white",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
    }}>
      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: "bold", opacity: 0.9 }}>{titolo}</div>
        <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{valore}</div>
      </div>
      <div style={{ fontSize: "1.8rem" }}>{icona}</div>
    </div>
  );
};

export default function MeteoController({ lat = 44.2587, lon = 7.7943 }: { lat?: number; lon?: number }) {
  const [meteo, setMeteo] = useState<MeteoDataParsed | null>(null);

  useEffect(() => {
    weatherService.fetchWeather(lat, lon).then((data) => {
      setMeteo({
        hourly: data.hourly,
        current: data.current,
        daily: data.daily,
      });
    });
  }, [lat, lon]);

  useEffect(() => {
    if (!meteo) return;
    console.log("Test: Temperatura attuale:", meteo.current.temperature);
  }, [meteo]);

  if (!meteo || meteo.hourly.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
        <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🐰</div>
        <div style={{ fontSize: "1rem" }}>Caricamento meteo dei conigli...</div>
      </div>
    );
  }

  const palette = { ottimo: "#00c853", buono: "#64dd17", medio: "#ffeb3b", scarso: "#ff9800", pessimo: "#f44336" };
  const c = meteo.current;

  const weatherCode = c.weatherCode;
  let iconaMeteo = "☀️";
  if (weatherCode >= 95) iconaMeteo = "⛈️";
  else if (weatherCode >= 80) iconaMeteo = "🌧️";
  else if (weatherCode >= 61) iconaMeteo = "🌧️";
  else if (weatherCode >= 51) iconaMeteo = "🌦️";
  else if (weatherCode >= 45) iconaMeteo = "🌫️";
  else if (weatherCode >= 20) iconaMeteo = "☁️";
  else if (weatherCode >= 10) iconaMeteo = "⛅";
  else iconaMeteo = "☀️";

  const vento = Math.round(c.windSpeed);
  const ventoIcon = vento > 25 ? "💨" : vento > 10 ? "🌬️" : "🍃";
  const d = meteo.daily[0];

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "10px" }}>
        🐰 Meteo dei Conigli 🐰
      </div>

      <CardMeteo titolo="Temperatura" valore={`${Math.round(c.temperature)}°C`} icona={c.temperature > 25 ? "🔥" : c.temperature > 15 ? "🌡️" : "🥶"} colore={palette.ottimo} />
      <CardMeteo titolo="Vento" valore={`${vento} km/h`} icona={ventoIcon} colore={vento > 25 ? palette.pessimo : vento > 10 ? palette.scarso : palette.buono} />
      <CardMeteo titolo="Direzione" valore={`${Math.round(c.windDir)}°`} icona="🧭" colore={palette.medio} />
      <CardMeteo titolo="Nuvolosità" valore={`${Math.round(c.cloudCover)}%`} icona={c.cloudCover > 70 ? "☁️" : c.cloudCover > 30 ? "⛅" : "☀️"} colore={palette.ottimo} />
      <CardMeteo titolo="Precipitazioni" valore={`${(c.precipitation || 0).toFixed(1)} mm`} icona={c.precipitation > 2 ? "🌧️" : c.precipitation > 0 ? "🌦️" : "☀️"} colore={c.precipitation > 2 ? palette.pessimo : c.precipitation > 0 ? palette.scarso : palette.ottimo} />
      <CardMeteo titolo="Umidità" valore={`${Math.round(c.humidity)}%`} icona="💧" colore={c.humidity > 70 ? palette.scarso : palette.buono} />
      <CardMeteo titolo="Pressione" valore={`${Math.round(c.pressure)} hPa`} icona={c.pressure > 1020 ? "⬆️" : c.pressure < 1010 ? "⬇️" : "➡️"} colore={c.pressure < 1005 ? palette.pessimo : palette.buono} />

      {d && (
        <div style={{ marginTop: "20px", padding: "12px", background: "#1e293b", borderRadius: "10px", border: "1px solid #334155" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#fbbf24", marginBottom: "8px", textAlign: "center" }}>
            📅 Riepilogo {d.date?.toLocaleDateString?.("it-IT") || ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Max</div>
            <div style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: "bold" }}>{Math.round(d.temperatureMax || 0)}°C</div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Min</div>
            <div style={{ fontSize: "0.8rem", color: "#60a5fa", fontWeight: "bold" }}>{Math.round(d.temperatureMin || 0)}°C</div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Pioggia</div>
            <div style={{ fontSize: "0.8rem", color: "#67e8f9", fontWeight: "bold" }}>{(d.precipitationSum || 0).toFixed(1)} mm</div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Vento max</div>
            <div style={{ fontSize: "0.8rem", color: "#a78bfa", fontWeight: "bold" }}>{Math.round(d.windSpeedMax || 0)} km/h</div>
          </div>
        </div>
      )}
    </div>
  );
}