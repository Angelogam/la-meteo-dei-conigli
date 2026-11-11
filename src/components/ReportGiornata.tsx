"use client";

/* REPORT DELLA GIORNATA — la scheda «Report» mostra le 2 pagine A4 del report
   (le stesse della locandina: venti in quota dal modello, termiche per fascia,
   windgram reale, analisi, finestra di volo) per il giorno scelto nelle
   previsioni. Niente dashboard di numeri: la pagina È il report.
   Generazione automatica quando la scheda arriva in vista (lazy), cache per giorno. */

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, FileText, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { generateForecast } from "@/utils/ForecastAnalyzer";
import { generateReportMeteo } from "@/utils/generateReportMeteo";
import {
  combineLocandinaPages,
  generateLocandinaPages,
  locandinaFilename,
  type LocandinaInput,
  type LocandinaSounding,
  type AnalisiReport,
} from "@/utils/PosterGenerator";
import { jpegsToPdfBlob } from "@/utils/PdfGenerator";
import { fetchSounding } from "@/utils/sounding";
import PosterWindgram from "@/components/PosterWindgram";
import type { MeteoCurrent, MeteoHourly } from "@/services/openMeteoService";
import type { OpenMeteoRawResponse } from "@/types/meteo";
import "./report-giornata.css";

interface ReportGiornataProps {
  siteName: string;
  elevation?: number;
  lat?: number;
  lon?: number;
  current: MeteoCurrent | null;
  hourly: MeteoHourly[];
  rawData?: OpenMeteoRawResponse | null;
  daily?: Array<{
    tempMax?: number | null;
    tempMin?: number | null;
    temperatureMax?: number | null;
    weatherCode?: number | null;
    precipitationProbabilityMax?: number | null;
    precipitationSum?: number | null;
    sunrise?: string | Date | null;
    sunset?: string | Date | null;
    uvIndexMax?: number | null;
  }>;
  /** Giorno scelto nelle previsioni: 0 = oggi · 1 = domani · 2 = dopodomani. */
  selectedDay: number;
  /** Cambia il giorno del report direttamente dai bottoni della card. */
  onSelectDay?: (day: number) => void;
}

type Status = "idle" | "working" | "ready" | "error";
type ExportKind = "pdf" | "png" | "jpg" | "wa";

