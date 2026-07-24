import React from "react";

interface WindLayer {
  quota: number;
  speed: number;
  direction: string;
}

const ProfiloVerticalePro: React.FC<{ data: WindLayer[] }> = ({ data }) => {
  const getColor = (speed: number) => {
    if (speed <= 8) return "#22c55e"; // verde
    if (speed <= 15) return "#facc15"; // giallo
    if (speed <= 22) return "#f97316"; // arancio
    if (speed <= 30) return "#dc2626"; // rosso
    return "#7f1d1d"; // bordeaux
  };

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-[#22c55e]/30 p-6 shadow-xl flex flex-col gap-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        🌬️ PROFILO VERTICALE — <span className="text-[#22c55e]">13:00</span>
      </h3>
      <div className="text-xs text-gray-400 mb-2">1350 m → 3000 m</div>

      {/* Barre vento */}
      <div className="flex flex-col gap-2">
        {data.map((layer, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-[#1e293b] rounded-xl px-3 py-2 border border-[#22c55e]/20"
          >
            <div className="text-gray-300 w-12">{layer.quota} m</div>
            <div
              className="flex-1 h-4 rounded-full mx-2"
              style={{
                backgroundColor: getColor(layer.speed),
                width: `${Math.min(layer.speed * 3, 100)}%`,
                transition: "width 0.3s ease",
              }}
            ></div>
            <div className="w-14 text-right text-white font-semibold">
              {layer.speed} km/h
            </div>
            <div className="w-12 text-[#22c55e] text-xs font-medium">
              {layer.direction}
            </div>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="mt-4 text-xs text-gray-300 flex flex-wrap justify-center gap-3">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#22c55e] rounded-sm"></span> ≤ 8 km/h
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#facc15] rounded-sm"></span> 9–15 km/h
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#f97316] rounded-sm"></span> 16–22 km/h
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#dc2626] rounded-sm"></span> 23–30 km/h
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#7f1d1d] rounded-sm"></span> > 30 km/h
        </div>
      </div>

      {/* Indicazione decollo */}
      <div className="mt-4 text-xs text-gray-400 text-center">
        🪂 Decollo a <span className="text-[#22c55e] font-semibold">1350 m</span>
      </div>
    </div>
  );
};

export default ProfiloVerticalePro;