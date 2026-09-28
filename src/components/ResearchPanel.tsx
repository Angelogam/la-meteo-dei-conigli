import { useState, useEffect, useRef } from "react";
import { X, ExternalLink, CheckCircle2, XCircle, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ScrapedSite {
  site: string;
  url: string;
  description?: string;
  success: boolean;
  title?: string;
  error?: string;
}

interface ApiResult {
  timestamp: string;
  results: ScrapedSite[];
}

export default function ResearchPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [results, setResults] = useState<ScrapedSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentSite, setCurrentSite] = useState("");
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (open && !fetchedRef.current) {
      fetchedRef.current = true;
      doFetch();
    }
    if (!open) {
      // Reset for next open
      fetchedRef.current = false;
    }
  }, [open]);

  async function doFetch() {
    setLoading(true);
    setError("");
    setResults([]);
    setProgress(0);
    try {
      const res = await fetch("/api/scrape-parapendio");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResult = await res.json();
      setResults(data.results ?? []);
      setProgress(100);
    } catch (e: any) {
      setError(e.message || "Errore di rete — verifica la connessione");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 sm:max-w-2xl">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white flex items-center gap-2 text-lg">
              <Search className="w-5 h-5 text-orange-400" />
              Ricerca Siti Meteo Parapendio
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-400 -mt-1">
            Scansione dei principali siti meteo dedicati al parapendio
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Loading bar */}
          {loading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-slate-500 text-center">
                {currentSite || "Connessione in corso…"}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-300">
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div className="text-center text-slate-500 text-xs py-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-orange-500/30 border-t-orange-400 animate-spin" />
                <span>Scansione in corso…</span>
              </div>
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="text-center text-slate-500 text-xs py-6">
              Clicca il pulsante qui sotto per avviare la scansione
              <br />
              <Button
                onClick={doFetch}
                className="mt-3 bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm px-6"
              >
                🔬 Avvia Scansione
              </Button>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {results.map((r: ScrapedSite) => (
                <div
                  key={r.site}
                  className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3.5"
                >
                  <div className="flex items-start gap-3">
                    {r.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">
                          {r.site}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${r.success ? "border-emerald-500/40 text-emerald-300" : "border-rose-500/40 text-rose-300"}`}
                        >
                          {r.success ? "OK" : "FALLITO"}
                        </Badge>
                      </div>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {r.url}
                      </a>
                      {r.description && (
                        <p className="text-xs text-slate-400 mt-1">
                          {r.description}
                        </p>
                      )}
                      {r.title && (
                        <p className="text-[11px] text-slate-500 mt-1 italic">
                          Titolo: {r.title}
                        </p>
                      )}
                      {!r.success && r.error && (
                        <p className="text-[11px] text-rose-400 mt-1">
                          {r.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
