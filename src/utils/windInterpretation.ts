"use client";

/**
 * Interpreta il profilo vento verticale e produce una descrizione
 * in linguaggio naturale utile per i piloti di volo libero.
 */

export interface InterpretazioneVento {
  riassunto: string;
  dettaglio: string;
  condizioniQuota: {
    quota: string;
    vento: string;
    interpretazione: string;
  }[];
  warning: string | null;
}

interface LivelloVento {
  quota: number;
  speed: number;
  dir: number;
}

function getDirAbbrev(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getWindArrow(deg: number): string {
  if (deg == null) return "";
  const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  return arrows[Math.round(deg / 45) % 8];
}

function descrizioneIntensita(speed: number): string {
  if (speed < 3) return "calma o brezza impercettibile";
  if (speed < 8) return "leggero";
  if (speed < 15) return "moderato";
  if (speed < 22) return "vivace";
  if (speed < 30) return "forte";
  if (speed < 40) return "molto forte";
  return "burrasca";
}

function descrizioneDirettrice(dir: number): string {
  const dirs = [
    { min: 337, max: 360, nome: "da nord, provenienza settentrionale", stabile: true, fav: "da nord — canale diretto, vento laminare" },
    { min: 0, max: 22, nome: "da nord", stabile: true, fav: "da nord — canale diretto" },
    { min: 22, max: 67, nome: "da nord-est", stabile: false, fav: "da nord-est — rotazione oraria" },
    { min: 67, max: 112, nome: "da est, provenienza orientale", stabile: true, fav: "da est — vento di caduta" },
    { min: 112, max: 157, nome: "da sud-est", stabile: false, fav: "da sud-est — rotazione antioraria" },
    { min: 157, max: 202, nome: "da sud, provenienza meridionale", stabile: true, fav: "da sud — vento di valle" },
    { min: 202, max: 247, nome: "da sud-ovest", stabile: false, fav: "da sud-ovest — rotazione" },
    { min: 247, max: 292, nome: "da ovest, provenienza occidentale", stabile: true, fav: "da ovest — vento di cresta" },
    { min: 292, max: 337, nome: "da nord-ovest", stabile: false, fav: "da nord-ovest — rotazione antioraria" },
  ];
  const d = ((dir % 360) + 360) % 360;
  for (const entry of dirs) {
    if (d >= entry.min && d < entry.max) return entry.nome;
  }
  return "da nord";
}

function descrizioneRotazione(livelli: LivelloVento[]): string {
  if (livelli.length < 2) return "";

  let rotazioneTotale = 0;
  for (let i = 1; i < livelli.length; i++) {
    let diff = livelli[i].dir - livelli[i - 1].dir;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    rotazioneTotale += diff;
  }

  if (Math.abs(rotazioneTotale) < 15) return "Il vento mantiene una direzione costante su tutta la colonna, segno di buona organizzazione delle termiche.";
  if (rotazioneTotale > 0) return "Il vento ruota in senso orario salendo di quota (veering), tipico di avvezione calda. Buona stabilità delle termiche.";
  return "Il vento ruota in senso antiorario salendo di quota (backing), tipico di avvezione fredda. Possibile turbolenza.";
}

function descrizioneShear(livelli: LivelloVento[]): string {
  if (livelli.length < 2) return "";

  let shearMax = 0;
  for (let i = 1; i < livelli.length; i++) {
    const diff = Math.abs(livelli[i].speed - livelli[i - 1].speed);
    const diffQuota = livelli[i].quota - livelli[i - 1].quota;
    if (diffQuota > 0) {
      const shear = diff / (diffQuota / 100); // km/h ogni 100m
      if (shear > shearMax) shearMax = shear;
    }
  }

  if (shearMax < 2) return "Wind shear verticale debole: le termiche non vengono deformate dal vento.";
  if (shearMax < 5) return "Wind shear verticale moderato: possibile qualche deformazione delle termiche, ma gestibile.";
  return "Wind shear verticale significativo: le termiche possono essere inclinate o spezzate dal vento in quota.";
}

export function interpretaProfiloVento(
  livelli: LivelloVento[],
  quotaDecollo: number,
): InterpretazioneVento {
  if (!livelli || livelli.length === 0) {
    return {
      riassunto: "Nessun dato vento disponibile",
      dettaglio: "Non ci sono dati sufficienti per analizzare il profilo vento verticale.",
      condizioniQuota: [],
      warning: null,
    };
  }

  const ordinati = [...livelli].sort((a, b) => a.quota - b.quota);
  const superficie = ordinati[0];
  const quoteAlte = ordinati.filter(l => l.quota > quotaDecollo + 200);
  const alDecollo = ordinati.filter(l => l.quota >= quotaDecollo - 100 && l.quota <= quotaDecollo + 100);
  const ventoDecollo = alDecollo.length > 0 ? alDecollo[0] : superficie;

  const dirDecollo = descrizioneDirettrice(ventoDecollo.dir);
  const intensitaDecollo = descrizioneIntensita(ventoDecollo.speed);
  const rotazione = descrizioneRotazione(ordinati);
  const shear = descrizioneShear(ordinati);

  // Valutazione condizioni di volo
  const condizioni: string[] = [];
  if (ventoDecollo.speed >= 5 && ventoDecollo.speed <= 18) {
    condizioni.push("👍 Vento al decollo ideale per il volo libero");
  } else if (ventoDecollo.speed < 3) {
    condizioni.push("⚠️ Vento al decollo troppo debole per sostenere il parapendio");
  } else if (ventoDecollo.speed > 25) {
    condizioni.push("⚠️ Vento al decollo forte, sconsigliato a piloti meno esperti");
  }

  // Velocità in quota
  const maxQuota = ordinati.reduce((max, l) => l.speed > max.speed ? l : max, ordinati[0]);
  if (maxQuota.speed > 30) {
    condizioni.push(`⚠️ Vento forte (${Math.round(maxQuota.speed)} km/h) a ${maxQuota.quota}m — possibile turbolenza in quota`);
  }

  // Direzione favorevole?
  const dirFavorevoli = [160, 180, 200, 210]; // S, SSW, SW
  const piuVicina = dirFavorevoli.reduce((best, d) =>
    Math.abs(ventoDecollo.dir - d) < Math.abs(ventoDecollo.dir - best) ? d : best, dirFavorevoli[0]
  );
  const diffDir = Math.abs(ventoDecollo.dir - piuVicina);
  if (diffDir < 30) {
    condizioni.push(`👍 Direzione favorevole per le valli piemontesi (esposizione S/SW)`);
  }

  // Warning
  let warning: string | null = null;
  if (ventoDecollo.speed > 35) {
    warning = "⚠️ Vento molto forte: valutare attentamente le condizioni prima del volo";
  } else if (ordinati.some(l => l.speed > 40)) {
    warning = "⚠️ Vento forte in quota (oltre 40 km/h): consigliata prudenza";
  }

  // Condizioni per quote significative
  const condizioniQuota = ordinati
    .filter(l => l.quota % 500 === 0 || l.quota === quotaDecollo)
    .map(l => ({
      quota: l.quota === quotaDecollo ? `${l.quota}m (decollo)` : `${l.quota}m`,
      vento: `${getWindArrow(l.dir)} ${getDirAbbrev(l.dir)} ${Math.round(l.speed)} km/h`,
      interpretazione: `${descrizioneIntensita(l.speed)} ${descrizioneDirettrice(l.dir)}`,
    }));

  return {
    riassunto: condizioni.length > 0 ? condizioni[0] : `Vento ${intensitaDecollo} ${dirDecollo} (${Math.round(ventoDecollo.speed)} km/h)`,
    dettaglio: `Vento al decollo (${quotaDecollo}m): ${intensitaDecollo} ${dirDecollo} a ${Math.round(ventoDecollo.speed)} km/h da ${Math.round(ventoDecollo.dir)}°. ${rotazione} ${shear}`,
    condizioniQuota,
    warning,
  };
}