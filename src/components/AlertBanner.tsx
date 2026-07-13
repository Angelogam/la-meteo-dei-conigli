"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
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
      bg: "bg-red-900/20",
      border: "border-red-500/40",
      icon: <ShieldAlert className="w-5 h-5 text-red-400" />,
    },
    warning: {
      bg: "bg-amber-900/20",
      border: "border-amber-500/40",
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    },
    success: {
      bg: "bg-emerald-900/20",
      border: "border-emerald-500/40",
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    },
    info: {
      bg: "bg-sky-900/20",
      border: "border-sky-500/40",
      icon: <Info className="w-5 h-5 text-sky-400" />,
    },
  };

  const s = styles[alert.level] || styles.info;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${s.bg} ${s.border} mb-4 animate-slideIn`}
    >
      <span className="shrink-0 text-xl">{alert.icon}</span>
      <span className="text-sm font-medium text-slate-200 leading-snug">
        {alert.message}
      </span>
    </div>
  );
}