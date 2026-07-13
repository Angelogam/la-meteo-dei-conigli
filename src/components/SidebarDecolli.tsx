"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Wind, Thermometer, RefreshCw, Droplets, Gauge, Cloud, CloudRain, ChevronDown, ChevronUp, Clock } from "lucide-react";
import AlertVolo from "./AlertVolo";
import type { HourData } from "@/types/meteo";
import { DECOLLI } from "@/data/decolli";
import { wic } from "@/utils/meteo";
import { getVoloStatus } from "@/utils/volo";
import { generaTermicheOrarie } from "@/utils/termiche";
import GraficoTermiche from "@/components/GraficoTermiche";

interface SidebarDecolliProps {
  selected: string;
  current: HourData | null;
  onSelect: (id: string) => void;
  weatherMap: Record<string, HourData>;
  isOpen: boolean;
  onClose: () => void;
}

const SidebarDecolli = ({ selected, current, onSelect, weatherMap, isOpen, onClose }: SidebarDecolliProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [expandedSites, setExpandedSites] = useState<Record<string, boolean>>({});
  const [siteHourlyData, setSiteHourlyData] = useState<Record<string, HourData[]>>({});
  const [loadingHourly, setLoadingHourly] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const now = new Date();

  // Carica dati orari per un decollo specifico quando viene espanso
  const loadHourlyData = async (siteId: string) => {
    if (siteHourlyData[siteId] || loadingHourly[siteId]) return;
    
    setLoadingHourly(prev => ({ ...prev, [siteId]: true }));
    
    const site = DECOLLI.find(s => s.id === siteId);
    if (!site) return;

    try {
      // Campi necessari per calcolaTermiche: temperature, dewpoint, humidity, windSpeed, windDir, cloudCover, pressure, precipitation, uvIndex, soilTemp, temp80m, temp120m, windProfile
      // Usiamo 2 giorni di forecast per avere tutte le ore 8-19 del giorno corrente e domani
      const params = new URLSearchParams({
        latitude: site.lat.toString(),
        longitude: site.lon.toString(),
        hourly: [
          "temperature_2m",
          "dewpoint_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "weathercode",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m",
          "precipitation",
          "cloudcover",
          "pressure_msl",
          "uv_index",
          "soil_temperature_0_to_7cm",
          "soil_moisture_0_to_7cm",
          "temperature_80m",
          "temperature_120m",
          "wind_speed_80m",
          "wind_direction_80m",
          "wind_speed_120m",
          "wind_direction_120m",
          "wind_speed_180m",
          "wind_direction_180m",
          "wind_speed_1000hPa",
          "wind_direction_1000hPa",
          "wind_speed_975hPa",
          "wind_direction_975hPa",
          "wind_speed_950hPa",
          "wind_direction_950hPa",
          "wind_speed_925hPa",
          "wind_direction_925hPa",
          "wind_speed_900hPa",
          "wind_direction_900hPa",
          "wind_speed_850hPa",
          "wind_direction_850hPa",
          "wind_speed_800hPa",
          "wind_direction_800hPa",
          "wind_speed_700hPa",
          "wind_direction_700hPa",
          "wind_speed_600hPa",
          "wind_direction_600hPa",
          "geopotential_height_1000hPa",
          "geopotential_height_975hPa",
          "geopotential_height_950hPa",
          "geopotential_height_925hPa",
          "geopotential_height_900hPa",
          "geopotential_height_850hPa",
          "geopotential_height_800hPa",
          "geopotential_height_700hPa",
          "geopotential_height_600hPa",
          "is_day",
        ].join(","),
        timezone: "Europe/Rome",
        forecast_days: "2",
      });

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
      if (!res.ok) throw new Error(`Errore HTTP ${res.status}`);
      const raw = await res.json();

      // Funzione per calcolare quota approssimata da livello di pressione
      const pressioneAQuota = (hpa: number): number => Math.round(44330 * (1 - Math.pow(hpa / 1013.25, 0.1903)));

      const hours: HourData[] = raw.hourly.time
        .map((t: string, i: number) => {
          // Costruisce windProfile dai livelli di pressione
          const livelliPressione = [
            { livello: "1000hPa", key: "1000" },
            { livello: "975hPa", key: "975" },
            { livello: "950hPa", key: "950" },
            { livello: "925hPa", key: "925" },
            { livello: "900hPa", key: "900" },
            { livello: "850hPa", key: "850" },
            { livello: "800hPa", key: "800" },
            { livello: "700hPa", key: "700" },
            { livello: "600hPa", key: "600" },
          ] as const;

          const windProfile = livelliPressione.map(({ livello, key }) => {
            const geo = raw.hourly[`geopotential_height_${key}hPa`]?.[i];
            const heightAGL = geo != null
              ? Math.max(0, Math.round(geo - site.altitude))
              : Math.max(0, Math.round(pressioneAQuota(parseInt(key)) - site.altitude));
            return {
              height: heightAGL,
              speed: raw.hourly[`wind_speed_${key}hPa`]?.[i] ?? null,
              dir: raw.hourly[`wind_direction_${key}hPa`]?.[i] ?? null,
            };
          });

          return {
            time: new Date(t),
            temperature: raw.hourly.temperature_2m[i],
            feelsLike: raw.hourly.apparent_temperature?.[i] ?? raw.hourly.temperature_2m[i],
            humidity: raw.hourly.relative_humidity_2m[i],
            dewPoint: raw.hourly.dewpoint_2m[i],
            precipitation: raw.hourly.precipitation[i] || 0,
            weatherCode: raw.hourly.weathercode?.[i] ?? 0,
            cloudCover: raw.hourly.cloudcover[i],
            pressure: raw.hourly.pressure_msl?.[i] ?? null,
            windSpeed: raw.hourly.wind_speed_10m[i],
            windDir: raw.hourly.wind_direction_10m[i],
            windGust: raw.hourly.wind_gusts_10m?.[i] ?? null,
            soilTemp: raw.hourly.soil_temperature_0_to_7cm?.[i] ?? null,
            soilMoisture: raw.hourly.soil_moisture_0_to_7cm?.[i] ?? null,
            uvIndex: raw.hourly.uv_index?.[i] ?? null,
            isDay: raw.hourly.is_day?.[i] === 1,
            windProfile,
            wind80m: raw.hourly.wind_speed_80m?.[i] ?? null,
            windDir80m: raw.hourly.wind_direction_80m?.[i] ?? null,
            wind120m: raw.hourly.wind_speed_120m?.[i] ?? null,
            windDir120m: raw.hourly.wind_direction_120m?.[i] ?? null,
            wind180m: raw.hourly.wind_speed_180m?.[i] ?? null,
            windDir180m: raw.hourly.wind_direction_180m?.[i] ?? null,
            temp80m: raw.hourly.temperature_80m?.[i] ?? null,
            temp120m: raw.hourly.temperature_120m?.[i] ?? null,
            visibility: null,
          };
        })
        // Filtra solo le ore 8-19 del primo giorno (oggi)
        .filter((h: HourData) => {
          const hh = h.time.getHours();
          return hh >= 8 && hh <= 19;
        });

      setSiteHourlyData(prev => ({ ...prev, [siteId]: hours }));
    } catch {
      setSiteHourlyData(prev => ({ ...prev, [siteId]: [] }));
    }

    setLoadingHourly(prev => ({ ...prev, [siteId]: false }));
  };

  const toggleExpand = (siteId: string) => {
    const newExpanded = !expandedSites[siteId];
    setExpandedSites(prev => ({ ...prev, [siteId]: newExpanded }));
    if (newExpanded) {
      loadHourlyData(siteId);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden" />
      )}

      <div
        ref={sidebarRef}
        className={
          "fixed top-0 left-0 h-full w-80 max-w-[88vw] z-40 " +
          "bg-gradient-to-b from-slate-800 via-slate-800/95 to-slate-900 " +
          "border-r-2 border-green-500/40 shadow-2xl " +
          "transition-all duration-350 ease-out " +
          "overflow-y-auto " +
          (isOpen ? "translate-x-0" : "-translate-x-full ") +
          "md:translate-x-0 md:relative md:z-auto md:h-auto md:max-h-[calc(100vh-8rem)] md:w-80 md:rounded-2xl md:border-2 md:border-green-500/40 md:mr-4 md:shadow-xl md:shadow-green-500/10 md:sticky md:top-4"
        }
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-md border-b-2 border-green-500/30 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-700 border border-green-500/40 flex items-center justify-center">
              <span className="text-lg">🪂</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-green-300 tracking-tight">
                Decolli
              </h2>
              <p className="text-[11px] text-blue-300/80 font-medium flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {DECOLLI.length} siti &middot; {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-700 transition-colors md:hidden border border-slate-500"
            aria-label="Chiudi sidebar"
          >
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Lista decolli con espansione interattiva */}
        <div className="p-3 space-y-2.5">
          {DECOLLI.map((site) => {
            const w = weatherMap[site.id];
            const isSelected = site.id === selected;
            const volo = getVoloStatus(w);
            const isExpanded = expandedSites[site.id];
            const hourlyData = siteHourlyData[site.id];
            const hourlyLoading = loadingHourly[site.id];

            return (
              <div key={site.id} className="space-y-1">
                <button
                  onClick={() => {
                    onSelect(site.id);
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className={
                    "w-full text-left rounded-xl px-3 py-3 transition-all duration-200 border-2 " +
                    (isSelected
                      ? "bg-gradient-to-r from-slate-700 to-slate-600 border-green-400 shadow-lg scale-[1.02] shadow-green-500/20"
                      : "bg-slate-800/60 border-green-500/25 hover:bg-slate-700 hover:border-green-400/50 hover:scale-[1.01]")
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={"text-sm font-bold text-green-200 truncate block leading-snug " + (isSelected ? "text-green-100" : "")}>
                          {site.name}
                        </span>
                        {w && (
                          <span className={"px-2 py-0.5 rounded-md text-[11px] font-bold border-2 " + volo.color}>
                            {volo.icon} {volo.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-slate-300">
                        <span className="flex items-center gap-0.5">
                          <span className="text-slate-500">📍</span>
                          {site.exposure}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-500" />
                        <span>{site.altitude}m</span>
                        <span className="w-1 h-1 rounded-full bg-slate-500" />
                        <span className="truncate">{site.valley}</span>
                      </div>
                    </div>
                    {w && (
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                          <span className="text-[11px] text-blue-300/90 font-mono font-semibold">
                            {String(w.time.getHours()).padStart(2, "0")}:00
                          </span>
                          <span className="text-3xl leading-none drop-shadow-lg">{wic(w.weatherCode, true)}</span>
                          <span className={"text-base font-extrabold " + (isSelected ? "text-white" : "text-slate-100")}>
                            {Math.round(w.temperature)}&deg;
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">{Math.round(w.windSpeed)} km/h</span>
                        </div>
                    )}
                  </div>
                  {w && (
                    <>
                    <AlertVolo weather={w} />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 pt-2.5 border-t-2 border-green-500/20">
                      <div className="flex items-center gap-1.5 text-[12px] text-blue-200/90">
                        <Wind className="w-4 h-4 text-blue-300" />
                        <span className="font-semibold">{Math.round(w.windSpeed)} km/h</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-orange-200/90">
                        <span className="text-orange-300 text-base">&uarr;</span>
                        <span className="font-semibold">{w.windGust ? Math.round(w.windGust) : "--"} km/h</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-amber-200/90">
                        <Thermometer className="w-4 h-4 text-amber-300" />
                        <span className="font-semibold">{Math.round(w.temperature)}&deg;C</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-emerald-200/90">
                        <Droplets className="w-4 h-4 text-emerald-300" />
                        <span className="font-semibold">{w.humidity}%</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-purple-200/90">
                        <Gauge className="w-4 h-4 text-purple-300" />
                        <span className="font-semibold">{w.pressure ? Math.round(w.pressure) : "--"} hPa</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-slate-200/90">
                        <Cloud className="w-4 h-4 text-slate-300" />
                        <span className="font-semibold">{w.cloudCover}%</span>
                      </div>
                      {w.precipitation && w.precipitation > 0 && (
                        <div className="flex items-center gap-1.5 text-[12px] text-blue-200/90">
                          <CloudRain className="w-4 h-4 text-blue-300" />
                          <span className="font-semibold">{w.precipitation.toFixed(1)} mm</span>
                        </div>
                      )}
                    </div>
                    </>
                  )}
                  {!w && (
                    <div className="text-[12px] text-slate-400 mt-1.5 italic flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                      Caricamento...
                    </div>
                  )}
                </button>

                {/* Pulsante per espandere le previsioni orarie */}
                {w && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(site.id);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all border border-slate-600/30"
                  >
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      Previsioni orarie 8:00&ndash;19:00
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Pannello espanso con previsioni orarie — usa l'altitudine del decollo per le termiche */}
                {isExpanded && hourlyData && hourlyData.length > 0 && (
                  <div className="rounded-xl border border-slate-600/50 bg-slate-800/60 backdrop-blur-sm overflow-hidden">
                    <GraficoTermiche hourly={generaTermicheOrarie(hourlyData, site.altitude)} oraCorrente={now.getHours()} />
                    <div className="divide-y divide-slate-700/50">
                      {hourlyData.map((h, idx) => {
                        const hVolo = getVoloStatus(h);
                        const isCurrentHour = h.time.getHours() === now.getHours();
                        return (
                          <div
                            key={idx}
                            className={"flex items-center gap-1.5 px-3 py-1.5 text-[11px] transition-colors " + (isCurrentHour ? "bg-green-900/30 border-l-2 border-green-400" : "hover:bg-slate-700/40")}
                          >
                            <span className="w-7 font-mono font-bold text-slate-300">
                              {String(h.time.getHours()).padStart(2, "0")}:00
                            </span>
                            <span className="text-base">{wic(h.weatherCode, true)}</span>
                            <div className="flex-1 flex items-center gap-1 text-slate-300">
                              <Thermometer className="w-2.5 h-2.5 text-amber-400" />
                              <span>{Math.round(h.temperature)}&deg;</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-300">
                              <Wind className="w-2.5 h-2.5 text-blue-400" />
                              <span>{Math.round(h.windSpeed)}</span>
                            </div>
                            {h.precipitation > 0 && (
                              <span className="text-[9px] text-blue-300">{h.precipitation.toFixed(1)}mm</span>
                            )}
                            <span className={"px-1 py-0.5 rounded text-[8px] font-bold " + hVolo.color}>
                              {hVolo.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {isExpanded && hourlyLoading && (
                  <div className="rounded-xl border border-slate-600/50 bg-slate-800/60 backdrop-blur-sm p-3 text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Caricamento previsioni...
                  </div>
                )}
                {isExpanded && !hourlyLoading && (!hourlyData || hourlyData.length === 0) && (
                  <div className="rounded-xl border border-slate-600/50 bg-slate-800/60 backdrop-blur-sm p-3 text-center text-[11px] text-slate-400">
                    Nessuna previsione disponibile
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SidebarDecolli;