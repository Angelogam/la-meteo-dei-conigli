# 📡 API Endpoints - Meteo dei Conigli

## Base URL

```
http://localhost:3000
```

---

## 1. Health Check

```
GET /api/health
```

**Risposta:**
```json
{
  "status": "ok",
  "version": "2.0.0",
  "timestamp": "2025-01-19T12:00:00.000Z",
  "uptime": 3600.5,
  "cache_size": 5
}
```

---

## 2. Versione

```
GET /api/version
```

**Risposta:**
```json
{
  "api": "2.0.0",
  "app": "Meteo dei Conigli API",
  "package": "com.meteodeiconigli.app",
  "build_date": "2025-01-19"
}
```

---

## 3. Lista Siti

```
GET /api/sites
```

**Risposta:**
```json
{
  "count": 24,
  "sites": [
    {
      "id": "malanotte",
      "name": "Malanotte",
      "valley": "Valle Ellero",
      "exposure": "S/SE",
      "elevation": 1740,
      "lat": 44.25874571728482,
      "lon": 7.794304664370852,
      "difficulty": 2
    },
    ...
  ]
}
```

---

## 4. Singolo Sito

```
GET /api/sites/:id
```

**Esempio:** `GET /api/sites/malanotte`

**Risposta:**
```json
{
  "id": "malanotte",
  "name": "Malanotte",
  "valley": "Valle Ellero",
  "exposure": "S/SE",
  "elevation": 1740,
  "lat": 44.25874571728482,
  "lon": 7.794304664370852,
  "difficulty": 2
}
```

---

## 5. Test (Hardcoded)

```
GET /api/meteo/test
```

**Risposta:**
```json
{
  "lat": 44.65,
  "lon": 7.35,
  "temperature": 22.4,
  "wind_speed": 5.2,
  "wind_dir": 180,
  "gusts": 7.8,
  "timestamp": "2025-01-19T12:00:00.000Z"
}
```

---

## 6. Meteo Corrente

```
GET /api/meteo?lat=XX&lon=YY
```

**Parametri:**

| Nome | Tipo | Obbligatorio | Range | Descrizione |
|------|------|--------------|-------|-------------|
| `lat` | number | Sì | -90 to 90 | Latitudine |
| `lon` | number | Sì | -180 to 180 | Longitudine |

**Risposta:**
```json
{
  "lat": 44.65,
  "lon": 7.35,
  "temperature": 22.4,
  "feels_like": 21.8,
  "humidity": 65,
  "dew_point": 15.2,
  "precipitation": 0,
  "weather_code": 0,
  "cloud_cover": 10,
  "wind_speed": 5.2,
  "wind_dir": 180,
  "gusts": 7.8,
  "cape": 0,
  "uv_index": 5,
  "orario": "2025-01-19T12:00",
  "timestamp": "2025-01-19T12:00:00.000Z"
}
```

**Weather Codes:**
- 0: Sereno
- 1-3: Nuvoloso
- 45-48: Nebbia
- 51-67: Pioggia
- 71-77: Neve
- 80-82: Rovesci
- 95-99: Temporale

---

## 7. Forecast Orario

```
GET /api/hourly?lat=XX&lon=YY&hours=N
```

**Parametri:**

| Nome | Tipo | Default | Max | Descrizione |
|------|------|---------|-----|-------------|
| `lat` | number | - | - | Latitudine |
| `lon` | number | - | - | Longitudine |
| `hours` | number | 24 | 48 | Ore di previsione |

**Risposta:**
```json
{
  "lat": 44.65,
  "lon": 7.35,
  "hours": 24,
  "hourly": {
    "time": ["2025-01-19T12:00", "2025-01-19T13:00", ...],
    "temperature_2m": [22.4, 23.1, ...],
    "relative_humidity_2m": [65, 62, ...],
    "wind_speed_10m": [5.2, 4.8, ...],
    "wind_direction_10m": [180, 175, ...],
    ...
  },
  "timestamp": "2025-01-19T12:00:00.000Z"
}
```

---

## 8. Forecast Completo

```
GET /api/forecast?lat=XX&lon=YY&days=N
```

**Parametri:**

| Nome | Tipo | Default | Max | Descrizione |
|------|------|---------|-----|-------------|
| `lat` | number | - | - | Latitudine |
| `lon` | number | - | - | Longitudine |
| `days` | number | 7 | 7 | Giorni di previsione |

**Risposta:**
```json
{
  "lat": 44.65,
  "lon": 7.35,
  "days": 7,
  "current": {
    "temperature_2m": 22.4,
    "humidity": 65,
    "wind_speed": 5.2,
    ...
  },
  "hourly": { ... },
  "daily": {
    "time": ["2025-01-19", "2025-01-20", ...],
    "weather_code": [0, 1, ...],
    "temperature_2m_max": [24.5, 23.2, ...],
    "temperature_2m_min": [12.1, 11.5, ...],
    ...
  },
  "timestamp": "2025-01-19T12:00:00.000Z"
}
```

---

## Errori

**400 - Parametri mancanti:**
```json
{
  "error": "Parametri mancanti o non validi. Usa ?lat=XX&lon=YY"
}
```

**400 - Coordinate fuori range:**
```json
{
  "error": "Coordinate fuori range"
}
```

**502 - Errore upstream:**
```json
{
  "error": "Errore proxy Open-Meteo",
  "detail": "..."
}
```

**404 - Endpoint non trovato:**
```json
{
  "error": "Endpoint non trovato",
  "path": "/unknown"
}
```

---

## Note

- L'API utilizza solo moduli built-in di Node.js (zero dipendenze)
- Timeout: 8 secondi per chiamate Open-Meteo
- Cache: 5 minuti TTL per ridurre chiamate
- CORS: abilitato per tutti gli origins
- Timezone risposta: `Europe/Rome`
- Logging con detect device mobile (📱/🌐)
