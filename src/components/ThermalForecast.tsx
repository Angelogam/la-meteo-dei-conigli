import { Flame, Cloud, ArrowUpToLine, TrendingUp } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcThermal, filterFlightHours } from "@/utils/meteo";

interface ThermalForecastProps {
  hourly: HourData[];
}

const ThermalForecast = ({ hourly }: ThermalForecastProps) => {
  const flightHours = filterFlightHours(hourly);
  const thermal = calcThermal(flightHours);

  if (!thermal) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-red-500/10 border border-white/10 p-4 md:p-6">
      <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
        <Flame className="h-4 w-4 text-orange-400" />
        <span className="font-medium">Previsione termiche</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex justify-center mb-1">
            <Cloud className="h-5 w-5 text-sky-400" />
          </div>
          <div className="text-2xl font-light text-white">
            {thermal.cloudBase} m
          </div>
          <div className="text-xs text-white/40">Base nuvole</div>
        </div>

        <div className="text-center">
          <div className="flex justify-center mb-1">
            <ArrowUpToLine className="h-5 w-5 text-amber-400" />
          </div>
          <div className="text-2xl font-light text-white">
            {thermal.thermalTop} m
          </div>
          <div className="text-xs text-white/40">Cima termica</div>
        </div>

        <div className="text-center col-span-2 md:col-span-1">
          <div className="flex justify-center mb-1">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-light text-white">
            {thermal.soarIdx}/10
          </div>
          <div className="text-xs text-white/40">Indice volo</div>
        </div>
      </div>

      {/* Indicatore indice volo */}
      <div className="mt-4">
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all"
            style={{ width: `${thermal.soarIdx * 10}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/30 mt-1">
          <span>Scarso</span>
          <span>Ottimo</span>
        </div>
      </div>
    </div>
  );
};

export default ThermalForecast;
