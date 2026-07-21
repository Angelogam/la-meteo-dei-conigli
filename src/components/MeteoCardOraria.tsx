import React from "react";

interface Props {
  fascia: string;
  data: {
    temp: number;
    tempMax: number;
    vento: number;
    direzione: string;
    base: number;
    top: number;
    umidita: number;
    pioggia: number;
    pressione: number;
    score: number;
    commentoVolo: string;
  };
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

  const meteoOk = vento >= 5 && vento <= 20 && pioggia < 0.5 && umidita < 90;

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl border shadow-md transition-all duration-300 ${
      meteoOk
        ? "bg-gradient-to-b from-[#0f172a] to-[#1e293b] border-[#22c55e]/50"
        : "bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-red-500/40"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white tracking-wide">{fascia}</h3>
        <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
          meteoOk ? "text-[#22c55e] bg-[#22c55e]/10" : "text-red-400 bg-red-900/20"
        }`}>
          {score}/10
        </span>
      </div>

      {/* Condizioni generali */}
      <div className="flex items-center justify-between text-sm text-gray-300">
        <div>🌡️ <span className="text-yellow-400 font-semibold">{temp}°C</span> (max {tempMax}°)</div>
        <div>📈 Pressione <span className="font-semibold">{pressione} hPa</span></div>
      </div>

      {/* Vento */}
      <div className="flex items-center justify-between text-sm text-gray-300">
        <div>💨 <span className="font-semibold">{vento} km/h</span> {direzione}</div>
        <div>💧 Umidità <span className="font-semibold">{umidita}%</span></div>
      </div>

      {/* Termiche */}
      <div className="flex items-center justify-between text-sm text-gray-300">
        <div>🪂 Base <span className="text-[#22c55e] font-semibold">{base}m</span></div>
        <div>🏔️ Top <span className="text-[#22c55e] font-semibold">{top}m</span></div>
      </div>

      {/* Precipitazioni */}
      <div className="flex items-center justify-between text-sm text-gray-300">
        <div>🌦️ Pioggia <span className="font-semibold">{pioggia}mm</span></div>
        <div>{meteoOk ? "✅ Condizioni buone per il volo" : "⚠️ Non ideale per decollare"}</div>
      </div>

      {/* Commento pratico */}
      <div className="mt-2 text-sm text-gray-400 italic border-t border-gray-700 pt-2">
        {commentoVolo}
      </div>
    </div>
  );
};

export default MeteoCardOraria;