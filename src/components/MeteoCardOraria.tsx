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
    migliorOra: string;
    piccoTermico: number;
    commentoVolo: string;
  };
}

const arrotonda = (n: number) => Math.round(n);

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
    migliorOra,
    piccoTermico,
    commentoVolo,
  } = data;

  const pioggiaOk = pioggia < 0.5;
  const ventoOk = vento >= 5 && vento <= 20;
  const umiditaOk = umidita < 90;
  const voloOk = pioggiaOk && ventoOk && umiditaOk;

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl border shadow-md transition-all duration-300 ${
      voloOk
        ? "bg-gradient-to-b from-[#0f172a] to-[#1e293b] border-[#22c55e]/50"
        : "bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-red-500/40"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white tracking-wide">{fascia}</h3>
        <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
          voloOk ? "text-[#22c55e] bg-[#22c55e]/10" : "text-red-400 bg-red-900/20"
        }`}>
          {arrotonda(score)}/10
        </span>
      </div>

      {/* Finestra integrata (Miglior ora + Picco termico) */}
      <div className="flex items-center justify-between text-sm text-gray-300 bg-[#1e293b]/40 rounded-lg p-2">
        <div>⭐ Miglior ora: <span className="text-[#22c55e] font-semibold">{migliorOra}</span></div>
        <div>🔥 Picco termico: <span className="text-yellow-400 font-semibold">{arrotonda(piccoTermico)} m/s</span></div>
      </div>

      {/* Sintesi visiva */}
      <div className="flex items-center justify-between text-sm font-semibold mt-2">
        <div className="flex items-center gap-2">
          {pioggiaOk ? "☀️" : "🌧️"} {pioggiaOk ? "Secco" : "Pioggia"}
        </div>
        <div className="flex items-center gap-2">
          💨 {arrotonda(vento)} km/h {direzione}
        </div>
        <div className="flex items-center gap-2">
          🌡️ {arrotonda(temp)}°C
        </div>
      </div>

      {/* Dettagli tecnici */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-300 mt-2">
        <div>🪂 Base <span className="text-[#22c55e] font-semibold">{arrotonda(base)}m</span></div>
        <div>🏔️ Top <span className="text-[#22c55e] font-semibold">{arrotonda(top)}m</span></div>
        <div>💧 Umidità <span className="font-semibold">{arrotonda(umidita)}%</span></div>
        <div>📈 Pressione <span className="font-semibold">{arrotonda(pressione)} hPa</span></div>
      </div>

      {/* Stato volabilità */}
      <div className={`mt-2 text-sm font-semibold ${
        voloOk ? "text-[#22c55e]" : "text-red-400"
      }`}>
        {voloOk ? "✅ Condizioni buone per il volo" : "⚠️ Non ideale per decollare"}
      </div>

      {/* Commento pratico */}
      <div className="mt-1 text-sm text-gray-400 italic border-t border-gray-700 pt-2">
        {commentoVolo}
      </div>
    </div>
  );
};

export default MeteoCardOraria;