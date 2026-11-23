"use client";

// PilotBrainHero — la schermata L1 del progetto UX/UI Pilot Brain
// (docs/pilot-brain-ui/PILOT-BRAIN-UX-UI.pdf, wireframe «OGGI»).
//
// Regole implementate:
// - R3: nessuna formula qui — riceve il Verdetto già deciso (tipi in ./types).
// - R4: le 4 risposte nel primo viewport, una riga ciascuna, touch target >= 64 px.
// - R5: niente marketing, niente emoji, niente colori decorativi:
//   verde solo GO, ambra solo ATTESA/attenzione, rosso solo NO-GO/critico.
// - Onestà dei dati: ogni motivo porta id KB (dove la KB copre il sito) e
//   badge di provenienza (REALE/DERIVATO/DA VERIFICARE).

import { ChevronRight } from "lucide-react";
import type { Esito, MotivoCardData, PilotBrainVerdetto, Tono } from "./types";

const ESITO_STYLE: Record<Esito, { band: string; value: string; chip: string; dot: string }> = {
  GO: {
    band: "border-go bg-go/10",
    value: "text-go",
    chip: "border-go text-go",
    dot: "bg-go",
  },
  ATTESA: {
    band: "border-attesa bg-attesa/10",
    value: "text-attesa",
    chip: "border-attesa text-attesa",
    dot: "bg-attesa",
  },
  "NO-GO": {
    band: "border-nogo bg-nogo/10",
    value: "text-nogo",
    chip: "border-nogo text-nogo",
    dot: "bg-nogo",
  },
};

const TONO_DOT: Record<Tono, string> = {
  favorevole: "bg-go",
  attenzione: "bg-attesa",
  critico: "bg-nogo",
};

const AREA_LABEL: Record<MotivoCardData["area"], string> = {
  vento: "Vento",
  termiche: "Termiche",
  sicurezza: "Sicurezza",
  finestra: "Finestra",
  atterraggio: "Atterraggio",
};

