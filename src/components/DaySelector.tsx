"use client";

import React from "react";
import { getWeatherIcon } from "@/utils/meteoUtils";

interface DayData {
  date: Date;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  thermalDelta: number;
  precipitationSum: number;
}

interface DaySelectorProps {
  dailyData: DayData[];
  dateLabels: string[];
  selectedDay: number;
  onSelect: (index: number) => void;
}

export default function DaySelector({ dailyData, dateLabels, selectedDay, onSelect }: DaySelectorProps) {
  return (
    <div style={styles.daySelector}>
      {dailyData.map((day, index) => (
        <button
          key={index}
          onClick={() => {
            onSelect(index);
          }}
          style={{
            ...styles.dayButton,
            background:
              selectedDay === index
                ? "rgba(255,107,107,0.2)"
                : "rgba(255,255,255,0.05)",
            borderColor:
              selectedDay === index ? "#ff6b6b" : "rgba(255,255,255,0.1)",
          }}
        >
          <div style={styles.dayName}>{dateLabels[index]}</div>
          <div style={styles.dayWeatherIcon}>
            {getWeatherIcon(day.weatherCode, 1)}
          </div>
          <div style={styles.dayTemp}>
            {Math.round(day.tempMax)}°/{Math.round(day.tempMin)}°
          </div>
          <div style={styles.dayDelta}>Δ{day.thermalDelta}°C</div>
          <div style={styles.dayRain}>
            {day.precipitationSum > 0
              ? `🌧️${Math.round(day.precipitationSum)}mm`
              : "☀️"}
          </div>
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  daySelector: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginBottom: "15px",
  },
  dayButton: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "clamp(8px, 1.5vw, 12px)",
    cursor: "pointer",
    textAlign: "center",
    color: "#fff",
  },
  dayName: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.9rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  dayWeatherIcon: {
    fontSize: "clamp(1.2rem, 3vw, 1.8rem)",
    marginTop: "2px",
  },
  dayTemp: {
    fontSize: "clamp(0.9rem, 2vw, 1.1rem)",
    color: "#ff6b6b",
    marginTop: "2px",
    fontWeight: 600,
  },
  dayDelta: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#888",
    marginTop: "2px",
  },
  dayRain: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#4fc3f7",
    marginTop: "2px",
  },
};