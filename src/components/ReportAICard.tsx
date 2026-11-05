"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileImage, FileText, Sparkles, Wind, CloudSun, ShieldAlert, ArrowRight, MessageCircle, Loader2, Check } from "lucide-react";
import { generateForecast, type ForecastAnalysis } from "@/utils/ForecastAnalyzer";
import {
  computeLocandinaData,
  generateLocandinaImageBlob,
  generateLocandinaPages,
  locandinaFilename,
  type LocandinaInput,
} from "@/utils/PosterGenerator";
import { jpegsToPdfBlob } from "@/utils/PdfGenerator";
import type { MeteoCurrent, MeteoHourly } from "@/services/openMeteoService";

interface ReportAICardProps {
  siteName: string;
  elevation?: number;
  province?: string;
  current: MeteoCurrent | null;
  hourly: MeteoHourly[];
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

type BusyKind = "jpg" | "png" | "pdf" | "wa" | null;

export default function ReportAICard({ siteName, elevation, province, current, hourly, daily = [], onGenerate }: ReportAICardProps) {
  const [analysis, setAnalysis] = useState<ForecastAnalysis | null>(null);
  const [generated, setGenerated] = useState(false);
  const [busy, setBusy] = useState<BusyKind>(null);
  const [shareHint, setShareHint] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewBlobRef = useRef<Blob | null>(null);

  const computed = useMemo(() => generateForecast(siteName, current, hourly, daily), [siteName, current, hourly, daily]);
  const active = analysis ?? computed;

  useEffect(() => {
    setAnalysis(null);
    setGenerated(false);
    setBusy(null);
    setShareHint(null);
  }, [siteName, current, hourly, daily]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleGenerate = () => {
    const next = computed;
    setAnalysis(next);
    setGenerated(true);
    onGenerate?.(next);
  };

  const buildInput = (): LocandinaInput => ({
    siteName,
    province,
    date: new Date(),
    elevation: elevation ?? 1500,
    current,
    hourly,
    daily: daily[0] ?? null,
    report: active.report,
    probabilities: active.probabilities,
  });

  const makeJpeg = async (): Promise<{ blob: Blob; filename: string }> => {
    const blob = await generateLocandinaImageBlob(buildInput(), "jpg", { outWidth: 1620 });
    return { blob, filename: locandinaFilename(siteName, new Date(), "jpg") };
  };

  const setPreview = (blob: Blob) => {
    previewBlobRef.current = blob;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const handleDownload = async (type: "jpg" | "png" | "pdf") => {
    setBusy(type);
    setShareHint(null);
    try {
      const input = buildInput();
      if (type === "pdf") {
        const pages = await generateLocandinaPages(input, 1620);
        setPreview(pages.locandina);
        const pdf = await jpegsToPdfBlob([pages.locandina, pages.informazioni]);
        triggerDownload(pdf, locandinaFilename(siteName, new Date(), "pdf"));
      } else if (type === "jpg") {
        const { blob, filename } = await makeJpeg();
        setPreview(blob);
        triggerDownload(blob, filename);
      } else {
        const blob = await generateLocandinaImageBlob(input, "png", { outWidth: 1620 });
        setPreview(blob);
        triggerDownload(blob, locandinaFilename(siteName, new Date(), "png"));
      }
      setShareHint(
        type === "pdf"
          ? "PDF A4 scaricato: locandina + informazioni del volo (2 pagine)."
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
      setPreview(blob);
      const file = new File([blob], filename, { type: "image/jpeg" });
      const d = active;
      const text =
        `🪂 Locandina meteo volo libero — ${siteName}\n` +
        `📅 ${new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" })}\n` +
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

        {previewUrl && (
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(25,48,41,0.2)", maxHeight: 230, overflowY: "auto", background: "#F2F5F3" }}>
            <img src={previewUrl} alt="Anteprima locandina" style={{ display: "block", width: "100%", height: "auto" }} />
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" disabled={busy !== null} onClick={() => void handleDownload("jpg")} style={buttonStyle(busy === "jpg")}>
            {busy === "jpg" ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />} JPG
          </button>
          <button type="button" disabled={busy !== null} onClick={() => void handleDownload("png")} style={buttonStyle(busy === "png")}>
            {busy === "png" ? <Loader2 size={14} className="animate-spin" /> : <FileImage size={14} />} PNG
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
