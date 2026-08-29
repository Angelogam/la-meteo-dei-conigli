"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { useGroqValidation, GroqResult } from "@/hooks/useGroqValidation";
import { DECOLLI } from "@/data/decolli";

interface ValidationMap {
  [siteId: string]: GroqResult;
}

interface GroqValidationContextType {
  validations: ValidationMap;
  loading: boolean;
  error: string | null;
  validateAll: (weatherMap: Record<string, any>) => Promise<void>;
  getValidation: (siteId: string) => GroqResult | null;
}

const GroqValidationContext = createContext<GroqValidationContextType | null>(null);

export function GroqValidationProvider({ children }: { children: React.ReactNode }) {
  const [validations, setValidations] = useState<ValidationMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAll = useCallback(async (weatherMap: Record<string, any>) => {
    setLoading(true);
    setError(null);
    const newValidations: ValidationMap = {};

    const entries = Object.entries(weatherMap);
    for (let i = 0; i < entries.length; i += 5) {
      const batch = entries.slice(i, i + 5);
      await Promise.all(
        batch.map(async ([siteId, data]) => {
          const decollo = DECOLLI.find(d => d.id === siteId);
          if (!decollo) return;
          try {
            const res = await fetch("/api/weather/validate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ data, decollo }),
            });
            const json = await res.json();
            if (json.success) {
              newValidations[siteId] = json.validazione;
            }
          } catch (e) {
            console.warn(`Groq validation failed for ${siteId}:`, e);
          }
        })
      );
    }

    setValidations(newValidations);
    setLoading(false);
  }, []);

  const getValidation = useCallback((siteId: string) => validations[siteId] || null, [validations]);

  return (
    <GroqValidationContext.Provider value={{ validations, loading, error, validateAll, getValidation }}>
      {children}
    </GroqValidationContext.Provider>
  );
}

export function useGroqValidationContext() {
  const ctx = useContext(GroqValidationContext);
  if (!ctx) throw new Error("useGroqValidationContext must be inside GroqValidationProvider");
  return ctx;
}