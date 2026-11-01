import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  Code2,
  Database,
  Gamepad2,
  GraduationCap,
  Layers,
  MapPinned,
  Newspaper,
  PlugZap,
  Radio,
  Search,
  ShoppingBag,
  Trophy,
  Users,
  Video,
  Workflow,
  Wrench,
  Activity,
  Globe2,
  Boxes,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

type ApiCategory = {
  id: string;
  label: string;
  description: string;
  url: string;
  icon: typeof Database;
};

const SOURCE = "https://github.com/cporter202/API-mega-list";

const CATEGORIES: ApiCategory[] = [
  { id: "agents-apis-623", label: "Agenti", description: "Agenti intelligenti e assistenti.", url: "https://github.com/cporter202/API-mega-list/tree/main/agents-apis-623", icon: Bot },
  { id: "ai-apis-1555", label: "Intelligenza artificiale", description: "Modelli AI, generazione e analisi.", url: "https://github.com/cporter202/API-mega-list/tree/main/ai-apis-1555", icon: Activity },
  { id: "automation-apis-5653", label: "Automazioni", description: "Workflow e processi automatici.", url: "https://github.com/cporter202/API-mega-list/tree/main/automation-apis-5653", icon: Workflow },
  { id: "business-apis-514", label: "Business", description: "Servizi e strumenti per le aziende.", url: "https://github.com/cporter202/API-mega-list/tree/main/business-apis-514", icon: BriefcaseBusiness },
  { id: "developer-tools-apis-4065", label: "Strumenti per sviluppatori", description: "Sviluppo, test e strumenti tecnici.", url: "https://github.com/cporter202/API-mega-list/tree/main/developer-tools-apis-4065", icon: Code2 },
  { id: "ecommerce-apis-2245", label: "E-commerce", description: "Prodotti, cataloghi e vendite.", url: "https://github.com/cporter202/API-mega-list/tree/main/ecommerce-apis-2245", icon: ShoppingBag },
  { id: "education-apis-46", label: "Formazione", description: "Corsi e servizi per l'apprendimento.", url: "https://github.com/cporter202/API-mega-list/tree/main/education-apis-46", icon: GraduationCap },
  { id: "for-creators-apis-16", label: "Creator", description: "Strumenti per chi crea contenuti.", url: "https://github.com/cporter202/API-mega-list/tree/main/for-creators-apis-16", icon: Video },
  { id: "games-apis-6", label: "Videogiochi", description: "Servizi e dati per i giochi.", url: "https://github.com/cporter202/API-mega-list/tree/main/games-apis-6", icon: Gamepad2 },
  { id: "integrations-apis-841", label: "Integrazioni", description: "Collegamenti tra servizi e piattaforme.", url: "https://github.com/cporter202/API-mega-list/tree/main/integrations-apis-841", icon: PlugZap },
  { id: "jobs-apis-1149", label: "Lavoro", description: "Annunci, recruiting e mercato del lavoro.", url: "https://github.com/cporter202/API-mega-list/tree/main/jobs-apis-1149", icon: Users },
  { id: "lead-generation-apis-4431", label: "Lead generation", description: "Ricerca contatti e acquisizione clienti.", url: "https://github.com/cporter202/API-mega-list/tree/main/lead-generation-apis-4431", icon: Radio },
  { id: "marketing-apis-290", label: "Marketing", description: "Campagne e analisi.", url: "https://github.com/cporter202/API-mega-list/tree/main/marketing-apis-290", icon: Globe2 },
  { id: "mcp-servers-apis-289", label: "Server MCP", description: "Strumenti collegabili agli assistenti AI.", url: "https://github.com/cporter202/API-mega-list/tree/main/mcp-servers-apis-289", icon: Boxes },
  { id: "news-apis-537", label: "Notizie", description: "Fonti e servizi per le notizie.", url: "https://github.com/cporter202/API-mega-list/tree/main/news-apis-537", icon: Newspaper },
  { id: "open-source-apis-84", label: "Open source", description: "Progetti e strumenti a codice aperto.", url: "https://github.com/cporter202/API-mega-list/tree/main/open-source-apis-84", icon: Layers },
  { id: "other-apis-1944", label: "Altre API", description: "Altri servizi del catalogo.", url: "https://github.com/cporter202/API-mega-list/tree/main/other-apis-1944", icon: Database },
  { id: "real-estate-apis-1089", label: "Immobiliare", description: "Servizi per il settore immobiliare.", url: "https://github.com/cporter202/API-mega-list/tree/main/real-estate-apis-1089", icon: MapPinned },
  { id: "seo-tools-apis-903", label: "SEO", description: "Ricerca, indicizzazione e visibilità web.", url: "https://github.com/cporter202/API-mega-list/tree/main/seo-tools-apis-903", icon: Search },
  { id: "social-media-apis-2786", label: "Social media", description: "Piattaforme social e contenuti.", url: "https://github.com/cporter202/API-mega-list/tree/main/social-media-apis-2786", icon: Users },
  { id: "sports-apis-21", label: "Sport", description: "Dati e servizi sportivi.", url: "https://github.com/cporter202/API-mega-list/tree/main/sports-apis-21", icon: Trophy },
  { id: "travel-apis-493", label: "Viaggi", description: "Destinazioni, viaggi e turismo.", url: "https://github.com/cporter202/API-mega-list/tree/main/travel-apis-493", icon: MapPinned },
  { id: "videos-apis-705", label: "Video", description: "Video e strumenti multimediali.", url: "https://github.com/cporter202/API-mega-list/tree/main/videos-apis-705", icon: Video },
];

