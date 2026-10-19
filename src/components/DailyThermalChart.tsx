"use client";

import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { calcolaTermiche } from "@/utils/termiche";
import type { HourData } from "@/types/meteo";

interface DailyThermalChartProps {
  dayData: HourData[];
  altitude: number;
  siteName: string;
  dateLabel: string;
}

interface ThermalPoint {
  ora: string;
  rateo: number | null;
  baseM: number | null;
  topM: number | null;
  ventoKmh: number | null;
}

export default function DailyThermalChart({
  dayData,
  altitude,
  siteName,
  dateLabel,
}: DailyThermalChartProps) {
  const data = useMemo<ThermalPoint[]>(() => {
    return dayData
      .map((hour) => {
        const date = new Date(hour.time);
        const clockHour = date.getHours();
        if (clockHour < 8 || clockHour > 19) return null;

        // Quote e ratei sono stime empiriche dell'app basate sui campi orari:
        // restano null quando temperatura o punto di rugiada sono assenti.
        const thermal = calcolaTermiche(hour, altitude);
        return {
          ora: `${String(clockHour).padStart(2, "0")}:00`,
          rateo: thermal?.rateo ?? null,
          baseM: thermal?.base ?? null,
          topM: thermal?.top ?? null,
          ventoKmh: typeof hour.windSpeed === "number" ? hour.windSpeed : null,
        };
      })
      .filter((point): point is ThermalPoint => point !== null)
      .sort((a, b) => a.ora.localeCompare(b.ora));
  }, [dayData, altitude]);

  const hasThermalData = data.some((point) => point.rateo !== null);
  const hasAltitudeData = data.some((point) => point.baseM !== null || point.topM !== null);

  return (
    <Card className="alpium-thermal-card">
      <CardHeader className="alpium-thermal-header">
        <div className="flex items-start gap-3">
          <span className="alpium-thermal-icon" aria-hidden="true">
            <Activity className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="alpium-section-kicker">EVOLUZIONE DURANTE LA GIORNATA</p>
            <CardTitle className="alpium-thermal-title">
              Termiche previste · {siteName}
            </CardTitle>
            <CardDescription className="alpium-thermal-description">
              {dateLabel} · andamento orario indicativo
            </CardDescription>
          </div>
        </div>
        <div className="alpium-chart-legend" aria-label="Legenda del grafico">
          <span><i className="legend-rate" /> Rateo stimato (m/s)</span>
          <span><i className="legend-top" /> Quota massima stimata (m)</span>
          <span><i className="legend-base" /> Base stimata (m)</span>
        </div>
      </CardHeader>

      <CardContent className="alpium-thermal-content">
        {hasThermalData ? (
          <>
            <div className="alpium-thermal-chart" role="img" aria-label="Grafico orario del rateo e delle quote termiche stimate">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 2, left: -14 }}>
                  <defs>
                    <linearGradient id="alpiumThermalTopFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#bd9858" stopOpacity={0.23} />
                      <stop offset="100%" stopColor="#bd9858" stopOpacity={0.015} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#d6d9cf" strokeDasharray="3 5" vertical={false} />
                  <XAxis
                    dataKey="ora"
                    tick={{ fill: "#768176", fontSize: 11 }}
                    axisLine={{ stroke: "#cbd0c5" }}
                    tickLine={false}
                    minTickGap={14}
                  />
                  <YAxis
                    yAxisId="rateo"
                    domain={[0, 4.5]}
                    ticks={[0, 1, 2, 3, 4]}
                    tick={{ fill: "#768176", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <YAxis
                    yAxisId="quota"
                    orientation="right"
                    domain={["auto", "auto"]}
                    tick={{ fill: "#768176", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                    tickFormatter={(value: number) => `${Math.round(value)}m`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#f7f6ef",
                      border: "1px solid #cbd0c5",
                      borderRadius: 12,
                      boxShadow: "0 8px 22px rgba(43, 58, 44, .10)",
                      color: "#2d4033",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#536454", fontWeight: 700, marginBottom: 4 }}
                    formatter={(value, name) => {
                      if (value == null || value === "") return ["Dato non disponibile", String(name)];
                      const number = Number(value);
                      const label = String(name);
                      if (label.includes("Rateo")) return [`${number.toFixed(1)} m/s`, label];
                      return [`${Math.round(number).toLocaleString("it-IT")} m`, label];
                    }}
                  />
                  {hasAltitudeData && (
                    <Area
                      yAxisId="quota"
                      type="monotone"
                      dataKey="topM"
                      name="Quota massima stimata"
                      stroke="#b58b48"
                      strokeWidth={2.3}
                      fill="url(#alpiumThermalTopFill)"
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  )}
                  {hasAltitudeData && (
                    <Line
                      yAxisId="quota"
                      type="monotone"
                      dataKey="baseM"
                      name="Base stimata"
                      stroke="#829985"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={{ r: 4, fill: "#829985", stroke: "#f7f6ef", strokeWidth: 2 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  )}
                  <Line
                    yAxisId="rateo"
                    type="monotone"
                    dataKey="rateo"
                    name="Rateo stimato"
                    stroke="#c77f41"
                    strokeWidth={2.7}
                    dot={{ r: 2.5, fill: "#c77f41", stroke: "#f7f6ef", strokeWidth: 1.5 }}
                    activeDot={{ r: 5, fill: "#c77f41", stroke: "#f7f6ef", strokeWidth: 2 }}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="alpium-chart-note">
              <Info className="h-4 w-4 shrink-0" />
              Ratei e quote sono stime empiriche derivate dai dati orari disponibili, non misure né garanzie di ascendenza. Le curve si interrompono quando mancano i dati fondamentali.
            </p>
          </>
        ) : (
          <div className="alpium-chart-empty">
            <Info className="h-5 w-5" />
            <span>Non ci sono dati sufficienti di temperatura e punto di rugiada per stimare le termiche in questo intervallo.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
