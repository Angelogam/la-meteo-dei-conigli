/**
 * generateReportMeteo.ts — genera il report meteorologico strutturato.
 *
 * Il report è un CONSUMATORE dei dati: non calcola nulla di proprio,
 * usa solo i dati estratti da reportDataExtractor.ts.
 *
 * Architettura:
 *   reportTypes.ts          ← tipi, interfacce, helper fmt/deghi
 *   reportDataExtractor.ts  ← estrae e computa dati reali dal JSON API
 *   generateReportMeteo.ts  ← assembla paragrafi e score finale
 */

import type { ReportMeteoParams, GeneratedReport } from "./reportTypes";
import { extractWeatherData, identificaScenario } from "./reportDataExtractor";
import { fmt } from "./reportTypes";
import type { ScenarioMeteo } from "./reportTypes";

export type { GeneratedReport };
export { generaParagrafoTermico, generaParagrafoVento, generaParagrafoInstabilita, generaParagrafoStrategia, generaSegnaliPericolo, generaGiudizioFinale, computeScore, buildTestoCompleto };

// ─── COSTANTI DI SCENARIO ────────────────────────────────────────────────────

const CAPE_LABEL: Record<number, string> = {
  1500: "energia convettiva molto elevata",
  1000: "energia convettiva marcata",
  600:  "energia convettiva discreta",
  300:  "energia termica moderata",
};
function getCapeLabel(maxCape: number | null): string {
  if (maxCape == null) return "energia termica scarsa";
  const entries = Object.entries(CAPE_LABEL).map(([k, v]) => [Number(k), v] as [number, string]);
  const label = entries.find(([k]) => maxCape >= k);
  return label ? label[1] : "energia termica scarsa";
}

const SCENARIO_SCORE: Record<ScenarioMeteo, number> = {
  perfezionistico:   9,
  "termica-forte":   8,
  misto:             7,
  ventoso:           5,
  "stabile-coperto": 4,
  "debole-poco-termico": 4,
  pioggia:           2,
  "instabile-temporali": 3,
};

const SCENARIO_ORA_FINE: Record<ScenarioMeteo, string> = {
  perfezionistico:   "17:00",
  "termica-forte":   "16:30",
  misto:             "16:00",
  ventoso:           "15:00",
  "stabile-coperto": "14:00",
  "debole-poco-termico": "14:30",
  pioggia:           "10:00",
  "instabile-temporali": "12:30",
};

const SCENARIO_QUOTA_MAX: Record<ScenarioMeteo, (baseCumuliMin: number | null, altitude: number) => number> = {
  perfezionistico:   (bcm) => bcm != null ? Math.min(3500, bcm) : 3500,
  "termica-forte":   (bcm) => bcm != null ? Math.min(3200, bcm) : 3200,
  misto:             (bcm) => bcm != null ? Math.min(3000, bcm) : 3000,
  ventoso:           (bcm) => bcm != null ? Math.min(2500, bcm) : 2500,
  "stabile-coperto": (bcm) => bcm != null ? Math.min(2200, bcm) : 2200,
  "debole-poco-termico": (_bcm, alt) => Math.min(2000, alt + 400),
  pioggia:           (_bcm, alt) => alt,
  "instabile-temporali": (bcm, alt) => bcm != null ? Math.min(2200, bcm - 200) : alt,
};

const GIUDIZIO_MAP: Record<ScenarioMeteo, string> = {
  perfezionistico:   "giornata eccezionale, volo consigliato a tutti i livelli con ampia finestra operativa",
  "termica-forte":   "giornata molto buona, condizioni ideali per cross country e volo d'alta quota",
  misto:             "giornata favorevole, ottima per attività di volo e allenamento",
  ventoso:           "giornata vivace riservata a piloti esperti, strategia di volo limitata",
  "stabile-coperto": "giornata marginale, volo di pendio puro con termiche inibite",
  "debole-poco-termico": "giornata difficile, solo volo di pendio con termiche deboli",
  pioggia:           "giornata sfavorevole, volo sconsigliato per pioggia e visibilità ridotta",
  "instabile-temporali": "giornata pericolosa, volo solo al mattino e rientro immediato in caso di sviluppo temporalesco",
};

// ─── COSTRUTTORI DI PARAGRAFI (esportati per testing) ────────────────────────

