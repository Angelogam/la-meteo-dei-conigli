# La Meteo dei Conigli

Dashboard meteo per il volo libero, con dati previsionali, analisi dei profili e strumenti di lettura dell'evoluzione giornaliera.

## API

La API usa JSON e include una specifica OpenAPI 3.1.

| Endpoint | Scopo |
| --- | --- |
| `GET /api` | Indice e discovery degli endpoint |
| `GET /api/health` | Stato dell'API (non verifica in tempo reale i provider esterni) |
| `GET /api/openapi` | Documento OpenAPI 3.1 |
| `GET /api/open-meteo?latitude=44.76&longitude=7.25&hourly=temperature_2m,wind_speed_10m` | Proxy Open-Meteo con allow-list, coordinate validate, timeout, cache breve e risposta upstream controllata |
| `GET /api/volabilita?latitude=44.76&longitude=7.25&altitude=1300&exposure=S` | Indice di volabilità 1-10: vento, raffiche, esposizione, base nubi, instabilità |
| `GET /api/termiche?latitude=44.76&longitude=7.25&altitude=1300` | Termiche orarie stimate (rateo m/s, base LCL, top) con finestra migliore |
| `GET /api/venti-decollo?latitude=44.76&longitude=7.25&exposure=SO` | Validazione vento in decollo: relazione con l'esposizione e consiglio |
| `GET /api/windy-soundings?action=sites` | Siti sounding disponibili |
| `GET /api/windy-soundings?site=montoso-decollo-basso` | Configurazione sounding del sito |
| `GET /api/people?limit=25&offset=0` | Archivio dimostrativo con paginazione |
| `POST /api/people` | Crea un record dimostrativo |

### Esempi

```bash
curl http://localhost:8080/api
curl http://localhost:8080/api/health
curl http://localhost:8080/api/openapi
curl "http://localhost:8080/api/open-meteo?latitude=44.76&longitude=7.25&hourly=temperature_2m,wind_speed_10m&timezone=Europe%2FRome"
curl "http://localhost:8080/api/volabilita?latitude=44.76&longitude=7.25&altitude=1300&exposure=S"
curl "http://localhost:8080/api/termiche?latitude=44.76&longitude=7.25&altitude=1300&days=1"
curl "http://localhost:8080/api/venti-decollo?latitude=44.76&longitude=7.25&exposure=SO"
```

### Endpoint aerologici (v1.2.0)

Gli endpoint `/api/volabilita`, `/api/termiche` e `/api/venti-decollo` replicano lato server le stesse formule usate dall'app (`src/utils/indiceVolabilita.ts`, `src/utils/termiche.ts`): indice 1-10 con motivazioni, serie oraria di termiche con rateo/base/top stimati, e classificazione del vento rispetto all'esposizione del decollo (frontale, diagonale, laterale, di coda). Accettano `altitude` (quota decollo in metri slm), `exposure` (orientamento, con alias italiani SO/NO/O) e `timezone`; i parametri non documentati o ripetuti sono rifiutati con `400`. Gli errori upstream seguono la stessa convenzione del proxy (`429`, `502`, `504`). La cache in memoria è breve (5 minuti) e per-istanza.

La risposta del proxy meteo mantiene il formato del provider Open-Meteo. Sono rifiutati i parametri non documentati e quelli ripetuti, così come le date non ISO, gli intervalli invertiti e le unità non supportate. Il proxy accetta soltanto risposte upstream JSON strutturate come oggetto. Gli errori usano status HTTP distinti: `400` per input non valido, `429` per limiti del provider, `502` per errori upstream o risposte non valide e `504` per timeout. L'endpoint Windy applica analoghi controlli ai parametri `action` e `site`, rifiutando azioni sconosciute e combinazioni ambigue.

**Nota di produzione:** l'endpoint `/api/people` è un esempio dimostrativo basato su file JSON locale. Non usarlo per dati personali reali o su un deployment serverless senza sostituire il repository con un database persistente e aggiungere autenticazione/autorizzazione. Il file system di un deployment serverless non è un database durevole.

Le previsioni sono dati modellistici e non certificano la sicurezza o l'idoneità al volo.

## Test e qualità

```bash
npm ci
npm run lint
npm run build
npx playwright test --config=playwright.api.config.ts
```

La pipeline GitHub Actions esegue lint, build di produzione e test API ad ogni pull request.
