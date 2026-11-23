"use client";

// ADATTATORE INTERIM: da qui nasce il Verdetto mostrato dal PilotBrainHero
// finché la fase F2 non attiva il Decision Engine isolato (decision-engine/).
//
// Regole rispettate:
// - R3 "unica fonte": NON introduce una nuova fonte di dati né un nuovo calcolo
//   parallelo — consuma le utility decisionali GIÀ usate dalla dashboard
//   (calcolaIndiceVolabilità + validaVentoPerDecollo) sui dati Open-Meteo
//   già scaricati da useWeatherData. Le soglie citate (raffiche 25 km/h,
//   scarto 12 km/h) sono quelle della Knowledge Base; F1/F2 le porteranno in
//   knowledge-base/soglie.json e questo file verrà sostituito dall'engine.
// - Onestà dei dati: ogni motivo dichiara REALE (osservazione del modello alla
//   corrente) o DERIVATO (stimato dal modello); gli id KB appaiono SOLO per i
//   siti coperti dalla KB (D3: verdetto citabile solo dove esiste KB).
// - Fallback: dati incompleti → ATTESA "dati insufficienti", mai un falso GO.

import { calcolaIndiceVolabilita } from "@/utils/indiceVolabilita";
import { validaVentoPerDecollo } from "@/utils/validaVentoDecollo";
import type { HourData } from "@/types/meteo";
import type { Esito, MotivoCardData, PilotBrainVerdetto, Tono } from "./types";

// Soglie della Knowledge Base (riportate come da KB; F1 le formalizza in soglie.json)
const SOGLIA_RAFFICHE_KMH = 25; // KB: raffiche_max
const SOGLIA_SCARTO_KMH = 12; // KB: scarto_max (raffica - vento medio)
const SOGLIA_ETA_MIN = 30; // oltre 30 min i dati sono vecchi (età → ambra)
const MARGINE_BASE_MIN_M = 300; // interim: margine base nubi sopra la quota decollo per il cross

const CODICI_TEMPORALE = [95, 96, 99]; // WMO: temporale con/senza grandine

const SETTORI = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];

function cardinale(gradi: number): string {
  return SETTORI[Math.round((((gradi % 360) + 360) % 360) / 22.5) % 16];
}

