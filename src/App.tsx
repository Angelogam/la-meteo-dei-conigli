"use client";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Termiche from "@/pages/Termiche";
import NotFound from "@/pages/NotFound";
import ApiTestRunner from "./pages/ApiTestRunner";
import ApiTest from "@/pages/ApiTest";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/termiche" element={<Termiche />} />
        <Route path="/test-api" element={<ApiTestRunner />} />
        <Route path="/api-test" element={<ApiTest />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;