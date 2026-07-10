"use client";

import React from "react";

export default function MeteoFooter() {
  return (
    <footer style={styles.footer}>
      <p style={styles.footerText}>
        🌤️ Dati meteo forniti da Open-Meteo.com • Ispirato a SHV FSVL • Ottimizzato per volo libero
      </p>
      <p style={styles.footerSmall}>🐰 Vola sicuro e divertiti! 🪂 • Beta v2.0</p>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    textAlign: "center",
    marginTop: "30px",
    padding: "20px 0",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  footerText: {
    fontSize: "clamp(0.65rem, 1.5vw, 0.8rem)",
    color: "#666",
  },
  footerSmall: {
    fontSize: "clamp(0.55rem, 1.2vw, 0.7rem)",
    color: "#444",
    marginTop: "5px",
  },
};