"use client";

import React from "react";

export type Tab = "meteo" | "venti" | "quota" | "termiche" | "analisi";

interface TabNavProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "meteo", label: "Meteo", icon: "🌤️" },
  { id: "venti", label: "Venti sup.", icon: "💨" },
  { id: "quota", label: "Venti quota", icon: "⬆️" },
  { id: "termiche", label: "Termiche", icon: "🔥" },
  { id: "analisi", label: "Analisi AI", icon: "🤖" },
];

export const TabNav = ({ tab, onTabChange }: TabNavProps) => {
  return (
    <div className="flex gap-1 bg-slate-700/70 rounded-xl p-1 border border-slate-600/40 mb-2 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          className={`
            flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 whitespace-nowrap
            ${
              tab === t.id
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md scale-105"
                : "text-slate-300 hover:text-white hover:bg-slate-600/50"
            }
          `}
        >
          <span className="text-xs">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
};

export default TabNav;