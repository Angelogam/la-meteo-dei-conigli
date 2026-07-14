"use client";

import React, { useMemo } from "react";
import {
  CloudSun, Droplets, Gauge, Cloud, Wind, ArrowUp, TrendingUp,
  Sun, Eye, AlertTriangle, Thermometer, Server
} from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

function getWindDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "-";
}

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

function BigCard({ icon, label, value, unit, sub }: { icon: React.ReactNode; label: string; value: string; unit: string; sub?: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-600/50 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-sm text-slate-400 uppercase mb-1 font-bold">{label}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}<span className="text-base text-slate-400 font-normal ml-1">{unit}</span></div>
      {sub && <div className="text-sm text-slate-400">{sub}</div>}
    </div>
  );
}

function SmallCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-sm text-slate-400 uppercase mb-1 font-bold">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-sm text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-xs text-slate-400 uppercase font-bold mb-0.5">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{sub}</div>
    </div>
  );
}

interface MeteoTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number };
  thermalDelta: number;
  stabilityIndex: { label: string; color: string };
  modelName?: string;
  cape?: number;
  liftedIndex?: number;
  cin?: number;
}

export function MeteoTab({ currentData, site, thermalDelta, modelName, cape, liftedIndex, cin }: MeteoTabProps) {
  if (!currentData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <CloudSun className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato meteo</p>
      </div>
    );
  }

  const temp = currentData.temperature;
  const humidity = currentData.humidity;
  const pressure = currentData.pressure;
  const cloudCover = currentData.cloudCover;
  const windSpeed = currentData.windSpeed;
  const windDir = currentData.windDir;
  const windGust = currentData.windGusts;
  const precipitation = currentData.precipitation;
  const dewPoint = currentData.dewPoint ?? (temp - (100 - (humidity ?? 50)) / 5);
  const weatherCode = currentData.weatherCode;
  const temp80m = currentData.temp80m;
  const temp120m = currentData.temp120m;
  const uvIndex = currentData.uvIndex;

  const spread = temp - dewPoint;
  const cloudBase = Math.max(200, Math.min(3000, Math.round(spread * 125)));

  let gradienteReale = 0.98;
  let gradienteLabel = "Adiabatico secco";
  if (temp80m != null) { gradienteReale = ((temp - temp80m) / 78) * 100; gradienteLabel = "Da T80m"; }
  else if (temp120m != null) { gradienteReale = ((temp - temp120m) / 118) * 100; gradienteLabel = "Da T120m"; }

  let forzaTermica = 0;
  if (gradienteReale >= 1.2) forzaTermica += 3;
  else if (gradienteReale >= 0.98) forzaTermica += 2;
  else if (gradienteReale >= 0.7) forzaTermica += 1;
  if (windSpeed >= 5 && windSpeed <= 15) forzaTermica += 2;
  else if (windSpeed >= 3 && windSpeed < 5) forzaTermica += 1.5;
  else if (windSpeed > 15 && windSpeed <= 22) forzaTermica += 1;
  if (cloudCover >= 15 && cloudCover <= 45) forzaTermica += 2;
  else if (cloudCover >= 5 && cloudCover < 15) forzaTermica += 1.5;
  if (humidity >= 30 && humidity <= 50) forzaTermica += 1.5;
  else if (humidity > 50 && humidity <= 65) forzaTermica += 1;
  if (uvIndex != null) {
    if (uvIndex >= 7) forzaTermica += 1;
    else if (uvIndex >= 5) forzaTermica += 0.7;
    else if (uvIndex >= 3) forzaTermica += 0.4;
  }
  forzaTermica = Math.min(10, Math.max(0, Math.round(forzaTermica * 10) / 10));
  let rateoTermico = (forzaTermica / 10) * 4;
  if (precipitation > 1) rateoTermico = 0;
  rateoTermico = Math.round(rateoTermico * 10) / 10;
  const topTermico = Math.min(5000, cloudBase + Math.round(forzaTermica * 250));
  const raffiche = windGust ?? Math.round(windSpeed * 1.4);
  const zeroTermico = Math.max(0, Math.round(site.alt + (temp / 0.0098) + 200));
  const turbolenza = raffiche > 30 ? "Forte" : raffiche > 22 ? "Moderata" : raffiche > 14 ? "Leggera" : "Assente";

  const condizioniVolo =
    windSpeed < 3 ? "Troppo calma" :
    windSpeed > 30 ? "Vento forte" :
    precipitation > 1 ? "Pioggia" :
    weatherCode >= 95 ? "Temporale" :
    forzaTermica >= 5 ? "Ottime" :
    forzaTermica >= 3 ? "Buone" :
    forzaTermica >= 1 ? "Deboli" :
    "Assenti";

  const voloEmoji =
    condizioniVolo === "Ottime" ? "🪂🔥" :
    condizioniVolo === "Buone" ? "🪂" :
    condizioniVolo === "Deboli" ? "🌤️" :
    condizioniVolo === "Troppo calma" ? "🌀" :
    condizioniVolo === "Pioggia" || condizioniVolo === "Temporale" ? "⛈️" :
    condizioniVolo === "Vento forte" ? "💨" : "❄️";

  const dirLabel = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((windDir ?? 0) / 45) % 8];
  const arrow = getWindArrow(windDir ?? 0);

  const cardBorderClass =
    condizioniVolo === "Ottime" ? "bg-emerald-900/40 border-emerald-400" :
    condizioniVolo === "Buone" ? "bg-green-900/40 border-green-400" :
    condizioniVolo === "Deboli" ? "bg-amber-900/40 border-amber-400" :
    condizioniVolo === "Troppo calma" ? "bg-slate-800/60 border-slate-400" :
    "bg-red-900/40 border-red-400";

  return (
    <div className="space-y-4">
      <div className={"rounded-xl p-6 border-4 text-center " + cardBorderClass}>
        <div className="text-6xl mb-3">{voloEmoji}</div>
        <div className="text-2xl font-bold text-white mb-1">{condizioniVolo}</div>
        <div className="text-base text-slate-300">Vento {windSpeed} km/h da {dirLabel}</div>
        <div className="mt-4 pt-3 border-t border-white/10">
          <span className="text-sm text-slate-400">Zero termico</span>
          <div className="text-2xl font-bold text-white mt-0.5">{zeroTermico} <span className="text-base text-slate-400 font-normal">m</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/60 border border-slate-600/50 rounded-xl p-4 text-center">
          <div className="text-sm text-slate-400 uppercase mb-2 font-bold">Vento decollo</div>
          <div className="text-3xl font-bold text-white flex items-center justify-center gap-2 mb-1">
            {arrow} {Math.round(windSpeed)} <span className="text-base text-slate-400 font-normal">km/h</span>
          </div>
          <div className="text-base text-slate-400">{dirLabel} ({Math.round(windDir ?? 0)}°)</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-600/50 rounded-xl p-4 text-center">
          <div className="text-sm text-slate-400 uppercase mb-2 font-bold">Vento atterraggio</div>
          <div className="text-3xl font-bold text-white flex items-center justify-center gap-2 mb-1">
            {Math.round(windSpeed * 0.7)} <span className="text-base text-slate-400 font-normal">km/h</span>
          </div>
          <div className="text-base text-slate-400">Raffiche {raffiche} km/h</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigCard icon={<ArrowUp className="w-8 h-8 text-green-400" />} label="Base nuvole (LCL)" value={`${cloudBase}`} unit="m" sub={"Spread " + spread.toFixed(1) + "°C"} />
        <BigCard icon={<ArrowUp className="w-8 h-8 text-red-400" />} label="Top termiche" value={`${topTermico}`} unit="m" sub={precipitation > 1 ? "Pioggia" : "Spessore " + (topTermico - cloudBase) + "m"} />
        <BigCard icon={<TrendingUp className="w-8 h-8 text-orange-400" />} label="Forza termica" value={forzaTermica.toFixed(1)} unit="/10" sub={rateoTermico + " m/s"} />
        <BigCard icon={<AlertTriangle className="w-8 h-8 text-amber-400" />} label="Turbolenza" value={turbolenza} unit="" sub={turbolenza === "Forte" ? "Attenzione" : turbolenza === "Moderata" ? "Gestibile" : turbolenza === "Leggera" ? "Ok" : "Nessuna"} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SmallCard icon={<TrendingUp className="w-6 h-6 text-purple-400" />} label="CAPE" value={cape != null ? Math.round(cape) + " J/kg" : "--"} sub={cape != null ? (cape > 1000 ? "Molto instabile" : cape > 500 ? "Instabile" : cape > 200 ? "Moderato" : "Stabile") : undefined} />
        <SmallCard icon={<AlertTriangle className="w-6 h-6 text-amber-400" />} label="Lifted Index" value={liftedIndex != null ? liftedIndex.toFixed(1) + " °C" : "--"} sub={liftedIndex != null ? (liftedIndex < -5 ? "Instabile" : liftedIndex < 0 ? "Leggero" : "Stabile") : undefined} />
        <SmallCard icon={<Cloud className="w-6 h-6 text-blue-400" />} label="CIN" value={cin != null ? Math.round(cin) + " J/kg" : "--"} sub={cin != null ? (cin < -50 ? "Inibizione forte" : cin < -20 ? "Inibizione media" : "Inibizione debole") : undefined} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SmallCard icon={<Droplets className="w-6 h-6 text-sky-400" />} label="Umidità" value={(humidity ?? "--") + "%"} sub={"Rugiada " + Math.round(dewPoint) + "°C"} />
        <SmallCard icon={<Gauge className="w-6 h-6 text-emerald-400" />} label="Pressione" value={Math.round(pressure ?? 1013) + " hPa"} sub={pressure > 1020 ? "Alta" : pressure < 1010 ? "Bassa" : "Normale"} />
        <SmallCard icon={<Cloud className="w-6 h-6 text-slate-400" />} label="Nuvolosità" value={(cloudCover ?? "--") + "%"} sub={cloudCover < 20 ? "Sereno" : cloudCover < 50 ? "Poco" : cloudCover < 80 ? "Nuvoloso" : "Coperto"} />
        <SmallCard icon={<Sun className="w-6 h-6 text-yellow-400" />} label="UV Index" value={uvIndex != null ? uvIndex.toFixed(1) : "--"} sub={uvIndex >= 8 ? "Estremo" : uvIndex >= 6 ? "Alto" : uvIndex >= 3 ? "Moderato" : uvIndex >= 1 ? "Basso" : "Nessuno"} />
        <SmallCard icon={<TrendingUp className="w-6 h-6 text-purple-400" />} label="Gradiente" value={gradienteReale.toFixed(2) + "°"} sub={gradienteLabel + (gradienteReale > 1.2 ? " · Instabile" : gradienteReale > 0.98 ? " · Neutro" : " · Stabile")} />
        <SmallCard icon={<Eye className="w-6 h-6 text-cyan-400" />} label="Delta T" value={Math.round(thermalDelta ?? 0) + "°C"} sub={thermalDelta > 10 ? "Buona escursione" : thermalDelta > 6 ? "Moderata" : "Bassa"} />
      </div>

      <div className="text-center text-sm text-slate-600 border-t border-slate-700/30 pt-3">
        Dati da Open-Meteo · Modello: {modelName || "auto"} · Aggiornamento: {new Date().toLocaleTimeString("it-IT")}
      </div>
    </div>
  );
}

