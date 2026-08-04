export interface Decollo {
  id: string;
  nome: string;
  lat: number;
  lon: number;
  quota: number;
  valley: string;
  esposizione: string;
}

export const DECOLLI_DEFAULT: Decollo[] = [
  {
    id: 'rucas',
    nome: 'Rucas',
    lat: 44.75,
    lon: 7.16,
    quota: 1550,
    valley: 'Val Pellice',
    esposizione: 'SE'
  },
  {
    id: 'pian_mune',
    nome: 'Pian Munè',
    lat: 44.65,
    lon: 7.12,
    quota: 1530,
    valley: 'Val Po',
    esposizione: 'E'
  }
];

export default DECOLLI_DEFAULT;
</arg_value>dyad-write>

Now I need to update the `src/data/decolli.ts` file to re-export from the types file:

<dyad-write path="src/data/decolli.ts">
import type { HourData } from "@/types/meteo";
import { Decollo, DECOLLI_DEFAULT } from "@/types/decolli";

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