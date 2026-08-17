"use client";

import React, { useState, useEffect } from "react";
import { Wind, Loader2, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface ProfiloVentoVerticaleProps {
  siteAlt: number;
  siteName?: string;
  lat?: number;
  lon?: number;
}