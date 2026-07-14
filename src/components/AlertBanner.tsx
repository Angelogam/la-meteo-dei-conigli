"use client";

import React from "react";

interface AlertBannerProps {
  alert: { level: string; message: string; icon: string };
}

export default function AlertBanner({ alert }: AlertBannerProps) {
  return (
    <span className="text-sm font-medium leading-snug">
      {alert.message}
    </span>
  );
}