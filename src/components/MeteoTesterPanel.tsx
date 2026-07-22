"use client";

import React, { useState, useCallback } from "react";
import { DECOLLI } from "@/data/decolli";
import {
  testSingleSite,
  testAllSites,
  type TestResult,
} from "@/utils/meteoTester";
import {
  Play,
  Square,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Clock,
  Server,
  Loader2,
} from "lucide-react";

interface MeteoTesterPanelProps {
  onClose?: () => void;
}

function MeteoTesterPanel({ onClose }: MeteoTesterPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [singleSiteResult, setSingleSiteResult] = useState<TestResult | null>(null);
  const [testingSite, setTestingSite] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  // Test singolo sito
  const runSingleTest = useCallback(
    async (site: { id: string; name: string; lat: number; lon: number; alt: number; exposure: string }) => {
      setTestingSite(site.name);
      setSingleSiteResult(null);
      try {
        const result = await testSingleSite(site);
        setSingleSiteResult(result);
      } catch (err) {
        console.error(err);
      } finally {
        setTestingSite(null);
      }
    },
    []
  );

  // Test tutti
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    setSummary("");

    const sites = DECOLLI.map((d) => ({
      id: d.id,
      name: d.name,
      lat: d.lat,
      lon: d.lon,
      alt: d.altitude,
      exposure: d.exposure,
    }));

    try {
      const result = await testAllSites(
        sites,
        (result, index, total) => {
          setProgress(Math.round((index / total) * 100));
          setResults((prev) => [...prev, result]);
        }
      );
      setSummary(result.summary);
    } catch (err) {
      setSummary(`Errore: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunning(false);
      setProgress(0);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/98 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80 shrink-0">
        <div className="flex items-center gap-3">
          <Server className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-bold text-white">
            Meteo Tester · {DECOLLI.length} siti
          </span>
          {isRunning && (
            <span className="text-xs text-emerald-300">
              {progress}% completato
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isRunning && (
            <button
              onClick={runAllTests}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs text-white"
            >
              <Play className="w-3.5 h-3.5" /> Test tutti i decolli
            </button>
          )}
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white px-2 py-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="h-2 bg-slate-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Summary */}
        {summary && (
          <div
            className={`rounded-xl p-4 border text-sm ${
              summary.includes("TUTTI")
                ? "bg-emerald-900/20 border-emerald-500/40 text-emerald-300"
                : "bg-amber-900/20 border-amber-500/40 text-amber-300"
            }`}
          >
            {summary}
          </div>
        )}

        {/* Single site test */}
        <div>
          <h3 className="text-sm font-bold text-slate-300 mb-2">
            Test singolo sito
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DECOLLI.slice(0, 8).map((site) => (
              <button
                key={site.id}
                onClick={() =>
                  runSingleTest({
                    id: site.id,
                    name: site.name,
                    lat: site.lat,
                    lon: site.lon,
                    alt: site.altitude,
                    exposure: site.exposure,
                  })
                }
                disabled={testingSite === site.name}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-left hover:bg-slate-700/50 transition-colors disabled:opacity-50"
              >
                <div className="text-xs font-bold text-white truncate">
                  {site.name}
                </div>
                <div className="text-[10px] text-slate-400">
                  {site.altitude}m · {site.exposure}
                </div>
                {testingSite === site.name && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Test in corso...
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Single site result */}
        {singleSiteResult && (
          <div
            className={`rounded-xl p-4 border text-sm ${
              singleSiteResult.success
                ? "bg-emerald-900/20 border-emerald-500/40"
                : "bg-red-900/20 border-red-500/40"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {singleSiteResult.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className="font-bold text-white">
                {singleSiteResult.siteName}
              </span>
              <span className="text-[10px] text-slate-500 ml-auto">
                {singleSiteResult.responseTimeMs}ms
              </span>
            </div>
            {singleSiteResult.errors.length > 0 && (
              <div className="text-red-300 text-xs space-y-1 mt-1">
                {singleSiteResult.errors.map((e, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <XCircle className="w-3 h-3 shrink-0" />
                    {e}
                  </div>
                ))}
              </div>
            )}
            {singleSiteResult.warnings.length > 0 && (
              <div className="text-amber-300 text-xs space-y-1 mt-1">
                {singleSiteResult.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results list */}
        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-300">
              Risultati ({results.length})
            </h3>
            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded-xl p-3 border text-xs ${
                  r.success
                    ? "bg-slate-800/40 border-slate-700/30"
                    : "bg-red-900/20 border-red-800/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {r.success ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className="font-bold text-white">{r.siteName}</span>
                    <span className="text-slate-500">{r.responseTimeMs}ms</span>
                  </div>
                </div>
                {r.errors.length > 0 && (
                  <div className="text-red-300 mt-1">
                    {r.errors.map((e, j) => (
                      <div key={j}>{e}</div>
                    ))}
                  </div>
                )}
                {r.warnings.length > 0 && (
                  <div className="text-amber-300 mt-1">
                    {r.warnings.map((w, j) => (
                      <div key={j}>{w}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MeteoTesterPanel;