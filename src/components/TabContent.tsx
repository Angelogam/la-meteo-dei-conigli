"use client";

import type { Tab } from "@/components/TabNav";
import { MeteoTab } from "@/components/MeteoTab";
import { VentiTab } from "@/components/VentiTab";
import VentiQuotaTab from "@/components/VentiQuotaTab";
import TermicheTab from "@/components/TermicheTab";
import { AnalisiTab } from "@/components/AnalisiTab";
import type { HourData, AiAnalysis } from "@/types/meteo";
import type { TermicheData } from "@/utils/termiche";

interface TabContentProps {
  tab: Tab;
  currentHourData: HourData | undefined;
  dayIdx: number;
  hour: number;
  enrichedDaily: any[];
  dateLabels: string[];
  dateLabelsObj: { value: number; label: string }[];
  thermalAI: any;
  aiData: any;
  aiMeteoAnalysis: any;
  termicheHourly: { hour: number; termiche: TermicheData }[];
  dayData: HourData[];
  currentSite: { name: string; altitude: number };
  onDaySelect: (idx: number) => void;
  onDayDetailClick?: (idx: number) => void;
  onHourChange: (h: number) => void;
  fetchGiorno: (giorno: number) => void;
}

export const TabContent = ({
  tab,
  currentHourData,
  dayIdx,
  hour,
  enrichedDaily,
  dateLabels,
  dateLabelsObj,
  thermalAI,
  aiData,
  aiMeteoAnalysis,
  termicheHourly,
  dayData,
  currentSite,
  onDaySelect,
  onDayDetailClick,
  onHourChange,
  fetchGiorno,
}: TabContentProps) => {
  return (
    <div className="bg-slate-700/70 backdrop-blur-sm rounded-2xl p-4 md:p-5 border border-slate-500/60 shadow-xl mt-2.5 text-slate-100 content-enter">
      {tab === "meteo" && currentHourData && (
        <MeteoTab
          current={currentHourData}
          dayIdx={dayIdx}
          hour={hour}
          enrichedDaily={enrichedDaily}
          dateLabels={dateLabels}
          thermal={thermalAI}
          pressureGrad={{ grad: 0, desc: "Non disponibile" }}
          aiData={aiData as unknown as AiAnalysis | null}
          onDaySelect={onDaySelect}
          onDayDetailClick={onDayDetailClick}
          onHourChange={onHourChange}
          termicheHourly={termicheHourly}
          dayData={dayData}
        />
      )}

      {tab === "venti" && <VentiTab dayData={dayData} selectedHour={hour} />}

      {tab === "quota" && (
        <VentiQuotaTab
          dayData={dayData}
          selectedHour={hour}
          altitude={currentSite.altitude}
          siteName={currentSite.name}
        />
      )}

      {tab === "termiche" && (
        <TermicheTab
          dayData={dayData}
          altitude={currentSite.altitude}
          selectedHour={hour}
          dateLabels={dateLabelsObj}
          dayIdx={dayIdx}
          onDaySelect={onDaySelect}
          fetchGiorno={(giorno) => {
            if (giorno > 0) {
              fetchGiorno(giorno);
            }
          }}
        />
      )}

      {tab === "analisi" && aiMeteoAnalysis && (
        <AnalisiTab aiData={aiMeteoAnalysis as unknown as AiAnalysis} selectedHour={hour} />
      )}
      {tab === "analisi" && !aiMeteoAnalysis && (
        <div className="text-sm text-slate-300 p-4 text-center">
          Nessuna analisi disponibile per questa giornata.
        </div>
      )}
    </div>
  );
};