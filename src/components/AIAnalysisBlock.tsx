"use client";

import React from "react";

interface AIAnalysisBlockProps {
  title: string;
  content: string;
  icon?: string;
}

export default function AIAnalysisBlock({ title, content, icon }: AIAnalysisBlockProps) {
  if (!content) return null;
  return (
    <div style={styles.section}>
      <h3 style={styles.title}>{icon || "📊"} {title}</h3>
      <div style={styles.aiBlock}>
        <div
          style={styles.aiTextWhite}
          dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, "<br/>") }}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: "15px",
  },
  title: {
    fontSize: "clamp(0.85rem, 2.5vw, 1rem)",
    color: "#4fc3f7",
    marginBottom: "8px",
    fontWeight: 600,
  },
  aiBlock: {
    marginBottom: "0px",
    padding: "clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  aiTextWhite: {
    fontSize: "clamp(0.75rem, 2vw, 0.9rem)",
    color: "#e0e0e0",
    lineHeight: "1.7",
    whiteSpace: "pre-wrap",
    fontWeight: 400,
  },
};