"use client";

import type { HourData } from "@/types/meteo";
import { calcTurbulence } from "@/utils/meteo";

interface VentiTabProps {
  dayData: HourData[];
}

const hours9to19 = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
const turbQuotes = [1000, 1500, 2000, 2500, 3000];
const turbColor = (v: number) => {
  if (v <= 1) return "#4caf50";
  if (v <= 2) return "#8bc34a";
  if (v <= 3) return "#ff9800";
  if (v <= 4) return "#ff5722";
  return "#f44336";
};

export const VentiTab = ({ dayData }: VentiTabProps) => {
  return (
    <>
      <h4 className="text-sm text-blue-300 mb-2.5 font-semibold">Turbolenza per quota</h4>
      <div className="overflow-x-auto mb-3">
        <table className="w-full border-collapse text-xs min-w-[500px]">
          <thead>
            <tr>
              <th className="text-center p-1 text-gray-400 border-b border-white/20 sticky top-0" style={{background: "#0d1b2a"}}>Ora</th>
              {turbQuotes.map((q) => (
                <th key={q} className="text-center p-1 text-blue-300 border-b border-white/20 sticky top-0" style={{background: "#0d1b2a"}}>{q}m</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours9to19.map((h) => {
              const hd = dayData.find((x) => x.time.getHours() === h);
              if (!hd) return null;
              return (
                <tr key={h}>
                  <td className="text-center p-1 text-gray-400 border-b border-white/10">{String(h).padStart(2, "0")}:00</td>
                  {turbQuotes.map((q) => {
                    const tv = calcTurbulence(dayData, h, q);
                    return (
                      <td key={q} className="text-center p-1 border-b border-white/10">
                        <span className="inline-block w-6 h-6 leading-6 rounded-full text-white font-bold text-xs" style={{background: turbColor(tv)}}>{tv}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3 p-2 bg-white/[0.07] rounded-xl border border-white/15">
        <div className="text-xs text-gray-300 w-full mb-1 font-semibold">Legenda Turbolenza:</div>
        {[
          [1, "Calma"],
          [2, "Leggera"],
          [3, "Moderata"],
          [4, "Forte"],
          [5, "Estrema"],
        ].map(([v, l]) => (
          <div key={v} className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 leading-4 rounded-full text-white font-bold text-xs text-center" style={{background: turbColor(v as number)}}>{v}</span>
            <span className="text-xs text-gray-400">{l}</span>
          </div>
        ))}
      </div>
    </>
  );
};