function formatoIndice(indice: number | null): string {
  if (indice === null || Number.isNaN(indice)) return "—";
  return indice.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function etaLabel(etaMinuti: number): string {
  if (etaMinuti <= 0) return "AGG. ORA";
  return `AGG. ${etaMinuti} MIN`;
}

interface PilotBrainHeroProps {
  verdetto: PilotBrainVerdetto;
  onChecklist?: () => void;
  onBriefing?: () => void;
  className?: string;
}

export default function PilotBrainHero({ verdetto, onChecklist, onBriefing, className }: PilotBrainHeroProps) {
  const s = ESITO_STYLE[verdetto.esito];
  const etaFuoriSoglia = verdetto.etaMinuti > 30;
  const crossValue =
    verdetto.cross.traversabile === true
      ? "text-go"
      : verdetto.cross.traversabile === false
        ? "text-nogo"
        : "text-attesa";

  return (
    <section
      aria-label={`Pilot Brain — verdetto di oggi per ${verdetto.sito}: ${verdetto.esito}`}
      className={`rounded-3xl border border-strumento-bordo bg-strumento-bg font-body text-strumento-testo ${className ?? ""}`}
    >
      {/* barra di stato: sito, età dei dati, fonti */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-strumento-bordo px-4 py-3 sm:px-5">
        <div className="font-display text-xl font-semibold uppercase tracking-wide sm:text-2xl">
          {verdetto.sito}
          <span className="ml-2 text-sm font-medium text-strumento-secondo sm:text-base">· Pilot Brain</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] sm:text-xs">
          <span
            className={
              etaFuoriSoglia
                ? "font-semibold text-attesa"
                : "text-strumento-secondo"
            }
            title={etaFuoriSoglia ? "Dati oltre i 30 minuti: rivaluta" : undefined}
          >
            {etaLabel(verdetto.etaMinuti)} · {verdetto.aggiornatoAlle}
          </span>
          <span className="rounded-full border border-strumento-bordo px-2 py-0.5 uppercase text-strumento-secondo">
            fonti {verdetto.fonte}
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* risposta 1 — banda verdetto: il colore È il verdetto */}
        <div
          role="status"
          aria-live="polite"
          className={`rounded-2xl border-2 ${s.band} p-4 sm:p-5`}
        >
          <div className="flex items-end justify-between gap-4">
            <div className={`font-display text-6xl font-bold leading-none sm:text-7xl ${s.value}`}>
              {verdetto.esito}
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-widest text-strumento-secondo">Indice</div>
              <div className="font-display text-3xl font-bold leading-none sm:text-4xl">
                {formatoIndice(verdetto.indice)}
              </div>
            </div>
          </div>
          <p className="mt-2 text-sm text-strumento-testo/90 sm:text-base">{verdetto.unaRiga}</p>
        </div>

        {/* risposte 2, 3, 4 — una riga ciascuna, touch target >= 64 px */}
        <ul className="mt-3 grid gap-2">
          <li className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-strumento-bordo bg-strumento-panel px-4 py-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-strumento-secondo">
                2 · Quando decollo?
              </div>
              <div className="font-display text-3xl font-bold leading-tight">{verdetto.decollo.slot}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-strumento-secondo">
                <span>{verdetto.decollo.fase}</span>
                {verdetto.decollo.piccoVietato && (
                  <span className="rounded-md border border-attesa px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-attesa">
                    Vietato {verdetto.decollo.piccoVietato}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight aria-hidden className="shrink-0 size-5 text-strumento-secondo" />
          </li>

          <li className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-strumento-bordo bg-strumento-panel px-4 py-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-strumento-secondo">
                3 · Quando devo scendere?
              </div>
              <div className="font-display text-3xl font-bold leading-tight text-attesa">
                TRN {verdetto.discesa.turnaround}
              </div>
              <div className="mt-0.5 text-sm text-strumento-secondo">
                Turnaround · ombra in valle {verdetto.discesa.ombra} · grilletti attivi{" "}
                {verdetto.discesa.grillettiAttivi}
              </div>
            </div>
            <ChevronRight aria-hidden className="shrink-0 size-5 text-strumento-secondo" />
          </li>

          <li className="flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-strumento-bordo bg-strumento-panel px-4 py-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-strumento-secondo">
                4 · Posso fare cross?
              </div>
              <div className={`font-display text-3xl font-bold leading-tight ${crossValue}`}>
                {verdetto.cross.testo}
              </div>
              <div className="mt-0.5 text-sm text-strumento-secondo">{verdetto.cross.dettaglio}</div>
            </div>
            <ChevronRight aria-hidden className="shrink-0 size-5 text-strumento-secondo" />
          </li>
        </ul>

        {/* azioni secondarie */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onChecklist}
            className="flex min-h-12 items-center justify-center rounded-2xl border border-strumento-testo/50 px-3 text-sm font-semibold uppercase tracking-wide text-strumento-testo transition-colors hover:bg-strumento-testo/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dati"
          >
            Checklist a terra
          </button>
          <button
            type="button"
            onClick={onBriefing}
            className="flex min-h-12 items-center justify-center rounded-2xl border border-strumento-testo/50 px-3 text-sm font-semibold uppercase tracking-wide text-strumento-testo transition-colors hover:bg-strumento-testo/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dati"
          >
            Briefing completo
          </button>
        </div>

        {/* note degli agenti (F4): arrivano già fuse, priorità decisa dal fusore */}
        {verdetto.noteAgenti && verdetto.noteAgenti.length > 0 && (
          <div className="mt-3 rounded-2xl border border-strumento-bordo bg-strumento-panel px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-strumento-secondo">
              Note agenti
            </div>
            <ul className="mt-1.5 grid gap-1.5">
              {verdetto.noteAgenti.map((nota) => (
                <li key={`${nota.agente}-${nota.testo}`} className="flex items-start gap-2 text-sm">
                  <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${TONO_DOT[nota.tono]}`} />
                  <span className="font-semibold text-strumento-secondo">{nota.agente}</span>
                  <span className="min-w-0 flex-1 text-strumento-testo/90">{nota.testo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* perché — in linguaggio pilota, con id KB e onestà del dato */}
        <div className="mt-3 rounded-2xl border border-strumento-bordo bg-strumento-panel px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-strumento-secondo">
            Perché — in linguaggio pilota
          </div>
          <ul className="mt-2 grid gap-2.5">
            {verdetto.motivi.map((m) => (
              <li key={`${m.idKB ?? m.area}-${m.frase}`} className="border-l-2 border-strumento-bordo pl-3">
                <div className="flex items-center gap-2">
                  <span aria-hidden className={`size-2 shrink-0 rounded-full ${TONO_DOT[m.tono]}`} />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-strumento-secondo">
                    {AREA_LABEL[m.area]}
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase text-strumento-secondo">
                    {m.idKB ? `${m.idKB} · ` : ""}{m.stato}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-strumento-testo">{m.frase}</p>
                <p className="mt-0.5 font-mono text-xs text-dati">{m.dati}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
