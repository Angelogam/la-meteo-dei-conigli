"use client";

/**
 * Pannello di dettaglio della Cartina dei decolli: si apre al tocco di un marker,
 * come il pannello windgram di meteo-parapente. Mostra verdetto, termica, vento,
 * base nubi, turbolenza e le barre orarie cliccabili della giornata.
 */

import { AlertTriangle, Flame, Layers, MapPin, Navigation, Thermometer, Wind, X } from "lucide-react";
import type { CartinaDecollo, HourEval } from "@/components/CartinaMeteo";

export interface PanelHour {
  hour: number;
  rateo: number;
  classe: "is-good" | "is-fair" | "is-bad";
  wind: number | null;
  gusts: number | null;
}

export interface PanelSnapshot {
  item: CartinaDecollo;
  eval: HourEval | null;
}

interface CartinaPanelProps {
  snapshot: PanelSnapshot | null;
  hours: PanelHour[];
  hour: number;
  onClose: () => void;
  onPickHour: (h: number) => void;
  onUse: () => void;
}

const REL_LABEL: Record<string, string> = {
  frontale: "Vento in fronte",
  diagonale: "Vento diagonale",
  laterale: "Vento laterale",
  di_coda: "Vento in coda",
  sconosciuto: "Vento N/D",
};

function cardinal(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "–";
  return ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"][
    Math.round((((deg % 360) + 360) % 360) / 22.5) % 16
  ];
}

function turbolenza(gusts: number | null, wind: number | null): { label: string; cls: string } | null {
  if (gusts == null || wind == null) return null;
  const delta = Math.max(0, gusts - wind);
  if (delta < 10) return { label: "Lieve", cls: "is-low" };
  if (delta < 18) return { label: "Moderata", cls: "is-mid" };
  return { label: "Forte", cls: "is-high" };
}

export default function CartinaPanel({ snapshot, hours, hour, onClose, onPickHour, onUse }: CartinaPanelProps) {
  if (!snapshot) {
    return (
      <aside className="cmap-panelbox is-empty" data-testid="cartina-panel">
        <button type="button" className="cmap-close" onClick={onClose} aria-label="Chiudi il pannello">
          <X size={14} aria-hidden="true" />
        </button>
        <p className="cmap-empty-title">Tocca un decollo sulla cartina</p>
        <p className="cmap-empty-text">
          Si apre la scheda di volo: verdetto, ascendenza, vento e le barre orarie della giornata — come il windgram
          di Meteo-Parapente, ma sui nostri siti.
        </p>
      </aside>
    );
  }

  const { item, eval: e } = snapshot;
  const quota = Number(item.elevation_m ?? item.altitude ?? 0);
  const turb = turbolenza(e?.gusts ?? null, e?.wind ?? null);
  const maxRateo = Math.max(1, ...hours.map((h) => h.rateo));

  return (
    <aside className="cmap-panelbox" data-testid="cartina-panel">
      <header className="cmap-pb-head">
        <div className="cmap-pb-title">
          <h3>{item.site_name || item.name}</h3>
          <p>
            <MapPin size={11} aria-hidden="true" /> {item.location_name || item.valley || "—"} · {quota.toLocaleString("it-IT")} m
            · Esp. {item.orientation || item.exposure || "N/D"}
          </p>
        </div>
        <button type="button" className="cmap-close" onClick={onClose} aria-label={"Chiudi la scheda di " + (item.site_name || item.name)}>
          <X size={14} aria-hidden="true" />
        </button>
      </header>

      {!e ? (
        <p className="cmap-pb-nodata">
          <AlertTriangle size={14} aria-hidden="true" /> Dati non disponibili per questo sito in questo momento.
        </p>
      ) : (
        <>
          <div className={"cmap-verdict " + e.classe}>
            <i className="cmap-verdict-dot" aria-hidden="true" />
            <strong>{e.label}</strong>
            <em>{REL_LABEL[e.rel] ?? "Vento N/D"}</em>
            <span>
              Ore {String(e.hour).padStart(2, "0")}:00
            </span>
          </div>

          <div className="cmap-stats">
            <div className="cmap-stat">
              <Flame size={13} aria-hidden="true" />
              <span>Termica</span>
              <strong>{(e.rateo ?? 0) > 0.05 ? "+" + (e.rateo ?? 0).toFixed(1).replace(".", ",") + " m/s" : "Assenti"}</strong>
            </div>
            <div className="cmap-stat">
              <Wind size={13} aria-hidden="true" />
              <span>Vento</span>
              <strong>
                {e.wind == null ? "N/D" : Math.round(e.wind) + " km/h " + cardinal(e.dir)}
              </strong>
              <small>{e.gusts == null ? "" : "raffiche " + Math.round(e.gusts) + " km/h"}</small>
            </div>
            <div className="cmap-stat">
              <Layers size={13} aria-hidden="true" />
              <span>Base nubi</span>
              <strong>{e.baseNubiM == null ? "N/D" : Math.round(e.baseNubiM).toLocaleString("it-IT") + " m"}</strong>
            </div>
            <div className="cmap-stat">
              <Thermometer size={13} aria-hidden="true" />
              <span>Temperatura</span>
              <strong>{e.temp == null ? "N/D" : Math.round(e.temp) + " °C"}</strong>
            </div>
            <div className="cmap-stat">
              <Navigation size={13} aria-hidden="true" />
              <span>Turbolenza</span>
              <strong className={turb ? "cmap-turb " + turb.cls : ""}>{turb ? turb.label : "N/D"}</strong>
              <small>{e.freezing == null ? "" : "zero termico " + Math.round(e.freezing).toLocaleString("it-IT") + " m"}</small>
            </div>
          </div>
        </>
      )}

      <div className="cmap-bars" role="group" aria-label="Andatura oraria della giornata">
        {hours.map((h) => (
          <button
            key={h.hour}
            type="button"
            className={"cmap-bar " + h.classe + (h.hour === hour ? " is-on" : "")}
            style={{ "--bh": Math.round(18 + 82 * Math.min(1, h.rateo / maxRateo)) + "%" } as React.CSSProperties}
            onClick={() => onPickHour(h.hour)}
            title={`${String(h.hour).padStart(2, "0")}:00 · +${h.rateo.toFixed(1).replace(".", ",")} m/s`}
            aria-label={`Ore ${h.hour}: ascendenza ${h.rateo.toFixed(1)} metri al secondo`}
          >
            <i />
          </button>
        ))}
      </div>
      <p className="cmap-bars-help">Altezza = m/s di risalita · colore = volabilità · clicca una barra per cambiare ora</p>

      <button type="button" className="cmap-use" onClick={onUse}>
        <MapPin size={13} aria-hidden="true" /> Vai a questo decollo
      </button>
    </aside>
  );
}
