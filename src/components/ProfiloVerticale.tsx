"use client";

import React from "react";
import ProfiloVerticalePro from "@/components/ProfiloVerticalePro";

export default function ProfiloVerticale() {
  return (
    <div className="max-w-md mx-auto">
      <ProfiloVerticalePro
        siteName="Esempio"
        altitude={1200}
        currentData={{}}
        dayData={[]}
        selectedDate=""
      />
    </div>
  );
}