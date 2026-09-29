import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if Index.tsx exists and has the button
const indexPath = join(__dirname, "..", "src", "pages", "Index.tsx");
try {
  const content = readFileSync(indexPath, "utf-8");
  console.log("Index.tsx found, length:", content.length);
  console.log("Has ResearchButton import:", content.includes("ResearchButton"));
  console.log("Has openResearch function:", content.includes("openResearch"));
  console.log("Has ResearchButton component:", content.includes("<ResearchButton"));
} catch (err) {
  console.error("Error reading Index.tsx:", err);
}

// Check ResearchButton component
const researchBtnPath = join(__dirname, "..", "src", "components", "ResearchButton.tsx");
try {
  const content = readFileSync(researchBtnPath, "utf-8");
  console.log("\nResearchButton.tsx found, length:", content.length);
  console.log("Has Search icon:", content.includes("Search"));
  console.log("Has onClick:", content.includes("onClick"));
} catch (err) {
  console.error("Error reading ResearchButton.tsx:", err);
}