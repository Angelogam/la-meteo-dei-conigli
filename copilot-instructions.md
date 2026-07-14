# Progetto: Meteo dei Conigli

## Tech Stack
- React 19 + TypeScript
- Vite 8 come bundler
- Tailwind CSS 3.4 per lo stile
- shadcn/ui per componenti UI
- React Router 6 per routing
- Open-Meteo API come fonte dati meteo

## Struttura
- `src/pages/` — pagine (Index.tsx è la homepage)
- `src/components/` — componenti UI
- `src/hooks/` — custom hook useWeatherData
- `src/services/` — weatherService.ts (chiamate API)
- `src/data/` — decolli.ts (elenco siti)
- `src/utils/` — funzioni di calcolo (termiche, volo, wind, etc.)

## API
- Open-Meteo: `https://api.open-meteo.com/v1/forecast`
- Tutti i dati in `weatherService.ts`
- Cache 3 minuti, rate limiting 1.5s tra richieste

## Stile
- Tema scuro, gradienti, bordi arrotondati (rounded-xl/2xl)
- Palette: emerald, amber, slate, sky
- Lucide React per icone
- Design responsive, mobile-first

## Calcoli termici
- `calcolaTermiche()` in src/utils/termiche.ts
- Base: LCL = (T - Td) × 125
- Gradiente adiabatico secco: 0.98°C/100m
- Rateo da forza termica (0-10)