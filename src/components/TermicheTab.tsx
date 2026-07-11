"use client";

import type { HourData } from "@/types/meteo";
import { generaAnalisiReale } from "@/utils/analisi";

interface TermicheTabProps {
  dayData: HourData[];
  altitude: number;
}

export const TermicheTab = ({ dayData, altitude }: TermicheTabProps) => {
  const analisi = generaAnalisiReale(dayData, altitude);

  if (!dayData.length) {
    return <div className="text-sm text-slate-300 p-4 text-center">Nessuna analisi termica disponibile</div>;
  }

  return (
    <div className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap space-y-3">
      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-orange-400 mb-1">🔥 Situazione Generale</h4>
        <p className="text-slate-200 whitespace-pre-line">{analisi.situazioneGenerale}</p>
      </div>

      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-blue-300 mb-1">🌡️ Profilo Termico e Stabilità</h4>
        <p className="text-slate-200 whitespace-pre-line">{analisi.profiloTermico}</p>
      </div>

      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-green-300 mb-1">🌬️ Vento e Dinamica in Quota</h4>
        <p className="text-slate-200 whitespace-pre-line">{analisi.ventoQuota}</p>
      </div>

      {analisi.tabellaOraria.length > 0 && (
        <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
          <h4 className="font-extrabold text-yellow-300 mb-2">🌤️ Previsione per la Giornata</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-500/40">
                  <th className="py-1.5 pr-2 font-bold text-slate-300">Fascia oraria</th>
                  <th className="py-1.5 pr-2 font-bold text-slate-300">Condizioni previste</th>
                  <th className="py-1.5 font-bold text-slate-300">Note</th>
                </tr>
              </thead>
              <tbody>
                {analisi.tabellaOraria.map((row, i) => (
                  <tr key={i} className="border-b border-slate-600/20 last:border-0">
                    <td className="py-1.5 pr-2 font-semibold text-yellow-200/80 whitespace-nowrap">{row.fascia}</td>
                    <td className="py-1.5 pr-2 text-slate-200">{row.condizioni}</td>
                    <td className="py-1.5 text-slate-300">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="p-3 bg-slate-700/60 rounded-xl border border-slate-600/40 shadow-sm">
        <h4 className="font-extrabold text-cyan-300 mb-1">🪂 Interpretazione per Attività Outdoor / Volo Libero</h4>
        <p className="text-slate-200 whitespace-pre-line">{analisi.interpretazione}</p>
      </div>
    </div>
  );
};