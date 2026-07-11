import { Gauge, Droplets, Wind, Eye, Thermometer, Sunrise, Sunset, ArrowUp, MapPin } from "lucide-react";
import type { HourData, DailyData } from "@/types/meteo";
import { wic, wd, calcThermal } from "@/utils/meteo";

interface CurrentWeatherProps {
  current: HourData | null;
  daily: DailyData[];
  lat: number;
  lon: number;
  locationName?: string;
}

const CurrentWeather = ({ current, daily, lat, lon, locationName }: CurrentWeatherProps) => {
  if (!current) {
    return (
      <div className="animate-pulse rounded-2xl bg-white/5 p-8 text-center">
        <div className="h-20 w-20 mx-auto rounded-full bg-white/10" />
        <div className="h-6 w-32 mx-auto mt-4 bg-white/10 rounded" />
        <div className="h-4 w-24 mx-auto mt-2 bg-white/10 rounded" />
      </div>
    );
  }

  const today = daily[0];
  const thermal = daily.length > 0 ? calcThermal(
    daily.length > 0 ? [] : []
  ) : null;

  // Trova alba e tramonto approssimativi
  const sunriseHour = 6;
  const sunsetHour = 20;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-purple-500/10 border border-white/10 p-6 md:p-8">
      {/* Località */}
      {locationName && (
        <div className="flex items-center gap-2 text-white/60 text-sm mb-4">
          <MapPin className="h-3.5 w-3.5" />
          <span>{locationName}</span>
          <span className="text-white/30">·</span>
          <span className="text-white/30">{lat.toFixed(2)}°N, {lon.toFixed(2)}°E</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* Icona e temperatura principale */}
        <div className="flex items-center gap-4">
          <span className="text-7xl">{wic(current.weatherCode)}</span>
          <div>
            <div className="text-5xl font-light text-white">
              {Math.round(current.temperature)}°
            </div>
            <div className="text-sm text-white/50 mt-1">
              Perception {Math.round(current.feelsLike)}°
            </div>
          </div>
        </div>

        {/* Dati rapidi */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 flex-1">
          <div className="flex items-center gap-2 text-white/70">
            <Thermometer className="h-4 w-4 text-orange-400" />
            <div>
              <div className="text-xs text-white/40">Max / Min</div>
              <div className="text-sm font-medium">
                {today ? `${Math.round(today.tempMax)}° / ${Math.round(today.tempMin)}°` : "—"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/70">
            <Wind className="h-4 w-4 text-blue-400" />
            <div>
              <div className="text-xs text-white/40">Vento</div>
              <div className="text-sm font-medium">{Math.round(current.windSpeed)} km/h {wd(current.windDir)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/70">
            <Droplets className="h-4 w-4 text-sky-400" />
            <div>
              <div className="text-xs text-white/40">Umidità</div>
              <div className="text-sm font-medium">{Math.round(current.humidity)}%</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/70">
            <Gauge className="h-4 w-4 text-yellow-500" />
            <div>
              <div className="text-xs text-white/40">Pressione</div>
              <div className="text-sm font-medium">{Math.round(current.pressure)} hPa</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/70">
            <Eye className="h-4 w-4 text-teal-400" />
            <div>
              <div className="text-xs text-white/40">Nuvolosità</div>
              <div className="text-sm font-medium">{current.cloudCover}%</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/70">
            <ArrowUp className="h-4 w-4 text-amber-400" />
            <div>
              <div className="text-xs text-white/40">Raffiche</div>
              <div className="text-sm font-medium">{Math.round(current.windGust)} km/h</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sole */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/10 text-white/50 text-sm">
        <div className="flex items-center gap-1.5">
          <Sunrise className="h-4 w-4 text-amber-400" />
          <span>Alba ~{sunriseHour}:00</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sunset className="h-4 w-4 text-orange-400" />
          <span>Tramonto ~{sunsetHour}:00</span>
        </div>
      </div>
    </div>
  );
};

export default CurrentWeather;
