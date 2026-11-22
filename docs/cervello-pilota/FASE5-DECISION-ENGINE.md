# FASE 5 — DECISION ENGINE: il coordinatore

> Riceve i voti dei 5 agenti (Fase 4) e produce UNA decisione con UNA spiegazione.
> Il prodotto finito deve rispondere in < 5 secondi: un verdetto, una finestra, 3 motivi.

## Contratto di output (cosa vede il pilota)

```jsonc
{
  "verdetto": "SI VOLA | POSSIBILE CON CAUTELA | RESTA A TERRA",
  "finestra": { "da": "12:00", "a": "15:00", "perché": "picco convettivo", "scadenza": "girare della brezza ~15" },
  "giornata": "da cross | allungabile | volo locale | scorribila | non volabile",
  "cross": { "adattabile": true, "limite": null },
  "motivi": [ "…3 righe in ordine d'importanza, catena causale dal grafo…" ],
  "veto": null | { "agente": "safety", "motivo": "…" },
  "confidenza": 0.8
}
```

## Algoritmo

### 1. Veto assoluto (prima di tutto)
Se `SafetyAgent.voto === "NO"` → **RESTA A TERRA**, fine: si mostrano la catena causale
(causa → rischio → veto) e i motivi del veto. Nessun altro agente può sovrascrivere.
*(Regola G4: se l'utente insiste, il veto si ripete con i motivi; la soglia non si abbassa.)*

### 2. Voto ponderato (senza veto)
Pesi di default: `SafetyAgent = veto`, `PilotAgent 0.35`, `InstructorAgent 0.30`,
`XCAgent 0.20`, `WeatherAgent 0.15` (il WeatherAgent non vota il verdetto ma alimenta
la confidenza). Il peso di InstructorAgent cresce con l'inesperienza del profilo
(allievo: 0.45), il peso di XCAgent cresce col profilo XC (0.35).

```
score = Σ voto_i × peso_i           // voto: SI=+2, si=+1, meh=0, no=−1, NO=−2 (solo safety)
score ≥ +1.0 → SI VOLA
−0.5..+1.0  → POSSIBILE CON CAUTELA (i motivi elencano i gialli con mitigazione)
< −0.5      → RESTA A TERRA
```

### 3. Risoluzione dei conflitti (le opinioni divergono)
1. Il conflitto PIÙ informativo è istruttore-vs-XC: lo si esplicita ("per un XC oggi no:
   base scarpa per la rotta nord; per il volo locale sì") — non si media, si spiega.
2. Coerenza numerica garantita: la finestra, il rateo, la base mostrati nel verdetto
   sono GLI STESSI dati di ogni card (lesson del progetto: un solo giudice).
3. Ogni motivo porta la catena dal grafo: "RESTA A TERRA — vento valicante (40 km/h in
   quota) → rotore oltre la cresta → lancio ingovernabile".

### 4. Finestra (sempre presente, anche in NO)
La finestra si calcola col picco convettivo + fase brezza + scadenza (girare previsto,
chiusura OD): anche un "non oggi" dice QUANDO la giornata poteva/beva essere volabile.

## Esempio finale richiesto dalla missione

```
PilotAgent      = SI   (termica +3 m/s, base 2900, finestra 12-15)
InstructorAgent = NO   (profilo ricreativo: shear 28 km/h fra livelli)
SafetyAgent     = NO   (veto: aria mossa marcata + raffiche 55 al pomeriggio)
XCAgent         = meh  (cross possibile ma peggioramento in avanti alle 16)
─────────────────────────────────────────────────────────────────────
Decisione finale = RESTA A TERRA (veto sicurezza prevale)
Motivi:
 1. RAFFICHE 55 km/h nel pomeriggio con aria mossa marcata: la vela non regge
    il lancio e il volo (catena: shear → turbolenza → rischio decollo)
 2. Shear 28 km/h fra livelli: termiche sbrindolate, asimmetriche in virata
 3. Il XC "possibile" alle 12 incontra il peggioramento alle 16: margine 0
Finestra: 12:00-14:30 (picco termico) — rientro OBBLIGATO prima delle raffiche
```

## Integrazione nell'app (dove entra)

1. `src/services/agenti/*` — i 5 agenti come moduli puri (input `WeatherFacts`, output `AgenteVoto`)
2. `src/services/decisionEngine.ts` — il coordinatore (algoritmo sopra), usato da `reportGiornata`
   e dalla home: **una sola fonte del verdetto** (fine dei controsensi)
3. UI: la card verdetto mostra `verdetto + finestra + 3 motivi`; ogni card lega il suo
   numero al verdetto (click sul motivo → catena del grafo)
4. Audit: ogni verdetto logga i voti per replay dei casi (06-CASI-REALI come test di regressione)

## Piano di implementazione (prossimo passo, dopo approvazione)

| Step | Contenuto | Domande coperte |
|---|---|---|
| 1 | `WeatherFacts` + inversione reale dai profili T (tetto) | 3, 4, 7 |
| 2 | SafetyAgent + veti A/E/F (già codificati in parte) | 1, 6 |
| 3 | PilotAgent + InstructorAgent (profili + finestra con brezze) | 1, 2 |
| 4 | XCAgent (rotta, atterraggi, margine) | 5 |
| 5 | DecisionEngine + UI unica del verdetto | tutte, in < 5 s |
