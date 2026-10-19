"use client";

import { Calendar, MapPin, Wind } from "lucide-react";
import ProfessionalWindgram from "@/components/ProfessionalWindgram";

interface VentiInterpolatiTabProps {
  lat: number;
  lon: number;
  quotaDecollo: number;
  selectedDay: number;
  oraCorrente?: number;
  onOraChange?: (ora: number) => void;
  siteName?: string;
  rawData?: any;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Vista aerologica del decollo selezionato.
 * Usa esclusivamente il windgram nativo Open-Meteo: niente iframe esterni o
 * loghi di provider terzi sopra la matrice del profilo atmosferico.
 */
export default function VentiInterpolatiTab({
  lat,
  lon,
  quotaDecollo,
  selectedDay,
  siteName,
  rawData,
}: VentiInterpolatiTabProps) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + selectedDay);
  const dateLabel = formatDateShort(targetDate);

  return (
    <div className="alpium-windgram-page space-y-4" data-testid="alpium-windgram-page">
      <div className="alpium-launch-heading">
        <span className="alpium-launch-icon" aria-hidden="true">
          <Wind className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="alpium-launch-kicker">SOUNDING · PROFILO VERTICALE · VOLO LIBERO</p>
          <h2>{siteName || "Decollo selezionato"} · Windgram aerologico</h2>
          <p>
            <MapPin className="inline h-3.5 w-3.5" aria-hidden="true" /> {Math.round(lat * 10000) / 10000}, {Math.round(lon * 10000) / 10000}
            <span className="mx-2">·</span>
            <Calendar className="inline h-3.5 w-3.5" aria-hidden="true" /> {dateLabel}
            <span className="mx-2">·</span>
            Decollo {Math.round(quotaDecollo).toLocaleString("it-IT")} m s.l.m.
          </p>
        </div>
      </div>

      <ProfessionalWindgram
        latitude={lat}
        longitude={lon}
        altitude={quotaDecollo}
        siteName={siteName}
        selectedDay={selectedDay}
        rawData={rawData}
      />
    </div>
  );
}
