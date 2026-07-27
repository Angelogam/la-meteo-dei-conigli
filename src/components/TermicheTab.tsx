"use client";

import React from "react";

interface TermicheTabProps {
  currentData?: any;
  dayData?: any[];
  site?: { alt: number; lat: number; lon: number; name: string };
}

export default function TermicheTab({ currentData, dayData, site }: TermicheTabProps) {
  return <div>Termiche Tab - {site?.name || "Decollo"}</div>;
}