import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Share2, TrendingUp, BookOpen } from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import Watermark from "../components/Watermark";
import { SectionLabel } from "../components/ui";

const STAKEHOLDERS = [
  "Researchers",
  "Universities",
  "Funding Agencies",
  "Government & Policymakers",
  "Industry & Innovation",
  "Research Organizations",
];

const HERO_STATS = [
  { value: "87K+", label: "NODES" },
  { value: "270K+", label: "RELATIONSHIPS" },
  { value: "15", label: "ENTITY TYPES" },
];

const PHILOSOPHY_POINTS = [
  {
    title: "Adaptive AI",
    description: "Continuous learning from every new research publication.",
  },
  {
    title: "Validated",
    description: "Cross-referenced with verified institutional archives.",
  },
];

const FEATURE_CARDS = [
  {
    icon: Share2,
    title: "Global Knowledge Graph",
    description:
      "Navigate through millions of entities, including researchers, institutions, and clinical trials in a single, intuitive interface.",
    dark: true,
  },
  {
    icon: TrendingUp,
    title: "Insights",
    description: "Predictive modeling for research trends and potential innovation gaps.",
  },
  {
    icon: BookOpen,
    title: "Publications",
    description: "Access a curated database of 50M+ open-access and institutional papers.",
  },
];

export default function Landing() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    navigate(`/dashboard/search${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-14 pb-20">
          <div className="grid lg:grid-cols-[1fr_auto] gap-10 lg:gap-16">
            <div>
              <h1 className="font-serif text-5xl sm:text-6xl leading-[1.1] text-[var(--color-ink)]">
                Connect <span className="font-bold">Knowledge.</span>
                <br />
                <span className="italic font-normal">Unlock</span>{" "}
                <span className="italic font-bold">Innovation.</span>
              </h1>

              <p className="mt-6 max-w-lg text-[var(--color-muted)] text-base leading-relaxed">
                Turning scattered research data into connected knowledge for faster
                discoveries and informed decision-making. Synthesize billions of data
                points into a single, navigable intelligence layer.
              </p>
            </div>

            <div className="flex lg:flex-col gap-6 lg:gap-7 lg:pt-1 lg:border-l lg:border-[var(--color-line)] lg:pl-10 shrink-0">
              {HERO_STATS.map((s) => (
                <div key={s.label} className="min-w-[110px]">
                  <p className="font-serif text-2xl sm:text-3xl font-bold italic text-[var(--color-ink)]">
                    {s.value}
                  </p>
                  <p className="mt-1 text-[10px] sm:text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSearch}
            className="flex items-center gap-3 bg-[var(--color-navy)] text-white rounded-sm px-12 py-3 max-w-xl mt-10"
          >
            <Search size={18} className="text-[var(--color-muted-inv)] shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask : Patents in year 2024"
              className="bg-transparent outline-none flex-1 text-sm placeholder:text-[var(--color-muted-inv)]"
            />
            
          </form>

          <div className="mt-20 grid md:grid-cols-2 gap-10 items-end">
            <p className="text-sm text-[var(--color-muted)] max-w-xs">
              Research data exists everywhere — but knowledge emerges when
              it&apos;s connected.
            </p>

            <div>
              <h2 className="font-serif text-3xl sm:text-4xl leading-[1.15] text-[var(--color-ink)]">
                Every <span className="font-bold">Discovery</span>
                <br />
                Starts with a <span className="font-bold">Connection.</span>
              </h2>
            </div>
          </div>
          <p className="mt-8 text-[var(--color-muted)] text-base leading-relaxed max-w-2xl">
            SMART brings together diverse research resources into an intelligent
            knowledge graph, helping users explore relationships, identify emerging
            trends, discover experts, and make informed research decisions.
          </p>
        </div>
      </section>

      {/* Our Philosophy */}
      <section className="border-t border-[var(--color-line)] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-2 gap-12 items-start">
          <div className="bg-[var(--color-paper-dim)] border border-[var(--color-line)] rounded-sm p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono mb-3">
              Knowledge Graph Visualization
            </p>
            <div className="aspect-[4/3] rounded-sm bg-[var(--color-paper)] border border-[var(--color-line)] overflow-hidden">
              <img
                src="/visualisation.png"
                alt="Knowledge Graph Visualization"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div>
            <SectionLabel>Our Philosophy</SectionLabel>
            <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[var(--color-ink)]">
              From <span className="font-bold">Data</span> to
              <br />
              <span className="italic font-bold">Decisions.</span>
            </h2>
            <p className="mt-6 text-[var(--color-muted)] leading-relaxed max-w-md">
              Modern research is siloed. We bridge the gap between disciplines,
              translating technical papers, patents, and datasets into a unified
              semantic web. Our engine doesn&apos;t just store data; it understands
              relationships.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-8 max-w-md">
              {PHILOSOPHY_POINTS.map((p) => (
                <div key={p.title}>
                  <h3 className="font-serif text-xl text-[var(--color-ink)]">{p.title}</h3>
                  <p className="mt-2 text-sm text-[var(--color-muted)] leading-relaxed">
                    {p.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-paper-dim)]">
        <div className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-3 gap-6">
          {FEATURE_CARDS.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`rounded-sm p-8 border ${
                  f.dark
                    ? "bg-[var(--color-navy)] border-[var(--color-navy)] text-white md:col-span-1"
                    : "bg-white border-[var(--color-line)] text-[var(--color-ink)]"
                }`}
              >
                <Icon
                  size={22}
                  className={f.dark ? "text-[var(--color-muted-inv)]" : "text-[var(--color-muted)]"}
                />
                <h3 className="font-serif text-2xl mt-6">{f.title}</h3>
                <p
                  className={`mt-3 text-sm leading-relaxed ${
                    f.dark ? "text-[var(--color-muted-inv)]" : "text-[var(--color-muted)]"
                  }`}
                >
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stakeholders */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-paper-dim)] relative">
        <div className="mx-auto max-w-6xl px-6 py-20 grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[var(--color-ink)]">
              Built for <span className="font-bold">Every</span>
              <br />
              Research Stakeholder
            </h2>
            <p className="mt-6 text-[var(--color-muted)] leading-relaxed max-w-md">
              Researchers can explore trends and collaborations. Universities can
              evaluate research performance. Funding agencies can assess impact.
              Policymakers can make evidence-based decisions. Industries can
              identify innovation opportunities — all through one intelligent
              platform.
            </p>
            <p className="mt-8 font-mono text-xs uppercase tracking-widest text-[var(--color-ochre)]">
              An AI-Powered Research Intelligence Platform
            </p>
          </div>

          <ul className="space-y-3 self-start">
            {STAKEHOLDERS.map((s) => (
              <li
                key={s}
                className="flex items-center gap-3 text-sm text-[var(--color-ink)] border-b border-[var(--color-line)] pb-3"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ochre)] shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PublicLayout>
  );
}
