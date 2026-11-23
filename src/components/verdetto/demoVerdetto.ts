// Fixture per la preview di sviluppo (`/dev/pilot-brain`) e per i test futuri.
// I valori sono coerenti con la Knowledge Base di Montoso (regola R2):
// GO-01 (vento in faccia), BRF-01 (fasi della facciata), BRF-02 (attivazione
// termica), ABT-03 (lenticolari = foehn in vista), ABT-09 (base/selle e cross),
// LAND-07 (finali e vento a terra), SEG-01 (impulsi a scatti = raffiche),
// TRAP-04 (calma secca = preavviso foehn), TRAP-01 (foehn dai passi).
//
// NON sono dati reali: la dashboard usa calcolaVerdettoInterim sui dati
// Open-Meteo reali; queste fixture servono solo alla rotta di preview DEV.

import type { PilotBrainVerdetto } from "./types";

export const demoVerdettoGO: PilotBrainVerdetto = {
  sito: "Montoso",
  esito: "GO",
  indice: 7.2,
  unaRiga: "Vento in faccia 8 km/h, regolare. Fase di lavoro aperta fino alle 13:00.",
  aggiornatoAlle: "12:35",
  etaMinuti: 5,
  fonte: "REALE",
  decollo: {
    slot: "11:00 – 13:00",
    fase: "Fase di lavoro",
    piccoVietato: "13:30–15:00",
    idKB: "BRF-01",
    stato: "DERIVATO",
  },
  discesa: {
    turnaround: "14:00",
    ombra: "17:40",
    grillettiAttivi: 2,
    idKB: "LAND-07",
    stato: "DERIVATO",
  },
  cross: {
    traversabile: true,
    testo: "SÌ, CON MARGINE",
    dettaglio: "Base 2400 m vs selle 1600 m · ABT-09 ok",
    idKB: "ABT-09",
    stato: "DERIVATO",
  },
  motivi: [
    {
      area: "vento",
      tono: "favorevole",
      frase: "Vento in faccia 8 km/h, regolare.",
      dati: "8 km/h · raffiche 12 · direzione SSO",
      stato: "REALE",
      idKB: "GO-01",
    },
    {
      area: "termiche",
      tono: "favorevole",
      frase: "Termico già attivo: 1,6 m/s medio.",
      dati: "rateo 1,6 m/s · base nubi 2400 m · top 3000 m",
      stato: "DERIVATO",
      idKB: "BRF-02",
    },
    {
      area: "finestra",
      tono: "attenzione",
      frase: "Fase di lavoro fino alle 13:00.",
      dati: "lavoro 11:00–13:00 · picco vietato 13:30–15:00",
      stato: "DERIVATO",
      idKB: "BRF-01",
    },
    {
      area: "sicurezza",
      tono: "attenzione",
      frase: "Nessun veto attivo.",
      dati: "al passo da verificare: lenticolari · scarto 4 km/h",
      stato: "DA VERIFICARE",
      idKB: "ABT-03",
    },
    {
      area: "atterraggio",
      tono: "attenzione",
      frase: "Grilletti fissati: turnaround 14:00.",
      dati: "2 grilletti attivi · ombra in valle 17:40",
      stato: "DERIVATO",
      idKB: "LAND-07",
    },
  ],
  noteAgenti: [
    { agente: "Safety", tono: "attenzione", testo: "ABT-03 da verificare al passo: lenticolari." },
    { agente: "Montoso", tono: "favorevole", testo: "Fase di lavoro fino alle 13:00. Turnaround 14:00." },
    { agente: "XC", tono: "favorevole", testo: "Base sopra le selle: traversata valutabile." },
  ],
};

