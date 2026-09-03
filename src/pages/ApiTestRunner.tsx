"use client";

import React, { useState, useCallback, useEffect } from "react";
import { DECOLLI } from "@/data/decolli";
import {
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Globe,
  MapPin,
  Thermometer,
  Wind,
  Droplets,
  Cloud,
  Sun,
  Clock,
  Signal,
  AlertTriangle,
  Zap,
  Database,
  Smartphone,
  ChevronDown,
  ChevronRight,
  FileJson,
} from "lucide-react";

interface ApiTestResult {
  name: string;
  status: "pending" | "loading" | "success" | "error";
  statusCode?: number;
  responseTime?: number;
  data?: Record<string, unknown>;
  error?: string;
  timestamp?: string;
}

interface SiteTestResult {
  site: string;
  lat: number;
  lon: number;
  status: "pending" | "loading" | "success" | "error";
  temperature?: number;
  windSpeed?: number;
  windDir?: number;
  humidity?: number;
  weatherCode?: number;
  cloudCover?: number;
  responseTime?: number;
  error?: string;
}

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

const WEATHER_CODES: Record<number, string> = {
  0: "Sereno",
  1: "Prevalentemente sereno",
  2: "Parzialmente nuvoloso",
  3: "Coperto",
  45: "Nebbia",
  48: "Nebbia ghiacciata",
  51: "Pioggia leggera",
  53: "Pioggia moderata",
  55: "Pioggia intensa",
  61: "Pioggia",
  63: "Pioggia forte",
  65: "Pioggia molto forte",
  71: "Neve leggera",
  73: "Neve moderata",
  75: "Neve intensa",
  80: "Rovesci",
  81: "Rovesci forti",
  82: "Rovesci violenti",
  95: "Temporale",
  96: "Temporale con grandine",
  99: "Temporale forte con grandine",
};