interface WindLevel {
  alt: number;
  speed: number;
  dir: number;
  dirName: string;
}

interface VentiTabProps {
  currentData: any;
  dayData: any[];
  hourlyData?: any[];
  targetHour?: number;
}

function getDisplayProfile(profile: WindLevel[]): WindLevel[] {
  const alts = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500, 10];
  return alts.map(alt => {
    const exact = profile.find(l => l.alt === alt);
    if (exact) return exact;
    const sorted = [...profile].sort((a, b) => Math.abs(a.alt - alt) - Math.abs(b.alt - alt));
    const nearest = sorted[0];
    if (nearest && Math.abs(nearest.alt - alt) <= 250) return { ...nearest, alt };
    return { alt, speed: 0, dir: 0, dirName: "-" };
  });
}

export function VentiTab({ currentData, hourlyData, targetHour = 12 }: VentiTabProps) {
  const windProfile = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setHours(targetHour, 0, 0, 0);
    const entry = hourlyData.find((h: any) => {
      const t = h.time instanceof Date ? h.time : new Date(h.time);
      return t.getHours() === targetHour && t.getFullYear() === targetDate.getFullYear() && t.getMonth() === targetDate.getMonth() && t.getDate() === targetDate.getDate();
    }) || hourlyData[0];
    if (!entry?.windProfile || !Array.isArray(entry.windProfile) || entry.windProfile.length === 0) return [];
    const profile = [
      { alt: 10, speed: currentData?.windSpeed ?? 10, dir: currentData?.windDir ?? 0, dirName: getWindDirName(currentData?.windDir ?? 0) },
      ...entry.windProfile.filter((l: any) => l.speed > 0 && l.dir >= 0).map((l: any) => ({ alt: l.height, speed: l.speed, dir: l.dir, dirName: getWindDirName(l.dir) })),
    ];
    return profile;
  }, [hourlyData, targetHour, currentData]);

  const hasRealData = windProfile.length > 1;

  const displayProfile = useMemo(() => {
    if (hasRealData) return getDisplayProfile(windProfile);
    const est: WindLevel[] = [];
    const alts = [10, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];
    for (const alt of alts) {
      if (alt === 10) { est.push({ alt, speed: currentData?.windSpeed ?? 10, dir: currentData?.windDir ?? 0, dirName: getWindDirName(currentData?.windDir ?? 0) }); }
      else {
        const factor = 1 + (alt / 1000) * 0.35;
        est.push({ alt, speed: Math.round(Math.min((currentData?.windSpeed ?? 10) * factor, 60) * 10) / 10, dir: ((currentData?.windDir ?? 0) + Math.round((alt / 1000) * 15)) % 360, dirName: getWindDirName(((currentData?.windDir ?? 0) + Math.round((alt / 1000) * 15)) % 360) });
      }
    }
    return est;
  }, [windProfile, hasRealData, currentData]);

  const surfaceGust = currentData?.windGusts ?? Math.round((currentData?.windSpeed ?? 0) * 1.4);

  if (!currentData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={"flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold " + (hasRealData ? "bg-emerald-900/30 border-emerald-500/30 text-emerald-300" : "bg-amber-900/30 border-amber-500/30 text-amber-300")}>
        <Server className="w-4 h-4" />
        {hasRealData ? "Dati reali da Open-Meteo (" + (windProfile.length - 1) + " quote)" : "Dati stimati — vento in quota N/D"}
      </div>

      <div>
        <h4 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2"><Wind className="w-5 h-5" /> Profilo vento</h4>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-1">
          {displayProfile.map((level, idx) => {
            const maxSpeed = Math.max(...displayProfile.map(l => l.speed || 0), 1);
            const width = Math.min(100, (level.speed / maxSpeed) * 100);
            const barColor = width < 30 ? "bg-emerald-400" : width < 50 ? "bg-lime-400" : width < 70 ? "bg-amber-400" : width < 90 ? "bg-orange-400" : "bg-red-400";
            return (
              <div key={idx} className="grid grid-cols-[70px_1fr_80px] gap-3 items-center py-2">
                <span className="text-sm text-slate-300 font-bold">{level.alt}m</span>
                <div className="h-7 bg-slate-700/60 rounded-full overflow-hidden">
                  <div className={"h-full rounded-full flex items-center justify-end pr-2 " + barColor} style={{ width: Math.max(width, 20) + "%" }}>
                    <span className="text-sm text-white font-bold">{Math.round(level.speed)}</span>
                  </div>
                </div>
                <span className="text-sm text-slate-300 text-center font-bold">{getWindArrow(level.dir)} {level.dirName}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 text-center text-sm text-slate-400">
        Vento suolo: {Math.round(currentData.windSpeed)} km/h {getWindArrow(currentData.windDir)} {getWindDirName(currentData.windDir)} ({Math.round(currentData.windDir)}°) · Raffiche {Math.round(surfaceGust)} km/h
      </div>
    </div>
  );
}

interface TermicheTabProps {
  currentData: any;
  dayData: any[];
  site?: { alt: number; lat?: number; lon?: number };
}

export function TermicheTab({ dayData, site }: TermicheTabProps) {
  const alt = site?.alt ?? 1000;
  const termichePerOra = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    return dayData.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 8 && hh <= 19; }).map((h: any) => ({ ora: new Date(h.time).getHours(), ...calcolaTermiche(h, alt) })).sort((a, b) => a.ora - b.ora);
  }, [dayData, alt]);

  if (!termichePerOra.length) {
    return <div className="text-center py-16 text-slate-400"><CloudSun className="w-10 h-10 mx-auto mb-3" />Nessun dato termico</div>;
  }

  const media = termichePerOra.reduce((s, t) => s + t.rateo, 0) / termichePerOra.length;
  const maxVal = Math.max(...termichePerOra.map(t => t.rateo));
  const attive = termichePerOra.filter(t => t.rateo >= 0.3).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <TrendingUp className="w-6 h-6 text-amber-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-amber-300">{media.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Media m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <ArrowUp className="w-6 h-6 text-green-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-green-300">{maxVal.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Picco m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <Thermometer className="w-6 h-6 text-orange-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-orange-300">{attive}</div>
          <div className="text-sm text-slate-400">Ore attive</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {termichePerOra.map((t) => (
          <div key={t.ora} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-base font-bold text-slate-200 mb-1">{String(t.ora).padStart(2, "0")}:00</div>
            <div className="text-xl font-bold" style={{ color: t.colore }}>{t.rateo.toFixed(1)} m/s</div>
            <div className="text-sm text-slate-400">{t.label}</div>
            <div className="text-xs text-green-300 mt-1">Base {t.base}m</div>
            <div className="text-xs text-red-300">Top {t.top}m</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AnalisiTabProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
}

export function AnalisiTab({ currentData, dayData, site }: AnalisiTabProps) {
  const analisi = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    const alt = site?.alt ?? 1000;
    const oreGiorno = dayData.filter(h => { const hh = h.time.getHours(); return hh >= 8 && hh <= 19; });
    if (oreGiorno.length < 3) return null;

    const tempMax = Math.max(...oreGiorno.map(h => h.temperature));
    const tempMedia = oreGiorno.reduce((s, h) => s + h.temperature, 0) / oreGiorno.length;
    const windMedia = oreGiorno.reduce((s, h) => s + h.windSpeed, 0) / oreGiorno.length;
    const windMax = Math.max(...oreGiorno.map(h => h.windSpeed));
    const windGustsMax = Math.max(...oreGiorno.map(h => h.windGusts || 0));
    const cloudMedia = oreGiorno.reduce((s, h) => s + h.cloudCover, 0) / oreGiorno.length;
    const humidityMedia = oreGiorno.reduce((s, h) => s + h.humidity, 0) / oreGiorno.length;
    const precipTot = oreGiorno.reduce((s, h) => s + (h.precipitation || 0), 0);
    const pressureMed = oreGiorno.reduce((s, h) => s + h.pressure, 0) / oreGiorno.length;
    const dewMedia = oreGiorno.reduce((s, h) => s + h.dewPoint, 0) / oreGiorno.length;
    const uvMedia = oreGiorno.reduce((s, h) => s + (h.uvIndex || 0), 0) / oreGiorno.length;

    const termichePerOra = oreGiorno.map(h => ({ ...calcolaTermiche(h, alt), ora: h.time.getHours() }));
    const rateoMedio = termichePerOra.reduce((s, t) => s + t.rateo, 0) / termichePerOra.length;
    const rateoMax = Math.max(...termichePerOra.map(t => t.rateo));
    const oreAttive = termichePerOra.filter(t => t.rateo >= 0.3).length;
    const mediaSpread = tempMedia - dewMedia;
    const baseLCL = Math.max(200, Math.min(3000, Math.round(mediaSpread * 125)));

    const dirs = oreGiorno.map(h => h.windDir).filter(d => d != null);
    const dirCount: Record<number, number> = {};
    for (const d of dirs) dirCount[Math.round(d / 45) * 45] = (dirCount[Math.round(d / 45) * 45] || 0) + 1;
    const dirDom = Object.entries(dirCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const dirDomNum = dirDom ? parseInt(dirDom) : (currentData?.windDir ?? 0);
    const zeroTermico = Math.max(0, Math.round(alt + (tempMedia / 0.0098) + 200));
    const tempMin = Math.min(...oreGiorno.map(h => h.temperature));
    const deltaTermico = Math.round((tempMax - tempMin) * 10) / 10;

    let gradienteReale = 0.98;
    if (currentData?.temp80m != null) gradienteReale = ((currentData.temperature - currentData.temp80m) / 78) * 100;
    else if (currentData?.temp120m != null) gradienteReale = ((currentData.temperature - currentData.temp120m) / 118) * 100;

    let forza = 0;
    if (gradienteReale >= 1.2) forza += 3; else if (gradienteReale >= 0.98) forza += 2; else if (gradienteReale >= 0.7) forza += 1;
    if (windMedia >= 5 && windMedia <= 15) forza += 2; else if (windMedia >= 3 && windMedia < 5) forza += 1.5; else if (windMedia > 15 && windMedia <= 22) forza += 1;
    if (cloudMedia >= 15 && cloudMedia <= 45) forza += 2; else if (cloudMedia >= 5 && cloudMedia < 15) forza += 1.5;
    if (humidityMedia >= 30 && humidityMedia <= 50) forza += 1.5; else if (humidityMedia > 50 && humidityMedia <= 65) forza += 1;
    forza = Math.min(10, Math.max(0, Math.round(forza * 10) / 10));
    const rafficaMedia = oreGiorno.reduce((s, h) => s + (h.windGusts || h.windSpeed * 1.4), 0) / oreGiorno.length;

    let score = 5;
    if (windMedia >= 5 && windMedia <= 12) score += 2; else if (windMedia > 18) score -= 1;
    if (precipTot === 0) score += 2; else if (precipTot < 0.5) score += 1;
    if (cloudMedia >= 10 && cloudMedia <= 55) score += 1;
    if (rateoMedio >= 2) score += 2; else if (rateoMedio >= 1) score += 1;
    if (windMax > 30) score -= 1;
    score = Math.max(0, Math.min(10, score));

    return {
      tempMax: Math.round(tempMax), tempMedia: Math.round(tempMedia), windMedia: Math.round(windMedia),
      windMax: Math.round(windMax), windGustsMax: Math.round(windGustsMax), cloudMedia: Math.round(cloudMedia),
      humidityMedia: Math.round(humidityMedia), precipTot: Math.round(precipTot * 10) / 10,
      pressureMed: Math.round(pressureMed), uvMedia: Math.round(uvMedia * 10) / 10,
      rateoMedio: Math.round(rateoMedio * 10) / 10, rateoMax: Math.round(rateoMax * 10) / 10,
      oreAttive, baseLCL, zeroTermico, deltaTermico, gradienteReale: Math.round(gradienteReale * 100) / 100,
      forzaTermica: forza, turbolenza: rafficaMedia > 30 ? "Forte" : rafficaMedia > 22 ? "Moderata" : rafficaMedia > 14 ? "Leggera" : "Assente",
      dirDom: dirDomNum, dirName: getWindDirName(dirDomNum), score,
      scoreEmoji: score >= 8 ? "🪂🔥" : score >= 6 ? "🪂" : score >= 4 ? "🌤️" : "❌",
      totaleOre: termichePerOra.length,
    };
  }, [dayData, currentData, site]);

  if (!analisi) {
    return <div className="text-center py-12 text-slate-400 text-base"><Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />Dati insufficienti per generare l'analisi.</div>;
  }

  const scoreColor = analisi.score >= 8 ? "text-emerald-400" : analisi.score >= 6 ? "text-lime-400" : analisi.score >= 4 ? "text-amber-400" : "text-red-400";
  const scoreBgClass = analisi.score >= 8 ? "bg-emerald-900/30 border-emerald-500/30" :```
analisi.score >= 6 ? "bg-lime-900/30 border-lime-500/30" : analisi.score >= 4 ? "bg-amber-900/30 border-amber-500/30" : "bg-red-900/30 border-red-500/30";
```

<dyad-write path="src/components/MeteoTabs.tsx" description="Complete the file from the AnalisiTab return onward">
"use client";

import React, { useMemo } from "react";
import {
  CloudSun, Droplets, Gauge, Cloud, Wind, ArrowUp, TrendingUp,
  Sun, Eye, AlertTriangle, Thermometer, Server
} from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

function getWindDirName(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8] || "-";
}

function getWindArrow(deg: number): string {
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8] || "→";
}

function BigCard({ icon, label, value, unit, sub }: { icon: React.ReactNode; label: string; value: string; unit: string; sub?: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-600/50 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-sm text-slate-400 uppercase mb-1 font-bold">{label}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}<span className="text-base text-slate-400 font-normal ml-1">{unit}</span></div>
      {sub && <div className="text-sm text-slate-400">{sub}</div>}
    </div>
  );
}

function SmallCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-sm text-slate-400 uppercase mb-1 font-bold">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-sm text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-xs text-slate-400 uppercase font-bold mb-0.5">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{sub}</div>
    </div>
  );
}

