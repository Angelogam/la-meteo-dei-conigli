import React from "react";

interface Props {
  data: {
    giorno: string;
    data: string;
    decollo: string;
    raffica: number;
    profilo: { quota: number; vento: number; direzione: string }[];
  };
}

const VentoProfilo: React.FC<Props> = ({ data }) => {
  const { giorno, data: dataGiorno, decollo, raffica, profilo } = data;

  const getColor = (v: number) => {
    if (v <= 8) return "bg-[#22c55e]/60";
    if (v <= 15) return "bg-[#facc15]/60";
    if (v <= 22) return "bg-[#fb923c]/60";
    if (v <= 30) return "bg-[#f87171]/60";
    return "bg-[#ef4444]/70";
  };

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#1e293b] border border-[#22c55e]/40 shadow-lg hover:shadow-[#22c55e]/20 transition-all duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          💨 Profilo vento verticale
        </h3>
        <div className="text-sm text-gray-300 text-right">
          📅 {giorno} — {dataGiorno}
          <br />
          🪂 Decollo: <span className="text-[#22c55e] font-semibold">{decollo}</span>
        </div>
      </div>

      <div className="text-sm text-gray-300 mt-1">
        🌬️ Raffica massima: <span className="font-semibold">{raffica} km/h</span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {profilo.map((p, i) => (
          <div key={i} className="flex items-center justify-between text-sm text-gray-300">
            <div className="w-20">{p.quota}m</div>
            <div className="flex-1 h-3 rounded-full overflow-hidden mx-2">
              <div
                className={`${getColor(p.vento)} h-full`}
                style={{ width: `${Math.min(p.vento * 2, 100)}%` }}
              />
            </div>
            <div className="w-24 text-right font-semibold">
              {p.vento} km/h <span className="text-gray-400">{p.direzione}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-400 flex flex-wrap gap-3 justify-center">
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#22c55e]/60 rounded-full" /> ≤8</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#facc15]/60 rounded-full" /> 9-15</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#fb923c]/60 rounded-full" /> 16-22</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#f87171]/60 rounded-full" /> 23-30</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#ef4444]/70 rounded-full" /> over 30</div>
      </div>

      <div className="mt-3 text-xs text-gray-400 text-center">
        Dati interpolati ogni 250 m da Open-Meteo &bull; Aggiornati alle 16:00
      </div>
    </div>
  );
};

export default VentoProfilo;