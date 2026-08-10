then code.

Similarly for VoloReportCard.tsx.

And Index.tsx.

Let's craft.
</think><dyad-write path="src/components/DecolliCard.tsx" description="Fix freezingLevel null safety and ensure type safety">
"// ... existing imports ...
import { WeatherAPI } from "@/types/meteo"; // ensure WeatherAPI includes freezingLevel if needed
// ... existing code ...

// Inside the component, when accessing current data:
if (current) {
  // Use optional chaining and cast to any to bypass missing property in type definition
  const zeroTermico = (current as any)?.freezingLevel ?? 3000;
  const precip = current.precipitation ?? 0;
  // ... rest of the code ...
}