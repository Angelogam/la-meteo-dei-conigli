"use client";

import React from "react";
import WindProfileUnified from "@/components/WindProfileUnified";

interface DettaglioGiornoContentProps {
  lat: number;
  lon: number;
  quotaDecollo: number;
  selectedDay: number;
  siteName?: string;
}

export default function DettaglioGiornoContent({
  lat,
  lon,
  quotaDecollo,
  siteName,
}: DettaglioGiornoContentProps) {
  return (
    <div className="space-y-4">
      <WindProfileUnified
        lat={lat}
        lon={lon}
        quotaDecollo={quotaDecollo}
        siteName={siteName}
      />
    </div>
  );
}