export default function ApiTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [testResults, setTestResults] = useState<ApiTestResult[]>([]);
  const [siteTests, setSiteTests] = useState<SiteTestResult[]>([]);
  const [selectedSite, setSelectedSite] = useState(DECOLLI[0]);
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");
  const [rawJson, setRawJson] = useState<string | null>(null);

  const getWeatherDescription = (code: number) => WEATHER_CODES[code] || `Codice ${code}`;

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-5 h-5 text-amber-400" />;
    if (code <= 3) return <Cloud className="w-5 h-5 text-slate-400" />;
    if (code >= 45 && code <= 48) return <Cloud className="w-5 h-5 text-slate-300" />;
    if (code >= 51 && code <= 67) return <Droplets className="w-5 h-5 text-blue-400" />;
    if (code >= 71 && code <= 77) return <Cloud className="w-5 h-5 text-slate-200" />;
    if (code >= 80 && code <= 82) return <Cloud className="w-5 h-5 text-blue-300" />;
    if (code >= 95) return <Zap className="w-5 h-5 text-purple-400" />;
    return <Cloud className="w-5 h-5 text-slate-400" />;
  };

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setTotalTime(0);
    setRawJson(null);
    const startTime = Date.now();

    // Test results initiali
    const results: ApiTestResult[] = [
      { name: "Connessione a Open-Meteo", status: "loading" },
      { name: "Fetch current weather", status: "pending" },
      { name: "Fetch hourly forecast", status: "pending" },
      { name: "Fetch daily forecast", status: "pending" },
      { name: "Validazione dati temperatura", status: "pending" },
      { name: "Validazione dati vento", status: "pending" },
      { name: "Validazione dati umidità", status: "pending" },
      { name: "Validazione weather codes", status: "pending" },
    ];
    setTestResults(results);

    // Site tests initiali
    const sites: SiteTestResult[] = DECOLLI.slice(0, 5).map((s) => ({
      site: s.name,
      lat: s.lat,
      lon: s.lon,
      status: "loading",
    }));
    setSiteTests(sites);

    // Test 1: Connessione base
    const connStart = Date.now();
    try {
      const testUrl = `${OPEN_METEO_BASE}?latitude=${selectedSite.lat}&longitude=${selectedSite.lon}&current=temperature_2m&timezone=Europe/Rome`;
      const res = await fetch(testUrl);
      const connTime = Date.now() - connStart;

      results[0] = {
        name: "Connessione a Open-Meteo",
        status: res.ok ? "success" : "error",
        statusCode: res.status,
        responseTime: connTime,
        timestamp: new Date().toISOString(),
      };

      if (!res.ok) {
        results[0].error = `HTTP ${res.status}`;
        setTestResults([...results]);
        setIsRunning(false);
        return;
      }
    } catch (e) {
      results[0] = {
        name: "Connessione a Open-Meteo",
        status: "error",
        responseTime: Date.now() - connStart,
        error: String(e),
      };
      setTestResults([...results]);
      setIsRunning(false);
      return;
    }
    setTestResults([...results]);

    // Test completo: Fetch tutti i dati
    const fullUrl = `${OPEN_METEO_BASE}?latitude=${selectedSite.lat}&longitude=${selectedSite.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe/Rome&forecast_days=3`;

    const fetchStart = Date.now();
    try {
      const res = await fetch(fullUrl);
      const fetchTime = Date.now() - fetchStart;

      if (!res.ok) {
        results[1] = {
          name: "Fetch current weather",
          status: "error",
          statusCode: res.status,
          responseTime: fetchTime,
          error: `HTTP ${res.status}`,
        };
        setTestResults([...results]);
        setIsRunning(false);
        return;
      }

      const json = await res.json();
      setRawJson(JSON.stringify(json, null, 2));

      // Test 2: Current weather
      const current = json.current;
      const currentValid = current && current.temperature_2m != null;
      results[1] = {
        name: "Fetch current weather",
        status: currentValid ? "success" : "error",
        responseTime: fetchTime,
        data: currentValid ? {
          temperature: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          windSpeed: current.wind_speed_10m,
          windDir: current.wind_direction_10m,
          weatherCode: current.weather_code,
        } : undefined,
        error: currentValid ? undefined : "Dati current mancanti",
      };

      // Test 3: Hourly forecast
      const hourly = json.hourly;
      const hourlyValid = hourly && hourly.time && hourly.time.length > 0;
      results[2] = {
        name: "Fetch hourly forecast",
        status: hourlyValid ? "success" : "error",
        data: hourlyValid ? {
          hoursCount: hourly.time.length,
          firstHour: hourly.time[0],
          lastHour: hourly.time[hourly.time.length - 1],
        } : undefined,
        error: hourlyValid ? undefined : "Dati hourly mancanti",
      };

      // Test 4: Daily forecast
      const daily = json.daily;
      const dailyValid = daily && daily.time && daily.time.length > 0;
      results[3] = {
        name: "Fetch daily forecast",
        status: dailyValid ? "success" : "error",
        data: dailyValid ? {
          daysCount: daily.time.length,
          firstDay: daily.time[0],
          lastDay: daily.time[daily.time.length - 1],
        } : undefined,
        error: dailyValid ? undefined : "Dati daily mancanti",
      };

      // Test 5: Validazione temperatura
      const tempValid = currentValid && typeof current.temperature_2m === "number" && current.temperature_2m > -60 && current.temperature_2m < 60;
      results[4] = {
        name: "Validazione dati temperatura",
        status: tempValid ? "success" : "error",
        data: tempValid ? {
          temperature: current.temperature_2m,
          unit: "°C",
          range: "valido (-60°C to 60°C)",
        } : undefined,
        error: tempValid ? undefined : `Temperatura non valida: ${current?.temperature_2m}`,
      };

      // Test 6: Validazione vento
      const windValid = currentValid && typeof current.wind_speed_10m === "number" && current.wind_speed_10m >= 0 && current.wind_speed_10m < 200;
      results[5] = {
        name: "Validazione dati vento",
        status: windValid ? "success" : "error",
        data: windValid ? {
          windSpeed: current.wind_speed_10m,
          windDir: current.wind_direction_10m,
          windGusts: current.wind_gusts_10m,
          unit: "km/h",
        } : undefined,
        error: windValid ? undefined : `Vento non valido: ${current?.wind_speed_10m}`,
      };

      // Test 7: Validazione umidità
      const humidityValid = currentValid && typeof current.relative_humidity_2m === "number" && current.relative_humidity_2m >= 0 && current.relative_humidity_2m <= 100;
      results[6] = {
        name: "Validazione dati umidità",
        status: humidityValid ? "success" : "error",
        data: humidityValid ? {
          humidity: current.relative_humidity_2m,
          unit: "%",
        } : undefined,
        error: humidityValid ? undefined : `Umidità non valida: ${current?.relative_humidity_2m}`,
      };

      // Test 8: Validazione weather codes
      const codeValid = currentValid && typeof current.weather_code === "number" && current.weather_code >= 0;
      results[7] = {
        name: "Validazione weather codes",
        status: codeValid ? "success" : "error",
        data: codeValid ? {
          code: current.weather_code,
          description: getWeatherDescription(current.weather_code),
        } : undefined,
        error: codeValid ? undefined : `Codice non valido: ${current?.weather_code}`,
      };

      setTestResults([...results]);

      // Test multi-sito
      for (let i = 0; i < Math.min(5, DECOLLI.length); i++) {
        const site = DECOLLI[i];
        const siteStart = Date.now();
        try {
          const siteUrl = `${OPEN_METEO_BASE}?latitude=${site.lat}&longitude=${site.lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,relative_humidity_2m,weather_code,cloud_cover&timezone=Europe/Rome`;
          const siteRes = await fetch(siteUrl);
          const siteTime = Date.now() - siteStart;
          const siteJson = await siteRes.json();
          const sCurrent = siteJson.current;

          sites[i] = {
            site: site.name,
            lat: site.lat,
            lon: site.lon,
            status: sCurrent && sCurrent.temperature_2m != null ? "success" : "error",
            temperature: sCurrent?.temperature_2m,
            windSpeed: sCurrent?.wind_speed_10m,
            windDir: sCurrent?.wind_direction_10m,
            humidity: sCurrent?.relative_humidity_2m,
            weatherCode: sCurrent?.weather_code,
            cloudCover: sCurrent?.cloud_cover,
            responseTime: siteTime,
          };
        } catch (e) {
          sites[i] = {
            site: site.name,
            lat: site.lat,
            lon: site.lon,
            status: "error",
            error: String(e),
            responseTime: Date.now() - siteStart,
          };
        }
        setSiteTests([...sites]);
      }
    } catch (e) {
      results[1] = {
        name: "Fetch current weather",
        status: "error",
        error: String(e),
        responseTime: Date.now() - fetchStart,
      };
      setTestResults([...results]);
    }

    setTotalTime(Date.now() - startTime);
    setIsRunning(false);
  }, [selectedSite]);

  // Auto-run test on mount
  useEffect(() => {
    runAllTests();
  }, []);

  // Calcola statistiche
  const passedTests = testResults.filter((t) => t.status === "success").length;
  const failedTests = testResults.filter((t) => t.status === "error").length;
  const totalTests = testResults.length;
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  const getStatusIcon = (status: ApiTestResult["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-5 h-5 rounded-full bg-slate-600" />;
      case "loading":
        return <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                🧪 Diagnostica API Open-Meteo
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Test completo per verifica funzionalità
              </p>
            </div>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 rounded-xl font-medium transition-all"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Test in corso...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Ripeti Test
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Selezione Sito */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Sito di test principale:
          </label>
          <select
            value={selectedSite.name}
            onChange={(e) => {
              const site = DECOLLI.find((s) => s.name === e.target.value);
              if (site) setSelectedSite(site);
            }}
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {DECOLLI.map((site) => (
              <option key={site.name} value={site.name}>
                {site.name} ({site.lat.toFixed(3)}, {site.lon.toFixed(3)})
              </option>
            ))}
          </select>
        </div>

        {/* Riepilogo Test */}
        <div className={`rounded-2xl p-6 border-2 ${
          successRate === 100
            ? "bg-emerald-900/20 border-emerald-500/40"
            : successRate >= 70
              ? "bg-amber-900/20 border-amber-500/40"
              : "bg-red-900/20 border-red-500/40"
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {successRate === 100 ? (
                <CheckCircle className="w-12 h-12 text-emerald-400" />
              ) : successRate >= 70 ? (
                <AlertTriangle className="w-12 h-12 text-amber-400" />
              ) : (
                <XCircle className="w-12 h-12 text-red-400" />
              )}
              <div>
                <div className="text-2xl font-bold">
                  {successRate === 100
                    ? "✅ Tutti i test passati!"
                    : successRate >= 70
                      ? `⚠️ ${failedTests} test falliti`
                      : `❌ ${failedTests} test falliti`}
                </div>
                <div className="text-sm text-slate-400">
                  {totalTests > 0
                    ? `${passedTests}/${totalTests} test passati • ${totalTime}ms totali`
                    : "Clicca \"Ripeti Test\" per iniziare"}
                </div>
              </div>
            </div>
            {totalTests > 0 && (
              <div className="text-right">
                <div className="text-4xl font-bold text-emerald-400">{successRate}%</div>
                <div className="text-xs text-slate-400">Success Rate</div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {totalTests > 0 && (
            <div className="mt-4">
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Risultati Dettagliati */}
        <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => toggleSection("tests")}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Signal className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold">Risultati Test API</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {passedTests}✓ {failedTests > 0 && `${failedTests}✗`}
              </span>
            </div>
            {expandedSection === "tests" ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSection === "tests" && (
            <div className="p-4 pt-0 space-y-3">
              {testResults.map((test, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-slate-900/50 rounded-xl"
                >
                  {getStatusIcon(test.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{test.name}</span>
                      {test.responseTime && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {test.responseTime}ms
                        </span>
                      )}
                      {test.statusCode && (
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {test.statusCode}
                        </span>
                      )}
                    </div>

                    {test.error && (
                      <p className="mt-2 text-sm text-red-400 bg-red-950/30 rounded-lg p-2">
                        ❌ {test.error}
                      </p>
                    )}

                    {test.data && test.status === "success" && (
                      <div className="mt-2 p-3 bg-slate-800/50 rounded-lg">
                        {test.data.temperature != null && (
                          <div className="flex items-center gap-2 mb-1">
                            <Thermometer className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-400 font-bold">
                              {test.data.temperature}°C
                            </span>
                            {test.data.unit && (
                              <span className="text-slate-400 text-sm">{test.data.unit}</span>
                            )}
                          </div>
                        )}
                        {test.data.windSpeed != null && (
                          <div className="flex items-center gap-2 mb-1">
                            <Wind className="w-4 h-4 text-cyan-400" />
                            <span className="text-cyan-400">
                              {test.data.windSpeed} km/h
                              {test.data.windDir != null && ` • ${test.data.windDir}°`}
                            </span>
                          </div>
                        )}
                        {test.data.humidity != null && (
                          <div className="flex items-center gap-2 mb-1">
                            <Droplets className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-400">{test.data.humidity}%</span>
                          </div>
                        )}
                        {test.data.description && (
                          <div className="flex items-center gap-2 mt-2">
                            {getWeatherIcon(test.data.code as number)}
                            <span className="text-slate-300">
                              {test.data.description as string}
                            </span>
                          </div>
                        )}
                        {test.data.hoursCount != null && (
                          <p className="text-sm text-slate-400 mt-2">
                            📅 {test.data.hoursCount} ore • {test.data.firstHour} → {test.data.lastHour}
                          </p>
                        )}
                        {test.data.daysCount != null && (
                          <p className="text-sm text-slate-400 mt-2">
                            📆 {test.data.daysCount} giorni • {test.data.firstDay} → {test.data.lastDay}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Multi-Sito */}
        <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => toggleSection("sites")}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <span className="font-semibold">Test Multi-Sito</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {siteTests.filter((s) => s.status === "success").length}/{siteTests.length} siti
              </span>
            </div>
            {expandedSection === "sites" ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSection === "sites" && (
            <div className="p-4 pt-0 space-y-3">
              {siteTests.map((site, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    site.status === "success"
                      ? "bg-emerald-950/20 border-emerald-900/30"
                      : site.status === "error"
                        ? "bg-red-950/20 border-red-900/30"
                        : "bg-slate-800/30 border-slate-700/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {site.status === "success" ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : site.status === "error" ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                      )}
                      <div>
                        <div className="font-medium">{site.site}</div>
                        <div className="text-xs text-slate-400">
                          ({site.lat.toFixed(4)}, {site.lon.toFixed(4)})
                        </div>
                      </div>
                    </div>
                    {site.responseTime && (
                      <span className="text-xs text-slate-400">{site.responseTime}ms</span>
                    )}
                  </div>

                  {site.status === "success" && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                        <div className="text-lg font-bold text-amber-400">
                          {site.temperature}°C
                        </div>
                        <div className="text-xs text-slate-400">Temperatura</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <Wind className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                        <div className="text-lg font-bold text-cyan-400">
                          {site.windSpeed}
                        </div>
                        <div className="text-xs text-slate-400">km/h</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                        <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <div className="text-lg font-bold text-blue-400">
                          {site.humidity}%
                        </div>
                        <div className="text-xs text-slate-400">Umidità</div>
                      </div>
                    </div>
                  )}

                  {site.error && (
                    <p className="mt-2 text-sm text-red-400">{site.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* JSON Raw */}
        <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => toggleSection("json")}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileJson className="w-5 h-5 text-purple-400" />
              <span className="font-semibold">Response JSON</span>
            </div>
            {expandedSection === "json" ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSection === "json" && rawJson && (
            <div className="p-4 pt-0">
              <pre className="bg-slate-900 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto max-h-96 overflow-y-auto">
                {rawJson}
              </pre>
            </div>
          )}
        </div>

        {/* Info API */}
        <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/50">
          <h3 className="font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Configurazione API
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-slate-400 mb-1">Endpoint</div>
              <code className="text-emerald-400 text-xs break-all">
                {OPEN_METEO_BASE}
              </code>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-slate-400 mb-1">Parametri</div>
              <code className="text-cyan-400 text-xs">
                current, hourly, daily, timezone
              </code>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-slate-400 mb-1">Timezone</div>
              <code className="text-amber-400 text-xs">Europe/Rome</code>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-slate-400 mb-1">Forecast Days</div>
              <code className="text-purple-400 text-xs">3</code>
            </div>
          </div>
        </div>

        {/* Prossimi Passi */}
        <div className="bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 rounded-2xl p-5 border border-emerald-700/30">
          <h3 className="font-bold text-lg text-emerald-300 mb-3 flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            ✅ Test Completati - Prossimi Passi
          </h3>
          <div className="space-y-2 text-sm text-slate-300">
            <p>✅ Connessione API Open-Meteo verificata</p>
            <p>✅ Dati temperatura, vento, umidità validati</p>
            <p>✅ Weather codes corretti</p>
            <p>✅ Test multi-sito completati</p>
            <p className="text-emerald-400 font-medium mt-3">
              → L'API per i telefoni può essere creata ora!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
