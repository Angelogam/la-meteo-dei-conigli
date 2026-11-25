"use client";

// FlightDecisionBanner — la riga istantanea delle 4 risposte (regola R4:
// si vola? · quando decollo · quando atterro · cross — leggibile in 3 secondi),
// posizionata sopra il briefing completo del PilotBrainHero.
//
// Regole implementate:
// - R3: nessuna formula qui — mappa il Verdetto già deciso (tipi in ./verdetto/types).
// - R5: colore = significato, mai decorazione: verde solo GO, ambra solo
//   ATTESA/attenzione, rosso solo NO-GO/critico.
// - Onestà dei dati: il valore "—" appare quando la risposta non è valutabile,
//   senza mai inventare un numero.

import type { Esito, PilotBrainVerdetto } from "./verdetto/types";

const ESITO_LABEL: Record<Esito, string> = {
  GO: "SI VOLA",
  ATTESA: "IN ATTESA",
  "NO-GO": "NO GO",
};

const ESITO_CLASSE: Record<Esito, string> = {
  GO: "border-go bg-go/10 text-go",
  ATTESA: "border-attesa bg-attesa/10 text-attesa",
  "NO-GO": "border-nogo bg-nogo/10 text-nogo",
};

export default function FlightDecisionBanner({
  verdetto,
  className,
}: {
  verdetto: PilotBrainVerdetto;
  className?: string;
}) {
  const etaFuoriSoglia = verdetto.etaMinuti > 30;
  const crossClasse =
    verdetto.cross?.traversabile === true
      ? "text-go"
      : verdetto.cross?.traversabile === false
        ? "text-nogo"
        : "text-attesa";
  const slot = verdetto.decolo?.slot?.trim() || "—";
  const fase = verdetto.decolo?.fase?.trim() || "";
  const turnaround = verdetto.discesa?.turnaround?.trim() || "—";
  const ombra = verdetto.discesa?.ombra?.trim() || "";
  const crossTesto = verdetto.cross?.testo?.trim() || "—";
  const crossDettaglio = verdetto.cross?.dettaglio?.trim() || "";

  return (
    <section
      data-testid="flight-decision-banner"
      aria-label={`Risposte rapide per ${verdetto.sito}: ${ESITO_LABEL[verdetto.esito]}, decollo ${slot}, atterraggio ${turnaround}, cross ${crossTesto}`}
      className={`rounded-2xl border border-strumento-bordo bg-strumento-bg font-body text-strumento-testo ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-strumento-bordo px-4 py-2 sm:px-5">
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-strumento-secondo sm:text-xs">
          La decisione in 4 risposte
        </span>
        <span
          className={
            "font-mono text-[11px] sm:text-xs " +
            (etaFuoriSoglia ? "font-semibold text-attesa" : "text-strumento-secondo")
          }
          title={etaFuoriSoglia ? "Dati oltre i 30 minuti: rivaluta prima di decollare" : undefined}
        >
          Aggiornato alle {verdetto.aggiornatoAlle}
          {etaFuoriSoglia ? ` · dati di ${verdetto.etaMinuti} min` : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 divide-strumento-bordo md:grid-cols-4 md:divide-x">
        <div className="flex flex-col gap-1 px-4 py-3 sm:px-5">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-strumento-secondo sm:text-[11px]">
            Posso volare?
          </span>
          <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 font-display text-sm font-bold uppercase tracking-wide sm:text-base ${ESITO_CLASSE[verdetto.esito]}`}>
            {ESITO_LABEL[verdetto.esito]}
          </span>
          <span className="font-mono text-xs text-strumento-secondo">
            indice {verdetto.indice === null ? "—" : verdetto.indice.toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/10
          </span>
        </div>

        <div className="flex flex-col gap-1 border-t border-strumento-bordo px-4 py-3 sm:px-5 md:border-t-0">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-strumento-secondo sm:text-[11px]">
            Quando decollo
          </span>
          <span className="font-display text-lg font-bold leading-tight sm:text-xl">{slot}</span>
          {fase ? (
            <span className="truncate font-mono text-xs text-strumento-secondo">{fase}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 border-t border-strumento-bordo px-4 py-3 sm:px-5 md:border-t-0">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-strumento-secondo sm:text-[11px]">
            Quando atterro
          </span>
          <span className="font-display text-lg font-bold leading-tight text-attesa sm:text-xl">{turnaround}</span>
          {ombra ? (
            <span className="truncate font-mono text-xs text-strumento-secondo">ombra {ombra}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 border-t border-strumento-bordo px-4 py-3 sm:px-5 md:border-t-0">
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-strumento-secondo sm:text-[11px]">
            Posso fare cross
          </span>
          <span className={`font-display text-lg font-bold leading-tight sm:text-xl ${crossClasse}`}>
            {crossTesto}
          </span>
          {crossDettaglio ? (
            <span className="truncate font-mono text-xs text-strumento-secondo">{crossDettaglio}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
