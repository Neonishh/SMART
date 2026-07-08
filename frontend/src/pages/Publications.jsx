import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, Badge } from "../components/ui";
import { listPublications } from "../services/api";

export default function Publications() {
  const [list, setList] = useState([]);

  useEffect(() => {
    listPublications().then((res) => setList(res.data));
  }, []);

  return (
    <DashboardLayout title="Publications" description="Papers indexed across tracked institutions">
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono border-b border-[var(--color-line)]">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Authors</th>
              <th className="px-4 py-3">Institution</th>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3 text-right">Citations</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-[var(--color-line)] last:border-0">
                <td className="px-4 py-3 max-w-sm font-medium text-[var(--color-ink)]">{p.title}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{p.authors}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{p.institution}</td>
                <td className="px-4 py-3">
                  <Badge tone="accent">{p.domain}</Badge>
                </td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{p.year}</td>
                <td className="px-4 py-3 text-right text-[var(--color-ink)]">{p.citations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  );
}