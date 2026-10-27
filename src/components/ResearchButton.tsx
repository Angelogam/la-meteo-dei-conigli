"use client";

import React from "react";
import { Search } from "lucide-react";

interface ResearchButtonProps {
  onClick: () => void;
}

export default function ResearchButton({ onClick }: ResearchButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs py-4 px-4 rounded-xl text-center shadow-lg shadow-rose-600/30 cursor-pointer transition-all"
    >
      <div className="flex items-center justify-center gap-2">
        <Search className="w-4 h-4" />
        <span>🔬 RICERCA WEB — SCIARA SITI METEO PARAPENDIO</span>
      </div>
    </button>
  );
}