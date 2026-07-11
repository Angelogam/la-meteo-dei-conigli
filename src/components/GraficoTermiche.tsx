"use client";

import React, { useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid,
} from "recharts";
import { Thermometer, ArrowUp, Wind, Droplets, Sun, Cloud, Info, TrendingUp } from "lucide-react";

interface TermicheData {
  base: number;
  top: number;
  forza: number;
  rateo: number;
  label: string;
  colore: string;
}

interface GraficoTermicheProps {
  hourly: { hour: number; termiche: TermicheData }[];
  oraCorrente: number;
}

const LEGENDA: { colore: string; label: string }[] = [
  { colore: "#ef4444", label: "Termiche forti (+7)" },
  { colore: "#f97316", label: "Buone termiche (5-7)" },
  { colore: "#eab308", label: "Moderate (3-5)" },
  { colore: "#84cc16", label: "Deboli (1-3)" },
  { colore: "#64748b", label: "Assenti (0)" },
];

const GraficoTermiche = ({ hourly, oraCorrente }: GraficoTermicheProps) => {
  if (!hourly || hourly.length === 0) return null;

  // Prepara dati per Recharts
  const chartData = hourly.map((h) => ({
    ora: String(h.hour).padStart(2, "0") + ":00",
    hour: h.hour,
    forza: Math.round(h.termiche.forza * 10) / 10,
    rateo: h.termiche.rateo,
    base: h.termiche.base,
    top: h.termiche.top,
    metriSalita: h.termiche.top - h.termiche.base,
    colore: h.termiche.colore,
    label: h.termiche.label,
    isCurrent: h.hour === oraCorrente,
  }));

  // Migliori ore per volo
  const migliori = useMemo(() => {
    return [...chartData]
      .filter((d) => d.forza >= 4)
      .sort((a, b) => b.forza - a.forza)
      .slice(0, 3);
  }, [chartData]);

  const maxForza = Math.max(...chartData.map((d) => d.forza), 1);

  return (
    <div className="w-full py-4 px-2 space-y-5 text-slate-200">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-800/50 border border-amber-500/50 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-amber-200">Analisi termiche completa</h3>
          <p className="text-[10px] text-slate-400">
            Forza, rateo di salita e quota per ogni ora del giorno
          </p>
        </div>
      </div>

      {/* Migliori ore */}
      {migliori.length > 0 && (
        <div className="bg-green-900/30 border border-green-500/40 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🏆</span>
            <span className="text-xs font-bold text-green-300">Migliori ore per il volo</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {migliori.map((m) => (
              <div
                key={m.hour}
                className="px-3 py-1.5 rounded-lg bg-green-800/50 border border-green-500/30 text-xs font-bold text-green-200"
              >
                {m.ora} &middot; forza {m.forza}/10 &middot; +{m.metriSalita}m
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grafico forza termiche - BarChart */}
      <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-600/40">
        <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
          <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          Forza termiche (0-10)
        </h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="ora"
              tick={{ fill: "#94a3b8", fontSize: 9 }}
              axisLine={{ stroke: "#475569" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fill: "#94a3b8", fontSize: 9 }}
              axisLine={{ stroke: "#475569" }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#e2e8f0",
              }}
              formatter={(value: number, name: string) => [
                value.toFixed(1),
                name === "forza" ? "Forza" : name,
              ]}
              labelFormatter={(label: string) => `Ora: ${label}`}
            />
            <Bar
              dataKey="forza"
              fill="#f59e0b"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              opacity={0.85}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Grafico rateo di salita - AreaChart */}
      <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-600/40">
        <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
          <ArrowUp className="w-3.5 h-3.5 text-green-400" />
          Rateo di salita (m/s)
        </h4>
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="ora" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={{ stroke: "#475569" }} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={{ stroke: "#475569" }} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#e2e8f0",
              }}
              formatter={(value: number) => [`${value.toFixed(1)} m/s`, "Rateo"]}
              labelFormatter={(label: string) => `Ora: ${label}`}
            />
            <defs>
              <linearGradient id="rateoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="rateo"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#rateoGrad)"
              dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Grafico base e top termica - LineChart combinato */}
      <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-600/40">
        <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          Quota base e cima termica (m slm)
        </h4>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="ora" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={{ stroke: "#475569" }} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={{ stroke: "#475569" }} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#e2e8f0",
              }}
              formatter={(value: number, name: string) => [
                `${value} m`,
                name === "base" ? "Base" : name === "top" ? "Cima" : name === "metriSalita" ? "Salita" : name,
              ]}
              labelFormatter={(label: string) => `Ora: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="base"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
              name="base"
            />
            <Line
              type="monotone"
              dataKey="top"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
              name="top"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-[9px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> Base
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-red-400 inline-block" /> Cima
          </span>
        </div>
      </div>

      {/* Tabella riepilogativa */}
      <div className="bg-slate-800/60 rounded-xl overflow-hidden border border-slate-600/40">
        <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-600/40">
          <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            Dettaglio orario
          </h4>
        </div>
        <div className="divide-y divide-slate-700/50">
          {chartData.map((d) => (
            <div
              key={d.hour}
              className={`flex items-center gap-2 px-3 py-2 text-[11px] transition-colors ${
                d.isCurrent ? "bg-green-900/30 border-l-2 border-green-400" : "hover:bg-slate-700/30"
              }`}
            >
              <div className="w-14 shrink-0 font-mono font-bold text-slate-300">{d.ora}</div>
              <div className="flex-1 grid grid-cols-4 gap-1">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.colore }} />
                  <span className="font-semibold text-slate-200">{d.forza.toFixed(1)}</span>
                </div>
                <div className="text-green-300 font-semibold">{d.rateo.toFixed(1)} m/s</div>
                <div className="text-amber-300 font-semibold">{d.base}m</div>
                <div className="text-red-300 font-semibold">{d.top}m</div>
              </div>
              <div className="w-12 text-right text-[9px] text-slate-500">
                +{d.metriSalita}m
              </div>
              {d.isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Legenda colori forza */}
      <div className="flex flex-wrap gap-3 text-[9px] text-slate-400">
        {LEGENDA.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.colore }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Info calcolo */}
      <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-600/30">
        <div className="flex items-center gap-1.5 mb-1">
          <Info className="w-3 h-3 text-slate-400" />
          <span className="text-[9px] font-medium text-slate-400">Fattori considerati</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[8px] text-slate-500">
          <span className="flex items-center gap-0.5">
            <Sun className="w-2 h-2 text-amber-400" /> Gradiente termico
          </span>
          <span className="flex items-center gap-0.5">
            <Wind className="w-2 h-2 text-blue-400" /> Vento
          </span>
          <span className="flex items-center gap-0.5">
            <Cloud className="w-2 h-2 text-slate-400" /> Nuvole
          </span>
          <span className="flex items-center gap-0.5">
            <Droplets className="w-2 h-2 text-blue-300" /> Umidit&agrave;
          </span>
        </div>
      </div>
    </div>
  );
};

export default GraficoTermiche;