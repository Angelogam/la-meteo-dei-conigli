import { DECOLLI } from "@/data/decolli";
import { weatherService, type MeteoHourly } from "@/services/weatherService";
import { degreesToCardinal } from "@/utils/windDirections";
import { calcolaTermiche } from "@/utils/termiche";
import type { HourData } from "@/types/meteo";