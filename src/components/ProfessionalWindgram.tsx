"use client";

import React from "react";
import { Wind } from "lucide-react";

const ProfessionalWindgram = () => {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <Wind className="w-8 h-8 text-cyan-400" />
      <p className="text-slate-400 text-center">Professional Windgram</p>
    </div>
  );
};

export default ProfessionalWindgram;