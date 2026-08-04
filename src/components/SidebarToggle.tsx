"use client";

import React from "react";
import { Menu, X } from "lucide-react";

interface SidebarToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function SidebarToggle({ isOpen, onToggle }: SidebarToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="lg:hidden fixed bottom-4 left-4 z-50 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl border border-emerald-400/40 flex items-center justify-center transition-all active:scale-95"
      aria-label={isOpen ? "Chiudi sidebar" : "Apri sidebar"}
    >
      {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
    </button>
  );
}