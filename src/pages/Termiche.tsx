"use client";

import React from "react";
import GraficoTermicoPro from "@/components/GraficoTermicoPro";

export default function Termiche() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <GraficoTermicoPro
          data={[]}
        />
      </div>
    </div>
  );
}