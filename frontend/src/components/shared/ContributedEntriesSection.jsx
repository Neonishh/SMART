import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Card, Badge, SectionLabel } from "../ui.jsx";
import { listManualEntries, deleteManualEntry, getCurrentUser } from "../../services/api";

export default function ContributedEntriesSection({ type }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isAdmin = getCurrentUser()?.role === "admin";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await listManualEntries(type);
        if (!cancelled) setEntries(res.data?.data ?? []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Couldn't load contributed entries.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [type]);

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete "${entry.title}"?`)) return;
    try {
      await deleteManualEntry(entry.id, type);
      setEntries((cur) => cur.filter((e) => e.id !== entry.id));
    } catch (err) {
      window.alert(err?.response?.data?.error || "Unable to delete.");
    }
  };

  if (loading || (!error && entries.length === 0)) return null;

  return (
    <section className="space-y-3 mb-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <SectionLabel>Manually Contributed {type}s</SectionLabel>
          <p className="text-xs text-[var(--color-muted)] mt-1">
            {type}s submitted manually through the contribution form.
          </p>
        </div>
        <Badge tone="accent">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </Badge>
      </div>

      {error ? (
        <Card className="border-red-200"><p className="text-sm text-red-600">{error}</p></Card>
      ) : (
        <div className="grid gap-3">
          {entries.map((e) => (
            <Card key={e.id} className="border-l-4 border-l-[var(--color-ochre)]">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  {e.sourceUrl ? (
                    <a href={e.sourceUrl} target="_blank" rel="noreferrer"
                       className="font-serif text-lg font-semibold text-[var(--color-ink)] hover:underline">
                      {e.title}
                    </a>
                  ) : (
                    <h3 className="font-serif text-lg font-semibold text-[var(--color-ink)]">{e.title}</h3>
                  )}
                  <p className="text-sm text-[var(--color-muted)] mt-2">
                    {[e.people.join(", "), e.institution, e.year].filter(Boolean).join(" · ")}
                  </p>
                  {e.detail && <p className="text-xs text-[var(--color-muted)] mt-1">{e.detail}</p>}
                  <p className="mt-3 text-[10px] uppercase tracking-wide font-mono text-[var(--color-ochre)]">
                    Manual Contribution{e.createdBy ? ` · ${e.createdBy}` : ""}
                  </p>
                </div>
                {isAdmin && (
                  <button type="button" onClick={() => handleDelete(e)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-sm border border-red-200 text-red-700 bg-white hover:bg-red-50 shrink-0">
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}