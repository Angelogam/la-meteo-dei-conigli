"use client";

import React from "react";
import { useState } from "react";

type Tab = "meteo" | "venti" | "termiche" | "analisi";

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED ICON COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function MeteorologyIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-7 h-7">
      {/* Sun */}
      <circle cx="18" cy="18" r="8" fill="#FBBF24" className={active ? "animate-pulse" : ""} style={{ animationDuration: "1.5s" }} />
      <g className={active ? "animate-spin" : ""} style={{ animationDuration: "4s", transformOrigin: "18px 18px" }}>
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <line key={i} x1="18" y1="6" x2="18" y2="10" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" transform={`rotate(${deg} 18 18)`} />
        ))}
      </g>
      {/* Cloud */}
      <path d="M36 38H14a8 8 0 0 1-1-15.9A10 10 0 0 1 32 18a8 8 0 0 1 4 20z"
        fill={active ? "#38BDF8" : "#94A3B8"}
        stroke={active ? "#0284C7" : "#64748B"}
        strokeWidth="1.5"
        className={active ? "animate-bounce" : ""}
        style={{ animationDuration: "2.5s" }}
      />
    </svg>
  );
}

function WindIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-7 h-7">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M8 ${14 + i * 10} Q20 ${10 + i * 10} 32 ${14 + i * 10} T44 ${14 + i * 10}`}
          stroke={active ? "#22D3EE" : "#64748B"}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          className={active ? "animate-pulse" : ""}
          style={{ animationDelay: `${i * 0.2}s`, animationDuration: "1.5s" }}
        />
      ))}
      {/* Wind particles */}
      {active && [
        <circle key="p1" cx="38" cy="14" r="2" fill="#67E8F9" className="animate-ping" style={{ animationDuration: "1s" }} />,
        <circle key="p2" cx="42" cy="24" r="1.5" fill="#22D3EE" className="animate-ping" style={{ animationDelay: "0.3s", animationDuration: "1.2s" }} />,
        <circle key="p3" cx="36" cy="34" r="2" fill="#67E8F9" className="animate-ping" style={{ animationDelay: "0.6s", animationDuration: "1.4s" }} />,
      ]}
    </svg>
  );
}

function ThermalIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-7 h-7">
      {/* Flame */}
      <path d="M24 6 C24 6 14 18 14 28 C14 34 18 40 24 40 C30 40 34 34 34 28 C34 18 24 6 24 6Z"
        fill={active ? "#FB923C" : "#F97316"}
        className={active ? "animate-pulse" : ""}
        style={{ animationDuration: "0.8s" }}
      />
      <path d="M24 18 C24 18 20 26 20 30 C20 34 22 38 24 38 C26 38 28 34 28 30 C28 26 24 18 24 18Z"
        fill="#FDE68A"
        className={active ? "animate-pulse" : ""}
        style={{ animationDuration: "1.2s", animationDelay: "0.2s" }}
      />
      {/* Rising particles */}
      {active && [
        <circle key="r1" cx="20" cy="12" r="1.5" fill="#FCD34D" className="animate-bounce" style={{ animationDuration: "1s" }} />,
        <circle key="r2" cx="28" cy="10" r="1" fill="#FDBA74" className="animate-bounce" style={{ animationDelay: "0.3s", animationDuration: "1.2s" }} />,
        <circle key="r3" cx="24" cy="8" r="1.5" fill="#FDE68A" className="animate-bounce" style={{ animationDelay: "0.5s", animationDuration: "0.9s" }} />,
      ]}
    </svg>
  );
}

function AnalysisIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="w-7 h-7">
      {/* Brain outline */}
      <path d="M24 8 C18 8 12 12 12 18 C12 22 14 25 16 27 C14 29 12 32 12 36 C12 40 16 42 24 42 C32 42 36 40 36 36 C36 32 34 29 32 27 C34 25 36 22 36 18 C36 12 30 8 24 8Z"
        fill={active ? "#A78BFA" : "#8B5CF6"}
        stroke={active ? "#7C3AED" : "#6D28D9"}
        strokeWidth="2"
      />
      {/* Brain folds */}
      <path d="M18 18 Q24 14 30 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M16 26 Q24 22 32 26" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M18 34 Q24 30 30 34" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
      {/* Circuit nodes */}
      {active && [
        <circle key="n1" cx="16" cy="16" r="2" fill="#C4B5FD" className="animate-ping" style={{ animationDuration: "1.5s" }} />,
        <circle key="n2" cx="32" cy="16" r="2" fill="#C4B5FD" className="animate-ping" style={{ animationDelay: "0.5s", animationDuration: "1.3s" }} />,
        <circle key="n3" cx="14" cy="32" r="1.5" fill="#DDD6FE" className="animate-ping" style={{ animationDelay: "0.8s", animationDuration: "1.1s" }} />,
        <circle key="n4" cx="34" cy="32" r="1.5" fill="#DDD6FE" className="animate-ping" style={{ animationDelay: "0.2s", animationDuration: "1.4s" }} />,
      ]}
    </svg>
  );
}

const iconMap = {
  meteo: MeteorologyIcon,
  venti: WindIcon,
  termiche: ThermalIcon,
  analisi: AnalysisIcon,
};

