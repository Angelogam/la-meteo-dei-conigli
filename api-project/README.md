# 📱 Meteo dei Conigli - Progetto Mobile API

**Versione API:** 2.0.0  
**Package Android:** `com.meteodeiconigli.app`  
**Icona:** 🐰 Personalizzata con coniglio  
**Distribuzione:** Direct (fuori Google Play)

---

## 📁 Struttura Progetto

```
api-project/
├── README.md                    # Questo file
├── server/
│   ├── api-server.mjs           # Server Node.js (v2.0.0)
│   ├── api-server.backup.2025-01-19.mjs
│   └── README.md                # Documentazione server
├── config/
│   ├── api.config.json         # Configurazione API completa
│   └── sites.config.json        # 24 siti di decollo
├── mobile/
│   ├── mobile.config.json       # Configurazione mobile
│   ├── android.config.json      # Android (zero permessi)
│   └── ios.config.json          # iOS
└── docs/
    ├── api-endpoints.md         # Documentazione endpoint
    └── BUILD.md                 # Istruzioni build APK
```

---

## 🚀 Quick Start

### 1. Avvia Server API

```bash
cd api-project/server
node api-server.mjs
```

Server in ascolto su: `http://localhost:3000`

### 2. Test API

```bash
# Health check
curl http://localhost:3000/api/health

# Lista siti
curl http://localhost:3000/api/sites

# Meteo corrente
curl "http://localhost:3000/api/meteo?lat=44.65&lon=7.35"

# Forecast completo
curl "http://localhost:3000/api/forecast?lat=44.65&lon=7.35&days=7"
```

### 3. Build App Mobile

```bash
# Genera icone (solo la prima volta)
npm run generate-icons

# Build web app
npm run build

# Sincronizza con Android
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug
```

---

## 🐰 Icona App

L'icona del coniglio è stata personalizzata con:
- **Coniglio stilizzato** con orecchie lunghe
- **Sfondo gradiente blu** cielo
- **Testo "Meteo dei Conigli"**

L'icona PNG è in:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- `android/app/src/main/res/mipmap-*/ic_launcher_round.png`

---

## 🚫 Permessi Installazione

**L'APK è configurata per installarsi SENZA chiedere permessi.**

| Permesso | Stato |
|----------|-------|
| `ACCESS_FINE_LOCATION` | ❌ Rimosso |
| `ACCESS_COARSE_LOCATION` | ❌ Rimosso |
| `ACCESS_WIFI_STATE` | ❌ Rimosso |
| `INTERNET` | ✅ Implicito (non richiesto) |
| `ACCESS_NETWORK_STATE` | ✅ Normal (non richiesto) |

L'utente seleziona manualmente il sito di decollo dall'elenco dei 24 siti disponibili.

---

## 📡 Endpoint API

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/version` | Versione API |
| GET | `/api/sites` | Lista 24 siti |
| GET | `/api/sites/:id` | Singolo sito |
| GET | `/api/meteo/test` | Test (hardcoded) |
| GET | `/api/meteo?lat=XX&lon=YY` | Meteo corrente |
| GET | `/api/hourly?lat=XX&lon=YY&hours=N` | Forecast orario |
| GET | `/api/forecast?lat=XX&lon=YY&days=N` | Forecast completo |

---

## 📦 Output Build

| Tipo | Percorso |
|------|----------|
| APK Debug | `android/app/build/outputs/apk/debug/app-debug.apk` |
| APK Release | `android/app/build/outputs/apk/release/app-release.apk` |

---

## 📱 Piattaforme Supportate

- ✅ **Android** (minSdk: 22, targetSdk: 34)
- ✅ **iOS** (deployment target: iOS 13.0)

---

## 🔧 Dipendenze

- Node.js (built-in modules only per server)
- Capacitor 6.x
- Sharp (per generazione icone)

---

## 📋 Checklist Distribuzione

- [x] API Server v2.0.0
- [x] Icona coniglio personalizzata
- [x] Zero permessi installazione
- [x] Configurazione Android
- [x] Configurazione iOS
- [x] Documentazione completa
- [ ] Build APK
- [ ] Test su dispositivo
- [ ] Distribuzione diretta

---

## 📞 Contatti

- **App:** Meteo dei Conigli
- **ID Android:** `com.meteodeiconigli.app`
- **Framework:** Capacitor 6.x
- **Distribuzione:** Manuale (fuori Google Play)
