"use client";

import React from "react";
import { type Decollo } from "@/data/decolli";
import { getWeatherIcon } from "@/utils/meteoUtils";

interface SiteHeaderProps {
  site: Decollo;
  weatherCode: number;
  isDay: number;
  temperature: number;
}

export default function SiteHeader({ site, weatherCode, isDay, temperature }: SiteHeaderProps) {
  return (
    <div style={styles.siteHeader}>
      <div>
        <h2 style={styles.siteName}>{site.name}</h2>
        <span style={styles.siteInfo}>
          {site.exposure} • {site.valley} • {site.altitude || "N/D"}m
        </span>
      </div>
      <div style={styles.weatherNow}>
        <span style={styles.weatherIcon}>
          {getWeatherIcon(weatherCode || 0, isDay)}
        </span>
        <span style={styles.tempNow}>{Math.round(temperature)}°C</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  siteHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px",
    paddingBottom: "15px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    flexWrap: "wrap",
    gap: "10px",
  },
  siteName: {
    fontSize: "clamp(1.2rem, 4vw, 1.8rem)",
    marginBottom: "2px",
    color: "#fff",
    fontWeight: 700,
    margin: 0,
  },
  siteInfo: {
    fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
    color: "#888",
  },
  weatherNow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(255,255,255,0.08)",
    padding: "6px 14px",
    borderRadius: "30px",
  },
  weatherIcon: {
    fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
  },
  tempNow: {
    fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
    fontWeight: "bold",
  },
};