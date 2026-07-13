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
    { bg: string; border: string; icon: React.ReactNode; color: string }
  > = {
    danger: {
      bg: "bg-gradient-to-r from-red-900/40 to-red-800/20",
      border: "border-red-400/50",
      icon: <ShieldAlert className="w-5 h-5 text-red-400" />,
      color: "text-red-300",
    },
    warning: {
      bg: "bg-gradient-to-r from-amber-900/40 to-amber-800/20",
      border: "border-amber-400/50",
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      color: "text-amber-300",
    },
    success: {
      bg: "bg-gradient-to-r from-emerald-900/40 to-emerald-800/20",
      border: "border-emerald-400/50",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      color: "text-emerald-300",
    },
    info: {
      bg: "bg-gradient-to-r from-sky-900/40 to-sky-800/20",
      border: "border-sky-400/50",
      icon: <Info className="w-5 h-5 text-sky-400" />,
      color: "text-sky-300",
    },
  };

  const s = styles[alert.level] || styles.info;

  return (
    <div
      className={`flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border ${s.bg} ${s.border} mb-4 card-neon relative overflow-hidden`}
    >
      <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-20" />
      <span className="shrink-0 text-xl relative z-10">{alert.icon}</span>
      <span className={`text-sm font-bold ${s.color} leading-snug text-center relative z-10 tracking-wide`}>
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