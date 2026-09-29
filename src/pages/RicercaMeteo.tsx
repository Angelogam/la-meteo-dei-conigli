"use client";

import React, { useState } from "react";
import { Compass, Globe, Loader2, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface SiteResult {
  site: string;
  url: string;
  description: string;
  success: boolean;
  error?: string;
  title?: string;
  textPreview?: string;
}

export default function RicercaMeteo() {
  const [results, setResults] = useState<SiteResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/scrape-parapendio");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      alert("Errore: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-400/40 mb-4">
            <Compass className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white">
            Ricerca Meteo Siti Parapendio
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            Analisi dei siti di riferimento per le previsioni meteo parapendio
          </p>
        </div>

        <div className="bg-gradient-to-br from-rose-950/80 to-rose-900/40 border border-rose-500/30 rounded-2xl p-6 shadow-lg shadow-rose-900/40">
          <button
            onClick={runSearch}
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white font-black text-sm py-4 px-6 rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Ricerca in corso...
              </>
            ) : (
              <>
                <Globe className="w-5 h-5" />
                🔬 AVVIA RICERCA WEB
              </>
            )}
          </button>
        </div>

        {results && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-white">Risultati ({results.length})</h2>
            {results.map((r, i) => (
              <div
                key={i}
                className={`rounded-2xl p-5 border ${
                  r.success
                    ? "bg-emerald-950/30 border-emerald-500/30"
                    : "bg-red-950/30 border-red-500/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {r.success ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400 shrink-0" />
                    )}
                    <div>
                      <h3 className="font-black text-white capitalize">{r.site}</h3>
                      <p className="text-xs text-slate-400">{r.description}</p>
                    </div>
                  </div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Visita
                  </a>
                </div>
                {r.success && r.title && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-slate-500 mb-1">Titolo:</p>
                    <p className="text-sm text-slate-200 font-semibold">{r.title}</p>
                  </div>
                )}
                {r.error && (
                  <p className="mt-2 text-xs text-red-400">Errore: {r.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}