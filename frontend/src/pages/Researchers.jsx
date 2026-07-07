import { useEffect, useState } from "react";
import { User } from "lucide-react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, SectionLabel, Badge } from "../components/ui";
import { listResearchers } from "../services/api";

export default function Researchers() {
  const [list, setList] = useState([]);

  useEffect(() => {
    listResearchers().then((res) => setList(res.data));
  }, []);

  return (
    <DashboardLayout title="Researchers" description="Map of expertise across the research ecosystem">
      <div className="grid sm:grid-cols-2 gap-4">
        {list.map((r) => (
          <Card key={r.id}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-paper-dim)] flex items-center justify-center shrink-0">
                <User size={18} className="text-[var(--color-muted)]" />
              </div>
              <div>
                <h3 className="font-serif text-base font-medium text-[var(--color-ink)]">{r.name}</h3>
                <p className="text-sm text-[var(--color-muted)]">{r.institution}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Badge tone="accent">{r.domain}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <div>
                <SectionLabel>h-index</SectionLabel>
                <p className="font-serif text-xl font-semibold text-[var(--color-ink)]">{r.hIndex}</p>
              </div>
              <div>
                <SectionLabel>Papers</SectionLabel>
                <p className="font-serif text-xl font-semibold text-[var(--color-ink)]">{r.publications}</p>
              </div>
              <div>
                <SectionLabel>Patents</SectionLabel>
                <p className="font-serif text-xl font-semibold text-[var(--color-ink)]">{r.patents}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
