"use client";

import React from "react";
import { CloudLightning, Wind } from "lucide-react";

interface WindySoundingsCardProps {
  siteName?: string;
}

export default function WindySoundingsCard({ siteName }: WindySoundingsCardProps) {
  return (
    <div
      data-testid="windy-soundings-card"
      style={{
        marginTop: "1rem",
        marginBottom: "1rem",
        padding: "1.25rem",
        borderRadius: "1rem",
        border: "2px solid #22d3ee",
        backgroundColor: "rgba(8, 47, 73, 0.8)",
        boxShadow: "0 20px 25px -5px rgba(6, 182, 212, 0.3)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
          style={{ backgroundColor: "#22d3ee" }}
        >
          <CloudLightning className="w-5 h-5" style={{ color: "#082f49" }} />
        </div>
        <div>
          <h3 className="text-base font-black leading-none" style={{ color: "#cffafe" }}>WINDY PG SOUNDINGS</h3>
          <p className="text-[10px] mt-0.5 font-semibold" style={{ color: "rgba(103, 232, 249, 0.7)" }}>Sondaggi atmosferici per parapendio</p>
        </div>
      </div>

      {/* Griglia dati */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div
          data-testid="windy-card-cape"
          style={{ backgroundColor: "rgba(8, 47, 73, 0.7)", borderRadius: "0.75rem", padding: "0.75rem", textAlign: "center", border: "1px solid rgba(34, 211, 238, 0.3)" }}
        >
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(103, 232, 249, 0.6)" }}>CAPE</div>
          <div className="text-2xl font-black leading-tight mt-1" style={{ color: "#34d399" }}>120</div>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(103, 232, 249, 0.4)" }}>J/kg</div>
        </div>
        <div
          data-testid="windy-card-freezing-level"
          style={{ backgroundColor: "rgba(8, 47, 73, 0.7)", borderRadius: "0.75rem", padding: "0.75rem", textAlign: "center", border: "1px solid rgba(34, 211, 238, 0.3)" }}
        >
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(103, 232, 249, 0.6)" }}>Liv. 0°C</div>
          <div className="text-2xl font-black leading-tight mt-1" style={{ color: "#fbbf24" }}>3800</div>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(103, 232, 249, 0.4)" }}>m quota</div>
        </div>
        <div
          data-testid="windy-card-wind-850"
          style={{ backgroundColor: "rgba(8, 47, 73, 0.7)", borderRadius: "0.75rem", padding: "0.75rem", textAlign: "center", border: "1px solid rgba(34, 211, 238, 0.3)" }}
        >
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(103, 232, 249, 0.6)" }}>Vento 850hPa</div>
          <div className="text-2xl font-black leading-tight mt-1" style={{ color: "#7dd3fc" }}>22</div>
          <div className="text-[10px] mt-0.5" style={{ color: "rgba(103, 232, 249, 0.4)" }}>km/h S-SE</div>
        </div>
      </div>

      {/* Sezione Skew-T */}
      <div style={{ padding: "0.75rem", backgroundColor: "rgba(8, 47, 73, 0.5)", borderRadius: "0.75rem", border: "1px solid rgba(34, 211, 238, 0.2)", marginBottom: "0.75rem" }}>
        <div className="text-xs font-black mb-2 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "#a5f3fc" }}>
          <Wind className="w-3.5 h-3.5" />
          Profilo verticale — Skew-T
        </div>
        <div style={{ height: "4rem", backgroundColor: "rgba(8, 47, 73, 0.8)", borderRadius: "0.5rem", border: "1px solid rgba(34, 211, 238, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "rgba(34, 211, 238, 0.5)", fontSize: "0.75rem", fontWeight: "600" }}>[Diagramma Skew-T]</span>
        </div>
      </div>

      {/* Link plugin */}
      <div className="text-center">
        <a
          href="https://windy-plugins.com/2727410/windy-plugin-pg-soundings/1.6.2/plugin.min.js"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: "900",
            color: "#a5f3fc",
            textDecoration: "none",
            padding: "0.5rem 1rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(34, 211, 238, 0.4)",
            backgroundColor: "rgba(34, 211, 238, 0.15)",
          }}
        >
          <Wind className="w-4 h-4" />
          Plugin originale Windy (apri)
        </a>
      </div>
    </div>
  );
}
