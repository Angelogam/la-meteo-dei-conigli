"use client";

import React, { useEffect, useState } from "react";
import { useMeteo } from "@/utils/useMeteo";
import VentoProfilo from "@/components/VentoProfilo";
import { Sunrise, Sunset, Cloud, Umbrella, Thermometer, Gauge, Wind, Eye } from "lucide-react";

interface DettaglioGiornoContentProps {
  lat: number;
  lon: number;
  quotaDecollo: number;
  selectedDay: number;
  siteName?: string;
}

export default function DettaglioGiornoContent({ lat, lon, quotaDecollo, selectedDay, siteName }: DettaglioGiornoContentProps) {
  const { meteo, loading, error, dayNames } = useMeteo(lat, lon, quotaDecollo, selectedDay);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin mr-3" />
        <span>Caricamento meteo per {siteName || "decollo"}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Cloud className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Errore meteo per {siteName || "decollo"}</p>
        <p className="text-sm text-slate-500 mt-1">{error}</p>
      </div>
    );
  }

  if (!meteo) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Cloud className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato meteo disponibile per {siteName || "decollo"}</p>
      </div>
    );
  }

  const oggi = new Date();
  const targetDate = new Date(oggi);
  targetDate.setDate(oggi.getDate() + selectedDay);

  const dayMonth = targetDate.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  const shortDate = targetDate.toLocaleDateString("it-IT", { day: "numeric", month: "numeric", year: "numeric" });
  const dayOfWeek = dayNames[targetDate.getDay()];
  const dayLabel = dayOfWeek;

  // Build profile data for the VentoProfilo component
  const profileData = {
    giorno: dayLabel,
    data: dayMonth,
    decollo: siteName || "Decollo",
    raffica: meteo.wind_gusts_10m_max,
    profilo: meteo.profiloVento.map((p) => ({
      quota: p.quota,
      vento: p.vento,
      direzione: p.direzione,
    })),
  };

  return (
    <div className="space-y-4">
      {/* Main wind / conditions card */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Wind className="w-5 h-5 text-cyan-400 shrink-0" />
          <h3 className="text-base font-bold text-cyan-300">
            {siteName || "Decollo"} — Vento e condizioni &middot; {dayLabel} {shortDate}
          </h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/60 rounded-lg p-3 flex items-center gap-3">
            <Wind className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Vento 10m</div>
              <div className="text-sm font-bold text-white">{meteo.wind_speed_10m_max} km/h</div>
              <div className="text-xs text-slate-500">Raffica: {meteo.wind_gusts_10m_max} km/h</div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-3 flex items-center gap-3">
            <Thermometer className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Temperatura</div>
              <div className="text-sm font-bold text-white">{Math.round(meteo.temperature_2m_max)}°C</div>
              <div className="text-xs text-slate-500">Min: {Math.round(meteo.temperature_2m_min)}°C</div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-3 flex items-center gap-3">
            <Umbrella className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Precipitazioni</div>
              <div className="text-sm font-bold text-white">{meteo.precipitation_sum} mm</div>
              <div className="text-xs text-slate-500">Prob.: {meteo.precipitation_probability_max}%</div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-3 flex items-center gap-3">
            <Cloud className="w-5 h-5 text-slate-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Copertura</div>
              <div className="text-sm font-bold text-white">{meteo.cloud_cover_max}%</div>
              <div className="text-xs text-slate-500">Media: {meteo.cloud_cover_mean}%</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div className="bg-slate-800/60 rounded-lg p-3 flex items-center gap-3">
            <Eye className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Visibilità</div>
              <div className="text-sm font-bold text-white">
                {meteo.visibility !== undefined ? `${meteo.visibility} km` : "N/D"}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-3 flex items-center gap-3">
            <Gauge className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Pressione</div>
              <div className="text-sm font-bold text-white">
                {meteo.surface_pressure !== undefined ? `${Math.round(meteo.surface_pressure)} hPa` : "N/D"}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-3 flex items-center gap-3">
            <Sunrise className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Alba</div>
              <div className="text-sm font-bold text-white">
                {meteo.sunrise || "N/D"}
              </div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-lg p-3 flex items-center gap-3">
            <Sunset className="w-5 h-5 text-orange-400 shrink-0" />
            <div>
              <div className="text-[11px] text-slate-400">Tramonto</div>
              <div className="text-sm font-bold text-white">
                {meteo.sunset || "N/D"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vertical wind profile */}
      <VentoProfilo data={profileData} />

      {/* Conditions summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        <ConditionCard
          title="Vento al suolo"
          value={`${meteo.wind_speed_10m_max} km/h`}
          color="text-cyan-400"
          icon={<Wind className="w-4 h-4" />}
        />
        <ConditionCard
          title="Raffiche"
          value={`${meteo.wind_gusts_10m_max} km/h`}
          color="text-orange-400"
          icon={<Wind className="w-4 h-4" />}
        />
        <ConditionCard
          title="Temp. percepita"
          value={meteo.apparent_temperature_max !== undefined ? `${Math.round(meteo.apparent_temperature_max)}°C` : "N/D"}
          color="text-red-400"
          icon={<Thermometer className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}

function ConditionCard({ title, value, color, icon }: { title: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3">
      <div className={`${color}`}>{icon}</div>
      <div>
        <div className="text-xs text-slate-400">{title}</div>
        <div className={`text-sm font-bold ${color}`}>{value}</div>
      </div>
    </div>
  );
}