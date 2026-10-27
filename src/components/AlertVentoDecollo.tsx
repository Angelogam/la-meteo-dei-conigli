"use client";

import React from "react";
import { Wind, AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";
import { validaVentoPerDecollo, getVentoStatusColor } from "@/utils/validaVentoDecollo";

interface AlertVentoDecolloProps {
  windDir: number;
  windSpeed: number;
  exposure: string;
  siteName: string;
}

export default function AlertVentoDecollo({
  windDir,
  windSpeed,
  exposure,
  siteName,
}: AlertVentoDecolloProps) {
  if (windDir == null) return null;

  const valutazione = validaVentoPerDecollo(windDir, exposure);
  const colorClass = getVentoStatusColor(valutazione.status);

  return (
    <div className={`rounded-xl border-2 p-4 ${colorClass}`}>
      <div className="flex items-start gap-3">
        {/* Icona */}
        <div className="shrink-0 mt-0.5 text-2xl">{valutazione.icon}</div>

        <div className="flex-1 min-w-0">
          {/* Intestazione */}
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-white">
              {siteName} — {valutazione.label}
            </h4>
            <span className="text-xs font-bold opacity-80">
              {Math.round(windSpeed)} km/h da {Math.round(windDir)}°
            </span>
          </div>

          {/* Descrizione */}
          <p className="text-xs text-white/80 leading-relaxed">
            {valutazione.descrizione}
          </p>

          {/* Dettagli aggiuntivi per sottovento */}
          {valutazione.status === "sottovento" && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-red-200 bg-red-900/30 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Con esposizione <strong>{exposure}</strong> e vento da <strong>{Math.round(windDir)}°</strong>,
                il decollo è completamente sottovento. Il vento scavalca la cresta e crea turbolenza
                sul versante opposto. <strong>Non volare in queste condizioni.</strong>
              </span>
            </div>
          )}

          {/* Consiglio per laterale */}
          {valutazione.status === "laterale" && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-200 bg-amber-900/30 rounded-lg px-3 py-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Vento laterale ({Math.round(windDir)}°) rispetto all'esposizione ({exposure}).
                Decollo possibile ma preparati a una componente laterale in fase di apertura.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}