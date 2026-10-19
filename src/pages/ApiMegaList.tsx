import { useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Boxes,
  BriefcaseBusiness,
  Code2,
  Database,
  GraduationCap,
  Gamepad2,
  Globe2,
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
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

type ApiCategory = {
  id: string;
  label: string;
  count: number;
  description: string;
  url: string;
  icon: typeof Database;
};

const SOURCE = "https://github.com/cporter202/API-mega-list";

const CATEGORIES: ApiCategory[] = [
  { id: "agents-apis-623", label: "Agenti", count: 623, description: "Agenti intelligenti, assistenti e flussi operativi.", url: "https://github.com/cporter202/API-mega-list/blob/main/agents-apis-623/README.md", icon: Bot },
  { id: "ai-apis-1555", label: "Intelligenza artificiale", count: 1555, description: "Servizi AI, generazione, analisi e strumenti per modelli.", url: "https://github.com/cporter202/API-mega-list/blob/main/ai-apis-1555/README.md", icon: Activity },
  { id: "automation-apis-5653", label: "Automazioni", count: 5653, description: "Workflow, processi automatici e orchestrazione.", url: "https://github.com/cporter202/API-mega-list/blob/main/automation-apis-5653/README.md", icon: Workflow },
  { id: "business-apis-514", label: "Business", count: 514, description: "Servizi e dati dedicati alle attività e alle aziende.", url: "https://github.com/cporter202/API-mega-list/blob/main/business-apis-514/README.md", icon: BriefcaseBusiness },
  { id: "developer-tools-apis-4065", label: "Strumenti per sviluppatori", count: 4065, description: "Tool per sviluppo, test, API, qualità e deployment.", url: "https://github.com/cporter202/API-mega-list/blob/main/developer-tools-apis-4065/README.md", icon: Code2 },
  { id: "ecommerce-apis-2245", label: "E-commerce", count: 2245, description: "Prodotti, cataloghi, prezzi, vendite e ordini.", url: "https://github.com/cporter202/API-mega-list/blob/main/ecommerce-apis-2245/README.md", icon: ShoppingBag },
  { id: "education-apis-46", label: "Formazione", count: 46, description: "Apprendimento, corsi e strumenti educativi.", url: "https://github.com/cporter202/API-mega-list/blob/main/education-apis-46/README.md", icon: GraduationCap },
  { id: "for-creators-apis-16", label: "Creator", count: 16, description: "Servizi per chi produce contenuti digitali.", url: "https://github.com/cporter202/API-mega-list/blob/main/for-creators-apis-16/README.md", icon: Video },
  { id: "games-apis-6", label: "Videogiochi", count: 6, description: "API e servizi dedicati ai giochi.", url: "https://github.com/cporter202/API-mega-list/blob/main/games-apis-6/README.md", icon: Gamepad2 },
  { id: "integrations-apis-841", label: "Integrazioni", count: 841, description: "Collegamenti tra piattaforme, servizi e applicazioni.", url: "https://github.com/cporter202/API-mega-list/blob/main/integrations-apis-841/README.md", icon: PlugZap },
  { id: "jobs-apis-1149", label: "Lavoro", count: 1149, description: "Annunci, recruiting e dati sul mercato del lavoro.", url: "https://github.com/cporter202/API-mega-list/blob/main/jobs-apis-1149/README.md", icon: Users },
  { id: "lead-generation-apis-4431", label: "Lead generation", count: 4431, description: "Ricerca contatti e strumenti per acquisizione clienti.", url: "https://github.com/cporter202/API-mega-list/blob/main/lead-generation-apis-4431/README.md", icon: Radio },
  { id: "marketing-apis-290", label: "Marketing", count: 290, description: "Campagne, contenuti e analisi di marketing.", url: "https://github.com/cporter202/API-mega-list/blob/main/marketing-apis-290/README.md", icon: Globe2 },
  { id: "mcp-servers-apis-289", label: "Server MCP", count: 289, description: "Server che espongono strumenti agli assistenti AI.", url: "https://github.com/cporter202/API-mega-list/blob/main/mcp-servers-apis-289/README.md", icon: Boxes },
  { id: "news-apis-537", label: "Notizie", count: 537, description: "Fonti, notizie e strumenti di ricerca editoriale.", url: "https://github.com/cporter202/API-mega-list/blob/main/news-apis-537/README.md", icon: Newspaper },
  { id: "open-source-apis-84", label: "Open source", count: 84, description: "Progetti e strumenti open source raccolti nel catalogo.", url: "https://github.com/cporter202/API-mega-list/blob/main/open-source-apis-84/README.md", icon: Layers },
  { id: "other-apis-1944", label: "Altre API", count: 1944, description: "Servizi che non rientrano nelle altre categorie.", url: "https://github.com/cporter202/API-mega-list/blob/main/other-apis-1944/README.md", icon: Database },
  { id: "real-estate-apis-1089", label: "Immobiliare", count: 1089, description: "Servizi e dati per il settore immobiliare.", url: "https://github.com/cporter202/API-mega-list/blob/main/real-estate-apis-1089/README.md", icon: MapPinned },
  { id: "seo-tools-apis-903", label: "SEO", count: 903, description: "Indicizzazione, visibilità e strumenti per siti web.", url: "https://github.com/cporter202/API-mega-list/blob/main/seo-tools-apis-903/README.md", icon: Wrench },
  { id: "social-media-apis-2786", label: "Social media", count: 2786, description: "Piattaforme social, contenuti e analisi.", url: "https://github.com/cporter202/API-mega-list/blob/main/social-media-apis-2786/README.md", icon: Users },
  { id: "sports-apis-21", label: "Sport", count: 21, description: "Dati e servizi per lo sport.", url: "https://github.com/cporter202/API-mega-list/blob/main/sports-apis-21/README.md", icon: Trophy },
  { id: "travel-apis-493", label: "Viaggi", count: 493, description: "Viaggi, destinazioni e servizi turistici.", url: "https://github.com/cporter202/API-mega-list/blob/main/travel-apis-493/README.md", icon: MapPinned },
  { id: "videos-apis-705", label: "Video", count: 705, description: "Video, streaming e strumenti per contenuti audiovisivi.", url: "https://github.com/cporter202/API-mega-list/blob/main/videos-apis-705/README.md", icon: Video },
];

const SERVICE_CANDIDATES = [
  {
    name: "Weather MCP — Forecast & Climate Data",
    description: "Nel catalogo come servizio meteo per assistenti AI. Da verificare prima dell'uso: chiave, limiti e costi.",
    url: "https://apify.com/nexgendata/weather-mcp-server",
    tag: "Da valutare",
  },
  {
    name: "Airport Weather & METAR Scraper",
    description: "Raccoglie osservazioni METAR e previsioni TAF aeroportuali. Non sostituisce i dati specifici del decollo.",
    url: "https://apify.com/crawlerbros/airport-metar-weather-scraper",
    tag: "Aviazione",
  },
  {
    name: "Weather Scraper — Forecast & History",
    description: "Servizio di terze parti per meteo e storico: va valutata la copertura geografica e la licenza d'uso.",
    url: "https://apify.com/nexgendata/weather-forecast-scraper",
    tag: "Da valutare",
  },
];

function formatCount(value: number) {
  return value.toLocaleString("it-IT");
}

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

  const listedCount = CATEGORIES.reduce((total, item) => total + item.count, 0);

  return (
    <div id="overview" className="flight-website-shell api-mega-page min-h-screen">
      <Header />
      <main className="api-mega-content">
        <a className="api-mega-back" href="/">
          <ArrowLeft aria-hidden="true" size={16} /> Torna a La Meteo dei Conigli
        </a>

        <section className="api-mega-hero">
          <div className="api-mega-kicker"><span /> CATALOGO COLLEGATO</div>
          <div className="api-mega-hero-row">
            <div>
              <h1>API Mega List</h1>
              <p className="api-mega-lead">
                Un catalogo navigabile collegato alla repository originale, con tutte le raccolte di servizi e API organizzate per categoria.
              </p>
            </div>
            <a className="api-mega-source-button" href={SOURCE} target="_blank" rel="noreferrer">
              Apri repository <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
          <div className="api-mega-stats" aria-label="Statistiche del catalogo">
            <div><strong>{CATEGORIES.length}</strong><span>raccolte collegate</span></div>
            <div><strong>{formatCount(listedCount)}</strong><span>voci indicate dai nomi delle raccolte</span></div>
            <div><strong>23</strong><span>categorie navigabili</span></div>
          </div>
        </section>

        <section className="api-mega-current" aria-labelledby="api-mega-current-heading">
          <div className="api-mega-section-heading">
            <div><span className="api-mega-kicker">NEL TUO PROGETTO</span><h2 id="api-mega-current-heading">Collegamenti già presenti</h2></div>
          </div>
          <div className="api-mega-current-grid">
            <article>
              <span className="api-mega-status is-connected">Nel codice</span>
              <h3>Open-Meteo</h3>
              <p>Alimenta le previsioni e i profili orari/aerologici della Meteo dei Conigli.</p>
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Documentazione <ArrowUpRight size={14} /></a>
            </article>
            <article>
              <span className="api-mega-status is-optional">Configurazione richiesta</span>
              <h3>OpenRouter · briefing AI</h3>
              <p>Il briefing intelligente usa il provider configurato lato server; serve la variabile <code>OPENROUTER_API_KEY</code>.</p>
              <a href="https://openrouter.ai/" target="_blank" rel="noreferrer">Provider e modelli <ArrowUpRight size={14} /></a>
            </article>
          </div>
          <p className="api-mega-note">
            I collegamenti qui sopra sono distinti dalle voci del catalogo esterno: non viene chiamato nessun nuovo servizio a pagamento in automatico.
          </p>
        </section>

        <section className="api-mega-directory" aria-labelledby="api-mega-directory-heading">
          <div className="api-mega-section-heading api-mega-directory-heading">
            <div><span className="api-mega-kicker">REPOSITORY ESTERNA</span><h2 id="api-mega-directory-heading">Esplora tutte le raccolte</h2><p>Apri una categoria per consultare le voci aggiornate direttamente su GitHub.</p></div>
            <label className="api-mega-search">
              <Search size={18} aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca una categoria…" aria-label="Cerca una categoria" />
            </label>
          </div>

          <div className="api-mega-categories">
            {filtered.map((category) => {
              const Icon = category.icon;
              return (
                <article className="api-mega-category" key={category.id}>
                  <div className="api-mega-category-icon"><Icon size={19} aria-hidden="true" /></div>
                  <div className="api-mega-category-copy">
                    <h3>{category.label}</h3>
                    <p>{category.description}</p>
                    <span>{formatCount(category.count)} voci indicate dalla raccolta</span>
                  </div>
                  <a href={category.url} target="_blank" rel="noreferrer" aria-label={`Apri raccolta ${category.label} su GitHub`} title="Apri su GitHub">
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </a>
                </article>
              );
            })}
          </div>
          {filtered.length === 0 && <p className="api-mega-empty">Nessuna categoria corrisponde alla ricerca.</p>}
        </section>

        <section className="api-mega-featured" aria-labelledby="api-mega-featured-heading">
          <div className="api-mega-featured-mark"><Boxes size={20} aria-hidden="true" /></div>
          <div className="api-mega-featured-copy">
            <span className="api-mega-kicker">RACCOLTA IN EVIDENZA NELLA FONTE</span>
            <h2 id="api-mega-featured-heading">ApyHub Utility APIs</h2>
            <p>La repository evidenzia una raccolta separata di 200 API per AI, file, estrazione dati, validazione e utilità applicative.</p>
          </div>
          <a href="https://github.com/cporter202/API-mega-list/tree/main/00-featured-apis/apyhub-utility-apis" target="_blank" rel="noreferrer">
            Apri raccolta <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </section>

        <section className="api-mega-candidates" aria-labelledby="api-mega-candidates-heading">
          <div className="api-mega-section-heading">
            <div><span className="api-mega-kicker">POSSIBILI ESTENSIONI</span><h2 id="api-mega-candidates-heading">Servizi da valutare per il meteo</h2><p>Non sono attivati: prima vanno verificati costi, chiavi, copertura e qualità dei dati.</p></div>
          </div>
          <div className="api-mega-candidate-grid">
            {SERVICE_CANDIDATES.map((candidate) => (
              <article key={candidate.name}>
                <span className="api-mega-status is-optional">{candidate.tag}</span>
                <h3>{candidate.name}</h3>
                <p>{candidate.description}</p>
                <a href={candidate.url} target="_blank" rel="noreferrer">Dettagli del servizio <ArrowUpRight size={14} /></a>
              </article>
            ))}
          </div>
        </section>

        <section className="api-mega-notice">
          <Database size={20} aria-hidden="true" />
          <div><strong>Importante: catalogo non significa integrazione attiva</strong><p>API Mega List è una directory di link e schede; non un'unica libreria installabile. Ogni servizio ha modalità di accesso, termini, disponibilità e prezzi propri. Questa pagina collega tutte le 23 raccolte senza copiare il materiale massivo della repository né esporre chiavi nel browser.</p></div>
        </section>
        <div className="api-mega-footer-source"><a href={SOURCE} target="_blank" rel="noreferrer">Fonte: cporter202/API-mega-list su GitHub <ArrowUpRight size={14} /></a></div>
      </main>
      <Footer />
    </div>
  );
}
