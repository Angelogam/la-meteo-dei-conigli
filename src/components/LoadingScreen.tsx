"use client";

export const LoadingScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "linear-gradient(135deg,#0a0e27,#1a1a3e)", color: "#eee" }}>
      <div className="w-12 h-12 border-4 border-white/10 border-t-red-400 rounded-full animate-spin" />
      <p className="mt-4 text-lg">Caricamento previsioni...</p>
    </div>
  );
};