export function generaParagrafoTermico(d: Parameters<typeof generaParagrafoTermico>[0]): string {
  const { scenario, tmStr, tMStr, dtStr, capeLabel, liStr, oraInnesco, rateoMin, rateoMax, tzStr, bcMinStr, bcMaxStr, bcMidStr, acStr, mcStr } = d;
  const fmtCape = (v: number | null) => fmt(v);
  const fmtLI   = (v: number | null) => v != null ? v.toFixed(1) : "N/D";

  const templates: Record<ScenarioMeteo, string> = {
    perfezionistico: `Giornata di volo ideale. Il riscaldamento diurno porterà la temperatura da ${tmStr} del primo mattino fino a ${tMStr} nelle ore centrali, con un'escursione termica di ${dtStr} che garantirà un'attività termica robusta e ben organizzata. L'CAPE raggiungerà i ${fmtCape(d.maxCape)} J/kg (${capeLabel}) con Lifted Index di ${fmtLI(d.avgLI)} K, confermando una marcata instabilità potenziale. L'innesco è atteso per le ${oraInnesco}, con salite comprese tra ${rateoMin.toFixed(1)} e ${rateoMax.toFixed(1)} m/s che potranno superare i 3500 m di quota. Lo zero termico si attesta sui ${tzStr}, lasciando ampio spazio alla convenzione secca. Base cumuli prevista tra ${bcMinStr} e ${bcMaxStr} (media ${bcMidStr}). Visibilità ottima.`,

    "termica-forte": `Condizioni termiche molto buone. Temperature tra ${tmStr} e ${tMStr} con gradiente verticale stimato a 0.85 °C/100 m. L'CAPE tocca i ${fmtCape(d.maxCape)} J/kg con Lifted Index di ${fmtLI(d.avgLI)} K: termiche generose e ben strutturate. L'innesco parte attorno alle ${oraInnesco}, raggiungendo i picchi di salita (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s) tra le 12:00 e le 15:00. Base cumuli tra ${bcMinStr} e ${bcMaxStr}. Lo zero termico a ${tzStr} non limita la salita. Possibile sviluppo di qualche cumulo nel tardo pomeriggio ma senza fenomeni rilevanti.`,

    "instabile-temporali": `Atmosfera fortemente instabile con energia convettiva molto elevata (CAPE ${fmtCape(d.maxCape)} J/kg, Lifted Index ${fmtLI(d.avgLI)} K). La temperatura salirà rapidamente da ${tmStr} a ${tMStr}, con un gradiente termico verticalmente instabile che favorirà la formazione di nubi a sviluppo verticale. Le termiche innescheranno presto (ore ${oraInnesco}) e cresceranno rapidamente di intensità (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s). Lo zero termico è relativamente alto (${tzStr}), il che spingerà i cumuli a quote notevoli. Base cumuli collocata tra ${bcMinStr} e ${bcMaxStr}: attenzione alla trasformazione in cumulonembi. Visibilità in rapido degrado con l'avvicinamento dei fenomeni.`,

    ventoso: `Termiche presenti ma disturbate dal vento sostenuto. Temperature tra ${tmStr} e ${tMStr}, con un gradiente termico sufficiente a generare attività convettiva moderata (CAPE ${fmtCape(d.maxCape)} J/kg, Lifted Index ${fmtLI(d.avgLI)} K). L'innesco avverrà attorno alle ${oraInnesco}, con salite modeste di ${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s. Il vento forte limiterà la qualità delle termiche rendendole spezzate e inclinate: saranno più utili i costoni soleggiati e i rilievi sottovento. Zero termico a ${tzStr}, base cumuli poco significativa a ${bcMidStr} causa copertura nuvolosa limitata.`,

    "stabile-coperto": `Giornata con termiche inibite dalla copertura nuvolosa estesa (${acStr} medio, picchi ${mcStr}). La temperatura salirà da ${tmStr} a ${tMStr}, ma l'irraggiamento solare sarà limitato con conseguente debolissimo riscaldamento del suolo. CAPE ${fmtCape(d.maxCape)} J/kg, Lifted Index ${fmtLI(d.avgLI)} K: l'energia convettiva resta sotto la soglia di attivazione. Innesco improbabile, e dove presente avverrà con grande ritardo. Salite debolissime se non assenti (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s nei rari momenti). Zero termico a ${tzStr}. La base cumuli è di fatto assente per mancanza di motore termico.`,

    pioggia: `Giornata con precipitazioni e termiche in gran parte compromesse. L'umidità elevata (spread medio ridotto) impedisce il surriscaldamento del suolo, mantenendo le temperature tra ${tmStr} e ${tMStr} senza escursione utile. CAPE ${fmtCape(d.maxCape)} J/kg, Lifted Index ${fmtLI(d.avgLI)} K. L'innesco termico non avviene, e le rare termiche (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s) sono spesso inibite dalla pioggia. Zero termico a ${tzStr}. Base cumuli molto bassa a ${bcMinStr} causa aria satura: possibili nubi basse e nebbie. Visibilità ridotta a tratti.`,

    "debole-poco-termico": `Termiche deboli e discontinue per la giornata odierna. La temperatura salirà da ${tmStr} a ${tMStr} con un'escursione limitata a ${dtStr}. CAPE ${fmtCape(d.maxCape)} J/kg, Lifted Index ${fmtLI(d.avgLI)} K: il profilo è stabile, con inversione termica nei bassi strati. L'innesco avverrà tardi (ore ${oraInnesco}) e le termiche saranno deboli (${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s), spesso isolate e di breve durata. Zero termico a ${tzStr}. La base cumuli si attesta oltre i ${bcMaxStr}, di fatto irraggiungibile con termiche così deboli. Strategia di volo obbligata a pendio e dinamico.`,

    misto: `Condizioni termiche nella norma, con attività moderata. Temperatura del giorno compresa tra ${tmStr} e ${tMStr}, escursione diurna di ${dtStr}. CAPE ${fmtCape(d.maxCape)} J/kg e Lifted Index di ${fmtLI(d.avgLI)} K, configurazione di moderata instabilità. L'innesco termico è previsto per le ${oraInnesco}, con salite medie di ${rateoMin.toFixed(1)}–${rateoMax.toFixed(1)} m/s. Lo zero termico si attesta sui ${tzStr}. Base cumuli tra ${bcMinStr} e ${bcMaxStr}. Le termiche saranno meglio organizzate sui versanti soleggiati esposti a sud-sud-ovest durante le ore centrali.`,
  };

  return templates[scenario];
}

