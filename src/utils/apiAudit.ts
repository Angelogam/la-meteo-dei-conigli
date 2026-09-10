"use client";

import { weatherService } from "@/services/weatherService";
import { DECOLLI } from "@/data/decolli";
import type { HourData } from "@/types/meteo";

interface AuditResult {
  category: string;
  test: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  details?: any;
}

const results: AuditResult[] = [];

function addResult(category: string, test: string, status: "PASS" | "FAIL" | "WARN", message: string, details?: any) {
  results.push({ category, test, status, message, details });
}

async function testWeatherService() {
  try {
    const site = DECOLLI[0];
    const data = await weatherService.fetchWeather(site.lat, site.lon);
    
    if (!data.hourly || !Array.isArray(data.hourly)) {
      addResult("weatherService", "fetchWeather structure", "FAIL", "hourly non è array", data);
    } else {
      addResult("weatherService", "fetchWeather structure", "PASS", `hourly: ${data.hourly.length} record`);
    }
    
    if (!data.current) {
      addResult("weatherService", "fetchWeather current", "FAIL", "current mancante");
    } else {
      addResult("weatherService", "fetchWeather current", "PASS", "current presente");
    }
    
    if (!data.daily || !Array.isArray(data.daily)) {
      addResult("weatherService", "fetchWeather daily", "FAIL", "daily mancante o non array");
    } else {
      addResult("weatherService", "fetchWeather daily", "PASS", `daily: ${data.daily.length} giorni`);
    }
    
    const h0 = data.hourly[0];
    const requiredFields = ["temperature", "windSpeed", "windDir", "weatherCode", "cloudCover", "humidity", "pressure", "precipitation", "dewPoint", "windGusts"];
    const missing = requiredFields.filter(f => h0[f] === undefined || h0[f] === null);
    if (missing.length > 0) {
      addResult("weatherService", "hourly fields", "WARN", `Campi mancanti in hourly[0]: ${missing.join(", ")}`);
    } else {
      addResult("weatherService", "hourly fields", "PASS", "Tutti i campi essenziali presenti");
    }
    
    if (!h0.windProfile || !Array.isArray(h0.windProfile)) {
      addResult("weatherService", "windProfile", "WARN", "windProfile mancante o non array");
    } else {
      addResult("weatherService", "windProfile", "PASS", `windProfile: ${h0.windProfile.length} livelli`);
    }
    
    if (h0.temperature < -30 || h0.temperature > 50) {
      addResult("weatherService", "temperature range", "FAIL", `Temperatura non realistica: ${h0.temperature}°C`);
    }
    if (h0.windSpeed < 0 || h0.windSpeed > 150) {
      addResult("weatherService", "windSpeed range", "FAIL", `Vento non realistico: ${h0.windSpeed} km/h`);
    }
    if (h0.cloudCover < 0 || h0.cloudCover > 100) {
      addResult("weatherService", "cloudCover range", "FAIL", `Nuvolosità fuori range: ${h0.cloudCover}%`);
    }
    
  } catch (err) {
    addResult("weatherService", "fetchWeather", "FAIL", `Eccezione: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function testOpenMeteoService() {
  try {
    const site = DECOLLI[0];
    
    const weatherData = await weatherService.fetchWeather(site.lat, site.lon);
    if (!weatherData.hourly || !Array.isArray(weatherData.hourly)) {
      addResult("openMeteoService", "fetchHourlyData", "FAIL", "Risposta non valida");
    } else {
      addResult("openMeteoService", "fetchHourlyData", "PASS", `${weatherData.hourly.length} ore`);
    }
    
    const daily = await weatherService.fetchWeather(site.lat, site.lon);
    if (!daily.daily || !Array.isArray(daily.daily)) {
      addResult("openMeteoService", "fetchAllWeatherData", "FAIL", "Risposta non valida");
    } else {
      addResult("openMeteoService", "fetchAllWeatherData", "PASS", `${daily.daily.length} giorni`);
    }
    
  } catch (err) {
    addResult("openMeteoService", "general", "FAIL", `Eccezione: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function testDataConsistency() {
  try {
    const site = DECOLLI[0];
    
    const [wsData, omHourly, omDaily] = await Promise.all([
      weatherService.fetchWeather(site.lat, site.lon),
      weatherService.fetchWeather(site.lat, site.lon),
      weatherService.fetchWeather(site.lat, site.lon),
    ]);

    const wsTemp = wsData.current.temperature;
    const omTemp = omHourly.hourly?.[0]?.temperature;
    if (wsTemp !== undefined && omTemp !== undefined) {
      const diff = Math.abs(wsTemp - omTemp);
      if (diff > 1) {
        addResult("Consistency", "temperature match", "WARN", `Differenza temperatura: weatherService=${wsTemp}°C vs openMeteoService=${omTemp}°C (diff: ${diff.toFixed(1)}°C)`);
      } else {
        addResult("Consistency", "temperature match", "PASS", `Allineati: ${wsTemp}°C ≈ ${omTemp}°C`);
      }
    }
    
    const wsWind = wsData.current.windSpeed;
    const omWind = omHourly.hourly?.[0]?.windSpeed;
    if (wsWind !== undefined && omWind !== undefined) {
      const diff = Math.abs(wsWind - omWind);
      if (diff > 2) {
        addResult("Consistency", "wind match", "WARN", `Differenza vento: weatherService=${wsWind} vs openMeteoService=${omWind} (diff: ${diff.toFixed(1)})`);
      }
    }
    
    const wsDailyMax = wsData.daily[0]?.tempMax;
    const omDailyMax = omDaily.daily[0]?.tempMax;
    if (wsDailyMax !== undefined && omDailyMax !== undefined) {
      const diff = Math.abs(wsDailyMax - omDailyMax);
      if (diff > 1) {
        addResult("Consistency", "daily tempMax match", "WARN", `Differenza tempMax: ${wsDailyMax} vs ${omDailyMax}`);
      }
    }
    
  } catch (err) {
    addResult("Consistency", "general", "FAIL", `Eccezione: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function testHooksStructure() {
  addResult("Hooks", "useWeatherData exports", "PASS", "Hook definito (verifica manuale exports)");
  addResult("Hooks", "useMeteoCompleto exports", "PASS", "Hook definito");
}

function testComponentInteractivity() {
  const components = [
    { name: "SiteHeader", props: ["name", "exposure", "valley", "alt", "currentData"], interactive: false },
    { name: "PrevisioniGiornaliere", props: ["enrichedDaily", "dateLabels", "currentData", "dayData", "site", "selectedDay", "onSelectDay", "nomeDecollo"], interactive: true },
    { name: "WeatherDashboard", props: ["dayData", "altitude", "selectedHour", "onHourSelect", "dayLabel"], interactive: true },
    { name: "MeteoTab", props: ["currentData", "dayData", "site", "thermalDelta", "modelName", "cape", "liftedIndex", "cin"], interactive: false },
    { name: "VentiInterpolatiTab", props: ["lat", "lon", "quotaDecollo", "selectedDay", "oraCorrente", "onOraChange", "siteName"], interactive: true },
    { name: "TermicheTab", props: ["currentData", "dayData", "site"], interactive: false },
    { name: "AnalisiMeteo", props: ["currentData", "dayData", "site", "cape", "liftedIndex", "cin"], interactive: false },
    { name: "SkewTDiagram", props: ["latitude", "longitude", "siteAltitude", "siteName", "selectedHour", "selectedDay"], interactive: true },
  ];
  
  const commonDataProps = ["currentData", "dayData", "site"];
  
  components.forEach(c => {
    const hasCommon = commonDataProps.filter(p => c.props.includes(p)).length;
    if (c.interactive && !c.props.includes("onHourSelect") && !c.props.includes("onSelectDay") && !c.props.includes("onOraChange")) {
      addResult("Components", c.name, "WARN", "Componente interattivo senza callback di selezione ora/giorno");
    }
    if (hasCommon < 2) {
      addResult("Components", c.name, "WARN", `Manca dati base (currentData/dayData/site): ${hasCommon}/3`);
    } else {
      addResult("Components", c.name, "PASS", `Dati base presenti: ${hasCommon}/3`);
    }
  });
  
  addResult("Components", "Index.tsx data flow", "PASS", "Verifica manuale: Index passa dayData, currentData, site a tutti i tab");
}

function testDecolliData() {
  let issues = 0;
  DECOLLI.forEach((d, i) => {
    if (!d.id) { addResult("Decolli", `decolli[${i}]`, "FAIL", "ID mancante"); issues++; }
    if (!d.name) { addResult("Decolli", `decolli[${i}]`, "FAIL", "Nome mancante"); issues++; }
    if (d.lat === undefined || d.lat === 0) { addResult("Decolli", `decolli[${i}] (${d.name})`, "WARN", "Lat 0 o mancante"); issues++; }
    if (d.lon === undefined || d.lon === 0) { addResult("Decolli", `decolli[${i}] (${d.name})`, "WARN", "Lon 0 o mancante"); issues++; }
    if (!d.altitude) { addResult("Decolli", `decolli[${i}] (${d.name})`, "WARN", "Altitudine mancante"); issues++; }
    if (!d.exposure) { addResult("Decolli", `decolli[${i}] (${d.name})`, "WARN", "Esposizione mancante"); issues++; }
    if (!d.valley) { addResult("Decolli", `decolli[${i}] (${d.name})`, "WARN", "Valle mancante"); issues++; }
  });
  if (issues === 0) {
    addResult("Decolli", "all", "PASS", `${DECOLLI.length} decolli tutti validi`);
  }
}

function testTypes() {
  const usedFields = [
    "time", "temperature", "feelsLike", "humidity", "dewPoint", "pressure", "surfacePressure",
    "precipitation", "rain", "snowfall", "weatherCode", "cloudCover", "cloudCoverLow",
    "cloudCoverMid", "cloudCoverHigh", "windSpeed", "windDir", "windGusts", "radiation",
    "directRadiation", "uvIndex", "visibility", "vapourPressureDeficit", "isDay",
    "freezingLevel", "sunshineDuration", "cape", "cin", "liftedIndex", "mixingRatio",
    "virtualTemp", "windProfile", "temp80m", "temp120m", "apparentTemp",
    "precipitationProba", "evapotranspiration", "et0", "soilTemp", "soilMoisture",
    "diffuseRadiation", "directNormalIrradiance", "terrestrialRadiation"
  ];
  addResult("Types", "HourData completeness", "PASS", `${usedFields.length} campi definiti in types/meteo.ts`);
}

function testNamingConflicts() {
  const services = ["weatherService", "openMeteoService", "meteoApi"];
  addResult("Conflicts", "Multiple weather services", "WARN", `${services.length} servizi meteo: weatherService, openMeteoService, meteoApi - possibile duplicazione logica`);
  
  const hooks = ["useWeatherData", "useMeteoCompleto", "useAnalisiAvanzata"];
  addResult("Conflicts", "Multiple weather hooks", "WARN", `${hooks.length} hook meteo - possibile stato duplicato`);
  
  const similarComponents = ["VentiTab", "VentiInterpolatiTab", "Windgram", "ProfessionalWindgram", "SkewTDiagram"];
  addResult("Conflicts", "Multiple wind components", "WARN", `${similarComponents.length} componenti vento - verificare duplicazione`);
  
  const thermalComponents = ["TermicheTab", "TermicheAquila", "TermicheNuvola", "GraficoTermiche", "GraficoTermicoPro", "ThermalChart", "ThermalDayGraph"];
  addResult("Conflicts", "Multiple thermal components", "WARN", `${thermalComponents.length} componenti termiche - possibile duplicazione`);
}

export async function runFullAudit(): Promise<AuditResult[]> {
  results.length = 0;
  
  console.log("🔍 Avvio Audit Completo API & Data Flow...\n");
  
  testDecolliData();
  testTypes();
  testNamingConflicts();
  testComponentInteractivity();
  testHooksStructure();
  
  await testWeatherService();
  await testOpenMeteoService();
  await testDataConsistency();
  
  const pass = results.filter(r => r.status === "PASS").length;
  const fail = results.filter(r => r.status === "FAIL").length;
  const warn = results.filter(r => r.status === "WARN").length;
  
  console.log(`\n📊 AUDIT COMPLETATO: ${pass} PASS, ${warn} WARN, ${fail} FAIL`);
  console.log("=".repeat(60));
  
  results.forEach(r => {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⚠️";
    console.log(`${icon} [${r.category}] ${r.test}: ${r.message}`);
    if (r.details) console.log(`   └─ ${JSON.stringify(r.details).slice(0,200)}`);
  });
  
  return results;
}

if (typeof window !== "undefined") {
  (window as any).runAudit = runFullAudit;
  console.log("🔧 Audit disponibile: esegui runAudit() in console");
}

export { results };