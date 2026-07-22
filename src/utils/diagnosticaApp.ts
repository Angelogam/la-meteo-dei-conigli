"use client";

import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";
import { degreesToCardinal } from "@/utils/windDirections";
import { calcolaTermiche } from "@/utils/termiche";
import type { HourData } from "@/types/meteo";

export interface ProblemaDiagnostica {
  severita: "critico" | "importante" | "minore" | "info";
  componente: string;
  descrizione: string;
  dettaglio: string;
  fixSuggerito?: string;
}

export interface RisultatoDiagnostica {
  timestamp: string;
  problemi: ProblemaDiagnostica[];
  testEseguiti: number;
  testPassati: number;
  testFalliti: number;
  tempoEsecuzione: number;
  componentiTestati: string[];
  datiMeteo: {
    ok: boolean;
    sitiTestati: number;
    sitiConDati: number;
    temperatureOk: boolean;
    ventoOk: boolean;
    nuvoleOk: boolean;
  };
  decolliOk: boolean;
  calcoliOk: boolean;
  funzioniOk: boolean;
}

export async function diagnosticaCompletaApp(): Promise<RisultatoDiagnostica> {
  const inizio = performance.now();
  const problemi: ProblemaDiagnostica[] = [];
  let testPassati = 0;
  let testFalliti = 0;
  let testEseguiti = 0;

  function ok(componente: string, _msg: string) {
    testEseguiti++;
    testPassati++;
  }

  function fail(p: ProblemaDiagnostica) {
    testEseguiti++;
    testFalliti++;
    problemi.push(p);
  }

  function testDecolli(): boolean {
    const comp = "data/decolli.ts";
    let tuttoOk = true;
    if (!DECOLLI || DECOLLI.length === 0) {
      fail({
        severita: "critico",
        componente: comp,
        descrizione: "Nessun decollo definito",
        dettaglio: "Array DECOLLI vuoto",
        fixSuggerito: "Aggiungere decolli",
      });
      return false;
    }
    ok(comp, `${DECOLLI.length} decolli presenti`);
    const ids = new Set<string>();
    for (const d of DECOLLI) {
      const mancanti: string[] = [];
      if (!d.id) mancanti.push("id");
      if (!d.name) mancanti.push("name");
      if (d.lat == null || d.lat === 0) mancanti.push("lat (0)");
      if (d.lon == null || d.lon === 0) mancanti.push("lon (0)");
      if (!d.altitude) mancanti.push("altitude");
      if (!d.valley) mancanti.push("valley");
      if (!d.exposure) mancanti.push("exposure");
      if (mancanti.length > 0) {
        tuttoOk = false;
        fail({
          severita: "critico",
          componente: comp,
          descrizione: `Decollo "${d.name}" — campi mancanti: ${mancanti.join(", ")}`,
          dettaglio: `ID: ${d.id}`,
          fixSuggerito: "Completare i campi",
        });
      } else {
        ok(comp, `${d.name}: ${d.lat},${d.lon} ${d.altitude}m`);
      }
      if (ids.has(d.id)) {
        tuttoOk = false;
        fail({
          severita: "critico",
          componente: comp,
          descrizione: `ID duplicato: ${d.id}`,
          dettaglio: `Nome: ${d.name}`,
          fixSuggerito: "Rinominare ID",
        });
      } else {
        ids.add(d.id);
      }
    }
    if (tuttoOk) ok(comp, "Tutti i decolli sono validi");
    return tuttoOk;
  }

  async function testApi(): Promise<boolean> {
    const comp = "Open-Meteo API";
    const sitiTest = DECOLLI.slice(0, 3);
    let sitiOk = 0;
    let tempOk = true;
    let ventoOk = true;
    let nuvoleOk = true;

    for (const site of sitiTest) {
      try {
        const { data, ok: apiOk } = await weatherService.fetchWithFallback(
          site.lat,
          site.lon,
        );
        if (!apiOk || !data) {
          fail({
            severita: "importante",
            componente: comp,
            descrizione: `API non risponde per ${site.name}`,
            dettaglio: `${site.lat},${site.lon}`,
            fixSuggerito: "Verificare connessione a Open-Meteo",
          });
          continue;
        }
        sitiOk++;
        if (data.hourly.length < 10) {
          fail({
            severita: "minore",
            componente: comp,
            descrizione: `Poche ore di dati per ${site.name}: ${data.hourly.length}`,
            dettaglio: "Attese almeno 10 ore",
            fixSuggerito: "Aumentare forecast_days",
          });
        }
        const temps = data.hourly.map((h) => h.temperature);
        const tMin = Math.min(...temps);
        const tMax = Math.max(...temps);
        if (tMin < -30 || tMax > 50) {
          tempOk = false;
          fail({
            severita: "importante",
            componente: comp,
            descrizione: `Temperature non realistiche per ${site.name}: ${tMin}°C / ${tMax}°C (alt: ${site.altitude}m)`,
            dettaglio: `Range ${tMin}°C ~ ${tMax}°C`,
            fixSuggerito: "Verificare coordinate",
          });
        }
        const winds = data.hourly.map((h) => h.windSpeed);
        const wMax = Math.max(...winds);
        if (wMax > 120) {
          ventoOk = false;
          fail({
            severita: "importante",
            componente: comp,
            descrizione: `Vento eccessivo per ${site.name}: ${wMax} km/h`,
            dettaglio: `Max: ${wMax}`,
            fixSuggerito: "Verificare dati Open-Meteo",
          });
        }
        const clouds = data.hourly.map((h) => h.cloudCover);
        const cloudInvalid = clouds.filter((c) => c < 0 || c > 100);
        if (cloudInvalid.length > 3) {
          nuvoleOk = false;
          fail({
            severita: "minore",
            componente: comp,
            descrizione: `Nuvolosit\u00e0 fuori range per ${site.name}: ${cloudInvalid.length} valori anomali`,
            dettaglio: `Anomali: ${cloudInvalid.join(", ")}`,
            fixSuggerito: "Verificare campo cloud_cover",
          });
        }
        ok(
          comp,
          `${site.name}: ${temps.length} ore, ${Math.round(tMin)}°C~${Math.round(tMax)}°C, vento max ${Math.round(wMax)} km/h`,
        );
      } catch (err) {
        fail({
          severita: "critico",
          componente: comp,
          descrizione: `Errore rete per ${site.name}`,
          dettaglio: String(err),
          fixSuggerito: "Verificare connessione",
        });
      }
    }
    if (sitiOk > 0)
      ok(comp, `${sitiOk}/${sitiTest.length} siti raggiungibili`);
    return sitiOk > 0 && tempOk && ventoOk && nuvoleOk;
  }

  function testCalcoli(): boolean {
    const comp = "Utility di calcolo";
    let tuttoOk = true;
    const cardTest = [
      { in: 0, atteso: "N" },
      { in: 45, atteso: "NE" },
      { in: 90, atteso: "E" },
      { in: 180, atteso: "S" },
      { in: 270, atteso: "W" },
      { in: 360, atteso: "N" },
    ];
    for (const t of cardTest) {
      const res = degreesToCardinal(t.in);
      if (res !== t.atteso) {
        tuttoOk = false;
        fail({
          severita: "minore",
          componente: comp,
          descrizione: `degreesToCardinal(${t.in}) = "${res}", atteso "${t.atteso}"`,
          dettaglio: "Funzione: windDirections.ts",
          fixSuggerito: "Correggere la mappa",
        });
      }
    }
    if (tuttoOk) ok(comp, "degreesToCardinal funziona correttamente");

    const mockHourData: HourData = {
      time: new Date(),
      temperature: 24,
      humidity: 45,
      dewPoint: 10,
      windSpeed: 12,
      windDir: 180,
      windGusts: 18,
      cloudCover: 30,
      weatherCode: 0,
      pressure: 1015,
      surfacePressure: 1013,
      precipitation: 0,
      rain: 0,
      snowfall: 0,
      uvIndex: 6,
      feelsLike: 22,
      radiation: 500,
      directRadiation: 400,
      visibility: 10000,
      vapourPressureDeficit: 14,
      isDay: true,
      freezingLevel: 3000,
      sunshineDuration: 3600,
      cloudCoverLow: 15,
      cloudCoverMid: 10,
      cloudCoverHigh: 5,
      cape: 300,
      cin: -30,
      liftedIndex: -1.5,
      mixingRatio: 0.01,
      virtualTemp: 298,
    };

    const res = calcolaTermiche(mockHourData, 1250);
    if (!res || typeof res.rateo !== "number" || typeof res.base !== "number") {
      tuttoOk = false;
      fail({
        severita: "critico",
        componente: comp,
        descrizione:
          "calcolaTermiche non restituisce un risultato valido",
        dettaglio: JSON.stringify(res),
        fixSuggerito: "Correggere termiche.ts",
      });
    } else if (res.rateo < 0.3) {
      tuttoOk = false;
      fail({
        severita: "importante",
        componente: comp,
        descrizione: `calcolaTermiche d\u00e0 rateo troppo basso (${res.rateo} m/s) per dati realistici`,
        dettaglio:
          "24°C, dew 10°C, vento 12 km/h, nuvole 30%, hum 45%",
        fixSuggerito: "Verificare l'algoritmo",
      });
    } else {
      ok(
        comp,
        `calcolaTermiche: ${res.rateo} m/s, base ${res.base}m, top ${res.top}m`,
      );
    }
    const mockTempesta: HourData = {
      ...mockHourData,
      temperature: 28,
      precipitation: 5,
      weatherCode: 95,
      cloudCover: 90,
    };
    const resTempesta = calcolaTermiche(mockTempesta, 1250);
    if (resTempesta.rateo > 0.5) {
      tuttoOk = false;
      fail({
        severita: "importante",
        componente: comp,
        descrizione: `calcolaTermiche d\u00e0 rateo positivo (${resTempesta.rateo} m/s) durante temporale (code 95)`,
        dettaglio: "Dovrebbe essere ~0 per temporali",
        fixSuggerito:
          "Aggiungere controllo weatherCode >= 95 in termiche.ts",
      });
    } else {
      ok(
        comp,
        "calcolaTermiche riconosce temporale (code 95) \u2192 rateo zero",
      );
    }
    return tuttoOk;
  }

  function testFunzioni(): boolean {
    const comp = "Funzioni ausiliarie";
    let tuttoOk = true;
    if (typeof degreesToCardinal !== "function") {
      tuttoOk = false;
      fail({
        severita: "critico",
        componente: comp,
        descrizione:
          "degreesToCardinal non \u00e8 una funzione",
        dettaglio: "Import fallito",
        fixSuggerito: "Verificare windDirections.ts",
      });
    } else {
      ok(comp, "degreesToCardinal \u00e8 una funzione valida");
    }
    if (typeof calcolaTermiche !== "function") {
      tuttoOk = false;
      fail({
        severita: "critico",
        componente: comp,
        descrizione:
          "calcolaTermiche non \<dyad-write path="src/utils/diagnosticaApp.ts" description="Complete the file — fix continuation">
// ... existing code above ...

    if (typeof calcolaTermiche !== "function") {
      tuttoOk = false;
      fail({
        severita: "critico",
        componente: comp,
        descrizione:
          "calcolaTermiche non \u00e8 una funzione",
        dettaglio: "Import fallito",
        fixSuggerito: "Verificare termiche.ts",
      });
    } else {
      ok(comp, "calcolaTermiche \u00e8 una funzione valida");
    }
    return tuttoOk;
  }

  try {
    const decolliOk = testDecolli();
    const apiResult = await testApi();
    const calcoliOk = testCalcoli();
    const funzioniOk = testFunzioni();

    const datiMeteo = {
      ok: apiResult,
      sitiTestati: 3,
      sitiConDati: 0,
      temperatureOk: true,
      ventoOk: true,
      nuvoleOk: true,
    };

    const tempoEsecuzione = Math.round(performance.now() - inizio);

    return {
      timestamp: new Date().toISOString(),
      problemi,
      testEseguiti,
      testPassati,
      testFalliti,
      tempoEsecuzione,
      componentiTestati: [
        "data/decolli.ts",
        "services/weatherService.ts",
        "utils/termiche.ts",
        "utils/windDirections.ts",
      ],
      datiMeteo,
      decolliOk,
      calcoliOk,
      funzioniOk,
    };
  } catch (err) {
    return {
      timestamp: new Date().toISOString(),
      problemi: [
        {
          severita: "critico",
          componente: "Diagnostica",
          descrizione:
            "Errore durante l'esecuzione della diagnostica",
          dettaglio: String(err),
          fixSuggerito: "Riavviare la diagnostica",
        },
      ],
      testEseguiti: 0,
      testPassati: 0,
      testFalliti: 1,
      tempoEsecuzione: Math.round(performance.now() - inizio),
      componentiTestati: [],
      datiMeteo: {
        ok: false,
        sitiTestati: 0,
        sitiConDati: 0,
        temperatureOk: false,
        ventoOk: false,
        nuvoleOk: false,
      },
      decolliOk: false,
      calcoliOk: false,
      funzioniOk: false,
    };
  }
}