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

La risposta del proxy meteo mantiene il formato del provider Open-Meteo. Sono rifiutati i parametri non documentati e quelli ripetuti, così come le date non ISO, gli intervalli invertiti e le unità non supportate. Il proxy accetta soltanto risposte upstream JSON strutturate come oggetto. Gli errori usano status HTTP distinti: `400` per input non valido, `429` per limiti del provider, `502` per errori upstream o risposte non valide e `504` per timeout. L'endpoint Windy applica analoghi controlli ai parametri `action` e `site`, rifiutando azioni sconosciute e combinazioni ambigue.

**Nota di produzione:** l'endpoint `/api/people` è un esempio dimostrativo basato su file JSON locale. Non usarlo per dati personali reali o su un deployment serverless senza sostituire il repository con un database persistente e aggiungere autenticazione/autorizzazione. Il file system di un deployment serverless non è un database durevole.

Le previsioni sono dati modellistici e non certificano la sicurezza o l'idoneità al volo.

## Assistente meteo con LLM gratuito

La scheda **Analisi** include il componente `AiMeteoBriefing`, che invia al backend soltanto i dati orari meteo necessari per richiedere una sintesi in italiano tramite OpenRouter e il router `openrouter/free`.

L'assistente è opzionale e genera il testo solo quando l'utente preme il pulsante. La chiave API resta sul server e non viene mai inserita nel bundle del browser.

### Configurazione

1. Crea una chiave API su [OpenRouter](https://openrouter.ai/keys).
2. In Vercel, apri il progetto usato per la preview e vai in **Settings → Environment Variables**.
3. Aggiungi `OPENROUTER_API_KEY` con la chiave come valore; seleziona Preview e/o Production secondo l'ambiente da testare.
4. Salva e fai redeploy della preview dopo aver aggiunto la variabile.

Per lo sviluppo locale, copia `.env.example` in `.env` e inserisci la chiave solo nel file locale (mai nel repository). Senza questa variabile, l'endpoint risponde con un errore esplicito di configurazione e la UI lo mostra all'utente.

L'uso gratuito dipende dalla disponibilità e dai limiti dei modelli gratuiti offerti da OpenRouter; non è garantito un servizio senza interruzioni. Il briefing riassume previsioni modellistiche: non dichiara il volo sicuro e non sostituisce le osservazioni sul posto o i bollettini ufficiali. I campi assenti restano assenti, non vengono convertiti in zero.

## Test e qualità

```bash
npm ci
npm run lint
npm run build
npx playwright test --config=playwright.api.config.ts
```

La pipeline GitHub Actions esegue lint, build di produzione e test API ad ogni pull request.
