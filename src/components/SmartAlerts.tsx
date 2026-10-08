"use client";

import type { MeteoCurrent } from "@/services/openMeteoService";
import type { HourData } from "@/types/meteo";
import { AlertTriangle, CloudDrizzle, Snowflake, Wind, CloudLightning, Eye } from "lucide-react";
import { calcCloudBase } from "@/utils/calcCloudBase";

interface SmartAlertsProps {
  currentData: MeteoCurrent | null;
  hourlyData: HourData[];
  siteAlt: number;
}

export interface AlertItem {
  type: "danger" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  detail: string;
}

export function generateSmartAlerts(
  current: MeteoCurrent | null,
  hourly: HourData[],
  siteAlt: number
): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (!current || hourly.length === 0) return alerts;

  const t = current.temperature ?? null;
  const dew = current.dewPoint ?? null;
  const spread = (t != null && dew != null) ? Math.max(0.5, t - dew) : null;
  const cloudBase = (t != null && dew != null) ? calcCloudBase(siteAlt, t, dew) : null;
  const validCapes = hourly.map(h => h.cape).filter((c): c is number => c != null);
  const cape = validCapes.length > 0 ? validCapes.reduce((s, h) => s + h, 0) / validCapes.length : null;
  const validLIs = hourly.map(h => h.liftedIndex).filter((li): li is number => li != null);
  const li = validLIs.length > 0 ? validLIs.reduce((s, h) => s + h, 0) / validLIs.length : null;
  const avgHumidity = hourly.reduce((s, h) => s + (h.humidity ?? 50), 0) / hourly.length;
  const rainProb = hourly.reduce((s, h) => s + (h.precipitationProba ?? 0), 0) / hourly.length;
  const windSpeed = current.windSpeed ?? null;
  const windDir = current.windDir ?? null;
  const w850 = hourly[6]?.windDir850 ?? null;
  const waveDiff = (w850 != null && windDir != null)
    ? (() => { let d = Math.abs(w850 - windDir); return d > 180 ? 360 - d : d; })()
    : null;
  const validFreezes = hourly.map(h => h.freezingLevel).filter((f): f is number => f != null && f > 0);
  const avgFreezingLevel = validFreezes.length > 0 ? validFreezes.reduce((s, h) => s + h, 0) / validFreezes.length : null;
  const zeroThermal = avgFreezingLevel != null ? Math.round(avgFreezingLevel) : null;
  const visibility = current.visibility ?? null;

  // === ALLERTA PERICOLOSI ===
  if (cape != null && cape > 1500) {
    alerts.push({
      type: "danger",
      icon: <CloudLightning className="w-4 h-4" />,
      title: "Rischio temporali elevato",
      detail: `CAPE ${Math.round(cape)} J/kg + LI ${li != null ? li.toFixed(1) : "N/D"} → temporali probabili nel pomeriggio`,
    });
  }

  if (cape != null && cape > 800 && avgHumidity > 65) {
    alerts.push({
      type: "danger",
      icon: <CloudLightning className="w-4 h-4" />,
      title: "Temporali possibili",
      detail: `CAPE ${Math.round(cape)} J/kg con umidità ${Math.round(avgHumidity)}% → instabilità pomeridiana`,
    });
  }

  if (li != null && li < -5) {
    alerts.push({
      type: "danger",
      icon: <AlertTriangle className="w-4 h-4" />,
      title: "Instabilità estrema",
      detail: `Lifted Index ${li.toFixed(1)} → aria molto instabile, evitare volo`,
    });
  }

  if (windSpeed != null && windSpeed > 35) {
    alerts.push({
      type: "danger",
      icon: <Wind className="w-4 h-4" />,
      title: "Vento pericoloso al suolo",
      detail: `${Math.round(windSpeed)} km/h → decollo difficile e atterraggio rischioso`,
    });
  }

  const gustRatio = (windSpeed != null && windSpeed > 0 && current.windGusts != null)
    ? (current.windGusts - windSpeed) / windSpeed : null;
  if (gustRatio != null && gustRatio > 0.5) {
    alerts.push({
      type: "danger",
      icon: <Wind className="w-4 h-4" />,
      title: "Raffiche violente",
      detail: `Rapporto raffiche ${Math.round(gustRatio * 100)}% → turbolenza estrema`,
    });
  }

  // === ALLERTA ATTENZIONE ===
  if (spread != null && cloudBase < siteAlt + 300) {
    alerts.push({
      type: "warning",
      icon: <CloudDrizzle className="w-4 h-4" />,
      title: "Base cumuli molto bassa",
      detail: `${Math.round(cloudBase)}m — rischio nebbia mattutina, attendere riscaldamento`,
    });
  }

  if (zeroThermal != null && zeroThermal < siteAlt + 2000) {
    alerts.push({
      type: "warning",
      icon: <Snowflake className="w-4 h-4" />,
      title: "Zero termico basso",
      detail: `${Math.round(zeroThermal)}m — rischio neve/ghiaccio sulle ali in quota`,
    });
  }

  if (waveDiff != null && waveDiff < 30 && windSpeed != null && windSpeed > 20) {
    alerts.push({
      type: "warning",
      icon: <Wind className="w-4 h-4" />,
      title: "Onda montana attiva",
      detail: `Wave index ${Math.round(waveDiff)}° — correnti discendenti forti sottovento`,
    });
  }

  if (visibility != null && visibility < 3000) {
    alerts.push({
      type: "warning",
      icon: <Eye className="w-4 h-4" />,
      title: "Visibilità ridotta",
      detail: `${Math.round(visibility / 1000)}km — volo in montagna pericoloso`,
    });
  }

  if (rainProb > 30) {
    alerts.push({
      type: "warning",
      icon: <CloudDrizzle className="w-4 h-4" />,
      title: "Probabilità pioggia elevata",
      detail: `${Math.round(rainProb)}% nelle prossime ore`,
    });
  }

  // === ALLERTA INFO ===
  if (spread != null && spread > 8 && cape != null && cape > 200 && cape < 600) {
    alerts.push({
      type: "info",
      icon: <CloudLightning className="w-4 h-4" />,
      title: "Buone termiche previste",
      detail: `Spread ${spread.toFixed(1)}°C + CAPE moderato → giornata positiva`,
    });
  }

  if (waveDiff != null && waveDiff >= 30 && waveDiff < 60) {
    alerts.push({
      type: "info",
      icon: <Wind className="w-4 h-4" />,
      title: "Nessuna onda significativa",
      detail: `Wave index ${Math.round(waveDiff)}° — vento diverso tra quote`,
    });
  }

  if (spread != null && cloudBase > siteAlt + 1500 && t != null && t > 20) {
    alerts.push({
      type: "info",
      icon: <CloudDrizzle className="w-4 h-4" />,
      title: "Ottima giornata termica",
      detail: `Base cumuli alta (${Math.round(cloudBase)}m) + temperatura ${Math.round(t)}°C`,
    });
  }

  return alerts;
}

export default function SmartAlerts({ currentData, hourlyData, siteAlt }: SmartAlertsProps) {
  const alerts = generateSmartAlerts(currentData, hourlyData, siteAlt);

  if (alerts.length === 0) return null;

  const typeStyles = {
    danger: "bg-red-500/10 border-red-500/30",
    warning: "bg-amber-500/10 border-amber-500/30",
    info: "bg-sky-500/10 border-sky-500/30",
  };

  const titleColors = {
    danger: "text-red-300",
    warning: "text-amber-300",
    info: "text-sky-300",
  };

  const iconColors = {
    danger: "text-red-400",
    warning: "text-amber-400",
    info: "text-sky-400",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Alert Intelligenti
      </h3>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border ${typeStyles[alert.type]}`}
          >
            <div className={`shrink-0 mt-0.5 ${iconColors[alert.type]}`}>{alert.icon}</div>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${titleColors[alert.type]}`}>{alert.title}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{alert.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
