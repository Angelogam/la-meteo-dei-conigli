"use client";

import { Sun, Wind, Flame, BarChart3 } from "lucide-react";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

interface TabNavProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "meteo", label: "Meteo", icon: <Sun className="w-3.5 h-3.5" /> },
  { key: "venti", label: "Venti", icon: <Wind className="w-3.5 h-3.5" /> },
  { key: "termiche", label: "Termiche", icon: <Flame className="w-3.5 h-3.5" /> },
  { key: "analisi", label: "Analisi", icon: <BarChart3 className="w-3.5 h-3.5" /> },
];

export const TabNav = ({ tab, onTabChange }: TabNavProps) => {
  return (
    <div className="flex gap-1.5 mb-3">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onTabChange(t.key)}
          className={
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border " +
            (tab === t.key
              ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-400 shadow-lg shadow-blue-500/20 scale-[1.02]"
              : "bg-white/80 text-slate-600 border-blue-200 hover:bg-blue-50 hover:text-slate-800 hover:border-blue-400")
          }
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
};