export interface ParagrafoVentoDati {
  scenario: ScenarioMeteo;
  mainWindDir: string;
  mainWindDirBreve: string;
  avgWindGround: number | null;
  maxWindGround: number | null;
  maxGust: number | null;
  w1525: string; d1525: string;
  w2535: string; d2535: string;
  w35:   string; d35:   string;
}

export function generaParagrafoVento(d: ParagrafoVentoDati): string {
  const awg = d.avgWindGround ?? 10;
  const mwG = d.maxWindGround ?? 10;
  const mg  = d.maxGust ?? 0;
  const desc = awg < 8 ? "calmo e gestibile" :
               awg < 15 ? "debole e regolare" :
               awg < 22 ? "moderato ma costante" :
               "teso e richiede attenzione";

  const templates: Record<ScenarioMeteo, string> = {
    ventoso:           `Vento sostenuto protagonista della giornata. Al suolo spira da ${d.mainWindDir} con intensità media di ${fmt(d.avgWindGround)} km/h e raffiche fino a ${fmt(d.maxGust)} km/h (picco ${fmt(d.maxWindGround)} km/h): ${desc} per i decolli, ma occhio alle raffiche in decollo. Tra 1500 e 2500 m il flusso si porta a ${d.w1525} da ${d.d1525}, con shear verticale marcato e turbolenza meccanica. Tra 2500 e 3500 m il vento sale a ${d.w2535} da ${d.d2535}, generando onda orografica sopravento e rotori sottovento. Sopra i 3500 m il flusso raggiunge ${d.w35} da ${d.d35}: rotolamento aereo e turbolenza di scia in prossimità dei crinali. Si consiglia di volare sottovento ai costoni e di evitare la traversata sopravento.`,
    perfezionistico:   `Profilo del vento ottimale per il volo libero. Al suolo, vento da ${d.mainWindDir} debole a ${fmt(d.avgWindGround)} km/h (raffiche ${fmt(d.maxGust)} km/h), ${desc}: ideale per i decolli e per l'atterraggio in campo. Tra 1500 e 2500 m il flusso si porta a ${d.w1525} da ${d.d1525}: dinamico ottimo, con sostegno continuo sui costoni sopravento. Tra 2500 e 3500 m il vento sale gradualmente a ${d.w2535} da ${d.d2535}, consentendo transiti in altura senza penalizzazioni. Sopra i 3500 m il flusso raggiunge ${d.w35} da ${d.d35}, rimanendo sfruttabile per il volo d'onda. Direzione prevalente ${d.mainWindDir} con leggera rotazione oraria nel corso della giornata.`,
    "instabile-temporali": `Vento al suolo in rinforzo nel pomeriggio. Mattinata con ${d.mainWindDir} debole a ${fmt(d.avgWindGround)} km/h, ma con l'arrivo dei fenomeni convettivi sono attese raffiche discendenti (downburst) fino a ${fmt(d.maxGust)} km/h in prossimità dei cumulonembi. Tra 1500 e 2500 m il flusso è stimato a ${d.w1525} da ${d.d1525}, con rinforzi al passaggio dei sistemi. Tra 2500 e 3500 m il vento sale a ${d.w2535} da ${d.d2535} all'interno della corrente ascensionale. Sopra i 3500 m il flusso raggiunge ${d.w35} da ${d.d35}: in quota si concentrano i moti verticali più intensi, ma anche le nubi temporalesche. Attenzione alle variazioni improvvise di intensità e direzione.`,
    "stabile-coperto": `Vento al suolo da ${d.mainWindDir} a ${fmt(d.avgWindGround)} km/h, raffiche ${fmt(d.maxGust)} km/h: ${desc}. Il flusso in quota segue il tipico profilo anticiclonico: 1500–2500 m a ${d.w1525} da ${d.d1525}, 2500–3500 m a ${d.w2535} da ${d.d2535}, sopra 3500 m a ${d.w35} da ${d.d35}. In assenza di attività termica, il volo è esclusivamente dinamico: sfruttare i costoni sopravento e cercare le ascendenti meccaniche. Possibile inversione termica nei bassi strati con stratificazione stabile.`,
    pioggia:           `Vento al suolo da ${d.mainWindDir} a ${fmt(d.avgWindGround)} km/h con raffiche ${fmt(d.maxGust)} km/h: ${desc}, ma con ulteriore rinforzo durante i rovesci. In quota, flusso sostenuto: 1500–2500 m a ${d.w1525} da ${d.d1525}, 2500–3500 m a ${d.w2535} da ${d.d2535}, sopra 3500 m a ${d.w35} da ${d.d35}. Profilo tipico da saccatura atlantica con flusso umido e instabile. Visibilità ridotta, precipitazioni in atto. Volo vivamente sconsigliato.`,
    "debole-poco-termico": `Vento al suolo da ${d.mainWindDir} a ${fmt(d.avgWindGround)} km/h, raffiche fino a ${fmt(d.maxGust)} km/h: ${desc}, ideale per i decolli. Tra 1500 e 2500 m il flusso si porta a ${d.w1525} da ${d.d1525}, offrendo un buon dinamico sui versanti sopravento. Tra 2500 e 3500 m il vento raggiunge i ${d.w2535} da ${d.d2535}, transitabile con attenzione alle rotazioni. Sopra i 3500 m il flusso si attesta sui ${d.w35} da ${d.d35}, con leggera componente da ovest al passaggio delle ore pomeridiane. Direzione al suolo ${d.mainWindDir} (${d.mainWindDirBreve}), in leggera rotazione oraria con la quota.`,
    misto:             `Vento al suolo da ${d.mainWindDir} a ${fmt(d.avgWindGround)} km/h, raffiche fino a ${fmt(d.maxGust)} km/h: ${desc}, ideale per i decolli. Tra 1500 e 2500 m il flusso si porta a ${d.w1525} da ${d.d1525}, offrendo un buon dinamico sui versanti sopravento. Tra 2500 e 3500 m il vento raggiunge i ${d.w2535} da ${d.d2535}, transitabile con attenzione alle rotazioni. Sopra i 3500 m il flusso si attesta sui ${d.w35} da ${d.d35}, con leggera componente da ovest al passaggio delle ore pomeridiane. Direzione al suolo ${d.mainWindDir} (${d.mainWindDirBreve}), in leggera rotazione oraria con la quota.`,
    "termica-forte":   `Vento al suolo da ${d.mainWindDir} a ${fmt(d.avgWindGround)} km/h, raffiche fino a ${fmt(d.maxGust)} km/h: ${desc}, ideale per i decolli. Tra 1500 e 2500 m il flusso si porta a ${d.w1525} da ${d.d1525}, offrendo un buon dinamico sui versanti sopravento. Tra 2500 e 3500 m il vento raggiunge i ${d.w2535} da ${d.d2535}, transitabile con attenzione alle rotazioni. Sopra i 3500 m il flusso si attesta sui ${d.w35} da ${d.d35}, con leggera componente da ovest al passaggio delle ore pomeridiane. Direzione al suolo ${d.mainWindDir} (${d.mainWindDirBreve}), in leggera rotazione oraria con la quota.`,
  };

  // Fallback: per gli scenari non esplicitamente gestiti nel map sopra
  if (!(d.scenario in templates)) {
    return templates["misto"];
  }
  return templates[d.scenario];
}

