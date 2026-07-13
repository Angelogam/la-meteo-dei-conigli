"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Wind, Thermometer, RefreshCw, Droplets, ChevronDown, ChevronUp, Clock, CloudSun } from "lucide-react";
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

      const pressioneAQuota = (hpa: number): number => Math.round(44330 * (1 - Math.pow(hpa / 1013.25, 0.1903)));

      const hours: HourData[] = raw.hourly.time
        .map((t: string, i: number) => {
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
          "bg-slate-800 " +
          "border-r-2 border-green-500/40 shadow-2xl " +
          "transition-all duration-350 ease-out " +
          "overflow-y-auto " +
          (isOpen ? "translate-x-0" : "-translate-x-full ") +
          "md:translate-x-0 md:relative md:z-auto md:h-auto md:max-h-[calc(100vh-8rem)] md:w-72 md:rounded-2xl md:border-2 md:border-green-500/40 md:mr-4 md:shadow-xl md:shadow-green-500/10 md:sticky md:top-4"
        }
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-800 border-b-2 border-green-500/30 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-700 border border-green-500/40 flex items-center justify-center">
              <span className="text-base">🪂</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-green-300 tracking-tight">
                Decolli
              </h2>
              <p className="text-[10px] text-blue-300/80 font-medium flex items-center gap-1">
                {DECOLLI.length} siti &middot; {String(now.getHours()).padStart(2, "0")}:{String(now.getMinutes()).padStart(2, "0")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 transition-colors md:hidden"
            aria-label="Chiudi sidebar"
          >
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        {/* Lista decolli compatta */}
        <div className="p-2 space-y-1.5">
          {DECOLLI.map((site) => {
            const w = weatherMap[site.id];
            const isSelected = site.id === selected;
            const volo = getVoloStatus(w);
            const isExpanded = expandedSites[site.id];
            const hourlyData = siteHourlyData[site.id];
            const hourlyLoading = loadingHourly[site.id];

            return (
              <div key={site.id}>
                <button
                  onClick={() => {
                    onSelect(site.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={
                    "w-full text-left rounded-lg px-3 py-2 transition-all duration-200 border " +
                    (isSelected
                      ? "bg-slate-700 border-green-400 shadow-md"
                      : "bg-slate-800/60 border-slate-700 hover:bg-slate-700 hover:border-green-400/50")
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className={"text-xs font-bold truncate " + (isSelected ? "text-green-100" : "text-green-200")}>
                          {site.name}
                        </span>
                        {w && (
                          <span className={"px-1.5 py-0.5 rounded-md text-[9px] font-bold border " + volo.color}>
                            {volo.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span>{site.exposure}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-slate-500" />
                        <span>{site.altitude}m</span>
                      </div>
                    </div>
                    {w && (
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-2xl leading-none">{wic(w.weatherCode, true)}</span>
                        <span className="text-xs font-bold text-slate-100">{Math.round(w.temperature)}°</span>
                      </div>
                    )}
                  </div>
                  {w && <AlertVolo weather={w} />}
                </button>

                {/* Pulsante espandi */}
                {w && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(site.id);
                    }}
                    className="w-full flex items-center justify-between px-3 py-1 rounded-lg text-[9px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-all border border-slate-600/30 mt-0.5"
                  >
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Ore 8–19
                    </span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                )}

                {/* Pannello espanso */}
                {isExpanded && hourlyData && hourlyData.length > 0 && (
                  <div className="rounded-lg border border-slate-600/50 bg-slate-800/60 mt-0.5 overflow-hidden">
                    <GraficoTermiche hourly={generaTermicheOrarie(hourlyData, site.altitude)} oraCorrente={now.getHours()} />
                  </div>
                )}
                {isExpanded && hourlyLoading && (
                  <div className="rounded-lg border border-slate-600/50 bg-slate-800/60 mt-0.5 p-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                    Caricamento...
                  </div>
                )}
                {isExpanded && !hourlyLoading && (!hourlyData || hourlyData.length === 0) && (
                  <div className="rounded-lg border border-slate-600/50 bg-slate-800/60 mt-0.5 p-2 text-center text-[10px] text-slate-400">
                    Nessuna previsione
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