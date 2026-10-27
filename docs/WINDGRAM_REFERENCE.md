# WINDGRAM REFERENCE — Esempi Pratici per il Progetto

## 1. Struttura SVG base da copiare

```tsx
const WIDTH = 1000;
const HEIGHT = 580;
const MARGIN = { top: 70, right: 85, bottom: 80, left: 85 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right; // 830
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom; // 430
const MIN_ALT = 1300;
const MAX_ALT = 6000;

function getY(alt: number) {
  return MARGIN.top + PLOT_H - ((alt - MIN_ALT) / (MAX_ALT - MIN_ALT)) * PLOT_H;
}

function getX(idx: number) {
  return MARGIN.left + (idx / 10) * PLOT_W;
}
```

## 2. Barbetta completa (funzione da copiare)

```tsx
function barbette(x: number, y: number, speedKmh: number, dirDeg: number) {
  if (speedKmh < 1 || isNaN(speedKmh)) return null;
  const knots = speedKmh * 0.539957;
  const angle = ((dirDeg - 90) * Math.PI) / 180;
  const len = 22;
  const ex = x + len * Math.cos(angle);
  const ey = y + len * Math.sin(angle);
  const color = speedKmh > 30 ? "#d946ef" : speedKmh > 18 ? "#0284c7" : "#3b82f6";
  const featherAngle = angle + (115 * Math.PI) / 180 + Math.PI;
  
  const elements: React.ReactNode[] = [];
  let rem = Math.round(knots / 5) * 5;
  let pos = 1.0;
  
  while (rem >= 50 && pos >= 0.3) {
    const bx = x + pos * (ex - x);
    const by = y + pos * (ey - y);
    elements.push(
      <polygon key={`50-${pos}`} 
        points={`${bx},${by} ${bx + 11*Math.cos(featherAngle)},${by + 11*Math.sin(featherAngle)} ${bx + 5.5*Math.cos(angle)},${by + 5.5*Math.sin(angle)}`}
        fill={color} stroke={color} strokeWidth="1" />
    );
    rem -= 50; pos -= 0.28;
  }
  while (rem >= 10 && pos >= 0.2) {
    const bx = x + pos * (ex - x);
    const by = y + pos * (ey - y);
    elements.push(
      <line key={`10-${pos}`} x1={bx} y1={by}
        x2={bx + 10*Math.cos(featherAngle)} y2={by + 10*Math.sin(featherAngle)}
        stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    );
    rem -= 10; pos -= 0.18;
  }
  if (rem >= 5 && pos >= 0.2) {
    const bx = x + pos * (ex - x);
    const by = y + pos * (ey - y);
    elements.push(
      <line key="5" x1={bx} y1={by}
        x2={bx + 5.5*Math.cos(featherAngle)} y2={by + 5.5*Math.sin(featherAngle)}
        stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    );
  }
  
  return (
    <g key={`wb-${Math.round(x)}-${Math.round(y)}`}>
      <line x1={x} y1={y} x2={ex} y2={ey} stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      {elements}
    </g>
  );
}
```

## 3. Palette colori pronta all'uso

```tsx
const COLORS = {
  // Zone
  thermalBg:    "#fef08a",   // sfondo base
  thermalZone:  "#f97316",   // zona termica (opacità 0.85)
  stableZone:   "#6366f1",   // aria stabile (opacità 0.75)
  transition:   "#a5b4fc",   // transizione (opacità 0.5)
  hatchPattern: "#1e293b",   // tratteggio
  
  // Linee
  thermalTop:   "#9333ea",   // curva top termico
  zeroThermal:  "#0284c7",   // zero termico
  pblLine:      "#0f172a",   // boundary layer
  isotherm:     "#94a3b8",   // isoterme
  
  // Vento barbette
  windLow:      "#3b82f6",   // < 18 km/h
  windMid:      "#0284c7",   // 18-30 km/h
  windHigh:     "#d946ef",   // > 30 km/h
  
  // Testi
  textDark:     "#0f172a",   // testo principale
  textMuted:    "#64748b",   // testo secondario
  
  // Badge
  badgeBg:      "#ffffff",
  badgeBorder:  "#ea580c",
  badgeText:    "#0f172a",
  
  // Scala stabilità
  stability: [
    "#8a5bb8", "#4f7fd9", "#45b3cd", "#4ec099",
    "#8bc953", "#d8c728", "#eeb319", "#e86c1f", "#c92e1e"
  ]
};
```