export function generaParagrafoInstabilita(d: {
  scenario: ScenarioMeteo;
  totPrecip: number;
  orePioggia: number;
  bcMinStr: string;
  acStr: string;
  mcStr: string;
  maxCape: number | null;
}): string {
  const templates: Record<ScenarioMeteo, string> = {
    "instabile-temporali": `Rischio elevato di temporali pomeridiani (probabilità stimata 50–70% nelle ore 13:00–18:00). I cumulonembi si svilupperanno dapprima sui rilievi principali, per poi estendersi alla valle. Sono attesi accumuli complessivi fino a ${d.totPrecip.toFixed(1)} mm con possibili grandinate. Le raffiche di outflow in discesa dai temporali potranno superare i 60–70 km/h. Si raccomanda di rientrare in atterraggio entro le 13:30 e di mantenersi a debita distanza da qualsiasi sviluppo verticale. Possibile attività elettrica: evitare assolutamente il volo.`,

    pioggia: `Precipitazioni estese durante la giornata, con accumuli stimati di ${d.totPrecip.toFixed(1)} mm distribuiti su circa ${d.orePioggia} ore. Pioggia continua o a tratti, localmente anche a carattere di rovescio. Visibilità ridotta (2–5 km), con strati bassi su versanti sottovento (1500–2500 m). Base nuvolosa molto bassa a ${d.bcMinStr}. Volo vivamente sconsigliato per pioggia e visibilità insufficiente. Possibili locali temporali se CAPE > 600 J/kg.`,

    "stabile-coperto": `Nessun rischio di precipitazioni significative: la copertura nuvolosa estesa (${d.acStr} medio) non produce fenomeni rilevanti. Probabilità di pioggia inferiore al 10%. Possibile pioviggine locale in caso di nubi basse addossate ai rilievi (copertura ${d.mcStr}). L'attività cumuliforme è inibita dalla stabilità atmosferica. Le nubi alte e medie possono mascherare l'evoluzione del tempo ma non generano pericoli per il volo.`,

    ventoso: `Nessun rischio di precipitazioni importanti (probabilità < 15%). Eventuali deboli piovaschi orografici sui crinali sopravento sono possibili ma senza accumuli significativi (stimati < 1 mm). Il vento sostenuto è il fattore dominante: la copertura nuvolosa si mantiene limitata (${d.acStr}) con sviluppo di nubi basse a pendio rotte dal vento. Possibile trasporto di sabbia/polvere in alta quota.`,

    perfezionistico: `Rischio molto basso di precipitazioni. La copertura nuvolosa si manterrà limitata a ${d.acStr}, con sviluppo di cumuli congesti solo nel tardo pomeriggio (ore 15:00–17:00) ben oltre la base operativa. Probabilità di pioggia inferiore al 5%. Possibile locale rovescio orografico solo sui rilievi più elevati e isolati, con accumuli comunque trascurabili. Le condizioni sono ideali per la salita fino a quote elevate.`,

    "termica-forte": `Rischio molto basso di precipitazioni. La copertura nuvolosa si manterrà limitata a ${d.acStr}, con sviluppo di cumuli congesti solo nel tardo pomeriggio (ore 15:00–17:00) ben oltre la base operativa. Probabilità di pioggia inferiore al 5%. Possibile locale rovescio orografico solo sui rilievi più elevati e isolati, con accumuli comunque trascurabili. Le condizioni sono ideali per la salita fino a quote elevate.`,

    "debole-poco-termico": `Nessun rischio di precipitazioni. Il profilo atmosferico stabile impedisce lo sviluppo di nubi convettive. Copertura nuvolosa modesta (${d.acStr} medio) con prevalenza di nubi alte o velature. Cielo sereno o poco nuvoloso. L'assenza di motore termico è legata a inversione e stabilità, non a maltempo.`,

    misto: `Rischio di precipitazioni basso-moderato (probabilità stimata 15–25% nel pomeriggio). Possibile sviluppo di cumuli sui rilievi principali dopo le 14:00, con locali piovaschi se l'instabilità aumenta. La copertura nuvolosa media sarà di ${d.acStr} con picchi pomeridiani fino a ${d.mcStr}. Base cumuli collocata tra ${d.bcMinStr} e oltre, generalmente ben al di sopra della quota di volo prevista. Monitorare l'evoluzione con radar e satelliti nelle ore centrali.`,
  };

  return templates[d.scenario] ?? templates["misto"];
}

