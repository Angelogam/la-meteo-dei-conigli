// Trova dove viene chiamato calcolaTermiche, riga ~69
// Deve essere qualcosa tipo:
const t = calcolaTermiche(weather, site.alt);

// Cambia in:
const alt = site?.alt ?? 1000; // fallback sicuro
const t = calcolaTermiche(weather, alt);