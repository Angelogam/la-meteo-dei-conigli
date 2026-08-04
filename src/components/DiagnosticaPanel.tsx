"use client";

import React from "react";

export const eseguiDiagnostica = (): boolean => {
  console.log("Diagnostica sistema eseguita.");
  return true;
};

export const DiagnosticaPanel: React.FC = () => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-700">Pannello Diagnostica</h3>
      <button 
        onClick={() => eseguiDiagnostica()} 
        className="mt-2 px-3 py-1 bg-slate-800 text-white text-xs rounded hover:bg-slate-700"
      >
        Esegui Test
      </button>
    </div>
  );
};

export default DiagnosticaPanel;