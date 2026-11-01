import React from "react";

interface Props {
  data: {
    giorno: string;
    data: string;
    decollo: string;
    meteo: "sole" | "pioggia" | "nuvoloso";
    ventoDecollo: number;
    ventoAtterraggio: number;
    raffiche: number;
    baseNuvole: number;
    topTermiche: number;
    forzaTermica: number;
    turbolenza: string;
    cape: number;
    liftedIndex: number;
    umidita: number;
    pressione: number;
    nuvolosita: number;
    uvIndex: number;
    deltaT: number;
    gradiente: number;
    zeroTermico: number;
  };
}

const MeteoAnalisi: React.FC<Props> = ({ data }) => {
  const {
    giorno,
    data: dataGiorno,
    decollo,
    meteo,
    ventoDecollo,
    ventoAtterraggio,
    raffiche,
    baseNuvole,
    topTermiche,
    forzaTermica,
    turbolenza,
    cape,
    liftedIndex,
    umidita,
    pressione,
    nuvolosita,
    uvIndex,
    deltaT,
    gradiente,
    zeroTermico,
  } = data;

  const instabilita =
    liftedIndex < -6
      ? "🌪️ Molto instabile"
      : liftedIndex < -3
      ? "⚠️ Instabile"
      : "🌤️ Stabile";

  const termiche =
    forzaTermica > 4
      ? "🔥 Buone termiche"
      : forzaTermica > 2
      ? "🌡️ Termiche deboli"
      : "❄️ Termiche assenti";

  const voloOk =
    ventoDecollo >= 5 &&
    ventoDecollo <= 20 &&
    turbolenza !== "Forte" &&
    liftedIndex < -2 &&
    cape > 1000;

  const iconaMeteo =
    meteo === "sole"
      ? "🌞"
      : meteo === "pioggia"
      ? "🌧️"
      : "☁️";

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#1e293b] border border-[#22c55e]/40 shadow-lg hover:shadow-[#22c55e]/20 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          {iconaMeteo} Analisi atmosferica
        </h3>
        <div className="text-sm text-gray-300 text-right">
          📅 {giorno} — {dataGiorno}
          <br />
          🪂 Decollo: <span className="text-[#22c55e] font-semibold">{decollo}</span>
        </div>
      </div>

      {/* Vento */}
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mt-2">
        <div>💨 Vento decollo: <span className="font-semibold">{ventoDecollo} km/h</span></div>
        <div>🪁 Vento atterraggio: <span className="font-semibold">{ventoAtterraggio} km/h</span> (raffiche {raffiche} km/h)</div>
      </div>

      {/* Nuvole e termiche */}
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
        <div>☁️ Base nuvole: <span className="font-semibold">{baseNuvole} m</span></div>
        <div>🪂 Top termiche: <span className="font-semibold">{topTermiche} m</span></div>
      </div>

      {/* Termiche e stabilità */}
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
        <div>📎 Forza termica: <span className="font-semibold">{forzaTermica}/10</span> → {termiche}</div>
        <div>⚠️ Turbolenza: <span className="font-semibold">{turbolenza}</span></div>
        <div>🔥 CAPE: <span className="font-semibold">{cape} J/kg</span> → {instabilita}</div>
        <div>↘️ Lifted Index: <span className="font-semibold">{liftedIndex}°C</span></div>
      </div>

      {/* Condizioni generali */}
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
        <div>💧 Umidità: <span className="font-semibold">{umidita}%</span></div>
        <div>📈 Pressione: <span className="font-semibold">{pressione} hPa</span></div>
        <div>🌥️ Nuvolosità: <span className="font-semibold">{nuvolosita}%</span></div>
        <div>🌞 UV Index: <span className="font-semibold">{uvIndex}</span></div>
        <div>🌡️ Delta T: <span className="font-semibold">{deltaT}°C</span></div>
        <div>📊 Gradiente: <span className="font-semibold">{gradiente}°</span> (adiabatico secco)</div>
        <div>❄️ Zero termico: <span className="font-semibold">{zeroTermico} m</span></div>
      </div>

      {/* Sintesi finale */}
      <div
        className={`mt-3 text-sm font-semibold rounded-lg p-2 text-center ${
          voloOk
            ? "bg-[#22c55e]/10 text-[#22c55e]"
            : "bg-red-900/20 text-red-400"
        }`}
      >
        {voloOk
          ? "✅ Condizioni favorevoli al volo libero"
          : "⚠️ Condizioni non ideali — verifica vento e stabilità"}
      </div>
    </div>
  );
};

export default MeteoAnalisi;