export const demoVerdettoAttesa: PilotBrainVerdetto = {
  sito: "Montoso",
  esito: "ATTESA",
  indice: null,
  unaRiga: "Critici verdi, ma il termico non regge ancora: valutazione alle 13:00.",
  aggiornatoAlle: "09:05",
  etaMinuti: 4,
  fonte: "REALE",
  decollo: {
    slot: "IN APERTURA · VAL. 13:00",
    fase: "Sveglia: la facciata si attiva verso le 10:00",
    piccoVietato: "13:30–15:00",
    idKB: "BRF-01",
    stato: "DERIVATO",
  },
  discesa: {
    turnaround: "14:00",
    ombra: "17:40",
    grillettiAttivi: 0,
    idKB: "LAND-07",
    stato: "DERIVATO",
  },
  cross: {
    traversabile: null,
    testo: "ANCORA NO",
    dettaglio: "Base nubi 1900 m: sotto le selle (ABT-09)",
    idKB: "ABT-09",
    stato: "DERIVATO",
  },
  motivi: [
    {
      area: "vento",
      tono: "favorevole",
      frase: "Vento in faccia 6 km/h, stabile.",
      dati: "6 km/h · raffiche 9 · direzione SSO",
      stato: "REALE",
      idKB: "GO-01",
    },
    {
      area: "termiche",
      tono: "attenzione",
      frase: "Rateo sotto la soglia di lancio.",
      dati: "rateo 0,8 m/s · base nubi 1900 m",
      stato: "DERIVATO",
      idKB: "BRF-02",
    },
    {
      area: "finestra",
      tono: "attenzione",
      frase: "Sveglia in corso: il versante non lavora ancora.",
      dati: "attivazione attesa verso le 10:00",
      stato: "DERIVATO",
      idKB: "BRF-01",
    },
    {
      area: "sicurezza",
      tono: "attenzione",
      frase: "Nessun veto. Calma secca da monitorare.",
      dati: "calma totale + aria secca = preavviso foehn",
      stato: "DA VERIFICARE",
      idKB: "TRAP-04",
    },
  ],
  noteAgenti: [
    { agente: "Safety", tono: "attenzione", testo: "Calma secca: monitorare TRAP-04 prima del lancio." },
    { agente: "Pilot", tono: "attenzione", testo: "Prepara l'attrezzatura: valutazione alle 13:00." },
  ],
};

export const demoVerdettoNoGo: PilotBrainVerdetto = {
  sito: "Montoso",
  esito: "NO-GO",
  indice: 3.1,
  unaRiga: "Impulsi a scatti e lenticolari al passo: veto attivo, finestra in chiusura.",
  aggiornatoAlle: "12:10",
  etaMinuti: 45,
  fonte: "REALE",
  decollo: {
    slot: "CHIUSO",
    fase: "Picco termico: impulsi a scatti",
    piccoVietato: "13:30–15:00",
    idKB: "SEG-01",
    stato: "REALE",
  },
  discesa: {
    turnaround: "14:00",
    ombra: "17:40",
    grillettiAttivi: 2,
    idKB: "LAND-07",
    stato: "DERIVATO",
  },
  cross: {
    traversabile: false,
    testo: "NO",
    dettaglio: "Valichi innuvolati: base al livello delle selle (ABT-09)",
    idKB: "ABT-09",
    stato: "REALE",
  },
  motivi: [
    {
      area: "vento",
      tono: "critico",
      frase: "Impulsi a scatti: raffiche in arrivo.",
      dati: "raffiche 26 km/h · scarto 11 km/h · finestra in chiusura",
      stato: "REALE",
      idKB: "SEG-01",
    },
    {
      area: "sicurezza",
      tono: "critico",
      frase: "Lenticolari sui crinali dei passi: foehn in vista.",
      dati: "veto ABT-03 confermato dall'osservazione",
      stato: "REALE",
      idKB: "ABT-03",
    },
    {
      area: "vento",
      tono: "critico",
      frase: "Vento che scende dai passi oltre la catena.",
      dati: "da calma a 40-60 km/h in pochi minuti, senza preavviso",
      stato: "DA VERIFICARE",
      idKB: "TRAP-01",
    },
    {
      area: "atterraggio",
      tono: "attenzione",
      frase: "Atterraggio che si chiude col picco termico.",
      dati: "scarto raddoppiato · turnaround 14:00 confermato",
      stato: "DERIVATO",
      idKB: "TRAP-03",
    },
  ],
  noteAgenti: [
    { agente: "Safety", tono: "critico", testo: "Veto attivo: SEG-01 e ABT-03 confermati." },
    { agente: "Montoso", tono: "attenzione", testo: "Rientro consigliato prima del picco di impulsi." },
  ],
};

export const demoVerdetti = {
  GO: demoVerdettoGO,
  ATTESA: demoVerdettoAttesa,
  "NO-GO": demoVerdettoNoGo,
} as const;
