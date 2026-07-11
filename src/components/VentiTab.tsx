"use client";

import type { HourData } from "@/types/meteo";
import { calcTurbulence } from "@/utils/meteo";

interface VentiTabProps {
  dayData: HourData[];
}

const hours9to19 = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const turbQuotes = [1000, 1500, 2000, 2500, 3000];
const turbColor = (v: number) => {
  if (v <= 1) return "#16a34a";
  if (v <= 2) return "#65a30d";
  if (v <= 3) return "#d97706";
  if (v <= 4) return "#ea580c";
  return "#dc2626";
};

export const VentiTab = ({ dayData }: VentiTabProps) => {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-extrabold text-blue-700">🌪️ Turbolenza per quota</h4>
      
      {/* Tabella */}
      <div className="overflow-x-auto rounded-xl border-2 border-gray-300 shadow-sm bg-white/90">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-center p-2.5 font-bold text-gray-700 border-b-2 border-gray-300">Ora</th>
              {turbQuotes.map((q) => (
                <th key={q} className="text-center p-2.5 font-bold text-blue-700 border-b-2 border-gray-300">{q}m</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours9to19.map((h, idx) => {
              const hd = dayData.find((x) => x.time.getHours() === h);
              if (!hd) return null;
              return (
                <tr key={h} className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="text-center p-2.5 font-extrabold text-gray-800 border-b border-gray-200">{String(h).padStart(2, "0")}:00</td>
                  {turbQuotes.map((q) => {
                    const tv = calcTurbulence(dayData, h, q);
                    return (
                      <td key={q} className="text-center p-2.5 border-b border-gray-200">
                        <span className="inline-block w-8 h-8 leading-8 rounded-full text-white font-extrabold text-sm shadow-md" style={{background: turbColor(tv)}}>{tv}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 p-3 bg-white/90 rounded-xl border-2 border-gray-300 shadow-sm">
        <div className="text-xs font-extrabold text-gray-700 w-full mb-1">Legenda Turbolenza:</div>
        {([
          [1, "Calma"],
          [2, "Leggera"],
          [3, "Moderata"],
          [4, "Forte"],
          [5, "Estrema"],
        ] as const).map(([v, l]) => (
          <div key={v} className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-5 leading-5 rounded-full text-white font-extrabold text-xs text-center shadow-sm" style={{background: turbColor(v)}}>{v}</span>
            <span className="text-xs font-semibold text-gray-700">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};