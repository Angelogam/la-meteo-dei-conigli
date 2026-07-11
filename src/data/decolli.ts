import type { HourData } from "@/types/meteo";

export interface Decollo {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitude: number;
  valley: string;
  exposure: string;
  difficulty: number;
}

export const DECOLLI: Decollo[] = [
  {
    id: "monte-maddalena",
    name: "Monte Maddalena",
    lat: 45.55,
    lon: 10.25,
    altitude: 874,
    valley: "Valtrompia",
    exposure: "S",
    difficulty: 2,
  },
  {
    id: "monte-guglielmo",
    name: "Monte Guglielmo",
    lat: 45.75,
    lon: 10.15,
    altitude: 1949,
    valley: "Valle Trompia",
    exposure: "S",
    difficulty: 4,
  },
  {
    id: "dosso-alto",
    name: "Dosso Alto",
    lat: 45.62,
    lon: 10.45,
    altitude: 1420,
    valley: "Val Sabbia",
    exposure: "SE",
    difficulty: 3,
  },
  {
    id: "monte-costa",
    name: "Monte Costa",
    lat: 45.58,
    lon: 10.35,
    altitude: 1150,
    valley: "Valle del Chiese",
    exposure: "S",
    difficulty: 2,
  },
  {
    id: "cima-schilpario",
    name: "Cima di Schilpario",
    lat: 46.02,
    lon: 10.12,
    altitude: 2030,
    valley: "Valle di Scalve",
    exposure: "SW",
    difficulty: 4,
  },
  {
    id: "monte-dosso",
    name: "Monte Dosso",
    lat: 45.65,
    lon: 10.30,
    altitude: 1270,
    valley: "Val Trompia",
    exposure: "S",
    difficulty: 3,
  },
  {
    id: "pizzo-diego",
    name: "Pizzo Diego",
    lat: 45.70,
    lon: 10.20,
    altitude: 1590,
    valley: "Valle Trompia",
    exposure: "SE",
    difficulty: 3,
  },
  {
    id: "monte-uff",
    name: "Monte Uff",
    lat: 45.72,
    lon: 10.08,
    altitude: 1750,
    valley: "Valle Camonica",
    exposure: "S",
    difficulty: 3,
  },
  {
    id: "monte-altissimo",
    name: "Monte Altissimo",
    lat: 45.80,
    lon: 10.22,
    altitude: 1705,
    valley: "Valle Camonica",
    exposure: "SE",
    difficulty: 3,
  },
  {
    id: "caregno-pizzo",
    name: "Caregno - Pizzo",
    lat: 45.63,
    lon: 10.38,
    altitude: 1480,
    valley: "Val Sabbia",
    exposure: "S",
    difficulty: 2,
  },
  {
    id: "monte-muffetto",
    name: "Monte Muffetto",
    lat: 45.68,
    lon: 10.15,
    altitude: 1350,
    valley: "Valtrompia",
    exposure: "SW",
    difficulty: 3,
  },
  {
    id: "corno-bue",
    name: "Corno del Bue",
    lat: 45.66,
    lon: 10.28,
    altitude: 1190,
    valley: "Valle del Chiese",
    exposure: "S",
    difficulty: 2,
  },
  {
    id: "monte-palar",
    name: "Monte Palar",
    lat: 45.78,
    lon: 10.18,
    altitude: 1610,
    valley: "Valle Trompia",
    exposure: "SE",
    difficulty: 3,
  },
  {
    id: "monte-marone",
    name: "Monte Marone",
    lat: 45.73,
    lon: 10.12,
    altitude: 1580,
    valley: "Valle Camonica",
    exposure: "S",
    difficulty: 3,
  },
  {
    id: "monte-santacaterina",
    name: "Monte Santa Caterina",
    lat: 45.60,
    lon: 10.42,
    altitude: 970,
    valley: "Val Sabbia",
    exposure: "S",
    difficulty: 2,
  },
  {
    id: "monte-spino",
    name: "Monte Spino",
    lat: 45.67,
    lon: 10.35,
    altitude: 1120,
    valley: "Valle del Chiese",
    exposure: "SW",
    difficulty: 2,
  },
  {
    id: "monte-pieve",
    name: "Monte Pieve",
    lat: 45.82,
    lon: 10.25,
    altitude: 1660,
    valley: "Valle Camonica",
    exposure: "S",
    difficulty: 3,
  },
  {
    id: "monte-trobio",
    name: "Monte Trobio",
    lat: 45.55,
    lon: 10.30,
    altitude: 800,
    valley: "Valtrompia",
    exposure: "SE",
    difficulty: 2,
  },
  {
    id: "corno-dosso",
    name: "Corno di Dosso",
    lat: 45.68,
    lon: 10.32,
    altitude: 1380,
    valley: "Valle del Chiese",
    exposure: "S",
    difficulty: 3,
  },
  {
    id: "monte-bura",
    name: "Monte Bura",
    lat: 45.72,
    lon: 10.05,
    altitude: 1820,
    valley: "Valle Camonica",
    exposure: "S",
    difficulty: 3,
  },
  {
    id: "monte-musaga",
    name: "Monte Musaga",
    lat: 45.64,
    lon: 10.22,
    altitude: 1050,
    valley: "Valtrompia",
    exposure: "SW",
    difficulty: 2,
  },
  {
    id: "monte-boario",
    name: "Monte Boario",
    lat: 45.74,
    lon: 10.15,
    altitude: 1540,
    valley: "Valle Camonica",
    exposure: "S",
    difficulty: 3,
  },
  {
    id: "monte-zerbion",
    name: "Monte Zerbion",
    lat: 45.70,
    lon: 10.28,
    altitude: 1440,
    valley: "Valle del Chiese",
    exposure: "S",
    difficulty: 3,
  },
  {
    id: "monte-calvario",
    name: "Monte Calvario",
    lat: 45.62,
    lon: 10.18,
    altitude: 940,
    valley: "Valtrompia",
    exposure: "S",
    difficulty: 2,
  },
];

