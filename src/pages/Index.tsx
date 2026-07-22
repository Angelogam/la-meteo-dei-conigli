"use client";

import React, { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TermicheGrafico from "@/components/TermicheGrafico";
import MeteoTab from "@/components/MeteoTab";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import VentoTab from "@/components/VentoTab";
import type { HourData } from "@/types/meteo";
// ... keep all existing imports and main component code

export default function Index() {
  // ... keep all existing state and logic

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Previsioni Giornaliere */}
        <PrevisioniGiornaliere
          enrichedDaily={enrichedDaily}
          currentData={currentData}
          dayData={dayData}
          site={site}
          selectedDay={selectedDay}
          onSelectDay={handleSelectDay}
        />

        {/* Tabs principali */}
        <Tabs defaultValue="meteo" className="w-full">
          <TabsList className="w-full justify-center">
            <TabsTrigger value="meteo">Meteo</TabsTrigger>
            <TabsTrigger value="termiche">Termiche</TabsTrigger>
            <TabsTrigger value="vento">Vento</TabsTrigger>
          </TabsList>

          <TabsContent value="meteo">
            <MeteoTab
              currentData={currentData}
              dayData={dayData}
              site={site}
              thermalDelta={thermalDelta}
              stabilityIndex={stabilityIndex}
              modelName={modelName}
              cape={cape}
              liftedIndex={liftedIndex}
              cin={cin}
            />
          </TabsContent>

          <TabsContent value="termiche">
            <TermicheGrafico
              dayData={dayData}
              alt={site?.alt ?? 1000}
              siteName={site?.name}
              windProfile={windProfile}
            />
          </TabsContent>

          <TabsContent value="vento">
            <VentoTab
              currentData={currentData}
              dayData={dayData}
              site={site}
              windProfile={windProfile}
              groundSpeed={groundSpeed}
              groundDir={groundDir}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}