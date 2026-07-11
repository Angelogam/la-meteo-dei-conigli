"use client";

interface ErrorScreenProps {
  message: string;
}

export const ErrorScreen = ({ message }: ErrorScreenProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "linear-gradient(135deg,#0a0e27,#1a1a3e)", color: "#eee" }}>
      <p className="text-red-400 text-lg mb-4">Errore: {message}</p>
      <button
        className="bg-red-500 text-white px-7 py-2.5 rounded-lg font-semibold cursor-pointer"
        onClick={() => window.location.reload()}
      >
        Riprova
      </button>
    </div>
  );
};