"use client";

import React from "react";
import { Wind } from "lucide-react";

interface DecolloItem {
  nome: string;
  valle: string;
  quota: number;
  direzione: string;
  vento: number;
  iconaMeteo: string;
  coloreMeteo: string;
}

interface DecolliCardProps {
  decolli: DecolloItem[];
  selectedId: string;
  onSelect: (item: DecolloItem) => void;
  weatherMap?: Record<string, any>;
}

const DecolliCard = ({ decolli, selectedId, onSelect }: DecolliCardProps) => {
  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-4">
      <h2 className="text-base font-bold text-white mb-3">
        Decolli disponibili ({decolli.length})
      </h2>

      <div
        style={{
          maxHeight: "160px",
          overflowY: "auto",
          paddingRight: "4px",
        }}
      >
        {decolli.map((item) => {
          const isSelected = item.nome === selectedId;
          return (
            <button
              key={item.nome}
              onClick={() => onSelect(item)}
              className={`
                w-full rounded-xl p-3 text-left transition-all border-2 mb-2
                ${isSelected
                  ? "bg-emerald-900/40 border-emerald-500"
                  : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/50"
                }
              `}
            >
              {/* NOME DECOLLO */}
              <div className="text-sm font-bold text-white">
                {item.nome}
              </div>

              {/* INFO VALLE / QUOTA / DIREZIONE */}
              <div className="text-xs text-slate-400 flex justify-between mt-1">
                <span>{item.valle}</span>
                <span>{item.quota} m</span>
                <span>{item.direzione}</span>
              </div>

              {/* VENTO ATTUALE + GRADI + KM/H */}
              <div className="flex justify-between text-sm mt-1.5 pt-1.5 border-t border-slate-700/30">
                <div className="flex items-center gap-1 text-emerald-400">
                  <Wind size={16} />
                  <span className="font-bold">{item.vento} km/h</span>
                </div>
                <span className="text-slate-300">170°</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolliCard;