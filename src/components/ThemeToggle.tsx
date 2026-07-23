"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <button
      onClick={() => setDark(!dark)}
      className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center hover:bg-slate-700/80 transition-all shadow-lg backdrop-blur-sm"
      title={dark ? "Attiva tema chiaro" : "Attiva tema scuro"}
    >
      {dark ? (
        <Sun className="w-5 h-5 text-amber-400" />
      ) : (
        <Moon className="w-5 h-5 text-slate-300" />
      )}
    </button>
  );
}