import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, Badge } from "../components/ui";
import { listGrants } from "../services/api";

export default function Grants() {
  const [list, setList] = useState([]);

  useEffect(() => {
    listGrants().then((res) => setList(res.data));
  }, []);

  return (
    <DashboardLayout title="Grant Explorer" description="Funding awarded across agencies and institutions">
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono border-b border-[var(--color-line)]">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Agency</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.map((g) => (
              <tr key={g.id} className="border-b border-[var(--color-line)] last:border-0">
                <td className="px-4 py-3 max-w-sm font-medium text-[var(--color-ink)]">{g.title}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{g.agency}</td>
                <td className="px-4 py-3 text-[var(--color-muted)] font-mono">{g.amount}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{g.year}</td>
                <td className="px-4 py-3">
                  <Badge tone={g.status === "Active" ? "accent" : "neutral"}>{g.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  );
}
