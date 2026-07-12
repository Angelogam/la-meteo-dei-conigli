"use client";

import { useState, useEffect, useCallback } from "react";
import { Thermometer, Wind, CloudSun, Gauge, MapPin, Sun, Navigation, AlertTriangle, Info, ChevronDown, ArrowUp, CloudRain } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ErrorScreen } from "@/components/ErrorScreen";
import { WeatherIcon } from "@/components/WeatherIcon";
import { DECOLLI } from "@/data/decolli";
import { fetchMeteo, fetchWindProfiles, filterFlightHours, enrDaily, calcThermal, wd, wic } from "@/utils/meteo";
import type { MeteoData, ThermalData, WindProfile, HourData } from "@/types/meteo";

export default function Index() {
  const [selectedDecollo, setSelectedDecollo] = useState(DECOLLI[0]);
  const [meteoData, setMeteoData] = useState<MeteoData | null>(null);
  const [windProfiles, setWindProfiles] = useState<WindProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDecolloList, setShowDecolloList] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const loadMeteo = useCallback(async (decollo: typeof DECOLLI[0]) => {
    setLoading(true);
    setError(null);
    try {
      const [meteo, profiles] = await Promise.all([
        fetchMeteo(decollo.lat, decollo.lon),
        fetchWindProfiles(decollo.lat, decollo.lon),
      ]);
      setMeteoData(meteo);
      setWindProfiles(profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore sconosciuto");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeteo(selectedDecollo);
  }, [selectedDecollo, loadMeteo]);

  const handleDecolloChange = (decollo: typeof DECOLLI[0]) => {
    setSelectedDecollo(decollo);
    setShowDecolloList(false);
    setSelectedDayIndex(null);
  };

  const flightHours = meteoData ? filterFlightHours(meteoData.hourly) : [];
  const enrichedDaily = meteoData ? enrDaily(meteoData.daily, meteoData.hourly) : [];

  const thermal: ThermalData | null = flightHours.length > 0 ? calcThermal(flightHours, selectedDecollo.altitude) : null;

  const todayHours = flightHours.filter((h) => {
    const today = new Date();
    return h.time.getDate() === today.getDate() && h.time.getMonth() === today.getMonth();
  });

  const dayLabels = ["Oggi", "Domani", "Tra 2 giorni", "Tra 3 giorni", "Tra 4 giorni", "Tra 5 giorni", "Tra 6 giorni"];

  const getDayHours = (dayIndex: number): HourData[] => {
    if (!meteoData) return [];
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayIndex);
    return flightHours.filter((h) => {
      return h.time.getDate() === targetDate.getDate() && h.time.getMonth() === targetDate.getMonth();
    });
  };

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen message={error} onRetry={() => loadMeteo(selectedDecollo)} />;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-3 md:px-6 pb-8">
        {/* Decollo Selector */}
        <div className="relative mb-5">
          <button
            onClick={() => setShowDecolloList(!showDecolloList)}
            className="w-full flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-gradient-to-r from-[#1a2332] to-[#0f1923] border border-white/10 hover:border-green-500/40 transition-all"
          >
            <div className="flex items-center gap-3">
              <MapPin className="text-green-400 shrink-0" size={18} />
              <div className="text-left">
                <div className="font-semibold text-sm md:text-base">{selectedDecollo.name}</div>
                <div className="text-xs text-gray-400">
                  {selectedDecollo.valley} · {selectedDecollo.altitude}m · {selectedDecollo.exposure}
                </div>
              </div>
            </div>
            <ChevronDown className={`text-gray-400 transition-transform ${showDecolloList ? "rotate-180" : ""}`} size={18} />
          </button>

          {showDecolloList && (
            <div className="absolute z-20 mt-2 w-full rounded-2xl border border-white/10 bg-[#141d2b] shadow-2xl backdrop-blur-xl max-h-80 overflow-y-auto">
              {DECOLLI.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleDecolloChange(d)}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 transition-colors ${
                    d.id === selectedDecollo.id ? "bg-green-500/10 border-l-2 border-green-400" : ""
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400">
                    {d.altitude > 1500 ? "🔺" : "⛰️"}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{d.name}</div>
                    <div className="text-xs text-gray-400">{d.valley} · {d.altitude}m</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1923] border border-white/5">
            <div className="flex items-center gap-2 mb-1.5">
              <Thermometer size={14} className="text-orange-400" />
              <span className="text-xs text-gray-400">Temp.</span>
            </div>
            <div className="text-lg font-bold">{todayHours.length > 0 ? `${Math.round(todayHours[0].temperature)}°` : "--"}</div>
            <div className="text-xs text-gray-400">Max {enrichedDaily.length > 0 ? `${Math.round(enrichedDaily[0].tempMax)}°` : "--"}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1923] border border-white/5">
            <div className="flex items-center gap-2 mb-1.5">
              <Wind size={14} className="text-cyan-400" />
              <span className="text-xs text-gray-400">Vento</span>
            </div>
            <div className="text-lg font-bold">{todayHours.length > 0 ? `${Math.round(todayHours[0].windSpeed)} km/h` : "--"}</div>
            <div className="text-xs text-gray-400">{todayHours.length > 0 ? wd(todayHours[0].windDir) : "--"}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1923] border border-white/5">
            <div className="flex items-center gap-2 mb-1.5">
              <CloudSun size={14} className="text-yellow-400" />
              <span className="text-xs text-gray-400">Nuvole</span>
            </div>
            <div className="text-lg font-bold">{todayHours.length > 0 ? `${todayHours[0].cloudCover}%` : "--"}</div>
            <div className="text-xs text-gray-400">{todayHours.length > 0 && todayHours[0].cloudCover < 30 ? "Poco nuvoloso" : todayHours[0].cloudCover < 60 ? "Parzialmente" : "Molto nuvoloso"}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1923] border border-white/5">
            <div className="flex items-center gap-2 mb-1.5">
              <Gauge size={14} className="text-purple-400" />
              <span className="text-xs text-gray-400">QNH</span>
            </div>
            <div className="text-lg font-bold">{todayHours.length > 0 && todayHours[0].pressure ? `${Math.round(todayHours[0].pressure)} hPa` : "--"}</div>
            <div className="text-xs text-gray-400">{todayHours.length > 0 && todayHours[0].pressure && todayHours[0].pressure > 1013 ? "Alta pressione" : "Bassa pressione"}</div>
          </div>
        </div>

        {/* Day Tabs - Solo decorativi */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold mb-3 text-gray-300">Giorni</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {enrichedDaily.slice(0, 7).map((day, i) => (
              <div
                key={i}
                className="flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border bg-[#1a2332] border-white/10 text-gray-400"
              >
                <div>{dayLabels[i]}</div>
                <div className="mt-1 flex items-center gap-1 justify-center">
                  <WeatherIcon code={day.weatherCode} size={16} />
                  <span>{Math.round(day.tempMax)}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Day Detail Section - solo se selectedDayIndex non è null */}
        {selectedDayIndex !== null && (() => {
          const dayData = getDayHours(selectedDayIndex);
          const daily = enrichedDaily[selectedDayIndex];
          const dayThermal = dayData.length > 0 ? calcThermal(dayData, selectedDecollo.altitude) : null;
          if (!dayData.length || !daily) return null;

          return (
            <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1923] border border-green-500/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-green-300">
                  Dettaglio — {dayLabels[selectedDayIndex]}
                </h3>
                <button
                  onClick={() => setSelectedDayIndex(null)}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Chiudi
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">{Math.round(daily.tempMax)}°</div>
                  <div className="text-[10px] text-slate-400">Max / {Math.round(daily.tempMin)}° Min</div>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                  <Wind className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">
                    {daily.avgWind !== undefined ? Math.round(daily.avgWind) : "--"} km/h
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Media {(daily.maxWind !== undefined ? Math.round(daily.maxWind) : "--")} max
                  </div>
                </div>
                {daily.precipitationSum > 0 && (
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <CloudRain className="w-4 h-4 text-blue-300 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{daily.precipitationSum} mm</div>
                    <div className="text-[10px] text-slate-400">Pioggia</div>
                  </div>
                )}
                {dayThermal && (
                  <div className="bg-slate-700/50 rounded-xl p-3 text-center">
                    <ArrowUp className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <div className="text-lg font-bold text-white">{dayThermal.cloudBase} m</div>
                    <div className="text-[10px] text-slate-400">Base nuvole</div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Previsioni orarie</h4>
                {dayData.map((h) => (
                  <div
                    key={h.time.getHours()}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-slate-700/30 border border-slate-600/50 text-left"
                  >
                    <div className="w-12 shrink-0 text-center">
                      <span className="text-xs font-bold text-white">
                        {h.time.getHours().toString().padStart(2, "0")}:00
                      </span>
                    </div>
                    <span className="text-lg shrink-0">{wic(h.weatherCode, true)}</span>
                    <div className="flex-1 grid grid-cols-3 gap-2 text-[11px] text-slate-300">
                      <span>{Math.round(h.temperature)}°C</span>
                      <span>{Math.round(h.windSpeed)} km/h</span>
                      <span>{h.humidity}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Termiche */}
        {thermal && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Sun size={16} className="text-green-400" />
              <h3 className="font-semibold text-sm">Previsione termiche</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-0.5">Base nuvole</div>
                <div className="text-lg font-bold text-green-400">{thermal.cloudBase}m</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-0.5">Cima termica</div>
                <div className="text-lg font-bold text-yellow-400">{thermal.thermalTop}m</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-0.5">Indice volo</div>
                <div className="text-lg font-bold text-cyan-400">{thermal.soarIdx}/10</div>
              </div>
            </div>
          </div>
        )}

        {/* Previsioni orarie */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold mb-3 text-gray-300">Previsioni orarie (volo)</h3>
          <div className="overflow-x-auto -mx-3 px-3">
            <div className="flex gap-2.5 pb-1" style={{ minWidth: "max-content" }}>
              {todayHours.slice(0, 10).map((h, i) => (
                <div key={i} className="flex-shrink-0 w-20 p-3 rounded-2xl bg-gradient-to-b from-[#1a2332] to-[#0f1923] border border-white/5 text-center">
                  <div className="text-xs text-gray-400 mb-1">{h.time.getHours().toString().padStart(2, "0")}:00</div>
                  <div className="mb-1.5"><WeatherIcon code={h.weatherCode} size={22} /></div>
                  <div className="text-sm font-bold">{Math.round(h.temperature)}°</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Wind size={10} className="text-cyan-400" />
                    <span className="text-xs text-gray-400">{Math.round(h.windSpeed)}</span>
                  </div>
                  <div className="text-xs text-gray-500">{wd(h.windDir)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vento in quota */}
        {windProfiles.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold mb-3 text-gray-300">Vento in quota</h3>
            <div className="overflow-x-auto -mx-3 px-3">
              <div className="flex gap-2.5 pb-1" style={{ minWidth: "max-content" }}>
                {windProfiles.slice(0, 8).map((profile, i) => {
                  const surfaceLevel = profile.levels[0];
                  return (
                    <div key={i} className="flex-shrink-0 w-20 p-3 rounded-2xl bg-gradient-to-b from-[#1a2332] to-[#0f1923] border border-white/5 text-center">
                      <div className="text-xs text-gray-400 mb-1">{profile.time.getHours().toString().padStart(2, "0")}:00</div>
                      <div className="text-xs font-medium text-cyan-400">{surfaceLevel.speed ? `${Math.round(surfaceLevel.speed)} km/h` : "--"}</div>
                      <div className="text-xs text-gray-500">{surfaceLevel.dir ? wd(surfaceLevel.dir) : "--"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Dati del decollo */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1a2332] to-[#0f1923] border border-white/5">
          <h3 className="text-sm font-semibold mb-2 text-gray-300">Dati decollo</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 text-gray-400">
              <MapPin size={12} className="text-gray-500" />
              <span>Quota: <span className="text-white">{selectedDecollo.altitude}m</span></span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Navigation size={12} className="text-gray-500" />
              <span>Esposizione: <span className="text-white">{selectedDecollo.exposure}</span></span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Info size={12} className="text-gray-500" />
              <span>Valle: <span className="text-white">{selectedDecollo.valley}</span></span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <AlertTriangle size={12} className="text-gray-500" />
              <span>Difficoltà: <span className="text-white">{selectedDecollo.difficulty}/3</span></span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}