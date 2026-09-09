# WINDGRAM IMPLEMENTATION CHECKLIST
## Lista di controllo per il windgram professionale

## DA IMPLEMENTARE NEL PROGETTO

### FASE 1 — Core Windgram (ProfessionalWindgram.tsx)

- [x] Struttura SVG base con margini corretti
- [x] Funzioni di mappatura quota→Y e ora→X
- [x] Barbette vento complete (triangolo 50nodi + linee 10/5 nodi)
- [x] Colori barbette in base alla velocità
- [x] Curva top termico viola con icone parapendio
- [x] Linea zero termico tratteggiata con icone fiocco
- [x] Zone colorate (instabile/stabile/transizione)
- [x] Griglia isobarica (asse sinistro hPa)
- [x] Tick quote (asse destro metri)
- [x] Linee verticali orarie
- [x] Etichette ore asse X
- [x] Bordo plot nero
- [x] Badge zero termico laterale
- [x] Badge "ARIA STABILE"
- [ ] Badge quota cumuli + rateo su ogni nodo
- [ ] Icone nuvole cumulo con % copertura
- [ ] Curve di livello termico (5%-100%)
- [ ] Isoterme tratteggiate
- [ ] Barra ΔT/100m con gradiente
- [ ] Legenda colori vento in basso
- [ ] Legenda zone colorate
- [ ] Pattern a reticolo per zone convettive

### FASE 2 — Dati e Logica

- [x] Dati fallback realistici (fallbackWeatherData.ts)
- [x] Calcolo termiche con fisica reale
- [x] Calcolo base cumuli (LCL formula)
- [x] Calcolo top termico
- [x] Calcolo zero termico da freezing_level_height
- [x] Vento a quote multiple (10m, 80m, 120m, 850hPa, 700hPa, 500hPa)
- [x] Wave index (differenza direzione vento)
- [x] Turbulence index (gust ratio)
- [ ] Gradient termico reale (da dati 80m/120m)
- [ ] CAPE e LI per rischio temporali
- [ ] Sole % basato su radiazione e nuvolosità

### FASE 3 — Windgram Matrix (alternative più semplice)

- [x] Tabella vento/ora con frecce
- [x] Colori celle in base a velocità vento
- [x] Zone termiche colorate (giallo/arancio/blu)
- [x] Icone nuvole
- [x] Selezione ora con highlight
- [ ] Badge dato al passaggio del mouse
- [ ] Indicatore data/ora corrente

### FASE 4 — Miglioramenti UI/UX

- [ ] Loading state con spinner
- [ ] Error state con messaggio chiaro
- [ ] Tooltip al passaggio del mouse sulle barbette
- [ ] Animazione di entrata per la curva termica
- [ ] Responsività mobile (scroll orizzontale)
- [ ] Toggle tema chiaro/scuro per il windgram
- [ ] Export come immagine PNG/SVG
- [ ] Stampa ottimizzata

### FASE 5 — Dati Aggiuntivi da Open-Meteo

- [x] uv_index (aggiunto a CURRENT_PARAMS)
- [x] visibility (aggiunto a CURRENT_PARAMS)
- [x] wind_speed_80m/120m/180m
- [x] wind_direction_80m/120m/180m
- [ ] pressure_msl (già presente)
- [ ] surface_pressure (già presente)
- [ ] dew_point_2m (già presente in HOURLY_PARAMS)
- [ ] apparent_temperature (già presente in CURRENT_PARAMS)
- [ ] precipitation_probability (già presente in HOURLY_PARAMS)
- [ ] cloud_cover_low/mid/high (già presenti)

### FASE 6 — Calcoli Avanzati

- [ ] PBL (Planetary Boundary Layer) stimato
- [ ] Wind shear calcolato tra livelli
- [ ] Convergenza/divergenza stimata
- [ ] Probability of thunderstorm (modello semplificato)
- [ ] Thermal launch time prediction
- [ ] Landing site wind estimation

---

## STATO ATTUALE vs IDEALE

| Componente | Stato | Note |
|------------|-------|------|
| SVG structure | ✅ Fatto | Margini, griglia, assi |
| Barbette vento | ✅ Fatto | Completo con tutte le penne |
| Curve termiche | ✅ Fatto | Top termico + icone |
| Zero termico | ✅ Fatto | Linea tratteggiata + icone |
| Zone colorate | ✅ Fatto | Instabile/stabile/transizione |
| Badge dati | ⚠️ Parziale | Zero termico sì, altri no |
| Nuvole icon | ⚠️ Parziale | Solo in ProfessionalWindgram |
| Scala ΔT | ✅ Fatto | Barra colorata in basso |
| Legenda vento | ⚠️ Parziale | Solo in WindgramMatrix |
| Responsività | ✅ Fatto | Scroll orizzontale |
| Dati realistici | ✅ Fatto | Physically-based fallback |
| API wind profile | ⚠️ Parziale | Fallback attivo ma API primary |

---

## PROSSIMI PASSI CONCRETI

1. **Completa i badge dati** — Aggiungi badge quota cumuli + rateo su ogni ora nel windgram professionale
2. **Aggiungi nuvole cumulo** — Icone nuvola con % su ogni colonna
3. **Migliora la legenda vento** — Aggiungi la legenda completa sotto il windgram
4. **Aggiungi tooltip** — Al passaggio del mouse mostra i dati della barbetta
5. **Verifica responsive** — Testa su mobile e tablet
6. **Test con dati reali** — Fai una chiamata API e verifica che tutto si-renderizzi correttamente
