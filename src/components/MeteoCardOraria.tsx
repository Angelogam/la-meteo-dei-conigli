import React from "react";

interface Props {
  fascia: string;
  score: number;
  temp: number;
  tempMax: number;
  vento: number;
  direzione: string;
  base: number;
  top: number;
  umidita: number;
  pioggia: number;
  pressione: number;
  commentoVolo: string;
}

const MeteoCardOraria: React.FC<Props> = ({
  fascia,
  score,
  temp,
  tempMax,
  vento,
  direzione,
  base,
  top,
  umidita,
  pioggia,
  pressione,
  commentoVolo,
}) => {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#0f172a] border border-[#22c55e]/30">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{fascia}</h3>
        <span className="text-sm text-[#22c55e] font-bold">{score}/10</span>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-gray-300">
        <div>🌡️ <span className="text-yellow-400">{temp}°C</span> (max {tempMax}°)</div>
        <div>💨 {vento} km/h {direzione}</div>
        <div>🪂 Base {base}m • Top {top}m</div>
        <div>💧 Umidità {umidita}%</div>
        <div>🌦️ Precipitazioni {pioggia}mm</div>
        <div>📈 Pressione {pressione} hPa</div>
      </div>

      <div className="mt-2 text-sm text-gray-400 italic">
        {commentoVolo}
      </div>
    </div>
  );
};

export default MeteoCardOraria;