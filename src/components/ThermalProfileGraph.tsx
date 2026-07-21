import React, { useEffect, useState } from "react";
import { weatherService } from "@/services/weatherService";

// TIPI
type HourPoint = {
  time: string;
  temp2m: number;
  rh: number;
  cape: number;
  cloud: number;
};

type LevelPoint = {
  quota: number;
  temp: number;
};

type StabilityClass = "stabile" | "debole" | "instabile" | "forte";

type ThermalCell = {
  hourIndex: number;
  quota: number;
  stability: StabilityClass;
};

type ThermalProfile = {
  zeroTermico: number;
  lcl: number;
  topCumuli: number;
  cells: ThermalCell[];
};

// FUNZIONI METEO
function dewPoint(temp: number, rh: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temp) / (b + temp)) + Math.log(rh / 100);
  return (b * alpha) / (a - alpha);
}

function computeLCL(temp: number, dew: number): number {
  return (temp - dew) * 125;
}

function computeZeroTermico(tempSurface: number, lapseRate: number): number {
  if (lapseRate <= 0.1) return 3000;
  return (tempSurface / lapseRate) * 100;
}

function classifyStability(lapseRate: number, cape: number): StabilityClass {
  if (cape < 50 || lapseRate < 0.4) return "stabile";
  if (cape < 400 || lapseRate < 0.6) return "debole";
  if (cape < 1000 || lapseRate < 0.9) return "instabile";
  return "forte";
}

// COSTRUZIONE PROFILO TERMICO
function buildThermalProfile(hours: HourPoint[], levels: LevelPoint[]): ThermalProfile {
  if (!hours.length || !levels.length) {
    return { zeroTermico: 3000, lcl: 1500, topCumuli: 2500, cells: [] };
  }

  const tempSurface = hours[0].temp2m;
  const dewSurface = dewPoint(tempSurface, hours[0].rh);

  const level1500 = levels.reduce((closest, l) =>
    Math.abs(l.quota - 1500) < Math.abs(closest.quota - 1500) ? l : closest
  , levels[0]);

  const lapseRate = (tempSurface - level1500.temp) / (1500 / 100);

  const zeroTermico = computeZeroTermico(tempSurface, lapseRate);
  const lcl = computeLCL(tempSurface, dewSurface);
  const topCumuli = Math.min(zeroTermico + 500, 3000);

  const cells: ThermalCell[] = [];

  hours.forEach((h, hi) => {
    levels.forEach((lev) => {
      const stability = classifyStability(lapseRate, h.cape);
      cells.push({ hourIndex: hi, quota: lev.quota, stability });
    });
  });

  return { zeroTermico, lcl, topCumuli, cells };
}

// COMPONENTE GRAFICO
const ThermalProfileGraph: React.FC = () => {
  const [profile, setProfile] = useState<ThermalProfile | null>(null);
  const [hours, setHours] = useState<HourPoint[]>([]);
  const [levels, setLevels] = useState<LevelPoint[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const meteo = await weatherService.fetchWeather(44.2587, 7.7943);

        const hourData: HourPoint[] = meteo.hourly.map((h: any) => ({
          time: h.time,
          temp2m: h.temperature ?? 0,
          rh: h.humidity ?? 50,
          cape: h.cape ?? 0,
          cloud: h.cloudCover ?? 0,
        }));

        const levelData: LevelPoint[] = [
          { quota: 1000, temp: meteo.hourly[0]?.temp80m ?? (meteo.hourly[0]?.temperature ?? 15) - 3 },
          { quota: 1500, temp: (meteo.hourly[0]?.temperature ?? 15) - 5 },
          { quota: 2000, temp: (meteo.hourly[0]?.temperature ?? 15) - 8 },
          { quota: 2500, temp: (meteo.hourly[0]?.temperature ?? 15) - 11 },
          { quota: 3000, temp: (meteo.hourly[0]?.temperature ?? 15) - 14 },
        ];

        setHours(hourData);
        setLevels(levelData);
        setProfile(buildThermalProfile(hourData, levelData));
      } catch (err) {
        console.error("[ThermalProfileGraph] Errore caricamento dati:", err);
      }
    };

    load();
  }, []);

  if (!profile) return <div className="text-gray-400">⏳ Caricamento profilo termico...</div>;

  const getColor = (st: StabilityClass) => {
    switch (st) {
      case "stabile": return "bg-blue-900/70";
      case "debole": return "bg-green-700/70";
      case "instabile": return "bg-yellow-600/70";
      case "forte": return "bg-red-700/80";
    }
  };

  const hourLabels = hours.map(h =>
    new Date(h.time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
  );

  const quotas = levels.map(l => l.quota);

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl bg-gradient-to-b from-[#0f172a] to-[#1e293b] border border-[#22c55e]/40 shadow-lg">
      
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          🌡️ Grafico termico tipo Windgram / Blipmap
        </h3>
        <div className="text-sm text-gray-300 text-right">
          Zero termico: <span className="text-[#22c55e] font-semibold">{Math.round(profile.zeroTermico)} m</span><br />
          Base cumuli (LCL): <span className="font-semibold">{Math.round(profile.lcl)} m</span><br />
          Top cumuli: <span className="font-semibold">{Math.round(profile.topCumuli)} m</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${hours.length}, 1fr)` }}>
          <div></div>
          {hourLabels.map((hl, i) => (
            <div key={i} className="text-xs text-gray-300 text-center">{hl}</div>
          ))}

          {quotas.map((q, qi) => (
            <React.Fragment key={q}>
              <div className="text-xs text-gray-300 pr-2 text-right">{q} m</div>
              {hours.map((_, hi) => {
                const cell = profile.cells.find(c => c.quota === q && c.hourIndex === hi);
                return (
                  <div key={`${q}-${hi}`} className={`h-6 border border-[#0f172a] ${cell ? getColor(cell.stability) : "bg-slate-800"}`}></div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400 flex flex-wrap gap-3 justify-center">
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-900/70 rounded-sm"></span> aria stabile</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-700/70 rounded-sm"></span> debolmente instabile</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-600/70 rounded-sm"></span> instabile</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-700/80 rounded-sm"></span> molto instabile</div>
      </div>
    </div>
  );
};

export default ThermalProfileGraph;