export function generaParagrafoStrategia(d: {
  scenario: ScenarioMeteo;
  oraInnesco: string;
  oraFine: string;
  baseCumuliMin: number | null;
  altitude: number;
}): string {
  const quotaMax = SCENARIO_QUOTA_MAX[d.scenario](d.baseCumuliMin, d.altitude);
  const quotaStr = quotaMax != null ? `${quotaMax} m` : "N/D";

  const templates: Record<ScenarioMeteo, string> = {
    perfezionistico:   `Finestra di volo eccezionale. Decollo consigliato dalle ${d.oraInnesco}, con atterraggio possibile anche fino alle ${d.oraFine}. Quota massima consigliata ${quotaStr}. Strategia: cross country lungo i costoni principali, transiti in altura con sfruttamento del dinamico sopra i 2500 m. Possibile raggiungere i 3500+ m e sfruttare il volo d'onda sui crinali sopravento. Attenzione solo al possibile sviluppo cumuliforme tardo-pomeridiano: mantenere un margine di 300–400 m sotto la base dei cumuli.`,
    "termica-forte":   `Ottima giornata per volo termico-dinamico. Lancio possibile dalle ${d.oraInnesco} fino alle ${d.oraFine}, con condizioni stabili. Quota operativa consigliata ${quotaStr}. Strategia: sfruttare i costoni soleggiati per le prime ore, poi transizione in altura per collegare le termiche più generose. Cross possibile sui rilievi principali, attenzione alla rotazione del vento con la quota. Possibile raggiungere i 3200+ m durante il picco termico delle 13:00–15:00.`,
    misto:             `Giornata favorevole. Decollo raccomandato dalle ${d.oraInnesco} alle ${d.oraFine}, con attenzione all'evoluzione del vento. Quota operativa fino a ${quotaStr}. Strategia: iniziare con termiche di pendio, poi passare a termiche blu nel corso della giornata. Cross country possibile sui rilievi più alti, evitando i versanti sopravento dove il vento rinforza. Possibile raggiungere i 3000 m nelle ore centrali.`,
    ventoso:           `Strategia limitata dal vento. Finestra di volo dalle ${d.oraInnesco} alle ${d.oraFine}, con atterraggio prudente. Quota massima consigliata ${quotaStr}. Strategia: volo locale con sfruttamento dei costoni sopravento per il dinamico puro. Evitare le termiche (spezzate e inclinate) e le quote elevate. Volo adatto a piloti esperti che gestiscono il vento forte. Atterraggio anticipato se le raffiche superano i 40 km/h al suolo.`,
    "stabile-coperto": `Strategia obbligata al volo dinamico puro. Decollo possibile solo su pendii ripidi esposti al vento, con atterraggio anticipato entro le ${d.oraFine}. Quota operativa fino a ${quotaStr}. Strategia: cercare i costoni sopravento con vento perpendicolare al rilievo, sfruttare l'onda sottovento se presente. Niente termiche: la stabilità le inibisce totalmente.`,
    "debole-poco-termico": `Strategia di pendio obbligata. Decollo possibile dalle ${d.oraInnesco} (probabilmente tardi) fino alle ${d.oraFine}, con atterraggio se le termiche si esauriscono. Quota operativa limitata a ${quotaStr}. Strategia: volo di pendio puro, sfruttando i versanti soleggiati. Possibile qualche termica debole nelle ore centrali (12:00–14:00). Mantenere un margine ampio per l'atterraggio.`,
    pioggia:           `Volo sconsigliato. Possibile solo un breve volo di pendio al mattino (entro le ${d.oraFine}) se le precipitazioni non sono ancora iniziate. Quota operativa strettamente limitata a ${d.altitude} m. Strategia: valutare attentamente le condizioni locali, indossare equipaggiamento adeguato, mantenere sempre un'opzione di atterraggio sicura e rapida. Rimandare il volo se la pioggia è già in atto.`,
    "instabile-temporali": `Strategia obbligata al volo mattutino. Decollo rigorosamente entro le ${d.oraInnesco}, con atterraggio improrogabile entro le ${d.oraFine}. Quota operativa limitata a ${quotaStr}, ben al di sotto della base cumuli. Strategia: sfruttare esclusivamente le prime ore di volo, mantenersi lontano dai rilievi più elevati, atterrare non appena i primi cumuli mostrano crescita verticale significativa. Possibile attività elettrica: non volare.`,
  };

  return templates[d.scenario] ?? templates["misto"];
}

