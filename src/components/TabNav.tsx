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
    <div className="flex gap-1 mb-4">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onTabChange(t.key)}
          className={
            "flex-1 text-center py-2 rounded-xl text-sm font-bold transition-all duration-200 border-2 " +
            (tab === t.key
              ? "bg-orange-500/30 border-orange-400 text-white shadow-md"
              : "bg-white/10 border-gray-600 text-gray-300 hover:bg-white/20 hover:text-white")
          }
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
};