import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import PublicLayout from "../components/PublicLayout";
import Watermark from "../components/Watermark";

const STAKEHOLDERS = [
  "Researchers",
  "Universities",
  "Funding Agencies",
  "Government & Policymakers",
  "Industry & Innovation",
  "Research Organizations",
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
        <Watermark className="-right-24 -top-10 hidden lg:block" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-14 pb-20">
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-3 bg-[var(--color-navy)] text-white rounded-sm px-5 py-3.5 max-w-xl mb-16"
          >
            <Search size={18} className="text-[var(--color-muted-inv)] shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask : Patents in year 2024"
              className="bg-transparent outline-none flex-1 text-sm placeholder:text-[var(--color-muted-inv)]"
            />
          </form>

          <h1 className="font-serif text-5xl sm:text-6xl leading-[1.1] text-[var(--color-ink)]">
            Connect <span className="font-bold">Knowledge.</span>
            <br />
            Unlock <span className="font-bold">Innovation.</span>
          </h1>

          <p className="mt-6 max-w-lg text-[var(--color-muted)] text-base leading-relaxed">
            Turning scattered research data into connected knowledge for faster
            discoveries and informed decision-making.
          </p>

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
