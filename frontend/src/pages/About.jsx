import PublicLayout from "../components/PublicLayout";
import Watermark from "../components/Watermark";
import { SectionLabel } from "../components/ui";
import {
  Sparkles,
  Share2,
  TrendingUp,
  MapPin,
  Lightbulb,
  Database,
  Network,
  Building2,
} from "lucide-react";

const SMART_POINTS = [
  {
    icon: Database,
    title: "Four sources, one schema",
    description:
      "Publications, patents, grants, and theses are normalized into a single unified structure — no more comparing apples to spreadsheets.",
  },
  {
    icon: Network,
    title: "A living knowledge graph",
    description:
      "Entities are extracted and linked automatically, so researchers, institutions, and funding agencies show up as connected nodes, not isolated rows.",
  },
  {
    icon: Building2,
    title: "Starting in Bengaluru",
    description:
      "The pilot covers Bengaluru's leading engineering colleges — a proving ground built to scale to a national S&T knowledge graph.",
  },
];

// Ordered so the grid auto-flow produces the bento layout:
// [ai]        [connected]
// [analytics] [insights]
// [analytics] [bengaluru]   <- analytics spans 2 rows
const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Native Intelligence",
    description:
      "Go beyond keywords with semantic search that understands context and intent.",
    tag: "AI-Native",
  },
  {
    icon: Share2,
    title: "Connected Knowledge",
    description:
      "Explore publications, patents, grants, theses, researchers, and institutions as one interconnected ecosystem.",
  },
  {
    icon: TrendingUp,
    title: "Research Analytics",
    description:
      "Visualize trends, collaborations, impact, and emerging technologies through interactive analytics.",
    variant: "analytics",
  },
  {
    icon: Lightbulb,
    title: "Actionable Insights",
    description:
      "Transform research data into evidence that supports innovation, collaboration, and strategic decision-making.",
  },
  {
    icon: MapPin,
    title: "Built for Bengaluru. Ready for India.",
    description:
      "Starting with Bengaluru today. Scaling to empower research intelligence across India tomorrow.",
    tag: "Local Focus",
  },
];

// A fanned stack of research documents resolving into a spark —
// echoing "Where Research Becomes Intelligence."
function ResearchMotif() {
  return (
    <svg
      viewBox="-120 10 500 400"
      className="w-full max-w-sm mx-auto"
      aria-hidden="true"
    >
      <circle
        cx="200"
        cy="210"
        r="170"
        fill="none"
        stroke="var(--color-line)"
        strokeWidth="1"
      />

      {/* Dashed path from the document stack toward the spark */}
      <path
        d="M195 220 C 220 190, 235 165, 258 135"
        fill="none"
        stroke="var(--color-line)"
        strokeWidth="1"
        strokeDasharray="4 5"
      />

      {/* Fanned stack of documents */}
      <g transform="rotate(-10 170 250)">
        <rect
          x="110"
          y="180"
          width="120"
          height="150"
          rx="8"
          fill="white"
          stroke="var(--color-line)"
          strokeWidth="1.5"
        />
      </g>
      <g transform="rotate(4 170 250)">
        <rect
          x="110"
          y="180"
          width="120"
          height="150"
          rx="8"
          fill="white"
          stroke="var(--color-line)"
          strokeWidth="1.5"
        />
      </g>
      <g transform="rotate(15 170 250)">
        <rect
          x="110"
          y="180"
          width="120"
          height="150"
          rx="8"
          fill="var(--color-paper-dim)"
          stroke="var(--color-line)"
          strokeWidth="1.5"
        />
        {/* text lines on the front card */}
        <line x1="128" y1="205" x2="212" y2="205" stroke="var(--color-muted)" strokeWidth="2" />
        <line x1="128" y1="222" x2="212" y2="222" stroke="var(--color-muted)" strokeWidth="2" />
        <line x1="128" y1="239" x2="185" y2="239" stroke="var(--color-muted)" strokeWidth="2" />
      </g>

      {/* Spark / insight burst */}
      <path
        d="M258 100 L266 124 L290 132 L266 140 L258 164 L250 140 L226 132 L250 124 Z"
        fill="var(--color-ochre)"
      />

      {/* Small satellite dot, echoing the accent dots elsewhere on the site */}
      <circle cx="315" cy="200" r="5" fill="var(--color-muted)" />
    </svg>
  );
}