## 4. Icona parapendio (SVG path)

```tsx
const PARAGLIDER_PATH = "M -18,-5 C -14,-18 14,-18 18,-5 C 12,-10 -12,-10 -18,-5 Z";
const PARAGLIDER_COLOR = "#c084fc";
const PARAGLIDER_STROKE = "#7e22ce";

// Uso:
<g transform={`translate(${x}, ${y})`}>
  <path d={PARAGLIDER_PATH} fill={PARAGLIDER_COLOR} stroke={PARAGLIDER_STROKE} strokeWidth="2" />
  <line x1="-14" y1="-6" x2="0" y2="0" stroke={PARAGLIDER_STROKE} strokeWidth="1.5" />
  <line x1="14" y1="-6" x2="0" y2="0" stroke={PARAGLIDER_STROKE} strokeWidth="1.5" />
  <circle cx="0" cy="0" r="4.5" fill="#fff" stroke={PARAGLIDER_STROKE} strokeWidth="2.5" />
</g>
```

## 5. Icona nuvola cumulo

```tsx
const CLOUD_PATH = "M -16,3 A 6,6 0 0,1 -7,-5 A 10,10 0 0,1 7,-6 A 8,8 0 0,1 16,2 A 5,5 0 0,1 14,8 L -14,8 A 5,5 0 0,1 -16,3 Z";

// Uso:
<g transform={`translate(${x}, ${cloudY})`}>
  <path d={CLOUD_PATH} fill="#fff" stroke="#64748b" strokeWidth="1.5" />
  <text x="0" y="4" fill="#0f172a" fontSize="10" fontWeight="900" textAnchor="middle">
    {pct}%
  </text>
</g>
```

## 6. Icona fiocco di neve (zero termico)

```tsx
<g transform={`translate(${x}, ${y})`}>
  <circle cx="0" cy="0" r="7.5" fill="#fff" stroke="#0284c7" strokeWidth="1.8" />
  <text x="0" y="3.5" fill="#0284c7" fontSize="10" fontWeight="900" textAnchor="middle">❄</text>
</g>
```

## 7. Badge dati (quota + rateo)

```tsx
<g transform={`translate(${x}, ${badgeY})`}>
  <rect x="-30" y="0" width="60" height="28" rx="5"
    fill="#fff" stroke="#ea580c" strokeWidth="1.5"
    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))" />
  <text x="0" y="12" fill="#0f172a" fontSize="11" fontWeight="900"
    textAnchor="middle" fontFamily="monospace">{quota} m</text>
  <text x="0" y="23" fill="#b91c1c" fontSize="11" fontWeight="900"
    textAnchor="middle" fontFamily="monospace">↑ {rateo.toFixed(1)} m/s</text>
</g>
```

## 8. Pattern a reticolo (cross-hatching)

```xml
<defs>
  <pattern id="thermalHatch" width="8" height="8" 
    patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
    <line x1="0" y1="0" x2="0" y2="8" stroke="#1e293b" strokeWidth="1" 
      strokeDasharray="2 2" opacity="0.35" />
    <line x1="0" y1="0" x2="8" y2="0" stroke="#1e293b" strokeWidth="1" 
      strokeDasharray="2 2" opacity="0.35" />
  </pattern>
</defs>
```

## 9. Gradiente per scala ΔT/100m

