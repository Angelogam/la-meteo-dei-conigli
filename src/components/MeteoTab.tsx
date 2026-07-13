"use client";

import React from "react";
import { getWindArrow, getWindDirection, getCloudCondition, getCloudBase, getThermalPlafond } from "@/utils/weatherHelpers";

interface MeteoTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number };
  thermalDelta: number;
  stabilityIndex: { label: string; color: string };
}

export default function MeteoTab({ currentData, dayData, site, thermalDelta, stabilityIndex }: MeteoTabProps) {
  if (!currentData) return null;

  const cards = [
    { label: "🌡️ Temperatura", value: `${Math.round(currentData.temperature)}°C`, sub: `Δ ${thermalDelta}°C` },
    { label: "💧 Umidità", value: `${Math.round(currentData.humidity)}%`, sub: `Rugiada ${Math.round(currentData.dewPoint)}°C` },
    { label: "☁️ Nuvolosità", value: `${Math.round(currentData.cloudCover)}%`, sub: `${getCloudCondition(currentData.cloudCover).icon} ${getCloudCondition(currentData.cloudCover).text}` },
    { label: "🌧️ Precipitazioni", value: currentData.precipitation === 0 ? "✅ Assenti" : `${currentData.precipitation} mm`, sub: currentData.precipitation === 0 ? "Ideale" : "⚠️ Pioggia" },
    { label: "🏔️ Base Nuvole", value: `${getCloudBase(currentData.temperature, currentData.dewPoint, site.alt)}m`, sub: "Cloud Base" },
    { label: "📈 Plafond", value: `${getThermalPlafond(site.alt, thermalDelta)}m`, sub: "Thermal Top" },
    { label: "🪂 Galleggiamento", value: thermalDelta > 10 ? "Eccellente ⭐" : thermalDelta > 6 ? "Buono 👍" : "Limitato 🫤", sub: `Delta ${thermalDelta}°C` },
    { label: "💨 Vento", value: `${getWindArrow(currentData.windDir)} ${Math.round(currentData.windSpeed)} km/h`, sub: `${getWindDirection(currentData.windDir)} • ⚡${Math.round(currentData.windGust)} km/h` },
  ];

  const first = dayData[0]?.pressure;
  const last = dayData[dayData.length - 1]?.pressure;
  let pressureGradient = "--";
  if (first != null && last != null) {
    const diff = last - first;
    pressureGradient = diff > 0 ? `⬆️ +${Math.round(diff)} hPa` : diff < 0 ? `⬇️ ${Math.round(diff)} hPa` : "➡️ Stabile";
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: "8px", marginBottom: "12px",
      }}>
        {cards.map((card, i) => (
          <div key={i} style={{
            background: "rgba(0,0,0,0.25)", padding: "10px", borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.05)", textAlign: "center",
          }}>
            <div style={{ fontSize: "0.7rem", color: "#8899aa", marginBottom: "2px" }}>{card.label}</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#e8f0f8" }}>{card.value}</div>
            <div style={{ fontSize: "0.65rem", color: "#667788", marginTop: "2px" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: "rgba(0,0,0,0.2)", padding: "12px", borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.05)", marginBottom: "12px",
      }}>
        <h4 style={{ fontSize: "0.95rem", color: "#4caf50", marginBottom: "10px", fontWeight: 600 }}>📊 Pressione e Gradiente</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px" }}>
          <div style={{ textAlign: "center", padding: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "8px" }}>
            <div style={{ fontSize: "0.7rem", color: "#8899aa" }}>Pressione attuale</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#e8f0f8" }}>{Math.round(currentData.pressure)} hPa</div>
          </div>
          <div style={{ textAlign: "center", padding: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "8px" }}>
            <div style={{ fontSize: "0.7rem", color: "#8899aa" }}>Gradiente</div>
            <div style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#4caf50" }}>{pressureGradient}</div>
          </div>
          <div style={{ textAlign: "center", padding: "8px", background: "rgba(255,255,255,0.04)", borderRadius: "8px" }}>
            <div style={{ fontSize: "0.7rem", color: "#8899aa" }}>Stabilità</div>
            <div style={{ fontSize: "1rem", fontWeight: "bold", color: stabilityIndex.color }}>{stabilityIndex.label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}