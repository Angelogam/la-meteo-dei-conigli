"use client";

interface ErrorScreenProps {
  message: string;
  onRetry: () => void;
}

export const ErrorScreen = ({ message, onRetry }: ErrorScreenProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-gray-900 via-gray-700 to-gray-500">
      <div className="text-6xl mb-4">&#x26A0;&#xFE0F;</div>
      <div className="text-xl font-bold text-red-400 mb-2">Errore di caricamento</div>
      <div className="text-sm text-gray-300 mb-4 text-center max-w-md">{message}</div>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
      >
        Riprova
      </button>
    </div>
  );
};