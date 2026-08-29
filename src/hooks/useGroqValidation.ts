"use client";

import { useState, useCallback } from "react";

export interface GroqResult {
  valid: boolean;
  score: number;
  giudizio: "Ottimo" | "Buono" | "Discreto" | "Rischioso" | "Non volabile";
  motivi: string[];
  alert: string;
  finestra_volo: string;
  quota_max_consigliata: number;
}

export function useGroqValidation() {
  const [result, setResult] = useState<GroqResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (data: any, decollo: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weather/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, decollo }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.validazione);
      } else {
        setError(json.error || "Errore validazione");
        setResult(null);
      }
    } catch (e: any) {
      setError(String(e));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, validate };
}