// Contratto dati del Pilot Brain (fase F5, regola R3).
// Il componente è presentazionale: riceve il Verdetto già deciso dal Decision
// Engine e le Note già scritte dagli agenti. Nessuna formula di decisione qui:
// nessuna soglia, nessun calcolo meteo, solo resa visiva.
//
// Riferimenti: docs/pilot-brain-ui/PILOT-BRAIN-UX-UI.pdf (wireframe L1, palette,
// tipografia), PILOT_BRAIN_MIGRATION_PLAN.md §F5 (mappa domanda → dato Verdetto).
//
// NOTA idKB: opzionale — le citazioni della Knowledge Base (GO-*, BRF-*, ABT-*,
// SEG-*, TRAP-*, LAND-*) appaiono solo dove la KB copre davvero il sito
// (principio D3 del piano: verdetto citabile solo dove esiste KB). Per gli
// altri decolli del catalogo il dato resta onesto ma senza id citabile.

/** Esito della domanda «Posso volare?» — colore = significato, mai decorazione. */
export type Esito = "GO" | "ATTESA" | "NO-GO";

/** Onestà del dato: sempre visibile accanto al valore (mai simulare un'osservazione). */
export type Onesta = "REALE" | "DERIVATO" | "STIMATO" | "DA VERIFICARE";

/** Tono semantico di un motivo o di una nota (dot colorato: verde/ambra/rosso). */
export type Tono = "favorevole" | "attenzione" | "critico";

export interface MotivoCardData {
  area: "vento" | "termiche" | "sicurezza" | "finestra" | "atterraggio";
  tono: Tono;
  /** Frase in linguaggio pilota, una o due righe brevi. */
  frase: string;
  /** Riga di dati in monospazio che sostiene la frase. */
  dati: string;
  stato: Onesta;
  /** Identificatore citabile della Knowledge Base; assente = sito senza copertura KB. */
  idKB?: string;
}

/** Risposta 2 — «Quando decollo?» → finestra.slot + fasi della facciata (BRF-01). */
export interface RispostaDecollo {
  /** Finestra migliore, es. "11:00 – 13:00"; in attesa/NO-GO lo stato della finestra. */
  slot: string;
  /** Fase della facciata corrente, es. "fase di lavoro". */
  fase: string;
  /** Fascia vietata, es. "13:30–15:00" — chip ambra. */
  piccoVietato?: string;
  idKB?: string;
  stato: Onesta;
}

/** Risposta 3 — «Quando devo scendere?» → grilletti (LAND-*) + turnaround + ombra. */
export interface RispostaDiscesa {
  /** Turnaround, es. "14:00" (valore ambra: è un vincolo, non una promessa). */
  turnaround: string;
  /** Transizione d'ombra in valle, es. "17:40". */
  ombra: string;
  /** Numero di grilletti di atterraggio attivi. */
  grillettiAttivi: number;
  idKB?: string;
  stato: Onesta;
}

/** Risposta 4 — «Posso fare cross?» → margine base/selle (ABT-09). */
export interface RispostaCross {
  /** null = non valutabile adesso (risposta "ANCORA NO", ambra). */
  traversabile: boolean | null;
  /** Esito compatto, es. "SÌ, CON MARGINE". */
  testo: string;
  dettaglio: string;
  idKB?: string;
  stato: Onesta;
}

/** Interpretazione di un agente (F4): arriva già fusa, priorità decisa dal fusore. */
export interface NotaAgente {
  agente: "Safety" | "Montoso" | "Weather" | "XC" | "Pilot" | "Instructor";
  tono: Tono;
  testo: string;
}

/** Il Verdetto completo mostrato dalla schermata L1. Nessun calcolo qui dentro. */
export interface PilotBrainVerdetto {
  sito: string;
  esito: Esito;
  /** Indice di volabilità 0–10; null = non calcolabile (mostra "—"). */
  indice: number | null;
  /** Spiegazione dell'esito in una riga. */
  unaRiga: string;
  /** Ora locale dell'ultimo aggiornamento, es. "12:35". */
  aggiornatoAlle: string;
  /** Età dei dati in minuti: oltre soglia, l'etichetta diventa ambra (colore = significato). */
  etaMinuti: number;
  fonte: Onesta;
  decollo: RispostaDecollo;
  discesa: RispostaDiscesa;
  cross: RispostaCross;
  motivi: MotivoCardData[];
  noteAgenti?: NotaAgente[];
}
