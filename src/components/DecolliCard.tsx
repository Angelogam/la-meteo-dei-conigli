import React, { useEffect, useState, useRef, useCallback } from "react";
import { Wind, Clock } from "lucide-react";
import { weatherService } from "@/services/weatherService";
import { validaVentoPerDecollo, getVentoStatusColor } from "@/utils/validaVentoDecollo";