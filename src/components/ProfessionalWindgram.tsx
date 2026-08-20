import React, { useEffect, useState, useMemo } from "react";
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
    if (speed < 0.8) return "bg-gray-500";
    if (speed < 1.2) return "bg-yellow-500";
  if (speed < 2.0) return "bg-orange-600";
  return "bg-red-600";
};

const getLabel = (speed: number) => {
  if (speed < 0.8) return "Molto debole";
  if (speed < 1.2) return "Debole";
  if (speed < 2.0) return "Moderata";
  return "Forte";
};

const HOURS_LOCAL = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 – 21:00

export default function ProfessionalWindgram({
  latitude,
  longitude,
  altitude = 1374,
  siteName = "Pian Munè",
  selectedDay = 0,
}: {
  latitude: number;
  longitude: number;
  altitude?: number;
  siteName?: string;
  selectedDay?: number;
}) {
  const [data, setData] = useState<ThermalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useMemo(() => {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + selectedDay);
    const dayHours = hourlyData.filter((h) => {
      const t = new Date(h.time);
      return t.getDate() === targetDate.getDate();
    });

    if (!dayHours.length) return [];

    return dayHours.map((h) => {
      const t = new Date(h.time);
      const hour = t.getHours();
      const termiche = calcolaTermiche(h, altitude);
      return {
        hour: `${String(hour).padStart(2, "0")}:00`,
        value: termiche.forza,
        rateo: termiche.rateo,
        label: getLabelFromRateo(termiche.rateo),
        colore: getColorFromRateo(termiche.rateo),
        base: termiche.base,
        top: termiche.top,
      };
    });
  }, [hourlyData, siteAltitude, selectedDay]);

  const maxVal = Math.max(...data.map((d) => d.value), 0.1);
  const selectedDetail = data.find((d) => d.hour === selectedHour);

  return (
    <div className="space-y-3 bg-slate-950 border border-slate-700/40 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          Intensità termica · ora locale (Europe/Rome)
        </h3>
        <span className="text-[10px] text-slate-500">m/s · indice 0-10</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {[
          { label: "Forte (3+)", color: "bg-red-500/70" },
          { label: "Buona (2-3)", color: "bg-orange-400/70" },
          { label: "Moderata (1-2)", color: "bg-yellow-400/60" },
          { label: "Debole (0.3-1)", color: "bg-green-400/60" },
          { label: "Niente", color: "bg-slate-700/40" },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
            <span className="text-slate-400">{item.label}</span>
          </span>
        ))}
      </div>

      {/* Chart */}
      <div className="flex items-end gap-1 h-44 overflow-x-auto pb-1">
        {data.map((d) => {
          const pct = maxVal > 0 ? (d.value / maxVal) * 100 : 0;
          const isSelected = d.hour === selectedHour;
          return (
            <div
              key={d.hour}
              className={`flex flex-col items-center flex-shrink-0 transition-all duration-300 ${
                isSelected ? "scale-110" : ""
              }`}
            >
              <span
                className={`text-[10px] font-bold leading-none mb-1 ${
                  isSelected ? "text-orange-300" : d.value > 0 ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {d.hour.slice(0, 2)}
              </span>

              <div className="w-full h-28 bg-slate-800/60 rounded-md relative overflow-hidden">
                <div
                  className={`absolute bottom-0 left-0 right-0 rounded-t-sm transition-all ${
                    isSelected ? "ring-1 ring-white/30" : ""
                  }`}
                  style={{
                    height: `${Math.max(pct, 2)}%`,
                    background: d.colore || "#475569",
                  }}
                />
              </div>

              <span className={`text-[10px] mt-1 font-mono ${
                isSelected ? "text-orange-300 font-bold" : d.value > 0 ? "text-slate-400" : "text-slate-600"
              }`}>
                {d.hour.slice(0, 2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dettaglio ora selezionata */}
      {selectedDetail && selectedDetail.rateo > 0 && (
        <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30 text-center">
          <div className="text-xs text-slate-400">
            Alle {selectedDetail.hour.toString().padStart(2, "0")}:00 — {selectedDetail.label}
          </div>
          <div className="text-2xl font-bold text-orange-300">
            {selectedDetail.rateo.toFixed(1)} m/s
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Base {selectedDetail.base}m · Top {selectedDetail.top}m ·
            Salita {selectedDetail.top - selectedDetail.base}m
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalWindgram;