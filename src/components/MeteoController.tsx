"use client";

import React from "react";

//... (rest of the component remains the same)

          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Pioggia</div>
          <div style={{ fontSize: "0.8rem", color: "#67e8f9", fontWeight: "bold" }}>{(d[0]?.precipitation || 0).toFixed(1)} mm</div>
          <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Vento max</div>
//...