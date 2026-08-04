"use client";

/**
 * Palette centralizzata per tutta l'app.
 * Ogni componente usa queste costanti invece di hardcodare colori.
 */

// === TERMICHE ===
export const THERMAL = {
  palette: {
    fortissima: { bg: "from-red-600/80 to-red-700/60", text: "text-red-200", bar: "#dc2626", label: "Fortissime" },
    forte: { bg: "from-orange-500/70 to-orange-600/50", text: "text-orange-200", bar: "#ea580c", label: "Forte" },
    buona: { bg: "from-amber-500/60 to-amber-600/40", text: "text-amber-200", bar: "#d97706", label: "Buona" },
    moderata: { bg: "from-yellow-400/50 to-yellow-500/30", text: "text-yellow-200", bar: "#ca8a04", label: "Moderata" },
    debole: { bg: "from-green-400/50 to-green-500/30", text: "text-green-200", bar: "#16a34a", label: "Debole" },
    molto_debole: { bg: "from-slate-500/40 to-slate-600/30", text: "text-slate-300", bar: "#64748b", label: "Molto debole" },
    assente: { bg: "from-slate-700/30 to-slate-800/20", text: "text-slate-400", bar: "#475569", label: "Assenti" },
  },
  rateoLimits: [
    { max: 0.3, key: "assente" as const },
    { max: 0.8, key: "molto_debole" as const },
    { max: 1.5, key: "debole" as const },
    { max: 2.5, key: "moderata" as const },
    { max: 3.5, key: "buona" as const },
    { max: 4.5, key: "forte" as const },
    { max: Infinity, key: "fortissima" as const },
  ],
  getPalette: (rateo: number) => {
    for (const limit of THERMAL.rateoLimits) {
      if (rateo <= limit.max) return THERMAL.palette[limit.key];
    }
    return THERMAL.palette.assente;
  },
} as const;

// === VENTO ===
export const WIND = {
  palette: {
    calma: { bg: "bg-emerald-400", text: "text-emerald-300", max: 3, label: "Calma" },
    leggero: { bg: "bg-emerald-500", text: "text-emerald-300", max: 8, label: "Leggero" },
    moderato: { bg: "bg-lime-500", text: "text-lime-300", max: 15, label: "Moderato" },
    fresco: { bg: "bg-amber-500", text: "text-amber-300", max: 22, label: "Fresco" },
    forte: { bg: "bg-orange-500", text: "text-orange-300", max: 30, label: "Forte" },
    molto_forte: { bg: "bg-red-500", text: "text-red-300", max: 40, label: "Molto forte" },
    burrasca: { bg: "bg-red-600", text: "text-red-300", max: Infinity, label: "Burrasca" },
  },
  getPalette: (speed: number) => {
    for (const p of Object.values(WIND.palette)) {
      if (speed <= p.max) return p;
    }
    return WIND.palette.burrasca;
  },
} as const;

// === VOLO STATUS ===
export const VOLO_STATUS = {
  ottimo: { bg: "bg-emerald-900/40 border-emerald-500/40", text: "text-emerald-300", icon: "🪂🔥", score: 9 },
  buono: { bg: "bg-green-900/30 border-green-500/30", text: "text-green-300", icon: "🪂", score: 7 },
  discreto: { bg: "bg-amber-900/30 border-amber-500/30", text: "text-amber-300", icon: "🌤️", score: 5 },
  difficile: { bg: "bg-orange-900/30 border-orange-500/30", text: "text-orange-300", icon: "⚠️", score: 3 },
  scarso: { bg: "bg-red-900/30 border-red-500/30", text: "text-red-300", icon: "❌", score: 1 },
} as const;

// === RISCHIO TEMPORALI ===
export const RISCHIO = {
  palette: {
    alto: { from: "from-red-900/40", to: "to-red-800/20", border: "border-red-500/40", text: "text-red-400", label: "ALTO", min: 70 },
    moderato: { from: "from-orange-900/40", to: "to-orange-800/20", border: "border-orange-500/40", text: "text-orange-400", label: "MODERATO", min: 40 },
    basso: { from: "from-amber-900/30", to: "to-amber-800/15", border: "border-amber-500/30", text: "text-amber-400", label: "BASSO", min: 15 },
    nessuno: { from: "from-green-900/20", to: "to-green-800/10", border: "border-green-500/20", text: "text-green-400", label: "NESSUNO", min: 0 },
  },
  getPalette: (value: number) => {
    for (const p of Object.values(RISCHIO.palette)) {
      if (value >= p.min) return p;
    }
    return RISCHIO.palette.nessuno;
  },
} as const;

// === DIREZIONI VENTO ===
export const DIRS_16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"] as const;
export const DIRS_8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;
export const DIRS_ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"] as const;

// === SHARED STYLES ===
export const CARD = {
  base: "bg-gradient-to-br from-slate-800/60 to-slate-900/40 border-2 border-slate-700/30 rounded-2xl p-4",
  hover: "hover:border-emerald-400/40 transition-all duration-200",
  header: "text-sm font-bold flex items-center gap-2 mb-3",
} as const;

export const BADGE = {
  base: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border",
  success: "bg-emerald-900/30 border-emerald-500/30 text-emerald-300",
  warning: "bg-amber-900/30 border-amber-500/30 text-amber-300",
  danger: "bg-red-900/30 border-red-500/30 text-red-300",
  info: "bg-sky-900/30 border-sky-500/30 text-sky-300",
} as const;