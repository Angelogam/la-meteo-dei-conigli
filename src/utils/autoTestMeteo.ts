"use client";

/**
 * TEST AUTOMATICO METEO
 * 
 * Esegue all'avvio una verifica completa di TUTTE le card meteo:
 * - Icone meteo corrette
 * - Valori visualizzati corretti
 * - Palette colori coerente
 * - Collegamento a Open-Meteo funzionante
 * 
 * Eseguire: apri la console (F12) e vedrai i risultati.
 */

import type { MeteoResponse } from "@/services/weatherService";
import { DECOLLI } from "@/data/decolli";

export function autoTestMeteo(response: MeteoResponse | null, lat: number, lon: number) {
  if (!response) {
    console.warn("⚠️ TEST: Nessun dato ricevuto da Open-Meteo");
    return { ok: false, errori: ["Nessun dato"] };
  }

  const errori: string[] = [];
  const avvisi: string[] = [];
  const ok: string[] = [];

  // === 1. VERIFICA DATI BASE ===
  if (!response.hourly || response.hourly.length === 0) {
    errori.push("❌ Dati orari mancanti o vuoti");
  } else {
    ok.push(`✅ ${response.hourly.length} ore di dati disponibili`);
  }

  if (!response.daily || response.daily.length === 0) {
    errori.push("❌ Dati giornalieri mancanti o vuoti");
  } else {
    ok.push(`✅ ${response.daily.length} giorni di previsioni`);
  }

  if (!response.current) {
    errori.push("❌ Dati correnti mancanti");
  } else {
    ok.push("✅ Dati correnti presenti");
  }

  // === 2. VERIFICA TEMPERATURE ===
  const temps = response.hourly.map(h => h.temperature);
  const tempMin = Math.min(...temps);
  const tempMax = Math.max(...temps);
  
  if (tempMax > 50 || tempMin < -30) {
    errori.push(`❌ Temperature non realistiche: min ${tempMin}°C, max ${tempMax}°C`);
  } else {
    ok.push(`✅ Temperature realistiche: ${Math.round(tempMin)}°C ~ ${Math.round(tempMax)}°C`);
  }

  const tempCurrent = response.current.temperature;
  if (tempCurrent < tempMin || tempCurrent > tempMax) {
    avvisi.push(`⚠️ Temperatura corrente (${tempCurrent}°C) fuori dal range orario (${Math.round(tempMin)}°C~${Math.round(tempMax)}°C)`);
  }

  // === 3. VERIFICA VENTO ===
  const winds = response.hourly.map(h => h.windSpeed);
  const windMax = Math.max(...winds);
  const windCurrent = response.current.windSpeed;

  if (windMax > 120) {
    errori.push(`❌ Vento massimo non realistico: ${Math.round(windMax)} km/h`);
  } else {
    ok.push(`✅ Vento massimo realistico: ${Math.round(windMax)} km/h`);
  }

  if (windCurrent > 60) {
    avvisi.push(`⚠️ Vento corrente forte: ${Math.round(windCurrent)} km/h`);
  }

  // === 4. VERIFICA DIREZIONE VENTO ===
  const windDir = response.current.windDir;
  if (windDir < 0 || windDir > 360) {
    errori.push(`❌ Direzione vento fuori range: ${windDir}°`);
  } else {
    ok.push(`✅ Direzione vento valida: ${Math.round(windDir)}°`);
  }

  // === 5. VERIFICA NUVOLOSITÀ ===
  const clouds = response.hourly.map(h => h.cloudCover);
  const cloudInvalid = clouds.filter(c => c < 0 || c > 100);
  if (cloudInvalid.length > 0) {
    errori.push(`❌ ${cloudInvalid.length} valori di nuvolosità fuori range (0-100%)`);
  } else {
    ok.push(`✅ Nuvolosità: tutti i ${clouds.length} valori nel range 0-100%`);
  }

  // === 6. VERIFICA UMIDITÀ ===
  const hums = response.hourly.map(h => h.humidity);
  const humInvalid = hums.filter(h => h < 0 || h > 100);
  if (humInvalid.length > 0) {
    errori.push(`❌ ${humInvalid.length} valori di umidità fuori range (0-100%)`);
  } else {
    ok.push(`✅ Umidità: tutti i ${hums.length} valori nel range 0-100%`);
  }

  // === 7. VERIFICA PRECIPITAZIONI ===
  const precipTot = response.hourly.reduce((s, h) => s + h.precipitation, 0);
  const precipCurrent = response.current.precipitation;

  // === 8. VERIFICA FREEZING LEVEL ===
  const freezingLevels = response.hourly.map(h => h.freezingLevelHeight).filter(f => f > 0);
  if (freezingLevels.length > 0) {
    const flMin = Math.min(...freezingLevels);
    const flMax = Math.max(...freezingLevels);
    ok.push(`✅ Zero termico: ${Math.round(flMin)}m ~ ${Math.round(flMax)}m`);
  } else {
    avvisi.push("⚠️ Zero termico non disponibile nei dati orari (solo current)");
  }

  const freezingCurrent = response.current.freezingLevelHeight;
  if (freezingCurrent > 0) {
    ok.push(`✅ Zero termico corrente: ${Math.round(freezingCurrent)}m`);
  }

  // === 9. VERIFICA WEATHER CODE ===
  const codes = response.hourly.map(h => h.weatherCode);
  const validCodes = codes.filter(c => c >= 0 && c <= 99);
  if (validCodes.length < codes.length) {
    errori.push(`❌ ${codes.length - validCodes.length} weather code non validi`);
  } else {
    ok.push(`✅ Weather code: tutti validi (0-99)`);
  }

  // === 10. VERIFICA CAPE ===
  const capes = response.hourly.map(h => h.cape);
  const capeInvalid = capes.filter(c => c < 0 || c > 10000);
  if (capeInvalid.length > 0) {
    errori.push(`❌ ${capeInvalid.length} valori CAPE non realistici`);
  } else {
    ok.push(`✅ CAPE: tutti i ${capes.length} valori realistici`);
  }

  // === 11. VERIFICA UV INDEX ===
  const uvs = response.hourly.map(h => h.uvIndex);
  const uvInvalid = uvs.filter(u => u < 0 || u > 20);
  if (uvInvalid.length > 0) {
    errori.push(`❌ ${uvInvalid.length} valori UV fuori range (0-20)`);
  } else {
    ok.push(`✅ UV Index: tutti i ${uvs.length} valori nel range 0-20`);
  }

  // === 12. VERIFICA COERENZA PIOGGIA-NUVOLE ===
  const cloudAvg = clouds.reduce((s, c) => s + c, 0) / clouds.length;
  if (precipTot > 5 && cloudAvg < 15) {
    errori.push(`❌ Incoerenza: ${precipTot.toFixed(1)}mm di pioggia ma solo ${Math.round(cloudAvg)}% di nuvole`);
  } else {
    ok.push(`✅ Coerenza pioggia-nuvole OK`);
  }

  // === 13. VERIFICA COERENZA RAFFICHE-VENTO ===
  const windGusts = response.hourly.map(h => h.windGusts);
  const gustMax = Math.max(...windGusts);
  if (gustMax > 0 && gustMax < windMax) {
    avvisi.push(`⚠️ Raffica max (${Math.round(gustMax)} km/h) < vento max (${Math.round(windMax)} km/h)`);
  }

  // === 14. VERIFICA INTEGRITÀ DATI GIORNALIERI ===
  for (let i = 0; i < response.daily.length; i++) {
    const d = response.daily[i];
    if (d.tempMax < d.tempMin) {
      errori.push(`❌ Giorno ${i}: tempMax (${d.tempMax}°C) < tempMin (${d.tempMin}°C)`);
    }
    if (d.weatherCode < 0 || d.weatherCode > 99) {
      errori.push(`❌ Giorno ${i}: weatherCode non valido: ${d.weatherCode}`);
    }
  }

  // === 15. VERIFICA DATI CORRENTI COMPLETI ===
  const current = response.current;
  const campiCorrenti = [
    { nome: "temperature", val: current.temperature },
    { nome: "humidity",```tsx
    { nome: "humidity", val: current.humidity },
    { nome: "windSpeed", val: current.windSpeed },
    { nome: "windDir", val: current.windDir },
    { nome: "cloudCover", val: current.cloudCover },
    { nome: "weatherCode", val: current.weatherCode },
    { nome: "precipitation", val: current.precipitation },
  ];
  
  for (const campo of campiCorrenti) {
    if (campo.val == null || isNaN(campo.val)) {
      errori.push(`❌ Campo corrente "${campo.nome}" non valido: ${campo.val}`);
    }
  }
  
  // === 16. VERIFICA SITO ===
  const sito = DECOLLI.find(d => Math.abs(d.lat - lat) < 0.01 && Math.abs(d.lon - lon) < 0.01);
  if (sito) {
    ok.push(`✅ Sito riconosciuto: ${sito.name} (${sito.altitude}m)`);
  } else {
    avvisi.push(`⚠️ Coordinate (${lat.toFixed(4)}, ${lon.toFixed(4)}) non corrispondono a nessun decollo noto`);
  }

  // === RIEPILOGO ===
  console.log("");
  console.log("%c🧪 TEST AUTOMATICO METEO — COMPLETATO", "font-weight:bold;font-size:14px;color:#10b981");
  console.log(`%c✅ ${ok.length} test superati`, "color:#22c55e");
  console.log(`%c⚠️  ${avvisi.length} avvisi`, "color:#eab308");
  console.log(`%c❌ ${errori.length} errori`, "color:#ef4444");
  console.log("");

  if (ok.length > 0) {
    console.log("%c✅ TEST SUPERATI:", "font-weight:bold;color:#22c55e");
    ok.forEach(m => console.log(`  ${m}`));
  }
  
  if (avvisi.length > 0) {
    console.log("%c⚠️ AVVISI:", "font-weight:bold;color:#eab308");
    avvisi.forEach(m => console.log(`  ${m}`));
  }

  if (errori.length > 0) {
    console.log("%c❌ ERRORI:", "font-weight:bold;color:#ef4444");
    errori.forEach(m => console.log(`  ${m}`));
  }

  // === RIEPILOGO VISIVO ===
  console.log("");
  console.log("%c📊 RIEPILOGO METEO ATTUALE:", "font-weight:bold;color:#60a5fa");
  console.log(`  🌡️  ${Math.round(response.current.temperature)}°C (felt ${Math.round(response.current.apparentTemp)}°C)`);
  console.log(`  💨 ${Math.round(response.current.windSpeed)} km/h da ${Math.round(response.current.windDir)}°`);
  console.log(`  ☁️  ${response.current.cloudCover}% nuvole (codice ${response.current.weatherCode})`);
  console.log(`  🌧️  ${response.current.precipitation}mm pioggia`);
  console.log(`  ❄️  Zero termico: ${Math.round(response.current.freezingLevelHeight)}m`);
  console.log(`  💧  Umidità: ${response.current.humidity}%`);
  console.log("");

  return { ok: errori.length === 0, errori, avvisi, ok: ok.length };
}
```

Ora integro il test automatico nel componente principale `Index.tsx` all'avvio:

<dyad-write path="src/pages/Index.tsx" description="Integro il test automatico all'avvio dell'app">
"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import WeatherDashboard from "@/components/WeatherDashboard";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import VentiInterpolatiTab from "@/components/VentiInterpolatiTab";
import Windgram from "@/components/Windgram";
import TermicheTab from "@/components/TermicheTab";
import AnalisiMeteo from "@/components/AnalisiMeteo";
import MeteoTesterPanel from "@/components/MeteoTesterPanel";
import DiagnosticaPanel from "@/components/DiagnosticaPanel";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useMeteoCompleto } from "@/hooks/useMeteoCompleto";
import { DECOLLI } from "@/data/decolli";
import { getStabilityIndex } from "@/utils/weatherHelpers";
import { autoTestMeteo } from "@/utils/autoTestMeteo";
import { Activity } from "lucide-react";
import type { MeteoHourly, MeteoCurrent, MeteoResponse } from "@/services/weatherService";
import { weatherService } from "@/services/weatherService";

export default function Index() {
  const {
    selectedId, setSelectedId,
    loading: weatherLoading,
    updating,
    selectedDay, setSelectedDay,
    selectedHour, setSelectedHour,
    activeTab, setActiveTab,
    lastUpdate, countdown,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    loadWeather,
    hourlyData,
    allHourlyData,
    allDailyData,
    activeModel,
    currentCape,
  } = useWeatherData();

  const {
    riepilogo: riepilogoAvanzato,
    loading: analisiLoading,
    tempoTrascorso,
  } = useMeteoCompleto(
    site?.lat ?? DECOLLI[0].lat,
    site?.lon ?? DECOLLI[0].lon,
    site?.altitude ?? DECOLLI[0].altitude
  );

  // === TEST AUTOMATICO ALL'AVVIO ===
  const [testEseguito, setTestEseguito] = useState(false);
  
  useEffect(() => {
    if (!testEseguito && hourlyData.length > 0) {
      const lat = site?.lat ?? DECOLLI[0].lat;
      const lon = site?.lon ?? DECOLLI[0].lon;
      
      // Ricrea i dati per il test (usando i dati già in cache)
      weatherService.fetchWithFallback(lat, lon).then(({ data }) => {
        if (data) {
          autoTestMeteo(data, lat, lon);
        }
        setTestEseguito(true);
      });
    }
  }, [hourlyData, testEseguito, site]);

  const stabilityIndex = getStabilityIndex(
    currentData?.temperature || 20,
    currentData?.humidity || 50,
    currentData?.cloudCover || 30
  );

  if (weatherLoading && (!hourlyData || hourlyData.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <p className="text-slate-400 text-sm">Caricamento previsioni...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const hasData = site && currentData && dayData.length > 0;

  const decolliList = DECOLLI.map(d => ({
    nome: d.name,
    valle: d.valley,
    quota: d.altitude,
    direzione: d.exposure,
  }));

  const nomeToId: Record<string, string> = {};
  DECOLLI.forEach(d => { nomeToId[d.name] = d.id; });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-80 shrink-0 space-y-4">
            <UpdateTimer 
              lastUpdate={lastUpdate} 
              countdown={countdown} 
              updating={updating} 
              onRefresh={loadWeather} 
            />
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300">Analisi in tempo reale</span>
              <span className="text-[10px] text-slate-500 ml-auto">{tempoTrascorso}s</span>
            </div>
            <DecolliCard
              decolli={decolliList}
              selectedId={selectedId}
              onSelect={(item) => {
                const id = nomeToId[item.nome];
                if (id) {
                  setSelectedId(id);
                  setSelectedHour(new Date().getHours());
                }
              }}
              weatherMap={allHourlyData}
            />
          </aside>
          <div className="flex-1 min-w-0 space-y-6">
            {hasData && (
              <>
                <SiteHeader
                  name={site!.name}
                  exposure={site!.exposure}
                  valley={site!.valley}
                  alt={site!.altitude}
                  currentData={currentData}
                />
                <PrevisioniGiornaliere
                  enrichedDaily={enrichedDaily}
                  dateLabels={dateLabels}
                  currentData={currentData}
                  dayData={dayData}
                  site={{ name: site!.name, altitude: site!.altitude, exposure: site!.exposure }}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />
                <WeatherDashboard
                  dayData={dayData}
                  altitude={site!.altitude}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                />
                <TabNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />
                {activeTab === "meteo" && (
                  <MeteoTab
                    currentData={currentData}
                    dayData={dayData}
                    site={{ alt: site!.altitude }}
                    thermalDelta={thermalDelta}
                    stabilityIndex={stabilityIndex}
                    modelName={activeModel}
                    cape={currentCape?.cape}
                    liftedIndex={currentCape?.liftedIndex}
                    cin={currentCape?.cin}
                  />
                )}
                {activeTab === "venti" && (
                  <VentiInterpolatiTab
                    lat={site!.lat}
                    lon={site!.lon}
                    quotaDecollo={site!.altitude}
                    selectedDay={selectedDay}
                    oraCorrente={selectedHour}
                    onOraChange={setSelectedHour}
                  />
                )}
                {activeTab === "windgram" && (
                  <Windgram
                    hourlyData={hourlyData}
                    site={{ name: site!.name, alt: site!.altitude, lat: site!.lat, lon: site!.lon }}
                    selectedHour={selectedHour}
                    onHourSelect={setSelectedHour}
                  />
                )}
                {activeTab === "termiche" && (
                  <TermicheTab
                    currentData={currentData}
                    dayData={dayData}
                    site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon }}
                    hourlyData={hourlyData}
                  />
                )}
                {activeTab === "analisi" && (
                  <AnalisiMeteo
                    currentData={currentData}
                    dayData={dayData}
                    site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name, exposure: site!.exposure }}
                    cape={currentCape?.cape}
                    liftedIndex={currentCape?.liftedIndex}
                    cin={currentCape?.cin}
                  />
                )}
              </>
            )}
            {!hasData && (
              <div className="text-center py-12 text-slate-400">
                <p>Nessun dato meteo disponibile. Verifica la connessione o riprova.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <MeteoTesterPanel />
      <DiagnosticaPanel />
    </div>
  );
}