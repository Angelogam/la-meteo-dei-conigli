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


{
  "name": "read_currently_open_file",
  "arguments": {}
}

