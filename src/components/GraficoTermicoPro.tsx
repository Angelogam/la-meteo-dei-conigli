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
  Area,
  AreaChart,
  ComposedChart,
  Line,
  Legend,
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
  const [chartType, setChartType] = useState<"bar" | "area" | "composed">("composed");

  const getColor = (speed: number) => {
    if (speed < 0.5) return { fill: "#fef08a", stroke: "#ca8a04" };
    if (speed < 1.0) return { fill: "#a3e635", stroke: "#65a30d" };
    if (speed < 1.5) return { fill: "#4ade80", stroke: "#16a34a" };
    if (speed < 2.0) return { fill: "#fb923c", stroke: "#ea580c" };
    if (speed < 3.0) return { fill: "#f97316", stroke: "#c2410c" };
    return { fill: "#f87171", stroke: "#dc2626" };
  };

  const getLabel = (speed: number): { text: string; icon: string } => {
    if (speed < 0.5) return { text: "Assente", icon: "❄️" };
    if (speed < 1.0) return { text: "Molto debole", icon: "💧" };
    if (speed < 1.5) return { text: "Debole", icon: "🌱" };
    if (speed < 2.0) return { text: "Moderata", icon: "🪁" };
    if (speed < 3.0) return { text: "Forte", icon: "🪂" };
    return { text: "Fortissima", icon: "🔥" };
  };

  const selected = data.find((d) => d.hour === selectedHour) || data[Math.floor(data.length / 2)];
  const selColor = getColor(selected?.speed || 0);
  const selLabel = getLabel(selected?.speed || 0);

  // Dati arricchiti per grafico combinato
  const enrichedData = data.map((d) => ({
    ...d,
    speed: Math.round(d.speed * 10) / 10,
    base_km: Math.round(d.base / 100) / 10,
    top_km: Math.round(d.top / 100) / 10,
  }));

  const maxSpeed = Math.max(...data.map((d) => d.speed), 2.5);
  const maxAlt = Math.max(...data.map((d) => d.top), 3000);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      const lbl = getLabel(entry.speed);
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-600/60 rounded-xl px-4 py-3 shadow-2xl min-w-[180px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{lbl.icon}</span>
            <span className="text-sm font-bold text-emerald-400">{entry.hour}:00</span>
          </div>
          <div className="text-3xl font-black text-white">{entry.speed.toFixed(1)} <span className="text-sm text-slate-400 font-normal">m/s</span></div>
          <div className="text-xs text-slate-400 mt-0.5">{lbl.text}</div>
          <div className="mt-2 pt-2 border-t border-slate-700/50 flex gap-3 text-xs">
            <span className="text-slate-400">Base <span className="text-emerald-300 font-bold">{entry.base}m</span></span>
            <span className="text-slate-400">Top <span className="text-red-300 font-bold">{entry.top}m</span></span>
            <span className="text-slate-400">Salita <span className="text-amber-300 font-bold">{entry.top - entry.base}m</span></span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (chartType) {
      case "bar":
        return (
          <BarChart data={enrichedData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            onClick={(e) => e?.activeLabel && setSelectedHour(e.activeLabel)}
          >
            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} tickFormatter={(v: string) => `${v}:00`} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, Math.ceil(maxSpeed) + 0.5]} width={30} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <ReferenceLine y={1.5} stroke="#4ade80" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: "Soglia 1.5", position: "insideTopRight", fill: "#4ade80", fontSize: 10 }} />
            <Bar dataKey="speed" radius={[8, 8, 0, 0]} barSize={34} animationDuration={800} animationEasing="ease-out">
              {enrichedData.map((entry, index) => (
                <Cell key={index} fill={getColor(entry.speed).fill}
                  opacity={selectedHour && entry.hour !== selectedHour ? 0.3 : 0.9}
                  stroke={entry.hour === selectedHour ? "#fff" : "transparent"}
                  strokeWidth={entry.hour === selectedHour ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        );

      case "area":
        return (
          <AreaChart data={enrichedData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            onClick={(e) => e?.activeLabel && setSelectedHour(e.activeLabel)}
          >
            <defs>
              <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.8} />
                <stop offset="50%" stopColor="#4ade80" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#4ade80" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} tickFormatter={(v: string) => `${v}:00`} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, Math.ceil(maxSpeed) + 0.5]} width={30} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={1.5} stroke="#4ade80" strokeDasharray="6 3" strokeWidth={1.5} />
            <Area type="monotone" dataKey="speed" stroke="#f97316" strokeWidth={3} fill="url(#speedGradient)" animationDuration={1000} />
          </AreaChart>
        );

      case "composed":
        return (
          <ComposedChart data={enrichedData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            onClick={(e) => e?.activeLabel && setSelectedHour(e.activeLabel)}
          >
            <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} tickFormatter={(v: string) => `${v}:00`} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, Math.ceil(maxSpeed) + 0.5]} width={30} />
            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#475569", fontSize: 9 }} domain={[1, Math.ceil(maxAlt / 100)]} width={30} tickFormatter={(v: number) => `${v * 100}m`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8", paddingTop: "10px" }} />
            <ReferenceLine y={1.5} stroke="#4ade80" strokeDasharray="6 3" strokeWidth={1.5} yAxisId="left" label={{ value: "Soglia 1.5", position: "insideTopRight", fill: "#4ade80", fontSize: 9 }} />
            <Bar yAxisId="left" dataKey="speed" radius={[6, 6, 0, 0]} barSize={26} animationDuration={800} animationEasing="ease-out" name="Velocità (m/s)">
              {enrichedData.map((entry, index) => (
                <Cell key={index} fill={getColor(entry.speed).fill}
                  opacity={selectedHour && entry.hour !== selectedHour ? 0.3 : 0.85}
                  stroke={entry.hour === selectedHour ? "#fff" : "transparent"}
                  strokeWidth={entry.hour === selectedHour ? 2 : 0}
                />
              ))}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="base_km" stroke="#4ade80" strokeWidth={2} dot={false} name="Base (hm)" strokeDasharray="4 3" />
            <Line yAxisId="right" type="monotone" dataKey="top_km" stroke="#f87171" strokeWidth={2} dot={false} name="Top (hm)" />
          </ComposedChart>
        );
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-700/50 rounded-2xl p-5 shadow-xl shadow-black/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
          </span>
          Intensità termiche
        </h3>
        <div className="flex gap-1">
          {(["bar", "area", "composed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                chartType === t
                  ? "bg-emerald-600/40 text-emerald-300 border border-emerald-500/40"
                  : "text-slate-500 hover:text-slate-300 bg-slate-800/40 border border-slate-700/30"
              }`}
            >
              {t === "bar" ? "Barre" : t === "area" ? "Area" : "Combinato"}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 mb-4 text-[10px]">
        {[
          { label: "< 0.5", color: "#fef08a" },
          { label: "0.5–1.0", color: "#a3e635" },
          { label: "1.0–1.5", color: "#4ade80" },
          { label: "1.5–2.0", color: "#fb923c" },
          { label: "2.0–3.0", color: "#f97316" },
          { label: "> 3.0", color: "#f87171" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-slate-400">{item.label} m/s</span>
          </span>
        ))}
      </div>

      {/* Grafico */}
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Dettaglio ora selezionata */}
      {selected && (
        <div
          className="mt-4 rounded-xl p-4 text-center border transition-all duration-300"
          style={{
            background: `linear-gradient(135deg, ${selColor.fill}15, ${selColor.fill}05)`,
            borderColor: `${selColor.stroke}40`,
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xl">{selLabel.icon}</span>
            <span className="text-xs text-slate-400">
              Ora selezionata: <span className="text-emerald-300 font-bold">{selected.hour}:00</span>
            </span>
          </div>
          <div className="text-4xl font-black text-white tracking-tight">
            {selected.speed.toFixed(1)}
            <span className="text-lg text-slate-400 font-normal ml-1">m/s</span>
          </div>
          <div className="text-sm font-bold mt-0.5" style={{ color: selColor.stroke }}>
            {selLabel.text}
          </div>
          <div className="flex items-center justify-center gap-5 mt-3 text-xs text-slate-400">
            <div>
              <div className="text-emerald-300 font-bold text-sm">{selected.base}m</div>
              <div className="text-[10px]">Base</div>
            </div>
            <div className="w-px h-8 bg-slate-600/50" />
            <div>
              <div className="text-red-300 font-bold text-sm">{selected.top}m</div>
              <div className="text-[10px]">Top</div>
            </div>
            <div className="w-px h-8 bg-slate-600/50" />
            <div>
              <div className="text-amber-300 font-bold text-sm">{selected.top - selected.base}m</div>
              <div className="text-[10px]">Salita</div>
            </div>
          </div>
        </div>
      )}

      {/* Nota */}
      <div className="text-center text-[10px] text-slate-600 mt-3 flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
        Valori basati su dati reali Open-Meteo · Rateo massimo ~4-5 m/s in condizioni estreme
      </div>
    </div>
  );
};

export default GraficoTermicoPro;