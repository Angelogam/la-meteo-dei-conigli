"use client";

import React from "react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

export default function TermicheTab() {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3">Termiche</h3>
      <p className="text-slate-400 text-sm">Calcolo termiche</p>
    </div>
  );
}