"use client";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

interface TabNavProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "meteo", label: "Meteo", icon: "🌤️" },
  { key: "venti", label: "Venti", icon: "💨" },
  { key: "termiche", label: "Termiche", icon: "🪁" },
  { key: "analisi", label: "Analisi", icon: "📊" },
];

export const TabNav = ({ tab, onTabChange }: TabNavProps) => {
  return (
    <div className="flex gap-1.5 mb-4">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onTabChange(t.key)}
          className={
            "flex-1 text-center py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border " +
            (tab === t.key
              ? "bg-orange-500/30 border-orange-400 text-white shadow-lg shadow-orange-500/10"
              : "bg-gray-800/50 border-gray-600 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 hover:border-gray-500")
          }
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
};