/** Mappa codici WMO a emoji */
export const weatherEmoji = (code: number): string => {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code >= 45 && code <= 49) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 95 && code <= 99) return "⛈️";
  return "☀️";
};

export const weatherText = (code: number): string => {
  if (code === 0) return "Sereno";
  if (code === 1) return "Poco nuvoloso";
  if (code === 2) return "Parzialmente nuvoloso";
  if (code === 3) return "Coperto";
  if (code >= 45 && code <= 49) return "Nebbia";
  if (code >= 51 && code <= 57) return "Pioviggine";
  if (code >= 61 && code <= 67) return "Pioggia";
  if (code >= 71 && code <= 77) return "Neve";
  if (code >= 80 && code <= 82) return "Rovesci";
  if (code >= 95 && code <= 99) return "Temporale";
  return "";
};

export const windDirection = (deg: number): string => {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
};

export const windArrow = (deg: number): string => {
  const arrows = ["↑","↑","↗","↗","→","→","↘","↘","↓","↓","↙","↙","←","←","↖","↖"];
  return arrows[Math.round(deg / 22.5) % 16];
};