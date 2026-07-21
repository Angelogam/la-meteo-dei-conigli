"use client";

import { useEffect, useState } from "react";
import { weatherService, type MeteoHourly, type MeteoCurrent, type MeteoDaily } from "@/services/weatherService";

interface MeteoDataParsed {
  hourly: MeteoHourly[];
  current: MeteoCurrent;
  daily: MeteoDaily[];
}

// ===============================
// COMPONENTE CARD METEO
// ===============================
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

// ===============================
// COMPONENTE PRINCIPALE
// ===============================
export default function MeteoController({ lat = 44.2587, lon = 7.7943 }: { lat?: number; lon?: number }) {
  const [meteo, setMeteo] = useState<{ ok: boolean; data: MeteoDataParsed | null }>({ ok: true, data: null });

  useEffect(() => {
    weatherService.fetchWithFallback(lat, lon).then((result) => {
      if (result.ok && result.data) {
        setMeteo({
          ok: true,
          data: {
            hourly: result.data.hourly,
            current: result.data.current,
            daily: result.data.daily,
          }
        });
      } else {
        setMeteo({ ok: false, data: null });
      }
    });
  }, [lat, lon]);

  if (!meteo.ok) {
    return (
      <div className="p-4 rounded-xl bg-[#0f172a] border border-red-500 text-red-400 text-sm">
        ⚠️ Connessione fallita — impossibile ottenere i dati meteo
      </div>
    );
  }

  if (!meteo.data) {
    return (
      <div className="p-4 rounded-xl bg-[#0f172a] border border-yellow-500 text-yellow-400 text-sm">
        Nessun dato meteo disponibile
      </div>
    );
  }

  const h = meteo.data.hourly;
  const d = meteo.data.daily;
  const c = meteo.data.current;

  // ... keep rest of the component
  const palette = {
    ottimo: "#00c853", buono: "#64dd17", medio: "#ffeb3b",
    scarso: "#ff9800", pessimo: "#f44336",
  };

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

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "10px" }}>
        🐰 Meteo dei Conigli 🐰
      </div>

      <CardMeteo
        titolo="Temperatura"
        valore={`${Math.round(c.temperature)}°C`}
        icona={c.temperature > 25 ? "🔥" : c.temperature > 15 ? "🌡️" : "🥶"}
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
        valore={`${Math.round(c.windDir)}°`}
        icona="🧭"
        colore={palette.medio}
      />
      <CardMeteo
        titolo="Nuvolosità"
        valore={`${Math.round(c.cloudCover)}%`}
        icona={c.cloudCover > 70 ? "☁️" : c.cloudCover > 30 ? "⛅" : "☀️"}
        colore={palette.ottimo}
      />
      <CardMeteo
        titolo="Precipitazioni"
        valore={`${(c.precipitation || 0).toFixed(1)} mm`}
        icona={c.precipitation > 2 ? "🌧️" : c.precipitation > 0 ? "🌦️" : "☀️"}
        colore={c.precipitation > 2 ? palette.pessimo : c.precipitation > 0 ? palette.scarso : palette.ottimo}
      />
      <CardMeteo
        titolo="Umidità"
        valore={`${Math.round(c.humidity)}%`}
        icona="💧"
        colore={c.humidity > 70 ? palette.scarso : palette.buono}
      />
      <CardMeteo
        titolo="Pressione"
        valore={`${Math.round(c.pressure)} hPa`}
        icona={c.pressure > 1020 ? "⬆️" : c.pressure < 1010 ? "⬇️" : "➡️"}
        colore={c.pressure < 1005 ? palette.pessimo : palette.buono}
      />

      <div style={{ marginTop: "20px", padding: "12px", background: "#1e293b", borderRadius: "10px", border: "1px solid #334155" }}>
        <div style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#fbbf24", marginBottom: "8px", textAlign: "center" }}>
          📅 Riepilogo {d[0]?.date?.toLocaleDateString("it-IT") || ""}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Max</div>
          <div style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: "bold" }}>{Math.round(d[0]?.tempMax || 0)}°C</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Min</div>
          <div style={{ fontSize: "0.8rem", color: "#60a5fa", fontWeight: "bold" }}>{Math.round(d[0]?.tempMin || 0)}°C</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Pioggia</div>
          <div style={{ fontSize: "0.8rem", color: "#67e8f9", fontWeight: "bold" }}>{(d[0]?.precipitationSum || 0).toFixed(1)} mm</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Vento max</div>
          <div style={{ fontSize: "0.8rem", color: "#a78bfa", fontWeight: "bold" }}>{Math.round(d[0]?.windSpeedMax || 0)} km/h</div>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: "0.7rem", color: "#64748b", marginTop: "10px" }}>
        🐰 Card interattive collegate a weatherService 🐰
      </div>
    </div>
  );
}