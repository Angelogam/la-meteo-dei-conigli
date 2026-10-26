import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./graph-readability.css";
import "./open-source-layout.css";
import "./decolli-compare.css";

createRoot(document.getElementById("root")!).render(<App />);
