import { useEffect, useState } from "react";

import { Card, Badge, SectionLabel, EmptyState } from "../ui.jsx";

import { listManualEntries } from "../../services/api";

/*
=========================================================
CONTRIBUTED ENTRIES SECTION
=========================================================
Drop this into any record-type page (Grants, Patents,
Publications, Theses) to show manually submitted records
of that type. These are fetched from the separate
manual-entries store — never mixed into the live
Neo4j-backed dataset above — and are visually distinct so
it's obvious they haven't gone through the NLP pipeline
or the knowledge graph yet.

Usage:
  <ContributedEntriesSection type="Grant" titleField="Project_Title" />
=========================================================
*/

export default function ContributedEntriesSection({ type, titleField }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const response = await listManualEntries(type);
        if (!cancelled) {
          setEntries(response.data?.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Couldn't load contributed entries.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [type]);

  if (loading || (!error && entries.length === 0)) {
    // Stay quiet when there's nothing contributed yet — no need to
    // clutter the page with an empty section on every visit.
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <SectionLabel>Recently Contributed</SectionLabel>
          <p className="text-sm text-gray-500 -mt-2">
            Submitted directly by contributors. Not yet part of analytics,
            search, or the knowledge graph.
          </p>
        </div>
        <Badge tone="accent">Pending NLP processing</Badge>
      </div>

      {error ? (
        <Card className="border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="border-dashed">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-medium text-[var(--color-ink)]">
                    {entry[titleField] || "Untitled"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {entry.Institution && <>{entry.Institution} · </>}
                    Submitted {new Date(entry.submitted_at).toLocaleDateString()}
                    {entry.submitted_by && <> by {entry.submitted_by}</>}
                  </p>
                </div>
                <Badge tone="neutral">Unprocessed</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
