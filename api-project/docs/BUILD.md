# 🔨 Build APK - Guida Completa

## ✅ Stato attuale

Tutti i grafici sono **presenti e funzionanti**:
- ✅ `Windgram` (matrice vento)
- ✅ `SkewTDiagram` (diagramma termodinamico)
- ✅ `WeatherDashboard` (dashboard)
- ✅ `ThermalChart` (grafico termiche)
- ✅ `HourlyTable` (tabella oraria)
- ✅ `PrevisioniGiornaliere` (previsioni 7 giorni)
- ✅ `RasoftWindgram` (Montoso Alto)

---

## Prerequisites

Assicurati di avere:
- Node.js 18+ installato
- Java JDK 17+ installato
- Android SDK installato (o Android Studio)

---

## Passaggio 1: Genera le Icone

```bash
npm run generate-icons
```

Questo crea le icone PNG in tutte le risoluzioni Android.

---

## Passaggio 2: Build Web App

```bash
npm run build
```

Output in `dist/`

---

## Passaggio 3: Sincronizza con Capacitor

```bash
npx cap sync android
```

Copia le risorse web e le icone nel progetto Android.

---

## Passaggio 4: Build APK Debug

```bash
cd android
./gradlew assembleDebug
```

L'APK sarà in:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📋 Comandi Rapidi (tutto in uno)

```bash
npm run generate-icons && \
npm run build && \
npx cap sync android && \
cd android && \
./gradlew assembleDebug
```

---

## 🔍 Cosa è stato corretto

1. **capacitor.config.ts** → Corretta sezione `ios` (era rotta)
2. **Index.tsx** → Aggiunto `isOfflineMode` state per fallback
3. **Grafici** → Tutti i componenti grafici sono verificati e funzionanti

---

## 🔍 Verifica Installazione

Dopo aver copiato l'APK sul telefono:

1. Apri il file APK
2. Se richiesto, abilita "Installa da origini sconosciute"
3. L'app si installa **senza richiedere permessi**

---

## ❓ Troubleshooting

### Errore: `./gradlew: Permission denied`

```bash
chmod +x android/gradlew
```

### Errore: SDK Android non trovato

Imposta la variabile `ANDROID_HOME`:
```bash
export ANDROID_HOME=/path/to/android/sdk
```

### APK non installa

- Verifica che il telefono允许 "Origini sconosciute"
- Verifica che la versione Android sia >= 22 (Android 5.1)
