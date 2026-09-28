"use client";

import React from "react";
import {
  CloudSun,
  Wind,
  Flame,
  BrainCircuit,
} from "lucide-react";
import { useState } from "react";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; shortLabel: string; description: string; icon: React.ReactNode; activeIcon: React.ReactNode; colors: { bg: string; border: string; text: string; shadow: string; glow: string }; emoji: string }[] = [
  {
    id: "meteo",
    label: "Meteo",
    shortLabel: "METEO",
    description: "Condizioni generali",
    emoji: "🌤️",
    icon: <CloudSun className="w-6 h-6" />,
    activeIcon: <CloudSun className="w-7 h-7 animate-pulse" style={{ animationDuration: "2s" }} />,
    colors: {
      bg: "from-sky-500/30 via-sky-600/20 to-cyan-500/10",
      border: "border-sky-400/60",
      text: "text-sky-100",
      shadow: "shadow-sky-500/30",
      glow: "shadow-[0_0_20px_rgba(14,165,233,0.4)]",
    },
  },
  {
    id: "venti",
    label: "Venti",
    shortLabel: "VENTI",
    description: "Profilo vento",
    emoji: "💨",
    icon: <Wind className="w-6 h-6" />,
    activeIcon: (
      <span className="relative">
        <Wind className="w-7 h-7" />
        <span className="absolute -right-1 -top-0.5 text-[8px] animate-bounce" style={{ animationDuration: "0.6s" }}>~</span>
      </span>
    ),
    colors: {
      bg: "from-cyan-500/30 via-cyan-600/20 to-teal-500/10",
      border: "border-cyan-400/60",
      text: "text-cyan-100",
      shadow: "shadow-cyan-500/30",
      glow: "shadow-[0_0_20px_rgba(6,182,212,0.4)]",
    },
  },
  {
    id: "termiche",
    label: "Termiche",
    shortLabel: "TERMICHE",
    description: "Ascendenze",
    emoji: "🔥",
    icon: <Flame className="w-6 h-6" />,
    activeIcon: (
      <span className="relative">
        <Flame className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-ping" style={{ animationDuration: "1.2s" }} />
      </span>
    ),
    colors: {
      bg: "from-orange-500/30 via-amber-600/20 to-rose-500/10",
      border: "border-orange-400/60",
      text: "text-orange-100",
      shadow: "shadow-orange-500/30",
      glow: "shadow-[0_0_20px_rgba(251,146,60,0.4)]",
    },
  },
  {
    id: "analisi",
    label: "Analisi",
    shortLabel: "ANALISI",
    description: "Studio volo",
    emoji: "🧠",
    icon: <BrainCircuit className="w-6 h-6" />,
    activeIcon: (
      <span className="relative">
        <BrainCircuit className="w-7 h-7" />
        <span className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" style={{ animationDuration: "0.8s" }} />
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" style={{ animationDuration: "1s" }} />
      </span>
    ),
    colors: {
      bg: "from-purple-500/30 via-violet-600/20 to-fuchsia-500/10",
      border: "border-purple-400/60",
      text: "text-purple-100",
      shadow: "shadow-purple-500/30",
      glow: "shadow-[0_0_20px_rgba(168,85,247,0.4)]",
    },
  },
];

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);

  return (
    <div className="grid grid-cols-4 gap-2 bg-slate-800/80 rounded-2xl p-2 border border-slate-700/50 shadow-xl">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const isHovered = hoveredTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
            className={`
              relative group flex flex-col items-center justify-center gap-1.5
              px-3 py-3 rounded-xl text-sm font-black tracking-wide
              transition-all duration-300 ease-out overflow-hidden
              border-2
              ${isActive
                ? `bg-gradient-to-br ${tab.colors.bg} ${tab.colors.border} ${tab.colors.text} ${tab.colors.glow} scale-105 shadow-lg`
                : `bg-slate-800/40 border-slate-700/30 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 hover:border-slate-600/50 hover:scale-102`
              }
            `}
          >
            {/* Background shine effect */}
            {isActive && (
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent" />
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-white/5 rounded-full blur-xl" />
              </div>
            )}

            {/* Top accent line when active */}
            {isActive && (
              <div className={`absolute top-0 left-2 right-2 h-0.5 rounded-b-full bg-gradient-to-r from-transparent via-current to-transparent opacity-60`} />
            )}

            {/* Icon container */}
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${isActive ? 'bg-white/10' : 'bg-slate-700/30 group-hover:bg-slate-600/40'}`}>
              <span className={`${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
                {isActive ? tab.activeIcon : tab.icon}
              </span>
            </div>

            {/* Label */}
            <div className="flex flex-col items-center gap-0.5">
              <span className={`text-xs font-black tracking-widest ${isActive ? tab.colors.text : 'text-slate-400 group-hover:text-slate-200'} transition-colors duration-300`}>
                {tab.shortLabel}
              </span>
              {isActive && (
                <span className={`text-[9px] font-medium ${tab.colors.text} opacity-70`}>
                  {tab.description}
                </span>
              )}
            </div>

            {/* Active indicator dot */}
            {isActive && (
              <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${tab.colors.text.replace('text-', 'bg-')} animate-pulse`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
