# CORSO COMPLETO DI GRAFICA VETTORIALE SVG PER WINDGRAM
## Meteo per Volo Libero — Guida Tecnica Completa

---

## MODULO 1: FONDAMENTI DI SVG PER WINDGRAM

### 1.1 Perché SVG e non Canvas o altri formati?

**SVG (Scalable Vector Graphics)** è perfetto per i windgram perché:
- **Vettore puro**: si scala all'infinito senza pixelizzazione
- **DOM-driven**: ogni elemento è accessibile via JavaScript (click, hover, tooltip)
- **CSS-styled**: si possono applicare stili direttamente
- **Basso peso**: file XML compatti anche per grafici complessi
- **Stampa perfetta**: risoluzione infinita per output cartaceo

**Confronto con altre tecnologie:**

| Tecnologia | Scelta | Per SVG | Per Canvas |
|------------|--------|---------|------------|
| Scalabilità | SVG ✅ | Vettoriale nativo | Rasterizzato |
| Interattività | SVG ✅ | Eventi su ogni elemento | Manuale complesso |
| Performance (molti elementi) | Canvas ✅ | Lento se >1000 oggetti | Veloce con WebGL |
| Debug/Ispezione | SVG ✅ | Ispezionabile nel DOM | Nascosto |
| Animazioni CSS | SVG ✅ | Transizioni native | Richiede requestAnimationFrame |

**Regola pratica:** Usare SVG quando gli elementi sono < 500. Usare Canvas/WebGL quando servono migliaia di punti (es. heatmap ad alta risoluzione).

### 1.2 Struttura di base di un SVG per windgram

```xml
<svg 
  viewBox="0 0 1000 580"           <!-- Sistema di coordinate interno -->
  width="100%"                      <!-- Responsive: si adatta al contenitore -->
  height="auto"
  xmlns="http://www.w3.org/2000/svg"
  style="shape-rendering: geometricPrecision; text-rendering: geometricPrecision"
>
  <!-- 1. DEFINIZIONI (pattern, gradienti, filtri) -->
  <defs>
    <linearGradient id="thermalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#fef08a" />
    </linearGradient>
    <pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#1e293b" stroke-width="1" stroke-dasharray="2,2" />
    </pattern>
  </defs>

  <!-- 2. SFONDO -->
  <rect x="85" y="70" width="830" height="430" fill="#fef08a" />

  <!-- 3. GRIGLIA (linee isobariche) -->
  <g class="grid">
    <line x1="85" y1="200" x2="915" y2="200" stroke="#1e293b" stroke-width="0.8" stroke-dasharray="2,3" opacity="0.4" />
    <text x="75" y="205" fill="#0f172a" font-size="13" font-weight="800" text-anchor="end">850 hPa</text>
  </g>

  <!-- 4. ZONE COLORATE -->
  <path d="M 85,300 L 200,250 L 350,180 L 500,150 L 650,180 L 800,250 L 915,300 L 915,500 L 85,500 Z" fill="#f97316" opacity="0.85" />

  <!-- 5. BARBETTE DEL VENTO -->
  <g class="wind-barbs">
    <!-- Una barbetta per ogni livello a ogni ora -->
  </g>

  <!-- 6. CURVE TERMICHE -->
  <path d="M 85,350 Q 300,150 500,120 Q 700,150 915,350" fill="none" stroke="#9333ea" stroke-width="3.5" />

  <!-- 7. ETICHETTE -->
  <text x="500" y="560" fill="#0f172a" font-size="14" font-weight="800" text-anchor="middle" font-family="monospace">12:00</text>
</svg>
```

### 1.3 Sistema di coordinate e trasformazioni