export function generaSegnaliPericolo(d: {
  hasThunderstorm: boolean;
  hasRain: boolean;
  scenario: ScenarioMeteo;
  maxWindGround: number | null;
  windOver3500: number | null;
  maxCape: number | null;
  avgClouds: number | null;
}): string {
  const pericoli: string[] = [];
  if (d.hasThunderstorm) pericoli.push("cumulonembi in formazione rapida e attività elettrica");
  if (d.hasRain && d.scenario !== "pioggia") pericoli.push("rovesci improvvisi con riduzione di visibilità");
  if (d.scenario === "ventoso") pericoli.push("raffiche al suolo superiori a 40 km/h in prossimità dei crinali");
  if (d.maxWindGround != null && d.maxWindGround > 25 && d.scenario !== "ventoso") pericoli.push("raffiche al suolo intense e turbolenza meccanica");
  if (d.windOver3500 != null && d.windOver3500 > 40) pericoli.push("vento in alta quota eccessivo (rotolamento aereo)");
  if (d.maxCape != null && d.maxCape > 1000 && d.scenario !== "perfezionistico") pericoli.push("instabilità potenziale elevata, monitorare la crescita cumuliforme");
  if (d.avgClouds != null && d.avgClouds > 80) pericoli.push("copertura nuvolosa estesa con riduzione di visibilità");
  if (pericoli.length === 0) pericoli.push("evoluzione cumuliforme nel pomeriggio, monitorare i primi segnali di crescita verticale");
  return pericoli.join("; ") + ".";
}

