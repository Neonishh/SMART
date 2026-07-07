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

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Native Intelligence",
    description:
      "Go beyond keywords with semantic search that understands context and intent.",
  },
  {
    icon: Share2,
    title: "Connected Knowledge",
    description:
      "Explore publications, patents, grants, theses, researchers, and institutions as one interconnected ecosystem.",
    offset: true,
  },
  {
    icon: TrendingUp,
    title: "Research Analytics",
    description:
      "Visualize trends, collaborations, impact, and emerging technologies through interactive analytics.",
  },
  {
    icon: MapPin,
    title: "Built for Bengaluru. Ready for India.",
    description:
      "Starting with Bengaluru today. Scaling to empower research intelligence across India tomorrow.",
    offset: true,
  },
  {
    icon: Lightbulb,
    title: "Actionable Insights",
    description:
      "Transform research data into evidence that supports innovation, collaboration, and strategic decision-making.",
  },
];

export default function About() {
  return (
    <PublicLayout>
      {/* Why SMART */}
      <section className="relative overflow-hidden">
        <Watermark className="-right-24 -top-10 hidden lg:block" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 pt-16 pb-14">
          <SectionLabel>Why SMART?</SectionLabel>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[var(--color-ink)] leading-tight">
            Where Research <span className="italic font-bold">Becomes Intelligence</span>
          </h1>
          <p className="mt-6 text-[var(--color-muted)] leading-relaxed max-w-2xl">
            Scientific knowledge is growing faster than ever — but true
            understanding comes from connecting the dots. SMART unifies
            publications, patents, grants, theses, researchers, and
            institutions into an AI-powered intelligence platform that reveals
            insights, accelerates discovery, and drives informed decisions.
          </p>
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

      {/* What's different */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-paper-dim)]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="font-serif text-3xl sm:text-4xl text-center text-[var(--color-ink)] mb-16">
            What&apos;s different about <span className="font-bold">SMART</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-5 items-start">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`group rounded-sm p-7 bg-[var(--color-navy)] border border-[var(--color-line-dark)] text-white transition-colors hover:bg-[var(--color-navy-2)] ${
                    f.offset ? "md:mt-10" : ""
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center mb-5">
                    <Icon size={16} className="text-[var(--color-ochre)]" />
                  </div>
                  <h3 className="font-serif text-xl leading-snug">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-inv)]">
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-16 text-center font-mono text-xs uppercase tracking-widest text-[var(--color-ochre)]">
            An AI-Powered Research Intelligence Platform
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}