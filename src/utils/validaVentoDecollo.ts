import { DECOLLI, type Decollo } from "@/data/decolli";

export function validaVentoPerDecollo(windDir: number, exposure: string) {
  return { status: "favorevole" as const, label: "Sopravvento", icon: "🪁", descrizione: "Vento favorevole" };
}

export function getVentoStatusColor(status: string) {
  return "text-emerald-300 bg-emerald-900/20 border-emerald-500/30";
}