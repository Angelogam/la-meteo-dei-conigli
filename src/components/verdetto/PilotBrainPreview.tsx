"use client";

// Preview di sviluppo del Pilot Brain (fase F5).
// Rotta: /dev/pilot-brain — montata SOLO in dev (vedi src/App.tsx): le fixture
// di demoVerdetto non devono mai apparire nella dashboard reale (R3: il
// Verdetto visibile ai piloti arriva da calcolaVerdettoInterim sui dati reali,
// poi dal Decision Engine quando F2 è attiva).
// Serve a verificare visivamente i tre stati semantici su mobile e desktop.

import PilotBrainHero from "./PilotBrainHero";
import { demoVerdetti } from "./demoVerdetto";

const STATI = ["GO", "ATTESA", "NO-GO"] as const;

export default function PilotBrainPreview() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 sm:px-8">
      <header className="mx-auto max-w-5xl">
        <h1 className="font-display text-3xl font-semibold uppercase tracking-widest text-white">
          Pilot Brain — preview F5 · 3 stati
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Route di sviluppo (solo build DEV). Componente presentazionale con fixture coerenti
          alla Knowledge Base; la dashboard reale usa calcolaVerdettoInterim sui dati Open-Meteo.
        </p>
      </header>

      <div className="mx-auto mt-6 grid max-w-5xl gap-10">
        {STATI.map((stato) => (
          <section key={stato} aria-label={`Stato ${stato} — larghezza mobile 390 px`}>
            <h2 className="mb-2 font-display text-xl font-semibold uppercase tracking-widest text-slate-300">
              Stato {stato} · mobile 390 px
            </h2>
            <div className="w-full max-w-[390px]">
              <PilotBrainHero verdetto={demoVerdetti[stato]} />
            </div>
          </section>
        ))}

        <section aria-label="Stato GO — larghezza desktop">
          <h2 className="mb-2 font-display text-xl font-semibold uppercase tracking-widest text-slate-300">
            Stato GO · larghezza desktop (colonna dashboard)
          </h2>
          <PilotBrainHero verdetto={demoVerdetti.GO} />
        </section>
      </div>
    </main>
  );
}
