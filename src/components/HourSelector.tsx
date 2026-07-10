"use client";

import React from "react";

interface HourSelectorProps {
  selectedHour: number;
  onChange: (hour: number) => void;
}

export default function HourSelector({ selectedHour, onChange }: HourSelectorProps) {
  return (
    <div style={styles.hourSelector}>
      <label style={styles.hourLabel}>⏰ Ora:</label>
      <input
        type="range"
        min="0"
        max="23"
        value={selectedHour}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={styles.hourSlider}
      />
      <span style={styles.hourValue}>
        {String(selectedHour).padStart(2, "0")}:00
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hourSelector: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "15px",
    padding: "8px 12px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "12px",
    flexWrap: "wrap",
  },
  hourLabel: {
    fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
    color: "#888",
    fontWeight: 500,
  },
  hourSlider: {
    flex: 1,
    accentColor: "#ff6b6b",
    height: "4px",
    minWidth: "80px",
  },
  hourValue: {
    fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
    fontWeight: "bold",
    color: "#fff",
    minWidth: "45px",
    textAlign: "center",
  },
};