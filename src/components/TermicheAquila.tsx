import React from "react";

interface ThermalData {
  hour: string;
  speed: number;
  base: number;
  top: number;
}

const TermicheAquila: React.FC<{ data: ThermalData[] }> = ({ data }) => {
  const getColor = (speed: number) => {
    if (speed < 0.8) return "#6b7280"; // grigio
    if (speed < 1.2) return "#facc15"; // giallo
    if (speed < 2.0) return "#f97316"; // arancio
    return "#dc2626"; // rosso
  };

  const getLabel = (speed: number) => {
    if (speed < 0.8) return "Molto debole";
    if (speed < 1.2) return "Debole";
    if (speed < 2.0) return "Moderata";
    return "Forte";
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
      {data.map((t, i) => (
        <div
          key={i}
          className="relative flex flex-col items-center justify-end bg-[#0f172a] rounded-xl border border-[#22c55e]/30 p-3 shadow-lg overflow-hidden"
        >
          {/* Ora */}
          <div className="text-sm text-gray-300 mb-2">{t.hour}</div>

          {/* Aquila */}
          <svg
            viewBox="0 0 64 64"
            width="40"
            height="40"
            className="absolute top-2"
          >
            <path
              d="M32 2c6 0 10 5 10 10s-4 10-10 10-10-5-10-10 4-10 10-10z"
              fill="#facc15"
            />
            <path
              d="M22 22c0 8 20 8 20 0l-2 10H24l-2-10z"
              fill="#78350f"
            />
          </svg>

          {/* Nuvola */}
          <div className="relative w-16 h-10 bg-gray-200 rounded-full shadow-md mt-10"></div>

          {/* Colonna termica */}
          <div
            className="w-6 rounded-b-lg mt-1"
            style={{
              height: `${(t.top - t.base) / 30}px`,
              backgroundColor: getColor(t.speed),
            }}
          ></div>

          {/* Dati */}
          <div className="mt-3 text-center text-xs text-gray-300">
            <div className="text-[#22c55e] font-semibold">{t.speed.toFixed(1)} m/s</div>
            <div>{getLabel(t.speed)}</div>
            <div className="text-[#22c55e]">Base {Math.round(t.base)} m</div>
            <div className="text-red-400">Top {Math.round(t.top)} m</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TermicheAquila;