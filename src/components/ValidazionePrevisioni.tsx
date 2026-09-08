"use client";

import React, { useEffect, useState } from "react";
import { DECOLLI } from "@/data/decolli";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Bug, Activity, Clock, TrendingUp } from "lucide-react";

const CLIMA_MENSILE: Record<number, { tempMax: [number, number]; ventoMedio: [number, number]; pioggiaMax: number; deltaMin: number }> = {
  1:  { tempMax: [-5, 5],   ventoMedio: [3, 15], pioggiaMax: 15, deltaMin: 3 },
  2:  { tempMax: [-3, 8],   ventoMedio: [3, 16], pioggiaMax: 15, deltaMin: 3 },
  3:  { tempMax: [0, 12],   ventoMedio: [4, 18], pioggiaMax: 20, deltaMin: 4 },
  4:  { tempMax: [5, 18],   ventoMedio: [4, 18], pioggiaMax: 25, deltaMin: 5 },
  5:  { tempMax: [10, 24],  ventoMedio: [4, 16], pioggiaMax: 30, deltaMin: 6 },
  6:  { tempMax: [14, 30],  ventoMedio: [3, 14], pioggiaMax: 30, deltaMin: 8 },
  7:  { tempMax: [16, 34],  ventoMedio: [3, 12], pioggiaMax: 25, deltaMin: 10 },
  8:  { tempMax: [15, 32],  ventoMedio: [3, 12], pioggiaMax: 25, deltaMin: 9 },
  9:  { tempMax: [10, 26],  ventoMedio: [4, 14], pioggiaMax: 25, deltaMin: 7 },
  10: { tempMax: [5, 20],   ventoMedio: [4, 16], pioggiaMax: 20, deltaMin: 5 },
  11: { tempMax: [0, 12],   ventoMedio: [4, 18], pioggiaMax: 20, deltaMin: 3 },
  12: { tempMax: [-3, 7],   ventoMedio: [3, 16], pioggiaMax: 15, deltaMin: 3 },
};

interface EsitoValidazione {
  siteId: string;
  siteName: string;
  giorno: string;
  data: string;
  altitudine: number;
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
    umiditaMedia: number;
  };
  climatologiaOk: boolean;
  anomalie: string[];
}

let totalSiti = 0;
let okSiti = 0;
let totalWarning = 0;
let totalErrori = 0;
let totalAnomalie = 0;
let avgTempoRisposta = 0;

