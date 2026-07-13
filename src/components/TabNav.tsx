"use client";

import React from "react";
import {
  CloudSun,
  Wind,
  Flame,
  BrainCircuit,
} from "lucide-react";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "meteo", label: "Meteo", icon: <CloudSun className="w-4 h-4" /> },
  { id: "venti", label: "Venti", icon: <Wind className="w-4 h-4" /> },
  { id: "termiche", label: "Termiche", icon: <Flame className="w-4 h-4" /> },
  { id: "analisi", label: "Analisi", icon: <BrainCircuit className="w-4 h-4" /> },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="flex gap-1.5 mb-5 bg-slate-800/60 rounded-xl p-1.5 border border-slate-700/30 card-hover">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-gradient-to-r from-orange-500/20 to-amber-500/15 text-orange-300 shadow-sm border border-orange-400/30 badge-glow"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 border border-transparent"
            }`}
          >
            <span className={isActive ? "icon-neon" : ""}>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}