interface MeteoTabProps {
  currentData: any;
  dayData: any[];
  site: { alt: number };
  thermalDelta: number;
  stabilityIndex: { label: string; color: string };
  modelName?: string;
  cape?: number;
  liftedIndex?: number;
  cin?: number;
}

export function MeteoTab({ currentData, site, thermalDelta, modelName, cape, liftedIndex, cin }: MeteoTabProps) {
  if (!currentData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <CloudSun className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato meteo</p>
      </div>
    );
  }

  const temp = currentData.temperature;
  const humidity = currentData.humidity;
  const pressure = currentData.pressure;
  const cloudCover = currentData.cloudCover;
  const windSpeed = currentData.windSpeed;
  const windDir = currentData.windDir;
  const windGust = currentData.windGusts;
  const precipitation = currentData.precipitation;
  const dewPoint = currentData.dewPoint ?? (temp - (100 - (humidity ?? 50)) / 5);
  const weatherCode = currentData.weatherCode;
  const temp80m = currentData.temp80m;
  const temp120m = currentData.temp120m;
  const uvIndex = currentData.uvIndex;

  const spread = temp - dewPoint;
  const cloudBase = Math.max(200, Math.min(3000, Math.round(spread * 125)));

  let gradienteReale = 0.98;
  let gradienteLabel = "Adiabatico secco";
  if (temp80m != null) { gradienteReale = ((temp - temp80m) / 78) * 100; gradienteLabel = "Da T80m"; }
  else if (temp120m != null) { gradienteReale = ((temp - temp120m) / 118) * 100; gradienteLabel = "Da T120m"; }

  let forzaTermica = 0;
  if (gradienteReale >= 1.2) forzaTermica += 3;
  else if (gradienteReale >= 0.98) forzaTermica += 2;
  else if (gradienteReale >= 0.7) forzaTermica += 1;
  if (windSpeed >= 5 && windSpeed <= 15) forzaTermica += 2;
  else if (windSpeed >= 3 && windSpeed < 5) forzaTermica += 1.5;
  else if (windSpeed > 15 && windSpeed <= 22) forzaTermica += 1;
  if (cloudCover >= 15 && cloudCover <= 45) forzaTermica += 2;
  else if (cloudCover >= 5 && cloudCover < 15) forzaTermica += 1.5;
  if (humidity >= 30 && humidity <= 50) forzaTermica += 1.5;
  else if (humidity > 50 && humidity <= 65) forzaTermica += 1;
  if (uvIndex != null) {
    if (uvIndex >= 7) forzaTermica += 1;
    else if (uvIndex >= 5) forzaTermica += 0.7;
    else if (uvIndex >= 3) forzaTermica += 0.4;
  }
  forzaTermica = Math.min(10, Math.max(0, Math.round(forzaTermica * 10) / 10));
  let rateoTermico = (forzaTermica / 10) * 4;
  if (precipitation > 1) rateoTermico = 0;
  rateoTermico = Math.round(rateoTermico * 10) / 10;
  const topTermico = Math.min(5000, cloudBase + Math.round(forzaTermica * 250));
  const raffiche = windGust ?? Math.round(windSpeed * 1.4);
  const zeroTermico = Math.max(0, Math.round(site.alt + (temp / 0.0098) + 200));
  const turbolenza = raffiche > 30 ? "Forte" : raffiche > 22 ? "Moderata" : raffiche > 14 ? "Leggera" : "Assente";

  const condizioniVolo =
    windSpeed < 3 ? "Troppo calma" :
    windSpeed > 30 ? "Vento forte" :
    precipitation > 1 ? "Pioggia" :
    weatherCode >= 95 ? "Temporale" :
    forzaTermica >= 5 ? "Ottime" :
    forzaTermica >= 3 ? "Buone" :
    forzaTermica >= 1 ? "Deboli" :
    "Assenti";

  const voloEmoji =
    condizioniVolo === "Ottime" ? "🪂🔥" :
    condizioniVolo === "Buone" ? "🪂" :
    condizioniVolo === "Deboli" ? "🌤️" :
    condizioniVolo === "Troppo calma" ? "🌀" :
    condizioniVolo === "Pioggia" || condizioniVolo === "Temporale" ? "⛈️" :
    condizioniVolo === "Vento forte" ? "💨" : "❄️";

  const dirLabel = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((windDir ?? 0) / 45) % 8];
  const arrow = getWindArrow(windDir ?? 0);

  const cardBorderClass =
    condizioniVolo === "Ottime" ? "bg-emerald-900/40 border-emerald-400" :
    condizioniVolo === "Buone" ? "bg-green-900/40 border-green-400" :
    condizioniVolo === "Deboli" ? "bg-amber-900/40 border-amber-400" :
    condizioniVolo === "Troppo calma" ? "bg-slate-800/60 border-slate-400" :
    "bg-red-900/40 border-red-400";

  return (
    <div className="space-y-4">
      <div className={"rounded-xl p-6 border-4 text-center " + cardBorderClass}>
        <div className="text-6xl mb-3">{voloEmoji}</div>
        <div className="text-2xl font-bold text-white mb-1">{condizioniVolo}</div>
        <div className="text-base text-slate-300">Vento {windSpeed} km/h da {dirLabel}</div>
        <div className="mt-4 pt-3 border-t border-white/10">
          <span className="text-sm text-slate-400">Zero termico</span>
          <div className="text-2xl font-bold text-white mt-0.5">{zeroTermico} <span className="text-base text-slate-400 font-normal">m</span></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/60 border border-slate-600/50 rounded-xl p-4 text-center">
          <div className="text-sm text-slate-400 uppercase mb-2 font-bold">Vento decollo</div>
          <div className="text-3xl font-bold text-white flex items-center justify-center gap-2 mb-1">
            {arrow} {Math.round(windSpeed)} <span className="text-base text-slate-400 font-normal">km/h</span>
          </div>
          <div className="text-base text-slate-400">{dirLabel} ({Math.round(windDir ?? 0)}°)</div>
        </div>
        <div className="bg-slate-800/60 border border-slate-600/50 rounded-xl p-4 text-center">
          <div className="text-sm text-slate-400 uppercase mb-2 font-bold">Vento atterraggio</div>
          <div className="text-3xl font-bold text-white flex items-center justify-center gap-2 mb-1">
            {Math.round(windSpeed * 0.7)} <span className="text-base text-slate-400 font-normal">km/h</span>
          </div>
          <div className="text-base text-slate-400">Raffiche {raffiche} km/h</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <BigCard icon={<ArrowUp className="w-8 h-8 text-green-400" />} label="Base nuvole (LCL)" value={`${cloudBase}`} unit="m" sub={"Spread " + spread.toFixed(1) + "°C"} />
        <BigCard icon={<ArrowUp className="w-8 h-8 text-red-400" />} label="Top termiche" value={`${topTermico}`} unit="m" sub={precipitation > 1 ? "Pioggia" : "Spessore " + (topTermico - cloudBase) + "m"} />
        <BigCard icon={<TrendingUp className="w-8 h-8 text-orange-400" />} label="Forza termica" value={forzaTermica.toFixed(1)} unit="/10" sub={rateoTermico + " m/s"} />
        <BigCard icon={<AlertTriangle className="w-8 h-8 text-amber-400" />} label="Turbolenza" value={turbolenza} unit="" sub={turbolenza === "Forte" ? "Attenzione" : turbolenza === "Moderata" ? "Gestibile" : turbolenza === "Leggera" ? "Ok" : "Nessuna"} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SmallCard icon={<TrendingUp className="w-6 h-6 text-purple-400" />} label="CAPE" value={cape != null ? Math.round(cape) + " J/kg" : "--"} sub={cape != null ? (cape > 1000 ? "Molto instabile" : cape > 500 ? "Instabile" : cape > 200 ? "Moderato" : "Stabile") : undefined} />
        <SmallCard icon={<AlertTriangle className="w-6 h-6 text-amber-400" />} label="Lifted Index" value={liftedIndex != null ? liftedIndex.toFixed(1) + " °C" : "--"} sub={liftedIndex != null ? (liftedIndex < -5 ? "Instabile" : liftedIndex < 0 ? "Leggero" : "Stabile") : undefined} />
        <SmallCard icon={<Cloud className="w-6 h-6 text-blue-400" />} label="CIN" value={cin != null ? Math.round(cin) + " J/kg" : "--"} sub={cin != null ? (cin < -50 ? "Inibizione forte" : cin < -20 ? "Inibizione media" : "Inibizione debole") : undefined} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SmallCard icon={<Droplets className="w-6 h-6 text-sky-400" />} label="Umidità" value={(humidity ?? "--") + "%"} sub={"Rugiada " + Math.round(dewPoint) + "°C"} />
        <SmallCard icon={<Gauge className="w-6 h-6 text-emerald-400" />} label="Pressione" value={Math.round(pressure ?? 1013) + " hPa"} sub={pressure > 1020 ? "Alta" : pressure < 1010 ? "Bassa" : "Normale"} />
        <SmallCard icon={<Cloud className="w-6 h-6 text-slate-400" />} label="Nuvolosità" value={(cloudCover ?? "--") + "%"} sub={cloudCover < 20 ? "Sereno" : cloudCover < 50 ? "Poco" : cloudCover < 80 ? "Nuvoloso" : "Coperto"} />
        <SmallCard icon={<Sun className="w-6 h-6 text-yellow-400" />} label="UV Index" value={uvIndex != null ? uvIndex.toFixed(1) : "--"} sub={uvIndex >= 8 ? "Estremo" : uvIndex >= 6 ? "Alto" : uvIndex >= 3 ? "Moderato" : uvIndex >= 1 ? "Basso" : "Nessuno"} />
        <SmallCard icon={<TrendingUp className="w-6 h-6 text-purple-400" />} label="Gradiente" value={gradienteReale.toFixed(2) + "°"} sub={gradienteLabel + (gradienteReale > 1.2 ? " · Instabile" : gradienteReale > 0.98 ? " · Neutro" : " · Stabile")} />
        <SmallCard icon={<Eye className="w-6 h-6 text-cyan-400" />} label="Delta T" value={Math.round(thermalDelta ?? 0) + "°C"} sub={thermalDelta > 10 ? "Buona escursione" : thermalDelta > 6 ? "Moderata" : "Bassa"} />
      </div>

      <div className="text-center text-sm text-slate-600 border-t border-slate-700/30 pt-3">
        Dati da Open-Meteo · Modello: {modelName || "auto"} · Aggiornamento: {new Date().toLocaleTimeString("it-IT")}
      </div>
    </div>
  );
}

