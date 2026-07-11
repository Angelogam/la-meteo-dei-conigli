"use client";

interface ErrorScreenProps {
  message: string;
}

export const ErrorScreen = ({ message }: ErrorScreenProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700">
      <p className="text-red-600 text-lg mb-4 font-medium">Errore: {message}</p>
      <button
        className="bg-red-500 text-white px-7 py-2.5 rounded-lg font-semibold cursor-pointer hover:bg-red-600 transition-colors shadow-sm"
        onClick={() => window.location.reload()}
      >
        Riprova
      </button>
    </div>