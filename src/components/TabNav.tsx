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

const tabs: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "meteo", label: "Meteo", icon: <CloudSun className="w-4 h-4" />, color: "from-sky-500/30 to-sky-600/20" },
  { id: "venti", label: "Venti", icon: <Wind className="w-4 h-4" />, color: "from-cyan-500/30 to-cyan-600/20" },
  { id: "termiche", label: "Termiche", icon: <Flame className="w-4 h-4" />, color: "from-orange-500/30 to-orange-600/20" },
  { id: "analisi", label: "Analisi", icon: <BrainCircuit className="w-4 h-4" />, color: "from-purple-500/30 to-purple-600/20" },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5 bg-slate-800/60 rounded-xl p-1.5 border border-slate-700/30">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-bold tracking-wide
              transition-all duration-200 overflow-hidden
              ${
                isActive
                  ? `bg-gradient-to-br ${tab.color} text-white shadow-lg border border-white/10 scale-105`
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 border border-transparent"
              }
            `}
          >
            {/* Shimmer overlay */}
            {isActive && (
              <div className="absolute inset-0 animate-shimmer pointer-events-none" />
            )}
            <span className={isActive ? "drop-shadow-lg" : ""}>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}