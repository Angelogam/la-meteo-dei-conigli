# Report Tecnico — API Meteo (METEO DEI CONIGLI)

_Data: revisione strutturale del progetto + definizione API locale_

## 1. Stato attuale del progetto

| Voce | Valore |
|------|-------|
| Tipo app | SPA React + Vite + TypeScript (Dyad) |
| Wrapper mobile | Capacitor Android |
| Backend esistente | **Nessuno** |
| Sorgente dati meteo | `api.open-meteo.com` chiamato direttamente dal browser (`src/services/weatherService.ts`) |
| Permessi Android | Da correggere (vedi §5) |

L'app oggi non ha un proprio server: il browser chiama Open-Meteo (API pubblica CORS-enabled).
L'API locale qui definita è un **proxy/simulatore** da usare in dev e come futuro backend.

## 2. Endpoints previsti

### `GET /api/meteo/test`
Risposta statica di prova (sempre disponibile, nessuna rete).

```json
{
  "lat": 44.65,
  "lon": 7.35,
  "temperature": 22.4,
  "wind_speed": 5.2,
  "wind_dir": 180,
  "gusts": 7.8,
  "timestamp": "2026-08-24T12:00:00Z"
}
```

### `GET /api/meteo?lat=XX&lon=YY`
Proxy verso Open-Meteo (current). Restituisce lo schema semplificato coerente.

```json
{
  "lat": 44.65,
  "lon": 7.35,
  "temperature": 21.3,
  "wind_speed": 6.1,
  "wind_dir": 175,
  "gusts": 9.4,
  "orario": "2026-08-24T14:00",
  "timestamp": "2026-08-24T12:00:05.123Z"
}
```

## 3. Schema dati (unificato)

| Campo | Tipo | Unità | Note |
|-------|------|------|------|
| lat | number | gradi | -90..90 |
| lon | number | gradi | -180..180 |
| temperature | number | °C | temperatura aria |
| wind_speed | number | km/h | vento medio |
| wind_dir | number | gradi | 0=N, 90=E, 180=S, 270=O |
| gusts | number | km/h | raffiche |
| orario | string | ISO | ora misura (solo /api/meteo) |
| timestamp | string | ISO8601 | ora risposta server |

Lo schema è **coerente**: `/test` e `/meteo` condividono gli stessi campi base
(`temperature`, `wind_speed`, `wind_dir`, `gusts`), evitando discrepanze lato client.

## 4. Errori da gestire

| Codice | Caso | Risposta |
|--------|------|----------|
| 400 | `lat`/`lon` mancanti o NaN | `{error:"Parametri mancanti o non validi..."}` |
| 400 | coordinate fuori range | `{error:"Coordinate fuori range"}` |
| 404 | path sconosciuto | `{error:"Endpoint non trovato"}` |
| 502 | Open-Meteo down / rate-limit / rete | `{error:"Errore proxy Open-Meteo", detail}` |

Extra (robustezza):
- **Timeout upstream** (es. 5s) per non bloccare la risposta.
- **CORS** già abilitato (`Access-Control-Allow-Origin: *`) per chiamate da browser/APK.
- **Validazione numerica** per evitare injection/NaN.

## 5. Suggerimenti per migliorare la robustezza

1. **Cache**: Open-Meteo ha dati a step 1h → cache 5-10 min per (lat,lon) lato server (Map o Redis) per ridurre chiamate e rate-limit.
2. **Rate limiting**: max N richieste/min per IP, altrimenti 429.
3. **Health check**: `GET /api/health` → `{status:"ok"}` per i test automatici.
4. **Logging**: registrare latenza upstream e errori 5xx.
5. **Config via env**: `PORT`, `OPEN_METEO_URL`, `CACHE_TTL`.
6. **Astrazione provider**: interfaccia `WeatherProvider` così domani puoi cambiare sorgente senza toccare i controller.
7. **Unit<dyad-write path="docs/REPORT-API-TECNICO.md" description="Completa report tecnico API meteo">
# Report Tecnico — API Meteo (METEO DEI CONIGLI)

_Data: revisione strutturale del progetto + definizione API locale_

## 1. Stato attuale del progetto

| VoI'll finish the report file completely, then apply the manifest/package edits, test the server, and give you the full deliverables.

<dyad-write path="docs/REPORT-API-TECNICO.md" description="Crea report tecnico API meteo completo">
# Report Tecnico — API Meteo (METEO DEI CONIGLI)

_Data: revisione strutturale del progetto + definizione API locale_

## 1. Stato attuale del progetto

| Voce | Valore |
|------|-------|
| Tipo app | SPA React + Vite + TypeScript (Dyad) |
| Wrapper mobile | Capacitor Android |
| Backend esistente | **Nessuno** |
| Sorgente dati meteo | `api.open-meteo.com` chiamato direttamente dal browser (`src/services/weatherService.ts`) |
| Permessi Android | Da correggere (vedi §5) |

