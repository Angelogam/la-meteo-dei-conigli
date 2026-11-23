"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import PilotBrainPreview from "@/components/verdetto/PilotBrainPreview";
/* Revisione critica 23/11 (punto 9): le pagine secondarie si caricano al
   bisogno — il bundle principale resta leggero. */
const Termiche = lazy(() => import("@/pages/Termiche"));
const DecolloDettaglio = lazy(() => import("@/pages/DecolloDettaglio"));
const ApiTestRunner = lazy(() => import("./pages/ApiTestRunner"));
const ApiTest = lazy(() => import("./pages/ApiTest"));
const ApiMegaList = lazy(() => import("./pages/ApiMegaList"));

const App = () => {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
            Carico la pagina…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/termiche" element={<Termiche />} />
          <Route path="/decollo/:id" element={<DecolloDettaglio />} />
          <Route path="/test-api" element={<ApiTestRunner />} />
          <Route path="/api-test" element={<ApiTest />} />
          <Route path="/catalogo-api" element={<ApiMegaList />} />
          {/* F5: preview del Pilot Brain SOLO in dev (le fixture non vanno in produzione) */}
          {import.meta.env.DEV && (
            <Route path="/dev/pilot-brain" element={<PilotBrainPreview />} />
          )}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
