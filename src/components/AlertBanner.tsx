"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Info, CloudSun, Wind } from "lucide-react";

interface AlertBannerProps {
  alert: { level: string; message: string; icon: string };
}

export default function AlertBanner({ alert }: AlertBannerProps) {
  const styles: Record<
    string,
    { bg: string; border: string; icon: React.ReactNode; color: string }
  > = {
    danger: {
      bg: "bg-red-950/60",
      border: "border-red-500/40",
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
      color: "text-red-300",
    },
    warning: {
      bg: "bg-amber-950/60",
      border: "border-amber-500/40",
      icon: <Wind className="w-5 h-5 text-amber-400" />,
      color: "text-amber-300",
    },
    success: {
      bg: "bg-emerald-950/60",
      border: "border-emerald-500/40",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      color: "text-emerald-300",
    },
    info: {
      bg: "bg-sky-950/60",
      border: "border-sky-500/40",
      icon: <Info className="w-5 h-5 text-sky-400" />,
      color: "text-sky-300",
    },
  };

  const s = styles[alert.level] || styles.info;

  return (
    <div
      className={`flex items-center justify-start gap-3 px-4 py-3 rounded-xl border ${s.bg} ${s.border}`}
    >
      <span className="shrink-0">{s.icon}</span>
      <span className={`text-sm font-medium ${s.color} leading-snug`}>
        {alert.message}
      </span>
    </div>
  );
}