"use client";

import React, { useMemo } from "react";
import { Sun, Thermometer, Wind, Cloud, CloudRain, CloudLightning, TrendingUp, ShieldCheck, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import type { HourData } from "@/types/meteo";

interface AnalisiMeteoProps {
  currentData: HourData | null;
  dayData: HourData[];
  site: { alt: number; lat?: number; lon?: number; name?: string; exposure?: string };
  cape?: number | null;
  liftedIndex?: number | null;
  cin?: number | null;
}

function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function getWindDirName(deg: number): string {
  if (deg == null) return "N/D";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getCloudDescription(cover: number): string {
  if (cover < 10) return "sereno";
  if (cover < 25) return "poco nuvoloso";
  if (cover < 45) return "parzialmente nuvoloso";
  if (cover < 65) return "nuvoloso";
  if (cover < 85) return "molto nuvoloso";
  return "coperto";
}

function getUmiditaDescrizione(hum: number): string {
  if (hum < 30) return "molto secca, ottima visibilità";
  if (hum < 50) return "secca, buona visibilità";
  if (hum < 65) return "moderata, visibilità discreta";
  if (hum < 80) return "umida, visibilità ridotta";
  return "molto umida, possibile foschia";
}

function getPressioneDescrizione(press: number): string {
  if (press > 1025) return "alta, tempo stabile";
  if (press > 1015) return "moderatamente alta, condizioni discrete";
  if (press > 1005) return "nella norma";
  if (press > 995) return "in calo, possibile peggioramento";
  return "bassa, condizioni instabili";
}

function getRischioBg(r: number): string {
  if (r >= 70) return "bg-red-900/30 border-red-500/40";
  if (r >= 40) return "bg-orange-900/30 border-orange-500/40";
  if (r >= 15) return "bg-amber-900/30 border-amber-500/40";
  if (r >= 5) return "bg-yellow-900/20 border-yellow-500/30";
  return "bg-green-900/20 border-green-500/30";
}

function getRischioText(r: number): string {
  if (r >= 70) return "text-red-400";
  if (r >= 40) return "text-orange-400";
  if (r >= 15) return "text-amber-400";
  if (r >= 5) return "text-yellow-400";
  return "text-green-400";
}

function getRischioBar(r: number): string {
  if (r >= 70) return "bg-red-500";
  if (r >= 40) return "bg-orange-500";
  if (r >= 15) return "bg-amber-500";
  if (r >= 5) return "bg-yellow-500";
  return "bg-green-500";
}

interface Validazione {
  ok: boolean;
  testSuperati: number;
  testTotali: number;
  anomalie: string[];
  metriche: {
    tempRangeOk: boolean;
    windRangeOk: boolean;
    cloudRangeOk: boolean;
    humidityRangeOk: boolean;
    pressureRangeOk: boolean;
    precipCoerenzaOk: boolean;
    windCoerenzaOk: boolean;
    temporalConsistency: boolean;
  };
}

function validaDati(temperature: number[], humidity: number[], windSpeed: number[], cloudCover: number[], pressure: number[], precipitation: number[], windGusts: number[]): Validazione {
  const anomalie: string[] = [];
  const metriche = {
    tempRangeOk: true,
    windRangeOk: true,
    cloudRangeOk: true,
    humidityRangeOk: true,
    pressureRangeOk: true,
    precipCoerenzaOk: true,
    windCoerenzaOk: true,
    temporalConsistency: false,
  };

  let testSuperati = 0;
  let testTotali = 0;

  // Test 1: Range temperature realistico
  testTotali++;
  const tempMin = Math.min(...temperature);
  const tempMax = Math.max(...temperature);
  if (tempMin < -30 || tempMax > 50) {
    anomalie.push(`Temperature fuori range realistico: min ${tempMin}°C / max ${tempMax}°C`);
    metriche.tempRangeOk = false;
  } else {
    testSuperati++;
  }

  // Test 2: Range vento realistico
  testTotali++;
  const windMax = Math.max(...windSpeed);
  if (windMax > 120) {
    anomalie.push(`Vento massimo eccessivo: ${windMax} km/h`);
    metriche.windRangeOk = false;
  } else {
    testSuperati++;
  }

  // Test 3: Nuvolosità nel range 0-100
  testTotali++;
  const cloudInvalid = cloudCover.filter(c => c < 0 || c > 100);
  if (cloudInvalid.length > 0) {
    anomalie.push(`Nuvolosità fuori range 0-100%`);
    metriche.cloudRangeOk = false;
  } else {
    testSuperati++;
  }

  // Test 4: Umidità nel range 0-100
  testTotali++;
  const humInvalid = humidity.filter(h => h < 0 || h > 100);
  if (humInvalid.length > 0) {
    anomalie.push(`Umidità fuori range 0-100%`);
    metriche.humidityRangeOk = false;
  } else {
    testSuperati++;
  }

  // Test 5: Pressione realistica
  testTotali++;
  if (pressure.length > 0) {
    const pressMin = Math.min(...pressure);
    const pressMax = Math.max(...pressure);
    if (pressMin < 900 || pressMax > 1080) {
      anomalie.push(`Pressione non realistica: min ${pressMin} hPa / max ${pressMax} hPa`);
      metriche.pressureRangeOk = false;
    } else {
      testSuperati++;
    }
  } else {
    metriche.pressureRangeOk = false;
    anomalie.push("Nessun dato di pressione disponibile");
  }

  // Test 6: Coerenza precipitazioni-nuvolosità
  testTotali++;
  const precipTot = precipitation.reduce((s, p) => s + p, 0);
  const cloudAvg = cloudCover.length > 0 ? cloudCover.reduce((s, c) => s + c, 0) / cloudCover.length : 0;
  if (precipTot > 5 && cloudAvg < 20) {
    anomalie.push(`Incoerenza: ${precipTot.toFixed(1)}mm di pioggia ma solo ${Math.round(cloudAvg)}% nuvole`);
    metriche.precipCoerenzaOk = false;
  } else {
    testSuperati++;
  }

  // Test 7: Coerenza raffiche-vento medio
  testTotali++;
  if (windGusts.length > 0 && windSpeed.length > 0) {
    const gustMax = Math.max(...windGusts);
    const windAvg = windSpeed.reduce((s, w) => s + w, 0) / windSpeed.length;
    if (gustMax > 0 && gustMax < windAvg) {
      anomalie.push(`Raffica max (${gustMax} km/h) inferiore al vento medio (${windAvg.toFixed(1)} km/h)`);
      metriche.windCoerenzaOk = false;
    } else {
      testSuperati++;
    }
  } else {
    metriche.windCoerenzaOk = false;
  }

  // Test 8: Consistenza temporale (temperature non devono saltare più di 15°C/ora)
  testTotali++;
  let temporaleOk = true;
  for (let i = 1; i < temperature.length; i++) {
    const salto = Math.abs(temperature[i] - temperature[i - 1]);
    if (salto > 15) {
      temporaleOk = false;
      anomalie.push(`Salto termico irrealistico: ${salto.toFixed(1)}°C tra ora ${i - 1} e ora ${i}`);
      break;
    }
  }
  if (temporaleOk) {
    testSuperati++;
    metriche.temporalConsistency = true;
  }

  const ok = anomalie.length === 0;

  return { ok, testSuperati, testTotali, anomalie, metriche };
}

export default function AnalisiMeteo({ dayData }: AnalisiMeteoProps) {
  const [showValidation, setShowValidation] = React.useState(false);

  const analisi = useMemo(() => {
    if (!dayData || dayData.length < 3) return null;
    const oreGiorno = dayData.filter(h => {
      const hh = h.time.getHours();
      return hh >= 6 && hh <= 21;
    });
    if (oreGiorno.length < 3) return null;

    const media = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    const max = (arr: number[]) => arr.length ? Math.max(...arr) : 0;
    const minLocal = (arr: number[]) => arr.length ? Math.min(...arr) : 0;

    const tempMaxGiorno = Math.round(max(oreGiorno.map(h => h.temperature)));
    const tempMinGiorno = Math.round(minLocal(oreGiorno.map(h => h.temperature)));
    const deltaTermico = tempMaxGiorno - tempMinGiorno;

    const umiditaMedia = Math.round(media(oreGiorno.map(h => h.humidity)));
    const ventoMedio = Math.round(media(oreGiorno.map(h => h.windSpeed)));
    const ventoGustsMax = Math.round(max(oreGiorno.map(h => h.windGusts || 0)));
    const ventoDirMedia = Math.round(media(oreGiorno.map(h => h.windDir).filter(d => d != null)));
    const nuvoleMedia = Math.round(media(oreGiorno.map(h => h.cloudCover)));
    const pioggiaTot = Math.round(oreGiorno.reduce((s, h) => s + (h.precipitation || 0), 0) * 10) / 10;
    const oreTemporale = oreGiorno.filter(h => h.weatherCode >= 95 || h.weatherCode === 82).length;
    const pressioneMedia = Math.round(media(oreGiorno.map(h => h.pressure).filter(p => p != null)));

    let rischioTemporali = 0;

    if (oreTemporale > 0) {
      rischioTemporali = 85;
    } else if (pioggiaTot > 3) {
      rischioTemporali = 45;
    } else if (pioggiaTot > 1) {
      rischioTemporali = 25;
    } else {
      const haTantoSole = nuvoleMedia < 35;
      const haMoltoVapore = umiditaMedia >= 55 && umiditaMedia <= 80;
      const haAltaEscursione = deltaTermico >= 14;
      const haBassaPressione = pressioneMedia < 1005;

      const condizioniInstabilita = [haTantoSole, haMoltoVapore, haAltaEscursione, haBassaPressione].filter(Boolean).length;

      if (condizioniInstabilita >= 3) {
        rischioTemporali = 25;
      } else if (condizioniInstabilita === 2 && deltaTermico >= 16) {
        rischioTemporali = 20;
      } else {
        rischioTemporali = 2;
      }
    }

    rischioTemporali = Math.max(0, Math.min(100, Math.round(rischioTemporali)));

    let dettaglioTemporali = "";
    if (oreTemporale > 0) {
      dettaglioTemporali = "ALTO (" + rischioTemporali + "%)";
    } else if (rischioTemporali >= 40) {
      dettaglioTemporali = "MODERATO (" + rischioTemporali + "%)";
    } else if (rischioTemporali >= 15) {
      dettaglioTemporali = "BASSO (" + rischioTemporali + "%)";
    } else {
      dettaglioTemporali = "MINIMO (" + rischioTemporali + "%)";
    }

    if (oreTemporale > 0) dettaglioTemporali += " - Temporali in atto!";

    const puntiPositivi: string[] = [];
    const puntiNegativi: string[] = [];

    if (ventoMedio >= 5 && ventoMedio <= 15) puntiPositivi.push("vento ideale per il volo");
    else if (ventoMedio > 22) puntiNegativi.push("vento forte, sconsigliato");
    else if (ventoMedio < 3) puntiNegativi.push("vento troppo debole");

    if (pioggiaTot === 0) puntiPositivi.push("nessuna pioggia prevista");
    else if (pioggiaTot > 2) puntiNegativi.push("pioggia prevista (" + pioggiaTot.toFixed(1) + " mm)");

    if (nuvoleMedia >= 15 && nuvoleMedia <= 50) puntiPositivi.push("cumuli da termica ben distribuiti");
    else if (nuvoleMedia > 70) puntiNegativi.push("cielo molto coperto");

    if (deltaTermico >= 10) puntiPositivi.push("buona escursione termica");
    else if (deltaTermico < 5) puntiNegativi.push("scarsa escursione termica");

    if (ventoGustsMax > 30) puntiNegativi.push("raffiche forti (" + ventoGustsMax + " km/h)");
    if (oreTemporale > 0) puntiNegativi.push("temporali in corso");

    let valutazione = "";
    if (puntiPositivi.length >= 3 && rischioTemporali < 20 && oreTemporale === 0) {
      valutazione = "Condizioni favorevoli: " + puntiPositivi.join(", ") + ".";
      if (puntiNegativi.length > 0) valutazione += " Attenzione: " + puntiNegativi.join(", ") + ".";
    } else if (puntiPositivi.length >= 1) {
      valutazione = "Condizioni discrete: " + puntiPositivi.join(", ") + ".";
      if (puntiNegativi.length > 0) valutazione += " Criticità: " + puntiNegativi.join(", ") + ".";
    } else {
      valutazione = "Condizioni difficili: " + puntiNegativi.join(", ") + ". Prudenza.";
    }

    return {
      tempMaxGiorno,
      tempMinGiorno,
      deltaTermico,
      umiditaMedia,
      ventoMedio,
      ventoGustsMax,
      ventoDirMedia,
      ventoDirNome: getWindDirName(ventoDirMedia),
      nuvoleMedia,
      pioggiaTot,
      oreTemporale,
      pressioneMedia,
      valutazione,
      puntiPositivi,
      puntiNegativi,
      rischioTemporali,
      dettaglioTemporali,
    };
  }, [dayData]);

  // Validazione dei dati grezzi
  const validazione = useMemo(() => {
    if (!dayData || dayData.length < 3) return null;
    const temps = dayData.map(h => h.temperature);
    const hums = dayData.map(h => h.humidity);
    const winds = dayData.map(h => h.windSpeed);
    const clouds = dayData.map(h => h.cloudCover);
    const pressures = dayData.map(h => h.pressure).filter(p => p != null);
    const precip = dayData.map(h => h.precipitation || 0);
    const gusts = dayData.map(h => h.windGusts || 0);
    return validaDati(temps, hums, winds, clouds, pressures, precip, gusts);
  }, [dayData]);

  // Data del giorno
  const dataGiorno = useMemo(() => {
    if (dayData && dayData.length > 0) return formatDateShort(new Date(dayData[0].time));
    return formatDateShort(new Date());
  }, [dayData]);

  if (!analisi) {
    return (
      <div className="text-center py-12 text-slate-400 text-base">
        <Sun className="w-10 h-10 mx-auto mb-3 text-slate-500" />
        Dati insufficienti per generare l&apos;analisi.
      </div>
    );
  }

  const showValidationBadge = validazione && !validazione.ok;

  return (
    <div className="space-y-4">
      {/* Data del giorno */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-slate-800/60 border border-slate-600/50 px-4 py-1.5 rounded-lg">
          <Sun className="w-4 h-4 text-orange-400" />{dataGiorno}
        </span>
      </div>

      {/* Badge validazione dati */}
      {validazione && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowValidation(!showValidation)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              validazione.ok
                ? "bg-green-900/40 border border-green-500/40 text-green-300 hover:bg-green-900/60"
                : "bg-amber-900/40 border border-amber-500/40 text-amber-300 hover:bg-amber-900/60"
            }`}
          >
            {validazione.ok ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            Dati {validazione.ok ? "veritieri" : "con anomalie"} ({validazione.testSuperati}/{validazione.testTotali} test)
          </button>
          {!validazione.ok && (
            <span className="text-xs text-amber-400 animate-pulse font-bold">
              ⚠ Attenzione
            </span>
          )}
        </div>
      )}

      {/* Pannello validazione espanso */}
      {showValidation && validazione && (
        <div className={`card p-4 border-2 rounded-xl ${
          validazione.ok
            ? "bg-green-900/20 border-green-700/40"
            : "bg-amber-900/20 border-amber-700/40"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className={`w-5 h-5 ${validazione.ok ? "text-green-400" : "text-amber-400"}`} />
            <h4 className="text-sm font-bold text-white">Validazione dati Open-Meteo</h4>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
            <div className={`text-center p-2 rounded-lg text-xs ${
              validazione.metriche.tempRangeOk ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
            }`}>
              <Activity className="w-4 h-4 mx-auto mb-1" />
              Temperature {validazione.metriche.tempRangeOk ? "OK" : "ANOMALE"}
            </div>
            <div className={`text-center p-2 rounded-lg text-xs ${
              validazione.metriche.windRangeOk ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
            }`}>
              <Wind className="w-4 h-4 mx-auto mb-1" />
              Vento {validazione.metriche.windRangeOk ? "OK" : "ANOMALO"}
            </div>
            <div className={`text-center p-2 rounded-lg text-xs ${
              validazione.metriche.cloudRangeOk ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
            }`}>
              <Cloud className="w-4 h-4 mx-auto mb-1" />
              Nuvole {validazione.metriche.cloudRangeOk ? "OK" : "ANOMALE"}
            </div>
            <div className={`text-center p-2 rounded-lg text-xs ${
              validazione.metriche.pressureRangeOk ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
            }`}>
              <TrendingUp className="w-4 h-4 mx-auto mb-1" />
              Pressione {validazione.metriche.pressureRangeOk ? "OK" : "ANOMALA"}
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-1">
            <p>Test superati: <span className="font-bold text-white">{validazione.testSuperati}/{validazione.testTotali}</span></p>
            {validazione.anomalie.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-amber-400 font-bold">Anomalie riscontrate:</p>
                {validazione.anomalie.map((a, i) => (
                  <p key={i} className="text-red-300 pl-3 border-l-2 border-red-500/50">{a}</p>
                ))}
              </div>
            )}
            {validazione.ok && (
              <p className="text-green-400 font-bold mt-2">✓ Tutti i test superati: i dati sono realistici e coerenti.</p>
            )}
          </div>
        </div>
      )}

      {/* Situazione generale */}
      <div className="card analisi-card bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-6 h-6 text-orange-400 shrink-0" />
          <h3 className="text-base font-bold text-white">Situazione generale</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p><span className="text-emerald-400 mr-2">&bull;</span> Max {analisi.tempMaxGiorno}°C, min {analisi.tempMinGiorno}°C, delta {analisi.deltaTermico}°C.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Umidità: {analisi.umiditaMedia}% — {getUmiditaDescrizione(analisi.umiditaMedia)}.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Vento: {analisi.ventoMedio} km/h da {analisi.ventoDirNome} ({analisi.ventoDirMedia}°).{analisi.ventoGustsMax > analisi.ventoMedio * 1.5 ? " Raffiche " + analisi.ventoGustsMax + " km/h." : ""}</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Cielo: {getCloudDescription(analisi.nuvoleMedia)} ({analisi.nuvoleMedia}%).{analisi.pioggiaTot === 0 ? " Nessuna pioggia." : " Pioggia: " + analisi.pioggiaTot.toFixed(1) + " mm."}</p>
        </div>
      </div>

      {/* Rischio temporali */}
      <div className={"card analisi-card p-5 border-2 " + getRischioBg(analisi.rischioTemporali)}>
        <div className="flex items-center gap-3 mb-3">
          {analisi.rischioTemporali >= 70 || analisi.oreTemporale > 0 ? (
            <CloudLightning className="w-8 h-8 text-red-400 shrink-0" />
          ) : analisi.rischioTemporali >= 15 ? (
            <CloudRain className="w-8 h-8 text-amber-400 shrink-0" />
          ) : (
            <Cloud className="w-8 h-8 text-green-400 shrink-0" />
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white">Rischio temporali</h3>
            <p className={"text-sm font-medium " + getRischioText(analisi.rischioTemporali)}>{analisi.dettaglioTemporali}</p>
          </div>
        </div>
        <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
          <div className={"h-full rounded-full " + getRischioBar(analisi.rischioTemporali)} style={{ width: analisi.rischioTemporali + "%" }} />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>

      {/* Profilo termico */}
      <div className="card analisi-card bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Thermometer className="w-6 h-6 text-amber-400 shrink-0" />
          <h3 className="text-base font-bold text-white">Profilo termico e stabilità</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p><span className="text-emerald-400 mr-2">&bull;</span> {analisi.tempMinGiorno}°C min / {analisi.tempMaxGiorno}°C max · delta {analisi.deltaTermico}°C.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Umidità {analisi.umiditaMedia}%.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> Pressione: {analisi.pressioneMedia} hPa ({getPressioneDescrizione(analisi.pressioneMedia)}).</p>
        </div>
      </div>

      {/* Vento */}
      <div className="card analisi-card bg-gradient-to-br from-slate-900/60 to-slate-800/30 border-2 border-slate-700/30 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wind className="w-6 h-6 text-cyan-400 shrink-0" />
          <h3 className="text-base font-bold text-white">Vento e dinamica in quota</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p><span className="text-emerald-400 mr-2">&bull;</span> Direzione: {analisi.ventoDirNome} ({analisi.ventoDirMedia}°). Vento medio: {analisi.ventoMedio} km/h, raffiche max: {analisi.ventoGustsMax} km/h.</p>
          <p><span className="text-emerald-400 mr-2">&bull;</span> {analisi.nuvoleMedia < 25 ? "Cielo sereno." : analisi.nuvoleMedia < 50 ? "Nuvolosità moderata." : "Nuvolosità significativa."}</p>
        </div>
      </div>

      {/* Interpretazione */}
      <div className="card analisi-card bg-gradient-to-br from-green-900/20 to-emerald-900/10 border-2 border-green-700/30 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-green-400 shrink-0" />
          <h3 className="text-base font-bold text-green-300">Interpretazione della giornata</h3>
        </div>
        <div className="space-y-2 text-sm text-slate-300">
          <p>{analisi.valutazione}</p>
          {analisi.puntiPositivi.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-emerald-400 font-bold mb-1">Punti positivi:</div>
              {analisi.puntiPositivi.map((p, i) => (
                <p key={i}><span className="text-emerald-400 mr-2">&bull;</span>{p}</p>
              ))}
            </div>
          )}
          {analisi.puntiNegativi.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-amber-400 font-bold mb-1">Criticità:</div>
              {analisi.puntiNegativi.map((p, i) => (
                <p key={i}><span className="text-amber-400 mr-2">&bull;</span>{p}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}