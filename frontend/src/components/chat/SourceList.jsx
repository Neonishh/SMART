import { forwardRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ExternalLink } from "lucide-react";

const TYPE_LABEL = {
  publication: "Paper",
  patent: "Patent",
  grant: "Grant",
  thesis: "Thesis",
  researcher: "Researcher",
  institution: "Institution",
};

const SHORT_INST = {
  "Indian Institute of Science Bangalore": "IISc",
  "International Institute of Information Technology Bangalore": "IIIT-B",
  "R V College of Engineering": "RVCE",
  "M S Ramaiah Institute of Technology": "MSRIT",
  "B.M.S. College of Engineering": "BMSCE",
  "Dayananda Sagar College of Engineering": "DSCE",
  "CMR Institute of Technology": "CMRIT",
};

/** Where a source should take the user inside the app (or outside). */
function sourceLink(s) {
  if (s.type === "publication" && s.id && String(s.id).startsWith("PUB_")) return { to: `/dashboard/publications/${s.id}` };
  if (s.type === "researcher" && s.id !== null && s.id !== undefined && /^\d+$/.test(String(s.id))) return { to: `/dashboard/researchers/${s.id}` };
  if (s.type === "institution") return { to: "/dashboard/institutions" };
  if (s.type === "patent") return { to: "/dashboard/patents" };
  if (s.type === "grant") return { to: "/dashboard/grants" };
  if (s.type === "thesis") return s.url ? { href: s.url } : { to: "/dashboard/theses" };
  if (s.url) return { href: s.url };
  return null;
}

function SourceRow({ s, highlighted }) {
  const link = sourceLink(s);
  const title = (
    <span className="text-[13px] leading-snug text-[var(--color-ink)] group-hover:text-[var(--color-ochre)] transition-colors">
      {s.title}
    </span>
  );

  const body = (
    <div
      className={`group flex gap-2.5 px-3 py-2 rounded-sm border transition-colors ${
        highlighted
          ? "border-[var(--color-ochre)] bg-[var(--color-ochre-soft)]"
          : "border-[var(--color-line)] bg-white hover:border-[var(--color-muted)]"
      }`}
    >
      <span className="font-mono text-[10px] mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-sm bg-[var(--color-paper-dim)] text-[var(--color-muted)]">
        {s.n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          {title}
          {link?.href && <ExternalLink size={12} className="shrink-0 mt-0.5 text-[var(--color-muted)]" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-[var(--color-muted)] font-mono">
          <span className="uppercase tracking-wide">{TYPE_LABEL[s.type] || s.type}</span>
          {s.year && <span>· {s.year}</span>}
          {s.institution && s.type !== "institution" && <span>· {SHORT_INST[s.institution] || s.institution}</span>}
          {s.origin !== "graph" && typeof s.score === "number" && (
            <span title="Semantic similarity to your question">· match {Math.round(s.score * 100)}%</span>
          )}
        </div>
        {s.snippet && s.snippet !== s.title && (
          <p className="text-[11.5px] text-[var(--color-muted)] mt-1 line-clamp-2">{s.snippet}</p>
        )}
      </div>
    </div>
  );

  if (link?.to) return <Link to={link.to}>{body}</Link>;
  if (link?.href) return <a href={link.href} target="_blank" rel="noreferrer">{body}</a>;
  return body;
}

const SourceList = forwardRef(function SourceList({ sources = [], highlight, defaultOpen = false }, ref) {
  const [open, setOpen] = useState(defaultOpen);
  if (!sources.length) return null;
  const isOpen = open || highlight != null;

  return (
    <div ref={ref} className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-mono text-[var(--color-muted)] hover:text-[var(--color-ochre)]"
      >
        <ChevronDown size={13} className={`transition-transform ${isOpen ? "" : "-rotate-90"}`} />
        Sources ({sources.length})
      </button>
      {isOpen && (
        <div className="mt-2 grid gap-1.5">
          {sources.map((s) => (
            <SourceRow key={`${s.n}-${s.type}-${s.id}`} s={s} highlighted={highlight === s.n} />
          ))}
        </div>
      )}
    </div>
  );
});

export default SourceList;
