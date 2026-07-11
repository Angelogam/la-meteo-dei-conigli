"use client";

export const LoadingScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700">
      <div className="w-12 h-12 border-4 border-gray-300 border-t-red-500 rounded-full animate-spin" />
      <p className="mt-4 text-lg font-medium">Caricamento previsioni...</p>
    </div>
  );
};