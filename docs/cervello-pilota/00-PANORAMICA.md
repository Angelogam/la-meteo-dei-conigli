# CERVELLO PILOTA — Panoramica della banca dati

> Missione: trasformare Open-Meteo in un copilota virtuale che ragiona come un pilota
> esperto di parapendio e permette di prendere una decisione in meno di 5 secondi.
>
> Questo archivio è la base di conoscenza su cui si costruiranno gli agenti (Fase 4)
> e il decision engine (Fase 5). Nessuna nuova funzionalità si scrive senza passare da qui.

## Contenuto della banca dati

| File | Contenuto | Serve a |
|---|---|---|
| [01-CONCETTI.md](01-CONCETTI.md) | 18 concetti del dominio, ciascuno con meccanismo e implicazioni | vocabolario comune per agenti e UI |
| [02-REGOLE.md](02-REGOLE.md) | regole decisionali in formato SE→ALLORA→PERCHÉ | cuore logico degli agenti |
| [03-SOGLIE.md](03-SOGLIE.md) | tutte le soglie numeriche con fonte e confidenza | parametrizzare il codice |
| [04-RISCHI.md](04-RISCHI.md) | catalogo dei rischi con catene causali | SafetyAgent |
| [05-DECISIONI.md](05-DECISIONI.md) | playbook di decisione (decollo, in volo, XC, tempesta, atterraggio) | comportamento degli agenti |
| [06-CASI-REALI.md](06-CASI-REALI.md) | casi documentati con fonti | test di regressione del ragionamento |
| [07-ERRORI-DA-EVITARE.md](07-ERRORI-DA-EVITARE.md) | catalogo degli errori tipici | l'app non deve consigliare questi errori |
| [FASE2-GRAFO.md](FASE2-GRAFO.md) + [grafo-conoscenza.json](grafo-conoscenza.json) | mappa concettuale dei collegamenti | ragionamento a catena degli agenti |
| [FASE3-COMPRENSIONE.md](FASE3-COMPRENSIONE.md) | come ragionano pilota / istruttore / pilota XC | voce e priorità delle raccomandazioni |
| [FASE4-AGENTI.md](FASE4-AGENTI.md) | progetto dei 5 agenti | architettura del Pilot Brain |
| [FASE5-DECISION-ENGINE.md](FASE5-DECISION-ENGINE.md) | coordinatore con voto e veto | la decisione finale in 5 secondi |

## Le 7 domande del pilota — la bussola di ogni funzione

Ogni modifica all'app deve rispondere ad almeno una di queste domande:

1. **Posso volare?** → verdetto (SI VOLA / POSSIBILE CON CAUTELA / RESTA A TERRA)
2. **Quando decollo?** → finestra migliore + fase della brezza
3. **Quanto salgono le termiche?** → rateo atteso + orario del picco
4. **Qual è la base?** → quota base cumuli + soglia sopra il decollo + tetto d'inversione
5. **Posso fare cross?** → adattabilità al cross (rateo × base × vento in quota × atterraggi)
6. **C'è rischio temporale?** → OD, CAPE, segnali di peggioramento, fronti di raffiche
7. **Il vento è favorevole?** → relazione vento-esposizione, gradiente, Venturi, rotor

## Come è stata costruita

Sintesi critica (non copia) di: Meteorologia alpina (MeteoSvizzera, ARPA Piemonte),
manuale di volo libero (aerologia e dinamica), articoli tecnici di volo libero
(Flybubble, paragliding-lessons, forum di volo), materiale SIV, statistiche incidenti
DHV e studi clinici, reportistica temporali (casi documentati). Le fonti sono citate
nella sezione SOGLIE e nei CASI REALI con URL reale. Dove una soglia è prassi
operativa più che come legge fisica, è indicata come "prassi" con livello di confidenza.

## Stato di avanzamento

- [x] FASE 1 — Banca dati (questi file)
- [x] FASE 2 — Grafo di conoscenza
- [x] FASE 3 — Test di comprensione
- [x] FASE 4 — Progetto degli agenti (specifica; implementazione separata)
- [x] FASE 5 — Progetto del Decision Engine (specifica; implementazione separata)
- [ ] FASE 6 — Implementazione nel codice (prossima: seguire FASE4/FASE5 spec)
