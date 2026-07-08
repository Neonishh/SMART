import { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { Card, Badge } from "../components/ui";
import { listTheses } from "../services/api";

export default function Theses() {
  const [list, setList] = useState([]);

  useEffect(() => {
    listTheses().then((res) => setList(res.data));
  }, []);

  return (
    <DashboardLayout title="Theses" description="Doctoral and master's theses indexed across tracked institutions">
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[var(--color-muted)] font-mono border-b border-[var(--color-line)]">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Institution</th>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Degree</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t) => (
              <tr key={t.id} className="border-b border-[var(--color-line)] last:border-0">
                <td className="px-4 py-3 max-w-sm font-medium text-[var(--color-ink)]">{t.title}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{t.author}</td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{t.institution}</td>
                <td className="px-4 py-3">
                  <Badge tone="accent">{t.domain}</Badge>
                </td>
                <td className="px-4 py-3 text-[var(--color-muted)]">{t.year}</td>
                <td className="px-4 py-3">
                  <Badge tone={t.degree === "PhD" ? "accent" : "neutral"}>{t.degree}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  );
}