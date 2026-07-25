import React from "react";
import ProfiloVerticalePro from "@/components/ProfiloVerticalePro";

export default function ProfiloVerticale() {
  return (
    <div style={{ maxWidth: "400px", margin: "0 auto" }}>
      <ProfiloVerticalePro
        data={[
          { quota: 500, speed: 12, direction: "←SW" },
          { quota: 1000, speed: 14, direction: "←SW" },
          { quota: 1350, speed: 16, direction: "←SW" },
          { quota: 1500, speed: 18, direction: "←SW" },
          { quota: 2000, speed: 20, direction: "→W" },
          { quota: 2500, speed: 23, direction: "→W" },
          { quota: 3000, speed: 26, direction: "→NW" },
        ]}
      />
    </div>
  );
};