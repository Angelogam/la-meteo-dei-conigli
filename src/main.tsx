import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { WindgramProvider } from "./context/WindgramContext.tsx";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <WindgramProvider>
    <App />
  </WindgramProvider>
);