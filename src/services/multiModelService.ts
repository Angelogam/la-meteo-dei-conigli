"use client";

/**
 * Servizio MultiModello — interroga Open-Meteo con modelli diversi
 * (ICON, GFS, ECMWF) e unisce i risultati.
 *
 * Open-Meteo supporta già nativamente:
 * - models=icon_seamless → ICON (DWD, Europa, 6.5km)
 * - models=icon_d2       → ICON-D2 (DWD, 2.2km, solo 48h, solo Europa)
 * - models=gfs_seamless  → GFS (NOAA, globale, 13km)
 * - models=ecmwf_ifs04   → ECMWF IFS (globale, 4km)
 * - models=gem_seamless  → GEM (Canada, globale)
 * - models=metno_seamless → MET Norway (Nord Europa)
 * - default              → Mix dei migliori modelli per posizione
 *
 * ICON-D2 è disponibile solo per Europa centrale (lat 43-55, lon 2-18).
 * Per l'Italia funziona perfettamente.
 */

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

// Parametri WRF/ICON avanzati — CAPE, LI, CIN, venti in alta quota
const WRF_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "dew_point_2m",
  "apparent_temperature",
  "precipitation",
  "precipitation_probability",
  "weather_code",
  "pressure_msl",
  "surface_pressure",
  "cloud_cover",
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "uv_index",
  "shortwave_radiation",
  "direct_radiation",
  "temperature_80m",
  "temperature_120m",
  // Profilo vento in quota — ICON/GFS forniscono fino a 5000m
  "wind_speed_80m",
  "wind_direction_80m",
  "wind_speed_120m",
  "wind_direction_120m",
  "wind_speed_180m",
  "wind_direction_180m",
  "wind_speed_300m",
  "wind_direction_300m",
  "wind_speed_600m",
  "wind_direction_600m",
  "wind_speed_1000m",
  "wind_direction_1000m",
  "wind_speed_1500m",
  "wind_direction_1500m",
  "wind_speed_2000m",
  "wind_direction_2000m",
  "wind_speed_2500m",
  "wind_direction_2500m",
  "wind_speed_3000m",
  "wind_direction_3000m",
  // Parametri WRF per volo
  "cape",
  "convective_inhibition",
  "lifted_index",
].join(",");

export interface ModelData {
  model: string;
  hourly: any[];
  responseTime: number;
  status: number;
  ok: boolean;
}

export interface MultiModelResult {
  default: any | null;
  icon: any | null;
  iconD2: any | null;
  gfs: any | null;
  ecmwf: any | null;
  allModels: ModelData[];
  merged: {
    cape: number[];
    capeModel: string;
    liftedIndex: number[];
    liModel: string;
    cin: number[];
    cinModel: string;
    // Venti in alta quota — prendiamo dal modello che ne ha di più
    windProfile: {
      alt: number;
      speed: number;
      dir: number;
      model: string;
    }[];
  };
}

const CURRENT_PARAMS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
].join(",");

const DAILY_PARAMS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "wind_direction_10m_dominant",
  "uv_index_max",
  "shortwave_radiation_sum",
].join(",");

interface RawResponse {
  hourly?: Record<string, number[]>;
  daily?: Record<string, any[]>;
  current?: Record<string, number>;
}

async function fetchModel(
  lat: number,
  lon: number,
  model: string,
  days: number = 3
): Promise<{ data: RawResponse; responseTime: number; status: number; ok: boolean }> {
  const start = performance.now();
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      hourly: WRF_PARAMS,
      current: CURRENT_PARAMS,
      daily: DAILY_PARAMS,
      timezone: "Europe/Rome",
      forecast_days: days.toString(),
      models: model,
    });

    const res = await fetch(`${BASE_URL}?${params.toString()}`);
    const rt = Math.round(performance.now() - start);

    if (!res.ok) {
      const text = await res.text();
      return { data: {}, responseTime: rt, status: res.status, ok: false };
    }

    const json = await res.json();
    return { data: json, responseTime: rt, status: 200, ok: true };
  } catch (err) {
    return { data: {}, responseTime: Math.round(performance.now() - start), status: 0, ok: false };
  }
}

function extractWindProfile(data: RawResponse, model: string): { alt: number; speed: number; dir: number; model: string }[] {
  if (!data.hourly) return [];
  const alts = [80, 120, 180, 300, 600, 1000, 1500, 2000, 2500, 3000];
  const profile: { alt: number; speed: number; dir: number; model: string }[] = [];
  
  for (const alt of alts) {
    const speeds = data.hourly[`wind_speed_${alt}m`];
    const dirs = data.hourly[`wind_direction_${alt}m`];
    if (speeds && speeds.length > 0) {
      // Prende il valore a metà giornata (ora 12)
      const midIdx = Math.min(Math.floor(speeds.length / 2), speeds.length - 1);
      profile.push({
        alt,
        speed: speeds[midIdx] ?? 0,
        dir: dirs?.[midIdx] ?? 0,
        model,
      });
    }
  }
  return profile;
}

