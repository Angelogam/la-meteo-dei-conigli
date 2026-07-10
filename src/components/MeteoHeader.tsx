"use client";

import React from "react";

export default function MeteoHeader() {
  return (
    <header style={styles.header}>
      <div style={styles.logoContainer}>
        <span style={styles.logoRabbit}>🐰</span>
        <span style={styles.logoParaglider}>🪂</span>
        <span style={styles.logoText}>Meteo dei Conigli</span>
      </div>
      <p style={styles.subtitle}>
        Previsioni per volo libero • Dati da Open-Meteo • Stile SHV FSVL
      </p>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    textAlign: "center",
    marginBottom: "clamp(15px, 3vw, 30px)",
    padding: "clamp(10px, 2vw, 20px) 0",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "clamp(8px, 2vw, 12px)",
    flexWrap: "wrap",
  },
  logoRabbit: {
    fontSize: "clamp(2rem, 6vw, 2.8rem)",
  },
  logoParaglider: {
    fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
  },
  logoText: {
    fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
    fontWeight: 800,
    background: "linear-gradient(135deg, #ff6b6b, #ffd93d)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "clamp(0.7rem, 2vw, 1rem)",
    color: "#888",
    marginTop: "8px",
    letterSpacing: "0.3px",
  },
};