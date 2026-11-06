"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileImage, FileText, Sparkles, Wind, CloudSun, ShieldAlert, ArrowRight, MessageCircle, Loader2, Check, CalendarDays } from "lucide-react";
import { generateForecast, type ForecastAnalysis } from "@/utils/ForecastAnalyzer";
import { generateReportMeteo } from "@/utils/generateReportMeteo";
import {
  computeLocandinaData,
  generateLocandinaImageBlob,
  generateLocandinaPages,
  locandinaFilename,
  type LocandinaInput,
  type LocandinaSounding,
  type SoundingHour,
  type AnalisiReport,
} from "@/utils/PosterGenerator";
import { jpegsToPdfBlob } from "@/utils/PdfGenerator";
import { fetchHourly } from "@/lib/openMeteoClient";
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

type BusyKind = "jpg" | "png" | "retro" | "pdf" | "wa" | null;

/* Livelli hPa del sounding per il windgram della pagina retro. */
const SOUNDING_HPA = [925, 850, 800, 750, 700, 650, 600, 550, 500] as const;

const num = (v: unknown): number | null => {
  const n = Number(v);
  return v != null && Number.isFinite(n) ? n : null;
};

/** Sounding reale (temperature + geopotenziali + venti ai livelli hPa) per il windgram. */
async function fetchSounding(lat: number, lon: number, siteAlt: number, dayOffset = 0): Promise<LocandinaSounding> {
  const params = [
    ...SOUNDING_HPA.flatMap((p) => [
      `temperature_${p}hPa`,
      `geopotential_height_${p}hPa`,
      `wind_speed_${p}hPa`,
      `wind_direction_${p}hPa`,
    ]),
    "temperature_2m",
    "cloud_cover",
    "wind_speed_10m",
    "wind_direction_10m",
  ].join(",");
  const day = new Date();
  day.setDate(day.getDate() + dayOffset);
  const dayStr = [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, "0"),
    String(day.getDate()).padStart(2, "0"),
  ].join("-");
  const j = await fetchHourly(lat, lon, params, dayStr, dayStr);
  const H = (j as { hourly?: Record<string, unknown> }).hourly ?? {};
  const timeArr = (H.time as string[] | undefined) ?? [];
  const hours: SoundingHour[] = [];
  for (let hr = 8; hr <= 19; hr++) {
    const idx = timeArr.findIndex((t) => parseInt(String(t).split("T")[1].split(":")[0], 10) === hr);
    if (idx === -1) continue;
    const t2m = num(H.temperature_2m?.[idx]);
    const levels: SoundingHour["levels"] = [];
    if (t2m != null) {
      levels.push({
        hpa: 0,
        alt: siteAlt + 2,
        temp: t2m,
        speed: num(H.wind_speed_10m?.[idx]),
        dir: num(H.wind_direction_10m?.[idx]),
      });
    }
    for (const p of SOUNDING_HPA) {
      const alt = num(H[`geopotential_height_${p}hPa`]?.[idx]);
      if (alt == null || alt <= siteAlt + 50) continue;
      levels.push({
        hpa: p,
        alt: Math.round(alt),
        temp: num(H[`temperature_${p}hPa`]?.[idx]),
        speed: num(H[`wind_speed_${p}hPa`]?.[idx]),
        dir: num(H[`wind_direction_${p}hPa`]?.[idx]),
      });
    }
    hours.push({ hour: hr, temp2m: t2m, cloud: num(H.cloud_cover?.[idx]) ?? 0, levels });
  }
  if (!hours.length) throw new Error("sounding vuoto");
  return { siteAlt, hours, source: "modello" };
}

