"use client";

import React from "react";
import {
  getWindArrow,
  getWindDirection,
  getCloudCondition,
} from "@/utils/meteoUtils";

interface MeteoGridProps {
  temperature: number;
  thermalDelta: number;
  humidity: number;
  dewPoint: number;
  cloudCover: number;
  precipitation: number;
  cloudBase: number | null;
  thermalTop: number | null;
  soarIndex: number | null;
  windSpeed: number;
  windGust: number;
  windDir: number;
}

export default function MeteoGrid({
  temperature,
  thermalDelta,
  humidity,
  dewPoint,
  cloudCover,
  precipitation,
  cloudBase,
  thermalTop,
  soarIndex,
  windSpeed,
  windGust,
  windDir,
}: MeteoGridProps) {
  const cards = [
    {
      label: "🌡️ Temperatura",
      value: `${Math.round(temperature)}°C`,
      sub: `Δ ${thermalDelta || 0}°C`,
    },
    {
      label: "💧 Umidità",
      value: `${Math.round(humidity)}%`,
      sub: `Rugiada ${Math.round(dewPoint)}°C`,
    },
    {
      label: "☁️ Nuvolosità",
      value: `${Math.round(cloudCover)}%`,
      sub: `${getCloudCondition(cloudCover).icon} ${getCloudCondition(cloudCover).text}`,
    },
    {
      label: "🌧️ Precipitazioni",
      value: precipitation === 0 ? "✅ Assenti" : `${precipitation} mm`,
      sub: precipitation === 0 ? "Ideale" : "⚠️ Pioggia",
    },
    {
      label: "🏔️ Base Nuvole",
      value: cloudBase ? `${cloudBase}m` : "--",
      sub: "Cloud Base",
    },
    {
      label: "📈 Plafond",
      value: thermalTop ? `${thermalTop}m` : "--",
      sub: "Thermal Top",
    },
    {
      label: "🪂 Galleggiamento",
      value: soarIndex ? `${soarIndex}/10` : "--",
      sub: "Soaring Index",
    },
    {
      label: "💨 Vento",
      value: `${getWindArrow(windDir)} ${Math.round(windSpeed)} km/h`,
      sub: `${getWindDirection(windDir)} • ⚡${Math.round(windGust)} km/h`,
    },
  ];

  return (
    <div style={styles.meteoGrid}>
      {cards.map((card, i) => (
        <div key={i} style={styles.meteoCard}>
          <div style={styles.meteoLabel}>{card.label}</div>
          <div style={styles.meteoValue}>{card.value}</div>
          <div style={styles.meteoSub}>{card.sub}</div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  meteoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "8px",
    marginBottom: "15px",
  },
  meteoCard: {
    background: "rgba(0,0,0,0.3)",
    padding: "clamp(8px, 1.5vw, 12px)",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  meteoLabel: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#888",
    marginBottom: "2px",
    fontWeight: 500,
  },
  meteoValue: {
    fontSize: "clamp(0.9rem, 2.5vw, 1.2rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  meteoSub: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
    color: "#666",
    marginTop: "2px",
  },
};