export function generaGiudizioFinale(score: number, scenario: ScenarioMeteo): string {
  return `${score} / 10 – ${GIUDIZIO_MAP[scenario]}. Monitorare l'evoluzione meteo nelle ore centrali e pianificare attentamente la finestra di volo.`;
}

export function computeScore(d: {
  scenario: ScenarioMeteo;
  tempMax: number | null;
  avgClouds: number | null;
  maxWindGround: number | null;
}): number {
  let score = SCENARIO_SCORE[d.scenario] ?? 6;

  if (d.tempMax != null && d.tempMax < 12) {
    score = Math.max(1, score - Math.round((12 - d.tempMax) * 0.5));
  }
  if (d.avgClouds != null && d.avgClouds > 90 && d.scenario !== "stabile-coperto") {
    score = Math.max(1, score - Math.round((d.avgClouds - 90) * 0.3));
  }
  if (d.maxWindGround != null && d.maxWindGround > 25) {
    score = Math.max(1, score - 1);
  }
  if (d.maxWindGround != null && d.maxWindGround > 35) {
    score = Math.max(1, score - 1);
  }
  return Math.min(10, Math.max(1, score));
}

export function buildTestoCompleto(d: {
  titolo: string;
  paragrafoTermico: string;
  paragrafoVento: string;
  paragrafoInstabilita: string;
  paragrafoStrategia: string;
  segnaliPericolo: string;
  giudizioFinale: string;
}): string {
  return [
    d.titolo,
    "",
    `1. Quadro termico e stabilità: ${d.paragrafoTermico}`,
    "",
    `2. Profilo del vento in quota: ${d.paragrafoVento}`,
    "",
    `3. Instabilità e precipitazioni: ${d.paragrafoInstabilita}`,
    "",
    `4. Strategia di volo consigliata: ${d.paragrafoStrategia}`,
    "",
    `Segnali di pericolo: ${d.segnaliPericolo}`,
    "",
    `Giudizio finale: ${d.giudizioFinale}`,
  ].join("\n");
}

