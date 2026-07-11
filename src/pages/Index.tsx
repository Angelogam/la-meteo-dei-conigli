import { useState, useEffect, useCallback } from "react";
import { CloudSun, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import CurrentWeather from "@/components/CurrentWeather";
import HourlyForecast from "@/components/HourlyForecast";
import DailyForecast from "@/components/DailyForecast";
import WindProfiles from "@/components/WindProfiles";
import ThermalForecast from "@/components/ThermalForecast";
import { fetchMeteo, fetchWindProfiles, enrDaily } from "@/utils/meteo";
import type { Location, MeteoData, WindProfile } from "@/types/meteo";

type Status = "idle" | "loading" | "success" | "error";

const Index = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [meteoData, setMeteoData] = useState<MeteoData | null>(null);
  const [windProfiles, setWindProfiles] = useState<WindProfile[]>([]);

  const loadData = useCallback(async (loc: Location) => {
    setStatus("loading");
    setErrorMsg("");

    try {
      const [meteo, wind] = await Promise.all([
        fetchMeteo(loc.lat, loc.lon),
        fetchWindProfiles(loc.lat, loc.lon),
      ]);

      setMeteoData(meteo);
      setWindProfiles(wind);
      setStatus("success");
    } catch (err) {
      console.error("[Index] Errore caricamento dati:", err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Errore sconosciuto");
    }
  }, []);

  const handleSelectLocation = (loc: Location) => {
    setLocation(loc);
    loadData(loc);
  };

  // Carica posizione di default all'avvio
  useEffect(() => {
    const defaultLoc: Location = {
      name: "Pian delle Gorre",
      region: "Piemonte",
      country: "Italia",
      lat: 44.2587,
      lon: 7.7943,
    };
    setLocation(defaultLoc);
    loadData(defaultLoc);
  }, [loadData]);

  const enrichedDaily = meteoData ? enrDaily(meteoData.daily, meteoData.hourly) : [];
  const currentHour = meteoData?.hourly.find((h) => {
    const now = new Date();
    return (
      h.time.getHours() === now.getHours() &&
      h.time.getDate() === now.getDate()
    );
  }) ?? meteoData?.hourly[0] ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <CloudSun className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">DyadWeather</h1>
              <p className="text-xs text-white/40">Meteo per il volo a vela</p>
            </div>
          </div>

          <SearchBar onSelect={handleSelectLocation} />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-4 md:space-y-6">
        {/* Stato loading */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
            <p className="text-white/50 text-sm">Caricamento dati meteo...</p>
          </div>
        )}

        {/* Stato errore */}
        {status === "error" && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="p-4 rounded-full bg-red-500/10">
              <AlertCircle className="h-10 w-10 text-red-400" />
            </div>
            <p className="text-white/70 text-sm text-center max-w-md">
              Errore durante il caricamento dei dati meteo
            </p>
            <p className="text-red-400/60 text-xs font-mono">{errorMsg}</p>
            {location && (
              <button
                onClick={() => loadData(location)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm text-white/70"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Riprova
              </button>
            )}
          </div>
        )}

        {/* Dati caricati */}
        {status === "success" && meteoData && (
          <>
            <CurrentWeather
              current={currentHour}
              daily={enrichedDaily}
              lat={meteoData.lat}
              lon={meteoData.lon}
              locationName={location ? `${location.name}, ${location.region}` : undefined}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <HourlyForecast data={meteoData.hourly} />
                <DailyForecast data={enrichedDaily} />
              </div>
              <div className="space-y-4 md:space-y-6">
                <ThermalForecast hourly={meteoData.hourly} />
                <WindProfiles profiles={windProfiles} />
              </div>
            </div>
          </>
        )}

        {/* Stato idle */}
        {status === "idle" && !location && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <CloudSun className="h-16 w-16 text-white/20" />
            <p className="text-white/40 text-sm">Cerca una località per vedere le previsioni</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-4 text-center text-xs text-white/20">
          Dati forniti da Open-Meteo · Per uso personale
        </div>
      </footer>
    </div>
  );
};

export default Index;
