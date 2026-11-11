"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileImage, FileText, Sparkles, Wind, CloudSun, ShieldAlert, ArrowRight, MessageCircle, Loader2, Check, CalendarDays } from "lucide-react";
import { generateForecast, type ForecastAnalysis } from "@/utils/ForecastAnalyzer";
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

interface ReportAICardProps {
  siteName: string;
  elevation?: number;
  province?: string;
  lat?: number;
  lon?: number;
  current: MeteoCurrent | null;
  hourly: MeteoHourly[];
  /** JSON grezzo Open-Meteo condiviso (serve per il report dell'analisi sul retro). */
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
  onGenerate?: (analysis: ForecastAnalysis) => void;
}

type BusyKind = "make" | "jpg" | "png" | "pdf" | "wa" | null;

export default function ReportAICard({ siteName, elevation, province, lat, lon, current, hourly, rawData, daily = [], onGenerate }: ReportAICardProps) {
  const [analysis, setAnalysis] = useState<ForecastAnalysis | null>(null);
  const [generated, setGenerated] = useState(false);
  const [busy, setBusy] = useState<BusyKind>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [previewFront, setPreviewFront] = useState<{ url: string; blob: Blob } | null>(null);
  const [previewBack, setPreviewBack] = useState<{ url: string; blob: Blob } | null>(null);
  /** Pagine già prodotte (fronte + retro): i formati di scarico le riusano senza rigenerare. */
  const pagesCache = useRef<{ front: Blob; back: Blob } | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  /** 0 = oggi · 1 = domani · 2 = dopodomani (i pulsanti della paletta). */
  const [giorno, setGiorno] = useState(0);
  const [soundings, setSoundings] = useState<Record<number, LocandinaSounding | null>>({});
  /** Immagine del windgram REALE della pagina, catturata dal componente nascosto. */
  const [windgramImg, setWindgramImg] = useState<string | null>(null);
  /** Specchi refs per usare gli ultimi valori dentro funzioni async (niente closure stantii). */
  const windgramRef = useRef<string | null>(null);
  windgramRef.current = windgramImg;

  useEffect(() => {
    setWindgramImg(null);
  }, [giorno, lat, lon, elevation]);

  /* --- giorno scelto: data e ore del giorno (la previsione deve parlare di QUEL giorno) --- */
  const dayDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + giorno);
    d.setHours(12, 0, 0, 0);
    return d;
  }, [giorno]);

  const dayHourly = useMemo(() => {
    const key = dayDate.toDateString();
    const rows = hourly.filter((h) => h.time instanceof Date && h.time.toDateString() === key);
    return rows.length ? rows : giorno === 0 ? hourly : [];
  }, [hourly, dayDate, giorno]);

  /* valutazione e probabilità calcolate SOLO sulle ore del giorno scelto */
  const computed = useMemo(
    () => generateForecast(siteName, current, dayHourly.length ? dayHourly : hourly, daily[giorno] ? [daily[giorno]] : daily),
    [siteName, current, dayHourly, hourly, daily, giorno],
  );
  const active = analysis ?? computed;

  useEffect(() => {
    setAnalysis(null);
    setGenerated(false);
    setBusy(null);
    setShareHint(null);
    pagesCache.current = null;
    setPreviewFront((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
    setPreviewBack((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
  }, [siteName, current, dayHourly, daily, giorno]);

  /* --- report dell'analisi meteo (generateReportMeteo, le stesse parole della scheda Analisi) --- */
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

  /* Sounding per il windgram: una chiamata per decollo/giorno scelto (cache per giorno),
     con timeout e fallback silenzioso (il poster stima il profilo dai dati base). */
  useEffect(() => {
    if (lat == null || lon == null) return;
    if (soundings[giorno] !== undefined) return;
    let cancelled = false;
    const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 9000));
    Promise.race([fetchSounding(lat, lon, elevation ?? 1500, giorno), timeout])
      .then((s) => {
        if (!cancelled) setSoundings((old) => ({ ...old, [giorno]: s }));
      })
      .catch(() => {
        if (!cancelled) setSoundings((old) => ({ ...old, [giorno]: null }));
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon, elevation, giorno, soundings]);

  useEffect(
    () => () => {
      if (previewFront) URL.revokeObjectURL(previewFront.url);
      if (previewBack) URL.revokeObjectURL(previewBack.url);
    },
    [previewFront, previewBack],
  );

  const buildInput = (): LocandinaInput => ({
    siteName,
    province,
    date: dayDate,
    elevation: elevation ?? 1500,
    current,
    hourly: dayHourly.length ? dayHourly : hourly,
    daily: daily[giorno] ?? null,
    report: active.report,
    probabilities: active.probabilities,
    sounding: soundings[giorno] ?? null,
    analisiReport,
    windgramImage: windgramImg,
  });
  const buildInputRef = useRef(buildInput);
  buildInputRef.current = buildInput;

  /* Il retro usa il windgram REALE: se la cattura è in corso aspetta fino a 6 s,
     poi procede comunque (il poster stima il profilo dai dati base). */
  const waitForWindgram = async (): Promise<string | null> => {
    for (let i = 0; i < 20; i++) {
      if (windgramRef.current) return windgramRef.current;
      await new Promise((r) => window.setTimeout(r, 300));
    }
    return windgramRef.current;
  };

  /* PRODUCI REPORT: un clic → le 2 pagine A4 (fronte + retro) generate SUBITO
     e mostrate in anteprima; il download arriva dopo, col formato scelto. */
  const handleProduce = async () => {
    setBusy("make");
    setShareHint(null);
    try {
      const next = computed;
      setAnalysis(next);
      setGenerated(true);
      onGenerate?.(next);
      await waitForWindgram();
      const pages = await generateLocandinaPages(buildInputRef.current(), 2480);
      pagesCache.current = { front: pages.locandina, back: pages.informazioni };
      setPreviewFront((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { url: URL.createObjectURL(pages.locandina), blob: pages.locandina };
      });
      setPreviewBack((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return { url: URL.createObjectURL(pages.informazioni), blob: pages.informazioni };
      });
      setShareHint("Report pronto: qui sotto vedi le 2 pagine A4. Scegli il formato per scaricarlo.");
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      console.error("produci report", err);
      setShareHint("Generazione non riuscita: riprova tra qualche secondo.");
    } finally {
      setBusy(null);
    }
  };

  /* Se le pagine non sono ancora state prodotte, le genera al volo (es. evento dalla paletta). */
  const getPages = async (): Promise<{ front: Blob; back: Blob }> => {
    if (pagesCache.current) return pagesCache.current;
    await waitForWindgram();
    const pages = await generateLocandinaPages(buildInputRef.current(), 2480);
    pagesCache.current = { front: pages.locandina, back: pages.informazioni };
    setPreviewFront((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return { url: URL.createObjectURL(pages.locandina), blob: pages.locandina };
    });
    setPreviewBack((old) => {
      if (old) URL.revokeObjectURL(old.url);
      return { url: URL.createObjectURL(pages.informazioni), blob: pages.informazioni };
    });
    return pagesCache.current;
  };

  const handleDownload = async (type: "jpg" | "png" | "pdf") => {
    setBusy(type);
    setShareHint(null);
    try {
      const { front, back } = await getPages();
      if (type === "pdf") {
        const pdf = await jpegsToPdfBlob([front, back]);
        triggerDownload(pdf, locandinaFilename(siteName, dayDate, "pdf"));
        setShareHint("PDF A4 scaricato (300 DPI): 2 pagine — fronte (venti reali in quota) + retro (report e windgram).");
      } else {
        const mime = type === "png" ? "image/png" : "image/jpeg";
        const combined = await combineLocandinaPages(front, back, mime);
        triggerDownload(combined, locandinaFilename(siteName, dayDate, `report.${type}`));
        setShareHint(
          type === "png"
            ? "PNG scaricato: le 2 pagine A4 del report in un'unica immagine ad alta definizione (300 DPI)."
            : "JPG scaricato: le 2 pagine A4 del report in un'unica immagine ad alta definizione (300 DPI).",
        );
      }
    } catch (err) {
      console.error("locandina", err);
      setShareHint("Generazione non riuscita: riprova tra qualche secondo.");
    } finally {
      setBusy(null);
    }
  };

  /* «Genera report esportabile» dalla paletta a sinistra: produce le 2 pagine e mostra l'anteprima. */
  const produceRef = useRef(handleProduce);
  produceRef.current = handleProduce;
  useEffect(() => {
    const handler = () => { void produceRef.current(); };
    window.addEventListener("meteo-dei-conigli:export-report", handler);
    return () => window.removeEventListener("meteo-dei-conigli:export-report", handler);
  }, []);

  /* Condivisione WhatsApp: su mobile usa la Web Share API nativa con il file
     (WhatsApp compare tra i target); su desktop scarica il JPG e apre
     WhatsApp Web con il testo già pronto da incollare. */
  const handleWhatsApp = async () => {
    setBusy("wa");
    setShareHint(null);
    try {
      const { front, back } = await getPages();
      const combined = await combineLocandinaPages(front, back, "image/jpeg");
      const filename = locandinaFilename(siteName, dayDate, "report.jpg");
      const file = new File([combined], filename, { type: "image/jpeg" });
      const d = active;
      const dayLabel = dayDate.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
      const text =
        `🪂 Locandina meteo volo libero — ${siteName}\n` +
        `📅 ${dayLabel}\n` +
        `🚦 ${d.semaforo} · Finestra migliore ${d.windows.midday}\n` +
        `💨 Probabilità volabile ${d.probabilities.flyable}%\n` +
        `📍 la-meteo-dei-conigli.vercel.app`;
      const shareData = { files: [file], title: `Locandina meteo — ${siteName}`, text };
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (typeof navigator.share === "function" && nav.canShare?.(shareData)) {
        await navigator.share(shareData);
        setShareHint("Condiviso! Se WhatsApp non era aperto, scegli l'app dalla finestra di condivisione.");
      } else {
        triggerDownload(combined, filename);
        /* api.whatsapp.com direttamente: wa.me corrompe le emoji nel redirect (U+FFFD). */
        window.open(`https://api.whatsapp.com/send/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
        setShareHint("Report JPG scaricato (2 pagine in un'immagine): su computer WhatsApp non riceve file automaticamente — allegalo alla chat che si è aperta.");
      }
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") {
        setShareHint(null);
      } else {
        console.error("whatsapp share", err);
        setShareHint("Condivisione non riuscita: scarica il JPG e allegalo manualmente.");
      }
    } finally {
      setBusy(null);
    }
  };

  const theme =
    active.semaforo === "GO"
      ? { color: "#1D8F5F", text: "GO" }
      : active.semaforo === "ATTENZIONE"
        ? { color: "#D97A2B", text: "ATTENZIONE" }
        : { color: "#A34E44", text: "NO GO" };

  const buttonStyle = (selected: boolean, accent = "#193029") => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    border: `1px solid ${selected ? accent : "rgba(25,48,41,0.22)"}`,
    background: selected ? "linear-gradient(135deg, #193029 0%, #1D8F5F 100%)" : "white",
    padding: "9px 10px",
    color: selected ? "white" : "#193029",
    fontWeight: 700,
    fontSize: 13,
    boxShadow: selected ? "0 10px 18px rgba(25,48,41,0.22)" : "none",
    cursor: busy ? "wait" : "pointer",
    transition: "all 0.2s ease",
  } as const);

  /* Prima si vede l'anteprima, poi si scarica: i formati si abilitano solo
     quando le 2 pagine del report sono pronte. */
  const pagesNotReady = !(previewFront && previewBack);

  return (
    <section className="flight-side-card report-ai-card" style={{ background: "linear-gradient(180deg, #f6faf7 0%, #eaf3ee 100%)", border: "1px solid rgba(25, 48, 41, 0.25)", color: "#1B211E" }}>
      <div className="flight-subsection-heading" style={{ marginBottom: 12 }}>
        <div>
          <span>LOCANDINA</span>
          <h2 style={{ color: "#193029" }}>LOCANDINA METEO VOLO</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#33574B", fontWeight: 600 }}>
            Report 2 pagine A4 — PDF · PNG · JPG · WhatsApp
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, background: "#193029", color: "white" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.8 }}>Decollo</div>
            <div style={{ fontSize: 16, fontWeight: 700, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{siteName}</div>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>{elevation ? `${elevation} m` : ""}{province ? ` · ${province}` : ""}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.8 }}>Voto</div>
            <div style={{ borderRadius: 999, padding: "8px 12px", background: theme.color, color: "white", fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>{active.semaforo}</div>
          </div>
        </div>

        {/* --- pulsanti del giorno: la locandina può parlare di oggi, domani o dopodomani --- */}
        <div style={{ display: "flex", gap: 6 }}>
          {([0, 1, 2] as const).map((g) => {
            const label = g === 0 ? "OGGI" : g === 1 ? "DOMANI" : "DOPODOMANI";
            const dt = new Date();
            dt.setDate(dt.getDate() + g);
            const sub = dt.toLocaleDateString("it-IT", { weekday: "short", day: "numeric" });
            const sel = giorno === g;
            return (
              <button
                key={g}
                type="button"
                data-testid={`locandina-giorno-${g}`}
                aria-pressed={sel}
                onClick={() => setGiorno(g)}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                  borderRadius: 10,
                  border: `1px solid ${sel ? "#193029" : "rgba(25,48,41,0.22)"}`,
                  background: sel ? "linear-gradient(135deg, #193029 0%, #1D8F5F 100%)" : "white",
                  color: sel ? "white" : "#193029",
                  padding: "7px 4px",
                  cursor: "pointer",
                  boxShadow: sel ? "0 8px 16px rgba(25,48,41,0.20)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 800, fontSize: 11.5, letterSpacing: 0.4 }}>
                  <CalendarDays size={12} /> {label}
                </span>
                <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 600, textTransform: "capitalize" }}>{sub}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRadius: 10, background: generated ? "rgba(29,143,95,0.12)" : "rgba(25,48,41,0.06)", border: "1px solid rgba(25,48,41,0.14)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#193029" }}>Valutazione: {active.verdictLabel}</span>
          <span style={{ fontSize: 12, color: "#3B4742" }}>{generated ? "Generato" : "Pronto"}</span>
        </div>

        <button
          type="button"
          onClick={() => void handleProduce()}
          disabled={busy !== null}
          data-testid="locandina-produci"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            border: "1px solid rgba(49, 206, 139, 0.4)",
            borderRadius: 12,
            padding: "12px 16px",
            background: "linear-gradient(135deg, #193029 0%, #1D8F5F 100%)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: busy ? "wait" : "pointer",
            boxShadow: "0 10px 24px rgba(29, 143, 95, 0.3)",
            opacity: busy && busy !== "make" ? 0.65 : 1,
          }}
        >
          {busy === "make" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {busy === "make" ? "PRODUCO LE 2 PAGINE…" : "PRODUCI REPORT"}
        </button>

        <div style={{ display: "grid", gap: 10, fontSize: 13, color: "#2A332E" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "rgba(25,48,41,0.06)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><CloudSun size={14} /> Probabilità volabile</span>
            <strong>{active.probabilities.flyable}%</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "rgba(29,143,95,0.10)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Wind size={14} /> Probabilità termiche</span>
            <strong>{active.probabilities.thermal}%</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "rgba(217,122,43,0.10)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><ShieldAlert size={14} /> Probabilità vento favorevole</span>
            <strong>{active.probabilities.wind}%</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "rgba(163,78,68,0.10)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><ArrowRight size={14} /> Probabilità temporali</span>
            <strong>{active.probabilities.storm}%</strong>
          </div>
        </div>

        <div style={{ padding: "12px 14px", borderRadius: 12, background: "#ffffff", border: "1px solid rgba(25,48,41,0.14)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#193029", marginBottom: 8 }}>
            <Sparkles size={15} /> REPORT AI
          </div>
          <p style={{ margin: 0, lineHeight: 1.6, fontSize: 13, color: "#2A332E" }}>
            {active.report}
          </p>
        </div>

        {(previewFront || previewBack) && (
          <div
            ref={previewRef}
            data-testid="locandina-anteprima"
            style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(25,48,41,0.2)", maxHeight: 460, overflowY: "auto", background: "#F2F5F3" }}
          >
            {previewFront && (
              <img
                src={previewFront.url}
                alt="Anteprima fronte del report (template parapendio)"
                style={{ display: "block", width: "100%", height: "auto" }}
              />
            )}
            {previewBack && (
              <img
                src={previewBack.url}
                alt="Anteprima retro del report (analisi della giornata e windgram)"
                style={{ display: "block", width: "100%", height: "auto", borderTop: "2px solid rgba(25,48,41,0.18)" }}
              />
            )}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" disabled={pagesNotReady || busy !== null} onClick={() => void handleDownload("pdf")} style={buttonStyle(busy === "pdf")} title="PDF A4: le 2 pagine (fronte + retro)">
            {busy === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} PDF
          </button>
          <button type="button" disabled={pagesNotReady || busy !== null} onClick={() => void handleDownload("png")} style={buttonStyle(busy === "png")} title="PNG: le 2 pagine in un'unica immagine">
            {busy === "png" ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />} PNG
          </button>
          <button type="button" disabled={pagesNotReady || busy !== null} onClick={() => void handleDownload("jpg")} style={buttonStyle(busy === "jpg")} title="JPG: le 2 pagine in un'unica immagine">
            {busy === "jpg" ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />} JPG
          </button>
          <button
            type="button"
            disabled={pagesNotReady || busy !== null}
            onClick={() => void handleWhatsApp()}
            aria-label="Condividi il report (2 pagine) su WhatsApp"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              borderRadius: 10,
              border: "1px solid rgba(37, 211, 102, 0.6)",
              background: busy === "wa" ? "#128C4B" : "linear-gradient(135deg, #25D366 0%, #128C4B 100%)",
              padding: "9px 12px",
              color: "white",
              fontWeight: 800,
              fontSize: 13,
              cursor: busy ? "wait" : "pointer",
              boxShadow: "0 8px 18px rgba(37, 211, 102, 0.28)",
              transition: "all 0.2s ease",
            }}
          >
            {busy === "wa" ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
            {busy === "wa" ? "Preparo…" : "WhatsApp"}
            {busy !== "wa" && <Download size={12} style={{ opacity: 0.8 }} />}
          </button>
        </div>

        {shareHint && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 11px", borderRadius: 10, background: "rgba(29,143,95,0.10)", border: "1px solid rgba(29,143,95,0.25)", fontSize: 12, color: "#1F5C3D", lineHeight: 1.5 }}>
            <Check size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{shareHint}</span>
          </div>
        )}
      </div>

      {/* Windgram REALE della pagina (nascosto): il retro della locandina
          mostra il grafico identico alla scheda Venti. Non occupa spazio. */}
      {lat != null && lon != null && (
        <PosterWindgram
          latitude={lat}
          longitude={lon}
          altitude={elevation ?? 1500}
          siteName={siteName}
          selectedDay={giorno}
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
