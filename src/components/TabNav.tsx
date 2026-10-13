"use client";

import React from "react";
import { Activity, ArrowRight, CloudSun, Flame, Wind, type LucideIcon } from "lucide-react";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: {
  id: Tab;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  { id: "meteo", label: "Meteo", description: "Condizioni al decollo", icon: CloudSun },
  { id: "venti", label: "Venti", description: "Direzione e quota", icon: Wind },
  { id: "termiche", label: "Termiche", description: "Instabilità e ascendenze", icon: Flame },
  { id: "analisi", label: "Analisi", description: "Lettura aerologica", icon: Activity },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="analysis-tabs" aria-label="Sezioni del briefing" role="group">
      {tabs.map(({ id, label, description, icon: Icon }) => {
        const isActive = activeTab === id;

        return (
          <button
            key={id}
            type="button"
            className={`analysis-tab${isActive ? " is-active" : ""}`}
            data-tab={id}
            data-testid={`tab-${id}`}
            aria-pressed={isActive}
            aria-label={`${label}: ${description}`}
            onClick={() => onTabChange(id)}
          >
            <span className="analysis-tab-icon" aria-hidden="true">
              <Icon className="analysis-tab-icon-svg" />
            </span>
            <span className="analysis-tab-copy">
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
            <ArrowRight className="analysis-tab-arrow" aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
