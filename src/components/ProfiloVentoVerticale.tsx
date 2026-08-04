"use client";

import React from "react";
import { WindLevel } from "../types/volo";

interface ProfiloVentoVerticaleProps {
  livelli?: WindLevel[];
}

export const ProfiloVentoVerticale: React.FC<ProfiloVentoVerticaleProps> = ({ livelli = [] }) => {
  return (
    <div className="p-4 bg-slate-50 rounded-lg">
      <h4 className="font-semibold text-sm mb-2">Profilo Vento Verticale</h4>
      <div className="space-y-1">
        {livelli.map((l, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span>{l.quota || l.alt}m</span>
            <span>{l.velocita} km/h - {l.direzione}°</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfiloVentoVerticale;