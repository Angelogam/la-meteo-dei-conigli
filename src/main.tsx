import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./graph-readability.css";
import "./open-source-layout.css";
import "./decolli-compare.css";

/**
 * ErrorBoundary di root: un errore in un ramo dell'albero non deve più
 * lasciare la pagina completamente bianca. Mostra un messaggio di servizio
 * con possibilità di ricaricare i dati.
 */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Errore nell'albero React:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem",
            background: "linear-gradient(168deg, #0d1a2e, #091223)", color: "#dbe7f8",
            fontFamily: "Manrope, system-ui, sans-serif", textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 460 }}>
            <div style={{ fontSize: "2.2rem", marginBottom: ".6rem" }}>🐇</div>
            <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 .5rem", color: "#f4f8ff" }}>
              Qualcosa è andato storto
            </h1>
            <p style={{ fontSize: ".88rem", lineHeight: 1.55, color: "#9db3d2", margin: "0 0 1.2rem" }}>
              Un modulo della pagina non è riuscito a caricarsi. Ricaricando di solito si sistema:
              i dati meteo verranno richiesti di nuovo alle fonti.
            </p>
            <button
              type="button"
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{
                padding: ".55rem 1.3rem", borderRadius: 10, border: "1px solid rgba(148,197,255,.4)",
                background: "rgba(56,189,248,.15)", color: "#e6f2ff", fontWeight: 600, fontSize: ".85rem",
                cursor: "pointer",
              }}
            >
              Ricarica la pagina
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>,
);
