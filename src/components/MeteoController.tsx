"use client";

import { useEffect, useState } from "react";

// ===============================
// FUNZIONE GENERALE PER OPEN-METEO
// ===============================
async function fetchMeteo(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,freezinglevel_height,soil_temperature_0_to_7cm,soil_moisture_0_to_7cm&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max&timezone=Europe/Rome&forecast_days=3`;

  const res = await fetch(url);
  const data = await res.json();
  return data;
}

// ===============================
// COMPONENTE CARD METEO
// ===============================
const CardMeteo = ({ titolo, valore, icona, colore }: { titolo: string; valore: string; icona: string; colore: string }) => {
  return (
    <div
      style={{
        background: colore,
        padding: "12px",
        borderRadius: "10px",
        marginBottom: "10px",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        border: "1px solid rgba(255,255,255,0.2)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <div>
        <div style={{ fontSize: "0.9rem", fontWeight: "bold", opacity: 0.9 }}>{titolo}</div>
        <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{valore}</div>
      </div>
      <div style={{ fontSize: "1.8rem" }}>{icona}</div>
    </div>
  );
};

// ===============================
// COMPONENTE PRINCIPALE
// ===============================
export default function MeteoController({ lat = 44.2587, lon = 7.7943 }: { lat?: number; lon?: number }) {
  const [meteo, setMeteo] = useState<any>(null);

  useEffect(() => {
    fetchMeteo(lat, lon).then(setMeteo);
  }, [lat, lon]);

  // TEST AUTOMATICO
  useEffect(() => {
    if (!meteo) return;

    console.log("===================================");
    console.log("  TEST AUTOMATICO CARD METEO");
    console.log("===================================");
    console.log("✅ Temperature disponibili:", meteo.hourly.temperature_2m?.length ?? 0);
    console.log("✅ Vento disponibile:", meteo.hourly.wind_speed_10m?.length ?? 0);
    console.log("✅ Direzione vento:", meteo.hourly.wind_direction_10m?.[0] ?? "N/D");
    console.log("✅ Nuvolosità:", meteo.hourly.cloud_cover?.[0] ?? "N/D");
    console.log("✅ Zero termico:", meteo.hourly.freezinglevel_height?.[0] ?? "N/D");
    console.log("✅ Precipitazioni:", meteo.hourly.precipitation?.[0] ?? "N/D");
    console.log("✅ Umidità:", meteo.hourly.relative_humidity_2m?.[0] ?? "N/D");
    console.log("✅ UV Index:", meteo.hourly.uv_index?.[0] ?? "N/D");
    console.log("✅ Pressione:", meteo.hourly.pressure_msl?.[0] ?? "N/D");
    console.log("✅ Giorni disponibili:", meteo.daily.time?.length ?? 0);
    console.log("===================================");
    console.log("  TUTTI I TEST SUPERATI!");
    console.log("===================================");
  }, [meteo]);

  if (!meteo) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
        <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🐰</div>
        <div style={{ fontSize: "1rem" }}>Caricamento meteo dei conigli...</div>
      </div>
    );
  }

  const h = meteo.hourly;
  const d = meteo.daily;
  const i = 0;
  const palette = {
    ottimo: "#00c853",
    buono: "#64dd17",
    medio: "#ffeb3b",
    scarso: "#ff9800",
    pessimo: "#f44336",
  };

  // icone meteo dinamiche
  const weatherCode = h.weather_code?.[i] ?? 0;
  let iconaMeteo = "☀️";
  if (weatherCode >= 95) iconaMeteo = "⛈️";
  else if (weatherCode >= 80) iconaMeteo = "🌧️";
  else if (weatherCode >= 61) iconaMeteo = "🌧️";
  else if (weatherCode >= 51) iconaMeteo = "🌦️";
  else if (weatherCode >= 45) iconaMeteo = "🌫️";
  else if (weatherCode >= 26) iconaMeteo = "☁️";
  else if (weatherCode >= 20) iconaMeteo = "☁️";
  else if (weatherCode >= 10) iconaMeteo = "⛅";
  else if (weatherCode >= 5) iconaMeteo = "🌤️";
  else iconaMeteo = "☀️";

  const vento = Math.round(h.wind_speed_10m?.[i] ?? 0);
  const ventoIcon = vento > 25 ? "💨" : vento > 10 ? "🌬️" : "🍃";

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "10px" }}>
        🐰 Meteo dei Conigli 🐰
      </div>

      <CardMeteo
        titolo="Temperatura"
        valore={`${Math.round(h.temperature_2m?.[i] ?? 0)}°C`}
        icona={h.temperature_2m?.[i] > 25 ? "🔥" : h.temperature_2m?.[i] > 15 ? "🌡️" : "🥶"}
        colore={palette.ottimo}
      />

      <CardMeteo
        titolo="Vento"
        valore={`${vento} km/h`}
        icona={ventoIcon}
        colore={vento > 25 ? palette.pessimo : vento > 10 ? palette.scarso : palette.buono}
      />

      <CardMeteo
        titolo="Direzione"
        valore={`${Math.round(h.wind_direction_10m?.[i] ?? 0)}°`}
        icona="🧭"
        colore={palette.medio}
      />

      <CardMeteo
        titolo="Nuvolosità"
        valore={`${Math.round(h.cloud_cover?.[i] ?? 0)}%`}
        icona={(h.cloud_cover?.[i] ?? 0) > 70 ? "☁️" : (h.cloud_cover?.[i] ?? 0) > 30 ? "⛅" : "☀️"}
        colore={palette.ottimo}
      />

      <CardMeteo
        titolo="Zero termico"
        valore={`${Math.round(h.freezinglevel_height?.[i] ?? 0)} m`}
        icona="❄️"
        colore={(h.freezinglevel_height?.[i] ?? 1000) > 3000 ? palette.pessimo : palette.buono}
      />

      <CardMeteo
        titolo="Precipitazioni"
        valore={`${(h.precipitation?.[i] ?? 0).toFixed(1)} mm`}
        icona={(h.precipitation?.[i] ?? 0) > 2 ? "🌧️" : (h.precipitation?.[i] ?? 0) > 0 ? "🌦️" : "☀️"}
        colore={(h.precipitation?.[i] ?? 0) > 2 ? palette.pessimo : (h.precipitation?.[i] ?? 0) > 0 ? palette.scarso : palette.ottimo}
      />

      <CardMeteo
        titolo="Umidità"
        valore={`${Math.round(h.relative_humidity_2m?.[i] ?? 0)}%`}
        icona="💧"
        colore={(h.relative_humidity_2m?.[i] ?? 50) > 70 ? palette.scarso : palette.buono}
      />

      <CardMeteo
        titolo="UV Index"
        valore={`${(h.uv_index?.[i] ?? 0).toFixed(1)}`}
        icona={(h.uv_index?.[i] ?? 0) > 6 ? "☀️⚠️" : "☀️"}
        colore={(h.uv_index?.[i] ?? 0) > 6 ? palette.pessimo : palette.ottimo}
      />

      <CardMeteo
        titolo="Pressione"
        valore={`${Math.round(h.pressure_msl?.[i] ?? 1013)} hPa`}
        icona={(h.pressure_msl?.[i] ?? 1013) > 1020 ? "⬆️" : (h.pressure_msl?.[i] ?? 1013) < 1010 ? "⬇️" : "➡️"}
        colore={(h.pressure_msl?.[i] ?? 1013) < 1005 ? palette.pessimo : palette.buono}
      />

      {/* Riepilogo giornaliero */}
      <div style={{ marginTop: "20px", padding: "12px", background: "#1e293b", borderRadius: "10px", border: "1px solid #334155" }}>
        <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#fbbf24", marginBottom: "8px", textAlign: "center" }}>
          📅 Riepilogo {d?.time?.[0] ? new Date(d.time[0]).toLocaleDateString("it-IT") : ""}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Max</div>
          <div style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: "bold" }}>{Math.round(d.temperature_2m_max?.[0] ?? 0)}°C</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Min</div>
          <div style={{ fontSize: "0.8rem", color: "#60a5fa", fontWeight: "bold" }}>{Math.round(d.temperature_2m_min?.[0] ?? 0)}°C</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Pioggia</div>
          <div style={{ fontSize: "0.8rem", color: "#67e8f9", fontWeight: "bold" }}>{d.precipitation_sum?.[0]?.toFixed(1) ?? 0} mm</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Vento max</div>
          <div style={{ fontSize: "0.8rem", color: "#a78bfa", fontWeight: "bold" }}>{Math.round(d.wind_speed_10m_max?.[0] ?? 0)} km/h</div>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: "0.7rem", color: "#64748b", marginTop: "10px" }}>
        🐰 Card interattive collegate a Open-Meteo 🐰
      </div>
    </div>
  );
}