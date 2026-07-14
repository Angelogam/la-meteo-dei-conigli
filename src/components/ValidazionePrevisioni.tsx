"use client";

import React, { useEffect, useState } from "react";
import { DECOLLI } from "@/data/decolli";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Bug } from "lucide-react";

interface EsitoValidazione {
  siteId: string;
  siteName: string;
  giorno: string;
  data: string;
  ok: boolean;
  errori: string[];
  warning: string[];
  metriche: {
    tempMax: number;
    tempMin: number;
    ventoMedio: number;
    ventoMax: number;
    pioggiaTot: number;
    nuvoleMedia: number;
    deltaTermico: number;
    oreConDati: number;
  };
}

function validaMetriche(m: EsitoValidazione["metriche"], altitudine: number): { errori: string[]; warning: string[] } {
  const errori: string[] = [];
  const warning: string[] = [];

  if (m.tempMax > 50 || m.tempMax < -20) errori.push(`Temperatura max non realistica: ${m.tempMax}°C`);
  if (m.tempMin > m.tempMax) errori.push(`Temp min (${m.tempMin}°C) > temp max (${m.tempMax}°C)`);
  if (m.deltaTermico > 30) warning.push(`Delta termico eccessivo: ${m.deltaTermico}°C`);
  if (m.ventoMax > 80) errori.push(`Vento max non realistico: ${m.ventoMax} km/h`);
  if (m.ventoMedio > m.ventoMax) errori.push(`Vento medio > vento max`);
  if (m.pioggiaTot > 100) errori.push(`Pioggia totale eccessiva: ${m.pioggiaTot} mm`);
  if (m.nuvoleMedia < 0 || m.nuvoleMedia > 100) errori.push(`Nuvolosità fuori range: ${m.nuvoleMedia}%`);
  if (m.oreConDati < 6) errori.push(`Solo ${m.oreConDati} ore di dati su 12 attese`);
  if (m.deltaTermico < 2 && m.nuvoleMedia < 30) warning.push(`Delta termico bassissimo (${m.deltaTermico}°C) nonostante cielo sereno`);
  if (m.pioggiaTot > 5 && m.nuvoleMedia < 20) warning.push(`Pioggia (${m.pioggiaTot}mm) con poche nuvole (${m.nuvoleMedia}%) — possibile incoerenza`);
  if (m.tempMax < 0 && altitudine < 2000) warning.push(`Temperatura max sottozero (${m.tempMax}°C) a ${altitudine}m — verifica`);

  return { errori, warning };
}

