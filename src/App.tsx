"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import ApiTestRunner from "./pages/ApiTestRunner";
import RicercaMeteo from "@/pages/RicercaMeteo";
import TestCard from "@/pages/TestCard";
import SimpleTest from "@/pages/SimpleTest";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/test-card" element={<TestCard />} />
        <Route path="/simple-test" element={<SimpleTest />} />
        <Route path="/ricerca-meteo" element={<RicercaMeteo />} />
        <Route path="/test-api" element={<ApiTestRunner />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;