# 🪂 REPORT: Necessità Reali dei Piloti di Parapendio

**Documento di sintesi** — Basato su studio meteorologia aeronautica, forum volo libero, studi sicurezza (FFVL/FIVL), piattaforme specializzate (Soaringmeteo, Meteo-Parapente, SkySight)

---

## 🔴 PRIORITÀ ASSOLUTE (Devo saperlo PRIMA di decollare)

### 1. Posso decollare in sicurezza?
**Domanda del pilota:** "Il vento mi permette di andare?"

| Dato | Perché serve | Soglia critica |
|------|-------------|----------------|
| **Vento al suolo** | Direzione, intensità, raffiche | < 25 km/h, fronteale, scarto < 15 km/h |
| **Precipitazioni** | Pioggia = pericolo immediato | > 0.5 mm/h = STOP |
| **Temporali** | Fulmini, downdraft violenti | Cumulonembi nella zona = no volo |
| **Rotori** | Turbolenza sottovento pericolosa | Vento > 15 km/h dietro il sito |

**Visualizzazione ideale:** Semaforo semplice (🟢🟡🔴) + testo chiaro "SI / RIFIUTATI / ATTENZIONE"

---

### 2. Quanto in alto posso salire?
**Domanda del pilota:** "Fino a dove arrivano le termiche?"

| Dato | Perchè serve | Come calcolarlo |
|------|-------------|-----------------|
| **Plafond** | Quota massima termica | Boundary Layer Height |
| **Base nuvole** | Indicatore visivo del plafond | Calcolabile da temp/punto rugiada |
| **Velocità termica** | Quanto forte sale l'aria | Stimabile da CAPE (attenzione: CAPE sovrastima in climi aridi) |

**Nota fondamentale:** I valori di CAPE e Lifted Index vanno contestualizzati. In climi aridi sottostimano le condizioni di veleggiamento.

---

## 🟡 PRIORITÀ ALTE (Decisione e pianificazione)

### 3. Quanto è turbolento?
**Domanda del pilota:** "L'aria sarà calma o pericolosa?"

| Dato | Perchè serve | Soglia di attenzione |
|------|-------------|---------------------|
| **Scarto raffiche/media** | Segnale di instabilità | > 15 km/h = turbolenza probabile |
| **Shear verticale** | Variazione vento con quota | > 20 km/h tra quote = rischio collassi |
| **Gradiente termico** | Stabilità atmosfera | > 1°C/100m = instabile |

### 4. Qual è la finestra di volo?
**Domanda del pilota:** "Quando inizio e quando devo atterrare?"

| Dato | Perchè serve |
|------|-------------|
| **Ora inizio termiche** | Di solito dopo le 10:00 |
| **Ora fine termiche** | Quando il sole cala (brezza catabatica) |
| **Evoluzione oraria** | Situazione cambia durante la giornata |

### 5. Dove andrò? (solo per XC)
**Domanda del pilota:** "Il vento in quota mi porta dove?"

| Dato | Perchè serve |
|------|-------------|
| **Vento a quote multiple** | Pianificare rotta e ritorno |
| **Spazi aerei** | Evitare zone vietate |
| **Siti di atterraggio alternativi** | Piani B |

---

## 🟢 PRIORITÀ MEDIE (Analisi avanzata)

### 6. Condizioni specifiche del sito
**Domanda del pilota:** "Questo sito è adatto al mio livello?"

| Dato | Perchè serve |
|------|-------------|
| **Difficoltà sito** | Principiante vs esperto |
| **Vento ideale** | Direzione preferenziale |
| **Storia condizioni** | Questo sito è sempre ventoso? |

### 7. Confronto tra siti
**Domanda del pilota:** "Meglio quello qui o quello lì?"

| Dato | Perchè serve |
|------|-------------|
| **Confronto side-by-side** | Scegliere il sito migliore |
| **Stato balise vicine** | Dati reali dal posto |

---

## ⚫ COSE CHE IL PILOTA NON VUOLE VEDERE (o vuole in modalità semplificata)

### Principiante:
❌ **NON** vuole vedere: CAPE, Lifted Index, shear, gradienti, Skew-T  
✅ **VUOLE**: semaforo verde/giallo/rosso, testo semplice "Posso andare?", condizioni minime

### Intermedio:
✅ **VUOLE**: profilo verticale, stima turbolenza, balcone nubi  
⚠️ **VUOLE** i parametri tecnici ma spiegati in modo semplice

### Esperto/XC:
✅ **VUOLE**: Skew-T, mappe vento multi-quote, RASP, WRF ad alta risoluzione  
📊 **VUOLE**: dati tecnici completi, strumenti di pianificazione

---

## 🎯 CONCLUSIONI PER L'APP

### Layout ideale della dashboard principale:
```
┌─────────────────────────────────────────┐
│  🔴 SI / 🟡 ATTENZIONE / 🟢 VIA         │  ← SEMAFORO SUBITO
├─────────────────────────────────────────┤
│  Vento: 12 km/h ← ↑ | Raffiche: 18     │  ← DATI CRITICI
│  Precipitazioni: 0 mm/h               │
│  Temporali: No nella zona             │
├─────────────────────────────────────────┤
│  Plafond stimato: 2500 m              │  ← QUANTO IN ALTO
│  Base nuvole: 1800 m                  │
│  Termiche: moderata (2-3 m/s)         │
├─────────────────────────────────────────┤
│  📅 Oggi: 10:00-16:00  Domani: 🟢      │  ← FINESTRA DI VOLO
├─────────────────────────────────────────┤
│  [Grafico vento orario]               │  ← EVOLUZIONE
│  [Sito: Montoso Basso - buono]       │  ← SITI VICINI
├─────────────────────────────────────────┤
│  ⚠️ Disclaimer: verifica sul posto     │  ← OBBLIGATORIO
└─────────────────────────────────────────┘
```

### Funzionalità ESSENZIALI (MVP):
1. **Semaforo volabilità** con logica chiara
2. **Vento attuale + previsioni 24h** (grafico orario)
3. **Plafond e base nuvole** stimate
4. **Indice turbolenza** (raffiche, shear)
5. **Finestra di volo** (ore buoni)
6. **Lista siti vicini** con stato
7. **Disclaimer** obbligatorio

### Funzionalità AVANZATE (dopo MVP):
1. Confronto siti
2. Profilo verticale
3. Skew-T interattivo
4. Mappe vento multi-quote
5. Log voli
6. Notifiche temporali
7. Balise FFVL in tempo reale
8. Community condivisione condizioni

---

**Nota finale:** Il pilota guarda prima il cielo, poi l'app. I dati devono essere chiari, contestualizzati, e mai sostituire il giudizio umano. L'app è un SUPPORTO, non un ORACOLO.

---
*Documento generato dall'analisi di letteratura meteorologica aeronautica e pratiche di volo libero*