export default function ReportGiornata({
  siteName,
  elevation,
  lat,
  lon,
  current,
  hourly,
  rawData,
  daily = [],
  selectedDay,
  onSelectDay,
}: ReportGiornataProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [pages, setPages] = useState<{ front: string; back: string } | null>(null);
  const [attempts, setAttempts] = useState(0);

  /* --- windgram REALE catturato dal componente nascosto (come la locandina) --- */
  const [windgramImg, setWindgramImg] = useState<string | null>(null);
  const windgramRef = useRef<string | null>(null);
  windgramRef.current = windgramImg;

  /* --- sounding del modello: cache per giorno, timeout e fallback silenzioso --- */
  const [soundings, setSoundings] = useState<Record<number, LocandinaSounding | null>>({});

  useEffect(() => {
    setWindgramImg(null);
  }, [selectedDay, lat, lon, elevation]);

  useEffect(() => {
    if (lat == null || lon == null) return;
    if (soundings[selectedDay] !== undefined) return;
    let cancelled = false;
    const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 9000));
    Promise.race([fetchSounding(lat, lon, elevation ?? 1500, selectedDay), timeout])
      .then((s) => {
        if (!cancelled) setSoundings((old) => ({ ...old, [selectedDay]: s }));
      })
      .catch(() => {
        if (!cancelled) setSoundings((old) => ({ ...old, [selectedDay]: null }));
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon, elevation, selectedDay, soundings]);

  /* --- data e ore del giorno scelto --- */
  const dayDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDay);
    d.setHours(12, 0, 0, 0);
    return d;
  }, [selectedDay]);

  const dayHourly = useMemo(() => {
    const key = dayDate.toDateString();
    const rows = hourly.filter((h) => h.time instanceof Date && h.time.toDateString() === key);
    return rows.length ? rows : selectedDay === 0 ? hourly : [];
  }, [hourly, dayDate, selectedDay]);

  const computed = useMemo(
    () => generateForecast(siteName, current, dayHourly.length ? dayHourly : hourly, daily[selectedDay] ? [daily[selectedDay]] : daily),
    [siteName, current, dayHourly, hourly, daily, selectedDay],
  );

  /* --- report testuale dell'analisi (le stesse parole della locandina) --- */
  const analisiReport = useMemo<AnalisiReport | null>(() => {
    const rawHourly = (rawData?.hourly ?? null) as Record<string, unknown> | null;
    const times = (rawHourly?.time as string[] | undefined) ?? [];
    if (!times.length) return null;
    const key = dayDate.toDateString();
    const keep: number[] = [];
    times.forEach((t, i) => {
      if (new Date(t).toDateString() === key) keep.push(i);
    });
    if (!keep.length) return null;
    const series = (name: string): Array<number | null> => {
      const arr = rawHourly?.[name];
      if (!Array.isArray(arr)) return [];
      return keep.map((i) => (typeof arr[i] === "number" ? (arr[i] as number) : null));
    };
    const strings = (name: string): string[] => {
      const arr = rawHourly?.[name];
      return Array.isArray(arr) ? keep.map((i) => (arr[i] != null ? String(arr[i]) : "")) : [];
    };
    const gusts = series("wind_gusts_10m");
    const r = generateReportMeteo({
      siteName,
      altitude: elevation ?? 1500,
      dateObj: dayDate,
      hourlyData: {
        time: keep.map((i) => times[i]),
        temperature_2m: series("temperature_2m"),
        dew_point_2m: series("dew_point_2m"),
        precipitation: series("precipitation"),
        cloud_cover: series("cloud_cover"),
        wind_speed_10m: series("wind_speed_10m"),
        wind_direction_10m: series("wind_direction_10m"),
        wind_gusts_10m: gusts.length ? gusts : keep.map(() => 0),
        weather_code: strings("weather_code").map((c) => (c ? Number(c) : 0)),
        cape: series("cape").length ? series("cape") : keep.map(() => 0),
        freezing_level_height: series("freezing_level_height").length ? series("freezing_level_height") : keep.map(() => 3600),
        shortwave_radiation: series("shortwave_radiation").length ? series("shortwave_radiation") : keep.map(() => 400),
        lifted_index: series("lifted_index"),
        convective_inhibition: series("convective_inhibition"),
        boundary_layer_height: series("boundary_layer_height"),
      },
    });
    if (!r) return null;
    return {
      quadroTermico: r.paragrafoTermico,
      ventoQuota: r.paragrafoVento,
      strategia: r.paragrafoStrategia,
      giudizioFinale: r.giudizioFinale,
      segnaliPericolo: r.segnaliPericolo,
    };
  }, [rawData, siteName, elevation, dayDate]);

  const buildInput = (): LocandinaInput => ({
    siteName,
    date: dayDate,
    elevation: elevation ?? 1500,
    current,
    hourly: dayHourly.length ? dayHourly : hourly,
    daily: daily[selectedDay] ?? null,
    report: computed.report,
    probabilities: computed.probabilities,
    sounding: soundings[selectedDay] ?? null,
    analisiReport,
    windgramImage: windgramImg,
  });
  const buildInputRef = useRef(buildInput);
  buildInputRef.current = buildInput;

  /* --- cache per (decolo, giorno): rientrare nella scheda non rigenera --- */
  const cacheRef = useRef<Map<string, { front: Blob; back: Blob }>>(new Map());
  const urlsRef = useRef<{ front: string; back: string } | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const visibleRef = useRef(false);
  const generatingRef = useRef(false);

  const waitForWindgram = async (): Promise<string | null> => {
    for (let i = 0; i < 20; i++) {
      if (windgramRef.current) return windgramRef.current;
      await new Promise((r) => window.setTimeout(r, 300));
    }
    return windgramRef.current;
  };

  const showPages = (front: Blob, back: Blob) => {
    const next = { front: URL.createObjectURL(front), back: URL.createObjectURL(back) };
    setPages((old) => {
      if (old) {
        URL.revokeObjectURL(old.front);
        URL.revokeObjectURL(old.back);
      }
      return next;
    });
  };

  const generate = async () => {
    if (generatingRef.current) return;
    generatingRef.current = true;
    setStatus("working");
    try {
      const key = `${siteName}-${selectedDay}`;
      const cached = cacheRef.current.get(key);
      if (cached) {
        showPages(cached.front, cached.back);
        setStatus("ready");
        return;
      }
      await waitForWindgram();
      const out = await generateLocandinaPages(buildInputRef.current(), 1400);
      cacheRef.current.set(key, { front: out.locandina, back: out.informazioni });
      showPages(out.locandina, out.informazioni);
      setStatus("ready");
    } catch (err) {
      console.error("report giornata", err);
      setStatus("error");
    } finally {
      generatingRef.current = false;
    }
  };

  /* Generazione lazy: parte quando la scheda entra in vista (rootMargin largo),
     poi a ogni cambio giorno/decolo mentre la scheda resta visibile. */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            visibleRef.current = true;
            void generate();
            break;
          }
        }
      },
      { rootMargin: "700px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (visibleRef.current) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, siteName, attempts]);

  useEffect(
    () => () => {
      if (urlsRef.current) {
        URL.revokeObjectURL(urlsRef.current.front);
        URL.revokeObjectURL(urlsRef.current.back);
      }
    },
    [],
  );

  const dayLabel = dayDate.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, (c) => c.toUpperCase());

  /* ── ESPORTAZIONI DIRETTE DALLA CARD: PDF · PNG · JPG · WhatsApp ──
     Riutilizzano la cache delle pagine già generate; se mancano le
     rigenerano a 2480px (300 DPI). WhatsApp: Web Share API con il file
     dove disponibile, altrimenti JPG scaricato + WhatsApp con il testo pronto. */
  const [exportBusy, setExportBusy] = useState<ExportKind | null>(null);
  const [exportHint, setExportHint] = useState<string | null>(null);

  const getPagesForExport = async (): Promise<{ front: Blob; back: Blob }> => {
    const key = `${siteName}-${selectedDay}`;
    const cached = cacheRef.current.get(key);
    if (cached) return cached;
    await waitForWindgram();
    const out = await generateLocandinaPages(buildInputRef.current(), 2480);
    cacheRef.current.set(key, { front: out.locandina, back: out.informazioni });
    return { front: out.locandina, back: out.informazioni };
  };

  const handleExport = async (kind: ExportKind) => {
    if (exportBusy) return;
    setExportBusy(kind);
    setExportHint(null);
    try {
      const { front, back } = await getPagesForExport();
      if (kind === "wa") {
        const combined = await combineLocandinaPages(front, back, "image/jpeg");
        const filename = locandinaFilename(siteName, dayDate, "report.jpg");
        const file = new File([combined], filename, { type: "image/jpeg" });
        const d = computed;
        const text =
          `🪂 Report meteo volo libero — ${siteName}\n` +
          `📅 ${dayLabel}\n` +
          `🚦 ${d?.semaforo ?? ""} · Probabilità volabile ${d?.probabilities?.flyable ?? "n/d"}%\n` +
          `📍 la-meteo-dei-conigli.vercel.app`;
        const shareData = { files: [file], title: `Report meteo — ${siteName}`, text };
        const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
        if (typeof navigator.share === "function" && nav.canShare?.(shareData)) {
          await navigator.share(shareData);
          setExportHint("Condiviso! Se WhatsApp non si è aperto, scegli l'app dalla finestra di condivisione.");
        } else {
          triggerDownload(combined, filename);
          /* api.whatsapp.com direttamente: wa.me decodifica la query come Latin-1
             nel redirect e trasforma le emoji in U+FFFD («� Report meteo…»). */
          window.open(`https://api.whatsapp.com/send/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
          setExportHint("Report JPG scaricato: su computer allegalo alla chat WhatsApp che si è aperta.");
        }
        return;
      }
      if (kind === "pdf") {
        const pdf = await jpegsToPdfBlob([front, back]);
        triggerDownload(pdf, locandinaFilename(siteName, dayDate, "pdf"));
        setExportHint("PDF A4 (300 DPI) scaricato: fronte venti in quota + retro analisi e windgram.");
      } else {
        const combined = await combineLocandinaPages(front, back, kind === "png" ? "image/png" : "image/jpeg");
        triggerDownload(combined, locandinaFilename(siteName, dayDate, `report.${kind}`));
        setExportHint(kind === "png" ? "PNG scaricato: le 2 pagine A4 in un'unica immagine (300 DPI)." : "JPG scaricato: le 2 pagine A4 in un'unica immagine (300 DPI).");
      }
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") setExportHint(null);
      else {
        console.error("report export", err);
        setExportHint("Esportazione non riuscita: riprova tra qualche secondo.");
      }
    } finally {
      setExportBusy(null);
    }
  };

  const giorni = ["Oggi", "Domani", "Dopodomani"];

  return (
    <section className="report-giornata" ref={sectionRef} aria-label={`Report della giornata per ${siteName}, ${dayLabel}`}>
        <div className="flight-subsection-heading">
        <div>
          <span>REPORT DELLA GIORNATA</span>
          <h2>
            {siteName} · {dayLabel}
          </h2>
          <p>
            Il report del decollo per il giorno scelto: venti in quota dal modello, termiche per fascia oraria,
            windgram aerologico, analisi e finestra di volo. Cambia giorno con i bottoni <strong>Oggi / Domani / Dopodomani</strong>
            {" "}e scaricalo in PDF, PNG, JPG o condividilo su WhatsApp con i pulsanti della card.
          </p>
        </div>
        <small>
          <CalendarDays aria-hidden="true" /> come la richiesta di un pilota
        </small>
      </div>

      <div className="report-giornata__stage" data-testid="report-giornata-stage" data-status={status}>
        {/* Toolbar: giorno del report + download + WhatsApp, direttamente nella card */}
        <div className="report-giornata__toolbar">
          <div className="report-giornata__days" role="group" aria-label="Giorno del report">
            {giorni.map((g, i) => (
              <button
                key={g}
                type="button"
                data-testid={`report-giorno-${i}`}
                className={`report-giornata__day${i === selectedDay ? " is-active" : ""}`}
                aria-pressed={i === selectedDay}
                onClick={() => onSelectDay?.(i)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="report-giornata__exports" role="group" aria-label="Scarica o condividi il report">
            {([
              ["pdf", "PDF"],
              ["png", "PNG"],
              ["jpg", "JPG"],
            ] as Array<[ExportKind, string]>).map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                className="report-giornata__export"
                disabled={exportBusy != null}
                onClick={() => void handleExport(kind)}
              >
                {exportBusy === kind ? <Loader2 className="report-giornata__spin" aria-hidden="true" /> : null}
                {label}
              </button>
            ))}
            <button
              type="button"
              className="report-giornata__export report-giornata__export--wa"
              disabled={exportBusy != null}
              title="Scarica il report JPG e apri WhatsApp con il testo pronto"
              onClick={() => void handleExport("wa")}
            >
              {exportBusy === "wa" ? <Loader2 className="report-giornata__spin" aria-hidden="true" /> : <MessageCircle aria-hidden="true" />}
              Scarica ora su WhatsApp
            </button>
          </div>
        </div>
        {exportHint && <p className="report-giornata__hint" role="status">{exportHint}</p>}
        {status === "idle" && (
          <div className="report-giornata__note">
            <Loader2 className="report-giornata__spin" aria-hidden="true" />
            Il report parte appena arrivi su questa scheda…
          </div>
        )}
        {status === "working" && (
          <div className="report-giornata__note">
            <Loader2 className="report-giornata__spin" aria-hidden="true" />
            Genero il report 2 pagine A4 — sounding del modello, windgram e analisi…
          </div>
        )}
        {status === "error" && (
          <div className="report-giornata__note report-giornata__note--error">
            <FileText aria-hidden="true" />
            <span>Generazione non riuscita (modello o dati non raggiungibili).</span>
            <button type="button" onClick={() => setAttempts((a) => a + 1)}>
              <RefreshCw aria-hidden="true" /> Riprova
            </button>
          </div>
        )}
        {status === "ready" && pages && (
          <div className="report-giornata__pages">
            <figure className="report-giornata__doc">
              <figcaption className="report-giornata__doc-tag">
                <FileText size={12} aria-hidden="true" /> Pagina 1 · Venti in quota e termiche
              </figcaption>
              <img className="report-giornata__page" src={pages.front} alt={`Report pagina 1 — bollettino venti e termiche per ${siteName}, ${dayLabel}`} draggable={false} />
            </figure>
            <figure className="report-giornata__doc">
              <figcaption className="report-giornata__doc-tag">
                <FileText size={12} aria-hidden="true" /> Pagina 2 · Analisi della giornata e windgram
              </figcaption>
              <img className="report-giornata__page" src={pages.back} alt={`Report pagina 2 — analisi della giornata e windgram per ${siteName}, ${dayLabel}`} draggable={false} />
            </figure>
          </div>
        )}
      </div>

      {/* Windgram REALE della pagina (nascosto): il retro del report mostra
          il grafico identico alla scheda Venti. Non occupa spazio. */}
      {lat != null && lon != null && (
        <PosterWindgram
          latitude={lat}
          longitude={lon}
          altitude={elevation ?? 1500}
          siteName={siteName}
          selectedDay={selectedDay}
          onCapture={setWindgramImg}
        />
      )}
    </section>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
