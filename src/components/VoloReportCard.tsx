"import React, { useMemo } from \"react\"; // Added useMemo import
// ... existing imports ...

// Define a proper type that matches what we're passing to calcolaTermiche
interface ExtendedHourData extends HourData {
  temp: number; // Adding the temp property we need
}

// ... existing code ...

// Fix the type issue when mapping dayData
const termicheOrarie = useMemo(() => {
  if (!dayData || dayData.length === 0) return [];
  return dayData.map((h) => {
    const ora = h.time.getHours();
    // Cast to ExtendedHourData to satisfy TypeScript
    const hExtended = h as ExtendedHourData;
    const t = calcolaTermiche(hExtended, sito.altitude);
    return { 
      ora, 
      rateo: t.rateo, 
      base: t.base, 
      top: t.top, 
      precip: h.precipitation ?? 0, 
      temp: hExtended.temperature 
    };
  });
}, [dayData, sito.altitude]);

// ... rest of the component ...

// Reorder variable declarations to fix block-scoped variable errors
const analisiEmagramma = useMemo(() => {
  if (!current) {
    return "Dati non disponibili per l'analisi dell'emagramma.";
  }
  const liDesc = LI <= -6 ? "un valore che indica instabilità molto elevata, tipica di condizioni temporalesche – piu il numero e negativo e piu l'atmosfera e pronta a scatenare cumulonembi." : LI <= -4 ? "un valore che indica instabilita elevata, favorevole a sviluppi temporaleschi." : LI <= -2 ? "un valore che indica moderata instabilita, possibile sviluppo di cumuli." : LI <= 0 ? "un valore che indica leggera instabilita o neutralita." : "un valore che indica atmosfera stabile, scarsa probabilita di temporali.";
  
  // Compute oraInnesco and tempInnesco before using them
  const oraInnesco = termicheOrarie.find((t) => t.rateo >= 0.3)?.ora;
  const tempInnesco = oraInnesco !== undefined ? termicheOrarie.find((t) => t.ora === oraInnesco)?.temp ?? current?.temperature ?? 0 : 0;
  
  const tempInnescoDesc = tempInnesco
    ? `La temperatura di innesco è di ${tempInnesco.toFixed(1)} °C, il che significa che le termiche si attiveranno spontaneamente quando il suolo raggiungerà questa temperatura, verosimilmente tra le ${String(oraInnesco !== undefined ? oraInnesco : 10).padStart(2, "0")} e le ${String(oraInnesco !== undefined ? oraInnesco + 1 : 11).padStart(2, "0")}.`
    : "";
  
  const baseNubiDesc = `La base delle nubi (salita massima) è prevista a ${cloudBase} m, una quota relativamente bassa che limita il guadagno verticale a circa ${Math.max(0, cloudBase - currentSite.altitude)}–${Math.max(0, cloudBase - currentSite.altitude + 200)} metri sopra il suolo – non aspettarti di volare a 4000 metri con questa configurazione, perche l'umidita condensa presto.`;
  const zeroTermicoDesc = `Lo zero termico si trova a ${zeroTermico} m, valore ${zeroTermico > 4000 ? "alto" : "moderato"} che indica aria calda in quota, ma il forte contrasto tra bassi strati caldi e medi strati piu freschi genera proprio l'instabilita che porta ai temporali.`;
  const cinDesc = `Il CIN (energia di inibizione) e di ${CIN} J/kg, dal grafico sembra ${CIN <= 50 ? "basso o assente" : "moderato"}; quindi le termiche partiranno senza ostacoli gia al mattino.`;
  
  return `${liDesc} ${tempInnescoDesc} ${baseNubiDesc} ${zeroTermicoDesc} ${cinDesc}`;
}, [LI, current?.temperature, current?.dewPoint, current?.humidity, current?.cloudCover, cloudBase, currentSite.altitude, zeroTermico, CIN, termicheOrarie]);

// ... rest of the component ...

// Helper functions for risk display
function getRischioBg(r: number): string {
  if (r >= 70) return "bg-red-900/30 border-red-500/40";
  if (r >= 40) return "bg-orange-900/30 border-orange-500/40";
  if (r >= 15) return "bg-amber-900/30 border-orange-500/40";
  if (r >= 5) return "bg-yellow-500/20 border-yellow-500/30";
  return "bg-green-500/20 border-green-500/30";
}

function getRischioText(r: number): string {
  if (r >= 70) return "text-red-400";
  if (r >= 40) return "text-orange-400";
  if (r >= 15) return "text-amber-400";
  if (r >= 5) return "text-yellow-400";
  return "text-green-400";
}

function getRischioBar(r: number): string {
  if (r >= 70) return "bg-red-500";
  if (r >= 40) return "bg-orange-500";
  if (r >= 15) return "bg-amber-500";
  if (r >= 5) return "bg-yellow-500";
  return "bg-green-500";
}

// Import Activity icon
import { Activity } from "lucide-react";