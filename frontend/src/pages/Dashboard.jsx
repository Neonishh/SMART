import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import DashboardLayout from "../components/DashboardLayout";
import { Card, StatCard, SectionLabel } from "../components/ui";
import { getDashboardOverview } from "../services/api";

const NAVY = "#16143f";
const OCHRE = "#a9762f";

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getDashboardOverview().then((res) => setData(res.data));
  }, []);

  return (
    <DashboardLayout
      title="Dashboard"
      description="An overview of science &amp; technology output across selected Bangalore institutions"
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(data?.stats || []).map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <SectionLabel>Publication trend</SectionLabel>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data?.publicationTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2dfd6" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6f6c7f" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6f6c7f" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
              <Line type="monotone" dataKey="publications" stroke={NAVY} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionLabel>Top domains</SectionLabel>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.topDomains || []} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis
                dataKey="domain"
                type="category"
                width={110}
                tick={{ fontSize: 11, fill: "#6f6c7f" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={{ borderRadius: 2, borderColor: "#e2dfd6", fontSize: 13 }} />
              <Bar dataKey="papers" fill={OCHRE} radius={[0, 2, 2, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <p className="text-xs text-[var(--color-muted)] font-mono mt-6">
        Live data from the SMART Knowledge Graph (Neo4j)
      </p>
    </DashboardLayout>
  );
}
