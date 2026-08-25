"use client";

import React, { useEffect, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import DecolliCard from "@/components/DecolliCard";
import SiteHeader from "@/components/SiteHeader";
import UpdateTimer from "@/components/UpdateTimer";
import PrevisioniGiornaliere from "@/components/PrevisioniGiornaliere";
import WeatherDashboard from "@/components/WeatherDashboard";
import TabNav from "@/components/TabNav";
import MeteoTab from "@/components/MeteoTab";
import VentiInterpolatiTab from "@/components/VentiInterpolatiTab";
import TermicheTab from "@/components/TermicheTab";
import AnalisiMeteo from "@/components/AnalisiMeteo";
import Windgram from "@/components/Windgram";
import DiagnosticaPanel from "@/components/DiagnosticaPanel";
import ProfiloVentoVerticale from "@/components/ProfiloVentoVerticale";  // <-- AGGIUNTO
import { useWeatherData } from "@/hooks/useWeatherData";
import { useMeteoCompleto } from "@/hooks/useMeteoCompleto";
import { useThreeSourceWeather } from "@/hooks/useThreeSourceWeather";
import { DECOLLI } from "@/data/decolli";
import { getStabilityIndex } from "@/utils/weatherHelpers";
import { avviaVerificaContinua } from "@/utils/mantenimentoAuto";
import { Activity, Wind } from "lucide-react";

export default function Index() {
  // ... resto del codice invariato