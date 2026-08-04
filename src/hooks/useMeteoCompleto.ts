"use client";

import { useState } from "react";
import type { AnalisiCompletaConMargine } from "./useAnalisiAvanzata";

export const useMeteoCompleto = () => {
  const [meteo, setMeteo] = useState<AnalisiCompletaConMargine | null>(null);

  return { meteo, setMeteo };
};

export default useMeteoCompleto;