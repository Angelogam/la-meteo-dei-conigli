"use client";

import { useState } from "react";
import { Download, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

interface ScrapeResult {
  site: string;
  url: string;
  description: string;
  success: boolean;
  content?: string;
  error?: string;
}

export default function ResearchPanel() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScrapeResult[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function scrape() {
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/scrape-parapendio");
      const data = await res.json();
      setResults(data.results || [data]);
    } catch (err) {
      setResults([{
        site: "error",
        url: "",
        description: String(err),
        success: false,
        error: String(err)
      }]);
    } finally {
      setLoading(false);
    }
  }

  function downloadResult(result: ScrapeResult) {
    const blob = new Blob([result.content || "N/A"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-${result.site}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-sm">🔬 Ricerca Web — Siti Meteo Parapendio</h2>
          <p className="text-slate-500 text-xs mt-0.5">Scarica contenuti dai siti di riferimento per studio piloti</p>
        </div>
        <button
          onClick={scrape}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "In corso..." : "Avvia Ricerca"}
        </button>
      </div>

      {results && (
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.site} className="border border-slate-700/40 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === r.site ? null : r.site)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/50 transition-colors text-left"
              >
                {r.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-bold truncate">{r.site}</div>
                  <div className="text-slate-500 text-xs truncate">{r.url}</div>
                </div>
                <div className="flex items-center gap-2">
                  {r.content && (
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {(r.content.length / 1024).toFixed(0)}KB
                    </span>
                  )}
                  <Download
                    className="w-3.5 h-3.5 text-slate-500 hover:text-white cursor-pointer transition-colors"
                    onClick={(e) => { e.stopPropagation(); downloadResult(r); }}
                  />
                </div>
              </button>
              
              {expanded === r.site && (
                <div className="px-3 pb-3 border-t border-slate-700/30">
                  <p className="text-slate-400 text-xs mt-2">{r.description}</p>
                  {r.error && (
                    <p className="text-rose-400 text-xs mt-1">❌ {r.error}</p>
                  )}
                  {r.content && (
                    <pre className="text-slate-300 text-xs mt-2 bg-slate-950/50 p-2 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap break-all">
                      {r.content.substring(0, 2000)}
                      {r.content.length > 2000 && "...(troncato)"}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!results && !loading && (
        <p className="text-slate-600 text-xs text-center py-4">
          Premi "Avvia Ricerca" per scaricare i contenuti dei siti
        </p>
      )}
    </div>
  );
}
