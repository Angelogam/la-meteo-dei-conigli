# 📱 Build APK - Meteo dei Conigli

## 🚫 Installazione SILENZIOSA (nessun permesso richiesto)

Questa APK è configurata per installarsi **senza chiedere permessi** all'utente.

### Permessi rimossi:
- ❌ Localizzazione (ACCESS_FINE_LOCATION)
- ❌ Localizzazione approssimata (ACCESS_COARSE_LOCATION)
- ❌ Stato WiFi (ACCESS_WIFI_STATE)

### Permessi attivi (non visibili):
- ✅ INTERNET (implicito, non mostrato)
- ✅ ACCESS_NETWORK_STATE (permesso "normal", non mostrato)

---

## 📦 Build APK

### 1. Genera le icone (se non già fatto)

```bash
node generate-icons.cjs
```

### 2. Sincronizza con Android

```bash
npx cap sync android
```

### 3. Builda l'APK

```bash
cd android
./gradlew assembleDebug
```

### 4. Trova l'APK

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📋 Contenuto APK

| Caratteristica | Stato |
|---------------|-------|
| Icona coniglio personalizzata | ✅ |
| Nome: "Meteo dei Conigli" | ✅ |
| Permessi installazione | 🚫 Nessuno |
| Server API locale (opzionale) | ✅ |

---

## 📲 Distribuzione diretta

Per distribuire l'APK manualmente:

1. Copia `app-debug.apk` sul telefono
2. Apri il file APK
3. Se richiesto, abilita "Installa da origini sconosciute"
4. L'app si installa **senza permessi richiesti**

---

## 🔧 Build Release (per distribuzione finale)

```bash
cd android
./gradlew assembleRelease
```

L'APK release sarà in:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 📍 Uso dell'app

1. Apri l'app
2. Seleziona manualmente il **SITO DI DECOLLO** dall'elenco
3. L'app mostrerà le previsioni meteo per quel sito

> ⚠️ **Nota**: La geolocalizzazione automatica è stata rimossa. L'utente seleziona il sito manualmente per evitare richieste di permesso durante l'installazione.
