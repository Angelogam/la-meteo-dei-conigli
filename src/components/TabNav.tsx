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
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-lg shadow-orange-500/20 scale-[1.02]"
              : "bg-white/[0.04] text-blue-200/60 border-white/10 hover:bg-white/[0.08] hover:text-white/80 hover:border-white/20")
          }
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
};