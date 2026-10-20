"use client";

export const Footer = () => {
  return (
    <footer className="app-footer">
      <p>
        Basato su dati Open-Meteo &copy; {new Date().getFullYear()} · La Meteo dei Conigli
      </p>
    </footer>
  );
};