export default function ValidazionePrevisioni() {
  const [risultati, setRisultati] = useState<EsitoValidazione[]>([]);
  const [loading, setLoading] = useState(true);
  const [fase, setFase] = useState("");
  const [progresso, setProgresso] = useState({ corrente: 0, totale: 0 });

  useEffect(() => {
    let attivo = true;
    const esegui = async () => {
      setLoading(true);
      const tutti: EsitoValidazione[] = [];
      const oggi = new Date();
      const mese = oggi.getMonth() + 1;
      const clima = CLIMA_MENSILE[mese] || CLIMA_MENSILE[6];

      const giorniDaTestare = [1, 2];
      const totale = giorniDaTestare.length * DECOLLI.length;
      setProgresso({ corrente: 0, totale });

      for (const giornoOffset of giorniDaTestare) {
        const target = new Date(oggi);
        target.setDate(oggi.getDate() + giornoOffset);
        const dataStr = target.toISOString().split("T")[0];
        const giornoLabel = giornoOffset === 1 ? "Domani" : "Dopodomani";

        for (let i = 0; i < DECOLLI.length; i++) {
          if (!attivo) return;
          const d = DECOLLI[i];
          const idx = (giorniDaTestare.indexOf(giornoOffset) * DECOLLI.length) + i + 1;
          setProgresso({ corrente: idx, totale });
          setFase(`${giornoLabel}: ${d.name} (${idx}/${totale})`);

          try {
            const startTime = performance.now();
            const params = new URLSearchParams({
              latitude: d.lat.toString(),
              longitude: d.lon.toString(),
              hourly: "temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation,cloud_cover,relative_humidity_2m",
              timezone: "Europe/Rome",
              start_date: dataStr,
              end_date: dataStr,
            });

            const { fetchWithProxyFallback } = await import("@/utils/proxyFallback");
            const res = await fetchWithProxyFallback(params.toString());
            const responseTime = Math.round(performance.now() - startTime);
            avgTempoRisposta += responseTime;

            if (!res.ok) {
              tutti.push({
                siteId: d.id, siteName: d.name, giorno: giornoLabel, data: dataStr, altitudine: d.altitude,
                ok: false, errori: [`HTTP ${res.status} (${responseTime}ms)`], warning: [],
                metriche: { tempMax: -999, tempMin: -999, ventoMedio: -1, ventoMax: -1, pioggiaTot: -1, nuvoleMedia: -1, deltaTermico: -1, oreConDati: 0, umiditaMedia: -1 },
                climatologiaOk: false, anomalie: [],
              });
              continue;
            }

            const raw = await res.json();
            const temps: number[] = raw.hourly.temperature_2m || [];
            const winds: number[] = raw.hourly.wind_speed_10m || [];
            const rains: number[] = raw.hourly.precipitation || [];
            const clouds: number[] = raw.hourly.cloud_cover || [];
            const hums: number[] = raw.hourly.relative_humidity_2m || [];

            const oreValide = temps.filter((t: number) => t != null).length;
            const filteredTemps = temps.filter((t: number) => t != null);
            const filteredWinds = winds.filter((w: number) => w != null);

            const metriche = {
              tempMax: filteredTemps.length > 0 ? Math.round(Math.max(...filteredTemps)) : -999,
              tempMin: filteredTemps.length > 0 ? Math.round(Math.min(...filteredTemps)) : -999,
              ventoMedio: filteredWinds.length > 0 ? Math.round(filteredWinds.reduce((s: number, v: number) => s + v, 0) / filteredWinds.length) : -1,
              ventoMax: filteredWinds.length > 0 ? Math.round(Math.max(...filteredWinds)) : -1,
              pioggiaTot: rains.length > 0 ? Math.round(rains.reduce((s: number, v: number) => s + (v || 0), 0) * 10) / 10 : -1,
              nuvoleMedia: clouds.length > 0 ? Math.round(clouds.reduce((s: number, v: number) => s + (v || 0), 0) / clouds.length) : -1,
              deltaTermico: filteredTemps.length > 0 ? Math.round(Math.max(...filteredTemps) - Math.min(...filteredTemps)) : -1,
              oreConDati: oreValide,
              umiditaMedia: hums.length > 0 ? Math.round(hums.reduce((s: number, v: number) => s + (v || 0), 0) / hums.length) : -1,
            };

            const errori: string[] = [];
            const warning: string[] = [];
            const anomalie: string[] = [];

            if (metriche.tempMax > 50 || metriche.tempMax < -30) errori.push(`Temp max non realistica: ${metriche.tempMax}°C`);
            if (metriche.tempMin > metriche.tempMax && metriche.tempMin > -800) errori.push(`Temp min (${metriche.tempMin}°C) > temp max (${metriche.tempMax}°C)`);
            if (metriche.ventoMax > 80) errori.push(`Vento max non realistico: ${metriche.ventoMax} km/h`);
            if (metriche.ventoMedio > metriche.ventoMax && metriche.ventoMax > 0) errori.push(`Vento medio (${metriche.ventoMedio}) > vento max (${metriche.ventoMax})`);
            if (metriche.nuvoleMedia < 0 || metriche.nuvoleMedia > 100) errori.push(`Nuvolosità fuori range: ${metriche.nuvoleMedia}%`);
            if (metriche.oreConDati < 6) errori.push(`Solo ${metriche.oreConDati} ore di dati su 12 attese`);
            if (metriche.pioggiaTot > 80) errori.push(`Pioggia totale eccessiva: ${metriche.pioggiaTot} mm`);

            const rangeTemp = clima.tempMax;
            const rangeVento = clima.ventoMedio;
            const maxPioggia = clima.pioggiaMax;
            const minDelta = clima.deltaMin;

            if (metriche.tempMax < rangeTemp[0] || metriche.tempMax > rangeTemp[1]) {
              anomalie.push(`Temp max ${metriche.tempMax}°C fuori range climatologico [${rangeTemp[0]}, ${rangeTemp[1]}]°C per ${mese}/${oggi.getFullYear()}`);
            }
            if (metriche.ventoMedio >= 0 && (metriche.ventoMedio < rangeVento[0] || metriche.ventoMedio > rangeVento[1])) {
              anomalie.push(`Vento medio ${metriche.ventoMedio} km/h fuori range [${rangeVento[0]}, ${rangeVento[1]}] km/h`);
            }
            if (metriche.pioggiaTot > maxPioggia * 1.5) {
              anomalie.push(`Pioggia ${metriche.pioggiaTot}mm > ${maxPioggia}mm attesi (x1.5)`);
            }
            if (metriche.deltaTermico >= 0 && metriche.deltaTermico < minDelta && metriche.nuvoleMedia < 50) {
              anomalie.push(`Delta termico ${metriche.deltaTermico}°C < ${minDelta}°C attesi ma cielo ${metriche.nuvoleMedia < 30 ? "sereno" : "poco nuvoloso"}`);
            }
            if (metriche.pioggiaTot > 5 && metriche.nuvoleMedia < 15) {
              anomalie.push(`Pioggia ${metriche.pioggiaTot}mm ma solo ${metriche.nuvoleMedia}% nuvole — incoerenza`);
            }
            if (metriche.tempMax < -5 && d.altitude < 2000) {
              anomalie.push(`Temp max sottozero (${metriche.tempMax}°C) a ${d.altitude}m — possibile errore modello`);
            }

            if (anomalie.length > 0) {
              warning.push(...anomalie.slice(0, 3));
              totalAnomalie++;
            }

            const climatologiaOk = anomalie.length === 0;

            tutti.push({
              siteId: d.id, siteName: d.name, giorno: giornoLabel, data: dataStr, altitudine: d.altitude,
              ok: errori.length === 0, errori, warning,
              metriche,
              climatologiaOk,
              anomalie,
            });
            totalSiti++;
            if (errori.length === 0) okSiti++;
            totalErrori += errori.length;
            totalWarning += warning.length;
          } catch (err) {
            tutti.push({
              siteId: d.id, siteName: d.name, giorno: giornoLabel, data: dataStr, altitudine: d.altitude,
              ok: false, errori: [err instanceof Error ? err.message : "Errore sconosciuto"], warning: [],
              metriche: { tempMax: -999, tempMin: -999, ventoMedio: -1, ventoMax: -1, pioggiaTot: -1, nuvoleMedia: -1, deltaTermico: -1, oreConDati: 0, umiditaMedia: -1 },
              climatologiaOk: false, anomalie: [],
            });
          }

          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (attivo) {
        setRisultati(tutti);
        setLoading(false);
        setFase("");
      }
    };

    totalSiti = 0;
    okSiti = 0;
    totalWarning = 0;
    totalErrori = 0;
    totalAnomalie = 0;
    avgTempoRisposta = 0;
    esegui();
    return () => { attivo = false; };
  }, []);

  if (loading) {
    const pct = progresso.totale > 0 ? Math.round((progresso.corrente / progresso.totale) * 100) : 0;
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col items-center justify-center">
        <Loader2 className="w-14 h-14 text-emerald-400 animate-spin mb-4" />
        <p className="text-emerald-300 text-lg font-bold mb-2">Validazione previsioni in corso...</p>
        <p className="text-slate-400 text-sm mb-1">{fase}</p>
        <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-slate-500 text-xs mt-2">{progresso.corrente}/{progresso.totale} ({pct}%)</p>
        <p className="text-slate-600 text-xs mt-1">~2 minuti rimanenti...</p>
      </div>
    );
  }

  if (risultati.length === 0) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col items-center justify-center">
        <AlertTriangle className="w-14 h-14 text-amber-400 mb-4" />
        <p className="text-slate-300 text-lg">Nessun risultato — errore di connessione!</p>
      </div>
    );
  }

  const totali = risultati.length;
  const ok = risultati.filter(r => r.ok && r.climatologiaOk).length;
  const ko = risultati.filter(r => !r.ok || !r.climatologiaOk).length;
  const mediaResponse = avgTempoRisposta / totali;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <Bug className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-white">Validazione previsioni meteo</span>
          <span className="text-xs text-slate-500">{totali} test</span>
          <span className="text-xs text-slate-500"><Activity className="w-3 h-3 inline" /> {Math.round(mediaResponse)}ms media</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-400">✅ {ok} ok</span>
          <span className={ko > 0 ? "text-red-400" : "text-green-400"}>❌ {ko} anomalie</span>
          <span className="text-amber-400">⚠️ {totalWarning} warn</span>
          <span className="text-red-400">{totalErrori} err</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-1.5">
        {risultati.map((r, i) => (
          <div key={i} className={`rounded-xl p-3 border text-xs ${
            r.ok && r.climatologiaOk
              ? "bg-slate-800/40 border-slate-700/30"
              : !r.ok
              ? "bg-red-900/20 border-red-800/40"
              : "bg-amber-900/20 border-amber-800/40"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {r.ok && r.climatologiaOk ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="font-bold text-white">{r.siteName}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  r.giorno === "Domani" ? "bg-amber-900/30 text-amber-300" : "bg-blue-900/30 text-blue-300"
                }`}>{r.giorno}</span>
                <span className="text-slate-500">({r.altitudine}m)</span>
              </div>
              <span className="text-slate-500">{r.data}</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-1.5">
              <div className="bg-slate-900/60 rounded-lg px-2 py-1 text-center"><div className="text-slate-500">Max</div><div className="font-bold text-amber-300">{r.metriche.tempMax}°</div></div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1 text-center"><div className="text-slate-500">Min</div><div className="font-bold text-blue-300">{r.metriche.tempMin}°</div></div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1 text-center"><div className="text-slate-500">ΔT</div><div className={`font-bold ${r.metriche.deltaTermico >= 8 ? "text-green-300" : "text-amber-300"}`}>{r.metriche.deltaTermico}°</div></div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1 text-center"><div className="text-slate-500">Vento</div><div className="font-bold text-cyan-300">{r.metriche.ventoMedio}/{r.metriche.ventoMax}</div></div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1 text-center"><div className="text-slate-500">Pioggia</div><div className={`font-bold ${r.metriche.pioggiaTot > 0 ? "text-blue-300" : "text-green-300"}`}>{r.metriche.pioggiaTot > 0 ? `${r.metriche.pioggiaTot}mm` : "0mm"}</div></div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1 text-center"><div className="text-slate-500">Nuvole</div><div className="font-bold text-slate-300">{r.metriche.nuvoleMedia}%</div></div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1 text-center"><div className="text-slate-500">Ore</div><div className="font-bold text-slate-300">{r.metriche.oreConDati}</div></div>
              <div className="bg-slate-900/60 rounded-lg px-2 py-1 text-center"><div className="text-slate-500">Clima</div>{r.climatologiaOk ? <div className="font-bold text-green-300">✅</div> : <div className="font-bold text-amber-300">⚠️</div>}</div>
            </div>

            {r.anomalie.length > 0 && (
              <div className="text-[10px] text-amber-400 space-y-0.5 mt-1">
                {r.anomalie.map((a, j) => (
                  <div key={j} className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 shrink-0" />{a}</div>
                ))}
              </div>
            )}
            {r.errori.length > 0 && (
              <div className="text-[10px] text-red-400 space-y-0.5 mt-1">
                {r.errori.map((e, j) => (
                  <div key={j} className="flex items-center gap-1"><XCircle className="w-3 h-3 shrink-0" />{e}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}