export default function ApiMegaList() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("it-IT");
    if (!normalized) return CATEGORIES;
    return CATEGORIES.filter((category) =>
      [category.label, category.description, category.id].some((value) =>
        value.toLocaleLowerCase("it-IT").includes(normalized),
      ),
    );
  }, [query]);

  return (
    <div className="flight-website-shell api-mega-page min-h-screen">
      <Header />
      <main className="api-mega-content">
        <a className="api-mega-back" href="/">
          <ArrowLeft size={16} aria-hidden="true" /> Torna alla Meteo dei Conigli
        </a>

        <header className="api-mega-header">
          <div>
            <p className="api-mega-eyebrow">CATALOGO ESTERNO</p>
            <h1>API Mega List</h1>
            <p>Trova una categoria e apri la raccolta originale su GitHub.</p>
          </div>
          <a className="api-mega-source" href={SOURCE} target="_blank" rel="noreferrer">
            Repository originale <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </header>

        <section className="api-mega-directory" aria-label="Categorie API">
          <label className="api-mega-search">
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca AI, automazioni, meteo…"
              aria-label="Cerca una categoria"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Cancella ricerca">
                ×
              </button>
            )}
          </label>

          <div className="api-mega-result-count" aria-live="polite">
            {filtered.length === CATEGORIES.length
              ? `${CATEGORIES.length} categorie`
              : `${filtered.length} di ${CATEGORIES.length} categorie`}
          </div>

          <div className="api-mega-categories">
            {filtered.map((category) => {
              const Icon = category.icon;
              return (
                <a className="api-mega-category" key={category.id} href={category.url} target="_blank" rel="noreferrer">
                  <span className="api-mega-category-icon"><Icon size={18} aria-hidden="true" /></span>
                  <span className="api-mega-category-copy">
                    <strong>{category.label}</strong>
                    <small>{category.description}</small>
                  </span>
                  <ArrowUpRight className="api-mega-category-arrow" size={17} aria-hidden="true" />
                </a>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p className="api-mega-empty">Nessuna categoria trovata. Prova con un altro termine.</p>
          )}
        </section>

        <p className="api-mega-disclaimer">
          Questo catalogo apre le raccolte originali: non attiva automaticamente le API. Prima di integrare un servizio,
          controlla accesso, licenza, copertura e costi.
        </p>
      </main>
      <Footer />
    </div>
  );
}
