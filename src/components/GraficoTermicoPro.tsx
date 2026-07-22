"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface ThermalData {
  hour: string;
  speed: number;
  base: number;
  top: number;
}

interface GraficoTermicoProProps {
  data: ThermalData[];
}

const GraficoTermicoPro: React.FC<GraficoTermicoProProps> = ({ data }) => {
  const [selectedHour, setSelectedHour] = useState<string | null>(null);

  const getColor = (speed: number) => {
    if (speed < 0.5) return "#facc15";
    if (speed < 1.0) return "#a3e635";
    if (speed < 1.5) return "#22c55e";
    if (speed < 2.0) return "#f97316";
    if (speed < 3.0) return "#ea580c";
    return "#dc2626";
  };

  const getLabel = (speed: number) => {
    if (speed < 0.5) return "Assente";
    if (speed < 1.0) return "Molto debole";
    if (speed < 1.5) return "Debole";
    if (speed < 2.0) return "Moderata";
    if (speed < 3.0) return "Forte";
    return "Fortissima";
  };

  const selected = data.find((d) => d.hour === selectedHour) || data[Math.floor(data.length / 2)];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 shadow-2xl">
          <div className="text-sm font-bold text-emerald-400 mb-1">{entry.hour}:00</div>
          <div className="text-2xl font-black text-white">{entry.speed.toFixed(1)} m/s</div>
          <div className="text-xs text-slate-400 mt-1">{getLabel(entry.speed)}</div>
          <div className="text-xs text-slate-500 mt-2">
            Base <span className="text-emerald-400 font-bold">{entry.base}m</span> · Top{" "}
            <span className="text-red-400 font-bold">{entry.top}m</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
          Intensità termica
        </h3>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>1.5 m/s soglia</span>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2 mb-4 text-[10px]">
        {[
          { label: "0-0.5", color: "#facc15" },
          { label: "0.5-1.0", color: "#a3e635" },
          { label: "1.0-1.5", color: "#22c55e" },
          { label: "1.5-2.0", color: "#f97316" },
          { label: "2.0-3.0", color: "#ea580c" },
          { label: ">3.0", color: "#dc2626" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-slate-400">{item.label}</span>
          </span>
        ))}
      </div>

      {/* Grafico */}
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
            onClick={(e) => {
              if (e?.activeLabel) setSelectedHour(e.activeLabel);
            }}
          >
            <XAxis
              dataKey="hour"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
              tickFormatter={(val: string) => `${val}:00`}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#475569", fontSize: 11 }}
              domain={[0, "auto"]}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <ReferenceLine
              y={1.5}
              stroke="#22c55e"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "1.5",
                position: "insideTopRight",
                fill: "#22c55e",
                fontSize: 10,
              }}
            />
            <Bar dataKey="speed" radius={[6, 6, 0, 0]} barSize={32}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(entry.speed)}
                  opacity={selectedHour && entry.hour !== selectedHour ? 0.4 : 0.9}
                  stroke={entry.hour === selectedHour ? "#fff" : "transparent"}
                  strokeWidth={entry.hour === selectedHour ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Dettaglio ora selezionata */}
      {selected && (
        <div className="mt-4 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 text-center">
          <div className="text-xs text-slate-400 mb-1">
            Ora selezionata: <span className="text-emerald-300 font-bold">{selected.hour}:00</span>
          </div>
          <div className="text-3xl font-black text-white">{selected.speed.toFixed(1)} m/s</div>
          <div className="text-sm font-bold text-orange-300 mt-0.5">{getLabel(selected.speed)}</div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-400">
            <span>
              Base <span className="text-emerald-300 font-bold">{selected.base}m</span>
            </span>
            <span className="text-slate-600">·</span>
            <span>
              Top <span className="text-red-300 font-bold">{selected.top}m</span>
            </span>
            <span className="text-slate-600">·</span>
            <span>
              Salita <span className="text-amber-300 font-bold">{selected.top - selected.base}m</span>
            </span>
          </div>
        </div>
      )}

      {/* Nota */}
      <div className="text-center text-[10px] text-slate-600 mt-3">
        Valori realistici per Alpi · Rateo massimo ~4-5 m/s in condizioni estreme
      </div>
    </div>
  );
};

export default GraficoTermicoPro;