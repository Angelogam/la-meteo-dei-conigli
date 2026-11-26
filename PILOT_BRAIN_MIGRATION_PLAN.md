# PILOT BRAIN — PIANO DI MIGRAZIONE (registrazione preventiva, regola 6)

> Regola 6: prima di modificare qualsiasi file, questo piano viene creato/aggiornato.
> Base di riferimento: `origin/main` (versione in produzione su Vercel) — linea `locandina-su-main` = origin/main + locandina.

## Round 27/11 — commando del proprietario

«la mappa radar non funziona, poi tutta questa finestra me la devi inserire nella
finestra report della giornata e toglierla da sotto i titoli»

### Diagnosi radar (root cause accertata con test reali)

- Screenshot del proprietario: tile basemap con pannelli «Zoom Level Not Supported»
  (Esri) disegnati sulla carta, zoom predefinito z=9.
- Test dal vivo: `api/map-tile` in produzione (la-meteo-dei-conigli.vercel.app)
  risponde con tile valide a z=9 per Carto ED Esri — l'errore è intermittente:
  Esri a volte risponde HTTP 200 con l'immagine di errore anche a zoom validi.
- Due stili di tile di errore Esri:
  1. pannello grigio chiaro opaco «Map data not yet available» → GIÀ scartata
     dall'euristica esistente (chiari/piatto).
  2. **riquadri scuri su fondo trasparente «Zoom Level Not Supported» → NON
     scartata**: pochi pixel opachi (solo riquadri+testo), tutte le soglie
     (bianchi/chiari/grigi/piatto) restano sotto soglia → disegnata per errore.
- Fix definitivo (corretto dopo i test di produzione e il riproduzione locale):
  - **ROOT CAUSE = RainViewer**: le tile «Zoom Level Not Supported» venivano
    dal LAYER RADAR, non dalla basemap. RainViewer (a) ha ritirato gli URL coi
    timestamp grezzi (410 Gone / immagine di errore) — l'app li usava ancora —
    e (b) ora serve le tile radar SOLO fino a zoom 7 (da z=8: immagine di
    errore, verificato su endpoint 256 e 512).
  - Fix client (`RadarMappa.tsx`): i frame si riferiscono con l'HASH del
    `path` dell'API (es. /v2/radar/98290113fa46); le tile radar si chiedono
    con cap a z7 e upscale (stesso schema già usato per z>10).
  - Fix server (`map-tile.get.ts`): il parametro frame accetta solo l'hash
    alfanumerico (validazione stretta) e costruisce l'URL con
    /v2/radar/{hash}/....
  - Basemap (hardening mantenuto, verificato con test di produzione):
    - Esri resta primaria (tile valide verificate dall'egress Vercel).
    - Carto tolta dalla catena client: da egress server ora risponde
      «API KEY REQUIRED» (placeholder opaco — verificato in produzione).
    - Nuova regola `richiedeOpaca`: tile basemap con opachi/n < 0.95 = errore
      (stile trasparente che l'euristica cromatica non beccava) → fallback
      stesso Esri con `nocache` stabile per mount (nuova invocazione serverless
      = altro egress IP, bypass cache browser/CDN).
    - Server: le tile valide Esri sono sempre JPEG → risposta PNG = errore:
      scartata con retry, mai messa in cache 1 ora.
  - Le tile radar RainViewer (alpha reale) non sono toccate.

### Spostamento finestra Pilot Brain

- Lo strip decisionale completo (FlightDecisionBanner «La decisione in 4 risposte»
  + PilotBrainHero con le 4 domande, checklist, briefing, sezione «PERCHÉ») si
  sposta: FUORI dalla posizione sotto i titoli (sezione 3 dell'Index) → DENTRO la
  scheda «Report» della finestra «REPORT DELLA GIORNATA / Il briefing del pilota»,
  sopra il poster del report.
- Nessuna funzione rimossa: solo relocazione. Le props e il gating `{verdetto &&}`
  restano identici.

### Dashboard Vercel in chat

- Il proprietario vuole la dashboard Vercel sempre visibile a destra in chat per
  indicare le cose da sistemare: ogni round si chiude con merge → push → deploy,
  così il pannello mostra sempre l'ultima versione.

### Perimetro tecnico

1. `src/components/RadarMappa.tsx` — euristica tile: opacità obbligatoria per la
   basemap; Carto primaria, Esri riserva.
2. `src/pages/Index.tsx` — relocazione FlightDecisionBanner + PilotBrainHero nel
   tab «meteo» (Report della giornata).
3. Verifica: `tsc --noEmit`, `npm run build`, screenshot reale della mappa radar.
4. Deploy: merge su main → push GitHub → deploy Vercel (auto).

### Non toccare (congelato / protetto)

- Open-Meteo, cache, fallback dati: già consolidati su questa linea — NESSUN tocco.
- Locandina/report premium, 520 decolli, Francia, confronto 4 decolli, Servizi,
  Radar, Terrain 3D, Windgram: solo upgrade, mai rimozione.
- Vietate le quattro stringhe in UI («N/D», «dato non disponibile»,
  «windgram non disponibile», «429»).