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

  const t = current.temperature ?? 18;
  const dew = current.dewPoint ?? t - 8;
  const spread = Math.max(0.5, t - dew);
  const cloudBase = calcCloudBase(siteAlt, t, dew);
  const cape = hourly.reduce((s, h) => s + (h.cape ?? 0), 0) / hourly.length;
  const li = hourly.reduce((s, h) => s + (h.liftedIndex ?? 0), 0) / hourly.length;
  const avgHumidity = hourly.reduce((s, h) => s + (h.humidity ?? 50), 0) / hourly.length;
  const rainProb = hourly.reduce((s, h) => s + (h.precipitationProba ?? 0), 0) / hourly.length;
  const windSpeed = current.windSpeed ?? 0;
  const windDir = current.windDir ?? 200;
  const w850 = hourly[6]?.windDir850 ?? 200;
  let waveDiff = Math.abs(w850 - windDir);
  if (waveDiff > 180) waveDiff = 360 - waveDiff;
  const avgFreezingLevel = hourly.reduce((s, h) => s + (h.freezingLevel ?? 0), 0) / hourly.length;
  const zeroThermal = avgFreezingLevel > 0 ? Math.round(avgFreezingLevel) : siteAlt + 3000;
  const visibility = current.visibility ?? 10000;

  // === ALLERTA PERICOLOSI ===
  if (cape > 1500) {
    alerts.push({
      type: "danger",
      icon: <CloudLightning className="w-4 h-4" />,
      title: "Rischio temporali elevato",
      detail: `CAPE ${Math.round(cape)} J/kg + LI ${li.toFixed(1)} → temporali probabili nel pomeriggio`,
    });
  }

  if (cape > 800 && avgHumidity > 65) {
    alerts.push({
      type: "danger",
      icon: <CloudLightning className="w-4 h-4" />,
      title: "Temporali possibili",
      detail: `CAPE ${Math.round(cape)} J/kg con umidità ${Math.round(avgHumidity)}% → instabilità pomeridiana`,
    });
  }

  if (li < -5) {
    alerts.push({
      type: "danger",
      icon: <AlertTriangle className="w-4 h-4" />,
      title: "Instabilità estrema",
      detail: `Lifted Index ${li.toFixed(1)} → aria molto instabile, evitare volo`,
    });
  }

  if (windSpeed > 35) {
    alerts.push({
      type: "danger",
      icon: <Wind className="w-4 h-4" />,
      title: "Vento pericoloso al suolo",
      detail: `${Math.round(windSpeed)} km/h → decollo difficile e atterraggio rischioso`,
    });
  }

  const gustRatio = windSpeed > 0 ? (current.windGusts! - windSpeed) / windSpeed : 0;
  if (gustRatio > 0.5) {
    alerts.push({
      type: "danger",
      icon: <Wind className="w-4 h-4" />,
      title: "Raffiche violente",
      detail: `Rapporto raffiche ${Math.round(gustRatio * 100)}% → turbolenza estrema`,
    });
  }

  // === ALLERTA ATTENZIONE ===
  if (cloudBase < siteAlt + 300) {
    alerts.push({
      type: "warning",
      icon: <CloudDrizzle className="w-4 h-4" />,
      title: "Base cumuli molto bassa",
      detail: `${Math.round(cloudBase)}m — rischio nebbia mattutina, attendere riscaldamento`,
    });
  }

  if (zeroThermal < siteAlt + 2000) {
    alerts.push({
      type: "warning",
      icon: <Snowflake className="w-4 h-4" />,
      title: "Zero termico basso",
      detail: `${Math.round(zeroThermal)}m — rischio neve/ghiaccio sulle ali in quota`,
    });
  }

  if (waveDiff < 30 && windSpeed > 20) {
    alerts.push({
      type: "warning",
      icon: <Wind className="w-4 h-4" />,
      title: "Onda montana attiva",
      detail: `Wave index ${Math.round(waveDiff)}° — correnti discendenti forti sottovento`,
    });
  }

  if (visibility < 3000) {
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
  if (spread > 8 && cape > 200 && cape < 600) {
    alerts.push({
      type: "info",
      icon: <CloudLightning className="w-4 h-4" />,
      title: "Buone termiche previste",
      detail: `Spread ${spread.toFixed(1)}°C + CAPE moderato → giornata positiva`,
    });
  }

  if (waveDiff >= 30 && waveDiff < 60) {
    alerts.push({
      type: "info",
      icon: <Wind className="w-4 h-4" />,
      title: "Nessuna onda significativa",
      detail: `Wave index ${Math.round(waveDiff)}° — vento diverso tra quote`,
    });
  }

  if (cloudBase > siteAlt + 1500 && t > 20) {
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
