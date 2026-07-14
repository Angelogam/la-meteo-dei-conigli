"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Info, Wind } from "lucide-react";

interface AlertBannerProps {
  alert: { level: string; message: string; icon: string };
}

export default function AlertBanner({ alert }: AlertBannerProps) {
  const styles: Record<string, { icon: React.ReactNode; color: string }> = {
    danger: {
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
      color: "text-red-300",
    },
    warning: {
      icon: <Wind className="w-5 h-5 text-amber-400" />,
      color: "text-amber-300",
    },
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      color: "text-emerald-300",
    },
    info: {
      icon: <Info className="w-5 h-5 text-sky-400" />,
      color: "text-sky-300",
    },
  };

  const s = styles[alert.level] || styles.info;

  return (
    <>
      <span className="shrink-0">{s.icon}</span>
      <span className={`text-sm font-medium ${s.color} leading-snug`}>
        {alert.message}
      </span>
    </>
  );
}