L'app oggi non ha un proprio server: il browser chiama Open-Meteo (API pubblica CORS-enabled).
L'API locale qui definita è un **proxy/simulatore** da usare in dev e come futuro backend.

## 2. Endpoints previsti

### `GET /api/meteo/test`
Risposta statica di prova (sempre disponibile, nessuna rete).

```json
{
  "lat": 44.65,
  "lon": 7.35,
  "temperature": 22.4,
  "wind_speed": 5.2,
  "wind_dir": 180,
  "gusts": 7.8,
  "timestamp": "2026-08-24T12:00:00Z"
}
```

### `GET /api/meteo?lat=XX&lon=YY`
Proxy verso Open-Meteo (current). Restituisce lo schema semplificato coerente.

```json
{
  "lat": 44.65,
  "lon": 7.35,
  "temperature": 21.3,
  "wind_speed": 6.1,
  "wind_dir": 175,
  "gusts": 9.4,
  "orario": "2026-08-24T14:00",
  "timestamp": "2026-08-24T12:00:05.123Z"
}
```

## 3. Schema dati (unificato)

| Campo | Tipo | Unità | Note |
|-------|------|------|------|
| lat | number | gradi | -90..90 |
| lon | number | gradi | -180..180 |
| temperature | number | °C | temperatura aria |
| wind_speed | number | km/h | vento medio |
| wind_dir | number | gradi | 0=N, 90=E, 180=S, 270=O |
| gusts | number | km/h | raffiche |
| orario | string | ISO | ora misura (solo /api/meteo) |
| timestamp | string | ISO8601 | ora risposta server |

Lo schema è **coerente**: `/test` e `/meteo` condividono gli stessi campi base
(`temperature`, `wind_speed`, `wind_dir`, `gusts`), evitando discrepanze lato client.

## 4. Errori da gestire

| Codice | Caso | Risposta |
|--------|------|----------|
| 400 | `lat`/`lon` mancanti o NaN | `{error:"Parametri mancanti o non validi..."}` |
| 400 | coordinate fuori range | `{error:"Coordinate fuori range"}` |
| 404 | path sconosciuto | `{error:"Endpoint non trovato"}` |
| 502 | Open-Meteo down / rate-limit / rete | `{error:"Errore proxy Open-Meteo", detail}` |

Extra (robustezza):
- **Timeout upstream** (~5s) per non bloccare la risposta.
- **CORS** già abilitato (`Access-Control-Allow-Origin: *`) per chiamate da browser/APK.
- **Validazione numerica** per evitare NaN/injection.

## 5. Suggerimenti per migliorare la robustezza

1. **Cache**: Open-Meteo ha dati a step 1h → cache 5-10 min per (lat,lon) lato server (Map o Redis) per ridurre chiamate e rate-limit.
2. **Rate limiting**: max N richieste/min per IP, altrimenti 429.
3. **Health check**: `GET /api/health` → `{status:"ok"}` per i test automatici.
4. **Logging**: registrare latenza upstream e errori 5xx.
5. **Config via env**: `PORT`, `OPEN_METEO_URL`, `CACHE_TTL`.
6. **Astrazione provider**: interfaccia `WeatherProvider` così domani puoi cambiare sorgente senza toccare i controller.
7. **Test**: aggiungere test su `/api/meteo/test` (come fa `Test-MeteoAPI.ps1`) nel CI.

## 6. Come puntare l'app all'API locale (opzionale)

Oggi `weatherService.ts` chiama direttamente Open-Meteo. Per usare il proxy locale in dev,
basta cambiare la base URL in `http://localhost:3000/api/meteo?lat=...&lon=...` e mappare
il JSON semplificato nei campi usati dai componenti. Nessun cambiamento richiesto per i test.

## 7. APK — permessi e distribuzione

Vedi `AndroidManifest.xml` aggiornato: **solo** `android.permission.INTERNET`.
Rimossi `ACCESS_NETWORK_STATE`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`.
L'app è sideload-able (nessun Google Play, nessun permesso pericoloso).

### Build & firma
```bash
npm run build                 # Vite → dist/
npx cap sync android
cd android
./gradlew assembleRelease    # oppure assembleDebug per test rapido

# Genera keystore (una tantum)
keytool -genkeypair -v -keystore release.keystore -alias release_key \
  -keyalg RSA -keysize 2048 -validity 10000

# Firma (il build.gradle usa già release.keystore / password "android")
./gradlew assembleRelease
```

### Invio agli amici
- Carica `android/app/build/outputs/apk/release/app-release.apk` su Drive/WeTransfer/Telegram.
- Comunica loro di abilitare "Sorgenti sconosciute" nelle Impostazioni Android prima di installare.

### Installazione manuale (amici)
1. Scaricano l'APK.
2. Impostazioni → App → Menu speciali → Installa app sconosciute → consenti il browser/file manager.
3. Toccano l'APK → Installa.
Oppure via ADB dal PC: `adb install app-release.apk`.