"use client";

import React, { useState, useCallback } from "react";
import { DECOLLI } from "@/data/decolli";
import {
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Server,
  Globe,
  MapPin,
  Thermometer,
  Wind,
  Clock,
  Zap,
  FileText,
  AlertTriangle,
} from "lucide-react";

interface TestResult {
  name: string;
  status: "pending" | "loading" | "success" | "error";
  statusCode?: number;
  responseTime?: number;
  data?: Record<string, unknown>;
  error?: string;
}

interface TestSuite {
  name: string;
  icon: React.ReactNode;
  tests: TestResult[];
}

const API_BASE = "http://localhost:3000";

export default function ApiTestRunner() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [selectedSite, setSelectedSite] = useState(DECOLLI[0]);

  const runTests = useCallback(async () => {
    setIsRunning(true);
    setTotalTime(0);
    const startTime = Date.now();

    // Inizializza le suite di test
    const suites: TestSuite[] = [
      {
        name: "Server Locale",
        icon: <Server className="w-5 h-5" />,
        tests: [
          {
            name: "Connessione al server",
            status: "loading",
          },
        ],
      },
      {
        name: "Endpoint /api/meteo/test",
        icon: <Zap className="w-5 h-5" />,
        tests: [
          {
            name: "GET /api/meteo/test",
            status: "loading",
          },
        ],
      },
      {
        name: `Endpoint /api/meteo (${selectedSite.name})`,
        icon: <Globe className="w-5 h-5" />,
        tests: [
          {
            name: `GET /api/meteo?lat=${selectedSite.lat}&lon=${selectedSite.lon}`,
            status: "loading",
          },
        ],
      },
      {
        name: "Validazione Parametri",
        icon: <FileText className="w-5 h-5" />,
        tests: [
          {
            name: "Coordinate mancanti",
            status: "loading",
          },
          {
            name: "Coordinate invalide (lat=999)",
            status: "loading",
          },
          {
            name: "Coordinate fuori range",
            status: "loading",
          },
        ],
      },
      {
        name: "Test Multi-Sito",
        icon: <MapPin className="w-5 h-5" />,
        tests: DECOLLI.slice(0, 5).map((site) => ({
          name: `${site.name} (${site.lat}, ${site.lon})`,
          status: "loading" as const,
        })),
      },
    ];

    setTestSuites(suites);

    // Test 1: Connessione al server
    const serverStart = Date.now();
    try {
      const serverRes = await fetch(`${API_BASE}/api/meteo/test`, {
        method: "GET",
      });
      const serverTime = Date.now() - serverStart;

      suites[0].tests[0] = {
        name: "Connessione al server",
        status: serverRes.ok ? "success" : "error",
        statusCode: serverRes.status,
        responseTime: serverTime,
      };
    } catch {
      suites[0].tests[0] = {
        name: "Connessione al server",
        status: "error",
        error: "Server non raggiungibile. Assicurati che il server sia in esecuzione con: node server/api-server.mjs",
      };
    }
    setTestSuites([...suites]);

    // Test 2: Endpoint /api/meteo/test
    const testStart = Date.now();
    try {
      const testRes = await fetch(`${API_BASE}/api/meteo/test`);
      const testTime = Date.now() - testStart;
      const testData = await testRes.json();

      suites[1].tests[0] = {
        name: "GET /api/meteo/test",
        status: testRes.ok && testData.temperature ? "success" : "error",
        statusCode: testRes.status,
        responseTime: testTime,
        data: testData,
      };
    } catch (e) {
      suites[1].tests[0] = {
        name: "GET /api/meteo/test",
        status: "error",
        error: String(e),
      };
    }
    setTestSuites([...suites]);

    // Test 3: Endpoint /api/meteo con coordinate
    const meteoStart = Date.now();
    try {
      const meteoRes = await fetch(
        `${API_BASE}/api/meteo?lat=${selectedSite.lat}&lon=${selectedSite.lon}`
      );
      const meteoTime = Date.now() - meteoStart;
      const meteoData = await meteoRes.json();

      suites[2].tests[0] = {
        name: `GET /api/meteo?lat=${selectedSite.lat}&lon=${selectedSite.lon}`,
        status: meteoRes.ok && meteoData.temperature != null ? "success" : "error",
        statusCode: meteoRes.status,
        responseTime: meteoTime,
        data: meteoData,
      };
    } catch (e) {
      suites[2].tests[0] = {
        name: `GET /api/meteo?lat=${selectedSite.lat}&lon=${selectedSite.lon}`,
        status: "error",
        error: String(e),
      };
    }
    setTestSuites([...suites]);

    // Test 4: Validazione parametri
    const validationTests = [
      { url: `${API_BASE}/api/meteo`, expectedError: true },
      { url: `${API_BASE}/api/meteo?lat=999&lon=7.35`, expectedError: true },
      { url: `${API_BASE}/api/meteo?lat=91&lon=7.35`, expectedError: true },
    ];

    for (let i = 0; i < validationTests.length; i++) {
      const vTest = validationTests[i];
      const vStart = Date.now();
      try {
        const res = await fetch(vTest.url);
        const vTime = Date.now() - vStart;
        const data = await res.json();
        const hasError = data.error != null;

        suites[3].tests[i] = {
          name: suites[3].tests[i].name,
          status: (hasError === vTest.expectedError && res.status === 400) ? "success" : "error",
          statusCode: res.status,
          responseTime: vTime,
          data,
        };
      } catch (e) {
        suites[3].tests[i] = {
          name: suites[3].tests[i].name,
          status: "error",
          error: String(e),
        };
      }
    }
    setTestSuites([...suites]);

    // Test 5: Multi-sito
    for (let i = 0; i < suites[4].tests.length; i++) {
      const site = DECOLLI[i];
      const msStart = Date.now();
      try {
        const res = await fetch(`${API_BASE}/api/meteo?lat=${site.lat}&lon=${site.lon}`);
        const msTime = Date.now() - msStart;
        const data = await res.json();

        suites[4].tests[i] = {
          name: `${site.name} (${site.lat}, ${site.lon})`,
          status: res.ok && data.temperature != null ? "success" : "error",
          statusCode: res.status,
          responseTime: msTime,
          data,
        };
      } catch (e) {
        suites[4].tests[i] = {
          name: `${site.name} (${site.lat}, ${site.lon})`,
          status: "error",
          error: String(e),
        };
      }
    }
    setTestSuites([...suites]);

    setTotalTime(Date.now() - startTime);
    setIsRunning(false);
  }, [selectedSite]);

  const getStatusIcon = (status: TestResult["status"]) => {
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

  const getStatusBadge = (status: TestResult["status"]) => {
    switch (status) {
      case "pending":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">Pending</span>;
      case "loading":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400">Loading...</span>;
      case "success":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400">Success</span>;
      case "error":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Error</span>;
    }
  };

  const getSuiteIcon = (icon: React.ReactNode, status: TestResult["status"]) => {
    const colorClass =
      status === "success"
        ? "text-emerald-400"
        : status === "error"
          ? "text-red-400"
          : status === "loading"
            ? "text-amber-400"
            : "text-slate-400";
    return <div className={colorClass}>{icon}</div>;
  };

  // Calcola statistiche
  const allTests = testSuites.flatMap((s) => s.tests);
  const passedTests = allTests.filter((t) => t.status === "success").length;
  const failedTests = allTests.filter((t) => t.status === "error").length;
  const totalTests = allTests.length;

  const getOverallStatus = () => {
    if (totalTests === 0) return null;
    if (failedTests > 0) return "error";
    if (passedTests === totalTests) return "success";
    return "pending";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                🧪 API Test Runner
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Test completo per {API_BASE}
              </p>
            </div>
            <button
              onClick={runTests}
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
                  Avvia Test
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Selezione Sito */}
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <label className="block text-sm font-medium text-slate-300 mb-2">
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
                {site.name} ({site.lat}, {site.lon})
              </option>
            ))}
          </select>
        </div>

        {/* Server Info */}
        <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <Server className="w-4 h-4" />
            <span>Server: <code className="text-emerald-400">{API_BASE}</code></span>
            <span>•</span>
            <span>Endpoints: <code className="text-cyan-400">/api/meteo/test</code>, <code className="text-cyan-400">/api/meteo</code></span>
          </div>
        </div>

        {/* Risultati Test */}
        {testSuites.length > 0 ? (
          <>
            {/* Riepilogo */}
            <div className={`rounded-2xl p-5 border-2 ${
              getOverallStatus() === "success"
                ? "bg-emerald-900/20 border-emerald-500/40"
                : getOverallStatus() === "error"
                  ? "bg-red-900/20 border-red-500/40"
                  : "bg-slate-800/40 border-slate-700/40"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getOverallStatus() === "success" ? (
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  ) : getOverallStatus() === "error" ? (
                    <XCircle className="w-8 h-8 text-red-400" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-slate-400" />
                  )}
                  <div>
                    <div className="text-xl font-bold">
                      {getOverallStatus() === "success"
                        ? "✅ Tutti i test passati!"
                        : getOverallStatus() === "error"
                          ? "❌ Alcuni test falliti"
                          : "Test non ancora eseguiti"}
                    </div>
                    <div className="text-sm text-slate-400">
                      {totalTests > 0
                        ? `${passedTests}/${totalTests} test passati • ${failedTests} falliti • ${totalTime}ms`
                        : "Clicca \"Avvia Test\" per iniziare"}
                    </div>
                  </div>
                </div>
                {totalTests > 0 && (
                  <button
                    onClick={runTests}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {totalTests > 0 && (
                <div className="mt-4">
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${(passedTests / totalTests) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Suite di Test */}
            <div className="space-y-4">
              {testSuites.map((suite, suiteIndex) => {
                const suitePassed = suite.tests.filter((t) => t.status === "success").length;
                const suiteTotal = suite.tests.length;
                const suiteStatus =
                  suite.tests.every((t) => t.status === "success")
                    ? "success"
                    : suite.tests.some((t) => t.status === "error")
                      ? "error"
                      : suite.tests.some((t) => t.status === "loading")
                        ? "loading"
                        : "pending";

                return (
                  <div
                    key={suiteIndex}
                    className={`rounded-2xl border ${
                      suiteStatus === "success"
                        ? "bg-emerald-950/20 border-emerald-900/30"
                        : suiteStatus === "error"
                          ? "bg-red-950/20 border-red-900/30"
                          : "bg-slate-800/30 border-slate-700/50"
                    }`}
                  >
                    {/* Suite Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-700/30">
                      <div className="flex items-center gap-3">
                        {getSuiteIcon(suite.icon, suiteStatus)}
                        <span className="font-semibold">{suite.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-400">
                          {suitePassed}/{suiteTotal}
                        </span>
                        {suiteStatus === "success" && (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        )}
                        {suiteStatus === "error" && (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    </div>

                    {/* Test Items */}
                    <div className="p-4 space-y-3">
                      {suite.tests.map((test, testIndex) => (
                        <div
                          key={testIndex}
                          className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl"
                        >
                          {getStatusIcon(test.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{test.name}</span>
                              {getStatusBadge(test.status)}
                              {test.statusCode && (
                                <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                                  {test.statusCode}
                                </span>
                              )}
                              {test.responseTime && (
                                <span className="flex items-center gap-1 text-xs text-slate-400">
                                  <Clock className="w-3 h-3" />
                                  {test.responseTime}ms
                                </span>
                              )}
                            </div>

                            {/* Error Message */}
                            {test.error && (
                              <p className="mt-2 text-sm text-red-400 bg-red-950/30 rounded-lg p-2">
                                {test.error}
                              </p>
                            )}

                            {/* Response Data */}
                            {test.data && (
                              <div className="mt-2 p-3 bg-slate-800/50 rounded-lg text-xs font-mono overflow-x-auto">
                                {test.data.temperature != null && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <Thermometer className="w-3 h-3 text-amber-400" />
                                    <span className="text-amber-400 font-bold">
                                      {test.data.temperature}°C
                                    </span>
                                  </div>
                                )}
                                {test.data.wind_speed != null && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <Wind className="w-3 h-3 text-cyan-400" />
                                    <span className="text-cyan-400">
                                      {test.data.wind_speed} km/h
                                    </span>
                                  </div>
                                )}
                                {test.data.error && (
                                  <div className="text-red-400">
                                    Errore: {test.data.error}
                                  </div>
                                )}
                                {test.data.timestamp && (
                                  <div className="flex items-center gap-2 mt-2 text-slate-400">
                                    <Clock className="w-3 h-3" />
                                    {test.data.timestamp}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <Play className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-300 mb-2">
              Pronto per i test
            </h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Clicca "Avvia Test" per verificare tutti gli endpoint dell'API meteo.
              Assicurati che il server sia in esecuzione.
            </p>
          </div>
        )}

        {/* Istruzioni */}
        <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/50">
          <h3 className="font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Prima di eseguire i test
          </h3>
          <p className="text-sm text-slate-400 mb-2">
            Il server API deve essere in esecuzione. Avvialo con:
          </p>
          <code className="block bg-slate-900 rounded-lg p-3 text-emerald-400 text-sm">
            node server/api-server.mjs
          </code>
        </div>
      </div>
    </div>
  );
}
