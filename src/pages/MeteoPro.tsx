import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  ReferenceLine
} from "recharts";

// -----------------------------
// COMPONENTE: Profilo Verticale
// -----------------------------
interface Layer {
  quota: number;
  speed: number;
  dir: string;
}

const ProfiloVerticalePro: React.FC<{ layers: Layer[] }> = ({ layers }) => {
  const getColor = (speed: number) => {
    if (speed <= 8) return "#22c55e";
    if (speed <= 15) return "#facc15";
    if (speed <= 22) return "#f97316";
    if (speed <= 30) return "#dc2626";
    return "#7f1d1d";
  };

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-[#22c55e]/30 p-6 shadow-xl flex flex-col gap-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        🌬️ Profilo verticale del vento
      </h3>

      <div className="flex flex-col gap-3">
        {layers.map((l, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-[#1e293b] rounded-xl px-3 py-2 border border-[#22c55e]/20"
          >
            <div className="text-gray-300 w-14">{l.quota} m</div>

            <div
              className="flex-1 h-4 rounded-full mx-3"
              style={{
                backgroundColor: getColor(l.speed),
                width: `${Math.min(l.speed * 3, 100)}%`,
                transition: "width 0.3s ease"
              }}
            ></div>

            <div className="w-16 text-right text-white font-semibold">
              {l.speed} km/h
            </div>

            <div className="w-12 text-[#22c55e] text-xs font-medium">
              {l.dir}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// -----------------------------
// COMPONENTE: Grafico Termico
// -----------------------------
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
      return (
        <div className="bg-[#0f172a] text-gray-200 p-3 rounded-lg border border-[#22c55e]/40 shadow-lg">
          <div className="text-sm font-semibold text-[#22c55e]">{hour}:00</div>
          <div className="text-lg font-bold text-white">{speed.toFixed(1)} m/s</div>
          <div className="text-xs text-gray-400">
            Base {Math.round(base)} m — Top {Math.round(top)} m
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-[#22c55e]/30 p-6 shadow-xl">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        🔥 Intensità termica giornaliera
      </h3>

      <div className="w-full h-72 flex justify-center">
        <ResponsiveContainer width="90%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 0, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="hour" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, "dataMax + 0.5"]} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
            <ReferenceLine y={1.5} stroke="#22c55e" strokeDasharray="3 3" />
            <Bar dataKey="speed" radius={[10, 10, 0, 0]} barSize={30}>
              {data.map((entry, index) => (
                <Cell key={index} fill={getColor(entry.speed)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// -----------------------------
// PAGINA COMPLETA
// -----------------------------
export default function MeteoPro() {
  return (
    <div className="p-6 flex flex-col gap-8">
      <ProfiloVerticalePro
        layers={[
          { quota: 500, speed: 9, dir: "↙ SW" },
          { quota: 1000, speed: 12, dir: "↙ SW" },
          { quota: 1350, speed: 14, dir: "↙ SW" },
          { quota: 1500, speed: 17, dir: "→ W" },
          { quota: 2000, speed: 20, dir: "→ W" },
          { quota: 2500, speed: 23, dir: "↗ NW" },
          { quota: 3000, speed: 27, dir: "↗ NW" }
        ]}
      />

      <GraficoTermicoPro
        data={[
          { hour: "09", speed: 0.7, base: 1800, top: 2100 },
          { hour: "11", speed: 0.9, base: 1850, top: 2150 },
          { hour: "13", speed: 1.1, base: 1900, top: 2200 },
          { hour: "15", speed: 1.3, base: 2000, top: 2300 },
          { hour: "17", speed: 1.6, base: 2040, top: 2520 },
          { hour: "19", speed: 1.2, base: 1950, top: 2400 }
        ]}
      />
    </div>
  );
}