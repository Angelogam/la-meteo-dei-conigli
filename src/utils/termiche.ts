// Aggiungi questa riga all'inizio della funzione calcolaTermiche, dopo la dichiarazione:
export function calcolaTermiche(weather: HourData | any, altitude: number): TermicheData {
  // GUARD: se altitude è null/undefined, usa 1000 (circa media dei decolli)
  alt = altitude ?? 1000;
  
  // ...resto del codice...
}