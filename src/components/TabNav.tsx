"use client";

type TabId = "meteo" | "venti" | "termiche" | "analisi";

interface TabNavProps {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string }[] = [
  { id: "meteo", label: "Meteo" },
  { id: "venti", label: "Venti" },
  { id: "termiche", label: "Termiche" },
  { id: "analisi", label: "Analisi" },
];

export const TabNav = ({ tab, onTabChange }: TabNavProps) => {
  return (
    <div className="grid grid-cols-4 gap-1 mb-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          className={
            "py-1.5 px-1 rounded-lg border border-white/20 text-xs font-semibold text-center transition-colors " +
            (tab === t.id
              ? "bg-red-500/20 text-red-300 border-red-400/40"
              : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]")
          }
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};