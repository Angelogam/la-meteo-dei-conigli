// Trova questa riga in Index.tsx (TermicheTab) e cambiala da:
// site={{ alt: site.altitude, lat: site.lat, lon: site.lon }}
// a:
site={{ alt: site.altitude, lat: site.lat, lon: site.lon }}
// (è già corretta)

// Invece il problema è che all'interno di TermicheTab.tsx usiamo site.alt ma
// nella definizione dell'interfaccia TermicheTabProps site è definito come:
// site: { alt: number; lat?: number; lon?: number }
// Quindi alt c'è, altitude no.