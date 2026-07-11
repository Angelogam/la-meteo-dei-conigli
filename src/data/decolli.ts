"use client";

export interface Decollo {
  id: string;
  name: string;
  lat: number;
  lon: number;
  exposure: string;
  valley: string;
  difficulty: number;
  altitude: number;
}

export const DECOLLI: Decollo[] = [
  { id: "malanotte", name: "Malanotte", lat: 44.258745, lon: 7.794304, exposure: "S/SE", valley: "Val Maudagna", difficulty: 3, altitude: 1740 },
  { id: "colle_di_tenda", name: "Colle di Tenda", lat: 44.150940, lon: 7.569263, exposure: "S/SW", valley: "Val Vermenagna", difficulty: 2, altitude: 1870 },
  { id: "boves", name: "Boves", lat: 44.321137, lon: 7.544698, exposure: "N/NE", valley: "Cuneese", difficulty: 1, altitude: 900 },
  { id: "monte_male", name: "Monte Male – Dronero", lat: 44.431631, lon: 7.362887, exposure: "S/SW", valley: "Bassa Val Maira", difficulty: 3, altitude: 1200 },
  { id: "iretta", name: "Iretta", lat: 44.498937, lon: 7.382037, exposure: "S", valley: "Val Maira", difficulty: 2, altitude: 1100 },
  { id: "val_mala", name: "Pratoni di Val Mala", lat: 44.507801, lon: 7.346619, exposure: "S", valley: "Val Maira", difficulty: 2, altitude: 1380 },
  { id: "birrone", name: "Monte Birrone", lat: 44.539893, lon: 7.252939, exposure: "S/SE", valley: "Alta Val Maira", difficulty: 4, altitude: 2130 },
  { id: "agnello", name: "Colle dell'Agnello", lat: 44.682826, lon: 6.978201, exposure: "S/SW", valley: "Alta Val Varaita", difficulty: 5, altitude: 2740 },
  { id: "pian_mune_alto", name: "Pian Munè – Seggiovia", lat: 44.638610, lon: 7.230889, exposure: "S/SE", valley: "Val Po", difficulty: 2, altitude: 1870 },
  { id: "pian_mune_basso", name: "Pian Munè – Bric Lombatera", lat: 44.657365, lon: 7.260017, exposure: "S/SE", valley: "Val Po", difficulty: 1, altitude: 1380 },
  { id: "martiniana_po", name: "Martiniana Po", lat: 44.606953, lon: 7.383226, exposure: "E/NE", valley: "Val Po", difficulty: 1, altitude: 1400 },
  { id: "rucas_alto", name: "Rucas alto", lat: 44.742139, lon: 7.220118, exposure: "S/SE", valley: "Valle Infernotto", difficulty: 2, altitude: 1540 },
  { id: "montoso_basso", name: "Montoso – decollo basso", lat: 44.764372, lon: 7.249758, exposure: "E/SE", valley: "Valle Infernotto", difficulty: 1, altitude: 1230 },
  { id: "vandalino", name: "Monte Vandalino", lat: 44.836712, lon: 7.173867, exposure: "S/SE", valley: "Val Pellice", difficulty: 4, altitude: 2120 },
  { id: "pian_dell_alpe", name: "Pian dell'Alpe", lat: 45.063962, lon: 7.028267, exposure: "S/SW", valley: "Val Chisone", difficulty: 3, altitude: 1900 },
  { id: "roletto", name: "Roletto – Piggi", lat: 44.932493, lon: 7.310959, exposure: "S/SW", valley: "Pinerolese", difficulty: 1, altitude: 810 },
  { id: "piossasco", name: "Piossasco – Monte S. Giorgio", lat: 44.996718, lon: 7.448002, exposure: "S/SW", valley: "Collina Torinese", difficulty: 1, altitude: 840 },
  { id: "truccetti", name: "Truccetti", lat: 45.079735, lon: 7.342018, exposure: "S/SE", valley: "Val Sangone", difficulty: 1, altitude: 950 },
  { id: "val_della_torre", name: "Val della Torre", lat: 45.162627, lon: 7.463716, exposure: "S/SE", valley: "Val della Torre", difficulty: 1, altitude: 1080 },
  { id: "rocca_canavese", name: "Rocca Canavese – M. della Neve", lat: 45.327578, lon: 7.572794, exposure: "S/SW", valley: "Canavese", difficulty: 2, altitude: 910 },
  { id: "s_elisabetta", name: "Santa Elisabetta", lat: 45.418273, lon: 7.641945, exposure: "S/SE", valley: "Canavese", difficulty: 1, altitude: 1200 },
  { id: "s_elisabetta_alto", name: "Santa Elisabetta alto", lat: 45.440194, lon: 7.648026, exposure: "S/SE", valley: "Canavese", difficulty: 2, altitude: 1420 },
  { id: "cavallaria", name: "Monte Cavallaria", lat: 45.517294, lon: 7.798808, exposure: "S/SE", valley: "Canavese", difficulty: 2, altitude: 1450 },
  { id: "andrate", name: "Andrate", lat: 45.550639, lon: 7.880776, exposure: "S/SW", valley: "Canavese", difficulty: 1, altitude: 840 },
];