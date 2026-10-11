"use client";

import React from "react";

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

export default class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep a useful diagnostic without allowing one tab to blank the whole app.
    console.error("[La Meteo dei Conigli] Errore nella sezione:", error, info.componentStack);
  }

  private retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section
          role="alert"
          className="rounded-2xl border border-amber-400/30 bg-slate-900/90 p-5 text-slate-100 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-xl" aria-hidden="true">⚠️</span>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-amber-200">
                {this.props.title ?? "Questa sezione non è riuscita a caricarsi"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-300">
                La schermata principale resta disponibile. Riprova a caricare questa sezione;
                se il problema continua, aggiorna la pagina e controlla i dati del servizio.
              </p>
              <button
                type="button"
                onClick={this.retry}
                className="mt-4 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              >
                Riprova
              </button>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
