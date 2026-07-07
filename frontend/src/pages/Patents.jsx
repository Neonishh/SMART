import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, Badge } from "../components/ui";
import { listPatents } from "../services/api";

export default function Patents() {
  const [list, setList] = useState([]);

  useEffect(() => {
    listPatents().then((res) => setList(res.data));
  }, []);

  return (
    <DashboardLayout title="Patent Explorer" description="Filed and granted patents across the ecosystem">
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono border-b border-[var(--color-line)]">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Applicant</th>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Filed</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b border-[var(--color-line)] last:border-0">
                <td className="px-4 py-3 max-w-sm font-medium text-[var(--color-ink)]">{p.title}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{p.applicant}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{p.domain}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{p.filedYear}</td>
                <td className="px-4 py-3">
                  <Badge tone={p.status === "Granted" ? "accent" : "neutral"}>{p.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  );
}
