import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./graph-readability.css";

createRoot(document.getElementById("root")!).render(<App />);
