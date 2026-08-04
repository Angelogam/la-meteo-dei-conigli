import type { Decollo } from "../data/decolli";

export type { Decollo };

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