```xml
<defs>
  <linearGradient id="deltaTGrad" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" stop-color="#8a5bb8" />
    <stop offset="11%" stop-color="#4f7fd9" />
    <stop offset="22%" stop-color="#45b3cd" />
    <stop offset="33%" stop-color="#4ec099" />
    <stop offset="44%" stop-color="#8bc953" />
    <stop offset="56%" stop-color="#d8c728" />
    <stop offset="67%" stop-color="#eeb319" />
    <stop offset="78%" stop-color="#e86c1f" />
    <stop offset="100%" stop-color="#c92e1e" />
  </linearGradient>
</defs>

{/* Barra */}
<rect x={margin.left} y={getY(altitude) - 12} width={plotW} height="24" fill="url(#deltaTGrad)" />
```

## 10. Griglia isobarica completa

```tsx
const LEVELS = [
  { hpa: 500, alt: 5800 }, { hpa: 550, alt: 5000 },
  { hpa: 600, alt: 4400 }, { hpa: 650, alt: 3750 },
  { hpa: 700, alt: 3100 }, { hpa: 750, alt: 2500 },
  { hpa: 800, alt: 1950 }, { hpa: 850, alt: 1450 },
];

// Asse sinistro (hPa)
{LEVELS.map(l => (
  <g key={`hpa-${l.hpa}`}>
    <line x1={MARGIN.left} y1={getY(l.alt)} x2={WIDTH - MARGIN.right} y2={getY(l.alt)}
      stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.4" />
    <text x={MARGIN.left - 12} y={getY(l.alt) + 5}
      fill="#0f172a" fontSize="13" fontWeight="800" textAnchor="end">
      {l.hpa} hPa
    </text>
  </g>
))}

// Asse destro (metri)
{[6000, 5500, 5000, 4500, 4000, 3500, 3000, 2500, 2000, 1500].map(alt => (
  <g key={`alt-${alt}`}>
    <line x1={WIDTH - MARGIN.right} y1={getY(alt)} x2={WIDTH - MARGIN.right + 5} y2={getY(alt)}
      stroke="#0f172a" strokeWidth="1.2" />
    <text x={WIDTH - MARGIN.right + 10} y={getY(alt) + 5}
      fill="#0f172a" fontSize="13" fontWeight="700" textAnchor="start">
      {alt} m
    </text>
  </g>
))}
```

## 11. Ora etichette asse X

```tsx
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

{HOURS.map((h, i) => (
  <text key={`hr-${h}`} x={getX(i)} y={HEIGHT - MARGIN.bottom + 25}
    fill="#0f172a" fontSize="14" fontWeight="800"
    textAnchor="middle" fontFamily="monospace">
    {String(h).padStart(2, "0")}:00
  </text>
))}
```

## 12. Bordo del plot

```xml
<rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W} height={PLOT_H}
  fill="none" stroke="#0f172a" strokeWidth="1.4" />
```

---

## STRUTTURA SVG COMPLETA (ordine di rendering)

```
1. <defs> con pattern e gradienti
2. <rect> sfondo giallo (#fef08a)
3. <path> zona instabile arancione (sotto thermalTop)
4. <path> zona stabile viola (sopra thermalTop)
5. <path> strato transizione azzurro
6. <path> aree tratteggiate (pattern thermalHatch)
7. <path> isoterme tratteggiate
8. <path> curve livello termico (5%-100%)
9. <rect> barra ΔT/100m
10. <line> griglia isobarica (hPa)
11. <line> tick quote (metri)
12. <line> linee verticali orarie
13. <g> barbette vento (per ogni ora × livello)
14. <polyline> zero termico tratteggiato
15. <g> icone fiocco neve (per ogni ora)
16. <g> badge zero termico laterale
17. <path> linea PBL tratteggiata
18. <path> curva top termico viola
19. <g> icone parapendio (per ogni ora)
20. <g> icone nuvole cumulo (per ogni ora)
21. <g> badge quota+rateo (per ogni ora)
22. <text> etichette ore asse X
23. <rect> bordo plot
24. <g> badge "ARIA STABILE"
```

**Ordine CRITICO:** gli elementi devono essere disegnati dal fondo verso l'alto (z-order SVG).
Sfondo → Zone colorate → Griglia → Barbette → Curve → Icone → Etichette.
