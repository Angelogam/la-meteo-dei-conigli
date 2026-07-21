import React from "react";

interface Props {
  fascia: string;
  data: any;
}

const MeteoCardOraria: React.FC<Props> = ({ fascia, data }) => {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#0f172a] border border-[#22c55e]/30 text-gray-400">
        <p>⛅ Nessun dato disponibile per {fascia}</p>
      </div>
    );
  }

  const {
    temp,
    tempMax,
    vento,
    direzione,
    base,
    top,
    umidita,
    pioggia,
    pressione,
    score,
    commentoVolo,
  } = data;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-gradient-to-b from-[#0f172a] to-[#1e293b] border border-[#22c55e]/40 shadow-md hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white tracking-wide">{fascia}</h3>
        <span className="text-sm font-bold text-[#22c55e] bg-[#22c55e]/10 px-2 py-1 rounded-lg">
          {score}/10
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-300">
        <div>🌡️ <span className="text-yellow-400 font-semibold">{temp}°C</span> (max {tempMax}°)</div>
        <div>💨 <span className="font-semibold">{vento} km/h</span> {direzione}</div>
        <div>🪂 Base <span className="text-[#22c55e] font-semibold">{base}m</span></div>
        <div>🏔️ Top <span className="text-[#22c55e] font-semibold">{top}m</span></div>
        <div>💧 Umidità <span className="font-semibold">{umidita}%</span></div>
        <div>🌦️ Pioggia <span className="font-semibold">{pioggia}mm</span></div>
        <div>📈 Pressione <span className="font-semibold">{pressione} hPa</span></div>
      </div>

      <div className="mt-2 text-sm text-gray-400 italic border-t border-gray-700 pt-2">
        {commentoVolo}
      </div>
    </div>
  );
};

export default MeteoCardOraria;