export default function ReportAICard({ siteName, elevation, province, lat, lon, current, hourly, rawData, daily = [], onGenerate }: ReportAICardProps) {
  const [analysis, setAnalysis] = useState<ForecastAnalysis | null>(null);
  const [generated, setGenerated] = useState(false);
  const [busy, setBusy] = useState<BusyKind>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [previewFront, setPreviewFront] = useState<{ url: string; blob: Blob } | null>(null);
  const [previewBack, setPreviewBack] = useState<{ url: string; blob: Blob } | null>(null);
  const [previewKind, setPreviewKind] = useState<"fronte" | "retro">("fronte");
  /** 0 = oggi · 1 = domani · 2 = dopodomani (i pulsanti della paletta). */
  const [giorno, setGiorno] = useState(0);
  const [soundings, setSoundings] = useState<Record<number, LocandinaSounding | null>>({});

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

  const handleGenerate = () => {
    const next = computed;
    setAnalysis(next);
    setGenerated(true);
    onGenerate?.(next);
  };

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
  });

  const makeJpeg = async (): Promise<{ blob: Blob; filename: string }> => {
    const blob = await generateLocandinaImageBlob(buildInput(), "jpg", { outWidth: 2160 });
    return { blob, filename: locandinaFilename(siteName, dayDate, "jpg") };
  };

  const makeRetroJpeg = async (): Promise<{ blob: Blob; filename: string }> => {
    const pages = await generateLocandinaPages(buildInput(), 2160);
    return { blob: pages.informazioni, filename: locandinaFilename(siteName, dayDate, "report.jpg") };
  };

  const rememberPreview = (blob: Blob, kind: "fronte" | "retro") => {
    const entry = { url: URL.createObjectURL(blob), blob };
    if (kind === "fronte") {
      setPreviewFront((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return entry;
      });
      setPreviewKind("fronte");
    } else {
      setPreviewBack((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return entry;
      });
      setPreviewKind("retro");
    }
  };

  const handleDownload = async (type: "jpg" | "png" | "retro" | "pdf") => {
    setBusy(type);
    setShareHint(null);
    try {
      const input = buildInput();
      if (type === "pdf") {
        const pages = await generateLocandinaPages(input, 2160);
        rememberPreview(pages.locandina, "fronte");
        rememberPreview(pages.informazioni, "retro");
        setPreviewKind("fronte");
        const pdf = await jpegsToPdfBlob([pages.locandina, pages.informazioni]);
        triggerDownload(pdf, locandinaFilename(siteName, dayDate, "pdf"));
      } else if (type === "jpg") {
        const { blob, filename } = await makeJpeg();
        rememberPreview(blob, "fronte");
        triggerDownload(blob, filename);
      } else if (type === "retro") {
        const { blob, filename } = await makeRetroJpeg();
        rememberPreview(blob, "retro");
        triggerDownload(blob, filename);
      } else {
        const blob = await generateLocandinaImageBlob(input, "png", { outWidth: 2160 });
        rememberPreview(blob, "fronte");
        triggerDownload(blob, locandinaFilename(siteName, dayDate, "png"));
      }
      setShareHint(
        type === "pdf"
          ? "PDF A4 scaricato: fronte (template parapendio) + retro (report giornaliero e windgram)."
          : type === "retro"
            ? "Retro scaricato: report giornaliero in testo, windgram e fasce termiche."
            : "File scaricato: lo trovi nella cartella Download.",
      );
    } catch (err) {
      console.error("locandina", err);
      setShareHint("Generazione non riuscita: riprova tra qualche secondo.");
    } finally {
      setBusy(null);
    }
  };

  /* «Genera un report esportabile» dalla paletta a sinistra: esporta il PDF A4. */
  const downloadRef = useRef(handleDownload);
  downloadRef.current = handleDownload;
  useEffect(() => {
    const handler = () => { void downloadRef.current("pdf"); };
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
      const { blob, filename } = await makeJpeg();
      rememberPreview(blob, "fronte");
      const file = new File([blob], filename, { type: "image/jpeg" });
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
        triggerDownload(blob, filename);
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
        setShareHint("JPG scaricato: su computer WhatsApp non riceve file automaticamente — allegalo alla chat che si è aperta.");
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

  return (
    <section className="flight-side-card report-ai-card" style={{ background: "linear-gradient(180deg, #f6faf7 0%, #eaf3ee 100%)", border: "1px solid rgba(25, 48, 41, 0.25)", color: "#1B211E" }}>
      <div className="flight-subsection-heading" style={{ marginBottom: 12 }}>
        <div>
          <span>LOCANDINA</span>
          <h2 style={{ color: "#193029" }}>LOCANDINA METEO VOLO</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#33574B", fontWeight: 600 }}>
            Report esportabile — JPG · PNG · PDF · WhatsApp
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
          onClick={handleGenerate}
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
            cursor: "pointer",
            boxShadow: "0 10px 24px rgba(29, 143, 95, 0.3)",
          }}
        >
          <Sparkles size={16} />
          GENERA LOCANDINA
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

        {previewFront || previewBack ? (
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(25,48,41,0.2)", maxHeight: 320, overflowY: "auto", background: "#F2F5F3" }}>
            {(previewFront && previewBack) && (
              <div style={{ display: "flex", gap: 6, padding: "8px 8px 0", position: "sticky", top: 0, zIndex: 2, background: "rgba(242,245,243,0.95)" }}>
                {(["fronte", "retro"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPreviewKind(k)}
                    style={{
                      flex: 1,
                      border: "1px solid " + (previewKind === k ? "#193029" : "rgba(25,48,41,0.22)"),
                      borderRadius: 8,
                      padding: "5px 8px",
                      background: previewKind === k ? "#193029" : "white",
                      color: previewKind === k ? "white" : "#193029",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {k === "fronte" ? "Fronte · template parapendio" : "Retro · report + windgram"}
                  </button>
                ))}
              </div>
            )}
            <img
              src={(previewKind === "retro" ? previewBack?.url : previewFront?.url) ?? ""}
              alt={previewKind === "retro" ? "Anteprima retro (report e windgram)" : "Anteprima fronte (template parapendio)"}
              style={{ display: "block", width: "100%", height: "auto" }}
            />
          </div>
        ) : null}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" disabled={busy !== null} onClick={() => void handleDownload("jpg")} style={buttonStyle(busy === "jpg")}>
            {busy === "jpg" ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />} JPG
          </button>
          <button type="button" disabled={busy !== null} onClick={() => void handleDownload("png")} style={buttonStyle(busy === "png")} title="Fronte in PNG">
            {busy === "png" ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />} PNG
          </button>
          <button type="button" disabled={busy !== null} onClick={() => void handleDownload("retro")} style={buttonStyle(busy === "retro")} title="Retro: report giornaliero, windgram e fasce termiche">
            {busy === "retro" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Retro
          </button>
          <button type="button" disabled={busy !== null} onClick={() => void handleDownload("pdf")} style={buttonStyle(busy === "pdf")}>
            {busy === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} PDF
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void handleWhatsApp()}
            aria-label="Condividi la locandina su WhatsApp"
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
