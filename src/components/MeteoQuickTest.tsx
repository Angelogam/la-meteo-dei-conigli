import React, { useState } from "react";
import { DECOLLI } from "@/data/decolli";
import { weatherService } from "@/services/weatherService";
import { validaVentoPerDecollo, getVentoStatusColor } from "@/utils/validaVentoDecollo";

export default function MeteoQuickTest() {
  return (
    <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
      <h3 className="text-sm font-bold text-white mb-3">Test veloce</h3>
      <p className="text-slate-400 text-sm">Test meteo rapido</p>
    </div>
  );
}