import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search, ExternalLink, ChevronLeft, ChevronRight, X, ArrowUpDown, Download, Quote } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, Badge, SectionLabel, EmptyState } from "../components/ui";
import { listPublications } from "../services/api";

const NAVY = "#16143f";
const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "alpha", label: "Alphabetical" },
  { value: "citations", label: "Most cited" },
];

// Escapes a value for safe inclusion in a CSV cell.
function csvCell(value) {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
}

export default function Publications() {
  const navigate = useNavigate();

  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [institution, setInstitution] = useState("All institutions");
  const [domain, setDomain] = useState("All domains");
  const [year, setYear] = useState("All years");
  const [venue, setVenue] = useState("");
  const [author, setAuthor] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    listPublications()
      .then((res) => {
        setPublications(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching publications:", err);
        setError("Couldn't load publications right now.");
        setLoading(false);
      });
  }, []);

  const institutions = useMemo(
    () => ["All institutions", ...new Set(publications.flatMap((p) => p.institutions || []))],
    [publications]
  );

  const domains = useMemo(
    () => ["All domains", ...new Set(publications.flatMap((p) => p.domains || []))],
    [publications]
  );

  const years = useMemo(
    () =>
      ["All years", ...new Set(publications.map((p) => p.year).filter(Boolean))].sort((a, b) =>
        a === "All years" ? -1 : b === "All years" ? 1 : b - a
      ),
    [publications]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const venueQ = venue.trim().toLowerCase();
    const authorQ = author.trim().toLowerCase();

    return publications.filter((p) => {
      const matchesQuery =
        q === "" ||
        p.title?.toLowerCase().includes(q) ||
        p.authors?.some((a) => a.name?.toLowerCase().includes(q));
      const matchesInstitution = institution === "All institutions" || p.institutions?.includes(institution);
      const matchesDomain = domain === "All domains" || p.domains?.includes(domain);
      const matchesYear = year === "All years" || p.year === year;
      const matchesVenue = venueQ === "" || p.venue?.toLowerCase().includes(venueQ);
      const matchesAuthor =
        authorQ === "" || p.authors?.some((a) => a.name?.toLowerCase().includes(authorQ));
      return matchesQuery && matchesInstitution && matchesDomain && matchesYear && matchesVenue && matchesAuthor;
    });
  }, [publications, query, institution, domain, year, venue, author]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "oldest":
        return arr.sort((a, b) => (a.year || 0) - (b.year || 0));
      case "alpha":
        return arr.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      case "citations":
        return arr.sort((a, b) => (b.citations || 0) - (a.citations || 0));
      case "newest":
      default:
        return arr.sort((a, b) => (b.year || 0) - (a.year || 0));
    }
  }, [filtered, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [query, institution, domain, year, venue, author, sortBy]);

  const totalPages = Math.max(Math.ceil(sorted.length / PAGE_SIZE), 1);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalCitations = useMemo(
    () => publications.reduce((sum, p) => sum + (p.citations || 0), 0),
    [publications]
  );

  const domainCount = domains.length - 1;
  const institutionCount = institutions.length - 1;

  // ---- Publications-per-year + citation distribution ----
  const yearlyTrend = useMemo(() => {
    const counts = new Map();
    publications.forEach((p) => {
      if (p.year) counts.set(p.year, (counts.get(p.year) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count }));
  }, [publications]);

  const citationBuckets = useMemo(() => {
    const buckets = { "0": 0, "1–10": 0, "11–50": 0, "50+": 0 };
    publications.forEach((p) => {
      const c = p.citations || 0;
      if (c === 0) buckets["0"]++;
      else if (c <= 10) buckets["1–10"]++;
      else if (c <= 50) buckets["11–50"]++;
      else buckets["50+"]++;
    });
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  }, [publications]);

  const clearFilters = () => {
    setQuery("");
    setInstitution("All institutions");
    setDomain("All domains");
    setYear("All years");
    setVenue("");
    setAuthor("");
  };

  const hasActiveFilters =
    query !== "" ||
    institution !== "All institutions" ||
    domain !== "All domains" ||
    year !== "All years" ||
    venue !== "" ||
    author !== "";

  const exportCsv = () => {
    const header = ["Title", "Authors", "Institution", "Domain", "Journal", "Year", "Citations", "DOI"];
    const rows = sorted.map((p) => [
      p.title,
      p.authors?.map((a) => a.name).join("; "),
      p.institutions?.join("; "),
      p.domains?.join("; "),
      p.venue,
      p.year,
      p.citations,
      p.doi,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "publications.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout
      title="Publications"
      description="Research publications indexed across affiliated institutions"
    >
      {/* Stats */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Publications", value: publications.length.toLocaleString() },
            { label: "Institutions", value: institutionCount },
            { label: "Domains", value: domainCount },
            { label: "Total Citations", value: totalCitations.toLocaleString() },
          ].map((s) => (
            <Card key={s.label}>
              <p className="text-xs uppercase tracking-widest text-[var(--color-ochre)] font-mono">{s.label}</p>
              <p className="font-serif text-3xl font-semibold text-[var(--color-ink)] mt-2">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          type="text"
          placeholder="Search by title or author..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] placeholder:text-[var(--color-muted)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]"
        />
      </div>

      {/* Filters */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)]">Institution</label>
            <select value={institution} onChange={(e) => setInstitution(e.target.value)}
              className="px-2.5 py-1.5 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] min-w-[9rem]">
              {institutions.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)]">Domain</label>
            <select value={domain} onChange={(e) => setDomain(e.target.value)}
              className="px-2.5 py-1.5 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] min-w-[9rem]">
              {domains.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)]">Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value === "All years" ? "All years" : Number(e.target.value))}
              className="px-2.5 py-1.5 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] min-w-[6rem]">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)]">Journal</label>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Any journal"
              className="px-2.5 py-1.5 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] w-36" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)]">Author</label>
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Any author"
              className="px-2.5 py-1.5 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] w-36" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)] flex items-center gap-1">
              <ArrowUpDown size={10} /> Sort
            </label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] min-w-[9rem]">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-[var(--color-ochre)] hover:underline ml-1 mb-1.5">
              <X size={12} /> Clear filters
            </button>
          )}

        </div>

        <p className="text-xs text-[var(--color-muted)] font-mono mt-3">
          {sorted.length.toLocaleString()} {sorted.length === 1 ? "result" : "results"} · No per-publication keyword tags in this dataset — Domain shown in place of keywords.
        </p>
      </Card>

      {/* Results */}
      {loading ? (
        <p className="text-sm text-[var(--color-muted)] font-mono">Loading publications…</p>
      ) : error ? (
        <EmptyState title="Something went wrong" description={error} />
      ) : sorted.length === 0 ? (
        <EmptyState title="No publications found" description="Try adjusting your search term or filters." />
      ) : (
        <>
          <Card className="p-0 overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-[var(--color-paper-dim)]">
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Title</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Authors</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Institution</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Journal</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Year</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Citations</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Domain</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/dashboard/publications/${p.id}`)}
                      className="border-b border-[var(--color-line)] last:border-0 cursor-pointer hover:bg-[var(--color-paper-dim)] transition-colors"
                    >
                      <td className="px-4 py-3 max-w-xs">
                        <span className="font-serif text-[var(--color-ink)] font-medium line-clamp-2">{p.title}</span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-ink)] whitespace-nowrap">
                        {p.authors?.map((a) => a.name).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted)] whitespace-nowrap">{p.institutions?.join(", ") || "—"}</td>
                      <td className="px-4 py-3 text-[var(--color-muted)] whitespace-nowrap">{p.venue || "—"}</td>
                      <td className="px-4 py-3 text-[var(--color-muted)] font-mono whitespace-nowrap">{p.year || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-[var(--color-ink)] font-mono">
                          <Quote size={11} className="text-[var(--color-muted)]" /> {p.citations ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {p.domains?.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.domains.map((d) => <Badge key={d} tone="accent">{d}</Badge>)}
                          </div>
                        ) : (
                          <span className="text-[var(--color-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between mb-8">
            <span className="text-xs font-mono text-[var(--color-muted)]">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-paper-dim)]">
                <ChevronLeft size={13} /> Previous
              </button>
              <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-paper-dim)]">
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Insights */}
          {!hasActiveFilters && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <SectionLabel>Publications per year</SectionLabel>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={yearlyTrend} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2dfd6" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#6f6c7f" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6f6c7f" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
                    <Bar dataKey="count" fill={NAVY} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionLabel>Citation distribution</SectionLabel>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={citationBuckets} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2dfd6" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#6f6c7f" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#6f6c7f" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
                    <Bar dataKey="count" fill="#a9762f" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}