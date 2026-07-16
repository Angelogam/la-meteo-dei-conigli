"use client";

import React from "react";
import { Wind, Clock } from "lucide-react";

function getCardinalDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function getCurrentDateTime(): string {
  const now = new Date();
  return now.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getCurrentHour(): string {
  const now = new Date();
  return now.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
          const windDir = getCardinalDir(170);
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

              {/* GIORNO E ORA */}
              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                <Clock size={12} />
                <span>{getCurrentDateTime()} · {getCurrentHour()}</span>
              </div>

              {/* ICONA METEO + TEMPERATURA + VALLE / QUOTA / DIREZIONE */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg" style={{ color: item.coloreMeteo }}>
                    {item.iconaMeteo}
                  </span>
                  <span className="text-sm font-bold text-amber-300">20°</span>
                </div>
                <div className="text-xs text-slate-400 flex gap-3">
                  <span>{item.valle}</span>
                  <span>{item.quota} m</span>
                  <span>{item.direzione}</span>
                </div>
              </div>

              {/* VENTO ATTUALE QUOTA DECOLLO + PUNTO CARDINALE + KM/H */}
              <div className="mt-1.5 pt-1.5 border-t border-slate-700/30">
                <div className="text-[11px] text-slate-500 mb-1">
                  Vento attuale quota decollo
                </div>
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Wind size={16} />
                    <span className="font-bold">{item.vento} km/h</span>
                  </div>
                  <span className="text-slate-300">{windDir}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DecolliCard;