export const DECOLLO_IDS = DECOLLI.map((d) => d.id);
export const DECOLLO_MAP = Object.fromEntries(DECOLLI.map((d) => [d.id, d]));
</dyad-watch>

Creo una funzione di utilità per calcolare la possibilità di volo basata sui dati meteo, e poi aggiorno la SidebarDecolli per mostrare un badge con lo stato.

<dyad-write path="src/utils/volo.ts" description="Utility per calcolare la possibilità di volo basata sui dati meteo">
import type { HourData } from "@/types/meteo";

export type VoloStatus = "ottimo" | "buono" | "discreto" | "rischioso" | "non_volabile" | "temporale" | "pioggia" | "calma";

export interface VoloStatusInfo {
  status: VoloStatus;
  label: string;
  icon: string;
  color: string; // classe tailwind
  description: string;
}

export function getVoloStatus(current: HourData | null | undefined): VoloStatusInfo {
  if (!current) {
    return {
      status: "non_volabile",
      label: "N/D",
      icon: "❓",
      color: "bg-slate-700 text-slate-400 border-slate-500",
      description: "Dati non disponibili",
    };
  }

  const { weatherCode, windSpeed, windGusts, precipitation, temperature } = current;

  // Temporale
  if ([95, 96, 99].includes(weatherCode)) {
    return {
      status: "temporale",
      label: "Temporale",
      icon: "⛈️",
      color: "bg-purple-900/70 text-purple-200 border-purple-500",
      description: "Pericolo temporali - non volare",
    };
  }

  // Pioggia intensa
  if ([80, 81, 82].includes(weatherCode) || (precipitation && precipitation > 2)) {
    return {
      status: "pioggia",
      label: "Pioggia",
      icon: "🌧️",
      color: "bg-blue-900/70 text-blue-200 border-blue-500",
      description: "Precipitazioni in corso",
    };
  }

  // Pioggia leggera
  if ([51, 53, 55, 56, 57, 61, 63].includes(weatherCode) || (precipitation && precipitation > 0.5)) {
    return {
      status: "non_volabile",
      label: "Non volabile",
      icon: "🌦️",
      color: "bg-slate-700 text-slate-300 border-slate-500",
      description: "Pioggia debole o rovesci",
    };
  }

  // Vento troppo forte
  if (windSpeed > 40) {
    return {
      status: "non_volabile",
      label: "Vento forte",
      icon: "💨",
      color: "bg-red-900/70 text-red-200 border-red-500",
      description: `Raffiche oltre ${Math.round(windSpeed)} km/h`,
    };
  }

  // Calma di vento (sotto 5 km/h)
  if (windSpeed < 5) {
    return {
      status: "calma",
      label: "Calma",
      icon: "🌀",
      color: "bg-gray-700 text-gray-300 border-gray-500",
      description: "Vento troppo debole",
    };
  }

  // Rischioso per raffiche forti
  if ((windGusts && windGusts > 35) || windSpeed > 30) {
    return {
      status: "rischioso",
      label: "Rischioso",
      icon: "⚠️",
      color: "bg-orange-900/70 text-orange-200 border-orange-500",
      description: `Raffiche fino a ${Math.round(windGusts || windSpeed + 10)} km/h`,
    };
  }

  // Discreto
  if (windSpeed >= 18 && windSpeed <= 25) {
    return {
      status: "discreto",
      label: "Discreto",
      icon: "🪁",
      color: "bg-amber-900/60 text-amber-200 border-amber-500",
      description: `Vento ${Math.round(windSpeed)} km/h - volo possibile`,
    };
  }

  // Buono – condizioni ideali per termica
  if (windSpeed >= 9 && windSpeed < 18) {
    return {
      status: "buono",
      label: "Buono",
      icon: "🪂",
      color: "bg-emerald-900/60 text-emerald-200 border-emerald-500",
      description: `Vento ${Math.round(windSpeed)} km/h - buone condizioni`,
    };
  }

  // Ottimo – vento leggero, bel tempo
  if (windSpeed >= 5 && windSpeed < 9) {
    return {
      status: "ottimo",
      label: "Ottimo",
      icon: "🌟",
      color: "bg-green-900/60 text-green-200 border-green-500",
      description: `Vento ${Math.round(windSpeed)} km/h - condizioni perfette`,
    };
  }

  // fallback
  return {
    status: "non_volabile",
    label: "N/D",
    icon: "❓",
    color: "bg-slate-700 text-slate-400 border-slate-500",
    description: "Dati insufficienti",
  };
}