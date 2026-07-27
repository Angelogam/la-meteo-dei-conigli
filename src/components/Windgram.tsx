"use client";

import React from "react";

//... (rest of the component remains the same)

function stimaVento(hd: MeteoHourly, quota: number): { speed: number; dir: number } | null {
  const profilo = hd.windSpeed || []; 
  const surfaceSpeed = Math.max(hd.windSpeed, 0); 
  //... (rest of the function)
}