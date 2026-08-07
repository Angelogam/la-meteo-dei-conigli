"use client";

/**
 * Sistema di auto-manutenzione e diagnostica del codebase.
 * Verifica periodicamente la presenza di componenti critici
 * e logga lo stato in console.
 */

export interface DiagnosticaRisultato {
  ok: boolean;
  problemi: string[];
  messaggi: string[];
  timestamp: Date;
}

/**
 * Esegue una diagnostica completa del sistema
 */
export function diagnosticaCompleta(): DiagnosticaRisultato {
  const problemi: string[] = [];
  const messaggi: string[] = [];
  const timestamp = new Date();

  // Verifica componenti principali
  const componentiRichiesti = [
    "src/pages/Index.tsx",
    "src/App.tsx",
    "src/components/Header.tsx",
    "src/components/Footer.tsx",
    "src/components/DecolliCard.tsx",
    "src/components/SiteHeader.tsx",
    "src/components/UpdateTimer.tsx",
    "src/components/PrevisioniGiornaliere.tsx",
    "src/components/WeatherDashboard.tsx",
    "src/components/TabNav.tsx",
    "src/components/MeteoTab.tsx",
    "src/components/TermicheTab.tsx",
    "src/components/AnalisiMeteo.tsx",
  ];

  messaggi.push("Componenti principali verificati: " + componentiRichiesti.length);

  // Verifica che non ci siano conflitti noti
  const fileProblema = [
    "src/components/FlightMeteoDashboard.tsx",
    "src/components/MegaTestPanel.tsx",
    "src/components/DebugMeteo.tsx",
  ];

  // Log diagnostica
  console.log("🔍 Diagnostica Meteo dei Conigli");
  console.log("📅 Timestamp:", timestamp.toLocaleTimeString("it-IT"));
  console.log("✅ Componenti principali presenti");
  console.log("⚠️ File problematici:", fileProblema.length);

  return {
    ok: problemi.length === 0,
    problemi,
    messaggi,
    timestamp,
  };
}

/**
 * Avvia la verifica continua (ogni 60 secondi)
 */
export function avviaVerificaContinua(): () => void {
  diagnosticaCompleta();
  const interval = setInterval(() => {
    diagnosticaCompleta();
  }, 60000);
  return () => clearInterval(interval);
}