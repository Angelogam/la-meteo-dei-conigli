"use client";

import React from "react";
import {
  getWindArrow,
  getWindDirection,
  getWindColor,
  calculateWindShear,
} from "@/utils/meteoUtils";

interface WindProfileProps {
  profile: Array<{
    altitude: number;
    speed: number;
    direction: number;
    directionName: string;
  }>;
  maxSurfaceWind: number;
}

export default function WindProfile({ profile, maxSurfaceWind }: WindProfileProps) {
  const maxSpeed = maxSurfaceWind * 3.5;
  const shear = calculateWindShear(profile as any);

  return (
    <div style={styles.windProfileSection}>
      <h3 style={styles.windTitle}>📊 Profilo Vento (400m - 4000m)</h3>
      <div style={styles.windProfileContainer}>
        <div style={styles.windProfileLegend}>
          <span style={styles.legendItem}>⚡ Velocità (km/h)</span>
          <span style={styles.legendItem}>🧭 Direzione</span>
        </div>

        <div style={styles.windProfile}>
          {profile.map((level, index) => {
            const barWidth = Math.min(100, (level.speed / maxSpeed) * 100);
            return (
              <div key={index} style={styles.windProfileRow}>
                <div style={styles.windProfileAlt}>
                  {level.altitude === 10 ? "Superficie" : `${level.altitude}m`}
                </div>
                <div style={styles.windProfileBarContainer}>
                  <div
                    style={{
                      ...styles.windProfileBar,
                      width: `${barWidth}%`,
                      background: `linear-gradient(to right, ${getWindColor(level.speed, maxSpeed)}, ${getWindColor(level.speed, maxSpeed)})`,
                    }}
                  >
                    <span style={styles.windProfileSpeed}>
                      {level.speed} km/h
                    </span>
                  </div>
                </div>
                <div style={styles.windProfileDir}>
                  {getWindArrow(level.direction)} {level.directionName}
                </div>
              </div>
            );
          })}
        </div>

        {/* Analisi Shear */}
        <div style={styles.shearAnalysis}>
          <div
            style={{
              ...styles.shearBox,
              borderColor:
                shear.risk === "alto"
                  ? "#f44336"
                  : shear.risk === "medio"
                    ? "#ff9800"
                    : "#4caf50",
            }}
          >
            <div style={styles.shearTitle}>🌪️ Analisi Wind Shear</div>
            <div style={styles.shearValue}>Shear: {shear.shear}</div>
            <div style={styles.shearDesc}>{shear.description}</div>
            <div style={styles.shearDetails}>
              <span>
                Superficie: {shear.surfaceSpeed} km/h ({shear.surfaceDir})
              </span>
              <span>
                Alta quota: {shear.highSpeed} km/h ({shear.highDir})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  windProfileSection: {
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
  windProfileContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  windProfileLegend: {
    display: "flex",
    gap: "15px",
    fontSize: "clamp(0.6rem, 1.5vw, 0.75rem)",
    color: "#888",
    padding: "4px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  windProfile: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
    maxHeight: "300px",
    overflowY: "auto",
    padding: "4px",
  },
  windProfileRow: {
    display: "grid",
    gridTemplateColumns: "70px 1fr 50px",
    gap: "8px",
    alignItems: "center",
    padding: "3px 6px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "6px",
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)",
  },
  windProfileAlt: {
    color: "#888",
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
  },
  windProfileBarContainer: {
    height: "16px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "10px",
    overflow: "hidden",
    position: "relative",
  },
  windProfileBar: {
    height: "100%",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: "4px",
    minWidth: "30px",
  },
  windProfileSpeed: {
    fontSize: "clamp(0.5rem, 1vw, 0.6rem)",
    color: "#fff",
    fontWeight: "bold",
    textShadow: "0 1px 2px rgba(0,0,0,0.5)",
  },
  windProfileDir: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)",
    color: "#aaa",
    textAlign: "center",
  },
  shearAnalysis: {
    marginTop: "8px",
    padding: "8px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "8px",
  },
  shearBox: {
    padding: "10px",
    borderRadius: "8px",
    border: "2px solid",
    background: "rgba(0,0,0,0.2)",
  },
  shearTitle: {
    fontSize: "clamp(0.7rem,<dyad-write path="src/components/WindProfile.tsx" description="Profilo vento 400-4000m">
  shearTitle: {
    fontSize: "clamp(0.7rem, 1.8vw, 0.85rem)",
    fontWeight: "bold",
    color: "#fff",
    marginBottom: "2px",
  },
  shearValue: {
    fontSize: "clamp(0.8rem, 2vw, 1rem)",
    fontWeight: "bold",
    color: "#fff",
  },
  shearDesc: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)",
    color: "#ddd",
    marginTop: "2px",
  },
  shearDetails: {
    display: "flex",
    gap: "10px",
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
    color: "#888",
    marginTop: "4px",
    flexWrap: "wrap",
  },
};