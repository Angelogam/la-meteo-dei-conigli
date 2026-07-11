import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Location } from "@/types/meteo";

interface SearchBarProps {
  onSelect: (loc: Location) => void;
}

// Lista di località italiane per il volo a vela
const ITALIAN_LOCATIONS: Location[] = [
  { name: "Pian delle Gorre", region: "Piemonte", country: "Italia", lat: 44.2587, lon: 7.7943 },
  { name: "Alessandria", region: "Piemonte", country: "Italia", lat: 44.9093, lon: 8.6101 },
  { name: "Torino", region: "Piemonte", country: "Italia", lat: 45.0703, lon: 7.6869 },
  { name: "Milano", region: "Lombardia", country: "Italia", lat: 45.4642, lon: 9.1900 },
  { name: "Varese", region: "Lombardia", country: "Italia", lat: 45.8206, lon: 8.8256 },
  { name: "Rieti", region: "Lazio", country: "Italia", lat: 42.4030, lon: 12.8570 },
  { name: "Roma", region: "Lazio", country: "Italia", lat: 41.9028, lon: 12.4964 },
  { name: "Firenze", region: "Toscana", country: "Italia", lat: 43.7696, lon: 11.2558 },
  { name: "Bologna", region: "Emilia-Romagna", country: "Italia", lat: 44.4949, lon: 11.3426 },
  { name: "Venezia", region: "Veneto", country: "Italia", lat: 45.4408, lon: 12.3155 },
  { name: "Ozzano", region: "Emilia-Romagna", country: "Italia", lat: 44.4410, lon: 11.4740 },
  { name: "Parma", region: "Emilia-Romagna", country: "Italia", lat: 44.8015, lon: 10.3280 },
  { name: "Siena", region: "Toscana", country: "Italia", lat: 43.3183, lon: 11.3314 },
  { name: "Perugia", region: "Umbria", country: "Italia", lat: 43.1107, lon: 12.3908 },
  { name: "Lecce", region: "Puglia", country: "Italia", lat: 40.3519, lon: 18.1720 },
  { name: "Catania", region: "Sicilia", country: "Italia", lat: 37.5079, lon: 15.0900 },
  { name: "Alzate Brianza", region: "Lombardia", country: "Italia", lat: 45.7667, lon: 9.1833 },
  { name: "Vergiate", region: "Lombardia", country: "Italia", lat: 45.7250, lon: 8.6950 },
];

const SearchBar = ({ onSelect }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ loc: Location; score: number }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const q = query.toLowerCase();
    setIsLoading(true);

    // Simula un breve delay per UX
    const timer = setTimeout(() => {
      const scored = ITALIAN_LOCATIONS
        .map((loc) => {
          const nameScore = loc.name.toLowerCase().includes(q) ? 10 : 0;
          const regionScore = loc.region.toLowerCase().includes(q) ? 5 : 0;
          const fullName = `${loc.name}, ${loc.region}`.toLowerCase();
          const fullScore = fullName.includes(q) ? 3 : 0;
          return { loc, score: nameScore + regionScore + fullScore };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setResults(scored);
      setIsOpen(scored.length > 0);
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (loc: Location) => {
    setQuery(`${loc.name}, ${loc.region}`);
    setIsOpen(false);
    onSelect(loc);
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca località..."
          className="pl-10 pr-10 h-11 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus-visible:ring-blue-400/50"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
          {results.map(({ loc }) => (
            <button
              key={`${loc.lat}-${loc.lon}`}
              onClick={() => handleSelect(loc)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <MapPin className="h-4 w-4 shrink-0 text-blue-400" />
              <div>
                <span className="text-sm font-medium">{loc.name}</span>
                <span className="text-xs text-white/40 ml-2">{loc.region}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
