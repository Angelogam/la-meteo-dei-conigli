# FASE 4 — PILOT BRAIN: progetto dei 5 agenti

> Specifica di progetto. Nessuna implementazione prima dell'approvazione della banca dati.
> Regola assoluta: ogni agente esiste per rispondere a una domanda del pilota.

## Architettura a colpo d'occhio

```
 Open-Meteo (batch/report/forecast)  ──►  WeatherAgent
        │
        ├──►  SafetyAgent   (veto assoluto)
        ├──►  InstructorAgent (profilo utente)
        ├──►  PilotAgent     (verdetto di giornata)
        └──►  XCAgent        (adattabilità cross)
                        │
                        ▼
              DecisionEngine (Fase 5)
              verdetto + motivi + finestra
```

## 1. WeatherAgent — "traduce il meteo in fatti volabili"

- **Domande**: 3 (termiche), 4 (base), 7 (vento favorevole), seconda metà della 6 (segnali)
- **Input**: `reportGiornata` (profili T, windgram, rateo, base, CAPE, LI, WMO), `indiceVolabilita`
- **Compito**: trasformare i raw in FATTI tipizzati: `rateoPicco`, `baseLcl`, `tettoReale` (min(LCL, inversione dal profilo T)), `soglia`, `ventoLivelli[]`, `shearDelta`, `ventoSuCresta`, `odicScore`, `faseBrezza(h)`
- **Regole proprie**: B1-B8 (termica/base/tetto), parte di A7/C (vento quota), E2-E3 (indici OD)
- **Non decide**: produce fatti + livello di confidenza (alta/media/bassa) per ciascuno
- **Output**: `WeatherFacts` + 1 riga per fatto ("base 2790 m, tetto reale 2400 m per inversione")

## 2. SafetyAgent — "il veto che non si negozia"

- **Domande**: 1 (veto), 6 (allerta tempesta), 2 (veto finestra)
- **Input**: `WeatherFacts`, WMO, CAPE/pioggia, raffiche/spread, vento quota, radar
- **Compito**: verificare le CONDIZIONI DI BLOCCO in ordine di severità: temporale (E1) →
  CAPE+pioggia (E2) → vento/raffiche decollo (A1/A2) → coda (A3) → vento quota Foehn (A7) →
  rotore evidente (A6) → fronte raffiche in avvicinamento (E4/E5)
- **Regole proprie**: tutto il blocco A + E + F1-F2; pesa il contesto umano (G4: utente insiste
  dopo un NO → il veto non si abbassa, si ripete il motivo)
- **Output**: `voto: OK | NO`, `vetoMotivo`, `catena[]` (dal grafo: causa→rischio→veto)
- **Potere**: veto — il suo NO non è componibile (vedi Fase 5)

## 3. InstructorAgent — "il profilo del pilota davanti al meteo"

- **Domande**: 1-2-7 ricalibrate sul profilo
- **Input**: profilo utente (livello: allievo/ricreativo/esperto/XC, ore, vela, sito noto/not), `WeatherFacts`
- **Compito**: applicare le soglie alla versione giusta per QUESTO pilota (G1-G3): allievo
  (vento ≤ 15-20, niente shear/OD, sito noto, briefing con fallback), ricreativo (standard),
  esperto/XC (prudenziale su quota/OD, gestito su termica)
- **Regole proprie**: blocco G + F (atterraggio/finale) + C5 (virate controvento nel briefing)
- **Output**: `voto: -2..+2`, `soglieUsate[]`, `briefing[]` (3 righe: sito, piano, segnali di uscita)

## 4. PilotAgent — "posso volare oggi e come"

- **Domande**: 1 (verdetto di giornata), 2 (finestra), 3-4 (termica/base in linguaggio pilota)
- **Input**: `WeatherFacts`, indice di giornata, fase della brezza
- **Compito**: classificare la GIORNATA: scorribila / volo locale / allungabile / da cross
  (B2-B6), scegliere la finestra (P2: picco convettivo, fase brezza, girare previsto),
  descriverla in una frase senza contraddizioni (lezione progetto: un solo giudice)
- **Regole proprie**: B (termica/base), C1-C4 (dinamica pendio), P1/P2/P3
- **Output**: `voto: -2..+2`, `tipoGiornata`, `finestra {da, a, perché, scadenza}`, `fraseGiornata`

## 5. XCAgent — "posso fare cross"

- **Domande**: 5 (cross), supporta la 2 (finestra utile) e la 6 (peggioramento in avanti)
- **Input**: `WeatherFacts`, vento in quota sulla rotta, base/soglia, OD score, atterraggi (cartina)
- **Compito**: adattabilità al cross: rateo ≥ 2 ∧ soglia ≥ 900 (B4) ∧ vento contrarie ≤ 25-30 (D3)
  ∧ atterraggi sotto il tratto (D1) ∧ nessun OD attivo (D2/E3); calcola margine glide col vento
  e finestra residua
- **Regole proprie**: blocco D + C6 (Venturi sulla rotta) + P4/P7
- **Output**: `voto: -2..+2`, `adattabile: boolean`, `limiteVincente` (termica|vento|atterraggi|meteo),
  `rottaConsigliata` (direzione favorevole per il girare della brezza)

## Schema di voto comune (input del Decision Engine)

```ts
interface AgenteVoto {
  agente: "safety" | "instructor" | "pilot" | "xc";
  voto: "NO" | "no" | "meh" | "si" | "SI";      // SafetyAgent: solo OK | NO(veto)
  confidenza: number;                             // 0-1
  motivi: string[];                               // in ordine d'importanza
  catena?: string[];                              // id nodi del grafo percorsi
  dettagli?: Record<string, unknown>;             // finestra, limite vincente, ecc.
}
```

## Mappatura su ciò che esiste già

| Esistente | Destinazione |
|---|---|
| `indiceVolabilita.ts` | diventa un fatto di `WeatherAgent` (scala pilota già sistemata) |
| `reportGiornata.ts` verdetto/finestra/veleggiata | PilotAgent (stesse soglie B/C, stesso linguaggio) |
| `threeSourceWeather` stato/indice home | PilotAgent (giornata corrente) |
| radar RainViewer | SafetyAgent (segnale E4) |
| cartina atterraggi | XCAgent (D1) |