const tabColors: Record<Tab, { bg: string; border: string; text: string; glow: string; ring: string }> = {
  meteo: {
    bg: "from-sky-500/40 via-sky-600/30 to-cyan-500/20",
    border: "border-sky-400/70",
    text: "text-sky-100",
    glow: "shadow-[0_0_25px_rgba(14,165,233,0.5)]",
    ring: "ring-sky-400/50",
  },
  venti: {
    bg: "from-cyan-500/40 via-teal-600/30 to-emerald-500/20",
    border: "border-cyan-400/70",
    text: "text-cyan-100",
    glow: "shadow-[0_0_25px_rgba(6,182,212,0.5)]",
    ring: "ring-cyan-400/50",
  },
  termiche: {
    bg: "from-orange-500/40 via-amber-600/30 to-rose-500/20",
    border: "border-orange-400/70",
    text: "text-orange-100",
    glow: "shadow-[0_0_25px_rgba(251,146,60,0.5)]",
    ring: "ring-orange-400/50",
  },
  analisi: {
    bg: "from-violet-500/40 via-purple-600/30 to-fuchsia-500/20",
    border: "border-violet-400/70",
    text: "text-violet-100",
    glow: "shadow-[0_0_25px_rgba(139,92,246,0.5)]",
    ring: "ring-violet-400/50",
  },
};

const tabMeta: Record<Tab, { label: string; shortLabel: string; desc: string; emoji: string }> = {
  meteo: { label: "Meteo", shortLabel: "METEO", desc: "Condizioni generali", emoji: "🌤️" },
  venti: { label: "Venti", shortLabel: "VENTI", desc: "Profilo vento", emoji: "💨" },
  termiche: { label: "Termiche", shortLabel: "TERMICHE", desc: "Ascendenze", emoji: "🔥" },
  analisi: { label: "Analisi", shortLabel: "ANALISI", desc: "Studio volo", emoji: "🧠" },
};

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);
  const [pressedTab, setPressedTab] = useState<Tab | null>(null);

  return (
    <div className="grid grid-cols-4 gap-3 bg-slate-800/90 rounded-2xl p-2.5 border border-slate-700/60 shadow-2xl">
      {(Object.keys(tabMeta) as Tab[]).map((tabId) => {
        const isActive = tabId === activeTab;
        const isHovered = hoveredTab === tabId;
        const isPressed = pressedTab === tabId;
        const colors = tabColors[tabId];
        const meta = tabMeta[tabId];
        const IconComponent = iconMap[tabId];

        return (
          <button
            key={tabId}
            onClick={() => onTabChange(tabId)}
            onMouseEnter={() => setHoveredTab(tabId)}
            onMouseLeave={() => setHoveredTab(null)}
            onMouseDown={() => setPressedTab(tabId)}
            onMouseUp={() => setPressedTab(null)}
            className={`
              relative group flex flex-col items-center justify-center gap-2
              px-4 py-4 rounded-xl
              transition-all duration-300 ease-out overflow-hidden
              border-2
              ${isActive
                ? `bg-gradient-to-br ${colors.bg} ${colors.border} ${colors.text} ${colors.glow} scale-105 shadow-2xl`
                : `bg-slate-800/50 border-slate-700/40 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 hover:border-slate-600/60 hover:scale-105`
              }
              ${isPressed ? "scale-95" : ""}
            `}
          >
            {/* Animated background orbs */}
            {isActive && (
              <>
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20 blur-xl" style={{ backgroundColor: tabId === 'meteo' ? '#0ea5e9' : tabId === 'venti' ? '#06b6d4' : tabId === 'termiche' ? '#f97316' : '#8b5cf6' }} />
                <div className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full opacity-15 blur-lg" style={{ backgroundColor: tabId === 'meteo' ? '#0ea5e9' : tabId === 'venti' ? '#06b6d4' : tabId === 'termiche' ? '#f97316' : '#8b5cf6' }} />
                {/* Top accent line */}
                <div className="absolute top-0 left-3 right-3 h-0.5 rounded-b-full" style={{ background: `linear-gradient(90deg, transparent, ${tabId === 'meteo' ? '#38bdf8' : tabId === 'venti' ? '#22d3ee' : tabId === 'termiche' ? '#fb923c' : '#a78bfa'}, transparent)` }} />
              </>
            )}

            {/* Icon container with animated background */}
            <div className={`
              relative flex items-center justify-center w-12 h-12 rounded-2xl
              transition-all duration-300
              ${isActive ? 'bg-white/15 shadow-lg' : 'bg-slate-700/40 group-hover:bg-slate-600/50'}
            `}>
              {/* Glow behind icon when active */}
              {isActive && (
                <div className="absolute inset-0 rounded-2xl blur-md opacity-40" style={{ backgroundColor: tabId === 'meteo' ? '#0ea5e9' : tabId === 'venti' ? '#06b6d4' : tabId === 'termiche' ? '#f97316' : '#8b5cf6' }} />
              )}
              <IconComponent active={isActive} />
            </div>

            {/* Label */}
            <div className="flex flex-col items-center gap-0.5">
              <span className={`text-xs font-black tracking-[0.2em] ${isActive ? colors.text : 'text-slate-400 group-hover:text-slate-200'} transition-colors duration-300`}>
                {meta.shortLabel}
              </span>
              {isActive && (
                <span className={`text-[9px] font-semibold ${colors.text} opacity-60`}>
                  {meta.desc}
                </span>
              )}
            </div>

            {/* Active indicator */}
            {isActive && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1 h-1 rounded-full animate-bounce"
                    style={{
                      backgroundColor: tabId === 'meteo' ? '#38bdf8' : tabId === 'venti' ? '#22d3ee' : tabId === 'termiche' ? '#fb923c' : '#a78bfa',
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.8s',
                    }}
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
