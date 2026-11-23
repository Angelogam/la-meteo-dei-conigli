"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Termiche from "@/pages/Termiche";
import NotFound from "@/pages/NotFound";
import DecolloDettaglio from "@/pages/DecolloDettaglio";
import ApiTestRunner from "./pages/ApiTestRunner";
import ApiTest from "@/pages/ApiTest";
import ApiMegaList from "@/pages/ApiMegaList";
import PilotBrainPreview from "@/components/verdetto/PilotBrainPreview";

const App = () => {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
};

export default App;