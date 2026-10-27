"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface AeroCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  detail?: React.ReactNode;
  accent?: "sky" | "emerald" | "amber" | "purple" | "rose" | "violet";
  barValue?: number;
  barMax?: number;
}

const accentColors = {
  sky: { icon: "bg-sky-500/20 text-sky-400", bar: "bg-sky-500", border: "border-sky-500/20" },
  emerald: { icon: "bg-emerald-500/20 text-emerald-400", bar: "bg-emerald-500", border: "border-emerald-500/20" },
  amber: { icon: "bg-amber-500/20 text-amber-400", bar: "bg-amber-500", border: "border-amber-500/20" },
  purple: { icon: "bg-purple-500/20 text-purple-400", bar: "bg-purple-500", border: "border-purple-500/20" },
  rose: { icon: "bg-rose-500/20 text-rose-400", bar: "bg-rose-500", border: "border-rose-500/20" },
  violet: { icon: "bg-violet-500/20 text-violet-400", bar: "bg-violet-500", border: "border-violet-500/20" },
};

export default function AeroCard({
  icon,
  title,
  value,
  subtitle,
  detail,
  accent = "sky",
  barValue,
  barMax,
}: AeroCardProps) {
  const [expanded, setExpanded] = useState(false);
  const c = accentColors[accent];

  return (
    <div
      data-testid={`aerocard-${title}`}
      onClick={() => setExpanded(!expanded)}
      className={`
        relative rounded-2xl border bg-slate-900/60 backdrop-blur-sm
        overflow-hidden transition-all duration-300 cursor-pointer
        hover:border-white/20 hover:scale-[1.02] hover:bg-slate-800/60
        ${expanded ? `ring-2 ${c.border.replace('border', 'ring')} bg-slate-800/70` : ''}
      `}
    >
      <div className="p-4">
        <div className={`w-10 h-10 rounded-xl ${c.icon} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</div>
        
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-white">{value}</span>
        </div>
        
        {subtitle && (
          <div className="text-xs text-slate-400 mt-1">{subtitle}</div>
        )}
        
        {barValue != null && barMax != null && (
          <div className="mt-3">
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
                style={{ width: `${Math.min(100, (barValue / barMax) * 100)}%` }}
              />
            </div>
          </div>
        )}
        
        {expanded && detail && (
          <div className="mt-3 pt-3 border-t border-white/10 animate-in slide-in-from-top-2">
            {detail}
          </div>
        )}
        
        <div className="mt-2 flex justify-center">
          <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
    </div>
  );
}
