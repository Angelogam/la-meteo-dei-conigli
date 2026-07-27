"use client";

import React from "react";

interface AnalisiTabProps {
  currentData?: any;
  dayData?: any[];
  site?: { alt: number; lat: number; lon: number; name: string; exposure: string };
}

export default function AnalisiTab({ currentData, dayData, site }: AnalisiTabProps) {
  return <div>Analisi Tab - {site?.name || "Decollo"}</div>;
}