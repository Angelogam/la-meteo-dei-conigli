import React from "react";

const Page = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <h1 className="text-2xl font-bold text-white">Meteo dei Conigli</h1>
        <p className="text-slate-400 mt-2">Caricamento in corso...</p>
      </div>
    </div>
  );
};

export default Page;