**Asse Y invertito in SVG:** In SVG, Y=0 è in alto, Y=aumentando si scende. Questo è opposto alla matematica classica ma ideale per i windgram (quota cresce verso l'alto del grafico).

**Funzione di mappatura quota → coordinata Y:**
```javascript
const minAlt = 1300;   // quota minima (decollo)
const maxAlt = 6000;   // quota massima (500hPa)
const margin = { top: 70, bottom: 80, left: 85, right: 85 };
const plotH = 580 - margin.top - margin.bottom; // 430px

function getYFromAlt(alt) {
  const clamped = Math.min(maxAlt, Math.max(minAlt, alt));
  return margin.top + plotH - ((clamped - minAlt) / (maxAlt - minAlt)) * plotH;
}

// Esempio: 3000m → Y = 70 + 430 - ((3000-1300)/(6000-1300)) * 430
//        = 500 - (1700/4700) * 430 = 500 - 155 = 345px dal alto
```

**Funzione di mappatura ora → coordinata X:**
```javascript
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const plotW = 1000 - margin.left - margin.right; // 830px

function getXFromHourIdx(idx) {
  return margin.left + (idx / (HOURS.length - 1)) * plotW;
}

// Ora 8 → X = 85 + (0/10) * 830 = 85px
// Ora 13 → X = 85 + (5/10) * 830 = 500px
// Ora 18 → X = 85 + (10/10) * 830 = 915px
```

**Trasformazioni SVG utili:**
```xml
<!-- Rotazione per la barbetta -->
<g transform="translate(x, y) rotate(angolo)">
  <line x1="0" y1="0" x2="0" y2="20" />
</g>

<!-- Traduzione per icone -->
<g transform="translate(x, y)">
  <circle cx="0" cy="0" r="5" />
</g>

<!-- Scala per adattamenti -->
<g transform="translate(x, y) scale(0.8)">
  ...
</g>
```

---

## MODULO 2: COLORI E TEORIA CROMATICA PER METEO

### 2.1 Palette colori standard per windgram

I windgram professionali usano palette specifiche che trasmettono informazioni in modo intuitivo:

**Zone atmosferiche (stile Alpium):**

```
┌─────────────────────────────────────────────────────────────┐
│  ZONE COLORATE                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🟡 GIALLO (#fef08a)  = Sfondo base, aria instabile al     │
│                       suolo, termiche attive               │
│                                                             │
│  🟠 ARANCIONE (#f97316) = Zona termica attiva,            │
│                          sotto il top termico              │
│                          Intensità: opacità 0.85           │
│                                                             │
│  🔵 BLU (#6366f1)     = Aria stabile sopra il top        │
│                        Termiche inibite                    │
│                        Opacità: 0.75                       │
│                                                             │
│  🔵 CHIARO (#a5b4fc)  = Strato di transizione            │
│                        400m sopra il top                   │
│                        Opacità: 0.5                        │
│                                                             │
│  ⬛ TRATTEGGIO      = Zona convettiva                    │
│    (#1e293b)          Ore centrali (8h-18h)               │
│                        Pattern 45°                         │
└─────────────────────────────────────────────────────────────┘
```

**Scala di stabilità (delta T / 100m):**

```javascript
const STABILITY_SCALE = [
  { val: -0.20, color: "#8a5bb8" }, // viola    = Molto stabile
  { val:  0.00, color: "#4f7fd9" }, // blu      = Stabile
  { val:  0.16, color: "#45b3cd" }, // ciano    = Neutral
  { val:  0.32, color: "#4ec099" }, // verdeacqua= Leggermente instabile
  { val:  0.48, color: "#8bc953" }, // verde    = Instabile
  { val:  0.65, color: "#d8c728" }, // giallover= Moderatamente instabile
  { val:  0.82, color: "#eeb319" }, // giallo   = Instabile
  { val:  0.98, color: "#e86c1f" }, // arancione= Molto instabile
  { val:  1.20, color: "#c92e1e" }, // rosso    = Estremamente instabile
];
```

**Velocità vento (barbette e frecce):**

```javascript
function getWindColor(speedKmh) {
  if (speedKmh <= 4)   return "#0284c7"; // blu scuro  = Calma
  if (speedKmh <= 8)   return "#0d9488"; // teal       = Leggero
  if (speedKmh <= 13)  return "#16a34a"; // verde      = Moderato
  if (speedKmh <= 18)  return "#65a30d"; // lime       = Fresco
  if (speedKmh <= 24)  return "#eab308"; // giallo     = Sostegno
  if (speedKmh <= 30)  return "#f97316"; // arancione  = Forte
  if (speedKmh <= 42)  return "#dc2626"; // rosso      = Molto forte
  if (speedKmh <= 58)  return "#991b1b"; // rosso scuro= Pericoloso
  return                   "#86198f";    // viola      = Estremo
}
```

**Direzione vento barbetta (stile Alpium):**

```javascript
// Colore barbetta in base alla velocità
const barbColor = speedKmh > 30 ? "#d946ef"   // magenta = vento fortissimo
                : speedKmh > 18 ? "#0284c7"   // cyan    = vento moderato-forte
                :                 "#3b82f6";  // blu     = vento debole-moderato
```

### 2.2 Principi di design cromatico per meteorologia

**1. Contrasto sufficientemente alto per leggibilità**
- Testo scuro (#0f172a) su sfondo chiaro (#fef08a, #ffffff)
- Testo chiaro (#ffffff) su sfondo scuro (#6366f1, #0284c7)
- Mai testo chiaro su sfondo chiaro o viceversa

**2. Codifica semantica dei colori**
- ROSSO/ARANCIONE = Pericolo, instabilità, termiche forti
- BLU/VIOLA = Stabilità, aria stabile, pericolo onde
- GIALLO = Energia solare, termiche attive
- VERDE = Condizioni favorevoli, vento leggero
- BIANCO = Nuvole, cumuli, base cumuli

**3. Accessibilità (daltonismo)**
- Evitare combinazioni rosso-verde per dati critici
- Usare pattern (tratteggi) oltre al colore
- Aggiungere etichette testuali ai colori
- Testare con simulatori di daltonismo

**4. Opacità stratificata**
- Zone colorate: 0.75-0.85 (lasciano vedere la griglia sotto)
- Linee principali: opacità 1.0
- Linee di riferimento: opacità 0.3-0.4
- Pattern: opacità 0.35

### 2.3 Tipografia per windgram

**Font consigliati:**
- **Titoli:** font sans-serif bold (Inter, Roboto, system-ui)
- **Dati numerici:** font monospace (JetBrains Mono, Fira Code, system monospace)
- **Etichette asse:** font sans-serif medium

**Dimensioni gerarchiche:**

```
Titolo principale:  20-24px  font-weight: 900  tracking-tight
Sottotitolo:        11-12px  font-weight: 600  tracking-wide
Etichetta asse:     11-13px  font-weight: 800
Valore dato:        14-16px  font-weight: 900  monospace
Nota a piè di pagina: 9-10px font-weight: 400  opacity: 0.6
```

**Allineamento testo SVG:**
```xml
<!-- Testo centrato orizzontalmente -->
<text text-anchor="middle" x="500" y="30">Titolo</text>

<!-- Testo allineato a destra (asse sinistro) -->
<text text-anchor="end" x="75" y="205">850 hPa</text>

<!-- Testo allineato a sinistra (asse destro) -->
<text text-anchor="start" x="920" y="205">3000 m</text>

<!-- Testo centrato verticalmente (middle) -->
<text y="20" dominant-baseline="middle" text-anchor="middle">Centro</text>
```

---

## MODULO 3: BARBETTE DEL VENTO — TECNICA COMPLETA

### 3.1 Anatomia della barbetta meteorologica

La barbetta è il simbolo standard WMO per rappresentare velocità e direzione del vento.

```
                    ← Penna da 50 nodi (triangolo pieno)
                    ╱
                   ╱
                  ╱ ← Penna da 10 nodi (linea lunga)
                 ╱
                ╱ ← Penna da 5 nodi (linea corta)
               ╱
              ╱
             ╱
            │ ← Gambo (direzione da cui viene il vento)
            │
            ● ← Punto di ancoraggio sul windgram
```

**Convenzione direzione:** La barbetta punta DA DOVE viene il vento (convenzione meteorologica).
- Vento da Nord (0°): barbetta punta verso l'alto ↑
- Vento da Est (90°): barbetta punta verso sinistra ←
- Vento da Sud (180°): barbetta punta verso il basso ↓
- Vento da Ovest (270°): barbetta punta verso destra →

### 3.2 Formula di disegno della barbetta in SVG

**Passo 1: Calcolare l'angolo del gambo**
```javascript
// dirDeg = direzione DA cui viene il vento (0=N, 90=E, 180=S, 270=W)
// In SVG, 0° è a destra (Est), angolo cresce in senso orario
// Per puntare VERSO la direzione di provenienza:
const angle = ((dirDeg - 90) * Math.PI) / 180;
// dirDeg=0 (Nord) → angle = -90° → punta verso l'alto (negativo Y in SVG) ✓
// dirDeg=90 (Est) → angle = 0°   → punta verso destra ✓
// dirDeg=180 (Sud) → angle = 90°  → punta verso il basso ✓
// dirDeg=270 (Ovest) → angle = 180° → punta verso sinistra ✓
```

**Passo 2: Calcolare la lunghezza del gambo e l'estremità**
```javascript
const staffLen = 22; // pixel, lunghezza standard del gambo
const endX = x + staffLen * Math.cos(angle);
const endY = y + staffLen * Math.sin(angle);
```

**Passo 3: Calcolare la direzione delle piume**
```javascript
// Le piume stanno sul lato DESTRO del gambo (guardando dalla base verso l'estremità)
// Angolo delle piume = angolo gambo + 115° (verso destra)
const barbAngle = angle + (115 * Math.PI) / 180;
// Le piume puntano dalla parte opposta (lato destro del gambo)
const featherAngle = barbAngle + Math.PI;
```

**Passo 4: Convertire km/h in nodi**
```javascript
// 1 nodo = 1.852 km/h
// 1 km/h = 0.539957 nodi
const knots = speedKmh * 0.539957;
// Arrotonda ai 5 nodi più vicini per le penne
let rem = Math.round(knots / 5) * 5;
```

### 3.3 Implementazione completa della barbetta

```javascript
function renderWindBarb(x, y, speedKmh, dirDeg) {
  if (speedKmh == null || isNaN(speedKmh) || speedKmh < 1) return null;
  
  const knots = speedKmh * 0.539957;
  const angle = ((dirDeg - 90) * Math.PI) / 180;
  const staffLen = 22;
  const endX = x + staffLen * Math.cos(angle);
  const endY = y + staffLen * Math.sin(angle);
  
  // Colore in base alla velocità
  const barbColor = speedKmh > 30 ? "#d946ef" : speedKmh > 18 ? "#0284c7" : "#3b82f6";
  
  // Direzione piume (lato destro del gambo)
  const barbAngle = angle + (115 * Math.PI) / 180;
  const featherAngle = barbAngle + Math.PI;
  
  const elements = [];
  let rem = Math.round(knots / 5) * 5;
  let pos = 1.0; // Posizione lungo il gambo (1.0 = punta, 0.0 = base)
  
  // Pennacchio da 50 nodi (triangolo)
  while (rem >= 50 && pos >= 0.3) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    elements.push(
      <polygon 
        key={`p50-${pos}`}
        points={`${bx},${by} ${bx + 11 * Math.cos(featherAngle)},${by + 11 * Math.sin(featherAngle)} ${bx + 5.5 * Math.cos(angle)},${by + 5.5 * Math.sin(angle)}`}
        fill={barbColor} 
        stroke={barbColor} 
        strokeWidth="1" 
      />
    );
    rem -= 50;
    pos -= 0.28;
  }
  
  // Alette da 10 nodi (linea lunga)
  while (rem >= 10 && pos >= 0.2) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    elements.push(
      <line 
        key={`l10-${pos}`}
        x1={bx} y1={by}
        x2={bx + 10 * Math.cos(featherAngle)} y2={by + 10 * Math.sin(featherAngle)}
        stroke={barbColor} strokeWidth="1.6" strokeLinecap="round"
      />
    );
    rem -= 10;
    pos -= 0.18;
  }
  
  // Aletta da 5 nodi (linea corta)
  if (rem >= 5 && pos >= 0.2) {
    const bx = x + pos * (endX - x);
    const by = y + pos * (endY - y);
    elements.push(
      <line 
        key="l5"
        x1={bx} y1={by}
        x2={bx + 5.5 * Math.cos(featherAngle)} y2={by + 5.5 * Math.sin(featherAngle)}
        stroke={barbColor} strokeWidth="1.6" strokeLinecap="round"
      />
    );
  }
  
  return (
    <g key={`wb-${Math.round(x)}-${Math.round(y)}`}>
      {/* Gambo */}
      <line 
        x1={x} y1={y} x2={endX} y2={endY}
        stroke={barbColor} strokeWidth="1.6" strokeLinecap="round"
      />
      {/* Piume */}
      {elements}
    </g>
  );
}
```

### 3.4 Esempi pratici di barbette

**Vento 15 km/h da Nord (0°):**
- Knots: 15 × 0.54 = 8.1 → arrotondato a 5 nodi
- Angolo: -90° (punta verso l'alto)
- Piuma: 1 aletta da 5 nodi
- Colore: blu (#3b82f6)

**Vento 35 km/h da Ovest (270°):**
- Knots: 35 × 0.54 = 18.9 → arrotondato a 20 nodi
- Angolo: 180° (punta verso destra)
- Piume: 2 alette da 10 nodi
- Colore: magenta (#d946ef)

**Vento 65 km/h da Sud-Est (135°):**
- Knots: 65 × 0.54 = 35.1 → arrotondato a 35 nodi
- Angolo: 45° (punta in basso-a-destra)
- Piume: 1 triangolo (50 nodi non raggiungibile) + 1 aletta da 10 + 1 da 5 + 1 da 10 = 35 nodi
- Colore: magenta (#d946ef)

---

## MODULO 4: CURVE TERMICHE E LINEE DI RIFERIMENTO

### 4.1 Curva del top termico (parapendio viola)

La curva del top termico mostra l'evoluzione della quota massima delle termiche durante la giornata.

**Forma tipica:** Campana simmetrica con picco verso le 13:00-14:00

```javascript
// Costruzione del path SVG
const thermalTopCurve = hourlyData
  .map((h, i) => {
    const x = getXFromHourIdx(i);
    const y = getYFromAlt(h.thermalTop);
    return `${i === 0 ? "M" : "L"} ${x},${y}`;
  })
  .join(" ");

// Rendering SVG
<path d={thermalTopCurve} fill="none" stroke="#9333ea" strokeWidth="3.5" strokeLinecap="round" />
```

**Icona parapendio sui nodi:**
```javascript
// Forma dell'ala (arcata)
const paragliderPath = `
  M -18,-5 
  C -14,-18 14,-18 18,-5 
  C 12,-10 -12,-10 -18,-5 Z
`;

// Funi che collegano l'ala al pilota
const lines = [
  "M -14,-6 L 0,0",   // fune sinistra
  "M 14,-6 L 0,0",    // fune destra
];

// Pallino del pilota
const pilotCircle = "M 0,0 m -4.5,0 a 4.5,4.5 0 1,0 9,0 a 4.5,4.5 0 1,0 -9,0";
```

### 4.2 Linea dello zero termico

**Significato:** Quota in cui la temperatura scende sotto 0°C. Sopra questa quota, rischio di ghiaccio sulle ali.

**Rendering:**
```javascript
// Path tratteggiato
const zeroThermalPath = hourlyData
  .map((h, i) => `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(h.zeroThermal)}`)
  .join(" ");

// Linea tratteggiata blu
<polyline 
  points={zeroThermalPath} 
  fill="none" 
  stroke="#0284c7" 
  strokeWidth="2.5" 
  strokeDasharray="6 4" 
  strokeLinecap="round" 
/>

// Icona fiocco di neve su ogni nodo
{hourlyData.map((h, i) => {
  const x = getXFromHourIdx(i);
  const y = getYFromAlt(h.zeroThermal);
  return (
    <g key={`zero-${i}`} transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="7.5" fill="#ffffff" stroke="#0284c7" strokeWidth="1.8" />
      <text x="0" y="3.5" fill="#0284c7" fontSize="10" fontWeight="900" textAnchor="middle">❄</text>
    </g>
  );
})}
```

### 4.3 Curve di livello percentuale termico

Queste curve mostrano a che altezza relativa si trova il pilota all'interno della termica.

```javascript
// Curve al 5%, 10%, 15%, ..., 100% della distanza base-top
const THERMAL_PERCENTAGES = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

function getThermalLevelCurve(percent) {
  return hourlyData.map((h, i) => {
    // Interpola tra base e top in base alla percentuale
    const targetAlt = h.cloudBase + (h.thermalTop - h.cloudBase) * (percent / 100);
    return `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(targetAlt)}`;
  }).join(" ");
}

// Colori differenziati per percentuale
const levelColor = pct => 
  pct === 100 ? "#9333ea"      // viola = top
  : pct >= 50 ? "#a855f7"      // viola chiaro
  : pct >= 25 ? "#3b82f6"      // blu
  : "#0ea5e9";                 // ciano
```

### 4.4 Isoterme (linee di temperatura costante)

```javascript
function getIsothermPath(temp) {
  return hourlyData.map((h, i) => {
    // Trova l'altezza dove T = temp usando interpolazione lineare
    const temps = [h.tempGround, h.tempAt80m, h.tempAt120m];
    const alts = [h.tempGround, 800, 1200];
    
    let targetAlt = h.tempGround;
    for (let j = 0; j < temps.length - 1; j++) {
      if ((temps[j] >= temp && temps[j+1] <= temp) || (temps[j] <= temp && temps[j+1] >= temp)) {
        const ratio = (temp - temps[j]) / (temps[j+1] - temps[j]);
        targetAlt = alts[j] + (alts[j+1] - alts[j]) * ratio;
        break;
      }
    }
    return `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(targetAlt)}`;
  }).join(" ");
}
```

### 4.5 Zona instabile e zona stabile

**Zona instabile (sotto il top termico):**
```javascript
const unstableZonePath = () => {
  const points = [];
  // Segui la curva termica da sinistra a destra
  hourlyData.forEach((h, i) => {
    const x = getXFromHourIdx(i);
    const y = getYFromAlt(h.thermalTop);
    points.push(`${i === 0 ? "M" : "L"} ${x},${y}`);
  });
  // Chiudi il percorso verso il basso
  points.push(`L ${getXFromHourIdx(HOURS.length - 1)},${margin.top + plotH}`);
  points.push(`L ${margin.left},${margin.top + plotH}`);
  points.push("Z");
  return points.join(" ");
};
```

**Zona stabile (sopra il top termico):**
```javascript
const stableZonePath = () => {
  const points = [];
  // Inizia dall'alto a sinistra
  points.push(`M ${margin.left},${margin.top}`);
  // Vai a destra in alto
  points.push(`L ${margin.left + plotW},${margin.top}`);
  // Scendi lungo il bordo destro fino al top termico dell'ultima ora
  points.push(`L ${margin.left + plotW},${getYFromAlt(hourlyData[HOURS.length - 1].thermalTop)}`);
  // Segui la curva termica all'indietro (da destra a sinistra)
  for (let i = HOURS.length - 1; i >= 0; i--) {
    const x = getXFromHourIdx(i);
    const y = getYFromAlt(hourlyData[i].thermalTop);
    points.push(`L ${x},${y}`);
  }
  // Chiudi a sinistra
  points.push(`L ${margin.left},${margin.top}`);
  points.push("Z");
  return points.join(" ");
};
```

---

## MODULO 5: GRIGLIA E ASSE DEL WINDGRAM

### 5.1 Livelli isobarici (asse sinistro)

```javascript
const LEVELS = [
  { hpa: 500, alt: 5800 },
  { hpa: 550, alt: 5000 },
  { hpa: 600, alt: 4400 },
  { hpa: 650, alt: 3750 },
  { hpa: 700, alt: 3100 },
  { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 1950 },
  { hpa: 850, alt: 1450 },
];

// Rendering della griglia isobarica
{LEVELS.map((lvl) => {
  const y = getYFromAlt(lvl.alt);
  return (
    <g key={`grid-lvl-${lvl.hpa}`}>
      {/* Linea tratteggiata */}
      <line
        x1={margin.left} y1={y}
        x2={margin.left + plotW} y2={y}
        stroke="#1e293b" strokeWidth="0.8"
        strokeDasharray="2 3" opacity="0.4"
      />
      {/* Etichetta hPa (sinistra) */}
      <text x={margin.left - 12} y={y + 5} 
        fill="#0f172a" fontSize="13" fontWeight="800" textAnchor="end">
        {lvl.hpa} hPa
      </text>
    </g>
  );
})}
```

### 5.2 Quote in metri (asse destro)

```javascript
const ALT_TICKS = [6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500];

{ALT_TICKS.map((alt) => {
  const y = getYFromAlt(alt);
  return (
    <g key={`grid-alt-${alt}`}>
      {/* Linea di tick */}
      <line x1={margin.left + plotW} y1={y} x2={margin.left + plotW + 5} y2={y}
        stroke="#0f172a" strokeWidth="1.2" />
      {/* Etichetta quota (destra) */}
      <text x={margin.left + plotW + 10} y={y + 5}
        fill="#0f172a" fontSize="13" fontWeight="700" textAnchor="start">
        {alt} m
      </text>
    </g>
  );
})}
```

### 5.3 Linee verticali orarie

```javascript
{HOURS.map((h, i) => {
  const x = getXFromHourIdx(i);
  return (
    <line
      key={`vline-${h}`}
      x1={x} y1={margin.top}
      x2={x} y2={margin.top + plotH}
      stroke="#1e293b" strokeWidth="0.8"
      strokeDasharray="2 3" opacity="0.3"
    />
  );
})}

// Etichette ore (asse inferiore)
{HOURS.map((h, i) => {
  const x = getXFromHourIdx(i);
  return (
    <text
      key={`label-${h}`}
      x={x} y={margin.top + plotH + 25}
      fill="#0f172a" fontSize="14" fontWeight="800"
      textAnchor="middle" fontFamily="monospace"
    >
      {String(h).padStart(2, "0")}:00
    </text>
  );
})}
```

### 5.4 Bordo del plot

```xml
<!-- Rettangolo nero che delimita l'area del windgram -->
<rect 
  x={margin.left} y={margin.top} 
  width={plotW} height={plotH} 
  fill="none" 
  stroke="#0f172a" 
  strokeWidth="1.4" 
/>
```

---

## MODULO 6: ICONE E ELEMENTI DECORATIVI

### 6.1 Nuvola cumulo con percentuale

```javascript
// Disegna una nuvola stilizzata con SVG path
const cloudPath = `
  M -16,3 
  A 6,6 0 0,1 -7,-5 
  A 10,10 0 0,1 7,-6 
  A 8,8 0 0,1 16,2 
  A 5,5 0 0,1 14,8 
  L -14,8 
  A 5,5 0 0,1 -16,3 Z
`;

// Rendering con testo della percentuale
{hourlyData.map((h, i) => {
  if (i === 0 || i === hourlyData.length - 1) return null;
  const x = getXFromHourIdx(i);
  const cloudY = getYFromAlt(h.cloudBase + 250); // 250m sopra la base
  
  return (
    <g key={`cloud-${i}`} transform={`translate(${x}, ${cloudY})`}>
      <path d={cloudPath} fill="#ffffff" stroke="#64748b" strokeWidth="1.5" />
      <text x="0" y="4" fill="#0f172a" fontSize="10" fontWeight="900" textAnchor="middle">
        {h.cloudPct}%
      </text>
    </g>
  );
})}
```

### 6.2 Badge dati (quota cumuli + rateo)

```javascript
{hourlyData.map((h, i) => {
  const x = getXFromHourIdx(i);
  const badgeY = getYFromAlt(h.thermalTop) + 14; // 14px sotto il top
  
  return (
    <g key={`badge-${i}`} transform={`translate(${x}, ${badgeY})`}>
      {/* Rettangolo bianco con bordo arancione */}
      <rect x="-30" y="0" width="60" height="28" rx="5"
        fill="#ffffff" stroke="#ea580c" strokeWidth="1.5"
        filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
      />
      {/* Quota base cumuli */}
      <text x="0" y="12" fill="#0f172a" fontSize="11" fontWeight="900"
        textAnchor="middle" fontFamily="monospace">
        {h.cloudBase} m
      </text>
      {/* Rateo di salita */}
      <text x="0" y="23" fill="#b91c1c" fontSize="11" fontWeight="900"
        textAnchor="middle" fontFamily="monospace">
        ↑ {h.thermalAvg.toFixed(1)} m/s
      </text>
    </g>
  );
})}
```

### 6.3 Badge zero termico laterale

```xml
<g transform={`translate(${margin.left + plotW - 145}, ${getYFromAlt(avgZeroThermal) - 15})`}>
  <rect x="0" y="0" width="140" height="30" rx="6" 
    fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
  <text x="70" y="20" fill="#ffffff" fontSize="13" fontWeight="900"
    textAnchor="middle" fontFamily="monospace">
    0 °C · {avgZeroThermal} m
  </text>
</g>
```

### 6.4 Badge zona stabile

```xml
<g transform={`translate(${margin.left + plotW - 145}, ${margin.top + 12})`}>
  <rect x="0" y="0" width="140" height="26" rx="5" 
    fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
  <text x="70" y="18" fill="#ffffff" fontSize="12" fontWeight="900"
    textAnchor="middle">
    ❄ ARIA STABILE
  </text>
</g>
```

---

## MODULO 7: SCALE E LEGGENDA

### 7.1 Scala delta T / 100m (stabilità)

```javascript
const STABILITY_SCALE = [
  { val: -0.20, color: "#8a5bb8" },
  { val:  0.00, color: "#4f7d9" },
  { val:  0.16, color: "#45b3cd" },
  { val:  0.32, color: "#4ec099" },
  { val:  0.48, color: "#8bc953" },
  { val:  0.65, color: "#d8c728" },
  { val:  0.82, color: "#eeb319" },
  { val:  0.98, color: "#e86c1f" },
  { val:  1.20, color: "#c92e1e" },
];

// Barra continua segmentata
<div className="w-full h-4 rounded-sm flex overflow-hidden border border-slate-400">
  {STABILITY_SCALE.map((item, idx) => (
    <div key={idx} className="flex-1 h-full" style={{ backgroundColor: item.color }} />
  ))}
</div>

// Etichette valori sotto la barra
<div className="flex justify-between text-[10px] font-mono font-bold text-slate-700 mt-1 px-1">
  {STABILITY_SCALE.map((item, idx) => (
    <span key={idx}>{item.val.toFixed(2)}</span>
  ))}
</div>
```

### 7.2 Scala velocità vento

```javascript
const WIND_SPEED_COLORS = [
  { max: 4,   color: "#0284c7", label: "≤4 km/h" },
  { max: 8,   color: "#0d9488", label: "5-8 km/h" },
  { max: 13,  color: "#16a34a", label: "9-13 km/h" },
  { max: 18,  color: "#65a30d", label: "14-18 km/h" },
  { max: 24,  color: "#eab308", label: "19-24 km/h" },
  { max: 30,  color: "#f97316", label: "25-30 km/h" },
  { max: 42,  color: "#dc2626", label: "31-42 km/h" },
  { max: 58,  color: "#991b1b", label: "43-58 km/h" },
  { max: Infinity, color: "#86198f", label: "≥59 km/h" },
];

// Legenda in basso nel windgram
<div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-200">
  <span className="text-[8px] text-slate-600 font-medium">km/h:</span>
  {WIND_SPEED_COLORS.map((item, idx) => (
    <div key={idx} className="flex items-center gap-0.5">
      <div className="w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: item.color }} />
      <span className="text-[7px] text-slate-600">{item.label}</span>
    </div>
  ))}
  <span className="text-[8px] font-mono text-slate-500 ml-2">Freccia=dir · Numero=km/h</span>
</div>
```

### 7.3 Legenda zone colorate

```javascript
<div className="flex items-center gap-4 flex-wrap">
  <div className="flex items-center gap-1">
    <div className="w-2.5 h-1.5 rounded bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 border border-orange-400/60" />
    <span className="text-slate-700 font-medium text-[9px]">Termica</span>
  </div>
  <div className="flex items-center gap-1">
    <div className="w-2.5 h-1.5 rounded bg-gradient-to-b from-[#b5d5e4] via-[#82b1cc] to-[#6a9cba] border border-[#6a9cba]/60" />
    <span className="text-slate-700 font-medium text-[9px]">Stabile</span>
  </div>
  <div className="flex items-center gap-1">
    <div className="w-2.5 h-1.5 rounded bg-violet-400 border border-violet-500" />
    <span className="text-slate-700 font-medium text-[9px]">Top termico</span>
  </div>
  <div className="flex items-center gap-1">
    <div className="w-2.5 h-1.5 rounded bg-sky-500 border border-sky-600" />
    <span className="text-slate-700 font-medium text-[9px]">Zero termico</span>
  </div>
</div>
```

---

## MODULO 8: PATTERN E EFFETTI VISIVI

### 8.1 Pattern a reticolo (cross-hatching)

```xml
<defs>
  <pattern id="thermalHatch" width="8" height="8" 
    patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="0" y2="8" stroke="#1e293b" stroke-width="1" 
      stroke-dasharray="2 2" opacity="0.35" />
    <line x1="0" y1="0" x2="8" y2="0" stroke="#1e293b" stroke-width="1" 
      stroke-dasharray="2 2" opacity="0.35" />
  </pattern>
</defs>

{/* Applica il pattern a un'area */}
<path d="M 200,300 L 200,400 Q 500,450 800,350 L 800,300 Z" fill="url(#thermalHatch)" />
```

### 8.2 Gradienti lineari e radiali

```xml
<defs>
  {/* Gradiente verticale per zona instabile */}
  <linearGradient id="unstableGradient" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#f97316" stop-opacity="0.9" />
    <stop offset="100%" stop-color="#fef08a" stop-opacity="0.3" />
  </linearGradient>
  
  {/* Gradiente verticale per zona stabile */}
  <linearGradient id="stableGradient" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" stop-color="#6366f1" stop-opacity="0.8" />
    <stop offset="100%" stop-color="#a5b4fc" stop-opacity="0.4" />
  </linearGradient>
  
  {/* Gradiente orizzontale per scala delta T */}
  <linearGradient id="deltaTGradient" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#8a5bb8" />
    <stop offset="0.11" stop-color="#4f7d9" />
    <stop offset="0.22" stop-color="#45b3cd" />
    <stop offset="0.33" stop-color="#4ec099" />
    <stop offset="0.44" stop-color="#8bc953" />
    <stop offset="0.56" stop-color="#d8c728" />
    <stop offset="0.67" stop-color="#eeb319" />
    <stop offset="0.78" stop-color="#e86c1f" />
    <stop offset="1.0" stop-color="#c92e1e" />
  </linearGradient>
</defs>
```

### 8.3 Filtri (ombre e glow)

```xml
<defs>
  {/* Ombra soffusa per badge */}
  <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.15" />
  </filter>
  
  {/* Glow per linee importanti */}
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2" result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
</defs>
```

---

## MODULO 9: LAYOUT E COMPOSIZIONE

### 9.1 Dimensioni standard del windgram

```
┌────────────────────────────────────────────────────────────────┐
│  TITOLO: "pian munè · lun 9 set"                              │
│  SOTTOTITOLO: "plotted 2024-09-09 00:00 UTC · model ground 1379 m" │
├────────────────────────────────────────────────────────────────┤
│  TABELLA ASCENDENZA + SOLE % (11 colonne)                      │
├────────────────────────────────────────────────────────────────┤
│  WINDGRAM SVG                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 500hPa ──────────────────────────────────────────────── │  │
│  │ 850hPa ···巴巴巴巴巴巴巴巴巴巴巴巴巴巴巴巴巴巴···         │  │
│  │  Termica ██▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░      │  │
│  │  Zero ············································❄   │  │
│  │  Parapendenti  🪂    🪂    🪂    🪂    🪂    🪂      │  │
│  │  PBL ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─     │  │
│  │  Decollo ─────────────────────────────────────────────  │  │
│  │   08   09   10   11   12   13   14   15   16   17   18 │  │
│  └─────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│  SCALA ΔT/100m (9 colori)                                     │
│ Fonte: Open-Meteo · GFS + ICON-EU                             │
└────────────────────────────────────────────────────────────────┘
```

**Dimensioni SVG consigliate:**
- Width: 1000px (minimo per leggibilità su desktop)
- Height: 580px
- Margini: top=70, right=85, bottom=80, left=85
- Plot area: 830 × 430 px

### 9.2 Gerarchia visiva

**Livello 1 (primario):**
- Curva termica viola — è l'elemento più importante, spesso usato per decidere dove volare
- Barbette del vento — dati principali che il pilota legge

**Livello 2 (secondario):**
- Zero termico tratteggiato — informazione critica per sicurezza
- Zone colorate — contesto visivo immediato
- Badge dati (quota cumuli, rateo) — lettura rapida

**Livello 3 (di supporto):**
- Griglia isobarica — riferimento spaziale
- Isoterme — dettaglio tecnico
- Curve di livello termico — analisi avanzata

### 9.3 Responsive design per SVG

```css
/* Il windgram deve essere leggibile su mobile */
.windgram-svg {
  width: 100%;
  height: auto;
  min-width: 880px;  /* Minimale per leggibilità */
  overflow-x: auto;  /* Scroll orizzontale se necessario */
}

/* Scrollbar stilizzata */
.windgram-svg::-webkit-scrollbar {
  height: 6px;
}
.windgram-svg::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 3px;
}
```

---

## MODULO 10: OTTIMIZZAZIONE PERFORMANCE

### 10.1 Quando usare `<g>` vs elementi singoli

**Usa `<g>` per raggruppare elementi correlati:**
```xml
<!-- Meglio: gruppo con trasformazione singola -->
<g transform="translate(500, 200)">
  <circle cx="0" cy="0" r="5" />
  <text x="0" y="15" text-anchor="middle">13:00</text>
</g>
```

**Evita gruppi annidati profondi:**
```xml
<!-- Peggio: troppi livelli di nested -->
<g>
  <g>
    <g>
      <g>
        <line ... />
      </g>
    </g>
  </g>
</g>
```

### 10.2 Key uniche per gli elementi React

```javascript
// ✅ Buona: chiave univoca basata su coordinate
<g key={`wb-${Math.round(x)}-${Math.round(y)}`}>
  <line x1={x} y1={y} x2={endX} y2={endY} />
</g>

// ❌ Cattiva: chiave generica che causa re-render inutili
<g key="barb">
  <line x1={x} y1={y} x2={endX} y2={endY} />
</g>
```

### 10.3 Memoizzazione dei path SVG

```javascript
// useMemo per path complessi che non cambiano spesso
const thermalTopCurve = useMemo(() => {
  return hourlyData.map((h, i) => 
    `${i === 0 ? "M" : "L"} ${getXFromHourIdx(i)},${getYFromAlt(h.thermalTop)}`
  ).join(" ");
}, [hourlyData]);

// Ricalcola solo quando hourlyData cambia
```

### 10.4 Lazy rendering per barbette

```javascript
// Non disegnare barbette per venti < 1 km/h (invisibili)
{hourlyData.map((calc, i) => {
  const x = getXFromHourIdx(i);
  return (
    <g key={`col-${i}`}>
      {calc.levelWinds
        .filter(w => w.speed >= 1)  // Filtra venti nulli
        .map((wLvl, j) => renderWindBarb(x, getYFromAlt(wLvl.alt), wLvl.speed, wLvl.dir))
      }
    </g>
  );
})}
```

---

## MODULO 11: CHECKLIST DI QUALITÀ

### 11.1 Verifica post-rendering

- [ ] Tutte le barbette sono posizionate correttamente (orientamento, lunghezza)
- [ ] La curva termica forma una campanela simmetrica
- [ ] Lo zero termico è sopra la curva termica (o la interseca realisticamente)
- [ ] I colori delle zone sono coerenti (giallo=instabile, blu=stabile)
- [ ] Le etichette degli assi sono leggibili (contasto sufficiente)
- [ ] La legenda è completa e chiara
- [ ] Il windgram è responsive (scroll orizzontale su mobile)
- [ ] Nessun elemento SVG si sovrappone in modo confuso

### 11.2 Test di accessibilità

- [ ] Colore-text contrast ratio ≥ 4.5:1 per testo normale
- [ ] Elementi critici hanno pattern oltre al colore
- [ ] Tooltip o etichette per interpretazione dati
- [ ] Navigazione da tastiera per interattività

### 11.3 Test cross-browser

- [ ] Chrome/Chromium ✅
- [ ] Firefox ✅
- [ ] Safari ✅
- [ ] Mobile Safari ✅
- [ ] Android Chrome ✅

---

## MODULO 12: ESEMPIO COMPLETO — WINDGRAM MINIMALE FUNZIONALE

```xml
<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="thermalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#fef08a" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  
  <!-- Sfondo -->
  <rect x="80" y="60" width="680" height="360" fill="#fef08a"/>
  
  <!-- Griglia -->
  <line x1="80" y1="120" x2="760" y2="120" stroke="#1e293b" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.3"/>
  <text x="70" y="125" fill="#0f172a" font-size="11" font-weight="700" text-anchor="end">850hPa</text>
  
  <line x1="80" y1="240" x2="760" y2="240" stroke="#1e293b" stroke-width="0.8" stroke-dasharray="4,4" opacity="0.3"/>
  <text x="70" y="245" fill="#0f172a" font-size="11" font-weight="700" text-anchor="end">700hPa</text>
  
  <!-- Zona instabile (termica) -->
  <path d="M 80,360 L 200,280 Q 420,100 640,280 L 760,360 L 760,420 L 80,420 Z" fill="url(#thermalGrad)"/>
  
  <!-- Curva top termico -->
  <path d="M 80,360 Q 200,280 420,100 Q 640,280 760,360" fill="none" stroke="#9333ea" stroke-width="3" stroke-linecap="round"/>
  
  <!-- Barbetta esempio: 20 km/h da Ovest (270°) a 850hPa -->
  <g transform="translate(420, 120)">
    <line x1="0" y1="0" x2="0" y2="-22" stroke="#f97316" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="0" y1="-8" x2="10.6" y2="-13.9" stroke="#f97316" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="0" y1="-15" x2="10.6" y2="-18.9" stroke="#f97316" stroke-width="1.6" stroke-linecap="round"/>
  </g>
  
  <!-- Icona parapendio sul top -->
  <g transform="translate(420, 100)">
    <path d="M -15,-4 C -12,-16 12,-16 15,-4 C 10,-8 -10,-8 -15,-4 Z" fill="#c084fc" stroke="#7e22ce" stroke-width="2"/>
    <line x1="-12" y1="-5" x2="0" y2="0" stroke="#7e22ce" stroke-width="1.5"/>
    <line x1="12" y1="-5" x2="0" y2="0" stroke="#7e22ce" stroke-width="1.5"/>
    <circle cx="0" cy="0" r="4" fill="#fff" stroke="#7e22ce" stroke-width="2"/>
  </g>
  
  <!-- Asse X: ore -->
  <text x="80" y="445" fill="#0f172a" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">08:00</text>
  <text x="255" y="445" fill="#0f172a" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">10:00</text>
  <text x="420" y="445" fill="#0f172a" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">12:00</text>
  <text x="585" y="445" fill="#0f172a" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">14:00</text>
  <text x="760" y="445" fill="#0f172a" font-size="12" font-weight="700" text-anchor="middle" font-family="monospace">16:00</text>
  
  <!-- Bordo -->
  <rect x="80" y="60" width="680" height="360" fill="none" stroke="#0f172a" stroke-width="1.4"/>
</svg>
```

---

## RIASSUNTO RAPIDO — REFERENCE CARD

```
╔══════════════════════════════════════════════════════════════╗
║  WINDGRAM CHEAT SHEET                                      ║
╠══════════════════════════════════════════════════════════════╣
║  Dimensione SVG:  1000 × 580px                             ║
║  Margini:         L=85 R=85 T=70 B=80                       ║
║  Plot area:       830 × 430px                               ║
║  Quote:           1300m - 6000m                             ║
║  Ore:             08:00 - 18:00 (11 colonne)                ║
╠══════════════════════════════════════════════════════════════╣
║  COLORI                                                    ║
║  Termica (sotto top):  #f97316 (arancio) @ 0.85            ║
║  Stabile (sopra top):  #6366f1 (viola)   @ 0.75            ║
║  Transizione:          #a5b4fc (azzurro)  @ 0.50            ║
║  Top termico:          #9333ea (viola)    stroke 3.5       ║
║  Zero termico:         #0284c7 (ciano)    dash 6,4         ║
║  PBL:                  #0f172a (nero)     dash 5,4         ║
╠══════════════════════════════════════════════════════════════╣
║  BARBETTE                                                   ║
║  < 18 km/h:  #3b82f6 (blu)                                  ║
║  18-30:     #0284c7 (cyan)                                  ║
║  > 30 km/h: #d946ef (magenta)                               ║
║  50 nodi:    triangolo pieno (polygon)                      ║
║  10 nodi:    linea lunga (line, 10px)                      ║
║  5 nodi:     linea corta (line, 5.5px)                     ║
║  Angolo piume: angolo_gambo + 115°                          ║
╠══════════════════════════════════════════════════════════════╣
║  FONT                                                       ║
║  Titoli:     system-ui, sans-serif, 900                     ║
║  Dadi:       monospace, 800-900                             ║
║  Etichette:  system-ui, sans-serif, 700-800                 ║
║  Didascalie: system-ui, 400                                  ║
╚══════════════════════════════════════════════════════════════╝
```

---

Questo corso copre tutto ciò che serve per creare windgram professionali. Dimmi **OK** quando hai finito di studiarlo e ti dico cosa implementare.
