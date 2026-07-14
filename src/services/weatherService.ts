// NELLA fetchWeather, aggiungi queste righe DOPO il fetch:
const raw: any = await res.json();
console.log("=== PARAMETRI RICEVUTI DA OPEN-METEO ===");
console.log("Chiavi hourly:", Object.keys(raw.hourly));
console.log("Chiavi daily:", Object.keys(raw.daily));
console.log("Chiavi current:", Object.keys(raw.current || {}));