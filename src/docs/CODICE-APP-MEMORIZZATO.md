# 🪂 CODICE APP METEO PARAPENDIO — MEMORIZZATO

**Data:** 2026-09-29  
**Stack:** React + TypeScript + Vite + Tailwind CSS + Recharts + Leaflet + Open-Meteo API

---

## 📁 STRUTTURA FILE

```
src/
├── types/
│   └── weather.ts          # WeatherPoint, Site, SoaringIndex, ForecastData, Alert
├── lib/
│   ├── weather-utils.ts    # Calcoli meteorologici (CAPE, shear, stabilità)
│   └── api.ts             # Fetch da Open-Meteo
├── components/
│   ├── SoaringIndexCard.tsx     # Semaforo volabilità 0-100
│   ├── CurrentConditions.tsx    # Card condizioni attuali (6 stats)
│   ├── Windgram.tsx            # Grafico orario + profilo verticale
│   ├── SiteMap.tsx             # Mappa Leaflet siti volo
│   ├── AlertBanner.tsx         # Banner alert pericoli
│   └── PilotGuide.tsx          # Guida interattiva per pilota
└── App.tsx                   # Main app con layout
```

---

## 🔑 FUNZIONALITÀ PRINCIPALI

### 1. Semaforo di Volabilità (SoaringIndexCard)
- Score 0-100 con penalità: vento >25km/h (-40), raffiche >15km/h (-30), shear >20km/h (-25), pioggia >0.5mm (-50), CAPE >1500 (-20)
- Colori: verde (≥70), giallo (≥40), rosso (<40)
- Mostra fattore limitante e dettagli vento/termiche/shear

### 2. Condizioni Attuali (CurrentConditions)
- 6 card: Vento, Raffiche, Termiche, Base nuvole, Shear, Punto rugiada
- Ogni card ha interpretazione in linguaggio pilota
- Calcolo base nuvole: `(temp - dewPoint) * 125`

### 3. Windgram (Windgram)
- Grafico orario 24h: vento, raffiche, termiche
- Profilo verticale: temperatura, punto rugiada, vento (0-3000m)
- Zone colorate per intensità termica
- Spiegazioni per il pilota integrate

### 4. Mappa Siti (SiteMap)
- Marker per ogni sito
- Selezione sito clicca
- Raggio 5km intorno al sito selezionato

### 5. Alert (AlertBanner)
- Raffiche forti (>15 km/h sopra media)
- Vento forte (>25 km/h)
- Precipitazioni (>0.5 mm/h)
- Instabilità (CAPE >1500)
- Shear verticale (>20 km/h)

### 6. Guida Pilota (PilotGuide)
- Accordion con 4 sezioni: Vento, Termiche, Nuvole, Pericoli
- Spiegazioni in linguaggio non tecnico
- Soglie critiche evidenziate

---

## 🧮 LOGICA METEOROLOGICA (weather-utils.ts)

```typescript
// Quota condensazione
calculateCondensationLevel(temp, dewPoint) → (temp - dewPoint) * 125

// Stabilità
calculateStability(tempSurface, tempAt1000m) → 
  gradient < 0.6 → stable
  0.6-1.0 → neutral
  > 1.0 → unstable

// Velocità termica da CAPE
estimateThermalVelocity(cape, blHeight) → min(sqrt(2*CAPE), 8)

// Shear verticale
calculateShear(windSurface, windAloft) → |wind1000 - windSurface|

// Scarto raffiche
getGustSpread(windSpeed, windGust) → gust - wind
```

---

## 🎯 INTERPRETAZIONI PER IL PILOTA

| Parametro | Valore | Interpretazione |
|-----------|--------|-----------------|
| Vento | <5 km/h | "Calmo — perfetto per principianti" |
| Vento | 5-15 km/h | "Leggero — ideale per tutti" |
| Vento | 15-25 km/h | "Moderato — solo esperti" |
| Vento | >25 km/h | "Forte — NON decollare" |
| Termiche | <1 m/s | "Termiche deboli — volo di planata" |
| Termiche | 1-2 m/s | "Termiche moderate — buone per iniziare" |
| Termiche | 2-4 m/s | "Termiche forti — attenzione turbolenza" |
| Termiche | >4 m/s | "Molto forti — RISCHIO COLLASSO" |
| Shear | <10 km/h | "Shear debole — volo tranquillo" |
| Shear | 10-20 km/h | "Shear moderato — attenzione" |
| Shear | >20 km/h | "Shear forte — RISCHIO COLLASSO ASIMMETRICO" |

---

## 🚫 REGOLE DI SICUREZZA (mai violare)

1. **Mai verde** se vento > 25 km/h
2. **Mai verde** se gust spread > 15 km/h
3. **Mai verde** se precipitazioni > 0.5 mm/h
4. **Disclaimar obbligatorio** in fondo pagina

---

## 🔮 ESTENSIONI FUTURE

Per usare windgram professionale e dati WRF reali:
```bash
npm install @azohra/windgram
```
```typescript
import { buildScene } from 'windgram/scene';
import { renderSvg } from 'windgram/svg';
import { loadProfile } from 'windgram/transport';

const loaded = await loadProfile({ fetch, baseUrl, modelSlug, siteSlug });
const svg = renderSvg(buildScene(loaded.profile, { timeZone: 'Europe/Rome' }));
```

---

**CODICE MEMORIZZATO — ATTESA ISTRUZIONI PER MODIFICHE GRADUALI**