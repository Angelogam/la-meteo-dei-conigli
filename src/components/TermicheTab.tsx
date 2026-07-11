"use client";

import React, { useMemo } from "react";
import { MeteoGram } from "@/components/MeteoGram";
import type { HourData } from "@/types/meteo";

export const TermicheTab = ({ dayData, altitude }: TermicheTabProps) => {
  // ... keep the rest of the file unchanged ...