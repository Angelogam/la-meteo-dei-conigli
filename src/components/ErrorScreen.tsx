"use client";

import React from "react";

interface ErrorScreenProps {
  error: string;
}

export default function ErrorScreen({ error }: ErrorScreenProps) {
  return (
    <div style={styles.errorFull}>
      <p style={styles.errorText}>❌ {error}</p>
      <button style={styles.retryButton} onClick={() => window.location.reload()}>
        🔄 Riprova
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  errorFull: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0e27, #1a1a3e)",
    color: "#eee",
    padding: "20px",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: "clamp(1rem, 4vw, 1.2rem)",
    marginBottom: "20px",
    textAlign: "center",
  },
  retryButton: {
    background: "#ff6b6b",
    color: "#fff",
    border: "none",
    padding: "12px 30px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "clamp(0.9rem, 3vw, 1rem)",
  },
};