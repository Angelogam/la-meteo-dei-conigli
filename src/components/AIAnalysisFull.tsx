"use client";

import React from "react";
import AIAnalysisBlock from "./AIAnalysisBlock";

interface AIAnalysisFullProps {
  isAnalyzing: boolean;
  analysis: Record<string, string> | null;
}

export default function AIAnalysisFull({ isAnalyzing, analysis }: AIAnalysisFullProps) {
  return (
    <div style={styles.aiSection}>
      <div style={styles.aiHeader}>
        <span style={styles.aiIcon}>🤖</span>
        <h3 style={styles.aiTitle}>Analisi Completa della Giornata</h3>
        {isAnalyzing && <span style={styles.aiLoading}>⏳ Analisi in corso...</span>}
      </div>

      {analysis && !isAnalyzing && (
        <div style={styles.aiContent}>
          <AIAnalysisBlock title="Panoramica Generale" content={analysis.general} icon="📋" />
          <AIAnalysisBlock title="Consigli per il Volo" content={analysis.advice} icon="💡" />
          <AIAnalysisBlock title="Informazioni Sito" content={analysis.siteInfo} icon="📍" />
          <AIAnalysisBlock title="Analisi Pressione" content={analysis.pressure} icon="📊" />
          {analysis.thunderstorm && (
            <AIAnalysisBlock title="Allerta Temporali" content={analysis.thunderstorm} icon="⛈️" />
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  aiSection: {
    marginBottom: "20px",
    background: "rgba(0,0,0,0.4)",
    borderRadius: "14px",
    border: "1px solid rgba(255,107,107,0.15)",
    overflow: "hidden",
  },
  aiHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "clamp(10px, 2vw, 14px) clamp(12px, 2vw, 18px)",
    background: "rgba(255,107,107,0.08)",
    borderBottom: "1px solid rgba(255,107,107,0.1)",
    flexWrap: "wrap",
  },
  aiIcon: {
    fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
  },
  aiTitle: {
    fontSize: "clamp(0.9rem, 2.5vw, 1.1rem)",
    color: "#ff6b6b",
    margin: 0,
    fontWeight: 600,
  },
  aiLoading: {
    marginLeft: "auto",
    fontSize: "clamp(0.7rem, 2vw, 0.85rem)",
    color: "#ffd93d",
  },
  aiContent: {
    padding: "clamp(10px, 2vw, 16px)",
    maxHeight: "500px",
    overflowY: "auto",
  },
};