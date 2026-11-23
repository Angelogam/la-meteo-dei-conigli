# Audit performance — La Meteo dei Conigli

Data: 23/11/2026 · Misurazioni reali su **build di produzione** (Nitro, `node .output/server/index.mjs`) con Performance API in Chrome headless. Niente supposizioni: ogni numero è una misurazione.

## 1 · Il problema trovato (evidence)

Il lazy loading della revisione precedente era lazy **al mount**: tutte le sezioni venivano montate all'avvio, quindi i loro chunk partivano comunque subito.

| Metrica (primo caricamento, prod) | Prima del rework | Dopo il rework |
|---|---|---|
| Chunk JS al primo caricamento | 31 | **12** |
| JavaScript trasferito in avvio | 6.333 KB | **420 KB** (−93%) |
| Richieste totali in avvio | 163 | 121 |
| First Contentful Paint | 844 ms | **684 ms** |
| DOMContentLoaded | 206 ms | 214 ms |

## 2 · Rendering on demand verificato

Scroll al 55% della pagina → caricano SOLO i chunk delle sezioni raggiunte (nomi reali dalla Performance API):

```
CartinaMeteo-Bqt_rL8K.js  leaflet-D9Mym5zS.js  WebcamNearby-B7OK1M1L.js
ServiziDecollo-Bb799I2o.js  windAtAltitude-BdeRPGvG.js  …icone lucide
```

A fondo pagina: 31 chunk / 5.452 KB **cumulativi** — il resto delle sezioni resta scaricato solo se l'utente lo apre (le schede Report/Termiche/Analisi caricano al click: +1 chunk da 10 KB per «Termiche»).

Meccanica: `React.lazy` + `Suspense` + montaggio via `IntersectionObserver` (rootMargin 600 px) dentro `Index.tsx` — le sezioni pesanti (Cartina3D/Cesium, CartinaMeteo/Leaflet, windgram, webcam, servizi) si montano solo quando l'utente si avvicina.

## 3 · Analisi bundle (top chunk, build di produzione)

| Chunk | kB |
|---|---|
| `decolli` (catalogo 520 decolli, dato statico) | 736 |
| `index` (entry + dashboard) | 350 |
| `leaflet` (in chunk CartinaMeteo, on-demand) | 149 |
| `Cartina3D` (on-demand, Cesium ulteriore e dinamico) | 101 |
| `ReportAICard` (scheda Analisi, on-demand al click) | 75 |
| `zip-reader` | 64 |
| `CartinaMeteo` (on-demand) | 59 |
| `ReportVolo` (scheda Report, on-demand) | 54 |
| `ProfessionalWindgram` (on-demand) | 39 |

**Nota per la prossima iterazione**: `decolli.js` (736 kB) è dato statico importato nell'entry — candidato a fetch JSON differito (−~60% dell'JS di avvio attuale).

## 4 · Comportamento in degradazione (verificato dal vivo)

- Radar pioggia: con il feed RainViewer non raggiungibile la card **non viene renderizzata affatto** (`radarNelDom: false` nel DOM reale) — regola del proprietario `if (radarBroken) hideRadarCard()`.
- Con la quota giornaliera Open-Meteo del sandbox esaurita (HTTP 429) la UI degrada in modo onesto: ATTESA «dati in arrivo», nessun numero inventato.
