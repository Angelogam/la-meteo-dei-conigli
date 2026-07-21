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
      <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-400">
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

  const pioggiaOk = pioggia < 0.5;
  const ventoOk = vento >= 5 && vento <= 20;
  const umiditaOk = umidita < 90;
  const voloOk = pioggiaOk && ventoOk && umiditaOk;

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 ${
      voloOk
        ? "bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 border-emerald-500/40"
        : "bg-gradient-to-br from-slate-900 via-slate-850 to-red-950 border-red-500/40"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/60 border-b border-slate-700/30">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${voloOk ? "bg-emerald-400 animate-pulse" : "bg-red-400 animate-pulse"}`} />
          <h3 className="text-base font-bold text-white">{fascia}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
            voloOk
              ? "text-emerald-300 bg-emerald-900/30 border-emerald-500/40"
              : "text-red-300 bg-red-900/30 border-red-500/40"
          }`}>
            {score}/10
          </span>
          <span className="text-lg">
            {voloOk ? "🪂" : "⚠️"}
          </span>
        </div>
      </div>

      {/* Riga rapida: tempo + vento */}
      <div className="grid grid-cols-3 gap-2 px-4 py-2.5 bg-slate-800/30">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-lg">{pioggiaOk ? "☀️" : "🌧️"}</span>
          <span className="font-bold text-white">{temp}°C</span>
          <span className="text-slate-500 text-xs">(max {tempMax}°)</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-lg">💨</span>
          <span className="font-bold text-sky-300">{vento}</span>
          <span className="text-slate-500 text-xs">{direzione}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm justify-end">
          {pioggiaOk ? (
            <span className="text-emerald-400 text-xs font-bold">Secco ✅</span>
          ) : (
            <span className="text-red-400 text-xs font-bold">Pioggia {pioggia}mm</span>
          )}
        </div>
      </div>

      {/* Dettagli tecnici */}
      <div className="px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-3 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>Base <strong className="text-emerald-300">{base}m</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
          <span>Top <strong className="text-orange-300">{top}m</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
          <span>Umidità <strong className="text-sky-300">{umidita}%</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
          <span>Pressione <strong className="text-purple-300">{pressione} hPa</strong></span>
        </div>
      </div>

      {/* Warning indicator */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-1.5">
          {!pioggiaOk && (
            <span className="text-[10px] font-bold text-red-400 bg-red-900/30 px-2 py-0.5 rounded-full">🌧️</span>
          )}
          {!ventoOk && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full">💨 Vento {vento} km/h</span>
          )}
          {!umiditaOk && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded-full">💧 Umidità {umidita}%</span>
          )}
          {voloOk && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full">✅ OK</span>
          )}
        </div>
      </div>

      {/* Commento */}
      <div className="px-4 py-2.5 border-t border-slate-700/30 bg-slate-800/20">
        <p className="text-xs text-slate-400 italic leading-relaxed">{commentoVolo}</p>
      </div>
    </div>
  );
};

export default MeteoCardOraria;