export default function ValidazionePrevisioni() {
  const [risultati, setRisultati] = useState<EsitoValidazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [fase, setFase] = useState("");

  useEffect(() => {
    let attivo = true;
    const esegui = async () => {
      setLoading(true);
      const tutti: EsitoValidazione[] = [];

      for (const giornoOffset of [1, 2]) {
        const oggi = new Date();
        const target = new Date(oggi);
        target.setDate(oggi.getDate() + giornoOffset);
        const dataStr = target.toISOString().split("T")[0];
        const giornoLabel = giornoOffset === 1 ? "Domani" : "Dopodomani";

        for (let i = 0; i < DECOLLI.length; i++) {
          if (!attivo) return;
          const d = DECOLLI[i];
          setFase(`${giornoLabel}: ${d.name} (${i + 1}/${DECOLLI.length})`);

          try {
            const params = new URLSearchParams({
              latitude: d.lat.toString(),
              longitude: d.lon.toString(),
              hourly: "temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation,cloud_cover,relative_humidity_2m",
              timezone: "Europe/Rome",
              start_date: dataStr,
              end_date: dataStr,
            });

            const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
            if (!res.ok) {
              tutti.push({
                siteId: d.id, siteName: d.name, giorno: giornoLabel, data: dataStr,
                ok: false, errori: [`HTTP ${res.status}`], warning: [],
                metriche: { tempMax: 0, tempMin: 0, ventoMedio: 0, ventoMax: 0, pioggiaTot: 0, nuvoleMedia: 0, deltaTermico: 0, oreConDati: 0 },
              });
              continue;
            }

            const raw = await res.json();
            const temps: number[] = raw.hourly.temperature_2m || [];
            const winds: number[] = raw.hourly.wind_speed_10m || [];
            const gusts: number[] = raw.hourly.wind_gusts_10m || [];
            const rains: number[] = raw.hourly.precipitation || [];
            const clouds: number[] = raw.hourly.cloud_cover || [];

            // Solo ore 6-21
            const oreValide = temps.length;
            const filteredTemps = temps.filter((t: number) => t != null);
            const filteredWinds = winds.filter((w: number) => w != null);

            const metriche = {
              tempMax: filteredTemps.length > 0 ? Math.round(Math.max(...filteredTemps)) : 0,
              tempMin: filteredTemps.length > 0 ? Math.round(Math.min(...filteredTemps)) : 0,
              ventoMedio: filteredWinds.length > 0 ? Math.round(filteredWinds.reduce((s: number, v: number) => s + v, 0) / filteredWinds.length) : 0,
              ventoMax: filteredWinds.length > 0 ? Math.round(Math.max(...filteredWinds)) : 0,
              pioggiaTot: Math.round(rains.reduce((s: number, v: number) => s + (v || 0), 0) * 10) / 10,
              nuvoleMedia: clouds.length > 0 ? Math.round(clouds.reduce((s: number, v: number) => s + (v || 0), 0) / clouds.length) : 0,
              deltaTermico: filteredTemps.length > 0 ? Math.round(Math.max(...filteredTemps) - Math.min(...filteredTemps)) : 0,
              oreConDati: oreValide,
            };

            const { errori, warning } = validaMetriche(metriche, d.altitude);

            tutti.push({
              siteId: d.id, siteName: d.name, giorno: giornoLabel, data: dataStr,
              ok: errori.length === 0, errori, warning,
              metriche,
            });
          } catch (err) {
            tutti.push({
              siteId: d.id, siteName: d.name, giorno: giornoLabel, data: dataStr,
              ok: false, errori: [err instanceof Error ? err.message : "Errore sconosciuto"], warning: [],
              metriche: { tempMax: 0, tempMin: 0, ventoMedio: 0, ventoMax: 0, pioggiaTot: 0, nuvoleMedia: 0, deltaTermico: 0, oreConDati: 0 },
            });
          }

          // Delay 2s tra ogni sito per non superare rate limit
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (attivo) {
        setRisultati(tutti);
        setLoading(false);
        setFase("");
      }
    };

    esegui();
    return () => { attivo = false; };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
        <p className="text-emerald-300 text-lg font-bold mb-2">Validazione previsioni in corso...</p>
        <p className="text-slate-400 text-sm">{fase}</p>
        <p className="text-slate-500 text-xs mt-2">(ci vogliono circa 2 minuti — 42 decolli × 2 giorni)</p>
      </div>
    );
  }

  if (risultati.length === 0) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
        <p className="text-slate-300 text-lg">Nessun risultato — errore di connessione?</p>
      </div>
    );
  }

  const totali = risultati.length;
  const ok = risultati.filter(r => r.ok).length;
  const ko = risultati.filter(r => !r.ok).length;
  const totalWarnings = risultati.reduce((s, r) => s + r.warning.length, 0);
  const totalErrors = risultati.reduce((s, r) => s + r.errori.length, 0);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <Bug className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-white">Validazione previsioni</span>
          <span className="text-xs text-slate-500">{totali} test</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-400">✅ {ok} ok</span>
          <span className={`${ko > 0 ? "text-red-400" : "text-green-400"}`}>❌ {ko} ko</span>
          <span className="text-amber-400">⚠️ {totalWarnings} warn</span>
          <span className="text-red-400">{totalErrors} err</span>
        </div>
      </div>

      {/* Risultati */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {risultati.map((r, i) => (
          <div
            key={i}
            className={`rounded-xl p-4 border ${
              r.ok
                ? "bg-slate-800/30 border-slate-700/30"
                : "bg-red-900/20 border-red-800/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {r.ok ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="font-bold text-white">{r.siteName}</span>
                <span className="text-xs text-slate-500">({r.siteId})</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  r.giorno === "Domani"
                    ? "bg-amber-900/30 text-amber-300"
                    : "bg-blue-900/30 text-blue-300"
                }`}>
                  {r.giorno}
                </span>
              </div>
              <span className="text-xs text-slate-500">{r.data}</span>
            </div>

            {/* Metriche */}
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-xs mb-2">
              <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 text-center">
                <div className="text-slate-500">Max</div>
                <div className="font-bold text-amber-300">{r.metriche.tempMax}°</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 text-center">
                <div className="text-slate-500">Min</div>
                <div className="font-bold text-blue-300">{r.metriche.tempMin}°</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 text-center">
                <div className="text-slate-500">ΔT</div>
                <div className="font-bold text-purple-300">{r.metriche.deltaTermico}°</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 text-center">
                <div className="text-slate-500">Vento</div>
                <div className="font-bold text-cyan-300">{r.metriche.ventoMedio}/{r.metriche.ventoMax}</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 text-center">
                <div className="text-slate-500">Pioggia</div>
                <div className={`font-bold ${r.metriche.pioggiaTot > 0 ? "text-blue-300" : "text-green-300"}`}>
                  {r.metriche.pioggiaTot}mm
                </div>
              </div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 text-center">
                <div className="text-slate-500">Nuvole</div>
                <div className="font-bold text-slate-300">{r.metriche.nuvoleMedia}%</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 text-center">
                <div className="text-slate-500">Ore</div>
                <div className="font-bold text-slate-300">{r.metriche.oreConDati}</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1.5 text-center">
                <div className="text-slate-500">Quota</div>
                <div className="font-bold text-amber-300">{DECOLLI.find(d => d.id === r.siteId)?.altitude ?? "?"}m</div>
              </div>
            </div>

            {/* Errori e warning */}
            {r.errori.length > 0 && (
              <div className="text-xs text-red-400 space-y-0.5 mt-1">
                {r.errori.map((e, j) => (
                  <div key={j} className="flex items-center gap-1.5">
                    <XCircle className="w-3 h-3 shrink-0" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            )}
            {r.warning.length > 0 && (
              <div className="text-xs text-amber-400 space-y-0.5 mt-1">
                {r.warning.map((w, j) => (
                  <div key={j} className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}