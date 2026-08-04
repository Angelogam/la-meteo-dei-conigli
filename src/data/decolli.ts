import type { HourData } from "@/types/meteo";

export interface Decollo {
  id: string;
  name: string;
  valle: string;
  quota: number;
  direzione: string;
  lat: number;
  lon: number;
  exposure: string;
  altitude: number;
}

export const DECOLLI: Decollo[] = [
  {
    id: "pian-mune-bric-lombatera",
    name: "Pian Munè - Bric Lombatera",
    valle: "Valle di Muggio",
    quota: 1200,
    direzione: "S",
    lat: 44.3,
    lon: 7.2,
    exposure: "S",
    altitude: 1200,
  },
  {
    id: "colle-delleigne",
    name: "Colle Delleigne",
    valle: "Valle di Muggio",
    quota: 1400,
    direzione: "S",
    lat: 44.4,
    lon: 7.3,
    exposure: "S",
    altitude: 1400,
  },
];