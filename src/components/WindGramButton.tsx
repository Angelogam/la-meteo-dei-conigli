"use client";

import React, { useState, useMemo } from "react";
import { BarChart3, X, Layers, Wind, Gauge, TrendingUp, Mountain, Thermometer } from "lucide-react";
import type { HourData } from "@/types/meteo";
import { calcolaTermiche } from "@/utils/termiche";

// ... il resto del file rimane identico