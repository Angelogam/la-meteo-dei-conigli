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
      temp: hExtended.temperature // Add the temp property we need
    };
  });
}, [dayData, sito.altitude]);

// ... rest of the code ...

// Fix the variable declaration order issue
const analisiEmagramma = useMemo(() => {
  if (!current) {
    return \"Dati non disponibili per l'analisi dell'emagramma.\";
  }
  const liDesc = LI <= -6 ? \"un valore che indica instabilità molto elevata, tipica di condizioni temporalesche – più il numero è negativo e più l'atmosfera è pronta a scatenare cumulonembi.\" : LI <= -4 ? \"un valore che indica instabilità elevata, favorevole a sviluppi temporaleschi.\" : LI <= -2 ? \"un valore che indica moderata instabilità, possibile sviluppo di cumuli.\" : LI <= 0 ? \"un valore che indica leggera instabilità o neutralità.\" : \"un valore che indica atmosfera stabile, scarsa probabilità di temporali.\";
  
  // Compute oraInnesco and tempInnesco before using them
  const oraInnesco = termicheOrarie.find((t) => t.rateo >= 0.3)?.ora;
  const tempInnesco = oraInnesco !== undefined ? termicheOrarie.find((t) => t.ora === oraInnesco)?.temp ?? current?.temperature ?? 0 : 0;
  
  const tempInnescoDesc = tempInnesco
    ? `La temperatura di innesco è di ${tempInnesco.toFixed(1)} °C, il che significa che le termiche si attiveranno spontaneamente quando il suolo raggiungerà questa temperatura, verosimilmente tra le ${String(oraInnesco !== undefined ? oraInnesco : 10).padStart(2, \"0\")} e le ${String(oraInnesco !== undefined ? oraInnesco + 1 : 11).padStart(2, \"0\")}.`
    : \"\";
  
  const baseNubiDesc = `La base delle nubi (salita massima) è prevista a ${cloudBase} m, una quota relativamente bassa che limita il guadagno verticale a circa ${Math.max(0, cloudBase - currentSite.altitude)}–${Math.max(0, cloudBase - currentSite.altitude + 200)} metri sopra il suolo – non aspettarti di volare a 4000 metri con questa configurazione, perché l'umidità condensa presto.`;
  const zeroTermicoDesc = `Lo zero termico si trova a ${zeroTermico} m, valore ${zeroTermico > 4000 ? \"alto\" : \"moderato\"} che indica aria calda in quota, ma il forte contrasto tra bassi strati caldi e medi strati più freschi genera proprio l'instabilità che porta ai temporali.`;
  const cinDesc = `Il CIN (energia di inibizione) è di ${CIN} J/kg, dal grafico sembra ${CIN <= 50 ? \"basso o assente\" : \"moderato\"}; quindi le termiche partiranno senza ostacoli già al mattino.`;
  
  return `${liDesc} ${tempInnescoDesc} ${baseNubiDesc} ${zeroTermicoDesc} ${cinDesc}`;
}, [LI, current?.temperature, current?.dewPoint, current?.humidity, current?.cloudCover, cloudBase, currentSite.altitude, zeroTermico, CIN, termicheOrarie]);

// ... rest of the component ...