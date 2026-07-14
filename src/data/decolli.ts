"use client";

export interface Decollo {
  id: string;
  name: string;
  valley: string;
  altitude: number;
  exposure: string;
  lat: number;
  lon: number;
  description: string;
}

export const decolli: Decollo[] = [
  {
    id: "pedona",
    name: "Pedona",
    valley: "Valle Ellero",
    altitude: 1486,
    exposure: "S / SE",
    lat: 44.2028,
    lon: 7.7211,
    description: "Decollo panoramico con prato ampio, ideale per voli termici. Parcheggio vicino al decollo."
  },
  {
    id: "cravanzana",
    name: "Cravanzana",
    valley: "Valle Belbo",
    altitude: 1250,
    exposure: "S / SE / SW",
    lat: 44.5725,
    lon: 8.1199,
    description: "Decollo su prato con pendenza regolare. Vista sulla Langa astigiana."
  },
  {
    id: "montaldo",
    name: "Montaldo",
    valley: "Valle Belbo",
    altitude: 1080,
    exposure: "S",
    lat: 44.5856,
    lon: 8.1025,
    description: "Decollo tecnico su prato. Richiede esperienza per termiche impegnative."
  },
  {
    id: "monasterolo",
    name: "Monasterolo",
    valley: "Valle Grana",
    altitude: 1100,
    exposure: "S / SE",
    lat: 44.3272,
    lon: 7.4090,
    description: "Decollo su prato ben tenuto. Adatto anche a piloti intermedi."
  },
  {
    id: "boves",
    name: "Boves",
    valley: "Valle Colla",
    altitude: 1005,
    exposure: "S / SE",
    lat: 44.3072,
    lon: 7.5375,
    description: "Decollo su prato con ottima vista sulle Alpi Marittime."
  },
  {
    id: "sanecarlo",
    name: "San Carlo",
    valley: "Valle Grana",
    altitude: 1320,
    exposure: "S / SE",
    lat: 44.3103,
    lon: 7.3642,
    description: "Decollo panoramico, prato ampio e parcheggio comodo."
  },
  {
    id: "buriasco",
    name: "Buriasco",
    valley: "Pianura Pinerolese",
    altitude: 350,
    exposure: "Variabile",
    lat: 44.874,
    lon: 7.412,
    description: "Decollo da pianura per voli termici e training."
  },
  {
    id: "balma",
    name: "Balma",
    valley: "Valle Ellero",
    altitude: 1510,
    exposure: "S / SE",
    lat: 44.1956,
    lon: 7.7144,
    description: "Decollo tecnico su prato ripido, piloti esperti consigliati."
  }
];