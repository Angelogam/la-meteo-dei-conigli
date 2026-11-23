# Deploy su Vercel — La Meteo dei Conigli

L'app è un'app **Nitro** (plugin `nitro/vite`): il build produce la Build Output
API di Vercel (`.vercel/output/`) quando rileva l'ambiente Vercel — verificato
localmente con `VERCEL=1 npm run build` (funzioni serverless in
`functions/__server.func` e `functions/api.func`, asset statici in `static/`).

Il `vercel.json` alla radice dichiara framework `nitro`, build `npm run build`
e install `npm install`: **nessun override necessario**.

## Deploy da GitHub (consigliato)

1. Il codice è già su GitHub: `https://github.com/Angelogam/la-meteo-dei-conigli`
2. Su https://vercel.com/new scegli la repo `la-meteo-dei-conigli`.
3. Framework Preset: **Nitro** (auto-rilevato; se non lo fosse, il `vercel.json`
   lo dichiara comunque). Build Command e Install Command restano i default
   dichiarati. **Non impostare Output Directory a mano**: il builder Nitro usa
   la Build Output API.
4. Variabili d'ambiente (Settings → Environment Variables):
   - `WINDY_WEBCAMS_API_KEY` — opzionale: senza chiave il pannello webcam
     degrada con eleganza (le altre API usano endpoint pubblici Open-Meteo).
5. Deploy → da qui ogni push su `main` pubblica automaticamente.
6. Dominio personale (opzionale): Settings → Domains.

## Deploy da CLI (alternativa)

```bash
npm i -g vercel
vercel login
vercel          # preview
vercel --prod   # produzione
```

## Verifica post-deploy

- `/` → la dashboard apre con il **Pilot Brain** come primo blocco (banda
  GO/ATTESA/NO-GO con dati reali Open-Meteo).
- `/api/health` → route serverless attiva.
- `/termiche` → routing client-side; se restituisse 404 su un dominio nuovo è
  il fallback SPA: segnalare, si sistema nel preset Nitro.
- Cartina 3D: gli asset Cesium sono statici (`public/cesium/`, creati dal
  postinstall `scripts/copy-cesium.cjs`) — il postinstall gira anche su Vercel.
