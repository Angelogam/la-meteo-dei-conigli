"use client";

import React from "react";

interface ThunderstormAlertProps {
  content: string;
}

export default function ThunderstormAlert({ content }: ThunderstormAlertProps) {
  if (!content) return null;
  const isAlert = content.includes("ALLERTA");
  return (
    <div style={styles.thunderstormSection}>
      <div style={isAlert ? styles.thunderstormAlert : styles.thunderstormSafe}>
        <div
          style={styles.aiTextWhite}
          dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, "<br/>") }}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  thunderstormSection: {
    marginBottom: "15px",
  },
  thunderstormAlert: {
    padding: "12px 16px",
    borderRadius: "10px",
    background: "rgba(244,67,54,0.15)",
    border: "2px solid #f44336",
  },
  thunderstormSafe: {
    padding: "12px 16px",
    borderRadius: "10px",
    background: "rgba(76,175,80,0.1)",
    border: "1px solid rgba(76,175,80,0.3)",
  },
  aiTextWhite: {
    fontSize: "clamp(0.75rem, 2vw, 0.9rem)",
    color: "#e0e0e0",
    lineHeight: "1.7",
    whiteSpace: "pre-wrap",
    fontWeight: 400,
  },
};