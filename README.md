# La Meteo dei Conigli

Dashboard meteo per il volo libero, con dati previsionali, analisi dei profili e strumenti di lettura dell'evoluzione giornaliera.

## API

La API usa JSON e include una specifica OpenAPI 3.1.

| Endpoint | Scopo |
| --- | --- |
| `GET /api` | Indice e discovery degli endpoint |
| `GET /api/health` | Stato dell'API (non verifica in tempo reale i provider esterni) |
| `GET /api/openapi` | Documento OpenAPI 3.1 |
| `GET /api/open-meteo?latitude=44.76&longitude=7.25&hourly=temperature_2m,wind_speed_10m` | Proxy Open-Meteo con allow-list, coordinate validate, timeout e cache breve |
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
```

La risposta del proxy meteo mantiene il formato del provider Open-Meteo. Gli errori usano status HTTP distinti: `400` per input non valido, `429` per limiti del provider, `502` per errori upstream e `504` per timeout.

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
