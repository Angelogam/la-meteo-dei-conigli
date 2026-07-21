import React from "react";

interface Props {
  data: {
    ventoDecollo: number;
    ventoAtterraggio: number;
    raffiche: number;
    baseNuvole: number;
    topTermiche: number;
    forzaTermica: number;
    turbolenza: string;
    cape: number;
    liftedIndex: number;
    cin: number;
    umidita: number;
    pressione: number;
    nuvolosita: number;
    uvIndex: number;
    deltaT: number;
    gradiente: number;
    pioggia: number;
  };
}

const MeteoAnalisi: React.FC<Props> = ({ data }) => {
  const {
    ventoDecollo,
    ventoAtterraggio,
    raffiche,
    baseNuvole,
    topTermiche,
    forzaTermica,
    turbolenza,
    cape,
    liftedIndex,
    cin,
    umidita,
    pressione,
    nuvolosita,
    uvIndex,
    deltaT,
    gradiente,
    pioggia,
  } = data;

  // Analisi sintetica per il volo
  const voloOk =
    ventoDecollo >= 5 &&
    ventoDecollo <= 20 &&
    turbolenza !== "Forte" &&
    liftedIndex < -2 &&
    cape > 1000 &&
    pioggia < 0.5;

  const stabilita =
    liftedIndex < -6
      ? "Molto instabile"
      : liftedIndex < -3
      ? "Instabile"
      : "Stabile";

  const termiche =
    forzaTermica > 4
      ? "Buone termiche"
      : forzaTermica > 2
      ? "Deboli termiche"
      : "Assenti";

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-gradient-to-b from-[#0f172a] to-[#1e293b] border border-[#22c55e]/40 shadow-md">
      {/* Header */}
      <h3 className="text-lg font-semibold text-white tracking-wide">
        Analisi atmosferica
      </h3>

      {/* Sintesi visiva */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-300">
        <div className="flex-1 min-w-[150px]">
          💨 <span className="font-semibold">Vento decollo:</span>{" "}
          {ventoDecollo} km/h
        </div>
        <div className="flex-1 min-w-[150px]">
          🪂 <span className="font-semibold">Vento atterraggio:</span>{" "}
          {ventoAtterraggio} km/h (raffiche {raffiche} km/h)
        </div>
        <div className="flex-1 min-w-[150px]">
          ☁️ <span className="font-semibold">Base nuvole:</span>{" "}
          {baseNuvole} m
        </div>
        <div className="flex-1 min-w-[150px]">
          🔝 <span className="font-semibold">Top termiche:</span>{" "}
          {topTermiche} m
        </div>
      </div>

      {/* Termiche e stabilità */}
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mt-2">
        <div>
          🌡️ <span className="font-semibold">Forza termica:</span>{" "}
          {forzaTermica}/10 → {termiche}
        </div>
        <div>
          ⚠️ <span className="font-semibold">Turbulenza:</span>{" "}
          {turbolenza}
        </div>
        <div>
          🔥 <span className="font-semibold">CAPE:</span> {cape} J/kg →{" "}
          {stabilita}
        </div>
        <div>
          📉 <span className="font-semibold">Lifted Index:</span>{" "}
          {liftedIndex}°C
        </div>
      </div>

      {/* Condizioni generali */}
      <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 mt-2">
        <div>💧 Umidità: {umidita}%</div>
        <div>📈 Pressione: {pressione} hPa</div>
        <div>☁️ Nuvolosità: {nuvolosita}%</div>
        <div>🌞 UV Index: {uvIndex}</div>
        <div>🌡️ Delta T: {deltaT}°C</div>
        <div>📊 Gradiente: {gradiente}° (adiabatico secco)</div>
      </div>

      {/* Sintesi finale */}
      <div
        className={`mt-3 text-sm font-semibold ${
          voloOk ? "text-[#22c55e]" : "text-red-400"
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