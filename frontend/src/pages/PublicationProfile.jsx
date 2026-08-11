import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Quote, Download, FileText, Building2, Calendar } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, Badge, SectionLabel, EmptyState } from "../components/ui";
import { getPublication, getPublicationAuthors, getRelatedPublications } from "../services/api";

function buildBibTeX(pub) {
  const firstAuthorLast = pub.authors?.[0]?.name?.split(",")[0]?.replace(/\s+/g, "") || "unknown";
  const key = `${firstAuthorLast}${pub.year || ""}`;
  const authorField = pub.authors?.map((a) => a.name).join(" and ") || "";

  const lines = [
    `@article{${key},`,
    `  title = {${pub.title || ""}},`,
    authorField && `  author = {${authorField}},`,
    pub.venue && `  journal = {${pub.venue}},`,
    pub.year && `  year = {${pub.year}},`,
    pub.doi && `  doi = {${pub.doi}},`,
    pub.sourceUrl && `  url = {${pub.sourceUrl}},`,
    `}`,
  ].filter(Boolean);

  return lines.join("\n");
}

export default function PublicationProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pub, setPub] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);

    Promise.all([
      getPublication(id),
      getPublicationAuthors(id),
      getRelatedPublications(id),
    ])
      .then(([pubRes, authorsRes, relatedRes]) => {
        setPub(pubRes.data);
        setAuthors(authorsRes.data);
        setRelated(relatedRes.data);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const downloadBibTeX = () => {
    const bib = buildBibTeX(pub);
    const blob = new Blob([bib], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pub.id || "publication"}.bib`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout title="Publication" description="Loading publication details...">
        <p className="text-[var(--color-muted)]">Loading...</p>
      </DashboardLayout>
    );
  }

  if (error || !pub) {
    return (
      <DashboardLayout title="Publication" description="We couldn't find this publication.">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition">
          <ArrowLeft size={16} /> Back to Publications
        </button>
        <EmptyState title="Something went wrong" description="This publication couldn't be loaded. Please try again." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Publication" description="Full record for this publication">
      <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)] transition">
        <ArrowLeft size={16} /> Back to Publications
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {pub.domains?.map((d) => <Badge key={d} tone="accent">{d}</Badge>)}
        {pub.subdomains
          ?.filter((s) => !pub.domains?.some((d) => d.toLowerCase() === s.toLowerCase()))
          .map((s) => <Badge key={s} tone="accent">{s}</Badge>)}
      </div>

      <h1 className="font-serif text-3xl font-semibold text-[var(--color-ink)] leading-snug">{pub.title}</h1>

      <p className="text-[var(--color-muted)] mt-2">
        {authors.length > 0
          ? authors.map((a, i) => (
              <span key={a.id || i}>
                {a.id ? (
                  <Link to={`/dashboard/researchers/${a.id}`} className="hover:underline decoration-[var(--color-ochre)]">
                    {a.name}
                  </Link>
                ) : (
                  a.name
                )}
                {i < authors.length - 1 && ", "}
              </span>
            ))
          : "Authors not on record"}
      </p>

      {/* Stat strip */}
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4 py-5 border-y border-[var(--color-line)] mt-5 mb-8">
        <div>
          <span className="text-xs tracking-wide uppercase text-[var(--color-ochre)] font-mono">Journal</span>
          <p className="font-serif text-xl mt-1">{pub.venue || "—"}</p>
        </div>
        <div>
          <span className="text-xs tracking-wide uppercase text-[var(--color-ochre)] font-mono flex items-center gap-1">
            <Calendar size={11} /> Year
          </span>
          <p className="font-serif text-xl mt-1">{pub.year || "—"}</p>
        </div>
        <div>
          <span className="text-xs tracking-wide uppercase text-[var(--color-ochre)] font-mono flex items-center gap-1">
            <Quote size={11} /> Citations
          </span>
          <p className="font-serif text-xl mt-1">{pub.citations ?? 0}</p>
        </div>
        <div>
          <span className="text-xs tracking-wide uppercase text-[var(--color-ochre)] font-mono flex items-center gap-1">
            <Building2 size={11} /> Institution
          </span>
          <p className="font-serif text-xl mt-1">{pub.institutions?.join(", ") || "—"}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {pub.doi && (
          <a
            href={`https://doi.org/${pub.doi}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-sm bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-2)] transition-colors"
          >
            <ExternalLink size={14} /> View via DOI
          </a>
        )}
        {pub.sourceUrl && (
          <a
            href={pub.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-sm border border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-paper-dim)] transition-colors"
          >
            <ExternalLink size={14} /> Open Source Link
          </a>
        )}
        <button
          onClick={downloadBibTeX}
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-sm border border-[var(--color-line)] text-[var(--color-ink)] hover:bg-[var(--color-paper-dim)] transition-colors"
        >
          <FileText size={14} /> Download BibTeX
        </button>
      </div>

      {!pub.doi && !pub.sourceUrl && (
        <p className="text-xs text-[var(--color-muted)] italic -mt-5 mb-8">No DOI or source link on file for this publication.</p>
      )}

      {/* Related papers */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Related papers</SectionLabel>
        </div>
        {related.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            No related papers found (based on shared domain, subdomain, or co-authorship).
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {related.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/dashboard/publications/${r.id}`)}
                className="text-left border-b border-[var(--color-line)] last:border-0 pb-3 last:pb-0 hover:text-[var(--color-ochre)] transition-colors"
              >
                <p className="font-medium text-[var(--color-ink)]">{r.title}</p>
                <p className="text-xs text-[var(--color-muted)] mt-1 font-mono">
                  {r.year || "—"} · {r.citations ?? 0} citations
                </p>
              </button>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}