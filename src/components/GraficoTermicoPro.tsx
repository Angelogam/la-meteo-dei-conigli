import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

interface ThermalData {
  hour: string;
  speed: number;
  base: number;
  top: number;
}

const GraficoTermicoPro: React.FC<{ data: ThermalData[] }> = ({ data }) => {
  const getColor = (speed: number) => {
    if (speed < 0.8) return "#facc15";
    if (speed < 1.5) return "#22c55e";
    if (speed < 2.5) return "#f97316";
    return "#dc2626";
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { hour, speed, base, top } = payload[0].payload;
      const label =
        speed < 0.8
          ? "Debole"
          : speed < 1.5
          ? "Moderata"
          : speed < 2.5
          ? "Forte"
          : "Fortissima";
      return (
        <div className="bg-[#0f172a] text-gray-200 p-3 rounded-lg border border-[#22c55e]/40 shadow-lg">
          <div className="text-sm font-semibold text-[#22c55e]">{hour}:00</div>
          <div className="text-lg font-bold text-white">{speed.toFixed(1)} m/s</div>
          <div className="text-xs text-gray-400">{label}</div>
          <div className="text-xs mt-1">
            Base <span className="text-[#22c55e]">{Math.round(base)} m</span> - Top{" "}
            <span className="text-red-400">{Math.round(top)} m</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center bg-[#0f172a] rounded-2xl border border-[#22c55e]/30 p-6 shadow-xl">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        Intensita termica giornaliera
      </h3>

      <div className="w-full h-72 flex justify-center">
        <ResponsiveContainer width="90%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 0, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="hour"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={[0, "dataMax + 0.5"]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <ReferenceLine y={1.5} stroke="#22c55e" strokeDasharray="3 3" />
            <Bar dataKey="speed" radius={[10, 10, 0, 0]} barSize={30}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.speed)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 text-xs text-gray-300 flex flex-wrap justify-center gap-3">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#facc15] rounded-sm"></span> Debole (0.3-0.8 m/s)
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#22c55e] rounded-sm"></span> Moderata (0.8-1.5 m/s)
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#f97316] rounded-sm"></span> Forte (1.5-2.5 m/s)
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-[#dc2626] rounded-sm"></span> Fortissima (oltre 2.5 m/s)
        </div>
      </div>

      <div className="mt-6 w-full bg-[#1e293b] rounded-xl p-5 text-center border border-[#22c55e]/30">
        <div className="text-sm text-gray-300">
          Alle <span className="text-[#22c55e] font-semibold">17:00</span> -{" "}
          <span className="text-[#f97316] font-semibold">Forte</span>
        </div>
        <div className="text-4xl font-bold text-white mt-1">1.6 m/s</div>
        <div className="text-xs text-gray-400 mt-1">
          Base <span className="text-[#22c55e]">2040 m</span> - Top{" "}
          <span className="text-red-400">2520 m</span> - Salita{" "}
          <span className="text-[#facc15]">480 m</span>
        </div>
      </div>

      <div className="mt-4 text-[10px] text-gray-500 text-center">
        Basato su dati reali Open-Meteo
      </div>
    </div>
  );
};

export default GraficoTermicoPro;