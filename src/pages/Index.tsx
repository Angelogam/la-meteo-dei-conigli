import { useEffect, useMemo, useState } from "react";
import { useWeatherData } from "@/hooks/useWeatherData";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import WeatherDashboard from "@/components/WeatherDashboard";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import VentiInterpolatiTab from "@/components/VentiInterpolatiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiMeteo from "@/components/AnalisiMeteo";
import Windgram from "@/components/Windgram";
import { DECOLLI } from "@/data/decolli";
import { calcolaTermiche } from "@/utils/termiche";

const Index = () => {
  const {
    selectedId,
    setSelectedId,
    loading,
    updating,
    selectedDay,
    setSelectedDay,
    selectedHour,
    setSelectedHour,
    lastUpdate,
    countdown,
    activeTab,
    setActiveTab,
    activeModel,
    setActiveModel,
    site,
    dayData,
    currentData,
    thermalDelta,
    enrichedDaily,
    dateLabels,
    hourlyData,
    allHourlyData,
    currentCape,
  } = useWeatherData();

  // Determine current site (selectedId takes precedence)
  const currentSite = selectedId ? DECOLLI.find((d) => d.id === selectedId) ?? site : site;
  const hasData = !!currentSite && dayData?.length > 0;

  // Compute current hour data (safe for missing data)
  const current = useMemo(() => {
    if (!currentSite || !dayData || dayData.length === 0) return null;
    const currentHour = new Date().getHours();
    return dayData.find((h) => h.time.getHours() === currentHour) ?? dayData[0];
  }, [currentSite, dayData]);

  // Compute termiche and precipitation arrays (safe for missing data)
  const termicheOrarie = useMemo(() => {
    if (!currentSite || !dayData || dayData.length === 0) return [];
    return dayData.map((h) => {
      const ora = h.time.getHours();
      const t = calcolaTermiche(h, currentSite.altitude);
      return { ora, rateo: t.rateo, base: t.base, top: t.top, precip: h.precipitation ?? 0, temp: h.temperature };
    });
  }, [currentSite, dayData]);

  const precipitazioneOraria = useMemo(() => {
    if (!currentSite || !dayData || dayData.length === 0) return [];
    return dayData.map((h) => ({
      ora: h.time.getHours(),
      mm: h.precipitation ?? 0,
    }));
  }, [currentSite, dayData]);

  // Derived values from arrays (will be 0 or undefined if arrays empty)
  const totalePrecipitazione = precipitazioneOraria.reduce((s, p) => s + p.mm, 0);
  const primaOraPioggia = precipitazioneOraria.find((p) => p.mm > 0.1)?.ora;
  const ultimaOraPioggia = precipitazioneOraria
    .slice()
    .reverse()
    .find((p) => p.mm > 0.1)?.ora;

  // Lifted Index and CIN (from current data, with fallbacks)
  const LI = current?.liftedIndex ?? -4;
  const CIN = current?.cin ?? 0;

  // Zero termico and cloud base (from current data)
  const zeroTermico = current?.freezingLevel ?? 3000;
  const cloudBase = useMemo(() => {
    if (!current) return 0;
    const spread = current.temperature - (current.dewPoint ?? current.temperature - 8);
    return Math.round(currentSite.altitude + spread * 125);
  }, [current, currentSite.altitude]);

  // Stability index (from current data)
  const stability = useMemo(() => {
    if (!current) {
      return { label: "Dati non disponibili", color: "#6b7280" };
    }
    const temp = current?.temperature ?? 15;
    const hum = current?.humidity ?? 50;
    const cloud = current?.cloudCover ?? 30;
    const cape = Math.max(0, (temp - 15) * 50 + (50 - hum) * 10 - cloud * 2);
    if (cape > 1500) return { label: "Instabile ⚠️", color: "#ff1744" };
    if (cape > 800) return { label: "Moderato 🟡", color: "#ff9800" };
    if (cape > 300) return { label: "Stabile 🟢", color: "#4caf50" };
    return { label: "Molto stabile ✅", color: "#4fc3f7" };
  }, [current?.temperature, current?.humidity, current?.cloudCover]);

  // Flight score calculation
  const maxRateo = termicheOrarie.length > 0 ? Math.max(...termicheOrarie.map((t) => t.rateo), 0) : 0;
  let giudizioScore = 5;
  if (maxRateo >= 2) giudizioScore += 3;
  else if (maxRateo >= 1) giudizioScore += 2;
  else if (maxRateo >= 0.5) giudizioScore += 1;
  if (totalePrecipitazione === 0) giudizioScore += 2;
  else if (totalePrecipitazione < 1) giudizioScore += 1;
  else if (totalePrecipitazione < 3) giudizioScore -= 1;
  else giudizioScore -= 2;
  giudizioScore = Math.min(10, Math.max(0, giudizioScore));
  const giudizioLabel =
    giudizioScore >= 8 ? "Eccellente" : giudizioScore >= 6 ? "Buona" : giudizioScore >= 4 ? "Discreta" : giudizioScore >= 2 ? "Scarsa" : "Pessima";

  // Operational window
  const inizioFinestra = 9;
  const fineFinestra = primaOraPioggia ?? 19;

  // Text sections (with fallbacks for missing data)
  const andamentoTermiche = useMemo(() => {
    if (termicheOrarie.length === 0) {
      return "Nessun dato disponibile per le termiche.";
    }
    const mattina = termicheOrarie.filter((t) => t.ora >= 8 && t.ora < 11);
    const mezzogiorno = termicheOrarie.filter((t) => t.ora >= 11 && t.ora < 14);
    const pomeriggio = termicheOrarie.filter((t) => t.ora >= 14 && t.ora < 17);
    const sera = termicheOrarie.filter((t) => t.ora >= 17 && t.ora <= 19);
    const media = (arr: any[]) => arr.length ? arr.reduce((s, t) => s + t.rateo, 0) / arr.length : 0;
    const mattMedia = media(mattina);
    const mezzoMedia = media(mezzogiorno);
    const pomerMedia = media(pomeriggio);
    const seraMedia = media(sera);
    return `Dalle 08 alle 10 ascendenze medie tra ${mattMedia.toFixed(1)} e ${(mattMedia + 0.3).toFixed(1)} m/s con probabilità di salita dal ${Math.round(mattMedia * 30 + 40)} al ${Math.round((mattMedia + 0.3) * 30 + 40)}% – termiche ancora deboli e poco organizzate. 
Tra le 11 e le 13 si raggiunge il picco con valori di ${mezzoMedia.toFixed(1)}-${(mezzoMedia + 0.2).toFixed(1)} m/s e probabilità di salita tra il ${Math.round(mezzoMedia * 30 + 50)} e il ${Math.round((mezzoMedia + 0.2) * 30 + 60)}% – questa è la migliore finestra per guadagnare quota e spostarsi. 
Alle 14 e 15 le ascendenze restano su ${pomerMedia.toFixed(1)} e ${(pomerMedia + 0.2).toFixed(1)} m/s con probabilità di salita al ${Math.round(pomerMedia * 30 + 60)}%, ma attenzione: quel ${Math.round(pomerMedia * 30 + 60)}% indica che l'aria sale ovunque perché stanno nascendo i temporali, non sono termiche pulite e sicure! 
Dopo le 16 crollo verticale: ${seraMedia.toFixed(1)} m/s con solo ${Math.round(seraMedia * 20 + 10)}% di probabilità, poi ${(seraMedia - 0.2).toFixed(1)} m/s al ${Math.round((seraMedia - 0.2) * 20 + 5)}% e ${(seraMedia - 0.4).toFixed(1)} m/s alle 18 – la convezione si spegne definitivamente con l'arrivo dei rovesci.`;
  }, [termicheOrarie]);

  const precipitazioniTesto = useMemo(() => {
    if (totalePrecipitazione === 0) {
      return "Fino alle 19 completamente asciutto con 0,0 mm.";
    }
    let testo = "";
    if (primaOraPioggia !== undefined) {
      testo += `Alle ${String(primaOraPioggia).padStart(2, "0")} compaiono i primi ${precipitazioneOraria.find(
        (p) => p.ora === primaOraPioggia
      )?.mm.toFixed(1)} mm`;
    }
    if (ultimaOraPioggia !== undefined && ultimaOraPioggia !== primaOraPioggia) {
      testo += ` e alle ${String(ultimaOraPioggia).padStart(2, "0")} altri ${precipitazioneOraria.find(
        (p) => p.ora === ultimaOraPioggia
      )?.mm.toFixed(1)} mm`;
    }
    testo += ` – sono i precursori del peggioramento. Il momento critico arriva tra le ${String(
      primaOraPioggia !== undefined ? primaOraPioggia : 16
    ).padStart(2, "0")} e le ${String(
      ultimaOraPioggia !== undefined ? ultimaOraPioggia : 17
    ).padStart(2, "0")} con accumuli orari di ${precipitazioneOraria
      .filter(
        (p) => p.ora >= (primaOraPioggia ?? 16) && p.ora <= (ultimaOraPioggia ?? 17)
      )
      .reduce((s, p) => s + p.mm, 0)
      .toFixed(1)} mm, valori che indicano rovesci di moderata o forte intensità, probabilmente temporali con fulmini, raffiche di vento e forte turbolenza. Per questo il rientro deve essere completato ben prima delle ${String(
      primaOraPioggia !== undefined ? primaOraPioggia : 16
    ).padStart(2, "0")}.`;
    return testo;
  }, [totalePrecipitazione, primaOraPioggia, ultimaOraPioggia, precipitazioneOraria]);

  const analisiEmagramma = useMemo(() => {
    if (!current) {
      return "Dati non disponibili per l'analisi dell'emagramma.";
    }
    const liDesc = LI <= -6 ? "un valore che indica instabilità molto elevata, tipica di condizioni temporalesche – più il numero è negativo e più l'atmosfera è pronta a scatenare cumulonembi." : LI <= -4 ? "un valore che indica instabilità elevata, favorevole a sviluppi temporaleschi." : LI <= -2 ? "un valore che indica moderata instabilità, possibile sviluppo di cumuli." : LI <= 0 ? "un valore che indica leggera instabilità o neutralità." : "un valore che indica atmosfera stabile, scarsa probabilità di temporali.";
    
    // Compute oraInnesco and tempInnesco before using them
    const oraInnesco = termicheOrarie.find((t) => t.rateo >= 0.3)?.ora;
    const tempInnesco = oraInnesco !== undefined ? termicheOrarie.find((t) => t.ora === oraInnesco)?.temp ?? current?.temperature ?? 0 : 0;
    
    const tempInnescoDesc = tempInnesco
      ? `La temperatura di innesco è di ${tempInnesco.toFixed(1)} °C, il che significa che le termiche si attiveranno spontaneamente quando il suolo raggiungerà questa temperatura, verosimilmente tra le ${String(oraInnesco !== undefined ? oraInnesco : 10).padStart(2, "0")} e le ${String(oraInnesco !== undefined ? oraInnesco + 1 : 11).padStart(2, "0")}.`
      : "";
    
    const baseNubiDesc = `La base delle nubi (salita massima) è prevista a ${cloudBase} m, una quota relativamente bassa che limita il guadagno verticale a circa ${Math.max(0, cloudBase - currentSite.altitude)}–${Math.max(0, cloudBase - currentSite.altitude + 200)} metri sopra il suolo – non aspettarti di volare a 4000 metri con questa configurazione, perché l'umidità condensa presto.`;
    const zeroTermicoDesc = `Lo zero termico si trova a ${zeroTermico} m, valore ${zeroTermico > 4000 ? "alto" : "moderato"} che indica aria calda in quota, ma il forte contrasto tra bassi strati caldi e medi strati più freschi genera proprio l'instabilità che porta ai temporali.`;
    const cinDesc = `Il CIN (energia di inibizione) è di ${CIN} J/kg, dal grafico sembra ${CIN <= 50 ? "basso o assente" : "moderato"}; quindi le termiche partiranno senza ostacoli già al mattino.`;
    
    return `${liDesc} ${tempInnescoDesc} ${baseNubiDesc} ${zeroTermicoDesc} ${cinDesc}`;
  }, [LI, current?.temperature, current?.dewPoint, current?.humidity, current?.cloudCover, cloudBase, currentSite.altitude, zeroTermico, CIN, termicheOrarie]);

  const interpretazione = useMemo(() => {
    if (!current) {
      return "Dati non disponibili per l'interpretazione.";
    }
    let testo = "";
    if (LI <= -5) {
      testo += `La giornata è tipicamente pre-temporalesca, con riscaldamento diurno intenso che interagisce con aria umida in quota. L'alto zero termico e il LI molto negativi indicano che una volta innazata la convezione, questa si svilupperà rapidamente e in modo violento. `;
    } else {
      testo += `La giornata presenta condizioni di instabilità moderata, con possibilità di sviluppo di termiche organizzate. `;
    }
    testo += `La morfologia alpina di ${currentSite.name} favorisce inoltre convergenze orografiche che possono anticipare o ritardare l'innesco dei temporali rispetto alle previsioni orarie, quindi il pilota deve basarsi anche sull'osservazione diretta del cielo e non solo sui modelli. I cumuli che si formeranno al mattino saranno inizialmente benigni e ben segnati, ma già dalle ${String(
      primaOraPioggia !== undefined ? primaOraPioggia : 13
    ).padStart(2, "0")}:00 vanno monitorati con attenzione: se iniziano a crescere verticalmente assumendo forme a cavolfiore o a incudine, significa che il temporale è in fase di sviluppo e il rientro va anticipato.`;
    return testo;
  }, [LI, zeroTermico, currentSite.name, primaOraPioggia, current]);

  const consigli = useMemo(() => {
    if (!current) {
      return "Dati non disponibili per i consigli operativi.";
    }
    let testo = "";
    testo += `Decolla entro le ${String(inizioFinestra).padStart(2, "0")}:00 per sfruttare il riscaldamento progressivo e avere tempo sufficiente per guadagnare quota prima che le condizioni si complichino. `;
    testo += `Concentra il volo tra le ${String(11).padStart(2, "0")} e le ${String(13).padStart(2, "0")}, che sono le ore migliori per ascendenze forti e probabilità di salita elevata. `;
    testo += `Mantieni sempre un campo di atterraggio di riserva a distanza di planata, perché le termiche potrebbero cessare improvvisamente con l'arrivo delle precipitazioni. `;
    testo += `Inizia il rientro verso la base non oltre le ${String(fineFinestra - 1).padStart(2, "0")}:30 e atterra entro le ${String(fineFinestra).padStart(2, "0")}:30 – non prolungare oltre anche se le condizioni sembrano ancora buone, perché il degrado è rapido e in montagna i temporali si formano in pochi minuti. `;
    testo += `Se sei un pilota esperto, puoi sfruttare bene le prime ore per voli locali o brevi transferimenti; se sei meno pratico, valuta seriamente se rimandare a un giorno con condizioni più stabili e finestre più ampie. `;
    testo += `La sicurezza viene sempre prima di qualsiasi obiettivo di volo.`;
    return testo;
  }, [inizioFinestra, fineFinestra, current]);

  const riepilogo = useMemo(() => {
    return `Mattino con termiche crescenti fino a ${maxRateo.toFixed(
      1
    )} m/s, ottime tra le 11 e le 13 – Pomeriggio con rovesci che iniziano lievi alle ${String(
      primaOraPioggia !== undefined ? primaOraPioggia : 14
    ).padStart(2, "0")} e diventano forti (${totalePrecipitazione > 3 ? "3-6" : "0.5-2"} mm/h) tra le ${String(
      primaOraPioggia !== undefined ? primaOraPioggia + 2 : 16
    ).padStart(2, "0")} e le ${String(
      ultimaOraPioggia !== undefined ? ultimaOraPioggia : 17
    ).padStart(2, "0")} – Atterraggio obbligatorio entro le ${String(
      fineFinestra
    ).padStart(2, "0")}:${"30"} per evitare temporali pericolosi – Quota massima raggiungibile limitata dalla base nubi a ${cloudBase} m – LI di ${LI} K conferma alto rischio di temporali.`;
  }, [
    maxRateo,
    primaOraPioggia,
    totalePrecipitazione,
    fineFinestra,
    cloudBase,
    LI,
  ]);

  // Compute the correct date label dynamically based on selectedDay
  const dataReport = useMemo(() => {
    if (!dayData || dayData.length === 0) {
      // fallback to today if no data
      const now = new Date();
      return formatDateShort(now);
    }
    // dayData[0] corresponds to the selected day (filtered earlier)
    return formatDateShort(new Date(dayData[0].time));
  }, [dayData]);

  const oraAggiornamento = lastUpdate
    ? lastUpdate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  // If no data, show placeholder
  if (!hasData) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-center text-slate-400">
        Seleziona un decollo per vedere l'analisi approfondita
      </div>
    );
  }

  /* ---------- RENDER ---------- */
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 md:px-6 py-4 md:py-6 space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Decolli list */}
          <aside className="w-full lg:w-80 space-y-4">
            <div className="card bg-slate-800/60 border border-emerald-500/30">
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="text-lg font-bold text-emerald-300">Decolli</span>
                <span className="text-sm text-slate-500 bg-slate-700/60 px-2 py-0.5 rounded-full ml-auto">{DECOLLI.length}</span>
              </div>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {DECOLLI.map((decollo) => {
                  const isSelected = selectedId === decollo.id;
                  const hourly = allHourlyData?.[decollo.id];
                  const hasData = hourly && hourly.length > 0;
                  const temp = hasData ? Math.round(hourly[0].temperature) : null;
                  const wind = hasData ? Math.round(hourly[0].windSpeed) : null;
                  const dir = hasData ? Math.round(hourly[0].windDir) : null;
                  const gust = hasData && hourly[0].windGusts > 0 ? Math.round(hourly[0].windGusts) : null;
                  const code = hasData ? hourly[0].weatherCode : null;
                  const dirArrow = dir != null ? ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][Math.round(dir / 45) % 8] : "";
                  const dirName = dir != null ? ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(dir / 45) % 8] : "";
                  const emoji = code != null ? 
                    code === 0 ? "☀️" :
                    code <= 2 ? "🌤️" :
                    code <= 3 ? "☁️" :
                    code <= 48 ? "🌫️" :
                    code <= 57 ? "🌦️" :
                    code <= 67 ? "🌧️" :
                    code <= 77 ? "🌨️" :
                    code <= 82 ? "🌦️" :
                    code >= 95 ? "⛈️" :
                    "☀️" : "—";

                  return (
                    <button
                      key={decollo.id}
                      onClick={() => setSelectedId(decollo.id)}
                      className={`
                        card w-full text-left p-4 transition-all border-2 cursor-pointer
                        ${isSelected
                          ? "bg-emerald-900/50 border-emerald-500 shadow-lg"
                          : "bg-slate-800/40 border-slate-700/40 hover:bg-slate-700/50"
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl mt-0.5 shrink-0">{emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold text-white mb-1 flex items-center gap-1">
                            {decollo.name}
                            {isSelected && <span className="w-4 h-4 text-emerald-400">✦</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                            <span className="flex items-center gap-1"><span className="w-4 h-4 text-sky-400">⟳</span>{decollo.exposure}</span>
                            <span className="flex items-center gap-1"><span className="w-4 h-4 text-amber-400">⛰️</span>{decollo.altitude}m</span>
                            <span className="flex items-center gap-1"><span className="w-4 h-4 text-rose-400">📍</span>{decollo.valley}</span>
                          </div>
                          {hasData && temp != null && (
                            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-700/30">
                              <span className="flex items-center gap-1.5 text-base font-bold text-amber-300">
                                <span className="w-5 h-5 text-amber-400">🌡️</span>{temp}°
                              </span>
                              <span className="flex items-center gap-1.5 text-base font-bold text-sky-300">
                                <span className="w-5 h-5 text-sky-400">💨</span>{wind}
                                <span className="text-slate-400 font-normal text-sm">{dirArrow}{dirName}</span>
                              </span>
                              {gust != null && gust > 0 && (
                                <span className="text-sm text-red-300"><span className="w-4 h-4">📊</span>{gust}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6">
            {hasData && (
              <>
                {/* SiteHeader */}
                <SiteHeader
                  name={site!.name}
                  exposure={site!.exposure}
                  valley={site!.valley}
                  alt={site!.altitude}
                  currentData={currentData}
                />

                {/* Previsioni giornaliere */}
                <PrevisioniGiornaliere
                  enrichedDaily={enrichedDaily}
                  dateLabels={dateLabels}
                  currentData={currentData}
                  dayData={dayData}
                  site={{ name: site!.name, altitude: site!.altitude, exposure: site!.exposure }}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  nomeDecollo={site!.name}
                />

                {/* Weather Dashboard */}
                <WeatherDashboard
                  dayData={dayData}
                  altitude={site!.altitude}
                  selectedHour={selectedHour}
                  onHourSelect={setSelectedHour}
                  dayLabel={dateLabels[selectedDay] ?? ""}
                />

                {/* Tab navigation */}
                <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

                {/* Tab-specific components */}
                {activeTab === "meteo" && (
                  <MeteoTab
                    currentData={currentData}
                    dayData={dayData}
                    site={{ alt: site!.altitude, name: site!.name }}
                    thermalDelta={thermalDelta}
                    stabilityIndex={stability}
                    modelName="gfs_seamless"
                    cape={currentCape?.cape ?? null}
                    liftedIndex={currentCape?.liftedIndex ?? null}
                    cin={currentCape?.cin ?? null}
                  />
                )}

                {activeTab === "venti" && (
                  <VentiInterpolatiTab
                    lat={site!.lat}
                    lon={site!.lon}
                    quotaDecollo={site!.altitude}
                    selectedDay={selectedDay}
                    oraCorrente={selectedHour}
                    onOraChange={setSelectedHour}
                    siteName={site!.name}
                  />
                )}

                {activeTab === "termiche" && (
                  <TermicheTab
                    currentData={currentData}
                    dayData={dayData}
                    site={{ alt: site!.altitude, lat: site!.lat, lon: site!.lon, name: site!.name }}
                  />
                )}

                {activeTab === "analisi" && (
                  <AnalisiMeteo
                    dayData={dayData}
                  />
                )}

                {/* Windgram component */}
                <Windgram
                  lat={site!.lat}
                  lon={site!.lon}
                  quotaDecollo={site!.altitude}
                  siteName={site!.name}
                  selectedDay={selectedDay}
                />
              </>
            )}

            {/* Fallback when no data */}
            {!hasData && (
              <div className="text-center py-12 text-slate-400">
                <p>Nessun dato meteo disponibile per {site?.name ?? "questo decollo"}.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

// Helper function for date formatting
function formatDateShort(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export default Index;