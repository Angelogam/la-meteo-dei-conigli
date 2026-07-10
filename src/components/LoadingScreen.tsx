"use client";

import React from "react";

export default function LoadingScreen() {
  return (
    <div style={styles.loadingFull}>
      <div style={styles.spinner}></div>
      <p style={styles.loadingText}>🪂 Caricamento previsioni meteo...</p>
      <p style={styles.loadingSub}>Open-Meteo • Free Flight Forecast</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingFull: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0e27, #1a1a3e)",
    color: "#eee",
    padding: "20px",
  },
  spinner: {
    width: "60px",
    height: "60px",
    border: "4px solid rgba(255,255,255,0.1)",
    borderTopColor: "#ff6b6b",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  loadingText: {
    marginTop: "20px",
    fontSize: "clamp(1rem, 4vw, 1.4rem)",
    color: "#fff",
    textAlign: "center",
  },
  loadingSub: {
    marginTop: "10px",
    fontSize: "clamp(0.8rem, 3vw, 1rem)",
    color: "#888",
    textAlign: "center",
  },
};