function hhmm(d: Date): string {
  return d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Estrae "HH:MM" da un ISO ("2026-11-23T16:45") o da un "HH:MM". */
function estraiHHMM(valore?: string | null): string | undefined {
  if (!valore) return undefined;
  return valore.includes("T") ? valore.slice(11, 16) : valore.slice(0, 5);
}

function hhmmMinus60(hhmmStr: string | undefined): string | undefined {
  if (!hhmmStr || !/^\d{2}:\d{2}$/.test(hhmmStr)) return undefined;
  const [h, m] = hhmmStr.split(":").map(Number);
  const d = new Date();
  d.setHours(Math.max(0, h), Math.max(0, m), 0, 0);
  d.setMinutes(d.getMinutes() - 60);
  return hhmm(d);
}

export interface InputVerdetto {
  siteName?: string;
  elevation?: number;
  orientation?: string;
  current: {
    temperature: number | null;
    dewPoint: number | null;
    cloudCover: number | null;
    precipitation: number | null;
    weatherCode: number | null;
    windSpeed: number | null;
    windDir: number | null;
    windGusts: number | null;
    cape: number | null;
    liftedIndex?: number | null;
  } | null;
  hourly: HourData[];
  sunset?: string | null;
  lastUpdate?: Date | null;
}

function verdettoDatiInsufficienti(input: InputVerdetto, ora: Date): PilotBrainVerdetto {
  return {
    sito: input.siteName ?? "Decollo",
    esito: "ATTESA",
    indice: null,
    unaRiga: "Dati meteo incompleti: il verdetto arriva col prossimo aggiornamento.",
    aggiornatoAlle: input.lastUpdate ? hhmm(input.lastUpdate) : hhmm(ora),
    etaMinuti: input.lastUpdate ? Math.round((ora.getTime() - input.lastUpdate.getTime()) / 60000) : SOGLIA_ETA_MIN + 1,
    fonte: "DA VERIFICARE",
    decollo: { slot: "In valutazione", fase: "In attesa di dati completi", stato: "DA VERIFICARE" },
    discesa: { turnaround: "—", ombra: estraiHHMM(input.sunset) ?? "—", grillettiAttivi: 0, stato: "DA VERIFICARE" },
    cross: { traversabile: null, testo: "ANCORA NO", dettaglio: "In attesa di dati completi", stato: "DA VERIFICARE" },
    motivi: [
      {
        area: "vento",
        tono: "attenzione",
        frase: "Vento o temperatura non disponibili.",
        dati: "attesa del prossimo ciclo di aggiornamento",
        stato: "DA VERIFICARE",
      },
    ],
  };
}

/** Finestra migliore: prima corsia di ≥2 ore consecutive "favorevoli" tra le 07 e le 20. */
function calcolaSlot(hourly: HourData[], orientation: string, ora: Date): { slot: string | null; da: number | null } {
  const oreBuone = new Set<number>();
  for (const h of hourly) {
    const oraH = h.time.getHours();
    if (oraH < 7 || oraH > 19) continue;
    if (h.windDir === null || h.windSpeed === null) continue;
    if (h.windGusts !== null && (h.windGusts > SOGLIA_RAFFICHE_KMH || h.windGusts - h.windSpeed > SOGLIA_SCARTO_KMH)) continue;
    if (validaVentoPerDecollo(h.windDir, orientation).status !== "favorevole") continue;
    oreBuone.add(oraH);
  }
  const oraCorrente = ora.getHours();
  for (let inizio = Math.max(7, oraCorrente); inizio <= 18; inizio++) {
    if (oreBuone.has(inizio) && oreBuone.has(inizio + 1)) {
      const fine = inizio + 2;
      return { slot: `${String(inizio).padStart(2, "0")}:00 – ${String(fine).padStart(2, "0")}:00`, da: inizio };
    }
  }
  return { slot: null, da: null };
}

export function calcolaVerdettoInterim(input: InputVerdetto): PilotBrainVerdetto {
  const ora = new Date();
  const { current, orientation = "", siteName = "Decollo", elevation = 0, hourly, sunset, lastUpdate } = input;

  if (!current || current.windSpeed === null || current.windDir === null || current.temperature === null) {
    return verdettoDatiInsufficienti(input, ora);
  }

  const etaMinuti = lastUpdate ? Math.round((ora.getTime() - lastUpdate.getTime()) / 60000) : SOGLIA_ETA_MIN + 1;
  const aggiornatoAlle = lastUpdate ? hhmm(lastUpdate) : hhmm(ora);

  // Utility decisionali ESISTENTI della dashboard (unica fonte, R3)
  const vol = calcolaIndiceVolabilita({
    windSpeed: current.windSpeed,
    windGusts: current.windGusts ?? undefined,
    windDir: current.windDir,
    esposizione: orientation,
    temperature: current.temperature,
    dewPoint: current.dewPoint ?? current.temperature - 8, // interim: stima se manca il punto di rugiada
    cloudCover: current.cloudCover ?? 50,
    precipitation: current.precipitation ?? 0,
    weatherCode: current.weatherCode ?? undefined,
    cape: current.cape ?? undefined,
    liftedIndex: current.liftedIndex ?? undefined,
    quota: elevation,
  });

  const vento = validaVentoPerDecollo(current.windDir, orientation);
  const raffiche = current.windGusts ?? current.windSpeed;
  const scarto = raffiche - current.windSpeed;
  const isMontoso = /montoso/i.test(siteName);

  // Esito: soglie KB (raffiche_max, scarto_max) + vento relativo all'esposizione
  const vetiAperti =
    raffiche > SOGLIA_RAFFICHE_KMH ||
    scarto > SOGLIA_SCARTO_KMH ||
    vento.status === "contrario" ||
    vento.status === "sottovento" ||
    vol.windRelativo === "di_coda" ||
    (current.weatherCode !== null && CODICI_TEMPORALE.includes(current.weatherCode));
  const esito: Esito = vetiAperti
    ? "NO-GO"
    : vento.status === "favorevole" && vol.indice <= 4
      ? "GO"
      : "ATTESA";

  // Risposta 2 — finestra migliore dal modello già in dashboard
  const { slot, da } = calcolaSlot(hourly, orientation, ora);
  const slotLabel = slot ?? (esito === "NO-GO" ? "FINESTRA NON FAVOREVOLE" : "Valutazione alle 13:00");
  const fase =
    isMontoso && da !== null && da >= 11 && da < 13
      ? "Fase di lavoro della facciata"
      : esito === "NO-GO"
        ? "Nessuna finestra favorevole al decollo"
        : "Slot migliore secondo il modello";

  // Risposta 3 — turnaround/ombra dal sole del giorno (interim; KB porta i valori fissi)
  const ombra = estraiHHMM(sunset) ?? "—";
  const turnaround = hhmmMinus60(ombra) ?? ombra;
  const grilletti = [
    raffiche > SOGLIA_RAFFICHE_KMH,
    scarto > SOGLIA_SCARTO_KMH,
    (current.precipitation ?? 0) > 0.5,
    current.weatherCode !== null && CODICI_TEMPORALE.includes(current.weatherCode),
  ].filter(Boolean).length;

  // Risposta 4 — margine base nubi vs quota decollo (valicabili, soglia KB 300 m)
  const margineBase = Math.round(vol.baseNubiM - elevation);
  const crossTraversabile = margineBase >= MARGINE_BASE_MIN_M ? true : margineBase > 0 ? null : false;
  const crossTesto = crossTraversabile === true ? "SÌ, CON MARGINE" : crossTraversabile === null ? "ANCORA NO · BASE BASSA" : "VALICHI CHIUSE";

  // Su questa linea l'utility restituisce GIÀ la scala pilota (10 = volo ideale,
  // 1 = pericoloso — "SCALA PILOTA unica in tutta l'app"): nessuna inversione.
  const indiceUX = vol.indice;

  const motivi: MotivoCardData[] = [
    {
      area: "vento",
      tono:
        vento.status === "favorevole" ? "favorevole" : vento.status === "laterale" ? "attenzione" : "critico",
      frase: `Vento ${vento.label.toLowerCase()} ${Math.round(current.windSpeed)} km/h da ${cardinale(current.windDir)}.`,
      dati: `${Math.round(current.windSpeed)} km/h · raffiche ${Math.round(raffiche)} · scarto ${Math.round(scarto)} km/h`,
      stato: "REALE",
    },
    {
      area: "termiche",
      tono: vol.rateoTermicoMs >= 1.5 ? "favorevole" : vol.rateoTermicoMs >= 0.8 ? "attenzione" : "critico",
      frase: `Rateo termico stimato ${vol.rateoTermicoMs.toFixed(1).replace(".", ",")} m/s.`,
      dati: `base nubi ${Math.round(vol.baseNubiM)} m · cape ${current.cape !== null ? Math.round(current.cape) + " J/kg" : "—"} · ${vol.label.toLowerCase()}`,
      stato: "DERIVATO",
    },
    {
      area: "sicurezza",
      tono:
        raffiche > SOGLIA_RAFFICHE_KMH || scarto > SOGLIA_SCARTO_KMH
          ? "critico"
          : raffiche > SOGLIA_RAFFICHE_KMH * 0.8
            ? "attenzione"
            : "favorevole",
      frase:
        raffiche > SOGLIA_RAFFICHE_KMH
          ? `Raffiche oltre il limite di ${SOGLIA_RAFFICHE_KMH} km/h: finestra in chiusura.`
          : scarto > SOGLIA_SCARTO_KMH
            ? `Scarto vento-raffica ${Math.round(scarto)} km/h oltre il limite.`
            : "Nessun veto: raffiche e scarto entro i limiti KB.",
      dati: `raffiche ${Math.round(raffiche)} km/h · scarto ${Math.round(scarto)} km/h · limite ${SOGLIA_RAFFICHE_KMH}`,
      stato: "REALE",
    },
    {
      area: "finestra",
      tono: slot ? "favorevole" : esito === "NO-GO" ? "critico" : "attenzione",
      frase: slot ? `Slot migliore: ${slot}.` : "Nessuna corsia di 2 ore favorevoli oggi.",
      dati: `finestra derivata dal modello Open-Meteo${isMontoso ? " · picco vietato 13:30–15:00" : ""}`,
      stato: "DERIVATO",
    },
    {
      area: "atterraggio",
      tono: grilletti > 0 ? "attenzione" : "favorevole",
      frase:
        grilletti > 0
          ? `${grilletti} ${grilletti === 1 ? "grilletto attivo" : "grilletti attivi"}: monitora l'atterraggio.`
          : "Nessun grilletto di atterraggio attivo.",
      dati: `ombra in valle ${ombra} · turnaround ${turnaround}`,
      stato: "DERIVATO",
    },
  ];

  const unaRiga = vetiAperti
    ? `${motivi.find((m) => m.tono === "critico")?.frase ?? "Veto attivo."}`
    : `Vento ${vento.label.toLowerCase()}, ${vol.label.toLowerCase()}. ${slot ? `Slot migliore ${slot}.` : "Nessuna finestra campata dal modello."}`;

  return {
    sito: siteName,
    esito,
    indice: indiceUX,
    unaRiga,
    aggiornatoAlle,
    etaMinuti,
    fonte: "REALE",
    decollo: {
      slot: slotLabel,
      fase,
      ...(isMontoso ? { piccoVietato: "13:30–15:00" as const } : {}),
      stato: "DERIVATO",
    },
    discesa: {
      turnaround,
      ombra,
      grillettiAttivi: grilletti,
      stato: "DERIVATO",
    },
    cross: {
      traversabile: crossTraversabile,
      testo: crossTesto,
      dettaglio: `Base nubi ${Math.round(vol.baseNubiM)} m vs decollo ${elevation} m · margine ${margineBase} m`,
      stato: "DERIVATO",
    },
    motivi,
  };
}

export type { Tono };
