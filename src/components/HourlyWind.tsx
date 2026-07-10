"use client";

import React from "react";
import { getWindArrow, getWindDirection, getWeatherIcon } from "@/utils/meteoUtils";

interface HourData {
  windDir: number;
  windSpeed: number;
  weatherCode: number;
  isDay: number;
}

interface HourlyWindProps {
  hoursRange: number[];
  dayData: HourData[];
  getHourData: (hour: number) => HourData | undefined;
}

export default function HourlyWind({ hoursRange, dayData, getHourData }: HourlyWindProps) {
  return (
    <div style={styles.hourlyWindSection}>
      <h3 style={styles.windTitle}>📊 Vento orario (9:00 - 19:00)</h3>
      <div style={styles.hourlyWindGrid}>
        {hoursRange.map((hour) => {
          const hourData = dayData?.find((h: any) => h.time.getHours() === hour);
          if (!hourData) return null;
          return (
            <div key={hour} style={styles.hourlyWindCard}>
              <div style={styles.hourlyTime}>{String(hour).padStart(2, "0")}:00</div>
              <div style={styles.hourlyWind}>
                {getWindArrow(hourData.windDir)}
                <span style={styles.hourlySpeed}>{Math.round(hourData.windSpeed)}</span>
              </div>
              <div style={styles.hourlyDir}>{getWindDirection(hourData.windDir)}</div>
              <div style={styles.hourlyWeather}>
                {getWeatherIcon(hourData.weatherCode || 0, hourData.isDay)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hourlyWindSection: {
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
  hourlyWindGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(45px, 1fr))",
    gap: "3px",
    overflowX: "auto",
  },
  hourlyWindCard: {
    textAlign: "center",
    padding: "6px 4px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "6px",
    minWidth: "40px",
  },
  hourlyTime: {
    fontSize: "clamp(0.5rem, 1.2vw, 0.65rem)",
    color: "#888",
    marginBottom: "2px",
    fontWeight: 500,
  },
  hourlyWind: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1px",
  },
  hourlySpeed: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.9rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  hourlyDir: {
    fontSize: "clamp(0.5rem, 1vw, 0.6rem)",
    color: "#666",
  },
  hourlyWeather: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.8rem)",
    marginTop: "1px",
  },
};