import { CalendarDays } from "lucide-react";
import type { DailyData } from "@/types/meteo";
import { wic, wd } from "@/utils/meteo";

interface DailyForecastProps {
  data: DailyData[];
}

const DAYS_IT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

const DailyForecast = ({ data }: DailyForecastProps) => {
  if (!data.length) return null;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
      <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
        <CalendarDays className="h-4 w-4" />
        <span className="font-medium">Previsioni giornaliere</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.map((d, i) => {
          const dayName = i === 0 ? "Oggi" : DAYS_IT[d.date.getDay()];
          return (
            <div
              key={i}
              className={`rounded-xl p-4 ${
                i === 0
                  ? "bg-blue-500/20 border border-blue-400/30"
                  : "bg-white/5 border border-white/5"
              }`}
            >
              <div className="text-sm font-medium text-white/70 mb-2">{dayName}</div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{wic(d.weatherCode)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white font-medium">{Math.round(d.tempMax)}°</span>
                <span className="text-white/40">{Math.round(d.tempMin)}°</span>
              </div>
              {d.avgWind !== undefined && (
                <div className="text-xs text-white/40 mt-2">
                  Vento: {Math.round(d.avgWind)} km/h
                  {d.maxWind !== undefined && ` (max ${Math.round(d.maxWind)})`}
                </div>
              )}
              {d.precipitationSum > 0 && (
                <div className="text-xs text-blue-400 mt-1">
                  {d.precipitationSum} mm pioggia
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyForecast;
