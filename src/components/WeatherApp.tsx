"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import UpdateTimer from "./UpdateTimer";
import HourlyTable from "./HourlyTable";
import DailyCard from "./DailyCard";
import TermicheTab from "./TermicheTab";
import { fetchHourlyData, fetchAllWeatherData } from "@/services/openMeteoService";
import type { HourData, DailyData } from "@/types/meteo";
import { toast } from "sonner";

interface Site {
  id: number;
  name: string;
  lat: number;
  lon: number;
  alt: number;
}

export default function WeatherApp() {
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [hourlyData, setHourlyData] = useState<HourData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"meteo" | "termiche">("meteo");

  const sites: Site[] = [
    { id: 1, name: "Fano", lat: 43.84, lon: 13.02, alt: 50 },
    { id: 2, name: "Rieti", lat: 42.40, lon: 12.86, alt: 400 },
    { id: 3, name: "Terni", lat: 42.57, lon: 12.64, alt: 300 },
  ];

  const loadData = useCallback(async (site: Site, isUpdate = false) => {
    try {
      if (isUpdate) setUpdating(true);
      else setLoading(true);

      const [hourly, daily] = await Promise.all([
        fetchHourlyData(site.lat, site.lon, site.alt),
        fetchAllWeatherData(site.lat, site.lon),
      ]);

      setHourlyData(hourly);
      setDailyData(daily);
      setLastUpdate(new Date());
      toast.success("Dati meteorologici aggiornati");
    } catch (err) {
      console.error("Errore caricamento dati:", err);
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSite) loadData(selectedSite);
  }, [selectedSite, loadData]);

  const filteredSites = sites.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Meteo Volo
        </h1>
        <p className="text-slate-400 text-sm">
          Previsioni per il volo in vela
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cerca sito..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {filteredSites.map((site) => (
          <button
            key={site.id}
            onClick={() => setSelectedSite(site)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              selectedSite?.id === site.id
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            {site.name}
          </button>
        ))}
        {filteredSites.length === 0 && (
          <p className="text-slate-500 text-sm">Nessun sito trovato</p>
        )}
      </div>

      {!selectedSite && (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center">
          <p className="text-slate-400 text-lg">Seleziona un sito per vedere le previsioni</p>
        </div>
      )}

      {selectedSite && (
        <>
          <div className="mb-4">
            <UpdateTimer
              lastUpdate={lastUpdate}
              updating={updating}
              onRefresh={() => loadData(selectedSite, true)}
            />
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setView("meteo")}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                view === "meteo"
                  ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              Meteo
            </button>
            <button
              onClick={() => setView("termiche")}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                view === "termiche"
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              Termiche
            </button>
          </div>

          {loading && (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-slate-400">Caricamento dati...</p>
            </div>
          )}

          {!loading && view === "meteo" && (
            <div className="space-y-4">
              <DailyCard dailyData={dailyData} />
              <HourlyTable dayData={hourlyData} site={selectedSite} />
            </div>
          )}

          {!loading && view === "termiche" && (
            <TermicheTab
              currentData={hourlyData[0] ?? null}
              dayData={hourlyData}
              site={selectedSite}
            />
          )}
        </>
      )}
    </div>
  );
}