interface WindLevel {
  alt: number;
  speed: number;
  dir: number;
  dirName: string;
}

interface VentiTabProps {
  currentData: any;
  dayData: any[];
  hourlyData?: any[];
  targetHour?: number;
}

function getDisplayProfile(profile: WindLevel[]): WindLevel[] {
  const alts = [4000, 3500, 3000, 2500, 2000, 1500, 1000, 500, 10];
  return alts.map(alt => {
    const exact = profile.find(l => l.alt === alt);
    if (exact) return exact;
    const sorted = [...profile].sort((a, b) => Math.abs(a.alt - alt) - Math.abs(b.alt - alt));
    const nearest = sorted[0];
    if (nearest && Math.abs(nearest.alt - alt) <= 250) return { ...nearest, alt };
    return { alt, speed: 0, dir: 0, dirName: "-" };
  });
}

export function VentiTab({ currentData, hourlyData, targetHour = 12 }: VentiTabProps) {
  const windProfile = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return [];
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setHours(targetHour, 0, 0, 0);
    const entry = hourlyData.find((h: any) => {
      const t = h.time instanceof Date ? h.time : new Date(h.time);
      return t.getHours() === targetHour && t.getFullYear() === targetDate.getFullYear() && t.getMonth() === targetDate.getMonth() && t.getDate() === targetDate.getDate();
    }) || hourlyData[0];
    if (!entry?.windProfile || !Array.isArray(entry.windProfile) || entry.windProfile.length === 0) return [];
    const profile = [
      { alt: 10, speed: currentData?.windSpeed ?? 10, dir: currentData?.windDir ?? 0, dirName: getWindDirName(currentData?.windDir ?? 0) },
      ...entry.windProfile.filter((l: any) => l.speed > 0 && l.dir >= 0).map((l: any) => ({ alt: l.height, speed: l.speed, dir: l.dir, dirName: getWindDirName(l.dir) })),
    ];
    return profile;
  }, [hourlyData, targetHour, currentData]);

  const hasRealData = windProfile.length > 1;

  const displayProfile = useMemo(() => {
    if (hasRealData) return getDisplayProfile(windProfile);
    const est: WindLevel[] = [];
    const alts = [10, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000];
    for (const alt of alts) {
      if (alt === 10) { est.push({ alt, speed: currentData?.windSpeed ?? 10, dir: currentData?.windDir ?? 0, dirName: getWindDirName(currentData?.windDir ?? 0) }); }
      else {
        const factor = 1 + (alt / 1000) * 0.35;
        est.push({ alt, speed: Math.round(Math.min((currentData?.windSpeed ?? 10) * factor, 60) * 10) / 10, dir: ((currentData?.windDir ?? 0) + Math.round((alt / 1000) * 15)) % 360, dirName: getWindDirName(((currentData?.windDir ?? 0) + Math.round((alt / 1000) * 15)) % 360) });
      }
    }
    return est;
  }, [windProfile, hasRealData, currentData]);

  const surfaceGust = currentData?.windGusts ?? Math.round((currentData?.windSpeed ?? 0) * 1.4);

  if (!currentData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Wind className="w-16 h-16 text-slate-600 mb-4" />
        <p className="text-lg font-bold">Nessun dato vento</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={"flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold " + (hasRealData ? "bg-emerald-900/30 border-emerald-500/30 text-emerald-300" : "bg-amber-900/30 border-amber-500/30 text-amber-300")}>
        <Server className="w-4 h-4" />
        {hasRealData ? "Dati reali da Open-Meteo (" + (windProfile.length - 1) + " quote)" : "Dati stimati — vento in quota N/D"}
      </div>

      <div>
        <h4 className="text-base font-bold text-emerald-300 mb-3 flex items-center gap-2"><Wind className="w-5 h-5" /> Profilo vento</h4>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-1">
          {displayProfile.map((level, idx) => {
            const maxSpeed = Math.max(...displayProfile.map(l => l.speed || 0), 1);
            const width = Math.min(100, (level.speed / maxSpeed) * 100);
            const barColor = width < 30 ? "bg-emerald-400" : width < 50 ? "bg-lime-400" : width < 70 ? "bg-amber-400" : width < 90 ? "bg-orange-400" : "bg-red-400";
            return (
              <div key={idx} className="grid grid-cols-[70px_1fr_80px] gap-3 items-center py-2">
                <span className="text-sm text-slate-300 font-bold">{level.alt}m</span>
                <div className="h-7 bg-slate-700/60 rounded-full overflow-hidden">
                  <div className={"h-full rounded-full flex items-center justify-end pr-2 " + barColor} style={{ width: Math.max(width, 20) + "%" }}>
                    <span className="text-sm text-white font-bold">{Math.round(level.speed)}</span>
                  </div>
                </div>
                <span className="text-sm text-slate-300 text-center font-bold">{getWindArrow(level.dir)} {level.dirName}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4 text-center text-sm text-slate-400">
        Vento suolo: {Math.round(currentData.windSpeed)} km/h {getWindArrow(currentData.windDir)} {getWindDirName(currentData.windDir)} ({Math.round(currentData.windDir)}°) · Raffiche {Math.round(surfaceGust)} km/h
      </div>
    </div>
  );
}

interface TermicheTabProps {
  currentData: any;
  dayData: any[];
  site?: { alt: number; lat?: number; lon?: number };
}

export function TermicheTab({ dayData, site }: TermicheTabProps) {
  const alt = site?.alt ?? 1000;
  const termichePerOra = useMemo(() => {
    if (!dayData || dayData.length === 0) return [];
    return dayData.filter((h: any) => { const hh = new Date(h.time).getHours(); return hh >= 8 && hh <= 19; }).map((h: any) => ({ ora: new Date(h.time).getHours(), ...calcolaTermiche(h, alt) })).sort((a, b) => a.ora - b.ora);
  }, [dayData, alt]);

  if (!termichePerOra.length) {
    return <div className="text-center py-16 text-slate-400"><CloudSun className="w-10 h-10 mx-auto mb-3" />Nessun dato termico</div>;
  }

  const media = termichePerOra.reduce((s, t) => s + t.rateo, 0) / termichePerOra.length;
  const maxVal = Math.max(...termichePerOra.map(t => t.rateo));
  const attive = termichePerOra.filter(t => t.rateo >= 0.3).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <TrendingUp className="w-6 h-6 text-amber-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-amber-300">{media.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Media m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <ArrowUp className="w-6 h-6 text-green-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-green-300">{maxVal.toFixed(1)}</div>
          <div className="text-sm text-slate-400">Picco m/s</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <Thermometer className="w-6 h-6 text-orange-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-orange-300">{attive}</div>
          <div className="text-sm text-slate-400">Ore attive</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {termichePerOra.map((t) => (
          <div key={t.ora} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 text-center">
            <div className="text-base font-bold text-slate-200 mb-1">{String(t.ora).padStart(2, "0")}:00</div>
            <div className="text-xl font-bold" style={{ color: t.colore }}>{t.rateo.toFixed(1)} m/s</div>
            <div className="text-sm text-slate-400">{t.label}</div>
            <div className="text-xs text-green-300 mt-1">Base {t.base}m</div>
            <div className="text-xs text-red-300">Top {t.top}m</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AnalisiTabProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
}

export function AnalisiTab({ currentData, dayData, site }: AnalisiTabProps) {
  const analisi = useMemo(() => {
    if (!dayData || dayData.length === 0) return null;
    const alt = site?.alt ?? 1000;
    const oreGiorno = dayData.filter(h => { const hh = h.time.getHours(); return hh >= 8 && hh <= 19; });
    if (oreGiorno.length < 3) return null;

    const tempMax = Math.max(...oreGiorno.map(h => h.temperature));
    const tempMedia = oreGiorno.reduce((s, h) => s + h.temperature, 0) / oreGiorno.length;
    const windMedia = oreGiorno.reduce((s, h) => s + h.windSpeed, 0) / oreGiorno.length;
    const windMax = Math.max(...oreGiorno.map(h => h.windSpeed));
    const windGustsMax = Math.max(...oreGiorno.map(h => h.windGusts || 0));
    const cloudMedia = oreGiorno.reduce((s, h) => s + h.cloudCover, 0) / oreGiorno.length;
    const humidityMedia = oreGiorno.reduce((s, h) => s + h.humidity, 0) / oreGiorno.length;
    const precipTot = oreGiorno.reduce((s, h) => s + (h.precipitation || 0), 0);
    const pressureMed = oreGiorno.reduce((s, h) => s + h.pressure, 0) / oreGiorno.length;
    const dewMedia = oreGiorno.reduce((s, h) => s + h.dewPoint, 0) / oreGiorno.length;
    const uvMedia = oreGiorno.reduce((s, h) => s + (h.uvIndex || 0), 0) / oreGiorno.length;

    const termichePerOra = oreGiorno.map(h => ({ ...calcolaTermiche(h, alt), ora: h.time.getHours() }));
    const rateoMedio = termichePerOra.reduce((s, t) => s + t.rateo, 0) / termichePerOra.length;
    const rateoMax = Math.max(...termichePerOra.map(t => t.rateo));
    const oreAttive = termichePerOra.filter(t => t.rateo >= 0.3).length;
    const mediaSpread = tempMedia - dewMedia;
    const baseLCL = Math.max(200, Math.min(3000, Math.round(mediaSpread * 125)));

    const dirs = oreGiorno.map(h => h.windDir).filter(d => d != null);
    const dirCount: Record<number, number> = {};
    for (const d of dirs) dirCount[Math.round(d / 45) * 45] = (dirCount[Math.round(d / 45) * 45] || 0) + 1;
    const dirDom = Object.entries(dirCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const dirDomNum = dirDom ? parseInt(dirDom) : (currentData?.windDir ?? 0);
    const zeroTermico = Math.max(0, Math.round(alt + (tempMedia / 0.0098) + 200));
    const tempMin = Math.min(...oreGiorno.map(h => h.temperature));
    const deltaTermico = Math.round((tempMax - tempMin) * 10) / 10;

    let gradienteReale = 0.98;
    if (currentData?.temp80m != null) gradienteReale = ((currentData.temperature - currentData.temp80m) / 78) * 100;
    else if (currentData?.temp120m != null) gradienteReale = ((currentData.temperature - currentData.temp120m) / 118) * 100;

    let forza = 0;
    if (gradienteReale >= 1.2) forza += 3; else if (gradienteReale >= 0.98) forza += 2; else if (gradienteReale >= 0.7) forza += 1;
    if (windMedia >= 5 && windMedia <= 15) forza += 2; else if (windMedia >= 3 && windMedia < 5) forza += 1.5; else if (windMedia > 15 && windMedia <= 22) forza += 1;
    if (cloudMedia >= 15 && cloudMedia <= 45) forza += 2; else if (cloudMedia >= 5 && cloudMedia < 15) forza += 1.5;
    if (humidityMedia >= 30 && humidityMedia <= 50) forza += 1.5; else if (humidityMedia > 50 && humidityMedia <= 65) forza += 1;
    forza = Math.min(10, Math.max(0, Math.round(forza * 10) / 10));
    const rafficaMedia = oreGiorno.reduce((s, h) => s + (h.windGusts || h.windSpeed * 1.4), 0) / oreGiorno.length;

    let score = 5;
    if (windMedia >= 5 && windMedia <= 12) score += 2; else if (windMedia > 18) score -= 1;
    if (precipTot === 0) score += 2; else if (precipTot < 0.5) score += 1;
    if (cloudMedia >= 10 && cloudMedia <= 55) score += 1;
    if (rateoMedio >= 2) score += 2; else if (rateoMedio >= 1) score += 1;
    if (windMax > 30) score -= 1;
    score = Math.max(0, Math.min(10, score));

    return {
      tempMax: Math.round(tempMax), tempMedia: Math.round(tempMedia), windMedia: Math.round(windMedia),
      windMax: Math.round(windMax), windGustsMax: Math.round(windGustsMax), cloudMedia: Math.round(cloudMedia),
      humidityMedia: Math.round(humidityMedia), precipTot: Math.round(precipTot * 10) / 10,
      pressureMed: Math.round(pressureMed), uvMedia: Math.round(uvMedia * 10) / 10,
      rateoMedio: Math.round(rateoMedio * 10) / 10, rateoMax: Math.round(rateoMax * 10) / 10,
      oreAttive, baseLCL, zeroTermico, deltaTermico, gradienteReale: Math.round(gradienteReale * 100) / 100,
      forzaTermica: forza, turbolenza: rafficaMedia > 30 ? "Forte" : rafficaMedia > 22 ? "Moderata" : rafficaMedia > 14 ? "Leggera" : "Assente",
      dirDom: dirDomNum, dirName: getWindDirName(dirDomNum), score,
      scoreEmoji: score >= 8 ? "🪂🔥" : score >= 6 ? "🪂" : score >= 4 ? "🌤️" : "❌",
      totaleOre: termichePerOra.length,
    };
  }, [dayData, currentData, site]);

  if (!analisi) {
    return <div className="text-center py-12 text-slate-400 text-base"><Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />Dati insufficienti per generare l'analisi.</div>;
  }

  const scoreColor = analisi.score >= 8 ? "text-emerald-400" : analisi.score >= 6 ? "text-lime-400" : analisi.score >= 4 ? "text-amber-400" : "text-red-400";
  const score<dyad-write path="src/components/MeteoTabs.tsx" description="Fix the incomplete scoreBgClass assignment">
  const scoreColor = analisi.score >= 8 ? "text-emerald-400" : analisi.score >= 6 ? "text-lime-400" : analisi.score >= 4 ? "text-amber-400" : "text-red-400";
  const scoreBgClass = analisi.score >= 8 ? "bg-emerald-900/30 border-emerald-500/30" : analisi.score >= 6 ? "bg-lime-900/30 border-lime-500/30" : analisi.score >= 4 ? "bg-amber-900/30 border-amber-500/30" : "bg-red-900/30 border-red-500/30";

  return (
    <div className="space-y-4">
      <div className={"rounded-2xl border-2 p-5 " + scoreBgClass}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{analisi.scoreEmoji}</span>
            <div>
              <div className="text-lg font-bold text-white">
                Giudizio volo: <span className={scoreColor}>{analisi.score}/10</span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                {analisi.score >= 8 ? "Condizioni eccellenti per il volo libero." :
                 analisi.score >= 6 ? "Buone condizioni per il volo." :
                 analisi.score >= 4 ? "Condizioni discrete. Volo possibile." :
                 "Condizioni difficili. Sconsigliato."}
              </p>
            </div>
          </div>
          <div className="w-16 h-16 shrink-0 relative">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={(analisi.score / 10) * 100 + " 100"} strokeLinecap="round" className={scoreColor} />
            </svg>
            <span className={"absolute inset-0 flex items-center justify-center text-lg font-bold " + scoreColor}>{analisi.score}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard icon={<Thermometer className="w-5 h-5 text-amber-400" />} label="Temperatura" value={analisi.tempMedia + "°C"} sub={"max " + analisi.tempMax + "°C"} />
        <MetricCard icon={<Wind className="w-5 h-5 text-sky-400" />} label="Vento medio" value={analisi.windMedia + " km/h"} sub={"max " + analisi.windMax + " · raffiche " + analisi.windGustsMax} />
        <MetricCard icon={<ArrowUp className="w-5 h-5 text-orange-400" />} label="Termiche" value={analisi.rateoMedio + " m/s"} sub={"picco " + analisi.rateoMax + " · " + analisi.oreAttive + "/" + analisi.totaleOre + "h"} />
        <MetricCard icon={<Cloud className="w-5 h-5 text-slate-400" />} label="Nuvolosità" value={analisi.cloudMedia + "%"} sub={analisi.cloudMedia < 20 ? "Sereno" : analisi.cloudMedia < 40 ? "Poco nuvoloso" : analisi.cloudMedia < 60 ? "Nuvoloso" : "Coperto"} />
        <MetricCard icon={<Droplets className="w-5 h-5 text-blue-400" />} label="Umidità" value={analisi.humidityMedia + "%"} sub={analisi.humidityMedia < 40 ? "Aria secca" : analisi.humidityMedia < 60 ? "Normale" : "Aria umida"} />
        <MetricCard icon={<Gauge className="w-5 h-5 text-purple-400" />} label="Pressione" value={analisi.pressureMed + " hPa"} sub={analisi.pressureMed > 1020 ? "Alta" : analisi.pressureMed < 1010 ? "Bassa" : "Normale"} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-sm font-bold text-orange-300 mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Termiche</h4>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between"><span>Base nuvole (LCL):</span><span className="font-bold text-green-300">{analisi.baseLCL} m</span></div>
            <div className="flex justify-between"><span>Zero termico:</span><span className="font-bold text-amber-300">{analisi.zeroTermico} m</span></div>
            <div className="flex justify-between"><span>Gradiente reale:</span><span className={"font-bold " + (analisi.gradienteReale > 1.2 ? "text-red-300" : analisi.gradienteReale > 0.98 ? "text-amber-300" : "text-green-300")}>{analisi.gradienteReale} °C/100m</span></div>
            <div className="flex justify-between"><span>Forza termica:</span><span className="font-bold text-white">{analisi.forzaTermica}/10</span></div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2"><Wind className="w-4 h-4" /> Vento & atmosfera</h4>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between"><span>Direzione dominante:</span><span className="font-bold text-white">{analisi.dirName} ({analisi.dirDom}°)</span></div>
            <div className="flex justify-between"><span>Turbolenza:</span><span className={"font-bold " + (analisi.turbolenza === "Forte" ? "text-red-300" : analisi.turbolenza === "Moderata" ? "text-amber-300" : "text-green-300")}>{analisi.turbolenza}</span></div>
            <div className="flex justify-between"><span>UV Index medio:</span><span className="font-bold text-yellow-300">{analisi.uvMedia}</span></div>
            <div className="flex justify-between"><span>Pioggia totale:</span><span className={"font-bold " + (analisi.precipTot > 1 ? "text-blue-300" : "text-green-300")}>{analisi.precipTot === 0 ? "Assente" : analisi.precipTot + " mm"}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}