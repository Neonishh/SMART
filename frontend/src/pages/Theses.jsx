import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Search, Calendar, User2, ExternalLink, ChevronLeft, ChevronRight, X, ArrowUpDown, GraduationCap, Building2 } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, Badge, SectionLabel, EmptyState } from "../components/ui";
import { listTheses } from "../services/api";

const NAVY = "#16143f";
const OCHRE = "#a9762f";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "alpha", label: "Alphabetical" },
  { value: "institution", label: "Institution-wise" },
];

export default function Theses() {
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [query, setQuery] = useState("");
  const [institution, setInstitution] = useState("All institutions");
  const [year, setYear] = useState("All years");
  const [department, setDepartment] = useState("All departments");
  const [supervisor, setSupervisor] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    listTheses()
      .then((res) => {
        setTheses(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching theses:", err);
        setError("Couldn't load theses right now.");
        setLoading(false);
      });
  }, []);

  const institutions = useMemo(
    () => ["All institutions", ...new Set(theses.map((t) => t.institution).filter(Boolean))],
    [theses]
  );

  const departments = useMemo(
    () => ["All departments", ...new Set(theses.map((t) => t.department).filter(Boolean))],
    [theses]
  );

  const years = useMemo(
    () =>
      ["All years", ...new Set(theses.map((t) => t.year).filter(Boolean))].sort((a, b) =>
        a === "All years" ? -1 : b === "All years" ? 1 : b - a
      ),
    [theses]
  );

  const supervisorNames = useMemo(() => {
    const set = new Set();
    theses.forEach((t) => (t.supervisors || []).forEach((s) => set.add(s)));
    return [...set].sort();
  }, [theses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const supQ = supervisor.trim().toLowerCase();

    return theses.filter((t) => {
      const matchesQuery =
        q === "" ||
        t.title?.toLowerCase().includes(q) ||
        t.authors?.some((a) => a.toLowerCase().includes(q)) ||
        t.supervisors?.some((s) => s.toLowerCase().includes(q)) ||
        t.keywords?.some((k) => k.toLowerCase().includes(q));

      const matchesInstitution = institution === "All institutions" || t.institution === institution;
      const matchesYear = year === "All years" || t.year === year;
      const matchesDept = department === "All departments" || t.department === department;
      const matchesSupervisor =
        supQ === "" || t.supervisors?.some((s) => s.toLowerCase().includes(supQ));

      return matchesQuery && matchesInstitution && matchesYear && matchesDept && matchesSupervisor;
    });
  }, [theses, query, institution, year, department, supervisor]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "oldest":
        return arr.sort((a, b) => (a.year || 0) - (b.year || 0));
      case "alpha":
        return arr.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      case "institution":
        return arr.sort((a, b) => (a.institution || "").localeCompare(b.institution || ""));
      case "newest":
      default:
        return arr.sort((a, b) => (b.year || 0) - (a.year || 0));
    }
  }, [filtered, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [query, institution, year, department, supervisor, sortBy]);

  const totalPages = Math.max(Math.ceil(sorted.length / PAGE_SIZE), 1);
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const researchAreaCount = useMemo(() => {
    const set = new Set();
    theses.forEach((t) => (t.keywords || []).forEach((k) => set.add(k)));
    return set.size;
  }, [theses]);

  const institutionCountAll = useMemo(
    () => new Set(theses.map((t) => t.institution).filter(Boolean)).size,
    [theses]
  );

  // ---- Insights: year trend + top supervisors, as real charts ----
  const yearlyTrend = useMemo(() => {
    const counts = new Map();
    theses.forEach((t) => {
      if (t.year) counts.set(t.year, (counts.get(t.year) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year, count }));
  }, [theses]);

  const topSupervisors = useMemo(() => {
    const counts = new Map();
    theses.forEach((t) => (t.supervisors || []).forEach((s) => counts.set(s, (counts.get(s) || 0) + 1)));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [theses]);

  const clearFilters = () => {
    setQuery("");
    setInstitution("All institutions");
    setYear("All years");
    setDepartment("All departments");
    setSupervisor("");
  };

  const hasActiveFilters =
    query !== "" ||
    institution !== "All institutions" ||
    year !== "All years" ||
    department !== "All departments" ||
    supervisor !== "";

  return (
    <DashboardLayout
      title="Theses"
      description="Doctoral and master's theses indexed across affiliated institutions"
    >
      {/* Stats — matching the Patents page's stat-card row */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Theses", value: theses.length.toLocaleString() },
            { label: "Institutions", value: institutionCountAll },
            { label: "Supervisors", value: supervisorNames.length.toLocaleString() },
            { label: "Research Areas", value: researchAreaCount },
          ].map((s) => (
            <Card key={s.label}>
              <p className="text-xs uppercase tracking-widest text-[var(--color-ochre)] font-mono">
                {s.label}
              </p>
              <p className="font-serif text-3xl font-semibold text-[var(--color-ink)] mt-2">
                {s.value}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          type="text"
          placeholder="Search by title, researcher, supervisor, or keyword..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] placeholder:text-[var(--color-muted)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]"
        />
      </div>

      {/* Filters */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)]">
              Institution
            </label>
            <select
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="px-2.5 py-1.5 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] min-w-[9rem]"
            >
              {institutions.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)]">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value === "All years" ? "All years" : Number(e.target.value))}
              className="px-2.5 py-1.5 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] min-w-[6rem]"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)]">
              Department / Research Area
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-2.5 py-1.5 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] min-w-[10rem]"
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)]">
              Supervisor
            </label>
            <input
              list="supervisor-options"
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              placeholder="Any supervisor"
              className="px-2.5 py-1.5 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] w-44"
            />
            <datalist id="supervisor-options">
              {supervisorNames.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)] flex items-center gap-1">
              <ArrowUpDown size={10} /> Sort
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 text-sm rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)] min-w-[9rem]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-[var(--color-ochre)] hover:underline ml-1 mb-1.5"
            >
              <X size={12} /> Clear filters
            </button>
          )}

          <span className="text-xs text-[var(--color-muted)] font-mono ml-auto mb-1.5">
            {sorted.length.toLocaleString()} {sorted.length === 1 ? "result" : "results"}
          </span>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <p className="text-sm text-[var(--color-muted)] font-mono">Loading theses…</p>
      ) : error ? (
        <EmptyState title="Something went wrong" description={error} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No theses found"
          description="Try adjusting your search term or filters."
        />
      ) : (
        <>
          <Card className="p-0 overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-[var(--color-paper-dim)]">
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Title</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Researcher</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Supervisor</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Institution</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Year</th>
                    <th className="text-left font-mono text-[10px] uppercase tracking-wide text-[var(--color-muted)] px-4 py-3">Research Area</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelected(t)}
                      className="border-b border-[var(--color-line)] last:border-0 cursor-pointer hover:bg-[var(--color-paper-dim)] transition-colors"
                    >
                      <td className="px-4 py-3 max-w-xs">
                        <span className="font-serif text-[var(--color-ink)] font-medium line-clamp-2">
                          {t.title}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-ink)] whitespace-nowrap">
                        {t.authors?.join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted)] whitespace-nowrap">
                        {t.supervisors?.join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted)] whitespace-nowrap">
                        {t.institution || "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-muted)] font-mono whitespace-nowrap">
                        {t.year || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.keywords?.[0] ? (
                          <Badge tone="accent">{t.keywords[0]}</Badge>
                        ) : t.department ? (
                          <Badge tone="accent">{t.department}</Badge>
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
            <span className="text-xs font-mono text-[var(--color-muted)]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-paper-dim)]"
              >
                <ChevronLeft size={13} /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-sm border border-[var(--color-line)] bg-white text-[var(--color-ink)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-paper-dim)]"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Compact insights footnote — intentionally minimal, not a second dashboard */}
          {!hasActiveFilters && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <SectionLabel>Theses per year</SectionLabel>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={yearlyTrend} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2dfd6" vertical={false} />
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11, fill: "#6f6c7f" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#6f6c7f" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
                    <Bar dataKey="count" fill={NAVY} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionLabel>Top supervisors</SectionLabel>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={topSupervisors}
                    layout="vertical"
                    margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                  >
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#6f6c7f" }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11, fill: NAVY }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
                    <Bar dataKey="count" fill={OCHRE} radius={[0, 3, 3, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-sm border border-[var(--color-line)] max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[var(--color-line)] px-6 py-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {selected.institution && <Badge tone="navy">{selected.institution}</Badge>}
                {selected.department && <Badge tone="accent">{selected.department}</Badge>}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-[var(--color-muted)] hover:text-[var(--color-ink)] shrink-0"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              <h2 className="font-serif text-xl font-semibold text-[var(--color-ink)] leading-snug">
                {selected.title}
              </h2>

              <div className="grid sm:grid-cols-2 gap-4 mt-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)]">Researcher</p>
                  <p className="text-[var(--color-ink)] mt-0.5 flex items-center gap-1.5">
                    <User2 size={13} /> {selected.authors?.join(", ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)]">Supervisor</p>
                  <p className="text-[var(--color-ink)] mt-0.5 flex items-center gap-1.5">
                    <GraduationCap size={13} /> {selected.supervisors?.join(", ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)]">Institution</p>
                  <p className="text-[var(--color-ink)] mt-0.5 flex items-center gap-1.5">
                    <Building2 size={13} /> {selected.institution || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)]">Submission Year</p>
                  <p className="text-[var(--color-ink)] mt-0.5 flex items-center gap-1.5">
                    <Calendar size={13} /> {selected.year || "—"}
                  </p>
                </div>
              </div>

              {selected.keywords?.length > 0 && (
                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)] mb-2">Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.keywords.map((kw) => (
                      <Badge key={kw} tone="accent">{kw}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selected.abstract && (
                <div className="mt-5">
                  <p className="text-[10px] uppercase tracking-wide font-mono text-[var(--color-muted)] mb-2">Abstract</p>
                  <p className="text-sm text-[var(--color-muted)] leading-relaxed whitespace-pre-line">
                    {selected.abstract}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 mt-6 pt-5 border-t border-[var(--color-line)]">
                {selected.sourceUrl ? (
                  <a
                    href={selected.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-sm bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-2)] transition-colors"
                  >
                    <ExternalLink size={14} /> View Source
                  </a>
                ) : (
                  <span className="text-xs text-[var(--color-muted)] italic">No source link on file.</span>
                )}
                <span className="text-xs text-[var(--color-muted)] italic">
                  Direct PDF download isn't available — theses aren't hosted, only linked to their source.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}