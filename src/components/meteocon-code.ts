/* Mappatura codice meteo → file Meteocon + etichetta italiana.
   Tenuta in un modulo separato dal componente: react-refresh vuole
   file che esportano SOLO componenti (condivisione tra componenti). */

export function meteoconFile(code: number | null): { file: string; label: string } {
  if (code == null) return { file: "overcast-day", label: "Condizione non disponibile" };
  if (code === 0 || code === 1) return { file: "clear-day", label: "Sereno" };
  if (code === 2) return { file: "partly-cloudy-day", label: "Parzialmente nuvoloso" };
  if (code === 3) return { file: "overcast-day", label: "Coperto" };
  if (code === 45 || code === 48) return { file: "fog-day", label: "Nebbia" };
  if ([51, 53, 55, 56, 57].includes(code)) return { file: "drizzle", label: "Pioviggine" };
  if ([61, 63, 65, 66, 67].includes(code)) return { file: "rain", label: "Pioggia" };
  if ([80, 81, 82].includes(code)) return { file: "partly-cloudy-day-rain", label: "Rovesci" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { file: "snow", label: "Neve" };
  if ([95, 96, 99].includes(code)) return { file: "thunderstorms-day-rain", label: "Temporale" };
  return { file: "overcast-day", label: "Condizione non riconosciuta" };
}

export function meteoconLabel(code: number | null): string {
  return meteoconFile(code).label;
}
