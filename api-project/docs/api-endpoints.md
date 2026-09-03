# 📡 API Endpoints - Meteo dei Conigli

## Base URL

```
http://localhost:3000
```

## Endpoint

### 1. Test (Dati Hardcoded)

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
  "timestamp": "2025-01-19T10:30:00.000Z"
}
```

### 2. Dati Meteo Reali (Open-Meteo)

```
GET /api/meteo?lat={lat}&lon={lon}
```

**Parametri:**

| Nome | Tipo | Obbligatorio | Range | Descrizione |
|------|------|--------------|-------|-------------|
| `lat` | number | Sì | -90 to 90 | Latitudine |
| `lon` | number | Sì | -180 to 180 | Longitudine |

**Risposta Successo (200):**
```json
{
  "lat": 44.65,
  "lon": 7.35,
  "temperature": 22.4,
  "wind_speed": 5.2,
  "wind_dir": 180,
  "gusts": 7.8,
  "orario": "2025-01-19T10:00",
  "timestamp": "2025-01-19T10:30:00.000Z"
}
```

**Errore 400 - Parametri mancanti:**
```json
{
  "error": "Parametri mancanti o non validi. Usa ?lat=XX&lon=YY"
}
```

**Errore 400 - Coordinate fuori range:**
```json
{
  "error": "Coordinate fuori range"
}
```

**Errore 502 - Errore upstream:**
```json
{
  "error": "Errore proxy Open-Meteo",
  "detail": "..."
}
```

**Errore 404 - Endpoint non trovato:**
```json
{
  "error": "Endpoint non trovato"
}
```

## Esempio con cURL

```bash
# Test
curl http://localhost:3000/api/meteo/test

# Dati reali
curl "http://localhost:3000/api/meteo?lat=44.65&lon=7.35"
```

## Esempio con JavaScript

```javascript
const response = await fetch(
  'http://localhost:3000/api/meteo?lat=44.65&lon=7.35'
);
const data = await response.json();
console.log(data);
```

## Note

- L'API utilizza solo moduli built-in di Node.js (zero dipendenze)
- Timeout: 8 secondi
- CORS: abilitato per tutti gli origins
- Timezone risposta: `Europe/Rome`
