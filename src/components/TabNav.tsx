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

const tabs: { id: Tab; label: string; icon: React.ReactNode; activeColor: string }[] = [
  { id: "meteo", label: "Meteo", icon: <CloudSun className="w-4 h-4" />, activeColor: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  { id: "venti", label: "Venti", icon: <Wind className="w-4 h-4" />, activeColor: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  { id: "termiche", label: "Termiche", icon: <Flame className="w-4 h-4" />, activeColor: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  { id: "analisi", label: "Analisi", icon: <BrainCircuit className="w-4 h-4" />, activeColor: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="grid grid-cols-4 gap-1 bg-slate-800/40 rounded-lg p-1 border border-slate-700/30">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-semibold transition-all ${
              isActive
                ? tab.activeColor + " border shadow-sm"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-700/30 border border-transparent"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
