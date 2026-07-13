"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

interface AlertBannerProps {
  alert: { level: string; message: string; icon: string };
}

export default function AlertBanner({ alert }: AlertBannerProps) {
  const styles: Record<
    string,
    { bg: string; border: string; icon: React.ReactNode }
  > = {
    danger: {
      bg: "bg-gradient-to-r from-red-900/30 to-red-800/15",
      border: "border-red-400/40",
      icon: <ShieldAlert className="w-5 h-5 text-red-400 icon-neon" />,
    },
    warning: {
      bg: "bg-gradient-to-r from-amber-900/30 to-amber-800/15",
      border: "border-amber-400/40",
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 icon-neon" />,
    },
    success: {
      bg: "bg-gradient-to-r from-emerald-900/30 to-emerald-800/15",
      border: "border-emerald-400/40",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 icon-neon-green" />,
    },
    info: {
      bg: "bg-gradient-to-r from-sky-900/30 to-sky-800/15",
      border: "border-sky-400/40",
      icon: <Info className="w-5 h-5 text-sky-400 icon-neon-blue" />,
    },
  };

  const s = styles[alert.level] || styles.info;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${s.bg} ${s.border} mb-4 animate-slide-in-right card-hover relative overflow-hidden`}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 animate-shimmer pointer-events-none" />
      
      <span className="shrink-0 text-xl relative z-10">{alert.icon}</span>
      <span className="text-sm font-medium text-slate-200 leading-snug flex-1 relative z-10">
        {alert.message}
      </span>
      <Sparkles className={`w-4 h-4 animate-twinkle shrink-0 relative z-10 ${
        alert.level === 'success' ? 'text-emerald-400' :
        alert.level === 'danger' ? 'text-red-400' :
        alert.level === 'warning' ? 'text-amber-400' : 'text-sky-400'
      }`} />
    </div>
  );
}