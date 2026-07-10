"use client";

import React from "react";
import { type Decollo } from "@/data/decolli";
import { getWeatherIcon } from "@/utils/meteoUtils";

interface HourData {
  time: Date;
  temperature: number;
  weatherCode: number;
  isDay: number;
}

interface SiteListProps {
  decolli: Decollo[];
  selected: string;
  onSelect: (id: string) => void;
  currentData: HourData | null;
}

export default function SiteList({ decolli, selected, onSelect, currentData }: SiteListProps) {
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📍 Decolli</h2>
      <div style={styles.list}>
        {decolli.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            style={{
              ...styles.card,
              borderColor: d.id === selected ? "#ff6b6b" : "rgba(255,255,255,0.08)",
              background:
                d.id === selected
                  ? "rgba(255,107,107,0.15)"
                  : "rgba(255,255,255,0.03)",
            }}
          >
            <div style={styles.cardTop}>
              <div style={styles.cardTitle}>{d.name}</div>
              <div style={styles.cardWeather}>
                {currentData && d.id === selected ? (
                  getWeatherIcon(currentData.weatherCode || 0, currentData.isDay)
                ) : (
                  <span style={styles.cardWeatherPlaceholder}>☁️</span>
                )}
              </div>
            </div>
            <div style={styles.cardDetails}>
              <span style={styles.cardSmall}>{d.valley}</span>
              <span style={styles.cardSmall}>{d.exposure}</span>
            </div>
            <div style={styles.cardBadges}>
              <span
                style={{
                  ...styles.badge,
                  background:
                    d.difficulty <= 2 ? "#4caf50" : d.difficulty <= 3 ? "#ff9800" : "#f44336",
                }}
              >
                {d.difficulty <= 2 ? "🟢 Facile" : d.difficulty <= 3 ? "🟡 Medio" : "🔴 Difficile"}
              </span>
              <span
                style={{
                  ...styles.badge,
                  background: d.altitude > 2000 ? "#2196f3" : "#78909c",
                }}
              >
                {d.altitude || "N/D"}m
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "rgba(255,255,255,0.05)",
    padding: "15px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.08)",
    height: "calc(100vh - 200px)",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  },
  title: {
    fontSize: "clamp(1rem, 3vw, 1.2rem)",
    marginBottom: "15px",
    color: "#ff6b6b",
    fontWeight: 600,
  },
  list: {
    overflowY: "auto",
    height: "calc(100% - 50px)",
    paddingRight: "5px",
  },
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "clamp(10px, 1.5vw, 14px)",
    marginBottom: "10px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    color: "#fff",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  cardTitle: {
    fontSize: "clamp(0.85rem, 2vw, 1rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  cardWeather: {
    fontSize: "clamp(1rem, 2.5vw, 1.4rem)",
  },
  cardWeatherPlaceholder: {
    fontSize: "clamp(0.8rem, 2vw, 1.2rem)",
    opacity: 0.3,
  },
  cardDetails: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "4px",
    flexWrap: "wrap",
    gap: "4px",
  },
  cardSmall: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)",
    color: "#888",
  },
  cardBadges: {
    display: "flex",
    gap: "5px",
    marginTop: "4px",
    flexWrap: "wrap",
  },
  badge: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
    padding: "2px 8px",
    borderRadius: "12px",
    color: "#fff",
    fontWeight: 600,
  },
};