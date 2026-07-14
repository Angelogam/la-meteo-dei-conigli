"use client";

import React from "react";

interface AlertBannerProps {
  alert: { level: string; message: string; icon: string };
}

export default function AlertBanner({ alert }: AlertBannerProps) {
  return <>{alert.message}</>;
}