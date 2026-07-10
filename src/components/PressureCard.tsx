"use client";

import React from "react";

interface PressureCardProps {
  pressure: number;
  gradient: { gradient: number; description: string };
}

export default function PressureCard({ pressure, gradient }: PressureCardProps) {
  const gradientColor =
    gradient.gradient > 0
      ? "#4caf50"
      : gradient.gradient < 0
        ? "#f44336"
        : "#ffd93d";

  const gradientIcon =
    gradient.gradient > 0 ? "⬆️" : gradient.gradient < 0 ? "⬇️" : "➡️";

  return (
    <div style={styles.pressureSection}>
      <h3 style={styles.windTitle}>📊 Pressione e Gradiente</h3>
      <div style={styles.pressureGrid}>
        <div style={styles.pressureCard}>
          <div style={styles.pressureLabel}>Pressione attuale</div>
          <div style={styles.pressureValue}>{Math.round(pressure)} hPa</div>
        </div>
        <div style={styles.pressureCard}>
          <div style={styles.pressureLabel}>Gradiente</div>
          <div style={{ ...styles.pressureValue, color: gradientColor }}>
            {gradientIcon} {gradient.gradient} hPa
          </div>
          <div style={styles.pressureSub}>{gradient.description}</div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pressureSection: {
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
  pressureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: "10px",
  },
  pressureCard: {
    textAlign: "center",
    padding: "8px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "8px",
  },
  pressureLabel: {
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#888",
    marginBottom: "4px",
  },
  pressureValue: {
    fontSize: "clamp(1rem, 2.5vw, 1.3rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  pressureSub: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
    color: "#888",
    marginTop: "2px",
  },
};