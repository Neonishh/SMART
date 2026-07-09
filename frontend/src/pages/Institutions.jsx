import { useEffect, useState } from "react";
import { Building2, ChevronRight } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, SectionLabel, Badge } from "../components/ui";
import { listInstitutions } from "../services/api";
import { institutionMeta } from "../data/institutionMeta";

export default function Institutions() {
  const [list, setList] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    listInstitutions().then((res) => {
      setList(res.data);
      setActive(res.data[0]);
    });
  }, []);

  const meta = active ? institutionMeta[active.name] || {} : {};

  return (
    <DashboardLayout title="Institutions" description="Research performance by institution">
      <div className="grid md:grid-cols-3 gap-4">
        {/* LEFT LIST — unchanged sizes */}
        <Card className="md:col-span-1 p-0 overflow-hidden">
          <ul>
            {list.map((inst) => (
              <li key={inst.id}>
                <button
                  onClick={() => setActive(inst)}
                  className={`w-full flex items-start justify-between gap-2 px-4 py-3 text-left text-sm border-b border-[var(--color-line)] transition-colors ${
                    active?.id === inst.id ? "bg-[var(--color-paper-dim)]" : "hover:bg-[var(--color-paper-dim)]"
                  }`}
                >
                  <span className="flex items-start gap-2 text-[var(--color-ink)]">
                    <Building2 size={15} className="text-[var(--color-muted)] mt-0.5 shrink-0" />
                    {inst.name}
                  </span>
                  <ChevronRight size={14} className="text-[var(--color-muted)] mt-0.5 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {/* RIGHT PROFILE — enlarged, with NIRF/NAAC badges */}
        {active && (
          <Card className="md:col-span-2">
            <SectionLabel>Institution profile</SectionLabel>

            <div className="flex items-center gap-4 mb-4 mt-1">
              {meta.logo && (
                <img
                  src={meta.logo}
                  alt={`${active.name} logo`}
                  className="w-16 h-16 object-contain shrink-0"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <h2 className="font-serif text-3xl font-semibold text-[var(--color-ink)]">{active.name}</h2>
            </div>

            <div className="flex gap-2 flex-wrap mb-5">
              <Badge tone="accent">{active.location}</Badge>
              {meta.nirfRank && (
                <Badge tone="accent">
                  NIRF {/^\d+$/.test(meta.nirfRank) ? `#${meta.nirfRank}` : `Band ${meta.nirfRank}`}
                </Badge>
              )}
              {meta.naacGrade && <Badge tone="accent">NAAC {meta.naacGrade}</Badge>}
            </div>

            {meta.about && (
              <div className="mb-6">
                <SectionLabel>About</SectionLabel>
                <p className="text-base text-[var(--color-muted)] leading-relaxed mt-2">{meta.about}</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-[var(--color-muted)] font-mono">Publications</p>
                <p className="font-serif text-3xl font-semibold text-[var(--color-ink)]">
                  {active.publications.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted)] font-mono">Patents</p>
                <p className="font-serif text-3xl font-semibold text-[var(--color-ink)]">
                  {active.patents.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted)] font-mono">Grants</p>
                <p className="font-serif text-3xl font-semibold text-[var(--color-ink)]">
                  {active.grants.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-muted)] font-mono">Theses</p>
                <p className="font-serif text-3xl font-semibold text-[var(--color-ink)]">
                  {active.theses.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      <p className="text-xs text-[var(--color-muted)] font-mono mt-6">
        Data collected 2019–2025, with partial coverage extending into 2026.
      </p>
    </DashboardLayout>
  );
}