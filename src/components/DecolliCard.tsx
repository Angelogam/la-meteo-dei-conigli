"use client";

import React from "react";
import { Wind, Clock } from "lucide-react";

interface DecolliCardProps {
  decolli: { id: string; nome: string; valle: string; quota: number; direzione: string; lat: number; lon: number }[];
  selectedId: string;
  selectedDay: number;
  onSelect: (item: { id: string; nome: string }) => void;
}

export default function DecolliCard({ decolli, selectedId, selectedDay, onSelect }: DecolliCardProps) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3">Decolli</h3>
      <div className="space-y-2">
        {decolli.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelect({ id: d.id, nome: d.nome })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedId === d.id
                ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/30"
                : "bg-slate-700/30 text-slate-300 hover:bg-slate-600/30"
            }`}
          >
            <div className="font-bold">{d.nome}</div>
            <div className="text-xs text-slate-400">{d.valle} • {d.quota}m</div>
          </button>
        ))}
      </div>
    </div>
  );
}