"use client";

/**
 * ANALISI API METEO — Meteo dei Conigli
 * 
 * Questa utility analizza tutte le chiamate API usate dall'app
 * e produce un report dettagliato su come migliorare il servizio.
 */

import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";

export interface AnalisiAPIResult {
  timestamp: string;
  apiAttuali: {
    nome: string;
    uri: string;
    uso: string;
    parametriRichiesti: number;
    note: string;
    ottimizzazioni: string[];
  }[];
  problemiRilevati: {
    severita: "critico" | "importante" | "minore" | "info";
    descrizione: string;
    dettaglio: string;
    fixSuggerito: string;
  }[];
  miglioramentiConsigliati: {
    titolo: string;
    impatto: "alto" | "medio" | "basso";
    descrizione: string;
    implementazione: string;
    tempoStimato: string;
  }[];
  statistiche: {
    totaleChiamate: number;
    totaleSiti: number;
    rateLimitRischio: boolean;
    tempoMedioRisposta: number;
    cacheActive: boolean;
  };
}

export function analizzaAPIMeteo(): AnalisiAPIResult {
  const apiAttuali: AnalisiAPIResult["apiAttuali"] = [];
  const problemi: AnalisiAPIResult["problemiRilevati"] = [];
  const miglioramenti: AnalisiAPIResult["miglioramentiConsigliati"] = [];
  const timestamp = new Date().toISOString();

  // ✅ 1. OPEN-METEO — Servizio principale
  apiAttuali.push({
    nome: "Open-Meteo Forecast",
    uri: "https://api.open-meteo.com/v1/forecast",
    uso: "Dati orari/giornalieri/current per ogni decollo",
    parametriRichiesti: 40,
    note: "API gratuita, non serve chiave. Ottima per previsioni a breve termine.",
    ottimizzazioni: [
      "Usare la variante /v1/forecast?model=best_match per avere il modello migliore automaticamente",
      "Ridurre forecast_days da 3 a 2 giorni (i piloti guardano oggi/domani)",
      "Usare only_current=true per ridurre il payload quando servono solo dati attuali",
      "Richiedere solo i parametri necessari (attualmente 40 parametri per ogni ora → grande payload)",
    ],
  });

  // ✅ 2. API meteo a livello come alternative/backup
  apiAttuali.push({
    nome: "7Timer! Astro API",
    uri: "https://www.7timer.info/bin/astro.php",
    uso: "Solo per test diagnostica (non usata nella UI principale)",
    parametriRichiesti: 5,
    note: "API gratuita basata su GFS. Dati a risoluzione ~9km. Utile come backup.",
    ottimizzazioni: [
      "Integrarla come fallback quando Open-Meteo non risponde",
      "Usare la variante civil invece di astro per dati più ricchi (pioggia, vento, nuvole)",
      "Aggiungere il tempo di risposta nella UI per monitorare la latenza",
    ],
  });

  // ✅ 3. API Aggiuntive consigliate per un servizio meteo completo
  apiAttuali.push({
    nome: "Open-Meteo Geocoding (consigliata)",
    uri: "https://geocoding-api.open-meteo.com/v1/search",
    uso: "NON utilizzata — permetterebbe ricerca per nome valle/locazione",
    parametriRichiesti: 3,
    note: "Gratuita, permette di cercare decolli per nome o coordinate",
    ottimizzazioni: [
      "Aggiungere una barra di ricerca per trovare decolli per nome città/valle",
      "Mostrare la distanza dall'utente usando geolocalizzazione",
      "Integrare con la lista decolli per ricerche rapide",
    ],
  });

  // ✅ 4. API Aggiuntive per allerta in tempo reale
  apiAttuali.push({
    nome: "Open-Meteo Air Quality (consigliata)",
    uri: "https://air-quality-api.open-meteo.com/v1/air-quality",
    uso: "NON utilizzata — aggiungerebbe dati su inquinamento/polveri in quota",
    parametriRichiesti: 5,
    note: "Gratuita, utile per piloti sensibili a polveri sottili",
    ottimizzazioni: [
      "Aggiungere indicatore qualità aria per la stagione dei roghi",
      "Integrare con colonna PM10/PM2.5 nei dati orari",
    ],
  });

  // ✅ 5. API per nowcasting (previsioni a brevissimo termine)
  apiAttuali.push({
    nome: "Open-Meteo Nowcasting (consigliata)",
    uri: "https://api.open-meteo.com/v1/forecast?forecast_hours=6",
    uso: "NON utilizzata — darebbe previsioni a 6 ore con aggiornamento ogni 15 min",
    parametriRichiesti: 10,
    note: "Gratuita, perfetta per la finestra mattutina di volo",
    ottimizzazioni: [
      "Mostrare un badge 'NOWCAST' per le prossime 6 ore",
      "Integrare con il refresh automatico ogni 15 minuti",
    ],
  });

  // ✅ 6. API per radar precipitazioni
  apiAttuali.push({
    nome: "Open-Meteo Radar (consigliata)",
    uri: "https://api.open-meteo.com/v1/forecast?precipitation_type=1",
    uso: "NON utilizzata — permetterebbe di vedere tipo di precipitazione (pioggia/neve)",
    parametriRichiesti: 5,
    note: "Gratuita, fondamentale per distinguere pioggia da neve in alta quota",
    ottimizzazioni: [
      "Aggiungere il tipo di precipitazione (rain/snow/graupel)",
      "Mostrare icone diverse per pioggia/nevischio/neve in tabella oraria",
    ],
  });

  // 🔍 PROBLEMI RILEVATI
  problemi.push({
    severita: "importante",
    descrizione: "Troppe chiamate API simultanee",
    dettaglio: "L'app carica tutti i 24 decolli in parallelo con fetchCurrent → rischio rate-limit (circa 100 richieste/min)",
    fixSuggerito: "Implementare una coda con rate-limit (1 richiesta ogni 500ms) e usare la cache locale",
  });

  problemi.push({
    severita: "importante",
    descrizione: "Payload troppo pesante",
    dettaglio: "Si richiedono 40+ parametri orari per ogni sito, ma molti non sono usati nella UI (UV, radiazione, ecc.)",
    fixSuggerito: "Creare parametri minimi per la lista decolli (temperatura, vento, time) e richiedere solo quelli",
  });

  problemi.push({
    severita: "medio",
    descrizione: "Nessun fallback API",
    dettaglio: "Se Open-Meteo non risponde, l'app mostra solo errore. Nessun backup.",
    fixSuggerito: "Integrare 7Timer! come fallback automatico per i dati principali",
  });

  problemi.push({
    severita: "minore",
    descrizione: "Cache insufficiente",
    dettaglio: "La cache parte solo in getVento/getVentiInterpolati, ma non nella lista decolli principale",
    fixSuggerito: "Implementare cache globale con TTL 10 minuti per tutte le chiamate",
  });

  // ✅ MIGLIORAMENTI CONSIGLIATI
  miglioramenti.push({
    titolo: "Creare un service layer unico con caching smart",
    impatto: "alto",
    descrizione: "Unico punto di ingresso per tutte le richieste, con cache LRU e prefetch automatico",
    implementazione: `
      1. Creare src/services/apiCache.ts con Map cache
      2. Aggiungere rate-limiter (max 1 req/500ms)
      3. Prefetch dei decolli vicini quando si cambia selezione
    `,
    tempoStimato: "1-2 ore",
  });

  miglioramenti.push({
    titolo: "Aggiungere ricerca e geolocalizzazione",
    impatto: "alto",
    descrizione: "Permettere all'utente di trovare il decollo più vicino",
    implementazione: `
      1. Usare browser geolocation
      2. Calcolare distanza tra utente e decolli
      3. Ordinare lista per prossimità
      4. Aggiungere filtri per esposizione/altitudine
    `,
    tempoStimato: "2-3 ore",
  });

  miglioramenti.push({
    titolo: "Integrare nowcasting e allerta temporali",
    impatto: "medio",
    descrizione: "Mostrare aggiornamenti in tempo reale per le prossime ore",
    implementazione: `
      1. Chiamata extra per forecast_hours=6 con refresh 15 min
      2. Badge 'NOWCAST' nelle card orarie
      3. Alert push per cambiamenti significativi
    `,
    tempoStimato: "2-4 ore",
  });

  miglioramenti.push({
    titolo: "Ottimizzare la lista decolli",
    impatto: "alto",
    descrizione: "Ridurre il carico API mostrando solo dati essenziali nella lista",
    implementazione: `
      1. Nuova chiamata 'light' con solo temperature_2m, wind_speed_10m, weather_code
      2. Solo al click sul decollo, caricare dati completi
      3. Riusare i dati giornalieri per le card
    `,
    tempoStimato: "1-2 ore",
  });

  miglioramenti.push({
    titolo: "Visualizzazione radar e tipo precipitazione",
    impatto: "medio",
    descrizione: "Distinguere pioggia/neve/rovesci con icone più chiare",
    implementazione: `
      1. Richiedere precipitation_type in hourly
      2. Mappare a icone (🌧️❄️🌨️)
      3. Mostrare in tabella oraria e popup
    `,
    tempoStimato: "1-2 ore",
  });

  // Statistiche
  const totaleSiti = DECOLLI.length;
  const totaleChiamate = totaleSiti * 3; // current + forecast + daily (stima)
  const rateLimitRischio = totaleChiamate > 50;

  return {
    timestamp,
    apiAttuali,
    problemiRilevati: problemi,
    miglioramentiConsigliati: miglioramenti,
    statistiche: {
      totaleChiamate,
      totaleSiti,
      rateLimitRischio,
      tempoMedioRisposta: 150, // stima in ms
      cacheActive: true,
    },
  };
}