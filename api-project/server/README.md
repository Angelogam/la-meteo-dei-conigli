# Server API Meteo - "Meteo dei Conigli"

**Versione:** 2.0.0  
**Package Android:** `com.meteodeiconigli.app`

## Avvio

```bash
node server/api-server.mjs
```

Il server ascolta su `http://localhost:3000` (modificabile con `PORT` env).

## Endpoint

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/` o `/api` | Info API e lista endpoint |
| GET | `/api/health` | Health check (uptime, cache) |
| GET | `/api/version` | Versione API e metadata app |
| GET | `/api/sites` | Lista 24 siti di decollo |
| GET | `/api/sites/:id` | Singolo sito per ID |
| GET | `/api/meteo/test` | Test (dati hardcoded) |
| GET | `/api/meteo?lat=XX&lon=YY` | Meteo corrente da Open-Meteo |
| GET | `/api/hourly?lat=XX&lon=YY&hours=N` | Forecast orario (max 48h) |
| GET | `/api/forecast?lat=XX&lon=YY&days=N` | Forecast completo (current+hourly+daily) |

## Funzionalità

- ✅ **Zero dipendenze** (solo moduli built-in Node)
- ✅ **Cache integrata** (5 minuti TTL)
- ✅ **CORS abilitato** per app mobile
- ✅ **Logging request** con detect mobile
- ✅ **Validazione parametri** completa
- ✅ **24 siti di decollo** integrati
- ✅ **Open-Meteo proxy** con timeout
- ✅ **Health check** per monitoring

## File

| File | Descrizione |
|------|-------------|
| `api-server.mjs` | Server principale (produzione) |
| `api-server.backup.2025-01-19.mjs` | Backup datato |

## Build APK Android

Dopo aver avviato il server:

```bash
# Build web app
npm run build

# Sincronizza con Android
npx cap sync android

# Apri Android Studio
npx cap open android

# Build APK
cd android
./gradlew assembleDebug
```

L'APK sarà in: `android/app/build/outputs/apk/debug/app-debug.apk`

## Esempio chiamate

```bash
# Health check
curl http://localhost:3000/api/health

# Lista siti
curl http://localhost:3000/api/sites

# Meteo corrente
curl "http://localhost:3000/api/meteo?lat=44.65&lon=7.35"

# Forecast 7 giorni
curl "http://localhost:3000/api/forecast?lat=44.65&lon=7.35&days=7"
```
