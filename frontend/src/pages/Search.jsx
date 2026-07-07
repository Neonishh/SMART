import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, ArrowRight } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, Badge, SectionLabel, EmptyState } from "../components/ui";
import { semanticSearch } from "../services/api";

const FLOW_STEPS = ["Institution", "Publication", "Authors", "Related Patents", "Related Grants", "Trend"];

export default function Search() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function runSearch(q) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await semanticSearch(q);
    setResults(res.data.results);
    setLoading(false);
  }

  useEffect(() => {
    if (params.get("q")) runSearch(params.get("q"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardLayout title="Search" description="Semantic search across publications, patents, grants, and theses">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(query);
        }}
        className="flex items-center gap-3 bg-[var(--color-navy)] text-white rounded-sm px-5 py-3.5 max-w-2xl mb-8"
      >
        <SearchIcon size={18} className="text-[var(--color-muted-inv)] shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Graph Neural Networks"
          className="bg-transparent outline-none flex-1 text-sm placeholder:text-[var(--color-muted-inv)]"
        />
        <button type="submit" className="text-sm font-medium bg-white text-[var(--color-navy)] px-4 py-1.5 rounded-sm">
          Search
        </button>
      </form>

      {!searched && (
        <EmptyState
          title="Search the SMART knowledge graph"
          description="Try a topic like “Graph Neural Networks” to see matching papers, institutions, authors, and related patents & grants."
        />
      )}

      {searched && (
        <>
          <Card className="mb-6 overflow-x-auto">
            <SectionLabel>Connection path for this query</SectionLabel>
            <div className="flex items-center gap-2 min-w-max py-2">
              {FLOW_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="px-3 py-2 rounded-sm bg-[var(--color-paper-dim)] text-xs font-medium text-[var(--color-ink)] whitespace-nowrap">
                    {step}
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <ArrowRight size={14} className="text-[var(--color-muted)] shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-3">
            {loading && (
              <p className="text-sm text-[var(--color-muted)] font-mono">Searching the knowledge graph…</p>
            )}
            {!loading &&
              results.map((r) => (
                <Card key={r.id} className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge tone="accent">{r.type}</Badge>
                      <span className="text-xs text-[var(--color-muted)]">{r.year}</span>
                    </div>
                    <h3 className="font-serif text-base font-medium text-[var(--color-ink)] max-w-xl">
                      {r.title}
                    </h3>
                    <p className="text-sm text-[var(--color-muted)] mt-1">
                      {r.authors} · {r.institution}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-xl font-semibold text-[var(--color-ink)]">{r.citations}</p>
                    <p className="text-xs text-[var(--color-muted)]">citations</p>
                  </div>
                </Card>
              ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
