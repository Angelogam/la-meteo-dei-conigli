"use client";

import React from "react";
import { getWindArrow, getWindDirection } from "@/utils/meteoUtils";

interface WindAnalysisProps {
  windSpeed: number;
  windGust: number;
  windDir: number;
  wind80m: number | null;
  windDir80m: number | null;
  wind120m: number | null;
  windDir120m: number | null;
}

export default function WindAnalysis({
  windSpeed,
  windGust,
  windDir,
  wind80m,
  windDir80m,
  wind120m,
  windDir120m,
}: WindAnalysisProps) {
  const levels = [
    {
      label: "10 m (superficie)",
      speed: windSpeed,
      gust: windGust,
      dir: windDir,
    },
    {
      label: "80 m (quota termica)",
      speed: wind80m ?? null,
      gust: wind80m ? Math.round(wind80m * 1.3) : null,
      dir: windDir80m,
    },
    {
      label: "120 m (alta quota)",
      speed: wind120m ?? null,
      gust: wind120m ? Math.round(wind120m * 1.35) : null,
      dir: windDir120m,
    },
  ];

  return (
    <div style={styles.windSection}>
      <h3 style={styles.windTitle}>💨 Vento a differenti quote</h3>
      <div style={styles.windGrid}>
        {levels.map((level, i) => (
          <div key={i} style={styles.windCard}>
            <div style={styles.windLabel}>{level.label}</div>
            <div style={styles.windValue}>
              {level.speed !== null
                ? `${getWindArrow(level.dir ?? 0)} ${Math.round(level.speed)} km/h`
                : "N/D"}
            </div>
            <div style={styles.windDir}>
              {level.speed !== null ? getWindDirection(level.dir ?? 0) : "--"}
            </div>
            <div style={styles.windGustSmall}>
              ⚡ {level.gust !== null ? `${level.gust} km/h` : "--"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  windSection: {
    marginBottom: "15px",
    padding: "clamp(10px, 2vw, 16px)",
    background: "rgba(0,0,0,0.3)",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  windTitle: {
    fontSize: "clamp(0.85rem, 2.5vw, 1rem)",
    color: "#4fc3f7",
    marginBottom: "12px",
    fontWeight: 600,
  },
  windGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "10px",
  },
  windCard: {
    textAlign: "center",
    padding: "clamp(8px, 1.5vw, 12px)",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "10px",
  },
  windLabel: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#888",
    marginBottom: "4px",
    fontWeight: 500,
  },
  windValue: {
    fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  windDir: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.8rem)",
    color: "#aaa",
    marginTop: "2px",
  },
  windGustSmall: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.7rem)",
    color: "#ff6b6b",
    marginTop: "2px",
  },
};