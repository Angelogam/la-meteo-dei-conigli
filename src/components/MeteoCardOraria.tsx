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

const MeteoCardOraria: React.FC<Props> = ({ fascia, data }) => {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#0f172a] border border-[#22c55e]/30 text-gray-400">
        <p className="text-base">⛅ Nessun dato per {fascia}</p>
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

  const pioggiaSignificativa = pioggia > 0.5;
  const voloOk = !pioggiaSignificativa && vento >= 5 && vento <= 20 && umidita < 90;

  const badgeClass = voloOk
    ? "text-[#22c55e] bg-[#22c55e]/10"
    : "text-red-400 bg-red-900/20";

  const statusClass = voloOk ? "text-[#22c55e]" : "text-red-400";

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl border border-slate-700/30 transition-all ${cardBg}`}>
      {/* Intestazione */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">{fascia}</h3>
        <span className={`text-sm font-bold px-2 py-1 rounded-lg ${badgeClass}`}>
          {voloOk ? `${arrotonda(score)}/10` : "0/10"}
        </span>
      </div>

      {/* Dati principali */}
      <div className="flex items-center gap-2 text-sm text-gray-300 bg-[#1e293b]/40 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emojiMeteo(data.weatherCode)}</span>
          <span className="text-slate-500">|</span>
          <span className="text-lg font-bold text-amber-300">{temp}°C</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Vento:</span>
          <span className="text-sky-300">{vento} km/h</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Direzione:</span>
          <span className="text-blue-300">{direzione}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Base:</span>
          <span className="text-amber-300">{base} m</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Top:</span>
          <span className="text-red-400 font-bold">{top} m</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Umidità:</span>
          <span className="text-blue-300">{umidita}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Pioggia:</span>
          <span className="text-blue-300">{pioggia > 0 ? `${pioggia.toFixed(1)} mm` : "No"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Pressione:</span>
          <span className="text-red-400 font-bold">{pressione} hPa</span>
        </div>
      </div>

      {/* Stato volabilità */}
      <div className="mt-2 text-sm font-semibold ${statusClass}">
        {voloOk ? "✅ Ottimo per il decollo" : "⚠️ Attenzione: pioggia o vento fuori range"}
      </div>

      {/* Note */}
      <div className="mt-2 flex items-start gap-2 bg-slate-900/40 rounded-xl px-3 py-2">
        <span className="text-xs text-slate-300">Nota:</span>
        <span className="text-slate-400">{commentoVolo}</span>
      </div>
    </div>
  );
};

export default MeteoCardOraria;