"use client";

export const Header = () => {
  return (
    <header className="text-center mb-5 py-4 border-b border-gray-400">
      <div className="flex items-center justify-center gap-2.5">
        <span className="text-4xl md:text-5xl animate-bounce">&#x1F430;</span>
        <span className="text-3xl md:text-4xl animate-pulse">&#x1FA82;</span>
        <span
          className="text-3xl md:text-5xl font-extrabold"
          style={{
            background: "linear-gradient(to right, #e63946, #f97316)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "none",
            WebkitTextStroke: "1.5px #000",
            textStroke: "1.5px #000",
          }}
        >
          Meteo dei Conigli
        </span>
      </div>
      <p
        className="text-base md:text-lg mt-1.5 font-bold"
        style={{
          color: "#f97316",
          textShadow: "0.5px 0.5px 0 #000, -0.5px -0.5px 0 #000, 0.5px -0.5px 0 #000, -0.5px 0.5px 0 #000",
        }}
      >
        Previsioni per volo libero - Open-Meteo - SHV FSVL Style
      </p>
    </header>
  );
};