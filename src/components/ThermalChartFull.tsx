"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { HourData } from "@/types/meteo";
import type { MeteoCurrent } from "@/services/openMeteoService";

interface ThermalChartFullProps {
  hourlyData: HourData[];
  siteAlt: number;
}

function calcCloudBase(siteAlt: number, t: number | null, dew: number | null) {
  const temp = t ?? 18;
  const dewPoint = dew ?? temp - 8;
  const spread = Math.max(0.5, temp - dewPoint);
  return siteAlt + spread * 125;
}

function calcThermalTop(cloudBase: number, cape: number | null, spread: number) {
  const capeVal = cape ?? 200;
  const rate = Math.min(4, Math.max(0.5, spread * 0.25 + capeVal * 0.001));
  return cloudBase + rate * 400 + spread * 50;
}

function calcFlightWindow(hourly: HourData[]) {
  const startIdx = hourly.findIndex(h => {
    const t = h.temperature ?? 18;
    const dew = h.dewPoint ?? t - 8;
    return (t - dew) > 4;
  });
  const reversed = [...hourly].reverse();
  const endIdxFromEnd = reversed.findIndex(h => {
    const t = h.temperature ?? 18;
    const dew = h.dewPoint ?? t - 8;
    return (t - dew) > 4;
  });
  const actualEnd = hourly.length - 1 - endIdxFromEnd;

  return {
    start: hourly[Math.max(0, startIdx)]?.time?.getHours() ?? 8,
    end: hourly[Math.max(0, actualEnd)]?.time?.getHours() ?? 17,
  };
}

export default function ThermalChartFull({ hourlyData, siteAlt }: ThermalChartFullProps) {
  const window = calcFlightWindow(hourlyData);

  const chartData = hourlyData.map((h, i) => {
    const t = h.temperature ?? 18;
    const dew = h.dewPoint ?? t - 8;
    const spread = Math.max(0.5, t - dew);
    const cloudBase = calcCloudBase(siteAlt, t, dew);
    const thermalTop = calcThermalTop(cloudBase, h.cape, spread);
    const hour = h.time?.getHours() ?? 8 + i;

    return {
      hour: `${String(hour).padStart(2, "0")}:00`,
      hourNum: hour,
      cloudBase: Math.round(cloudBase),
      thermalTop: Math.round(thermalTop),
      cape: h.cape ?? 0,
      li: h.liftedIndex ?? 0,
      isFlightWindow: hour >= window.start && hour <= window.end,
    };
  });

  const avgCape = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.cape, 0) / chartData.length
    : 0;
  const maxThermalTop = chartData.length > 0
    ? Math.max(...chartData.map(d => d.thermalTop))
    : siteAlt + 2000;
  const avgCloudBase = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.cloudBase, 0) / chartData.length
    : siteAlt + 500;

  return (
    <div className="space-y-4">
      {/* Legenda */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gradient-to-b from-violet-500 to-sky-400 opacity-70" />
          <span className="text-slate-400">Zona termica (base→top)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
          <span className="text-slate-400">Finestra di volo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-violet-400" />
          <span className="text-slate-400">Top termico</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-sky-400" />
          <span className="text-slate-400">Base cumuli</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.5 bg-orange-400 border-dashed" />
          <span className="text-slate-400">CAPE (J/kg)</span>
        </div>
      </div>

      {/* Grafico */}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 15, right: 40, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="hour"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[siteAlt, maxThermalTop + 500]}
            tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
              color: "#f1f5f9",
              fontSize: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            }}
            labelStyle={{ color: "#94a3b8", fontWeight: "bold", marginBottom: "4px" }}
            formatter={(value: any, name: string) => {
              const labels: Record<string, string> = {
                cloudBase: "Base Cumuli",
                thermalTop: "Top Termico",
                cape: "CAPE",
              };
              const suffixes: Record<string, string> = {
                cloudBase: " m",
                thermalTop: " m",
                cape: " J/kg",
              };
              return [`${value}${suffixes[name] ?? ""}`, labels[name] || name];
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />

          {/* Zona finestra di volo */}
          <ReferenceArea
            x1={`${String(window.start).padStart(2, "0")}:00`}
            x2={`${String(window.end).padStart(2, "0")}:00`}
            fill="#10b981"
            fillOpacity={0.08}
            stroke="#10b981"
            strokeOpacity={0.3}
            strokeWidth={1}
          />

          {/* Base cumuli */}
          <Line
            type="monotone"
            dataKey="cloudBase"
            name="Base Cumuli"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={{ fill: "#38bdf8", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            connectNulls
          />

          {/* Top termico */}
          <Line
            type="monotone"
            dataKey="thermalTop"
            name="Top Termico"
            stroke="#a78bfa"
            strokeWidth={2.5}
            dot={{ fill: "#a78bfa", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            connectNulls
          />

          {/* CAPE (asse secondario) */}
          <Line
            type="monotone"
            dataKey="cape"
            name="CAPE"
            stroke="#fb923c"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="4 2"
            yAxisId="right"
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Statistiche */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider">Finestra di volo</p>
          <p className="text-emerald-400 font-black text-lg tabular-nums">
            {String(window.start).padStart(2, "0")}:00–{String(window.end).padStart(2, "0")}:00
          </p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider">Top termico max</p>
          <p className="text-violet-400 font-black text-lg tabular-nums">
            {(maxThermalTop / 1000).toFixed(1)}k
          </p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider">Base cumuli media</p>
          <p className="text-sky-400 font-black text-lg tabular-nums">
            {(avgCloudBase / 1000).toFixed(1)}k
          </p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
          <p className="text-slate-500 text-[10px] uppercase tracking-wider">CAPE medio</p>
          <p className={`font-black text-lg tabular-nums ${
            avgCape > 600 ? "text-red-400" : avgCape > 200 ? "text-amber-400" : "text-emerald-400"
          }`}>
            {Math.round(avgCape)}
          </p>
          <p className="text-slate-500 text-[10px]">J/kg</p>
        </div>
      </div>
    </div>
  );
}
