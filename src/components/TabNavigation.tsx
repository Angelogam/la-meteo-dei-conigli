"use client";

import React from "react";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: "meteo" | "venti" | "termiche" | "analisi") => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: "meteo", label: "🌤️ Meteo" },
    { id: "venti", label: "💨 Venti" },
    { id: "termiche", label: "🔥 Termiche" },
    { id: "analisi", label: "🤖 Analisi" },
  ] as const;

  return (
    <div style={styles.tabContainer}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          style={{
            ...styles.tab,
            background:
              activeTab === tab.id
                ? "rgba(255,107,107,0.2)"
                : "transparent",
          }}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tabContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "5px",
    marginBottom: "15px",
  },
  tab: {
    padding: "8px 4px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
    fontSize: "clamp(0.6rem, 1.5vw, 0.85rem)",
    fontWeight: 500,
    textAlign: "center",
  },
};