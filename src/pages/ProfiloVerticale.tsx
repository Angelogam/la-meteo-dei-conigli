import React from "react";
import TermicheAquila as ProfiloVerticalePro from "@/components/ProfiloVerticalePro";

export default function ProfiloVerticale() {
  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <ProfiloVerticalePro
        data={[
          { quota: 500, speed: 12, dir: "←SW" },
          { quota: 1000, speed: 14, dir: "←SW" },
          { quota: 1350, speed: 16, dir: "←SW" },
          { quota: 1500, speed: 18, dir: "←SW" },
          { quota: 2000, speed: 20, dir: "→W" },
          { quota: 2500, speed: 23, dir: "→W" },
          { quota: 3000, speed: 26, dir: "→NW" },
        ]}
      />
    </div>
  );
}