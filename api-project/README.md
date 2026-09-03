# 📱 API Meteo dei Conigli - Progetto Mobile

## Panoramica

Questo progetto contiene l'API backend per l'app **Meteo dei Conigli** 
( Capacitor appId: `com.meteodeiconigli.app`)

## Struttura Cartelle

```
api-project/
├── README.md              # Questo file
├── server/
│   ├── api-server.mjs     # Server Node.js (produzione)
│   └── api-server.backup.2025-01-19.mjs
├── config/
│   ├── api.config.json    # Configurazione endpoint
│   └── sites.config.json  # Siti di decollo
├── mobile/
│   ├── android.config.json
│   └── ios.config.json
└── docs/
    └── api-endpoints.md
```

## Quick Start

### Avvio Server API

```bash
cd api-project/server
node api-server.mjs
```

### Build App Mobile

```bash
# iOS
npx cap sync ios
npx cap open ios

# Android
npx cap sync android
npx cap open android
```

## Endpoint API

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/meteo/test` | Test provisionionale |
| GET | `/api/meteo?lat=XX&lon=YY` | Dati meteo reali |

## Contatti

- App: Meteo dei Conigli
- Piattaforme: iOS, Android
- Framework: Capacitor 6.x
