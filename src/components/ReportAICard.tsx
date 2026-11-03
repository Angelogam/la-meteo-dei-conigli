"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileImage, FileText, Plane, Sparkles, Wind, CloudSun, ShieldAlert, ArrowRight } from "lucide-react";
import { generateForecast, type ForecastAnalysis } from "@/utils/ForecastAnalyzer";
import { generatePoster, type PosterData } from "@/utils/PosterGenerator";
import { generatePDFBlob } from "@/utils/PdfGenerator";
import type { MeteoCurrent, MeteoHourly } from "@/services/openMeteoService";

interface ReportAICardProps {
  siteName: string;
  current: MeteoCurrent | null;
  hourly: MeteoHourly[];
  daily?: Array<{ tempMax?: number | null; tempMin?: number | null; weatherCode?: number | null; precipitationProbabilityMax?: number | null; precipitationSum?: number | null }>;
  onGenerate?: (analysis: ForecastAnalysis) => void;
}

export default function ReportAICard({ siteName, current, hourly, daily = [], onGenerate }: ReportAICardProps) {
  const [analysis, setAnalysis] = useState<ForecastAnalysis | null>(null);
  const [generated, setGenerated] = useState(false);
  const [lastAction, setLastAction] = useState<"jpg" | "png" | "pdf" | null>(null);

  const computed = useMemo(() => generateForecast(siteName, current, hourly, daily), [siteName, current, hourly, daily]);
  const active = analysis ?? computed;

  useEffect(() => {
    setAnalysis(null);
    setGenerated(false);
    setLastAction(null);
  }, [siteName, current, hourly, daily]);

  const handleGenerate = () => {
    const next = computed;
    setAnalysis(next);
    setGenerated(true);
    setLastAction(null);
    onGenerate?.(next);
  };

  const handleDownload = async (type: "jpg" | "png" | "pdf") => {
    setLastAction(type);
    const next = analysis ?? computed;
    const posterData: PosterData = {
      siteName,
      date: new Date().toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" }),
      province: "Piemonte",
      elevation: current?.pressure ? Math.round(current.pressure / 10) : 1500,
      verdictLabel: next.verdictLabel,
      semaforo: next.semaforo,
      report: next.report,
      params: next.params,
      probabilities: next.probabilities,
      windows: next.windows,
    };

    if (type === "pdf") {
      const blob = generatePDFBlob(next.report, `${siteName} - Report AI Meteo`);
      triggerDownload(blob, `${siteName.toLowerCase().replace(/\s+/g, "-")}-report-ai.pdf`);
      return;
    }

    const svg = generatePoster(posterData);
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((output) => {
        if (!output) return;
        triggerDownload(output, `${siteName.toLowerCase().replace(/\s+/g, "-")}-report-ai.${type}`);
        URL.revokeObjectURL(url);
      }, type === "jpg" ? "image/jpeg" : "image/png", 0.92);
    };
    img.src = url;
  };

  const theme =
    active.semaforo === "GO"
      ? { color: "#41B853", text: "GO" }
      : active.semaforo === "ATTENZIONE"
        ? { color: "#FF9F1C", text: "ATTENZIONE" }
        : { color: "#E63946", text: "NO GO" };

  const buttonStyle = (selected: boolean, accent = "#0F4C81") => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    border: `1px solid ${selected ? accent : "rgba(15,76,129,0.18)"}`,
    background: selected ? "linear-gradient(135deg, #0F4C81 0%, #46A6FF 100%)" : "white",
    padding: "8px 10px",
    color: selected ? "white" : "#0F4C81",
    fontWeight: 700,
    boxShadow: selected ? "0 10px 18px rgba(15,76,129,0.2)" : "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as const);

  return (
    <section className="flight-side-card report-ai-card" style={{ background: "linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%)", border: "1px solid rgba(17, 88, 143, 0.2)", color: "#0f1f2d" }}>
      <div className="flight-subsection-heading" style={{ marginBottom: 12 }}>
        <div>
          <span>REPORT AI</span>
          <h2 style={{ color: "#0F4C81" }}>REPORT AI METEO</h2>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, background: "#0F4C81", color: "white" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.8 }}>Decollo</div>
            <div style={{ fontSize: 16, fontWeight: 700, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{siteName}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", opacity: 0.8 }}>Voto</div>
            <div style={{ borderRadius: 999, padding: "8px 12px", background: theme.color, color: "white", fontWeight: 800, fontSize: 12, letterSpacing: 1 }}>{active.semaforo}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", borderRadius: 10, background: generated ? "rgba(65,184,83,0.12)" : "rgba(70,166,255,0.08)", border: "1px solid rgba(15,76,129,0.12)" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0F4C81" }}>Valutazione: {active.verdictLabel}</span>
          <span style={{ fontSize: 12, color: "#17324a" }}>{generated ? "Generato" : "Pronto"}</span>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            border: "1px solid rgba(70, 166, 255, 0.35)",
            borderRadius: 12,
            padding: "12px 16px",
            background: "linear-gradient(135deg, #0F4C81 0%, #46A6FF 100%)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 10px 24px rgba(70, 166, 255, 0.3)",
          }}
        >
          <Sparkles size={16} />
          GENERA REPORT
        </button>

        <div style={{ display: "grid", gap: 10, fontSize: 13, color: "#17324a" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "rgba(70,166,255,0.08)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><CloudSun size={14} /> Probabilità volabile</span>
            <strong>{active.probabilities.flyable}%</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "rgba(65,184,83,0.08)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Wind size={14} /> Probabilità termiche</span>
            <strong>{active.probabilities.thermal}%</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "rgba(255,159,28,0.08)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><ShieldAlert size={14} /> Probabilità vento favorevole</span>
            <strong>{active.probabilities.wind}%</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "rgba(230,57,70,0.08)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}><ArrowRight size={14} /> Probabilità temporali</span>
            <strong>{active.probabilities.storm}%</strong>
          </div>
        </div>

        <div style={{ padding: "12px 14px", borderRadius: 12, background: "#f5f9fe", border: "1px solid rgba(15,76,129,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color: "#0F4C81", marginBottom: 8 }}>
            <Plane size={15} /> REPORT AI
          </div>
          <p style={{ margin: 0, lineHeight: 1.6, fontSize: 13, color: "#1b3040" }}>
            {active.report}
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" aria-pressed={lastAction === "jpg"} onClick={() => void handleDownload("jpg")} style={buttonStyle(lastAction === "jpg")}> <FileImage size={14} /> JPG </button>
          <button type="button" aria-pressed={lastAction === "png"} onClick={() => void handleDownload("png")} style={buttonStyle(lastAction === "png")}> <FileImage size={14} /> PNG </button>
          <button type="button" aria-pressed={lastAction === "pdf"} onClick={() => void handleDownload("pdf")} style={buttonStyle(lastAction === "pdf")}> <FileText size={14} /> PDF </button>
        </div>
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
