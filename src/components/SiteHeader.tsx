"use client";

import React from "react";
import { MapPin, Mountain, Compass, Wind, Sparkles } from "lucide-react";

interface SiteHeaderProps {
  name: string;
  exposure: string;
  valley: string;
  alt: number;
  currentData?: any;
}

export default function SiteHeader({ name, exposure, valley, alt, currentData }: SiteHeaderProps) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <MapPin className="w-5 h-5 text-emerald-400" />
        <div>
          <h3 className="text-sm font-bold text-white">{name}</h3>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Mountain className="w-3 h-3" />
            <span>{alt}m</span>
            <Compass className="w-3 h-3" />
            <span>{exposure}</span>
          </div>
        </div>
      </div>
    </div>
  );
}