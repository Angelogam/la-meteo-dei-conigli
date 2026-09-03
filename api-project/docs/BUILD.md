# 🔨 Build APK - Guida Completa

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

Questo creerà le icone PNG in tutte le risoluzioni Android.

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

## Passaggio 5: Build APK Release (opzionale)

```bash
cd android
./gradlew assembleRelease
```

L'APK release sarà in:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📋 Comandi Completi

```bash
# Build completo
npm run generate-icons && npm run build && npx cap sync android && cd android && ./gradlew assembleDebug

# Build release
cd android && ./gradlew assembleRelease
```

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
