"use client";

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import { WindgramProvider } from "@/context/WindgramContext";

function App() {
  return (
    <WindgramProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
        </Routes>
      </BrowserRouter>
    </WindgramProvider>
  );
}

export default App;