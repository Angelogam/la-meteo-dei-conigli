"use client";

/**
 * Scheda di volo del decollo — il pannello laterale di Meteo-Parapente:
 * - righe informative essenziali e leggibili (termica, vento, base nubi, temp, turbolenza)
 * - il grafico orario "giusto": barre alte quanto la risalita e colorate con
 *   la STESSA scala m/s della cartina (blu → verde → giallo → arancio → rosso → viola)
 * - tacche orarie ogni 3 ore, barra migliore evidenziata, clic per cambiare ora
 */

import { AlertTriangle, Flame, Layers, MapPin, Navigation, Thermometer, Wind, X } from "lucide-react";
import type { CartinaDecollo, HourEval } from "@/components/CartinaMeteo";
import { thermalBarGradient } from "@/utils/thermalField";

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

const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtMs = (v: number) => "+" + v.toFixed(1).replace(".", ",") + " m/s";

export default function CartinaPanel({ snapshot, hours, hour, onClose, onPickHour, onUse }: CartinaPanelProps) {
  if (!snapshot) {
    return (
      <aside className="cmap-panelbox is-empty" data-testid="cartina-panel">
        <button type="button" className="cmap-close" onClick={onClose} aria-label="Chiudi il pannello">
          <X size={14} aria-hidden="true" />
        </button>
        <p className="cmap-empty-title">Tocca un decollo sulla cartina</p>
        <p className="cmap-empty-text">
          Si apre la scheda di volo: verdetto, ascendenza, vento, base nubi e il grafico orario della giornata — come
          la scheda di Meteo-Parapente, ma sui nostri siti.
        </p>
      </aside>
    );
  }

  const { item, eval: e } = snapshot;
  const quota = Number(item.elevation_m ?? item.altitude ?? 0);
  const turb = turbolenza(e?.gusts ?? null, e?.wind ?? null);
  const best = hours.length
    ? hours.reduce((b, h) => (h.rateo > (b?.rateo ?? -1) ? h : b), hours[0])
    : null;

  return (
    <aside className="cmap-panelbox" data-testid="cartina-panel">
      <header className="cmap-pb-head">
        <div className="cmap-pb-title">
          <h3>{item.site_name || item.name}</h3>
          <p>
            <MapPin size={11} aria-hidden="true" /> {item.location_name || item.valley || "—"} ·{" "}
            {quota.toLocaleString("it-IT")} m · Esp. {item.orientation || item.exposure || "N/D"}
          </p>
        </div>
        <button
          type="button"
          className="cmap-close"
          onClick={onClose}
          aria-label={"Chiudi la scheda di " + (item.site_name || item.name)}
        >
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

          <div className="cmap-rows">
            <div className="cmap-row">
              <span className="cmap-row-k">
                <Flame size={12} aria-hidden="true" /> Termica
              </span>
              <span className="cmap-row-v">
                {(e.rateo ?? 0) > 0.05 ? fmtMs(e.rateo ?? 0) : "Assenti"}
              </span>
            </div>
            <div className="cmap-row">
              <span className="cmap-row-k">
                <Wind size={12} aria-hidden="true" /> Vento
              </span>
              <span className="cmap-row-v">
                {e.wind == null ? "N/D" : Math.round(e.wind) + " km/h " + cardinal(e.dir)}
                <small>{e.gusts == null ? "" : " · raffiche " + Math.round(e.gusts) + " km/h"}</small>
              </span>
            </div>
            <div className="cmap-row">
              <span className="cmap-row-k">
                <Layers size={12} aria-hidden="true" /> Base nubi
              </span>
              <span className="cmap-row-v">
                {e.baseNubiM == null ? "N/D" : Math.round(e.baseNubiM).toLocaleString("it-IT") + " m"}
              </span>
            </div>
            <div className="cmap-row">
              <span className="cmap-row-k">
                <Thermometer size={12} aria-hidden="true" /> Temperatura
              </span>
              <span className="cmap-row-v">{e.temp == null ? "N/D" : Math.round(e.temp) + " °C"}</span>
            </div>
            <div className="cmap-row">
              <span className="cmap-row-k">
                <Navigation size={12} aria-hidden="true" /> Turbolenza
              </span>
              <span className="cmap-row-v">
                <span className={turb ? "cmap-turb " + turb.cls : ""}>{turb ? turb.label : "N/D"}</span>
                <small>
                  {e.freezing == null ? "" : " · zero termico " + Math.round(e.freezing).toLocaleString("it-IT") + " m"}
                </small>
              </span>
            </div>
          </div>
        </>
      )}

      <div className="cmap-chart" role="group" aria-label="Andatura oraria della giornata">
        <div className="cmap-bars" data-testid="cartina-bars">
          {hours.map((h) => (
            <div className="cmap-slot" key={h.hour}>
              <button
                type="button"
                className={
                  "cmap-bar" + (h.hour === hour ? " is-on" : "") + (best && h.hour === best.hour && h.rateo > 0.05 ? " is-best" : "")
                }
                style={
                  {
                    "--bh": Math.round(12 + 88 * Math.min(1, h.rateo / Math.max(1, best?.rateo ?? 1))) + "%",
                    "--bfill": thermalBarGradient(h.rateo),
                  } as React.CSSProperties
                }
                onClick={() => onPickHour(h.hour)}
                title={`${pad2(h.hour)}:00 · ${h.rateo > 0.05 ? fmtMs(h.rateo) : "termiche assenti"}`}
                aria-label={`Ore ${h.hour}: ascendenza ${h.rateo.toFixed(1)} metri al secondo`}
              >
                <i />
              </button>
              <small className={h.hour === hour ? "is-on" : ""}>{h.hour % 3 === 0 ? pad2(h.hour) : ""}</small>
            </div>
          ))}
        </div>
      </div>
      <p className="cmap-bars-help">
        Altezza e colore = m/s di risalita (scala della cartina) · la barra luminosa è la migliore · clicca per
        cambiare ora
      </p>

      <button type="button" className="cmap-use" onClick={onUse}>
        <MapPin size={13} aria-hidden="true" /> Vai a questo decollo
      </button>
    </aside>
  );
}
