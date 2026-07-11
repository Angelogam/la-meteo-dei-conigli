import { useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { wic, wd } from "@/utils/meteo";

interface HourlyForecastProps {
  data: HourData[];
}

const HourlyForecast = ({ data }: HourlyForecastProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filtra ore dalle 6 alle 23
  const dayHours = data.filter((h) => {
    const hour = h.time.getHours();
    return hour >= 6 && hour <= 23;
  });

  if (!dayHours.length) return null;

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
      <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
        <Clock className="h-4 w-4" />
        <span className="font-medium">Previsioni orarie</span>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {dayHours.map((h, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 min-w-[72px] py-3 px-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="text-xs text-white/50">
              {h.time.getHours()}:00
            </span>
            <span className="text-2xl">{wic(h.weatherCode)}</span>
            <span className="text-sm font-medium text-white">
              {Math.round(h.temperature)}°
            </span>
            <div className="flex flex-col items-center text-[10px] text-white/40">
              <span>{wd(h.windDir)}</span>
              <span>{Math.round(h.windSpeed)}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400/60 transition-all"
                style={{ width: `${h.cloudCover}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HourlyForecast;