export const multiModelService = {
  /**
   * Esegue una fetch multi-modello: interroga ICON, ICON-D2, GFS, ECMWF e default
   * e unisce i migliori dati da ciascuno.
   */
  async fetchAllModels(lat: number, lon: number, days: number = 3): Promise<MultiModelResult> {
    // ICON-D2 disponibile solo per Europa centrale
    const isEurope = lat >= 40 && lat <= 55 && lon >= -5 && lon <= 25;
    const models = isEurope
      ? [
          { name: "default", model: "", priority: 0 },
          { name: "icon", model: "icon_seamless", priority: 1 },
          { name: "icon_d2", model: "icon_d2", priority: 2 },
          { name: "gfs", model: "gfs_seamless", priority: 1 },
          { name: "ecmwf", model: "ecmwf_ifs04", priority: 1 },
        ]
      : [
          { name: "default", model: "", priority: 0 },
          { name: "gfs", model: "gfs_seamless", priority: 1 },
          { name: "ecmwf", model: "ecmwf_ifs04", priority: 1 },
          { name: "icon", model: "icon_seamless", priority: 1 },
        ];

    // Fetch in parallelo — sono richieste indipendenti
    const results = await Promise.all(
      models.map(m => fetchModel(lat, lon, m.model, days))
    );

    const modelData: Record<string, any> = { default: null, icon: null, iconD2: null, gfs: null, ecmwf: null };
    const allModels: ModelData[] = [];

    models.forEach((m, i) => {
      const r = results[i];
      const obj = {
        ...r.data,
        generationtime_ms: r.data as any,
      };
      modelData[m.name] = r.ok ? r.data : null;
      allModels.push({
        model: m.name,
        hourly: r.data?.hourly?.time || [],
        responseTime: r.responseTime,
        status: r.status,
        ok: r.ok,
      });
    });

    // Unione intelligente: prendi CAPE, LI, CIN dal modello che li fornisce
    // Priorità: ICON-D2 > ICON > ECMWF > GFS > default
    let mergedCape: number[] = [];
    let capeModel = "default";
    let mergedLi: number[] = [];
    let liModel = "default";
    let mergedCin: number[] = [];
    let cinModel = "default";

    const getCape = (data: any) => data?.hourly?.cape;
    const getLi = (data: any) => data?.hourly?.lifted_index;
    const getCin = (data: any) => data?.hourly?.convective_inhibition;

    const modelPriority = [
      { name: "icon_d2", data: modelData.iconD2 },
      { name: "icon", data: modelData.icon },
      { name: "ecmwf", data: modelData.ecmwf },
      { name: "gfs", data: modelData.gfs },
      { name: "default", data: modelData.default },
    ];

    for (const mp of modelPriority) {
      if (!mp.data) continue;
      if (mergedCape.length === 0 && getCape(mp.data)?.length > 0) {
        mergedCape = getCape(mp.data);
        capeModel = mp.name;
      }
      if (mergedLi.length === 0 && getLi(mp.data)?.length > 0) {
        mergedLi = getLi(mp.data);
        liModel = mp.name;
      }
      if (mergedCin.length === 0 && getCin(mp.data)?.length > 0) {
        mergedCin = getCin(mp.data);
        cinModel = mp.name;
      }
    }

    // Profilo vento unificato — prende da tutti i modelli e merge
    const allWindProfiles = [
      ...extractWindProfile(modelData.default || {}, "default"),
      ...extractWindProfile(modelData.icon || {}, "icon"),
      ...extractWindProfile(modelData.iconD2 || {}, "icon_d2"),
      ...extractWindProfile(modelData.gfs || {}, "gfs"),
      ...extractWindProfile(modelData.ecmwf || {}, "ecmwf"),
    ];

    // Per ogni quota, prendi il dato dal modello con più priorità che lo fornisce
    const mergedWindProfile = modelPriority.flatMap(mp => {
      if (!mp.data) return [];
      return extractWindProfile(mp.data, mp.name);
    });

    // Deduplica per quota
    const seenAlts = new Set<number>();
    const uniqueWindProfile = mergedWindProfile.filter(wp => {
      if (seenAlts.has(wp.alt)) return false;
      seenAlts.add(wp.alt);
      return true;
    }).sort((a, b) => a.alt - b.alt);

    return {
      default: modelData.default,
      icon: modelData.icon,
      iconD2: modelData.iconD2,
      gfs: modelData.gfs,
      ecmwf: modelData.ecmwf,
      allModels,
      merged: {
        cape: mergedCape,
        capeModel,
        liftedIndex: mergedLi,
        liModel,
        cin: mergedCin,
        cinModel,
        windProfile: uniqueWindProfile,
      },
    };
  },

  /**
   * Fetch veloce di solo ICON-D2 (per l'Europa) — 
   * è il modello migliore per il volo (2.2km risoluzione, aggiornato ogni 3h)
   */
  async fetchIconD2(lat: number, lon: number): Promise<any> {
    // ICON-D2 è disponibile per Europa centrale
    if (lat < 40 || lat > 55 || lon < -5 || lon > 25) {
      // Fuori area — fallback a ICON
      return this.fetchModelOnly(lat, lon, "icon_seamless");
    }
    return this.fetchModelOnly(lat, lon, "icon_d2");
  },

  /**
   * Fetch GFS (globale, 13km) — ottimo per venti in alta quota
   */
  async fetchGfs(lat: number, lon: number): Promise<any> {
    return this.fetchModelOnly(lat, lon, "gfs_seamless");
  },

  /**
   * Fetch ECMWF IFS (globale, 4km)
   */
  async fetchEcmwf(lat: number, lon: number): Promise<any> {
    return this.fetchModelOnly(lat, lon, "ecmwf_ifs04");
  },

  async fetchModelOnly(lat: number, lon: number, model: string): Promise<{ data: any; ok: boolean; responseTime: number }> {
    const result = await fetchModel(lat, lon, model);
    return {
      data: result.data,
      ok: result.ok,
      responseTime: result.responseTime,
    };
  },
};
