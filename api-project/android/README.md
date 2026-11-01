# 🤖 Android - Meteo dei Conigli

## Configurazione Zero Permessi

L'app è configurata per installarsi **senza richiedere permessi**.

### AndroidManifest.xml

```xml
<!-- SOLO permessi invisibili -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- RIMOSSI: -->
<!-- <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /> -->
<!-- <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" /> -->
<!-- <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" /> -->
```

---

## Icona Personalizzata

L'icona del coniglio è già in:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`
- `android/app/src/main/res/mipmap-*/ic_launcher_round.png`

**Dimensioni:**
| Densità | Pixel |
|---------|-------|
| mdpi | 48×48 |
| hdpi | 72×72 |
| xhdpi | 96×96 |
| xxhdpi | 144×144 |
| xxxhdpi | 192×192 |

---

## File Configurazione

| File | Descrizione |
|------|-------------|
| `AndroidManifest.xml` | Permessi e configurazione app |
| `build.gradle` | Build configuration |
| `strings.xml` | Nome app "Meteo dei Conigli" |

---

## Build APK

```bash
npm run generate-icons
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Distribuzione

1. Copia APK sul telefono
2. Apri il file APK
3. L'app si installa **automaticamente senza richiedere permessi**
4. Apri l'app e seleziona il sito di decollo manualmente