export default function About() {
  return (
    <PublicLayout>
      {/* Why SMART — hero, matching the Knowledge Graph page layout */}
      <section className="relative overflow-hidden">
        <Watermark className="-right-16 -top-6 hidden lg:block" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-14">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <SectionLabel>Why SMART?</SectionLabel>
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[var(--color-ink)] leading-tight">
                Where Research{" "}
                <span className="italic font-bold">Becomes Intelligence</span>
              </h1>
              <p className="mt-6 text-[var(--color-muted)] leading-relaxed max-w-lg">
                Scientific knowledge is growing faster than ever — but true
                understanding comes from connecting the dots. SMART unifies
                publications, patents, grants, theses, researchers, and
                institutions into an AI-powered intelligence platform that
                reveals insights, accelerates discovery, and drives informed
                decisions.
              </p>
            </div>

            <div className="relative hidden lg:flex items-center justify-center h-[420px]">
              <ResearchMotif />
            </div>
          </div>
        </div>
      </section>

      {/* About SMART */}
      <section className="border-t border-[var(--color-line)] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <SectionLabel>About SMART</SectionLabel>
          <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[var(--color-ink)] max-w-2xl">
            An intelligence layer for{" "}
            <span className="font-bold italic">India's research ecosystem.</span>
          </h2>
          <p className="mt-6 text-[var(--color-muted)] leading-relaxed max-w-2xl">
            SMART is built to take research data that normally lives in
            disconnected portals, PDFs, and spreadsheets, and turn it into a
            single, queryable knowledge graph — so a question like{" "}
            <em>"what is our research strength in battery materials?"</em>{" "}
            has a clear, evidence-backed answer.
          </p>

          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {SMART_POINTS.map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-sm border border-[var(--color-line)] p-6 bg-[var(--color-paper-dim)]"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-ochre-soft)] flex items-center justify-center">
                      <Icon size={15} className="text-[var(--color-ochre)]" />
                    </div>
                    <span className="font-mono text-xs text-[var(--color-muted)]">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="font-serif text-lg text-[var(--color-ink)]">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                    {p.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What's different — bento layout */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-paper-dim)]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 items-start">
            {/* Left: intro column */}
            <div className="lg:sticky lg:top-28">
              <SectionLabel>Platform Capabilities</SectionLabel>
              <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[var(--color-ink)]">
                What sets <span className="font-bold italic">SMART</span> apart.
              </h2>
              <p className="mt-6 text-[var(--color-muted)] leading-relaxed max-w-sm">
                An AI-powered research intelligence platform that turns raw
                publications, patents, grants, and theses into a connected,
                queryable knowledge base — built for real institutional
                decisions, not just search.
              </p>
            </div>

            {/* Right: bento card grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                const isAnalytics = f.variant === "analytics";

                return (
                  <div
                    key={f.title}
                    className={`group relative overflow-hidden rounded-sm bg-[var(--color-navy)] border border-[var(--color-line-dark)] text-white transition-colors hover:bg-[var(--color-navy-2)] ${
                      isAnalytics ? "sm:row-span-2 flex flex-col" : "p-7"
                    }`}
                  >
                    {f.tag && (
                      <span className="absolute top-4 right-4 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ochre)] border border-white/15 rounded-full px-2 py-1">
                        {f.tag}
                      </span>
                    )}

                    {isAnalytics ? (
                      <>
                        {/* Decorative textured header */}
                        <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-[var(--color-navy-2)]">
                          <div
                            className="absolute inset-0 opacity-40"
                            style={{
                              backgroundImage:
                                "radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)",
                              backgroundSize: "14px 14px",
                            }}
                          />
                          <Icon
                            size={110}
                            strokeWidth={1}
                            className="absolute -right-4 -bottom-6 text-white/10"
                          />
                          <span className="absolute top-4 left-4 font-mono text-[10px] uppercase tracking-widest text-white/50">
                            Analytics Engine
                          </span>
                        </div>

                        <div className="p-7 flex-1 flex flex-col">
                          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center mb-5">
                            <Icon size={16} className="text-[var(--color-ochre)]" />
                          </div>
                          <h3 className="font-serif text-xl leading-snug">{f.title}</h3>
                          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-inv)]">
                            {f.description}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center mb-5">
                          <Icon size={16} className="text-[var(--color-ochre)]" />
                        </div>
                        <h3 className="font-serif text-xl leading-snug pr-16">{f.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-inv)]">
                          {f.description}
                        </p>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}