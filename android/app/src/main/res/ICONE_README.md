# 🐰 Icona "Meteo dei Conigli"

## Design

L'icona raffigura un **coniglio stilizzato bianco** con:
- Orecchie lunghe con interno rosa
- Occhi neri con riflessi
- Naso rosa e baffi
- Guance rosa (blush)
- Coda soffice
- Sfondo blu gradiente (cielo)
- Nuvole decorative
- Testo "Meteo dei Conigli" in basso

## Specifiche Android

| Densità | Dimensione | File |
|---------|------------|------|
| mdpi | 48x48 | `mipmap-mdpi/ic_launcher.png` |
| hdpi | 72x72 | `mipmap-hdpi/ic_launcher.png` |
| xhdpi | 96x96 | `mipmap-xhdpi/ic_launcher.png` |
| xxhdpi | 144x144 | `mipmap-xxhdpi/ic_launcher.png` |
| xxxhdpi | 192x192 | `mipmap-xxxhdpi/ic_launcher.png` |

## Adaptive Icon (Android 8.0+)

| File | Descrizione |
|------|-------------|
| `drawable/ic_launcher_foreground.svg` | Coniglio vettoriale |
| `drawable/ic_launcher_background.xml` | Sfondo gradiente blu |
| `mipmap-anydpi-v26/ic_launcher.xml` | Icona adattiva |
| `mipmap-anydpi-v26/ic_launcher_round.xml` | Icona rotonda |

## Colori

- **Sfondo**: `#0EA5E9` → `#0284C7` (gradient blu cielo)
- **Coniglio**: `#FFFFFF` → `#F1F5F9` (bianco)
- **Interno orecchie**: `#FCA5A5` (rosa chiaro)
- **Naso**: `#F472B6` (rosa)
- **Guance**: `#FCA5A5` 60% opacity
- **Occhi**: `#0F172A` (quasi nero)
- **Testo**: Bianco su sfondo scuro

## Build

L'icona viene compilata automaticamente durante `npx cap sync android`.
Per buildare l'APK:

```bash
npx cap sync android
cd android
./gradlew assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`
