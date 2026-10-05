# Fix per Deploy Vercel

## Problema Risolto
Il file `nitro.config.ts` aveva una configurazione errata che causava il errore 500 su Vercel.

## Modifiche Fatte

### 1. nitro.config.ts (RIPRISTINATO)
```typescript
import { defineConfig } from "nitro";

export default defineConfig({
  serverDir: "./server",
});
```
**Rimosso:** `preset: "vercel"` e `rollupConfig` che causavano errori.

### 2. vercel.json (MANTENUTO CORRETTO)
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 3. PrevisioniGiornaliere.tsx (NUOVO DESIGN)
- Card interattive espandibili
- Design moderno glassmorphism
- Animazioni fluide
- Layout responsive

## Come Deployare

Esegui questi comandi nel terminale:

```bash
git add -A
git commit -m "fix: risolto deploy Vercel - rimosso preset vercel da nitro"
git push origin main
```

Oppure usa il comando Dyad:
```
<dyad-command type="commit">fix: deploy Vercel funzionante</dyad-command>
```

## Verifica
Dopo il push, vai su:
- Dashboard Vercel: https://vercel.com/dashboard
- Controlla che il build sia andato a buon fine
- Testa: https://la-meteo-dei-conigli-mrcq.vercel.app
