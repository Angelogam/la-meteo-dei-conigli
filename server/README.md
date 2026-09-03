# Server API Meteo

## File

| File | Descrizione |
|------|-------------|
| `api-server.mjs` | File principale (versione attiva) |
| `api-server.backup.2025-01-19.mjs` | Backup datato |

## Avvio

```bash
node server/api-server.mjs
```

## Endpoint

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/meteo/test` | Test provisionionale (dati hardcoded) |
| GET | `/api/meteo?lat=XX&lon=YY` | Proxy Open-Meteo con dati reali |

## Backup

I backup seguono il pattern: `api-server.backup.YYYY-MM-DD.mjs`

Per ripristinare un backup:
```bash
cp server/api-server.backup.2025-01-19.mjs server/api-server.mjs
```

## Note

- Server: solo moduli built-in Node (zero dipendenze)
- Porta: 3000 (modificabile con `PORT` env)
- CORS: abilitato per tutti gli origins