// ─── FUNZIONE PRINCIPALE ─────────────────────────────────────────────────────

/**
 * Genera il report meteorologico completo partendo dal JSON grezzo Open-Meteo.
 * Restituisce null se i dati sono insufficienti.
 */
export function generateReportMeteo({
  siteName,
  altitude,
  dateObj,
  hourlyData,
}: ReportMeteoParams): GeneratedReport | null {
  const d = extractWeatherData(hourlyData);
  if (d == null) return null;

  // Formattazione stringhe per i template
  const tmStr     = d.tempMin != null ? `${d.tempMin} °C` : "N/D";
  const tMStr     = d.tempMax != null ? `${d.tempMax} °C` : "N/D";
  const dtStr     = d.deltaT != null ? `${d.deltaT} °C` : "N/D";
  const tzStr     = d.avgFreeze != null ? `${d.avgFreeze} m` : "N/D";
  const bcMinStr  = d.baseCumuliMin != null ? `${d.baseCumuliMin} m` : "N/D";
  const bcMaxStr  = d.baseCumuliMax != null ? `${d.baseCumuliMax} m` : "N/D";
  const bcMidStr  = d.baseCumuliMedia != null ? `${d.baseCumuliMedia} m` : "N/D";
  const acStr     = d.avgClouds != null ? `${d.avgClouds}%` : "N/D";
  const mcStr     = d.maxClouds != null ? `${d.maxClouds}%` : "N/D";

  const w1525 = d.wind1500_2500 != null ? `${d.wind1500_2500} km/h` : "N/D";
  const w2535 = d.wind2500_3500  != null ? `${d.wind2500_3500} km/h`  : "N/D";
  const w35   = d.windOver3500   != null ? `${d.windOver3500} km/h`    : "N/D";

  const oraFine = SCENARIO_ORA_FINE[d.scenario];

  // ── Costruisci i paragrafi ──────────────────────────────────────────────
  const paragrafoTermico = generaParagrafoTermico({
    ...d, tmStr, tMStr, dtStr,
    capeLabel: getCapeLabel(d.maxCape),
    liStr: d.avgLI != null ? d.avgLI.toFixed(1) : "N/D",
    tzStr, bcMinStr, bcMaxStr, bcMidStr, acStr, mcStr,
  });

  const paragrafoVento = generaParagrafoVento({
    ...d, w1525, d1525: d.dir1500_2500,
    w2535, d2535: d.dir2500_3500,
    w35,   d35:   d.dirOver3500,
  });

  const paragrafoInstabilita = generaParagrafoInstabilita({
    ...d, bcMinStr, acStr, mcStr,
  });

  const paragrafoStrategia = generaParagrafoStrategia({
    ...d, oraFine,
  });

  const segnaliPericolo = generaSegnaliPericolo({
    ...d,
  });

  const score = computeScore({
    scenario: d.scenario,
    tempMax: d.tempMax,
    avgClouds: d.avgClouds,
    maxWindGround: d.maxWindGround,
  });

  const giudizioFinale = generaGiudizioFinale(score, d.scenario);

  // ── Header ──────────────────────────────────────────────────────────────
  const giorniSettimana = ["DOMENICA","LUNEDÌ","MARTEDÌ","MERCOLEDÌ","GIOVEDÌ","VENERDÌ","SABATO"];
  const mesi            = ["GENNAIO","FEBBRAIO","MARZO","APRILE","MAGGIO","GIUGNO","LUGLIO","AGOSTO","SETTEMBRE","OTTOBRE","NOVEMBRE","DICEMBRE"];
  const dataHeader      = `${giorniSettimana[dateObj.getDay()]} ${dateObj.getDate()} ${mesi[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  const titolo          = `REPORT METEO ${siteName.toUpperCase()} – ${dataHeader}`;

  const testoCompleto = buildTestoCompleto({
    titolo,
    paragrafoTermico,
    paragrafoVento,
    paragrafoInstabilita,
    paragrafoStrategia,
    segnaliPericolo,
    giudizioFinale,
  });

  return {
    titolo,
    paragrafoTermico,
    paragrafoVento,
    paragrafoInstabilita,
    paragrafoStrategia,
    segnaliPericolo,
    giudizioFinale,
    score,
    testoCompleto,
  };
}
